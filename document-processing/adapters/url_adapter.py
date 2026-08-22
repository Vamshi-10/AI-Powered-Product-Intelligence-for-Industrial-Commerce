"""
Universal URL / Web Link Input Adapter for Industrial Commerce
Fetches product webpages, manufacturer datasheets, catalog files (PDF, CSV, XLSX, JSON, Images)
from public HTTP/HTTPS endpoints with anti-SSRF security, full 301/302/303/307/308 redirect handling,
Schema.org JSON-LD extraction, and multi-product catalog delegation.
"""

import os
import sys
import io
import re
import json
import socket
import ipaddress
import urllib.request
import urllib.parse
import urllib.error
from typing import List, Dict, Any, Optional, Union, Tuple
from html.parser import HTMLParser

_current_dir = os.path.dirname(os.path.abspath(__file__))
_pkg_dir = os.path.dirname(_current_dir)
if _pkg_dir not in sys.path:
    sys.path.insert(0, _pkg_dir)

from canonical_schema import CanonicalProductRecord, SourceMetadata, CanonicalProduct
from extractors.mpn_extractor import MPNExtractor
from extractors.brand_resolver import BrandResolver


# Anti-SSRF: Blacklisted private, loopback, and reserved IP networks
BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),      # Loopback
    ipaddress.ip_network("10.0.0.0/8"),       # Private class A
    ipaddress.ip_network("172.16.0.0/12"),    # Private class B
    ipaddress.ip_network("192.168.0.0/16"),   # Private class C
    ipaddress.ip_network("169.254.0.0/16"),   # Link-local
    ipaddress.ip_network("0.0.0.0/8"),        # Current network
    ipaddress.ip_network("::1/128"),          # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),         # IPv6 unique local
    ipaddress.ip_network("fe80::/10"),        # IPv6 link-local
]


class EnhancedHTMLProductParser(HTMLParser):
    """
    Parses HTML documents extracting JSON-LD schema.org/Product data,
    OpenGraph meta tags, specification tables, definition lists, and product description blocks.
    """

    def __init__(self):
        super().__init__()
        self.title = ""
        self.in_title = False
        self.meta_tags: Dict[str, str] = {}
        self.json_ld_blocks: List[Dict[str, Any]] = []
        self.in_json_ld = False
        self.current_json_ld_buffer = ""
        
        # Spec tables and lists
        self.spec_table_rows: List[Tuple[str, str]] = []
        self.in_table_cell = False
        self.current_cell_text = ""
        self.current_row_cells: List[str] = []
        
        # General text chunks
        self.text_chunks: List[str] = []
        self.in_ignored_tag = False
        self.ignored_tags = {"script", "style", "nav", "footer", "header", "noscript", "svg", "button", "form"}

    def handle_starttag(self, tag, attrs):
        tag_lower = tag.lower()
        attr_dict = {k.lower(): v for k, v in attrs}

        if tag_lower in self.ignored_tags and tag_lower != "script":
            self.in_ignored_tag = True
        elif tag_lower == "title":
            self.in_title = True
        elif tag_lower == "script":
            script_type = attr_dict.get("type", "").lower()
            if script_type == "application/ld+json":
                self.in_json_ld = True
                self.current_json_ld_buffer = ""
            else:
                self.in_ignored_tag = True
        elif tag_lower == "meta":
            name = attr_dict.get("name") or attr_dict.get("property") or ""
            content = attr_dict.get("content") or ""
            if name and content:
                self.meta_tags[name.lower()] = content.strip()
        elif tag_lower in ["th", "td"]:
            self.in_table_cell = True
            self.current_cell_text = ""
        elif tag_lower == "tr":
            self.current_row_cells = []

    def handle_endtag(self, tag):
        tag_lower = tag.lower()

        if tag_lower in self.ignored_tags and tag_lower != "script":
            self.in_ignored_tag = False
        elif tag_lower == "title":
            self.in_title = False
        elif tag_lower == "script":
            if self.in_json_ld:
                self.in_json_ld = False
                try:
                    parsed = json.loads(self.current_json_ld_buffer.strip())
                    if isinstance(parsed, list):
                        self.json_ld_blocks.extend([p for p in parsed if isinstance(p, dict)])
                    elif isinstance(parsed, dict):
                        self.json_ld_blocks.append(parsed)
                except Exception:
                    pass
            else:
                self.in_ignored_tag = False
        elif tag_lower in ["th", "td"]:
            self.in_table_cell = False
            self.current_row_cells.append(self.current_cell_text.strip())
        elif tag_lower == "tr":
            if len(self.current_row_cells) >= 2:
                k = self.current_row_cells[0].strip(": ")
                v = self.current_row_cells[1].strip()
                if 1 <= len(k) <= 40 and 1 <= len(v) <= 100:
                    self.spec_table_rows.append((k, v))
            self.current_row_cells = []

    def handle_data(self, data):
        if self.in_json_ld:
            self.current_json_ld_buffer += data
        elif self.in_title:
            self.title += data
        elif self.in_table_cell:
            self.current_cell_text += (" " + data.strip())
        elif not self.in_ignored_tag:
            clean = data.strip()
            if clean:
                self.text_chunks.append(clean)


class URLAdapter:
    """
    Ingests live product links, manufacturer cut sheets, and remote catalog documents via HTTP/HTTPS
    with automatic 301/302/303/307/308 redirect resolution and anti-SSRF security.
    """

    def __init__(self, timeout: int = 10, max_redirects: int = 5, max_download_bytes: int = 25 * 1024 * 1024):
        self.timeout = timeout
        self.max_redirects = max_redirects
        self.max_download_bytes = max_download_bytes
        self.mpn_extractor = MPNExtractor()
        self.brand_resolver = BrandResolver()
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 IndustrialProductIntelligence/2.0"

    def validate_url_security(self, url: str) -> Tuple[bool, str]:
        """
        Validates URL protocol and guards against Server-Side Request Forgery (SSRF).
        """
        url_clean = str(url).strip()
        parsed = urllib.parse.urlparse(url_clean)

        if parsed.scheme not in ["http", "https"]:
            return False, f"Invalid URL scheme '{parsed.scheme}'. Only http:// and https:// are supported."

        hostname = parsed.hostname
        if not hostname:
            return False, "URL does not contain a valid hostname."

        # Check loopback hostnames
        if hostname.lower() in ["localhost", "127.0.0.1", "0.0.0.0", "::1"]:
            return False, f"Access to localhost/internal addresses ('{hostname}') is forbidden."

        # Resolve IP to check for private / internal network ranges
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            for item in addr_info:
                ip_str = item[4][0]
                ip_obj = ipaddress.ip_address(ip_str)
                for net in BLOCKED_IP_NETWORKS:
                    if ip_obj in net:
                        return False, f"Access to internal IP address ({ip_str}) is forbidden."
        except socket.gaierror:
            return False, f"Could not resolve hostname '{hostname}'."
        except Exception as e:
            return False, f"Security validation error: {str(e)}"

        return True, ""

    def safe_fetch(self, initial_url: str) -> Dict[str, Any]:
        """
        Executes safe HTTP/HTTPS fetch following 301/302/303/307/308 redirects up to max_redirects.
        Returns a structured dictionary with final status, content, and redirect metadata.
        """
        current_url = str(initial_url).strip()
        redirect_chain = [current_url]
        redirect_count = 0

        headers = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,text/csv,application/json,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5"
        }

        for hop in range(self.max_redirects + 1):
            # 1. Security Check on each hop
            is_safe, sec_err = self.validate_url_security(current_url)
            if not is_safe:
                return {
                    "success": False,
                    "error_code": "SECURITY_VIOLATION",
                    "error_message": sec_err,
                    "status_code": 0,
                    "source_url": initial_url,
                    "final_url": current_url,
                    "redirect_count": redirect_count,
                    "redirect_chain": redirect_chain
                }

            if hop > self.max_redirects:
                return {
                    "success": False,
                    "error_code": "REDIRECT_LIMIT_EXCEEDED",
                    "error_message": f"Exceeded maximum redirect limit ({self.max_redirects} hops).",
                    "status_code": 308,
                    "source_url": initial_url,
                    "final_url": current_url,
                    "redirect_count": redirect_count,
                    "redirect_chain": redirect_chain
                }

            # 2. Issue Request with 308 Redirect Handler
            try:
                class CustomRedirectHandler(urllib.request.HTTPRedirectHandler):
                    def http_error_308(self, req, fp, code, msg, hdrs):
                        return self.http_error_301(req, fp, code, msg, hdrs)

                opener = urllib.request.build_opener(CustomRedirectHandler)
                req = urllib.request.Request(current_url, headers=headers)

                with opener.open(req, timeout=self.timeout) as response:
                    final_url = response.geturl()
                    status_code = response.getcode()
                    content_type = str(response.headers.get("Content-Type", "")).lower()
                    raw_bytes = response.read(self.max_download_bytes)

                    # Update redirect chain if redirected internally by handler
                    if final_url != current_url and final_url not in redirect_chain:
                        redirect_chain.append(final_url)
                        redirect_count += 1

                    return {
                        "success": True,
                        "status_code": status_code,
                        "content_type": content_type,
                        "raw_bytes": raw_bytes,
                        "source_url": initial_url,
                        "final_url": final_url,
                        "redirect_count": redirect_count,
                        "redirect_chain": redirect_chain,
                        "headers": dict(response.headers)
                    }

            except urllib.error.HTTPError as he:
                # Intercept redirects that urllib didn't automatically follow (e.g. 308)
                if he.code in [301, 302, 303, 307, 308]:
                    loc = he.headers.get("Location")
                    if loc:
                        next_url = urllib.parse.urljoin(current_url, loc.strip())
                        redirect_count += 1
                        redirect_chain.append(next_url)
                        current_url = next_url
                        continue
                    else:
                        return {
                            "success": False,
                            "error_code": "HTTP_ERROR",
                            "error_message": f"HTTP {he.code}: {he.reason} (missing Location header)",
                            "status_code": he.code,
                            "source_url": initial_url,
                            "final_url": current_url,
                            "redirect_count": redirect_count,
                            "redirect_chain": redirect_chain
                        }

                return {
                    "success": False,
                    "error_code": "HTTP_ERROR",
                    "error_message": f"HTTP {he.code}: {he.reason}",
                    "status_code": he.code,
                    "source_url": initial_url,
                    "final_url": current_url,
                    "redirect_count": redirect_count,
                    "redirect_chain": redirect_chain
                }

            except urllib.error.URLError as ue:
                return {
                    "success": False,
                    "error_code": "CONNECTION_ERROR",
                    "error_message": f"Network connection failed: {ue.reason}",
                    "status_code": 0,
                    "source_url": initial_url,
                    "final_url": current_url,
                    "redirect_count": redirect_count,
                    "redirect_chain": redirect_chain
                }
            except socket.timeout:
                return {
                    "success": False,
                    "error_code": "TIMEOUT_ERROR",
                    "error_message": f"Request timed out after {self.timeout} seconds",
                    "status_code": 408,
                    "source_url": initial_url,
                    "final_url": current_url,
                    "redirect_count": redirect_count,
                    "redirect_chain": redirect_chain
                }
            except Exception as e:
                return {
                    "success": False,
                    "error_code": "FETCH_ERROR",
                    "error_message": f"Failed to retrieve URL: {str(e)}",
                    "status_code": 0,
                    "source_url": initial_url,
                    "final_url": current_url,
                    "redirect_count": redirect_count,
                    "redirect_chain": redirect_chain
                }

        return {
            "success": False,
            "error_code": "REDIRECT_LIMIT_EXCEEDED",
            "error_message": f"Exceeded maximum redirect limit ({self.max_redirects} hops).",
            "status_code": 308,
            "source_url": initial_url,
            "final_url": current_url,
            "redirect_count": redirect_count,
            "redirect_chain": redirect_chain
        }

    def parse(
        self,
        url_or_data: str,
        filename: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[CanonicalProductRecord]:
        """
        Fetches and standardizes content from a remote product URL or catalog document.
        """
        initial_url = str(url_or_data).strip()

        # 1. Fetch resource following all redirects safely
        fetch_res = self.safe_fetch(initial_url)

        if not fetch_res["success"]:
            return [self._build_failed_record(
                initial_url=initial_url,
                final_url=fetch_res.get("final_url", initial_url),
                error_msg=fetch_res.get("error_message", "Failed to fetch URL"),
                error_code=fetch_res.get("error_code", "FETCH_ERROR"),
                status_code=fetch_res.get("status_code", 0),
                redirect_count=fetch_res.get("redirect_count", 0),
                redirect_chain=fetch_res.get("redirect_chain", [])
            )]

        final_url = fetch_res["final_url"]
        content_type = fetch_res["content_type"]
        raw_bytes = fetch_res["raw_bytes"]
        status_code = fetch_res["status_code"]
        redirect_count = fetch_res["redirect_count"]
        redirect_chain = fetch_res["redirect_chain"]

        final_domain = urllib.parse.urlparse(final_url).hostname or "unknown_domain"

        # 2. Detect Resource Type from FINAL RESPONSE
        resource_type = self._detect_resource_type(final_url, content_type, raw_bytes)

        # A. Direct PDF URL (or redirected to PDF)
        if resource_type == "pdf":
            from adapters.pdf_adapter import PDFAdapter
            pdf_adapter = PDFAdapter()
            records = pdf_adapter.parse(raw_bytes, filename=final_url)
            for r in records:
                r.source.source_type = "url"
                r.source.source_name = initial_url
                r.source.content_type = "application/pdf"
                r.traceability["source_url"] = initial_url
                r.traceability["final_url"] = final_url
                r.traceability["redirected"] = (redirect_count > 0)
                r.traceability["redirect_count"] = redirect_count
                r.traceability["redirect_chain"] = redirect_chain
                r.traceability["domain"] = final_domain
                r.traceability["extraction_method"] = "Remote PDF Datasheet"
            return records

        # B. Direct CSV URL (or redirected to CSV)
        elif resource_type == "csv":
            from adapters.csv_adapter import CSVAdapter
            csv_adapter = CSVAdapter()
            records = csv_adapter.parse(raw_bytes, filename=final_url)
            for r in records:
                r.source.source_type = "url"
                r.source.source_name = initial_url
                r.source.content_type = "text/csv"
                r.traceability["source_url"] = initial_url
                r.traceability["final_url"] = final_url
                r.traceability["redirected"] = (redirect_count > 0)
                r.traceability["redirect_count"] = redirect_count
                r.traceability["redirect_chain"] = redirect_chain
                r.traceability["domain"] = final_domain
                r.traceability["extraction_method"] = "Remote CSV Catalog"
            return records

        # C. Direct XLSX / XLS URL (or redirected to Excel)
        elif resource_type in ["xlsx", "xls"]:
            from adapters.xlsx_adapter import XLSXAdapter
            xlsx_adapter = XLSXAdapter()
            records = xlsx_adapter.parse(raw_bytes, filename=final_url)
            for r in records:
                r.source.source_type = "url"
                r.source.source_name = initial_url
                r.source.content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                r.traceability["source_url"] = initial_url
                r.traceability["final_url"] = final_url
                r.traceability["redirected"] = (redirect_count > 0)
                r.traceability["redirect_count"] = redirect_count
                r.traceability["redirect_chain"] = redirect_chain
                r.traceability["domain"] = final_domain
                r.traceability["extraction_method"] = "Remote Excel Catalog"
            return records

        # D. Direct JSON URL / API (or redirected to JSON)
        elif resource_type == "json":
            from adapters.json_adapter import JSONAdapter
            json_adapter = JSONAdapter()
            records = json_adapter.parse(raw_bytes, filename=final_url)
            for r in records:
                r.source.source_type = "url"
                r.source.source_name = initial_url
                r.source.content_type = "application/json"
                r.traceability["source_url"] = initial_url
                r.traceability["final_url"] = final_url
                r.traceability["redirected"] = (redirect_count > 0)
                r.traceability["redirect_count"] = redirect_count
                r.traceability["redirect_chain"] = redirect_chain
                r.traceability["domain"] = final_domain
                r.traceability["extraction_method"] = "Remote JSON Catalog"
            return records

        # E. Direct Image URL (or redirected to Image)
        elif resource_type == "image":
            from adapters.image_adapter import ImageAdapter
            img_adapter = ImageAdapter()
            records = img_adapter.parse(raw_bytes, filename=final_url)
            for r in records:
                r.source.source_type = "url"
                r.source.source_name = initial_url
                r.traceability["source_url"] = initial_url
                r.traceability["final_url"] = final_url
                r.traceability["redirected"] = (redirect_count > 0)
                r.traceability["redirect_count"] = redirect_count
                r.traceability["domain"] = final_domain
                r.traceability["extraction_method"] = "Remote Visual Asset"
            return records

        # F. HTML Webpage (Default)
        return self._extract_html_product_page(
            initial_url=initial_url,
            final_url=final_url,
            domain=final_domain,
            status_code=status_code,
            content_type=content_type,
            raw_bytes=raw_bytes,
            redirect_count=redirect_count,
            redirect_chain=redirect_chain
        )

    def _detect_resource_type(self, url: str, content_type: str, raw_bytes: bytes) -> str:
        """Detects resource type combining Content-Type headers, URL extension, and file magic bytes."""
        path_lower = urllib.parse.urlparse(url).path.lower()
        
        # Magic bytes
        if raw_bytes.startswith(b"%PDF"):
            return "pdf"
        elif raw_bytes.startswith(b"PK\x03\x04") and (path_lower.endswith(".xlsx") or "spreadsheet" in content_type):
            return "xlsx"
        elif raw_bytes.startswith(b"\x89PNG") or raw_bytes.startswith(b"\xFF\xD8\xFF") or raw_bytes.startswith(b"GIF8"):
            return "image"

        # Content-Type header
        if "application/pdf" in content_type or path_lower.endswith(".pdf"):
            return "pdf"
        elif "text/csv" in content_type or path_lower.endswith(".csv"):
            return "csv"
        elif "spreadsheetml" in content_type or path_lower.endswith(".xlsx"):
            return "xlsx"
        elif "ms-excel" in content_type or path_lower.endswith(".xls"):
            return "xls"
        elif "application/json" in content_type or path_lower.endswith(".json"):
            return "json"
        elif any(t in content_type for t in ["image/png", "image/jpeg", "image/webp", "image/tiff", "image/bmp"]):
            return "image"

        return "html"

    def _extract_html_product_page(
        self,
        initial_url: str,
        final_url: str,
        domain: str,
        status_code: int,
        content_type: str,
        raw_bytes: bytes,
        redirect_count: int = 0,
        redirect_chain: Optional[List[str]] = None
    ) -> List[CanonicalProductRecord]:
        """Extracts structured product data from HTML with Schema.org / JSON-LD priority."""
        html_text = raw_bytes.decode("utf-8", errors="replace")
        parser = EnhancedHTMLProductParser()
        try:
            parser.feed(html_text)
        except Exception:
            pass

        meta = parser.meta_tags
        page_title = parser.title.strip()
        body_text = " ".join(parser.text_chunks)

        # 1. JSON-LD Schema.org Extraction (Priority 1)
        json_ld_product = self._find_json_ld_product(parser.json_ld_blocks)
        extraction_method = "JSON-LD (schema.org/Product)" if json_ld_product else "OpenGraph / HTML Metadata"

        product_name = ""
        brand_name = ""
        manuf_name = ""
        mpn_value = ""
        sku_value = ""
        desc_value = ""
        cat_value = ""
        specs_dict: Dict[str, Any] = {}

        if json_ld_product:
            product_name = str(json_ld_product.get("name", "")).strip()
            
            # Brand
            raw_b = json_ld_product.get("brand")
            if isinstance(raw_b, dict):
                brand_name = str(raw_b.get("name", "")).strip()
            elif isinstance(raw_b, str):
                brand_name = raw_b.strip()

            # Manufacturer
            raw_m = json_ld_product.get("manufacturer")
            if isinstance(raw_m, dict):
                manuf_name = str(raw_m.get("name", "")).strip()
            elif isinstance(raw_m, str):
                manuf_name = raw_m.strip()

            mpn_value = str(json_ld_product.get("mpn") or json_ld_product.get("model") or "").strip()
            sku_value = str(json_ld_product.get("sku") or "").strip()
            desc_value = str(json_ld_product.get("description") or "").strip()
            cat_value = str(json_ld_product.get("category") or "").strip()

            # Key-values in additionalProperty
            add_props = json_ld_product.get("additionalProperty", [])
            if isinstance(add_props, list):
                for p in add_props:
                    if isinstance(p, dict) and "name" in p and "value" in p:
                        specs_dict[str(p["name"]).strip()] = str(p["value"]).strip()

        # 2. Fallback to OpenGraph & Meta Tags
        if not product_name:
            product_name = meta.get("og:title") or meta.get("twitter:title") or page_title
        if not brand_name:
            brand_name = meta.get("product:brand") or meta.get("og:site_name") or ""
        if not mpn_value:
            mpn_value = meta.get("product:retailer_item_id") or meta.get("product:mfr_part_no") or ""
        if not desc_value:
            desc_value = meta.get("og:description") or meta.get("description") or meta.get("twitter:description") or body_text[:300]

        # 3. Add table specifications
        for k, v in parser.spec_table_rows:
            if k not in specs_dict:
                specs_dict[k] = v

        # 4. Extract MPN candidate if not found
        if not mpn_value:
            extracted_mpn, _ = self.mpn_extractor.extract_mpn("", f"{product_name} {desc_value}")
            if extracted_mpn and extracted_mpn != "UNKNOWN_MPN":
                mpn_value = extracted_mpn

        # Check manufacturer domain priority
        is_mfr = self._is_manufacturer_domain(domain, brand_name)

        record = CanonicalProductRecord(
            source=SourceMetadata(
                source_type="url",
                source_name=initial_url,
                source_location=f"Web: {domain}",
                source_id=f"url_{abs(hash(initial_url))}",
                retrieval_status="success",
                content_type=content_type or "text/html"
            ),
            raw_data={
                "source_url": initial_url,
                "final_url": final_url,
                "domain": domain,
                "status_code": status_code,
                "redirected": (redirect_count > 0),
                "redirect_count": redirect_count,
                "page_title": page_title,
                "extraction_method": extraction_method,
                "is_manufacturer_source": is_mfr,
                "meta_tags_count": len(meta),
                "json_ld_found": bool(json_ld_product),
                "table_specs_count": len(parser.spec_table_rows)
            },
            product=CanonicalProduct(
                product_name=product_name[:150] or f"Product ({domain})",
                brand=brand_name,
                manufacturer=manuf_name,
                mpn=mpn_value,
                description=desc_value[:350] or product_name,
                category=cat_value or "Industrial Equipment",
                sku=sku_value,
                specifications=specs_dict,
                attributes=specs_dict
            ),
            traceability={
                "source_url": initial_url,
                "final_url": final_url,
                "domain": domain,
                "redirected": (redirect_count > 0),
                "redirect_count": redirect_count,
                "redirect_chain": redirect_chain or [initial_url],
                "extraction_method": extraction_method,
                "is_manufacturer_source": is_mfr
            }
        )

        return [record]

    def _find_json_ld_product(self, blocks: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Searches JSON-LD blocks for Schema.org Product entities."""
        for b in blocks:
            type_val = b.get("@type")
            if type_val == "Product" or (isinstance(type_val, list) and "Product" in type_val):
                return b
            if "@graph" in b and isinstance(b["@graph"], list):
                for item in b["@graph"]:
                    if isinstance(item, dict):
                        itype = item.get("@type")
                        if itype == "Product" or (isinstance(itype, list) and "Product" in itype):
                            return item
        return None

    def _is_manufacturer_domain(self, domain: str, brand_name: str) -> bool:
        """Determines if the domain matches a recognized canonical manufacturer website."""
        d_clean = re.sub(r"[^a-z0-9]", "", domain.lower().replace("www.", ""))
        b_clean = re.sub(r"[^a-z0-9]", "", brand_name.lower().strip())
        if b_clean and len(b_clean) >= 3 and (b_clean in d_clean or d_clean in b_clean):
            return True
        return False

    def _build_failed_record(
        self,
        initial_url: str,
        final_url: str,
        error_msg: str,
        error_code: str,
        status_code: int = 0,
        redirect_count: int = 0,
        redirect_chain: Optional[List[str]] = None
    ) -> CanonicalProductRecord:
        """Constructs an explicit failed CanonicalProductRecord without hallucinating values."""
        domain = urllib.parse.urlparse(final_url or initial_url).hostname or "unknown"
        return CanonicalProductRecord(
            source=SourceMetadata(
                source_type="url",
                source_name=initial_url,
                source_location="Web",
                source_id=f"url_{abs(hash(initial_url))}",
                retrieval_status="failed",
                content_type="unknown"
            ),
            raw_data={
                "source_url": initial_url,
                "final_url": final_url,
                "domain": domain,
                "error_code": error_code,
                "error_message": error_msg,
                "status_code": status_code,
                "redirect_count": redirect_count,
                "redirect_chain": redirect_chain or [initial_url]
            },
            product=CanonicalProduct(
                product_name="Inaccessible URL",
                description=f"Remote retrieval failed for URL: {initial_url} ({error_msg})"
            ),
            traceability={
                "source_url": initial_url,
                "final_url": final_url,
                "error_code": error_code,
                "error_message": error_msg,
                "status_code": status_code,
                "redirect_count": redirect_count,
                "redirect_chain": redirect_chain or [initial_url]
            }
        )

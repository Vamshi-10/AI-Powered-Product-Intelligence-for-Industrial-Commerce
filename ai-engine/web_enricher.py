"""
Live Web Search & E-Commerce Scraper ($0 Free Tier)
Extracts product specifications, high-res images, and retailer buy links.
Owned by Vamshi Krishna (AI Engine Developer & Project Lead)
"""

import json
import logging
import httpx
from typing import Dict, Any, List, Optional
from bs4 import BeautifulSoup

try:
    import trafilatura
except ImportError:
    trafilatura = None

try:
    from duckduckgo_search import DDGS
except ImportError:
    DDGS = None

logger = logging.getLogger("WebEnricher")


class WebProductEnricher:
    """
    $0 Live Web Enricher using free DuckDuckGo search and BeautifulSoup scraping.
    Finds verified manufacturer specs, PDF links, images, and buy links.
    """

    def __init__(self):
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }

    def search_and_enrich(self, query: str, max_results: int = 3) -> Dict[str, Any]:
        """
        Takes an MPN or product description, searches DDG for free,
        finds top e-commerce / manufacturer pages, and extracts specs & images.
        """
        results: Dict[str, Any] = {
            "query": query,
            "found_urls": [],
            "scraped_text": "",
            "spec_table": {},
            "images": [],
            "buy_links": [],
        }

        if not DDGS:
            logger.warning("duckduckgo_search not installed. Skipping live web query.")
            return results

        try:
            with DDGS() as ddgs:
                search_results = list(ddgs.text(query, max_results=max_results))

            if not search_results:
                return results

            urls = [r["href"] for r in search_results if "href" in r]
            results["found_urls"] = urls

            # Scrape top 2 results
            for url in urls[:2]:
                page_data = self.scrape_product_url(url)
                if page_data.get("raw_text"):
                    results["scraped_text"] += f"\n--- Source: {url} ---\n" + page_data["raw_text"][:2500]
                results["spec_table"].update(page_data.get("spec_table", {}))
                results["images"].extend(page_data.get("images", []))

                # Identify major marketplace buy links
                lower_url = url.lower()
                for platform in ["amazon", "flipkart", "myntra", "bestbuy", "homedepot", "grainger", "lowes"]:
                    if platform in lower_url:
                        results["buy_links"].append({"platform": platform.capitalize(), "url": url})
                        break

            # Deduplicate images
            results["images"] = list(dict.fromkeys(results["images"]))[:8]

        except Exception as e:
            logger.warning(f"Web enrichment error for '{query}': {e}")
            results["error"] = str(e)

        return results

    def scrape_product_url(self, url: str) -> Dict[str, Any]:
        """
        Extracts structured JSON-LD schemas, specification tables, and clean images from ANY web page.
        """
        data = {
            "url": url,
            "raw_text": "",
            "spec_table": {},
            "images": [],
        }

        try:
            with httpx.Client(headers=self.headers, follow_redirects=True, timeout=10.0) as client:
                resp = client.get(url)
                if resp.status_code != 200:
                    return data
                html = resp.text
        except Exception as e:
            logger.warning(f"Failed to fetch {url}: {e}")
            return data

        # 1. Trafilatura text extraction (clean article/spec text)
        if trafilatura:
            try:
                extracted = trafilatura.extract(html)
                if extracted:
                    data["raw_text"] = extracted
            except Exception:
                pass

        soup = BeautifulSoup(html, "html.parser")
        if not data["raw_text"]:
            data["raw_text"] = soup.get_text(separator=" ", strip=True)[:4000]

        # 2. Extract JSON-LD (E-Commerce Product Schema)
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                content = json.loads(script.string)
                if isinstance(content, dict):
                    if content.get("@type") in ["Product", "IndividualProduct"]:
                        self._extract_from_json_ld(content, data)
                elif isinstance(content, list):
                    for item in content:
                        if isinstance(item, dict) and item.get("@type") in ["Product", "IndividualProduct"]:
                            self._extract_from_json_ld(item, data)
            except Exception:
                continue

        # 3. Extract HTML Specification Tables
        for table in soup.find_all("table"):
            for row in table.find_all("tr"):
                cols = row.find_all(["th", "td"])
                if len(cols) == 2:
                    k = cols[0].get_text(strip=True)
                    v = cols[1].get_text(strip=True)
                    if k and v and len(k) < 40 and len(v) < 120:
                        data["spec_table"][k] = v

        # 4. Extract High-Res Product Images
        for img in soup.find_all("img", src=True):
            src = img["src"]
            if src.startswith("//"):
                src = "https:" + src
            lower_src = src.lower()
            if any(ext in lower_src for ext in [".jpg", ".jpeg", ".png", ".webp"]) and not any(
                bad in lower_src for bad in ["logo", "icon", "banner", "spinner", "badge", "avatar"]
            ):
                if src.startswith("http"):
                    data["images"].append(src)

        return data

    def _extract_from_json_ld(self, item: dict, data: dict):
        if "image" in item:
            img = item["image"]
            if isinstance(img, list):
                data["images"].extend([i for i in img if isinstance(i, str) and i.startswith("http")])
            elif isinstance(img, str) and img.startswith("http"):
                data["images"].append(img)
        if "description" in item and not data["raw_text"]:
            data["raw_text"] = item["description"]

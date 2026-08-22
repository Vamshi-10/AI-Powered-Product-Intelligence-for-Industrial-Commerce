"""
AI-Powered Industrial Product Intelligence - Document Processing Explorer
Interactive Streamlit Application for Single Item Enrichment, Batch Processing,
PDF Spec Sheet Intelligence, Rule Validation & Data Export.
"""

import os
import sys
import json
import pandas as pd
import streamlit as st

# Add current directory to path
_current_dir = os.path.dirname(os.path.abspath(__file__))
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

from pipeline import DocumentProcessingPipeline
from parsers.catalog_parser import PLACEHOLDER_VALUES


# Page configuration
st.set_page_config(
    page_title="Industrial Product Intelligence | Document Processing",
    page_icon="⚙️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for modern industrial UI
st.markdown("""
<style>
    .main {
        background-color: #0B0F19;
        color: #F3F4F6;
    }
    .metric-card {
        background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 18px 22px;
        margin-bottom: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }
    .metric-title {
        color: #94A3B8;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .metric-val {
        color: #38BDF8;
        font-size: 1.8rem;
        font-weight: 700;
        margin-top: 4px;
    }
    .tier-badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.8rem;
        margin-right: 6px;
    }
    .badge-invoice { background-color: #3B82F6; color: white; }
    .badge-mobile { background-color: #10B981; color: white; }
    .badge-title { background-color: #8B5CF6; color: white; }
    .badge-long { background-color: #F59E0B; color: black; }
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
    }
    .stTabs [data-baseweb="tab"] {
        height: 48px;
        border-radius: 8px 8px 0px 0px;
        padding: 0 20px;
        background-color: #1E293B;
        color: #CBD5E1;
    }
    .stTabs [aria-selected="true"] {
        background-color: #0284C7 !important;
        color: white !important;
    }
</style>
""", unsafe_allow_html=True)


@st.cache_resource
def get_pipeline():
    return DocumentProcessingPipeline()


pipeline = get_pipeline()
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# Sidebar
st.sidebar.image("https://img.icons8.com/isometric/100/automation.png", width=64)
st.sidebar.title("Industrial Intelligence")
st.sidebar.caption("Document Processing & Normalization Engine")

st.sidebar.markdown("---")
st.sidebar.subheader("📐 Master Rule Specifications")
st.sidebar.markdown("""
- **Invoice Desc**: $\le 40$ chars, ALL CAPS
- **Mobile Desc**: $60\text{–}80$ chars target
- **Product Title**: Brand® + Series + MPN + Specs
- **UOM Standard**: Space between digit & unit (`24 in`)
- **Fractions**: 64ths decimal lookup conversion
""")

st.sidebar.markdown("---")
st.sidebar.caption("Antigravity AI Platform • Hackathon Release")


# Header
st.title("⚙️ AI-Powered Product Intelligence Engine")
st.subheader("Automated Enrichment, Technical Extraction & Content Normalization for Industrial Commerce")

# Tabs
tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "🔍 Live Single Item Studio",
    "📦 Batch Catalog Processing",
    "🔗 Product / Catalog URL",
    "📄 PDF Spec Sheet Intelligence",
    "📚 Rules & Dictionary Explorer"
])


# -------------------------------------------------------------------------------------------------
# TAB 1: SINGLE PRODUCT STUDIO
# -------------------------------------------------------------------------------------------------
with tab1:
    st.markdown("### Interactive Single Product Enrichment")
    st.markdown("Select a sample from the industrial dataset or input custom cryptic supplier strings.")

    sample_presets = {
        "Frigidaire Built-In Dishwasher": {
            "mfg_part_num": "PDSH4816AF",
            "part_desc": "PDSH4816AF Dishwasher SS - Display Only",
            "part_manuf": "Appliance Dealers Cooperative (APPDE)",
            "unilog_brand": None,
            "e1_brand": None
        },
        "Diablo Sanding Belt": {
            "mfg_part_num": "DCB518ASTS06G",
            "part_desc": "DCB518ASTS06G Diablo 1/2\"x18\" - Sanding Belt 6pc",
            "part_manuf": "Freud Inc (2435)",
            "unilog_brand": "Diablo",
            "e1_brand": None
        },
        "Milwaukee Cut-Off Disc": {
            "mfg_part_num": "49-94-0013",
            "part_desc": "49-94-0013 Milw 5\"x.045\"x7/8\" Metal Cut Off Disc",
            "part_manuf": "Milwaukee Accessory (4031)",
            "unilog_brand": None,
            "e1_brand": None
        },
        "TimberTech Azek PVC Decking": {
            "mfg_part_num": "ADB15516CS",
            "part_desc": "1x6-16' Coastline Sq Edge - Vintage Azek PVC Decking",
            "part_manuf": "Parksite (6151)",
            "unilog_brand": None,
            "e1_brand": "TIMBERTECH"
        },
        "Dewalt Cordless Hammer Drill": {
            "mfg_part_num": "DCD1007B",
            "part_desc": "DCD1007B Dewalt 20V Cordless - 1/2\" Hammer Drill (Bare)",
            "part_manuf": "Black & Decker/dewlt (2585)",
            "unilog_brand": None,
            "e1_brand": "DEWALT"
        }
    }

    selected_preset = st.selectbox("Load Dataset Preset Example:", list(sample_presets.keys()))
    preset = sample_presets[selected_preset]

    col_in1, col_in2 = st.columns(2)
    with col_in1:
        inp_desc = st.text_input("Raw Part Description:", value=preset["part_desc"])
        inp_mpn = st.text_input("Manufacturer Part Number (MPN):", value=preset["mfg_part_num"])
    with col_in2:
        inp_manuf = st.text_input("Supplier / Manufacturer:", value=preset["part_manuf"])
        inp_brand = st.text_input("Raw Brand (Optional):", value=preset.get("unilog_brand") or preset.get("e1_brand") or "")

    if st.button("⚡ Run Document Processing Pipeline", type="primary"):
        with st.spinner("Enriching and normalizing product record..."):
            raw_payload = {
                "mfg_part_num": inp_mpn if inp_mpn.strip() else None,
                "part_desc": inp_desc if inp_desc.strip() else None,
                "part_manuf": inp_manuf if inp_manuf.strip() else None,
                "unilog_brand": inp_brand if inp_brand.strip() else None,
                "e1_brand": None,
                "dib_brand": None
            }
            res = pipeline.process_item(raw_payload)

            st.markdown("---")
            # Quality & Confidence KPI Banner
            kpi_col1, kpi_col2, kpi_col3, kpi_col4 = st.columns(4)
            with kpi_col1:
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-title">Pipeline Confidence</div>
                    <div class="metric-val">{res['overall_confidence']}%</div>
                </div>
                """, unsafe_allow_html=True)
            with kpi_col2:
                brand_status = "✅ Trademark Verified" if res['brand_info']['confidence'] >= 0.75 else "⚠️ Unverified"
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-title">Canonical Brand</div>
                    <div class="metric-val" style="font-size: 1.3rem;">{res['canonical_brand']}</div>
                    <small style="color: #10B981;">{brand_status}</small>
                </div>
                """, unsafe_allow_html=True)
            with kpi_col3:
                inv_len = len(res['invoice_description'])
                inv_status = "✅ <= 40 Chars CAPS" if inv_len <= 40 else "❌ Exceeds limit"
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-title">Invoice Desc Length</div>
                    <div class="metric-val">{inv_len} <span style="font-size: 1rem; color: #94A3B8;">chars</span></div>
                    <small style="color: #10B981;">{inv_status}</small>
                </div>
                """, unsafe_allow_html=True)
            with kpi_col4:
                mob_len = len(res['mobile_description'])
                mob_status = "✅ In Range (60-80)" if 50 <= mob_len <= 85 else "⚠️ Adjusted"
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-title">Mobile Desc Length</div>
                    <div class="metric-val">{mob_len} <span style="font-size: 1rem; color: #94A3B8;">chars</span></div>
                    <small style="color: #38BDF8;">{mob_status}</small>
                </div>
                """, unsafe_allow_html=True)

            # 5-Tier Descriptions Display
            st.subheader("📋 5-Tier Generated Content Formats")

            st.markdown("#### 1. Product Title / Short Description (Search & Category Pages)")
            st.code(res["product_title"], language="markdown")

            st.markdown(f"#### 2. Invoice Description (`{len(res['invoice_description'])}` Chars | POS / Till Receipt)")
            st.code(res["invoice_description"], language="text")

            st.markdown(f"#### 3. Mobile Description (`{len(res['mobile_description'])}` Chars | Mobile App / Cards)")
            st.code(res["mobile_description"], language="text")

            st.markdown("#### 4. Long Description (PDP Marketing & Specifications Copy)")
            st.info(res["long_description"])

            st.markdown("#### 5. Structured Key-Value Taxonomy Attributes (LOV / Facets)")
            attr_df = pd.DataFrame([{"Attribute Name": k, "Normalized Value": v} for k, v in res["attributes"].items()])
            st.dataframe(attr_df, width="stretch")

            # Validation & Audit Log
            with st.expander("🛡️ Rule Compliance & Explainability Audit", expanded=True):
                st.json(res["validation"])


# -------------------------------------------------------------------------------------------------
# TAB 2: BATCH PROCESSING
# -------------------------------------------------------------------------------------------------
with tab2:
    st.markdown("### Batch Catalog Processing & Evaluation")
    st.markdown("Process full supplier spreadsheets (CSV / XLSX) at speeds over 800 items/second.")

    default_csv_path = os.path.join(base_dir, "data", "sample_products", "sample_raw_items.csv")

    uploaded_file = st.file_uploader("Upload Supplier Spreadsheet (.csv or .xlsx):", type=["csv", "xlsx", "xls"])
    
    if st.button("🚀 Process 1,000 Catalog Items (Benchmark Dataset)", type="primary"):
        with st.spinner("Processing batch catalog through Document Processing pipeline..."):
            items = pipeline.process_catalog_file(default_csv_path)
            
            total_items = len(items)
            avg_conf = sum(i["overall_confidence"] for i in items) / max(1, total_items)
            inv_pass = sum(1 for i in items if i["validation"]["rule_checks"].get("invoice_char_limit", False))
            rev_count = sum(1 for i in items if i.get("needs_human_review", False))

            st.success(f"Successfully enriched and validated {total_items} products!")

            b_col1, b_col2, b_col3, b_col4 = st.columns(4)
            b_col1.metric("Total Items Processed", f"{total_items}")
            b_col2.metric("Average Confidence", f"{avg_conf:.1f}%")
            b_col3.metric("Invoice Rule Adherence", f"{inv_pass / total_items * 100:.1f}%")
            b_col4.metric("Human Review Queue", f"{rev_count} items")

            # Flatten for Table
            table_rows = []
            for item in items:
                table_rows.append({
                    "MPN": item["mfg_part_num"],
                    "Raw Description": item["raw_part_desc"],
                    "Canonical Brand": item["canonical_brand"],
                    "Manufacturer": item["canonical_manufacturer"],
                    "Product Title": item["product_title"],
                    "Invoice Desc": item["invoice_description"],
                    "Mobile Desc": item["mobile_description"],
                    "Confidence": f"{item['overall_confidence']}%",
                    "Needs Review": "⚠️ Flagged" if item["needs_human_review"] else "✅ OK"
                })
            df_display = pd.DataFrame(table_rows)

            # Filter options
            filter_mode = st.radio("Filter records:", ["All Records", "Needs Review Only", "Verified Only"], horizontal=True)
            if filter_mode == "Needs Review Only":
                df_display = df_display[df_display["Needs Review"] == "⚠️ Flagged"]
            elif filter_mode == "Verified Only":
                df_display = df_display[df_display["Needs Review"] == "✅ OK"]

            st.dataframe(df_display, width="stretch", height=450)

            # Export both summary and full 252-column Unilog delivery format
            from delivery_formatter import DeliveryFormatter
            formatter = DeliveryFormatter()
            raw_parsed_items = pipeline.catalog_parser.parse_file(default_csv_path)
            df_252 = formatter.format_batch(items, raw_parsed_items)

            dl_col1, dl_col2 = st.columns(2)
            with dl_col1:
                csv_data_summary = df_display.to_csv(index=False).encode('utf-8')
                st.download_button(
                    label="📥 Download Enriched Summary Dataset (CSV)",
                    data=csv_data_summary,
                    file_name="enriched_industrial_product_intelligence.csv",
                    mime="text/csv"
                )
            with dl_col2:
                csv_data_252 = df_252.to_csv(index=False).encode('utf-8')
                st.download_button(
                    label="📦 Download Full 252-Column Delivery Format (CSV)",
                    data=csv_data_252,
                    file_name="unilog_252_delivery_format.csv",
                    mime="text/csv"
                )


# -------------------------------------------------------------------------------------------------
# TAB 3: PRODUCT / CATALOG URL INGESTION
# -------------------------------------------------------------------------------------------------
with tab3:
    st.markdown("### 🔗 Ingest Live Product, Manufacturer, or Catalog URL")
    st.markdown("Fetch, identify, parse, and enrich remote product documents, cut-sheets, or catalog files without manual downloads.")

    url_presets = {
        "Custom URL Input": "",
        "Preset 1: Milwaukee Tool Cut-Off Disc (Web Page)": "https://www.milwaukeetool.com/Products/49-94-0013",
        "Preset 2: DeWalt 20V Cordless Hammer Drill (Web Page)": "https://www.dewalt.com/product/dcd1007b",
        "Preset 3: Diablo Sanding Belt Technical Datasheet (PDF URL)": "https://www.diablotools.com/products/DCB518ASTS06G.pdf",
        "Preset 4: TimberTech Azek PVC Decking Spec Sheet (PDF URL)": "https://www.timbertech.com/products/decking/vintage-azek.pdf",
        "Preset 5: Industrial Abrasives & Safety Supply Catalog (CSV URL)": "https://raw.githubusercontent.com/datasets/sample-products/master/industrial-catalog.csv"
    }

    selected_url_preset = st.selectbox("Quick Load Example URL:", list(url_presets.keys()))
    default_url_val = url_presets[selected_url_preset]

    target_url = st.text_input(
        "Enter Product or Catalog URL (HTTP / HTTPS):",
        value=default_url_val,
        placeholder="https://example.com/product/12345 or https://example.com/catalog.xlsx"
    )

    st.caption("🌐 **Supported Modalities**: Product Webpages (JSON-LD / Schema.org), Manufacturer Cut-Sheets, PDF Documents, Remote CSV Catalogs, XLSX Spreadsheets, JSON APIs.")

    if st.button("⚡ Fetch & Analyze URL", type="primary"):
        if not target_url.strip():
            st.warning("Please enter a valid HTTP or HTTPS URL.")
        else:
            with st.spinner("Connecting to remote endpoint, detecting resource format, and running Product Intelligence Pipeline..."):
                url_res = pipeline.process_url(target_url.strip())

            if not url_res.get("success") or not url_res.get("products"):
                st.error(f"❌ Ingestion Failed: {url_res.get('message', 'Unable to retrieve or parse the remote document.')}")
            else:
                products_list = url_res.get("products", [])
                first_prod = products_list[0]
                source_meta = first_prod.get("source", {})
                retrieval_status = source_meta.get("retrieval_status", "success")

                if retrieval_status == "failed":
                    raw_err = first_prod.get("raw_data", {})
                    st.error(f"❌ Retrieval Failed: {raw_err.get('error_message', 'Could not access the remote URL.')}")
                    st.info(f"**Error Code**: `{raw_err.get('error_code', 'INACCESSIBLE_SOURCE')}` | **URL**: `{target_url}`")
                else:
                    st.success(f"✅ Successfully ingested and enriched **{len(products_list)}** product(s) from `{target_url}`")

                    # Resource Info & Quality Banner
                    meta_col1, meta_col2, meta_col3, meta_col4 = st.columns(4)
                    with meta_col1:
                        st.markdown(f"""
                        <div class="metric-card">
                            <div class="metric-title">Source Resource</div>
                            <div class="metric-val" style="font-size:1.1rem; color:#F8FAFC;">{source_meta.get('content_type', 'HTML / Web')}</div>
                        </div>
                        """, unsafe_allow_html=True)
                    with meta_col2:
                        extraction_meth = first_prod.get("traceability", {}).get("extraction_method", "Structured Web Parser")
                        st.markdown(f"""
                        <div class="metric-card">
                            <div class="metric-title">Extraction Method</div>
                            <div class="metric-val" style="font-size:1.1rem; color:#38BDF8;">{extraction_meth}</div>
                        </div>
                        """, unsafe_allow_html=True)
                    with meta_col3:
                        q_conf = url_res.get("quality_metrics", {}).get("average_confidence", 95.0)
                        st.markdown(f"""
                        <div class="metric-card">
                            <div class="metric-title">Enrichment Confidence</div>
                            <div class="metric-val" style="color:#10B981;">{q_conf:.1f}%</div>
                        </div>
                        """, unsafe_allow_html=True)
                    with meta_col4:
                        mfr_confirmed = first_prod.get("traceability", {}).get("is_manufacturer_source", False)
                        st.markdown(f"""
                        <div class="metric-card">
                            <div class="metric-title">Manufacturer Source</div>
                            <div class="metric-val" style="font-size:1.1rem; color:{'#10B981' if mfr_confirmed else '#F59E0B'};">{'✅ Confirmed' if mfr_confirmed else 'ℹ️ Public Source'}</div>
                        </div>
                        """, unsafe_allow_html=True)

                    st.markdown("---")

                    if len(products_list) == 1:
                        # Single Product Detailed View
                        p = first_prod
                        norm = p.get("normalized", {})
                        gen = p.get("generated", {})
                        qual = p.get("quality", {})

                        v_col1, v_col2 = st.columns([3, 2])
                        with v_col1:
                            st.markdown("#### 📑 Standardized Commerce Title")
                            st.info(gen.get("title") or p.get("product", {}).get("product_name"))

                            st.markdown("#### 🧾 Invoice Description (≤ 40 chars, ALL CAPS)")
                            st.code(gen.get("invoice_description", "N/A"), language="text")

                            st.markdown("#### 📱 Mobile Description (60–80 chars, Brand Lead)")
                            st.code(gen.get("mobile_description", "N/A"), language="text")

                            st.markdown("#### 📝 Commerce Long Description")
                            st.write(gen.get("long_description", "N/A"))

                        with v_col2:
                            st.markdown("#### ⚙️ Structured Product Intelligence")
                            disp_info = {
                                "Canonical Brand": norm.get("brand", "N/A"),
                                "Manufacturer": norm.get("manufacturer", "N/A"),
                                "MPN": norm.get("mpn", "N/A"),
                                "Classification / Classpath": p.get("product", {}).get("category", "Industrial Equipment"),
                                "LOV Normalized Attributes": norm.get("attributes", {})
                            }
                            st.json(disp_info)

                        with st.expander("🔍 Full Provenance & Attribute Lineage", expanded=False):
                            st.json(p.get("traceability", {}))

                    else:
                        # Multi-Product Table View
                        st.markdown(f"#### 📦 Extracted Products Catalog ({len(products_list)} items)")
                        table_data = []
                        for idx, p in enumerate(products_list):
                            norm = p.get("normalized", {})
                            gen = p.get("generated", {})
                            table_data.append({
                                "Item #": idx + 1,
                                "MPN": norm.get("mpn") or p.get("product", {}).get("mpn", "N/A"),
                                "Brand": norm.get("brand", "N/A"),
                                "Invoice Description": gen.get("invoice_description", "N/A"),
                                "Mobile Description": gen.get("mobile_description", "N/A"),
                                "Product Title": gen.get("title", "N/A")
                            })
                        st.dataframe(pd.DataFrame(table_data), width="stretch", height=400)

                    # Export Downloads
                    st.markdown("---")
                    st.markdown("#### 💾 Export Enriched Intelligence")
                    exp_col1, exp_col2, exp_col3 = st.columns(3)

                    with exp_col1:
                        json_str = json.dumps(url_res, indent=2).encode('utf-8')
                        st.download_button(
                            label="📥 Download Full Intelligence (JSON)",
                            data=json_str,
                            file_name="url_enriched_product_intelligence.json",
                            mime="application/json"
                        )

                    with exp_col2:
                        summary_rows = []
                        for p in products_list:
                            summary_rows.append({
                                "MPN": p.get("normalized", {}).get("mpn", ""),
                                "Brand": p.get("normalized", {}).get("brand", ""),
                                "Invoice_Description": p.get("generated", {}).get("invoice_description", ""),
                                "Mobile_Description": p.get("generated", {}).get("mobile_description", ""),
                                "Title": p.get("generated", {}).get("title", ""),
                                "Source_URL": target_url
                            })
                        csv_summary = pd.DataFrame(summary_rows).to_csv(index=False).encode('utf-8')
                        st.download_button(
                            label="📥 Download Summary Dataset (CSV)",
                            data=csv_summary,
                            file_name="url_products_summary.csv",
                            mime="text/csv"
                        )

                    with exp_col3:
                        from delivery_formatter import DeliveryFormatter
                        d_formatter = DeliveryFormatter()
                        raw_pipe_items = [p_rec.to_pipeline_input() if hasattr(p_rec, "to_pipeline_input") else p_rec for p_rec in products_list]
                        processed_items = [p_rec.to_dict() if hasattr(p_rec, "to_dict") else p_rec for p_rec in products_list]
                        df_252 = d_formatter.format_batch(processed_items, raw_pipe_items)
                        csv_252 = df_252.to_csv(index=False).encode('utf-8')
                        st.download_button(
                            label="📦 Download 252-Column Unilog Format (CSV)",
                            data=csv_252,
                            file_name="url_unilog_252_delivery.csv",
                            mime="text/csv"
                        )


# -------------------------------------------------------------------------------------------------
# TAB 4: PDF SPEC SHEET INTELLIGENCE
# -------------------------------------------------------------------------------------------------
with tab4:
    st.markdown("### Technical PDF Spec Sheet & Cut-Sheet Intelligence")
    st.markdown("Upload manufacturer PDF datasheets, dimension diagrams, or product installation guides.")

    uploaded_pdf = st.file_uploader("Upload Technical PDF Spec Sheet:", type=["pdf"])

    if uploaded_pdf is not None:
        temp_pdf_path = os.path.join(base_dir, "data", "sample_products", uploaded_pdf.name)
        with open(temp_pdf_path, "wb") as f:
            f.write(uploaded_pdf.getbuffer())

        with st.spinner("Extracting sections, parameter matrices, and building product intelligence..."):
            pdf_result = pipeline.process_pdf_spec_sheet(temp_pdf_path)

            st.success(f"Extracted intelligence from {pdf_result['source_pdf']} ({pdf_result['page_count']} Pages)")
            
            p_col1, p_col2 = st.columns(2)
            with p_col1:
                st.markdown("#### 📑 Extracted Product Title")
                st.info(pdf_result["product_title"])

                st.markdown("#### 🧾 Invoice Description")
                st.code(pdf_result["invoice_description"])

                st.markdown("#### 📱 Mobile Description")
                st.code(pdf_result["mobile_description"])

            with p_col2:
                st.markdown("#### ⚙️ Extracted Parameter Matrix")
                st.json(pdf_result["attributes"])

            with st.expander("📖 Raw Extracted Document Sections", expanded=False):
                st.json(pdf_result["raw_sections"])


# -------------------------------------------------------------------------------------------------
# TAB 5: RULES & DICTIONARY EXPLORER
# -------------------------------------------------------------------------------------------------
with tab5:
    st.markdown("### Reference Master Rules & Controlled Vocabularies")
    
    subtab1, subtab2, subtab3 = st.tabs(["📏 UOM Standards & Abbreviations", "🔢 64ths Decimal to Fraction Lookup", "🏷️ Canonical Brands Registry"])

    with subtab1:
        st.markdown("#### Approved Units of Measure (89+ Types)")
        uom_path = os.path.join(base_dir, "data", "uom_standards.json")
        if os.path.exists(uom_path):
            with open(uom_path, "r", encoding="utf-8") as f:
                uom_data = json.load(f)
            uom_rows = []
            for k, v in uom_data.get("measurement_types", {}).items():
                uom_rows.append({
                    "Measurement Type": k.replace("_", " ").title(),
                    "Approved Abbreviation": v["approved_unit"],
                    "Canonical Name": v["canonical_uom"],
                    "Synonyms / Variations Standardized": ", ".join(v.get("synonyms", []))
                })
            st.dataframe(pd.DataFrame(uom_rows), width="stretch")

    with subtab2:
        st.markdown("#### Exact Decimal to Inch Fractions Table (1/64 to 63/64)")
        dec_path = os.path.join(base_dir, "data", "decimal_fractions.json")
        if os.path.exists(dec_path):
            with open(dec_path, "r", encoding="utf-8") as f:
                dec_data = json.load(f)
            frac_rows = [{"Fraction": k, "Decimal Equivalent": v} for k, v in dec_data.get("fraction_to_decimal", {}).items()]
            st.dataframe(pd.DataFrame(frac_rows), width="stretch", height=400)

    with subtab3:
        st.markdown("#### Master Brand & Manufacturer Registry (With ® / ™ Legal Casing)")
        brands_path = os.path.join(base_dir, "data", "canonical_brands.json")
        if os.path.exists(brands_path):
            with open(brands_path, "r", encoding="utf-8") as f:
                brand_data = json.load(f)
            b_rows = []
            for b in brand_data.get("brands", []):
                b_rows.append({
                    "Canonical Brand": b["canonical_brand"],
                    "Brand Code": b.get("brand_code", ""),
                    "Manufacturer Legal Name": b["manufacturer_name"],
                    "Mfr Code": b.get("manufacturer_code", ""),
                    "Recognized Aliases / Supplier Codes": ", ".join(b.get("aliases", []))
                })
            st.dataframe(pd.DataFrame(b_rows), width="stretch", height=400)

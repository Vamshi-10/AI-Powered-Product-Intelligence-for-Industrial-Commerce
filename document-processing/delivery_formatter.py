"""
Unilog 252-Column Delivery Format Exporter
Transforms enriched product intelligence records into the exact 252-column commercial delivery format
defined in Unilog-Sample_200_Items-Input-vs-Output.xlsx.
"""

import os
import sys
import json
import re
from typing import Dict, Any, List, Optional
import pandas as pd


# The exact 252 standard delivery columns in order
DELIVERY_COLUMNS = [
    "MFR URL", "Ref URL 1", "Ref URL 2", "Ref URL 3", "Ref URL 4", "Ref URL 5",
    "PART_NUMBER", "Dept", "Class", "Fine", "SKU - MY_PART_NUMBER",
    "Mfg_Part_Num", "Part_Desc", "E1_Brand", "Unilog_Brand", "DIB_Brand", "Part_Manuf",
    "MANUFACTURER_NAME", "BRAND_NAME", "TRADE_NAME", "MANUFACTURER_PART_NUMBER", "ALTERNATE_PART_NUMBER",
    "Classpath", "MOBILE_DESC", "INVOICE_DESC", "SHORT_DESC", "LONG_DESC1", "RETAIL_DESC", "MARKETING_DESCRIPTION",
    "ITEM_FEATURES_1", "ITEM_FEATURES_2", "ITEM_FEATURES_3", "ITEM_FEATURES_4", "ITEM_FEATURES_5",
    "ITEM_FEATURES_6", "ITEM_FEATURES_7", "ITEM_FEATURES_8", "ITEM_FEATURES_9", "ITEM_FEATURES_10",
    "ITEM_FEATURES_11", "ITEM_FEATURES_12", "ITEM_FEATURES_13", "ITEM_FEATURES_14", "ITEM_FEATURES_15",
    "ITEM_FEATURES_16", "ITEM_FEATURES_17", "ITEM_FEATURES_18", "ITEM_FEATURES_19", "ITEM_FEATURES_20",
    "With", "Standard/Approvals", "Prop 65", "Application", "Includes", "Product Name"
]

# Add Attribute Label, Value, UOM triplets from 1 to 50
for i in range(1, 51):
    DELIVERY_COLUMNS.extend([f"ATTRIBUTE_LABEL {i}", f"ATTRIBUTE_VALUE {i}", f"ATTRIBUTE_UOM {i}"])

# Trailing asset, pricing, physical and regulatory fields
DELIVERY_COLUMNS.extend([
    "UPC", "EAN", "GTIN", "UNSPSC", "Warranty", "List Price", "Selling Qty", "Selling UOM",
    "Standard Packaging Information", "LENGTH", "LENGTH_UOM", "HEIGHT", "HEIGHT_UOM",
    "WIDTH", "WIDTH_UOM", "WEIGHT", "WEIGHT_UOM", "VOLUME", "VOLUME_UOM",
    "Product Image", "Alternate Image 1", "Alternate Image 2", "Alternate Image 3", "Alternate Image 4",
    "SDS", "SDS_1", "Warranty Information", "Catalog", "Specification Sheet",
    "Instruction/Installation Manual", "Service Manual", "Owners/User Manual",
    "Line Drawing", "MTR", "RoHS", "Full Engineering Drawing", "Energy Star Guide",
    "Technical Bulletin", "Submittal", "Compatibility Chart", "Size Chart",
    "Product Label/Insert", "Video Link", "Video Link 1", "Country Of Origin",
    "Discontinued", "Actual Image (Yes/No)"
])


class DeliveryFormatter:
    """
    Formats enriched intelligence records into the exact 252-column commercial delivery format.
    """

    def format_record(self, enriched: Dict[str, Any], raw_input: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        raw = raw_input or {}
        mpn = enriched.get("mfg_part_num") or raw.get("mfg_part_num", "")
        brand_info = enriched.get("brand_info", {})
        canon_brand = enriched.get("canonical_brand", "")
        clean_brand_plain = re.sub(r"[®™]", "", canon_brand).strip()
        canon_manuf = enriched.get("canonical_manufacturer", "")
        attrs = enriched.get("attributes", {})

        row: Dict[str, Any] = {col: "" for col in DELIVERY_COLUMNS}

        # Source URLs & IDs
        row["MFR URL"] = raw.get("mfr_url", f"https://www.{clean_brand_plain.lower().replace(' ', '')}.com/product/{mpn}")
        row["PART_NUMBER"] = raw.get("part_number", raw.get("sku", ""))
        row["Dept"] = raw.get("dept", "Industrial Supplies")
        row["Class"] = raw.get("class", "Equipment & Hardware")
        row["Fine"] = raw.get("fine", attrs.get("Item_Type", "Tools & Parts"))
        row["SKU - MY_PART_NUMBER"] = raw.get("sku", "")

        # Raw Input Fields
        row["Mfg_Part_Num"] = raw.get("mfg_part_num", mpn)
        row["Part_Desc"] = raw.get("part_desc", enriched.get("raw_part_desc", ""))
        row["E1_Brand"] = raw.get("e1_brand", "-- Unbranded --")
        row["Unilog_Brand"] = raw.get("unilog_brand", "-- No Unilog Brand --")
        row["DIB_Brand"] = raw.get("dib_brand", "-- No DIB Brand --")
        row["Part_Manuf"] = raw.get("part_manuf", canon_manuf)

        # Canonical Legal Resolution
        row["MANUFACTURER_NAME"] = canon_manuf
        row["BRAND_NAME"] = canon_brand
        row["TRADE_NAME"] = attrs.get("Series", "")
        row["MANUFACTURER_PART_NUMBER"] = mpn
        row["Classpath"] = enriched.get("classpath", "Industrial Supplies > Power & Hand Tools > Accessories")

        # 5-Tier Descriptions
        row["MOBILE_DESC"] = enriched.get("mobile_description", "")
        row["INVOICE_DESC"] = enriched.get("invoice_description", "")
        row["SHORT_DESC"] = enriched.get("product_title", "")
        row["LONG_DESC1"] = enriched.get("long_description", "")
        row["RETAIL_DESC"] = f"{attrs.get('Series', '')} {attrs.get('Item_Type', '')}, {mpn}".strip(", ")
        row["MARKETING_DESCRIPTION"] = enriched.get("long_description", "")

        # Qualifiers
        row["Product Name"] = attrs.get("Item_Type", "Product")
        if "With" in attrs:
            row["With"] = attrs["With"]

        # Structured Attribute Triplets (ATTRIBUTE_LABEL N, ATTRIBUTE_VALUE N, ATTRIBUTE_UOM N)
        attr_idx = 1
        for label, val in attrs.items():
            if attr_idx > 50:
                break
            
            clean_label = label.replace("_", " ")
            val_str = str(val).strip()
            uom_str = ""

            # Check if value ends with a standard UOM (e.g., "120 V", "50-1/4 in", "47 dBA")
            uom_match = re.search(r"^(.+?)\s+([A-Za-z]+|dBA|kW-hr|Grit|T)$", val_str)
            if uom_match and any(c.isdigit() for c in uom_match.group(1)):
                val_clean = uom_match.group(1).strip()
                uom_clean = uom_match.group(2).strip()
                row[f"ATTRIBUTE_LABEL {attr_idx}"] = clean_label
                row[f"ATTRIBUTE_VALUE {attr_idx}"] = val_clean
                row[f"ATTRIBUTE_UOM {attr_idx}"] = uom_clean
            else:
                row[f"ATTRIBUTE_LABEL {attr_idx}"] = clean_label
                row[f"ATTRIBUTE_VALUE {attr_idx}"] = val_str
                row[f"ATTRIBUTE_UOM {attr_idx}"] = ""

            attr_idx += 1

        # Physical Dimensions & Digital Assets
        row["Product Image"] = f"{clean_brand_plain.upper().replace(' ', '_')}_{mpn}.jpg"
        row["Specification Sheet"] = f"{clean_brand_plain.upper().replace(' ', '_')}_{mpn}_Specification_Sheet.pdf"
        row["Actual Image (Yes/No)"] = "Yes"

        return row

    def format_batch(self, enriched_items: List[Dict[str, Any]], raw_items: Optional[List[Dict[str, Any]]] = None) -> pd.DataFrame:
        raw_list = raw_items or [{}] * len(enriched_items)
        rows = [self.format_record(e, r) for e, r in zip(enriched_items, raw_list)]
        return pd.DataFrame(rows, columns=DELIVERY_COLUMNS)

"""
Evaluation Benchmark & Batch Verification for Document Processing
Evaluates pipeline accuracy, character limit compliance, UOM standardization,
and exports commerce-ready datasets to data/output/.
"""

import os
import sys
import json
import time
import pandas as pd
from typing import Dict, Any, List

_current_dir = os.path.dirname(os.path.abspath(__file__))
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)

try:
    from .pipeline import DocumentProcessingPipeline
except ImportError:
    from pipeline import DocumentProcessingPipeline


def run_benchmark():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_csv = os.path.join(base_dir, "data", "sample_products", "sample_raw_items.csv")
    output_dir = os.path.join(base_dir, "data", "output")
    os.makedirs(output_dir, exist_ok=True)

    print("================================================================================")
    print(" INDUSTRIAL COMMERCE PRODUCT INTELLIGENCE - DOCUMENT PROCESSING BENCHMARK")
    print("================================================================================")
    print(f"Loading input catalogue: {input_csv}")

    start_time = time.time()
    pipeline = DocumentProcessingPipeline()
    enriched_items = pipeline.process_catalog_file(input_csv)
    elapsed_time = time.time() - start_time

    total_items = len(enriched_items)
    print(f"Processed {total_items} items in {elapsed_time:.2f} seconds ({total_items / max(0.001, elapsed_time):.1f} items/sec).\n")

    # Metrics calculation
    invoice_length_pass = sum(1 for item in enriched_items if item["validation"]["rule_checks"].get("invoice_char_limit", False))
    invoice_caps_pass = sum(1 for item in enriched_items if item["validation"]["rule_checks"].get("invoice_casing_caps", False))
    mobile_pass = sum(1 for item in enriched_items if item["validation"]["rule_checks"].get("mobile_length_compliance", False))
    uom_pass = sum(1 for item in enriched_items if item["validation"]["rule_checks"].get("uom_spacing_compliance", False))
    brand_pass = sum(1 for item in enriched_items if item["validation"]["rule_checks"].get("brand_resolution", False))
    needs_review_count = sum(1 for item in enriched_items if item.get("needs_human_review", False))
    avg_confidence = sum(item["overall_confidence"] for item in enriched_items) / max(1, total_items)
    total_attrs = sum(len(item.get("attributes", {})) for item in enriched_items)
    avg_attrs = total_attrs / max(1, total_items)

    print("--------------------------------------------------------------------------------")
    print(" RULE COMPLIANCE & QUALITY METRICS REPORT")
    print("--------------------------------------------------------------------------------")
    print(f"Total Products Processed         : {total_items}")
    print(f"Average Pipeline Confidence       : {avg_confidence:.1f}%")
    print(f"Invoice Desc <= 40 Chars Rate     : {invoice_length_pass}/{total_items} ({invoice_length_pass / total_items * 100:.1f}%)")
    print(f"Invoice Desc ALL CAPS Rate        : {invoice_caps_pass}/{total_items} ({invoice_caps_pass / total_items * 100:.1f}%)")
    print(f"Mobile Desc Length Compliance     : {mobile_pass}/{total_items} ({mobile_pass / total_items * 100:.1f}%)")
    print(f"UOM Spacing & Standard Adherence  : {uom_pass}/{total_items} ({uom_pass / total_items * 100:.1f}%)")
    print(f"Brand Resolution & Trademark Pass : {brand_pass}/{total_items} ({brand_pass / total_items * 100:.1f}%)")
    print(f"Average Extracted Attributes/Item : {avg_attrs:.1f}")
    print(f"Items Requiring Human Review      : {needs_review_count} ({needs_review_count / total_items * 100:.1f}%)")
    print("--------------------------------------------------------------------------------\n")

    # Sample Showcase
    print("SAMPLE ENRICHMENT SHOWCASE (3 WORKED EXAMPLES):")
    print("--------------------------------------------------------------------------------")
    for idx, sample in enumerate(enriched_items[:3], 1):
        print(f"ITEM {idx}:")
        print(f"  [RAW INPUT]   : {sample.get('raw_part_desc')}")
        print(f"  [CANON BRAND] : {sample.get('canonical_brand')} (Mfr: {sample.get('canonical_manufacturer')})")
        print(f"  [MPN]         : {sample.get('mfg_part_num')}")
        print(f"  [INVOICE]     : {sample.get('invoice_description')} (Len: {len(sample.get('invoice_description', ''))})")
        print(f"  [MOBILE]      : {sample.get('mobile_description')} (Len: {len(sample.get('mobile_description', ''))})")
        print(f"  [TITLE]       : {sample.get('product_title')}")
        print(f"  [LONG DESC]   : {sample.get('long_description')}")
        print(f"  [ATTRIBUTES]  : {json.dumps(sample.get('attributes', {}))}")
        print(f"  [CONFIDENCE]  : {sample.get('overall_confidence')}% (Review: {sample.get('needs_human_review')})")
        print("--------------------------------------------------------------------------------")

    # Export to files
    out_json = os.path.join(output_dir, "enriched_catalog_output.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(enriched_items, f, indent=2)
    print(f"\n[OK] Exported JSON: {out_json}")

    # Export Exact Unilog 252-Column Delivery Format CSV
    from delivery_formatter import DeliveryFormatter
    formatter = DeliveryFormatter()
    raw_parsed_items = pipeline.catalog_parser.parse_file(input_csv)
    df_252 = formatter.format_batch(enriched_items, raw_parsed_items)
    out_252_csv = os.path.join(output_dir, "unilog_252_delivery_format.csv")
    df_252.to_csv(out_252_csv, index=False)
    print(f"[OK] Exported 252-Col Delivery Format CSV: {out_252_csv} ({df_252.shape[1]} Columns)")

    # Categorize brand exceptions
    brand_not_found = sum(1 for it in enriched_items if it.get("brand_resolution_status") == "BRAND_NOT_FOUND")
    ambiguous_brand = sum(1 for it in enriched_items if it.get("brand_resolution_status") == "AMBIGUOUS_BRAND")
    missing_brand = sum(1 for it in enriched_items if it.get("brand_resolution_status") == "MISSING_BRAND")
    brand_review_breakdown = {
        "Brand not found": brand_not_found,
        "Ambiguous brand": ambiguous_brand,
        "Missing brand": missing_brand
    }

    # Categorize human review reasons
    review_reasons_breakdown: Dict[str, int] = {}
    for it in enriched_items:
        if it.get("needs_human_review"):
            for r in it.get("review_reasons", []):
                review_reasons_breakdown[r] = review_reasons_breakdown.get(r, 0) + 1

    # Standard summary CSV
    df_out = pd.DataFrame(enriched_items)
    out_csv = os.path.join(output_dir, "enriched_catalog_output.csv")
    df_out.to_csv(out_csv, index=False)
    print(f"[OK] Exported Summary CSV : {out_csv}")

    # Export Quality Metrics JSON (quality_metrics.json)
    quality_metrics = {
        "products_processed": total_items,
        "columns": 252,
        "invoice_compliance": round(invoice_length_pass / total_items, 4),
        "mobile_compliance": round(mobile_pass / total_items, 4),
        "uom_compliance": round(uom_pass / total_items, 4),
        "brand_resolution": round(brand_pass / total_items, 4),
        "human_review_rate": round(needs_review_count / total_items, 4),
        "average_confidence": round(avg_confidence / 100.0, 4)
    }
    with open(os.path.join(output_dir, "quality_metrics.json"), "w", encoding="utf-8") as f:
        json.dump(quality_metrics, f, indent=2)
    print(f"[OK] Exported Quality Metrics JSON: {os.path.join(output_dir, 'quality_metrics.json')}")

    # Comprehensive summary metrics
    metrics_summary = {
        "total_items": total_items,
        "processing_time_sec": round(elapsed_time, 2),
        "throughput_items_per_sec": round(total_items / max(0.001, elapsed_time), 1),
        "average_confidence": round(avg_confidence, 2),
        "invoice_length_pass_rate": round(invoice_length_pass / total_items * 100, 2),
        "invoice_caps_pass_rate": round(invoice_caps_pass / total_items * 100, 2),
        "mobile_length_pass_rate": round(mobile_pass / total_items * 100, 2),
        "uom_compliance_rate": round(uom_pass / total_items * 100, 2),
        "brand_resolution_rate": round(brand_pass / total_items * 100, 2),
        "brand_review_count": total_items - brand_pass,
        "brand_review_breakdown": brand_review_breakdown,
        "human_review_count": needs_review_count,
        "human_review_rate": round(needs_review_count / total_items * 100, 2),
        "review_reasons_breakdown": review_reasons_breakdown,
        "traceability_status": "ENABLED",
        "review_reasons_status": "ENABLED",
        "quality_report_status": "EXPORTED"
    }
    with open(os.path.join(output_dir, "benchmark_metrics.json"), "w", encoding="utf-8") as f:
        json.dump(metrics_summary, f, indent=2)

    # Automated Gatekeeper Schema & Quality Validation
    from delivery_validator import DeliverySchemaValidator
    expected_path = os.path.join(base_dir, "data", "sample_products", "Unihack_Expected_Output.csv")
    validator = DeliverySchemaValidator(expected_path)
    is_passed, check_report = validator.validate_file(out_252_csv, metrics_summary)

    # Export validation report JSON
    validation_report = {
        "is_passed": is_passed,
        "checks": check_report,
        "metrics": metrics_summary
    }
    with open(os.path.join(output_dir, "validation_report.json"), "w", encoding="utf-8") as f:
        json.dump(validation_report, f, indent=2)
    print(f"[OK] Exported Validation Report JSON: {os.path.join(output_dir, 'validation_report.json')}")

    validator.print_validation_report(is_passed, check_report, metrics_summary)

    # Run 200-Item Ground Truth Accuracy Evaluation
    from ground_truth_evaluator import GroundTruthEvaluator
    gt_evaluator = GroundTruthEvaluator(input_csv)
    gt_results = gt_evaluator.evaluate_ground_truth(200)
    gt_evaluator.print_ground_truth_report(gt_results)

    if is_passed:
        raise SystemExit(0)
    else:
        raise SystemExit(1)


if __name__ == "__main__":
    run_benchmark()

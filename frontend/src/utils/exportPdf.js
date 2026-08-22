/**
 * ADHARRA — Export Final Intelligence: PDF Report
 *
 * Generates a professional PDF report using the browser's
 * built-in print dialog (window.print) with a styled HTML document.
 * No external PDF library required — 100% frontend-only.
 *
 * Priority for final value:
 *   1. Human Corrected Value (from HITL)
 *   2. Human Approved AI Value (from HITL)
 *   3. Existing validated spec value
 */

import { INITIAL_HITL_QUEUE } from '../services/hitlService';

/**
 * Resolve the HITL queue from localStorage (live state) or seed data.
 */
function resolveHitlQueue() {
  try {
    const stored = localStorage.getItem('adharra_hitl_queue');
    if (stored) return JSON.parse(stored);
  } catch (e) {
    // fall through
  }
  return [...INITIAL_HITL_QUEUE];
}

/**
 * Escape HTML special characters for safe injection into HTML string.
 */
function esc(val) {
  if (val === null || val === undefined) return '—';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build resolved attribute rows with HITL correction applied.
 */
function buildAttributeRows(product, hitlQueue) {
  const rows = [];
  Object.entries(product.specifications || {}).forEach(([key, rawValue]) => {
    const label = key.trim();

    const hitlItem = hitlQueue.find(
      (h) =>
        (h.productId === product.id || h.sku === product.sku) &&
        h.attribute.toLowerCase().includes(label.toLowerCase())
    );

    let finalValue = rawValue;
    let humanReviewStatus = 'Not Reviewed';
    let confidenceScore = product.confidenceScore ?? null;

    if (hitlItem) {
      confidenceScore = hitlItem.confidenceScore ?? confidenceScore;
      if (hitlItem.status === 'Human Corrected' && hitlItem.correctedValue) {
        finalValue = hitlItem.correctedValue;
        humanReviewStatus = 'Human Corrected ✓';
      } else if (hitlItem.status === 'Human Approved') {
        finalValue = hitlItem.aiSuggestedValue || rawValue;
        humanReviewStatus = 'Human Approved ✓';
      } else if (hitlItem.status === 'Human Rejected') {
        humanReviewStatus = 'Human Rejected';
      } else {
        humanReviewStatus = 'Pending Review';
      }
    }

    rows.push({ label, finalValue, humanReviewStatus, confidenceScore });
  });
  return rows;
}

/**
 * Build the HITL review summary rows.
 */
function buildHitlRows(product, hitlQueue) {
  return hitlQueue.filter(
    (h) => h.productId === product.id || h.sku === product.sku
  );
}

/**
 * Build warnings from HITL pending items.
 */
function buildWarnings(hitlEntries) {
  return hitlEntries
    .filter(h => h.status === 'Pending Review')
    .map(h => `Attribute "${h.attribute}" has not yet been reviewed by a human validator.`);
}

/**
 * Open a print window with the styled PDF report.
 * Uses window.open + window.print() for native browser PDF generation.
 * @param {object} product - Product from mockDataService
 * @returns {{ success: boolean, message: string }}
 */
export function exportProductPdf(product) {
  if (!product) {
    return { success: false, message: 'No product data available to export.' };
  }

  try {
    const hitlQueue = resolveHitlQueue();
    const attrRows = buildAttributeRows(product, hitlQueue);
    const hitlRows = buildHitlRows(product, hitlQueue);
    const warnings = buildWarnings(hitlRows);

    const exportedAt = new Date().toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const qualityScore = product.qualityScore ?? 'N/A';
    const overallConfidence = product.confidenceScore ?? 'N/A';
    const completeness = (product.qualityScore ?? 0) >= 90 ? 'High' : (product.qualityScore ?? 0) >= 75 ? 'Moderate' : 'Needs Improvement';
    const accuracy = (product.confidenceScore ?? 0) >= 90 ? 'High' : (product.confidenceScore ?? 0) >= 70 ? 'Moderate' : 'Low';

    const humanReviewStatusGlobal = hitlRows.length > 0
      ? hitlRows.some(h => h.status === 'Human Corrected')
        ? 'Human Corrected'
        : hitlRows.some(h => h.status === 'Human Approved')
          ? 'Human Approved'
          : hitlRows.some(h => h.status === 'Human Rejected')
            ? 'Human Rejected'
            : 'Pending HITL Review'
      : 'No HITL Review Required';

    /* ------------------------------------------------------------------
       Attribute rows HTML
    ------------------------------------------------------------------ */
    const attrRowsHtml = attrRows.map((r) => `
      <tr>
        <td>${esc(r.label)}</td>
        <td><strong>${esc(r.finalValue)}</strong></td>
        <td>${r.confidenceScore !== null ? r.confidenceScore + '%' : '—'}</td>
        <td class="${r.humanReviewStatus.includes('Corrected') ? 'status-corrected' : r.humanReviewStatus.includes('Approved') ? 'status-approved' : r.humanReviewStatus.includes('Rejected') ? 'status-rejected' : 'status-pending'}">${esc(r.humanReviewStatus)}</td>
      </tr>
    `).join('');

    /* ------------------------------------------------------------------
       HITL review detail rows HTML
    ------------------------------------------------------------------ */
    const hitlRowsHtml = hitlRows.length > 0 ? `
      <h2>Human-in-the-Loop (HITL) Review Detail</h2>
      <table>
        <thead>
          <tr>
            <th>Attribute</th>
            <th>Original Value</th>
            <th>AI Suggested</th>
            <th>Final (Human) Value</th>
            <th>Decision</th>
            <th>Reviewed By</th>
          </tr>
        </thead>
        <tbody>
          ${hitlRows.map(h => `
            <tr>
              <td>${esc(h.attribute)}</td>
              <td>${esc(h.originalValue)}</td>
              <td>${esc(h.aiSuggestedValue)}</td>
              <td><strong>${esc(h.correctedValue || h.aiSuggestedValue || h.originalValue)}</strong></td>
              <td class="${h.status === 'Human Corrected' ? 'status-corrected' : h.status === 'Human Approved' ? 'status-approved' : h.status === 'Human Rejected' ? 'status-rejected' : 'status-pending'}">${esc(h.status)}</td>
              <td>${esc(h.reviewedBy || '—')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '';

    /* ------------------------------------------------------------------
       Warnings HTML
    ------------------------------------------------------------------ */
    const warningsHtml = warnings.length > 0 ? `
      <div class="warnings-box">
        <strong>⚠ Validation Warnings</strong>
        <ul>
          ${warnings.map(w => `<li>${esc(w)}</li>`).join('')}
        </ul>
      </div>
    ` : '';

    /* ------------------------------------------------------------------
       AI Insights
    ------------------------------------------------------------------ */
    const insightText = overallConfidence >= 90
      ? 'High confidence extraction — minimal human intervention required.'
      : overallConfidence >= 70
        ? 'Moderate confidence — some attributes queued for human review.'
        : 'Low confidence extraction — human review strongly recommended.';

    /* ------------------------------------------------------------------
       Full HTML document
    ------------------------------------------------------------------ */
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ADHARRA — Final Product Intelligence Report</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #1a1a2e;
      background: #ffffff;
      font-size: 11pt;
      line-height: 1.5;
    }

    /* ---- Cover Header ---- */
    .report-header {
      background: linear-gradient(135deg, #6c3fc5 0%, #9b6dff 60%, #b08bff 100%);
      color: #ffffff;
      padding: 36px 40px 28px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .report-brand {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .report-brand-name {
      font-size: 26pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
    }
    .report-brand-tagline {
      font-size: 9pt;
      font-weight: 500;
      opacity: 0.85;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .report-header-meta {
      text-align: right;
      font-size: 9pt;
      opacity: 0.9;
      line-height: 1.7;
    }
    .report-title-bar {
      background: #3d1d8c;
      color: #e5d9ff;
      padding: 10px 40px;
      font-size: 10pt;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    /* ---- Content ---- */
    .report-body {
      padding: 28px 40px;
    }

    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #3d1d8c;
      margin-top: 28px;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 2px solid #ddd4f7;
    }
    h2:first-child { margin-top: 0; }

    /* ---- Info Grid ---- */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 32px;
      background: #f8f5ff;
      border: 1px solid #e5d9ff;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 8px;
    }
    .info-row {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .info-label {
      font-size: 8pt;
      font-weight: 600;
      color: #7c5abf;
      text-transform: uppercase;
      letter-spacing: 0.7px;
    }
    .info-value {
      font-size: 10.5pt;
      font-weight: 500;
      color: #1a1a2e;
    }

    /* ---- Tables ---- */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
      margin-bottom: 4px;
    }
    thead { background: #ede8fb; }
    th {
      padding: 8px 10px;
      text-align: left;
      font-weight: 700;
      color: #3d1d8c;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #c4b0f0;
    }
    td {
      padding: 7px 10px;
      border-bottom: 1px solid #ede8fb;
      vertical-align: top;
      color: #2d2d44;
    }
    tr:nth-child(even) td { background: #faf8ff; }

    /* ---- Status badges ---- */
    .status-approved  { color: #15803d; font-weight: 600; }
    .status-corrected { color: #7c3aed; font-weight: 600; }
    .status-rejected  { color: #b91c1c; font-weight: 600; }
    .status-pending   { color: #b45309; font-weight: 600; }

    /* ---- Quality Cards ---- */
    .quality-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 8px;
    }
    .quality-card {
      background: #f8f5ff;
      border: 1px solid #e5d9ff;
      border-radius: 8px;
      padding: 12px 14px;
      text-align: center;
    }
    .quality-card-label {
      font-size: 8pt;
      font-weight: 600;
      color: #7c5abf;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      display: block;
      margin-bottom: 4px;
    }
    .quality-card-value {
      font-size: 15pt;
      font-weight: 800;
      color: #3d1d8c;
    }

    /* ---- Warnings ---- */
    .warnings-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4px solid #f59e0b;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 12px 0;
      font-size: 9.5pt;
    }
    .warnings-box ul {
      margin-top: 6px;
      padding-left: 18px;
    }
    .warnings-box li { margin-bottom: 3px; color: #92400e; }

    /* ---- Insights ---- */
    .insights-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 4px solid #22c55e;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 8px 0;
      font-size: 9.5pt;
    }
    .insights-box ul {
      margin-top: 6px;
      padding-left: 18px;
    }
    .insights-box li { margin-bottom: 3px; color: #166534; }

    /* ---- Footer ---- */
    .report-footer {
      margin-top: 36px;
      padding-top: 14px;
      border-top: 2px solid #e5d9ff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #7c5abf;
    }

    /* ---- Print settings ---- */
    @page {
      size: A4;
      margin: 0;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .report-header, .report-title-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-break { page-break-inside: avoid; }
      h2 { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <!-- ============================================================
       COVER HEADER
  ============================================================ -->
  <div class="report-header">
    <div class="report-brand">
      <div class="report-brand-name">ADHARRA</div>
      <div class="report-brand-tagline">AI-Powered Product Intelligence Platform</div>
    </div>
    <div class="report-header-meta">
      <div><strong>Final Intelligence Report</strong></div>
      <div>Generated: ${esc(exportedAt)}</div>
      <div>File: adharra-product-${esc(product.id)}-report.pdf</div>
    </div>
  </div>
  <div class="report-title-bar">Final Product Intelligence Report</div>

  <!-- ============================================================
       BODY
  ============================================================ -->
  <div class="report-body">

    <!-- Product Information -->
    <h2>Product Information</h2>
    <div class="info-grid no-break">
      <div class="info-row">
        <span class="info-label">Product Name</span>
        <span class="info-value">${esc(product.name)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Product ID</span>
        <span class="info-value">${esc(product.id)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Manufacturer</span>
        <span class="info-value">${esc(product.manufacturer)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Category</span>
        <span class="info-value">${esc(product.category)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">SKU / Model</span>
        <span class="info-value">${esc(product.sku)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Last Updated</span>
        <span class="info-value">${esc(product.lastUpdated || '—')}</span>
      </div>
    </div>

    <!-- Validated Attributes -->
    <h2>Validated Attributes</h2>
    <table class="no-break">
      <thead>
        <tr>
          <th>Attribute</th>
          <th>Final Value</th>
          <th>Confidence</th>
          <th>Review Status</th>
        </tr>
      </thead>
      <tbody>
        ${attrRowsHtml}
      </tbody>
    </table>

    <!-- Data Quality -->
    <h2>Data Quality</h2>
    <div class="quality-grid no-break">
      <div class="quality-card">
        <span class="quality-card-label">Overall Quality</span>
        <span class="quality-card-value">${qualityScore}%</span>
      </div>
      <div class="quality-card">
        <span class="quality-card-label">Completeness</span>
        <span class="quality-card-value">${esc(completeness)}</span>
      </div>
      <div class="quality-card">
        <span class="quality-card-label">Accuracy</span>
        <span class="quality-card-value">${esc(accuracy)}</span>
      </div>
      <div class="quality-card">
        <span class="quality-card-label">Overall Confidence</span>
        <span class="quality-card-value">${overallConfidence}%</span>
      </div>
    </div>

    <!-- Human Validation -->
    <h2>Human Validation</h2>
    <div class="info-grid no-break">
      <div class="info-row">
        <span class="info-label">Validation Status</span>
        <span class="info-value">${esc(product.status)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Human Review Status</span>
        <span class="info-value">${esc(humanReviewStatusGlobal)}</span>
      </div>
    </div>

    <!-- HITL detail table (if any) -->
    ${hitlRowsHtml}

    <!-- Sources -->
    <h2>Sources &amp; Traceability</h2>
    <table class="no-break">
      <thead>
        <tr>
          <th>Source</th>
          <th>Reference</th>
          <th>Evidence</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Manufacturer Datasheet (AI Extracted)</td>
          <td>${esc(product.sku)} — Specification Sheet</td>
          <td>Parsed via ADHARRA Neural Extraction Pipeline</td>
        </tr>
        ${hitlRows.length > 0 ? `
        <tr>
          <td>HITL Human Review</td>
          <td>Human Reviewer Validation</td>
          <td>Human-corrected or approved attributes</td>
        </tr>` : ''}
      </tbody>
    </table>

    <!-- Warnings -->
    ${warningsHtml}

    <!-- AI Insights -->
    <h2>AI Insights &amp; Recommendations</h2>
    <div class="insights-box no-break">
      <strong>Key Findings</strong>
      <ul>
        <li>${esc(attrRows.length)} attributes extracted and validated for ${esc(product.name)}.</li>
        <li>${esc(insightText)}</li>
      </ul>
    </div>
    <div class="insights-box no-break" style="background:#eff6ff; border-color:#bfdbfe; border-left-color:#3b82f6;">
      <strong style="color:#1e40af;">Recommendations</strong>
      <ul style="color:#1e3a8a;">
        <li>Verify all HITL-corrected values with original datasheets before publication.</li>
        <li>Export JSON to your PIM or ERP system for final catalog ingestion.</li>
        <li>Re-run AI pipeline on updated attributes to refresh confidence scores.</li>
      </ul>
    </div>

    <!-- Footer -->
    <div class="report-footer">
      <span>ADHARRA — AI-Powered Product Intelligence for Industrial Commerce</span>
      <span>Confidential — For Internal Use Only</span>
    </div>

  </div>

  <script>
    // Auto-trigger print dialog after fonts load
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 600);
    });
  </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      return {
        success: false,
        message: 'PDF export blocked by browser. Please allow pop-ups for this site and try again.',
      };
    }

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Set suggested filename via document.title (used by some browsers as PDF filename)
    printWindow.document.title = `adharra-product-${product.id}-report`;

    return { success: true, message: 'PDF report generated successfully.' };
  } catch (err) {
    console.error('PDF export error:', err);
    return { success: false, message: 'PDF report generation failed. Please try again.' };
  }
}

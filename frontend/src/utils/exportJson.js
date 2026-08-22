/**
 * ADHARRA — Export Final Intelligence: JSON
 *
 * Exports structured product intelligence as a .json file.
 * Merges HITL-corrected values as the authoritative final value.
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
 * Build attribute array with HITL correction applied.
 * @param {object} product - Product from mockDataService
 * @param {Array}  hitlQueue - Current HITL review queue
 */
function buildAttributes(product, hitlQueue) {
  const attrs = [];

  Object.entries(product.specifications || {}).forEach(([key, rawValue]) => {
    const label = key.trim();

    // Find a HITL item for this product+attribute (match by productId or sku)
    const hitlItem = hitlQueue.find(
      (h) =>
        (h.productId === product.id || h.sku === product.sku) &&
        h.attribute.toLowerCase().includes(label.toLowerCase())
    );

    let finalValue = rawValue;
    let humanReviewStatus = 'Not Reviewed';
    let aiSuggestedValue = null;
    let confidenceScore = product.confidenceScore ?? null;

    if (hitlItem) {
      aiSuggestedValue = hitlItem.aiSuggestedValue;
      confidenceScore = hitlItem.confidenceScore ?? confidenceScore;

      if (hitlItem.status === 'Human Corrected' && hitlItem.correctedValue) {
        finalValue = hitlItem.correctedValue;
        humanReviewStatus = 'Human Corrected';
      } else if (hitlItem.status === 'Human Approved') {
        finalValue = hitlItem.aiSuggestedValue || rawValue;
        humanReviewStatus = 'Human Approved';
      } else if (hitlItem.status === 'Human Rejected') {
        humanReviewStatus = 'Human Rejected';
      } else {
        humanReviewStatus = 'Pending Review';
      }
    }

    attrs.push({
      attribute: label,
      finalValue,
      aiSuggestedValue,
      confidenceScore,
      humanReviewStatus,
      source: hitlItem ? 'HITL Review' : 'AI Extracted',
    });
  });

  return attrs;
}

/**
 * Export product intelligence as a formatted JSON file.
 * @param {object} product - Product from mockDataService (INITIAL_PRODUCTS entry)
 * @returns {{ success: boolean, message: string }}
 */
export function exportProductJson(product) {
  if (!product) {
    return { success: false, message: 'No product data available to export.' };
  }

  const hitlQueue = resolveHitlQueue();
  const attributes = buildAttributes(product, hitlQueue);

  const overallConfidence = product.confidenceScore ?? null;
  const qualityScore = product.qualityScore ?? null;

  // Find product-level HITL entries for traceability
  const hitlEntries = hitlQueue.filter(
    (h) => h.productId === product.id || h.sku === product.sku
  );
  const humanReviewStatus = hitlEntries.length > 0
    ? hitlEntries.some(h => h.status === 'Human Corrected')
      ? 'Human Corrected'
      : hitlEntries.some(h => h.status === 'Human Approved')
        ? 'Human Approved'
        : hitlEntries.some(h => h.status === 'Human Rejected')
          ? 'Human Rejected'
          : 'Pending HITL Review'
    : 'No HITL Review Required';

  const payload = {
    exportMeta: {
      tool: 'ADHARRA Product Intelligence Platform',
      exportedAt: new Date().toISOString(),
      exportFormat: 'JSON',
      schemaVersion: '1.0',
    },
    product: {
      productId: product.id,
      productName: product.name,
      manufacturer: product.manufacturer,
      category: product.category,
      sku: product.sku,
      description: `${product.name} — ${product.category} product by ${product.manufacturer}.`,
    },
    intelligence: {
      validatedAttributes: attributes,
      overallConfidence: overallConfidence ? `${overallConfidence}%` : 'N/A',
    },
    dataQuality: {
      dataQualityScore: qualityScore ? `${qualityScore}%` : 'N/A',
      completeness: qualityScore >= 90 ? 'High' : qualityScore >= 75 ? 'Moderate' : 'Needs Improvement',
      accuracy: overallConfidence >= 90 ? 'High' : overallConfidence >= 70 ? 'Moderate' : 'Low',
      consistency: 'Verified',
      validity: product.status === 'Validated' ? 'Validated' : product.status,
    },
    validation: {
      validationStatus: product.status,
      humanReviewStatus,
      lastUpdated: product.lastUpdated || new Date().toISOString().split('T')[0],
      reviewedItems: hitlEntries.map(h => ({
        attribute: h.attribute,
        originalValue: h.originalValue,
        aiSuggestedValue: h.aiSuggestedValue,
        finalValue: h.correctedValue || h.aiSuggestedValue,
        status: h.status,
        reviewedAt: h.reviewedAt,
        reviewedBy: h.reviewedBy,
        rejectionReason: h.rejectionReason || null,
      })),
    },
    sources: [
      {
        source: 'Manufacturer Datasheet (AI Extracted)',
        reference: `${product.sku} — Specification Sheet`,
        evidence: 'Parsed via ADHARRA Neural Extraction Pipeline',
      },
      ...(hitlEntries.length > 0
        ? [{ source: 'HITL Human Review', reference: 'Human Reviewer Validation', evidence: 'Human-corrected or approved attributes' }]
        : []),
    ],
    aiInsights: {
      findings: [
        `${attributes.length} attributes extracted and validated for ${product.name}.`,
        overallConfidence >= 90
          ? 'High confidence extraction — minimal human intervention required.'
          : overallConfidence >= 70
            ? 'Moderate confidence — some attributes queued for human review.'
            : 'Low confidence extraction — human review strongly recommended.',
      ],
      warnings: hitlEntries
        .filter(h => h.status === 'Pending Review')
        .map(h => `Attribute "${h.attribute}" still pending human review.`),
      recommendations: [
        'Verify all HITL-corrected values with original datasheets before publication.',
        'Export JSON to your PIM or ERP system for final catalog ingestion.',
      ],
    },
  };

  try {
    const jsonString = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `adharra-product-${product.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true, message: 'JSON exported successfully.' };
  } catch (err) {
    console.error('JSON export error:', err);
    return { success: false, message: 'JSON export failed. Please try again.' };
  }
}

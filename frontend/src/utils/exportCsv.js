/**
 * ADHARRA — Export Final Intelligence: CSV
 *
 * Exports product intelligence as a .csv file with one row per attribute.
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
 * Escape a value for safe CSV inclusion.
 * Wraps in quotes if value contains commas, quotes, or newlines.
 * @param {*} val
 */
function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Export product intelligence as a CSV file (one row per attribute).
 * @param {object} product - Product from mockDataService (INITIAL_PRODUCTS entry)
 * @returns {{ success: boolean, message: string }}
 */
export function exportProductCsv(product) {
  if (!product) {
    return { success: false, message: 'No product data available to export.' };
  }

  const hitlQueue = resolveHitlQueue();

  // Header row
  const headers = [
    'Product ID',
    'Product Name',
    'Manufacturer',
    'Category',
    'SKU / Model',
    'Attribute',
    'Final Value',
    'AI Suggested Value',
    'Confidence Score',
    'Validation Status',
    'Human Review Status',
    'Source',
    'Last Updated',
  ];

  const rows = [];

  Object.entries(product.specifications || {}).forEach(([key, rawValue]) => {
    const label = key.trim();

    // Find HITL match
    const hitlItem = hitlQueue.find(
      (h) =>
        (h.productId === product.id || h.sku === product.sku) &&
        h.attribute.toLowerCase().includes(label.toLowerCase())
    );

    let finalValue = rawValue;
    let aiSuggestedValue = '';
    let confidenceScore = product.confidenceScore ?? '';
    let humanReviewStatus = 'Not Reviewed';
    let source = 'AI Extracted';

    if (hitlItem) {
      aiSuggestedValue = hitlItem.aiSuggestedValue || '';
      confidenceScore = hitlItem.confidenceScore ?? confidenceScore;

      if (hitlItem.status === 'Human Corrected' && hitlItem.correctedValue) {
        finalValue = hitlItem.correctedValue;
        humanReviewStatus = 'Human Corrected';
        source = 'HITL Human Correction';
      } else if (hitlItem.status === 'Human Approved') {
        finalValue = hitlItem.aiSuggestedValue || rawValue;
        humanReviewStatus = 'Human Approved';
        source = 'HITL Human Approved';
      } else if (hitlItem.status === 'Human Rejected') {
        humanReviewStatus = 'Human Rejected';
        source = 'HITL Review';
      } else {
        humanReviewStatus = 'Pending Review';
        source = 'HITL Queue';
      }
    }

    rows.push([
      product.id,
      product.name,
      product.manufacturer,
      product.category,
      product.sku,
      label,
      finalValue,
      aiSuggestedValue,
      confidenceScore ? `${confidenceScore}%` : '',
      product.status,
      humanReviewStatus,
      source,
      product.lastUpdated || '',
    ]);
  });

  try {
    const csvLines = [
      headers.map(csvEscape).join(','),
      ...rows.map((row) => row.map(csvEscape).join(',')),
    ];

    const csvString = csvLines.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `adharra-product-${product.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return { success: true, message: 'CSV exported successfully.' };
  } catch (err) {
    console.error('CSV export error:', err);
    return { success: false, message: 'CSV export failed. Please try again.' };
  }
}

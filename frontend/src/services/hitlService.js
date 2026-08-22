/**
 * ADHARRA — Human-in-the-Loop (HITL) Service
 * 
 * Manages HITL review queue state, confidence evaluation data,
 * and interfaces with the backend validation/HITL APIs.
 */

// Initial seed review queue representing low-confidence or flag-triggered AI product extractions
export const INITIAL_HITL_QUEUE = [
  {
    id: 'hitl-001',
    productId: 'prod-003',
    productName: 'Emerson Rosemount 3051S Scalable Coplanar Pressure Transmitter',
    sku: '3051S-2-C-G-4-A-2-A-1-A',
    category: 'Instrumentation & Sensors',
    attribute: 'Pressure Range / Span',
    originalValue: '-100 to 25 bar (raw spec sheet)',
    aiExtractedValue: '-100 to 25 bar',
    aiSuggestedValue: '-0.1 to 2.5 MPa',
    aiEnrichedValue: '-0.1 to 2.5 MPa (ISO Standardized)',
    confidenceScore: 58,
    reason: 'Low Confidence',
    requiresHumanReview: true,
    status: 'Pending Review',
    correctedValue: null,
    rejectionReason: null,
    reviewedAt: null,
    reviewedBy: null
  },
  {
    id: 'hitl-002',
    productId: 'prod-004',
    productName: 'KSB Etanorm End-Suction Volute Casing Water Pump',
    sku: 'ETA-100-065-200-GG',
    category: 'Pumps & Fluid Handling',
    attribute: 'Impeller Material Grade',
    originalValue: 'Bronze CC480K / G-CuSn10',
    aiExtractedValue: 'Bronze CC480K',
    aiSuggestedValue: 'CuSn10-C (EN 1982:2017)',
    aiEnrichedValue: 'Cast Tin Bronze CuSn10-C (EN 1982)',
    confidenceScore: 64,
    reason: 'Conflicting Data',
    requiresHumanReview: true,
    status: 'Pending Review',
    correctedValue: null,
    rejectionReason: null,
    reviewedAt: null,
    reviewedBy: null
  },
  {
    id: 'hitl-003',
    productId: 'prod-002',
    productName: 'Siemens SIMOTICS GP 1LE1 Cast Iron 3-Phase Induction Motor',
    sku: '1LE1001-1DB43-4AA4',
    category: 'Motors & Drives',
    attribute: 'Hazardous Area Certification',
    originalValue: 'Not specified in manufacturer cutsheet',
    aiExtractedValue: 'None',
    aiSuggestedValue: 'IECEx / ATEX Zone 22 Non-Sparking',
    aiEnrichedValue: 'ATEX II 3D Ex tc IIIC T120°C Dc',
    confidenceScore: 48,
    reason: 'Missing Attribute',
    requiresHumanReview: true,
    status: 'Pending Review',
    correctedValue: null,
    rejectionReason: null,
    reviewedAt: null,
    reviewedBy: null
  },
  {
    id: 'hitl-004',
    productId: 'prod-001',
    productName: 'Grundfos CR 15-4 Vertical Multistage Centrifugal Pump',
    sku: 'CR-15-04-A-A-E-HQQE',
    category: 'Pumps & Fluid Handling',
    attribute: 'Shaft Seal Code & Elastomer',
    originalValue: 'HQQE (Silicon Carbide/EPDM)',
    aiExtractedValue: 'HQQE',
    aiSuggestedValue: 'SiC/SiC/EPDM Cartridge Seal',
    aiEnrichedValue: 'Grundfos Type HQQE Cartridge Seal',
    confidenceScore: 71,
    reason: 'Human Review Required',
    requiresHumanReview: true,
    status: 'Pending Review',
    correctedValue: null,
    rejectionReason: null,
    reviewedAt: null,
    reviewedBy: null
  },
  {
    id: 'hitl-005',
    productId: 'prod-005',
    productName: 'Schneider Altivar Process ATV630 Variable Speed Drive 18.5kW',
    sku: 'ATV630D18N4',
    category: 'Industrial Automation',
    attribute: 'Harmonic Mitigation Protocol',
    originalValue: 'THDi <= 48% with integrated DC choke',
    aiExtractedValue: 'THDi 48%',
    aiSuggestedValue: 'IEEE 519 Compliant (THDi < 5%)',
    aiEnrichedValue: 'Harmonic Distortion Mitigation < 48% (Standard Choke)',
    confidenceScore: 52,
    reason: 'Validation Failed',
    requiresHumanReview: true,
    status: 'Pending Review',
    correctedValue: null,
    rejectionReason: null,
    reviewedAt: null,
    reviewedBy: null
  }
];

import { productService } from './productService';

const ATTRIBUTE_TO_SPEC_KEY = {
  'Pressure Range / Span': 'pressureRange',
  'Impeller Material Grade': 'impellerMaterial',
  'Hazardous Area Certification': 'hazardousApproval',
  'Shaft Seal Code & Elastomer': 'shaftSeal',
  'Harmonic Mitigation Protocol': 'harmonicMitigation'
};

class HitlService {
  constructor() {
    // Check localStorage for persisted session reviews, otherwise use seed
    const stored = localStorage.getItem('adharra_hitl_queue');
    if (stored) {
      try {
        this.queue = JSON.parse(stored);
      } catch (e) {
        this.queue = [...INITIAL_HITL_QUEUE];
      }
    } else {
      this.queue = [...INITIAL_HITL_QUEUE];
    }
  }

  save() {
    try {
      localStorage.setItem('adharra_hitl_queue', JSON.stringify(this.queue));
    } catch (e) {
      console.warn('Could not persist HITL queue to localStorage', e);
    }
  }

  _appendAuditLog(sku, productName, attribute, action, oldValue, newValue, status, reviewer) {
    let logs = [];
    const stored = localStorage.getItem('adharra_audit_log');
    if (stored) {
      try {
        logs = JSON.parse(stored);
      } catch (e) {}
    }
    const newEntry = {
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      sku: sku || '',
      productName: productName || '',
      attribute: attribute || '-',
      action: action || '',
      oldValue: oldValue || '-',
      newValue: newValue || '-',
      reviewer: reviewer || 'Authenticated Reviewer',
      status: status || ''
    };
    logs.unshift(newEntry);
    localStorage.setItem('adharra_audit_log', JSON.stringify(logs));
  }

  _updateCatalogProduct(productId, attribute, status, value = null) {
    const prods = productService.getProducts();
    const foundProd = prods.find(p => p.id === productId || p.sku === productId);
    if (foundProd) {
      const nextSpecs = { ...foundProd.specifications };
      if (value !== null) {
        const specKey = ATTRIBUTE_TO_SPEC_KEY[attribute] || attribute;
        nextSpecs[specKey] = value;
      }
      productService.updateProduct(foundProd.id, {
        status: status,
        specifications: nextSpecs
      });
    }
  }

  /**
   * Fetch all review items from HITL queue
   */
  async getQueue() {
    // In production: return await fetch('/api/validation/hitl/queue').then(r => r.json());
    return [...this.queue];
  }

  /**
   * Calculate summary metric counts
   */
  getStats() {
    const pending = this.queue.filter(i => i.status === 'Pending Review').length;
    const lowConfidence = this.queue.filter(i => i.confidenceScore < 70 && i.status === 'Pending Review').length;
    const approved = this.queue.filter(i => i.status === 'Human Approved' || i.status === 'Human Corrected').length;
    const rejected = this.queue.filter(i => i.status === 'Human Rejected').length;

    return {
      pending,
      lowConfidence,
      approved,
      rejected,
      total: this.queue.length
    };
  }

  /**
   * Approve AI suggested value
   * @param {string} id - Review item ID
   * @param {object} user - Authenticated user details
   */
  async approveItem(id, user = null) {
    const item = this.queue.find(i => i.id === id);
    const reviewerName = user?.name || user?.email || 'Authenticated Reviewer';

    this.queue = this.queue.map(i => {
      if (i.id === id) {
        return {
          ...i,
          status: 'Human Approved',
          reviewedAt: new Date().toISOString(),
          reviewedBy: reviewerName
        };
      }
      return i;
    });

    this.save();

    // Sync to main products catalog
    if (item) {
      this._updateCatalogProduct(item.productId, item.attribute, 'Validated', item.aiSuggestedValue);
      this._appendAuditLog(item.sku, item.productName, item.attribute, 'Human Approve (HITL)', item.originalValue, item.aiSuggestedValue, 'Human Approved', reviewerName);
    }

    return this.queue.find(i => i.id === id);
  }

  /**
   * Correct attribute value with human input and approve
   * @param {string} id - Review item ID
   * @param {string} correctedValue - Human supplied corrected value
   * @param {object} user - Authenticated user details
   */
  async correctItem(id, correctedValue, user = null) {
    const item = this.queue.find(i => i.id === id);
    const reviewerName = user?.name || user?.email || 'Authenticated Reviewer';

    this.queue = this.queue.map(i => {
      if (i.id === id) {
        return {
          ...i,
          status: 'Human Corrected',
          correctedValue: correctedValue,
          reviewedAt: new Date().toISOString(),
          reviewedBy: reviewerName
        };
      }
      return i;
    });

    this.save();

    // Sync to main products catalog
    if (item) {
      this._updateCatalogProduct(item.productId, item.attribute, 'Validated', correctedValue);
      this._appendAuditLog(item.sku, item.productName, item.attribute, 'Human Correct (HITL)', item.originalValue, correctedValue, 'Human Corrected', reviewerName);
    }

    return this.queue.find(i => i.id === id);
  }

  /**
   * Reject AI suggestion with reason
   * @param {string} id - Review item ID
   * @param {string} rejectionReason - Rejection explanation
   * @param {object} user - Authenticated user details
   */
  async rejectItem(id, rejectionReason, user = null) {
    const item = this.queue.find(i => i.id === id);
    const reviewerName = user?.name || user?.email || 'Authenticated Reviewer';

    this.queue = this.queue.map(i => {
      if (i.id === id) {
        return {
          ...i,
          status: 'Human Rejected',
          rejectionReason: rejectionReason,
          reviewedAt: new Date().toISOString(),
          reviewedBy: reviewerName
        };
      }
      return i;
    });

    this.save();

    // Sync to main products catalog
    if (item) {
      this._updateCatalogProduct(item.productId, item.attribute, 'Needs Revision');
      this._appendAuditLog(item.sku, item.productName, item.attribute, 'Human Reject (HITL)', item.aiSuggestedValue, 'Rejected: ' + rejectionReason, 'Human Rejected', reviewerName);
    }

    return this.queue.find(i => i.id === id);
  }

  /**
   * Clear all items to test empty state
   */
  clearQueue() {
    this.queue = [];
    this.save();
  }

  /**
   * Reset to default seed items
   */
  resetQueue() {
    this.queue = [...INITIAL_HITL_QUEUE];
    this.save();
  }

  /**
   * Register a new validation rule failure in the HITL queue
   */
  registerValidationFailure(productId, attribute, originalValue, extractedValue, enrichedValue, reason) {
    const exists = this.queue.some(i => 
      i.productId === productId && 
      i.attribute === attribute && 
      i.status === 'Pending Review'
    );
    if (!exists) {
      const product = productService.getProducts().find(p => p.id === productId);
      const newItem = {
        id: `hitl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        productId,
        productName: product?.name || 'Product Record',
        sku: product?.sku || '',
        category: product?.category || 'Instrumentation & Sensors',
        attribute,
        originalValue: originalValue || extractedValue || '—',
        aiExtractedValue: extractedValue || '—',
        aiSuggestedValue: enrichedValue || '—',
        aiEnrichedValue: enrichedValue || '—',
        confidenceScore: 60,
        reason: `Validation Failed: ${reason}`,
        requiresHumanReview: true,
        status: 'Pending Review',
        correctedValue: null,
        rejectionReason: null,
        reviewedAt: null,
        reviewedBy: null
      };
      this.queue.push(newItem);
      this.save();
      window.dispatchEvent(new CustomEvent('adharra_hitl_updated'));
    }
  }
}

export const hitlService = new HitlService();

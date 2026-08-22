import { INITIAL_PRODUCTS } from './mockDataService';

class ProductService {
  constructor() {
    this.storageKey = 'adharra_products';
    // Initialize from localStorage or seed once
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        this.products = JSON.parse(stored);
      } catch (e) {
        this.products = [...INITIAL_PRODUCTS];
        this.save();
      }
    } else {
      this.products = [...INITIAL_PRODUCTS];
      this.save();
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.products));
      // Notify components about the updates
      window.dispatchEvent(new CustomEvent('adharra_products_updated'));
    } catch (e) {
      console.error('Failed to save products to localStorage', e);
    }
  }

  getProducts() {
    // Reload from storage to ensure we have the latest updates across tabs/layouts
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      try {
        this.products = JSON.parse(stored);
      } catch (e) {}
    }
    return this.products;
  }

  /**
   * Add a single product or update if SKU already exists
   * @param {Object} product 
   */
  addProduct(product) {
    const existingIndex = this.products.findIndex(p => 
      (product.sku && p.sku.toLowerCase() === product.sku.toLowerCase()) || 
      p.id === product.id
    );

    const src = product.source || { fileName: 'Manual Entry', fileType: 'manual' };
    const srcId = product.sourceId || `SRC-${Math.floor(1000 + Math.random() * 9000)}`;

    const normalized = {
      id: product.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sku: product.sku || `SKU-${Math.floor(100000 + Math.random() * 900000)}`,
      name: product.name || 'Unnamed Product',
      category: product.category || 'Instrumentation & Sensors',
      manufacturer: product.manufacturer || 'Unknown Manufacturer',
      status: product.status || 'In Processing',
      lastUpdated: new Date().toISOString().split('T')[0],
      qualityScore: product.qualityScore || 50,
      confidenceScore: product.confidenceScore || 50,
      specifications: product.specifications || {},
      sources: product.sources || [{ id: srcId, type: src.fileType, name: src.fileName }],
      evidence: product.evidence || {}
    };

    // If no evidence is provided, map each spec value to the single source
    if (Object.keys(normalized.evidence).length === 0) {
      Object.keys(normalized.specifications).forEach(attr => {
        normalized.evidence[attr] = [{ sourceId: srcId, value: normalized.specifications[attr] }];
      });
    }

    if (existingIndex > -1) {
      const existing = this.products[existingIndex];
      
      // Merge sources
      const mergedSources = [...(existing.sources || [])];
      (normalized.sources || []).forEach(newSrc => {
        if (!mergedSources.some(s => s.id === newSrc.id || s.name.toLowerCase() === newSrc.name.toLowerCase())) {
          mergedSources.push(newSrc);
        }
      });
      
      // Merge evidence
      const mergedEvidence = { ...(existing.evidence || {}) };
      
      // Merge incoming evidence
      Object.keys(normalized.evidence).forEach(attr => {
        if (!mergedEvidence[attr]) mergedEvidence[attr] = [];
        normalized.evidence[attr].forEach(ev => {
          if (!mergedEvidence[attr].some(e => e.sourceId === ev.sourceId)) {
            mergedEvidence[attr].push(ev);
          }
        });
      });

      // Merge incoming specs
      Object.keys(normalized.specifications).forEach(attr => {
        if (!mergedEvidence[attr]) mergedEvidence[attr] = [];
        // If there's no evidence from the current srcId, add it
        const hasCurrentSrc = mergedEvidence[attr].some(e => e.sourceId === srcId);
        if (!hasCurrentSrc && src.fileName !== 'Manual Entry') {
          mergedEvidence[attr].push({ sourceId: srcId, value: normalized.specifications[attr] });
        }
      });

      // Update existing record
      this.products[existingIndex] = {
        ...existing,
        ...normalized,
        id: existing.id,
        sources: mergedSources,
        evidence: mergedEvidence,
        // Calculate new combined specifications values dynamically elsewhere or keep normalized
        specifications: { ...existing.specifications, ...normalized.specifications }
      };
    } else {
      // Add new record
      this.products.push(normalized);
    }
    
    this.save();
    return this.products[existingIndex > -1 ? existingIndex : this.products.length - 1];
  }

  /**
   * Add multiple products
   * @param {Array} list 
   */
  addProducts(list) {
    const added = list.map(p => this.addProduct(p));
    this.save();
    return added;
  }

  /**
   * Update fields for a product
   * @param {string} id 
   * @param {Object} fields 
   */
  updateProduct(id, fields) {
    const index = this.products.findIndex(p => p.id === id);
    if (index > -1) {
      this.products[index] = {
        ...this.products[index],
        ...fields,
        lastUpdated: new Date().toISOString().split('T')[0]
      };
      this.save();
      return this.products[index];
    }
    return null;
  }

  /**
   * Reset to initial seed products
   */
  resetProducts() {
    this.products = [...INITIAL_PRODUCTS];
    this.save();
  }
}

export const productService = new ProductService();

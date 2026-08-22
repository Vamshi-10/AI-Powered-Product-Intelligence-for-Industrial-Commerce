import { productService } from './productService';

/* ─── URL validator ─────────────────────────────────────────────────────── */
export const validateUrl = (url) => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

/* ─── Attribute name normalizer ─────────────────────────────────────────── */
const ATTRIBUTE_NORM_MAP = {
  'ram': 'RAM',
  'memory': 'RAM',
  'memory (ram)': 'RAM',
  'rated speed': 'Speed',
  'speed': 'Speed',
  'rated speed (rpm)': 'Speed',
  'voltage': 'Voltage',
  'rated voltage': 'Voltage',
  'supply voltage': 'Voltage',
  'motor power': 'Power Rating',
  'power rating': 'Power Rating',
  'rated power': 'Power Rating',
  'maximum pressure': 'Max Pressure',
  'max pressure': 'Max Pressure',
  'operating pressure': 'Max Pressure',
  'protection class': 'Protection Rating',
  'protection rating': 'Protection Rating',
  'ip rating': 'Protection Rating',
  'material': 'Material',
  'body material': 'Material',
  'construction material': 'Material',
  'display size': 'Display',
  'display': 'Display',
  'screen size': 'Display',
};

export const normalizeAttributeName = (name) => {
  if (!name) return '';
  const clean = name.trim().toLowerCase();
  return ATTRIBUTE_NORM_MAP[clean] || name.trim();
};

/* ─── Normalized product model ──────────────────────────────────────────── */
/**
 * All source types produce the same normalized shape before comparison:
 * {
 *   id, name, sku, category, manufacturer, price,
 *   specifications: { [attr]: value },
 *   source: { type: 'catalog'|'file'|'url'|'manual', label: string }
 * }
 */

/* ─── CSV / JSON / XLSX file parsers ────────────────────────────────────── */
/**
 * Parse CSV text → { specifications: {...} }
 * Expected column order: Attribute, Value  (or any 2-column CSV)
 */
function parseCsvText(text) {
  const lines = text.trim().split('\n');
  const specs = {};
  let name = 'CSV Product';
  let sku = '';
  let category = '';
  let manufacturer = '';

  lines.forEach(line => {
    const parts = line.split(',').map(p => p.trim().replace(/^"(.*)"$/, '$1'));
    if (parts.length < 2) return;
    const key = parts[0];
    const val = parts.slice(1).join(',').trim();

    const keyLow = key.toLowerCase();
    if (keyLow === 'name' || keyLow === 'product name') { name = val; return; }
    if (keyLow === 'sku' || keyLow === 'part number' || keyLow === 'model') { sku = val; return; }
    if (keyLow === 'category' || keyLow === 'type') { category = val; return; }
    if (keyLow === 'manufacturer' || keyLow === 'brand' || keyLow === 'make') { manufacturer = val; return; }
    if (key && val) specs[key] = val;
  });

  return { name, sku, category, manufacturer, specifications: specs };
}

/**
 * Parse JSON file content → normalized product object
 */
function parseJsonContent(obj) {
  const specs = obj.specifications || obj.specs || obj.attributes || {};

  // If it's a flat object with no recognized product fields, treat all keys as specs
  const knownKeys = new Set(['name', 'sku', 'category', 'manufacturer', 'brand', 'make',
    'price', 'id', 'status', 'qualityScore', 'sources', 'evidence', 'specifications',
    'enriched', 'specs', 'attributes', 'description']);
  const extraSpecs = {};
  Object.keys(obj).forEach(k => {
    if (!knownKeys.has(k) && typeof obj[k] === 'string') {
      extraSpecs[k] = obj[k];
    }
  });

  return {
    name: obj.name || obj.productName || 'JSON Product',
    sku: obj.sku || obj.partNumber || obj.model || '',
    category: obj.category || obj.type || '',
    manufacturer: obj.manufacturer || obj.brand || obj.make || '',
    price: obj.price || '',
    specifications: { ...specs, ...extraSpecs },
  };
}

/**
 * Read a file as text (Promise). Returns the text or null.
 */
function readFileText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

/**
 * Attempt to extract structured product data from an uploaded file.
 * - JSON: parsed directly
 * - CSV: parsed as key/value pairs
 * - Others (PDF, XLSX, image, TXT): return a placeholder with filename as name.
 *   Real extraction requires AI/document-processing service (future integration).
 *
 * @param {File} file
 * @returns {Promise<Object>} normalized product object
 */
export async function extractProductFromFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const sizeMB = (file.size / 1024 / 1024).toFixed(2);

  if (ext === 'json') {
    const text = await readFileText(file);
    try {
      const obj = JSON.parse(text);
      return {
        ...parseJsonContent(obj),
        source: { type: 'file', label: `JSON File — ${file.name}` },
      };
    } catch (_) { /* fall through */ }
  }

  if (ext === 'csv') {
    const text = await readFileText(file);
    if (text) {
      return {
        ...parseCsvText(text),
        source: { type: 'file', label: `CSV File — ${file.name}` },
      };
    }
  }

  // PDF, XLSX, XLS, TXT, images — return a structured placeholder.
  // Future: replace with POST /api/extract-product (document-processing service).
  const extLabel = {
    pdf: 'PDF Datasheet',
    xlsx: 'Excel File',
    xls: 'Excel File',
    txt: 'Text File',
    png: 'Image',
    jpg: 'Image',
    jpeg: 'Image',
    webp: 'Image',
    html: 'HTML Page',
    htm: 'HTML Page',
  }[ext] || 'Uploaded File';

  return {
    name: file.name.replace(/\.[^.]+$/, ''),
    sku: `FILE-${Math.floor(1000 + Math.random() * 9000)}`,
    category: '',
    manufacturer: '',
    price: '',
    specifications: {
      'File Type': ext.toUpperCase(),
      'File Size': `${sizeMB} MB`,
      '⚠ Note': 'AI extraction pending — connect document-processing service for full attribute extraction',
    },
    source: { type: 'file', label: `${extLabel} — ${file.name}` },
    _requiresAIExtraction: true,
  };
}

/* ─── URL product resolver ──────────────────────────────────────────────── */
/**
 * Returns a demonstration product for recognized URL patterns.
 * For unknown URLs: returns a placeholder.
 * Real scraping requires backend URL-extraction service (future integration).
 */
export const resolveProductFromUrl = (url) => {
  const lower = url.toLowerCase();
  let name, category, sku, manufacturer, specifications, price;

  if (lower.includes('pump') || lower.includes('grundfos')) {
    name = 'Grundfos CR 10-2 Centrifugal Pump';
    category = 'Pumps & Fluid Handling';
    manufacturer = 'Grundfos';
    sku = 'CR10-2-A-FGJ-A-E-HQQE';
    specifications = {
      'Flow Rate': '10 m³/h',
      'Max Head': '30 m',
      'Max Pressure': '10 bar',
      'Power Rating': '2.2 kW',
      'Material': 'SS304',
      'Inlet Size': '2 inch',
      'Outlet Size': '2 inch',
      'Protection Rating': 'IP55',
    };
    price = '₹84,500';
  } else if (lower.includes('motor') || lower.includes('siemens') || lower.includes('1le')) {
    name = 'Siemens SIMOTICS GP 7.5 kW Motor';
    category = 'Motors & Drives';
    manufacturer = 'Siemens';
    sku = '1LE1001-1DB43-4AA4';
    specifications = {
      'Power Rating': '7.5 kW',
      'Speed': '1440 RPM',
      'Voltage': '415 V',
      'Frequency': '50 Hz',
      'Efficiency Class': 'IE3 Premium',
      'Mounting': 'Foot-mounted (IM B3)',
      'Protection Rating': 'IP55',
    };
    price = '₹42,000';
  } else if (lower.includes('phone') || lower.includes('iphone') || lower.includes('samsung') || lower.includes('amazon') || lower.includes('flipkart')) {
    name = 'iPhone 15 Pro Max';
    category = 'Electronics';
    manufacturer = 'Apple';
    sku = 'MQ9W3HN/A';
    specifications = {
      'Processor': 'A17 Pro',
      'RAM': '8 GB',
      'Storage': '256 GB',
      'Display': '6.7 inch Super Retina XDR',
      'Battery': '4422 mAh',
      'Camera': '48 MP Main + 12 MP Ultra Wide',
      'Charging': '30W MagSafe',
      'Weight': '221 g',
    };
    price = '₹1,59,900';
  } else if (lower.includes('valve') || lower.includes('flow')) {
    name = 'L&T Gate Valve DN50';
    category = 'Valves & Actuators';
    manufacturer = 'L&T';
    sku = 'GV-PN16-DN50';
    specifications = {
      'Valve Type': 'Gate Valve',
      'Size': 'DN50 (2 inch)',
      'Pressure Rating': 'PN16',
      'Material': 'Cast Iron',
      'Connection': 'Flanged',
      'Medium': 'Water / Steam',
    };
    price = '₹3,200';
  } else if (lower.includes('plc') || lower.includes('allen') || lower.includes('rockwell')) {
    name = 'Allen-Bradley Micro850 PLC';
    category = 'Industrial Automation';
    manufacturer = 'Allen-Bradley';
    sku = '2080-LC50-48QWB';
    specifications = {
      'Digital Inputs': '28 points',
      'Digital Outputs': '20 points',
      'Analog Inputs': '4 channels',
      'Supply Voltage': '24V DC',
      'Memory': '20 KB',
      'Communication': 'EtherNet/IP',
    };
    price = '₹78,000';
  } else {
    // Unknown URL — placeholder (real extraction needs backend)
    const hostname = (() => { try { return new URL(url).hostname; } catch (_) { return 'supplier.com'; } })();
    name = `Product from ${hostname}`;
    category = '';
    manufacturer = '';
    sku = `SKU-URL-${Math.floor(1000 + Math.random() * 9000)}`;
    specifications = {
      '⚠ Note': 'URL extraction requires backend scraping service — connect URL-processing API for real product data',
    };
    price = '';
  }

  return {
    id: `url-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name,
    sku,
    category,
    manufacturer,
    price,
    specifications,
    source: { type: 'url', label: `Supplier URL — ${(() => { try { return new URL(url).hostname; } catch (_) { return url.slice(0, 30); } })()}` },
  };
};

/* ─── Catalog normalizer ────────────────────────────────────────────────── */
export const normalizeCatalogProduct = (product) => {
  let price = product.price;
  if (!price) {
    if (product.category === 'Pumps & Fluid Handling') price = '₹1,12,000';
    else if (product.category === 'Motors & Drives') price = '₹54,000';
    else price = '₹22,500';
  }
  return {
    ...product,
    price,
    source: { type: 'catalog', label: 'Product Catalog' },
  };
};

/* ─── Manual product normalizer ─────────────────────────────────────────── */
export const normalizeManualProduct = (formData) => ({
  id: `manual-${Date.now()}`,
  name: formData.name || 'Manual Product',
  sku: formData.sku || '',
  category: formData.category || '',
  manufacturer: formData.manufacturer || '',
  price: formData.price || '',
  specifications: (formData.specs || [])
    .filter(s => s.attr.trim() && s.val.trim())
    .reduce((acc, s) => ({ ...acc, [s.attr.trim()]: s.val.trim() }), {}),
  source: { type: 'manual', label: 'Manual Entry' },
});

/* ─── Compare engine ────────────────────────────────────────────────────── */
class CompareService {
  /**
   * Accepts an array of already-normalized product objects
   * (produced by normalizeCatalogProduct / normalizeManualProduct /
   *  extractProductFromFile / resolveProductFromUrl)
   *
   * @param {Array} normalizedProducts
   * @returns {{ products, rows, differences } | null}
   */
  compareNormalized(normalizedProducts) {
    const products = normalizedProducts.filter(Boolean);
    if (products.length < 2) return null;

    // 1. Collect all unique normalized attribute keys across all products
    const attributeKeys = new Set();
    products.forEach(p => {
      Object.keys(p.specifications || {}).forEach(k => {
        attributeKeys.add(normalizeAttributeName(k));
      });
    });
    // Include price as a row if any product has it
    if (products.some(p => p.price)) {
      attributeKeys.add('Listed Price');
    }

    const attributesList = Array.from(attributeKeys);

    // 2. Build comparison rows
    const rows = attributesList.map(normAttr => {
      const values = products.map(p => {
        if (normAttr === 'Listed Price') return p.price || '—';
        const matchKey = Object.keys(p.specifications || {}).find(
          k => normalizeAttributeName(k) === normAttr
        );
        return matchKey ? p.specifications[matchKey] : 'Not Available';
      });

      const nonEmpty = values.filter(v => v !== '—' && v !== 'Not Available');
      let isMatching = false;
      let hasConflict = false;
      if (nonEmpty.length > 1) {
        const first = nonEmpty[0].trim().toLowerCase().replace(/\s+/g, '');
        if (nonEmpty.every(v => v.trim().toLowerCase().replace(/\s+/g, '') === first)) {
          isMatching = true;
        } else {
          hasConflict = true;
        }
      }

      return { attribute: normAttr, values, isMatching, hasConflict };
    });

    // Sort: Listed Price first, then alphabetical
    rows.sort((a, b) => {
      if (a.attribute === 'Listed Price') return -1;
      if (b.attribute === 'Listed Price') return 1;
      return a.attribute.localeCompare(b.attribute);
    });

    // 3. Key differences
    const differences = [];
    rows.forEach(r => {
      if (!r.hasConflict) return;

      if (r.attribute === 'Listed Price') {
        const pricesNum = products.map(p => {
          const n = parseFloat((p.price || '').replace(/[^\d.]/g, ''));
          return isNaN(n) ? null : n;
        });
        const valid = pricesNum.filter(p => p !== null);
        if (valid.length > 1) {
          const min = Math.min(...valid);
          const idx = pricesNum.indexOf(min);
          differences.push(
            `**${products[idx].name}** offers the lowest listed price at **${products[idx].price}**.`
          );
        } else {
          differences.push('Listed prices differ across compared products.');
        }
        return;
      }

      // Build readable difference sentence
      const nonMissing = r.values
        .map((v, i) => (v !== '—' && v !== 'Not Available' ? { name: products[i].name, val: v } : null))
        .filter(Boolean);

      if (nonMissing.length === 0) {
        differences.push(`**${r.attribute}** is not available in any compared product.`);
      } else if (nonMissing.length < products.length) {
        const missing = products
          .filter((_, i) => r.values[i] === 'Not Available' || r.values[i] === '—')
          .map(p => `**${p.name}**`)
          .join(', ');
        differences.push(
          `**${r.attribute}** differs — ${missing} do${missing.includes(',') ? '' : 'es'} not provide this value.`
        );
      } else {
        const details = nonMissing.map(x => `**${x.name}** (${x.val})`).join(', ');
        differences.push(`**${r.attribute}** differs: ${details}.`);
      }
    });

    // Add matching summary
    const matchCount = rows.filter(r => r.isMatching).length;
    if (differences.length === 0) {
      differences.push('All compared product specifications match exactly.');
    } else if (matchCount > 0) {
      differences.push(`**${matchCount} specification${matchCount > 1 ? 's' : ''}** match across all compared products.`);
    }

    return { products, rows, differences };
  }

  /**
   * Legacy method — kept for backwards compatibility
   * Maps old { type: 'existing'|'url', value } configs to normalized products
   */
  prepareComparison(productConfigs) {
    const allCatalog = productService.getProducts();
    const normalized = productConfigs.map(cfg => {
      if (!cfg) return null;
      if (cfg.type === 'existing') {
        const found = allCatalog.find(p => p.id === cfg.value);
        return found ? normalizeCatalogProduct(found) : null;
      }
      if (cfg.type === 'url' && cfg.value && validateUrl(cfg.value)) {
        return resolveProductFromUrl(cfg.value);
      }
      return null;
    });
    return this.compareNormalized(normalized.filter(Boolean));
  }
}

export const compareService = new CompareService();

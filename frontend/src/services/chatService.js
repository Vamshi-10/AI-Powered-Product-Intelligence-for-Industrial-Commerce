import { productService } from './productService';
import { confidenceService } from './confidenceService';

/**
 * ADHARRA Frontend Chat Service
 *
 * Priority order:
 *  1. Navigation knowledge → direct answer + optional route action
 *  2. Local product/confidence/validation data → dynamic answer
 *  3. Short generic fallback (integration-ready hook)
 *
 * Future Integration Schema:
 * POST /api/chat { message, productId, currentModule, conversationId }
 * Response { answer, sources, action?: { label, route }, conversationId }
 */

/* ─── App knowledge map ─────────────────────────────────────────────────── */
const APP_MAP = {
  home:       { label: 'Home',              route: '/dashboard' },
  products:   { label: 'Products',          route: '/dashboard/products' },
  catalog:    { label: 'Product Catalog',   route: '/dashboard/products' },
  details:    { label: 'Product Details',   route: '/dashboard/products' },
  ai:         { label: 'AI Intelligence',   route: '/dashboard/ai' },
  status:     { label: 'Processing Status', route: '/dashboard/ai' },
  results:    { label: 'AI Results',        route: '/dashboard/ai' },
  compare:    { label: 'Smart Compare',     route: '/dashboard/ai' },
  confidence: { label: 'Confidence Scores', route: '/dashboard/ai' },
  quality:    { label: 'Data Quality',      route: '/dashboard/quality' },
  validation: { label: 'Validation',        route: '/dashboard/validation' },
  settings:   { label: 'Settings',          route: '/dashboard/settings' },
  upload:     { label: 'Upload',            route: '/upload' },
};

/* ─── Navigation intent patterns ────────────────────────────────────────── */
const NAV_RULES = [
  {
    patterns: ['confidence score', 'confidence scores', 'check confidence', 'view confidence', 'attribute confidence', 'source confidence', 'overall confidence'],
    answer: 'You can view confidence scores under **AI Intelligence → Confidence Scores**. There you can see the combined confidence, source agreement, conflicts, and attribute-level confidence for any product in your catalog.',
    action: { label: 'Open Confidence Scores', route: '/dashboard/ai' },
  },
  {
    patterns: ['smart compare', 'compare product', 'compare two', 'compare multiple', 'compare specification', 'compare spec', 'product comparison', 'side by side'],
    answer: 'Use **AI Intelligence → Smart Compare** to compare products side-by-side. You can mix sources — Catalog, File, URL, or Manual entry — and get a dynamic specification table with key differences.',
    action: { label: 'Open Smart Compare', route: '/dashboard/ai' },
  },
  {
    patterns: ['validate product', 'validation queue', 'approve product', 'reject product', 'correct ai', 'correct information', 'hitl', 'human review', 'review queue', 'review and validate', 'pending validation'],
    answer: 'Go to **Validation → Review & Validate** to approve, reject, or manually correct AI-extracted attributes. The HITL workspace shows source evidence and runs rule checks for each item.',
    action: { label: 'Open Validation', route: '/dashboard/validation' },
  },
  {
    patterns: ['data issue', 'data quality', 'quality issue', 'fix issue', 'missing field', 'duplicate', 'unit conflict', 'invalid value', 'data problem', 'auto-fix', 'auto fix'],
    answer: 'Open **Data Quality** to see and resolve missing fields, invalid values, duplicate records, and unit conflicts. You can use "Auto-Fix Safe Issues" for quick resolution of low-risk items.',
    action: { label: 'Open Data Quality', route: '/dashboard/quality' },
  },
  {
    patterns: ['export product', 'export catalog', 'download product', 'export json', 'export csv', 'export pdf', 'download data'],
    answer: 'Go to **Products → Product Details**, select a product, then click **Export** to download as JSON, CSV, or PDF. You can also export directly from the Product Catalog table rows.',
    action: { label: 'Open Products', route: '/dashboard/products' },
  },
  {
    patterns: ['ai result', 'ai extraction', 'extracted information', 'enriched attribute', 'before after', 'enrichment result', 'extraction result', 'see ai', 'view ai'],
    answer: 'Go to **AI Intelligence → AI Results** to see a before/after comparison of extracted vs. enriched attribute values, including improvement type and source document for each attribute.',
    action: { label: 'Open AI Results', route: '/dashboard/ai' },
  },
  {
    patterns: ['processing status', 'pipeline status', 'run pipeline', 'ai pipeline', 'processing log', 'recent processing'],
    answer: 'Check **AI Intelligence → Processing Status** for the live pipeline progress, recent processing logs, and per-file extraction counts.',
    action: { label: 'Open Processing Status', route: '/dashboard/ai' },
  },
  {
    patterns: ['upload', 'import file', 'add product', 'upload data', 'add catalog', 'ingest', 'upload file', 'upload pdf', 'upload csv'],
    answer: 'Use **Upload** to import product data. Supported inputs are: PDF datasheets, CSV/XLSX catalogs, JSON files, images, product URLs, or manual entry. The processed results flow through to AI Intelligence.',
    action: { label: 'Open Upload', route: '/upload' },
  },
  {
    patterns: ['product catalog', 'view product', 'browse product', 'all product', 'product list', 'search product', 'filter product'],
    answer: 'Go to **Products → Product Catalog** to browse, search, and filter all products in your catalog. Click any row to open the full Product Details view.',
    action: { label: 'Open Product Catalog', route: '/dashboard/products' },
  },
  {
    patterns: ['setting', 'profile', 'notification', 'appearance', 'theme', 'accent', 'preference', 'account'],
    answer: 'Open **Settings** to manage your profile, preferences (confidence threshold, auto-processing), notification settings, and appearance (theme, accent color).',
    action: { label: 'Open Settings', route: '/dashboard/settings' },
  },
  {
    patterns: ['what can you do', 'help me', 'what is adharra', 'how does adharra work', 'adharra feature', 'what modules', 'what sections'],
    answer: `**ADHARRA** is an AI-powered product intelligence platform. Here's what each module does:\n\n• **Upload** — Import product files (PDF, CSV, XLSX, JSON, images, URL, manual)\n• **AI Intelligence** — View extraction results, run Smart Compare, and see confidence scores\n• **Data Quality** — Detect and fix missing, invalid, duplicate, or conflicting data\n• **Validation** — HITL review to approve, reject, or correct AI-extracted attributes\n• **Products** — Browse the catalog, edit product details, and export\n• **Settings** — Profile, preferences, notifications, appearance`,
    action: null,
  },
];

/* ─── Local data handlers ────────────────────────────────────────────────── */
function tryDataAnswer(lowerMsg, products) {
  // "show pending / products pending review"
  if (
    (lowerMsg.includes('pending') || lowerMsg.includes('show pending') || lowerMsg.includes('needs review')) &&
    !lowerMsg.includes('where') && !lowerMsg.includes('how to') && !lowerMsg.includes('go to')
  ) {
    const pending = products.filter(p => p.status === 'Pending Review');
    if (pending.length === 0) {
      return { answer: 'No products are currently pending review.', sources: [] };
    }
    const list = pending.map(p => `• **${p.name}** (SKU: ${p.sku})`).join('\n');
    return {
      answer: `**${pending.length} product${pending.length > 1 ? 's' : ''} pending review:**\n\n${list}\n\nGo to Validation to review them.`,
      sources: [],
      action: { label: 'Open Validation', route: '/dashboard/validation' },
    };
  }

  // "how many validated"
  if (
    (lowerMsg.includes('how many') || lowerMsg.includes('count')) &&
    lowerMsg.includes('validat')
  ) {
    const validated = products.filter(p => p.status === 'Validated');
    const pending = products.filter(p => p.status === 'Pending Review');
    const processing = products.filter(p => p.status === 'In Processing');
    return {
      answer: `**Current catalog status:**\n\n• ✅ Validated: **${validated.length}**\n• ⏳ Pending Review: **${pending.length}**\n• 🔄 In Processing: **${processing.length}**\n• 📦 Total: **${products.length}**`,
      sources: [],
      action: { label: 'Open Products', route: '/dashboard/products' },
    };
  }

  // "show validated products"
  if (
    lowerMsg.includes('show validated') ||
    (lowerMsg.includes('validated') && (lowerMsg.includes('list') || lowerMsg.includes('which') || lowerMsg.includes('show')))
  ) {
    const validated = products.filter(p => p.status === 'Validated');
    if (validated.length === 0) {
      return { answer: 'No products are marked as Validated yet.', sources: [] };
    }
    const list = validated.map(p => `• **${p.name}** — SKU: ${p.sku} — Quality: ${p.qualityScore}%`).join('\n');
    return {
      answer: `**${validated.length} validated product${validated.length > 1 ? 's' : ''}:**\n\n${list}`,
      sources: [],
      action: { label: 'Open Product Catalog', route: '/dashboard/products' },
    };
  }

  // "total products / how many products"
  if (
    (lowerMsg.includes('total product') || lowerMsg.includes('how many product') || lowerMsg.includes('product count'))
  ) {
    return {
      answer: `There are **${products.length} products** in your catalog. Go to Products to browse them all.`,
      sources: [],
      action: { label: 'Open Product Catalog', route: '/dashboard/products' },
    };
  }

  // "low confidence / confidence issues"
  if (
    (lowerMsg.includes('low confidence') || lowerMsg.includes('confidence issue') || lowerMsg.includes('below confidence') || lowerMsg.includes('poor confidence'))
  ) {
    const lowQuality = products.filter(p => p.qualityScore && p.qualityScore < 75);
    if (lowQuality.length === 0) {
      return { answer: 'All products currently meet the quality threshold (≥ 75%). No low-confidence items detected.', sources: [] };
    }
    const list = lowQuality.map(p => `• **${p.name}** — Quality Score: ${p.qualityScore}%`).join('\n');
    return {
      answer: `**${lowQuality.length} product${lowQuality.length > 1 ? 's' : ''} with low quality/confidence scores (< 75%):**\n\n${list}`,
      sources: [],
      action: { label: 'Open Data Quality', route: '/dashboard/quality' },
    };
  }

  // Specific product detail when productId context is active
  return null;
}

/* ─── Product context handler ───────────────────────────────────────────── */
function tryProductContextAnswer(lowerMsg, product) {
  if (!product) return null;

  // Full spec list
  if (
    lowerMsg.includes('spec') || lowerMsg.includes('detail') ||
    lowerMsg.includes('attribute') || lowerMsg.includes('tell me about') ||
    lowerMsg.includes('show me') || lowerMsg.includes('what is') && lowerMsg.includes(product.name.toLowerCase().split(' ')[0])
  ) {
    const specs = Object.entries(product.specifications || {});
    if (specs.length === 0) {
      return { answer: `No specifications recorded for **${product.name}** yet.`, sources: [] };
    }
    const list = specs.map(([k, v]) => `• **${k}**: ${v}`).join('\n');
    return {
      answer: `Here are the extracted specifications for **${product.name}** (SKU: ${product.sku}):\n\n${list}`,
      sources: product.sources ? product.sources.map(s => ({ name: s.name, page: 1 })) : [],
    };
  }

  // Match any specification key dynamically
  const specs = product.specifications || {};
  for (const [key, val] of Object.entries(specs)) {
    if (lowerMsg.includes(key.toLowerCase())) {
      return {
        answer: `**${key}** for **${product.name}**: **${val}**`,
        sources: product.sources && product.sources[0] ? [{ name: product.sources[0].name, page: 1 }] : [],
      };
    }
  }

  // Power/voltage/speed pattern fallbacks
  if (lowerMsg.includes('power') || lowerMsg.includes('kw') || lowerMsg.includes('hp')) {
    const val = specs['Power Rating'] || specs['Rated Power'] || specs['Motor Power'] || 'not specified';
    return { answer: `**Power Rating** for **${product.name}**: **${val}**`, sources: [] };
  }
  if (lowerMsg.includes('voltage') || lowerMsg.includes('supply')) {
    const val = specs['Voltage'] || specs['Supply Voltage'] || specs['Rated Voltage'] || 'not specified';
    return { answer: `**Voltage** for **${product.name}**: **${val}**`, sources: [] };
  }
  if (lowerMsg.includes('speed') || lowerMsg.includes('rpm')) {
    const val = specs['Speed'] || specs['Rated Speed'] || 'not specified';
    return { answer: `**Speed** for **${product.name}**: **${val}**`, sources: [] };
  }

  return null;
}

/* ─── Main export ────────────────────────────────────────────────────────── */
export async function sendChatMessage(message, context = {}) {
  // Realistic latency
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));

  const lowerMsg = message.toLowerCase().trim();
  const products = productService.getProducts();

  // ── PRIORITY 1: Navigation intent ──────────────────────────────────────
  for (const rule of NAV_RULES) {
    if (rule.patterns.some(p => lowerMsg.includes(p))) {
      return {
        answer: rule.answer,
        sources: [],
        action: rule.action || null,
      };
    }
  }

  // ── PRIORITY 2: Local data queries ─────────────────────────────────────
  const dataAnswer = tryDataAnswer(lowerMsg, products);
  if (dataAnswer) return dataAnswer;

  // ── PRIORITY 2b: Active product context ────────────────────────────────
  if (context.productId) {
    const product = products.find(p => p.id === context.productId || p.sku === context.productId);
    if (product) {
      const ctxAnswer = tryProductContextAnswer(lowerMsg, product);
      if (ctxAnswer) return ctxAnswer;
    }
  }

  // ── PRIORITY 3: Integration-ready fallback ─────────────────────────────
  return {
    answer: 'I don\'t have a local answer for that yet. Once the ADHARRA AI service is connected, it will answer detailed questions about product intelligence, supplier data, and extraction results.',
    sources: [],
    action: null,
  };
}

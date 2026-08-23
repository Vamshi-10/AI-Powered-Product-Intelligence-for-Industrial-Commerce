import React, { useState, useRef, useCallback } from 'react';
import {
  Cpu, Search, BarChart2, CheckCircle2, FileText, X, AlertTriangle, HelpCircle, GitCompare, Plus, Trash, Upload, Link, PenLine, BookOpen, Trash2
} from 'lucide-react';
import { productService } from '../../services/productService';
import { confidenceService } from '../../services/confidenceService';
import {
  compareService, validateUrl,
  normalizeCatalogProduct, resolveProductFromUrl,
  normalizeManualProduct, extractProductFromFile
} from '../../services/compareService';
import './PageLayout.css';

const TABS = [
  { id: 'status',     label: 'Processing Status', icon: Cpu },
  { id: 'results',    label: 'AI Results',        icon: Search },
  { id: 'compare',    label: 'Smart Compare',     icon: GitCompare },
  { id: 'confidence', label: 'Confidence Scores',  icon: BarChart2 },
];

const RECENT_PROCESSING = [
  { file: 'Diablo_Abrasives_Batch.csv', status: 'Completed', count: 48, time: '1 min ago', type: 'done' },
  { file: 'Philips_Lighting_Catalog.csv', status: 'Completed', count: 85, time: '5 min ago', type: 'done' },
  { file: 'Makita_PowerTools_Spec.csv', status: 'Completed', count: 68, time: '10 min ago', type: 'done' },
  { file: 'Hunter_Fans_Industrial.csv', status: 'Completed', count: 38, time: '20 min ago', type: 'done' },
];

const AI_RESULTS_DATA = {
  'Diablo DCB518ASTS06G Sanding Belt': [
    { attr: 'Width', raw: '1/2"', extracted: '1/2"', enriched: '0.5 in', improvement: 'Fraction to Decimal UOM', source: 'sample_raw_items.csv — Line 1', page: 1, status: 'Validated' },
    { attr: 'Length', raw: '18"', extracted: '18"', enriched: '18 in', improvement: 'Unit Normalized', source: 'sample_raw_items.csv — Line 1', page: 1, status: 'Validated' },
    { attr: 'Pack Quantity', raw: '6pc', extracted: '6pc', enriched: '6 pc', improvement: 'Count Standardized', source: 'sample_raw_items.csv — Line 1', page: 1, status: 'Validated' },
    { attr: 'Brand', raw: '-- Unbranded --', extracted: 'Diablo', enriched: 'Diablo', improvement: 'Brand Recovered from Text', source: 'AI Smart Router', page: 1, status: 'Validated' },
    { attr: 'UNSPSC Code', raw: 'None', extracted: '31191500', enriched: '31191500 (Abrasives)', improvement: 'Taxonomy Inferred', source: 'Gemini 3 Flash', page: 1, status: 'Validated' }
  ],
  'Makita XLC10ZW 18V Cordless Vacuum': [
    { attr: 'Voltage', raw: '18V', extracted: '18V', enriched: '18 V', improvement: 'Electrical Standardized', source: 'unihack_batch.csv — Line 12', page: 1, status: 'Validated' },
    { attr: 'Battery System', raw: 'LXT', extracted: 'LXT', enriched: '18V LXT Lithium-Ion', improvement: 'Terminology Enriched', source: 'unihack_batch.csv — Line 12', page: 1, status: 'Validated' },
    { attr: 'Tool Status', raw: 'Bare', extracted: 'Bare', enriched: 'Bare Tool (No Battery)', improvement: 'Commercial Standardized', source: 'unihack_batch.csv — Line 12', page: 1, status: 'Validated' },
    { attr: 'Power Source', raw: 'Cordless', extracted: 'Cordless', enriched: 'Cordless / Battery Powered', improvement: 'Format Cleanup', source: 'unihack_batch.csv — Line 12', page: 1, status: 'Validated' }
  ],
  'Philips 574012 75W LED Bulb 2-Pack': [
    { attr: 'Wattage Equivalent', raw: '75W', extracted: '75W', enriched: '75 W', improvement: 'Power UOM Normalized', source: 'unihack_batch.csv — Line 45', page: 1, status: 'Validated' },
    { attr: 'Bulb Shape', raw: 'ST19', extracted: 'ST19', enriched: 'ST19 Vintage Filament', improvement: 'Form Factor Enriched', source: 'unihack_batch.csv — Line 45', page: 1, status: 'Validated' },
    { attr: 'Color Temperature', raw: '50k', extracted: '50k', enriched: '5000 K (Daylight)', improvement: 'Color Kelvin Normalized', source: 'unihack_batch.csv — Line 45', page: 1, status: 'Validated' },
    { attr: 'Package Quantity', raw: '2pk', extracted: '2pk', enriched: '2 pc', improvement: 'Unit Standardized', source: 'unihack_batch.csv — Line 45', page: 1, status: 'Validated' }
  ]
};

const CONFIDENCE_DATA = [
  { product: 'Diablo Sanding Belt', attr: 'Width', confidence: 98, level: 'High', reason: 'Explicit dimensional extraction' },
  { product: 'Diablo Sanding Belt', attr: 'Brand Resolution', confidence: 99, level: 'High', reason: 'Deterministic brand alias match' },
  { product: 'Makita Cordless Vac', attr: 'Voltage', confidence: 96, level: 'High', reason: 'Standard electrical unit validation' },
  { product: 'Philips LED Bulb', attr: 'Color Temperature', confidence: 95, level: 'High', reason: '50k mapped to 5000 K standard' },
  { product: 'Hunter Ceiling Fan', attr: 'Blade Span', confidence: 94, level: 'High', reason: '44 inch diameter recognized' },
  { product: 'Café Induction Cooktop', attr: 'Width', confidence: 97, level: 'High', reason: '30 inch standard enclosure' },
];

export default function AIIntelligencePage() {
  const [tab, setTab] = useState('status');
  const [selectedProductForResults, setSelectedProductForResults] = useState('Grundfos CR 15-4 Pump');
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedConfidenceFilter, setSelectedConfidenceFilter] = useState('All');

  // Combined Confidence Report States
  const products = productService.getProducts();
  const [selectedProdId, setSelectedProdId] = useState(() => products.find(p => p.id === 'prod-002')?.id || products[0]?.id || '');
  const [activeDetailAttr, setActiveDetailAttr] = useState(null);

  // Smart Compare States
  const EMPTY_MANUAL = { name: '', sku: '', category: '', manufacturer: '', specs: [{ attr: '', val: '' }] };
  const makeSlot = () => ({ sourceType: 'catalog', catalogId: products[0]?.id || '', urlInput: '', urlError: '', file: null, fileProduct: null, fileLoading: false, manual: { ...EMPTY_MANUAL, specs: [{ attr: '', val: '' }] }, resolvedProduct: null });
  const [compareSlots, setCompareSlots] = useState([makeSlot(), makeSlot()]);
  const [compareResult, setCompareResult] = useState(null);
  const [compareFilter, setCompareFilter] = useState('All');
  const [comparing, setComparing] = useState(false);

  const updateSlot = (idx, patch) => setCompareSlots(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));

  const addCompareSlot = () => {
    if (compareSlots.length >= 3) return;
    setCompareSlots(prev => [...prev, makeSlot()]);
    setCompareResult(null);
  };

  const removeCompareSlot = (idx) => {
    if (compareSlots.length <= 2) return;
    setCompareSlots(prev => prev.filter((_, i) => i !== idx));
    setCompareResult(null);
  };

  // Manual form helpers
  const updateManualField = (idx, field, val) =>
    updateSlot(idx, { manual: { ...compareSlots[idx].manual, [field]: val }, resolvedProduct: null });

  const addManualSpec = (idx) =>
    updateSlot(idx, { manual: { ...compareSlots[idx].manual, specs: [...compareSlots[idx].manual.specs, { attr: '', val: '' }] } });

  const removeManualSpec = (idx, si) => {
    const specs = compareSlots[idx].manual.specs.filter((_, i) => i !== si);
    updateSlot(idx, { manual: { ...compareSlots[idx].manual, specs } });
  };

  const updateManualSpec = (idx, si, field, val) => {
    const specs = compareSlots[idx].manual.specs.map((s, i) => i === si ? { ...s, [field]: val } : s);
    updateSlot(idx, { manual: { ...compareSlots[idx].manual, specs }, resolvedProduct: null });
  };

  // File upload handler
  const handleFileSelect = async (idx, file) => {
    if (!file) return;
    updateSlot(idx, { file, fileLoading: true, fileProduct: null, resolvedProduct: null });
    const product = await extractProductFromFile(file);
    setCompareSlots(prev => prev.map((s, i) => i === idx ? { ...s, fileLoading: false, fileProduct: product, resolvedProduct: product } : s));
  };

  // Build normalized product for a slot
  const resolveSlot = (slot) => {
    if (slot.sourceType === 'catalog') {
      const found = products.find(p => p.id === slot.catalogId);
      return found ? normalizeCatalogProduct(found) : null;
    }
    if (slot.sourceType === 'url') {
      if (!validateUrl(slot.urlInput)) return null;
      return resolveProductFromUrl(slot.urlInput);
    }
    if (slot.sourceType === 'file') {
      return slot.fileProduct || null;
    }
    if (slot.sourceType === 'manual') {
      if (!slot.manual.name.trim()) return null;
      return normalizeManualProduct(slot.manual);
    }
    return null;
  };

  // Validate and run comparison
  const handleCompare = async () => {
    setComparing(true);
    const newSlots = compareSlots.map(slot => {
      if (slot.sourceType === 'url' && !validateUrl(slot.urlInput)) {
        return { ...slot, urlError: 'Please enter a valid https:// URL.' };
      }
      return { ...slot, urlError: '' };
    });
    setCompareSlots(newSlots);
    const hasError = newSlots.some(s => s.urlError);
    if (hasError) { setComparing(false); return; }

    const normalized = newSlots.map(resolveSlot).filter(Boolean);
    const res = normalized.length >= 2 ? compareService.compareNormalized(normalized) : null;
    await new Promise(r => setTimeout(r, 300)); // micro-delay for UX
    setCompareResult(res);
    setComparing(false);
  };

  // Ready check: at least 2 slots have a resolvable product
  const readyCount = compareSlots.filter(s => {
    if (s.sourceType === 'catalog') return !!products.find(p => p.id === s.catalogId);
    if (s.sourceType === 'url') return validateUrl(s.urlInput);
    if (s.sourceType === 'file') return !!s.fileProduct;
    if (s.sourceType === 'manual') return !!s.manual.name.trim();
    return false;
  }).length;

  const SOURCE_TABS = [
    { id: 'catalog', label: 'Catalog',  icon: BookOpen },
    { id: 'file',    label: 'File',     icon: Upload },
    { id: 'url',     label: 'URL',      icon: Link },
    { id: 'manual',  label: 'Manual',   icon: PenLine },
  ];

  const sourceLabel = (slot) => {
    if (slot.sourceType === 'catalog') return 'Product Catalog';
    if (slot.sourceType === 'url') return `Supplier URL — ${(() => { try { return new URL(slot.urlInput).hostname; } catch (_) { return slot.urlInput.slice(0, 20); } })()}`;
    if (slot.sourceType === 'file') return slot.file ? `${slot.file.name.split('.').pop().toUpperCase()} File — ${slot.file.name}` : 'Uploaded File';
    if (slot.sourceType === 'manual') return 'Manual Entry';
    return '';
  };

  const slotPreview = (slot, idx) => {
    const prod = resolveSlot(slot);
    if (!prod) return null;
    const specCount = Object.keys(prod.specifications || {}).filter(k => !k.startsWith('⚠')).length;
    return (
      <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 8 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2E8F0', marginBottom: 2 }}>{prod.name}</div>
        {prod.sku && <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: 2 }}>SKU: {prod.sku}</div>}
        {prod.category && <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: 6 }}>{prod.category}</div>}
        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>{specCount > 0 ? `${specCount} specification${specCount > 1 ? 's' : ''} loaded` : 'No specifications'}</div>
        <div style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 600, marginTop: 6 }}>{prod.source?.label || sourceLabel(slot)}</div>
        {prod._requiresAIExtraction && (
          <div style={{ fontSize: '0.68rem', color: '#FBBF24', marginTop: 4 }}>⚠ Full extraction requires AI service</div>
        )}
      </div>
    );
  };


  return (
    <div className="epage-root">
      <div className="epage-header">
        <div className="epage-header-inner">
          <div className="epage-title-block">
            <h1 className="epage-title">AI Intelligence</h1>
            <p className="epage-subtitle">AI extraction and enrichment processing overview</p>
          </div>
        </div>
      </div>

      <div className="epage-body">
        <aside className="epage-sidebar">
          <div className="epage-sidebar-label">AI Modules</div>
          <nav className="epage-sidebar-nav">
            {TABS.map(t => (
              <button key={t.id} className={`epage-sidebar-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="epage-content">
          
          {/* ---- Processing Status ---- */}
          {tab === 'status' && (
            <>
              {/* Stepper Chain */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '20px 24px', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 24 }}>
                {['Uploaded', 'Extracted', 'Enriched', 'Completed'].map((step, idx) => (
                  <React.Fragment key={idx}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid #34D399', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399', fontWeight: 600, fontSize: '0.85rem' }}>
                        ✓
                      </div>
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{step}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stage {idx + 1} Done</div>
                      </div>
                    </div>
                    {idx < 3 && <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg, #34D399, #10B981)', margin: '0 20px' }} />}
                  </React.Fragment>
                ))}
              </div>

              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                  { label: 'Products Processed', value: '8' },
                  { label: 'Records Extracted', value: '156' },
                  { label: 'Attributes Processed', value: '142' },
                  { label: 'Processing Issues', value: '2' },
                ].map((k, i) => (
                  <div key={i} className="epage-panel" style={{ padding: '20px 24px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1 }}>{k.value}</div>
                    {k.label === 'Processing Issues' && (
                      <div style={{ fontSize: '0.75rem', color: '#FBBF24', marginTop: 8 }}>2 items require attention</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Recent Processing */}
              <div className="epage-panel">
                <div className="epage-panel-header">
                  <div className="epage-panel-title">Recent Processing Logs</div>
                </div>
                <div className="epage-panel-body" style={{ padding: 0 }}>
                  {RECENT_PROCESSING.map((item, idx) => (
                    <div key={idx} style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: idx === RECENT_PROCESSING.length - 1 ? 'none' : '1px solid var(--border)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A78BFA' }}>
                        <FileText size={18} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: 2 }}>{item.file}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.count} attributes processed</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 2, color: item.type === 'done' ? '#34D399' : item.type === 'active' ? '#A78BFA' : '#F87171' }}>
                          {item.status}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ---- AI Results ---- */}
          {tab === 'results' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Selector & Subtitle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>AI Results</h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>View extracted product attributes and AI-enhanced values in one place.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Selected Product:</span>
                  <select 
                    className="epage-select" 
                    value={selectedProductForResults} 
                    onChange={e => { setSelectedProductForResults(e.target.value); setSelectedRow(null); }}
                    style={{ minWidth: 240 }}
                  >
                    {Object.keys(AI_RESULTS_DATA).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Main Workspace Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 20, alignItems: 'start' }}>
                
                {/* Table */}
                <div className="epage-panel">
                  <div className="epage-table-wrap">
                    <table className="epage-table">
                      <thead>
                        <tr>
                          <th>Attribute</th>
                          <th>Source Value</th>
                          <th>Extracted Value</th>
                          <th>Enriched Value</th>
                          <th>Improvement</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {AI_RESULTS_DATA[selectedProductForResults].map((item, idx) => {
                          const isSelected = selectedRow && selectedRow.attr === item.attr;
                          return (
                            <tr 
                              key={idx} 
                              onClick={() => setSelectedRow(item)}
                              style={{ 
                                cursor: 'pointer', 
                                background: isSelected ? 'var(--accent-soft)' : 'transparent',
                                borderLeft: isSelected ? '3px solid var(--accent)' : 'none'
                              }}
                            >
                              <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  {item.attr}
                                  {item.status === 'Needs Review' && (
                                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#FBBF24' }} title="Needs Review" />
                                  )}
                                </div>
                              </td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.raw}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.extracted}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>{item.enriched}</td>
                              <td>
                                <span className={`badge ${
                                  item.improvement === 'No Change' 
                                    ? 'badge-pending' 
                                    : 'badge-validated'
                                }`}>
                                  {item.improvement}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.source}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right: Drawer or Needs Attention Panel */}
                <div>
                  {selectedRow ? (
                    <div className="epage-panel" style={{ padding: 16, position: 'relative' }}>
                      <button 
                        onClick={() => setSelectedRow(null)} 
                        style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <X size={16} />
                      </button>
                      <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                        Attribute Details
                      </h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                          { label: 'Attribute', value: selectedRow.attr },
                          { label: 'Source Value', value: selectedRow.raw },
                          { label: 'Extracted Value', value: selectedRow.extracted },
                          { label: 'Enriched Value', value: selectedRow.enriched },
                          { label: 'Improvement Type', value: selectedRow.improvement },
                          { label: 'Source Document', value: selectedRow.source.split(' — ')[0] },
                          { label: 'Page Number', value: selectedRow.page || '1' },
                        ].map(d => (
                          <div key={d.label}>
                            <div style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                              {d.label}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                              {d.value}
                            </div>
                          </div>
                        ))}
                        
                        <button 
                          className="btn-primary" 
                          style={{ width: '100%', marginTop: 8, background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none' }}
                          onClick={() => alert(`Viewing source document: ${selectedRow.source}`)}
                        >
                          View Source
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="epage-panel" style={{ padding: 16 }}>
                      <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: 12, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                        Needs Attention
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {AI_RESULTS_DATA[selectedProductForResults].filter(item => item.status === 'Needs Review').length === 0 ? (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            No items require attention.
                          </div>
                        ) : (
                          AI_RESULTS_DATA[selectedProductForResults].filter(item => item.status === 'Needs Review').map((item, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => setSelectedRow(item)}
                              style={{ 
                                padding: 10, 
                                background: 'var(--color-warning-bg, rgba(245,158,11,0.05))', 
                                border: '1px solid var(--warning)', 
                                borderRadius: 6, 
                                cursor: 'pointer' 
                              }}
                            >
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>{item.attr}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--warning)', marginTop: 2 }}>
                                Reason: {item.reason || 'Verification required'}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* ---- Smart Compare ---- */}
          {tab === 'compare' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 600, marginBottom: 4 }}>Smart Compare</h2>
                <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>Compare products from your catalog, files, URLs, or manual data. Mix source types freely.</p>
              </div>

              {/* Slot Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${compareSlots.length}, 1fr)`, gap: 16, alignItems: 'start' }}>
                {compareSlots.map((slot, idx) => (
                  <div key={idx} className="epage-panel" style={{ padding: 18, border: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}>
                    {/* Remove button (third slot only) */}
                    {compareSlots.length > 2 && (
                      <button
                        onClick={() => removeCompareSlot(idx)}
                        style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title="Remove slot"
                      >
                        <Trash size={13} />
                      </button>
                    )}

                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
                      Product {idx + 1}
                    </div>

                    {/* Source type selector */}
                    <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
                      {SOURCE_TABS.map(st => (
                        <button
                          key={st.id}
                          onClick={() => { updateSlot(idx, { sourceType: st.id, resolvedProduct: null, urlError: '' }); setCompareResult(null); }}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 6,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            background: slot.sourceType === st.id ? 'var(--accent)' : 'var(--surface-secondary)',
                            color: slot.sourceType === st.id ? '#fff' : '#94A3B8',
                            border: 'none',
                            transition: 'all 0.15s',
                          }}
                        >
                          <st.icon size={11} /> {st.label}
                        </button>
                      ))}
                    </div>

                    {/* Catalog */}
                    {slot.sourceType === 'catalog' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>Select Product</label>
                        <select
                          className="epage-select"
                          value={slot.catalogId}
                          onChange={e => { updateSlot(idx, { catalogId: e.target.value, resolvedProduct: null }); setCompareResult(null); }}
                          style={{ width: '100%' }}
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* File */}
                    {slot.sourceType === 'file' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>Upload Product File</label>
                        {!slot.file ? (
                          <label
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              padding: '20px 12px', border: '2px dashed rgba(255,255,255,0.12)', borderRadius: 8,
                              cursor: 'pointer', gap: 6, background: 'rgba(255,255,255,0.02)', textAlign: 'center'
                            }}
                          >
                            <Upload size={20} style={{ color: '#64748B' }} />
                            <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>Click to upload</span>
                            <span style={{ fontSize: '0.65rem', color: '#64748B' }}>PDF, CSV, XLSX, JSON, TXT, images</span>
                            <input
                              type="file"
                              accept=".pdf,.csv,.xlsx,.xls,.json,.txt,.png,.jpg,.jpeg,.webp,.html,.htm"
                              style={{ display: 'none' }}
                              onChange={e => { if (e.target.files[0]) handleFileSelect(idx, e.target.files[0]); }}
                            />
                          </label>
                        ) : (
                          <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#E2E8F0', marginBottom: 2 }}>{slot.file.name}</div>
                                <div style={{ fontSize: '0.68rem', color: '#64748B' }}>
                                  {slot.file.name.split('.').pop().toUpperCase()} · {(slot.file.size / 1024).toFixed(1)} KB
                                </div>
                                {slot.fileLoading && <div style={{ fontSize: '0.68rem', color: 'var(--accent)', marginTop: 4 }}>Parsing file…</div>}
                              </div>
                              <button
                                onClick={() => { updateSlot(idx, { file: null, fileProduct: null, resolvedProduct: null }); setCompareResult(null); }}
                                style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 2 }}
                              ><X size={13} /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* URL */}
                    {slot.sourceType === 'url' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>Product URL</label>
                        <input
                          type="text"
                          className="epage-input"
                          value={slot.urlInput}
                          onChange={e => { updateSlot(idx, { urlInput: e.target.value, urlError: '', resolvedProduct: null }); setCompareResult(null); }}
                          placeholder="https://supplier.com/product…"
                          style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem' }}
                        />
                        {slot.urlError && <span style={{ fontSize: '0.68rem', color: '#EF4444' }}>{slot.urlError}</span>}
                        <div style={{ fontSize: '0.65rem', color: '#475569' }}>Tip: try amazon.com, grundfos.com, siemens.com, etc.</div>
                      </div>
                    )}

                    {/* Manual */}
                    {slot.sourceType === 'manual' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[['name','Product Name *'],['category','Category'],['manufacturer','Manufacturer'],['sku','SKU (optional)']].map(([field, label]) => (
                          <div key={field}>
                            <label style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 3 }}>{label}</label>
                            <input
                              type="text"
                              className="epage-input"
                              value={slot.manual[field]}
                              onChange={e => { updateManualField(idx, field, e.target.value); setCompareResult(null); }}
                              style={{ width: '100%', padding: '7px 10px', fontSize: '0.78rem' }}
                            />
                          </div>
                        ))}

                        {/* Dynamic specs */}
                        <div style={{ marginTop: 4 }}>
                          <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Specifications</div>
                          {slot.manual.specs.map((spec, si) => (
                            <div key={si} style={{ display: 'flex', gap: 4, marginBottom: 5, alignItems: 'center' }}>
                              <input
                                type="text"
                                className="epage-input"
                                placeholder="Attribute"
                                value={spec.attr}
                                onChange={e => { updateManualSpec(idx, si, 'attr', e.target.value); setCompareResult(null); }}
                                style={{ flex: 1, padding: '6px 8px', fontSize: '0.75rem' }}
                              />
                              <input
                                type="text"
                                className="epage-input"
                                placeholder="Value"
                                value={spec.val}
                                onChange={e => { updateManualSpec(idx, si, 'val', e.target.value); setCompareResult(null); }}
                                style={{ flex: 1, padding: '6px 8px', fontSize: '0.75rem' }}
                              />
                              {slot.manual.specs.length > 1 && (
                                <button onClick={() => removeManualSpec(idx, si)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 2 }}>
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => addManualSpec(idx)}
                            style={{ fontSize: '0.72rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Plus size={12} /> Add Specification
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Product Preview */}
                    {slotPreview(slot, idx)}
                  </div>
                ))}
              </div>

              {/* Add third / Compare buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                {compareSlots.length < 3 ? (
                  <button onClick={addCompareSlot} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem' }}>
                    <Plus size={14} /> Add Third Product
                  </button>
                ) : <div />}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  {readyCount < 2 && (
                    <div style={{ fontSize: '0.72rem', color: '#FBBF24' }}>Add at least two products to compare.</div>
                  )}
                  <button
                    onClick={handleCompare}
                    disabled={readyCount < 2 || comparing}
                    className="btn-primary"
                    style={{
                      background: readyCount >= 2 ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
                      color: readyCount >= 2 ? '#fff' : '#64748B',
                      border: 'none', padding: '10px 24px', fontSize: '0.85rem', fontWeight: 600,
                      cursor: readyCount >= 2 ? 'pointer' : 'default', transition: 'all 0.2s'
                    }}
                  >
                    {comparing ? 'Comparing…' : 'Compare Products'}
                  </button>
                </div>
              </div>

              {/* ── Comparison Results ── */}
              {compareResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                    <h3 style={{ fontSize: '1rem', color: '#fff', fontWeight: 600 }}>Comparison Results</h3>
                    {/* Filter chips */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { label: 'All', id: 'All' },
                        { label: 'Differences Only', id: 'Diff' },
                        { label: 'Matching Only', id: 'Match' },
                      ].map(chip => (
                        <button
                          key={chip.id}
                          onClick={() => setCompareFilter(chip.id)}
                          style={{
                            padding: '6px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500,
                            background: compareFilter === chip.id ? 'var(--accent)' : 'var(--surface-secondary)',
                            border: 'none',
                            color: compareFilter === chip.id ? '#fff' : '#94A3B8',
                            cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comparison table */}
                  <div className="epage-panel">
                    <div className="epage-table-wrap">
                      <table className="epage-table">
                        <thead>
                          <tr>
                            <th style={{ width: '22%' }}>Specification</th>
                            {compareResult.products.map((p, ci) => (
                              <th key={ci} style={{ width: `${78 / compareResult.products.length}%` }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                  <span style={{ color: '#fff', fontWeight: 700, display: 'block', whiteSpace: 'normal' }}>{p.name}</span>
                                  {p.sku && <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block' }}>SKU: {p.sku}</span>}
                                  {p.category && <span style={{ fontSize: '0.68rem', color: 'var(--accent)', display: 'block' }}>{p.category}</span>}
                                  <span style={{
                                    fontSize: '0.62rem', fontWeight: 700, color: '#475569',
                                    background: 'rgba(255,255,255,0.06)', padding: '2px 6px',
                                    borderRadius: 4, display: 'inline-block', marginTop: 2, letterSpacing: '0.04em'
                                  }}>
                                    {p.source?.type === 'catalog' ? '📋 Catalog'
                                      : p.source?.type === 'file' ? '📄 File'
                                      : p.source?.type === 'url' ? '🌐 URL'
                                      : p.source?.type === 'manual' ? '✏️ Manual'
                                      : '—'}
                                  </span>
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {compareResult.rows
                            .filter(r => {
                              if (compareFilter === 'Diff') return r.hasConflict;
                              if (compareFilter === 'Match') return r.isMatching;
                              return true;
                            })
                            .map((r, ri) => (
                              <tr key={ri}>
                                <td style={{ fontWeight: 600, color: '#E2E8F0' }}>{r.attribute}</td>
                                {r.values.map((val, ci) => (
                                  <td
                                    key={ci}
                                    style={{
                                      color: val === 'Not Available' || val === '—' ? '#475569' : '#E2E8F0',
                                      fontFamily: r.attribute === 'Listed Price' ? 'inherit' : 'monospace',
                                      fontSize: '0.8rem',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                      {val}
                                      {r.hasConflict && val !== 'Not Available' && val !== '—' && (
                                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} title="Value differs" />
                                      )}
                                    </div>
                                  </td>
                                ))}
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Key differences */}
                  <div className="epage-panel" style={{ padding: '16px 18px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                      Key Differences
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, listStyleType: 'disc', display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {compareResult.differences.map((diff, di) => (
                        <li
                          key={di}
                          style={{ fontSize: '0.82rem', color: '#CBD5E1', lineHeight: 1.4 }}
                          dangerouslySetInnerHTML={{ __html: diff.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                        />
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---- Confidence Scores ---- */}
          {tab === 'confidence' && (() => {
            const selectedProduct = products.find(p => p.id === selectedProdId) || products[0];
            const report = selectedProduct ? confidenceService.generateCombinedProductReport(selectedProduct) : null;
            
            if (!report) {
              return (
                <div style={{ padding: 40, textAlign: 'center', background: 'var(--surface-secondary)', border: '1px dashed var(--border-color)', borderRadius: 8 }}>
                  <HelpCircle size={40} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.5 }} />
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>No product selected</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Please select a product with extraction sources to view confidence details.</div>
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative' }}>
                {/* Header Dropdown & Score Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, background: 'var(--surface)', padding: 20, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Combined Confidence Report</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Product:</span>
                      <select 
                        className="epage-select" 
                        value={selectedProdId} 
                        onChange={e => { setSelectedProdId(e.target.value); setActiveDetailAttr(null); }}
                        style={{ minWidth: 280 }}
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 24 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Overall Confidence</div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 700, color: report.overallLevel === 'HIGH' ? 'var(--success)' : report.overallLevel === 'MEDIUM' ? 'var(--warning)' : 'var(--danger)', lineHeight: 1 }}>
                        {report.overallConfidence}% <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{report.overallLevel}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score Summary Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Sources Used', value: report.sourcesUsed, subtitle: 'Evidence documents' },
                    { label: 'Attributes Checked', value: report.attributesEvaluated, subtitle: 'Product fields' },
                    { label: 'Conflicts Detected', value: report.conflicts, subtitle: 'Discrepancy flags', highlight: report.conflicts > 0 },
                    { label: 'Confirmed Fields', value: report.confirmedAttributes, subtitle: 'Consistent values' }
                  ].map(m => (
                    <div key={m.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 16, borderRadius: 8 }}>
                      <div style={{ fontSize: '0.71rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{m.label}</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: m.highlight ? 'var(--danger)' : 'var(--text-primary)', lineHeight: 1, marginBottom: 4 }}>{m.value}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.subtitle}</div>
                    </div>
                  ))}
                </div>

                {/* Filter chips */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {['All', 'High', 'Medium', 'Low'].map(level => (
                    <button 
                      key={level} 
                      onClick={() => setSelectedConfidenceFilter(level)}
                      style={{ 
                        padding: '6px 12px', 
                        borderRadius: 20, 
                        fontSize: '0.78rem', 
                        fontWeight: 500, 
                        background: selectedConfidenceFilter === level ? 'var(--accent)' : 'var(--surface-secondary)', 
                        border: 'none', 
                        color: selectedConfidenceFilter === level ? 'var(--accent-contrast)' : 'var(--text-secondary)', 
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {level}
                    </button>
                  ))}
                </div>

                {/* Table & Side-drawer Grid wrapper */}
                <div style={{ display: 'grid', gridTemplateColumns: activeDetailAttr ? '3fr 2fr' : '1fr', gap: 20, alignItems: 'start' }}>
                  
                  {/* Table */}
                  <div className="epage-panel">
                    <div className="epage-table-wrap">
                      <table className="epage-table">
                        <thead>
                          <tr>
                            <th>Attribute</th>
                            <th>Combined Value</th>
                            <th>Sources</th>
                            <th>Agreement</th>
                            <th>Confidence</th>
                            <th>Level</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.attributes.filter(c => selectedConfidenceFilter === 'All' || c.level === selectedConfidenceFilter).map((c, i) => (
                            <tr key={i} style={{ background: activeDetailAttr?.attribute === c.attribute ? 'var(--surface-secondary)' : 'transparent' }}>
                              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.attribute}</td>
                              <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-primary)' }}>{c.combinedValue}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{c.sourcesUsed}</td>
                              <td style={{ color: c.hasConflict ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                {c.hasConflict ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <AlertTriangle size={12} /> {c.agreement}
                                  </div>
                                ) : c.agreement}
                              </td>
                              <td>
                                <span style={{ fontWeight: 700, color: c.confidence >= 90 ? 'var(--success)' : c.confidence >= 75 ? 'var(--warning)' : 'var(--danger)' }}>
                                  {c.confidence}%
                                </span>
                              </td>
                              <td>
                                <span className={`badge ${c.level === 'High' ? 'badge-high' : c.level === 'Medium' ? 'badge-medium' : 'badge-low'}`}>
                                  {c.level}
                                </span>
                              </td>
                              <td>
                                <button 
                                  className="btn-ghost" 
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--accent)' }} 
                                  onClick={() => setActiveDetailAttr(c)}
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Drawer / Detail Panel */}
                  {activeDetailAttr && (
                    <div className="epage-panel" style={{ padding: 18, border: '1px solid var(--border)', position: 'relative' }}>
                      <button 
                        onClick={() => setActiveDetailAttr(null)} 
                        style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      >
                        <X size={16} />
                      </button>

                      <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                        Attribute Confidence Details
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                          <div style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Attribute</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{activeDetailAttr.attribute}</div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Combined Value</div>
                          <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{activeDetailAttr.combinedValue}</div>
                        </div>

                        <div style={{ display: 'flex', gap: 16 }}>
                          <div>
                            <div style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Combined Confidence</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: activeDetailAttr.confidence >= 90 ? 'var(--success)' : activeDetailAttr.confidence >= 75 ? 'var(--warning)' : 'var(--danger)' }}>
                              {activeDetailAttr.confidence}%
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Agreement</div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{activeDetailAttr.agreement}</div>
                          </div>
                        </div>

                        {/* Summary, Reason, Status */}
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Summary:</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                              {activeDetailAttr.hasConflict 
                                ? `${activeDetailAttr.agreeCount || 2} sources agree, ${activeDetailAttr.conflictCount || 1} source(s) conflict`
                                : activeDetailAttr.sourcesUsed === 1 ? 'Single source' : `All ${activeDetailAttr.sourcesUsed} sources agree`
                              }
                            </span>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Reason:</span>
                            <span style={{ color: 'var(--text-primary)', textAlign: 'right', maxWidth: '70%', overflowWrap: 'break-word', fontWeight: 600 }}>
                              {activeDetailAttr.reason || 'Source values match'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Status:</span>
                            <span className={`badge ${activeDetailAttr.hasConflict ? 'badge-pending' : 'badge-validated'}`}>
                              {activeDetailAttr.hasConflict ? 'Needs Review' : 'Validated'}
                            </span>
                          </div>
                        </div>

                        {activeDetailAttr.hasConflict && (
                          <div style={{ background: 'var(--color-error-bg, rgba(239,68,68,0.12))', border: '1px solid var(--danger)', padding: 10, borderRadius: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />
                            <div style={{ fontSize: '0.78rem', color: 'var(--danger)', fontWeight: 500 }}>
                              Conflict detected. This attribute has been flagged for human validation.
                            </div>
                          </div>
                        )}

                        <div>
                          <div style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Source Evidence</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {selectedProduct.sources?.map(src => {
                              const ev = activeDetailAttr.evidence.find(e => e.sourceId === src.id);
                              return (
                                <div key={src.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--surface-secondary)', border: '1px solid var(--border)', borderRadius: 6 }}>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>{src.name}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{src.type}</span>
                                  </div>
                                  <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: ev ? 'var(--text-primary)' : 'var(--text-muted)', alignSelf: 'center' }}>
                                    {ev ? ev.value : 'Not available'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
}

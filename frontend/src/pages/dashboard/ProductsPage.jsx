import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Package, List, Search, Filter, Download,
  Eye, Pencil, ChevronDown, CheckCircle2, Clock,
  AlertTriangle, X, Save, Plus, Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { productService } from '../../services/productService';
import { exportProductJson } from '../../utils/exportJson';
import { exportProductCsv } from '../../utils/exportCsv';
import { exportProductPdf } from '../../utils/exportPdf';
import './PageLayout.css';

const TABS = [
  { id: 'catalog', label: 'Product Catalog', icon: List },
  { id: 'details', label: 'Product Details', icon: Eye },
];

const STATUS_COLORS = {
  'Validated':     'badge-validated',
  'Pending Review':'badge-pending',
  'In Processing': 'badge-processing',
  'Needs Revision':'badge-missing',
};

export default function ProductsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [tab, setTab]       = useState('catalog');
  const [products, setProducts] = useState(() => productService.getProducts());

  useEffect(() => {
    const handleUpdate = () => {
      setProducts(productService.getProducts());
    };
    window.addEventListener('adharra_products_updated', handleUpdate);
    return () => window.removeEventListener('adharra_products_updated', handleUpdate);
  }, []);

  const [search, setSearch]       = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(() => {
    const list = productService.getProducts();
    return list[0]?.id;
  });

  useEffect(() => {
    const stateProdId = location.state?.highlightProductId;
    const searchParams = new URLSearchParams(location.search);
    const queryProdId = searchParams.get('productId') || searchParams.get('id');
    const targetId = stateProdId || queryProdId;

    if (targetId) {
      const exists = products.some(p => p.id === targetId || p.sku === targetId);
      if (exists) {
        const found = products.find(p => p.id === targetId || p.sku === targetId);
        setSelectedId(found.id);
        setTab('details');
      }
    }
  }, [location, products]);

  // Sync active product details context for global AI Assistant
  useEffect(() => {
    if (selectedId && tab === 'details') {
      localStorage.setItem('adharra_active_product_id', selectedId);
    } else {
      localStorage.removeItem('adharra_active_product_id');
    }
    window.dispatchEvent(new CustomEvent('adharra_active_product_changed'));
    return () => {
      localStorage.removeItem('adharra_active_product_id');
      window.dispatchEvent(new CustomEvent('adharra_active_product_changed'));
    };
  }, [selectedId, tab]);
  
  const [editMode, setEditMode]     = useState(false);
  const [editDraft, setEditDraft]   = useState(null);

  const [exportOpen, setExportOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [banner, setBanner]         = useState('');

  // Dynamically derive available categories and statuses
  const dynamicCategories = ['All', ...Array.from(new Set(products.map(p => p.category))).filter(Boolean)];
  const dynamicStatuses   = ['All', ...Array.from(new Set(products.map(p => p.status))).filter(Boolean)];

  const selectedProduct = products.find(p => p.id === selectedId) || products[0];

  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter   === 'All' || p.category === catFilter;
    const matchStatus = statusFilter === 'All' || p.status  === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const kpis = [
    { label: 'Total Products',      value: products.length,                                               icon: Package,      cls: 'kpi-icon-violet' },
    { label: 'Validated',           value: products.filter(p => p.status === 'Validated').length,        icon: CheckCircle2, cls: 'kpi-icon-green'  },
    { label: 'Needs Review',        value: products.filter(p => p.status === 'Pending Review').length,   icon: Clock,        cls: 'kpi-icon-amber'  },
    { label: 'Missing Data',        value: products.filter(p => p.status === 'Needs Revision').length,   icon: AlertTriangle,cls: 'kpi-icon-red'    },
  ];

  const showBanner = (msg) => { setBanner(msg); setTimeout(() => setBanner(''), 3500); };

  const startEditing = () => {
    // deep clone so we can edit nested specifications
    setEditDraft(JSON.parse(JSON.stringify(selectedProduct)));
    setEditMode(true);
  };

  const saveDetails = () => {
    productService.updateProduct(selectedProduct.id, editDraft);
    setEditMode(false);
    showBanner('Product details saved locally.');
  };

  const handleExport = (fmt) => {
    if (!selectedProduct) return;
    setExportOpen(false);
    let result;
    if (fmt === 'json') result = exportProductJson(selectedProduct);
    else if (fmt === 'csv') result = exportProductCsv(selectedProduct);
    else if (fmt === 'pdf') result = exportProductPdf(selectedProduct);
    if (result) showBanner(result.message);
  };

  const updateDraftSpec = (oldKey, newKey, newValue) => {
    setEditDraft(prev => {
      const next = { ...prev };
      const specs = { ...next.specifications };
      if (oldKey !== newKey) {
        delete specs[oldKey];
      }
      specs[newKey] = newValue;
      next.specifications = specs;
      return next;
    });
  };

  const addSpec = () => {
    setEditDraft(prev => {
      const next = { ...prev };
      next.specifications = { ...next.specifications, 'New Attribute': '' };
      return next;
    });
  };

  const removeSpec = (key) => {
    setEditDraft(prev => {
      const next = { ...prev };
      const specs = { ...next.specifications };
      delete specs[key];
      next.specifications = specs;
      return next;
    });
  };

  return (
    <div className="epage-root">
      {/* Header */}
      <div className="epage-header">
        <div className="epage-header-inner">
          <div className="epage-title-block">
            <div className="epage-breadcrumb">
              <span>Dashboard</span>
              <span className="epage-breadcrumb-sep">/</span>
              <span>Products</span>
            </div>
            <h1 className="epage-title">Products</h1>
            <p className="epage-subtitle">Manage and explore your product catalog</p>
          </div>
          <div className="epage-header-actions">
            <div className="epage-search-bar">
              <Search size={14} className="epage-search-icon" />
              <input
                className="epage-input epage-search-input"
                placeholder="Search products, SKU, category…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <button className="btn-secondary" onClick={() => setFilterOpen(o => !o)}>
                <Filter size={14} /> Filter
                {(catFilter !== 'All' || statusFilter !== 'All') && (
                  <span style={{ marginLeft: 6, background: 'var(--accent)', color: 'var(--accent-contrast)', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                    {(catFilter !== 'All' ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0)}
                  </span>
                )}
              </button>
              {filterOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setFilterOpen(false)} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', minWidth: 260, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: 16 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>FILTER PRODUCTS</div>
                    
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: '0.71rem', color: '#64748B', marginBottom: 6 }}>Category</div>
                      <select className="epage-select" style={{ width: '100%' }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                        {dynamicCategories.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: '0.71rem', color: '#64748B', marginBottom: 6 }}>Status</div>
                      <select className="epage-select" style={{ width: '100%' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        {dynamicStatuses.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                      <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setCatFilter('All'); setStatusFilter('All'); }}>Clear</button>
                       <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none' }} onClick={() => setFilterOpen(false)}>Apply</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="epage-body">
        {/* Sidebar */}
        <aside className="epage-sidebar">
          <div className="epage-sidebar-label">Products</div>
          <nav className="epage-sidebar-nav">
            {TABS.map(t => (
              <button key={t.id} className={`epage-sidebar-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="epage-content">
          {banner && (
            <div className="epage-success-banner"><CheckCircle2 size={15} />{banner}</div>
          )}

          {/* ---- CATALOG ---- */}
          {tab === 'catalog' && (
            <>
              <div className="epage-kpi-grid">
                {kpis.map(k => (
                  <div key={k.label} className="epage-kpi-card">
                    <div className="epage-kpi-top">
                      <span className="epage-kpi-label">{k.label}</span>
                      <div className={`epage-kpi-icon ${k.cls}`}><k.icon size={15} /></div>
                    </div>
                    <div className="epage-kpi-value">{k.value}</div>
                  </div>
                ))}
              </div>

              {/* Product count label */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: '#94A3B8', fontWeight: 500 }}>
                  {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
                </span>
                {(catFilter !== 'All' || statusFilter !== 'All') && (
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>matching selected filters</span>
                )}
              </div>

              {filtered.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12, padding: '40px 20px', textAlign: 'center' }}>
                  <Search size={32} style={{ color: '#64748B', marginBottom: 12, opacity: 0.5 }} />
                  <div style={{ color: '#E2E8F0', fontSize: '0.9rem', marginBottom: 4, fontWeight: 500 }}>No products found</div>
                  <div style={{ color: '#64748B', fontSize: '0.82rem', marginBottom: 16 }}>No products match the selected filters.</div>
                  <button className="btn-secondary" onClick={() => { setCatFilter('All'); setStatusFilter('All'); setSearch(''); }}>Clear Filters & Search</button>
                </div>
              ) : (
                <div className="epage-panel">
                  <div className="epage-table-wrap">
                    <table className="epage-table">
                      <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>SKU</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Last Updated</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(p => (
                        <tr key={p.id}>
                          <td className="td-product-name" style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: 240 }}>{p.name}</td>
                          <td className="td-sku" style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.sku}</td>
                          <td>{p.category}</td>
                          <td><span className={`badge ${STATUS_COLORS[p.status] || 'badge-pending'}`}>{p.status}</span></td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{p.lastUpdated}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn-ghost" onClick={() => { setSelectedId(p.id); setTab('details'); setEditMode(false); }}>
                                <Eye size={13} /> View
                              </button>
                              <button className="btn-ghost" onClick={() => { setSelectedId(p.id); setTab('details'); setTimeout(() => {
                                // Start editing directly on switch
                                setEditDraft(JSON.parse(JSON.stringify(p)));
                                setEditMode(true);
                              }, 0); }}>
                                <Pencil size={13} /> Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}
            </>
          )}

          {/* ---- DETAILS ---- */}
          {tab === 'details' && selectedProduct && (
            <div className="epage-panel">
              <div className="epage-panel-header" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1, paddingRight: 16 }}>
                  {editMode ? (
                    <>
                      <input className="epage-input" style={{ fontSize: '1.2rem', fontWeight: 600, padding: '6px 12px', marginBottom: 4, width: '100%' }}
                        value={editDraft.name} onChange={e => setEditDraft({...editDraft, name: e.target.value})} />
                      <div className="epage-panel-subtitle">SKU: {selectedProduct.sku}</div>
                    </>
                  ) : (
                    <>
                      <div className="epage-panel-title">{selectedProduct.name}</div>
                      <div className="epage-panel-subtitle">SKU: {selectedProduct.sku}</div>
                    </>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginTop: 4 }}>
                  {!editMode
                    ? <button className="btn-secondary" onClick={startEditing}><Pencil size={13} /> Edit</button>
                    : <>
                        <button className="btn-secondary" onClick={() => setEditMode(false)}><X size={13} /> Cancel</button>
                        <button className="btn-primary" style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none' }} onClick={saveDetails}><Save size={13} /> Save</button>
                      </>
                  }
                  <div style={{ position: 'relative' }}>
                    <button className="btn-secondary" onClick={() => setExportOpen(o => !o)}><Download size={13} /> Export <ChevronDown size={12} style={{ marginLeft: 4 }}/></button>
                    {exportOpen && (
                      <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setExportOpen(false)} />
                        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 100, background: '#131A2B', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                          {['json', 'csv', 'pdf'].map(fmt => (
                            <button key={fmt} onClick={() => handleExport(fmt)}
                              style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', borderBottom: fmt !== 'pdf' ? '1px solid rgba(255,255,255,0.06)' : 'none', color: '#CBD5E1', fontSize: '0.82rem', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.12)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                              Export as {fmt.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="epage-panel-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 20 }}>
                  
                  {/* Category */}
                  <div>
                    <div style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Category</div>
                    {editMode ? (
                       <input className="epage-input" style={{ width: '100%', padding: '6px 10px', fontSize: '0.88rem' }}
                       value={editDraft.category} onChange={e => setEditDraft({...editDraft, category: e.target.value})} />
                    ) : (
                       <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{selectedProduct.category}</div>
                    )}
                  </div>

                  {/* Manufacturer */}
                  <div>
                    <div style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Manufacturer</div>
                    {editMode ? (
                       <input className="epage-input" style={{ width: '100%', padding: '6px 10px', fontSize: '0.88rem' }}
                       value={editDraft.manufacturer} onChange={e => setEditDraft({...editDraft, manufacturer: e.target.value})} />
                    ) : (
                       <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{selectedProduct.manufacturer}</div>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <div style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Status</div>
                    <span className={`badge ${STATUS_COLORS[selectedProduct.status] || 'badge-pending'}`}>{selectedProduct.status}</span>
                  </div>
                  
                  {/* Last Updated */}
                  <div>
                    <div style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Last Updated</div>
                    <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{selectedProduct.lastUpdated}</div>
                  </div>

                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Specifications</div>
                  {editMode && (
                    <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--accent)' }} onClick={addSpec}>
                      <Plus size={13} style={{ marginRight: 4 }} /> Add Spec
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {Object.entries(editMode ? (editDraft.specifications || {}) : (selectedProduct.specifications || {})).map(([k, v]) => (
                    <div key={k} style={{ background: 'var(--surface-secondary)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)' }}>
                      {editMode ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <input className="epage-input" style={{ flex: 1, padding: '4px 8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}
                              value={k}
                              onChange={e => updateDraftSpec(k, e.target.value, v)} 
                              placeholder="Attribute Name" />
                            <button className="btn-ghost" style={{ padding: 4, color: 'var(--danger)' }} onClick={() => removeSpec(k)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <input className="epage-input" style={{ width: '100%', padding: '4px 8px', fontSize: '0.88rem' }}
                            value={v}
                            onChange={e => updateDraftSpec(k, k, e.target.value)} 
                            placeholder="Value" />
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{k}</div>
                          <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{v}</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Sources Section */}
                {selectedProduct.sources && selectedProduct.sources.length > 0 && (
                  <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    <div style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      Sources ({selectedProduct.sources.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selectedProduct.sources.map(src => (
                        <div key={src.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                          <span style={{ fontWeight: 500 }}>{src.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>({src.type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product selector */}
                <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <div style={{ fontSize: '0.71rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Switch Product</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {products.map(p => (
                      <button key={p.id}
                        onClick={() => { setSelectedId(p.id); setEditMode(false); setEditDraft(null); }}
                        style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 500, background: p.id === selectedId ? 'var(--accent-soft)' : 'var(--surface-secondary)', border: `1px solid ${p.id === selectedId ? 'var(--accent-primary)' : 'var(--border)'}`, color: p.id === selectedId ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {p.sku}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

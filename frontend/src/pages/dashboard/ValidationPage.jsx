import React, { useState, useEffect } from 'react';
import {
  ClipboardCheck, CheckCircle2, X, Pencil, Clock,
  AlertTriangle, ChevronRight, Save, User, History, Trash2, RotateCcw
} from 'lucide-react';
import { productService } from '../../services/productService';
import { hitlService } from '../../services/hitlService';
import { validationRulesService } from '../../services/validationRulesService';
import './PageLayout.css';

const ACTION_COLORS = { 
  'Human Approved': 'badge-validated', 
  'Human Corrected': 'badge-corrected', 
  'Human Rejected': 'badge-critical', 
  'Pending Review': 'badge-pending' 
};

export default function ValidationPage() {
  const [queue, setQueue] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState('Pending Review');
  const [banner, setBanner] = useState('');
  
  // Correction Workspace Form State
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [correctedValue, setCorrectedValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');

  // Reload queue from hitlService on mount and when updates occur
  const loadQueue = async () => {
    const q = await hitlService.getQueue();
    setQueue(q);
    
    // Auto-select first pending or first item if none selected
    if (q.length > 0) {
      const activePending = q.find(i => i.status === 'Pending Review');
      if (activePending) {
        setSelectedId(activePending.id);
      } else {
        setSelectedId(q[0].id);
      }
    }
  };

  useEffect(() => {
    loadQueue();
    
    // Register listener for hitl updates
    const handleUpdate = () => {
      loadQueue();
    };
    window.addEventListener('adharra_hitl_updated', handleUpdate);
    window.addEventListener('adharra_products_updated', handleUpdate);
    
    return () => {
      window.removeEventListener('adharra_hitl_updated', handleUpdate);
      window.removeEventListener('adharra_products_updated', handleUpdate);
    };
  }, []);

  const selectedItem = queue.find(i => i.id === selectedId);
  const allProducts = productService.getProducts();
  const selectedProduct = selectedItem 
    ? allProducts.find(p => p.id === selectedItem.productId || p.sku === selectedItem.sku)
    : null;

  const showBanner = (msg) => { 
    setBanner(msg); 
    setTimeout(() => setBanner(''), 3000); 
  };

  const handleApprove = async () => {
    if (!selectedItem) return;
    await hitlService.approveItem(selectedItem.id);
    showBanner(`✓ Approved "${selectedItem.attribute}" for ${selectedItem.productName}.`);
    setIsCorrecting(false);
    
    // Select next pending item if exists
    const q = await hitlService.getQueue();
    setQueue(q);
    const next = q.find(i => i.id !== selectedItem.id && i.status === 'Pending Review');
    if (next) setSelectedId(next.id);
  };

  const handleReject = async () => {
    if (!selectedItem) return;
    const reason = window.prompt("Enter rejection reason:", "Data is incorrect / quality check failed");
    if (reason === null) return; // User cancelled
    
    await hitlService.rejectItem(selectedItem.id, reason);
    showBanner(`✕ Rejected "${selectedItem.attribute}" — returned to revision queue.`);
    setIsCorrecting(false);

    const q = await hitlService.getQueue();
    setQueue(q);
    const next = q.find(i => i.id !== selectedItem.id && i.status === 'Pending Review');
    if (next) setSelectedId(next.id);
  };

  const handleStartCorrect = () => {
    if (!selectedItem) return;
    setCorrectedValue(selectedItem.aiSuggestedValue || selectedItem.aiExtractedValue || '');
    setCorrectionReason('');
    setIsCorrecting(true);
  };

  const handleSaveCorrection = async () => {
    if (!selectedItem) return;
    if (!correctedValue.trim()) {
      alert("Please enter a corrected value.");
      return;
    }
    await hitlService.correctItem(selectedItem.id, correctedValue, correctionReason || 'Manual correction applied');
    showBanner(`✓ Corrected "${selectedItem.attribute}" to "${correctedValue}" and approved.`);
    setIsCorrecting(false);

    const q = await hitlService.getQueue();
    setQueue(q);
    const next = q.find(i => i.id !== selectedItem.id && i.status === 'Pending Review');
    if (next) setSelectedId(next.id);
  };

  const handleResetQueue = () => {
    if (window.confirm("Are you sure you want to reset the HITL review queue to default seed items?")) {
      hitlService.resetQueue();
      loadQueue();
      showBanner("Queue reset to default seed items.");
    }
  };

  const handleClearQueue = () => {
    if (window.confirm("Are you sure you want to clear the entire review queue?")) {
      hitlService.clearQueue();
      setQueue([]);
      setSelectedId('');
      showBanner("Queue cleared.");
    }
  };

  // Run validation rules
  const validationInfo = selectedProduct 
    ? validationRulesService.runValidation(selectedProduct, allProducts)
    : { isValid: true, results: [] };

  // Resolve source evidence
  const getEvidenceList = () => {
    if (!selectedProduct || !selectedItem) return [];
    const attr = selectedItem.attribute;
    
    // Find matching key in product evidence
    let evidenceList = selectedProduct.evidence?.[attr];
    if (!evidenceList) {
      // Fallback: try case-insensitive lookup
      const lower = attr.toLowerCase();
      const matchKey = Object.keys(selectedProduct.evidence || {}).find(k => 
        k.toLowerCase() === lower || lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)
      );
      if (matchKey) {
        evidenceList = selectedProduct.evidence[matchKey];
      }
    }
    
    if (evidenceList && evidenceList.length > 0) {
      return evidenceList.map(ev => {
        const src = selectedProduct.sources?.find(s => s.id === ev.sourceId);
        return {
          document: src ? src.name : 'Staged Datasheet',
          page: ev.page || (src?.name?.includes('datasheet') ? 'Page 3' : src?.name?.includes('catalog') ? 'Page 6' : 'Page 1'),
          text: ev.value
        };
      });
    }
    
    // Fallback if no specific evidence structured list
    return [{
      document: selectedProduct.sources?.[0]?.name || 'staged_document.pdf',
      page: 'Page 1',
      text: selectedItem.originalValue || 'N/A'
    }];
  };

  const evidenceList = getEvidenceList();

  const stats = hitlService.getStats();
  const visibleItems = filter === 'All' ? queue : queue.filter(i => i.status === filter);
  const recentHistory = queue.filter(i => i.status !== 'Pending Review');

  const kpis = [
    { label: 'Pending Review',  value: stats.pending, icon: Clock,        cls: 'kpi-icon-amber'  },
    { label: 'Approved',        value: stats.approved,       icon: CheckCircle2, cls: 'kpi-icon-green'  },
    { label: 'Rejected',        value: stats.rejected,       icon: X,            cls: 'kpi-icon-red'    },
  ];

  return (
    <div className="epage-root" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* HEADER */}
      <div className="epage-header" style={{ flexShrink: 0 }}>
        <div className="epage-header-inner" style={{ padding: '24px 32px' }}>
          <div className="epage-title-block">
            <div className="epage-breadcrumb">
              <span>Dashboard</span><span className="epage-breadcrumb-sep">/</span><span>Validation</span>
            </div>
            <h1 className="epage-title">Review & Validate</h1>
            <p className="epage-subtitle">Human-in-the-loop validation, policy rules enforcement, and evidence verification.</p>
          </div>
          <div className="epage-header-actions" style={{ display: 'flex', gap: 10 }}>
            <button className="btn-dash-secondary" onClick={handleResetQueue} title="Reset to initial seed items" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
              <RotateCcw size={13} /> Reset Seed
            </button>
            <button className="btn-dash-secondary" onClick={handleClearQueue} title="Clear review queue" style={{ padding: '6px 12px', fontSize: '0.78rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}>
              <Trash2 size={13} /> Clear All
            </button>
            <select 
              className="epage-select" 
              value={filter} 
              onChange={e => { setFilter(e.target.value); setIsCorrecting(false); }}
              style={{ minWidth: 160 }}
            >
              <option value="Pending Review">Pending Review</option>
              <option value="All">All Items</option>
              <option value="Human Approved">Approved</option>
              <option value="Human Corrected">Corrected</option>
              <option value="Human Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* WORKSPACE CONTENT (Scrollable) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 40px 32px' }}>
        
        {banner && (
          <div className="epage-success-banner" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={14} />
            <span>{banner}</span>
          </div>
        )}

        {/* KPIs */}
        <div className="epage-kpi-grid" style={{ marginBottom: 20 }}>
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

        {/* 2-Column Review Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 20, alignItems: 'start' }}>
          
          {/* Left: Review Queue */}
          <div className="epage-panel">
            <div className="epage-panel-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div className="epage-panel-title">Review Queue</div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{visibleItems.length} attributes</span>
            </div>
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              {visibleItems.map(item => {
                const isSelected = item.id === selectedId;
                return (
                  <div
                    key={item.id}
                    onClick={() => { setSelectedId(item.id); setIsCorrecting(false); }}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent-soft)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--accent)' : 'none',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {item.productName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
                          Attribute: <strong style={{ color: 'var(--text-primary)' }}>{item.attribute}</strong>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          SKU: {item.sku}
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Confidence:</span>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: item.confidenceScore >= 90 ? 'var(--success)' : item.confidenceScore >= 75 ? 'var(--warning)' : 'var(--danger)' }}>
                            {item.confidenceScore}%
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        <span className={`badge ${ACTION_COLORS[item.status]}`}>{item.status === 'Pending Review' ? 'pending' : item.status.replace('Human ', '').toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {visibleItems.length === 0 && (
                <div className="epage-empty" style={{ padding: 40, textAlign: 'center' }}>
                  <CheckCircle2 size={32} className="epage-empty-icon" style={{ color: 'var(--success)', opacity: 0.5, marginBottom: 8 }} />
                  <div className="epage-empty-title" style={{ fontSize: '0.88rem', fontWeight: 600 }}>All items reviewed!</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No attributes currently match the active filter.</div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Workspace Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {selectedItem ? (
              <div className="epage-panel" style={{ padding: 20 }}>
                <div className="epage-panel-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 16 }}>
                  <div>
                    <h3 className="epage-panel-title" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedItem.productName}</h3>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                      SKU: <code style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{selectedItem.sku}</code> · Category: <strong>{selectedItem.category}</strong>
                    </div>
                  </div>
                  <span className={`badge ${ACTION_COLORS[selectedItem.status]}`}>{selectedItem.status}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  
                  {/* Highlight Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Attribute under review</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{selectedItem.attribute}</div>
                    </div>
                    <div style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>AI Enriched Value</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', fontWeight: 700, fontFamily: 'monospace' }}>{selectedItem.aiEnrichedValue}</div>
                    </div>
                    <div style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Reason for review</div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AlertTriangle size={13} /> {selectedItem.reason}
                      </div>
                    </div>
                  </div>

                  {/* RULE CHECKS */}
                  <div>
                    <h4 style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Rule Checks</h4>
                    <div className="epage-table-wrap" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
                      <table className="epage-table" style={{ fontSize: '0.78rem' }}>
                        <thead>
                          <tr>
                            <th>Rule Category</th>
                            <th>Rule</th>
                            <th>Value Checked</th>
                            <th>Result</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validationInfo.results.map((r, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600 }}>{r.category}</td>
                              <td style={{ color: 'var(--text-secondary)' }}>{r.rule}</td>
                              <td style={{ fontFamily: 'monospace' }}>{String(r.value)}</td>
                              <td>
                                <span className={`badge ${r.result === 'PASSED' ? 'badge-validated' : 'badge-critical'}`}>
                                  {r.result}
                                </span>
                              </td>
                              <td style={{ color: r.result === 'PASSED' ? 'var(--text-muted)' : 'var(--danger)', fontWeight: r.result === 'PASSED' ? 400 : 600 }}>
                                {r.reason}
                              </td>
                            </tr>
                          ))}
                          {validationInfo.results.length === 0 && (
                            <tr>
                              <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 12 }}>No validation rules configured for this product.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SOURCE EVIDENCE */}
                  <div>
                    <h4 style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Source Evidence References</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {evidenceList.map((ev, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '220px 80px 1fr', gap: 12, padding: '10px 14px', background: 'var(--surface-secondary)', border: '1px solid var(--border)', borderRadius: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>{ev.document}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ev.page}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace', borderLeft: '2px solid var(--accent-border)', paddingLeft: 10 }}>
                            {ev.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Human Decision Workspace */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18, marginTop: 10 }}>
                    {!isCorrecting ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button 
                            className="btn-primary" 
                            onClick={handleApprove}
                            disabled={selectedItem.status !== 'Pending Review'}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            <CheckCircle2 size={14} /> Approve Value
                          </button>
                          <button 
                            className="btn-dash-secondary" 
                            onClick={handleStartCorrect}
                            disabled={selectedItem.status !== 'Pending Review'}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent-primary)', borderColor: 'var(--accent-border)' }}
                          >
                            <Pencil size={13} /> Correct Value
                          </button>
                          <button 
                            className="btn-dash-secondary" 
                            onClick={handleReject}
                            disabled={selectedItem.status !== 'Pending Review'}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          >
                            <X size={14} /> Reject Value
                          </button>
                        </div>
                        {selectedItem.status !== 'Pending Review' && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Reviewed on {selectedItem.reviewedAt?.split('T')[0]} by {selectedItem.reviewedBy}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 8, padding: 16 }}>
                        <h5 style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: 12 }}>Manual Correction Workspace</h5>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>AI Value:</span>
                            <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{selectedItem.aiEnrichedValue}</span>
                          </div>
                          
                          <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Correct Value:</label>
                            <input 
                              className="epage-input" 
                              style={{ width: '100%', padding: '6px 12px', fontSize: '0.85rem' }} 
                              value={correctedValue}
                              onChange={e => setCorrectedValue(e.target.value)}
                              placeholder="Enter the correct value"
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4, fontWeight: 600 }}>Reason / Notes:</label>
                            <input 
                              className="epage-input" 
                              style={{ width: '100%', padding: '6px 12px', fontSize: '0.85rem' }} 
                              value={correctionReason}
                              onChange={e => setCorrectionReason(e.target.value)}
                              placeholder="e.g. AI selected maximum pressure instead of operating pressure"
                            />
                          </div>

                          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                            <button className="btn-primary" onClick={handleSaveCorrection}>
                              Save & Approve
                            </button>
                            <button className="btn-dash-secondary" onClick={() => setIsCorrecting(false)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ) : (
              <div className="epage-panel" style={{ padding: 40, textAlign: 'center' }}>
                <ClipboardCheck size={40} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: 12 }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>No item selected</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select an attribute from the review queue list to verify it.</p>
              </div>
            )}

            {/* Recent Review History Table */}
            <div className="epage-panel">
              <div className="epage-panel-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
                <div className="epage-panel-title">Recent Review History</div>
                <History size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div className="epage-table-wrap">
                <table className="epage-table" style={{ fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Attribute</th>
                      <th>AI Value</th>
                      <th>Corrected Value</th>
                      <th>Action</th>
                      <th>Reviewer</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentHistory.map((h) => (
                      <tr key={h.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{h.productName}</td>
                        <td style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{h.attribute}</td>
                        <td style={{ fontFamily: 'monospace' }}>{h.aiEnrichedValue}</td>
                        <td style={{ fontFamily: 'monospace', color: h.correctedValue ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {h.correctedValue || '—'}
                        </td>
                        <td>
                          <span className={`badge ${h.status === 'Human Approved' ? 'badge-validated' : h.status === 'Human Corrected' ? 'badge-corrected' : 'badge-critical'}`}>
                            {h.status.replace('Human ', '')}
                          </span>
                        </td>
                        <td>{h.reviewedBy || 'System'}</td>
                        <td style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {h.reviewedAt ? h.reviewedAt.split('T')[0] : 'Just now'}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600 }}>Accepted</span>
                        </td>
                      </tr>
                    ))}
                    {recentHistory.length === 0 && (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 16 }}>No items have been reviewed yet in this session.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

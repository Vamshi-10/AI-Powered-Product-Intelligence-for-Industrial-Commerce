import React, { useState } from 'react';
import { AlertTriangle, XCircle, Copy, Zap, CheckCircle2, RefreshCw, ChevronRight, X } from 'lucide-react';
import './PageLayout.css';

const SEV = { high: 'badge-critical', medium: 'badge-pending', low: 'badge-corrected' };
const SEV_DOT = { high: '#F87171', medium: '#FBBF24', low: '#818CF8' };

export default function DataQualityPage() {
  const [filter, setFilter] = useState('All');
  const [fixing, setFixing] = useState(false);
  const [banner, setBanner] = useState('');
  
  const [showDupeModal, setShowDupeModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeIssue, setActiveIssue] = useState(null);

  const [issues, setIssues] = useState([
    { id: 1, type: 'Missing', product: 'Emerson DeltaV', attribute: 'Max Temp Rating', value: '—', suggested: '', issue: 'Missing Field', severity: 'medium', actionText: 'Review' },
    { id: 2, type: 'Missing', product: 'Siemens ET 200SP', attribute: 'Bus Protocol', value: '—', suggested: '', issue: 'Missing Field', severity: 'high', actionText: 'Review' },
    { id: 3, type: 'Missing', product: 'ABB ACS880 Drive', attribute: 'IP Rating', value: '—', suggested: '', issue: 'Missing Field', severity: 'medium', actionText: 'Review' },
    
    { id: 4, type: 'Invalid', product: 'ABB ACS880 Drive', attribute: 'Voltage', value: '400V/50Hz-EXTRA', suggested: '400 V, 50 Hz', issue: 'Format mismatch', severity: 'medium', actionText: 'Fix' },
    { id: 5, type: 'Invalid', product: '3051S Pressure Transmitter', attribute: 'Range', value: '0-250 bar (!!)', suggested: '0-250 bar', issue: 'Special chars', severity: 'low', actionText: 'Fix' },
    { id: 6, type: 'Invalid', product: 'Emerson DeltaV', attribute: 'Memory', value: 'N.A.', suggested: 'N/A', issue: 'Non-standard null', severity: 'low', actionText: 'Fix' },
    { id: 7, type: 'Invalid', product: 'Siemens ET 200SP', attribute: 'Temperature', value: '-200 to 85°C', suggested: '-20 to 85°C', issue: 'Abnormal range', severity: 'medium', actionText: 'Fix' },

    { id: 8, type: 'Duplicates', product: 'ABB ACS880-04-011A-4', productB: 'ABB ACS880 11kW 400V', attribute: '—', value: '—', suggested: '', issue: 'Possible Duplicate', severity: 'high', actionText: 'Compare' },
    { id: 9, type: 'Duplicates', product: 'Grundfos CR 15-4 HQQE', productB: 'Grundfos CR15-4', attribute: '—', value: '—', suggested: '', issue: 'Possible Duplicate', severity: 'high', actionText: 'Compare' },
    
    { id: 10, type: 'Unit Conflicts', product: 'Grundfos CR 15-4', attribute: 'Flow Rate', value: '250 L/min', suggested: '15 m³/h', issue: 'Unit Conflict', severity: 'low', actionText: 'Normalize' },
    { id: 11, type: 'Unit Conflicts', product: 'ABB ACS880', attribute: 'Power', value: '14.8 HP', suggested: '11 kW', issue: 'Unit Conflict', severity: 'low', actionText: 'Normalize' },
    { id: 12, type: 'Unit Conflicts', product: 'Festo ADVU-40-75', attribute: 'Stroke', value: '2.95 in', suggested: '75 mm', issue: 'Unit Conflict', severity: 'low', actionText: 'Normalize' },
  ]);

  const showBannerMessage = (msg) => { setBanner(msg); setTimeout(() => setBanner(''), 3000); };

  const handleActionClick = (issue) => {
    if (issue.actionText === 'Compare') {
      setActiveIssue(issue);
      setShowDupeModal(true);
    } else {
      setActiveIssue(issue);
      setShowDrawer(true);
    }
  };

  const resolveIssueLocally = (issueId, resolutionText) => {
    setIssues(prev => prev.filter(i => i.id !== issueId));
    showBannerMessage(resolutionText);
    setShowDrawer(false);
    setShowDupeModal(false);
    setActiveIssue(null);
  };

  const autoFix = () => {
    if (window.confirm("5 safe issues can be corrected automatically. Proceed?")) {
      setFixing(true);
      setTimeout(() => {
        setIssues(prev => prev.filter(i => !(i.type === 'Invalid' && i.severity === 'low') && !(i.type === 'Unit Conflicts' && i.severity === 'low')));
        setFixing(false);
        showBannerMessage('Auto-resolved safe issues (formatting & standard units).');
      }, 1000);
    }
  };

  const counts = {
    Missing: issues.filter(i => i.type === 'Missing').length,
    Invalid: issues.filter(i => i.type === 'Invalid').length,
    Duplicates: issues.filter(i => i.type === 'Duplicates').length,
    'Unit Conflicts': issues.filter(i => i.type === 'Unit Conflicts').length,
  };

  const displayedIssues = filter === 'All' ? issues : issues.filter(i => i.type === filter);

  return (
    <div className="epage-root" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* HEADER */}
      <div className="epage-header" style={{ flexShrink: 0 }}>
        <div className="epage-header-inner" style={{ padding: '24px 32px' }}>
          <div className="epage-title-block">
            <h1 className="epage-title">Data Quality</h1>
            <p className="epage-subtitle">Detect and resolve product data issues before validation.</p>
          </div>
          <div className="epage-header-actions">
            <button 
              className="btn-primary" 
              onClick={autoFix} 
              disabled={fixing}
              style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', padding: '8px 16px', fontSize: '0.85rem' }}
            >
              {fixing ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
              {fixing ? 'Fixing…' : 'Auto-Fix Safe Issues'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 40px 32px', position: 'relative' }}>
        
        {banner && (
          <div className="epage-success-banner" style={{ marginBottom: 20 }}>
            <CheckCircle2 size={14} />{banner}
          </div>
        )}

        {/* HEALTH STRIP */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 24,
          marginBottom: 24
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: 150 }}>Catalog Quality Health</div>
          <div style={{ flex: 1, height: 6, background: 'var(--surface-secondary)', borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: '82%', background: 'var(--accent)', height: '100%' }}></div>
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)' }}>82% Ready</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>12 issues / 6 products</div>
        </div>

        {/* CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          
          {[
            { label: 'Missing Fields', count: counts.Missing, icon: AlertTriangle, filterKey: 'Missing', color: '#FBBF24' },
            { label: 'Invalid Values', count: counts.Invalid, icon: XCircle, filterKey: 'Invalid', color: 'var(--danger)' },
            { label: 'Duplicate Records', count: counts.Duplicates, icon: Copy, filterKey: 'Duplicates', color: '#FBBF24' },
            { label: 'Unit Conflicts', count: counts['Unit Conflicts'], icon: Zap, filterKey: 'Unit Conflicts', color: 'var(--accent-primary)' }
          ].map(c => (
            <div 
              key={c.label} 
              onClick={() => setFilter(c.filterKey)}
              style={{
                background: filter === c.filterKey ? 'var(--accent-soft)' : 'var(--surface)',
                border: filter === c.filterKey ? '1px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 8, padding: '16px', height: '110px', display: 'flex', flexDirection: 'column',
                cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
                boxShadow: filter === c.filterKey ? '0 0 15px var(--accent-glow)' : 'none'
              }}
              onMouseEnter={(e) => { if(filter !== c.filterKey) e.currentTarget.style.borderColor = 'var(--accent-border)'; }}
              onMouseLeave={(e) => { if(filter !== c.filterKey) e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <c.icon size={16} style={{ position: 'absolute', top: 16, right: 16, color: c.color }} />
              <div style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1 }}>{c.count}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: 'auto' }}>{c.label}</div>
            </div>
          ))}

        </div>

        {/* FILTER BAR */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {['All', 'Missing', 'Invalid', 'Duplicates', 'Unit Conflicts'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? 'var(--accent)' : 'var(--surface)',
                border: filter === f ? '1px solid var(--accent)' : '1px solid var(--border)',
                color: filter === f ? 'var(--accent-contrast)' : 'var(--text-secondary)',
                padding: '6px 16px',
                borderRadius: 999,
                fontSize: '0.78rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {f === 'All' ? 'All Issues' : f}
            </button>
          ))}
        </div>

        {/* TABLE */}
        <div className="epage-panel" style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="epage-panel-header" style={{ padding: '16px 20px' }}>
            <div className="epage-panel-title">Quality Issues</div>
          </div>
          <div className="epage-table-wrap">
            <table className="epage-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Product</th>
                  <th style={{ width: '15%' }}>Attribute</th>
                  <th style={{ width: '20%' }}>Current Value</th>
                  <th style={{ width: '15%' }}>Issue</th>
                  <th style={{ width: '15%' }}>Severity</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedIssues.map(issue => (
                  <tr key={issue.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {issue.product}
                      {issue.productB && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>↔ {issue.productB}</div>}
                    </td>
                    <td style={{ color: 'var(--accent-primary)' }}>{issue.attribute}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{issue.value}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>{issue.issue}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: SEV_DOT[issue.severity] }}></div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{issue.severity}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        className="btn-secondary" 
                        style={{ fontSize: '0.75rem', padding: '4px 12px', background: 'var(--surface-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} 
                        onClick={() => handleActionClick(issue)}
                      >
                        {issue.actionText}
                      </button>
                    </td>
                  </tr>
                ))}
                {displayedIssues.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px 0', textAlign: 'center' }}>
                      <div className="epage-empty" style={{ margin: '0 auto' }}>
                        <CheckCircle2 size={28} className="epage-empty-icon" style={{ color: 'var(--success)' }} />
                        <div className="epage-empty-title">No issues found</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* DRAWER FOR FIX / NORMALIZE / REVIEW */}
      {showDrawer && activeIssue && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9998 }} onClick={() => setShowDrawer(false)}></div>
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px', 
            background: 'var(--surface)', borderLeft: '1px solid var(--border)',
            zIndex: 9999, display: 'flex', flexDirection: 'column', boxShadow: '-10px 0 30px rgba(0,0,0,0.15)'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Issue Details</h3>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setShowDrawer(false)}><X size={18} /></button>
            </div>
            
            <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Product</div>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600 }}>{activeIssue.product}</div>
              </div>
              
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attribute</div>
                <div style={{ fontSize: '0.95rem', color: 'var(--accent-primary)' }}>{activeIssue.attribute}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <div style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 4 }}>ISSUE TYPE</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{activeIssue.issue}</div>
                </div>
                <div style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: 4 }}>SEVERITY</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: SEV_DOT[activeIssue.severity] }}></div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{activeIssue.severity}</span>
                  </div>
                </div>
              </div>

              {activeIssue.type !== 'Missing' && (
                <div style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)', padding: 16, borderRadius: 8, marginBottom: 24 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>BEFORE</div>
                  <div style={{ fontFamily: 'monospace', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 12 }}>{activeIssue.value}</div>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: 12 }}><ChevronRight size={16} style={{ transform: 'rotate(90deg)' }}/></div>
                  
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>AFTER</div>
                  <div style={{ fontFamily: 'monospace', color: 'var(--success)', fontSize: '0.85rem' }}>{activeIssue.suggested}</div>
                </div>
              )}

              {activeIssue.type === 'Missing' && (
                <div style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)', padding: 16, borderRadius: 8, marginBottom: 24 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>SUGGESTED ACTION</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>Verify missing value against original manufacturer datasheet or manual override.</div>
                </div>
              )}
            </div>
            
            <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setShowDrawer(false)}>Cancel</button>
              {activeIssue.type === 'Missing' ? (
                 <button className="btn-primary" style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none' }} onClick={() => resolveIssueLocally(activeIssue.id, 'Sent to validation queue')}>Send to Review</button>
              ) : (
                 <button className="btn-primary" style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none' }} onClick={() => resolveIssueLocally(activeIssue.id, `Applied fix for ${activeIssue.attribute}`)}>Apply Fix</button>
              )}
            </div>
          </div>
        </>
      )}

      {/* DUPLICATE MODAL (WIDE) */}
      {showDupeModal && activeIssue && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="epage-panel" style={{ width: '90%', maxWidth: 700, padding: 32, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>Compare Duplicate Records</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
              <div style={{ background: 'var(--surface-secondary)', padding: 20, borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4, letterSpacing: '0.05em' }}>PRODUCT A</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: 12 }}>{activeIssue.product}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Match Confidence: <span style={{ color: 'var(--danger)' }}>High</span></div>
              </div>
              <div style={{ background: 'var(--surface-secondary)', padding: 20, borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4, letterSpacing: '0.05em' }}>PRODUCT B</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: 12 }}>{activeIssue.productB}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Source: <span style={{ color: 'var(--text-primary)' }}>New Upload</span></div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" style={{ padding: '8px 16px' }} onClick={() => resolveIssueLocally(activeIssue.id, 'Marked as Not Duplicate')}>Not Duplicate</button>
              <button className="btn-secondary" style={{ padding: '8px 16px' }} onClick={() => resolveIssueLocally(activeIssue.id, 'Kept Product A')}>Keep A</button>
              <button className="btn-secondary" style={{ padding: '8px 16px' }} onClick={() => resolveIssueLocally(activeIssue.id, 'Kept Product B')}>Keep B</button>
              <button className="btn-primary" style={{ padding: '8px 16px', background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none' }} onClick={() => resolveIssueLocally(activeIssue.id, 'Records Merged')}>Merge</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

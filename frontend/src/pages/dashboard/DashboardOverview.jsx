import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, Cpu, Clock, CheckCircle2, UploadCloud,
  ArrowRight, Sparkles, ShieldCheck, ClipboardCheck,
  AlertTriangle, TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { productService } from '../../services/productService';
import '../Dashboard.css';

const DashboardOverview = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const products = productService.getProducts();

  const totalProducts    = products.length;
  const validated        = products.filter(p => p.status === 'Validated').length;
  const pendingReview    = products.filter(p => p.status === 'Pending Review').length;
  const dataIssues       = products.filter(p => p.qualityScore < 75).length;

  const handleUpload = () => {
    if (!isAuthenticated) navigate('/login', { state: { from: { pathname: '/upload' } } });
    else navigate('/upload');
  };

  const recentProducts = [...products]
    .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
    .slice(0, 5);

  const STATUS_COLORS = {
    'Validated':     '#34D399',
    'Pending Review':'#FBBF24',
    'In Processing': '#A78BFA',
    'Needs Revision':'#F87171',
  };

  return (
    <div className="dash-overview-wrapper">
      <div className="home-max-wrapper">

        {/* Header */}
        <header className="home-header">
          <div>
            <h1 className="home-title">Industrial AI Dashboard</h1>
            <p className="home-subtitle">AI-powered product intelligence for industrial commerce</p>
          </div>
          <button className="home-upload-btn" onClick={handleUpload} id="home-upload-btn">
            <UploadCloud size={16} /> Upload Data
          </button>
        </header>

        {/* KPI Cards */}
        <section className="home-summary-section" aria-label="Product Intelligence Summary">
          <div className="home-summary-grid">
            <div className="home-stat-card">
              <div className="home-stat-top">
                <span className="home-stat-title">Total Products</span>
                <div className="home-stat-icon-wrap icon-violet"><Package size={17} /></div>
              </div>
              <div className="home-stat-val">{totalProducts}</div>
              <div className="home-stat-sub">in the catalog</div>
            </div>

            <div className="home-stat-card">
              <div className="home-stat-top">
                <span className="home-stat-title">Validated</span>
                <div className="home-stat-icon-wrap icon-green"><CheckCircle2 size={17} /></div>
              </div>
              <div className="home-stat-val">{validated}</div>
              <div className="home-stat-sub">ready to publish</div>
            </div>

            <div className="home-stat-card">
              <div className="home-stat-top">
                <span className="home-stat-title">Needs Review</span>
                <div className="home-stat-icon-wrap icon-amber"><Clock size={17} /></div>
              </div>
              <div className="home-stat-val">{pendingReview}</div>
              <div className="home-stat-sub">in validation queue</div>
            </div>

            <div className="home-stat-card">
              <div className="home-stat-top">
                <span className="home-stat-title">Data Issues</span>
                <div className="home-stat-icon-wrap icon-red"><AlertTriangle size={17} /></div>
              </div>
              <div className="home-stat-val">{dataIssues}</div>
              <div className="home-stat-sub">low confidence score</div>
            </div>
          </div>
        </section>

        {/* Enterprise Bulk Ingestion Summary */}
        <section style={{ margin: '0 0 24px 0', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Enterprise Bulk Ingestion Summary</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Overall catalog batch ingestion status across supplier channels.</p>
            </div>
            
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: 'Uploaded', value: 500, color: 'var(--text-primary)' },
                { label: 'Processed', value: 470, color: 'var(--success)' },
                { label: 'Needs Review', value: 24, color: 'var(--warning)' },
                { label: 'Failed', value: 6, color: 'var(--danger)' }
              ].map(stat => (
                <div key={stat.label} style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)', padding: '6px 16px', borderRadius: 8, textAlign: 'center', minWidth: 100 }}>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>{stat.label}</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: stat.color, marginTop: 2 }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="home-actions-section" aria-label="Quick Actions">
          <h2 className="home-section-title">Quick Actions</h2>
          <div className="home-actions-grid">
            {[
              { label: 'Upload Data',      desc: 'Import catalogs, PDFs, datasheets',     icon: UploadCloud,   color: 'var(--accent)', onClick: handleUpload,                          id: 'qa-upload'     },
              { label: 'View Products',    desc: 'Browse and manage your product catalog', icon: Package,       color: '#3B82F6', onClick: () => navigate('/dashboard/products'), id: 'qa-products'   },
              { label: 'AI Intelligence', desc: 'Run extraction and enrichment pipeline', icon: Sparkles,      color: 'var(--accent)', onClick: () => navigate('/dashboard/ai'),       id: 'qa-ai'         },
              { label: 'Review & Validate',desc: 'Approve or correct AI-flagged fields',  icon: ClipboardCheck,color: '#34D399', onClick: () => navigate('/dashboard/validation'),id: 'qa-validate'   },
            ].map(a => (
              <button key={a.label} id={a.id} className="home-action-card" onClick={a.onClick}>
                <div className="home-action-icon" style={{ background: `${a.color}18`, border: `1px solid ${a.color}30` }}>
                  <a.icon size={20} style={{ color: a.color }} />
                </div>
                <div className="home-action-body">
                  <div className="home-action-label">{a.label}</div>
                  <div className="home-action-desc">{a.desc}</div>
                </div>
                <ArrowRight size={16} className="home-action-arrow" />
              </button>
            ))}
          </div>
        </section>

        {/* Workflow Pipeline */}
        <section className="home-pipeline-section" aria-label="Workflow Pipeline">
          <h2 className="home-section-title">ADHARRA Workflow</h2>
          <div className="home-pipeline">
            {[
              { step: '1', label: 'Upload',           icon: UploadCloud,   path: '/upload',                   active: true  },
              { step: '2', label: 'AI Processing',    icon: Cpu,           path: '/dashboard/ai',              active: true  },
              { step: '3', label: 'Data Quality',     icon: ShieldCheck,   path: '/dashboard/quality',         active: true  },
              { step: '4', label: 'Review & Validate',icon: ClipboardCheck,path: '/dashboard/validation',      active: pendingReview > 0 },
              { step: '5', label: 'Products',         icon: Package,       path: '/dashboard/products',        active: validated > 0 },
            ].map((s, idx, arr) => {
              const Icon = s.icon;
              return (
                <React.Fragment key={s.step}>
                  <div className={`home-pipeline-step ${s.active ? 'home-pipeline-step--active' : ''}`}
                    onClick={() => navigate(s.path)} style={{ cursor: 'pointer' }}>
                    <div className="home-pipeline-dot">
                      <Icon size={14} />
                    </div>
                    <div className="home-pipeline-label">{s.label}</div>
                  </div>
                  {idx < arr.length - 1 && <div className="home-pipeline-connector" />}
                </React.Fragment>
              );
            })}
          </div>
        </section>

        {/* Recent Products */}
        <section className="home-recent-section" aria-label="Recent Products">
          <div className="home-section-header">
            <h2 className="home-section-title" style={{ margin: 0 }}>Recent Products</h2>
            <Link to="/dashboard/products" className="home-view-all">View all <ArrowRight size={13} /></Link>
          </div>
          <div className="home-recent-table-wrap">
            <table className="home-recent-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Quality</th>
                </tr>
              </thead>
              <tbody>
                {recentProducts.map(p => (
                  <tr key={p.id} onClick={() => navigate('/dashboard/products')} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{p.sku}</td>
                    <td>{p.category}</td>
                    <td>
                      <span className={`badge ${
                        p.status === 'Validated' ? 'badge-validated' :
                        p.status === 'Pending Review' ? 'badge-pending' :
                        p.status === 'In Processing' ? 'badge-processing' : 'badge-missing'
                      }`}>{p.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 48, height: 3, background: 'var(--border)', borderRadius: 999 }}>
                          <div style={{ width: `${p.qualityScore}%`, height: '100%', borderRadius: 999, background: p.qualityScore >= 90 ? '#34D399' : p.qualityScore >= 75 ? '#FBBF24' : '#F87171' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: p.qualityScore >= 90 ? '#34D399' : p.qualityScore >= 75 ? '#FBBF24' : '#F87171' }}>{p.qualityScore}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardOverview;

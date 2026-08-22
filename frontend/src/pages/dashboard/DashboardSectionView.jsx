import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Plus, 
  UploadCloud, 
  ArrowRight, 
  Info, 
  Sparkles, 
  Package, 
  Layers, 
  CheckCircle2, 
  TrendingUp, 
  Database, 
  Settings, 
  HelpCircle, 
  FileSpreadsheet, 
  Cpu, 
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckSquare,
  FileText,
  AlertTriangle,
  Zap,
  Sliders,
  Send,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  Monitor,
  Download
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { productService } from '../../services/productService';
import { 
  INITIAL_CATEGORIES, 
  INITIAL_BRANDS, 
  INITIAL_VALIDATION_RULES, 
  INITIAL_DUPLICATES, 
  INITIAL_MISSING_VALUES, 
  INITIAL_ANOMALIES, 
  INITIAL_RECOMMENDATIONS, 
  INITIAL_INTEGRATIONS 
} from '../../services/mockDataService';
import { exportProductJson } from '../../utils/exportJson';
import { exportProductCsv } from '../../utils/exportCsv';
import { exportProductPdf } from '../../utils/exportPdf';
import './DashboardSectionView.css';

/* ============================================================
   ExportInlineDropdown — small export button used inside tables
   for validated products in the Validation Approval Queue.
   Keeps its own open/close state so it is independent per row.
   ============================================================ */
const ExportInlineDropdown = ({ product, onExport }) => {
  const [open, setOpen] = React.useState(false);

  if (!product) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="btn-table-action"
        id={`export-inline-btn-${product.id}`}
        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        title="Export Final Intelligence"
      >
        <Download size={13} />
        <span>Export</span>
        <ChevronDown size={11} />
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              right: 0,
              zIndex: 100,
              background: 'var(--bg-card, #1e1e2e)',
              border: '1px solid var(--border-card, rgba(255,255,255,0.1))',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
              minWidth: '175px',
              overflow: 'hidden',
            }}
            role="menu"
            aria-label="Export format options"
          >
            {[
              { format: 'json', label: 'Export as JSON', icon: '{ }' },
              { format: 'csv',  label: 'Export as CSV',  icon: '⊞' },
              { format: 'pdf',  label: 'Export as PDF',  icon: '⬜' },
            ].map(({ format, label, icon }) => (
              <button
                key={format}
                type="button"
                role="menuitem"
                id={`export-table-${format}-${product.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '9px 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: format !== 'pdf' ? '1px solid var(--border-card, rgba(255,255,255,0.07))' : 'none',
                  color: 'var(--text-primary, #e2e8f0)',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(138,92,246,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                onClick={() => { setOpen(false); onExport(format, product); }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: '0.88rem', color: 'var(--accent-end, #a78bfa)', minWidth: '18px' }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const DashboardSectionView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { themeMode, setThemeMode, resolvedTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();

  // Helper to protect mutating actions and redirect to login if unauthenticated
  const requireAuth = (actionCallback) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return false;
    }
    if (actionCallback) actionCallback();
    return true;
  };

  // Shared state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [successBanner, setSuccessBanner] = useState('');

  // Export dropdown state
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  // 1. Products State
  const [productsList, setProductsList] = useState(() => productService.getProducts());

  useEffect(() => {
    const handleUpdate = () => {
      setProductsList(productService.getProducts());
    };
    window.addEventListener('adharra_products_updated', handleUpdate);
    return () => window.removeEventListener('adharra_products_updated', handleUpdate);
  }, []);
  const [selectedSku, setSelectedSku] = useState(productsList[0]?.sku || '');
  const [editedProductSpecs, setEditedProductSpecs] = useState({});

  // 2. AI Processing Simulation State
  const [simRunning, setSimRunning] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [simCurrentStage, setSimCurrentStage] = useState(1);
  const [simLogs, setSimLogs] = useState([
    '[SYSTEM] AI Processing pipeline ready.',
    '[SYSTEM] Staged 8 catalog items for neural extraction.'
  ]);
  const [simFinished, setSimFinished] = useState(false);

  // 3. Validation State
  const [validationQueue, setValidationQueue] = useState(productsList);

  useEffect(() => {
    setValidationQueue(productsList);
  }, [productsList]);

  const [validationRules, setValidationRules] = useState(() => {
    const stored = localStorage.getItem('adharra_validation_rules');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    localStorage.setItem('adharra_validation_rules', JSON.stringify(INITIAL_VALIDATION_RULES));
    return INITIAL_VALIDATION_RULES;
  });
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleCond, setNewRuleCond] = useState('');

  // 4. Data Quality State
  const [duplicatesList, setDuplicatesList] = useState(() => {
    const stored = localStorage.getItem('adharra_duplicates');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    localStorage.setItem('adharra_duplicates', JSON.stringify(INITIAL_DUPLICATES));
    return INITIAL_DUPLICATES;
  });
  const [missingValuesList, setMissingValuesList] = useState(() => {
    const stored = localStorage.getItem('adharra_missing_values');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    localStorage.setItem('adharra_missing_values', JSON.stringify(INITIAL_MISSING_VALUES));
    return INITIAL_MISSING_VALUES;
  });
  const [remediationInputs, setRemediationInputs] = useState({});

  // 5. Insights & Anomalies State
  const [recommendationsList, setRecommendationsList] = useState(() => {
    const stored = localStorage.getItem('adharra_recommendations');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    localStorage.setItem('adharra_recommendations', JSON.stringify(INITIAL_RECOMMENDATIONS));
    return INITIAL_RECOMMENDATIONS;
  });
  const [anomaliesList, setAnomaliesList] = useState(() => {
    const stored = localStorage.getItem('adharra_anomalies');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    localStorage.setItem('adharra_anomalies', JSON.stringify(INITIAL_ANOMALIES));
    return INITIAL_ANOMALIES;
  });
  const [anomalySeverityFilter, setAnomalySeverityFilter] = useState('All');
  const [simCleansingEffort, setSimCleansingEffort] = useState(50);

  // 6. Sources & Integrations State
  const [integrationsList, setIntegrationsList] = useState(() => {
    const stored = localStorage.getItem('adharra_integrations');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    localStorage.setItem('adharra_integrations', JSON.stringify(INITIAL_INTEGRATIONS));
    return INITIAL_INTEGRATIONS;
  });

  // 7. Settings State
  const [settingsForm, setSettingsForm] = useState(() => {
    const stored = localStorage.getItem('adharra_settings');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    const defaultSettings = {
      name: 'Industrial Ops Engineer',
      email: 'ops@adharra.ai',
      role: 'Lead Data Architect',
      company: 'Enterprise Commerce Systems',
      autoEnrich: true,
      unitSystem: 'Metric (SI)',
      emailNotifications: true,
      activeTheme: 'navy'
    };
    localStorage.setItem('adharra_settings', JSON.stringify(defaultSettings));
    return defaultSettings;
  });

  // 8. Support State
  const [supportForm, setSupportForm] = useState({
    subject: '',
    category: 'Ingestion Pipeline',
    message: '',
    priority: 'Normal'
  });
  const [supportSuccess, setSupportSuccess] = useState('');
  const [faqExpanded, setFaqExpanded] = useState({ 0: true });

  const [auditLogList, setAuditLogList] = useState(() => {
    const stored = localStorage.getItem('adharra_audit_log');
    if (stored) {
      try { return JSON.parse(stored); } catch (e) {}
    }
    const seedAudit = [
      {
        timestamp: '2026-08-22 09:12',
        sku: '3051S-2-C-G-4-A-2-A-1-A',
        productName: 'Emerson Rosemount pressure transmitter',
        attribute: 'pressureRange',
        action: 'Human Correction',
        oldValue: '-100 to 25 bar',
        newValue: '-1 to 25 bar',
        reviewer: 'ops_admin_1',
        status: 'Corrected'
      },
      {
        timestamp: '2026-08-22 08:45',
        sku: 'CR-15-04-A-A-E-HQQE',
        productName: 'Grundfos CR 15-4 Centrifugal Pump',
        attribute: 'motorPower',
        action: 'AI Validation',
        oldValue: '-',
        newValue: '4.0 kW (5.5 HP)',
        reviewer: 'system_ai',
        status: 'Validated'
      },
      {
        timestamp: '2026-08-22 07:30',
        sku: '1LE1001-1DB43-4AA4',
        productName: 'Siemens SIMOTICS GP Induction Motor',
        attribute: 'ratedSpeed',
        action: 'AI Validation',
        oldValue: '-',
        newValue: '1470 RPM',
        reviewer: 'system_ai',
        status: 'Validated'
      },
      {
        timestamp: '2026-08-21 16:15',
        sku: 'ADVU-16-10-A-P-A',
        productName: 'Festo ADVU Compact Cylinder',
        attribute: 'protectionClass',
        action: 'Rule Constraint Failure',
        oldValue: 'IP20',
        newValue: 'IP20',
        reviewer: 'system_ai',
        status: 'Flagged'
      }
    ];
    localStorage.setItem('adharra_audit_log', JSON.stringify(seedAudit));
    return seedAudit;
  });

  const addAuditLogEntry = (productSkuOrId, action, attribute, oldValue, newValue, status, reviewerName = null) => {
    const matched = productsList.find(p => p.sku === productSkuOrId || p.id === productSkuOrId);
    const newEntry = {
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      sku: matched ? matched.sku : productSkuOrId,
      productName: matched ? matched.name : 'Unknown Product',
      attribute: attribute || '-',
      action: action || 'Update',
      oldValue: oldValue || '-',
      newValue: newValue || '-',
      reviewer: reviewerName || user?.name || user?.email || 'Authenticated Reviewer',
      status: status || 'Completed'
    };
    const nextLog = [newEntry, ...auditLogList];
    setAuditLogList(nextLog);
    localStorage.setItem('adharra_audit_log', JSON.stringify(nextLog));
  };

  // Clear success banner after 4s
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  // Handle AI Pipeline Simulation Timer (Protected Action)
  const runAiSimulation = () => {
    if (!requireAuth()) return;

    setSimRunning(true);
    setSimFinished(false);
    setSimProgress(0);
    setSimCurrentStage(1);
    setSimLogs(['[PIPELINE] Initializing neural extraction engines...']);

    const stageNames = [
      '1. Sources Added & Validated',
      '2. Document Extraction (OCR / Tables)',
      '3. Attribute Extraction (Named Entity Recognition)',
      '4. AI Enrichment (Taxonomy Harmonization)',
      '5. Confidence Scoring (Probabilistic Weights)',
      '6. Data Quality Analysis (Syntax & Duplicates)',
      '7. Human Review Queue Routing'
    ];

    let currentProg = 0;
    const interval = setInterval(() => {
      currentProg += 15;
      if (currentProg > 100) {
        currentProg = 100;
        clearInterval(interval);
        setSimRunning(false);
        setSimFinished(true);
        setSimProgress(100);
        setSimCurrentStage(7);
        setSimLogs((prev) => [
          ...prev,
          `[COMPLETED] Pipeline execution cycle finished.`,
          `[NOTICE] Frontend preview complete — real AI results will be supplied by the AI service during integration.`
        ]);
      } else {
        setSimProgress(currentProg);
        const stageIndex = Math.min(Math.floor((currentProg / 100) * 7), 6);
        setSimCurrentStage(stageIndex + 1);
        setSimLogs((prev) => [
          ...prev,
          `[STAGE ${stageIndex + 1}] Executing: ${stageNames[stageIndex]}...`
        ]);
      }
    }, 450);
  };

  // Helper actions for Products
  const filteredProducts = productsList.filter((p) => {
    const matchSearch = searchQuery === '' || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.manufacturer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
    const matchStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'quality') return b.qualityScore - a.qualityScore;
    if (sortBy === 'confidence') return b.confidenceScore - a.confidenceScore;
    return 0;
  });

  // Validation queue handlers (Protected Actions)
  const handleApproveProduct = (id) => {
    if (!requireAuth()) return;
    const item = productsList.find((p) => p.id === id);
    productService.updateProduct(id, { status: 'Validated' });
    
    if (item) {
      addAuditLogEntry(item.sku, 'Approve Product (Queue)', '-', 'Pending Review', 'Validated', 'Validated');
    }
    setSuccessBanner('Product status updated to "Validated" in local session.');
  };

  const handleRejectProduct = (id) => {
    if (!requireAuth()) return;
    const item = productsList.find((p) => p.id === id);
    productService.updateProduct(id, { status: 'Needs Revision' });

    if (item) {
      addAuditLogEntry(item.sku, 'Reject Product (Queue)', '-', 'Pending Review', 'Needs Revision', 'Needs Revision');
    }
    setSuccessBanner('Product marked as "Needs Revision" in local session.');
  };

  const handleToggleRule = (id) => {
    if (!requireAuth()) return;
    const nextRules = validationRules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r);
    setValidationRules(nextRules);
    localStorage.setItem('adharra_validation_rules', JSON.stringify(nextRules));
  };

  const handleAddRule = (e) => {
    e.preventDefault();
    if (!requireAuth()) return;
    if (!newRuleName.trim()) return;
    const newRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName.trim(),
      targetCategory: 'All Categories',
      condition: newRuleCond.trim() || 'Custom validation condition',
      severity: 'Medium',
      enabled: true,
      passedCount: 0,
      failedCount: 0
    };
    const nextRules = [...validationRules, newRule];
    setValidationRules(nextRules);
    localStorage.setItem('adharra_validation_rules', JSON.stringify(nextRules));
    setNewRuleName('');
    setNewRuleCond('');
    setSuccessBanner('Custom validation rule created locally.');
  };

  // Missing values remediation handler (Protected Action)
  const handleSaveMissingValue = (id) => {
    if (!requireAuth()) return;
    const val = remediationInputs[id];
    if (!val) return;
    const item = missingValuesList.find(m => m.id === id);
    const nextMissing = missingValuesList.filter((item) => item.id !== id);
    setMissingValuesList(nextMissing);
    localStorage.setItem('adharra_missing_values', JSON.stringify(nextMissing));

    // Update catalog product spec
    if (item) {
      const prodToUpdate = productsList.find(p => p.sku === item.sku);
      if (prodToUpdate) {
        const nextSpecs = { ...prodToUpdate.specifications };
        const fieldLower = item.missingField.toLowerCase();
        const specKey = fieldLower.includes('temp') || fieldLower.includes('operating') ? 'Max Operating Temp' :
                         fieldLower.includes('ip') || fieldLower.includes('protection') ? 'IP Rating' :
                         fieldLower.includes('seal') || fieldLower.includes('elastomer') ? 'Wetted Material' : 'Custom Field';
        nextSpecs[specKey] = val;
        productService.updateProduct(prodToUpdate.id, { specifications: nextSpecs });
      }
      addAuditLogEntry(item.sku, 'Remediate Missing Value', item.missingField, '-', val, 'Corrected');
    }

    setSuccessBanner('Missing value remediated in local catalog state.');
  };

  // Duplicate handlers (Protected Actions)
  const handleMergeDuplicate = (dupId) => {
    if (!requireAuth()) return;
    const item = duplicatesList.find(d => d.id === dupId);
    const nextDuplicates = duplicatesList.filter((d) => d.id !== dupId);
    setDuplicatesList(nextDuplicates);
    localStorage.setItem('adharra_duplicates', JSON.stringify(nextDuplicates));

    if (item) {
      addAuditLogEntry(item.itemA.sku, 'Merge Duplicate', 'SKU', item.itemB.sku, item.itemA.sku, 'Merged');
    }
    setSuccessBanner('Duplicate entities successfully merged in local state.');
  };

  const handleDismissDuplicate = (dupId) => {
    if (!requireAuth()) return;
    const item = duplicatesList.find(d => d.id === dupId);
    const nextDuplicates = duplicatesList.filter((d) => d.id !== dupId);
    setDuplicatesList(nextDuplicates);
    localStorage.setItem('adharra_duplicates', JSON.stringify(nextDuplicates));

    if (item) {
      addAuditLogEntry(item.itemA.sku, 'Dismiss Duplicate Candidate', 'SKU', item.itemB.sku, '-', 'Dismissed');
    }
    setSuccessBanner('Duplicate candidate dismissed.');
  };

  // Recommendations (Protected Action)
  const handleApplyRecommendation = (id) => {
    if (!requireAuth()) return;
    const nextRecs = recommendationsList.map((r) => r.id === id ? { ...r, status: 'Applied' } : r);
    setRecommendationsList(nextRecs);
    localStorage.setItem('adharra_recommendations', JSON.stringify(nextRecs));
    setSuccessBanner('Recommendation applied in local demo data.');
  };

  // Integrations toggle (Protected Action)
  const handleToggleIntegration = (id) => {
    if (!requireAuth()) return;
    const nextInts = integrationsList.map((int) => {
      if (int.id === id) {
        const nextStatus = int.status === 'Connected' || int.status === 'Active' ? 'Disconnected' : 'Connected';
        return { ...int, status: nextStatus };
      }
      return int;
    });
    setIntegrationsList(nextInts);
    localStorage.setItem('adharra_integrations', JSON.stringify(nextInts));
  };

  // Support Ticket Form Submit (Protected Action)
  const handleSupportSubmit = (e) => {
    e.preventDefault();
    if (!requireAuth()) return;
    if (!supportForm.subject.trim() || !supportForm.message.trim()) return;
    setSupportSuccess(`Support ticket captured in local demo mode.`);
    setSupportForm({ subject: '', category: 'Ingestion Pipeline', message: '', priority: 'Normal' });
  };

  // Quick attribute override save handler (Protected Action)
  const handleSaveProductAttributes = () => {
    if (!requireAuth()) return;
    if (!selectedProduct) return;
    const updatedSpecs = { ...selectedProduct.specifications, ...editedProductSpecs };

    productService.updateProduct(selectedProduct.id, { specifications: updatedSpecs });

    addAuditLogEntry(selectedProduct.sku, 'Attribute Override', 'Specs', 'Previous Specs', JSON.stringify(updatedSpecs), 'Corrected');
    setSuccessBanner(`Saved updated attributes for ${selectedProduct.sku} locally.`);
  };

  // Current product for Details Inspector
  const selectedProduct = productsList.find((p) => p.sku === selectedSku) || productsList[0];

  // ---- Export Final Intelligence handler ----
  const FINAL_STATUSES = ['Validated', 'Human Approved', 'Human Corrected'];

  const handleExport = (format, product) => {
    if (!product) return;
    setExportDropdownOpen(false);
    let result;
    if (format === 'json') result = exportProductJson(product);
    else if (format === 'csv') result = exportProductCsv(product);
    else if (format === 'pdf') result = exportProductPdf(product);
    else return;

    if (result) {
      setSuccessBanner(result.message);
    }
  };

  // Helper score color
  const getScoreClass = (score) => {
    if (score >= 90) return 'score-green';
    if (score >= 75) return 'score-amber';
    return 'score-red';
  };

  // Helper status badge class
  const getStatusClass = (status) => {
    switch (status) {
      case 'Validated': return 'chip-validated';
      case 'Pending Review': return 'chip-pending';
      case 'In Processing': return 'chip-processing';
      default: return 'chip-rejected';
    }
  };

  const path = location.pathname;

  return (
    <div className="dash-section-page">
      <div className="dash-max-wrapper">

        {/* Global Breadcrumbs */}
        <nav className="section-breadcrumb" aria-label="Breadcrumb">
          <Link to="/dashboard" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-section">Intelligence</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{path.replace('/dashboard/', '').replace('/', ' / ')}</span>
        </nav>

        {/* Global Feedback Banner */}
        {successBanner && (
          <div className="success-action-banner" role="status">
            <CheckCircle2 size={16} />
            <span>{successBanner}</span>
          </div>
        )}

        {/* ========================================================
            SECTION 1: PRODUCTS
            ======================================================== */}

        {/* 1.1 Product Catalog (/dashboard/products) */}
        {path === '/dashboard/products' && (
          <div>
            <header className="section-hero-header">
              <div className="section-hero-left">
                <div className="section-badge">
                  <Package size={14} className="section-badge-icon" />
                  <span>Products</span>
                </div>
                <h1 className="section-title-main">Product Catalog</h1>
                <p className="section-desc-text">
                  Manage, search, and explore all structured industrial product information.
                </p>
              </div>

              <div className="section-actions-bar">
                <button type="button" className="btn-section-action btn-action-primary" onClick={() => requireAuth(() => navigate('/upload'))}>
                  <Plus size={15} />
                  <span>+ Add Product</span>
                </button>
              </div>
            </header>

            {/* Metric Stat Cards */}
            <div className="section-stats-grid">
              <div className="section-stat-card">
                <span className="section-stat-label">Total Products</span>
                <span className="section-stat-value">{productsList.length}</span>
              </div>
              <div className="section-stat-card">
                <span className="section-stat-label">Validated SKUs</span>
                <span className="section-stat-value">{productsList.filter(p => p.status === 'Validated').length}</span>
              </div>
              <div className="section-stat-card">
                <span className="section-stat-label">Pending Review</span>
                <span className="section-stat-value">{productsList.filter(p => p.status === 'Pending Review').length}</span>
              </div>
              <div className="section-stat-card">
                <span className="section-stat-label">Avg Quality Score</span>
                <span className="section-stat-value">87%</span>
              </div>
            </div>

            {/* Interactive Products Table Container */}
            <div className="section-content-card">
              <div className="view-container-padded">
                
                {/* Search & Filter Toolbar */}
                <div className="interactive-toolbar">
                  <div className="section-search-box">
                    <Search size={15} className="section-search-icon" />
                    <input 
                      type="text"
                      className="section-search-input"
                      placeholder="Search by SKU, product name, manufacturer..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="toolbar-filters-group">
                    <select 
                      className="select-filter"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="All">All Categories</option>
                      <option value="Pumps & Fluid Handling">Pumps & Fluid Handling</option>
                      <option value="Motors & Drives">Motors & Drives</option>
                      <option value="Instrumentation & Sensors">Instrumentation & Sensors</option>
                      <option value="Industrial Automation">Industrial Automation</option>
                      <option value="Valves & Actuators">Valves & Actuators</option>
                    </select>

                    <select 
                      className="select-filter"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Validated">Validated</option>
                      <option value="Pending Review">Pending Review</option>
                      <option value="In Processing">In Processing</option>
                      <option value="Needs Revision">Needs Revision</option>
                    </select>

                    <select 
                      className="select-filter"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="name">Sort by Name</option>
                      <option value="quality">Sort by Quality</option>
                      <option value="confidence">Sort by Confidence</option>
                    </select>
                  </div>
                </div>

                {/* Table or Empty State */}
                {filteredProducts.length > 0 ? (
                  <div className="interactive-table-wrap">
                    <table className="interactive-table">
                      <thead>
                        <tr>
                          <th>Product Name & SKU</th>
                          <th>Category</th>
                          <th>Manufacturer</th>
                          <th>Quality</th>
                          <th>Confidence</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <div className="table-cell-title">{p.name}</div>
                              <span className="table-cell-sku">{p.sku}</span>
                            </td>
                            <td>{p.category}</td>
                            <td>{p.manufacturer}</td>
                            <td>
                              <span className={`score-badge ${getScoreClass(p.qualityScore)}`}>
                                {p.qualityScore}%
                              </span>
                            </td>
                            <td>
                              <span className={`score-badge ${getScoreClass(p.confidenceScore)}`}>
                                {p.confidenceScore}%
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge-chip ${getStatusClass(p.status)}`}>
                                {p.status}
                              </span>
                            </td>
                            <td>
                              <div className="table-btn-group">
                                <button 
                                  type="button" 
                                  className="btn-table-action"
                                  onClick={() => {
                                    setSelectedSku(p.sku);
                                    navigate('/dashboard/products/details');
                                  }}
                                >
                                  <span>Inspect</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="section-empty-container">
                    <div className="section-empty-icon-wrap">
                      <Package size={36} />
                    </div>
                    <h3 className="section-empty-heading">No products available yet.</h3>
                    <p className="section-empty-message">
                      Add product information from files, documents, images, product links, pasted specifications, or manual entry to populate your catalog.
                    </p>
                    <div className="section-empty-actions">
                      <button type="button" className="btn-dash-primary" onClick={() => requireAuth(() => navigate('/upload'))}>
                        <UploadCloud size={16} />
                        <span>Upload Product Catalog</span>
                      </button>
                      <Link to="/dashboard" className="btn-dash-secondary">
                        <span>Return to Overview</span>
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* 1.2 Product Details Inspector (/dashboard/products/details) */}
        {path === '/dashboard/products/details' && (
          <div>
            <header className="section-hero-header">
              <div className="section-hero-left">
                <div className="section-badge">
                  <Package size={14} className="section-badge-icon" />
                  <span>Products / Details</span>
                </div>
                <h1 className="section-title-main">Product Details Inspector</h1>
                <p className="section-desc-text">
                  Inspect and edit individual extracted attributes and technical specifications.
                </p>
              </div>

              <div className="section-actions-bar">
                <button type="button" className="btn-section-action" onClick={() => navigate('/dashboard/products')}>
                  <span>Back to Catalog</span>
                </button>

                {/* Export Final Intelligence — only for validated/approved products */}
                {selectedProduct && FINAL_STATUSES.includes(selectedProduct.status) && (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button
                      type="button"
                      className="btn-section-action btn-action-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => setExportDropdownOpen((prev) => !prev)}
                      aria-haspopup="true"
                      aria-expanded={exportDropdownOpen}
                      id="export-intelligence-btn"
                    >
                      <Download size={14} />
                      <span>Export Final Intelligence</span>
                      <ChevronDown size={12} />
                    </button>

                    {exportDropdownOpen && (
                      <>
                        {/* Overlay to close on outside click */}
                        <div
                          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                          onClick={() => setExportDropdownOpen(false)}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            right: 0,
                            zIndex: 100,
                            background: 'var(--bg-card, #1e1e2e)',
                            border: '1px solid var(--border-card, rgba(255,255,255,0.1))',
                            borderRadius: '10px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                            minWidth: '190px',
                            overflow: 'hidden',
                          }}
                          role="menu"
                          aria-label="Export format options"
                        >
                          {[
                            { format: 'json', label: 'Export as JSON', icon: '{ }' },
                            { format: 'csv',  label: 'Export as CSV',  icon: '⊞' },
                            { format: 'pdf',  label: 'Export as PDF',  icon: '⬜' },
                          ].map(({ format, label, icon }) => (
                            <button
                              key={format}
                              type="button"
                              role="menuitem"
                              id={`export-${format}-btn`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '10px 16px',
                                background: 'none',
                                border: 'none',
                                borderBottom: format !== 'pdf' ? '1px solid var(--border-card, rgba(255,255,255,0.07))' : 'none',
                                color: 'var(--text-primary, #e2e8f0)',
                                fontSize: '0.84rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(138,92,246,0.15)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                              onClick={() => handleExport(format, selectedProduct)}
                            >
                              <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--accent-end, #a78bfa)', minWidth: '18px' }}>{icon}</span>
                              {label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </header>

            <div className="section-content-card">
              <div className="view-container-padded">
                
                {/* SKU Selector */}
                <div className="interactive-toolbar">
                  <div className="toolbar-filters-group">
                    <span className="field-label">Select SKU to Inspect:</span>
                    <select 
                      className="select-filter"
                      value={selectedSku}
                      onChange={(e) => setSelectedSku(e.target.value)}
                    >
                      {productsList.map((p) => (
                        <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                  </div>

                  <span className={`status-badge-chip ${getStatusClass(selectedProduct?.status)}`}>
                    Status: {selectedProduct?.status}
                  </span>
                </div>

                {selectedProduct ? (
                  <div className="interactive-form-grid">
                    <div>
                      <h3 className="entity-card-title" style={{ marginBottom: '12px' }}>
                        {selectedProduct.name}
                      </h3>
                      <p className="section-desc-text">
                        <strong>Manufacturer:</strong> {selectedProduct.manufacturer} • <strong>Category:</strong> {selectedProduct.category}
                      </p>

                      <div style={{ marginTop: '16px' }}>
                        <h4 className="section-stat-label">Extracted Technical Specifications</h4>
                        <table className="specs-detail-table" style={{ marginTop: '8px' }}>
                          <tbody>
                            {Object.entries(selectedProduct.specifications || {}).map(([key, val]) => (
                              <tr key={key}>
                                <td className="specs-key">{key}</td>
                                <td className="specs-val">{val}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Parameter Editor Box */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                      <h4 className="entity-card-title">Quick Attribute Override</h4>
                      <p className="section-desc-text" style={{ fontSize: '0.78rem', marginBottom: '12px' }}>
                        Edit attribute values in local session to verify catalog updates.
                      </p>

                      <div key={selectedProduct.sku} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {Object.entries(selectedProduct.specifications || {}).map(([key, val]) => (
                          <div key={key}>
                            <label className="field-label">{key}</label>
                            <input 
                              type="text"
                              className="interactive-input"
                              defaultValue={val}
                              onChange={(e) => setEditedProductSpecs({ ...editedProductSpecs, [key]: e.target.value })}
                            />
                          </div>
                        ))}
                        <button 
                          type="button" 
                          className="btn-dash-primary"
                          style={{ alignSelf: 'flex-start', marginTop: '8px' }}
                          onClick={handleSaveProductAttributes}
                        >
                          Save Attribute Changes
                        </button>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="section-empty-container">
                    <h4 className="section-empty-heading">No SKU selected</h4>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* 1.3 Comparison (/dashboard/products/comparison) */}
        {path === '/dashboard/products/comparison' && (
          <div>
            <header className="section-hero-header">
              <div className="section-hero-left">
                <div className="section-badge">
                  <Layers size={14} className="section-badge-icon" />
                  <span>Products / Comparison</span>
                </div>
                <h1 className="section-title-main">Product Comparison</h1>
                <p className="section-desc-text">
                  Industrial commerce classification hierarchy, completeness ratings, and SKU counts.
                </p>
              </div>
            </header>

            <div className="section-content-card">
              <div className="view-container-padded">
                <div className="cards-catalog-grid">
                  {INITIAL_CATEGORIES.map((cat) => (
                    <div key={cat.id} className="catalog-entity-card">
                      <div className="entity-card-header">
                        <h3 className="entity-card-title">{cat.name}</h3>
                        <span className="entity-count-badge">{cat.skuCount} SKUs</span>
                      </div>
                      <p className="entity-card-desc">{cat.description}</p>
                      <div>
                        <span className="field-label" style={{ fontSize: '0.72rem' }}>Leading Brands:</span>
                        <div className="entity-chip-list" style={{ marginTop: '4px' }}>
                          {cat.topBrands.map((b) => (
                            <span key={b} className="entity-chip">{b}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completeness:</span>
                        <span className="score-badge score-green">{cat.completeness}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1.4 Documents (/dashboard/products/documents) */}
        {path === '/dashboard/products/documents' && (
          <div>
            <header className="section-hero-header">
              <div className="section-hero-left">
                <div className="section-badge">
                  <Package size={14} className="section-badge-icon" />
                  <span>Products / Documents</span>
                </div>
                <h1 className="section-title-main">Product Documents</h1>
                <p className="section-desc-text">
                  Explore validated supplier brands, active product lines, and quality ratings.
                </p>
              </div>
            </header>

            <div className="section-content-card">
              <div className="view-container-padded">
                <div className="cards-catalog-grid">
                  {INITIAL_BRANDS.map((br) => (
                    <div key={br.id} className="catalog-entity-card">
                      <div className="entity-card-header">
                        <h3 className="entity-card-title">{br.name}</h3>
                        <span className="status-badge-chip chip-validated">{br.status}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <strong>Origin:</strong> {br.country} • <strong>Active SKUs:</strong> {br.activeSKUs}
                      </div>
                      <div className="entity-chip-list">
                        {br.categories.map((c) => (
                          <span key={c} className="entity-chip">{c}</span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quality Rating:</span>
                        <span className="score-badge score-green">{br.qualityRating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            SECTION 2: AI INTELLIGENCE
            ======================================================== */}
        {path === '/dashboard/ai' && (
          <div className="placeholder-view">
             <h2>Products AI Status</h2>
             <p>AI processing status by product</p>
          </div>
        )}

        {/* 2.1 AI Processing Simulation (/dashboard/ai/processing) */}
        {path === '/dashboard/ai/processing' && (
          <div>
            <header className="section-hero-header">
              <div className="section-hero-left">
                <div className="section-badge">
                  <Sparkles size={14} className="section-badge-icon" />
                  <span>AI Intelligence / Processing</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h1 className="section-title-main">AI Pipeline Execution</h1>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-card)' }}>Local demonstration mode</span>
                </div>
                <p className="section-desc-text">
                  Execute raw document ingestion, entity recognition, and neural enrichment.
                </p>
              </div>
            </header>

            <div className="section-content-card">
              <div className="view-container-padded ai-sim-panel">
                
                {/* Trigger & Progress Bar */}
                <div className="ai-sim-control-bar">
                  <div>
                    <h3 className="entity-card-title">AI Processing Pipeline</h3>
                    <p className="section-desc-text" style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                      Execute the complete 7-stage extraction and enrichment cycle on industrial products.
                    </p>
                  </div>

                  <button 
                    type="button" 
                    className="ai-sim-btn-trigger"
                    disabled={simRunning}
                    onClick={runAiSimulation}
                  >
                    <Zap size={16} />
                    <span>{simRunning ? 'Processing Pipeline...' : 'Run AI Processing'}</span>
                  </button>
                </div>

                {/* Progress Visualizer */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.84rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {simRunning ? `Executing Stage ${simCurrentStage} of 7...` : simFinished ? 'Pipeline Cycle Complete' : 'Ready to Start'}
                    </span>
                    <span style={{ color: 'var(--accent-end)', fontWeight: 700 }}>{simProgress}%</span>
                  </div>
                  <div className="ai-sim-progress-track">
                    <div className="ai-sim-progress-bar" style={{ width: `${simProgress}%` }} />
                  </div>
                </div>

                {/* Live Console Output Box */}
                <div>
                  <h4 className="section-stat-label" style={{ marginBottom: '6px' }}>Simulation Event Log</h4>
                  <div className="ai-terminal-log">
                    {simLogs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                </div>

                {simFinished && (
                  <div className="success-action-banner">
                    <CheckCircle2 size={18} />
                    <span>AI Pipeline execution completed in local demonstration mode.</span>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

        {/* 2.2 Confidence Scores (/dashboard/ai/confidence) */}
        {path === '/dashboard/ai/confidence' && (
          <div>
            <header className="section-hero-header">
              <div className="section-hero-left">
                <div className="section-badge">
                  <ShieldCheck size={14} className="section-badge-icon" />
                  <span>AI Intelligence / Confidence</span>
                </div>
                <h1 className="section-title-main">Confidence Scoring Engine</h1>
                <p className="section-desc-text">
                  Probabilistic confidence intervals and extraction certainty per product attribute.
                </p>
              </div>
            </header>

            <div className="section-stats-grid">
              <div className="section-stat-card">
                <span className="section-stat-label">Overall Confidence</span>
                <span className="section-stat-value">88.4%</span>
              </div>
              <div className="section-stat-card">
                <span className="section-stat-label">High Confidence (&gt;90%)</span>
                <span className="section-stat-value">{productsList.filter(p => p.confidenceScore >= 90).length} SKUs</span>
              </div>
              <div className="section-stat-card">
                <span className="section-stat-label">Medium (70-90%)</span>
                <span className="section-stat-value">{productsList.filter(p => p.confidenceScore >= 70 && p.confidenceScore < 90).length} SKUs</span>
              </div>
              <div className="section-stat-card">
                <span className="section-stat-label">Low (&lt;70%)</span>
                <span className="section-stat-value">{productsList.filter(p => p.confidenceScore < 70).length} SKUs</span>
              </div>
            </div>

            <div className="section-content-card">
              <div className="view-container-padded">
                <table className="interactive-table">
                  <thead>
                    <tr>
                      <th>Product SKU</th>
                      <th>Product Name</th>
                      <th>Extracted Attributes</th>
                      <th>Confidence Score</th>
                      <th>Certainty Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsList.map((p) => (
                      <tr key={p.id}>
                        <td><span className="table-cell-sku">{p.sku}</span></td>
                        <td className="table-cell-title">{p.name}</td>
                        <td>{Object.keys(p.specifications || {}).length} Parameters</td>
                        <td>
                          <span className={`score-badge ${getScoreClass(p.confidenceScore)}`}>
                            {p.confidenceScore}%
                          </span>
                        </td>
                        <td>
                          {p.confidenceScore >= 90 ? (
                            <span className="status-badge-chip chip-validated">High Certainty</span>
                          ) : p.confidenceScore >= 70 ? (
                            <span className="status-badge-chip chip-pending">Moderate</span>
                          ) : (
                            <span className="status-badge-chip chip-rejected">Low Confidence</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2.3 Attribute Extraction (/dashboard/ai/attributes) */}
        {path === '/dashboard/ai/attributes' && (
          <div>
            <header className="section-hero-header">
              <div className="section-hero-left">
                <div className="section-badge">
                  <Cpu size={14} className="section-badge-icon" />
                  <span>AI Intelligence / Extraction</span>
                </div>
                <h1 className="section-title-main">Attribute Extraction Studio</h1>
                <p className="section-desc-text">
                  Verify raw attributes extracted from datasheets and documents by neural-network models.
                </p>
              </div>
            </header>

            <div className="section-content-card">
              <div className="view-container-padded">
                <table className="interactive-table">
                  <thead>
                    <tr>
                      <th>Attribute Key</th>
                      <th>Raw Extracted Value</th>
                      <th>Standardized AI Value</th>
                      <th>Confidence</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="table-cell-title">Flow Rate</td>
                      <td>120 Liters per minute</td>
                      <td><strong>7.2 m³/h</strong></td>
                      <td><span className="score-badge score-green">98%</span></td>
                      <td><button type="button" className="btn-table-action" onClick={() => requireAuth(() => setSuccessBanner('Extracted value accepted locally.'))}>Accept</button></td>
                    </tr>
                    <tr>
                      <td className="table-cell-title">Operating Pressure</td>
                      <td>116 PSI</td>
                      <td><strong>8.0 bar</strong></td>
                      <td><span className="score-badge score-green">96%</span></td>
                      <td><button type="button" className="btn-table-action" onClick={() => requireAuth(() => setSuccessBanner('Extracted value accepted locally.'))}>Accept</button></td>
                    </tr>
                    <tr>
                      <td className="table-cell-title">Material Grade</td>
                      <td>AISI 316 Stainless</td>
                      <td><strong>EN 1.4401 (SS 316)</strong></td>
                      <td><span className="score-badge score-amber">89%</span></td>
                      <td><button type="button" className="btn-table-action" onClick={() => requireAuth(() => setSuccessBanner('Extracted value accepted locally.'))}>Accept</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2.4 AI Enrichment (/dashboard/ai/enrichment) */}
        {path === '/dashboard/ai/enrichment' && (
          <div>
            <header className="section-hero-header">
              <div className="section-hero-left">
                <div className="section-badge">
                  <Sparkles size={14} className="section-badge-icon" />
                  <span>AI Intelligence / Enrichment</span>
                </div>
                <h1 className="section-title-main">Neural Data Enrichment</h1>
                <p className="section-desc-text">
                  Enrich and harmonize product specifications against standardized industrial taxonomies.
                </p>
              </div>
            </header>

            <div className="section-content-card">
              <div className="view-container-padded">
                <table className="interactive-table">
                  <thead>
                    <tr>
                      <th>Original Value</th>
                      <th>Enriched Value</th>
                      <th>Enrichment Type</th>
                      <th>Confidence</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="table-cell-title">120 GPM</td>
                      <td><strong>27.2 m³/h</strong></td>
                      <td><span style={{ color: 'var(--accent-end, #a78bfa)', fontWeight: 600 }}>Unit Standardization</span></td>
                      <td><span className="score-badge score-green">98%</span></td>
                      <td><button type="button" className="btn-table-action" onClick={() => requireAuth(() => setSuccessBanner('Harmonized enrichment accepted.'))}>Accept</button></td>
                    </tr>
                    <tr>
                      <td className="table-cell-title">Cast Iron Grade 30</td>
                      <td><strong>GG25 Cast Iron</strong></td>
                      <td><span style={{ color: 'var(--accent-end, #a78bfa)', fontWeight: 600 }}>Material Harmonization</span></td>
                      <td><span className="score-badge score-green">92%</span></td>
                      <td><button type="button" className="btn-table-action" onClick={() => requireAuth(() => setSuccessBanner('Harmonized enrichment accepted.'))}>Accept</button></td>
                    </tr>
                    <tr>
                      <td className="table-cell-title">NPT 1/2"</td>
                      <td><strong>ISO 228 G 1/2</strong></td>
                      <td><span style={{ color: 'var(--accent-end, #a78bfa)', fontWeight: 600 }}>Thread Standard Mapping</span></td>
                      <td><span className="score-badge score-amber">89%</span></td>
                      <td><button type="button" className="btn-table-action" onClick={() => requireAuth(() => setSuccessBanner('Harmonized enrichment accepted.'))}>Accept</button></td>
                    </tr>
                    <tr>
                      <td className="table-cell-title">20HP</td>
                      <td><strong>15 kW</strong></td>
                      <td><span style={{ color: 'var(--accent-end, #a78bfa)', fontWeight: 600 }}>HP to kW Conversion</span></td>
                      <td><span className="score-badge score-green">95%</span></td>
                      <td><button type="button" className="btn-table-action" onClick={() => requireAuth(() => setSuccessBanner('Harmonized enrichment accepted.'))}>Accept</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            SECTION 3: DATA QUALITY
            ======================================================== */}

        {/* 3.1 Overview, Completeness, Accuracy, Duplicates, Missing */}
        {path.startsWith('/dashboard/quality') && (
          <div>
            <header className="section-hero-header">
              <div className="section-hero-left">
                <div className="section-badge">
                  <ShieldCheck size={14} className="section-badge-icon" />
                  <span>Data Quality</span>
                </div>
                <h1 className="section-title-main">
                  {path === '/dashboard/quality/duplicates' ? 'Duplicate Detection & Resolution' :
                   path === '/dashboard/quality/missing' ? 'Missing Values Remediation' :
                   path === '/dashboard/quality/completeness' ? 'Catalog Completeness Audit' :
                   path === '/dashboard/quality/accuracy' ? 'Format & Syntax Accuracy' :
                   'Data Quality Center'}
                </h1>
                <p className="section-desc-text">
                  Automated constraint validation, duplicate candidate resolution, and missing field auditing.
                </p>
              </div>
            </header>

            {/* Quality Sub-tabs navigation */}
            <div className="section-actions-bar" style={{ marginTop: '16px' }}>
              <Link to="/dashboard/quality" className={`btn-section-action ${path === '/dashboard/quality' ? 'btn-action-primary' : ''}`}>Overview</Link>
              <Link to="/dashboard/quality/completeness" className={`btn-section-action ${path === '/dashboard/quality/completeness' ? 'btn-action-primary' : ''}`}>Completeness</Link>
              <Link to="/dashboard/quality/accuracy" className={`btn-section-action ${path === '/dashboard/quality/accuracy' ? 'btn-action-primary' : ''}`}>Accuracy</Link>
              <Link to="/dashboard/quality/duplicates" className={`btn-section-action ${path === '/dashboard/quality/duplicates' ? 'btn-action-primary' : ''}`}>Duplicates ({duplicatesList.length})</Link>
              <Link to="/dashboard/quality/missing" className={`btn-section-action ${path === '/dashboard/quality/missing' ? 'btn-action-primary' : ''}`}>Missing Values ({missingValuesList.length})</Link>
            </div>

            {/* DUPLICATES VIEW */}
            {path === '/dashboard/quality/duplicates' && (
              <div className="section-content-card">
                <div className="view-container-padded">
                  {duplicatesList.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {duplicatesList.map((dup) => (
                        <div key={dup.id} className="catalog-entity-card">
                          <div className="entity-card-header">
                            <div>
                              <span className="score-badge score-amber">{dup.confidence}</span>
                              <span style={{ marginLeft: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{dup.reason}</span>
                            </div>
                            <div className="table-btn-group">
                              <button type="button" className="btn-table-action btn-table-approve" onClick={() => handleMergeDuplicate(dup.id)}>Merge Records</button>
                              <button type="button" className="btn-table-action" onClick={() => handleDismissDuplicate(dup.id)}>Dismiss</button>
                            </div>
                          </div>
                          <div className="interactive-form-grid" style={{ marginTop: '8px' }}>
                            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                              <span className="field-label">Candidate A ({dup.itemA.source})</span>
                              <div className="table-cell-title">{dup.itemA.name}</div>
                              <span className="table-cell-sku">{dup.itemA.sku}</span>
                            </div>
                            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                              <span className="field-label">Candidate B ({dup.itemB.source})</span>
                              <div className="table-cell-title">{dup.itemB.name}</div>
                              <span className="table-cell-sku">{dup.itemB.sku}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="section-empty-container">
                      <CheckCircle2 size={36} className="text-green" />
                      <h4 className="section-empty-heading" style={{ marginTop: '8px' }}>Zero Duplicate Candidates</h4>
                      <p className="section-empty-message">All catalog SKUs are uniquely harmonized across data sources.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MISSING VALUES REMEDIATION VIEW */}
            {path === '/dashboard/quality/missing' && (
              <div className="section-content-card">
                <div className="view-container-padded">
                  {missingValuesList.length > 0 ? (
                    <table className="interactive-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Product Name</th>
                          <th>Missing Field</th>
                          <th>Category</th>
                          <th>Fill Value</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {missingValuesList.map((item) => (
                          <tr key={item.id}>
                            <td><span className="table-cell-sku">{item.sku}</span></td>
                            <td className="table-cell-title">{item.productName}</td>
                            <td><span style={{ color: '#F87171', fontWeight: 600 }}>{item.missingField}</span></td>
                            <td>{item.category}</td>
                            <td>
                              <input 
                                type="text"
                                className="interactive-input"
                                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                placeholder={item.suggestedValue}
                                value={remediationInputs[item.id] || ''}
                                onChange={(e) => setRemediationInputs({ ...remediationInputs, [item.id]: e.target.value })}
                              />
                            </td>
                            <td>
                              <button 
                                type="button" 
                                className="btn-table-action btn-table-approve"
                                onClick={() => handleSaveMissingValue(item.id)}
                              >
                                Save Value
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="section-empty-container">
                      <CheckCircle2 size={36} className="text-green" />
                      <h4 className="section-empty-heading" style={{ marginTop: '8px' }}>No Missing Values</h4>
                      <p className="section-empty-message">All required attribute specifications are fully populated.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* DATA QUALITY OVERVIEW VIEW */}
            {path === '/dashboard/quality' && (
              <div className="section-content-card">
                <div className="view-container-padded">
                  <div className="section-stats-grid" style={{ marginTop: 0 }}>
                    <div className="section-stat-card">
                      <span className="section-stat-label">Completeness</span>
                      <span className="section-stat-value">94.2%</span>
                    </div>
                    <div className="section-stat-card">
                      <span className="section-stat-label">Syntax Accuracy</span>
                      <span className="section-stat-value">91.8%</span>
                    </div>
                    <div className="section-stat-card">
                      <span className="section-stat-label">Duplicate Free</span>
                      <span className="section-stat-value">98.5%</span>
                    </div>
                    <div className="section-stat-card">
                      <span className="section-stat-label">Field Consistency</span>
                      <span className="section-stat-value">96.0%</span>
                    </div>
                  </div>
                  <p className="section-desc-text" style={{ marginTop: '16px' }}>
                    Select a sub-tab above to drill down into specific duplicates, incomplete attributes, syntax errors, or formatting rules.
                  </p>
                </div>
              </div>
            )}

            {/* DATA QUALITY COMPLETENESS AUDIT VIEW */}
            {path === '/dashboard/quality/completeness' && (
              <div className="section-content-card">
                <div className="view-container-padded">
                  <h3 className="entity-card-title" style={{ marginBottom: '10px' }}>Catalog Completeness Audit</h3>
                  <table className="interactive-table">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Populated Specs</th>
                        <th>Completeness</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsList.map((p) => {
                        const total = 7;
                        const populated = Object.keys(p.specifications || {}).length;
                        const pct = Math.round((populated / total) * 100);
                        return (
                          <tr key={p.id}>
                            <td><span className="table-cell-sku">{p.sku}</span></td>
                            <td className="table-cell-title">{p.name}</td>
                            <td>{p.category}</td>
                            <td>{populated} / {total} Fields</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: pct >= 90 ? '#34D399' : pct >= 70 ? '#FBBF24' : '#F87171' }} />
                                </div>
                                <span style={{ fontWeight: 600 }}>{pct}%</span>
                              </div>
                            </td>
                            <td>
                              <span className={`status-badge-chip ${pct >= 90 ? 'chip-validated' : 'chip-pending'}`}>
                                {pct >= 90 ? 'Complete' : 'Needs Infill'}
                              </span>
                            </td>
                            <td>
                              <button 
                                type="button" 
                                className="btn-table-action"
                                onClick={() => {
                                  setSelectedSku(p.sku);
                                  navigate('/dashboard/products/details');
                                }}
                              >
                                View Specs
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* DATA QUALITY ACCURACY AUDIT VIEW */}
            {path === '/dashboard/quality/accuracy' && (
              <div className="section-content-card">
                <div className="view-container-padded">
                  <h3 className="entity-card-title" style={{ marginBottom: '10px' }}>Format & Syntax Accuracy Audit</h3>
                  <table className="interactive-table">
                    <thead>
                      <tr>
                        <th>Product SKU</th>
                        <th>Attribute Checked</th>
                        <th>Value Found</th>
                        <th>Target Formatting Rule</th>
                        <th>Accuracy Status</th>
                        <th>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><span className="table-cell-sku">CR-15-04-A-A-E-HQQE</span></td>
                        <td className="table-cell-title">flowRate</td>
                        <td>15 m³/h</td>
                        <td>Numeric with SI unit (m³/h)</td>
                        <td><span className="status-badge-chip chip-validated">Valid</span></td>
                        <td><span className="score-badge score-green">Low</span></td>
                      </tr>
                      <tr>
                        <td><span className="table-cell-sku">1LE1001-1DB43-4AA4</span></td>
                        <td className="table-cell-title">ratedSpeed</td>
                        <td>1470 RPM</td>
                        <td>Matches speed constraint format</td>
                        <td><span className="status-badge-chip chip-validated">Valid</span></td>
                        <td><span className="score-badge score-green">Low</span></td>
                      </tr>
                      <tr>
                        <td><span className="table-cell-sku">3051S-2-C-G-4-A-2-A-1-A</span></td>
                        <td className="table-cell-title">pressureRange</td>
                        <td>-100 to 25 bar</td>
                        <td>Typical pressure range bounds check</td>
                        <td><span className="status-badge-chip chip-pending">Warning</span></td>
                        <td><span className="score-badge score-amber">Medium</span></td>
                      </tr>
                      <tr>
                        <td><span className="table-cell-sku">ADVU-16-10-A-P-A</span></td>
                        <td className="table-cell-title">protectionClass</td>
                        <td>IP20</td>
                        <td>Outdoor schema minimum (IP55+)</td>
                        <td><span className="status-badge-chip chip-rejected">Invalid</span></td>
                        <td><span className="score-badge score-red">High</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================
            SECTION 4: VALIDATION
            ======================================================== */}

        {/* 4.1 Validation Queue, Approval, Review, Rules */}
        {path.startsWith('/dashboard/validation') && (
          <div>
            <header className="section-hero-header">
              <div className="section-hero-left">
                <div className="section-badge">
                  <CheckSquare size={14} className="section-badge-icon" />
                  <span>Validation</span>
                </div>
                <h1 className="section-title-main">
                  {path === '/dashboard/validation/rules' ? 'Automated Validation Rules' :
                   path === '/dashboard/validation/audit' ? 'Validation Audit History' :
                   'Product Review & Approval Queue'}
                </h1>
                <p className="section-desc-text">
                  Human-in-the-loop quality gate ensuring 100% compliance before catalog publication.
                </p>
              </div>
            </header>

            <div className="section-actions-bar" style={{ marginTop: '16px' }}>
              <Link to="/dashboard/validation" className={`btn-section-action ${path === '/dashboard/validation' ? 'btn-action-primary' : ''}`}>Approval Queue</Link>
              <Link to="/dashboard/validation/hitl" className={`btn-section-action ${path === '/dashboard/validation/hitl' ? 'btn-action-primary' : ''}`}>Human-in-the-Loop (HITL)</Link>
              <Link to="/dashboard/validation/rules" className={`btn-section-action ${path === '/dashboard/validation/rules' ? 'btn-action-primary' : ''}`}>Rules Engine</Link>
              <Link to="/dashboard/validation/review" className={`btn-section-action ${path === '/dashboard/validation/audit' ? 'btn-action-primary' : ''}`}>Audit Log</Link>
            </div>

            {/* RULES VIEW */}
            {path === '/dashboard/validation/rules' ? (
              <div className="section-content-card">
                <div className="view-container-padded">
                  
                  {/* Add New Rule Form */}
                  <form onSubmit={handleAddRule} style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-card)' }}>
                    <h4 className="entity-card-title" style={{ fontSize: '0.92rem', marginBottom: '8px' }}>+ Add Custom Validation Rule</h4>
                    <div className="interactive-form-grid">
                      <input 
                        type="text" 
                        className="interactive-input"
                        placeholder="Rule Name (e.g. Enforce IP67 for Submersible Pumps)"
                        value={newRuleName}
                        onChange={(e) => setNewRuleName(e.target.value)}
                      />
                      <input 
                        type="text" 
                        className="interactive-input"
                        placeholder="Condition / Constraint description"
                        value={newRuleCond}
                        onChange={(e) => setNewRuleCond(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn-dash-primary" style={{ marginTop: '10px' }}>
                      Save Validation Rule
                    </button>
                  </form>

                  {/* Rules List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {validationRules.map((rule) => (
                      <div key={rule.id} className="catalog-entity-card" style={{ padding: '14px' }}>
                        <div className="entity-card-header">
                          <div>
                            <span className="entity-card-title">{rule.name}</span>
                            <span className="entity-count-badge" style={{ marginLeft: '8px' }}>{rule.severity}</span>
                          </div>
                          <div className="toggle-switch-wrap" onClick={() => handleToggleRule(rule.id)}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rule.enabled ? 'ENABLED' : 'DISABLED'}</span>
                            <div className={`toggle-switch-track ${rule.enabled ? 'is-on' : ''}`}>
                              <div className="toggle-switch-thumb" />
                            </div>
                          </div>
                        </div>
                        <p className="entity-card-desc">{rule.condition}</p>
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            ) : path === '/dashboard/validation/audit' ? (
              /* AUDIT LOG DISTINCT HISTORY VIEW */
              <div className="section-content-card">
                <div className="view-container-padded">
                  <h3 className="entity-card-title" style={{ marginBottom: '10px' }}>Validation & Quality Audit History</h3>
                  <table className="interactive-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Product SKU</th>
                        <th>Attribute Checked</th>
                        <th>Action Type</th>
                        <th>Previous Value</th>
                        <th>Enriched/Corrected Value</th>
                        <th>Reviewed By</th>
                        <th>Audit Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogList.map((log, idx) => (
                        <tr key={idx}>
                          <td>{log.timestamp}</td>
                          <td><span className="table-cell-sku">{log.sku}</span></td>
                          <td className="table-cell-title">{log.attribute}</td>
                          <td>
                            <span style={{ 
                              color: log.action.includes('Correction') || log.action.includes('Correct') ? 'var(--accent-end, #a78bfa)' : 'inherit', 
                              fontWeight: 600 
                            }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ 
                            textDecoration: log.oldValue && log.oldValue !== '-' ? 'line-through' : 'none', 
                            opacity: log.oldValue && log.oldValue !== '-' ? 0.6 : 1 
                          }}>
                            {log.oldValue}
                          </td>
                          <td><strong>{log.newValue}</strong></td>
                          <td>{log.reviewer}</td>
                          <td>
                            <span className={`status-badge-chip ${
                              log.status === 'Validated' || log.status === 'Corrected' || log.status === 'Human Approved' || log.status === 'Human Corrected' ? 'chip-validated' : 
                              log.status === 'Needs Revision' || log.status === 'Flagged' || log.status === 'Human Rejected' ? 'chip-rejected' : 'chip-pending'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* APPROVAL QUEUE VIEW */
              <div className="section-content-card">
                <div className="view-container-padded">
                  <table className="interactive-table">
                    <thead>
                      <tr>
                        <th>Product / SKU</th>
                        <th>Category</th>
                        <th>Quality</th>
                        <th>Current Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationQueue.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="table-cell-title">{item.name}</div>
                            <span className="table-cell-sku">{item.sku}</span>
                          </td>
                          <td>{item.category}</td>
                          <td>
                            <span className={`score-badge ${getScoreClass(item.qualityScore)}`}>
                              {item.qualityScore}%
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge-chip ${getStatusClass(item.status)}`}>
                              {item.status}
                            </span>
                          </td>
                          <td>
                            <div className="table-btn-group">
                              {/* Validated/Approved Status */}
                              {FINAL_STATUSES.includes(item.status) && (
                                <>
                                  <button
                                    type="button"
                                    className="btn-table-action"
                                    onClick={() => {
                                      setSelectedSku(item.sku);
                                      navigate('/dashboard/products/details');
                                    }}
                                  >
                                    View Details
                                  </button>
                                  <ExportInlineDropdown
                                    product={item}
                                    onExport={handleExport}
                                    onBanner={setSuccessBanner}
                                  />
                                </>
                              )}

                              {/* Pending Review Status */}
                              {item.status === 'Pending Review' && (
                                <>
                                  <button 
                                    type="button" 
                                    className="btn-table-action btn-table-approve"
                                    onClick={() => handleApproveProduct(item.id)}
                                  >
                                    Approve
                                  </button>
                                  <button 
                                    type="button" 
                                    className="btn-table-action btn-table-reject"
                                    onClick={() => handleRejectProduct(item.id)}
                                  >
                                    Reject
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-table-action"
                                    onClick={() => navigate('/dashboard/validation/hitl')}
                                  >
                                    Review (HITL)
                                  </button>
                                </>
                              )}

                              {/* Needs Revision / Rejected Status */}
                              {(item.status === 'Needs Revision' || item.status === 'Rejected') && (
                                <>
                                  <button
                                    type="button"
                                    className="btn-table-action"
                                    onClick={() => navigate('/dashboard/validation/hitl')}
                                  >
                                    Review (HITL)
                                  </button>
                                  <button 
                                    type="button" 
                                    className="btn-table-action btn-table-reject"
                                    onClick={() => handleRejectProduct(item.id)}
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {/* In Processing Status */}
                              {item.status === 'In Processing' && (
                                <button
                                  type="button"
                                  className="btn-table-action"
                                  onClick={() => navigate('/dashboard/ai/processing')}
                                >
                                  View Status
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================
            SECTION 5: INSIGHTS & ANOMALIES
            ======================================================== */}

        {path.startsWith('/dashboard/insights') && (
          <div>
            <header className="section-hero-header">
              <div className="section-hero-left">
                <div className="section-badge">
                  <TrendingUp size={14} className="section-badge-icon" />
                  <span>Insights & Analytics</span>
                </div>
                <h1 className="section-title-main">
                  {path === '/dashboard/insights/anomalies' ? 'Specification Anomalies & Outliers' :
                   path === '/dashboard/insights/future-impact' ? 'Future Impact Predictor' :
                   path === '/dashboard/insights/trends' ? 'Confidence Trends & Quality Curves' :
                   'Catalog Optimization Recommendations'}
                </h1>
                <p className="section-desc-text">
                  Actionable AI insights, outlier detection, trend analytics, and predictive catalog impact simulation.
                </p>
              </div>
            </header>

            <div className="section-actions-bar" style={{ marginTop: '16px' }}>
              <Link to="/dashboard/insights" className={`btn-section-action ${path === '/dashboard/insights' ? 'btn-action-primary' : ''}`}>Recommendations</Link>
              <Link to="/dashboard/insights/anomalies" className={`btn-section-action ${path === '/dashboard/insights/anomalies' ? 'btn-action-primary' : ''}`}>Anomalies ({anomaliesList.length})</Link>
              <Link to="/dashboard/insights/trends" className={`btn-section-action ${path === '/dashboard/insights/trends' ? 'btn-action-primary' : ''}`}>Trends & Patterns</Link>
              <Link to="/dashboard/insights/future-impact" className={`btn-section-action ${path === '/dashboard/insights/future-impact' ? 'btn-action-primary' : ''}`}>Future Impact Predictor</Link>
            </div>

            {/* FUTURE IMPACT SLIDER VIEW */}
            {path === '/dashboard/insights/future-impact' ? (
              <div className="section-content-card">
                <div className="view-container-padded">
                  <h3 className="entity-card-title">Predictive Quality Growth Simulator</h3>
                  <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Projected Impact Simulation
                  </span>
                  <p className="section-desc-text">
                    Adjust the simulated data cleansing effort slider to project future catalog health metrics.
                  </p>

                  <div style={{ margin: '20px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span className="field-label">Simulated Cleansing & Standardization Effort:</span>
                      <span style={{ fontWeight: 700, color: 'var(--accent-end)' }}>{simCleansingEffort}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="100" 
                      value={simCleansingEffort} 
                      onChange={(e) => setSimCleansingEffort(Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--accent-mid)', cursor: 'pointer' }}
                    />
                  </div>

                  <div className="section-stats-grid" style={{ marginTop: '10px' }}>
                    <div className="section-stat-card">
                      <span className="section-stat-label">Projected Catalog Quality</span>
                      <span className="section-stat-value">{Math.min(99, Math.round(75 + (simCleansingEffort * 0.24)))}%</span>
                    </div>
                    <div className="section-stat-card">
                      <span className="section-stat-label">Projected Completeness</span>
                      <span className="section-stat-value">{Math.min(100, Math.round(80 + (simCleansingEffort * 0.19)))}%</span>
                    </div>
                    <div className="section-stat-card">
                      <span className="section-stat-label">Estimated Search Lift</span>
                      <span className="section-stat-value">+{Math.round(simCleansingEffort * 0.35)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : path === '/dashboard/insights/anomalies' ? (
              /* ANOMALIES VIEW */
              <div className="section-content-card">
                <div className="view-container-padded">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {anomaliesList.map((anom) => (
                      <div key={anom.id} className="catalog-entity-card">
                        <div className="entity-card-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertTriangle size={18} color="#F87171" />
                            <h3 className="entity-card-title">{anom.issue}</h3>
                          </div>
                          <span className="score-badge score-red">{anom.severity}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Product: <strong>{anom.product}</strong> ({anom.sku}) • Detected: {anom.detectedAt}
                        </div>
                        <p className="entity-card-desc">{anom.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : path === '/dashboard/insights/trends' ? (
              /* TRENDS & PATTERNS VIEW */
              <div className="section-content-card">
                <div className="view-container-padded">
                  <div className="section-stats-grid" style={{ marginTop: 0 }}>
                    <div className="section-stat-card">
                      <span className="section-stat-label">AI Confidence Trend</span>
                      <span className="section-stat-value">88.4%</span>
                      <span style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
                        <span>↑ +2.4%</span> <span style={{ color: 'var(--text-muted)' }}>vs last 30d</span>
                      </span>
                    </div>
                    <div className="section-stat-card">
                      <span className="section-stat-label">Overall Quality Curve</span>
                      <span className="section-stat-value">92.1%</span>
                      <span style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
                        <span>↑ +1.8%</span> <span style={{ color: 'var(--text-muted)' }}>vs last 30d</span>
                      </span>
                    </div>
                    <div className="section-stat-card">
                      <span className="section-stat-label">Ingestion Completeness</span>
                      <span className="section-stat-value">94.2%</span>
                      <span style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
                        <span>↑ +3.1%</span> <span style={{ color: 'var(--text-muted)' }}>vs last 30d</span>
                      </span>
                    </div>
                    <div className="section-stat-card">
                      <span className="section-stat-label">Attribute Distribution</span>
                      <span className="section-stat-value">5.8 avg</span>
                      <span style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', marginTop: '4px' }}>
                        <span>↑ +0.4 specs</span> <span style={{ color: 'var(--text-muted)' }}>per product</span>
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-card)' }}>
                    <h4 className="entity-card-title" style={{ fontSize: '0.94rem' }}>Confidence Distribution curve</h4>
                    <p className="section-desc-text" style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                      Graph rendering is simulated. The highest density of extracted specifications falls in the 85-95% confidence interval.
                    </p>
                    <div style={{ height: '60px', display: 'flex', alignItems: 'flex-end', gap: '4px', marginTop: '16px', padding: '0 20px' }}>
                      {[15, 30, 45, 85, 95, 75, 40, 20, 10].map((val, idx) => (
                        <div key={idx} style={{ flex: 1, height: `${val}%`, background: 'var(--accent)', borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px', padding: '0 10px' }}>
                      <span>&lt; 60% Conf</span>
                      <span>80% Conf</span>
                      <span>90% Conf</span>
                      <span>100% Conf</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* RECOMMENDATIONS VIEW */
              <div className="section-content-card">
                <div className="view-container-padded">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {recommendationsList.map((rec) => (
                      <div key={rec.id} className="catalog-entity-card">
                        <div className="entity-card-header">
                          <h3 className="entity-card-title">{rec.title}</h3>
                          <span className="score-badge score-green">{rec.impact}</span>
                        </div>
                        <p className="entity-card-desc">{rec.description}</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                          {rec.status === 'Applied' ? (
                            <span className="status-badge-chip chip-validated">Applied to Pipeline</span>
                          ) : (
                            <button 
                              type="button" 
                              className="btn-dash-primary"
                              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                              onClick={() => handleApplyRecommendation(rec.id)}
                            >
                              Apply Recommendation
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================
            SECTION 6: SOURCES & INTEGRATIONS
            ======================================================== */}

        {path.startsWith('/dashboard/sources') && (
          <div>
            <header className="section-hero-header">
              <div className="section-hero-left">
                <div className="section-badge">
                  <Database size={14} className="section-badge-icon" />
                  <span>Data Sources</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h1 className="section-title-main">
                    {path === '/dashboard/sources/api-status' ? 'API Health & Latency Monitor' :
                     path === '/dashboard/sources/integrations' ? 'Connected Enterprise Integrations' :
                     path === '/dashboard/sources/history' ? 'Batch Ingestion Upload History' :
                     'Source Ingestion Registry'}
                  </h1>
                  {path === '/dashboard/sources/api-status' && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-card)' }}>Frontend demo status</span>
                  )}
                </div>
                <p className="section-desc-text">
                  Manage file uploads, ERP pipelines, and live REST connector endpoints.
                </p>
              </div>

              <div className="section-actions-bar">
                <button type="button" className="btn-section-action btn-action-primary" onClick={() => requireAuth(() => navigate('/upload'))}>
                  <UploadCloud size={15} />
                  <span>Upload New Source</span>
                </button>
              </div>
            </header>

            {/* Sources sub-tab navigation */}
            <div className="section-actions-bar" style={{ marginTop: '16px', marginBottom: '16px' }}>
              <Link to="/dashboard/sources" className={`btn-section-action ${path === '/dashboard/sources' ? 'btn-action-primary' : ''}`}>Data Sources</Link>
              <Link to="/dashboard/sources/history" className={`btn-section-action ${path === '/dashboard/sources/history' ? 'btn-action-primary' : ''}`}>Upload History</Link>
              <Link to="/dashboard/sources/integrations" className={`btn-section-action ${path === '/dashboard/sources/integrations' ? 'btn-action-primary' : ''}`}>Integrations</Link>
              <Link to="/dashboard/sources/api-status" className={`btn-section-action ${path === '/dashboard/sources/api-status' ? 'btn-action-primary' : ''}`}>API Status</Link>
            </div>

            {/* UPLOAD HISTORY VIEW */}
            {path === '/dashboard/sources/history' ? (
              <div className="section-content-card">
                <div className="view-container-padded">
                  <h3 className="entity-card-title" style={{ marginBottom: '10px' }}>Document & File Ingestion Log</h3>
                  <table className="interactive-table">
                    <thead>
                      <tr>
                        <th>File / Source Name</th>
                        <th>Source Type</th>
                        <th>Uploaded At</th>
                        <th>Ingestion Status</th>
                        <th>SKUs Created</th>
                        <th>AI Processing Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="table-cell-title">grundfos_pump_catalog_2026.pdf</td>
                        <td>PDF Datasheet</td>
                        <td>2026-08-22 08:30</td>
                        <td><span className="status-badge-chip chip-validated">Completed</span></td>
                        <td><strong>8 SKUs</strong></td>
                        <td>Extracted successfully by AI pipeline</td>
                      </tr>
                      <tr>
                        <td className="table-cell-title">siemens_induction_motors.csv</td>
                        <td>CSV Catalog</td>
                        <td>2026-08-21 14:20</td>
                        <td><span className="status-badge-chip chip-validated">Completed</span></td>
                        <td><strong>12 SKUs</strong></td>
                        <td>Extracted successfully by AI pipeline</td>
                      </tr>
                      <tr>
                        <td className="table-cell-title">pressure_transmitters_test.xlsx</td>
                        <td>Excel Spreadsheet</td>
                        <td>2026-08-20 11:10</td>
                        <td><span className="status-badge-chip chip-rejected">Failed</span></td>
                        <td><strong>0 SKUs</strong></td>
                        <td style={{ color: '#F87171' }}>Schema match failed on column 4 (missing unit column)</td>
                      </tr>
                      <tr>
                        <td className="table-cell-title">festo_cylinders_specs.txt</td>
                        <td>Raw Text Spec</td>
                        <td>2026-08-19 16:50</td>
                        <td><span className="status-badge-chip chip-validated">Completed</span></td>
                        <td><strong>3 SKUs</strong></td>
                        <td>Extracted with minor confidence warning</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : path === '/dashboard/sources/api-status' ? (
              /* API HEALTH STATUS VIEW */
              <div className="section-content-card">
                <div className="view-container-padded">
                  <h3 className="entity-card-title" style={{ marginBottom: '10px' }}>API Health & Service Status</h3>
                  <table className="interactive-table">
                    <thead>
                      <tr>
                        <th>Endpoint / Service Name</th>
                        <th>Status</th>
                        <th>Average Latency</th>
                        <th>Last Successful Ping</th>
                        <th>Uptime (30d)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="table-cell-title">/api/v1/ingest/document</td>
                        <td><span className="status-badge-chip chip-validated">Active</span></td>
                        <td>185 ms</td>
                        <td>Just now</td>
                        <td><strong>99.98%</strong></td>
                      </tr>
                      <tr>
                        <td className="table-cell-title">/api/v1/connect/erp</td>
                        <td><span className="status-badge-chip chip-validated">Active</span></td>
                        <td>340 ms</td>
                        <td>1 min ago</td>
                        <td><strong>99.75%</strong></td>
                      </tr>
                      <tr>
                        <td className="table-cell-title">/api/v1/extract/ner</td>
                        <td><span className="status-badge-chip chip-validated">Active</span></td>
                        <td>120 ms</td>
                        <td>Just now</td>
                        <td><strong>100.00%</strong></td>
                      </tr>
                      <tr>
                        <td className="table-cell-title">/api/v1/sync/database</td>
                        <td><span className="status-badge-chip chip-pending">Latency Warning</span></td>
                        <td>1450 ms</td>
                        <td>5 mins ago</td>
                        <td><strong>98.40%</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* DATA SOURCES / INTEGRATIONS CARDS VIEW */
              <div className="section-content-card">
                <div className="view-container-padded">
                  <div className="cards-catalog-grid">
                    {integrationsList.map((int) => (
                      <div key={int.id} className="catalog-entity-card">
                        <div className="entity-card-header">
                          <h3 className="entity-card-title">{int.name}</h3>
                          <span className={`status-badge-chip ${int.status === 'Connected' || int.status === 'Active' ? 'chip-validated' : 'chip-rejected'}`}>
                            {int.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <strong>Type:</strong> {int.type} • <strong>Items Synced:</strong> {int.itemsSynced}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          Last sync: {int.lastSync}
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <button 
                            type="button" 
                            className="btn-table-action"
                            onClick={() => handleToggleIntegration(int.id)}
                          >
                            {int.status === 'Connected' || int.status === 'Active' ? 'Disconnect' : 'Connect'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            SECTION 7: SETTINGS
            ======================================================== */}

        {path.startsWith('/dashboard/settings') && (
          <div>
            <header className="section-hero-header">
              <div className="section-hero-left">
                <div className="section-badge">
                  <Settings size={14} className="section-badge-icon" />
                  <span>Settings</span>
                </div>
                <h1 className="section-title-main">
                  {path === '/dashboard/settings/theme' ? 'Visual Theme Preferences' :
                   path === '/dashboard/settings/profile' ? 'User & Organization Profile' :
                   'System & Ingestion Preferences'}
                </h1>
                <p className="section-desc-text">
                  Configure local workspace preferences, units, and appearance.
                </p>
              </div>
            </header>

            <div className="section-actions-bar" style={{ marginTop: '16px' }}>
              <Link to="/dashboard/settings/preferences" className={`btn-section-action ${path === '/dashboard/settings/preferences' ? 'btn-action-primary' : ''}`}>Preferences</Link>
              <Link to="/dashboard/settings/profile" className={`btn-section-action ${path === '/dashboard/settings/profile' ? 'btn-action-primary' : ''}`}>Profile</Link>
              <Link to="/dashboard/settings/theme" className={`btn-section-action ${path === '/dashboard/settings/theme' ? 'btn-action-primary' : ''}`}>Theme</Link>
            </div>

            {/* THEME SETTINGS */}
            {path === '/dashboard/settings/theme' ? (
              <div className="section-content-card">
                <div className="view-container-padded">
                  <div>
                    <h2 className="entity-card-title" style={{ fontSize: '1.25rem' }}>Appearance</h2>
                    <p className="section-desc-text" style={{ marginTop: '4px' }}>
                      Choose how Adharra looks on your device.
                    </p>
                  </div>

                  <div className="theme-selector-grid">
                    {/* 1. LIGHT THEME */}
                    <div 
                      className={`theme-preview-card ${themeMode === 'light' ? 'theme-active' : ''}`}
                      onClick={() => {
                        setThemeMode('light');
                        setSuccessBanner('Adharra switched to Light theme.');
                      }}
                    >
                      {themeMode === 'light' && (
                        <div className="theme-active-indicator">
                          <CheckCircle2 size={12} />
                          <span>ACTIVE</span>
                        </div>
                      )}
                      
                      {/* Mini Visual Preview */}
                      <div className="theme-mini-canvas canvas-light">
                        <div className="mini-navbar">
                          <div className="mini-logo" />
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#CBD5E1' }} />
                        </div>
                        <div className="mini-card">
                          <div className="mini-line-dark" />
                          <div className="mini-line-gray" />
                          <div className="mini-btn" />
                        </div>
                      </div>

                      <div className="theme-card-info">
                        <div className="theme-card-header-row">
                          <Sun size={20} className="theme-card-icon" />
                          <h3 className="theme-card-title">LIGHT</h3>
                        </div>
                        <p className="theme-card-desc">
                          Clean off-white canvas with white cards, dark navy typography, and vibrant purple highlights.
                        </p>
                      </div>
                    </div>

                    {/* 2. DARK THEME */}
                    <div 
                      className={`theme-preview-card ${themeMode === 'dark' ? 'theme-active' : ''}`}
                      onClick={() => {
                        setThemeMode('dark');
                        setSuccessBanner('Adharra switched to Dark theme.');
                      }}
                    >
                      {themeMode === 'dark' && (
                        <div className="theme-active-indicator">
                          <CheckCircle2 size={12} />
                          <span>ACTIVE</span>
                        </div>
                      )}
                      
                      {/* Mini Visual Preview */}
                      <div className="theme-mini-canvas canvas-dark">
                        <div className="mini-navbar">
                          <div className="mini-logo" />
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#334155' }} />
                        </div>
                        <div className="mini-card">
                          <div className="mini-line-dark" />
                          <div className="mini-line-gray" />
                          <div className="mini-btn" />
                        </div>
                      </div>

                      <div className="theme-card-info">
                        <div className="theme-card-header-row">
                          <Moon size={20} className="theme-card-icon" />
                          <h3 className="theme-card-title">DARK</h3>
                        </div>
                        <p className="theme-card-desc">
                          Signature Adharra deep navy background with dark cards, white text, and electric violet accents.
                        </p>
                      </div>
                    </div>

                    {/* 3. SYSTEM DEFAULT */}
                    <div 
                      className={`theme-preview-card ${themeMode === 'system' ? 'theme-active' : ''}`}
                      onClick={() => {
                        setThemeMode('system');
                        setSuccessBanner('Adharra set to follow System Default preference.');
                      }}
                    >
                      {themeMode === 'system' && (
                        <div className="theme-active-indicator">
                          <CheckCircle2 size={12} />
                          <span>ACTIVE</span>
                        </div>
                      )}
                      
                      {/* Mini Visual Preview */}
                      <div className="theme-mini-canvas canvas-system">
                        <div className="system-half-light">
                          <div style={{ height: '12px', background: '#FFFFFF', borderRadius: '3px', border: '1px solid #CBD5E1' }} />
                          <div style={{ flex: 1, background: '#FFFFFF', borderRadius: '4px', border: '1px solid #CBD5E1' }} />
                        </div>
                        <div className="system-half-dark">
                          <div style={{ height: '12px', background: '#0A0E1A', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.1)' }} />
                          <div style={{ flex: 1, background: '#131A2B', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }} />
                        </div>
                      </div>

                      <div className="theme-card-info">
                        <div className="theme-card-header-row">
                          <Monitor size={20} className="theme-card-icon" />
                          <h3 className="theme-card-title">SYSTEM</h3>
                        </div>
                        <p className="theme-card-desc">
                          Automatically follows your device operating system color scheme preference ({resolvedTheme.toUpperCase()}).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : path === '/dashboard/settings/profile' ? (
              /* PROFILE SETTINGS */
              <div className="section-content-card">
                <div className="view-container-padded">
                  <form onSubmit={(e) => { 
                    e.preventDefault(); 
                    if (!requireAuth()) return; 
                    localStorage.setItem('adharra_settings', JSON.stringify(settingsForm));
                    setSuccessBanner('Profile changes saved locally.'); 
                  }}>
                    <div className="interactive-form-grid">
                      <div>
                        <label className="field-label">Full Name</label>
                        <input 
                          type="text" 
                          className="interactive-input"
                          value={settingsForm.name}
                          onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="field-label">Email Address</label>
                        <input 
                          type="email" 
                          className="interactive-input"
                          value={settingsForm.email}
                          onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="field-label">Role</label>
                        <input 
                          type="text" 
                          className="interactive-input"
                          value={settingsForm.role}
                          onChange={(e) => setSettingsForm({ ...settingsForm, role: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="field-label">Organization</label>
                        <input 
                          type="text" 
                          className="interactive-input"
                          value={settingsForm.company}
                          onChange={(e) => setSettingsForm({ ...settingsForm, company: e.target.value })}
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn-dash-primary" style={{ marginTop: '16px' }}>
                      Save Profile Updates
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              /* PREFERENCES SETTINGS */
              <div className="section-content-card">
                <div className="view-container-padded">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="entity-card-header">
                      <div>
                        <span className="entity-card-title">Automated AI Unit Conversion</span>
                        <p className="entity-card-desc">Automatically standardize PSI to Bar and GPM to m³/h on ingestion.</p>
                      </div>
                      <div className="toggle-switch-wrap" onClick={() => { 
                        if (!requireAuth()) return; 
                        const nextSettings = { ...settingsForm, autoEnrich: !settingsForm.autoEnrich };
                        setSettingsForm(nextSettings);
                        localStorage.setItem('adharra_settings', JSON.stringify(nextSettings));
                      }}>
                        <div className={`toggle-switch-track ${settingsForm.autoEnrich ? 'is-on' : ''}`}>
                          <div className="toggle-switch-thumb" />
                        </div>
                      </div>
                    </div>
 
                    <div className="entity-card-header">
                      <div>
                        <span className="entity-card-title">Real-Time Validation Alerts</span>
                        <p className="entity-card-desc">Notify when low confidence or anomalous parameters are flagged.</p>
                      </div>
                      <div className="toggle-switch-wrap" onClick={() => { 
                        if (!requireAuth()) return; 
                        const nextSettings = { ...settingsForm, emailNotifications: !settingsForm.emailNotifications };
                        setSettingsForm(nextSettings);
                        localStorage.setItem('adharra_settings', JSON.stringify(nextSettings));
                      }}>
                        <div className={`toggle-switch-track ${settingsForm.emailNotifications ? 'is-on' : ''}`}>
                          <div className="toggle-switch-thumb" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================
            SECTION 8: SUPPORT & DOCUMENTATION
            ======================================================== */}

        {path.startsWith('/dashboard/support') && (
          <div>
            <header className="section-hero-header">
              <div className="section-hero-left">
                <div className="section-badge">
                  <HelpCircle size={14} className="section-badge-icon" />
                  <span>Support</span>
                </div>
                <h1 className="section-title-main">
                  {path === '/dashboard/support/contact' ? 'Contact Solutions Engineering' :
                   path === '/dashboard/support/documentation' ? 'Technical Documentation & Guides' :
                   'Help & Resource Center'}
                </h1>
                <p className="section-desc-text">
                  Access catalog ingestion guides, API reference docs, or submit engineering tickets.
                </p>
              </div>
            </header>

            <div className="section-actions-bar" style={{ marginTop: '16px' }}>
              <Link to="/dashboard/support" className={`btn-section-action ${path === '/dashboard/support' ? 'btn-action-primary' : ''}`}>FAQ & Guides</Link>
              <Link to="/dashboard/support/documentation" className={`btn-section-action ${path === '/dashboard/support/documentation' ? 'btn-action-primary' : ''}`}>Docs</Link>
              <Link to="/dashboard/support/contact" className={`btn-section-action ${path === '/dashboard/support/contact' ? 'btn-action-primary' : ''}`}>Contact Support</Link>
            </div>

            {/* CONTACT SUPPORT FORM */}
            {path === '/dashboard/support/contact' ? (
              <div className="section-content-card">
                <div className="view-container-padded">
                  {supportSuccess ? (
                    <div className="success-action-banner">
                      <CheckCircle2 size={20} />
                      <span>{supportSuccess}</span>
                    </div>
                  ) : null}

                  <form onSubmit={handleSupportSubmit} style={{ marginTop: '8px' }}>
                    <div className="interactive-form-grid">
                      <div>
                        <label className="field-label">Subject</label>
                        <input 
                          type="text" 
                          className="interactive-input"
                          placeholder="e.g. Need assistance with Custom Valve Schema"
                          value={supportForm.subject}
                          onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="field-label">Priority</label>
                        <select 
                          className="interactive-input"
                          value={supportForm.priority}
                          onChange={(e) => setSupportForm({ ...supportForm, priority: e.target.value })}
                        >
                          <option value="Low">Low</option>
                          <option value="Normal">Normal</option>
                          <option value="High">High (Production Blocked)</option>
                        </select>
                      </div>
                      <div className="interactive-form-full">
                        <label className="field-label">Description of Issue</label>
                        <textarea 
                          rows={4}
                          className="interactive-textarea"
                          placeholder="Describe the issue or data model inquiry..."
                          value={supportForm.message}
                          onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn-dash-primary" style={{ marginTop: '16px' }}>
                      <Send size={15} />
                      <span>Submit Support Ticket</span>
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              /* FAQ & DOCS VIEW */
              <div className="section-content-card">
                <div className="view-container-padded">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { q: 'How does multi-source product ingestion work?', a: 'ADHARRA supports PDF datasheets, CSV spreadsheets, direct supplier URLs, and manual entry in a unified batch session via the /upload interface.' },
                      { q: 'How are attribute confidence scores computed?', a: 'Extractors use bayesian certainty thresholds based on token positional proximity and validation constraint matching.' },
                      { q: 'Can I export validated catalog items?', a: 'Yes, once approved in the Validation Queue, products can be exported in standardized JSON, CSV, or PDF formats, or synced with ERP connectors.' }
                    ].map((item, idx) => (
                      <div key={idx} className="catalog-entity-card" style={{ padding: '14px' }}>
                        <div 
                          className="entity-card-header" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => setFaqExpanded({ ...faqExpanded, [idx]: !faqExpanded[idx] })}
                        >
                          <h4 className="entity-card-title" style={{ fontSize: '0.9rem' }}>{item.q}</h4>
                          {faqExpanded[idx] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                        {faqExpanded[idx] && (
                          <p className="entity-card-desc" style={{ marginTop: '8px' }}>{item.a}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default DashboardSectionView;

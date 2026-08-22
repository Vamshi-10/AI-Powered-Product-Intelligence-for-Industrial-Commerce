import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  CheckSquare, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  HelpCircle, 
  RefreshCw, 
  UserCheck, 
  Eye, 
  X,
  Clock,
  Layers,
  ChevronRight,
  Database,
  Cpu
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { hitlService } from '../../services/hitlService';
import './HitlPage.css';

const HitlPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Review Queue state
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({ pending: 0, lowConfidence: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [reasonFilter, setReasonFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal / Review Panel State
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalMode, setModalMode] = useState('overview'); // 'overview' | 'correct' | 'reject'
  const [correctionInput, setCorrectionInput] = useState('');
  const [rejectionInput, setRejectionInput] = useState('');
  const [rejectionPreset, setRejectionPreset] = useState('Incompatible specification');

  // Feedback Banner
  const [bannerMessage, setBannerMessage] = useState('');
  const [bannerType, setBannerType] = useState('success');

  // Load Queue & Stats
  const loadData = async () => {
    setLoading(true);
    const data = await hitlService.getQueue();
    setQueue(data);
    setStats(hitlService.getStats());
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Show temporary banner
  const showBanner = (msg, type = 'success') => {
    setBannerMessage(msg);
    setBannerType(type);
    setTimeout(() => {
      setBannerMessage('');
    }, 4500);
  };

  // Auth gate for protected mutating actions
  const requireAuth = (callback) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location } });
      return false;
    }
    if (callback) callback();
    return true;
  };

  // Open Review Dialog
  const handleOpenReview = (item) => {
    setSelectedItem(item);
    setModalMode('overview');
    setCorrectionInput(item.correctedValue || item.aiSuggestedValue || '');
    setRejectionInput(item.rejectionReason || '');
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
    setModalMode('overview');
    setCorrectionInput('');
    setRejectionInput('');
  };

  // 1. APPROVE ACTION
  const handleApprove = async () => {
    if (!requireAuth()) return;
    if (!selectedItem) return;

    await hitlService.approveItem(selectedItem.id, user);
    await loadData();
    showBanner(`Product "${selectedItem.productName}" approved with AI suggested value.`);
    handleCloseModal();
  };

  // 2. CORRECT ACTION (Save & Approve)
  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    if (!requireAuth()) return;
    if (!selectedItem) return;
    if (!correctionInput.trim()) return;

    await hitlService.correctItem(selectedItem.id, correctionInput.trim(), user);
    await loadData();
    showBanner(`Corrected value saved and approved for "${selectedItem.attribute}".`);
    handleCloseModal();
  };

  // 3. REJECT ACTION (Confirm Rejection)
  const handleConfirmRejection = async (e) => {
    e.preventDefault();
    if (!requireAuth()) return;
    if (!selectedItem) return;
    const finalReason = rejectionInput.trim() || rejectionPreset;

    await hitlService.rejectItem(selectedItem.id, finalReason, user);
    await loadData();
    showBanner(`AI suggestion rejected for "${selectedItem.attribute}".`, 'warning');
    handleCloseModal();
  };

  // Quick Reset / Clear for demo & empty-state testing
  const handleResetQueue = () => {
    hitlService.resetQueue();
    loadData();
    showBanner('Sample HITL review queue reset to initial state.');
  };

  const handleClearQueue = () => {
    hitlService.clearQueue();
    loadData();
    showBanner('Review queue cleared. Displaying empty state.', 'info');
  };

  // Filtered Queue List
  const filteredQueue = queue.filter(item => {
    const matchesSearch = 
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.attribute.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesReason = reasonFilter === 'All' || item.reason === reasonFilter;
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

    return matchesSearch && matchesReason && matchesStatus;
  });

  // Confidence score badge styling helper
  const getConfidenceBadgeClass = (score) => {
    if (score >= 80) return 'hitl-conf-high';
    if (score >= 60) return 'hitl-conf-med';
    return 'hitl-conf-low';
  };

  // Status badge styling helper
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Human Approved': return 'hitl-status-approved';
      case 'Human Corrected': return 'hitl-status-corrected';
      case 'Human Rejected': return 'hitl-status-rejected';
      default: return 'hitl-status-pending';
    }
  };

  return (
    <div className="hitl-page-container">
      <div className="dash-max-wrapper">

        {/* Global Breadcrumbs */}
        <nav className="section-breadcrumb" aria-label="Breadcrumb">
          <Link to="/dashboard" className="breadcrumb-link">Home</Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-section">Validation</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Human-in-the-Loop (HITL)</span>
        </nav>

        {/* Feedback Alert Banner */}
        {bannerMessage && (
          <div className={`hitl-feedback-banner hitl-banner-${bannerType}`} role="status">
            {bannerType === 'warning' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            <span>{bannerMessage}</span>
          </div>
        )}

        {/* Header */}
        <header className="section-hero-header">
          <div className="section-hero-left">
            <div className="section-badge">
              <UserCheck size={14} className="section-badge-icon" />
              <span>Human-in-the-Loop (HITL)</span>
            </div>
            <h1 className="section-title-main">Human-in-the-Loop (HITL)</h1>
            <p className="section-desc-text">
              Review, correct, approve, or reject AI-generated product data before final validation.
            </p>
          </div>

          <div className="section-actions-bar">
            <button 
              type="button" 
              className="btn-section-action" 
              onClick={handleClearQueue}
              title="Clear queue to preview empty state"
            >
              Test Empty State
            </button>
            <button 
              type="button" 
              className="btn-section-action btn-action-primary" 
              onClick={handleResetQueue}
              title="Reload sample review items"
            >
              <RefreshCw size={14} />
              <span>Reset Sample Queue</span>
            </button>
          </div>
        </header>

        {/* Sub-Navigation Tabs */}
        <div className="section-actions-bar" style={{ marginTop: '16px', marginBottom: '24px' }}>
          <Link to="/dashboard/validation" className="btn-section-action">Approval Queue</Link>
          <Link to="/dashboard/validation/hitl" className="btn-section-action btn-action-primary">Human-in-the-Loop (HITL)</Link>
          <Link to="/dashboard/validation/rules" className="btn-section-action">Validation Rules</Link>
          <Link to="/dashboard/validation/review" className="btn-section-action">Manual Review & Audit</Link>
        </div>

        {/* Summary Metric Cards */}
        <div className="section-stats-grid hitl-stats-grid">
          <div className="section-stat-card hitl-stat-card">
            <div className="hitl-stat-header">
              <span className="section-stat-label">Pending Human Review</span>
              <Clock size={16} className="hitl-stat-icon icon-pending" />
            </div>
            <span className="section-stat-value">{stats.pending}</span>
            <span className="hitl-stat-subtext">Awaiting human decision</span>
          </div>

          <div className="section-stat-card hitl-stat-card">
            <div className="hitl-stat-header">
              <span className="section-stat-label">Low Confidence</span>
              <AlertTriangle size={16} className="hitl-stat-icon icon-low-conf" />
            </div>
            <span className="section-stat-value">{stats.lowConfidence}</span>
            <span className="hitl-stat-subtext">Score &lt; 70% certainty</span>
          </div>

          <div className="section-stat-card hitl-stat-card">
            <div className="hitl-stat-header">
              <span className="section-stat-label">Approved</span>
              <CheckCircle2 size={16} className="hitl-stat-icon icon-approved" />
            </div>
            <span className="section-stat-value">{stats.approved}</span>
            <span className="hitl-stat-subtext">Accepted or corrected</span>
          </div>

          <div className="section-stat-card hitl-stat-card">
            <div className="hitl-stat-header">
              <span className="section-stat-label">Rejected</span>
              <XCircle size={16} className="hitl-stat-icon icon-rejected" />
            </div>
            <span className="section-stat-value">{stats.rejected}</span>
            <span className="hitl-stat-subtext">Dismissed AI suggestions</span>
          </div>
        </div>

        {/* HOW HITL WORKS WORKFLOW VISUALIZER */}
        <div className="hitl-workflow-card">
          <div className="hitl-workflow-header">
            <div className="hitl-workflow-title-wrap">
              <Sparkles size={16} className="hitl-workflow-sparkle" />
              <h3 className="hitl-workflow-title">HITL Continuous Quality Gate</h3>
            </div>
            <span className="hitl-workflow-tag">Dual-Layer Architecture</span>
          </div>

          <div className="hitl-pipeline-flow">
            {/* Step 1 */}
            <div className="hitl-step-node">
              <div className="hitl-step-number">1</div>
              <div className="hitl-step-content">
                <div className="hitl-step-name">Product Data</div>
                <div className="hitl-step-desc">Raw specs, PDFs, ERP feeds</div>
              </div>
            </div>

            <ChevronRight className="hitl-flow-arrow" size={16} />

            {/* Step 2 */}
            <div className="hitl-step-node">
              <div className="hitl-step-number">2</div>
              <div className="hitl-step-content">
                <div className="hitl-step-name">AI Processing</div>
                <div className="hitl-step-desc">Extraction & enrichment</div>
              </div>
            </div>

            <ChevronRight className="hitl-flow-arrow" size={16} />

            {/* Step 3 */}
            <div className="hitl-step-node">
              <div className="hitl-step-number">3</div>
              <div className="hitl-step-content">
                <div className="hitl-step-name">Confidence Scoring</div>
                <div className="hitl-step-desc">Probabilistic weights</div>
              </div>
            </div>

            <ChevronRight className="hitl-flow-arrow" size={16} />

            {/* Step 4 */}
            <div className="hitl-step-node hitl-node-decision">
              <div className="hitl-step-number">4</div>
              <div className="hitl-step-content">
                <div className="hitl-step-name">Rules Evaluation</div>
                <div className="hitl-step-desc">Confidence threshold check</div>
              </div>
            </div>

            <ChevronRight className="hitl-flow-arrow" size={16} />

            {/* Step 5 */}
            <div className="hitl-step-node hitl-node-active">
              <div className="hitl-step-number">5</div>
              <div className="hitl-step-content">
                <div className="hitl-step-name">HITL Review Queue</div>
                <div className="hitl-step-desc">Human verifies edge cases</div>
              </div>
            </div>

            <ChevronRight className="hitl-flow-arrow" size={16} />

            {/* Step 6 */}
            <div className="hitl-step-node hitl-node-result">
              <div className="hitl-step-number">6</div>
              <div className="hitl-step-content">
                <div className="hitl-step-name">Validated Result</div>
                <div className="hitl-step-desc">Authoritative published catalog</div>
              </div>
            </div>
          </div>

          <div className="hitl-routing-legend">
            <div className="legend-item">
              <span className="legend-dot dot-green" />
              <span><strong>High Confidence (&gt;80%):</strong> Automatic standard validation pipeline</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot dot-purple" />
              <span><strong>Low Confidence / Flagged:</strong> Routed into HITL Queue for human review (Approve / Correct / Reject)</span>
            </div>
          </div>
        </div>

        {/* HITL REVIEW QUEUE SECTION */}
        <div className="section-content-card hitl-queue-container">
          <div className="view-container-padded">

            {/* Toolbar: Search & Filters */}
            <div className="interactive-toolbar">
              <div className="section-search-box">
                <Search size={15} className="section-search-icon" />
                <input 
                  type="text"
                  className="section-search-input"
                  placeholder="Search review queue by product, SKU, or attribute..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="toolbar-filters-group">
                <select 
                  className="select-filter"
                  value={reasonFilter}
                  onChange={(e) => setReasonFilter(e.target.value)}
                  aria-label="Filter by reason"
                >
                  <option value="All">All Reasons</option>
                  <option value="Low Confidence">Low Confidence</option>
                  <option value="Missing Attribute">Missing Attribute</option>
                  <option value="Conflicting Data">Conflicting Data</option>
                  <option value="Validation Failed">Validation Failed</option>
                  <option value="Human Review Required">Human Review Required</option>
                </select>

                <select 
                  className="select-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Human Approved">Human Approved</option>
                  <option value="Human Corrected">Human Corrected</option>
                  <option value="Human Rejected">Human Rejected</option>
                </select>
              </div>
            </div>

            {/* Table or Empty State */}
            {filteredQueue.length > 0 ? (
              <div className="interactive-table-wrap">
                <table className="interactive-table hitl-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Attribute</th>
                      <th>Original Value</th>
                      <th>AI Suggested Value</th>
                      <th>Confidence</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQueue.map((item) => (
                      <tr key={item.id} className={item.status !== 'Pending Review' ? 'row-processed' : ''}>
                        <td>
                          <div className="table-cell-title">{item.productName}</div>
                          <span className="table-cell-sku">{item.sku}</span>
                        </td>
                        <td>
                          <span className="hitl-attr-pill">{item.attribute}</span>
                        </td>
                        <td>
                          <span className="hitl-val-original" title={item.originalValue}>
                            {item.originalValue}
                          </span>
                        </td>
                        <td>
                          <div className="hitl-val-suggested-wrap">
                            <span className="hitl-val-suggested">
                              {item.correctedValue || item.aiSuggestedValue}
                            </span>
                            {item.correctedValue && (
                              <span className="hitl-corrected-tag">Corrected</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="hitl-conf-meter-wrap">
                            <span className={`score-badge ${getConfidenceBadgeClass(item.confidenceScore)}`}>
                              {item.confidenceScore}%
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="hitl-reason-chip">
                            {item.reason}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge-chip ${getStatusBadgeClass(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            type="button" 
                            className="btn-table-action btn-hitl-review"
                            onClick={() => handleOpenReview(item)}
                          >
                            <Eye size={13} style={{ marginRight: '4px' }} />
                            <span>Review</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* PROPER EMPTY STATE AS SPECIFIED */
              <div className="hitl-empty-state">
                <div className="hitl-empty-icon-wrap">
                  <CheckCircle2 size={36} className="hitl-empty-icon" />
                </div>
                <h3 className="hitl-empty-title">No items currently require human review.</h3>
                <p className="hitl-empty-desc">
                  All extracted attributes meet automated confidence criteria and schema validations.
                  When low-confidence entities or anomalies are detected, they will automatically appear in this queue.
                </p>
                <button 
                  type="button" 
                  className="btn-dash-primary"
                  onClick={handleResetQueue}
                  style={{ marginTop: '16px' }}
                >
                  Load Sample Review Items
                </button>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* ========================================================
          REVIEW MODAL / SLIDE PANEL
          ======================================================== */}
      {selectedItem && (
        <div className="hitl-modal-overlay" onClick={handleCloseModal}>
          <div className="hitl-modal-container" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="hitl-modal-header">
              <div className="hitl-modal-title-group">
                <div className="section-badge" style={{ marginBottom: '4px' }}>
                  <UserCheck size={12} />
                  <span>Human Verification</span>
                </div>
                <h2 className="hitl-modal-title">{selectedItem.productName}</h2>
                <div className="hitl-modal-meta">
                  <span>Product ID: <strong>{selectedItem.sku}</strong></span>
                  <span>•</span>
                  <span>Category: <strong>{selectedItem.category}</strong></span>
                </div>
              </div>
              <button 
                type="button" 
                className="hitl-modal-close" 
                onClick={handleCloseModal}
                aria-label="Close review dialog"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="hitl-modal-body">

              {/* Specification Attribute Comparison Card */}
              <div className="hitl-comparison-card">
                <div className="hitl-comp-header">
                  <span className="hitl-comp-attribute-label">TARGET ATTRIBUTE:</span>
                  <span className="hitl-comp-attribute-name">{selectedItem.attribute}</span>
                </div>

                <div className="hitl-comp-grid">
                  {/* Original Value */}
                  <div className="hitl-comp-cell">
                    <span className="hitl-comp-cell-label">Original / Source Value</span>
                    <div className="hitl-comp-cell-val original-val">
                      {selectedItem.originalValue}
                    </div>
                  </div>

                  {/* AI Suggested Value */}
                  <div className="hitl-comp-cell">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span className="hitl-comp-cell-label">AI Suggested Value</span>
                      <span className={`score-badge ${getConfidenceBadgeClass(selectedItem.confidenceScore)}`}>
                        {selectedItem.confidenceScore}% Confidence
                      </span>
                    </div>
                    <div className="hitl-comp-cell-val ai-suggested-val">
                      <Sparkles size={14} className="sparkle-icon" />
                      <span>{selectedItem.aiSuggestedValue}</span>
                    </div>
                  </div>

                  {/* Human Corrected Value (if already corrected) */}
                  {selectedItem.correctedValue && (
                    <div className="hitl-comp-cell full-width hitl-comp-corrected-box">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span className="hitl-comp-cell-label" style={{ color: '#60A5FA' }}>Human Corrected Value</span>
                        <span className="status-badge-chip hitl-status-corrected">Human Verified</span>
                      </div>
                      <div className="hitl-comp-cell-val" style={{ fontSize: '1rem', fontWeight: 700, color: '#60A5FA' }}>
                        {selectedItem.correctedValue}
                      </div>
                      {selectedItem.reviewedBy && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Verified by {selectedItem.reviewedBy} on {new Date(selectedItem.reviewedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Reason Banner */}
                <div className="hitl-reason-banner">
                  <AlertTriangle size={15} color="#FBBF24" />
                  <div className="hitl-reason-text">
                    <strong>Reason for Human Review:</strong> {selectedItem.reason} — automated threshold evaluation flagged this attribute for human verification before catalog ingestion.
                  </div>
                </div>
              </div>

              {/* Active Decision Area */}
              {modalMode === 'overview' && (
                <div className="hitl-decision-section">
                  <h4 className="hitl-decision-title">Select Human Review Action</h4>
                  <p className="hitl-decision-subtext">
                    Review the product data above and choose one of the three validation decisions:
                  </p>

                  <div className="hitl-action-buttons-grid">
                    {/* 1. APPROVE BUTTON */}
                    <button 
                      type="button" 
                      className="hitl-btn-choice btn-approve"
                      onClick={handleApprove}
                    >
                      <CheckCircle2 size={18} />
                      <div className="hitl-btn-choice-text">
                        <span className="choice-title">Approve</span>
                        <span className="choice-desc">AI value is correct; accept AI Suggested Value</span>
                      </div>
                    </button>

                    {/* 2. CORRECT BUTTON */}
                    <button 
                      type="button" 
                      className="hitl-btn-choice btn-correct"
                      onClick={() => {
                        setCorrectionInput(selectedItem.correctedValue || '');
                        setModalMode('correct');
                      }}
                    >
                      <Edit3 size={18} />
                      <div className="hitl-btn-choice-text">
                        <span className="choice-title">Correct</span>
                        <span className="choice-desc">AI value is wrong; type authoritative specification</span>
                      </div>
                    </button>

                    {/* 3. REJECT BUTTON */}
                    <button 
                      type="button" 
                      className="hitl-btn-choice btn-reject"
                      onClick={() => setModalMode('reject')}
                    >
                      <XCircle size={18} />
                      <div className="hitl-btn-choice-text">
                        <span className="choice-title">Reject</span>
                        <span className="choice-desc">AI result should not be accepted</span>
                      </div>
                    </button>
                  </div>

                  {!isAuthenticated && (
                    <div className="hitl-auth-note">
                      <span>Note: Action buttons will prompt login to record your reviewer signature.</span>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 2: CORRECT FORM */}
              {modalMode === 'correct' && (
                <form onSubmit={handleSaveCorrection} className="hitl-subform">
                  <div className="hitl-subform-header">
                    <h4 className="hitl-decision-title">Human Attribute Correction</h4>
                    <button 
                      type="button" 
                      className="btn-link-back" 
                      onClick={() => setModalMode('overview')}
                    >
                      ← Back to options
                    </button>
                  </div>

                  <p className="hitl-decision-subtext">
                    Review the source and AI values below, then type the authoritative corrected value:
                  </p>

                  {/* Display-Only Comparison in Correction Mode */}
                  <div className="hitl-correct-display-grid">
                    <div className="hitl-display-field">
                      <span className="hitl-display-label">Original Value:</span>
                      <div className="hitl-display-value original-val">
                        {selectedItem.originalValue}
                      </div>
                    </div>

                    <div className="hitl-display-field">
                      <span className="hitl-display-label">AI Suggested Value:</span>
                      <div className="hitl-display-value ai-val">
                        {selectedItem.aiSuggestedValue}
                      </div>
                    </div>
                  </div>

                  <div className="hitl-field-group" style={{ marginTop: '14px' }}>
                    <label htmlFor="hitl-corrected-input" className="hitl-input-label">
                      Corrected Value:
                    </label>
                    <input 
                      id="hitl-corrected-input"
                      type="text" 
                      className="interactive-input hitl-input-full"
                      placeholder="Type corrected value (e.g. 2.2 MPa)..."
                      value={correctionInput}
                      onChange={(e) => setCorrectionInput(e.target.value)}
                      required
                      autoFocus
                    />
                    <span className="hitl-input-help">
                      Lineage is preserved: Original ({selectedItem.originalValue}) → AI Suggestion ({selectedItem.aiSuggestedValue}) → Human Correction.
                    </span>
                  </div>

                  <div className="hitl-subform-actions">
                    <button 
                      type="button" 
                      className="btn-section-action"
                      onClick={() => setModalMode('overview')}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn-dash-primary"
                      disabled={!correctionInput.trim()}
                    >
                      Save & Approve
                    </button>
                  </div>
                </form>
              )}

              {/* MODE 3: REJECT FORM */}
              {modalMode === 'reject' && (
                <form onSubmit={handleConfirmRejection} className="hitl-subform">
                  <div className="hitl-subform-header">
                    <h4 className="hitl-decision-title">Confirm Rejection</h4>
                    <button 
                      type="button" 
                      className="btn-link-back" 
                      onClick={() => setModalMode('overview')}
                    >
                      ← Back to options
                    </button>
                  </div>

                  <div className="hitl-field-group">
                    <label htmlFor="hitl-rejection-preset" className="hitl-input-label">
                      Rejection Reason Category:
                    </label>
                    <select 
                      id="hitl-rejection-preset"
                      className="select-filter hitl-input-full"
                      value={rejectionPreset}
                      onChange={(e) => setRejectionPreset(e.target.value)}
                    >
                      <option value="Incompatible specification">Incompatible specification</option>
                      <option value="Hallucinated or invalid entity">Hallucinated or invalid entity</option>
                      <option value="Incorrect unit conversion">Incorrect unit conversion</option>
                      <option value="Unparseable raw documentation">Unparseable raw documentation</option>
                      <option value="Vendor taxonomy mismatch">Vendor taxonomy mismatch</option>
                      <option value="Other / Custom Reason">Other / Custom Reason</option>
                    </select>
                  </div>

                  <div className="hitl-field-group" style={{ marginTop: '12px' }}>
                    <label htmlFor="hitl-rejection-input" className="hitl-input-label">
                      Detailed Rejection Notes (Optional):
                    </label>
                    <textarea 
                      id="hitl-rejection-input"
                      rows={3}
                      className="interactive-input hitl-input-full"
                      placeholder="Add notes for the catalog engineering team..."
                      value={rejectionInput}
                      onChange={(e) => setRejectionInput(e.target.value)}
                    />
                  </div>

                  <div className="hitl-subform-actions">
                    <button 
                      type="button" 
                      className="btn-section-action"
                      onClick={() => setModalMode('overview')}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn-dash-primary btn-dash-danger"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </form>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default HitlPage;

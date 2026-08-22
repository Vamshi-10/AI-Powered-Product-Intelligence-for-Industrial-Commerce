import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Clock, 
  ArrowLeft, 
  UploadCloud, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  CheckSquare, 
  FileText, 
  Cpu, 
  Zap,
  ArrowRight,
  Package
} from 'lucide-react';
import { productService } from '../../services/productService';
import { confidenceService } from '../../services/confidenceService';
import { hitlService } from '../../services/hitlService';
import { validationRulesService } from '../../services/validationRulesService';
import './ProcessingPreviewPage.css';

const DEFAULT_STAGES = [
  {
    id: 1,
    name: 'Sources Added',
    desc: 'Multi-source catalog inputs staged and registered for batch parsing.',
    icon: Layers
  },
  {
    id: 2,
    name: 'Document Extraction',
    desc: 'OCR & PDF parser extraction of raw text, tables, and structural blocks.',
    icon: FileText
  },
  {
    id: 3,
    name: 'Attribute Extraction',
    desc: 'Neural entity recognition extracting specifications, voltages, and tolerances.',
    icon: Cpu
  },
  {
    id: 4,
    name: 'AI Enrichment',
    desc: 'Standardized terminology, SI unit conversions, and taxonomy harmonization.',
    icon: Sparkles
  },
  {
    id: 5,
    name: 'Confidence Scoring',
    desc: 'Probabilistic quality weighting & bayesian confidence interval calculations.',
    icon: ShieldCheck
  },
  {
    id: 6,
    name: 'Data Quality Analysis',
    desc: 'Duplicate matching, missing value audits, and integrity constraint verification.',
    icon: Layers
  },
  {
    id: 7,
    name: 'Validation',
    desc: 'Automated policy enforcement and human-in-the-loop review queue routing.',
    icon: CheckSquare
  }
];

const ProcessingPreviewPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const sourceData = location.state?.sourceData || {
    totalCount: 0,
    files: [],
    urls: [],
    manual: [],
    texts: [],
    images: []
  };

  const [activeStage, setActiveStage] = useState(1);
  const [isProcessing, setIsProcessing] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progressPercent, setProgressPercent] = useState(15);

  useEffect(() => {
    let current = 1;
    const interval = setInterval(() => {
      current += 1;
      if (current > 7) {
        clearInterval(interval);
        setIsProcessing(false);
        setIsCompleted(true);
        setActiveStage(7);
        setProgressPercent(100);

        const newIds = location.state?.newProductIds;
        if (newIds && newIds.length > 0) {
          const allProds = productService.getProducts();
          newIds.forEach(id => {
            const updated = productService.updateProduct(id, { status: 'Pending Review' });
            if (updated) {
              // 1. Audit and register multi-source conflicts
              confidenceService.auditProductConflicts(updated);
              
              // 2. Run validation rules
              const valResult = validationRulesService.runValidation(updated, allProds);
              if (!valResult.isValid) {
                // Register failed checks to human review queue
                valResult.results.forEach(res => {
                  if (res.result === 'FAILED') {
                    // Extract a clean attribute title from the rule description
                    let attrName = res.rule;
                    if (res.rule.includes('SKU')) attrName = 'SKU';
                    else if (res.rule.includes('Name')) attrName = 'Product Name';
                    else if (res.rule.includes('Power')) attrName = 'Power Rating';
                    else if (res.rule.includes('Flow')) attrName = 'Flow Rate';
                    else if (res.rule.includes('Voltage')) attrName = 'Voltage';
                    else if (res.rule.includes('Price')) attrName = 'Price';

                    hitlService.registerValidationFailure(
                      updated.id,
                      attrName,
                      res.value,
                      res.value,
                      res.value,
                      res.reason
                    );
                  }
                });
              }
            }
          });
        }
      } else {
        setActiveStage(current);
        setProgressPercent(Math.round((current / 7) * 100));
      }
    }, 600);

    return () => clearInterval(interval);
  }, [location.state]);

  const getStageStatus = (stageId) => {
    if (stageId < activeStage || isCompleted) {
      return { text: 'Completed', type: 'success' };
    }
    if (stageId === activeStage && isProcessing) {
      return { text: 'Processing...', type: 'processing' };
    }
    return { text: 'Waiting', type: 'waiting' };
  };

  return (
    <div className="processing-page-root">
      <div className="processing-max-wrapper">

        {/* Header */}
        <header className="processing-header">
          <div className="processing-header-left">
            <div className="processing-badge">
              <Sparkles size={13} className="processing-badge-icon" />
              <span>Frontend Processing Preview</span>
            </div>
            <h1 className="processing-title">Product Intelligence Processing Pipeline</h1>
            <p className="processing-subtitle">
              Live simulation of staged multi-source inputs progressing through extraction, enrichment, and validation.
            </p>
          </div>

          <div className="processing-header-actions">
            <Link to="/upload" className="btn-dash-secondary">
              <UploadCloud size={16} />
              <span>Upload More Data</span>
            </Link>
            <button 
              type="button"
              onClick={() => {
                const newIds = location.state?.newProductIds;
                if (newIds && newIds.length > 0) {
                  navigate('/dashboard/products', { state: { highlightProductId: newIds[0] } });
                } else {
                  navigate('/dashboard/products');
                }
              }} 
              className="btn-dash-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Package size={16} />
              <span>View in Catalog</span>
            </button>
          </div>
        </header>

        {/* Source Payload Staging Summary */}
        <section className="staging-summary-banner">
          <div className="staging-banner-left">
            <div className="staging-status-icon">
              <CheckCircle2 size={24} className="text-green" />
            </div>
            <div>
              <h3 className="staging-banner-title">
                {sourceData.totalCount > 0 
                  ? `${sourceData.totalCount} Product ${sourceData.totalCount === 1 ? 'Source' : 'Sources'} Registered in Batch` 
                  : 'Demonstration Pipeline Execution'}
              </h3>
              <p className="staging-banner-subtitle">
                {isCompleted 
                  ? 'All 7 pipeline stages have executed in local frontend state.' 
                  : `Processing Stage ${activeStage} of 7 in local simulation...`}
              </p>
            </div>
          </div>

          <div className="staging-breakdown-tags">
            {sourceData.files?.length > 0 && <span className="staging-tag">{sourceData.files.length} Files</span>}
            {sourceData.urls?.length > 0 && <span className="staging-tag">{sourceData.urls.length} URLs</span>}
            {sourceData.manual?.length > 0 && <span className="staging-tag">{sourceData.manual.length} Manual</span>}
            {sourceData.texts?.length > 0 && <span className="staging-tag">{sourceData.texts.length} Text</span>}
            {sourceData.images?.length > 0 && <span className="staging-tag">{sourceData.images.length} Images</span>}
          </div>
        </section>

        {/* 7 Pipeline Stages Timeline */}
        <section className="pipeline-stages-container">
          <div className="pipeline-header-row">
            <div>
              <h2 className="pipeline-stages-title">Pipeline Transformation Stages (7)</h2>
              <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Progress: <strong>{progressPercent}%</strong>
              </div>
            </div>
            <span className="pipeline-mode-pill">
              {isCompleted ? 'Simulation Complete' : 'Executing Simulation...'}
            </span>
          </div>

          <div className="stages-timeline-list">
            {DEFAULT_STAGES.map((stage) => {
              const Icon = stage.icon;
              const statusInfo = getStageStatus(stage.id);
              const isStageDone = statusInfo.type === 'success';
              const isStageActive = statusInfo.type === 'processing';

              return (
                <div 
                  key={stage.id} 
                  className={`stage-card ${isStageDone ? 'stage-completed' : isStageActive ? 'stage-active' : 'stage-waiting'}`}
                >
                  {/* Step Indicator */}
                  <div className="stage-step-indicator">
                    <div className={`step-circle ${isStageDone ? 'step-circle-done' : isStageActive ? 'step-circle-active' : ''}`}>
                      {isStageDone ? <CheckCircle2 size={16} /> : <span>{stage.id}</span>}
                    </div>
                    {stage.id < 7 && <div className="step-connector-line" />}
                  </div>

                  {/* Icon */}
                  <div className={`stage-icon-wrap ${isStageDone ? 'icon-done' : isStageActive ? 'icon-active' : 'icon-waiting'}`}>
                    <Icon size={20} />
                  </div>

                  {/* Details */}
                  <div className="stage-info-content">
                    <div className="stage-title-row">
                      <h4 className="stage-name">{stage.name}</h4>
                      <span className={`stage-status-pill pill-${statusInfo.type}`}>
                        {isStageDone ? <CheckCircle2 size={12} /> : isStageActive ? <Zap size={12} /> : <Clock size={12} />}
                        <span>{statusInfo.text}</span>
                      </span>
                    </div>
                    <p className="stage-desc">{stage.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Completion Banner */}
          {isCompleted && (
            <div className="success-action-banner" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', borderRadius: '12px', border: '1px solid var(--accent-border, #06b6d4)', background: 'var(--bg-card, #ffffff)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={24} style={{ color: 'var(--accent-primary, #06b6d4)' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary, #111827)' }}>Upload Complete</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.88rem', color: 'var(--text-secondary, #475569)' }}>
                    {sourceData.totalCount > 0 
                      ? `${sourceData.totalCount} product source(s) successfully processed and added to catalog.` 
                      : 'Product data has been processed.'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => navigate('/upload')}
                  className="btn-dash-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <UploadCloud size={16} />
                  <span>Start AI Processing</span>
                </button>
                {location.state?.newProductIds?.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/products', { state: { highlightProductId: location.state.newProductIds[0] } })}
                    className="btn-dash-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Package size={16} />
                    <span>View in Product Catalog</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default ProcessingPreviewPage;

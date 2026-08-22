import React from 'react';
import { Activity, ArrowUpRight, UploadCloud } from 'lucide-react';

const ProcessingOverview = ({ onUploadClick }) => {
  return (
    <div className="dash-panel">
      <div className="dash-panel-header">
        <div className="dash-panel-title-wrap">
          <div className="dash-panel-icon-wrap">
            <Activity size={16} />
          </div>
          <div>
            <h3 className="dash-panel-title">AI Processing Overview</h3>
            <p className="dash-panel-subtitle">Real-time throughput & extraction latency</p>
          </div>
        </div>
        <span className="dash-panel-status-pill">Pipeline Idle</span>
      </div>

      <div className="dash-panel-body">
        <div className="chart-empty-state">
          {/* Subtle decorative futuristic grid chart backdrop */}
          <div className="chart-empty-backdrop" aria-hidden="true">
            <svg className="chart-empty-svg" viewBox="0 0 400 160" preserveAspectRatio="none">
              <defs>
                <linearGradient id="emptyLineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="40" x2="400" y2="40" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
              <line x1="0" y1="80" x2="400" y2="80" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
              <line x1="0" y1="120" x2="400" y2="120" stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
              <path d="M0,130 C100,125 200,128 400,130 L400,160 L0,160 Z" fill="url(#emptyLineGrad)" />
              <path d="M0,130 C100,125 200,128 400,130" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="6 6" opacity="0.35" />
            </svg>
          </div>

          <div className="chart-empty-content">
            <div className="empty-state-icon-box">
              <UploadCloud size={24} />
            </div>
            <h4 className="empty-state-heading">No data available yet</h4>
            <p className="empty-state-text">
              Upload product data to begin AI-driven extraction and track processing velocity.
            </p>
            <button 
              type="button" 
              className="empty-action-btn"
              onClick={onUploadClick}
            >
              <span>Upload Product Data</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="dash-panel-footer">
        <div className="footer-metric-item">
          <span className="footer-metric-label">Avg Throughput</span>
          <span className="footer-metric-val">0 items/sec</span>
        </div>
        <div className="footer-metric-item">
          <span className="footer-metric-label">Processing Time</span>
          <span className="footer-metric-val">0 ms</span>
        </div>
        <div className="footer-metric-item">
          <span className="footer-metric-label">Error Rate</span>
          <span className="footer-metric-val">0.0%</span>
        </div>
      </div>
    </div>
  );
};

export default ProcessingOverview;

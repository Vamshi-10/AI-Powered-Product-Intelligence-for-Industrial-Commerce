import React from 'react';
import { BarChart3, HelpCircle } from 'lucide-react';

const BUCKETS = [
  { range: '90 - 100%', label: 'High Confidence', color: 'green' },
  { range: '75 - 89%', label: 'Medium-High', color: 'violet' },
  { range: '50 - 74%', label: 'Moderate', color: 'amber' },
  { range: '< 50%', label: 'Low / Review', color: 'red' }
];

const ConfidenceDistribution = () => {
  return (
    <div className="dash-panel">
      <div className="dash-panel-header">
        <div className="dash-panel-title-wrap">
          <div className="dash-panel-icon-wrap">
            <BarChart3 size={16} />
          </div>
          <div>
            <h3 className="dash-panel-title">Confidence Distribution</h3>
            <p className="dash-panel-subtitle">Probabilistic certainty across attributes</p>
          </div>
        </div>
        <span className="dash-panel-badge-neutral">0 Analyzed</span>
      </div>

      <div className="dash-panel-body">
        <div className="confidence-bars-container">
          <div className="confidence-chart-grid">
            {BUCKETS.map((bucket) => (
              <div key={bucket.range} className="confidence-bar-col">
                <div className="confidence-bar-track">
                  {/* Empty zero-height bar with dashed placeholder outline */}
                  <div className={`confidence-bar-fill bar-${bucket.color} empty-bar`} />
                </div>
                <div className="confidence-col-meta">
                  <span className="confidence-bar-count">0</span>
                  <span className="confidence-bar-range">{bucket.range}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="confidence-empty-callout">
            <p className="confidence-empty-text">
              Confidence distribution will appear after AI analysis.
            </p>
          </div>
        </div>
      </div>

      <div className="dash-panel-footer">
        <div className="footer-metric-item">
          <span className="footer-metric-label">Median Confidence</span>
          <span className="footer-metric-val">-- %</span>
        </div>
        <div className="footer-metric-item">
          <span className="footer-metric-label">Auto-Accepted</span>
          <span className="footer-metric-val">0</span>
        </div>
        <div className="footer-metric-item">
          <span className="footer-metric-label">Flagged for Review</span>
          <span className="footer-metric-val">0</span>
        </div>
      </div>
    </div>
  );
};

export default ConfidenceDistribution;

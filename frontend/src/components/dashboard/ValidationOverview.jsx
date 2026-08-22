import React from 'react';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const ValidationOverview = () => {
  return (
    <div className="dash-panel">
      <div className="dash-panel-header">
        <div className="dash-panel-title-wrap">
          <div className="dash-panel-icon-wrap icon-wrap-green">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <h3 className="dash-panel-title">Validation Overview</h3>
            <p className="dash-panel-subtitle">Review queue status & resolution</p>
          </div>
        </div>
        <span className="dash-panel-badge-neutral">Queue: Empty</span>
      </div>

      <div className="dash-panel-body">
        <div className="validation-stats-stack">
          {/* Item 1: Pending Validation */}
          <div className="validation-stat-row">
            <div className="validation-stat-meta">
              <div className="val-stat-label-wrap">
                <Clock size={16} className="text-amber" />
                <span className="val-stat-label">Pending Validation</span>
              </div>
              <span className="val-stat-number">0</span>
            </div>
            <div className="val-progress-track">
              <div className="val-progress-fill fill-amber" style={{ width: '0%' }} />
            </div>
          </div>

          {/* Item 2: Approved */}
          <div className="validation-stat-row">
            <div className="validation-stat-meta">
              <div className="val-stat-label-wrap">
                <CheckCircle2 size={16} className="text-green" />
                <span className="val-stat-label">Approved</span>
              </div>
              <span className="val-stat-number">0</span>
            </div>
            <div className="val-progress-track">
              <div className="val-progress-fill fill-green" style={{ width: '0%' }} />
            </div>
          </div>

          {/* Item 3: Review Required */}
          <div className="validation-stat-row">
            <div className="validation-stat-meta">
              <div className="val-stat-label-wrap">
                <AlertCircle size={16} className="text-red" />
                <span className="val-stat-label">Review Required</span>
              </div>
              <span className="val-stat-number">0</span>
            </div>
            <div className="val-progress-track">
              <div className="val-progress-fill fill-red" style={{ width: '0%' }} />
            </div>
          </div>
        </div>
      </div>

      <div className="dash-panel-footer">
        <div className="footer-metric-item">
          <span className="footer-metric-label">Approval Rate</span>
          <span className="footer-metric-val">-- %</span>
        </div>
        <div className="footer-metric-item">
          <span className="footer-metric-label">Auto-Validation</span>
          <span className="footer-metric-val">Enabled</span>
        </div>
      </div>
    </div>
  );
};

export default ValidationOverview;

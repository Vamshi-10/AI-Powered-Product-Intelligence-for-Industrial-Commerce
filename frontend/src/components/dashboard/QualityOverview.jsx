import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

const QualityOverview = () => {
  return (
    <div className="dash-panel">
      <div className="dash-panel-header">
        <div className="dash-panel-title-wrap">
          <div className="dash-panel-icon-wrap">
            <ShieldCheck size={16} />
          </div>
          <div>
            <h3 className="dash-panel-title">Data Quality Overview</h3>
            <p className="dash-panel-subtitle">Completeness, accuracy & consistency</p>
          </div>
        </div>
        <span className="dash-panel-badge-neutral">Audit: Pending</span>
      </div>

      <div className="dash-panel-body">
        <div className="donut-empty-container">
          {/* Donut Empty State Ring */}
          <div className="donut-ring-wrap">
            <svg className="donut-ring-svg" viewBox="0 0 140 140">
              <circle
                className="donut-bg-circle"
                cx="70"
                cy="70"
                r="54"
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth="12"
              />
              <circle
                className="donut-dash-circle"
                cx="70"
                cy="70"
                r="54"
                fill="transparent"
                stroke="rgba(139, 92, 246, 0.2)"
                strokeWidth="12"
                strokeDasharray="4 8"
              />
            </svg>
            <div className="donut-center-label">
              <span className="donut-center-main">No Data</span>
              <span className="donut-center-sub">0 Audited</span>
            </div>
          </div>

          <div className="quality-legend-list">
            <div className="quality-legend-item">
              <div className="legend-marker marker-green" />
              <div className="legend-info">
                <span className="legend-name">Complete & Enriched</span>
                <span className="legend-pct">-- %</span>
              </div>
            </div>
            <div className="quality-legend-item">
              <div className="legend-marker marker-violet" />
              <div className="legend-info">
                <span className="legend-name">Clean Standards</span>
                <span className="legend-pct">-- %</span>
              </div>
            </div>
            <div className="quality-legend-item">
              <div className="legend-marker marker-amber" />
              <div className="legend-info">
                <span className="legend-name">Missing Attributes</span>
                <span className="legend-pct">-- %</span>
              </div>
            </div>
            <div className="quality-legend-item">
              <div className="legend-marker marker-red" />
              <div className="legend-info">
                <span className="legend-name">Critical Gaps</span>
                <span className="legend-pct">-- %</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-panel-footer">
        <div className="footer-notice-box">
          <Info size={13} className="footer-notice-icon" />
          <span>Quality scores will calibrate automatically once catalog data is ingested.</span>
        </div>
      </div>
    </div>
  );
};

export default QualityOverview;

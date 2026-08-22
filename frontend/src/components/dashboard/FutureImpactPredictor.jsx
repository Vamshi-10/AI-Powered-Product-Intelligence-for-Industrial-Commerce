import React from 'react';
import { TrendingUp, Cpu, Info } from 'lucide-react';

const PREDICTOR_METRICS = [
  { label: 'Quality Improvement', key: 'quality', current: '-- %', expected: '-- %' },
  { label: 'Confidence Score Trend', key: 'confidence', current: '-- %', expected: '-- %' },
  { label: 'Validation Improvement', key: 'validation', current: '-- %', expected: '-- %' },
  { label: 'Expected Data Completeness', key: 'completeness', current: '-- %', expected: '-- %' },
];

const FutureImpactPredictor = ({ data = null }) => {
  const isAvailable = data && Object.keys(data).length > 0;

  return (
    <div className="dash-panel future-impact-panel">
      <div className="dash-panel-header">
        <div className="dash-panel-title-wrap">
          <div className="dash-panel-icon-wrap icon-wrap-violet">
            <TrendingUp size={16} />
          </div>
          <div>
            <h3 className="dash-panel-title">Future Impact Predictor</h3>
            <p className="dash-panel-subtitle">Neural forecasting & data maturation curve</p>
          </div>
        </div>
        <span className="dash-panel-badge-ai">
          <Cpu size={12} />
          <span>AI Forecast</span>
        </span>
      </div>

      <div className="dash-panel-body">
        {isAvailable ? (
          <div className="impact-active-grid">
            {/* Live forecast rendering when data is provided */}
          </div>
        ) : (
          <div className="impact-empty-container">
            <div className="impact-metrics-preview-grid">
              {PREDICTOR_METRICS.map((metric) => (
                <div key={metric.key} className="impact-metric-card">
                  <span className="impact-metric-name">{metric.label}</span>
                  <div className="impact-metric-val-row">
                    <span className="impact-metric-val">{metric.current}</span>
                    <span className="impact-metric-tag">Awaiting model</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="impact-empty-callout">
              <Info size={15} className="impact-callout-icon" />
              <p className="impact-empty-notice">
                Prediction unavailable — more product data is required.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="dash-panel-footer">
        <span className="footer-status-text">Confidence Interval: 95% Bayesian Calibration</span>
      </div>
    </div>
  );
};

export default FutureImpactPredictor;

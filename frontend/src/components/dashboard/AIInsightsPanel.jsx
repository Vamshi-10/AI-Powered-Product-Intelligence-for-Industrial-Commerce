import React from 'react';
import { Sparkles, Brain } from 'lucide-react';

const AIInsightsPanel = () => {
  return (
    <div className="dash-panel">
      <div className="dash-panel-header">
        <div className="dash-panel-title-wrap">
          <div className="dash-panel-icon-wrap icon-wrap-violet">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="dash-panel-title">Recent AI Insights</h3>
            <p className="dash-panel-subtitle">Automated discoveries & taxonomy patterns</p>
          </div>
        </div>
        <span className="dash-counter-badge">0 Insights</span>
      </div>

      <div className="dash-panel-body">
        <div className="intelligence-empty-state">
          <div className="intel-empty-icon-wrap">
            <Brain size={28} className="intel-empty-icon" />
          </div>
          <h4 className="intel-empty-title">No AI insights yet.</h4>
          <p className="intel-empty-desc">
            The neural inference engine will automatically generate categorical anomalies, 
            unit conversion suggestions, and specification insights once products are ingested.
          </p>
        </div>
      </div>

      <div className="dash-panel-footer">
        <span className="footer-status-text">Engine Status: Standing by for batch stream</span>
      </div>
    </div>
  );
};

export default AIInsightsPanel;

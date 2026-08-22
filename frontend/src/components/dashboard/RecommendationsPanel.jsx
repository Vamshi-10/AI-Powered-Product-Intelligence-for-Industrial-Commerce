import React from 'react';
import { Lightbulb, Compass } from 'lucide-react';

const RecommendationsPanel = () => {
  return (
    <div className="dash-panel">
      <div className="dash-panel-header">
        <div className="dash-panel-title-wrap">
          <div className="dash-panel-icon-wrap icon-wrap-blue">
            <Lightbulb size={16} />
          </div>
          <div>
            <h3 className="dash-panel-title">AI Recommendations</h3>
            <p className="dash-panel-subtitle">Catalog enrichment & taxonomy alignment</p>
          </div>
        </div>
        <span className="dash-counter-badge">0 Active</span>
      </div>

      <div className="dash-panel-body">
        <div className="intelligence-empty-state">
          <div className="intel-empty-icon-wrap">
            <Compass size={28} className="intel-empty-icon text-blue" />
          </div>
          <h4 className="intel-empty-title">Recommendations will appear after product analysis.</h4>
          <p className="intel-empty-desc">
            The enrichment model will suggest standardized unit definitions, brand mappings, 
            and SEO keyword enhancements once data streams are connected.
          </p>
        </div>
      </div>

      <div className="dash-panel-footer">
        <span className="footer-status-text">Enrichment Strategy: High-Precision Mode</span>
      </div>
    </div>
  );
};

export default RecommendationsPanel;

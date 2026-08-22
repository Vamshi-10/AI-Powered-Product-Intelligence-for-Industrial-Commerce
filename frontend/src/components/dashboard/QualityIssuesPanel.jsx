import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

const QualityIssuesPanel = () => {
  return (
    <div className="dash-panel">
      <div className="dash-panel-header">
        <div className="dash-panel-title-wrap">
          <div className="dash-panel-icon-wrap icon-wrap-amber">
            <AlertTriangle size={16} />
          </div>
          <div>
            <h3 className="dash-panel-title">Top Data Quality Issues</h3>
            <p className="dash-panel-subtitle">Rule violations, missing values & duplicates</p>
          </div>
        </div>
        <span className="dash-counter-badge badge-green">0 Issues</span>
      </div>

      <div className="dash-panel-body">
        <div className="intelligence-empty-state">
          <div className="intel-empty-icon-wrap icon-wrap-green">
            <CheckCircle2 size={28} className="intel-empty-icon text-green" />
          </div>
          <h4 className="intel-empty-title">No quality issues detected yet.</h4>
          <p className="intel-empty-desc">
            Automated schema checks, duplicate cross-matching, and missing mandatory attribute 
            audits will flag potential issues here once processing initiates.
          </p>
        </div>
      </div>

      <div className="dash-panel-footer">
        <span className="footer-status-text">Quality Rules: 14 Active Constraints</span>
      </div>
    </div>
  );
};

export default QualityIssuesPanel;

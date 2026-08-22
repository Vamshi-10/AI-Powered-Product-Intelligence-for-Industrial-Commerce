import React from 'react';

const StatCard = ({ title, value, subtext, icon: Icon, badge, color = 'violet' }) => {
  return (
    <div className={`stat-card stat-card-${color}`}>
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {Icon && (
          <div className={`stat-card-icon-wrap icon-wrap-${color}`}>
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="stat-card-body">
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-subtext">{subtext}</div>
      </div>

      {badge && (
        <div className="stat-card-footer">
          <span className="stat-card-badge">{badge}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;

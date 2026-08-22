import React from 'react';
import { 
  UploadCloud, 
  Search, 
  PlayCircle, 
  CheckSquare, 
  TrendingUp, 
  ArrowRight 
} from 'lucide-react';

const ACTIONS = [
  {
    id: 'upload',
    title: 'Upload Product Data',
    desc: 'Add product info from files, links, images, or manual input',
    icon: UploadCloud,
    accentColor: 'violet',
    primary: true
  },
  {
    id: 'browse',
    title: 'Browse Products',
    desc: 'Search, filter and inspect items in the catalog',
    icon: Search,
    accentColor: 'blue'
  },
  {
    id: 'process',
    title: 'Start AI Processing',
    desc: 'Trigger neural attribute extraction pipeline',
    icon: PlayCircle,
    accentColor: 'violet'
  },
  {
    id: 'validation',
    title: 'Review Validation',
    desc: 'Audit confidence thresholds and flag exceptions',
    icon: CheckSquare,
    accentColor: 'green'
  },
  {
    id: 'insights',
    title: 'View Insights',
    desc: 'Explore anomaly clusters and taxonomy trends',
    icon: TrendingUp,
    accentColor: 'cyan'
  }
];

const QuickActions = ({ onActionClick }) => {
  return (
    <section className="quick-actions-section">
      <div className="section-heading-wrap">
        <h3 className="section-main-title">Quick Operations</h3>
        <p className="section-sub-title">Instant workflow accelerators and data pipeline triggers</p>
      </div>

      <div className="quick-actions-grid">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              className={`quick-action-card ${action.primary ? 'primary-action' : ''} action-${action.accentColor}`}
              onClick={() => onActionClick && onActionClick(action.id)}
            >
              <div className="quick-action-icon-wrap">
                <Icon size={20} />
              </div>
              <div className="quick-action-content">
                <h4 className="quick-action-title">{action.title}</h4>
                <p className="quick-action-desc">{action.desc}</p>
              </div>
              <div className="quick-action-arrow">
                <ArrowRight size={16} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default QuickActions;

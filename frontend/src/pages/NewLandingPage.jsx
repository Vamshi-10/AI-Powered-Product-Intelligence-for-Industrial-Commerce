import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Globe, Shield, TrendingUp, ShieldCheck, Cloud, ArrowRight } from 'lucide-react';
import './NewLandingPage.css';

const HERO_BG_IMAGE = "/assets/hero-mountains.png";

/* ── Feature card data ─────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <Grid size={24} strokeWidth={2.5} />,
    title: 'Product Intelligence',
    desc: 'Turn raw product data into structured, intelligent insights.',
  },
  {
    icon: <Globe size={24} strokeWidth={2.5} />,
    title: 'AI Enrichment',
    desc: 'Extract, enrich, and classify product attributes using AI.',
  },
  {
    icon: <Shield size={24} strokeWidth={2.5} />,
    title: 'Data Quality',
    desc: 'Ensure accuracy, completeness and consistency across data.',
  },
  {
    icon: <TrendingUp size={24} strokeWidth={2.5} />,
    title: 'Real-time Insights',
    desc: 'Get actionable insights and trends in real-time.',
  },
  {
    icon: <ShieldCheck size={24} strokeWidth={2.5} />,
    title: 'Smart Validation',
    desc: 'Validate and verify data with confidence scores.',
  },
  {
    icon: <Cloud size={24} strokeWidth={2.5} />,
    title: 'Seamless Integration',
    desc: 'Easily integrate with your tools and data sources.',
  },
];

/* ── Component ─────────────────────────────────────────────────────────── */
const NewLandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="new-lp-root">
      
      {/* ── SECTION 1: DARK HERO ────────────────────────────────────────── */}
      <section 
        className="new-lp-hero"
        style={{ '--hero-bg-img': `url(${HERO_BG_IMAGE})` }}
      >
        
        {/* Header Row */}
        <header className="new-lp-header">
          <div className="new-lp-logo-wrap">
            <div className="new-lp-logo-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <span className="new-lp-logo-text">ADHARRA</span>
          </div>
        </header>

        {/* Hero Content */}
        <div className="new-lp-hero-content">
          {/* Left Column */}
          <div className="new-lp-hero-left">
            <span className="new-lp-badge">
              ⚡ AI-POWERED PRODUCT INTELLIGENCE
            </span>

            <h1 className="new-lp-title">
              <span className="new-lp-title-line">
                <span className="new-lp-text-white">Smarter </span>
                <span className="new-lp-text-gradient">Products.</span>
              </span>
              <span className="new-lp-title-line">
                <span className="new-lp-text-white">Stronger </span>
                <span className="new-lp-text-gradient">Decisions.</span>
              </span>
            </h1>

            <p className="new-lp-desc">
              Adharra helps industrial businesses turn product data into actionable intelligence 
              with AI-driven enrichment, quality analysis, and real-time insights.
            </p>

            <div className="new-lp-actions">
              <button
                className="new-lp-btn-primary"
                onClick={() => navigate('/login')}
              >
                ⚡ Get Started
              </button>

              <button
                className="new-lp-btn-secondary"
                onClick={() => navigate('/dashboard')}
              >
                Explore Dashboard 
                <ArrowRight className="arrow" size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>


      </section>

      {/* ── SECTION 2: LIGHT FEATURE SECTION ─────────────────────────────── */}
      <section className="new-lp-features-section">
        <span className="new-lp-section-label">WHY ADHARRA?</span>
        <h2 className="new-lp-section-title">
          Good design <span className="highlight">delivers</span> results
        </h2>
        <p className="new-lp-section-desc">
          We're a product intelligence platform that helps you analyze, enrich, and validate product data. 
          Better data. Smarter insights. Stronger business outcomes.
        </p>

        <div className="new-lp-grid">
          {FEATURES.map((feature, idx) => (
            <div className="new-lp-card" key={idx}>
              <div className="new-lp-card-icon">{feature.icon}</div>
              <h3 className="new-lp-card-title">{feature.title}</h3>
              <p className="new-lp-card-desc">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};

export default NewLandingPage;

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

/* ── Neon Mountain SVG ─────────────────────────────────────────────────── */
const NeonMountain = () => (
  <svg
    className="neon-mountain-svg"
    viewBox="0 0 700 500"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="glowCenter" cx="55%" cy="30%" r="55%">
        <stop offset="0%" stopColor="#c026d3" stopOpacity="0.55" />
        <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.25" />
        <stop offset="100%" stopColor="#0f0620" stopOpacity="0" />
      </radialGradient>
      <filter id="lineGlow">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="peakGlow">
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id="ridgeGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0" />
        <stop offset="35%" stopColor="#a855f7" stopOpacity="0.9" />
        <stop offset="55%" stopColor="#e879f9" stopOpacity="1" />
        <stop offset="75%" stopColor="#a855f7" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="ridgeGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#6d28d9" stopOpacity="0" />
        <stop offset="30%" stopColor="#8b5cf6" stopOpacity="0.7" />
        <stop offset="60%" stopColor="#c084fc" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#6d28d9" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="ridgeGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#4c1d95" stopOpacity="0" />
        <stop offset="40%" stopColor="#7c3aed" stopOpacity="0.6" />
        <stop offset="65%" stopColor="#a78bfa" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
      </linearGradient>
    </defs>

    {/* Background glow blob */}
    <ellipse cx="390" cy="200" rx="320" ry="250" fill="url(#glowCenter)" />

    {/* Stars / particles */}
    {[
      [80, 40], [130, 70], [200, 30], [310, 55], [430, 25], [520, 60],
      [600, 35], [650, 90], [580, 130], [490, 110], [370, 80], [260, 95],
      [150, 120], [60, 100], [700, 55], [340, 15], [460, 70],
    ].map(([cx, cy], i) => (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={i % 3 === 0 ? 1.5 : 1}
        fill="white"
        opacity={0.3 + (i % 4) * 0.15}
      />
    ))}

    {/* ── Rear/distant ridges (darkest, thinnest) ─────────────────────── */}
    <polyline
      filter="url(#lineGlow)"
      fill="none"
      stroke="#6d28d9"
      strokeWidth="1"
      strokeOpacity="0.4"
      points="0,420 80,370 140,340 190,290 240,260 280,230 310,200 345,170 370,145 395,120 420,145 445,165 480,195 520,225 560,255 600,280 650,310 700,340"
    />
    <polyline
      filter="url(#lineGlow)"
      fill="none"
      stroke="#7c3aed"
      strokeWidth="1"
      strokeOpacity="0.35"
      points="0,440 60,400 110,370 165,345 215,315 260,285 295,250 325,215 355,185 380,158 410,135 440,158 470,180 505,210 545,240 590,268 640,295 700,320"
    />

    {/* ── Middle ridges ───────────────────────────────────────────────── */}
    <polyline
      filter="url(#lineGlow)"
      fill="none"
      stroke="url(#ridgeGrad3)"
      strokeWidth="1.5"
      points="0,460 50,430 100,405 155,380 205,355 250,325 285,295 315,265 345,240 375,215 405,190 430,165 455,140 478,118 500,100 520,88 540,100 558,120 575,140 592,160 615,185 645,215 680,245 700,265"
    />
    <polyline
      filter="url(#lineGlow)"
      fill="none"
      stroke="url(#ridgeGrad3)"
      strokeWidth="1"
      strokeOpacity="0.5"
      points="0,470 45,445 95,420 150,398 200,372 245,345 280,318 310,290 340,262 370,234 400,208 428,182 455,158 478,134 500,112 518,95 536,80 550,68 560,58 570,50 578,44 586,50 598,65 612,85 628,108 645,132 665,160 688,190 700,210"
    />

    {/* ── Main peak ridge (bright magenta-violet) ─────────────────────── */}
    <polyline
      filter="url(#peakGlow)"
      fill="none"
      stroke="url(#ridgeGrad1)"
      strokeWidth="2.5"
      points="0,490 40,468 85,448 130,425 175,400 215,372 250,342 280,310 308,278 333,248 357,220 380,193 400,170 418,148 435,128 450,110 462,94 472,80 480,68 487,56 493,47 498,38 503,30 508,22 512,16 516,22 520,32 525,42 530,52 536,64 543,76 551,90 560,106 572,124 585,144 600,165 618,188 638,213 660,240 683,268 700,288"
    />

    {/* ── Bright peak highlight line ───────────────────────────────────── */}
    <polyline
      filter="url(#peakGlow)"
      fill="none"
      stroke="#f0abfc"
      strokeWidth="1.5"
      strokeOpacity="0.85"
      points="460,110 470,88 478,70 485,55 491,42 496,32 500,24 504,16 507,10 510,4 513,10 516,18 519,28 523,40 529,54 537,70 546,88 557,108"
    />

    {/* ── Foreground ridge lines (widest, closest) ─────────────────────── */}
    <polyline
      filter="url(#lineGlow)"
      fill="none"
      stroke="url(#ridgeGrad2)"
      strokeWidth="2"
      points="0,500 30,485 70,470 110,452 155,432 195,408 228,382 258,354 285,325 310,298 335,272 358,247 380,224 400,202 420,182 440,163 458,146 475,130 490,116 505,103 518,92 530,83 540,76 548,72 554,70 560,72 567,76 576,83 587,93 600,106 615,121 632,139 650,159 670,181 692,205 700,218"
    />
    <polyline
      filter="url(#lineGlow)"
      fill="none"
      stroke="#8b5cf6"
      strokeWidth="1"
      strokeOpacity="0.4"
      points="0,500 25,490 60,478 100,462 145,444 185,424 220,400 252,374 280,347 305,320 330,294 354,270 376,247 397,226 417,206 436,188 454,171 471,156 487,143 501,131 514,121 526,113 536,107 545,103 552,101 558,100 564,101 572,105 581,111 593,120 607,132 622,147 639,165 657,185 677,208 697,232 700,236"
    />

    {/* ── Vertical glow lines on peak ─────────────────────────────────── */}
    <line x1="510" y1="4" x2="510" y2="80" stroke="#f0abfc" strokeWidth="0.8" strokeOpacity="0.5" filter="url(#lineGlow)" />
    <line x1="505" y1="20" x2="505" y2="90" stroke="#e879f9" strokeWidth="0.5" strokeOpacity="0.3" filter="url(#lineGlow)" />
  </svg>
);

/* ── Feature card data ─────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    title: 'Product Intelligence',
    desc: 'Turn raw product data into structured, intelligent insights.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/>
        <circle cx="12" cy="9" r="2.5"/>
      </svg>
    ),
    title: 'AI Enrichment',
    desc: 'Extract, enrich, and classify product attributes using AI.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
    ),
    title: 'Data Quality',
    desc: 'Ensure accuracy, completeness and consistency across data.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: 'Real-time Insights',
    desc: 'Get actionable insights and trends in real-time.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
    title: 'Smart Validation',
    desc: 'Validate and verify data with confidence scores.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 16.98h-5.99c-1.1 0-1.95.68-2.23 1.63L8 22l-1.78-3.39C5.94 17.66 5.09 17 4 17H2"/>
        <path d="M22 12h-3M2 12h3M12 2v3M12 19v3"/>
        <circle cx="12" cy="12" r="4"/>
      </svg>
    ),
    title: 'Seamless Integration',
    desc: 'Easily integrate with your tools and data sources.',
  },
];

/* ── Component ─────────────────────────────────────────────────────────── */
const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="lp-root">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <header className="lp-header">
        <div className="lp-logo">
          <div className="lp-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <span className="lp-logo-text">ADHARRA</span>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="lp-hero">
        {/* Subtle grid overlay */}
        <div className="lp-hero-grid" aria-hidden="true" />

        {/* Left column */}
        <div className="lp-hero-left">
          <span className="lp-eyebrow">
            <span className="lp-eyebrow-dot" />
            AI-Powered Product Intelligence
          </span>

          <h1 className="lp-hero-title">
            <span className="lp-title-white">Smarter Products.</span>
            <span className="lp-title-gradient">Stronger Decisions.</span>
          </h1>

          <p className="lp-hero-desc">
            Adharra helps industrial businesses turn product data into
            actionable intelligence with AI-driven enrichment, quality
            analysis, and real-time insights.
          </p>

          <div className="lp-hero-actions">
            <button
              className="lp-btn lp-btn-primary"
              onClick={() => navigate('/login')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Get Started
            </button>

            <button
              className="lp-btn lp-btn-ghost"
              onClick={() => navigate('/dashboard')}
            >
              Explore Dashboard
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Right column — neon mountain */}
        <div className="lp-hero-right" aria-hidden="true">
          <NeonMountain />
        </div>
      </section>

      {/* ── WHY ADHARRA ─────────────────────────────────────────────────── */}
      <section className="lp-why">
        <div className="lp-why-inner">
          <p className="lp-why-eyebrow">WHY ADHARRA?</p>
          <h2 className="lp-why-title">
            Good design <span className="lp-why-highlight">delivers</span> results
          </h2>
          <p className="lp-why-subtitle">
            We're a product intelligence platform that helps you analyze, enrich, and validate product data.<br />
            Better data. Smarter insights. Stronger business outcomes.
          </p>

          <div className="lp-features-grid">
            {FEATURES.map((f) => (
              <div className="lp-feature-card" key={f.title}>
                <div className="lp-feature-icon">{f.icon}</div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <p>
          &copy; {new Date().getFullYear()}{' '}
          <span className="lp-footer-brand">ADHARRA</span>
          {' '}— AI-Powered Product Intelligence for Industrial Commerce
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;

import React, { useState } from 'react';
import { Settings, Bell, Sun, Moon, Monitor, Save, CheckCircle2, User, ChevronRight, Sparkles, Box, Eye } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import './PageLayout.css';

const TABS = [
  { id: 'profile',       label: 'Profile',        icon: User      },
  { id: 'preferences',   label: 'Preferences',    icon: Settings  },
  { id: 'notifications', label: 'Notifications',  icon: Bell      },
  { id: 'theme',         label: 'Appearance',     icon: Sun       },
];

const DEFAULT_PROFILE = {
  fullName: 'Ari S.',
  email: 'ari@adharra.ai',
  jobTitle: 'Product Data Analyst',
  role: 'Reviewer',
  department: 'Product Operations',
  organization: 'ADHARRA Industrial Commerce',
  region: 'India'
};

function getInitials(fullName, email) {
  const name = fullName || '';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    if (email && email.trim().length > 0) {
      return email.trim()[0].toUpperCase();
    }
    return "U";
  }
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const DEFAULT_PREFS = {
  autoProcessing:   true,
  confidenceThreshold: 75,
  autoEnrichment:   true,
  routeLowConfidence: true,
  exportFormat:     'json',
  pageSize:         20,
  language:         'en',
};

const DEFAULT_NOTIFS = {
  pipelineComplete: true,
  lowConfidence:    true,
  validationPending:true,
  productValidated: false,
  weeklyDigest:     true,
  systemAlerts:     true,
};

export default function SettingsPage() {
  const { themeMode, setThemeMode, accentMode, setAccentMode } = useTheme();
  const [tab, setTab] = useState('profile');
  
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('adharra_profile_data') || 'null') || DEFAULT_PROFILE; } catch { return DEFAULT_PROFILE; }
  });
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('adharra_prefs') || 'null') || DEFAULT_PREFS; } catch { return DEFAULT_PREFS; }
  });
  const [notifs, setNotifs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('adharra_notifs') || 'null') || DEFAULT_NOTIFS; } catch { return DEFAULT_NOTIFS; }
  });
  const [banner, setBanner] = useState('');

  const showBanner = (msg) => { setBanner(msg); setTimeout(() => setBanner(''), 2500); };

  const saveProfileField = (key, val) => {
    const updated = { ...profile, [key]: val };
    setProfile(updated);
  };

  const saveProfile = () => {
    localStorage.setItem('adharra_profile_data', JSON.stringify(profile));
    showBanner('Profile saved successfully.');
  };

  const savePref = (key, val) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    localStorage.setItem('adharra_prefs', JSON.stringify(updated));
  };

  const saveNotif = (key, val) => {
    const updated = { ...notifs, [key]: val };
    setNotifs(updated);
    localStorage.setItem('adharra_notifs', JSON.stringify(updated));
  };

  const saveAll = () => {
    localStorage.setItem('adharra_prefs', JSON.stringify(prefs));
    localStorage.setItem('adharra_notifs', JSON.stringify(notifs));
    showBanner('Settings saved.');
  };

  const Toggle = ({ checked, onChange, id }) => (
    <label className="epage-toggle-switch" htmlFor={id}>
      <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="epage-toggle-track" />
    </label>
  );

  const THEME_OPTIONS = [
    { value: 'dark',            label: 'Dark',            icon: Moon,      desc: 'Black + violet. Default ADHARRA theme' },
    { value: 'light',           label: 'Light',           icon: Sun,       desc: 'Bright and clean. Optimized for daylight' },
    { value: 'system',          label: 'System',          icon: Monitor,   desc: 'Follow device appearance automatically' },
    { value: 'midnight-violet', label: 'Midnight Violet', icon: Sparkles,  desc: 'Deep violet AI workspace' },
    { value: 'graphite',        label: 'Graphite',        icon: Box,       desc: 'Neutral dark gray professional' },
    { value: 'high-contrast',   label: 'High Contrast',   icon: Eye,       desc: 'Maximum visibility & readability' },
  ];

  return (
    <div className="epage-root">
      <div className="epage-header">
        <div className="epage-header-inner">
          <div className="epage-title-block">
            <h1 className="epage-title">{tab === 'profile' ? 'Profile' : 'Settings'}</h1>
            <p className="epage-subtitle">
              {tab === 'profile' ? 'Manage your account information and workspace preferences.' : 'Configure ADHARRA preferences, notifications, and appearance'}
            </p>
          </div>
          {tab !== 'profile' && (
            <div className="epage-header-actions">
              <button className="btn-primary" onClick={saveAll}><Save size={14} /> Save Changes</button>
            </div>
          )}
        </div>
      </div>

      <div className="epage-body">
        <aside className="epage-sidebar">
          <div className="epage-sidebar-label">Settings</div>
          <nav className="epage-sidebar-nav">
            {TABS.map(t => (
              <button key={t.id} className={`epage-sidebar-item ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="epage-content">
          {banner && <div className="epage-success-banner"><CheckCircle2 size={14} />{banner}</div>}

          {/* ---- Profile ---- */}
          {tab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* 2-Column Profile Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, alignItems: 'start' }}>
                
                {/* Left Card: Summary */}
                  <div className="epage-panel" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: 24, textAlign: 'center' }}>
                    <div style={{ 
                      width: 72, height: 72, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-contrast)', 
                      fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      margin: '0 auto 16px auto'
                    }}>
                      {getInitials(profile.fullName, profile.email)}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{profile.fullName}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 2 }}>{profile.email}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: 24, fontWeight: 500 }}>{profile.role}</div>
                  <button className="btn-secondary" style={{ width: '100%', padding: '8px 0', border: '1px solid var(--border)' }}>
                    Edit Profile
                  </button>
                </div>

                {/* Right Card: Profile Information */}
                <div className="epage-panel" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="epage-panel-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
                    <div className="epage-panel-title">Profile Information</div>
                  </div>
                  <div className="epage-panel-body" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    {/* Row 1: Full Name / Email Address */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Full Name</label>
                        <input 
                          type="text" 
                          value={profile.fullName || ''} 
                          onChange={e => saveProfileField('fullName', e.target.value)}
                          style={{ width: '100%', background: 'var(--surface-secondary)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.9rem' }}
                          className="profile-input"
                        />
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Email Address</label>
                        <input 
                          type="email" 
                          value={profile.email || ''} 
                          onChange={e => saveProfileField('email', e.target.value)}
                          style={{ width: '100%', background: 'var(--surface-secondary)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.9rem' }}
                          className="profile-input"
                        />
                      </div>
                    </div>

                    {/* Row 2: Job Title / Role */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Job Title</label>
                        <input 
                          type="text" 
                          value={profile.jobTitle || ''} 
                          onChange={e => saveProfileField('jobTitle', e.target.value)}
                          style={{ width: '100%', background: 'var(--surface-secondary)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.9rem' }}
                          className="profile-input"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Role</label>
                        <input 
                          type="text" 
                          value={profile.role || ''} 
                          onChange={e => saveProfileField('role', e.target.value)}
                          style={{ width: '100%', background: 'var(--surface-secondary)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.9rem' }}
                          className="profile-input"
                        />
                      </div>
                    </div>

                    {/* Row 3: Department / Organization */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Department / Team</label>
                        <input 
                          type="text" 
                          value={profile.department || ''} 
                          onChange={e => saveProfileField('department', e.target.value)}
                          style={{ width: '100%', background: 'var(--surface-secondary)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.9rem' }}
                          className="profile-input"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Organization</label>
                        <input 
                          type="text" 
                          value={profile.organization || ''} 
                          onChange={e => saveProfileField('organization', e.target.value)}
                          style={{ width: '100%', background: 'var(--surface-secondary)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.9rem' }}
                          className="profile-input"
                        />
                      </div>
                    </div>

                    {/* Row 4: Region */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Region</label>
                        <input 
                          type="text" 
                          value={profile.region || ''} 
                          onChange={e => saveProfileField('region', e.target.value)}
                          style={{ width: '100%', background: 'var(--surface-secondary)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.9rem' }}
                          className="profile-input"
                        />
                      </div>
                      <div></div>
                    </div>

                    <div style={{ marginTop: 8 }}>
                       <button className="btn-primary" onClick={saveProfile} style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', padding: '10px 20px', borderRadius: 6 }}>
                        Save Profile
                      </button>
                    </div>

                  </div>
                </div>
              </div>

              {/* Workspace Preferences Strip */}
              <div className="epage-panel" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: 160 }}>Workspace Preferences</div>
                
                <div style={{ flex: 1, display: 'flex', gap: 32 }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Theme</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>{themeMode}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Language</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>English</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Timezone</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Asia/Kolkata</div>
                  </div>
                </div>

                <div>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', border: '1px solid var(--border)' }} onClick={() => setTab('preferences')}>
                    Open Preferences <ChevronRight size={14} style={{ marginLeft: 4 }} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ---- Preferences ---- */}
          {tab === 'preferences' && (
            <>
              <div className="epage-panel" style={{ marginBottom: 14 }}>
                <div className="epage-panel-header">
                  <div className="epage-panel-title">AI Pipeline</div>
                </div>
                <div className="epage-panel-body">
                  <div className="epage-toggle">
                    <div className="epage-toggle-info">
                      <div className="epage-toggle-label">Auto-Processing</div>
                      <div className="epage-toggle-desc">Automatically start AI pipeline when new files are uploaded</div>
                    </div>
                    <Toggle id="auto-processing" checked={prefs.autoProcessing} onChange={v => savePref('autoProcessing', v)} />
                  </div>
                  <div className="epage-toggle">
                    <div className="epage-toggle-info">
                      <div className="epage-toggle-label">AI Enrichment</div>
                      <div className="epage-toggle-desc">Fill missing fields using LLM inference automatically</div>
                    </div>
                    <Toggle id="auto-enrichment" checked={prefs.autoEnrichment} onChange={v => savePref('autoEnrichment', v)} />
                  </div>
                  <div className="epage-toggle">
                    <div className="epage-toggle-info">
                      <div className="epage-toggle-label">Route Low-Confidence Items</div>
                      <div className="epage-toggle-desc">Automatically send items below threshold to validation queue</div>
                    </div>
                    <Toggle id="route-low" checked={prefs.routeLowConfidence} onChange={v => savePref('routeLowConfidence', v)} />
                  </div>

                  <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Confidence Threshold (%)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="range" min={50} max={99}
                          value={prefs.confidenceThreshold}
                          onChange={e => savePref('confidenceThreshold', +e.target.value)}
                           style={{ flex: 1, accentColor: 'var(--accent)' }}
                         />
                         <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent)', minWidth: 36 }}>{prefs.confidenceThreshold}%</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#4B5563', marginTop: 4 }}>Fields below this value are flagged for human review</div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Default Export Format</label>
                      <select className="epage-select" style={{ width: '100%' }} value={prefs.exportFormat} onChange={e => savePref('exportFormat', e.target.value)}>
                        <option value="json">JSON</option>
                        <option value="csv">CSV</option>
                        <option value="pdf">PDF</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="epage-panel">
                <div className="epage-panel-header"><div className="epage-panel-title">Display</div></div>
                <div className="epage-panel-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Items per Page</label>
                      <select className="epage-select" style={{ width: '100%' }} value={prefs.pageSize} onChange={e => savePref('pageSize', +e.target.value)}>
                        {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#64748B', marginBottom: 6 }}>Interface Language</label>
                      <select className="epage-select" style={{ width: '100%' }} value={prefs.language} onChange={e => savePref('language', e.target.value)}>
                        <option value="en">English</option>
                        <option value="de">German</option>
                        <option value="fr">French</option>
                        <option value="ja">Japanese</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ---- Notifications ---- */}
          {tab === 'notifications' && (
            <div className="epage-panel">
              <div className="epage-panel-header"><div className="epage-panel-title">Notification Preferences</div></div>
              <div className="epage-panel-body">
                {[
                  { key: 'pipelineComplete',   label: 'Pipeline Completed',     desc: 'Notify when AI processing pipeline finishes' },
                  { key: 'lowConfidence',      label: 'Low Confidence Alert',    desc: 'Alert when product confidence drops below threshold' },
                  { key: 'validationPending',  label: 'Validation Pending',      desc: 'Remind when items are waiting in the review queue' },
                  { key: 'productValidated',   label: 'Product Validated',       desc: 'Confirm when a product is approved by a reviewer' },
                  { key: 'weeklyDigest',       label: 'Weekly Digest',           desc: 'Receive a weekly summary of pipeline and quality metrics' },
                  { key: 'systemAlerts',       label: 'System Alerts',           desc: 'Critical system notifications and errors' },
                ].map(n => (
                  <div className="epage-toggle" key={n.key}>
                    <div className="epage-toggle-info">
                      <div className="epage-toggle-label">{n.label}</div>
                      <div className="epage-toggle-desc">{n.desc}</div>
                    </div>
                    <Toggle id={`notif-${n.key}`} checked={notifs[n.key]} onChange={v => saveNotif(n.key, v)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ---- Theme / Appearance ---- */}
          {tab === 'theme' && (
            <div className="epage-panel">
              <div className="epage-panel-header"><div className="epage-panel-title">Appearance</div></div>
              <div className="epage-panel-body">
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>COLOR THEME</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
                  {THEME_OPTIONS.map(t => {
                    const Icon = t.icon;
                    const isActive = themeMode === t.value;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setThemeMode(t.value)}
                        style={{
                          padding: '16px',
                          borderRadius: 10,
                          border: `1.5px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                          background: isActive ? 'var(--surface-secondary)' : 'var(--surface)',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          textAlign: 'left',
                          transition: 'all 0.2s',
                          boxShadow: isActive ? '0 0 12px var(--accent-glow)' : 'none'
                        }}
                      >
                        <Icon size={20} style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)', marginBottom: 8, display: 'block' }} />
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>{t.label}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{t.desc}</div>
                        {isActive && (
                          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                             <CheckCircle2 size={13} style={{ color: 'var(--accent)' }} />
                             <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600 }}>Active</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>ACCENT COLOR</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { key: 'purple',  color: '#8B5CF6', label: 'Purple' },
                    { key: 'blue',    color: '#3B82F6', label: 'Blue' },
                    { key: 'emerald', color: '#10B981', label: 'Emerald' },
                    { key: 'amber',   color: '#F59E0B', label: 'Amber' },
                  ].map(c => (
                    <div 
                      key={c.key} 
                      title={c.label} 
                      onClick={() => setAccentMode(c.key)}
                      style={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: 8, 
                        background: c.color, 
                        cursor: 'pointer', 
                        border: accentMode === c.key ? '2px solid var(--text-primary)' : '2px solid transparent', 
                        transition: 'all 0.15s',
                        boxShadow: accentMode === c.key ? '0 0 10px rgba(255,255,255,0.4)' : 'none'
                      }} 
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .profile-input:focus {
          outline: none;
          border-color: #8B5CF6 !important;
          background: rgba(139, 92, 246, 0.05) !important;
        }
      `}</style>
    </div>
  );
}

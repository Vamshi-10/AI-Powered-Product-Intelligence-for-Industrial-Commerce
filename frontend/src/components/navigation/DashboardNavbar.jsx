import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, X, Bell, User, LogIn, LogOut, Settings,
  UploadCloud, Search, ChevronDown,
  Home, Package, Sparkles, ShieldCheck, ClipboardCheck,
  CheckCircle2, AlertTriangle, Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from './navSections';
import { INITIAL_PRODUCTS } from '../../services/mockDataService';
import './DashboardNavbar.css';

const NOTIFICATIONS = [
  { id: 1, icon: AlertTriangle, color: '#F87171', title: 'Low Confidence Flag', desc: '3051S pressure transmitter confidence dropped to 64%.', time: '2 min ago' },
  { id: 2, icon: CheckCircle2, color: '#34D399', title: 'Product Validated', desc: 'Grundfos CR 15-4 pump passed all validation rules.', time: '15 min ago' },
  { id: 3, icon: Package, color: '#A78BFA', title: 'New SKU Processed', desc: 'Festo ADVU-40-75 cylinder processed by AI pipeline.', time: '1 hr ago' },
  { id: 4, icon: Info, color: '#60A5FA', title: 'HITL Review Pending', desc: 'ABB drive has 2 attributes awaiting human correction.', time: '3 hrs ago' },
];

const DashboardNavbar = () => {
  const { isAuthenticated, isGuest, user, logout, exitGuestMode } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  const searchResults = searchQuery.trim().length >= 2
    ? INITIAL_PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  useEffect(() => {
    const handleOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) { setSearchOpen(false); setSearchQuery(''); }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') { setUserMenuOpen(false); setNotifOpen(false); setSearchOpen(false); }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => { document.removeEventListener('mousedown', handleOutside); document.removeEventListener('keydown', handleEsc); };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setNotifOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
  }, [location.pathname]);

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  const handleUpload = () => {
    if (!isAuthenticated && !isGuest) {
      navigate('/login', { state: { from: { pathname: '/upload' } } });
    } else {
      navigate('/upload');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="dnav-header">
      <div className="dnav-inner">

        {/* Brand */}
        <Link to="/dashboard" className="dnav-brand">
          <div className="dnav-logo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </div>
          <span className="dnav-brand-text">ADHARRA</span>
          <span className="dnav-brand-pill">Industrial AI</span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="dnav-links" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.title}
              to={item.path}
              className={`dnav-link ${isActive(item) ? 'dnav-link--active' : ''}`}
            >
              <item.icon size={15} className="dnav-link-icon" />
              <span>{item.title}</span>
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="dnav-right">

          {/* Search */}
          <div className="dnav-search-wrap" ref={searchRef}>
            {searchOpen ? (
              <div className="dnav-search-expanded">
                <Search size={14} className="dnav-search-icon" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search products, SKUs…"
                  className="dnav-search-input"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <div className="dnav-search-results">
                    {searchResults.map(p => (
                      <div
                        key={p.id}
                        className="dnav-search-result-item"
                        onClick={() => { navigate('/dashboard/products'); setSearchOpen(false); setSearchQuery(''); }}
                      >
                        <div className="dnav-result-name">{p.name}</div>
                        <div className="dnav-result-meta">{p.sku} · {p.category}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button className="dnav-icon-btn" onClick={() => setSearchOpen(true)} aria-label="Search">
                <Search size={17} />
              </button>
            )}
          </div>

          {/* Notifications */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button className="dnav-icon-btn" onClick={() => setNotifOpen(o => !o)} aria-label="Notifications">
              <Bell size={17} />
              <span className="dnav-notif-dot" />
            </button>
            {notifOpen && (
              <div className="dnav-dropdown dnav-notif-panel">
                <div className="dnav-notif-header">
                  <span>Notifications</span>
                  <button className="dnav-notif-mark" onClick={() => setNotifOpen(false)}>Mark all read</button>
                </div>
                {NOTIFICATIONS.map(n => (
                  <div key={n.id} className="dnav-notif-item">
                    <n.icon size={14} style={{ color: n.color, flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div className="dnav-notif-title">{n.title}</div>
                      <div className="dnav-notif-desc">{n.desc}</div>
                      <div className="dnav-notif-time">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Data Button */}
          <button className="dnav-upload-btn" onClick={handleUpload} id="upload-data-btn">
            <UploadCloud size={14} />
            <span>Upload Data</span>
          </button>

          {/* User */}
          {isAuthenticated ? (
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button className="dnav-avatar-btn" onClick={() => setUserMenuOpen(o => !o)} aria-label="User menu">
                <div className="dnav-avatar">
                  <User size={14} />
                </div>
                <ChevronDown size={12} />
              </button>
              {userMenuOpen && (
                <div className="dnav-dropdown dnav-user-dropdown">
                  <div className="dnav-user-info">
                    <div className="dnav-user-name">{user?.name || 'Enterprise Admin'}</div>
                    <div className="dnav-user-email">{user?.email || 'admin@adharra.ai'}</div>
                  </div>
                  <Link to="/dashboard/settings" className="dnav-menu-item" onClick={() => setUserMenuOpen(false)}>
                    <Settings size={14} /> Profile & Settings
                  </Link>
                  <button className="dnav-menu-item dnav-menu-logout" onClick={handleLogout}>
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : isGuest ? (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="dnav-avatar-btn" style={{ cursor: 'default' }}>
                <div className="dnav-avatar">
                  <User size={14} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a78bfa' }}>Guest</span>
              </div>
              <button 
                className="dnav-signin-btn" 
                onClick={() => { exitGuestMode(); navigate('/login'); }}
                style={{ background: 'transparent', border: '1px solid rgba(139, 92, 246, 0.4)', color: '#a78bfa' }}
              >
                <LogOut size={14} /> Exit Guest Mode
              </button>
            </div>
          ) : (
            <button className="dnav-signin-btn" onClick={() => navigate('/login')}>
              <LogIn size={14} /> Sign In
            </button>
          )}

          {/* Mobile Hamburger */}
          <button className="dnav-hamburger" onClick={() => setMobileOpen(o => !o)} aria-label="Toggle menu">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="dnav-mobile-drawer">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.title}
              to={item.path}
              className={`dnav-mobile-link ${isActive(item) ? 'dnav-mobile-link--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon size={16} />
              <span>{item.title}</span>
            </Link>
          ))}
          <button className="dnav-mobile-upload" onClick={() => { setMobileOpen(false); handleUpload(); }}>
            <UploadCloud size={16} /> Upload Data
          </button>
        </div>
      )}
    </header>
  );
};

export default DashboardNavbar;

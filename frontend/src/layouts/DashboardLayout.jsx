import React from 'react';
import { Outlet } from 'react-router-dom';
import DashboardNavbar from '../components/navigation/DashboardNavbar';
import AdharraChatbot from '../components/chat/AdharraChatbot';
import './DashboardLayout.css';

const DashboardLayout = () => {
  return (
    <div className="dash-layout-root">
      {/* Persistent Top Horizontal Navigation */}
      <DashboardNavbar />

      {/* Dynamic Content Outlet */}
      <div className="dash-layout-content">
        <Outlet />
      </div>

      {/* Persistent Global Footer */}
      <footer className="dash-footer">
        <div className="dash-footer-content">
          <span>&copy; {new Date().getFullYear()} ADHARRA. Enterprise AI Product Intelligence Platform.</span>
          <span className="dash-footer-status">System Operational • Enterprise Edition</span>
        </div>
      </footer>

      {/* Global AI Assistant Chatbot */}
      <AdharraChatbot />
    </div>
  );
};

export default DashboardLayout;

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NewLandingPage from './pages/NewLandingPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SignupPage from './pages/SignupPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardOverview from './pages/dashboard/DashboardOverview';
import ProductsPage from './pages/dashboard/ProductsPage';
import AIIntelligencePage from './pages/dashboard/AIIntelligencePage';
import DataQualityPage from './pages/dashboard/DataQualityPage';
import ValidationPage from './pages/dashboard/ValidationPage';
import SettingsPage from './pages/dashboard/SettingsPage';
import UploadPage from './pages/upload/UploadPage';
import ProcessingPreviewPage from './pages/processing/ProcessingPreviewPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

const App = () => {
  return (
    <Router>
      <Routes>
        {/* ========================================================
            PUBLIC ROUTES
            ======================================================== */}
        <Route path="/" element={<NewLandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* ========================================================
            DASHBOARD ROUTE TREE
            - Top 6 nav items as direct routes
            - Sub-routes redirect to parent (no-duplication rule)
            ======================================================== */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          {/* Home */}
          <Route index element={<DashboardOverview />} />

          {/* Products — all sub-routes handled internally by ProductsPage */}
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/*" element={<Navigate to="/dashboard/products" replace />} />

          {/* AI Intelligence — all sub-routes handled internally by AIIntelligencePage */}
          <Route path="ai" element={<AIIntelligencePage />} />
          <Route path="ai/*" element={<Navigate to="/dashboard/ai" replace />} />

          {/* Data Quality — all sub-routes handled internally by DataQualityPage */}
          <Route path="quality" element={<DataQualityPage />} />
          <Route path="quality/*" element={<Navigate to="/dashboard/quality" replace />} />

          {/* Validation — unified single-page review */}
          <Route path="validation" element={<ValidationPage />} />
          <Route path="validation/*" element={<Navigate to="/dashboard/validation" replace />} />

          {/* Settings — all sub-routes handled internally by SettingsPage */}
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/*" element={<Navigate to="/dashboard/settings" replace />} />

          {/* Redirect legacy routes */}
          <Route path="insights/*" element={<Navigate to="/dashboard/ai" replace />} />
          <Route path="sources/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="support/*" element={<Navigate to="/dashboard/settings" replace />} />

          {/* In-dashboard Upload shortcut */}
          <Route
            path="upload"
            element={
              <ProtectedRoute>
                <UploadPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all inside dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* ========================================================
            DEDICATED ACTION WORKSPACES (PROTECTED)
            ======================================================== */}
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<UploadPage />} />
        </Route>

        <Route
          path="/processing"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ProcessingPreviewPage />} />
        </Route>

        {/* Global Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;

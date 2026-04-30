// Path: frontend/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StudentProvider } from './context/StudentContext.jsx';
import { SessionProvider } from './context/SessionContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import SplashScreen from './pages/SplashScreen.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import LearnPage from './pages/LearnPage.jsx';
import AITutorPage from './pages/AITutorPage.jsx';
import ReviewQueue from './pages/ReviewQueue.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import StudentDashboardPage from './pages/StudentDashboardPage.jsx';
import MessagesPage from './pages/MessagesPage.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import OfflineBanner from './components/layout/OfflineBanner.jsx';
import { setupAutoSync } from './services/sync.js';

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-violet-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
    if (user?.role === 'teacher') return <Navigate to="/teacher" replace />;
    return <Navigate to="/learn" replace />;
  }

  return children;
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  // Determine if we should show BottomNav (students only)
  const showNav = isAuthenticated && user?.role === 'student';

  return (
    <div className="min-h-screen font-sans transition-colors duration-300">
      <OfflineBanner />
      <div className={showNav ? 'pb-20' : ''}>
        <Routes>
          <Route path="/" element={<SplashScreen />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/learn"
            element={
              <ProtectedRoute allowedRoles={['student', 'teacher']}>
                <LearnPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-tutor"
            element={
              <ProtectedRoute allowedRoles={['student', 'teacher']}>
                <AITutorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review"
            element={
              <ProtectedRoute allowedRoles={['student', 'teacher']}>
                <ReviewQueue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-insights"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/landing" replace />} />
        </Routes>
      </div>
      {showNav && <BottomNav />}
    </div>
  );
}

import { AnimationProvider } from './context/AnimationContext.jsx';

export default function App() {
  React.useEffect(() => {
    setupAutoSync();
  }, []);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ThemeProvider>
          <AnimationProvider>
            <StudentProvider>
              <SessionProvider>
                <AppRoutes />
              </SessionProvider>
            </StudentProvider>
          </AnimationProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

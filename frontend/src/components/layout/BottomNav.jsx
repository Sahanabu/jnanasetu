// Path: frontend/src/components/layout/BottomNav.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { path: '/learn',       label: 'Learn',    icon: '📚' },
    { path: '/review',      label: 'Review',   icon: '🔄' },
    { path: '/ai-tutor',    label: 'AI Tutor', icon: '🤖' },
    { path: '/my-insights', label: 'Insights', icon: '📊' },
  ];

  // Only show for students
  if (user?.role !== 'student') return null;

  // Only show on main app pages
  const showPaths = ['/learn', '/review', '/ai-tutor', '/my-insights'];
  if (!showPaths.some(p => location.pathname.startsWith(p))) return null;

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'max-content',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      {/* Floating pill container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '999px',
          padding: '6px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(109,40,217,0.08)',
          border: '1.5px solid rgba(109,40,217,0.08)',
        }}
      >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: isActive ? '6px' : '0px',
                padding: isActive ? '10px 18px' : '10px 14px',
                borderRadius: '999px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: '700',
                letterSpacing: '0.01em',
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                background: isActive
                  ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                  : 'transparent',
                color: isActive ? '#fff' : '#6b7280',
                boxShadow: isActive ? '0 4px 12px rgba(109,40,217,0.35)' : 'none',
                transform: isActive ? 'scale(1.04)' : 'scale(1)',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>{item.icon}</span>
              {isActive && (
                <span style={{ fontSize: '13px' }}>{item.label}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

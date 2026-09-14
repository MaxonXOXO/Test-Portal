import React from 'react';
import { Shield, Monitor, LogOut } from 'lucide-react';

interface HeaderProps {
  currentView: 'candidate' | 'admin';
  onSwitchView: (view: 'candidate' | 'admin') => void;
  candidateName?: string;
  onCandidateLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onSwitchView,
  candidateName,
  onCandidateLogout,
}) => {
  return (
    <header className="inst-header">
      <div className="inst-header-inner">
        <div className="inst-brand">
          <img src="/carmel.png" alt="Carmel Polytechnic Logo" className="inst-logo-img" />
          <div className="inst-title-block">
            <h1>CARMEL POLYTECHNIC COLLEGE PUNNAPRA</h1>
            <p>Govt. Aided Technical Institution | Punnapra, Alappuzha - 688004</p>
          </div>
        </div>

        <div className="inst-nav-actions">
          <span className="inst-portal-badge">
            {currentView === 'admin' ? 'ADMIN CONTROL CENTER' : 'CANDIDATE EXAM PORTAL'}
          </span>

          {currentView === 'candidate' && candidateName && onCandidateLogout && (
            <button
              onClick={onCandidateLogout}
              className="btn-header-switch"
              title="Exit Session"
            >
              <LogOut size={15} />
              <span>Exit</span>
            </button>
          )}

          {currentView === 'candidate' ? (
            <button
              onClick={() => onSwitchView('admin')}
              className="btn-header-switch"
              title="Admin / Office Control Center"
            >
              <Shield size={16} />
              <span>Admin Dashboard</span>
            </button>
          ) : (
            <button
              onClick={() => onSwitchView('candidate')}
              className="btn-header-switch"
              title="Return to Candidate Assessment Portal"
            >
              <Monitor size={16} />
              <span>Candidate Portal</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import type { Candidate } from '../../types';

interface CandidateRevokedProps {
  candidate: Candidate;
  onBackToLogin: () => void;
}

export const CandidateRevoked: React.FC<CandidateRevokedProps> = ({
  candidate,
  onBackToLogin,
}) => {
  return (
    <div className="onboarding-wrapper" style={{ maxWidth: '540px' }}>
      <div className="login-card" style={{ borderColor: 'var(--danger-200)' }}>
        <div style={{
          background: 'linear-gradient(135deg, #7f1d1d 0%, var(--danger-600) 100%)',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          color: '#fff'
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto'
          }}>
            <ShieldAlert size={36} color="#fff" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800 }}>
            Examination Access Revoked
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#fecaca', marginTop: '0.35rem' }}>
            Carmel Polytechnic College Invigilator Notice
          </p>
        </div>

        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="receipt-box" style={{ borderColor: 'var(--danger-200)', background: 'var(--danger-50)' }}>
            <div className="receipt-row">
              <span className="receipt-label">Candidate Name</span>
              <span className="receipt-val">{candidate.name}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Registered Contact</span>
              <span className="receipt-val">{candidate.phone}</span>
            </div>
            <div className="receipt-row">
              <span className="receipt-label">Status</span>
              <span className="badge badge-red">REVOKED BY ADMIN</span>
            </div>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--neutral-600)', lineHeight: 1.6 }}>
            Your examination privilege has been temporarily revoked by the examination controller.
            If this was in error, the invigilator can reinstate or restart your test directly from the Admin Control Center.
          </p>

          <button
            onClick={onBackToLogin}
            className="btn btn-outline"
            style={{ width: '100%' }}
          >
            <ArrowLeft size={16} />
            <span>Return to Login</span>
          </button>
        </div>
      </div>
    </div>
  );
};

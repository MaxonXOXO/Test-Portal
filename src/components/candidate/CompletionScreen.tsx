import React from 'react';
import { CheckCircle2, FileCheck, LogOut } from 'lucide-react';
import type { Candidate, ExamConfig } from '../../types';

interface CompletionScreenProps {
  candidate: Candidate;
  examConfig: ExamConfig;
  totalQuestions: number;
  onLogout: () => void;
}

export const CompletionScreen: React.FC<CompletionScreenProps> = ({
  candidate,
  examConfig,
  totalQuestions,
  onLogout,
}) => {

  const attemptedCount = Object.keys(candidate.answers || {}).length;
  const submissionTime = candidate.completedAt
    ? new Date(candidate.completedAt).toLocaleString()
    : new Date().toLocaleString();

  return (
    <div className="completion-container">
      <div className="completion-card">
        <div className="completion-icon-wrapper">
          <CheckCircle2 size={48} />
        </div>

        <h2 className="completion-title">Assessment Submitted!</h2>
        <p className="completion-subtitle">
          Your responses for the <strong>{examConfig.title}</strong> have been securely recorded into the
          examination evaluation system.
        </p>

        {/* Official Submission Receipt - STRICTLY NO SCORES OR ANSWERS */}
        <div className="receipt-box">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '1.5px solid var(--neutral-200)',
            color: 'var(--primary-800)',
            fontWeight: 700,
            fontSize: '0.88rem'
          }}>
            <FileCheck size={18} />
            <span>OFFICIAL SUBMISSION RECEIPT</span>
          </div>

          <div className="receipt-row">
            <span className="receipt-label">Candidate Name</span>
            <span className="receipt-val">{candidate.name}</span>
          </div>

          <div className="receipt-row">
            <span className="receipt-label">Registered Contact</span>
            <span className="receipt-val">{candidate.phone}</span>
          </div>

          <div className="receipt-row">
            <span className="receipt-label">Submission Timestamp</span>
            <span className="receipt-val">{submissionTime}</span>
          </div>

          <div className="receipt-row">
            <span className="receipt-label">Questions Attempted</span>
            <span className="receipt-val">{attemptedCount} of {totalQuestions}</span>
          </div>

          <div className="receipt-row">
            <span className="receipt-label">Session Status</span>
            <span className="badge badge-green" style={{ alignSelf: 'center' }}>
              SUBMISSION CONFIRMED
            </span>
          </div>
        </div>

        <div style={{
          background: 'var(--primary-50)',
          border: '1px solid #bfdbfe',
          borderRadius: 'var(--radius-md)',
          padding: '0.9rem 1.25rem',
          fontSize: '0.8rem',
          color: 'var(--primary-900)',
          lineHeight: 1.5,
          marginBottom: '1.75rem',
          textAlign: 'left'
        }}>
          <strong>Important Instructions:</strong>
          <ul style={{ paddingLeft: '1.2rem', marginTop: '0.35rem' }}>
            <li>In accordance with institutional guidelines, scores are not disclosed directly to attendees.</li>
            <li>Results will be compiled and published by the examination authority of Carmel Polytechnic College.</li>
            <li>You may now sign the attendance register and exit the examination hall with the invigilator’s permission.</li>
          </ul>
        </div>

        <button
          onClick={onLogout}
          className="btn btn-outline"
          style={{ width: '100%', padding: '0.8rem' }}
        >
          <LogOut size={16} />
          <span>Exit Examination Portal</span>
        </button>
      </div>
    </div>
  );
};

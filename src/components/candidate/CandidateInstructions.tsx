import React from 'react';
import { Clock, HelpCircle, ShieldAlert, PlayCircle, ArrowLeft } from 'lucide-react';
import type { Candidate, ExamConfig, Question } from '../../types';

interface CandidateInstructionsProps {
  candidate: Candidate;
  examConfig: ExamConfig;
  questions: Question[];
  onStartExam: () => void;
  onBackToLogin: () => void;
}

export const CandidateInstructions: React.FC<CandidateInstructionsProps> = ({
  candidate,
  examConfig,
  questions,
  onStartExam,
  onBackToLogin,
}) => {
  return (
    <div className="onboarding-wrapper" style={{ maxWidth: '680px' }}>
      <div className="login-card">
        <div className="login-header-banner">
          <h2>Examination Instructions</h2>
          <p>{examConfig.title}</p>
        </div>

        <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Candidate Profile Card */}
          <div className="candidate-preview-card" style={{ background: '#f8fafc', borderColor: 'var(--neutral-300)' }}>
            <div className="cand-preview-header">
              <span className="cand-preview-title" style={{ color: 'var(--primary-800)' }}>
                Candidate Verification Details
              </span>
              <span className="badge badge-green">VERIFIED ATTENDEE</span>
            </div>
            <div className="cand-preview-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="cand-preview-item">
                <span className="label">Candidate Name</span>
                <span className="val">{candidate.name}</span>
              </div>
              <div className="cand-preview-item">
                <span className="label">Registered Contact</span>
                <span className="val">{candidate.phone}</span>
              </div>
            </div>
          </div>

          {/* Guidelines Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{
              background: 'var(--primary-50)',
              border: '1px solid #c8ddf5',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <Clock size={22} color="var(--primary-700)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-900)' }}>Time Limit</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
                  Total Duration: <strong>{examConfig.durationMinutes} Minutes</strong>. Timer begins immediately on start.
                </p>
              </div>
            </div>

            <div style={{
              background: 'var(--accent-50)',
              border: '1px solid #fde68a',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <HelpCircle size={22} color="var(--accent-600)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-600)' }}>Questions Count</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
                  <strong>{questions.length} Questions</strong> (MCQ with 4 choices). You can move forward and back.
                </p>
              </div>
            </div>
          </div>

          {/* Specific Rules */}
          <div style={{
            background: 'var(--neutral-50)',
            border: '1px solid var(--neutral-200)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            color: 'var(--neutral-700)'
          }}>
            <h4 style={{ fontWeight: 700, color: 'var(--neutral-900)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={17} color="var(--accent-500)" />
              Important Examination Guidelines:
            </h4>
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li>Questions appear <strong>one by one</strong> on your screen.</li>
              <li>You may navigate back to previously answered or skipped questions at any time.</li>
              <li>Questions are randomized/juggled independently for each candidate.</li>
              <li>If your test is restarted by the invigilator, your timer will count down from that exact moment.</li>
              <li>When the timer runs out, your examination will automatically submit.</li>
              <li>Upon submission, only a successful completion acknowledgement is displayed. Scores are reserved exclusively for the examination board.</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={onBackToLogin}
              className="btn btn-outline"
              style={{ flex: '1' }}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            <button
              onClick={onStartExam}
              className="btn btn-gold"
              style={{ flex: '2', padding: '0.85rem' }}
            >
              <PlayCircle size={19} />
              <span>Start Examination Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

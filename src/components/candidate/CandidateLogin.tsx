import React, { useState, useEffect } from 'react';
import { Phone, Lock, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';
import type { Candidate, ExamConfig } from '../../types';
import { normalizePhone } from '../../services/storage';

interface CandidateLoginProps {
  candidates: Candidate[];
  examConfig: ExamConfig;
  onLoginSuccess: (candidate: Candidate) => void;
}

export const CandidateLogin: React.FC<CandidateLoginProps> = ({
  candidates,
  examConfig,
  onLoginSuccess,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [matchedCandidate, setMatchedCandidate] = useState<Candidate | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live auto-lookup as phone number is entered
  useEffect(() => {
    const cleanPhone = normalizePhone(phoneNumber);
    if (cleanPhone.length >= 10) {
      const found = candidates.find((c) => normalizePhone(c.phone) === cleanPhone);
      if (found) {
        setMatchedCandidate(found);
        setErrorMessage(null);
      } else {
        setMatchedCandidate(null);
        if (cleanPhone.length === 10) {
          setErrorMessage('Phone number not registered in candidate roster. Please contact the invigilator.');
        }
      }
    } else {
      setMatchedCandidate(null);
      setErrorMessage(null);
    }
  }, [phoneNumber, candidates]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = normalizePhone(phoneNumber);
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit registered phone number.');
      return;
    }

    const candidate = candidates.find((c) => normalizePhone(c.phone) === cleanPhone);
    if (!candidate) {
      setErrorMessage('Candidate not found. Your phone number is not listed in the examination roster.');
      return;
    }

    if (password.trim() !== examConfig.commonPassword) {
      setErrorMessage('Invalid examination password. Please verify the credentials provided by the invigilator.');
      return;
    }

    if (candidate.status === 'REVOKED') {
      setErrorMessage('Access Revoked: Your examination permit has been suspended by the exam controller. Please consult the admin desk.');
      return;
    }

    if (candidate.status === 'COMPLETED') {
      setErrorMessage('Submission Already Recorded: You have already completed and submitted your examination.');
      return;
    }

    if (!examConfig.isExamLive) {
      setErrorMessage('Examination is currently not active or paused by the administrator.');
      return;
    }

    onLoginSuccess(candidate);
  };

  return (
    <div className="onboarding-wrapper">
      <div className="login-card">
        <div className="login-header-banner">
          <h2>Candidate Assessment Portal</h2>
          <p>Carmel Polytechnic College Punnapra Online Examination System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form-body">
          <div className="form-group">
            <label htmlFor="cand-phone">Registered Phone Number</label>
            <div className="input-with-icon">
              <Phone className="input-icon" size={18} />
              <input
                id="cand-phone"
                type="tel"
                placeholder="Enter 10-digit registered phone number"
                value={phoneNumber}
                maxLength={13}
                onChange={(e) => setPhoneNumber(e.target.value)}
                autoComplete="tel"
                required
              />
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>
              Candidate identity is automatically verified from the college roster
            </span>
          </div>

          {/* Automatic Details Pull Display */}
          {matchedCandidate && (
            <div className="candidate-preview-card">
              <div className="cand-preview-header">
                <span className="cand-preview-title">
                  <UserCheck size={14} style={{ display: 'inline', marginRight: 4 }} />
                  Candidate Verified
                </span>
                <span className={`badge ${matchedCandidate.status === 'COMPLETED' ? 'badge-green' : matchedCandidate.status === 'REVOKED' ? 'badge-red' : 'badge-blue'}`}>
                  {matchedCandidate.status.replace('_', ' ')}
                </span>
              </div>
              <div className="cand-preview-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="cand-preview-item">
                  <span className="label">Candidate Name</span>
                  <span className="val">{matchedCandidate.name}</span>
                </div>
                <div className="cand-preview-item">
                  <span className="label">Registered Contact</span>
                  <span className="val">{matchedCandidate.phone}</span>
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="cand-password">Common Exam Password</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input
                id="cand-password"
                type="password"
                placeholder="Enter common exam password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>
              Default session password: <strong>{examConfig.commonPassword}</strong>
            </span>
          </div>

          {errorMessage && (
            <div className="alert-box alert-error">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{errorMessage}</div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-gold"
            style={{ width: '100%', padding: '0.85rem' }}
          >
            <span>Proceed to Examination</span>
            <ArrowRight size={18} />
          </button>

          <div style={{
            background: 'var(--neutral-50)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--neutral-200)',
            fontSize: '0.78rem',
            color: 'var(--neutral-600)'
          }}>
            <strong>Quick Demo Login:</strong>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
              <span>Phone: <code>9876543210</code></span>
              <span>Password: <code>{examConfig.commonPassword}</code></span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

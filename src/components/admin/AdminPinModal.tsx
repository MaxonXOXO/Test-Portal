import React, { useState } from 'react';
import { Shield, KeyRound, XCircle, ArrowRight } from 'lucide-react';

interface AdminPinModalProps {
  correctPin: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  correctPin,
  onSuccess,
  onClose,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === correctPin) {
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} color="var(--primary-700)" />
            <h3>Invigilator Authorization</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <XCircle size={20} color="var(--neutral-400)" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ fontSize: '0.85rem', color: 'var(--neutral-600)' }}>
              Enter the administrator access password to manage exam roster, questions, and live candidate timers.
            </p>

            <div className="form-group">
              <label>Admin Access Password</label>
              <div className="input-with-icon">
                <KeyRound className="input-icon" size={18} />
                <input
                  type="password"
                  placeholder="Enter administrator password"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    setError(false);
                  }}
                  autoFocus
                  required
                />
              </div>
            </div>

            {error && (
              <div className="alert-box alert-error" style={{ fontSize: '0.8rem' }}>
                Incorrect administrator password. Access denied.
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <span>Verify & Unlock</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

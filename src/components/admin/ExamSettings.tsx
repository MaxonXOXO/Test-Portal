import React, { useState } from 'react';
import { Settings, Save, Clock, Lock, ShieldCheck, CheckCircle2, RotateCcw } from 'lucide-react';
import type { ExamConfig } from '../../types';

interface ExamSettingsProps {
  examConfig: ExamConfig;
  onSaveConfig: (updated: ExamConfig) => void;
  onGlobalRestart: () => void;
}

export const ExamSettings: React.FC<ExamSettingsProps> = ({
  examConfig,
  onSaveConfig,
  onGlobalRestart,
}) => {
  const [form, setForm] = useState<ExamConfig>(examConfig);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(form);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="table-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--neutral-200)' }}>
          <Settings size={22} color="var(--primary-700)" />
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--neutral-900)' }}>
              Examination Configuration & Control
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>
              Manage timing, common attendee passwords, security parameters, and exam state
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-group">
            <label>Institution Title</label>
            <input
              type="text"
              value={form.instituteName}
              onChange={(e) => setForm({ ...form, instituteName: e.target.value })}
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--neutral-300)', fontWeight: 600 }}
              required
            />
          </div>

          <div className="form-group">
            <label>Assessment Name</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--neutral-300)' }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={16} color="var(--primary-700)" />
                Total Exam Duration (Minutes)
              </label>
              <input
                type="number"
                min={1}
                max={300}
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: Math.max(1, Number(e.target.value) || 30) })}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--neutral-300)' }}
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>
                Applied immediately to newly started sessions and restarts
              </span>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={16} color="var(--accent-500)" />
                Common Attendee Exam Password
              </label>
              <input
                type="text"
                value={form.commonPassword}
                onChange={(e) => setForm({ ...form, commonPassword: e.target.value })}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--neutral-300)', letterSpacing: '0.05em', fontWeight: 600 }}
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>
                Required alongside attendee phone number at onboarding
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={16} color="var(--primary-700)" />
                Admin Dashboard Access PIN
              </label>
              <input
                type="password"
                value={form.adminPin}
                onChange={(e) => setForm({ ...form, adminPin: e.target.value })}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--neutral-300)' }}
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>
                PIN to switch from candidate portal to admin dashboard (Default: 1234)
              </span>
            </div>

            <div className="form-group">
              <label>Exam Status</label>
              <select
                value={form.isExamLive ? 'ACTIVE' : 'PAUSED'}
                onChange={(e) => setForm({ ...form, isExamLive: e.target.value === 'ACTIVE' })}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--neutral-300)' }}
              >
                <option value="ACTIVE">ACTIVE - Attendees Can Login & Take Exam</option>
                <option value="PAUSED">PAUSED - Candidate Login Temporarily Disabled</option>
              </select>
            </div>
          </div>

          <div style={{
            background: 'var(--neutral-50)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--neutral-200)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem'
          }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--neutral-800)' }}>
              Randomization & Submission Controls
            </h4>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                checked={form.randomizeQuestions}
                onChange={(e) => setForm({ ...form, randomizeQuestions: e.target.checked })}
                style={{ width: 18, height: 18 }}
              />
              <span><strong>Randomize / Juggle Question Order</strong> per candidate automatically</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.88rem' }}>
              <input
                type="checkbox"
                checked={form.autoSubmitOnTimeUp}
                onChange={(e) => setForm({ ...form, autoSubmitOnTimeUp: e.target.checked })}
                style={{ width: 18, height: 18 }}
              />
              <span><strong>Auto-Submit Examination</strong> when countdown timer reaches 00:00</span>
            </label>
          </div>

          {saveSuccess && (
            <div className="alert-box" style={{ background: 'var(--success-50)', color: 'var(--success-600)', border: '1px solid var(--success-100)' }}>
              <CheckCircle2 size={18} />
              <span>Exam settings saved successfully and synchronized across portal sessions!</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--neutral-200)' }}>
            <button
              type="button"
              onClick={onGlobalRestart}
              className="btn btn-outline"
              style={{ color: 'var(--accent-600)', borderColor: 'var(--accent-300)' }}
            >
              <RotateCcw size={16} />
              <span>Global Restart Exam Timer</span>
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.75rem' }}
            >
              <Save size={17} />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Settings,
  Save,
  Clock,
  Lock,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Database,
  Tag,
  XCircle,
  Radio,
} from 'lucide-react';
import type { ExamConfig, ExamStatus } from '../../types';
import {
  isSupabaseConfigured,
  getSupabaseCredentials,
  saveCustomSupabaseCredentials,
  testSupabaseConnection,
} from '../../services/supabase';

interface ExamSettingsProps {
  examConfig: ExamConfig;
  onSaveConfig: (updated: ExamConfig) => void;
  onGlobalRestart: () => void;
  onClearDatabase: () => Promise<void>;
  onStatusChange?: (status: ExamStatus) => void;
}

export const ExamSettings: React.FC<ExamSettingsProps> = ({
  examConfig,
  onSaveConfig,
  onGlobalRestart,
  onClearDatabase,
  onStatusChange,
}) => {
  const [form, setForm] = useState<ExamConfig>({
    ...examConfig,
    applicationNumberPrefix: examConfig.applicationNumberPrefix || 'CARMEL',
    examStatus: examConfig.examStatus || (examConfig.isExamLive ? 'RUNNING' : 'PAUSED'),
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Global Timer Reset Confirmation Modal State
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [timerConfirmationMsg, setTimerConfirmationMsg] = useState<string | null>(() => {
    if (examConfig.globalRestartTimestamp) {
      return `Global timer was restarted on ${new Date(examConfig.globalRestartTimestamp).toLocaleTimeString()}. Status: ${examConfig.examStatus || 'RUNNING'}.`;
    }
    return null;
  });

  // Global Clear Database Modal State
  const [showClearDbModal, setShowClearDbModal] = useState(false);
  const [isClearingDb, setIsClearingDb] = useState(false);
  const [clearDbSuccessMsg, setClearDbSuccessMsg] = useState<string | null>(null);

  // Supabase Config State
  const creds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(creds.url);
  const [supabaseKey, setSupabaseKey] = useState(creds.key);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const prefix = form.applicationNumberPrefix.trim() || 'CARMEL';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ExamConfig = {
      ...form,
      applicationNumberPrefix: prefix,
      isExamLive: form.examStatus === 'RUNNING',
    };
    onSaveConfig(updated);
    if (onStatusChange && updated.examStatus) {
      onStatusChange(updated.examStatus);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleConfirmTimerReset = () => {
    onGlobalRestart();
    setShowTimerModal(false);
    const nowStr = new Date().toLocaleTimeString();
    setTimerConfirmationMsg(
      `Confirmed: Global timer successfully reset at ${nowStr}. All active candidate timers are running fresh for ${form.durationMinutes} minutes.`
    );
  };

  const handleConfirmClearDatabase = async () => {
    setIsClearingDb(true);
    try {
      await onClearDatabase();
      setShowClearDbModal(false);
      setClearDbSuccessMsg(
        'Database Flush Complete: All candidates, submitted responses, scores, and questions have been permanently cleared from Supabase.'
      );
    } catch (err: any) {
      alert(`Failed to clear database: ${err?.message || String(err)}`);
    } finally {
      setIsClearingDb(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      if (supabaseUrl && supabaseKey) {
        saveCustomSupabaseCredentials(supabaseUrl, supabaseKey);
      }
      const res = await testSupabaseConnection();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || String(err) });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Main Settings Card */}
      <div className="table-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--neutral-200)' }}>
          <Settings size={22} color="var(--primary-700)" />
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--neutral-900)' }}>
              Examination Configuration & Control
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>
              Manage timing, common passwords, application numbering template, and portal parameters
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
            <label>Institution Subtitle / Address Tag</label>
            <input
              type="text"
              value={form.instituteSubtitle}
              onChange={(e) => setForm({ ...form, instituteSubtitle: e.target.value })}
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--neutral-300)' }}
              placeholder="e.g. Govt. Aided Technical Institution | Punnapra, Alappuzha - 688004"
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

          {/* Application Number Template Setup */}
          <div style={{
            background: 'var(--neutral-50)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--primary-200)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <Tag size={18} color="var(--primary-700)" />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-900)' }}>
                Application Number Format & Template Setup
              </h4>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', marginBottom: '1rem', lineHeight: 1.45 }}>
              Configure how automatically assigned application numbers are structured.
              If an application number is explicitly provided in the uploaded Excel sheet, that imported number will always be retained.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'center' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                  Prefix Tag (e.g. "CARMEL")
                </label>
                <input
                  type="text"
                  placeholder="CARMEL"
                  value={form.applicationNumberPrefix}
                  onChange={(e) => setForm({ ...form, applicationNumberPrefix: e.target.value })}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--neutral-300)',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', marginTop: '0.25rem', display: 'block' }}>
                  Will be placed automatically followed by a hyphen and number.
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                  Live Format Preview & Numbering Display
                </label>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: '#fff',
                  border: '1.5px dashed var(--primary-400)',
                  fontFamily: 'monospace',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  color: 'var(--primary-800)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span>{prefix} - 1</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--neutral-400)' }}>
                    ({prefix} - 2, {prefix} - 3, ...)
                  </span>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--neutral-500)', marginTop: '0.25rem', display: 'block' }}>
                  Live sample of auto-generated application numbers.
                </span>
              </div>
            </div>
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
                Admin Dashboard Access Password
              </label>
              <input
                type="password"
                value={form.adminPin}
                onChange={(e) => setForm({ ...form, adminPin: e.target.value })}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--neutral-300)' }}
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--neutral-500)' }}>
                Security password required to switch from candidate portal to admin control center
              </span>
            </div>

            <div className="form-group">
              <label>Exam Operational State</label>
              <select
                value={form.examStatus}
                onChange={(e) => {
                  const st = e.target.value as ExamStatus;
                  setForm({ ...form, examStatus: st, isExamLive: st === 'RUNNING' });
                }}
                style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--neutral-300)', fontWeight: 600 }}
              >
                <option value="RUNNING">RUNNING - Attendees Can Login & Take Exam</option>
                <option value="PAUSED">PAUSED - Active Exam Temporarily Paused</option>
                <option value="STOPPED">STOPPED - Examination Concluded / Closed</option>
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

          {/* Global Timer Reset Confirmation Notice */}
          {timerConfirmationMsg && (
            <div className="alert-box" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
              <CheckCircle2 size={18} />
              <span>{timerConfirmationMsg}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="alert-box" style={{ background: 'var(--success-50)', color: 'var(--success-600)', border: '1px solid var(--success-100)' }}>
              <CheckCircle2 size={18} />
              <span>Exam settings saved successfully and synchronized across portal sessions!</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--neutral-200)' }}>
            <button
              type="button"
              onClick={() => setShowTimerModal(true)}
              className="btn btn-outline"
              style={{ color: 'var(--accent-600)', borderColor: 'var(--accent-300)' }}
            >
              <RotateCcw size={16} />
              <span>Reset & Confirm Global Timer</span>
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

      {/* Supabase Cloud Connection & Sync Card */}
      <div className="table-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--neutral-200)' }}>
          <Database size={22} color="var(--primary-700)" />
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--neutral-900)' }}>
              Supabase Cloud Database Synchronization
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>
              Ensures candidate logins, question bank, and live progress persist across all devices, networks, and Vercel instances
            </p>
          </div>
        </div>

        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: isSupabaseConfigured() ? 'var(--success-50)' : '#fffbeb',
          border: `1.5px solid ${isSupabaseConfigured() ? 'var(--success-200)' : '#fde68a'}`,
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isSupabaseConfigured() ? 'var(--success-800)' : '#92400e' }}>
              Status: {isSupabaseConfigured() ? 'Connected to Supabase Database' : 'Supabase Not Configured (Using Local Fallback)'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--neutral-600)', marginTop: '0.2rem' }}>
              {isSupabaseConfigured()
                ? `Active URL: ${creds.url} (Loaded via ${creds.source})`
                : 'Enter your credentials below or configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on Vercel.'}
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="btn btn-outline btn-sm"
          >
            <Radio size={14} />
            <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
          </button>
        </div>

        {testResult && (
          <div
            className={`alert-box ${testResult.success ? 'alert-box' : 'alert-error'}`}
            style={{
              marginBottom: '1.25rem',
              background: testResult.success ? 'var(--success-50)' : undefined,
              color: testResult.success ? 'var(--success-600)' : undefined,
            }}
          >
            {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{testResult.message}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.82rem' }}>Supabase Project URL</label>
            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              style={{ padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)', fontSize: '0.82rem' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.82rem' }}>Supabase Anon / Public Key</label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              style={{ padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)', fontSize: '0.82rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => {
              saveCustomSupabaseCredentials(supabaseUrl, supabaseKey);
              handleTestConnection();
            }}
            className="btn btn-outline btn-sm"
          >
            <Save size={14} />
            <span>Save Supabase Credentials</span>
          </button>
        </div>
      </div>

      {/* Danger Zone: Flush / Clear Supabase Database */}
      <div className="table-card" style={{ padding: '2rem', border: '1.5px solid var(--danger-300)', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <Trash2 size={22} color="var(--danger-600)" />
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--danger-700)' }}>
              Danger Zone: Global Clear Database
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
              Once an examination cycle has concluded and results are exported, completely flush the Supabase database wiping candidates, scores, and questions.
            </p>
          </div>
        </div>

        {clearDbSuccessMsg && (
          <div className="alert-box" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', marginBottom: '1rem' }}>
            <CheckCircle2 size={18} />
            <span>{clearDbSuccessMsg}</span>
          </div>
        )}

        <div style={{
          background: 'var(--danger-50)',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--danger-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--danger-800)', lineHeight: 1.45, maxWidth: '520px' }}>
            <strong>Caution:</strong> This irreversible action permanently flushes all registered examinees, answers, time records, and parsed question bank from Supabase.
          </div>

          <button
            type="button"
            onClick={() => setShowClearDbModal(true)}
            className="btn btn-danger"
            style={{ whiteSpace: 'nowrap' }}
          >
            <Trash2 size={16} />
            <span>Flush Supabase Database</span>
          </button>
        </div>
      </div>

      {/* Modal: Global Timer Reset Confirmation */}
      {showTimerModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Confirm Global Timer Reset</h3>
              <button
                type="button"
                onClick={() => setShowTimerModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <XCircle size={20} color="var(--neutral-400)" />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--warning-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--warning-600)',
                  flexShrink: 0
                }}>
                  <RotateCcw size={22} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, color: 'var(--neutral-900)' }}>
                    Reset & Restart Global Exam Countdown?
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--neutral-600)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                    Are you sure you want to trigger a global timer restart?
                    The exam countdown will immediately restart fresh from this exact moment ({new Date().toLocaleTimeString()})
                    for all active participants ({form.durationMinutes} minutes).
                  </p>
                </div>
              </div>

              <div style={{
                background: 'var(--neutral-50)',
                padding: '0.9rem 1.1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                color: 'var(--neutral-700)',
                marginTop: '1rem',
              }}>
                <strong>Current Status:</strong> {form.examStatus || 'RUNNING'} &bull; <strong>Allocated Duration:</strong> {form.durationMinutes} Mins
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowTimerModal(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTimerReset}
                className="btn btn-gold"
              >
                Confirm & Restart Timer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Clear Database Confirmation */}
      {showClearDbModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ color: 'var(--danger-700)' }}>Flush Entire Database?</h3>
              <button
                type="button"
                onClick={() => setShowClearDbModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <XCircle size={20} color="var(--neutral-400)" />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--danger-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--danger-600)',
                  flexShrink: 0
                }}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, color: 'var(--danger-800)' }}>
                    Permanent Data Erase Warning
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--neutral-700)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                    This will permanently wipe all candidates, responses, scores, and questions from your Supabase database and local storage.
                    Make sure you have exported results via Excel before proceeding!
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowClearDbModal(false)}
                disabled={isClearingDb}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearDatabase}
                disabled={isClearingDb}
                className="btn btn-danger"
              >
                {isClearingDb ? 'Flushing Database...' : 'Yes, Flush Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

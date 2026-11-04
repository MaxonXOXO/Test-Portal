import React, { useState } from 'react';
import {
  Activity,
  FileSpreadsheet,
  Settings,
  LogOut,
  Play,
  Pause,
  Square,
} from 'lucide-react';
import type { Candidate, Question, ExamConfig, ExamStatus } from '../../types';
import { LiveMonitor } from './LiveMonitor';
import { ExcelManager } from './ExcelManager';
import { ExamSettings } from './ExamSettings';

interface AdminDashboardProps {
  candidates: Candidate[];
  questions: Question[];
  examConfig: ExamConfig;
  onUpdateCandidates: (candidates: Candidate[]) => void;
  onUpdateQuestions: (questions: Question[]) => void;
  onUpdateExamConfig: (config: ExamConfig) => void;
  onRestartCandidate: (candidateId: string) => void;
  onRevokeCandidate: (candidateId: string) => void;
  onReinstateCandidate: (candidateId: string) => void;
  onGlobalRestart: () => void;
  onStatusChange: (status: ExamStatus) => void;
  onClearDatabase: () => Promise<void>;
  onExitAdmin: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  candidates,
  questions,
  examConfig,
  onUpdateCandidates,
  onUpdateQuestions,
  onUpdateExamConfig,
  onRestartCandidate,
  onRevokeCandidate,
  onReinstateCandidate,
  onGlobalRestart,
  onStatusChange,
  onClearDatabase,
  onExitAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'excel' | 'settings'>('monitor');

  const currentStatus: ExamStatus =
    examConfig.examStatus || (examConfig.isExamLive ? 'RUNNING' : 'PAUSED');

  const handlePlay = () => {
    onStatusChange('RUNNING');
  };

  const handlePause = () => {
    onStatusChange('PAUSED');
  };

  const handleStop = () => {
    if (confirm('Are you sure you want to STOP the exam? Candidates will no longer be able to submit or take the test.')) {
      onStatusChange('STOPPED');
    }
  };

  return (
    <div className="admin-container">
      {/* Title & Quick Controls */}
      <div className="admin-header-row" style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <div className="admin-title-area">
          <h2>Examination Control & Operations Center</h2>
          <p>
            {examConfig.instituteName} &bull; {examConfig.title} &bull; Duration: {examConfig.durationMinutes} Mins
          </p>
        </div>

        {/* Once-at-a-glance Exam Status & Play/Pause/Stop Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Status Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              background:
                currentStatus === 'RUNNING'
                  ? '#ecfdf5'
                  : currentStatus === 'PAUSED'
                  ? '#fffbeb'
                  : '#fef2f2',
              color:
                currentStatus === 'RUNNING'
                  ? '#047857'
                  : currentStatus === 'PAUSED'
                  ? '#b45309'
                  : '#dc2626',
              border: `1.5px solid ${
                currentStatus === 'RUNNING'
                  ? '#6ee7b7'
                  : currentStatus === 'PAUSED'
                  ? '#fde68a'
                  : '#fca5a5'
              }`,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background:
                  currentStatus === 'RUNNING'
                    ? '#10b981'
                    : currentStatus === 'PAUSED'
                    ? '#f59e0b'
                    : '#ef4444',
                boxShadow:
                  currentStatus === 'RUNNING'
                    ? '0 0 8px rgba(16, 185, 129, 0.8)'
                    : 'none',
              }}
            />
            <span>STATUS: {currentStatus}</span>
          </div>

          {/* Quick Play, Pause, Stop Control Group */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--neutral-300)',
              gap: '2px',
            }}
          >
            <button
              type="button"
              onClick={handlePlay}
              className={`btn btn-sm ${currentStatus === 'RUNNING' ? 'btn-primary' : 'btn-outline'}`}
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.78rem',
                border: 'none',
                background: currentStatus === 'RUNNING' ? '#047857' : 'transparent',
                color: currentStatus === 'RUNNING' ? '#fff' : '#334155',
              }}
              title="Resume / Start Examination"
            >
              <Play size={13} style={{ fill: currentStatus === 'RUNNING' ? '#fff' : 'none' }} />
              <span>Play</span>
            </button>

            <button
              type="button"
              onClick={handlePause}
              className={`btn btn-sm ${currentStatus === 'PAUSED' ? 'btn-primary' : 'btn-outline'}`}
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.78rem',
                border: 'none',
                background: currentStatus === 'PAUSED' ? '#d97706' : 'transparent',
                color: currentStatus === 'PAUSED' ? '#fff' : '#334155',
              }}
              title="Pause Examination"
            >
              <Pause size={13} style={{ fill: currentStatus === 'PAUSED' ? '#fff' : 'none' }} />
              <span>Pause</span>
            </button>

            <button
              type="button"
              onClick={handleStop}
              className={`btn btn-sm ${currentStatus === 'STOPPED' ? 'btn-danger' : 'btn-outline'}`}
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.78rem',
                border: 'none',
                background: currentStatus === 'STOPPED' ? '#dc2626' : 'transparent',
                color: currentStatus === 'STOPPED' ? '#fff' : '#dc2626',
              }}
              title="Stop Examination"
            >
              <Square size={13} style={{ fill: currentStatus === 'STOPPED' ? '#fff' : 'none' }} />
              <span>Stop</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onExitAdmin}
            className="btn btn-outline btn-sm"
          >
            <LogOut size={15} />
            <span>Candidate View</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          type="button"
          onClick={() => setActiveTab('monitor')}
          className={`admin-tab-btn ${activeTab === 'monitor' ? 'active' : ''}`}
        >
          <Activity size={18} />
          <span>Live Exam Monitor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('excel')}
          className={`admin-tab-btn ${activeTab === 'excel' ? 'active' : ''}`}
        >
          <FileSpreadsheet size={18} />
          <span>Excel Management & Question Bank</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`admin-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
        >
          <Settings size={18} />
          <span>Exam Configuration</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'monitor' && (
        <LiveMonitor
          candidates={candidates}
          questions={questions}
          examConfig={examConfig}
          onRestartCandidate={onRestartCandidate}
          onRevokeCandidate={onRevokeCandidate}
          onReinstateCandidate={onReinstateCandidate}
          onGlobalRestart={onGlobalRestart}
          onStatusChange={onStatusChange}
        />
      )}

      {activeTab === 'excel' && (
        <ExcelManager
          candidates={candidates}
          questions={questions}
          examConfig={examConfig}
          onUpdateCandidates={onUpdateCandidates}
          onUpdateQuestions={onUpdateQuestions}
        />
      )}

      {activeTab === 'settings' && (
        <ExamSettings
          examConfig={examConfig}
          onSaveConfig={onUpdateExamConfig}
          onGlobalRestart={onGlobalRestart}
          onClearDatabase={onClearDatabase}
          onStatusChange={onStatusChange}
        />
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Activity,
  FileSpreadsheet,
  Settings,
  LogOut,
} from 'lucide-react';
import type { Candidate, Question, ExamConfig } from '../../types';
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
  onExitAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'monitor' | 'excel' | 'settings'>('monitor');

  return (
    <div className="admin-container">
      {/* Title & Quick Controls */}
      <div className="admin-header-row">
        <div className="admin-title-area">
          <h2>Examination Control & Operations Center</h2>
          <p>
            {examConfig.instituteName} &bull; {examConfig.title} &bull; Duration: {examConfig.durationMinutes} Mins
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onExitAdmin}
            className="btn btn-outline btn-sm"
          >
            <LogOut size={15} />
            <span>Switch to Candidate View</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          onClick={() => setActiveTab('monitor')}
          className={`admin-tab-btn ${activeTab === 'monitor' ? 'active' : ''}`}
        >
          <Activity size={18} />
          <span>Live Exam Monitor</span>
        </button>

        <button
          onClick={() => setActiveTab('excel')}
          className={`admin-tab-btn ${activeTab === 'excel' ? 'active' : ''}`}
        >
          <FileSpreadsheet size={18} />
          <span>Excel Management & Question Bank</span>
        </button>

        <button
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
        />
      )}

      {activeTab === 'excel' && (
        <ExcelManager
          candidates={candidates}
          questions={questions}
          onUpdateCandidates={onUpdateCandidates}
          onUpdateQuestions={onUpdateQuestions}
        />
      )}

      {activeTab === 'settings' && (
        <ExamSettings
          examConfig={examConfig}
          onSaveConfig={onUpdateExamConfig}
          onGlobalRestart={onGlobalRestart}
        />
      )}
    </div>
  );
};

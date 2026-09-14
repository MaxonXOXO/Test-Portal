import React, { useState } from 'react';
import {
  Users,
  PlayCircle,
  CheckCircle2,
  AlertOctagon,
  RotateCcw,
  Ban,
  FileSpreadsheet,
  Search,
  Eye,
  XCircle,
  TrendingUp,
  Unlock,
  Printer,
} from 'lucide-react';
import type { Candidate, ExamConfig, Question } from '../../types';
import { exportResultsExcel } from '../../services/storage';
import { printCandidateAnswerSheet, printMasterCandidateList } from '../../services/printService';

interface LiveMonitorProps {
  candidates: Candidate[];
  questions: Question[];
  examConfig: ExamConfig;
  onRestartCandidate: (candidateId: string) => void;
  onRevokeCandidate: (candidateId: string) => void;
  onReinstateCandidate: (candidateId: string) => void;
  onGlobalRestart: () => void;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({
  candidates,
  questions,
  examConfig,
  onRestartCandidate,
  onRevokeCandidate,
  onReinstateCandidate,
  onGlobalRestart,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [inspectCandidate, setInspectCandidate] = useState<Candidate | null>(null);
  const [showGlobalRestartModal, setShowGlobalRestartModal] = useState(false);

  const totalPossibleScore = questions.reduce((acc, q) => acc + q.marks, 0);

  // Statistics calculation
  const totalRegistered = candidates.length;
  const inProgressCount = candidates.filter((c) => c.status === 'IN_PROGRESS').length;
  const completedCount = candidates.filter((c) => c.status === 'COMPLETED').length;
  const revokedCount = candidates.filter((c) => c.status === 'REVOKED').length;

  const completedCandidates = candidates.filter((c) => c.status === 'COMPLETED');
  const avgScore = completedCandidates.length
    ? (completedCandidates.reduce((sum, c) => sum + c.score, 0) / completedCandidates.length).toFixed(1)
    : '0';

  // Filtered list
  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm);

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportExcel = () => {
    exportResultsExcel(candidates, questions, examConfig);
  };

  return (
    <div>
      {/* Metrics Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-info">
            <h4>Total Registered</h4>
            <div className="stat-val">{totalRegistered}</div>
          </div>
          <div className="stat-card-icon" style={{ background: 'var(--primary-100)', color: 'var(--primary-700)' }}>
            <Users size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h4>In Progress</h4>
            <div className="stat-val" style={{ color: 'var(--accent-600)' }}>{inProgressCount}</div>
          </div>
          <div className="stat-card-icon" style={{ background: 'var(--accent-100)', color: 'var(--accent-600)' }}>
            <PlayCircle size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h4>Completed</h4>
            <div className="stat-val" style={{ color: 'var(--success-600)' }}>{completedCount}</div>
          </div>
          <div className="stat-card-icon" style={{ background: 'var(--success-100)', color: 'var(--success-600)' }}>
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h4>Revoked / Suspended</h4>
            <div className="stat-val" style={{ color: 'var(--danger-600)' }}>{revokedCount}</div>
          </div>
          <div className="stat-card-icon" style={{ background: 'var(--danger-100)', color: 'var(--danger-600)' }}>
            <AlertOctagon size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-info">
            <h4>Avg. Score (Admin)</h4>
            <div className="stat-val" style={{ color: 'var(--primary-800)' }}>
              {avgScore} <span style={{ fontSize: '1rem', color: 'var(--neutral-400)' }}>/ {totalPossibleScore}</span>
            </div>
          </div>
          <div className="stat-card-icon" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="table-card">
        {/* Table Toolbar */}
        <div className="table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', flex: 1 }}>
            {/* Search Input */}
            <div className="input-with-icon" style={{ minWidth: '260px', flex: 1, maxWidth: '380px' }}>
              <Search className="input-icon" size={17} />
              <input
                type="text"
                placeholder="Search candidate by name or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '0.6rem 0.85rem 0.6rem 2.4rem', fontSize: '0.86rem' }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {(['ALL', 'IN_PROGRESS', 'COMPLETED', 'NOT_STARTED', 'REVOKED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-outline'}`}
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowGlobalRestartModal(true)}
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--accent-600)', borderColor: 'var(--accent-400)' }}
              title="Restart exam timer globally for all active candidates"
            >
              <RotateCcw size={15} />
              <span>Global Restart</span>
            </button>

            <button
              onClick={() => printMasterCandidateList(candidates, questions, examConfig)}
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--primary-700)', borderColor: 'var(--primary-500)', whiteSpace: 'nowrap' }}
              title="Print master roster score sheet with all candidates in a clean new tab"
            >
              <Printer size={15} />
              <span>Print Master Sheet</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="btn btn-gold btn-sm"
              title="Download results in Excel format"
            >
              <FileSpreadsheet size={16} />
              <span>Export Results (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Candidate Name</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Started At</th>
                <th>Completion Time</th>
                <th>Score (Admin Only)</th>
                <th style={{ textAlign: 'right', paddingRight: '1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.length > 0 ? (
                filteredCandidates.map((c) => {
                  const answered = Object.keys(c.answers || {}).length;
                  const total = questions.length;
                  const percentage = totalPossibleScore > 0 ? ((c.score / totalPossibleScore) * 100).toFixed(0) : '0';

                  let statusBadgeClass = 'badge-gray';
                  if (c.status === 'IN_PROGRESS') statusBadgeClass = 'badge-amber';
                  else if (c.status === 'COMPLETED') statusBadgeClass = 'badge-green';
                  else if (c.status === 'REVOKED') statusBadgeClass = 'badge-red';

                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--neutral-900)' }}>{c.name}</div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.phone}</span>
                      </td>
                      <td>
                        <span className={`badge ${statusBadgeClass}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                            {answered}/{total}
                          </span>
                          <div style={{
                            width: 60,
                            height: 6,
                            background: 'var(--neutral-200)',
                            borderRadius: 3,
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${total > 0 ? (answered / total) * 100 : 0}%`,
                              height: '100%',
                              background: 'var(--primary-600)'
                            }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        {c.startedAt ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--neutral-600)' }}>
                            {new Date(c.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--neutral-400)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        {c.completedAt ? (
                          <div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--success-600)' }}>
                              {new Date(c.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            {c.timeTakenSeconds && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--neutral-500)' }}>
                                ({Math.floor(c.timeTakenSeconds / 60)}m {c.timeTakenSeconds % 60}s)
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--neutral-400)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        {c.status === 'COMPLETED' ? (
                          <div>
                            <span style={{ fontWeight: 800, color: 'var(--primary-800)', fontSize: '0.95rem' }}>
                              {c.score} / {totalPossibleScore}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginLeft: '0.35rem' }}>
                              ({percentage}%)
                            </span>
                          </div>
                        ) : c.status === 'IN_PROGRESS' ? (
                          <span style={{ fontSize: '0.78rem', color: 'var(--accent-600)', fontStyle: 'italic' }}>
                            In Exam...
                          </span>
                        ) : (
                          <span style={{ color: 'var(--neutral-400)', fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'nowrap' }}>
                          <button
                            onClick={() => setInspectCandidate(c)}
                            className="btn btn-outline btn-row-action"
                            title="Inspect Candidate Answers"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>

                          {/* Print Individual Answer Sheet (Admin Only) */}
                          <button
                            onClick={() => printCandidateAnswerSheet(c, questions, examConfig)}
                            className="btn btn-outline btn-row-action"
                            style={{ color: 'var(--primary-700)', borderColor: 'var(--primary-400)' }}
                            title="Print Individual Answer Sheet in New Tab"
                          >
                            <Printer size={13} />
                            <span>Print Sheet</span>
                          </button>

                          {/* Individual Restart (Starts timer from that exact moment) */}
                          <button
                            onClick={() => onRestartCandidate(c.id)}
                            className="btn btn-outline btn-row-action"
                            style={{ color: 'var(--accent-600)', borderColor: 'var(--accent-300)' }}
                            title="Restart test for this candidate (resets timer from this exact moment)"
                          >
                            <RotateCcw size={13} />
                            <span>Restart</span>
                          </button>

                          {/* Revoke or Reinstate */}
                          {c.status === 'REVOKED' ? (
                            <button
                              onClick={() => onReinstateCandidate(c.id)}
                              className="btn btn-outline btn-row-action"
                              style={{ color: 'var(--success-600)', borderColor: 'var(--success-200)' }}
                              title="Reinstate examinee access"
                            >
                              <Unlock size={13} />
                              <span>Allow</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onRevokeCandidate(c.id)}
                              className="btn btn-danger btn-row-action"
                              title="Revoke examinee access"
                            >
                              <Ban size={13} />
                              <span>Revoke</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--neutral-500)' }}>
                    No candidates found matching filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Inspect Answers Modal */}
      {inspectCandidate && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div>
                <h3>Candidate Response Log</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>
                  {inspectCandidate.name} &bull; Contact: {inspectCandidate.phone}
                </p>
              </div>
              <button
                onClick={() => setInspectCandidate(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <XCircle size={20} color="var(--neutral-400)" />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: 'var(--neutral-50)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', display: 'block' }}>Score & Percentage</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-800)' }}>
                    {inspectCandidate.score} / {totalPossibleScore} (
                    {totalPossibleScore > 0 ? ((inspectCandidate.score / totalPossibleScore) * 100).toFixed(0) : 0}%)
                  </span>
                </div>
                <div style={{ background: 'var(--neutral-50)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', display: 'block' }}>Duration</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                    {inspectCandidate.timeTakenSeconds
                      ? `${Math.floor(inspectCandidate.timeTakenSeconds / 60)}m ${inspectCandidate.timeTakenSeconds % 60}s`
                      : 'In Progress'}
                  </span>
                </div>
              </div>

              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--neutral-600)' }}>
                Detailed Question Breakdown
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {questions.map((q, idx) => {
                  const selectedOpt = inspectCandidate.answers ? inspectCandidate.answers[q.id] : undefined;
                  const isCorrect = selectedOpt === q.correctOption;

                  return (
                    <div
                      key={q.id}
                      style={{
                        padding: '0.85rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--neutral-200)',
                        background: selectedOpt ? (isCorrect ? 'var(--success-50)' : 'var(--danger-50)') : '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Q{idx + 1}. {q.question}</span>
                        {selectedOpt ? (
                          <span
                            className={`badge ${isCorrect ? 'badge-green' : 'badge-red'}`}
                            style={{ flexShrink: 0, height: 'fit-content' }}
                          >
                            {isCorrect ? 'Correct (+1)' : 'Incorrect (0)'}
                          </span>
                        ) : (
                          <span className="badge badge-gray" style={{ flexShrink: 0, height: 'fit-content' }}>
                            Unanswered
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                        <span>Candidate Selected: <strong>{selectedOpt || 'None'}</strong></span>
                        <span>Correct Answer: <strong style={{ color: 'var(--success-600)' }}>Option {q.correctOption}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setInspectCandidate(null)}
                className="btn btn-outline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Restart Confirmation Modal */}
      {showGlobalRestartModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Initiate Global Restart</h3>
              <button
                onClick={() => setShowGlobalRestartModal(false)}
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
                    Restart Exam Timer for All Active Test-Takers?
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--neutral-600)', marginTop: '0.25rem', lineHeight: 1.5 }}>
                    This will immediately broadcast a global restart signal. The timer for all active test-takers will
                    restart fresh from this exact moment ({new Date().toLocaleTimeString()}).
                  </p>
                </div>
              </div>

              <div style={{
                background: 'var(--neutral-50)',
                padding: '0.9rem 1.1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                color: 'var(--neutral-700)'
              }}>
                <strong>Active Exam Duration:</strong> {examConfig.durationMinutes} minutes from the moment restarted.
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowGlobalRestartModal(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowGlobalRestartModal(false);
                  onGlobalRestart();
                }}
                className="btn btn-gold"
              >
                Confirm Global Restart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

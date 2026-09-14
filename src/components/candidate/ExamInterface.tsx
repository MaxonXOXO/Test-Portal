import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import type { Candidate, ExamConfig, Question, SyncMessage } from '../../types';
import { examBroadcast } from '../../services/broadcast';
import { calculateCandidateScore } from '../../services/storage';

interface ExamInterfaceProps {
  candidate: Candidate;
  questions: Question[];
  examConfig: ExamConfig;
  onCandidateUpdate: (updated: Candidate) => void;
  onSubmitExam: (finalCandidate: Candidate) => void;
  onRevoked: () => void;
}

export const ExamInterface: React.FC<ExamInterfaceProps> = ({
  candidate,
  questions,
  examConfig,
  onCandidateUpdate,
  onSubmitExam,
  onRevoked,
}) => {
  // Determine effective start timestamp (handles candidate restart or global restart)
  const effectiveStartTime = useMemo(() => {
    let t = candidate.startedAt || Date.now();
    if (candidate.restartedAt && candidate.restartedAt > t) {
      t = candidate.restartedAt;
    }
    if (examConfig.globalRestartTimestamp && examConfig.globalRestartTimestamp > t) {
      t = examConfig.globalRestartTimestamp;
    }
    return t;
  }, [candidate.startedAt, candidate.restartedAt, examConfig.globalRestartTimestamp]);

  const totalDurationSeconds = examConfig.durationMinutes * 60;

  // Calculate remaining time
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    const elapsed = Math.floor((Date.now() - effectiveStartTime) / 1000);
    return Math.max(0, totalDurationSeconds - elapsed);
  });

  const [currentIndex, setCurrentIndex] = useState<number>(candidate.currentQuestionIndex || 0);
  const [answers, setAnswers] = useState<Record<string, string>>(candidate.answers || {});
  const [visitedIndices, setVisitedIndices] = useState<Set<number>>(() => new Set([candidate.currentQuestionIndex || 0]));
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [adminNotification, setAdminNotification] = useState<string | null>(null);

  // Maintain juggled/shuffled question order for this candidate
  const orderedQuestions = useMemo(() => {
    if (!candidate.shuffledQuestionIds || candidate.shuffledQuestionIds.length === 0) {
      return questions;
    }
    const qMap = new Map(questions.map((q) => [q.id, q]));
    const list: Question[] = [];
    candidate.shuffledQuestionIds.forEach((id) => {
      const q = qMap.get(id);
      if (q) list.push(q);
    });
    // Add any remaining questions
    questions.forEach((q) => {
      if (!list.find((item) => item.id === q.id)) {
        list.push(q);
      }
    });
    return list;
  }, [questions, candidate.shuffledQuestionIds]);

  const currentQuestion: Question | undefined = orderedQuestions[currentIndex];

  // Real-time Timer Countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - effectiveStartTime) / 1000);
      const remaining = Math.max(0, totalDurationSeconds - elapsed);
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleAutoSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [effectiveStartTime, totalDurationSeconds]);

  // Handle Auto Submit when timer reaches 0
  const handleAutoSubmit = useCallback(() => {
    const timeTaken = Math.min(totalDurationSeconds, Math.floor((Date.now() - effectiveStartTime) / 1000));
    const score = calculateCandidateScore(answers, questions);

    const completedCandidate: Candidate = {
      ...candidate,
      status: 'COMPLETED',
      completedAt: Date.now(),
      timeTakenSeconds: timeTaken,
      answers,
      score,
    };

    onSubmitExam(completedCandidate);
  }, [answers, candidate, effectiveStartTime, onSubmitExam, questions, totalDurationSeconds]);

  // Listen for broadcast events from Admin (Restart, Revoke, Global Restart)
  useEffect(() => {
    const unsubscribe = examBroadcast.subscribe((msg: SyncMessage) => {
      if (msg.type === 'RESTART_CANDIDATE' && msg.candidateId === candidate.id) {
        // Reset state & timer starting from exact moment
        setAnswers({});
        setCurrentIndex(0);
        setVisitedIndices(new Set([0]));
        setAdminNotification(`Your examination has been restarted by the invigilator at ${new Date(msg.timestamp).toLocaleTimeString()}. Your timer has restarted from this moment.`);
        const updated: Candidate = {
          ...candidate,
          status: 'IN_PROGRESS',
          restartedAt: msg.timestamp,
          startedAt: msg.timestamp,
          completedAt: null,
          timeTakenSeconds: null,
          answers: {},
          score: 0,
          currentQuestionIndex: 0,
        };
        onCandidateUpdate(updated);
      } else if (msg.type === 'REVOKE_CANDIDATE' && msg.candidateId === candidate.id) {
        onRevoked();
      } else if (msg.type === 'GLOBAL_RESTART') {
        setAdminNotification(`Global Restart initiated by invigilator at ${new Date(msg.timestamp).toLocaleTimeString()}. Exam timer has restarted.`);
        const updated: Candidate = {
          ...candidate,
          restartedAt: msg.timestamp,
        };
        onCandidateUpdate(updated);
      }
    });

    return () => unsubscribe();
  }, [candidate, onCandidateUpdate, onRevoked]);

  // Anti-cheating security: Disable browser search (Ctrl/Cmd+F), Copy, Cut, Paste, Print, DevTools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + F (Browser Search / Find)
      if (isCtrlOrCmd && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl/Cmd + C (Copy)
      if (isCtrlOrCmd && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl/Cmd + V (Paste)
      if (isCtrlOrCmd && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl/Cmd + X (Cut)
      if (isCtrlOrCmd && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl/Cmd + U (View Source)
      if (isCtrlOrCmd && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // Ctrl/Cmd + P (Print)
      if (isCtrlOrCmd && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      // F12 or Inspect (Ctrl+Shift+I)
      if (
        e.key === 'F12' ||
        (isCtrlOrCmd && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    const preventDefaultAction = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', preventDefaultAction);
    document.addEventListener('copy', preventDefaultAction);
    document.addEventListener('cut', preventDefaultAction);
    document.addEventListener('paste', preventDefaultAction);
    document.addEventListener('selectstart', preventDefaultAction);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', preventDefaultAction);
      document.removeEventListener('copy', preventDefaultAction);
      document.removeEventListener('cut', preventDefaultAction);
      document.removeEventListener('paste', preventDefaultAction);
      document.removeEventListener('selectstart', preventDefaultAction);
    };
  }, []);

  // Option selection
  const handleSelectOption = (optionKey: 'A' | 'B' | 'C' | 'D') => {
    if (!currentQuestion) return;
    const newAnswers = { ...answers, [currentQuestion.id]: optionKey };
    setAnswers(newAnswers);

    const updated: Candidate = {
      ...candidate,
      answers: newAnswers,
      currentQuestionIndex: currentIndex,
    };
    onCandidateUpdate(updated);

    examBroadcast.broadcast({
      type: 'CANDIDATE_PROGRESS',
      candidateId: candidate.id,
      answers: newAnswers,
      currentQuestionIndex: currentIndex,
    });
  };

  // Clear choice
  const handleClearOption = () => {
    if (!currentQuestion) return;
    const newAnswers = { ...answers };
    delete newAnswers[currentQuestion.id];
    setAnswers(newAnswers);

    const updated: Candidate = {
      ...candidate,
      answers: newAnswers,
      currentQuestionIndex: currentIndex,
    };
    onCandidateUpdate(updated);

    examBroadcast.broadcast({
      type: 'CANDIDATE_PROGRESS',
      candidateId: candidate.id,
      answers: newAnswers,
      currentQuestionIndex: currentIndex,
    });
  };

  // Navigation handlers
  const handleNavigate = (newIdx: number) => {
    if (newIdx >= 0 && newIdx < orderedQuestions.length) {
      setCurrentIndex(newIdx);
      setVisitedIndices((prev) => new Set(prev).add(newIdx));
      onCandidateUpdate({
        ...candidate,
        currentQuestionIndex: newIdx,
      });
    }
  };

  // Explicit Candidate Submission
  const handleManualSubmit = () => {
    setShowSubmitModal(false);
    const timeTaken = Math.floor((Date.now() - effectiveStartTime) / 1000);
    const score = calculateCandidateScore(answers, questions);

    const completedCandidate: Candidate = {
      ...candidate,
      status: 'COMPLETED',
      completedAt: Date.now(),
      timeTakenSeconds: timeTaken,
      answers,
      score,
    };

    onSubmitExam(completedCandidate);
  };

  // Format timer HH:MM:SS or MM:SS
  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const isWarningTime = remainingSeconds <= 300; // Under 5 minutes

  return (
    <div className="exam-container">
      {/* Admin Broadcast Flash Alert */}
      {adminNotification && (
        <div
          className="alert-box alert-warning"
          style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <RotateCcw size={18} />
            <span>{adminNotification}</span>
          </div>
          <button
            onClick={() => setAdminNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <XCircle size={18} />
          </button>
        </div>
      )}

      {/* Meta Bar */}
      <div className="exam-meta-bar">
        <div className="exam-candidate-summary">
          <div className="exam-avatar">
            {candidate.name.charAt(0).toUpperCase()}
          </div>
          <div className="exam-candidate-info">
            <h3>{candidate.name}</h3>
            <p>Registered Contact: <strong>{candidate.phone}</strong></p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', display: 'block' }}>
              Attempted Progress
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-700)' }}>
              {answeredCount} of {orderedQuestions.length} Answered
            </span>
          </div>

          <div className={`exam-timer-card exam-timer-large ${isWarningTime ? 'warning-time' : ''}`}>
            <Clock size={28} />
            <div>
              <span className="timer-label">Time Remaining</span>
              <span className="timer-digits-large">{formatTimer(remainingSeconds)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Exam Grid */}
      <div className="exam-grid">
        {/* Main Question View (One by One) with Selection and Copy Disabled */}
        {currentQuestion ? (
          <div
            className="question-card"
            onContextMenu={(e) => e.preventDefault()}
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            onPaste={(e) => e.preventDefault()}
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            <div className="question-header">
              <span className="question-num-tag">
                Question {currentIndex + 1} of {orderedQuestions.length}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="question-marks-badge">
                  {currentQuestion.marks} Mark{currentQuestion.marks > 1 ? 's' : ''}
                </span>
                {answers[currentQuestion.id] && (
                  <span className="badge badge-green" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={13} />
                    Answered ({answers[currentQuestion.id]})
                  </span>
                )}
              </div>
            </div>

            {/* Question Text */}
            <div className="question-body-text">
              {currentQuestion.question}
            </div>

            {/* MCQ 4 Options */}
            <div className="mcq-options-list">
              {(['A', 'B', 'C', 'D'] as const).map((optKey, oIdx) => {
                const optText = currentQuestion.options[oIdx];
                const isSelected = answers[currentQuestion.id] === optKey;

                return (
                  <div
                    key={optKey}
                    className={`mcq-option-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectOption(optKey)}
                  >
                    <div className="mcq-badge">{optKey}</div>
                    <div className="mcq-text">{optText}</div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="question-footer">
              <div>
                {answers[currentQuestion.id] && (
                  <button
                    type="button"
                    onClick={handleClearOption}
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--neutral-600)' }}
                  >
                    Clear Response
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => handleNavigate(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className="btn btn-outline"
                >
                  <ChevronLeft size={18} />
                  <span>Previous</span>
                </button>

                {currentIndex < orderedQuestions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => handleNavigate(currentIndex + 1)}
                    className="btn btn-primary"
                  >
                    <span>Next</span>
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="btn btn-gold"
                  >
                    <Send size={16} />
                    <span>Review & Submit</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="question-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <HelpCircle size={48} color="var(--neutral-400)" style={{ margin: '0 auto 1rem auto' }} />
            <h3>No questions loaded in this assessment</h3>
            <p style={{ color: 'var(--neutral-500)', marginTop: '0.5rem' }}>
              Please check the question bank configuration in the Admin Dashboard.
            </p>
          </div>
        )}

        {/* Side Question Palette */}
        <div className="palette-card">
          <div className="palette-title">Question Palette</div>

          <div className="palette-legend">
            <div className="legend-item">
              <div className="legend-color" style={{ background: 'var(--success-500)' }} />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: 'var(--neutral-200)' }} />
              <span>Unanswered ({orderedQuestions.length - answeredCount})</span>
            </div>
          </div>

          <div className="palette-grid">
            {orderedQuestions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.id]);
              const isVisited = visitedIndices.has(idx);
              const isCurrent = idx === currentIndex;

              let btnClass = 'palette-btn ';
              if (isAnswered) btnClass += 'answered ';
              else if (isVisited) btnClass += 'unvisited ';
              else btnClass += 'unvisited ';
              if (isCurrent) btnClass += 'current ';

              return (
                <button
                  key={q.id}
                  className={btnClass}
                  onClick={() => handleNavigate(idx)}
                  title={`Question ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--neutral-200)' }}>
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="btn btn-gold"
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <Send size={15} />
              <span>Submit Assessment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Before Submission */}
      {showSubmitModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Confirm Exam Submission</h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <XCircle size={20} color="var(--neutral-400)" />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--accent-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-600)'
                }}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, color: 'var(--neutral-900)' }}>Are you sure you want to finish?</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--neutral-600)' }}>
                    Once submitted, you will not be able to modify your answers.
                  </p>
                </div>
              </div>

              <div style={{
                background: 'var(--neutral-50)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                border: '1px solid var(--neutral-200)'
              }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', display: 'block' }}>Total Questions</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{orderedQuestions.length}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', display: 'block' }}>Answered</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success-600)' }}>{answeredCount}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', display: 'block' }}>Unanswered</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--danger-500)' }}>
                    {orderedQuestions.length - answeredCount}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', display: 'block' }}>Time Left</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-700)' }}>
                    {formatTimer(remainingSeconds)}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="btn btn-outline"
              >
                Continue Exam
              </button>
              <button
                type="button"
                onClick={handleManualSubmit}
                className="btn btn-gold"
              >
                Yes, Submit Final Responses
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

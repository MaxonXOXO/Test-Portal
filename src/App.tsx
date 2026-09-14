import React, { useState, useEffect } from 'react';
import type { Candidate, Question, ExamConfig, AppState, SyncMessage } from './types';
import {
  loadAppState,
  saveAppState,
  shuffleArray,
} from './services/storage';
import { examBroadcast } from './services/broadcast';
import { Header } from './components/common/Header';
import { CandidateLogin } from './components/candidate/CandidateLogin';
import { CandidateInstructions } from './components/candidate/CandidateInstructions';
import { ExamInterface } from './components/candidate/ExamInterface';
import { CompletionScreen } from './components/candidate/CompletionScreen';
import { CandidateRevoked } from './components/candidate/CandidateRevoked';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminPinModal } from './components/admin/AdminPinModal';

export const App: React.FC = () => {
  // Master persistent state
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  const { examConfig, candidates, questions } = appState;

  // Navigation & session state
  const [currentView, setCurrentView] = useState<'candidate' | 'admin'>('candidate');
  const [showPinModal, setShowPinModal] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // Candidate Flow State
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);
  const [candidateStep, setCandidateStep] = useState<'LOGIN' | 'INSTRUCTIONS' | 'EXAM' | 'COMPLETED' | 'REVOKED'>('LOGIN');

  // Find active candidate from candidates array
  const activeCandidate = candidates.find((c) => c.id === activeCandidateId) || null;

  // Persist whenever state changes
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  // Subscribe to real-time BroadcastChannel updates (Multi-tab synchronization)
  useEffect(() => {
    const unsubscribe = examBroadcast.subscribe((msg: SyncMessage) => {
      if (msg.type === 'CANDIDATE_PROGRESS') {
        setAppState((prev) => ({
          ...prev,
          candidates: prev.candidates.map((c) =>
            c.id === msg.candidateId
              ? { ...c, answers: msg.answers, currentQuestionIndex: msg.currentQuestionIndex, status: 'IN_PROGRESS' }
              : c
          ),
        }));
      } else if (msg.type === 'CANDIDATE_SUBMIT') {
        setAppState((prev) => ({
          ...prev,
          candidates: prev.candidates.map((c) =>
            c.id === msg.candidateId
              ? { ...c, status: 'COMPLETED', completedAt: msg.completedAt, timeTakenSeconds: msg.timeTakenSeconds, score: msg.score }
              : c
          ),
        }));
      } else if (msg.type === 'RESTART_CANDIDATE') {
        setAppState((prev) => ({
          ...prev,
          candidates: prev.candidates.map((c) =>
            c.id === msg.candidateId
              ? {
                  ...c,
                  status: 'IN_PROGRESS',
                  startedAt: msg.timestamp,
                  restartedAt: msg.timestamp,
                  completedAt: null,
                  timeTakenSeconds: null,
                  answers: {},
                  score: 0,
                  currentQuestionIndex: 0,
                }
              : c
          ),
        }));

        if (activeCandidateId === msg.candidateId) {
          setCandidateStep('EXAM');
        }
      } else if (msg.type === 'REVOKE_CANDIDATE') {
        setAppState((prev) => ({
          ...prev,
          candidates: prev.candidates.map((c) =>
            c.id === msg.candidateId ? { ...c, status: 'REVOKED', revokedAt: Date.now() } : c
          ),
        }));

        if (activeCandidateId === msg.candidateId) {
          setCandidateStep('REVOKED');
        }
      } else if (msg.type === 'REINSTATE_CANDIDATE') {
        setAppState((prev) => ({
          ...prev,
          candidates: prev.candidates.map((c) =>
            c.id === msg.candidateId ? { ...c, status: 'IN_PROGRESS' } : c
          ),
        }));

        if (activeCandidateId === msg.candidateId) {
          setCandidateStep('EXAM');
        }
      } else if (msg.type === 'GLOBAL_RESTART') {
        setAppState((prev) => ({
          ...prev,
          examConfig: { ...prev.examConfig, globalRestartTimestamp: msg.timestamp },
          candidates: prev.candidates.map((c) =>
            c.status === 'IN_PROGRESS' || c.status === 'COMPLETED'
              ? {
                  ...c,
                  status: 'IN_PROGRESS',
                  restartedAt: msg.timestamp,
                  completedAt: null,
                  timeTakenSeconds: null,
                }
              : c
          ),
        }));

        if (activeCandidateId && candidateStep !== 'LOGIN') {
          setCandidateStep('EXAM');
        }
      }
    });

    return () => unsubscribe();
  }, [activeCandidateId, candidateStep]);

  // Synchronize state across tabs via native StorageEvent (essential for multi-tab sessions on Vercel)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'carmel_polytechnic_portal_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setAppState(parsed);
        } catch (err) {
          console.error('Failed to parse cross-tab storage update:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Candidate login success -> Go to instructions
  const handleCandidateLoginSuccess = (cand: Candidate) => {
    setActiveCandidateId(cand.id);
    if (cand.status === 'COMPLETED') {
      setCandidateStep('COMPLETED');
    } else if (cand.status === 'REVOKED') {
      setCandidateStep('REVOKED');
    } else {
      setCandidateStep('INSTRUCTIONS');
    }
  };

  // Candidate starts exam
  const handleStartExam = () => {
    if (!activeCandidate) return;
    const now = Date.now();

    // Shuffle questions per candidate if enabled
    const questionIds = questions.map((q) => q.id);
    const shuffledIds = examConfig.randomizeQuestions ? shuffleArray(questionIds) : questionIds;

    const updated: Candidate = {
      ...activeCandidate,
      status: 'IN_PROGRESS',
      startedAt: activeCandidate.startedAt || now,
      shuffledQuestionIds: shuffledIds,
    };

    setAppState((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) => (c.id === updated.id ? updated : c)),
    }));

    setCandidateStep('EXAM');
  };

  // Update candidate state as answers change
  const handleCandidateUpdate = (updated: Candidate) => {
    setAppState((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) => (c.id === updated.id ? updated : c)),
    }));
  };

  // Candidate finishes exam (Auto or Manual)
  const handleSubmitExam = (finalCandidate: Candidate) => {
    setAppState((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) => (c.id === finalCandidate.id ? finalCandidate : c)),
    }));

    examBroadcast.broadcast({
      type: 'CANDIDATE_SUBMIT',
      candidateId: finalCandidate.id,
      completedAt: finalCandidate.completedAt || Date.now(),
      timeTakenSeconds: finalCandidate.timeTakenSeconds || 0,
      score: finalCandidate.score,
    });

    setCandidateStep('COMPLETED');
  };

  // Candidate logout / exit session
  const handleCandidateLogout = () => {
    setActiveCandidateId(null);
    setCandidateStep('LOGIN');
  };

  // View Switcher logic
  const handleSwitchView = (targetView: 'candidate' | 'admin') => {
    if (targetView === 'admin') {
      if (isAdminAuthenticated) {
        setCurrentView('admin');
      } else {
        setShowPinModal(true);
      }
    } else {
      setCurrentView('candidate');
    }
  };

  // Admin Actions: Update Candidate Roster
  const handleUpdateCandidates = (newCandidates: Candidate[]) => {
    setAppState((prev) => ({
      ...prev,
      candidates: newCandidates,
    }));
  };

  // Admin Actions: Update Questions Bank
  const handleUpdateQuestions = (newQuestions: Question[]) => {
    setAppState((prev) => ({
      ...prev,
      questions: newQuestions,
    }));
  };

  // Admin Actions: Update Exam Config
  const handleUpdateExamConfig = (newConfig: ExamConfig) => {
    setAppState((prev) => ({
      ...prev,
      examConfig: newConfig,
    }));
  };

  // Admin Action: Restart for specific person
  // "When restarted for a person, The timer for them must start from that exact moment from which it was restarted"
  const handleRestartCandidate = (candidateId: string) => {
    const restartTime = Date.now();
    const target = candidates.find((c) => c.id === candidateId);
    if (!target) return;

    const questionIds = questions.map((q) => q.id);
    const shuffledIds = examConfig.randomizeQuestions ? shuffleArray(questionIds) : questionIds;

    const updated: Candidate = {
      ...target,
      status: 'IN_PROGRESS',
      startedAt: restartTime,
      restartedAt: restartTime,
      completedAt: null,
      timeTakenSeconds: null,
      answers: {},
      score: 0,
      currentQuestionIndex: 0,
      shuffledQuestionIds: shuffledIds,
    };

    setAppState((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) => (c.id === candidateId ? updated : c)),
    }));

    examBroadcast.broadcast({
      type: 'RESTART_CANDIDATE',
      candidateId,
      timestamp: restartTime,
    });

    if (activeCandidateId === candidateId) {
      setCandidateStep('EXAM');
    }
  };

  // Admin Action: Revoke specific person
  const handleRevokeCandidate = (candidateId: string) => {
    setAppState((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) =>
        c.id === candidateId ? { ...c, status: 'REVOKED', revokedAt: Date.now() } : c
      ),
    }));

    examBroadcast.broadcast({
      type: 'REVOKE_CANDIDATE',
      candidateId,
    });

    if (activeCandidateId === candidateId) {
      setCandidateStep('REVOKED');
    }
  };

  // Admin Action: Reinstate specific person
  const handleReinstateCandidate = (candidateId: string) => {
    setAppState((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) =>
        c.id === candidateId ? { ...c, status: 'IN_PROGRESS', revokedAt: null } : c
      ),
    }));

    examBroadcast.broadcast({
      type: 'REINSTATE_CANDIDATE',
      candidateId,
    });

    if (activeCandidateId === candidateId) {
      setCandidateStep('EXAM');
    }
  };

  // Admin Action: Global Restart
  // "it applies to global restarting as well, with admin having control to change the timing start time if needed"
  const handleGlobalRestart = () => {
    const restartTime = Date.now();
    setAppState((prev) => ({
      ...prev,
      examConfig: {
        ...prev.examConfig,
        globalRestartTimestamp: restartTime,
      },
      candidates: prev.candidates.map((c) => {
        if (c.status === 'IN_PROGRESS' || c.status === 'COMPLETED') {
          return {
            ...c,
            status: 'IN_PROGRESS',
            restartedAt: restartTime,
            completedAt: null,
            timeTakenSeconds: null,
          };
        }
        return c;
      }),
    }));

    examBroadcast.broadcast({
      type: 'GLOBAL_RESTART',
      timestamp: restartTime,
    });
  };

  return (
    <div className="app-layout">
      {/* Institutional Top Bar Navigation */}
      <Header
        currentView={currentView}
        onSwitchView={handleSwitchView}
        candidateName={activeCandidate?.name}
        onCandidateLogout={handleCandidateLogout}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {currentView === 'candidate' ? (
          <>
            {candidateStep === 'LOGIN' && (
              <CandidateLogin
                candidates={candidates}
                examConfig={examConfig}
                onLoginSuccess={handleCandidateLoginSuccess}
              />
            )}

            {candidateStep === 'INSTRUCTIONS' && activeCandidate && (
              <CandidateInstructions
                candidate={activeCandidate}
                examConfig={examConfig}
                questions={questions}
                onStartExam={handleStartExam}
                onBackToLogin={handleCandidateLogout}
              />
            )}

            {candidateStep === 'EXAM' && activeCandidate && (
              <ExamInterface
                candidate={activeCandidate}
                questions={questions}
                examConfig={examConfig}
                onCandidateUpdate={handleCandidateUpdate}
                onSubmitExam={handleSubmitExam}
                onRevoked={() => setCandidateStep('REVOKED')}
              />
            )}

            {candidateStep === 'COMPLETED' && activeCandidate && (
              <CompletionScreen
                candidate={activeCandidate}
                examConfig={examConfig}
                totalQuestions={questions.length}
                onLogout={handleCandidateLogout}
              />
            )}

            {candidateStep === 'REVOKED' && activeCandidate && (
              <CandidateRevoked
                candidate={activeCandidate}
                onBackToLogin={handleCandidateLogout}
              />
            )}
          </>
        ) : (
          <AdminDashboard
            candidates={candidates}
            questions={questions}
            examConfig={examConfig}
            onUpdateCandidates={handleUpdateCandidates}
            onUpdateQuestions={handleUpdateQuestions}
            onUpdateExamConfig={handleUpdateExamConfig}
            onRestartCandidate={handleRestartCandidate}
            onRevokeCandidate={handleRevokeCandidate}
            onReinstateCandidate={handleReinstateCandidate}
            onGlobalRestart={handleGlobalRestart}
            onExitAdmin={() => setCurrentView('candidate')}
          />
        )}
      </main>

      {/* Admin Access PIN Modal */}
      {showPinModal && (
        <AdminPinModal
          correctPin={examConfig.adminPin}
          onSuccess={() => {
            setIsAdminAuthenticated(true);
            setShowPinModal(false);
            setCurrentView('admin');
          }}
          onClose={() => setShowPinModal(false)}
        />
      )}
    </div>
  );
};

export default App;

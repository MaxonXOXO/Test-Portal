import React, { useState, useEffect } from 'react';
import type { Candidate, Question, ExamConfig, AppState, SyncMessage, ExamStatus } from './types';
import {
  loadAppState,
  saveAppState,
  clearLocalAppState,
  shuffleArray,
  checkAndAutoCompleteCandidates,
  calculateCandidateScore,
  DEFAULT_EXAM_CONFIG,
} from './services/storage';
import { examBroadcast } from './services/broadcast';
import {
  fetchAppStateFromSupabase,
  syncExamConfigToSupabase,
  syncQuestionsToSupabase,
  syncCandidatesToSupabase,
  upsertCandidateToSupabase,
  updateCandidateExamProgressInSupabase,
  submitCandidateInSupabase,
  clearEntireSupabaseDatabase,
  subscribeToSupabaseRealtime,
  deleteCandidateFromSupabase,
  deleteQuestionFromSupabase,
} from './services/supabase';
import { Header } from './components/common/Header';
import { CandidateLogin } from './components/candidate/CandidateLogin';
import { CandidateInstructions } from './components/candidate/CandidateInstructions';
import { ExamInterface } from './components/candidate/ExamInterface';
import { CompletionScreen } from './components/candidate/CompletionScreen';
import { CandidateRevoked } from './components/candidate/CandidateRevoked';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminPinModal } from './components/admin/AdminPinModal';

export const App: React.FC = () => {
  // Master persistent state initialized from local cache for instant render
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

  // Persist locally whenever state changes
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  // Initial remote fetch from Supabase to sync across devices & networks
  useEffect(() => {
    let isMounted = true;
    fetchAppStateFromSupabase().then((remoteState) => {
      if (isMounted && remoteState) {
        setAppState(remoteState);
        saveAppState(remoteState);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Supabase Realtime Subscription: Instant cross-network synchronization
  useEffect(() => {
    const unsubscribeRealtime = subscribeToSupabaseRealtime({
      onConfigChange: (newConfig) => {
        setAppState((prev) => ({ ...prev, examConfig: newConfig }));
      },
      onCandidateUpdate: (updatedCand) => {
        setAppState((prev) => ({
          ...prev,
          candidates: prev.candidates.map((c) => (c.id === updatedCand.id ? updatedCand : c)),
        }));
      },
      onCandidatesChange: async () => {
        const remote = await fetchAppStateFromSupabase();
        if (remote) {
          setAppState((prev) => ({ ...prev, candidates: remote.candidates }));
        }
      },
      onQuestionsChange: async () => {
        const remote = await fetchAppStateFromSupabase();
        if (remote) {
          setAppState((prev) => ({ ...prev, questions: remote.questions }));
        }
      },
    });

    return () => unsubscribeRealtime();
  }, []);

  // Subscribe to real-time BroadcastChannel updates (Multi-tab local synchronization)
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
      } else if (msg.type === 'EXAM_STATUS_CHANGE') {
        setAppState((prev) => ({
          ...prev,
          examConfig: {
            ...prev.examConfig,
            examStatus: msg.status,
            isExamLive: msg.status === 'RUNNING',
          },
        }));
      } else if (msg.type === 'DATABASE_CLEARED') {
        setAppState({
          examConfig: { ...DEFAULT_EXAM_CONFIG, examStatus: 'STOPPED', isExamLive: false },
          candidates: [],
          questions: [],
        });
        setActiveCandidateId(null);
        setCandidateStep('LOGIN');
      }
    });

    return () => unsubscribe();
  }, [activeCandidateId, candidateStep]);

  // Synchronize state across tabs via native StorageEvent
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

  // Periodic check to auto-complete candidates whose exam time has expired
  useEffect(() => {
    const checkExpirations = () => {
      setAppState((prev) => {
        const { candidates: updated, hasChanges } = checkAndAutoCompleteCandidates(
          prev.candidates,
          prev.questions,
          prev.examConfig
        );
        if (!hasChanges) return prev;

        // If active candidate expired, broadcast submit and move to COMPLETED screen
        if (activeCandidateId) {
          const activeNow = updated.find((c) => c.id === activeCandidateId);
          if (activeNow && activeNow.status === 'COMPLETED' && candidateStep === 'EXAM') {
            submitCandidateInSupabase(activeNow);
            examBroadcast.broadcast({
              type: 'CANDIDATE_SUBMIT',
              candidateId: activeNow.id,
              completedAt: activeNow.completedAt || Date.now(),
              timeTakenSeconds: activeNow.timeTakenSeconds || prev.examConfig.durationMinutes * 60,
              score: activeNow.score,
            });
            setCandidateStep('COMPLETED');
          }
        }

        return { ...prev, candidates: updated };
      });
    };

    checkExpirations();
    const interval = setInterval(checkExpirations, 2000);
    return () => clearInterval(interval);
  }, [activeCandidateId, candidateStep]);

  // Candidate login success -> Go to instructions
  const handleCandidateLoginSuccess = (cand: Candidate) => {
    setActiveCandidateId(cand.id);
    upsertCandidateToSupabase(cand);

    // Verify if time has expired
    const effectiveStart = Math.max(
      cand.startedAt || 0,
      cand.restartedAt || 0,
      examConfig.globalRestartTimestamp || 0
    );
    const durationMs = examConfig.durationMinutes * 60 * 1000;
    const isExpired = cand.status === 'IN_PROGRESS' && effectiveStart > 0 && Date.now() >= effectiveStart + durationMs;

    if (cand.status === 'COMPLETED' || isExpired) {
      if (isExpired && cand.status !== 'COMPLETED') {
        const completedCand: Candidate = {
          ...cand,
          status: 'COMPLETED',
          completedAt: cand.completedAt || (effectiveStart + durationMs),
          timeTakenSeconds: cand.timeTakenSeconds || (examConfig.durationMinutes * 60),
          score: calculateCandidateScore(cand.answers || {}, questions),
        };
        setAppState((prev) => ({
          ...prev,
          candidates: prev.candidates.map((c) => (c.id === cand.id ? completedCand : c)),
        }));
        submitCandidateInSupabase(completedCand);
      }
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

    const effectiveStart = Math.max(
      activeCandidate.startedAt || 0,
      activeCandidate.restartedAt || 0,
      examConfig.globalRestartTimestamp || 0
    );
    const durationMs = examConfig.durationMinutes * 60 * 1000;
    if (activeCandidate.status === 'IN_PROGRESS' && effectiveStart > 0 && now >= effectiveStart + durationMs) {
      const completedCand: Candidate = {
        ...activeCandidate,
        status: 'COMPLETED',
        completedAt: activeCandidate.completedAt || (effectiveStart + durationMs),
        timeTakenSeconds: activeCandidate.timeTakenSeconds || (examConfig.durationMinutes * 60),
        score: calculateCandidateScore(activeCandidate.answers || {}, questions),
      };
      setAppState((prev) => ({
        ...prev,
        candidates: prev.candidates.map((c) => (c.id === completedCand.id ? completedCand : c)),
      }));
      submitCandidateInSupabase(completedCand);
      setCandidateStep('COMPLETED');
      return;
    }

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

    upsertCandidateToSupabase(updated);
    setCandidateStep('EXAM');
  };

  // Update candidate state as answers change (Syncs live to Supabase & BroadcastChannel)
  const handleCandidateUpdate = (updated: Candidate) => {
    setAppState((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) => (c.id === updated.id ? updated : c)),
    }));

    updateCandidateExamProgressInSupabase(
      updated.id,
      updated.answers || {},
      updated.currentQuestionIndex || 0
    );
  };

  // Candidate finishes exam (Auto or Manual)
  const handleSubmitExam = (finalCandidate: Candidate) => {
    setAppState((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) => (c.id === finalCandidate.id ? finalCandidate : c)),
    }));

    submitCandidateInSupabase(finalCandidate);

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
    syncCandidatesToSupabase(newCandidates);
  };

  // Admin Actions: Delete Candidate
  const handleDeleteCandidate = (candidateId: string) => {
    const updated = candidates.filter((c) => c.id !== candidateId);
    setAppState((prev) => ({
      ...prev,
      candidates: updated,
    }));
    deleteCandidateFromSupabase(candidateId);
  };

  // Admin Actions: Update Questions Bank
  const handleUpdateQuestions = (newQuestions: Question[]) => {
    setAppState((prev) => ({
      ...prev,
      questions: newQuestions,
    }));
    syncQuestionsToSupabase(newQuestions);
  };

  // Admin Actions: Delete Question
  const handleDeleteQuestion = (questionId: string) => {
    const updated = questions.filter((q) => q.id !== questionId);
    setAppState((prev) => ({
      ...prev,
      questions: updated,
    }));
    deleteQuestionFromSupabase(questionId);
  };

  // Admin Actions: Update Exam Config
  const handleUpdateExamConfig = (newConfig: ExamConfig) => {
    setAppState((prev) => ({
      ...prev,
      examConfig: newConfig,
    }));
    syncExamConfigToSupabase(newConfig);
  };

  // Admin Actions: Change Status (Play = RUNNING, Pause = PAUSED, Stop = STOPPED)
  const handleStatusChange = (newStatus: ExamStatus) => {
    const updatedConfig: ExamConfig = {
      ...examConfig,
      examStatus: newStatus,
      isExamLive: newStatus === 'RUNNING',
    };
    setAppState((prev) => ({
      ...prev,
      examConfig: updatedConfig,
    }));
    syncExamConfigToSupabase(updatedConfig);
    examBroadcast.broadcast({
      type: 'EXAM_STATUS_CHANGE',
      status: newStatus,
    });
  };

  // Admin Action: Restart for specific person
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

    upsertCandidateToSupabase(updated);

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
    const updatedCandidates = candidates.map((c) =>
      c.id === candidateId ? { ...c, status: 'REVOKED' as const, revokedAt: Date.now() } : c
    );
    setAppState((prev) => ({
      ...prev,
      candidates: updatedCandidates,
    }));

    const target = updatedCandidates.find((c) => c.id === candidateId);
    if (target) upsertCandidateToSupabase(target);

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
    const updatedCandidates = candidates.map((c) =>
      c.id === candidateId ? { ...c, status: 'IN_PROGRESS' as const, revokedAt: null } : c
    );
    setAppState((prev) => ({
      ...prev,
      candidates: updatedCandidates,
    }));

    const target = updatedCandidates.find((c) => c.id === candidateId);
    if (target) upsertCandidateToSupabase(target);

    examBroadcast.broadcast({
      type: 'REINSTATE_CANDIDATE',
      candidateId,
    });

    if (activeCandidateId === candidateId) {
      setCandidateStep('EXAM');
    }
  };

  // Admin Action: Global Restart
  const handleGlobalRestart = () => {
    const restartTime = Date.now();
    const updatedConfig: ExamConfig = {
      ...examConfig,
      globalRestartTimestamp: restartTime,
    };
    const updatedCandidates = candidates.map((c) => {
      if (c.status === 'IN_PROGRESS' || c.status === 'COMPLETED') {
        return {
          ...c,
          status: 'IN_PROGRESS' as const,
          restartedAt: restartTime,
          completedAt: null,
          timeTakenSeconds: null,
        };
      }
      return c;
    });

    setAppState({
      examConfig: updatedConfig,
      candidates: updatedCandidates,
      questions,
    });

    syncExamConfigToSupabase(updatedConfig);
    syncCandidatesToSupabase(updatedCandidates);

    examBroadcast.broadcast({
      type: 'GLOBAL_RESTART',
      timestamp: restartTime,
    });
  };

  // Admin Action: Clear / Flush Entire Supabase Database
  const handleClearDatabase = async () => {
    await clearEntireSupabaseDatabase();
    clearLocalAppState();

    const resetState: AppState = {
      examConfig: {
        ...DEFAULT_EXAM_CONFIG,
        examStatus: 'STOPPED',
        isExamLive: false,
      },
      candidates: [],
      questions: [],
    };

    setAppState(resetState);
    setActiveCandidateId(null);
    setCandidateStep('LOGIN');

    examBroadcast.broadcast({ type: 'DATABASE_CLEARED' });
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
            onDeleteCandidate={handleDeleteCandidate}
            onDeleteQuestion={handleDeleteQuestion}
            onUpdateExamConfig={handleUpdateExamConfig}
            onRestartCandidate={handleRestartCandidate}
            onRevokeCandidate={handleRevokeCandidate}
            onReinstateCandidate={handleReinstateCandidate}
            onGlobalRestart={handleGlobalRestart}
            onStatusChange={handleStatusChange}
            onClearDatabase={handleClearDatabase}
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

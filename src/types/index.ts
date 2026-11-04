export type CandidateStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REVOKED';

export type ExamStatus = 'RUNNING' | 'PAUSED' | 'STOPPED';

export interface Candidate {
  id: string;
  applicationNumber?: string;
  phone: string;
  name: string;
  rollNo?: string;
  department?: string;
  status: CandidateStatus;
  startedAt: number | null; // epoch ms
  completedAt: number | null; // epoch ms
  timeTakenSeconds: number | null;
  answers: Record<string, string>; // questionId -> selected option ('A' | 'B' | 'C' | 'D')
  score: number;
  currentQuestionIndex: number;
  shuffledQuestionIds?: string[];
  restartedAt?: number | null;
  revokedAt?: number | null;
}

export interface Question {
  id: string;
  question: string;
  options: [string, string, string, string]; // [A, B, C, D]
  correctOption: 'A' | 'B' | 'C' | 'D';
  marks: number;
}

export interface ExamConfig {
  title: string;
  instituteName: string;
  instituteSubtitle: string;
  commonPassword: string;
  durationMinutes: number;
  isExamLive: boolean;
  examStatus: ExamStatus; // 'RUNNING' | 'PAUSED' | 'STOPPED'
  globalRestartTimestamp: number | null;
  randomizeQuestions: boolean;
  autoSubmitOnTimeUp: boolean;
  adminPin: string;
  applicationNumberPrefix: string; // e.g. "CARMEL"
}

export interface AppState {
  examConfig: ExamConfig;
  candidates: Candidate[];
  questions: Question[];
}

export type SyncMessage =
  | { type: 'STATE_UPDATED'; payload: AppState }
  | { type: 'RESTART_CANDIDATE'; candidateId: string; timestamp: number }
  | { type: 'REVOKE_CANDIDATE'; candidateId: string }
  | { type: 'REINSTATE_CANDIDATE'; candidateId: string }
  | { type: 'GLOBAL_RESTART'; timestamp: number }
  | { type: 'CANDIDATE_PROGRESS'; candidateId: string; answers: Record<string, string>; currentQuestionIndex: number }
  | { type: 'CANDIDATE_SUBMIT'; candidateId: string; completedAt: number; timeTakenSeconds: number; score: number }
  | { type: 'EXAM_STATUS_CHANGE'; status: ExamStatus }
  | { type: 'DATABASE_CLEARED' };

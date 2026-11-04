import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Candidate, Question, ExamConfig, AppState, ExamStatus } from '../types';
import { DEFAULT_EXAM_CONFIG, INITIAL_CANDIDATES, INITIAL_QUESTIONS } from './storage';

const LOCAL_STORAGE_URL_KEY = 'carmel_supabase_url';
const LOCAL_STORAGE_KEY_KEY = 'carmel_supabase_anon_key';

let cachedClient: SupabaseClient | null = null;
let currentConfiguredUrl = '';
let currentConfiguredKey = '';

// Retrieve credentials from Vite env or localStorage override
export function getSupabaseCredentials(): { url: string; key: string; source: 'env' | 'custom' | 'none' } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (envUrl && envKey) {
    return { url: envUrl, key: envKey, source: 'env' };
  }

  const customUrl = (localStorage.getItem(LOCAL_STORAGE_URL_KEY) || '').trim();
  const customKey = (localStorage.getItem(LOCAL_STORAGE_KEY_KEY) || '').trim();

  if (customUrl && customKey) {
    return { url: customUrl, key: customKey, source: 'custom' };
  }

  return { url: '', key: '', source: 'none' };
}

export function isSupabaseConfigured(): boolean {
  const creds = getSupabaseCredentials();
  return Boolean(creds.url && creds.key);
}

export function saveCustomSupabaseCredentials(url: string, key: string): void {
  if (url && key) {
    localStorage.setItem(LOCAL_STORAGE_URL_KEY, url.trim());
    localStorage.setItem(LOCAL_STORAGE_KEY_KEY, key.trim());
  } else {
    localStorage.removeItem(LOCAL_STORAGE_URL_KEY);
    localStorage.removeItem(LOCAL_STORAGE_KEY_KEY);
  }
  cachedClient = null;
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return null;

  if (!cachedClient || currentConfiguredUrl !== url || currentConfiguredKey !== key) {
    currentConfiguredUrl = url;
    currentConfiguredKey = key;
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cachedClient;
}

// Quick connection tester
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase credentials not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
    };
  }

  try {
    const { error } = await client.from('exam_config').select('id').limit(1);
    if (error) {
      return { success: false, message: `Supabase query error: ${error.message} (Code: ${error.code})` };
    }
    return { success: true, message: 'Successfully connected to Supabase database!' };
  } catch (err: any) {
    return { success: false, message: `Connection failed: ${err.message || String(err)}` };
  }
}

// ==================== MAPPERS ====================

function toDbCandidate(c: Candidate) {
  return {
    id: c.id,
    application_number: c.applicationNumber || null,
    phone: c.phone,
    name: c.name,
    roll_no: c.rollNo || null,
    department: c.department || null,
    status: c.status,
    started_at: c.startedAt,
    completed_at: c.completedAt,
    time_taken_seconds: c.timeTakenSeconds,
    answers: c.answers || {},
    score: c.score || 0,
    current_question_index: c.currentQuestionIndex || 0,
    shuffled_question_ids: c.shuffledQuestionIds || [],
    restarted_at: c.restartedAt || null,
    revoked_at: c.revokedAt || null,
    updated_at: new Date().toISOString(),
  };
}

function fromDbCandidate(r: any): Candidate {
  return {
    id: String(r.id),
    applicationNumber: r.application_number || '',
    phone: String(r.phone),
    name: String(r.name),
    rollNo: r.roll_no || undefined,
    department: r.department || undefined,
    status: r.status,
    startedAt: r.started_at ? Number(r.started_at) : null,
    completedAt: r.completed_at ? Number(r.completed_at) : null,
    timeTakenSeconds: r.time_taken_seconds !== null && r.time_taken_seconds !== undefined ? Number(r.time_taken_seconds) : null,
    answers: (r.answers as Record<string, string>) || {},
    score: Number(r.score) || 0,
    currentQuestionIndex: Number(r.current_question_index) || 0,
    shuffledQuestionIds: (r.shuffled_question_ids as string[]) || [],
    restartedAt: r.restarted_at ? Number(r.restarted_at) : null,
    revokedAt: r.revoked_at ? Number(r.revoked_at) : null,
  };
}

function toDbQuestion(q: Question) {
  return {
    id: q.id,
    question: q.question,
    options: q.options,
    correct_option: q.correctOption,
    marks: q.marks || 1,
  };
}

function fromDbQuestion(r: any): Question {
  return {
    id: String(r.id),
    question: String(r.question),
    options: (r.options as [string, string, string, string]) || ['', '', '', ''],
    correctOption: (r.correct_option as 'A' | 'B' | 'C' | 'D') || 'A',
    marks: Number(r.marks) || 1,
  };
}

function toDbConfig(c: ExamConfig) {
  return {
    id: 'default_config',
    title: c.title,
    institute_name: c.instituteName,
    institute_subtitle: c.instituteSubtitle,
    common_password: c.commonPassword,
    duration_minutes: c.durationMinutes,
    is_exam_live: c.isExamLive,
    exam_status: c.examStatus || (c.isExamLive ? 'RUNNING' : 'PAUSED'),
    global_restart_timestamp: c.globalRestartTimestamp || null,
    randomize_questions: c.randomizeQuestions,
    auto_submit_on_time_up: c.autoSubmitOnTimeUp,
    admin_pin: c.adminPin,
    app_number_prefix: c.applicationNumberPrefix || 'CARMEL',
    updated_at: new Date().toISOString(),
  };
}

function fromDbConfig(r: any): ExamConfig {
  const isLive = Boolean(r.is_exam_live);
  const status: ExamStatus = (r.exam_status as ExamStatus) || (isLive ? 'RUNNING' : 'PAUSED');

  return {
    title: r.title || DEFAULT_EXAM_CONFIG.title,
    instituteName: r.institute_name || DEFAULT_EXAM_CONFIG.instituteName,
    instituteSubtitle: r.institute_subtitle || DEFAULT_EXAM_CONFIG.instituteSubtitle,
    commonPassword: r.common_password || DEFAULT_EXAM_CONFIG.commonPassword,
    durationMinutes: Number(r.duration_minutes) || DEFAULT_EXAM_CONFIG.durationMinutes,
    isExamLive: status === 'RUNNING',
    examStatus: status,
    globalRestartTimestamp: r.global_restart_timestamp ? Number(r.global_restart_timestamp) : null,
    randomizeQuestions: r.randomize_questions !== undefined ? Boolean(r.randomize_questions) : true,
    autoSubmitOnTimeUp: r.auto_submit_on_time_up !== undefined ? Boolean(r.auto_submit_on_time_up) : true,
    adminPin: r.admin_pin || DEFAULT_EXAM_CONFIG.adminPin,
    applicationNumberPrefix: r.app_number_prefix || 'CARMEL',
  };
}

// ==================== SUPABASE DB OPERATIONS ====================

// Fetch Full App State from Supabase
export async function fetchAppStateFromSupabase(): Promise<AppState | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // 1. Fetch config
    const { data: configRows, error: configErr } = await client
      .from('exam_config')
      .select('*')
      .eq('id', 'default_config')
      .maybeSingle();

    if (configErr) {
      console.warn('Failed to load exam_config from Supabase:', configErr.message);
      return null;
    }

    let examConfig: ExamConfig;
    if (configRows) {
      examConfig = fromDbConfig(configRows);
    } else {
      // Seed default config into Supabase
      examConfig = { ...DEFAULT_EXAM_CONFIG };
      await client.from('exam_config').upsert(toDbConfig(examConfig));
    }

    // 2. Fetch questions
    const { data: qRows, error: qErr } = await client
      .from('questions')
      .select('*')
      .order('id', { ascending: true });

    if (qErr) {
      console.warn('Failed to load questions from Supabase:', qErr.message);
      return null;
    }

    let questions: Question[];
    if (qRows && qRows.length > 0) {
      questions = qRows.map(fromDbQuestion);
    } else {
      // Seed default questions if empty
      questions = INITIAL_QUESTIONS;
      const dbQs = questions.map(toDbQuestion);
      await client.from('questions').upsert(dbQs);
    }

    // 3. Fetch candidates
    const { data: cRows, error: cErr } = await client
      .from('candidates')
      .select('*')
      .order('name', { ascending: true });

    if (cErr) {
      console.warn('Failed to load candidates from Supabase:', cErr.message);
      return null;
    }

    let candidates: Candidate[];
    if (cRows && cRows.length > 0) {
      candidates = cRows.map(fromDbCandidate);
    } else {
      // Seed initial candidates if empty
      candidates = INITIAL_CANDIDATES;
      const dbCands = candidates.map(toDbCandidate);
      await client.from('candidates').upsert(dbCands);
    }

    return {
      examConfig,
      questions,
      candidates,
    };
  } catch (err) {
    console.error('Error fetching state from Supabase:', err);
    return null;
  }
}

// Sync Exam Config to Supabase
export async function syncExamConfigToSupabase(config: ExamConfig): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('exam_config').upsert(toDbConfig(config));
    if (error) {
      console.error('Failed to sync exam_config to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving exam_config to Supabase:', err);
    return false;
  }
}

// Sync entire Questions bank to Supabase
export async function syncQuestionsToSupabase(questions: Question[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    // Delete removed questions and upsert current
    if (questions.length === 0) {
      await client.from('questions').delete().neq('id', '___non_existent___');
      return true;
    }

    const ids = questions.map((q) => q.id);
    await client.from('questions').delete().not('id', 'in', `(${ids.map((id) => `"${id}"`).join(',')})`);

    const dbRows = questions.map(toDbQuestion);
    const { error } = await client.from('questions').upsert(dbRows);
    if (error) {
      console.error('Failed to upsert questions to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving questions to Supabase:', err);
    return false;
  }
}

// Sync Candidates to Supabase
export async function syncCandidatesToSupabase(candidates: Candidate[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    if (candidates.length === 0) {
      await client.from('candidates').delete().neq('id', '___non_existent___');
      return true;
    }

    const ids = candidates.map((c) => c.id);
    await client.from('candidates').delete().not('id', 'in', `(${ids.map((id) => `"${id}"`).join(',')})`);

    const dbRows = candidates.map(toDbCandidate);
    const { error } = await client.from('candidates').upsert(dbRows);
    if (error) {
      console.error('Failed to upsert candidates to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving candidates to Supabase:', err);
    return false;
  }
}

// Save or Update a single candidate
export async function upsertCandidateToSupabase(candidate: Candidate): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('candidates').upsert(toDbCandidate(candidate));
    if (error) {
      console.error('Failed to upsert single candidate:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error upserting candidate to Supabase:', err);
    return false;
  }
}

// Update candidate progress (live answers & question index)
export async function updateCandidateExamProgressInSupabase(
  candidateId: string,
  answers: Record<string, string>,
  currentQuestionIndex: number
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('candidates')
      .update({
        answers,
        current_question_index: currentQuestionIndex,
        status: 'IN_PROGRESS',
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidateId);

    if (error) {
      console.error('Failed to update progress in Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error updating progress in Supabase:', err);
    return false;
  }
}

// Submit candidate exam in Supabase
export async function submitCandidateInSupabase(candidate: Candidate): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('candidates')
      .update({
        status: 'COMPLETED',
        completed_at: candidate.completedAt || Date.now(),
        time_taken_seconds: candidate.timeTakenSeconds,
        answers: candidate.answers || {},
        score: candidate.score,
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidate.id);

    if (error) {
      console.error('Failed to submit candidate exam in Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error submitting candidate exam in Supabase:', err);
    return false;
  }
}

// ==================== GLOBAL FLUSH / WIPE ====================

// Wipe and flush everything from Supabase database
export async function clearEntireSupabaseDatabase(): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    // 1. Delete all candidates
    const { error: cErr } = await client.from('candidates').delete().neq('id', '___all___');
    if (cErr) console.warn('Error clearing candidates from Supabase:', cErr.message);

    // 2. Delete all questions
    const { error: qErr } = await client.from('questions').delete().neq('id', '___all___');
    if (qErr) console.warn('Error clearing questions from Supabase:', qErr.message);

    // 3. Reset exam config to pristine default
    const resetConfig: ExamConfig = {
      ...DEFAULT_EXAM_CONFIG,
      examStatus: 'STOPPED',
      isExamLive: false,
      globalRestartTimestamp: null,
    };
    await client.from('exam_config').upsert(toDbConfig(resetConfig));

    return true;
  } catch (err) {
    console.error('Failed to flush Supabase database:', err);
    return false;
  }
}

// ==================== SUPABASE REALTIME ====================

export function subscribeToSupabaseRealtime(callbacks: {
  onConfigChange?: (config: ExamConfig) => void;
  onCandidatesChange?: () => void;
  onCandidateUpdate?: (candidate: Candidate) => void;
  onQuestionsChange?: () => void;
}): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel('public:portal_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'exam_config' },
      (payload) => {
        if (payload.new && callbacks.onConfigChange) {
          callbacks.onConfigChange(fromDbConfig(payload.new));
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'questions' },
      () => {
        if (callbacks.onQuestionsChange) {
          callbacks.onQuestionsChange();
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'candidates' },
      (payload) => {
        if (payload.new && callbacks.onCandidateUpdate) {
          callbacks.onCandidateUpdate(fromDbCandidate(payload.new));
        }
        if (callbacks.onCandidatesChange) {
          callbacks.onCandidatesChange();
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'candidates' },
      () => {
        if (callbacks.onCandidatesChange) callbacks.onCandidatesChange();
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'candidates' },
      () => {
        if (callbacks.onCandidatesChange) callbacks.onCandidatesChange();
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}


import * as XLSX from 'xlsx';
import type { Candidate, Question, ExamConfig, AppState } from '../types';

export const DEFAULT_EXAM_CONFIG: ExamConfig = {
  title: 'Carmel Technical Assessment & Aptitude Test 2026',
  instituteName: 'CARMEL POLYTECHNIC COLLEGE PUNNAPRA',
  instituteSubtitle: 'Govt. Aided Technical Institution | Punnapra, Alappuzha - 688004',
  commonPassword: 'CARMEL2026',
  durationMinutes: 30,
  isExamLive: true,
  examStatus: 'RUNNING',
  globalRestartTimestamp: null,
  randomizeQuestions: true,
  autoSubmitOnTimeUp: true,
  adminPin: 'admin@carmelpoly.in',
  applicationNumberPrefix: 'CARMEL',
};

// Start completely empty so deleted questions/candidates never resurrect
export const INITIAL_QUESTIONS: Question[] = [];
export const INITIAL_CANDIDATES: Candidate[] = [];

const STORAGE_KEY = 'carmel_polytechnic_portal_v1';

// Candidate Application Number helper with configurable prefix (e.g. "CARMEL - 1")
export function getCandidateAppNo(
  candidate: Candidate,
  fallbackIndex?: number,
  prefix: string = 'CARMEL'
): string {
  if (candidate.applicationNumber && candidate.applicationNumber.trim()) {
    return candidate.applicationNumber.trim();
  }
  if (candidate.rollNo && candidate.rollNo.trim()) {
    return candidate.rollNo.trim();
  }
  const cleanPrefix = (prefix || 'CARMEL').trim() || 'CARMEL';
  if (fallbackIndex !== undefined) {
    return `${cleanPrefix} - ${fallbackIndex + 1}`;
  }
  if (candidate.phone) {
    return `${cleanPrefix} - ${candidate.phone.slice(-6)}`;
  }
  return `${cleanPrefix} - 1`;
}

// Automatically check and complete candidates whose exam time has expired
export function checkAndAutoCompleteCandidates(
  candidates: Candidate[],
  questions: Question[],
  examConfig: ExamConfig
): { candidates: Candidate[]; hasChanges: boolean } {
  let hasChanges = false;
  const durationMs = examConfig.durationMinutes * 60 * 1000;
  const now = Date.now();
  const prefix = examConfig.applicationNumberPrefix || 'CARMEL';

  const updatedCandidates = candidates.map((cand, idx) => {
    const appNo = cand.applicationNumber || getCandidateAppNo(cand, idx, prefix);
    const withAppNo: Candidate = cand.applicationNumber ? cand : { ...cand, applicationNumber: appNo };

    if (cand.status !== 'IN_PROGRESS') {
      return withAppNo;
    }

    const effectiveStart = Math.max(
      cand.startedAt || 0,
      cand.restartedAt || 0,
      examConfig.globalRestartTimestamp || 0
    );

    if (effectiveStart > 0 && now >= effectiveStart + durationMs) {
      hasChanges = true;
      const score = calculateCandidateScore(cand.answers || {}, questions);
      const totalDurationSeconds = examConfig.durationMinutes * 60;
      return {
        ...withAppNo,
        status: 'COMPLETED' as const,
        completedAt: cand.completedAt || (effectiveStart + durationMs),
        timeTakenSeconds: cand.timeTakenSeconds || totalDurationSeconds,
        score,
      };
    }

    return withAppNo;
  });

  return { candidates: updatedCandidates, hasChanges };
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const examConfig: ExamConfig = { ...DEFAULT_EXAM_CONFIG, ...parsed.examConfig };
      if (examConfig.adminPin === '1234') {
        examConfig.adminPin = 'admin@carmelpoly.in';
      }
      if (!examConfig.applicationNumberPrefix) {
        examConfig.applicationNumberPrefix = 'CARMEL';
      }
      if (!examConfig.examStatus) {
        examConfig.examStatus = examConfig.isExamLive ? 'RUNNING' : 'PAUSED';
      }

      // If candidates or questions was saved as an empty array [], preserve [] without reverting
      const rawCandidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
      const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

      const { candidates } = checkAndAutoCompleteCandidates(rawCandidates, questions, examConfig);

      return {
        examConfig,
        candidates,
        questions,
      };
    }
  } catch (err) {
    console.error('Failed to parse stored portal state:', err);
  }

  return {
    examConfig: DEFAULT_EXAM_CONFIG,
    candidates: [],
    questions: [],
  };
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save portal state to localStorage:', err);
  }
}

export function clearLocalAppState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear local app state:', err);
  }
}

// Utility: Shuffle an array deterministically or randomly
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Normalize phone number (strip spaces, symbols, international code prefix if 10 digits)
export function normalizePhone(phone: string | number): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
}

// Safe native Excel file download without opening blank browser tabs
export function downloadExcelWorkbook(workbook: XLSX.WorkBook, filename: string): void {
  try {
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    }, 200);
  } catch (err) {
    console.error('Error generating Excel file download:', err);
  }
}

// ==================== EXCEL IMPORT & EXPORT ====================

// Download Candidate Sample Template
export function downloadCandidateTemplate(prefix: string = 'CARMEL'): void {
  const cleanPrefix = (prefix || 'CARMEL').trim() || 'CARMEL';
  const sampleData = [
    {
      'Application Number': `${cleanPrefix} - 1`,
      'Candidate Name': 'Rahul Krishnan',
      'Phone Number': '9876543210',
    },
    {
      'Application Number': `${cleanPrefix} - 2`,
      'Candidate Name': 'Fathima Noor',
      'Phone Number': '9876543211',
    },
    {
      'Application Number': `${cleanPrefix} - 3`,
      'Candidate Name': 'Albin Joseph',
      'Phone Number': '9876543212',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates');
  downloadExcelWorkbook(workbook, 'Carmel_Candidates_Template.xlsx');
}

// Download Question Sample Template
export function downloadQuestionTemplate(): void {
  const sampleData = [
    {
      Question: 'Which is the SI unit of electric current?',
      'Option A': 'Volt',
      'Option B': 'Ampere',
      'Option C': 'Watt',
      'Option D': 'Ohm',
      'Correct Answer': 'B',
      Marks: 1,
    },
    {
      Question: 'The ratio of lateral strain to longitudinal strain is known as:',
      'Option A': 'Poisson ratio',
      'Option B': 'Bulk modulus',
      'Option C': 'Modulus of rigidity',
      'Option D': 'Young modulus',
      'Correct Answer': 'A',
      Marks: 1,
    },
    {
      Question: 'Which gas is most abundant in the Earth atmosphere?',
      'Option A': 'Oxygen',
      'Option B': 'Carbon dioxide',
      'Option C': 'Nitrogen',
      'Option D': 'Argon',
      'Correct Answer': 'C',
      Marks: 1,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
  downloadExcelWorkbook(workbook, 'Carmel_Questions_Template.xlsx');
}

// Parse Candidate Excel File with configurable Application Number Prefix
export async function parseCandidateExcel(
  file: File,
  prefix: string = 'CARMEL',
  existingCount: number = 0
): Promise<Candidate[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

  const candidates: Candidate[] = [];
  const cleanPrefix = (prefix || 'CARMEL').trim() || 'CARMEL';

  rows.forEach((row, idx) => {
    const phoneRaw =
      row['Phone Number'] || row['Phone'] || row['phone'] || row['Mobile'] || row['Contact'] || Object.values(row)[0];
    const nameRaw =
      row['Candidate Name'] || row['Name'] || row['name'] || Object.values(row)[1];

    const appNoRaw =
      row['Application Number'] ||
      row['Application No'] ||
      row['Application No.'] ||
      row['Application number'] ||
      row['application_number'] ||
      row['App No'] ||
      row['Roll No'] ||
      row['Roll Number'] ||
      row['Reg No'] ||
      row['Register Number'];

    const phone = normalizePhone(phoneRaw);
    const name = String(nameRaw).trim();

    // If application number is provided in excel, use that; otherwise auto-number with prefix
    const applicationNumber =
      appNoRaw && String(appNoRaw).trim()
        ? String(appNoRaw).trim()
        : `${cleanPrefix} - ${existingCount + idx + 1}`;

    if (phone && name) {
      candidates.push({
        id: `cand_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        applicationNumber,
        phone,
        name,
        status: 'NOT_STARTED',
        startedAt: null,
        completedAt: null,
        timeTakenSeconds: null,
        answers: {},
        score: 0,
        currentQuestionIndex: 0,
      });
    }
  });

  return candidates;
}

// Parse Questions Excel File
export async function parseQuestionExcel(file: File): Promise<Question[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

  const questions: Question[] = [];

  rows.forEach((row, idx) => {
    const qText = row['Question'] || row['question'] || row['Question Text'] || '';
    const optA = row['Option A'] || row['OptionA'] || row['A'] || row['Option 1'] || '';
    const optB = row['Option B'] || row['OptionB'] || row['B'] || row['Option 2'] || '';
    const optC = row['Option C'] || row['OptionC'] || row['C'] || row['Option 3'] || '';
    const optD = row['Option D'] || row['OptionD'] || row['D'] || row['Option 4'] || '';
    const correctRaw = String(row['Correct Answer'] || row['Answer'] || row['Correct'] || row['Key'] || 'A')
      .toUpperCase()
      .trim();

    let correctOption: 'A' | 'B' | 'C' | 'D' = 'A';
    if (['A', 'B', 'C', 'D'].includes(correctRaw)) {
      correctOption = correctRaw as 'A' | 'B' | 'C' | 'D';
    } else if (correctRaw === '1') correctOption = 'A';
    else if (correctRaw === '2') correctOption = 'B';
    else if (correctRaw === '3') correctOption = 'C';
    else if (correctRaw === '4') correctOption = 'D';

    const marksRaw = Number(row['Marks'] || row['marks'] || 1);
    const marks = isNaN(marksRaw) || marksRaw <= 0 ? 1 : marksRaw;

    if (qText && optA && optB && optC && optD) {
      questions.push({
        id: `q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        question: String(qText).trim(),
        options: [String(optA).trim(), String(optB).trim(), String(optC).trim(), String(optD).trim()],
        correctOption,
        marks,
      });
    }
  });

  return questions;
}

// Export Candidate Roster Excel (clean download, no extra tabs)
export function exportCandidateRosterExcel(candidates: Candidate[], prefix: string = 'CARMEL'): void {
  const exportData = candidates.map((c, idx) => ({
    'Sl No': idx + 1,
    'Application Number': c.applicationNumber || getCandidateAppNo(c, idx, prefix),
    'Candidate Name': c.name,
    'Mobile Phone': c.phone,
    Status: c.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates Roster');
  const filename = `Carmel_Candidates_Roster_${new Date().toISOString().slice(0, 10)}.xlsx`;
  downloadExcelWorkbook(workbook, filename);
}

// Export Results to Excel (clean download, no extra tabs)
export function exportResultsExcel(candidates: Candidate[], questions: Question[], config: ExamConfig): void {
  const { candidates: resolvedCandidates } = checkAndAutoCompleteCandidates(candidates, questions, config);
  const totalPossibleScore = questions.reduce((sum, q) => sum + q.marks, 0);
  const prefix = config.applicationNumberPrefix || 'CARMEL';

  const exportData = resolvedCandidates.map((cand, index) => {
    const answeredCount = Object.keys(cand.answers || {}).length;
    const timeTakenFormatted = cand.timeTakenSeconds
      ? `${Math.floor(cand.timeTakenSeconds / 60)}m ${cand.timeTakenSeconds % 60}s`
      : 'N/A';

    const percentage = totalPossibleScore > 0 ? ((cand.score / totalPossibleScore) * 100).toFixed(1) + '%' : '0%';

    return {
      'Sl No': index + 1,
      'Application Number': cand.applicationNumber || getCandidateAppNo(cand, index, prefix),
      'Candidate Name': cand.name,
      'Phone Number': cand.phone,
      'Exam Status': cand.status,
      'Questions Attempted': `${answeredCount} / ${questions.length}`,
      Score: cand.score,
      'Total Marks': totalPossibleScore,
      Percentage: percentage,
      'Time Started': cand.startedAt ? new Date(cand.startedAt).toLocaleTimeString() : 'N/A',
      'Completion Time': cand.completedAt ? new Date(cand.completedAt).toLocaleTimeString() : 'N/A',
      'Duration Taken': timeTakenFormatted,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Exam Results');
  const filename = `Carmel_Polytechnic_Results_${new Date().toISOString().slice(0, 10)}.xlsx`;
  downloadExcelWorkbook(workbook, filename);
}

// Calculate candidate score
export function calculateCandidateScore(answers: Record<string, string>, questions: Question[]): number {
  let score = 0;
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  for (const [qId, selectedOption] of Object.entries(answers)) {
    const q = questionMap.get(qId);
    if (q && q.correctOption === selectedOption) {
      score += q.marks;
    }
  }

  return score;
}

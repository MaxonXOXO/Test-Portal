import * as XLSX from 'xlsx';
import type { Candidate, Question, ExamConfig, AppState } from '../types';

export const DEFAULT_EXAM_CONFIG: ExamConfig = {
  title: 'Carmel Technical Assessment & Aptitude Test 2026',
  instituteName: 'CARMEL POLYTECHNIC COLLEGE PUNNAPRA',
  instituteSubtitle: 'Govt. Aided Technical Institution | Punnapra, Alappuzha - 688004',
  commonPassword: 'CARMEL2026',
  durationMinutes: 30,
  isExamLive: true,
  globalRestartTimestamp: null,
  randomizeQuestions: true,
  autoSubmitOnTimeUp: true,
  adminPin: '1234',
};

export const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'q1',
    question: 'Which of the following materials has the highest thermal conductivity at room temperature?',
    options: ['Diamond', 'Silver', 'Copper', 'Aluminium'],
    correctOption: 'A',
    marks: 1,
  },
  {
    id: 'q2',
    question: 'In an electric circuit, Ohm’s law is expressed mathematically as:',
    options: ['V = I / R', 'V = I × R', 'I = V × R', 'P = V × I'],
    correctOption: 'B',
    marks: 1,
  },
  {
    id: 'q3',
    question: 'Which unit is used to measure the moment of inertia in the SI system?',
    options: ['kg·m', 'kg·m²', 'N·m', 'kg/m²'],
    correctOption: 'B',
    marks: 1,
  },
  {
    id: 'q4',
    question: 'What is the primary function of a capacitor in a DC filter circuit?',
    options: ['Amplify signals', 'Block DC and allow AC ripple to pass', 'Store and smooth out voltage ripples', 'Convert DC to AC'],
    correctOption: 'C',
    marks: 1,
  },
  {
    id: 'q5',
    question: 'Which thermodynamic cycle is the standard idealized cycle for modern spark-ignition internal combustion engines?',
    options: ['Diesel cycle', 'Rankine cycle', 'Otto cycle', 'Brayton cycle'],
    correctOption: 'C',
    marks: 1,
  },
  {
    id: 'q6',
    question: 'In computer programming and networking, what does the abbreviation "IP" stand for?',
    options: ['Interface Protocol', 'Internet Protocol', 'Internal Packet', 'Integrated Provider'],
    correctOption: 'B',
    marks: 1,
  },
  {
    id: 'q7',
    question: 'What is the bending moment at the free end of a cantilever beam carrying a uniformly distributed load?',
    options: ['Maximum', 'Zero', 'WL / 2', 'WL² / 2'],
    correctOption: 'B',
    marks: 1,
  },
  {
    id: 'q8',
    question: 'Which semiconductor device acts as a one-way valve for electric current?',
    options: ['Resistor', 'Inductor', 'Diode', 'Transformer'],
    correctOption: 'C',
    marks: 1,
  },
  {
    id: 'q9',
    question: 'If a car travels 120 km at 60 km/h and returns at 40 km/h, what is the average speed for the entire round trip?',
    options: ['50 km/h', '48 km/h', '52 km/h', '45 km/h'],
    correctOption: 'B',
    marks: 1,
  },
  {
    id: 'q10',
    question: 'Which instrument is specifically designed to measure fluid flow velocity in an open pipe or channel?',
    options: ['Pitot tube', 'Manometer', 'Barometer', 'Hygrometer'],
    correctOption: 'A',
    marks: 1,
  },
];

export const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: 'c1',
    phone: '9876543210',
    name: 'Abhishek Rajesh',
    status: 'NOT_STARTED',
    startedAt: null,
    completedAt: null,
    timeTakenSeconds: null,
    answers: {},
    score: 0,
    currentQuestionIndex: 0,
  },
  {
    id: 'c2',
    phone: '9876543211',
    name: 'Ananya S. Kumar',
    status: 'NOT_STARTED',
    startedAt: null,
    completedAt: null,
    timeTakenSeconds: null,
    answers: {},
    score: 0,
    currentQuestionIndex: 0,
  },
  {
    id: 'c3',
    phone: '9876543212',
    name: 'Midhun Varghese',
    status: 'NOT_STARTED',
    startedAt: null,
    completedAt: null,
    timeTakenSeconds: null,
    answers: {},
    score: 0,
    currentQuestionIndex: 0,
  },
  {
    id: 'c4',
    phone: '9876543213',
    name: 'Sneha Mariam Roy',
    status: 'NOT_STARTED',
    startedAt: null,
    completedAt: null,
    timeTakenSeconds: null,
    answers: {},
    score: 0,
    currentQuestionIndex: 0,
  },
  {
    id: 'c5',
    phone: '9876543214',
    name: 'Rohit K. Nair',
    status: 'NOT_STARTED',
    startedAt: null,
    completedAt: null,
    timeTakenSeconds: null,
    answers: {},
    score: 0,
    currentQuestionIndex: 0,
  },
];

const STORAGE_KEY = 'carmel_polytechnic_portal_v1';

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        examConfig: { ...DEFAULT_EXAM_CONFIG, ...parsed.examConfig },
        candidates: parsed.candidates?.length ? parsed.candidates : INITIAL_CANDIDATES,
        questions: parsed.questions?.length ? parsed.questions : INITIAL_QUESTIONS,
      };
    }
  } catch (err) {
    console.error('Failed to parse stored portal state:', err);
  }

  return {
    examConfig: DEFAULT_EXAM_CONFIG,
    candidates: INITIAL_CANDIDATES,
    questions: INITIAL_QUESTIONS,
  };
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save portal state to localStorage:', err);
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

// ==================== EXCEL IMPORT & EXPORT ====================

// Download Candidate Sample Template
export function downloadCandidateTemplate(): void {
  const sampleData = [
    {
      'Phone Number': '9876543210',
      'Candidate Name': 'Rahul Krishnan',
    },
    {
      'Phone Number': '9876543211',
      'Candidate Name': 'Fathima Noor',
    },
    {
      'Phone Number': '9876543212',
      'Candidate Name': 'Albin Joseph',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates');
  XLSX.writeFile(workbook, 'Carmel_Candidates_Template.xlsx');
}

// Download Question Sample Template
export function downloadQuestionTemplate(): void {
  const sampleData = [
    {
      'Question': 'Which is the SI unit of electric current?',
      'Option A': 'Volt',
      'Option B': 'Ampere',
      'Option C': 'Watt',
      'Option D': 'Ohm',
      'Correct Answer': 'B',
      'Marks': 1,
    },
    {
      'Question': 'The ratio of lateral strain to longitudinal strain is known as:',
      'Option A': 'Poisson ratio',
      'Option B': 'Bulk modulus',
      'Option C': 'Modulus of rigidity',
      'Option D': 'Young modulus',
      'Correct Answer': 'A',
      'Marks': 1,
    },
    {
      'Question': 'Which gas is most abundant in the Earth atmosphere?',
      'Option A': 'Oxygen',
      'Option B': 'Carbon dioxide',
      'Option C': 'Nitrogen',
      'Option D': 'Argon',
      'Correct Answer': 'C',
      'Marks': 1,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
  XLSX.writeFile(workbook, 'Carmel_Questions_Template.xlsx');
}

// Parse Candidate Excel File
export async function parseCandidateExcel(file: File): Promise<Candidate[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

  const candidates: Candidate[] = [];

  rows.forEach((row, idx) => {
    // Find keys flexibly
    const phoneRaw =
      row['Phone Number'] || row['Phone'] || row['phone'] || row['Mobile'] || row['Contact'] || Object.values(row)[0];
    const nameRaw =
      row['Candidate Name'] || row['Name'] || row['name'] || Object.values(row)[1];

    const phone = normalizePhone(phoneRaw);
    const name = String(nameRaw).trim();

    if (phone && name) {
      candidates.push({
        id: `cand_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
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
    const correctRaw = String(row['Correct Answer'] || row['Answer'] || row['Correct'] || row['Key'] || 'A').toUpperCase().trim();

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

// Export Results to Excel (For Admin Only)
export function exportResultsExcel(candidates: Candidate[], questions: Question[], _config: ExamConfig): void {
  const totalPossibleScore = questions.reduce((sum, q) => sum + q.marks, 0);

  const exportData = candidates.map((cand, index) => {
    const answeredCount = Object.keys(cand.answers || {}).length;
    const timeTakenFormatted = cand.timeTakenSeconds
      ? `${Math.floor(cand.timeTakenSeconds / 60)}m ${cand.timeTakenSeconds % 60}s`
      : 'N/A';

    const percentage = totalPossibleScore > 0 ? ((cand.score / totalPossibleScore) * 100).toFixed(1) + '%' : '0%';

    return {
      'Sl No': index + 1,
      'Candidate Name': cand.name,
      'Phone Number': cand.phone,
      'Exam Status': cand.status,
      'Questions Attempted': `${answeredCount} / ${questions.length}`,
      'Score': cand.score,
      'Total Marks': totalPossibleScore,
      'Percentage': percentage,
      'Time Started': cand.startedAt ? new Date(cand.startedAt).toLocaleTimeString() : 'N/A',
      'Completion Time': cand.completedAt ? new Date(cand.completedAt).toLocaleTimeString() : 'N/A',
      'Duration Taken': timeTakenFormatted,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Exam Results');
  const filename = `Carmel_Polytechnic_Results_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
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

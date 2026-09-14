import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  UserPlus,
  XCircle,
} from 'lucide-react';
import type { Candidate, Question } from '../../types';
import {
  downloadCandidateTemplate,
  downloadQuestionTemplate,
  parseCandidateExcel,
  parseQuestionExcel,
  normalizePhone,
} from '../../services/storage';

interface ExcelManagerProps {
  candidates: Candidate[];
  questions: Question[];
  onUpdateCandidates: (candidates: Candidate[]) => void;
  onUpdateQuestions: (questions: Question[]) => void;
}

export const ExcelManager: React.FC<ExcelManagerProps> = ({
  candidates,
  questions,
  onUpdateCandidates,
  onUpdateQuestions,
}) => {
  const [activeSection, setActiveSection] = useState<'candidates' | 'questions'>('candidates');

  // Candidate upload state
  const [candidateFileLoading, setCandidateFileLoading] = useState(false);
  const [candidateUploadMsg, setCandidateUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const candidateInputRef = useRef<HTMLInputElement>(null);

  // Question upload state
  const [questionFileLoading, setQuestionFileLoading] = useState(false);
  const [questionUploadMsg, setQuestionUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const questionInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showAddCandidateModal, setShowAddCandidateModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);

  // Manual Candidate Form State
  const [newCand, setNewCand] = useState({
    name: '',
    phone: '',
  });

  // Manual Question Form State
  const [newQ, setNewQ] = useState<{
    question: string;
    optA: string;
    optB: string;
    optC: string;
    optD: string;
    correctOption: 'A' | 'B' | 'C' | 'D';
    marks: number;
  }>({
    question: '',
    optA: '',
    optB: '',
    optC: '',
    optD: '',
    correctOption: 'A',
    marks: 1,
  });

  // Handle Candidate Excel Upload
  const handleCandidateFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCandidateFileLoading(true);
    setCandidateUploadMsg(null);
    try {
      const parsed = await parseCandidateExcel(file);
      if (parsed.length === 0) {
        setCandidateUploadMsg({
          type: 'error',
          text: 'No valid candidate entries found in the file. Ensure phone and name columns exist.',
        });
      } else {
        // Merge or replace
        const existingPhones = new Set(candidates.map((c) => normalizePhone(c.phone)));
        const newOnes = parsed.filter((c) => !existingPhones.has(normalizePhone(c.phone)));

        onUpdateCandidates([...candidates, ...newOnes]);
        setCandidateUploadMsg({
          type: 'success',
          text: `Successfully imported ${parsed.length} candidate(s) from "${file.name}"! (${newOnes.length} new added)`,
        });
      }
    } catch (err) {
      console.error('Error parsing candidate excel:', err);
      setCandidateUploadMsg({
        type: 'error',
        text: 'Failed to read the Excel file. Please use standard .xlsx format.',
      });
    } finally {
      setCandidateFileLoading(false);
      if (candidateInputRef.current) candidateInputRef.current.value = '';
    }
  };

  // Handle Questions Excel Upload
  const handleQuestionFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setQuestionFileLoading(true);
    setQuestionUploadMsg(null);
    try {
      const parsed = await parseQuestionExcel(file);
      if (parsed.length === 0) {
        setQuestionUploadMsg({
          type: 'error',
          text: 'No valid questions found. Ensure columns: Question, Option A, Option B, Option C, Option D, Correct Answer.',
        });
      } else {
        onUpdateQuestions([...questions, ...parsed]);
        setQuestionUploadMsg({
          type: 'success',
          text: `Successfully imported ${parsed.length} questions from "${file.name}"!`,
        });
      }
    } catch (err) {
      console.error('Error parsing question excel:', err);
      setQuestionUploadMsg({
        type: 'error',
        text: 'Failed to parse questions file. Please verify with the sample template.',
      });
    } finally {
      setQuestionFileLoading(false);
      if (questionInputRef.current) questionInputRef.current.value = '';
    }
  };

  // Manual Candidate Add
  const handleSaveCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    const phone = normalizePhone(newCand.phone);
    if (!phone || phone.length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    const created: Candidate = {
      id: `cand_${Date.now()}`,
      phone,
      name: newCand.name.trim(),
      status: 'NOT_STARTED',
      startedAt: null,
      completedAt: null,
      timeTakenSeconds: null,
      answers: {},
      score: 0,
      currentQuestionIndex: 0,
    };

    onUpdateCandidates([...candidates, created]);
    setNewCand({ name: '', phone: '' });
    setShowAddCandidateModal(false);
  };

  // Manual Question Add
  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQ.question.trim() || !newQ.optA.trim() || !newQ.optB.trim() || !newQ.optC.trim() || !newQ.optD.trim()) {
      alert('Please fill out question text and all 4 options.');
      return;
    }

    const created: Question = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      question: newQ.question.trim(),
      options: [newQ.optA.trim(), newQ.optB.trim(), newQ.optC.trim(), newQ.optD.trim()],
      correctOption: newQ.correctOption,
      marks: newQ.marks || 1,
    };

    onUpdateQuestions([...questions, created]);
    setNewQ({
      question: '',
      optA: '',
      optB: '',
      optC: '',
      optD: '',
      correctOption: 'A',
      marks: 1,
    });
    setShowAddQuestionModal(false);
  };

  // Delete Candidate
  const handleDeleteCandidate = (id: string) => {
    if (confirm('Are you sure you want to remove this candidate from the roster?')) {
      onUpdateCandidates(candidates.filter((c) => c.id !== id));
    }
  };

  // Delete Question
  const handleDeleteQuestion = (id: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      onUpdateQuestions(questions.filter((q) => q.id !== id));
    }
  };

  return (
    <div>
      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveSection('candidates')}
          className={`btn ${activeSection === 'candidates' ? 'btn-primary' : 'btn-outline'}`}
        >
          <FileSpreadsheet size={16} />
          <span>Candidate Roster & Excel ({candidates.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('questions')}
          className={`btn ${activeSection === 'questions' ? 'btn-primary' : 'btn-outline'}`}
        >
          <HelpCircle size={16} />
          <span>Question Bank & Excel ({questions.length})</span>
        </button>
      </div>

      {/* ==================== CANDIDATE MANAGEMENT ==================== */}
      {activeSection === 'candidates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top banner with upload & sample template download */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="table-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-900)', marginBottom: '0.4rem' }}>
                Import Candidates from Excel
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginBottom: '1rem' }}>
                Upload an Excel sheet containing candidate phone numbers and names.
                Candidates log in with only their mobile number while their details are pulled automatically.
              </p>

              <div
                className="dropzone-box"
                onClick={() => candidateInputRef.current?.click()}
              >
                <Upload size={32} color="var(--primary-600)" style={{ margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--neutral-800)' }}>
                  {candidateFileLoading ? 'Parsing Excel File...' : 'Click to Browse Candidate Excel (.xlsx / .csv)'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>
                  Supported columns: Phone Number, Candidate Name
                </div>
                <input
                  ref={candidateInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleCandidateFileUpload}
                  style={{ display: 'none' }}
                />
              </div>

              {candidateUploadMsg && (
                <div
                  className={`alert-box ${candidateUploadMsg.type === 'success' ? 'alert-box' : 'alert-error'}`}
                  style={{
                    marginTop: '0.85rem',
                    background: candidateUploadMsg.type === 'success' ? 'var(--success-50)' : undefined,
                    color: candidateUploadMsg.type === 'success' ? 'var(--success-600)' : undefined,
                    border: candidateUploadMsg.type === 'success' ? '1px solid var(--success-100)' : undefined,
                  }}
                >
                  {candidateUploadMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{candidateUploadMsg.text}</span>
                </div>
              )}
            </div>

            <div className="table-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-900)', marginBottom: '0.4rem' }}>
                  Excel Format & Quick Actions
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginBottom: '1rem' }}>
                  Need the exact Excel format? Download the official Carmel Polytechnic candidate roster template pre-configured with the required columns.
                </p>

                <div style={{
                  background: 'var(--neutral-50)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--neutral-200)',
                  fontSize: '0.8rem',
                  marginBottom: '1rem'
                }}>
                  <strong>Required Columns:</strong>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                    <span className="badge badge-blue">Phone Number</span>
                    <span className="badge badge-blue">Candidate Name</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={downloadCandidateTemplate}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  <Download size={16} />
                  <span>Download Sample Template</span>
                </button>

                <button
                  onClick={() => setShowAddCandidateModal(true)}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  <UserPlus size={16} />
                  <span>Add Candidate Manually</span>
                </button>
              </div>
            </div>
          </div>

          {/* Candidate List Table */}
          <div className="table-card">
            <div className="table-toolbar">
              <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Registered Candidates Roster ({candidates.length})</h4>
              {candidates.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all candidates?')) {
                      onUpdateCandidates([]);
                    }
                  }}
                  className="btn btn-danger btn-sm"
                >
                  <Trash2 size={14} />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Candidate Name</th>
                    <th>Mobile Phone</th>
                    <th>Exam Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c, idx) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, color: 'var(--neutral-500)' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>{c.name}</td>
                      <td style={{ fontFamily: 'monospace' }}>{c.phone}</td>
                      <td>
                        <span className={`badge ${c.status === 'COMPLETED' ? 'badge-green' : c.status === 'IN_PROGRESS' ? 'badge-amber' : c.status === 'REVOKED' ? 'badge-red' : 'badge-gray'}`}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteCandidate(c.id)}
                          className="btn btn-danger btn-sm"
                          title="Remove from roster"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== QUESTION MANAGEMENT ==================== */}
      {activeSection === 'questions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top banner with upload & sample template */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="table-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-900)', marginBottom: '0.4rem' }}>
                Import Questions from Excel
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginBottom: '1rem' }}>
                Batch import 4-option MCQ questions from an Excel spreadsheet. Questions will be automatically juggled/shuffled for each examinee.
              </p>

              <div
                className="dropzone-box"
                onClick={() => questionInputRef.current?.click()}
              >
                <Upload size={32} color="var(--primary-600)" style={{ margin: '0 auto 0.5rem auto' }} />
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--neutral-800)' }}>
                  {questionFileLoading ? 'Parsing Questions...' : 'Click to Browse Questions Excel (.xlsx / .csv)'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--neutral-500)', marginTop: '0.25rem' }}>
                  Columns: Question, Option A, Option B, Option C, Option D, Correct Answer (A/B/C/D), Marks
                </div>
                <input
                  ref={questionInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleQuestionFileUpload}
                  style={{ display: 'none' }}
                />
              </div>

              {questionUploadMsg && (
                <div
                  className={`alert-box ${questionUploadMsg.type === 'success' ? 'alert-box' : 'alert-error'}`}
                  style={{
                    marginTop: '0.85rem',
                    background: questionUploadMsg.type === 'success' ? 'var(--success-50)' : undefined,
                    color: questionUploadMsg.type === 'success' ? 'var(--success-600)' : undefined,
                    border: questionUploadMsg.type === 'success' ? '1px solid var(--success-100)' : undefined,
                  }}
                >
                  {questionUploadMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  <span>{questionUploadMsg.text}</span>
                </div>
              )}
            </div>

            <div className="table-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-900)', marginBottom: '0.4rem' }}>
                  MCQ Structure & Builder
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--neutral-600)', marginBottom: '1rem' }}>
                  Questions support 4 multiple choice options with designated correct keys. You can also create or edit questions manually.
                </p>

                <div style={{
                  background: 'var(--neutral-50)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--neutral-200)',
                  fontSize: '0.8rem',
                  marginBottom: '1rem'
                }}>
                  <strong>Question Bank Overview:</strong>
                  <div style={{ marginTop: '0.4rem', color: 'var(--neutral-700)' }}>
                    Total Questions: <strong>{questions.length}</strong> | Total Marks: <strong>{questions.reduce((s, q) => s + q.marks, 0)}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={downloadQuestionTemplate}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  <Download size={16} />
                  <span>Download Sample Excel</span>
                </button>

                <button
                  onClick={() => setShowAddQuestionModal(true)}
                  className="btn btn-gold"
                  style={{ flex: 1 }}
                >
                  <Plus size={16} />
                  <span>Create Question Manually</span>
                </button>
              </div>
            </div>
          </div>

          {/* Questions List */}
          <div className="table-card">
            <div className="table-toolbar">
              <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Active Question Bank ({questions.length})</h4>
              {questions.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to clear all questions in the bank?')) {
                      onUpdateQuestions([]);
                    }
                  }}
                  className="btn btn-danger btn-sm"
                >
                  <Trash2 size={14} />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  style={{
                    border: '1px solid var(--neutral-200)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    background: '#fff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--neutral-900)' }}>
                      <span style={{ color: 'var(--primary-700)', marginRight: '0.5rem' }}>Q{idx + 1}.</span>
                      {q.question}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-blue">{q.marks} Mark{q.marks > 1 ? 's' : ''}</span>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="btn btn-danger btn-sm"
                        title="Delete Question"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    {(['A', 'B', 'C', 'D'] as const).map((key, oIdx) => {
                      const isCorrect = q.correctOption === key;
                      return (
                        <div
                          key={key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.55rem 0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            border: `1.5px solid ${isCorrect ? 'var(--success-500)' : 'var(--neutral-200)'}`,
                            background: isCorrect ? 'var(--success-50)' : 'var(--neutral-50)',
                            fontSize: '0.85rem',
                          }}
                        >
                          <span style={{
                            fontWeight: 700,
                            color: isCorrect ? 'var(--success-600)' : 'var(--neutral-600)',
                            width: 20
                          }}>
                            {key}.
                          </span>
                          <span style={{ color: 'var(--neutral-800)', flex: 1 }}>{q.options[oIdx]}</span>
                          {isCorrect && (
                            <span className="badge badge-green" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>
                              CORRECT
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Candidate Modal */}
      {showAddCandidateModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Add Candidate Manually</h3>
              <button onClick={() => setShowAddCandidateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <XCircle size={20} color="var(--neutral-400)" />
              </button>
            </div>
            <form onSubmit={handleSaveCandidate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anandhu Krishna"
                    value={newCand.name}
                    onChange={(e) => setNewCand({ ...newCand, name: e.target.value })}
                    style={{ padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)' }}
                  />
                </div>
                <div className="form-group">
                  <label>Registered Mobile Phone (Used for Candidate Login)</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit mobile number e.g. 9876543299"
                    value={newCand.phone}
                    onChange={(e) => setNewCand({ ...newCand, phone: e.target.value })}
                    style={{ padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddCandidateModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add Question Modal */}
      {showAddQuestionModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3>Create MCQ Question</h3>
              <button onClick={() => setShowAddQuestionModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <XCircle size={20} color="var(--neutral-400)" />
              </button>
            </div>
            <form onSubmit={handleSaveQuestion}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Question Text</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Enter the question text here..."
                    value={newQ.question}
                    onChange={(e) => setNewQ({ ...newQ, question: e.target.value })}
                    style={{ padding: '0.65rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)', fontFamily: 'inherit' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label>Option A</label>
                    <input
                      type="text"
                      required
                      placeholder="Choice A"
                      value={newQ.optA}
                      onChange={(e) => setNewQ({ ...newQ, optA: e.target.value })}
                      style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Option B</label>
                    <input
                      type="text"
                      required
                      placeholder="Choice B"
                      value={newQ.optB}
                      onChange={(e) => setNewQ({ ...newQ, optB: e.target.value })}
                      style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Option C</label>
                    <input
                      type="text"
                      required
                      placeholder="Choice C"
                      value={newQ.optC}
                      onChange={(e) => setNewQ({ ...newQ, optC: e.target.value })}
                      style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Option D</label>
                    <input
                      type="text"
                      required
                      placeholder="Choice D"
                      value={newQ.optD}
                      onChange={(e) => setNewQ({ ...newQ, optD: e.target.value })}
                      style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                  <div className="form-group">
                    <label>Designated Correct Answer</label>
                    <select
                      value={newQ.correctOption}
                      onChange={(e) => setNewQ({ ...newQ, correctOption: e.target.value as 'A' | 'B' | 'C' | 'D' })}
                      style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)' }}
                    >
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      <option value="C">Option C</option>
                      <option value="D">Option D</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Marks</label>
                    <input
                      type="number"
                      min={1}
                      value={newQ.marks}
                      onChange={(e) => setNewQ({ ...newQ, marks: Number(e.target.value) || 1 })}
                      style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--neutral-300)' }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAddQuestionModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold">
                  Add to Question Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import type { Candidate, Question, ExamConfig } from '../types';

/**
 * Service to generate and open standalone, print-optimized documents in a new tab.
 * This completely avoids background page bleeding, modal scrollbar artifacts,
 * and print dialog duplication.
 */

export function printCandidateAnswerSheet(
  candidate: Candidate,
  questions: Question[],
  config: ExamConfig
): void {
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const attemptedCount = Object.keys(candidate.answers || {}).length;

  const durationSecs = candidate.timeTakenSeconds || 0;
  const mins = Math.floor(durationSecs / 60);
  const secs = durationSecs % 60;
  const durationFormatted = durationSecs > 0 ? `${mins}m ${secs}s` : 'N/A';

  const avgTimeSecs = attemptedCount > 0 ? Math.round(durationSecs / attemptedCount) : 0;
  const avgTimeFormatted = avgTimeSecs > 0 ? `${Math.floor(avgTimeSecs / 60)}m ${avgTimeSecs % 60}s` : 'N/A';

  const percentage = totalMarks > 0 ? ((candidate.score / totalMarks) * 100).toFixed(1) : '0';
  const examStartTime = candidate.startedAt ? new Date(candidate.startedAt).toLocaleString() : 'Not Started';
  const examEndTime = candidate.completedAt ? new Date(candidate.completedAt).toLocaleString() : 'In Progress';
  const currentDateStr = new Date().toLocaleString();

  // Build question rows
  const questionRowsHtml = questions
    .map((q, idx) => {
      const selectedOpt = candidate.answers ? candidate.answers[q.id] : undefined;
      const isCorrect = selectedOpt === q.correctOption;
      const isAnswered = Boolean(selectedOpt);

      const statusBadge = !isAnswered
        ? '<span class="badge badge-skipped">NOT ATTEMPTED</span>'
        : isCorrect
        ? '<span class="badge badge-correct">CORRECT</span>'
        : '<span class="badge badge-incorrect">INCORRECT</span>';

      const optionsHtml = (['A', 'B', 'C', 'D'] as const)
        .map((optKey, oIdx) => {
          const isSelected = selectedOpt === optKey;
          const isKey = q.correctOption === optKey;
          let optClass = 'opt-chip';
          if (isSelected) optClass += ' selected';
          if (isKey) optClass += ' key';
          return `<span class="${optClass}"><strong>${optKey}:</strong> ${escapeHtml(q.options[oIdx])}</span>`;
        })
        .join('');

      return `
        <tr class="${!isAnswered ? 'row-unanswered' : isCorrect ? 'row-correct' : 'row-incorrect'}">
          <td style="text-align:center; font-weight:bold;">${idx + 1}</td>
          <td>
            <div class="q-text">${escapeHtml(q.question)}</div>
            <div class="q-options">${optionsHtml}</div>
          </td>
          <td style="text-align:center; font-weight:bold;">
            ${selectedOpt ? `<span class="${isCorrect ? 'text-correct' : 'text-incorrect'}">Option ${selectedOpt}</span>` : '<span style="color:#94a3b8;">Unanswered</span>'}
          </td>
          <td style="text-align:center; font-weight:bold; color:#047857;">Option ${q.correctOption}</td>
          <td style="text-align:center;">${statusBadge}</td>
          <td style="text-align:center; font-weight:bold;">${isCorrect ? `+${q.marks}` : '0'}</td>
        </tr>
      `;
    })
    .join('');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Answer Sheet - ${escapeHtml(candidate.name)} - Carmel Polytechnic</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      padding: 0;
      margin: 0;
      font-size: 13px;
      line-height: 1.45;
    }

    /* Screen Action Bar (Hidden in Print) */
    .screen-toolbar {
      background: #0a1f38;
      color: #fff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 10px rgba(0,0,0,0.15);
    }
    .screen-toolbar h1 {
      font-size: 14px;
      font-weight: 600;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-print {
      background: #d97706;
      color: #fff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      margin-right: 8px;
      transition: background 0.15s ease;
    }
    .btn-print:hover { background: #b45309; }
    .btn-close {
      background: rgba(255,255,255,0.15);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.25);
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
    }
    .btn-close:hover { background: rgba(255,255,255,0.25); }

    /* Main Page Paper */
    .sheet-wrapper {
      max-width: 900px;
      margin: 24px auto;
      background: #fff;
      padding: 36px 40px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }

    /* College Letterhead Header */
    .college-header {
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 2.5px solid #0f2b4d;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .crest-box {
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .crest-img {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }
    .header-text h2 {
      font-size: 17px;
      font-weight: 800;
      color: #0f2b4d;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .header-text h4 {
      font-size: 11px;
      color: #475569;
      font-weight: 500;
      margin-top: 2px;
    }
    .header-text h3 {
      font-size: 13px;
      font-weight: 800;
      color: #b45309;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .header-text p {
      font-size: 11px;
      color: #64748b;
      margin-top: 1px;
    }

    /* Info Matrix */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .info-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 14px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 2.5px 0;
      font-size: 12px;
    }
    .info-label { color: #64748b; font-weight: 500; }
    .info-val { color: #0f172a; font-weight: 700; }

    /* Scores Banner */
    .score-banner {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 16px;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      text-align: center;
      margin-bottom: 20px;
    }
    .metric-col .lbl {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.03em;
    }
    .metric-col .val {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }
    .metric-col .highlight { color: #0f2b4d; }

    /* Questions Table */
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #0f2b4d;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
      margin-bottom: 24px;
    }
    th {
      background: #e2e8f0;
      color: #0f172a;
      padding: 7px 10px;
      font-weight: 700;
      font-size: 11px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    td {
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
    }
    .row-correct { background: #f0fdf4; }
    .row-incorrect { background: #fef2f2; }
    .row-unanswered { background: #f8fafc; }

    .q-text { font-weight: 600; color: #0f172a; margin-bottom: 5px; font-size: 12px; }
    .q-options { display: flex; flex-wrap: wrap; gap: 5px; }
    .opt-chip {
      font-size: 10.5px;
      padding: 2px 6px;
      border-radius: 4px;
      background: #e2e8f0;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .opt-chip.selected {
      background: #dbeafe;
      border-color: #93c5fd;
      color: #1e40af;
      font-weight: 600;
    }
    .opt-chip.key {
      background: #dcfce7;
      border-color: #86efac;
      color: #166534;
    }

    .text-correct { color: #059669; font-weight: 700; }
    .text-incorrect { color: #dc2626; font-weight: 700; }

    .badge {
      display: inline-block;
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .badge-correct { background: #dcfce7; color: #15803d; }
    .badge-incorrect { background: #fee2e2; color: #b91c1c; }
    .badge-skipped { background: #f1f5f9; color: #64748b; }

    /* Signatures */
    .signatures-row {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-top: 36px;
      padding-top: 10px;
    }
    .sig-box {
      flex: 1;
      text-align: center;
      font-size: 11px;
      color: #475569;
    }
    .sig-line {
      border-bottom: 1.5px dashed #64748b;
      margin-bottom: 6px;
      height: 36px;
    }

    .footer-note {
      margin-top: 24px;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
      font-size: 10.5px;
      color: #64748b;
      text-align: center;
    }

    /* Print Stylesheet */
    @media print {
      body {
        background: #fff !important;
        font-size: 10pt !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .screen-toolbar { display: none !important; }
      .sheet-wrapper {
        box-shadow: none !important;
        border: none !important;
        max-width: 100% !important;
        width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      table tr { page-break-inside: avoid; }
      .signatures-row { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <!-- Non-printing screen toolbar -->
  <div class="screen-toolbar">
    <h1>
      <span>CARMEL POLYTECHNIC COLLEGE PUNNAPRA</span> &bull; 
      <span style="font-weight:400; color:#cbd5e1;">Candidate Answer Sheet (${escapeHtml(candidate.phone)})</span>
    </h1>
    <div>
      <button class="btn-print" onclick="window.print()">🖨️ Print Document</button>
      <button class="btn-close" onclick="window.close()">✕ Close Tab</button>
    </div>
  </div>

  <div class="sheet-wrapper">
    <!-- Header -->
    <div class="college-header">
      <div class="crest-box">
        <img src="/carmel.png" alt="Carmel Polytechnic Logo" class="crest-img" />
      </div>
      <div class="header-text">
        <h2>CARMEL POLYTECHNIC COLLEGE PUNNAPRA</h2>
        <h4>Govt. Aided Technical Institution | Alappuzha, Kerala - 688004</h4>
        <h3>OFFICIAL CANDIDATE EVALUATION & ANSWER SHEET</h3>
        <p>${escapeHtml(config.title)}</p>
      </div>
    </div>

    <!-- Candidate & Exam Info -->
    <div class="info-grid">
      <div class="info-box">
        <div class="info-row"><span class="info-label">Candidate Name:</span><span class="info-val">${escapeHtml(candidate.name)}</span></div>
        <div class="info-row"><span class="info-label">Registered Phone:</span><span class="info-val">${escapeHtml(candidate.phone)}</span></div>
      </div>
      <div class="info-box">
        <div class="info-row"><span class="info-label">Exam Start Time:</span><span class="info-val">${escapeHtml(examStartTime)}</span></div>
        <div class="info-row"><span class="info-label">Completion Time:</span><span class="info-val">${escapeHtml(examEndTime)}</span></div>
        <div class="info-row"><span class="info-label">Total Time Taken:</span><span class="info-val">${escapeHtml(durationFormatted)}</span></div>
        <div class="info-row"><span class="info-label">Avg. Time / Question:</span><span class="info-val">${escapeHtml(avgTimeFormatted)}</span></div>
      </div>
    </div>

    <!-- Score Banner -->
    <div class="score-banner">
      <div class="metric-col"><span class="lbl">Total Questions</span><span class="val">${questions.length}</span></div>
      <div class="metric-col"><span class="lbl">Attempted</span><span class="val">${attemptedCount}</span></div>
      <div class="metric-col"><span class="lbl">Score Awarded</span><span class="val highlight">${candidate.score} / ${totalMarks}</span></div>
      <div class="metric-col"><span class="lbl">Percentage</span><span class="val">${percentage}%</span></div>
      <div class="metric-col"><span class="lbl">Status</span><span class="val" style="font-size:13px; color:#059669;">${escapeHtml(candidate.status)}</span></div>
    </div>

    <!-- Questions Table -->
    <div class="section-title">Detailed Question Responses & Key Audit</div>
    <table>
      <thead>
        <tr>
          <th style="width:35px; text-align:center;">Q#</th>
          <th>Question & Choices</th>
          <th style="width:90px; text-align:center;">Selected</th>
          <th style="width:90px; text-align:center;">Official Key</th>
          <th style="width:105px; text-align:center;">Result</th>
          <th style="width:55px; text-align:center;">Marks</th>
        </tr>
      </thead>
      <tbody>
        ${questionRowsHtml}
      </tbody>
    </table>

    <!-- Signatures -->
    <div class="signatures-row">
      <div class="sig-box"><div class="sig-line"></div><span>Staff Invigilator</span></div>
      <div class="sig-box"><div class="sig-line"></div><span>Controller of Examinations</span></div>
      <div class="sig-box"><div class="sig-line"></div><span>Principal & Seal</span></div>
    </div>

    <div class="footer-note">
      Authentic evaluation record generated by Carmel Polytechnic College Online Examination Portal on ${escapeHtml(currentDateStr)}.
    </div>
  </div>

  <script>
    window.onload = function() {
      // Prompt Chrome's native print dialog automatically
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>
  `;

  openAndPrintTab(htmlContent, `AnswerSheet_${candidate.phone}`);
}

/**
 * Print complete candidate roster score sheet in a clean new tab
 */
export function printMasterCandidateList(
  candidates: Candidate[],
  questions: Question[],
  config: ExamConfig
): void {
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const completed = candidates.filter((c) => c.status === 'COMPLETED');
  const avgScore = completed.length
    ? (completed.reduce((acc, c) => acc + c.score, 0) / completed.length).toFixed(1)
    : '0';
  const maxScore = completed.length ? Math.max(...completed.map((c) => c.score)) : 0;
  const currentDateStr = new Date().toLocaleString();

  const rowsHtml = candidates
    .map((c, index) => {
      const attempted = Object.keys(c.answers || {}).length;
      const durationSecs = c.timeTakenSeconds || 0;
      const durFormatted = durationSecs > 0 ? `${Math.floor(durationSecs / 60)}m ${durationSecs % 60}s` : '—';
      const percentage = totalMarks > 0 ? ((c.score / totalMarks) * 100).toFixed(1) : '0';

      const startTimeStr = c.startedAt
        ? new Date(c.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—';
      const endTimeStr = c.completedAt
        ? new Date(c.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—';

      return `
        <tr>
          <td style="text-align:center; font-weight:600;">${index + 1}</td>
          <td style="font-weight:600;">${escapeHtml(c.name)}</td>
          <td style="font-family:monospace; font-size:11px;">${escapeHtml(c.phone)}</td>
          <td style="text-align:center;">
            <span class="status-tag ${c.status === 'COMPLETED' ? 'tag-green' : c.status === 'REVOKED' ? 'tag-red' : 'tag-gray'}">
              ${escapeHtml(c.status)}
            </span>
          </td>
          <td style="text-align:center;">${attempted} / ${questions.length}</td>
          <td style="font-size:11px;">${escapeHtml(startTimeStr)}</td>
          <td style="font-size:11px;">${escapeHtml(endTimeStr)}</td>
          <td style="font-size:11px; font-weight:600;">${escapeHtml(durFormatted)}</td>
          <td style="text-align:center; font-weight:bold; font-size:13px; color:#0f2b4d;">${c.status === 'COMPLETED' ? c.score : '—'}</td>
          <td style="text-align:center; font-weight:bold;">${c.status === 'COMPLETED' ? `${percentage}%` : '—'}</td>
        </tr>
      `;
    })
    .join('');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Master Exam Score Sheet - Carmel Polytechnic College Punnapra</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      font-size: 12px;
      line-height: 1.4;
    }

    /* Screen Action Bar */
    .screen-toolbar {
      background: #0a1f38;
      color: #fff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 10px rgba(0,0,0,0.15);
    }
    .screen-toolbar h1 {
      font-size: 14px;
      font-weight: 600;
      color: #e2e8f0;
    }
    .btn-print {
      background: #d97706;
      color: #fff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      margin-right: 8px;
    }
    .btn-print:hover { background: #b45309; }
    .btn-close {
      background: rgba(255,255,255,0.15);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.25);
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
    }

    .sheet-wrapper {
      max-width: 1100px;
      margin: 24px auto;
      background: #fff;
      padding: 32px 36px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }

    .college-header {
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 2.5px solid #0f2b4d;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .crest-box {
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .crest-img {
      width: 60px;
      height: 60px;
      object-fit: contain;
    }
    .header-text h2 {
      font-size: 18px;
      font-weight: 800;
      color: #0f2b4d;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .header-text h4 {
      font-size: 11px;
      color: #475569;
      font-weight: 500;
      margin-top: 2px;
    }
    .header-text h3 {
      font-size: 13px;
      font-weight: 800;
      color: #b45309;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .header-text p {
      font-size: 11px;
      color: #64748b;
    }

    .score-banner {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 16px;
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      text-align: center;
      margin-bottom: 20px;
    }
    .metric-col .lbl {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
    }
    .metric-col .val {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }
    .metric-col .highlight { color: #0f2b4d; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
      margin-bottom: 24px;
    }
    th {
      background: #e2e8f0;
      color: #0f172a;
      padding: 7px 8px;
      font-weight: 700;
      font-size: 10.5px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    td {
      padding: 6.5px 8px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
    }
    tr:nth-child(even) td { background: #fcfdfe; }

    .status-tag {
      display: inline-block;
      font-size: 9px;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 3px;
    }
    .tag-green { background: #dcfce7; color: #166534; }
    .tag-red { background: #fee2e2; color: #991b1b; }
    .tag-gray { background: #e2e8f0; color: #475569; }

    .signatures-row {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      margin-top: 36px;
    }
    .sig-box {
      flex: 1;
      text-align: center;
      font-size: 11px;
      color: #475569;
    }
    .sig-line {
      border-bottom: 1.5px dashed #64748b;
      margin-bottom: 6px;
      height: 36px;
    }

    .footer-note {
      margin-top: 24px;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
      font-size: 10.5px;
      color: #64748b;
      text-align: center;
    }

    @media print {
      body {
        background: #fff !important;
        font-size: 9pt !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .screen-toolbar { display: none !important; }
      .sheet-wrapper {
        box-shadow: none !important;
        border: none !important;
        max-width: 100% !important;
        width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      table tr { page-break-inside: avoid; }
      .signatures-row { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="screen-toolbar">
    <h1>
      <span>CARMEL POLYTECHNIC COLLEGE PUNNAPRA</span> &bull; 
      <span style="font-weight:400; color:#cbd5e1;">Master Examination Score Sheet (${candidates.length} Attendees)</span>
    </h1>
    <div>
      <button class="btn-print" onclick="window.print()">🖨️ Print Full Gazette</button>
      <button class="btn-close" onclick="window.close()">✕ Close Tab</button>
    </div>
  </div>

  <div class="sheet-wrapper">
    <div class="college-header">
      <div class="crest-box">
        <img src="/carmel.png" alt="Carmel Polytechnic Logo" class="crest-img" />
      </div>
      <div class="header-text">
        <h2>CARMEL POLYTECHNIC COLLEGE PUNNAPRA</h2>
        <h4>Office of the Controller of Examinations | Punnapra, Alappuzha, Kerala</h4>
        <h3>CONSOLIDATED MASTER EXAMINATION SCORE SHEET</h3>
        <p>${escapeHtml(config.title)} &bull; Official Results Gazette</p>
      </div>
    </div>

    <div class="score-banner">
      <div class="metric-col"><span class="lbl">Total Registered</span><span class="val">${candidates.length}</span></div>
      <div class="metric-col"><span class="lbl">Completed Submissions</span><span class="val">${completed.length}</span></div>
      <div class="metric-col"><span class="lbl">Highest Score</span><span class="val highlight">${maxScore} / ${totalMarks}</span></div>
      <div class="metric-col"><span class="lbl">Batch Average</span><span class="val">${avgScore} / ${totalMarks}</span></div>
      <div class="metric-col"><span class="lbl">Total Questions</span><span class="val">${questions.length}</span></div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:30px; text-align:center;">Sl</th>
          <th>Candidate Name</th>
          <th>Mobile Phone</th>
          <th style="text-align:center;">Status</th>
          <th style="text-align:center;">Attempted</th>
          <th>Start Time</th>
          <th>Completion Time</th>
          <th>Time Taken</th>
          <th style="text-align:center;">Score</th>
          <th style="text-align:center;">%</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="signatures-row">
      <div class="sig-box"><div class="sig-line"></div><span>Staff Invigilator / Prepared By</span></div>
      <div class="sig-box"><div class="sig-line"></div><span>Controller of Examinations</span></div>
      <div class="sig-box"><div class="sig-line"></div><span>Principal & Seal</span></div>
    </div>

    <div class="footer-note">
      Carmel Polytechnic College Punnapra &bull; Official Examination Records &bull; Generated ${escapeHtml(currentDateStr)}
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>
  `;

  openAndPrintTab(htmlContent, 'Master_Exam_Score_Sheet');
}

// Utility to escape HTML strings safely
function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Open HTML in new tab and handle printing
function openAndPrintTab(html: string, title: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Pop-up was blocked. Please allow pop-ups for this portal to view and print documents.');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = title;
  printWindow.focus();
}

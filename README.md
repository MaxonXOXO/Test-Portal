# Carmel Polytechnic College Punnapra - Online Assessment Portal

A comprehensive, secure, and modern administrative examination and questionnaire hosting platform built with React, TypeScript, and Vite for **Carmel Polytechnic College Punnapra** (Govt. Aided Technical Institution | Punnapra, Alappuzha, Kerala).

---

## 🌟 Key Features

### 🏢 Candidate Assessment Interface
- **Streamlined Authentication**: Attendees log in with their registered 10-digit mobile phone number and a common exam password (`CARMEL2026`). Candidate name is auto-pulled seamlessly.
- **Focused Question Experience**: Clean, single-question view with 4 multiple-choice options (MCQ), bidirectional navigation (Previous / Next / Question Palette), and review markers.
- **Prominently Large Live Countdown Timer**: High-visibility digital timer prominently featured on the candidate screen with urgency warning states and automated submission upon expiry.
- **Robust Anti-Cheating Protection**:
  - Browser Search (`Ctrl+F` / `Cmd+F`) blocked.
  - Copy (`Ctrl+C`), Paste (`Ctrl+V`), Cut (`Ctrl+X`) blocked.
  - View Source (`Ctrl+U`), Print (`Ctrl+P`), and Inspect/DevTools (`F12`, `Ctrl+Shift+I`) disabled.
  - Context menu (right-click) and mouse text selection disabled.
- **Strict Score Privacy**: Examinees only receive an official submission receipt upon completion. Scores and correct answers are strictly reserved for administrators.

### 🛡️ Administrative Control Center
- **Live Real-time Examination Monitor**:
  - Live progress tracking, start times, completion times, and status tags (`NOT STARTED`, `IN PROGRESS`, `COMPLETED`, `REVOKED`).
  - Real-time admin-only score visibility and percentage metrics.
  - Quick candidate search by name or contact number.
- **Exam Session Controls**:
  - **Individual Candidate Restart**: Timer restarts fresh from that exact moment without affecting other examinees.
  - **Revoke / Reinstate**: Immediately suspend or restore examinee access.
  - **Global Restart**: Synchronously restart the session for all attendees.
- **Excel Roster & Question Bank Management**:
  - Batch upload candidate rosters (.xlsx/.csv) with columns: `Phone Number`, `Candidate Name`.
  - Batch upload question banks (.xlsx/.csv) with 4 options and answer keys.
  - Pre-formatted Excel templates download for immediate use.
  - Manual candidate and question creation builders.
- **Native Print & Reporting Engine**:
  - **Individual Candidate Answer Sheets**: Renders detailed response audit, timestamps, and invigilator signature blocks in an isolated new tab using Chrome's native print engine.
  - **Consolidated Master Gazette**: Tabular print gazette with candidate roster, completion metrics, and scores.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/MaxonXOXO/Test-Portal.git

# Navigate to project directory
cd Test-Portal

# Install dependencies
npm install

# Start local development server
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

---

## 🔐 Credentials & Defaults
- **Default Exam Password**: `CARMEL2026`
- **Admin Switch PIN**: `1234`
- **Candidate Demo Accounts**:
  - Phone: `9876543210` (Abhishek Rajesh)
  - Phone: `9876543211` (Ananya S. Kumar)
  - Phone: `9876543212` (Midhun Varghese)
  - Phone: `9876543213` (Sneha Mariam Roy)
  - Phone: `9876543214` (Rohit K. Nair)

---

## 🛠️ Technology Stack
- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Vanilla CSS (Custom Design System with CSS Variables)
- **Icons**: Lucide React
- **Spreadsheet Processing**: SheetJS (xlsx)

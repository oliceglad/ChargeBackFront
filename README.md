# ⚡️ WATA CHARGEBACKS

Professional tool for automated data extraction and management of Chargebacks, FinCert queries, and customer complaints.

![Project Preview](https://via.placeholder.com/800x400.png?text=WATA+CHARGEBACKS+Preview) <!-- Replace with actual screenshot when available -->

## 🚀 Overview

**WATA CHARGEBACKS** is a high-performance web application designed to streamline the routine task of processing chargeback requests. It uses advanced AI (Gemini 2.0 Flash) and robust scripted heuristics to extract structured data from messy support messages, allowing agents to generate documents and sync with Google Sheets in seconds.

## ✨ Key Features

- **🤖 Dual Parsing Engine**:
  - **Gemini AI Mode**: Leverages Google's Gemini 2.0 Flash for intelligent, context-aware data extraction.
  - **Script Mode**: Ultra-fast, line-by-line regex-based extraction for reliable processing of standardized templates.
- **🛡️ Fraud Detection (v2026)**:
  - Automatic tracking of Telegram IDs and IP addresses.
  - Visual warnings (Red Alert UI) when a user exceeds the threshold (3 reports/day).
  - Automatic fraud tagging in descriptions.
- **📄 Document Automation**:
  - One-click generation of `.docx` files for Chargebacks and FinCert queries.
  - Support for image/screenshot embedding directly into templates.
- **📊 Spreadsheet Integration**:
  - Seamless sync with Google Sheets via webhooks (Google Apps Script).
- **🎨 Premium UI/UX**:
  - Minimalist 2026 design system with smooth micro-animations.
  - Fully responsive layout for Desktop and Mobile.
  - Secure Settings Modal with password protection for sensitive configurations.

## 🛠 Tech Stack

- **Core**: React 18 + Vite
- **Styling**: Tailwind CSS (Glassmorphism & Minimalist Design)
- **AI**: Google Generative AI (Gemini API)
- **Icons**: Lucide React
- **Animations**: CSS Variables + Custom Keyframes
- **Deployment**: GitHub Actions (CI/CD) + GitHub Pages

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/oliceglad/ChargeBackFront.git
   cd ChargeBackFront/frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run locally**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## ⚙️ Configuration

Open the **Settings** (gear icon) in the app to configure:
- **Gemini API Key**: Required for AI parsing.
- **Webhook URL**: Your Google Apps Script endpoint for spreadsheet sync.
- **System Prompt**: Custom instructions for the AI model.

## 🔒 Security

- All API keys and configurations are stored in `localStorage` — they never leave your browser.
- Built-in `.gitignore` prevents accidental leakage of environment files.
- Refactored according to 2026 security and architecture standards.

---
Created with ❤️ by **WATA Team**

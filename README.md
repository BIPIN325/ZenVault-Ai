<div align="center">
  <br />
  <h1>🛡️ ZenVault AI</h1>
  <p>
    <strong>A Zero-Knowledge, Local-First AI Knowledge Base & Secure Sandbox</strong>
  </p>
  <br />
</div>

## 🌌 Overview

**ZenVault AI** is a highly secure, privacy-first local knowledge management and RAG (Retrieval-Augmented Generation) application. Built with Next.js 16 and WebGPU hardware acceleration, it allows you to chat with your sensitive documents completely offline. 

Zero network requests. Zero data harvesting. Total cryptographic control.

## ✨ Core Features

- **🔐 True Zero-Knowledge Architecture**: All documents are chunked, vectorized, and encrypted locally using `AES-GCM-256` before ever touching the browser's IndexedDB. Your raw text is never stored in plaintext.
- **🧠 100% Offline AI Engine**: Uses `Transformers.js` to run embeddings (`Xenova/all-MiniLM-L6-v2`) directly in your browser's memory via an isolated Web Worker.
- **📄 Universal Document Extractor**: Ingests, parses, and securely stores `.pdf`, `.docx`, `.md`, `.txt`, and image files (via local OCR) without any cloud APIs.
- **🕵️‍♂️ Anti-Shoulder-Surfing UX**: Features a "Privacy Blur" mode and OS-level clipboard risk warnings to protect your decrypted information in public spaces.
- **⏱️ Inactivity Auto-Lock**: A secure session manager that automatically locks the vault and purges decryption keys from memory after 15 minutes of inactivity.
- **🧨 The Escape Hatch**: Total data portability. Export your entire encrypted IndexedDB state as a `.vault` file and restore it seamlessly on any device.

## 🎨 Design Philosophy

ZenVault AI features a premium **Obsidian & Neon** Cyberpunk-Minimalist aesthetic. 
- Deep carbon backgrounds (`#09090b`).
- Glassmorphism UI panels with subtle borders.
- Emerald Green and Cyber Violet accents to emphasize security and AI capabilities.
- Fluid micro-animations powered by Framer Motion.

## 🚀 Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

1. **Initialize your Vault**: Enter a master password. This will salt and derive a secure WebCrypto key.
2. **Upload Assets**: Drop your sensitive documents into the repository. They are instantly encrypted and shredded into semantic vectors.
3. **Engage the AI**: Click on the Vault Chat and start querying your local repository safely.

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4 & Framer Motion
- **AI Engine**: Transformers.js (Web Worker)
- **Database**: LocalForage (IndexedDB)
- **Cryptography**: Native Web Crypto API (`AES-GCM`)
- **Parsers**: PDF.js, Mammoth (.docx), Tesseract.js (OCR)

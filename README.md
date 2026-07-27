# 🚀 Sprintive (ScrumMind) — AI-Powered Agile & Meeting Intelligence Platform

[![React](https://img.shields.io/badge/Frontend-React%2019%20%7C%20TypeScript%20%7C%20Tailwind%20v4-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%7C%20Express%20%7C%20Socket.io-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![AI Engine](https://img.shields.io/badge/AI%20Service-Python%20%7C%20FastAPI%20%7C%20Faster--Whisper-teal?style=for-the-badge&logo=python)](https://fastapi.tiangolo.com/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)

**Sprintive (ScrumMind)** is a next-generation AI-powered Agile project management platform and meeting intelligence system. It automates standups, records meetings, transcribes audio in real-time, extracts action items and blockers using AI, and automatically syncs tickets to an interactive Kanban board.

---

## ✨ Features

- 🎙️ **Real-Time Video & Audio Meetings**: Built-in meeting rooms powered by Socket.io and WebRTC, featuring dynamic audio spectrum visualizers, screen sharing, and participant controls.
- ⚡ **AI Transcription Engine**: Automatic speech-to-text powered by `faster-whisper` for fast, accurate meeting transcripts with speaker identification.
- 🤖 **Automated Task Extraction**: AI scans meeting conversations to automatically identify tasks, assigned owners, deadlines, and critical blockers (`🚫 Blocker`, `📅 Deadline`, `✅ Action`).
- 📋 **Integrated Kanban Board**: Live sprint board with drag-and-drop workflow (`Backlog`, `To Do`, `In Progress`, `Review`, `Done`) automatically populated from meeting outcomes.
- 👥 **Workspace & Team Management**: Multi-tenant workspace setup, team invitation links, role-based permissions, and team member management.
- 🔐 **Authentication & Security**: Secure authentication supporting JWT, Google OAuth 2.0, and GitHub OAuth 2.0.
- 🎨 **Modern Design System**: Built with Tailwind CSS v4, smooth Framer Motion micro-animations, and full dark/light mode support.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client ["Frontend (React 19 + TypeScript + Tailwind v4)"]
        UI[Landing Page & Dashboard]
        Lobby[Meeting Lobby & WebRTC Room]
        Kanban[Kanban Board Component]
    end

    subgraph CoreBackend ["Backend API (Node.js + Express)"]
        API[REST API Server]
        Socket[Socket.io Real-Time Engine]
        Auth[Passport.js OAuth & JWT]
        S3[AWS S3 Audio/Video Storage]
    end

    subgraph AIService ["AI Service (Python + FastAPI)"]
        FastAPI[FastAPI Gateway]
        Whisper[Faster-Whisper STT Model]
        Extractor[Task & Blocker AI Extractor]
    end

    subgraph Data ["Database"]
        DB[(PostgreSQL)]
    end

    UI -->|HTTPS / REST| API
    Lobby <-->|WebSockets| Socket
    API --> Auth
    API <--> DB
    Socket <--> AIService
    FastAPI --> Whisper
    FastAPI --> Extractor
    API --> S3
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Custom CSS Variables
- **Animations**: Framer Motion
- **State & Data**: Zustand, TanStack React Query v5
- **Real-Time & Networking**: Socket.io-client, Axios, React Router v7
- **Icons**: Lucide React, React Icons

### Backend
- **Runtime**: Node.js (>= 18.0.0), Express
- **Real-Time**: Socket.io
- **Authentication**: Passport.js (JWT, Google OAuth 2.0, GitHub OAuth 2.0), BcryptJS
- **Validation**: Zod
- **Database Client**: `pg` (PostgreSQL)
- **Storage**: AWS SDK v3 (S3 Presigned URLs)

### AI Service
- **Framework**: Python 3.10+, FastAPI, Uvicorn
- **Speech-to-Text**: `faster-whisper`
- **Audio Processing**: NumPy, SoundFile, WebSockets

### Database
- **Engine**: PostgreSQL with custom SQL schema migrations

---

## 📁 Repository Structure

```
Sprintive/
├── Frontend/             # React 19 + Vite + Tailwind CSS v4 client
│   ├── src/
│   │   ├── components/   # UI components (Navbar, Hero, Kanban, Meetings)
│   │   ├── context/      # React Context (ThemeContext, AuthContext)
│   │   ├── pages/        # Route pages (Auth, Meetings, Team Management)
│   │   ├── services/     # API & Socket clients
│   │   └── index.css     # Global styles & Tailwind v4 theme definitions
│   ├── package.json
│   └── vite.config.ts
├── backend/              # Node.js Express REST API & Socket.io server
│   ├── src/
│   │   ├── config/       # Environment & Database config
│   │   ├── controllers/  # API endpoint handlers
│   │   ├── routes/       # Express route definitions
│   │   └── sockets/      # Real-time WebRTC & chat handlers
│   └── package.json
├── ai-service/           # FastAPI + Faster-Whisper AI engine
│   ├── app/              # Speech recognition & task extraction logic
│   ├── main.py           # FastAPI server entrypoint
│   └── requirements.txt
└── database/             # PostgreSQL database migrations & schema
    └── schema/
        └── schema.sql    # Core database tables & constraints
```

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have the following installed on your machine:
- **Node.js**: v18.0.0 or higher
- **Python**: v3.10 or higher
- **PostgreSQL**: v14 or higher
- **Git**

---

### 1. Database Setup

1. Create a PostgreSQL database (e.g., `sprintive_db`):
   ```sql
   CREATE DATABASE sprintive_db;
   ```
2. Run the initial schema file:
   ```bash
   psql -U postgres -d sprintive_db -f database/schema/schema.sql
   ```

---

### 2. Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres:password@localhost:5432/sprintive_db
   JWT_SECRET=your_jwt_secret_here
   FRONTEND_URL=http://localhost:5173
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

---

### 3. AI Service Setup

1. Navigate to the `ai-service` directory:
   ```bash
   cd ai-service
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   python main.py
   ```

---

### 4. Frontend Setup

1. Navigate to the `Frontend` directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file:
   ```env
   VITE_API_URL=http://localhost:5000
   ```
4. Launch the frontend development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:5173`.

---

## 📜 Available Scripts

### Frontend
- `npm run dev`: Starts the Vite dev server.
- `npm run build`: Compiles TypeScript and builds the production bundle with Vite.
- `npm run preview`: Previews the production build locally.

### Backend
- `npm run dev`: Launches backend server with `nodemon` for auto-reloading.
- `npm start`: Runs backend in production mode.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

# Voice to Note 🎙️✨

A premium, AI-powered transcription and summarization platform. Transform your audio and video recordings into structured, searchable, and labeled notes instantly.

## 🚀 Features

- **Deepgram Nova-2 Integration**: Blazing fast AI transcription with superior accuracy.
- **Native Diarization**: Automatically identifies and labels different speakers in a chat-style interface.
- **Instant Summarization**: Get executive summaries and key insights without reading the whole transcript.
- **Premium Dashboard**: A sleek, dark-themed UI with a compact, professional design.
- **Smart Search**: Filter transcripts to find specific keywords or sections instantly.
- **Multiple Exports**: Download your reports as `.txt` or professional `.pdf` documents.
- **Local Persistence**: Your recent notes are saved locally so you never lose your work.

## 🛠️ Technology Stack

- **Frontend**: React + Vite + TypeScript, Tailwind CSS, Framer Motion, Lucide React.
- **Backend**: Node.js, Express, Multer.
- **AI Engines**: Deepgram (Transcription & Summarization).

## 📦 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/dineshkodali/voice-to-note.git
   ```

2. **Install dependencies**:
   ```bash
   # In the root, server, and client directories
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `server` directory:
   ```env
   PORT=5000
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   ```

4. **Run the Application**:
   ```bash
   # From the root directory
   npm run dev
   ```

## 📜 License

MIT License. Developed with ❤️ by Dinesh Kodali.

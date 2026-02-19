const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@deepgram/sdk');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Ensure .env is loaded from the correct path
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Debug: Check if API key is loaded
console.log('DEEPGRAM_API_KEY detected:', process.env.DEEPGRAM_API_KEY ? 'Yes' : 'No');

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('--- New Upload Request ---');
    if (!req.file) {
      console.log('Error: No file in request');
      return res.status(400).send({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;
    console.log('File received:', req.file.originalname, 'at', filePath);

    // 1. Transcribe & Summarize with Deepgram
    console.log('Starting Deepgram processing (Transcription + Diarization + Summarization)...');

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      fs.readFileSync(filePath),
      {
        model: 'nova-2',
        smart_format: true,
        diarize: true,
        summarize: 'v2', // v2 summarization
      },
    );

    if (error) {
      console.error('Deepgram API Error:', error);
      throw new Error(`Deepgram Error: ${error.message}`);
    }

    // Process Deepgram result for diarization
    const paragraphs = result.results.channels[0].alternatives[0].paragraphs?.paragraphs || [];
    let utterances = [];

    if (paragraphs.length > 0) {
      utterances = paragraphs.map(p => ({
        speaker: `Speaker ${p.speaker}`,
        text: p.sentences.map(s => s.text).join(' '),
      }));
    } else {
      utterances = [{
        speaker: "Speaker",
        text: result.results.channels[0].alternatives[0].transcript
      }];
    }

    const fullTranscript = utterances.map(u => `[${u.speaker}]: ${u.text}`).join('\n\n');

    // Extract Summary from Deepgram result
    const summaryResult = result.results.channels[0].alternatives[0].summaries?.[0]?.summary || "Summary not available for this audio length or quality.";

    console.log('Deepgram processing complete.');

    // Clean up uploaded file
    fs.unlinkSync(filePath);
    console.log('Cleanup: Deleted temporary file.');

    res.json({
      transcript: fullTranscript,
      utterances: utterances, // New field for chat UI
      summary: summaryResult,
      bullets: "Key insights are included in the summary above. Speaker labeling is active in the full transcript.",
    });
  } catch (error) {
    console.error('CRITICAL ERROR in /api/upload:', error);
    res.status(500).send({ message: 'Error processing audio', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

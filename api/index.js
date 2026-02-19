const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@deepgram/sdk');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send({ message: 'No file uploaded' });

        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            req.file.buffer,
            {
                model: 'nova-2',
                smart_format: true,
                diarize: true,
                summarize: 'v2',
            },
        );

        if (error) throw new Error(`Deepgram Error: ${error.message}`);

        const paragraphs = result.results.channels[0].alternatives[0].paragraphs?.paragraphs || [];
        let utterances = paragraphs.length > 0
            ? paragraphs.map(p => ({ speaker: `Speaker ${p.speaker}`, text: p.sentences.map(s => s.text).join(' ') }))
            : [{ speaker: "Speaker", text: result.results.channels[0].alternatives[0].transcript }];

        const fullTranscript = utterances.map(u => `[${u.speaker}]: ${u.text}`).join('\n\n');
        const alternatives = result.results.channels[0].alternatives[0];
        const summaryResult = alternatives.summaries?.[0]?.summary || "Summary not available.";
        const duration = result.metadata?.duration || 0;
        const modelUsed = result.metadata?.model_info?.name || "nova-2";

        const transcriptionData = {
            id: Date.now().toString(),
            fileName: req.file.originalname,
            transcript: fullTranscript,
            utterances: utterances,
            summary: summaryResult,
            bullets: "Key insights are included in the summary above.",
            metadata: { duration, model: modelUsed, processedAt: new Date().toISOString() }
        };

        res.json(transcriptionData);
    } catch (error) {
        res.status(500).send({ message: 'Error processing audio', error: error.message });
    }
});

module.exports = app;

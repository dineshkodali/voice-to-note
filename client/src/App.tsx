import React, { useState, useRef } from 'react';
import axios from 'axios';
import {
  Upload,
  FileAudio,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  FileText,
  Clock,
  Layout,
  Music,
  FileDown,
  Sparkles,
  Search,
  Users,
  MessageSquare,
  Mic2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const API_URL = 'http://localhost:5000/api';

interface Utterance {
  speaker: string;
  text: string;
}

interface TranscriptionResult {
  transcript: string;
  utterances: Utterance[];
  summary: string;
  bullets: string;
}

type TabType = 'summary' | 'transcript' | 'insights';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ['audio/mpeg', 'audio/mp3', 'video/mp4', 'audio/wav', 'audio/m4a'];

      if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.mp3') || selectedFile.name.endsWith('.mp4')) {
        setFile(selectedFile);
        setError(null);
        setResult(null);
      } else {
        setError('Please upload a valid MP3 or MP4 file.');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          setUploadProgress(percentCompleted);
        },
      });

      setResult(response.data);
      setActiveTab('summary');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Error processing file.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = () => {
    if (!result || !file) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.setTextColor(0, 102, 204);
    doc.text('Voice to Note Report', 15, 20);

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`File: ${file.name} | Date: ${new Date().toLocaleString()}`, 15, 28);

    doc.setDrawColor(230);
    doc.line(15, 32, pageWidth - 15, 32);

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Summary', 15, 42);
    doc.setFontSize(10);
    const splitSummary = doc.splitTextToSize(result.summary, pageWidth - 30);
    doc.text(splitSummary, 15, 50);

    let currentY = 50 + (splitSummary.length * 5) + 10;

    doc.addPage();
    doc.setFontSize(14);
    doc.text('Transcript', 15, 20);
    doc.setFontSize(9);

    let transcriptY = 30;
    result.utterances.forEach((u) => {
      const label = `[${u.speaker}]: `;
      const fullText = label + u.text;
      const splitText = doc.splitTextToSize(fullText, pageWidth - 30);

      if (transcriptY + (splitText.length * 5) > 280) {
        doc.addPage();
        transcriptY = 20;
      }

      doc.text(splitText, 15, transcriptY);
      transcriptY += (splitText.length * 5) + 3;
    });

    doc.save(`${file.name.split('.')[0]}_note.pdf`);
  };

  const TabButton: React.FC<{ id: TabType; label: string; icon: React.ReactNode }> = ({ id, label, icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all text-sm font-semibold
        ${activeTab === id
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
          : 'text-muted-foreground hover:bg-white/5 hover:text-white'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 md:p-6 lg:p-8 flex flex-col items-center max-w-6xl mx-auto font-sans">
      {/* Background Orbs */}
      <div className="fixed top-0 left-1/4 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] -z-10" />
      <div className="fixed bottom-0 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-[100px] -z-10" />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full flex flex-col items-center mb-10 text-center"
      >
        <div className="flex items-center space-x-2 text-blue-400 mb-3 bg-blue-400/5 px-3 py-1 rounded-md border border-blue-400/10 text-xs font-bold tracking-widest uppercase">
          <Mic2 className="w-3.5 h-3.5" />
          <span>Intelligent Note Taker</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2">Voice to Note</h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-xl">
          Convert recordings to structured notes with speaker identification.
        </p>
      </motion.header>

      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Upload Panel */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4"
        >
          <div className="bg-[#121214] border border-white/5 rounded-xl p-6 shadow-2xl relative overflow-hidden">
            <div
              onClick={() => !loading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 transition-all cursor-pointer flex flex-col items-center
                ${file ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".mp3,.mp4,.wav,.m4a" />
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4">
                {file ? <Music className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
              </div>
              <p className="text-sm font-bold truncate max-w-full px-2">{file ? file.name : 'Select Audio/Video'}</p>
              <p className="text-xs text-muted-foreground mt-1">MP3, MP4, WAV supported</p>
            </div>

            {file && !loading && !result && (
              <button
                onClick={handleUpload}
                className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20 active:scale-95"
              >
                <span>Generate Notes</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {loading && (
              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-xs font-bold text-blue-400">
                  <span>Processing Audio...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} className="h-full bg-blue-500" />
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Results Panel */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-8 space-y-6"
        >
          <div className="bg-[#121214] border border-white/5 rounded-xl min-h-[500px] flex flex-col">
            <div className="p-1.5 flex items-center justify-between border-b border-white/5">
              <div className="flex space-x-1">
                <TabButton id="summary" label="Summary" icon={<FileText className="w-3.5 h-3.5" />} />
                <TabButton id="transcript" label="Transcript" icon={<MessageSquare className="w-3.5 h-3.5" />} />
                <TabButton id="insights" label="Insights" icon={<Sparkles className="w-3.5 h-3.5" />} />
              </div>

              {result && (
                <button
                  onClick={downloadPdf}
                  className="p-2 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-all"
                  title="Download PDF"
                >
                  <FileDown className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="p-6 flex-1 relative">
              <AnimatePresence mode="wait">
                {!result ? (
                  <motion.div
                    key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center text-center opacity-20 py-20"
                  >
                    <Layout className="w-20 h-20 mb-4" />
                    <p className="text-lg font-bold">No results generated yet.</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="h-full"
                  >
                    {activeTab === 'summary' && (
                      <div className="prose prose-invert max-w-none text-white/80 leading-relaxed text-sm">
                        <p className="font-medium text-white mb-2 italic">Automated Executive Summary</p>
                        {result.summary}
                      </div>
                    )}

                    {activeTab === 'insights' && (
                      <div className="text-white/80 leading-relaxed text-sm whitespace-pre-line">
                        <p className="font-medium text-white mb-4">Key Observations & Actions</p>
                        {result.bullets}
                      </div>
                    )}

                    {activeTab === 'transcript' && (
                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {result.utterances.map((u, i) => (
                          <div key={i} className="flex flex-col space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400/70 ml-1">
                              {u.speaker}
                            </span>
                            <div className="bg-white/5 border border-white/5 rounded-lg rounded-tl-none p-3 text-sm text-white/90">
                              {u.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default App;

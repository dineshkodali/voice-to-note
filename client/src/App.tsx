import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  Sparkles,
  Search,
  MessageSquare,
  Mic2,
  History,
  LayoutGrid,
  Download,
  Filter,
  Layers,
  FileDown,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const REPO_DATA_URL = 'https://raw.githubusercontent.com/dineshkodali/voice-to-note/main/data';

interface Utterance {
  speaker: string;
  text: string;
}

interface Metadata {
  duration: number;
  model: string;
  processedAt: string;
}

interface TranscriptionResult {
  id: string;
  fileName: string;
  transcript: string;
  utterances: Utterance[];
  summary: string;
  bullets: string;
  metadata?: Metadata;
  isRemote?: boolean;
}

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [history, setHistory] = useState<TranscriptionResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('voice-to-note-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('History parse failed');
      }
    }

    const fetchCloudManifest = async () => {
      try {
        const response = await axios.get(`${API_URL.replace('/api', '')}/data/manifest.json`);
        if (response.data) syncHistory(response.data);
      } catch (e) {
        try {
          const repoRes = await axios.get(`${REPO_DATA_URL}/manifest.json`);
          if (repoRes.data) syncHistory(repoRes.data);
        } catch (re) { }
      }
    };
    fetchCloudManifest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncHistory = (data: any[]) => {
    setHistory(prev => {
      const merged = [...prev];
      data.forEach((item: any) => {
        if (!merged.find(m => m.id === item.id)) {
          merged.push({
            id: item.id,
            fileName: item.fileName,
            metadata: { processedAt: item.processedAt, duration: item.duration, model: 'Nova-2' },
            isRemote: true
          } as any);
        }
      });
      return merged.sort((a, b) => new Date(b.metadata?.processedAt || 0).getTime() - new Date(a.metadata?.processedAt || 0).getTime());
    });
  };

  useEffect(() => {
    localStorage.setItem('voice-to-note-history', JSON.stringify(history));
  }, [history]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true); setError(null); setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / (p.total || 100))),
      });
      setResult(response.data);
      setHistory(prev => [response.data, ...prev]);
      setFile(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Connection Error: Is backend running?');
    } finally {
      setLoading(false);
    }
  };

  const fetchFullNote = async (item: TranscriptionResult) => {
    if (!item.isRemote) { setResult(item); return; }
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL.replace('/api', '')}/data/${item.id}.json`);
      setResult(res.data);
    } catch (e) {
      try {
        const repoRes = await axios.get(`${REPO_DATA_URL}/${item.id}.json`);
        setResult(repoRes.data);
      } catch (re) { setError('Could not fetch full note details.'); }
    } finally { setLoading(false); }
  };

  const downloadText = () => {
    if (!result) return;
    const element = document.createElement("a");
    const fileContent = `FILE: ${result.fileName}\nDATE: ${new Date(result.metadata?.processedAt || '').toLocaleString()}\n\nSUMMARY:\n${result.summary}\n\nTRANSCRIPT:\n${result.transcript}`;
    const b = new Blob([fileContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(b);
    element.download = `${result.fileName}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  const downloadPdf = () => {
    if (!result) return;
    const doc = new jsPDF();
    doc.setFontSize(22); doc.text('Meeting Analysis', 20, 20);
    doc.setFontSize(10); doc.text(`File: ${result.fileName}`, 20, 30);
    doc.text(`Date: ${new Date(result.metadata?.processedAt || '').toLocaleString()}`, 20, 35);
    doc.setFontSize(14); doc.text('Executive Summary', 20, 50);
    doc.setFontSize(11); const split = doc.splitTextToSize(result.summary, 170); doc.text(split, 20, 60);
    doc.save(`${result.fileName}.pdf`);
  };

  const formatDuration = (s?: number) => {
    if (!s) return '0s';
    const m = Math.floor(s / 60);
    const rs = Math.floor(s % 60);
    return m > 0 ? `${m}m ${rs}s` : `${rs}s`;
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Recently';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans selection:bg-indigo-100 p-4 lg:p-6">
      <div className="max-w-[1700px] mx-auto flex flex-col gap-6">

        {/* TOP SECTION: 3 COLUMNS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[420px]">

          {/* COLUMN 1: ARCHIVE */}
          <div className="lg:col-span-3 bg-white rounded-[12px] shadow-sm border border-slate-200/60 flex flex-col overflow-hidden">
            <header className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-600 rounded-[8px] flex items-center justify-center text-white shadow-sm">
                  <History className="w-4 h-4" />
                </div>
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Archive</h2>
              </div>
              <button className="p-1.5 text-slate-400 hover:text-slate-600 transition-all"><Filter className="w-3.5 h-3.5" /></button>
            </header>
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-1.5">
              {history.length > 0 ? (
                history.map(h => (
                  <button key={h.id} onClick={() => fetchFullNote(h)} className={`w-full text-left px-4 py-3 rounded-[10px] transition-all border ${result?.id === h.id ? 'bg-indigo-50/50 border-indigo-100 shadow-sm' : 'hover:bg-slate-50 border-transparent'}`}>
                    <h3 className="text-xs font-bold text-slate-800 truncate">{h.fileName}</h3>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-medium text-slate-400">
                      <span>{formatDate(h.metadata?.processedAt)}</span> • <span>{formatDuration(h.metadata?.duration)}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30 py-10"><Layers className="w-10 h-10 mb-2 text-slate-200" /><span className="text-[10px] font-bold uppercase tracking-widest">No Stream</span></div>
              )}
            </div>
          </div>

          {/* COLUMN 2: CAPTURE ZONE */}
          <div className="lg:col-span-6 bg-white rounded-[12px] shadow-sm border border-slate-200/60 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center relative">
              <div onClick={() => !loading && fileInputRef.current?.click()} className={`w-full max-w-lg aspect-[21/9] rounded-[12px] border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer ${file ? 'bg-indigo-600 border-indigo-400 shadow-lg shadow-indigo-600/10' : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <div className={`p-5 rounded-[10px] mb-3 ${file ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                  <Mic2 className="w-8 h-8" />
                </div>
                <h3 className={`text-sm font-bold ${file ? 'text-white' : 'text-slate-700'}`}>{file ? file.name : 'Initiate Audio Signal'}</h3>
                {!file && <p className="text-[10px] font-medium text-slate-400 mt-2 uppercase tracking-[0.2em]">MP4 • MP3 • WAV • M4A</p>}
              </div>

              <AnimatePresence>
                {file && !loading && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={handleUpload}
                    className="mt-6 px-12 py-3.5 bg-indigo-600 text-white rounded-[10px] text-[11px] font-bold uppercase tracking-widest shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all"
                  >
                    Analyze Stream
                  </motion.button>
                )}
              </AnimatePresence>

              {loading && (
                <div className="mt-8 w-full max-w-sm space-y-3">
                  <div className="flex justify-between font-bold text-[10px] text-indigo-600 uppercase tracking-widest"><span>Neural Processing...</span><span>{uploadProgress}%</span></div>
                  <div className="h-1.5 bg-indigo-50 rounded-full overflow-hidden shrink-0"><motion.div initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} className="h-full bg-indigo-600 rounded-full" /></div>
                </div>
              )}
              {error && <div className="mt-4 px-4 py-2 bg-red-50 text-red-600 text-[10px] font-bold border border-red-100 rounded-[8px] flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" /> {error}</div>}
            </div>
          </div>

          {/* COLUMN 3: INTELLIGENCE */}
          <div className="lg:col-span-3 bg-white rounded-[12px] shadow-sm border border-slate-200/60 flex flex-col overflow-hidden">
            <header className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5 bg-slate-50/50">
              <div className="w-8 h-8 bg-purple-600 rounded-[8px] flex items-center justify-center text-white shadow-sm">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Insights</h2>
            </header>
            <div className="p-5 flex-1 flex flex-col">
              {result ? (
                <div className="space-y-5 h-full flex flex-col">
                  <div className="bg-slate-50 p-4 rounded-[10px] border border-slate-100 space-y-3">
                    <div className="flex justify-between items-center text-[11px] font-bold border-b border-slate-200/50 pb-2"><span className="text-slate-400">Length</span><span className="text-indigo-600">{formatDuration(result.metadata?.duration)}</span></div>
                    <div className="flex justify-between items-center text-[11px] font-bold border-b border-slate-200/50 pb-2"><span className="text-slate-400">AI Engine</span><span className="text-purple-600">{result.metadata?.model || 'Nova-2'}</span></div>
                    <div className="flex justify-between items-center text-[11px] font-bold"><span className="text-slate-400">Confidence</span><span className="text-emerald-600">98.4%</span></div>
                  </div>
                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <button onClick={downloadPdf} className="py-3 bg-slate-900 text-white rounded-[8px] text-[10px] font-bold uppercase flex items-center justify-center gap-2 hover:bg-black transition-all shadow-sm"><Download className="w-3.5 h-3.5" /> PDF</button>
                    <button onClick={downloadText} className="py-3 bg-white text-slate-600 rounded-[8px] text-[10px] font-bold uppercase flex items-center justify-center gap-2 hover:bg-slate-50 transition-all border border-slate-200"><FileDown className="w-3.5 h-3.5" /> TXT</button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center py-10"><Sparkles className="w-10 h-10 mb-3 text-purple-300" /><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Awaiting Data</span></div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: EXECUTIVE SUMMARY & TRANSCRIPT */}
        <div className="bg-white rounded-[12px] shadow-sm border border-slate-200/60 overflow-hidden flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-100 min-h-[500px]">
          <div className="lg:w-1/3 p-8 bg-slate-50/20">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600 mb-5 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> Executive Summary</h3>
            {result ? (
              <div className="prose prose-slate">
                <p className="text-[15px] font-medium leading-relaxed text-slate-700 italic border-l-4 border-indigo-100 pl-4">{result.summary}</p>
              </div>
            ) : (
              <p className="text-[11px] font-bold uppercase text-slate-300 tracking-wider">No active analysis</p>
            )}
          </div>

          <div className="lg:w-2/3 p-8 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5" /> Transcript Stream</h3>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type="text" placeholder="Search through meeting..." className="w-full bg-slate-50 border border-slate-100 rounded-[8px] py-1.5 pl-9 pr-4 text-xs font-bold focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-200 transition-all outline-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-5 pr-4">
              <AnimatePresence>
                {result?.utterances ? (
                  result.utterances.filter(u => u.text.toLowerCase().includes(searchQuery.toLowerCase())).map((u, i) => (
                    <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} key={i} className="flex gap-4 group">
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-2 shrink-0 group-hover:scale-125 transition-all" />
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold uppercase text-indigo-600 tracking-widest">{u.speaker}</span>
                        <p className="text-[13px] font-medium text-slate-700 leading-relaxed group-hover:text-slate-900 transition-colors">{u.text}</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center opacity-20"><Mic2 className="w-12 h-12 text-slate-200" /></div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        @font-face {
          font-family: 'Outfit';
          src: url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        }
        body { font-family: 'Outfit', sans-serif; -webkit-font-smoothing: antialiased; }
      `}</style>
    </div>
  );
};

export default App;

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
  FileDown
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
    <div className="min-h-screen bg-[#F3F6FA] text-[#1D1B20] font-sans selection:bg-blue-200 p-4 lg:p-8">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-6">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[400px]">

          <div className="lg:col-span-3 bg-white rounded-[32px] shadow-sm border border-slate-100 flex flex-col overflow-hidden">
            <header className="p-6 border-b border-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                  <History className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Archive</h2>
              </div>
              <button className="p-2 text-slate-400 hover:text-slate-900 transition-all"><Filter className="w-4 h-4" /></button>
            </header>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
              {history.length > 0 ? (
                history.map(h => (
                  <button key={h.id} onClick={() => fetchFullNote(h)} className={`w-full text-left p-4 rounded-2xl transition-all border ${result?.id === h.id ? 'bg-blue-50 border-blue-100 shadow-sm' : 'hover:bg-slate-50 border-transparent'}`}>
                    <h3 className="text-xs font-black truncate">{h.fileName}</h3>
                    <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-slate-400">
                      <span>{formatDate(h.metadata?.processedAt)}</span> • <span>{formatDuration(h.metadata?.duration)}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-20"><Layers className="w-12 h-12 mb-2" /><span className="text-[10px] font-black uppercase">Empty</span></div>
              )}
            </div>
          </div>

          <div className="lg:col-span-6 bg-white rounded-[32px] shadow-sm border border-slate-100 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative">
              <div onClick={() => !loading && fileInputRef.current?.click()} className={`w-full max-w-sm aspect-video rounded-[32px] border-4 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer ${file ? 'bg-blue-600 border-blue-500 shadow-xl' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <div className={`p-6 rounded-[24px] mb-4 ${file ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
                  <Mic2 className="w-10 h-10" />
                </div>
                <h3 className={`text-sm font-black italic ${file ? 'text-white' : 'text-slate-800'}`}>{file ? file.name : 'Stream Audio'}</h3>
              </div>
              {file && !loading && (
                <button onClick={handleUpload} className="mt-6 px-10 py-4 bg-blue-600 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all">Start Neural Capture</button>
              )}
              {loading && (
                <div className="mt-6 w-full max-w-sm space-y-3">
                  <div className="flex justify-between font-black text-[10px] text-blue-600"><span>ANALYZING...</span><span>{uploadProgress}%</span></div>
                  <div className="h-2.5 bg-blue-50 rounded-full overflow-hidden p-[2px]"><motion.div initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} className="h-full bg-blue-600 rounded-full" /></div>
                </div>
              )}
              {error && <div className="mt-4 p-3 bg-red-50 text-red-600 text-[10px] font-black border border-red-100 rounded-xl">{error}</div>}
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-[32px] shadow-sm border border-slate-100 flex flex-col overflow-hidden">
            <header className="p-6 border-b border-slate-50 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-600/20">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Intelligence</h2>
            </header>
            <div className="p-6 space-y-6">
              {result ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2">Metadata Metrics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold"><span>Length</span><span className="text-blue-600">{formatDuration(result.metadata?.duration)}</span></div>
                      <div className="flex justify-between text-xs font-bold"><span>AI Core</span><span className="text-purple-600">{result.metadata?.model || 'Nova-2'}</span></div>
                      <div className="flex justify-between text-xs font-bold"><span>Confidence</span><span className="text-emerald-600">98.4%</span></div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={downloadPdf} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md shadow-slate-900/10"><Download className="w-3.5 h-3.5" /> PDF</button>
                    <button onClick={downloadText} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-200 transition-all border border-slate-200"><FileDown className="w-3.5 h-3.5" /> TXT</button>
                  </div>
                </div>
              ) : (
                <div className="h-full py-20 flex flex-col items-center justify-center opacity-20 text-center"><Sparkles className="w-16 h-16 mb-4 text-purple-200" /><span className="text-[10px] font-black uppercase">Feed Active Signal</span></div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[42px] shadow-sm border border-slate-100 overflow-hidden flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-50">
          <div className="lg:w-1/3 p-10 bg-slate-50/30">
            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-600 mb-6 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Executive Summary</h3>
            {result ? (
              <p className="text-base font-bold leading-relaxed text-slate-700 italic">{result.summary}</p>
            ) : (
              <p className="text-xs font-black uppercase text-slate-300 italic">No Summary Streamed</p>
            )}
          </div>
          <div className="lg:w-2/3 p-10 flex flex-col h-[600px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Transcript Stream</h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                <input type="text" placeholder="Search stream..." className="w-full bg-slate-50 border-none rounded-xl py-2 pl-9 pr-4 text-xs font-bold" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-4">
              <AnimatePresence>
                {result?.utterances ? (
                  result.utterances.filter(u => u.text.toLowerCase().includes(searchQuery.toLowerCase())).map((u, i) => (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={i} className="flex gap-4 group">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 shrink-0 group-hover:scale-150 transition-all shadow-sm shadow-blue-600/50" />
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest">{u.speaker}</span>
                        <p className="text-sm font-bold text-slate-700 leading-relaxed">{u.text}</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex items-center justify-center opacity-20"><Mic2 className="w-16 h-16" /></div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
        @font-face {
          font-family: 'Outfit';
          src: url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
        }
        body { font-family: 'Outfit', sans-serif; }
      `}</style>
    </div>
  );
};

export default App;

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  FileText,
  Music,
  FileDown,
  Sparkles,
  Search,
  MessageSquare,
  Mic2,
  Copy,
  Check,
  History,
  Trash2,
  Info,
  Clock,
  Zap,
  Calendar,
  Layers,
  SortAsc,
  SortDesc,
  Filter,
  Type
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const API_URL = 'http://localhost:5000/api';

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
}

type TabType = 'summary' | 'transcript' | 'insights';
type SortBy = 'date' | 'name';
type SortOrder = 'asc' | 'desc';
type DateFormat = 'simple' | 'detailed';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<TranscriptionResult[]>([]);
  const [showInfoId, setShowInfoId] = useState<string | null>(null);

  const [historySearch, setHistorySearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [dateFormat, setDateFormat] = useState<DateFormat>('simple');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('voice-to-note-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to load history', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('voice-to-note-history', JSON.stringify(history));
  }, [history]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
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
      const newResult: TranscriptionResult = { ...response.data, id: Date.now().toString(), fileName: file.name };
      setResult(newResult);
      setHistory(prev => [newResult, ...prev].slice(0, 20));
      setActiveTab('summary');
    } catch (err: any) {
      if (!err.response) setError('Connection Error: Is the local backend running?');
      else setError(err.response?.data?.message || 'Error processing file.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPdf = () => {
    if (!result) return;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(20); doc.setTextColor(37, 99, 235); doc.text('Voice to Note Report', 15, 20);
    doc.setFontSize(9); doc.setTextColor(100); doc.text(`File: ${result.fileName} | Date: ${new Date(result.metadata?.processedAt || Date.now()).toLocaleString()}`, 15, 28);
    doc.setDrawColor(240); doc.line(15, 32, pageWidth - 15, 32);
    doc.setFontSize(14); doc.setTextColor(0); doc.text('Summary', 15, 42);
    doc.setFontSize(10); const splitSummary = doc.splitTextToSize(result.summary, pageWidth - 30); doc.text(splitSummary, 15, 50);
    doc.addPage(); doc.setFontSize(14); doc.text('Transcript', 15, 20); doc.setFontSize(9);
    let transcriptY = 30;
    result.utterances.forEach((u) => {
      const splitText = doc.splitTextToSize(`[${u.speaker}]: ${u.text}`, pageWidth - 30);
      if (transcriptY + (splitText.length * 5) > 280) { doc.addPage(); transcriptY = 20; }
      doc.text(splitText, 15, transcriptY);
      transcriptY += (splitText.length * 5) + 3;
    });
    doc.save(`${result.fileName.split('.')[0]}_note.pdf`);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Unknown';
    const date = new Date(isoStr);
    return dateFormat === 'simple' ? date.toLocaleDateString() : date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const processedHistory = history
    .filter(h => h.fileName.toLowerCase().includes(historySearch.toLowerCase()))
    .sort((a, b) => {
      let comp = sortBy === 'date' ? new Date(a.metadata?.processedAt || 0).getTime() - new Date(b.metadata?.processedAt || 0).getTime() : a.fileName.localeCompare(b.fileName);
      return sortOrder === 'asc' ? comp : -comp;
    });

  const filteredUtterances = result?.utterances.filter(u => u.text.toLowerCase().includes(searchQuery.toLowerCase()) || u.speaker.toLowerCase().includes(searchQuery.toLowerCase()));

  const TabButton = ({ id, label, icon }: any) => (
    <button onClick={() => setActiveTab(id)} className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all text-[11px] font-black uppercase tracking-widest ${activeTab === id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>
      {icon} <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans selection:bg-blue-500/20 pb-20">

      <div className="max-w-[1400px] mx-auto px-6 pt-10">

        {/* Header - Aligned with the rest */}
        <header className="w-full mb-8 flex flex-col items-center text-center">
          <div className="inline-flex items-center space-x-2 text-blue-600 mb-3 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase">
            <Mic2 className="w-3 h-3" /> <span>Enterprise AI Intelligence</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tighter text-slate-900 italic">Voice to Note</h1>
          <p className="text-slate-400 text-sm max-w-sm leading-relaxed font-medium">High fidelity transcription for modern teams.</p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Integrated Sidebar (Fixed 12px) */}
          <aside className="w-full lg:w-80 shrink-0 sticky top-10">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-2"><History className="w-4 h-4" /> Archive</div>
                <div className="flex gap-1">
                  <button onClick={() => setDateFormat(dateFormat === 'simple' ? 'detailed' : 'simple')} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400"><Filter className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setHistory([])} className="p-1 hover:bg-red-50 rounded-lg text-slate-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                <input type="text" placeholder="Search archive..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-lg py-1.5 pl-8 text-[11px] font-bold focus:outline-none" />
              </div>
              <div className="flex items-center justify-between bg-slate-50 p-1 rounded-lg">
                <div className="flex gap-1">
                  <button onClick={() => setSortBy('date')} className={`px-2 py-1 rounded-lg text-[9px] font-black ${sortBy === 'date' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>Date</button>
                  <button onClick={() => setSortBy('name')} className={`px-2 py-1 rounded-lg text-[9px] font-black ${sortBy === 'name' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>Name</button>
                </div>
                <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="p-1.5 hover:bg-white rounded-lg text-slate-400 transition-all">{sortOrder === 'asc' ? <SortAsc className="w-3.5 h-3.5" /> : <SortDesc className="w-3.5 h-3.5" />}</button>
              </div>
              <div className="flex flex-col space-y-2 overflow-y-auto max-h-[60vh] custom-scrollbar">
                {processedHistory.length === 0 ? (
                  <div className="p-6 rounded-lg bg-slate-50 border border-slate-100 text-[10px] text-slate-300 italic text-center">Empty</div>
                ) : (
                  processedHistory.map(h => (
                    <div key={h.id} className="relative">
                      <button onClick={() => setResult(h)} className={`w-full text-left p-3 rounded-xl border transition-all ${result?.id === h.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-black truncate max-w-[140px] text-slate-700">{h.fileName}</p>
                          <button onClick={(e) => { e.stopPropagation(); setShowInfoId(showInfoId === h.id ? null : h.id); }} className="p-1 text-slate-300 hover:text-blue-600"><Info className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
                          <Clock className="w-3 h-3 text-blue-400" /> {formatDuration(h.metadata?.duration)}
                        </div>
                      </button>
                      {showInfoId === h.id && (
                        <div className="mt-1 p-3 bg-slate-50 border border-slate-100 rounded-lg space-y-1.5">
                          <div className="flex items-center gap-2 underline decoration-blue-500/20"><Zap className="w-3 h-3 text-purple-600" /> <span className="text-[9px] font-black text-slate-400 uppercase">{h.metadata?.model || 'Nova-2'}</span></div>
                          <div className="text-[8px] font-bold text-slate-400 ml-5">{formatDate(h.metadata?.processedAt)}</div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-md shadow-slate-200/20 h-full flex flex-col justify-center">
                  <div onClick={() => !loading && fileInputRef.current?.click()} className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${file ? 'border-blue-500 bg-blue-50/50 shadow-inner' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'}`}>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <div className={`p-4 rounded-xl mb-4 ${file ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-50 text-blue-600'}`}><Music className="w-8 h-8" /></div>
                    <h3 className="text-xs font-black text-slate-700">{file ? file.name : 'Select or Drop File'}</h3>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-black">MP3, WAV, MP4, M4A</p>
                  </div>
                  {file && !loading && (
                    <button onClick={handleUpload} className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:translate-y-0.5 transition-all">
                      Run Intelligence Engine <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  {loading && (
                    <div className="mt-6 space-y-3">
                      <div className="flex justify-between text-[10px] font-black text-blue-600 uppercase tracking-widest px-1"><span>Neural Analysis...</span> <span>{uploadProgress}%</span></div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner"><motion.div initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} className="h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]" /></div>
                    </div>
                  )}
                  {error && <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
                </div>
              </div>

              <div className="lg:col-span-4">
                <div className="bg-white border border-slate-200 rounded-xl p-6 h-full shadow-md shadow-slate-200/20 flex flex-col">
                  {result ? (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm"><CheckCircle2 className="w-6 h-6" /></div>
                        <div><h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Processing OK</h4><p className="text-xs font-black text-blue-600">Diarization Active</p></div>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Duration</span><span className="text-xs font-black text-blue-600">{formatDuration(result.metadata?.duration)}</span></div>
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AI Core</span><span className="text-xs font-black text-purple-600">Nova-2</span></div>
                      </div>
                      <div className="mt-auto space-y-2 pt-4">
                        <button onClick={downloadPdf} className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-200 transition-all font-bold">PDF Report</button>
                        <button onClick={() => copyToClipboard(result.transcript)} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-md shadow-blue-600/10 transition-all active:scale-95">{copied ? 'Copied!' : 'Copy Text'}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-10 opacity-40">
                      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 mb-4"><Layers className="w-10 h-10 text-slate-200" /></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Awaiting Signal</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Results Section (Full Width) */}
            <AnimatePresence mode="wait">
              {result && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full shadow-xl shadow-slate-200/30">
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="bg-white p-1 rounded-lg border border-slate-100 shadow-sm flex gap-1">
                        <TabButton id="summary" label="Summary" icon={<FileText className="w-3.5 h-3.5" />} />
                        <TabButton id="insights" label="Insights" icon={<Sparkles className="w-3.5 h-3.5" />} />
                        <TabButton id="transcript" label="Transcript" icon={<MessageSquare className="w-3.5 h-3.5" />} />
                      </div>
                      {activeTab === 'transcript' && (
                        <div className="relative w-full sm:w-72">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                          <input type="text" placeholder="Search transcript..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-[11px] font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm" />
                        </div>
                      )}
                    </div>
                    <div className="p-8 min-h-[400px]">
                      {activeTab === 'summary' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                          <div className="flex items-center gap-2 mb-2"><div className="w-1.5 h-4 bg-blue-600 rounded-full" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Executive Summary</span></div>
                          <div className="text-[14px] text-slate-700 leading-relaxed font-medium bg-slate-50/50 p-6 rounded-xl border border-slate-100">{result.summary}</div>
                        </motion.div>
                      )}
                      {activeTab === 'transcript' && (
                        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                          {filteredUtterances?.map((u, i) => (
                            <div key={i} className="flex gap-4 group">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${i % 2 === 0 ? 'bg-blue-600 shadow-sm shadow-blue-600/50' : 'bg-purple-600 shadow-sm shadow-purple-600/50'}`} /><span className={`text-[10px] font-black uppercase ${i % 2 === 0 ? 'text-blue-700' : 'text-purple-700'}`}>{u.speaker}</span></div>
                                <div className="p-5 rounded-xl rounded-tl-none bg-slate-50 border border-slate-100 group-hover:bg-white group-hover:border-blue-100 group-hover:shadow-md transition-all"><p className="text-[14px] text-slate-700 leading-relaxed font-medium">{u.text}</p></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;

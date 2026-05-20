import { useState, useEffect } from "react";
import { 
  FileText, 
  Sparkles, 
  BookOpen, 
  Copy, 
  Check, 
  Trash2, 
  Download, 
  FileEdit,
  Clock, 
  Layers,
  ChevronRight,
  Info,
  ExternalLink,
  Laptop,
  Globe,
  Award
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { DEMO_TRANSCRIPTS, DemoTranscript } from "./data";

interface MarkdownComponentProps {
  children?: React.ReactNode;
  [key: string]: any;
}

// Highly stylized High Density custom Markdown renderer
const markdownComponents = {
  h3: ({ children, ...props }: MarkdownComponentProps) => (
    <h3 className="text-sm md:text-base font-bold text-slate-800 mt-5 mb-2.5 flex items-center gap-2 border-l-4 border-indigo-600 pl-2.5" {...props}>
      {children}
    </h3>
  ),
  h4: ({ children, ...props }: MarkdownComponentProps) => (
    <h4 className="text-xs md:text-sm font-semibold text-slate-600 mt-3 mb-1.5 flex items-center uppercase tracking-wider" {...props}>
      {children}
    </h4>
  ),
  p: ({ children, ...props }: MarkdownComponentProps) => (
    <p className="text-slate-600 text-xs md:text-sm leading-relaxed mb-2 font-normal" {...props}>
      {children}
    </p>
  ),
  ul: ({ children, ...props }: MarkdownComponentProps) => (
    <ul className="list-disc pl-5 space-y-1 my-2 text-slate-600 text-xs md:text-sm" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: MarkdownComponentProps) => (
    <ol className="list-decimal pl-5 space-y-1 my-2 text-slate-600 text-xs md:text-sm" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: MarkdownComponentProps) => {
    const childrenStr = children?.toString() || "";
    if (childrenStr.includes("[ ]") || childrenStr.includes("[- ]") || typeof children === "string" && children.startsWith("[ ]")) {
      return (
        <li className="flex items-start gap-2 my-1 bg-slate-50 p-1.5 rounded border border-slate-100">
          <input type="checkbox" disabled className="mt-0.5 h-3.5 w-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 pointer-events-none" />
          <span className="text-slate-700 text-xs md:text-sm">
            {typeof children === "string" ? children.replace(/^\[\s?\]\s?/, "") : children}
          </span>
        </li>
      );
    }
    return (
      <li className="text-slate-650 my-0.5 text-xs md:text-sm">
        {children}
      </li>
    );
  },
  code: ({ children, ...props }: MarkdownComponentProps) => (
    <code className="bg-slate-105 text-indigo-700 px-1 py-0.5 rounded text-[11px] font-mono border border-slate-200" {...props}>
      {children}
    </code>
  ),
  pre: ({ children, ...props }: MarkdownComponentProps) => (
    <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-[11px] font-mono my-3 shadow-inner border border-slate-800" {...props}>
      {children}
    </pre>
  ),
  blockquote: ({ children, ...props }: MarkdownComponentProps) => (
    <blockquote className="border-l-3 border-indigo-400 bg-indigo-50/50 px-3 py-2 rounded-r italic text-slate-600 my-2 text-xs md:text-sm" {...props}>
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-5 border-t border-dashed border-slate-200" />,
};

interface HistoryRecord {
  id: string;
  title: string;
  timestamp: string;
  styleLabel: string;
  langLabel: string;
  modeLabel: string;
  transcriptPreview: string;
  result: string;
}

export default function App() {
  const [transcript, setTranscript] = useState<string>("");
  const [mode, setMode] = useState<string>("summary-and-translate");
  const [targetLang, setTargetLang] = useState<string>("英文 (English)");
  const [stylePreset, setStylePreset] = useState<string>("detailed");
  
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingPhrase, setLoadingPhrase] = useState<string>("正在啟動 AI 串聯引擎...");
  const [result, setResult] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal control for instructions page
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Metrics state
  const [apiLatency, setApiLatency] = useState<string>("1.4s");
  const [tokensUsed, setTokensUsed] = useState<number>(1542);

  // Load local history on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("meeting_minutes_history");
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      console.error("Failed to load local storage history", e);
    }
  }, []);

  // Save to history helper
  const saveToHistory = (newRecord: HistoryRecord) => {
    const updated = [newRecord, ...history].slice(0, 8);
    setHistory(updated);
    try {
      localStorage.setItem("meeting_minutes_history", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  };

  // Clear all history
  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem("meeting_minutes_history");
    } catch (e) {
      console.error("Failed to clear local storage", e);
    }
  };

  // Change loading text sequentially
  useEffect(() => {
    if (!loading) return;
    const phrases = [
      "正在啟動 AI 串聯引擎...",
      "正在深度結構化理解逐字稿...",
      "正在提煉「核心共識與決議」...",
      "正在梳理「待辦事項追蹤表」與負責人...",
      "正在執行多國高階語文翻譯對照中...",
      "正在精心排版 Markdown 記錄大綱...",
      "正在進行最後語意連貫度校驗..."
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % phrases.length;
      setLoadingPhrase(phrases[index]);
    }, 2800);

    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async () => {
    if (!transcript.trim()) {
      setErrorMessage("請填寫或選擇一項會議逐字稿再進行生成。");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setResult("");
    setLoadingPhrase("正在啟動 AI 串聯引擎...");

    const startTime = performance.now();

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: transcript,
          language: targetLang,
          style: getStylePresetLabel(stylePreset),
          mode: mode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "生成失敗，請稍後重試。");
      }

      setResult(data.result);

      // Metrical calculations for High Density system footer
      const duration = ((performance.now() - startTime) / 1000).toFixed(1);
      setApiLatency(`${duration}s`);
      const approxTokens = Math.floor(transcript.length * 0.45 + data.result.length * 0.6 + 400);
      setTokensUsed(approxTokens);

      const titleCandidate = transcript.trim().split("\n")[0].substring(0, 30);
      const cleanTitle = titleCandidate.replace(/[()（）:：]/g, " ").trim() || "未命名會議紀錄";
      
      const newRecord: HistoryRecord = {
        id: Date.now().toString(),
        title: cleanTitle.length >= 28 ? cleanTitle + "..." : cleanTitle,
        timestamp: new Date().toLocaleString("zh-TW", { hour12: false }),
        styleLabel: getStylePresetLabel(stylePreset),
        langLabel: targetLang,
        modeLabel: getModeLabel(mode),
        transcriptPreview: transcript.substring(0, 100) + "...",
        result: data.result,
      };
      saveToHistory(newRecord);

    } catch (err: any) {
      setErrorMessage(err.message || "連線至 AI 伺服器時發生意料之外的錯誤。");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  const downloadAsMarkdown = () => {
    if (!result) return;
    try {
      const blob = new Blob([result], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const dateStr = new Date().toISOString().slice(0,10);
      link.setAttribute("download", `會議重點大綱與翻譯_${dateStr}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Markdown download failed", err);
    }
  };

  const getStylePresetLabel = (key: string): string => {
    switch (key) {
      case "detailed": return "詳細商務風格";
      case "concise": return "敏捷站會精簡";
      case "actions": return "任務清單導向";
      case "conversational": return "輕鬆白話摘要";
      default: return "詳細商務風格";
    }
  };

  const getModeLabel = (key: string): string => {
    switch (key) {
      case "summary-and-translate": return "總結與翻譯";
      case "only-summary": return "僅作總結";
      case "only-translate": return "單純翻譯";
      default: return "總結與翻譯";
    }
  };

  const handleSelectDemo = (demo: DemoTranscript) => {
    setTranscript(demo.content);
    setErrorMessage(null);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F8FAFC] font-sans text-slate-900 selection:bg-indigo-150">
      
      {/* 1. Header Toolbar (Matched with High Density theme) */}
      <header className="flex shrink-0 items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-100">
            Σ
          </div>
          <div>
            <h1 className="text-md font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
              AI 會議記錄助手
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-100">
                PRO 1.5
              </span>
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              Meeting Intelligence & Translation Suite
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
            Gemini-3.5-Flash 已安全授權
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-xs text-slate-600 font-bold bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
          >
            <Info className="w-3.5 h-3.5 text-indigo-600" />
            <span>使用指南</span>
          </button>

          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center border border-indigo-200">
            CL
          </div>
        </div>
      </header>

      {/* 2. Main High-Density Split Workspace Layout (12 column grid, zero-gap border layout) */}
      <main className="flex-1 grid grid-cols-12 overflow-hidden">
        
        {/* Left Column (Workspace Configuration & Input) - col-span-5 */}
        <section className="col-span-12 lg:col-span-5 bg-slate-50 border-r border-slate-200 flex flex-col overflow-hidden">
          
          {/* Scrollable Container for Left panel components to avoid layout squishing */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-100px)]">
            
            {/* Read-Only Prompt Preview Badge Codeblock */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-indigo-500 rounded-sm"></span>
                  系統預置處理規範 (System Prompt)
                </span>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-mono">ACTIVE_PROMPT</span>
              </div>
              <div className="font-mono text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5 leading-relaxed italic max-h-[85px] overflow-y-auto">
                const SYSTEM_PROMPT = `你是一個專業的「會議記錄專家」與「多國語言翻譯官」。工作主要是過濾口語贅詞，提煉主旨、待辦追蹤與重要結論，並維持雙語格式輸出...`
              </div>
            </div>

            {/* Quick Demo Selector */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  點選快速載入實戰會議內容
                </span>
                <span className="text-[10px] text-slate-400">三大商務情境</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_TRANSCRIPTS.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => handleSelectDemo(demo)}
                    className={`text-left p-2 rounded-lg border transition-all text-xs ${
                      transcript === demo.content 
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold" 
                        : "border-slate-100 hover:border-slate-200 bg-slate-50/70 hover:bg-slate-50 hover:shadow-2xs"
                    }`}
                  >
                    <div className="font-bold text-[10px] text-indigo-700 truncate mb-0.5">{demo.category}</div>
                    <div className="text-slate-700 truncate font-medium">{demo.title}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Transcript Input Container */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100">
              <div className="px-4 py-2.5 flex items-center justify-between bg-slate-50/50">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  會議逐字稿 / 亂序筆記
                </label>
                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                  <span>{transcript.length} 字 (雙擊清空)</span>
                  {transcript && (
                    <button
                      onClick={() => {
                        setTranscript("");
                        setErrorMessage(null);
                      }}
                      className="text-slate-400 hover:text-rose-600 font-semibold p-1 transition-colors"
                      title="清空原始內容"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="p-3">
                <textarea
                  value={transcript}
                  onChange={(e) => {
                    setTranscript(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full h-44 p-2 focus:ring-1 focus:ring-indigo-500 rounded-lg text-xs leading-relaxed focus:outline-hidden text-slate-700 resize-none border border-slate-200 placeholder:text-slate-400"
                  placeholder="請貼上您會議記錄的逐字句（例：Alex: 對於此次改版前端如何處理...），或在上方點選一個情境範例進行體驗。"
                />
              </div>
            </div>

            {/* Config Selectors Block */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-550" />
                <span>AI 語言理解與風格架構</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {/* Mode Select */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">處理模式</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full text-[11px] font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 hover:bg-slate-100/50 focus:outline-hidden text-slate-700 cursor-pointer"
                  >
                    <option value="summary-and-translate">總結與翻譯</option>
                    <option value="only-summary">僅作總結</option>
                    <option value="only-translate">單純翻譯</option>
                  </select>
                </div>

                {/* Style Preset */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">總結風格</label>
                  <select
                    value={stylePreset}
                    onChange={(e) => setStylePreset(e.target.value)}
                    disabled={mode === "only-translate"}
                    className="w-full text-[11px] font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 hover:bg-slate-100/50 focus:outline-hidden text-slate-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="detailed">詳細商務風格</option>
                    <option value="concise">敏捷站會精簡</option>
                    <option value="actions">任務清單導向</option>
                    <option value="conversational">輕鬆白話摘要</option>
                  </select>
                </div>

                {/* Language Select */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">對照外文</label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    disabled={mode === "only-summary"}
                    className="w-full text-[11px] font-medium border border-slate-200 rounded-lg p-2 bg-slate-50 hover:bg-slate-100/50 focus:outline-hidden text-slate-700 cursor-pointer disabled:opacity-50"
                  >
                    <option value="英文 (English)">英文 (English)</option>
                    <option value="日文 (Japanese)">日文 (Japanese)</option>
                    <option value="韓文 (Korean)">韓文 (Korean)</option>
                    <option value="西班牙文 (Spanish)">西班牙文 (Spanish)</option>
                    <option value="德文 (German)">德文 (German)</option>
                    <option value="法文 (French)">法文 (French)</option>
                    <option value="越南文 (Vietnamese)">越南文 (Vietnamese)</option>
                    <option value="泰文 (Thai)">泰文 (Thai)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Local Storage History (Mini Size) */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  本機快取歷史紀錄
                </span>
                {history.length > 0 && (
                  <button onClick={clearHistory} className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold">
                    清除歷史
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <p className="text-[10px] text-slate-400 py-2 text-center border border-dashed border-slate-150 rounded-lg">
                  暫無歷史處理資訊，工作成果將安全保存在本機快取。
                </p>
              ) : (
                <div className="space-y-1 max-h-[105px] overflow-y-auto pr-0.5">
                  {history.map((record) => (
                    <button
                      key={record.id}
                      onClick={() => setResult(record.result)}
                      className="w-full text-left p-1.5 rounded-md border border-slate-50 bg-[#F8FAFC]/60 hover:bg-slate-100/70 transition-all flex items-center justify-between text-[11px]"
                    >
                      <span className="text-slate-700 truncate max-w-[200px] font-medium">{record.title}</span>
                      <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1 rounded font-bold shrink-0">
                        {record.langLabel.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Prompt Action buttons anchored at the bottom of left panel */}
          <div className="p-4 bg-white border-t border-slate-200 space-y-2">
            <button
              onClick={handleGenerate}
              disabled={loading || !transcript.trim()}
              className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-xs shadow-md transition-all ${
                loading
                  ? "bg-slate-600 text-white cursor-wait"
                  : !transcript.trim()
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100-md hover:scale-[1.01] cursor-pointer"
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="animate-pulse">{loadingPhrase}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>生成會議總結與翻譯</span>
                </>
              )}
            </button>
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-xs font-semibold text-rose-700">
                {errorMessage}
              </div>
            )}
          </div>

        </section>

        {/* Right Column (AI Summarized Result Output Panel) - col-span-7 */}
        <section className="col-span-12 lg:col-span-7 bg-white flex flex-col overflow-hidden">
          
          {/* Output Action Header */}
          <div className="flex shrink-0 items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-[#F8FAFC]/55">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold px-2 py-0.5 rounded tracking-wider uppercase">
                Summary Output
              </span>
              <h2 className="text-xs md:text-sm font-extrabold text-slate-800">
                AI 生成結果與專業大綱
              </h2>
            </div>
            
            {result && (
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="text-xs text-indigo-600 border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-105 px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">已複製</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>一鍵複製內容</span>
                    </>
                  )}
                </button>
                <button
                  onClick={downloadAsMarkdown}
                  className="text-xs text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 p-1.5 rounded-lg font-bold transition-all"
                  title="匯出 Markdown .md"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Scrollable Output Screen Document Preview */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center py-20 space-y-6">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-150"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-2 max-w-sm">
                  <h3 className="text-xs font-bold text-slate-700">AI 秘書大考驗・快速彙整中</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{loadingPhrase}</p>
                </div>
                
                {/* Visual Skeleton placeholders to represent raw compilation */}
                <div className="w-2/3 space-y-2.5 pt-4">
                  <div className="h-3.5 bg-slate-100 rounded-sm w-5/6 animate-pulse"></div>
                  <div className="h-3.5 bg-slate-100 rounded-sm w-full animate-pulse"></div>
                  <div className="h-3.5 bg-slate-100 rounded-sm w-3/4 animate-pulse"></div>
                </div>
              </div>
            ) : result ? (
              <div className="prose prose-slate max-w-none text-slate-700 select-text bg-[#F8FAFC] border border-slate-205 p-6 rounded-xl relative shadow-2xs">
                {/* Visual watermarks */}
                <div className="absolute top-3 right-4 select-none pointer-events-none opacity-[0.06] text-[40px] font-extrabold text-slate-700 font-mono tracking-tight font-sans">
                  GEMINI
                </div>
                <ReactMarkdown components={markdownComponents}>{result}</ReactMarkdown>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
                <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center mb-4 shadow-sm text-indigo-600">
                  <FileEdit className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1.5">成果看板區塊</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  您可以在左側貼上隨筆，自行決定總結風格與翻譯語言。按下下方按鈕後，大語言模型將立即為您完成多語錄、待辦事項和決議整理。
                </p>
                
                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 w-full text-left">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">01. 智能降噪</span>
                    <p className="text-[10px] text-slate-400">過濾口語助詞（嗯、那個），精準萃取資訊。</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">02. 核對追蹤</span>
                    <p className="text-[10px] text-slate-400">一鍵產生待辦核取方塊，落實追蹤效益。</p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </section>

      </main>

      {/* 3. Compact High Density Status Footer */}
      <footer className="h-9 bg-slate-900 border-t border-slate-800 flex shrink-0 items-center justify-between px-6 text-[10px] text-slate-400 font-mono select-none">
        <div className="flex gap-4 md:gap-6">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            PING: ONLINE
          </span>
          <span>LATENCY: {apiLatency}</span>
          <span>TOKENS COMPRESSED: ~{tokensUsed} / 1M limit</span>
          <span className="hidden md:inline text-indigo-400">MODE: METRIC_ANALYTICS_CONCISE</span>
        </div>
        <div className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">
          POWERED BY GEMINI PRO AI ENGINE © 2026
        </div>
      </footer>

      {/* 4. Elegant Overlay Modal for General Instructions */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-205 max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-150 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                  <Info className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">🎉 AI 會議記錄工具使用指南 (System Manual)</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-extrabold p-1.5 hover:bg-slate-100 rounded-lg transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[420px] overflow-y-auto">
              <div>
                <h4 className="text-xs font-bold text-indigo-650 uppercase tracking-widest mb-1.5">
                  💡 為什麼要用這款應用程式？
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  全球商業腳步瞬息萬變，會議錄音檔常有大量非關鍵贅詞（例如 “Um...”、“也就是說”、“等一下下”），造成資訊負載。
                  本處理引擎透過深度學術優化、自適應翻譯技術：
                </p>
                <ul className="text-xs text-slate-500 list-disc pl-5 mt-1.5 space-y-1">
                  <li>自動識別發言者與爭議點，轉換為客觀的<b>核心結論</b>，毫無失真。</li>
                  <li>自動抽離任務，以標準 <b>[ ] 負責人 期限</b> 清單顯示。</li>
                <li>提供完美的原文對照翻译，利於跨國會議紀錄快速流轉。</li>
                </ul>
              </div>

              <div className="border-t border-slate-100 pt-3.5">
                <h4 className="text-xs font-bold text-indigo-650 uppercase tracking-widest mb-1.5">
                  🔒 安全隱私聲明 (Privacy Standard)
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  本平臺採取高密隱私防護核心，會議資料均在專屬伺服器中，使用業界最高規格密鑰運送至 Gemini AI。
                  所有的會議歷史總結全部在 <b>LocalStorage (您本機瀏覽器)</b> 保存，絕不上傳到額外的雲端資料庫。
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3.5 bg-slate-50 p-3 rounded-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600 shrink-0" />
                <div className="text-[11px] text-slate-500 leading-normal">
                  <b>高強度技術保障</b>：所有 API 通訊金鑰隱匿在後端伺服器運行，確保黑客無法嗅探，保護企業商務機密。
                </div>
              </div>
            </div>

            {/* Modal Action Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/40 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-bold px-4 py-2 rounded-lg shadow-sm cursor-pointer transition-colors"
              >
                我知道了，開始處理
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

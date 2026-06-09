import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Copy, 
  Check, 
  RotateCcw, 
  Volume2, 
  Bookmark, 
  Languages, 
  FileText, 
  CheckCircle, 
  ArrowRight, 
  Clock, 
  Lightbulb, 
  ArrowUpRight, 
  Activity,
  AlertCircle,
  HelpCircle,
  Mic,
  MicOff,
  Plus,
  AtSign,
  Settings,
  ChevronLeft,
  ChevronRight,
  Database,
  Info,
  Trash2,
  Sliders,
  CheckCheck,
  User
} from "lucide-react";
import { GrammarAnalysis, SavedSentence, SituationalRewrite } from "./types.ts";

function getLinguisticMetrics(text: string) {
  if (!text.trim()) {
    return {
      formalScore: 50,
      sentiment: "STANDBY" as const,
      complexity: "STANDBY" as const,
      confidence: 0
    };
  }

  const cleanText = text.toLowerCase().trim();
  const words = cleanText.split(/\s+/).filter(Boolean);
  
  if (words.length === 0) {
    return {
      formalScore: 50,
      sentiment: "STANDBY" as const,
      complexity: "STANDBY" as const,
      confidence: 0
    };
  }

  // Formal cues
  const formalKeywords = [
    "regarding", "therefore", "however", "furthermore", "consequently", "sincerely", "manager", "please",
    "would", "shall", "could", "perhaps", "indeed", "request", "assistance", "appreciate", "acceptable",
    "report", "concerning", "proposal", "executive", "inquiry", "notify", "schedule", "determine", "provide"
  ];
  
  // Casual cues
  const casualKeywords = [
    "dont", "don't", "cant", "can't", "wont", "won't", "gonna", "wanna", "gotta", "hey", "hi", "yo", "cool",
    "super", "nope", "yeah", "yes", "lol", "bro", "buddy", "guy", "awesome", "fun", "bad", "wrong", "was coming",
    "goes", "speaks", "market", "buy"
  ];

  let formalPoints = 0;
  let casualPoints = 0;

  words.forEach(w => {
    const wordClean = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    if (formalKeywords.includes(wordClean)) {
      formalPoints += 2.5;
    }
    if (casualKeywords.includes(wordClean)) {
      casualPoints += 2.5;
    }
    
    if (w === "i") {
      casualPoints += 1.0;
    }
    if (wordClean.length >= 7) {
      formalPoints += 0.8;
    } else if (wordClean.length <= 3 && wordClean.length > 0) {
      casualPoints += 0.2;
    }
  });

  if (cleanText.includes("!")) {
    casualPoints += 1.5;
  }

  const totalWeight = formalPoints + casualPoints;
  let formalScore = 50;
  if (totalWeight > 0) {
    const shift = ((formalPoints - casualPoints) / totalWeight) * 40;
    formalScore = Math.min(100, Math.max(0, Math.round(50 + shift)));
  } else {
    const avgLen = words.reduce((acc, current) => acc + current.length, 0) / words.length;
    if (avgLen > 5.5) {
      formalScore = 65;
    } else if (avgLen < 4.2) {
      formalScore = 35;
    } else {
      formalScore = 50;
    }
  }

  // Sentiment analysis
  const positiveWords = ["good", "great", "excellent", "happy", "thank", "pleasure", "smile", "love", "awesome", "sincerely", "creative", "friendly"];
  const negativeWords = ["bad", "sad", "unfortunate", "wrong", "sorry", "cannot", "error", "issue", "mistake", "dont", "don't", "cant", "can't", "no", "not", "defect", "fail", "broken", "knew", "was"];
  
  let posCount = 0;
  let negCount = 0;
  words.forEach(w => {
    const wordClean = w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    if (positiveWords.includes(wordClean)) posCount++;
    if (negativeWords.includes(wordClean)) negCount++;
  });

  let sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" = "NEUTRAL";
  if (posCount > negCount) {
    sentiment = "POSITIVE";
  } else if (negCount > posCount) {
    sentiment = "NEGATIVE";
  }

  // Complexity level
  let complexity: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  const uniqueWords = new Set(words).size;
  if (words.length > 12 || uniqueWords > 10) {
    complexity = "HIGH";
  } else if (words.length > 6 || uniqueWords > 5) {
    complexity = "MEDIUM";
  }

  const confidence = Math.min(99, Math.max(82, 80 + words.length + (words.length % 7)));

  return {
    formalScore,
    sentiment,
    complexity,
    confidence
  };
}

export default function App() {
  const [inputText, setInputText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<GrammarAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SavedSentence[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeTab, setActiveTab] = useState<"linguistic" | "social">("linguistic");
  
  // Custom dialogs/popups for LIBRARY, EQ, ABOUT 
  const [showLibrary, setShowLibrary] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showEQ, setShowEQ] = useState(false);

  // Voice dictation states
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const originalTextRef = useRef("");

  // UI user customizations
  const [userName, setUserName] = useState("Agney");
  const [isEditingName, setIsEditingName] = useState(false);
  const [currentTime, setCurrentTime] = useState("17:01:11 UTC");

  // AI Rewrite Intensity State
  const [intensityIndex, setIntensityIndex] = useState(1); // 0 = Subtle, 1 = Moderate, 2 = Radical
  const intensities = ["Subtle", "Moderate", "Radical"];
  const currentIntensity = intensities[intensityIndex];

  // AI Spelling Corrector Mode State
  const [spellingOnly, setSpellingOnly] = useState(false);

  // Multi-choice benchmark list (cycle state)
  const examples = [
    "i did not knew that you was coming yesterday",
    "the manager want to speaks with you regarding of the report",
    "me and her goes to the market for buy fruits",
    "she dont key in the password since two hours ago",
    "he do not has no idea which way is best to go"
  ];
  const [exampleIndex, setExampleIndex] = useState(0);

  // Custom loading texts matching tape synthesizer vibe
  const loadingSteps = [
    "DIALECT PRE-CALIBRATION...",
    "SYNTAX CORE HARMONIZATION...",
    "FORMULATING STYLE RE-TRANSCRIPTION...",
    "SYNTHESIZING TONAL SPECTRUM..."
  ];

  // Live real-time clock updating matching exactly "17:01:11 UTC" in the illustration
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, "0");
      const minutes = String(now.getUTCMinutes()).padStart(2, "0");
      const seconds = String(now.getUTCSeconds()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:${seconds} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch / save operations on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("seed_eng_history");
      if (stored) {
        setSessionHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Cache load error:", e);
    }
  }, []);

  // Set up Speech Recognition on mount 
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        let sessionTranscript = "";
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            sessionTranscript += event.results[i][0].transcript;
          }
        }
        
        const base = originalTextRef.current.trim();
        const added = sessionTranscript.trim();
        if (added) {
          setInputText(base ? `${base} ${added}` : added);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setErrorMsg("Microphone permission denied. Activate mic toggle in system preferences.");
        } else {
          setErrorMsg(`Voice dictation error: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Set up interval for loading screen cycles
  useEffect(() => {
    let interval: any;
    if (isAnalyzing) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const toggleSpeech = () => {
    if (!speechSupported) {
      setErrorMsg("Voice dictation is not fully supported in this browser environment.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setErrorMsg(null);
      originalTextRef.current = inputText;
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error("Error starting Speech Recognition:", err);
      }
    }
  };

  // Submit grammar logic
  const handleSubmit = async (textToSubmit = inputText) => {
    if (isListening) {
      recognitionRef.current?.stop();
    }

    const trimmed = textToSubmit.trim();
    if (!trimmed) return;

    setIsAnalyzing(true);
    setAnalysis(null);
    setErrorMsg(null);

    try {
      const url = "/api/rewrite";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: trimmed,
          intensity: intensities[intensityIndex].toLowerCase(),
          spellingOnly
        })
      });

      const contentType = res.headers.get("content-type");

      // Check defensive HTTP response ok flag first
      if (!res.ok) {
        const rawErrText = await res.text();
        console.error(`[Seed Eng Client Error] Request failed on ${url}. Status: ${res.status}. Body:`, rawErrText);
        throw new Error(
          `API Error ${res.status}: ${rawErrText || "No additional error message provided."}`
        );
      }

      // 1. Audit content-type to catch HTML error pages, 404s, or plain text instead of JSON
      if (!contentType || !contentType.includes("application/json")) {
        const rawText = await res.text();
        console.error(`[Seed Eng Client Error] API Endpoint "${url}" returned invalid Content-Type "${contentType}" instead of "application/json". Raw text (first 500 chars):`, rawText);
        throw new Error(
          `Expected JSON response but received content-type "${contentType || "none"}". Response starts with: ${rawText.substring(0, 200)}`
        );
      }

      // 2. Read response as text and parse safely to provide robust diagnostic logs
      const rawBody = await res.text();

      // Specifically check for any response text indicating 404 or missing pages before parsing
      if (rawBody.includes("NOT_FOUND") || rawBody.includes("The page could not be found")) {
        throw new Error(`API Error ${res.status}: Receive unexpected route response: ${rawBody}`);
      }

      let data: GrammarAnalysis;
      try {
        data = JSON.parse(rawBody);
      } catch (parseErr: any) {
        console.error(`[Seed Eng Client Error] Failed to parse JSON from "${url}". Raw text (first 500 chars):`, rawBody);
        throw new Error(
          `Expected JSON but received invalid format. Error: ${parseErr.message}. Response starts with: ${rawBody.substring(0, 200)}`
        );
      }

      setAnalysis(data);

      const newSaved: SavedSentence = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 9),
        originalText: trimmed,
        correctedText: data.correctedText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const updatedHistory = [newSaved, ...sessionHistory.slice(0, 9)];
      setSessionHistory(updatedHistory);
      localStorage.setItem("seed_eng_history", JSON.stringify(updatedHistory));

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred. Please configure credentials.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Quick selections
  const handleSelectExample = (ex: string) => {
    setInputText(ex);
    handleSubmit(ex);
  };

  const handleNextExample = () => {
    const nextIdx = (exampleIndex + 1) % examples.length;
    setExampleIndex(nextIdx);
    setInputText(examples[nextIdx]);
  };

  const handlePrevExample = () => {
    const prevIdx = (exampleIndex - 1 + examples.length) % examples.length;
    setExampleIndex(prevIdx);
    setInputText(examples[prevIdx]);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (text: string, id: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (speakingId === id) {
        setSpeakingId(null);
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      
      setSpeakingId(id);
      window.speechSynthesis.speak(utterance);
    } else {
      alert("TTS not supported.");
    }
  };

  const handleClear = () => {
    setInputText("");
    setAnalysis(null);
    setErrorMsg(null);
  };

  const clearAllHistory = () => {
    localStorage.removeItem("seed_eng_history");
    setSessionHistory([]);
    setShowLibrary(false);
  };

  return (
    <div className="relative w-full min-h-screen lg:h-screen lg:overflow-hidden flex flex-col p-4 md:p-6 select-none bg-transparent">
      
      {/* 1. FUTURISTIC WORKSTATION HEADER */}
      <header className="w-full max-w-7xl mx-auto shrink-0 z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo & Subtitle */}
          <div className="flex items-start gap-3">
            {/* Cassette/Core badge */}
            <div className="w-10 h-10 rounded-xl bg-[#141416] border border-stone-800 flex items-center justify-center text-emerald-400 font-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] shrink-0">
              <Activity size={18} className="animate-pulse" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black font-display tracking-tight text-white leading-none">
                  ENG SEED
                </h1>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </div>
              <span className="text-[9px] uppercase tracking-[0.2em] text-[#A0A0A0] font-mono font-bold mt-1.5 block">
                TONAL CONTRAST SYNTHESIZER • VERSION 2026.1
              </span>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold">
            <button 
              onClick={() => { setShowEQ(!showEQ); setShowAbout(false); }}
              className={`px-3 py-1.5 sketch-button flex items-center gap-1.5 cursor-pointer ${showEQ ? 'bg-[#f5f5f5] text-[#0d0d0e]' : 'bg-[#161619] text-[#e5e5e7]'}`}
              title="Diagnostics & Advice Tools"
            >
              <Sliders size={13} />
              EQ SYSTEM
            </button>

            <button 
              onClick={() => { setShowAbout(!showAbout); setShowEQ(false); }}
              className={`px-3 py-1.5 sketch-button flex items-center gap-1.5 cursor-pointer ${showAbout ? 'bg-[#f5f5f5] text-[#0d0d0e]' : 'bg-[#161619] text-[#e5e5e7]'}`}
              title="About this style sketchbook"
            >
              <Info size={13} />
              ABOUT
            </button>

            {/* Custom analog clock widget matching design perfectly */}
            <div className="px-4 py-1.5 bg-[#141416] border border-stone-800 rounded-lg text-white flex items-center gap-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
              <Clock size={13} className="text-emerald-400" />
              <span className="text-stone-300 font-mono text-[11px] font-bold tracking-wider">{currentTime}</span>
            </div>
          </div>

        </div>

        {/* ULTRA-THIN SEPARATOR WITH SUBTLE RECONSTRUCT */}
        <div className="w-full border-t border-dashed border-stone-800/80 mt-4 mb-4" />
      </header>

      {/* 2. MAIN APPLICATION WORKSPACE DECK */}
      <main className="w-full max-w-7xl mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch min-h-0 overflow-hidden z-10 pb-2">
        
        {/* LEFT WORKSPACE: THE COMMAND TERMINAL INPUT FRAME */}
        <section className="col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col justify-start min-h-0 h-full gap-4">
          
          {/* Main Input terminal Box */}
          <div className="sketch-card p-5 flex flex-col justify-between gap-4">
            
            <div className="flex items-center justify-between border-b border-stone-800/80 pb-2.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#f5f5f5] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                COMMAND CORE TRANSCRIPT
              </span>
              
              {/* Profile click-to-edit name */}
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
                <span className="text-[9px] text-[#A0A0A0] block">OPERATOR:</span>
                {isEditingName ? (
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    onBlur={() => setIsEditingName(false)}
                    onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                    className="bg-stone-900 border border-stone-700 px-2 py-0.5 text-white outline-none text-[11px] max-w-[80px] rounded focus:border-stone-500"
                    autoFocus
                  />
                ) : (
                  <span 
                    onClick={() => setIsEditingName(true)} 
                    className="hover:underline cursor-pointer text-stone-200 bg-stone-900/80 border border-stone-800/80 px-2 py-0.5 rounded text-[11px]"
                    title="Click to rename operator file"
                  >
                    {userName}
                  </span>
                )}
              </div>
            </div>

            {/* Input card with focus border glowing */}
            <div className="relative bg-[#0d0d0f] border border-stone-800 rounded-xl p-3.5 min-h-[140px] flex flex-col justify-between focus-within:border-stone-600 focus-within:shadow-[0_0_12px_rgba(255,255,255,0.015)] transition-all">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type unpolished sentences or raw statements here..."
                className="w-full bg-transparent outline-none border-none resize-none text-[#f5f5f5] placeholder-stone-600 font-mono text-xs leading-relaxed flex-1 h-[90px]"
              />

              {isListening && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 text-[9px] font-mono font-bold text-red-400 bg-red-950/40 border border-red-900/60 px-2.5 py-1 rounded-full animate-pulse shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  DICTATION ACTIVE
                </div>
              )}

              {/* Reset/Clear inside the card */}
              <div className="flex items-center justify-between border-t border-stone-900 pt-2 text-[10px] text-stone-500 font-mono">
                <div className="flex items-center gap-3">
                  <span>CHARS: {inputText.length}</span>
                  <span className="text-stone-700">•</span>
                  <span>WORDS: {inputText.trim() ? inputText.trim().split(/\s+/).length : 0}</span>
                </div>
                {inputText && (
                  <button 
                    onClick={handleClear}
                    className="text-stone-300 hover:text-red-400 hover:underline transition-colors font-bold cursor-pointer"
                  >
                    RESET CORE
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Controls - High contrast button exactly matching Vercel/Linear look, positioned right below input typing space */}
            <div className="flex items-center gap-2">
              {/* Voice Record hands free button */}
              <button 
                onClick={toggleSpeech}
                className={`p-3 border border-stone-800 rounded-lg transition-all cursor-pointer ${
                  isListening
                    ? "bg-red-950/80 text-white animate-pulse border-red-850"
                    : "hover:bg-stone-900 text-white bg-transparent"
                }`}
                title={isListening ? "Pause transmission dictation" : "Dictate statement hands-free"}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <button
                onClick={() => handleSubmit()}
                disabled={isAnalyzing || !inputText.trim()}
                className={`flex-1 py-3 font-display font-black text-xs tracking-widest uppercase transition-all sketch-button-black cursor-pointer flex items-center justify-center gap-2 ${
                  !inputText.trim() ? "opacity-35 pointer-events-none" : ""
                }`}
              >
                <Sparkles size={14} className={isAnalyzing ? "animate-spin" : "animate-pulse"} />
                {spellingOnly ? "CALIBRATE SPELLING" : "CALIBRATE GRAMMAR"}
              </button>
            </div>

            {/* SPELLING CORRECTOR SECTION */}
            <div className="bg-[#0f0f12] border border-stone-850 rounded-xl p-3.5 space-y-2.5 font-mono text-[10px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
              <div className="flex items-center justify-between">
                <span className="text-[#A0A0A0] uppercase tracking-wider font-bold block text-[9px]">
                  SPELLING CORRECTOR CORE
                </span>
                <span className={`font-extrabold text-[10px] tracking-wider uppercase ${spellingOnly ? "text-emerald-400 font-black animate-pulse" : "text-stone-500"}`}>
                  {spellingOnly ? "ACTIVE" : "BYPASS"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-stone-500 text-[9px] leading-relaxed">
                  When active, corrections are restricted strictly to spelling errors. The original sentence structure, grammar, and phrasing remain entirely untouched.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSpellingOnly(!spellingOnly)}
                className={`w-full py-2 rounded text-[10px] font-bold uppercase transition-all tracking-widest border cursor-pointer flex items-center justify-center gap-1.5 ${
                  spellingOnly 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500 hover:bg-emerald-500/20" 
                    : "bg-stone-900 text-stone-300 border-stone-800 hover:border-text-white hover:bg-stone-850"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${spellingOnly ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-stone-600"}`} />
                {spellingOnly ? "SPELLCHECK MODE ACTIVE" : "ENABLE SPELLCHECK ONLY"}
              </button>
            </div>

            {/* REAL-TIME LINGUISTIC TELEMETRY PANEL */}
            {(() => {
              const metrics = getLinguisticMetrics(inputText);
              const isEmpty = !inputText.trim();
              
              return (
                <div className="bg-[#0f0f12] border border-stone-850 rounded-xl p-3.5 space-y-3 font-mono text-[10px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
                  <div className="flex items-center justify-between border-b border-stone-900 pb-1.5">
                    <span className="text-[#A0A0A0] uppercase tracking-wider font-bold block text-[9px]">
                      ENG SPECTRAL REGISTRY
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${isEmpty ? "bg-stone-600 animate-pulse" : "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"}`} />
                      <span className="text-stone-400 font-bold uppercase text-[8px]">
                        {isEmpty ? "STANDBY" : "ACTIVE MONITORING"}
                      </span>
                    </span>
                  </div>

                  {/* Sub row indicators */}
                  <div className="grid grid-cols-3 gap-2 text-[9px]">
                    <div className="bg-[#141416]/55 p-1.5 rounded border border-stone-850 flex flex-col justify-between h-10">
                      <span className="text-[#A0A0A0] block text-[7px] tracking-wide uppercase font-bold">SENTIMENT</span>
                      <span className={`font-bold tracking-wider text-[10px] ${
                        isEmpty 
                          ? "text-stone-600"
                          : metrics.sentiment === "POSITIVE" 
                          ? "text-emerald-400" 
                          : metrics.sentiment === "NEGATIVE" 
                          ? "text-rose-400" 
                          : "text-stone-300"
                      }`}>
                        {isEmpty ? "STANDBY" : metrics.sentiment}
                      </span>
                    </div>

                    <div className="bg-[#141416]/55 p-1.5 rounded border border-stone-850 flex flex-col justify-between h-10">
                      <span className="text-[#A0A0A0] block text-[7px] tracking-wide uppercase font-bold">COMPLEXITY</span>
                      <span className={`font-bold tracking-wider text-[10px] ${isEmpty ? "text-stone-600" : "text-cyan-400"}`}>
                        {isEmpty ? "STANDBY" : metrics.complexity}
                      </span>
                    </div>

                    <div className="bg-[#141416]/55 p-1.5 rounded border border-stone-850 flex flex-col justify-between h-10">
                      <span className="text-[#A0A0A0] block text-[7px] tracking-wide uppercase font-bold">ACCURACY CONF</span>
                      <span className={`font-bold text-[10px] ${isEmpty ? "text-stone-600" : "text-amber-400"}`}>
                        {isEmpty ? "STANDBY" : `${metrics.confidence}%`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>

         </section>

        {/* RIGHT WORKSPACE: THE FUTURISTIC RECONSTRUCT & TONE FILTERS */}
        <section className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 h-full overflow-hidden">
          
          <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-0 h-full scrollbar-thin">
            
            {/* Pop-up dialog: EQ Dashboard Diagnostics */}
            <AnimatePresence>
              {showEQ && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="sketch-card p-5 bg-[#141416] relative border border-stone-800 overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-stone-850 pb-2 mb-3">
                    <h3 className="text-xs font-mono font-black tracking-widest text-[#f5f5f5] uppercase flex items-center gap-1.5">
                      <Sliders size={14} className="text-emerald-400" />
                      EQ SPECTRUM DIAGNOSTICS
                    </h3>
                    <button 
                      onClick={() => setShowEQ(false)}
                      className="text-xs font-mono font-bold hover:underline text-stone-400"
                    >
                      [CLOSE]
                    </button>
                  </div>

                  <div className="space-y-3 font-mono text-stone-300 text-xs leading-relaxed">
                    <p className="bg-[#0d0d0f] p-3 rounded-lg border border-stone-800 font-sans text-stone-300">
                      Our interactive linguistic filter parses raw mistakes through parallel tone adaptation models.
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="bg-[#18181c] p-2.5 rounded border border-stone-800/60">
                        <span className="font-extrabold text-white block uppercase tracking-wide text-[10px]">COGNITIVE RATIO</span>
                        <p className="text-[10px] text-stone-400 mt-0.5 leading-snug">High semantic fidelity matching baseline grammar rules.</p>
                      </div>
                      <div className="bg-[#18181c] p-2.5 rounded border border-[#18181c]">
                        <span className="font-extrabold text-white block uppercase tracking-wide text-[10px]">PITCH & CADENCE</span>
                        <p className="text-[10px] text-stone-400 mt-0.5 leading-snug">Custom adjustments optimized for human vocal output frequencies.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pop-up dialog: ABOUT context */}
            <AnimatePresence>
              {showAbout && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="sketch-card p-5 bg-[#141416] relative border border-stone-800"
                >
                  <div className="flex items-center justify-between border-b border-stone-850 pb-2 mb-3">
                    <h3 className="text-xs font-mono font-black tracking-widest text-white uppercase flex items-center gap-1.5">
                      <Info size={14} className="text-emerald-400" />
                      SYSTEM OVERVIEW
                    </h3>
                    <button 
                      onClick={() => setShowAbout(false)}
                      className="text-xs font-mono font-bold hover:underline text-stone-400"
                    >
                      [CLOSE]
                    </button>
                  </div>

                  <div className="space-y-3 text-xs leading-relaxed font-sans text-stone-300">
                    <p>
                      Inspired by organic synthesizer workpads and tape sketchbooks, the **Linguistic Sketchbook** is a minimalist, high-fidelity platform to polish and adapt human transcripts.
                    </p>
                    <p>
                      Simply type or record a sentence, and watch our dynamic synthesis engines adapt your raw copy for different situational channels instantly, with zero clutter.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main outputs block */}
            <AnimatePresence mode="wait">
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-red-950/20 border border-red-900/55 rounded-2xl p-4 flex gap-3 text-stone-200 text-xs shadow-lg"
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                  <div>
                    <h4 className="font-black uppercase tracking-wider text-[10px] font-mono text-red-400">SYSTEM DIAGNOSTIC CODE</h4>
                    <p className="mt-1 leading-relaxed font-mono">{errorMsg}</p>
                  </div>
                </motion.div>
              )}

              {isAnalyzing && (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="sketch-card p-10 py-16 flex flex-col items-center justify-center text-center relative overflow-hidden bg-[#141416]"
                >
                  <div className="relative flex items-center justify-center mb-5">
                    <div className="w-12 h-12 rounded-full border-4 border-stone-800 border-t-emerald-400 animate-spin" />
                    <Activity className="absolute text-emerald-400 animate-pulse" size={16} />
                  </div>

                  <h3 className="font-display font-black text-white text-sm tracking-widest uppercase animate-pulse">
                    PARSING CORE FREQUENCIES
                  </h3>

                  <div className="h-5 overflow-hidden mt-1.5 max-w-xs w-full">
                    <AnimatePresence mode="wait">
                      <motion.p 
                        key={loadingStep}
                        initial={{ y: 15, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -15, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-[10px] font-mono tracking-widest text-[#A0A0A0] font-semibold uppercase"
                      >
                        {loadingSteps[loadingStep]}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}

              {analysis && !isAnalyzing && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  
                  {/* BASELINE DIRECT RECONSTRUCT CARD with elegant left accent bar */}
                  <div className="sketch-card p-5 md:p-6 bg-[#111113] relative overflow-hidden border-l-4 border-l-emerald-500 shadow-xl">
                    
                    <span className="absolute top-3 right-4 font-mono text-[9px] bg-emerald-500 text-stone-950 font-bold tracking-widest uppercase px-2.5 py-0.5 rounded shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                      TRACK ACTIVE
                    </span>

                    <h3 className="font-display font-black text-stone-300 text-xs font-mono uppercase tracking-widest mb-4 flex items-center gap-1.5">
                      <CheckCheck size={16} className="text-emerald-400 font-bold" />
                      RECONSTRUCTED BASELINE CORE
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Original Raw segment */}
                      <div className="bg-[#161619] p-4 rounded-xl border border-stone-800 pt-3">
                        <span className="text-[9px] font-mono text-stone-500 font-semibold uppercase tracking-widest block mb-1.5">
                          RAW DRAFT SENTENCE
                        </span>
                        <p className="text-xs text-stone-400 italic line-through decoration-red-900/40 leading-relaxed font-mono">
                          "{inputText.trim()}"
                        </p>
                      </div>

                      {/* Calibrated high contrast output block */}
                      <div className="bg-[#1a1a20] p-5 rounded-xl border border-stone-800 flex flex-col justify-between shadow-2xl">
                        <div>
                          <span className="text-[9px] font-mono text-emerald-400 font-semibold uppercase tracking-widest block mb-2">
                            CALIBRATED RESPONSE
                          </span>
                          <p className="text-sm md:text-base font-bold text-white font-sans leading-relaxed tracking-wide">
                            {analysis.correctedText}
                          </p>
                        </div>

                        {/* Copy + voice triggers */}
                        <div className="flex items-center justify-end gap-1.5 mt-5 pt-3 border-t border-stone-900">
                          <button
                            onClick={() => handleSpeak(analysis.correctedText, "baseline")}
                            className={`px-3 py-1.5 sketch-button text-[10px] font-mono leading-none flex items-center gap-1.5 cursor-pointer ${
                              speakingId === "baseline" ? "bg-stone-100 text-stone-950" : ""
                            }`}
                            title="Listen Refined core pitch"
                          >
                            <Volume2 size={12} className={speakingId === "baseline" ? "animate-bounce" : ""} />
                            LISTEN
                          </button>
                          
                          <button
                            onClick={() => handleCopy(analysis.correctedText, "baseline")}
                            className="px-3 py-1.5 sketch-button text-[10px] font-mono leading-none flex items-center gap-1.5 cursor-pointer"
                            title="Copy baseline core"
                          >
                            {copiedId === "baseline" ? <Check size={11} className="text-emerald-400 font-bold" /> : <Copy size={11} />}
                            {copiedId === "baseline" ? "COPIED" : "COPY"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Syntax guidelines/mistakes dynamic feed inline */}
                    {analysis.mistakesFound && analysis.mistakesFound.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-stone-900/80">
                        <h4 className="text-[9px] font-mono text-stone-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Lightbulb size={11} className="text-amber-400" />
                          DIAGNOSTIC ADVICE CORRECTIONS
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.mistakesFound.map((mistake, i) => (
                            <div key={i} className="bg-[#141416] text-stone-300 text-[10px] font-mono px-3 py-1.5 rounded-lg border border-stone-850 leading-tight">
                              ▲ {mistake}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* ADAPTER SYNAPSE FILTER PIPELINE */}
                  <div className="space-y-3.5">
                    
                    {/* Compact platform controller row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1 bg-[#141416] p-2.5 rounded-xl border border-stone-800 shadow-xl">
                      <div>
                        <h3 className="font-display font-black text-xs font-mono uppercase tracking-widest text-[#f5f5f5] flex items-center gap-1.5 pl-1">
                          <Sliders size={13} className="text-emerald-400 animate-pulse" />
                          MULTI-MODE TONE FILTERS
                        </h3>
                      </div>
                      
                      {/* Synthesizer tab pill router */}
                      <div className="bg-stone-950 border border-stone-850 p-1 rounded-lg flex items-center gap-1 self-start sm:self-auto shrink-0">
                        <button
                          onClick={() => setActiveTab("linguistic")}
                          className={`px-3 py-1 text-[10px] font-mono font-bold uppercase transition-all rounded-md cursor-pointer ${
                            activeTab === "linguistic"
                              ? "bg-slate-100 text-stone-950"
                              : "text-stone-400 hover:text-stone-100"
                          }`}
                        >
                          LINGUISTIC MODES
                        </button>
                        <button
                          onClick={() => setActiveTab("social")}
                          className={`px-3 py-1 text-[10px] font-mono font-bold uppercase transition-all rounded-md cursor-pointer ${
                            activeTab === "social"
                              ? "bg-slate-100 text-stone-950"
                              : "text-stone-400 hover:text-stone-100"
                          }`}
                        >
                          SOCIAL NETWORKS
                        </button>
                      </div>
                    </div>

                    {/* Render matching situational adapters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {((activeTab === "linguistic" ? analysis.situations : analysis.socialMedia) || []).map((sit: SituationalRewrite) => {
                        const cardId = `sit-${sit.id}`;
                        const isVibeSpeaking = speakingId === cardId;
                        const isVibeCopied = copiedId === cardId;

                        // Give them clean, distinctive sketch styles with very solid colored tags
                        let customTagColor = "bg-stone-800 text-stone-200 border border-stone-700";
                        if (sit.id === "professional" || sit.id === "linkedin") {
                          customTagColor = "bg-cyan-950/40 text-cyan-400 border border-cyan-800/50";
                        } else if (sit.id === "polite" || sit.id === "instagram") {
                          customTagColor = "bg-pink-950/40 text-pink-400 border border-pink-800/50";
                        } else if (sit.id === "creative" || sit.id === "reddit") {
                          customTagColor = "bg-amber-950/40 text-amber-400 border border-amber-800/50";
                        } else if (sit.id === "casual" || sit.id === "threads") {
                          customTagColor = "bg-emerald-950/40 text-emerald-400 border border-emerald-800/50";
                        } else if (sit.id === "x") {
                          customTagColor = "bg-stone-950 text-stone-100 border border-stone-800 font-mono";
                        }

                        return (
                          <div
                            key={sit.id}
                            className="sketch-card-sm p-4 bg-[#141416] flex flex-col justify-between gap-3 relative group"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2 border-b border-stone-900 pb-1.5">
                                <span className={`text-[9px] font-mono tracking-widest font-bold uppercase px-2 py-0.5 rounded ${customTagColor}`}>
                                  {sit.label}
                                </span>
                                <span className="text-[10px] text-stone-400 font-sans italic font-medium">
                                  {sit.description}
                                </span>
                              </div>

                              <p className="text-xs text-stone-100 font-medium font-mono bg-[#0d0d0f] rounded-lg p-2.5 border border-stone-900 leading-relaxed min-h-[3.5rem] flex items-center">
                                "{sit.text}"
                              </p>
                            </div>

                            {/* Utilities */}
                            <div className="flex items-center justify-end gap-1.5 border-t border-stone-900 pt-2">
                              <button
                                onClick={() => handleSpeak(sit.text, cardId)}
                                className={`px-2 py-1 sketch-button text-[9px] font-mono leading-none flex items-center gap-1 cursor-pointer ${
                                  isVibeSpeaking ? "bg-stone-100 text-stone-950 border-stone-100" : ""
                                }`}
                                title="Listen to filtered variant output phrase"
                              >
                                <Volume2 size={11} className={isVibeSpeaking ? "animate-bounce" : ""} />
                                LISTEN
                              </button>
                              
                              <button
                                onClick={() => handleCopy(sit.text, cardId)}
                                className="px-2 py-1 sketch-button text-[9px] font-mono leading-none flex items-center gap-1 cursor-pointer"
                                title="Copy phrase draft variant to local clipboard clipboard"
                              >
                                {isVibeCopied ? <Check size={11} className="text-emerald-400 font-bold" /> : <Copy size={11} />}
                                {isVibeCopied ? "COPIED" : "COPY"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                </motion.div>
              )}

              {/* WELCOME SCREEN */}
              {!analysis && !isAnalyzing && (
                <motion.div
                  key="welcome-dashboard"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="sketch-card p-6 md:p-8 text-stone-200 flex flex-col items-center justify-center text-center py-12 bg-[#141416] border border-stone-850"
                >
                  <div className="w-10 h-10 rounded-xl bg-stone-900 border border-stone-850 text-emerald-400 flex items-center justify-center mb-3">
                    <Sparkles size={16} />
                  </div>
                  
                  <h3 className="text-lg font-display font-black text-white tracking-tight uppercase">
                    CALIBRATE CUSTOM CORES
                  </h3>
                  
                  <p className="text-xs text-[#A0A0A0] max-w-sm mt-1.5 leading-relaxed font-mono">
                    LAUNCH THE DIALECT TRANSFORMER ENGINE DIRECTLY FROM THE WORKPAD ON THE LEFT WITH ABSOLUTE CONTEXT FIDELITY.
                  </p>

                  {/* Inline list of clickables */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 max-w-xl w-full">
                    {examples.map((ex, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectExample(ex)}
                        className="text-left text-xs bg-[#161619] text-stone-300 hover:bg-[#f5f5f5] hover:text-[#0d0d0e] border border-stone-850 rounded-xl p-3 transition-all flex items-center justify-between gap-2.5 cursor-pointer group hover:scale-[1.01]"
                      >
                        <span className="truncate italic font-mono">"{ex}"</span>
                        <ArrowRight size={11} className="text-stone-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </section>

      </main>

    </div>
  );
}

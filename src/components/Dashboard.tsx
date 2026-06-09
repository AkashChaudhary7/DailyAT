/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  doc,
  writeBatch,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { parseUniversalHTML, normalizeHindiText } from '../lib/htmlParser';
import { SAMPLE_QUESTIONS } from '../utils/sampleData';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  UploadCloud, 
  X, 
  TrendingUp, 
  Settings, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Calendar, 
  Edit3, 
  Lock, 
  ShieldCheck, 
  LayoutGrid,
  Wifi,
  Sun,
  Moon,
  AlertCircle,
  Check,
  Search,
  Bookmark,
  Copy,
  Zap,
  Sparkles,
  FileCode,
  Activity,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Question, TestAttempt, QuizSettings, ExamCounter, DailyGoal } from '../types';
import MockTestInterface from './MockTestInterface';
import FormattedText from './FormattedText';

// Local UI Interface for keeping bookmarks/reviews separate per device
interface LocalReviewState {
  isBookmarked?: boolean;
  needsReview?: boolean;
}

// =========================================================================
// INTEGRATED ADMIN QUEUE COMPONENT ENGINE VIEW
// =========================================================================
export function FlaggedQuestionsManager() {
  const [flaggedData, setFlaggedData] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "flagged_questions"), (snapshot) => {
      const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFlaggedData(rows);
    });
    return () => unsubscribe();
  }, []);

  const handleRestoreQuestion = async (q: any) => {
    if (!window.confirm("Bhai, kya aap sach mein is question ko unflag karke system pool mein wapas sync karna chahte hain?")) return;
    try {
      await setDoc(doc(db, "questions", q.id), {
        id: q.id,
        questionText: q.questionText,
        options: q.options,
        correctAnswerIndex: q.correctAnswerIndex,
        explanation: q.explanation || "",
        subject: q.subject || "General Studies",
        targetExam: q.targetExam || "Exam",
        updatedAt: new Date().toISOString()
      }, { merge: true });
      await deleteDoc(doc(db, "flagged_questions", q.id));
      alert("Sunder! Question ko active pool mein wapas restore kar diya gaya hai!");
    } catch (err) {
      console.error(err);
      alert("Error restoring question");
    }
  };

  const handleDeletePermanently = async (qId: string) => {
    if (!window.confirm("Bhai, kya aap is flagged question ko system se permanent delete/purge karna chahte hain? Yeh operation irreversible hai!")) return;
    try {
      await deleteDoc(doc(db, "flagged_questions", qId));
      await deleteDoc(doc(db, "questions", qId));
      alert("Done! Flagged question ko system se permanently delete kar diya gaya hai!");
    } catch (err) {
      console.error(err);
      alert("Error deleting question");
    }
  };

  // Bulk JSON Sheet Downloader Action Matrix
  const downloadBulkFlaggedJson = () => {
    if (flaggedData.length === 0) return alert("System database clear, no rows to dump!");
    const fileData = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(flaggedData, null, 2));
    const exportAnchor = document.createElement('a');
    exportAnchor.setAttribute("href", fileData);
    exportAnchor.setAttribute("download", `flagged_dump_sheet_${Date.now()}.json`);
    document.body.appendChild(exportAnchor);
    exportAnchor.click();
    exportAnchor.remove();
  };

  // Re-Upload Corrected Spreadsheet File Sync Action 
  const handleSpreadsheetSyncUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sheetReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      sheetReader.readAsText(e.target.files[0], "UTF-8");
      sheetReader.onload = async (readerEvent) => {
        try {
          const syncArray = JSON.parse(readerEvent.target?.result as string);
          if (!Array.isArray(syncArray)) return alert("Formatting execution error! Expected Array database rows.");

          const batch = writeBatch(db);
          syncArray.forEach((item) => {
            // Re-sync parameter settings to active questions registry reference node
            batch.set(doc(db, "questions", item.id), {
              id: item.id,
              questionText: item.questionText,
              options: item.options,
              correctAnswerIndex: item.correctAnswerIndex,
              explanation: item.explanation || "",
              subject: item.subject || "General Studies",
              targetExam: item.targetExam || "Exam",
              updatedAt: new Date().toISOString()
            }, { merge: true });

            // Purge flagged queue log
            batch.delete(doc(db, "flagged_questions", item.id));
          });

          await batch.commit();
          alert("Bohat badiya bhai! Saare corrected questions active pool mein wapas sync ho gaye hain!");
        } catch (err) {
          alert("JSON compilation parser error.");
        }
      };
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mt-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-5 mb-5 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Flagged Garbage Font Queue</h2>
          <p className="text-gray-400 text-sm mt-0.5">Pending evaluation entries count: {flaggedData.length}</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={downloadBulkFlaggedJson}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition duration-150"
          >
            📥 Download Flagged Data (JSON)
          </button>
          
          <label className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm cursor-pointer transition duration-150">
            📤 Upload Corrected JSON Sync
            <input type="file" accept=".json" onChange={handleSpreadsheetSyncUpload} className="hidden" />
          </label>
        </div>
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
        {flaggedData.map((q) => (
          <div key={q.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded-md">Flagged Log</span>
                <span className="text-xs text-gray-400 font-medium">Exam: {q.targetExam} | Subject: {q.subject}</span>
              </div>
              <p className="text-sm font-semibold text-gray-700 pt-1">{q.questionText}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 text-xs text-gray-500">
                {q.options?.map((opt: string, idx: number) => (
                  <div key={idx} className={idx === q.correctAnswerIndex ? "text-emerald-600 font-bold" : ""}>
                    ({idx + 1}) {opt}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-200/60">
              <button
                onClick={() => handleRestoreQuestion(q)}
                className="flex-1 sm:flex-initial px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition flex items-center justify-center gap-1.5 shadow-sm"
                title="Restore this question to main active pool and clear flag"
              >
                <Check className="w-3.5 h-3.5" />
                Restore (Unflag)
              </button>
              <button
                onClick={() => handleDeletePermanently(q.id)}
                className="flex-1 sm:flex-initial px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition flex items-center justify-center gap-1.5 shadow-sm"
                title="Permanently delete this question from all databases"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Purge Forever
              </button>
            </div>
          </div>
        ))}
        {flaggedData.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            Bhai system ekdum clean hai! Koi bhi flagged font errors pending nahi hain.
          </div>
        )}
      </div>
    </div>
  );
}

// Exam Counter Card Component
const ExamCounterCard: React.FC<{ 
  counter: ExamCounter; 
  onUpdate: (updated: ExamCounter) => void;
}> = ({ 
  counter, 
  onUpdate 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(counter.name);
  const [tempDate, setTempDate] = useState(counter.targetDate);
  const daysRemaining = Math.max(0, Math.ceil((new Date(counter.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

  const handleSave = () => {
    onUpdate({ ...counter, name: tempName, targetDate: tempDate });
    setIsEditing(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-sm relative group transition-all hover:shadow-md">
      {isEditing ? (
        <div className="space-y-2 animate-fade-in">
          <input 
            type="text" 
            value={tempName} 
            onChange={(e) => setTempName(e.target.value)}
            className="w-full text-[10px] font-bold p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 outline-none text-slate-900 dark:text-slate-100"
            placeholder="Exam Name"
            autoFocus
          />
          <input 
            type="date" 
            value={tempDate} 
            onChange={(e) => setTempDate(e.target.value)}
            className="w-full text-[10px] font-bold p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 outline-none text-slate-900 dark:text-slate-100"
          />
          <div className="flex space-x-1.5">
            <button onClick={handleSave} className="flex-1 bg-indigo-600 text-white text-[9px] font-black py-1.5 rounded-lg uppercase transition-colors">Save</button>
            <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[9px] font-black py-1.5 rounded-lg uppercase transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          <div className="flex justify-between items-start">
             <div className="flex items-center space-x-1.5">
               <Calendar className="h-2.5 w-2.5 text-indigo-500/70" />
               <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate max-w-[80px]">{counter.name || "Exam"}</div>
             </div>
             <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-400 hover:text-indigo-500">
                <Edit3 className="h-2.5 w-2.5" />
             </button>
          </div>
          <div className="flex items-baseline space-x-1.5 mt-0.5">
             <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-display tabular-nums">{daysRemaining}</div>
            <div className="text-[9px] font-black text-slate-500 dark:text-slate-450 uppercase">Days</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Daily Goal & Streak Card
const DailyGoalCard: React.FC<{
  goal: DailyGoal;
  onUpdateTarget: (newBase: number) => void;
}> = ({ goal, onUpdateTarget }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTarget, setTempTarget] = useState(goal.baseTarget);
  const progressPercent = Math.min(100, Math.round((goal.progressToday / goal.currentTarget) * 100));

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-5 text-white shadow-xl shadow-indigo-200 dark:shadow-none border border-white/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Activity className="h-24 w-24 -rotate-12" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="bg-white/20 p-2 rounded-xl">
              <Zap className="h-4 w-4 text-amber-300" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Daily Streak</div>
              <div className="text-lg font-black font-display leading-none">{goal.streak} DAYS</div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Question Goal</div>
            <div className="flex items-center justify-end space-x-2">
               {isEditing ? (
                 <div className="flex items-center space-x-1">
                   <input 
                    type="number" 
                    value={tempTarget}
                    onChange={(e) => setTempTarget(parseInt(e.target.value) || 0)}
                    className="w-16 bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-xs font-bold text-white outline-none"
                    autoFocus
                   />
                   <button onClick={() => { onUpdateTarget(tempTarget); setIsEditing(false); }} className="p-1 bg-emerald-500 rounded text-white"><Check className="h-3 w-3" /></button>
                 </div>
               ) : (
                 <>
                   <div className="text-lg font-black font-display leading-none">{goal.progressToday} / {goal.currentTarget}</div>
                   {goal.streak === 0 && goal.progressToday === 0 && (
                     <button onClick={() => setIsEditing(true)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                        <Edit3 className="h-3 w-3 opacity-60" />
                     </button>
                   )}
                 </>
               )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-wide">
            <span>Progress Today</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 shadow-[0_0_10px_rgba(52,211,153,0.5)] transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[9px] font-medium opacity-60 italic">
            {goal.progressToday >= goal.currentTarget 
              ? "Target Met! Tomorrow's goal will increase by 10." 
              : "Keep going! Hit your target to grow your streak."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [localReviewBank, setLocalReviewBank] = useState<Record<string, LocalReviewState>>({});
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('mock-config');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [stagedQuestions, setStagedQuestions] = useState<Question[]>([]);
  const [examCounters, setExamCounters] = useState<ExamCounter[]>([
    { id: 'exam-1', name: 'NEET 2026', targetDate: '2026-05-04' },
    { id: 'exam-2', name: 'JEE Main', targetDate: '2026-04-15' },
  ]);
  
  // Custom Subject Tag States (Persistent Dropdown Logic)
  const [subjectTagsList, setSubjectTagsList] = useState<string[]>(["Rajasthan GK", "HTML Upload", "General Science"]);
  const [stagingSubject, setStagingSubject] = useState<string>("Rajasthan GK");
  const [newCustomTagInput, setNewCustomTagInput] = useState<string>("");

  const [uploadError, setUploadError] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<{current: number, total: number, questionsFound: number} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState(0);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newQText, setNewQText] = useState("");
  const [newOptions, setNewOptions] = useState(["", "", "", ""]);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);
  const [newSubject, setNewSubject] = useState("General");
  const [newExplanation, setNewExplanation] = useState("");

  const [quizSubject, setQuizSubject] = useState<string>("All Subjects");
  const [quizCount, setQuizCount] = useState<number>(5);
  const [hasTimer, setHasTimer] = useState<boolean>(true);
  const [timerMinutes, setTimerMinutes] = useState<number>(10);

  const [activeQuizQuestions, setActiveQuizQuestions] = useState<Question[] | null>(null);
  const [activeQuizSettings, setActiveQuizSettings] = useState<QuizSettings | null>(null);
  const [reviewedAttempt, setReviewedAttempt] = useState<TestAttempt | null>(null);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminError, setAdminError] = useState(false);

  const [dailyGoal, setDailyGoal] = useState<DailyGoal>({
    baseTarget: 50,
    currentTarget: 50,
    progressToday: 0,
    streak: 0,
    lastUpdateDate: new Date().toISOString().split('T')[0]
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubject, setFilterSubject] = useState("All");
  const [copyingAll, setCopyingAll] = useState<boolean | null>(false);

  const copyAllStagedToClipboard = async () => {
    if (stagedQuestions.length === 0) return;
    const text = stagedQuestions.map((q, i) => {
      const optionsTxt = q.options.map((opt: string, idx: number) => 
        `${String.fromCharCode(65 + idx)}: ${opt}`
      ).join('\n');
      return `Question ${i + 1}: ${q.questionText}\n\nOptions:\n${optionsTxt}\n\nCorrect Answer: ${String.fromCharCode(65 + q.correctAnswerIndex)}\n\n---\n`;
    }).join('\n');

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopyingAll(true);
      setTimeout(() => setCopyingAll(false), 2000);
    } catch (err) {
      console.error("Failed to copy all!", err);
    }
  };

  // Root HTML node theme and color-scheme state synchronization
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [isDarkMode]);

  // Sync mount and persistent selectors
  useEffect(() => {
    const storedTheme = localStorage.getItem('THEME_MODE');
    if (storedTheme === 'dark' || (!storedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
    }

    // Load custom tags created by administrator
    const storedTags = localStorage.getItem('MOCK_SUBJECT_TAGS');
    if (storedTags) {
      try {
        setSubjectTagsList(JSON.parse(storedTags));
      } catch (e) { console.error(e); }
    }

    // Sticky / Persistent upload tag check
    const storedStickyTag = localStorage.getItem('MOCK_STICKY_UPLOAD_TAG');
    if (storedStickyTag) {
      setStagingSubject(storedStickyTag);
    }

    const storedLocalReview = localStorage.getItem('MOCK_REVIEW_STATES');
    if (storedLocalReview) {
      try {
        setLocalReviewBank(JSON.parse(storedLocalReview));
      } catch (e) { console.error(e); }
    }

    console.log("Listening to Firestore real-time updates...");
    const q = query(collection(db, "questions"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreQuestions = snapshot.docs.map(doc => {
        const qData = doc.data();
        const rawQuestionText = qData.questionText || "";
        const rawExplanation = qData.explanation || "";
        const rawOptions = Array.isArray(qData.options) ? qData.options : [];
        const rawSubject = qData.subject || "";
        
        return {
          ...qData,
          firestoreId: doc.id,
          id: qData.id || doc.id,
          questionText: normalizeHindiText(rawQuestionText),
          explanation: normalizeHindiText(rawExplanation),
          options: rawOptions.map((opt: any) => normalizeHindiText(String(opt))),
          subject: normalizeHindiText(rawSubject)
        };
      }) as unknown as Question[];
      
      setQuestions(firestoreQuestions);
      localStorage.setItem("MOCK_QUESTIONS", JSON.stringify(firestoreQuestions));
    }, (error) => {
      console.error("Firestore real-time sync failure:", error);
      const storedQuestions = localStorage.getItem("MOCK_QUESTIONS");
      if (storedQuestions) {
        setQuestions(JSON.parse(storedQuestions));
      }
    });

    const storedAttempts = localStorage.getItem('MOCK_ATTEMPTS');
    if (storedAttempts) {
      try {
        setAttempts(JSON.parse(storedAttempts));
      } catch (e) {
        setAttempts([]);
      }
    } else {
      setAttempts([]);
      localStorage.setItem('MOCK_ATTEMPTS', JSON.stringify([]));
    }

    const storedExams = localStorage.getItem('MOCK_EXAM_COUNTERS');
    if (storedExams) {
      try {
        setExamCounters(JSON.parse(storedExams));
      } catch (e) { }
    }

    const storedGoal = localStorage.getItem('MOCK_DAILY_GOAL');
    const today = new Date().toISOString().split('T')[0];
    
    if (storedGoal) {
      try {
        const parsedGoal: DailyGoal = JSON.parse(storedGoal);
        if (parsedGoal.lastUpdateDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          
          let nextStreak = parsedGoal.streak;
          let nextTarget = parsedGoal.currentTarget;
          if (parsedGoal.lastUpdateDate === yesterdayStr) {
             if (parsedGoal.progressToday >= parsedGoal.currentTarget) {
                nextStreak += 1;
                nextTarget = nextTarget + 10;
             } else {
                nextStreak = 0;
                nextTarget = parsedGoal.baseTarget;
             }
          } else {
             nextStreak = 0;
             nextTarget = parsedGoal.baseTarget;
          }

          const newGoal: DailyGoal = {
            ...parsedGoal,
            currentTarget: nextTarget,
            progressToday: 0,
            streak: nextStreak,
            lastUpdateDate: today
          };
          setDailyGoal(newGoal);
          localStorage.setItem('MOCK_DAILY_GOAL', JSON.stringify(newGoal));
        } else {
          setDailyGoal(parsedGoal);
        }
      } catch (e) { }
    }

    return () => unsubscribe();
  }, []);

  // Online/Offline status check and offline creation sync trigger
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      
      const offlineQsStr = localStorage.getItem('MOCK_OFFLINE_QUESTIONS');
      if (offlineQsStr) {
        try {
          const offlineQs = JSON.parse(offlineQsStr) as Question[];
          if (offlineQs.length > 0) {
            console.log(`Syncing ${offlineQs.length} offline questions...`);
            const batch = writeBatch(db);
            offlineQs.forEach(q => {
              batch.set(doc(db, "questions", q.id), {
                id: q.id,
                questionText: q.questionText,
                options: q.options,
                correctAnswerIndex: q.correctAnswerIndex,
                explanation: q.explanation || "",
                subject: q.subject || "General",
                createdAt: new Date().toISOString()
              });
            });
            await batch.commit();
            localStorage.setItem('MOCK_OFFLINE_QUESTIONS', JSON.stringify([]));
            alert(`Offline Sync successful! ${offlineQs.length} custom question(s) synced back to secure database servers!`);
          }
        } catch (e) {
          console.error("Critical: Error during online database sync orchestration:", e);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      handleOnline();
    } else {
      setIsOnline(false);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handles updating the dynamic tags list
  const handleAddNewSubjectTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = newCustomTagInput.trim();
    if (!cleanTag) return;
    
    if (subjectTagsList.includes(cleanTag)) {
      alert("This tag is already configured inside the system dropdown.");
      return;
    }

    const updatedTags = [...subjectTagsList, cleanTag];
    setSubjectTagsList(updatedTags);
    localStorage.setItem('MOCK_SUBJECT_TAGS', JSON.stringify(updatedTags));
    
    // Auto shift selected target to the newly created tag and freeze it
    setStagingSubject(cleanTag);
    localStorage.setItem('MOCK_STICKY_UPLOAD_TAG', cleanTag);
    
    setNewCustomTagInput("");
    alert(`Successfully registered "${cleanTag}" tag.`);
  };

  const handleUpdateStagingSubject = (val: string) => {
    setStagingSubject(val);
    localStorage.setItem('MOCK_STICKY_UPLOAD_TAG', val);
  };

  const saveQuestionsToDB = (newQList: Question[]) => {
    setQuestions(newQList);
    localStorage.setItem('MOCK_QUESTIONS', JSON.stringify(newQList));
  };

  const handleUpdateExamCounter = (updated: ExamCounter) => {
    const next = examCounters.map(c => c.id === updated.id ? updated : c);
    setExamCounters(next);
    localStorage.setItem('MOCK_EXAM_COUNTERS', JSON.stringify(next));
  };

  const handleUpdateDailyBaseTarget = (newBase: number) => {
    const next: DailyGoal = {
        ...dailyGoal,
        baseTarget: newBase,
        currentTarget: newBase,
        progressToday: 0
    };
    setDailyGoal(next);
    localStorage.setItem('MOCK_DAILY_GOAL', JSON.stringify(next));
  };

  const updateProgress = (count: number) => {
    const next: DailyGoal = {
        ...dailyGoal,
        progressToday: dailyGoal.progressToday + count
    };
    setDailyGoal(next);
    localStorage.setItem('MOCK_DAILY_GOAL', JSON.stringify(next));
  };

  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);

    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  const saveAttemptsToDB = (newAttempts: TestAttempt[]) => {
    setAttempts(newAttempts);
    localStorage.setItem('MOCK_ATTEMPTS', JSON.stringify(newAttempts));
  };

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    localStorage.setItem('THEME_MODE', nextMode ? 'dark' : 'light');
  };

  const handleResetDatabase = () => {
    if (window.confirm("Are you sure you want to wipe this device's trails and custom counters?")) {
      setQuestions(SAMPLE_QUESTIONS);
      setAttempts([]);
      setLocalReviewBank({});
      localStorage.setItem('MOCK_QUESTIONS', JSON.stringify(SAMPLE_QUESTIONS));
      localStorage.setItem('MOCK_ATTEMPTS', JSON.stringify([]));
      localStorage.setItem('MOCK_REVIEW_STATES', JSON.stringify({}));
      setReviewedAttempt(null);
      setActiveTab('mock-config');
      alert("Device logs initialized successfully!");
    }
  };

  const processFiles = async (files: File[]) => {
    setUploadError("");
    setUploadProgress({ current: 0, total: files.length, questionsFound: 0 });
    let allParsed: Question[] = [];

    const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 50));
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const text = await file.text();
            await yieldToMain();
            const parsed = await parseUniversalHTML(text, stagingSubject);
            if (parsed.length > 0) {
                allParsed = [...allParsed, ...parsed];
            }
        } catch (error) {
            console.error("Failed to parse file", file.name, error);
        }
        setUploadProgress({ current: i + 1, total: files.length, questionsFound: allParsed.length });
        await yieldToMain();
    }

    setTimeout(() => {
        setUploadProgress(null);
        if (allParsed.length === 0) {
            setUploadError("No mock questions detected. Please try valid HTML files.");
        } else {
            setStagedQuestions(prev => [...prev, ...allParsed]);
        }
    }, 500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;
    if (fileInputRef.current) fileInputRef.current.value = '';
    processFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = (Array.from(e.dataTransfer.files || []) as File[]).filter(f => f.name.endsWith('.html') || f.name.endsWith('.htm') || f.type === 'text/html');
    if (!files.length) {
      setUploadError("Please drop valid HTML files.");
      return;
    }
    processFiles(files);
  };

  const deleteStagedItem = (index: number) => {
    const next = stagedQuestions.filter((_, i) => i !== index);
    setStagedQuestions(next);
  };

  const saveStagedToBank = async () => {
    if (stagedQuestions.length === 0) return;
    const prepared = stagedQuestions.map(q => ({
      ...q,
      subject: stagingSubject
    }));
    setIsSaving(true);
    setSavingProgress(0);
    setImportSuccess(null);

    try {
      const questionCollection = collection(db, 'questions');
      const total = prepared.length;
      for (let i = 0; i < total; i++) {
        await addDoc(questionCollection, prepared[i]);
        setSavingProgress(Math.round(((i + 1) / total) * 100));
      }
      
      const nextQList = [...questions, ...prepared];
      saveQuestionsToDB(nextQList);
      
      setImportSuccess(`Successfully added ${prepared.length} questions to ${stagingSubject}!`);
      setStagedQuestions([]);
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setImportSuccess(null);
        setIsSaving(false);
        setSavingProgress(0);
      }, 3000);
    } catch (error: any) {
      console.error("Full Firestore Error details:", error);
      alert(`Firebase Error. Please check your configurations.`);
      setIsSaving(false);
    }
  };

  const queueOfflineQuestion = (q: Question) => {
    try {
      const offlineQs = JSON.parse(localStorage.getItem('MOCK_OFFLINE_QUESTIONS') || '[]');
      offlineQs.push(q);
      localStorage.setItem('MOCK_OFFLINE_QUESTIONS', JSON.stringify(offlineQs));
    } catch (e) {
      console.error("Failed to queue offline question:", e);
    }
  };

  const handleCreateManualQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText.trim()) {
      alert("Please specify a question statement first!");
      return;
    }

    if (newOptions.some(o => !o.trim())) {
      alert("Please populate all 4 options!");
      return;
    }

    const created: Question = {
      id: `manual-${Date.now()}`,
      questionText: newQText,
      options: [...newOptions],
      correctAnswerIndex: newCorrectIndex,
      subject: newSubject.trim() || "General",
      explanation: newExplanation.trim() || ""
    };

    // Store in local active memory states to keep active state fresh instantly
    saveQuestionsToDB([...questions, created]);

    if (isOnline) {
      try {
        await setDoc(doc(db, "questions", created.id), {
          id: created.id,
          questionText: created.questionText,
          options: created.options,
          correctAnswerIndex: created.correctAnswerIndex,
          explanation: created.explanation,
          subject: created.subject,
          createdAt: new Date().toISOString()
        });
        alert("New question successfully saved to cloud database!");
      } catch (err) {
        console.error("Firestore save error, falling back to offline queue:", err);
        queueOfflineQuestion(created);
        alert("Saved locally! Question will sync to cloud when connection is restored.");
      }
    } else {
      queueOfflineQuestion(created);
      alert("Offline mode active! Question saved locally and queued for automatic sync.");
    }

    setIsFormOpen(false);
    setNewQText("");
    setNewOptions(["", "", "", ""]);
    setNewCorrectIndex(0);
    setNewExplanation("");
  };

  const handleDeleteFromBank = async (id: string) => {
    if (window.confirm("Are you sure you want to remove this question?")) {
      const next = questions.filter(q => q.id !== id);
      saveQuestionsToDB(next);
      if (isOnline) {
        try {
          await deleteDoc(doc(db, "questions", id));
        } catch (err) {
          console.error("Failed to delete from Firestore:", err);
        }
      }
    }
  };

  const handlePrepareQuiz = () => {
    let eligible = questions;
    if (quizSubject !== "All Subjects") {
      eligible = questions.filter(q => q.subject.toLowerCase() === quizSubject.toLowerCase());
    }

    if (eligible.length === 0) {
      alert(`No active questions available for "${quizSubject}".`);
      return;
    }

    const shuffled = [...eligible].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(quizCount, shuffled.length));

    const settings: QuizSettings = {
      questionCount: selected.length,
      subject: quizSubject,
      hasTimer,
      durationMinutes: timerMinutes
    };
    
    setActiveQuizQuestions(selected);
    setActiveQuizSettings(settings);
  };

  const handleFinishQuiz = (attempt: TestAttempt) => {
    const nextAttempts = [attempt, ...attempts];
    saveAttemptsToDB(nextAttempts);

    setReviewedAttempt(attempt);
    setActiveTab('review');

    updateProgress(
      attempt.answers.filter(a => a.selectedIndex !== null).length
    );

    const wrongIds = attempt.answers.filter(a => !a.isCorrect && a.selectedIndex !== null).map(a => a.questionId);
    if (wrongIds.length > 0) {
      const updatedLocalReview = { ...localReviewBank };
      wrongIds.forEach(id => {
        updatedLocalReview[id] = {
          ...updatedLocalReview[id],
          needsReview: true
        };
      });
      setLocalReviewBank(updatedLocalReview);
      localStorage.setItem('MOCK_REVIEW_STATES', JSON.stringify(updatedLocalReview));
    }
    
    setActiveQuizQuestions(null);
    setActiveQuizSettings(null);
  };

  const toggleBookmark = (id: string) => {
    const updatedLocalReview = { ...localReviewBank };
    const currentStatus = updatedLocalReview[id]?.isBookmarked || false;
    
    updatedLocalReview[id] = {
      ...updatedLocalReview[id],
      isBookmarked: !currentStatus
    };
    
    setLocalReviewBank(updatedLocalReview);
    localStorage.setItem('MOCK_REVIEW_STATES', JSON.stringify(updatedLocalReview));
  };

  const getAvailableSubjects = () => {
    const list = new Set<string>();
    questions.forEach(q => {
      if (q.subject) list.add(q.subject);
    });
    return Array.from(list);
  };

  const availableSubjects = getAvailableSubjects();

  const getFilteredQuestions = () => {
    return questions.filter(q => {
      const matchSearch = q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          q.options.some(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchFilter = filterSubject === "All" || q.subject.toLowerCase() === filterSubject.toLowerCase();
      return matchSearch && matchFilter;
    });
  };

  const filteredQuestions = getFilteredQuestions();

  const totalTests = attempts.length;
  const avgAccuracy = totalTests > 0 
    ? Math.round(attempts.reduce((sum, att) => sum + att.scorePercentage, 0) / totalTests)
    : 0;
  const correctAccumulated = attempts.reduce((sum, att) => sum + att.correctCount, 0);
  const avgSpeedSec = totalTests > 0 
    ? Math.round(attempts.reduce((sum, att) => sum + (att.timeTaken / att.totalQuestions || 10), 0) / totalTests)
    : 0;

  const getScoreChartData = () => {
    return attempts.slice().reverse().map((att, idx) => {
      const dateObj = new Date(att.date);
      return {
        name: `Test #${idx + 1}`,
        date: `${dateObj.getMonth() + 1}/${dateObj.getDate()}`,
        score: att.scorePercentage,
        accuracy: att.scorePercentage
      };
    });
  };

  const getSubjectAccuracyChartData = () => {
    const subjectsMap: { [key: string]: { correct: number; total: number } } = {};
    attempts.forEach(att => {
      const sub = att.subject;
      if (!subjectsMap[sub]) {
        subjectsMap[sub] = { correct: 0, total: 0 };
      }
      subjectsMap[sub].correct += att.correctCount;
      subjectsMap[sub].total += att.totalQuestions;
    });
    return Object.keys(subjectsMap).map(key => ({
      subject: key,
      accuracy: Math.round((subjectsMap[key].correct / subjectsMap[key].total) * 100)
    }));
  };

  const deviceReviewQuestions = questions.filter(q => localReviewBank[q.id]?.isBookmarked || localReviewBank[q.id]?.needsReview);

  if (activeQuizQuestions && activeQuizSettings) {
    return (
      <MockTestInterface
        questions={activeQuizQuestions}
        settings={activeQuizSettings}
        onFinish={handleFinishQuiz}
        onCancel={() => {
          setActiveQuizQuestions(null);
          setActiveQuizSettings(null);
        }}
        isDarkMode={isDarkMode}
      />
    );
  }

  return (
    <div className={isDarkMode ? 'dark text-slate-100 bg-slate-950 min-h-screen transition-colors' : 'text-slate-800 bg-slate-50 min-h-screen transition-colors'}>
      {/* Upper Navigation Header */}
      <header className="border-b border-indigo-100/50 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl font-display">
              M
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-indigo-900 dark:text-indigo-400 font-display">AT <span className="text-indigo-500 font-black">MOCK</span></h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest leading-none mt-0.5 tracking-tighter">AT MOCK</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 border border-slate-100 dark:border-slate-800 rounded-full px-3 py-1 bg-slate-50 dark:bg-slate-850 text-xs font-medium">
              {isOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                  <span className="text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Cloud Sync Active</span>
                </>
              ) : (
                <>
                  <Wifi className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">Offline Mode</span>
                </>
              )}
            </div>

            <button 
              onClick={toggleDarkMode}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all"
              title="Toggle Light/Dark Theme"
            >
              {isDarkMode ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-indigo-600" />}
            </button>

            <button 
              onClick={() => setIsAdminModalOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Admin Section"
            >
              {isAdminAuthenticated ? <ShieldCheck className="h-4.5 w-4.5 text-indigo-500" /> : <Lock className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Navigation Rails Panel (Desktop) */}
          <nav className="lg:col-span-3 space-y-2.5 relative">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase px-3 mb-2 font-display hidden lg:block">Workspace Controls</h3>
            
            <div className="lg:hidden">
              <button
                onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                className="w-full flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-xs font-black uppercase text-slate-600 dark:text-slate-300"
              >
                <span>Workspace Controls</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isWorkspaceMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div className={`${isWorkspaceMenuOpen ? 'block' : 'hidden'} lg:block absolute lg:static top-full left-0 w-full z-40 bg-white dark:bg-slate-900 border lg:border-0 border-slate-200 dark:border-slate-800 p-2 lg:p-0 rounded-2xl shadow-xl lg:shadow-none`}>
              <div className="space-y-2.5">
                <button
                  onClick={() => { setActiveTab('mock-config'); setReviewedAttempt(null); setIsWorkspaceMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 text-xs font-black uppercase p-3.5 rounded-2xl border transition-all ${
                    activeTab === 'mock-config' && !reviewedAttempt
                      ? 'bg-indigo-55 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-850 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-100/10'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 hover:text-indigo-600'
                  }`}
                >
                  <Settings className="w-4.5 h-4.5 shrink-0" />
                  <span>Create Mock Challenge</span>
                </button>

                <button
                  onClick={() => { setActiveTab('analytics'); setReviewedAttempt(null); setIsWorkspaceMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 text-xs font-black uppercase p-3.5 rounded-2xl border transition-all ${
                    activeTab === 'analytics' && !reviewedAttempt
                      ? 'bg-indigo-55 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-850 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-100/10'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 hover:text-indigo-600'
                  }`}
                >
                  <TrendingUp className="w-4.5 h-4.5 shrink-0" />
                  <span>Progress Analytics</span>
                </button>

                <button
                  onClick={() => { setActiveTab('review-bank'); setReviewedAttempt(null); setIsWorkspaceMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 text-xs font-black uppercase p-3.5 rounded-2xl border transition-all ${
                    activeTab === 'review-bank' && !reviewedAttempt
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-850 text-rose-600 dark:text-rose-400 shadow-md shadow-rose-100/10'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 hover:text-indigo-600'
                  }`}
                >
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                  <div className="flex-1 flex items-center justify-between text-left">
                    <span>Review Bank</span>
                    <span className="bg-rose-200 dark:bg-rose-800 text-[10px] text-rose-500 font-bold font-mono px-1.5 py-0.5 rounded-md shrink-0">
                      {deviceReviewQuestions.length}
                    </span>
                  </div>
                </button>

                {/* 🚩 DYNAMIC NAVIGATION ROUTE TRIGGER INTEGRATION */}
                {isAdminAuthenticated && (
                  <button
                    onClick={() => { setActiveTab('flagged-manager'); setReviewedAttempt(null); setIsWorkspaceMenuOpen(false); }}
                    className={`w-full flex items-center space-x-3 text-xs font-black uppercase p-3.5 rounded-2xl border transition-all ${
                      activeTab === 'flagged-manager'
                        ? 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-600 shadow-md shadow-red-100/10'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 hover:text-red-600'
                    }`}
                  >
                    <AlertCircle className="w-4.5 h-4.5 shrink-0 text-red-500" />
                    <span>🚩 Flagged Queue</span>
                  </button>
                )}
              </div>
            </div>
          </nav>

          {/* Right workspace core content console */}
          <main className="lg:col-span-9">
            
            {/* Direct Test Review view if user clicked active log */}
            {reviewedAttempt && activeTab === 'review' ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 transition-all duration-150">
                <div className="flex items-center space-x-2.5 mb-6 text-slate-500">
                  <button 
                    onClick={() => { setReviewedAttempt(null); setActiveTab('analytics'); }}
                    className="p-1 px-2.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-1 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Analytics</span>
                  </button>
                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
                  <span className="text-xs font-mono">Attempt Review Sheet</span>
                </div>

                {/* Performance Title Panel */}
                <div className="bg-slate-50 dark:bg-slate-850/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 mb-6 flex flex-col sm:flex-row items-center justify-between gap-5">
                  <div>
                    <span className="text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">{reviewedAttempt.subject}</span>
                    <h3 className="text-base sm:text-lg font-extrabold mt-2">Test Assessment Summary</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Executed on {new Date(reviewedAttempt.date).toLocaleString()}</p>
                  </div>
                  
                  {/* Score circle */}
                  <div className="text-center shrink-0">
                     <div className={`h-20 w-20 rounded-full flex flex-col items-center justify-center font-bold text-lg border-4 ${
                      reviewedAttempt.scorePercentage >= 80 ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5' : 
                      reviewedAttempt.scorePercentage >= 50 ? 'border-amber-500 text-amber-500 bg-amber-500/5' : 
                      'border-red-500 text-red-500 bg-red-500/5'
                    }`}>
                      <span>{reviewedAttempt.scorePercentage}%</span>
                      <span className="text-[9px] text-slate-400 font-medium -mt-1">SCORE</span>
                     </div>
                  </div>
                </div>

                {/* Submetrics columns */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-3 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/30 rounded-xl">
                    <span className="text-[10px] text-slate-400 block tracking-wide font-medium uppercase">Correct Answers</span>
                    <span className="text-sm font-extrabold text-emerald-500">{reviewedAttempt.correctCount} / {reviewedAttempt.totalQuestions}</span>
                  </div>
                  <div className="p-3 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/30 rounded-xl">
                    <span className="text-[10px] text-slate-400 block tracking-wide font-medium uppercase">Incorrect Attempts</span>
                    <span className="text-sm font-extrabold text-red-500">{reviewedAttempt.incorrectCount} / {reviewedAttempt.totalQuestions}</span>
                  </div>
                  <div className="p-3 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/30 rounded-xl">
                    <span className="text-[10px] text-slate-400 block tracking-wide font-medium uppercase">Skipped / Unvisited</span>
                    <span className="text-sm font-extrabold text-slate-400">{reviewedAttempt.unattemptedCount}</span>
                  </div>
                  <div className="p-3 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/30 rounded-xl">
                    <span className="text-[10px] text-slate-400 block tracking-wide font-medium uppercase">Time Consumed</span>
                    <span className="text-sm font-extrabold text-rose-500">{Math.floor(reviewedAttempt.timeTaken / 60)}m {reviewedAttempt.timeTaken % 60}s</span>
                  </div>
                </div>

                {/* Question-by-Question Diagnostics */}
                <h4 className="text-xs font-bold text-slate-400 border-b border-slate-100 dark:border-slate-850 pb-2 mb-4 tracking-wider uppercase">Question-by-Question Diagnostic Review</h4>
                
                {reviewedAttempt.answers.length === 0 ? (
                  <div className="text-center p-8 border rounded-xl border-dashed">
                    <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <span className="text-xs text-slate-500 font-medium">Question review sheets are generated on active test submissions.</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {reviewedAttempt.answers.map((ans, idx) => {
                      const qProfile = questions.find(item => item.id === ans.questionId);
                      if (!qProfile) return null;

                      const letters = ['A', 'B', 'C', 'D'];

                      return (
                        <div 
                          key={idx}
                          className={`p-4 sm:p-5 rounded-xl border transition-all ${
                            ans.selectedIndex === null ? 'border-slate-200 dark:border-slate-800 bg-amber-500/5' : 
                            ans.isCorrect ? 'border-emerald-200 dark:border-emerald-950/40 bg-emerald-500/5' : 
                            'border-red-200 dark:border-red-950/40 bg-red-500/5'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3 text-xs">
                            <span className="font-bold text-rose-400 text-[10px]">QUESTION #{idx + 1}</span>
                            <span className={`font-semibold rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wide ${
                              ans.selectedIndex === null ? 'bg-amber-100 text-amber-700 dark:bg-amber-955 dark:text-amber-300' : 
                              ans.isCorrect ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-955' : 
                              'bg-red-100 text-red-700 dark:bg-red-955'
                            }`}>
                              {ans.selectedIndex === null ? 'Skipped' : ans.isCorrect ? 'Correct Option Selected' : 'Incorrect Choice'}
                            </span>
                          </div>

                          <div className="mb-3">
                            <FormattedText text={qProfile.questionText} className="text-sm font-semibold leading-relaxed" />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                            {qProfile.options.map((opt, optIdx) => {
                              const isCorrect = qProfile.correctAnswerIndex === optIdx;
                              const isUserSelected = ans.selectedIndex === optIdx;
                              
                              let optClass = 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50';
                              if (isCorrect) {
                                optClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold';
                              } else if (isUserSelected) {
                                optClass = 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-bold';
                              }

                              return (
                                <div key={optIdx} className={`text-xs p-2.5 rounded-lg border flex items-center space-x-2 ${optClass}`}>
                                  <span className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                                    isCorrect ? 'bg-emerald-600 text-white border-emerald-600' :
                                    isUserSelected ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-slate-700'
                                  }`}>
                                    {letters[optIdx]}
                                  </span>
                                  <div className="truncate flex-1">
                                    <FormattedText text={opt} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {qProfile.explanation && (
                            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs leading-relaxed border border-slate-200 dark:border-slate-700">
                              <span className="font-bold text-rose-500 block mb-1 uppercase tracking-wider text-[9px]">DIAGNOSTIC EXPLANATION:</span>
                              <p className="font-medium text-slate-500 dark:text-slate-300">{qProfile.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === 'mock-config' && !reviewedAttempt ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-[0.2em] uppercase mb-2 ml-1 font-display">Target Exam Countdowns</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {examCounters.map(counter => (
                      <ExamCounterCard 
                        key={counter.id} 
                        counter={counter} 
                        onUpdate={handleUpdateExamCounter} 
                      />
                    ))}
                  </div>
                </div>

                <DailyGoalCard goal={dailyGoal} onUpdateTarget={handleUpdateDailyBaseTarget} />

                <div className="grid grid-cols-3 gap-3 animate-fade-in shadow-sm">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none truncate">Questions</div>
                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-display leading-none">{questions.length}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none truncate">Mocks Given</div>
                    <div className="text-lg font-black text-rose-500 font-display leading-none">{attempts.length}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none truncate">Accuracy</div>
                    <div className="text-lg font-black text-emerald-500 font-display leading-none">{avgAccuracy}%</div>
                  </div>
                </div>

                <div className="relative rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-850 p-6 text-white overflow-hidden shadow-xl shadow-indigo-550/20 border border-indigo-500/10">
                  <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 shrink-0 opacity-10">
                    <Sparkles className="h-14 w-14 text-white" />
                  </div>
                  <div className="flex items-center space-x-3">
                    <Zap className="h-4 w-4 text-emerald-300 animate-pulse" />
                    <span className="text-[11px] font-black tracking-[0.2em] uppercase font-display"> MOCK Simulator Ready</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl shadow-indigo-105/30 border border-indigo-50 dark:border-slate-800/80 flex flex-col justify-between transition-all">
                  <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                    <div>
                      <h3 className="text-xl font-black tracking-tight font-display">Launch New Mock Test</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configure real-time assessment parameters</p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900">
                      <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Practice Subject</label>
                        <div className="relative">
                          <select 
                            value={quizSubject}
                            onChange={(e) => setQuizSubject(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 px-4 py-3.5 rounded-2xl text-xs font-bold appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                          >
                            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Subjects</option>
                            {availableSubjects.map(sub => (
                              <option key={sub} value={sub} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{sub}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Question Count</label>
                          <input 
                            type="number"
                            value={quizCount}
                            onChange={(e) => setQuizCount(Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 px-4 py-3.5 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Time (Minutes)</label>
                          <input 
                            type="number"
                            value={timerMinutes}
                            max={180}
                            onChange={(e) => setTimerMinutes(Math.min(180, Math.max(1, parseInt(e.target.value) || 0)))}
                            className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 px-4 py-3.5 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                            disabled={!hasTimer}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handlePrepareQuiz}
                      disabled={questions.length === 0}
                      className={`flex-grow py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-transform flex items-center justify-center space-x-2 font-display uppercase tracking-widest cursor-pointer ${
                        questions.length === 0
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 shadow-xl dark:shadow-none'
                      }`}
                    >
                      <Check className="h-5 w-5" />
                      <span>START FULL-SCREEN QUIZ</span>
                    </button>
                    <button 
                      onClick={() => {
                        setHasTimer(false);
                        handlePrepareQuiz();
                      }}
                      className="px-8 py-4 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 cursor-pointer rounded-2xl font-bold transition-colors text-sm"
                    >
                      Untimed Practice Mode
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'review-bank' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight font-display text-indigo-900 dark:text-indigo-400">Review Question Bank</h2>
                    <p className="text-xs text-slate-400 font-medium mt-1">Questions you bookmarked or answered incorrectly in past mocks.</p>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (deviceReviewQuestions.length === 0) {
                        alert("No questions in review bank yet!");
                        return;
                      }
                      const count = Math.min(deviceReviewQuestions.length, 20);
                      const selected = [...deviceReviewQuestions].sort(() => 0.5 - Math.random()).slice(0, count);
                      setActiveQuizQuestions(selected);
                      setActiveQuizSettings({
                        questionCount: selected.length,
                        subject: "Review Mock",
                        hasTimer: true,
                        durationMinutes: Math.ceil(selected.length * 1.5)
                      });
                    }}
                    className="flex items-center justify-center space-x-2 bg-rose-600 text-white font-black text-xs py-3.5 px-6 rounded-2xl shadow-lg shadow-rose-100 dark:shadow-none hover:bg-rose-700 transition active:scale-95"
                  >
                    <Zap className="w-4 h-4" />
                    <span>START REVIEW MOCK (MAX 20)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {deviceReviewQuestions.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center rounded-[2.5rem]">
                      <Sparkles className="h-12 w-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                      <h3 className="text-lg font-black text-slate-400">Your review bank is empty</h3>
                      <p className="text-xs text-slate-400 mt-2">Finish a mock test or bookmark questions to see them here.</p>
                    </div>
                  ) : (
                    deviceReviewQuestions.map(q => (
                      <div key={q.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl group relative overflow-hidden transition-all hover:shadow-md">
                        <div className="absolute top-0 right-0 p-4 flex space-x-2">
                           {localReviewBank[q.id]?.needsReview && (
                            <span className="bg-rose-500/10 text-rose-500 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider border border-rose-500/20">Review Tag</span>
                           )}
                           <button 
                             onClick={() => toggleBookmark(q.id)}
                             className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
                               localReviewBank[q.id]?.isBookmarked ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-slate-50 dark:bg-slate-850 text-slate-400 border border-slate-200 dark:border-slate-750'
                             }`}
                           >
                            <Check className={`h-4 w-4 ${localReviewBank[q.id]?.isBookmarked ? 'opacity-100' : 'opacity-30'}`} />
                           </button>
                        </div>
                        
                        <div className="pr-12">
                          <div className="flex items-center space-x-2 mb-3">
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-black px-2 py-0.5 rounded-lg uppercase tracking-tight">{q.subject}</span>
                            {q.topic && <span className="text-[10px] text-slate-400 font-medium">#{q.topic}</span>}
                          </div>
                          <div className="mb-4">
                            <FormattedText text={q.questionText} className="text-sm font-bold leading-relaxed pr-8" />
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                            {q.options.map((opt, idx) => (
                              <div key={idx} className={`p-2.5 rounded-xl text-xs border flex items-start space-x-2 ${
                                idx === q.correctAnswerIndex ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 font-bold' : 'bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-800 text-slate-500'
                              }`}>
                                <span className="opacity-50 shrink-0">{String.fromCharCode(65 + idx)}.</span>
                                <FormattedText text={opt} className="inline-block" />
                              </div>
                            ))}
                          </div>
                          
                          {q.explanation && (
                            <div className="mt-4 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl">
                              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Explanation</span>
                              <FormattedText text={q.explanation} className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'questions' && !reviewedAttempt ? (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold tracking-tight">Question Bank Database Console</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Edit, add, or delete single questions in your database.</p>
                    </div>

                    <button
                      onClick={() => setIsFormOpen(!isFormOpen)}
                      className="flex h-10 items-center justify-center space-x-1 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow cursor-pointer transition-all shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create Single MCQ Manually</span>
                    </button>
                  </div>

                  {isFormOpen && (
                    <form onSubmit={handleCreateManualQuestion} className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4 animate-fade-in">
                      <h5 className="text-xs font-extrabold text-rose-500 uppercase">MCQ Generator Wizard</h5>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">Question Subject Group</label>
                          <input
                            type="text"
                            value={newSubject}
                            onChange={(e) => setNewSubject(e.target.value)}
                            placeholder="e.g. Mathematics, Programming..."
                            className="w-full text-xs font-semibold h-10 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 outline-none text-slate-900 dark:text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-400 block mb-1.5">Correct Option Choice</label>
                          <select
                            value={newCorrectIndex}
                            onChange={(e) => setNewCorrectIndex(parseInt(e.target.value) || 0)}
                            className="w-full text-xs font-semibold h-10 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 outline-none text-slate-900 dark:text-slate-100"
                          >
                            <option value="0" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Option A is Correct Answer</option>
                            <option value="1" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Option B is Correct Answer</option>
                            <option value="2" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Option C is Correct Answer</option>
                            <option value="3" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Option D is Correct Answer</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1.5">Question Text / Statement</label>
                        <textarea
                          rows={2}
                          value={newQText}
                          onChange={(e) => setNewQText(e.target.value)}
                          placeholder="Type your question statement here..."
                          className="w-full text-xs font-semibold p-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {newOptions.map((opt, idx) => (
                          <div key={idx}>
                            <label className="text-xs font-bold text-slate-400 block mb-1">{String.fromCharCode(65 + idx)} option label</label>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const next = [...newOptions];
                                next[idx] = e.target.value;
                                setNewOptions(next);
                              }}
                              placeholder={`Option label ${String.fromCharCode(65 + idx)}...`}
                              className="w-full text-xs font-semibold h-9 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 outline-none text-slate-900 dark:text-slate-100"
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1">Step explanation (Optional)</label>
                        <input
                          type="text"
                          value={newExplanation}
                          onChange={(e) => setNewExplanation(e.target.value)}
                          placeholder="Provide descriptive reasoning or solutions steps..."
                          className="w-full text-xs font-semibold h-9 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 outline-none text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsFormOpen(false)}
                          className="h-9 px-4 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                        >
                          Discard
                        </button>
                        <button
                          type="submit"
                          className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow cursor-pointer"
                        >
                          Save Question
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 card-row">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3.5 h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search questions by key text description..."
                      className="w-full text-xs font-semibold h-10 pl-9 pr-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl outline-none text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    <span className="text-xs font-bold text-slate-400 uppercase shrink-0">Filter:</span>
                    <select
                      value={filterSubject}
                      onChange={(e) => setFilterSubject(e.target.value)}
                      className="w-full sm:w-44 text-xs font-semibold h-10 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-3 outline-none text-slate-900 dark:text-slate-100"
                    >
                      <option value="All" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Subjects</option>
                      {availableSubjects.map((sub, idx) => (
                        <option key={idx} value={sub} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{sub}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredQuestions.length === 0 ? (
                  <div className="text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl">
                    <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-3 shrink-0" />
                    <p className="text-xs font-bold text-slate-500">No matching questions in database.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Clear your searching tags or upload some HTML sheets to populate.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredQuestions.map((q) => {
                      const letters = ['A', 'B', 'C', 'D'];
                      const isBookmarked = localReviewBank[q.id]?.isBookmarked || false;
                      return (
                        <div 
                          key={q.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-705 shadow-sm transition-all"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3.5">
                              <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 px-2 rounded-md py-0.5 uppercase tracking-wider">{q.subject}</span>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => toggleBookmark(q.id)}
                                  className={`p-1.5 rounded-md transition-all ${
                                    isBookmarked ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                                  }`}
                                  title="Bookmark for review"
                                >
                                  <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                                </button>
                                <button
                                  onClick={() => handleDeleteFromBank(q.id)}
                                  className="text-slate-450 hover:text-red-500 p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                                  title="Remove question"
                                >
                                  <Trash2 className="h-3.5 w-3.5 hover:scale-110 active:scale-95" />
                                </button>
                              </div>
                            </div>

                            <div className="mb-4">
                              <FormattedText text={q.questionText} className="text-xs font-bold text-slate-850 dark:text-slate-150 leading-relaxed" />
                            </div>

                            <div className="space-y-1.5 mb-4">
                              {q.options.map((opt, oIdx) => (
                                <div 
                                  key={oIdx} 
                                  className={`text-[11px] p-2 rounded-lg border flex items-center space-x-1.5 ${
                                    oIdx === q.correctAnswerIndex ? 'border-emerald-250 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-semibold' : 'border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  <span className={`h-4.5 w-4.5 text-[9px] shrink-0 rounded flex items-center justify-center font-bold ${
                                    oIdx === q.correctAnswerIndex ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
                                  }`}>
                                    {letters[oIdx]}
                                  </span>
                                  <div className="truncate flex-1">
                                    <FormattedText text={opt} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {q.explanation && (
                            <div className="p-3 bg-slate-100/50 dark:bg-slate-800/40 rounded-xl text-[10px] text-slate-500 dark:text-slate-400 mt-2 border border-slate-150/40 dark:border-slate-850/40 leading-relaxed">
                              <strong>Step Explanation:</strong> <FormattedText text={q.explanation} className="inline" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {/* TAB 4: Analytics page */}
            {activeTab === 'analytics' && !reviewedAttempt ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm text-center">
                    <span className="text-[10px] text-slate-400 block font-bold tracking-widest uppercase">Total Mock attempts</span>
                    <span className="text-xl font-extrabold mt-1 block">{totalTests} Trials</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm text-center">
                    <span className="text-[10px] text-slate-400 block font-bold tracking-widest uppercase">Average Accuracy</span>
                    <span className="text-xl font-extrabold text-emerald-500 mt-1 block">{avgAccuracy}% Ratio</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm text-center">
                    <span className="text-[10px] text-slate-400 block font-bold tracking-widest uppercase">Questions Solved</span>
                    <span className="text-xl font-extrabold text-rose-500 mt-1 block">{correctAccumulated} MCQs</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl shadow-sm text-center">
                    <span className="text-[10px] text-slate-400 block font-bold tracking-widest uppercase">Average Speed</span>
                    <span className="text-xl font-extrabold mt-1 block">{avgSpeedSec}s / Q</span>
                  </div>
                </div>

                {attempts.length === 0 ? (
                  <div className="text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl">
                    <Activity className="h-10 w-10 text-slate-400 mx-auto mb-3 shrink-0" />
                    <p className="text-xs font-bold text-slate-500">No chart data gathered yet.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Submit your first mock practice challenge to generate history logs.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                      <h4 className="text-xs font-bold text-slate-450 tracking-wider uppercase mb-4">Exam Score Trend Over Time</h4>
                      <div className="h-60 w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={getScoreChartData()} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                            <XAxis dataKey="name" stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                            <YAxis domain={[0, 100]} stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                            <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }} />
                            <Line type="monotone" dataKey="score" stroke="#f43f5e" strokeWidth={3} activeDot={{ r: 8 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
                      <h4 className="text-xs font-bold text-slate-450 tracking-wider uppercase mb-4">Accuracy breakdown by Subject (%)</h4>
                      <div className="h-60 w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getSubjectAccuracyChartData()} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                            <XAxis dataKey="subject" stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                            <YAxis domain={[0, 100]} stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                            <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }} />
                            <Bar dataKey="accuracy" fill="#10b981" radius={[8, 8, 0, 0]} barSize={34} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm overflow-hidden transition-colors">
                  <h4 className="text-xs font-extrabold text-slate-400 mb-4 tracking-wider uppercase">Historical Mock Exam Journals</h4>
                  {attempts.length === 0 ? (
                    <div className="text-xs p-5 text-center text-slate-450">No historical exam registers found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold select-none">
                            <th className="py-3 px-2">Assigned Subject</th>
                            <th className="py-3 px-2">Test Date</th>
                            <th className="py-3 px-2 text-center">Score Ratio</th>
                            <th className="py-3 px-2 text-center">Diagnostics</th>
                            <th className="py-3 px-2 text-right">Action Links</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-850 font-medium">
                          {attempts.map((att) => {
                            const dateObj = new Date(att.date);
                            return (
                              <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-all">
                                <td className="py-3 px-2 font-bold">{att.subject}</td>
                                <td className="py-3 px-2 text-slate-450">{dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                <td className="py-3 px-2 text-center">
                                  <span className={`px-2 py-0.5 rounded-full font-bold font-mono ${
                                    att.scorePercentage >= 80 ? 'bg-emerald-500/10 text-emerald-500' :
                                    att.scorePercentage >= 50 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                                  }`}>
                                    {att.scorePercentage}%
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-center text-[11px] font-mono text-slate-400">
                                  {att.correctCount} Right | {att.incorrectCount} Wrong
                                </td>
                                <td className="py-3 px-2 text-right">
                                  <button
                                    onClick={() => { setReviewedAttempt(att); setActiveTab('review'); }}
                                    className="text-rose-500 hover:text-rose-600 font-bold hover:underline inline-flex items-center space-x-0.5 group cursor-pointer text-xs"
                                  >
                                    <span>Review Answers</span>
                                    <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* 🚩 LIVE NAVIGATION MANAGER ROUTE INTERACTION ELEMENT */}
            {activeTab === 'flagged-manager' && isAdminAuthenticated && (
              <FlaggedQuestionsManager />
            )}
          </main>
        </div>
      </div>

      {/* Offline Status footer bar banner */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-20 py-4 text-center text-[11px] text-slate-400 transition-colors select-none">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
          <span>&copy; Made by Akash Chaudhary for his Beautiful Wife ,Trishna</span>
          <span className="flex items-center space-x-1 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-0.5 bg-slate-50 dark:bg-slate-950 font-bold text-[10px]">
            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span>100% Cloud Synchronized Practice Ready</span>
          </span>
        </div>
      </footer>

      {/* GLOBAL MODALS */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsAdminModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-xl">
                    <ShieldCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white font-display">Admin Section</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Management Portal</p>
                  </div>
                </div>
                <button onClick={() => setIsAdminModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              {!isAdminAuthenticated ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Pin Code Required</label>
                    <input 
                      type="password"
                      value={adminPasswordInput}
                      onChange={(e) => { setAdminPasswordInput(e.target.value); setAdminError(false); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (adminPasswordInput === '123456') {
                            setIsAdminAuthenticated(true);
                            setAdminPasswordInput("");
                          } else {
                            setAdminError(true);
                          }
                        }
                      }}
                      className={`w-full bg-slate-50 dark:bg-slate-850 border ${adminError ? 'border-rose-300 ring-4 ring-rose-500/10' : 'border-slate-200 dark:border-slate-800'} px-5 py-4 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900 dark:text-slate-100`}
                      placeholder="••••••"
                      autoFocus
                    />
                    {adminError && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-1 uppercase tracking-wider">Invalid Administrator Password</p>}
                  </div>
                  <button 
                    onClick={() => {
                      if (adminPasswordInput === '123456') {
                        setIsAdminAuthenticated(true);
                        setAdminPasswordInput("");
                      } else {
                        setAdminError(true);
                      }
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-4 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                  >
                    LOGIN TO ADMIN
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                   <form onSubmit={handleAddNewSubjectTag} className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-750 mb-2">
                     <label className="block text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1.5">Add Custom Bulk Subject Tag</label>
                     <div className="flex space-x-2">
                       <input 
                         type="text" 
                         value={newCustomTagInput} 
                         onChange={(e) => setNewCustomTagInput(e.target.value)}
                         placeholder="e.g. Geography Level 1" 
                         className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold px-2.5 py-1.5 rounded-xl outline-none text-slate-900 dark:text-slate-100"
                       />
                       <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl transition-all">
                         <Plus className="w-3.5 h-3.5" />
                       </button>
                     </div>
                   </form>

                   <button
                    onClick={() => { setActiveTab('questions'); setReviewedAttempt(null); setIsAdminModalOpen(false); }}
                    className="flex items-center space-x-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:border-indigo-200 transition-all text-left"
                  >
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                      <LayoutGrid className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Question Bank</div>
                      <div className="text-[10px] text-slate-400 font-medium">Manage and edit bank</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { setIsUploadModalOpen(true); setIsAdminModalOpen(false); }}
                    className="flex items-center space-x-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 hover:border-indigo-200 transition-all text-left"
                  >
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                      <FileCode className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Bulk Extractor</div>
                      <div className="text-[10px] text-slate-400 font-medium">HTML Mock Parsing</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { handleResetDatabase(); setIsAdminModalOpen(false); }}
                    className="flex items-center space-x-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:border-rose-200 transition-all text-left group"
                  >
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
                      <Trash2 className="h-5 w-5 text-rose-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">Master Reset</div>
                      <div className="text-[10px] text-slate-400 font-medium">Wipe all practice data</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => setIsAdminAuthenticated(false)}
                    className="mt-4 py-2 border border-slate-100 dark:border-slate-800 rounded-xl text-[9px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest text-center transition-colors"
                  >
                    Sign Out Administrator
                  </button>
                </div>
               )}
            </div>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => !uploadProgress && setIsUploadModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
            {!uploadProgress && (
              <button 
                onClick={() => setIsUploadModalOpen(false)} 
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            )}

            <div className="space-y-6 mt-2">
              <h3 className="text-2xl font-black tracking-tight mb-2 flex items-center space-x-2 text-slate-900 dark:text-white font-display">
                <FileCode className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <span>Bulk HTML Question Extractor</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl font-medium">
                Drag and drop your offline HTML mockup tests here. Our resilient parsing engine will instantly extract questions, options, and keys into format-ready banks.
              </p>

              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => !uploadProgress && fileInputRef.current?.click()}
                className={`mt-4 border-2 border-dashed border-indigo-100 dark:border-indigo-950/80 hover:border-indigo-600 dark:hover:border-indigo-500/50 bg-slate-50/30 dark:bg-slate-900/40 rounded-[2rem] p-10 text-center transition-all group ${uploadProgress ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <input 
                  type="file" 
                  accept=".html, .htm" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  multiple
                  className="hidden" 
                />
                {uploadProgress ? (
                  <div className="flex flex-col items-center justify-center space-y-4 py-2">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-sm font-black text-slate-700 dark:text-slate-300 font-display">
                      Processing {uploadProgress.current} of {uploadProgress.total} file(s)...
                    </div>
                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {uploadProgress.questionsFound} potential questions extracted so far
                    </div>
                    <div className="w-full max-w-xs bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300 mx-auto" style={{ width: `${Math.max(5, (uploadProgress.current / Math.max(1, uploadProgress.total)) * 100)}%` }}></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-10 w-10 text-slate-400 group-hover:text-indigo-650 mx-auto mb-3 transition-colors shrink-0" />
                    <span className="text-sm font-black block mb-1 text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-display">Drag and Drop HTML mockup files here</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 block">or click to browse your folders (Accepts bulk .html files)</span>
                  </>
                )}
              </div>

              {uploadError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 text-xs rounded-xl flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">Extraction Info:</span>
                    <p className="mt-0.5">{uploadError}</p>
                  </div>
                </div>
              )}

              {/* Dynamic / Persistent Target Subject Selector Dropdown Module */}
              <div className="pt-4">
                <label className="text-xs font-black text-slate-400 dark:text-slate-500 block mb-2 uppercase font-display">Target Subject Tag (Fixed Selection)</label>
                <div className="flex items-center space-x-3">
                   <div className="relative flex-1">
                     <select
                       value={stagingSubject}
                       onChange={(e) => handleUpdateStagingSubject(e.target.value)}
                       className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-xs font-bold appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                     >
                       {subjectTagsList.map((tag) => (
                         <option key={tag} value={tag} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{tag}</option>
                       ))}
                     </select>
                     <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                   </div>
                   <span className="text-[10px] text-slate-400 hidden sm:block max-w-xs leading-tight">
                     These files will map to <strong className="text-indigo-500">{stagingSubject}</strong>. (This target remains frozen for bulk sets until updated).
                   </span>
                </div>
              </div>

              {/* Staging Render */}
              {stagedQuestions.length > 0 && (
                <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-6 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-black tracking-tight">Extracted Questions Preview ({stagedQuestions.length})</h4>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={copyAllStagedToClipboard}
                        className={`p-2 rounded-lg transition-all cursor-pointer ${copyingAll ? 'bg-emerald-100 text-emerald-600' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'}`}
                        title="Copy All Extracted Text"
                      >
                        {copyingAll ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                      
                      {!isSaving && !importSuccess && (
                        <button
                          onClick={saveStagedToBank}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition uppercase"
                        >
                          <Check className="h-4 w-4" />
                          <span>Confirm & Import</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isSaving && (
                    <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 mb-4 animate-pulse">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Committing to Firebase...</span>
                        <span className="text-xs font-mono font-bold">{savingProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${savingProgress}%` }} />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 text-center italic">Writing data structures securely to cloud indexes...</p>
                    </div>
                  )}

                  {importSuccess && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 mb-4 flex items-center space-x-3 text-emerald-700 dark:text-emerald-400 animate-bounce-slow">
                      <Check className="h-5 w-5 shrink-0" />
                      <span className="text-xs font-bold">{importSuccess}</span>
                    </div>
                  )}

                  <button onClick={() => setStagedQuestions([])} className="self-end text-[10px] font-bold text-slate-400 hover:text-rose-500 hidden sm:block mb-2">Clear Queue</button>         
                  
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 border border-slate-100 dark:border-slate-800 p-2 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                    {stagedQuestions.map((q, qIndex) => (
                      <div key={qIndex} className="p-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl relative group">
                        <div className="absolute top-3 right-3 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => deleteStagedItem(qIndex)} className="p-1 rounded-md bg-red-50 text-red-500 dark:bg-red-900/30 hover:bg-red-100 transition cursor-pointer" title="Remove item">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="mb-2 pr-12">
                            <FormattedText text={q.questionText} className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           {q.options.map((opt, optIndex) => (
                              <div key={optIndex} className={`text-[10px] px-2 py-1 rounded border truncate flex items-center space-x-1 ${q.correctAnswerIndex === optIndex ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-300 font-bold' : 'bg-slate-50 border-slate-100 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'}`}>
                                <span className="opacity-50">{String.fromCharCode(65 + optIndex)}:</span>
                                <FormattedText text={opt} className="truncate" />
                              </div>
                           ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

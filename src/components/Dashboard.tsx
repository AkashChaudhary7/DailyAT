/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  doc,
  writeBatch,
  setDoc,
  deleteDoc,
  getDocs,
  where,
  limit,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { parseUniversalHTML, normalizeHindiText } from '../lib/htmlParser';
import { SAMPLE_QUESTIONS } from '../utils/sampleData';
import {
  getCachedQuestions,
  saveQuestionsToIndexedDB,
  deleteQuestionFromIndexedDB,
  clearQuestionsIndexedDB
} from '../lib/indexedDb';
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
  Trophy,
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
import { Question, TestAttempt, QuizSettings, ExamCounter, DailyGoal, ExamConfig } from '../types';
import MockTestInterface from './MockTestInterface';
import FormattedText from './FormattedText';

const LOCAL_STORAGE_MAX_BYTES = 4 * 1024 * 1024; // 4MB Limit

export const getLocalStorageSize = (): number => {
  let total = 0;
  try {
    for (const x in localStorage) {
      if (localStorage.hasOwnProperty(x)) {
        const val = localStorage.getItem(x);
        if (val) {
          total += (val.length + x.length) * 2; // UTF-16 approximation
        }
      }
    }
  } catch (e) {}
  return total;
};

// Safe localStorage wrapper with active 4MB predicted capacity safeguard
const safeLocalStorageSetItem = (key: string, value: string): boolean => {
  try {
    const currentSize = getLocalStorageSize();
    const oldValLength = ((localStorage.getItem(key) || '').length + key.length) * 2;
    const newValLength = (value.length + key.length) * 2;
    const predictedSize = currentSize - oldValLength + newValLength;

    if (predictedSize > LOCAL_STORAGE_MAX_BYTES) {
      console.warn(`[LocalStorage Safe-Guard] Blocked saving "${key}" because predicted total storage would be ${(predictedSize / (1024 * 1024)).toFixed(2)} MB, exceeding the 4MB limit.`);
      return false;
    }

    localStorage.setItem(key, value);
    // Dispatch instant custom storage budget change event for React components to pick up
    window.dispatchEvent(new CustomEvent('localstorage_budget_change'));
    return true;
  } catch (error) {
    console.error(`[LocalStorage Safe-Guard] Failed to save "${key}" due to quota bounds:`, error);
    return false;
  }
};

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
    }, (error) => {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Quota") || errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("exceeded")) {
        console.warn("Firestore status: Flagged Questions manager is viewing local fallback (quota limit reached).");
      } else {
        console.warn("Firestore flagged_questions warning:", error);
      }
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

const DEFAULT_EXAM_CONFIGS: ExamConfig[] = [
  {
    id: 'exam-cgl',
    name: 'SSC CGL Tier 1',
    durationMinutes: 60,
    subjectDistribution: {
      'Mathematics': 25,
      'Reasoning': 25,
      'English': 25,
      'General Studies': 25
    }
  },
  {
    id: 'exam-ntpc',
    name: 'Railway NTPC',
    durationMinutes: 90,
    subjectDistribution: {
      'Mathematics': 35,
      'Reasoning': 30,
      'Science': 20,
      'Current Affairs': 15
    }
  },
  {
    id: 'exam-csat',
    name: 'UPSC Prelims CSAT',
    durationMinutes: 120,
    subjectDistribution: {
      'Reasoning': 40,
      'Mathematics': 40
    }
  }
];

export default function Dashboard() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [localReviewBank, setLocalReviewBank] = useState<Record<string, LocalReviewState>>({});
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('mock-config');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // New offline support and local safeguards states
  const [forceOfflineMode, setForceOfflineMode] = useState<boolean>(false);
  const [offlineDownloadedQuestions, setOfflineDownloadedQuestions] = useState<Question[]>([]);
  const [selectedOfflineSubjects, setSelectedOfflineSubjects] = useState<string[]>([]);
  const [localBytesUsage, setLocalBytesUsage] = useState<number>(0);

  // New Exam Configs pattern states
  const [examConfigs, setExamConfigs] = useState<ExamConfig[]>(DEFAULT_EXAM_CONFIGS);
  const [selectedExamId, setSelectedExamId] = useState<string>("custom");

  // Admin pattern selection and classification states
  const [selectedAdminExamId, setSelectedAdminExamId] = useState<string>("");
  const [newExamName, setNewExamName] = useState<string>("");
  const [newSourceExamTag, setNewSourceExamTag] = useState<string>("");
  const [newExamDuration, setNewExamDuration] = useState<number>(60);
  const [newConfigSubject, setNewConfigSubject] = useState<string>("");
  const [newConfigCount, setNewConfigCount] = useState<number>(10);

  const [isClassifying, setIsClassifying] = useState<boolean>(false);
  const [classificationStatus, setClassificationStatus] = useState<string>("");
  const cancelClassificationRef = useRef<boolean>(false);

  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(false);

  // Firestore Quota / Limit Tracker states
  const [firestoreReads, setFirestoreReads] = useState<number>(() => {
    const saved = localStorage.getItem('FS_TRACK_READS');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [firestoreWrites, setFirestoreWrites] = useState<number>(() => {
    const saved = localStorage.getItem('FS_TRACK_WRITES');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [firestoreDeletes, setFirestoreDeletes] = useState<number>(() => {
    const saved = localStorage.getItem('FS_TRACK_DELETES');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [lastQuotaResetTimestamp, setLastQuotaResetTimestamp] = useState<string>(() => {
    const saved = localStorage.getItem('FS_TRACK_RESET_DATE');
    return saved || new Date().toISOString().split('T')[0];
  });
  const [resetCountdown, setResetCountdown] = useState<string>("");
  const [isTestingQuota, setIsTestingQuota] = useState<boolean>(false);
  const [quotaTestResult, setQuotaTestResult] = useState<{ success: boolean; msg: string; } | null>(null);

  const trackFirestoreRead = (count: number) => {
    setFirestoreReads(prev => {
      const next = prev + count;
      localStorage.setItem('FS_TRACK_READS', String(next));
      return next;
    });
  };

  const trackFirestoreWrite = (count: number) => {
    setFirestoreWrites(prev => {
      const next = prev + count;
      localStorage.setItem('FS_TRACK_WRITES', String(next));
      return next;
    });
  };

  const trackFirestoreDelete = (count: number) => {
    setFirestoreDeletes(prev => {
      const next = prev + count;
      localStorage.setItem('FS_TRACK_DELETES', String(next));
      return next;
    });
  };

  // Auto Reset Quota Daily
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (today !== lastQuotaResetTimestamp) {
      setFirestoreReads(0);
      setFirestoreWrites(0);
      setFirestoreDeletes(0);
      setLastQuotaResetTimestamp(today);
      localStorage.setItem('FS_TRACK_READS', '0');
      localStorage.setItem('FS_TRACK_WRITES', '0');
      localStorage.setItem('FS_TRACK_DELETES', '0');
      localStorage.setItem('FS_TRACK_RESET_DATE', today);
    }
  }, [lastQuotaResetTimestamp]);

  // Countdown timer calculation
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const target = new Date();
      target.setUTCHours(7, 0, 0, 0); // Pacific Midnight approx (standard GCP resets at PT midnight)
      if (now.getUTCHours() >= 7) {
        target.setUTCDate(target.getUTCDate() + 1);
      }
      const diffMs = target.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
      setResetCountdown(`${hours}h ${mins}m ${secs}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTestFirestoreQuota = async () => {
    setIsTestingQuota(true);
    setQuotaTestResult(null);
    try {
      // Small query to trigger/test Firestore response
      const testDoc = await getDocs(query(collection(db, "db_metadata")));
      trackFirestoreRead(testDoc.size || 1);
      
      setIsQuotaExceeded(false);
      setQuotaTestResult({
        success: true,
        msg: "Firestore Live Sync is online and healthy! Quota is fully active."
      });
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("Quota") || errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("exceeded")) {
        setIsQuotaExceeded(true);
        setQuotaTestResult({
          success: false,
          msg: "Firestore is still reporting Quota Exceeded. Try again after midnight resets."
        });
      } else {
        setQuotaTestResult({
          success: false,
          msg: `Connection test result: ${errMsg}`
        });
      }
    } finally {
      setIsTestingQuota(false);
    }
  };

  const [isScanningDuplicates, setIsScanningDuplicates] = useState<boolean>(false);
  const [duplicateScanStatus, setDuplicateScanStatus] = useState<string>("");

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExamCreatorModalOpen, setIsExamCreatorModalOpen] = useState(false);
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
  const [quizTargetExam, setQuizTargetExam] = useState<string>("All Tag Sets");
  const [stagingTargetExam, setStagingTargetExam] = useState<string>("EO RO");
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
  const [filterClassifiedOnly, setFilterClassifiedOnly] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState(24);
  const [copyingAll, setCopyingAll] = useState<boolean | null>(false);

  // Automatically reset visible limit when search query or filter updates
  useEffect(() => {
    setVisibleCount(24);
  }, [searchQuery, filterSubject, filterClassifiedOnly]);

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

    // Load live questions instantly from high-speed IndexedDB cache (virtually unlimited)
    getCachedQuestions().then(async (cached) => {
      if (cached && cached.length > 0) {
        console.log(`Loaded ${cached.length} questions from IndexedDB cache.`);
        setQuestions(cached);
        
        // Incremental check: check if remote system metadata timestamp is newer
        const localLastSynced = localStorage.getItem('MOCK_LAST_SYNCED_TIME') || '2000-01-01T00:00:00.000Z';
        try {
          console.log(`Checking system update metadata with threshold: ${localLastSynced}`);
          let needsSync = true;
          try {
            // Fetch a single document for tracking system database version - EXACTLY 1 Firestore Read!
            const systemDoc = await getDocs(query(collection(db, "db_metadata")));
            trackFirestoreRead(systemDoc.empty ? 1 : systemDoc.size);
            if (!systemDoc.empty) {
              const sysDoc = systemDoc.docs.find(d => d.id === "system");
              const sysData = sysDoc ? sysDoc.data() : null;
              if (sysData) {
                const lastUpdated = sysData.lastUpdated || '';
                if (lastUpdated && lastUpdated <= localLastSynced) {
                  needsSync = false;
                  console.log(`Cloud database has not changed since last sync (${lastUpdated}). Consumed EXACTLY 1 read!`);
                }
              }
            }
          } catch (metadataError) {
            console.warn("Could not query metadata log, defaulting to optimistic incremental sync:", metadataError);
          }
          
          if (needsSync) {
            console.log(`Starting incremental sync since: ${localLastSynced}`);
            const qIncrement = query(
              collection(db, "questions"), 
              where("updatedAt", ">", localLastSynced),
              orderBy("updatedAt", "asc"),
              limit(1000)
            );
            const snap = await getDocs(qIncrement);
            trackFirestoreRead(snap.empty ? 1 : snap.size);
            if (!snap.empty) {
              console.log(`Found ${snap.size} updated/new questions in cloud. Mirroring to IndexedDB cache...`);
              const updatedList: Question[] = [];
              let maxUpdatedAt = localLastSynced;
              
              snap.forEach(docSnap => {
                const qData = docSnap.data();
                const rawQuestionText = qData.questionText || "";
                const rawExplanation = qData.explanation || "";
                const rawOptions = Array.isArray(qData.options) ? qData.options : [];
                const rawSubject = qData.subject || "";
                const qObj: Question = {
                  ...qData,
                  firestoreId: docSnap.id,
                  id: qData.id || docSnap.id,
                  questionText: rawQuestionText,
                  explanation: rawExplanation,
                  options: rawOptions.map((opt: any) => String(opt)),
                  subject: rawSubject
                } as unknown as Question;
                updatedList.push(qObj);
                
                const qUpdatedAt = qData.updatedAt || qData.createdAt || '';
                if (qUpdatedAt > maxUpdatedAt) {
                  maxUpdatedAt = qUpdatedAt;
                }
              });
              
              // Overwrite updated items in IndexedDB
              await saveQuestionsToIndexedDB(updatedList);
              
              // Reload all from IndexedDB to ensure consistency
              const finalQs = await getCachedQuestions();
              setQuestions(finalQs);
              
              localStorage.setItem('MOCK_LAST_SYNCED_TIME', maxUpdatedAt || new Date().toISOString());
            } else {
              console.log("No new updates in cloud system database. Cache is up to date.");
            }
          }
          setIsQuotaExceeded(false);
        } catch (err: any) {
          const errMsg = err instanceof Error ? err.message : String(err);
          if (errMsg.includes("Quota") || errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("exceeded")) {
            setIsQuotaExceeded(true);
            console.info("Firestore status: High-speed local cache active (Cloud server daily limit reached). Your app is 100% operational.");
          } else {
            console.error("Unexpected sync error:", err);
          }
        }
      } else {
        // If IndexedDB is empty, triggers automatic first-time full sync
        console.log("IndexedDB empty! Firing standard bootstrap first-time full database checkout...");
        try {
          // Check system metadata totalQuestionsCount to verify chunk integrity
          let expectedCloudTotal = 0;
          try {
            const systemMetaSnap = await getDocs(query(collection(db, "db_metadata")));
            trackFirestoreRead(systemMetaSnap.empty ? 1 : systemMetaSnap.size);
            const sysDoc = systemMetaSnap.docs.find(d => d.id === "system");
            if (sysDoc) {
              expectedCloudTotal = sysDoc.data().totalQuestionsCount || 0;
              console.log(`Expected total questions in cloud system metadata: ${expectedCloudTotal}`);
            }
          } catch (metaErr) {
            console.warn("Could not fetch metadata expected total, proceeding optimistically:", metaErr);
          }

          // ⚡ HIGH-SPEED BOOST: Check and fetch chunked bundles first (Uses <1% of the daily reads!)
          console.log("High-Speed Boost: Querying pre-compiled database chunks...");
          let loadedFromChunks = false;
          let compiledList: Question[] = [];
          
          try {
            const chunkSnap = await getDocs(query(collection(db, "questions_chunks")));
            trackFirestoreRead(chunkSnap.empty ? 1 : chunkSnap.size);
            if (!chunkSnap.empty) {
              chunkSnap.forEach(docSnap => {
                const cData = docSnap.data();
                if (Array.isArray(cData.questions)) {
                  cData.questions.forEach((q: any) => {
                    compiledList.push({
                      id: q.id,
                      questionText: q.questionText || "",
                      explanation: q.explanation || "",
                      options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : [],
                      subject: q.subject || "General Studies",
                      targetExam: q.targetExam || "",
                      correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
                      correctAnswer: q.correctAnswer || "",
                      updatedAt: q.updatedAt || q.createdAt || "",
                      createdAt: q.createdAt || ""
                    } as Question);
                  });
                }
              });
              
              // Only load from chunks if they are non-empty and match the expected total count in a stable range (over 25 items fallback threshold)
              const isValidChunks = compiledList.length > 0 && (expectedCloudTotal === 0 ? compiledList.length > 25 : compiledList.length >= expectedCloudTotal);
              
              if (isValidChunks) {
                console.log(`✓ High-speed download complete. Loaded ${compiledList.length} questions from chunks in just ${chunkSnap.size} reads instead of ${compiledList.length} reads!`);
                await saveQuestionsToIndexedDB(compiledList);
                setQuestions(compiledList);
                
                let maxTime = '2000-01-01T00:00:00.000Z';
                compiledList.forEach(q => {
                  const qTime = q.updatedAt || q.createdAt || '';
                  if (qTime > maxTime) {
                    maxTime = qTime;
                  }
                });
                
                localStorage.setItem('MOCK_LAST_SYNCED_TIME', maxTime);
                setIsQuotaExceeded(false);
                loadedFromChunks = true;

                // Sync live database questions modified or added since this chunk's threshold
                try {
                  console.log(`Checking for incremental updates since chunk creation context: ${maxTime}`);
                  const incSnap = await getDocs(query(
                    collection(db, "questions"),
                    where("updatedAt", ">", maxTime),
                    orderBy("updatedAt", "asc"),
                    limit(1000)
                  ));
                  trackFirestoreRead(incSnap.empty ? 1 : incSnap.size);
                  if (!incSnap.empty) {
                    console.log(`Found ${incSnap.size} newer/differential questions in live database. Merging into local storage...`);
                    const finalMerged = [...compiledList];
                    incSnap.forEach(docSnap => {
                      const qData = docSnap.data();
                      const rawQuestionText = qData.questionText || "";
                      const rawExplanation = qData.explanation || "";
                      const rawOptions = Array.isArray(qData.options) ? qData.options : [];
                      const rawSubject = qData.subject || "";
                      const qObj: Question = {
                        ...qData,
                        firestoreId: docSnap.id,
                        id: qData.id || docSnap.id,
                        questionText: rawQuestionText,
                        explanation: rawExplanation,
                        options: rawOptions.map((opt: any) => String(opt)),
                        subject: rawSubject
                      } as unknown as Question;

                      const existingIdx = finalMerged.findIndex(x => x.id === qObj.id);
                      if (existingIdx > -1) {
                        finalMerged[existingIdx] = qObj;
                      } else {
                        finalMerged.push(qObj);
                      }

                      const qTime = qData.updatedAt || qData.createdAt || '';
                      if (qTime > maxTime) {
                        maxTime = qTime;
                      }
                    });

                    await saveQuestionsToIndexedDB(finalMerged);
                    setQuestions(finalMerged);
                    localStorage.setItem('MOCK_LAST_SYNCED_TIME', maxTime);
                  }
                } catch (incErr) {
                  console.warn("Bootstrap incremental check failed:", incErr);
                }
              } else {
                console.log(`Database chunks found but they are incomplete (${compiledList.length} loaded vs ${expectedCloudTotal} expected). Skipping chunks to fetch full live collection...`);
              }
            }
          } catch (chunkErr) {
            console.warn("High-speed chunk query failed or empty, falling back to document collection...", chunkErr);
          }

          if (!loadedFromChunks) {
            // Fallback to reading individual documents (legacy)
            const fullSnap = await getDocs(query(
              collection(db, "questions"),
              orderBy("updatedAt", "desc"),
              limit(1000)
            ));
            trackFirestoreRead(fullSnap.empty ? 1 : fullSnap.size);
            const fullList: Question[] = [];
            let maxTime = '2000-01-01T00:00:00.000Z';
            
            fullSnap.forEach(docSnap => {
              const qData = docSnap.data();
              const rawQuestionText = qData.questionText || "";
              const rawExplanation = qData.explanation || "";
              const rawOptions = Array.isArray(qData.options) ? qData.options : [];
              const rawSubject = qData.subject || "";
              const qObj: Question = {
                ...qData,
                firestoreId: docSnap.id,
                id: qData.id || docSnap.id,
                questionText: rawQuestionText,
                explanation: rawExplanation,
                options: rawOptions.map((opt: any) => String(opt)),
                subject: rawSubject
              } as unknown as Question;
              fullList.push(qObj);
              
              const itemTime = qData.updatedAt || qData.createdAt || '';
              if (itemTime > maxTime) {
                maxTime = itemTime;
              }
            });
            
            if (fullList.length > 0) {
              await saveQuestionsToIndexedDB(fullList);
              setQuestions(fullList);
              localStorage.setItem('MOCK_LAST_SYNCED_TIME', maxTime || new Date().toISOString());
            } else {
              setQuestions(SAMPLE_QUESTIONS);
              await saveQuestionsToIndexedDB(SAMPLE_QUESTIONS);
            }
          }
          setIsQuotaExceeded(false);
        } catch (err: any) {
          const errMsg = err instanceof Error ? err.message : String(err);
          if (errMsg.includes("Quota") || errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("exceeded")) {
            setIsQuotaExceeded(true);
            console.info("Firestore status: High-speed local cache active (Cloud server daily limit reached). Using local questions.");
          } else {
            console.error("Full init fetch failure:", err);
          }
          setQuestions(SAMPLE_QUESTIONS);
        }
      }
    });

    // Clean up legacy localStorage cache to save standard storage limits
    localStorage.removeItem('MOCK_LIVE_QUESTIONS_CACHE');

    // Load Offline Cache downloaded questions
    const storedOfflineDownloads = localStorage.getItem('MOCK_OFFLINE_DOWNLOADED_QUESTIONS');
    if (storedOfflineDownloads) {
      try {
        setOfflineDownloadedQuestions(JSON.parse(storedOfflineDownloads));
      } catch (e) { console.error(e); }
    }

    // Load local exam configs if stored
    const storedExamsLocal = localStorage.getItem('MOCK_EXAM_CONFIGS');
    if (storedExamsLocal) {
      try {
        setExamConfigs(JSON.parse(storedExamsLocal));
      } catch (e) { }
    }

    // Measure total initial localStorage bytes usage
    let currentUsage = 0;
    try {
      for (const k in localStorage) {
        if (localStorage.hasOwnProperty(k)) {
          const val = localStorage.getItem(k);
          if (val) {
            currentUsage += (val.length + k.length) * 2; // UTF-16 approximation
          }
        }
      }
      setLocalBytesUsage(currentUsage);
    } catch (e) { }

     // Real-time listener for Exam patterns configurations
    const unsubscribeExams = onSnapshot(collection(db, "exam_configs"), (snapshot) => {
      trackFirestoreRead(snapshot.size || 1);
      const loadedExams = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as unknown as ExamConfig[];
      setExamConfigs(loadedExams);
      safeLocalStorageSetItem('MOCK_EXAM_CONFIGS', JSON.stringify(loadedExams));
      setIsQuotaExceeded(false);
    }, (error) => {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Quota") || errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("exceeded")) {
        setIsQuotaExceeded(true);
        console.info("Firestore status: High-speed local cache active (Cloud server daily limit reached). Your patterns settings are loaded from cache.");
      } else {
        console.error("Firestore exam_configs sync status info:", error);
      }
    });

    // Real-time listener for Subject tags sync across devices
    const unsubscribeTags = onSnapshot(doc(db, "db_metadata", "subject_tags"), (docSnap) => {
      trackFirestoreRead(1);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && Array.isArray(data.tags)) {
          setSubjectTagsList(data.tags);
          safeLocalStorageSetItem('MOCK_SUBJECT_TAGS', JSON.stringify(data.tags));
        }
      }
    }, (error) => {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Quota") || errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("exceeded")) {
        setIsQuotaExceeded(true);
        console.info("Firestore status: High-speed local cache active (Cloud server daily limit reached). Load tags from browser cache.");
      } else {
        console.warn("Firestore subject_tags sync status warning:", error);
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
      safeLocalStorageSetItem('MOCK_ATTEMPTS', JSON.stringify([]));
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
          safeLocalStorageSetItem('MOCK_DAILY_GOAL', JSON.stringify(newGoal));
        } else {
          setDailyGoal(parsedGoal);
        }
      } catch (e) { }
    }

    return () => {
      unsubscribeExams();
      unsubscribeTags();
    };
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
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            });
            await batch.commit();

            // Set system update metadata trigger
            try {
              await setDoc(doc(db, "db_metadata", "system"), {
                lastUpdated: new Date().toISOString()
              }, { merge: true });
            } catch (metaErr) {
              console.error("Failed to write system metadata trigger:", metaErr);
            }

            safeLocalStorageSetItem('MOCK_OFFLINE_QUESTIONS', JSON.stringify([]));
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

  // Listen to localstorage change events to refresh bytes consumption
  useEffect(() => {
    const handleStorageChange = () => {
      setLocalBytesUsage(getLocalStorageSize());
    };
    window.addEventListener('localstorage_budget_change', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('localstorage_budget_change', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Handles updating the dynamic tags list
  const handleAddNewSubjectTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = newCustomTagInput.trim();
    if (!cleanTag) return;
    
    if (subjectTagsList.includes(cleanTag)) {
      alert("This tag is already configured inside the system dropdown.");
      return;
    }

    const updatedTags = [...subjectTagsList, cleanTag];
    setSubjectTagsList(updatedTags);
    safeLocalStorageSetItem('MOCK_SUBJECT_TAGS', JSON.stringify(updatedTags));
    
    if (isOnline) {
      try {
        await setDoc(doc(db, "db_metadata", "subject_tags"), {
          tags: updatedTags,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Failed to sync subject tag to Firestore:", err);
      }
    }
    
    // Auto shift selected target to the newly created tag and freeze it
    setStagingSubject(cleanTag);
    safeLocalStorageSetItem('MOCK_STICKY_UPLOAD_TAG', cleanTag);
    
    setNewCustomTagInput("");
    alert(`Successfully registered "${cleanTag}" tag.`);
  };

  const handleUpdateStagingSubject = (val: string) => {
    setStagingSubject(val);
    safeLocalStorageSetItem('MOCK_STICKY_UPLOAD_TAG', val);
  };

  const saveQuestionsToDB = (newQList: Question[]) => {
    setQuestions(newQList);
    saveQuestionsToIndexedDB(newQList).catch(err => {
      console.error("IndexedDB background write error:", err);
    });
    if (isOnline) {
      // Lazy background chunk rebuild so it runs smoothly without blocking client
      setTimeout(() => {
        rebuildCloudQuestionsChunks(newQList, true).catch(err => {
          console.error("Background chunk compiler error:", err);
        });
      }, 1000);
    }
  };

  const rebuildCloudQuestionsChunks = async (questionsToChunk?: Question[], silent?: boolean) => {
    const listToProcess = questionsToChunk || questions;
    if (listToProcess.length === 0) {
      if (!silent) alert("No questions found in active bank to prepare cloud chunks!");
      return;
    }
    
    try {
      console.log(`Rebuilding cloud question chunks for ${listToProcess.length} items...`);
      const chunkSize = 800; // Staying safe below 1MB
      const chunksCount = Math.ceil(listToProcess.length / chunkSize);
      
      for (let i = 0; i < chunksCount; i++) {
        const start = i * chunkSize;
        const slice = listToProcess.slice(start, start + chunkSize);
        
        const cleanSlice = slice.map(q => ({
          id: q.id,
          questionText: q.questionText || "",
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswerIndex: q.correctAnswerIndex !== undefined ? q.correctAnswerIndex : 0,
          explanation: q.explanation || "",
          subject: q.subject || "General Studies",
          targetExam: q.targetExam || "",
          updatedAt: q.updatedAt || "",
          createdAt: q.createdAt || ""
        }));

        await setDoc(doc(db, "questions_chunks", `chunk_${i}`), {
          questions: cleanSlice,
          updatedAt: new Date().toISOString(),
          index: i,
          count: cleanSlice.length
        });
        trackFirestoreWrite(1);
      }
      
      // Set system update metadata trigger
      await setDoc(doc(db, "db_metadata", "system"), {
        lastUpdated: new Date().toISOString(),
        chunksCount: chunksCount,
        totalQuestionsCount: listToProcess.length
      }, { merge: true });
      trackFirestoreWrite(1);

      if (!silent) {
        alert(`✓ Cloud Fast-Load Cache compilation complete! Compiled ${listToProcess.length} questions into ${chunksCount} secure packages. All devices will now load instantly under 1 second!`);
      } else {
        console.log(`[Cache Optimizer] Auto-compiled ${listToProcess.length} questions into ${chunksCount} chunks.`);
      }
    } catch (err) {
      console.error("Failed to compile questions chunks:", err);
      if (!silent) {
        alert("Failed compiling high-speed cloud packages. See console details.");
      }
    }
  };

  const handleUpdateExamCounter = (updated: ExamCounter) => {
    const next = examCounters.map(c => c.id === updated.id ? updated : c);
    setExamCounters(next);
    safeLocalStorageSetItem('MOCK_EXAM_COUNTERS', JSON.stringify(next));
  };

  const handleUpdateDailyBaseTarget = (newBase: number) => {
    const next: DailyGoal = {
        ...dailyGoal,
        baseTarget: newBase,
        currentTarget: newBase,
        progressToday: 0
    };
    setDailyGoal(next);
    safeLocalStorageSetItem('MOCK_DAILY_GOAL', JSON.stringify(next));
  };

  const updateProgress = (count: number) => {
    const next: DailyGoal = {
        ...dailyGoal,
        progressToday: dailyGoal.progressToday + count
    };
    setDailyGoal(next);
    safeLocalStorageSetItem('MOCK_DAILY_GOAL', JSON.stringify(next));
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
    safeLocalStorageSetItem('MOCK_ATTEMPTS', JSON.stringify(newAttempts));
  };

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    safeLocalStorageSetItem('THEME_MODE', nextMode ? 'dark' : 'light');
  };

  const handleResetDatabase = () => {
    if (window.confirm("Are you sure you want to wipe this device's trails and custom counters?")) {
      setQuestions(SAMPLE_QUESTIONS);
      setAttempts([]);
      setLocalReviewBank({});
      safeLocalStorageSetItem('MOCK_ATTEMPTS', JSON.stringify([]));
      safeLocalStorageSetItem('MOCK_REVIEW_STATES', JSON.stringify({}));
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
    const nowStr = new Date().toISOString();
    const prepared = stagedQuestions.map(q => ({
      ...q,
      subject: stagingSubject,
      createdAt: nowStr,
      updatedAt: nowStr
    }));
    setIsSaving(true);
    setSavingProgress(0);
    setImportSuccess(null);

    const nextQList = [...questions];

    try {
      const questionCollection = collection(db, 'questions');
      const total = prepared.length;
      for (let i = 0; i < total; i++) {
        const item = prepared[i];
        const docRef = await addDoc(questionCollection, item);
        trackFirestoreWrite(1);
        item.id = item.id || docRef.id;
        (item as any).firestoreId = docRef.id;
        nextQList.push(item);
        setSavingProgress(Math.round(((i + 1) / total) * 100));
      }
      
      saveQuestionsToDB(nextQList);

      // Set system update metadata trigger
      try {
        await setDoc(doc(db, "db_metadata", "system"), {
          lastUpdated: new Date().toISOString()
        }, { merge: true });
        trackFirestoreWrite(1);
      } catch (metaErr) {
        console.error("Failed to write system metadata trigger:", metaErr);
      }
      
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
      safeLocalStorageSetItem('MOCK_OFFLINE_QUESTIONS', JSON.stringify(offlineQs));
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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        // Set system update metadata trigger
        try {
          await setDoc(doc(db, "db_metadata", "system"), {
            lastUpdated: new Date().toISOString()
          }, { merge: true });
        } catch (metaErr) {
          console.error("Failed to write system metadata trigger:", metaErr);
        }

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
      try {
        await deleteQuestionFromIndexedDB(id);
      } catch (dbErr) {
        console.error("Failed to delete from IndexedDB:", dbErr);
      }

      if (isOnline) {
        try {
          await deleteDoc(doc(db, "questions", id));

          // Set system update metadata trigger
          try {
            await setDoc(doc(db, "db_metadata", "system"), {
              lastUpdated: new Date().toISOString()
            }, { merge: true });
          } catch (metaErr) {
            console.error("Failed to write system metadata trigger:", metaErr);
          }
        } catch (err) {
          console.error("Failed to delete from Firestore:", err);
        }
      }
    }
  };

  const handlePrepareQuiz = () => {
    // Sourced dynamically from Cloud vs local offline storage safeguard
    const isOfflineActive = !isOnline || forceOfflineMode;
    const sourcePool = (isOfflineActive && offlineDownloadedQuestions.length > 0)
      ? offlineDownloadedQuestions
      : (questions.length > 0 ? questions : offlineDownloadedQuestions);
    
    if (sourcePool.length === 0) {
      alert("No questions found in currently active offline cache or live database. Please synchronise questions or restore internet connection.");
      return;
    }

    if (selectedExamId === "custom") {
      let eligible = sourcePool;
      if (quizTargetExam && quizTargetExam !== "All Tag Sets") {
        const lowerExam = quizTargetExam.toLowerCase().trim();
        eligible = eligible.filter(q => 
          (q.targetExam && q.targetExam.toLowerCase().trim() === lowerExam) ||
          (q.subject && q.subject.toLowerCase().trim() === lowerExam)
        );
      }
      if (quizSubject && quizSubject !== "All Subjects") {
        const lowerSub = quizSubject.toLowerCase().trim();
        eligible = eligible.filter(q => q.subject && q.subject.toLowerCase().trim() === lowerSub);
      }

      if (eligible.length === 0) {
        alert(`No active questions available matching the selected filters.`);
        return;
      }

      const shuffled = [...eligible].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.min(quizCount, shuffled.length));

      const settings: QuizSettings = {
        questionCount: selected.length,
        subject: quizSubject !== "All Subjects" ? quizSubject : (quizTargetExam !== "All Tag Sets" ? quizTargetExam : "Custom Practice"),
        hasTimer,
        durationMinutes: timerMinutes
      };
      
      setActiveQuizQuestions(selected);
      setActiveQuizSettings(settings);
    } else {
      const exam = examConfigs.find(e => e.id === selectedExamId);
      if (!exam) {
        alert("Selected Exam Configuration pattern of targets not found.");
        return;
      }

      // Filter pool to questions matching the exam's sourceExamTag if configured
      let examPool = sourcePool;
      if (exam.sourceExamTag) {
        const lowerTag = exam.sourceExamTag.toLowerCase().trim();
        const filteredPool = sourcePool.filter(q => 
          (q.targetExam && q.targetExam.toLowerCase().trim() === lowerTag) || 
          (q.subject && q.subject.toLowerCase().trim() === lowerTag)
        );
        if (filteredPool.length > 0) {
          examPool = filteredPool;
        } else {
          console.warn(`No questions matching source tag "${exam.sourceExamTag}" found. Using global question bank.`);
        }
      }

      // Compile questions according to subject pattern mapping with ±2 random offset
      let compiledList: Question[] = [];
      const statsReport: string[] = [];

      Object.entries(exam.subjectDistribution).forEach(([subjectName, targetCount]) => {
        // Filter pool questions matching target subject category case-insensitively
        const subjectQs = examPool.filter(q => q.subject.toLowerCase() === subjectName.toLowerCase());
        const baseCount = targetCount as number;
        
        // ±2 deviation offset selector
        const randomOffset = Math.floor(Math.random() * 5) - 2; // -2, -1, 0, +1, +2
        const actualCountNeeded = Math.max(0, baseCount + randomOffset);

        if (subjectQs.length > 0) {
          const shuffledSub = [...subjectQs].sort(() => 0.5 - Math.random());
          const selectedSub = shuffledSub.slice(0, Math.min(actualCountNeeded, shuffledSub.length));
          compiledList = [...compiledList, ...selectedSub];
          statsReport.push(`${subjectName}: ${selectedSub.length} questions (target: ${baseCount}, offset: ${randomOffset >= 0 ? '+' : ''}${randomOffset})`);
        } else {
          statsReport.push(`${subjectName}: 0 questions (No matching subject cached)`);
        }
      });

      if (compiledList.length === 0) {
        alert(`The active question bank pool doesn't contain matching questions for any of the subjects mapped to "${exam.name}". Please load or classify questions into standard subjects (such as ${Object.keys(exam.subjectDistribution).join(', ')}) first!`);
        return;
      }

      // Shuffle final compiled list so subjects are distributed throughout the exam
      compiledList.sort(() => 0.5 - Math.random());

      const settings: QuizSettings = {
        questionCount: compiledList.length,
        subject: exam.name,
        hasTimer: true,
        durationMinutes: exam.durationMinutes
      };

      console.log(`Generated exam [${exam.name}]. Distribution stats:\n`, statsReport.join("\n"));
      alert(`Mock generated for ${exam.name}!\nTotal compiled questions: ${compiledList.length}\nDuration: ${exam.durationMinutes} Minutes.\n\nSubject composition detail:\n${statsReport.join("\n")}`);
      
      setActiveQuizQuestions(compiledList);
      setActiveQuizSettings(settings);
    }
  };

  // Admin exam configurations database synced actions
  const handleUpdateExamConfigOnDB = async (config: ExamConfig) => {
    // Optimistically update local state immediately so interface is snappy
    const nextConfigs = examConfigs.map(c => c.id === config.id ? config : c);
    setExamConfigs(nextConfigs);
    safeLocalStorageSetItem('MOCK_EXAM_CONFIGS', JSON.stringify(nextConfigs));

    if (isOnline) {
      try {
        // Complete overwrite (no { merge: true }) so deleted subjects are correctly purged
        await setDoc(doc(db, "exam_configs", config.id), config as any);
        // Event change dispatched to keep bytes tracked
        window.dispatchEvent(new CustomEvent('localstorage_budget_change'));
      } catch (err) {
        console.error("Failed to commit exam config to Firestore:", err);
      }
    }
  };

  const handleDeleteExamConfigFromDB = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this Entire Exam pattern mapping?")) {
      const nextConfigs = examConfigs.filter(c => c.id !== id);
      setExamConfigs(nextConfigs);
      safeLocalStorageSetItem('MOCK_EXAM_CONFIGS', JSON.stringify(nextConfigs));

      if (isOnline) {
        try {
          await deleteDoc(doc(db, "exam_configs", id));
          // Event change dispatched to keep bytes tracked
          window.dispatchEvent(new CustomEvent('localstorage_budget_change'));
        } catch (err) {
          console.error("Failed to delete exam config:", err);
        }
      }
      setSelectedAdminExamId("");
      alert("Exam Config Mapping successfully removed.");
    }
  };

  const handleCreateNewExamConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newExamName.trim();
    if (!name) {
      alert("Please specify a valid Exam name!");
      return;
    }

    const newId = `exam-${Date.now()}`;
    const newConfig: ExamConfig = {
      id: newId,
      name: name,
      durationMinutes: newExamDuration,
      subjectDistribution: {},
      sourceExamTag: newSourceExamTag.trim() || undefined
    };

    // Optimistically update local state immediately so UI refreshes in real-time
    const nextConfigs = [...examConfigs, newConfig];
    setExamConfigs(nextConfigs);
    safeLocalStorageSetItem('MOCK_EXAM_CONFIGS', JSON.stringify(nextConfigs));

    if (isOnline) {
      try {
        await setDoc(doc(db, "exam_configs", newId), newConfig as any);
        alert(`Exam Config [${name}] created instantly! Now add subject weights below.`);
      } catch (err) {
        console.error("Failed creating new exam config:", err);
      }
    } else {
      alert(`Exam Config [${name}] created locally!`);
    }

    setNewExamName("");
    setNewSourceExamTag("");
    setSelectedAdminExamId(newId);
  };

  const handleAddSubjectToConfig = async () => {
    const exam = examConfigs.find(e => e.id === selectedAdminExamId);
    if (!exam) {
      alert("Please select or create an Exam pattern first!");
      return;
    }

    const subj = newConfigSubject.trim();
    if (!subj) {
      alert("Enter a subject name (such as Geography)!");
      return;
    }

    const updatedConfig: ExamConfig = {
      ...exam,
      subjectDistribution: {
        ...exam.subjectDistribution,
        [subj]: newConfigCount
      }
    };

    await handleUpdateExamConfigOnDB(updatedConfig);
    setNewConfigSubject("");
    alert(`Subject [${subj}] weight set to ${newConfigCount} questions inside ${exam.name}!`);
  };

  const handleDeleteSubjectFromConfig = async (subjectKey: string) => {
    const exam = examConfigs.find(e => e.id === selectedAdminExamId);
    if (!exam) return;

    const dist = { ...exam.subjectDistribution };
    delete dist[subjectKey];

    const updatedConfig: ExamConfig = {
      ...exam,
      subjectDistribution: dist
    };

    await handleUpdateExamConfigOnDB(updatedConfig);
    alert(`Deleted subject [${subjectKey}] from ${exam.name} mapping.`);
  };

  // Enhanced Local Subject Auto-Classifier and custom sub-topic tagger (Regex-based)
  const handleApplySubjectClassification = async () => {
    const sourcePool = questions;
    if (sourcePool.length === 0) {
      alert("No active questions available in currently active database or cache pool to analyze.");
      return;
    }

    setIsClassifying(true);
    cancelClassificationRef.current = false;
    setClassificationStatus(`Extracting ${sourcePool.length} questions to process...`);

    try {
      await runLocalRegexClassification();
    } catch (err) {
      console.error("Local Regex scanner failed:", err);
    } finally {
      setIsClassifying(false);
      setClassificationStatus("");
    }
  };

  const runLocalRegexClassification = async () => {
    setClassificationStatus("Analyzing vocabulary and pattern matrices in statements...");
    let updatedCount = 0;
    const source = questions;

    const rajasthanRegex = /rajasthan|jaipur|jodhpur|udaipur|bikaner|kota|alwar|bharatpur|ajmer|mewar|marwar|sanga|pratap|maldeo|chambal|banas|mahi|luni|अरावली|राजस्थान|जयपुर|जोधपुर|उदयपुर|बावड़ी|राजस्थानी|मेवाड़|मारवाड़|दुर्ग|शिशोदिया|राठौड़|कछवाहा|चौहान|पृथ्वीराज/i;

    const rules: { subject: string; topic: string; regex: RegExp }[] = [
      // Polity
      {
        subject: "Polity",
        topic: "Constitution & Polity",
        regex: /\b(article\s+\d+|constitution|parliament|amendment|president|democracy|governance|cji|chief justice|fundamental rights|vice-president|lok\s*sabha|rajya\s*sabha|election commission|panchayat|municipal|governor|legislature)\b|अनुच्छेद|संविधान|संसद|संशोधन|अधिकार|लोकसभा|राज्यसभा|राष्ट्रपति|राज्यपाल|विधानसभा|मुख्यमंत्री|पंचायत/i
      },
      // Mathematics
      {
        subject: "Mathematics",
        topic: "Trigonometry",
        regex: /\b(trigonometry|sine|cosine|tangent|theta|secant|cosecant)\b|त्रिकोणमिति/i
      },
      {
        subject: "Mathematics",
        topic: "Geometry",
        regex: /\b(geometry|triangle|circle|radius|diameter|angle|polygon|rectangle|square|sphere|cone|cylinder)\b|रेखागणित|त्रिभुज|वृत्त|त्रिज्या/i
      },
      {
        subject: "Mathematics",
        topic: "Algebra",
        regex: /\b(algebra|quadratic|equation|factors|variable|polynomial)\b|समीकरण|बीजगणित/i
      },
      {
        subject: "Mathematics",
        topic: "Arithmetic & Quantitative Aptitude",
        regex: /\b(ratio|proportion|probability|permutation|combination|fraction|percentage|average|simple interest|compound interest|profit|loss|time and work|speed|distance|digit|integers|fractions)\b|संख्या|औसत|प्रतिशत|ब्याज|अनुपात/i
      },
      // Computer
      {
        subject: "Computer",
        topic: "Computer Awareness",
        regex: /\b(computer|cpu|software|hardware|ram|rom|microsoft|windows|internet|ms office|word|excel|powerpoint|input device|output device|memory|keyboard|mouse|database|sql|binary|operating system|lan|wan|router|ip address|firewall|malware)\b|कंप्यूटर|सॉफ्टवेयर|हार्डवेयर|इंटरनेट/i
      },
      // Hindi
      {
        subject: "Hindi",
        topic: "Hindi Grammar",
        regex: /\b(hindi)\b|हिंदी|व्याकरण|संधि|समास|पर्यायवाची|विलोम|मुहावरे|संज्ञा|सर्वनाम|विशेषण|क्रिया|तद्भव|तत्सम|कारक|काल|वचन|समानार्थी|लोकोक्ति|अलंकार|रस|छंद|उपसर्ग|प्रत्यय/i
      },
      // Science
      {
        subject: "Science",
        topic: "General Science - Biology",
        regex: /\b(vitamin|cell|organism|organ|enzyme|hormone|protein|virus|bacteria|photosynthesis|blood|dna|rna|disease|microscope|genetics|evolution)\b|विटामिन|कोशिका|डीएनए|आरएनए|जीवाणु|विषाणु|रोग/i
      },
      {
        subject: "Science",
        topic: "General Science - Physics",
        regex: /\b(physics|gravity|force|velocity|acceleration|kinetic|potential|energy|light|sound|thermodynamics|atom|electricity|magnet|lens|refraction|reflection)\b|दर्पण|ऊर्जा|प्रकाश|ध्वनि|बल|गुरुत्वाकर्षण|भौतिक/i
      },
      {
        subject: "Science",
        topic: "General Science - Chemistry",
        regex: /\b(chemistry|chemical|reaction|conductivity|thermal|atom|molecule|compound|periodic table|ph value|acid|base|salt|metal|non-metal|alloy|catalyst)\b|अम्ल|क्षार|लवण|धातु|अधातु|रसायन/i
      },
      // Geography
      {
        subject: "Geography",
        topic: "World Geography",
        regex: /\b(world|ocean|continent|pacific|atlantic|equator|latitude|longitude|meridian|globe|earth|universe|solar system|atmosphere|tectonic)\b|विश्व|महाद्वीप|महासागर|अक्षांश|देशांतर|भूमध्य/i
      },
      {
        subject: "Geography",
        topic: "Geography",
        regex: /\b(geography|river|mountain|monsoon|climate|soil|forest|national park|sanctuary|lake|canal|valley|plateau|desert|map)\b|भूगोल|पहाड़|झील|नदी|मानसून|जलवायु|मिट्टी|पठार|मरुस्थल/i
      },
      // Sports
      {
        subject: "Sports",
        topic: "Sports & Awards",
        regex: /\b(olympic|cricket|medal|trophy|sport|cup|sports|hockey|badminton|football|athlete|awarded|arjuna award|world cup)\b|खेल|क्रिकेट|ओलंपिक/i
      },
      // Current Affairs
      {
        subject: "Current Affairs",
        topic: "Current Affairs 2026",
        regex: /\b(g20|g7|summit|budget|scheme|ministry|news|current affairs|yojana|pension|subsidy|summit)\b|बजट|समिट|योजना/i
      },
      // History
      {
        subject: "History",
        topic: "Ancient History",
        regex: /\b(ancient|civilization|indus valley|harappa|vedas|maurya|gupta|ashoka|harsha|stone age|bronze age)\b|शिलालेख|सभ्यता|मौर्य|गुप्त/i
      },
      {
        subject: "History",
        topic: "Modern & Medieval History",
        regex: /\b(dynasty|battle|mughal|british|independence|freedom struggle|revolt|gandhi|nehru|shasank|emperor|empire|monarch)\b|शासक|युद्ध|रियासत/i
      },
      // Reasoning
      {
        subject: "Reasoning",
        topic: "Logical Reasoning",
        regex: /\b(coding|reasoning|analogy|series|direction|pattern|puzzle|syllogism|blood relation|ranking|seating arrangement|venn diagram)\b|कोडिंग|सादृश्यता|श्रेणी|तर्कशक्ति/i
      },
      // English
      {
        subject: "English",
        topic: "English Grammar",
        regex: /\b(grammar|synonym|antonym|preposition|english|verb|noun|adjective|tense|voice|speech|pronoun|conjunction|idiom|phrase)\b/i
      },
      // Culture
      {
        subject: "Culture",
        topic: "Culture & Heritage",
        regex: /\b(culture|heritage|monument|painting|unesco|classical dance|music style|folklore|fair|festival|fort|haveli|temple)\b|मेला|त्यौहार|नृत्य|वाद्य|यों|वेशभूषा|कला|साहित्य|लोकनृत्य|दुर्ग|हवेली/i
      }
    ];

    const newList = source.map(q => {
      const text = q.questionText.toLowerCase();
      const isRajasthan = rajasthanRegex.test(text);

      let determinedSubject = q.subject || "General Studies";
      let determinedTopic = q.topic || "General";

      for (const rule of rules) {
        if (rule.regex.test(text)) {
          determinedSubject = rule.subject;
          determinedTopic = rule.topic;

          if (isRajasthan) {
            if (rule.subject === "History") {
              determinedTopic = "Rajasthan History";
            } else if (rule.subject === "Polity") {
              determinedTopic = "Rajasthan Polity";
            } else if (rule.subject === "Geography" && rule.topic !== "World Geography") {
              determinedTopic = "Rajasthan Geography";
            } else if (rule.subject === "Culture") {
              determinedTopic = "Rajasthan Art & Culture";
            }
          }
          updatedCount++;
          break;
        }
      }

      return {
        ...q,
        subject: determinedSubject,
        topic: determinedTopic
      };
    });

    // Save results to local memory and persistent high-speed IndexedDB
    saveQuestionsToDB(newList);

    if (isOnline) {
      const batch = writeBatch(db);
      newList.forEach(q => {
        batch.set(doc(db, "questions", q.id), {
          ...q,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      });
      await batch.commit();

      // Trigger system metadata update notification
      try {
        await setDoc(doc(db, "db_metadata", "system"), {
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      } catch (metaErr) {
        console.error("Failed to write system metadata trigger:", metaErr);
      }
    } else {
      setOfflineDownloadedQuestions(newList);
      safeLocalStorageSetItem('MOCK_OFFLINE_DOWNLOADED_QUESTIONS', JSON.stringify(newList));
    }

    alert(`Pattern Match completed! Analyzed standard keywords and successfully re-classified/tagged ${updatedCount} matching records into localized Indian and Rajasthan subjects!`);
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
      safeLocalStorageSetItem('MOCK_REVIEW_STATES', JSON.stringify(updatedLocalReview));
    }
    
    setActiveQuizQuestions(null);
    setActiveQuizSettings(null);
  };

  const handleScanAndPurgeDuplicates = async () => {
    if (questions.length === 0) {
      alert("No active questions available in currently active database or cache pool to scan.");
      return;
    }

    setIsScanningDuplicates(true);
    setDuplicateScanStatus("Comparing question text statements under 99% similarity threshold...");

    setTimeout(async () => {
      try {
        const pool = [...questions];
        const toDeleteIds: string[] = [];

        // To make it very fast, preprocess stripped lower text
        const preprocessed = pool.map(q => ({
          q,
          cleanText: (q.questionText || "").replace(/\s+/g, "").toLowerCase()
        }));

        for (let i = 0; i < preprocessed.length; i++) {
          const item1 = preprocessed[i];
          if (toDeleteIds.includes(item1.q.id)) continue;

          for (let j = i + 1; j < preprocessed.length; j++) {
            const item2 = preprocessed[j];
            if (toDeleteIds.includes(item2.q.id)) continue;

            const text1 = item1.cleanText;
            const text2 = item2.cleanText;
            if (!text1 || !text2) continue;

            const len1 = text1.length;
            const len2 = text2.length;
            const maxLen = Math.max(len1, len2);
            const minLen = Math.min(len1, len2);

            // If length difference is more than 1.5%, they cannot be >= 99% similar
            if ((maxLen - minLen) / maxLen > 0.015) {
              continue;
            }

            // Calculation of Row-optimized Levenshtein
            let prevRow = Array(len2 + 1);
            let currRow = Array(len2 + 1);
            for (let k = 0; k <= len2; k++) prevRow[k] = k;

            for (let r = 1; r <= len1; r++) {
              currRow[0] = r;
              for (let c = 1; c <= len2; c++) {
                const cost = text1[r - 1] === text2[c - 1] ? 0 : 1;
                currRow[c] = Math.min(
                  currRow[c - 1] + 1,
                  prevRow[c] + 1,
                  prevRow[c - 1] + cost
                );
              }
              const temp = prevRow;
              prevRow = currRow;
              currRow = temp;
            }

            const distance = prevRow[len2];
            const similarity = 1.0 - (distance / maxLen);

            if (similarity >= 0.99) {
              toDeleteIds.push(item2.q.id);
            }
          }
        }

        if (toDeleteIds.length === 0) {
          setIsScanningDuplicates(false);
          setDuplicateScanStatus("");
          alert("✓ Scanning Completed: No near-duplicate questions (99%+ match similarity) were detected in your database.");
          return;
        }

        const confirmMsg = `🔍 Scan Results: Found ${toDeleteIds.length} duplicate question(s) that match 99% or more. \n\nAre you sure you want to PERMANENTLY auto-delete all these duplicates from the database and preserve only one copy of each?`;
        
        if (window.confirm(confirmMsg)) {
          setDuplicateScanStatus(`Deleting ${toDeleteIds.length} duplicate entries from database...`);
          
          // Filter current local state
          const remainingPool = questions.filter(q => !toDeleteIds.includes(q.id));
          saveQuestionsToDB(remainingPool);

          // Permanently delete from Firebase Firestore database if online
          if (isOnline) {
            const batchSize = 100;
            const totalToDel = toDeleteIds.length;
            for (let i = 0; i < totalToDel; i += batchSize) {
              const currentBatchIds = toDeleteIds.slice(i, i + batchSize);
              const batch = writeBatch(db);
              currentBatchIds.forEach(id => {
                batch.delete(doc(db, "questions", id));
              });
              await batch.commit();
            }

            // Set system update metadata trigger
            try {
              await setDoc(doc(db, "db_metadata", "system"), {
                lastUpdated: new Date().toISOString()
              }, { merge: true });
            } catch (metaErr) {
              console.error("Failed to write system metadata trigger:", metaErr);
            }
          } else {
            // Also clean up local offline downloaded cache list if present
            const nextOffline = offlineDownloadedQuestions.filter(q => !toDeleteIds.includes(q.id));
            setOfflineDownloadedQuestions(nextOffline);
            safeLocalStorageSetItem('MOCK_OFFLINE_DOWNLOADED_QUESTIONS', JSON.stringify(nextOffline));
          }

          alert(`✓ Success! Permanently deleted ${toDeleteIds.length} duplicate question(s) from the database. Only one unique copy remains!`);
        }
      } catch (err) {
        console.error("Failed to delete duplicates:", err);
        alert("An error occurred while cleaning up duplicate questions.");
      } finally {
        setIsScanningDuplicates(false);
        setDuplicateScanStatus("");
      }
    }, 1000);
  };

  const toggleBookmark = (id: string) => {
    const updatedLocalReview = { ...localReviewBank };
    const currentStatus = updatedLocalReview[id]?.isBookmarked || false;
    
    updatedLocalReview[id] = {
      ...updatedLocalReview[id],
      isBookmarked: !currentStatus
    };
    
    setLocalReviewBank(updatedLocalReview);
    safeLocalStorageSetItem('MOCK_REVIEW_STATES', JSON.stringify(updatedLocalReview));
  };

  const activeQuestionsPoolForListing = useMemo(() => {
    const isOfflineActive = !isOnline || forceOfflineMode;
    if (isOfflineActive && offlineDownloadedQuestions.length > 0) {
      return offlineDownloadedQuestions;
    }
    return questions.length > 0 ? questions : offlineDownloadedQuestions;
  }, [questions, offlineDownloadedQuestions, isOnline, forceOfflineMode]);

  const taggedQuestionsCount = useMemo(() => {
    return activeQuestionsPoolForListing.filter(q => q.topic && q.topic !== "" && q.topic !== "General" && q.topic !== "General Knowledge Studies").length;
  }, [activeQuestionsPoolForListing]);

  const availableSubjects = useMemo(() => {
    const list = new Set<string>();
    activeQuestionsPoolForListing.forEach(q => {
      if (q.subject) list.add(q.subject);
    });
    return Array.from(list);
  }, [activeQuestionsPoolForListing]);

  const availableTargetExams = useMemo(() => {
    const list = new Set<string>();
    activeQuestionsPoolForListing.forEach(q => {
      if (q.targetExam) list.add(q.targetExam);
      else if (q.subject) list.add(q.subject);
    });
    return Array.from(list);
  }, [activeQuestionsPoolForListing]);

  const availableSourceTags = useMemo(() => {
    const list = new Set<string>();
    activeQuestionsPoolForListing.forEach(q => {
      if (q.targetExam) {
        list.add(q.targetExam);
      }
      if (q.subject) {
        list.add(q.subject);
      }
    });
    subjectTagsList.forEach(t => {
      if (t) list.add(t);
    });
    return Array.from(list).filter(Boolean).sort();
  }, [activeQuestionsPoolForListing, subjectTagsList]);

  const filteredQuestions = useMemo(() => {
    const queryLower = searchQuery.toLowerCase();
    const subjectLower = filterSubject.toLowerCase();
    return activeQuestionsPoolForListing.filter(q => {
      const qText = q.questionText || "";
      const matchSearch = searchQuery === "" || 
                          qText.toLowerCase().includes(queryLower) || 
                          (q.options && q.options.some((opt: string) => opt.toLowerCase().includes(queryLower)));
      const matchFilter = filterSubject === "All" || (q.subject && q.subject.toLowerCase() === subjectLower);
      const isClassified = q.topic && q.topic !== "" && q.topic !== "General" && q.topic !== "General Knowledge Studies";
      const matchClassified = !filterClassifiedOnly || isClassified;
      return matchSearch && matchFilter && matchClassified;
    });
  }, [activeQuestionsPoolForListing, searchQuery, filterSubject, filterClassifiedOnly]);

  const totalTests = attempts.length;
  const avgAccuracy = totalTests > 0 
    ? Math.round(attempts.reduce((sum, att) => sum + att.scorePercentage, 0) / totalTests)
    : 0;
  const correctAccumulated = attempts.reduce((sum, att) => sum + att.correctCount, 0);
  const avgSpeedSec = totalTests > 0 
    ? Math.round(attempts.reduce((sum, att) => sum + (att.timeTaken / att.totalQuestions || 10), 0) / totalTests)
    : 0;

  const attemptedQuestionsCount = useMemo(() => {
    const uniqueAttemptedIds = new Set<string>();
    attempts.forEach(att => {
      att.answers?.forEach(ans => {
        if (ans && ans.selectedIndex !== null) {
          uniqueAttemptedIds.add(ans.questionId);
        }
      });
    });
    return uniqueAttemptedIds.size;
  }, [attempts]);

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

  const deviceReviewQuestions = useMemo(() => {
    return questions.filter(q => localReviewBank[q.id]?.isBookmarked || localReviewBank[q.id]?.needsReview);
  }, [questions, localReviewBank]);

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
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 border border-slate-100 dark:border-slate-800 rounded-full px-3 py-1 bg-slate-50 dark:bg-slate-850 text-xs font-medium">
              {isOnline ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Active</span>
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
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-850 text-rose-600 dark:text-rose-450 shadow-md shadow-rose-100/10'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-855 text-slate-500 hover:text-rose-650'
                  }`}
                >
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                  <div className="flex-1 flex items-center justify-between text-left">
                    <span>Review Bank</span>
                    <span className="bg-rose-200 dark:bg-rose-800 text-[10px] text-rose-505 font-bold font-mono px-1.5 py-0.5 rounded-md shrink-0">
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
                        ? 'bg-red-50 dark:bg-red-955/40 border-red-200 text-red-600 shadow-md shadow-red-100/10'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 hover:text-red-650'
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
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none truncate">Questions Attempted</div>
                    <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-display leading-none">{attemptedQuestionsCount}</div>
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
                      <h3 className="text-xl font-black tracking-tight font-display text-indigo-950 dark:text-indigo-100">Launch New Mock Test</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Select an Admin-defined Exam pattern or configure custom parameters</p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900">
                      <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Exam Selection */}
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Target Exam / Practice Mode</label>
                      <div className="relative">
                        <select 
                          value={selectedExamId}
                          onChange={(e) => setSelectedExamId(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-755 px-4 py-3.5 rounded-2xl text-xs font-bold appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                        >
                          <option value="custom" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Custom Practice Quiz</option>
                          {examConfigs.map(config => (
                            <option key={config.id} value={config.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                              🏆 {config.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                      </div>
                    </div>

                    {/* Render custom options ONLY for custom exam mode */}
                    {selectedExamId === "custom" ? (
                      <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Practice Custom Exam Tag</label>
                            <div className="relative">
                              <select 
                                value={quizTargetExam}
                                onChange={(e) => setQuizTargetExam(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 px-4 py-3.5 rounded-2xl text-xs font-bold appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                              >
                                <option value="All Tag Sets" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Tag Sets (Sourced from Uploader)</option>
                                {availableTargetExams.map(tag => (
                                  <option key={tag} value={tag} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{tag}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Practice Subject</label>
                            <div className="relative">
                              <select 
                                value={quizSubject}
                                onChange={(e) => setQuizSubject(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-755 px-4 py-3.5 rounded-2xl text-xs font-bold appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                              >
                                <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Subjects</option>
                                {availableSubjects.map(sub => (
                                  <option key={sub} value={sub} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{sub}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
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
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Locked, Synced Preset parameters visualization */
                      (() => {
                        const conf = examConfigs.find(e => e.id === selectedExamId);
                        if (!conf) return null;
                        const totalQuestionsMapped = Object.values(conf.subjectDistribution).reduce((sum, num) => (sum as number) + (num as number), 0);
                        return (
                          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-150/40 p-5 rounded-2xl space-y-4 animate-fade-in text-left">
                            <div className="flex items-center justify-between text-[10px] font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-widest">
                              <span>🔒 Synced Parameters</span>
                              <span className="bg-indigo-200 dark:bg-indigo-800 text-[9px] px-1.5 py-0.5 rounded">Admin Setup Locked</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold leading-none mb-1">Time Limit</span>
                                <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">{conf.durationMinutes} Minutes</span>
                              </div>
                              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest block font-bold leading-none mb-1">Total questions</span>
                                <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">{totalQuestionsMapped} MCQs</span>
                              </div>
                            </div>
                            
                            {conf.sourceExamTag && (
                              <div className="bg-white dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-850 flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-bold">🎯 Questions Source tag:</span>
                                <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-black px-2.5 py-1 rounded-xl text-[10px] uppercase font-mono">{conf.sourceExamTag}</span>
                              </div>
                            )}

                            <p className="text-[10px] text-slate-400">
                              *Generating this mock automatically compiles categorized questions matching subject layouts, with a random <b>±2 question offset deviation</b> for optimal exam simulation.
                            </p>
                          </div>
                        );
                      })()
                    )}
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

                {/* Brand new Question Bank Category Density Box placed below launch test box */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200/50 dark:border-slate-800/80 shadow-sm mt-6 text-left animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-3 mb-4">
                    <span className="text-xs font-black tracking-wider text-slate-600 dark:text-slate-300 uppercase flex items-center gap-2 font-display">
                      <span>📊</span> Question Bank Category Density
                    </span>
                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-black font-mono bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                      {questions.length} total questions
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {(() => {
                      const activeCounts: Record<string, number> = {};
                      questions.forEach(q => {
                        const sub = q.subject || "General";
                        activeCounts[sub] = (activeCounts[sub] || 0) + 1;
                      });

                      const items = Object.entries(activeCounts);
                      if (items.length === 0) {
                        return <div className="col-span-full py-4 text-center text-xs font-bold text-slate-400 italic">No cached questions available yet. Sync with Firestore to load.</div>;
                      }

                      return items.map(([subj, count]) => (
                        <div key={subj} className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center transition hover:shadow-sm">
                          <span className="text-xs font-bold text-slate-650 dark:text-slate-300 truncate pr-2" title={subj}>{subj}</span>
                          <span className="shrink-0 text-[10px] font-bold font-mono bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg">
                            {count}
                          </span>
                        </div>
                      ));
                    })()}
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

            {activeTab === 'offline-manager' && !reviewedAttempt && (
              <div className="space-y-6 animate-fade-in">
                {/* Card header */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-xl font-black font-display text-indigo-900 dark:text-indigo-400">Offline Cache & Storage Safeguard Hub</h2>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Manage the local storage storage of mock questions on your device. We enforce a strict 4.0 MB safety ceiling to optimize memory footprints and avoid browser crashes.
                  </p>
                  
                  {/* Live stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                    {/* Capacity bar */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Device storage space</span>
                        <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
                          {(localBytesUsage / 1024).toFixed(1)} KB / 4.0 MB ({Math.round((localBytesUsage / (4 * 1024 * 1024)) * 100)}%)
                        </span>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3.5 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            (localBytesUsage / (4 * 1024 * 1024)) > 0.9 
                              ? 'bg-rose-500' 
                              : (localBytesUsage / (4 * 1024 * 1024)) > 0.5 
                                ? 'bg-amber-500' 
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.round((localBytesUsage / (4 * 1024 * 1024)) * 100))}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2">
                        *Questions and mock attempts are cached automatically inside client local storage. After 4MB, old trials are preserved while blocking further overflow.
                      </p>
                    </div>
                    
                    {/* Offline simulation button */}
                    <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-750 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider">Simulator Connection Options</h4>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Toggle Offline Cache Simulator Mode to verify mock generator behavior when disconnected from live database servers.
                        </p>
                      </div>
                      
                      <button
                        onClick={() => {
                          setForceOfflineMode(!forceOfflineMode);
                          alert(forceOfflineMode ? "Live Cloud Synchronization Restored!" : "Simulated Offline Cache Mode Engaged! Questions will generate from local downloaded pool.");
                        }}
                        className={`mt-4 w-full py-2.5 px-4 rounded-xl text-xs font-extrabold uppercase transition active:scale-95 text-center cursor-pointer ${
                          forceOfflineMode 
                            ? 'bg-amber-500 hover:bg-amber-600 text-white shadow shadow-amber-500/20' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow shadow-indigo-600/20'
                        }`}
                      >
                        {forceOfflineMode ? "⚠️ DISENGAGE OFFLINE SIMULATION" : "🔌 ENGAGE OFFLINE SIMULATION"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subject-wise download options */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Subject-wise Download Terminal</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Filter and download questions subject-by-subject. Questions will be safely stored locally under the 4MB safeguard to keep you practicing offline!
                  </p>
                  
                  {/* List subjects with numbers of questions in each */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 my-6">
                    {(() => {
                      const subCounts: Record<string, number> = {};
                      // We compute count from the live database pool (questions) since they download from cloud
                      questions.forEach(q => {
                        const s = q.subject || "General";
                        subCounts[s] = (subCounts[s] || 0) + 1;
                      });
                      
                      const distinctSubjects = Object.keys(subCounts);
                      if (distinctSubjects.length === 0) {
                        return <div className="col-span-full text-center py-4 text-xs font-bold text-slate-400 text-slate-400">Cloud database seems empty! Upload spreadsheet first to cache questions.</div>;
                      }
                      
                      return distinctSubjects.map(sub => {
                        const count = subCounts[sub];
                        const isChecked = selectedOfflineSubjects.includes(sub);
                        return (
                          <label 
                            key={sub}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:bg-indigo-50/20 transition ${
                              isChecked 
                                ? 'border-indigo-500 bg-indigo-55/20 text-indigo-700 dark:text-indigo-300' 
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 text-slate-600 dark:text-slate-450'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedOfflineSubjects(prev => prev.filter(s => s !== sub));
                                  } else {
                                    setSelectedOfflineSubjects(prev => [...prev, sub]);
                                  }
                                }}
                                className="rounded text-indigo-600 h-4 w-4"
                              />
                              <span className="text-xs font-bold">{sub}</span>
                            </div>
                            <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-755 px-1.5 py-0.5 rounded text-slate-500 shrink-0">
                              {count} Qs
                            </span>
                          </label>
                        );
                      });
                    })()}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 border-t border-slate-100 dark:border-slate-850 pt-6">
                    <button
                      onClick={async () => {
                        if (selectedOfflineSubjects.length === 0) {
                          alert("Please select at least one subject checkbox to download!");
                          return;
                        }

                        // Gather all questions matching selected subjects
                        const matchingQuestions = questions.filter(q => 
                          selectedOfflineSubjects.some(sub => q.subject.toLowerCase() === sub.toLowerCase())
                        );

                        if (matchingQuestions.length === 0) {
                          alert("No matching questions detected in cloud database!");
                          return;
                        }

                        // Test serialized length predicted
                        const serialized = JSON.stringify(matchingQuestions);
                        const matchingBytes = serialized.length * 2;
                        
                        if (matchingBytes > LOCAL_STORAGE_MAX_BYTES) {
                          alert(`Cannot download selected questions! Size of selected batch would be ${(matchingBytes / (1024 * 1024)).toFixed(2)} MB, exceeding the 4MB maximum limit. Please select fewer subjects!`);
                          return;
                        }

                        // Save
                        const success = safeLocalStorageSetItem('MOCK_OFFLINE_DOWNLOADED_QUESTIONS', serialized);
                        if (success) {
                          setOfflineDownloadedQuestions(matchingQuestions);
                          alert(`Successfully cached ${matchingQuestions.length} questions of subjects [${selectedOfflineSubjects.join(", ")}] to offline local storage! Size is ${(matchingBytes / 1024).toFixed(1)} KB.`);
                        } else {
                          alert("Local capacity bounds violated! Reduce question count to save.");
                        }
                      }}
                      className="w-full sm:flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest cursor-pointer shadow-lg shadow-emerald-600/10 transition active:scale-95 text-center"
                    >
                      📥 Cached Selected Subjects to Device
                    </button>
                    
                    <button
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete all offline cached questions? This will free memory instantly but disable offline quizzes.")) {
                          localStorage.removeItem('MOCK_OFFLINE_DOWNLOADED_QUESTIONS');
                          setOfflineDownloadedQuestions([]);
                          // Dispatch budget updates
                          window.dispatchEvent(new CustomEvent('localstorage_budget_change'));
                          alert("Device cached questions successfully deleted.");
                        }
                      }}
                      className="w-full sm:w-auto py-3.5 px-6 border border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 rounded-2xl text-xs font-black uppercase tracking-widest cursor-pointer transition active:scale-95 text-center"
                    >
                      🗑️ Wipe Offline Questions
                    </button>
                  </div>

                  {/* Cached overview status */}
                  <div className="mt-6 bg-slate-50 dark:bg-slate-850 p-4 border border-slate-200 dark:border-slate-850 rounded-xl text-left">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-2">Device Cache Overview</span>
                    <div className="text-xs font-bold text-slate-500 space-y-1">
                      <div>📶 Active Online Loop: <span className="text-slate-800 dark:text-slate-200 uppercase">{questions.length} questions in firestore</span></div>
                      <div>🔌 Device Cached Pool: <span className="text-slate-800 dark:text-slate-200 uppercase">{offlineDownloadedQuestions.length} downloaded questions</span></div>
                      <div>📡 Active Quiz Engine Status: {
                        (forceOfflineMode || !isOnline) 
                          ? <span className="text-amber-500 uppercase">OFFLINE MODE (Running on {offlineDownloadedQuestions.length} cached questions)</span>
                          : <span className="text-emerald-500 uppercase">ONLINE ACTIVE (Syncing on {questions.length} database questions)</span>
                      }</div>
                    </div>
                  </div>
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

                    <div className="flex flex-wrap items-center gap-2.5">
                      {isScanningDuplicates ? (
                        <div className="flex h-10 items-center space-x-2 bg-slate-50 dark:bg-slate-850 px-4 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-500">
                          <Activity className="h-3.5 w-3.5 animate-spin text-indigo-505" />
                          <span>{duplicateScanStatus || "Scanning..."}</span>
                        </div>
                      ) : (
                        <button
                          onClick={handleScanAndPurgeDuplicates}
                          className="flex h-10 items-center justify-center space-x-2 px-4 text-xs font-extrabold border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 rounded-xl shadow-sm hover:bg-indigo-100/50 dark:hover:bg-indigo-100/10 cursor-pointer transition-all shrink-0"
                          title="Identify 99%+ verbatim similar questions and wipe them permanently"
                        >
                          <Copy className="h-4 w-4 text-indigo-500" />
                          <span>Scan & Purge Duplicates</span>
                        </button>
                      )}

                      <button
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className="flex h-10 items-center justify-center space-x-1 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow cursor-pointer transition-all shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Create Single MCQ Manually</span>
                      </button>
                    </div>
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

                {/* Local Pattern-Matching Classifications & Autotagging Control Center */}
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-3xl p-5 shadow-sm transition-colors relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.05] dark:opacity-[0.1]">
                    <LayoutGrid className="w-16 h-16 text-indigo-500" />
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                    <div className="space-y-1 text-left">
                      <div className="flex items-center space-x-2">
                        <span className="flex-shrink-0 inline-flex items-center justify-center p-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                          <LayoutGrid className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </span>
                        <h4 className="text-xs font-black tracking-widest text-slate-800 dark:text-slate-100 uppercase font-mono">
                          Local High-Speed Pattern-Matching Engine
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 max-w-xl font-sans leading-relaxed">
                        Uses highly optimized regex patterns in English and Hindi to instantly organize, label, and tag questions into core subjects (Geography, Polity, Science, Computer, Mathematics, Hindi, English, Reasoning) and precise subtopics.
                      </p>
                    </div>

                    {/* Statistics Indicator */}
                    <div className="w-full md:w-auto shrink-0 bg-white dark:bg-slate-950/80 border border-slate-205 dark:border-slate-850 p-3.5 rounded-2xl min-w-[210px] shadow-sm">
                      <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                        <span>Classification ratio</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                          {Math.round((taggedQuestionsCount / Math.max(1, questions.length)) * 100)}%
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-sans">
                        🏷️ <span className="text-indigo-600 dark:text-indigo-400 font-black">{taggedQuestionsCount}</span> / {questions.length} Tagged & Indexed
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-full rounded-full transition-all duration-700" 
                          style={{ width: `${(taggedQuestionsCount / Math.max(1, questions.length)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center justify-between gap-3.5">
                    {isClassifying ? (
                      <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-500/5 border border-amber-500/20 px-3.5 py-2.5 rounded-xl animate-pulse">
                        <div className="flex items-center space-x-2.5 text-left">
                          <Activity className="h-4.5 w-4.5 text-amber-500 animate-spin shrink-0" />
                          <div>
                            <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 block uppercase tracking-wider font-mono">Scanner Running / वर्ग वर्गीकरण जारी...</span>
                            <span className="text-[11px] text-slate-600 dark:text-slate-300 font-sans leading-tight block">{classificationStatus}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => { cancelClassificationRef.current = true; }}
                          className="px-4 py-1.5 bg-red-650 hover:bg-red-750 text-white font-extrabold text-[9px] uppercase rounded-lg tracking-widest transition shadow-md active:scale-95 cursor-pointer"
                        >
                          ⛔ STOP SCANNER
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-[10px] text-slate-405 font-bold font-sans uppercase tracking-wide">
                          {taggedQuestionsCount === questions.length ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold uppercase">✓ All questions catalogued & tagged successfully!</span>
                          ) : (
                            <span>Run pattern engine to tag the remaining <strong className="text-indigo-600 dark:text-indigo-400">{questions.length - taggedQuestionsCount}</strong> untagged questions.</span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2.5">
                          <button
                            onClick={() => handleApplySubjectClassification()}
                            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-4.5 py-2.5 rounded-xl text-xs font-black tracking-wider transition flex items-center space-x-1.5 cursor-pointer shadow hover:shadow-indigo-500/10 uppercase"
                          >
                            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                            <span>🚀 Start Pattern matching Scanner</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
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

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center space-x-2">
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

                    <button
                      onClick={() => setFilterClassifiedOnly(prev => !prev)}
                      className={`h-10 px-3.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all outline-none border cursor-pointer ${
                        filterClassifiedOnly
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-700'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
                      }`}
                      title="Show only classified / auto-tagged standard questions"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{filterClassifiedOnly ? "Showing Classified Only" : "Show Classified Only"}</span>
                    </button>
                  </div>
                </div>

                {filteredQuestions.length === 0 ? (
                  <div className="text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl">
                    <AlertCircle className="h-10 w-10 text-slate-400 mx-auto mb-3 shrink-0" />
                    <p className="text-xs font-bold text-slate-500">No matching questions in database.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Clear your searching tags or upload some HTML sheets to populate.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredQuestions.slice(0, visibleCount).map((q) => {
                        const letters = ['A', 'B', 'C', 'D'];
                        const isBookmarked = localReviewBank[q.id]?.isBookmarked || false;
                        return (
                          <div 
                            key={q.id}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-705 shadow-sm transition-all"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-3.5">
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 px-2 rounded-md py-0.5 uppercase tracking-wider">{q.subject}</span>
                                  {q.topic && q.topic !== "General" && q.topic !== "" && (
                                    <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-150/40 dark:border-indigo-850/40 px-2 rounded-md py-0.5 uppercase tracking-wider">🏷️ {q.topic}</span>
                                  )}
                                </div>
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

                    {filteredQuestions.length > visibleCount && (
                      <div className="flex justify-center pt-2">
                        <button
                          onClick={() => setVisibleCount((prev) => prev + 24)}
                          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white dark:from-indigo-500 dark:to-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] shadow-md hover:shadow-indigo-500/10 active:scale-95 transition-all cursor-pointer"
                        >
                          Load More Questions ({filteredQuestions.length - visibleCount} remaining)
                        </button>
                      </div>
                    )}
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
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
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
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-4 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-95 cursor-pointer"
                  >
                    LOGIN TO ADMIN BLOCK
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left animate-in fade-in duration-200">
                  {/* Left Column: Admin Section Overview & Dedicated Exam Blueprint Launchpad */}
                  <div className="space-y-5 border-r border-slate-100 dark:border-slate-800/60 pr-0 md:pr-6 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="border-b border-slate-105 dark:border-slate-800/50 pb-2">
                        <h4 className="text-sm font-bold tracking-tight text-slate-855 dark:text-slate-100">Admin Control Overview</h4>
                        <p className="text-[10px] text-slate-405 font-medium">Pruned system metrics and unified workspace controls</p>
                      </div>

                      {/* Info Stat counters */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 bg-indigo-50/40 dark:bg-slate-950 border border-indigo-150/10 dark:border-slate-850 rounded-2xl">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-455 block mb-0.5">Active Exams</span>
                          <span className="text-xl font-black text-indigo-650 dark:text-indigo-400">{examConfigs.length}</span>
                        </div>
                        <div className="p-3.5 bg-emerald-50/40 dark:bg-slate-950 border border-emerald-150/10 dark:border-slate-850 rounded-2xl">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-455 block mb-0.5">Classified Sets</span>
                          <span className="text-xl font-black text-emerald-600 dark:text-emerald-450 font-mono">{taggedQuestionsCount} QA</span>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/55 dark:border-slate-800/50 space-y-1.5">
                        <span className="text-[9px] font-black text-slate-455 dark:text-slate-550 uppercase tracking-widest block font-sans">System Performance</span>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Fast-load caches are fully active. All exam schedules utilize balanced randomized deviation matrices when compiling MCQ modules.
                        </p>
                      </div>
                    </div>

                    {/* Launch separate Exam Creator Modal Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsExamCreatorModalOpen(true);
                        }}
                        className="w-full py-4 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-755 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:scale-[1.01] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Trophy className="h-4 w-4 text-indigo-200 animate-bounce" />
                        <span>🏆 Open Dedicated Exam Creator</span>
                      </button>
                      <p className="text-[8.5px] text-slate-400 text-center mt-2.5 font-sans leading-none">
                        Provides absolute granular weight control for customized subject distributions.
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Console Shortcuts & Global Database Management */}
                  <div className="space-y-4">
                    {/* Firestore Quota & Limit Live Tracker Component */}
                    <div id="firestore-quota-tracker" className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 space-y-3 font-sans">
                      <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800 pb-2">
                        <div className="flex items-center space-x-2">
                          <Activity className="h-4 w-4 text-indigo-500 shrink-0" />
                          <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Firestore Live Quota Tracker</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wider ${
                          isQuotaExceeded 
                            ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-450 border border-rose-100 dark:border-rose-900/30" 
                            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/30"
                        }`}>
                          {isQuotaExceeded ? "⚠️ EXCEEDED (OFFLINE ACTIVE)" : "✓ HEALTHY & ONLINE"}
                        </span>
                      </div>

                      {/* Read, Write, Delete limits */}
                      <div className="space-y-2.5">
                        {/* Reads Tracker */}
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>Daily Reads (Limit: 50K)</span>
                            <span className="font-mono">{firestoreReads.toLocaleString()} / 50,000</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${firestoreReads >= 45000 ? 'bg-red-500' : firestoreReads >= 35000 ? 'bg-amber-500' : 'bg-indigo-600'}`} 
                              style={{ width: `${Math.min(100, (firestoreReads / 50000) * 100)}%` }} 
                            />
                          </div>
                        </div>

                        {/* Writes Tracker */}
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>Daily Writes (Limit: 20K)</span>
                            <span className="font-mono">{firestoreWrites.toLocaleString()} / 20,000</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${firestoreWrites >= 18000 ? 'bg-red-500' : firestoreWrites >= 14000 ? 'bg-amber-500' : 'bg-indigo-500'}`} 
                              style={{ width: `${Math.min(100, (firestoreWrites / 20000) * 100)}%` }} 
                            />
                          </div>
                        </div>

                        {/* Deletes Tracker */}
                        <div>
                          <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>Daily Deletes (Limit: 20K)</span>
                            <span className="font-mono">{firestoreDeletes.toLocaleString()} / 20,000</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-850 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${firestoreDeletes >= 18000 ? 'bg-red-500' : firestoreDeletes >= 14000 ? 'bg-amber-500' : 'bg-slate-600'}`} 
                              style={{ width: `${Math.min(100, (firestoreDeletes / 20000) * 100)}%` }} 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Reset countdown & status */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-[10px]">
                        <div>
                          <span className="text-slate-400 block font-bold uppercase tracking-wider text-[8px]">Auto Quota Resets In</span>
                          <span className="font-mono font-black text-slate-700 dark:text-slate-300">{resetCountdown || "Counting down..."}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 block font-bold uppercase tracking-wider text-[8px]">Target Reset Clock</span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">Midnight Pacific Time (PT)</span>
                        </div>
                      </div>

                      {/* Manual reset/recover sync triggers */}
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        <button
                          type="button"
                          onClick={handleTestFirestoreQuota}
                          disabled={isTestingQuota}
                          className="py-1.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/55 text-indigo-600 dark:text-indigo-400 font-extrabold text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-indigo-100 dark:border-indigo-900/30 font-sans"
                        >
                          {isTestingQuota ? "Testing..." : "⚡ Force-Recheck Sync"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("Bhai, kya aap sach mein local quota tracker session status ko zero (0) pe reset karna chahte hain? (This won't clear actual cloud project counts but will reset device metrics)")) {
                              setFirestoreReads(0);
                              setFirestoreWrites(0);
                              setFirestoreDeletes(0);
                              localStorage.setItem('FS_TRACK_READS', '0');
                              localStorage.setItem('FS_TRACK_WRITES', '0');
                              localStorage.setItem('FS_TRACK_DELETES', '0');
                              setIsQuotaExceeded(false);
                            }
                          }}
                          className="py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-655 dark:text-slate-300 font-extrabold text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-slate-200/20 font-sans"
                        >
                          🔄 Zero Local Metrics
                        </button>
                      </div>

                      {quotaTestResult && (
                        <div className={`p-2.5 rounded-xl border text-[9px] leading-tight flex items-start gap-1.5 animate-fade-in ${
                          quotaTestResult.success 
                            ? "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200/50 text-emerald-800 dark:text-emerald-450" 
                            : "bg-rose-50/50 dark:bg-rose-950/10 border-rose-200/50 text-rose-800 dark:text-rose-450"
                        }`}>
                          <span>{quotaTestResult.success ? "✓" : "✗"}</span>
                          <p className="font-extrabold">{quotaTestResult.msg}</p>
                        </div>
                      )}
                    </div>

                    {/* Quick navigation links */}
                    <div className="grid grid-cols-3 gap-2 pt-1 font-sans">
                      <button
                        onClick={() => { setActiveTab('questions'); setReviewedAttempt(null); setIsAdminModalOpen(false); }}
                        className="bg-slate-50 dark:bg-slate-850 hover:bg-indigo-50 border border-slate-150 dark:border-slate-800 text-center p-2 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-350 cursor-pointer"
                      >
                        Q-Bank
                      </button>
                      <button
                        onClick={() => { setIsUploadModalOpen(true); setIsAdminModalOpen(false); }}
                        className="bg-slate-50 dark:bg-slate-850 hover:bg-indigo-50 border border-slate-150 dark:border-slate-800 text-center p-2 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-350 cursor-pointer"
                      >
                        HTML Parse
                      </button>
                      <button
                        onClick={() => { handleResetDatabase(); setIsAdminModalOpen(false); }}
                        className="bg-red-50 hover:bg-red-100 dark:bg-rose-950/20 border border-rose-100 dark:border-slate-800 p-2 rounded-xl text-[10px] font-bold text-rose-600 cursor-pointer"
                      >
                        Master Reset
                      </button>
                    </div>

                    <div className="flex items-center justify-end border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-1.5 font-sans">
                      <button 
                        onClick={() => setIsAdminAuthenticated(false)}
                        className="py-1 px-3 border border-slate-200 dark:border-slate-850 rounded-xl text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest text-center transition-colors"
                      >
                        Sign Out Administrator
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🏆 DEPARATED EXAM BLUEPRINT CREATOR MODAL */}
      {isExamCreatorModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setIsExamCreatorModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setIsExamCreatorModalOpen(false)} 
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="space-y-6 mt-2 text-left font-sans">
              <h3 className="text-2xl font-black tracking-tight mb-2 flex items-center space-x-2.5 text-slate-900 dark:text-white font-display">
                <Trophy className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <span>Exam Pattern & Blueprint Creator</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl font-medium">
                Create customized exam formats, configure specific subject quotas, and set timed limits. The configuration will automatically apply to generated practice papers.
              </p>

              <div className="space-y-5 pt-2">
                {/* Selector of current config mapping */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-widest mb-1.5 font-sans">Select Exam Pattern to Configure</label>
                  <select
                    value={selectedAdminExamId}
                    onChange={(e) => setSelectedAdminExamId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-755 px-4 py-3 rounded-xl text-xs font-bold outline-none text-slate-705 dark:text-slate-305"
                  >
                    <option value="">-- Create New Standard Pattern --</option>
                    {examConfigs.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.durationMinutes} minutes)</option>
                    ))}
                  </select>
                </div>

                {selectedAdminExamId ? (
                  (() => {
                    const targetPattern = examConfigs.find(c => c.id === selectedAdminExamId);
                    if (!targetPattern) return null;
                    return (
                      <div className="space-y-4 animate-fade-in bg-slate-50/50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-755">
                        <div className="flex justify-between items-center pb-2.5 border-b border-slate-150 dark:border-slate-805">
                          <span className="text-xs font-black text-slate-755 dark:text-slate-300 truncate">{targetPattern.name} Parameter Table</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteExamConfigFromDB(targetPattern.id)}
                            className="text-[10px] bg-red-100 hover:bg-red-200 dark:bg-red-955 text-red-650 px-3 py-1.5 rounded-lg font-bold transition"
                          >
                            Delete Entire Exam
                          </button>
                        </div>

                        {/* Source Question Tag Edit Box */}
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-450 dark:text-slate-505 uppercase tracking-wider">Source Question Tag / File Tag (e.g., EO RO)</label>
                           <select 
                             value={targetPattern.sourceExamTag || ""}
                             onChange={(e) => {
                               const updated = { ...targetPattern, sourceExamTag: e.target.value };
                               const nextConfigs = examConfigs.map(c => c.id === targetPattern.id ? updated : c);
                               setExamConfigs(nextConfigs);
                               handleUpdateExamConfigOnDB(updated);
                             }}
                             className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 px-3.5 py-2.5 rounded-xl text-[11px] font-bold outline-none text-slate-705 dark:text-slate-300 appearance-none cursor-pointer"
                           >
                             <option value="">-- Choose Tag / Subject --</option>
                             {availableSourceTags.map(tag => (
                               <option key={tag} value={tag}>{tag}</option>
                             ))}
                           </select>
                          <p className="text-[8px] text-slate-400">If configured, questions are only filtered from items that match this exact uploaded tag.</p>
                        </div>

                        {/* Subjects Distribution List */}
                        <div className="space-y-1.5">
                          <label className="block text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Subject Limits</label>
                          {Object.entries(targetPattern.subjectDistribution).length === 0 ? (
                            <p className="text-[10px] text-slate-450 italic py-2">No subject weights mapped. Set custom distributions below.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                              {Object.entries(targetPattern.subjectDistribution).map(([subjKey, valCount]) => (
                                <div key={subjKey} className="flex justify-between items-center text-xs bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-2.5 rounded-xl">
                                  <span className="font-bold text-slate-650 dark:text-slate-355 truncate mr-2">{subjKey}</span>
                                  <div className="flex items-center space-x-1.5 shrink-0">
                                    <span className="bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md text-[10px] font-mono font-black">{valCount} Qs</span>
                                    <button 
                                      type="button"
                                      onClick={() => handleDeleteSubjectFromConfig(subjKey)}
                                      className="text-slate-400 hover:text-red-500 p-1 hover:bg-rose-50 dark:hover:bg-rose-955 rounded transition"
                                      title="Delete mapped subject"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Add subject weight parameters form */}
                        <div className="border-t border-slate-205 dark:border-slate-755 pt-3.5 space-y-2.5">
                          <span className="text-[9px] font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-widest block font-sans">Add/Update Pattern Subject</span>
                          
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Subject Label</label>
                              <input 
                                type="text"
                                placeholder="Subject (e.g. Science)"
                                value={newConfigSubject}
                                onChange={(e) => setNewConfigSubject(e.target.value)}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-755 px-3 py-2 rounded-xl text-xs font-bold outline-none text-slate-855 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Max Questions</label>
                              <input 
                                type="number"
                                placeholder="e.g. 20"
                                value={newConfigCount}
                                onChange={(e) => setNewConfigCount(Math.max(1, parseInt(e.target.value) || 0))}
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-755 px-3 py-2 rounded-xl text-xs font-bold outline-none text-slate-855 dark:text-white"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddSubjectToConfig}
                            className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase rounded-xl shadow-md tracking-wider transition active:scale-95 text-center cursor-pointer"
                          >
                            Save Subject Layout Spec
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  /* Create New Exam Form */
                  <form onSubmit={handleCreateNewExamConfig} className="bg-indigo-50/20 dark:bg-indigo-950/10 p-5 rounded-2xl border border-indigo-150/50 space-y-4 animate-fade-in">
                    <span className="text-[10px] font-black text-indigo-650 dark:text-indigo-400 uppercase tracking-widest block text-left font-sans">New Exam Pattern Initial Specs</span>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 font-sans">Exam Blueprint Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. NEET UG Mock 2026"
                        value={newExamName}
                        onChange={(e) => setNewExamName(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 px-4 py-2.5 rounded-xl text-xs font-bold font-sans outline-none text-slate-855 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1 font-sans">Source Questions Group Tag</label>
                      <select 
                        value={newSourceExamTag}
                        onChange={(e) => setNewSourceExamTag(e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 px-4 py-2.5 rounded-xl text-xs font-bold font-sans outline-none text-slate-855 dark:text-white appearance-none cursor-pointer"
                      >
                        <option value="">-- Choose Tag / Subject --</option>
                        {availableSourceTags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                      <p className="text-[8px] text-slate-405 mt-1">Filters only the source materials uploaded with this tag.</p>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-450 uppercase mb-1 font-sans">Exam Timer Limit (Minutes)</label>
                      <input 
                        type="number"
                        placeholder="60"
                        value={newExamDuration}
                        onChange={(e) => setNewExamDuration(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-755 px-4 py-2.5 rounded-xl text-xs font-bold font-sans outline-none text-slate-855 dark:text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase rounded-xl shadow-lg tracking-widest transition cursor-pointer"
                    >
                      ➕ REGISTER NEW EXAM PATTERN
                    </button>
                  </form>
                )}
              </div>
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
                  <div className="py-4 font-sans">
                    <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center border border-indigo-100/60 dark:border-indigo-900/40 group-hover:scale-105 group-hover:bg-indigo-100/50 dark:group-hover:bg-indigo-900/60 transition-all duration-300 shadow-sm">
                      <UploadCloud className="h-7 w-7 text-indigo-500 dark:text-indigo-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                    </div>
                    <span className="text-sm font-extrabold block mb-1.5 text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors font-display tracking-tight">
                      Drag & Drop HTML Mockup Files Here
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 block max-w-sm mx-auto leading-relaxed">
                      Accepts bulk <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-indigo-500 font-extrabold">.html</code> files. Or click to browse folders.
                    </span>
                  </div>
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
              <div className="pt-4 space-y-3">
                <label className="text-xs font-black text-slate-400 dark:text-slate-500 block mb-1 uppercase font-display">Target Subject Tag (Fixed Selection)</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                   <div className="relative flex-1">
                     <select
                       value={stagingSubject}
                       onChange={(e) => handleUpdateStagingSubject(e.target.value)}
                       className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 px-4 py-3.5 rounded-xl text-xs font-bold appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                     >
                       {subjectTagsList.map((tag) => (
                         <option key={tag} value={tag} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{tag}</option>
                       ))}
                     </select>
                     <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                   </div>
                   <div className="flex items-center gap-2 flex-1">
                     <input
                       type="text"
                       placeholder="Enter new custom tag..."
                       id="bulk-custom-tag-input"
                       className="flex-1 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                       onKeyDown={async (e) => {
                         if (e.key === 'Enter') {
                           e.preventDefault();
                           const targetValue = (e.currentTarget as HTMLInputElement).value.trim();
                           if (!targetValue) return;
                           if (subjectTagsList.includes(targetValue)) {
                             handleUpdateStagingSubject(targetValue);
                             (e.currentTarget as HTMLInputElement).value = "";
                             return;
                           }
                           const updatedTags = [...subjectTagsList, targetValue];
                           setSubjectTagsList(updatedTags);
                           safeLocalStorageSetItem('MOCK_SUBJECT_TAGS', JSON.stringify(updatedTags));
                           handleUpdateStagingSubject(targetValue);
                           (e.currentTarget as HTMLInputElement).value = "";
                           if (isOnline) {
                             try {
                               await setDoc(doc(db, "db_metadata", "subject_tags"), {
                                 tags: updatedTags,
                                 updatedAt: new Date().toISOString()
                               });
                               trackFirestoreWrite(1);
                             } catch (err) {
                               console.error("Failed to sync tags:", err);
                             }
                           }
                         }
                       }}
                     />
                     <button
                       type="button"
                       onClick={async () => {
                         const el = document.getElementById('bulk-custom-tag-input') as HTMLInputElement;
                         const targetValue = el ? el.value.trim() : "";
                         if (!targetValue) return;
                         if (subjectTagsList.includes(targetValue)) {
                           handleUpdateStagingSubject(targetValue);
                           el.value = "";
                           return;
                         }
                         const updatedTags = [...subjectTagsList, targetValue];
                         setSubjectTagsList(updatedTags);
                         safeLocalStorageSetItem('MOCK_SUBJECT_TAGS', JSON.stringify(updatedTags));
                         handleUpdateStagingSubject(targetValue);
                         el.value = "";
                         if (isOnline) {
                           try {
                             await setDoc(doc(db, "db_metadata", "subject_tags"), {
                               tags: updatedTags,
                               updatedAt: new Date().toISOString()
                             });
                             trackFirestoreWrite(1);
                           } catch (err) {
                             console.error("Failed to sync tags:", err);
                           }
                         }
                       }}
                       className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shrink-0 uppercase tracking-wider font-sans shadow-md"
                     >
                       + Append Tag
                     </button>
                   </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  These files will map to <strong className="text-indigo-500 font-bold">{stagingSubject}</strong>. (Type in the box above and hit Enter or click Append to create new tags dynamically).
                </p>
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
                  
                  {stagedQuestions.length > 30 && (
                    <div className="text-[10px] text-slate-500 dark:text-slate-450 font-sans italic bg-slate-100/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-200/20 mb-2">
                       🚀 Large bank detected! Displaying first <strong>30 of {stagedQuestions.length} questions</strong>. All {stagedQuestions.length} are stored in staging memory and will be imported safely.
                    </div>
                  )}

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 border border-slate-100 dark:border-slate-800 p-2 rounded-2xl bg-slate-50 dark:bg-slate-900/50">
                    {stagedQuestions.slice(0, 30).map((q, qIndex) => (
                      <div key={qIndex} className="p-3 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl relative group animate-fade-in">
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

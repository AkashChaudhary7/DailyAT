/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  addDoc,
  collection,
  onSnapshot,
  query
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { parseUniversalHTML } from '../lib/htmlParser';
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-sm relative group transition-all hover:shadow-md">
      {isEditing ? (
        <div className="space-y-2 animate-fade-in">
          <input 
            type="text" 
            value={tempName} 
            onChange={(e) => setTempName(e.target.value)}
            className="w-full text-[11px] font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
            placeholder="Exam Name"
            autoFocus
          />
          <input 
            type="date" 
            value={tempDate} 
            onChange={(e) => setTempDate(e.target.value)}
            className="w-full text-[11px] font-bold p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
          />
          <div className="flex space-x-1.5">
            <button onClick={handleSave} className="flex-1 bg-indigo-600 text-white text-[10px] font-black py-2 rounded-lg uppercase transition-colors">Save</button>
            <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black py-2 rounded-lg uppercase transition-colors">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          <div className="flex justify-between items-start">
             <div className="flex items-center space-x-1.5">
               <Calendar className="h-3 w-3 text-indigo-500/70" />
               <div className="text-[10px] font-black text-slate-400 dark:text-slate-450 uppercase tracking-widest truncate max-w-[80px]">{counter.name || "Exam"}</div>
             </div>
             <button onClick={() => setIsEditing(true)} className="opacity-100 lg:opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-400 hover:text-indigo-500">
                <Edit3 className="h-3 w-3" />
             </button>
          </div>
          <div className="flex items-baseline space-x-1.5 mt-1">
             <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-display tabular-nums">{daysRemaining}</div>
            <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">Days</div>
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
    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-white shadow-xl shadow-indigo-200 dark:shadow-none border border-white/15 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
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
              <div className="text-base sm:text-lg font-black font-display leading-none">{goal.streak} DAYS</div>
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
                    className="w-16 bg-white/10 border border-white/20 rounded px-2 py-1 text-xs font-bold text-white outline-none"
                    autoFocus
                   />
                   <button onClick={() => { onUpdateTarget(tempTarget); setIsEditing(false); }} className="p-1 bg-emerald-500 rounded text-white"><Check className="h-3 w-3" /></button>
                 </div>
               ) : (
                 <>
                   <div className="text-base sm:text-lg font-black font-display leading-none">{goal.progressToday} / {goal.currentTarget}</div>
                   {goal.streak === 0 && goal.progressToday === 0 && (
                     <button onClick={() => setIsEditing(true)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                        <Edit3 className="h-3.5 w-3.5 opacity-75" />
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
          <p className="text-[10px] font-medium opacity-75 italic">
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

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [stagedQuestions, setStagedQuestions] = useState<Question[]>([]);
  const [examCounters, setExamCounters] = useState<ExamCounter[]>([
    { id: 'exam-1', name: 'NEET 2026', targetDate: '2026-05-04' },
    { id: 'exam-2', name: 'JEE Main', targetDate: '2026-04-15' },
  ]);
  
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

  useEffect(() => {
    const storedTheme = localStorage.getItem('THEME_MODE');
    if (storedTheme === 'dark') {
      setIsDarkMode(true);
    }

    const storedTags = localStorage.getItem('MOCK_SUBJECT_TAGS');
    if (storedTags) {
      try {
        setSubjectTagsList(JSON.parse(storedTags));
      } catch (e) { console.error(e); }
    }

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
      const firestoreQuestions = snapshot.docs.map(doc => ({
        ...doc.data(),
        firestoreId: doc.id,
        id: doc.data().id || doc.id
      })) as Question[];
      
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

  const handleCreateManualQuestion = (e: React.FormEvent) => {
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
      explanation: newExplanation.trim() || undefined
    };

    saveQuestionsToDB([...questions, created]);
    setIsFormOpen(false);
    setNewQText("");
    setNewOptions(["", "", "", ""]);
    setNewCorrectIndex(0);
    setNewExplanation("");
    
    alert("New custom question successfully committed!");
  };

  const handleDeleteFromBank = (id: string) => {
    if (window.confirm("Are you sure you want to remove this question?")) {
      const next = questions.filter(q => q.id !== id);
      saveQuestionsToDB(next);
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
      <header className="border-b border-indigo-100/50 dark:border-slate-800/80 bg-white dark:bg-slate-900 sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl font-display">
              M
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-indigo-900 dark:text-indigo-400 font-display">AT <span className="text-indigo-500 font-black">MOCK</span></h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest leading-none mt-0.5 tracking-tighter">AT MOCK</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="hidden md:flex items-center space-x-1.5 border border-slate-100 dark:border-slate-800 rounded-full px-3 py-1 bg-slate-50 dark:bg-slate-850 text-xs font-medium">
              <Wifi className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
              <span className="text-slate-500 dark:text-slate-450 text-[10px] font-bold uppercase tracking-wider">Cloud Sync Connected</span>
            </div>

            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all touch-manipulation"
              title="Toggle Light/Dark Theme"
            >
              {isDarkMode ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-indigo-600" />}
            </button>

            <button 
              onClick={() => setIsAdminModalOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer touch-manipulation"
              title="Admin Section"
            >
              {isAdminAuthenticated ? <ShieldCheck className="h-4.5 w-4.5 text-indigo-500" /> : <Lock className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          
          {/* Left Navigation Rails Panel */}
          <nav className="lg:col-span-3 space-y-2 relative">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-widest uppercase px-3 mb-2 font-display hidden lg:block">Workspace Controls</h3>
            
            <div className="lg:hidden">
              <button
                onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                className="w-full flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-xs font-black uppercase text-slate-600 dark:text-slate-300 transition-colors"
              >
                <span className="tracking-wide">Workspace Menu</span>
                <ChevronDown className={`w-4 h-4 transition-transform text-slate-400 duration-250 ${isWorkspaceMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div className={`${isWorkspaceMenuOpen ? 'block' : 'hidden'} lg:block absolute lg:static top-full left-0 w-full z-40 bg-white dark:bg-slate-900 border lg:border-0 border-slate-200 dark:border-slate-800 mt-1 lg:mt-0 p-2 lg:p-0 rounded-xl shadow-xl lg:shadow-none`}>
              <div className="space-y-1.5">
                <button
                  onClick={() => { setActiveTab('mock-config'); setReviewedAttempt(null); setIsWorkspaceMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 text-xs font-black uppercase p-3.5 rounded-xl border transition-all ${
                    activeTab === 'mock-config' && !reviewedAttempt
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <Settings className="w-4.5 h-4.5 shrink-0" />
                  <span>Create Mock Challenge</span>
                </button>

                <button
                  onClick={() => { setActiveTab('analytics'); setReviewedAttempt(null); setIsWorkspaceMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 text-xs font-black uppercase p-3.5 rounded-xl border transition-all ${
                    activeTab === 'analytics' && !reviewedAttempt
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <TrendingUp className="w-4.5 h-4.5 shrink-0" />
                  <span>Progress Analytics</span>
                </button>

                <button
                  onClick={() => { setActiveTab('review-bank'); setReviewedAttempt(null); setIsWorkspaceMenuOpen(false); }}
                  className={`w-full flex items-center space-x-3 text-xs font-black uppercase p-3.5 rounded-xl border transition-all ${
                    activeTab === 'review-bank' && !reviewedAttempt
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                  <div className="flex-1 flex items-center justify-between text-left">
                    <span>Review Bank</span>
                    <span className="bg-rose-100 dark:bg-rose-900/60 text-[10px] text-rose-600 dark:text-rose-400 font-bold font-mono px-2 py-0.5 rounded-md shrink-0">
                      {deviceReviewQuestions.length}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </nav>

          {/* Right workspace core content console */}
          <main className="lg:col-span-9 space-y-4 sm:space-y-6">
            
            {/* Direct Test Review view */}
            {reviewedAttempt && activeTab === 'review' ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-6 transition-all duration-150">
                <div className="flex items-center space-x-2.5 mb-5 text-slate-500">
                  <button 
                    onClick={() => { setReviewedAttempt(null); setActiveTab('analytics'); }}
                    className="p-1.5 px-3 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center space-x-1 cursor-pointer touch-manipulation"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </button>
                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-800"></div>
                  <span className="text-xs font-mono dark:text-slate-400">Review Diagnostic Sheet</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-850/50 rounded-xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800/80 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left w-full sm:w-auto">
                    <span className="text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">{reviewedAttempt.subject}</span>
                    <h3 className="text-base font-extrabold mt-2.5 text-slate-900 dark:text-slate-100">Test Assessment Complete</h3>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{new Date(reviewedAttempt.date).toLocaleString()}</p>
                  </div>
                  
                  <div className="text-center shrink-0">
                     <div className={`h-16 w-16 sm:h-20 sm:w-20 rounded-full flex flex-col items-center justify-center font-bold text-base sm:text-lg border-4 ${
                      reviewedAttempt.scorePercentage >= 80 ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5' : 
                      reviewedAttempt.scorePercentage >= 50 ? 'border-amber-500 text-amber-500 bg-amber-500/5' : 
                      'border-red-500 text-red-500 bg-red-500/5'
                    }`}>
                      <span>{reviewedAttempt.scorePercentage}%</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold -mt-0.5">SCORE</span>
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-6">
                  <div className="p-3 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/30 rounded-xl">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase tracking-wide">Correct</span>
                    <span className="text-sm font-extrabold text-emerald-500">{reviewedAttempt.correctCount}</span>
                  </div>
                  <div className="p-3 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/30 rounded-xl">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase tracking-wide">Incorrect</span>
                    <span className="text-sm font-extrabold text-red-500">{reviewedAttempt.incorrectCount}</span>
                  </div>
                  <div className="p-3 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/30 rounded-xl">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase tracking-wide">Skipped</span>
                    <span className="text-sm font-extrabold text-slate-400 dark:text-slate-450">{reviewedAttempt.unattemptedCount}</span>
                  </div>
                  <div className="p-3 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/30 rounded-xl">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-bold uppercase tracking-wide">Duration</span>
                    <span className="text-sm font-extrabold text-indigo-500 dark:text-indigo-400">{Math.floor(reviewedAttempt.timeTaken / 60)}m {reviewedAttempt.timeTaken % 60}s</span>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-2 mb-4 tracking-wider uppercase">Diagnostic Log</h4>
                
                <div className="space-y-4 sm:space-y-6">
                  {reviewedAttempt.answers.map((ans, idx) => {
                    const qProfile = questions.find(item => item.id === ans.questionId);
                    if (!qProfile) return null;

                    const letters = ['A', 'B', 'C', 'D'];

                    return (
                      <div 
                        key={idx}
                        className={`p-3.5 sm:p-5 rounded-xl border transition-colors ${
                          ans.selectedIndex === null ? 'border-slate-200 dark:border-slate-800 bg-amber-500/[0.02] dark:bg-amber-500/[0.01]' : 
                          ans.isCorrect ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01]' : 
                          'border-red-200 dark:border-red-900/40 bg-red-500/[0.02] dark:bg-red-500/[0.01]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3 text-xs">
                          <span className="font-bold text-rose-400 text-[10px]">QUESTION #{idx + 1}</span>
                          <span className={`font-semibold rounded-full px-2.5 py-0.5 text-[9px] uppercase tracking-wide ${
                            ans.selectedIndex === null ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400' : 
                            ans.isCorrect ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 
                            'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                          }`}>
                            {ans.selectedIndex === null ? 'Skipped' : ans.isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>

                        <div className="mb-4">
                          <FormattedText text={qProfile.questionText} className="text-sm font-semibold leading-relaxed text-slate-900 dark:text-slate-100" />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                          {qProfile.options.map((opt, optIdx) => {
                            const isCorrect = qProfile.correctAnswerIndex === optIdx;
                            const isUserSelected = ans.selectedIndex === optIdx;
                            
                            let optClass = 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300';
                            if (isCorrect) {
                              optClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold';
                            } else if (isUserSelected) {
                              optClass = 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 font-bold';
                            }

                            return (
                              <div key={optIdx} className={`text-xs p-3 rounded-xl border flex items-center space-x-2.5 ${optClass}`}>
                                <span className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 border ${
                                  isCorrect ? 'bg-emerald-600 text-white border-emerald-600' :
                                  isUserSelected ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
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
                          <div className="p-3 bg-slate-100/80 dark:bg-slate-850 rounded-xl text-xs leading-relaxed border border-slate-200/60 dark:border-slate-750">
                            <span className="font-bold text-rose-500 dark:text-rose-400 block mb-1 uppercase tracking-wider text-[9px]">Explanation:</span>
                            <p className="font-medium text-slate-600 dark:text-slate-300">{qProfile.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {activeTab === 'mock-config' && !reviewedAttempt ? (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-[0.2em] uppercase mb-2 ml-1 font-display">Countdowns</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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

                <div className="grid grid-cols-3 gap-2 sm:gap-3 animate-fade-in">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3 sm:p-4 rounded-xl text-center sm:text-left">
                    <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 leading-none truncate">Questions</div>
                    <div className="text-base sm:text-xl font-black text-indigo-600 dark:text-indigo-400 font-display leading-none">{questions.length}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3 sm:p-4 rounded-xl text-center sm:text-left">
                    <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 leading-none truncate">Trials</div>
                    <div className="text-base sm:text-xl font-black text-rose-500 font-display leading-none">{attempts.length}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3 sm:p-4 rounded-xl text-center sm:text-left">
                    <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 leading-none truncate">Accuracy</div>
                    <div className="text-base sm:text-xl font-black text-emerald-500 font-display leading-none">{avgAccuracy}%</div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-8 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between transition-colors">
                  <div className="flex justify-between items-start mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-lg font-black tracking-tight font-display text-slate-900 dark:text-slate-100">Launch Simulation</h3>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">Configure mock parameters</p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-950/40 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900/60 shrink-0">
                      <Settings className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                     <label className="block text-[10px] font-black text-slate-900 dark:text-slate-900 uppercase tracking-widest mb-2 ml-1"> Practice Subject</label>
                      <div className="relative">
                        <select 
                          value={quizSubject}
                          onChange={(e) => setQuizSubject(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-650 border border-slate-200 dark:border-slate-750 px-4 py-3.5 rounded-xl text-xs font-bold appearance-none outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                        >
                          <option className="dark:bg-slate-900 text-black-900 dark:text-slate-100">All Subjects</option>
                          {availableSubjects.map(sub => (
                            <option key={sub} value={sub} className="dark:bg-slate-900 text-slate-700 dark:text-slate-100">{sub}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[10px] font-black text-slate-700 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Questions</label>
                        <input 
                          type="number"
                          value={quizCount}
                          onChange={(e) => setQuizCount(Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 px-4 py-3 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-black-900 dark:text-black-100"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Minutes</label>
                        <input 
                          type="number"
                          value={timerMinutes}
                          max={180}
                          onChange={(e) => setTimerMinutes(Math.min(180, Math.max(1, parseInt(e.target.value) || 0)))}
                          className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 px-4 py-3 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-black-900 dark:text-black-100"
                          disabled={!hasTimer}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={handlePrepareQuiz}
                      disabled={questions.length === 0}
                      className={`flex-grow py-3.5 rounded-xl font-black text-xs sm:text-sm active:scale-[0.98] transition-all flex items-center justify-center space-x-2 font-display uppercase tracking-widest cursor-pointer touch-manipulation h-11 ${
                        questions.length === 0
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                      <span>START FULL MOCK</span>
                    </button>
                    <button 
                      onClick={() => {
                        setHasTimer(false);
                        handlePrepareQuiz();
                      }}
                      className="px-6 py-3.5 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 cursor-pointer rounded-xl font-bold transition-colors text-xs sm:text-sm h-11 touch-manipulation"
                    >
                      Untimed Practice
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'review-bank' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                  <div>
                    <h2 className="text-xl font-black tracking-tight font-display text-slate-900 dark:text-indigo-400">Review Bank</h2>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">Isolated device specific weak triggers.</p>
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
                    className="flex items-center justify-center space-x-2 bg-rose-600 text-white font-black text-xs py-3 px-5 rounded-xl shadow-sm hover:bg-rose-700 transition active:scale-[0.98] h-11 touch-manipulation"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>START REVIEW MOCK (MAX 20)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  {deviceReviewQuestions.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 p-8 sm:p-12 text-center rounded-2xl">
                      <Sparkles className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                      <h3 className="text-sm font-black text-slate-400 dark:text-slate-500">Review bank configuration empty</h3>
                    </div>
                  ) : (
                    deviceReviewQuestions.map(q => (
                      <div key={q.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 rounded-2xl group relative overflow-hidden transition-all shadow-sm">
                        <div className="absolute top-0 right-0 p-3 flex space-x-2">
                           {localReviewBank[q.id]?.needsReview && (
                            <span className="bg-rose-500/10 text-rose-500 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border border-rose-500/20">Review Tag</span>
                           )}
                           <button 
                             onClick={() => toggleBookmark(q.id)}
                             className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                               localReviewBank[q.id]?.isBookmarked ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-slate-50 dark:bg-slate-850 text-slate-400 border border-slate-200 dark:border-slate-750'
                             }`}
                           >
                            <Check className={`h-3.5 w-3.5 ${localReviewBank[q.id]?.isBookmarked ? 'opacity-100' : 'opacity-30'}`} />
                           </button>
                        </div>
                        
                        <div className="pr-10 mt-4 sm:mt-0">
                          <div className="flex items-center space-x-2 mb-2.5">
                            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black px-2 py-0.5 rounded uppercase tracking-tight">{q.subject}</span>
                          </div>
                          <div className="mb-4">
                            <FormattedText text={q.questionText} className="text-sm font-bold leading-relaxed text-slate-900 dark:text-slate-100" />
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, idx) => (
                              <div key={idx} className={`p-2.5 rounded-xl text-xs border flex items-start space-x-2 ${
                                idx === q.correctAnswerIndex ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold' : 'bg-slate-50 dark:bg-slate-850/40 border-slate-100 dark:border-slate-800/80 text-slate-500 dark:text-slate-400'
                              }`}>
                                <span className="opacity-50 shrink-0">{String.fromCharCode(65 + idx)}.</span>
                                <FormattedText text={opt} className="inline-block" />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Analytics Tab view */}
            {activeTab === 'analytics' && !reviewedAttempt ? (
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl shadow-sm text-center">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-bold tracking-wider uppercase">Total Trials</span>
                    <span className="text-base font-extrabold mt-0.5 block text-slate-900 dark:text-slate-100">{totalTests}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl shadow-sm text-center">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-bold tracking-wider uppercase">Avg Accuracy</span>
                    <span className="text-base font-extrabold text-emerald-500 mt-0.5 block">{avgAccuracy}%</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl shadow-sm text-center">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-bold tracking-wider uppercase">Solved MCQs</span>
                    <span className="text-base font-extrabold text-rose-500 mt-0.5 block">{correctAccumulated}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-3.5 rounded-xl shadow-sm text-center">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-bold tracking-wider uppercase">Avg Speed</span>
                    <span className="text-base font-extrabold mt-0.5 block text-slate-900 dark:text-slate-100">{avgSpeedSec}s</span>
                  </div>
                </div>

                {attempts.length === 0 ? (
                  <div className="text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <Activity className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500">No chart data gathered yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl text-xs shadow-sm">
                      <h4 className="text-[11px] font-bold text-slate-450 dark:text-slate-400 tracking-wider uppercase mb-3">Score Trend</h4>
                      <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={getScoreChartData()} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis dataKey="name" stroke={isDarkMode ? '#64748b' : '#94a3b8'} />
                            <YAxis domain={[0, 100]} stroke={isDarkMode ? '#64748b' : '#94a3b8'} />
                            <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0', borderRadius: '8px' }} />
                            <Line type="monotone" dataKey="score" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl text-xs shadow-sm">
                      <h4 className="text-[11px] font-bold text-slate-450 dark:text-slate-400 tracking-wider uppercase mb-3">Accuracy Breakdown</h4>
                      <div className="h-52 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getSubjectAccuracyChartData()} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} />
                            <XAxis dataKey="subject" stroke={isDarkMode ? '#64748b' : '#94a3b8'} />
                            <YAxis domain={[0, 100]} stroke={isDarkMode ? '#64748b' : '#94a3b8'} />
                            <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: isDarkMode ? '#1e293b' : '#e2e8f0', borderRadius: '8px' }} />
                            <Bar dataKey="accuracy" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-5 shadow-sm overflow-hidden transition-colors">
                  <h4 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 mb-3 tracking-wider uppercase">Exam Logs</h4>
                  {attempts.length === 0 ? (
                    <div className="text-xs p-5 text-center text-slate-400 dark:text-slate-500">No journals compiled.</div>
                  ) : (
                    <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
                      <table className="w-full text-left text-xs min-w-[500px]">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                            <th className="py-2.5 px-2">Subject</th>
                            <th className="py-2.5 px-2">Date</th>
                            <th className="py-2.5 px-2 text-center">Score</th>
                            <th className="py-2.5 px-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-850/60 font-medium text-slate-700 dark:text-slate-300">
                          {attempts.map((att) => (
                            <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/10">
                              <td className="py-3 px-2 font-bold">{att.subject}</td>
                              <td className="py-3 px-2 text-slate-450 text-[11px]">{new Date(att.date).toLocaleDateString()}</td>
                              <td className="py-3 px-2 text-center">
                                <span className={`px-2 py-0.5 rounded-full font-bold font-mono text-[11px] ${
                                  att.scorePercentage >= 80 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                                }`}>
                                  {att.scorePercentage}%
                                </span>
                              </td>
                              <td className="py-3 px-2 text-right">
                                <button
                                  onClick={() => { setReviewedAttempt(att); setActiveTab('review'); }}
                                  className="text-rose-500 dark:text-rose-400 font-bold hover:underline inline-flex items-center space-x-0.5 cursor-pointer text-xs touch-manipulation"
                                >
                                  <span>Review</span>
                                  <ChevronRight className="h-3 w-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}        
          </main>
        </div>
      </div>

      {/* Footer bar */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 mt-16 py-4 text-center text-[10px] text-slate-400 dark:text-slate-500 transition-colors select-none">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono">
          <span>&copy; Made by Akash Chaudhary for his Beautiful Wife ,Trishna</span>
          <span className="flex items-center space-x-1 border border-slate-200 dark:border-slate-800 rounded px-2 bg-slate-50 dark:bg-slate-950 text-[9px] font-bold">
            <Check className="h-3 w-3 text-emerald-500" />
            <span>Cloud Synchronized Practice Ready</span>
          </span>
        </div>
      </footer>

      {/* GLOBAL MODALS */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3.5 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAdminModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 sm:p-6">
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white font-display">Admin Section</h3>
                </div>
                <button onClick={() => setIsAdminModalOpen(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!isAdminAuthenticated ? (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pin Code Required</label>
                    <input 
                      type="password"
                      value={adminPasswordInput}
                      onChange={(e) => { setAdminPasswordInput(e.target.value); setAdminError(false); }}
                      className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-slate-100"
                      placeholder="••••••"
                      autoFocus
                    />
                    {adminError && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-1 uppercase">Invalid Admin Pin</p>}
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
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3.5 rounded-xl transition-all h-11"
                  >
                    LOGIN TO ADMIN
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                   <form onSubmit={handleAddNewSubjectTag} className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-750 mb-1">
                     <label className="block text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1.5">Add Subject Dropdown Tag</label>
                     <div className="flex space-x-1.5">
                       <input 
                         type="text" 
                         value={newCustomTagInput} 
                         onChange={(e) => setNewCustomTagInput(e.target.value)}
                         placeholder="e.g. History Level 1" 
                         className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold px-3 py-2 rounded-lg outline-none text-slate-900 dark:text-slate-100"
                       />
                       <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 rounded-lg transition-all shrink-0">
                         <Plus className="w-4 h-4" />
                       </button>
                     </div>
                   </form>

                   <button
                    onClick={() => { setIsUploadModalOpen(true); setIsAdminModalOpen(false); }}
                    className="flex items-center space-x-3.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-left cursor-pointer transition-colors"
                  >
                    <FileCode className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <div className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">Bulk HTML Extractor</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { handleResetDatabase(); setIsAdminModalOpen(false); }}
                    className="flex items-center space-x-3.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 text-left text-rose-600 dark:text-rose-400 cursor-pointer transition-colors"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                    <div>
                      <div className="text-xs font-black uppercase">Wipe App Progress</div>
                    </div>
                  </button>
                </div>
               )}
            </div>
          </div>
        </div>
      )}

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-slate-900/60 backdrop-blur-sm" onClick={() => !uploadProgress && setIsUploadModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
            {!uploadProgress && (
              <button 
                onClick={() => setIsUploadModalOpen(false)} 
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="space-y-4 mt-2">
              <h3 className="text-base font-black flex items-center space-x-2 text-slate-900 dark:text-white font-display uppercase tracking-wide">
                <FileCode className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span>Bulk Extractor Engine</span>
              </h3>

              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => !uploadProgress && fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 bg-slate-50/40 dark:bg-slate-950/40 rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-colors"
              >
                <input type="file" accept=".html, .htm" ref={fileInputRef} onChange={handleFileUpload} multiple className="hidden" />
                {uploadProgress ? (
                  <div className="flex flex-col items-center justify-center space-y-3 py-1">
                    <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Processing {uploadProgress.current}...</div>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <span className="text-xs font-black block text-slate-700 dark:text-slate-300 font-display uppercase">Upload HTML files</span>
                  </>
                )}
              </div>

              <div className="pt-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 block mb-1.5 uppercase font-display">Target Dropdown Tag (Fixed Configuration)</label>
                <div className="relative">
                  <select
                    value={stagingSubject}
                    onChange={(e) => handleUpdateStagingSubject(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-xs font-bold appearance-none outline-none text-slate-900 dark:text-slate-100"
                  >
                    {subjectTagsList.map((tag) => (
                      <option key={tag} value={tag} className="dark:bg-slate-900 text-slate-900 dark:text-slate-100">{tag}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {stagedQuestions.length > 0 && (
                <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase">Queue ({stagedQuestions.length})</h4>
                    {!isSaving && !importSuccess && (
                      <button
                        onClick={saveStagedToBank}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center space-x-1 shadow-sm transition-transform active:scale-[0.98] h-9"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Confirm Bank Import</span>
                      </button>
                    )}
                  </div>

                  {isSaving && (
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-indigo-600 h-full" style={{ width: `${savingProgress}%` }} />
                    </div>
                  )}

                  {importSuccess && (
                    <p className="text-xs font-bold text-emerald-500">{importSuccess}</p>
                  )}

                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {stagedQuestions.map((q, qIndex) => (
                      <div key={qIndex} className="p-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg relative">
                        <FormattedText text={q.questionText} className="text-[11px] font-bold text-slate-800 dark:text-slate-200 line-clamp-1" />
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

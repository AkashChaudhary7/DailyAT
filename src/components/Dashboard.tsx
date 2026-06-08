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
import { SAMPLE_QUESTIONS, SAMPLE_ATTEMPTS } from '../utils/sampleData';
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
            className="w-full text-[10px] font-bold p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 outline-none"
            placeholder="Exam Name"
            autoFocus
          />
          <input 
            type="date" 
            value={tempDate} 
            onChange={(e) => setTempDate(e.target.value)}
            className="w-full text-[10px] font-bold p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 outline-none"
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
                    className="w-16 bg-white/10 border border-white/20 rounded px-1.5 py-0.5 text-xs font-bold outline-none"
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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [userName, setUserName] = useState<string>("Competitor #1");
  const [activeTab, setActiveTab] = useState<string>('mock-config');

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [stagedQuestions, setStagedQuestions] = useState<Question[]>([]);
  const [examCounters, setExamCounters] = useState<ExamCounter[]>([
    { id: 'exam-1', name: 'NEET 2026', targetDate: '2026-05-04' },
    { id: 'exam-2', name: 'JEE Main', targetDate: '2026-04-15' },
    { id: 'exam-3', name: 'Board Exams', targetDate: '2026-02-15' }
  ]);
  const [stagingSubject, setStagingSubject] = useState<string>("HTML Upload");
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

  // Real-time Firebase Sync logic replaces standard getDocs
  useEffect(() => {
    const storedTheme = localStorage.getItem('THEME_MODE');
    if (storedTheme === 'dark') {
      setIsDarkMode(true);
    }

    console.log("Listening to Firestore real-time updates...");
    const q = query(collection(db, "questions"));
    
    // Real-time listener across all active windows and platforms
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreQuestions = snapshot.docs.map(doc => ({
        ...doc.data(),
        firestoreId: doc.id
      })) as Question[];
      
      console.log(`Real-time sync context active. Total active bank size: ${firestoreQuestions.length}`);
      setQuestions(firestoreQuestions);
      localStorage.setItem("MOCK_QUESTIONS", JSON.stringify(firestoreQuestions));
    }, (error) => {
      console.error("Firestore real-time sync failure:", error);
      const storedQuestions = localStorage.getItem("MOCK_QUESTIONS");
      if (storedQuestions) {
        setQuestions(JSON.parse(storedQuestions));
      }
    });

    const storedName = localStorage.getItem('USER_PROFILE_NAME');
    if (storedName) {
      setUserName(storedName);
    }

    const storedAttempts = localStorage.getItem('MOCK_ATTEMPTS');
    if (storedAttempts) {
      try {
        setAttempts(JSON.parse(storedAttempts));
      } catch (e) {
        setAttempts(SAMPLE_ATTEMPTS);
      }
    } else {
      setAttempts(SAMPLE_ATTEMPTS);
      localStorage.setItem('MOCK_ATTEMPTS', JSON.stringify(SAMPLE_ATTEMPTS));
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
    if (window.confirm("Are you sure you want to reset all mock databases back to defaults?")) {
      setQuestions(SAMPLE_QUESTIONS);
      setAttempts(SAMPLE_ATTEMPTS);
      localStorage.setItem('MOCK_QUESTIONS', JSON.stringify(SAMPLE_QUESTIONS));
      localStorage.setItem('MOCK_ATTEMPTS', JSON.stringify(SAMPLE_ATTEMPTS));
      setReviewedAttempt(null);
      setActiveTab('mock-config');
      alert("Database reset successfully!");
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

  const updateStagedCorrectIndex = (index: number, val: number) => {
    const next = [...stagedQuestions];
    next[index].correctAnswerIndex = val;
    setStagedQuestions(next);
  };

  const updateStagedQText = (index: number, val: string) => {
    const next = [...stagedQuestions];
    next[index].questionText = val;
    setStagedQuestions(next);
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
      const code = error.code || 'unknown';
      const message = error.message || 'No message';
      alert(`Firebase Error (${code}): ${message}. Please check your permissions.`);
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

    // Active flags update for review routing
    setReviewedAttempt(attempt);
    setActiveTab('review');

    updateProgress(
      attempt.answers.filter(a => a.selectedIndex !== null).length
    );

    const wrongIds = attempt.answers.filter(a => !a.isCorrect && a.selectedIndex !== null).map(a => a.questionId);
    if (wrongIds.length > 0) {
      const nextQuestions = questions.map(q => {
        if (wrongIds.includes(q.id)) {
          return { ...q, needsReview: true };
        }
        return q;
      });
      saveQuestionsToDB(nextQuestions);
    }
    
    setActiveQuizQuestions(null);
    setActiveQuizSettings(null);
  };

  const toggleBookmark = (id: string) => {
    const next = questions.map(q => q.id === id ? { ...q, isBookmarked: !q.isBookmarked } : q);
    saveQuestionsToDB(next);
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
            <div className="hidden sm:flex items-center space-x-1.5 border border-slate-100 dark:border-slate-800 rounded-full px-3 py-1 bg-slate-50 dark:bg-slate-850 text-xs font-medium">
              <Wifi className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
              <span className="text-slate-500 dark:text-slate-450 text-[10px] font-bold uppercase tracking-wider">Cloud Sync Connected</span>
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
                      {questions.filter(q => q.isBookmarked || q.needsReview).length}
                    </span>
                  </div>
                </button>
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
                  <div className="p-

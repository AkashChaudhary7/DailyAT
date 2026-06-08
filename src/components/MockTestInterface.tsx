/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Question, QuizSettings, TestAttempt, AttemptAnswer } from '../types';
import { Timer, AlertTriangle, ChevronRight, ChevronLeft, Flag, CheckCircle, ArrowLeft, Trash2, BookOpen } from 'lucide-react';
import FormattedText from './FormattedText';

interface MockTestInterfaceProps {
  questions: Question[];
  settings: QuizSettings;
  onFinish: (attempt: TestAttempt) => void;
  onCancel: () => void;
  isDarkMode: boolean;
}

export default function MockTestInterface({
  questions,
  settings,
  onFinish,
  onCancel,
  isDarkMode
}: MockTestInterfaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(
    new Array(questions.length).fill(null)
  );
  
  // Track visited questions: 0 = not visited, 1 = visited but not answered, 2 = answered
  const [questionStates, setQuestionStates] = useState<('unvisited' | 'unanswered-visited' | 'answered' | 'flagged')[]>(
    new Array(questions.length).fill('unvisited').map((_, i) => i === 0 ? 'unanswered-visited' : 'unvisited')
  );

  const [timeLeft, setTimeLeft] = useState<number>(settings.durationMinutes * 60);
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);
  const [isConfirmExitOpen, setIsConfirmExitOpen] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);

  // Sound effects or slight visual triggers for transition
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Setup timer
  useEffect(() => {
    if (settings.hasTimer) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [settings.hasTimer]);

  const handleAutoSubmit = () => {
    submitQuiz();
  };

  // Convert seconds to MM:SS
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Mark current as visited when index changes
  const navigateTo = (index: number) => {
    if (index < 0 || index >= questions.length) return;
    
    setQuestionStates(prev => {
      const next = [...prev];
      // If of current, if answered let it be answered, else check if it was flagged, otherwise marked visited
      if (next[currentIndex] !== 'answered' && next[currentIndex] !== 'flagged') {
        next[currentIndex] = 'unanswered-visited';
      }
      
      // Target index is now visited
      if (next[index] === 'unvisited') {
        next[index] = 'unanswered-visited';
      }
      return next;
    });
    
    setCurrentIndex(index);
  };

  const selectOption = (optIndex: number) => {
    const nextAnswers = [...selectedAnswers];
    nextAnswers[currentIndex] = optIndex;
    setSelectedAnswers(nextAnswers);

    // Update state to answered
    setQuestionStates(prev => {
      const next = [...prev];
      if (next[currentIndex] !== 'flagged') {
        next[currentIndex] = 'answered';
      }
      return next;
    });

    // Auto-advance logic (user requested "question select krte hi aage badhe vo")
    if (autoAdvance && currentIndex < questions.length - 1) {
      setTimeout(() => {
        navigateTo(currentIndex + 1);
      }, 350); // Small professional delay for visual transition feedback
    }
  };

  const clearSelection = () => {
    const nextAnswers = [...selectedAnswers];
    nextAnswers[currentIndex] = null;
    setSelectedAnswers(nextAnswers);

    setQuestionStates(prev => {
      const next = [...prev];
      next[currentIndex] = next[currentIndex] === 'flagged' ? 'flagged' : 'unanswered-visited';
      return next;
    });
  };

  const toggleFlag = () => {
    setQuestionStates(prev => {
      const next = [...prev];
      if (next[currentIndex] === 'flagged') {
        // Unflag: restore to answered or unans
        next[currentIndex] = selectedAnswers[currentIndex] !== null ? 'answered' : 'unanswered-visited';
      } else {
        next[currentIndex] = 'flagged';
      }
      return next;
    });
  };

  const submitQuiz = () => {
    // Collect answers
    const answers: AttemptAnswer[] = questions.map((q, idx) => {
      const selIndex = selectedAnswers[idx];
      const isCorrect = selIndex !== null && selIndex === q.correctAnswerIndex;
      return {
        questionId: q.id,
        selectedIndex: selIndex,
        isCorrect
      };
    });

    const correctCount = answers.filter(a => a.selectedIndex !== null && a.isCorrect).length;
    const incorrectCount = answers.filter(a => a.selectedIndex !== null && !a.isCorrect).length;
    const unattemptedCount = answers.filter(a => a.selectedIndex === null).length;
    
    const timeTaken = settings.hasTimer 
      ? (settings.durationMinutes * 60 - timeLeft) 
      : 30; // standard arbitrary speed tracker for free timer

    const attempt: TestAttempt = {
      id: `attempt-${Date.now()}`,
      date: new Date().toISOString(),
      timestamp: Date.now(),
      subject: settings.subject,
      totalQuestions: questions.length,
      correctCount,
      incorrectCount,
      unattemptedCount,
      timeTaken,
      totalTimeAllocated: settings.hasTimer ? settings.durationMinutes * 60 : 0,
      scorePercentage: Math.round((correctCount / questions.length) * 100),
      answers
    };

    onFinish(attempt);
  };

  // State Counts for Sidebar Palette
  const answeredCount = questionStates.filter(s => s === 'answered').length;
  const unvisitedCount = questionStates.filter(s => s === 'unvisited').length;
  const unansweredVisitedCount = questionStates.filter(s => s === 'unanswered-visited').length;
  const flaggedCount = questionStates.filter(s => s === 'flagged').length;

  const currentQuestion = questions[currentIndex];
  // Calculate current completion percentage
  const attemptedNum = selectedAnswers.filter(ans => ans !== null).length;
  const percentComplete = Math.round((attemptedNum / questions.length) * 100);

  return (
    <div id="testbook-mock-fullscreen" className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-850 dark:text-slate-100 font-sans transition-colors duration-150">
      {/* Header Bar */}
      <header className="flex h-16 items-center justify-between border-b border-indigo-100/40 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 shadow-sm md:px-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsConfirmExitOpen(true)}
            className="flex h-10 items-center space-x-2 rounded-xl border border-slate-200 dark:border-slate-800 px-4 text-xs font-bold bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-all uppercase tracking-wider"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">Exit to Dashboard</span>
          </button>
          
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
          
          <div>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-black tracking-widest uppercase font-display">{settings.subject} PRACTICE MOCK</span>
            <h2 className="text-xs sm:text-sm font-black truncate max-w-[170px] sm:max-w-xs font-display text-slate-700 dark:text-slate-300 uppercase tracking-wide">{settings.questionCount} Questions Challenge</h2>
          </div>
        </div>

        {/* Real-time details */}
        <div className="flex items-center space-x-3">
          {/* Progress bar info */}
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold uppercase tracking-wider">Completed {attemptedNum}/{questions.length} ({percentComplete}%)</span>
            <div className="w-28 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
              <div 
                className="h-full bg-indigo-650 dark:bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${percentComplete}%` }}
              ></div>
            </div>
          </div>

          <div className="flex items-center space-x-2 rounded-xl border border-indigo-100 dark:border-indigo-950/80 bg-indigo-50/50 dark:bg-indigo-950/20 px-3 py-1.5 font-mono text-sm font-bold select-none text-indigo-600 dark:text-indigo-400">
            <Timer className={`h-4 w-4 ${timeLeft < 60 && settings.hasTimer ? 'animate-pulse text-red-500' : 'text-indigo-500'}`} />
            <span className={timeLeft < 60 && settings.hasTimer ? 'text-red-500 font-black animate-pulse' : 'font-black'}>
              {settings.hasTimer ? formatTime(timeLeft) : 'Practice Mode'}
            </span>
          </div>

          <button
            onClick={() => setIsConfirmSubmitOpen(true)}
            className="flex h-10 items-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 text-xs font-black uppercase tracking-widest shadow hover:scale-102 active:scale-98 transition-all cursor-pointer font-display"
          >
            Submit Test
          </button>
        </div>
      </header>

      {/* Main Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question Area (Left) */}
        <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 overflow-y-auto">
          {/* Progress visual indicator (mobile) */}
          <div className="h-1 bg-slate-100 dark:bg-slate-800 w-full relative sm:hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${percentComplete}%` }}
            ></div>
          </div>

          {/* Question Box */}
          <div className="p-4 sm:p-8 flex-1 max-w-3xl mx-auto w-full">
            {/* Header / Meta */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/65">
              <span className="flex items-center space-x-2 text-xs font-black text-indigo-700 dark:text-indigo-450 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl font-display">
                <BookOpen className="h-3.5 w-3.5" />
                <span>QUESTION {currentIndex + 1} OF {questions.length}</span>
              </span>
              
              <div className="flex items-center space-x-1 border-slate-100 dark:border-slate-800 pl-4 py-0.5">
                <button
                  type="button"
                  onClick={toggleFlag}
                  className={`flex items-center space-x-2 px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    questionStates[currentIndex] === 'flagged'
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/50 text-violet-650 dark:text-violet-300'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Flag className={`h-3.5 w-3.5 ${questionStates[currentIndex] === 'flagged' ? 'fill-violet-500 text-violet-500' : ''}`} />
                  <span>Mark for Review</span>
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div className="mb-8">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black tracking-widest block mb-2 font-display uppercase">STIMULUS QUESTION CONTEXT</span>
              <FormattedText 
                text={currentQuestion?.questionText} 
                className="text-base sm:text-xl font-medium leading-relaxed dark:text-slate-100 font-sans" 
              />
            </div>

            {/* Question Options */}
            <div className="space-y-4">
              {currentQuestion?.options.map((option, idx) => {
                const optionLetters = ['A', 'B', 'C', 'D', 'E'];
                const isSelected = selectedAnswers[currentIndex] === idx;
                
                return (
                  <button
                    key={idx}
                    onClick={() => selectOption(idx)}
                    className={`w-full flex items-start text-left p-4.5 rounded-2xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/15 shadow-md shadow-indigo-100/10'
                        : 'border-slate-205 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black mr-4 border font-display transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'
                    }`}>
                      {optionLetters[idx]}
                    </div>
                    
                    <div className="text-sm sm:text-base text-slate-755 dark:text-slate-200 font-medium self-center pt-[1px] font-sans leading-snug flex-1">
                      <FormattedText text={option} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls Footer */}
          <footer className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/20 py-4 px-4 sm:px-8 flex flex-wrap items-center justify-between gap-3 mt-auto">
            <div className="flex items-center space-x-2">
              <button
                disabled={selectedAnswers[currentIndex] === null}
                onClick={clearSelection}
                className={`flex h-9 items-center space-x-1 px-3.5 text-xs font-semibold rounded-lg border transition-all ${
                  selectedAnswers[currentIndex] === null
                    ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed bg-slate-100/20 dark:bg-transparent'
                    : 'border-red-200 dark:border-red-950 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 cursor-pointer'
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Selection</span>
              </button>

              <div className="flex items-center space-x-1.5 ml-2 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-[11px] select-none text-slate-500 dark:text-slate-400">
                <input
                  type="checkbox"
                  id="auto-advance-chk"
                  checked={autoAdvance}
                  onChange={(e) => setAutoAdvance(e.target.checked)}
                  className="h-3.5 w-3.5 rounded accent-emerald-600 outline-none"
                />
                <label htmlFor="auto-advance-chk" className="cursor-pointer font-medium">Auto-Advance</label>
              </div>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => navigateTo(currentIndex - 1)}
                disabled={currentIndex === 0}
                className={`flex h-9 items-center px-4 rounded-lg text-xs font-semibold border bg-white dark:bg-slate-800 transition-all ${
                  currentIndex === 0
                    ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer'
                }`}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                <span>Prev</span>
              </button>

              <button
                onClick={() => navigateTo(currentIndex + 1)}
                disabled={currentIndex === questions.length - 1}
                className={`flex h-9 items-center px-4 rounded-lg text-xs font-semibold border bg-white dark:bg-slate-800 transition-all ${
                  currentIndex === questions.length - 1
                    ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer'
                }`}
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </footer>
        </main>

        {/* Sidebar Status (Right side, hidden on small screens unless toggled) */}
        <aside className="w-68 border-l border-indigo-100/40 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 hidden lg:flex flex-col overflow-y-auto">
          {/* Status Indicators breakdown */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800/65">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-3.5 tracking-widest uppercase font-display">QUESTION PALETTE</h4>
            
            <div className="grid grid-cols-2 gap-2.5 text-[11px] font-bold">
              <div className="flex items-center space-x-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/40">
                <span className="w-3.5 h-3.5 rounded-lg bg-indigo-600 shrink-0"></span>
                <span className="text-slate-600 dark:text-slate-350 truncate">Done ({answeredCount})</span>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/40">
                <span className="w-3.5 h-3.5 rounded-lg bg-amber-500 shrink-0"></span>
                <span className="text-slate-600 dark:text-slate-350 truncate">Skipped ({unansweredVisitedCount})</span>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/40">
                <span className="w-3.5 h-3.5 rounded-lg bg-violet-500 animate-pulse shrink-0"></span>
                <span className="text-slate-600 dark:text-slate-350 truncate">Review ({flaggedCount})</span>
              </div>
              <div className="flex items-center space-x-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-950/40">
                <span className="w-3.5 h-3.5 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0"></span>
                <span className="text-slate-600 dark:text-slate-350 truncate">Unopened ({unvisitedCount})</span>
              </div>
            </div>
          </div>

          {/* Grid Selection Map */}
          <div className="p-5 flex-1">
            <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 mb-3 tracking-widest uppercase font-display">Navigate Instantly</h4>
            
            <div className="grid grid-cols-4 gap-2.5 max-h-[350px] overflow-y-auto pr-1">
              {questions.map((_, idx) => {
                const status = questionStates[idx];
                const isCurrent = currentIndex === idx;
                
                let btnClass = "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200";
                
                if (status === 'flagged') {
                  btnClass = "bg-violet-500 text-white shadow-sm ring-2 ring-violet-500/25";
                } else if (status === 'answered') {
                  btnClass = "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-600/30";
                } else if (status === 'unanswered-visited') {
                  btnClass = "bg-amber-500 text-white shadow-sm ring-1 ring-amber-500/30";
                }

                if (isCurrent) {
                  // highlight current item
                  btnClass += " ring-3 ring-indigo-605 ring-offset-2 dark:ring-offset-slate-900 scale-105 font-bold";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => navigateTo(idx)}
                    className={`h-9 w-full rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer font-display ${btnClass}`}
                  >
                    {(idx + 1).toString().padStart(2, '0')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 text-center font-display">
            <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black">TESTBOOK POWERED PORTAL</span>
          </div>
        </aside>
      </div>

      {/* Small Screen Bottom Panel Toggle for palette */}
      <footer className="lg:hidden border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 text-center flex items-center justify-around">
        <span className="text-xs text-slate-500 dark:text-slate-400">Total: <strong>{questions.length}</strong></span>
        <span className="text-xs text-emerald-600">Answered: <strong>{answeredCount}</strong></span>
        <span className="text-xs text-red-500">Skipped: <strong>{unansweredVisitedCount}</strong></span>
        <span className="text-xs text-violet-500">Flagged: <strong>{flaggedCount}</strong></span>
        
        {/* Toggle drawer/palette representation */}
        <button 
          onClick={() => {
            // Quick toggle to show standard grid list representation in an alert or modal if needed
            // But we can also make sure mobile users can click arrows or index quickly.
            // Let's offer a sliding sheet overlay for mobile index grid.
            const gridEl = document.getElementById("mobile-grid-sheet");
            if (gridEl) {
              gridEl.classList.toggle("hidden");
            }
          }}
          className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-[10px] px-2 py-1 rounded"
        >
          View Grid Map
        </button>
      </footer>

      {/* Mobile Sliding Grid Sheet (overlay, hidden by default) */}
      <div id="mobile-grid-sheet" className="hidden fixed inset-0 z-50 bg-black/50 lg:hidden flex items-end justify-center">
        <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-t-2xl p-5 flex flex-col max-h-[70vh]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm tracking-wide">All Questions Quick Jumper</h3>
            <button
              onClick={() => document.getElementById("mobile-grid-sheet")?.classList.add("hidden")}
              className="text-xs font-semibold text-rose-500 px-2 py-1"
            >
              Close
            </button>
          </div>
          
          <div className="grid grid-cols-5 gap-2 overflow-y-auto py-2">
            {questions.map((_, idx) => {
              const status = questionStates[idx];
              const isCurrent = currentIndex === idx;
              
              let btnClass = "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300";
              if (status === 'flagged') btnClass = "bg-violet-500 text-white";
              else if (status === 'answered') btnClass = "bg-emerald-600 text-white";
              else if (status === 'unanswered-visited') btnClass = "bg-red-500 text-white";
              if (isCurrent) btnClass += " ring-2 ring-rose-500 scale-105 font-extrabold";

              return (
                <button
                  key={idx}
                  onClick={() => {
                    navigateTo(idx);
                    document.getElementById("mobile-grid-sheet")?.classList.add("hidden");
                  }}
                  className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${btnClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-center">
            <span className="text-[10px] text-slate-400">Tap number to instantly answer question</span>
          </div>
        </div>
      </div>

      {/* Confirmation Submit Modal */}
      {isConfirmSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl scale-100 transition-all border border-slate-100 dark:border-slate-700">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mb-4 mx-auto">
              <CheckCircle className="h-6 w-6" />
            </div>
            
            <h3 className="text-lg font-bold text-center mb-1">Confirm Exam Submission</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">
              You have answered <strong>{attemptedNum}</strong> out of <strong>{questions.length}</strong> questions. Are you sure you want to finalize and calculate your score?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsConfirmSubmitOpen(false)}
                className="h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-750 cursor-pointer"
              >
                Back to Exam
              </button>
              <button
                onClick={() => {
                  setIsConfirmSubmitOpen(false);
                  submitQuiz();
                }}
                className="h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow cursor-pointer"
              >
                Yes, Submit Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Exit Modal */}
      {isConfirmExitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 mb-4 mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            
            <h3 className="text-lg font-bold text-center mb-1">Discard Practice Session?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">
              If you leave, your active progress in this test session will be permanently lost. Do you want to return to your dashboard?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsConfirmExitOpen(false)}
                className="h-10 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-750 cursor-pointer"
              >
                Keep Practicing
              </button>
              <button
                onClick={() => {
                  setIsConfirmExitOpen(false);
                  onCancel();
                }}
                className="h-10 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow cursor-pointer"
              >
                Discard & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

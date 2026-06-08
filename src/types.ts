/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number; // Index 0-3 corresponding to options
  explanation?: string;
  subject: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  topic?: string;
  subtopic?: string;
  sourceType?: string;
  timesAnswered?: number;
  timesCorrect?: number;
  targetExam?: string;
  isBookmarked?: boolean;
  needsReview?: boolean;
}

export interface AttemptAnswer {
  questionId: string;
  selectedIndex: number | null; // index of selected option, or null if skipped
  isCorrect: boolean;
}

export interface TestAttempt {
  id: string;
  date: string; // ISO String
  timestamp: number;
  subject: string;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  timeTaken: number; // in seconds
  totalTimeAllocated: number; // in seconds
  scorePercentage: number;
  answers: AttemptAnswer[];
}

export interface LeaderboardUser {
  id: string;
  name: string;
  rank: number;
  totalScore: number; // accumulated points or average mock score
  testsTaken: number;
  averageAccuracy: number; // 0 to 100
  isCurrentUser?: boolean;
}

export interface QuizSettings {
  questionCount: number;
  subject: string;
  hasTimer: boolean;
  durationMinutes: number;
}

export interface ExamCounter {
  id: string;
  name: string;
  targetDate: string; // ISO date string
}

export interface DailyGoal {
  baseTarget: number;
  currentTarget: number;
  progressToday: number;
  streak: number;
  lastUpdateDate: string; // ISO Date YYYY-MM-DD
}

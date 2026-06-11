export interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
  subject: string;
  topic?: string;
  subtopic?: string;
  difficulty?: string;
  sourceType?: string;
  timesAnswered?: number;
  timesCorrect?: number;
  targetExam?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface UserAnswer {
  questionId: string;
  selectedIndex: number | null;
  isCorrect: boolean;
}

export interface TestAttempt {
  id: string;
  subject: string;
  date: string;
  scorePercentage: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  timeTaken: number;
  answers: UserAnswer[];
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
  targetDate: string;
}

export interface DailyGoal {
  baseTarget: number;
  currentTarget: number;
  progressToday: number;
  streak: number;
  lastUpdateDate: string;
}

export interface ExamConfig {
  id: string;
  name: string;
  durationMinutes: number;
  subjectDistribution: Record<string, number>;
  sourceExamTag?: string;
}


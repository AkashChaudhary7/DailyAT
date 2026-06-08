/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question, LeaderboardUser, TestAttempt } from '../types';

export const SAMPLE_QUESTIONS: Question[] = [
  // Computer Science / IT
  {
    id: "cs-1",
    questionText: "Which data structure operates on a 'Last-In, First-Out' (LIFO) access structure pattern?",
    options: ["Queue", "Stack", "Binary Tree", "Heap"],
    correctAnswerIndex: 1,
    explanation: "A Stack utilizes a Last-In, First-Out (LIFO) access pattern, where elements are inserted and removed from the same end (the top). In contrast, a Queue operates on First-In, First-Out (FIFO).",
    subject: "Computer Science"
  },
  {
    id: "cs-2",
    questionText: "What does the 'S' in SOLID design principles stand for?",
    options: ["Single Responsibility Principle", "System Integration Principle", "State Segregation Principle", "Static Analysis Rule"],
    correctAnswerIndex: 0,
    explanation: "SOLID is an acronym for five design principles. The 'S' stands for the Single Responsibility Principle, stating that every class or module should have exactly one reason to change.",
    subject: "Computer Science"
  },
  {
    id: "cs-3",
    questionText: "In SQL, which of the following clauses is used to filter results *after* they have been grouped?",
    options: ["WHERE", "HAVING", "GROUP FILTER", "LIMIT"],
    correctAnswerIndex: 1,
    explanation: "The HAVING clause was added to SQL because the WHERE keyword could not be used with aggregate functions. HAVING filters rows after GROUP BY is computed.",
    subject: "Computer Science"
  },
  {
    id: "cs-4",
    questionText: "Which HTTP status code is returned when a requested resource is successfully created?",
    options: ["200 OK", "201 Created", "202 Accepted", "204 No Content"],
    correctAnswerIndex: 1,
    explanation: "The HTTP 201 Created success status response code indicates that the request has succeeded and has led to the creation of a resource.",
    subject: "Computer Science"
  },
  {
    id: "cs-5",
    questionText: "In a relational database system, what type of lock prevents other transactions from reading or modifying a locked table?",
    options: ["Shared Lock (S)", "Exclusive Lock (X)", "Intent Shared Lock (IS)", "Row-level Lock"],
    correctAnswerIndex: 1,
    explanation: "An Exclusive Lock (X) prevents all other concurrent transactions from reading or modifying the locked resource until the lock is released.",
    subject: "Computer Science"
  },

  // Aptitude & Reasoning
  {
    id: "apt-1",
    questionText: "A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train in meters?",
    options: ["120 meters", "180 meters", "150 meters", "165 meters"],
    correctAnswerIndex: 2,
    explanation: "Speed in m/s = 60 * (5 / 18) = 16.67 m/s. Length (Distance) = Speed * Time = 16.67 m/s * 9s = 150 meters.",
    subject: "Aptitude & Reasoning"
  },
  {
    id: "apt-2",
    questionText: "Find the missing number in the sequence: 4, 9, 19, 39, 79, ?",
    options: ["119", "139", "159", "169"],
    correctAnswerIndex: 2,
    explanation: "The pattern is: (Current Number * 2) + 1. Specifically: (4*2)+1=9; (9*2)+1=19; (19*2)+1=39; (39*2)+1=79; (79*2)+1 = 159.",
    subject: "Aptitude & Reasoning"
  },
  {
    id: "apt-3",
    questionText: "Pointing to a photograph, a man says, 'I have no brother or sister but that man's father is my father's son.' Who is in the photograph?",
    options: ["His father", "His nephew", "His son", "Himself"],
    correctAnswerIndex: 2,
    explanation: "Since the man has no sibling, 'my father's son' must be himself. Therefore, 'that man's father is myself'. The photo is of the man's son.",
    subject: "Aptitude & Reasoning"
  },
  {
    id: "apt-4",
    questionText: "A sum of money at simple interest amounts to $815 in 3 years and to $854 in 4 years. What is the principal sum?",
    options: ["$650", "$698", "$700", "$612"],
    correctAnswerIndex: 1,
    explanation: "Interest for 1 year = $854 - $815 = $39. Interest for 3 years = $39 * 3 = $117. Principal = $815 - $117 = $698.",
    subject: "Aptitude & Reasoning"
  },

  // General Awareness
  {
    id: "ga-1",
    questionText: "Which planet in our solar system is known as the 'Red Planet' due to iron oxide deposits on its surface?",
    options: ["Mercury", "Venus", "Mars", "Jupiter"],
    correctAnswerIndex: 2,
    explanation: "Mars is nicknamed the Red Planet because of the iron oxide (rust) on its surface, giving it its reddish iron-chrome glow.",
    subject: "General Awareness"
  },
  {
    id: "ga-2",
    questionText: "Who was the first person to step on the Moon's surface?",
    options: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "Michael Collins"],
    correctAnswerIndex: 1,
    explanation: "Neil Armstrong was the commander of Apollo 11 and became the first person to walk on the lunar surface on July 20, 1969.",
    subject: "General Awareness"
  },
  {
    id: "ga-3",
    questionText: "What is the capital city of Australia, hosting its federal parliament and judicial centers?",
    options: ["Sydney", "Melbourne", "Brisbane", "Canberra"],
    correctAnswerIndex: 3,
    explanation: "Canberra was chosen as the capital city of Australia in 1908 as a compromise between historical rivals Sydney and Melbourne.",
    subject: "General Awareness"
  },

  // English Language
  {
    id: "eng-1",
    questionText: "Identify the word that is an antonym of 'Meticulous'.",
    options: ["Careful", "Scrupulous", "Careless", "Methodical"],
    correctAnswerIndex: 2,
    explanation: "'Meticulous' means showing great attention to detail; very careful and precise. Its antonym is 'Careless' or 'Sloppy'.",
    subject: "English Language"
  },
  {
    id: "eng-2",
    questionText: "Fill in the blank with the correct preposition: 'She has been working here ________ major financial expansions started.'",
    options: ["for", "since", "during", "until"],
    correctAnswerIndex: 1,
    explanation: "'Since' is used to define a specific starting point in time of an ongoing action in the present perfect continuous tense.",
    subject: "English Language"
  }
];

export const INITIAL_LEADERBOARD: LeaderboardUser[] = [
  { id: "lead-1", name: "Rahul Sharma (UP)", rank: 1, totalScore: 285, testsTaken: 12, averageAccuracy: 95.2 },
  { id: "lead-2", name: "Siddharth Roy (Kolkata)", rank: 2, totalScore: 278, testsTaken: 11, averageAccuracy: 92.6 },
  { id: "lead-3", name: "Priya Patel (Gujarat)", rank: 3, totalScore: 254, testsTaken: 10, averageAccuracy: 88.4 },
  { id: "lead-4", name: "Ayesha Khan (Delhi)", rank: 4, totalScore: 242, testsTaken: 12, averageAccuracy: 86.1 },
  { id: "lead-5", name: "Amit Thakur (Bihar)", rank: 5, totalScore: 221, testsTaken: 9, averageAccuracy: 84.5 },
  { id: "lead-6", name: "Kiran Rao (Bangalore)", rank: 6, totalScore: 212, testsTaken: 8, averageAccuracy: 81.3 },
  { id: "lead-7", name: "Vikram Rathore (Rajasthan)", rank: 7, totalScore: 198, testsTaken: 8, averageAccuracy: 78.4 }
];

export const SAMPLE_ATTEMPTS: TestAttempt[] = [
  {
    id: "att-1",
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000,
    subject: "Computer Science",
    totalQuestions: 5,
    correctCount: 3,
    incorrectCount: 1,
    unattemptedCount: 1,
    timeTaken: 180,
    totalTimeAllocated: 300,
    scorePercentage: 60,
    answers: []
  },
  {
    id: "att-2",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
    subject: "Aptitude & Reasoning",
    totalQuestions: 5,
    correctCount: 4,
    incorrectCount: 1,
    unattemptedCount: 0,
    timeTaken: 210,
    totalTimeAllocated: 300,
    scorePercentage: 80,
    answers: []
  },
  {
    id: "att-3",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
    subject: "General Awareness",
    totalQuestions: 5,
    correctCount: 5,
    incorrectCount: 0,
    unattemptedCount: 0,
    timeTaken: 95,
    totalTimeAllocated: 300,
    scorePercentage: 100,
    answers: []
  }
];

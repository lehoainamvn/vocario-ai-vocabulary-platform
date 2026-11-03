export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  targetLevel?: string;
  streakCount?: number;
  totalWordsLearned?: number;
  role?: string;
}

export interface LevelBreakdown {
  level: string;
  totalCount: number;
  masteredCount: number;
  requiredWords?: number;
  completionPercentage?: number;
}

export interface TargetProgress {
  currentLevel: string;
  nextLevel?: string;
  totalWordsAtLevel: number;
  masteredWordsAtLevel: number;
  learningWordsAtLevel: number;
  completionPercentage: number;
  masteryThreshold: number;
  canLevelUp: boolean;
  recommendation: string;
  levelBreakdowns: LevelBreakdown[];
}

export interface DetectedBox {
  object_name: string;
  confidence: number;
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] theo tỷ lệ 0-1000
  vietnamese_meaning?: string;
  ipa?: string;
  example_sentence?: string;
  cefr_level?: string;
}

export interface WordItem {
  id: string;
  word: string;
  ipa?: string;
  vietnameseMeaning?: string;
  cefrLevel?: string;
  repetitionCount?: number;
  status?: string; // NEW, LEARNING, REVIEWING, MASTERED
  exampleSentenceEn?: string;
  exampleSentenceVi?: string;
  detectedBox?: DetectedBox;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  fullName?: string;
  score: number;
  streakDays: number;
  accuracyRate?: number;
  timeTakenSeconds?: number;
}

export interface CertificateItem {
  id: string;
  title: string;
  cefrLevel: string;
  certificateCode: string;
  issueDate: string;
  masteredWordsCount: number;
  streakCount: number;
  approvedBy: string;
}


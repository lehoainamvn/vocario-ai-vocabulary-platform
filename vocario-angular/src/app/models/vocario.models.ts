export interface User {
  id?: string;
  userId?: string;
  email: string;
  username: string;
  fullName?: string;
  token?: string;
  streakCount: number;
  dailyGoal?: number;
  targetLevel?: string;
  role?: 'STUDENT' | 'ADMIN';
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  fullName?: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  username: string;
  fullName: string;
  token: string;
  streakCount: number;
  role?: 'STUDENT' | 'ADMIN';
}

export interface Word {
  id?: string;
  word: string;
  phoneticIpa?: string;
  partOfSpeech?: string;
  cefrLevel?: string;
  vietnameseMeaning: string;
  definitionEn?: string;
  audioUrl?: string;
  exampleSentenceEn?: string;
  exampleSentenceVi?: string;
  category?: string;
}

export interface UserWordProgress {
  id: string;
  user?: User;
  word: Word;
  capture?: any;
  status: 'NEW' | 'LEARNING' | 'REVIEWING' | 'MASTERED';
  repetitionNumber: number;
  easinessFactor: number;
  intervalDays: number;
  nextReviewDate: string;
  lastReviewedAt?: string;
}

export interface ReviewRequest {
  progressId: string;
  ratingGrade: number; // 0 to 5
  reviewType?: string;
  responseTimeMs?: number;
}

export interface ReviewResponse {
  progressId: string;
  word: string;
  ratingGrade?: number;
  oldRepetition?: number;
  newRepetition?: number;
  repetitionNumber?: number;
  oldEasinessFactor?: number;
  newEasinessFactor?: number;
  easinessFactor?: number;
  oldIntervalDays?: number;
  newIntervalDays?: number;
  intervalDays?: number;
  nextReviewDate?: string;
  status?: string;
  message?: string;
  streakCount?: number;
  streakIncremented?: boolean;
  streakMessage?: string;
}

export interface DetectionBox {
  id?: string;
  word: string;
  ipa?: string;
  meaning?: string;
  partOfSpeech?: string;
  level?: string;
  confidence: number | string;
  box: {
    top: string;
    left: string;
    width: string;
    height: string;
  };
  exampleEn?: string;
  exampleVi?: string;
}

export interface LevelBreakdown {
  level: string;
  totalCount: number;
  masteredCount: number;
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

export interface CefrCount {
  level: string;
  count: number;
  percentage: number;
}

export interface AdminActivity {
  id: string;
  type: 'CAPTURE' | 'REVIEW' | 'LEVEL_UP' | 'REGISTER';
  title: string;
  description: string;
  userName: string;
  timeAgo: string;
  timestamp?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalWords: number;
  totalCaptures: number;
  totalReviews: number;
  masteredWords: number;
  learningWords: number;
  masteryRate: number;
  cefrDistribution: CefrCount[];
  recentActivities: AdminActivity[];
}

export interface AdminWordItem extends Word {
  activeLearnersCount?: number;
  createdAt?: string;
}

export interface AdminWordPageResponse {
  content: AdminWordItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface AdminWordRequest {
  word: string;
  partOfSpeech?: string;
  phoneticIpa?: string;
  vietnameseMeaning: string;
  definitionEn?: string;
  cefrLevel?: string;
  audioUrl?: string;
  exampleSentenceEn?: string;
  exampleSentenceVi?: string;
  category?: string;
}

export interface AdminBulkWordResult {
  totalProcessed: number;
  successCount: number;
  skippedDuplicates: number;
  errorMessages: string[];
}

// ==================== ADMIN: QUẢN LÝ HỌC VIÊN ====================

export interface AdminUserOverviewStats {
  totalUsers: number;
  totalStudents: number;
  totalAdmins: number;
  activeToday: number;
  avgStreak: number;
  totalMasteredWords: number;
}

export interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  username: string;
  avatarUrl?: string;
  targetLevel: string;
  dailyGoal: number;
  streakCount: number;
  role: string;
  lastActiveAt?: string;
  createdAt?: string;
  totalWords: number;
  masteredWords: number;
  reviewingWords: number;
  learningWords: number;
  newWords: number;
  totalCaptures: number;
  totalReviews: number;
}

export interface AdminUserPageResponse {
  content: AdminUserItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface AdminUserCaptureSummary {
  id: string;
  imageUrl: string;
  sceneTheme: string;
  detectedObjects: string;
  createdAt: string;
}

export interface AdminUserReviewSummary {
  id: string;
  word: string;
  partOfSpeech: string;
  vietnameseMeaning: string;
  ratingGrade: number;
  reviewType: string;
  speechScore?: number;
  responseTimeMs?: number;
  reviewedAt: string;
}

export interface AdminUserAnalytics {
  user: AdminUserItem;
  averageEasinessFactor: number;
  recentCaptures: AdminUserCaptureSummary[];
  recentReviews: AdminUserReviewSummary[];
}

export interface AdminUserUpdateRequest {
  fullName?: string;
  targetLevel?: string;
  dailyGoal?: number;
  role?: string;
}

// ==================== ADMIN: KIỂM DUYỆT BỐI CẢNH AI VISION ====================

export interface AdminSceneDistributionItem {
  theme: string;
  count: number;
  percentage: number;
}

export interface AdminTopDetectedWordItem {
  word: string;
  vietnamese: string;
  count: number;
}

export interface AdminVisionOverviewStats {
  totalCaptures: number;
  totalDetectedObjects: number;
  totalThemes: number;
  topTheme: string;
  sceneDistribution: AdminSceneDistributionItem[];
  topDetectedWords: AdminTopDetectedWordItem[];
}

export interface DetectedObjectBox {
  id?: string;
  word: string;
  ipa?: string;
  vietnamese?: string;
  partOfSpeech?: string;
  level?: string;
  colorBg?: string;
  colorBorder?: string;
  colorText?: string;
  exampleEn?: string;
  exampleVi?: string;
  collocation?: string;
  collocationVi?: string;
  topPercent?: number;
  leftPercent?: number;
  widthPercent?: number;
  heightPercent?: number;
  confidence?: number;
  box?: number[];
}

export interface AdminCaptureItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  imageUrl: string;
  sceneTheme: string;
  detectedObjectsJson: string;
  detectedCount: number;
  objectLabels: string[];
  createdAt: string;
  timeAgo: string;
  parsedBoxes?: DetectedObjectBox[];
}

export interface AdminCapturePageResponse {
  content: AdminCaptureItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface AdminPromoteWordRequest {
  word: string;
  partOfSpeech?: string;
  phoneticIpa?: string;
  vietnameseMeaning: string;
  definitionEn?: string;
  cefrLevel?: string;
  exampleSentenceEn?: string;
  exampleSentenceVi?: string;
  category?: string;
}

// ==================== ADMIN: CẤU HÌNH SM-2 & HỆ THỐNG ====================

export interface AdminSystemSettings {
  initialEasinessFactor: number;
  minEasinessFactor: number;
  interval1Days: number;
  interval2Days: number;
  aiVisionConfidenceThreshold: number;
  dailyNewWordLimit: number;
  targetCefrLevelDefault: string;
  strictGrading: boolean;
  enableAutoAudioPronunciation: boolean;
  lastUpdated?: string;
}

// ==================== ADMIN: PHÂN TÍCH PHÁT ÂM AI ====================

export interface HardestWordItem {
  word: string;
  ipa: string;
  vietnamese: string;
  cefrLevel: string;
  averageScore: number;
  practiceCount: number;
  commonMistakeHint: string;
}

export interface SpeechLogItem {
  id: string;
  userName: string;
  userEmail: string;
  word: string;
  ipa: string;
  vietnamese: string;
  speechScore: number;
  ratingGrade: number;
  ratingLabel: string;
  responseTimeMs?: number;
  reviewedAt: string;
  timeAgo: string;
}

export interface SpeechAnalyticsResponse {
  averageScore: number;
  totalSessions: number;
  passedCount: number;
  passRate: number;
  activeLearnersCount: number;

  nativeCount: number;
  fluentCount: number;
  goodEffortCount: number;
  needImprovementCount: number;

  hardestWords: HardestWordItem[];
  recentLogs: SpeechLogItem[];
  totalPages: number;
  totalElements: number;
  currentPage: number;
}

// --- Text Extractor & Story Generation ---
export interface ExtractedWordItem {
  word: string;
  ipa?: string;
  vietnamese: string;
  partOfSpeech?: string;
  part_of_speech?: string;
  cefrLevel?: string;
  cefr_level?: string;
  contextSentenceEn?: string;
  context_sentence_en?: string;
  contextSentenceVi?: string;
  context_sentence_vi?: string;
  selected?: boolean;
  savedToNotebook?: boolean;
  isSaving?: boolean;
}

export interface ExtractVocabRequest {
  text: string;
  targetCount?: number;
  target_count?: number;
  targetLevel?: string;
  target_level?: string;
}

export interface ExtractVocabResponse {
  totalRequested?: number;
  total_requested?: number;
  totalExtracted?: number;
  total_extracted?: number;
  estimatedCeiling?: number;
  estimated_ceiling?: number;
  warningNote?: string;
  warning_note?: string;
  words: ExtractedWordItem[];
}

export interface GenerateStoryRequest {
  words: string[];
  targetLevel?: string;
  theme?: string;
}

export interface GenerateStoryResponse {
  title: string;
  level: string;
  storyEn: string;
  storyVi: string;
  highlightedWords: string[];
}

// --- Classroom & Shared Decks ---
export interface ClassroomWordItem {
  id?: string;
  word: string;
  ipa?: string;
  vietnamese: string;
  partOfSpeech?: string;
  exampleEn?: string;
  exampleVi?: string;
}

export interface CreateClassroomRequest {
  name: string;
  description?: string;
  targetLevel?: string;
  icon?: string;
  words: ClassroomWordItem[];
}

export interface ClassroomDetail {
  id: string;
  code: string;
  name: string;
  description: string;
  ownerName: string;
  ownerAvatar?: string;
  ownerId: string;
  isOwner: boolean;
  isMember: boolean;
  clonedToNotebook: boolean;
  targetLevel: string;
  memberCount: number;
  wordsCount: number;
  createdAt: string;
  words: ClassroomWordItem[];
}

export interface ClassroomSummary {
  id: string;
  code: string;
  name: string;
  description: string;
  ownerName: string;
  targetLevel: string;
  wordsCount: number;
  memberCount: number;
  isOwner: boolean;
  createdAt: string;
}

export interface QuizAttemptRequest {
  score: number;
  totalQuestions: number;
  timeSpentSeconds: number;
}

export interface ClassroomLeaderboardItem {
  rank: number;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  score: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  submittedAt: string;
}

export interface CloneNotebookResponse {
  success: boolean;
  importedCount: number;
  existedCount: number;
  totalWords: number;
  message: string;
}

export interface AddClassroomWordsRequest {
  words: ClassroomWordItem[];
}

export interface SaveFlashcardProgressRequest {
  masteredCount: number;
  totalWords: number;
  masteredWords?: string[];
  unmasteredWords?: string[];
}

export interface MemberProgressItem {
  userId: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  masteredCount: number;
  totalWords: number;
  progressPercentage: number;
  completed: boolean;
  unmasteredWords: string[];
  lastStudiedAt: string;
}

export interface ClassroomHardestWordItem {
  word: string;
  unmasteredCount: number;
}

export interface ClassroomProgressDashboard {
  classroomCode: string;
  classroomName: string;
  totalWords: number;
  totalMembers: number;
  studiedMembersCount: number;
  completedMembersCount: number;
  averageCompletionRate: number;
  memberProgresses: MemberProgressItem[];
  hardestWords: ClassroomHardestWordItem[];
}

export interface ClassroomOverviewStats {
  totalClassrooms: number;
  activeClassrooms: number;
  lockedClassrooms: number;
  totalClassroomWords: number;
  totalClassroomMembers: number;
  totalQuizAttempts: number;
}

export interface AdminClassroomItem {
  id: string;
  code: string;
  name: string;
  description: string;
  targetLevel: string;
  icon?: string;
  status: 'ACTIVE' | 'LOCKED';
  ownerId: string;
  ownerUsername: string;
  ownerFullName?: string;
  ownerEmail?: string;
  wordsCount: number;
  memberCount: number;
  quizAttemptCount: number;
  createdAt: string;
}

export interface AdminClassroomPageResponse {
  content: AdminClassroomItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
}

export interface AdminClassroomDetailResponse {
  classroom: AdminClassroomItem;
  words: ClassroomWordItem[];
  memberProgresses: MemberProgressItem[];
  leaderboard: ClassroomLeaderboardItem[];
}


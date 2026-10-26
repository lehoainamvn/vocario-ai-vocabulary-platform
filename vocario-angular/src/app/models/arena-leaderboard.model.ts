export interface ArenaStageRecord {
  id: string;
  stageId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  targetLevel?: string;
  completionTimeMs: number; // Tổng mili-giây gồm tiền phạt, e.g. 6420 = 6.42s
  pureTimeMs: number;       // Thời gian thực tế trước khi phạt
  mistakeCount: number;     // Số lần bấm sai (-2s mỗi lần)
  penaltyMs: number;        // mistakeCount * 2000
  accuracyPct: number;      // e.g. 100, 80
  maxCombo: number;         // Chuỗi x1.5, x2.0, x3.0 cao nhất
  totalXpEarned: number;    // Điểm kinh nghiệm tích lũy
  isPerfectRun: boolean;    // true nếu không chạm sai lần nào
  achievedAt: string;       // ISO Date string
  rank?: number;            // Vị trí thứ hạng trong bảng
  isCurrentUser?: boolean;  // Có phải bản ghi của người đang đăng nhập
}

export interface StageLeaderboardSummary {
  stageId: string;
  bestTimeMs?: number;
  recordHolderName?: string;
  recordHolderAvatar?: string;
  userBestTimeMs?: number;
  userRank?: number;
  totalParticipants: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  fullName: string;
  avatarUrl?: string;
  targetLevel: string;
  streakCount: number;
  masteredWords: number;
  totalReviews: number;
  totalCaptures: number;
  xp: number;
  isCurrentUser: boolean;
}

export interface LeaderboardTargetInfo {
  targetUsername: string;
  targetRank: number;
  xpDiff: number;
  suggestion: string;
}

export interface LeaderboardResponse {
  period: 'weekly' | 'all-time';
  level: string;
  podium: LeaderboardEntry[];
  topUsers: LeaderboardEntry[];
  currentUserRank: LeaderboardEntry | null;
  nextTarget: LeaderboardTargetInfo | null;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
}

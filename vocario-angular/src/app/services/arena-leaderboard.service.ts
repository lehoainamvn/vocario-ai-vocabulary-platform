import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ArenaStageRecord, StageLeaderboardSummary } from '../models/arena-leaderboard.model';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ArenaLeaderboardService {
  private http = inject(HttpClient);
  private api = inject(ApiService);

  private readonly STORAGE_RECORDS_KEY = 'vocario_arena_records_v2';
  private readonly baseUrl = `${environment.apiUrl}/arena`;

  // Danh sách bản ghi thi đấu cục bộ lưu trong bộ nhớ & LocalStorage
  private localRecords = signal<ArenaStageRecord[]>(this.loadInitialRecords());

  /**
   * Khởi tạo bộ dữ liệu mẫu ban đầu để các đấu trường chính thức
   * luôn có không khí thi đua sôi động với các kỷ lục gia thực tế.
   */
  private loadInitialRecords(): ArenaStageRecord[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_RECORDS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc vocario_arena_records_v2 từ localStorage:', e);
    }

    const now = new Date();
    const seedRecords: ArenaStageRecord[] = [
      // 1. Gian Bếp Đời Thực (stage-admin-kitchen)
      {
        id: 'rec-k1',
        stageId: 'stage-admin-kitchen',
        userId: 'u-101',
        userName: 'Minh Hoàng',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces',
        targetLevel: 'B2',
        completionTimeMs: 5820,
        pureTimeMs: 5820,
        mistakeCount: 0,
        penaltyMs: 0,
        accuracyPct: 100,
        maxCombo: 5,
        totalXpEarned: 165,
        isPerfectRun: true,
        achievedAt: new Date(now.getTime() - 2 * 3600000).toISOString()
      },
      {
        id: 'rec-k2',
        stageId: 'stage-admin-kitchen',
        userId: 'u-102',
        userName: 'Phương Thảo',
        userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&crop=faces',
        targetLevel: 'A2',
        completionTimeMs: 6450,
        pureTimeMs: 6450,
        mistakeCount: 0,
        penaltyMs: 0,
        accuracyPct: 100,
        maxCombo: 5,
        totalXpEarned: 150,
        isPerfectRun: true,
        achievedAt: new Date(now.getTime() - 6 * 3600000).toISOString()
      },
      {
        id: 'rec-k3',
        stageId: 'stage-admin-kitchen',
        userId: 'u-103',
        userName: 'Gia Bảo',
        userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces',
        targetLevel: 'B1',
        completionTimeMs: 7890,
        pureTimeMs: 5890,
        mistakeCount: 1,
        penaltyMs: 2000,
        accuracyPct: 83.3,
        maxCombo: 4,
        totalXpEarned: 135,
        isPerfectRun: false,
        achievedAt: new Date(now.getTime() - 14 * 3600000).toISOString()
      },
      {
        id: 'rec-k4',
        stageId: 'stage-admin-kitchen',
        userId: 'u-104',
        userName: 'Thu Trang',
        userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=faces',
        targetLevel: 'A1',
        completionTimeMs: 9120,
        pureTimeMs: 9120,
        mistakeCount: 0,
        penaltyMs: 0,
        accuracyPct: 100,
        maxCombo: 5,
        totalXpEarned: 125,
        isPerfectRun: true,
        achievedAt: new Date(now.getTime() - 28 * 3600000).toISOString()
      },

      // 2. Bàn Học Sinh Gỗ Công Nghiệp
      {
        id: 'rec-s1',
        stageId: 'Ban hoc sinh go cong nghiep tien dung G...',
        userId: 'u-102',
        userName: 'Phương Thảo',
        userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&crop=faces',
        targetLevel: 'A2',
        completionTimeMs: 5310,
        pureTimeMs: 5310,
        mistakeCount: 0,
        penaltyMs: 0,
        accuracyPct: 100,
        maxCombo: 5,
        totalXpEarned: 175,
        isPerfectRun: true,
        achievedAt: new Date(now.getTime() - 4 * 3600000).toISOString()
      },
      {
        id: 'rec-s2',
        stageId: 'Ban hoc sinh go cong nghiep tien dung G...',
        userId: 'u-101',
        userName: 'Minh Hoàng',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces',
        targetLevel: 'B2',
        completionTimeMs: 6150,
        pureTimeMs: 6150,
        mistakeCount: 0,
        penaltyMs: 0,
        accuracyPct: 100,
        maxCombo: 5,
        totalXpEarned: 155,
        isPerfectRun: true,
        achievedAt: new Date(now.getTime() - 10 * 3600000).toISOString()
      },

      // 3. Phòng Khách Ấm Cúng
      {
        id: 'rec-l1',
        stageId: 'Phòng Khách Ấm Cúng',
        userId: 'u-105',
        userName: 'Khánh Linh',
        userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&h=80&fit=crop&crop=faces',
        targetLevel: 'B1',
        completionTimeMs: 4950,
        pureTimeMs: 4950,
        mistakeCount: 0,
        penaltyMs: 0,
        accuracyPct: 100,
        maxCombo: 3,
        totalXpEarned: 140,
        isPerfectRun: true,
        achievedAt: new Date(now.getTime() - 8 * 3600000).toISOString()
      }
    ];

    try {
      localStorage.setItem(this.STORAGE_RECORDS_KEY, JSON.stringify(seedRecords));
    } catch (e) {
      // Ignored
    }
    return seedRecords;
  }

  /**
   * Lưu danh sách records vào LocalStorage
   */
  private persistRecords(): void {
    try {
      localStorage.setItem(this.STORAGE_RECORDS_KEY, JSON.stringify(this.localRecords()));
    } catch (e) {
      console.error('Không thể lưu records vào LocalStorage:', e);
    }
  }

  /**
   * Chuẩn hóa stageId để tra cứu linh hoạt (hỗ trợ cả id và title)
   */
  private matchStage(recordStageId: string, queryStageId: string): boolean {
    if (!recordStageId || !queryStageId) return false;
    const r = recordStageId.trim().toLowerCase();
    const q = queryStageId.trim().toLowerCase();
    return r === q || r.includes(q) || q.includes(r);
  }

  /**
   * Lấy Bảng Xếp Hạng của 1 Đấu trường cụ thể (Mỗi học viên giữ thành tích tốt nhất PB)
   */
  getStageLeaderboard(stageId: string, period: 'all' | 'weekly' = 'all'): Observable<ArenaStageRecord[]> {
    const currentUserId = this.api.currentUser()?.userId || this.api.currentUser()?.id || '69f40a52-ec28-44b1-bebb-c36874a44583';

    // 1. Thử gọi API Spring Boot Backend (nếu máy chủ đang chạy)
    return this.http.get<ArenaStageRecord[]>(`${this.baseUrl}/stages/${encodeURIComponent(stageId)}/leaderboard?period=${period}`).pipe(
      map(remoteRecords => {
        if (Array.isArray(remoteRecords) && remoteRecords.length > 0) {
          return this.processLeaderboardList(remoteRecords, currentUserId);
        }
        return this.getLocalStageLeaderboard(stageId, period, currentUserId);
      }),
      catchError(() => {
        // Fallback trơn tru sang bộ nhớ cục bộ
        return of(this.getLocalStageLeaderboard(stageId, period, currentUserId));
      })
    );
  }

  /**
   * Lọc và xếp hạng danh sách records cục bộ:
   * - Giữ lượt chạy nhanh nhất (Personal Best) của mỗi người dùng
   * - Xếp hạng theo: Time ASC (nhanh nhất đứng đầu) -> Accuracy DESC -> MaxCombo DESC
   */
  getLocalStageLeaderboard(stageId: string, period: 'all' | 'weekly', currentUserId: string): ArenaStageRecord[] {
    const all = this.localRecords();
    const oneWeekAgo = Date.now() - 7 * 86400000;

    // Lọc theo stageId và kỳ hạn
    const stageRecords = all.filter(r => {
      const isMatch = this.matchStage(r.stageId, stageId);
      if (!isMatch) return false;
      if (period === 'weekly') {
        const t = new Date(r.achievedAt).getTime();
        return t >= oneWeekAgo;
      }
      return true;
    });

    // Gom nhóm mỗi user lấy 1 lượt tốt nhất (Best PB)
    const bestPerUser = new Map<string, ArenaStageRecord>();
    for (const r of stageRecords) {
      const uKey = r.userId || r.userName;
      const existing = bestPerUser.get(uKey);
      if (!existing || r.completionTimeMs < existing.completionTimeMs) {
        bestPerUser.set(uKey, r);
      }
    }

    const uniqueList = Array.from(bestPerUser.values());
    return this.processLeaderboardList(uniqueList, currentUserId);
  }

  /**
   * Gán số thứ tự Rank (#1, #2, #3...) và đánh dấu isCurrentUser
   */
  private processLeaderboardList(list: ArenaStageRecord[], currentUserId: string): ArenaStageRecord[] {
    list.sort((a, b) => {
      if (a.completionTimeMs !== b.completionTimeMs) {
        return a.completionTimeMs - b.completionTimeMs;
      }
      if (a.accuracyPct !== b.accuracyPct) {
        return b.accuracyPct - a.accuracyPct;
      }
      return b.maxCombo - a.maxCombo;
    });

    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      isCurrentUser: (item.userId === currentUserId) || (item.userName === this.api.currentUser()?.fullName)
    }));
  }

  /**
   * Lấy thông tin tóm tắt kỷ lục phòng và thành tích cá nhân
   */
  getStageSummary(stageId: string): StageLeaderboardSummary {
    const currentUserId = this.api.currentUser()?.userId || this.api.currentUser()?.id || '69f40a52-ec28-44b1-bebb-c36874a44583';
    const list = this.getLocalStageLeaderboard(stageId, 'all', currentUserId);

    if (list.length === 0) {
      return {
        stageId,
        totalParticipants: 0
      };
    }

    const best = list[0];
    const userEntry = list.find(r => r.isCurrentUser);

    return {
      stageId,
      bestTimeMs: best.completionTimeMs,
      recordHolderName: best.userName,
      recordHolderAvatar: best.userAvatar,
      userBestTimeMs: userEntry?.completionTimeMs,
      userRank: userEntry?.rank,
      totalParticipants: list.length
    };
  }

  /**
   * Nộp kết quả trận đấu Speedrun
   * Trả về thứ hạng vừa đạt được, có phải PB mới không, và đối tượng record
   */
  submitStageRun(runData: Omit<ArenaStageRecord, 'id' | 'achievedAt'>): {
    rank: number;
    isNewPB: boolean;
    record: ArenaStageRecord;
    prevBestMs?: number;
    betterThanPercent: number;
  } {
    const currentUserId = runData.userId || this.api.currentUser()?.userId || this.api.currentUser()?.id || '69f40a52-ec28-44b1-bebb-c36874a44583';
    const userName = runData.userName || this.api.currentUser()?.fullName || 'Học viên Vocario';
    const userAvatar = runData.userAvatar || this.api.currentUser()?.avatarUrl;

    const newRecord: ArenaStageRecord = {
      ...runData,
      id: 'rec-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      userId: currentUserId,
      userName,
      userAvatar,
      achievedAt: new Date().toISOString()
    };

    // Tìm thành tích tốt nhất trước đó của học viên trong phòng này
    const currentLeaderboard = this.getLocalStageLeaderboard(runData.stageId, 'all', currentUserId);
    const existingPB = currentLeaderboard.find(r => r.isCurrentUser);
    const prevBestMs = existingPB ? existingPB.completionTimeMs : undefined;
    const isNewPB = !prevBestMs || newRecord.completionTimeMs < prevBestMs;

    // Lưu vào danh sách cục bộ
    this.localRecords.update(prev => [newRecord, ...prev]);
    this.persistRecords();

    // Tính lại thứ hạng mới
    const updatedLeaderboard = this.getLocalStageLeaderboard(runData.stageId, 'all', currentUserId);
    const myRankEntry = updatedLeaderboard.find(r => r.isCurrentUser);
    const rank = myRankEntry?.rank || updatedLeaderboard.length;

    // Tính tỷ lệ người chơi chậm hơn bạn
    const totalOthers = Math.max(1, updatedLeaderboard.length - 1);
    const worseCount = updatedLeaderboard.length - rank;
    const betterThanPercent = Math.round((worseCount / totalOthers) * 100);

    // Gửi bất đồng bộ lên Spring Boot Backend (nếu online)
    this.http.post(`${this.baseUrl}/submit-run`, newRecord).pipe(
      catchError(() => of(null))
    ).subscribe();

    return {
      rank,
      isNewPB,
      record: newRecord,
      prevBestMs,
      betterThanPercent: Math.max(15, Math.min(99, betterThanPercent))
    };
  }

  /**
   * Định dạng thời gian mili-giây sang chuẩn hiển thị thể thao điện tử (Ví dụ: 6420ms -> 06.42s)
   */
  formatTime(ms?: number): string {
    if (ms === undefined || ms === null || ms <= 0) return '--.--s';
    const sec = ms / 1000;
    const wholeSec = Math.floor(sec);
    const decimals = Math.floor((sec - wholeSec) * 100);
    return `${wholeSec < 10 ? '0' + wholeSec : wholeSec}.${decimals < 10 ? '0' + decimals : decimals}s`;
  }
}

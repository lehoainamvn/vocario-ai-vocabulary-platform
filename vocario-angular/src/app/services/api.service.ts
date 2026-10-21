import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, tap } from 'rxjs';
import { User, LoginRequest, RegisterRequest, AuthResponse, UserWordProgress, ReviewRequest, ReviewResponse, Word, TargetProgress, AdminStats, AdminWordItem, AdminWordPageResponse, AdminWordRequest, AdminBulkWordResult, AdminUserItem, AdminUserPageResponse, AdminUserOverviewStats, AdminUserAnalytics, AdminUserUpdateRequest, AdminVisionOverviewStats, AdminCaptureItem, AdminCapturePageResponse, AdminPromoteWordRequest, AdminSystemSettings, SpeechAnalyticsResponse, ClassroomOverviewStats, AdminClassroomItem, AdminClassroomPageResponse, AdminClassroomDetailResponse } from '../models/vocario.models';
import { LeaderboardResponse, LeaderboardEntry } from '../models/leaderboard.model';
import { Certificate, ClaimCertificateRequest, ApproveCertificateRequest, CertificateType, CreateCertificateTypeRequest, UpdateCertificateTypeRequest } from '../models/certificate.model';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = 'http://localhost:8088/api';
  
  // Current user state as Angular Signal
  currentUser = signal<User | null>(this.loadSavedUser());

  // Quyền hạn Admin
  isAdmin = computed(() => this.currentUser()?.role === 'ADMIN');

  // Trạng thái hiển thị Auth Modal
  authModalState = signal<{ open: boolean; tab: 'login' | 'register' }>({ open: false, tab: 'login' });

  openAuthModal(tab: 'login' | 'register' = 'login') {
    this.authModalState.set({ open: true, tab });
  }

  closeAuthModal() {
    this.authModalState.set({ open: false, tab: 'login' });
  }

  constructor(private http: HttpClient, private toast: ToastService) {}

  private loadSavedUser(): User | null {
    try {
      const saved = localStorage.getItem('vocario_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u && (u.userId || u.id)) return u;
      }
    } catch {}
    return null;
  }

  setCurrentUser(user: User | null) {
    this.currentUser.set(user);
    if (user) {
      localStorage.setItem('vocario_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('vocario_user');
    }
  }

  // --- Streak Engine Integration ---
  updateUserStreak(newStreak: number, incremented?: boolean, message?: string) {
    const cur = this.currentUser();
    if (!cur) return;

    const oldStreak = cur.streakCount ?? 0;
    // Cập nhật state nếu số streak mới khác hoặc trước đó chưa có
    if (oldStreak !== newStreak || cur.streakCount == null) {
      const updated: User = { ...cur, streakCount: newStreak };
      this.setCurrentUser(updated);

      if (incremented) {
        this.toast.success(
          message || `🔥 Chúc mừng! Bạn đã đạt chuỗi ${newStreak} ngày học liên tiếp!`,
          'Streak Ngày Học',
          5000
        );
      }
    }
  }

  checkStreakStatus(userId?: string): Observable<any> {
    const id = userId || this.currentUser()?.userId || this.currentUser()?.id;
    const url = id ? `${this.baseUrl}/srs/streak?userId=${id}` : `${this.baseUrl}/srs/streak`;
    return this.http.get<any>(url).pipe(
      tap(res => {
        if (res && res.streakCount != null) {
          const cur = this.currentUser();
          if (cur && cur.streakCount !== res.streakCount) {
            this.setCurrentUser({ ...cur, streakCount: res.streakCount });
          }
        }
      }),
      catchError(() => of(null))
    );
  }

  // --- Auth APIs ---
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, {
      usernameOrEmail: credentials.usernameOrEmail.trim(),
      password: credentials.password
    }).pipe(
      tap(res => {
        const user: User = {
          userId: res.userId,
          id: res.userId,
          email: res.email,
          username: res.username,
          fullName: res.fullName,
          token: res.token,
          streakCount: res.streakCount ?? 0,
          role: res.role || 'STUDENT'
        };
        this.setCurrentUser(user);
        if (res.token) {
          localStorage.setItem('vocario_token', res.token);
        }
      })
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, {
      email: data.email.trim(),
      username: data.username.trim(),
      password: data.password,
      fullName: data.fullName?.trim() || data.username.trim()
    }).pipe(
      tap(res => {
        const user: User = {
          userId: res.userId,
          id: res.userId,
          email: res.email,
          username: res.username,
          fullName: res.fullName,
          token: res.token,
          streakCount: res.streakCount ?? 0,
          role: res.role || 'STUDENT'
        };
        this.setCurrentUser(user);
        if (res.token) {
          localStorage.setItem('vocario_token', res.token);
        }
      })
    );
  }

  logout() {
    this.setCurrentUser(null);
    localStorage.removeItem('vocario_token');
    localStorage.removeItem('vocario_user');
  }

  // --- Profile APIs ---
  getProfile(userId: string): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/auth/me?userId=${userId}`);
  }

  updateProfile(userId: string, data: { fullName?: string; targetLevel?: string; dailyGoal?: number }): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/auth/profile?userId=${userId}`, data).pipe(
      tap(updated => {
        const current = this.currentUser();
        if (current) {
          this.setCurrentUser({
            ...current,
            fullName: updated.fullName || current.fullName,
            targetLevel: updated.targetLevel || current.targetLevel,
            dailyGoal: updated.dailyGoal || current.dailyGoal
          });
        }
      })
    );
  }

  // --- Target Progression & Level-Up APIs ---
  getTargetProgress(userId?: string): Observable<TargetProgress> {
    const id = userId || this.currentUser()?.userId || this.currentUser()?.id;
    const url = id ? `${this.baseUrl}/srs/target-progress?userId=${id}` : `${this.baseUrl}/srs/target-progress`;
    return this.http.get<TargetProgress>(url);
  }

  levelUp(userId?: string): Observable<User> {
    const id = userId || this.currentUser()?.userId || this.currentUser()?.id;
    const url = id ? `${this.baseUrl}/auth/level-up?userId=${id}` : `${this.baseUrl}/auth/level-up`;
    return this.http.post<User>(url, {}).pipe(
      tap(updated => {
        const current = this.currentUser();
        if (current) {
          this.setCurrentUser({
            ...current,
            targetLevel: updated.targetLevel || current.targetLevel
          });
        }
      })
    );
  }

  // --- SRS APIs ---
  getDueCards(userId?: string): Observable<UserWordProgress[]> {
    const id = userId || this.currentUser()?.userId;
    const url = id ? `${this.baseUrl}/srs/due-cards?userId=${id}` : `${this.baseUrl}/srs/due-cards`;
    return this.http.get<UserWordProgress[]>(url).pipe(
      catchError(err => {
        console.warn('Backend unavailable, using fallback mock Due Cards:', err);
        return of(this.getMockDueCards());
      })
    );
  }

  submitReview(request: ReviewRequest, userId?: string): Observable<ReviewResponse> {
    const id = userId || this.currentUser()?.userId;
    const url = id ? `${this.baseUrl}/srs/review?userId=${id}` : `${this.baseUrl}/srs/review`;
    return this.http.post<ReviewResponse>(url, request).pipe(
      tap(res => {
        if (res && res.streakCount != null) {
          this.updateUserStreak(res.streakCount, res.streakIncremented, res.streakMessage);
        }
      }),
      catchError(err => {
        console.warn('Review submission error, calculating locally:', err);
        return of({
          progressId: request.progressId,
          word: 'laptop',
          ratingGrade: request.ratingGrade,
          oldRepetition: 1,
          newRepetition: request.ratingGrade >= 3 ? 2 : 0,
          oldEasinessFactor: 2.5,
          newEasinessFactor: 2.5,
          oldIntervalDays: 1,
          newIntervalDays: request.ratingGrade >= 3 ? 6 : 1,
          nextReviewDate: new Date(Date.now() + 86400000 * 6).toISOString(),
          status: 'REVIEWING',
          message: 'SM-2 calculated (local simulation)'
        });
      })
    );
  }

  // --- Admin Portal APIs ---
  getAdminStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.baseUrl}/admin/stats`).pipe(
      catchError(err => {
        console.warn('Backend Admin API unavailable, using fallback mock stats:', err);
        return of({
          totalUsers: 24,
          totalWords: 480,
          totalCaptures: 112,
          totalReviews: 350,
          masteredWords: 195,
          learningWords: 285,
          masteryRate: 40.6,
          cefrDistribution: [
            { level: 'A1', count: 120, percentage: 25.0 },
            { level: 'A2', count: 180, percentage: 37.5 },
            { level: 'B1', count: 110, percentage: 22.9 },
            { level: 'B2', count: 50, percentage: 10.4 },
            { level: 'C1', count: 20, percentage: 4.2 }
          ],
          recentActivities: [
            {
              id: 'act-1',
              type: 'CAPTURE',
              title: 'Quét ảnh bối cảnh mới',
              description: 'Chủ đề: Bàn học và thiết bị công nghệ (4 từ mới)',
              userName: 'Nguyễn Văn Student',
              timeAgo: '5 phút trước'
            },
            {
              id: 'act-2',
              type: 'REVIEW',
              title: 'Hoàn thành phiên ôn thẻ SM-2',
              description: 'Đánh giá ghi nhớ: 5/5 sao • Phương thức: FLASHCARD',
              userName: 'Nguyễn Văn Student',
              timeAgo: '18 phút trước'
            },
            {
              id: 'act-3',
              type: 'LEVEL_UP',
              title: 'Thăng cấp trình độ học viên',
              description: 'Thăng cấp thành công từ trình độ A2 lên B1',
              userName: 'Trần Thị Học Viên',
              timeAgo: '1 giờ trước'
            }
          ]
        } as AdminStats);
      })
    );
  }

  // --- Admin Vocabulary Management APIs ---
  getAdminWords(
    page: number = 0,
    size: number = 15,
    search?: string,
    cefrLevel?: string,
    partOfSpeech?: string,
    sortBy: string = 'newest'
  ): Observable<AdminWordPageResponse> {
    let params: any = { page: page.toString(), size: size.toString(), sortBy };
    if (search && search.trim()) params.search = search.trim();
    if (cefrLevel && cefrLevel !== 'ALL') params.cefrLevel = cefrLevel;
    if (partOfSpeech && partOfSpeech !== 'ALL') params.partOfSpeech = partOfSpeech;

    return this.http.get<AdminWordPageResponse>(`${this.baseUrl}/admin/words`, { params });
  }

  getAdminWordDetails(id: string): Observable<AdminWordItem> {
    return this.http.get<AdminWordItem>(`${this.baseUrl}/admin/words/${id}`);
  }

  createAdminWord(data: AdminWordRequest): Observable<AdminWordItem> {
    return this.http.post<AdminWordItem>(`${this.baseUrl}/admin/words`, data);
  }

  updateAdminWord(id: string, data: AdminWordRequest): Observable<AdminWordItem> {
    return this.http.put<AdminWordItem>(`${this.baseUrl}/admin/words/${id}`, data);
  }

  deleteAdminWord(id: string, force: boolean = false): Observable<{ message: string; id: string }> {
    return this.http.delete<{ message: string; id: string }>(`${this.baseUrl}/admin/words/${id}?force=${force}`);
  }

  bulkCreateAdminWords(words: AdminWordRequest[]): Observable<AdminBulkWordResult> {
    return this.http.post<AdminBulkWordResult>(`${this.baseUrl}/admin/words/bulk`, words);
  }

  // --- Admin Student Management APIs ---
  getAdminUserOverviewStats(): Observable<AdminUserOverviewStats> {
    return this.http.get<AdminUserOverviewStats>(`${this.baseUrl}/admin/users/stats`);
  }

  getAdminUsers(
    page: number = 0,
    size: number = 10,
    search?: string,
    role?: string,
    targetLevel?: string,
    sortBy: string = 'newest'
  ): Observable<AdminUserPageResponse> {
    let params: any = { page: page.toString(), size: size.toString(), sortBy };
    if (search && search.trim()) params.search = search.trim();
    if (role && role !== 'ALL') params.role = role;
    if (targetLevel && targetLevel !== 'ALL') params.targetLevel = targetLevel;

    return this.http.get<AdminUserPageResponse>(`${this.baseUrl}/admin/users`, { params });
  }

  getAdminUserAnalytics(userId: string): Observable<AdminUserAnalytics> {
    return this.http.get<AdminUserAnalytics>(`${this.baseUrl}/admin/users/${userId}/analytics`);
  }

  updateAdminUser(userId: string, data: AdminUserUpdateRequest): Observable<AdminUserItem> {
    return this.http.put<AdminUserItem>(`${this.baseUrl}/admin/users/${userId}`, data);
  }

  resetAdminUserProgress(userId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/admin/users/${userId}/reset-progress`, {});
  }

  createAdminUser(data: {
    username: string;
    email: string;
    password?: string;
    fullName?: string;
    targetLevel?: string;
    role?: string;
    dailyGoal?: number;
  }): Observable<AdminUserItem> {
    return this.http.post<AdminUserItem>(`${this.baseUrl}/admin/users`, data);
  }

  deleteAdminUser(userId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/admin/users/${userId}`);
  }

  // --- Admin Vision Moderation APIs ---
  getAdminVisionOverview(): Observable<AdminVisionOverviewStats> {
    return this.http.get<AdminVisionOverviewStats>(`${this.baseUrl}/admin/vision/overview`);
  }

  getAdminVisionCaptures(
    page: number = 0,
    size: number = 12,
    theme?: string,
    search?: string
  ): Observable<AdminCapturePageResponse> {
    let params: any = { page: page.toString(), size: size.toString() };
    if (theme && theme !== 'ALL') params.theme = theme;
    if (search && search.trim()) params.search = search.trim();

    return this.http.get<AdminCapturePageResponse>(`${this.baseUrl}/admin/vision/captures`, { params });
  }

  deleteAdminVisionCapture(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/admin/vision/captures/${id}`);
  }

  promoteAdminVisionWord(data: AdminPromoteWordRequest): Observable<AdminWordItem> {
    return this.http.post<AdminWordItem>(`${this.baseUrl}/admin/vision/promote-word`, data);
  }

  // --- Admin System & SM-2 Algorithm Settings APIs ---
  getAdminSystemSettings(): Observable<AdminSystemSettings> {
    return this.http.get<AdminSystemSettings>(`${this.baseUrl}/admin/settings`);
  }

  updateAdminSystemSettings(data: AdminSystemSettings): Observable<AdminSystemSettings> {
    return this.http.put<AdminSystemSettings>(`${this.baseUrl}/admin/settings`, data);
  }

  resetAdminSystemSettings(): Observable<AdminSystemSettings> {
    return this.http.post<AdminSystemSettings>(`${this.baseUrl}/admin/settings/reset`, {});
  }


  // --- Text-to-speech for English Pronunciation ---
  speak(text: string) {

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }

  // --- Fallback Mock Data for demo purposes ---
  private getMockDueCards(): UserWordProgress[] {
    return [
      {
        id: 'mock-prog-1',
        word: {
          word: 'laptop',
          phoneticIpa: '/ˈlæptɒp/',
          vietnameseMeaning: 'Máy tính xách tay',
          partOfSpeech: 'Noun',
          cefrLevel: 'A1',
          exampleSentenceEn: 'I use my laptop for university assignments and coding projects.',
          exampleSentenceVi: 'Tôi dùng máy tính xách tay để làm bài tập đại học và lập trình.'
        },
        status: 'LEARNING',
        repetitionNumber: 1,
        easinessFactor: 2.5,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString()
      },
      {
        id: 'mock-prog-2',
        word: {
          word: 'water bottle',
          phoneticIpa: '/ˈwɔː.tər ˌbɒt.əl/',
          vietnameseMeaning: 'Bình đựng nước cá nhân',
          partOfSpeech: 'Noun',
          cefrLevel: 'A1',
          exampleSentenceEn: 'Keep a water bottle on your study desk to stay hydrated.',
          exampleSentenceVi: 'Hãy để một bình nước trên bàn học để bổ sung nước thường xuyên.'
        },
        status: 'NEW',
        repetitionNumber: 0,
        easinessFactor: 2.5,
        intervalDays: 0,
        nextReviewDate: new Date().toISOString()
      },
      {
        id: 'mock-prog-3',
        word: {
          word: 'bookshelf',
          phoneticIpa: '/ˈbʊk.ʃelf/',
          vietnameseMeaning: 'Kệ sách mini để bàn',
          partOfSpeech: 'Noun',
          cefrLevel: 'A2',
          exampleSentenceEn: 'The wooden bookshelf holds dictionaries and study guides.',
          exampleSentenceVi: 'Kệ sách gỗ đựng các cuốn từ điển và sách hướng dẫn ôn thi.'
        },
        status: 'REVIEWING',
        repetitionNumber: 2,
        easinessFactor: 2.6,
        intervalDays: 6,
        nextReviewDate: new Date().toISOString()
      }
    ];
  }

  // ==================== BẢNG XẾP HẠNG HỌC VIÊN ====================
  getLeaderboard(period: 'weekly' | 'all-time' = 'all-time', level: string = 'ALL', page: number = 0, size: number = 10): Observable<LeaderboardResponse> {
    const user = this.currentUser();
    const userId = user?.userId || (user as any)?.id;
    let url = `${this.baseUrl}/leaderboard?period=${period}&level=${level}&page=${page}&size=${size}`;
    if (userId) {
      url += `&userId=${userId}`;
    }
    return this.http.get<LeaderboardResponse>(url).pipe(
      catchError(err => {
        console.error('Lỗi khi tải bảng xếp hạng:', err);
        return of({
          period,
          level,
          podium: [],
          topUsers: [],
          currentUserRank: null,
          nextTarget: null,
          page: 0,
          size: 10,
          totalElements: 0,
          totalPages: 1,
          isFirst: true,
          isLast: true
        });
      })
    );
  }

  getMyLeaderboardRank(period: 'weekly' | 'all-time' = 'all-time'): Observable<LeaderboardEntry | null> {
    const user = this.currentUser();
    const userId = user?.userId || (user as any)?.id;
    let url = `${this.baseUrl}/leaderboard/my-rank?period=${period}`;
    if (userId) {
      url += `&userId=${userId}`;
    }
    return this.http.get<LeaderboardEntry>(url).pipe(
      catchError(err => {
        console.error('Lỗi khi tải thứ hạng cá nhân:', err);
        return of(null);
      })
    );
  }

  // --- Admin Speech Analytics APIs ---
  getSpeechAnalytics(page: number = 0, size: number = 10): Observable<SpeechAnalyticsResponse> {
    return this.http.get<SpeechAnalyticsResponse>(`${this.baseUrl}/admin/speech/analytics?page=${page}&size=${size}`).pipe(
      catchError(err => {
        console.warn('Backend Speech Analytics API error, using fallback data:', err);
        return of({
          averageScore: 78.5,
          totalSessions: 32,
          passedCount: 26,
          passRate: 81.3,
          activeLearnersCount: 5,
          nativeCount: 11,
          fluentCount: 15,
          goodEffortCount: 4,
          needImprovementCount: 2,
          hardestWords: [
            { word: 'refrigerator', ipa: '/rɪˈfrɪdʒəreɪtər/', vietnamese: 'tủ lạnh', cefrLevel: 'A2', averageScore: 52.4, practiceCount: 18, commonMistakeHint: 'Lỗi nuốt âm /dʒ/ và nhấn sai trọng âm âm tiết 2' },
            { word: 'comfortable', ipa: '/ˈkʌmftəbl/', vietnamese: 'thoải mái, êm ái', cefrLevel: 'B1', averageScore: 58.0, practiceCount: 22, commonMistakeHint: 'Lỗi đọc 4 âm tiết thay vì phát âm chuẩn 3 âm tiết' },
            { word: 'cushion', ipa: '/ˈkʊʃn/', vietnamese: 'gối đệm tựa lưng', cefrLevel: 'A2', averageScore: 61.5, practiceCount: 15, commonMistakeHint: 'Lỗi nhầm lẫn âm /ʃ/ thành âm /s/' },
            { word: 'vegetable', ipa: '/ˈvedʒtəbl/', vietnamese: 'rau củ quả', cefrLevel: 'A1', averageScore: 64.2, practiceCount: 27, commonMistakeHint: 'Lỗi phát âm âm /dʒ/ và phụ âm bật hơi' },
            { word: 'water bottle', ipa: '/ˈwɔːtər ˈbɑːtl/', vietnamese: 'chai nước uống', cefrLevel: 'A1', averageScore: 68.0, practiceCount: 31, commonMistakeHint: 'Lỗi phát âm âm dark-L ở đuôi từ /tl/' }
          ],
          recentLogs: [
            { id: 'log-1', userName: 'Nguyễn Văn Nam', userEmail: 'nam.nguyen@vocario.edu.vn', word: 'water bottle', ipa: '/ˈwɔːtər ˈbɑːtl/', vietnamese: 'chai nước uống', speechScore: 95.0, ratingGrade: 5, ratingLabel: 'Xuất Sắc (Native Like)', responseTimeMs: 2100, reviewedAt: new Date().toISOString(), timeAgo: 'Vừa xong' },
            { id: 'log-2', userName: 'Trần Thị Mai', userEmail: 'mai.tran@vocario.edu.vn', word: 'laptop', ipa: '/ˈlæptɒp/', vietnamese: 'máy tính xách tay', speechScore: 88.0, ratingGrade: 4, ratingLabel: 'Rất Tốt (Fluent)', responseTimeMs: 1850, reviewedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), timeAgo: '15 phút trước' },
            { id: 'log-3', userName: 'Lê Hoàng Anh', userEmail: 'anh.le@vocario.edu.vn', word: 'cushion', ipa: '/ˈkʊʃn/', vietnamese: 'gối tựa lưng', speechScore: 62.0, ratingGrade: 3, ratingLabel: 'Khá Ổn (Good Effort)', responseTimeMs: 2800, reviewedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), timeAgo: '45 phút trước' },
            { id: 'log-4', userName: 'Phạm Đức Huy', userEmail: 'huy.pham@vocario.edu.vn', word: 'refrigerator', ipa: '/rɪˈfrɪdʒəreɪtər/', vietnamese: 'tủ lạnh', speechScore: 54.0, ratingGrade: 2, ratingLabel: 'Cần Cố Gắng', responseTimeMs: 3200, reviewedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), timeAgo: '2 giờ trước' }
          ],
          totalPages: 1,
          totalElements: 4,
          currentPage: 0
        });
      })
    );
  }

  // --- Admin Classroom Management APIs ---
  getAdminClassroomStats(): Observable<ClassroomOverviewStats> {
    return this.http.get<ClassroomOverviewStats>(`${this.baseUrl}/admin/classrooms/stats`).pipe(
      catchError(err => {
        console.warn('Lỗi khi tải thống kê lớp học admin:', err);
        return of({
          totalClassrooms: 0,
          activeClassrooms: 0,
          lockedClassrooms: 0,
          totalClassroomWords: 0,
          totalClassroomMembers: 0,
          totalQuizAttempts: 0
        });
      })
    );
  }

  getAdminClassrooms(page: number = 0, size: number = 10, search: string = '', status: string = 'ALL', sortBy: string = 'newest'): Observable<AdminClassroomPageResponse> {
    let url = `${this.baseUrl}/admin/classrooms?page=${page}&size=${size}&sortBy=${sortBy}`;
    if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
    if (status && status !== 'ALL') url += `&status=${status}`;
    return this.http.get<AdminClassroomPageResponse>(url);
  }

  getAdminClassroomDetail(id: string): Observable<AdminClassroomDetailResponse> {
    return this.http.get<AdminClassroomDetailResponse>(`${this.baseUrl}/admin/classrooms/${id}`);
  }

  toggleAdminClassroomStatus(id: string): Observable<AdminClassroomItem> {
    return this.http.put<AdminClassroomItem>(`${this.baseUrl}/admin/classrooms/${id}/status`, {});
  }

  deleteAdminClassroom(id: string): Observable<{ message: string; id: string }> {
    return this.http.delete<{ message: string; id: string }>(`${this.baseUrl}/admin/classrooms/${id}`);
  }

  promoteAdminClassroomWord(wordId: string, cefrLevel: string = 'B1', category: string = 'Lớp học cộng đồng'): Observable<Word> {
    return this.http.post<Word>(`${this.baseUrl}/admin/classrooms/words/${wordId}/promote?cefrLevel=${cefrLevel}&category=${encodeURIComponent(category)}`, {});
  }

  // --- CEFR Certificate & Credentialing APIs ---
  getMyCertificates(userId?: string): Observable<Certificate[]> {
    const id = userId || this.currentUser()?.userId || this.currentUser()?.id;
    const url = id ? `${this.baseUrl}/certificates/my-certificates?userId=${id}` : `${this.baseUrl}/certificates/my-certificates`;
    return this.http.get<Certificate[]>(url);
  }

  claimCertificate(level: string, userId?: string): Observable<Certificate> {
    const id = userId || this.currentUser()?.userId || this.currentUser()?.id;
    const url = id 
      ? `${this.baseUrl}/certificates/claim?userId=${id}&level=${encodeURIComponent(level)}` 
      : `${this.baseUrl}/certificates/claim?level=${encodeURIComponent(level)}`;
    return this.http.post<Certificate>(url, {});
  }

  getAllCertificatesAdmin(): Observable<Certificate[]> {
    return this.http.get<Certificate[]>(`${this.baseUrl}/certificates/admin/all`);
  }

  approveCertificate(certId: string, adminName?: string): Observable<Certificate> {
    return this.http.put<Certificate>(`${this.baseUrl}/certificates/admin/approve/${certId}`, { adminName });
  }

  updateCertificate(certId: string, data: { title?: string; cefrLevel?: string; approvedBy?: string; status?: string; masteredWordsCount?: number; streakCount?: number }): Observable<Certificate> {
    return this.http.put<Certificate>(`${this.baseUrl}/certificates/admin/update/${certId}`, data);
  }

  revokeCertificate(certId: string): Observable<Certificate> {
    return this.http.put<Certificate>(`${this.baseUrl}/certificates/admin/revoke/${certId}`, {});
  }

  manualIssueCertificate(data: { userId: string; cefrLevel: string; title?: string; approvedBy?: string; masteredWordsCount?: number }): Observable<Certificate> {
    return this.http.post<Certificate>(`${this.baseUrl}/certificates/admin/manual-issue`, data);
  }

  deleteCertificate(certId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/certificates/admin/${certId}`);
  }

  // --- Certificate Types (Catalog & Standards) ---
  getCertificateTypes(): Observable<CertificateType[]> {
    return this.http.get<CertificateType[]>(`${this.baseUrl}/certificates/admin/types`);
  }

  createCertificateType(data: CreateCertificateTypeRequest): Observable<CertificateType> {
    return this.http.post<CertificateType>(`${this.baseUrl}/certificates/admin/types`, data);
  }

  updateCertificateType(id: string, data: UpdateCertificateTypeRequest): Observable<CertificateType> {
    return this.http.put<CertificateType>(`${this.baseUrl}/certificates/admin/types/${id}`, data);
  }

  deleteCertificateType(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/certificates/admin/types/${id}`);
  }
}

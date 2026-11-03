import axios from 'axios';
import { apiClient, AI_VISION_URL, removeStoredToken, setAuthData, getStoredUserId } from './client';
import { TargetProgress, WordItem, LeaderboardEntry, CertificateItem, DetectedBox } from '../types';

// Helper chuyển đổi DTO UserWordProgress từ backend Spring Boot sang giao diện WordItem
export const mapProgressToWordItem = (item: any): WordItem => {
  if (!item) return {} as WordItem;
  if (typeof item.word === 'string' && item.vietnameseMeaning && item.ipa) {
    return item as WordItem;
  }
  const w = item.word && typeof item.word === 'object' ? item.word : {};
  const wordText = typeof item.word === 'string' ? item.word : (w.word || item.wordText || 'sofa');
  const ipa = item.ipa || item.phoneticIpa || w.phoneticIpa || w.ipa || '/.../';
  const meaning = item.vietnameseMeaning || item.vietnamese || w.vietnameseMeaning || w.meaning || 'Từ vựng bối cảnh';
  const level = item.cefrLevel || item.level || w.cefrLevel || 'A2';
  return {
    id: item.id ? String(item.id) : (w.id ? String(w.id) : String(Math.random())),
    word: wordText,
    ipa: ipa,
    vietnameseMeaning: meaning,
    cefrLevel: level,
    repetitionCount: item.repetitionNumber ?? item.repetitionCount ?? 0,
    status: item.status || 'NEW',
    exampleSentenceEn: item.exampleSentenceEn || item.exampleEn || w.exampleSentenceEn || w.exampleEn || '',
    exampleSentenceVi: item.exampleSentenceVi || item.exampleVi || w.exampleSentenceVi || w.exampleVi || '',
  };
};

export const authService = {
  async login(usernameOrEmail: string, password: string) {
    const res = await apiClient.post('/api/auth/login', {
      usernameOrEmail: usernameOrEmail.trim(),
      password,
    });
    const data = res.data;
    if (data?.token) {
      await setAuthData(data.token, data.userId ? String(data.userId) : undefined, data.username, data);
    }
    return data;
  },

  async register(username: string, email: string, password: string, fullName?: string, targetLevel: string = 'A2') {
    const res = await apiClient.post('/api/auth/register', {
      username: username.trim(),
      email: email.trim(),
      password,
      fullName: (fullName || username).trim(),
    });
    const data = res.data;
    if (data?.token) {
      await setAuthData(data.token, data.userId ? String(data.userId) : undefined, data.username, data);
      if (data.userId) {
        try {
          await apiClient.put('/api/auth/profile', {
            fullName: fullName || username,
            targetLevel,
            dailyGoal: 10,
          }, { params: { userId: data.userId } });
        } catch (_) {}
      }
    }
    return data;
  },

  async getProfile(userId?: string) {
    const res = await apiClient.get('/api/auth/me', {
      params: userId ? { userId } : {},
    });
    return res.data;
  },

  async updateProfile(data: { fullName?: string; targetLevel?: string; dailyGoal?: number }) {
    const res = await apiClient.put('/api/auth/profile', data);
    return res.data;
  },

  async levelUp() {
    const res = await apiClient.post('/api/auth/level-up');
    return res.data;
  },

  async logout() {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (_) {}
    await removeStoredToken();
  },

  async getDashboardData() {
    const profile = await authService.getProfile().catch(() => null);
    const userId = profile?.id || profile?.userId || (await getStoredUserId());
    const [dueCards, targetProgress] = await Promise.allSettled([
      srsService.getDueCards(userId).catch(() => []),
      srsService.getTargetProgress(userId).catch(() => null),
    ]);
    return {
      user: profile,
      dueCards: dueCards.status === 'fulfilled' ? dueCards.value : [],
      targetProgress: targetProgress.status === 'fulfilled' ? targetProgress.value : null,
    };
  },
};

export const srsService = {
  async getTargetProgress(userId?: string): Promise<TargetProgress> {
    const id = userId || (await getStoredUserId());
    const res = await apiClient.get('/api/srs/target-progress', {
      params: id ? { userId: id } : {},
    });
    return res.data;
  },

  async getDueCards(userId?: string): Promise<WordItem[]> {
    const id = userId || (await getStoredUserId());
    const res = await apiClient.get('/api/srs/due-cards', {
      params: id ? { userId: id } : {},
    });
    const rawList = res.data || [];
    return rawList.map(mapProgressToWordItem);
  },

  async getSavedWords(userId?: string): Promise<WordItem[]> {
    const id = userId || (await getStoredUserId());
    const res = await apiClient.get('/api/srs/my-words', {
      params: id ? { userId: id } : {},
    });
    const rawList = res.data || [];
    return rawList.map(mapProgressToWordItem);
  },

  async submitReview(data: {
    progressId?: string;
    wordText?: string;
    ratingGrade: number; // 0-5
    reviewType?: string;
    speechScore?: number;
    responseTimeMs?: number;
    userId?: string;
  }) {
    const id = data.userId || (await getStoredUserId());
    const res = await apiClient.post('/api/srs/review', data, {
      params: id ? { userId: id } : {},
    });
    return res.data;
  },

  async markWordAsMastered(progressId?: string, wordText?: string, userId?: string) {
    const id = userId || (await getStoredUserId());
    const res = await apiClient.post('/api/srs/mark-mastered', null, {
      params: {
        ...(id ? { userId: id } : {}),
        ...(progressId ? { progressId } : {}),
        ...(wordText ? { wordText } : {}),
      },
    });
    return res.data;
  },

  async deleteWord(progressId: string, userId?: string) {
    const id = userId || (await getStoredUserId());
    const res = await apiClient.delete(`/api/srs/progress/${progressId}`, {
      params: id ? { userId: id } : {},
    });
    return res.status === 200 || res.status === 204;
  },
};

export const visionService = {
  /**
   * Bóc tách vật thể thực tế qua FastAPI YOLO-World v2 (Port 8001 /detect)
   */
  async detectObjectsFromImage(options: {
    imageUri?: string;
    base64DataUrl?: string;
    sceneTheme?: string;
    targetLevel?: string;
    confidenceThreshold?: number;
    skipDialogue?: boolean;
  }) {
    try {
      const formData = new FormData();
      const filename = 'capture.jpg';

      if (options.base64DataUrl) {
        if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
          const blobRes = await fetch(options.base64DataUrl);
          const blob = await blobRes.blob();
          formData.append('file', blob, filename);
        } else {
          formData.append('file', {
            uri: options.imageUri || options.base64DataUrl,
            name: filename,
            type: 'image/jpeg',
          } as any);
        }
      } else if (options.imageUri) {
        if (typeof window !== 'undefined' && options.imageUri.startsWith('http')) {
          const blobRes = await fetch(options.imageUri);
          const blob = await blobRes.blob();
          formData.append('file', blob, filename);
        } else {
          formData.append('file', {
            uri: options.imageUri,
            name: filename,
            type: 'image/jpeg',
          } as any);
        }
      }

      const res = await axios.post(`${AI_VISION_URL}/detect`, formData, {
        params: {
          conf: options.confidenceThreshold ?? 0.12,
          theme: options.sceneTheme || 'auto',
          target_level: options.targetLevel || 'A2',
          skip_dialogue: options.skipDialogue ?? false,
        },
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 45000,
      });

      return res.data;
    } catch (err: any) {
      console.warn('[visionService.detectObjectsFromImage] error:', err?.message || err);
      return {
        success: false,
        error: err?.response?.data?.detail || err?.message || 'Không thể kết nối máy chủ AI Vision (Port 8001)',
        detectedObjects: [],
        dialogue: [],
      };
    }
  },

  async detectObjectsFromBase64(base64Image: string, sceneTheme: string = 'auto') {
    return this.detectObjectsFromImage({
      base64DataUrl: base64Image,
      sceneTheme,
      confidenceThreshold: 0.12,
    });
  },

  async detectObjectsWithYolo(formData: FormData, params?: Record<string, any>) {
    try {
      const res = await axios.post(`${AI_VISION_URL}/detect`, formData, {
        params: {
          conf: params?.confidenceThreshold || 0.15,
          theme: params?.sceneTheme || 'auto',
          target_level: params?.targetLevel || 'A2',
          skip_dialogue: params?.skipDialogue ?? true,
        },
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 45000,
      });
      return res.data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Không thể kết nối máy chủ AI Vision' };
    }
  },

  async saveRealCapture(data: {
    sceneTheme: string;
    detectedObjects: any[];
    base64DataUrl?: string;
    imageUri?: string;
  }) {
    try {
      const formData = new FormData();
      formData.append('sceneTheme', data.sceneTheme);
      formData.append('detectedObjectsJson', JSON.stringify(data.detectedObjects));
      const filename = 'capture.jpg';
      if (data.base64DataUrl && typeof window !== 'undefined' && typeof window.fetch === 'function') {
        const blobRes = await fetch(data.base64DataUrl);
        const blob = await blobRes.blob();
        formData.append('image', blob, filename);
      } else if (data.imageUri) {
        formData.append('image', {
          uri: data.imageUri,
          name: filename,
          type: 'image/jpeg',
        } as any);
      }
      const res = await apiClient.post('/api/vision/save-capture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  async learnWordFromVision(params: {
    englishWord: string;
    vietnameseMeaning: string;
    phoneticIpa: string;
    cefrLevel: string;
    captureId?: string;
  }) {
    const res = await apiClient.post('/api/vision/learn-word', null, { params });
    return res.data;
  },

  async learnAllWords(captureId: string) {
    const res = await apiClient.post('/api/vision/learn-all-words', null, {
      params: { captureId },
    });
    return res.data;
  },

  async getUserCaptures() {
    const res = await apiClient.get('/api/vision/captures');
    return res.data || [];
  },
};

export const arenaService = {
  async getOfficialStages() {
    try {
      const res = await apiClient.get('/api/arena/stages/official');
      return res.data || [];
    } catch (_) {
      return [
        {
          id: 'stage-office-01',
          title: 'Văn Phòng Hiện Đại & Công Nghệ',
          sceneTheme: 'office',
          imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80',
          totalObjects: 8,
          difficulty: 'MEDIUM',
        },
        {
          id: 'stage-living-02',
          title: 'Phòng Khách Gia Đình Bắc Âu',
          sceneTheme: 'living_room',
          imageUrl: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80',
          totalObjects: 6,
          difficulty: 'EASY',
        },
        {
          id: 'stage-cafe-03',
          title: 'Góc Quán Cà Phê Học Tập',
          sceneTheme: 'cafe',
          imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
          totalObjects: 10,
          difficulty: 'HARD',
        },
      ];
    }
  },

  async submitArenaScore(data: {
    stageId: string;
    completionTimeMs: number;
    pureTimeMs?: number;
    mistakeCount?: number;
    accuracyPct?: number;
    maxCombo?: number;
    totalXpEarned?: number;
    userId?: string;
  }) {
    const id = data.userId || (await getStoredUserId());
    const res = await apiClient.post('/api/arena/submit-run', { ...data, userId: id });
    return res.data;
  },
};

export const leaderboardService = {
  async getLeaderboard(params?: {
    period?: string;
    level?: string;
    page?: number;
    size?: number;
    userId?: string;
  }) {
    const res = await apiClient.get('/api/leaderboard', {
      params: {
        period: params?.period || 'weekly',
        level: params?.level || 'ALL',
        page: params?.page ?? 0,
        size: params?.size ?? 10,
        ...(params?.userId ? { userId: params.userId } : {}),
      },
    });
    return res.data;
  },

  async getMyRank(period: string = 'weekly', userId?: string) {
    const res = await apiClient.get('/api/leaderboard/my-rank', {
      params: {
        period,
        ...(userId ? { userId } : {}),
      },
    });
    return res.data;
  },

  async getWeeklyLeaderboard(period: string = 'weekly', level: string = 'ALL'): Promise<LeaderboardEntry[]> {
    const res = await apiClient.get('/api/leaderboard', {
      params: { period, level, page: 0, size: 20 },
    });
    const data = res.data;
    if (data && Array.isArray(data.topUsers)) {
      return data.topUsers.map((u: any) => ({
        rank: u.rank,
        userId: String(u.userId),
        username: u.username,
        fullName: u.fullName,
        score: u.xp || 0,
        streakDays: u.streakCount || 0,
        accuracyRate: 100,
      }));
    }
    if (Array.isArray(data)) return data;
    return [];
  },

  async getStageLeaderboard(stageId: string, params?: { period?: string; currentUserId?: string }): Promise<any[]> {
    const res = await apiClient.get(`/api/arena/stages/${stageId}/leaderboard`, {
      params: {
        period: params?.period || 'all',
        ...(params?.currentUserId ? { currentUserId: params.currentUserId } : {}),
      },
    });
    return res.data || [];
  },
};

export const classroomService = {
  async getMyClassrooms(userId?: string) {
    const res = await apiClient.get('/api/classrooms/my-classrooms', {
      params: userId ? { userId } : {},
    });
    return res.data || [];
  },

  async getClassroomByCode(code: string, userId?: string) {
    const res = await apiClient.get(`/api/classrooms/${code.trim().toUpperCase()}`, {
      params: userId ? { userId } : {},
    });
    return res.data;
  },

  async joinClassroom(code: string, userId?: string) {
    const res = await apiClient.post(`/api/classrooms/${code.trim().toUpperCase()}/join`, {}, {
      params: userId ? { userId } : {},
    });
    return res.data;
  },

  async cloneClassroomToNotebook(code: string, userId?: string) {
    const res = await apiClient.post(`/api/classrooms/${code.trim().toUpperCase()}/clone-to-notebook`, {}, {
      params: userId ? { userId } : {},
    });
    return res.data;
  },

  async createClassroom(data: {
    name: string;
    description: string;
    targetLevel: string;
    words: any[];
    userId?: string;
  }) {
    const { userId, ...body } = data;
    const res = await apiClient.post('/api/classrooms', body, {
      params: userId ? { userId } : {},
    });
    return res.data;
  },

  async saveWordsToNotebook(
    words: any[],
    category: string = 'Trích xuất văn bản',
    targetLevel: string = 'B1',
    userId?: string
  ) {
    const res = await apiClient.post(
      '/api/classrooms/save-words-to-notebook',
      { category, targetLevel, words },
      { params: userId ? { userId } : {} }
    );
    return res.data;
  },
};

export const nlpService = {
  async regenerateDialogue(words: any[], theme: string = 'general', targetLevel: string = 'A2') {
    const res = await axios.post(`${AI_VISION_URL}/regenerate-dialogue`, {
      words,
      theme,
      target_level: targetLevel,
    });
    return res.data;
  },

  async generateAiQuiz(words: any[], theme: string = 'Bối cảnh đời thực', targetLevel: string = 'A2', numQuestions: number = 5) {
    const res = await axios.post(`${AI_VISION_URL}/generate-quiz`, {
      words,
      theme,
      target_level: targetLevel,
      num_questions: numQuestions,
    });
    return res.data;
  },

  async parseDocumentFile(fileFormData: FormData) {
    const res = await axios.post(`${AI_VISION_URL}/parse-document`, fileFormData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async extractVocabFromText(text: string, targetCount: number = 8, targetLevel: string = 'B2', themeHint: string = '') {
    const res = await axios.post(`${AI_VISION_URL}/extract-vocab`, {
      text,
      target_count: targetCount,
      target_level: targetLevel,
      theme_hint: themeHint,
    });
    return res.data;
  },
};

export const certificateService = {
  async getMyCertificates(userId?: string): Promise<CertificateItem[]> {
    const res = await apiClient.get('/api/certificates/my-certificates', {
      params: userId ? { userId } : {},
    });
    return res.data || [];
  },

  async claimCertificate(level: string, userId?: string) {
    const res = await apiClient.post('/api/certificates/claim', null, {
      params: { level, ...(userId ? { userId } : {}) },
    });
    return res.data;
  },
};


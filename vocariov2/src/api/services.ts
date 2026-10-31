import axios from 'axios';
import { apiClient, AI_VISION_URL } from './client';
import { TargetProgress, WordItem, LeaderboardEntry, CertificateItem, DetectedBox } from '../types';

export const authService = {
  async login(usernameOrEmail: string, password: string) {
    const res = await apiClient.post('/api/auth/login', {
      usernameOrEmail,
      password,
    });
    return res.data;
  },

  async register(username: string, email: string, password: string, fullName?: string) {
    const res = await apiClient.post('/api/auth/register', {
      username,
      email,
      password,
      fullName: fullName || username,
    });
    return res.data;
  },

  async getProfile() {
    const res = await apiClient.get('/api/users/profile');
    return res.data;
  },
};

export const srsService = {
  async getTargetProgress(userId?: string): Promise<TargetProgress> {
    const res = await apiClient.get('/api/srs/target-progress', {
      params: userId ? { userId } : {},
    });
    return res.data;
  },

  async getDueCards(userId?: string): Promise<WordItem[]> {
    const res = await apiClient.get('/api/srs/due', {
      params: userId ? { userId } : {},
    });
    return res.data || [];
  },

  async getSavedWords(userId?: string): Promise<WordItem[]> {
    const res = await apiClient.get('/api/srs/words', {
      params: userId ? { userId } : {},
    });
    return res.data || [];
  },

  async submitReview(data: {
    progressId?: string;
    wordText?: string;
    ratingGrade: number; // 0-5
    speechScore?: number;
    responseTimeMs?: number;
    userId?: string;
  }) {
    const res = await apiClient.post('/api/srs/review', data);
    return res.data;
  },
};

export const visionService = {
  async detectObjectsFromBase64(base64Image: string, sceneTheme: string = 'auto'): Promise<{
    scene_theme: string;
    detected_objects: DetectedBox[];
  }> {
    try {
      const res = await axios.post(
        `${AI_VISION_URL}/api/vision/detect-and-lexicon`,
        {
          image_base64: base64Image,
          scene_theme: sceneTheme,
          confidence_threshold: 0.12,
        },
        { timeout: 30000 }
      );
      return res.data;
    } catch (err) {
      // Fallback API Spring Boot proxy nếu AI Vision server không gọi trực tiếp được
      const fallbackRes = await apiClient.post('/api/vision/detect-and-lexicon', {
        imageBase64: base64Image,
        sceneTheme,
      });
      return fallbackRes.data;
    }
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

  async submitArenaScore(data: { stageId: string; completionTimeMs: number; accuracy: number }) {
    const res = await apiClient.post('/api/arena/submit', data);
    return res.data;
  },
};

export const leaderboardService = {
  async getWeeklyLeaderboard(type: string = 'weekly') {
    const res = await apiClient.get('/api/leaderboard', {
      params: { type },
    });
    return res.data;
  },

  async getStageLeaderboard(stageId: string): Promise<LeaderboardEntry[]> {
    const res = await apiClient.get(`/api/arena/stages/${stageId}/leaderboard`);
    return res.data || [];
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


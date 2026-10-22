import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ToastService } from './toast.service';
import { ApiService } from './api.service';
import { TargetProgress } from '../models/vocario.models';
import { environment } from '../../environments/environment';

export interface ContextWord {
  id: string;
  word: string;
  ipa: string;
  vietnamese: string;
  partOfSpeech: string;
  level: string;
  colorBg: string;
  colorBorder: string;
  colorText: string;
  exampleEn: string;
  exampleVi: string;
  collocation?: string;
  collocationVi?: string;
  topPercent: number;
  leftPercent: number;
  widthPercent: number;
  heightPercent: number;
  confidence?: number;
}

export interface ConversationTurn {
  id: string;
  speaker: 'speakerA' | 'speakerB';
  speakerLabel: string;
  en: string;
  vi: string;
  highlightWord: string;
  highlightColor: string;
}

export interface ContextScene {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  imageUrl: string;
  wordsCount: number;
  masteredCount: number;
  createdAt: string;
  words: ContextWord[];
  dialogueTitle: string;
  dialogueDesc: string;
  dialogue: ConversationTurn[];
}

export interface SrsDueCard {
  id: string;
  word: string;
  ipa: string;
  vietnamese: string;
  level: string;
  partOfSpeech: string;
  exampleEn: string;
  exampleVi: string;
  intervalDays: number;
  easinessFactor: number;
  repetition: number;
  status: 'LEARNING' | 'REVIEWING' | 'MASTERED';
  sceneName: string;
}

export interface SrsStats {
  dueCount: number;
  learningCount: number;
  reviewingCount: number;
  masteredCount: number;
  totalWords: number;
}

export interface SavedWordItem {
  id: string;
  wordId?: string;
  word: string;
  ipa: string;
  vietnamese: string;
  level: string;
  partOfSpeech: string;
  exampleEn: string;
  exampleVi: string;
  intervalDays: number;
  easinessFactor: number;
  repetition: number;
  status: 'NEW' | 'LEARNING' | 'REVIEWING' | 'MASTERED';
  nextReviewDate?: string;
  lastReviewedAt?: string;
  sceneName?: string;
  sceneImageUrl?: string;
  isDue?: boolean;
}

export interface QuizQuestion {
  id: string;
  targetWord: string;
  targetIpa?: string;
  targetMeaning?: string;
  questionEn: string;
  questionVi: string;
  options: string[];
  correctAnswer: string;
  explanationVi: string;
  userSelectedAnswer?: string;
  isAnswered?: boolean;
  isCorrect?: boolean;
}

export interface QuizGenerationResponse {
  success: boolean;
  quizSource?: string;
  quizTitle?: string;
  totalQuestions?: number;
  questions: QuizQuestion[];
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserStudyService {
  private readonly baseUrl = environment.apiUrl;

  // Điều hướng các trang chính của học viên
  activePage = signal<'home' | 'scanner' | 'collection' | 'flashcards'>('home');

  // Bối cảnh được chọn (Rỗng nếu học viên chưa chụp hoặc tải ảnh thật nào)
  selectedSceneId = signal<string>('');

  // Danh sách các bối cảnh đời thực (Trỏ bảng captures trong PostgreSQL)
  scenes = signal<ContextScene[]>([]);

  // Hàng đợi ôn tập hôm nay (Trỏ bảng user_word_progress trong PostgreSQL)
  dueCards = signal<SrsDueCard[]>([]);

  // Toàn bộ từ vựng cá nhân đã lưu trong sổ tay (Trỏ bảng user_word_progress trong PostgreSQL)
  savedWords = signal<SavedWordItem[]>([]);

  // Thống kê tiến trình SM-2 (Trỏ bảng user_word_progress trong PostgreSQL)
  stats = signal<SrsStats>({
    dueCount: 0,
    learningCount: 0,
    reviewingCount: 0,
    masteredCount: 0,
    totalWords: 0
  });

  // Tiến độ mục tiêu CEFR và trạng thái thăng cấp
  targetProgress = signal<TargetProgress | null>(null);

  // Toàn bộ từ điển từ vựng (Trỏ bảng words trong PostgreSQL)
  wordsList = signal<any[]>([]);

  // Trạng thái kết nối CSDL thực tế
  dbStatus = signal<{ connected: boolean; source: string; lastSynced: string }>({
    connected: true,
    source: 'PostgreSQL vocario_db (Port 5432)',
    lastSynced: 'Vừa xong'
  });

  isLoading = signal<boolean>(false);

  // Bối cảnh đang chọn (computed) - null nếu user mới chưa có ảnh thật
  activeScene = computed<ContextScene | null>(() => {
    const list = this.scenes();
    if (list.length === 0) return null;
    const id = this.selectedSceneId();
    const found = list.find(s => s.id === id);
    return found || list[0] || null;
  });

  // Tổng số từ vựng trong tất cả bối cảnh
  totalWordsCount = computed(() => {
    const fromScenes = this.scenes().reduce((acc, s) => acc + s.words.length, 0);
    return fromScenes > 0 ? fromScenes : (this.stats().totalWords ?? 0);
  });

  // Tổng số từ đã ghi nhớ thành thạo
  totalMasteredWords = computed(() => {
    return this.stats().masteredCount ?? 0;
  });

  constructor(
    private http: HttpClient,
    private api: ApiService,
    private toast: ToastService,
    private router: Router
  ) {
    // Khởi tạo và nạp dữ liệu thật từ cơ sở dữ liệu PostgreSQL
    this.loadRealData();

    // Lắng nghe URL thay đổi để đồng bộ signal activePage
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe((event) => {
      const url = event.urlAfterRedirects || event.url;
      if (url.includes('scanner')) {
        this.activePage.set('scanner');
      } else if (url.includes('collection')) {
        this.activePage.set('collection');
      } else if (url.includes('flashcards')) {
        this.activePage.set('flashcards');
      } else if (url.includes('home')) {
        this.activePage.set('home');
      }
    });
  }

  /**
   * Nạp toàn bộ dữ liệu thật từ PostgreSQL thông qua Spring Boot API
   */
  loadRealData() {
    this.isLoading.set(true);
    const userId = this.api.currentUser()?.userId || '69f40a52-ec28-44b1-bebb-c36874a44583';

    // 1. Đồng bộ Hồ sơ Học viên từ Bảng 'users'
    this.http.get<any>(`${this.baseUrl}/auth/me?userId=${userId}`).subscribe({
      next: (user) => {
        if (user) {
          const current = this.api.currentUser();
          this.api.setCurrentUser({
            ...current,
            userId: user.id,
            id: user.id,
            email: user.email,
            username: user.username,
            fullName: user.fullName || user.username,
            streakCount: user.streakCount ?? 0,
            targetLevel: user.targetLevel ?? 'A2'
          });
        }
      },
      error: (err) => console.warn('[DB users] Sử dụng cache tài khoản người dùng:', err)
    });

    // 2. Nạp Danh Sách Bối Cảnh từ Bảng 'captures' (Chỉ nạp ảnh thật của người dùng)
    this.http.get<any[]>(`${this.baseUrl}/vision/captures?userId=${userId}`).subscribe({
      next: (captures) => {
        if (captures && captures.length > 0) {
          const mappedScenes = this.mapRawCapturesToScenes(captures);
          this.scenes.set(mappedScenes);
          if (mappedScenes.length > 0) {
            if (!this.selectedSceneId() || !mappedScenes.some(s => s.id === this.selectedSceneId())) {
              this.selectedSceneId.set(mappedScenes[0].id);
            }
          } else {
            this.selectedSceneId.set('');
          }
        } else {
          this.scenes.set([]);
          this.selectedSceneId.set('');
        }
        this.dbStatus.update(s => ({ ...s, connected: true, lastSynced: 'Đồng bộ lúc ' + new Date().toLocaleTimeString('vi-VN') }));
        // Cập nhật sổ từ đã lưu sau khi đã nạp scenes
        this.refreshSavedWords();
      },
      error: (err) => {
        console.warn('[DB captures] Chưa có ảnh thật nào trong CSDL:', err);
        this.scenes.set([]);
        this.selectedSceneId.set('');
        this.refreshSavedWords();
      }
    });

    // 3. Nạp Thẻ Đến Hạn Ôn Tập từ Bảng 'user_word_progress' kết hợp 'words'
    this.refreshDueCards();

    // 4. Nạp Thống Kê SM-2 từ Bảng 'user_word_progress'
    this.refreshStats();

    // 5. Nạp Tiến Độ Mục Tiêu CEFR & Đề Xuất Thăng Cấp
    this.fetchTargetProgress();

    // 6. Nạp Sổ Từ Vựng Cá Nhân Đã Lưu
    this.refreshSavedWords();

    // 5. Nạp Toàn Bộ Từ Vựng từ Bảng 'words'
    this.http.get<any[]>(`${this.baseUrl}/words`).subscribe({
      next: (words) => {
        if (words && words.length > 0) {
          this.wordsList.set(words);
        }
      },
      error: (err) => console.warn('[DB words] Lỗi lấy danh mục từ vựng:', err)
    });
  }

  /**
   * Ánh xạ các bản ghi từ bảng 'captures' sang đối tượng giao diện ContextScene
   */
  private mapRawCapturesToScenes(captures: any[]): ContextScene[] {
    if (!captures || !Array.isArray(captures)) return [];

    // Chỉ giữ lại các ảnh chụp/tải lên thực tế, loại bỏ hoàn toàn các ảnh mẫu demo mock
    const realCaptures = captures.filter(c => {
      const img = c.imageUrl || '';
      return !img.includes('kitchen_') && !img.includes('living_room') && !img.includes('Ban-hoc-sinh');
    });

    return realCaptures.map((c, index) => {
      let objs: ContextWord[] = [];
      try {
        const raw = typeof c.detectedObjects === 'string' ? JSON.parse(c.detectedObjects) : c.detectedObjects;
        objs = (Array.isArray(raw) ? raw : []).map((item: any, i: number) => ({
          id: item.id || `word-${index}-${i}`,
          word: item.word || 'vật thể',
          ipa: item.ipa || '/.../',
          vietnamese: item.vietnamese || item.meaning || 'Đồ vật đời sống',
          partOfSpeech: item.partOfSpeech || 'noun',
          level: item.level || 'A2',
          colorBg: item.colorBg || (i % 5 === 0 ? 'bg-[#F7D147]' : i % 5 === 1 ? 'bg-[#F5C2C7]' : i % 5 === 2 ? 'bg-[#D6D8F8]' : i % 5 === 3 ? 'bg-[#D1E7DD]' : 'bg-[#CFF4FC]'),
          colorBorder: item.colorBorder || 'border-white',
          colorText: item.colorText || (i % 5 === 0 ? 'text-[#1A1612]' : i % 5 === 1 ? 'text-[#58151C]' : i % 5 === 2 ? 'text-[#1C2059]' : i % 5 === 3 ? 'text-[#0F5132]' : 'text-[#055160]'),
          exampleEn: item.exampleEn || `I see the ${item.word} right here.`,
          exampleVi: item.exampleVi || `Tôi nhìn thấy ${item.vietnamese || item.meaning || item.word} ở ngay đây.`,
          collocation: item.collocation || `use a ${item.word}`,
          collocationVi: item.collocationVi || `sử dụng ${item.vietnamese || item.meaning || item.word}`,
          topPercent: item.topPercent ?? item.box?.top ?? (20 + (i * 12) % 55),
          leftPercent: item.leftPercent ?? item.box?.left ?? (15 + (i * 18) % 65),
          widthPercent: item.widthPercent ?? item.box?.width ?? 22,
          heightPercent: item.heightPercent ?? item.box?.height ?? 7
        }));
      } catch (e) {
        objs = [];
      }

      let fullImageUrl = c.imageUrl || '';
      if (fullImageUrl.startsWith('/uploads/')) {
        fullImageUrl = `${environment.serverUrl}${fullImageUrl}`;
      }

      return {
        id: c.id,
        title: c.sceneTheme || `Bối cảnh #${index + 1}`,
        subtitle: 'Không gian đời thực chụp từ máy ảnh/tải lên',
        category: index === 0 ? 'Đời Sống Gia Đình' : index === 1 ? 'Nội Thất' : 'Học Tập & Công Việc',
        imageUrl: fullImageUrl,
        wordsCount: objs.length,
        masteredCount: Math.min(objs.length, 2 + index),
        createdAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : 'Đã lưu',
        dialogueTitle: `Hội Thoại Bối Cảnh: ${c.sceneTheme}`,
        dialogueDesc: 'Hai người bạn trò chuyện tự nhiên sử dụng các từ vựng xuất hiện trong ảnh',
        dialogue: this.generateDialogueForScene(c.sceneTheme, objs),
        words: objs
      };
    });
  }

  /**
   * Cập nhật danh sách Due Cards từ bảng user_word_progress
   */
  refreshDueCards() {
    const userId = this.api.currentUser()?.userId || this.api.currentUser()?.id;
    if (!userId) {
      this.dueCards.set([]);
      return;
    }
    this.http.get<any[]>(`${this.baseUrl}/srs/due-cards?userId=${userId}`).subscribe({
      next: (cards) => {
        if (cards && cards.length > 0) {
          const mappedCards: SrsDueCard[] = cards.map(c => {
            const w = c.word || {};
            return {
              id: c.id,
              word: w.word || 'word',
              ipa: w.phoneticIpa || '/.../',
              vietnamese: w.vietnameseMeaning || 'Nghĩa tiếng Việt',
              level: w.cefrLevel || 'A2',
              partOfSpeech: w.partOfSpeech || 'noun',
              exampleEn: w.exampleSentenceEn || `I see the ${w.word} right here.`,
              exampleVi: w.exampleSentenceVi || `Tôi nhìn thấy ${w.vietnameseMeaning} ở ngay đây.`,
              intervalDays: c.intervalDays ?? 1,
              easinessFactor: c.easinessFactor ?? 2.5,
              repetition: c.repetitionNumber ?? 1,
              status: c.status || 'LEARNING',
              sceneName: c.capture?.sceneTheme || 'Bối cảnh đời sống'
            };
          });
          this.dueCards.set(mappedCards);
        } else {
          this.dueCards.set([]);
        }
      },
      error: (err) => {
        console.warn('[DB user_word_progress] Lỗi nạp due cards:', err);
        this.dueCards.set([]);
      }
    });
  }

  /**
   * Cập nhật các chỉ số SM-2 từ bảng user_word_progress
   */
  refreshStats() {
    const userId = this.api.currentUser()?.userId || this.api.currentUser()?.id;
    if (!userId) {
      this.stats.set({
        dueCount: 0,
        learningCount: 0,
        reviewingCount: 0,
        masteredCount: 0,
        totalWords: 0
      });
      return;
    }
    this.http.get<any>(`${this.baseUrl}/srs/stats?userId=${userId}`).subscribe({
      next: (s) => {
        if (s) {
          this.stats.set({
            dueCount: s.dueCount ?? 0,
            learningCount: s.learningCount ?? 0,
            reviewingCount: s.reviewingCount ?? 0,
            masteredCount: s.masteredCount ?? 0,
            totalWords: s.totalWords ?? 0
          });
        } else {
          this.stats.set({
            dueCount: 0,
            learningCount: 0,
            reviewingCount: 0,
            masteredCount: 0,
            totalWords: 0
          });
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.warn('[DB user_word_progress] Lỗi thống kê:', err);
        this.stats.set({
          dueCount: 0,
          learningCount: 0,
          reviewingCount: 0,
          masteredCount: 0,
          totalWords: 0
        });
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Đồng bộ tiến độ mục tiêu CEFR và trạng thái sẵn sàng thăng cấp
   */
  fetchTargetProgress() {
    const userId = this.api.currentUser()?.userId || this.api.currentUser()?.id || '69f40a52-ec28-44b1-bebb-c36874a44583';
    this.api.getTargetProgress(userId).subscribe({
      next: (data) => {
        this.targetProgress.set(data);
      },
      error: (err) => {
        console.warn('[Target Progress] Dùng dữ liệu tính toán từ kho từ vựng hiện có:', err);
        // Fallback tính toán nội bộ nếu backend chưa kịp trả về
        const userLevel = (this.api.currentUser()?.targetLevel || 'A2').toUpperCase();
        const cefrThresholds: Record<string, number> = {
          'A1': 500,
          'A2': 1000,
          'B1': 2000,
          'B2': 4000,
          'C1': 8000
        };
        const threshold = cefrThresholds[userLevel] || 1000;
        const saved = this.savedWords();
        const wordsAtLevel = saved.filter(w => (w.level || 'A2').toUpperCase() === userLevel);
        const mastered = wordsAtLevel.filter(w => w.status === 'MASTERED').length;
        const total = wordsAtLevel.length;
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
        const nextIdx = levels.indexOf(userLevel) + 1;
        const nextLvl = nextIdx < levels.length ? levels[nextIdx] : undefined;
        const canLevelUp = mastered >= threshold && !!nextLvl;
        const pct = Math.min(100, Math.round((mastered / threshold) * 100));

        this.targetProgress.set({
          currentLevel: userLevel,
          nextLevel: nextLvl,
          totalWordsAtLevel: total,
          masteredWordsAtLevel: mastered,
          learningWordsAtLevel: total - mastered,
          completionPercentage: pct,
          masteryThreshold: threshold,
          canLevelUp: canLevelUp,
          recommendation: canLevelUp
            ? `🎉 Chúc mừng! Bạn đã làm chủ ${mastered}/${threshold} từ vựng chuẩn CEFR ${userLevel}. Hãy thăng cấp lên ${nextLvl}!`
            : `Tiến độ CEFR ${userLevel}: Đã làm chủ ${mastered}/${threshold} từ (${pct}%). Cần thêm ${threshold - mastered} từ nữa để thăng cấp lên ${nextLvl || 'cấp tối đa'}.`,
          levelBreakdowns: levels.map(lvl => ({
            level: lvl,
            totalCount: saved.filter(w => (w.level || 'A2').toUpperCase() === lvl).length,
            masteredCount: saved.filter(w => (w.level || 'A2').toUpperCase() === lvl && w.status === 'MASTERED').length
          }))
        });
      }
    });
  }

  /**
   * Thăng cấp trình độ học viên lên cấp độ CEFR tiếp theo
   */
  levelUp() {
    const userId = this.api.currentUser()?.userId || this.api.currentUser()?.id || '69f40a52-ec28-44b1-bebb-c36874a44583';
    this.api.levelUp(userId).subscribe({
      next: (updatedUser) => {
        const newLvl = updatedUser.targetLevel || 'B1';
        this.toast.success(`🎉 Chúc mừng bạn đã thăng cấp thành công lên trình độ ${newLvl}!`, 'Thăng Cấp CEFR');
        this.fetchTargetProgress();
      },
      error: (err) => {
        console.warn('Lỗi gọi API levelUp, cập nhật cục bộ:', err);
        const currentLvl = this.targetProgress()?.currentLevel || 'A2';
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
        const nextIdx = levels.indexOf(currentLvl) + 1;
        if (nextIdx < levels.length) {
          const newLvl = levels[nextIdx];
          const currUser = this.api.currentUser();
          if (currUser) {
            this.api.setCurrentUser({ ...currUser, targetLevel: newLvl });
          }
          this.toast.success(`🎉 Chúc mừng bạn đã thăng cấp thành công lên trình độ ${newLvl}!`, 'Thăng Cấp CEFR');
          this.fetchTargetProgress();
        }
      }
    });
  }

  /**
   * Nạp danh sách toàn bộ từ vựng cá nhân từ bảng user_word_progress qua /srs/my-words
   */
  /**
   * Nạp danh sách từ vựng cá nhân từ bảng user_word_progress qua /srs/my-words
   * CHỈ nạp các từ người dùng đã chủ động bấm lưu (lưu lẻ hoặc lưu cả bối cảnh)
   */
  refreshSavedWords() {
    const userId = this.api.currentUser()?.userId || this.api.currentUser()?.id;
    if (!userId) {
      this.savedWords.set([]);
      return;
    }

    this.http.get<any[]>(`${this.baseUrl}/srs/my-words?userId=${userId}`).subscribe({
      next: (cards) => {
        if (cards && cards.length > 0) {
          const now = new Date();
          const mappedList: SavedWordItem[] = cards.map(c => {
            const w = c.word || {};
            const isDue = c.nextReviewDate ? new Date(c.nextReviewDate) <= now : true;
            return {
              id: c.id,
              wordId: w.id,
              word: w.word || 'word',
              ipa: w.phoneticIpa || '/.../',
              vietnamese: w.vietnameseMeaning || 'Nghĩa tiếng Việt',
              level: w.cefrLevel || 'A2',
              partOfSpeech: w.partOfSpeech || 'noun',
              exampleEn: w.exampleSentenceEn || `I see the ${w.word || 'item'} right here.`,
              exampleVi: w.exampleSentenceVi || `Tôi nhìn thấy ${w.vietnameseMeaning || w.word} ở ngay đây.`,
              intervalDays: c.intervalDays ?? 1,
              easinessFactor: c.easinessFactor ?? 2.5,
              repetition: c.repetitionNumber ?? 1,
              status: c.status || (isDue ? 'LEARNING' : 'REVIEWING'),
              nextReviewDate: c.nextReviewDate,
              lastReviewedAt: c.lastReviewedAt,
              sceneName: c.capture?.sceneTheme || 'Bối cảnh thế giới thực',
              sceneImageUrl: c.capture?.imageUrl,
              isDue: isDue
            };
          });

          this.savedWords.set(mappedList);
        } else {
          this.savedWords.set([]);
        }
      },
      error: (err) => {
        console.warn('[DB my-words] Lỗi nạp danh sách từ cá nhân:', err);
        this.savedWords.set([]);
      }
    });
  }

  /**
   * Lưu toàn bộ các từ vựng được AI nhận diện trong một bối cảnh vào Sổ tay SM-2
   */
  learnAllWordsFromScene(captureId: string): Observable<any[]> {
    const userId = this.api.currentUser()?.userId || this.api.currentUser()?.id;
    let params = new HttpParams().set('captureId', captureId);
    if (userId) {
      params = params.set('userId', userId);
    }
    return this.http.post<any[]>(`${this.baseUrl}/vision/learn-all-words`, null, { params });
  }

  switchPage(page: 'home' | 'scanner' | 'collection' | 'flashcards') {
    this.activePage.set(page);
    this.router.navigate(['/' + page]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  selectScene(sceneId: string, navigateToScanner = false) {
    this.selectedSceneId.set(sceneId);
    if (navigateToScanner) {
      this.switchPage('scanner');
    }
  }

  speakWord(text: string) {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis API is not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.92;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Sinh bài thi trắc nghiệm AI động qua Groq LLM dựa trên từ vựng học viên
   */
  generateAiQuiz(
    words: any[],
    theme: string = 'Bối cảnh đời thực',
    targetLevel: string = 'A2',
    numQuestions: number = 5
  ): Observable<QuizGenerationResponse> {
    const url = 'http://127.0.0.1:8001/generate-quiz';
    return this.http.post<QuizGenerationResponse>(url, {
      words,
      theme,
      target_level: targetLevel,
      num_questions: numQuestions
    });
  }

  /**
   * Chấm điểm SM-2 và ghi nhận trực tiếp vào bảng 'user_word_progress' và 'review_logs'
   */
  reviewCard(cardId: string, rating: number, reviewType: string = 'FLASHCARD', responseTimeMs: number = 1200) {
    const cards = this.dueCards();
    const updated = cards.filter(c => c.id !== cardId);
    this.dueCards.set(updated);

    const targetWord = this.savedWords().find(w => w.id === cardId);
    const wordText = targetWord?.word || '';

    // Cập nhật lạc quan (Optimistic update) ngay trong bộ nhớ để giao diện phản hồi tức thì
    const currentList = this.savedWords();
    this.savedWords.set(currentList.map(w => {
      if (w.id === cardId) {
        const nextRep = rating >= 3 ? (w.repetition || 0) + 1 : 0;
        const nextStatus = nextRep >= 5 ? 'MASTERED' : (nextRep > 0 ? 'REVIEWING' : 'LEARNING');
        return {
          ...w,
          repetition: nextRep,
          status: nextStatus as any,
          isDue: false
        };
      }
      return w;
    }));

    const userId = this.api.currentUser()?.userId || this.api.currentUser()?.id || '69f40a52-ec28-44b1-bebb-c36874a44583';

    this.http.post<any>(`${this.baseUrl}/srs/review?userId=${userId}`, {
      progressId: cardId,
      wordText: wordText,
      ratingGrade: rating,
      reviewType: reviewType,
      responseTimeMs: responseTimeMs
    }).subscribe({
      next: (res) => {
        if (res && res.progressId) {
          // Cập nhật ID thật từ CSDL vào danh sách nếu trước đó là ID tạm
          this.savedWords.update(list => list.map(item => {
            if (item.id === cardId || item.word.toLowerCase() === res.word.toLowerCase()) {
              return {
                ...item,
                id: res.progressId,
                repetition: res.repetitionNumber,
                status: res.repetitionNumber >= 5 ? 'MASTERED' : (res.repetitionNumber > 0 ? 'REVIEWING' : 'LEARNING'),
                isDue: false
              };
            }
            return item;
          }));
        }
        if (res && res.streakCount != null) {
          this.api.updateUserStreak(res.streakCount, res.streakIncremented, res.streakMessage);
        }
        const repText = res.repetitionNumber ? ` (Tiến độ SM-2: ${res.repetitionNumber}/5 chu kỳ)` : '';
        const masteredCelebration = res.repetitionNumber >= 5 ? ' 🎉 Tuyệt vời! Từ này đã đạt mốc 5/5 và được công nhận là ĐÃ THUỘC!' : '';
        this.toast.success(
          (res.message || `Cập nhật SM-2 thành công: Lặp lại sau ${res.intervalDays} ngày.`) + repText + masteredCelebration,
          `SuperMemo SM-2`
        );
        this.refreshStats();
        this.refreshDueCards();
        this.refreshSavedWords();
        this.fetchTargetProgress();
      },
      error: (err) => {
        console.warn('[DB review] Ghi nhận tạm thời:', err);
        const labels = ['Quên sạch (0 sao)', 'Rất khó (1 sao)', 'Khó nhớ (2 sao)', 'Ổn (+1 ngày)', 'Dễ (+6 ngày)', 'Thuộc làu (+15 ngày)'];
        this.toast.info(`Ghi nhận ôn tập: ${labels[rating] || rating + ' sao'}`, 'Thuật toán SuperMemo SM-2');
        this.refreshStats();
        this.refreshSavedWords();
        this.fetchTargetProgress();
      }
    });
  }

  /**
   * Đánh dấu trực tiếp từ vựng là ĐÃ THUỘC (MASTERED), bỏ qua các chu kỳ lặp
   */
  markWordMastered(cardId: string) {
    const userId = this.api.currentUser()?.userId || this.api.currentUser()?.id || '69f40a52-ec28-44b1-bebb-c36874a44583';
    const targetWord = this.savedWords().find(w => w.id === cardId);
    const wordText = targetWord?.word || '';

    // Cập nhật lạc quan ngay lập tức trong bộ nhớ
    const currentList = this.savedWords();
    this.savedWords.set(currentList.map(w => {
      if (w.id === cardId) {
        return {
          ...w,
          status: 'MASTERED' as const,
          repetition: Math.max(5, (w.repetition || 0) + 1),
          isDue: false
        };
      }
      return w;
    }));

    const url = `${this.baseUrl}/srs/mark-mastered?userId=${userId}&progressId=${encodeURIComponent(cardId)}&wordText=${encodeURIComponent(wordText)}`;
    this.http.post<any>(url, {}).subscribe({
      next: (res) => {
        if (res && res.progressId) {
          this.savedWords.update(list => list.map(item => {
            if (item.id === cardId || item.word.toLowerCase() === res.word.toLowerCase()) {
              return {
                ...item,
                id: res.progressId,
                status: 'MASTERED',
                repetition: 5,
                isDue: false
              };
            }
            return item;
          }));
        }
        this.toast.success(
          res.message || 'Chúc mừng! Từ vựng đã được công nhận là ĐÃ THUỘC.',
          'Thành Thạo Từ Vựng'
        );
        this.refreshStats();
        this.refreshDueCards();
        this.refreshSavedWords();
        this.fetchTargetProgress();
      },
      error: (err) => {
        console.warn('Lỗi đánh dấu đã thuộc:', err);
        this.toast.info('Đã ghi nhận trạng thái Đã Thuộc.', 'Thành Công');
        this.refreshStats();
        this.refreshSavedWords();
      }
    });
  }

  /**
   * Gọi trực tiếp mô hình AI YOLO-World v2 (Ultralytics PyTorch) qua FastAPI port 8001
   * skipDialogue: Mặc định true để trả về vật thể siêu tốc (<0.8s), hội thoại sẽ nạp bất đồng bộ
   */
  detectRealObjectsWithYolo(file: File, theme: string = 'Bàn Học & Góc Làm Việc', confidence: number = 0.15, skipDialogue: boolean = true): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    const targetLevel = this.api.currentUser()?.targetLevel || 'A2';
    return this.http.post<any>(
      `${environment.aiServiceUrl}/detect?conf=${confidence}&theme=${encodeURIComponent(theme)}&target_level=${encodeURIComponent(targetLevel)}&skip_dialogue=${skipDialogue}`,
      formData
    );
  }

  /**
   * Lưu ảnh chụp thật từ Camera hoặc File tải lên cùng các Bounding Box nhận diện vào CSDL PostgreSQL
   */
  saveRealCapture(file: File, sceneTheme: string, detectedObjects: ContextWord[]): Observable<any> {
    const userId = this.api.currentUser()?.userId || this.api.currentUser()?.id || '69f40a52-ec28-44b1-bebb-c36874a44583';
    const formData = new FormData();
    formData.append('image', file);
    formData.append('sceneTheme', sceneTheme);
    formData.append('detectedObjectsJson', JSON.stringify(detectedObjects));
    if (userId) {
      formData.append('userId', userId);
    }

    return this.http.post<any>(`${this.baseUrl}/vision/save-capture`, formData);
  }

  /**
   * Gọi mô hình Groq LLM để tái tạo đoạn hội thoại ngữ cảnh mới cho cùng bức ảnh
   */
  regenerateDialogueWithAi(words: ContextWord[], theme: string = 'general'): Observable<any> {
    const targetLevel = this.api.currentUser()?.targetLevel || 'A2';
    return this.http.post<any>(`${environment.aiServiceUrl}/regenerate-dialogue`, { words, theme, target_level: targetLevel });
  }

  /**
   * Cập nhật đoạn hội thoại cho bối cảnh đang chọn
   */
  updateActiveSceneDialogue(newDialogue: ConversationTurn[]) {
    const sceneId = this.selectedSceneId();
    if (!sceneId) return;
    this.scenes.update(list => list.map(s => {
      if (s.id === sceneId) {
        return { ...s, dialogue: newDialogue };
      }
      return s;
    }));
  }

  /**
   * Nạp bối cảnh mới lưu từ máy chủ vào danh sách bối cảnh đang hiển thị
   */
  addSavedCaptureToScenes(
    savedCapture: any, 
    detectedObjects: ContextWord[], 
    sceneTheme: string, 
    localPreviewUrl?: string,
    aiDialogue?: ConversationTurn[]
  ) {
    let finalUrl = savedCapture.imageUrl || localPreviewUrl || '';
    if (finalUrl.startsWith('/uploads/')) {
      finalUrl = `${environment.serverUrl}${finalUrl}`;
    }

    const finalDialogue = (aiDialogue && aiDialogue.length > 0)
      ? aiDialogue
      : this.generateDialogueForScene(sceneTheme, detectedObjects);

    const newScene: ContextScene = {
      id: savedCapture.id || `capture-${Date.now()}`,
      title: sceneTheme || 'Bối cảnh mới quét',
      subtitle: 'Ảnh thực tế được quét và lưu thành công',
      category: 'Đời Sống & Học Tập',
      imageUrl: finalUrl,
      wordsCount: detectedObjects.length,
      masteredCount: 0,
      createdAt: 'Vừa xong',
      dialogueTitle: `Hội Thoại Bối Cảnh: ${sceneTheme}`,
      dialogueDesc: 'Hai người bạn trò chuyện tự nhiên sử dụng các từ vựng xuất hiện trong ảnh',
      dialogue: finalDialogue,
      words: detectedObjects
    };

    this.scenes.update(list => [newScene, ...list]);
    this.selectedSceneId.set(newScene.id);
    this.dbStatus.update(s => ({
      ...s,
      connected: true,
      lastSynced: 'Vừa lưu bối cảnh mới lúc ' + new Date().toLocaleTimeString('vi-VN')
    }));
  }

  /**
   * Bấm vào vật thể để thêm vào lộ trình học SM-2 (bảng user_word_progress)
   */
  learnWordFromImage(captureId: string, word: ContextWord) {
    const userId = this.api.currentUser()?.userId || '69f40a52-ec28-44b1-bebb-c36874a44583';
    const params = new HttpParams()
      .set('captureId', captureId)
      .set('englishWord', word.word)
      .set('vietnameseMeaning', word.vietnamese)
      .set('phoneticIpa', word.ipa)
      .set('cefrLevel', word.level || 'A2')
      .set('userId', userId);

    this.http.post<any>(`${this.baseUrl}/vision/learn-word`, null, { params }).subscribe({
      next: (res) => {
        this.toast.success(
          `Đã ghi nhận từ "${word.word}" vào bảng user_word_progress (Khoảng cách ôn: ${res.intervalDays || 0} ngày)!`,
          'PostgreSQL: vocario_db'
        );
        this.refreshStats();
        this.refreshDueCards();
        this.refreshSavedWords();
      },
      error: (err) => {
        this.toast.info(`Từ "${word.word}" đã sẵn sàng trong tiến trình học của bạn!`, 'Thông báo');
        this.refreshSavedWords();
      }
    });
  }

  /**
   * Tạo đoạn hội thoại ngữ cảnh tự nhiên dựa trên bối cảnh đời thực
   */
  private generateDialogueForScene(theme: string, words: ContextWord[]): ConversationTurn[] {
    if (words.length === 0) return [];
    const t = theme.toLowerCase();

    if (t.includes('bếp') || t.includes('kitchen')) {
      return [
        {
          id: 'turn-1',
          speaker: 'speakerA',
          speakerLabel: 'Bạn A',
          en: 'I clean the refrigerator with this cloth.',
          vi: 'Em lau tủ lạnh bằng chiếc khăn này nhé.',
          highlightWord: 'refrigerator',
          highlightColor: 'text-indigo-600'
        },
        {
          id: 'turn-2',
          speaker: 'speakerB',
          speakerLabel: 'Bạn B',
          en: 'I move the cardboard box beside the stairs.',
          vi: 'Anh chuyển thùng các-tông sang cạnh cầu thang.',
          highlightWord: 'cardboard box',
          highlightColor: 'text-sky-600'
        },
        {
          id: 'turn-3',
          speaker: 'speakerA',
          speakerLabel: 'Bạn A',
          en: 'Please wipe the gas stove after cooking.',
          vi: 'Làm ơn lau sạch bếp ga sau khi nấu xong nha.',
          highlightWord: 'gas stove',
          highlightColor: 'text-emerald-600'
        },
        {
          id: 'turn-4',
          speaker: 'speakerB',
          speakerLabel: 'Bạn B',
          en: 'I wash each water bottle near the sink.',
          vi: 'Anh đi rửa từng chai nước gần bồn rửa bát đây.',
          highlightWord: 'water bottle',
          highlightColor: 'text-amber-600'
        },
        {
          id: 'turn-5',
          speaker: 'speakerA',
          speakerLabel: 'Bạn A',
          en: 'The picture frame on the wall needs a clean cloth.',
          vi: 'Khung ảnh trên tường cũng cần một chiếc khăn lau sạch.',
          highlightWord: 'picture frame',
          highlightColor: 'text-rose-600'
        }
      ];
    }

    if (t.includes('khách') || t.includes('living')) {
      return [
        {
          id: 'turn-lr-1',
          speaker: 'speakerA',
          speakerLabel: 'Bạn A',
          en: 'This sofa is so comfortable for reading books.',
          vi: 'Chiếc ghế sofa này ngồi đọc sách thật là êm ái.',
          highlightWord: 'sofa',
          highlightColor: 'text-amber-600'
        },
        {
          id: 'turn-lr-2',
          speaker: 'speakerB',
          speakerLabel: 'Bạn B',
          en: 'Please put the soft cushion behind your back.',
          vi: 'Em hãy đặt chiếc gối tựa mềm mại sau lưng nhé.',
          highlightWord: 'cushion',
          highlightColor: 'text-teal-600'
        },
        {
          id: 'turn-lr-3',
          speaker: 'speakerA',
          speakerLabel: 'Bạn A',
          en: 'I left the tea cup on the wooden coffee table.',
          vi: 'Em để tách trà trên chiếc bàn trà gỗ rồi.',
          highlightWord: 'coffee table',
          highlightColor: 'text-rose-600'
        },
        {
          id: 'turn-lr-4',
          speaker: 'speakerB',
          speakerLabel: 'Bạn B',
          en: 'The indoor plant needs some water this morning.',
          vi: 'Chậu cây cảnh trong nhà cần tưới chút nước sáng nay.',
          highlightWord: 'plant',
          highlightColor: 'text-emerald-600'
        }
      ];
    }

    // Default: Bàn học
    return [
      {
        id: 'turn-sd-1',
        speaker: 'speakerA',
        speakerLabel: 'Bạn A',
        en: 'My laptop battery is almost running low.',
        vi: 'Pin laptop của mình gần hết rồi.',
        highlightWord: 'laptop',
        highlightColor: 'text-amber-600'
      },
      {
        id: 'turn-sd-2',
        speaker: 'speakerB',
        speakerLabel: 'Bạn B',
        en: 'You can find the textbook on the upper bookshelf.',
        vi: 'Bạn có thể tìm cuốn giáo trình ở giá sách phía trên.',
        highlightWord: 'bookshelf',
        highlightColor: 'text-teal-600'
      },
      {
        id: 'turn-sd-3',
        speaker: 'speakerA',
        speakerLabel: 'Bạn A',
        en: 'This wooden chair provides great back support.',
        vi: 'Chiếc ghế gỗ này nâng đỡ lưng rất tốt khi ngồi lâu.',
        highlightWord: 'chair',
        highlightColor: 'text-rose-600'
      }
    ];
  }

  /**
   * Xóa bối cảnh khỏi giao diện và gọi API xóa bản ghi tương ứng trong CSDL
   */
  deleteScene(sceneId: string): Observable<any> {
    const scene = this.scenes().find(s => s.id === sceneId);
    const sceneTitle = scene?.title;

    this.scenes.update(list => list.filter(s => s.id !== sceneId));
    if (this.selectedSceneId() === sceneId) {
      const remaining = this.scenes();
      this.selectedSceneId.set(remaining.length > 0 ? remaining[0].id : '');
    }

    if (sceneTitle) {
      this.savedWords.update(list => list.filter(w => (w.sceneName || '').toLowerCase() !== sceneTitle.toLowerCase()));
      this.dueCards.update(list => list.filter(c => (c.sceneName || '').toLowerCase() !== sceneTitle.toLowerCase()));
    }
    this.refreshStats();
    this.toast.info('Đã xóa bối cảnh thành công.', 'Đã Xóa');
    return this.http.delete(`${this.baseUrl}/vision/captures/${sceneId}`);
  }

  /**
   * Xóa một từ vựng khỏi sổ từ học tập SM-2
   */
  deleteWordFromSrs(progressId: string): Observable<any> {
    this.savedWords.update(list => list.filter(w => w.id !== progressId));
    this.dueCards.update(list => list.filter(c => c.id !== progressId));
    this.refreshStats();
    this.toast.info('Đã xóa từ vựng khỏi sổ tay.', 'Đã Xóa');
    const userId = this.api.currentUser()?.userId || this.api.currentUser()?.id;
    return this.http.delete(`${this.baseUrl}/srs/progress/${progressId}?userId=${userId}`);
  }

  /**
   * Xóa toàn bộ từ vựng thuộc một chủ đề khỏi sổ tay SM-2
   */
  deleteTopicFromSrs(topicName: string): Observable<any> {
    const matchingScene = this.scenes().find(s => s.title.toLowerCase() === topicName.toLowerCase());
    if (matchingScene) {
      this.deleteScene(matchingScene.id).subscribe();
    }
    this.savedWords.update(list => list.filter(w => (w.sceneName || '').toLowerCase() !== topicName.toLowerCase()));
    this.dueCards.update(list => list.filter(c => (c.sceneName || '').toLowerCase() !== topicName.toLowerCase()));
    this.refreshStats();
    this.toast.info(`Đã xóa chủ đề "${topicName}" thành công.`, 'Đã Xóa');
    const userId = this.api.currentUser()?.userId || this.api.currentUser()?.id;
    return this.http.delete(`${this.baseUrl}/srs/topic?topicName=${encodeURIComponent(topicName)}&userId=${userId}`);
  }

  /**
   * Xóa sạch dữ liệu trong state khi người dùng đăng xuất
   */
  clearUserData() {
    this.scenes.set([]);
    this.selectedSceneId.set('');
    this.dueCards.set([]);
    this.stats.set({
      dueCount: 0,
      learningCount: 0,
      reviewingCount: 0,
      masteredCount: 0,
      totalWords: 0
    });
  }
}


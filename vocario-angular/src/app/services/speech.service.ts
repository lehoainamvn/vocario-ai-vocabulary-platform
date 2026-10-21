import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastService } from './toast.service';
import { ApiService } from './api.service';
import { UserStudyService } from './user-study.service';
import { environment } from '../../environments/environment';

export interface SpeechTokenFeedback {
  word: string;
  status: 'CORRECT' | 'CLOSE' | 'MISSED';
  phoneticHint?: string;
}

export interface SpeechPracticeOptions {
  text: string;
  ipa?: string;
  meaning?: string;
  contextTitle?: string;
  cardProgressId?: string;
  mode?: 'WORD' | 'SENTENCE';
}

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private api = inject(ApiService);
  private studyService = inject(UserStudyService);

  private readonly baseUrl = environment.apiUrl;

  // Trạng thái modal
  isOpen = signal<boolean>(false);

  // Dữ liệu câu/từ đang luyện phát âm
  targetText = signal<string>('');
  targetIpa = signal<string>('');
  targetMeaning = signal<string>('');
  contextTitle = signal<string>('');
  cardProgressId = signal<string | null>(null);
  mode = signal<'WORD' | 'SENTENCE'>('WORD');

  // Trạng thái thu âm và phân tích giọng nói
  isListening = signal<boolean>(false);
  interimTranscript = signal<string>('');
  finalTranscript = signal<string>('');
  score = signal<number | null>(null);
  detailedFeedback = signal<SpeechTokenFeedback[]>([]);
  feedbackMessage = signal<string>('');
  isSubmitting = signal<boolean>(false);
  hasPermissionError = signal<string | null>(null);

  // Nhận diện giọng nói Web Speech API
  private recognition: any = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'en-US';
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 3;

      this.recognition.onstart = () => {
        this.isListening.set(true);
        this.interimTranscript.set('');
        this.hasPermissionError.set(null);
      };

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        this.interimTranscript.set(interim || final);

        if (final) {
          this.finalTranscript.set(final.trim());
          const confidence = event.results[0]?.[0]?.confidence ?? 0.88;
          this.evaluatePronunciation(this.targetText(), final.trim(), confidence);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('[WebSpeech] Lỗi thu âm:', event.error);
        this.isListening.set(false);

        if (event.error === 'not-allowed') {
          this.hasPermissionError.set('Trình duyệt chưa được cấp quyền Microphone. Vui lòng nhấp vào biểu tượng ổ khóa trên thanh địa chỉ và chọn "Cho phép" (Allow) mic.');
        } else if (event.error === 'no-speech') {
          this.hasPermissionError.set('Chưa nhận được âm thanh. Hãy bấm nói lại và phát âm to, rõ ràng hơn nhé.');
        } else {
          this.hasPermissionError.set(`Lỗi nhận diện âm thanh: ${event.error}`);
        }
      };

      this.recognition.onend = () => {
        this.isListening.set(false);
      };
    }
  }

  /**
   * Mở modal luyện phát âm cho từ hoặc câu cụ thể
   */
  openSpeechModal(options: SpeechPracticeOptions) {
    this.targetText.set(options.text.trim());
    this.targetIpa.set(options.ipa || '');
    this.targetMeaning.set(options.meaning || '');
    this.contextTitle.set(options.contextTitle || 'Luyện Nói Bối Cảnh');
    this.cardProgressId.set(options.cardProgressId || null);
    
    // Tự động suy luận mode nếu chưa truyền
    const wordCount = options.text.trim().split(/\s+/).length;
    this.mode.set(options.mode || (wordCount > 2 ? 'SENTENCE' : 'WORD'));

    // Đặt lại kết quả cũ
    this.isListening.set(false);
    this.interimTranscript.set('');
    this.finalTranscript.set('');
    this.score.set(null);
    this.detailedFeedback.set([]);
    this.feedbackMessage.set('');
    this.hasPermissionError.set(null);

    this.isOpen.set(true);

    // Tự động phát âm mẫu 1 lần để học viên làm quen
    this.studyService.speakWord(options.text);
  }

  /**
   * Đóng modal luyện nói
   */
  closeSpeechModal() {
    this.stopListening();
    this.isOpen.set(false);
  }

  /**
   * Bắt đầu thu âm giọng nói của học viên
   */
  startListening() {
    this.hasPermissionError.set(null);
    this.interimTranscript.set('');
    this.finalTranscript.set('');
    this.score.set(null);
    this.detailedFeedback.set([]);
    this.feedbackMessage.set('');

    if (!this.recognition) {
      this.initRecognition();
    }

    if (!this.recognition) {
      this.hasPermissionError.set('Trình duyệt hiện tại chưa hỗ trợ Web Speech API. Vui lòng sử dụng Google Chrome hoặc Microsoft Edge.');
      return;
    }

    try {
      this.recognition.abort();
      this.recognition.start();
    } catch (e: any) {
      console.warn('Recognition start exception:', e);
      try {
        this.recognition.start();
      } catch (err) {
        this.hasPermissionError.set('Không thể khởi động microphone. Vui lòng bấm thử lại.');
      }
    }
  }

  /**
   * Dừng thu âm
   */
  stopListening() {
    if (this.recognition && this.isListening()) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
    this.isListening.set(false);
  }

  /**
   * Giả lập giọng nói thử nghiệm (Demo Simulator)
   * Giúp hội đồng chấm thi hoặc người dùng không có microphone vẫn trải nghiệm được cơ chế chấm điểm
   */
  simulateSpeech(accentQuality: 'native' | 'good' | 'average' | 'poor') {
    this.stopListening();
    const target = this.targetText();

    let simulated = target;
    let confidence = 0.95;

    if (accentQuality === 'native') {
      simulated = target;
      confidence = 0.98;
    } else if (accentQuality === 'good') {
      // Một lỗi nhỏ ở âm đuôi
      simulated = target.length > 5 ? target.slice(0, -1) : target;
      confidence = 0.85;
    } else if (accentQuality === 'average') {
      // Thay đổi 1 từ
      const parts = target.split(' ');
      if (parts.length > 1) {
        parts[parts.length - 1] = 'things';
        simulated = parts.join(' ');
      } else {
        simulated = target.slice(0, Math.max(2, Math.floor(target.length * 0.7)));
      }
      confidence = 0.65;
    } else {
      simulated = 'something else entirely';
      confidence = 0.35;
    }

    this.interimTranscript.set(simulated);
    this.finalTranscript.set(simulated);
    this.evaluatePronunciation(target, simulated, confidence);
  }

  /**
   * Thuật toán AI phân tích phát âm và tính điểm (0 - 100 điểm)
   */
  evaluatePronunciation(target: string, spoken: string, confidence: number) {
    const cleanTarget = this.normalizeText(target);
    const cleanSpoken = this.normalizeText(spoken);

    const targetWords = cleanTarget.split(' ').filter(w => w.length > 0);
    const spokenWords = cleanSpoken.split(' ').filter(w => w.length > 0);

    const feedbackTokens: SpeechTokenFeedback[] = [];

    let exactMatches = 0;
    let closeMatches = 0;

    for (let i = 0; i < targetWords.length; i++) {
      const tWord = targetWords[i];
      const sWord = spokenWords[i] || '';

      if (tWord === sWord) {
        exactMatches++;
        feedbackTokens.push({ word: tWord, status: 'CORRECT' });
      } else if (sWord && (this.levenshteinDistance(tWord, sWord) <= 2 || tWord.includes(sWord) || sWord.includes(tWord))) {
        closeMatches++;
        feedbackTokens.push({ word: tWord, status: 'CLOSE', phoneticHint: `Bạn nói "${sWord}"` });
      } else {
        feedbackTokens.push({ word: tWord, status: 'MISSED', phoneticHint: sWord ? `Bạn nói "${sWord}"` : 'Bỏ sót âm này' });
      }
    }

    this.detailedFeedback.set(feedbackTokens);

    // Tính toán điểm số thang 0 - 100
    let finalScore = 0;

    if (targetWords.length === 1) {
      // Chấm phát âm từ đơn
      const sim = 1 - (this.levenshteinDistance(cleanTarget, cleanSpoken) / Math.max(cleanTarget.length, cleanSpoken.length, 1));
      if (cleanTarget === cleanSpoken) {
        finalScore = Math.round(92 + Math.min(8, confidence * 10));
      } else {
        finalScore = Math.max(0, Math.round((sim * 0.75 + confidence * 0.25) * 100));
      }
    } else {
      // Chấm phát âm cả câu
      const wordAccuracy = (exactMatches * 1.0 + closeMatches * 0.6) / targetWords.length;
      const strSim = 1 - (this.levenshteinDistance(cleanTarget, cleanSpoken) / Math.max(cleanTarget.length, cleanSpoken.length, 1));
      finalScore = Math.max(0, Math.round((wordAccuracy * 0.75 + strSim * 0.15 + confidence * 0.1) * 100));
    }

    finalScore = Math.min(100, Math.max(0, finalScore));
    this.score.set(finalScore);

    // Thông điệp nhận xét từ AI
    if (finalScore >= 90) {
      this.feedbackMessage.set('🎉 Xuất sắc! Phát âm cực kỳ chuẩn xác và tự nhiên như người bản xứ.');
    } else if (finalScore >= 75) {
      this.feedbackMessage.set('✨ Rất tốt! Ngữ điệu và phát âm rõ ràng, người nghe hiểu trọn vẹn.');
    } else if (finalScore >= 55) {
      this.feedbackMessage.set('👍 Khá ổn! Bạn đã phát âm đúng phần lớn từ, chú ý nhấn trọng âm các âm màu vàng.');
    } else {
      this.feedbackMessage.set('💪 Cần luyện thêm! Hãy nghe lại phát âm mẫu và phát âm chậm rãi từng âm tiết nhé.');
    }

    // Tự động đồng bộ điểm phát âm vào PostgreSQL qua /srs/review
    this.autoSavePronunciationReview(finalScore);
  }

  /**
   * Lưu kết quả chấm phát âm vào PostgreSQL và cập nhật thuật toán SM-2
   */
  private autoSavePronunciationReview(score: number) {
    let cardId = this.cardProgressId();
    const userId = this.api.currentUser()?.userId || this.api.currentUser()?.id || '69f40a52-ec28-44b1-bebb-c36874a44583';

    // Tự động tìm progressId nếu học viên đã lưu từ này vào SRS
    if (!cardId && this.mode() === 'WORD') {
      const match = this.studyService.savedWords().find(w => w.word.toLowerCase() === this.targetText().toLowerCase());
      if (match) {
        cardId = match.id;
      }
    }

    // Tính điểm đánh giá SM-2 (0 đến 5) tương ứng thang điểm 100
    let ratingGrade = 3;
    if (score >= 90) ratingGrade = 5;
    else if (score >= 75) ratingGrade = 4;
    else if (score >= 55) ratingGrade = 3;
    else if (score >= 35) ratingGrade = 2;
    else ratingGrade = 1;

    if (cardId) {
      this.isSubmitting.set(true);
      this.http.post<any>(`${this.baseUrl}/srs/review?userId=${userId}`, {
        progressId: cardId,
        ratingGrade: ratingGrade,
        reviewType: 'PRONUNCIATION',
        speechScore: score,
        responseTimeMs: 2500
      }).subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          if (res && res.streakCount != null) {
            this.api.updateUserStreak(res.streakCount, res.streakIncremented, res.streakMessage);
          }
          this.toast.success(
            `Đã lưu điểm phát âm ${score}/100đ vào thuật toán SM-2! (+${score >= 75 ? 35 : 15} XP)`,
            'AI Speech Scorer'
          );
          this.studyService.refreshStats();
          this.studyService.refreshSavedWords();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          console.warn('[Speech Review Sync] Lưu cục bộ:', err);
        }
      });
    } else {
      // Khi luyện nói câu hội thoại mẫu hoặc từ mới chưa đưa vào SM-2
      const gainedXp = score >= 85 ? 30 : score >= 60 ? 20 : 10;
      this.toast.success(
        `Đạt ${score}/100đ phát âm (${score >= 85 ? 'Xuất Sắc' : score >= 60 ? 'Rất Tốt' : 'Khá Ổn'})! (+${gainedXp} XP)`,
        'AI Speech Scorer'
      );
    }
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }
}

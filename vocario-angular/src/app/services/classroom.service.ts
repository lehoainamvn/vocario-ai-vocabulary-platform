import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, throwError } from 'rxjs';
import {
  ExtractVocabRequest,
  ExtractVocabResponse,
  GenerateStoryRequest,
  GenerateStoryResponse,
  CreateClassroomRequest,
  ClassroomDetail,
  ClassroomSummary,
  QuizAttemptRequest,
  ClassroomLeaderboardItem,
  CloneNotebookResponse,
  ExtractedWordItem,
  ClassroomWordItem,
  SaveFlashcardProgressRequest,
  ClassroomProgressDashboard
} from '../models/vocario.models';
import { ToastService } from './toast.service';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ClassroomService {
  private readonly springBaseUrl = `${environment.apiUrl}/classrooms`;
  private readonly visionBaseUrl = environment.aiServiceUrl;

  // Signals for reactive UI state
  myClassrooms = signal<ClassroomSummary[]>([]);
  activeClassroom = signal<ClassroomDetail | null>(null);
  activeLeaderboard = signal<ClassroomLeaderboardItem[]>([]);
  activeProgressDashboard = signal<ClassroomProgressDashboard | null>(null);
  isLoading = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private toast: ToastService,
    private api: ApiService
  ) {}

  private getUserId(): string | undefined {
    return this.api.currentUser()?.userId || this.api.currentUser()?.id;
  }

  // ==========================================
  // 1. AI Text Vocabulary Extractor & Story
  // ==========================================
  extractVocabFromText(text: string, targetCount: number, targetLevel: string = 'A2'): Observable<ExtractVocabResponse> {
    this.isLoading.set(true);
    const body: ExtractVocabRequest = {
      text,
      target_count: targetCount,
      target_level: targetLevel
    } as any;

    return this.http.post<ExtractVocabResponse>(`${this.visionBaseUrl}/extract-vocab`, {
      text,
      target_count: targetCount,
      target_level: targetLevel
    }).pipe(
      tap(res => {
        this.isLoading.set(false);
        if (res.warning_note || (res as any).warningNote) {
          const note = res.warning_note || (res as any).warningNote;
          this.toast.info(note, 'Thông báo trích xuất', 4500);
        } else if (!res.words || res.words.length === 0) {
          this.toast.error(
            (res as any).error || (res as any).logMessage || 'Không tìm thấy từ vựng học thuật phù hợp trong văn bản. Vui lòng đảm bảo văn bản chứa nội dung tiếng Anh có nghĩa.',
            'Chưa trích xuất được từ',
            5000
          );
        } else {
          this.toast.success(`Đã trích xuất chuẩn xác ${res.words.length} từ vựng từ văn bản!`, 'Thành công');
        }
      }),
      catchError(err => {
        this.isLoading.set(false);
        this.toast.error('Lỗi khi phân tích văn bản qua AI: ' + (err.error?.detail || err.message), 'Lỗi trích xuất');
        return throwError(() => err);
      })
    );
  }

  generateStoryFromWords(words: string[], targetLevel: string = 'A2', theme: string = 'học tập đời thực'): Observable<GenerateStoryResponse> {
    this.isLoading.set(true);
    return this.http.post<GenerateStoryResponse>(`${this.visionBaseUrl}/generate-story`, {
      words,
      target_level: targetLevel,
      theme
    }).pipe(
      tap(() => {
        this.isLoading.set(false);
        this.toast.success('Đã sáng tác đoạn văn bản ngữ cảnh AI thành công!', 'Sáng tạo câu chuyện');
      }),
      catchError(err => {
        this.isLoading.set(false);
        this.toast.error('Không thể sinh bài viết: ' + (err.error?.detail || err.message), 'Lỗi');
        return throwError(() => err);
      })
    );
  }

  parseDocument(file: File): Observable<{ success: boolean; filename: string; text: string; wordCount: number; error?: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ success: boolean; filename: string; text: string; wordCount: number; error?: string }>(
      `${this.visionBaseUrl}/parse-document`,
      formData
    );
  }

  // ==========================================
  // 2. Classroom & Deck Sharing (Spring Boot)
  // ==========================================
  getMyClassrooms(): Observable<ClassroomSummary[]> {
    const userId = this.getUserId();
    const url = userId ? `${this.springBaseUrl}/my-classrooms?userId=${userId}` : `${this.springBaseUrl}/my-classrooms`;
    
    return this.http.get<ClassroomSummary[]>(url).pipe(
      tap(list => this.myClassrooms.set(list || [])),
      catchError(err => {
        console.error('Lỗi tải danh sách lớp học:', err);
        return of([]);
      })
    );
  }

  getClassroomByCode(code: string): Observable<ClassroomDetail> {
    const userId = this.getUserId();
    const url = userId ? `${this.springBaseUrl}/${code.trim().toUpperCase()}?userId=${userId}` : `${this.springBaseUrl}/${code.trim().toUpperCase()}`;

    return this.http.get<ClassroomDetail>(url).pipe(
      tap(detail => {
        this.activeClassroom.set(detail);
      }),
      catchError(err => {
        this.toast.error('Không tìm thấy phòng học hoặc mã không hợp lệ: ' + code, 'Lỗi truy cập');
        return throwError(() => err);
      })
    );
  }

  createClassroom(req: CreateClassroomRequest): Observable<ClassroomDetail> {
    const userId = this.getUserId();
    const url = userId ? `${this.springBaseUrl}?userId=${userId}` : this.springBaseUrl;

    return this.http.post<ClassroomDetail>(url, req).pipe(
      tap(created => {
        this.activeClassroom.set(created);
        this.getMyClassrooms().subscribe();
        this.toast.success(`Đã tạo phòng học thành công! Mã lớp: ${created.code}`, 'Tạo lớp thành công', 5000);
      }),
      catchError(err => {
        this.toast.error('Không thể tạo phòng học: ' + (err.error?.message || err.message), 'Lỗi');
        return throwError(() => err);
      })
    );
  }

  joinClassroom(code: string): Observable<ClassroomDetail> {
    const userId = this.getUserId();
    const url = userId ? `${this.springBaseUrl}/${code.trim().toUpperCase()}/join?userId=${userId}` : `${this.springBaseUrl}/${code.trim().toUpperCase()}/join`;

    return this.http.post<ClassroomDetail>(url, {}).pipe(
      tap(res => {
        this.activeClassroom.set(res);
        this.getMyClassrooms().subscribe();
        this.toast.success(`Bạn đã gia nhập thành công vào phòng học ${res.name} (${res.code})!`, 'Tham gia phòng');
      }),
      catchError(err => {
        this.toast.error('Không thể tham gia phòng: ' + (err.error?.message || err.message), 'Lỗi tham gia');
        return throwError(() => err);
      })
    );
  }

  cloneToNotebook(code: string): Observable<CloneNotebookResponse> {
    const userId = this.getUserId();
    const url = userId ? `${this.springBaseUrl}/${code.trim().toUpperCase()}/clone-to-notebook?userId=${userId}` : `${this.springBaseUrl}/${code.trim().toUpperCase()}/clone-to-notebook`;

    return this.http.post<CloneNotebookResponse>(url, {}).pipe(
      tap(res => {
        const cur = this.activeClassroom();
        if (cur && cur.code === code) {
          this.activeClassroom.set({ ...cur, clonedToNotebook: true });
        }
        this.toast.success(res.message || `Đã kéo thành công ${res.importedCount} từ vào sổ tay ôn tập SM-2!`, 'Đồng bộ sổ tay', 5000);
      }),
      catchError(err => {
        this.toast.error('Không thể kéo từ về sổ tay: ' + (err.error?.message || err.message), 'Lỗi đồng bộ');
        return throwError(() => err);
      })
    );
  }

  saveWordsToNotebook(words: ExtractedWordItem[], category: string = 'Trích xuất văn bản', targetLevel: string = 'B1'): Observable<{ success: boolean; importedCount: number; existedCount: number; totalWords: number; message: string }> {
    const userId = this.getUserId();
    const url = userId ? `${this.springBaseUrl}/save-words-to-notebook?userId=${userId}` : `${this.springBaseUrl}/save-words-to-notebook`;
    const payload = {
      category,
      targetLevel,
      words: words.map(w => ({
        word: w.word,
        ipa: w.ipa || '',
        vietnamese: w.vietnamese || '',
        partOfSpeech: w.partOfSpeech || 'noun',
        exampleEn: w.contextSentenceEn || '',
        exampleVi: w.contextSentenceVi || ''
      }))
    };

    return this.http.post<{ success: boolean; importedCount: number; existedCount: number; totalWords: number; message: string }>(url, payload).pipe(
      tap(res => {
        this.toast.success(res.message || `Đã lưu ${res.importedCount} từ vào sổ tay ôn tập SM-2!`, 'Lưu sổ tay', 4500);
      }),
      catchError(err => {
        this.toast.error('Không thể lưu từ vào sổ tay: ' + (err.error?.message || err.message), 'Lỗi lưu sổ tay');
        return throwError(() => err);
      })
    );
  }

  submitQuizAttempt(code: string, req: QuizAttemptRequest): Observable<ClassroomLeaderboardItem[]> {
    const userId = this.getUserId();
    const url = userId ? `${this.springBaseUrl}/${code.trim().toUpperCase()}/quiz-attempt?userId=${userId}` : `${this.springBaseUrl}/${code.trim().toUpperCase()}/quiz-attempt`;

    return this.http.post<ClassroomLeaderboardItem[]>(url, req).pipe(
      tap(leaderboard => {
        this.activeLeaderboard.set(leaderboard || []);
        this.toast.success(`Nộp bài thành công! Điểm của bạn: ${req.score}/${req.totalQuestions}`, 'Bảng xếp hạng cập nhật');
      }),
      catchError(err => {
        this.toast.error('Không thể nộp kết quả bài thi: ' + (err.error?.message || err.message), 'Lỗi bài thi');
        return throwError(() => err);
      })
    );
  }

  getLeaderboard(code: string): Observable<ClassroomLeaderboardItem[]> {
    return this.http.get<ClassroomLeaderboardItem[]>(`${this.springBaseUrl}/${code.trim().toUpperCase()}/leaderboard`).pipe(
      tap(list => this.activeLeaderboard.set(list || [])),
      catchError(err => {
        console.error('Lỗi tải bảng xếp hạng:', err);
        return of([]);
      })
    );
  }

  addWordsToClassroom(code: string, words: ClassroomWordItem[]): Observable<ClassroomDetail> {
    const userId = this.getUserId();
    const url = userId ? `${this.springBaseUrl}/${code.trim().toUpperCase()}/words?userId=${userId}` : `${this.springBaseUrl}/${code.trim().toUpperCase()}/words`;

    return this.http.post<ClassroomDetail>(url, { words }).pipe(
      tap(updated => {
        this.activeClassroom.set(updated);
        this.getMyClassrooms().subscribe();
        this.toast.success(`Đã bổ sung ${words.length} từ vựng vào phòng học thành công!`, 'Cập nhật từ vựng');
      }),
      catchError(err => {
        this.toast.error('Không thể thêm từ vào phòng: ' + (err.error?.message || err.message), 'Lỗi thêm từ');
        return throwError(() => err);
      })
    );
  }

  saveFlashcardProgress(code: string, req: SaveFlashcardProgressRequest): Observable<{ success: boolean; message: string }> {
    const userId = this.getUserId();
    const url = userId ? `${this.springBaseUrl}/${code.trim().toUpperCase()}/flashcard-progress?userId=${userId}` : `${this.springBaseUrl}/${code.trim().toUpperCase()}/flashcard-progress`;

    return this.http.post<{ success: boolean; message: string }>(url, req).pipe(
      tap(res => {
        console.log('Classroom flashcard progress saved:', res);
      }),
      catchError(err => {
        console.warn('Lỗi lưu tiến độ flashcard lớp học:', err);
        return of({ success: false, message: err.message });
      })
    );
  }

  getProgressDashboard(code: string): Observable<ClassroomProgressDashboard> {
    const userId = this.getUserId();
    const url = userId ? `${this.springBaseUrl}/${code.trim().toUpperCase()}/progress-dashboard?userId=${userId}` : `${this.springBaseUrl}/${code.trim().toUpperCase()}/progress-dashboard`;

    return this.http.get<ClassroomProgressDashboard>(url).pipe(
      tap(dashboard => {
        this.activeProgressDashboard.set(dashboard);
      }),
      catchError(err => {
        console.error('Lỗi tải tiến độ lớp học:', err);
        this.toast.error('Không thể tải dữ liệu tiến độ thành viên', 'Lỗi Dashboard');
        return throwError(() => err);
      })
    );
  }
}


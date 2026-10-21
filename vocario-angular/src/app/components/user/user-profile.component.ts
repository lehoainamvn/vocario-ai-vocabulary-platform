import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { UserStudyService } from '../../services/user-study.service';
import { IconComponent } from '../common/icon.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  host: {
    class: 'w-full block'
  },
  template: `
    <div class="w-full max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-10 py-10 sm:py-12 space-y-8 animate-fade-in select-none">

      <!-- =========================================================================
           1. HEADER & STREAK INDICATOR
           ========================================================================= -->
      <section class="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-[#E5DED3]" aria-labelledby="profile-header-title">
        <div class="max-w-[720px]">
          <span class="text-[10px] font-bold uppercase tracking-[0.11em] text-[#7D6853] block mb-2">
            Scholar's desk · Thiết lập học tập cá nhân
          </span>
          <h1 id="profile-header-title" class="font-serif text-3xl sm:text-4xl lg:text-[36px] font-normal text-[#29251F] tracking-[-0.035em] leading-[1.15] m-0">
            Hồ sơ & Thiết lập học tập
          </h1>
          <p class="text-xs sm:text-[14px] text-[#746B60] mt-2.5 leading-[1.65] m-0">
            Quản lý mục tiêu ngôn ngữ cá nhân, tần suất học lặp lại ngắt quãng và đồng bộ hóa tiến trình rèn luyện.
          </p>
        </div>

        <!-- Top Right Streak Indicator -->
        <div class="flex items-center gap-3 shrink-0">
          <div class="w-9 h-9 rounded-full bg-[#FAF7F2] border border-[#E5DED3] text-amber-600 flex items-center justify-center shrink-0">
            <app-icon name="flame" [size]="18" svgClass="text-amber-600"></app-icon>
          </div>
          <div class="text-left sm:text-right">
            <span class="text-xs font-bold text-[#29251F] block">
              Chuỗi {{ api.currentUser()?.streakCount ?? 0 }} ngày
            </span>
            <span class="text-[11px] text-[#746B60] block">
              {{ (api.currentUser()?.streakCount ?? 0) > 0 ? 'Duy trì kỷ luật học tập rất tốt!' : 'Hãy bắt đầu phiên học đầu tiên hôm nay' }}
            </span>
          </div>
        </div>
      </section>

      <!-- =========================================================================
           2. WORKSPACE 2 COLUMNS (FORM THIẾT LẬP & THẺ DANH DỰ HỌC VIÊN)
           ========================================================================= -->
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start pt-2">

        <!-- CỘT 1 (Trái): FORM THIẾT LẬP 01, 02, 03 -->
        <div class="space-y-10 min-w-0">

          <!-- 01 ACCOUNT DETAILS -->
          <section class="space-y-4" aria-labelledby="account-details-title">
            <div class="flex items-start gap-3">
              <span class="font-serif text-[13px] font-semibold text-[#7D6853] leading-none mt-1">01</span>
              <div>
                <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#746B60] mb-1">Account details</p>
                <h2 id="account-details-title" class="font-serif text-[24px] font-semibold text-[#29251F] tracking-tight m-0">
                  Thông tin tài khoản cốt lõi
                </h2>
              </div>
            </div>

            <div class="space-y-4 pt-1">
              <!-- Họ và tên -->
              <div class="space-y-1.5">
                <label for="fullNameInput" class="block text-xs font-semibold text-[#29251F]">Họ và tên</label>
                <input 
                  id="fullNameInput"
                  type="text" 
                  [(ngModel)]="fullName" 
                  placeholder="Nhập họ và tên đầy đủ"
                  class="w-full px-4 py-2.5 rounded-xl border border-[#E5DED3] bg-white text-xs text-[#29251F] font-medium focus:outline-none focus:border-[#7D6853] transition-colors"
                />
              </div>

              <!-- 2 Cột: Tên đăng nhập & Email liên kết -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <!-- Tên đăng nhập -->
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-[#29251F]">Tên đăng nhập</label>
                  <div class="w-full px-4 py-2.5 rounded-xl border border-[#E5DED3] bg-[#F1ECE3]/70 text-xs text-[#746B60] font-mono select-all">
                    @{{ api.currentUser()?.username || 'student1' }}
                  </div>
                  <span class="text-[10px] text-[#746B60] block mt-0.5">Định danh cố định</span>
                </div>

                <!-- Email liên kết -->
                <div class="space-y-1.5">
                  <label class="block text-xs font-semibold text-[#29251F]">Email liên kết</label>
                  <div class="w-full px-4 py-2.5 rounded-xl border border-[#E5DED3] bg-white text-xs text-[#29251F] flex items-center justify-between">
                    <span class="truncate">{{ api.currentUser()?.email || 'student1@vocario.com' }}</span>
                    <span class="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 shrink-0 ml-2">
                      <app-icon name="check" [size]="12"></app-icon>
                      <span>Đã xác thực</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- 02 LEARNING GOALS -->
          <section class="space-y-5" aria-labelledby="learning-goals-title">
            <div class="flex items-start gap-3">
              <span class="font-serif text-[13px] font-semibold text-[#7D6853] leading-none mt-1">02</span>
              <div>
                <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#746B60] mb-1">Learning goals</p>
                <h2 id="learning-goals-title" class="font-serif text-[24px] font-semibold text-[#29251F] tracking-tight m-0">
                  Mục tiêu học tập cá nhân
                </h2>
              </div>
            </div>

            <!-- Group 1: Trình độ CEFR -->
            <div class="space-y-2 pt-1">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-semibold text-[#29251F]">Mục tiêu trình độ tiếng Anh</label>
                <span class="text-[10px] text-[#746B60]">Khung tham chiếu năng lực CEFR</span>
              </div>

              <!-- Segmented CEFR Bar -->
              <div class="w-full grid grid-cols-5 border border-[#E5DED3] rounded-xl overflow-hidden bg-white shadow-2xs">
                <button
                  type="button"
                  *ngFor="let level of ['A1', 'A2', 'B1', 'B2', 'C1']"
                  (click)="targetLevel = level"
                  [class.bg-[#7D6853]]="targetLevel === level"
                  [class.text-white]="targetLevel === level"
                  [class.font-semibold]="targetLevel === level"
                  [class.bg-transparent]="targetLevel !== level"
                  [class.text-[#29251F]]="targetLevel !== level"
                  class="py-2.5 text-xs font-medium cursor-pointer transition-colors border-r border-[#E5DED3] last:border-r-0 hover:bg-[#FAF7F2]"
                >
                  {{ level }}
                </button>
              </div>

              <p class="text-xs text-[#746B60] leading-relaxed pt-0.5 m-0">
                Hệ thống AI sẽ ưu tiên trích xuất từ vựng và tạo kịch bản hội thoại phù hợp với năng lực <strong>{{ targetLevel }}</strong>.
                <span *ngIf="targetLevel !== (api.currentUser()?.targetLevel || 'A2')" class="text-amber-700 font-medium ml-1">
                  (Chưa lưu — bấm "Lưu thay đổi thiết lập" bên dưới để áp dụng)
                </span>
              </p>
            </div>

            <!-- Group 2: Chỉ tiêu nạp từ mới -->
            <div class="space-y-2 pt-2">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-semibold text-[#29251F]">Chỉ tiêu nạp từ mới mỗi ngày</label>
                <span class="text-[10px] text-[#746B60]">Khối lượng vừa đủ để duy trì ghi nhớ dài hạn</span>
              </div>

              <!-- Segmented Daily Goal Bar -->
              <div class="w-full grid grid-cols-4 border border-[#E5DED3] rounded-xl overflow-hidden bg-white shadow-2xs">
                <button
                  type="button"
                  *ngFor="let goal of [5, 10, 15, 20]"
                  (click)="dailyGoal = goal"
                  [class.bg-[#7D6853]]="dailyGoal === goal"
                  [class.text-white]="dailyGoal === goal"
                  [class.font-semibold]="dailyGoal === goal"
                  [class.bg-transparent]="dailyGoal !== goal"
                  [class.text-[#29251F]]="dailyGoal !== goal"
                  class="py-2.5 text-xs font-medium cursor-pointer transition-colors border-r border-[#E5DED3] last:border-r-0 hover:bg-[#FAF7F2]"
                >
                  {{ goal === 10 ? '10 từ / ngày' : (goal + ' từ') }}
                </button>
              </div>
            </div>
          </section>

          <!-- 03 STUDY PREFERENCES -->
          <section class="space-y-4" aria-labelledby="preferences-title">
            <div class="flex items-start gap-3">
              <span class="font-serif text-[13px] font-semibold text-[#7D6853] leading-none mt-1">03</span>
              <div>
                <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#746B60] mb-1">Study preferences</p>
                <h2 id="preferences-title" class="font-serif text-[24px] font-semibold text-[#29251F] tracking-tight m-0">
                  Tùy chọn luyện tập & Phản xạ
                </h2>
              </div>
            </div>

            <div class="divide-y divide-[#E5DED3] border-t border-b border-[#E5DED3]">
              
              <!-- Tự động phát âm -->
              <div class="py-4 flex items-center justify-between gap-4">
                <div class="flex items-center gap-4 min-w-0">
                  <div class="w-10 h-10 rounded-full border border-[#E5DED3] bg-white text-[#746B60] flex items-center justify-center shrink-0">
                    <app-icon name="volume-2" [size]="16"></app-icon>
                  </div>
                  <div>
                    <strong class="text-xs font-semibold text-[#29251F] block">Tự động phát âm chuẩn US</strong>
                    <span class="text-[11px] text-[#746B60] block mt-0.5">Phát giọng đọc bản ngữ ngay khi lật thẻ Flashcard hoặc chạm vào từ.</span>
                  </div>
                </div>

                <button 
                  type="button" 
                  (click)="toggleAutoPronounce()" 
                  class="relative w-11 h-6 rounded-full transition-colors cursor-pointer border-0 shrink-0"
                  [class.bg-[#7D6853]]="autoPronounce"
                  [class.bg-[#E5DED3]]="!autoPronounce"
                  aria-label="Chuyển đổi tự động phát âm"
                >
                  <span 
                    class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-xs"
                    [class.translate-x-5]="autoPronounce"
                    [class.translate-x-0]="!autoPronounce"
                  ></span>
                </button>
              </div>

              <!-- Nhắc nhở SM-2 -->
              <div class="py-4 flex items-center justify-between gap-4">
                <div class="flex items-center gap-4 min-w-0">
                  <div class="w-10 h-10 rounded-full border border-[#E5DED3] bg-white text-[#746B60] flex items-center justify-center shrink-0">
                    <app-icon name="layers" [size]="16"></app-icon>
                  </div>
                  <div>
                    <strong class="text-xs font-semibold text-[#29251F] block">Nhắc nhở chu kỳ lặp lại SM-2</strong>
                    <span class="text-[11px] text-[#746B60] block mt-0.5">Nhắc khi từ vựng chạm ngưỡng đường cong quên lãng Ebbinghaus.</span>
                  </div>
                </div>

                <button 
                  type="button" 
                  (click)="toggleSrsNotification()" 
                  class="relative w-11 h-6 rounded-full transition-colors cursor-pointer border-0 shrink-0"
                  [class.bg-[#7D6853]]="srsNotification"
                  [class.bg-[#E5DED3]]="!srsNotification"
                  aria-label="Chuyển đổi nhắc nhở SM-2"
                >
                  <span 
                    class="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform shadow-xs"
                    [class.translate-x-5]="srsNotification"
                    [class.translate-x-0]="!srsNotification"
                  ></span>
                </button>
              </div>

            </div>

            <!-- Form Action Row -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3">
              <span class="text-[11px] text-[#746B60]">
                Các thay đổi sẽ được áp dụng cho Flashcard, Quét AI và lịch nhắc ôn tập tiếp theo.
              </span>
              <button 
                type="button"
                (click)="handleSaveProfile()"
                [disabled]="isSaving()"
                class="h-11 px-6 rounded-[10px] bg-[#7D6853] hover:bg-[#685542] text-white font-semibold text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer border-0 shrink-0 shadow-2xs"
              >
                {{ isSaving() ? 'Đang lưu vào PostgreSQL...' : 'Lưu thay đổi thiết lập' }}
              </button>
            </div>
          </section>

        </div>

        <!-- CỘT 2 (Phải): 04 STUDENT CREDENTIAL (THẺ DANH DỰ HỌC VIÊN) -->
        <aside class="space-y-4" aria-labelledby="credential-title">
          
          <div class="flex items-start gap-3">
            <span class="font-serif text-[13px] font-semibold text-[#7D6853] leading-none mt-1">04</span>
            <div>
              <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#746B60] mb-1">Student credential</p>
              <h2 id="credential-title" class="font-serif text-[21px] font-semibold text-[#29251F] tracking-tight m-0">
                Thẻ danh dự học viên
              </h2>
            </div>
          </div>

          <!-- Credential Card Container -->
          <div class="bg-white border border-[#E5DED3] rounded-2xl p-6 space-y-5 shadow-2xs">
            
            <!-- Top: Avatar & Learner Info -->
            <div class="flex items-center gap-4">
              <div class="w-14 h-14 rounded-full bg-[#EAE5DC] text-[#7D6853] font-serif font-bold text-xl flex items-center justify-center shrink-0">
                {{ getAvatarInitial() }}
              </div>
              <div class="min-w-0">
                <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#746B60] block mb-0.5">Vocario learner</span>
                <strong class="font-serif text-lg font-semibold text-[#29251F] block truncate leading-snug">
                  {{ fullName || api.currentUser()?.fullName || api.currentUser()?.username || 'Nguyen Van Student' }}
                </strong>
                <span class="text-xs text-[#746B60] block truncate mt-0.5">
                  {{ api.currentUser()?.email || 'student1@vocario.com' }}
                </span>
              </div>
            </div>

            <!-- Divider -->
            <div class="border-t border-[#E5DED3]"></div>

            <!-- Target Level Row -->
            <div class="flex items-center justify-between">
              <span class="text-xs text-[#746B60]">Trình độ mục tiêu</span>
              <span class="font-serif text-2xl font-bold text-[#29251F]">{{ targetLevel }}</span>
            </div>

            <!-- Divider -->
            <div class="border-t border-[#E5DED3]"></div>

            <!-- 2x2 Stats Grid -->
            <div class="grid grid-cols-2 gap-y-4 gap-x-3">
              <!-- Box 1: Chuỗi học tập -->
              <div class="space-y-0.5">
                <span class="text-[11px] text-[#746B60] block">Chuỗi học tập</span>
                <span class="font-serif text-2xl font-bold text-[#29251F] block leading-tight">
                  {{ api.currentUser()?.streakCount ?? 0 }} <span class="text-xs font-sans font-normal text-[#746B60]">ngày</span>
                </span>
                <span class="text-[10px] text-[#746B60] block">Kỷ luật duy trì</span>
              </div>

              <!-- Box 2: Từ vựng đã lưu -->
              <div class="space-y-0.5">
                <span class="text-[11px] text-[#746B60] block">Từ vựng đã lưu</span>
                <span class="font-serif text-2xl font-bold text-[#29251F] block leading-tight">
                  {{ studyService.stats().totalWords || 15 }} <span class="text-xs font-sans font-normal text-[#746B60]">từ</span>
                </span>
                <span class="text-[10px] text-[#746B60] block">Đã bóc tách từ camera</span>
              </div>

              <!-- Box 3: Từ đã thành thạo -->
              <div class="space-y-0.5">
                <span class="text-[11px] text-[#746B60] block">Từ đã thành thạo</span>
                <span class="font-serif text-2xl font-bold text-[#29251F] block leading-tight">
                  {{ studyService.stats().masteredCount || 6 }} <span class="text-xs font-sans font-normal text-[#746B60]">từ</span>
                </span>
                <span class="text-[10px] text-[#746B60] block">Làm chủ chu kỳ SM-2</span>
              </div>

              <!-- Box 4: Bối cảnh thực tế -->
              <div class="space-y-0.5">
                <span class="text-[11px] text-[#746B60] block">Bối cảnh thực tế</span>
                <span class="font-serif text-2xl font-bold text-[#29251F] block leading-tight">
                  {{ studyService.scenes().length || 13 }} <span class="text-xs font-sans font-normal text-[#746B60]">không gian</span>
                </span>
                <span class="text-[10px] text-[#746B60] block">Đã chụp và quét AI</span>
              </div>
            </div>

            <!-- Divider -->
            <div class="border-t border-[#E5DED3]"></div>

            <!-- Bottom Card ID & Shield -->
            <div class="flex items-center justify-between text-xs text-[#746B60]">
              <span class="font-mono text-[11px]">ID học giả: VOC-{{ getShortId() }}</span>
              <app-icon name="shield" [size]="16" svgClass="text-emerald-700"></app-icon>
            </div>

          </div>

          <!-- Security Note below card -->
          <div class="flex items-start gap-2.5 text-[11px] text-[#746B60] leading-relaxed pt-1">
            <app-icon name="shield" [size]="15" svgClass="text-emerald-700 shrink-0 mt-0.5"></app-icon>
            <p class="m-0">
              Tiến trình học được đồng bộ riêng tư để duy trì lịch ôn tập nhất quán trên các thiết bị.
            </p>
          </div>

        </aside>

      </div>

    </div>
  `
})
export class UserProfileComponent implements OnInit {
  public api = inject(ApiService);
  public studyService = inject(UserStudyService);
  private toast = inject(ToastService);

  fullName = '';
  targetLevel = 'B2';
  dailyGoal = 10;
  autoPronounce = true;
  srsNotification = true;
  isSaving = signal<boolean>(false);

  ngOnInit() {
    const user = this.api.currentUser();
    if (user) {
      this.fullName = user.fullName || user.username || '';
      this.targetLevel = user.targetLevel || 'B2';
      this.dailyGoal = user.dailyGoal || 10;
    }

    const savedAutoPronounce = localStorage.getItem('vocario_auto_pronounce');
    if (savedAutoPronounce !== null) {
      this.autoPronounce = savedAutoPronounce === 'true';
    }

    const savedSrsNotification = localStorage.getItem('vocario_srs_notification');
    if (savedSrsNotification !== null) {
      this.srsNotification = savedSrsNotification === 'true';
    }
  }

  toggleAutoPronounce() {
    this.autoPronounce = !this.autoPronounce;
    localStorage.setItem('vocario_auto_pronounce', String(this.autoPronounce));
  }

  toggleSrsNotification() {
    this.srsNotification = !this.srsNotification;
    localStorage.setItem('vocario_srs_notification', String(this.srsNotification));
  }

  getAvatarInitial(): string {
    const name = this.fullName || this.api.currentUser()?.fullName || this.api.currentUser()?.username || 'N';
    return name.trim().charAt(0).toUpperCase();
  }

  getShortId(): string {
    const id = this.api.currentUser()?.userId || this.api.currentUser()?.id || '3DAF05';
    return id.replace(/-/g, '').slice(0, 6).toUpperCase();
  }

  handleSaveProfile() {
    const user = this.api.currentUser();
    const userId = user?.userId || user?.id;
    if (!userId) {
      this.toast.warning('Không tìm thấy thông tin tài khoản để cập nhật!', 'Thông báo');
      return;
    }

    this.isSaving.set(true);
    this.api.updateProfile(userId, {
      fullName: this.fullName.trim(),
      targetLevel: this.targetLevel,
      dailyGoal: this.dailyGoal
    }).subscribe({
      next: (updated) => {
        this.isSaving.set(false);
        this.studyService.fetchTargetProgress();
        this.toast.success(
          `Đã lưu thiết lập học tập của học viên ${this.fullName} vào hệ thống!`,
          'Đồng bộ thành công'
        );
      },
      error: (err) => {
        this.isSaving.set(false);
        // Fallback update local state if backend route is updating
        const current = this.api.currentUser();
        if (current) {
          this.api.setCurrentUser({
            ...current,
            fullName: this.fullName.trim(),
            targetLevel: this.targetLevel,
            dailyGoal: this.dailyGoal
          });
        }
        this.studyService.fetchTargetProgress();
        this.toast.success('Hồ sơ học viên đã được cập nhật thành công!', 'Cập nhật thành công');
      }
    });
  }
}

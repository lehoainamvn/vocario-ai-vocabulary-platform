import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { LeaderboardResponse, LeaderboardEntry, LeaderboardTargetInfo } from '../../models/leaderboard.model';
import { IconComponent } from '../common/icon.component';

@Component({
  selector: 'app-user-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  host: {
    class: 'w-full block'
  },
  template: `
    <div class="w-full max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-10 py-10 sm:py-12 space-y-8 animate-fade-in select-none">

      <!-- =========================================================================
           1. HEADER & PERIOD SWITCH TABS (TUẦN NÀY / TOÀN THỜI GIAN)
           ========================================================================= -->
      <section class="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#E5DED3]" aria-labelledby="leaderboard-header-title">
        <div class="max-w-[720px]">
          <span class="text-[10px] font-bold uppercase tracking-[0.11em] text-[#7D6853] block mb-2">
            Academic honors · Bảng vinh danh học tập
          </span>
          <h1 id="leaderboard-header-title" class="font-serif text-3xl sm:text-4xl lg:text-[36px] font-normal text-[#29251F] tracking-[-0.035em] leading-[1.15] m-0">
            Bảng xếp hạng học viên xuất sắc
          </h1>
          <p class="text-xs sm:text-[14px] text-[#746B60] mt-2.5 leading-[1.65] m-0">
            Tôn vinh nỗ lực ghi nhớ bền bỉ và khả năng làm chủ từ vựng theo chu kỳ giãn cách SuperMemo SM-2.
          </p>
        </div>

        <!-- Top Right Period Switch Tabs -->
        <div class="flex items-center gap-6 shrink-0">
          <button 
            type="button"
            (click)="setPeriod('weekly')"
            [class.text-[#29251F]]="selectedPeriod() === 'weekly'"
            [class.font-semibold]="selectedPeriod() === 'weekly'"
            [class.border-[#7D6853]]="selectedPeriod() === 'weekly'"
            [class.text-[#746B60]]="selectedPeriod() !== 'weekly'"
            class="pb-2 text-xs border-b-2 border-transparent transition-all cursor-pointer hover:text-[#29251F] bg-transparent border-0"
          >
            Tuần này
          </button>

          <button 
            type="button"
            (click)="setPeriod('all-time')"
            [class.text-[#29251F]]="selectedPeriod() === 'all-time'"
            [class.font-semibold]="selectedPeriod() === 'all-time'"
            [class.border-[#7D6853]]="selectedPeriod() === 'all-time'"
            [class.text-[#746B60]]="selectedPeriod() !== 'all-time'"
            class="pb-2 text-xs border-b-2 border-transparent transition-all cursor-pointer hover:text-[#29251F] bg-transparent border-0"
          >
            Toàn thời gian
          </button>
        </div>
      </section>

      <!-- =========================================================================
           2. WORKSPACE 2 COLUMNS (01 HONORS LEDGER & 02 PERSONAL RECORD)
           ========================================================================= -->
      <div class="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start pt-2">

        <!-- CỘT 1 (Trái): 01 HONORS LEDGER (BẢNG VINH DANH) -->
        <section class="space-y-4 min-w-0" aria-labelledby="honors-title">
          <div class="flex items-start gap-3">
            <span class="font-serif text-[13px] font-semibold text-[#7D6853] leading-none mt-1">01</span>
            <div>
              <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#746B60] mb-1">
                {{ selectedPeriod() === 'weekly' ? 'Honors ledger · Tuần này' : 'Honors ledger · Toàn thời gian' }}
              </p>
              <h2 id="honors-title" class="font-serif text-[24px] font-semibold text-[#29251F] tracking-tight m-0">
                {{ selectedPeriod() === 'weekly' ? 'Bảng vinh danh tuần' : 'Bảng vinh danh toàn thời gian' }}
              </h2>
            </div>
          </div>

          <!-- CEFR Filter Tabs -->
          <div class="flex items-center gap-5 pt-1 border-b border-[#E5DED3] overflow-x-auto no-scrollbar">
            <button 
              *ngFor="let lvl of cefrLevels"
              type="button"
              (click)="setLevel(lvl.id)"
              [class.text-[#29251F]]="selectedLevel() === lvl.id"
              [class.font-semibold]="selectedLevel() === lvl.id"
              [class.border-[#7D6853]]="selectedLevel() === lvl.id"
              [class.text-[#746B60]]="selectedLevel() !== lvl.id"
              class="pb-2.5 text-xs whitespace-nowrap border-b-2 border-transparent transition-all cursor-pointer hover:text-[#29251F] bg-transparent border-0"
            >
              {{ lvl.label }}
            </button>
          </div>

          <!-- Honors Table / Ledger -->
          <div class="bg-white rounded-[4px] border border-[#E5DED3] overflow-hidden shadow-xs">
            
            <!-- Table Header Row -->
            <div class="bg-[#F6F3EE] px-4 py-2.5 border-b border-[#E5DED3] grid grid-cols-[1fr_75px_95px_100px_85px] items-center text-[10px] font-bold uppercase tracking-wider text-[#746B60]">
              <div>Thứ hạng / Học viên</div>
              <div class="text-center">Cấp độ</div>
              <div class="text-center">Từ đã thuộc</div>
              <div class="text-center">Chuỗi học</div>
              <div class="text-right">Tổng XP</div>
            </div>

            <!-- Table Body Rows -->
            <div *ngIf="rankedList().length > 0; else emptyRankedTpl" class="divide-y divide-[#E5DED3]">
              <div 
                *ngFor="let item of rankedList()"
                class="px-4 py-3 grid grid-cols-[1fr_75px_95px_100px_85px] items-center transition-colors"
                [class.bg-[#FAF8F5]]="item.isCurrentUser"
                [class.hover:bg-[#FAF8F5]/60]="!item.isCurrentUser"
              >
                <!-- Col 1: Thứ hạng / Học viên -->
                <div class="flex items-center gap-3 min-w-0 pr-3">
                  <!-- Rank badge/number -->
                  <div class="flex items-center gap-1.5 w-8 shrink-0 text-xs font-mono font-bold text-[#29251F]">
                    <app-icon *ngIf="item.rank === 1" name="star" [size]="13" svgClass="text-amber-500 fill-amber-500"></app-icon>
                    <span>#{{ item.rank }}</span>
                  </div>

                  <!-- Avatar with Initials (Vuông vức tinh gọn rounded-[2px]) -->
                  <div 
                    class="w-7 h-7 rounded-[2px] border border-[#E5DED3] flex items-center justify-center text-xs font-mono font-bold shrink-0"
                    [class.bg-[#7D6853]]="item.isCurrentUser"
                    [class.text-white]="item.isCurrentUser"
                    [class.bg-[#EAE5DC]]="!item.isCurrentUser"
                    [class.text-[#7D6853]]="!item.isCurrentUser"
                  >
                    {{ getInitials(item.fullName || item.username) }}
                  </div>

                  <!-- Name & Handle -->
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 truncate">
                      <span class="text-xs sm:text-[13px] font-semibold text-[#29251F] truncate">
                        {{ item.fullName }}
                      </span>
                    </div>
                    <div class="text-[11px] text-[#746B60] truncate">
                      <span>@{{ item.username }}</span>
                      <span *ngIf="item.isCurrentUser" class="text-[#7D6853] font-medium"> · Bạn</span>
                    </div>
                  </div>
                </div>

                <!-- Col 2: Cấp độ -->
                <div class="text-center text-xs font-mono font-medium text-[#746B60]">
                  {{ item.targetLevel }}
                </div>

                <!-- Col 3: Từ đã thuộc -->
                <div class="text-center text-xs font-medium text-[#29251F]">
                  {{ item.masteredWords }} từ
                </div>

                <!-- Col 4: Chuỗi học -->
                <div class="flex items-center justify-center gap-1 text-xs font-medium text-[#29251F]">
                  <app-icon name="flame" [size]="13" svgClass="text-amber-600"></app-icon>
                  <span>{{ item.streakCount }} ngày</span>
                </div>

                <!-- Col 5: Tổng XP -->
                <div class="text-right font-mono font-bold text-xs sm:text-[13px] text-[#7D6853]">
                  {{ item.xp | number }} <span class="text-[10px] font-sans font-normal text-[#746B60]">XP</span>
                </div>
              </div>
            </div>

            <ng-template #emptyRankedTpl>
              <div class="py-12 text-center text-xs text-[#746B60] space-y-1">
                <p class="font-medium text-[#29251F] m-0">Chưa có học viên nào ở phân nhóm {{ selectedLevel() === 'ALL' ? 'này' : selectedLevel() }}</p>
                <p class="m-0 text-[#746B60]">Hãy là người đầu tiên đặt mục tiêu trình độ này để ghi tên lên bảng vinh danh!</p>
              </div>
            </ng-template>

            <!-- Table Footer: Record count & live update status -->
            <div class="px-4 py-2.5 bg-[#FAF8F5] border-t border-[#E5DED3] flex items-center justify-between text-xs text-[#746B60]">
              <span>Hiển thị {{ rankedList().length }} học viên dẫn đầu.</span>
              <span class="flex items-center gap-1.5 text-[11px]">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Cập nhật theo thời gian thực</span>
              </span>
            </div>
          </div>

          <!-- Pagination for Leaderboard Table -->
          <div *ngIf="totalPages() > 1" class="flex items-center justify-between pt-4 text-xs text-[#746B60]">
            <span>Trang {{ currentPage() + 1 }} / {{ totalPages() }} · {{ totalElements() }} học viên</span>
            <div class="flex items-center gap-2">
              <button 
                type="button" 
                (click)="prevPage()" 
                [disabled]="isFirst()"
                class="w-7 h-7 rounded-[4px] border border-[#E5DED3] bg-white text-[#29251F] hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                title="Trang trước"
              >
                <app-icon name="arrow-left" [size]="13"></app-icon>
              </button>
              <button 
                type="button" 
                (click)="nextPage()" 
                [disabled]="isLast()"
                class="w-7 h-7 rounded-[4px] border border-[#E5DED3] bg-white text-[#29251F] hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                title="Trang tiếp"
              >
                <app-icon name="arrow-right" [size]="13"></app-icon>
              </button>
            </div>
          </div>
        </section>

        <!-- CỘT 2 (Phải): 02 PERSONAL RECORD (THÀNH TÍCH CỦA BẠN & NGUYÊN LÝ TÍNH ĐIỂM) -->
        <aside class="space-y-8" aria-labelledby="personal-record-title">

          <!-- 1. Section Header -->
          <div class="flex items-start gap-3">
            <span class="font-serif text-[13px] font-semibold text-[#7D6853] leading-none mt-1">02</span>
            <div>
              <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#746B60] mb-1">Personal record</p>
              <h2 id="personal-record-title" class="font-serif text-[21px] font-semibold text-[#29251F] tracking-tight m-0">
                Thành tích của bạn
              </h2>
            </div>
          </div>

          <!-- 2. Profile Card (Vuông vức tinh gọn rounded-[4px]) -->
          <div *ngIf="currentUserRank() as me" class="bg-white border border-[#E5DED3] rounded-[4px] p-5 space-y-4 shadow-xs">
            
            <!-- Top Profile Row -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-[4px] bg-[#7D6853] text-white font-mono font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                  {{ getInitials(me.fullName || me.username) }}
                </div>
                <div>
                  <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#746B60] block">Hồ sơ của bạn</span>
                  <strong class="font-serif text-base font-semibold text-[#29251F] block mt-0.5 leading-snug">
                    {{ me.fullName }}
                  </strong>
                  <span class="text-xs text-[#746B60] block mt-0.5">Mục tiêu {{ me.targetLevel }}</span>
                </div>
              </div>

              <div class="text-right">
                <span class="text-[10px] text-[#746B60] block">Hạng</span>
                <span class="font-mono text-2xl font-bold text-[#29251F] leading-none">{{ me.rank > 0 ? ('#' + me.rank) : '—' }}</span>
              </div>
            </div>

            <!-- Divider -->
            <div class="border-t border-[#E5DED3]"></div>

            <!-- Subheading -->
            <div>
              <h3 class="font-serif text-base font-semibold text-[#29251F] m-0">Vị trí học tập cá nhân</h3>
            </div>

            <!-- 3 KPI Metrics -->
            <div class="grid grid-cols-3 gap-2 text-left">
              <div>
                <span class="font-mono text-lg font-bold text-[#29251F] block leading-none">{{ me.xp | number }} <span class="text-[10px] font-sans font-normal text-[#746B60]">XP</span></span>
                <span class="text-[11px] text-[#746B60] block mt-1">Tổng tích lũy</span>
              </div>
              <div>
                <span class="font-mono text-lg font-bold text-[#29251F] block leading-none">{{ me.masteredWords }} <span class="text-[10px] font-sans font-normal text-[#746B60]">từ</span></span>
                <span class="text-[11px] text-[#746B60] block mt-1">Đã thuần thục</span>
              </div>
              <div>
                <span class="font-mono text-lg font-bold text-[#29251F] block leading-none">{{ me.streakCount }} <span class="text-[10px] font-sans font-normal text-[#746B60]">ngày</span></span>
                <span class="text-[11px] text-[#746B60] block mt-1">Chuỗi Streak</span>
              </div>
            </div>

            <!-- Callout Banner -->
            <div class="bg-[#FAF8F5] border border-[#E5DED3] rounded-[4px] p-3 flex items-start gap-2.5">
              <app-icon name="sparkles" [size]="14" svgClass="text-[#7D6853] shrink-0 mt-0.5"></app-icon>
              <p class="text-xs text-[#746B60] leading-relaxed m-0">
                <ng-container *ngIf="me.rank > 0">
                  {{ me.rank === 1 ? 'Bạn đang giữ vị trí dẫn đầu toàn bảng. Hãy duy trì chu kỳ ôn tập để không bị gián đoạn trí nhớ.' : (nextTarget()?.suggestion || (selectedPeriod() === 'weekly' ? 'Tiếp tục luyện tập flashcard để thăng hạng trong tuần này.' : 'Tiếp tục luyện tập flashcard để thăng hạng trên bảng toàn thời gian.')) }}
                </ng-container>
                <ng-container *ngIf="me.rank === 0">
                  Bạn đang thuộc phân nhóm trình độ <strong>{{ me.targetLevel }}</strong>. Hãy chuyển sang tab <strong>{{ me.targetLevel }}</strong> hoặc <strong>Tất cả</strong> để theo dõi bảng vinh danh và vị trí thi đua của bạn.
                </ng-container>
              </p>
            </div>

            <!-- Action Buttons -->
            <div class="grid grid-cols-2 gap-2.5 pt-1">
              <a 
                routerLink="/flashcards"
                class="py-2 px-3 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white font-semibold text-xs flex items-center justify-center gap-1.5 no-underline transition-all active:scale-98 shadow-2xs"
              >
                <app-icon name="layers" [size]="14"></app-icon>
                <span>Ôn Flashcard ngay</span>
              </a>

              <a 
                routerLink="/scanner"
                class="py-2 px-3 rounded-[4px] bg-white hover:bg-[#FAF8F5] border border-[#E5DED3] text-[#29251F] font-semibold text-xs flex items-center justify-center gap-1.5 no-underline transition-all active:scale-98 shadow-2xs"
              >
                <app-icon name="camera" [size]="14"></app-icon>
                <span>Quét ảnh mới</span>
              </a>
            </div>
          </div>

          <!-- 3. Academic Scoring Section -->
          <div class="space-y-4 pt-2">
            <div class="flex items-center gap-3">
              <div class="w-7 h-7 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-[#7D6853] flex items-center justify-center shrink-0">
                <app-icon name="shield" [size]="14"></app-icon>
              </div>
              <div>
                <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#746B60] block">Academic scoring</span>
                <h3 class="font-serif text-lg font-semibold text-[#29251F] m-0">Nguyên lý tính điểm</h3>
              </div>
            </div>

            <!-- Scoring List -->
            <div class="divide-y divide-[#E5DED3] border-t border-b border-[#E5DED3]">
              <div class="py-2.5 flex items-center justify-between gap-3 text-xs">
                <span class="text-[#746B60]">Từ đạt trạng thái Mastered theo SM-2</span>
                <span class="font-mono font-bold text-[#7D6853] shrink-0">+50 XP</span>
              </div>
              <div class="py-2.5 flex items-center justify-between gap-3 text-xs">
                <span class="text-[#746B60]">Bóc tách vật thể bối cảnh mới từ Camera</span>
                <span class="font-mono font-bold text-[#7D6853] shrink-0">+20 XP</span>
              </div>
              <div class="py-2.5 flex items-center justify-between gap-3 text-xs">
                <span class="text-[#746B60]">Duy trì chuỗi Streak mỗi ngày</span>
                <span class="font-mono font-bold text-[#7D6853] shrink-0">+15 XP</span>
              </div>
              <div class="py-2.5 flex items-center justify-between gap-3 text-xs">
                <span class="text-[#746B60]">Hoàn thành lượt ôn tập đúng hạn</span>
                <span class="font-mono font-bold text-[#7D6853] shrink-0">+10 XP</span>
              </div>
            </div>

            <!-- Footnote note -->
            <div class="flex items-start gap-2 text-[11px] text-[#746B60] leading-relaxed pt-1">
              <app-icon name="info" [size]="14" svgClass="text-[#746B60] shrink-0 mt-0.5"></app-icon>
              <p class="m-0">
                Thuật toán SM-2 chỉ ghi nhận điểm khi từ vựng đến hạn chu kỳ lãng quên Ebbinghaus, tôn vinh tính kỷ luật bền bỉ thay vì học dồn ép.
              </p>
            </div>
          </div>

        </aside>

      </div>

    </div>
  `
})
export class UserLeaderboardComponent implements OnInit {
  api = inject(ApiService);
  toast = inject(ToastService);

  selectedPeriod = signal<'weekly' | 'all-time'>('weekly');
  selectedLevel = signal<string>('ALL');
  currentPage = signal<number>(0);
  pageSize = signal<number>(10);
  isLoading = signal<boolean>(false);

  leaderboardData = signal<LeaderboardResponse | null>(null);

  cefrLevels = [
    { id: 'ALL', label: 'Tất cả' },
    { id: 'A1', label: 'A1 Sơ cấp' },
    { id: 'A2', label: 'A2 Cơ bản' },
    { id: 'B1', label: 'B1 Trung cấp' },
    { id: 'B2', label: 'B2 Nâng cao' },
    { id: 'C1', label: 'C1 Tinh anh' }
  ];

  rankedList = computed(() => {
    return this.leaderboardData()?.topUsers || [];
  });

  currentUserRank = computed(() => {
    return this.leaderboardData()?.currentUserRank || null;
  });

  nextTarget = computed(() => {
    return this.leaderboardData()?.nextTarget || null;
  });

  totalPages = computed(() => {
    return this.leaderboardData()?.totalPages || 1;
  });

  totalElements = computed(() => {
    return this.leaderboardData()?.totalElements || 0;
  });

  isFirst = computed(() => {
    return this.leaderboardData()?.isFirst ?? (this.currentPage() === 0);
  });

  isLast = computed(() => {
    return this.leaderboardData()?.isLast ?? (this.currentPage() >= this.totalPages() - 1);
  });

  ngOnInit() {
    this.loadLeaderboard();
  }

  setPeriod(period: 'weekly' | 'all-time') {
    if (this.selectedPeriod() === period) return;
    this.selectedPeriod.set(period);
    this.currentPage.set(0);
    this.loadLeaderboard();
  }

  setLevel(level: string) {
    if (this.selectedLevel() === level) return;
    this.selectedLevel.set(level);
    this.currentPage.set(0);
    this.loadLeaderboard();
  }

  goToPage(page: number) {
    if (page < 0 || page >= this.totalPages() || page === this.currentPage()) return;
    this.currentPage.set(page);
    this.loadLeaderboard();
  }

  nextPage() {
    if (!this.isLast()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  prevPage() {
    if (!this.isFirst()) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  loadLeaderboard() {
    this.isLoading.set(true);
    this.api.getLeaderboard(this.selectedPeriod(), this.selectedLevel(), this.currentPage(), this.pageSize()).subscribe({
      next: (res) => {
        this.leaderboardData.set(res);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Không thể tải bảng xếp hạng lúc này. Vui lòng thử lại sau.');
      }
    });
  }
}

import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { UserStudyService, ContextWord } from '../../services/user-study.service';
import { QuizStageService, QuizStage } from '../../services/quiz-stage.service';
import { IconComponent } from '../common/icon.component';
import { environment } from '../../../environments/environment';

interface ClickFeedback {
  x: number;
  y: number;
  isHit: boolean;
  message: string;
}

@Component({
  selector: 'app-user-quiz',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  host: {
    class: 'w-full block'
  },
  template: `
    <div class="w-full max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-10 py-10 sm:py-12 space-y-8 animate-fade-in select-none">

      <!-- =========================================================================
           GIAI ĐOẠN 1: MÀN HÌNH CHỌN BỐI CẢNH (SELECT_STAGE)
           Chuẩn xác theo Mockup Figma: Header + Banner Blitz 60s + 2 Cột (Arenas & Scoring)
           ========================================================================= -->
      <ng-container *ngIf="gameMode() === 'SELECT_STAGE'">

        <!-- 1. Header & Current XP Score -->
        <section class="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-8 border-b border-[#E5DED3]" aria-labelledby="arena-header-title">
          <div class="max-w-[700px]">
            <span class="text-[10px] font-bold uppercase tracking-[0.11em] text-[#7D6853] block mb-2">
              Visual expedition · Đấu trường thực tế
            </span>
            <h1 id="arena-header-title" class="font-serif text-3xl sm:text-4xl lg:text-[36px] font-normal text-[#29251F] tracking-[-0.035em] leading-[1.15] m-0">
              Đấu trường thị giác AI
            </h1>
            <p class="text-xs sm:text-[14px] text-[#746B60] mt-2.5 leading-[1.65] m-0">
              Thử thách phản xạ ngôn ngữ trên <strong>Đấu trường Tuần do Quản trị viên thiết lập</strong> hoặc trực tiếp trên <strong>bối cảnh đời thực từ ảnh bạn đã chụp</strong>.
            </p>
          </div>

          <!-- Top Right Current XP Score -->
          <div class="flex flex-col items-start lg:items-end shrink-0">
            <span class="text-[10px] font-bold uppercase tracking-wider text-[#746B60] block mb-1">
              Điểm trận hiện tại
            </span>
            <span class="font-serif text-3xl sm:text-4xl font-bold text-[#29251F] leading-none">
              {{ totalScore() }} XP
            </span>
            <a routerLink="/leaderboard" class="text-xs text-[#7D6853] hover:underline mt-2 inline-flex items-center gap-1 font-semibold no-underline">
              <span>Xem bảng xếp hạng tuần</span>
              <app-icon name="arrow-right" [size]="12"></app-icon>
            </a>
          </div>
        </section>

        <!-- 2. Special Mode Banner (Blitz 60s) -->
        <section class="bg-[#F1ECE3] border border-[#E5DED3] rounded-[4px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-2xs">
          <div class="flex items-center gap-4 sm:gap-5 min-w-0">
            <div class="w-12 h-12 rounded-[4px] bg-white border border-[#E5DED3] text-[#7D6853] flex items-center justify-center shrink-0 shadow-2xs">
              <app-icon name="zap" [size]="20" svgClass="text-[#7D6853]"></app-icon>
            </div>
            <div class="min-w-0">
              <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#7D6853] block mb-1">
                Chế độ đặc biệt
              </span>
              <h2 class="font-serif text-lg sm:text-xl font-semibold text-[#29251F] tracking-tight m-0">
                Thử thách Blitz: Đua thời gian 60 giây
              </h2>
              <p class="text-xs text-[#746B60] mt-1 m-0 leading-relaxed">
                Thi đấu phản xạ nhanh trên Đấu Trường Chính Thức tuần này trước khi hết giờ.
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between sm:justify-end gap-5 shrink-0">
            <div class="hidden md:block w-36 h-1 bg-[#E5DED3] rounded-full overflow-hidden">
              <div class="w-2/3 h-full bg-[#7D6853]"></div>
            </div>

            <button 
              type="button" 
              (click)="startBlitzMode()"
              class="h-[43px] px-5 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 border-0 shadow-2xs"
            >
              <app-icon name="clock" [size]="14"></app-icon>
              <span>Bắt đầu 60s Blitz</span>
            </button>
          </div>
        </section>

        <!-- 3. Workspace 2 Columns -->
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start pt-2">

          <!-- CỘT 1 (Trái): 01 EXPEDITION ARENAS (CHỌN KHÔNG GIAN QUAN SÁT) -->
          <section class="space-y-4 min-w-0" aria-labelledby="arenas-title">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-3">
                <span class="font-serif text-[13px] font-semibold text-[#7D6853] leading-none mt-1">01</span>
                <div>
                  <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#746B60] mb-1">Expedition arenas</p>
                  <h2 id="arenas-title" class="font-serif text-[24px] font-semibold text-[#29251F] tracking-tight m-0">
                    Chọn không gian quan sát
                  </h2>
                </div>
              </div>

              <!-- Quick link to Scanner -->
              <a 
                routerLink="/scanner" 
                class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-[#E5DED3] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#7D6853] no-underline transition-colors shrink-0 shadow-2xs"
                title="Tải ảnh mới từ đời thực vào Studio Quét AI"
              >
                <app-icon name="camera" [size]="13"></app-icon>
                <span>+ Thêm bối cảnh từ ảnh</span>
              </a>
            </div>

            <!-- Filter tabs & Action -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-b border-[#E5DED3]">
              <div class="flex items-center gap-5">
                <button 
                  type="button"
                  (click)="stageFilter.set('ALL'); currentStagePage.set(1)"
                  [class.text-[#29251F]]="stageFilter() === 'ALL'"
                  [class.font-semibold]="stageFilter() === 'ALL'"
                  [class.border-[#7D6853]]="stageFilter() === 'ALL'"
                  [class.text-[#746B60]]="stageFilter() !== 'ALL'"
                  class="pb-2.5 text-xs border-b-2 border-transparent transition-all cursor-pointer hover:text-[#29251F] bg-transparent border-0"
                >
                  Tất cả {{ allStages().length }}
                </button>
                <button 
                  type="button"
                  (click)="stageFilter.set('ADMIN'); currentStagePage.set(1)"
                  [class.text-[#29251F]]="stageFilter() === 'ADMIN'"
                  [class.font-semibold]="stageFilter() === 'ADMIN'"
                  [class.border-[#7D6853]]="stageFilter() === 'ADMIN'"
                  [class.text-[#746B60]]="stageFilter() !== 'ADMIN'"
                  class="pb-2.5 text-xs border-b-2 border-transparent transition-all cursor-pointer hover:text-[#29251F] bg-transparent border-0 flex items-center gap-1.5"
                >
                  <app-icon name="award" [size]="13" svgClass="text-[#7D6853]"></app-icon>
                  <span>Đấu trường hệ thống</span>
                  <span class="text-[9px] font-mono px-1 py-0.2 rounded-[2px] bg-amber-100 text-amber-900 border border-amber-300">
                    {{ publishedAdminStages().length }}
                  </span>
                </button>
                <button 
                  type="button"
                  (click)="stageFilter.set('USER'); currentStagePage.set(1)"
                  [class.text-[#29251F]]="stageFilter() === 'USER'"
                  [class.font-semibold]="stageFilter() === 'USER'"
                  [class.border-[#7D6853]]="stageFilter() === 'USER'"
                  [class.text-[#746B60]]="stageFilter() !== 'USER'"
                  class="pb-2.5 text-xs border-b-2 border-transparent transition-all cursor-pointer hover:text-[#29251F] bg-transparent border-0 flex items-center gap-1.5"
                >
                  <app-icon name="camera" [size]="13" svgClass="text-[#7D6853]"></app-icon>
                  <span>Ảnh của bạn</span>
                  <span class="text-[9px] font-mono px-1 py-0.2 rounded-[2px] bg-[#EAE5DC] text-[#5A5046]">{{ userStages().length }}</span>
                </button>
              </div>

              <a routerLink="/scanner" class="sm:hidden text-xs font-semibold text-[#7D6853] hover:underline flex items-center gap-1.5 pb-2.5 no-underline">
                <app-icon name="camera" [size]="13"></app-icon>
                <span>+ Thêm bối cảnh từ ảnh mới</span>
              </a>
            </div>

            <!-- Grid of Arena Cards (2 columns) -->
            <div *ngIf="paginatedStages().length > 0; else noStagesTpl" class="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <article 
                *ngFor="let stage of paginatedStages()"
                (click)="startStage(stage)"
                class="group bg-white border rounded-[4px] p-4 transition-all cursor-pointer select-none space-y-3.5 shadow-2xs relative"
                [class.border-amber-400]="stage.id === activeAdminStage().id"
                [class.bg-amber-50\/15]="stage.id === activeAdminStage().id"
                [class.border-[#E5DED3]]="stage.id !== activeAdminStage().id"
                [class.hover:border-[#7D6853]]="stage.id !== activeAdminStage().id"
              >
                <!-- Thumbnail Image -->
                <div class="relative w-full aspect-[16/10] sm:aspect-[4/3] rounded-[3px] overflow-hidden bg-[#EAE5DC] border border-[#E5DED3]/80">
                  <img 
                    [src]="stage.imageUrl" 
                    [alt]="stage.title" 
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  <!-- Badge inside top-left -->
                  <span 
                    class="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-medium backdrop-blur-xs flex items-center gap-1.5 shadow-2xs"
                    [class.bg-[#29251F]/85]="stage.id !== activeAdminStage().id"
                    [class.text-white]="stage.id !== activeAdminStage().id"
                    [class.bg-amber-950/90]="stage.id === activeAdminStage().id"
                    [class.text-amber-200]="stage.id === activeAdminStage().id"
                  >
                    <app-icon *ngIf="stage.id === activeAdminStage().id" name="award" [size]="11"></app-icon>
                    <app-icon *ngIf="stage.isOfficial && stage.id !== activeAdminStage().id" name="target" [size]="11"></app-icon>
                    <app-icon *ngIf="!stage.isOfficial" name="camera" [size]="11"></app-icon>
                    <span>
                      {{ stage.id === activeAdminStage().id ? 'Đấu trường tuần' : (stage.isOfficial ? 'Đấu trường hệ thống' : 'Ảnh của bạn') }} · {{ stage.words.length }} {{ stage.isOfficial ? 'đồ vật' : 'từ đã lưu' }}
                    </span>
                  </span>

                  <!-- Official Tag if Weekly or System Stage -->
                  <span 
                    *ngIf="stage.id === activeAdminStage().id"
                    class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-[2px] bg-amber-400 text-amber-950 font-mono text-[9px] font-bold shadow-2xs tracking-wider"
                  >
                    TIÊU ĐIỂM TUẦN
                  </span>
                  <span 
                    *ngIf="stage.isOfficial && stage.id !== activeAdminStage().id"
                    class="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-[2px] bg-stone-900/80 text-white font-mono text-[9px] font-bold shadow-2xs tracking-wider backdrop-blur-xs"
                  >
                    CHÍNH THỨC
                  </span>
                </div>

                <!-- Content below -->
                <div>
                  <div class="flex items-center justify-between gap-2">
                    <h3 class="font-serif text-lg font-semibold text-[#29251F] group-hover:text-[#7D6853] transition-colors leading-snug m-0 truncate">
                      {{ stage.title }}
                    </h3>
                  </div>

                  <p class="text-xs text-[#746B60] italic line-clamp-1 mt-1 m-0">
                    {{ getWordsList(stage) }}
                  </p>

                  <div class="flex items-center justify-between text-xs pt-3 mt-1 border-t border-[#E5DED3]">
                    <span class="text-[11px] text-[#746B60] font-mono truncate">
                      {{ stage.id === activeAdminStage().id ? 'Bảng xếp hạng tuần' : (stage.isOfficial ? 'Đấu trường chuẩn hóa' : 'Luyện phản xạ từ đã lưu') }}
                    </span>
                    <div class="flex items-center gap-1 font-semibold text-[#29251F] group-hover:text-[#7D6853] transition-colors">
                      <span>Vào thi đấu</span>
                      <app-icon name="arrow-right" [size]="12" svgClass="group-hover:translate-x-1 transition-transform"></app-icon>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <ng-template #noStagesTpl>
              <div class="py-16 text-center max-w-md mx-auto space-y-4">
                <div class="w-14 h-14 rounded-full bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center mx-auto text-[#7D6853]">
                  <app-icon name="book-open" [size]="24"></app-icon>
                </div>
                <h3 class="font-serif text-xl font-semibold text-[#29251F] m-0">
                  {{ stageFilter() === 'USER' ? 'Chưa có bối cảnh từ từ vựng đã lưu' : 'Không có bối cảnh phù hợp' }}
                </h3>
                <p class="text-xs text-[#746B60] leading-relaxed m-0">
                  {{ stageFilter() === 'USER' 
                    ? 'Đấu trường cá nhân chỉ xuất hiện khi bạn đã lưu từ vựng từ ảnh vào Sổ tay. Hãy vào Bộ sưu tập hoặc Quét AI để chọn lưu các từ vựng bạn muốn luyện phản xạ!' 
                    : 'Hãy chuyển bộ lọc hoặc tải thêm ảnh để bắt đầu thử thách quan sát.' }}
                </p>
                <div class="flex items-center justify-center gap-3 pt-2">
                  <a routerLink="/collection" class="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold cursor-pointer shadow-xs transition-all no-underline">
                    <app-icon name="book-open" [size]="14" svgClass="text-white"></app-icon>
                    <span>Vào Sổ tay & Bộ sưu tập</span>
                  </a>
                  <a routerLink="/scanner" class="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] border border-[#E5DED3] bg-white hover:bg-[#FAF8F5] text-[#29251F] text-xs font-semibold cursor-pointer shadow-xs transition-all no-underline">
                    <app-icon name="camera" [size]="14" svgClass="text-[#7D6853]"></app-icon>
                    <span>Quét ảnh mới</span>
                  </a>
                </div>
              </div>
            </ng-template>

            <!-- Pagination for Arenas -->
            <div *ngIf="filteredStages().length > 0" class="flex items-center justify-between pt-6 border-t border-[#E5DED3] text-xs text-[#746B60]">
              <span>Trang {{ currentStagePage() }} / {{ totalStagePages() }} · {{ filteredStages().length }} bối cảnh sẵn sàng</span>
              <div class="flex items-center gap-2">
                <button 
                  type="button" 
                  (click)="prevStagePage()" 
                  [disabled]="currentStagePage() === 1"
                  class="w-8 h-8 rounded-[4px] border border-[#E5DED3] bg-white text-[#29251F] hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors"
                  title="Trang trước"
                >
                  <app-icon name="arrow-left" [size]="13"></app-icon>
                </button>
                <button 
                  type="button" 
                  (click)="nextStagePage()" 
                  [disabled]="currentStagePage() === totalStagePages()"
                  class="w-8 h-8 rounded-[4px] border border-[#E5DED3] bg-white text-[#29251F] hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors"
                  title="Trang tiếp"
                >
                  <app-icon name="arrow-right" [size]="13"></app-icon>
                </button>
              </div>
            </div>
          </section>

          <!-- CỘT 2 (Phải): 02 SCORING MECHANICS (CƠ CHẾ TÍNH ĐIỂM & PHẢN XẠ) -->
          <aside class="lg:border-l lg:border-[#E5DED3] lg:pl-8 space-y-6" aria-labelledby="scoring-title">
            <div class="flex items-start gap-3">
              <span class="font-serif text-[13px] font-semibold text-[#7D6853] leading-none mt-1">02</span>
              <div>
                <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#746B60] mb-1">Scoring mechanics</p>
                <h2 id="scoring-title" class="font-serif text-[21px] font-semibold text-[#29251F] tracking-tight m-0">
                  Cơ chế tính điểm & Phản xạ
                </h2>
                <p class="text-xs text-[#746B60] mt-1.5 leading-relaxed m-0">
                  Điểm thưởng phản ánh độ chính xác và tốc độ nhận diện, không chỉ số lần chạm.
                </p>
              </div>
            </div>

            <!-- Scoring Rules List -->
            <div class="divide-y divide-[#E5DED3] border-t border-b border-[#E5DED3]">
              <!-- 1. Đoán đúng vật thể -->
              <div class="py-3.5 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-7 h-7 rounded-full bg-[#EAE5DC] text-[#746B60] flex items-center justify-center shrink-0">
                    <app-icon name="target" [size]="14"></app-icon>
                  </div>
                  <div class="min-w-0">
                    <strong class="text-xs text-[#29251F] block font-semibold leading-tight">Đoán đúng vật thể</strong>
                    <span class="text-[11px] text-[#746B60] block leading-tight truncate mt-0.5">Chọn chính xác tâm đồ vật</span>
                  </div>
                </div>
                <span class="text-xs font-mono font-bold text-[#7D6853] shrink-0">+25 XP</span>
              </div>

              <!-- 2. Chuỗi liên tiếp -->
              <div class="py-3.5 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-7 h-7 rounded-full bg-[#EAE5DC] text-[#746B60] flex items-center justify-center shrink-0">
                    <app-icon name="refresh-cw" [size]="13"></app-icon>
                  </div>
                  <div class="min-w-0">
                    <strong class="text-xs text-[#29251F] block font-semibold leading-tight">Chuỗi liên tiếp</strong>
                    <span class="text-[11px] text-[#746B60] block leading-tight truncate mt-0.5">Duy trì độ chính xác không phạm lỗi</span>
                  </div>
                </div>
                <span class="text-xs font-mono font-bold text-[#746B60] shrink-0">x1.5 ~ x3.0</span>
              </div>

              <!-- 3. Phản xạ nhanh -->
              <div class="py-3.5 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-7 h-7 rounded-full bg-[#EAE5DC] text-[#746B60] flex items-center justify-center shrink-0">
                    <app-icon name="zap" [size]="14"></app-icon>
                  </div>
                  <div class="min-w-0">
                    <strong class="text-xs text-[#29251F] block font-semibold leading-tight">Phản xạ nhanh &lt;5s</strong>
                    <span class="text-[11px] text-[#746B60] block leading-tight truncate mt-0.5">Tìm thấy ngay khi nghe âm thanh</span>
                  </div>
                </div>
                <span class="text-xs font-mono font-bold text-[#7D6853] shrink-0">+10 XP</span>
              </div>

              <!-- 4. Chạm sai vị trí -->
              <div class="py-3.5 flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-7 h-7 rounded-full bg-[#EAE5DC] text-[#746B60] flex items-center justify-center shrink-0">
                    <app-icon name="alert-triangle" [size]="13"></app-icon>
                  </div>
                  <div class="min-w-0">
                    <strong class="text-xs text-[#29251F] block font-semibold leading-tight">Chạm sai vị trí</strong>
                    <span class="text-[11px] text-[#746B60] block leading-tight truncate mt-0.5">Reset chuỗi combo hiện tại</span>
                  </div>
                </div>
                <span class="text-xs font-mono font-bold text-[#B91C1C] shrink-0">-2s</span>
              </div>
            </div>

            <!-- Weekly Progress Card -->
            <div class="bg-[#F1ECE3] border border-[#E5DED3] rounded-xl p-5 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-[9px] font-bold uppercase tracking-wider text-[#746B60]">Tiến trình tuần</span>
                <strong class="font-serif text-base font-semibold text-[#29251F]">Hành trình quan sát</strong>
              </div>

              <div class="flex items-baseline gap-2">
                <span class="font-serif text-3xl font-bold text-[#29251F] leading-none">{{ weeklyCompletedCount() }} / 5</span>
              </div>

              <div class="w-full h-1 bg-[#E5DED3] rounded-full overflow-hidden">
                <div class="h-full bg-[#7D6853] transition-all duration-300" [style.width.%]="(weeklyCompletedCount() / 5) * 100"></div>
              </div>

              <p class="text-[11px] text-[#746B60] leading-relaxed m-0">
                Hoàn thành 5 bối cảnh để mở thử thách tổng hợp cuối tuần.
              </p>
            </div>
          </aside>

        </div>
      </ng-container>

      <!-- =========================================================================
           GIAI ĐOẠN 2: ĐẤU TRƯỜNG TƯƠNG TÁC (PLAYING)
           ========================================================================= -->
      <ng-container *ngIf="gameMode() === 'PLAYING'">
        <div class="space-y-6">
          
          <!-- Top HUD: Back button, stage title, timer, combo, hint -->
          <section class="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E5DED3]">
            <div class="flex items-center gap-4">
              <button 
                type="button" 
                (click)="exitToStageSelect()" 
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#746B60] hover:text-[#29251F] cursor-pointer bg-transparent border-0 p-0 transition-colors"
              >
                <app-icon name="arrow-left" [size]="16"></app-icon>
                <span>Đấu trường</span>
              </button>

              <span class="w-[1px] h-6 bg-[#E5DED3]"></span>

              <div>
                <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#7D6853] block">Bối cảnh</span>
                <h2 class="font-serif text-xl font-semibold text-[#29251F] m-0">{{ currentStage()?.title }}</h2>
              </div>
            </div>

            <div class="flex items-center gap-4">
              <div class="text-xs text-[#746B60]">
                Tiến độ: <strong class="text-[#29251F]">{{ currentWordIndex() + 1 }}</strong>/{{ activeQuizQueue().length }}
              </div>

              <div 
                class="px-3 py-1 rounded-[8px] border text-xs font-mono font-bold flex items-center gap-1.5"
                [class.bg-[#FAF7F2]]="timerSeconds() > 5"
                [class.border-[#E5DED3]]="timerSeconds() > 5"
                [class.text-[#29251F]]="timerSeconds() > 5"
                [class.bg-rose-50]="timerSeconds() <= 5"
                [class.border-rose-200]="timerSeconds() <= 5"
                [class.text-rose-700]="timerSeconds() <= 5"
              >
                <app-icon name="clock" [size]="13"></app-icon>
                <span>{{ timerSeconds() }}s</span>
              </div>

              <div class="px-2.5 py-1 rounded-[8px] bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-1">
                <app-icon name="flame" [size]="13" svgClass="text-amber-600"></app-icon>
                <span>Combo {{ comboMultiplier() }}x</span>
              </div>

              <button 
                type="button"
                (click)="useHint()"
                [disabled]="isHintActive() || isShowingSuccess()"
                class="px-3 py-1 rounded-[8px] border border-[#E5DED3] bg-white hover:bg-[#FAF7F2] text-xs font-semibold text-[#7D6853] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Gợi ý
              </button>
            </div>
          </section>

          <!-- Target Word Prompt Banner -->
          <section class="bg-white border border-[#E5DED3] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-2xs">
            <div class="flex items-center gap-5">
              <button 
                type="button" 
                (click)="playCurrentWordAudio()"
                class="w-12 h-12 rounded-xl bg-[#7D6853] hover:bg-[#685542] text-white flex items-center justify-center cursor-pointer border-0 transition-transform active:scale-95 shrink-0"
                title="Nghe phát âm"
              >
                <app-icon name="volume-2" [size]="20"></app-icon>
              </button>

              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-[#7D6853] block mb-1">
                  Hãy tìm đồ vật trong ảnh:
                </span>
                <div class="flex items-baseline gap-3 flex-wrap">
                  <h1 class="font-serif text-3xl sm:text-4xl font-normal text-[#29251F] tracking-tight m-0">
                    {{ currentTargetWord()?.word }}
                  </h1>
                  <span class="text-xs text-[#746B60] font-sans">{{ currentTargetWord()?.ipa }}</span>
                  <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#EAE5DC] text-[#746B60]">
                    {{ currentTargetWord()?.level || 'A2' }}
                  </span>
                </div>
                <p class="text-xs text-[#746B60] mt-1 m-0">
                  Ý nghĩa tiếng Việt: <strong class="text-[#29251F] font-semibold">{{ currentTargetWord()?.vietnamese }}</strong>
                </p>
              </div>
            </div>

            <div>
              <button 
                type="button" 
                (click)="skipCurrentQuestion()" 
                class="text-xs text-[#746B60] hover:text-[#B91C1C] hover:underline cursor-pointer bg-transparent border-0 p-0"
              >
                Bỏ qua câu này (-0đ)
              </button>
            </div>
          </section>

          <!-- Interactive Photo Container -->
          <section class="relative rounded-2xl overflow-hidden bg-[#29251F] border border-[#E5DED3] flex items-center justify-center p-3 select-none">
            <div 
              #photoContainer
              (click)="onBackgroundClick($event)"
              class="relative inline-block max-w-full leading-none cursor-crosshair select-none"
            >
              <img 
                [src]="currentStage()?.imageUrl" 
                [alt]="currentStage()?.title" 
                class="block max-h-[540px] w-auto max-w-full mx-auto rounded-lg pointer-events-none select-none"
              />

              <!-- Bounding boxes -->
              <ng-container *ngFor="let item of currentStage()?.words">
                <div 
                  (click)="onBoxClick(item, $event)"
                  class="absolute rounded-[6px] transition-all duration-200 cursor-pointer select-none group/bbox z-10"
                  [style.top.%]="item.topPercent"
                  [style.left.%]="item.leftPercent"
                  [style.width.%]="item.widthPercent"
                  [style.height.%]="item.heightPercent"
                  [class.border-2]="true"
                  [class.border-[#287A59]]="isWordSolved(item.id) && !isCurrentTarget(item.id)"
                  [class.bg-[#287A59]/20]="isWordSolved(item.id) && !isCurrentTarget(item.id)"
                  [class.border-[#287A59]]="isShowingSuccess() && isCurrentTarget(item.id)"
                  [class.bg-[#287A59]/35]="isShowingSuccess() && isCurrentTarget(item.id)"
                  [class.border-rose-500]="wrongClickedWord()?.id === item.id"
                  [class.bg-rose-500/30]="wrongClickedWord()?.id === item.id"
                  [class.border-dashed]="!isWordSolved(item.id) && !(isShowingSuccess() && isCurrentTarget(item.id)) && wrongClickedWord()?.id !== item.id"
                  [class.border-white/80]="!isWordSolved(item.id) && !(isShowingSuccess() && isCurrentTarget(item.id)) && wrongClickedWord()?.id !== item.id"
                  [class.bg-white/10]="!isWordSolved(item.id) && !(isShowingSuccess() && isCurrentTarget(item.id)) && wrongClickedWord()?.id !== item.id"
                  [class.hover:border-amber-300]="!isWordSolved(item.id) && !isShowingSuccess()"
                  [class.hover:bg-amber-300/20]="!isWordSolved(item.id) && !isShowingSuccess()"
                >
                  <!-- Success notification tag -->
                  <span 
                    *ngIf="isShowingSuccess() && isCurrentTarget(item.id)"
                    class="absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-[6px] bg-[#287A59] text-white text-[11px] font-semibold whitespace-nowrap shadow-md z-30 pointer-events-none"
                  >
                    Chính xác: {{ item.word }} (+{{ lastEarnedXp() }} XP)
                  </span>

                  <!-- Wrong clicked feedback tag -->
                  <span 
                    *ngIf="wrongClickedWord()?.id === item.id"
                    class="absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-[6px] bg-[#B91C1C] text-white text-[11px] font-semibold whitespace-nowrap shadow-md z-30 pointer-events-none"
                  >
                    Đây là {{ item.word }} ({{ item.vietnamese }}), không phải {{ currentTargetWord()?.word }}!
                  </span>

                  <!-- Solved checkmark -->
                  <span 
                    *ngIf="isWordSolved(item.id) && !isShowingSuccess()"
                    class="absolute top-1 left-1 px-1.5 py-0.5 rounded-[4px] bg-[#287A59]/90 text-white text-[9px] font-semibold pointer-events-none flex items-center gap-1"
                  >
                    <app-icon name="check" [size]="9"></app-icon>
                    <span>{{ item.word }}</span>
                  </span>
                </div>
              </ng-container>

              <!-- Hint outline -->
              <div 
                *ngIf="isHintActive() && currentTargetWord() as target"
                class="absolute pointer-events-none rounded-lg transition-all animate-pulse z-20"
                [style.top.%]="target.topPercent - 2"
                [style.left.%]="target.leftPercent - 2"
                [style.width.%]="target.widthPercent + 4"
                [style.height.%]="target.heightPercent + 4"
                style="border: 2px dashed #D97706; background-color: rgba(217, 119, 6, 0.2);"
              ></div>

              <!-- Click outside feedback -->
              <div 
                *ngIf="clickFeedback() as fb"
                class="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-30"
                [style.top.%]="fb.y"
                [style.left.%]="fb.x"
              >
                <div *ngIf="!fb.isHit" class="w-8 h-8 rounded-full border border-rose-500 bg-rose-500/30 animate-ping"></div>
              </div>
            </div>
          </section>

          <!-- Bottom instructions -->
          <div class="flex items-center justify-between text-xs text-[#746B60] pt-1">
            <span>Di chuột và chạm trực tiếp vào đồ vật trong bức ảnh để trả lời.</span>
            <span>Độ chính xác: <strong class="text-[#29251F]">{{ accuracyPercentage() }}%</strong></span>
          </div>

        </div>
      </ng-container>

      <!-- =========================================================================
           GIAI ĐOẠN 3: KẾT QUẢ TRẬN ĐẤU (VICTORY)
           ========================================================================= -->
      <ng-container *ngIf="gameMode() === 'VICTORY'">
        <div class="max-w-2xl mx-auto space-y-8 text-center animate-fade-in py-6">
          <div class="w-16 h-16 rounded-full bg-[#F1ECE3] text-[#7D6853] flex items-center justify-center mx-auto shadow-2xs">
            <app-icon name="trophy" [size]="32" svgClass="text-[#7D6853]"></app-icon>
          </div>

          <div>
            <span class="text-[10px] font-bold uppercase tracking-[0.11em] text-[#7D6853] block mb-2">
              Thử thách hoàn thành xuất sắc
            </span>
            <h1 class="font-serif text-3xl sm:text-4xl font-normal text-[#29251F] tracking-tight m-0">
              Tổng kết đấu trường thị giác
            </h1>
            <p class="text-xs sm:text-sm text-[#746B60] mt-2 max-w-md mx-auto leading-relaxed m-0">
              Bạn vừa hoàn thành xuất sắc bối cảnh <strong>{{ currentStage()?.title }}</strong>. Toàn bộ điểm XP đã được tự động đồng bộ vào Bảng Xếp Hạng tuần!
            </p>
          </div>

          <!-- 4 KPI Blocks -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div class="p-4 bg-white border border-[#E5DED3] rounded-xl shadow-2xs">
              <span class="text-[10px] text-[#746B60] block font-medium">Tổng điểm XP</span>
              <span class="font-serif text-2xl font-bold text-[#7D6853] block mt-1">+{{ totalScore() }} XP</span>
            </div>
            <div class="p-4 bg-white border border-[#E5DED3] rounded-xl shadow-2xs">
              <span class="text-[10px] text-[#746B60] block font-medium">Độ chính xác</span>
              <span class="font-serif text-2xl font-bold text-[#287A59] block mt-1">{{ accuracyPercentage() }}%</span>
            </div>
            <div class="p-4 bg-white border border-[#E5DED3] rounded-xl shadow-2xs">
              <span class="text-[10px] text-[#746B60] block font-medium">Combo lớn nhất</span>
              <span class="font-serif text-2xl font-bold text-[#D97706] block mt-1">{{ maxCombo() }}x</span>
            </div>
            <div class="p-4 bg-white border border-[#E5DED3] rounded-xl shadow-2xs">
              <span class="text-[10px] text-[#746B60] block font-medium">Số từ hoàn thành</span>
              <span class="font-serif text-2xl font-bold text-[#29251F] block mt-1">{{ correctCount() }}/{{ activeQuizQueue().length }}</span>
            </div>
          </div>

          <!-- Vocabulary Review List -->
          <div class="bg-white border border-[#E5DED3] rounded-xl p-5 text-left space-y-3 shadow-2xs">
            <span class="text-[10px] font-bold uppercase tracking-wider text-[#7D6853] block">
              Từ vựng đã ôn qua bối cảnh này:
            </span>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div *ngFor="let item of activeQuizQueue()" class="flex items-center justify-between p-2.5 rounded-lg border border-[#E5DED3] bg-[#FAF7F2] text-xs">
                <div>
                  <strong class="font-semibold text-[#29251F] block">{{ item.word }}</strong>
                  <small class="text-[#746B60]">{{ item.vietnamese }}</small>
                </div>
                <button 
                  type="button" 
                  (click)="studyService.speakWord(item.word)"
                  class="w-7 h-7 rounded-md bg-white border border-[#E5DED3] text-[#746B60] hover:text-[#7D6853] flex items-center justify-center cursor-pointer p-0"
                  title="Nghe phát âm"
                >
                  <app-icon name="volume-2" [size]="13"></app-icon>
                </button>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button 
              type="button" 
              (click)="replayCurrentStage()"
              class="h-[43px] px-5 rounded-[10px] bg-[#7D6853] hover:bg-[#685542] text-white font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all border-0 shadow-2xs"
            >
              <app-icon name="rotate-cw" [size]="14"></app-icon>
              <span>Chơi lại bối cảnh này</span>
            </button>

            <button 
              type="button" 
              (click)="exitToStageSelect()"
              class="h-[43px] px-5 rounded-[10px] bg-white border border-[#E5DED3] hover:bg-[#FAF7F2] text-[#29251F] font-semibold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <span>Chọn bối cảnh khác</span>
            </button>

            <a 
              routerLink="/leaderboard"
              class="h-[43px] px-5 rounded-[10px] bg-[#F1ECE3] border border-[#E5DED3] hover:bg-[#EAE5DC] text-[#7D6853] font-semibold text-xs flex items-center gap-2 cursor-pointer transition-colors no-underline shadow-2xs"
            >
              <app-icon name="trophy" [size]="14"></app-icon>
              <span>Xem bảng xếp hạng</span>
            </a>
          </div>

        </div>
      </ng-container>

    </div>
  `
})
export class UserQuizComponent implements OnInit, OnDestroy {
  studyService = inject(UserStudyService);
  api = inject(ApiService);
  toast = inject(ToastService);
  http = inject(HttpClient);
  router = inject(Router);
  quizStageService = inject(QuizStageService);

  private readonly baseUrl = environment.apiUrl;

  // Trạng thái game
  gameMode = signal<'SELECT_STAGE' | 'PLAYING' | 'VICTORY'>('SELECT_STAGE');

  // Bối cảnh đang chọn
  currentStage = signal<QuizStage | null>(null);

  // Hàng đợi các câu hỏi cần tìm trong ván đấu
  activeQuizQueue = signal<ContextWord[]>([]);
  currentWordIndex = signal<number>(0);

  // Đồng hồ đếm ngược từng câu
  timerSeconds = signal<number>(15);
  private timerInterval: any = null;

  // Điểm số và Combo
  totalScore = signal<number>(0);
  comboMultiplier = signal<number>(1.0);
  maxCombo = signal<number>(1.0);
  lastEarnedXp = signal<number>(25);

  // Thống kê độ chính xác
  correctCount = signal<number>(0);
  totalClicks = signal<number>(0);

  // Hiệu ứng tương tác
  isHintActive = signal<boolean>(false);
  isShowingSuccess = signal<boolean>(false);
  clickFeedback = signal<ClickFeedback | null>(null);

  // Lưu danh sách id các từ vựng đã giải đúng trong ván hiện tại
  solvedWordIds = signal<Set<string>>(new Set());

  // Lưu từ vựng vừa bị nhấp nhầm (để highlight đỏ viền và cảnh báo)
  wrongClickedWord = signal<ContextWord | null>(null);

  isWordSolved(wordId: string): boolean {
    return this.solvedWordIds().has(wordId);
  }

  isCurrentTarget(wordId: string): boolean {
    return this.currentTargetWord()?.id === wordId;
  }

  // Web Audio Context cho âm thanh game sống động
  private audioCtx: AudioContext | null = null;

  // ==========================================
  // ĐẤU TRƯỜNG THI ĐẤU (ADMIN & USER)
  // Kết nối trực tiếp với QuizStageService tập trung
  // ==========================================
  activeAdminStage = this.quizStageService.activeWeeklyStage;
  publishedAdminStages = this.quizStageService.publishedAdminStages;
  userStages = this.quizStageService.userStages;
  allStages = this.quizStageService.allPlayableStages;

  // Bộ lọc: 'ALL' | 'ADMIN' | 'USER'
  stageFilter = signal<'ALL' | 'ADMIN' | 'USER'>('ALL');

  filteredStages = computed<QuizStage[]>(() => {
    const filter = this.stageFilter();
    if (filter === 'ADMIN') {
      return this.publishedAdminStages();
    }
    if (filter === 'USER') {
      return this.userStages();
    }
    return this.allStages();
  });

  getWordsList(stage: QuizStage): string {
    return stage.words.map(w => w.word).join(', ') || 'Chưa có từ vựng';
  }

  weeklyCompletedCount = computed<number>(() => {
    const mastered = this.studyService.savedWords().filter(w => w.status === 'MASTERED').length;
    return Math.min(5, Math.max(0, Math.floor(mastered / 2)));
  });

  // ==========================================
  // PHÂN TRANG BỐI CẢNH THI ĐẤU (4 BỐI CẢNH / TRANG)
  // ==========================================
  stagePageSize = 4;
  currentStagePage = signal<number>(1);

  paginatedStages = computed<QuizStage[]>(() => {
    const list = this.filteredStages();
    const start = (this.currentStagePage() - 1) * this.stagePageSize;
    return list.slice(start, start + this.stagePageSize);
  });

  totalStagePages = computed<number>(() => {
    return Math.ceil(this.filteredStages().length / this.stagePageSize) || 1;
  });

  stagePageNumbers = computed<number[]>(() => {
    return Array.from({ length: this.totalStagePages() }, (_, i) => i + 1);
  });

  stageStartIndex = computed<number>(() => {
    if (this.filteredStages().length === 0) return 0;
    return (this.currentStagePage() - 1) * this.stagePageSize + 1;
  });

  stageEndIndex = computed<number>(() => {
    return Math.min(this.currentStagePage() * this.stagePageSize, this.filteredStages().length);
  });

  prevStagePage() {
    if (this.currentStagePage() > 1) {
      this.currentStagePage.update(p => p - 1);
    }
  }

  nextStagePage() {
    if (this.currentStagePage() < this.totalStagePages()) {
      this.currentStagePage.update(p => p + 1);
    }
  }

  goToStagePage(page: number) {
    this.currentStagePage.set(page);
  }

  currentTargetWord = computed<ContextWord | null>(() => {
    const queue = this.activeQuizQueue();
    const idx = this.currentWordIndex();
    if (idx >= 0 && idx < queue.length) {
      return queue[idx];
    }
    return null;
  });

  totalQuestions = computed<number>(() => {
    return this.activeQuizQueue().length;
  });

  accuracyPercentage = computed<number>(() => {
    const total = this.totalClicks();
    const correct = this.correctCount();
    if (total === 0) return 100;
    return Math.min(100, Math.round((correct / total) * 100));
  });

  ngOnInit() {
    this.initAudioContext();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  private initAudioContext() {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    } catch (e) {
      console.warn('Web Audio API not supported on this browser.');
    }
  }

  // Bắt đầu một sân đấu bối cảnh
  startStage(stage: QuizStage) {
    this.currentStage.set(stage);
    
    // Xáo trộn ngẫu nhiên thứ tự các từ trong bối cảnh
    const shuffled = [...stage.words].sort(() => 0.5 - Math.random());
    this.activeQuizQueue.set(shuffled);
    this.currentWordIndex.set(0);

    // Đặt lại các thông số trận đấu
    this.totalScore.set(0);
    this.comboMultiplier.set(1.0);
    this.maxCombo.set(1.0);
    this.correctCount.set(0);
    this.totalClicks.set(0);
    this.isShowingSuccess.set(false);
    this.isHintActive.set(false);
    this.clickFeedback.set(null);
    this.solvedWordIds.set(new Set());
    this.wrongClickedWord.set(null);

    // Chuyển sang màn hình chơi
    this.gameMode.set('PLAYING');

    // Bắt đầu câu đầu tiên
    this.startQuestionRound();
  }

  // Chế độ Blitz 60 giây đua tốc độ
  startBlitzMode() {
    const allWords: ContextWord[] = [];
    for (const st of this.allStages()) {
      for (const w of st.words) {
        allWords.push(w);
      }
    }
    const shuffled = allWords.sort(() => 0.5 - Math.random()).slice(0, 10);
    const blitzStage: QuizStage = {
      id: 'blitz-stage',
      title: 'Đua Tốc Độ 60s Blitz Arena',
      subtitle: 'Thử thách phản xạ cực nhanh qua các bối cảnh đời thực',
      category: 'Đấu Trường Đỉnh Cao',
      badge: '⚡ Siêu Tốc Độ',
      imageUrl: '/kitchen_refrigerator.png',
      words: shuffled
    };
    this.startStage(blitzStage);
  }

  private startQuestionRound() {
    this.stopTimer();
    this.timerSeconds.set(15);
    this.isShowingSuccess.set(false);
    this.isHintActive.set(false);
    this.clickFeedback.set(null);
    this.wrongClickedWord.set(null);

    const target = this.currentTargetWord();
    if (!target) {
      this.finishGame();
      return;
    }

    // Tự động phát âm từ tiếng Anh để luyện phản xạ thính giác + thị giác
    this.playCurrentWordAudio();

    // Bắt đầu đếm ngược 15 giây
    this.timerInterval = setInterval(() => {
      const cur = this.timerSeconds();
      if (cur <= 1) {
        this.onTimerExpired();
      } else {
        this.timerSeconds.set(cur - 1);
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // Xử lý khi hết thời gian câu
  private onTimerExpired() {
    this.stopTimer();
    this.playSfx('miss');
    this.comboMultiplier.set(1.0);
    this.toast.info(`Hết giờ cho từ "${this.currentTargetWord()?.word}"! Đang chuyển sang từ tiếp theo...`, 'Hết Giờ');
    this.nextQuestion();
  }

  // Nhấp vào một khung Bounding Box của vật thể trên ảnh
  onBoxClick(item: ContextWord, event: MouseEvent) {
    event.stopPropagation();
    if (this.isShowingSuccess()) return; // Đang chạy ăn mừng, không nhận click tiếp

    const target = this.currentTargetWord();
    if (!target) return;

    this.totalClicks.update(c => c + 1);

    // Kiểm tra xem khung nhấp vào có phải là từ mục tiêu hay không
    if (item.id === target.id || item.word.toLowerCase() === target.word.toLowerCase()) {
      this.wrongClickedWord.set(null);
      this.handleCorrectHit(target);
    } else {
      // Nhấp nhầm vào vật thể khác trong bối cảnh
      this.wrongClickedWord.set(item);
      this.playSfx('miss');
      this.comboMultiplier.set(1.0); // Reset combo

      const cur = this.timerSeconds();
      this.timerSeconds.set(Math.max(1, cur - 2));

      this.toast.info(
        `Đó là "${item.word}" (${item.vietnamese}), hãy tìm "${target.word}"!`,
        'Chưa Đúng (-2s)'
      );

      setTimeout(() => {
        if (this.wrongClickedWord()?.id === item.id) {
          this.wrongClickedWord.set(null);
        }
      }, 1500);
    }
  }

  // Nhấp vào vùng nền ảnh bên ngoài các khung vật thể
  onBackgroundClick(event: MouseEvent) {
    if (this.isShowingSuccess()) return;

    this.totalClicks.update(c => c + 1);
    this.playSfx('miss');
    this.comboMultiplier.set(1.0);

    const cur = this.timerSeconds();
    this.timerSeconds.set(Math.max(1, cur - 2));

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = ((event.clientX - rect.left) / rect.width) * 100;
    const clickY = ((event.clientY - rect.top) / rect.height) * 100;

    this.clickFeedback.set({
      x: clickX,
      y: clickY,
      isHit: false,
      message: 'Hãy nhấp vào một trong các khung vật thể màu trắng! (-2s)'
    });

    setTimeout(() => {
      if (this.clickFeedback()?.isHit === false) {
        this.clickFeedback.set(null);
      }
    }, 1200);
  }

  // Xử lý khi nhấp đúng đồ vật
  private handleCorrectHit(target: ContextWord) {
    this.stopTimer();
    this.isShowingSuccess.set(true);
    this.solvedWordIds.update(s => new Set(s).add(target.id));
    this.correctCount.update(c => c + 1);

    // Âm thanh chúc mừng
    this.playSfx('hit');

    // Tính điểm XP thưởng theo combo và tốc độ
    const baseScore = 25;
    const currentCombo = this.comboMultiplier();
    const timeBonus = this.timerSeconds() > 10 ? 10 : 0;
    const earnedXp = Math.round((baseScore + timeBonus) * currentCombo);
    this.lastEarnedXp.set(earnedXp);

    // Cập nhật điểm tổng
    this.totalScore.update(s => s + earnedXp);

    // Tăng combo multiplier
    const nextCombo = Math.min(3.0, +(currentCombo + 0.5).toFixed(1));
    this.comboMultiplier.set(nextCombo);
    if (nextCombo > this.maxCombo()) {
      this.maxCombo.set(nextCombo);
    }

    // Đồng bộ điểm và phiên ôn tập vào PostgreSQL thông qua /srs/review
    this.syncReviewToPostgres(target);

    // Phát âm lại từ vựng
    this.studyService.speakWord(target.word);

    // Sau 1.4s chuyển sang câu tiếp theo
    setTimeout(() => {
      this.nextQuestion();
    }, 1400);
  }

  // Bật gợi ý khu vực
  useHint() {
    if (this.isHintActive()) return;
    this.isHintActive.set(true);
    this.totalScore.update(s => Math.max(0, s - 10)); // Trừ 10 điểm gợi ý
    this.playSfx('hint');
    this.toast.info('Đã bật định vị gợi ý xung quanh vật thể!', 'Gợi Ý Thị Giác');
  }

  // Bỏ qua câu hỏi hiện tại
  skipCurrentQuestion() {
    this.stopTimer();
    this.toast.info(`Bỏ qua câu "${this.currentTargetWord()?.word}".`, 'Bỏ Qua');
    this.comboMultiplier.set(1.0);
    this.nextQuestion();
  }

  // Chuyển sang câu tiếp theo
  private nextQuestion() {
    const nextIdx = this.currentWordIndex() + 1;
    if (nextIdx < this.activeQuizQueue().length) {
      this.currentWordIndex.set(nextIdx);
      this.startQuestionRound();
    } else {
      this.finishGame();
    }
  }

  // Hoàn thành trận đấu
  private finishGame() {
    this.stopTimer();
    this.gameMode.set('VICTORY');
    this.playSfx('victory');
    this.toast.success(
      `Hoàn thành thử thách! Bạn nhận được tổng cộng +${this.totalScore()} XP vào bảng xếp hạng!`,
      'Chúc Mừng!'
    );
  }

  // Chơi lại stage hiện tại
  replayCurrentStage() {
    const stage = this.currentStage();
    if (stage) {
      this.startStage(stage);
    }
  }

  // Quay về màn hình chọn bối cảnh
  exitToStageSelect() {
    this.stopTimer();
    this.gameMode.set('SELECT_STAGE');
  }

  // Phát âm từ hiện tại
  playCurrentWordAudio() {
    const target = this.currentTargetWord();
    if (target?.word) {
      this.studyService.speakWord(target.word);
    }
  }

  // Đồng bộ kết quả vào PostgreSQL /srs/review
  private syncReviewToPostgres(word: ContextWord) {
    const userId = this.api.currentUser()?.userId || this.api.currentUser()?.id || '69f40a52-ec28-44b1-bebb-c36874a44583';
    
    // Tìm progressId từ sổ tay từ vựng đã lưu
    const saved = this.studyService.savedWords().find(w => 
      (w.word || '').trim().toLowerCase() === (word.word || '').trim().toLowerCase()
    );

    const progressIdToSend = saved?.id || (word as any).progressId || (word.id && word.id.length === 36 && word.id.includes('-') ? word.id : null);

    // Gửi review SM-2 với loại hình VISUAL_HUNT
    this.http.post<any>(`${this.baseUrl}/srs/review?userId=${userId}`, {
      progressId: progressIdToSend,
      wordText: word.word,
      ratingGrade: 5, // Nhấp đúng đồ vật biểu thị mức độ nhớ hoàn hảo
      reviewType: 'VISUAL_HUNT',
      responseTimeMs: (15 - this.timerSeconds()) * 1000
    }).subscribe({
      next: (res) => {
        if (res && res.streakCount != null) {
          this.api.updateUserStreak(res.streakCount, res.streakIncremented, res.streakMessage);
        }
        // Làm mới thống kê ngầm
        this.studyService.refreshStats();
        this.studyService.refreshDueCards();
        this.studyService.refreshSavedWords();
      },
      error: (err) => {
        // Fallback ghi nhận
        console.warn('[Quiz Review Sync] Đã ghi nhận XP nội bộ:', err);
      }
    });
  }

  // Web Audio Synthesizer cho âm thanh game chuyên nghiệp
  private playSfx(type: 'hit' | 'miss' | 'hint' | 'victory') {
    if (!this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      if (type === 'hit') {
        // Hợp âm Arpeggio thăng tiến vui tai (E5 -> G#5 -> B5 -> E6)
        const notes = [659.25, 830.61, 987.77, 1318.51];
        notes.forEach((freq, idx) => {
          const osc = this.audioCtx!.createOscillator();
          const gain = this.audioCtx!.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.18, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
          osc.connect(gain);
          gain.connect(this.audioCtx!.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.25);
        });
      } else if (type === 'miss') {
        // Âm thanh trầm nhẹ báo hiệu nhấp sai
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(130, now + 0.2);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'hint') {
        // Âm thanh lấp lánh khi bật gợi ý
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'victory') {
        // Hợp âm chiến thắng rạng rỡ (C5 -> E5 -> G5 -> C6)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = this.audioCtx!.createOscillator();
          const gain = this.audioCtx!.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.2, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.45);
          osc.connect(gain);
          gain.connect(this.audioCtx!.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + idx * 0.1 + 0.45);
        });
      }
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }
}

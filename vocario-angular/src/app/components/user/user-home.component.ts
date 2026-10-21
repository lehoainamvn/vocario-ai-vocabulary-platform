import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { UserStudyService, SrsDueCard } from '../../services/user-study.service';
import { LeaderboardEntry } from '../../models/leaderboard.model';
import { Certificate } from '../../models/certificate.model';
import { IconComponent } from '../common/icon.component';
import { CertificateModalComponent } from './certificate-modal.component';

@Component({
  selector: 'app-user-home',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent, CertificateModalComponent],
  host: {
    class: 'w-full block'
  },
  template: `
    <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10 sm:space-y-12 animate-fade-in">
      
      <!-- =========================================================================
           1. WELCOME SECTION (CHÀO BUỔI SÁNG & MỤC TIÊU HIỆN TẠI)
           ========================================================================= -->
      <section class="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2" aria-labelledby="welcome-title">
        <div>
          <span class="text-xs font-semibold uppercase tracking-wider text-[#8C827A] block mb-1.5">
            Không gian học tập cá nhân
          </span>
          <h1 id="welcome-title" class="font-serif text-3xl sm:text-4xl lg:text-[42px] font-normal text-[#2D2823] tracking-tight leading-tight">
            {{ greetingText }}, {{ userFullName }}.
          </h1>
          <p class="text-xs sm:text-sm text-[#5C5249] mt-2 max-w-xl leading-relaxed">
            Tiếp tục xây dựng vốn từ tiếng Anh từ thế giới xung quanh bạn.
          </p>
        </div>

        <!-- Khung mục tiêu CEFR hiện tại (Không đóng hộp - chỉ có vạch ngăn cách tinh tế) -->
        <div class="flex items-center gap-3.5 md:border-l md:border-[#EAE4D9] md:pl-7 shrink-0">
          <div class="w-10 h-10 rounded-full border border-[#D8D0C3] flex items-center justify-center text-[#7D6853] shrink-0">
            <app-icon name="target" [size]="20"></app-icon>
          </div>
          <div>
            <span class="text-xs text-[#8C827A] block">Mục tiêu hiện tại</span>
            <strong class="font-serif font-bold text-base sm:text-lg text-[#2D2823] block leading-tight">
              Trình độ {{ currentLevel }}
            </strong>
          </div>
        </div>
      </section>

      <!-- =========================================================================
           2. HERO REVIEW SECTION (ÔN TẬP HÔM NAY - THẺ NÂU DUY NHẤT TRÊN TRANG)
           ========================================================================= -->
      <section 
        class="w-full rounded-[4px] bg-[#7D6853] border border-[#6E5A47] text-white p-6 sm:p-7 lg:p-8 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 sm:gap-7 relative overflow-hidden" 
        aria-labelledby="review-title"
      >
        <!-- Đường cong trang trí Scandinavian hữu cơ chìm nhẹ -->
        <div class="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-white/[0.03] pointer-events-none" aria-hidden="true"></div>
        <div class="absolute -left-12 -top-12 w-64 h-64 rounded-full bg-white/[0.02] pointer-events-none" aria-hidden="true"></div>

        <!-- Khối bên trái: Lời nhắc ôn tập & Nút CTA -->
        <div class="flex-1 max-w-xl z-10">
          <span class="text-[10px] font-bold uppercase tracking-wider text-[#EAE4D9]/80 block mb-2">
            Ôn tập hôm nay
          </span>
          
          <h2 id="review-title" class="font-serif text-3xl sm:text-4xl lg:text-[38px] text-white font-normal tracking-tight leading-tight">
            <strong class="text-[#F7D147] font-serif font-bold">{{ studyService.dueCards().length }}</strong> từ cần ôn tập
          </h2>

          <p class="text-xs sm:text-sm text-white/85 mt-2.5 leading-relaxed max-w-md">
            {{ studyService.dueCards().length > 0 
              ? 'Ôn lại những từ đến hạn để củng cố trí nhớ dài hạn. Một phiên học ngắn chỉ mất khoảng 5 phút.' 
              : 'Tuyệt vời! Bạn đã hoàn thành tất cả từ cần ôn hôm nay. Hãy tiếp tục chụp ảnh hoặc khám phá thử thách để nạp từ mới.' }}
          </p>

          <!-- Nút hành động chính (Amber Primary Button) -->
          <div class="mt-5 flex flex-wrap items-center gap-2.5">
            <button 
              *ngIf="studyService.dueCards().length > 0"
              type="button" 
              (click)="openFlashcardStudyModal()"
              class="inline-flex items-center gap-2 px-5 py-3 rounded-[4px] bg-[#F7D147] hover:bg-[#ebd03b] text-[#2D2823] font-bold text-xs sm:text-sm shadow-xs transition-all duration-200 cursor-pointer border-0 active:scale-98"
            >
              <span>Bắt đầu ôn tập</span>
              <app-icon name="arrow-right" [size]="16" svgClass="text-[#2D2823]"></app-icon>
            </button>

            <a 
              *ngIf="studyService.dueCards().length === 0"
              routerLink="/scanner"
              class="inline-flex items-center gap-2 px-5 py-3 rounded-[4px] bg-[#F7D147] hover:bg-[#ebd03b] text-[#2D2823] font-bold text-xs sm:text-sm shadow-xs transition-all duration-200 no-underline active:scale-98"
            >
              <span>Khám phá từ mới qua ảnh</span>
              <app-icon name="arrow-right" [size]="16" svgClass="text-[#2D2823]"></app-icon>
            </a>
          </div>
        </div>

        <!-- Khối bên phải: Thẻ trắng nổi "TỪ XEM TRƯỚC" -->
        <div class="w-full lg:w-[380px] bg-white rounded-[4px] border border-[#E5DED3] p-5 sm:p-6 shadow-xs text-[#2D2823] z-10 shrink-0 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between pb-2.5 border-b border-[#E5DED3]/80">
              <span class="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">Từ xem trước</span>
              <button 
                type="button" 
                (click)="speakPreviewWord()"
                class="w-7 h-7 rounded-[4px] bg-[#FAF8F5] hover:bg-stone-200 text-[#7D6853] flex items-center justify-center border border-[#E5DED3] cursor-pointer transition-colors shadow-2xs"
                [title]="'Nghe phát âm từ ' + previewCard.word"
                aria-label="Nghe phát âm từ"
              >
                <app-icon name="volume-2" [size]="14" svgClass="text-[#7D6853]"></app-icon>
              </button>
            </div>

            <div class="pt-3.5 space-y-1">
              <div class="flex items-center gap-2">
                <span class="px-1.5 py-0.5 rounded-[2px] bg-[#FAF8F5] text-[#7D6853] border border-[#E5DED3] text-[10px] font-bold inline-flex items-center justify-center font-mono">
                  {{ previewCard.level }}
                </span>
              </div>
              <h3 class="font-serif text-2xl sm:text-3xl font-bold text-[#2D2823] tracking-tight">
                {{ previewCard.word }}
              </h3>
              <p class="font-mono text-xs sm:text-sm text-[#8C827A]">{{ previewCard.ipa }}</p>
            </div>

            <p class="text-sm sm:text-base font-bold text-[#2D2823] mt-2.5">
              {{ previewCard.vietnamese }}
            </p>

            <p class="font-serif italic text-xs sm:text-sm text-[#5C5249] mt-1.5 leading-relaxed">
              “{{ previewCard.exampleEn }}”
            </p>
          </div>
        </div>
      </section>

      <!-- =========================================================================
           3. SUPPORT GRID (TRÌNH BÀY LIỀN MẠCH, KHÔNG ĐÓNG HỘP CARD BỌC NGOÀI)
           ========================================================================= -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start pt-2">
        
        <!-- CỘT TRÁI (7/12): TIẾN ĐỘ & ĐẤU TRƯỜNG THỊ GIÁC AI -->
        <div class="lg:col-span-7 flex flex-col gap-10 sm:gap-12">
          
          <!-- PHẦN 1: TIẾN BỘ TỪ VỰNG (TRỰC TIẾP TRÊN NỀN, KHÔNG CARD TRẮNG ĐÓNG KHUNG) -->
          <section aria-labelledby="progress-title" class="space-y-4">
            <div class="flex items-baseline justify-between gap-4">
              <div>
                <span class="text-xs font-semibold uppercase tracking-wider text-[#8C827A] block">Mục tiêu của bạn</span>
                <h2 id="progress-title" class="font-serif text-2xl sm:text-[28px] font-normal text-[#2D2823] mt-1">
                  Tiến bộ từ vựng {{ currentLevel }}
                </h2>
              </div>
              <span class="inline-flex items-center gap-1.5 text-xs text-[#746B60] shrink-0">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Thời gian thực</span>
              </span>
            </div>

            <div class="flex items-baseline justify-between pt-2">
              <div class="flex items-baseline gap-1.5">
                <strong class="font-serif text-3xl font-bold text-[#2D2823]">
                  {{ masteredCount }}
                </strong>
                <span class="text-xs sm:text-sm text-[#5C5249]">từ đã thành thạo</span>
              </div>
              <p class="text-xs sm:text-sm text-[#5C5249]">
                <strong class="font-bold text-[#2D2823]">{{ totalWords }}</strong> từ trong bộ sưu tập
              </p>
            </div>

            <!-- Thanh tiến trình nằm thanh thoát trên nền -->
            <div 
              class="w-full bg-[#E5DFD4] rounded-full h-2 overflow-hidden my-3"
              role="progressbar"
              [attr.aria-valuenow]="masteredCount"
              [attr.aria-valuemin]="0"
              [attr.aria-valuemax]="totalWords"
            >
              <div 
                class="bg-[#7D6853] h-full rounded-full transition-all duration-500"
                [style.width.%]="completionPercentage"
              ></div>
            </div>

            <div class="flex items-center justify-between text-xs text-[#8C827A] pb-2 border-b border-[#E5DED3]">
              <span>Đã thành thạo ({{ completionPercentage }}%)</span>
              <span>Tiếp tục học thêm {{ remainingWordsToTarget }} từ để đạt chuẩn</span>
            </div>

            <!-- MA TRẬN 5 TẦNG TIẾN ĐỘ CEFR & CHỨNG CHỈ TÍCH LŨY -->
            <div class="space-y-2.5 pt-1">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold uppercase tracking-wider text-[#746B60]">
                  Tiến độ từng dải năng lực & Chứng chỉ CEFR
                </span>
                <span class="text-[10px] text-[#8C827A]">
                  Tự động ghi nhận qua Camera & Tài liệu
                </span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                <div 
                  *ngFor="let tier of cefrTiers"
                  class="p-2.5 rounded-[4px] border border-[#E5DED3] bg-white space-y-2 transition-all hover:border-[#7D6853]"
                  [class.ring-1]="tier.level === currentLevel"
                  [class.ring-[#7D6853]]="tier.level === currentLevel"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-mono text-xs font-bold text-[#2D2823]">{{ tier.level }}</span>
                    <span class="text-[10px] text-[#746B60]">{{ tier.label }}</span>
                  </div>

                  <!-- Mini Progress Bar -->
                  <div class="w-full bg-[#E5DFD4] rounded-full h-1.5 overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all duration-500"
                      [style.backgroundColor]="tier.color"
                      [style.width.%]="getTierPercentage(tier.level)"
                    ></div>
                  </div>

                  <div class="flex items-center justify-between text-[10px] text-[#746B60]">
                    <span>{{ getTierMastered(tier.level) }} từ</span>
                    <span class="font-mono font-medium">{{ getTierPercentage(tier.level) }}%</span>
                  </div>

                  <!-- Nút Chứng Chỉ -->
                  <div class="pt-0.5">
                    <!-- Trạng thái 1: Đã có chứng chỉ chính thức -->
                    <button 
                      *ngIf="getCertForLevel(tier.level) as cert"
                      type="button"
                      (click)="viewOfficialCertificate(cert)"
                      class="w-full py-1 px-1.5 rounded-[2px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-semibold flex items-center justify-center gap-1 border border-emerald-300 cursor-pointer transition-colors"
                      title="Xem chứng chỉ CEFR chính thức"
                    >
                      <app-icon name="award" [size]="11" svgClass="text-emerald-700"></app-icon>
                      <span>Xem chứng chỉ</span>
                    </button>

                    <!-- Trạng thái 2: Chưa có chứng chỉ nhưng ĐÃ ĐẠT 100% -->
                    <button 
                      *ngIf="!getCertForLevel(tier.level) && getTierPercentage(tier.level) >= 100"
                      type="button"
                      (click)="claimCertificate(tier.level)"
                      class="w-full py-1 px-1.5 rounded-[2px] bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold flex items-center justify-center gap-1 border border-amber-700 cursor-pointer transition-all shadow-2xs active:scale-95"
                      title="Nhận chứng chỉ chính thức (Đã đạt 100%)"
                    >
                      <app-icon name="award" [size]="11" svgClass="text-white"></app-icon>
                      <span>Nhận chứng chỉ</span>
                    </button>

                    <!-- Trạng thái 3: Chưa đạt 100% -> CHỈ ĐƯỢC XEM TRƯỚC BẢN NHÁP (KHÓA TẢI VỀ) -->
                    <button 
                      *ngIf="!getCertForLevel(tier.level) && getTierPercentage(tier.level) < 100"
                      type="button"
                      (click)="previewDraftCertificate(tier.level)"
                      class="w-full py-1 px-1.5 rounded-[2px] bg-[#FAF8F5] hover:bg-[#E5DED3] text-[#746B60] hover:text-[#2D2823] text-[10px] font-medium flex items-center justify-center gap-1 border border-[#E5DED3] cursor-pointer transition-colors"
                      title="Xem trước bản nháp chứng chỉ (Chưa đạt 100%)"
                    >
                      <app-icon name="eye" [size]="11"></app-icon>
                      <span>Xem trước</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- PHẦN 2: ĐẤU TRƯỜNG THỊ GIÁC AI (KHÔNG CARD BỌC - CHỈ CÓ KHUNG ẢNH VIEW FINDER) -->
          <section aria-labelledby="arena-title" class="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 pt-2">
            
            <!-- Khung hình minh họa AI Detection Viewfinder (Khung màu cát nhạt chuẩn Screenshot 2) -->
            <div class="w-full sm:w-[220px] h-[190px] rounded-[4px] bg-[#E0D7CB] border border-[#D5CBBE] relative flex items-center justify-center p-4 overflow-hidden shrink-0 select-none" aria-hidden="true">
              <!-- 2 góc L-bracket Focus Corners trắng đối xứng chéo -->
              <div class="absolute top-3 left-3 w-3.5 h-3.5 border-t-2 border-l-2 border-white"></div>
              <div class="absolute bottom-3 right-3 w-3.5 h-3.5 border-b-2 border-r-2 border-white"></div>

              <!-- Hộp Bounding Box nhận diện AI nét mảnh -->
              <div class="w-28 h-36 border border-stone-500/30 rounded-[2px] relative flex items-center justify-center">
                <!-- Tag nhãn vật thể AI "lamp" -->
                <div class="absolute -top-3 left-2 px-2 py-0.5 rounded-[2px] bg-[#2D2823] text-white text-[10px] font-mono font-medium flex items-center gap-1.5 shadow-xs">
                  <span>lamp</span>
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                </div>

                <!-- Đèn bàn Vector Scandinavian chuẩn xác theo bản vẽ Figma -->
                <svg class="w-16 h-24" viewBox="0 0 64 96" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <!-- Chụp đèn vàng hổ phách -->
                  <polygon points="18,18 46,18 56,48 8,48" fill="#F7D147"/>
                  <!-- Thân đèn gỗ tối màu -->
                  <rect x="30" y="48" width="4" height="28" fill="#5C4D3E" rx="1"/>
                  <!-- Chân đế đèn -->
                  <ellipse cx="32" cy="78" rx="16" ry="5" fill="#5C4D3E"/>
                </svg>
              </div>
            </div>

            <!-- Nội dung lời giới thiệu Đấu Trường -->
            <div class="flex-1 flex flex-col justify-between">
              <div>
                <span class="text-xs font-semibold uppercase tracking-wider text-[#8C827A] block">Học qua thị giác</span>
                <h2 id="arena-title" class="font-serif text-2xl sm:text-[28px] font-normal text-[#2D2823] mt-1">
                  Đấu trường thị giác AI
                </h2>
                <p class="text-xs sm:text-sm text-[#5C5249] mt-2 leading-relaxed max-w-sm">
                  Quan sát hình ảnh, nhận diện đồ vật và ghi nhớ từ vựng qua thử thách.
                </p>
              </div>

              <div class="mt-5">
                <a 
                  routerLink="/quiz"
                  class="inline-flex items-center gap-2 px-5 py-2.5 rounded-[4px] bg-[#6B5744] hover:bg-[#5A4939] text-white font-bold text-xs sm:text-sm shadow-xs transition-all no-underline active:scale-98"
                >
                  <span>Khám phá thử thách</span>
                  <app-icon name="arrow-right" [size]="16" svgClass="text-white"></app-icon>
                </a>
              </div>
            </div>

          </section>

        </div>

        <!-- CỘT PHẢI (5/12): XẾP HẠNG TUẦN (NGĂN CÁCH BẰNG VẠCH KẺ DỌC MẢNH, KHÔNG HỘP CARD BỌC) -->
        <div class="lg:col-span-5 lg:border-l lg:border-[#EAE4D9] lg:pl-10 xl:pl-12">
          <section aria-labelledby="ranking-title" class="flex flex-col justify-between min-h-[360px]">
            
            <div>
              <!-- Tiêu đề phần xếp hạng với biểu tượng cúp vòng tròn -->
              <div class="flex items-center gap-3 pb-6">
                <div class="w-10 h-10 rounded-full border border-[#D8D0C3] flex items-center justify-center text-[#7D6853] shrink-0">
                  <app-icon name="trophy" [size]="20"></app-icon>
                </div>
                <div>
                  <span class="text-xs font-semibold uppercase tracking-wider text-[#8C827A] block">Cộng đồng</span>
                  <h2 id="ranking-title" class="font-serif text-2xl sm:text-[28px] font-normal text-[#2D2823] mt-0.5">
                    Xếp hạng tuần
                  </h2>
                </div>
              </div>

              <!-- Khi ĐÃ CÓ DỮ LIỆU XẾP HẠNG TUẦN -->
              <div *ngIf="weeklyTopThree().length > 0; else emptyStateTpl" class="pt-1 pb-4 space-y-2.5">
                <div 
                  *ngFor="let user of weeklyTopThree()"
                  class="flex items-center justify-between p-2.5 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5]/80 transition-all hover:bg-white"
                  [class.border-amber-400]="user.rank === 1"
                  [class.bg-amber-50\/20]="user.rank === 1"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <span 
                      class="w-6 h-6 rounded-[2px] font-mono text-xs font-bold flex items-center justify-center shrink-0"
                      [class.bg-amber-400]="user.rank === 1"
                      [class.text-amber-950]="user.rank === 1"
                      [class.bg-[#EAE5DC]]="user.rank > 1"
                      [class.text-[#5C5249]]="user.rank > 1"
                    >
                      #{{ user.rank }}
                    </span>

                    <div class="min-w-0">
                      <p class="font-serif font-bold text-xs sm:text-[13px] text-[#2D2823] truncate m-0">
                        {{ user.fullName || user.username }}
                        <span *ngIf="user.isCurrentUser" class="text-[10px] text-[#7D6853] font-sans font-medium"> (Bạn)</span>
                      </p>
                      <p class="text-[11px] text-[#8C827A] font-mono m-0">
                        {{ user.targetLevel }} · {{ user.streakCount }} ngày chuỗi
                      </p>
                    </div>
                  </div>

                  <div class="text-right shrink-0">
                    <span class="font-mono font-bold text-xs sm:text-[13px] text-[#7D6853] block">
                      {{ user.xp | number }} XP
                    </span>
                  </div>
                </div>
              </div>

              <!-- Trạng thái trống (Empty State) khi chưa có ai đạt XP tuần này -->
              <ng-template #emptyStateTpl>
                <div class="pt-4 pb-6 space-y-2">
                  <p class="font-serif font-semibold text-[#2D2823] text-base leading-snug">
                    Chưa có dữ liệu xếp hạng cho tuần này.
                  </p>
                  <p class="text-xs text-[#5C5249] leading-relaxed max-w-xs">
                    Hoàn thành một phiên học để bắt đầu tích lũy XP và xuất hiện trên bảng xếp hạng.
                  </p>
                </div>
              </ng-template>
            </div>

            <!-- Liên kết xem thể lệ xếp hạng -->
            <div class="pt-4">
              <a 
                routerLink="/leaderboard"
                class="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#7D6853] hover:text-[#5C4533] no-underline transition-colors group"
              >
                <span>Xem thể lệ xếp hạng</span>
                <app-icon name="chevron-right" [size]="15" svgClass="transition-transform group-hover:translate-x-0.5"></app-icon>
              </a>
            </div>

          </section>
        </div>

      </div>

    </div>

    <!-- =========================================================================
         4. MODAL ÔN TẬP FLASHCARD SM-2 TƯƠNG TÁC (KHI BẤM "BẮT ĐẦU ÔN TẬP")
         ========================================================================= -->
    <div 
      *ngIf="isStudyingModalOpen() && currentCard" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none"
    >
      <div class="bg-white rounded-[4px] border border-[#E5DED3] max-w-md w-full p-5 sm:p-6 shadow-xl space-y-4">
        
        <!-- Header Modal -->
        <div class="flex items-center justify-between pb-3 border-b border-[#E5DED3]">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-[#7D6853] bg-[#FAF8F5] px-2 py-0.5 rounded-[2px] border border-[#E5DED3]">
              Thẻ {{ currentCardIndex + 1 }} / {{ studyService.dueCards().length }}
            </span>
            <span class="text-xs text-[#5C5249] font-mono">{{ currentCard.level }} • {{ currentCard.partOfSpeech }}</span>
          </div>

          <button 
            type="button" 
            (click)="closeStudyModal()"
            class="w-7 h-7 rounded-[4px] bg-[#FAF8F5] hover:bg-[#E5DED3]/60 text-[#5C5249] flex items-center justify-center border border-[#E5DED3] cursor-pointer transition-colors"
          >
            <app-icon name="x" [size]="13"></app-icon>
          </button>
        </div>

        <!-- Thân Thẻ Flashcard -->
        <div class="py-5 text-center space-y-2.5 bg-[#FAF8F5] rounded-[4px] border border-[#E5DED3] p-4">
          <h3 class="font-serif font-bold text-3xl text-[#2D2823] tracking-tight">
            {{ currentCard.word }}
          </h3>
          <p class="font-mono text-xs text-[#5C5249]">{{ currentCard.ipa }}</p>

          <button 
            type="button" 
            (click)="studyService.speakWord(currentCard.word)"
            class="py-1.5 px-3 rounded-[4px] bg-white hover:bg-stone-100 border border-[#E5DED3] text-[#7D6853] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
          >
            <app-icon name="volume-2" [size]="13"></app-icon>
            <span>Nghe Phát Âm</span>
          </button>

          <!-- Mặt Sau: Nghĩa & Ví Dụ (Hiện khi bấm Lật Thẻ) -->
          <div *ngIf="isFlipped()" class="pt-3.5 mt-2.5 border-t border-[#E5DED3] space-y-1.5 animate-fade-in">
            <p class="text-base font-bold text-[#7D6853]">{{ currentCard.vietnamese }}</p>
            <p *ngIf="currentCard.exampleEn" class="text-xs italic text-[#2D2823] max-w-sm mx-auto">
              "{{ currentCard.exampleEn }}"
            </p>
            <p *ngIf="currentCard.exampleVi" class="text-xs text-[#5C5249]">
              {{ currentCard.exampleVi }}
            </p>
          </div>
        </div>

        <!-- Nút Lật Thẻ (Khi chưa lật) -->
        <div *ngIf="!isFlipped()">
          <button 
            type="button" 
            (click)="isFlipped.set(true)"
            class="w-full py-2.5 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white font-bold text-xs sm:text-sm cursor-pointer border-0 shadow-xs transition-all"
          >
            Xem Dịch Nghĩa & Ví Dụ
          </button>
        </div>

        <!-- Các Nút Đánh Giá Mức Độ Ghi Nhớ SM-2 (Hiện sau khi lật thẻ) -->
        <div *ngIf="isFlipped()" class="grid grid-cols-3 gap-2 pt-1">
          <button 
            type="button" 
            (click)="submitReview(1)"
            class="py-2 px-2 rounded-[4px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 cursor-pointer transition-colors"
          >
            Chưa Nhớ
          </button>
          <button 
            type="button" 
            (click)="submitReview(3)"
            class="py-2 px-2 rounded-[4px] bg-[#FAF8F5] hover:bg-amber-100 text-[#7D6853] font-bold text-xs border border-[#E5DED3] cursor-pointer transition-colors"
          >
            Nhớ Tốt
          </button>
          <button 
            type="button" 
            (click)="submitReview(5)"
            class="py-2 px-2 rounded-[4px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 cursor-pointer transition-colors"
          >
            Rất Dễ
          </button>
        </div>

      </div>
    </div>

    <!-- MODAL XEM & IN CHỨNG CHỈ CEFR -->
    <app-certificate-modal 
      [certificate]="activeCertificate()" 
      [isPreview]="isCertPreview()"
      [progressPercent]="certPreviewProgress()"
      [isCelebration]="isCertCelebration()"
      (close)="closeCertificateModal()"
    ></app-certificate-modal>
  `
})
export class UserHomeComponent implements OnInit {
  public api = inject(ApiService);
  public studyService = inject(UserStudyService);
  public toast = inject(ToastService);
  private router = inject(Router);

  weeklyTopThree = signal<LeaderboardEntry[]>([]);
  myRank = signal<LeaderboardEntry | null>(null);

  isStudyingModalOpen = signal(false);
  currentCardIndex = 0;
  isFlipped = signal(false);

  // Trạng thái Quản lý Chứng Chỉ & Bản Xem Trước
  activeCertificate = signal<Certificate | null>(null);
  myCertificates = signal<Certificate[]>([]);
  isCertPreview = signal<boolean>(false);
  certPreviewProgress = signal<number>(0);
  isCertCelebration = signal<boolean>(false);

  cefrTiers = [
    { level: 'A1', label: 'Sơ cấp', color: '#059669', threshold: 500 },
    { level: 'A2', label: 'Cơ bản', color: '#D97706', threshold: 1000 },
    { level: 'B1', label: 'Trung cấp', color: '#4F46E5', threshold: 2000 },
    { level: 'B2', label: 'Nâng cao', color: '#7C3AED', threshold: 4000 },
    { level: 'C1', label: 'Tinh anh', color: '#B45309', threshold: 8000 }
  ];

  ngOnInit() {
    this.studyService.fetchTargetProgress();
    this.studyService.refreshStats();
    this.studyService.refreshDueCards();
    this.loadLeaderboardPreview();
    this.loadCertificates();
  }

  loadCertificates() {
    this.api.getMyCertificates().subscribe({
      next: (list) => {
        this.myCertificates.set(list || []);
        // Kiểm tra đạt 100% để hiển thị thông báo mừng (CHỈ HIỂN THỊ 1 LẦN DUY NHẤT)
        this.checkAutoCertificateMilestones();
      },
      error: () => this.myCertificates.set([])
    });
  }

  /**
   * Tự động bật thông báo nhận chứng chỉ khi học viên đạt 100% tiến độ.
   * Sử dụng localStorage để đảm bảo CHỈ HIỂN THỊ 1 LẦN DUY NHẤT.
   */
  checkAutoCertificateMilestones() {
    const user = this.api.currentUser();
    const userId = user?.id || user?.username || 'vocario_learner';

    for (const tier of this.cefrTiers) {
      const pct = this.getTierPercentage(tier.level);
      if (pct >= 100) {
        const storageKey = `vocario_cert_notified_${userId}_${tier.level}`;
        const alreadyNotified = localStorage.getItem(storageKey);

        if (!alreadyNotified) {
          // Đánh dấu đã thông báo để không bao giờ hiện lại tự động
          localStorage.setItem(storageKey, 'true');

          const existingCert = this.getCertForLevel(tier.level);
          if (existingCert) {
            this.activeCertificate.set(existingCert);
            this.isCertPreview.set(false);
            this.certPreviewProgress.set(100);
            this.isCertCelebration.set(true);
          } else {
            // Tự động yêu cầu phát hành chứng chỉ
            this.api.claimCertificate(tier.level).subscribe({
              next: (cert) => {
                this.loadCertificates();
                this.activeCertificate.set(cert);
                this.isCertPreview.set(false);
                this.certPreviewProgress.set(100);
                this.isCertCelebration.set(true);
              },
              error: () => {}
            });
          }
          break; // Chỉ bật popup mừng 1 chứng chỉ cao nhất tại 1 thời điểm
        }
      }
    }
  }

  getCertForLevel(level: string): Certificate | null {
    return this.myCertificates().find(c => c.cefrLevel?.toUpperCase() === level.toUpperCase()) || null;
  }

  getTierMastered(level: string): number {
    const breakdowns = this.studyService.targetProgress()?.levelBreakdowns || [];
    const b = breakdowns.find(item => item.level?.toUpperCase() === level.toUpperCase());
    return b ? b.masteredCount : 0;
  }

  getTierPercentage(level: string): number {
    const mastered = this.getTierMastered(level);
    if (mastered === 0) return 0;
    // Chế độ thử nghiệm mốc 10 từ/level để phục vụ demo trực quan đồ án tốt nghiệp
    return Math.min(100, Math.round((mastered / 10) * 100));
  }

  /**
   * Mở chế độ xem trước bản nháp cho cấp độ chưa đạt 100%
   * Tự động phủ watermark chìm, khóa tải về và chống sao chép.
   */
  previewDraftCertificate(level: string) {
    const pct = this.getTierPercentage(level);
    const draftCert: Certificate = {
      id: 'preview-' + level,
      userId: this.api.currentUser()?.id || '',
      username: this.api.currentUser()?.username || 'hocvien',
      userFullName: this.userFullName,
      userEmail: this.api.currentUser()?.email || 'user@vocario.com',
      cefrLevel: level,
      certificateCode: `VOC-${level}-DRAFT`,
      title: `Chứng Chỉ Tinh Thông Chuẩn Từ Vựng CEFR ${level}`,
      issueDate: new Date().toISOString(),
      masteredWordsCount: this.getTierMastered(level),
      streakCount: this.api.currentUser()?.streakCount || 0,
      status: 'DRAFT',
      approvedBy: 'Hội Đồng Khảo Thí & Đào Tạo Vocario (Bản Nháp)'
    };

    this.activeCertificate.set(draftCert);
    this.isCertPreview.set(true);
    this.certPreviewProgress.set(pct);
    this.isCertCelebration.set(false);
  }

  /**
   * Xem chứng chỉ chính thức hợp lệ khi đã đạt chuẩn hoặc đã được phát hành
   */
  viewOfficialCertificate(cert: Certificate) {
    this.activeCertificate.set(cert);
    this.isCertPreview.set(false);
    this.certPreviewProgress.set(100);
    this.isCertCelebration.set(false);
  }

  closeCertificateModal() {
    this.activeCertificate.set(null);
    this.isCertPreview.set(false);
    this.isCertCelebration.set(false);
  }

  claimCertificate(level: string) {
    this.api.claimCertificate(level).subscribe({
      next: (cert) => {
        this.toast.success(`Chúc mừng! Chứng chỉ CEFR ${level} của bạn đã được phát hành thành công.`, 'Chứng Chỉ Xuất Sắc');
        this.loadCertificates();
        this.activeCertificate.set(cert);
        this.isCertPreview.set(false);
        this.certPreviewProgress.set(100);
        this.isCertCelebration.set(false);
      },
      error: () => {
        this.toast.error('Không thể yêu cầu cấp chứng chỉ lúc này. Vui lòng thử lại sau.');
      }
    });
  }

  loadLeaderboardPreview() {
    this.api.getLeaderboard('weekly', 'ALL', 0, 3).subscribe({
      next: (res) => {
        this.weeklyTopThree.set(res.podium || res.topUsers.slice(0, 3));
        this.myRank.set(res.currentUserRank);
      },
      error: () => {
        this.weeklyTopThree.set([]);
      }
    });
  }

  get greetingText(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  }

  get userFullName(): string {
    return this.api.currentUser()?.fullName || this.api.currentUser()?.username || 'Nguyễn Văn Nam';
  }

  get currentLevel(): string {
    return this.studyService.targetProgress()?.currentLevel || this.api.currentUser()?.targetLevel || 'B2';
  }

  get previewCard(): { word: string; ipa: string; vietnamese: string; level: string; exampleEn: string; exampleVi: string } {
    const due = this.studyService.dueCards();
    if (due.length > 0) {
      const first = due[0];
      return {
        word: first.word,
        ipa: first.ipa || '/ˈbʊk.ʃelf/',
        vietnamese: first.vietnamese || 'kệ sách',
        level: first.level || this.currentLevel,
        exampleEn: first.exampleEn || 'The dictionary is on the top shelf.',
        exampleVi: first.exampleVi || 'Từ điển nằm ở ngăn trên cùng của kệ sách.'
      };
    }
    return {
      word: 'bookshelf',
      ipa: '/ˈbʊk.ʃelf/',
      vietnamese: 'kệ sách',
      level: this.currentLevel,
      exampleEn: 'The dictionary is on the top shelf.',
      exampleVi: 'Từ điển nằm ở ngăn trên cùng của kệ sách.'
    };
  }

  speakPreviewWord() {
    if (this.previewCard?.word) {
      this.studyService.speakWord(this.previewCard.word);
    }
  }

  get masteredCount(): number {
    return this.studyService.targetProgress()?.masteredWordsAtLevel ?? this.studyService.stats().masteredCount ?? 6;
  }

  get totalWords(): number {
    const count = this.studyService.stats().totalWords;
    return count > 0 ? count : 15;
  }

  get completionPercentage(): number {
    if (this.studyService.targetProgress()?.completionPercentage !== undefined) {
      return this.studyService.targetProgress()!.completionPercentage;
    }
    return this.totalWords > 0 ? Math.round((this.masteredCount / this.totalWords) * 100) : 40;
  }

  get remainingWordsToTarget(): number {
    const threshold = this.studyService.targetProgress()?.masteryThreshold ?? 1000;
    const diff = threshold - this.masteredCount;
    return diff > 0 ? diff : 0;
  }

  get currentCard(): SrsDueCard | null {
    const list = this.studyService.dueCards();
    return list[this.currentCardIndex] || null;
  }

  openFlashcardStudyModal() {
    if (this.studyService.dueCards().length === 0) {
      this.toast.info('Bạn đã hoàn thành hết các thẻ cần ôn hôm nay!', 'Hoàn Tất');
      return;
    }
    this.currentCardIndex = 0;
    this.isFlipped.set(false);
    this.isStudyingModalOpen.set(true);
  }

  closeStudyModal() {
    this.isStudyingModalOpen.set(false);
    this.isFlipped.set(false);
  }

  submitReview(grade: number) {
    const card = this.currentCard;
    if (!card) return;

    this.studyService.reviewCard(card.id, grade);
    this.isFlipped.set(false);

    if (this.currentCardIndex < this.studyService.dueCards().length - 1) {
      this.currentCardIndex++;
    } else {
      this.toast.success('Chúc mừng! Bạn đã hoàn thành tất cả thẻ cần ôn tập hôm nay.', 'Hoàn Thành Xuất Sắc');
      this.closeStudyModal();
    }
  }
}


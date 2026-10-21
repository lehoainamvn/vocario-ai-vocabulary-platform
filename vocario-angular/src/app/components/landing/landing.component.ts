import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IconComponent } from '../common/icon.component';
import { ApiService } from '../../services/api.service';
import { UserStudyService } from '../../services/user-study.service';

interface StudioSpotlight {
  id: string;
  word: string;
  ipa: string;
  level: string;
  vietnamese: string;
  top: number;
  left: number;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="w-full flex flex-col items-center bg-[#F8F6F1] text-[#29251F] select-none">
      
      <!-- =========================================================================
           1. HERO SECTION
           ========================================================================= -->
      <section id="home" class="w-full max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-10 pt-16 sm:pt-20 pb-16 animate-fade-in">
        <div class="max-w-3xl">
          <span class="text-[10px] font-bold uppercase tracking-[0.11em] text-[#7D6853] block mb-3">
            English begins in the world you already know
          </span>

          <h1 class="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[54px] font-normal text-[#29251F] tracking-tight leading-[1.12] m-0">
            Biến mọi thứ xung quanh bạn thành vốn từ vựng bạn thực sự nói ra.
          </h1>

          <p class="text-sm sm:text-base text-[#746B60] leading-relaxed max-w-2xl mt-5 mb-0">
            Chụp ảnh thế giới đời thực và thẻ ghi nhớ sẽ tự động được tạo ra. Không cần danh sách từ khô khan — vốn từ luôn sẵn sàng khi bạn muốn cất lời.
          </p>

          <!-- CTA Buttons -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-8">
            <button 
              type="button" 
              (click)="api.openAuthModal('login')"
              class="h-12 px-7 rounded-[10px] bg-[#7D6853] hover:bg-[#685542] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 border-0 shadow-2xs"
            >
              <span>Bắt đầu trải nghiệm miễn phí</span>
              <app-icon name="arrow-right" [size]="14"></app-icon>
            </button>

            <button 
              type="button" 
              (click)="scrollToMethodology()"
              class="h-12 px-6 rounded-[10px] bg-white hover:bg-[#FAF7F2] border border-[#E5DED3] text-[#29251F] font-semibold text-xs sm:text-sm flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-2xs"
            >
              Khám phá phương pháp học
            </button>
          </div>

          <!-- Feature checkmarks under buttons -->
          <div class="flex items-center gap-6 pt-5 text-xs text-[#746B60]">
            <span class="flex items-center gap-1.5">
              <span class="text-emerald-700 font-bold">✓</span>
              <span>Không cần nhập danh sách từ</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="text-emerald-700 font-bold">✓</span>
              <span>Ôn tập theo SuperMemo SM-2</span>
            </span>
          </div>
        </div>
      </section>

      <!-- =========================================================================
           2. INTERACTIVE AI VISION STUDIO
           ========================================================================= -->
      <section id="studio" class="w-full max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-10 pb-20">
        
        <!-- Header row -->
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5">
          <div>
            <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#7D6853] block mb-1">
              Interactive AI vision studio
            </span>
            <h2 class="font-serif text-2xl sm:text-3xl font-semibold text-[#29251F] tracking-tight m-0">
              Nhìn thấy từ vựng ngay trong bối cảnh thật
            </h2>
          </div>

          <div class="flex items-center gap-2 text-xs text-[#746B60]">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>1641 vật thể đang được nhận diện</span>
          </div>
        </div>

        <!-- Viewfinder Image Container -->
        <div class="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[580px] rounded-2xl overflow-hidden bg-[#29251F] border border-[#E5DED3] shadow-md group select-none">
          
          <img 
            src="/living_room.jpg" 
            alt="Real-world cozy living room scene" 
            class="w-full h-full object-cover select-none pointer-events-none"
          />

          <!-- Viewfinder Corner Brackets -->
          <div class="absolute top-5 left-5 w-6 h-6 border-t-2 border-l-2 border-white/80 pointer-events-none"></div>
          <div class="absolute top-5 right-5 w-6 h-6 border-t-2 border-r-2 border-white/80 pointer-events-none"></div>
          <div class="absolute bottom-5 left-5 w-6 h-6 border-b-2 border-l-2 border-white/80 pointer-events-none"></div>
          <div class="absolute bottom-5 right-5 w-6 h-6 border-b-2 border-r-2 border-white/80 pointer-events-none"></div>

          <!-- Interactive Target Spots -->
          <ng-container *ngFor="let spot of spotlights">
            
            <!-- Target Circle with Pulse -->
            <button
              type="button"
              (click)="selectSpot(spot)"
              class="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0 z-20 group/spot"
              [style.top.%]="spot.top"
              [style.left.%]="spot.left"
              [attr.aria-label]="spot.word"
            >
              <span class="relative flex h-7 w-7 items-center justify-center">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60"></span>
                <span class="relative inline-flex rounded-full h-4 w-4 bg-white border-2 border-amber-600 shadow-md transition-transform group-hover/spot:scale-125"></span>
              </span>
            </button>

            <!-- Popover Card for Active Spot -->
            <div 
              *ngIf="activeSpot().id === spot.id"
              class="absolute z-30 -translate-x-1/2 -translate-y-full mb-3 bg-white rounded-xl border border-[#E5DED3] p-4 shadow-lg min-w-[200px] animate-fade-in pointer-events-auto"
              [style.top.%]="spot.top - 2"
              [style.left.%]="spot.left"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h3 class="font-serif text-base font-semibold text-[#29251F] leading-tight m-0">
                    {{ spot.word }}
                  </h3>
                  <span class="text-[11px] text-[#746B60] block mt-0.5">{{ spot.ipa }}</span>
                  <div class="mt-1 flex items-center gap-1.5">
                    <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#EAE5DC] text-[#746B60]">
                      {{ spot.level }}
                    </span>
                    <span class="text-xs text-[#29251F] font-medium">{{ spot.vietnamese }}</span>
                  </div>
                </div>

                <!-- Speaker audio button -->
                <button 
                  type="button"
                  (click)="speakWord(spot.word)"
                  class="w-8 h-8 rounded-lg bg-[#FAF7F2] hover:bg-[#EAE5DC] text-[#7D6853] flex items-center justify-center cursor-pointer border border-[#E5DED3] transition-colors shrink-0"
                  title="Nghe phát âm chuẩn US"
                >
                  <app-icon name="volume-2" [size]="14"></app-icon>
                </button>
              </div>

              <!-- Little arrow pointer under popover -->
              <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b border-r border-[#E5DED3] rotate-45 pointer-events-none"></div>
            </div>

          </ng-container>

          <!-- Bottom Caption -->
          <div class="absolute bottom-4 right-5 text-[10px] text-white/70 font-sans pointer-events-none">
            Ảnh: KaChiKa Interior / Unsplash
          </div>

        </div>
      </section>

      <!-- =========================================================================
           3. EDITORIAL QUOTE BANNER (TRIẾT LÝ HỌC TẬP TỰ NHIÊN)
           ========================================================================= -->
      <section id="story" class="w-full bg-[#F1ECE3] border-y border-[#E5DED3] py-20 px-4 sm:px-8 text-center select-none">
        <div class="max-w-3xl mx-auto">
          <span class="text-[10px] font-bold uppercase tracking-[0.11em] text-[#7D6853] block mb-4">
            Triết lý học tập tự nhiên
          </span>

          <h2 class="font-serif text-2xl sm:text-3xl md:text-4xl font-normal text-[#29251F] leading-snug m-0">
            “Thế giới xung quanh bạn chính là cuốn giáo trình chân thực nhất.”
          </h2>

          <p class="text-xs sm:text-sm text-[#746B60] leading-relaxed max-w-2xl mx-auto mt-5 mb-0">
            Mỗi đồ vật trong góc bếp hay bàn học đều gắn liền với một phản xạ đời sống. Khi kết hợp hình ảnh thị giác với âm thanh bản xứ, từ vựng sẽ chuyển hóa thành phản xạ tự nhiên thay vì ghi nhớ gượng ép.
          </p>
        </div>
      </section>

      <!-- =========================================================================
           4. THREE CORE PILLARS (01, 02, 03)
           ========================================================================= -->
      <section id="features" class="w-full max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-10 py-20">
        
        <div class="max-w-2xl mb-12">
          <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#7D6853] block mb-1">
            From vision to expression
          </span>
          <h2 class="font-serif text-2xl sm:text-3xl font-semibold text-[#29251F] tracking-tight m-0">
            Phương pháp học tự nhiên từ thị giác đến phản xạ
          </h2>
          <p class="text-xs sm:text-sm text-[#746B60] mt-2 mb-0">
            Sự kết hợp giữa trí tuệ nhân tạo thị giác và khoa học ghi nhớ Ebbinghaus.
          </p>
        </div>

        <!-- 3 Columns with Dividers -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-[#E5DED3]">
          
          <!-- Pillar 01 -->
          <div class="space-y-4 md:border-r md:border-[#E5DED3] md:pr-8 last:border-r-0">
            <div class="flex items-center gap-3">
              <span class="font-serif text-xs font-semibold text-[#7D6853]">01</span>
              <div class="h-[1px] w-8 bg-[#E5DED3]"></div>
            </div>
            <div class="w-10 h-10 rounded-full border border-[#E5DED3] bg-white text-[#746B60] flex items-center justify-center">
              <app-icon name="eye" [size]="18"></app-icon>
            </div>
            <div>
              <span class="text-[9px] font-bold uppercase tracking-wider text-[#746B60] block mb-1">Quan sát</span>
              <h3 class="font-serif text-lg font-semibold text-[#29251F] leading-snug m-0">
                Bóc tách vật thể đa ngữ cảnh
              </h3>
            </div>
            <p class="text-xs text-[#746B60] leading-relaxed m-0">
              Tự động phát hiện đồ vật qua camera đời thực, gắn mã từ vựng kèm phiên âm chuẩn IPA và phân cấp độ CEFR.
            </p>
          </div>

          <!-- Pillar 02 -->
          <div class="space-y-4 md:border-r md:border-[#E5DED3] md:pr-8 last:border-r-0">
            <div class="flex items-center gap-3">
              <span class="font-serif text-xs font-semibold text-[#7D6853]">02</span>
              <div class="h-[1px] w-8 bg-[#E5DED3]"></div>
            </div>
            <div class="w-10 h-10 rounded-full border border-[#E5DED3] bg-white text-[#746B60] flex items-center justify-center">
              <app-icon name="globe-grid" [size]="18"></app-icon>
            </div>
            <div>
              <span class="text-[9px] font-bold uppercase tracking-wider text-[#746B60] block mb-1">Khắc sâu</span>
              <h3 class="font-serif text-lg font-semibold text-[#29251F] leading-snug m-0">
                Thuật toán ngắt quãng SM-2
              </h3>
            </div>
            <p class="text-xs text-[#746B60] leading-relaxed m-0">
              Tính toán chính xác thời điểm từ vựng chạm ngưỡng quên để nhắc nhở ôn tập, tối ưu hóa cung phản xạ dài hạn.
            </p>
          </div>

          <!-- Pillar 03 -->
          <div class="space-y-4">
            <div class="flex items-center gap-3">
              <span class="font-serif text-xs font-semibold text-[#7D6853]">03</span>
              <div class="h-[1px] w-8 bg-[#E5DED3]"></div>
            </div>
            <div class="w-10 h-10 rounded-full border border-[#E5DED3] bg-white text-[#746B60] flex items-center justify-center">
              <app-icon name="message-square" [size]="18"></app-icon>
            </div>
            <div>
              <span class="text-[9px] font-bold uppercase tracking-wider text-[#746B60] block mb-1">Ứng dụng</span>
              <h3 class="font-serif text-lg font-semibold text-[#29251F] leading-snug m-0">
                Hội thoại ngữ cảnh tức thì
              </h3>
            </div>
            <p class="text-xs text-[#746B60] leading-relaxed m-0">
              Liên kết các từ đã nhận diện thành các đoạn đối thoại ngắn thực tế, giúp người học lập tức nói ra trong đời sống.
            </p>
          </div>

        </div>
      </section>

      <!-- =========================================================================
           5. BOTTOM CTA BANNER (BẮT ĐẦU TỪ MỘT GÓC QUEN THUỘC)
           ========================================================================= -->
      <section class="w-full border-t border-b border-[#E5DED3] bg-[#F8F6F1] py-14 px-4 sm:px-8 lg:px-10 select-none">
        <div class="max-w-[1200px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div class="max-w-md">
            <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#7D6853] block mb-1">
              Your world, now in English
            </span>
            <h2 class="font-serif text-2xl sm:text-3xl font-semibold text-[#29251F] tracking-tight leading-snug m-0">
              Bắt đầu từ một góc quen thuộc quanh bạn.
            </h2>
          </div>

          <div class="text-xs text-[#746B60] max-w-sm leading-relaxed">
            Một bức ảnh là đủ để tạo nên bài học từ vựng đầu tiên — có ngữ cảnh, có phát âm và có lịch ôn tập dành riêng cho bạn.
          </div>

          <div class="shrink-0">
            <button 
              type="button" 
              (click)="api.openAuthModal('login')"
              class="h-11 px-6 rounded-[10px] bg-[#7D6853] hover:bg-[#685542] text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 border-0 shadow-2xs"
            >
              <span>Chụp bài học đầu tiên</span>
              <app-icon name="camera" [size]="15"></app-icon>
            </button>
          </div>

        </div>
      </section>

      <!-- =========================================================================
           6. FOOTER (Chuẩn Figma)
           ========================================================================= -->
      <footer class="w-full max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-10 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#746B60] select-none">
        <div class="flex items-center gap-2">
          <strong class="font-serif font-bold text-sm text-[#29251F]">Vocario</strong>
          <span class="text-[10px] uppercase font-sans text-[#746B60]">Smart Vision English</span>
        </div>

        <div>
          Học từ thế giới quanh bạn, ghi nhớ để thực sự cất lời.
        </div>

        <div>
          Ảnh từ Unsplash
        </div>
      </footer>

    </div>
  `
})
export class LandingComponent {
  public api = inject(ApiService);
  public studyService = inject(UserStudyService);
  private router = inject(Router);

  spotlights: StudioSpotlight[] = [
    {
      id: 'spot-laptop',
      word: 'laptop',
      ipa: '/ˈlæp.tɒp/',
      level: 'B1',
      vietnamese: 'máy tính xách tay',
      top: 65,
      left: 52
    },
    {
      id: 'spot-sofa',
      word: 'sofa',
      ipa: '/ˈsəʊ.fə/',
      level: 'A1',
      vietnamese: 'ghế sô-pha',
      top: 66,
      left: 30
    },
    {
      id: 'spot-plant',
      word: 'plant',
      ipa: '/plɑːnt/',
      level: 'A1',
      vietnamese: 'chậu cây xanh',
      top: 50,
      left: 74
    },
    {
      id: 'spot-lamp',
      word: 'floor lamp',
      ipa: '/flɔːr læmp/',
      level: 'A2',
      vietnamese: 'đèn cây đứng',
      top: 25,
      left: 80
    }
  ];

  activeSpot = signal<StudioSpotlight>(this.spotlights[0]);

  selectSpot(spot: StudioSpotlight) {
    this.activeSpot.set(spot);
    this.speakWord(spot.word);
  }

  speakWord(word: string) {
    this.studyService.speakWord(word);
  }

  scrollToMethodology() {
    const el = document.getElementById('features');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

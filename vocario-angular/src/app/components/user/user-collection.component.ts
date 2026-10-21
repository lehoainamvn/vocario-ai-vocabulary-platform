import { Component, signal, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { UserStudyService, ContextWord } from '../../services/user-study.service';
import { SpeechService } from '../../services/speech.service';
import { IconComponent } from '../common/icon.component';

export interface AlbumWord {
  id: string;
  progressId?: string;
  isSaved: boolean;
  cefr: string;
  english: string;
  example: string;
  exampleVi?: string;
  ipa: string;
  mastered: boolean;
  vietnamese: string;
  partOfSpeech?: string;
  topPercent: number;
  leftPercent: number;
  widthPercent: number;
  heightPercent: number;
  confidence?: number;
}

export interface Album {
  id: string | number;
  category: string;
  date: string;
  image: string;
  imageAlt: string;
  title: string;
  words: AlbumWord[];
}

@Component({
  selector: 'app-user-collection',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent],
  host: {
    class: 'w-full block'
  },
  template: `
    <div class="w-full max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-10 py-10 sm:py-12 space-y-8 animate-fade-in select-none">
      
      <!-- =========================================================================
           1. ARCHIVE HEADER (VISUAL LEXICON ARCHIVE & OVERVIEW STATS)
           ========================================================================= -->
      <section class="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-[#E5DED3]" aria-labelledby="archive-title">
        <div class="max-w-[650px]">
          <span class="text-[10px] font-bold uppercase tracking-[0.11em] text-[#7D6853] block mb-2">
            Visual lexicon archive · Bối cảnh thực tế
          </span>
          <h1 id="archive-title" class="font-serif text-3xl sm:text-4xl lg:text-[36px] font-normal text-[#29251F] tracking-[-0.035em] leading-[1.12]">
            Bộ sưu tập bối cảnh
          </h1>
          <p class="text-xs sm:text-[14px] text-[#746B60] mt-2.5 leading-[1.65]">
            Kho lưu trữ hình ảnh thực tế và các cụm từ vựng được bóc tách theo không gian sống của bạn.
          </p>
        </div>

        <!-- Overview stats & Quick Quiz link -->
        <div class="flex flex-col items-start md:items-end gap-4 shrink-0">
          <div class="flex items-center gap-4 text-xs" aria-label="Thống kê bối cảnh từ cơ sở dữ liệu">
            <div class="flex items-baseline gap-1.5">
              <strong class="font-serif text-[19px] font-semibold text-[#7D6853]">{{ totalScenesCount }}</strong>
              <span class="text-[#746B60] text-[11px] whitespace-nowrap">bối cảnh đã lưu</span>
            </div>
            <i class="w-[3px] h-[3px] rounded-full bg-[#E5DED3]"></i>
            <div class="flex items-baseline gap-1.5">
              <strong class="font-serif text-[19px] font-semibold text-[#7D6853]">{{ totalWordsCount }}</strong>
              <span class="text-[#746B60] text-[11px] whitespace-nowrap">từ vựng</span>
            </div>
            <i class="w-[3px] h-[3px] rounded-full bg-[#E5DED3]"></i>
            <div class="flex items-baseline gap-1.5">
              <strong class="font-serif text-[19px] font-semibold text-[#7D6853]">{{ totalMasteredCount }}</strong>
              <span class="text-[#746B60] text-[11px] whitespace-nowrap">đã thành thạo</span>
            </div>
          </div>

          <a 
            routerLink="/quiz" 
            class="inline-flex items-center gap-2 text-xs font-semibold text-[#7D6853] hover:text-[#685542] transition-colors no-underline group cursor-pointer"
          >
            <app-icon name="quiz" [size]="17" svgClass="text-[#7D6853]"></app-icon>
            <span>Luyện tập quiz nhanh</span>
            <app-icon name="arrow-right" [size]="16" svgClass="text-[#7D6853] group-hover:translate-x-0.5 transition-transform"></app-icon>
          </a>
        </div>
      </section>

      <!-- =========================================================================
           2. ARCHIVE WORKSPACE (CỘT TRÁI: 01 MASTER SHELF | CỘT PHẢI: 02 DETAIL PANE)
           ========================================================================= -->
      <div *ngIf="allAlbums.length > 0; else emptyCollectionTpl" class="grid grid-cols-1 lg:grid-cols-[410px_minmax(0,1fr)] gap-8 items-start">
        
        <!-- CỘT TRÁI (410px): 01 MASTER SHELF & ALBUM STREAM -->
        <section class="min-w-0 space-y-4" aria-labelledby="album-list-title">
          
          <div class="flex items-start gap-3">
            <span class="font-serif text-[13px] font-semibold text-[#7D6853] leading-none mt-1">01</span>
            <div>
              <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#746B60] mb-1">Master shelf</p>
              <h2 id="album-list-title" class="font-serif text-[21px] font-semibold text-[#29251F] tracking-[-0.025em] m-0">
                Bối cảnh của bạn
              </h2>
            </div>
          </div>

          <!-- Search Field & Filter Tabs -->
          <div class="space-y-3.5 pt-1">
            <div class="relative">
              <app-icon name="search" [size]="17" svgClass="text-[#746B60] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></app-icon>
              <input 
                type="search" 
                [value]="searchQuery()" 
                (input)="onSearchInput($event)"
                placeholder="Tìm bối cảnh hoặc từ vựng..." 
                aria-label="Tìm kiếm bối cảnh hoặc từ vựng"
                class="w-full h-[43px] pl-10 pr-3 bg-white border border-[#E5DED3] rounded-[10px] text-xs text-[#29251F] placeholder:text-[#999087] focus:outline-hidden focus:border-[#7D6853] transition-colors"
              />
            </div>

            <div class="flex items-center gap-5 border-b border-[#E5DED3] pt-1" role="group" aria-label="Bộ lọc bộ sưu tập">
              <button 
                type="button"
                (click)="setFilter('Tất cả')"
                [class.text-[#29251F]]="activeFilter() === 'Tất cả'"
                [class.font-semibold]="activeFilter() === 'Tất cả'"
                [class.border-[#7D6853]]="activeFilter() === 'Tất cả'"
                [class.text-[#746B60]]="activeFilter() !== 'Tất cả'"
                class="pb-2.5 text-[11px] border-b-2 border-transparent transition-all cursor-pointer hover:text-[#29251F]"
              >
                Tất cả
              </button>
              <button 
                type="button"
                (click)="setFilter('Gần đây')"
                [class.text-[#29251F]]="activeFilter() === 'Gần đây'"
                [class.font-semibold]="activeFilter() === 'Gần đây'"
                [class.border-[#7D6853]]="activeFilter() === 'Gần đây'"
                [class.text-[#746B60]]="activeFilter() !== 'Gần đây'"
                class="pb-2.5 text-[11px] border-b-2 border-transparent transition-all cursor-pointer hover:text-[#29251F]"
              >
                Gần đây
              </button>
              <button 
                type="button"
                (click)="setFilter('Chưa ôn tập')"
                [class.text-[#29251F]]="activeFilter() === 'Chưa ôn tập'"
                [class.font-semibold]="activeFilter() === 'Chưa ôn tập'"
                [class.border-[#7D6853]]="activeFilter() === 'Chưa ôn tập'"
                [class.text-[#746B60]]="activeFilter() !== 'Chưa ôn tập'"
                class="pb-2.5 text-[11px] border-b-2 border-transparent transition-all cursor-pointer hover:text-[#29251F]"
              >
                Chưa ôn tập
              </button>
            </div>
          </div>

          <!-- Album Stream (List of Albums with border-b) -->
          <div class="flex flex-col border-t border-[#E5DED3]">
            <div 
              *ngFor="let album of paginatedAlbums"
              (click)="selectAlbum(album)"
              [class.bg-[#F1ECE3]]="activeAlbum()?.id === album.id"
              [class.pl-3]="activeAlbum()?.id === album.id"
              class="album-card-item relative grid grid-cols-[106px_1fr_auto] items-center gap-3.5 py-[13px] pr-3 text-left border-0 border-b border-[#E5DED3] bg-transparent cursor-pointer transition-colors hover:bg-[#F1ECE3]/45 select-none group"
            >
              <!-- Indicator Bar for Active Album -->
              <div *ngIf="activeAlbum()?.id === album.id" class="absolute left-0 top-[10px] bottom-[10px] w-[2px] bg-[#7D6853]"></div>

              <!-- Thumbnail Image -->
              <img [src]="album.image" [alt]="album.imageAlt || album.title" class="w-[106px] h-20 rounded-[4px] object-cover bg-[#EBE5DA] shrink-0" />

              <!-- Details -->
              <div class="flex flex-col min-w-0 pr-1">
                <span class="text-[9px] font-bold uppercase tracking-[0.06em] text-[#7D6853] mb-1 truncate">
                  {{ album.category }}
                </span>
                <strong class="font-serif text-[15px] font-semibold text-[#29251F] leading-[1.3] line-clamp-2">
                  {{ album.title }}
                </strong>
                <div class="flex items-center gap-2 text-[10px] text-[#746B60] mt-2">
                  <span>{{ album.date }}</span>
                  <i class="w-[3px] h-[3px] rounded-full bg-[#E5DED3]"></i>
                  <span>{{ album.words.length }} từ vựng</span>
                </div>
              </div>

              <!-- Right Actions: Delete button + Chevron -->
              <div class="flex items-center gap-1 shrink-0">
                <button 
                  type="button" 
                  (click)="confirmDeleteAlbum(album, $event)"
                  class="w-7 h-7 rounded-[4px] border border-transparent hover:border-rose-200 hover:bg-rose-50 text-[#A99F95] hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer"
                  title="Xóa bối cảnh này"
                  aria-label="Xóa bối cảnh"
                >
                  <app-icon name="trash" [size]="14"></app-icon>
                </button>
                <div class="text-[#A99F95]">
                  <app-icon name="chevron-right" [size]="16"></app-icon>
                </div>
              </div>
            </div>

            <!-- No results found -->
            <div *ngIf="paginatedAlbums.length === 0" class="py-10 text-left border-b border-[#E5DED3] px-3">
              <strong class="font-serif text-[15px] font-semibold text-[#29251F] block mb-1">Không tìm thấy bối cảnh phù hợp</strong>
              <p class="text-[11px] text-[#746B60] m-0">Thử một tên vật thể hoặc cụm từ khác.</p>
            </div>
          </div>

          <!-- Pagination Controls -->
          <div class="flex items-center justify-between pt-4 text-[10px] text-[#746B60]">
            <span>Hiển thị {{ albumStartIndex }}–{{ albumEndIndex }} trong {{ filteredAlbums.length }} bối cảnh</span>
            <div class="flex items-center gap-4">
              <button 
                type="button" 
                (click)="prevAlbumPage()" 
                [disabled]="currentAlbumPage() === 1" 
                class="inline-flex items-center gap-1 font-semibold text-[#7D6853] hover:underline disabled:text-[#BFB6AC] disabled:no-underline disabled:cursor-not-allowed cursor-pointer bg-transparent border-0 p-0 text-[10px]"
              >
                <app-icon name="arrow-left" [size]="14"></app-icon>
                <span>Trước</span>
              </button>
              <button 
                type="button" 
                (click)="nextAlbumPage()" 
                [disabled]="currentAlbumPage() === totalAlbumPages" 
                class="inline-flex items-center gap-1 font-semibold text-[#7D6853] hover:underline disabled:text-[#BFB6AC] disabled:no-underline disabled:cursor-not-allowed cursor-pointer bg-transparent border-0 p-0 text-[10px]"
              >
                <span>Tiếp</span>
                <app-icon name="arrow-right" [size]="14"></app-icon>
              </button>
            </div>
          </div>

        </section>

        <!-- CỘT PHẢI: 02 ACTIVE CONTEXT / ĐỌC SÂU BỐI CẢNH -->
        <section *ngIf="activeAlbum() as current" class="min-w-0 lg:border-l lg:border-[#E5DED3] lg:pl-[31px] space-y-5" aria-labelledby="detail-title">
          
          <!-- Detail Heading kèm Nút Xóa Bối Cảnh -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-start gap-3">
              <span class="font-serif text-[13px] font-semibold text-[#7D6853] leading-none mt-1">02</span>
              <div>
                <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#746B60] mb-1">Active context</p>
                <h2 id="detail-title" class="font-serif text-[21px] font-semibold text-[#29251F] tracking-[-0.025em] m-0">
                  Đọc sâu bối cảnh
                </h2>
              </div>
            </div>
            
            <div class="flex items-center gap-3 shrink-0">
              <span class="text-[10px] text-[#746B60] font-sans">{{ current.date }}</span>
              <button 
                type="button" 
                (click)="confirmDeleteAlbum(current, $event)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] border border-[#E5DED3] bg-white hover:bg-rose-50 hover:border-rose-200 text-rose-600 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                title="Xóa bối cảnh này khỏi bộ sưu tập"
              >
                <app-icon name="trash" [size]="13" svgClass="text-rose-600"></app-icon>
                <span>Xóa bối cảnh</span>
              </button>
            </div>
          </div>

          <!-- Scene Preview with Interactive Bounding Boxes & Bottom Caption -->
          <figure class="relative h-[360px] sm:h-[400px] bg-[#1E1B18] overflow-hidden select-none m-0 shadow-sm">
            <img [src]="current.image" [alt]="current.imageAlt || current.title" class="w-full h-full object-cover" />
            
            <!-- Bottom Gradient Shade for Legibility -->
            <div class="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[rgba(30,27,24,0.88)] via-[rgba(30,27,24,0.45)] to-transparent pointer-events-none z-10"></div>

            <!-- Interactive Bounding Boxes Overlay on Image -->
            <div class="absolute inset-0 z-20 pointer-events-none">
              <div 
                *ngFor="let word of current.words"
                (click)="focusWord(word.english); $event.stopPropagation()"
                (mouseenter)="selectedWord.set(word.english)"
                (mouseleave)="selectedWord.set(null)"
                class="absolute pointer-events-auto cursor-pointer transition-all duration-150 rounded-md group/box"
                [style.top.%]="word.topPercent"
                [style.left.%]="word.leftPercent"
                [style.width.%]="word.widthPercent"
                [style.height.%]="word.heightPercent"
                [style.border]="selectedWord() === word.english || expandedWords().has(word.english) ? '2.5px solid #F2C94C' : '2px solid rgba(255, 255, 255, 0.85)'"
                [style.background-color]="selectedWord() === word.english || expandedWords().has(word.english) ? 'rgba(242, 201, 76, 0.28)' : 'rgba(0, 0, 0, 0.08)'"
                [title]="word.english + ': ' + word.vietnamese"
              >
                <!-- Label Tag on Box -->
                <span 
                  class="absolute -top-6 left-0 px-2 py-0.5 rounded-[4px] text-[10px] font-bold shadow-md flex items-center gap-1.5 whitespace-nowrap z-30 select-none transition-all"
                  [class.bg-[#F2C94C]]="selectedWord() === word.english || expandedWords().has(word.english)"
                  [class.text-[#29251F]]="selectedWord() === word.english || expandedWords().has(word.english)"
                  [class.bg-[#29251F]/90]="selectedWord() !== word.english && !expandedWords().has(word.english)"
                  [class.text-white]="selectedWord() !== word.english && !expandedWords().has(word.english)"
                >
                  <span>{{ word.english }}</span>
                  <span *ngIf="word.confidence" class="text-[8px] font-mono opacity-80">{{ (word.confidence * 100).toFixed(0) }}%</span>
                </span>
              </div>
            </div>

            <!-- Figcaption -->
            <figcaption class="absolute bottom-5 left-6 right-6 text-white pointer-events-none flex flex-col z-20">
              <span class="text-[9px] font-bold uppercase tracking-[0.09em] text-[#F2C94C] mb-1">
                {{ current.category }}
              </span>
              <strong class="font-serif text-[21px] font-medium leading-[1.25] drop-shadow-sm">
                {{ current.title }}
              </strong>
            </figcaption>
          </figure>

          <!-- Lexicon Section Heading -->
          <div class="flex items-end justify-between pt-4 pb-2">
            <div>
              <span class="text-[9px] font-bold uppercase tracking-[0.11em] text-[#7D6853] block mb-1">
                Danh mục trong ảnh
              </span>
              <h2 class="font-serif text-[21px] font-semibold text-[#29251F] tracking-[-0.025em] m-0">
                Từ vựng theo bối cảnh
              </h2>
            </div>
            <span class="text-[10px] text-[#746B60]">{{ current.words.length }} mục từ</span>
          </div>

          <!-- Word Ledger (List of Words with CEFR Badges & Drawer Expansion) -->
          <div class="border-t border-[#29251F] divide-y divide-[#E5DED3]">
            <article 
              *ngFor="let word of current.words"
              [class.bg-[#FAF7F2]/40]="expandedWords().has(word.english)"
              class="transition-colors"
            >
              <button 
                type="button"
                [attr.aria-expanded]="expandedWords().has(word.english)"
                (click)="toggleWordExpand(word.english)"
                (mouseenter)="selectedWord.set(word.english)"
                (mouseleave)="selectedWord.set(null)"
                [class.bg-[#F1ECE3]/70]="selectedWord() === word.english"
                class="w-full grid grid-cols-[34px_1.25fr_1fr_94px_18px] items-center gap-2.5 py-[15px] px-1 text-left bg-transparent border-0 cursor-pointer group hover:bg-[#F1ECE3]/40 transition-colors"
              >
                <!-- CEFR Badge -->
                <span 
                  [ngClass]="getCefrBadgeClass(word.cefr)"
                  class="w-[30px] h-[25px] rounded-[5px] flex items-center justify-center text-[9px] font-bold font-sans shrink-0"
                >
                  {{ word.cefr }}
                </span>

                <!-- Word & IPA -->
                <div class="min-w-0 pr-1 flex flex-col gap-0.5">
                  <strong class="font-semibold text-sm text-[#29251F] block leading-snug truncate">{{ word.english }}</strong>
                  <small class="text-[10px] text-[#746B60] font-sans">{{ word.ipa }}</small>
                </div>

                <!-- Vietnamese Meaning -->
                <span class="text-[11px] text-[#746B60] leading-[1.35] truncate">
                  {{ word.vietnamese }}
                </span>

                <!-- Saved / Mastery Status -->
                <div class="flex items-center gap-1.5 text-[9px] whitespace-nowrap">
                  <ng-container *ngIf="word.isSaved; else notSavedStatus">
                    <span *ngIf="word.mastered" class="text-[#287A59] flex items-center gap-1 font-semibold">
                      <i class="w-1.5 h-1.5 rounded-full bg-[#287A59] shrink-0"></i>
                      <span>Đã thành thạo</span>
                    </span>
                    <span *ngIf="!word.mastered" class="text-[#7D6853] flex items-center gap-1 font-semibold">
                      <app-icon name="bookmark" [size]="10" svgClass="text-[#7D6853]"></app-icon>
                      <span>Đã lưu vào Sổ</span>
                    </span>
                  </ng-container>
                  <ng-template #notSavedStatus>
                    <span class="text-[#A99F95] flex items-center gap-1.5">
                      <i class="w-1.5 h-1.5 rounded-full bg-[#D1C7BC] shrink-0"></i>
                      <span>Chưa lưu</span>
                    </span>
                  </ng-template>
                </div>

                <!-- Chevron Indicator -->
                <span 
                  class="text-[#A99F95] transition-transform duration-160 flex justify-end"
                  [class.rotate-90]="expandedWords().has(word.english)"
                >
                  <app-icon name="chevron-right" [size]="16"></app-icon>
                </span>
              </button>

              <!-- Expanded Drawer with Example & Speech Actions -->
              <div 
                *ngIf="expandedWords().has(word.english)"
                class="ml-12 mr-2 p-3.5 mb-3.5 bg-[#F1ECE3] space-y-2.5 animate-fade-in"
              >
                <div>
                  <span class="text-[8px] font-bold uppercase tracking-[0.09em] text-[#7D6853] block mb-1">Câu ví dụ</span>
                  <p class="font-serif text-[13px] text-[#29251F] leading-[1.55] m-0">
                    “{{ word.example }}”
                  </p>
                  <p *ngIf="word.exampleVi" class="text-[11px] text-[#746B60] mt-1 m-0">
                    {{ word.exampleVi }}
                  </p>
                </div>

                <div class="flex flex-wrap items-center gap-3 pt-1.5 border-t border-[#E5DED3]/80">
                  <button 
                    type="button" 
                    (click)="studyService.speakWord(word.english); $event.stopPropagation()"
                    class="inline-flex items-center gap-1.5 text-[9px] font-semibold text-[#7D6853] hover:text-[#685542] cursor-pointer bg-transparent border-0 p-0"
                  >
                    <app-icon name="volume-2" [size]="14"></app-icon>
                    <span>Nghe phát âm</span>
                  </button>

                  <button 
                    type="button" 
                    (click)="practiceSpeech(word); $event.stopPropagation()"
                    class="inline-flex items-center gap-1.5 text-[9px] font-semibold text-[#7D6853] hover:text-[#685542] cursor-pointer bg-transparent border-0 p-0"
                  >
                    <app-icon name="mic" [size]="14"></app-icon>
                    <span>Luyện nói AI</span>
                  </button>

                  <!-- Nút Lưu lẻ vào Sổ / Đã lưu -->
                  <div class="sm:ml-auto">
                    <button 
                      *ngIf="!word.isSaved; else wordSavedTpl"
                      type="button" 
                      (click)="saveWordToSrs(word); $event.stopPropagation()"
                      class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#7D6853] hover:bg-[#685542] text-white text-[10px] font-bold cursor-pointer transition-all shadow-2xs border-0 active:scale-95"
                    >
                      <app-icon name="bookmark" [size]="12" svgClass="text-white"></app-icon>
                      <span>Lưu từ này vào Sổ SM-2</span>
                    </button>
                    <ng-template #wordSavedTpl>
                      <div class="inline-flex items-center gap-2">
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                          <app-icon name="check" [size]="12" svgClass="text-emerald-700"></app-icon>
                          <span>Đã có trong Sổ</span>
                        </span>
                        <button 
                          type="button" 
                          (click)="removeWordFromSrs(word); $event.stopPropagation()"
                          class="text-[10px] text-[#A99F95] hover:text-rose-600 cursor-pointer bg-transparent border-0 p-0 hover:underline"
                          title="Bỏ lưu khỏi Sổ từ vựng"
                        >
                          <span>Bỏ lưu</span>
                        </button>
                      </div>
                    </ng-template>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <!-- Detail Footer with Review Session CTA & Batch Save -->
          <div class="border-t border-[#29251F] pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div class="flex items-center gap-3 text-[11px] font-semibold">
                <span class="flex items-center gap-1.5 text-[#7D6853]">
                  <app-icon name="bookmark" [size]="13" svgClass="text-[#7D6853]"></app-icon>
                  <span>{{ savedWordsCountInCurrentAlbum }}/{{ current.words.length }} từ đã lưu vào Sổ</span>
                </span>
                <i class="w-[3px] h-[3px] rounded-full bg-[#E5DED3]"></i>
                <span class="flex items-center gap-1.5 text-[#287A59]">
                  <i class="w-1.5 h-1.5 rounded-full bg-[#287A59]"></i>
                  <span>{{ masteredWordsCountInCurrentAlbum }} từ thành thạo</span>
                </span>
              </div>
              <p class="text-[10px] text-[#746B60] mt-1.5 leading-[1.5] max-w-[360px] m-0">
                Lưu lẻ từng từ phía trên hoặc bấm nút bên phải để nạp toàn bộ vào Sổ tay ôn tập SM-2.
              </p>
            </div>

            <div class="flex items-center gap-2.5 shrink-0 flex-wrap">
              <!-- Nút Lưu toàn bộ bối cảnh -->
              <button 
                *ngIf="!allWordsSavedInCurrentAlbum; else allSavedBadge"
                type="button" 
                (click)="saveEntireCurrentAlbum()"
                [disabled]="isSavingAll()"
                class="h-[43px] px-4 rounded-[10px] bg-white hover:bg-[#FAF8F5] border border-[#7D6853] text-[#7D6853] font-bold text-[11px] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-2xs disabled:opacity-50"
              >
                <app-icon name="bookmark" [size]="14" svgClass="text-[#7D6853]"></app-icon>
                <span>{{ isSavingAll() ? 'Đang lưu...' : 'Lưu toàn bộ từ vào Sổ' }}</span>
              </button>

              <ng-template #allSavedBadge>
                <div class="h-[43px] px-3.5 rounded-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px] flex items-center gap-2">
                  <app-icon name="check" [size]="15" svgClass="text-emerald-700"></app-icon>
                  <span>Toàn bộ từ đã có trong Sổ</span>
                </div>
              </ng-template>

              <!-- Nút Bắt đầu ôn tập -->
              <button 
                type="button" 
                (click)="startReviewCurrentAlbum()"
                class="h-[43px] px-4 rounded-[10px] bg-[#7D6853] hover:bg-[#685542] text-white font-semibold text-[11px] flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-95 border-0 shadow-2xs"
              >
                <span>Bắt đầu ôn tập</span>
                <app-icon name="arrow-right" [size]="16"></app-icon>
              </button>
            </div>
          </div>

        </section>

      </div>

      <!-- Empty State if Database has 0 real captures -->
      <ng-template #emptyCollectionTpl>
        <div class="py-20 text-center max-w-md mx-auto space-y-4">
          <div class="w-16 h-16 rounded-full bg-[#F1ECE3] flex items-center justify-center mx-auto text-[#7D6853]">
            <app-icon name="camera" [size]="28"></app-icon>
          </div>
          <h2 class="font-serif text-2xl font-semibold text-[#29251F] m-0">Chưa có bối cảnh nào trong cơ sở dữ liệu</h2>
          <p class="text-xs text-[#746B60] leading-relaxed m-0">
            Bạn chưa lưu bức ảnh nào từ Studio Quét AI. Hãy chụp ảnh hoặc tải ảnh góc làm việc, phòng ăn... để AI nhận diện và trích xuất từ vựng thực tế cho bạn!
          </p>
          <a routerLink="/scanner" class="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold cursor-pointer shadow-xs transition-all no-underline">
            <app-icon name="camera" [size]="16" svgClass="text-white"></app-icon>
            <span>Quét bối cảnh đầu tiên ngay</span>
          </a>
        </div>
      </ng-template>

      <!-- =========================================================================
           3. FLOATING NOTICE TOAST
           ========================================================================= -->
      <div *ngIf="noticeMessage()" class="fixed bottom-5 right-5 z-50 bg-[#29251F] text-white px-3.5 py-3 rounded-[10px] shadow-lg flex items-center gap-3 text-[11px] animate-toast-in select-none">
        <div class="w-[31px] h-[31px] rounded-[7px] bg-[#287A59] flex items-center justify-center text-white shrink-0">
          <app-icon name="check" [size]="16"></app-icon>
        </div>
        <p class="max-w-[340px] leading-[1.4] m-0 text-white">{{ noticeMessage() }}</p>
        <button type="button" (click)="noticeMessage.set(null)" class="text-[#CFC8C0] hover:text-white cursor-pointer ml-1 border-0 bg-transparent p-1">
          <app-icon name="x" [size]="16"></app-icon>
        </button>
      </div>

      <!-- =========================================================================
           4. HỘP THOẠI XÁC NHẬN XÓA BỐI CẢNH (SCANDINAVIAN EDITORIAL MODAL)
           ========================================================================= -->
      <div *ngIf="albumToDelete() as targetAlbum" class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-2xs p-4 animate-fade-in">
        <div class="bg-white rounded-[4px] border border-[#E5DED3] max-w-md w-full p-6 space-y-4 shadow-xl select-none animate-scale-up">
          <div class="flex items-start gap-3.5">
            <div class="w-10 h-10 rounded-[4px] bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <app-icon name="trash" [size]="20" svgClass="text-rose-600"></app-icon>
            </div>
            <div>
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-rose-600 block">Thao tác xóa bối cảnh</span>
              <h3 class="font-serif text-xl font-bold text-[#29251F] m-0 mt-0.5">Xóa bối cảnh này?</h3>
            </div>
          </div>

          <p class="text-xs text-[#746B60] leading-relaxed m-0">
            Bạn có chắc chắn muốn xóa bối cảnh <strong class="text-[#29251F]">"{{ targetAlbum.title }}"</strong>? Thao tác này sẽ xóa ảnh chụp và bóc tách từ vựng tương ứng khỏi bộ sưu tập và sổ tay ôn tập.
          </p>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5DED3]">
            <button 
              type="button" 
              (click)="cancelDelete()"
              [disabled]="isDeleting()"
              class="px-4 py-2 rounded-[4px] border border-[#E5DED3] bg-white hover:bg-[#FAF8F5] text-[#29251F] text-xs font-semibold cursor-pointer transition-colors"
            >
              Hủy bỏ
            </button>
            <button 
              type="button" 
              (click)="executeDeleteAlbum()"
              [disabled]="isDeleting()"
              class="px-4 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold border-0 cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <app-icon *ngIf="!isDeleting()" name="trash" [size]="14"></app-icon>
              <span>{{ isDeleting() ? 'Đang xóa...' : 'Xác nhận xóa' }}</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class UserCollectionComponent {
  public api = inject(ApiService);
  public studyService = inject(UserStudyService);
  public speechService = inject(SpeechService);
  public toast = inject(ToastService);
  private router = inject(Router);

  // Search & Filter State
  searchQuery = signal<string>('');
  activeFilter = signal<'Tất cả' | 'Gần đây' | 'Chưa ôn tập'>('Tất cả');

  // Album Pagination
  albumPageSize = 4;
  currentAlbumPage = signal<number>(1);

  // Selected Album & Word Accordion
  activeAlbum = signal<Album | null>(null);
  expandedWords = signal<Set<string>>(new Set());
  selectedWord = signal<string | null>(null);

  // Notice Toast State
  noticeMessage = signal<string | null>(null);

  // State xóa bối cảnh
  albumToDelete = signal<Album | null>(null);
  isDeleting = signal<boolean>(false);

  confirmDeleteAlbum(album: Album, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.albumToDelete.set(album);
  }

  cancelDelete() {
    this.albumToDelete.set(null);
  }

  executeDeleteAlbum() {
    const target = this.albumToDelete();
    if (!target) return;

    this.isDeleting.set(true);
    this.studyService.deleteScene(String(target.id)).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.albumToDelete.set(null);
        const remaining = this.allAlbums;
        if (remaining.length > 0) {
          this.activeAlbum.set(remaining[0]);
        } else {
          this.activeAlbum.set(null);
        }
      },
      error: () => {
        this.isDeleting.set(false);
        this.albumToDelete.set(null);
      }
    });
  }

  constructor() {
    // Tự động đồng bộ chọn album thực tế đầu tiên khi scenes từ CSDL được nạp
    effect(() => {
      const albums = this.allAlbums;
      const current = this.activeAlbum();
      if (albums.length > 0) {
        if (!current || !albums.some(a => a.id === current.id)) {
          this.activeAlbum.set(albums[0]);
        }
      } else {
        this.activeAlbum.set(null);
      }
    });
  }

  // Toàn bộ dữ liệu bối cảnh lấy 100% từ CSDL qua studyService.scenes()
  get allAlbums(): Album[] {
    const realScenes = this.studyService.scenes();
    const savedWords = this.studyService.savedWords();

    return realScenes.map((s, idx) => ({
      id: s.id,
      category: s.category || 'Đời Sống Thực Tế',
      date: s.createdAt || 'Gần đây',
      image: s.imageUrl || 'assets/placeholder.jpg',
      imageAlt: s.title,
      title: s.title || `Bối cảnh #${idx + 1}`,
      words: (s.words || []).map((w, wIdx) => {
        const saved = savedWords.find(sw => sw.word.toLowerCase() === w.word.toLowerCase());
        const isSaved = !!saved;
        const isMastered = saved ? (saved.status === 'MASTERED') : false;
        return {
          id: w.id || `w-${idx}-${wIdx}`,
          progressId: saved?.id,
          isSaved: isSaved,
          cefr: (w.level || 'B1').toUpperCase(),
          english: w.word,
          example: w.exampleEn || `I see the ${w.word} in this scene.`,
          exampleVi: w.exampleVi || `Tôi nhìn thấy ${w.vietnamese} trong bối cảnh này.`,
          ipa: w.ipa || '/.../',
          mastered: isMastered,
          vietnamese: w.vietnamese || 'Đồ vật đời sống',
          partOfSpeech: w.partOfSpeech || 'noun',
          topPercent: w.topPercent ?? 20,
          leftPercent: w.leftPercent ?? 20,
          widthPercent: w.widthPercent ?? 22,
          heightPercent: w.heightPercent ?? 12,
          confidence: w.confidence
        };
      })
    }));
  }

  get filteredAlbums(): Album[] {
    const query = this.searchQuery().trim().toLowerCase();
    const filter = this.activeFilter();

    return this.allAlbums.filter(album => {
      const matchesSearch = !query || 
        album.title.toLowerCase().includes(query) ||
        album.category.toLowerCase().includes(query) ||
        album.words.some(w => w.english.toLowerCase().includes(query) || w.vietnamese.toLowerCase().includes(query));

      const matchesFilter = filter === 'Tất cả' ||
        filter === 'Gần đây' ||
        album.words.some(w => !w.mastered);

      return matchesSearch && matchesFilter;
    });
  }

  get paginatedAlbums(): Album[] {
    const list = this.filteredAlbums;
    const start = (this.currentAlbumPage() - 1) * this.albumPageSize;
    return list.slice(start, start + this.albumPageSize);
  }

  get totalAlbumPages(): number {
    return Math.ceil(this.filteredAlbums.length / this.albumPageSize) || 1;
  }

  get albumStartIndex(): number {
    if (this.filteredAlbums.length === 0) return 0;
    return (this.currentAlbumPage() - 1) * this.albumPageSize + 1;
  }

  get albumEndIndex(): number {
    return Math.min(this.currentAlbumPage() * this.albumPageSize, this.filteredAlbums.length);
  }

  // Thống kê động 100% từ CSDL
  get totalScenesCount(): number {
    return this.allAlbums.length;
  }

  get totalWordsCount(): number {
    return this.allAlbums.reduce((sum, a) => sum + a.words.length, 0);
  }

  get totalMasteredCount(): number {
    let count = 0;
    for (const a of this.allAlbums) {
      count += a.words.filter(w => w.mastered).length;
    }
    return count;
  }

  get masteredWordsCountInCurrentAlbum(): number {
    return this.activeAlbum()?.words.filter(w => w.mastered).length || 0;
  }

  onSearchInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.currentAlbumPage.set(1);
  }

  setFilter(filter: 'Tất cả' | 'Gần đây' | 'Chưa ôn tập') {
    this.activeFilter.set(filter);
    this.currentAlbumPage.set(1);
  }

  selectAlbum(album: Album) {
    this.activeAlbum.set(album);
    this.expandedWords.set(new Set());
  }

  prevAlbumPage() {
    if (this.currentAlbumPage() > 1) {
      this.currentAlbumPage.update(p => p - 1);
    }
  }

  nextAlbumPage() {
    if (this.currentAlbumPage() < this.totalAlbumPages) {
      this.currentAlbumPage.update(p => p + 1);
    }
  }

  toggleWordExpand(english: string) {
    const set = new Set(this.expandedWords());
    if (set.has(english)) {
      set.delete(english);
      if (this.selectedWord() === english) {
        this.selectedWord.set(null);
      }
    } else {
      set.add(english);
      this.selectedWord.set(english);
    }
    this.expandedWords.set(set);
  }

  focusWord(english: string) {
    this.selectedWord.set(english);
    const set = new Set(this.expandedWords());
    set.add(english);
    this.expandedWords.set(set);
    this.studyService.speakWord(english);
  }

  getCefrBadgeClass(cefr: string): string {
    const c = (cefr || '').toUpperCase();
    if (c === 'A1' || c === 'A2') {
      return 'bg-[#EAE5DC] text-[#5A5046]';
    }
    if (c === 'B1' || c === 'B2') {
      return 'bg-[#F1ECE3] text-[#7D6853]';
    }
    return 'bg-[#29251F] text-white';
  }

  practiceSpeech(word: AlbumWord) {
    this.speechService.openSpeechModal({
      text: word.english,
      ipa: word.ipa,
      meaning: word.vietnamese,
      contextTitle: `Từ vựng: ${word.english}`,
      mode: 'WORD'
    });
  }

  isSavingAll = signal<boolean>(false);

  get savedWordsCountInCurrentAlbum(): number {
    return this.activeAlbum()?.words.filter(w => w.isSaved).length || 0;
  }

  get allWordsSavedInCurrentAlbum(): boolean {
    const words = this.activeAlbum()?.words || [];
    return words.length > 0 && words.every(w => w.isSaved);
  }

  saveWordToSrs(word: AlbumWord) {
    const contextWord: ContextWord = {
      id: `word-${word.english.toLowerCase().replace(/\s+/g, '-')}`,
      word: word.english,
      ipa: word.ipa,
      vietnamese: word.vietnamese,
      partOfSpeech: word.partOfSpeech || 'noun',
      level: word.cefr,
      colorBg: 'bg-[#FAF7F2]',
      colorBorder: 'border-[#EAE4D9]',
      colorText: 'text-[#2D2823]',
      exampleEn: word.example,
      exampleVi: word.exampleVi || '',
      topPercent: 30,
      leftPercent: 30,
      widthPercent: 20,
      heightPercent: 10
    };

    const sceneId = String(this.activeAlbum()?.id || 'collection');
    this.studyService.learnWordFromImage(sceneId, contextWord);
    this.noticeMessage.set(`Đã lưu "${word.english}" vào Sổ từ vựng SM-2!`);
  }

  removeWordFromSrs(word: AlbumWord) {
    let pid = word.progressId;
    if (!pid) {
      const sw = this.studyService.savedWords().find(s => s.word.toLowerCase() === word.english.toLowerCase());
      if (sw) pid = sw.id;
    }

    if (pid) {
      this.studyService.deleteWordFromSrs(pid).subscribe({
        next: () => {
          this.toast.info(`Đã bỏ lưu từ "${word.english}" khỏi Sổ tay từ vựng.`, 'Bỏ Lưu');
          this.studyService.refreshSavedWords();
          this.studyService.refreshStats();
          this.studyService.refreshDueCards();
        },
        error: (err) => {
          console.warn('Lỗi bỏ lưu từ:', err);
        }
      });
    }
  }

  saveEntireCurrentAlbum() {
    const current = this.activeAlbum();
    if (!current) return;

    this.isSavingAll.set(true);
    this.studyService.learnAllWordsFromScene(String(current.id)).subscribe({
      next: (res) => {
        this.isSavingAll.set(false);
        this.studyService.refreshSavedWords();
        this.studyService.refreshStats();
        this.studyService.refreshDueCards();
        this.toast.success(
          `Đã lưu toàn bộ ${current.words.length} từ của bối cảnh "${current.title}" vào Sổ tay từ vựng!`,
          'Lưu Bối Cảnh Thành Công'
        );
      },
      error: (err) => {
        this.isSavingAll.set(false);
        console.warn('Lỗi gọi learnAllWordsFromScene, fallback lưu từng từ:', err);
        let count = 0;
        for (const w of current.words) {
          if (!w.isSaved) {
            this.saveWordToSrs(w);
            count++;
          }
        }
        this.toast.info(`Đã lưu ${count} từ vào Sổ từ vựng!`, 'Hoàn Tất');
      }
    });
  }

  startReviewCurrentAlbum() {
    const current = this.activeAlbum();
    if (!current) return;
    const title = current.title;
    const savedCount = this.savedWordsCountInCurrentAlbum;

    // Nếu chưa lưu từ nào trong bối cảnh này, tự động lưu toàn bộ trước khi mở phiên ôn tập
    if (savedCount === 0 && current.words.length > 0) {
      this.isSavingAll.set(true);
      this.studyService.learnAllWordsFromScene(String(current.id)).subscribe({
        next: () => {
          this.isSavingAll.set(false);
          this.studyService.refreshSavedWords();
          this.studyService.refreshStats();
          this.studyService.refreshDueCards();
          this.toast.success(`Đã tự động lưu ${current.words.length} từ vào Sổ và mở phiên ôn tập!`, 'Sẵn Sàng Ôn Tập');
          setTimeout(() => {
            this.router.navigate(['/flashcards']);
          }, 800);
        },
        error: () => {
          this.isSavingAll.set(false);
          this.router.navigate(['/flashcards']);
        }
      });
      return;
    }

    this.noticeMessage.set(`Phiên ôn tập “${title}” đã sẵn sàng với ${savedCount} từ.`);
    setTimeout(() => {
      this.router.navigate(['/flashcards']);
    }, 1000);
  }
}

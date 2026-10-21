import { Component, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { UserStudyService, SavedWordItem, QuizQuestion, QuizGenerationResponse } from '../../services/user-study.service';
import { SpeechService } from '../../services/speech.service';
import { IconComponent } from '../common/icon.component';

export interface TopicItem {
  id: string;
  name: string;
  icon: string;
  totalWords: number;
  dueWords: number;
  learningWords: number;
  masteredWords: number;
  sampleWords: string[];
  imageUrl?: string;
}

@Component({
  selector: 'app-user-flashcards',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  host: {
    class: 'w-full block'
  },
  template: `
    <div class="w-full max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-10 py-10 sm:py-12 space-y-8 animate-fade-in select-none">

      <!-- =========================================================================
           CHẾ ĐỘ 1: MỤC LỤC CHỦ ĐỀ TỪ VỰNG & TỔNG QUAN SRS (TOPICS_LIST)
           Chuẩn xác theo Mockup Figma: Header CEFR Goal + Banner Lịch Ôn + Lưới Chủ Đề
           ========================================================================= -->
      <ng-container *ngIf="currentView() === 'TOPICS_LIST'">
        
        <!-- 1. Header & Chỉ tiêu CEFR -->
        <section class="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-8 border-b border-[#E5DED3]" aria-labelledby="lexicon-title">
          <div class="max-w-[650px]">
            <span class="text-[10px] font-bold uppercase tracking-[0.11em] text-[#7D6853] block mb-2">
              Personal lexicon · Bộ sưu tập của bạn
            </span>
            <h1 id="lexicon-title" class="font-serif text-3xl sm:text-4xl lg:text-[36px] font-normal text-[#29251F] tracking-[-0.035em] leading-[1.15]">
              Sổ tay từ vựng & Chủ đề ôn tập
            </h1>
            <p class="text-xs sm:text-[14px] text-[#746B60] mt-2.5 leading-[1.65]">
              Toàn bộ vốn từ được bóc tách từ các vật thể đời thực, sắp xếp theo không gian và tối ưu theo chu kỳ lặp lại ngắt quãng (SM-2).
            </p>
          </div>

          <!-- Top Right CEFR Goal Card -->
          <div class="border border-[#E5DED3] bg-white rounded-xl p-4 sm:p-5 flex flex-col justify-between shrink-0 min-w-[290px] shadow-2xs">
            <div class="flex items-center gap-3 pb-3 border-b border-[#E5DED3]">
              <div class="w-8 h-8 rounded-full bg-[#EAE5DC] text-[#5A5046] flex items-center justify-center font-bold text-xs font-mono shrink-0">
                {{ studyService.targetProgress()?.currentLevel || api.currentUser()?.targetLevel || 'A2' }}
              </div>
              <div>
                <span class="text-[9px] font-bold uppercase tracking-wider text-[#746B60] block">Chỉ tiêu CEFR</span>
                <strong class="text-xs text-[#29251F] font-semibold block leading-tight">Nền tảng giao tiếp hằng ngày</strong>
              </div>
            </div>

            <div class="flex items-center justify-between pt-3 text-xs">
              <div>
                <strong class="font-serif text-base font-semibold text-[#29251F] block">1.000</strong>
                <span class="text-[10px] text-[#746B60]">từ mục tiêu</span>
              </div>
              <i class="w-[3px] h-[3px] rounded-full bg-[#E5DED3]"></i>
              <div>
                <strong class="font-serif text-base font-semibold text-[#29251F] block">{{ studyService.savedWords().length }}</strong>
                <span class="text-[10px] text-[#746B60]">từ đã lưu</span>
              </div>
              <i class="w-[3px] h-[3px] rounded-full bg-[#E5DED3]"></i>
              <div>
                <strong class="font-serif text-base font-semibold text-[#287A59] block">{{ totalMasteredCount }}</strong>
                <span class="text-[10px] text-[#746B60]">đã thành thạo</span>
              </div>
            </div>

            <span class="text-[9px] text-[#746B60] italic block mt-2 text-right">
              *Tiến độ học tập theo thuật toán SM-2
            </span>
          </div>
        </section>

        <!-- 2. Banner: LỊCH ÔN HÔM NAY (Spaced Repetition Due Banner) -->
        <section class="bg-[#F1ECE3] border border-[#E5DED3] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 shadow-2xs">
          <div class="flex items-center gap-5 sm:gap-6 min-w-0">
            <!-- Left Number Block -->
            <div class="flex flex-col items-center justify-center pr-4 sm:pr-6 border-r border-[#E5DED3] shrink-0">
              <span class="font-serif text-3xl sm:text-4xl font-bold text-[#7D6853] leading-none">{{ totalDueCount }}</span>
              <span class="text-[9px] font-bold uppercase tracking-widest text-[#746B60] mt-1">Từ</span>
            </div>

            <!-- Middle Copy -->
            <div class="min-w-0">
              <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#7D6853] block mb-1">
                Lịch ôn hôm nay
              </span>
              <h2 class="font-serif text-lg sm:text-xl font-semibold text-[#29251F] tracking-tight m-0">
                {{ totalDueCount }} từ đến hạn ôn tập hôm nay
              </h2>
              <p class="text-xs text-[#746B60] mt-1 m-0 leading-relaxed">
                Củng cố trí nhớ dài hạn trước khi từ vựng rơi vào đường cong lãng quên.
              </p>
            </div>
          </div>

          <!-- Right Action -->
          <div class="flex items-center sm:flex-col sm:items-end justify-between gap-2 shrink-0">
            <span class="text-[11px] text-[#746B60] flex items-center gap-1.5">
              <app-icon name="calendar" [size]="13" svgClass="text-[#746B60]"></app-icon>
              <span>Khoảng {{ Math.max(1, Math.ceil(totalDueCount * 0.4)) }} phút</span>
            </span>

            <button 
              type="button" 
              (click)="startDueCardsReview()"
              [disabled]="totalDueCount === 0"
              class="h-[43px] px-5 rounded-[10px] bg-[#7D6853] hover:bg-[#685542] disabled:bg-[#BFB6AC] disabled:cursor-not-allowed text-white font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 border-0 shadow-2xs"
            >
              <span>Ôn tập ngay</span>
              <app-icon name="arrow-right" [size]="15"></app-icon>
            </button>
          </div>
        </section>

        <!-- 3. Section: Chủ Đề Từ Vựng (Topic Index) -->
        <section class="space-y-4 pt-2" aria-labelledby="topic-index-title">
          <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#7D6853] block mb-1">Topic index</span>
              <h2 id="topic-index-title" class="font-serif text-2xl font-semibold text-[#29251F] tracking-tight m-0">
                Chủ đề từ vựng
              </h2>
            </div>
            <span class="text-xs text-[#746B60]">
              {{ filteredTopicsList.length }} chủ đề · {{ studyService.savedWords().length }} từ đang học
            </span>
          </div>

          <!-- Search Input & Filter Tabs -->
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-1">
            <div class="relative flex-1 max-w-md">
              <app-icon name="search" [size]="16" svgClass="text-[#746B60] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"></app-icon>
              <input 
                type="search" 
                [(ngModel)]="topicSearchKeyword" 
                (ngModelChange)="currentTopicPage.set(1)"
                placeholder="Tìm kiếm chủ đề, đồ vật, từ vựng..." 
                class="w-full h-[43px] pl-10 pr-3 bg-white border border-[#E5DED3] rounded-[10px] text-xs text-[#29251F] placeholder:text-[#999087] focus:outline-hidden focus:border-[#7D6853] transition-colors"
              />
            </div>

            <!-- Filter Tabs -->
            <div class="flex items-center gap-5 border-b border-[#E5DED3] self-end sm:self-auto" role="group" aria-label="Bộ lọc chủ đề">
              <button 
                type="button"
                (click)="setTopicFilter('ALL')"
                [class.text-[#29251F]]="topicFilterStatus() === 'ALL'"
                [class.font-semibold]="topicFilterStatus() === 'ALL'"
                [class.border-[#7D6853]]="topicFilterStatus() === 'ALL'"
                [class.text-[#746B60]]="topicFilterStatus() !== 'ALL'"
                class="pb-2 text-xs border-b-2 border-transparent transition-all cursor-pointer hover:text-[#29251F] bg-transparent border-0"
              >
                Tất cả
              </button>
              <button 
                type="button"
                (click)="setTopicFilter('DUE')"
                [class.text-[#29251F]]="topicFilterStatus() === 'DUE'"
                [class.font-semibold]="topicFilterStatus() === 'DUE'"
                [class.border-[#7D6853]]="topicFilterStatus() === 'DUE'"
                [class.text-[#746B60]]="topicFilterStatus() !== 'DUE'"
                class="pb-2 text-xs border-b-2 border-transparent transition-all cursor-pointer hover:text-[#29251F] bg-transparent border-0"
              >
                Cần ôn
              </button>
              <button 
                type="button"
                (click)="setTopicFilter('MASTERED')"
                [class.text-[#29251F]]="topicFilterStatus() === 'MASTERED'"
                [class.font-semibold]="topicFilterStatus() === 'MASTERED'"
                [class.border-[#7D6853]]="topicFilterStatus() === 'MASTERED'"
                [class.text-[#746B60]]="topicFilterStatus() !== 'MASTERED'"
                class="pb-2 text-xs border-b-2 border-transparent transition-all cursor-pointer hover:text-[#29251F] bg-transparent border-0"
              >
                Đã thành thạo
              </button>
            </div>
          </div>

          <!-- Lưới 2 Cột Thẻ Chủ Đề (Topic Cards Grid) & Thanh Phân Trang -->
          <div *ngIf="filteredTopicsList.length > 0; else emptyTopicsTpl" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <article 
                *ngFor="let topic of paginatedTopicsList; let i = index"
                (click)="openTopicStudy(topic)"
                class="bg-white border border-[#E5DED3] hover:border-[#7D6853] p-6 rounded-[4px] transition-all cursor-pointer flex flex-col justify-between group shadow-2xs select-none relative"
              >
                <!-- Top Row: Index number & Questions count / Status & Delete Button -->
                <div>
                  <div class="flex items-center justify-between text-[11px] text-[#746B60] pb-2">
                    <span class="font-mono">{{ getTopicNumber(i) }}</span>
                    <div class="flex items-center gap-2">
                      <span *ngIf="topic.totalWords > 0 && topic.masteredWords === topic.totalWords" class="text-[#287A59] font-semibold flex items-center gap-1">
                        <app-icon name="check" [size]="12"></app-icon>
                        <span>Đã hoàn tất</span>
                      </span>
                      <span *ngIf="topic.masteredWords < topic.totalWords" class="text-[#746B60]">
                        {{ topic.totalWords }} câu hỏi
                      </span>
                      <!-- Nút Xóa Chủ Đề (chỉ hiện cho chủ đề riêng, không xóa kho toàn bộ) -->
                      <button 
                        *ngIf="topic.id !== 'all'"
                        type="button"
                        (click)="confirmDeleteTopic(topic, $event)"
                        class="w-6 h-6 rounded-[4px] border border-transparent hover:border-rose-200 hover:bg-rose-50 text-[#A99F95] hover:text-rose-600 flex items-center justify-center transition-all cursor-pointer"
                        title="Xóa chủ đề này khỏi sổ tay"
                        aria-label="Xóa chủ đề"
                      >
                        <app-icon name="trash" [size]="13"></app-icon>
                      </button>
                    </div>
                  </div>

                  <!-- Topic Title -->
                  <h3 class="font-serif text-xl font-semibold text-[#29251F] group-hover:text-[#7D6853] transition-colors leading-snug m-0">
                    {{ topic.name }}
                  </h3>

                  <!-- Sample Words Preview -->
                  <p class="text-xs text-[#746B60] line-clamp-1 italic mt-1.5 m-0">
                    {{ topic.sampleWords.join(', ') || 'Chưa có từ vựng' }}
                  </p>
                </div>

                <!-- Progress Bar & Call to Action -->
                <div class="pt-6 space-y-3">
                  <div>
                    <div class="flex items-center justify-between text-[10px] text-[#746B60] mb-1">
                      <span>Đã thuộc</span>
                      <span class="font-semibold text-[#29251F]">{{ topic.masteredWords }}/{{ topic.totalWords }}</span>
                    </div>
                    <div class="w-full h-1 bg-[#E5DED3] rounded-full overflow-hidden">
                      <div 
                        class="h-full bg-[#287A59] transition-all duration-300" 
                        [style.width.%]="topic.totalWords > 0 ? (topic.masteredWords / topic.totalWords * 100) : 0"
                      ></div>
                    </div>
                  </div>

                  <div class="flex items-center justify-between pt-2 border-t border-[#F1ECE3] text-xs">
                    <button
                      type="button"
                      (click)="openTopicStudy(topic, 'FLASHCARD'); $event.stopPropagation()"
                      class="inline-flex items-center gap-1.5 font-semibold text-[#29251F] group-hover:text-[#7D6853] transition-colors cursor-pointer bg-transparent border-0 p-0 text-xs"
                    >
                      <app-icon name="layers" [size]="13"></app-icon>
                      <span>Học thẻ</span>
                    </button>

                    <div class="flex items-center gap-1.5">
                      <button
                        type="button"
                        (click)="openTopicStudy(topic, 'WRITING'); $event.stopPropagation()"
                        class="px-2 py-0.5 rounded-[4px] bg-[#FAF8F5] hover:bg-stone-200/70 border border-[#E5DED3] text-[#7D6853] text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1"
                        title="Luyện viết chính tả từ vựng"
                      >
                        <app-icon name="edit-3" [size]="11"></app-icon>
                        <span>Viết</span>
                      </button>

                      <button
                        type="button"
                        (click)="openTopicStudy(topic, 'AI_QUIZ'); $event.stopPropagation()"
                        class="px-2 py-0.5 rounded-[4px] bg-[#FAF8F5] hover:bg-stone-200/70 border border-[#E5DED3] text-[#7D6853] text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1"
                        title="Luyện trắc nghiệm ngữ cảnh"
                      >
                        <app-icon name="quiz" [size]="11"></app-icon>
                        <span>Trắc nghiệm</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <!-- THANH ĐIỀU KHIỂN PHÂN TRANG CHỦ ĐỀ (TOPIC PAGINATION BAR) -->
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#E5DED3] text-xs text-[#746B60]">
              <div class="flex items-center gap-3">
                <span>
                  Hiển thị <strong class="text-[#29251F]">{{ topicStartIndex }}–{{ topicEndIndex }}</strong> trong <strong class="text-[#29251F]">{{ filteredTopicsList.length }}</strong> chủ đề
                </span>

                <div class="flex items-center gap-1.5 pl-3 border-l border-[#E5DED3]">
                  <span class="text-[11px]">Mỗi trang:</span>
                  <select 
                    [ngModel]="topicPageSize()"
                    (ngModelChange)="setTopicPageSize($event)"
                    class="h-7 px-2.5 bg-white border border-[#E5DED3] rounded-[6px] text-xs font-semibold text-[#7D6853] cursor-pointer focus:outline-hidden shadow-2xs"
                  >
                    <option [ngValue]="4">4 chủ đề</option>
                    <option [ngValue]="6">6 chủ đề</option>
                    <option [ngValue]="8">8 chủ đề</option>
                  </select>
                </div>
              </div>

              <!-- Nút chuyển trang: Trước, Các số trang, Tiếp -->
              <div class="flex items-center gap-1.5">
                <button 
                  type="button" 
                  (click)="prevTopicPage()" 
                  [disabled]="currentTopicPage() === 1"
                  class="h-8 px-3 rounded-[6px] border border-[#E5DED3] bg-white text-xs font-semibold text-[#29251F] hover:bg-[#FAF7F2] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <app-icon name="arrow-left" [size]="13"></app-icon>
                  <span>Trước</span>
                </button>

                <!-- Page numbers -->
                <button 
                  *ngFor="let p of topicPagesArray" 
                  type="button" 
                  (click)="goToTopicPage(p)"
                  class="w-8 h-8 rounded-[6px] text-xs font-mono font-semibold transition-colors cursor-pointer border flex items-center justify-center"
                  [class.bg-[#7D6853]]="currentTopicPage() === p"
                  [class.text-white]="currentTopicPage() === p"
                  [class.border-[#7D6853]]="currentTopicPage() === p"
                  [class.bg-white]="currentTopicPage() !== p"
                  [class.text-[#29251F]]="currentTopicPage() !== p"
                  [class.border-[#E5DED3]]="currentTopicPage() !== p"
                  [class.hover:bg-[#FAF7F2]]="currentTopicPage() !== p"
                >
                  {{ p }}
                </button>

                <button 
                  type="button" 
                  (click)="nextTopicPage()" 
                  [disabled]="currentTopicPage() === totalTopicPages"
                  class="h-8 px-3 rounded-[6px] border border-[#E5DED3] bg-white text-xs font-semibold text-[#29251F] hover:bg-[#FAF7F2] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <span>Tiếp</span>
                  <app-icon name="arrow-right" [size]="13"></app-icon>
                </button>
              </div>
            </div>
          </div>

          <!-- Trạng thái trống khi chưa có chủ đề hoặc từ vựng -->
          <ng-template #emptyTopicsTpl>
            <div class="py-16 text-center max-w-md mx-auto space-y-4">
              <div class="w-16 h-16 rounded-full bg-[#F1ECE3] flex items-center justify-center mx-auto text-[#7D6853]">
                <app-icon name="layers" [size]="28"></app-icon>
              </div>
              <h3 class="font-serif text-2xl font-semibold text-[#29251F] m-0">Chưa có từ vựng nào trong sổ tay</h3>
              <p class="text-xs text-[#746B60] leading-relaxed m-0">
                Sổ tay cá nhân của bạn hiện chưa có từ vựng nào. Hãy mở Bộ sưu tập hoặc Quét ảnh AI để chọn lưu các từ vựng bạn muốn học và ôn tập theo chu kỳ SM-2!
              </p>
              <div class="flex items-center justify-center gap-3 pt-2">
                <a routerLink="/collection" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-white border border-[#7D6853] text-[#7D6853] hover:bg-[#FAF8F5] text-xs font-semibold cursor-pointer shadow-2xs transition-all no-underline">
                  <app-icon name="image" [size]="15" svgClass="text-[#7D6853]"></app-icon>
                  <span>Mở Bộ sưu tập</span>
                </a>
                <a routerLink="/scanner" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold cursor-pointer shadow-xs transition-all no-underline">
                  <app-icon name="camera" [size]="15" svgClass="text-white"></app-icon>
                  <span>Quét ảnh AI</span>
                </a>
              </div>
            </div>
          </ng-template>
        </section>

      </ng-container>

      <!-- =========================================================================
           CHẾ ĐỘ 2: BÀN HỌC FLASHCARD TẬP TRUNG (TOPIC_STUDY)
           Chuẩn xác theo Mockup Figma Screenshot 1: 01 VOCABULARY INDEX | 02 FOCUSED STUDY DECK
           ========================================================================= -->
      <ng-container *ngIf="currentView() === 'TOPIC_STUDY'">

        <!-- 1. Top Subheader với nút Back & Tiêu đề chủ đề -->
        <section class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5DED3]">
          <div class="flex items-center gap-4 min-w-0">
            <button 
              type="button" 
              (click)="backToTopicsList()" 
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#746B60] hover:text-[#29251F] cursor-pointer bg-transparent border-0 p-0 transition-colors shrink-0"
            >
              <app-icon name="arrow-left" [size]="16"></app-icon>
              <span>Sổ từ vựng</span>
            </button>

            <span class="w-[1px] h-6 bg-[#E5DED3]"></span>

            <div class="min-w-0">
              <span class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#7D6853] block">
                Chủ đề đang học · Bộ sưu tập thực tế
              </span>
              <h1 class="font-serif text-xl sm:text-2xl font-semibold text-[#29251F] truncate m-0">
                {{ selectedTopic()?.name }}
              </h1>
            </div>
          </div>

          <!-- Right Deck Controls -->
          <div class="flex items-center gap-3 sm:gap-4 shrink-0">
            <!-- Nút Xóa Toàn Bộ Chủ Đề này khỏi Sổ Tay (chỉ hiện cho chủ đề riêng) -->
            <button 
              *ngIf="selectedTopic()?.id !== 'all'"
              type="button" 
              (click)="confirmDeleteTopic(selectedTopic()!)"
              class="inline-flex items-center gap-1.5 text-xs text-[#A99F95] hover:text-rose-600 cursor-pointer bg-transparent border-0 p-0 transition-colors"
              title="Xóa chủ đề này khỏi sổ tay"
              aria-label="Xóa chủ đề"
            >
              <app-icon name="trash" [size]="14"></app-icon>
              <span>Xóa chủ đề</span>
            </button>

            <span *ngIf="selectedTopic()?.id !== 'all'" class="w-[1px] h-4 bg-[#E5DED3]"></span>

            <button 
              type="button" 
              (click)="shuffleTopicCards()" 
              class="inline-flex items-center gap-1.5 text-xs text-[#746B60] hover:text-[#29251F] cursor-pointer bg-transparent border-0 p-0 transition-colors"
            >
              <app-icon name="shuffle" [size]="15"></app-icon>
              <span>Xáo trộn</span>
            </button>

            <div class="flex items-center gap-2 text-xs text-[#746B60]">
              <span>Đang học từ <strong>{{ activeWordIndex() + 1 }}</strong>/{{ currentTopicWords.length }}</span>
              <div class="w-16 h-1 bg-[#E5DED3] rounded-full overflow-hidden">
                <div 
                  class="h-full bg-[#7D6853]" 
                  [style.width.%]="currentTopicWords.length > 0 ? ((activeWordIndex() + 1) / currentTopicWords.length * 100) : 0"
                ></div>
              </div>
            </div>

            <button 
              type="button" 
              (click)="toast.info('Nhấn Space để lật thẻ, phím Mũi tên trái/phải để chuyển thẻ.', 'Phím Tắt')"
              class="w-7 h-7 rounded-full border border-[#E5DED3] hover:border-[#7D6853] text-[#746B60] hover:text-[#29251F] flex items-center justify-center cursor-pointer bg-transparent p-0 transition-colors text-xs font-bold"
              title="Phím tắt học thẻ"
            >
              ?
            </button>
          </div>
        </section>

        <!-- 2. Workspace 2 Cột: Mục Lục (Left 360px) & Bàn Học Flashcard (Right minmax) -->
        <div class="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-8 items-start">
          
          <!-- CỘT TRÁI (360px): 01 VOCABULARY INDEX (MỤC LỤC TỪ VỰNG) -->
          <section class="min-w-0 space-y-4" aria-labelledby="vocab-index-title">
            <div class="flex items-start gap-3">
              <span class="font-serif text-[13px] font-semibold text-[#7D6853] leading-none mt-1">01</span>
              <div>
                <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#746B60] mb-1">Vocabulary index</p>
                <h2 id="vocab-index-title" class="font-serif text-[21px] font-semibold text-[#29251F] tracking-tight m-0">
                  Mục lục từ vựng
                </h2>
              </div>
            </div>

            <!-- Search Field -->
            <div class="relative pt-1">
              <app-icon name="search" [size]="16" svgClass="text-[#746B60] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></app-icon>
              <input 
                type="search" 
                [(ngModel)]="wordSearchKeyword" 
                (ngModelChange)="currentWordPage.set(1)"
                placeholder="Tìm trong chủ đề..." 
                class="w-full h-[40px] pl-9 pr-3 bg-white border border-[#E5DED3] rounded-[8px] text-xs text-[#29251F] placeholder:text-[#999087] focus:outline-hidden focus:border-[#7D6853] transition-colors"
              />
            </div>

            <!-- Filter Tabs -->
            <div class="flex items-center gap-4 border-b border-[#E5DED3] pt-1" role="group" aria-label="Bộ lọc từ trong chủ đề">
              <button 
                type="button" 
                (click)="setWordFilter('ALL')"
                [class.text-[#29251F]]="wordFilterStatus() === 'ALL'"
                [class.font-semibold]="wordFilterStatus() === 'ALL'"
                [class.border-[#7D6853]]="wordFilterStatus() === 'ALL'"
                [class.text-[#746B60]]="wordFilterStatus() !== 'ALL'"
                class="pb-2 text-[11px] border-b-2 border-transparent transition-all cursor-pointer hover:text-[#29251F] bg-transparent border-0"
              >
                Tất cả {{ topicAllCount }}
              </button>
              <button 
                type="button" 
                (click)="setWordFilter('DUE')"
                [class.text-[#29251F]]="wordFilterStatus() === 'DUE'"
                [class.font-semibold]="wordFilterStatus() === 'DUE'"
                [class.border-[#7D6853]]="wordFilterStatus() === 'DUE'"
                [class.text-[#746B60]]="wordFilterStatus() !== 'DUE'"
                class="pb-2 text-[11px] border-b-2 border-transparent transition-all cursor-pointer hover:text-[#29251F] bg-transparent border-0"
              >
                Cần ôn {{ topicDueCount }}
              </button>
              <button 
                type="button" 
                (click)="setWordFilter('MASTERED')"
                [class.text-[#29251F]]="wordFilterStatus() === 'MASTERED'"
                [class.font-semibold]="wordFilterStatus() === 'MASTERED'"
                [class.border-[#7D6853]]="wordFilterStatus() === 'MASTERED'"
                [class.text-[#746B60]]="wordFilterStatus() !== 'MASTERED'"
                class="pb-2 text-[11px] border-b-2 border-transparent transition-all cursor-pointer hover:text-[#29251F] bg-transparent border-0"
              >
                Đã thuộc {{ topicMasteredCount }}
              </button>
            </div>

            <!-- Danh sách từ trong chủ đề -->
            <div class="flex flex-col border-t border-[#E5DED3] divide-y divide-[#E5DED3]">
              <article 
                *ngFor="let item of pagedTopicWords; let i = index"
                (click)="selectWord(item)"
                [class.bg-[#F1ECE3]]="activeWord?.id === item.id"
                [class.pl-3]="activeWord?.id === item.id"
                class="relative grid grid-cols-[20px_1fr_auto_28px_8px_20px] items-center gap-2 py-3 pr-2 cursor-pointer transition-all hover:bg-[#F1ECE3]/40 group select-none text-left"
              >
                <!-- Indicator Bar for Active Word -->
                <div *ngIf="activeWord?.id === item.id" class="absolute left-0 top-2 bottom-2 w-[2px] bg-[#7D6853]"></div>

                <!-- Speaker Audio Button -->
                <button 
                  type="button" 
                  (click)="studyService.speakWord(item.word); $event.stopPropagation()"
                  class="text-[#746B60] hover:text-[#7D6853] p-0 bg-transparent border-0 cursor-pointer flex items-center justify-center"
                  title="Nghe phát âm"
                >
                  <app-icon name="volume-2" [size]="14"></app-icon>
                </button>

                <!-- Word & IPA -->
                <div class="min-w-0 pr-1">
                  <strong class="font-semibold text-xs text-[#29251F] block leading-snug truncate">{{ item.word }}</strong>
                  <small class="text-[10px] text-[#746B60] font-sans block truncate">{{ item.ipa }}</small>
                </div>

                <!-- Vietnamese Meaning -->
                <span class="text-[11px] text-[#746B60] leading-tight truncate text-right">
                  {{ item.vietnamese }}
                </span>

                <!-- CEFR Badge -->
                <span class="text-[9px] font-bold font-mono text-[#746B60] bg-[#EAE5DC] px-1 py-0.5 rounded-[3px] text-center shrink-0">
                  {{ item.level || 'A2' }}
                </span>

                <!-- Status Dot -->
                <i 
                  class="w-1.5 h-1.5 rounded-full shrink-0" 
                  [class.bg-[#287A59]]="item.status === 'MASTERED'"
                  [class.bg-[#D97706]]="item.status !== 'MASTERED'"
                  [title]="item.status === 'MASTERED' ? 'Đã thuộc vĩnh viễn (5/5 chu kỳ)' : ('Đang trong chu kỳ SM-2 (' + (item.repetition || 0) + '/5 chu kỳ)')"
                ></i>

                <!-- Delete Word Button -->
                <button 
                  type="button" 
                  (click)="confirmDeleteWord(item, $event)"
                  class="opacity-60 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-[#A99F95] hover:text-rose-600 p-0.5 rounded-[3px] hover:bg-rose-50 transition-all cursor-pointer flex items-center justify-center shrink-0"
                  title="Xóa từ khỏi sổ tay"
                  aria-label="Xóa từ khỏi sổ tay"
                >
                  <app-icon name="trash" [size]="12"></app-icon>
                </button>
              </article>

              <div *ngIf="currentTopicWords.length === 0" class="py-8 text-center text-xs text-[#746B60]">
                Không có từ vựng nào khớp với bộ lọc.
              </div>
            </div>

            <!-- Phân trang mục lục từ vựng -->
            <div class="flex items-center justify-between pt-2 text-[10px] text-[#746B60]">
              <span>Hiển thị {{ wordStartIndex }}–{{ wordEndIndex }} trong {{ currentTopicWords.length }} từ</span>
              <div class="flex items-center gap-1.5">
                <button 
                  type="button" 
                  (click)="prevWordPage()" 
                  [disabled]="currentWordPage() === 1"
                  class="h-6 px-2 rounded-[4px] border border-[#E5DED3] bg-white font-semibold text-[#7D6853] hover:bg-[#FAF7F2] disabled:text-[#BFB6AC] disabled:border-transparent disabled:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors text-[10px] flex items-center gap-1"
                >
                  <app-icon name="arrow-left" [size]="11"></app-icon>
                  <span>Trước</span>
                </button>

                <!-- Page numbers for word index -->
                <ng-container *ngIf="totalWordPages > 1">
                  <button 
                    *ngFor="let p of wordPagesArray" 
                    type="button" 
                    (click)="goToWordPage(p)"
                    class="w-5 h-5 rounded-[4px] text-[10px] font-mono font-semibold transition-colors cursor-pointer border flex items-center justify-center p-0"
                    [class.bg-[#7D6853]]="currentWordPage() === p"
                    [class.text-white]="currentWordPage() === p"
                    [class.border-[#7D6853]]="currentWordPage() === p"
                    [class.bg-white]="currentWordPage() !== p"
                    [class.text-[#746B60]]="currentWordPage() !== p"
                    [class.border-[#E5DED3]]="currentWordPage() !== p"
                  >
                    {{ p }}
                  </button>
                </ng-container>

                <button 
                  type="button" 
                  (click)="nextWordPage()" 
                  [disabled]="currentWordPage() === totalWordPages"
                  class="h-6 px-2 rounded-[4px] border border-[#E5DED3] bg-white font-semibold text-[#7D6853] hover:bg-[#FAF7F2] disabled:text-[#BFB6AC] disabled:border-transparent disabled:bg-transparent disabled:cursor-not-allowed cursor-pointer transition-colors text-[10px] flex items-center gap-1"
                >
                  <span>Tiếp</span>
                  <app-icon name="arrow-right" [size]="11"></app-icon>
                </button>
              </div>
            </div>

            <!-- Legend Status -->
            <div class="flex items-center gap-4 pt-1 text-[10px] text-[#746B60]">
              <span class="flex items-center gap-1.5">
                <i class="w-1.5 h-1.5 rounded-full bg-[#D97706]"></i>
                <span>Cần ôn</span>
              </span>
              <span class="flex items-center gap-1.5">
                <i class="w-1.5 h-1.5 rounded-full bg-[#287A59]"></i>
                <span>Đã thuộc</span>
              </span>
            </div>
          </section>

          <!-- CỘT PHẢI (minmax): 02 FOCUSED STUDY DECK (BÀN HỌC ĐA NĂNG: FLASHCARD / LUYỆN VIẾT / TRẮC NGHIỆM AI) -->
          <section class="min-w-0 lg:border-l lg:border-[#E5DED3] lg:pl-8 space-y-5" aria-labelledby="deck-title">
            
            <!-- Header Bàn Học & Thanh Chuyển Chế Độ 3 Trong 1 -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="flex items-start gap-3">
                <span class="font-serif text-[13px] font-semibold text-[#7D6853] leading-none mt-1">02</span>
                <div>
                  <p class="text-[9px] font-bold uppercase tracking-[0.1em] text-[#746B60] mb-0.5">Focused study studio</p>
                  <h2 id="deck-title" class="font-serif text-[21px] font-semibold text-[#29251F] tracking-tight m-0">
                    Bàn học từ vựng
                  </h2>
                </div>
              </div>

              <!-- Thanh chuyển đổi chế độ học Scandinavian: Flashcard | Luyện Viết | Trắc Nghiệm AI -->
              <div class="flex items-center gap-1 p-1 bg-[#F1ECE3] rounded-[10px] border border-[#E5DED3] text-xs font-semibold self-start sm:self-auto">
                <button 
                  type="button"
                  (click)="setStudySubMode('FLASHCARD')"
                  [class.bg-white]="studySubMode() === 'FLASHCARD'"
                  [class.text-[#29251F]]="studySubMode() === 'FLASHCARD'"
                  [class.shadow-2xs]="studySubMode() === 'FLASHCARD'"
                  [class.text-[#746B60]]="studySubMode() !== 'FLASHCARD'"
                  class="px-3 py-1.5 rounded-[7px] border-0 cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <app-icon name="layers" [size]="13"></app-icon>
                  <span>Thẻ Flashcard</span>
                </button>

                <button 
                  type="button"
                  (click)="setStudySubMode('WRITING')"
                  [class.bg-white]="studySubMode() === 'WRITING'"
                  [class.text-[#29251F]]="studySubMode() === 'WRITING'"
                  [class.shadow-2xs]="studySubMode() === 'WRITING'"
                  [class.text-[#746B60]]="studySubMode() !== 'WRITING'"
                  class="px-3 py-1.5 rounded-[7px] border-0 cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <app-icon name="edit-3" [size]="13"></app-icon>
                  <span>Luyện Viết</span>
                </button>

                <button 
                  type="button"
                  (click)="setStudySubMode('AI_QUIZ')"
                  [class.bg-white]="studySubMode() === 'AI_QUIZ'"
                  [class.text-[#29251F]]="studySubMode() === 'AI_QUIZ'"
                  [class.shadow-2xs]="studySubMode() === 'AI_QUIZ'"
                  [class.text-[#746B60]]="studySubMode() !== 'AI_QUIZ'"
                  class="px-3 py-1.5 rounded-[7px] border-0 cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <app-icon name="quiz" [size]="13"></app-icon>
                  <span>Trắc Nghiệm</span>
                </button>
              </div>
            </div>

            <!-- ========================================================
                 CHẾ ĐỘ 1: THẺ FLASHCARD TRUYỀN THỐNG (LẬT THẺ & SM-2)
                 ======================================================== -->
            <div *ngIf="studySubMode() === 'FLASHCARD'" class="space-y-4 animate-fade-in">
              <div *ngIf="activeWord; else noActiveWordTpl" class="space-y-4">
                <div 
                  (click)="toggleFlip()"
                  class="bg-white rounded-2xl border border-[#E5DED3] p-8 sm:p-12 min-h-[380px] sm:min-h-[420px] flex flex-col justify-between cursor-pointer select-none transition-all shadow-xs hover:border-[#7D6853]"
                >
                  <!-- Top Card Metadata -->
                  <div class="flex items-center justify-between text-xs text-[#746B60]">
                    <div class="flex items-center gap-2">
                      <span class="font-medium">
                        {{ activeWord.level || 'A2' }} · {{ activeWord.partOfSpeech || 'Danh từ' }}
                      </span>
                      <span 
                        class="px-2 py-0.5 rounded-[4px] text-[10px] font-bold"
                        [class.bg-emerald-50]="activeWord.status === 'MASTERED'"
                        [class.text-emerald-700]="activeWord.status === 'MASTERED'"
                        [class.border]="activeWord.status === 'MASTERED'"
                        [class.border-emerald-200]="activeWord.status === 'MASTERED'"
                        [class.bg-amber-50]="activeWord.status !== 'MASTERED'"
                        [class.text-amber-700]="activeWord.status !== 'MASTERED'"
                        [class.border-amber-200]="activeWord.status !== 'MASTERED'"
                      >
                        {{ activeWord.status === 'MASTERED' ? '✓ Đã thuộc' : ('Chu kỳ: ' + (activeWord.repetition || 0) + '/5') }}
                      </span>
                    </div>
                    <span class="font-mono text-[10px] tracking-widest text-[#7D6853] uppercase font-bold">
                      {{ isCardFlipped() ? 'BACK · ANSWER' : 'FRONT · RECALL' }}
                    </span>
                  </div>

                  <!-- Subtitle Context -->
                  <div class="text-xs text-[#746B60] mt-1">
                    Bối cảnh: {{ activeWord.sceneName || selectedTopic()?.name }}
                  </div>

                  <!-- CENTER AREA -->
                  <!-- Mặt Trước (Front Side): Từ vựng lớn, IPA, nút phát âm & luyện nói -->
                  <div *ngIf="!isCardFlipped()" class="py-8 text-center space-y-3">
                    <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7D6853] block">Vocabulary</span>
                    <h3 class="font-serif text-4xl sm:text-5xl lg:text-6xl font-normal text-[#29251F] tracking-tight leading-tight m-0">
                      {{ activeWord.word }}
                    </h3>
                    <p class="text-sm sm:text-base text-[#746B60] font-sans m-0">
                      {{ activeWord.ipa }}
                    </p>

                    <div class="flex items-center justify-center gap-3 pt-6" (click)="$event.stopPropagation()">
                      <button 
                        type="button" 
                        (click)="studyService.speakWord(activeWord.word)"
                        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#FAF7F2] hover:bg-stone-100 border border-[#E5DED3] text-[#7D6853] font-semibold text-xs cursor-pointer shadow-2xs transition-all"
                      >
                        <app-icon name="volume-2" [size]="15"></app-icon>
                        <span>Nghe phát âm</span>
                      </button>

                      <button 
                        type="button" 
                        (click)="practiceSpeechWord(activeWord)"
                        class="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#7D6853] hover:bg-[#685542] text-white font-semibold text-xs cursor-pointer shadow-2xs transition-all border-0"
                      >
                        <app-icon name="mic" [size]="15" svgClass="text-white"></app-icon>
                        <span>Luyện phát âm AI</span>
                      </button>
                    </div>
                  </div>

                  <!-- Mặt Sau (Back Side): Nghĩa tiếng Việt, ví dụ câu & Đánh giá SM-2 -->
                  <div *ngIf="isCardFlipped()" class="py-6 text-center space-y-4 animate-fade-in" (click)="$event.stopPropagation()">
                    <div>
                      <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#287A59] block mb-1">Ý nghĩa tiếng Việt</span>
                      <h3 class="font-serif text-3xl sm:text-4xl font-semibold text-[#29251F] m-0">
                        {{ activeWord.vietnamese }}
                      </h3>
                    </div>

                    <!-- Câu ví dụ ngữ cảnh -->
                    <div *ngIf="activeWord.exampleEn" class="max-w-md mx-auto p-3.5 bg-[#F1ECE3] rounded-xl text-left space-y-1">
                      <span class="text-[8px] font-bold uppercase tracking-wider text-[#7D6853] block">Ngữ cảnh thực tế:</span>
                      <p class="font-serif text-sm italic text-[#29251F] leading-relaxed m-0">
                        “{{ activeWord.exampleEn }}”
                      </p>
                      <p *ngIf="activeWord.exampleVi" class="text-xs text-[#746B60] not-italic m-0">
                        {{ activeWord.exampleVi }}
                      </p>
                    </div>

                    <!-- Hàng nút đánh giá trí nhớ SM-2 -->
                    <div class="pt-2 space-y-2">
                      <span class="text-[10px] font-semibold text-[#746B60] block uppercase tracking-wider">
                        Mức độ ghi nhớ theo thuật toán SM-2:
                      </span>
                      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button 
                          type="button" 
                          (click)="submitReview(1)"
                          class="px-3 py-2 rounded-[8px] bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-[11px] font-semibold cursor-pointer transition-all flex flex-col items-center"
                        >
                          <span>Lại</span>
                          <small class="text-[9px] opacity-75">&lt; 1 ngày</small>
                        </button>

                        <button 
                          type="button" 
                          (click)="submitReview(3)"
                          class="px-3 py-2 rounded-[8px] bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-semibold cursor-pointer transition-all flex flex-col items-center"
                        >
                          <span>Khó</span>
                          <small class="text-[9px] opacity-75">3 ngày</small>
                        </button>

                        <button 
                          type="button" 
                          (click)="submitReview(4)"
                          class="px-3 py-2 rounded-[8px] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-semibold cursor-pointer transition-all flex flex-col items-center"
                        >
                          <span>Tốt</span>
                          <small class="text-[9px] opacity-75">7 ngày</small>
                        </button>

                        <button 
                          type="button" 
                          (click)="submitReview(5)"
                          class="px-3 py-2 rounded-[8px] bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-[11px] font-semibold cursor-pointer transition-all flex flex-col items-center"
                        >
                          <span>Dễ</span>
                          <small class="text-[9px] opacity-75">14 ngày</small>
                        </button>
                      </div>

                      <!-- Nút Đã Thuộc Trực Tiếp (Bỏ qua chu kỳ SM-2) -->
                      <div class="pt-2 flex items-center justify-center">
                        <button 
                          type="button" 
                          (click)="markActiveWordMastered()"
                          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-[#FAF8F5] hover:bg-emerald-50 border border-[#E5DED3] hover:border-emerald-300 text-[#5C5249] hover:text-emerald-800 text-[11px] font-medium cursor-pointer transition-all shadow-2xs"
                          title="Đánh dấu đã thuộc thành thạo ngay lập tức nếu bạn đã biết từ này từ trước"
                        >
                          <app-icon name="check" [size]="12" svgClass="text-emerald-600"></app-icon>
                          <span>Tôi đã biết từ này rồi (Đánh dấu Đã Thuộc luôn)</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Bottom Helper Text -->
                  <div class="text-center text-[11px] text-[#746B60] pt-2 border-t border-[#E5DED3]">
                    {{ isCardFlipped() ? 'Chọn một mức độ để cập nhật thuật toán chu kỳ lặp lại SM-2' : 'Nhấp vào thẻ hoặc nhấn Space để lật sang mặt sau' }}
                  </div>
                </div>

                <!-- Bottom Card Navigation Controls -->
                <div class="flex items-center justify-between pt-2">
                  <button 
                    type="button" 
                    (click)="prevCard()" 
                    [disabled]="activeWordIndex() === 0"
                    class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7D6853] hover:underline disabled:text-[#BFB6AC] disabled:no-underline disabled:cursor-not-allowed cursor-pointer bg-transparent border-0 p-0"
                  >
                    <app-icon name="arrow-left" [size]="14"></app-icon>
                    <span>Thẻ trước</span>
                  </button>

                  <!-- Keyboard Shortcuts Indicator Pill -->
                  <div class="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#FAF7F2] border border-[#E5DED3] rounded-full text-[10px] text-[#746B60]">
                    <span class="font-mono bg-white px-1.5 py-0.5 rounded border border-[#E5DED3]">Space</span>
                    <span>Lật thẻ</span>
                    <i class="w-1 h-1 rounded-full bg-[#E5DED3]"></i>
                    <span class="font-mono bg-white px-1.5 py-0.5 rounded border border-[#E5DED3]">← →</span>
                    <span>Đổi thẻ</span>
                  </div>

                  <button 
                    type="button" 
                    (click)="nextCard()" 
                    [disabled]="activeWordIndex() >= currentTopicWords.length - 1"
                    class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7D6853] hover:underline disabled:text-[#BFB6AC] disabled:no-underline disabled:cursor-not-allowed cursor-pointer bg-transparent border-0 p-0"
                  >
                    <span>Thẻ kế tiếp</span>
                    <app-icon name="arrow-right" [size]="14"></app-icon>
                  </button>
                </div>
              </div>
            </div>

            <!-- ========================================================
                 CHẾ ĐỘ 2: LUYỆN VIẾT CHÍNH TẢ (WRITING & SPELLING STUDIO)
                 ======================================================== -->
            <div *ngIf="studySubMode() === 'WRITING'" class="space-y-4 animate-fade-in">
              <div *ngIf="activeWord; else noActiveWordTpl" class="bg-white rounded-2xl border border-[#E5DED3] p-6 sm:p-10 min-h-[420px] flex flex-col justify-between select-none shadow-xs">
                
                <!-- Top Meta Bar -->
                <div class="flex items-center justify-between text-xs text-[#746B60] pb-4 border-b border-[#F1ECE3]">
                  <div class="flex items-center gap-2">
                    <span class="font-medium">{{ activeWord.level || 'A2' }} · {{ activeWord.partOfSpeech || 'Danh từ' }}</span>
                    <span *ngIf="writingStreak() > 0" class="px-2 py-0.5 rounded-[4px] text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <app-icon name="flame" [size]="12" svgClass="text-amber-600"></app-icon>
                      <span>Chuỗi: {{ writingStreak() }}</span>
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] text-[#746B60]">Từ <strong>{{ activeWordIndex() + 1 }}</strong> / {{ currentTopicWords.length }}</span>
                    <span class="font-mono text-[9px] uppercase tracking-wider text-[#7D6853] font-bold bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#E5DED3]">
                      WRITING STUDIO
                    </span>
                  </div>
                </div>

                <!-- Middle: Prompt, Context & Typing Area -->
                <div class="py-6 space-y-6">
                  <!-- Nghĩa tiếng Việt & Bối cảnh -->
                  <div class="text-center space-y-2">
                    <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7D6853] block">
                      Hãy viết từ tiếng Anh mang ý nghĩa:
                    </span>
                    <h3 class="font-serif text-3xl sm:text-4xl font-semibold text-[#29251F] m-0">
                      {{ activeWord.vietnamese }}
                    </h3>
                    <p class="text-xs text-[#746B60] font-sans m-0">
                      Bối cảnh: <strong class="text-[#29251F]">{{ activeWord.sceneName || selectedTopic()?.name }}</strong>
                    </p>
                  </div>

                  <!-- Câu ví dụ che từ mục tiêu -->
                  <div class="max-w-md mx-auto p-3.5 bg-[#FAF8F5] border border-[#E5DED3] rounded-xl text-left space-y-1">
                    <div class="flex items-center justify-between">
                      <span class="text-[8px] font-bold uppercase tracking-wider text-[#7D6853]">Điền từ vào ngữ cảnh:</span>
                      <button 
                        type="button" 
                        (click)="listenWritingAudio()" 
                        class="text-[11px] text-[#7D6853] hover:text-[#29251F] font-semibold flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                        title="Nghe phát âm để chép chính tả"
                      >
                        <app-icon name="volume-2" [size]="13"></app-icon>
                        <span>Nghe đọc mẫu</span>
                      </button>
                    </div>
                    <p class="font-serif text-sm italic text-[#29251F] leading-relaxed m-0">
                      “{{ getMaskedExample(activeWord) }}”
                    </p>
                  </div>

                  <!-- Slot Indicators (Hiển thị số lượng ký tự) -->
                  <div class="flex items-center justify-center gap-1.5 flex-wrap pt-1">
                    <span 
                      *ngFor="let char of getWritingSlotArray(activeWord); let idx = index"
                      class="w-7 h-9 rounded-[6px] border text-sm font-mono font-bold flex items-center justify-center transition-all select-none"
                      [class.bg-[#FAF8F5]]="!writingInput()[idx]"
                      [class.border-[#E5DED3]]="!writingInput()[idx]"
                      [class.text-[#A89F91]]="!writingInput()[idx]"
                      [class.bg-white]="!!writingInput()[idx]"
                      [class.border-[#7D6853]]="!!writingInput()[idx] && writingStatus() === 'IDLE'"
                      [class.text-[#29251F]]="!!writingInput()[idx] && writingStatus() === 'IDLE'"
                      [class.border-emerald-500]="writingStatus() === 'CORRECT'"
                      [class.bg-emerald-50]="writingStatus() === 'CORRECT'"
                      [class.text-emerald-800]="writingStatus() === 'CORRECT'"
                      [class.border-rose-400]="writingStatus() === 'WRONG'"
                      [class.bg-rose-50]="writingStatus() === 'WRONG'"
                      [class.text-rose-800]="writingStatus() === 'WRONG'"
                      [class.border-amber-400]="writingStatus() === 'REVEALED'"
                      [class.bg-amber-50]="writingStatus() === 'REVEALED'"
                      [class.text-amber-800]="writingStatus() === 'REVEALED'"
                    >
                      {{ writingInput()[idx] || (idx < writingHintCount() ? char : '_') }}
                    </span>
                  </div>

                  <!-- Ô nhập liệu chính tả -->
                  <div class="max-w-md mx-auto space-y-3">
                    <div class="relative">
                      <input 
                        type="text" 
                        [(ngModel)]="writingInput" 
                        (keyup.enter)="writingStatus() === 'CORRECT' ? nextWritingWord() : checkWritingAnswer()"
                        [disabled]="writingStatus() === 'CORRECT' || writingStatus() === 'REVEALED'"
                        placeholder="Gõ chính xác từ tiếng Anh tại đây..." 
                        autofocus
                        class="w-full h-12 text-center font-mono text-lg sm:text-xl font-bold rounded-xl border bg-white text-[#29251F] placeholder:text-[#A89F91] placeholder:font-normal placeholder:text-xs focus:outline-hidden transition-all shadow-2xs"
                        [class.border-[#E5DED3]]="writingStatus() === 'IDLE'"
                        [class.focus:border-[#7D6853]]="writingStatus() === 'IDLE'"
                        [class.border-emerald-500]="writingStatus() === 'CORRECT'"
                        [class.bg-emerald-50/30]="writingStatus() === 'CORRECT'"
                        [class.border-rose-500]="writingStatus() === 'WRONG'"
                        [class.bg-rose-50/30]="writingStatus() === 'WRONG'"
                        [class.border-amber-400]="writingStatus() === 'REVEALED'"
                      />
                    </div>

                    <!-- Trạng thái phản hồi sau khi kiểm tra -->
                    <div *ngIf="writingStatus() === 'CORRECT'" class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2 animate-fade-in">
                      <div class="flex items-center justify-center gap-1.5 text-emerald-800 font-semibold text-xs">
                        <app-icon name="check-circle" [size]="16" svgClass="text-emerald-600"></app-icon>
                        <span>Chính xác tuyệt vời! {{ activeWord.word }} {{ activeWord.ipa }}</span>
                      </div>
                      <p class="text-[11px] text-emerald-700 m-0">
                        Đã cập nhật chu kỳ Spaced Repetition (SM-2) cho kỹ năng Viết.
                      </p>
                      <button 
                        type="button" 
                        (click)="nextWritingWord()"
                        class="px-5 py-2 rounded-[8px] bg-[#287A59] hover:bg-[#1E5C43] text-white text-xs font-semibold cursor-pointer border-0 shadow-2xs transition-all inline-flex items-center gap-1.5"
                      >
                        <span>Từ tiếp theo (Nhấn Enter)</span>
                        <app-icon name="arrow-right" [size]="13"></app-icon>
                      </button>
                    </div>

                    <div *ngIf="writingStatus() === 'WRONG'" class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-1 animate-fade-in">
                      <span class="text-xs font-semibold text-rose-800 block">
                        Chưa chính xác! Bạn hãy thử lại hoặc bấm "Gợi ý chữ cái".
                      </span>
                    </div>

                    <div *ngIf="writingStatus() === 'REVEALED'" class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2 animate-fade-in">
                      <div class="text-xs font-semibold text-amber-900">
                        Đáp án chính xác: <strong class="text-lg font-mono">{{ activeWord.word }}</strong> {{ activeWord.ipa }}
                      </div>
                      <p class="text-[11px] text-amber-800 m-0">
                        Từ vựng đã được xếp lịch ôn tập lại để củng cố trí nhớ.
                      </p>
                      <button 
                        type="button" 
                        (click)="nextWritingWord()"
                        class="px-5 py-2 rounded-[8px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold cursor-pointer border-0 shadow-2xs transition-all inline-flex items-center gap-1.5"
                      >
                        <span>Tiếp tục từ sau</span>
                        <app-icon name="arrow-right" [size]="13"></app-icon>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Bottom Helper Actions -->
                <div class="flex items-center justify-between pt-4 border-t border-[#F1ECE3] text-xs">
                  <div class="flex items-center gap-2">
                    <button 
                      type="button" 
                      (click)="giveWritingHint()" 
                      [disabled]="writingStatus() === 'CORRECT' || writingHintCount() >= activeWord.word.length"
                      class="px-3 py-1.5 rounded-[8px] bg-[#FAF8F5] hover:bg-stone-100 border border-[#E5DED3] text-[#7D6853] text-xs font-medium cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                      title="Gợi ý thêm 1 ký tự"
                    >
                      <app-icon name="lightbulb" [size]="13" svgClass="text-[#7D6853]"></app-icon>
                      <span>Gợi ý ({{ writingHintCount() }}/{{ activeWord.word.length }})</span>
                    </button>

                    <button 
                      type="button" 
                      (click)="revealWritingAnswer()" 
                      [disabled]="writingStatus() === 'CORRECT' || writingStatus() === 'REVEALED'"
                      class="px-3 py-1.5 rounded-[8px] bg-transparent hover:bg-rose-50 text-[#746B60] hover:text-rose-700 text-xs font-medium cursor-pointer transition-all border border-transparent disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <app-icon name="eye" [size]="13" svgClass="text-[#746B60]"></app-icon>
                      <span>Xem đáp án</span>
                    </button>
                  </div>

                  <div class="flex items-center gap-2">
                    <button 
                      *ngIf="writingStatus() === 'IDLE' || writingStatus() === 'WRONG'"
                      type="button" 
                      (click)="checkWritingAnswer()"
                      class="px-5 py-2 rounded-[8px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold cursor-pointer border-0 shadow-2xs transition-all flex items-center gap-1.5"
                    >
                      <span>Kiểm tra</span>
                      <app-icon name="arrow-right" [size]="13"></app-icon>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <!-- ========================================================
                 CHẾ ĐỘ 3: TRẮC NGHIỆM NGỮ CẢNH (CONTEXTUAL QUIZ)
                 ======================================================== -->
            <div *ngIf="studySubMode() === 'AI_QUIZ'" class="space-y-4 animate-fade-in">
              
              <!-- State 1: Đang sinh đề thi -->
              <div *ngIf="isGeneratingQuiz()" class="bg-white rounded-2xl border border-[#E5DED3] p-12 text-center space-y-4 shadow-xs">
                <div class="w-16 h-16 rounded-full bg-[#FAF8F5] border border-[#E5DED3] text-[#7D6853] flex items-center justify-center mx-auto animate-pulse">
                  <app-icon name="quiz" [size]="28" svgClass="text-[#7D6853]"></app-icon>
                </div>
                <div class="space-y-1">
                  <span class="text-[10px] font-bold uppercase tracking-widest text-[#7D6853] font-mono block">
                    BIÊN SOẠN CÂU HỎI TỰ ĐỘNG
                  </span>
                  <h3 class="font-serif text-2xl font-semibold text-[#29251F] m-0">
                    Hệ thống đang biên soạn đề thi trắc nghiệm...
                  </h3>
                  <p class="text-xs text-[#746B60] max-w-md mx-auto leading-relaxed">
                    Đang thiết lập tình huống đời thực và phương án kiểm tra chuẩn CEFR cho {{ currentTopicWords.length }} từ vựng thuộc bối cảnh "{{ selectedTopic()?.name }}".
                  </p>
                </div>
              </div>

              <!-- State 2: Đang làm bài thi (Câu hỏi hiện tại) -->
              <div *ngIf="!isGeneratingQuiz() && !quizCompleted() && currentQuizQuestion as q" class="bg-white rounded-2xl border border-[#E5DED3] p-6 sm:p-10 min-h-[420px] flex flex-col justify-between shadow-xs select-none">
                
                <!-- Top Quiz Meta -->
                <div class="flex items-center justify-between text-xs text-[#746B60] pb-4 border-b border-[#F1ECE3]">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs font-semibold text-[#29251F]">
                      Câu {{ currentQuizIndex() + 1 }} / {{ aiQuizList().length }}
                    </span>
                    <span class="px-2 py-0.5 rounded-[4px] text-[10px] font-medium bg-[#FAF8F5] text-[#7D6853] border border-[#E5DED3]">
                      Trắc nghiệm ngữ cảnh
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-[#287A59]">
                      Đúng: {{ quizScore().correct }} / {{ currentQuizIndex() + (isOptionSubmitted() ? 1 : 0) }}
                    </span>
                    <button 
                      type="button" 
                      (click)="generateAiQuizForCurrentTopic()" 
                      class="text-[11px] text-[#7D6853] hover:underline cursor-pointer bg-transparent border-0 p-0 ml-2"
                      title="Sinh lại bộ câu hỏi khác"
                    >
                      Đổi bộ đề khác
                    </button>
                  </div>
                </div>

                <!-- Question Prompt -->
                <div class="py-6 space-y-4">
                  <div class="space-y-2">
                    <span class="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7D6853] block">
                      Chọn phương án chính xác nhất để hoàn thành câu:
                    </span>
                    <h3 class="font-serif text-xl sm:text-2xl font-medium text-[#29251F] leading-snug m-0">
                      {{ q.questionEn }}
                    </h3>
                    <p class="text-xs text-[#746B60] italic m-0">
                      Gợi ý: {{ q.questionVi }}
                    </p>
                  </div>

                  <!-- 4 Options Grid -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button 
                      *ngFor="let opt of q.options"
                      type="button"
                      (click)="selectQuizOption(opt.slice(0, 1))"
                      [disabled]="isOptionSubmitted()"
                      class="p-4 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer flex items-center justify-between"
                      [class.bg-white]="selectedOptionLetter() !== opt.slice(0, 1) && !isOptionSubmitted()"
                      [class.border-[#E5DED3]]="selectedOptionLetter() !== opt.slice(0, 1) && !isOptionSubmitted()"
                      [class.hover:border-[#7D6853]]="selectedOptionLetter() !== opt.slice(0, 1) && !isOptionSubmitted()"
                      [class.border-[#7D6853]]="selectedOptionLetter() === opt.slice(0, 1) && !isOptionSubmitted()"
                      [class.bg-[#FAF8F5]]="selectedOptionLetter() === opt.slice(0, 1) && !isOptionSubmitted()"
                      [class.ring-2]="selectedOptionLetter() === opt.slice(0, 1) && !isOptionSubmitted()"
                      [class.ring-[#7D6853]/20]="selectedOptionLetter() === opt.slice(0, 1) && !isOptionSubmitted()"
                      [class.bg-emerald-50]="isOptionSubmitted() && opt.slice(0, 1) === q.correctAnswer"
                      [class.border-emerald-500]="isOptionSubmitted() && opt.slice(0, 1) === q.correctAnswer"
                      [class.text-emerald-900]="isOptionSubmitted() && opt.slice(0, 1) === q.correctAnswer"
                      [class.font-semibold]="isOptionSubmitted() && opt.slice(0, 1) === q.correctAnswer"
                      [class.bg-rose-50]="isOptionSubmitted() && selectedOptionLetter() === opt.slice(0, 1) && opt.slice(0, 1) !== q.correctAnswer"
                      [class.border-rose-400]="isOptionSubmitted() && selectedOptionLetter() === opt.slice(0, 1) && opt.slice(0, 1) !== q.correctAnswer"
                      [class.text-rose-900]="isOptionSubmitted() && selectedOptionLetter() === opt.slice(0, 1) && opt.slice(0, 1) !== q.correctAnswer"
                      [class.opacity-50]="isOptionSubmitted() && opt.slice(0, 1) !== q.correctAnswer && selectedOptionLetter() !== opt.slice(0, 1)"
                    >
                      <span>{{ opt }}</span>
                      <app-icon *ngIf="isOptionSubmitted() && opt.slice(0, 1) === q.correctAnswer" name="check" [size]="16" svgClass="text-emerald-600 shrink-0"></app-icon>
                      <app-icon *ngIf="isOptionSubmitted() && selectedOptionLetter() === opt.slice(0, 1) && opt.slice(0, 1) !== q.correctAnswer" name="x" [size]="16" svgClass="text-rose-600 shrink-0"></app-icon>
                    </button>
                  </div>

                  <!-- Detailed Explanation Box -->
                  <div *ngIf="isOptionSubmitted()" class="p-4 bg-[#FAF8F5] border border-[#E5DED3] rounded-xl space-y-1.5 animate-fade-in">
                    <div class="flex items-center gap-1.5 text-xs font-semibold" [class.text-[#287A59]]="selectedOptionLetter() === q.correctAnswer" [class.text-rose-700]="selectedOptionLetter() !== q.correctAnswer">
                      <app-icon [name]="selectedOptionLetter() === q.correctAnswer ? 'check-circle' : 'info'" [size]="14"></app-icon>
                      <span>{{ selectedOptionLetter() === q.correctAnswer ? 'Bạn đã trả lời chính xác!' : 'Đáp án đúng là ' + q.correctAnswer }}</span>
                    </div>
                    <p class="text-xs text-[#29251F] leading-relaxed m-0">
                      {{ q.explanationVi }}
                    </p>
                  </div>
                </div>

                <!-- Bottom Action Controls -->
                <div class="flex items-center justify-between pt-4 border-t border-[#F1ECE3]">
                  <span class="text-[11px] text-[#746B60]">
                    {{ isOptionSubmitted() ? 'Hệ thống đã tự động chấm điểm SM-2 cho từ vựng này' : 'Chọn 1 phương án rồi bấm Xác nhận' }}
                  </span>

                  <button 
                    *ngIf="!isOptionSubmitted()"
                    type="button" 
                    (click)="submitQuizAnswer()" 
                    [disabled]="!selectedOptionLetter()"
                    class="px-5 py-2 rounded-[8px] bg-[#7D6853] hover:bg-[#685542] disabled:bg-[#BFB6AC] disabled:cursor-not-allowed text-white text-xs font-semibold cursor-pointer border-0 shadow-2xs transition-all"
                  >
                    Xác nhận đáp án
                  </button>

                  <button 
                    *ngIf="isOptionSubmitted()"
                    type="button" 
                    (click)="nextQuizQuestion()" 
                    class="px-5 py-2 rounded-[8px] bg-[#287A59] hover:bg-[#1E5C43] text-white text-xs font-semibold cursor-pointer border-0 shadow-2xs transition-all inline-flex items-center gap-1.5"
                  >
                    <span>{{ currentQuizIndex() < aiQuizList().length - 1 ? 'Câu tiếp theo' : 'Xem tổng kết bài thi' }}</span>
                    <app-icon name="arrow-right" [size]="13"></app-icon>
                  </button>
                </div>

              </div>

              <!-- State 3: Tổng kết bài thi (Quiz Completed) -->
              <div *ngIf="!isGeneratingQuiz() && quizCompleted()" class="bg-white rounded-2xl border border-[#E5DED3] p-10 text-center space-y-6 shadow-xs animate-fade-in">
                <div class="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                  <app-icon name="check-circle" [size]="32" svgClass="text-emerald-600"></app-icon>
                </div>

                <div class="space-y-2">
                  <span class="text-[10px] font-bold uppercase tracking-widest text-[#7D6853] font-mono block">
                    TỔNG KẾT BÀI THI TRẮC NGHIỆM
                  </span>
                  <h3 class="font-serif text-3xl font-semibold text-[#29251F] m-0">
                    Hoàn Thành Bài Thi Trắc Nghiệm!
                  </h3>
                  <p class="text-sm text-[#746B60] max-w-md mx-auto m-0 leading-relaxed">
                    Bạn đã trả lời đúng <strong class="text-[#287A59] font-bold text-base">{{ quizScore().correct }}</strong> / {{ aiQuizList().length }} câu hỏi
                    ({{ Math.round(aiQuizList().length > 0 ? (quizScore().correct / aiQuizList().length * 100) : 0) }}%). Toàn bộ tiến trình đã được cập nhật vào thuật toán SM-2.
                  </p>
                </div>

                <div class="flex items-center justify-center gap-3 pt-2">
                  <button 
                    type="button" 
                    (click)="restartQuiz()" 
                    class="px-4 py-2.5 rounded-[10px] border border-[#E5DED3] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#29251F] cursor-pointer transition-all shadow-2xs"
                  >
                    Làm lại bộ đề này
                  </button>
                  <button 
                    type="button" 
                    (click)="generateAiQuizForCurrentTopic()" 
                    class="px-4 py-2.5 rounded-[10px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold cursor-pointer border-0 shadow-2xs transition-all flex items-center gap-1.5"
                  >
                    <app-icon name="refresh-cw" [size]="13"></app-icon>
                    <span>Sinh bộ câu hỏi mới</span>
                  </button>
                  <button 
                    type="button" 
                    (click)="setStudySubMode('WRITING')" 
                    class="px-4 py-2.5 rounded-[10px] bg-[#FAF8F5] hover:bg-stone-200/60 border border-[#E5DED3] text-[#7D6853] text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <app-icon name="edit-3" [size]="14"></app-icon>
                    <span>Chuyển sang Luyện viết</span>
                  </button>
                </div>
              </div>

            </div>

            <!-- Trạng thái trống khi chưa có từ vựng nào trong chủ đề -->
            <ng-template #noActiveWordTpl>
              <div class="bg-white rounded-2xl border border-[#E5DED3] p-12 text-center text-xs text-[#746B60]">
                Không có từ vựng nào trong danh sách. Hãy thử chọn bộ lọc khác.
              </div>
            </ng-template>

          </section>

        </div>

      </ng-container>

      <!-- =========================================================================
           SCANDINAVIAN EDITORIAL MODAL: XÁC NHẬN XÓA CHỦ ĐỀ
           ========================================================================= -->
      <div 
        *ngIf="topicToDelete() as targetTopic"
        class="fixed inset-0 z-50 bg-[#29251F]/40 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
        (click)="cancelDeleteTopic()"
      >
        <div 
          class="bg-[#FAF8F5] border border-[#E5DED3] rounded-[4px] max-w-md w-full p-6 shadow-xl space-y-4"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-[4px] bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <app-icon name="trash" [size]="20"></app-icon>
            </div>
            <div>
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-rose-600 block">Thao tác xóa chủ đề</span>
              <h3 class="font-serif text-xl font-bold text-[#29251F] m-0 mt-0.5">Xóa chủ đề này?</h3>
            </div>
          </div>

          <p class="text-xs text-[#746B60] leading-relaxed m-0">
            Bạn có chắc chắn muốn xóa chủ đề <strong class="text-[#29251F]">"{{ targetTopic.name }}"</strong> với <strong class="text-[#29251F]">{{ targetTopic.totalWords }} câu hỏi / từ vựng</strong>? Toàn bộ tiến độ học Spaced Repetition của các từ trong chủ đề này sẽ được xóa khỏi sổ tay.
          </p>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5DED3]">
            <button 
              type="button" 
              (click)="cancelDeleteTopic()"
              [disabled]="isDeletingTopic()"
              class="px-4 py-2 rounded-[4px] border border-[#E5DED3] bg-white hover:bg-[#FAF8F5] text-[#29251F] text-xs font-semibold cursor-pointer transition-colors"
            >
              Hủy bỏ
            </button>
            <button 
              type="button" 
              (click)="executeDeleteTopic()"
              [disabled]="isDeletingTopic()"
              class="px-4 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold border-0 cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <app-icon *ngIf="!isDeletingTopic()" name="trash" [size]="14"></app-icon>
              <span>{{ isDeletingTopic() ? 'Đang xóa...' : 'Xác nhận xóa' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           SCANDINAVIAN EDITORIAL MODAL: XÁC NHẬN XÓA TỪ VỰNG KHỎI SỔ TAY
           ========================================================================= -->
      <div 
        *ngIf="wordToDelete() as targetWord"
        class="fixed inset-0 z-50 bg-[#29251F]/40 backdrop-blur-xs flex items-center justify-center p-4 transition-all"
        (click)="cancelDeleteWord()"
      >
        <div 
          class="bg-[#FAF8F5] border border-[#E5DED3] rounded-[4px] max-w-md w-full p-6 shadow-xl space-y-4"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-[4px] bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
              <app-icon name="trash" [size]="20"></app-icon>
            </div>
            <div>
              <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-rose-600 block">Thao tác xóa từ vựng</span>
              <h3 class="font-serif text-xl font-bold text-[#29251F] m-0 mt-0.5">Xóa từ khỏi sổ tay?</h3>
            </div>
          </div>

          <p class="text-xs text-[#746B60] leading-relaxed m-0">
            Bạn có chắc chắn muốn xóa từ <strong class="text-[#29251F]">"{{ targetWord.word }}"</strong> ({{ targetWord.vietnamese }}) khỏi sổ tay Spaced Repetition?
          </p>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5DED3]">
            <button 
              type="button" 
              (click)="cancelDeleteWord()"
              [disabled]="isDeletingWord()"
              class="px-4 py-2 rounded-[4px] border border-[#E5DED3] bg-white hover:bg-[#FAF8F5] text-[#29251F] text-xs font-semibold cursor-pointer transition-colors"
            >
              Hủy bỏ
            </button>
            <button 
              type="button" 
              (click)="executeDeleteWord()"
              [disabled]="isDeletingWord()"
              class="px-4 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold border-0 cursor-pointer transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <app-icon *ngIf="!isDeletingWord()" name="trash" [size]="14"></app-icon>
              <span>{{ isDeletingWord() ? 'Đang xóa...' : 'Xác nhận xóa' }}</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  `
})
export class UserFlashcardsComponent {
  public api = inject(ApiService);
  public studyService = inject(UserStudyService);
  public speechService = inject(SpeechService);
  public toast = inject(ToastService);

  // Điều hướng 2 tầng: 'TOPICS_LIST' (Mục lục chủ đề) hoặc 'TOPIC_STUDY' (Vào học chủ đề)
  currentView = signal<'TOPICS_LIST' | 'TOPIC_STUDY'>('TOPICS_LIST');

  // Chế độ học tập chi tiết trong Bàn học: Thẻ Flashcard, Luyện Viết Chính Tả, Trắc Nghiệm AI Groq
  studySubMode = signal<'FLASHCARD' | 'WRITING' | 'AI_QUIZ'>('FLASHCARD');

  // STATE LUYỆN VIẾT CHÍNH TẢ (WRITING STUDIO)
  writingInput = signal<string>('');
  writingStatus = signal<'IDLE' | 'CORRECT' | 'WRONG' | 'REVEALED'>('IDLE');
  writingHintCount = signal<number>(0);
  writingStreak = signal<number>(0);
  writingStartTime = 0;

  // STATE TRẮC NGHIỆM AI GROQ (AI DYNAMIC QUIZ)
  isGeneratingQuiz = signal<boolean>(false);
  aiQuizList = signal<QuizQuestion[]>([]);
  currentQuizIndex = signal<number>(0);
  selectedOptionLetter = signal<string | null>(null);
  isOptionSubmitted = signal<boolean>(false);
  quizScore = signal<{ correct: number; total: number }>({ correct: 0, total: 0 });
  quizCompleted = signal<boolean>(false);
  quizSource = signal<string>('');
  quizTitle = signal<string>('');

  // Chủ đề đang được chọn
  selectedTopic = signal<TopicItem | null>(null);

  // Bộ lọc chủ đề ở Tầng 1
  topicFilterStatus = signal<'ALL' | 'DUE' | 'MASTERED'>('ALL');
  topicSearchKeyword = '';

  // Phân trang danh sách chủ đề ở Tầng 1 (4 chủ đề / trang - 2 hàng x 2 cột chuẩn tỉ lệ)
  topicPageSize = signal<number>(4);
  currentTopicPage = signal<number>(1);

  // Vị trí từ đang hiển thị trên Thẻ Flashcard bên phải ở Tầng 2
  activeWordIndex = signal<number>(0);

  // Trạng thái lật thẻ Flashcard (mặt trước / mặt sau)
  isCardFlipped = signal<boolean>(false);

  // Tìm kiếm & Lọc từ ở Tầng 2
  wordSearchKeyword = '';
  wordFilterStatus = signal<'ALL' | 'DUE' | 'MASTERED'>('ALL');

  // Phân trang danh sách từ ở Tầng 2 (5 từ / trang)
  wordPageSize = 5;
  currentWordPage = signal<number>(1);

  // Helper Math for template
  Math = Math;

  // State xóa chủ đề
  topicToDelete = signal<TopicItem | null>(null);
  isDeletingTopic = signal<boolean>(false);

  // State xóa từ vựng
  wordToDelete = signal<SavedWordItem | null>(null);
  isDeletingWord = signal<boolean>(false);

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.currentView() !== 'TOPIC_STUDY') return;
    if (this.studySubMode() !== 'FLASHCARD') return;
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

    if (event.code === 'Space') {
      event.preventDefault();
      this.toggleFlip();
    } else if (event.code === 'ArrowLeft') {
      event.preventDefault();
      this.prevCard();
    } else if (event.code === 'ArrowRight') {
      event.preventDefault();
      this.nextCard();
    }
  }

  get totalDueCount(): number {
    return this.studyService.savedWords().filter(w => w.isDue).length;
  }

  get totalLearningCount(): number {
    return this.studyService.savedWords().filter(w => !w.isDue && w.status !== 'MASTERED').length;
  }

  get totalMasteredCount(): number {
    return this.studyService.savedWords().filter(w => w.status === 'MASTERED').length;
  }

  get topicAllCount(): number {
    const topic = this.selectedTopic();
    if (!topic) return 0;
    if (topic.id === 'all') return this.studyService.savedWords().length;
    return this.studyService.savedWords().filter(w => {
      const t = (w.sceneName && w.sceneName.trim()) ? w.sceneName.trim() : 'Bối cảnh đời sống';
      return t === topic.name;
    }).length;
  }

  get topicDueCount(): number {
    const topic = this.selectedTopic();
    if (!topic) return 0;
    if (topic.id === 'all') return this.studyService.savedWords().filter(w => w.isDue).length;
    return this.studyService.savedWords().filter(w => {
      const t = (w.sceneName && w.sceneName.trim()) ? w.sceneName.trim() : 'Bối cảnh đời sống';
      return t === topic.name && w.isDue;
    }).length;
  }

  get topicMasteredCount(): number {
    const topic = this.selectedTopic();
    if (!topic) return 0;
    if (topic.id === 'all') return this.studyService.savedWords().filter(w => w.status === 'MASTERED').length;
    return this.studyService.savedWords().filter(w => {
      const t = (w.sceneName && w.sceneName.trim()) ? w.sceneName.trim() : 'Bối cảnh đời sống';
      return t === topic.name && w.status === 'MASTERED';
    }).length;
  }

  /**
   * Danh sách toàn bộ các Chủ Đề Từ Vựng (Tầng 1)
   */
  get topicsList(): TopicItem[] {
    const words = this.studyService.savedWords();
    const map = new Map<string, SavedWordItem[]>();

    for (const w of words) {
      const topicName = (w.sceneName && w.sceneName.trim()) ? w.sceneName.trim() : 'Bối cảnh đời sống';
      if (!map.has(topicName)) {
        map.set(topicName, []);
      }
      map.get(topicName)!.push(w);
    }

    const list: TopicItem[] = [];

    // Deck đặc biệt: "Toàn Bộ Kho Từ Vựng" để học viên có thể ôn tất cả nếu muốn
    if (words.length > 0) {
      list.push({
        id: 'all',
        name: 'Toàn bộ kho từ vựng',
        icon: 'layers',
        totalWords: words.length,
        dueWords: words.filter(w => w.isDue).length,
        learningWords: words.filter(w => !w.isDue && w.status !== 'MASTERED').length,
        masteredWords: words.filter(w => w.status === 'MASTERED').length,
        sampleWords: words.slice(0, 5).map(w => w.word)
      });
    }

    // Các Deck phân theo từng bối cảnh cụ thể từ CSDL
    const entries = Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
    for (const [name, topicWords] of entries) {
      list.push({
        id: name,
        name,
        icon: this.getTopicIcon(name),
        totalWords: topicWords.length,
        dueWords: topicWords.filter(w => w.isDue).length,
        learningWords: topicWords.filter(w => !w.isDue && w.status !== 'MASTERED').length,
        masteredWords: topicWords.filter(w => w.status === 'MASTERED').length,
        sampleWords: topicWords.slice(0, 5).map(w => w.word),
        imageUrl: topicWords.find(w => w.sceneImageUrl)?.sceneImageUrl
      });
    }

    return list;
  }

  get filteredTopicsList(): TopicItem[] {
    let list = this.topicsList;

    // 1. Lọc theo trạng thái
    const status = this.topicFilterStatus();
    if (status === 'DUE') {
      list = list.filter(t => t.dueWords > 0);
    } else if (status === 'MASTERED') {
      list = list.filter(t => t.totalWords > 0 && t.masteredWords === t.totalWords);
    }

    // 2. Lọc theo từ khóa tìm kiếm
    const kw = this.topicSearchKeyword.trim().toLowerCase();
    if (kw) {
      list = list.filter(t =>
        t.name.toLowerCase().includes(kw) ||
        t.sampleWords.some(w => w.toLowerCase().includes(kw))
      );
    }

    return list;
  }

  get totalTopicPages(): number {
    return Math.ceil(this.filteredTopicsList.length / this.topicPageSize()) || 1;
  }

  get paginatedTopicsList(): TopicItem[] {
    const start = (this.currentTopicPage() - 1) * this.topicPageSize();
    return this.filteredTopicsList.slice(start, start + this.topicPageSize());
  }

  get topicStartIndex(): number {
    if (this.filteredTopicsList.length === 0) return 0;
    return (this.currentTopicPage() - 1) * this.topicPageSize() + 1;
  }

  get topicEndIndex(): number {
    return Math.min(this.currentTopicPage() * this.topicPageSize(), this.filteredTopicsList.length);
  }

  get topicPagesArray(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalTopicPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  getTopicNumber(indexInPage: number): string {
    const num = (this.currentTopicPage() - 1) * this.topicPageSize() + indexInPage + 1;
    return num < 10 ? '0' + num : '' + num;
  }

  prevTopicPage() {
    if (this.currentTopicPage() > 1) {
      this.currentTopicPage.update(p => p - 1);
    }
  }

  nextTopicPage() {
    if (this.currentTopicPage() < this.totalTopicPages) {
      this.currentTopicPage.update(p => p + 1);
    }
  }

  goToTopicPage(page: number) {
    if (page >= 1 && page <= this.totalTopicPages) {
      this.currentTopicPage.set(page);
    }
  }

  setTopicPageSize(size: number) {
    this.topicPageSize.set(size);
    this.currentTopicPage.set(1);
  }

  setTopicFilter(status: 'ALL' | 'DUE' | 'MASTERED') {
    this.topicFilterStatus.set(status);
    this.currentTopicPage.set(1);
  }

  /**
   * Bắt đầu phiên ôn các thẻ đến hạn hôm nay
   */
  startDueCardsReview() {
    if (this.totalDueCount === 0) return;
    const allTopic = this.topicsList.find(t => t.id === 'all') || this.topicsList[0];
    if (allTopic) {
      this.openTopicStudy(allTopic);
      this.wordFilterStatus.set('DUE');
      this.currentWordPage.set(1);
    }
  }

  getTopicIcon(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('bàn') || lower.includes('làm việc') || lower.includes('học') || lower.includes('desk') || lower.includes('work')) return 'layers';
    if (lower.includes('bếp') || lower.includes('ăn') || lower.includes('kitchen') || lower.includes('dining')) return 'image';
    if (lower.includes('khách') || lower.includes('living') || lower.includes('nhà')) return 'image';
    if (lower.includes('ngủ') || lower.includes('tắm') || lower.includes('bed') || lower.includes('bath')) return 'map-pin';
    if (lower.includes('cá nhân') || lower.includes('đồ dùng') || lower.includes('item') || lower.includes('personal')) return 'bookmark';
    return 'folder';
  }

  get currentTopicWords(): SavedWordItem[] {
    const topic = this.selectedTopic();
    if (!topic) return [];

    let list = this.studyService.savedWords();
    if (topic.id !== 'all') {
      list = list.filter(w => {
        const tName = (w.sceneName && w.sceneName.trim()) ? w.sceneName.trim() : 'Bối cảnh đời sống';
        return tName === topic.name;
      });
    }

    const kw = this.wordSearchKeyword.trim().toLowerCase();
    if (kw) {
      list = list.filter(w =>
        w.word.toLowerCase().includes(kw) ||
        w.vietnamese.toLowerCase().includes(kw) ||
        (w.ipa && w.ipa.toLowerCase().includes(kw))
      );
    }

    const status = this.wordFilterStatus();
    if (status === 'DUE') {
      list = list.filter(w => w.isDue);
    } else if (status === 'MASTERED') {
      list = list.filter(w => w.status === 'MASTERED');
    }

    return list;
  }

  get totalWordPages(): number {
    return Math.ceil(this.currentTopicWords.length / this.wordPageSize) || 1;
  }

  get pagedTopicWords(): SavedWordItem[] {
    const start = (this.currentWordPage() - 1) * this.wordPageSize;
    return this.currentTopicWords.slice(start, start + this.wordPageSize);
  }

  get wordStartIndex(): number {
    if (this.currentTopicWords.length === 0) return 0;
    return (this.currentWordPage() - 1) * this.wordPageSize + 1;
  }

  get wordEndIndex(): number {
    return Math.min(this.currentWordPage() * this.wordPageSize, this.currentTopicWords.length);
  }

  prevWordPage() {
    if (this.currentWordPage() > 1) {
      this.currentWordPage.update(p => p - 1);
    }
  }

  nextWordPage() {
    if (this.currentWordPage() < this.totalWordPages) {
      this.currentWordPage.update(p => p + 1);
    }
  }

  get wordPagesArray(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalWordPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToWordPage(page: number) {
    if (page >= 1 && page <= this.totalWordPages) {
      this.currentWordPage.set(page);
    }
  }

  setWordFilter(status: 'ALL' | 'DUE' | 'MASTERED') {
    this.wordFilterStatus.set(status);
    this.currentWordPage.set(1);
    this.activeWordIndex.set(0);
  }

  get activeWord(): SavedWordItem | null {
    const words = this.currentTopicWords;
    if (words.length === 0) return null;
    const idx = Math.min(Math.max(0, this.activeWordIndex()), words.length - 1);
    return words[idx] || null;
  }

  get currentQuizQuestion(): QuizQuestion | null {
    const list = this.aiQuizList();
    if (list.length === 0) return null;
    const idx = Math.min(Math.max(0, this.currentQuizIndex()), list.length - 1);
    return list[idx] || null;
  }

  getMaskedExample(word: SavedWordItem | null): string {
    if (!word || !word.exampleEn) return 'I see the ______ right here.';
    const escaped = word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    return word.exampleEn.replace(regex, '______');
  }

  getWritingSlotArray(word: SavedWordItem | null): string[] {
    if (!word || !word.word) return [];
    return word.word.split('');
  }

  setStudySubMode(mode: 'FLASHCARD' | 'WRITING' | 'AI_QUIZ') {
    this.studySubMode.set(mode);
    if (mode === 'WRITING') {
      this.resetWritingState();
    } else if (mode === 'AI_QUIZ') {
      if (this.aiQuizList().length === 0) {
        this.generateAiQuizForCurrentTopic();
      }
    }
  }

  resetWritingState() {
    this.writingInput.set('');
    this.writingStatus.set('IDLE');
    this.writingHintCount.set(0);
    this.writingStartTime = Date.now();
  }

  checkWritingAnswer() {
    const word = this.activeWord;
    if (!word) return;
    const target = word.word.trim().toLowerCase();
    const input = this.writingInput().trim().toLowerCase();
    if (!input) return;

    if (input === target) {
      this.writingStatus.set('CORRECT');
      this.writingStreak.update(s => s + 1);
      const rating = this.writingHintCount() === 0 ? 5 : 4;
      const responseTime = Math.max(800, Date.now() - (this.writingStartTime || Date.now()));
      this.studyService.reviewCard(word.id, rating, 'WRITING', responseTime);
      this.studyService.speakWord(word.word);
    } else {
      this.writingStatus.set('WRONG');
      this.writingStreak.set(0);
    }
  }

  giveWritingHint() {
    const word = this.activeWord;
    if (!word) return;
    const target = word.word;
    const cur = this.writingHintCount();
    if (cur < target.length) {
      const nextCount = cur + 1;
      this.writingHintCount.set(nextCount);
      this.writingInput.set(target.slice(0, nextCount));
    }
  }

  revealWritingAnswer() {
    const word = this.activeWord;
    if (!word) return;
    this.writingStatus.set('REVEALED');
    this.writingInput.set(word.word);
    this.studyService.reviewCard(word.id, 1, 'WRITING', 3000);
    this.studyService.speakWord(word.word);
  }

  nextWritingWord() {
    this.resetWritingState();
    this.nextCard();
  }

  listenWritingAudio() {
    if (this.activeWord) {
      this.studyService.speakWord(this.activeWord.word);
    }
  }

  // ==========================================
  // LOGIC TRẮC NGHIỆM AI ĐỘNG (GROQ LLM)
  // ==========================================
  generateAiQuizForCurrentTopic(numQuestions: number = 5) {
    const words = this.currentTopicWords;
    if (words.length === 0) {
      this.toast.warning('Chủ đề này chưa có từ vựng nào để sinh đề thi.', 'Thông Báo');
      return;
    }

    this.isGeneratingQuiz.set(true);
    this.quizCompleted.set(false);
    this.currentQuizIndex.set(0);
    this.selectedOptionLetter.set(null);
    this.isOptionSubmitted.set(false);

    const payload = words.slice(0, 10).map(w => ({
      word: w.word,
      vietnamese: w.vietnamese,
      level: w.level || 'A2'
    }));

    const topicTitle = this.selectedTopic()?.name || 'Bối cảnh đời thực';
    const targetLevel = this.studyService.targetProgress()?.currentLevel || this.api.currentUser()?.targetLevel || 'A2';

    this.studyService.generateAiQuiz(payload, topicTitle, targetLevel, Math.min(words.length, numQuestions)).subscribe({
      next: (res) => {
        this.isGeneratingQuiz.set(false);
        if (res && res.success && res.questions && res.questions.length > 0) {
          this.aiQuizList.set(res.questions);
          this.quizTitle.set(res.quizTitle || `Thử Thách Từ Vựng: ${topicTitle}`);
          this.quizSource.set(res.quizSource || 'groq');
          this.quizScore.set({ correct: 0, total: res.questions.length });
          this.toast.success(`Đã biên soạn thành công ${res.questions.length} câu hỏi trắc nghiệm!`, 'Trắc Nghiệm');
        } else {
          this.toast.error('Không thể tạo đề thi, vui lòng thử lại sau.', 'Thông Báo');
        }
      },
      error: (err) => {
        this.isGeneratingQuiz.set(false);
        console.error('[Quiz Error] Lỗi sinh đề thi:', err);
        this.toast.error('Không thể kết nối dịch vụ tạo câu hỏi, vui lòng thử lại sau.', 'Thông Báo');
      }
    });
  }

  selectQuizOption(letter: string) {
    if (this.isOptionSubmitted()) return;
    this.selectedOptionLetter.set(letter);
  }

  submitQuizAnswer() {
    const q = this.currentQuizQuestion;
    if (!q || !this.selectedOptionLetter() || this.isOptionSubmitted()) return;

    const chosen = this.selectedOptionLetter();
    const isCorrect = chosen === q.correctAnswer;
    this.isOptionSubmitted.set(true);

    if (isCorrect) {
      this.quizScore.update(s => ({ ...s, correct: s.correct + 1 }));
    }

    const targetWord = this.currentTopicWords.find(w => w.word.toLowerCase() === q.targetWord.toLowerCase());
    if (targetWord) {
      this.studyService.reviewCard(targetWord.id, isCorrect ? 4 : 2, 'AI_QUIZ', 2000);
    }
  }

  nextQuizQuestion() {
    if (this.currentQuizIndex() < this.aiQuizList().length - 1) {
      this.currentQuizIndex.update(i => i + 1);
      this.selectedOptionLetter.set(null);
      this.isOptionSubmitted.set(false);
    } else {
      this.quizCompleted.set(true);
    }
  }

  restartQuiz() {
    this.currentQuizIndex.set(0);
    this.selectedOptionLetter.set(null);
    this.isOptionSubmitted.set(false);
    this.quizScore.set({ correct: 0, total: this.aiQuizList().length });
    this.quizCompleted.set(false);
  }

  openTopicStudy(topic: TopicItem, subMode: 'FLASHCARD' | 'WRITING' | 'AI_QUIZ' = 'FLASHCARD') {
    this.selectedTopic.set(topic);
    this.currentView.set('TOPIC_STUDY');
    this.studySubMode.set(subMode);
    this.activeWordIndex.set(0);
    this.isCardFlipped.set(false);
    this.wordSearchKeyword = '';
    this.wordFilterStatus.set('ALL');
    this.currentWordPage.set(1);
    this.resetWritingState();
    this.aiQuizList.set([]);
    this.quizCompleted.set(false);

    if (subMode === 'AI_QUIZ') {
      setTimeout(() => this.generateAiQuizForCurrentTopic(), 50);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backToTopicsList() {
    this.currentView.set('TOPICS_LIST');
    this.selectedTopic.set(null);
    this.activeWordIndex.set(0);
    this.isCardFlipped.set(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  selectWord(item: SavedWordItem) {
    const idx = this.currentTopicWords.findIndex(w => w.id === item.id);
    if (idx !== -1) {
      this.activeWordIndex.set(idx);
      this.isCardFlipped.set(false);
    }
  }

  toggleFlip() {
    this.isCardFlipped.update(v => !v);
  }

  prevCard() {
    if (this.activeWordIndex() > 0) {
      const newIdx = this.activeWordIndex() - 1;
      this.activeWordIndex.set(newIdx);
      this.isCardFlipped.set(false);

      const requiredPage = Math.floor(newIdx / this.wordPageSize) + 1;
      if (this.currentWordPage() !== requiredPage) {
        this.currentWordPage.set(requiredPage);
      }
    }
  }

  nextCard() {
    if (this.activeWordIndex() < this.currentTopicWords.length - 1) {
      const newIdx = this.activeWordIndex() + 1;
      this.activeWordIndex.set(newIdx);
      this.isCardFlipped.set(false);

      const requiredPage = Math.floor(newIdx / this.wordPageSize) + 1;
      if (this.currentWordPage() !== requiredPage) {
        this.currentWordPage.set(requiredPage);
      }
    }
  }

  shuffleTopicCards() {
    const list = this.currentTopicWords;
    if (list.length <= 1) return;
    const newIdx = Math.floor(Math.random() * list.length);
    this.activeWordIndex.set(newIdx);
    this.isCardFlipped.set(false);

    const requiredPage = Math.floor(newIdx / this.wordPageSize) + 1;
    this.currentWordPage.set(requiredPage);
    this.toast.info('Đã xáo trộn thứ tự các từ trong chủ đề!', 'Xáo Trộn');
  }

  submitReview(grade: number) {
    const word = this.activeWord;
    if (!word) return;

    this.studyService.reviewCard(word.id, grade);
    this.isCardFlipped.set(false);

    if (this.activeWordIndex() < this.currentTopicWords.length - 1) {
      const newIdx = this.activeWordIndex() + 1;
      this.activeWordIndex.set(newIdx);

      const requiredPage = Math.floor(newIdx / this.wordPageSize) + 1;
      if (this.currentWordPage() !== requiredPage) {
        this.currentWordPage.set(requiredPage);
      }
    } else {
      this.toast.success(`Chúc mừng! Bạn đã hoàn thành toàn bộ ${this.currentTopicWords.length} thẻ trong chủ đề này.`, 'Xuất Sắc');
    }
  }

  markActiveWordMastered() {
    const word = this.activeWord;
    if (!word) return;

    this.studyService.markWordMastered(word.id);
    this.isCardFlipped.set(false);

    if (this.activeWordIndex() < this.currentTopicWords.length - 1) {
      const newIdx = this.activeWordIndex() + 1;
      this.activeWordIndex.set(newIdx);

      const requiredPage = Math.floor(newIdx / this.wordPageSize) + 1;
      if (this.currentWordPage() !== requiredPage) {
        this.currentWordPage.set(requiredPage);
      }
    } else {
      this.toast.success(`Chúc mừng! Bạn đã hoàn thành toàn bộ ${this.currentTopicWords.length} thẻ trong chủ đề này.`, 'Xuất Sắc');
    }
  }

  practiceSpeechWord(word: SavedWordItem) {
    this.speechService.openSpeechModal({
      text: word.word,
      ipa: word.ipa,
      meaning: word.vietnamese,
      contextTitle: `Ôn Tập SM-2: ${word.word}`,
      cardProgressId: word.id,
      mode: 'WORD'
    });
  }

  // Thao tác xóa chủ đề
  confirmDeleteTopic(topic: TopicItem, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    if (topic.id === 'all') {
      this.toast.warning('Không thể xóa toàn bộ kho từ vựng mặc định.', 'Thông Báo');
      return;
    }
    this.topicToDelete.set(topic);
  }

  cancelDeleteTopic() {
    this.topicToDelete.set(null);
  }

  executeDeleteTopic() {
    const topic = this.topicToDelete();
    if (!topic || topic.id === 'all') return;

    this.isDeletingTopic.set(true);
    this.studyService.deleteTopicFromSrs(topic.name).subscribe({
      next: () => {
        this.isDeletingTopic.set(false);
        this.topicToDelete.set(null);
        if (this.currentView() === 'TOPIC_STUDY' && this.selectedTopic()?.name === topic.name) {
          this.backToTopicsList();
        }
        if (this.currentTopicPage() > this.totalTopicPages) {
          this.currentTopicPage.set(Math.max(1, this.totalTopicPages));
        }
      },
      error: () => {
        this.isDeletingTopic.set(false);
        this.topicToDelete.set(null);
      }
    });
  }

  // Thao tác xóa từ vựng
  confirmDeleteWord(word: SavedWordItem, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.wordToDelete.set(word);
  }

  cancelDeleteWord() {
    this.wordToDelete.set(null);
  }

  executeDeleteWord() {
    const word = this.wordToDelete();
    if (!word) return;

    this.isDeletingWord.set(true);
    this.studyService.deleteWordFromSrs(word.id).subscribe({
      next: () => {
        this.isDeletingWord.set(false);
        this.wordToDelete.set(null);
        if (this.activeWordIndex() >= this.currentTopicWords.length) {
          this.activeWordIndex.set(Math.max(0, this.currentTopicWords.length - 1));
        }
        if (this.currentWordPage() > this.totalWordPages) {
          this.currentWordPage.set(Math.max(1, this.totalWordPages));
        }
      },
      error: () => {
        this.isDeletingWord.set(false);
        this.wordToDelete.set(null);
      }
    });
  }
}

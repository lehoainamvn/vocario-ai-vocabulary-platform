import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ClassroomService } from '../../services/classroom.service';
import { UserStudyService } from '../../services/user-study.service';
import { ToastService } from '../../services/toast.service';
import { ExtractedWordItem, ExtractVocabResponse, GenerateStoryResponse } from '../../models/vocario.models';
import { IconComponent } from '../common/icon.component';

interface PracticeQuestion {
  id: number;
  word: string;
  question: string;
  options: string[];
  correctAnswer: string;
  userAnswer?: string;
  isCorrect?: boolean;
}

interface DictationQuestion {
  id: number;
  word: string;
  ipa: string;
  vietnamese: string;
  sentenceEn: string;
  sentenceVi: string;
  userAnswer: string;
  isCorrect?: boolean;
  checked?: boolean;
}

@Component({
  selector: 'app-user-text-extractor',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  template: `
    <div class="w-full max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-10 py-10 sm:py-12 space-y-8 animate-fade-in select-none">
      
      <!-- =========================================================================
           1. EDITORIAL HEADER BANNER
           ========================================================================= -->
      <section class="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#E5DED3]">
        <div class="max-w-[720px]">
          <span class="text-[10px] font-bold uppercase tracking-[0.11em] text-[#7D6853] block mb-2">
            Text Extraction & Adaptive Practice · Phân tích văn bản & Luyện tập thông minh
          </span>
          <h1 class="font-serif text-3xl sm:text-4xl lg:text-[36px] font-normal text-[#29251F] tracking-[-0.035em] leading-[1.12]">
            Trích xuất từ vựng từ văn bản
          </h1>
          <p class="text-xs sm:text-[14px] text-[#746B60] mt-2.5 leading-[1.65]">
            Nạp đoạn văn bản tiếng Anh bất kỳ (tài liệu, bài đọc IELTS, bài báo). Trí tuệ nhân tạo sẽ trích xuất 
            chính xác từ vựng trực tiếp từ nội dung gốc (không bịa đặt từ ngoài), phân tích nghĩa, phát âm IPA 
            và tạo các bài kiểm tra trắc nghiệm, luyện viết chính tả hoặc tạo lớp học chia sẻ cho bạn bè.
          </p>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <a
            routerLink="/classrooms"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-[6px] bg-white border border-[#E5DED3] text-[#29251F] hover:bg-[#FAF8F5] text-xs font-semibold shadow-2xs transition-all active:scale-95 no-underline"
          >
            <app-icon name="users" [size]="16" svgClass="text-[#7D6853]"></app-icon>
            <span>Phòng học & Chia sẻ</span>
          </a>
        </div>
      </section>

      <!-- =========================================================================
           2. INPUT WORKSPACE: TEXT AREA, PRESETS, AND PARAMETERS
           ========================================================================= -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <!-- Cột nhập liệu văn bản (8 cols) -->
        <div class="lg:col-span-8 space-y-4">
          <div class="bg-[#FAF8F5] border border-[#E5DED3] rounded-xl p-5 shadow-2xs space-y-4">
            
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE4D9] pb-3">
              <div class="flex items-center gap-2">
                <app-icon name="file-text" [size]="16" svgClass="text-[#7D6853]"></app-icon>
                <span class="text-xs font-semibold text-[#29251F]">Nội dung văn bản tiếng Anh</span>
              </div>

              <!-- Nút tải file & bài mẫu -->
              <div class="flex items-center gap-2">
                <label 
                  class="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#7D6853] hover:text-[#5C5249] bg-white border border-[#E5DED3] rounded-[4px] hover:bg-[#FAF8F5] transition-all"
                  title="Tải lên tệp PDF, Word (.docx), hoặc Text (.txt, .md)"
                >
                  <app-icon name="upload" [size]="13"></app-icon>
                  <span>{{ isParsingDoc() ? 'Đang đọc tệp...' : 'Tải tệp PDF, Word, Text' }}</span>
                  <input type="file" accept=".pdf,.docx,.doc,.txt,.md,.text" (change)="onFileUpload($event)" class="hidden" />
                </label>

                <button
                  type="button"
                  (click)="clearText()"
                  *ngIf="inputText.trim().length > 0"
                  class="px-2 py-1 text-[11px] text-[#8C827A] hover:text-red-700 bg-transparent border-0 cursor-pointer"
                >
                  Xóa trắng
                </button>
              </div>
            </div>

            <!-- Bài đọc mẫu preset -->
            <div class="flex items-center gap-2 flex-wrap text-[11px]">
              <span class="text-[#8C827A] font-medium">Mẫu gợi ý:</span>
              <button 
                type="button" 
                (click)="loadPreset('turtle')"
                class="px-2 py-1 rounded bg-white hover:bg-[#FAF8F5] border border-[#E5DED3] text-[#5C5249] cursor-pointer transition-colors"
              >
                Rùa biển & Đại dương (IELTS)
              </button>
              <button 
                type="button" 
                (click)="loadPreset('ai')"
                class="px-2 py-1 rounded bg-white hover:bg-[#FAF8F5] border border-[#E5DED3] text-[#5C5249] cursor-pointer transition-colors"
              >
                Trí tuệ nhân tạo
              </button>
              <button 
                type="button" 
                (click)="loadPreset('coffee')"
                class="px-2 py-1 rounded bg-white hover:bg-[#FAF8F5] border border-[#E5DED3] text-[#5C5249] cursor-pointer transition-colors"
              >
                Văn hóa cà phê toàn cầu
              </button>
            </div>

            <!-- Textarea with Document Loading Overlay -->
            <div class="relative">
              <textarea
                [(ngModel)]="inputText"
                (input)="onTextInput()"
                rows="9"
                [disabled]="isParsingDoc()"
                placeholder="Dán bài báo, đoạn văn học thuật IELTS/TOEIC, hoặc tải lên tệp PDF/Word (.docx) tại đây..."
                class="w-full bg-white border border-[#E5DED3] focus:border-[#7D6853] focus:ring-1 focus:ring-[#7D6853] rounded-lg p-3.5 text-xs sm:text-sm text-[#29251F] font-sans leading-relaxed resize-y focus:outline-none transition-all placeholder:text-[#A89F91] disabled:opacity-60"
              ></textarea>

              <div *ngIf="isParsingDoc()" class="absolute inset-0 bg-[#FAF8F5]/85 backdrop-blur-2xs rounded-lg flex flex-col items-center justify-center gap-2 z-10 animate-fade-in">
                <span class="animate-spin inline-block w-6 h-6 border-2 border-[#7D6853] border-t-transparent rounded-full"></span>
                <span class="text-xs font-semibold text-[#7D6853]">Đang giải mã nội dung từ tệp PDF / Word...</span>
              </div>
            </div>

            <!-- Text statistics bar -->
            <div class="flex items-center justify-between text-[11px] text-[#746B60] pt-1">
              <div class="flex items-center gap-4">
                <span>Số từ: <strong>{{ wordCount() }}</strong></span>
                <span>Số ký tự: <strong>{{ inputText.length }}</strong></span>
                <span>Dung lượng từ vựng dự tính: <strong>~{{ estimatedCeiling() }} từ</strong></span>
              </div>
            </div>

          </div>
        </div>

        <!-- Cột tham số cấu hình trích xuất (4 cols) -->
        <div class="lg:col-span-4 space-y-4">
          <div class="bg-[#FAF8F5] border border-[#E5DED3] rounded-xl p-5 shadow-2xs space-y-5">
            <h3 class="text-xs font-bold uppercase tracking-[0.08em] text-[#7D6853] pb-2 border-b border-[#EAE4D9]">
              Cấu hình trích xuất
            </h3>

            <!-- Số lượng từ vựng cần học -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-xs font-semibold text-[#29251F]">Số từ cần học:</label>
                <span class="text-sm font-bold font-serif text-[#7D6853] bg-white px-2 py-0.5 rounded border border-[#E5DED3]">
                  {{ targetCount }} từ
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="50"
                step="1"
                [(ngModel)]="targetCount"
                class="w-full accent-[#7D6853] cursor-pointer"
              />
              <div class="flex justify-between text-[10px] text-[#8C827A]">
                <span>3 từ</span>
                <span>25 từ</span>
                <span>50 từ</span>
              </div>
              <p class="text-[11px] text-[#8C827A] leading-tight">
                * Nếu văn bản không đủ từ học thuật, hệ thống sẽ dừng ở mức thực tế để tránh sinh từ ảo.
              </p>
            </div>

            <!-- Cấp độ CEFR -->
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-[#29251F]">Mục tiêu cấp độ (CEFR):</label>
              <select
                [(ngModel)]="targetLevel"
                class="w-full bg-white border border-[#E5DED3] focus:border-[#7D6853] rounded-md px-3 py-2 text-xs text-[#29251F] focus:outline-none"
              >
                <option value="A1">A1 — Căn bản (Beginner)</option>
                <option value="A2">A2 — Sơ cấp (Elementary)</option>
                <option value="B1">B1 — Trung cấp (Intermediate)</option>
                <option value="B2">B2 — Trung cao cấp (Upper Intermediate)</option>
                <option value="C1">C1 — Cao cấp (Advanced)</option>
                <option value="C2">C2 — Thành thạo (Proficient)</option>
              </select>
            </div>

            <!-- Nút Action Chính -->
            <button
              type="button"
              (click)="extractVocabulary()"
              [disabled]="isExtracting() || inputText.trim().length < 15"
              class="w-full py-3 px-4 rounded-lg bg-[#7D6853] hover:bg-[#685542] text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs transition-all active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <app-icon *ngIf="!isExtracting()" name="sparkles" [size]="16" svgClass="text-white"></app-icon>
              <span *ngIf="isExtracting()" class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
              <span>{{ isExtracting() ? 'Đang trích xuất từ vựng...' : 'Trích Xuất Từ Vựng' }}</span>
            </button>

          </div>
        </div>

      </div>

      <!-- =========================================================================
           3. CẢNH BÁO GIỚI HẠN VĂN BẢN (NẾU BÀI ĐỌC KHÔNG ĐỦ SỐ TỪ YÊU CẦU)
           ========================================================================= -->
      <div 
        *ngIf="warningNote"
        class="bg-[#FBF7F0] border-l-4 border-amber-600 border-y border-r border-[#E8DFC9] p-4 rounded-r-lg flex items-start gap-3 text-xs text-[#6B5024] animate-fade-in"
      >
        <app-icon name="info" [size]="18" svgClass="text-amber-700 shrink-0 mt-0.5"></app-icon>
        <div class="space-y-1">
          <p class="font-bold text-[#573F17]">Giới hạn trích xuất thực tế:</p>
          <p class="leading-relaxed">{{ warningNote }}</p>
        </div>
      </div>

      <!-- =========================================================================
           4. KẾT QUẢ TỪ VỰNG TRÍCH XUẤT ĐƯỢC
           ========================================================================= -->
      <section *ngIf="extractedWords.length > 0" class="space-y-6 pt-4 border-t border-[#E5DED3]">
        
        <!-- Toolbar quản lý kết quả -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAF8F5] border border-[#E5DED3] p-4 rounded-xl">
          <div class="flex items-center gap-3">
            <span class="font-serif text-lg font-bold text-[#29251F]">
              Danh sách từ vựng trích xuất ({{ selectedCount() }}/{{ extractedWords.length }})
            </span>
            <button
              type="button"
              (click)="toggleSelectAll()"
              class="text-[11px] font-medium text-[#7D6853] hover:underline bg-transparent border-0 cursor-pointer"
            >
              {{ isAllSelected() ? 'Bỏ chọn tất cả' : 'Chọn tất cả' }}
            </button>
          </div>

          <!-- Các nút hành động nâng cao: Lưu sổ tay, Tạo phòng học, Mở luyện thi -->
          <div class="flex flex-wrap items-center gap-2">
            <!-- Nút Lưu Sổ Tay Từ Vựng Cá Nhân (SM-2) -->
            <button
              type="button"
              (click)="saveSelectedToNotebook()"
              [disabled]="selectedCount() === 0 || isSavingNotebook()"
              class="px-3 py-1.5 rounded-[6px] bg-white border border-[#E5DED3] hover:border-[#7D6853] text-[#29251F] hover:bg-[#FAF8F5] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Lưu các từ đã chọn vào Sổ tay từ vựng ôn tập SM-2"
            >
              <app-icon *ngIf="!isSavingNotebook()" name="bookmark" [size]="14" svgClass="text-[#7D6853]"></app-icon>
              <span *ngIf="isSavingNotebook()" class="animate-spin inline-block w-3.5 h-3.5 border-2 border-[#7D6853] border-t-transparent rounded-full"></span>
              <span>Lưu Sổ Tay ({{ selectedCount() }})</span>
            </button>

            <button
              type="button"
              (click)="openPracticeModal('quiz')"
              [disabled]="selectedCount() === 0"
              class="px-3 py-1.5 rounded-[6px] bg-white border border-[#E5DED3] text-[#29251F] hover:bg-[#FAF8F5] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <app-icon name="gamepad" [size]="14" svgClass="text-[#7D6853]"></app-icon>
              <span>Luyện Trắc Nghiệm ({{ selectedCount() }})</span>
            </button>

            <button
              type="button"
              (click)="openPracticeModal('dictation')"
              [disabled]="selectedCount() === 0"
              class="px-3 py-1.5 rounded-[6px] bg-white border border-[#E5DED3] text-[#29251F] hover:bg-[#FAF8F5] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <app-icon name="edit" [size]="14" svgClass="text-[#7D6853]"></app-icon>
              <span>Luyện Viết Chính Tả</span>
            </button>

            <button
              type="button"
              (click)="openPracticeModal('story')"
              [disabled]="selectedCount() === 0"
              class="px-3 py-1.5 rounded-[6px] bg-white border border-[#E5DED3] text-[#29251F] hover:bg-[#FAF8F5] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <app-icon name="book-open" [size]="14" svgClass="text-[#7D6853]"></app-icon>
              <span>Sáng Tác Bối Cảnh</span>
            </button>

            <button
              type="button"
              (click)="openCreateClassModal()"
              [disabled]="selectedCount() === 0"
              class="px-3.5 py-1.5 rounded-[6px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <app-icon name="share-2" [size]="14" svgClass="text-white"></app-icon>
              <span>Tạo Lớp Học Chia Sẻ</span>
            </button>
          </div>
        </div>

        <!-- Grid Cards Từ Vựng (Paged) -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            *ngFor="let item of pagedWords(); let i = index"
            class="bg-white border rounded-xl p-4 transition-all hover:shadow-sm flex flex-col justify-between space-y-3"
            [class.border-[#7D6853]]="item.selected"
            [class.border-[#E5DED3]]="!item.selected"
            [class.bg-[#FAF8F5]]="item.selected"
          >
            <!-- Card Header: Checkbox + Word + IPA + Bookmark & Audio -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  [(ngModel)]="item.selected"
                  class="mt-1 accent-[#7D6853] rounded cursor-pointer"
                />
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-serif font-bold text-base text-[#29251F]">{{ item.word }}</span>
                    <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#FAF8F5] text-[#7D6853] border border-[#E5DED3]">
                      {{ item.partOfSpeech }}
                    </span>
                  </div>
                  <span class="text-xs text-[#8C827A] font-mono mt-0.5 block">{{ item.ipa }}</span>
                </div>
              </div>

              <!-- Nút Lưu Sổ Tay & Phát Âm Audio -->
              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  (click)="saveSingleWordToNotebook(item)"
                  [disabled]="item.isSaving || item.savedToNotebook"
                  class="w-7 h-7 rounded-full flex items-center justify-center transition-colors border cursor-pointer"
                  [class.bg-[#FAF8F5]]="!item.savedToNotebook"
                  [class.border-[#E5DED3]]="!item.savedToNotebook"
                  [class.text-[#7D6853]]="!item.savedToNotebook"
                  [class.hover:bg-[#EAE4D9]]="!item.savedToNotebook"
                  [class.bg-emerald-50]="item.savedToNotebook"
                  [class.border-emerald-300]="item.savedToNotebook"
                  [class.text-emerald-700]="item.savedToNotebook"
                  [title]="item.savedToNotebook ? 'Đã lưu trong sổ tay SM-2' : 'Lưu từ này vào sổ tay'"
                >
                  <app-icon *ngIf="!item.isSaving && !item.savedToNotebook" name="bookmark" [size]="13"></app-icon>
                  <app-icon *ngIf="item.savedToNotebook" name="bookmark-check" [size]="13"></app-icon>
                  <span *ngIf="item.isSaving" class="animate-spin inline-block w-3 h-3 border border-[#7D6853] border-t-transparent rounded-full"></span>
                </button>

                <button
                  type="button"
                  (click)="playAudio(item.word)"
                  class="w-7 h-7 rounded-full bg-[#FAF8F5] hover:bg-[#EAE4D9] text-[#7D6853] flex items-center justify-center transition-colors border border-[#E5DED3] cursor-pointer"
                  title="Nghe phát âm chuẩn"
                >
                  <app-icon name="volume-2" [size]="13"></app-icon>
                </button>
              </div>
            </div>

            <!-- Tiếng Việt -->
            <p class="text-xs sm:text-sm font-semibold text-[#4A3E31] leading-snug">
              {{ item.vietnamese }}
            </p>

            <!-- Câu ví dụ ngữ cảnh thực tế trong bài đọc -->
            <div *ngIf="item.contextSentenceEn" class="pt-2 border-t border-[#F0EBE1] text-[11px] space-y-1">
              <p class="text-[#5C5249] italic leading-relaxed">
                "{{ item.contextSentenceEn }}"
              </p>
              <p *ngIf="item.contextSentenceVi" class="text-[#8C827A]">
                {{ item.contextSentenceVi }}
              </p>
            </div>

          </div>
        </div>

        <!-- =========================================================================
             PAGINATION CONTROLS
             ========================================================================= -->
        <div *ngIf="extractedWords.length > 0" class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#EAE4D9] text-xs">
          <!-- Info range -->
          <div class="text-[#746B60]">
            Hiển thị <strong>{{ getStartIndex() }} - {{ getEndIndex() }}</strong> trong tổng số <strong>{{ extractedWords.length }}</strong> từ vựng
          </div>

          <!-- Page numbers navigation -->
          <div class="flex items-center gap-1.5" *ngIf="totalPages() > 1">
            <button
              type="button"
              (click)="prevPage()"
              [disabled]="currentPage === 1"
              class="px-2.5 py-1.5 rounded-md bg-white border border-[#E5DED3] hover:bg-[#FAF8F5] text-[#5C5249] font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Trang trước"
            >
              <app-icon name="chevron-left" [size]="14"></app-icon>
            </button>

            <ng-container *ngFor="let p of getPageList()">
              <button
                *ngIf="p !== -1"
                type="button"
                (click)="goToPage(p)"
                class="min-w-8 h-8 rounded-md font-semibold text-xs transition-colors cursor-pointer"
                [class.bg-[#7D6853]]="currentPage === p"
                [class.text-white]="currentPage === p"
                [class.shadow-2xs]="currentPage === p"
                [class.bg-white]="currentPage !== p"
                [class.text-[#5C5249]]="currentPage !== p"
                [class.border]="currentPage !== p"
                [class.border-[#E5DED3]]="currentPage !== p"
                [class.hover:bg-[#FAF8F5]]="currentPage !== p"
              >
                {{ p }}
              </button>
              <span *ngIf="p === -1" class="px-1 text-[#8C827A]">...</span>
            </ng-container>

            <button
              type="button"
              (click)="nextPage()"
              [disabled]="currentPage === totalPages()"
              class="px-2.5 py-1.5 rounded-md bg-white border border-[#E5DED3] hover:bg-[#FAF8F5] text-[#5C5249] font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Trang sau"
            >
              <app-icon name="chevron-right" [size]="14"></app-icon>
            </button>
          </div>

          <!-- Page Size Selector -->
          <div class="flex items-center gap-2 text-[11px] text-[#746B60]">
            <span>Số từ / trang:</span>
            <div class="inline-flex rounded-md border border-[#E5DED3] bg-white p-0.5">
              <button
                type="button"
                *ngFor="let sz of pageSizes"
                (click)="setPageSize(sz.value)"
                class="px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer"
                [class.bg-[#7D6853]]="pageSize === sz.value"
                [class.text-white]="pageSize === sz.value"
                [class.text-[#5C5249]]="pageSize !== sz.value"
                [class.hover:bg-[#FAF8F5]]="pageSize !== sz.value"
              >
                {{ sz.label }}
              </button>
            </div>
          </div>
        </div>

      </section>

      <!-- =========================================================================
           5. MODAL TẠO LỚP HỌC & BỘ CHIA SẺ CHO BẠN BÈ
           ========================================================================= -->
      <div 
        *ngIf="showClassModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
      >
        <div class="bg-white border border-[#E5DED3] rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-xl animate-scale-up">
          <div class="flex items-center justify-between pb-3 border-b border-[#EAE4D9]">
            <div class="flex items-center gap-2">
              <app-icon name="users" [size]="18" svgClass="text-[#7D6853]"></app-icon>
              <h3 class="font-serif text-lg font-bold text-[#29251F]">Tạo Lớp Học Chia Sẻ Mới</h3>
            </div>
            <button (click)="showClassModal = false" class="text-[#8C827A] hover:text-[#29251F] bg-transparent border-0 cursor-pointer">
              <app-icon name="close" [size]="16"></app-icon>
            </button>
          </div>

          <div class="space-y-4 text-xs">
            <div class="space-y-1">
              <label class="font-semibold text-[#29251F]">Tên lớp học / Bộ từ vựng:</label>
              <input
                type="text"
                [(ngModel)]="newClassName"
                placeholder="VD: Từ vựng IELTS Reading Chủ đề Đại Dương"
                class="w-full bg-[#FAF8F5] border border-[#E5DED3] focus:border-[#7D6853] rounded-md px-3 py-2 text-xs text-[#29251F] focus:outline-none"
              />
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-[#29251F]">Mô tả ngắn gọn:</label>
              <textarea
                [(ngModel)]="newClassDesc"
                rows="3"
                placeholder="Mô tả mục tiêu học tập, người phù hợp tham gia..."
                class="w-full bg-[#FAF8F5] border border-[#E5DED3] focus:border-[#7D6853] rounded-md px-3 py-2 text-xs text-[#29251F] focus:outline-none resize-none"
              ></textarea>
            </div>

            <div class="p-3 bg-[#FAF8F5] rounded-lg border border-[#E5DED3] flex items-center justify-between">
              <div>
                <span class="font-semibold text-[#29251F] block">Từ vựng được chia sẻ:</span>
                <span class="text-[11px] text-[#746B60]">Bạn đang đưa <strong>{{ selectedCount() }}</strong> từ vựng vào phòng học này.</span>
              </div>
              <span class="px-2.5 py-1 bg-[#7D6853] text-white rounded text-[11px] font-bold">
                Level {{ targetLevel }}
              </span>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#EAE4D9]">
            <button
              type="button"
              (click)="showClassModal = false"
              class="px-4 py-2 rounded-md bg-white border border-[#E5DED3] text-[#5C5249] hover:bg-[#FAF8F5] text-xs font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              (click)="submitCreateClassroom()"
              [disabled]="isSavingClass() || !newClassName.trim()"
              class="px-4 py-2 rounded-md bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {{ isSavingClass() ? 'Đang tạo phòng...' : 'Xác nhận & Nhận Mã Phòng' }}
            </button>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           6. MODAL LUYỆN TẬP: TRẮC NGHIỆM (QUIZ) & LUYỆN VIẾT & SÁNG TÁC NGỮ CẢNH
           ========================================================================= -->
      <div 
        *ngIf="practiceMode"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-fade-in"
      >
        <div class="bg-white border border-[#E5DED3] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-up overflow-hidden">
          
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-[#EAE4D9] flex items-center justify-between bg-[#FAF8F5]">
            <div class="flex items-center gap-2">
              <app-icon 
                [name]="practiceMode === 'quiz' ? 'gamepad' : (practiceMode === 'dictation' ? 'edit' : 'book-open')" 
                [size]="18" 
                svgClass="text-[#7D6853]"
              ></app-icon>
              <h3 class="font-serif text-lg font-bold text-[#29251F]">
                {{ practiceMode === 'quiz' ? 'Luyện Trắc Nghiệm AI' : (practiceMode === 'dictation' ? 'Luyện Viết Chính Tả & Điền Khuyết' : 'Sáng Tác Câu Chuyện Ngữ Cảnh') }}
              </h3>
            </div>
            <button (click)="closePracticeModal()" class="text-[#8C827A] hover:text-[#29251F] bg-transparent border-0 cursor-pointer">
              <app-icon name="close" [size]="16"></app-icon>
            </button>
          </div>

          <!-- Modal Body (Scrollable) -->
          <div class="p-6 overflow-y-auto space-y-6 flex-1">

            <!-- 6.1: CHẾ ĐỘ TRẮC NGHIỆM (QUIZ) -->
            <div *ngIf="practiceMode === 'quiz'" class="space-y-6">
              <div *ngIf="quizQuestions.length === 0" class="text-center py-8">
                <span class="animate-spin inline-block w-6 h-6 border-2 border-[#7D6853] border-t-transparent rounded-full mb-2"></span>
                <p class="text-xs text-[#746B60]">Đang tạo bộ câu hỏi trắc nghiệm từ các từ vựng đã chọn...</p>
              </div>

              <div *ngIf="quizQuestions.length > 0 && !quizSubmitted" class="space-y-6">
                <div class="flex items-center justify-between text-xs text-[#746B60] pb-2 border-b border-[#EAE4D9]">
                  <span>Câu hỏi {{ currentQuizIndex + 1 }} / {{ quizQuestions.length }}</span>
                  <span>Đã trả lời: {{ answeredCount() }} / {{ quizQuestions.length }}</span>
                </div>

                <!-- Current Question Card -->
                <div class="space-y-4">
                  <h4 class="font-serif text-base font-bold text-[#29251F] leading-relaxed">
                    {{ quizQuestions[currentQuizIndex].question }}
                  </h4>

                  <div class="grid grid-cols-1 gap-2.5">
                    <button
                      *ngFor="let opt of quizQuestions[currentQuizIndex].options"
                      type="button"
                      (click)="selectQuizAnswer(opt)"
                      class="text-left p-3.5 rounded-lg border text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center justify-between"
                      [class.bg-[#FAF8F5]]="quizQuestions[currentQuizIndex].userAnswer === opt"
                      [class.border-[#7D6853]]="quizQuestions[currentQuizIndex].userAnswer === opt"
                      [class.text-[#29251F]]="quizQuestions[currentQuizIndex].userAnswer === opt"
                      [class.bg-white]="quizQuestions[currentQuizIndex].userAnswer !== opt"
                      [class.border-[#E5DED3]]="quizQuestions[currentQuizIndex].userAnswer !== opt"
                      [class.text-[#5C5249]]="quizQuestions[currentQuizIndex].userAnswer !== opt"
                    >
                      <span>{{ opt }}</span>
                      <span *ngIf="quizQuestions[currentQuizIndex].userAnswer === opt" class="w-2 h-2 rounded-full bg-[#7D6853]"></span>
                    </button>
                  </div>
                </div>

                <!-- Pagination navigation -->
                <div class="flex items-center justify-between pt-4 border-t border-[#EAE4D9]">
                  <button
                    type="button"
                    (click)="prevQuizQuestion()"
                    [disabled]="currentQuizIndex === 0"
                    class="px-3 py-1.5 rounded bg-white border border-[#E5DED3] text-xs font-semibold text-[#5C5249] cursor-pointer disabled:opacity-40"
                  >
                    Câu trước
                  </button>
                  <button
                    *ngIf="currentQuizIndex < quizQuestions.length - 1"
                    type="button"
                    (click)="nextQuizQuestion()"
                    class="px-4 py-1.5 rounded bg-[#7D6853] text-white text-xs font-semibold cursor-pointer"
                  >
                    Câu tiếp theo
                  </button>
                  <button
                    *ngIf="currentQuizIndex === quizQuestions.length - 1"
                    type="button"
                    (click)="submitQuiz()"
                    [disabled]="answeredCount() === 0"
                    class="px-4 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer shadow-xs disabled:opacity-40"
                  >
                    Nộp Bài Chấm Điểm
                  </button>
                </div>
              </div>

              <!-- Quiz Results Summary -->
              <div *ngIf="quizSubmitted" class="text-center py-6 space-y-5 animate-scale-up">
                <div class="w-16 h-16 rounded-full bg-[#FAF8F5] border-2 border-[#7D6853] flex items-center justify-center mx-auto text-2xl font-serif font-bold text-[#7D6853]">
                  {{ quizScore }} / {{ quizQuestions.length }}
                </div>
                <div>
                  <h4 class="font-serif text-xl font-bold text-[#29251F]">Hoàn Thành Bài Luyện Trắc Nghiệm!</h4>
                  <p class="text-xs text-[#746B60] mt-1">
                    Bạn đạt tỷ lệ chính xác {{ ((quizScore / quizQuestions.length) * 100).toFixed(0) }}%.
                  </p>
                </div>

                <div class="text-left space-y-3 pt-3 border-t border-[#EAE4D9] max-h-60 overflow-y-auto">
                  <div 
                    *ngFor="let q of quizQuestions; let qi = index"
                    class="p-3 rounded-lg border text-xs"
                    [class.border-emerald-200]="q.isCorrect"
                    [class.bg-emerald-50]="q.isCorrect"
                    [class.border-red-200]="!q.isCorrect"
                    [class.bg-red-50]="!q.isCorrect"
                  >
                    <p class="font-bold text-[#29251F] mb-1">Câu {{ qi + 1 }}: {{ q.question }}</p>
                    <p [class.text-emerald-800]="q.isCorrect" [class.text-red-800]="!q.isCorrect">
                      Câu trả lời của bạn: <strong>{{ q.userAnswer || '(Bỏ trống)' }}</strong>
                      <span *ngIf="!q.isCorrect"> — Đáp án đúng: <strong>{{ q.correctAnswer }}</strong></span>
                    </p>
                  </div>
                </div>

                <div class="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    (click)="resetQuiz()"
                    class="px-4 py-2 rounded-md bg-[#7D6853] text-white text-xs font-semibold cursor-pointer"
                  >
                    Làm lại bài thi
                  </button>
                </div>
              </div>
            </div>

            <!-- 6.2: CHẾ ĐỘ LUYỆN VIẾT CHÍNH TẢ & ĐIỀN KHUYẾT (DICTATION) -->
            <div *ngIf="practiceMode === 'dictation'" class="space-y-6">
              <div class="bg-[#FAF8F5] p-3.5 rounded-lg border border-[#E5DED3] text-xs text-[#746B60]">
                Hãy đọc câu ngữ cảnh và nghĩa tiếng Việt, sau đó gõ lại từ vựng chính xác vào ô trống để rèn luyện trí nhớ vận động.
              </div>

              <div class="space-y-4">
                <div 
                  *ngFor="let d of dictationQuestions; let di = index"
                  class="bg-white border rounded-xl p-4 space-y-3 transition-colors"
                  [class.border-[#E5DED3]]="!d.checked"
                  [class.border-emerald-500]="d.checked && d.isCorrect"
                  [class.border-red-400]="d.checked && !d.isCorrect"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-[#7D6853]">Từ {{ di + 1 }}: {{ d.vietnamese }} ({{ d.ipa }})</span>
                    <button
                      type="button"
                      (click)="playAudio(d.word)"
                      class="text-[11px] text-[#7D6853] hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                    >
                      <app-icon name="volume-2" [size]="12"></app-icon>
                      <span>Nghe từ</span>
                    </button>
                  </div>

                  <!-- Incomplete sentence with input -->
                  <div class="text-xs sm:text-sm text-[#29251F] leading-relaxed">
                    <span>{{ getSentenceParts(d.sentenceEn, d.word)[0] }}</span>
                    <input
                      type="text"
                      [(ngModel)]="d.userAnswer"
                      (keyup.enter)="checkDictation(d)"
                      placeholder="gõ từ..."
                      class="inline-block mx-1.5 px-2 py-0.5 border-b-2 bg-[#FAF8F5] focus:bg-white text-center font-bold text-[#29251F] focus:outline-none transition-all w-36 text-xs sm:text-sm"
                      [class.border-[#7D6853]]="!d.checked"
                      [class.border-emerald-600]="d.checked && d.isCorrect"
                      [class.border-red-500]="d.checked && !d.isCorrect"
                    />
                    <span>{{ getSentenceParts(d.sentenceEn, d.word)[1] }}</span>
                  </div>

                  <div class="flex items-center justify-between text-[11px] pt-1">
                    <span class="text-[#8C827A] italic">{{ d.sentenceVi }}</span>
                    <button
                      type="button"
                      (click)="checkDictation(d)"
                      class="px-2.5 py-1 rounded bg-[#FAF8F5] hover:bg-[#EAE4D9] border border-[#E5DED3] text-[#29251F] font-semibold cursor-pointer"
                    >
                      Kiểm tra
                    </button>
                  </div>

                  <div *ngIf="d.checked" class="text-[11px] pt-1 font-bold">
                    <span *ngIf="d.isCorrect" class="text-emerald-700">Chính xác! Hoàn hảo!</span>
                    <span *ngIf="!d.isCorrect" class="text-red-700">Chưa đúng. Đáp án: {{ d.word }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 6.3: CHẾ ĐỘ SÁNG TÁC BÀI VIẾT NGỮ CẢNH (CONTEXTUAL STORY) -->
            <div *ngIf="practiceMode === 'story'" class="space-y-5">
              <div class="flex items-center justify-between gap-3 bg-[#FAF8F5] p-3 rounded-lg border border-[#E5DED3]">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-semibold text-[#29251F]">Chủ đề sáng tác:</span>
                  <input
                    type="text"
                    [(ngModel)]="storyTheme"
                    placeholder="VD: Nghiên cứu sinh học biển, Cuộc sống tương lai..."
                    class="bg-white border border-[#E5DED3] rounded px-2.5 py-1 text-xs text-[#29251F] focus:outline-none w-56"
                  />
                </div>
                <button
                  type="button"
                  (click)="generateContextStory()"
                  [disabled]="isGeneratingStory()"
                  class="px-3.5 py-1.5 rounded bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {{ isGeneratingStory() ? 'Đang viết...' : 'Sáng Tác Lại' }}
                </button>
              </div>

              <!-- Loading spinner -->
              <div *ngIf="isGeneratingStory()" class="text-center py-10">
                <span class="animate-spin inline-block w-6 h-6 border-2 border-[#7D6853] border-t-transparent rounded-full mb-2"></span>
                <p class="text-xs text-[#746B60]">Trí tuệ nhân tạo đang liên kết các từ vựng vào một câu chuyện thực tế...</p>
              </div>

              <!-- Generated Story Content -->
              <div *ngIf="generatedStory && !isGeneratingStory()" class="space-y-4 animate-fade-in">
                <div class="border-b border-[#EAE4D9] pb-2">
                  <h4 class="font-serif text-lg font-bold text-[#29251F]">{{ generatedStory.title }}</h4>
                  <span class="text-[10px] uppercase font-bold text-[#7D6853]">Trình độ: {{ generatedStory.level }}</span>
                </div>

                <!-- Story English -->
                <div class="p-4 bg-[#FAF8F5] rounded-xl border border-[#E5DED3] text-xs sm:text-sm text-[#29251F] leading-relaxed font-serif space-y-2">
                  <p [innerHTML]="formatStoryText(generatedStory.storyEn, generatedStory.highlightedWords)"></p>
                </div>

                <!-- Story Vietnamese Translation -->
                <div class="p-4 bg-white rounded-xl border border-[#EAE4D9] text-xs text-[#5C5249] leading-relaxed space-y-2">
                  <p class="font-bold text-[#29251F] text-xs uppercase tracking-wider">Bản dịch tiếng Việt:</p>
                  <p class="whitespace-pre-line">{{ generatedStory.storyVi }}</p>
                </div>
              </div>
            </div>

          </div>

          <!-- Modal Footer -->
          <div class="px-6 py-3 border-t border-[#EAE4D9] flex justify-end bg-[#FAF8F5]">
            <button
              type="button"
              (click)="closePracticeModal()"
              class="px-4 py-2 rounded-md bg-white border border-[#E5DED3] text-[#5C5249] hover:bg-[#FAF8F5] text-xs font-semibold cursor-pointer"
            >
              Đóng cửa sổ
            </button>
          </div>

        </div>
      </div>

    </div>
  `
})
export class UserTextExtractorComponent implements OnInit {
  private classroomService = inject(ClassroomService);
  private studyService = inject(UserStudyService);
  private toast = inject(ToastService);
  private router = inject(Router);

  // Text inputs & extraction state
  inputText: string = '';
  targetCount: number = 10;
  targetLevel: string = 'B2';
  isExtracting = signal<boolean>(false);
  warningNote: string = '';

  // Extracted words
  extractedWords: ExtractedWordItem[] = [];

  // Pagination state
  currentPage: number = 1;
  pageSize: number = 6;
  readonly pageSizes = [
    { label: '6 từ', value: 6 },
    { label: '9 từ', value: 9 },
    { label: '12 từ', value: 12 },
    { label: 'Tất cả', value: 9999 }
  ];

  // Notebook saving state
  isSavingNotebook = signal<boolean>(false);

  // Classroom modal
  showClassModal: boolean = false;
  newClassName: string = '';
  newClassDesc: string = '';
  isSavingClass = signal<boolean>(false);

  // Practice modal state
  practiceMode: 'quiz' | 'dictation' | 'story' | null = null;
  quizQuestions: PracticeQuestion[] = [];
  currentQuizIndex: number = 0;
  quizSubmitted: boolean = false;
  quizScore: number = 0;

  dictationQuestions: DictationQuestion[] = [];

  storyTheme: string = 'Đời sống thực tế & Khoa học';
  isGeneratingStory = signal<boolean>(false);
  generatedStory: GenerateStoryResponse | null = null;

  // Pagination computation
  totalPages(): number {
    if (this.extractedWords.length === 0) return 1;
    return Math.ceil(this.extractedWords.length / this.pageSize);
  }

  pagedWords(): ExtractedWordItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.extractedWords.slice(start, start + this.pageSize);
  }

  getStartIndex(): number {
    if (this.extractedWords.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.extractedWords.length);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage = page;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages()) {
      this.currentPage++;
    }
  }

  setPageSize(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
  }

  getPageList(): number[] {
    const total = this.totalPages();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const current = this.currentPage;
    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
      pages.push(p);
    }
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  }

  // Dynamic evaluation methods
  wordCount(): number {
    const text = this.inputText.trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }

  estimatedCeiling(): number {
    const words = this.wordCount();
    if (words === 0) return 0;
    return Math.max(3, Math.min(60, Math.floor(words * 0.12)));
  }

  selectedCount(): number {
    return this.extractedWords.filter(w => w.selected).length;
  }

  isAllSelected(): boolean {
    return this.extractedWords.length > 0 && this.extractedWords.every(w => w.selected);
  }

  answeredCount(): number {
    return this.quizQuestions.filter(q => q.userAnswer != null).length;
  }

  ngOnInit() {
    // Preload sample passage
    this.loadPreset('turtle');
  }

  onTextInput() {
    this.warningNote = '';
  }

  clearText() {
    this.inputText = '';
    this.extractedWords = [];
    this.currentPage = 1;
    this.warningNote = '';
  }

  loadPreset(type: 'turtle' | 'ai' | 'coffee') {
    if (type === 'turtle') {
      this.inputText = `Sea turtles are marine reptiles that inhabit tropical and subtropical oceans throughout the world. They possess a streamlined carapace that facilitates rapid swimming and navigate across vast oceanic distances using geomagnetic orientation. However, anthropogenic pressures such as coastal development, marine pollution, and accidental fisheries bycatch severely threaten their survival. International conservation treaties now mandate the implementation of turtle excluder devices to mitigate mortality rates and preserve marine biodiversity for future generations.`;
      this.targetLevel = 'B2';
      this.targetCount = 8;
    } else if (type === 'ai') {
      this.inputText = `Artificial intelligence is transforming contemporary society through deep learning architectures and large language models. Algorithms are capable of autonomous decision making, visual feature recognition, and natural language understanding. While technological efficiency optimizes economic productivity, ethical dilemmas regarding algorithmic bias and intellectual property protection require comprehensive regulatory frameworks and transparent oversight.`;
      this.targetLevel = 'C1';
      this.targetCount = 10;
    } else if (type === 'coffee') {
      this.inputText = `Coffee cultivation originated in ancient Ethiopian plateaus before expanding into a global beverage commodity. The roasting process induces chemical transformations that release volatile aromatic compounds, giving each bean variety its distinct flavor profile. Sustainable agriculture initiatives encourage agroforestry systems and fair trade certifications to empower smallholder farmers and protect equatorial rainforest ecosystems.`;
      this.targetLevel = 'B1';
      this.targetCount = 6;
    }
    this.warningNote = '';
  }

  isParsingDoc = signal<boolean>(false);

  onFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    this.isParsingDoc.set(true);
    this.warningNote = '';

    this.classroomService.parseDocument(file).subscribe({
      next: (res) => {
        this.isParsingDoc.set(false);
        if (res.success && res.text && res.text.trim().length > 0) {
          this.inputText = res.text;
          this.toast.success(
            `Đã đọc thành công tệp "${file.name}" (${res.wordCount} từ). Đang tự động phân tích và trích xuất từ vựng AI...`,
            'Đọc tệp thành công',
            4000
          );
          // Tự động kích hoạt AI trích xuất từ vựng ngay khi tải tệp xong
          setTimeout(() => {
            this.extractVocabulary();
          }, 300);
        } else {
          this.toast.error(res.error || 'Tệp không có nội dung văn bản hoặc bị lỗi giải mã.', 'Lỗi đọc tệp');
        }
        input.value = '';
      },
      error: (err) => {
        this.isParsingDoc.set(false);
        this.toast.error('Không thể đọc tệp: ' + (err.error?.detail || err.message), 'Lỗi tệp');
        input.value = '';
      }
    });
  }

  extractVocabulary() {
    if (this.inputText.trim().length < 15) {
      this.toast.error('Vui lòng nhập văn bản dài hơn 15 ký tự.', 'Chưa đủ văn bản');
      return;
    }

    this.isExtracting.set(true);
    this.warningNote = '';

    this.classroomService.extractVocabFromText(this.inputText, this.targetCount, this.targetLevel).subscribe({
      next: (res: any) => {
        this.isExtracting.set(false);
        this.currentPage = 1;
        const rawWords: any[] = res.words || [];
        this.extractedWords = rawWords.map(w => ({
          word: w.word,
          ipa: w.ipa || '',
          vietnamese: w.vietnamese || '',
          partOfSpeech: w.part_of_speech || w.partOfSpeech || 'noun',
          contextSentenceEn: w.exampleEn || w.example_en || w.example || w.context_sentence_en || w.contextSentenceEn || w.sentence || '',
          contextSentenceVi: w.exampleVi || w.example_vi || w.exampleViTranslation || w.context_sentence_vi || w.contextSentenceVi || '',
          selected: true,
          savedToNotebook: false,
          isSaving: false
        }));

        const note = res.warning_note || res.warningNote || res.logMessage;
        if (note) {
          this.warningNote = note;
        } else if (rawWords.length === 0) {
          this.warningNote = 'Văn bản không chứa đủ từ vựng học thuật hoặc bị lỗi định dạng ký tự. Vui lòng tải lại tệp qua nút tải tệp hoặc dán trực tiếp đoạn văn tiếng Anh.';
        }
      },
      error: () => {
        this.isExtracting.set(false);
      }
    });
  }

  saveSelectedToNotebook() {
    const selected = this.extractedWords.filter(w => w.selected);
    if (selected.length === 0) {
      this.toast.error('Vui lòng tích chọn ít nhất 1 từ vựng để lưu vào sổ tay.', 'Chưa chọn từ');
      return;
    }

    this.isSavingNotebook.set(true);
    this.classroomService.saveWordsToNotebook(selected, 'Trích xuất văn bản', this.targetLevel).subscribe({
      next: (res) => {
        this.isSavingNotebook.set(false);
        selected.forEach(w => w.savedToNotebook = true);
      },
      error: () => {
        this.isSavingNotebook.set(false);
      }
    });
  }

  saveSingleWordToNotebook(item: ExtractedWordItem) {
    if (item.savedToNotebook || item.isSaving) return;
    item.isSaving = true;
    this.classroomService.saveWordsToNotebook([item], 'Trích xuất văn bản', this.targetLevel).subscribe({
      next: () => {
        item.isSaving = false;
        item.savedToNotebook = true;
      },
      error: () => {
        item.isSaving = false;
      }
    });
  }

  toggleSelectAll() {
    const targetState = !this.isAllSelected();
    this.extractedWords.forEach(w => w.selected = targetState);
  }

  playAudio(word: string) {
    this.studyService.speakWord(word);
  }

  // ==========================================
  // Classroom Sharing
  // ==========================================
  openCreateClassModal() {
    const selected = this.extractedWords.filter(w => w.selected);
    if (selected.length === 0) return;

    this.newClassName = 'Lớp từ vựng ' + this.targetLevel + ' (' + selected.length + ' từ)';
    this.newClassDesc = 'Trích xuất từ văn bản: ' + this.inputText.substring(0, 80) + '...';
    this.showClassModal = true;
  }

  submitCreateClassroom() {
    const selected = this.extractedWords.filter(w => w.selected);
    if (selected.length === 0 || !this.newClassName.trim()) return;

    this.isSavingClass.set(true);
    this.classroomService.createClassroom({
      name: this.newClassName.trim(),
      description: this.newClassDesc.trim(),
      targetLevel: this.targetLevel,
      words: selected.map(w => ({
        word: w.word,
        ipa: w.ipa,
        vietnamese: w.vietnamese,
        partOfSpeech: w.partOfSpeech,
        exampleEn: w.contextSentenceEn,
        exampleVi: w.contextSentenceVi
      }))
    }).subscribe({
      next: (created) => {
        this.isSavingClass.set(false);
        this.showClassModal = false;
        this.toast.success(`Đã tạo phòng học thành công! Mã lớp: ${created.code}`, 'Chia sẻ lớp học');
        this.router.navigate(['/classrooms', created.code]);
      },
      error: () => {
        this.isSavingClass.set(false);
      }
    });
  }

  // ==========================================
  // Practice Modals (Quiz, Dictation, Story)
  // ==========================================
  openPracticeModal(mode: 'quiz' | 'dictation' | 'story') {
    this.practiceMode = mode;
    const selected = this.extractedWords.filter(w => w.selected);

    if (mode === 'quiz') {
      this.initQuiz(selected);
    } else if (mode === 'dictation') {
      this.initDictation(selected);
    } else if (mode === 'story') {
      this.generateContextStory();
    }
  }

  closePracticeModal() {
    this.practiceMode = null;
  }

  // 1. Multiple Choice Quiz
  private initQuiz(words: ExtractedWordItem[]) {
    this.quizQuestions = [];
    this.currentQuizIndex = 0;
    this.quizSubmitted = false;
    this.quizScore = 0;

    // Build intelligent multiple choice questions
    words.forEach((w, idx) => {
      // 3 wrong distractors from other words or generic
      const otherMeanings = words.filter(ow => ow.word !== w.word).map(ow => ow.vietnamese);
      const distractors = this.shuffleArray(otherMeanings).slice(0, 3);
      while (distractors.length < 3) {
        distractors.push('Ý nghĩa khác liên quan đến ' + w.partOfSpeech);
      }
      const options = this.shuffleArray([w.vietnamese, ...distractors]);

      this.quizQuestions.push({
        id: idx + 1,
        word: w.word,
        question: `Từ vựng "${w.word}" (${w.ipa}) có nghĩa tiếng Việt chính xác nhất là:`,
        options,
        correctAnswer: w.vietnamese
      });
    });
  }

  selectQuizAnswer(opt: string) {
    if (this.quizSubmitted) return;
    this.quizQuestions[this.currentQuizIndex].userAnswer = opt;
  }

  prevQuizQuestion() {
    if (this.currentQuizIndex > 0) this.currentQuizIndex--;
  }

  nextQuizQuestion() {
    if (this.currentQuizIndex < this.quizQuestions.length - 1) this.currentQuizIndex++;
  }

  submitQuiz() {
    this.quizSubmitted = true;
    let score = 0;
    this.quizQuestions.forEach(q => {
      q.isCorrect = q.userAnswer === q.correctAnswer;
      if (q.isCorrect) score++;
    });
    this.quizScore = score;
    this.toast.success(`Bạn đạt ${score}/${this.quizQuestions.length} câu chính xác!`, 'Kết quả trắc nghiệm');
  }

  resetQuiz() {
    const selected = this.extractedWords.filter(w => w.selected);
    this.initQuiz(selected);
  }

  // 2. Dictation / Spelling
  private initDictation(words: ExtractedWordItem[]) {
    this.dictationQuestions = words.map((w, idx) => ({
      id: idx + 1,
      word: w.word,
      ipa: w.ipa || '',
      vietnamese: w.vietnamese,
      sentenceEn: w.contextSentenceEn || `The word is ${w.word}.`,
      sentenceVi: w.contextSentenceVi || '',
      userAnswer: '',
      checked: false
    }));
  }

  getSentenceParts(sentence: string, word: string): [string, string] {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    const parts = sentence.split(regex);
    if (parts.length >= 2) {
      return [parts[0], parts.slice(1).join(' ')];
    }
    return [sentence, ''];
  }

  checkDictation(d: DictationQuestion) {
    d.checked = true;
    d.isCorrect = d.userAnswer.trim().toLowerCase() === d.word.trim().toLowerCase();
    if (d.isCorrect) {
      this.toast.success(`Chính xác: "${d.word}"`, 'Viết đúng');
    } else {
      this.toast.error(`Chưa chính xác: đáp án đúng là "${d.word}"`, 'Chính tả');
    }
  }

  // 3. Contextual Story
  generateContextStory() {
    const selected = this.extractedWords.filter(w => w.selected).map(w => w.word);
    if (selected.length === 0) return;

    this.isGeneratingStory.set(true);
    this.classroomService.generateStoryFromWords(selected, this.targetLevel, this.storyTheme).subscribe({
      next: (res) => {
        this.isGeneratingStory.set(false);
        this.generatedStory = res;
      },
      error: () => {
        this.isGeneratingStory.set(false);
      }
    });
  }

  formatStoryText(story: string, words: string[]): string {
    if (!story) return '';
    let formatted = story;
    (words || []).forEach(w => {
      const reg = new RegExp(`\\b(${w})\\b`, 'gi');
      formatted = formatted.replace(reg, `<strong class="text-[#7D6853] underline decoration-[#7D6853]/40 font-bold">$1</strong>`);
    });
    return formatted;
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ClassroomService } from '../../services/classroom.service';
import { UserStudyService, SavedWordItem } from '../../services/user-study.service';
import { ToastService } from '../../services/toast.service';
import {
  ClassroomDetail,
  ClassroomSummary,
  ClassroomLeaderboardItem,
  ClassroomWordItem,
  ClassroomProgressDashboard,
  MemberProgressItem,
  ClassroomHardestWordItem,
  ExtractedWordItem
} from '../../models/vocario.models';
import { IconComponent } from '../common/icon.component';

interface ClassroomQuizQuestion {
  id: number;
  word: string;
  question: string;
  options: string[];
  correctAnswer: string;
  userAnswer?: string;
  isCorrect?: boolean;
}

@Component({
  selector: 'app-user-classroom',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, IconComponent],
  template: `
    <div class="w-full max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-10 py-10 sm:py-12 space-y-8 animate-fade-in select-none">
      
      <!-- =========================================================================
           A. CLASSROOM HUB VIEW (KHI CHƯA CHỌN PHÒNG CỤ THỂ)
           ========================================================================= -->
      <ng-container *ngIf="!activeCode">
        
        <!-- Hub Header -->
        <section class="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#E5DED3]">
          <div class="max-w-[720px]">
            <span class="text-[10px] font-bold uppercase tracking-[0.11em] text-[#7D6853] block mb-2">
              Virtual Classroom & Deck Exchange · Lớp học ảo & Chia sẻ bộ từ vựng
            </span>
            <h1 class="font-serif text-3xl sm:text-4xl lg:text-[36px] font-normal text-[#29251F] tracking-[-0.035em] leading-[1.12]">
              Lớp học & Chia sẻ bộ từ
            </h1>
            <p class="text-xs sm:text-[14px] text-[#746B60] mt-2.5 leading-[1.65]">
              Tham gia các lớp học của bạn bè qua mã phòng ngắn gọn (VD: <code class="px-1.5 py-0.5 bg-[#FAF8F5] border border-[#E5DED3] rounded text-[#7D6853] font-mono font-bold">VOC-882</code>), 
              kéo toàn bộ từ vựng về sổ tay cá nhân để học theo chu kỳ SM-2, làm bài thi lớp học và thi đấu trên Bảng xếp hạng.
            </p>
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <a
              routerLink="/text-extractor"
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-[6px] bg-white border border-[#E5DED3] text-[#29251F] hover:bg-[#FAF8F5] text-xs font-semibold shadow-2xs transition-all active:scale-95 no-underline"
            >
              <app-icon name="file-text" [size]="16" svgClass="text-[#7D6853]"></app-icon>
              <span>Trích xuất từ văn bản</span>
            </a>
          </div>
        </section>

        <!-- Quick Action Bar: Tham gia bằng mã Code & Tạo phòng mới -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          <!-- Box Nhập mã phòng để gia nhập (7 cols) -->
          <div class="md:col-span-7 bg-[#FAF8F5] border border-[#E5DED3] rounded-xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7D6853]">
                <app-icon name="sparkles" [size]="14"></app-icon>
                <span>Tham gia bằng mã phòng</span>
              </div>
              <p class="text-xs text-[#746B60]">
                Nhập mã phòng do bạn bè hoặc giáo viên gửi để truy cập danh sách từ và làm bài thi:
              </p>
            </div>

            <div class="flex items-center gap-3">
              <input
                type="text"
                [(ngModel)]="joinCodeInput"
                (keyup.enter)="joinByCode()"
                placeholder="VD: VOC-882"
                class="flex-1 bg-white border border-[#E5DED3] focus:border-[#7D6853] rounded-lg px-3.5 py-2.5 text-sm font-mono font-bold text-[#29251F] uppercase focus:outline-none placeholder:font-sans placeholder:font-normal placeholder:text-[#A89F91]"
              />
              <button
                type="button"
                (click)="joinByCode()"
                [disabled]="!joinCodeInput.trim()"
                class="px-5 py-2.5 rounded-lg bg-[#7D6853] hover:bg-[#685542] text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                <app-icon name="arrow-right" [size]="14"></app-icon>
                <span>Vào Lớp</span>
              </button>
            </div>
          </div>

          <!-- Box Tạo phòng học mới (5 cols) -->
          <div class="md:col-span-5 bg-white border border-[#E5DED3] rounded-xl p-5 shadow-2xs flex flex-col justify-between space-y-4">
            <div class="space-y-1">
              <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7D6853]">
                <app-icon name="plus-circle" [size]="14"></app-icon>
                <span>Tạo phòng học chia sẻ</span>
              </div>
              <p class="text-xs text-[#746B60]">
                Tạo một phòng mới để chia sẻ các từ vựng tâm đắc cho bạn bè học chung:
              </p>
            </div>

            <button
              type="button"
              (click)="openCreateModal()"
              class="w-full py-2.5 rounded-lg bg-[#FAF8F5] hover:bg-[#EAE4D9] text-[#29251F] border border-[#E5DED3] font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
            >
              <app-icon name="share-2" [size]="15" svgClass="text-[#7D6853]"></app-icon>
              <span>Khởi tạo phòng mới</span>
            </button>
          </div>

        </div>

        <!-- Danh sách lớp học của tôi -->
        <section class="space-y-5 pt-4">
          <div class="flex items-center justify-between border-b border-[#EAE4D9] pb-3">
            <h2 class="font-serif text-xl font-bold text-[#29251F] flex items-center gap-2">
              <app-icon name="users" [size]="18" svgClass="text-[#7D6853]"></app-icon>
              <span>Phòng học của tôi ({{ myClassrooms().length }})</span>
            </h2>
            <button
              type="button"
              (click)="loadMyClassrooms()"
              class="text-xs text-[#7D6853] hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
            >
              <app-icon name="refresh-cw" [size]="13"></app-icon>
              <span>Làm mới</span>
            </button>
          </div>

          <!-- Empty State -->
          <div *ngIf="myClassrooms().length === 0" class="text-center py-12 bg-[#FAF8F5] border border-dashed border-[#E5DED3] rounded-2xl space-y-3">
            <div class="w-12 h-12 rounded-full bg-white border border-[#E5DED3] flex items-center justify-center mx-auto text-[#7D6853]">
              <app-icon name="users" [size]="22"></app-icon>
            </div>
            <h3 class="font-serif text-lg font-bold text-[#29251F]">Bạn chưa tham gia phòng học nào</h3>
            <p class="text-xs text-[#746B60] max-w-md mx-auto">
              Hãy nhập mã phòng học do bạn bè chia sẻ ở phía trên, hoặc tạo một phòng mới từ các từ vựng bạn vừa trích xuất!
            </p>
          </div>

          <!-- Grid Lớp Học -->
          <div *ngIf="myClassrooms().length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div
              *ngFor="let c of myClassrooms()"
              class="bg-white border border-[#E5DED3] hover:border-[#7D6853] rounded-xl p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4 group"
            >
              <div class="space-y-2.5">
                <!-- Header Card: Mã Code + Badge Owner -->
                <div class="flex items-center justify-between">
                  <span class="px-2.5 py-1 rounded bg-[#FAF8F5] border border-[#E5DED3] font-mono font-bold text-xs text-[#7D6853]">
                    {{ c.code }}
                  </span>
                  <span *ngIf="c.isOwner" class="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    Chủ phòng
                  </span>
                  <span *ngIf="!c.isOwner" class="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Đã tham gia
                  </span>
                </div>

                <!-- Tên lớp & Mô tả -->
                <div>
                  <h3 class="font-serif font-bold text-base text-[#29251F] group-hover:text-[#7D6853] transition-colors line-clamp-1">
                    {{ c.name }}
                  </h3>
                  <p class="text-xs text-[#746B60] mt-1 line-clamp-2">
                    {{ c.description || 'Không có mô tả chi tiết' }}
                  </p>
                </div>
              </div>

              <!-- Footer Card: Thống kê + Nút vào lớp -->
              <div class="pt-3 border-t border-[#F0EBE1] flex items-center justify-between text-xs">
                <div class="flex items-center gap-3 text-[11px] text-[#8C827A]">
                  <span><strong>{{ c.wordsCount || 0 }}</strong> từ</span>
                  <span>•</span>
                  <span><strong>{{ c.memberCount || 1 }}</strong> bạn</span>
                  <span>•</span>
                  <span>Level <strong>{{ c.targetLevel }}</strong></span>
                </div>

                <button
                  type="button"
                  (click)="viewClassroom(c.code)"
                  class="px-3 py-1.5 rounded bg-[#FAF8F5] group-hover:bg-[#7D6853] text-[#29251F] group-hover:text-white border border-[#E5DED3] group-hover:border-[#7D6853] font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
                >
                  <span>Vào lớp</span>
                  <app-icon name="arrow-right" [size]="12"></app-icon>
                </button>
              </div>

            </div>
          </div>
        </section>

      </ng-container>

      <!-- =========================================================================
           B. CLASSROOM DETAIL VIEW (KHI ĐANG XEM 1 PHÒNG CỤ THỂ)
           ========================================================================= -->

      <!-- B.0: SKELETON LOADING KHI ĐANG TẢI DỮ LIỆU LỚP HỌC -->
      <div *ngIf="activeCode && isLoadingDetail()" class="space-y-6 animate-pulse">
        <div class="flex items-center justify-between pb-2 border-b border-[#EAE4D9]">
          <div class="h-4 w-44 bg-[#EAE4D9] rounded"></div>
          <div class="h-4 w-28 bg-[#EAE4D9] rounded"></div>
        </div>
        <div class="bg-[#FAF8F5] border border-[#E5DED3] rounded-2xl p-6 sm:p-8 space-y-5">
          <div class="flex items-center gap-3">
            <div class="h-6 w-24 bg-[#E5DED3] rounded-md"></div>
            <div class="h-6 w-20 bg-[#E5DED3] rounded-md"></div>
          </div>
          <div class="h-8 w-64 bg-[#E5DED3] rounded-md"></div>
          <div class="h-4 w-full max-w-xl bg-[#E5DED3] rounded"></div>
          <div class="pt-4 border-t border-[#EAE4D9] flex items-center justify-between">
            <div class="h-8 w-48 bg-[#E5DED3] rounded-lg"></div>
            <div class="h-8 w-40 bg-[#E5DED3] rounded-lg"></div>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let item of [1,2,3,4,5,6]" class="bg-white border border-[#E5DED3] rounded-xl p-4 h-36 space-y-3">
            <div class="h-5 w-24 bg-[#F0EBE1] rounded"></div>
            <div class="h-4 w-36 bg-[#F0EBE1] rounded"></div>
            <div class="h-3 w-full bg-[#F0EBE1] rounded mt-4"></div>
          </div>
        </div>
      </div>

      <!-- B.0.1: LỖI KHÔNG TÌM THẤY HOẶC MÃ KHÔNG HỢP LỆ -->
      <div *ngIf="activeCode && !isLoadingDetail() && loadError()" class="text-center py-16 bg-[#FAF8F5] border border-dashed border-[#E5DED3] rounded-2xl space-y-4 animate-fade-in">
        <div class="w-14 h-14 rounded-full bg-white border border-[#E5DED3] flex items-center justify-center mx-auto text-[#7D6853] shadow-2xs">
          <app-icon name="x-circle" [size]="26" svgClass="text-amber-800"></app-icon>
        </div>
        <div class="space-y-1">
          <h3 class="font-serif text-xl font-bold text-[#29251F]">Không thể truy cập phòng học</h3>
          <p class="text-xs text-[#746B60] max-w-md mx-auto">{{ loadError() }}</p>
        </div>
        <div class="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            (click)="backToHub()"
            class="px-4 py-2 rounded-lg bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold cursor-pointer shadow-2xs transition-all"
          >
            Quay lại danh sách phòng học
          </button>
          <button
            type="button"
            (click)="loadClassroomDetail(activeCode!)"
            class="px-4 py-2 rounded-lg bg-white border border-[#E5DED3] hover:bg-[#FAF8F5] text-xs font-semibold text-[#29251F] cursor-pointer shadow-2xs transition-all"
          >
            Thử lại
          </button>
        </div>
      </div>

      <!-- B.0.2: NỘI DUNG CHI TIẾT PHÒNG HỌC -->
      <ng-container *ngIf="activeCode && !isLoadingDetail() && activeClassroom() as cls">
        
        <!-- Navigation Back -->
        <div class="flex items-center justify-between pb-2 border-b border-[#EAE4D9]">
          <button
            type="button"
            (click)="backToHub()"
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7D6853] hover:text-[#29251F] bg-transparent border-0 cursor-pointer"
          >
            <app-icon name="arrow-left" [size]="14"></app-icon>
            <span>Quay lại danh sách phòng học</span>
          </button>

          <span class="text-xs text-[#8C827A]">
            Tạo bởi: <strong>{{ cls.ownerName }}</strong>
          </span>
        </div>

        <!-- Classroom Header Banner -->
        <div class="bg-[#FAF8F5] border border-[#E5DED3] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
          
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-3">
                <span class="px-3 py-1 bg-white border border-[#E5DED3] rounded-lg font-mono font-bold text-sm text-[#7D6853] tracking-wider shadow-2xs">
                  {{ cls.code }}
                </span>
                <button
                  type="button"
                  (click)="copyCode(cls.code)"
                  class="px-2.5 py-1 text-xs rounded bg-white hover:bg-[#FAF8F5] border border-[#E5DED3] text-[#5C5249] flex items-center gap-1 cursor-pointer transition-colors"
                  title="Sao chép mã phòng để gửi cho bạn bè"
                >
                  <app-icon name="share-2" [size]="12"></app-icon>
                  <span>Sao chép mã</span>
                </button>
                <span class="text-xs font-bold uppercase tracking-wider text-[#7D6853] px-2.5 py-1 bg-white border border-[#E5DED3] rounded-md">
                  Cấp độ {{ cls.targetLevel }}
                </span>
              </div>

              <h1 class="font-serif text-2xl sm:text-3xl font-bold text-[#29251F]">
                {{ cls.name }}
              </h1>
              <p class="text-xs sm:text-sm text-[#746B60] max-w-2xl leading-relaxed">
                {{ cls.description || 'Không có mô tả chi tiết cho lớp học này.' }}
              </p>
            </div>

            <!-- Stats Bar -->
            <div class="flex items-center gap-4 text-center shrink-0 bg-white border border-[#E5DED3] p-4 rounded-xl">
              <div class="px-3">
                <span class="font-serif text-2xl font-bold text-[#7D6853] block">{{ cls.wordsCount }}</span>
                <span class="text-[11px] text-[#8C827A] font-medium uppercase">Từ vựng</span>
              </div>
              <div class="w-px h-8 bg-[#E5DED3]"></div>
              <div class="px-3">
                <span class="font-serif text-2xl font-bold text-[#29251F] block">{{ cls.memberCount }}</span>
                <span class="text-[11px] text-[#8C827A] font-medium uppercase">Thành viên</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons Bar -->
          <div class="pt-4 border-t border-[#EAE4D9] flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="switchTab('words')"
                class="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                [class.bg-[#7D6853]]="activeTab === 'words'"
                [class.text-white]="activeTab === 'words'"
                [class.bg-white]="activeTab !== 'words'"
                [class.text-[#5C5249]]="activeTab !== 'words'"
                [class.border]="activeTab !== 'words'"
                [class.border-[#E5DED3]]="activeTab !== 'words'"
              >
                Danh Sách Từ Vựng ({{ cls.wordsCount }})
              </button>

              <button
                type="button"
                (click)="switchTab('leaderboard')"
                class="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
                [class.bg-[#7D6853]]="activeTab === 'leaderboard'"
                [class.text-white]="activeTab === 'leaderboard'"
                [class.bg-white]="activeTab !== 'leaderboard'"
                [class.text-[#5C5249]]="activeTab !== 'leaderboard'"
                [class.border]="activeTab !== 'leaderboard'"
                [class.border-[#E5DED3]]="activeTab !== 'leaderboard'"
              >
                <app-icon name="trophy" [size]="14"></app-icon>
                <span>Bảng Xếp Hạng Lớp</span>
              </button>

              <button
                *ngIf="cls.isOwner || isOwnerOrAdmin()"
                type="button"
                (click)="switchTab('progress')"
                class="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
                [class.bg-[#7D6853]]="activeTab === 'progress'"
                [class.text-white]="activeTab === 'progress'"
                [class.bg-white]="activeTab !== 'progress'"
                [class.text-[#5C5249]]="activeTab !== 'progress'"
                [class.border]="activeTab !== 'progress'"
                [class.border-[#E5DED3]]="activeTab !== 'progress'"
              >
                <app-icon name="bar-chart" [size]="14"></app-icon>
                <span>Tiến Độ Học Flashcard</span>
                <span 
                  class="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded"
                  [class.bg-white/20]="activeTab === 'progress'"
                  [class.text-white]="activeTab === 'progress'"
                  [class.bg-[#FAF8F5]]="activeTab !== 'progress'"
                  [class.text-[#7D6853]]="activeTab !== 'progress'"
                >Chủ phòng</span>
              </button>
            </div>

            <!-- Nút Hành Động Đặc Biệt: Thêm từ vựng (chủ phòng), Kéo về sổ tay, Flashcard & Làm bài thi -->
            <div class="flex items-center gap-2.5">
              <button
                *ngIf="cls.isOwner || isOwnerOrAdmin()"
                type="button"
                (click)="openAddWordsModal()"
                class="px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title="Bổ sung từ vựng mới vào phòng học từ sổ tay, trích xuất AI hoặc nhập tay"
              >
                <app-icon name="plus-circle" [size]="14" svgClass="text-emerald-700"></app-icon>
                <span>+ Thêm Từ Vựng</span>
              </button>

              <button
                type="button"
                (click)="cloneToNotebook()"
                [disabled]="isCloning() || cls.clonedToNotebook"
                class="px-4 py-2 rounded-lg bg-white border border-[#E5DED3] hover:bg-[#FAF8F5] text-[#29251F] text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <app-icon *ngIf="!cls.clonedToNotebook" name="download" [size]="14" svgClass="text-[#7D6853]"></app-icon>
                <app-icon *ngIf="cls.clonedToNotebook" name="check-circle" [size]="14" svgClass="text-emerald-600"></app-icon>
                <span>{{ cls.clonedToNotebook ? 'Đã có trong sổ tay' : 'Kéo về sổ tay SM-2' }}</span>
              </button>

              <button
                type="button"
                (click)="startFlashcards()"
                [disabled]="!cls.words || cls.words.length === 0"
                class="px-4 py-2 rounded-lg bg-white border border-[#E5DED3] hover:border-[#7D6853] hover:bg-[#FAF8F5] text-[#29251F] text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                title="Luyện tập lật thẻ Flashcard ghi nhớ từ vựng lớp học"
              >
                <app-icon name="layers" [size]="14" svgClass="text-[#7D6853]"></app-icon>
                <span>Học Flashcard ({{ cls.wordsCount }})</span>
              </button>

              <button
                type="button"
                (click)="startClassQuiz()"
                [disabled]="cls.wordsCount === 0"
                class="px-4 py-2 rounded-lg bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-bold flex items-center gap-2 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <app-icon name="gamepad" [size]="14" svgClass="text-white"></app-icon>
                <span>Làm Bài Thi Lớp Học</span>
              </button>
            </div>
          </div>

        </div>

        <!-- =========================================================================
             B.1: TAB DANH SÁCH TỪ VỰNG TRONG LỚP (PAGED)
             ========================================================================= -->
        <div *ngIf="activeTab === 'words'" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              *ngFor="let w of pagedClassroomWords(); let i = index"
              class="bg-white border border-[#E5DED3] rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-2xs"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-serif font-bold text-base text-[#29251F]">{{ w.word }}</span>
                    <span *ngIf="w.partOfSpeech" class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#FAF8F5] text-[#7D6853] border border-[#E5DED3]">
                      {{ w.partOfSpeech }}
                    </span>
                  </div>
                  <span class="text-xs text-[#8C827A] font-mono mt-0.5 block">{{ w.ipa }}</span>
                </div>

                <button
                  type="button"
                  (click)="playAudio(w.word)"
                  class="w-7 h-7 rounded-full bg-[#FAF8F5] hover:bg-[#EAE4D9] text-[#7D6853] flex items-center justify-center transition-colors border border-[#E5DED3] cursor-pointer"
                  title="Nghe phát âm chuẩn"
                >
                  <app-icon name="volume-2" [size]="13"></app-icon>
                </button>
              </div>

              <p class="text-xs sm:text-sm font-semibold text-[#4A3E31] leading-snug">
                {{ w.vietnamese }}
              </p>

              <div *ngIf="w.exampleEn" class="pt-2 border-t border-[#F0EBE1] text-[11px] space-y-1">
                <p class="text-[#5C5249] italic leading-relaxed">
                  "{{ w.exampleEn }}"
                </p>
                <p *ngIf="w.exampleVi" class="text-[#8C827A]">
                  {{ w.exampleVi }}
                </p>
              </div>
            </div>
          </div>

          <!-- Classroom Words Pagination Bar -->
          <div *ngIf="cls.words && cls.words.length > classroomWordsPageSize" class="flex items-center justify-between pt-3 border-t border-[#EAE4D9] text-xs text-[#746B60]">
            <span>Hiển thị {{ (classroomWordsPage - 1) * classroomWordsPageSize + 1 }} - {{ getClassroomEndIndex() }} trong số {{ cls.words.length }} từ</span>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                (click)="prevClassroomPage()"
                [disabled]="classroomWordsPage === 1"
                class="px-2.5 py-1 rounded bg-white border border-[#E5DED3] hover:bg-[#FAF8F5] cursor-pointer disabled:opacity-40"
              >
                <app-icon name="chevron-left" [size]="13"></app-icon>
              </button>
              <button
                *ngFor="let p of getClassroomPageList()"
                type="button"
                (click)="goToClassroomPage(p)"
                class="w-7 h-7 rounded text-xs font-semibold cursor-pointer"
                [class.bg-[#7D6853]]="classroomWordsPage === p"
                [class.text-white]="classroomWordsPage === p"
                [class.bg-white]="classroomWordsPage !== p"
                [class.border]="classroomWordsPage !== p"
                [class.border-[#E5DED3]]="classroomWordsPage !== p"
              >
                {{ p }}
              </button>
              <button
                type="button"
                (click)="nextClassroomPage()"
                [disabled]="classroomWordsPage === classroomTotalPages()"
                class="px-2.5 py-1 rounded bg-white border border-[#E5DED3] hover:bg-[#FAF8F5] cursor-pointer disabled:opacity-40"
              >
                <app-icon name="chevron-right" [size]="13"></app-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- =========================================================================
             B.2: TAB BẢNG XẾP HẠNG LỚP HỌC (LEADERBOARD)
             ========================================================================= -->
        <div *ngIf="activeTab === 'leaderboard'" class="space-y-6">
          
          <div *ngIf="leaderboard().length === 0" class="text-center py-12 bg-[#FAF8F5] border border-dashed border-[#E5DED3] rounded-2xl space-y-2">
            <app-icon name="trophy" [size]="28" svgClass="text-[#7D6853] mx-auto"></app-icon>
            <h3 class="font-serif text-lg font-bold text-[#29251F]">Chưa có kết quả bài thi nào</h3>
            <p class="text-xs text-[#746B60]">Hãy là người đầu tiên làm bài thi lớp học để ghi tên lên Bảng Vàng!</p>
            <button
              type="button"
              (click)="startClassQuiz()"
              class="mt-3 px-4 py-2 rounded-lg bg-[#7D6853] text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
            >
              <app-icon name="gamepad" [size]="14"></app-icon>
              <span>Bắt Đầu Thi Ngay</span>
            </button>
          </div>

          <div *ngIf="leaderboard().length > 0" class="space-y-4">
            
            <!-- Podium Top 3 (Vàng, Bạc, Đồng) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div 
                *ngFor="let item of leaderboard().slice(0, 3); let rankIdx = index"
                class="rounded-xl p-5 border flex flex-col items-center text-center space-y-3 relative"
                [class.bg-amber-50]="rankIdx === 0"
                [class.border-amber-300]="rankIdx === 0"
                [class.bg-[#FAF8F5]]="rankIdx === 1"
                [class.border-[#E5DED3]]="rankIdx === 1"
                [class.bg-orange-50]="rankIdx === 2"
                [class.border-orange-200]="rankIdx === 2"
              >
                <!-- Medal icon -->
                <div 
                  class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xs"
                  [class.bg-amber-400]="rankIdx === 0"
                  [class.text-amber-950]="rankIdx === 0"
                  [class.bg-slate-300]="rankIdx === 1"
                  [class.text-slate-800]="rankIdx === 1"
                  [class.bg-amber-700]="rankIdx === 2"
                  [class.text-white]="rankIdx === 2"
                >
                  #{{ rankIdx + 1 }}
                </div>

                <div>
                  <h4 class="font-serif font-bold text-base text-[#29251F]">{{ item.fullName }}</h4>
                  <span class="text-[11px] text-[#8C827A]">@{{ item.username }}</span>
                </div>

                <div class="pt-2 border-t border-black/5 w-full flex justify-around text-xs">
                  <div>
                    <span class="font-bold text-[#7D6853] text-sm block">{{ item.score }}/{{ item.totalQuestions }}</span>
                    <span class="text-[10px] text-[#8C827A] uppercase">Điểm số</span>
                  </div>
                  <div>
                    <span class="font-bold text-[#29251F] text-sm block">{{ item.timeSpentSeconds }}s</span>
                    <span class="text-[10px] text-[#8C827A] uppercase">Thời gian</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Table danh sách xếp hạng -->
            <div class="bg-white border border-[#E5DED3] rounded-xl overflow-hidden shadow-2xs">
              <table class="w-full text-left text-xs">
                <thead class="bg-[#FAF8F5] border-b border-[#EAE4D9] text-[11px] font-bold uppercase tracking-wider text-[#7D6853]">
                  <tr>
                    <th class="py-3 px-4 text-center w-14">Hạng</th>
                    <th class="py-3 px-4">Học viên</th>
                    <th class="py-3 px-4 text-center">Điểm số</th>
                    <th class="py-3 px-4 text-center">Thời gian</th>
                    <th class="py-3 px-4 text-right">Ngày thi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#F0EBE1]">
                  <tr *ngFor="let item of leaderboard()" class="hover:bg-[#FAF8F5] transition-colors">
                    <td class="py-3 px-4 text-center font-bold text-sm" [class.text-amber-700]="item.rank === 1">
                      #{{ item.rank }}
                    </td>
                    <td class="py-3 px-4">
                      <span class="font-bold text-[#29251F] block">{{ item.fullName }}</span>
                      <span class="text-[11px] text-[#8C827A]">@{{ item.username }}</span>
                    </td>
                    <td class="py-3 px-4 text-center font-bold text-[#7D6853] text-sm">
                      {{ item.score }} / {{ item.totalQuestions }}
                    </td>
                    <td class="py-3 px-4 text-center text-[#5C5249]">
                      {{ item.timeSpentSeconds }} giây
                    </td>
                    <td class="py-3 px-4 text-right text-[11px] text-[#8C827A]">
                      {{ formatDate(item.submittedAt) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

        </div>

        <!-- =========================================================================
             B.3: TAB TIẾN ĐỘ THÀNH VIÊN (FLASHCARD PROGRESS DASHBOARD DÀNH CHO CHỦ PHÒNG)
             ========================================================================= -->
        <div *ngIf="activeTab === 'progress'" class="space-y-6 animate-fade-in">

          <!-- Dashboard Loading Skeleton -->
          <div *ngIf="isLoadingProgress()" class="space-y-4 animate-pulse">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div *ngFor="let i of [1,2,3,4]" class="bg-[#FAF8F5] border border-[#E5DED3] rounded-xl p-5 h-28 space-y-2">
                <div class="h-4 w-28 bg-[#EAE4D9] rounded"></div>
                <div class="h-8 w-20 bg-[#E5DED3] rounded"></div>
              </div>
            </div>
            <div class="h-64 bg-[#FAF8F5] border border-[#E5DED3] rounded-xl"></div>
          </div>

          <!-- Dashboard Content -->
          <div *ngIf="!isLoadingProgress() && progressDashboard() as dash" class="space-y-6">

            <!-- Top Header with Refresh Button -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAE4D9]">
              <div>
                <h3 class="font-serif text-xl font-bold text-[#29251F]">Báo Cáo Tiến Độ Lớp Học</h3>
                <p class="text-xs text-[#746B60] mt-0.5">
                  Thống kê thời gian thực về việc học và lật thẻ Flashcard của tất cả thành viên trong phòng.
                </p>
              </div>

              <button
                type="button"
                (click)="loadProgressDashboard(dash.classroomCode)"
                class="self-start sm:self-auto px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#FAF8F5] border border-[#E5DED3] text-[#5C5249] text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              >
                <app-icon name="refresh-cw" [size]="13"></app-icon>
                <span>Cập nhật số liệu</span>
              </button>
            </div>

            <!-- KPI Cards Row (4 cards) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <!-- Card 1: Tỉ lệ hoàn thành trung bình -->
              <div class="bg-white border border-[#E5DED3] rounded-xl p-5 shadow-2xs space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-[#7D6853]">Tỉ lệ thuộc thẻ TB</span>
                  <div class="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <app-icon name="bar-chart" [size]="14"></app-icon>
                  </div>
                </div>
                <div class="space-y-1">
                  <span class="font-serif text-3xl font-bold text-[#29251F]">{{ dash.averageCompletionRate }}%</span>
                  <div class="w-full bg-[#EAE4D9] h-1.5 rounded-full overflow-hidden">
                    <div class="bg-emerald-600 h-full rounded-full transition-all duration-500" [style.width.%]="dash.averageCompletionRate"></div>
                  </div>
                </div>
                <span class="text-[10px] text-[#8C827A] block">Trung bình các thành viên trong lớp</span>
              </div>

              <!-- Card 2: Thành viên đã luyện tập -->
              <div class="bg-white border border-[#E5DED3] rounded-xl p-5 shadow-2xs space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-[#7D6853]">Thành viên đã học</span>
                  <div class="w-7 h-7 rounded-full bg-[#FAF8F5] text-[#7D6853] flex items-center justify-center border border-[#E5DED3]">
                    <app-icon name="users" [size]="14"></app-icon>
                  </div>
                </div>
                <div>
                  <span class="font-serif text-3xl font-bold text-[#29251F]">
                    {{ dash.studiedMembersCount }} <span class="text-lg text-[#8C827A] font-sans font-normal">/ {{ dash.totalMembers }}</span>
                  </span>
                </div>
                <span class="text-[10px] text-[#8C827A] block">
                  {{ dash.totalMembers > 0 ? ((dash.studiedMembersCount / dash.totalMembers) * 100).toFixed(0) : 0 }}% thành viên đã bắt đầu học
                </span>
              </div>

              <!-- Card 3: Đã thuộc toàn bộ từ -->
              <div class="bg-white border border-[#E5DED3] rounded-xl p-5 shadow-2xs space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-[#7D6853]">Đã thuộc hết thẻ</span>
                  <div class="w-7 h-7 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center">
                    <app-icon name="check-circle" [size]="14"></app-icon>
                  </div>
                </div>
                <div>
                  <span class="font-serif text-3xl font-bold text-[#29251F]">{{ dash.completedMembersCount }}</span>
                  <span class="text-xs text-[#746B60] ml-1.5">học viên</span>
                </div>
                <span class="text-[10px] text-[#8C827A] block">Đạt 100% từ vựng trong phòng</span>
              </div>

              <!-- Card 4: Tổng từ vựng trong phòng -->
              <div class="bg-white border border-[#E5DED3] rounded-xl p-5 shadow-2xs space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-[#7D6853]">Tổng từ vựng lớp</span>
                  <div class="w-7 h-7 rounded-full bg-[#FAF8F5] text-[#7D6853] flex items-center justify-center border border-[#E5DED3]">
                    <app-icon name="layers" [size]="14"></app-icon>
                  </div>
                </div>
                <div>
                  <span class="font-serif text-3xl font-bold text-[#7D6853]">{{ dash.totalWords }}</span>
                  <span class="text-xs text-[#746B60] ml-1.5">từ vựng</span>
                </div>
                <span class="text-[10px] text-[#8C827A] block">Thẻ học sinh cần ghi nhớ</span>
              </div>

            </div>

            <!-- Main Layout: 2 Columns (Bảng Thành Viên & Top Từ Hay Quên) -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              <!-- Column 1: Bảng Chi Tiết Tiến Độ Thành Viên (8 cols) -->
              <div class="lg:col-span-8 bg-white border border-[#E5DED3] rounded-xl overflow-hidden shadow-2xs space-y-0">
                <div class="px-5 py-4 border-b border-[#EAE4D9] bg-[#FAF8F5] flex items-center justify-between">
                  <div>
                    <h4 class="font-serif font-bold text-base text-[#29251F]">Chi Tiết Tiến Độ Từng Thành Viên</h4>
                    <span class="text-[11px] text-[#746B60]">Danh sách người học trong phòng và mức độ thuộc flashcard</span>
                  </div>
                  <span class="text-xs text-[#8C827A] font-semibold">{{ dash.memberProgresses.length }} thành viên</span>
                </div>

                <!-- Empty State -->
                <div *ngIf="dash.memberProgresses.length === 0" class="text-center py-12 px-4 space-y-2">
                  <div class="w-12 h-12 rounded-full bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center mx-auto text-[#7D6853]">
                    <app-icon name="users" [size]="20"></app-icon>
                  </div>
                  <h5 class="font-serif text-base font-bold text-[#29251F]">Chưa có dữ liệu học tập</h5>
                  <p class="text-xs text-[#746B60] max-w-sm mx-auto">
                    Các thành viên trong lớp chưa bắt đầu học flashcard. Khi có học viên luyện tập, tiến độ sẽ tự động xuất hiện tại đây.
                  </p>
                </div>

                <!-- Table -->
                <div *ngIf="dash.memberProgresses.length > 0" class="overflow-x-auto">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-[#FAF8F5] border-b border-[#EAE4D9] text-[10px] font-bold uppercase tracking-wider text-[#7D6853]">
                      <tr>
                        <th class="py-3 px-4">Thành viên</th>
                        <th class="py-3 px-4 min-w-[160px]">Tiến độ thuộc thẻ</th>
                        <th class="py-3 px-3 text-center">Trạng thái</th>
                        <th class="py-3 px-4">Từ chưa thuộc</th>
                        <th class="py-3 px-4 text-right">Lần học cuối</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[#F0EBE1]">
                      <tr *ngFor="let p of dash.memberProgresses" class="hover:bg-[#FAF8F5]/60 transition-colors">
                        <!-- Member Info -->
                        <td class="py-3.5 px-4">
                          <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-full bg-[#EAE4D9] text-[#7D6853] font-bold text-xs flex items-center justify-center shrink-0">
                              {{ p.fullName.charAt(0).toUpperCase() }}
                            </div>
                            <div class="min-w-0">
                              <span class="font-bold text-[#29251F] block truncate">{{ p.fullName }}</span>
                              <span class="text-[11px] text-[#8C827A] truncate">@{{ p.username }}</span>
                            </div>
                          </div>
                        </td>

                        <!-- Progress Bar & Count -->
                        <td class="py-3.5 px-4">
                          <div class="space-y-1">
                            <div class="flex items-center justify-between text-[11px]">
                              <span class="font-bold text-[#29251F]">{{ p.masteredCount }}/{{ p.totalWords }} từ</span>
                              <span class="font-mono text-[#7D6853] font-bold">{{ p.progressPercentage }}%</span>
                            </div>
                            <div class="w-full bg-[#EAE4D9] h-2 rounded-full overflow-hidden">
                              <div
                                class="h-full rounded-full transition-all duration-300"
                                [class.bg-emerald-600]="p.completed"
                                [class.bg-amber-600]="!p.completed && p.masteredCount > 0"
                                [class.bg-slate-300]="p.masteredCount === 0"
                                [style.width.%]="p.progressPercentage"
                              ></div>
                            </div>
                          </div>
                        </td>

                        <!-- Status Badge -->
                        <td class="py-3.5 px-3 text-center">
                          <span
                            *ngIf="p.completed"
                            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200"
                          >
                            <app-icon name="check" [size]="10" svgClass="text-emerald-700"></app-icon>
                            <span>Hoàn thành</span>
                          </span>

                          <span
                            *ngIf="!p.completed && p.masteredCount > 0"
                            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                          >
                            <app-icon name="rotate-cw" [size]="10" svgClass="text-amber-700"></app-icon>
                            <span>Đang học</span>
                          </span>

                          <span
                            *ngIf="p.masteredCount === 0"
                            class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200"
                          >
                            Chưa học
                          </span>
                        </td>

                        <!-- Unmastered Words -->
                        <td class="py-3.5 px-4">
                          <div *ngIf="p.unmasteredWords && p.unmasteredWords.length > 0" class="flex flex-wrap gap-1 max-w-[220px]">
                            <span
                              *ngFor="let w of p.unmasteredWords.slice(0, 3)"
                              class="px-1.5 py-0.5 rounded bg-[#FAF8F5] border border-[#E5DED3] text-[10px] font-mono text-[#7D6853]"
                            >
                              {{ w }}
                            </span>
                            <span *ngIf="p.unmasteredWords.length > 3" class="px-1 py-0.5 text-[10px] text-[#8C827A] font-semibold">
                              +{{ p.unmasteredWords.length - 3 }} từ
                            </span>
                          </div>
                          <span *ngIf="!p.unmasteredWords || p.unmasteredWords.length === 0" class="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                            <app-icon name="check-circle" [size]="12"></app-icon>
                            <span>Đã thuộc tất cả</span>
                          </span>
                        </td>

                        <!-- Last Studied -->
                        <td class="py-3.5 px-4 text-right text-[11px] text-[#8C827A] whitespace-nowrap">
                          {{ formatDate(p.lastStudiedAt) || 'Chưa học' }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Column 2: Top Từ Khó / Hay Quên Nhất Trong Lớp (4 cols) -->
              <div class="lg:col-span-4 bg-white border border-[#E5DED3] rounded-xl p-5 shadow-2xs space-y-4">
                <div class="flex items-center gap-2 pb-3 border-b border-[#EAE4D9]">
                  <div class="w-7 h-7 rounded-full bg-red-50 text-red-700 flex items-center justify-center">
                    <app-icon name="rotate-cw" [size]="14"></app-icon>
                  </div>
                  <div>
                    <h4 class="font-serif font-bold text-base text-[#29251F]">Từ Hay Quên Nhất</h4>
                    <span class="text-[11px] text-[#746B60]">Các từ vựng nhiều thành viên chưa thuộc</span>
                  </div>
                </div>

                <!-- Empty State -->
                <div *ngIf="dash.hardestWords.length === 0" class="text-center py-8 space-y-1">
                  <app-icon name="check-circle" [size]="24" svgClass="text-emerald-600 mx-auto"></app-icon>
                  <p class="text-xs text-[#5C5249] font-medium">Chưa có từ nào bị đánh giá khó!</p>
                  <span class="text-[11px] text-[#8C827A]">Tất cả thành viên đã thuộc hoặc chưa có báo cáo quên từ.</span>
                </div>

                <!-- Hardest Words List -->
                <div *ngIf="dash.hardestWords.length > 0" class="space-y-2.5">
                  <div
                    *ngFor="let hw of dash.hardestWords; let rankIdx = index"
                    class="p-3 rounded-lg border border-[#E5DED3] bg-[#FAF8F5] flex items-center justify-between gap-3"
                  >
                    <div class="flex items-center gap-2.5 min-w-0">
                      <span class="w-5 h-5 rounded-full bg-white border border-[#E5DED3] text-[10px] font-bold text-[#7D6853] flex items-center justify-center shrink-0">
                        {{ rankIdx + 1 }}
                      </span>
                      <div class="min-w-0">
                        <span class="font-serif font-bold text-sm text-[#29251F] block truncate">{{ hw.word }}</span>
                        <span class="text-[10px] text-red-700 font-semibold">
                          {{ hw.unmasteredCount }} học viên chưa thuộc
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      (click)="playAudio(hw.word)"
                      class="w-7 h-7 rounded-full bg-white hover:bg-[#EAE4D9] text-[#7D6853] flex items-center justify-center transition-colors border border-[#E5DED3] cursor-pointer shrink-0"
                      title="Nghe phát âm chuẩn"
                    >
                      <app-icon name="volume-2" [size]="12"></app-icon>
                    </button>
                  </div>
                </div>

                <div class="pt-3 border-t border-[#EAE4D9] text-[11px] text-[#8C827A] leading-relaxed">
                  Gợi ý: Giáo viên hoặc chủ phòng có thể nhấn mạnh các từ trên trong bài kiểm tra tiếp theo.
                </div>
              </div>

            </div>

          </div>

        </div>

      </ng-container>

      <!-- =========================================================================
           C. MODAL BÀI THI LỚP HỌC (LIVE QUIZ WITH TIMER)
           ========================================================================= -->
      <div 
        *ngIf="showQuizModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in"
      >
        <div class="bg-white border border-[#E5DED3] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-up overflow-hidden">
          
          <!-- Header: Title + Timer -->
          <div class="px-6 py-4 border-b border-[#EAE4D9] flex items-center justify-between bg-[#FAF8F5]">
            <div class="flex items-center gap-2">
              <app-icon name="gamepad" [size]="18" svgClass="text-[#7D6853]"></app-icon>
              <h3 class="font-serif text-lg font-bold text-[#29251F]">Bài Thi Lớp Học: {{ activeClassroom()?.name }}</h3>
            </div>
            
            <div *ngIf="!quizFinished" class="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E5DED3] rounded-full text-xs font-mono font-bold text-[#7D6853]">
              <app-icon name="clock" [size]="13"></app-icon>
              <span>{{ timeSpent }}s</span>
            </div>

            <button *ngIf="quizFinished" (click)="closeQuizModal()" class="text-[#8C827A] hover:text-[#29251F] bg-transparent border-0 cursor-pointer">
              <app-icon name="close" [size]="16"></app-icon>
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 overflow-y-auto space-y-6 flex-1">
            
            <!-- In Progress -->
            <div *ngIf="!quizFinished && quizQuestions.length > 0" class="space-y-6">
              <div class="flex items-center justify-between text-xs text-[#746B60] pb-2 border-b border-[#EAE4D9]">
                <span>Câu hỏi {{ currentQuizIdx + 1 }} / {{ quizQuestions.length }}</span>
                <span>Tiến độ: {{ answeredQuizCount() }} / {{ quizQuestions.length }}</span>
              </div>

              <div class="space-y-4">
                <h4 class="font-serif text-base font-bold text-[#29251F] leading-relaxed">
                  {{ quizQuestions[currentQuizIdx].question }}
                </h4>

                <div class="grid grid-cols-1 gap-2.5">
                  <button
                    *ngFor="let opt of quizQuestions[currentQuizIdx].options"
                    type="button"
                    (click)="selectQuizOpt(opt)"
                    class="text-left p-3.5 rounded-lg border text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center justify-between"
                    [class.bg-[#FAF8F5]]="quizQuestions[currentQuizIdx].userAnswer === opt"
                    [class.border-[#7D6853]]="quizQuestions[currentQuizIdx].userAnswer === opt"
                    [class.text-[#29251F]]="quizQuestions[currentQuizIdx].userAnswer === opt"
                    [class.bg-white]="quizQuestions[currentQuizIdx].userAnswer !== opt"
                    [class.border-[#E5DED3]]="quizQuestions[currentQuizIdx].userAnswer !== opt"
                    [class.text-[#5C5249]]="quizQuestions[currentQuizIdx].userAnswer !== opt"
                  >
                    <span>{{ opt }}</span>
                    <span *ngIf="quizQuestions[currentQuizIdx].userAnswer === opt" class="w-2 h-2 rounded-full bg-[#7D6853]"></span>
                  </button>
                </div>
              </div>

              <!-- Navigation -->
              <div class="flex items-center justify-between pt-4 border-t border-[#EAE4D9]">
                <button
                  type="button"
                  (click)="prevQuizIdx()"
                  [disabled]="currentQuizIdx === 0"
                  class="px-3 py-1.5 rounded bg-white border border-[#E5DED3] text-xs font-semibold text-[#5C5249] cursor-pointer disabled:opacity-40"
                >
                  Câu trước
                </button>
                <button
                  *ngIf="currentQuizIdx < quizQuestions.length - 1"
                  type="button"
                  (click)="nextQuizIdx()"
                  class="px-4 py-1.5 rounded bg-[#7D6853] text-white text-xs font-semibold cursor-pointer"
                >
                  Câu tiếp theo
                </button>
                <button
                  *ngIf="currentQuizIdx === quizQuestions.length - 1"
                  type="button"
                  (click)="submitClassQuiz()"
                  [disabled]="answeredQuizCount() === 0 || isSubmittingQuiz()"
                  class="px-4 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer shadow-xs disabled:opacity-40"
                >
                  {{ isSubmittingQuiz() ? 'Đang nộp bài...' : 'Nộp Bài Thi' }}
                </button>
              </div>
            </div>

            <!-- Quiz Finished Result -->
            <div *ngIf="quizFinished" class="text-center py-6 space-y-5 animate-scale-up">
              <div class="w-16 h-16 rounded-full bg-[#FAF8F5] border-2 border-[#7D6853] flex items-center justify-center mx-auto text-2xl font-serif font-bold text-[#7D6853]">
                {{ finalQuizScore }} / {{ quizQuestions.length }}
              </div>
              <div>
                <h4 class="font-serif text-xl font-bold text-[#29251F]">Nộp Bài Thi Lớp Học Thành Công!</h4>
                <p class="text-xs text-[#746B60] mt-1">
                  Thời gian hoàn thành: <strong>{{ timeSpent }} giây</strong>. Điểm số của bạn đã được cập nhật vào Bảng xếp hạng lớp!
                </p>
              </div>

              <div class="flex items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  (click)="closeQuizModal()"
                  class="px-5 py-2.5 rounded-lg bg-[#7D6853] text-white text-xs font-bold cursor-pointer"
                >
                  Xem Bảng Xếp Hạng Lớp
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>

      <!-- =========================================================================
           D. MODAL KHỞI TẠO PHÒNG MỚI (TỪ HUB VIEW)
           ========================================================================= -->
      <div 
        *ngIf="showCreateModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in"
      >
        <div class="bg-white border border-[#E5DED3] rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-xl animate-scale-up">
          <div class="flex items-center justify-between pb-3 border-b border-[#EAE4D9]">
            <div class="flex items-center gap-2">
              <app-icon name="plus-circle" [size]="18" svgClass="text-[#7D6853]"></app-icon>
              <h3 class="font-serif text-lg font-bold text-[#29251F]">Khởi Tạo Phòng Học Mới</h3>
            </div>
            <button (click)="showCreateModal = false" class="text-[#8C827A] hover:text-[#29251F] bg-transparent border-0 cursor-pointer">
              <app-icon name="close" [size]="16"></app-icon>
            </button>
          </div>

          <div class="space-y-4 text-xs">
            <div class="space-y-1">
              <label class="font-semibold text-[#29251F]">Tên phòng học:</label>
              <input
                type="text"
                [(ngModel)]="newClassName"
                placeholder="VD: Nhóm Ôn Thi IELTS Reading Cấp Tốc"
                class="w-full bg-[#FAF8F5] border border-[#E5DED3] focus:border-[#7D6853] rounded-md px-3 py-2 text-xs text-[#29251F] focus:outline-none"
              />
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-[#29251F]">Mô tả mục tiêu lớp:</label>
              <textarea
                [(ngModel)]="newClassDesc"
                rows="3"
                placeholder="Chia sẻ tài liệu và cùng luyện tập từ vựng mỗi ngày..."
                class="w-full bg-[#FAF8F5] border border-[#E5DED3] focus:border-[#7D6853] rounded-md px-3 py-2 text-xs text-[#29251F] focus:outline-none resize-none"
              ></textarea>
            </div>

            <div class="space-y-1">
              <label class="font-semibold text-[#29251F]">Trình độ mục tiêu:</label>
              <select
                [(ngModel)]="newClassLevel"
                class="w-full bg-[#FAF8F5] border border-[#E5DED3] focus:border-[#7D6853] rounded-md px-3 py-2 text-xs text-[#29251F] focus:outline-none"
              >
                <option value="A1">A1 — Căn bản</option>
                <option value="A2">A2 — Sơ cấp</option>
                <option value="B1">B1 — Trung cấp</option>
                <option value="B2">B2 — Trung cao cấp</option>
                <option value="C1">C1 — Cao cấp</option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-[#EAE4D9]">
            <button
              type="button"
              (click)="showCreateModal = false"
              class="px-4 py-2 rounded-md bg-white border border-[#E5DED3] text-[#5C5249] hover:bg-[#FAF8F5] text-xs font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              (click)="submitCreateHubClassroom()"
              [disabled]="isCreatingClass() || !newClassName.trim()"
              class="px-4 py-2 rounded-md bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {{ isCreatingClass() ? 'Đang tạo...' : 'Tạo Phòng & Lấy Mã' }}
            </button>
          </div>
        </div>
      </div>

      <!-- =========================================================================
           E. MODAL FLASHCARD HỌC TẬP LỚP HỌC (3D FLIP INTERACTIVE FLASHCARD)
           ========================================================================= -->
      <div 
        *ngIf="showFlashcardModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
      >
        <div class="bg-white border border-[#E5DED3] rounded-2xl w-full max-w-xl flex flex-col shadow-2xl animate-scale-up overflow-hidden select-none">
          
          <!-- Modal Top Header: Tiêu đề + Tiến độ + Nút Shuffle / Đóng -->
          <div class="px-6 py-4 border-b border-[#EAE4D9] flex items-center justify-between bg-[#FAF8F5]">
            <div class="flex items-center gap-2">
              <app-icon name="layers" [size]="18" svgClass="text-[#7D6853]"></app-icon>
              <div>
                <h3 class="font-serif text-base font-bold text-[#29251F] leading-tight">Flashcard Lớp Học</h3>
                <span class="text-[11px] text-[#746B60]">{{ activeClassroom()?.name }}</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="shuffleFlashcards()"
                class="px-2.5 py-1 text-xs rounded bg-white hover:bg-[#FAF8F5] border border-[#E5DED3] text-[#5C5249] flex items-center gap-1 cursor-pointer transition-colors"
                title="Xáo trộn thứ tự từ vựng ngẫu nhiên"
              >
                <app-icon name="shuffle" [size]="12"></app-icon>
                <span>Xáo thẻ</span>
              </button>

              <button
                type="button"
                (click)="closeFlashcardModal()"
                class="text-[#8C827A] hover:text-[#29251F] p-1 bg-transparent border-0 cursor-pointer"
                title="Đóng thẻ"
              >
                <app-icon name="close" [size]="16"></app-icon>
              </button>
            </div>
          </div>

          <!-- Progress Header: Thẻ X / N + Progress bar -->
          <div class="px-6 pt-3 pb-1 bg-white flex flex-col gap-1.5 border-b border-[#F5EFE6]">
            <div class="flex items-center justify-between text-xs text-[#746B60]">
              <span>Thẻ <strong>{{ currentCardIdx + 1 }}</strong> / {{ flashcards.length }}</span>
              <span class="text-[11px] font-mono text-[#7D6853]">Đã thuộc: {{ masteredCardWords.size }} / {{ flashcards.length }}</span>
            </div>
            <!-- Progress bar line -->
            <div class="w-full bg-[#EAE4D9] h-1.5 rounded-full overflow-hidden">
              <div 
                class="bg-[#7D6853] h-full transition-all duration-300 rounded-full"
                [style.width.%]="flashcards.length > 0 ? (((currentCardIdx + 1) / flashcards.length) * 100) : 0"
              ></div>
            </div>
          </div>

          <!-- Modal Body: 3D Flipping Card Stage -->
          <div class="p-6 bg-[#FDFBF9] flex flex-col items-center justify-center min-h-[380px]">
            
            <!-- When studying cards -->
            <div *ngIf="!flashcardFinished && flashcards.length > 0" class="w-full flex flex-col items-center space-y-4">
              
              <!-- Card 3D Flip Container -->
              <div 
                class="w-full max-w-md h-[270px] cursor-pointer group"
                style="perspective: 1000px;"
                (click)="flipCard()"
                title="Nhấn vào thẻ hoặc ấn phím Space để lật"
              >
                <div 
                  class="w-full h-full relative transition-transform duration-500 rounded-2xl shadow-sm border border-[#E5DED3]"
                  style="transform-style: preserve-3d;"
                  [style.transform]="isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'"
                >
                  <!-- Mặt trước (Front) -->
                  <div 
                    class="absolute inset-0 w-full h-full p-6 bg-white rounded-2xl flex flex-col justify-between"
                    style="backface-visibility: hidden; -webkit-backface-visibility: hidden;"
                  >
                    <!-- Front Top Bar -->
                    <div class="flex items-center justify-between">
                      <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#FAF8F5] text-[#7D6853] border border-[#E5DED3]">
                        {{ currentCard()?.partOfSpeech || 'noun' }} · Level {{ activeClassroom()?.targetLevel }}
                      </span>

                      <button
                        type="button"
                        (click)="playAudio(currentCard()?.word || ''); $event.stopPropagation()"
                        class="w-8 h-8 rounded-full bg-[#FAF8F5] hover:bg-[#EAE4D9] text-[#7D6853] flex items-center justify-center transition-colors border border-[#E5DED3] cursor-pointer"
                        title="Nghe phát âm chuẩn"
                      >
                        <app-icon name="volume-2" [size]="14"></app-icon>
                      </button>
                    </div>

                    <!-- Front Center Word -->
                    <div class="text-center my-auto space-y-2">
                      <h2 class="font-serif text-3xl sm:text-4xl font-bold text-[#29251F] tracking-tight">
                        {{ currentCard()?.word }}
                      </h2>
                      <p class="font-mono text-sm text-[#8C827A]">{{ currentCard()?.ipa }}</p>
                    </div>

                    <!-- Front Bottom Hint -->
                    <div class="text-center text-[11px] text-[#A89F91] flex items-center justify-center gap-1">
                      <app-icon name="rotate-cw" [size]="11"></app-icon>
                      <span>Nhấp thẻ để lật xem nghĩa & ví dụ</span>
                    </div>
                  </div>

                  <!-- Mặt sau (Back) -->
                  <div 
                    class="absolute inset-0 w-full h-full p-6 bg-[#FAF8F5] rounded-2xl flex flex-col justify-between"
                    style="backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: rotateY(180deg);"
                  >
                    <!-- Back Top Bar -->
                    <div class="flex items-center justify-between border-b border-[#EAE4D9] pb-2">
                      <div class="flex items-center gap-2">
                        <span class="font-serif font-bold text-sm text-[#29251F]">{{ currentCard()?.word }}</span>
                        <span class="font-mono text-xs text-[#8C827A]">{{ currentCard()?.ipa }}</span>
                      </div>

                      <button
                        type="button"
                        (click)="playAudio(currentCard()?.word || ''); $event.stopPropagation()"
                        class="w-7 h-7 rounded-full bg-white hover:bg-[#EAE4D9] text-[#7D6853] flex items-center justify-center transition-colors border border-[#E5DED3] cursor-pointer"
                        title="Nghe phát âm chuẩn"
                      >
                        <app-icon name="volume-2" [size]="13"></app-icon>
                      </button>
                    </div>

                    <!-- Back Center Meaning & Context -->
                    <div class="space-y-3 my-auto text-left">
                      <div>
                        <span class="text-[10px] uppercase font-bold text-[#7D6853] block">Nghĩa tiếng Việt:</span>
                        <h3 class="font-serif text-lg sm:text-xl font-bold text-[#29251F] leading-snug">
                          {{ currentCard()?.vietnamese }}
                        </h3>
                      </div>

                      <div *ngIf="currentCard()?.exampleEn" class="p-2.5 bg-white rounded-lg border border-[#E5DED3] space-y-1 text-xs">
                        <p class="text-[#4A3E31] italic font-serif leading-relaxed">
                          "{{ currentCard()?.exampleEn }}"
                        </p>
                        <p *ngIf="currentCard()?.exampleVi" class="text-[11px] text-[#8C827A]">
                          {{ currentCard()?.exampleVi }}
                        </p>
                      </div>
                    </div>

                    <!-- Back Bottom Hint -->
                    <div class="text-center text-[11px] text-[#A89F91] flex items-center justify-center gap-1">
                      <app-icon name="rotate-cw" [size]="11"></app-icon>
                      <span>Nhấp để quay lại mặt trước</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Action Bar dưới Flashcard: Chưa nhớ / Đã nhớ -->
              <div class="flex items-center justify-center gap-3 w-full max-w-md pt-1">
                <button
                  type="button"
                  (click)="markCardStatus(false)"
                  class="flex-1 py-2 px-3 rounded-lg border border-[#E5DED3] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#5C5249] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <app-icon name="x-circle" [size]="14" svgClass="text-red-600"></app-icon>
                  <span>Chưa thuộc (Ôn lại)</span>
                </button>

                <button
                  type="button"
                  (click)="markCardStatus(true)"
                  class="flex-1 py-2 px-3 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  <app-icon name="check-circle" [size]="14" svgClass="text-emerald-700"></app-icon>
                  <span>Đã ghi nhớ</span>
                </button>
              </div>

            </div>

            <!-- When Completed All Flashcards -->
            <div *ngIf="flashcardFinished" class="text-center py-6 space-y-5 animate-scale-up">
              <div class="w-16 h-16 rounded-full bg-[#FAF8F5] border-2 border-[#7D6853] flex items-center justify-center mx-auto text-[#7D6853]">
                <app-icon name="check-circle" [size]="32" svgClass="text-[#7D6853]"></app-icon>
              </div>
              <div class="space-y-1">
                <h4 class="font-serif text-xl font-bold text-[#29251F]">Hoàn Thành Phiên Học Flashcard!</h4>
                <p class="text-xs text-[#746B60]">
                  Bạn đã ghi nhớ thành công <strong>{{ masteredCardWords.size }}</strong> / <strong>{{ flashcards.length }}</strong> từ vựng của lớp học.
                </p>
              </div>

              <div class="flex items-center justify-center gap-3 pt-3">
                <button
                  type="button"
                  (click)="resetFlashcards()"
                  class="px-4 py-2 rounded-lg bg-white border border-[#E5DED3] text-[#29251F] text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-[#FAF8F5]"
                >
                  <app-icon name="rotate-cw" [size]="13"></app-icon>
                  <span>Học lại từ đầu</span>
                </button>
                <button
                  type="button"
                  (click)="closeFlashcardModal(); startClassQuiz()"
                  class="px-4 py-2 rounded-lg bg-[#7D6853] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-[#685542]"
                >
                  <app-icon name="gamepad" [size]="13" svgClass="text-white"></app-icon>
                  <span>Làm Bài Thi Lớp Học</span>
                </button>
              </div>
            </div>

          </div>

          <!-- Modal Footer: Navigation Controls -->
          <div *ngIf="!flashcardFinished" class="px-6 py-3.5 border-t border-[#EAE4D9] flex items-center justify-between bg-[#FAF8F5]">
            <button
              type="button"
              (click)="prevFlashcard()"
              [disabled]="currentCardIdx === 0"
              class="px-3 py-1.5 rounded-md bg-white border border-[#E5DED3] text-xs font-semibold text-[#5C5249] flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FAF8F5]"
            >
              <app-icon name="chevron-left" [size]="13"></app-icon>
              <span>Thẻ trước</span>
            </button>

            <!-- Center Flip Button -->
            <button
              type="button"
              (click)="flipCard()"
              class="px-5 py-1.5 rounded-md bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all"
            >
              <app-icon name="rotate-cw" [size]="13" svgClass="text-white"></app-icon>
              <span>Lật Thẻ</span>
            </button>

            <button
              *ngIf="currentCardIdx < flashcards.length - 1"
              type="button"
              (click)="nextFlashcard()"
              class="px-3 py-1.5 rounded-md bg-white border border-[#E5DED3] text-xs font-semibold text-[#5C5249] flex items-center gap-1 cursor-pointer hover:bg-[#FAF8F5]"
            >
              <span>Thẻ sau</span>
              <app-icon name="chevron-right" [size]="13"></app-icon>
            </button>

            <button
              *ngIf="currentCardIdx === flashcards.length - 1"
              type="button"
              (click)="finishFlashcards()"
              class="px-3.5 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold cursor-pointer"
            >
              <span>Hoàn thành</span>
            </button>
          </div>

        </div>
      </div>

      <!-- =========================================================================
           F. MODAL THÊM TỪ VỰNG VÀO PHÒNG HỌC (3 NGUỒN: SỔ TAY, AI, NHẬP TAY)
           ========================================================================= -->
      <div 
        *ngIf="showAddWordsModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in select-none"
      >
        <div class="bg-white border border-[#E5DED3] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-scale-up overflow-hidden">
          
          <!-- Header -->
          <div class="px-6 py-4 border-b border-[#EAE4D9] flex items-center justify-between bg-[#FAF8F5]">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-white border border-[#E5DED3] text-[#7D6853] flex items-center justify-center shadow-2xs">
                <app-icon name="plus-circle" [size]="16"></app-icon>
              </div>
              <div>
                <h3 class="font-serif text-base font-bold text-[#29251F] leading-tight">
                  Thêm Từ Vựng Vào Phòng Học
                </h3>
                <span class="text-[11px] text-[#746B60]">
                  Lớp: <strong>{{ activeClassroom()?.name }}</strong> ({{ activeClassroom()?.code }})
                </span>
              </div>
            </div>

            <button
              type="button"
              (click)="closeAddWordsModal()"
              class="text-[#8C827A] hover:text-[#29251F] p-1 bg-transparent border-0 cursor-pointer"
            >
              <app-icon name="close" [size]="16"></app-icon>
            </button>
          </div>

          <!-- 3-Tabs Selector -->
          <div class="px-6 pt-3 pb-2 bg-white border-b border-[#EAE4D9] flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              (click)="addWordsTab = 'notebook'"
              class="px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
              [class.bg-[#7D6853]]="addWordsTab === 'notebook'"
              [class.text-white]="addWordsTab === 'notebook'"
              [class.bg-[#FAF8F5]]="addWordsTab !== 'notebook'"
              [class.text-[#5C5249]]="addWordsTab !== 'notebook'"
              [class.border]="addWordsTab !== 'notebook'"
              [class.border-[#E5DED3]]="addWordsTab !== 'notebook'"
            >
              <app-icon name="book-open" [size]="13"></app-icon>
              <span>1. Sổ Tay Cá Nhân ({{ savedWords().length }})</span>
            </button>

            <button
              type="button"
              (click)="addWordsTab = 'extractor'"
              class="px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
              [class.bg-[#7D6853]]="addWordsTab === 'extractor'"
              [class.text-white]="addWordsTab === 'extractor'"
              [class.bg-[#FAF8F5]]="addWordsTab !== 'extractor'"
              [class.text-[#5C5249]]="addWordsTab !== 'extractor'"
              [class.border]="addWordsTab !== 'extractor'"
              [class.border-[#E5DED3]]="addWordsTab !== 'extractor'"
            >
              <app-icon name="sparkles" [size]="13"></app-icon>
              <span>2. Trích Xuất AI</span>
            </button>

            <button
              type="button"
              (click)="addWordsTab = 'manual'"
              class="px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
              [class.bg-[#7D6853]]="addWordsTab === 'manual'"
              [class.text-white]="addWordsTab === 'manual'"
              [class.bg-[#FAF8F5]]="addWordsTab !== 'manual'"
              [class.text-[#5C5249]]="addWordsTab !== 'manual'"
              [class.border]="addWordsTab !== 'manual'"
              [class.border-[#E5DED3]]="addWordsTab !== 'manual'"
            >
              <app-icon name="edit-3" [size]="13"></app-icon>
              <span>3. Nhập Tay Thủ Công</span>
              <span *ngIf="stagedManualWords.length > 0" class="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                {{ stagedManualWords.length }}
              </span>
            </button>
          </div>

          <!-- Modal Body with Scrollable Area -->
          <div class="p-6 overflow-y-auto flex-1 space-y-5 bg-[#FAF8F5]/30">

            <!-- TAB 1: SỔ TAY CÁ NHÂN -->
            <div *ngIf="addWordsTab === 'notebook'" class="space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <!-- Search Box -->
                <div class="relative flex-1">
                  <input
                    type="text"
                    [(ngModel)]="notebookSearchQuery"
                    placeholder="Tìm kiếm từ vựng trong sổ tay (tiếng Anh hoặc nghĩa)..."
                    class="w-full bg-white border border-[#E5DED3] focus:border-[#7D6853] rounded-lg pl-8 pr-3 py-2 text-xs text-[#29251F] focus:outline-none"
                  />
                  <div class="absolute left-2.5 top-2.5 text-[#8C827A]">
                    <app-icon name="search" [size]="13"></app-icon>
                  </div>
                </div>

                <!-- Select All / Deselect All -->
                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    (click)="toggleSelectAllNotebookWords()"
                    class="px-3 py-1.5 rounded-md bg-white border border-[#E5DED3] hover:bg-[#FAF8F5] text-xs font-semibold text-[#5C5249] cursor-pointer"
                  >
                    {{ isAllNotebookSelected() ? 'Bỏ chọn tất cả' : 'Chọn tất cả chưa thêm' }}
                  </button>
                </div>
              </div>

              <!-- Empty Notebook State -->
              <div *ngIf="savedWords().length === 0" class="text-center py-10 bg-white border border-[#E5DED3] rounded-xl p-4 space-y-2">
                <app-icon name="book-open" [size]="24" svgClass="text-[#7D6853] mx-auto"></app-icon>
                <h5 class="font-serif font-bold text-sm text-[#29251F]">Sổ tay từ vựng của bạn đang trống</h5>
                <p class="text-xs text-[#746B60]">Bạn chưa lưu từ vựng nào qua tính năng quét ảnh AI hoặc học từ vựng bối cảnh.</p>
              </div>

              <!-- Words List Grid -->
              <div *ngIf="savedWords().length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                <div
                  *ngFor="let item of filteredNotebookWords()"
                  (click)="!isWordInClassroom(item.word) && toggleSelectNotebookWord(item.id)"
                  class="p-3 rounded-xl border transition-all flex items-start gap-3 select-none"
                  [class.bg-white]="!selectedNotebookWordIds.has(item.id) && !isWordInClassroom(item.word)"
                  [class.border-[#E5DED3]]="!selectedNotebookWordIds.has(item.id) && !isWordInClassroom(item.word)"
                  [class.bg-[#FAF8F5]]="selectedNotebookWordIds.has(item.id)"
                  [class.border-[#7D6853]]="selectedNotebookWordIds.has(item.id)"
                  [class.opacity-50]="isWordInClassroom(item.word)"
                  [class.cursor-pointer]="!isWordInClassroom(item.word)"
                  [class.cursor-not-allowed]="isWordInClassroom(item.word)"
                >
                  <!-- Checkbox -->
                  <input
                    type="checkbox"
                    [checked]="selectedNotebookWordIds.has(item.id) || isWordInClassroom(item.word)"
                    [disabled]="isWordInClassroom(item.word)"
                    (click)="$event.stopPropagation(); toggleSelectNotebookWord(item.id)"
                    class="mt-1 rounded text-[#7D6853] focus:ring-0 cursor-pointer"
                  />

                  <!-- Word Info -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="font-serif font-bold text-sm text-[#29251F] truncate">{{ item.word }}</span>
                      <span class="text-[9px] uppercase font-bold px-1 py-0.2 rounded bg-[#FAF8F5] text-[#7D6853] border border-[#E5DED3]">
                        {{ item.partOfSpeech || 'noun' }}
                      </span>
                      <span *ngIf="isWordInClassroom(item.word)" class="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-600">
                        Đã có trong lớp
                      </span>
                    </div>

                    <span class="text-[11px] text-[#8C827A] font-mono block">{{ item.ipa }}</span>
                    <p class="text-xs text-[#4A3E31] font-semibold truncate mt-0.5">{{ item.vietnamese }}</p>
                  </div>
                </div>
              </div>

              <!-- Bottom Action Bar -->
              <div class="flex items-center justify-between pt-3 border-t border-[#EAE4D9]">
                <span class="text-xs text-[#746B60]">
                  Đã chọn: <strong class="text-[#29251F]">{{ selectedNotebookWordIds.size }}</strong> từ vựng
                </span>

                <button
                  type="button"
                  (click)="submitAddFromNotebook()"
                  [disabled]="isAddingWords() || selectedNotebookWordIds.size === 0"
                  class="px-5 py-2 rounded-lg bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <app-icon name="plus" [size]="14"></app-icon>
                  <span>{{ isAddingWords() ? 'Đang bổ sung...' : 'Thêm Vào Lớp Học' }}</span>
                </button>
              </div>
            </div>

            <!-- TAB 2: TRÍCH XUẤT AI -->
            <div *ngIf="addWordsTab === 'extractor'" class="space-y-4">
              <div class="space-y-1.5">
                <label class="text-xs font-bold text-[#29251F] block">
                  Dán nội dung bài đọc / tài liệu tiếng Anh để AI trích xuất:
                </label>
                <textarea
                  [(ngModel)]="extractInputText"
                  rows="4"
                  placeholder="Paste đoạn văn bản tiếng Anh vào đây (ví dụ: một bài báo BBC, trích đoạn sách giáo khoa, bài luận IELTS Reading...)"
                  class="w-full bg-white border border-[#E5DED3] focus:border-[#7D6853] rounded-lg p-3 text-xs text-[#29251F] focus:outline-none resize-none"
                ></textarea>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="space-y-1">
                  <label class="text-[11px] font-semibold text-[#746B60]">Số lượng từ cần trích:</label>
                  <select
                    [(ngModel)]="extractTargetCount"
                    class="w-full bg-white border border-[#E5DED3] focus:border-[#7D6853] rounded-md px-2.5 py-1.5 text-xs text-[#29251F] focus:outline-none"
                  >
                    <option [ngValue]="5">5 từ trọng tâm</option>
                    <option [ngValue]="10">10 từ trọng tâm</option>
                    <option [ngValue]="15">15 từ trọng tâm</option>
                    <option [ngValue]="20">20 từ trọng tâm</option>
                  </select>
                </div>

                <div class="space-y-1">
                  <label class="text-[11px] font-semibold text-[#746B60]">Trình độ mục tiêu:</label>
                  <select
                    [(ngModel)]="extractTargetLevel"
                    class="w-full bg-white border border-[#E5DED3] focus:border-[#7D6853] rounded-md px-2.5 py-1.5 text-xs text-[#29251F] focus:outline-none"
                  >
                    <option value="A2">A2 — Sơ cấp</option>
                    <option value="B1">B1 — Trung cấp</option>
                    <option value="B2">B2 — Trung cao cấp</option>
                    <option value="C1">C1 — Cao cấp</option>
                  </select>
                </div>

                <div class="flex items-end">
                  <button
                    type="button"
                    (click)="submitExtractVocab()"
                    [disabled]="isExtracting() || !extractInputText.trim()"
                    class="w-full py-2 rounded-md bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    <app-icon name="sparkles" [size]="13"></app-icon>
                    <span>{{ isExtracting() ? 'Đang phân tích...' : 'Trích Xuất Bằng AI' }}</span>
                  </button>
                </div>
              </div>

              <!-- Extracted Result Preview -->
              <div *ngIf="extractedWords.length > 0" class="pt-3 border-t border-[#EAE4D9] space-y-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-[#29251F]">
                    Kết quả AI: {{ extractedWords.length }} từ vựng tìm thấy
                  </span>

                  <button
                    type="button"
                    (click)="toggleSelectAllExtracted()"
                    class="px-2.5 py-1 rounded bg-white border border-[#E5DED3] text-[11px] text-[#5C5249] cursor-pointer"
                  >
                    {{ selectedExtractedIndices.size === extractedWords.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả' }}
                  </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                  <div
                    *ngFor="let item of extractedWords; let idx = index"
                    (click)="toggleSelectExtracted(idx)"
                    class="p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all"
                    [class.bg-white]="!selectedExtractedIndices.has(idx)"
                    [class.border-[#E5DED3]]="!selectedExtractedIndices.has(idx)"
                    [class.bg-[#FAF8F5]]="selectedExtractedIndices.has(idx)"
                    [class.border-[#7D6853]]="selectedExtractedIndices.has(idx)"
                  >
                    <input
                      type="checkbox"
                      [checked]="selectedExtractedIndices.has(idx)"
                      (click)="$event.stopPropagation(); toggleSelectExtracted(idx)"
                      class="mt-1 rounded text-[#7D6853] focus:ring-0 cursor-pointer"
                    />

                    <div class="min-w-0 flex-1 text-xs">
                      <div class="flex items-center gap-1.5">
                        <span class="font-serif font-bold text-[#29251F]">{{ item.word }}</span>
                        <span class="text-[9px] uppercase font-bold px-1 py-0.2 rounded bg-[#FAF8F5] text-[#7D6853] border border-[#E5DED3]">
                          {{ item.partOfSpeech }}
                        </span>
                      </div>
                      <span class="text-[10px] text-[#8C827A] font-mono">{{ item.ipa }}</span>
                      <p class="text-xs font-semibold text-[#4A3E31] truncate mt-0.5">{{ item.vietnamese }}</p>
                    </div>
                  </div>
                </div>

                <!-- Add Button -->
                <div class="flex items-center justify-between pt-2">
                  <span class="text-xs text-[#746B60]">
                    Đã chọn: <strong>{{ selectedExtractedIndices.size }}</strong> từ
                  </span>

                  <button
                    type="button"
                    (click)="submitAddFromExtractor()"
                    [disabled]="isAddingWords() || selectedExtractedIndices.size === 0"
                    class="px-5 py-2 rounded-lg bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <app-icon name="plus" [size]="14"></app-icon>
                    <span>{{ isAddingWords() ? 'Đang thêm...' : 'Thêm Vào Lớp Học' }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- TAB 3: NHẬP TAY THỦ CÔNG -->
            <div *ngIf="addWordsTab === 'manual'" class="space-y-4">
              <div class="bg-white border border-[#E5DED3] rounded-xl p-4 space-y-3 shadow-2xs">
                <span class="text-[11px] font-bold uppercase tracking-wider text-[#7D6853] block">
                  Nhập thông tin từ vựng mới:
                </span>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div class="space-y-1">
                    <label class="text-[11px] font-semibold text-[#29251F]">Từ vựng (Word) *</label>
                    <input
                      type="text"
                      [(ngModel)]="manualWord"
                      placeholder="VD: resilient"
                      class="w-full bg-[#FAF8F5] border border-[#E5DED3] focus:border-[#7D6853] rounded-md px-2.5 py-1.5 text-xs text-[#29251F] focus:outline-none"
                    />
                  </div>

                  <div class="space-y-1">
                    <label class="text-[11px] font-semibold text-[#29251F]">Phiên âm (IPA)</label>
                    <input
                      type="text"
                      [(ngModel)]="manualIpa"
                      placeholder="VD: /rɪˈzɪl.jənt/"
                      class="w-full bg-[#FAF8F5] border border-[#E5DED3] focus:border-[#7D6853] rounded-md px-2.5 py-1.5 text-xs text-[#29251F] font-mono focus:outline-none"
                    />
                  </div>

                  <div class="space-y-1">
                    <label class="text-[11px] font-semibold text-[#29251F]">Từ loại (Part of speech)</label>
                    <select
                      [(ngModel)]="manualPartOfSpeech"
                      class="w-full bg-[#FAF8F5] border border-[#E5DED3] focus:border-[#7D6853] rounded-md px-2.5 py-1.5 text-xs text-[#29251F] focus:outline-none"
                    >
                      <option value="noun">noun (Danh từ)</option>
                      <option value="verb">verb (Động từ)</option>
                      <option value="adjective">adjective (Tính từ)</option>
                      <option value="adverb">adverb (Trạng từ)</option>
                      <option value="phrase">phrase (Cụm từ)</option>
                    </select>
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="text-[11px] font-semibold text-[#29251F]">Nghĩa tiếng Việt *</label>
                  <input
                    type="text"
                    [(ngModel)]="manualVietnamese"
                    placeholder="VD: kiên cường, có khả năng phục hồi nhanh"
                    class="w-full bg-[#FAF8F5] border border-[#E5DED3] focus:border-[#7D6853] rounded-md px-2.5 py-1.5 text-xs text-[#29251F] focus:outline-none"
                  />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div class="space-y-1">
                    <label class="text-[11px] font-semibold text-[#29251F]">Ví dụ tiếng Anh (Context EN)</label>
                    <input
                      type="text"
                      [(ngModel)]="manualExampleEn"
                      placeholder="VD: He is resilient despite facing many setbacks."
                      class="w-full bg-[#FAF8F5] border border-[#E5DED3] focus:border-[#7D6853] rounded-md px-2.5 py-1.5 text-xs text-[#29251F] focus:outline-none"
                    />
                  </div>

                  <div class="space-y-1">
                    <label class="text-[11px] font-semibold text-[#29251F]">Dịch nghĩa ví dụ (Context VI)</label>
                    <input
                      type="text"
                      [(ngModel)]="manualExampleVi"
                      placeholder="VD: Anh ấy rất kiên cường dù gặp nhiều khó khăn."
                      class="w-full bg-[#FAF8F5] border border-[#E5DED3] focus:border-[#7D6853] rounded-md px-2.5 py-1.5 text-xs text-[#29251F] focus:outline-none"
                    />
                  </div>
                </div>

                <div class="flex justify-end pt-1">
                  <button
                    type="button"
                    (click)="addManualWordToStage()"
                    [disabled]="!manualWord.trim() || !manualVietnamese.trim()"
                    class="px-4 py-1.5 rounded-md bg-[#FAF8F5] hover:bg-[#EAE4D9] border border-[#E5DED3] text-[#29251F] text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <app-icon name="plus" [size]="13"></app-icon>
                    <span>+ Bổ sung vào danh sách chờ</span>
                  </button>
                </div>
              </div>

              <!-- Staged Words Table -->
              <div class="space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-bold text-[#29251F]">
                    Danh sách chờ thêm: {{ stagedManualWords.length }} từ vựng
                  </span>
                  <button
                    *ngIf="stagedManualWords.length > 0"
                    type="button"
                    (click)="stagedManualWords = []"
                    class="text-xs text-red-600 hover:underline cursor-pointer bg-transparent border-0"
                  >
                    Xóa tất cả
                  </button>
                </div>

                <!-- Empty Stage State -->
                <div *ngIf="stagedManualWords.length === 0" class="text-center py-6 border border-dashed border-[#E5DED3] rounded-xl bg-white text-xs text-[#8C827A]">
                  Chưa có từ nào trong danh sách chờ. Hãy điền form bên trên và bấm "+ Bổ sung vào danh sách chờ".
                </div>

                <!-- Staged Table -->
                <div *ngIf="stagedManualWords.length > 0" class="bg-white border border-[#E5DED3] rounded-xl overflow-hidden shadow-2xs max-h-[220px] overflow-y-auto">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-[#FAF8F5] border-b border-[#EAE4D9] text-[10px] font-bold uppercase tracking-wider text-[#7D6853]">
                      <tr>
                        <th class="py-2 px-3">Từ vựng</th>
                        <th class="py-2 px-3">Loại từ</th>
                        <th class="py-2 px-3">Nghĩa tiếng Việt</th>
                        <th class="py-2 px-3">Ví dụ</th>
                        <th class="py-2 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[#F0EBE1]">
                      <tr *ngFor="let item of stagedManualWords; let idx = index" class="hover:bg-[#FAF8F5]">
                        <td class="py-2 px-3 font-serif font-bold text-[#29251F]">{{ item.word }}</td>
                        <td class="py-2 px-3 text-[#7D6853]">{{ item.partOfSpeech }}</td>
                        <td class="py-2 px-3 font-semibold text-[#4A3E31]">{{ item.vietnamese }}</td>
                        <td class="py-2 px-3 text-[#746B60] italic truncate max-w-[180px]">{{ item.exampleEn || '—' }}</td>
                        <td class="py-2 px-2 text-center">
                          <button
                            type="button"
                            (click)="removeStagedManualWord(idx)"
                            class="text-red-500 hover:text-red-700 p-1 bg-transparent border-0 cursor-pointer"
                          >
                            <app-icon name="trash" [size]="12"></app-icon>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Submit Button -->
                <div class="flex items-center justify-end pt-2">
                  <button
                    type="button"
                    (click)="submitAddFromManual()"
                    [disabled]="isAddingWords() || stagedManualWords.length === 0"
                    class="px-5 py-2 rounded-lg bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    <app-icon name="plus" [size]="14"></app-icon>
                    <span>{{ isAddingWords() ? 'Đang thêm...' : 'Xác Nhận Thêm ' + stagedManualWords.length + ' Từ Vào Lớp' }}</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          <!-- Modal Bottom Footer -->
          <div class="px-6 py-3 border-t border-[#EAE4D9] flex items-center justify-between bg-[#FAF8F5]">
            <span class="text-[11px] text-[#8C827A]">
              Từ vựng được thêm sẽ tự động đồng bộ vào bài kiểm tra trắc nghiệm và phiên học Flashcard của cả lớp.
            </span>
            <button
              type="button"
              (click)="closeAddWordsModal()"
              class="px-4 py-1.5 rounded-lg bg-white border border-[#E5DED3] text-xs font-semibold text-[#5C5249] hover:bg-[#FAF8F5] cursor-pointer"
            >
              Đóng
            </button>
          </div>

        </div>
      </div>

    </div>
  `
})
export class UserClassroomComponent implements OnInit {
  private classroomService = inject(ClassroomService);
  private studyService = inject(UserStudyService);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  activeCode: string | null = null;
  activeClassroom = this.classroomService.activeClassroom;
  isLoadingDetail = signal<boolean>(false);
  loadError = signal<string | null>(null);
  activeTab: 'words' | 'leaderboard' | 'progress' = 'words';

  // Progress Dashboard State
  progressDashboard = this.classroomService.activeProgressDashboard;
  isLoadingProgress = signal<boolean>(false);

  // Hub view inputs
  joinCodeInput: string = '';
  myClassrooms = this.classroomService.myClassrooms;
  leaderboard = this.classroomService.activeLeaderboard;

  // Actions
  isCloning = signal<boolean>(false);

  // Live Quiz
  showQuizModal: boolean = false;
  quizQuestions: ClassroomQuizQuestion[] = [];
  currentQuizIdx: number = 0;
  quizFinished: boolean = false;
  finalQuizScore: number = 0;
  timeSpent: number = 0;
  timerInterval: any = null;
  isSubmittingQuiz = signal<boolean>(false);

  // Flashcard State
  showFlashcardModal: boolean = false;
  flashcards: ClassroomWordItem[] = [];
  currentCardIdx: number = 0;
  isCardFlipped: boolean = false;
  flashcardFinished: boolean = false;
  masteredCardWords: Set<string> = new Set();

  // Classroom Words Pagination
  classroomWordsPage: number = 1;
  readonly classroomWordsPageSize: number = 9;

  // Create Modal
  showCreateModal: boolean = false;
  newClassName: string = '';
  newClassDesc: string = '';
  newClassLevel: string = 'B2';
  isCreatingClass = signal<boolean>(false);

  // Add Words Modal State (3 Nguồn: Sổ tay, AI, Nhập tay)
  showAddWordsModal: boolean = false;
  addWordsTab: 'notebook' | 'extractor' | 'manual' = 'notebook';
  isAddingWords = signal<boolean>(false);

  // Source 1: Sổ tay cá nhân
  savedWords = this.studyService.savedWords;
  notebookSearchQuery: string = '';
  selectedNotebookWordIds: Set<string> = new Set();

  // Source 2: Trích xuất AI
  extractInputText: string = '';
  extractTargetCount: number = 10;
  extractTargetLevel: string = 'B2';
  isExtracting = signal<boolean>(false);
  extractedWords: ExtractedWordItem[] = [];
  selectedExtractedIndices: Set<number> = new Set();

  // Source 3: Nhập tay thủ công
  manualWord: string = '';
  manualIpa: string = '';
  manualPartOfSpeech: string = 'noun';
  manualVietnamese: string = '';
  manualExampleEn: string = '';
  manualExampleVi: string = '';
  stagedManualWords: ClassroomWordItem[] = [];

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const code = params.get('code');
      if (code) {
        this.activeCode = code.toUpperCase();
        this.loadClassroomDetail(this.activeCode);
      } else {
        this.activeCode = null;
        this.loadError.set(null);
        this.loadMyClassrooms();
      }
    });
  }

  loadMyClassrooms() {
    this.classroomService.getMyClassrooms().subscribe();
  }

  loadClassroomDetail(code: string) {
    this.isLoadingDetail.set(true);
    this.loadError.set(null);
    this.classroomWordsPage = 1;
    this.activeTab = 'words';

    this.classroomService.getClassroomByCode(code).subscribe({
      next: (detail) => {
        this.isLoadingDetail.set(false);
        this.classroomService.getLeaderboard(code).subscribe();
        this.loadProgressDashboard(code);
      },
      error: (err) => {
        this.isLoadingDetail.set(false);
        const msg = err?.error?.message || err?.message || 'Không tìm thấy phòng học hoặc mã phòng không hợp lệ: ' + code;
        this.loadError.set(msg);
      }
    });
  }

  switchTab(tab: 'words' | 'leaderboard' | 'progress') {
    this.activeTab = tab;
    const code = this.activeCode;
    if (!code) return;
    if (tab === 'leaderboard') {
      this.classroomService.getLeaderboard(code).subscribe();
    } else if (tab === 'progress') {
      this.loadProgressDashboard(code);
    }
  }

  loadProgressDashboard(code: string) {
    this.isLoadingProgress.set(true);
    this.classroomService.getProgressDashboard(code).subscribe({
      next: () => this.isLoadingProgress.set(false),
      error: () => this.isLoadingProgress.set(false)
    });
  }

  isOwnerOrAdmin(): boolean {
    const cls = this.activeClassroom();
    if (!cls) return false;
    if (cls.isOwner) return true;
    const cur = this.api.currentUser();
    if (cur?.role === 'ADMIN') return true;
    if (cur?.userId && cls.ownerId && cur.userId.toLowerCase() === cls.ownerId.toLowerCase()) return true;
    if (cur?.id && cls.ownerId && cur.id.toLowerCase() === cls.ownerId.toLowerCase()) return true;
    return false;
  }

  viewClassroom(code: string) {
    this.router.navigate(['/classrooms', code]);
  }

  backToHub() {
    this.activeCode = null;
    this.loadError.set(null);
    this.router.navigate(['/classrooms']);
  }

  joinByCode() {
    const code = this.joinCodeInput.trim().toUpperCase();
    if (!code) return;

    this.classroomService.joinClassroom(code).subscribe({
      next: (cls) => {
        this.joinCodeInput = '';
        this.router.navigate(['/classrooms', cls.code]);
      }
    });
  }

  copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.toast.success(`Đã sao chép mã phòng "${code}" vào bộ nhớ tạm!`, 'Sao chép thành công');
    });
  }

  playAudio(word: string) {
    this.studyService.speakWord(word);
  }

  cloneToNotebook() {
    const cls = this.activeClassroom();
    if (!cls) return;
    this.isCloning.set(true);

    this.classroomService.cloneToNotebook(cls.code).subscribe({
      next: (res) => {
        this.isCloning.set(false);
        this.activeClassroom.update(c => c ? { ...c, clonedToNotebook: true } : null);
      },
      error: () => {
        this.isCloning.set(false);
      }
    });
  }

  // Quiz Modal Logic
  startClassQuiz() {
    const cls = this.activeClassroom();
    if (!cls || !cls.words || cls.words.length === 0) {
      this.toast.error('Lớp học này chưa có từ vựng để làm bài thi.', 'Chưa có từ');
      return;
    }

    const words = cls.words;
    this.quizQuestions = words.map((w, idx) => {
      const otherMeanings = words.filter(ow => ow.word !== w.word).map(ow => ow.vietnamese);
      const distractors = this.shuffleArray(otherMeanings).slice(0, 3);
      while (distractors.length < 3) {
        distractors.push('Nghĩa học thuật khác liên quan');
      }
      const options = this.shuffleArray([w.vietnamese, ...distractors]);

      return {
        id: idx + 1,
        word: w.word,
        question: `Nghĩa tiếng Việt chuẩn xác nhất của từ vựng "${w.word}" (${w.ipa || ''}) là:`,
        options,
        correctAnswer: w.vietnamese
      };
    });

    this.currentQuizIdx = 0;
    this.quizFinished = false;
    this.finalQuizScore = 0;
    this.timeSpent = 0;
    this.showQuizModal = true;

    // Start timer
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timeSpent++;
    }, 1000);
  }

  closeQuizModal() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.showQuizModal = false;
    this.activeTab = 'leaderboard';
    const cls = this.activeClassroom();
    if (cls) {
      this.classroomService.getLeaderboard(cls.code).subscribe();
    }
  }

  answeredQuizCount(): number {
    return this.quizQuestions.filter(q => q.userAnswer != null).length;
  }

  selectQuizOpt(opt: string) {
    if (this.quizFinished) return;
    this.quizQuestions[this.currentQuizIdx].userAnswer = opt;
  }

  prevQuizIdx() {
    if (this.currentQuizIdx > 0) this.currentQuizIdx--;
  }

  nextQuizIdx() {
    if (this.currentQuizIdx < this.quizQuestions.length - 1) this.currentQuizIdx++;
  }

  submitClassQuiz() {
    const cls = this.activeClassroom();
    if (!cls) return;
    if (this.timerInterval) clearInterval(this.timerInterval);

    let score = 0;
    this.quizQuestions.forEach(q => {
      q.isCorrect = q.userAnswer === q.correctAnswer;
      if (q.isCorrect) score++;
    });
    this.finalQuizScore = score;
    this.quizFinished = true;

    this.isSubmittingQuiz.set(true);
    this.classroomService.submitQuizAttempt(cls.code, {
      score,
      totalQuestions: this.quizQuestions.length,
      timeSpentSeconds: this.timeSpent
    }).subscribe({
      next: () => {
        this.isSubmittingQuiz.set(false);
      },
      error: () => {
        this.isSubmittingQuiz.set(false);
      }
    });
  }

  // Create Modal
  openCreateModal() {
    this.newClassName = '';
    this.newClassDesc = '';
    this.showCreateModal = true;
  }

  submitCreateHubClassroom() {
    if (!this.newClassName.trim()) return;
    this.isCreatingClass.set(true);

    this.classroomService.createClassroom({
      name: this.newClassName.trim(),
      description: this.newClassDesc.trim(),
      targetLevel: this.newClassLevel,
      words: []
    }).subscribe({
      next: (created) => {
        this.isCreatingClass.set(false);
        this.showCreateModal = false;
        this.toast.success(`Đã tạo phòng học thành công! Mã lớp: ${created.code}`, 'Tạo phòng thành công');
        this.router.navigate(['/classrooms', created.code]);
      },
      error: () => {
        this.isCreatingClass.set(false);
      }
    });
  }

  // ==========================================
  // Classroom Words Pagination
  // ==========================================
  pagedClassroomWords(): ClassroomWordItem[] {
    const list = this.activeClassroom()?.words || [];
    const start = (this.classroomWordsPage - 1) * this.classroomWordsPageSize;
    return list.slice(start, start + this.classroomWordsPageSize);
  }

  classroomTotalPages(): number {
    const list = this.activeClassroom()?.words || [];
    if (list.length === 0) return 1;
    return Math.max(1, Math.ceil(list.length / this.classroomWordsPageSize));
  }

  getClassroomEndIndex(): number {
    const list = this.activeClassroom()?.words || [];
    return Math.min(this.classroomWordsPage * this.classroomWordsPageSize, list.length);
  }

  goToClassroomPage(p: number) {
    if (p >= 1 && p <= this.classroomTotalPages()) {
      this.classroomWordsPage = p;
    }
  }

  prevClassroomPage() {
    if (this.classroomWordsPage > 1) {
      this.classroomWordsPage--;
    }
  }

  nextClassroomPage() {
    if (this.classroomWordsPage < this.classroomTotalPages()) {
      this.classroomWordsPage++;
    }
  }

  getClassroomPageList(): number[] {
    const total = this.classroomTotalPages();
    return Array.from({ length: Math.max(1, total) }, (_, i) => i + 1);
  }

  // ==========================================
  // Flashcard Methods
  // ==========================================
  startFlashcards() {
    const cls = this.activeClassroom();
    if (!cls || !cls.words || cls.words.length === 0) {
      this.toast.error('Lớp học chưa có từ vựng nào để luyện tập.', 'Không có từ');
      return;
    }
    this.flashcards = [...cls.words];
    this.currentCardIdx = 0;
    this.isCardFlipped = false;
    this.flashcardFinished = false;
    this.masteredCardWords.clear();
    this.showFlashcardModal = true;
  }

  currentCard(): ClassroomWordItem | undefined {
    return this.flashcards[this.currentCardIdx];
  }

  flipCard() {
    this.isCardFlipped = !this.isCardFlipped;
  }

  prevFlashcard() {
    if (this.currentCardIdx > 0) {
      this.currentCardIdx--;
      this.isCardFlipped = false;
    }
  }

  nextFlashcard() {
    if (this.currentCardIdx < this.flashcards.length - 1) {
      this.currentCardIdx++;
      this.isCardFlipped = false;
    }
  }

  finishFlashcards() {
    this.flashcardFinished = true;
    this.toast.success(`Chúc mừng! Bạn đã hoàn thành ôn tập ${this.flashcards.length} thẻ Flashcard!`, 'Hoàn thành Flashcard');
    this.syncFlashcardProgress();
  }

  resetFlashcards() {
    this.currentCardIdx = 0;
    this.isCardFlipped = false;
    this.flashcardFinished = false;
    this.masteredCardWords.clear();
  }

  shuffleFlashcards() {
    const arr = [...this.flashcards];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    this.flashcards = arr;
    this.currentCardIdx = 0;
    this.isCardFlipped = false;
    this.toast.info('Đã xáo trộn ngẫu nhiên thứ tự thẻ Flashcard!', 'Xáo thẻ');
  }

  markCardStatus(mastered: boolean) {
    const card = this.currentCard();
    if (card) {
      if (mastered) {
        this.masteredCardWords.add(card.word);
      } else {
        this.masteredCardWords.delete(card.word);
      }
    }
    if (this.currentCardIdx < this.flashcards.length - 1) {
      this.nextFlashcard();
    } else {
      this.finishFlashcards();
    }
  }

  closeFlashcardModal() {
    if (this.masteredCardWords.size > 0 || this.flashcardFinished) {
      this.syncFlashcardProgress();
    }
    this.showFlashcardModal = false;
  }

  private syncFlashcardProgress() {
    const cls = this.activeClassroom();
    if (!cls || this.flashcards.length === 0) return;

    const mastered = Array.from(this.masteredCardWords);
    const unmastered = this.flashcards
      .map(f => f.word)
      .filter(w => !this.masteredCardWords.has(w));

    this.classroomService.saveFlashcardProgress(cls.code, {
      masteredCount: this.masteredCardWords.size,
      totalWords: this.flashcards.length,
      masteredWords: mastered,
      unmasteredWords: unmastered
    }).subscribe({
      next: () => {
        if (this.activeTab === 'progress') {
          this.loadProgressDashboard(cls.code);
        }
      }
    });
  }

  // ==========================================
  // Add Words Modal Methods (3 Sources)
  // ==========================================
  openAddWordsModal() {
    this.addWordsTab = 'notebook';
    this.selectedNotebookWordIds.clear();
    this.selectedExtractedIndices.clear();
    this.extractedWords = [];
    this.extractInputText = '';
    this.notebookSearchQuery = '';
    this.stagedManualWords = [];
    this.resetManualForm();
    this.studyService.refreshSavedWords();
    this.showAddWordsModal = true;
  }

  closeAddWordsModal() {
    this.showAddWordsModal = false;
  }

  // Source 1: Sổ tay cá nhân (SM-2)
  filteredNotebookWords(): SavedWordItem[] {
    const q = this.notebookSearchQuery.trim().toLowerCase();
    const list = this.savedWords();
    if (!q) return list;
    return list.filter(w =>
      (w.word && w.word.toLowerCase().includes(q)) ||
      (w.vietnamese && w.vietnamese.toLowerCase().includes(q))
    );
  }

  isWordInClassroom(wordText: string): boolean {
    const cls = this.activeClassroom();
    if (!cls || !cls.words) return false;
    const lower = (wordText || '').trim().toLowerCase();
    return cls.words.some(w => (w.word || '').trim().toLowerCase() === lower);
  }

  toggleSelectNotebookWord(id: string) {
    if (this.selectedNotebookWordIds.has(id)) {
      this.selectedNotebookWordIds.delete(id);
    } else {
      this.selectedNotebookWordIds.add(id);
    }
  }

  toggleSelectAllNotebookWords() {
    const available = this.filteredNotebookWords().filter(w => !this.isWordInClassroom(w.word));
    const allSelected = available.length > 0 && available.every(w => this.selectedNotebookWordIds.has(w.id));
    if (allSelected) {
      available.forEach(w => this.selectedNotebookWordIds.delete(w.id));
    } else {
      available.forEach(w => this.selectedNotebookWordIds.add(w.id));
    }
  }

  isAllNotebookSelected(): boolean {
    const available = this.filteredNotebookWords().filter(w => !this.isWordInClassroom(w.word));
    return available.length > 0 && available.every(w => this.selectedNotebookWordIds.has(w.id));
  }

  submitAddFromNotebook() {
    const cls = this.activeClassroom();
    if (!cls || this.selectedNotebookWordIds.size === 0) return;

    const selectedWords: ClassroomWordItem[] = this.savedWords()
      .filter(w => this.selectedNotebookWordIds.has(w.id))
      .map(w => ({
        word: w.word,
        ipa: w.ipa || '',
        vietnamese: w.vietnamese || '',
        partOfSpeech: w.partOfSpeech || 'noun',
        exampleEn: w.exampleEn || '',
        exampleVi: w.exampleVi || ''
      }));

    this.isAddingWords.set(true);
    this.classroomService.addWordsToClassroom(cls.code, selectedWords).subscribe({
      next: (updated) => {
        this.isAddingWords.set(false);
        this.showAddWordsModal = false;
        this.selectedNotebookWordIds.clear();
        this.loadProgressDashboard(cls.code);
      },
      error: () => this.isAddingWords.set(false)
    });
  }

  // Source 2: Trích xuất AI
  submitExtractVocab() {
    const text = this.extractInputText.trim();
    if (!text) {
      this.toast.error('Vui lòng nhập văn bản cần trích xuất từ vựng.', 'Thiếu văn bản');
      return;
    }

    this.isExtracting.set(true);
    this.classroomService.extractVocabFromText(text, this.extractTargetCount, this.extractTargetLevel).subscribe({
      next: (res) => {
        this.isExtracting.set(false);
        this.extractedWords = (res.words || []).map(w => ({
          word: w.word,
          ipa: w.ipa || '',
          vietnamese: w.vietnamese || '',
          partOfSpeech: w.partOfSpeech || 'noun',
          cefrLevel: w.cefrLevel || this.extractTargetLevel,
          contextSentenceEn: w.contextSentenceEn || '',
          contextSentenceVi: w.contextSentenceVi || ''
        }));
        this.selectedExtractedIndices.clear();
        this.extractedWords.forEach((_, idx) => this.selectedExtractedIndices.add(idx));
      },
      error: () => this.isExtracting.set(false)
    });
  }

  toggleSelectExtracted(idx: number) {
    if (this.selectedExtractedIndices.has(idx)) {
      this.selectedExtractedIndices.delete(idx);
    } else {
      this.selectedExtractedIndices.add(idx);
    }
  }

  toggleSelectAllExtracted() {
    if (this.selectedExtractedIndices.size === this.extractedWords.length) {
      this.selectedExtractedIndices.clear();
    } else {
      this.extractedWords.forEach((_, idx) => this.selectedExtractedIndices.add(idx));
    }
  }

  submitAddFromExtractor() {
    const cls = this.activeClassroom();
    if (!cls || this.selectedExtractedIndices.size === 0) return;

    const wordsToAdd: ClassroomWordItem[] = this.extractedWords
      .filter((_, idx) => this.selectedExtractedIndices.has(idx))
      .map(w => ({
        word: w.word,
        ipa: w.ipa || '',
        vietnamese: w.vietnamese || '',
        partOfSpeech: w.partOfSpeech || 'noun',
        exampleEn: w.contextSentenceEn || '',
        exampleVi: w.contextSentenceVi || ''
      }));

    this.isAddingWords.set(true);
    this.classroomService.addWordsToClassroom(cls.code, wordsToAdd).subscribe({
      next: (updated) => {
        this.isAddingWords.set(false);
        this.showAddWordsModal = false;
        this.extractedWords = [];
        this.selectedExtractedIndices.clear();
        this.loadProgressDashboard(cls.code);
      },
      error: () => this.isAddingWords.set(false)
    });
  }

  // Source 3: Nhập tay thủ công
  addManualWordToStage() {
    const word = this.manualWord.trim();
    const vi = this.manualVietnamese.trim();
    if (!word || !vi) {
      this.toast.error('Vui lòng nhập Từ vựng và Nghĩa tiếng Việt.', 'Thiếu thông tin');
      return;
    }

    this.stagedManualWords.push({
      word,
      ipa: this.manualIpa.trim(),
      partOfSpeech: this.manualPartOfSpeech || 'noun',
      vietnamese: vi,
      exampleEn: this.manualExampleEn.trim(),
      exampleVi: this.manualExampleVi.trim()
    });

    this.toast.success(`Đã thêm "${word}" vào danh sách chờ.`, 'Đã thêm từ');
    this.resetManualForm();
  }

  removeStagedManualWord(idx: number) {
    this.stagedManualWords.splice(idx, 1);
  }

  resetManualForm() {
    this.manualWord = '';
    this.manualIpa = '';
    this.manualPartOfSpeech = 'noun';
    this.manualVietnamese = '';
    this.manualExampleEn = '';
    this.manualExampleVi = '';
  }

  submitAddFromManual() {
    const cls = this.activeClassroom();
    if (!cls || this.stagedManualWords.length === 0) return;

    this.isAddingWords.set(true);
    this.classroomService.addWordsToClassroom(cls.code, this.stagedManualWords).subscribe({
      next: (updated) => {
        this.isAddingWords.set(false);
        this.showAddWordsModal = false;
        this.stagedManualWords = [];
        this.loadProgressDashboard(cls.code);
      },
      error: () => this.isAddingWords.set(false)
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
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

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-page-shell',
  standalone: true,
  imports: [CommonModule, IconComponent],
  host: {
    class: 'w-full block'
  },
  template: `
    <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-20 font-sans select-none animate-fade-in">
      
      <!-- =========================================================================
           1. THANH TIÊU ĐỀ KHỐI TRANG CHUẨN (PAGE HEADER BAR)
           ========================================================================= -->
      <header class="w-full bg-white rounded-3xl border border-[#E5DED3] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        
        <!-- Cụm Icon & Tiêu Đề Trái -->
        <div class="flex items-center gap-3.5">
          <!-- Icon Khối 48x48 Màu Nâu Chủ Đạo -->
          <div class="w-12 h-12 rounded-2xl bg-[#7D6853] text-white flex items-center justify-center shrink-0 shadow-xs">
            <app-icon [name]="icon" [size]="22" svgClass="text-white"></app-icon>
          </div>

          <!-- Thông Tin Tiêu Đề -->
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <!-- Badge Nhãn Danh Mục -->
              <span *ngIf="badgeText" class="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#7D6853] bg-[#FAF8F5] px-2.5 py-0.5 rounded-md border border-[#E5DED3]">
                {{ badgeText }}
              </span>

              <!-- Badge Trạng Thái Xanh (Nếu có) -->
              <span *ngIf="statusText" class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {{ statusText }}
              </span>
            </div>

            <!-- Tiêu Đề Chính Của Trang -->
            <h1 class="font-serif font-bold text-xl sm:text-2xl text-[#2D2823] mt-0.5 tracking-tight">
              {{ title }}
            </h1>

            <!-- Phụ Đề / Mô Tả Ngắn -->
            <p *ngIf="subtitle" class="text-xs text-[#5C5249] mt-0.5 font-sans leading-relaxed">
              {{ subtitle }}
            </p>
          </div>
        </div>

        <!-- Cụm Thao Tác Bên Phải (Tabs, Nút Hành Động...) -->
        <div class="flex items-center gap-2.5">
          <ng-content select="[header-actions]"></ng-content>
        </div>
      </header>

      <!-- =========================================================================
           2. VÙNG NỘI DUNG (WORKSPACE)
           ========================================================================= -->
      
      <!-- Chế độ 1: Bố cục 2 cột chuẩn 12-grid (Trọng tâm 7/12 & Đồng hành 5/12) -->
      <div *ngIf="twoColumns" class="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        <!-- Cột Trái (Mặc định 7/12): Vùng Thao Tác Trọng Tâm -->
        <div [class]="leftColSpan">
          <ng-content select="[left-content]"></ng-content>
        </div>

        <!-- Cột Phải (Mặc định 5/12): Các Thẻ Thông Tin Đồng Hành -->
        <div [class]="rightColSpan">
          <ng-content select="[right-content]"></ng-content>
        </div>

      </div>

      <!-- Chế độ 2: Bố cục Toàn Chiều Rộng (Full Width) -->
      <div *ngIf="!twoColumns" class="w-full">
        <ng-content></ng-content>
      </div>

    </div>
  `
})
export class PageShellComponent {
  @Input() icon = 'sparkles';
  @Input() badgeText = '';
  @Input() statusText?: string;
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() twoColumns = true;
  @Input() leftColSpan = 'lg:col-span-7 min-w-0 w-full';
  @Input() rightColSpan = 'lg:col-span-5 min-w-0 w-full space-y-4';
}

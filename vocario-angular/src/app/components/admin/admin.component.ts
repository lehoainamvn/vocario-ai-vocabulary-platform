import { Component, OnInit, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { QuizStageService, QuizStage } from '../../services/quiz-stage.service';
import { UserStudyService, ContextWord } from '../../services/user-study.service';
import { AdminStats, AdminWordItem, AdminWordPageResponse, AdminWordRequest, AdminBulkWordResult, AdminUserItem, AdminUserPageResponse, AdminUserOverviewStats, AdminUserAnalytics, AdminUserUpdateRequest, AdminVisionOverviewStats, AdminCaptureItem, AdminCapturePageResponse, AdminPromoteWordRequest, AdminSystemSettings, DetectedObjectBox, SpeechAnalyticsResponse, HardestWordItem, SpeechLogItem, ClassroomOverviewStats, AdminClassroomItem, AdminClassroomPageResponse, AdminClassroomDetailResponse, ClassroomWordItem, MemberProgressItem, ClassroomLeaderboardItem } from '../../models/vocario.models';
import { Certificate, CertificateType } from '../../models/certificate.model';
import { IconComponent } from '../common/icon.component';
import { CertificateModalComponent } from '../user/certificate-modal.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent, FormsModule, CertificateModalComponent],
  host: {
    class: 'w-full block'
  },
  template: `
    <!-- =========================================================================
         BỐ CỤC CHUẨN CỔNG QUẢN TRỊ ADMIN (LEFT SIDEBAR CỐ ĐỊNH + RIGHT WORKSPACE)
         Tuân thủ nghiêm ngặt Vocario Design System & Không sử dụng emoji
         ========================================================================= -->
    <div class="w-full min-h-screen flex bg-[#F8F6F1] font-sans select-none">
      
      <!-- =========================================================================
           1. THANH ĐIỀU HƯỚNG BÊN TRÁI (LEFT SIDEBAR DÀNH RIÊNG CHO ADMIN)
           ========================================================================= -->
      <aside class="w-60 min-h-screen bg-[#FAF8F5] border-r border-[#E5DED3] flex flex-col justify-between shrink-0 fixed left-0 top-0 bottom-0 z-30 select-none">
        <!-- Phần trên Sidebar: Logo thương hiệu & 2 Nhóm menu quản trị -->
        <div class="p-4 flex flex-col">
          
          <!-- Brand Logo Header -->
          <div class="flex items-center gap-2.5 pb-4 mb-2 border-b border-[#E5DED3]">
            <div class="w-7 h-7 rounded-[4px] bg-[#2D2823] text-white flex items-center justify-center font-serif font-semibold text-xs shadow-xs shrink-0">
              V
            </div>
            <div>
              <span class="font-serif font-semibold text-sm text-[#2D2823] tracking-tight block leading-tight">
                Vocario
              </span>
              <span class="text-[9px] text-[#7D6853] font-semibold tracking-wider block mt-0.5">
                Cổng quản trị
              </span>
            </div>
          </div>

          <!-- Section 1: Giám sát vận hành -->
          <p class="text-[10px] font-semibold tracking-wider text-[#8C827A] px-2 mb-1.5">
            Giám sát vận hành
          </p>

          <nav class="space-y-1 mb-5">
            <!-- 1. Tổng quan & KPI -->
            <button 
              type="button"
              (click)="selectTab('dashboard')"
              [class.bg-[#EFEAE1]]="activeTab === 'dashboard'"
              [class.text-[#2D2823]]="activeTab === 'dashboard'"
              [class.font-semibold]="activeTab === 'dashboard'"
              [class.border]="activeTab === 'dashboard'"
              [class.border-[#E5DED3]/80]="activeTab === 'dashboard'"
              [class.text-[#5C5249]]="activeTab !== 'dashboard'"
              [class.hover:bg-[#F2ECE1]/60]="activeTab !== 'dashboard'"
              class="w-full flex items-center justify-between px-2.5 py-2 rounded-[4px] text-xs cursor-pointer transition-all border-0 text-left"
            >
              <div class="flex items-center gap-2">
                <app-icon name="bar-chart" [size]="15" [svgClass]="activeTab === 'dashboard' ? 'text-[#7D6853]' : 'text-[#8C827A]'"></app-icon>
                <span>Tổng quan & KPI</span>
              </div>
            </button>

            <!-- 2. Kho Từ Điển CEFR -->
            <button 
              type="button"
              (click)="selectTab('vocabulary')"
              [class.bg-[#EFEAE1]]="activeTab === 'vocabulary'"
              [class.text-[#2D2823]]="activeTab === 'vocabulary'"
              [class.font-semibold]="activeTab === 'vocabulary'"
              [class.border]="activeTab === 'vocabulary'"
              [class.border-[#E5DED3]/80]="activeTab === 'vocabulary'"
              [class.text-[#5C5249]]="activeTab !== 'vocabulary'"
              [class.hover:bg-[#F2ECE1]/60]="activeTab !== 'vocabulary'"
              class="w-full flex items-center justify-between px-2.5 py-2 rounded-[4px] text-xs cursor-pointer transition-all border-0 text-left"
            >
              <div class="flex items-center gap-2">
                <app-icon name="book-open" [size]="15" [svgClass]="activeTab === 'vocabulary' ? 'text-[#7D6853]' : 'text-[#8C827A]'"></app-icon>
                <span>Kho từ điển CEFR</span>
              </div>
              <span 
                class="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-[2px] text-[#7D6853] bg-white border border-[#E5DED3]"
              >
                {{ wordsTotalElements() || 18 }}
              </span>
            </button>

            <!-- 3. Quản Lý Học Viên -->
            <button 
              type="button"
              (click)="selectTab('users')"
              [class.bg-[#EFEAE1]]="activeTab === 'users'"
              [class.text-[#2D2823]]="activeTab === 'users'"
              [class.font-semibold]="activeTab === 'users'"
              [class.border]="activeTab === 'users'"
              [class.border-[#E5DED3]/80]="activeTab === 'users'"
              [class.text-[#5C5249]]="activeTab !== 'users'"
              [class.hover:bg-[#F2ECE1]/60]="activeTab !== 'users'"
              class="w-full flex items-center justify-between px-2.5 py-2 rounded-[4px] text-xs cursor-pointer transition-all border-0 text-left"
            >
              <div class="flex items-center gap-2">
                <app-icon name="users" [size]="15" [svgClass]="activeTab === 'users' ? 'text-[#7D6853]' : 'text-[#8C827A]'"></app-icon>
                <span>Quản lý học viên</span>
              </div>
            </button>

            <!-- 4. Quản Lý Đấu Trường Thị Giác -->
            <button 
              type="button"
              (click)="selectTab('arenas')"
              [class.bg-[#EFEAE1]]="activeTab === 'arenas'"
              [class.text-[#2D2823]]="activeTab === 'arenas'"
              [class.font-semibold]="activeTab === 'arenas'"
              [class.border]="activeTab === 'arenas'"
              [class.border-[#E5DED3]/80]="activeTab === 'arenas'"
              [class.text-[#5C5249]]="activeTab !== 'arenas'"
              [class.hover:bg-[#F2ECE1]/60]="activeTab !== 'arenas'"
              class="w-full flex items-center justify-between px-2.5 py-2 rounded-[4px] text-xs cursor-pointer transition-all border-0 text-left"
            >
              <div class="flex items-center gap-2">
                <app-icon name="target" [size]="15" [svgClass]="activeTab === 'arenas' ? 'text-[#7D6853]' : 'text-[#8C827A]'"></app-icon>
                <span>Quản lý đấu trường</span>
              </div>
              <span 
                class="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-[2px] text-[#7D6853] bg-white border border-[#E5DED3]"
              >
                {{ quizStageService.adminStages().length }}
              </span>
            </button>

            <!-- 5. Quản Lý Lớp Học & Bộ Từ Chia Sẻ -->
            <button 
              type="button"
              (click)="selectTab('classrooms')"
              [class.bg-[#EFEAE1]]="activeTab === 'classrooms'"
              [class.text-[#2D2823]]="activeTab === 'classrooms'"
              [class.font-semibold]="activeTab === 'classrooms'"
              [class.border]="activeTab === 'classrooms'"
              [class.border-[#E5DED3]/80]="activeTab === 'classrooms'"
              [class.text-[#5C5249]]="activeTab !== 'classrooms'"
              [class.hover:bg-[#F2ECE1]/60]="activeTab !== 'classrooms'"
              class="w-full flex items-center justify-between px-2.5 py-2 rounded-[4px] text-xs cursor-pointer transition-all border-0 text-left"
            >
              <div class="flex items-center gap-2">
                <app-icon name="layers" [size]="15" [svgClass]="activeTab === 'classrooms' ? 'text-[#7D6853]' : 'text-[#8C827A]'"></app-icon>
                <span>Quản lý lớp học</span>
              </div>
              <span 
                class="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-[2px] text-[#7D6853] bg-white border border-[#E5DED3]"
              >
                {{ classroomTotalElements() || 0 }}
              </span>
            </button>
          </nav>

          <!-- Section 2: Hệ thống AI & thuật toán -->
          <p class="text-[10px] font-semibold tracking-wider text-[#8C827A] px-2 mb-1.5">
            Hệ thống AI & thuật toán
          </p>

          <nav class="space-y-1">
            <!-- 4. Kiểm Duyệt AI Vision -->
            <button 
              type="button"
              (click)="selectTab('vision')"
              [class.bg-[#EFEAE1]]="activeTab === 'vision'"
              [class.text-[#2D2823]]="activeTab === 'vision'"
              [class.font-semibold]="activeTab === 'vision'"
              [class.border]="activeTab === 'vision'"
              [class.border-[#E5DED3]/80]="activeTab === 'vision'"
              [class.text-[#5C5249]]="activeTab !== 'vision'"
              [class.hover:bg-[#F2ECE1]/60]="activeTab !== 'vision'"
              class="w-full flex items-center justify-between px-2.5 py-2 rounded-[4px] text-xs cursor-pointer transition-all border-0 text-left"
            >
              <div class="flex items-center gap-2">
                <app-icon name="camera" [size]="15" [svgClass]="activeTab === 'vision' ? 'text-[#7D6853]' : 'text-[#8C827A]'"></app-icon>
                <span>Kiểm duyệt AI Vision</span>
              </div>
            </button>

            <!-- 5. Cấu Hình Chu Kỳ SM-2 -->
            <button 
              type="button"
              (click)="selectTab('settings')"
              [class.bg-[#EFEAE1]]="activeTab === 'settings'"
              [class.text-[#2D2823]]="activeTab === 'settings'"
              [class.font-semibold]="activeTab === 'settings'"
              [class.border]="activeTab === 'settings'"
              [class.border-[#E5DED3]/80]="activeTab === 'settings'"
              [class.text-[#5C5249]]="activeTab !== 'settings'"
              [class.hover:bg-[#F2ECE1]/60]="activeTab !== 'settings'"
              class="w-full flex items-center justify-between px-2.5 py-2 rounded-[4px] text-xs cursor-pointer transition-all border-0 text-left"
            >
              <div class="flex items-center gap-2">
                <app-icon name="settings" [size]="15" [svgClass]="activeTab === 'settings' ? 'text-[#7D6853]' : 'text-[#8C827A]'"></app-icon>
                <span>Cấu hình chu kỳ SM-2</span>
              </div>
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            </button>

            <!-- 6. Phân Tích Phát Âm AI -->
            <button 
              type="button"
              (click)="selectTab('speech')"
              [class.bg-[#EFEAE1]]="activeTab === 'speech'"
              [class.text-[#2D2823]]="activeTab === 'speech'"
              [class.font-semibold]="activeTab === 'speech'"
              [class.border]="activeTab === 'speech'"
              [class.border-[#E5DED3]/80]="activeTab === 'speech'"
              [class.text-[#5C5249]]="activeTab !== 'speech'"
              [class.hover:bg-[#F2ECE1]/60]="activeTab !== 'speech'"
              class="w-full flex items-center justify-between px-2.5 py-2 rounded-[4px] text-xs cursor-pointer transition-all border-0 text-left"
            >
              <div class="flex items-center gap-2">
                <app-icon name="mic" [size]="15" [svgClass]="activeTab === 'speech' ? 'text-[#7D6853]' : 'text-[#8C827A]'"></app-icon>
                <span>Phân tích phát âm AI</span>
              </div>
              <span 
                class="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-[2px] text-[#7D6853] bg-white border border-[#E5DED3]"
              >
                {{ speechAnalytics()?.totalSessions || 15 }}
              </span>
            </button>

            <!-- 7. Khảo Thí & Chứng Chỉ CEFR -->
            <button 
              type="button"
              (click)="selectTab('certificates')"
              [class.bg-[#EFEAE1]]="activeTab === 'certificates'"
              [class.text-[#2D2823]]="activeTab === 'certificates'"
              [class.font-semibold]="activeTab === 'certificates'"
              [class.border]="activeTab === 'certificates'"
              [class.border-[#E5DED3]/80]="activeTab === 'certificates'"
              [class.text-[#5C5249]]="activeTab !== 'certificates'"
              [class.hover:bg-[#F2ECE1]/60]="activeTab !== 'certificates'"
              class="w-full flex items-center justify-between px-2.5 py-2 rounded-[4px] text-xs cursor-pointer transition-all border-0 text-left"
            >
              <div class="flex items-center gap-2">
                <app-icon name="award" [size]="15" [svgClass]="activeTab === 'certificates' ? 'text-[#7D6853]' : 'text-[#8C827A]'"></app-icon>
                <span>Khảo thí & Chứng chỉ</span>
              </div>
              <span 
                class="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-[2px] text-[#7D6853] bg-white border border-[#E5DED3]"
              >
                {{ adminCertificates().length }}
              </span>
            </button>
          </nav>

        </div>

        <!-- Phần dưới Sidebar -->
        <div class="p-4 border-t border-[#E5DED3]">
          <a 
            routerLink="/home"
            class="flex items-center gap-2 text-xs font-medium text-[#5C5249] hover:text-[#2D2823] no-underline transition-colors"
            title="Trở lại giao diện Học Viên để học từ và kiểm thử"
          >
            <span class="text-sm">←</span>
            <span>Góc nhìn học viên</span>
          </a>
        </div>

      </aside>

      <!-- =========================================================================
           2. VÙNG NỘI DUNG CHÍNH (RIGHT WORKSPACE AREA)
           ========================================================================= -->
      <main class="flex-1 ml-60 min-h-screen flex flex-col bg-[#F8F6F1] animate-fade-in">
        
        <!-- 2.1 TOP HEADER TRÊN CANVAS NỀN KEM -->
        <header class="w-full max-w-7xl mx-auto px-5 sm:px-6 pt-6 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <!-- Breadcrumb Navigation -->
            <div class="flex items-center gap-1.5 text-xs text-[#8C827A]">
              <span>Cổng quản trị</span>
              <span>›</span>
              <span class="text-[#2D2823] font-medium">
                <span *ngIf="activeTab === 'dashboard'">1. Tổng quan & KPI</span>
                <span *ngIf="activeTab === 'vocabulary'">2. Kho từ điển CEFR</span>
                <span *ngIf="activeTab === 'users'">3. Quản lý học viên</span>
                <span *ngIf="activeTab === 'arenas'">4. Quản lý đấu trường</span>
                <span *ngIf="activeTab === 'classrooms'">5. Quản lý lớp học</span>
                <span *ngIf="activeTab === 'vision'">6. Kiểm duyệt AI Vision</span>
                <span *ngIf="activeTab === 'settings'">7. Cấu hình chu kỳ SM-2</span>
                <span *ngIf="activeTab === 'speech'">8. Phân tích phát âm AI</span>
                <span *ngIf="activeTab === 'certificates'">9. Khảo thí & Chứng chỉ CEFR</span>
              </span>
            </div>
            
            <!-- Page Title -->
            <h1 class="font-serif font-semibold text-lg sm:text-xl text-[#221C14] tracking-tight mt-0.5">
              <span *ngIf="activeTab === 'dashboard'">Bảng điều khiển tổng quan & chỉ số KPI</span>
              <span *ngIf="activeTab === 'vocabulary'">Quản lý kho từ điển chuẩn CEFR</span>
              <span *ngIf="activeTab === 'users'">Quản lý học viên & tiến trình SM-2</span>
              <span *ngIf="activeTab === 'arenas'">Quản lý đấu trường thị giác & bối cảnh tuần</span>
              <span *ngIf="activeTab === 'classrooms'">Quản lý lớp học & bộ từ vựng chia sẻ</span>
              <span *ngIf="activeTab === 'vision'">Kiểm duyệt bối cảnh AI Vision</span>
              <span *ngIf="activeTab === 'settings'">Cấu hình tham số thuật toán SM-2</span>
              <span *ngIf="activeTab === 'speech'">Báo cáo & phân tích kỹ năng phát âm AI</span>
              <span *ngIf="activeTab === 'certificates'">Quản lý phát hành chứng chỉ khảo thí CEFR</span>
            </h1>

            <!-- Subtitle -->
            <p *ngIf="activeTab === 'dashboard'" class="text-xs text-[#8C827A] mt-1 font-sans">
              Dữ liệu vận hành học thuật và hiệu suất AI Vision · Cập nhật lúc {{ currentTime() }}
            </p>
            <p *ngIf="activeTab === 'arenas'" class="text-xs text-[#8C827A] mt-1 font-sans">
              Thiết lập bối cảnh thi đấu tuần, quản lý đấu trường chuẩn hóa và định cấu hình tọa độ Bounding Box
            </p>
            <p *ngIf="activeTab === 'classrooms'" class="text-xs text-[#8C827A] mt-1 font-sans">
              Giám sát các phòng học cộng đồng, kiểm duyệt từ vựng nhập tay và theo dõi tiến độ hoàn thành Flashcard
            </p>
            <p *ngIf="activeTab === 'certificates'" class="text-xs text-[#8C827A] mt-1 font-sans">
              Thẩm định thành tích tinh thông từ vựng SM-2 và phê duyệt phát hành chứng chỉ điện tử cho học viên
            </p>
          </div>

          <!-- Top Header Actions -->
          <div class="flex items-center gap-3 self-start md:self-center">
            
            <!-- Trạng thái hệ thống -->
            <span class="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C5249]">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Hệ thống trực tuyến</span>
            </span>

            <!-- Nút Làm Mới Dữ Liệu -->
            <button 
              type="button" 
              (click)="handleRefreshCurrentTab()"
              [disabled]="loading() || wordsLoading() || usersLoading()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-transparent hover:bg-white text-[#2D2823] border border-[#D9D1C7] cursor-pointer transition-all active:scale-95 shadow-2xs disabled:opacity-50"
            >
              <app-icon 
                name="rotate-cw" 
                [size]="13" 
                [svgClass]="(loading() || wordsLoading() || usersLoading()) ? 'animate-spin text-[#7D6853]' : 'text-[#7D6853]'"
              ></app-icon>
              <span>{{ (loading() || wordsLoading() || usersLoading()) ? 'Đang tải...' : 'Làm mới dữ liệu' }}</span>
            </button>

            <!-- Nút Thêm Từ Mới (Chỉ hiển thị khi ở tab Vocabulary) -->
            <button 
              *ngIf="activeTab === 'vocabulary'"
              type="button" 
              (click)="openCreateWordModal()"
              class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] text-xs font-semibold bg-[#7D6853] hover:bg-[#685542] text-white border-0 cursor-pointer transition-all active:scale-95 shadow-xs"
            >
              <app-icon name="plus" [size]="14" svgClass="text-white"></app-icon>
              <span>Thêm từ mới</span>
            </button>

            <!-- Nút Thêm Đấu Trường Mới (Chỉ hiển thị khi ở tab Arenas) -->
            <button 
              *ngIf="activeTab === 'arenas'"
              type="button" 
              (click)="openCreateStageModal()"
              class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] text-xs font-semibold bg-[#7D6853] hover:bg-[#685542] text-white border-0 cursor-pointer transition-all active:scale-95 shadow-xs"
            >
              <app-icon name="plus" [size]="14" svgClass="text-white"></app-icon>
              <span>Thêm đấu trường</span>
            </button>

            <!-- Nút Xuất Báo Cáo (Khi ở tab Dashboard) -->
            <button 
              *ngIf="activeTab === 'dashboard'"
              type="button" 
              (click)="exportSummaryReport()"
              class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] text-xs font-semibold bg-[#7D6853] hover:bg-[#685542] text-white border-0 cursor-pointer transition-all active:scale-95 shadow-xs"
            >
              <app-icon name="download" [size]="13" svgClass="text-white"></app-icon>
              <span>Xuất báo cáo</span>
            </button>

          </div>
        </header>

        <!-- 2.2 NỘI DUNG CHI TIẾT TỪNG PHÂN HỆ -->
        <div class="px-5 sm:px-6 pb-8 space-y-3.5 max-w-7xl mx-auto w-full">
          
          <!-- =========================================================================
               TAB 1: TỔNG QUAN & KPI DASHBOARD (FIGMA SCANDINAVIAN EDITORIAL)
               ========================================================================= -->
          <div *ngIf="activeTab === 'dashboard'" class="space-y-3.5 animate-fade-in">
            
            <!-- 1.1 KHỐI 4 CHỈ SỐ KPI CHÍNH (SINGLE UNIFIED CONTAINER DIVIDE-X - COMPACT & CRISP) -->
            <div class="bg-white rounded-[4px] border border-[#E5DED3] shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E5DED3] overflow-hidden">
              
              <!-- KPI 1: Học viên hoạt động -->
              <div class="p-4 sm:p-4.5 flex flex-col justify-between hover:bg-[#FAF8F5]/40 transition-colors">
                <div>
                  <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Học viên hoạt động</p>
                  <div class="font-serif font-semibold text-xl sm:text-2xl text-[#221C14] mt-1 mb-0.5">
                    {{ stats()?.totalUsers ?? 20 }}
                  </div>
                  <p class="text-[11px] font-medium text-emerald-700">
                    +8.2% so với tuần trước
                  </p>
                </div>
                <div class="mt-2.5 pt-2 border-t border-[#E5DED3]/70 text-[11px] text-[#5C5249]">
                  Trạng thái: 100% hoạt động bình thường
                </div>
              </div>

              <!-- KPI 2: Kho từ vựng thực tế -->
              <div class="p-4 sm:p-4.5 flex flex-col justify-between hover:bg-[#FAF8F5]/40 transition-colors">
                <div>
                  <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Kho từ vựng thực tế</p>
                  <div class="font-serif font-semibold text-xl sm:text-2xl text-[#221C14] mt-1 mb-0.5 whitespace-nowrap flex items-baseline gap-1">
                    <span>{{ stats()?.totalWords ?? 18 }}</span>
                    <span class="text-xs font-normal text-[#746B60] font-sans">mục từ</span>
                  </div>
                  <p class="text-[11px] font-medium text-emerald-700">
                    +3 mục từ mới
                  </p>
                </div>
                <div class="mt-2.5 pt-2 border-t border-[#E5DED3]/70 text-[11px] text-[#5C5249]">
                  Phổ trình độ: A1 Sơ cấp + C1 Tinh anh
                </div>
              </div>

              <!-- KPI 3: Bối cảnh thị giác đã chụp -->
              <div class="p-4 sm:p-4.5 flex flex-col justify-between hover:bg-[#FAF8F5]/40 transition-colors">
                <div>
                  <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Bối cảnh thị giác đã chụp</p>
                  <div class="font-serif font-semibold text-xl sm:text-2xl text-[#221C14] mt-1 mb-0.5 whitespace-nowrap flex items-baseline gap-1">
                    <span>{{ stats()?.totalCaptures ?? 32 }}</span>
                    <span class="text-xs font-normal text-[#746B60] font-sans">không gian</span>
                  </div>
                  <p class="text-[11px] font-medium text-emerald-700">
                    +37% trong 7 ngày
                  </p>
                </div>
                <div class="mt-2.5 pt-2 border-t border-[#E5DED3]/70 text-[11px] text-[#5C5249]">
                  Mô hình: YOLO-World v2 + Qwen-2VL
                </div>
              </div>

              <!-- KPI 4: Tỷ lệ ghi nhớ dài hạn -->
              <div class="p-4 sm:p-4.5 flex flex-col justify-between hover:bg-[#FAF8F5]/40 transition-colors">
                <div>
                  <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Tỷ lệ ghi nhớ dài hạn</p>
                  <div class="font-serif font-semibold text-xl sm:text-2xl text-[#221C14] mt-1 mb-0.5">
                    {{ stats()?.masteryRate ?? 42.9 }}%
                  </div>
                  <p class="text-[11px] font-medium text-emerald-700">
                    +2.0 điểm phần trăm
                  </p>
                </div>
                <div class="mt-2.5 pt-2 border-t border-[#E5DED3]/70 text-[11px] text-[#5C5249]">
                  97 lượt mở đã thuộc vĩnh viễn
                </div>
              </div>

            </div>

            <!-- 1.2 HÀNG 2 CỘT HỌC THUẬT & NHẬT KÝ THỊ GIÁC (COMPACT & CRISP) -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
              
              <!-- Cột Trái (7/12): Phân Bố Từ Vựng Theo Năng Lực CEFR -->
              <div class="lg:col-span-7 w-full bg-white rounded-[4px] border border-[#E5DED3] p-5 shadow-xs space-y-3.5">
                
                <div>
                  <span class="text-[10px] font-semibold tracking-wider text-[#8C827A] block">
                    Dữ liệu học thuật
                  </span>
                  <div class="flex items-baseline justify-between mt-1">
                    <h2 class="font-serif font-semibold text-sm sm:text-base text-[#221C14]">
                      Phân bố từ vựng theo năng lực CEFR
                    </h2>
                    <div class="flex items-baseline gap-1">
                      <span class="font-serif font-semibold text-sm text-[#221C14]">18</span>
                      <span class="text-xs text-[#8C827A] font-sans">mục từ trong kho</span>
                    </div>
                  </div>
                </div>

                <!-- Thanh Phân Bổ Ngang Đa Tầng (Segmented Horizontal Bar - Crisp edges) -->
                <div class="w-full h-6 sm:h-7 rounded-[2px] overflow-hidden flex border border-[#E5DED3] bg-[#FAF8F5]">
                  <div 
                    *ngFor="let seg of cefrBarSegments()"
                    class="h-full flex items-center justify-center text-[10px] font-mono font-medium transition-all duration-500 overflow-hidden px-1"
                    [style.background-color]="seg.bg"
                    [style.color]="seg.textColor"
                    [style.width.%]="seg.percentage"
                    [title]="seg.level + ': ' + seg.percentage + '%'"
                  >
                    <span *ngIf="seg.percentage >= 8">{{ seg.level }}: {{ seg.percentage }}%</span>
                  </div>
                </div>

                <!-- Chú thích CEFR hình vuông -->
                <div class="flex items-center gap-4 sm:gap-5 text-xs text-[#5C5249] pt-0.5">
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-[1px] bg-[#C8B89E]"></span>
                    <span class="font-medium text-[11px] text-[#5C5249]">A1</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-[1px] bg-[#9B8977]"></span>
                    <span class="font-medium text-[11px] text-[#5C5249]">A2</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-[1px] bg-[#695747]"></span>
                    <span class="font-medium text-[11px] text-[#5C5249]">B1</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-[1px] bg-[#E5DED3]"></span>
                    <span class="font-medium text-[11px] text-[#5C5249]">B2</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-[1px] bg-[#F2EDE4]"></span>
                    <span class="font-medium text-[11px] text-[#5C5249]">C1</span>
                  </div>
                </div>

                <!-- Bảng Học Thuật Chi Tiết -->
                <div class="pt-0.5">
                  <!-- Header Bảng -->
                  <div class="grid grid-cols-12 gap-2 pb-2 border-b border-[#E5DED3] text-[11px] font-semibold tracking-wider text-[#8C827A]">
                    <div class="col-span-2">Cấp độ</div>
                    <div class="col-span-4">Mô tả năng lực</div>
                    <div class="col-span-4">Số từ</div>
                    <div class="col-span-2 text-right">Tỷ trọng</div>
                  </div>

                  <!-- Danh sách hàng A1 -> C1 -->
                  <div class="divide-y divide-[#E5DED3]/50">
                    <div *ngFor="let row of cefrRows()" class="grid grid-cols-12 gap-2 items-center py-2">
                      <!-- Cột 1: Cấp độ -->
                      <div class="col-span-2 font-serif font-semibold text-xs sm:text-sm text-[#221C14]">
                        {{ row.level }}
                      </div>

                      <!-- Cột 2: Mô tả năng lực -->
                      <div class="col-span-4">
                        <p class="text-xs font-medium text-[#221C14] leading-tight">{{ row.title }}</p>
                        <p class="text-[10px] text-[#8C827A] leading-tight mt-0.5">{{ row.subtitle }}</p>
                      </div>

                      <!-- Cột 3: Số từ & Thanh line mỏng -->
                      <div class="col-span-4 flex items-center gap-3">
                        <span class="text-xs font-serif font-semibold text-[#221C14] w-4 shrink-0">{{ row.count }}</span>
                        <div class="flex-1 flex items-center">
                          <div 
                            *ngIf="row.count > 0"
                            class="h-[3px] bg-[#6E5B4B] rounded-[1px] transition-all duration-500"
                            [style.width.%]="row.percentage"
                          ></div>
                        </div>
                      </div>

                      <!-- Cột 4: Tỷ trọng % -->
                      <div class="col-span-2 text-right text-xs font-mono text-[#5C5249]">
                        {{ row.percentage.toFixed(1) }}%
                      </div>
                    </div>
                  </div>

                  <!-- Chú thích chân bảng (Alert Box) -->
                  <div class="mt-3 p-2.5 rounded-[3px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center gap-2 text-xs text-[#5C5249]">
                    <span class="text-emerald-700 font-bold text-sm">✓</span>
                    <span>Tổng tỷ trọng cốt chuẩn hóa ở mức 100% trên {{ stats()?.totalWords ?? 18 }} mục từ đang hoạt động.</span>
                  </div>

                </div>

              </div>

              <!-- Cột Phải (5/12): Nhật Ký AI Vision Trực Tiếp -->
              <div class="lg:col-span-5 w-full bg-white rounded-[4px] border border-[#E5DED3] p-5 shadow-xs space-y-3 flex flex-col justify-between">
                
                <div>
                  <span class="text-[10px] font-semibold tracking-wider text-[#8C827A] block">
                    Dữ liệu học thuật
                  </span>
                  <div class="flex items-center justify-between mt-1">
                    <h2 class="font-serif font-semibold text-sm sm:text-base text-[#221C14]">
                      Nhật ký AI Vision trực tiếp
                    </h2>
                    <span class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Real-time stream</span>
                    </span>
                  </div>

                  <!-- Clean divider line right under the header -->
                  <div class="border-b border-[#2D2823] mt-2.5 mb-1.5"></div>

                  <!-- Danh Sách 4 Bối Cảnh Nhận Diện Thực Tế -->
                  <div class="divide-y divide-[#E5DED3]/60">
                    <div 
                      *ngFor="let item of recentVisionLogs()" 
                      class="py-2.5 flex items-start gap-3 group hover:bg-[#FAF8F5]/60 transition-colors px-0.5"
                    >
                      <!-- Thumbnail Bối Cảnh -->
                      <img 
                        [src]="item.imageUrl" 
                        [alt]="item.title"
                        (error)="handleImageError($event)"
                        class="w-12 h-12 rounded-[3px] object-cover border border-[#E5DED3] shrink-0 bg-[#FAF8F5] shadow-2xs group-hover:scale-105 transition-transform"
                      />

                      <!-- Thông Tin Quét Thực Tế -->
                      <div class="flex-1 min-w-0">
                        <div class="flex items-baseline justify-between gap-2">
                          <h4 class="font-sans font-semibold text-xs text-[#2D2823] truncate group-hover:text-[#7D6853] transition-colors">
                            Quét bối cảnh: {{ item.title }}
                          </h4>
                          <span class="text-[10px] text-[#8C827A] whitespace-nowrap shrink-0">
                            {{ item.timeAgo }}
                          </span>
                        </div>
                        
                        <p class="text-[11px] text-[#8C827A] mt-0.5 truncate">
                          {{ item.userEmail }}
                        </p>

                        <p class="text-[11px] text-[#5C5249] mt-0.5 font-medium">
                          {{ item.detailText }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Chân thẻ Nhật Ký -->
                <div class="pt-2.5 border-t border-[#E5DED3] flex items-center justify-between">
                  <span class="text-xs text-[#8C827A]">4 sự kiện gần nhất</span>
                  <button 
                    type="button" 
                    (click)="selectTab('vision')"
                    class="text-xs font-semibold text-[#2D2823] hover:text-[#7D6853] flex items-center gap-1 cursor-pointer border-0 bg-transparent p-0 transition-colors"
                  >
                    <span>Xem toàn bộ nhật ký</span>
                    <span>→</span>
                  </button>
                </div>

              </div>

            </div>

          </div>

          <!-- =========================================================================
               TAB 2: KHO TỪ ĐIỂN CHUẨN CEFR (FIGMA SCANDINAVIAN EDITORIAL)
               ========================================================================= -->
          <div *ngIf="activeTab === 'vocabulary'" class="space-y-3.5 animate-fade-in">
            
            <!-- 2.1 BĂNG CHỈ SỐ HỌC THUẬT KHO TỪ ĐIỂN (4 METRIC CARDS) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              <!-- Metric 1: Tổng Mục Từ Chuẩn Hóa -->
              <div class="bg-white rounded-[4px] border border-[#E5DED3] p-4 shadow-xs flex flex-col justify-between hover:border-[#7D6853]/40 transition-colors">
                <div>
                  <div class="flex items-center justify-between">
                    <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Tổng mục từ chuẩn hóa</p>
                    <span class="text-[9px] font-medium px-1.5 py-0.5 rounded-[2px] bg-[#FAF8F5] border border-[#E5DED3] text-[#7D6853]">Chuẩn CEFR</span>
                  </div>
                  <h3 class="font-serif font-semibold text-lg sm:text-xl text-[#2D2823] mt-1 mb-0.5">
                    {{ wordsTotalElements() || 18 }}
                  </h3>
                  <p class="text-[11px] text-[#5C5249]">
                    Phân bố từ vựng từ bậc A1 đến C2
                  </p>
                </div>
                <div class="mt-2.5 pt-2.5 border-t border-[#E5DED3]/70 flex items-center justify-between text-[11px] text-[#8C827A]">
                  <span>Trang hiện tại: {{ wordsPage() + 1 }} / {{ wordsTotalPages() || 1 }}</span>
                  <span class="font-mono text-[#7D6853] font-medium">{{ words().length }} từ / trang</span>
                </div>
              </div>

              <!-- Metric 2: Đang Có Người Học -->
              <div class="bg-white rounded-[4px] border border-[#E5DED3] p-4 shadow-xs flex flex-col justify-between hover:border-[#7D6853]/40 transition-colors">
                <div>
                  <div class="flex items-center justify-between">
                    <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Tương tác học viên</p>
                    <span class="text-[9px] font-medium px-1.5 py-0.5 rounded-[2px] bg-emerald-50 border border-emerald-200/80 text-emerald-800">Thuật toán SM-2</span>
                  </div>
                  <h3 class="font-serif font-semibold text-lg sm:text-xl text-[#2D2823] mt-1 mb-0.5">
                    {{ stats()?.totalReviews || 248 }}
                  </h3>
                  <p class="text-[11px] text-emerald-700 font-medium">
                    Lượt ôn tập lặp lại ngắt quãng
                  </p>
                </div>
                <div class="mt-2.5 pt-2.5 border-t border-[#E5DED3]/70 flex items-center justify-between text-[11px] text-[#8C827A]">
                  <span>Tỷ lệ nhớ hạn dài:</span>
                  <span class="font-mono text-[#2D2823] font-medium">88.5%</span>
                </div>
              </div>

              <!-- Metric 3: Phân Bố Trọng Tâm -->
              <div class="bg-white rounded-[4px] border border-[#E5DED3] p-4 shadow-xs flex flex-col justify-between hover:border-[#7D6853]/40 transition-colors">
                <div>
                  <div class="flex items-center justify-between">
                    <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Phổ cấp độ CEFR</p>
                    <span class="text-[9px] font-medium px-1.5 py-0.5 rounded-[2px] bg-[#FAF8F5] border border-[#E5DED3] text-[#7D6853]">94.4% Sơ cấp</span>
                  </div>
                  <h3 class="font-serif font-semibold text-lg sm:text-xl text-[#2D2823] mt-1 mb-0.5">
                    A1 & A2
                  </h3>
                  <p class="text-[11px] text-[#5C5249]">
                    Trọng tâm bối cảnh giao tiếp đời thực
                  </p>
                </div>
                <div class="mt-2.5 pt-2.5 border-t border-[#E5DED3]/70 flex items-center justify-between text-[11px] text-[#8C827A]">
                  <span>B1 — C1:</span>
                  <span class="font-mono text-[#7D6853] font-medium">Chuyên sâu & học thuật</span>
                </div>
              </div>

              <!-- Metric 4: Tương Thích AI Vision -->
              <div class="bg-white rounded-[4px] border border-[#E5DED3] p-4 shadow-xs flex flex-col justify-between hover:border-[#7D6853]/40 transition-colors">
                <div>
                  <div class="flex items-center justify-between">
                    <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Đồng bộ AI Vision</p>
                    <span class="text-[9px] font-medium px-1.5 py-0.5 rounded-[2px] bg-emerald-50 border border-emerald-200/80 text-emerald-800">100% Khớp</span>
                  </div>
                  <h3 class="font-serif font-semibold text-lg sm:text-xl text-[#2D2823] mt-1 mb-0.5">
                    YOLO-World
                  </h3>
                  <p class="text-[11px] text-[#5C5249]">
                    Tự động nhận diện & liên kết nhãn
                  </p>
                </div>
                <div class="mt-2.5 pt-2.5 border-t border-[#E5DED3]/70 flex items-center justify-between text-[11px] text-[#8C827A]">
                  <span>Thời gian suy luận:</span>
                  <span class="font-mono text-[#2D2823] font-medium">~180ms / ảnh</span>
                </div>
              </div>

            </div>
            
            <!-- 2.2 THANH TÌM KIẾM, BỘ LỌC CHUYÊN SÂU & HÀNH ĐỘNG HỆ THỐNG -->
            <div class="bg-white rounded-[4px] border border-[#E5DED3] p-3.5 sm:p-4 shadow-xs space-y-3">
              
              <!-- Hàng trên: Search, Filters và Nút Thêm Từ Mới -->
              <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
                
                <!-- Search Input -->
                <div class="relative flex-1 min-w-[240px]">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7D6853]">
                    <app-icon name="search" [size]="14" svgClass="text-[#7D6853]"></app-icon>
                  </div>
                  <input 
                    type="text" 
                    [ngModel]="searchTerm()"
                    (ngModelChange)="onSearchChange($event)"
                    placeholder="Tìm theo từ tiếng Anh, nghĩa tiếng Việt, phiên âm IPA..."
                    class="w-full pl-9 pr-9 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs text-[#2D2823] placeholder-[#8C827A] focus:outline-none focus:border-[#7D6853] focus:ring-1 focus:ring-[#7D6853] transition-all"
                  />
                  <button 
                    *ngIf="searchTerm()"
                    type="button"
                    (click)="onSearchChange('')"
                    class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#8C827A] hover:text-[#2D2823] border-0 bg-transparent cursor-pointer"
                  >
                    <app-icon name="x" [size]="13"></app-icon>
                  </button>
                </div>

                <!-- Dropdown filters & Primary CTA -->
                <div class="flex flex-wrap items-center gap-2 shrink-0">
                  
                  <!-- Filter: Loại từ (Part of Speech) -->
                  <div class="relative">
                    <select 
                      [ngModel]="selectedPartOfSpeech()"
                      (ngModelChange)="onPosChange($event)"
                      class="appearance-none pl-2.5 pr-7 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-medium text-[#2D2823] focus:outline-none focus:border-[#7D6853] cursor-pointer"
                    >
                      <option value="ALL">Tất cả từ loại</option>
                      <option value="Noun">Danh từ (Noun)</option>
                      <option value="Verb">Động từ (Verb)</option>
                      <option value="Adjective">Tính từ (Adjective)</option>
                      <option value="Adverb">Trạng từ (Adverb)</option>
                      <option value="Phrase">Cụm từ (Phrase)</option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#7D6853]">
                      <app-icon name="chevron-down" [size]="11"></app-icon>
                    </div>
                  </div>

                  <!-- Sort by -->
                  <div class="relative">
                    <select 
                      [ngModel]="selectedSortBy()"
                      (ngModelChange)="onSortChange($event)"
                      class="appearance-none pl-2.5 pr-7 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-medium text-[#2D2823] focus:outline-none focus:border-[#7D6853] cursor-pointer"
                    >
                      <option value="newest">Mới nhất trước</option>
                      <option value="az">Bảng chữ cái A → Z</option>
                      <option value="za">Bảng chữ cái Z → A</option>
                      <option value="oldest">Cũ nhất trước</option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#7D6853]">
                      <app-icon name="chevron-down" [size]="11"></app-icon>
                    </div>
                  </div>

                  <!-- Nút Thêm từ mới (Primary CTA) -->
                  <button 
                    type="button"
                    (click)="openCreateWordModal()"
                    class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold border-0 cursor-pointer transition-all active:scale-95 shadow-xs shrink-0"
                  >
                    <app-icon name="plus" [size]="13" svgClass="text-white"></app-icon>
                    <span>Thêm từ mới</span>
                  </button>

                </div>

              </div>

              <!-- Hàng dưới: CEFR Level Pills (Trái) & Hành Động Phụ (Phải) -->
              <div class="pt-2.5 border-t border-[#E5DED3] flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                
                <!-- CEFR Pills -->
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="text-[11px] font-semibold tracking-wider text-[#8C827A] mr-1">
                    Cấp độ CEFR:
                  </span>

                  <button 
                    type="button"
                    (click)="onCefrChange('ALL')"
                    [class.bg-[#7D6853]]="selectedCefr() === 'ALL'"
                    [class.text-white]="selectedCefr() === 'ALL'"
                    [class.border-[#7D6853]]="selectedCefr() === 'ALL'"
                    [class.bg-[#FAF8F5]]="selectedCefr() !== 'ALL'"
                    [class.text-[#5C5249]]="selectedCefr() !== 'ALL'"
                    [class.border-[#E5DED3]]="selectedCefr() !== 'ALL'"
                    class="px-2.5 py-0.5 rounded-[2px] text-xs font-semibold border cursor-pointer transition-all active:scale-95"
                  >
                    Tất cả ({{ wordsTotalElements() }})
                  </button>

                  <button 
                    *ngFor="let lvl of cefrLevels"
                    type="button"
                    (click)="onCefrChange(lvl.code)"
                    [class.bg-[#7D6853]]="selectedCefr() === lvl.code"
                    [class.text-white]="selectedCefr() === lvl.code"
                    [class.border-[#7D6853]]="selectedCefr() === lvl.code"
                    [class.bg-[#FAF8F5]]="selectedCefr() !== lvl.code"
                    [class.text-[#5C5249]]="selectedCefr() !== lvl.code"
                    [class.border-[#E5DED3]]="selectedCefr() !== lvl.code"
                    class="px-2 py-0.5 rounded-[2px] text-xs font-semibold border cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                  >
                    <span>{{ lvl.label }}</span>
                  </button>
                </div>

                <!-- Secondary Actions: Nạp Hàng Loạt & Xuất CSV -->
                <div class="flex items-center gap-2 self-start md:self-auto shrink-0">
                  <button 
                    type="button"
                    (click)="openBulkModal()"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#FAF8F5] hover:bg-[#EFEAE1] border border-[#E5DED3] text-xs font-semibold text-[#2D2823] cursor-pointer transition-all active:scale-95 shadow-2xs"
                    title="Nhập danh sách từ vựng từ tệp JSON hoặc CSV"
                  >
                    <app-icon name="upload" [size]="12" svgClass="text-[#7D6853]"></app-icon>
                    <span>Nạp hàng loạt</span>
                  </button>

                  <button 
                    type="button"
                    (click)="exportWordsCsv()"
                    class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-[#FAF8F5] hover:bg-[#EFEAE1] border border-[#E5DED3] text-xs font-semibold text-[#2D2823] cursor-pointer transition-all active:scale-95 shadow-2xs"
                    title="Xuất kho từ điển ra tệp CSV"
                  >
                    <app-icon name="download" [size]="12" svgClass="text-[#7D6853]"></app-icon>
                    <span>Xuất CSV</span>
                  </button>
                </div>

              </div>

            </div>

            <!-- 2.3 BẢNG DỮ LIỆU TỪ VỰNG CHUẨN CEFR (DATA TABLE) -->
            <div class="bg-white rounded-[4px] border border-[#E5DED3] overflow-hidden shadow-xs">
              
              <!-- Header của Bảng -->
              <div class="p-3.5 sm:p-4 border-b border-[#E5DED3] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white">
                <div>
                  <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823] tracking-tight">
                    Danh mục từ trong kho dữ liệu
                  </h3>
                  <p class="text-[11px] text-[#8C827A] mt-0.5 font-sans">
                    Dữ liệu học thuật chuẩn hóa phục vụ học viên quét ảnh AI Vision và thẻ ghi nhớ SM-2
                  </p>
                </div>

                <div class="flex items-center gap-2 self-start sm:self-auto">
                  <span class="px-2 py-0.5 rounded-[2px] bg-[#FAF8F5] border border-[#E5DED3] text-[11px] font-medium text-[#7D6853]">
                    Trang {{ wordsPage() + 1 }} / {{ wordsTotalPages() || 1 }}
                  </span>
                  <span class="px-2 py-0.5 rounded-[2px] bg-[#FAF8F5] border border-[#E5DED3] text-[11px] text-[#5C5249]">
                    Tổng cộng: <strong class="text-[#2D2823] font-mono">{{ wordsTotalElements() }}</strong> mục từ
                  </span>
                </div>
              </div>

              <!-- Nội dung Bảng Responsive -->
              <div class="overflow-x-auto min-h-[300px] relative">
                
                <!-- Loading Overlay -->
                <div 
                  *ngIf="wordsLoading()" 
                  class="absolute inset-0 bg-[#FAF8F5]/80 backdrop-blur-2xs flex items-center justify-center z-10"
                >
                  <div class="flex items-center gap-2 px-3.5 py-2 rounded-[4px] bg-white border border-[#E5DED3] shadow-md text-xs font-semibold text-[#7D6853]">
                    <app-icon name="rotate-cw" [size]="15" svgClass="animate-spin text-[#7D6853]"></app-icon>
                    <span>Đang nạp dữ liệu từ điển...</span>
                  </div>
                </div>

                <table class="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr class="border-b border-[#E5DED3] bg-[#FAF8F5] text-[#8C827A] tracking-wider text-[11px] font-semibold">
                      <th class="py-2.5 px-4">Mục từ & IPA</th>
                      <th class="py-2.5 px-3.5">Cấp độ & từ loại</th>
                      <th class="py-2.5 px-3.5">Nghĩa tiếng Việt & định nghĩa</th>
                      <th class="py-2.5 px-3.5">Ví dụ ngữ cảnh (EN / VI)</th>
                      <th class="py-2.5 px-3 text-center">Người học</th>
                      <th class="py-2.5 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#E5DED3]">
                    
                    <tr 
                      *ngFor="let item of words()" 
                      class="hover:bg-[#FAF8F5]/60 transition-colors group"
                    >
                      <!-- 1. Từ Vựng & IPA -->
                      <td class="py-3 px-4 align-top">
                        <div class="flex items-start gap-2">
                          <button 
                            type="button"
                            (click)="speak(item.word)"
                            class="w-6 h-6 rounded-[3px] bg-[#FAF8F5] hover:bg-[#EFEAE1] border border-[#E5DED3] text-[#7D6853] hover:text-[#2D2823] flex items-center justify-center cursor-pointer transition-colors shrink-0 mt-0.5"
                            title="Nghe phát âm chuẩn tiếng Anh"
                          >
                            <app-icon name="volume-2" [size]="12"></app-icon>
                          </button>
                          <div>
                            <span class="font-serif font-semibold text-xs sm:text-sm text-[#2D2823] block leading-tight tracking-tight">
                              {{ item.word }}
                            </span>
                            <span class="font-mono text-[11px] text-[#7D6853] font-medium block mt-0.5">
                              {{ item.phoneticIpa || '/--/' }}
                            </span>
                          </div>
                        </div>
                      </td>

                      <!-- 2. Cấp Độ & Loại Từ -->
                      <td class="py-3 px-3.5 align-top">
                        <div class="flex flex-col gap-1 items-start">
                          <span 
                            class="px-2 py-0.5 rounded-[2px] text-[10px] font-semibold inline-block"
                            [ngClass]="getCefrBadgeClass(item.cefrLevel || 'A1')"
                          >
                            {{ item.cefrLevel || 'A1' }}
                          </span>
                          <div class="flex items-center gap-1">
                            <span class="text-[10px] font-medium text-[#7D6853] bg-[#FAF8F5] px-1.5 py-0.5 rounded-[2px] border border-[#E5DED3]">
                              {{ item.partOfSpeech || 'Noun' }}
                            </span>
                            <span *ngIf="item.category && item.category !== 'General'" class="text-[10px] text-[#8C827A] bg-[#FAF8F5] px-1.5 py-0.5 rounded-[2px] border border-[#E5DED3]">
                              {{ item.category }}
                            </span>
                          </div>
                        </div>
                      </td>

                      <!-- 3. Nghĩa Tiếng Việt & Định Nghĩa -->
                      <td class="py-3 px-3.5 align-top max-w-xs">
                        <p class="font-semibold text-xs text-[#2D2823] leading-snug">
                          {{ item.vietnameseMeaning }}
                        </p>
                        <p *ngIf="item.definitionEn" class="text-[11px] text-[#8C827A] mt-0.5 line-clamp-2 italic leading-relaxed">
                          {{ item.definitionEn }}
                        </p>
                      </td>

                      <!-- 4. Ví Dụ Ngữ Cảnh (EN/VI) -->
                      <td class="py-3 px-3.5 align-top max-w-sm">
                        <div *ngIf="item.exampleSentenceEn; else noExample" class="space-y-0.5">
                          <p class="text-[#2D2823] italic font-medium leading-relaxed text-xs">
                            “{{ item.exampleSentenceEn }}”
                          </p>
                          <p *ngIf="item.exampleSentenceVi" class="text-[11px] text-[#7D6853] leading-snug">
                            {{ item.exampleSentenceVi }}
                          </p>
                        </div>
                        <ng-template #noExample>
                          <span class="text-[11px] text-[#8C827A] italic">Chưa cập nhật ví dụ ngữ cảnh</span>
                        </ng-template>
                      </td>

                      <!-- 5. Thống Kê Người Học -->
                      <td class="py-3 px-3 align-top text-center">
                        <span 
                          class="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded-[2px]"
                          [ngClass]="(item.activeLearnersCount ?? 0) > 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80' : 'bg-[#FAF8F5] text-[#8C827A] border border-[#E5DED3]'"
                        >
                          <app-icon name="users" [size]="10"></app-icon>
                          <span>{{ item.activeLearnersCount ?? 0 }}</span>
                        </span>
                      </td>

                      <!-- 6. Cột Thao Tác -->
                      <td class="py-3 px-4 align-middle text-right whitespace-nowrap">
                        <div class="inline-flex items-center gap-1.5 justify-end whitespace-nowrap flex-nowrap shrink-0">
                          <!-- Nút Sửa -->
                          <button 
                            type="button"
                            (click)="openEditWordModal(item)"
                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] bg-[#FAF8F5] hover:bg-[#7D6853] text-[#5C5249] hover:text-white border border-[#E5DED3] hover:border-[#7D6853] cursor-pointer transition-all shadow-2xs group active:scale-95"
                            title="Chỉnh sửa từ vựng"
                          >
                            <app-icon name="edit-3" [size]="11" svgClass="text-[#7D6853] group-hover:text-white transition-colors"></app-icon>
                            <span class="text-[11px] font-semibold">Sửa</span>
                          </button>

                          <!-- Nút Xóa -->
                          <button 
                            type="button"
                            (click)="confirmDeleteWord(item)"
                            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] bg-[#FAF8F5] hover:bg-rose-50 text-[#8C827A] hover:text-rose-700 border border-[#E5DED3] hover:border-rose-200 cursor-pointer transition-all shadow-2xs group active:scale-95"
                            title="Xóa mục từ khỏi hệ thống"
                          >
                            <app-icon name="trash" [size]="11" svgClass="text-[#8C827A] group-hover:text-rose-600 transition-colors"></app-icon>
                            <span class="text-[11px] font-semibold">Xóa</span>
                          </button>
                        </div>
                      </td>

                    </tr>

                    <!-- Trạng thái trống (Empty State) -->
                    <tr *ngIf="!wordsLoading() && !words().length">
                      <td colspan="6" class="py-12 text-center">
                        <div class="w-10 h-10 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-[#7D6853] mx-auto mb-2.5 flex items-center justify-center shadow-2xs">
                          <app-icon name="search" [size]="18" svgClass="text-[#7D6853]"></app-icon>
                        </div>
                        <h4 class="font-serif font-semibold text-xs sm:text-sm text-[#2D2823]">
                          Không tìm thấy mục từ nào phù hợp
                        </h4>
                        <p class="text-[11px] text-[#5C5249] mt-0.5 max-w-sm mx-auto">
                          Hãy thử điều chỉnh từ khóa tìm kiếm hoặc chọn cấp độ CEFR khác.
                        </p>
                        <button 
                          type="button"
                          (click)="onSearchChange(''); onCefrChange('ALL'); onPosChange('ALL')"
                          class="mt-3 px-3 py-1.5 rounded-[4px] text-xs font-semibold bg-[#FAF8F5] hover:bg-[#EFEAE1] border border-[#E5DED3] text-[#7D6853] cursor-pointer transition-all active:scale-95"
                        >
                          Đặt lại tất cả bộ lọc
                        </button>
                      </td>
                    </tr>

                  </tbody>
                </table>

              </div>

              <!-- 2.4 THANH PHÂN TRANG (PAGINATION CONTROLLER) -->
              <div class="p-3 sm:p-3.5 border-t border-[#E5DED3] bg-[#FAF8F5]/60 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-[#5C5249]">
                
                <!-- Thông tin số lượng hiển thị -->
                <div>
                  <span *ngIf="wordsTotalElements() > 0">
                    Hiển thị từ 
                    <strong class="text-[#2D2823] font-mono">{{ (wordsPage() * wordsPageSize()) + 1 }}</strong> 
                    đến 
                    <strong class="text-[#2D2823] font-mono">{{ getEndElement() }}</strong> 
                    trong tổng số 
                    <strong class="text-[#2D2823] font-mono">{{ wordsTotalElements() }}</strong> mục từ.
                  </span>
                  <span *ngIf="wordsTotalElements() === 0">
                    Không có mục từ nào.
                  </span>
                </div>

                <!-- Điều hướng phân trang & Cỡ trang -->
                <div class="flex items-center gap-2.5">
                  
                  <!-- Chọn kích thước trang (Page Size) -->
                  <div class="flex items-center gap-1.5">
                    <span class="text-[11px] text-[#8C827A]">Hiển thị:</span>
                    <select 
                      [ngModel]="wordsPageSize()"
                      (ngModelChange)="onPageSizeChange($event)"
                      class="py-1 px-2 rounded-[4px] bg-white border border-[#E5DED3] text-xs font-semibold text-[#2D2823] cursor-pointer focus:outline-none focus:border-[#7D6853]"
                    >
                      <option [value]="10">10 từ</option>
                      <option [value]="15">15 từ</option>
                      <option [value]="25">25 từ</option>
                      <option [value]="50">50 từ</option>
                    </select>
                  </div>

                  <!-- Nút phân trang Trước / Sau -->
                  <div class="flex items-center gap-1">
                    <button 
                      type="button"
                      (click)="changePage(wordsPage() - 1)"
                      [disabled]="wordsPage() === 0 || wordsLoading()"
                      class="px-2.5 py-1 rounded-[4px] bg-white hover:bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#2D2823] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs flex items-center gap-1"
                    >
                      <app-icon name="arrow-left" [size]="11"></app-icon>
                      <span class="hidden sm:inline">Trước</span>
                    </button>

                    <span class="px-2.5 py-1 font-mono font-semibold text-xs text-[#7D6853] bg-white rounded-[4px] border border-[#E5DED3]">
                      {{ wordsPage() + 1 }} / {{ wordsTotalPages() || 1 }}
                    </span>

                    <button 
                      type="button"
                      (click)="changePage(wordsPage() + 1)"
                      [disabled]="wordsPage() >= wordsTotalPages() - 1 || wordsLoading()"
                      class="px-2.5 py-1 rounded-[4px] bg-white hover:bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#2D2823] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs flex items-center gap-1"
                    >
                      <span class="hidden sm:inline">Sau</span>
                      <app-icon name="arrow-right" [size]="11"></app-icon>
                    </button>
                  </div>

                </div>

              </div>

            </div>

          </div>

          <!-- =========================================================================
               TAB 3: PHÂN HỆ QUẢN LÝ HỌC VIÊN & TIẾN TRÌNH SM-2
               ========================================================================= -->
          <div *ngIf="activeTab === 'users'" class="space-y-3.5 animate-fade-in">
            
            <!-- 3.1 HÀNG 4 KPI MINI-CARDS -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              <!-- Card 1: Tổng Học Viên -->
              <div class="p-4 rounded-[4px] bg-white border border-[#E5DED3] shadow-xs flex items-center justify-between">
                <div>
                  <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">
                    Tổng số học viên
                  </p>
                  <h3 class="font-serif font-semibold text-lg sm:text-xl text-[#2D2823] mt-1 mb-0.5">
                    {{ userOverviewStats()?.totalStudents ?? 0 }}
                  </h3>
                  <p class="text-[11px] text-[#5C5249] mt-0.5">
                    + {{ userOverviewStats()?.totalAdmins ?? 0 }} Quản trị viên
                  </p>
                </div>
                <div class="w-10 h-10 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-[#7D6853] shadow-2xs">
                  <app-icon name="users" [size]="18"></app-icon>
                </div>
              </div>

              <!-- Card 2: Hoạt Động Hôm Nay -->
              <div class="p-4 rounded-[4px] bg-white border border-[#E5DED3] shadow-xs flex items-center justify-between">
                <div>
                  <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">
                    Hoạt động hôm nay
                  </p>
                  <h3 class="font-serif font-semibold text-lg sm:text-xl text-emerald-700 mt-1 mb-0.5">
                    {{ userOverviewStats()?.activeToday ?? 0 }}
                  </h3>
                  <p class="text-[11px] text-emerald-600 mt-0.5">
                    Tương tác trong 24 giờ qua
                  </p>
                </div>
                <div class="w-10 h-10 rounded-[4px] bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
                  <app-icon name="activity" [size]="18"></app-icon>
                </div>
              </div>

              <!-- Card 3: Chuỗi Streak Trung Bình -->
              <div class="p-4 rounded-[4px] bg-white border border-[#E5DED3] shadow-xs flex items-center justify-between">
                <div>
                  <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">
                    Streak trung bình
                  </p>
                  <h3 class="font-serif font-semibold text-lg sm:text-xl text-amber-700 mt-1 mb-0.5">
                    {{ userOverviewStats()?.avgStreak ?? 0 }} <span class="text-xs font-normal text-[#8C827A]">ngày</span>
                  </h3>
                  <p class="text-[11px] text-[#5C5249] mt-0.5">
                    Duy trì thói quen học ngắt quãng
                  </p>
                </div>
                <div class="w-10 h-10 rounded-[4px] bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
                  <app-icon name="flame" [size]="18"></app-icon>
                </div>
              </div>

              <!-- Card 4: Từ Đã Chinh Phục (Mastered) -->
              <div class="p-4 rounded-[4px] bg-white border border-[#E5DED3] shadow-xs flex items-center justify-between">
                <div>
                  <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">
                    Từ vựng đã thuộc
                  </p>
                  <h3 class="font-serif font-semibold text-lg sm:text-xl text-purple-700 mt-1 mb-0.5">
                    {{ userOverviewStats()?.totalMasteredWords ?? 0 }}
                  </h3>
                  <p class="text-[11px] text-[#5C5249] mt-0.5">
                    Đạt tiêu chuẩn MASTERED SM-2
                  </p>
                </div>
                <div class="w-10 h-10 rounded-[4px] bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shadow-2xs">
                  <app-icon name="award" [size]="18"></app-icon>
                </div>
              </div>

            </div>

            <!-- 3.2 BẢNG DANH SÁCH HỌC VIÊN & BỘ LỌC THÔNG MINH -->
            <div class="w-full bg-white rounded-[4px] border border-[#E5DED3] shadow-xs overflow-hidden flex flex-col">
              
              <!-- Header Bảng -->
              <div class="p-3.5 sm:p-4 border-b border-[#E5DED3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823] tracking-tight">
                      Danh sách học viên trong hệ thống
                    </h3>
                    <span class="text-xs font-semibold px-2 py-0.5 rounded-[2px] bg-[#FAF8F5] text-[#7D6853] border border-[#E5DED3]">
                      Trang {{ usersPage() + 1 }} / {{ usersTotalPages() || 1 }}
                    </span>
                  </div>
                  <p class="text-[11px] text-[#5C5249] mt-0.5">
                    Giám sát tiến độ học tập thực tế, hồ sơ ghi nhớ SM-2 và phân quyền tài khoản người dùng.
                  </p>
                </div>

                <div class="flex items-center gap-2.5">
                  <button 
                    type="button"
                    (click)="openCreateUserModal()"
                    class="px-3 py-1.5 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold border-0 cursor-pointer flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 whitespace-nowrap shrink-0"
                    title="Tạo mới tài khoản học viên trong hệ thống"
                  >
                    <app-icon name="plus" [size]="13" svgClass="text-white"></app-icon>
                    <span>Thêm tài khoản học viên</span>
                  </button>

                  <div class="hidden sm:flex items-center gap-1.5 text-xs text-[#5C5249]">
                    <span class="font-medium text-[#2D2823]">Tổng cộng:</span>
                    <span class="px-2 py-0.5 rounded-[2px] bg-[#FAF8F5] border border-[#E5DED3] font-mono font-semibold text-[#7D6853]">
                      {{ usersTotalElements() }} tài khoản
                    </span>
                  </div>
                </div>
              </div>

              <!-- Thanh Công Cụ: Tìm kiếm & Bộ Lọc Đa Tiêu Chí -->
              <div class="p-3 border-b border-[#E5DED3] bg-[#FAF8F5]/60 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
                
                <!-- Tìm kiếm đa năng -->
                <div class="relative flex-1 min-w-[240px]">
                  <app-icon 
                    name="search" 
                    [size]="14" 
                    svgClass="absolute left-3 top-1/2 -translate-y-1/2 text-[#8C827A]"
                  ></app-icon>
                  <input 
                    type="text"
                    [ngModel]="userSearchTerm()"
                    (ngModelChange)="onUserSearchChange($event)"
                    placeholder="Tìm theo họ tên, email hoặc username học viên..."
                    class="w-full pl-8 pr-7 py-1.5 rounded-[4px] bg-white border border-[#E5DED3] text-xs text-[#2D2823] placeholder-[#8C827A] focus:outline-none focus:border-[#7D6853] shadow-2xs"
                  />
                  <button 
                    *ngIf="userSearchTerm()"
                    type="button"
                    (click)="onUserSearchChange('')"
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8C827A] hover:text-[#2D2823] border-0 bg-transparent cursor-pointer p-0.5"
                  >
                    <app-icon name="x" [size]="12"></app-icon>
                  </button>
                </div>

                <!-- Các bộ lọc -->
                <div class="flex flex-wrap items-center gap-2">
                  
                  <!-- Lọc Vai Trò -->
                  <select 
                    [ngModel]="userSelectedRole()"
                    (ngModelChange)="onUserRoleChange($event)"
                    class="py-1.5 px-2.5 rounded-[4px] bg-white border border-[#E5DED3] text-xs font-semibold text-[#2D2823] focus:outline-none cursor-pointer shadow-2xs"
                  >
                    <option value="ALL">Tất cả vai trò</option>
                    <option value="STUDENT">Học viên (Student)</option>
                    <option value="ADMIN">Quản trị viên (Admin)</option>
                  </select>

                  <!-- Lọc Cấp Độ Mục Tiêu -->
                  <select 
                    [ngModel]="userSelectedLevel()"
                    (ngModelChange)="onUserLevelChange($event)"
                    class="py-1.5 px-2.5 rounded-[4px] bg-white border border-[#E5DED3] text-xs font-semibold text-[#2D2823] focus:outline-none cursor-pointer shadow-2xs"
                  >
                    <option value="ALL">Tất cả cấp độ mục tiêu</option>
                    <option value="A1">Mục tiêu A1 — Sơ cấp 1</option>
                    <option value="A2">Mục tiêu A2 — Sơ cấp 2</option>
                    <option value="B1">Mục tiêu B1 — Trung cấp 1</option>
                    <option value="B2">Mục tiêu B2 — Trung cấp 2</option>
                    <option value="C1">Mục tiêu C1 — Cao cấp</option>
                    <option value="C2">Mục tiêu C2 — Bản xứ</option>
                  </select>

                  <!-- Sắp xếp -->
                  <select 
                    [ngModel]="userSelectedSortBy()"
                    (ngModelChange)="onUserSortChange($event)"
                    class="py-1.5 px-2.5 rounded-[4px] bg-white border border-[#E5DED3] text-xs font-semibold text-[#2D2823] focus:outline-none cursor-pointer shadow-2xs"
                  >
                    <option value="newest">Mới tham gia nhất</option>
                    <option value="active">Hoạt động gần nhất</option>
                    <option value="streak">Streak cao nhất</option>
                    <option value="name">Tên học viên (A-Z)</option>
                  </select>

                  <!-- Nút Xóa Bộ Lọc nếu có điều kiện lọc -->
                  <button 
                    *ngIf="userSearchTerm() || userSelectedRole() !== 'ALL' || userSelectedLevel() !== 'ALL'"
                    type="button"
                    (click)="onUserSearchChange(''); onUserRoleChange('ALL'); onUserLevelChange('ALL')"
                    class="px-2.5 py-1.5 rounded-[4px] bg-white hover:bg-stone-50 border border-[#E5DED3] text-xs font-semibold text-[#7D6853] cursor-pointer shadow-2xs transition-colors"
                    title="Xóa tất cả bộ lọc"
                  >
                    Đặt lại bộ lọc
                  </button>

                </div>

              </div>

              <!-- Bảng Dữ Liệu Học Viên -->
              <div class="w-full overflow-x-auto">
                <table class="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr class="bg-[#FAF8F5] border-b border-[#E5DED3] text-[11px] font-semibold tracking-wider text-[#8C827A]">
                      <th class="py-2.5 px-4">Học viên</th>
                      <th class="py-2.5 px-3.5">Cấp độ & vai trò</th>
                      <th class="py-2.5 px-3.5">Streak & mục tiêu</th>
                      <th class="py-2.5 px-3.5">Tiến trình SM-2</th>
                      <th class="py-2.5 px-3.5">Hoạt động gần nhất</th>
                      <th class="py-2.5 px-4 text-center whitespace-nowrap min-w-[210px]">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#E5DED3]/80 text-xs">
                    
                    <!-- Dòng dữ liệu học viên -->
                    <tr 
                      *ngFor="let u of users()" 
                      class="hover:bg-[#FAF8F5]/40 transition-colors"
                    >
                      <!-- Cột 1: Thông tin học viên -->
                      <td class="py-3 px-4">
                        <div class="flex items-center gap-2.5">
                          <div class="w-8 h-8 rounded-[3px] bg-[#7D6853] text-white flex items-center justify-center font-semibold text-xs shrink-0 shadow-2xs uppercase">
                            {{ (u.fullName || u.username).slice(0, 1) }}
                          </div>
                          <div class="min-w-0">
                            <p class="font-semibold text-xs sm:text-sm text-[#2D2823] truncate leading-tight">
                              {{ u.fullName || u.username }}
                            </p>
                            <p class="text-[11px] text-[#8C827A] truncate font-mono mt-0.5">
                              {{ u.email }}
                            </p>
                          </div>
                        </div>
                      </td>

                      <!-- Cột 2: Cấp độ mục tiêu & Vai trò -->
                      <td class="py-3 px-3.5">
                        <div class="flex flex-col gap-1 items-start">
                          <span 
                            class="px-1.5 py-0.5 rounded-[2px] font-semibold text-[10px] tracking-wider uppercase border shadow-2xs"
                            [ngClass]="getCefrBadgeClass(u.targetLevel)"
                          >
                            {{ u.targetLevel }}
                          </span>
                          <span 
                            class="px-1.5 py-0.5 rounded-[2px] text-[10px] font-semibold"
                            [ngClass]="u.role === 'ADMIN' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-[#FAF8F5] text-[#5C5249] border border-[#E5DED3]'"
                          >
                            {{ u.role }}
                          </span>
                        </div>
                      </td>

                      <!-- Cột 3: Streak & Mục tiêu -->
                      <td class="py-3 px-3.5">
                        <div class="space-y-0.5">
                          <div class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                            <app-icon name="flame" [size]="11" svgClass="text-amber-600"></app-icon>
                            <span>{{ u.streakCount }} ngày</span>
                          </div>
                          <p class="text-[11px] text-[#8C827A]">
                            Mục tiêu: <strong class="text-[#2D2823] font-medium">{{ u.dailyGoal }}</strong> từ/ngày
                          </p>
                        </div>
                      </td>

                      <!-- Cột 4: Tiến trình SM-2 (Tổng số từ + Thanh tỉ lệ) -->
                      <td class="py-3 px-3.5">
                        <div class="space-y-1 max-w-[180px]">
                          <div class="flex items-center justify-between text-[11px]">
                            <span class="font-semibold text-[#2D2823]">{{ u.totalWords }} từ</span>
                            <span class="text-[10px] text-emerald-700 font-semibold">{{ u.masteredWords }} đã thuộc</span>
                          </div>

                          <!-- Mini multi-stage bar -->
                          <div class="w-full h-1.5 rounded-[2px] bg-stone-200 overflow-hidden flex">
                            <div 
                              *ngIf="u.totalWords > 0"
                              class="bg-emerald-500 h-full transition-all"
                              [style.width.%]="(u.masteredWords / u.totalWords) * 100"
                              title="Thành thạo (Mastered)"
                            ></div>
                            <div 
                              *ngIf="u.totalWords > 0"
                              class="bg-amber-400 h-full transition-all"
                              [style.width.%]="(u.reviewingWords / u.totalWords) * 100"
                              title="Đang ôn tập (Reviewing)"
                            ></div>
                            <div 
                              *ngIf="u.totalWords > 0"
                              class="bg-sky-500 h-full transition-all"
                              [style.width.%]="(u.learningWords / u.totalWords) * 100"
                              title="Đang học (Learning)"
                            ></div>
                          </div>

                          <p class="text-[10px] text-[#8C827A]">
                            {{ u.totalCaptures }} ảnh AI • {{ u.totalReviews }} lượt ôn
                          </p>
                        </div>
                      </td>

                      <!-- Cột 5: Hoạt động gần nhất -->
                      <td class="py-3 px-3.5 text-[11px] text-[#5C5249]">
                        <div class="flex items-center gap-1.5">
                          <app-icon name="clock" [size]="11" svgClass="text-[#8C827A]"></app-icon>
                          <span>{{ formatTimeAgo(u.lastActiveAt) }}</span>
                        </div>
                      </td>

                      <!-- Cột 6: Thao tác (Học lực, Sửa, Đặt lại, Xóa) -->
                      <td class="py-3 px-4 whitespace-nowrap text-center">
                        <div class="flex items-center justify-center gap-1.5 whitespace-nowrap flex-nowrap shrink-0">
                          
                          <!-- Nút Học Lực -->
                          <button 
                            type="button"
                            (click)="openAnalyticsModal(u)"
                            class="px-2 py-1 rounded-[3px] bg-[#FAF8F5] hover:bg-[#7D6853] hover:text-white border border-[#E5DED3] text-[#7D6853] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95 whitespace-nowrap shrink-0"
                            title="Xem hồ sơ học lực & phân tích SM-2 chi tiết"
                          >
                            <app-icon name="activity" [size]="12"></app-icon>
                            <span>Học lực</span>
                          </button>

                          <!-- Nút Sửa -->
                          <button 
                            type="button"
                            (click)="openEditUserModal(u)"
                            class="px-2 py-1 rounded-[3px] bg-[#FAF8F5] hover:bg-[#7D6853] hover:text-white border border-[#E5DED3] text-[#7D6853] text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95 whitespace-nowrap shrink-0"
                            title="Chỉnh sửa thông tin học viên & vai trò"
                          >
                            <app-icon name="edit" [size]="12"></app-icon>
                            <span>Sửa</span>
                          </button>

                          <!-- Nút Đặt lại tiến trình SM-2 -->
                          <button 
                            type="button"
                            (click)="openResetProgressModal(u)"
                            class="px-1.5 py-1 rounded-[3px] bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95 whitespace-nowrap shrink-0"
                            title="Đặt lại tiến trình học SM-2 nếu cần học lại từ đầu"
                          >
                            <app-icon name="refresh-cw" [size]="11"></app-icon>
                            <span>Đặt lại</span>
                          </button>

                          <!-- Nút Xóa tài khoản học viên -->
                          <button 
                            type="button"
                            (click)="openDeleteUserModal(u)"
                            class="p-1 rounded-[3px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer transition-colors shrink-0 inline-flex items-center justify-center"
                            title="Xóa vĩnh viễn tài khoản học viên khỏi hệ thống"
                          >
                            <app-icon name="trash" [size]="12"></app-icon>
                          </button>

                        </div>
                      </td>

                    </tr>

                    <!-- Trạng thái trống (Empty State) -->
                    <tr *ngIf="!usersLoading() && !users().length">
                      <td colspan="6" class="py-12 text-center">
                        <div class="w-10 h-10 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-[#7D6853] mx-auto mb-2.5 flex items-center justify-center shadow-2xs">
                          <app-icon name="search" [size]="18" svgClass="text-[#7D6853]"></app-icon>
                        </div>
                        <h4 class="font-serif font-semibold text-xs sm:text-sm text-[#2D2823]">
                          Không tìm thấy học viên nào phù hợp
                        </h4>
                        <p class="text-[11px] text-[#5C5249] mt-0.5 max-w-sm mx-auto">
                          Hãy thử điều chỉnh từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc vai trò / cấp độ.
                        </p>
                        <button 
                          type="button"
                          (click)="onUserSearchChange(''); onUserRoleChange('ALL'); onUserLevelChange('ALL')"
                          class="mt-3 px-3 py-1.5 rounded-[4px] text-xs font-semibold bg-[#FAF8F5] hover:bg-[#F2ECE1] border border-[#E5DED3] text-[#7D6853] cursor-pointer transition-all"
                        >
                          Xóa Tất Cả Bộ Lọc
                        </button>
                      </td>
                    </tr>

                  </tbody>
                </table>
              </div>

              <!-- Thanh Phân Trang Học Viên -->
              <div class="p-3 sm:p-3.5 border-t border-[#E5DED3] bg-[#FAF8F5]/40 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-[#5C5249]">
                <div>
                  <span *ngIf="usersTotalElements() > 0">
                    Hiển thị từ 
                    <strong class="text-[#2D2823] font-medium">{{ (usersPage() * usersPageSize()) + 1 }}</strong> 
                    đến 
                    <strong class="text-[#2D2823] font-medium">{{ getUserEndElement() }}</strong> 
                    trong tổng số 
                    <strong class="text-[#2D2823] font-medium">{{ usersTotalElements() }}</strong> học viên.
                  </span>
                  <span *ngIf="usersTotalElements() === 0">
                    Không có học viên nào.
                  </span>
                </div>

                <div class="flex items-center gap-2.5">
                  <div class="flex items-center gap-1.5">
                    <span class="text-[11px] text-[#8C827A]">Hiển thị:</span>
                    <select 
                      [ngModel]="usersPageSize()"
                      (ngModelChange)="onUserPageSizeChange($event)"
                      class="py-1 px-2 rounded-[4px] bg-white border border-[#E5DED3] text-xs font-semibold text-[#2D2823] cursor-pointer focus:outline-none"
                    >
                      <option [value]="10">10 người</option>
                      <option [value]="15">15 người</option>
                      <option [value]="25">25 người</option>
                      <option [value]="50">50 người</option>
                    </select>
                  </div>

                  <div class="flex items-center gap-1">
                    <button 
                      type="button"
                      (click)="changeUserPage(usersPage() - 1)"
                      [disabled]="usersPage() === 0 || usersLoading()"
                      class="px-2.5 py-1 rounded-[4px] bg-white hover:bg-stone-50 border border-[#E5DED3] text-xs font-semibold text-[#2D2823] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs flex items-center gap-1"
                    >
                      <app-icon name="arrow-left" [size]="11"></app-icon>
                      <span class="hidden sm:inline">Trước</span>
                    </button>

                    <span class="px-2.5 py-1 font-mono font-semibold text-xs text-[#7D6853] bg-white rounded-[4px] border border-[#E5DED3]">
                      {{ usersPage() + 1 }} / {{ usersTotalPages() || 1 }}
                    </span>

                    <button 
                      type="button"
                      (click)="changeUserPage(usersPage() + 1)"
                      [disabled]="usersPage() >= usersTotalPages() - 1 || usersLoading()"
                      class="px-2.5 py-1 rounded-[4px] bg-white hover:bg-stone-50 border border-[#E5DED3] text-xs font-semibold text-[#2D2823] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs flex items-center gap-1"
                    >
                      <span class="hidden sm:inline">Sau</span>
                      <app-icon name="arrow-right" [size]="11"></app-icon>
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>

          <!-- =========================================================================
               PHÂN HỆ 4: QUẢN LÝ ĐẤU TRƯỜNG THỊ GIÁC & BỐI CẢNH TUẦN
               Tuân thủ nghiêm ngặt Vocario Design System & Không sử dụng emoji
               ========================================================================= -->
          <div *ngIf="activeTab === 'arenas'" class="space-y-4 animate-fade-in">

            <!-- 1. HÀNG 3 THẺ CHỈ SỐ KPI ĐẤU TRƯỜNG -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              
              <!-- KPI 1: Đấu trường tuần đang phát sóng -->
              <div class="p-4 rounded-[4px] bg-white border border-amber-300 shadow-xs flex flex-col justify-between relative overflow-hidden">
                <div class="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-amber-50 pointer-events-none"></div>
                <div class="flex items-start justify-between relative z-10">
                  <div class="min-w-0 pr-2">
                    <p class="text-[10px] font-medium tracking-wider text-[#7D6853] uppercase">Đấu trường tuần đang phát sóng</p>
                    <h3 class="font-serif font-semibold text-base sm:text-lg text-[#2D2823] mt-1 mb-0.5 truncate">
                      {{ quizStageService.activeWeeklyStage().title }}
                    </h3>
                    <p class="text-xs text-[#5C5249] truncate">
                      {{ quizStageService.activeWeeklyStage().category }} · {{ quizStageService.activeWeeklyStage().words.length }} đồ vật
                    </p>
                  </div>
                  <div class="w-10 h-10 rounded-[4px] bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-900 shrink-0">
                    <app-icon name="award" [size]="18"></app-icon>
                  </div>
                </div>
                <div class="mt-3 flex items-center gap-1.5 text-[11px] text-[#5C5249] relative z-10">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span class="font-medium text-emerald-800">Đang hoạt động cho toàn bộ học viên</span>
                </div>
              </div>

              <!-- KPI 2: Tổng số đấu trường do Admin quản lý -->
              <div class="p-4 rounded-[4px] bg-white border border-[#E5DED3] shadow-xs flex flex-col justify-between">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Đấu trường đang phát sóng</p>
                    <h3 class="font-serif font-semibold text-lg sm:text-xl text-[#2D2823] mt-1 mb-0.5">
                      {{ quizStageService.publishedAdminStages().length }} / {{ quizStageService.adminStages().length }}
                    </h3>
                  </div>
                  <div class="w-10 h-10 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-[#7D6853]">
                    <app-icon name="target" [size]="18" svgClass="text-[#7D6853]"></app-icon>
                  </div>
                </div>
                <div class="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#5C5249]">
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Đã đăng mở cho học viên thi đấu đồng thời</span>
                </div>
              </div>

              <!-- KPI 3: Bối cảnh từ ảnh học viên -->
              <div class="p-4 rounded-[4px] bg-white border border-[#E5DED3] shadow-xs flex flex-col justify-between">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Bối cảnh từ học viên</p>
                    <h3 class="font-serif font-semibold text-lg sm:text-xl text-[#2D2823] mt-1 mb-0.5">
                      {{ quizStageService.userStages().length }}
                    </h3>
                  </div>
                  <div class="w-10 h-10 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-[#7D6853]">
                    <app-icon name="camera" [size]="18" svgClass="text-[#7D6853]"></app-icon>
                  </div>
                </div>
                <div class="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#5C5249]">
                  <span>Ảnh thực tế qua Studio Quét AI</span>
                </div>
              </div>

            </div>

            <!-- 2. THANH CÔNG CỤ & HÀNH ĐỘNG -->
            <div class="p-3.5 bg-white rounded-[4px] border border-[#E5DED3] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823] m-0">
                  Danh sách đấu trường quản lý
                </h3>
                <span class="text-xs font-mono px-2 py-0.5 rounded-[2px] bg-[#FAF8F5] border border-[#E5DED3] text-[#7D6853] font-semibold">
                  {{ quizStageService.publishedAdminStages().length }} / {{ quizStageService.adminStages().length }} đang phát sóng
                </span>
              </div>

              <div class="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                <button 
                  type="button"
                  (click)="quizStageService.publishAllStages()"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                  title="Đăng phát sóng tất cả đấu trường cho toàn thể học viên"
                >
                  <app-icon name="check" [size]="13" svgClass="text-emerald-800"></app-icon>
                  <span>Đăng tất cả đấu trường</span>
                </button>

                <button 
                  type="button"
                  (click)="quizStageService.resetToDefault()"
                  class="inline-flex items-center gap-1 px-3 py-1.5 rounded-[4px] border border-[#E5DED3] bg-white hover:bg-[#FAF8F5] text-xs font-medium text-[#5C5249] cursor-pointer transition-colors"
                  title="Đặt lại về 3 đấu trường hệ thống chuẩn hóa"
                >
                  <app-icon name="rotate-cw" [size]="12"></app-icon>
                  <span>Đặt lại mặc định</span>
                </button>

                <button 
                  type="button"
                  (click)="openCreateStageModal()"
                  class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                >
                  <app-icon name="plus" [size]="13" svgClass="text-white"></app-icon>
                  <span>+ Thêm đấu trường</span>
                </button>
              </div>
            </div>

            <!-- 3. LƯỚI THẺ CÁC ĐẤU TRƯỜNG (2 CỘT) -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <article 
                *ngFor="let stage of quizStageService.adminStages()"
                class="bg-white rounded-[4px] border p-4 shadow-xs transition-all space-y-3.5 flex flex-col justify-between"
                [class.border-amber-400]="stage.id === quizStageService.activeWeeklyStageId()"
                [class.bg-amber-50\/15]="stage.id === quizStageService.activeWeeklyStageId()"
                [class.border-[#E5DED3]]="stage.id !== quizStageService.activeWeeklyStageId()"
                [class.opacity-75]="stage.isPublished === false"
              >
                <!-- Phần trên: Ảnh & Thông tin -->
                <div class="space-y-3">
                  <!-- Thumbnail Image Viewport -->
                  <div class="relative w-full aspect-[16/10] rounded-[3px] overflow-hidden bg-stone-900 border border-[#E5DED3]/80">
                    <img 
                      [src]="stage.imageUrl" 
                      [alt]="stage.title" 
                      class="w-full h-full object-cover"
                    />

                    <!-- Badges overlay góc trái -->
                    <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span class="px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-medium bg-[#2D2823]/85 text-white backdrop-blur-xs flex items-center gap-1 shadow-xs">
                        <app-icon name="tag" [size]="10"></app-icon>
                        <span>{{ stage.category }}</span>
                      </span>
                      <span class="px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-medium bg-[#2D2823]/85 text-white backdrop-blur-xs shadow-xs">
                        {{ stage.words.length }} đồ vật
                      </span>
                    </div>

                    <!-- Badges overlay góc phải: Tiêu điểm tuần & Trạng thái đăng -->
                    <div class="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                      <span 
                        *ngIf="stage.id === quizStageService.activeWeeklyStageId()"
                        class="px-2 py-0.5 rounded-[2px] bg-amber-400 text-amber-950 font-mono text-[9px] font-semibold shadow-xs flex items-center gap-1 tracking-wider"
                      >
                        <app-icon name="award" [size]="10"></app-icon>
                        <span>Tiêu điểm tuần</span>
                      </span>

                      <span 
                        class="px-2 py-0.5 rounded-[2px] font-mono text-[9px] font-semibold shadow-xs flex items-center gap-1 backdrop-blur-xs"
                        [class.bg-emerald-700\/90]="stage.isPublished !== false"
                        [class.text-white]="stage.isPublished !== false"
                        [class.bg-stone-800\/90]="stage.isPublished === false"
                        [class.text-stone-300]="stage.isPublished === false"
                      >
                        <span class="w-1.5 h-1.5 rounded-full" [class.bg-emerald-300]="stage.isPublished !== false" [class.bg-stone-400]="stage.isPublished === false"></span>
                        <span>{{ stage.isPublished !== false ? 'Đang phát sóng' : 'Bản nháp (Ẩn)' }}</span>
                      </span>
                    </div>
                  </div>

                  <!-- Text details -->
                  <div>
                    <div class="flex items-center justify-between gap-2">
                      <h4 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823] m-0 truncate">
                        {{ stage.title }}
                      </h4>
                      <span *ngIf="stage.createdAt" class="text-[10px] font-mono text-[#8C827A] shrink-0">
                        {{ stage.createdAt }}
                      </span>
                    </div>
                    <p class="text-xs text-[#5C5249] mt-1 m-0 line-clamp-2 leading-relaxed">
                      {{ stage.subtitle }}
                    </p>
                  </div>

                  <!-- Words Tags List -->
                  <div class="space-y-1.5 pt-2 border-t border-[#E5DED3]">
                    <span class="text-[11px] font-semibold tracking-wider text-[#8C827A] block">
                      Các đồ vật nhận diện trong không gian:
                    </span>
                    <div class="flex flex-wrap gap-1.5">
                      <span 
                        *ngFor="let w of stage.words"
                        class="px-2 py-0.5 rounded-[2px] text-[11px] font-medium bg-[#FAF8F5] border border-[#E5DED3] text-[#2D2823] flex items-center gap-1"
                        [title]="w.vietnamese + ' (' + w.level + ')'"
                      >
                        <span class="font-semibold">{{ w.word }}</span>
                        <span class="text-[9px] text-[#7D6853] font-mono">({{ w.level }})</span>
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Footer: Quản trị hành động (Đăng / Tạm ẩn / Đặt làm tuần / Sửa / Xóa) -->
                <div class="pt-3 border-t border-[#E5DED3] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <!-- Nút Bật / Tắt Phát sóng (Đăng / Gỡ đăng) -->
                    <button 
                      type="button"
                      (click)="togglePublish(stage)"
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] text-xs font-semibold cursor-pointer transition-colors"
                      [class.border]="true"
                      [class.border-emerald-300]="stage.isPublished === false"
                      [class.bg-emerald-50]="stage.isPublished === false"
                      [class.text-emerald-900]="stage.isPublished === false"
                      [class.hover:bg-emerald-100]="stage.isPublished === false"
                      [class.border-stone-300]="stage.isPublished !== false"
                      [class.bg-stone-100]="stage.isPublished !== false"
                      [class.text-stone-700]="stage.isPublished !== false"
                      [class.hover:bg-stone-200]="stage.isPublished !== false"
                      [title]="stage.isPublished !== false ? 'Tạm ẩn đấu trường này khỏi danh sách học viên' : 'Đăng phát sóng đấu trường này cho toàn thể học viên'"
                    >
                      <app-icon [name]="stage.isPublished !== false ? 'eye-off' : 'eye'" [size]="12"></app-icon>
                      <span>{{ stage.isPublished !== false ? 'Tạm ẩn' : 'Đăng phát sóng' }}</span>
                    </button>

                    <!-- Nút Đặt làm đấu trường tuần -->
                    <button 
                      *ngIf="stage.id !== quizStageService.activeWeeklyStageId()"
                      type="button"
                      (click)="setAsWeeklyStage(stage)"
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] border border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold cursor-pointer transition-colors"
                      title="Chọn bối cảnh này làm bài thi Đấu Trường Tuần có bảng xếp hạng chính thức"
                    >
                      <app-icon name="award" [size]="12"></app-icon>
                      <span>Đặt làm tiêu điểm tuần</span>
                    </button>
                    <span 
                      *ngIf="stage.id === quizStageService.activeWeeklyStageId()"
                      class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-[3px] border border-amber-300"
                    >
                      <app-icon name="award" [size]="11"></app-icon>
                      <span>Tiêu điểm tuần</span>
                    </span>
                  </div>

                  <div class="flex items-center gap-1.5 ml-auto">
                    <!-- Nút Sửa -->
                    <button 
                      type="button"
                      (click)="openEditStageModal(stage)"
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] border border-[#E5DED3] bg-white hover:bg-[#FAF8F5] text-[#2D2823] text-xs font-semibold cursor-pointer transition-colors"
                      title="Chỉnh sửa thông tin và danh sách đồ vật"
                    >
                      <app-icon name="edit" [size]="12"></app-icon>
                      <span>Sửa</span>
                    </button>

                    <!-- Nút Xóa -->
                    <button 
                      type="button"
                      (click)="confirmDeleteStage(stage)"
                      class="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer transition-colors"
                      title="Xóa đấu trường này"
                    >
                      <app-icon name="trash" [size]="12"></app-icon>
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              </article>
            </div>

          </div>

          <!-- =========================================================================
               PHÂN HỆ 5: KIỂM DUYỆT BỐI CẢNH AI VISION & BOUNDING BOX
               Tuân thủ nghiêm ngặt Vocario Design System & Không sử dụng emoji
               ========================================================================= -->
          <div *ngIf="activeTab === 'vision'" class="space-y-3.5">

            <!-- 1. HÀNG 4 THẺ CHỈ SỐ KPI AI VISION -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <!-- KPI 1: Tổng ảnh chụp thực tế -->
              <div class="p-4 rounded-[4px] bg-white border border-[#E5DED3] shadow-xs flex flex-col justify-between">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Tổng ảnh bối cảnh</p>
                    <h3 class="font-serif font-semibold text-lg sm:text-xl text-[#2D2823] mt-1 mb-0.5">
                      {{ visionStats()?.totalCaptures ?? capturesTotalElements() | number }}
                    </h3>
                  </div>
                  <div class="w-10 h-10 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-[#7D6853]">
                    <app-icon name="camera" [size]="18" svgClass="text-[#7D6853]"></app-icon>
                  </div>
                </div>
                <div class="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#5C5249]">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Bảng PostgreSQL captures</span>
                </div>
              </div>

              <!-- KPI 2: Vật thể nhận diện -->
              <div class="p-4 rounded-[4px] bg-white border border-[#E5DED3] shadow-xs flex flex-col justify-between">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Vật thể AI nhận diện</p>
                    <h3 class="font-serif font-semibold text-lg sm:text-xl text-[#2D2823] mt-1 mb-0.5">
                      {{ visionStats()?.totalDetectedObjects ?? 0 | number }}
                    </h3>
                  </div>
                  <div class="w-10 h-10 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-[#7D6853]">
                    <app-icon name="sparkles" [size]="18" svgClass="text-[#7D6853]"></app-icon>
                  </div>
                </div>
                <div class="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#5C5249]">
                  <span class="px-1.5 py-0.5 rounded-[2px] bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-[10px]">
                    YOLO-World Open-Vocab
                  </span>
                </div>
              </div>

              <!-- KPI 3: Số chủ đề bối cảnh -->
              <div class="p-4 rounded-[4px] bg-white border border-[#E5DED3] shadow-xs flex flex-col justify-between">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Chủ đề bối cảnh</p>
                    <h3 class="font-serif font-semibold text-lg sm:text-xl text-[#2D2823] mt-1 mb-0.5">
                      {{ visionStats()?.totalThemes ?? 0 | number }}
                    </h3>
                  </div>
                  <div class="w-10 h-10 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-[#7D6853]">
                    <app-icon name="layers" [size]="18" svgClass="text-[#7D6853]"></app-icon>
                  </div>
                </div>
                <div class="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#5C5249]">
                  <span>Phân loại không gian</span>
                </div>
              </div>

              <!-- KPI 4: Chủ đề phổ biến nhất -->
              <div class="p-4 rounded-[4px] bg-white border border-[#E5DED3] shadow-xs flex flex-col justify-between">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Chủ đề phổ biến</p>
                    <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823] mt-1 mb-0.5 truncate max-w-[170px]" [title]="visionStats()?.topTheme">
                      {{ visionStats()?.topTheme ?? 'Bàn Học' }}
                    </h3>
                  </div>
                  <div class="w-10 h-10 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-[#7D6853]">
                    <app-icon name="pin" [size]="18" svgClass="text-[#7D6853]"></app-icon>
                  </div>
                </div>
                <div class="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#5C5249]">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span>Tần suất quét cao nhất</span>
                </div>
              </div>
            </div>

            <!-- 2. SMART TOOLBAR TÌM KIẾM & LỌC CHỦ ĐỀ -->
            <div class="p-3.5 sm:p-4 rounded-[4px] bg-white border border-[#E5DED3] shadow-xs space-y-3">
              <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
                
                <!-- Ô tìm kiếm từ khóa / học viên -->
                <div class="relative flex-1">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#7D6853]">
                    <app-icon name="search" [size]="14"></app-icon>
                  </div>
                  <input 
                    type="text"
                    [(ngModel)]="visionSearchKeyword"
                    (input)="onVisionSearch()"
                    placeholder="Tìm theo đồ vật (laptop, chair...), học viên hoặc chủ đề..."
                    class="w-full pl-9 pr-8 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-medium text-[#2D2823] placeholder-[#8C827A] focus:outline-hidden focus:ring-1 focus:ring-[#7D6853]/20 focus:border-[#7D6853] transition-all"
                  />
                  <button 
                    *ngIf="visionSearchKeyword"
                    type="button"
                    (click)="visionSearchKeyword = ''; onVisionSearch()"
                    class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[#8C827A] hover:text-[#2D2823] border-0 bg-transparent cursor-pointer"
                  >
                    <app-icon name="x" [size]="13"></app-icon>
                  </button>
                </div>

                <!-- Bộ lọc Chủ đề phòng -->
                <div class="flex items-center gap-2">
                  <span class="text-xs font-semibold text-[#7D6853] shrink-0">Chủ đề:</span>
                  <select 
                    [(ngModel)]="visionThemeFilter"
                    (change)="onVisionThemeChange()"
                    class="px-2.5 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#2D2823] focus:outline-hidden focus:border-[#7D6853] cursor-pointer"
                  >
                    <option value="ALL">Tất cả chủ đề</option>
                    <option *ngFor="let item of visionStats()?.sceneDistribution" [value]="item.theme">
                      {{ item.theme }} ({{ item.count }})
                    </option>
                  </select>
                </div>

                <!-- Nút Đặt lại bộ lọc -->
                <button 
                  type="button"
                  (click)="resetVisionFilters()"
                  class="px-3 py-2 rounded-[4px] bg-[#FAF8F5] hover:bg-[#E5DED3]/60 border border-[#E5DED3] text-xs font-semibold text-[#5C5249] hover:text-[#2D2823] cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <app-icon name="refresh-cw" [size]="13"></app-icon>
                  <span>Đặt lại</span>
                </button>
              </div>

              <!-- Thanh tóm tắt kết quả & Phân trang -->
              <div class="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-2.5 border-t border-[#E5DED3]/80 text-xs text-[#5C5249]">
                <div class="flex items-center gap-2 font-medium">
                  <span>Hiển thị</span>
                  <span class="font-semibold text-[#2D2823]">{{ captures().length }}</span>
                  <span>trên tổng số</span>
                  <span class="font-semibold text-[#2D2823]">{{ capturesTotalElements() }}</span>
                  <span>bức ảnh</span>
                </div>

                <!-- Nút phân trang Trước / Sau -->
                <div class="flex items-center gap-1.5">
                  <button 
                    type="button"
                    (click)="changeCapturesPage(capturesPage() - 1)"
                    [disabled]="capturesPage() === 0 || capturesLoading()"
                    class="px-2.5 py-1 rounded-[4px] border border-[#E5DED3] bg-white text-xs font-semibold text-[#5C5249] hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                  >
                    Trước
                  </button>

                  <span class="px-2 font-mono font-semibold text-[#2D2823]">
                    {{ capturesPage() + 1 }} / {{ capturesTotalPages() || 1 }}
                  </span>

                  <button 
                    type="button"
                    (click)="changeCapturesPage(capturesPage() + 1)"
                    [disabled]="capturesPage() >= capturesTotalPages() - 1 || capturesLoading()"
                    class="px-2.5 py-1 rounded-[4px] border border-[#E5DED3] bg-white text-xs font-semibold text-[#5C5249] hover:bg-[#FAF8F5] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>

            <!-- 3. LƯỚI THẺ ẢNH BỐI CẢNH (GALLERY GRID 3 CỘT) -->
            <div *ngIf="capturesLoading()" class="p-10 text-center bg-white rounded-[4px] border border-[#E5DED3] shadow-xs">
              <div class="inline-block animate-spin w-7 h-7 border-2 border-[#7D6853] border-t-transparent rounded-full mb-2.5"></div>
              <p class="text-xs font-semibold text-[#7D6853]">Đang nạp dữ liệu ảnh bối cảnh từ PostgreSQL...</p>
            </div>

            <div *ngIf="!capturesLoading() && !captures().length" class="p-10 text-center bg-white rounded-[4px] border border-[#E5DED3] shadow-xs space-y-2.5">
              <div class="w-10 h-10 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-[#7D6853] mx-auto flex items-center justify-center">
                <app-icon name="image" [size]="18"></app-icon>
              </div>
              <h4 class="font-serif font-semibold text-xs sm:text-sm text-[#2D2823]">Không tìm thấy bức ảnh nào</h4>
              <p class="text-[11px] text-[#5C5249] max-w-sm mx-auto">Thử tìm kiếm với từ khóa khác hoặc chuyển sang chủ đề khác.</p>
            </div>

            <div *ngIf="!capturesLoading() && captures().length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              
              <div *ngFor="let capture of captures()" class="bg-white rounded-[4px] border border-[#E5DED3] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
                
                <!-- Viewport ảnh bối cảnh -->
                <div class="relative w-full h-44 bg-stone-900 overflow-hidden cursor-pointer" (click)="openVisionDetail(capture)">
                  <img 
                    [src]="getImageUrl(capture.imageUrl)" 
                    (error)="handleImageError($event)"
                    alt="Bối cảnh AI Vision"
                    class="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                  />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>

                  <!-- Badge chủ đề phòng -->
                  <div class="absolute top-2.5 left-2.5">
                    <span class="px-2 py-0.5 rounded-[2px] bg-black/60 backdrop-blur-md text-white border border-white/20 text-[10px] font-semibold tracking-wider">
                      {{ capture.sceneTheme }}
                    </span>
                  </div>

                  <!-- Badge số lượng vật thể -->
                  <div class="absolute top-2.5 right-2.5">
                    <span class="px-2 py-0.5 rounded-[2px] bg-amber-400 text-stone-900 border border-amber-300 text-[10px] font-semibold flex items-center gap-1 shadow-xs">
                      <app-icon name="sparkles" [size]="10"></app-icon>
                      <span>{{ capture.detectedCount }} vật thể</span>
                    </span>
                  </div>

                  <!-- Thời gian chụp ở đáy ảnh -->
                  <div class="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white/90 font-medium">
                    <span class="flex items-center gap-1 truncate max-w-[180px]">
                      <app-icon name="user" [size]="11"></app-icon>
                      <span>{{ capture.userName }}</span>
                    </span>
                    <span class="text-white/70 text-[10px]">{{ capture.timeAgo }}</span>
                  </div>
                </div>

                <!-- Thân card: Danh sách chip đồ vật AI phát hiện -->
                <div class="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                  <div>
                    <p class="text-[10px] font-semibold tracking-wider text-[#8C827A] mb-1 flex items-center gap-1">
                      <app-icon name="tag" [size]="11"></app-icon>
                      <span>Nhãn vật thể nhận diện (YOLO-World)</span>
                    </p>

                    <div class="flex flex-wrap gap-1 max-h-16 overflow-hidden">
                      <span 
                        *ngFor="let label of capture.objectLabels | slice:0:6"
                        class="px-1.5 py-0.5 rounded-[2px] bg-[#FAF8F5] border border-[#E5DED3] text-[11px] font-semibold text-[#2D2823]"
                      >
                        {{ label }}
                      </span>
                      <span *ngIf="capture.objectLabels.length > 6" class="px-1.5 py-0.5 rounded-[2px] bg-stone-100 text-[10px] font-semibold text-[#8C827A]">
                        +{{ capture.objectLabels.length - 6 }}
                      </span>
                    </div>
                  </div>

                  <!-- Thanh hành động dưới chân thẻ -->
                  <div class="pt-2.5 border-t border-[#E5DED3]/80 flex items-center justify-between gap-1.5">
                    <button 
                      type="button"
                      (click)="openVisionDetail(capture)"
                      class="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-[3px] bg-[#FAF8F5] hover:bg-[#E5DED3]/70 text-[#7D6853] hover:text-[#2D2823] border border-[#E5DED3] text-xs font-semibold cursor-pointer transition-all active:scale-95"
                    >
                      <app-icon name="eye" [size]="12"></app-icon>
                      <span>Soi box</span>
                    </button>

                    <button 
                      type="button"
                      (click)="createStageFromCapture(capture)"
                      title="Tạo đấu trường từ ảnh này (1-click)"
                      class="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-[3px] bg-orange-100 hover:bg-orange-200 text-orange-950 border border-orange-300 text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-2xs"
                    >
                      <app-icon name="target" [size]="12" svgClass="text-orange-800"></app-icon>
                      <span>Tạo đấu trường</span>
                    </button>

                    <button 
                      type="button"
                      (click)="openDeleteCapture(capture)"
                      title="Xóa bức ảnh này khỏi CSDL"
                      class="inline-flex items-center justify-center p-1.5 rounded-[3px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold cursor-pointer transition-all active:scale-95"
                    >
                      <app-icon name="trash" [size]="12"></app-icon>
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>

          <!-- =========================================================================
               PHÂN HỆ 5: CẤU HÌNH THUẬT TOÁN SM-2 & HỆ THỐNG
               Tuân thủ nghiêm ngặt Vocario Design System & Không sử dụng emoji
               ========================================================================= -->
          <div *ngIf="activeTab === 'settings'" class="space-y-3.5">

            <!-- Banner Giải thích Khoa học Đồ án -->
            <div class="p-4 sm:p-5 rounded-[4px] bg-white border border-[#E5DED3] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded-[2px] bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-semibold tracking-wider">
                    Thuật toán cốt lõi
                  </span>
                  <span class="text-xs text-[#8C827A] font-semibold">SuperMemo SM-2 & YOLO-World Open-Vocabulary</span>
                </div>
                <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823] tracking-tight">
                  Bảng điều khiển tham số thuật toán & hệ thống
                </h3>
                <p class="text-[11px] text-[#5C5249] max-w-2xl leading-relaxed">
                  Tùy chỉnh hệ số giãn cách bộ nhớ Ebbinghaus, khoảng cách ngày lặp lại ban đầu và ngưỡng lọc tin cậy Computer Vision. Các thông số này áp dụng trực tiếp cho toàn bộ học viên khi quét ảnh và ôn tập Flashcard.
                </p>
              </div>

              <!-- Nút lưu cấu hình và khôi phục -->
              <div class="flex items-center gap-2 shrink-0">
                <button 
                  type="button"
                  (click)="resetSystemSettings()"
                  class="px-3 py-2 rounded-[4px] bg-[#FAF8F5] hover:bg-[#E5DED3]/60 border border-[#E5DED3] text-xs font-semibold text-[#5C5249] hover:text-[#2D2823] cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <app-icon name="refresh-cw" [size]="13"></app-icon>
                  <span>Khôi phục chuẩn SM-2</span>
                </button>

                <button 
                  type="button"
                  (click)="saveSystemSettings()"
                  [disabled]="savingSettings()"
                  class="px-4 py-2 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <app-icon name="check" [size]="13" svgClass="text-white"></app-icon>
                  <span>{{ savingSettings() ? 'Đang lưu...' : 'Lưu cấu hình' }}</span>
                </button>
              </div>
            </div>

            <!-- Grid 2 Cột: Cấu hình SM-2 bên trái, Cấu hình AI Vision & Mô phỏng bên phải -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
              
              <!-- CỘT TRÁI: THAM SỐ THUẬT TOÁN SM-2 (7 CỘT) -->
              <div class="lg:col-span-7 space-y-3.5">
                
                <!-- CARD 1: CẤU HÌNH THUẬT TOÁN SUPERMEMO SM-2 -->
                <div class="p-4 sm:p-5 rounded-[4px] bg-white border border-[#E5DED3] shadow-xs space-y-3.5">
                  <div class="flex items-center justify-between pb-2.5 border-b border-[#E5DED3]/80">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-[#7D6853] flex items-center justify-center">
                        <app-icon name="sliders" [size]="15"></app-icon>
                      </div>
                      <div>
                        <h4 class="font-serif font-semibold text-xs sm:text-sm text-[#2D2823]">
                          Tham số thuật toán SuperMemo SM-2
                        </h4>
                        <p class="text-[10px] text-[#8C827A]">Điều chỉnh hệ số trí nhớ và bước lặp ngắt quãng</p>
                      </div>
                    </div>
                    <span class="text-[10px] font-semibold text-[#7D6853] bg-[#FAF8F5] px-1.5 py-0.5 rounded-[2px] border border-[#E5DED3]">
                      Piotr Woźniak Formula
                    </span>
                  </div>

                  <!-- 1. Initial Easiness Factor (EF) -->
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <label class="text-xs font-medium text-[#2D2823] flex items-center gap-1.5">
                        <span>Hệ số dễ nhớ khởi tạo (Initial Easiness Factor - EF):</span>
                      </label>
                      <span class="text-xs font-mono font-semibold text-[#7D6853] bg-[#FAF8F5] px-2 py-0.5 rounded-[2px] border border-[#E5DED3]">
                        {{ systemSettings().initialEasinessFactor | number:'1.2-2' }}
                      </span>
                    </div>
                    <p class="text-[11px] text-[#5C5249] leading-relaxed">
                      Mặc định theo chuẩn nghiên cứu khoa học SM-2 là <strong class="text-[#2D2823] font-medium">2.50</strong>. Giá trị càng cao, khoảng cách ngày ôn tập càng giãn nở nhanh sau mỗi lần trả lời đúng.
                    </p>
                    <div class="flex items-center gap-2.5">
                      <input 
                        type="range" 
                        min="1.3" 
                        max="3.5" 
                        step="0.05"
                        [ngModel]="systemSettings().initialEasinessFactor"
                        (ngModelChange)="onSettingChange('initialEasinessFactor', $event)"
                        class="w-full h-1.5 bg-[#E5DED3] rounded-[2px] appearance-none cursor-pointer accent-[#7D6853]"
                      />
                      <input 
                        type="number" 
                        min="1.3" 
                        max="3.5" 
                        step="0.05"
                        [ngModel]="systemSettings().initialEasinessFactor"
                        (ngModelChange)="onSettingChange('initialEasinessFactor', $event)"
                        class="w-18 px-2 py-1 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#2D2823] text-center"
                      />
                    </div>
                  </div>

                  <!-- 2. Minimum Easiness Factor (Min EF) -->
                  <div class="space-y-1.5 pt-2.5 border-t border-[#E5DED3]/60">
                    <div class="flex items-center justify-between">
                      <label class="text-xs font-medium text-[#2D2823]">
                        Ngưỡng EF sàn tối thiểu (Minimum EF Threshold):
                      </label>
                      <span class="text-xs font-mono font-semibold text-[#7D6853] bg-[#FAF8F5] px-2 py-0.5 rounded-[2px] border border-[#E5DED3]">
                        {{ systemSettings().minEasinessFactor | number:'1.2-2' }}
                      </span>
                    </div>
                    <p class="text-[11px] text-[#5C5249] leading-relaxed">
                      Mặc định là <strong class="text-[#2D2823] font-medium">1.30</strong>. Ngăn chặn hệ số khó nhớ của từ vựng giảm xuống quá thấp, tránh hiện tượng ôn tập lặp lại vô tận.
                    </p>
                    <div class="flex items-center gap-2.5">
                      <input 
                        type="range" 
                        min="1.1" 
                        max="2.0" 
                        step="0.05"
                        [ngModel]="systemSettings().minEasinessFactor"
                        (ngModelChange)="onSettingChange('minEasinessFactor', $event)"
                        class="w-full h-1.5 bg-[#E5DED3] rounded-[2px] appearance-none cursor-pointer accent-[#7D6853]"
                      />
                      <input 
                        type="number" 
                        min="1.1" 
                        max="2.0" 
                        step="0.05"
                        [ngModel]="systemSettings().minEasinessFactor"
                        (ngModelChange)="onSettingChange('minEasinessFactor', $event)"
                        class="w-18 px-2 py-1 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#2D2823] text-center"
                      />
                    </div>
                  </div>

                  <!-- 3. Bước lặp I(1) và I(2) -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-[#E5DED3]/60">
                    <div class="space-y-1">
                      <label class="text-xs font-medium text-[#2D2823]">Bước lặp 1 - I(1) (ngày):</label>
                      <p class="text-[10px] text-[#8C827A]">Khoảng cách ôn tập lần đầu tiên (Chuẩn: 1 ngày)</p>
                      <input 
                        type="number" 
                        min="1" 
                        max="5"
                        [ngModel]="systemSettings().interval1Days"
                        (ngModelChange)="onSettingChange('interval1Days', $event)"
                        class="w-full px-2.5 py-1.5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#2D2823]"
                      />
                    </div>

                    <div class="space-y-1">
                      <label class="text-xs font-medium text-[#2D2823]">Bước lặp 2 - I(2) (ngày):</label>
                      <p class="text-[10px] text-[#8C827A]">Khoảng cách ôn tập lần thứ 2 (Chuẩn: 6 ngày)</p>
                      <input 
                        type="number" 
                        min="2" 
                        max="14"
                        [ngModel]="systemSettings().interval2Days"
                        (ngModelChange)="onSettingChange('interval2Days', $event)"
                        class="w-full px-2.5 py-1.5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#2D2823]"
                      />
                    </div>
                  </div>

                  <!-- 4. Strict Grading Toggle -->
                  <div class="p-3 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-between gap-3">
                    <div>
                      <p class="text-xs font-medium text-[#2D2823]">Chế độ đánh giá nghiêm ngặt (Strict Grading)</p>
                      <p class="text-[11px] text-[#5C5249]">Khi bật, nếu học viên chấm điểm 3/5 sao (Pass), hệ thống vẫn ép ôn lại sau 1-2 ngày thay vì bước nhảy lớn.</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        [ngModel]="systemSettings().strictGrading"
                        (ngModelChange)="onSettingChange('strictGrading', $event)"
                        class="sr-only peer"
                      />
                      <div class="w-10 h-5 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#7D6853]"></div>
                    </label>
                  </div>
                </div>

                <!-- CARD 2: CẤU HÌNH AI VISION & HỌC TẬP -->
                <div class="p-4 sm:p-5 rounded-[4px] bg-white border border-[#E5DED3] shadow-xs space-y-3.5">
                  <div class="flex items-center justify-between pb-2.5 border-b border-[#E5DED3]/80">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-[#7D6853] flex items-center justify-center">
                        <app-icon name="cpu" [size]="15"></app-icon>
                      </div>
                      <div>
                        <h4 class="font-serif font-semibold text-xs sm:text-sm text-[#2D2823]">
                          Cấu hình AI Vision & hạn mức học tập
                        </h4>
                        <p class="text-[10px] text-[#8C827A]">Thiết lập ngưỡng lọc Computer Vision và hạn mức từ mới</p>
                      </div>
                    </div>
                  </div>

                  <!-- 1. AI Vision Confidence Threshold -->
                  <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <label class="text-xs font-medium text-[#2D2823]">
                        Ngưỡng tin cậy nhận diện đồ vật (Confidence Threshold):
                      </label>
                      <span class="text-xs font-mono font-semibold text-[#7D6853] bg-[#FAF8F5] px-2 py-0.5 rounded-[2px] border border-[#E5DED3]">
                        {{ (systemSettings().aiVisionConfidenceThreshold * 100) | number:'1.0-0' }}%
                      </span>
                    </div>
                    <p class="text-[11px] text-[#5C5249] leading-relaxed">
                      Lọc bỏ các Bounding Box mà mô hình YOLO-World dự đoán có xác suất thấp hơn ngưỡng này. Giá trị khuyến nghị: <strong class="text-[#2D2823] font-medium">45%</strong>.
                    </p>
                    <div class="flex items-center gap-2.5">
                      <input 
                        type="range" 
                        min="0.25" 
                        max="0.85" 
                        step="0.05"
                        [ngModel]="systemSettings().aiVisionConfidenceThreshold"
                        (ngModelChange)="onSettingChange('aiVisionConfidenceThreshold', $event)"
                        class="w-full h-1.5 bg-[#E5DED3] rounded-[2px] appearance-none cursor-pointer accent-[#7D6853]"
                      />
                      <input 
                        type="number" 
                        min="0.25" 
                        max="0.85" 
                        step="0.05"
                        [ngModel]="systemSettings().aiVisionConfidenceThreshold"
                        (ngModelChange)="onSettingChange('aiVisionConfidenceThreshold', $event)"
                        class="w-18 px-2 py-1 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#2D2823] text-center"
                      />
                    </div>
                  </div>

                  <!-- 2. Hạn mức từ mới & Cấp độ CEFR mặc định -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-[#E5DED3]/60">
                    <div class="space-y-1">
                      <label class="text-xs font-medium text-[#2D2823]">Hạn mức từ mới / ngày:</label>
                      <p class="text-[10px] text-[#8C827A]">Số từ tối đa cho học viên mới mỗi ngày</p>
                      <input 
                        type="number" 
                        min="5" 
                        max="50"
                        [ngModel]="systemSettings().dailyNewWordLimit"
                        (ngModelChange)="onSettingChange('dailyNewWordLimit', $event)"
                        class="w-full px-2.5 py-1.5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#2D2823]"
                      />
                    </div>

                    <div class="space-y-1">
                      <label class="text-xs font-medium text-[#2D2823]">Cấp độ CEFR mặc định:</label>
                      <p class="text-[10px] text-[#8C827A]">Áp dụng khi học viên mới đăng ký tài khoản</p>
                      <select 
                        [ngModel]="systemSettings().targetCefrLevelDefault"
                        (ngModelChange)="onSettingChange('targetCefrLevelDefault', $event)"
                        class="w-full px-2.5 py-1.5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#2D2823] cursor-pointer"
                      >
                        <option value="A1">A1 — Khởi động</option>
                        <option value="A2">A2 — Sơ cấp</option>
                        <option value="B1">B1 — Trung cấp</option>
                        <option value="B2">B2 — Trung cao cấp</option>
                      </select>
                    </div>
                  </div>

                  <!-- 3. Tự động phát âm thanh IPA -->
                  <div class="p-3 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-between gap-3">
                    <div>
                      <p class="text-xs font-medium text-[#2D2823]">Tự động phát âm thanh chuẩn IPA</p>
                      <p class="text-[11px] text-[#5C5249]">Tự động kích hoạt Web Speech API / TTS khi học viên chạm vào Bounding Box hoặc lật Flashcard.</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        [ngModel]="systemSettings().enableAutoAudioPronunciation"
                        (ngModelChange)="onSettingChange('enableAutoAudioPronunciation', $event)"
                        class="sr-only peer"
                      />
                      <div class="w-10 h-5 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#7D6853]"></div>
                    </label>
                  </div>
                </div>

              </div>

              <!-- CỘT PHẢI: MÔ PHỎNG TOÁN HỌC & ĐỒ THỊ EBBINGHAUS (5 CỘT) -->
              <div class="lg:col-span-5 space-y-3.5">
                
                <!-- CARD MÔ PHỎNG CHU KỲ SM-2 TRỰC QUAN -->
                <div class="p-4 sm:p-5 rounded-[4px] bg-white border border-[#E5DED3] shadow-xs space-y-3">
                  <div class="flex items-center gap-2 pb-2.5 border-b border-[#E5DED3]/80">
                    <div class="w-7 h-7 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-[#7D6853] flex items-center justify-center">
                      <app-icon name="activity" [size]="15"></app-icon>
                    </div>
                    <div>
                      <h4 class="font-serif font-semibold text-xs sm:text-sm text-[#2D2823]">
                        Mô phỏng chu kỳ ôn tập SM-2
                      </h4>
                      <p class="text-[10px] text-[#8C827A]">Tính toán tự động theo các tham số đã nhập</p>
                    </div>
                  </div>

                  <!-- Timeline chu kỳ lặp -->
                  <div class="space-y-2">
                    <div *ngFor="let step of simulatedIntervals(); let i = index" class="p-2.5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-between text-xs">
                      <div class="flex items-center gap-2">
                        <span class="w-5 h-5 rounded-[2px] bg-[#7D6853] text-white flex items-center justify-center text-[10px] font-mono font-semibold">
                          #{{ i + 1 }}
                        </span>
                        <div>
                          <p class="font-semibold text-xs text-[#2D2823]">{{ step.name }}</p>
                          <p class="text-[10px] text-[#8C827A]">{{ step.desc }}</p>
                        </div>
                      </div>
                      <span class="px-2 py-0.5 rounded-[2px] bg-white border border-[#E5DED3] font-mono font-semibold text-[#7D6853]">
                        {{ step.interval }}
                      </span>
                    </div>
                  </div>

                  <!-- Ghi chú công thức toán học -->
                  <div class="p-3 rounded-[4px] bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900 space-y-1">
                    <p class="font-semibold text-[10px] tracking-wider text-amber-800 uppercase">Công thức SuperMemo SM-2</p>
                    <p class="text-[11px] font-mono leading-relaxed">
                      I(1) = {{ systemSettings().interval1Days }}d, I(2) = {{ systemSettings().interval2Days }}d<br/>
                      I(n) = I(n-1) × EF (với n ≥ 3)<br/>
                      EF' = EF + (0.1 - (5 - q) × (0.08 + (5 - q) × 0.02))
                    </p>
                    <p class="text-[10px] text-amber-800/80">
                      Khi học viên trả lời q = 5 (Perfect Recall), EF tăng thêm 0.10. Khi q &lt; 3 (Quên), bước lặp reset về I(1).
                    </p>
                  </div>
                </div>

                <!-- CARD THÔNG TIN CẬP NHẬT GẦN NHẤT -->
                <div class="p-4 rounded-[4px] bg-white border border-[#E5DED3] shadow-xs text-xs text-[#5C5249] space-y-2">
                  <p class="font-semibold text-xs text-[#2D2823] flex items-center gap-1.5">
                    <app-icon name="shield" [size]="13" svgClass="text-[#7D6853]"></app-icon>
                    <span>Trạng thái đồng bộ hệ thống</span>
                  </p>
                  <p class="text-[11px] leading-relaxed">
                    Hệ thống lưu cấu hình an toàn trên bộ nhớ tiến trình backend. Mọi phiên học Flashcard và nhận diện hình ảnh tiếp theo sẽ ngay lập tức thừa hưởng các chỉ số này.
                  </p>
                  <div class="pt-2 border-t border-[#E5DED3]/80 flex items-center justify-between text-[11px] text-[#8C827A]">
                    <span>Cập nhật lần cuối:</span>
                    <span class="font-medium text-[#2D2823]">{{ formatTimeAgo(systemSettings().lastUpdated) }}</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

          <!-- =========================================================================
               TAB 8: PHÂN TÍCH PHÁT ÂM AI (AI SPEECH & PRONUNCIATION ANALYTICS)
               ========================================================================= -->
          <div *ngIf="activeTab === 'speech'" class="space-y-3.5 animate-fade-in">

            <!-- 6.1 LƯỚI 4 THẺ KPI PHÂN TÍCH PHÁT ÂM -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              <!-- KPI 1: Điểm Phát Âm Trung Bình -->
              <div class="bg-white rounded-[4px] border border-[#E5DED3] p-4 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Điểm phát âm trung bình</p>
                    <div class="flex items-baseline gap-1 mt-1">
                      <h3 class="font-serif font-semibold text-lg sm:text-xl text-[#2D2823] mt-1 mb-0.5">
                        {{ speechAnalytics()?.averageScore ?? 78.5 }}
                      </h3>
                      <span class="text-xs font-mono font-normal text-[#8C827A]">/ 100</span>
                    </div>
                  </div>
                  <div class="w-10 h-10 rounded-[4px] bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center shrink-0">
                    <app-icon name="mic" [size]="18" svgClass="text-amber-700"></app-icon>
                  </div>
                </div>
                <div class="pt-2.5 border-t border-[#E5DED3]/60 flex items-center justify-between text-[11px]">
                  <span class="text-[#5C5249]">Đánh giá toàn trường</span>
                  <span class="px-1.5 py-0.5 rounded-[2px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[10px]">
                    Khá tốt
                  </span>
                </div>
              </div>

              <!-- KPI 2: Tổng Lượt Luyện Nói -->
              <div class="bg-white rounded-[4px] border border-[#E5DED3] p-4 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Tổng lượt luyện nói</p>
                    <h3 class="font-serif font-semibold text-lg sm:text-xl text-[#2D2823] mt-1 mb-0.5">
                      {{ speechAnalytics()?.totalSessions ?? 0 }}
                    </h3>
                  </div>
                  <div class="w-10 h-10 rounded-[4px] bg-sky-50 text-sky-700 border border-sky-200/80 flex items-center justify-center shrink-0">
                    <app-icon name="activity" [size]="18" svgClass="text-sky-700"></app-icon>
                  </div>
                </div>
                <div class="pt-2.5 border-t border-[#E5DED3]/60 flex items-center justify-between text-[11px]">
                  <span class="text-[#5C5249]">Ghi nhận qua Web Speech</span>
                  <span class="font-semibold text-[#2D2823]">{{ speechAnalytics()?.activeLearnersCount ?? 0 }} học viên</span>
                </div>
              </div>

              <!-- KPI 3: Tỷ Lệ Đạt Chuẩn (>= 75đ) -->
              <div class="bg-white rounded-[4px] border border-[#E5DED3] p-4 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Tỷ lệ đạt chuẩn (≥ 75 điểm)</p>
                    <h3 class="font-serif font-semibold text-lg sm:text-xl text-emerald-700 mt-1 mb-0.5">
                      {{ speechAnalytics()?.passRate ?? 0 }}%
                    </h3>
                  </div>
                  <div class="w-10 h-10 rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center shrink-0">
                    <app-icon name="check" [size]="18" svgClass="text-emerald-700"></app-icon>
                  </div>
                </div>
                <div class="pt-2.5 border-t border-[#E5DED3]/60 flex items-center justify-between text-[11px]">
                  <span class="text-[#5C5249]">Số lượt đạt chuẩn</span>
                  <span class="font-semibold text-emerald-800">{{ speechAnalytics()?.passedCount ?? 0 }} / {{ speechAnalytics()?.totalSessions ?? 0 }}</span>
                </div>
              </div>

              <!-- KPI 4: Âm Vị Thử Thách Nhất -->
              <div class="bg-white rounded-[4px] border border-[#E5DED3] p-4 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-[10px] font-medium tracking-wider text-[#8C827A] uppercase">Âm vị thử thách nhất</p>
                    <h3 class="font-mono font-semibold text-xs sm:text-sm text-rose-700 mt-1 mb-0.5 truncate">
                      /dʒ/ • /tl/ • /ʃ/
                    </h3>
                  </div>
                  <div class="w-10 h-10 rounded-[4px] bg-rose-50 text-rose-700 border border-rose-200/80 flex items-center justify-center shrink-0">
                    <app-icon name="alert-triangle" [size]="18" svgClass="text-rose-700"></app-icon>
                  </div>
                </div>
                <div class="pt-2.5 border-t border-[#E5DED3]/60 flex items-center justify-between text-[11px]">
                  <span class="text-[#5C5249]">Độ khó người Việt</span>
                  <span class="font-semibold text-rose-800">Cần kèm cặp</span>
                </div>
              </div>

            </div>

            <!-- 6.2 HÀNG 2: PHỔ PHÂN BỐ CHẤT LƯỢNG (7/12) & TOP 5 TỪ KHÓ NHẤT (5/12) -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5">

              <!-- CỘT TRÁI (7/12): PHỔ PHÂN BỐ CHẤT LƯỢNG PHÁT ÂM -->
              <div class="lg:col-span-7 bg-white rounded-[4px] border border-[#E5DED3] p-4 sm:p-5 shadow-xs space-y-3.5">
                <div class="flex items-center justify-between pb-2.5 border-b border-[#E5DED3]/80">
                  <div>
                    <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823] tracking-tight">
                      Phổ phân bố chất lượng phát âm
                    </h3>
                    <p class="text-[11px] text-[#5C5249] mt-0.5">
                      Thống kê tỷ lệ các dải điểm theo thang 100 điểm của AI Speech Scorer.
                    </p>
                  </div>
                  <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded-[2px] bg-stone-100 text-[#5C5249] border border-[#E5DED3]">
                    Phân loại 4 cấp
                  </span>
                </div>

                <div class="space-y-3 pt-1">
                  <!-- Cấp 1: Xuất sắc -->
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-semibold text-emerald-800 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
                        <span>Xuất sắc (Native like • 90 - 100 điểm)</span>
                      </span>
                      <span class="font-mono font-semibold text-[#2D2823]">
                        {{ speechAnalytics()?.nativeCount ?? 0 }} lượt
                      </span>
                    </div>
                    <div class="w-full bg-[#FAF8F5] rounded-[2px] h-2.5 overflow-hidden border border-[#E5DED3]/60">
                      <div 
                        class="bg-emerald-600 h-full rounded-[2px] transition-all duration-500"
                        [style.width.%]="(speechAnalytics()?.totalSessions ? ((speechAnalytics()!.nativeCount / speechAnalytics()!.totalSessions) * 100) : 35)"
                      ></div>
                    </div>
                  </div>

                  <!-- Cấp 2: Rất Tốt -->
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-semibold text-sky-800 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-sky-600"></span>
                        <span>Rất tốt (Fluent • 75 - 89 điểm)</span>
                      </span>
                      <span class="font-mono font-semibold text-[#2D2823]">
                        {{ speechAnalytics()?.fluentCount ?? 0 }} lượt
                      </span>
                    </div>
                    <div class="w-full bg-[#FAF8F5] rounded-[2px] h-2.5 overflow-hidden border border-[#E5DED3]/60">
                      <div 
                        class="bg-sky-600 h-full rounded-[2px] transition-all duration-500"
                        [style.width.%]="(speechAnalytics()?.totalSessions ? ((speechAnalytics()!.fluentCount / speechAnalytics()!.totalSessions) * 100) : 45)"
                      ></div>
                    </div>
                  </div>

                  <!-- Cấp 3: Khá Ổn -->
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-semibold text-amber-800 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>Khá ổn (Good effort • 55 - 74 điểm)</span>
                      </span>
                      <span class="font-mono font-semibold text-[#2D2823]">
                        {{ speechAnalytics()?.goodEffortCount ?? 0 }} lượt
                      </span>
                    </div>
                    <div class="w-full bg-[#FAF8F5] rounded-[2px] h-2.5 overflow-hidden border border-[#E5DED3]/60">
                      <div 
                        class="bg-amber-500 h-full rounded-[2px] transition-all duration-500"
                        [style.width.%]="(speechAnalytics()?.totalSessions ? ((speechAnalytics()!.goodEffortCount / speechAnalytics()!.totalSessions) * 100) : 15)"
                      ></div>
                    </div>
                  </div>

                  <!-- Cấp 4: Cần Cố Gắng -->
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-xs">
                      <span class="font-semibold text-rose-800 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span>Cần cố gắng (Need improvement • &lt; 55 điểm)</span>
                      </span>
                      <span class="font-mono font-semibold text-[#2D2823]">
                        {{ speechAnalytics()?.needImprovementCount ?? 0 }} lượt
                      </span>
                    </div>
                    <div class="w-full bg-[#FAF8F5] rounded-[2px] h-2.5 overflow-hidden border border-[#E5DED3]/60">
                      <div 
                        class="bg-rose-500 h-full rounded-[2px] transition-all duration-500"
                        [style.width.%]="(speechAnalytics()?.totalSessions ? ((speechAnalytics()!.needImprovementCount / speechAnalytics()!.totalSessions) * 100) : 5)"
                      ></div>
                    </div>
                  </div>
                </div>

                <div class="p-3 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs text-[#5C5249] flex items-start gap-2.5 leading-relaxed">
                  <app-icon name="info" [size]="14" svgClass="text-[#7D6853] shrink-0 mt-0.5"></app-icon>
                  <div class="text-[11px]">
                    <strong class="text-[#2D2823] font-medium">Định hướng sư phạm:</strong> Hệ thống tự động đẩy các từ có điểm dưới 70đ vào danh sách ưu tiên ôn tập lặp lại ngắt quãng SM-2 chu kỳ ngắn (+1 ngày) để học viên được rèn luyện phát âm thường xuyên hơn.
                  </div>
                </div>
              </div>

              <!-- CỘT PHẢI (5/12): TOP 5 TỪ VỰNG PHÁT ÂM KHÓ NHẤT -->
              <div class="lg:col-span-5 bg-white rounded-[4px] border border-[#E5DED3] p-4 sm:p-5 shadow-xs space-y-3">
                <div class="flex items-center justify-between pb-2.5 border-b border-[#E5DED3]/80">
                  <div>
                    <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823] tracking-tight">
                      Top từ vựng phát âm khó nhất
                    </h3>
                    <p class="text-[11px] text-[#5C5249] mt-0.5">
                      Các từ học viên đạt điểm trung bình thấp nhất.
                    </p>
                  </div>
                  <span class="w-6 h-6 rounded-[3px] bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-semibold text-xs">
                    5
                  </span>
                </div>

                <div class="space-y-2">
                  <div 
                    *ngFor="let item of speechAnalytics()?.hardestWords; let idx = index"
                    class="p-2.5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] hover:bg-[#EFEAE1] transition-colors"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="w-5 h-5 rounded-[2px] bg-stone-200 text-stone-700 font-mono font-semibold text-[10px] flex items-center justify-center">
                          #{{ idx + 1 }}
                        </span>
                        <div>
                          <div class="flex items-center gap-1.5">
                            <span class="font-serif font-semibold text-xs sm:text-sm text-[#2D2823]">{{ item.word }}</span>
                            <span class="px-1.5 py-0.2 rounded-[2px] text-[9px] font-semibold bg-white border border-[#E5DED3] text-[#7D6853]">
                              {{ item.cefrLevel }}
                            </span>
                          </div>
                          <span class="text-[11px] font-mono text-[#5C5249]">{{ item.ipa }}</span>
                        </div>
                      </div>

                      <div class="text-right flex items-center gap-2">
                        <div>
                          <span class="font-mono font-semibold text-xs sm:text-sm block leading-none"
                            [ngClass]="item.averageScore < 60 ? 'text-rose-600' : 'text-amber-600'"
                          >
                            {{ item.averageScore }}đ
                          </span>
                          <span class="text-[9px] text-[#8C827A] block mt-0.5">{{ item.practiceCount }} lượt</span>
                        </div>
                        <button
                          type="button"
                          (click)="playNativeAudio(item.word)"
                          class="w-6 h-6 rounded-[3px] bg-white hover:bg-stone-100 border border-[#E5DED3] text-[#7D6853] flex items-center justify-center cursor-pointer shadow-2xs"
                          title="Nghe phát âm chuẩn"
                        >
                          <app-icon name="volume-2" [size]="11"></app-icon>
                        </button>
                      </div>
                    </div>

                    <p class="text-[10px] text-rose-700 font-medium mt-1 pt-1 border-t border-[#E5DED3]/60 leading-snug">
                      ⚠️ {{ item.commonMistakeHint }}
                    </p>
                  </div>
                </div>

              </div>

            </div>

            <!-- 6.3 HÀNG 3: BẢNG NHẬT KÝ LUYỆN NÓI THỜI GIAN THỰC (LIVE LOGS) -->
            <div class="bg-white rounded-[4px] border border-[#E5DED3] p-3.5 sm:p-4 shadow-xs space-y-3">
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-3 border-b border-[#E5DED3]">
                <div>
                  <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823] tracking-tight flex items-center gap-2">
                    <span>Nhật ký chấm điểm luyện nói thời gian thực</span>
                    <span class="text-xs font-normal text-[#5C5249]">
                      ({{ filteredSpeechLogs().length }} bản ghi)
                    </span>
                  </h3>
                  <p class="text-[11px] text-[#5C5249] mt-0.5">
                    Toàn bộ phiên thu âm giọng nói của học sinh được lưu trữ và chấm điểm chi tiết.
                  </p>
                </div>

                <!-- Bộ lọc & Tìm kiếm -->
                <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div class="relative flex-1 sm:w-56">
                    <input 
                      type="text" 
                      [(ngModel)]="speechSearchTerm"
                      placeholder="Tìm theo từ, học viên..."
                      class="w-full pl-8 pr-3 py-1.5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
                    />
                    <app-icon name="search" [size]="13" svgClass="text-[#8C827A] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></app-icon>
                  </div>

                  <select 
                    [(ngModel)]="speechFilterTier"
                    class="px-2.5 py-1.5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#7D6853] focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Tất cả mức điểm</option>
                    <option value="NATIVE">Xuất sắc (≥ 90 điểm)</option>
                    <option value="FLUENT">Rất tốt (75 - 89 điểm)</option>
                    <option value="GOOD">Khá ổn (55 - 74 điểm)</option>
                    <option value="NEED_IMPROVE">Cần cố gắng (&lt; 55 điểm)</option>
                  </select>
                </div>
              </div>

              <!-- Bảng hiển thị nhật ký -->
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="border-b border-[#E5DED3] text-[11px] font-semibold tracking-wider text-[#7D6853] bg-[#FAF8F5]">
                      <th class="py-2.5 px-3">Học viên</th>
                      <th class="py-2.5 px-3">Từ vựng & câu luyện nói</th>
                      <th class="py-2.5 px-3">Điểm số AI</th>
                      <th class="py-2.5 px-3">Xếp loại SM-2</th>
                      <th class="py-2.5 px-3">Thời gian</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#E5DED3]/60">
                    <tr *ngFor="let log of filteredSpeechLogs()" class="hover:bg-[#FAF8F5]/60 transition-colors">
                      <!-- Học viên -->
                      <td class="py-2.5 px-3 font-semibold text-[#2D2823]">
                        <div class="flex items-center gap-2">
                          <div class="w-6 h-6 rounded-[2px] bg-[#7D6853] text-white flex items-center justify-center font-semibold text-xs uppercase">
                            {{ log.userName ? log.userName.charAt(0) : 'U' }}
                          </div>
                          <div>
                            <span class="block font-semibold text-xs text-[#2D2823]">{{ log.userName }}</span>
                            <span class="text-[10px] text-[#8C827A]">{{ log.userEmail }}</span>
                          </div>
                        </div>
                      </td>

                      <!-- Từ vựng -->
                      <td class="py-2.5 px-3">
                        <div class="flex items-center gap-2">
                          <div>
                            <div class="flex items-center gap-1.5">
                              <span class="font-serif font-semibold text-[#2D2823] text-xs sm:text-sm">{{ log.word }}</span>
                              <span class="text-[10px] font-mono text-[#7D6853]">{{ log.ipa }}</span>
                            </div>
                            <span class="text-[11px] text-[#5C5249] block">{{ log.vietnamese }}</span>
                          </div>
                          <button
                            type="button"
                            (click)="playNativeAudio(log.word)"
                            class="w-5 h-5 rounded-[2px] bg-stone-100 hover:bg-stone-200 text-[#7D6853] flex items-center justify-center cursor-pointer border-0"
                            title="Nghe từ này"
                          >
                            <app-icon name="volume-2" [size]="11"></app-icon>
                          </button>
                        </div>
                      </td>

                      <!-- Điểm số AI -->
                      <td class="py-2.5 px-3">
                        <div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] font-mono font-semibold text-xs"
                          [class.bg-emerald-50]="log.speechScore >= 85"
                          [class.text-emerald-800]="log.speechScore >= 85"
                          [class.border]="true"
                          [class.border-emerald-300]="log.speechScore >= 85"
                          [class.bg-sky-50]="log.speechScore >= 75 && log.speechScore < 85"
                          [class.text-sky-800]="log.speechScore >= 75 && log.speechScore < 85"
                          [class.border-sky-300]="log.speechScore >= 75 && log.speechScore < 85"
                          [class.bg-amber-50]="log.speechScore >= 55 && log.speechScore < 75"
                          [class.text-amber-800]="log.speechScore >= 55 && log.speechScore < 75"
                          [class.border-amber-300]="log.speechScore >= 55 && log.speechScore < 75"
                          [class.bg-rose-50]="log.speechScore < 55"
                          [class.text-rose-800]="log.speechScore < 55"
                          [class.border-rose-300]="log.speechScore < 55"
                        >
                          <app-icon 
                            [name]="log.speechScore >= 75 ? 'check' : log.speechScore >= 55 ? 'sparkles' : 'x'" 
                            [size]="11"
                          ></app-icon>
                          <span>{{ log.speechScore }} / 100</span>
                        </div>
                      </td>

                      <!-- Xếp loại SM-2 -->
                      <td class="py-2.5 px-3">
                        <span class="font-semibold text-xs text-[#2D2823] block">{{ log.ratingLabel }}</span>
                        <span class="text-[10px] text-[#8C827A]">{{ log.responseTimeMs }}ms phản xạ</span>
                      </td>

                      <!-- Thời gian -->
                      <td class="py-2.5 px-3 text-[#5C5249]">
                        <span class="font-medium">{{ log.timeAgo }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- Trạng thái trống -->
                <div *ngIf="filteredSpeechLogs().length === 0" class="py-8 text-center text-xs text-[#5C5249]">
                  <app-icon name="mic" [size]="20" svgClass="text-[#7D6853] mx-auto mb-2 opacity-60"></app-icon>
                  <p>Chưa có phiên luyện nói nào phù hợp với bộ lọc tìm kiếm.</p>
                </div>
              </div>

              <!-- Thanh phân trang nhật ký -->
              <div *ngIf="(speechAnalytics()?.totalPages ?? 1) > 1" class="pt-2.5 border-t border-[#E5DED3] flex items-center justify-between text-xs">
                <span class="text-[11px] text-[#5C5249]">
                  Trang {{ speechPage() + 1 }} / {{ speechAnalytics()?.totalPages }}
                </span>

                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    (click)="prevSpeechPage()"
                    [disabled]="speechPage() === 0"
                    class="px-2.5 py-1 rounded-[4px] border border-[#E5DED3] bg-white hover:bg-[#FAF8F5] text-[#2D2823] font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1"
                  >
                    <app-icon name="arrow-left" [size]="11"></app-icon>
                    <span>Trước</span>
                  </button>

                  <button
                    type="button"
                    (click)="nextSpeechPage()"
                    [disabled]="speechPage() >= (speechAnalytics()?.totalPages ?? 1) - 1"
                    class="px-2.5 py-1 rounded-[4px] border border-[#E5DED3] bg-white hover:bg-[#FAF8F5] text-[#2D2823] font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1"
                  >
                    <span>Sau</span>
                    <app-icon name="arrow-right" [size]="11"></app-icon>
                  </button>
                </div>
              </div>

            </div>

          </div>

          <!-- =========================================================================
               TAB 5: QUẢN LÝ LỚP HỌC (CLASSROOM MANAGEMENT)
               ========================================================================= -->
          <div *ngIf="activeTab === 'classrooms'" class="space-y-3.5 animate-fade-in">

            <!-- 5.1 LƯỚI 4 THẺ KPI LỚP HỌC -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              <!-- KPI 1: Tổng số phòng học -->
              <div class="bg-white rounded-[4px] border border-[#E5DED3] p-4 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-[10px] font-medium tracking-wider text-[#7D6853] uppercase">Tổng số lớp học</p>
                    <div class="flex items-baseline gap-1 mt-1">
                      <h3 class="font-serif font-semibold text-lg sm:text-xl text-[#2D2823] mt-1 mb-0.5">
                        {{ classroomStats()?.totalClassrooms ?? classroomTotalElements() }}
                      </h3>
                      <span class="text-xs font-mono font-normal text-[#8C827A]">phòng</span>
                    </div>
                  </div>
                  <div class="w-10 h-10 rounded-[4px] bg-[#FAF8F5] text-[#7D6853] border border-[#E5DED3] flex items-center justify-center shrink-0">
                    <app-icon name="layers" [size]="18" svgClass="text-[#7D6853]"></app-icon>
                  </div>
                </div>
                <p class="text-[11px] text-[#8C827A] mt-2 mb-0 border-t border-[#E5DED3]/60 pt-2 flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>{{ classroomStats()?.activeClassrooms ?? 0 }} phòng đang mở</span>
                </p>
              </div>

              <!-- KPI 2: Lớp học đang bị khóa -->
              <div class="bg-white rounded-[4px] border border-[#E5DED3] p-4 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-[10px] font-medium tracking-wider text-rose-700 uppercase">Phòng bị khóa / Tạm ẩn</p>
                    <div class="flex items-baseline gap-1 mt-1">
                      <h3 class="font-serif font-semibold text-lg sm:text-xl text-rose-800 mt-1 mb-0.5">
                        {{ classroomStats()?.lockedClassrooms ?? 0 }}
                      </h3>
                      <span class="text-xs font-mono font-normal text-rose-600">phòng</span>
                    </div>
                  </div>
                  <div class="w-10 h-10 rounded-[4px] bg-rose-50 text-rose-700 border border-rose-200/80 flex items-center justify-center shrink-0">
                    <app-icon name="shield" [size]="18" svgClass="text-rose-700"></app-icon>
                  </div>
                </div>
                <p class="text-[11px] text-[#8C827A] mt-2 mb-0 border-t border-[#E5DED3]/60 pt-2">
                  <span>Kiểm soát nội dung do người dùng tạo</span>
                </p>
              </div>

              <!-- KPI 3: Tổng từ vựng trong phòng -->
              <div class="bg-white rounded-[4px] border border-[#E5DED3] p-4 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-[10px] font-medium tracking-wider text-[#7D6853] uppercase">Tổng từ vựng lớp nạp</p>
                    <div class="flex items-baseline gap-1 mt-1">
                      <h3 class="font-serif font-semibold text-lg sm:text-xl text-[#2D2823] mt-1 mb-0.5">
                        {{ classroomStats()?.totalClassroomWords ?? 0 }}
                      </h3>
                      <span class="text-xs font-mono font-normal text-[#8C827A]">từ</span>
                    </div>
                  </div>
                  <div class="w-10 h-10 rounded-[4px] bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center justify-center shrink-0">
                    <app-icon name="book-open" [size]="18" svgClass="text-amber-800"></app-icon>
                  </div>
                </div>
                <p class="text-[11px] text-[#8C827A] mt-2 mb-0 border-t border-[#E5DED3]/60 pt-2">
                  <span>Từ sổ tay, AI trích xuất và nhập tay</span>
                </p>
              </div>

              <!-- KPI 4: Lượt học viên tham gia -->
              <div class="bg-white rounded-[4px] border border-[#E5DED3] p-4 shadow-xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-[10px] font-medium tracking-wider text-[#7D6853] uppercase">Lượt tham gia học</p>
                    <div class="flex items-baseline gap-1 mt-1">
                      <h3 class="font-serif font-semibold text-lg sm:text-xl text-[#2D2823] mt-1 mb-0.5">
                        {{ classroomStats()?.totalClassroomMembers ?? 0 }}
                      </h3>
                      <span class="text-xs font-mono font-normal text-[#8C827A]">lượt</span>
                    </div>
                  </div>
                  <div class="w-10 h-10 rounded-[4px] bg-blue-50 text-blue-800 border border-blue-200/80 flex items-center justify-center shrink-0">
                    <app-icon name="users" [size]="18" svgClass="text-blue-800"></app-icon>
                  </div>
                </div>
                <p class="text-[11px] text-[#8C827A] mt-2 mb-0 border-t border-[#E5DED3]/60 pt-2">
                  <span>{{ classroomStats()?.totalQuizAttempts ?? 0 }} lượt làm bài thi trắc nghiệm</span>
                </p>
              </div>

            </div>

            <!-- 5.2 BẢNG DANH SÁCH LỚP HỌC KÈM THANH TÌM KIẾM & BỘ LỌC -->
            <div class="bg-white rounded-[4px] border border-[#E5DED3] p-3.5 sm:p-4 shadow-xs space-y-3">
              
              <!-- Search & Filter Controls -->
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-3 border-b border-[#E5DED3]">
                <div>
                  <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823] tracking-tight flex items-center gap-2">
                    <span>Danh sách lớp học & Bộ từ chia sẻ</span>
                    <span class="text-xs font-normal text-[#5C5249]">
                      ({{ classroomTotalElements() }} lớp học)
                    </span>
                  </h3>
                  <p class="text-[11px] text-[#5C5249] mt-0.5">
                    Quản lý các phòng học ảo, kiểm duyệt từ vựng nhập tay và theo dõi tiến độ Flashcard.
                  </p>
                </div>

                <!-- Input Tìm Kiếm & Bộ Lọc Trạng Thái -->
                <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div class="relative flex-1 sm:w-60">
                    <input 
                      type="text" 
                      [(ngModel)]="classroomSearchInput"
                      (keyup.enter)="onClassroomSearch()"
                      placeholder="Tìm theo mã phòng, tên, chủ phòng..."
                      class="w-full pl-8 pr-3 py-1.5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
                    />
                    <app-icon name="search" [size]="13" svgClass="text-[#8C827A] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></app-icon>
                  </div>

                  <select 
                    [(ngModel)]="classroomFilterStatus"
                    (change)="onClassroomFilterChange()"
                    class="px-2.5 py-1.5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#7D6853] focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Tất cả trạng thái</option>
                    <option value="ACTIVE">Đang mở (Active)</option>
                    <option value="LOCKED">Đã khóa (Locked)</option>
                  </select>

                  <select 
                    [(ngModel)]="classroomSort"
                    (change)="onClassroomSortChange()"
                    class="px-2.5 py-1.5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-medium text-[#5C5249] focus:outline-none cursor-pointer"
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="members">Nhiều thành viên nhất</option>
                    <option value="words">Nhiều từ vựng nhất</option>
                    <option value="oldest">Cũ nhất</option>
                  </select>
                </div>
              </div>

              <!-- Bảng hiển thị danh sách phòng -->
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr class="border-b border-[#E5DED3] bg-[#FAF8F5] text-[#7D6853] uppercase text-[10px] tracking-wider font-semibold">
                      <th class="py-2.5 px-3">Mã phòng</th>
                      <th class="py-2.5 px-3">Tên lớp học & Chủ phòng</th>
                      <th class="py-2.5 px-3 text-center">Cấp độ</th>
                      <th class="py-2.5 px-3 text-center">Từ vựng</th>
                      <th class="py-2.5 px-3 text-center">Thành viên</th>
                      <th class="py-2.5 px-3 text-center">Bài thi</th>
                      <th class="py-2.5 px-3 text-center">Trạng thái</th>
                      <th class="py-2.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#E5DED3]/60">
                    <tr *ngFor="let room of classroomsList()" class="hover:bg-[#FAF8F5]/80 transition-colors">
                      <!-- Mã Code -->
                      <td class="py-2.5 px-3">
                        <span class="font-mono font-semibold text-xs px-2 py-0.5 rounded-[3px] bg-amber-50 text-amber-900 border border-amber-200">
                          {{ room.code }}
                        </span>
                      </td>

                      <!-- Tên lớp học & Chủ phòng -->
                      <td class="py-2.5 px-3">
                        <div class="font-serif font-semibold text-xs sm:text-sm text-[#2D2823] leading-tight">
                          {{ room.name }}
                        </div>
                        <div class="text-[11px] text-[#746B60] flex items-center gap-1 mt-0.5">
                          <span class="font-medium text-[#7D6853]">{{ room.ownerFullName || room.ownerUsername }}</span>
                          <span *ngIf="room.ownerEmail" class="text-[#8C827A]">({{ room.ownerEmail }})</span>
                        </div>
                      </td>

                      <!-- Cấp độ -->
                      <td class="py-2.5 px-3 text-center">
                        <span class="px-1.5 py-0.5 rounded-[2px] font-mono font-semibold text-[10px] bg-[#F1ECE3] text-[#7D6853] border border-[#E5DED3]">
                          {{ room.targetLevel || 'A2' }}
                        </span>
                      </td>

                      <!-- Số từ vựng -->
                      <td class="py-2.5 px-3 text-center font-mono font-semibold text-[#2D2823]">
                        {{ room.wordsCount }} từ
                      </td>

                      <!-- Số thành viên -->
                      <td class="py-2.5 px-3 text-center font-mono text-[#5C5249]">
                        {{ room.memberCount }} người
                      </td>

                      <!-- Số bài thi nộp -->
                      <td class="py-2.5 px-3 text-center font-mono text-[#5C5249]">
                        {{ room.quizAttemptCount }} lượt
                      </td>

                      <!-- Trạng thái -->
                      <td class="py-2.5 px-3 text-center">
                        <span 
                          *ngIf="room.status !== 'LOCKED'"
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-emerald-50 text-emerald-800 border border-emerald-200"
                        >
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Đang mở</span>
                        </span>
                        <span 
                          *ngIf="room.status === 'LOCKED'"
                          class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-rose-50 text-rose-800 border border-rose-200"
                        >
                          <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          <span>Đã khóa</span>
                        </span>
                      </td>

                      <!-- Thao tác -->
                      <td class="py-2.5 px-3 text-right whitespace-nowrap">
                        <div class="inline-flex items-center gap-1.5 whitespace-nowrap flex-nowrap shrink-0">
                          <!-- Nút Xem Chi Tiết & Kiểm Duyệt -->
                          <button
                            type="button"
                            (click)="viewClassroomDetail(room.id)"
                            class="px-2 py-1 rounded-[3px] bg-white hover:bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#7D6853] cursor-pointer transition-all inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                            title="Xem chi tiết bộ từ vựng và tiến độ học viên"
                          >
                            <app-icon name="eye" [size]="12"></app-icon>
                            <span>Chi tiết</span>
                          </button>

                          <!-- Nút Khóa / Mở Khóa -->
                          <button
                            type="button"
                            (click)="toggleClassroomStatus(room)"
                            class="px-2 py-1 rounded-[3px] text-xs font-semibold cursor-pointer transition-all inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                            [ngClass]="room.status === 'LOCKED' ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'"
                            [title]="room.status === 'LOCKED' ? 'Mở khóa lớp học này' : 'Khóa lớp học này lại'"
                          >
                            <app-icon [name]="room.status === 'LOCKED' ? 'check-circle' : 'shield'" [size]="12"></app-icon>
                            <span>{{ room.status === 'LOCKED' ? 'Mở' : 'Khóa' }}</span>
                          </button>

                          <!-- Nút Xóa -->
                          <button
                            type="button"
                            (click)="openDeleteClassroomModal(room)"
                            class="px-2 py-1 rounded-[3px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold cursor-pointer transition-all inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                            title="Xóa vĩnh viễn phòng học"
                          >
                            <app-icon name="trash" [size]="12" svgClass="text-rose-600"></app-icon>
                            <span>Xóa</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <!-- Trạng thái trống -->
                <div *ngIf="classroomsList().length === 0" class="py-12 text-center text-xs text-[#5C5249]">
                  <app-icon name="layers" [size]="28" svgClass="text-[#7D6853] mx-auto mb-2 opacity-50"></app-icon>
                  <p class="font-serif font-semibold text-xs sm:text-sm text-[#2D2823]">Không tìm thấy lớp học nào</p>
                  <p class="text-[11px] text-[#8C827A] mt-1">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái phía trên.</p>
                </div>
              </div>

              <!-- Thanh phân trang -->
              <div *ngIf="classroomTotalPages() > 1" class="pt-2.5 border-t border-[#E5DED3] flex items-center justify-between text-xs">
                <span class="text-[11px] text-[#5C5249]">
                  Trang {{ classroomCurrentPage() + 1 }} / {{ classroomTotalPages() }} (Tổng số {{ classroomTotalElements() }} lớp)
                </span>

                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    (click)="changeClassroomPage(classroomCurrentPage() - 1)"
                    [disabled]="classroomCurrentPage() === 0"
                    class="px-2.5 py-1 rounded-[4px] border border-[#E5DED3] bg-white hover:bg-[#FAF8F5] text-[#2D2823] font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1"
                  >
                    <app-icon name="arrow-left" [size]="11"></app-icon>
                    <span>Trước</span>
                  </button>

                  <button
                    type="button"
                    (click)="changeClassroomPage(classroomCurrentPage() + 1)"
                    [disabled]="classroomCurrentPage() >= classroomTotalPages() - 1"
                    class="px-2.5 py-1 rounded-[4px] border border-[#E5DED3] bg-white hover:bg-[#FAF8F5] text-[#2D2823] font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1"
                  >
                    <span>Sau</span>
                    <app-icon name="arrow-right" [size]="11"></app-icon>
                  </button>
                </div>
              </div>

            </div>

          </div>

          <!-- =========================================================================
               TAB 9: KHẢO THÍ & CHỨNG CHỈ CEFR
               ========================================================================= -->
          <!-- =========================================================================
               PHÂN HỆ 9: KHẢO THÍ & CHỨNG CHỈ CEFR
               - SubTab 1: Khung danh mục các loại chứng chỉ (Certificate Types Catalog)
               - SubTab 2: Danh sách chứng chỉ đã cấp cho học viên (Issued Certificates)
               ========================================================================= -->
          <div *ngIf="activeTab === 'certificates'" class="space-y-4 animate-fade-in">
            
            <!-- Segmented Sub-Tab Switcher -->
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-[#E5DED3]">
              <div class="flex items-center gap-1.5 p-1 rounded-[6px] bg-[#EFEAE1]/70 border border-[#E5DED3]">
                <button
                  type="button"
                  (click)="certSubTab.set('types')"
                  class="px-3.5 py-1.5 rounded-[4px] text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
                  [class.bg-white]="certSubTab() === 'types'"
                  [class.text-[#2D2823]]="certSubTab() === 'types'"
                  [class.shadow-2xs]="certSubTab() === 'types'"
                  [class.text-[#7D6853]]="certSubTab() !== 'types'"
                  [class.hover:text-[#2D2823]]="certSubTab() !== 'types'"
                >
                  <app-icon name="award" [size]="14"></app-icon>
                  <span>Danh mục loại chứng chỉ ({{ certificateTypes().length }})</span>
                </button>

                <button
                  type="button"
                  (click)="certSubTab.set('issued')"
                  class="px-3.5 py-1.5 rounded-[4px] text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
                  [class.bg-white]="certSubTab() === 'issued'"
                  [class.text-[#2D2823]]="certSubTab() === 'issued'"
                  [class.shadow-2xs]="certSubTab() === 'issued'"
                  [class.text-[#7D6853]]="certSubTab() !== 'issued'"
                  [class.hover:text-[#2D2823]]="certSubTab() !== 'issued'"
                >
                  <app-icon name="file-text" [size]="14"></app-icon>
                  <span>Học viên đã được cấp ({{ adminCertificates().length }})</span>
                </button>
              </div>

              <!-- Nút hành động tương ứng với SubTab -->
              <div class="flex items-center gap-2 self-end sm:self-auto">
                <button
                  *ngIf="certSubTab() === 'types'"
                  type="button"
                  (click)="openCreateCertTypeModal()"
                  class="px-3 py-1.5 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold border-0 cursor-pointer flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
                  title="Thêm một dạng loại chứng chỉ khảo thí mới"
                >
                  <app-icon name="plus" [size]="13" svgClass="text-white"></app-icon>
                  <span>+ Thêm dạng chứng chỉ mới</span>
                </button>

                <button
                  *ngIf="certSubTab() === 'issued'"
                  type="button"
                  (click)="openManualCertModal()"
                  class="px-3 py-1.5 rounded-[4px] bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold border-0 cursor-pointer flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
                  title="Cấp chứng chỉ đặc cách cho một học viên"
                >
                  <app-icon name="plus" [size]="13" svgClass="text-white"></app-icon>
                  <span>Cấp chứng chỉ đặc cách</span>
                </button>

                <button
                  type="button"
                  (click)="certSubTab() === 'types' ? loadCertificateTypes() : loadAdminCertificates()"
                  class="px-3 py-1.5 rounded-[4px] bg-[#FAF8F5] hover:bg-[#E5DED3]/60 text-[#2D2823] text-xs font-medium border border-[#E5DED3] cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <app-icon name="refresh-cw" [size]="12"></app-icon>
                  <span>Làm mới</span>
                </button>
              </div>
            </div>

            <!-- ================= SUB-TAB 1: DANH MỤC CÁC LOẠI CHỨNG CHỈ (TYPES CATALOG) ================= -->
            <div *ngIf="certSubTab() === 'types'" class="space-y-4">
              <!-- Banner giới thiệu -->
              <div class="bg-white p-4 rounded-[4px] border border-[#E5DED3] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 class="font-serif font-semibold text-base text-[#2D2823]">
                    Khung danh mục các loại chứng chỉ trong hệ thống
                  </h3>
                  <p class="text-xs text-[#746B60] mt-0.5">
                    Định nghĩa các chuẩn khảo thí (CEFR A1 - C1, IELTS, TOEIC...), tiêu chí từ vựng SM-2 và chuỗi ngày học để học viên chinh phục.
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0 text-xs">
                  <span class="px-2.5 py-1 rounded-[3px] bg-[#FAF8F5] border border-[#E5DED3] font-mono font-semibold text-[#7D6853]">
                    {{ certificateTypes().length }} loại chứng chỉ
                  </span>
                </div>
              </div>

              <!-- Lưới các loại chứng chỉ hiện tại (Grid Cards) -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div 
                  *ngFor="let t of certificateTypes()" 
                  class="bg-white rounded-[4px] border border-[#E5DED3] shadow-xs hover:shadow-md transition-all p-4 flex flex-col justify-between space-y-3.5 relative overflow-hidden group"
                >
                  <!-- Vạch màu nhận diện trên đầu card -->
                  <div class="absolute top-0 left-0 right-0 h-1" [style.backgroundColor]="t.badgeColor || '#7D6853'"></div>

                  <div>
                    <!-- Badge & Status Header -->
                    <div class="flex items-center justify-between gap-2 mb-2">
                      <span 
                        class="px-2 py-0.5 rounded-[2px] font-mono font-bold text-xs text-white shadow-2xs"
                        [style.backgroundColor]="t.badgeColor || '#7D6853'"
                      >
                        {{ t.typeCode }}
                      </span>

                      <span 
                        class="text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap"
                        [class.bg-emerald-50]="t.isActive"
                        [class.text-emerald-700]="t.isActive"
                        [class.border-emerald-200]="t.isActive"
                        [class.bg-stone-50]="!t.isActive"
                        [class.text-stone-500]="!t.isActive"
                        [class.border-stone-200]="!t.isActive"
                      >
                        {{ t.isActive ? 'Đang áp dụng' : 'Tạm dừng' }}
                      </span>
                    </div>

                    <!-- Title -->
                    <h4 class="font-serif font-semibold text-sm text-[#2D2823] leading-snug group-hover:text-[#7D6853] transition-colors">
                      {{ t.title }}
                    </h4>

                    <!-- Description -->
                    <p class="text-[11px] text-[#746B60] mt-1 line-clamp-2 leading-relaxed">
                      {{ t.description || 'Chưa có mô tả tiêu chuẩn cho chứng chỉ này.' }}
                    </p>

                    <!-- Criteria Box -->
                    <div class="grid grid-cols-2 gap-2 mt-3 p-2.5 rounded-[3px] bg-[#FAF8F5] border border-[#E5DED3]/80 text-[11px]">
                      <div>
                        <span class="text-[#8C827A] block text-[10px] uppercase font-medium">Từ tinh thông</span>
                        <strong class="text-[#2D2823] font-mono font-semibold">{{ t.requiredWords }}</strong> từ chuẩn SM-2
                      </div>
                      <div>
                        <span class="text-[#8C827A] block text-[10px] uppercase font-medium">Chuỗi ngày học</span>
                        <strong class="text-amber-800 font-mono font-semibold">{{ t.requiredStreak }}</strong> ngày liên tục
                      </div>
                    </div>

                    <!-- Issuer & Total Issued -->
                    <div class="mt-2.5 flex items-center justify-between text-[11px] text-[#746B60]">
                      <span class="truncate max-w-[170px]" [title]="t.approvedBy">{{ t.approvedBy }}</span>
                      <span class="font-medium text-[#2D2823] shrink-0 font-mono">
                        <strong>{{ t.totalIssued }}</strong> đã cấp
                      </span>
                    </div>
                  </div>

                  <!-- Card Action Buttons -->
                  <div class="pt-3 border-t border-[#E5DED3]/70 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      (click)="previewCertType(t)"
                      class="px-2.5 py-1 rounded-[3px] bg-white hover:bg-[#FAF8F5] text-[#7D6853] text-xs font-semibold border border-[#E5DED3] cursor-pointer transition-colors inline-flex items-center gap-1"
                      title="Xem trước mẫu chứng chỉ khi in ấn"
                    >
                      <app-icon name="eye" [size]="12"></app-icon>
                      <span>Xem mẫu</span>
                    </button>

                    <div class="flex items-center gap-1.5">
                      <button
                        type="button"
                        (click)="openEditCertTypeModal(t)"
                        class="px-2.5 py-1 rounded-[3px] bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-200 cursor-pointer transition-colors inline-flex items-center gap-1"
                        title="Chỉnh sửa tiêu chuẩn loại chứng chỉ"
                      >
                        <app-icon name="edit" [size]="12"></app-icon>
                        <span>Sửa</span>
                      </button>

                      <button
                        type="button"
                        (click)="openDeleteCertTypeModal(t)"
                        class="p-1 rounded-[3px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer transition-colors inline-flex items-center justify-center"
                        title="Xóa loại chứng chỉ này"
                      >
                        <app-icon name="trash" [size]="12"></app-icon>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Empty state for types -->
                <div *ngIf="certificateTypes().length === 0" class="col-span-full py-12 text-center text-xs text-[#8C827A] bg-white rounded-[4px] border border-[#E5DED3]">
                  Chưa có loại chứng chỉ nào trong hệ thống. Hãy bấm "+ Thêm dạng chứng chỉ mới" để khởi tạo!
                </div>
              </div>
            </div>

            <!-- ================= SUB-TAB 2: DANH SÁCH HỌC VIÊN ĐÃ ĐƯỢC CẤP (ISSUED) ================= -->
            <div *ngIf="certSubTab() === 'issued'" class="space-y-4">
              <!-- Top Metric Cards -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="bg-white p-4 rounded-[4px] border border-[#E5DED3] shadow-2xs">
                  <span class="text-[10px] uppercase font-bold text-[#8C827A] block">Tổng chứng chỉ</span>
                  <strong class="font-mono text-2xl font-bold text-[#2D2823] block mt-1">
                    {{ adminCertificates().length }}
                  </strong>
                  <span class="text-[11px] text-[#746B60] block mt-0.5">Đã lưu trữ trên CSDL</span>
                </div>

                <div class="bg-white p-4 rounded-[4px] border border-[#E5DED3] shadow-2xs">
                  <span class="text-[10px] uppercase font-bold text-[#059669] block">Chuẩn CEFR A1 / A2</span>
                  <strong class="font-mono text-2xl font-bold text-[#059669] block mt-1">
                    {{ countCertsByLevels(['A1', 'A2']) }}
                  </strong>
                  <span class="text-[11px] text-[#746B60] block mt-0.5">Sơ cấp & Cơ bản</span>
                </div>

                <div class="bg-white p-4 rounded-[4px] border border-[#E5DED3] shadow-2xs">
                  <span class="text-[10px] uppercase font-bold text-[#4F46E5] block">Chuẩn CEFR B1 / B2</span>
                  <strong class="font-mono text-2xl font-bold text-[#4F46E5] block mt-1">
                    {{ countCertsByLevels(['B1', 'B2']) }}
                  </strong>
                  <span class="text-[11px] text-[#746B60] block mt-0.5">Trung cấp & Nâng cao</span>
                </div>

                <div class="bg-white p-4 rounded-[4px] border border-[#E5DED3] shadow-2xs">
                  <span class="text-[10px] uppercase font-bold text-[#B45309] block">Chuẩn CEFR C1</span>
                  <strong class="font-mono text-2xl font-bold text-[#B45309] block mt-1">
                    {{ countCertsByLevels(['C1']) }}
                  </strong>
                  <span class="text-[11px] text-[#746B60] block mt-0.5">Tinh anh học thuật</span>
                </div>
              </div>

              <!-- Filter & Action Bar -->
              <div class="bg-white p-3.5 rounded-[4px] border border-[#E5DED3] flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                <!-- CEFR Filter Tabs -->
                <div class="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                  <button
                    type="button"
                    *ngFor="let lvl of ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1']"
                    (click)="certFilterLevel.set(lvl)"
                    class="px-2.5 py-1 text-xs rounded-[4px] border cursor-pointer transition-colors"
                    [class.bg-[#7D6853]]="certFilterLevel() === lvl"
                    [class.text-white]="certFilterLevel() === lvl"
                    [class.border-[#7D6853]]="certFilterLevel() === lvl"
                    [class.bg-[#FAF8F5]]="certFilterLevel() !== lvl"
                    [class.text-[#2D2823]]="certFilterLevel() !== lvl"
                    [class.border-[#E5DED3]]="certFilterLevel() !== lvl"
                  >
                    {{ lvl === 'ALL' ? 'Tất cả cấp độ' : ('Level ' + lvl) }}
                  </button>
                </div>
              </div>

              <!-- Table of Certificates -->
              <div class="bg-white rounded-[4px] border border-[#E5DED3] shadow-xs overflow-hidden">
                <div class="overflow-x-auto">
                  <table class="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr class="bg-[#FAF8F5] border-b border-[#E5DED3] text-[#746B60] uppercase text-[10px] font-bold tracking-wider">
                        <th class="py-3 px-4">Mã chứng chỉ & Tiêu đề</th>
                        <th class="py-3 px-4">Học viên</th>
                        <th class="py-3 px-4 text-center">Cấp độ CEFR</th>
                        <th class="py-3 px-4 text-center">Từ tinh thông (SM-2)</th>
                        <th class="py-3 px-4">Ngày cấp & Thẩm định</th>
                        <th class="py-3 px-4 text-center whitespace-nowrap w-32">Trạng thái</th>
                        <th class="py-3 px-4 text-right whitespace-nowrap min-w-[220px]">Quản lý & Thao tác</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[#E5DED3]/60">
                      <tr *ngFor="let cert of filteredAdminCertificates()" class="hover:bg-[#FAF8F5]/60 transition-colors">
                        <td class="py-3 px-4">
                          <strong class="font-mono text-[#7D6853] block">{{ cert.certificateCode }}</strong>
                          <span class="text-[11px] text-[#746B60] block mt-0.5">{{ cert.title }}</span>
                        </td>

                        <td class="py-3 px-4">
                          <strong class="font-serif text-[#2D2823] block">{{ cert.userFullName || cert.username }}</strong>
                          <span class="font-mono text-[11px] text-[#8C827A] block">@{{ cert.username }}</span>
                        </td>

                        <td class="py-3 px-4 text-center">
                          <span class="px-2 py-0.5 rounded-[2px] font-mono font-bold text-[11px] bg-[#FAF8F5] border border-[#E5DED3] text-[#7D6853]">
                            {{ cert.cefrLevel }}
                          </span>
                        </td>

                        <td class="py-3 px-4 text-center font-mono">
                          <strong class="text-[#2D2823]">{{ cert.masteredWordsCount }}</strong> từ
                          <span class="text-[10px] text-[#8C827A] block">Chuỗi {{ cert.streakCount }} ngày</span>
                        </td>

                        <td class="py-3 px-4">
                          <span class="text-[#2D2823] block">{{ cert.issueDate | date:'dd/MM/yyyy HH:mm' }}</span>
                          <span class="text-[11px] text-[#746B60] block">{{ cert.approvedBy }}</span>
                        </td>

                        <td class="py-3 px-4 text-center whitespace-nowrap">
                          <span 
                            *ngIf="cert.status === 'ISSUED'"
                            class="px-2 py-0.5 rounded-[2px] text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap inline-flex items-center"
                          >
                            Đã phát hành
                          </span>
                          <span 
                            *ngIf="cert.status === 'PENDING'"
                            class="px-2 py-0.5 rounded-[2px] text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap inline-flex items-center"
                          >
                            Chờ duyệt
                          </span>
                          <span 
                            *ngIf="cert.status === 'REVOKED'"
                            class="px-2 py-0.5 rounded-[2px] text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap inline-flex items-center"
                          >
                            Đã thu hồi
                          </span>
                        </td>

                        <td class="py-3 px-4 text-right whitespace-nowrap">
                          <div class="flex items-center justify-end gap-1.5 whitespace-nowrap flex-nowrap shrink-0">
                            <!-- Nút Xem chi tiết bản in -->
                            <button
                              type="button"
                              (click)="activeCertPreview.set(cert)"
                              class="px-2 py-1 rounded-[3px] bg-white hover:bg-[#FAF8F5] text-[#7D6853] text-[11px] font-medium border border-[#E5DED3] cursor-pointer transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                              title="Xem chi tiết bản in chứng chỉ"
                            >
                              <app-icon name="eye" [size]="11"></app-icon>
                              <span>Xem</span>
                            </button>

                            <!-- Nút Điều chỉnh chứng chỉ -->
                            <button
                              type="button"
                              (click)="openEditCertModal(cert)"
                              class="px-2 py-1 rounded-[3px] bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-medium border border-amber-200 cursor-pointer transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                              title="Điều chỉnh thông tin chứng chỉ này"
                            >
                              <app-icon name="edit" [size]="11"></app-icon>
                              <span>Sửa</span>
                            </button>

                            <!-- Nút Phê duyệt / Thu hồi nhanh -->
                            <button
                              *ngIf="cert.status === 'PENDING' || cert.status === 'REVOKED'"
                              type="button"
                              (click)="approveAdminCertificate(cert)"
                              class="px-2 py-1 rounded-[3px] bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold border-0 cursor-pointer shadow-2xs transition-all inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                              title="Phê duyệt phát hành chính thức"
                            >
                              <app-icon name="check" [size]="11" svgClass="text-white"></app-icon>
                              <span>Duyệt</span>
                            </button>

                            <button
                              *ngIf="cert.status === 'ISSUED'"
                              type="button"
                              (click)="toggleRevokeCert(cert)"
                              class="px-2 py-1 rounded-[3px] bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-medium border border-stone-300 cursor-pointer transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                              title="Thu hồi chứng chỉ này"
                            >
                              <app-icon name="shield" [size]="11"></app-icon>
                              <span>Thu hồi</span>
                            </button>

                            <!-- Nút Xóa vĩnh viễn -->
                            <button
                              type="button"
                              (click)="openDeleteCertModal(cert)"
                              class="p-1 rounded-[3px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer transition-colors shrink-0 inline-flex items-center justify-center"
                              title="Xóa vĩnh viễn chứng chỉ khỏi CSDL"
                            >
                              <app-icon name="trash" [size]="11"></app-icon>
                            </button>
                          </div>
                        </td>
                      </tr>

                      <tr *ngIf="filteredAdminCertificates().length === 0">
                        <td colspan="7" class="py-12 text-center text-xs text-[#8C827A]">
                          Chưa có chứng chỉ nào trong phân nhóm này. Học viên sẽ được cấp chứng chỉ khi hoàn thành mục tiêu từ vựng CEFR.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>

          <!-- Chân trang quản trị (Admin Editorial Footer) -->
          <footer class="pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8C827A] border-t border-[#E5DED3]/60">
            <span class="font-serif italic font-medium text-[#7D6853]">Vocario Academic Operations</span>
            <span class="text-[11px] text-[#8C827A]">Dữ liệu kiến trúc mẫu vận hành, không phát tán dữ liệu hệ thống trực tiếp.</span>
          </footer>

        </div>

      </main>

    </div>

    <!-- =========================================================================
         3. MODAL: THÊM & CHỈNH SỬA TỪ VỰNG KÈM LIVE PREVIEW FLASHCARD
         ========================================================================= -->
    <div 
      *ngIf="wordModalOpen()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
    >
      <div class="w-full max-w-4xl bg-white rounded-[4px] border border-[#E5DED3] shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        
        <!-- Header Modal -->
        <div class="p-4 sm:p-5 border-b border-[#E5DED3] flex items-center justify-between bg-white shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-[#7D6853] shrink-0">
              <app-icon [name]="wordModalMode() === 'create' ? 'plus' : 'edit-3'" [size]="16"></app-icon>
            </div>
            <div>
              <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823] tracking-tight">
                {{ wordModalMode() === 'create' ? 'Thêm mục từ CEFR mới vào kho' : 'Chỉnh sửa từ vựng: ' + formWord }}
              </h3>
              <p class="text-xs text-[#8C827A] mt-0.5">
                Thông tin chuẩn hóa phục vụ học viên quét ảnh AI Vision và luyện Flashcard SM-2.
              </p>
            </div>
          </div>

          <button 
            type="button"
            (click)="closeWordModal()"
            class="p-2 rounded-[4px] text-[#8C827A] hover:bg-[#FAF8F5] hover:text-[#2D2823] border-0 bg-transparent cursor-pointer transition-colors"
          >
            <app-icon name="x" [size]="16"></app-icon>
          </button>
        </div>

        <!-- Body Modal: 2 Cột (Trái: Form Nhập Liệu - Phải: Live Preview Flashcard) -->
        <div class="p-4 sm:p-5 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          <!-- CỘT TRÁI (7/12): Form Nhập Liệu -->
          <div class="lg:col-span-7 space-y-3.5">
            
            <!-- Hàng 1: Từ Tiếng Anh & Cấp độ CEFR -->
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div class="sm:col-span-8 space-y-1">
                <label class="block text-xs font-semibold text-[#2D2823]">
                  Từ vựng tiếng Anh <span class="text-rose-500">*</span>
                </label>
                <input 
                  type="text" 
                  [(ngModel)]="formWord"
                  placeholder="Ví dụ: bookshelf, microwave..."
                  class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-medium text-[#2D2823] focus:outline-none focus:border-[#7D6853] focus:ring-1 focus:ring-[#7D6853] transition-all"
                />
              </div>

              <div class="sm:col-span-4 space-y-1">
                <label class="block text-xs font-semibold text-[#2D2823]">
                  Cấp độ CEFR
                </label>
                <select 
                  [(ngModel)]="formCefrLevel"
                  class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#7D6853] focus:outline-none focus:border-[#7D6853] cursor-pointer"
                >
                  <option value="A1">A1 — Sơ cấp 1</option>
                  <option value="A2">A2 — Sơ cấp 2</option>
                  <option value="B1">B1 — Trung cấp 1</option>
                  <option value="B2">B2 — Trung cấp 2</option>
                  <option value="C1">C1 — Cao cấp</option>
                  <option value="C2">C2 — Bản xứ</option>
                </select>
              </div>
            </div>

            <!-- Hàng 2: Phiên Âm IPA & Loại từ -->
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div class="sm:col-span-7 space-y-1">
                <label class="block text-xs font-semibold text-[#2D2823]">
                  Phiên âm IPA
                </label>
                <input 
                  type="text" 
                  [(ngModel)]="formPhoneticIpa"
                  placeholder="Ví dụ: /ˈbʊk.ʃelf/"
                  class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-mono text-[#7D6853] focus:outline-none focus:border-[#7D6853] focus:ring-1 focus:ring-[#7D6853] transition-all"
                />
              </div>

              <div class="sm:col-span-5 space-y-1">
                <label class="block text-xs font-semibold text-[#2D2823]">
                  Từ loại
                </label>
                <select 
                  [(ngModel)]="formPartOfSpeech"
                  class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-medium text-[#2D2823] focus:outline-none focus:border-[#7D6853] cursor-pointer"
                >
                  <option value="Noun">Danh từ (Noun)</option>
                  <option value="Verb">Động từ (Verb)</option>
                  <option value="Adjective">Tính từ (Adjective)</option>
                  <option value="Adverb">Trạng từ (Adverb)</option>
                  <option value="Phrase">Cụm từ (Phrase)</option>
                </select>
              </div>
            </div>

            <!-- Hàng 3: Nghĩa Tiếng Việt -->
            <div class="space-y-1">
              <label class="block text-xs font-semibold text-[#2D2823]">
                Nghĩa tiếng Việt <span class="text-rose-500">*</span>
              </label>
              <input 
                type="text" 
                [(ngModel)]="formVietnameseMeaning"
                placeholder="Ví dụ: Kệ sách mini, giá sách gỗ..."
                class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-medium text-[#2D2823] focus:outline-none focus:border-[#7D6853] focus:ring-1 focus:ring-[#7D6853] transition-all"
              />
            </div>

            <!-- Hàng 4: Định nghĩa tiếng Anh & Chủ đề -->
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div class="sm:col-span-8 space-y-1">
                <label class="block text-xs font-semibold text-[#2D2823]">
                  Định nghĩa tiếng Anh (Definition)
                </label>
                <input 
                  type="text" 
                  [(ngModel)]="formDefinitionEn"
                  placeholder="A piece of furniture with shelves used to hold books."
                  class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
                />
              </div>

              <div class="sm:col-span-4 space-y-1">
                <label class="block text-xs font-semibold text-[#2D2823]">
                  Chủ đề (Category)
                </label>
                <input 
                  type="text" 
                  [(ngModel)]="formCategory"
                  placeholder="Kitchen, Study, Living Room..."
                  class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
                />
              </div>
            </div>

            <!-- Hàng 5: Câu Ví Dụ Ngữ Cảnh (EN & VI) -->
            <div class="space-y-2 pt-2 border-t border-[#E5DED3]">
              <label class="block text-xs font-semibold text-[#2D2823]">
                Ví dụ ngữ cảnh đời sống
              </label>
              <input 
                type="text" 
                [(ngModel)]="formExampleSentenceEn"
                placeholder="Câu tiếng Anh: The bookshelf contains dictionaries and study guides."
                class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs italic text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
              />
              <input 
                type="text" 
                [(ngModel)]="formExampleSentenceVi"
                placeholder="Bản dịch tiếng Việt: Chiếc giá sách chứa các cuốn từ điển và tài liệu ôn tập."
                class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs text-[#5C5249] focus:outline-none focus:border-[#7D6853]"
              />
            </div>

          </div>

          <!-- CỘT PHẢI (5/12): Live Preview Thẻ Flashcard Người Học -->
          <div class="lg:col-span-5 bg-[#FAF8F5] rounded-[4px] border border-[#E5DED3] p-4 flex flex-col justify-between space-y-3.5">
            
            <div class="flex items-center justify-between pb-2.5 border-b border-[#E5DED3]">
              <span class="text-[11px] font-semibold tracking-wider text-[#7D6853] flex items-center gap-1.5">
                <app-icon name="sparkles" [size]="13"></app-icon>
                <span>Xem trước thẻ SM-2</span>
              </span>
              <span class="text-[10px] text-[#8C827A]">Giao diện người học</span>
            </div>

            <!-- Khối Thẻ Mô Phỏng Flashcard -->
            <div class="bg-white rounded-[4px] border border-[#E5DED3] p-5 shadow-xs text-center space-y-2.5 relative overflow-hidden min-h-[200px] flex flex-col justify-center">
              
              <!-- Badge Cấp độ góc thẻ -->
              <div class="flex items-center justify-between w-full">
                <span 
                  class="px-2 py-0.5 rounded-[2px] text-[10px] font-semibold"
                  [ngClass]="getCefrBadgeClass(formCefrLevel)"
                >
                  {{ formCefrLevel }} • {{ formPartOfSpeech }}
                </span>
                <span class="text-[10px] font-medium text-[#7D6853] bg-[#FAF8F5] px-2 py-0.5 rounded-[2px] border border-[#E5DED3]">
                  {{ formCategory || 'General' }}
                </span>
              </div>

              <!-- Từ Vựng & Âm thanh -->
              <div class="pt-1.5">
                <h4 class="font-serif font-semibold text-lg sm:text-xl text-[#2D2823] tracking-tight">
                  {{ formWord || 'từ vựng mẫu' }}
                </h4>
                <p class="font-mono text-xs text-[#7D6853] font-medium mt-0.5">
                  {{ formPhoneticIpa || '/ˈfəʊnətɪk/' }}
                </p>
              </div>

              <!-- Nút nghe phát âm thử -->
              <div class="flex justify-center pt-0.5">
                <button 
                  type="button"
                  (click)="speak(formWord)"
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-[3px] bg-[#FAF8F5] hover:bg-[#EFEAE1] text-xs font-semibold text-[#7D6853] border border-[#E5DED3] cursor-pointer transition-colors"
                >
                  <app-icon name="volume-2" [size]="13"></app-icon>
                  <span>Nghe phát âm</span>
                </button>
              </div>

              <!-- Nghĩa & Câu ví dụ -->
              <div class="pt-2.5 border-t border-[#E5DED3] text-left">
                <p class="text-xs font-semibold text-[#2D2823]">
                  {{ formVietnameseMeaning || 'Nghĩa tiếng Việt sẽ xuất hiện ở đây...' }}
                </p>
                <p *ngIf="formExampleSentenceEn" class="text-[11px] text-[#5C5249] italic mt-1 leading-snug">
                  “{{ formExampleSentenceEn }}”
                </p>
              </div>

            </div>

            <!-- Ghi chú giải thích -->
            <p class="text-[11px] text-[#8C827A] leading-relaxed text-center">
              Dữ liệu lưu vào sẽ lập tức cập nhật CSDL PostgreSQL và được mô hình AI Vision ánh xạ khi học viên quét ảnh bối cảnh.
            </p>

          </div>

        </div>

        <!-- Footer Modal -->
        <div class="p-4 sm:p-5 border-t border-[#E5DED3] bg-[#FAF8F5] flex items-center justify-between shrink-0">
          <button 
            type="button"
            (click)="closeWordModal()"
            class="px-4 py-2 rounded-[4px] bg-white hover:bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#5C5249] cursor-pointer transition-colors shadow-2xs"
          >
            Hủy bỏ
          </button>

          <button 
            type="button"
            (click)="saveWord()"
            [disabled]="formSaving() || !formWord || !formVietnameseMeaning"
            class="inline-flex items-center gap-2 px-4.5 py-2 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <app-icon 
              [name]="formSaving() ? 'rotate-cw' : 'check'" 
              [size]="13" 
              [svgClass]="formSaving() ? 'animate-spin text-white' : 'text-white'"
            ></app-icon>
            <span>{{ formSaving() ? 'Đang lưu vào CSDL...' : (wordModalMode() === 'create' ? 'Tạo từ vựng' : 'Lưu thay đổi') }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- =========================================================================
         4. MODAL: NẠP TỪ VỰNG HÀNG LOẠT (BULK IMPORT JSON/CSV)
         ========================================================================= -->
    <div 
      *ngIf="bulkModalOpen()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
    >
      <div class="w-full max-w-2xl bg-white rounded-[4px] border border-[#E5DED3] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <!-- Header -->
        <div class="p-4 sm:p-5 border-b border-[#E5DED3] flex items-center justify-between bg-white shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-[#7D6853] shrink-0">
              <app-icon name="upload" [size]="16"></app-icon>
            </div>
            <div>
              <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823] tracking-tight">
                Nạp từ vựng hàng loạt (Bulk import)
              </h3>
              <p class="text-xs text-[#8C827A] mt-0.5">
                Hỗ trợ định dạng JSON Array hoặc dòng CSV chuẩn.
              </p>
            </div>
          </div>

          <button 
            type="button"
            (click)="closeBulkModal()"
            class="p-2 rounded-[4px] text-[#8C827A] hover:bg-[#FAF8F5] hover:text-[#2D2823] border-0 bg-transparent cursor-pointer transition-colors"
          >
            <app-icon name="x" [size]="16"></app-icon>
          </button>
        </div>

        <!-- Body -->
        <div class="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          
          <!-- Nút chèn mẫu nhanh -->
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-[#2D2823]">Dữ liệu đầu vào:</span>
            <div class="flex items-center gap-2">
              <button 
                type="button" 
                (click)="insertJsonSample()"
                class="px-3 py-1.5 rounded-[4px] bg-[#FAF8F5] hover:bg-[#EFEAE1] border border-[#E5DED3] text-xs font-semibold text-[#7D6853] cursor-pointer transition-colors shadow-2xs"
              >
                Chèn mẫu JSON
              </button>
              <button 
                type="button" 
                (click)="insertCsvSample()"
                class="px-3 py-1.5 rounded-[4px] bg-[#FAF8F5] hover:bg-[#EFEAE1] border border-[#E5DED3] text-xs font-semibold text-[#7D6853] cursor-pointer transition-colors shadow-2xs"
              >
                Chèn mẫu CSV
              </button>
            </div>
          </div>

          <textarea 
            [(ngModel)]="bulkInputText"
            rows="10"
            placeholder="Dán mã JSON mảng đối tượng hoặc định dạng CSV (word,meaning,ipa,level)..."
            class="w-full p-3.5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-mono text-[#2D2823] focus:outline-none focus:border-[#7D6853] focus:ring-1 focus:ring-[#7D6853] leading-relaxed"
          ></textarea>

          <!-- Báo cáo kết quả nếu có -->
          <div *ngIf="bulkResult()" class="p-3.5 rounded-[4px] bg-emerald-50 border border-emerald-200/80 space-y-2">
            <div class="flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <app-icon name="check-circle" [size]="15" svgClass="text-emerald-700"></app-icon>
              <span>Kết quả nạp dữ liệu:</span>
            </div>
            <p class="text-xs text-emerald-800">
              Đã xử lý: <strong>{{ bulkResult()?.totalProcessed }}</strong> | 
              Thành công: <strong>{{ bulkResult()?.successCount }}</strong> | 
              Bỏ qua trùng lặp: <strong>{{ bulkResult()?.skippedDuplicates }}</strong>
            </p>
            <div *ngIf="bulkResult()?.errorMessages?.length" class="text-[11px] text-rose-700 font-mono space-y-0.5">
              <p *ngFor="let err of bulkResult()?.errorMessages">{{ err }}</p>
            </div>
          </div>

        </div>

        <!-- Footer -->
        <div class="p-4 sm:p-5 border-t border-[#E5DED3] bg-[#FAF8F5] flex items-center justify-between shrink-0">
          <button 
            type="button"
            (click)="closeBulkModal()"
            class="px-4 py-2 rounded-[4px] bg-white hover:bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#5C5249] cursor-pointer transition-colors shadow-2xs"
          >
            Đóng
          </button>

          <button 
            type="button"
            (click)="executeBulkImport()"
            [disabled]="bulkImporting() || !bulkInputText.trim()"
            class="inline-flex items-center gap-2 px-4.5 py-2 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <app-icon 
              [name]="bulkImporting() ? 'rotate-cw' : 'upload'" 
              [size]="13" 
              [svgClass]="bulkImporting() ? 'animate-spin text-white' : 'text-white'"
            ></app-icon>
            <span>{{ bulkImporting() ? 'Đang phân tích & lưu...' : 'Tiến hành nạp dữ liệu' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- =========================================================================
         5. MODAL: XÁC NHẬN XÓA TỪ VỰNG
         ========================================================================= -->
    <div 
      *ngIf="deleteModalOpen()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div class="w-full max-w-md bg-white rounded-[4px] border border-[#E5DED3] shadow-xl p-4 sm:p-5 space-y-3.5">
        
        <div class="w-10 h-10 rounded-[4px] bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-2xs">
          <app-icon name="trash-2" [size]="18"></app-icon>
        </div>

        <div>
          <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823]">
            Xác nhận xóa từ vựng?
          </h3>
          <p class="text-xs text-[#5C5249] mt-1 leading-relaxed">
            Bạn sắp xóa mục từ <strong class="text-[#2D2823]">"{{ wordToDelete()?.word }}"</strong> ({{ wordToDelete()?.vietnameseMeaning }}) khỏi hệ thống.
          </p>
        </div>

        <!-- Cảnh báo nếu từ vựng đang có học viên theo học -->
        <div *ngIf="(wordToDelete()?.activeLearnersCount ?? 0) > 0" class="p-3 rounded-[4px] bg-amber-50 border border-amber-200/80 space-y-1.5 text-xs">
          <p class="font-semibold text-amber-900 flex items-center gap-1.5">
            <app-icon name="alert-triangle" [size]="14" svgClass="text-amber-700"></app-icon>
            <span>Từ này đang có {{ wordToDelete()?.activeLearnersCount }} học viên theo học!</span>
          </p>
          <p class="text-amber-800 text-[11px] leading-relaxed">
            Nếu bạn xóa mục từ này, toàn bộ tiến trình ôn thẻ SM-2 của các học viên liên quan sẽ bị giải phóng khỏi CSDL.
          </p>
          <label class="flex items-center gap-2 pt-1 font-semibold text-amber-950 cursor-pointer">
            <input type="checkbox" [(ngModel)]="deleteForce" class="rounded-[2px] accent-[#7D6853]" />
            <span>Tôi đồng ý xóa cưỡng bức kèm tiến trình người học</span>
          </label>
        </div>

        <div class="pt-2 flex items-center justify-end gap-2.5">
          <button 
            type="button"
            (click)="deleteModalOpen.set(false)"
            class="px-4 py-2 rounded-[4px] bg-white hover:bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#5C5249] cursor-pointer transition-colors shadow-2xs"
          >
            Hủy bỏ
          </button>

          <button 
            type="button"
            (click)="executeDeleteWord()"
            [disabled]="deleteLoading() || ((wordToDelete()?.activeLearnersCount ?? 0) > 0 && !deleteForce)"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <app-icon 
              [name]="deleteLoading() ? 'rotate-cw' : 'trash-2'" 
              [size]="13" 
              [svgClass]="deleteLoading() ? 'animate-spin text-white' : 'text-white'"
            ></app-icon>
            <span>{{ deleteLoading() ? 'Đang xóa...' : 'Xác nhận xóa' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- =========================================================================
         6. MODAL: HỒ SƠ HỌC LỰC & PHÂN TÍCH THUẬT TOÁN SM-2 CHI TIẾT
         ========================================================================= -->
    <div 
      *ngIf="analyticsModalOpen()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
    >
      <div class="w-full max-w-3xl bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        <!-- Header Modal -->
        <div class="p-4 sm:p-5 border-b border-[#E5DED3] flex items-center justify-between bg-white shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-[#7D6853] shrink-0 shadow-2xs">
              <app-icon name="activity" [size]="18"></app-icon>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823]">
                  Hồ sơ năng lực SM-2: {{ userAnalytics()?.user?.fullName || userAnalytics()?.user?.username }}
                </h3>
                <span 
                  class="px-2 py-0.5 rounded-[2px] text-[10px] font-semibold border"
                  [ngClass]="getCefrBadgeClass(userAnalytics()?.user?.targetLevel || 'A1')"
                >
                  {{ userAnalytics()?.user?.targetLevel }}
                </span>
              </div>
              <p class="text-xs text-[#5C5249]">
                {{ userAnalytics()?.user?.email }} • Thành viên từ {{ userAnalytics()?.user?.createdAt | date:'dd/MM/yyyy' }}
              </p>
            </div>
          </div>

          <button 
            type="button"
            (click)="analyticsModalOpen.set(false)"
            class="p-2 rounded-[4px] text-[#8C827A] hover:bg-[#FAF8F5] hover:text-[#2D2823] border-0 bg-transparent cursor-pointer transition-colors"
          >
            <app-icon name="x" [size]="16"></app-icon>
          </button>
        </div>

        <!-- Body Modal -->
        <div class="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          <!-- 4 Khối Trạng Thái SM-2 -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div class="p-3 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-center">
              <span class="text-[10px] font-semibold tracking-wider text-[#8C827A]">Từ mới (New)</span>
              <p class="font-serif font-semibold text-base sm:text-lg text-[#2D2823] mt-0.5">
                {{ userAnalytics()?.user?.newWords || 0 }}
              </p>
              <p class="text-[10px] text-[#5C5249] mt-0.5">Chưa bắt đầu ôn</p>
            </div>

            <div class="p-3 rounded-[4px] bg-sky-50/60 border border-sky-200/80 text-center">
              <span class="text-[10px] font-semibold tracking-wider text-sky-800">Đang học (Learning)</span>
              <p class="font-serif font-semibold text-base sm:text-lg text-sky-700 mt-0.5">
                {{ userAnalytics()?.user?.learningWords || 0 }}
              </p>
              <p class="text-[10px] text-sky-600 mt-0.5">Vòng lặp ban đầu</p>
            </div>

            <div class="p-3 rounded-[4px] bg-amber-50/60 border border-amber-200/80 text-center">
              <span class="text-[10px] font-semibold tracking-wider text-amber-800">Đang ôn (Reviewing)</span>
              <p class="font-serif font-semibold text-base sm:text-lg text-amber-700 mt-0.5">
                {{ userAnalytics()?.user?.reviewingWords || 0 }}
              </p>
              <p class="text-[10px] text-amber-600 mt-0.5">Giãn cách thời gian</p>
            </div>

            <div class="p-3 rounded-[4px] bg-emerald-50/60 border border-emerald-200/80 text-center">
              <span class="text-[10px] font-semibold tracking-wider text-emerald-800">Đã thuộc (Mastered)</span>
              <p class="font-serif font-semibold text-base sm:text-lg text-emerald-700 mt-0.5">
                {{ userAnalytics()?.user?.masteredWords || 0 }}
              </p>
              <p class="text-[10px] text-emerald-600 mt-0.5">Trí nhớ dài hạn</p>
            </div>
          </div>

          <!-- Banner Chỉ Số Thuật Toán SM-2 & AI Vision -->
          <div class="p-3 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-[4px] bg-white border border-[#E5DED3] flex items-center justify-center text-[#7D6853] shrink-0 font-semibold text-xs">
                EF
              </div>
              <div>
                <p class="font-semibold text-[#2D2823]">
                  Hệ số dễ nhớ trung bình (Easiness factor): 
                  <span class="text-[#7D6853] font-mono text-xs sm:text-sm font-semibold">{{ userAnalytics()?.averageEasinessFactor || 2.5 }}</span>
                </p>
                <p class="text-[11px] text-[#5C5249] mt-0.5">
                  Mặc định: 2.50 • Ngưỡng tối thiểu SM-2: 1.30 (Chỉ số càng cao học viên ghi nhớ càng tốt)
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <div class="text-right">
                <span class="text-[10px] font-semibold text-[#8C827A] block">Tổng số ảnh AI</span>
                <strong class="text-xs sm:text-sm font-semibold text-[#2D2823]">{{ userAnalytics()?.user?.totalCaptures || 0 }} ảnh</strong>
              </div>
              <div class="text-right border-l border-[#E5DED3] pl-3">
                <span class="text-[10px] font-semibold text-[#8C827A] block">Lượt ôn thẻ</span>
                <strong class="text-xs sm:text-sm font-semibold text-[#2D2823]">{{ userAnalytics()?.user?.totalReviews || 0 }} lần</strong>
              </div>
            </div>
          </div>

          <!-- Section A: Lịch Sử Ôn Tập Gần Nhất -->
          <div class="space-y-2.5">
            <h4 class="font-serif font-semibold text-xs text-[#2D2823] flex items-center gap-2">
              <app-icon name="brain" [size]="14" svgClass="text-[#7D6853]"></app-icon>
              <span>10 lượt ôn thẻ Flashcard SM-2 gần nhất</span>
            </h4>

            <div *ngIf="userAnalytics()?.recentReviews?.length; else noReviews">
              <div class="divide-y divide-[#E5DED3] rounded-[4px] border border-[#E5DED3] overflow-hidden bg-white">
                <div 
                  *ngFor="let rev of userAnalytics()?.recentReviews"
                  class="p-2.5 flex items-center justify-between text-xs hover:bg-[#FAF8F5] transition-colors"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="w-5 h-5 rounded-[2px] bg-[#FAF8F5] border border-[#E5DED3] text-[#7D6853] font-semibold text-[10px] flex items-center justify-center shrink-0">
                      ★ {{ rev.ratingGrade }}
                    </span>
                    <div class="min-w-0">
                      <p class="font-semibold text-[#2D2823] truncate">
                        {{ rev.word }} <span class="text-[11px] font-normal text-[#8C827A]">({{ rev.partOfSpeech }})</span>: {{ rev.vietnameseMeaning }}
                      </p>
                      <p class="text-[10px] text-[#8C827A]">
                        Phương thức: {{ rev.reviewType }}
                        <span *ngIf="rev.responseTimeMs">• Phản xạ: {{ rev.responseTimeMs }}ms</span>
                      </p>
                    </div>
                  </div>

                  <span class="text-[10px] text-[#8C827A] font-mono shrink-0">
                    {{ rev.reviewedAt | date:'HH:mm dd/MM' }}
                  </span>
                </div>
              </div>
            </div>
            <ng-template #noReviews>
              <div class="p-5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-center text-xs text-[#8C827A]">
                Học viên chưa thực hiện lượt ôn thẻ nào.
              </div>
            </ng-template>
          </div>

          <!-- Section B: Ảnh Bối Cảnh AI Vision Đã Quét -->
          <div class="space-y-2.5">
            <h4 class="font-serif font-semibold text-xs text-[#2D2823] flex items-center gap-2">
              <app-icon name="camera" [size]="14" svgClass="text-[#7D6853]"></app-icon>
              <span>Ảnh bối cảnh thực tế AI Vision quét gần nhất</span>
            </h4>

            <div *ngIf="userAnalytics()?.recentCaptures?.length; else noCaptures" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div 
                *ngFor="let cap of userAnalytics()?.recentCaptures"
                class="p-2.5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-start gap-2.5"
              >
                <div class="w-12 h-12 rounded-[4px] bg-stone-200 overflow-hidden shrink-0 border border-[#E5DED3] flex items-center justify-center">
                  <img 
                    *ngIf="cap.imageUrl" 
                    [src]="cap.imageUrl" 
                    alt="Scene" 
                    class="w-full h-full object-cover"
                    (error)="$any($event.target).style.display = 'none'"
                  />
                  <app-icon name="image" [size]="16" svgClass="text-stone-400"></app-icon>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="font-semibold text-xs text-[#2D2823] truncate">
                    {{ cap.sceneTheme || 'Bối cảnh tổng quát' }}
                  </p>
                  <p class="text-[10px] text-[#8C827A] mt-0.5">
                    {{ cap.createdAt | date:'HH:mm dd/MM/yyyy' }}
                  </p>
                </div>
              </div>
            </div>
            <ng-template #noCaptures>
              <div class="p-5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-center text-xs text-[#8C827A]">
                Học viên chưa tải ảnh quét AI nào.
              </div>
            </ng-template>
          </div>

        </div>

        <!-- Footer Modal -->
        <div class="p-4 border-t border-[#E5DED3] bg-[#FAF8F5] flex items-center justify-end shrink-0">
          <button 
            type="button"
            (click)="analyticsModalOpen.set(false)"
            class="px-4 py-2 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-colors"
          >
            Đóng hồ sơ
          </button>
        </div>

      </div>
    </div>

    <!-- =========================================================================
         7. MODAL: CHỈNH SỬA THÔNG TIN HỌC VIÊN
         ========================================================================= -->
    <div 
      *ngIf="editUserModalOpen()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div class="w-full max-w-md bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl p-4 sm:p-5 space-y-3.5">
        
        <div class="flex items-center justify-between pb-3 border-b border-[#E5DED3]">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-[#7D6853] shadow-2xs">
              <app-icon name="edit" [size]="15"></app-icon>
            </div>
            <div>
              <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823]">
                Chỉnh sửa học viên
              </h3>
              <p class="text-[11px] text-[#8C827A]">
                {{ editingUser()?.username }} ({{ editingUser()?.email }})
              </p>
            </div>
          </div>

          <button 
            type="button"
            (click)="editUserModalOpen.set(false)"
            class="p-1.5 rounded-[4px] text-[#8C827A] hover:bg-[#FAF8F5] border-0 bg-transparent cursor-pointer"
          >
            <app-icon name="x" [size]="15"></app-icon>
          </button>
        </div>

        <!-- Form fields -->
        <div class="space-y-3">
          
          <div class="space-y-1">
            <label class="block text-xs font-semibold text-[#2D2823]">Họ và tên</label>
            <input 
              type="text" 
              [(ngModel)]="editFullName"
              placeholder="Nhập họ tên học viên..."
              class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-medium text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="block text-xs font-semibold text-[#2D2823]">Cấp độ mục tiêu</label>
              <select 
                [(ngModel)]="editTargetLevel"
                class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#7D6853] focus:outline-none cursor-pointer"
              >
                <option value="A1">A1 — Sơ cấp 1</option>
                <option value="A2">A2 — Sơ cấp 2</option>
                <option value="B1">B1 — Trung cấp 1</option>
                <option value="B2">B2 — Trung cấp 2</option>
                <option value="C1">C1 — Cao cấp</option>
                <option value="C2">C2 — Bản xứ</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-semibold text-[#2D2823]">Mục tiêu ngày (từ)</label>
              <input 
                type="number" 
                [(ngModel)]="editDailyGoal"
                min="5" 
                max="50"
                class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-medium text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
              />
            </div>
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-semibold text-[#2D2823]">Vai trò tài khoản</label>
            <select 
              [(ngModel)]="editRole"
              class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#2D2823] focus:outline-none cursor-pointer"
            >
              <option value="STUDENT">Học viên (Student)</option>
              <option value="ADMIN">Quản trị viên (Admin)</option>
            </select>
          </div>

        </div>

        <div class="pt-3 border-t border-[#E5DED3] flex items-center justify-end gap-2.5">
          <button 
            type="button"
            (click)="editUserModalOpen.set(false)"
            class="px-4 py-2 rounded-[4px] bg-white hover:bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#5C5249] cursor-pointer transition-colors shadow-2xs"
          >
            Hủy bỏ
          </button>

          <button 
            type="button"
            (click)="saveEditUser()"
            [disabled]="editUserSaving()"
            class="px-4 py-2 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            {{ editUserSaving() ? 'Đang lưu...' : 'Lưu thay đổi' }}
          </button>
        </div>

      </div>
    </div>

    <!-- =========================================================================
         8. MODAL: XÁC NHẬN ĐẶT LẠI TIẾN TRÌNH SM-2
         ========================================================================= -->
    <div 
      *ngIf="resetModalOpen()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div class="w-full max-w-md bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl p-4 sm:p-5 space-y-3.5">
        
        <div class="w-10 h-10 rounded-[4px] bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-2xs">
          <app-icon name="refresh-cw" [size]="18"></app-icon>
        </div>

        <div>
          <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823]">
            Đặt lại tiến trình học SM-2?
          </h3>
          <p class="text-xs text-[#5C5249] mt-1 leading-relaxed">
            Bạn sắp xóa toàn bộ thẻ từ vựng và lịch sử ôn tập của học viên <strong class="text-[#2D2823]">"{{ userToReset()?.fullName || userToReset()?.username }}"</strong>.
          </p>
        </div>

        <div class="p-3 rounded-[4px] bg-amber-50 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
          <p class="font-semibold flex items-center gap-1.5 mb-1">
            <app-icon name="info" [size]="14" svgClass="text-amber-700"></app-icon>
            <span>Học lại từ đầu</span>
          </p>
          Học viên sẽ bắt đầu lại với 0 thẻ từ trong sổ học và chuỗi streak trở về 0 ngày. Thao tác này không thể hoàn tác.
        </div>

        <div class="pt-2 flex items-center justify-end gap-2.5">
          <button 
            type="button"
            (click)="resetModalOpen.set(false)"
            class="px-4 py-2 rounded-[4px] bg-white hover:bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#5C5249] cursor-pointer transition-colors shadow-2xs"
          >
            Hủy bỏ
          </button>

          <button 
            type="button"
            (click)="executeResetProgress()"
            [disabled]="resetProgressLoading()"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <app-icon 
              [name]="resetProgressLoading() ? 'rotate-cw' : 'refresh-cw'" 
              [size]="13" 
              [svgClass]="resetProgressLoading() ? 'animate-spin text-white' : 'text-white'"
            ></app-icon>
            <span>{{ resetProgressLoading() ? 'Đang đặt lại...' : 'Xác nhận đặt lại' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- =========================================================================
         8.1. MODAL: TẠO TÀI KHOẢN HỌC VIÊN MỚI
         ========================================================================= -->
    <div 
      *ngIf="createUserModalOpen()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div class="w-full max-w-md bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl p-4 sm:p-5 space-y-3.5">
        
        <div class="flex items-center justify-between pb-3 border-b border-[#E5DED3]">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-[#7D6853] shadow-2xs">
              <app-icon name="user-plus" [size]="15"></app-icon>
            </div>
            <div>
              <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823]">
                Thêm tài khoản học viên mới
              </h3>
              <p class="text-[11px] text-[#8C827A]">
                Khởi tạo hồ sơ học tập và phân quyền trực tiếp
              </p>
            </div>
          </div>

          <button 
            type="button"
            (click)="closeCreateUserModal()"
            class="p-1.5 rounded-[4px] text-[#8C827A] hover:bg-[#FAF8F5] border-0 bg-transparent cursor-pointer"
          >
            <app-icon name="x" [size]="15"></app-icon>
          </button>
        </div>

        <!-- Form fields -->
        <div class="space-y-3 text-xs">
          
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="block font-semibold text-[#2D2823]">Tên đăng nhập <span class="text-rose-500">*</span></label>
              <input 
                type="text" 
                [(ngModel)]="createUserForm.username"
                placeholder="VD: learner_01"
                class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-mono text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
              />
            </div>

            <div class="space-y-1">
              <label class="block font-semibold text-[#2D2823]">Mật khẩu</label>
              <input 
                type="password" 
                [(ngModel)]="createUserForm.password"
                placeholder="Mặc định: 123456"
                class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-mono text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
              />
            </div>
          </div>

          <div class="space-y-1">
            <label class="block font-semibold text-[#2D2823]">Địa chỉ Email <span class="text-rose-500">*</span></label>
            <input 
              type="email" 
              [(ngModel)]="createUserForm.email"
              placeholder="VD: learner@vocario.com"
              class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
            />
          </div>

          <div class="space-y-1">
            <label class="block font-semibold text-[#2D2823]">Họ và tên học viên</label>
            <input 
              type="text" 
              [(ngModel)]="createUserForm.fullName"
              placeholder="VD: Nguyễn Văn Anh"
              class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
            />
          </div>

          <div class="grid grid-cols-3 gap-2.5">
            <div class="space-y-1">
              <label class="block font-semibold text-[#2D2823]">Mục tiêu CEFR</label>
              <select 
                [(ngModel)]="createUserForm.targetLevel"
                class="w-full px-2.5 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#7D6853] focus:outline-none cursor-pointer"
              >
                <option value="A1">A1 — Sơ cấp</option>
                <option value="A2">A2 — Cơ bản</option>
                <option value="B1">B1 — Trung cấp</option>
                <option value="B2">B2 — Nâng cao</option>
                <option value="C1">C1 — Cao cấp</option>
                <option value="C2">C2 — Bản xứ</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="block font-semibold text-[#2D2823]">Chỉ tiêu/ngày</label>
              <input 
                type="number" 
                [(ngModel)]="createUserForm.dailyGoal"
                min="5" 
                max="50"
                class="w-full px-2.5 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-medium text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
              />
            </div>

            <div class="space-y-1">
              <label class="block font-semibold text-[#2D2823]">Vai trò</label>
              <select 
                [(ngModel)]="createUserForm.role"
                class="w-full px-2.5 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#2D2823] focus:outline-none cursor-pointer"
              >
                <option value="STUDENT">Học viên</option>
                <option value="ADMIN">Quản trị viên</option>
              </select>
            </div>
          </div>

        </div>

        <div class="pt-3 border-t border-[#E5DED3] flex items-center justify-end gap-2.5">
          <button 
            type="button"
            (click)="closeCreateUserModal()"
            class="px-4 py-2 rounded-[4px] bg-white hover:bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#5C5249] cursor-pointer transition-colors shadow-2xs"
          >
            Hủy bỏ
          </button>

          <button 
            type="button"
            (click)="submitCreateUser()"
            [disabled]="createUserSaving() || !createUserForm.username || !createUserForm.email"
            class="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <app-icon *ngIf="!createUserSaving()" name="user-plus" [size]="13" svgClass="text-white"></app-icon>
            <app-icon *ngIf="createUserSaving()" name="refresh-cw" [size]="13" svgClass="text-white animate-spin"></app-icon>
            <span>{{ createUserSaving() ? 'Đang tạo...' : 'Tạo tài khoản' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- =========================================================================
         8.2. MODAL: XÁC NHẬN XÓA TÀI KHOẢN HỌC VIÊN
         ========================================================================= -->
    <div 
      *ngIf="deleteUserModalOpen()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-60 flex items-center justify-center p-4 animate-fade-in"
    >
      <div class="w-full max-w-sm bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl p-5 space-y-4">
        
        <div class="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto">
          <app-icon name="trash" [size]="18"></app-icon>
        </div>

        <div class="text-center space-y-1">
          <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823]">
            Xóa vĩnh viễn tài khoản học viên?
          </h3>
          <p class="text-xs text-[#5C5249] leading-relaxed">
            Bạn có chắc chắn muốn xóa học viên <strong class="text-[#2D2823]">{{ userToDelete()?.fullName || userToDelete()?.username }}</strong> (<span class="font-mono text-[#7D6853]">@{{ userToDelete()?.username }}</span>)?
          </p>
          <p class="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-[3px] border border-rose-200/80 mt-2 text-left leading-relaxed">
            Hành động này sẽ xóa đồng thời toàn bộ tiến trình học SM-2, ảnh chụp AI Vision, chứng chỉ khảo thí và dữ liệu phòng học liên quan. Không thể hoàn tác.
          </p>
        </div>

        <div class="pt-2 flex items-center justify-center gap-2.5">
          <button 
            type="button" 
            (click)="closeDeleteUserModal()"
            class="px-4 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs font-semibold text-[#5C5249] hover:text-[#2D2823] cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button 
            type="button" 
            (click)="confirmDeleteUser()"
            [disabled]="deleteUserLoading()"
            class="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <app-icon *ngIf="!deleteUserLoading()" name="trash" [size]="14" svgClass="text-white"></app-icon>
            <app-icon *ngIf="deleteUserLoading()" name="refresh-cw" [size]="14" svgClass="text-white animate-spin"></app-icon>
            <span>{{ deleteUserLoading() ? 'Đang xóa...' : 'Xác nhận xóa' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- =========================================================================
         9. MODAL: SOI BỐI CẢNH AI VISION & BOUNDING BOX TƯƠNG TÁC CHI TIẾT
         ========================================================================= -->
    <div 
      *ngIf="showVisionModal() && selectedCapture()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
    >
      <div class="w-full max-w-5xl bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        <!-- Header Modal -->
        <div class="p-4 sm:p-5 border-b border-[#E5DED3] flex items-center justify-between bg-white shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-[#7D6853] shrink-0">
              <app-icon name="eye" [size]="18"></app-icon>
            </div>
            <div>
              <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823]">
                Kiểm duyệt chi tiết: {{ selectedCapture()?.sceneTheme }}
              </h3>
              <p class="text-xs text-[#5C5249]">
                Học viên: <strong class="text-[#2D2823]">{{ selectedCapture()?.userName }}</strong> ({{ selectedCapture()?.userEmail }}) • {{ selectedCapture()?.timeAgo }}
              </p>
            </div>
          </div>

          <button 
            type="button"
            (click)="closeVisionModal()"
            class="p-2 rounded-[4px] text-[#8C827A] hover:bg-[#FAF8F5] hover:text-[#2D2823] border-0 bg-transparent cursor-pointer transition-colors"
          >
            <app-icon name="x" [size]="16"></app-icon>
          </button>
        </div>

        <!-- Body Modal: 2 Cột (Trái: Ảnh & Bounding Box Tương Tác - Phải: Danh sách vật thể & Duyệt từ điển) -->
        <div class="p-4 sm:p-5 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          <!-- CỘT TRÁI (7/12): Khung ảnh lớn kèm Bounding Box overlays -->
          <div class="lg:col-span-7 space-y-2.5">
            <div class="relative w-full rounded-[4px] overflow-hidden bg-stone-950 border border-[#E5DED3] shadow-inner select-none aspect-4/3 flex items-center justify-center">
              
              <img 
                [src]="getImageUrl(selectedCapture()?.imageUrl || '')" 
                (error)="handleImageError($event)"
                alt="Bối cảnh AI Vision chi tiết"
                class="w-full h-full object-cover"
              />

              <!-- Overlay Bounding Boxes -->
              <div 
                *ngFor="let box of parsedCurrentBoxes(); let i = index"
                (mouseenter)="selectedBoxIndex.set(i)"
                (mouseleave)="selectedBoxIndex.set(null)"
                (click)="selectedBoxIndex.set(i)"
                [style.top.%]="box.topPercent"
                [style.left.%]="box.leftPercent"
                [style.width.%]="box.widthPercent"
                [style.height.%]="box.heightPercent"
                [class.border-amber-400]="selectedBoxIndex() === i"
                [class.bg-amber-400/20]="selectedBoxIndex() === i"
                [class.shadow-lg]="selectedBoxIndex() === i"
                [class.z-20]="selectedBoxIndex() === i"
                [class.border-white/80]="selectedBoxIndex() !== i"
                [class.bg-black/20]="selectedBoxIndex() !== i"
                class="absolute border-2 rounded-[2px] cursor-pointer transition-all duration-150 flex flex-col justify-between p-1 group"
              >
                <!-- Nhãn góc trên bounding box -->
                <div class="flex items-center gap-1 self-start">
                  <span 
                    [class.bg-amber-400]="selectedBoxIndex() === i"
                    [class.text-stone-900]="selectedBoxIndex() === i"
                    [class.bg-black/70]="selectedBoxIndex() !== i"
                    [class.text-white]="selectedBoxIndex() !== i"
                    class="px-1.5 py-0.5 rounded-[2px] text-[10px] font-semibold tracking-wider backdrop-blur-xs flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <app-icon name="tag" [size]="9"></app-icon>
                    <span>{{ box.word }}</span>
                  </span>
                </div>

                <!-- Tooltip nghĩa tiếng Việt khi hover -->
                <div 
                  *ngIf="selectedBoxIndex() === i"
                  class="self-start px-2 py-0.5 rounded-[2px] bg-stone-900/90 text-white text-[10px] font-medium backdrop-blur-md border border-white/20 mt-1 shadow-md animate-fade-in"
                >
                  <span>{{ box.vietnamese }}</span>
                  <span *ngIf="box.ipa" class="text-amber-300 ml-1 font-mono">{{ box.ipa }}</span>
                </div>
              </div>

            </div>

            <!-- Hướng dẫn tương tác -->
            <div class="p-2.5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-between text-xs text-[#5C5249]">
              <div class="flex items-center gap-2">
                <app-icon name="info" [size]="14" svgClass="text-[#7D6853]"></app-icon>
                <span>Rê chuột hoặc chạm vào các hộp để làm nổi bật nhãn tương ứng.</span>
              </div>
              <span class="font-semibold text-[#7D6853]">
                {{ parsedCurrentBoxes().length }} Bounding Boxes
              </span>
            </div>
          </div>

          <!-- CỘT PHẢI (5/12): Danh sách chi tiết các nhãn & Nút duyệt vào Từ Điển -->
          <div class="lg:col-span-5 space-y-3">
            
            <div class="flex items-center justify-between">
              <h4 class="font-serif font-semibold text-xs text-[#2D2823] flex items-center gap-2">
                <app-icon name="sparkles" [size]="14" svgClass="text-[#7D6853]"></app-icon>
                <span>Vật thể nhận diện được</span>
              </h4>
              <span class="text-[11px] font-semibold text-[#7D6853] bg-[#FAF8F5] px-2 py-0.5 rounded-[2px] border border-[#E5DED3]">
                {{ parsedCurrentBoxes().length }} nhãn
              </span>
            </div>

            <!-- List các vật thể -->
            <div class="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              
              <div 
                *ngFor="let box of parsedCurrentBoxes(); let i = index"
                (mouseenter)="selectedBoxIndex.set(i)"
                (mouseleave)="selectedBoxIndex.set(null)"
                [class.border-[#7D6853]]="selectedBoxIndex() === i"
                [class.bg-[#FAF8F5]]="selectedBoxIndex() === i"
                [class.border-[#E5DED3]]="selectedBoxIndex() !== i"
                [class.bg-white]="selectedBoxIndex() !== i"
                class="p-3 rounded-[4px] border transition-all space-y-2 cursor-pointer shadow-2xs"
              >
                <!-- Dòng tiêu đề đồ vật -->
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="w-5 h-5 rounded-[2px] bg-[#FAF8F5] border border-[#E5DED3] text-[#7D6853] flex items-center justify-center text-[10px] font-semibold">
                      {{ i + 1 }}
                    </span>
                    <div>
                      <h5 class="font-serif font-semibold text-xs text-[#2D2823] flex items-center gap-1.5">
                        <span>{{ box.word }}</span>
                        <span class="text-[10px] font-mono text-[#7D6853] font-normal" *ngIf="box.ipa">{{ box.ipa }}</span>
                      </h5>
                      <p class="text-xs text-[#5C5249]">{{ box.vietnamese }}</p>
                    </div>
                  </div>

                  <!-- Badge CEFR -->
                  <span class="px-2 py-0.5 rounded-[2px] bg-stone-100 text-stone-700 font-semibold text-[10px] border border-stone-200">
                    {{ box.level || 'A2' }}
                  </span>
                </div>

                <!-- Nút Duyệt vào Từ Điển Hệ Thống -->
                <div class="pt-2 border-t border-[#E5DED3] flex items-center justify-between gap-2">
                  <span class="text-[10px] text-[#8C827A] flex items-center gap-1">
                    <app-icon name="shield" [size]="11"></app-icon>
                    <span>YOLO-World</span>
                  </span>

                  <button 
                    type="button"
                    (click)="openPromoteModal(box); $event.stopPropagation()"
                    class="inline-flex items-center gap-1.5 px-3 py-1 rounded-[3px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold cursor-pointer transition-all active:scale-95"
                  >
                    <app-icon name="plus" [size]="12" svgClass="text-emerald-700"></app-icon>
                    <span>Duyệt vào kho từ điển</span>
                  </button>
                </div>
              </div>

            </div>

            <!-- Hành động: Tạo đấu trường hoặc Xóa ảnh vi phạm -->
            <div class="pt-2.5 border-t border-[#E5DED3] flex flex-col sm:flex-row items-center gap-2">
              <button 
                type="button"
                (click)="createStageFromCapture(selectedCapture()!)"
                class="flex-1 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-[4px] bg-[#2D2823] hover:bg-[#1a1714] text-white text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-xs"
              >
                <app-icon name="target" [size]="14" svgClass="text-white"></app-icon>
                <span>Tạo đấu trường từ ảnh này</span>
              </button>

              <button 
                type="button"
                (click)="openDeleteCapture(selectedCapture()!)"
                class="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[4px] bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold cursor-pointer transition-all active:scale-95 shrink-0"
              >
                <app-icon name="trash" [size]="14"></app-icon>
                <span>Xóa ảnh</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>

    <!-- =========================================================================
         10. MODAL: PHÊ DUYỆT TỪ VỰNG AI VÀO KHO TỪ ĐIỂN CEFR
         ========================================================================= -->
    <div 
      *ngIf="showPromoteModal() && promoteWordData()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-60 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
    >
      <div class="w-full max-w-lg bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl overflow-hidden flex flex-col">
        
        <div class="p-4 sm:p-5 border-b border-[#E5DED3] flex items-center justify-between bg-white">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-[4px] bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
              <app-icon name="plus" [size]="16"></app-icon>
            </div>
            <div>
              <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823]">
                Duyệt từ vựng vào kho CEFR
              </h3>
              <p class="text-xs text-[#5C5249]">
                Thêm từ <strong class="text-[#2D2823]">'{{ promoteWordData()?.word }}'</strong> vào từ điển hệ thống
              </p>
            </div>
          </div>

          <button 
            type="button"
            (click)="closePromoteModal()"
            class="p-2 rounded-[4px] text-[#8C827A] hover:bg-[#FAF8F5] hover:text-[#2D2823] border-0 bg-transparent cursor-pointer"
          >
            <app-icon name="x" [size]="16"></app-icon>
          </button>
        </div>

        <div class="p-4 sm:p-5 space-y-3 text-xs">
          <!-- Từ tiếng Anh -->
          <div>
            <label class="font-semibold text-[#2D2823] block mb-1">Từ vựng tiếng Anh:</label>
            <input 
              type="text" 
              [(ngModel)]="promoteWordData()!.word"
              class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] font-semibold text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
            />
          </div>

          <!-- Nghĩa tiếng Việt -->
          <div>
            <label class="font-semibold text-[#2D2823] block mb-1">Nghĩa tiếng Việt:</label>
            <input 
              type="text" 
              [(ngModel)]="promoteWordData()!.vietnameseMeaning"
              class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] font-medium text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <!-- Phiên âm IPA -->
            <div>
              <label class="font-semibold text-[#2D2823] block mb-1">Phiên âm IPA:</label>
              <input 
                type="text" 
                [(ngModel)]="promoteWordData()!.phoneticIpa"
                placeholder="/.../"
                class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] font-mono text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
              />
            </div>

            <!-- Cấp độ CEFR -->
            <div>
              <label class="font-semibold text-[#2D2823] block mb-1">Cấp độ CEFR:</label>
              <select 
                [(ngModel)]="promoteWordData()!.cefrLevel"
                class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] font-semibold text-[#2D2823] cursor-pointer focus:outline-none"
              >
                <option value="A1">A1 — Khởi động</option>
                <option value="A2">A2 — Sơ cấp</option>
                <option value="B1">B1 — Trung cấp</option>
                <option value="B2">B2 — Trung cao cấp</option>
                <option value="C1">C1 — Cao cấp</option>
                <option value="C2">C2 — Thành thạo</option>
              </select>
            </div>
          </div>

          <!-- Ví dụ câu tiếng Anh -->
          <div>
            <label class="font-semibold text-[#2D2823] block mb-1">Câu ví dụ tiếng Anh:</label>
            <input 
              type="text" 
              [(ngModel)]="promoteWordData()!.exampleSentenceEn"
              class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
            />
          </div>

          <!-- Dịch câu ví dụ -->
          <div>
            <label class="font-semibold text-[#2D2823] block mb-1">Dịch câu ví dụ:</label>
            <input 
              type="text" 
              [(ngModel)]="promoteWordData()!.exampleSentenceVi"
              class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
            />
          </div>
        </div>

        <div class="p-4 border-t border-[#E5DED3] flex items-center justify-end gap-2 bg-[#FAF8F5]">
          <button 
            type="button"
            (click)="closePromoteModal()"
            class="px-4 py-2 rounded-[4px] border border-[#E5DED3] bg-white text-xs font-semibold text-[#5C5249] hover:bg-[#FAF8F5] cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button 
            type="button"
            (click)="submitPromoteWord()"
            [disabled]="promoteLoading()"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <app-icon name="check" [size]="14" svgClass="text-white"></app-icon>
            <span>{{ promoteLoading() ? 'Đang duyệt...' : 'Xác nhận thêm vào CSDL' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- =========================================================================
         11. MODAL: XÁC NHẬN XÓA ẢNH BỐI CẢNH VI PHẠM
         ========================================================================= -->
    <div 
      *ngIf="showDeleteCaptureModal() && captureToDelete()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-60 flex items-center justify-center p-4 sm:p-6 animate-fade-in"
    >
      <div class="w-full max-w-md bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl p-4 sm:p-5 space-y-3.5">
        
        <div class="w-10 h-10 rounded-[4px] bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <app-icon name="trash" [size]="18"></app-icon>
        </div>

        <div class="text-center space-y-1">
          <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823]">
            Xác nhận xóa bức ảnh này?
          </h3>
          <p class="text-xs text-[#5C5249] leading-relaxed">
            Hành động này sẽ xóa ảnh bối cảnh chủ đề <strong class="text-[#2D2823]">'{{ captureToDelete()?.sceneTheme }}'</strong> khỏi CSDL PostgreSQL và tách liên kết an toàn khỏi các thẻ từ vựng học viên đã học.
          </p>
        </div>

        <div class="pt-2 flex items-center justify-center gap-2.5">
          <button 
            type="button"
            (click)="closeDeleteCaptureModal()"
            class="px-4 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs font-semibold text-[#5C5249] hover:text-[#2D2823] cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button 
            type="button"
            (click)="confirmDeleteCapture()"
            [disabled]="deleteCaptureLoading()"
            class="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <app-icon name="trash" [size]="14" svgClass="text-white"></app-icon>
            <span>{{ deleteCaptureLoading() ? 'Đang xóa...' : 'Xác nhận xóa' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- =========================================================================
         12. MODAL: TẠO / CHỈNH SỬA ĐẤU TRƯỜNG THỊ GIÁC (AI VISION & UPLOAD TỰ ĐỘNG)
         ========================================================================= -->
    <div 
      *ngIf="arenaModalOpen()" 
      class="fixed inset-0 bg-[#2D2823]/50 backdrop-blur-2xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in"
    >
      <div class="w-full max-w-4xl max-h-[92vh] bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl flex flex-col overflow-hidden">
        
        <!-- Header Modal -->
        <div class="p-4 sm:p-5 border-b border-[#E5DED3] flex items-center justify-between shrink-0 bg-[#FAF8F5]">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-[4px] bg-[#2D2823] text-white flex items-center justify-center shadow-xs">
              <app-icon name="target" [size]="16" svgClass="text-white"></app-icon>
            </div>
            <div>
              <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823] m-0">
                {{ arenaModalMode() === 'create' ? 'Thêm đấu trường mới' : 'Chỉnh sửa đấu trường' }}
              </h3>
              <p class="text-[11px] text-[#8C827A] m-0 mt-0.5">
                Chọn ảnh từ thư viện AI Vision hoặc tải ảnh lên để AI tự động nhận diện đồ vật
              </p>
            </div>
          </div>

          <button 
            type="button"
            (click)="arenaModalOpen.set(false)"
            class="p-1.5 rounded-[4px] text-[#8C827A] hover:bg-white border-0 bg-transparent cursor-pointer transition-colors"
          >
            <app-icon name="x" [size]="16"></app-icon>
          </button>
        </div>

        <!-- Form Body (Cuộn mượt mà) -->
        <div class="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">

          <!-- KHỐI 1: CHỌN NGUỒN ẢNH NHANH (1-CLICK HOẶC TẢI ẢNH) -->
          <div class="space-y-2">
            <label class="block font-semibold text-[#2D2823]">Nguồn ảnh bối cảnh thi đấu</label>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- Nguồn 1: Chọn từ thư viện AI Vision -->
              <button
                type="button"
                (click)="openAiVisionLibraryPicker()"
                class="p-3 rounded-[4px] border-2 border-dashed border-[#7D6853]/40 hover:border-[#7D6853] bg-[#FAF8F5] hover:bg-amber-50/40 transition-all text-left flex items-start gap-3 cursor-pointer group"
              >
                <div class="w-9 h-9 rounded-[4px] bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <app-icon name="sparkles" [size]="18" svgClass="text-amber-800"></app-icon>
                </div>
                <div>
                  <strong class="block text-xs font-semibold text-[#2D2823]">
                    Chọn từ thư viện AI Vision (Khuyên dùng)
                  </strong>
                  <span class="text-[11px] text-[#7D6853] block mt-0.5">
                    Dùng ảnh học viên đã chụp, kèm 100% tọa độ Bounding Box & từ vựng sẵn có
                  </span>
                </div>
              </button>

              <!-- Nguồn 2: Tải ảnh từ máy tính -->
              <button
                type="button"
                (click)="arenaFileInput.click()"
                class="p-3 rounded-[4px] border-2 border-dashed border-[#E5DED3] hover:border-[#7D6853] bg-[#FAF8F5] hover:bg-white transition-all text-left flex items-start gap-3 cursor-pointer group"
              >
                <div class="w-9 h-9 rounded-[4px] bg-[#EFEAE1] border border-[#E5DED3] text-[#7D6853] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <app-icon name="upload" [size]="18" svgClass="text-[#7D6853]"></app-icon>
                </div>
                <div>
                  <strong class="block text-xs font-semibold text-[#2D2823]">
                    Tải ảnh mới từ máy tính
                  </strong>
                  <span class="text-[11px] text-[#8C827A] block mt-0.5">
                    Tải file ảnh (PNG, JPG) và bấm AI Vision quét nhận diện vật thể tự động
                  </span>
                </div>
              </button>
              <input #arenaFileInput type="file" accept="image/*" (change)="onUploadArenaImage($event)" class="hidden" />
            </div>

            <!-- Đường dẫn ảnh & nút quét AI -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div class="relative flex-1">
                <input 
                  type="text" 
                  [(ngModel)]="stageFormImageUrl"
                  placeholder="Đường dẫn ảnh bối cảnh (/kitchen_refrigerator.png hoặc URL)..."
                  class="w-full px-3 py-1.5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-mono text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
                />
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  (click)="stageFormImageUrl = '/kitchen_refrigerator.png'"
                  class="px-2 py-1 rounded-[3px] border border-[#E5DED3] bg-white text-[11px] font-medium text-[#5C5249] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Ảnh bếp
                </button>
                <button
                  type="button"
                  (click)="stageFormImageUrl = '/living_room.jpg'"
                  class="px-2 py-1 rounded-[3px] border border-[#E5DED3] bg-white text-[11px] font-medium text-[#5C5249] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Ảnh phòng khách
                </button>
                <button
                  *ngIf="selectedUploadFile"
                  type="button"
                  (click)="scanUploadedImageWithYolo()"
                  [disabled]="aiScanning()"
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-[3px] bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-semibold border border-amber-600 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <app-icon name="sparkles" [size]="12" svgClass="text-stone-950"></app-icon>
                  <span>{{ aiScanning() ? 'Đang quét AI...' : 'AI Vision quét đồ vật' }}</span>
                </button>
              </div>
            </div>

            <!-- KHUNG XEM TRƯỚC ẢNH TƯƠNG TÁC BOUNDING BOXES TRỰC TIẾP TRÊN CANVAS -->
            <div 
              #previewContainer
              *ngIf="stageFormImageUrl" 
              (mousedown)="onCanvasMouseDown($event, previewContainer)"
              class="relative w-full aspect-[16/9] max-h-80 rounded-[4px] overflow-hidden bg-stone-950 border border-[#E5DED3] select-none flex items-center justify-center cursor-crosshair group shadow-inner"
            >
              <img 
                [src]="getImageUrl(stageFormImageUrl)" 
                (error)="handleImageError($event)"
                alt="Xem trước đấu trường" 
                class="w-full h-full object-cover pointer-events-none"
                draggable="false"
              />

              <!-- Thanh chỉ dẫn thao tác chuột trực tiếp -->
              <div class="absolute top-2 left-2 right-2 flex items-center justify-between text-[11px] pointer-events-none z-30">
                <span class="px-2 py-0.5 rounded-[3px] bg-stone-900/85 text-amber-200 font-medium backdrop-blur-xs border border-stone-700/60 shadow-xs flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>Kéo khung để di chuyển · Kéo góc dưới-phải để co giãn · Kéo trên ảnh để vẽ khung mới</span>
                </span>
                <span *ngIf="activeDragMode !== 'none'" class="px-2 py-0.5 rounded-[3px] bg-amber-500 text-stone-950 font-semibold shadow-xs">
                  {{ activeDragMode === 'move' ? 'Đang di chuyển' : (activeDragMode === 'resize' ? 'Đang co giãn' : 'Đang vẽ khung') }}
                </span>
              </div>

              <!-- Khung đang vẽ mới (Live Drawing Box) -->
              <div 
                *ngIf="drawingBox"
                [style.top.%]="drawingBox.topPercent"
                [style.left.%]="drawingBox.leftPercent"
                [style.width.%]="drawingBox.widthPercent"
                [style.height.%]="drawingBox.heightPercent"
                class="absolute border-2 border-dashed border-amber-400 bg-amber-400/25 rounded-[2px] z-30 pointer-events-none flex items-center justify-center"
              >
                <span class="px-1.5 py-0.5 rounded bg-stone-950/90 text-amber-300 font-mono text-[10px] font-semibold">
                  {{ drawingBox.widthPercent }}% × {{ drawingBox.heightPercent }}%
                </span>
              </div>

              <!-- Overlay Bounding Boxes của các đồ vật ĐƯỢC CHỌN -->
              <ng-container *ngFor="let w of stageFormWords; let i = index">
                <div 
                  *ngIf="w.selected !== false"
                  (mousedown)="startMoveBox($event, i, previewContainer)"
                  (mouseenter)="hoveredWordIndex.set(i)"
                  (mouseleave)="hoveredWordIndex.set(null)"
                  [style.top.%]="w.topPercent"
                  [style.left.%]="w.leftPercent"
                  [style.width.%]="w.widthPercent"
                  [style.height.%]="w.heightPercent"
                  [class.border-amber-400]="hoveredWordIndex() === i || activeDragIndex === i"
                  [class.bg-amber-400\/25]="hoveredWordIndex() === i || activeDragIndex === i"
                  [class.z-25]="hoveredWordIndex() === i || activeDragIndex === i"
                  [class.border-emerald-400\/90]="hoveredWordIndex() !== i && activeDragIndex !== i"
                  [class.bg-emerald-500\/15]="hoveredWordIndex() !== i && activeDragIndex !== i"
                  class="absolute border-2 rounded-[2px] select-none flex flex-col justify-between p-1 pointer-events-auto cursor-move transition-[border-color,background-color] duration-150"
                >
                  <!-- Hàng trên: STT + tên từ + nút xóa ✕ -->
                  <div class="flex items-center justify-between w-full pointer-events-none gap-1">
                    <span 
                      [class.bg-amber-400]="hoveredWordIndex() === i || activeDragIndex === i"
                      [class.text-stone-950]="hoveredWordIndex() === i || activeDragIndex === i"
                      [class.bg-stone-900\/80]="hoveredWordIndex() !== i && activeDragIndex !== i"
                      [class.text-white]="hoveredWordIndex() !== i && activeDragIndex !== i"
                      class="px-1.5 py-0.2 rounded-[2px] font-sans text-[10px] font-semibold backdrop-blur-xs shadow-xs truncate max-w-[85%]"
                    >
                      {{ i + 1 }}. {{ w.word || 'Vật thể ' + (i + 1) }}
                    </span>
                    <button
                      *ngIf="hoveredWordIndex() === i || activeDragIndex === i"
                      type="button"
                      (click)="removeWordFromStageForm(i); $event.stopPropagation()"
                      title="Xóa đồ vật này"
                      class="w-4 h-4 rounded-[2px] bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center text-[10px] font-semibold border-0 cursor-pointer pointer-events-auto shadow-xs leading-none shrink-0"
                    >
                      ✕
                    </button>
                  </div>

                  <!-- Hàng dưới: Nghĩa tiếng Việt + Resize Handle góc dưới-phải -->
                  <div class="flex items-end justify-between w-full pointer-events-none gap-1 mt-auto">
                    <span *ngIf="hoveredWordIndex() === i || activeDragIndex === i" class="text-[9px] font-medium bg-stone-900\/90 text-amber-200 px-1 py-0.2 rounded-[2px] backdrop-blur-xs truncate max-w-[80%]">
                      {{ w.vietnamese || 'Chưa có nghĩa' }} ({{ w.leftPercent }}%, {{ w.topPercent }}%)
                    </span>
                    <div *ngIf="hoveredWordIndex() !== i && activeDragIndex !== i"></div>

                    <!-- Nút kéo thay đổi kích thước (Resize Anchor Handle) -->
                    <div 
                      (mousedown)="startResizeBox($event, i, previewContainer)"
                      title="Kéo góc để co giãn kích thước khung"
                      class="w-3.5 h-3.5 bg-amber-400 hover:bg-amber-300 border border-stone-950 rounded-[2px] cursor-nwse-resize shadow-xs flex items-center justify-center pointer-events-auto shrink-0"
                    >
                      <div class="w-1.5 h-1.5 border-r border-b border-stone-950"></div>
                    </div>
                  </div>
                </div>
              </ng-container>

              <!-- Tag góc dưới ảnh -->
              <div class="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[10px] text-white/90 pointer-events-none z-20">
                <span class="px-1.5 py-0.5 rounded-[2px] bg-black/75 backdrop-blur-xs font-mono">
                  Đang hiển thị: {{ selectedWordsCount }} / {{ stageFormWords.length }} đồ vật
                </span>
                <span *ngIf="aiScanning()" class="px-2 py-0.5 rounded-[2px] bg-amber-500 text-stone-950 font-semibold flex items-center gap-1 animate-pulse">
                  <app-icon name="sparkles" [size]="10"></app-icon>
                  <span>AI đang quét đồ vật...</span>
                </span>
              </div>
            </div>

          </div>

          <!-- KHỐI 2: THÔNG TIN BỐI CẢNH -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E5DED3]">
            <div class="sm:col-span-2 space-y-1">
              <label class="block font-semibold text-[#2D2823]">Tên đấu trường <span class="text-rose-600">*</span></label>
              <input 
                type="text" 
                [(ngModel)]="stageFormTitle"
                placeholder="VD: Gian bếp đời thực, Góc làm việc sáng tạo..."
                class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-medium text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
              />
            </div>

            <div class="space-y-1">
              <label class="block font-semibold text-[#2D2823]">Chủ đề bối cảnh</label>
              <select 
                [(ngModel)]="stageFormCategory"
                class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-semibold text-[#7D6853] focus:outline-none cursor-pointer"
              >
                <option value="Đời Sống Gia Đình">Đời sống gia đình</option>
                <option value="Học Tập & Công Việc">Học tập & công việc</option>
                <option value="Nội Thất & Tiện Nghi">Nội thất & tiện nghi</option>
                <option value="Ẩm Thực & Tiếp Đãi">Ẩm thực & tiếp đãi</option>
                <option value="Không Gian Đô Thị">Không gian đô thị</option>
              </select>
            </div>

            <div class="sm:col-span-3 space-y-1">
              <label class="block font-semibold text-[#2D2823]">Mô tả bối cảnh / Phụ đề</label>
              <input 
                type="text" 
                [(ngModel)]="stageFormSubtitle"
                placeholder="VD: Bối cảnh thi đấu chính thức tuần này dành cho toàn thể học viên"
                class="w-full px-3 py-2 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-medium text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
              />
            </div>
          </div>

          <!-- KHỐI 3: DANH SÁCH ĐỒ VẬT NHẬN DIỆN (TICK CHỌN & CHỈNH SỬA) -->
          <div class="space-y-2.5 pt-2 border-t border-[#E5DED3]">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <strong class="text-xs font-semibold text-[#2D2823]">
                  Danh sách đồ vật nhận diện ({{ selectedWordsCount }} / {{ stageFormWords.length }} đồ vật được chọn)
                </strong>
                <p class="text-[10px] text-[#8C827A] mt-0.5 m-0">
                  Tick chọn các đồ vật bạn muốn đưa vào bài thi đấu trường. AI đã tự điền tọa độ và từ điển chuẩn.
                </p>
              </div>

              <div class="flex items-center gap-1.5 flex-wrap">
                <button 
                  type="button"
                  (click)="toggleAllWords(true)"
                  class="px-2 py-1 rounded-[3px] border border-[#E5DED3] bg-white text-[11px] font-semibold text-[#5C5249] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Chọn tất cả
                </button>
                <button 
                  type="button"
                  (click)="toggleAllWords(false)"
                  class="px-2 py-1 rounded-[3px] border border-[#E5DED3] bg-white text-[11px] font-semibold text-[#5C5249] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Bỏ chọn tất cả
                </button>
                <button 
                  type="button"
                  (click)="openCefrPicker()"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] bg-[#FAF8F5] hover:bg-[#EFEAE1] border border-[#E5DED3] text-[#7D6853] text-[11px] font-semibold cursor-pointer shadow-2xs"
                >
                  <app-icon name="book-open" [size]="12"></app-icon>
                  <span>+ Kho CEFR</span>
                </button>
                <button 
                  type="button"
                  (click)="addWordToStageForm()"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] bg-[#7D6853] hover:bg-[#685542] text-white text-[11px] font-semibold cursor-pointer shadow-2xs"
                >
                  <app-icon name="plus" [size]="11" svgClass="text-white"></app-icon>
                  <span>+ Thêm thủ công</span>
                </button>
              </div>
            </div>

            <!-- Danh sách từng từ vựng có Checkbox -->
            <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
              <div *ngIf="stageFormWords.length === 0" class="p-6 text-center bg-[#FAF8F5] rounded-[4px] border border-[#E5DED3] text-[#8C827A]">
                <p class="text-xs font-semibold m-0">Chưa có đồ vật nào trong đấu trường.</p>
                <p class="text-[11px] mt-1 m-0">Hãy bấm "Chọn từ thư viện AI Vision" hoặc tải ảnh lên để AI tự động nhận diện!</p>
              </div>

              <div 
                *ngFor="let w of stageFormWords; let i = index"
                (mouseenter)="hoveredWordIndex.set(i)"
                (mouseleave)="hoveredWordIndex.set(null)"
                [class.border-amber-400]="hoveredWordIndex() === i"
                [class.bg-amber-50\/20]="hoveredWordIndex() === i"
                [class.opacity-50]="w.selected === false"
                class="p-2.5 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] space-y-2 transition-all"
              >
                <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <!-- Checkbox & STT -->
                  <div class="sm:col-span-2 flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="w.selected"
                      class="w-4 h-4 rounded text-[#7D6853] cursor-pointer"
                      title="Tick để đưa vào bài thi đấu trường"
                    />
                    <span class="w-5 h-5 rounded-full bg-white border border-[#E5DED3] text-[#7D6853] font-semibold text-[10px] flex items-center justify-center shrink-0">
                      {{ i + 1 }}
                    </span>
                  </div>

                  <!-- Từ tiếng Anh -->
                  <div class="sm:col-span-3">
                    <input 
                      type="text" 
                      [(ngModel)]="w.word"
                      placeholder="Từ tiếng Anh"
                      class="w-full px-2 py-1.5 rounded-[3px] bg-white border border-[#E5DED3] text-xs font-semibold text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
                    />
                  </div>

                  <!-- Phiên âm IPA -->
                  <div class="sm:col-span-2">
                    <input 
                      type="text" 
                      [(ngModel)]="w.ipa"
                      placeholder="IPA"
                      class="w-full px-2 py-1.5 rounded-[3px] bg-white border border-[#E5DED3] text-xs font-mono text-[#7D6853] focus:outline-none"
                    />
                  </div>

                  <!-- Nghĩa tiếng Việt -->
                  <div class="sm:col-span-3">
                    <input 
                      type="text" 
                      [(ngModel)]="w.vietnamese"
                      placeholder="Nghĩa tiếng Việt"
                      class="w-full px-2 py-1.5 rounded-[3px] bg-white border border-[#E5DED3] text-xs font-medium text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
                    />
                  </div>

                  <!-- Cấp độ CEFR -->
                  <div class="sm:col-span-1">
                    <select 
                      [(ngModel)]="w.level"
                      class="w-full px-1.5 py-1.5 rounded-[3px] bg-white border border-[#E5DED3] text-xs font-semibold text-[#7D6853] focus:outline-none"
                    >
                      <option value="A1">A1</option>
                      <option value="A2">A2</option>
                      <option value="B1">B1</option>
                      <option value="B2">B2</option>
                      <option value="C1">C1</option>
                    </select>
                  </div>

                  <!-- Nút hành động -->
                  <div class="sm:col-span-1 flex items-center justify-end gap-1">
                    <button 
                      type="button"
                      (click)="w.showCoords = !w.showCoords"
                      class="p-1 rounded-[3px] text-[#8C827A] hover:bg-white border-0 bg-transparent cursor-pointer"
                      title="Xem / chỉnh tọa độ Bounding Box"
                    >
                      <app-icon name="crosshair" [size]="13"></app-icon>
                    </button>
                    <button 
                      type="button"
                      (click)="removeWordFromStageForm(i)"
                      class="p-1 rounded-[3px] text-rose-600 hover:bg-rose-50 border-0 bg-transparent cursor-pointer"
                      title="Xóa đồ vật này"
                    >
                      <app-icon name="trash" [size]="13"></app-icon>
                    </button>
                  </div>
                </div>

                <!-- Tọa độ Bounding Box (%) (chỉ hiện khi click icon crosshair) -->
                <div *ngIf="w.showCoords" class="grid grid-cols-4 gap-2 pt-1.5 border-t border-[#E5DED3]/60 text-[11px] font-mono text-[#5C5249] bg-white p-2 rounded-[3px]">
                  <div class="flex items-center gap-1">
                    <span>Top:</span>
                    <input type="number" [(ngModel)]="w.topPercent" min="0" max="100" class="w-12 px-1 py-0.5 rounded bg-[#FAF8F5] border border-[#E5DED3] text-xs font-mono"/>
                    <span>%</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span>Left:</span>
                    <input type="number" [(ngModel)]="w.leftPercent" min="0" max="100" class="w-12 px-1 py-0.5 rounded bg-[#FAF8F5] border border-[#E5DED3] text-xs font-mono"/>
                    <span>%</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span>Width:</span>
                    <input type="number" [(ngModel)]="w.widthPercent" min="5" max="100" class="w-12 px-1 py-0.5 rounded bg-[#FAF8F5] border border-[#E5DED3] text-xs font-mono"/>
                    <span>%</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span>Height:</span>
                    <input type="number" [(ngModel)]="w.heightPercent" min="5" max="100" class="w-12 px-1 py-0.5 rounded bg-[#FAF8F5] border border-[#E5DED3] text-xs font-mono"/>
                    <span>%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Footer Modal -->
        <div class="p-4 border-t border-[#E5DED3] bg-[#FAF8F5] flex items-center justify-between shrink-0">
          <button 
            type="button"
            (click)="arenaModalOpen.set(false)"
            class="px-4 py-2 rounded-[4px] border border-[#E5DED3] bg-white text-xs font-semibold text-[#5C5249] hover:text-[#2D2823] cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button 
            type="button"
            (click)="saveStageForm()"
            class="inline-flex items-center gap-1.5 px-5 py-2 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-colors"
          >
            <app-icon name="check" [size]="14" svgClass="text-white"></app-icon>
            <span>{{ arenaModalMode() === 'create' ? 'Tạo đấu trường (' + selectedWordsCount + ' đồ vật)' : 'Lưu thay đổi' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- =========================================================================
         13. MODAL CON: CHỌN BỐI CẢNH TỪ THƯ VIỆN AI VISION (HỌC VIÊN & HỆ THỐNG)
         ========================================================================= -->
    <div 
      *ngIf="aiVisionPickerOpen()" 
      class="fixed inset-0 bg-[#2D2823]/60 backdrop-blur-2xs z-60 flex items-center justify-center p-3 sm:p-4 animate-fade-in"
    >
      <div class="w-full max-w-4xl max-h-[88vh] bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl flex flex-col overflow-hidden">
        
        <!-- Header -->
        <div class="p-4 sm:p-5 border-b border-[#E5DED3] flex items-center justify-between bg-[#FAF8F5]">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-[4px] bg-amber-500 text-stone-950 flex items-center justify-center shadow-xs font-semibold">
              <app-icon name="sparkles" [size]="16" svgClass="text-stone-950"></app-icon>
            </div>
            <div>
              <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823] m-0">
                Thư viện bối cảnh AI Vision (Học viên & hệ thống)
              </h3>
              <p class="text-[11px] text-[#8C827A] m-0 mt-0.5">
                Chọn một bức ảnh chụp thực tế đã được AI quét sẵn để nạp trọn bộ đồ vật và tọa độ Bounding Box
              </p>
            </div>
          </div>

          <button 
            type="button"
            (click)="aiVisionPickerOpen.set(false)"
            class="p-1.5 rounded-[4px] text-[#8C827A] hover:bg-white border-0 bg-transparent cursor-pointer"
          >
            <app-icon name="x" [size]="16"></app-icon>
          </button>
        </div>

        <!-- Toolbar tìm kiếm -->
        <div class="p-3 border-b border-[#E5DED3] bg-white flex items-center gap-2">
          <div class="relative flex-1">
            <app-icon name="search" [size]="14" class="absolute left-3 top-2.5 text-[#8C827A]"></app-icon>
            <input 
              type="text" 
              [ngModel]="aiVisionPickerSearch()"
              (ngModelChange)="aiVisionPickerSearch.set($event)"
              placeholder="Tìm theo chủ đề bối cảnh, tên học viên, nhãn đồ vật..."
              class="w-full pl-9 pr-3 py-1.5 rounded-[3px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-medium text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
            />
          </div>
          <span class="text-xs font-mono text-[#7D6853] shrink-0 font-semibold">
            {{ filteredLibraryCaptures().length }} bối cảnh
          </span>
        </div>

        <!-- Body: Lưới các bối cảnh -->
        <div class="p-4 overflow-y-auto flex-1">
          <div *ngIf="filteredLibraryCaptures().length === 0" class="p-10 text-center text-[#8C827A] space-y-1">
            <p class="text-xs font-semibold m-0">Không tìm thấy bối cảnh nào phù hợp với từ khóa.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            <div 
              *ngFor="let cap of filteredLibraryCaptures()"
              (click)="selectCaptureForStage(cap)"
              class="bg-white rounded-[4px] border border-[#E5DED3] overflow-hidden shadow-xs hover:shadow-md hover:border-[#7D6853] transition-all cursor-pointer flex flex-col justify-between group"
            >
              <!-- Thumbnail -->
              <div class="relative w-full h-36 bg-stone-900 overflow-hidden">
                <img 
                  [src]="getImageUrl(cap.imageUrl)" 
                  (error)="handleImageError($event)"
                  [alt]="cap.sceneTheme" 
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>

                <div class="absolute top-2 left-2">
                  <span class="px-2 py-0.5 rounded-[2px] bg-black/70 backdrop-blur-xs text-white text-[10px] font-semibold">
                    {{ cap.sceneTheme }}
                  </span>
                </div>

                <div class="absolute top-2 right-2">
                  <span class="px-2 py-0.5 rounded-[2px] bg-amber-400 text-stone-950 text-[10px] font-semibold flex items-center gap-1 shadow-xs">
                    <app-icon name="sparkles" [size]="9"></app-icon>
                    <span>{{ cap.detectedCount }} vật thể</span>
                  </span>
                </div>

                <div class="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[10px] text-white/90">
                  <span class="truncate max-w-[140px]">{{ cap.userName }}</span>
                  <span class="text-white/70">{{ cap.timeAgo }}</span>
                </div>
              </div>

              <!-- Content chips -->
              <div class="p-2.5 flex-1 flex flex-col justify-between space-y-2">
                <div class="flex flex-wrap gap-1 max-h-12 overflow-hidden">
                  <span 
                    *ngFor="let label of cap.objectLabels | slice:0:5"
                    class="px-1.5 py-0.2 rounded-[2px] bg-[#FAF8F5] border border-[#E5DED3] text-[10px] font-medium text-[#2D2823]"
                  >
                    {{ label }}
                  </span>
                  <span *ngIf="cap.objectLabels.length > 5" class="px-1 py-0.2 text-[9px] text-[#8C827A] font-semibold">
                    +{{ cap.objectLabels.length - 5 }}
                  </span>
                </div>

                <button 
                  type="button"
                  class="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-[3px] bg-amber-500 hover:bg-amber-600 text-stone-950 font-semibold text-xs cursor-pointer transition-colors shadow-2xs"
                >
                  <app-icon name="check" [size]="12"></app-icon>
                  <span>Chọn bối cảnh này</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-3 border-t border-[#E5DED3] bg-[#FAF8F5] flex justify-end">
          <button 
            type="button"
            (click)="aiVisionPickerOpen.set(false)"
            class="px-4 py-1.5 rounded-[4px] border border-[#E5DED3] bg-white text-xs font-semibold text-[#5C5249] cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>

    <!-- =========================================================================
         14. MODAL CON: CHỌN NHANH TỪ VỰNG TỪ KHO CEFR
         ========================================================================= -->
    <div 
      *ngIf="cefrPickerOpen()" 
      class="fixed inset-0 bg-[#2D2823]/60 backdrop-blur-2xs z-60 flex items-center justify-center p-3 sm:p-4 animate-fade-in"
    >
      <div class="w-full max-w-lg max-h-[80vh] bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl flex flex-col overflow-hidden">
        
        <!-- Header -->
        <div class="p-4 border-b border-[#E5DED3] flex items-center justify-between bg-[#FAF8F5]">
          <div class="flex items-center gap-2">
            <app-icon name="book-open" [size]="16" svgClass="text-[#7D6853]"></app-icon>
            <h3 class="font-serif font-semibold text-xs sm:text-sm text-[#2D2823] m-0">
              Chọn từ vựng từ kho từ điển CEFR
            </h3>
          </div>
          <button 
            type="button"
            (click)="cefrPickerOpen.set(false)"
            class="p-1 rounded text-[#8C827A] hover:bg-white border-0 bg-transparent cursor-pointer"
          >
            <app-icon name="x" [size]="15"></app-icon>
          </button>
        </div>

        <!-- Search -->
        <div class="p-3 border-b border-[#E5DED3] bg-white">
          <input 
            type="text" 
            [ngModel]="cefrPickerSearch()"
            (ngModelChange)="cefrPickerSearch.set($event)"
            placeholder="Gõ từ tiếng Anh, nghĩa tiếng Việt, hoặc CEFR..."
            class="w-full px-3 py-1.5 rounded-[3px] bg-[#FAF8F5] border border-[#E5DED3] text-xs font-medium text-[#2D2823] focus:outline-none focus:border-[#7D6853]"
          />
        </div>

        <!-- List -->
        <div class="p-3 overflow-y-auto flex-1 space-y-1.5 max-h-80">
          <div 
            *ngFor="let item of filteredCefrWords()"
            (click)="addWordFromCefr(item)"
            class="p-2 rounded-[3px] border border-[#E5DED3] hover:border-[#7D6853] hover:bg-[#FAF8F5] flex items-center justify-between cursor-pointer transition-colors"
          >
            <div class="flex items-center gap-2">
              <span class="font-semibold text-xs text-[#2D2823]">{{ item.word }}</span>
              <span *ngIf="item.phoneticIpa" class="font-mono text-[11px] text-[#7D6853]">{{ item.phoneticIpa }}</span>
              <span class="text-xs text-[#5C5249]">· {{ item.vietnameseMeaning }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="px-1.5 py-0.2 rounded-[2px] text-[10px] font-semibold bg-[#FAF8F5] border border-[#E5DED3] text-[#7D6853]">
                {{ item.cefrLevel }}
              </span>
              <app-icon name="plus" [size]="12" svgClass="text-[#7D6853]"></app-icon>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-3 border-t border-[#E5DED3] bg-[#FAF8F5] flex justify-end">
          <button 
            type="button"
            (click)="cefrPickerOpen.set(false)"
            class="px-4 py-1.5 rounded-[4px] border border-[#E5DED3] bg-white text-xs font-semibold text-[#5C5249] cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>

    <!-- =========================================================================
         13. MODAL: XÁC NHẬN XÓA ĐẤU TRƯỜNG
         ========================================================================= -->
    <div 
      *ngIf="deleteStageModalOpen()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-60 flex items-center justify-center p-4 animate-fade-in"
    >
      <div class="w-full max-w-sm bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl p-5 space-y-4">
        
        <div class="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto">
          <app-icon name="trash" [size]="18"></app-icon>
        </div>

        <div class="text-center space-y-1">
          <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823]">
            Xóa đấu trường?
          </h3>
          <p class="text-xs text-[#5C5249] leading-relaxed">
            Bạn có chắc chắn muốn xóa đấu trường <strong class="text-[#2D2823]">'{{ stageToDelete()?.title }}'</strong> khỏi hệ thống?
          </p>
        </div>

        <div class="pt-2 flex items-center justify-center gap-2.5">
          <button 
            type="button"
            (click)="deleteStageModalOpen.set(false)"
            class="px-4 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs font-semibold text-[#5C5249] hover:text-[#2D2823] cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button 
            type="button"
            (click)="executeDeleteStage()"
            class="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all active:scale-95"
          >
            <app-icon name="trash" [size]="14" svgClass="text-white"></app-icon>
            <span>Xác nhận xóa</span>
          </button>
        </div>

      </div>
    </div>

    <!-- =========================================================================
         14. MODAL: CHI TIẾT & KIỂM DUYỆT PHÒNG HỌC
         ========================================================================= -->
    <div 
      *ngIf="showClassroomDetailModal()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-50 flex items-center justify-center p-3 sm:p-5 animate-fade-in"
    >
      <div class="w-full max-w-4xl bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        <!-- Header Modal -->
        <div class="p-4 sm:p-5 border-b border-[#E5DED3] flex items-start justify-between bg-white shrink-0">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-[#7D6853] shrink-0 mt-0.5">
              <app-icon name="layers" [size]="20"></app-icon>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-mono font-semibold text-xs px-2 py-0.5 rounded-[3px] bg-amber-50 text-amber-900 border border-amber-200">
                  {{ selectedClassroomDetail()?.classroom?.code }}
                </span>
                <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823] tracking-tight m-0">
                  {{ selectedClassroomDetail()?.classroom?.name }}
                </h3>
                <span class="px-1.5 py-0.5 rounded-[2px] font-mono font-semibold text-[10px] bg-[#F1ECE3] text-[#7D6853] border border-[#E5DED3]">
                  {{ selectedClassroomDetail()?.classroom?.targetLevel || 'A2' }}
                </span>
                <span 
                  *ngIf="selectedClassroomDetail()?.classroom?.status !== 'LOCKED'"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-emerald-50 text-emerald-800 border border-emerald-200"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Đang mở</span>
                </span>
                <span 
                  *ngIf="selectedClassroomDetail()?.classroom?.status === 'LOCKED'"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-rose-50 text-rose-800 border border-rose-200"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span>Đã khóa</span>
                </span>
              </div>
              <p class="text-xs text-[#5C5249] mt-1 flex flex-wrap items-center gap-2">
                <span>Chủ phòng: <strong class="text-[#2D2823]">{{ selectedClassroomDetail()?.classroom?.ownerFullName || selectedClassroomDetail()?.classroom?.ownerUsername }}</strong></span>
                <span *ngIf="selectedClassroomDetail()?.classroom?.ownerEmail" class="text-[#8C827A]">({{ selectedClassroomDetail()?.classroom?.ownerEmail }})</span>
                <span class="text-[#8C827A]">·</span>
                <span class="text-[#8C827A]">{{ selectedClassroomDetail()?.classroom?.memberCount || 0 }} thành viên</span>
                <span class="text-[#8C827A]">·</span>
                <span class="text-[#8C827A]">{{ selectedClassroomDetail()?.classroom?.wordsCount || 0 }} từ vựng</span>
              </p>
              <p *ngIf="selectedClassroomDetail()?.classroom?.description" class="text-xs text-[#746B60] italic mt-1 bg-[#FAF8F5] px-2.5 py-1 rounded-[3px] border border-[#E5DED3]/60">
                "{{ selectedClassroomDetail()?.classroom?.description }}"
              </p>
            </div>
          </div>

          <button 
            type="button"
            (click)="closeClassroomDetailModal()"
            class="text-[#8C827A] hover:text-[#2D2823] p-1.5 rounded-[4px] hover:bg-[#FAF8F5] transition-colors border-0 cursor-pointer"
          >
            <app-icon name="x" [size]="18"></app-icon>
          </button>
        </div>

        <!-- Sub Tabs Navigation -->
        <div class="px-5 border-b border-[#E5DED3] bg-[#FAF8F5] flex items-center gap-4 shrink-0">
          <button 
            type="button"
            (click)="classroomDetailActiveTab.set('words')"
            [class.border-b-2]="classroomDetailActiveTab() === 'words'"
            [class.border-[#7D6853]]="classroomDetailActiveTab() === 'words'"
            [class.text-[#2D2823]]="classroomDetailActiveTab() === 'words'"
            [class.font-semibold]="classroomDetailActiveTab() === 'words'"
            [class.text-[#5C5249]]="classroomDetailActiveTab() !== 'words'"
            class="py-3 text-xs cursor-pointer border-0 bg-transparent flex items-center gap-1.5 transition-all"
          >
            <app-icon name="book-open" [size]="14"></app-icon>
            <span>Bộ từ vựng trong phòng</span>
            <span class="font-mono text-[10px] px-1.5 py-0.2 rounded-[2px] bg-white border border-[#E5DED3] text-[#7D6853]">
              {{ selectedClassroomDetail()?.words?.length || 0 }}
            </span>
          </button>

          <button 
            type="button"
            (click)="classroomDetailActiveTab.set('members')"
            [class.border-b-2]="classroomDetailActiveTab() === 'members'"
            [class.border-[#7D6853]]="classroomDetailActiveTab() === 'members'"
            [class.text-[#2D2823]]="classroomDetailActiveTab() === 'members'"
            [class.font-semibold]="classroomDetailActiveTab() === 'members'"
            [class.text-[#5C5249]]="classroomDetailActiveTab() !== 'members'"
            class="py-3 text-xs cursor-pointer border-0 bg-transparent flex items-center gap-1.5 transition-all"
          >
            <app-icon name="users" [size]="14"></app-icon>
            <span>Tiến độ Flashcard học viên</span>
            <span class="font-mono text-[10px] px-1.5 py-0.2 rounded-[2px] bg-white border border-[#E5DED3] text-[#7D6853]">
              {{ selectedClassroomDetail()?.memberProgresses?.length || 0 }}
            </span>
          </button>

          <button 
            type="button"
            (click)="classroomDetailActiveTab.set('leaderboard')"
            [class.border-b-2]="classroomDetailActiveTab() === 'leaderboard'"
            [class.border-[#7D6853]]="classroomDetailActiveTab() === 'leaderboard'"
            [class.text-[#2D2823]]="classroomDetailActiveTab() === 'leaderboard'"
            [class.font-semibold]="classroomDetailActiveTab() === 'leaderboard'"
            [class.text-[#5C5249]]="classroomDetailActiveTab() !== 'leaderboard'"
            class="py-3 text-xs cursor-pointer border-0 bg-transparent flex items-center gap-1.5 transition-all"
          >
            <app-icon name="award" [size]="14"></app-icon>
            <span>Bảng xếp hạng Quiz</span>
            <span class="font-mono text-[10px] px-1.5 py-0.2 rounded-[2px] bg-white border border-[#E5DED3] text-[#7D6853]">
              {{ selectedClassroomDetail()?.leaderboard?.length || 0 }}
            </span>
          </button>
        </div>

        <!-- Body Modal Scrollable -->
        <div class="p-5 overflow-y-auto flex-1 min-h-[300px]">
          
          <!-- Loading State -->
          <div *ngIf="classroomDetailLoading()" class="py-16 text-center text-xs text-[#5C5249] space-y-2">
            <app-icon name="refresh-cw" [size]="20" svgClass="text-[#7D6853] animate-spin mx-auto"></app-icon>
            <p>Đang tải dữ liệu chi tiết phòng học...</p>
          </div>

          <!-- TAB 1: DANH SÁCH TỪ VỰNG & PHÊ DUYỆT VÀO CEFR -->
          <div *ngIf="!classroomDetailLoading() && classroomDetailActiveTab() === 'words'" class="space-y-3">
            <div class="flex items-center justify-between text-xs text-[#5C5249] bg-[#FAF8F5] p-2.5 rounded-[4px] border border-[#E5DED3]">
              <div class="flex items-center gap-2">
                <app-icon name="info" [size]="14" svgClass="text-[#7D6853]"></app-icon>
                <span>Các từ vựng do chủ phòng chia sẻ. Quản trị viên có thể kiểm duyệt và phê duyệt đưa vào <strong>Kho từ điển CEFR chính thức</strong>.</span>
              </div>
            </div>

            <div class="overflow-x-auto border border-[#E5DED3] rounded-[4px]">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-[#FAF8F5] border-b border-[#E5DED3] text-[#7D6853] uppercase text-[10px] tracking-wider font-semibold">
                    <th class="py-2 px-3 w-10 text-center">#</th>
                    <th class="py-2 px-3">Từ vựng</th>
                    <th class="py-2 px-3">Phiên âm IPA</th>
                    <th class="py-2 px-3">Loại từ</th>
                    <th class="py-2 px-3">Nghĩa tiếng Việt</th>
                    <th class="py-2 px-3">Ví dụ ngữ cảnh</th>
                    <th class="py-2 px-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E5DED3]/60">
                  <tr *ngFor="let w of selectedClassroomDetail()?.words; let idx = index" class="hover:bg-[#FAF8F5]/80">
                    <td class="py-2.5 px-3 text-center text-[#8C827A] font-mono text-[11px]">{{ idx + 1 }}</td>
                    <td class="py-2.5 px-3">
                      <div class="flex items-center gap-1.5">
                        <span class="font-serif font-semibold text-xs sm:text-sm text-[#2D2823]">{{ w.word }}</span>
                        <button 
                          type="button"
                          (click)="playNativeAudio(w.word)"
                          class="p-1 rounded text-[#8C827A] hover:text-[#7D6853] hover:bg-[#FAF8F5] border-0 cursor-pointer"
                          title="Phát âm từ này"
                        >
                          <app-icon name="volume-2" [size]="12"></app-icon>
                        </button>
                      </div>
                    </td>
                    <td class="py-2.5 px-3 font-mono text-xs text-[#7D6853]">{{ w.ipa || '—' }}</td>
                    <td class="py-2.5 px-3">
                      <span class="px-1.5 py-0.5 rounded-[2px] font-mono text-[10px] bg-[#FAF8F5] text-[#5C5249] border border-[#E5DED3]">
                        {{ w.partOfSpeech || 'noun' }}
                      </span>
                    </td>
                    <td class="py-2.5 px-3 font-medium text-[#2D2823]">{{ w.vietnamese }}</td>
                    <td class="py-2.5 px-3 max-w-xs">
                      <div *ngIf="w.exampleEn" class="text-[11px] text-[#5C5249] italic">"{{ w.exampleEn }}"</div>
                      <div *ngIf="w.exampleVi" class="text-[10px] text-[#8C827A]">{{ w.exampleVi }}</div>
                      <span *ngIf="!w.exampleEn && !w.exampleVi" class="text-[#8C827A]">—</span>
                    </td>
                    <td class="py-2.5 px-3 text-right">
                      <button
                        *ngIf="w.id"
                        type="button"
                        (click)="promoteClassroomWord(w)"
                        [disabled]="promotingWordId() === w.id"
                        class="inline-flex items-center gap-1 px-2 py-1 rounded-[3px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold cursor-pointer transition-all disabled:opacity-50"
                        title="Duyệt mục từ này vào Kho từ điển CEFR của hệ thống"
                      >
                        <app-icon *ngIf="promotingWordId() !== w.id" name="check-circle" [size]="11" svgClass="text-emerald-700"></app-icon>
                        <app-icon *ngIf="promotingWordId() === w.id" name="refresh-cw" [size]="11" svgClass="text-emerald-700 animate-spin"></app-icon>
                        <span>Duyệt vào CEFR</span>
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="!selectedClassroomDetail()?.words?.length">
                    <td colspan="7" class="py-10 text-center text-xs text-[#8C827A]">
                      Phòng học này chưa có từ vựng nào được thêm vào.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 2: TIẾN ĐỘ FLASHCARD HỌC VIÊN -->
          <div *ngIf="!classroomDetailLoading() && classroomDetailActiveTab() === 'members'" class="space-y-3">
            <div class="flex items-center justify-between text-xs text-[#5C5249] bg-[#FAF8F5] p-2.5 rounded-[4px] border border-[#E5DED3]">
              <div class="flex items-center gap-2">
                <app-icon name="activity" [size]="14" svgClass="text-[#7D6853]"></app-icon>
                <span>Báo cáo mức độ thuộc từ Flashcard của từng thành viên trong lớp học ảo.</span>
              </div>
            </div>

            <div class="overflow-x-auto border border-[#E5DED3] rounded-[4px]">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-[#FAF8F5] border-b border-[#E5DED3] text-[#7D6853] uppercase text-[10px] tracking-wider font-semibold">
                    <th class="py-2 px-3">Học viên</th>
                    <th class="py-2 px-3">Tiến độ Flashcard</th>
                    <th class="py-2 px-3 text-center">Số từ đã thuộc</th>
                    <th class="py-2 px-3 text-center">Trạng thái</th>
                    <th class="py-2 px-3 text-right">Lần học cuối</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E5DED3]/60">
                  <tr *ngFor="let m of selectedClassroomDetail()?.memberProgresses" class="hover:bg-[#FAF8F5]/80">
                    <td class="py-2.5 px-3">
                      <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-full bg-[#EFEAE1] border border-[#E5DED3] flex items-center justify-center font-semibold text-xs text-[#7D6853] shrink-0">
                          {{ (m.fullName || m.username || 'U').charAt(0).toUpperCase() }}
                        </div>
                        <div>
                          <div class="font-semibold text-[#2D2823]">{{ m.fullName || m.username }}</div>
                          <div class="text-[10px] text-[#8C827A] font-mono">&#64;{{ m.username }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="py-2.5 px-3 min-w-[140px]">
                      <div class="flex items-center gap-2">
                        <div class="flex-1 bg-[#FAF8F5] border border-[#E5DED3] h-2 rounded-full overflow-hidden">
                          <div 
                            class="bg-[#7D6853] h-full rounded-full transition-all duration-300" 
                            [style.width.%]="m.progressPercentage || 0"
                          ></div>
                        </div>
                        <span class="font-mono font-semibold text-xs text-[#2D2823]">{{ m.progressPercentage || 0 }}%</span>
                      </div>
                    </td>
                    <td class="py-2.5 px-3 text-center font-mono font-semibold text-[#2D2823]">
                      {{ m.masteredCount }} / {{ m.totalWords }} từ
                    </td>
                    <td class="py-2.5 px-3 text-center">
                      <span 
                        *ngIf="m.completed"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200"
                      >
                        <app-icon name="check" [size]="10" svgClass="text-emerald-700"></app-icon>
                        <span>Hoàn thành</span>
                      </span>
                      <span 
                        *ngIf="!m.completed"
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase bg-amber-50 text-amber-800 border border-amber-200"
                      >
                        <span>Đang học</span>
                      </span>
                    </td>
                    <td class="py-2.5 px-3 text-right font-mono text-[11px] text-[#8C827A]">
                      {{ m.lastStudiedAt ? (m.lastStudiedAt | date:'dd/MM/yyyy HH:mm') : 'Chưa học' }}
                    </td>
                  </tr>
                  <tr *ngIf="!selectedClassroomDetail()?.memberProgresses?.length">
                    <td colspan="5" class="py-10 text-center text-xs text-[#8C827A]">
                      Chưa có học viên nào tham gia học bộ từ này.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- TAB 3: BẢNG XẾP HẠNG QUIZ -->
          <div *ngIf="!classroomDetailLoading() && classroomDetailActiveTab() === 'leaderboard'" class="space-y-3">
            <div class="flex items-center justify-between text-xs text-[#5C5249] bg-[#FAF8F5] p-2.5 rounded-[4px] border border-[#E5DED3]">
              <div class="flex items-center gap-2">
                <app-icon name="award" [size]="14" svgClass="text-[#7D6853]"></app-icon>
                <span>Bảng vinh danh thành tích làm bài thi trắc nghiệm từ vựng theo thời gian thực.</span>
              </div>
            </div>

            <div class="overflow-x-auto border border-[#E5DED3] rounded-[4px]">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-[#FAF8F5] border-b border-[#E5DED3] text-[#7D6853] uppercase text-[10px] tracking-wider font-semibold">
                    <th class="py-2 px-3 w-12 text-center">Hạng</th>
                    <th class="py-2 px-3">Học viên</th>
                    <th class="py-2 px-3 text-center">Điểm số</th>
                    <th class="py-2 px-3 text-center">Thời gian làm</th>
                    <th class="py-2 px-3 text-right">Ngày nộp bài</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#E5DED3]/60">
                  <tr *ngFor="let lb of selectedClassroomDetail()?.leaderboard" class="hover:bg-[#FAF8F5]/80">
                    <td class="py-2.5 px-3 text-center">
                      <span 
                        *ngIf="lb.rank === 1"
                        class="w-6 h-6 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono font-semibold text-xs inline-flex items-center justify-center shadow-xs"
                      >
                        1
                      </span>
                      <span 
                        *ngIf="lb.rank === 2"
                        class="w-6 h-6 rounded-full bg-slate-200 text-slate-800 border border-slate-300 font-mono font-semibold text-xs inline-flex items-center justify-center shadow-xs"
                      >
                        2
                      </span>
                      <span 
                        *ngIf="lb.rank === 3"
                        class="w-6 h-6 rounded-full bg-amber-700 text-amber-50 font-mono font-semibold text-xs inline-flex items-center justify-center shadow-xs"
                      >
                        3
                      </span>
                      <span 
                        *ngIf="lb.rank > 3"
                        class="font-mono text-xs text-[#8C827A]"
                      >
                        #{{ lb.rank }}
                      </span>
                    </td>
                    <td class="py-2.5 px-3">
                      <div class="font-semibold text-[#2D2823]">{{ lb.fullName || lb.username }}</div>
                      <div class="text-[10px] text-[#8C827A] font-mono">&#64;{{ lb.username }}</div>
                    </td>
                    <td class="py-2.5 px-3 text-center">
                      <span class="font-mono font-semibold text-xs sm:text-sm text-[#2D2823]">{{ lb.score }}</span>
                      <span class="text-xs text-[#8C827A]"> / {{ lb.totalQuestions }}</span>
                    </td>
                    <td class="py-2.5 px-3 text-center font-mono text-xs text-[#5C5249]">
                      {{ lb.timeSpentSeconds }} giây
                    </td>
                    <td class="py-2.5 px-3 text-right font-mono text-[11px] text-[#8C827A]">
                      {{ lb.submittedAt ? (lb.submittedAt | date:'dd/MM/yyyy HH:mm') : '—' }}
                    </td>
                  </tr>
                  <tr *ngIf="!selectedClassroomDetail()?.leaderboard?.length">
                    <td colspan="5" class="py-10 text-center text-xs text-[#8C827A]">
                      Chưa có học viên nào nộp bài thi Quiz cho phòng này.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <!-- Footer Modal -->
        <div class="p-3.5 sm:p-4 border-t border-[#E5DED3] bg-[#FAF8F5] flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2">
            <button
              *ngIf="selectedClassroomDetail()"
              type="button"
              (click)="toggleClassroomStatus(selectedClassroomDetail()!.classroom)"
              class="px-3 py-1.5 rounded-[4px] text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5"
              [ngClass]="selectedClassroomDetail()!.classroom.status === 'LOCKED' ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'"
            >
              <app-icon [name]="selectedClassroomDetail()!.classroom.status === 'LOCKED' ? 'check-circle' : 'shield'" [size]="13"></app-icon>
              <span>{{ selectedClassroomDetail()!.classroom.status === 'LOCKED' ? 'Mở khóa phòng học này' : 'Khóa phòng học này' }}</span>
            </button>
          </div>

          <button 
            type="button"
            (click)="closeClassroomDetailModal()"
            class="px-4 py-1.5 rounded-[4px] border border-[#E5DED3] bg-white text-xs font-semibold text-[#5C5249] hover:text-[#2D2823] cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>

    <!-- =========================================================================
         15. MODAL: XÁC NHẬN XÓA PHÒNG HỌC
         ========================================================================= -->
    <div 
      *ngIf="showDeleteClassroomModal()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-60 flex items-center justify-center p-4 animate-fade-in"
    >
      <div class="w-full max-w-sm bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl p-5 space-y-4">
        
        <div class="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto">
          <app-icon name="trash" [size]="18"></app-icon>
        </div>

        <div class="text-center space-y-1">
          <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823]">
            Xóa phòng học vĩnh viễn?
          </h3>
          <p class="text-xs text-[#5C5249] leading-relaxed">
            Bạn có chắc chắn muốn xóa phòng học <strong class="text-[#2D2823]">[{{ classroomToDelete()?.code }}] {{ classroomToDelete()?.name }}</strong>?
          </p>
          <p class="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-[3px] border border-rose-200/80 mt-2">
            Hành động này sẽ xóa đồng thời toàn bộ từ vựng, dữ liệu học Flashcard của các học viên và bảng thành tích bài thi liên quan.
          </p>
        </div>

        <div class="pt-2 flex items-center justify-center gap-2.5">
          <button 
            type="button"
            (click)="closeDeleteClassroomModal()"
            class="px-4 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs font-semibold text-[#5C5249] hover:text-[#2D2823] cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button 
            type="button"
            (click)="confirmDeleteClassroom()"
            [disabled]="deleteClassroomLoading()"
            class="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <app-icon *ngIf="!deleteClassroomLoading()" name="trash" [size]="14" svgClass="text-white"></app-icon>
            <app-icon *ngIf="deleteClassroomLoading()" name="refresh-cw" [size]="14" svgClass="text-white animate-spin"></app-icon>
            <span>{{ deleteClassroomLoading() ? 'Đang xóa...' : 'Xác nhận xóa' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- =========================================================================
         16. MODAL: ĐIỀU CHỈNH CHỨNG CHỈ (ADMIN EDIT CERTIFICATE)
         ========================================================================= -->
    <div 
      *ngIf="editCertModalOpen()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-60 flex items-center justify-center p-4 animate-fade-in"
    >
      <div class="w-full max-w-lg bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="p-4 sm:p-5 border-b border-[#E5DED3] flex items-center justify-between bg-[#FAF8F5]">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-[4px] bg-[#EFEAE1] border border-[#E5DED3] flex items-center justify-center text-[#7D6853]">
              <app-icon name="edit" [size]="16"></app-icon>
            </div>
            <div>
              <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823]">
                Điều chỉnh thông tin chứng chỉ
              </h3>
              <p class="text-xs text-[#8C827A] font-mono mt-0.5">
                {{ editingCert()?.certificateCode }} — {{ editingCert()?.userFullName || editingCert()?.username }}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            (click)="closeEditCertModal()"
            class="text-[#8C827A] hover:text-[#2D2823] p-1 rounded hover:bg-[#EFEAE1]/60 border-0 bg-transparent cursor-pointer"
          >
            <app-icon name="x" [size]="18"></app-icon>
          </button>
        </div>

        <!-- Body Form -->
        <div class="p-5 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
          <!-- Tiêu đề chứng chỉ -->
          <div>
            <label class="block font-semibold text-[#2D2823] mb-1">Tiêu đề vinh danh chứng chỉ</label>
            <input 
              type="text" 
              [(ngModel)]="editCertForm.title" 
              class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors font-serif"
              placeholder="VD: Chứng Chỉ Tinh Thông Chuẩn Từ Vựng CEFR A1"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <!-- Cấp độ CEFR -->
            <div>
              <label class="block font-semibold text-[#2D2823] mb-1">Cấp độ CEFR</label>
              <select 
                [(ngModel)]="editCertForm.cefrLevel" 
                class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors"
              >
                <option value="A1">Level A1 (Beginner)</option>
                <option value="A2">Level A2 (Elementary)</option>
                <option value="B1">Level B1 (Intermediate)</option>
                <option value="B2">Level B2 (Upper Intermediate)</option>
                <option value="C1">Level C1 (Advanced)</option>
              </select>
            </div>

            <!-- Trạng thái -->
            <div>
              <label class="block font-semibold text-[#2D2823] mb-1">Trạng thái phát hành</label>
              <select 
                [(ngModel)]="editCertForm.status" 
                class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors"
              >
                <option value="ISSUED">Đã phát hành (ISSUED)</option>
                <option value="PENDING">Chờ phê duyệt (PENDING)</option>
                <option value="REVOKED">Đã thu hồi (REVOKED)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <!-- Số từ tinh thông -->
            <div>
              <label class="block font-semibold text-[#2D2823] mb-1">Số từ tinh thông (SM-2)</label>
              <input 
                type="number" 
                [(ngModel)]="editCertForm.masteredWordsCount" 
                min="0"
                class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs font-mono text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors"
              />
            </div>

            <!-- Chuỗi ngày streak -->
            <div>
              <label class="block font-semibold text-[#2D2823] mb-1">Chuỗi ngày học liên tục</label>
              <input 
                type="number" 
                [(ngModel)]="editCertForm.streakCount" 
                min="0"
                class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs font-mono text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <!-- Cơ quan / Người phê duyệt -->
          <div>
            <label class="block font-semibold text-[#2D2823] mb-1">Hội đồng thẩm định & Ký phát hành</label>
            <input 
              type="text" 
              [(ngModel)]="editCertForm.approvedBy" 
              class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors"
              placeholder="VD: Hội Đồng Khảo Thí & Đào Tạo Vocario"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-[#E5DED3] bg-[#FAF8F5] flex items-center justify-end gap-2.5">
          <button 
            type="button" 
            (click)="closeEditCertModal()"
            class="px-4 py-2 rounded-[4px] border border-[#E5DED3] bg-white text-xs font-semibold text-[#5C5249] hover:text-[#2D2823] cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button 
            type="button" 
            (click)="saveEditCert()"
            [disabled]="editCertSaving()"
            class="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-[4px] bg-[#7D6853] hover:bg-[#685543] text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <app-icon *ngIf="!editCertSaving()" name="check" [size]="14" svgClass="text-white"></app-icon>
            <app-icon *ngIf="editCertSaving()" name="refresh-cw" [size]="14" svgClass="text-white animate-spin"></app-icon>
            <span>{{ editCertSaving() ? 'Đang lưu...' : 'Lưu điều chỉnh' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- =========================================================================
         17. MODAL: CẤP CHỨNG CHỈ ĐẶC CÁCH (ADMIN MANUAL ISSUE)
         ========================================================================= -->
    <div 
      *ngIf="manualCertModalOpen()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-60 flex items-center justify-center p-4 animate-fade-in"
    >
      <div class="w-full max-w-lg bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl overflow-hidden flex flex-col">
        <!-- Header -->
        <div class="p-4 sm:p-5 border-b border-[#E5DED3] flex items-center justify-between bg-[#FAF8F5]">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-[4px] bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <app-icon name="award" [size]="16"></app-icon>
            </div>
            <div>
              <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823]">
                Cấp chứng chỉ đặc cách cho học viên
              </h3>
              <p class="text-xs text-[#8C827A] mt-0.5">
                Đặc cách phát hành chứng chỉ khảo thí CEFR chính thức cho học viên
              </p>
            </div>
          </div>
          <button 
            type="button" 
            (click)="closeManualCertModal()"
            class="text-[#8C827A] hover:text-[#2D2823] p-1 rounded hover:bg-[#EFEAE1]/60 border-0 bg-transparent cursor-pointer"
          >
            <app-icon name="x" [size]="18"></app-icon>
          </button>
        </div>

        <!-- Body Form -->
        <div class="p-5 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
          <!-- Chọn học viên -->
          <div>
            <label class="block font-semibold text-[#2D2823] mb-1">Chọn học viên thụ hưởng <span class="text-rose-500">*</span></label>
            <select 
              [(ngModel)]="manualCertForm.userId" 
              class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors"
            >
              <option value="" disabled>-- Vui lòng chọn học viên --</option>
              <option *ngFor="let u of users()" [value]="u.id">
                {{ u.fullName }} (@{{ u.username }}) - {{ u.email }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <!-- Cấp độ CEFR -->
            <div>
              <label class="block font-semibold text-[#2D2823] mb-1">Cấp độ CEFR <span class="text-rose-500">*</span></label>
              <select 
                [(ngModel)]="manualCertForm.cefrLevel" 
                class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors"
              >
                <option value="A1">Level A1 (Beginner)</option>
                <option value="A2">Level A2 (Elementary)</option>
                <option value="B1">Level B1 (Intermediate)</option>
                <option value="B2">Level B2 (Upper Intermediate)</option>
                <option value="C1">Level C1 (Advanced)</option>
              </select>
            </div>

            <!-- Số từ tinh thông -->
            <div>
              <label class="block font-semibold text-[#2D2823] mb-1">Số từ tinh thông ghi nhận</label>
              <input 
                type="number" 
                [(ngModel)]="manualCertForm.masteredWordsCount" 
                min="0"
                class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs font-mono text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors"
                placeholder="Mặc định: 15"
              />
            </div>
          </div>

          <!-- Tiêu đề chứng chỉ -->
          <div>
            <label class="block font-semibold text-[#2D2823] mb-1">Tiêu đề vinh danh chứng chỉ</label>
            <input 
              type="text" 
              [(ngModel)]="manualCertForm.title" 
              class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors font-serif"
              placeholder="Để trống sẽ áp dụng tiêu đề chuẩn theo cấp độ"
            />
          </div>

          <!-- Cơ quan ký phát hành -->
          <div>
            <label class="block font-semibold text-[#2D2823] mb-1">Hội đồng thẩm định ký phát hành</label>
            <input 
              type="text" 
              [(ngModel)]="manualCertForm.approvedBy" 
              class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors"
              placeholder="VD: Hội Đồng Khảo Thí & Đào Tạo Vocario"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-[#E5DED3] bg-[#FAF8F5] flex items-center justify-end gap-2.5">
          <button 
            type="button" 
            (click)="closeManualCertModal()"
            class="px-4 py-2 rounded-[4px] border border-[#E5DED3] bg-white text-xs font-semibold text-[#5C5249] hover:text-[#2D2823] cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button 
            type="button" 
            (click)="submitManualCert()"
            [disabled]="manualCertSaving() || !manualCertForm.userId"
            class="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-[4px] bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <app-icon *ngIf="!manualCertSaving()" name="award" [size]="14" svgClass="text-white"></app-icon>
            <app-icon *ngIf="manualCertSaving()" name="refresh-cw" [size]="14" svgClass="text-white animate-spin"></app-icon>
            <span>{{ manualCertSaving() ? 'Đang cấp phát...' : 'Cấp phát ngay' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- =========================================================================
         18. MODAL: XÁC NHẬN XÓA CHỨNG CHỈ (ADMIN DELETE CERTIFICATE)
         ========================================================================= -->
    <div 
      *ngIf="deleteCertModalOpen()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-60 flex items-center justify-center p-4 animate-fade-in"
    >
      <div class="w-full max-w-sm bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl p-5 space-y-4">
        
        <div class="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto">
          <app-icon name="trash" [size]="18"></app-icon>
        </div>

        <div class="text-center space-y-1">
          <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823]">
            Xóa vĩnh viễn chứng chỉ?
          </h3>
          <p class="text-xs text-[#5C5249] leading-relaxed">
            Bạn có chắc chắn muốn xóa chứng chỉ <strong class="text-[#2D2823] font-mono">{{ certToDelete()?.certificateCode }}</strong> của học viên <strong class="text-[#2D2823]">{{ certToDelete()?.userFullName || certToDelete()?.username }}</strong>?
          </p>
          <p class="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-[3px] border border-rose-200/80 mt-2">
            Hành động này sẽ xóa hoàn toàn bản ghi khỏi cơ sở dữ liệu và không thể hoàn tác.
          </p>
        </div>

        <div class="pt-2 flex items-center justify-center gap-2.5">
          <button 
            type="button" 
            (click)="closeDeleteCertModal()"
            class="px-4 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs font-semibold text-[#5C5249] hover:text-[#2D2823] cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button 
            type="button" 
            (click)="confirmDeleteCert()"
            [disabled]="deleteCertLoading()"
            class="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <app-icon *ngIf="!deleteCertLoading()" name="trash" [size]="14" svgClass="text-white"></app-icon>
            <app-icon *ngIf="deleteCertLoading()" name="refresh-cw" [size]="14" svgClass="text-white animate-spin"></app-icon>
            <span>{{ deleteCertLoading() ? 'Đang xóa...' : 'Xác nhận xóa' }}</span>
          </button>
        </div>

      </div>
    <!-- =========================================================================
         19. MODAL: THÊM DẠNG LOẠI CHỨNG CHỈ MỚI (CREATE CERTIFICATE TYPE)
         ========================================================================= -->
    <div 
      *ngIf="createCertTypeModalOpen()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div class="w-full max-w-lg bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <!-- Header -->
        <div class="p-4 sm:p-5 border-b border-[#E5DED3] flex items-center justify-between bg-[#FAF8F5]">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-[#7D6853]">
              <app-icon name="award" [size]="16"></app-icon>
            </div>
            <div>
              <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823]">
                Thêm dạng chứng chỉ mới
              </h3>
              <p class="text-xs text-[#8C827A] mt-0.5">
                Thiết lập khung chuẩn khảo thí, điều kiện từ vựng và đơn vị thẩm định
              </p>
            </div>
          </div>
          <button 
            type="button" 
            (click)="closeCreateCertTypeModal()"
            class="text-[#8C827A] hover:text-[#2D2823] p-1 rounded hover:bg-[#EFEAE1]/60 border-0 bg-transparent cursor-pointer"
          >
            <app-icon name="x" [size]="18"></app-icon>
          </button>
        </div>

        <!-- Body Form -->
        <div class="p-5 space-y-3.5 text-xs overflow-y-auto max-h-[70vh]">
          
          <div class="grid grid-cols-2 gap-3">
            <!-- Mã loại chứng chỉ -->
            <div>
              <label class="block font-semibold text-[#2D2823] mb-1">Mã loại chứng chỉ <span class="text-rose-500">*</span></label>
              <input 
                type="text" 
                [(ngModel)]="createCertTypeForm.typeCode" 
                placeholder="VD: IELTS-7, TOEIC-800, B2-PRO"
                class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs font-mono font-bold text-[#2D2823] uppercase focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors"
              />
            </div>

            <!-- Cấp độ CEFR -->
            <div>
              <label class="block font-semibold text-[#2D2823] mb-1">Cấp độ CEFR quy đổi</label>
              <select 
                [(ngModel)]="createCertTypeForm.cefrLevel" 
                class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors font-semibold"
              >
                <option value="A1">A1 — Sơ cấp</option>
                <option value="A2">A2 — Cơ bản</option>
                <option value="B1">B1 — Trung cấp độc lập</option>
                <option value="B2">B2 — Nâng cao</option>
                <option value="C1">C1 — Cao cấp lưu loát</option>
                <option value="C2">C2 — Bản xứ tinh thông</option>
                <option value="KHAC">Chuyên ngành / Khác</option>
              </select>
            </div>
          </div>

          <!-- Tiêu đề chứng chỉ -->
          <div>
            <label class="block font-semibold text-[#2D2823] mb-1">Tiêu đề chứng chỉ <span class="text-rose-500">*</span></label>
            <input 
              type="text" 
              [(ngModel)]="createCertTypeForm.title" 
              placeholder="VD: Chứng Chỉ Chinh Phục Từ Vựng Học Thuật IELTS Band 7.0+"
              class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors font-serif"
            />
          </div>

          <div class="grid grid-cols-3 gap-2.5">
            <!-- Từ tinh thông yêu cầu -->
            <div>
              <label class="block font-semibold text-[#2D2823] mb-1">Từ SM-2 tối thiểu</label>
              <input 
                type="number" 
                [(ngModel)]="createCertTypeForm.requiredWords" 
                min="1"
                class="w-full px-2.5 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs font-mono text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors"
                placeholder="VD: 25"
              />
            </div>

            <!-- Streak yêu cầu -->
            <div>
              <label class="block font-semibold text-[#2D2823] mb-1">Chuỗi Streak ngày</label>
              <input 
                type="number" 
                [(ngModel)]="createCertTypeForm.requiredStreak" 
                min="0"
                class="w-full px-2.5 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs font-mono text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors"
                placeholder="VD: 7"
              />
            </div>

            <!-- Màu sắc nhận diện -->
            <div>
              <label class="block font-semibold text-[#2D2823] mb-1">Màu sắc huy hiệu</label>
              <select 
                [(ngModel)]="createCertTypeForm.badgeColor"
                class="w-full px-2.5 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs font-semibold text-[#2D2823] focus:outline-none cursor-pointer"
              >
                <option value="#7D6853">Hổ phách Vocario (#7D6853)</option>
                <option value="#059669">Xanh lục Emerald (#059669)</option>
                <option value="#2563EB">Xanh dương Royal (#2563EB)</option>
                <option value="#7C3AED">Tím hoàng gia (#7C3AED)</option>
                <option value="#BE123C">Đỏ mận Ruby (#BE123C)</option>
                <option value="#B45309">Vàng đồng Amber (#B45309)</option>
              </select>
            </div>
          </div>

          <!-- Đơn vị thẩm định -->
          <div>
            <label class="block font-semibold text-[#2D2823] mb-1">Hội đồng thẩm định / Cơ quan phát hành</label>
            <input 
              type="text" 
              [(ngModel)]="createCertTypeForm.approvedBy" 
              class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors"
              placeholder="VD: Hội Đồng Khảo Thí & Đào Tạo Vocario"
            />
          </div>

          <!-- Mô tả học thuật -->
          <div>
            <label class="block font-semibold text-[#2D2823] mb-1">Mô tả tiêu chuẩn khảo thí</label>
            <textarea 
              [(ngModel)]="createCertTypeForm.description" 
              rows="3"
              class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors leading-relaxed"
              placeholder="Ghi chú năng lực ngôn ngữ, quyền lợi đạt được hoặc tiêu chuẩn chấm điểm..."
            ></textarea>
          </div>

          <!-- Kích hoạt -->
          <div class="flex items-center gap-2 pt-1">
            <input 
              type="checkbox" 
              id="createTypeActive"
              [(ngModel)]="createCertTypeForm.isActive"
              class="rounded border-[#E5DED3] text-[#7D6853] focus:ring-[#7D6853] cursor-pointer"
            />
            <label for="createTypeActive" class="font-semibold text-[#2D2823] cursor-pointer select-none">
              Mở áp dụng ngay cho toàn thể học viên trong hệ thống
            </label>
          </div>

        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-[#E5DED3] bg-[#FAF8F5] flex items-center justify-end gap-2.5">
          <button 
            type="button" 
            (click)="closeCreateCertTypeModal()"
            class="px-4 py-2 rounded-[4px] border border-[#E5DED3] bg-white text-xs font-semibold text-[#5C5249] hover:text-[#2D2823] cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button 
            type="button" 
            (click)="submitCreateCertType()"
            [disabled]="createCertTypeSaving() || !createCertTypeForm.typeCode || !createCertTypeForm.title"
            class="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <app-icon *ngIf="!createCertTypeSaving()" name="plus" [size]="14" svgClass="text-white"></app-icon>
            <app-icon *ngIf="createCertTypeSaving()" name="refresh-cw" [size]="14" svgClass="text-white animate-spin"></app-icon>
            <span>{{ createCertTypeSaving() ? 'Đang tạo...' : 'Tạo dạng chứng chỉ' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- =========================================================================
         20. MODAL: CHỈNH SỬA DẠNG LOẠI CHỨNG CHỈ (EDIT CERTIFICATE TYPE)
         ========================================================================= -->
    <div 
      *ngIf="editCertTypeModalOpen()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div class="w-full max-w-lg bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <!-- Header -->
        <div class="p-4 sm:p-5 border-b border-[#E5DED3] flex items-center justify-between bg-[#FAF8F5]">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-[4px] bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <app-icon name="edit" [size]="16"></app-icon>
            </div>
            <div>
              <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823]">
                Chỉnh sửa dạng chứng chỉ [{{ editingCertType()?.typeCode }}]
              </h3>
              <p class="text-xs text-[#8C827A] mt-0.5">
                Điều chỉnh tiêu đề, tiêu chí từ vựng SM-2 và thẩm định
              </p>
            </div>
          </div>
          <button 
            type="button" 
            (click)="closeEditCertTypeModal()"
            class="text-[#8C827A] hover:text-[#2D2823] p-1 rounded hover:bg-[#EFEAE1]/60 border-0 bg-transparent cursor-pointer"
          >
            <app-icon name="x" [size]="18"></app-icon>
          </button>
        </div>

        <!-- Body Form -->
        <div class="p-5 space-y-3.5 text-xs overflow-y-auto max-h-[70vh]">
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-[#2D2823] mb-1">Mã loại chứng chỉ</label>
              <input 
                type="text" 
                [value]="editingCertType()?.typeCode" 
                disabled
                class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-stone-100 text-xs font-mono font-bold text-stone-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label class="block font-semibold text-[#2D2823] mb-1">Cấp độ CEFR quy đổi</label>
              <select 
                [(ngModel)]="editCertTypeForm.cefrLevel" 
                class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors font-semibold"
              >
                <option value="A1">A1 — Sơ cấp</option>
                <option value="A2">A2 — Cơ bản</option>
                <option value="B1">B1 — Trung cấp độc lập</option>
                <option value="B2">B2 — Nâng cao</option>
                <option value="C1">C1 — Cao cấp lưu loát</option>
                <option value="C2">C2 — Bản xứ tinh thông</option>
                <option value="KHAC">Chuyên ngành / Khác</option>
              </select>
            </div>
          </div>

          <!-- Tiêu đề chứng chỉ -->
          <div>
            <label class="block font-semibold text-[#2D2823] mb-1">Tiêu đề chứng chỉ <span class="text-rose-500">*</span></label>
            <input 
              type="text" 
              [(ngModel)]="editCertTypeForm.title" 
              class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors font-serif"
            />
          </div>

          <div class="grid grid-cols-3 gap-2.5">
            <div>
              <label class="block font-semibold text-[#2D2823] mb-1">Từ SM-2 tối thiểu</label>
              <input 
                type="number" 
                [(ngModel)]="editCertTypeForm.requiredWords" 
                min="1"
                class="w-full px-2.5 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs font-mono text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label class="block font-semibold text-[#2D2823] mb-1">Chuỗi Streak ngày</label>
              <input 
                type="number" 
                [(ngModel)]="editCertTypeForm.requiredStreak" 
                min="0"
                class="w-full px-2.5 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs font-mono text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label class="block font-semibold text-[#2D2823] mb-1">Màu sắc huy hiệu</label>
              <select 
                [(ngModel)]="editCertTypeForm.badgeColor"
                class="w-full px-2.5 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs font-semibold text-[#2D2823] focus:outline-none cursor-pointer"
              >
                <option value="#7D6853">Hổ phách Vocario (#7D6853)</option>
                <option value="#059669">Xanh lục Emerald (#059669)</option>
                <option value="#2563EB">Xanh dương Royal (#2563EB)</option>
                <option value="#7C3AED">Tím hoàng gia (#7C3AED)</option>
                <option value="#BE123C">Đỏ mận Ruby (#BE123C)</option>
                <option value="#B45309">Vàng đồng Amber (#B45309)</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block font-semibold text-[#2D2823] mb-1">Hội đồng thẩm định / Cơ quan phát hành</label>
            <input 
              type="text" 
              [(ngModel)]="editCertTypeForm.approvedBy" 
              class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label class="block font-semibold text-[#2D2823] mb-1">Mô tả tiêu chuẩn khảo thí</label>
            <textarea 
              [(ngModel)]="editCertTypeForm.description" 
              rows="3"
              class="w-full px-3 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs text-[#2D2823] focus:bg-white focus:border-[#7D6853] focus:outline-none transition-colors leading-relaxed"
            ></textarea>
          </div>

          <div class="flex items-center gap-2 pt-1">
            <input 
              type="checkbox" 
              id="editTypeActive"
              [(ngModel)]="editCertTypeForm.isActive"
              class="rounded border-[#E5DED3] text-[#7D6853] focus:ring-[#7D6853] cursor-pointer"
            />
            <label for="editTypeActive" class="font-semibold text-[#2D2823] cursor-pointer select-none">
              Kích hoạt áp dụng dạng chứng chỉ này
            </label>
          </div>

        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-[#E5DED3] bg-[#FAF8F5] flex items-center justify-end gap-2.5">
          <button 
            type="button" 
            (click)="closeEditCertTypeModal()"
            class="px-4 py-2 rounded-[4px] border border-[#E5DED3] bg-white text-xs font-semibold text-[#5C5249] hover:text-[#2D2823] cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button 
            type="button" 
            (click)="submitEditCertType()"
            [disabled]="editCertTypeSaving() || !editCertTypeForm.title"
            class="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <app-icon *ngIf="!editCertTypeSaving()" name="check" [size]="14" svgClass="text-white"></app-icon>
            <app-icon *ngIf="editCertTypeSaving()" name="refresh-cw" [size]="14" svgClass="text-white animate-spin"></app-icon>
            <span>{{ editCertTypeSaving() ? 'Đang lưu...' : 'Lưu thay đổi' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- =========================================================================
         21. MODAL: XÁC NHẬN XÓA DẠNG LOẠI CHỨNG CHỈ (DELETE CERTIFICATE TYPE)
         ========================================================================= -->
    <div 
      *ngIf="deleteCertTypeModalOpen()" 
      class="fixed inset-0 bg-[#2D2823]/40 backdrop-blur-2xs z-60 flex items-center justify-center p-4 animate-fade-in"
    >
      <div class="w-full max-w-sm bg-white rounded-[4px] border border-[#E5DED3] shadow-2xl p-5 space-y-4">
        
        <div class="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto">
          <app-icon name="trash" [size]="18"></app-icon>
        </div>

        <div class="text-center space-y-1">
          <h3 class="font-serif font-semibold text-sm sm:text-base text-[#2D2823]">
            Xóa dạng chứng chỉ?
          </h3>
          <p class="text-xs text-[#5C5249] leading-relaxed">
            Bạn có chắc chắn muốn xóa loại chứng chỉ <strong class="text-[#2D2823]">[{{ certTypeToDelete()?.typeCode }}] {{ certTypeToDelete()?.title }}</strong>?
          </p>
          <p class="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-[3px] border border-rose-200/80 mt-2">
            Loại chứng chỉ này sẽ biến mất khỏi danh mục khảo thí hệ thống. Các chứng chỉ đã cấp trước đó cho học viên vẫn được bảo lưu an toàn.
          </p>
        </div>

        <div class="pt-2 flex items-center justify-center gap-2.5">
          <button 
            type="button" 
            (click)="closeDeleteCertTypeModal()"
            class="px-4 py-2 rounded-[4px] border border-[#E5DED3] bg-[#FAF8F5] text-xs font-semibold text-[#5C5249] hover:text-[#2D2823] cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button 
            type="button" 
            (click)="confirmDeleteCertType()"
            [disabled]="deleteCertTypeLoading()"
            class="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold border-0 cursor-pointer shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <app-icon *ngIf="!deleteCertTypeLoading()" name="trash" [size]="14" svgClass="text-white"></app-icon>
            <app-icon *ngIf="deleteCertTypeLoading()" name="refresh-cw" [size]="14" svgClass="text-white animate-spin"></app-icon>
            <span>{{ deleteCertTypeLoading() ? 'Đang xóa...' : 'Xác nhận xóa' }}</span>
          </button>
        </div>

      </div>
    </div>

    <!-- MODAL XEM CHI TIẾT CHỨNG CHỈ (ADMIN PREVIEW) -->
    <app-certificate-modal 
      [certificate]="activeCertPreview()" 
      (close)="activeCertPreview.set(null)"
    ></app-certificate-modal>
  `
})
export class AdminComponent implements OnInit {
  activeTab: 'dashboard' | 'vocabulary' | 'users' | 'arenas' | 'classrooms' | 'vision' | 'settings' | 'speech' | 'certificates' = 'dashboard';
  sidebarOpen = signal(false);
  stats = signal<AdminStats | null>(null);
  loading = signal(false);

  // --- Certificates Management State (Tab 9) ---
  certSubTab = signal<'types' | 'issued'>('types');
  adminCertificates = signal<Certificate[]>([]);
  certificateTypes = signal<CertificateType[]>([]);
  certTypesLoading = signal(false);
  activeCertPreview = signal<Certificate | null>(null);
  certFilterLevel = signal<string>('ALL');

  // Modal Create Certificate Type
  createCertTypeModalOpen = signal(false);
  createCertTypeSaving = signal(false);
  createCertTypeForm = {
    typeCode: '',
    title: '',
    cefrLevel: 'A1',
    requiredWords: 10,
    requiredStreak: 0,
    description: '',
    approvedBy: 'Hội Đồng Khảo Thí & Đào Tạo Vocario',
    badgeColor: '#7D6853',
    isActive: true
  };

  // Modal Edit Certificate Type
  editCertTypeModalOpen = signal(false);
  editingCertType = signal<CertificateType | null>(null);
  editCertTypeSaving = signal(false);
  editCertTypeForm = {
    title: '',
    cefrLevel: 'A1',
    requiredWords: 10,
    requiredStreak: 0,
    description: '',
    approvedBy: '',
    badgeColor: '#7D6853',
    isActive: true
  };

  // Modal Delete Certificate Type
  deleteCertTypeModalOpen = signal(false);
  certTypeToDelete = signal<CertificateType | null>(null);
  deleteCertTypeLoading = signal(false);

  filteredAdminCertificates = computed(() => {
    const list = this.adminCertificates();
    const filter = this.certFilterLevel();
    if (filter === 'ALL') return list;
    return list.filter(c => c.cefrLevel?.toUpperCase() === filter.toUpperCase());
  });

  countCertsByLevels(levels: string[]): number {
    return this.adminCertificates().filter(c => levels.includes(c.cefrLevel?.toUpperCase())).length;
  }

  loadAdminCertificates() {
    this.api.getAllCertificatesAdmin().subscribe({
      next: (list) => this.adminCertificates.set(list || []),
      error: () => this.adminCertificates.set([])
    });
  }

  approveAdminCertificate(cert: Certificate) {
    const adminName = this.api.currentUser()?.fullName || this.api.currentUser()?.username || 'Quản Trị Viên Vocario';
    this.api.approveCertificate(cert.id, adminName).subscribe({
      next: () => {
        this.toast.success(`Đã phê duyệt và phát hành chứng chỉ ${cert.certificateCode}!`, 'Phê Duyệt Thành Công');
        this.loadAdminCertificates();
      },
      error: () => {
        this.toast.error('Không thể phê duyệt chứng chỉ lúc này.');
      }
    });
  }

  // --- Modal Edit Certificate ---
  editCertModalOpen = signal(false);
  editingCert = signal<Certificate | null>(null);
  editCertSaving = signal(false);
  editCertForm = {
    title: '',
    cefrLevel: 'A1',
    masteredWordsCount: 10,
    streakCount: 0,
    approvedBy: '',
    status: 'ISSUED' as 'ISSUED' | 'PENDING' | 'REVOKED'
  };

  openEditCertModal(cert: Certificate) {
    this.editingCert.set(cert);
    this.editCertForm = {
      title: cert.title || `Chứng Chỉ Tinh Thông Chuẩn Từ Vựng CEFR ${cert.cefrLevel}`,
      cefrLevel: cert.cefrLevel || 'A1',
      masteredWordsCount: cert.masteredWordsCount || 0,
      streakCount: cert.streakCount || 0,
      approvedBy: cert.approvedBy || 'Hội Đồng Khảo Thí & Đào Tạo Vocario',
      status: (cert.status === 'PENDING' || cert.status === 'REVOKED') ? cert.status : 'ISSUED'
    };
    this.editCertModalOpen.set(true);
  }

  closeEditCertModal() {
    this.editCertModalOpen.set(false);
    this.editingCert.set(null);
  }

  saveEditCert() {
    const cert = this.editingCert();
    if (!cert) return;
    this.editCertSaving.set(true);
    this.api.updateCertificate(cert.id, {
      title: this.editCertForm.title,
      cefrLevel: this.editCertForm.cefrLevel,
      masteredWordsCount: Number(this.editCertForm.masteredWordsCount),
      streakCount: Number(this.editCertForm.streakCount),
      approvedBy: this.editCertForm.approvedBy,
      status: this.editCertForm.status
    }).subscribe({
      next: () => {
        this.toast.success(`Đã cập nhật chứng chỉ ${cert.certificateCode}!`, 'Thành công');
        this.loadAdminCertificates();
        this.closeEditCertModal();
        this.editCertSaving.set(false);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Không thể cập nhật chứng chỉ lúc này.');
        this.editCertSaving.set(false);
      }
    });
  }

  // --- Modal Manual Issue Certificate ---
  manualCertModalOpen = signal(false);
  manualCertSaving = signal(false);
  manualCertForm = {
    userId: '',
    cefrLevel: 'A1',
    title: '',
    approvedBy: 'Hội Đồng Khảo Thí & Đào Tạo Vocario',
    masteredWordsCount: 15
  };

  openManualCertModal() {
    if (!this.users().length) {
      this.loadUsers(0);
    }
    const firstUserId = this.users()[0]?.id || '';
    this.manualCertForm = {
      userId: firstUserId,
      cefrLevel: 'A1',
      title: '',
      approvedBy: 'Hội Đồng Khảo Thí & Đào Tạo Vocario',
      masteredWordsCount: 15
    };
    this.manualCertModalOpen.set(true);
  }

  closeManualCertModal() {
    this.manualCertModalOpen.set(false);
  }

  submitManualCert() {
    if (!this.manualCertForm.userId) {
      this.toast.error('Vui lòng chọn học viên thụ hưởng chứng chỉ.');
      return;
    }
    this.manualCertSaving.set(true);
    this.api.manualIssueCertificate({
      userId: this.manualCertForm.userId,
      cefrLevel: this.manualCertForm.cefrLevel,
      title: this.manualCertForm.title ? this.manualCertForm.title : undefined,
      approvedBy: this.manualCertForm.approvedBy,
      masteredWordsCount: Number(this.manualCertForm.masteredWordsCount) || 15
    }).subscribe({
      next: (cert) => {
        this.toast.success(`Đã cấp chứng chỉ đặc cách ${cert.certificateCode} cho học viên!`, 'Cấp Phát Thành Công');
        this.loadAdminCertificates();
        this.closeManualCertModal();
        this.manualCertSaving.set(false);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Không thể cấp chứng chỉ đặc cách.');
        this.manualCertSaving.set(false);
      }
    });
  }

  // --- Toggle Revoke / Approve Quick Action ---
  toggleRevokeCert(cert: Certificate) {
    if (cert.status === 'REVOKED') {
      this.approveAdminCertificate(cert);
      return;
    }
    this.api.revokeCertificate(cert.id).subscribe({
      next: () => {
        this.toast.info(`Đã thu hồi chứng chỉ ${cert.certificateCode}.`);
        this.loadAdminCertificates();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Không thể thu hồi chứng chỉ.');
      }
    });
  }

  // --- Modal Delete Certificate ---
  deleteCertModalOpen = signal(false);
  certToDelete = signal<Certificate | null>(null);
  deleteCertLoading = signal(false);

  openDeleteCertModal(cert: Certificate) {
    this.certToDelete.set(cert);
    this.deleteCertModalOpen.set(true);
  }

  closeDeleteCertModal() {
    this.deleteCertModalOpen.set(false);
    this.certToDelete.set(null);
  }

  confirmDeleteCert() {
    const cert = this.certToDelete();
    if (!cert) return;
    this.deleteCertLoading.set(true);
    this.api.deleteCertificate(cert.id).subscribe({
      next: () => {
        this.toast.success(`Đã xóa vĩnh viễn chứng chỉ ${cert.certificateCode}.`, 'Đã xóa');
        this.loadAdminCertificates();
        this.closeDeleteCertModal();
        this.deleteCertLoading.set(false);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Không thể xóa chứng chỉ.');
        this.deleteCertLoading.set(false);
      }
    });
  }

  // ==================== QUẢN LÝ DANH MỤC DẠNG LOẠI CHỨNG CHỈ (CERTIFICATE TYPES) ====================

  loadCertificateTypes() {
    this.certTypesLoading.set(true);
    this.api.getCertificateTypes().subscribe({
      next: (types) => {
        this.certificateTypes.set(types || []);
        this.certTypesLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading cert types:', err);
        this.certTypesLoading.set(false);
        this.toast.error('Không thể nạp danh mục các loại chứng chỉ!');
      }
    });
  }

  previewCertType(type: CertificateType) {
    const draftCert: Certificate = {
      id: type.id,
      userId: 'demo-preview',
      username: 'hocvien_mau',
      userFullName: 'Nguyễn Văn Học Viên',
      userEmail: 'student@vocario.com',
      cefrLevel: type.cefrLevel,
      certificateCode: `VOC-${type.typeCode}-2026-PREVIEW`,
      title: type.title,
      issueDate: new Date().toISOString(),
      masteredWordsCount: type.requiredWords,
      streakCount: type.requiredStreak,
      status: 'ISSUED',
      approvedBy: type.approvedBy
    };
    this.activeCertPreview.set(draftCert);
  }

  // --- Create Certificate Type ---
  openCreateCertTypeModal() {
    this.createCertTypeForm = {
      typeCode: '',
      title: '',
      cefrLevel: 'A1',
      requiredWords: 15,
      requiredStreak: 3,
      description: '',
      approvedBy: 'Hội Đồng Khảo Thí & Đào Tạo Vocario',
      badgeColor: '#7D6853',
      isActive: true
    };
    this.createCertTypeModalOpen.set(true);
  }

  closeCreateCertTypeModal() {
    this.createCertTypeModalOpen.set(false);
  }

  submitCreateCertType() {
    if (!this.createCertTypeForm.typeCode.trim()) {
      this.toast.error('Vui lòng nhập mã dạng chứng chỉ!');
      return;
    }
    if (!this.createCertTypeForm.title.trim()) {
      this.toast.error('Vui lòng nhập tiêu đề chứng chỉ!');
      return;
    }

    this.createCertTypeSaving.set(true);
    this.api.createCertificateType({
      typeCode: this.createCertTypeForm.typeCode.trim(),
      title: this.createCertTypeForm.title.trim(),
      cefrLevel: this.createCertTypeForm.cefrLevel,
      requiredWords: Number(this.createCertTypeForm.requiredWords) || 10,
      requiredStreak: Number(this.createCertTypeForm.requiredStreak) || 0,
      description: this.createCertTypeForm.description.trim(),
      approvedBy: this.createCertTypeForm.approvedBy.trim() || 'Hội Đồng Khảo Thí & Đào Tạo Vocario',
      badgeColor: this.createCertTypeForm.badgeColor,
      isActive: this.createCertTypeForm.isActive
    }).subscribe({
      next: (created) => {
        this.createCertTypeSaving.set(false);
        this.createCertTypeModalOpen.set(false);
        this.toast.success(`Đã thêm dạng chứng chỉ [${created.typeCode}] ${created.title} vào danh mục hệ thống!`, 'Thành công');
        this.loadCertificateTypes();
      },
      error: (err) => {
        this.createCertTypeSaving.set(false);
        this.toast.error(err?.error?.error || err?.error?.message || 'Không thể tạo loại chứng chỉ lúc này!');
      }
    });
  }

  // --- Edit Certificate Type ---
  openEditCertTypeModal(type: CertificateType) {
    this.editingCertType.set(type);
    this.editCertTypeForm = {
      title: type.title,
      cefrLevel: type.cefrLevel || 'A1',
      requiredWords: type.requiredWords || 10,
      requiredStreak: type.requiredStreak || 0,
      description: type.description || '',
      approvedBy: type.approvedBy || 'Hội Đồng Khảo Thí & Đào Tạo Vocario',
      badgeColor: type.badgeColor || '#7D6853',
      isActive: type.isActive !== false
    };
    this.editCertTypeModalOpen.set(true);
  }

  closeEditCertTypeModal() {
    this.editCertTypeModalOpen.set(false);
    this.editingCertType.set(null);
  }

  submitEditCertType() {
    const type = this.editingCertType();
    if (!type) return;

    if (!this.editCertTypeForm.title.trim()) {
      this.toast.error('Vui lòng nhập tiêu đề chứng chỉ!');
      return;
    }

    this.editCertTypeSaving.set(true);
    this.api.updateCertificateType(type.id, {
      title: this.editCertTypeForm.title.trim(),
      cefrLevel: this.editCertTypeForm.cefrLevel,
      requiredWords: Number(this.editCertTypeForm.requiredWords) || 10,
      requiredStreak: Number(this.editCertTypeForm.requiredStreak) || 0,
      description: this.editCertTypeForm.description.trim(),
      approvedBy: this.editCertTypeForm.approvedBy.trim(),
      badgeColor: this.editCertTypeForm.badgeColor,
      isActive: this.editCertTypeForm.isActive
    }).subscribe({
      next: (updated) => {
        this.editCertTypeSaving.set(false);
        this.editCertTypeModalOpen.set(false);
        this.toast.success(`Đã cập nhật tiêu chuẩn loại chứng chỉ [${updated.typeCode}]!`, 'Đã cập nhật');
        this.loadCertificateTypes();
      },
      error: (err) => {
        this.editCertTypeSaving.set(false);
        this.toast.error(err?.error?.error || err?.error?.message || 'Không thể cập nhật loại chứng chỉ!');
      }
    });
  }

  // --- Delete Certificate Type ---
  openDeleteCertTypeModal(type: CertificateType) {
    this.certTypeToDelete.set(type);
    this.deleteCertTypeModalOpen.set(true);
  }

  closeDeleteCertTypeModal() {
    this.deleteCertTypeModalOpen.set(false);
    this.certTypeToDelete.set(null);
  }

  confirmDeleteCertType() {
    const type = this.certTypeToDelete();
    if (!type) return;

    this.deleteCertTypeLoading.set(true);
    this.api.deleteCertificateType(type.id).subscribe({
      next: (res) => {
        this.deleteCertTypeLoading.set(false);
        this.deleteCertTypeModalOpen.set(false);
        this.toast.success(res?.message || `Đã xóa loại chứng chỉ [${type.typeCode}] khỏi danh mục!`, 'Đã xóa');
        this.loadCertificateTypes();
      },
      error: (err) => {
        this.deleteCertTypeLoading.set(false);
        this.toast.error(err?.error?.error || err?.error?.message || 'Không thể xóa loại chứng chỉ!');
      }
    });
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }

  // --- Classroom Management State (Tab 5) ---
  classroomStats = signal<ClassroomOverviewStats | null>(null);
  classroomsList = signal<AdminClassroomItem[]>([]);
  classroomLoading = signal(false);
  classroomCurrentPage = signal(0);
  classroomPageSize = signal(10);
  classroomTotalElements = signal(0);
  classroomTotalPages = signal(0);
  classroomSearchInput = '';
  classroomFilterStatus = 'ALL';
  classroomSort = 'newest';

  // Modal Chi tiết & Kiểm duyệt phòng học
  showClassroomDetailModal = signal(false);
  selectedClassroomDetail = signal<AdminClassroomDetailResponse | null>(null);
  classroomDetailLoading = signal(false);
  classroomDetailActiveTab = signal<'words' | 'members' | 'leaderboard'>('words');

  // Modal Xóa phòng học
  showDeleteClassroomModal = signal(false);
  classroomToDelete = signal<AdminClassroomItem | null>(null);
  deleteClassroomLoading = signal(false);
  promotingWordId = signal<string | null>(null);

  // --- Speech Analytics State ---
  speechAnalytics = signal<SpeechAnalyticsResponse | null>(null);
  speechLoading = signal(false);
  speechPage = signal(0);
  speechPageSize = signal(10);
  speechSearchTerm = signal('');
  speechFilterTier = signal<'ALL' | 'NATIVE' | 'FLUENT' | 'GOOD' | 'NEED_IMPROVE'>('ALL');

  filteredSpeechLogs = computed(() => {
    const data = this.speechAnalytics();
    if (!data || !data.recentLogs) return [];
    let list = data.recentLogs;
    const term = this.speechSearchTerm().toLowerCase().trim();
    if (term) {
      list = list.filter(item => 
        item.word.toLowerCase().includes(term) || 
        item.userName.toLowerCase().includes(term) ||
        item.vietnamese.toLowerCase().includes(term)
      );
    }
    const tier = this.speechFilterTier();
    if (tier === 'NATIVE') {
      list = list.filter(item => item.speechScore >= 90);
    } else if (tier === 'FLUENT') {
      list = list.filter(item => item.speechScore >= 75 && item.speechScore < 90);
    } else if (tier === 'GOOD') {
      list = list.filter(item => item.speechScore >= 55 && item.speechScore < 75);
    } else if (tier === 'NEED_IMPROVE') {
      list = list.filter(item => item.speechScore < 55);
    }
    return list;
  });

  // --- Vocabulary State ---
  words = signal<AdminWordItem[]>([]);
  wordsLoading = signal(false);
  wordsPage = signal(0);
  wordsPageSize = signal(15);
  wordsTotalElements = signal(0);
  wordsTotalPages = signal(0);
  searchTerm = signal('');
  selectedCefr = signal('ALL');
  selectedPartOfSpeech = signal('ALL');
  selectedSortBy = signal('newest');

  // CEFR Levels metadata
  cefrLevels = [
    { code: 'A1', label: 'A1 — Sơ cấp 1', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { code: 'A2', label: 'A2 — Sơ cấp 2', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200' },
    { code: 'B1', label: 'B1 — Trung cấp 1', badgeClass: 'bg-sky-50 text-sky-800 border-sky-200' },
    { code: 'B2', label: 'B2 — Trung cấp 2', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
    { code: 'C1', label: 'C1 — Cao cấp', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200' },
    { code: 'C2', label: 'C2 — Bản xứ', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200' }
  ];

  // --- Modal Form State ---
  wordModalOpen = signal(false);
  wordModalMode = signal<'create' | 'edit'>('create');
  currentEditingId = signal<string | null>(null);

  formWord = '';
  formPartOfSpeech = 'Noun';
  formCefrLevel = 'A1';
  formPhoneticIpa = '';
  formVietnameseMeaning = '';
  formDefinitionEn = '';
  formExampleSentenceEn = '';
  formExampleSentenceVi = '';
  formCategory = 'General';
  formSaving = signal(false);

  // --- Bulk Import Modal State ---
  bulkModalOpen = signal(false);
  bulkInputText = '';
  bulkImporting = signal(false);
  bulkResult = signal<AdminBulkWordResult | null>(null);

  // --- Delete Modal State ---
  deleteModalOpen = signal(false);
  wordToDelete = signal<AdminWordItem | null>(null);
  deleteForce = false;
  deleteLoading = signal(false);

  private searchTimeout: any;

  // --- Student Management State (Tab 3) ---
  userOverviewStats = signal<AdminUserOverviewStats | null>(null);
  users = signal<AdminUserItem[]>([]);
  usersLoading = signal(false);
  usersPage = signal(0);
  usersPageSize = signal(10);
  usersTotalElements = signal(0);
  usersTotalPages = signal(0);
  userSearchTerm = signal('');
  userSelectedRole = signal('ALL');
  userSelectedLevel = signal('ALL');
  userSelectedSortBy = signal('newest');

  // Analytics Modal
  analyticsModalOpen = signal(false);
  analyticsLoading = signal(false);
  userAnalytics = signal<AdminUserAnalytics | null>(null);

  // Edit User Modal
  editUserModalOpen = signal(false);
  editingUser = signal<AdminUserItem | null>(null);
  editFullName = '';
  editTargetLevel = 'A2';
  editDailyGoal = 10;
  editRole = 'STUDENT';
  editUserSaving = signal(false);

  // Reset Progress Modal
  resetModalOpen = signal(false);
  userToReset = signal<AdminUserItem | null>(null);
  resetProgressLoading = signal(false);

  // Create User Modal
  createUserModalOpen = signal(false);
  createUserSaving = signal(false);
  createUserForm = {
    username: '',
    email: '',
    password: '',
    fullName: '',
    targetLevel: 'A1',
    dailyGoal: 10,
    role: 'STUDENT'
  };

  // Delete User Modal
  deleteUserModalOpen = signal(false);
  userToDelete = signal<AdminUserItem | null>(null);
  deleteUserLoading = signal(false);

  private userSearchTimeout: any;

  // --- Vision Moderation State ---
  visionStats = signal<AdminVisionOverviewStats | null>(null);
  captures = signal<AdminCaptureItem[]>([]);
  capturesLoading = signal(false);
  capturesPage = signal(0);
  capturesPageSize = signal(9);
  capturesTotalElements = signal(0);
  capturesTotalPages = signal(0);
  visionSearchKeyword = '';
  visionThemeFilter = 'ALL';
  selectedCapture = signal<AdminCaptureItem | null>(null);
  selectedBoxIndex = signal<number | null>(null);
  showVisionModal = signal(false);
  showDeleteCaptureModal = signal(false);
  captureToDelete = signal<AdminCaptureItem | null>(null);
  deleteCaptureLoading = signal(false);
  promoteWordData = signal<AdminPromoteWordRequest | null>(null);
  showPromoteModal = signal(false);
  promoteLoading = signal(false);
  private visionSearchTimeout: any;

  // --- System Settings & SM-2 State ---
  systemSettings = signal<AdminSystemSettings>({
    initialEasinessFactor: 2.50,
    minEasinessFactor: 1.30,
    interval1Days: 1,
    interval2Days: 6,
    aiVisionConfidenceThreshold: 0.45,
    dailyNewWordLimit: 20,
    targetCefrLevelDefault: 'A2',
    strictGrading: false,
    enableAutoAudioPronunciation: true,
    lastUpdated: new Date().toISOString()
  });
  savingSettings = signal(false);

  // Computed: Parsed boxes for selected capture
  parsedCurrentBoxes = computed(() => {
    const cap = this.selectedCapture();
    if (!cap) return [];
    return this.parseBoxes(cap);
  });

  // Computed: Simulated intervals for SM-2 simulation card
  simulatedIntervals = computed(() => {
    const s = this.systemSettings();
    const i1 = s.interval1Days || 1;
    const i2 = s.interval2Days || 6;
    const ef = s.initialEasinessFactor || 2.5;

    const i3 = Math.round(i2 * ef);
    const i4 = Math.round(i3 * ef);
    const i5 = Math.round(i4 * ef);

    return [
      { name: 'Chu kỳ 1 (Học mới)', interval: `${i1} ngày`, desc: 'Lần ôn tập đầu tiên sau khi quét ảnh' },
      { name: 'Chu kỳ 2 (Củng cố)', interval: `${i2} ngày`, desc: 'Ôn tập lần thứ 2 khi nhớ tốt' },
      { name: 'Chu kỳ 3 (Nhớ sâu)', interval: `${i3} ngày`, desc: `Nhân theo EF = ${ef.toFixed(2)}` },
      { name: 'Chu kỳ 4 (Dài hạn)', interval: `${i4} ngày`, desc: 'Duy trì bền vững trong trí nhớ' },
      { name: 'Chu kỳ 5 (Thành thạo)', interval: `${i5} ngày`, desc: 'Đạt cấp độ Mastered bền vững' }
    ];
  });

  currentTime = computed(() => {
    return '09:42';
  });

  getCefrDescriptor(level: string): { title: string, subtitle: string } {
    switch (level) {
      case 'A1': return { title: 'Sơ cấp 1', subtitle: 'Khởi đầu' };
      case 'A2': return { title: 'Sơ cấp 2', subtitle: 'Cơ bản sinh hoạt' };
      case 'B1': return { title: 'Trung cấp 1', subtitle: 'Tự tin giao tiếp' };
      case 'B2': return { title: 'Trung cấp 2', subtitle: 'Học tập & Công việc' };
      case 'C1': return { title: 'Cao cấp', subtitle: 'Học thuật chuyên sâu' };
      case 'C2': return { title: 'Bản xứ', subtitle: 'Thông thạo hoàn toàn' };
      default: return { title: 'Cơ bản', subtitle: 'Mở rộng' };
    }
  }

  cefrRows = computed(() => {
    const dist = this.stats()?.cefrDistribution || [];
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    return levels.map(lvl => {
      const found = dist.find(d => d.level === lvl);
      let count = found ? found.count : 0;
      let percentage = found ? found.percentage : 0;
      if (!found && dist.length === 0) {
        if (lvl === 'A1') { count = 10; percentage = 55.6; }
        else if (lvl === 'A2') { count = 7; percentage = 38.9; }
        else if (lvl === 'B1') { count = 1; percentage = 5.5; }
      }
      const desc = this.getCefrDescriptor(lvl);
      return {
        level: lvl,
        title: desc.title,
        subtitle: desc.subtitle,
        count,
        percentage
      };
    });
  });

  cefrBarSegments = computed(() => {
    const rows = this.cefrRows();
    const colors: Record<string, { bg: string, text: string }> = {
      'A1': { bg: '#C8B89E', text: '#3D332A' },
      'A2': { bg: '#9B8977', text: '#FFFFFF' },
      'B1': { bg: '#695747', text: '#FFFFFF' },
      'B2': { bg: '#E5DED3', text: '#5C5249' },
      'C1': { bg: '#F2EDE4', text: '#5C5249' }
    };
    return rows.filter(r => r.percentage > 0).map(r => ({
      level: r.level,
      percentage: r.percentage,
      bg: colors[r.level]?.bg || '#C8B89E',
      textColor: colors[r.level]?.text || '#3D332A'
    }));
  });

  formatSceneTitle(theme: string): string {
    if (!theme || theme === 'General' || theme === 'ALL') return 'Phòng khách ấm cúng';
    const map: Record<string, string> = {
      'LIVING_ROOM': 'Phòng khách ấm cúng',
      'STUDY_DESK': 'Bàn học kết nối thiên nhiên',
      'KITCHEN': 'Gian bếp đời thực',
      'DINING': 'Bữa tối thân mật',
      'BEDROOM': 'Phòng ngủ tối giản',
      'BATHROOM': 'Phòng tắm thư giãn',
      'OFFICE': 'Không gian làm việc',
      'OUTDOORS': 'Khuôn viên ngoài trời'
    };
    return map[theme] || `Bối cảnh ${theme}`;
  }

  recentVisionLogs = computed(() => {
    const list = this.captures();
    if (list && list.length > 0) {
      return list.slice(0, 4).map((c, idx) => {
        const title = this.formatSceneTitle(c.sceneTheme);
        const userDisplay = c.userName 
          ? `${c.userName} · camera` 
          : (c.userEmail ? `${c.userEmail} · camera` : 'Sinh viên: Học viên · camera');
        const count = c.detectedCount || (c.objectLabels ? c.objectLabels.length : 0);
        const detailText = `${count} từ nhận diện · độ tin cậy AI`;
        const timeAgo = c.timeAgo || 'Vừa xong';
        const img = this.getImageUrl(c.imageUrl);
        return {
          id: c.id || `cap-${idx}`,
          imageUrl: img,
          title: title,
          userEmail: userDisplay,
          detailText: detailText,
          timeAgo: timeAgo
        };
      });
    }

    return [
      {
        id: 'cap-1',
        imageUrl: '/living_room.jpg',
        title: 'Phòng khách ấm cúng',
        userEmail: 'Sinh viên: Mẫu vocario · camera',
        detailText: '6 từ nhận diện · độ tin cậy 94.8%',
        timeAgo: 'Vừa xong'
      },
      {
        id: 'cap-2',
        imageUrl: '/study_desk.png',
        title: 'Bàn học kết nối thiên nhiên',
        userEmail: 'Nguyen Van Student · camera',
        detailText: '7 từ nhận diện · độ tin cậy 96.2%',
        timeAgo: '2 phút trước'
      },
      {
        id: 'cap-3',
        imageUrl: '/kitchen_reading.png',
        title: 'Gian bếp đời thực',
        userEmail: 'Trần Nhật Tân · camera',
        detailText: '5 từ nhận diện · độ tin cậy 92.5%',
        timeAgo: '7 phút trước'
      },
      {
        id: 'cap-4',
        imageUrl: '/kitchen_refrigerator.png',
        title: 'Bữa tối thân mật',
        userEmail: 'Đặng Ngọc Anh · mobile',
        detailText: '4 từ nhận diện · độ tin cậy 89.1%',
        timeAgo: '15 phút trước'
      }
    ];
  });

  constructor(
    public api: ApiService,
    public toast: ToastService,
    public quizStageService: QuizStageService,
    public userStudyService: UserStudyService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadStats();
    this.loadWords(0);
    this.loadUserStats();
    this.loadVisionStats();
    this.loadCaptures(0);
    this.loadSystemSettings();
    this.loadSpeechAnalytics();
    this.loadClassroomStats();
    this.loadClassrooms(0);
    this.loadCertificateTypes();
  }

  selectTab(tab: 'dashboard' | 'vocabulary' | 'users' | 'arenas' | 'classrooms' | 'vision' | 'settings' | 'speech' | 'certificates') {
    this.activeTab = tab;
    this.sidebarOpen.set(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (tab === 'certificates') {
      this.loadAdminCertificates();
      this.loadCertificateTypes();
    }
    if (tab === 'vocabulary' && !this.words().length) {
      this.loadWords(0);
    }
    if (tab === 'users') {
      this.loadUserStats();
      if (!this.users().length) {
        this.loadUsers(0);
      }
    }
    if (tab === 'classrooms') {
      this.loadClassroomStats();
      if (!this.classroomsList().length) {
        this.loadClassrooms(0);
      }
    }
    if (tab === 'vision') {
      this.loadVisionStats();
      if (!this.captures().length) {
        this.loadCaptures(0);
      }
    }
    if (tab === 'settings') {
      this.loadSystemSettings();
    }
    if (tab === 'speech') {
      this.loadSpeechAnalytics();
    }
  }

  handleRefreshCurrentTab() {
    if (this.activeTab === 'vocabulary') {
      this.loadWords(this.wordsPage());
    } else if (this.activeTab === 'users') {
      this.loadUserStats();
      this.loadUsers(this.usersPage());
    } else if (this.activeTab === 'classrooms') {
      this.loadClassroomStats();
      this.loadClassrooms(this.classroomCurrentPage());
    } else if (this.activeTab === 'vision') {
      this.loadVisionStats();
      this.loadCaptures(this.capturesPage());
    } else if (this.activeTab === 'settings') {
      this.loadSystemSettings();
    } else if (this.activeTab === 'speech') {
      this.loadSpeechAnalytics();
    } else if (this.activeTab === 'arenas') {
      this.toast.info('Danh sách đấu trường hiển thị đồng bộ thời gian thực.');
    } else {
      this.loadStats();
    }
  }

  loadSpeechAnalytics() {
    this.speechLoading.set(true);
    this.api.getSpeechAnalytics(this.speechPage(), this.speechPageSize()).subscribe({
      next: (res) => {
        this.speechAnalytics.set(res);
        this.speechLoading.set(false);
      },
      error: (err) => {
        console.warn('Lỗi khi tải speech analytics:', err);
        this.speechLoading.set(false);
      }
    });
  }

  playNativeAudio(word: string) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }

  prevSpeechPage() {
    if (this.speechPage() > 0) {
      this.speechPage.update(p => p - 1);
      this.loadSpeechAnalytics();
    }
  }

  nextSpeechPage() {
    const total = this.speechAnalytics()?.totalPages ?? 1;
    if (this.speechPage() < total - 1) {
      this.speechPage.update(p => p + 1);
      this.loadSpeechAnalytics();
    }
  }

  loadStats() {
    this.loading.set(true);
    this.api.getAdminStats().subscribe({
      next: (res) => {
        this.stats.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading admin stats:', err);
        this.loading.set(false);
        this.toast.error('Không thể tải dữ liệu thống kê từ máy chủ!', 'Lỗi nạp dữ liệu');
      }
    });
  }

  // --- Classroom Management Methods (Tab 5) ---
  loadClassroomStats() {
    this.api.getAdminClassroomStats().subscribe({
      next: (stats) => this.classroomStats.set(stats),
      error: (err) => console.warn('Lỗi khi tải thống kê phòng học:', err)
    });
  }

  loadClassrooms(page: number = 0) {
    this.classroomLoading.set(true);
    this.classroomCurrentPage.set(page);
    this.api.getAdminClassrooms(
      page,
      this.classroomPageSize(),
      this.classroomSearchInput,
      this.classroomFilterStatus,
      this.classroomSort
    ).subscribe({
      next: (res) => {
        this.classroomsList.set(res.content || []);
        this.classroomTotalElements.set(res.totalElements || 0);
        this.classroomTotalPages.set(res.totalPages || 0);
        this.classroomLoading.set(false);
      },
      error: (err) => {
        console.error('Lỗi khi tải danh sách phòng học:', err);
        this.classroomLoading.set(false);
        this.toast.error('Không thể tải danh sách lớp học');
      }
    });
  }

  onClassroomSearch() {
    this.loadClassrooms(0);
  }

  onClassroomFilterChange() {
    this.loadClassrooms(0);
  }

  onClassroomSortChange() {
    this.loadClassrooms(0);
  }

  changeClassroomPage(page: number) {
    if (page >= 0 && page < this.classroomTotalPages()) {
      this.loadClassrooms(page);
    }
  }

  viewClassroomDetail(id: string) {
    this.classroomDetailLoading.set(true);
    this.classroomDetailActiveTab.set('words');
    this.showClassroomDetailModal.set(true);
    this.api.getAdminClassroomDetail(id).subscribe({
      next: (res) => {
        this.selectedClassroomDetail.set(res);
        this.classroomDetailLoading.set(false);
      },
      error: (err) => {
        console.error('Lỗi khi tải chi tiết phòng học:', err);
        this.classroomDetailLoading.set(false);
        this.toast.error('Không thể tải thông tin chi tiết phòng học');
      }
    });
  }

  closeClassroomDetailModal() {
    this.showClassroomDetailModal.set(false);
    this.selectedClassroomDetail.set(null);
  }

  toggleClassroomStatus(room: AdminClassroomItem) {
    this.api.toggleAdminClassroomStatus(room.id).subscribe({
      next: (updated) => {
        const newStatus = updated.status;
        this.classroomsList.update(list => list.map(item => item.id === room.id ? { ...item, status: newStatus } : item));
        if (this.selectedClassroomDetail() && this.selectedClassroomDetail()!.classroom.id === room.id) {
          this.selectedClassroomDetail.update(detail => detail ? {
            ...detail,
            classroom: { ...detail.classroom, status: newStatus }
          } : null);
        }
        this.loadClassroomStats();
        if (newStatus === 'LOCKED') {
          this.toast.warning(`Đã khóa phòng học [${room.code}] "${room.name}"`);
        } else {
          this.toast.success(`Đã mở khóa phòng học [${room.code}] "${room.name}"`);
        }
      },
      error: (err) => {
        console.error('Lỗi khi đổi trạng thái phòng học:', err);
        this.toast.error('Không thể cập nhật trạng thái phòng học');
      }
    });
  }

  openDeleteClassroomModal(room: AdminClassroomItem) {
    this.classroomToDelete.set(room);
    this.showDeleteClassroomModal.set(true);
  }

  closeDeleteClassroomModal() {
    this.showDeleteClassroomModal.set(false);
    this.classroomToDelete.set(null);
  }

  confirmDeleteClassroom() {
    const target = this.classroomToDelete();
    if (!target) return;
    this.deleteClassroomLoading.set(true);
    this.api.deleteAdminClassroom(target.id).subscribe({
      next: () => {
        this.deleteClassroomLoading.set(false);
        this.closeDeleteClassroomModal();
        if (this.showClassroomDetailModal() && this.selectedClassroomDetail()?.classroom.id === target.id) {
          this.closeClassroomDetailModal();
        }
        this.toast.success(`Đã xóa vĩnh viễn phòng học [${target.code}] "${target.name}"`);
        this.loadClassrooms(this.classroomCurrentPage());
        this.loadClassroomStats();
      },
      error: (err) => {
        this.deleteClassroomLoading.set(false);
        console.error('Lỗi khi xóa phòng học:', err);
        this.toast.error('Không thể xóa phòng học');
      }
    });
  }

  promoteClassroomWord(word: ClassroomWordItem) {
    if (!word.id) return;
    this.promotingWordId.set(word.id);
    const targetLevel = this.selectedClassroomDetail()?.classroom.targetLevel || 'B1';
    this.api.promoteAdminClassroomWord(word.id, targetLevel, 'Lớp học ' + (this.selectedClassroomDetail()?.classroom.code || '')).subscribe({
      next: (saved) => {
        this.promotingWordId.set(null);
        this.toast.success(`Đã duyệt từ "${saved.word}" vào Kho Từ Điển CEFR!`);
        this.loadWords(this.wordsPage());
        this.loadStats();
      },
      error: (err) => {
        this.promotingWordId.set(null);
        console.error('Lỗi khi duyệt từ vựng:', err);
        this.toast.error('Không thể duyệt từ vựng vào kho từ điển');
      }
    });
  }

  // --- Vocabulary Management Methods ---
  loadWords(page: number = 0) {
    this.wordsLoading.set(true);
    this.api.getAdminWords(
      page,
      this.wordsPageSize(),
      this.searchTerm(),
      this.selectedCefr(),
      this.selectedPartOfSpeech(),
      this.selectedSortBy()
    ).subscribe({
      next: (res) => {
        this.words.set(res.content || []);
        this.wordsPage.set(res.page);
        this.wordsTotalElements.set(res.totalElements);
        this.wordsTotalPages.set(res.totalPages);
        this.wordsLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading admin words:', err);
        this.wordsLoading.set(false);
        this.toast.error('Không thể tải danh sách từ vựng từ cơ sở dữ liệu!', 'Lỗi nạp từ điển');
      }
    });
  }

  onSearchChange(term: string) {
    this.searchTerm.set(term);
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.loadWords(0);
    }, 300);
  }

  onCefrChange(level: string) {
    this.selectedCefr.set(level);
    this.loadWords(0);
  }

  onPosChange(pos: string) {
    this.selectedPartOfSpeech.set(pos);
    this.loadWords(0);
  }

  onSortChange(sortBy: string) {
    this.selectedSortBy.set(sortBy);
    this.loadWords(0);
  }

  onPageSizeChange(size: number) {
    this.wordsPageSize.set(Number(size));
    this.loadWords(0);
  }

  changePage(newPage: number) {
    if (newPage >= 0 && newPage < this.wordsTotalPages()) {
      this.loadWords(newPage);
    }
  }

  getEndElement(): number {
    return Math.min((this.wordsPage() + 1) * this.wordsPageSize(), this.wordsTotalElements());
  }

  // --- Create / Edit Word Modal ---
  openCreateWordModal() {
    this.wordModalMode.set('create');
    this.currentEditingId.set(null);
    this.formWord = '';
    this.formPartOfSpeech = 'Noun';
    this.formCefrLevel = 'A1';
    this.formPhoneticIpa = '';
    this.formVietnameseMeaning = '';
    this.formDefinitionEn = '';
    this.formExampleSentenceEn = '';
    this.formExampleSentenceVi = '';
    this.formCategory = 'General';
    this.formSaving.set(false);
    this.wordModalOpen.set(true);
  }

  openEditWordModal(word: AdminWordItem) {
    this.wordModalMode.set('edit');
    this.currentEditingId.set(word.id || null);
    this.formWord = word.word || '';
    this.formPartOfSpeech = word.partOfSpeech || 'Noun';
    this.formCefrLevel = word.cefrLevel || 'A1';
    this.formPhoneticIpa = word.phoneticIpa || '';
    this.formVietnameseMeaning = word.vietnameseMeaning || '';
    this.formDefinitionEn = word.definitionEn || '';
    this.formExampleSentenceEn = word.exampleSentenceEn || '';
    this.formExampleSentenceVi = word.exampleSentenceVi || '';
    this.formCategory = word.category || 'General';
    this.formSaving.set(false);
    this.wordModalOpen.set(true);
  }

  closeWordModal() {
    this.wordModalOpen.set(false);
  }

  saveWord() {
    const w = this.formWord.trim();
    const meaning = this.formVietnameseMeaning.trim();

    if (!w || !meaning) {
      this.toast.warning('Vui lòng nhập từ vựng tiếng Anh và nghĩa tiếng Việt!', 'Thiếu thông tin');
      return;
    }

    const payload: AdminWordRequest = {
      word: w,
      partOfSpeech: this.formPartOfSpeech,
      cefrLevel: this.formCefrLevel,
      phoneticIpa: this.formPhoneticIpa.trim(),
      vietnameseMeaning: meaning,
      definitionEn: this.formDefinitionEn.trim(),
      exampleSentenceEn: this.formExampleSentenceEn.trim(),
      exampleSentenceVi: this.formExampleSentenceVi.trim(),
      category: this.formCategory.trim()
    };

    this.formSaving.set(true);

    if (this.wordModalMode() === 'create') {
      this.api.createAdminWord(payload).subscribe({
        next: (res) => {
          this.formSaving.set(false);
          this.toast.success(`Đã thêm từ "${res.word}" vào kho từ điển thành công!`, 'Thêm thành công');
          this.closeWordModal();
          this.loadWords(0);
          this.loadStats();
        },
        error: (err) => {
          this.formSaving.set(false);
          const msg = err.error?.error || 'Không thể tạo mới từ vựng!';
          this.toast.error(msg, 'Lỗi tạo từ');
        }
      });
    } else {
      const id = this.currentEditingId();
      if (!id) return;
      this.api.updateAdminWord(id, payload).subscribe({
        next: (res) => {
          this.formSaving.set(false);
          this.toast.success(`Đã cập nhật mục từ "${res.word}" thành công!`, 'Cập nhật thành công');
          this.closeWordModal();
          this.loadWords(this.wordsPage());
        },
        error: (err) => {
          this.formSaving.set(false);
          const msg = err.error?.error || 'Không thể cập nhật từ vựng!';
          this.toast.error(msg, 'Lỗi cập nhật');
        }
      });
    }
  }

  // --- Delete Word ---
  confirmDeleteWord(word: AdminWordItem) {
    this.wordToDelete.set(word);
    this.deleteForce = false;
    this.deleteLoading.set(false);
    this.deleteModalOpen.set(true);
  }

  executeDeleteWord() {
    const word = this.wordToDelete();
    if (!word?.id) return;

    this.deleteLoading.set(true);
    this.api.deleteAdminWord(word.id, this.deleteForce).subscribe({
      next: () => {
        this.deleteLoading.set(false);
        this.deleteModalOpen.set(false);
        this.toast.success(`Đã xóa từ vựng "${word.word}" khỏi kho thành công!`, 'Đã xóa');
        this.loadWords(this.wordsPage());
        this.loadStats();
      },
      error: (err) => {
        this.deleteLoading.set(false);
        const msg = err.error?.error || 'Không thể xóa từ vựng!';
        this.toast.error(msg, 'Lỗi xóa từ');
      }
    });
  }

  // --- Bulk Import ---
  openBulkModal() {
    this.bulkInputText = '';
    this.bulkResult.set(null);
    this.bulkImporting.set(false);
    this.bulkModalOpen.set(true);
  }

  closeBulkModal() {
    this.bulkModalOpen.set(false);
  }

  insertJsonSample() {
    const sample = [
      {
        word: "coffee maker",
        partOfSpeech: "Noun",
        cefrLevel: "A2",
        phoneticIpa: "/ˈkɒf.i ˌmeɪ.kər/",
        vietnameseMeaning: "Máy pha cà phê",
        exampleSentenceEn: "Pour fresh water into the coffee maker before brewing.",
        exampleSentenceVi: "Đổ nước sạch vào máy pha cà phê trước khi pha.",
        category: "Kitchen"
      },
      {
        word: "desk lamp",
        partOfSpeech: "Noun",
        cefrLevel: "A1",
        phoneticIpa: "/desk læmp/",
        vietnameseMeaning: "Đèn bàn học",
        exampleSentenceEn: "The LED desk lamp provides comfortable lighting for reading.",
        exampleSentenceVi: "Chiếc đèn bàn LED cung cấp ánh sáng dễ chịu để đọc sách.",
        category: "Office"
      }
    ];
    this.bulkInputText = JSON.stringify(sample, null, 2);
  }

  insertCsvSample() {
    const csv = `word,vietnameseMeaning,phoneticIpa,cefrLevel,partOfSpeech,exampleSentenceEn,exampleSentenceVi,category
whiteboard,Bảng trắng viết bút dạ,/ˈwaɪt.bɔːd/,A1,Noun,The teacher writes new grammar rules on the whiteboard.,Giáo viên viết ngữ pháp mới lên bảng trắng.,Classroom
headphone,Tai nghe trùm đầu,/ˈhed.fəʊn/,A2,Noun,Put on your headphones to concentrate on listening exercises.,Đeo tai nghe vào để tập trung luyện nghe.,Study`;
    this.bulkInputText = csv;
  }

  executeBulkImport() {
    const raw = this.bulkInputText.trim();

    if (!raw) return;

    let items: AdminWordRequest[] = [];

    // Thử parse JSON trước
    if (raw.startsWith('[') || raw.startsWith('{')) {
      try {
        const parsed = JSON.parse(raw);
        items = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        this.toast.error('Định dạng JSON không hợp lệ! Vui lòng kiểm tra lại dấu ngoặc hoặc dùng mẫu CSV.', 'Lỗi cú pháp');
        return;
      }
    } else {
      // Parse CSV
      const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 0 && lines[0].toLowerCase().includes('word')) {
        lines.shift(); // bỏ header
      }
      for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          items.push({
            word: parts[0],
            vietnameseMeaning: parts[1],
            phoneticIpa: parts[2] || '',
            cefrLevel: parts[3] || 'A1',
            partOfSpeech: parts[4] || 'Noun',
            exampleSentenceEn: parts[5] || '',
            exampleSentenceVi: parts[6] || '',
            category: parts[7] || 'General'
          });
        }
      }
    }

    if (!items.length) {
      this.toast.warning('Không tìm thấy dòng từ vựng hợp lệ nào để nạp!', 'Dữ liệu trống');
      return;
    }

    this.bulkImporting.set(true);
    this.api.bulkCreateAdminWords(items).subscribe({
      next: (res) => {
        this.bulkImporting.set(false);
        this.bulkResult.set(res);
        this.toast.success(`Đã nạp thành công ${res.successCount} từ mới vào kho từ điển!`, 'Nạp hoàn tất');
        this.loadWords(0);
        this.loadStats();
      },
      error: (err) => {
        this.bulkImporting.set(false);
        this.toast.error('Quá trình nạp hàng loạt gặp sự cố!', 'Lỗi nạp hàng loạt');
      }
    });
  }

  // --- Export CSV ---
  exportWordsCsv() {
    if (!this.words().length) {
      this.toast.info('Kho từ vựng hiện tại chưa có dữ liệu để xuất.', 'Thông báo');
      return;
    }

    // Xuất trang hiện tại hoặc nạp toàn bộ
    const rows = [
      ['Từ tiếng Anh', 'Loại từ', 'Phiên âm IPA', 'Cấp độ CEFR', 'Nghĩa tiếng Việt', 'Ví dụ tiếng Anh', 'Dịch ví dụ', 'Chủ đề', 'Học viên']
    ];

    for (const w of this.words()) {
      rows.push([
        `"${(w.word || '').replace(/"/g, '""')}"`,
        `"${(w.partOfSpeech || '').replace(/"/g, '""')}"`,
        `"${(w.phoneticIpa || '').replace(/"/g, '""')}"`,
        `"${(w.cefrLevel || '').replace(/"/g, '""')}"`,
        `"${(w.vietnameseMeaning || '').replace(/"/g, '""')}"`,
        `"${(w.exampleSentenceEn || '').replace(/"/g, '""')}"`,
        `"${(w.exampleSentenceVi || '').replace(/"/g, '""')}"`,
        `"${(w.category || '').replace(/"/g, '""')}"`,
        `"${w.activeLearnersCount ?? 0}"`
      ]);
    }

    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocario-words-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    this.toast.success('Đã tải xuống tệp danh mục từ vựng CSV!', 'Xuất CSV');
  }

  // --- Helper Methods ---
  speak(text: string) {
    if (text) {
      this.api.speak(text);
    }
  }

  handleLogout() {
    this.api.logout();
    this.router.navigate(['/']);
    this.toast.info('Bạn đã đăng xuất khỏi tài khoản Quản trị viên.', 'Đã đăng xuất');
  }

  getCefrBadgeClass(level: string): string {
    switch (level?.toUpperCase()) {
      case 'A1': return 'bg-[#FAF8F5] text-[#7D6853] border border-[#E5DED3]';
      case 'A2': return 'bg-[#FAF8F5] text-[#5C5249] border border-[#D5CABE]';
      case 'B1': return 'bg-[#EFEAE1] text-[#4F4132] border border-[#C9BEB0]';
      case 'B2': return 'bg-[#E5DED3] text-[#2D2823] border border-[#BDAFA0]';
      case 'C1': return 'bg-[#7D6853] text-white border border-[#7D6853]';
      case 'C2': return 'bg-[#2D2823] text-white border border-[#2D2823]';
      default: return 'bg-[#FAF8F5] text-[#5C5249] border border-[#E5DED3]';
    }
  }

  getCefrBarClass(level: string): string {
    switch (level?.toUpperCase()) {
      case 'A1': return 'bg-emerald-500';
      case 'A2': return 'bg-teal-500';
      case 'B1': return 'bg-sky-500';
      case 'B2': return 'bg-indigo-500';
      case 'C1': return 'bg-purple-500';
      case 'C2': return 'bg-rose-500';
      default: return 'bg-[#7D6853]';
    }
  }

  getCefrLabel(level: string): string {
    switch (level?.toUpperCase()) {
      case 'A1': return 'Sơ cấp 1 (Khởi đầu)';
      case 'A2': return 'Sơ cấp 2 (Cơ bản sinh hoạt)';
      case 'B1': return 'Trung cấp 1 (Tự tin giao tiếp)';
      case 'B2': return 'Trung cấp 2 (Học tập & công việc)';
      case 'C1': return 'Cao cấp (Học thuật chuyên sâu)';
      case 'C2': return 'Thành thạo bản xứ';
      default: return 'Cấp độ tiêu chuẩn';
    }
  }

  getActivityIconName(type: string): string {
    switch (type) {
      case 'CAPTURE': return 'camera';
      case 'REVIEW': return 'brain';
      case 'LEVEL_UP': return 'award';
      case 'REGISTER': return 'graduation-cap';
      default: return 'sparkles';
    }
  }

  getActivityIconClass(type: string): string {
    switch (type) {
      case 'CAPTURE': return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'REVIEW': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'LEVEL_UP': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'REGISTER': return 'bg-blue-50 text-blue-700 border border-blue-200';
      default: return 'bg-[#FAF8F5] text-[#7D6853] border border-[#E5DED3]';
    }
  }

  exportSummaryReport() {
    const data = this.stats();
    if (!data) return;

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocario-admin-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    window.URL.revokeObjectURL(url);

    this.toast.success('Đã xuất báo cáo thống kê KPI hệ thống thành công!', 'Xuất báo cáo');
  }

  // --- Student Management Methods (Tab 3) ---
  loadUserStats() {
    this.api.getAdminUserOverviewStats().subscribe({
      next: (res) => {
        this.userOverviewStats.set(res);
      },
      error: (err) => {
        console.error('Error loading user overview stats:', err);
      }
    });
  }

  loadUsers(page: number = 0) {
    this.usersLoading.set(true);
    this.api.getAdminUsers(
      page,
      this.usersPageSize(),
      this.userSearchTerm(),
      this.userSelectedRole(),
      this.userSelectedLevel(),
      this.userSelectedSortBy()
    ).subscribe({
      next: (res) => {
        this.users.set(res.content || []);
        this.usersPage.set(res.page);
        this.usersTotalElements.set(res.totalElements);
        this.usersTotalPages.set(res.totalPages);
        this.usersLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading admin users:', err);
        this.usersLoading.set(false);
        this.toast.error('Không thể tải danh sách học viên từ cơ sở dữ liệu!', 'Lỗi nạp học viên');
      }
    });
  }

  onUserSearchChange(term: string) {
    this.userSearchTerm.set(term);
    clearTimeout(this.userSearchTimeout);
    this.userSearchTimeout = setTimeout(() => {
      this.loadUsers(0);
    }, 300);
  }

  onUserRoleChange(role: string) {
    this.userSelectedRole.set(role);
    this.loadUsers(0);
  }

  onUserLevelChange(level: string) {
    this.userSelectedLevel.set(level);
    this.loadUsers(0);
  }

  onUserSortChange(sortBy: string) {
    this.userSelectedSortBy.set(sortBy);
    this.loadUsers(0);
  }

  changeUserPage(newPage: number) {
    if (newPage >= 0 && newPage < this.usersTotalPages()) {
      this.loadUsers(newPage);
    }
  }

  onUserPageSizeChange(size: any) {
    this.usersPageSize.set(Number(size));
    this.loadUsers(0);
  }

  getUserEndElement(): number {
    const end = (this.usersPage() + 1) * this.usersPageSize();
    return Math.min(end, this.usersTotalElements());
  }

  openAnalyticsModal(user: AdminUserItem) {
    this.analyticsModalOpen.set(true);
    this.analyticsLoading.set(true);
    this.api.getAdminUserAnalytics(user.id).subscribe({
      next: (res) => {
        this.userAnalytics.set(res);
        this.analyticsLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading user analytics:', err);
        this.analyticsLoading.set(false);
        this.toast.error('Không thể tải hồ sơ năng lực của học viên!', 'Lỗi nạp phân tích');
      }
    });
  }

  openEditUserModal(user: AdminUserItem) {
    this.editingUser.set(user);
    this.editFullName = user.fullName || '';
    this.editTargetLevel = user.targetLevel || 'A2';
    this.editDailyGoal = user.dailyGoal || 10;
    this.editRole = user.role || 'STUDENT';
    this.editUserModalOpen.set(true);
  }

  saveEditUser() {
    const user = this.editingUser();
    if (!user) return;

    this.editUserSaving.set(true);
    const payload: AdminUserUpdateRequest = {
      fullName: this.editFullName,
      targetLevel: this.editTargetLevel,
      dailyGoal: this.editDailyGoal,
      role: this.editRole
    };

    this.api.updateAdminUser(user.id, payload).subscribe({
      next: (updated) => {
        this.editUserSaving.set(false);
        this.editUserModalOpen.set(false);
        this.toast.success(`Đã cập nhật thông tin học viên "${updated.fullName || updated.username}" thành công!`, 'Thành công');
        this.loadUsers(this.usersPage());
        this.loadUserStats();
      },
      error: (err) => {
        console.error('Error updating user:', err);
        this.editUserSaving.set(false);
        this.toast.error('Không thể cập nhật thông tin học viên!', 'Lỗi cập nhật');
      }
    });
  }

  openResetProgressModal(user: AdminUserItem) {
    this.userToReset.set(user);
    this.resetModalOpen.set(true);
  }

  executeResetProgress() {
    const user = this.userToReset();
    if (!user) return;

    this.resetProgressLoading.set(true);
    this.api.resetAdminUserProgress(user.id).subscribe({
      next: () => {
        this.resetProgressLoading.set(false);
        this.resetModalOpen.set(false);
        this.toast.success(`Đã đặt lại toàn bộ tiến trình học SM-2 của học viên "${user.fullName || user.username}"!`, 'Đã đặt lại');
        this.loadUsers(this.usersPage());
        this.loadUserStats();
      },
      error: (err) => {
        console.error('Error resetting user progress:', err);
        this.resetProgressLoading.set(false);
        this.toast.error('Không thể đặt lại tiến trình học!', 'Lỗi thao tác');
      }
    });
  }

  // --- Create User Handlers ---
  openCreateUserModal() {
    this.createUserForm = {
      username: '',
      email: '',
      password: '',
      fullName: '',
      targetLevel: 'A1',
      dailyGoal: 10,
      role: 'STUDENT'
    };
    this.createUserModalOpen.set(true);
  }

  closeCreateUserModal() {
    this.createUserModalOpen.set(false);
  }

  submitCreateUser() {
    if (!this.createUserForm.username.trim()) {
      this.toast.error('Vui lòng nhập tên đăng nhập của học viên!');
      return;
    }
    if (!this.createUserForm.email.trim()) {
      this.toast.error('Vui lòng nhập địa chỉ email hợp lệ!');
      return;
    }

    this.createUserSaving.set(true);
    this.api.createAdminUser({
      username: this.createUserForm.username.trim(),
      email: this.createUserForm.email.trim(),
      password: this.createUserForm.password.trim() || undefined,
      fullName: this.createUserForm.fullName.trim() || undefined,
      targetLevel: this.createUserForm.targetLevel,
      dailyGoal: Number(this.createUserForm.dailyGoal) || 10,
      role: this.createUserForm.role
    }).subscribe({
      next: (created) => {
        this.createUserSaving.set(false);
        this.createUserModalOpen.set(false);
        this.toast.success(`Đã tạo tài khoản học viên "${created.fullName || created.username}" thành công!`, 'Tạo thành công');
        this.loadUsers(0);
        this.loadUserStats();
      },
      error: (err) => {
        this.createUserSaving.set(false);
        this.toast.error(err?.error?.error || err?.error?.message || 'Không thể tạo tài khoản học viên lúc này!', 'Lỗi khởi tạo');
      }
    });
  }

  // --- Delete User Handlers ---
  openDeleteUserModal(user: AdminUserItem) {
    this.userToDelete.set(user);
    this.deleteUserModalOpen.set(true);
  }

  closeDeleteUserModal() {
    this.deleteUserModalOpen.set(false);
    this.userToDelete.set(null);
  }

  confirmDeleteUser() {
    const user = this.userToDelete();
    if (!user) return;

    this.deleteUserLoading.set(true);
    this.api.deleteAdminUser(user.id).subscribe({
      next: (res) => {
        this.deleteUserLoading.set(false);
        this.deleteUserModalOpen.set(false);
        this.toast.success(res?.message || `Đã xóa tài khoản học viên "${user.fullName || user.username}"!`, 'Đã xóa');
        this.loadUsers(this.usersPage());
        this.loadUserStats();
        this.loadAdminCertificates();
      },
      error: (err) => {
        this.deleteUserLoading.set(false);
        this.toast.error(err?.error?.error || err?.error?.message || 'Không thể xóa tài khoản học viên!', 'Lỗi xóa');
      }
    });
  }

  formatTimeAgo(dateString?: string): string {
    if (!dateString) return 'Chưa có hoạt động';
    try {
      const now = new Date().getTime();
      const past = new Date(dateString).getTime();
      const diffMs = now - past;
      if (diffMs < 0) return 'Vừa xong';
      const diffMin = Math.floor(diffMs / (1000 * 60));
      if (diffMin < 1) return 'Vừa xong';
      if (diffMin < 60) return `${diffMin} phút trước`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays} ngày trước`;
      return new Date(dateString).toLocaleDateString('vi-VN');
    } catch {
      return 'Vừa xong';
    }
  }

  // ==================== PHÂN HỆ 4: KIỂM DUYỆT BỐI CẢNH AI VISION METHODS ====================

  loadVisionStats() {
    this.api.getAdminVisionOverview().subscribe({
      next: (res) => {
        this.visionStats.set(res);
      },
      error: (err) => console.error('Lỗi nạp thống kê Vision:', err)
    });
  }

  loadCaptures(page: number = 0) {
    this.capturesLoading.set(true);
    this.api.getAdminVisionCaptures(
      page,
      this.capturesPageSize(),
      this.visionThemeFilter,
      this.visionSearchKeyword
    ).subscribe({
      next: (res) => {
        this.captures.set(res.content || []);
        this.capturesPage.set(res.page);
        this.capturesTotalElements.set(res.totalElements);
        this.capturesTotalPages.set(res.totalPages);
        this.capturesLoading.set(false);
      },
      error: (err) => {
        console.error('Lỗi tải danh sách ảnh:', err);
        this.capturesLoading.set(false);
        this.toast.error('Không thể nạp danh sách ảnh bối cảnh!', 'Lỗi nạp ảnh');
      }
    });
  }

  onVisionSearch() {
    clearTimeout(this.visionSearchTimeout);
    this.visionSearchTimeout = setTimeout(() => {
      this.loadCaptures(0);
    }, 300);
  }

  onVisionThemeChange() {
    this.loadCaptures(0);
  }

  resetVisionFilters() {
    this.visionSearchKeyword = '';
    this.visionThemeFilter = 'ALL';
    this.loadCaptures(0);
  }

  changeCapturesPage(page: number) {
    if (page >= 0 && page < this.capturesTotalPages()) {
      this.loadCaptures(page);
    }
  }

  openVisionDetail(capture: AdminCaptureItem) {
    this.selectedCapture.set(capture);
    this.selectedBoxIndex.set(null);
    this.showVisionModal.set(true);
  }

  closeVisionModal() {
    this.showVisionModal.set(false);
    this.selectedCapture.set(null);
    this.selectedBoxIndex.set(null);
  }

  openDeleteCapture(capture: AdminCaptureItem) {
    this.captureToDelete.set(capture);
    this.showDeleteCaptureModal.set(true);
  }

  closeDeleteCaptureModal() {
    this.showDeleteCaptureModal.set(false);
    this.captureToDelete.set(null);
  }

  confirmDeleteCapture() {
    const cap = this.captureToDelete();
    if (!cap) return;

    this.deleteCaptureLoading.set(true);
    this.api.deleteAdminVisionCapture(cap.id).subscribe({
      next: () => {
        this.deleteCaptureLoading.set(false);
        this.toast.success(`Đã xóa ảnh bối cảnh '${cap.sceneTheme}' thành công!`, 'Xóa ảnh hoàn tất');
        this.closeDeleteCaptureModal();
        if (this.selectedCapture()?.id === cap.id) {
          this.closeVisionModal();
        }
        this.loadCaptures(this.capturesPage());
        this.loadVisionStats();
      },
      error: (err) => {
        console.error('Lỗi xóa ảnh:', err);
        this.deleteCaptureLoading.set(false);
        this.toast.error('Không thể xóa ảnh bối cảnh!', 'Lỗi thao tác');
      }
    });
  }

  openPromoteModal(box: DetectedObjectBox) {
    this.promoteWordData.set({
      word: box.word,
      partOfSpeech: box.partOfSpeech || 'noun',
      phoneticIpa: box.ipa || '',
      vietnameseMeaning: box.vietnamese || '',
      definitionEn: `A ${box.word} identified in real-world scenes.`,
      cefrLevel: box.level || 'A2',
      exampleSentenceEn: box.exampleEn || `I can see a ${box.word} in the room.`,
      exampleSentenceVi: box.exampleVi || `Tôi có thể nhìn thấy một ${box.vietnamese || box.word} trong phòng.`,
      category: 'AI Vision Object'
    });
    this.showPromoteModal.set(true);
  }

  closePromoteModal() {
    this.showPromoteModal.set(false);
    this.promoteWordData.set(null);
  }

  submitPromoteWord() {
    const data = this.promoteWordData();
    if (!data || !data.word.trim()) return;

    this.promoteLoading.set(true);
    this.api.promoteAdminVisionWord(data).subscribe({
      next: (word) => {
        this.promoteLoading.set(false);
        this.toast.success(`Đã thêm từ '${word.word}' vào Kho Từ Điển CEFR!`, 'Duyệt thành công');
        this.closePromoteModal();
        this.loadWords(0);
      },
      error: (err) => {
        console.error('Lỗi duyệt từ vựng:', err);
        this.promoteLoading.set(false);
        this.toast.error('Không thể duyệt từ vào từ điển!', 'Lỗi thao tác');
      }
    });
  }

  // ==================== PHÂN HỆ 5: CẤU HÌNH SM-2 & HỆ THỐNG METHODS ====================

  loadSystemSettings() {
    this.api.getAdminSystemSettings().subscribe({
      next: (res) => {
        this.systemSettings.set(res);
      },
      error: (err) => console.error('Lỗi nạp cấu hình hệ thống:', err)
    });
  }

  saveSystemSettings() {
    this.savingSettings.set(true);
    this.api.updateAdminSystemSettings(this.systemSettings()).subscribe({
      next: (res) => {
        this.systemSettings.set(res);
        this.savingSettings.set(false);
        this.toast.success('Đã lưu cấu hình thuật toán SM-2 & AI Vision thành công!', 'Cập nhật hoàn tất');
      },
      error: (err) => {
        console.error('Lỗi lưu cấu hình:', err);
        this.savingSettings.set(false);
        this.toast.error('Không thể lưu cấu hình hệ thống!', 'Lỗi lưu trữ');
      }
    });
  }

  resetSystemSettings() {
    this.api.resetAdminSystemSettings().subscribe({
      next: (res) => {
        this.systemSettings.set(res);
        this.toast.success('Đã khôi phục cài đặt gốc SuperMemo SM-2 & YOLO-World!', 'Khôi phục hoàn tất');
      },
      error: (err) => {
        console.error('Lỗi đặt lại cấu hình:', err);
        this.toast.error('Không thể đặt lại cấu hình!', 'Lỗi thao tác');
      }
    });
  }

  onSettingChange(field: keyof AdminSystemSettings, value: any) {
    const current = { ...this.systemSettings() };
    if (typeof current[field] === 'number') {
      (current as any)[field] = Number(value);
    } else if (typeof current[field] === 'boolean') {
      (current as any)[field] = Boolean(value);
    } else {
      (current as any)[field] = value;
    }
    this.systemSettings.set(current);
  }

  getImageUrl(url: string): string {
    if (!url) return '/study_desk.png';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (url.startsWith('/uploads/')) return `${environment.serverUrl}${url}`;
    return url;
  }

  handleImageError(event: any) {
    event.target.src = '/study_desk.png';
  }

  parseBoxes(capture: AdminCaptureItem): DetectedObjectBox[] {
    if (!capture || !capture.detectedObjectsJson) return [];
    try {
      const raw = JSON.parse(capture.detectedObjectsJson);
      if (!Array.isArray(raw)) return [];
      return raw.map((item: any, idx: number) => {
        let top = 0, left = 0, width = 20, height = 15;
        
        if (item.topPercent != null && item.leftPercent != null) {
          top = Number(item.topPercent);
          left = Number(item.leftPercent);
          width = Number(item.widthPercent || 20);
          height = Number(item.heightPercent || 10);
        } else if (item.box && typeof item.box === 'object' && !Array.isArray(item.box)) {
          top = Number(item.box.top || 0);
          left = Number(item.box.left || 0);
          width = Number(item.box.width || 20);
          height = Number(item.box.height || 10);
        } else if (Array.isArray(item.box) && item.box.length === 4) {
          let [y1, x1, y2, x2] = item.box;
          if (y1 <= 1 && y2 <= 1 && x1 <= 1 && x2 <= 1) {
            top = y1 * 100;
            left = x1 * 100;
            width = (x2 - x1) * 100;
            height = (y2 - y1) * 100;
          } else {
            top = 20 + (idx * 15) % 60;
            left = 15 + (idx * 20) % 60;
            width = 25;
            height = 18;
          }
        } else {
          top = 15 + (idx * 14) % 60;
          left = 12 + (idx * 22) % 65;
          width = 22;
          height = 14;
        }

        return {
          id: item.id || `box-${idx}`,
          word: item.word || item.label || 'Vật thể',
          ipa: item.ipa || '',
          vietnamese: item.vietnamese || item.meaning || 'Đồ vật đời sống',
          partOfSpeech: item.partOfSpeech || 'noun',
          level: item.level || 'A2',
          topPercent: Math.max(2, Math.min(top, 85)),
          leftPercent: Math.max(2, Math.min(left, 85)),
          widthPercent: Math.max(8, Math.min(width, 70)),
          heightPercent: Math.max(6, Math.min(height, 50)),
          confidence: item.confidence || 0.88,
          exampleEn: item.exampleEn || `I see a ${item.word || 'object'} in my room.`,
          exampleVi: item.exampleVi || `Tôi nhìn thấy một ${item.vietnamese || item.meaning || 'vật'} trong phòng.`,
          collocation: item.collocation || '',
          collocationVi: item.collocationVi || ''
        };
      });
    } catch (e) {
      console.warn('Lỗi phân tích cú pháp Bounding Box:', e);
      return [];
    }
  }

  // --- Quản Lý Đấu Trường Thị Giác (Tab 4: Thêm, Sửa, Xóa, Đăng tuần) ---
  arenaModalOpen = signal(false);
  arenaModalMode = signal<'create' | 'edit'>('create');
  editingStageId = signal<string | null>(null);

  stageFormTitle = '';
  stageFormSubtitle = '';
  stageFormCategory = 'Đời Sống Gia Đình';
  stageFormImageUrl = '/kitchen_refrigerator.png';
  stageFormWords: (ContextWord & { selected?: boolean; showCoords?: boolean })[] = [];

  deleteStageModalOpen = signal(false);
  stageToDelete = signal<QuizStage | null>(null);

  // Thư viện AI Vision Picker Modal
  aiVisionPickerOpen = signal(false);
  aiVisionPickerSearch = signal('');

  // Tải ảnh từ máy tính & Quét AI
  selectedUploadFile: File | null = null;
  aiScanning = signal(false);
  hoveredWordIndex = signal<number | null>(null);

  // Tương tác Bounding Box trực tiếp trên ảnh (Kéo di chuyển, co giãn, vẽ mới)
  activeDragMode: 'none' | 'move' | 'resize' | 'draw' = 'none';
  activeDragIndex: number | null = null;
  dragStartClientX = 0;
  dragStartClientY = 0;
  dragInitialLeft = 0;
  dragInitialTop = 0;
  dragInitialWidth = 0;
  dragInitialHeight = 0;
  dragContainerWidth = 1;
  dragContainerHeight = 1;
  dragContainerLeft = 0;
  dragContainerTop = 0;

  drawingBox: { leftPercent: number; topPercent: number; widthPercent: number; heightPercent: number } | null = null;

  // Chọn từ kho từ điển CEFR Picker
  cefrPickerOpen = signal(false);
  cefrPickerSearch = signal('');

  // Computed: Lọc danh sách bối cảnh thư viện AI Vision
  filteredLibraryCaptures = computed(() => {
    const list = this.captures();
    const q = this.aiVisionPickerSearch().toLowerCase().trim();
    if (!q) return list;
    return list.filter(c => 
      (c.sceneTheme && c.sceneTheme.toLowerCase().includes(q)) ||
      (c.userName && c.userName.toLowerCase().includes(q)) ||
      (c.objectLabels && c.objectLabels.some(l => l.toLowerCase().includes(q)))
    );
  });

  // Computed: Lọc từ vựng từ kho CEFR
  filteredCefrWords = computed(() => {
    const list = this.words();
    const q = this.cefrPickerSearch().toLowerCase().trim();
    if (!q) return list.slice(0, 30);
    return list.filter(w => 
      w.word.toLowerCase().includes(q) ||
      (w.vietnameseMeaning && w.vietnameseMeaning.toLowerCase().includes(q)) ||
      (w.cefrLevel && w.cefrLevel.toLowerCase().includes(q))
    ).slice(0, 30);
  });

  get selectedWordsCount(): number {
    return this.stageFormWords.filter(w => w.selected !== false).length;
  }

  openCreateStageModal() {
    this.arenaModalMode.set('create');
    this.editingStageId.set(null);
    this.selectedUploadFile = null;
    this.stageFormTitle = '';
    this.stageFormSubtitle = '';
    this.stageFormCategory = 'Đời Sống Gia Đình';
    this.stageFormImageUrl = '/kitchen_refrigerator.png';
    this.stageFormWords = [
      {
        id: 'w-' + Date.now() + '-1',
        word: 'refrigerator',
        ipa: '/rɪˈfrɪdʒəreɪtər/',
        vietnamese: 'tủ lạnh',
        partOfSpeech: 'noun',
        level: 'A2',
        colorBg: 'bg-[#F7D147]',
        colorBorder: 'border-amber-400',
        colorText: 'text-amber-900',
        exampleEn: 'The refrigerator keeps food cold and fresh.',
        exampleVi: 'Tủ lạnh giữ thức ăn lạnh và tươi ngon.',
        topPercent: 24,
        leftPercent: 6,
        widthPercent: 32,
        heightPercent: 68,
        selected: true,
        showCoords: false
      },
      {
        id: 'w-' + Date.now() + '-2',
        word: 'microwave',
        ipa: '/ˈmaɪkrəweɪv/',
        vietnamese: 'lò vi sóng',
        partOfSpeech: 'noun',
        level: 'A2',
        colorBg: 'bg-[#98D8AA]',
        colorBorder: 'border-emerald-400',
        colorText: 'text-emerald-950',
        exampleEn: 'Heat the soup in the microwave.',
        exampleVi: 'Làm nóng món súp bằng lò vi sóng.',
        topPercent: 20,
        leftPercent: 44,
        widthPercent: 18,
        heightPercent: 16,
        selected: true,
        showCoords: false
      }
    ];
    this.arenaModalOpen.set(true);
  }

  openEditStageModal(stage: QuizStage) {
    this.arenaModalMode.set('edit');
    this.editingStageId.set(stage.id);
    this.selectedUploadFile = null;
    this.stageFormTitle = stage.title;
    this.stageFormSubtitle = stage.subtitle;
    this.stageFormCategory = stage.category;
    this.stageFormImageUrl = stage.imageUrl;
    this.stageFormWords = (stage.words || []).map(w => ({
      ...w,
      selected: true,
      showCoords: false
    }));
    this.arenaModalOpen.set(true);
  }

  // Mở popup chọn bối cảnh AI Vision
  openAiVisionLibraryPicker() {
    this.aiVisionPickerSearch.set('');
    if (this.captures().length === 0) {
      this.loadCaptures(0);
    }
    this.aiVisionPickerOpen.set(true);
  }

  // Chọn 1 bối cảnh từ thư viện AI Vision
  selectCaptureForStage(capture: AdminCaptureItem) {
    this.aiVisionPickerOpen.set(false);
    this.stageFormTitle = capture.sceneTheme || this.stageFormTitle || 'Bối cảnh đấu trường mới';
    this.stageFormSubtitle = `Bối cảnh thi đấu tuần • Đóng góp bởi ${capture.userName || 'Học viên'}`;
    this.stageFormCategory = this.mapThemeToCategory(capture.sceneTheme);
    this.stageFormImageUrl = this.getImageUrl(capture.imageUrl);
    this.selectedUploadFile = null;

    const boxes = this.parseBoxes(capture);
    this.stageFormWords = boxes.map((b, idx) => ({
      id: b.id || `w-cap-${idx}-${Date.now()}`,
      word: b.word,
      ipa: b.ipa || '',
      vietnamese: b.vietnamese || '',
      partOfSpeech: b.partOfSpeech || 'noun',
      level: b.level || 'A2',
      colorBg: 'bg-[#FAF8F5]',
      colorBorder: 'border-[#E5DED3]',
      colorText: 'text-[#2D2823]',
      exampleEn: b.exampleEn || `I can see a ${b.word} in this space.`,
      exampleVi: b.exampleVi || `Tôi có thể nhìn thấy một ${b.vietnamese || b.word} ở đây.`,
      topPercent: b.topPercent ?? 20,
      leftPercent: b.leftPercent ?? 20,
      widthPercent: b.widthPercent ?? 25,
      heightPercent: b.heightPercent ?? 20,
      selected: true,
      showCoords: false
    }));
    this.toast.success(`Đã nạp bối cảnh "${capture.sceneTheme}" và ${boxes.length} đồ vật từ AI Vision!`);
  }

  // Tạo đấu trường trực tiếp từ thẻ ảnh ở Tab 5
  createStageFromCapture(capture: AdminCaptureItem) {
    if (this.showVisionModal()) {
      this.closeVisionModal();
    }
    this.selectTab('arenas');
    this.arenaModalMode.set('create');
    this.editingStageId.set(null);
    this.selectCaptureForStage(capture);
    this.arenaModalOpen.set(true);
  }

  mapThemeToCategory(theme: string = ''): string {
    const t = theme.toLowerCase();
    if (t.includes('bếp') || t.includes('kitchen') || t.includes('nhà') || t.includes('phòng khách') || t.includes('gia đình')) {
      return 'Đời Sống Gia Đình';
    }
    if (t.includes('học') || t.includes('desk') || t.includes('việc') || t.includes('công sở') || t.includes('văn phòng')) {
      return 'Học Tập & Công Việc';
    }
    if (t.includes('nội thất') || t.includes('phòng ngủ') || t.includes('tiện nghi')) {
      return 'Nội Thất & Tiện Nghi';
    }
    if (t.includes('ẩm thực') || t.includes('ăn') || t.includes('nhà hàng') || t.includes('cafe')) {
      return 'Ẩm Thực & Tiếp Đãi';
    }
    if (t.includes('đô thị') || t.includes('đường') || t.includes('phố')) {
      return 'Không Gian Đô Thị';
    }
    return 'Đời Sống Gia Đình';
  }

  // Tải ảnh từ máy tính
  onUploadArenaImage(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toast.error('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP)!');
      return;
    }
    this.selectedUploadFile = file;
    // Xóa danh sách vật thể cũ để chuẩn bị cho ảnh mới
    this.stageFormWords = [];
    if (!this.stageFormTitle) {
      this.stageFormTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.stageFormImageUrl = reader.result as string;
      this.toast.info('Đang gửi ảnh sang AI Vision để tự động nhận diện đồ vật...');
      // Tự động kích hoạt AI Vision quét ngay lập tức
      setTimeout(() => {
        this.scanUploadedImageWithYolo();
      }, 200);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  dataUrlToFile(dataUrl: string, filename: string): File | null {
    try {
      const arr = dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    } catch (e) {
      console.warn('Lỗi chuyển đổi dataUrl sang File:', e);
      return null;
    }
  }

  // Quét nhận diện tự động bằng YOLO-World v2 (quét toàn cảnh 1022 từ vựng)
  scanUploadedImageWithYolo() {
    let fileToScan = this.selectedUploadFile;
    if (!fileToScan && this.stageFormImageUrl && this.stageFormImageUrl.startsWith('data:image/')) {
      fileToScan = this.dataUrlToFile(this.stageFormImageUrl, 'uploaded_arena_image.jpg');
    }

    if (!fileToScan) {
      this.toast.warning('Vui lòng tải ảnh từ máy tính trước khi quét AI!');
      return;
    }

    this.aiScanning.set(true);
    // Sử dụng 'all' để AI mở khóa toàn bộ 1022 lớp từ vựng (nhà, cây, xe cộ, đồ đạc, phòng ốc...)
    // Ngưỡng tin cậy 0.08 để nhận diện nhạy bén cả ảnh chụp thực tế và tranh vẽ minh họa
    this.userStudyService.detectRealObjectsWithYolo(
      fileToScan, 
      'all',
      0.08
    ).subscribe({
      next: (res: any) => {
        this.aiScanning.set(false);
        const objects = res.detectedObjects || res.words || [];
        if (!Array.isArray(objects) || objects.length === 0) {
          this.toast.warning('AI Vision không nhận diện được vật thể rõ nét nào trong ảnh này. Bạn có thể bấm "+ Kho CEFR" hoặc "+ Thêm thủ công"!');
          return;
        }

        if (res.autoScene?.theme_name_vi || res.scene) {
          const detectedTheme = res.autoScene?.theme_name_vi || res.scene;
          if (!this.stageFormTitle || this.stageFormTitle === 'Bối cảnh đấu trường mới') {
            this.stageFormTitle = detectedTheme;
          }
          this.stageFormCategory = this.mapThemeToCategory(detectedTheme);
        }

        this.stageFormWords = objects.map((obj: any, idx: number) => ({
          id: obj.id || `w-ai-${idx}-${Date.now()}`,
          word: obj.word || obj.label || 'object',
          ipa: obj.ipa || '',
          vietnamese: obj.vietnamese || obj.meaning || 'Đồ vật',
          partOfSpeech: obj.partOfSpeech || 'noun',
          level: obj.level || 'A2',
          colorBg: obj.colorBg || 'bg-[#FAF8F5]',
          colorBorder: obj.colorBorder || 'border-[#E5DED3]',
          colorText: obj.colorText || 'text-[#2D2823]',
          exampleEn: obj.exampleEn || `I can see a ${obj.word} here.`,
          exampleVi: obj.exampleVi || `Tôi có thể thấy một ${obj.vietnamese || obj.word} ở đây.`,
          topPercent: Math.max(2, Math.min(Number(obj.topPercent ?? 20), 85)),
          leftPercent: Math.max(2, Math.min(Number(obj.leftPercent ?? 20), 85)),
          widthPercent: Math.max(8, Math.min(Number(obj.widthPercent ?? 25), 70)),
          heightPercent: Math.max(6, Math.min(Number(obj.heightPercent ?? 20), 50)),
          selected: true,
          showCoords: false
        }));
        this.toast.success(`YOLO-World v2 đã quét và tự động nhận diện ${this.stageFormWords.length} đồ vật!`);
      },
      error: (err: any) => {
        this.aiScanning.set(false);
        console.warn('Lỗi gọi YOLO-World service:', err);
        this.toast.warning('Máy chủ AI Vision (port 8001) đang bận hoặc offline. Bạn vẫn có thể thêm đồ vật từ kho CEFR!');
      }
    });
  }

  toggleAllWords(select: boolean) {
    this.stageFormWords.forEach(w => w.selected = select);
  }

  openCefrPicker() {
    this.cefrPickerSearch.set('');
    this.cefrPickerOpen.set(true);
  }

  addWordFromCefr(wordItem: AdminWordItem) {
    const id = 'w-cefr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    this.stageFormWords.push({
      id,
      word: wordItem.word,
      ipa: wordItem.phoneticIpa || '',
      vietnamese: wordItem.vietnameseMeaning || '',
      partOfSpeech: wordItem.partOfSpeech?.toLowerCase() || 'noun',
      level: wordItem.cefrLevel || 'A2',
      colorBg: 'bg-[#FAF8F5]',
      colorBorder: 'border-[#E5DED3]',
      colorText: 'text-[#2D2823]',
      exampleEn: wordItem.exampleSentenceEn || `I see a ${wordItem.word}.`,
      exampleVi: wordItem.exampleSentenceVi || `Tôi thấy một ${wordItem.vietnameseMeaning || wordItem.word}.`,
      topPercent: 30,
      leftPercent: 30,
      widthPercent: 25,
      heightPercent: 20,
      selected: true,
      showCoords: false
    });
    this.cefrPickerOpen.set(false);
    this.toast.success(`Đã thêm từ "${wordItem.word}" (${wordItem.vietnameseMeaning}) vào đấu trường!`);
  }

  addWordToStageForm() {
    const id = 'w-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    this.stageFormWords.push({
      id,
      word: '',
      ipa: '',
      vietnamese: '',
      partOfSpeech: 'noun',
      level: 'A2',
      colorBg: 'bg-[#FAF8F5]',
      colorBorder: 'border-[#E5DED3]',
      colorText: 'text-[#2D2823]',
      exampleEn: 'This is an object in the room.',
      exampleVi: 'Đây là một đồ vật trong bối cảnh.',
      topPercent: 20,
      leftPercent: 20,
      widthPercent: 25,
      heightPercent: 20,
      selected: true,
      showCoords: false
    });
  }

  removeWordFromStageForm(index: number) {
    if (index >= 0 && index < this.stageFormWords.length) {
      this.stageFormWords.splice(index, 1);
    }
  }

  // --- Tương tác Bounding Box trực tiếp trên ảnh (Kéo di chuyển, co giãn, vẽ mới) ---
  startMoveBox(event: MouseEvent, index: number, container: HTMLElement) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const word = this.stageFormWords[index];
    if (!word || word.selected === false) return;

    const rect = container.getBoundingClientRect();
    this.dragContainerWidth = rect.width;
    this.dragContainerHeight = rect.height;
    this.dragContainerLeft = rect.left;
    this.dragContainerTop = rect.top;

    this.activeDragMode = 'move';
    this.activeDragIndex = index;
    this.dragStartClientX = event.clientX;
    this.dragStartClientY = event.clientY;
    this.dragInitialLeft = Number(word.leftPercent ?? 20);
    this.dragInitialTop = Number(word.topPercent ?? 20);
    this.dragInitialWidth = Number(word.widthPercent ?? 20);
    this.dragInitialHeight = Number(word.heightPercent ?? 15);
    this.hoveredWordIndex.set(index);
  }

  startResizeBox(event: MouseEvent, index: number, container: HTMLElement) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const word = this.stageFormWords[index];
    if (!word || word.selected === false) return;

    const rect = container.getBoundingClientRect();
    this.dragContainerWidth = rect.width;
    this.dragContainerHeight = rect.height;
    this.dragContainerLeft = rect.left;
    this.dragContainerTop = rect.top;

    this.activeDragMode = 'resize';
    this.activeDragIndex = index;
    this.dragStartClientX = event.clientX;
    this.dragStartClientY = event.clientY;
    this.dragInitialLeft = Number(word.leftPercent ?? 20);
    this.dragInitialTop = Number(word.topPercent ?? 20);
    this.dragInitialWidth = Number(word.widthPercent ?? 20);
    this.dragInitialHeight = Number(word.heightPercent ?? 15);
    this.hoveredWordIndex.set(index);
  }

  onCanvasMouseDown(event: MouseEvent, container: HTMLElement) {
    if (event.button !== 0) return;
    if (this.activeDragMode !== 'none') return;

    const rect = container.getBoundingClientRect();
    this.dragContainerWidth = rect.width;
    this.dragContainerHeight = rect.height;
    this.dragContainerLeft = rect.left;
    this.dragContainerTop = rect.top;

    this.activeDragMode = 'draw';
    this.activeDragIndex = null;
    this.dragStartClientX = event.clientX;
    this.dragStartClientY = event.clientY;

    const startCanvasX = Math.max(0, Math.min(event.clientX - rect.left, rect.width));
    const startCanvasY = Math.max(0, Math.min(event.clientY - rect.top, rect.height));

    this.drawingBox = {
      leftPercent: Math.round((startCanvasX / rect.width) * 1000) / 10,
      topPercent: Math.round((startCanvasY / rect.height) * 1000) / 10,
      widthPercent: 0,
      heightPercent: 0
    };
  }

  @HostListener('window:mousemove', ['$event'])
  onGlobalMouseMove(event: MouseEvent) {
    if (this.activeDragMode === 'none') return;

    const deltaX = event.clientX - this.dragStartClientX;
    const deltaY = event.clientY - this.dragStartClientY;
    const deltaXPct = (deltaX / this.dragContainerWidth) * 100;
    const deltaYPct = (deltaY / this.dragContainerHeight) * 100;

    if (this.activeDragMode === 'move' && this.activeDragIndex !== null) {
      const word = this.stageFormWords[this.activeDragIndex];
      if (word) {
        const wWidth = Number(word.widthPercent ?? 20);
        const wHeight = Number(word.heightPercent ?? 15);
        const maxLeft = 100 - wWidth;
        const maxTop = 100 - wHeight;
        const newLeft = Math.max(0, Math.min(this.dragInitialLeft + deltaXPct, maxLeft));
        const newTop = Math.max(0, Math.min(this.dragInitialTop + deltaYPct, maxTop));
        word.leftPercent = Math.round(newLeft * 10) / 10;
        word.topPercent = Math.round(newTop * 10) / 10;
      }
    } else if (this.activeDragMode === 'resize' && this.activeDragIndex !== null) {
      const word = this.stageFormWords[this.activeDragIndex];
      if (word) {
        const wLeft = Number(word.leftPercent ?? 0);
        const wTop = Number(word.topPercent ?? 0);
        const maxWidth = 100 - wLeft;
        const maxHeight = 100 - wTop;
        const newWidth = Math.max(4, Math.min(this.dragInitialWidth + deltaXPct, maxWidth));
        const newHeight = Math.max(4, Math.min(this.dragInitialHeight + deltaYPct, maxHeight));
        word.widthPercent = Math.round(newWidth * 10) / 10;
        word.heightPercent = Math.round(newHeight * 10) / 10;
      }
    } else if (this.activeDragMode === 'draw') {
      const startCanvasX = Math.max(0, Math.min(this.dragStartClientX - this.dragContainerLeft, this.dragContainerWidth));
      const startCanvasY = Math.max(0, Math.min(this.dragStartClientY - this.dragContainerTop, this.dragContainerHeight));
      const currentCanvasX = Math.max(0, Math.min(event.clientX - this.dragContainerLeft, this.dragContainerWidth));
      const currentCanvasY = Math.max(0, Math.min(event.clientY - this.dragContainerTop, this.dragContainerHeight));

      const boxX = Math.min(startCanvasX, currentCanvasX);
      const boxY = Math.min(startCanvasY, currentCanvasY);
      const boxW = Math.abs(currentCanvasX - startCanvasX);
      const boxH = Math.abs(currentCanvasY - startCanvasY);

      this.drawingBox = {
        leftPercent: Math.round((boxX / this.dragContainerWidth) * 1000) / 10,
        topPercent: Math.round((boxY / this.dragContainerHeight) * 1000) / 10,
        widthPercent: Math.round((boxW / this.dragContainerWidth) * 1000) / 10,
        heightPercent: Math.round((boxH / this.dragContainerHeight) * 1000) / 10
      };
    }
  }

  @HostListener('window:mouseup', ['$event'])
  onGlobalMouseUp(event: MouseEvent) {
    if (this.activeDragMode === 'none') return;

    if (this.activeDragMode === 'draw' && this.drawingBox) {
      if (this.drawingBox.widthPercent >= 3 && this.drawingBox.heightPercent >= 3) {
        const id = 'w-draw-' + Date.now();
        const newWord: (ContextWord & { selected?: boolean; showCoords?: boolean }) = {
          id,
          word: '',
          ipa: '',
          vietnamese: '',
          partOfSpeech: 'noun',
          level: 'A2',
          colorBg: 'bg-[#FAF8F5]',
          colorBorder: 'border-[#E5DED3]',
          colorText: 'text-[#2D2823]',
          exampleEn: '',
          exampleVi: '',
          topPercent: this.drawingBox.topPercent,
          leftPercent: this.drawingBox.leftPercent,
          widthPercent: this.drawingBox.widthPercent,
          heightPercent: this.drawingBox.heightPercent,
          selected: true,
          showCoords: true
        };
        this.stageFormWords.push(newWord);
        const newIdx = this.stageFormWords.length - 1;
        this.hoveredWordIndex.set(newIdx);
        this.toast.success(`Đã tạo khung vật thể mới [${this.drawingBox.widthPercent}% × ${this.drawingBox.heightPercent}%]! Hãy nhập từ vựng tương ứng.`);
      }
      this.drawingBox = null;
    }

    this.activeDragMode = 'none';
    this.activeDragIndex = null;
  }

  saveStageForm() {
    if (!this.stageFormTitle.trim()) {
      this.toast.error('Vui lòng nhập tên đấu trường!');
      return;
    }
    const chosenWords = this.stageFormWords.filter(w => w.selected !== false);
    if (chosenWords.length === 0) {
      this.toast.error('Vui lòng tick chọn ít nhất 1 đồ vật để đưa vào bài thi đấu trường!');
      return;
    }

    for (const w of chosenWords) {
      if (!w.word?.trim()) {
        this.toast.error('Có từ vựng chưa điền tên tiếng Anh!');
        return;
      }
      if (!w.vietnamese?.trim()) {
        this.toast.error(`Vui lòng điền nghĩa tiếng Việt cho từ "${w.word}"!`);
        return;
      }
    }

    if (this.arenaModalMode() === 'create') {
      this.quizStageService.createStage({
        title: this.stageFormTitle,
        subtitle: this.stageFormSubtitle,
        category: this.stageFormCategory,
        imageUrl: this.stageFormImageUrl,
        words: chosenWords
      });
      this.arenaModalOpen.set(false);
    } else {
      const id = this.editingStageId();
      if (id) {
        this.quizStageService.updateStage(id, {
          title: this.stageFormTitle,
          subtitle: this.stageFormSubtitle,
          category: this.stageFormCategory,
          imageUrl: this.stageFormImageUrl,
          words: chosenWords
        });
        this.arenaModalOpen.set(false);
      }
    }
  }

  confirmDeleteStage(stage: QuizStage) {
    this.stageToDelete.set(stage);
    this.deleteStageModalOpen.set(true);
  }

  executeDeleteStage() {
    const target = this.stageToDelete();
    if (target) {
      this.quizStageService.deleteStage(target.id);
      this.deleteStageModalOpen.set(false);
      this.stageToDelete.set(null);
    }
  }

  setAsWeeklyStage(stage: QuizStage) {
    this.quizStageService.setWeeklyStage(stage.id);
  }

  togglePublish(stage: QuizStage) {
    this.quizStageService.togglePublishStage(stage.id);
  }
}

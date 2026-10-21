import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { UserStudyService } from '../../services/user-study.service';
import { ThemeService } from '../../services/theme.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, IconComponent, RouterLink, RouterLinkActive],
  host: {
    class: 'w-full block'
  },
  template: `
    <!-- Header: Modern 3-Column Layout with Floating Island Navigation -->
    <header 
      class="fixed top-0 left-0 right-0 w-full z-50 backdrop-blur-md transition-colors duration-200 border-b border-[#EAE4D9]/80"
      style="background-color: rgba(251, 250, 246, 0.94); box-shadow: 0 2px 10px -2px rgba(125, 104, 83, 0.05);"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
        <div class="flex items-center justify-between gap-3 sm:gap-6">
          
          <!-- BRAND LOGO & WORDMARK -->
          <a 
            (click)="onBrandClick(); $event.preventDefault()"
            href="#"
            class="flex items-center gap-2.5 no-underline select-none group shrink-0"
          >
            <div class="w-8 h-8 rounded-[6px] bg-[#7D6853] text-white flex items-center justify-center font-serif font-bold text-base shadow-2xs select-none">
              V
            </div>
            <span class="text-xl font-serif font-bold tracking-tight leading-none text-[#2D2823]">
              Vocario
            </span>
          </a>

          <!-- GUEST NAVIGATION (Khi CHƯA Đăng Nhập - Chuẩn Figma) -->
          <nav *ngIf="!api.currentUser()" class="hidden md:flex items-center gap-6 sm:gap-8 text-xs sm:text-sm font-medium">
            <a 
              (click)="onTabClick('features'); $event.preventDefault()" 
              href="#features" 
              class="text-[#746B60] hover:text-[#29251F] transition-colors no-underline cursor-pointer"
            >
              Phương pháp
            </a>
            <a 
              (click)="onTabClick('studio'); $event.preventDefault()" 
              href="#studio" 
              class="text-[#746B60] hover:text-[#29251F] transition-colors no-underline cursor-pointer"
            >
              Tính năng
            </a>
            <a 
              (click)="onTabClick('story'); $event.preventDefault()" 
              href="#story" 
              class="text-[#746B60] hover:text-[#29251F] transition-colors no-underline cursor-pointer"
            >
              Câu chuyện người học
            </a>
          </nav>

          <!-- DESKTOP NAVIGATION (Khi ĐÃ Đăng Nhập - Chuẩn Figma Thiết Kế Mới) -->
          <nav *ngIf="api.currentUser()" class="hidden md:flex items-center gap-6 lg:gap-8 text-sm">
            <!-- 1. Trang chủ -->
            <a 
              routerLink="/home"
              routerLinkActive="border-b-2 border-[#7D6853] text-[#2D2823] font-bold"
              [routerLinkActiveOptions]="{exact: true}"
              (click)="closeAllDropdowns()"
              class="transition-colors pb-1 border-b-2 border-transparent text-[#5C5249] hover:text-[#2D2823] no-underline font-medium text-sm"
            >
              Trang chủ
            </a>

            <!-- 2. Thu nạp AI (Dropdown Popover) -->
            <div class="relative nav-dropdown-container">
              <button
                type="button"
                (click)="toggleDropdown('ai', $event)"
                class="transition-colors pb-1 border-b-2 flex items-center gap-1 cursor-pointer bg-transparent border-0 font-medium text-sm"
                [ngClass]="isAiActive() ? 'border-[#7D6853] text-[#2D2823] font-bold' : (activeDropdown === 'ai' ? 'border-[#7D6853] text-[#2D2823]' : 'border-transparent text-[#5C5249] hover:text-[#2D2823]')"
              >
                <span>Thu nạp AI</span>
                <app-icon name="chevron-down" [size]="12" svgClass="text-[#746B60] transition-transform duration-200" [class.rotate-180]="activeDropdown === 'ai'"></app-icon>
              </button>

              <!-- Popover Thu nạp AI -->
              <div 
                *ngIf="activeDropdown === 'ai'"
                (click)="$event.stopPropagation()"
                class="absolute left-0 top-full mt-2 w-80 rounded-2xl bg-white border border-[#E5DED3] shadow-xl p-2 z-50 animate-fade-in space-y-1"
              >
                <!-- Quét vật thể camera -->
                <a 
                  routerLink="/scanner"
                  (click)="closeAllDropdowns()"
                  class="flex items-start gap-3 p-3 rounded-xl hover:bg-[#FAF8F5] transition-colors cursor-pointer no-underline group"
                >
                  <app-icon name="camera" [size]="18" svgClass="text-[#746B60] group-hover:text-[#2D2823] mt-0.5 shrink-0"></app-icon>
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-[#2D2823] group-hover:text-[#7D6853] leading-snug">
                      Quét vật thể camera
                    </div>
                    <div class="text-xs text-[#746B60] leading-tight mt-0.5">
                      Nhận diện vật thể đời thực
                    </div>
                  </div>
                </a>

                <!-- Trích xuất văn bản -->
                <a 
                  routerLink="/text-extractor"
                  (click)="closeAllDropdowns()"
                  class="flex items-start gap-3 p-3 rounded-xl hover:bg-[#FAF8F5] transition-colors cursor-pointer no-underline group"
                >
                  <app-icon name="scan-text" [size]="18" svgClass="text-[#746B60] group-hover:text-[#2D2823] mt-0.5 shrink-0"></app-icon>
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-[#2D2823] group-hover:text-[#7D6853] leading-snug">
                      Trích xuất văn bản
                    </div>
                    <div class="text-xs text-[#746B60] leading-tight mt-0.5">
                      Đọc tài liệu và hình ảnh
                    </div>
                  </div>
                </a>
              </div>
            </div>

            <!-- 3. Kho từ vựng (Dropdown Popover) -->
            <div class="relative nav-dropdown-container">
              <button
                type="button"
                (click)="toggleDropdown('vocab', $event)"
                class="transition-colors pb-1 border-b-2 flex items-center gap-1 cursor-pointer bg-transparent border-0 font-medium text-sm"
                [ngClass]="isVocabActive() ? 'border-[#7D6853] text-[#2D2823] font-bold' : (activeDropdown === 'vocab' ? 'border-[#7D6853] text-[#2D2823]' : 'border-transparent text-[#5C5249] hover:text-[#2D2823]')"
              >
                <span>Kho từ vựng</span>
                <app-icon name="chevron-down" [size]="12" svgClass="text-[#746B60] transition-transform duration-200" [class.rotate-180]="activeDropdown === 'vocab'"></app-icon>
              </button>

              <!-- Popover Kho từ vựng -->
              <div 
                *ngIf="activeDropdown === 'vocab'"
                (click)="$event.stopPropagation()"
                class="absolute left-0 top-full mt-2 w-80 rounded-2xl bg-white border border-[#E5DED3] shadow-xl p-2 z-50 animate-fade-in space-y-1"
              >
                <!-- Sổ từ vựng & Flashcard -->
                <a 
                  routerLink="/flashcards"
                  (click)="closeAllDropdowns()"
                  class="flex items-start gap-3 p-3 rounded-xl hover:bg-[#FAF8F5] transition-colors cursor-pointer no-underline group"
                >
                  <app-icon name="tablet" [size]="18" svgClass="text-[#746B60] group-hover:text-[#2D2823] mt-0.5 shrink-0"></app-icon>
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-[#2D2823] group-hover:text-[#7D6853] leading-snug">
                      Sổ từ vựng & Flashcard
                    </div>
                    <div class="text-xs text-[#746B60] leading-tight mt-0.5">
                      Bàn học lặp lại ngắt quãng SM-2
                    </div>
                  </div>
                </a>

                <!-- Bộ sưu tập bối cảnh -->
                <a 
                  routerLink="/collection"
                  (click)="closeAllDropdowns()"
                  class="flex items-start gap-3 p-3 rounded-xl hover:bg-[#FAF8F5] transition-colors cursor-pointer no-underline group"
                >
                  <app-icon name="image" [size]="18" svgClass="text-[#746B60] group-hover:text-[#2D2823] mt-0.5 shrink-0"></app-icon>
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-[#2D2823] group-hover:text-[#7D6853] leading-snug">
                      Bộ sưu tập bối cảnh
                    </div>
                    <div class="text-xs text-[#746B60] leading-tight mt-0.5">
                      Kho ảnh và từ vựng theo không gian
                    </div>
                  </div>
                </a>
              </div>
            </div>

            <!-- 4. Đấu trường (Dropdown Popover) -->
            <div class="relative nav-dropdown-container">
              <button
                type="button"
                (click)="toggleDropdown('arena', $event)"
                class="transition-colors pb-1 border-b-2 flex items-center gap-1 cursor-pointer bg-transparent border-0 font-medium text-sm"
                [ngClass]="isArenaActive() ? 'border-[#7D6853] text-[#2D2823] font-bold' : (activeDropdown === 'arena' ? 'border-[#7D6853] text-[#2D2823]' : 'border-transparent text-[#5C5249] hover:text-[#2D2823]')"
              >
                <span>Đấu trường</span>
                <app-icon name="chevron-down" [size]="12" svgClass="text-[#746B60] transition-transform duration-200" [class.rotate-180]="activeDropdown === 'arena'"></app-icon>
              </button>

              <!-- Popover Đấu trường -->
              <div 
                *ngIf="activeDropdown === 'arena'"
                (click)="$event.stopPropagation()"
                class="absolute left-0 top-full mt-2 w-80 rounded-2xl bg-white border border-[#E5DED3] shadow-xl p-2 z-50 animate-fade-in space-y-1"
              >
                <!-- Thử thách phản xạ ảnh thật -->
                <a 
                  routerLink="/quiz"
                  (click)="closeAllDropdowns()"
                  class="flex items-start justify-between gap-3 p-3 rounded-xl hover:bg-[#FAF8F5] transition-colors cursor-pointer no-underline group"
                >
                  <div class="flex items-start gap-3 min-w-0">
                    <app-icon name="crosshair" [size]="18" svgClass="text-[#746B60] group-hover:text-[#2D2823] mt-0.5 shrink-0"></app-icon>
                    <div class="min-w-0">
                      <div class="text-sm font-semibold text-[#2D2823] group-hover:text-[#7D6853] leading-snug">
                        Thử thách phản xạ ảnh thật
                      </div>
                      <div class="text-xs text-[#746B60] leading-tight mt-0.5">
                        60s Blitz và thử thách theo cảnh
                      </div>
                    </div>
                  </div>
                  <app-icon name="arrow-right" [size]="14" svgClass="text-[#A39A8F] group-hover:text-[#2D2823] shrink-0 self-center"></app-icon>
                </a>

                <!-- Bảng vinh danh học viên -->
                <a 
                  routerLink="/leaderboard"
                  (click)="closeAllDropdowns()"
                  class="flex items-start gap-3 p-3 rounded-xl hover:bg-[#FAF8F5] transition-colors cursor-pointer no-underline group"
                >
                  <app-icon name="trophy" [size]="18" svgClass="text-[#746B60] group-hover:text-[#2D2823] mt-0.5 shrink-0"></app-icon>
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-[#2D2823] group-hover:text-[#7D6853] leading-snug">
                      Bảng vinh danh học viên
                    </div>
                    <div class="text-xs text-[#746B60] leading-tight mt-0.5">
                      Thành tích và kỷ luật học tập
                    </div>
                  </div>
                </a>
              </div>
            </div>

            <!-- 5. Lớp học -->
            <a 
              routerLink="/classrooms"
              routerLinkActive="border-b-2 border-[#7D6853] text-[#2D2823] font-bold"
              (click)="closeAllDropdowns()"
              class="transition-colors pb-1 border-b-2 border-transparent text-[#5C5249] hover:text-[#2D2823] no-underline font-medium text-sm"
            >
              Lớp học
            </a>
          </nav>

          <!-- RIGHT CONTROLS: STREAK + USER PROFILE + THEME -->
          <div class="flex items-center gap-3 sm:gap-4 shrink-0">

            <!-- Streak Counter Badge (Pill vàng nhạt + icon flame) -->
            <div 
              *ngIf="api.currentUser() as user"
              class="whitespace-nowrap hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF2E8] border border-[#F1E5D5] text-xs font-semibold text-[#7D6853]"
              [title]="'Chuỗi ' + (user.streakCount || 0) + ' ngày học liên tiếp!'"
            >
              <app-icon 
                name="flame" 
                [size]="15" 
                svgClass="text-[#C27933]"
              ></app-icon>
              <span>{{ user.streakCount || 0 }} ngày</span>
            </div>

            <!-- Nút Bật Sáng / Tối (Theme Mode Toggle) -->
            <button 
              type="button" 
              (click)="toggleTheme()"
              class="w-8 h-8 rounded-full hover:bg-[#FAF2E8] text-[#5C5249] hover:text-[#2D2823] flex items-center justify-center cursor-pointer transition-colors shrink-0"
              [title]="themeService.isDarkMode() ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'"
              aria-label="Chuyển chế độ sáng tối"
            >
              <app-icon *ngIf="!themeService.isDarkMode()" name="moon" [size]="16" svgClass="text-[#5C5249]"></app-icon>
              <app-icon *ngIf="themeService.isDarkMode()" name="sun" [size]="16" svgClass="text-amber-500"></app-icon>
            </button>

            <!-- User Chip & Dropdown Trigger (Pill Bo Tròn Chuẩn Screenshot 4) -->
            <div *ngIf="api.currentUser() as user" class="relative nav-dropdown-container">
              <button
                type="button"
                (click)="toggleDropdown('user', $event)"
                class="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-[#F5EFEB] hover:bg-[#EFE7DE] border border-[#EAE3D8] text-xs font-semibold text-[#29251F] cursor-pointer transition-all shadow-2xs group"
                [attr.aria-expanded]="activeDropdown === 'user'"
                aria-label="Menu tài khoản"
              >
                <!-- Circular Avatar -->
                <div 
                  class="w-6 h-6 rounded-full text-white flex items-center justify-center text-[11px] font-bold shrink-0 bg-[#7D6853]"
                >
                  {{ (user.username || 'U').charAt(0).toUpperCase() }}
                </div>
                
                <span class="max-w-[75px] sm:max-w-[100px] truncate font-medium text-xs text-[#29251F]">
                  {{ user.username }}
                </span>

                <span 
                  *ngIf="user.role === 'ADMIN'" 
                  class="px-1.5 py-0.5 rounded-full font-bold text-[9px] tracking-wider uppercase bg-[#EAE4D9] text-[#5C5249] shrink-0"
                >
                  ADMIN
                </span>

                <app-icon name="chevron-down" [size]="11" svgClass="text-[#746B60] transition-transform duration-200" [class.rotate-180]="activeDropdown === 'user'"></app-icon>
              </button>

              <!-- User Dropdown Menu Popover (Chuẩn Screenshot 4) -->
              <div 
                *ngIf="activeDropdown === 'user'"
                (click)="$event.stopPropagation()"
                class="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-white border border-[#E5DED3] shadow-xl p-4 z-50 animate-fade-in space-y-3"
              >
                <!-- 1. Header: Avatar lớn + Username + Email -->
                <div class="flex items-center gap-3">
                  <div 
                    class="w-11 h-11 rounded-full bg-[#EFEAE2] text-[#7D6853] flex items-center justify-center font-bold text-base shrink-0 select-none"
                  >
                    {{ (user.username || 'U').charAt(0).toUpperCase() }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-bold text-sm text-[#2D2823] truncate leading-tight m-0">
                      {{ user.username }}
                    </p>
                    <p class="text-xs text-[#8C827A] truncate mt-0.5 m-0 font-normal">
                      {{ user.email || (user.username + '@vocario.com') }}
                    </p>
                  </div>
                </div>

                <!-- Đường phân cách -->
                <div class="border-t border-[#EFEAE2]"></div>

                <!-- 2. Danh sách Menu Actions -->
                <div class="space-y-1">
                  <!-- Hồ sơ cá nhân -->
                  <a 
                    routerLink="/profile"
                    (click)="closeAllDropdowns()"
                    class="flex items-center justify-between p-2 rounded-xl hover:bg-[#FAF8F5] transition-colors cursor-pointer no-underline group"
                  >
                    <div class="flex items-center gap-2.5">
                      <app-icon name="user" [size]="16" svgClass="text-[#746B60] group-hover:text-[#2D2823]"></app-icon>
                      <span class="text-xs font-medium text-[#2D2823]">Hồ sơ cá nhân</span>
                    </div>
                    <app-icon name="arrow-right" [size]="13" svgClass="text-[#A39A8F] group-hover:text-[#2D2823]"></app-icon>
                  </a>

                  <!-- Cổng quản trị Admin (Dành riêng cho ADMIN) -->
                  <a 
                    *ngIf="user.role === 'ADMIN'"
                    routerLink="/admin"
                    (click)="closeAllDropdowns()"
                    class="flex items-center justify-between p-2 rounded-xl hover:bg-[#FAF8F5] transition-colors cursor-pointer no-underline group"
                  >
                    <div class="flex items-center gap-2.5">
                      <app-icon name="panel-admin" [size]="16" svgClass="text-[#746B60] group-hover:text-[#2D2823]"></app-icon>
                      <span class="text-xs font-medium text-[#2D2823]">Cổng quản trị Admin</span>
                    </div>
                    <app-icon name="arrow-right" [size]="13" svgClass="text-[#A39A8F] group-hover:text-[#2D2823]"></app-icon>
                  </a>
                </div>

                <!-- Đường phân cách -->
                <div class="border-t border-[#EFEAE2]"></div>

                <!-- 3. Đăng xuất -->
                <button 
                  type="button" 
                  (click)="handleLogout()"
                  class="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-rose-50 text-[#C05646] hover:text-rose-700 transition-colors cursor-pointer bg-transparent border-0 text-left"
                >
                  <app-icon name="logout" [size]="16" svgClass="text-[#C05646]"></app-icon>
                  <span class="text-xs font-medium">Đăng xuất</span>
                </button>
              </div>
            </div>

            <!-- Guest Action Controls (Đăng nhập, Trải nghiệm ngay) -->
            <ng-container *ngIf="!api.currentUser()">
              <button
                type="button"
                (click)="openAuth.emit('login')"
                class="text-xs font-medium text-[#746B60] hover:text-[#2D2823] bg-transparent border-0 cursor-pointer px-2.5 py-1.5 transition-colors"
              >
                Đăng nhập
              </button>

              <button
                type="button"
                (click)="openAuth.emit('login')"
                class="rounded-[4px] text-xs font-semibold px-4 py-2 transition-all duration-200 bg-[#7D6853] hover:bg-[#685542] text-white active:scale-95 cursor-pointer border-0 shadow-2xs"
              >
                Trải nghiệm ngay
              </button>
            </ng-container>

          </div>

        </div>

        <!-- Mobile User Navigation Bar (Chỉ hiện trên mobile khi đã đăng nhập: Chuẩn Route URL) -->
        <div *ngIf="api.currentUser()" class="md:hidden flex items-center justify-between gap-1.5 pt-2 pb-0.5 border-t border-[#EAE4D9]/60 overflow-x-auto no-scrollbar text-xs">
          <a 
            routerLink="/home"
            routerLinkActive="bg-[#7D6853] text-white"
            [routerLinkActiveOptions]="{exact: true}"
            class="whitespace-nowrap px-2.5 py-1.5 rounded-full font-heading font-bold border border-[#EAE4D9] cursor-pointer flex items-center gap-1 shadow-2xs no-underline text-[#5C5249] bg-white text-[11px]"
          >
            <app-icon name="home" [size]="12"></app-icon>
            <span>Trang Chủ</span>
          </a>
          <a 
            routerLink="/scanner"
            routerLinkActive="bg-[#7D6853] text-white"
            class="whitespace-nowrap px-2.5 py-1.5 rounded-full font-heading font-bold border border-[#EAE4D9] cursor-pointer flex items-center gap-1 shadow-2xs no-underline text-[#5C5249] bg-white text-[11px]"
          >
            <app-icon name="camera" [size]="12"></app-icon>
            <span>Quét AI</span>
          </a>
          <a 
            routerLink="/text-extractor"
            routerLinkActive="bg-[#7D6853] text-white"
            class="whitespace-nowrap px-2.5 py-1.5 rounded-full font-heading font-bold border border-[#EAE4D9] cursor-pointer flex items-center gap-1 shadow-2xs no-underline text-[#5C5249] bg-white text-[11px]"
          >
            <app-icon name="file-text" [size]="12"></app-icon>
            <span>Trích Xuất</span>
          </a>
          <a 
            routerLink="/classrooms"
            routerLinkActive="bg-[#7D6853] text-white"
            class="whitespace-nowrap px-2.5 py-1.5 rounded-full font-heading font-bold border border-[#EAE4D9] cursor-pointer flex items-center gap-1 shadow-2xs no-underline text-[#5C5249] bg-white text-[11px]"
          >
            <app-icon name="users" [size]="12"></app-icon>
            <span>Lớp Học</span>
          </a>
          <a 
            routerLink="/collection"
            routerLinkActive="bg-[#7D6853] text-white"
            class="whitespace-nowrap px-2.5 py-1.5 rounded-full font-heading font-bold border border-[#EAE4D9] cursor-pointer flex items-center gap-1 shadow-2xs no-underline text-[#5C5249] bg-white text-[11px]"
          >
            <app-icon name="collection" [size]="12"></app-icon>
            <span>Bộ Sưu Tập</span>
          </a>
          <a 
            routerLink="/flashcards"
            routerLinkActive="bg-[#7D6853] text-white"
            class="whitespace-nowrap px-2.5 py-1.5 rounded-full font-heading font-bold border border-[#EAE4D9] cursor-pointer flex items-center gap-1 shadow-2xs no-underline text-[#5C5249] bg-white text-[11px]"
          >
            <app-icon name="layers" [size]="12"></app-icon>
            <span>Sổ Từ Vựng</span>
          </a>
          <a 
            routerLink="/quiz"
            routerLinkActive="bg-[#7D6853] text-white"
            class="whitespace-nowrap px-2.5 py-1.5 rounded-full font-heading font-bold border border-[#EAE4D9] cursor-pointer flex items-center gap-1 shadow-2xs no-underline text-[#5C5249] bg-white text-[11px]"
          >
            <app-icon name="gamepad" [size]="12"></app-icon>
            <span>Quiz AI</span>
          </a>
          <a 
            routerLink="/leaderboard"
            routerLinkActive="bg-[#7D6853] text-white"
            class="whitespace-nowrap px-2.5 py-1.5 rounded-full font-heading font-bold border border-[#EAE4D9] cursor-pointer flex items-center gap-1 shadow-2xs no-underline text-[#5C5249] bg-white text-[11px]"
          >
            <app-icon name="trophy" [size]="12"></app-icon>
            <span>Xếp Hạng</span>
          </a>
          <a 
            *ngIf="api.currentUser()?.role === 'ADMIN'"
            routerLink="/admin"
            routerLinkActive="bg-amber-800 text-white"
            class="whitespace-nowrap px-2.5 py-1.5 rounded-full font-heading font-bold border border-amber-300 cursor-pointer flex items-center gap-1 shadow-2xs no-underline text-amber-900 bg-amber-100 text-[11px]"
          >
            <span>🛡️</span>
            <span>Admin</span>
          </a>
        </div>

      </div>
    </header>
    
    <!-- Spacer div to prevent content jump under fixed navbar -->
    <div class="w-full" [class.h-16]="!api.currentUser()" [class.h-26]="api.currentUser()" [class.md:h-16]="api.currentUser()"></div>
  `
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Input() activeTab = 'home';
  @Input() actionLabel = 'Tải App';
  @Output() tabChange = new EventEmitter<string>();
  @Output() actionClick = new EventEmitter<void>();
  @Output() openAuth = new EventEmitter<'login' | 'register'>();

  currentLang = 'EN';
  showLangMenu = false;
  activeDropdown: 'ai' | 'vocab' | 'arena' | 'user' | null = null;

  constructor(
    public api: ApiService,
    public studyService: UserStudyService,
    public themeService: ThemeService,
    private toast: ToastService,
    private router: Router
  ) {}

  toggleDropdown(dropdown: 'ai' | 'vocab' | 'arena' | 'user', event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.activeDropdown = this.activeDropdown === dropdown ? null : dropdown;
  }

  closeAllDropdowns() {
    this.activeDropdown = null;
  }

  isAiActive(): boolean {
    const url = this.router.url;
    return url.startsWith('/scanner') || url.startsWith('/text-extractor');
  }

  isVocabActive(): boolean {
    const url = this.router.url;
    return url.startsWith('/flashcards') || url.startsWith('/collection');
  }

  isArenaActive(): boolean {
    const url = this.router.url;
    return url.startsWith('/quiz') || url.startsWith('/leaderboard');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.nav-dropdown-container')) {
      this.closeAllDropdowns();
    }
  }

  handleLogout() {
    this.closeAllDropdowns();
    this.api.logout();
    this.studyService.clearUserData();
    this.router.navigate(['/']);
    this.toast.info('Bạn đã đăng xuất khỏi hệ thống Vocario.', 'Đã đăng xuất');
  }

  onUserNavClick(page: 'home' | 'scanner' | 'collection') {
    this.studyService.switchPage(page);
    this.activeTab = page;
    this.tabChange.emit(page);
  }

  onBrandClick() {
    if (this.api.currentUser()) {
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/']);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onTabClick(id: string) {
    this.activeTab = id;
    this.tabChange.emit(id);

    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  private scrollListener?: () => void;

  ngOnInit() {
    this.scrollListener = () => {
      if (this.api.currentUser()) {
        // Logged-in mode uses page tabs, no landing-page scrollspy needed
        return;
      }
      const scrollPos = window.scrollY + 140;
      const storyEl = document.getElementById('story');
      const featuresEl = document.getElementById('features');

      if (storyEl && scrollPos >= storyEl.offsetTop) {
        this.activeTab = 'story';
      } else if (featuresEl && scrollPos >= featuresEl.offsetTop) {
        this.activeTab = 'features';
      } else {
        this.activeTab = 'home';
      }
    };
    window.addEventListener('scroll', this.scrollListener, { passive: true });
  }

  ngOnDestroy() {
    if (this.scrollListener) {
      window.removeEventListener('scroll', this.scrollListener);
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleLang() {
    this.showLangMenu = !this.showLangMenu;
  }

  setLang(lang: string) {
    this.currentLang = lang;
    this.showLangMenu = false;
  }
}

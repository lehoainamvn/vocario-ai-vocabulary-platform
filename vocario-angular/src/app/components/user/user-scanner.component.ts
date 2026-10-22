import { Component, signal, ViewChild, ElementRef, OnDestroy, AfterViewInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';
import { UserStudyService, ContextWord } from '../../services/user-study.service';
import { SpeechService } from '../../services/speech.service';
import { IconComponent } from '../common/icon.component';

@Component({
  selector: 'app-user-scanner',
  standalone: true,
  imports: [CommonModule, IconComponent],
  host: {
    class: 'w-full block'
  },
  template: `
    <div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 animate-fade-in">
      
      <!-- =========================================================================
           1. STUDIO HEADER (SMART APERTURE STUDIO & TAB SWITCHER)
           ========================================================================= -->
      <section class="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2" aria-labelledby="studio-title">
        <div>
          <span class="text-xs font-semibold uppercase tracking-wider text-[#8C827A] block mb-1.5">
            SMART APERTURE STUDIO
          </span>
          <h1 id="studio-title" class="font-serif text-3xl sm:text-4xl lg:text-[40px] font-normal text-[#2D2823] tracking-tight leading-tight">
            Nhận diện vật thể & Từ vựng thực tế
          </h1>
          <p class="text-xs sm:text-sm text-[#5C5249] mt-2 max-w-2xl leading-relaxed">
            Hướng camera về phía sự vật quanh bạn để hệ thống thị giác AI tự động bóc tách từ vựng theo chuẩn CEFR.
          </p>
        </div>

        <!-- Mode Switcher Buttons (Live Camera / Tải ảnh lên - Chuẩn Figma) -->
        <div class="flex items-center gap-2 shrink-0">
          <button 
            type="button" 
            (click)="switchStudioTab('camera')"
            [class.bg-white]="activeStudioTab() === 'camera'"
            [class.text-[#2D2823]]="activeStudioTab() === 'camera'"
            [class.border-[#7D6853]]="activeStudioTab() === 'camera'"
            [class.shadow-2xs]="activeStudioTab() === 'camera'"
            [class.text-[#5C5249]]="activeStudioTab() !== 'camera'"
            class="px-4 py-2 rounded-[4px] border border-[#E5DED3] text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all hover:bg-white/60"
          >
            <app-icon name="camera" [size]="15" [svgClass]="activeStudioTab() === 'camera' ? 'text-[#7D6853]' : 'text-[#5C5249]'"></app-icon>
            <span>Live Camera</span>
          </button>

          <button 
            type="button" 
            (click)="switchStudioTab('upload')"
            [class.bg-white]="activeStudioTab() === 'upload'"
            [class.text-[#2D2823]]="activeStudioTab() === 'upload'"
            [class.border-[#7D6853]]="activeStudioTab() === 'upload'"
            [class.shadow-2xs]="activeStudioTab() === 'upload'"
            [class.text-[#5C5249]]="activeStudioTab() !== 'upload'"
            class="px-4 py-2 rounded-[4px] border border-[#E5DED3] text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all hover:bg-white/60"
          >
            <app-icon name="upload" [size]="15" [svgClass]="activeStudioTab() === 'upload' ? 'text-[#7D6853]' : 'text-[#5C5249]'"></app-icon>
            <span>Tải ảnh lên</span>
          </button>
        </div>
      </section>

      <!-- =========================================================================
           2. MAIN STUDIO GRID (CỘT TRÁI: VIEWPORT & CONTROLS | CỘT PHẢI: LEDGER)
           ========================================================================= -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- CỘT TRÁI (7/12): CINEMATIC VIEWPORT & CAMERA CONTROLS -->
        <div class="lg:col-span-7 space-y-4">
          
          <!-- DARK CINEMATIC VIEWPORT (Khung hình AI Camera màu đen - Chuẩn Figma rounded-[4px]) -->
          <div class="relative rounded-[4px] border border-[#3E3830] bg-[#1C1A17] text-white min-h-[440px] sm:min-h-[480px] w-full flex items-center justify-center overflow-hidden shadow-xs select-none">
            
            <!-- Floating Top Badge: "Hướng camera về vật thể bạn muốn học" -->
            <div class="absolute top-4 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-[4px] bg-black/75 border border-white/10 backdrop-blur-xs text-white text-xs font-medium z-20 pointer-events-none select-none">
              Hướng camera về vật thể bạn muốn học
            </div>

            <!-- Lưới ngắm 3x3 khi được bật -->
            <div *ngIf="isGridActive()" class="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10">
              <div class="border-r border-b border-white/15"></div>
              <div class="border-r border-b border-white/15"></div>
              <div class="border-b border-white/15"></div>
              <div class="border-r border-b border-white/15"></div>
              <div class="border-r border-b border-white/15"></div>
              <div class="border-b border-white/15"></div>
              <div class="border-r border-b border-white/15"></div>
              <div class="border-r border-b border-white/15"></div>
              <div></div>
            </div>

            <!-- TAB 1: CAMERA STREAM -->
            <ng-container *ngIf="activeStudioTab() === 'camera'">
              
              <!-- Video Stream khi Camera đang mở -->
              <video 
                #videoElement 
                autoplay 
                playsinline 
                muted 
                class="w-full h-full object-contain absolute inset-0"
                [class.hidden]="!isCameraActive() || capturedImagePreview()"
              ></video>

              <!-- 4 Khung ngắm Viewfinder Corners trên luồng Live Video -->
              <div *ngIf="isCameraActive() && !capturedImagePreview()" class="absolute inset-6 border border-white/15 rounded-[4px] pointer-events-none flex flex-col justify-between p-3 z-10">
                <div class="flex justify-between">
                  <span class="w-5 h-5 border-t-2 border-l-2 border-white/80 rounded-tl-[2px]"></span>
                  <span class="w-5 h-5 border-t-2 border-r-2 border-white/80 rounded-tr-[2px]"></span>
                </div>
                <div class="flex justify-between">
                  <span class="w-5 h-5 border-b-2 border-l-2 border-white/80 rounded-bl-[2px]"></span>
                  <span class="w-5 h-5 border-b-2 border-r-2 border-white/80 rounded-br-[2px]"></span>
                </div>
              </div>

              <!-- Trạng thái Chưa kết nối Camera (Chuẩn Screenshot Figma) -->
              <div *ngIf="!isCameraActive() && !capturedImagePreview() && !cameraError()" class="text-center p-8 z-10 flex flex-col items-center">
                <div class="w-12 h-12 rounded-[4px] border border-white/20 bg-white/5 flex items-center justify-center text-white/80 mb-3">
                  <svg class="w-6 h-6 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                    <path d="M2 12h20"/>
                  </svg>
                </div>
                <h3 class="font-serif text-2xl font-normal text-white">Biến không gian quanh bạn thành bài học</h3>
                <p class="text-xs text-stone-400 mt-1.5 max-w-xs text-center leading-relaxed">
                  Cho phép camera để bắt đầu nhận diện các vật thể trong tầm nhìn.
                </p>
                <button 
                  type="button" 
                  (click)="startCamera()"
                  class="mt-5 px-5 py-2.5 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white font-bold text-xs sm:text-sm border-0 cursor-pointer shadow-xs transition-all active:scale-98"
                >
                  Kết nối camera
                </button>
              </div>

              <!-- Trạng thái Lỗi Camera -->
              <div *ngIf="cameraError() && !capturedImagePreview()" class="text-center p-8 z-10 flex flex-col items-center max-w-md">
                <div class="w-12 h-12 rounded-[4px] bg-rose-500/20 text-rose-300 flex items-center justify-center mb-3">
                  <app-icon name="info" [size]="24" svgClass="text-rose-300"></app-icon>
                </div>
                <p class="font-serif text-xl font-normal text-rose-200">Không Thể Mở Camera</p>
                <p class="text-xs text-stone-300 mt-1 leading-relaxed">{{ cameraError() }}</p>
                <div class="flex items-center gap-2.5 mt-4">
                  <button 
                    type="button" 
                    (click)="triggerNativeCamera()"
                    class="px-4 py-2 rounded-[4px] bg-[#F7D147] hover:bg-[#ebd056] text-[#2D2823] text-xs font-bold border-0 cursor-pointer shadow-xs"
                  >
                    Mở máy ảnh thiết bị
                  </button>
                  <button 
                    type="button" 
                    (click)="startCamera()"
                    class="px-4 py-2 rounded-[4px] bg-white/20 hover:bg-white/30 text-white text-xs font-semibold border-0 cursor-pointer"
                  >
                    Thử lại
                  </button>
                </div>
              </div>

              <!-- Trạng thái Ảnh vừa chụp Preview kèm Bounding Boxes -->
              <div *ngIf="capturedImagePreview()" class="relative w-full h-full min-h-[440px] sm:min-h-[480px] flex items-center justify-center p-4">
                <div class="relative inline-block max-w-full leading-none">
                  <img [src]="capturedImagePreview()" alt="Ảnh vừa chụp" class="block max-h-[440px] sm:max-h-[480px] w-auto max-w-full rounded-[4px] border border-white/10 select-none pointer-events-none" />

                  <!-- Bounding boxes overlay on top of image -->
                  <div *ngIf="hasScanned() && studyService.activeScene()?.words?.length" class="absolute inset-0 pointer-events-none">
                    <div 
                      *ngFor="let item of studyService.activeScene()!.words"
                      (click)="selectWord(item.word); $event.stopPropagation()"
                      class="absolute pointer-events-auto cursor-pointer transition-all duration-150 rounded-[2px] group"
                      [style.top.%]="item.topPercent"
                      [style.left.%]="item.leftPercent"
                      [style.width.%]="item.widthPercent"
                      [style.height.%]="item.heightPercent"
                      [style.border]="selectedWord() === item.word ? '2px solid #F7D147' : ('1.5px solid ' + (item.colorBorder || '#ffffff'))"
                      [style.background-color]="selectedWord() === item.word ? 'rgba(247, 209, 71, 0.28)' : 'rgba(0, 0, 0, 0.08)'"
                      [title]="item.word + ': ' + item.vietnamese"
                    >
                      <!-- Label Tag -->
                      <span 
                        class="absolute -top-6 left-0 px-2 py-0.5 rounded-[2px] text-[11px] font-bold shadow-xs flex items-center gap-1.5 whitespace-nowrap z-20 select-none transition-all"
                        [class.bg-[#F7D147]]="selectedWord() === item.word"
                        [class.text-[#2D2823]]="selectedWord() === item.word"
                        [class.bg-white]="selectedWord() !== item.word"
                        [class.text-[#2D2823]]="selectedWord() !== item.word"
                      >
                        <span>{{ item.word }}</span>
                        <span *ngIf="item.confidence" class="text-[9px] font-mono opacity-80">{{ (item.confidence * 100).toFixed(0) }}%</span>
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Laser Scan Line Animation -->
                <div *ngIf="isScanning()" class="absolute inset-0 bg-amber-500/10 flex flex-col justify-center items-center z-30">
                  <div class="w-full h-1 bg-[#F7D147] shadow-[0_0_16px_#F7D147] animate-pulse"></div>
                  <span class="mt-3 px-3.5 py-1.5 rounded-[4px] bg-black/85 border border-white/15 text-white text-xs font-medium backdrop-blur-xs">
                    Mô hình Two-Stage AI đang bóc tách vật thể...
                  </span>
                </div>
              </div>

              <input #nativeCameraInput type="file" accept="image/*" capture="environment" (change)="onFileSelected($event)" class="hidden" />
            </ng-container>

            <!-- TAB 2: UPLOAD IMAGE STREAM -->
            <ng-container *ngIf="activeStudioTab() === 'upload'">
              <!-- Vùng kéo thả file ảnh khi chưa chọn ảnh -->
              <div 
                *ngIf="!uploadedImagePreview()"
                (click)="triggerFileInput()"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onFileDrop($event)"
                class="text-center p-8 z-10 flex flex-col items-center cursor-pointer select-none group w-full h-full justify-center"
              >
                <div class="w-12 h-12 rounded-[4px] border border-white/20 bg-white/5 group-hover:bg-white/10 flex items-center justify-center text-white/80 mb-3 transition-colors">
                  <app-icon name="upload" [size]="22" svgClass="text-white/80"></app-icon>
                </div>
                <h3 class="font-serif text-2xl font-normal text-white">Tải file ảnh từ máy của bạn</h3>
                <p class="text-xs text-stone-400 mt-1.5 max-w-xs text-center leading-relaxed">
                  Kéo thả file ảnh hoặc nhấp để chọn từ thiết bị (JPG, PNG, WEBP tối đa 15MB).
                </p>
                <button type="button" class="mt-5 px-5 py-2.5 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white font-bold text-xs sm:text-sm border-0 cursor-pointer shadow-xs pointer-events-none">
                  Chọn tệp từ máy
                </button>
              </div>

              <!-- Preview ảnh vừa tải lên -->
              <div *ngIf="uploadedImagePreview()" class="relative w-full h-full min-h-[440px] sm:min-h-[480px] flex items-center justify-center p-4">
                <div class="relative inline-block max-w-full leading-none">
                  <img [src]="uploadedImagePreview()" alt="Ảnh vừa tải" class="block max-h-[440px] sm:max-h-[480px] w-auto max-w-full rounded-[4px] border border-white/10 select-none pointer-events-none" />

                  <!-- Bounding boxes overlay on top of uploaded image -->
                  <div *ngIf="hasScanned() && studyService.activeScene()?.words?.length" class="absolute inset-0 pointer-events-none">
                    <div 
                      *ngFor="let item of studyService.activeScene()!.words"
                      (click)="selectWord(item.word); $event.stopPropagation()"
                      class="absolute pointer-events-auto cursor-pointer transition-all duration-150 rounded-[2px] group"
                      [style.top.%]="item.topPercent"
                      [style.left.%]="item.leftPercent"
                      [style.width.%]="item.widthPercent"
                      [style.height.%]="item.heightPercent"
                      [style.border]="selectedWord() === item.word ? '2px solid #F7D147' : ('1.5px solid ' + (item.colorBorder || '#ffffff'))"
                      [style.background-color]="selectedWord() === item.word ? 'rgba(247, 209, 71, 0.28)' : 'rgba(0, 0, 0, 0.08)'"
                      [title]="item.word + ': ' + item.vietnamese"
                    >
                      <!-- Label Tag -->
                      <span 
                        class="absolute -top-6 left-0 px-2 py-0.5 rounded-[2px] text-[11px] font-bold shadow-xs flex items-center gap-1.5 whitespace-nowrap z-20 select-none transition-all"
                        [class.bg-[#F7D147]]="selectedWord() === item.word"
                        [class.text-[#2D2823]]="selectedWord() === item.word"
                        [class.bg-white]="selectedWord() !== item.word"
                        [class.text-[#2D2823]]="selectedWord() !== item.word"
                      >
                        <span>{{ item.word }}</span>
                        <span *ngIf="item.confidence" class="text-[9px] font-mono opacity-80">{{ (item.confidence * 100).toFixed(0) }}%</span>
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Laser Scan Line Animation -->
                <div *ngIf="isScanning()" class="absolute inset-0 bg-amber-500/10 flex flex-col justify-center items-center z-30">
                  <div class="w-full h-1 bg-[#F7D147] shadow-[0_0_16px_#F7D147] animate-pulse"></div>
                  <span class="mt-3 px-3.5 py-1.5 rounded-[4px] bg-black/85 border border-white/15 text-white text-xs font-medium backdrop-blur-xs">
                    Mô hình Two-Stage AI đang bóc tách vật thể...
                  </span>
                </div>
              </div>

              <input #fileInput type="file" accept="image/png, image/jpeg, image/webp" (change)="onFileSelected($event)" class="hidden" />
            </ng-container>

          </div>

          <!-- CAMERA CONTROLS BAR (Chuẩn xác theo Screenshot Figma) -->
          <div class="flex items-center justify-between px-2 pt-1">
            
            <!-- Trạng thái kết nối bên trái -->
            <div class="flex items-center gap-2 text-xs text-[#8C827A] font-medium">
              <span 
                class="w-2 h-2 rounded-full" 
                [class.bg-emerald-500]="isCameraActive() || (activeStudioTab() === 'upload' && uploadedImagePreview())" 
                [class.bg-stone-400]="!isCameraActive() && !(activeStudioTab() === 'upload' && uploadedImagePreview())"
              ></span>
              <span>
                {{ activeStudioTab() === 'camera' 
                    ? (isCameraActive() ? 'Đang hoạt động' : (capturedImagePreview() ? 'Đã chụp ảnh' : 'Chưa kết nối')) 
                    : (uploadedImagePreview() ? 'Đã nạp file ảnh' : 'Chờ tải file') }}
              </span>
            </div>

            <!-- Nút chụp hình tròn lớn ở chính giữa -->
            <div class="flex items-center justify-center">
              <!-- Khi ở Camera tab và đang live: Bấm để chụp -->
              <button 
                *ngIf="activeStudioTab() === 'camera' && !capturedImagePreview()"
                type="button" 
                (click)="captureFrame()"
                [disabled]="!isCameraActive()"
                class="w-16 h-16 rounded-full border-2 border-[#D5CBBE] p-1 flex items-center justify-center transition-all cursor-pointer hover:border-[#7D6853] active:scale-95 disabled:opacity-40"
                title="Bấm nút để chụp ảnh"
              >
                <div class="w-12 h-12 rounded-full bg-[#D5CBBE] hover:bg-[#C4BAAC] transition-colors"></div>
              </button>

              <!-- Khi đã chụp hoặc tải ảnh: Nút Quét AI Ngay -->
              <button 
                *ngIf="(capturedImagePreview() || uploadedImagePreview()) && !hasScanned()"
                type="button" 
                (click)="executeAiScan()"
                [disabled]="isScanning()"
                class="px-5 py-2.5 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-xs transition-all active:scale-98 disabled:opacity-50"
              >
                <div *ngIf="isScanning()" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                <app-icon *ngIf="!isScanning()" name="sparkles" [size]="16" svgClass="text-[#F7D147]"></app-icon>
                <span>{{ isScanning() ? 'Đang bóc tách AI...' : 'Bắt đầu quét AI' }}</span>
              </button>

              <!-- Khi đã quét xong: Nút chụp lại mới -->
              <button 
                *ngIf="hasScanned()"
                type="button" 
                (click)="retakePhoto()"
                class="px-4 py-2 rounded-[4px] bg-[#FAF8F5] hover:bg-[#F2ECE1] text-[#7D6853] border border-[#E5DED3] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-98"
              >
                <app-icon name="camera" [size]="14"></app-icon>
                <span>Chụp ảnh mới</span>
              </button>
            </div>

            <!-- Hai nút điều khiển bên phải (Làm mới / Bật lưới) -->
            <div class="flex items-center gap-2">
              <button 
                type="button" 
                (click)="retakePhoto()"
                class="w-9 h-9 rounded-[4px] border border-[#E5DED3] bg-white hover:bg-[#FAF8F5] text-[#5C5249] flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                title="Chụp lại / Làm mới"
              >
                <app-icon name="rotate-cw" [size]="15"></app-icon>
              </button>

              <button 
                type="button" 
                (click)="toggleGrid()"
                class="w-9 h-9 rounded-[4px] border border-[#E5DED3] bg-white hover:bg-[#FAF8F5] text-[#5C5249] flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                [class.bg-[#FAF8F5]]="isGridActive()"
                [class.text-[#7D6853]]="isGridActive()"
                title="Bật/Tắt lưới ngắm"
              >
                <app-icon name="grid" [size]="15"></app-icon>
              </button>
            </div>

          </div>

        </div>

        <!-- CỘT PHẢI (5/12): COMPANION LEDGER (NHẬT KÝ QUÉT TỪ VỰNG - CHUẨN FIGMA) -->
        <div class="lg:col-span-5">
          
          <div class="bg-white rounded-[4px] border border-[#E5DED3] p-5 sm:p-6 shadow-xs flex flex-col justify-between min-h-[460px]">
            
            <div>
              <!-- Ledger Header -->
              <div class="flex items-baseline justify-between">
                <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-[#7D6853] block">
                  COMPANION LEDGER
                </span>
                <span class="font-mono text-2xl font-bold text-[#8C827A]">
                  {{ studyService.activeScene()?.words?.length ? (studyService.activeScene()!.words.length < 10 ? '0' + studyService.activeScene()!.words.length : studyService.activeScene()!.words.length) : '04' }}
                </span>
              </div>

              <h2 class="font-serif text-2xl sm:text-[26px] font-bold text-[#29251F] mt-1 tracking-tight">
                Nhật ký quét từ vựng
              </h2>

              <!-- TRẠNG THÁI 1: CHƯA QUÉT (THEO ĐÚNG SCREENSHOT FIGMA) -->
              <div *ngIf="!hasScanned() || !studyService.activeScene()?.words?.length" class="space-y-6 pt-3">
                
                <p class="text-xs sm:text-sm text-[#746B60] leading-relaxed">
                  Khung học tập sẽ tự động cập nhật sau lần quét đầu tiên. Bạn có thể nghe phát âm, lưu từ và luyện hội thoại ngay tại đây.
                </p>

                <!-- 3 Bước Hướng Dẫn Timeline chuẩn Screenshot (Vuông vức tinh gọn rounded-[4px]) -->
                <div class="space-y-4 pt-2">
                  
                  <!-- Bước 01 -->
                  <div class="flex items-start gap-3.5">
                    <span class="w-7 h-7 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-xs font-mono font-bold text-[#7D6853] shrink-0 mt-0.5">
                      01
                    </span>
                    <div>
                      <h4 class="font-bold text-sm text-[#29251F] leading-snug">Ghi lại bối cảnh</h4>
                      <p class="text-xs text-[#746B60] mt-0.5 leading-relaxed">Chụp hoặc tải ảnh đồ vật bạn gặp trong đời sống.</p>
                    </div>
                  </div>

                  <!-- Bước 02 -->
                  <div class="flex items-start gap-3.5">
                    <span class="w-7 h-7 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-xs font-mono font-bold text-[#7D6853] shrink-0 mt-0.5">
                      02
                    </span>
                    <div>
                      <h4 class="font-bold text-sm text-[#29251F] leading-snug">Phân loại từ vựng</h4>
                      <p class="text-xs text-[#746B60] mt-0.5 leading-relaxed">Hệ thống gợi ý nghĩa, phát âm và cấp độ A1 – C2.</p>
                    </div>
                  </div>

                  <!-- Bước 03 -->
                  <div class="flex items-start gap-3.5">
                    <span class="w-7 h-7 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] flex items-center justify-center text-xs font-mono font-bold text-[#7D6853] shrink-0 mt-0.5">
                      03
                    </span>
                    <div>
                      <h4 class="font-bold text-sm text-[#29251F] leading-snug">Luyện dùng từ tự nhiên</h4>
                      <p class="text-xs text-[#746B60] mt-0.5 leading-relaxed">Tạo hội thoại ngắn dựa trên chính bối cảnh trong ảnh.</p>
                    </div>
                  </div>

                </div>

                <!-- Ghi chú bảo mật ảnh -->
                <div class="pt-5 border-t border-[#E5DED3] flex items-center gap-2 text-xs text-[#746B60]">
                  <app-icon name="check" [size]="14" svgClass="text-emerald-600"></app-icon>
                  <span>Ảnh chỉ được dùng trong phiên học hiện tại</span>
                </div>

              </div>

              <!-- TRẠNG THÁI 2: ĐÃ QUÉT - HIỂN THỊ TỪ VỰNG BỐI CẢNH & HỘI THOẠI AI -->
              <div *ngIf="hasScanned() && studyService.activeScene()?.words?.length && activeWordItem as word" class="space-y-5 pt-3 animate-fade-in">
                
                <!-- Chi tiết từ được chọn (Chuẩn Figma) -->
                <div class="p-4 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] space-y-3">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <span class="inline-flex items-center px-2 py-0.5 rounded-[2px] bg-white border border-[#E5DED3] text-[10px] font-mono font-bold text-[#7D6853]">
                        {{ word.level }} • {{ word.partOfSpeech }}
                      </span>
                      <h3 class="font-serif text-2xl font-bold text-[#29251F] mt-1.5">
                        {{ word.word }}
                      </h3>
                      <p class="font-mono text-xs text-[#8C827A]">{{ word.ipa }}</p>
                    </div>

                    <!-- Nút nghe phát âm & luyện nói -->
                    <div class="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        (click)="studyService.speakWord(word.word)"
                        class="w-7 h-7 rounded-[4px] bg-white hover:bg-[#FAF8F5] border border-[#E5DED3] text-[#7D6853] flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
                        title="Nghe phát âm"
                      >
                        <app-icon name="volume-2" [size]="14"></app-icon>
                      </button>
                      <button
                        type="button"
                        (click)="practiceSpeechWord(word)"
                        class="h-7 px-2.5 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs border-0"
                        title="Chấm điểm phát âm AI"
                      >
                        <app-icon name="mic" [size]="12"></app-icon>
                        <span>Luyện nói</span>
                      </button>
                    </div>
                  </div>

                  <p class="text-sm font-bold text-[#7D6853]">
                    {{ word.vietnamese }}
                  </p>

                  <div class="text-xs italic text-[#5C5249] bg-white p-2.5 rounded-[4px] border border-[#E5DED3] leading-relaxed">
                    “{{ word.exampleEn }}”
                    <p class="text-[#8C827A] not-italic mt-0.5 text-[11px]">{{ word.exampleVi }}</p>
                  </div>

                  <button 
                    *ngIf="!isCurrentWordSaved(); else wordSavedInScanTpl"
                    type="button" 
                    (click)="saveCurrentWordToSrs()"
                    class="w-full py-2.5 px-3 rounded-[4px] bg-[#7D6853] hover:bg-[#685542] text-white font-bold text-xs transition-all cursor-pointer border-0 shadow-2xs flex items-center justify-center gap-1.5 active:scale-98"
                  >
                    <app-icon name="bookmark" [size]="13" svgClass="text-white"></app-icon>
                    <span>Lưu từ này vào Sổ từ vựng SM-2</span>
                  </button>

                  <ng-template #wordSavedInScanTpl>
                    <div class="w-full py-2 px-3 rounded-[4px] bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5">
                      <app-icon name="check" [size]="14" svgClass="text-emerald-700"></app-icon>
                      <span>Đã có trong Sổ từ vựng SM-2</span>
                    </div>
                  </ng-template>
                </div>

                <!-- Danh sách chip từ nhận diện -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                      Tất cả từ nhận diện trong ảnh:
                    </span>
                    <button
                      type="button"
                      (click)="saveAllWordsOfCurrentScene()"
                      [disabled]="isSavingAllScene()"
                      class="text-[11px] font-bold text-[#7D6853] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                    >
                      <app-icon name="bookmark" [size]="12" svgClass="text-[#7D6853]"></app-icon>
                      <span>{{ isSavingAllScene() ? 'Đang lưu...' : 'Lưu toàn bộ vào Sổ' }}</span>
                    </button>
                  </div>

                  <div class="flex flex-wrap gap-1.5">
                    <button
                      *ngFor="let item of studyService.activeScene()!.words"
                      type="button"
                      (click)="selectWord(item.word)"
                      [class.bg-[#7D6853]]="selectedWord() === item.word"
                      [class.text-white]="selectedWord() === item.word"
                      [class.bg-[#FAF8F5]]="selectedWord() !== item.word"
                      [class.text-[#2D2823]]="selectedWord() !== item.word"
                      class="px-2.5 py-1 rounded-[4px] text-xs font-semibold border border-[#E5DED3] hover:border-[#7D6853] transition-all cursor-pointer shadow-2xs"
                    >
                      {{ item.word }}
                    </button>
                  </div>
                </div>

                <!-- Luyện hội thoại ngữ cảnh Groq AI -->
                <div *ngIf="studyService.activeScene()?.dialogue?.length" class="pt-3 border-t border-[#E5DED3] space-y-2.5">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-[#2D2823]">Hội thoại ngữ cảnh thực tế</span>
                    <button
                      type="button"
                      (click)="regenerateDialogue()"
                      [disabled]="isRegeneratingDialogue()"
                      class="inline-flex items-center gap-1 text-[11px] font-bold text-[#7D6853] hover:underline bg-transparent border-0 cursor-pointer"
                    >
                      <app-icon *ngIf="!isRegeneratingDialogue()" name="rotate-cw" [size]="11"></app-icon>
                      <span>{{ isRegeneratingDialogue() ? 'Đang tạo...' : 'Đổi ngữ cảnh' }}</span>
                    </button>
                  </div>

                  <div class="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    <div 
                      *ngFor="let turn of studyService.activeScene()!.dialogue"
                      class="p-2.5 rounded-[4px] bg-[#FAF8F5] border border-[#E5DED3] text-xs"
                    >
                      <div class="flex items-center justify-between mb-1">
                        <span class="font-bold text-[#7D6853] text-[11px]">{{ turn.speakerLabel }}</span>
                        <button 
                          type="button" 
                          (click)="studyService.speakWord(turn.en)"
                          class="p-1 rounded-[2px] text-[#7D6853] hover:bg-stone-200/50 cursor-pointer border-0 bg-transparent"
                        >
                          <app-icon name="volume-2" [size]="13"></app-icon>
                        </button>
                      </div>
                      <p class="text-[#2D2823] font-medium leading-relaxed">{{ turn.en }}</p>
                      <p class="text-[#8C827A] italic text-[11px] mt-0.5">{{ turn.vi }}</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  `
})
export class UserScannerComponent implements OnDestroy, AfterViewInit {
  private cdr = inject(ChangeDetectorRef);
  public studyService = inject(UserStudyService);
  public speechService = inject(SpeechService);
  public toast = inject(ToastService);

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('nativeCameraInput') nativeCameraInput?: ElementRef<HTMLInputElement>;

  selectedWord = signal<string>('');
  activeStudioTab = signal<'camera' | 'upload'>('camera');
  hasScanned = signal(false);
  isGridActive = signal(false);

  toggleGrid() {
    this.isGridActive.update(v => !v);
  }

  // Camera State
  mediaStream: MediaStream | null = null;
  isCameraActive = signal(false);
  cameraError = signal<string | null>(null);
  capturedImagePreview = signal<string | null>(null);

  // Upload State
  isDragging = signal(false);
  uploadedImagePreview = signal<string | null>(null);
  selectedFile: File | null = null;
  selectedFileName = signal('');
  selectedFileSizeText = signal('');

  // Scan State
  isScanning = signal(false);
  selectedTheme = 'auto';
  autoScene = signal<any | null>(null);
  contextSource = signal<'groq' | 'fallback'>('groq');
  isRegeneratingDialogue = signal(false);
  sceneAiTitle = signal<string>('');

  ngAfterViewInit() {
    if (this.activeStudioTab() === 'camera') {
      if (!this.capturedImagePreview() && !this.isCameraActive()) {
        this.startCamera();
      }
    }
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  get activeWordItem(): ContextWord | undefined {
    const list = this.studyService.activeScene()?.words || [];
    return list.find(w => w.word.toLowerCase() === this.selectedWord().toLowerCase()) || list[0];
  }

  selectWord(word: string) {
    this.selectedWord.set(word);
    this.studyService.speakWord(word);
  }

  switchStudioTab(tab: 'camera' | 'upload') {
    if (this.activeStudioTab() === tab) return;
    this.activeStudioTab.set(tab);
    if (tab === 'camera') {
      if (!this.capturedImagePreview()) {
        this.startCamera();
      }
    } else {
      this.stopCamera();
    }
    this.cdr.detectChanges();
  }

  async startCamera() {
    this.cameraError.set(null);
    this.isCameraActive.set(false);
    this.cdr.detectChanges();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.cameraError.set('Trình duyệt không hỗ trợ WebRTC Camera trực tiếp. Vui lòng bấm "Mở Máy Ảnh Chụp Ngay".');
      this.cdr.detectChanges();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      this.mediaStream = stream;
      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = stream;
        await this.videoElement.nativeElement.play();
      }

      this.isCameraActive.set(true);
      this.cameraError.set(null);
      this.cdr.detectChanges();
    } catch (err: any) {
      console.warn('Lỗi mở camera:', err);
      this.cameraError.set('Không thể truy cập camera. Vui lòng cấp quyền truy cập trong cài đặt trình duyệt.');
      this.isCameraActive.set(false);
      this.cdr.detectChanges();
    }
  }

  stopCamera() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.isCameraActive.set(false);
    this.cdr.detectChanges();
  }

  captureFrame() {
    if (!this.videoElement?.nativeElement) return;
    const video = this.videoElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    this.capturedImagePreview.set(dataUrl);

    canvas.toBlob((blob) => {
      if (blob) {
        this.selectedFile = new File([blob], `camera-snap-${Date.now()}.jpg`, { type: 'image/jpeg' });
        this.selectedFileName.set(this.selectedFile.name);
        this.selectedFileSizeText.set(`${(blob.size / 1024).toFixed(0)} KB`);
        this.cdr.detectChanges();
      }
    }, 'image/jpeg', 0.92);

    this.stopCamera();
    this.hasScanned.set(false);
    this.cdr.detectChanges();
    this.toast.info('Đã chụp ảnh thành công! Bấm "Quét Ngay Bối Cảnh AI" bên dưới ảnh.', 'Chụp Thành Công');
  }

  retakePhoto() {
    this.hasScanned.set(false);
    this.capturedImagePreview.set(null);
    this.selectedFile = null;
    this.selectedFileName.set('');
    this.selectedFileSizeText.set('');
    this.startCamera();
    this.cdr.detectChanges();
  }

  triggerNativeCamera() {
    this.nativeCameraInput?.nativeElement.click();
  }

  triggerFileInput() {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      this.toast.error('Vui lòng chỉ chọn tệp hình ảnh (JPG, PNG, WEBP)', 'Định Dạng Không Đúng');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      this.toast.error('Kích thước ảnh vượt quá 15MB, vui lòng chọn ảnh nhẹ hơn.', 'Ảnh Quá Lớn');
      return;
    }

    this.selectedFile = file;
    this.hasScanned.set(false);
    this.selectedFileName.set(file.name);
    this.selectedFileSizeText.set(file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(0)} KB`);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (this.activeStudioTab() === 'camera') {
        this.capturedImagePreview.set(dataUrl);
        this.stopCamera();
      } else {
        this.uploadedImagePreview.set(dataUrl);
      }
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);

    this.toast.info(`Đã nạp ảnh thành công: ${file.name}`, 'Đã Nhận Ảnh');
    this.cdr.detectChanges();
  }

  executeAiScan() {
    const file = this.selectedFile;
    const previewUrl = this.activeStudioTab() === 'camera' ? this.capturedImagePreview() : this.uploadedImagePreview();

    if (!file || !previewUrl) {
      this.toast.error('Vui lòng chụp ảnh hoặc tải file ảnh lên trước!', 'Chưa Có Ảnh');
      return;
    }

    this.isScanning.set(true);
    this.autoScene.set(null);
    this.cdr.detectChanges();
    const theme = this.selectedTheme;

    // Bước 1: Suy luận vật thể trực tiếp từ mô hình YOLO-World v2 qua Python FastAPI (Port 8001)
    this.studyService.detectRealObjectsWithYolo(file, theme, 0.15).subscribe({
      next: (aiRes) => {
        let detectedWords: ContextWord[] = [];
        let isRealAi = false;
        let aiDialogue: any[] | undefined = undefined;
        let finalTheme = theme;

        if (aiRes && aiRes.success) {
          if (aiRes.autoScene) {
            this.autoScene.set(aiRes.autoScene);
            finalTheme = aiRes.autoScene.theme_name_vi || aiRes.sceneTitle || theme;
            this.sceneAiTitle.set(finalTheme);
          }
          if (Array.isArray(aiRes.detectedObjects) && aiRes.detectedObjects.length > 0) {
            detectedWords = aiRes.detectedObjects;
            isRealAi = true;
            this.contextSource.set(aiRes.contextSource === 'groq' ? 'groq' : 'fallback');
            if (aiRes.sceneTitle) {
              finalTheme = aiRes.sceneTitle;
              this.sceneAiTitle.set(finalTheme);
            }
            if (Array.isArray(aiRes.dialogue) && aiRes.dialogue.length > 0) {
              aiDialogue = aiRes.dialogue;
            }
            console.log(`[Hierarchical AI: ResNet-18 + YOLO-World] Đã nhận diện bối cảnh & vật thể:`, aiRes);
            this.persistScanResult(file, finalTheme, detectedWords, previewUrl, isRealAi, aiDialogue);
          } else {
            console.warn('[YOLO-World v2 AI] Mô hình chưa phát hiện đối tượng rõ ràng trong ảnh:', aiRes);
            this.isScanning.set(false);
            const diag = aiRes.diagnosticMessage || 'Độ tin cậy của các vật thể đều dưới ngưỡng 15%';
            this.toast.warning(`Chưa nhận diện được: ${diag}. Hãy thử chụp góc gần hơn hoặc ảnh rõ nét hơn!`, 'Chưa Rõ Vật Thể');
            this.cdr.detectChanges();
          }
        } else {
          this.isScanning.set(false);
          const errMsg = aiRes?.message || aiRes?.error || 'Máy chủ AI không thể xử lý bức ảnh này.';
          console.error('[YOLO-World v2 AI] Lỗi từ máy chủ AI:', aiRes);
          this.toast.error(`Lỗi xử lý ảnh: ${errMsg}`, 'Lỗi Xử Lý Ảnh');
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('AI Vision Service (Port 8001) gặp sự cố kết nối:', err);
        this.isScanning.set(false);
        const detail = err?.error?.message || err?.message || err?.statusText || 'Không thể kết nối đến Port 8001';
        this.toast.error(`Lỗi kết nối AI (Port 8001): ${detail}`, 'Lỗi Kết Nối AI');
        this.cdr.detectChanges();
      }
    });
  }

  private persistScanResult(
    file: File,
    theme: string,
    detectedWords: ContextWord[],
    previewUrl: string,
    isRealAi: boolean,
    aiDialogue?: any[]
  ) {
    // Bước 2: Gửi POST /api/vision/save-capture đến máy chủ Spring Boot lưu vào CSDL PostgreSQL
    this.studyService.saveRealCapture(file, theme, detectedWords).subscribe({
      next: (savedCapture) => {
        this.studyService.addSavedCaptureToScenes(savedCapture, detectedWords, theme, previewUrl, aiDialogue);
        this.isScanning.set(false);
        this.hasScanned.set(true);
        this.stopCamera();

        if (detectedWords.length > 0) {
          this.selectedWord.set(detectedWords[0].word);
        }

        if (isRealAi) {
          const isGroq = this.contextSource() === 'groq';
          this.toast.success(
            isGroq
              ? `Two-Stage AI (YOLO-World + Deep Verifier & Groq) đã thẩm định và bóc tách ${detectedWords.length} vật thể chuẩn xác!`
              : `Mô hình Two-Stage AI đã thẩm định và bóc tách chính xác ${detectedWords.length} đồ vật từ ảnh!`,
            isGroq ? 'Two-Stage AI & LLM Hoàn Tất' : 'Two-Stage AI Hoàn Tất'
          );
        } else {
          this.toast.info(
            `Đã trích xuất ${detectedWords.length} từ vựng và tự động nạp vào 2 khung bên phải!`,
            'AI Vision Hoàn Tất'
          );
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Lỗi kết nối API lưu ảnh backend, lưu trữ tạm để tiếp tục phiên học:', err);
        const fallbackCapture = {
          id: `capture-${Date.now()}`,
          imageUrl: previewUrl,
          sceneTheme: theme,
          detectedObjects: detectedWords
        };
        this.studyService.addSavedCaptureToScenes(fallbackCapture, detectedWords, theme, previewUrl, aiDialogue);
        this.isScanning.set(false);
        this.hasScanned.set(true);
        this.stopCamera();

        if (detectedWords.length > 0) {
          this.selectedWord.set(detectedWords[0].word);
        }

        this.toast.success(
          `Đã quét ảnh và phát hiện ${detectedWords.length} từ vựng mới!`,
          'AI Vision Hoàn Tất'
        );
        this.cdr.detectChanges();
      }
    });
  }

  regenerateDialogue() {
    const scene = this.studyService.activeScene();
    const words = scene?.words || [];
    if (words.length === 0) return;

    this.isRegeneratingDialogue.set(true);
    this.cdr.detectChanges();

    this.studyService.regenerateDialogueWithAi(words, scene?.title || this.selectedTheme).subscribe({
      next: (res) => {
        this.isRegeneratingDialogue.set(false);
        if (res && Array.isArray(res.dialogue) && res.dialogue.length > 0) {
          this.studyService.updateActiveSceneDialogue(res.dialogue);
          this.contextSource.set(res.contextSource === 'groq' ? 'groq' : 'fallback');
          this.toast.success('Đã sinh đoạn hội thoại mới bằng Groq LLM!', 'Hội Thoại Mới');
        } else {
          this.toast.info('Không thể tạo đoạn hội thoại mới lúc này.', 'Thông Báo');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isRegeneratingDialogue.set(false);
        console.warn('Lỗi gọi regenerateDialogue:', err);
        this.toast.info('Dịch vụ Groq tạm bận, giữ nguyên đoạn hội thoại hiện tại.', 'Thông Báo');
        this.cdr.detectChanges();
      }
    });
  }

  isSavingAllScene = signal(false);

  isCurrentWordSaved(): boolean {
    const w = this.activeWordItem?.word;
    if (!w) return false;
    return this.studyService.savedWords().some(s => s.word.toLowerCase() === w.toLowerCase());
  }

  saveAllWordsOfCurrentScene() {
    const scene = this.studyService.activeScene();
    if (!scene) return;
    this.isSavingAllScene.set(true);
    this.studyService.learnAllWordsFromScene(scene.id).subscribe({
      next: () => {
        this.isSavingAllScene.set(false);
        this.studyService.refreshSavedWords();
        this.studyService.refreshStats();
        this.studyService.refreshDueCards();
        this.toast.success(`Đã lưu toàn bộ ${scene.words.length} từ trong ảnh vào Sổ tay từ vựng!`, 'Lưu Thành Công');
      },
      error: () => {
        this.isSavingAllScene.set(false);
        for (const w of scene.words) {
          this.studyService.learnWordFromImage(scene.id, w);
        }
        this.toast.info(`Đã lưu các từ vào Sổ từ vựng!`, 'Lưu Từ');
      }
    });
  }

  saveCurrentWordToSrs() {
    const word = this.activeWordItem;
    const sceneId = this.studyService.activeScene()?.id;
    if (word && sceneId) {
      this.studyService.learnWordFromImage(sceneId, word);
    }
  }

  practiceSpeechWord(word: ContextWord) {
    this.speechService.openSpeechModal({
      text: word.word,
      ipa: word.ipa,
      meaning: word.vietnamese,
      contextTitle: `Từ vựng: ${word.word}`,
      mode: 'WORD'
    });
  }

  practiceSpeechTurn(turn: { speaker: string; speakerLabel: string; en: string; vi: string; highlightWord?: string }) {
    this.speechService.openSpeechModal({
      text: turn.en,
      meaning: turn.vi,
      contextTitle: `Hội thoại: ${turn.speakerLabel}`,
      mode: 'SENTENCE'
    });
  }

  private generateFallbackContextualWords(theme: string): ContextWord[] {
    return [
      {
        id: 'w-laptop',
        word: 'laptop',
        ipa: '/ˈlæp.tɒp/',
        vietnamese: 'máy tính xách tay',
        partOfSpeech: 'noun',
        level: 'A1',
        colorBg: 'bg-[#D6D8F8]',
        colorBorder: 'border-white',
        colorText: 'text-[#1C2059]',
        exampleEn: 'I use my laptop for studying every day.',
        exampleVi: 'Tôi dùng máy tính xách tay để học tập mỗi ngày.',
        collocation: 'work on laptop',
        collocationVi: 'làm việc trên laptop',
        topPercent: 35,
        leftPercent: 30,
        widthPercent: 28,
        heightPercent: 12
      },
      {
        id: 'w-notebook',
        word: 'notebook',
        ipa: '/ˈnoʊt.bʊk/',
        vietnamese: 'vở ghi chép, sổ tay',
        partOfSpeech: 'noun',
        level: 'A1',
        colorBg: 'bg-[#D1E7DD]',
        colorBorder: 'border-white',
        colorText: 'text-[#0F5132]',
        exampleEn: 'Write down new English words in your notebook.',
        exampleVi: 'Hãy ghi lại các từ tiếng Anh mới vào sổ tay.',
        collocation: 'spiral notebook',
        collocationVi: 'vở lò xo',
        topPercent: 55,
        leftPercent: 62,
        widthPercent: 20,
        heightPercent: 10
      },
      {
        id: 'w-coffee-mug',
        word: 'coffee mug',
        ipa: '/ˈkɔː.fi mʌɡ/',
        vietnamese: 'cốc cà phê',
        partOfSpeech: 'noun',
        level: 'A2',
        colorBg: 'bg-[#F8D7DA]',
        colorBorder: 'border-white',
        colorText: 'text-[#842029]',
        exampleEn: 'A warm coffee mug helps me stay focused.',
        exampleVi: 'Một cốc cà phê ấm giúp tôi tập trung hơn.',
        collocation: 'hot coffee mug',
        collocationVi: 'cốc cà phê nóng',
        topPercent: 40,
        leftPercent: 68,
        widthPercent: 15,
        heightPercent: 10
      },
      {
        id: 'w-lamp',
        word: 'desk lamp',
        ipa: '/desk læmp/',
        vietnamese: 'đèn bàn học',
        partOfSpeech: 'noun',
        level: 'A2',
        colorBg: 'bg-[#FFF3CD]',
        colorBorder: 'border-white',
        colorText: 'text-[#664D03]',
        exampleEn: 'The desk lamp provides gentle light at night.',
        exampleVi: 'Đèn bàn cung cấp ánh sáng dịu nhẹ vào ban đêm.',
        collocation: 'turn on desk lamp',
        collocationVi: 'bật đèn bàn',
        topPercent: 15,
        leftPercent: 15,
        widthPercent: 20,
        heightPercent: 15
      }
    ];
  }
}

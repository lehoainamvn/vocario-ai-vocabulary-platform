import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Certificate } from '../../models/certificate.model';
import { IconComponent } from '../common/icon.component';

@Component({
  selector: 'app-certificate-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div 
      *ngIf="certificate" 
      class="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-fade-in"
      (click)="onBackdropClick($event)"
      (contextmenu)="onContextMenu($event)"
    >
      <!-- DIALOG CONTAINER -->
      <div 
        class="relative w-full max-w-xl md:max-w-2xl bg-white rounded-lg border border-[#E5DED3] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-scale-up"
        (click)="$event.stopPropagation()"
      >
        
        <!-- =========================================================================
             1. STICKY TOP BAR: LUÔN CỐ ĐỊNH, DỄ DÀNG THOÁT TRÊN MỌI KÍCH CỠ MÀN HÌNH
             ========================================================================= -->
        <div class="sticky top-0 z-30 px-4 sm:px-5 py-3 bg-[#FAF8F5] border-b border-[#E5DED3] flex items-center justify-between shrink-0">
          
          <div class="flex items-center gap-2">
            <!-- Badge trạng thái: Chính thức hoặc Bản xem trước -->
            <span 
              *ngIf="!isPreview" 
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
            >
              <app-icon name="award" [size]="12" svgClass="text-emerald-700"></app-icon>
              <span>Chứng chỉ chính thức</span>
            </span>

            <span 
              *ngIf="isPreview" 
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
            >
              <app-icon name="lock" [size]="12" svgClass="text-amber-700"></app-icon>
              <span>Bản xem trước (Tiến độ {{ progressPercent }}%)</span>
            </span>

            <span class="text-xs text-[#746B60] hidden sm:inline font-mono">
              CEFR Level {{ certificate.cefrLevel }}
            </span>
          </div>

          <!-- NÚT ĐÓNG TO, NỔI BẬT, LUÔN NHÌN THẤY -->
          <button 
            type="button" 
            (click)="closeModal()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EFEAE1] hover:bg-[#E5DED3] text-[#2D2823] font-semibold text-xs border border-[#D5CBBE] cursor-pointer transition-colors active:scale-95 shadow-2xs"
            title="Đóng cửa sổ (hoặc bấm phím Esc)"
            aria-label="Đóng cửa sổ"
          >
            <span class="font-medium">Đóng</span>
            <app-icon name="x" [size]="14"></app-icon>
          </button>
        </div>

        <!-- BANNER THÔNG BÁO HOÀN THÀNH 100% (CHỈ HIỆN KHI VỪA ĐẠT CHUẨN) -->
        <div 
          *ngIf="isCelebration" 
          class="px-4 py-2.5 bg-linear-to-r from-amber-600 to-[#7D6853] text-white text-xs text-center flex items-center justify-center gap-2 shadow-xs shrink-0"
        >
          <span class="text-base">🎉</span>
          <span>
            <strong>Chúc mừng bạn đã đạt 100% cấp độ CEFR {{ certificate.cefrLevel }}!</strong> 
            Chứng chỉ học thuật của bạn đã chính thức được kích hoạt.
          </span>
        </div>

        <!-- =========================================================================
             2. SCROLLABLE CERTIFICATE BODY (VỪA VẶN, SCROLL MƯỢT NẾU MÀN HÌNH NHỎ)
             ========================================================================= -->
        <div class="overflow-y-auto p-4 sm:p-6 flex-1 bg-stone-100/60 flex flex-col items-center">
          
          <!-- KHUNG CHỨNG CHỈ SCANDINAVIAN EDITORIAL -->
          <div 
            id="printable-certificate" 
            [class.is-preview]="isPreview"
            class="relative w-full bg-[#FAF7F2] p-6 sm:p-8 border-4 border-double border-[#7D6853]/60 rounded-md shadow-md text-center space-y-4 overflow-hidden select-none"
            style="user-select: none; -webkit-user-select: none;"
          >
            
            <!-- =========================================================================
                 WATERMARK CHỐNG CHỤP HÌNH / CHỐNG COPY KHI Ở BẢN XEM TRƯỚC (isPreview)
                 ========================================================================= -->
            <div 
              *ngIf="isPreview" 
              class="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-center overflow-hidden"
              aria-hidden="true"
            >
              <!-- Dải watermark chéo lặp lại -->
              <div class="w-[140%] -rotate-25 space-y-10 py-6 select-none opacity-20">
                <div class="text-xl sm:text-2xl font-black text-rose-700 tracking-[0.25em] uppercase whitespace-nowrap">
                  BẢN XEM TRƯỚC • CHƯA ĐẠT 100% • PREVIEW ONLY • KHÔNG CÓ GIÁ TRỊ PHÁP LÝ • BẢN XEM TRƯỚC
                </div>
                <div class="text-xl sm:text-2xl font-black text-rose-700 tracking-[0.25em] uppercase whitespace-nowrap">
                  VOCARIO ACADEMY • CHƯA HOÀN THÀNH CHỈ TIÊU • DRAFT COPY • VOCARIO ACADEMY • DRAFT
                </div>
                <div class="text-xl sm:text-2xl font-black text-rose-700 tracking-[0.25em] uppercase whitespace-nowrap">
                  BẢN XEM TRƯỚC • CHƯA ĐẠT 100% • PREVIEW ONLY • KHÔNG CÓ GIÁ TRỊ PHÁP LÝ • BẢN XEM TRƯỚC
                </div>
              </div>

              <!-- Con dấu chìm to ở chính giữa -->
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="px-6 py-3 border-4 border-dashed border-rose-600/30 rounded-lg -rotate-12 bg-white/40 backdrop-blur-2xs">
                  <span class="font-serif text-xl sm:text-2xl font-black text-rose-700/40 tracking-widest uppercase block">
                    BẢN NHÁP XEM TRƯỚC
                  </span>
                  <span class="text-[10px] text-rose-800/40 font-bold uppercase tracking-wider block mt-0.5">
                    CẦN ĐẠT 100% ĐỂ MỞ KHÓA BẢN GỐC
                  </span>
                </div>
              </div>
            </div>

            <!-- Họa tiết góc cổ điển (Corner Ornaments) -->
            <div class="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-[#7D6853]/40"></div>
            <div class="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-[#7D6853]/40"></div>
            <div class="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-[#7D6853]/40"></div>
            <div class="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-[#7D6853]/40"></div>

            <!-- Header Chứng Chỉ -->
            <div class="space-y-1">
              <span class="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-[#7D6853] block">
                Vocario Academy of Natural Linguistics
              </span>
              <h2 class="font-serif text-xl sm:text-2xl font-bold text-[#2D2823] tracking-tight uppercase m-0">
                Chứng Chỉ Khảo Thí Năng Lực CEFR
              </h2>
              <p class="text-[10px] sm:text-[11px] text-[#746B60] italic m-0">
                Certificate of CEFR Vocabulary Mastery & Spaced Repetition Retention
              </p>
            </div>

            <!-- Dòng trao tặng cho học viên -->
            <div class="pt-2 pb-1 space-y-0.5 border-t border-b border-[#E5DED3]/80">
              <span class="text-[10px] uppercase tracking-wider text-[#746B60] block">Chứng nhận học viên</span>
              <h3 class="font-serif text-xl sm:text-2xl font-bold text-[#7D6853] tracking-wide m-0">
                {{ certificate.userFullName || certificate.username }}
              </h3>
              <span class="text-[11px] text-[#746B60] block font-mono">@{{ certificate.username }}</span>
            </div>

            <!-- Nội dung công nhận cấp độ -->
            <div class="space-y-2.5">
              <p class="text-xs text-[#5C5249] leading-relaxed max-w-md mx-auto m-0">
                {{ isPreview ? 'Đang trong lộ trình chinh phục chuẩn năng lực phản xạ ngôn ngữ bối cảnh:' : 'Đã hoàn thành xuất sắc toàn bộ chỉ tiêu vốn từ vựng và đạt chuẩn năng lực phản xạ ngôn ngữ:' }}
              </p>

              <!-- Huy hiệu Cấp độ to nổi bật -->
              <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#7D6853] text-white shadow-xs">
                <app-icon name="award" [size]="16" svgClass="text-amber-300"></app-icon>
                <span class="font-serif text-sm sm:text-base font-bold tracking-widest uppercase">
                  CEFR Level {{ certificate.cefrLevel }}
                </span>
              </div>

              <!-- Các chỉ số đã làm chủ -->
              <div class="grid grid-cols-2 gap-3 max-w-sm mx-auto pt-1 text-center text-xs">
                <div class="bg-white/80 p-2 rounded border border-[#E5DED3]">
                  <strong class="font-mono text-sm font-bold text-[#2D2823] block">{{ certificate.masteredWordsCount }} từ</strong>
                  <span class="text-[9px] text-[#746B60]">Vốn từ đã tinh thông</span>
                </div>
                <div class="bg-white/80 p-2 rounded border border-[#E5DED3]">
                  <strong class="font-mono text-sm font-bold text-[#2D2823] block">{{ certificate.streakCount }} ngày</strong>
                  <span class="text-[9px] text-[#746B60]">Chuỗi học liên tục</span>
                </div>
              </div>
            </div>

            <!-- Footer Chứng chỉ: Mã tra cứu, ngày cấp và chữ ký -->
            <div class="pt-3 border-t border-[#E5DED3] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-left text-xs">
              <div>
                <span class="text-[8px] sm:text-[9px] uppercase tracking-wider text-[#746B60] block">Mã chứng chỉ điện tử</span>
                <span class="font-mono text-[11px] font-bold text-[#7D6853] block">
                  {{ isPreview ? 'VOC-' + certificate.cefrLevel + '-DRAFT-••••' : certificate.certificateCode }}
                </span>
                <span class="text-[9px] text-[#8C827A] block mt-0.5">
                  Ngày cấp: {{ certificate.issueDate | date:'dd/MM/yyyy' }}
                </span>
              </div>

              <div class="text-center sm:text-right">
                <span class="text-[8px] sm:text-[9px] uppercase tracking-wider text-[#746B60] block">Cơ quan thẩm định</span>
                <span class="font-serif text-[11px] font-bold text-[#2D2823] block">{{ certificate.approvedBy }}</span>
                <span 
                  *ngIf="!isPreview" 
                  class="text-[9px] text-emerald-700 font-semibold block mt-0.5"
                >
                  ✓ Đã xác thực trên CSDL
                </span>
                <span 
                  *ngIf="isPreview" 
                  class="text-[9px] text-amber-700 font-semibold block mt-0.5"
                >
                  ⏳ Đang tiến độ (Chưa cấp)
                </span>
              </div>
            </div>

          </div>
        </div>

        <!-- =========================================================================
             3. STICKY BOTTOM ACTION BAR: TẢI VỀ / IN ẤN & THÔNG BÁO BẢO VỆ
             ========================================================================= -->
        <div class="sticky bottom-0 z-30 px-4 sm:px-5 py-3 bg-[#FAF8F5] border-t border-[#E5DED3] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          <!-- Thông báo hướng dẫn ở góc trái -->
          <div class="text-xs text-[#5C5249] text-center sm:text-left">
            <div *ngIf="isPreview" class="inline-flex items-center gap-1.5 text-amber-900 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
              <app-icon name="lock" [size]="13" svgClass="text-amber-700"></app-icon>
              <span>Tiến độ hiện tại: <strong>{{ progressPercent }}%</strong>. Bạn cần đạt <strong>100%</strong> để tải chứng chỉ gốc.</span>
            </div>

            <div *ngIf="!isPreview" class="inline-flex items-center gap-1.5 text-emerald-900">
              <app-icon name="check" [size]="14" svgClass="text-emerald-700"></app-icon>
              <span>Chứng chỉ học thuật hợp lệ, hỗ trợ in A4 hoặc lưu file PDF.</span>
            </div>
          </div>

          <!-- Các nút hành động bên phải -->
          <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <!-- Nút Tải/In chỉ hoạt động khi KHÔNG PHẢI preview -->
            <button 
              *ngIf="!isPreview"
              type="button" 
              (click)="printCertificate()"
              class="flex-1 sm:flex-none py-2 px-4 rounded-[6px] bg-[#7D6853] hover:bg-[#685542] text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
            >
              <app-icon name="printer" [size]="14"></app-icon>
              <span>In / Lưu PDF</span>
            </button>

            <!-- Nút Khóa Tải Về khi ở chế độ preview -->
            <button 
              *ngIf="isPreview"
              type="button" 
              disabled
              class="flex-1 sm:flex-none py-2 px-3.5 rounded-[6px] bg-stone-200 text-stone-500 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed opacity-75"
              title="Cần đạt 100% tiến độ để mở khóa tải về"
            >
              <app-icon name="lock" [size]="13"></app-icon>
              <span>Khóa tải về</span>
            </button>

            <!-- Nút Đóng -->
            <button 
              type="button" 
              (click)="closeModal()"
              class="py-2 px-4 rounded-[6px] bg-[#FAF8F5] hover:bg-[#E5DED3] text-[#2D2823] font-semibold text-xs border border-[#E5DED3] cursor-pointer transition-colors active:scale-95"
            >
              Đóng
            </button>
          </div>

        </div>

      </div>
    </div>
  `,
  styles: [`
    @media print {
      /* Khi in ấn: Nếu là preview thì KHÔNG CHO PHÉP IN */
      .is-preview {
        display: none !important;
      }
      
      body * {
        visibility: hidden;
      }
      #printable-certificate:not(.is-preview), #printable-certificate:not(.is-preview) * {
        visibility: visible;
      }
      #printable-certificate:not(.is-preview) {
        position: fixed;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 40px !important;
        border: 4px double #7D6853 !important;
        background-color: #FAF7F2 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  `]
})
export class CertificateModalComponent {
  @Input() certificate: Certificate | null = null;
  @Input() isPreview: boolean = false;
  @Input() progressPercent: number = 0;
  @Input() isCelebration: boolean = false;
  @Output() close = new EventEmitter<void>();

  closeModal() {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent) {
    // Đóng khi click vào vùng mờ bên ngoài
    this.closeModal();
  }

  @HostListener('window:keydown.escape')
  onEscapeKey() {
    if (this.certificate) {
      this.closeModal();
    }
  }

  @HostListener('contextmenu', ['$event'])
  onContextMenu(event: MouseEvent) {
    if (this.isPreview) {
      // Chống click chuột phải sao chép / lưu ảnh khi ở chế độ xem trước
      event.preventDefault();
    }
  }

  printCertificate() {
    if (this.isPreview) {
      return;
    }
    window.print();
  }
}


import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpeechService, SpeechTokenFeedback } from '../../services/speech.service';
import { UserStudyService } from '../../services/user-study.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-speech-scorer-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <!-- MODAL OVERLAY BACKDROP -->
    <div 
      *ngIf="speech.isOpen()" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-fade-in"
      (click)="speech.closeSpeechModal()"
    >
      <!-- MODAL CONTENT BOX -->
      <div 
        class="relative w-full max-w-xl rounded-3xl bg-white border border-[#E5DED3] shadow-[0_16px_50px_rgba(45,40,35,0.14)] overflow-hidden flex flex-col my-auto max-h-[92vh]"
        (click)="$event.stopPropagation()"
      >
        <!-- TOP HEADER: BADGE & CLOSE BUTTON -->
        <div class="px-6 py-4 bg-[#FAF8F5] border-b border-[#E5DED3] flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-[#7D6853] text-white flex items-center justify-center shadow-xs">
              <app-icon name="mic" [size]="16" svgClass="text-amber-200"></app-icon>
            </div>
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-[#7D6853] block">
                Trợ lý luyện phát âm AI
              </span>
              <h3 class="font-serif font-bold text-base text-[#2D2823] leading-none mt-0.5">
                {{ speech.contextTitle() }}
              </h3>
            </div>
          </div>

          <button 
            type="button" 
            (click)="speech.closeSpeechModal()"
            class="w-8 h-8 rounded-full border border-[#E5DED3] bg-white hover:bg-[#FAF8F5] text-[#5C5249] hover:text-[#2D2823] flex items-center justify-center cursor-pointer transition-colors"
            title="Đóng cửa sổ"
          >
            <app-icon name="x" [size]="14"></app-icon>
          </button>
        </div>

        <!-- MODAL BODY SCROLLABLE -->
        <div class="p-6 overflow-y-auto space-y-6 max-h-[calc(92vh-130px)]">

          <!-- 1. THẺ MẪU TỪ VỰNG HOẶC CÂU CẦN ĐỌC -->
          <div class="rounded-2xl border border-[#E5DED3] bg-[#FAF8F5] p-5 text-center space-y-3 relative overflow-hidden">
            
            <div class="flex items-center justify-between text-xs text-[#5C5249]">
              <span class="px-2.5 py-0.5 rounded-md bg-[#E5DED3]/60 text-[#7D6853] text-[10px] font-bold uppercase tracking-wider">
                {{ speech.mode() === 'WORD' ? 'Từ vựng mục tiêu' : 'Câu luyện tập' }}
              </span>
              
              <!-- Nút nghe phát âm chuẩn bản xứ -->
              <button 
                type="button"
                (click)="studyService.speakWord(speech.targetText())"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white hover:bg-stone-50 border border-[#E5DED3] text-[#7D6853] font-sans font-semibold text-xs shadow-xs transition-all cursor-pointer"
              >
                <app-icon name="volume-2" [size]="13"></app-icon>
                <span>Nghe phát âm</span>
              </button>
            </div>

            <!-- Target Text Lớn Rõ Ràng (Newsreader font-serif) -->
            <div class="space-y-1.5">
              <h2 class="font-serif font-bold text-3xl sm:text-4xl text-[#2D2823] tracking-tight leading-snug">
                {{ speech.targetText() }}
              </h2>
              <p *ngIf="speech.targetIpa()" class="font-mono text-xs sm:text-sm text-[#7D6853] font-semibold">
                {{ speech.targetIpa() }}
              </p>
            </div>

            <!-- Nghĩa tiếng Việt -->
            <p *ngIf="speech.targetMeaning()" class="text-xs text-[#5C5249] font-sans border-t border-[#E5DED3]/80 pt-2.5 max-w-md mx-auto">
              Ý nghĩa: <strong class="text-[#2D2823] font-semibold">{{ speech.targetMeaning() }}</strong>
            </p>

          </div>

          <!-- 2. TRUNG TÂM NÚT MICROPHONE THU ÂM -->
          <div class="text-center space-y-3 py-1">
            
            <div class="relative inline-flex items-center justify-center">
              <!-- Sóng âm thanh lan tỏa khi đang thu âm -->
              <div 
                *ngIf="speech.isListening()"
                class="absolute inset-0 rounded-full bg-rose-500/20 animate-ping pointer-events-none scale-125"
              ></div>
              <div 
                *ngIf="speech.isListening()"
                class="absolute -inset-2 rounded-full border-2 border-rose-400 animate-pulse pointer-events-none"
              ></div>

              <!-- Nút tròn Mic chính (Scandinavian Wood Brown / Rose Accent) -->
              <button
                type="button"
                (click)="toggleListening()"
                class="relative w-20 h-20 rounded-full text-white flex flex-col items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border-0 select-none active:scale-95"
                [ngClass]="{
                  'bg-[#7D6853] hover:bg-[#685542]': !speech.isListening(),
                  'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25': speech.isListening()
                }"
              >
                <app-icon name="mic" [size]="28" svgClass="text-white"></app-icon>
              </button>
            </div>

            <!-- Trạng thái hướng dẫn -->
            <div>
              <p class="font-sans font-bold text-sm text-[#2D2823]">
                {{ speech.isListening() ? 'Đang lắng nghe... Hãy nói ngay bây giờ!' : 'Nhấp vào Microphone để đọc' }}
              </p>
              <p class="text-xs text-[#5C5249] mt-0.5">
                {{ speech.isListening() ? 'Bấm lại để dừng thu âm hoặc đợi AI tự nhận diện' : 'Hệ thống AI sẽ phân tích âm vị và chấm điểm theo thang 0 - 100 điểm' }}
              </p>
            </div>

            <!-- Transcript hiển thị thời gian thực khi đang nói -->
            <div *ngIf="speech.interimTranscript() || speech.isListening()" class="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/90 max-w-md mx-auto text-xs">
              <span class="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">Bạn đang nói:</span>
              <p class="font-serif font-bold text-base text-[#2D2823] mt-0.5 italic">
                "{{ speech.interimTranscript() || '...' }}"
              </p>
            </div>

            <!-- Cảnh báo nếu gặp lỗi quyền Mic -->
            <div *ngIf="speech.hasPermissionError()" class="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-left max-w-md mx-auto space-y-1">
              <div class="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                <app-icon name="alert-triangle" [size]="14"></app-icon>
                <span>Cần Cấp Quyền Microphone</span>
              </div>
              <p class="text-[11px] text-rose-700 leading-snug">
                {{ speech.hasPermissionError() }}
              </p>
            </div>

          </div>

          <!-- 3. KẾT QUẢ ĐÁNH GIÁ PHÁT ÂM CỦA AI (CHỈ HIỆN SAU KHI ĐÃ CHẤM ĐIỂM) -->
          <div *ngIf="speech.score() !== null" class="space-y-4 animate-fade-in">
            
            <div 
              class="rounded-3xl border p-5 text-center space-y-3"
              [class.bg-emerald-50/70]="speech.score()! >= 85"
              [class.border-emerald-200]="speech.score()! >= 85"
              [class.bg-amber-50/70]="speech.score()! >= 55 && speech.score()! < 85"
              [class.border-amber-200]="speech.score()! >= 55 && speech.score()! < 85"
              [class.bg-rose-50/70]="speech.score()! < 55"
              [class.border-rose-200]="speech.score()! < 55"
            >
              <!-- Điểm số thang 100 -->
              <div class="inline-flex items-center justify-center w-20 h-20 rounded-full border-3 shadow-xs bg-white"
                [class.border-emerald-500]="speech.score()! >= 85"
                [class.text-emerald-700]="speech.score()! >= 85"
                [class.border-amber-500]="speech.score()! >= 55 && speech.score()! < 85"
                [class.text-amber-700]="speech.score()! >= 55 && speech.score()! < 85"
                [class.border-rose-500]="speech.score()! < 55"
                [class.text-rose-700]="speech.score()! < 55"
              >
                <div class="text-center">
                  <span class="font-serif font-black text-2xl leading-none block">{{ speech.score() }}</span>
                  <span class="text-[9px] font-bold uppercase tracking-wider block opacity-70">/ 100</span>
                </div>
              </div>

              <!-- Nhận xét chi tiết -->
              <div>
                <span 
                  class="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-2xs"
                  [class.bg-emerald-600]="speech.score()! >= 85"
                  [class.text-white]="true"
                  [class.bg-amber-600]="speech.score()! >= 55 && speech.score()! < 85"
                  [class.bg-rose-600]="speech.score()! < 55"
                >
                  {{ speech.score()! >= 90 ? 'Xuất Sắc! (Native Like)' : speech.score()! >= 75 ? 'Rất Tốt (Fluent)' : speech.score()! >= 55 ? 'Khá Ổn (Good Effort)' : 'Cần Luyện Thêm' }}
                </span>
                <p class="text-xs font-medium text-[#2D2823] mt-2 max-w-md mx-auto leading-relaxed">
                  {{ speech.feedbackMessage() }}
                </p>
              </div>

              <!-- PHÂN TÍCH TỪNG TỪ CỦA CÂU VỚI MÀU SẮC TRỰC QUAN -->
              <div *ngIf="speech.detailedFeedback().length > 0" class="pt-2 border-t border-[#E5DED3]">
                <span class="text-[10px] text-[#5C5249] font-bold uppercase tracking-wider block mb-2">
                  Chi tiết âm vị nhận diện:
                </span>
                <div class="flex flex-wrap items-center justify-center gap-1.5">
                  <span
                    *ngFor="let token of speech.detailedFeedback()"
                    class="px-2.5 py-1 rounded-xl text-xs font-sans font-semibold border flex items-center gap-1 shadow-2xs"
                    [class.bg-emerald-50]="token.status === 'CORRECT'"
                    [class.border-emerald-300]="token.status === 'CORRECT'"
                    [class.text-emerald-900]="token.status === 'CORRECT'"
                    [class.bg-amber-50]="token.status === 'CLOSE'"
                    [class.border-amber-300]="token.status === 'CLOSE'"
                    [class.text-amber-900]="token.status === 'CLOSE'"
                    [class.bg-rose-50]="token.status === 'MISSED'"
                    [class.border-rose-300]="token.status === 'MISSED'"
                    [class.text-rose-900]="token.status === 'MISSED'"
                    [title]="token.phoneticHint || 'Phát âm chuẩn'"
                  >
                    <app-icon 
                      [name]="token.status === 'CORRECT' ? 'check' : token.status === 'CLOSE' ? 'sparkles' : 'x'" 
                      [size]="11"
                    ></app-icon>
                    <span>{{ token.word }}</span>
                  </span>
                </div>
              </div>

            </div>

          </div>

        </div>

        <!-- FOOTER ACTIONS -->
        <div class="px-6 py-4 bg-[#FAF8F5] border-t border-[#E5DED3] flex items-center justify-between">
          <button
            type="button"
            (click)="speech.closeSpeechModal()"
            class="px-4 py-2 rounded-xl border border-[#E5DED3] bg-white hover:bg-[#FAF8F5] text-[#5C5249] hover:text-[#2D2823] font-sans font-semibold text-xs cursor-pointer shadow-xs transition-all"
          >
            Đóng
          </button>

          <button
            type="button"
            (click)="speech.startListening()"
            class="px-5 py-2 rounded-xl bg-[#7D6853] hover:bg-[#685542] text-white font-sans font-semibold text-xs shadow-xs cursor-pointer border-0 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <app-icon name="mic" [size]="14" svgClass="text-white"></app-icon>
            <span>Đọc Lại Lần Nữa</span>
          </button>
        </div>

      </div>
    </div>
  `
})
export class SpeechScorerModalComponent {
  speech = inject(SpeechService);
  studyService = inject(UserStudyService);

  toggleListening() {
    if (this.speech.isListening()) {
      this.speech.stopListening();
    } else {
      this.speech.startListening();
    }
  }
}

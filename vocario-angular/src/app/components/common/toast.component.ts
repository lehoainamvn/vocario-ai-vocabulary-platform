import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';
import { Toast } from '../../models/toast.model';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Global Floating Toast Container -->
    <div 
      class="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      <div 
        *ngFor="let toast of toastService.toasts()" 
        class="pointer-events-auto w-full bg-white/95 backdrop-blur-md rounded-2xl border p-4 shadow-[0_8px_30px_rgba(45,40,35,0.08)] transition-all duration-300 animate-toast-in flex items-start gap-3 relative overflow-hidden"
        [ngClass]="{
          'border-emerald-200/90': toast.type === 'success',
          'border-rose-200/90': toast.type === 'error',
          'border-amber-200/90': toast.type === 'warning',
          'border-[#E5DED3]': toast.type === 'info'
        }"
      >
        <!-- Left Color Accent Indicator -->
        <div 
          class="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          [ngClass]="{
            'bg-emerald-600': toast.type === 'success',
            'bg-rose-500': toast.type === 'error',
            'bg-amber-500': toast.type === 'warning',
            'bg-[#7D6853]': toast.type === 'info'
          }"
        ></div>

        <!-- Status Icon Box -->
        <div 
          class="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center border"
          [ngClass]="{
            'bg-emerald-50 text-emerald-700 border-emerald-200': toast.type === 'success',
            'bg-rose-50 text-rose-700 border-rose-200': toast.type === 'error',
            'bg-amber-50 text-amber-700 border-amber-200': toast.type === 'warning',
            'bg-[#FAF8F5] text-[#7D6853] border-[#E5DED3]': toast.type === 'info'
          }"
        >
          <!-- Success: Checkmark -->
          <svg *ngIf="toast.type === 'success'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>

          <!-- Error: Alert Circle -->
          <svg *ngIf="toast.type === 'error'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>

          <!-- Warning: Triangle Alert -->
          <svg *ngIf="toast.type === 'warning'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>

          <!-- Info: Info Circle -->
          <svg *ngIf="toast.type === 'info'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>

        <!-- Content Area -->
        <div class="flex-1 min-w-0 pr-1">
          <div 
            *ngIf="toast.title" 
            class="font-sans font-bold text-xs tracking-tight mb-0.5 text-[#2D2823]"
          >
            {{ toast.title }}
          </div>
          <div 
            class="text-xs leading-relaxed font-sans text-[#5C5249]"
          >
            {{ toast.message }}
          </div>
        </div>

        <!-- Close Button (X) -->
        <button 
          type="button" 
          (click)="toastService.remove(toast.id)"
          class="flex-shrink-0 text-[#8C827A] hover:text-[#2D2823] w-6 h-6 rounded-lg flex items-center justify-center hover:bg-[#FAF8F5] transition-colors cursor-pointer border-0 bg-transparent p-0"
          title="Đóng thông báo"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  `
})
export class ToastContainerComponent {
  constructor(public toastService: ToastService) {}
}

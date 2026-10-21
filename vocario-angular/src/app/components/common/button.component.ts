import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      (click)="btnClick.emit($event)"
      [class]="computedClasses"
    >
      <span *ngIf="loading" class="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
      <ng-content></ng-content>
    </button>
  `
})
export class ButtonComponent {
  @Input() variant: 'primary' | 'yellow' | 'outline' | 'secondary' | 'ghost' = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading = false;
  @Input() customClass = '';
  @Output() btnClick = new EventEmitter<MouseEvent>();

  get computedClasses(): string {
    const base = 'font-sans font-medium rounded-full transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap select-none';

    const variants = {
      // 1. Primary: Nâu gỗ ấm Scandinavian (#7D6853)
      primary: 'bg-[#7D6853] hover:bg-[#685542] text-white shadow-xs hover:shadow-sm',
      // 2. Yellow: Vàng điểm nhấn tag / highlight
      yellow: 'bg-[#F7D147] hover:bg-[#E8BF30] text-[#1A1612] font-semibold shadow-xs hover:shadow-sm',
      // 3. Outline: Viền mảnh thanh lịch Scandinavian
      outline: 'bg-transparent hover:bg-[#FAF8F5] text-[#7D6853] border border-[#E5DED3]',
      // 4. Secondary: Nền be ấm
      secondary: 'bg-[#FAF8F5] hover:bg-[#F2ECE1] text-[#2D2823] border border-[#E5DED3]',
      // 5. Ghost: Trong suốt
      ghost: 'bg-transparent hover:bg-[#2D2823]/5 text-[#2D2823]'
    };

    const sizes = {
      sm: 'px-3.5 py-1.5 text-xs',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-7 py-3 text-base font-semibold'
    };

    return `${base} ${variants[this.variant]} ${sizes[this.size]} ${this.customClass}`;
  }
}

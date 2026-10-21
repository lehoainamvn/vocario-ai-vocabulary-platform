import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span [class]="computedClasses">
      <ng-content></ng-content>
    </span>
  `
})
export class BadgeComponent {
  @Input() variant: 'yellow' | 'dark' | 'cream' | 'teal' | 'outline' = 'cream';
  @Input() customClass = '';

  get computedClasses(): string {
    const base = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide select-none';

    const variants = {
      yellow: 'bg-[#F7D147]/90 text-[#1A1612] border border-[#E8BF30]',
      dark: 'bg-[#2D2823] text-white',
      cream: 'bg-[#FAF8F5] text-[#7D6853] border border-[#E5DED3]',
      teal: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
      outline: 'bg-transparent text-[#7D6853] border border-[#E5DED3]'
    };

    return `${base} ${variants[this.variant]} ${this.customClass}`;
  }
}

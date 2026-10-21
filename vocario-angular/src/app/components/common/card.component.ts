import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [class]="computedClasses">
      <ng-content></ng-content>
    </div>
  `
})
export class CardComponent {
  @Input() customClass = '';
  @Input() rounded: 'xl' | '2xl' | '3xl' | '4xl' = '3xl';
  @Input() surface: 'white' | 'cream' | 'subtle' = 'white';

  get computedClasses(): string {
    const roundings = {
      xl: 'rounded-xl',
      '2xl': 'rounded-2xl',
      '3xl': 'rounded-3xl',
      '4xl': 'rounded-[32px] md:rounded-[40px]'
    };

    const surfaces = {
      white: 'bg-[#FFFFFF] border border-[#E5DED3] shadow-[0_4px_20px_rgba(45,40,35,0.04)]',
      cream: 'bg-[#FAF8F5] border border-[#E5DED3] shadow-xs',
      subtle: 'bg-[#F2ECE1]/60 border border-[#E5DED3]'
    };

    return `${surfaces[this.surface]} ${roundings[this.rounded]} ${this.customClass}`;
  }
}

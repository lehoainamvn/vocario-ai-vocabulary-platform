import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-card-box',
  standalone: true,
  imports: [CommonModule, IconComponent],
  template: `
    <div class="bg-white rounded-3xl border border-[#E5DED3] p-5 shadow-xs" [class]="customClass">
      <!-- Header Thẻ Chuẩn -->
      <div *ngIf="tag || hintText" class="flex items-center justify-between pb-3 mb-3 border-b border-[#E5DED3]">
        <!-- Tag Danh Mục Thẻ -->
        <span *ngIf="tag" class="text-[10px] font-bold uppercase tracking-wider text-[#7D6853] bg-[#FAF8F5] px-2.5 py-0.5 rounded-md border border-[#E5DED3]">
          {{ tag }}
        </span>

        <!-- Chú Thích / Số Lượng Phía Phải -->
        <span *ngIf="hintText" class="text-xs text-[#5C5249] flex items-center gap-1 font-medium">
          <app-icon *ngIf="hintIcon" [name]="hintIcon" [size]="13" svgClass="text-[#7D6853]"></app-icon>
          <span>{{ hintText }}</span>
        </span>
      </div>

      <!-- Thân Thẻ -->
      <ng-content></ng-content>
    </div>
  `
})
export class CardBoxComponent {
  @Input() tag?: string;
  @Input() hintText?: string;
  @Input() hintIcon?: string;
  @Input() customClass = '';
}

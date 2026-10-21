import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-word-tag',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      (click)="handleClick($event)"
      type="button"
      [class]="customClasses"
      class="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F7D147] hover:bg-[#E8BF30] text-[#1A1612] shadow-[0_2px_8px_rgba(0,0,0,0.16)] hover:shadow-md cursor-pointer transition-all duration-150 active:scale-95 border border-[#E8BF30]/60 select-none"
      [title]="'Bấm để nghe phát âm: ' + word"
    >
      <!-- Speaker vector SVG icon -->
      <svg class="w-3.5 h-3.5 text-[#1A1612]/70 group-hover:text-[#1A1612] transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      </svg>

      <!-- Word Text (Bold Black Sans-serif) -->
      <span class="font-sans font-bold text-xs sm:text-sm tracking-tight text-[#1A1612] leading-none">
        {{ word }}
      </span>

      <!-- Optional IPA Phonetic -->
      <span *ngIf="ipa" class="text-[10px] font-mono opacity-70 leading-none">
        {{ ipa }}
      </span>
    </button>
  `
})
export class WordTagComponent {
  @Input() word = 'sofa';
  @Input() ipa?: string;
  @Input() customClasses = '';
  @Output() tagClick = new EventEmitter<string>();

  handleClick(event: MouseEvent) {
    event.stopPropagation();
    this.tagClick.emit(this.word);
    this.speak(this.word);
  }

  private speak(text: string) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  }
}

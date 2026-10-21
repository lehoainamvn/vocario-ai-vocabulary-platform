import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'vocario_theme_mode';

  // Signal quản lý trạng thái Dark Mode phản ứng thời gian thực
  public isDarkMode = signal<boolean>(false);

  constructor() {
    this.initTheme();
  }

  /**
   * Khởi tạo theme từ localStorage hoặc thiết lập hệ điều hành
   */
  private initTheme(): void {
    if (typeof window === 'undefined') return;

    const savedTheme = localStorage.getItem(this.THEME_KEY) as ThemeMode | null;

    if (savedTheme) {
      this.setTheme(savedTheme === 'dark');
    } else {
      // Tự động nhận diện thiết lập Dark Mode của hệ điều hành
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark);
    }
  }

  /**
   * Chuyển đổi qua lại giữa chế độ Sáng (Light) và Tối (Dark)
   */
  public toggleTheme(): void {
    this.setTheme(!this.isDarkMode());
  }

  /**
   * Thiết lập chế độ cụ thể và lưu vào LocalStorage
   */
  public setTheme(isDark: boolean): void {
    this.isDarkMode.set(isDark);

    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.THEME_KEY, isDark ? 'dark' : 'light');
    }
  }
}

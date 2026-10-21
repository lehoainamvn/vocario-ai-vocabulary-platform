import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Vocario Standard Vector Icon System
 * Trích xuất và chuẩn hóa theo hệ thống biểu tượng nét mảnh (Lucide Outline) của KaChiKa.
 * 
 * Quy chuẩn:
 * - ViewBox: 0 0 24 24
 * - Stroke: currentColor (kế thừa màu từ class Tailwind)
 * - Stroke Width: 2 (mặc định)
 * - Stroke LineCap & LineJoin: round
 * - Fill: none
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      [class]="svgClass"
      [style.width.px]="size"
      [style.height.px]="size"
    >
      <!-- Sun (Theme Toggle) -->
      @if (name === 'sun') {
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2"/><path d="M12 20v2"/>
        <path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>
        <path d="M2 12h2"/><path d="M20 12h2"/>
        <path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
      }

      <!-- Moon (Dark Theme) -->
      @if (name === 'moon') {
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
      }

      <!-- Logout -->
      @if (name === 'logout') {
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      }

      <!-- Globe (Language Switcher) -->
      @if (name === 'globe') {
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
        <path d="M2 12h20"/>
      }

      <!-- Chevron Down -->
      @if (name === 'chevron-down') {
        <path d="m6 9 6 6 6-6"/>
      }

      <!-- Chevron Up -->
      @if (name === 'chevron-up') {
        <path d="m18 15-6-6-6 6"/>
      }

      <!-- Chevron Right -->
      @if (name === 'chevron-right') {
        <path d="m9 18 6-6-6-6"/>
      }

      <!-- Chevron Left -->
      @if (name === 'chevron-left') {
        <path d="m15 18-6-6 6-6"/>
      }

      <!-- Volume 2 (Audio Pronunciation) -->
      @if (name === 'volume-2' || name === 'audio' || name === 'sound') {
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      }

      <!-- Camera (Quét ảnh AI) -->
      @if (name === 'camera') {
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
        <circle cx="12" cy="13" r="3"/>
      }

      <!-- Layers (Bộ thẻ nhớ / Thẻ Flashcard) -->
      @if (name === 'layers') {
        <polygon points="12 2 2 7 12 12 22 7 12 2"/>
        <polyline points="2 17 12 22 22 17"/>
        <polyline points="2 12 12 17 22 12"/>
      }

      <!-- Sparkles (AI Detection) -->
      @if (name === 'sparkles') {
        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
      }

      <!-- Calendar (Lịch ôn tập Ebbinghaus) -->
      @if (name === 'calendar') {
        <path d="M8 2v4"/><path d="M16 2v4"/>
        <rect width="18" height="18" x="3" y="4" rx="2"/>
        <path d="M3 10h18"/>
      }

      <!-- Brain (Thuật toán SM-2) -->
      @if (name === 'brain') {
        <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
        <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
        <path d="M12 5v14"/>
      }

      <!-- Grid (Menu tính năng) -->
      @if (name === 'grid') {
        <rect width="7" height="7" x="3" y="3" rx="1"/>
        <rect width="7" height="7" x="14" y="3" rx="1"/>
        <rect width="7" height="7" x="14" y="14" rx="1"/>
        <rect width="7" height="7" x="3" y="14" rx="1"/>
      }

      <!-- Check (Đã thuộc từ) -->
      @if (name === 'check') {
        <polyline points="20 6 9 17 4 12"/>
      }

      <!-- Check Circle (Đã thành thạo) -->
      @if (name === 'check-circle') {
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      }

      <!-- Rotate Cw (Ôn lại) -->
      @if (name === 'rotate-cw') {
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
      }

      <!-- BookOpen (Từ điển) -->
      @if (name === 'book-open' || name === 'book') {
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      }

      <!-- Search (Tìm kiếm) -->
      @if (name === 'search') {
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.3-4.3"/>
      }

      <!-- Flame (Streak ngày học) -->
      @if (name === 'flame' || name === 'fire') {
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/>
      }

      <!-- Graduation Cap (Ôn tập SM-2) -->
      @if (name === 'graduation-cap' || name === 'study' || name === 'learn') {
        <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>
        <path d="M22 10v6"/>
        <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
      }

      <!-- Clock (Hàng đợi thẻ đến hạn) -->
      @if (name === 'clock') {
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      }

      <!-- Plus (Thêm từ) -->
      @if (name === 'plus') {
        <path d="M5 12h14"/>
        <path d="M12 5v14"/>
      }

      <!-- Plus Circle -->
      @if (name === 'plus-circle') {
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 12h8"/>
        <path d="M12 8v8"/>
      }

      <!-- X / Close (Đóng modal) -->
      @if (name === 'x' || name === 'close') {
        <path d="M18 6 6 18"/>
        <path d="m6 6 12 12"/>
      }

      <!-- Info (Thông tin) -->
      @if (name === 'info') {
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4"/>
        <path d="M12 8h.01"/>
      }

      <!-- Arrow Right -->
      @if (name === 'arrow-right') {
        <path d="M5 12h14"/>
        <path d="m12 5 7 7-7 7"/>
      }

      <!-- Arrow Left -->
      @if (name === 'arrow-left') {
        <path d="M19 12H5"/>
        <path d="m12 19-7-7 7-7"/>
      }

      <!-- Upload -->
      @if (name === 'upload') {
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" x2="12" y1="3" y2="15"/>
      }

      <!-- Download -->
      @if (name === 'download') {
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" x2="12" y1="3" y2="15"/>
      }

      <!-- Database (CSDL PostgreSQL) -->
      @if (name === 'database') {
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
        <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>
      }

      <!-- User (Người dùng) -->
      @if (name === 'user') {
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      }

      <!-- Image (Ảnh bối cảnh) -->
      @if (name === 'image') {
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
        <circle cx="9" cy="9" r="2"/>
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
      }

      <!-- Map Pin (Địa điểm / Bối cảnh) -->
      @if (name === 'pin' || name === 'map-pin') {
        <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>
        <circle cx="12" cy="10" r="3"/>
      }

      <!-- Target (Mục tiêu) -->
      @if (name === 'target') {
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      }

      <!-- Edit / Pencil -->
      @if (name === 'edit' || name === 'edit-3' || name === 'pencil') {
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
      }

      <!-- Trash (Xóa) -->
      @if (name === 'trash' || name === 'trash-2') {
        <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
      }


      <!-- Shuffle (Xáo trộn thẻ Flashcard) -->
      @if (name === 'shuffle') {
        <path d="m18 14 4 4-4 4"/>
        <path d="m18 2 4 4-4 4"/>
        <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22"/>
        <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2"/>
        <path d="M22 18h-5.974a4 4 0 0 1-3.3-1.7l-1.454-2.3"/>
      }

      <!-- List (Danh sách mục lục) -->
      @if (name === 'list') {
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      }

      <!-- Layout List -->
      @if (name === 'layout-list') {
        <rect width="7" height="7" x="3" y="3" rx="1"/>
        <rect width="7" height="7" x="3" y="14" rx="1"/>
        <path d="M14 4h7"/><path d="M14 9h7"/><path d="M14 15h7"/><path d="M14 20h7"/>
      }

      <!-- Folder / Danh mục -->
      @if (name === 'folder') {
        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>
      }

      <!-- Bookmark / Mục lục -->
      @if (name === 'bookmark') {
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
      }

      <!-- Bookmark Check (Đã lưu sổ tay) -->
      @if (name === 'bookmark-check') {
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
        <path d="m9 10 2 2 4-4"/>
      }

      <!-- X Circle -->
      @if (name === 'x-circle') {
        <circle cx="12" cy="12" r="10"/>
        <path d="m15 9-6 6"/>
        <path d="m9 9 6 6"/>
      }

      <!-- Bar Chart (Dashboard / Thống kê KPI) -->
      @if (name === 'bar-chart' || name === 'chart' || name === 'dashboard') {
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      }

      <!-- Users (Quản lý Học viên) -->
      @if (name === 'users') {
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      }

      <!-- Eye (Kiểm duyệt AI Vision) -->
      @if (name === 'eye') {
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
        <circle cx="12" cy="12" r="3"/>
      }

      <!-- Eye Off (Ẩn mật khẩu) -->
      @if (name === 'eye-off') {
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
        <line x1="2" x2="22" y1="2" y2="22"/>
      }

      <!-- Compass (Quản trị vận hành) -->
      @if (name === 'compass') {
        <circle cx="12" cy="12" r="10"/>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
      }

      <!-- Settings (Cấu hình hệ thống & SM-2) -->
      @if (name === 'settings' || name === 'gear') {
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
      }

      <!-- Shield (Bảo mật & Cổng Admin) -->
      @if (name === 'shield') {
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
      }

      <!-- File Text (Báo cáo / Dữ liệu xuất) -->
      @if (name === 'file-text') {
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
        <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
        <path d="M10 9H8"/>
        <path d="M16 13H8"/>
        <path d="M16 17H8"/>
      }

      <!-- Award (Thăng cấp / Phần thưởng) -->
      @if (name === 'award') {
        <circle cx="12" cy="8" r="6"/>
        <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
      }

      <!-- Trophy (Bảng vinh danh học viên) -->
      @if (name === 'trophy' || name === 'trophy-cup') {
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
      }

      <!-- Activity (Học lực / Nhịp hoạt động) -->
      @if (name === 'activity') {
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      }

      <!-- Refresh Cw (Đặt lại / Reset) -->
      @if (name === 'refresh-cw') {
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M8 16H3v5"/>
      }

      <!-- User Check (Kích hoạt / Xác thực) -->
      @if (name === 'user-check') {
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <polyline points="16 11 18 13 22 9"/>
      }

      <!-- User X (Hủy / Khóa) -->
      @if (name === 'user-x') {
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <line x1="17" y1="8" x2="22" y2="13"/>
        <line x1="22" y1="8" x2="17" y2="13"/>
      }

      <!-- Log Out (Đăng xuất) -->
      @if (name === 'log-out') {
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" x2="9" y1="12" y2="12"/>
      }

      <!-- Sliders (Điều chỉnh tham số) -->
      @if (name === 'sliders') {
        <line x1="4" y1="21" x2="4" y2="14"/>
        <line x1="4" y1="10" x2="4" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="12"/>
        <line x1="12" y1="8" x2="12" y2="3"/>
        <line x1="20" y1="21" x2="20" y2="16"/>
        <line x1="20" y1="12" x2="20" y2="3"/>
        <line x1="1" y1="14" x2="7" y2="14"/>
        <line x1="9" y1="8" x2="15" y2="8"/>
        <line x1="17" y1="16" x2="23" y2="16"/>
      }

      <!-- Tag (Nhãn vật thể AI) -->
      @if (name === 'tag') {
        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/>
        <path d="M7 7h.01"/>
      }

      <!-- CPU (Bộ xử lý AI & SM-2) -->
      @if (name === 'cpu') {
        <rect x="4" y="4" width="16" height="16" rx="2"/>
        <rect x="9" y="9" width="6" height="6"/>
        <path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/>
        <path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/>
      }

      <!-- Crown (Top 1 Quán Quân) -->
      @if (name === 'crown') {
        <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.203a4 4 0 0 1-3.86 2.928H8.713a4 4 0 0 1-3.86-2.928L2.019 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/>
      }

      <!-- Medal (Top 2, Top 3 Huy Chương) -->
      @if (name === 'medal') {
        <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/>
        <path d="M11 12 5.12 2.2"/>
        <path d="m13 12 5.88-9.8"/>
        <circle cx="12" cy="17" r="5"/>
      }

      <!-- Trending Up (Bứt phá thứ hạng) -->
      @if (name === 'trending-up') {
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      }

      <!-- Gamepad (Mini-game Quiz) -->
      @if (name === 'gamepad' || name === 'game') {
        <line x1="6" x2="10" y1="12" y2="12"/>
        <line x1="8" x2="8" y1="10" y2="14"/>
        <line x1="15" x2="15.01" y1="13" y2="13"/>
        <line x1="18" x2="18.01" y1="11" y2="11"/>
        <rect width="20" height="12" x="2" y="6" rx="6"/>
      }

      <!-- Quiz (Figma icon) -->
      @if (name === 'quiz') {
        <path d="M4 5h16v14H4Z"/>
        <path d="M8 9h8M8 13h5"/>
      }

      <!-- Play (Bắt đầu chơi) -->
      @if (name === 'play') {
        <polygon points="6 3 20 12 6 21 6 3"/>
      }

      <!-- Crosshair (Tâm ngắm tìm đồ vật) -->
      @if (name === 'crosshair') {
        <circle cx="12" cy="12" r="10"/>
        <line x1="22" x2="18" y1="12" y2="12"/>
        <line x1="6" x2="2" y1="12" y2="12"/>
        <line x1="12" x2="12" y1="6" y2="2"/>
        <line x1="12" x2="12" y1="22" y2="18"/>
      }

      <!-- Zap (Tốc độ phản xạ / Điểm thưởng) -->
      @if (name === 'zap' || name === 'lightning' || name === 'bolt') {
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      }

      <!-- Alert Triangle (Cảnh báo / Phạt) -->
      @if (name === 'alert-triangle' || name === 'warning') {
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line x1="12" x2="12" y1="9" y2="13"/>
        <line x1="12" x2="12.01" y1="17" y2="17"/>
      }

      <!-- Microphone (Thu âm & Luyện nói AI) -->
      @if (name === 'mic' || name === 'microphone') {
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" x2="12" y1="19" y2="22"/>
      }

      <!-- Mic Off (Tắt mic) -->
      @if (name === 'mic-off') {
        <line x1="2" x2="22" y1="2" y2="22"/>
        <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
        <path d="M5 10v2a7 7 0 0 0 12 5"/>
        <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/>
        <path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
        <line x1="12" x2="12" y1="19" y2="22"/>
      }

      <!-- Shuffle (Xáo trộn thẻ) -->
      @if (name === 'shuffle') {
        <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.6-8.6c.8-1.1 2-1.7 3.3-1.7H22"/>
        <path d="m18 2 4 4-4 4"/>
        <path d="M2 6h1.4c1.3 0 2.5.6 3.3 1.7l1.7 2.2"/>
        <path d="m14.6 13.9 1.7 2.2c.8 1.1 2 1.7 3.3 1.7H22"/>
        <path d="m18 22 4-4-4-4"/>
      }

      <!-- Target (Mục tiêu) -->
      @if (name === 'target') {
        <circle cx="12" cy="12" r="10"/>
        <circle cx="12" cy="12" r="6"/>
        <circle cx="12" cy="12" r="2"/>
      }

      <!-- Refresh Cw / Repeat (Lặp lại / Chuỗi liên tiếp) -->
      @if (name === 'refresh-cw' || name === 'repeat') {
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
        <path d="M3 21v-5h5"/>
      }

      <!-- Lightbulb (Gợi ý) -->
      @if (name === 'lightbulb' || name === 'hint') {
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
        <path d="M9 18h6"/>
        <path d="M10 22h4"/>
      }

      <!-- Help Circle (Trợ giúp) -->
      @if (name === 'help-circle' || name === 'help' || name === 'question') {
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" x2="12.01" y1="17" y2="17"/>
      }

      <!-- Star (Ngôi sao vinh danh) -->
      @if (name === 'star') {
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      }

      <!-- Message Square / Chat (Ứng dụng hội thoại) -->
      @if (name === 'message-square' || name === 'chat' || name === 'message') {
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      }

      <!-- Globe Grid (Mạng lưới toàn cầu / Khắc sâu) -->
      @if (name === 'globe-grid') {
        <circle cx="12" cy="12" r="9"/>
        <path d="M3 12h18"/>
        <path d="M12 3a14 14 0 0 1 0 18"/>
        <path d="M12 3a14 14 0 0 0 0 18"/>
      }

      <!-- Trash / Trash-2 (Xóa dữ liệu) -->
      @if (name === 'trash' || name === 'trash-2' || name === 'delete') {
        <path d="M3 6h18"/>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        <line x1="10" x2="10" y1="11" y2="17"/>
        <line x1="14" x2="14" y1="11" y2="17"/>
      }

      <!-- Share-2 (Chia sẻ phòng học / bộ từ vựng) -->
      @if (name === 'share-2' || name === 'share') {
        <circle cx="18" cy="5" r="3"/>
        <circle cx="6" cy="12" r="3"/>
        <circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      }

      <!-- Scan Text / Document Scanner -->
      @if (name === 'scan' || name === 'scan-text') {
        <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
        <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
        <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
        <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
        <path d="M7 8h10"/>
        <path d="M7 12h10"/>
        <path d="M7 16h6"/>
      }

      <!-- Tablet / Smartphone / Flashcard card -->
      @if (name === 'tablet' || name === 'device') {
        <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
        <line x1="12" x2="12.01" y1="18" y2="18"/>
      }

      <!-- Crosshair / Reflex Target -->
      @if (name === 'crosshair' || name === 'target-crosshair') {
        <circle cx="12" cy="12" r="10"/>
        <line x1="22" x2="18" y1="12" y2="12"/>
        <line x1="6" x2="2" y1="12" y2="12"/>
        <line x1="12" x2="12" y1="2" y2="6"/>
        <line x1="12" x2="12" y1="18" y2="22"/>
        <circle cx="12" cy="12" r="3"/>
      }

      <!-- Panel / Admin Console -->
      @if (name === 'panel-admin' || name === 'admin-panel' || name === 'layout-panel') {
        <rect width="18" height="15" x="3" y="4.5" rx="2.5"/>
        <line x1="7" x2="11" y1="9" y2="9"/>
        <line x1="7" x2="17" y1="13" y2="13"/>
      }
    </svg>
  `
})
export class IconComponent {
  @Input() name: string = 'sparkles';
  @Input() size: number = 18;
  @Input() strokeWidth: number = 2;
  @Input() svgClass: string = 'inline-block flex-shrink-0';
}

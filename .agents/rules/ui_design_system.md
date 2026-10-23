# VOCARIO UI STYLE & SCANDINAVIAN DESIGN SYSTEM RULES
This rule is active at all times when modifying or creating frontend components in Vocario.
All UI implementations must strictly adhere to the Scandinavian Editorial Design System of Vocario.

## 1. Color Tokens (Hệ Thống Màu Sắc)
- Main Page Background: `#F8F6F1` (Washi linen warm beige canvas)
- Main Card Background: `#FFFFFF` (Crisp white surface)
- Sub Card / Modal Header / Pill Background: `#FAF8F5` (Subtle warm cream)
- Delicate Border & Separator: `#E5DED3` (1px solid subtle border)
- Primary Brand Color: `#7D6853` (Scandinavian wood brown; hover: `#685542`, active: `#544434`)
- Highlight / Accent Tag: `#F7D147` (Warm amber accent; hover: `#E8BF30`)
- Main Text / Headings: `#2D2823` (Charcoal dark)
- Muted / Secondary Text: `#5C5249` (Soft warm gray)
- Status Green: Emerald `#059669` / `#10B981` (bg: `bg-emerald-50`, border: `border-emerald-200`)
- Status Red / Warning: Rose `#E11D48` / Amber `#D97706`

## 2. Typography & Fonts (Hệ Phông Chữ Tương Phản Kép)
- **Editorial Headings & Hero Titles**: `"Newsreader", Georgia, Cambria, serif` (`font-serif`).
  - H1 Display: `font-serif font-bold text-3xl sm:text-4xl text-[#2D2823] tracking-tight`
  - Modal / Card Section Title: `font-serif font-bold text-lg sm:text-xl text-[#2D2823]`
- **UI Controls, Forms & Descriptions**: `"Outfit", -apple-system, sans-serif` (`font-sans`).
  - Primary Button: `font-sans font-semibold text-xs sm:text-sm text-white bg-[#7D6853] hover:bg-[#685542] rounded-xl`
  - Badge / Tag Pill: `text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#7D6853] bg-[#FAF8F5] px-2.5 py-0.5 rounded-md border border-[#E5DED3]`
  - Body / Description: `text-xs text-[#5C5249] leading-relaxed font-sans`
- **Metrics, IPA & Codes**: `ui-monospace, monospace` (`font-mono`).

## 3. Border Radius & Shadows (Bo Góc & Đổ Bóng)
- Main Outer Cards: `rounded-3xl border border-[#E5DED3] shadow-xs`
- Child Viewports / Containers: `rounded-2xl border border-[#E5DED3]`
- Action Buttons: `rounded-xl`
- Badges / Tabs / Shutter / Floating Controls: `rounded-full`
- Shadows: Minimalist warm shadows only (`shadow-xs` hoặc `shadow-[0_4px_20px_rgba(45,40,35,0.06)]`). Cấm shadow đen nhòe rộng.

## 4. Shared Components Architecture (Quy Định Thành Phần Dùng Chung)
1. **Navbar Dual-Mode (`app-navbar`)**:
   - Khách (Guest): Logo Vocario font-serif, language switch `VI | EN`, text link `Đăng nhập`, pill `#7D6853` `Trải nghiệm ngay`.
   - Đã đăng nhập: Menu liên kết, Badge ngọn lửa streak (`🔥 7`), huy hiệu CEFR, Avatar tròn với dropdown menu tinh gọn.
2. **Auth Modal (`app-auth-modal`)**:
   - Header font-serif, Underline tabs tối giản viền cam/nâu `#7D6853`, input viền `#E5DED3`, 2 thẻ điền nhanh tài khoản demo `student1` và `admin`.
3. **Toast Notifications (`app-toast-container`)**:
   - Nền `#FFFFFF/95` backdrop-blur, viền `#E5DED3`, dải accent mép trái 4px, icon tròn tối giản.
4. **Speech Scorer Modal (`app-speech-scorer-modal`)**:
   - Từ vựng mẫu font-serif lớn, nút micro tròn màu nâu gỗ `#7D6853` (đỏ khi đang thu âm) kèm hiệu ứng lan tỏa sóng âm nhẹ nhàng, thẻ đánh giá âm vị viền `#E5DED3`.
5. **Icon System (`app-icon`)**:
   - Sử dụng 100% vector SVG Lucide nguyên bản (`globe-grid`, `message-square`, `camera`, `sparkles`, `flame`, `volume-2`, `mic`, `star`, `trophy`, v.v.).

## 5. Layout & Anti-Redundancy Rules (Bố Cục & Chống Dư Thừa)
- **2-Column Desktop Grid**: `grid grid-cols-1 lg:grid-cols-12 gap-6 items-start`
  - Left column (active viewer / stream): `lg:col-span-7`
  - Right column (sidebar cards / companion cards): `lg:col-span-5 space-y-4`
- **Không lặp lại các nút điều hướng từ Navbar**: Thanh Navbar cố định trên cùng đã hiển thị đầy đủ các liên kết chính (`Trang Chủ`, `Quét Ảnh`, `Bộ Sưu Tập`) và menu tài khoản (`Hồ Sơ`, `Đăng Xuất`).
- **Header-actions của PageShellComponent**: Tuyệt đối **KHÔNG** đặt các nút điều hướng trùng lặp vào vùng `header-actions`. Vùng này chỉ dành riêng cho các chỉ số trạng thái ngắn gọn hoặc hành động duy nhất của màn hình đó.
- **Empty States**: Luôn có Empty State với icon box `w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#E5DED3] text-[#7D6853]`, tiêu đề font-serif và hướng dẫn rõ ràng khi CSDL chưa có dữ liệu.

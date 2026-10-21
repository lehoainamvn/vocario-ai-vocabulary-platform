# VOCARIO UI DESIGN SYSTEM GUIDELINES & SPECIFICATION
> **Tiêu chuẩn thiết kế & Quy chuẩn đồng bộ giao diện toàn bộ hệ thống Vocario**  
> *Áp dụng bắt buộc cho tất cả các trang, modal, widget và components khi thêm mới hoặc chỉnh sửa giao diện.*

---

## 1. BẢNG MÀU CHUẨN (COLOR PALETTE & TOKENS)

Hệ thống màu Vocario lấy cảm hứng từ phong cách KaChiKa / Giấy Washi Nhật Bản tinh tế, sang trọng và hiện đại:

| Nhóm Màu | Tên Token / Class | Mã HEX | Mục Đích Sử Dụng |
| :--- | :--- | :--- | :--- |
| **Nền Trang** | `--color-brand-bg` | `#F8F6F1` | Nền toàn bộ trang web (kem ấm nhẹ) |
| **Thẻ Chính** | `--color-brand-card` | `#FFFFFF` | Nền các khối Card, Khung chứa nội dung |
| **Thẻ Phụ / Container** | `--color-brand-card-sub` | `#FAF7F2` | Nền ô icon, nền switch tab, nền badge nhãn |
| **Viền Khung & Kẻ Ngang** | `--color-brand-border` | `#EAE4D9` | Đường viền toàn bộ card, vách ngăn, divider |
| **Chủ Đạo (Primary)** | `--color-brand-brown` | `#7D6853` | Nâu ấm sang trọng: Nút CTA chính, Icon header, Badge |
| **Hover Primary** | `--color-brand-brown-dark` | `#685542` | Trạng thái hover / active của nút chính |
| **Điểm Nhấn Vàng** | `--color-brand-yellow` | `#F7D147` | Điểm nhấn AI, góc khung ngắm camera, tag từ vựng |
| **Chữ Chính (Text)** | `--color-brand-text` | `#2D2823` | Tiêu đề chính, văn bản quan trọng, heading |
| **Chữ Phụ (Muted)** | `--color-brand-muted` | `#5C5249` | Đoạn mô tả, chú thích, liên kết phụ, nhãn nhỏ |
| **Trạng Thái Xanh** | Emerald | `#059669` / `#10B981` | Trạng thái sẵn sàng ("● Camera Sẵn Sàng", badge xanh) |
| **Nền Đen Khung Ngắm** | Dark / Viewfinder | `#1C1917` (Stone 900) | Khung hiển thị video camera / ảnh chụp preview |

---

## 2. QUY CHUẨN TYPOGRAPHY (FONT & CHỮ)

### 2.1. Phông Chữ (Font Family)
* **Font Chủ Đạo:** `"Outfit", sans-serif` (hoặc `-apple-system, BlinkMacSystemFont, sans-serif`)
* Khai báo trong CSS: `--font-heading: "Outfit", sans-serif;` và `font-heading`

### 2.2. Kích Thước & Trọng Lượng Chữ (Typography Scale)

| Cấp Độ | Tailwind Classes | Màu Chữ | Ví Dụ Ứng Dụng |
| :--- | :--- | :--- | :--- |
| **Tiêu Đề Khối Lớn** | `font-heading font-extrabold text-lg sm:text-xl` | `#2D2823` | `"Chụp Ảnh Thực Tế Bằng Camera"` |
| **Tiêu Đề Thẻ Con** | `font-heading font-extrabold text-sm sm:text-base` | `#2D2823` | `"Chưa Có Từ Vựng"`, `"Chưa Có Đoạn Hội Thoại"` |
| **Chữ Nút Bấm Chính** | `font-heading font-bold text-xs sm:text-sm` | `#FFFFFF` | `"Quét Ngay Bối Cảnh AI"`, `"Bắt Đầu Luyện Nói"` |
| **Badge / Nhãn Tag** | `text-[10px] sm:text-[11px] font-bold uppercase tracking-wider` | `#7D6853` | `"STUDIO TRỰC TIẾP TẠI TRANG"`, `"TỪ VỰNG BỐI CẢNH"` |
| **Mô Tả Phụ (Body)** | `text-xs font-sans leading-relaxed` | `#5C5249` | Đoạn text giải thích bên dưới tiêu đề |
| **Ghi Chú Nhỏ / Hint** | `text-[11px] font-semibold` | `#5C5249` | `"Bấm nút tròn để chụp khung hình hiện tại"` |

---

## 3. BO GÓC & ĐỔ BÓNG (BORDER RADIUS & SHADOW)

* **Thẻ Bao Ngoài Lớn (Main Cards):** `rounded-3xl` (`24px`), `border border-[#EAE4D9]`, `shadow-xs`.
* **Khung Chứa Nội Dung Con / Khung Camera:** `rounded-2xl` (`16px`), `border border-[#EAE4D9]`.
* **Khối Icon Vuông Tròn:** `rounded-2xl` (`16px`), kích thước chuẩn `w-12 h-12`.
* **Nút Bấm Hình Chữ Nhật (Buttons):** `rounded-xl` (`12px`) hoặc `rounded-2xl` (`16px`).
* **Pill / Badge / Tab Switch / Nút Tròn:** `rounded-full` (`9999px`).

---

## 4. CHI TIẾT CÁC THÀNH PHẦN GIAO DIỆN (UI COMPONENTS SPECIFICATION)

### 4.1. Thanh Tiêu Đề Khối (Studio Header Bar)
```html
<div class="bg-white rounded-3xl border border-[#EAE4D9] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
  <!-- Bên trái: Icon + Tag + Tiêu Đề -->
  <div class="flex items-center gap-3.5">
    <div class="w-12 h-12 rounded-2xl bg-[#7D6853] text-white flex items-center justify-center shrink-0 shadow-xs">
      <app-icon name="camera" [size]="22" svgClass="text-white"></app-icon>
    </div>
    <div>
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-[11px] font-bold uppercase tracking-wider text-[#7D6853] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#EAE4D9]">
          STUDIO TRỰC TIẾP TẠI TRANG
        </span>
        <span class="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Camera Sẵn Sàng
        </span>
      </div>
      <h2 class="font-heading font-extrabold text-lg sm:text-xl text-[#2D2823] mt-0.5">
        Chụp Ảnh Thực Tế Bằng Camera
      </h2>
    </div>
  </div>

  <!-- Bên phải: Bộ chuyển Tab dạng Viên Thuốc (Segmented Control Pill) -->
  <div class="inline-flex p-1 rounded-full bg-[#FAF7F2] border border-[#EAE4D9]">
    <!-- Tab Active -->
    <button class="px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all border-0 flex items-center gap-1.5 bg-white text-[#2D2823] shadow-xs">
      <app-icon name="camera" [size]="14" svgClass="text-[#7D6853]"></app-icon>
      <span>Chụp Camera</span>
    </button>
    <!-- Tab Inactive -->
    <button class="px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all border-0 flex items-center gap-1.5 text-[#5C5249] hover:text-[#2D2823]">
      <app-icon name="upload" [size]="14" svgClass="text-[#5C5249]"></app-icon>
      <span>Tải File Từ Máy</span>
    </button>
  </div>
</div>
```

---

### 4.2. Bố Cục 2 Cột (12-Column Responsive Layout)
* **Cột Trái (7/12):** `lg:col-span-7 bg-white rounded-3xl border border-[#EAE4D9] p-4 sm:p-5 shadow-xs flex flex-col`
* **Cột Phải (5/12):** `lg:col-span-5 space-y-4`
* **Khoảng cách hàng/cột:** `gap-6`

---

### 4.3. Khung Ngắm Camera & Khung Xem Lại Ảnh (Left Column)
* **Khung chứa Viewfinder / Video:**
  ```html
  <div class="relative rounded-2xl overflow-hidden bg-stone-900 border border-[#EAE4D9] h-[280px] sm:h-[320px] flex items-center justify-center shadow-inner group">
    <video ... class="w-full h-full object-cover"></video>
    <!-- Khung ngắm 4 góc vàng -->
    <div class="absolute inset-4 sm:inset-5 border border-white/20 rounded-2xl pointer-events-none flex flex-col justify-between p-2.5">
      <div class="flex justify-between">
        <span class="w-5 h-5 border-t-2 border-l-2 border-[#F7D147] rounded-tl-lg"></span>
        <span class="w-5 h-5 border-t-2 border-r-2 border-[#F7D147] rounded-tr-lg"></span>
      </div>
      <div class="text-center text-[11px] font-semibold text-white/90 bg-black/50 py-1 px-3.5 rounded-full mx-auto backdrop-blur-xs shadow-md">
        Hướng camera về phía đồ vật xung quanh bạn
      </div>
      <div class="flex justify-between">
        <span class="w-5 h-5 border-b-2 border-l-2 border-[#F7D147] rounded-bl-lg"></span>
        <span class="w-5 h-5 border-b-2 border-r-2 border-[#F7D147] rounded-br-lg"></span>
      </div>
    </div>
  </div>
  ```

* **Nút Tròn Bấm Chụp (Shutter Button):**
  ```html
  <div class="flex flex-col items-center justify-center pt-1">
    <button class="w-14 h-14 rounded-full bg-white border-3 border-[#7D6853] p-1 flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer group">
      <div class="w-full h-full rounded-full bg-[#7D6853] group-hover:bg-[#685542] flex items-center justify-center transition-colors">
        <app-icon name="camera" [size]="20" svgClass="text-white"></app-icon>
      </div>
    </button>
    <span class="text-[11px] font-semibold text-[#5C5249] mt-1.5">Bấm nút tròn để chụp khung hình hiện tại</span>
  </div>
  ```

* **Hàng Nút Thao Tác Sau Khi Đã Chụp (Xuất hiện ngay dưới ảnh preview):**
  ```html
  <div class="flex items-center justify-between gap-3 pt-1">
    <!-- Nút phụ: Chụp lại -->
    <button class="py-2.5 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#5C5249] text-xs font-semibold cursor-pointer border-0 flex items-center gap-1.5 transition-colors">
      <app-icon name="rotate-cw" [size]="13"></app-icon>
      <span>Chụp Lại</span>
    </button>
    <!-- Nút chính: Quét Ngay Bối Cảnh AI -->
    <button class="flex-1 py-2.5 px-5 rounded-xl bg-[#7D6853] hover:bg-[#685542] text-white font-heading font-bold text-xs sm:text-sm transition-all cursor-pointer border-0 shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]">
      <app-icon name="sparkles" [size]="16" svgClass="text-[#F7D147]"></app-icon>
      <span>Quét Ngay Bối Cảnh AI</span>
    </button>
  </div>
  ```

---

### 4.4. Thẻ Trạng Thái Rỗng Ở Cột Phải (Empty State Cards - Khung 1 & Khung 2)
```html
<div class="bg-white rounded-3xl border border-[#EAE4D9] p-5 shadow-xs">
  <!-- Header của Card con -->
  <div class="flex items-center justify-between pb-3 mb-3 border-b border-[#EAE4D9]/80">
    <span class="text-[10px] font-bold uppercase tracking-wider text-[#7D6853] bg-[#FAF7F2] px-2 py-0.5 rounded-md border border-[#EAE4D9]">
      TỪ VỰNG BỐI CẢNH
    </span>
    <span class="text-xs text-[#5C5249] flex items-center gap-1 font-medium">
      <app-icon name="sparkles" [size]="13" svgClass="text-[#7D6853]"></app-icon>
      <span>AI Vision</span>
    </span>
  </div>

  <!-- Trọng tâm hiển thị Empty State -->
  <div class="py-4 text-center">
    <div class="w-12 h-12 rounded-2xl bg-[#FAF7F2] border border-[#EAE4D9] text-[#7D6853] flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
      <app-icon name="book-open" [size]="20" svgClass="text-[#7D6853]"></app-icon>
    </div>
    <h4 class="font-heading font-extrabold text-sm sm:text-base text-[#2D2823]">
      Chưa Có Từ Vựng
    </h4>
    <p class="text-xs text-[#5C5249] mt-1 max-w-xs mx-auto leading-relaxed">
      Chụp ảnh hoặc tải ảnh lên rồi bấm Quét Ngay để AI trích xuất từ vựng hiển thị tại đây.
    </p>
  </div>
</div>
```

---

## 5. QUY TẮC BẮT BUỘC KHI PHÁT TRIỂN / SỬA GIAO DIỆN (DEV RULES)

1. **Tuyệt đối không dùng các màu tự phát** như đen tuyền (`#000000`), xám lạnh thông thường (`#6B7280`), xanh lam generic (`#3B82F6`) hay đỏ tươi (`#EF4444`) cho các thành phần chính; luôn dùng đúng bảng mã màu kem/nâu/washi chuẩn ở trên.
2. **Đồng bộ hóa Bo Góc:**
   - Card lớn: luôn dùng `rounded-3xl`.
   - Card con / Video / Preview: luôn dùng `rounded-2xl`.
   - Nút hành động: luôn dùng `rounded-xl`.
   - Badge / Tab switch: luôn dùng `rounded-full`.
3. **Đồng bộ hóa Viền & Ngăn Cách:**
   - Luôn sử dụng `border border-[#EAE4D9]` hoặc `border-[#EAE4D9]/80`.
4. **Vị trí nút CTA hành động:**
   - Nút hành động chính (`Quét Ngay Bối Cảnh AI`) luôn đi kèm trực tiếp với đối tượng thao tác (dưới ảnh vừa chụp/tải lên), không đặt lẫn vào các khối kết quả chưa sinh ra dữ liệu.
5. **Quy tắc Tránh Trùng Lặp & Dư Thừa Giao Diện (Anti-Redundancy & Clean UI):**
   - Thanh Navbar cố định trên cùng đã bao gồm các liên kết điều hướng chính (`Trang Chủ`, `Quét Ảnh`, `Bộ Sưu Tập`) và menu tài khoản (`Hồ Sơ`, `Đăng Xuất`).
   - Tuyệt đối **KHÔNG** đặt lại các nút chuyển hướng trùng lặp (`Trang Chủ`, `Quét Ảnh Mới`, `Đăng Xuất`) vào vùng `header-actions` của `PageShellComponent` hoặc tạo card box chỉ để chứa duy nhất 1 nút bấm đã có trên Navbar.
   - Vùng `header-actions` chỉ dành riêng cho các huy hiệu trạng thái ngắn gọn (như chuỗi học `Streak`, tổng từ) hoặc công tắc chức năng đặc thù duy nhất của màn hình đó (như bộ chuyển tab Camera/Upload).


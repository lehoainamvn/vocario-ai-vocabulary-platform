---
name: anti-ai-design-prompter
description: Kỹ năng kỹ nghệ nhắc lệnh thị giác (Visual Prompt Engineering) và thiết kế giao diện chuyên nghiệp. Hướng dẫn tạo prompt và thẩm định UI không bị rập khuôn theo kiểu AI (loại bỏ gradient tím/xanh ngẫu nhiên, shadow thô, card bong bóng, dữ liệu giả), áp dụng chuẩn Figma Make Guidelines, Auto-Layout, và Three-Tier Design Tokens theo phong cách Scandinavian Editorial của Vocario.
---

# KỸ NĂNG: KỸ NGHỆ NHẮC LỆNH THỊ GIÁC & THIẾT KẾ UI CHỐNG AI CLICHÉ (SCANDINAVIAN EDITORIAL)
*(Visual Prompt Engineering & Anti-AI Aesthetic Framework for Vocario)*

## 🎯 Mục Tiêu
Kỹ năng này cung cấp quy trình từng bước, hệ thống Design Tokens và khuôn mẫu prompt chuẩn mực để:
1. Tạo ra các prompt thiết kế UI có tính khả thi kỹ thuật cực cao cho Figma Make, Claude Code, Cursor hoặc AI Assistants.
2. Đảm bảo giao diện thành phẩm nhìn tự nhiên, có chiều sâu mỹ thuật, đạt đẳng cấp Senior Product Designer theo phong cách **Scandinavian Minimalist & Editorial** (ấm áp, hữu cơ, tinh tế, đậm chất nhân văn).
3. Loại bỏ triệt để định kiến "giao diện do AI sinh ra" (AI Slop / AI Cliché: nền tím loang lổ, nút phát sáng mờ ảo, shadow đen nhòe rộng, các thẻ bong bóng tròn ủng, số liệu ảo).
4. Liên thông chuẩn xác 1:1 giữa bản vẽ Figma và code Frontend Angular (Tailwind / Standalone Components / Signals).

---

## 🏛️ HỆ THỐNG DESIGN TOKENS 3 BẬC CỦA VOCARIO (THREE-TIER DESIGN TOKENS)

### 1. Bậc 1: Primitives (Hệ Màu Thô Nguyên Bản)
- **Nền tổng thể (Canvas)**: `#F8F6F1` (Màu be sáng ấm kiểu giấy Washi / Linen tự nhiên).
- **Thẻ bề mặt chính (Surface Card)**: `#FFFFFF` (Trắng tinh khiết tương phản nhẹ với canvas).
- **Thẻ phụ / Vùng đệm (Sub-surface / Pill)**: `#FAF8F5` (Be kem nhạt êm dịu).
- **Đường viền mảnh (Delicate Border)**: `#E5DED3` (1px solid, mềm mại hơn viền xám công nghiệp).
- **Màu thương hiệu chính (Primary Wood Brown)**: `#7D6853` (Nâu gỗ trầm ấm Scandinavian).
  - Hover: `#685542` | Active: `#544434`
- **Màu điểm nhấn (Accent Amber / Tag)**: `#F7D147` (Vàng hổ phách tự nhiên).
  - Hover: `#E8BF30`
- **Màu văn bản (Typography)**:
  - Tiêu đề & Nội dung trọng tâm: `#2D2823` (Nâu than đậm, không dùng màu đen thuần `#000000`).
  - Phụ đề & Nhãn mô tả (Muted Caption): `#5C5249` (Nâu xám dịu mắt).
  - Nhãn trên nền vàng: `#1A1612`.

### 2. Bậc 2: Semantic Tokens (Token Ngữ Nghĩa)
| Semantic Token | Giá Trị CSS / Class | Ý Nghĩa Sử Dụng |
| :--- | :--- | :--- |
| `--bg-canvas` | `#F8F6F1` | Nền toàn bộ trang web (Body / Viewport) |
| `--surface-card` | `#FFFFFF` | Thẻ nội dung chính, bảng thông tin, modal |
| `--surface-sub` | `#FAF8F5` | Nền header modal, thanh công cụ, ô nhập liệu |
| `--border-subtle` | `#E5DED3` | Viền ngăn cách 1px, divider, input border |
| `--color-primary` | `#7D6853` | Nút CTA chính, logo, điểm nhấn thương hiệu |
| `--color-accent` | `#F7D147` | Tag từ vựng đã chọn, highlight ngữ cảnh |
| `--text-main` | `#2D2823` | Tiêu đề H1/H2/H3, tên từ vựng, điểm số |
| `--text-muted` | `#5C5249` | Hướng dẫn, mô tả phụ, thời gian, IPA |

### 3. Bậc 3: Component Tokens (Quy Định Thành Phần Dùng Chung)
- **Hệ phông chữ tương phản kép (Editorial Serif Pairing)**:
  - *Tiêu đề Display, Hero H1, Trích dẫn*: `font-serif` (Newsreader / Georgia / Garamond) mang lại vẻ đẹp tri thức, thanh nhã.
  - *Giao diện thao tác, Nút bấm, Ô nhập*: `font-sans` (`Outfit` / `Inter`) cho độ rõ nét, đọc tốt trên mọi thiết bị.
  - *Phiên âm & Chỉ số đo lường*: `font-mono` (`ui-monospace`, `Courier`) cho độ chuẩn xác học thuật.
- **Thanh điều hướng (Navbar)**:
  - *Guest Mode*: Logo Vocario font-serif, language toggle `VI | EN`, nút text `Đăng nhập`, nút pill `#7D6853` `Trải nghiệm ngay`.
  - *Logged-in Mode*: Logo Vocario, links chức năng (Khám phá, Quét ảnh, Flashcards, BXH, Trắc nghiệm), Badge chuỗi học (`🔥 7`), huy hiệu CEFR, Avatar tròn kèm dropdown menu tinh gọn.
- **Cửa sổ đăng nhập / Đăng ký (Auth Modal)**:
  - Tiêu đề font-serif Newsreader sang trọng.
  - Tabs chuyển đổi gạch chân tối giản (Underline tabs viền cam/nâu `#7D6853`), không dùng nút bấm nổi bật lộn xộn.
  - Ô nhập viền mảnh `#E5DED3`, toggle ẩn/hiện mật khẩu trong suốt.
  - Thẻ điền nhanh tài khoản demo `student1` và `admin` sạch sẽ ở đáy.
- **Thông báo nổi (Toast Notification)**:
  - Nền `#FFFFFF/95` backdrop-blur viền `#E5DED3`, bóng đổ nhẹ `shadow-[0_8px_30px_rgba(45,40,35,0.08)]`.
  - Dải màu trạng thái mảnh 4px ở mép trái, icon tròn tối giản.
- **Chấm điểm phát âm AI (Speech Scorer Modal)**:
  - Từ vựng mục tiêu hiển thị chữ lớn font-serif trang nhã.
  - Nút tròn Micro dùng màu nâu gỗ `#7D6853` (chuyển sang màu đỏ hồng `#E05345` khi đang thu âm) kèm hiệu ứng lan tỏa sóng âm nhẹ nhàng, không dùng gradient màu mè.

---

## 🛠️ QUY TRÌNH 5 BƯỚC THIẾT KẾ KHÔNG RẬP KHUÔN (THE 5-STEP WORKFLOW)

```
[1. Xác định Nhiệm Vụ] ➔ [2. Khai báo Bối cảnh & Token] ➔ [3. Thiết lập Ràng buộc Kỹ thuật] ➔ [4. Chặn AI Slop (Negative Prompt)] ➔ [5. Tinh chỉnh trực tiếp]
```

### Bước 1: Khai báo Cấu trúc Sản phẩm & Người Dùng Mục Tiêu (Context & Task)
* Nêu rõ màn hình này là gì, thuộc nền tảng nào (Web Desktop hay Mobile Web), và nhiệm vụ cốt lõi của người dùng.
* *Nguyên tắc*: Không mô tả bằng tính từ mơ hồ như *"hãy làm cho nó thật đẹp, hiện đại, clean và ấn tượng"*. Thay vào đó, mô tả luồng thao tác cụ thể.

### Bước 2: Chỉ Định Hệ Thống Token Cụ Thể (Design System & Tokens)
* Khai báo rõ bảng màu, font chữ, border radius và kích thước padding/gap theo chuẩn Scandinavian của Vocario.

### Bước 3: Ràng Buộc Bố Cục & Auto-Layout (Technical Constraints)
* Chỉ định rõ ràng mô hình lưới (vd: 2 cột tỷ lệ 7:5 hoặc 8:4).
* Ràng buộc 100% phần tử dùng Flexbox/Grid (Auto-Layout trong Figma).
* Quy định kích thước `FILL` cho khối nội dung chính và `HUG` cho các nút bấm/nhãn.

### Bước 4: Danh Sách Chống Rập Khuôn (Negative Constraints)
* Liệt kê danh sách những thứ **TUYỆT ĐỐI CẤM**:
  - Không gradient tím-hồng-neon (Cyberpunk AI Slop).
  - Không shadow đen nhòe rộng.
  - Không tạo card bo góc quá đà (trên 32px) như bong bóng đồ chơi.
  - Không sinh số liệu phần trăm ảo.
  - Không tạo các nút điều hướng lặp lại thanh Header/Navbar.

### Bước 5: Đưa Dữ Liệu Thật & Xử Lý Trạng Thái Ngoại Lệ (Real Data & Edge States)
* Bắt buộc cung cấp dữ liệu mẫu thực tế (tên người dùng, câu từ, ảnh chụp bối cảnh).
* Luôn yêu cầu thiết kế kèm:
  - **Empty State**: Khi người dùng chưa có dữ liệu (kèm icon tinh tế và nút hành động).
  - **Error/Offline State**: Khi mất kết nối hoặc API trả mã lỗi.
  - **Long Text Overflow**: Khi từ hoặc câu văn quá dài (`break-words` hoặc `truncate`).

---

## 📋 MẪU PROMPT CHUẨN (MASTER PROMPT TEMPLATE)

Khi bạn muốn yêu cầu AI sinh màn hình hoặc viết code UI mới, hãy sử dụng khung mẫu sau:

```markdown
### VAI TRÒ (ROLE):
Bạn là Senior UI/UX Designer & Frontend Engineer tuân thủ nghiêm ngặt tiêu chuẩn Figma Make Guidelines và phong cách Scandinavian Minimalist Editorial của Vocario.

### BỐI CẢNH & NHIỆM VỤ (CONTEXT & GOAL):
- Màn hình: [Tên màn hình, ví dụ: Studio Quét Ảnh AI Vision / Flashcard Ôn Tập SM-2]
- Mục tiêu chính của người dùng: [Ví dụ: Người học xem từ vựng lưu trữ, chọn độ nhớ theo SM-2 và nghe phát âm]
- Nền tảng: [Responsive Web, Desktop ưu tiên 1280px+ và Mobile 390px]

### QUY TẮC THẨM MỸ SCANDINAVIAN & CHỐNG AI SLOP:
1. Có chủ đích thiết kế: Mỗi component phải phục vụ trực tiếp mục tiêu trên. Không thêm card, chart hoặc icon thừa để lấp chỗ trống.
2. Phân cấp thị giác:
   - Display & Hero Title: 'Newsreader', Georgia, serif (28-36px, font-serif) mang vẻ đẹp tạp chí tri thức.
   - UI Controls, Body & Labels: 'Outfit' / 'Inter', sans-serif (13-15px).
   - Metrics & Phonetics: font-mono (12-14px).
   - Duy nhất 1 Primary Action nổi bật nhất (#7D6853).
3. Khoảng trắng logic: Áp dụng Gestalt Proximity. Khoảng cách giữa các nhóm (32-48px) lớn hơn khoảng cách bên trong nhóm (12-16px).
4. Dữ liệu thực tế: Sử dụng dữ liệu thật từ CSDL PostgreSQL; luôn có Empty State khi chưa có dữ liệu.

### DESIGN TOKENS & STYLE:
- Background Canvas: #F8F6F1 (Be ấm)
- Card chính: #FFFFFF | Card phụ / Header: #FAF8F5
- Border: 1px solid #E5DED3 (Mảnh mai, tự nhiên)
- Radius: rounded-3xl (24px cho container chính), rounded-2xl (16px cho ô con), rounded-full cho pill/avatar/shutter
- Primary Color: #7D6853 (Nâu gỗ trầm), Hover: #685542
- Accent / Tag: #F7D147 (Vàng hổ phách tự nhiên), Hover: #E8BF30
- Text: #2D2823 (Tiêu đề chính), #5C5249 (Mô tả phụ)

### CẤM TUYỆT ĐỐI (NEGATIVE PROMPT):
- KHÔNG dùng gradient tím/xanh/hồng (cyberpunk/futuristic AI slop).
- KHÔNG dùng shadow đen nhòe rộng (chỉ dùng viền #E5DED3 kết hợp shadow-xs hoặc shadow-[0_4px_20px_rgba(45,40,35,0.06)]).
- KHÔNG bo góc bong bóng tròn ủng.
- KHÔNG sinh số liệu giả tạo không có trong logic hệ thống.
- KHÔNG lặp lại các nút điều hướng từ Navbar (như nút Trang Chủ, Đăng Xuất).
```

---

## 🔍 TIÊU CHÍ ĐÁNH GIÁ (RUBRIC THẨM ĐỊNH UI)

Khi AI xuất code hoặc bản vẽ, đối chiếu ngay qua bảng điểm sau:

| Tiêu Chí | Đạt Chuẩn (Scandinavian Senior Human) | Không Đạt (AI Slop Cliché) |
| :--- | :--- | :--- |
| **Màu sắc** | Nền be ấm `#F8F6F1`, nâu gỗ `#7D6853`, viền `#E5DED3`, tối đa 1 màu nhấn hổ phách. | Nền tối om loang lổ tím/xanh neon, nút phát sáng mờ mịt. |
| **Typography** | Kết hợp Newsreader (serif) tiêu đề thanh nhã + sans-serif giao diện rõ nét. | 1 font chữ mặc định tô đậm toàn màn hình hoặc font hoạt hình rẻ tiền. |
| **Bố cục** | Phân cột rõ ràng (7:5 hoặc 8:4), diện tích trọng tâm chiếm 65-75%. | Chia 6-8 thẻ nhỏ bằng nhau như ma trận dashboard vô hồn. |
| **Khoảng trắng** | Rộng rãi, thở được, mắt nhìn vào thấy điểm dừng tự nhiên. | Chật chội hoặc nhồi nhét biểu đồ phụ, huy hiệu trang trí. |
| **Nút bấm (CTA)** | Phân cấp 1 nút Primary (#7D6853), còn lại là Secondary/Outline viền #E5DED3. | 4-5 nút bấm cùng màu mè, cùng độ đậm tranh giành sự chú ý. |
| **Trạng thái** | Có Empty State tinh tế khi danh sách trống. | Chỉ vẽ trường hợp có sẵn 10 dữ liệu giả không thực tế. |

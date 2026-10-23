# VOCARIO & FIGMA ANTI-AI UI AESTHETICS RULE
# Quy Tắc Thiết Kế Giao Diện Đẳng Cấp — Loại Bỏ Định Kiến "Giao Diện Do AI Sinh Ra"

> **Áp dụng**: Bắt buộc cho toàn bộ lập trình viên, AI Coding Assistant, và công cụ sinh giao diện (Figma Make, Cursor, Claude Code, Antigravity) khi tạo mới hoặc sửa đổi UI/UX trong dự án.
> **Nguồn gốc tài liệu**: Tổng hợp từ *Figma AI Design Prompts*, *Figma Visual Prompt Engineering*, *Figma Make Guidelines*, và *Figma Best Practices for AI Agents (saralobo/rules-figma)*.

---

## 🏛️ NHÓM A — 5 NGUYÊN TẮC THẨM MỸ CỐT LÕI (CHỐNG AI CLICHÉ)

### A1. Có Chủ Đích Thiết Kế (Intentional Design)
- **Mỗi màn hình chỉ phục vụ MỘT nhiệm vụ chính**: Trước khi tạo component, phải trả lời được: *"Người dùng vào màn hình này để làm gì?"*.
- **Tuyệt đối cấm "lấp khoảng trống" (No filler elements)**: Không chèn thêm thẻ Card phụ, biểu đồ vô nghĩa, hình minh họa hoạt họa ngẫu nhiên hay icon trang trí chỉ vì thấy layout còn trống. Khoảng trống (Whitespace) là một phần của thiết kế, không phải là lỗi cần lấp đầy.

### A2. Phân Cấp Thị Giác Rõ Ràng (Strict Visual Hierarchy)
- **Quy tắc 3 bậc tương phản**:
  1. *Cấp 1 (Chính)*: Tiêu đề màn hình (Display/H1) và nút hành động chính (Primary Call-to-Action - CTA). Mỗi viewport chỉ có **duy nhất 1 Primary CTA**.
  2. *Cấp 2 (Bổ trợ)*: Nhãn thẻ, dữ liệu thống kê then chốt, nút thứ cấp (Ghost/Outline/Secondary button).
  3. *Cấp 3 (Nền tảng)*: Nhãn phụ (Caption), metadata, thời gian, mô tả chi tiết với tone màu dịu (`text-muted`, opacity 60-70%).
- **Cấm đồng dạng**: Không để tất cả các khối có cùng kích thước, cùng một cỡ chữ hay cùng độ đậm font (font-weight). 

### A3. Khoảng Trắng Có Logic (Logical Whitespace & Proximity Law)
- **Áp dụng Định luật Gần gũi (Gestalt Proximity)**: Các thành phần có liên quan chặt chẽ với nhau (như Label và Input, Icon và Text tiêu đề) phải ở gần nhau.
- **Hệ số khoảng cách Trong - Ngoài**:
  $$\text{Gap giữa các nhóm chức năng khác nhau (Outer Gap)} \ge 1.5 \times \text{Gap bên trong nhóm (Inner Gap)}$$
- Sử dụng hệ lưới 4px / 8px (Token: `gap-2` = 8px, `gap-4` = 16px, `gap-6` = 24px, `gap-8` = 32px, `gap-12` = 48px).

### A4. Loại Bỏ Trang Trí Rập Khuôn Của AI (Anti-AI Clichés & Slop)
- ❌ **CẤM mặc định Gradient Tím/Xanh/Hồng (Neon Cyberpunk Gradient)**: AI thường tự động thêm nền tím loang lổ. Chỉ dùng màu Solid tinh tế hoặc nền Be ấm (`#FAF7F2`, `#F8F6F1`) theo Design System KaChiKa của Vocario.
- ❌ **CẤM Shadow đen nhòe đậm (Harsh Muddy Shadows)**: Không dùng `box-shadow: 0 10px 30px rgba(0,0,0,0.3)`. Thay bằng viền mảnh tinh tế kết hợp bóng mờ nhẹ (`border border-[#EAE4D9]` + `shadow-xs` / `shadow-2xs`).
- ❌ **CẤM Bo góc quá mức (Pill-bubble Card Syndrome)**: Không bo tròn toàn bộ card thành hình bong bóng (`rounded-[40px]`). Chỉ dùng `rounded-2xl` hoặc `rounded-3xl` cho container chính, và `rounded-full` chỉ dành cho Badge/Avatar/Button tròn.
- ❌ **CẤM Lạm dụng Badge / Chip / Tag**: Không gắn badge vào mọi dòng text. Chỉ dùng badge cho trạng thái thực sự biến động (vd: *Đang học*, *Cần ôn hôm nay*, *Level A2*).
- ❌ **CẤM Số liệu ảo (Fake Vanity Metrics)**: Không tự bịa ra các chỉ số "+124% tăng trưởng", "99.9% chính xác" trừ khi CSDL thực sự cung cấp chỉ số đó.

### A5. Thiết Kế Theo Dữ Liệu Thực Tế (Real-Data First & Edge Cases)
Mọi component và màn hình phải được kiểm tra qua 4 trạng thái dữ liệu:
1. **Trạng thái đầy đủ dữ liệu (Ideal/Happy Path)**: Dữ liệu thật, tên người dùng thật, từ vựng thật từ PostgreSQL.
2. **Trạng thái rỗng (Empty State)**: Khi học viên chưa có từ vựng / chưa chụp ảnh: Hiển thị icon tinh tế, thông điệp hướng dẫn rõ ràng và nút hành động khởi đầu.
3. **Trạng thái văn bản dài tràn dòng (Overflow / Truncation)**: Kiểm tra khi tên từ vựng, câu ví dụ hoặc email quá dài: xử lý xuống dòng tự nhiên (`break-words`) hoặc `truncate` có tooltip.
4. **Trạng thái lỗi / Mất kết nối (Error / Fallback State)**: Khi AI Vision server offline hoặc mất mạng, giao diện phải có fallback thông báo lịch sự, không làm trắng màn hình.

---

## 📐 NHÓM B — QUY TẮC CẤU TRÚC KỸ THUẬT FIGMA & CODE (SARALOBO RULES)

1. **Auto-Layout Trên Từng Phần Tử (100% Flexbox/Grid)**:
   - Tuyệt đối không dùng toạ độ tuyệt đối (`position: absolute`) trừ trường hợp Bounding Box vẽ đè lên ảnh.
   - Luôn sử dụng sizing ngữ nghĩa:
     - Khối chứa nội dung tự co giãn: `FILL` chiều ngang và chiều dọc (`flex-1 w-full`).
     - Khối nút/nhãn theo nội dung: `HUG` (`w-auto inline-flex`).
2. **Đặt Tên Ngữ Nghĩa (Semantic Layer Naming)**:
   - Đặt tên theo **Mục đích**, không theo **Hình thức**:
     - ✅ Đúng: `VocabCard/Header`, `StudyProgress/StatsPill`, `Scanner/LiveViewport`.
     - ❌ Sai: `Frame 245`, `Group 12`, `BlueBox`, `CardCopy`.
3. **Hệ Thống Token 3 Cấp (Three-Tier Tokens)**:
   - *Primitive*: `#7D6853`, `#FAF7F2`, `#2D2823`.
   - *Semantic*: `--bg-canvas`, `--card-surface`, `--text-primary`, `--border-divider`.
   - *Component*: `--vocab-card-bg`, `--scanner-shutter-border`.
   - Tuyệt đối không hardcode mã màu lạ nằm ngoài Design System của Vocario.

---

## 🚫 CHECKLIST KIỂM DUYỆT TRƯỚC KHI XUẤT CODE / DESIGN

- [ ] Màn hình có phục vụ duy nhất 1 mục tiêu rõ ràng không?
- [ ] Đã xóa bỏ các card, icon, biểu đồ trang trí vô nghĩa chưa?
- [ ] Đã có sự chênh lệch rõ ràng giữa H1, Body text và Caption chưa?
- [ ] Có bị dính hiệu ứng "AI Slop" (gradient tím/xanh ngẫu nhiên, shadow thô kệch) không?
- [ ] Giao diện đã có Empty State chu đáo khi CSDL chưa có dữ liệu chưa?
- [ ] Đã kiểm tra giao diện trên màn hình mobile và desktop chưa?

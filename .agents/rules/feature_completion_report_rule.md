# RULE: QUY TẮC TỰ ĐỘNG XUẤT BÁO CÁO SAU KHI HOÀN THÀNH TÍNH NĂNG (FEATURE COMPLETION REPORT)

## 📌 Mục Đích
Quy tắc này áp dụng vĩnh viễn cho mọi tác vụ phát triển, nâng cấp, tích hợp tính năng hoặc tái cấu trúc trong dự án **Vocario**.
Mục tiêu là đảm bảo tính minh bạch, lưu vết kiến trúc kỹ thuật và cung cấp tài liệu bàn giao chuẩn mực phục vụ cho báo cáo đồ án tốt nghiệp.

---

## ⚙️ Các Điều Khoản Bắt Buộc (Mandatory Requirements)

### 1. Kích hoạt tự động (Automatic Trigger)
- Mỗi khi hoàn thành xong một tính năng mới (Feature), tích hợp module AI/Backend/Frontend hoặc sửa đổi logic kiến trúc quan trọng, AI Assistant **BẮT BUỘC** phải tự động tạo một file báo cáo chi tiết định dạng Markdown (`.md`).
- File báo cáo phải được lưu tại thư mục gốc của dự án hoặc `docs/reports/` với tiền tố tên file rõ ràng, ví dụ: `BAO_CAO_<TEN_TINH_NANG>.md`.

### 2. Cấu trúc chuẩn của một Báo Cáo Tính Năng
Mỗi file báo cáo hoàn thành tính năng phải bao gồm đầy đủ 6 phần sau:

1. **Tổng Quan Tính Năng (Executive Summary):**
   - Tên tính năng, ngày hoàn thành, mục tiêu giải quyết (pain point).
   - Tóm tắt giá trị mang lại cho người học và hệ thống.

2. **Kiến Trúc & Giải Pháp Kỹ Thuật (Architecture & Technical Solution):**
   - Sơ đồ luồng dữ liệu (Mermaid Diagram / Box Diagram).
   - Danh sách công nghệ, mô hình AI, thư viện bên thứ 3 và lý do lựa chọn.

3. **Danh Sách Thay Đổi & File Diffs (Implementation Details):**
   - Bảng liệt kê chi tiết các file tạo mới, cập nhật, hoặc xóa bỏ.
   - Giải thích vai trò của từng hàm / component quan trọng.

4. **Kết Quả Kiểm Thử Thực Tế (Verification & Test Results):**
   - Kết quả chạy thực tế kèm log console, phản hồi JSON của API, hoặc ảnh chụp màn hình.
   - Thước đo hiệu năng (thời gian suy luận, độ trễ, số lượng token, độ tin cậy).

5. **Hướng Dẫn Sử Dụng & Khởi Chạy (Operation & Run Guide):**
   - Các lệnh khởi động các service liên quan.
   - Hướng dẫn trải nghiệm tính năng trên giao diện Web.

6. **Các Lưu Ý Kỹ Thuật & Hướng Phát Triển Tiếp Theo (Notes & Future Roadmap):**
   - Các điểm fallback dự phòng (an toàn khi mất mạng hoặc API lỗi).
   - Khuyến nghị nâng cấp cho giai đoạn kế tiếp.

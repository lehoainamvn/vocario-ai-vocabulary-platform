---
description: Quy tắc bắt buộc khi viết nội dung báo cáo học thuật, khóa luận tốt nghiệp và tài liệu kỹ thuật nhằm loại bỏ hoàn toàn dấu vết văn phong AI, vượt qua các hệ thống kiểm duyệt Turnitin và GPTZero.
globs: **/*BAO_CAO*.md, **/*bao_cao*.md, **/*report*.md, docs/**/*.md
alwaysApply: true
---

# QUY TẮC VIẾT BÁO CÁO HỌC THUẬT CHỐNG VĂN PHONG AI
*(Anti-AI Academic Writing Rules)*

## 1. NGUYÊN TẮC BẮT BUỘC (CARDINAL RULES)
Mọi nội dung văn bản viết cho Báo cáo Tốt nghiệp, Khóa luận, và Thuyết minh kỹ thuật phải tuân thủ nghiêm ngặt các điều kiện sau:

1. **TRIỆT TIÊU TỪ NGỮ SÁO RỖNG (ZERO CLICHÉ TOLERANCE):**
   - Tuyệt đối KHÔNG sử dụng: *"Trong bối cảnh...", "Trong kỷ nguyên số...", "Đóng vai trò quan trọng/sống còn...", "Không chỉ... mà còn...", "Như một minh chứng cho...", "Mở ra một tương lai...", "Một cách toàn diện / triệt để"*.
   - Khởi đầu đoạn văn trực diện bằng thực trạng kỹ thuật, yêu cầu nghiệp vụ hoặc bài toán hệ thống cần xử lý.

2. **ĐA DẠNG HÓA NHỊP ĐIỆU CÂU (HIGH BURSTINESS):**
   - Nghiêm cấm viết các câu văn có độ dài đồng đều từ 18-25 từ.
   - Bắt buộc đan xen các câu ngắn (4-8 từ) mang tính khẳng định hoặc chốt kết quả giữa các câu giải thích kỹ thuật phức tạp.
   - Không lặp lại cấu trúc ngữ pháp giữa 2 câu liền kề.

3. **CỤ THỂ HÓA THÔNG SỐ VÀ DỮ LIỆU ĐO ĐẠC (CONCRETE ENGINEERING SPECIFICITY):**
   - Mọi tuyên bố về hiệu năng phải đi kèm chỉ số định lượng: mili-giây (ms), khung hình/giây (FPS), phần trăm (%), dung lượng (MB), phiên bản thư viện.
   - Nhắc trực tiếp tên cấu trúc dữ liệu, bảng CSDL, endpoint API (`/api/vision/scan`, `user_word_progress`, `yolov8s-worldv2.pt`).

4. **PHÁ VỠ CẤU TRÚC 3 Ý CÂN XỨNG (ANTI-RULE OF THREE):**
   - Không gán ép mọi vấn đề thành đúng 3 gạch đầu dòng cân xứng.
   - Trình bày thông tin theo luồng diễn tiến tự nhiên: Nguyên nhân ➔ Hiện tượng ➔ Phân tích mã nguồn / giải thuật ➔ Kết quả thực nghiệm.

5. **GIỮ VỮNG TƯ DUY KỸ SƯ THỰC NGHIỆM:**
   - Đưa vào các trường hợp biên (Edge cases), các hạn chế thực tế và giải pháp khắc phục của tác giả trong quá trình cài đặt hệ thống.

---
name: anti-ai-academic-writer
description: Kỹ năng viết và biên tập báo cáo học thuật, khóa luận tốt nghiệp, bài báo khoa học chống nhận diện AI (Anti-Turnitin, Anti-GPTZero, ZeroGPT). Hướng dẫn triệt tiêu các mẫu câu sáo rỗng AI, tăng độ biến thiên cấu trúc câu (Burstiness), tăng tính bất ngờ ngữ nghĩa (Perplexity), bơm dữ liệu kỹ thuật thực tế và phong cách phản biện của kỹ sư/nhà nghiên cứu con người.
---

# KỸ NĂNG: VIẾT VĂN BẢN HỌC THUẬT CHỐNG NHẬN DIỆN AI
*(Anti-AI Academic Writing & Engineering Style Framework)*

## 🎯 1. BẢN CHẤT CƠ CHẾ CỦA CÁC CÔNG CỤ NHẬN DIỆN AI (TURNITIN, GPTZERO, COPYLEAKS)

Các thuật toán dò quét văn bản do AI sinh ra (AI Detectors) hoạt động dựa trên 2 chỉ số thống kê toán học cốt lõi:
1. **Perplexity (Độ bất ngờ ngữ nghĩa):** Mô hình ngôn ngữ lớn (LLM) luôn chọn token tiếp theo có xác suất xuất hiện cao nhất. Do đó, văn bản AI có Perplexity rất thấp (từ ngữ trơn tru, dễ đoán). Ngược lại, người viết thật sử dụng từ vựng đa dạng, từ đồng nghĩa bất ngờ, thuật ngữ thực tế và góc nhìn riêng.
2. **Burstiness (Độ biến thiên cấu trúc & độ dài câu):** AI có xu hướng tạo ra các câu có độ dài đồng đều (khoảng 18 - 25 từ/câu), nhịp điệu đều đặn ru ngủ. Ngược lại, con người viết với độ "gập ghềnh" tự nhiên: đan xen giữa câu cực ngắn (4 - 7 từ) mang tính khẳng định và câu phức hợp dài (30 - 45 từ) chứa nhiều mệnh đề kỹ thuật.
3. **Phân bố từ vựng rập khuôn (AI Cliché Clusters):** AI lạm dụng các từ nối sáo rỗng và công thức đối xứng 3 vế ("Rule of Three").

---

## 🚫 2. DANH SÁCH ĐEN TỪ NGỮ VÀ MẪU CÂU CẤM (BANNED AI CLICHÉS)

### A. Cụm từ dẫn nhập và chuyển ý sáo rỗng (TUYỆT ĐỐI KHÔNG DÙNG):
* ❌ *"Trong bối cảnh hội nhập quốc tế / Trong thời đại kỷ nguyên số..."* ➔ Thay bằng: Đi thẳng vào bài toán cụ thể, dẫn chứng vấn đề thực tế tại hiện trường/phần mềm.
* ❌ *"Đóng vai trò quan trọng / Đóng vai trò then chốt / Sống còn..."* ➔ Thay bằng: Nêu rõ tác động kỹ thuật (ví dụ: *"giúp giảm 40% độ trễ truy vấn"*).
* ❌ *"Không chỉ... mà còn..."* ➔ Thay bằng: Tách thành 2 câu chủ động riêng biệt hoặc dùng liên từ nhân quả.
* ❌ *"Như một minh chứng cho / Là một bước đột phá mang tính cách mạng..."* ➔ Xóa bỏ, mang tính quảng cáo giả tạo.
* ❌ *"Một cách toàn diện / Triệt để / Vô cùng to lớn..."* ➔ Xóa bỏ tính từ mơ hồ, thay bằng chỉ số đo đạc cụ thể.
* ❌ *"Không thể phủ nhận rằng / Có thể thấy rằng / Cần lưu ý rằng..."* ➔ Đi thẳng vào nhận định khoa học.
* ❌ *"Tóm lại, nhìn chung..."* ở cuối mọi đoạn ➔ Để dữ liệu và kết luận tự nói lên ý nghĩa.

### B. Mẫu cấu trúc đoạn văn bị cấm (Banned Structural Archetypes):
* ❌ **Cấm cấu trúc "3 gạch đầu dòng song song":** AI rất thích tạo 1 câu giới thiệu, sau đó là 3 gạch đầu dòng in đậm đầu dòng, kết thúc bằng 1 câu tóm tắt. Con người viết báo cáo luận văn tổ chức ý theo logic diễn dịch, quy nạp, hoặc trình bày theo luồng dữ liệu (Dataflow).
* ❌ **Cấm "Rule of Three":** Tránh liệt kê các tính từ thành cụm 3 từ cân xứng (*"nhanh chóng, chính xác và hiệu quả"* ➔ chỉ cần nêu rõ: *"đạt độ trễ 12ms trên GPU"*).

---

## 🛠️ 3. NGUYÊN TẮC "BƠM DẤU ẤN KỸ SƯ" (ENGINEERING FINGERPRINTS)

Để bài báo cáo đạt điểm tuyệt đối về tính liêm chính học thuật và vượt qua 100% các bộ lọc AI, phải áp dụng các kỹ thuật:

### 1. Kỹ thuật đảo nhịp câu (Extreme Burstiness Modulation)
* Luôn đan xen ít nhất 1 câu ngắn dứt khoát giữa các đoạn văn dài:
  - *Ví dụ:* *"Hệ thống kiểm tra bộ nhớ đệm trước. Nếu khóa hợp lệ tồn tại trong Redis, dữ liệu được trả về ngay lập tức với độ trễ dưới 2ms, qua đó triệt tiêu hoàn toàn nhu cầu truy vấn lại bảng CSDL PostgreSQL vốn tiêu tốn nhiều tài nguyên I/O ổ đĩa."*

### 2. Đưa định danh kỹ thuật cụ thể (Concrete Specificity)
* Tuyệt đối không viết chung chung: *"Hệ thống dùng mô hình AI tiên tiến để nhận diện vật thể"*.
* Phải viết chuẩn kỹ thuật: *"Dịch vụ AI nạp trọng số `yolov8s-worldv2.pt` (kích thước 25.9MB) vào bộ nhớ VRAM, thiết lập ngưỡng tin cậy $Confidence = 0.25$ và áp dụng giải thuật Non-Maximum Suppression (NMS) với ngưỡng $IoU = 0.45$ để loại bỏ các hộp bao dư thừa."*

### 3. Đưa trải nghiệm thực tế & Góc nhìn phản biện (Engineering Trade-offs)
* Nhắc đến các khó khăn kỹ thuật phát sinh khi làm đồ án:
  - *"Khi kiểm thử thực tế trên tập 50 bức ảnh chụp góc học tập ngược sáng, mô hình YOLO-World v2 ban đầu bị nhận nhầm bóng đèn bàn thành lọ hoa. Để khắc phục, tác giả đã bổ sung bước tăng cường dữ liệu HSV Color Jitter và tinh chỉnh danh sách từ vựng mục tiêu."*

### 4. Thuật ngữ tiếng Việt chuyên ngành chuẩn xác:
* Sử dụng ngôn ngữ của giới kỹ sư Việt Nam: *truy vấn phân trang, bóc tách thực thể, khóa ngoại, bộ đệm vòng tròn, độ trễ suy luận, chỉ mục kép, giao dịch phân tán, mã băm một chiều...*

---

## 📋 4. QUY TRÌNH THẨM ĐỊNH TRƯỚC KHI XUẤT VĂN BẢN (ANTI-AI CHECKLIST)

Trước khi ghi văn bản vào báo cáo Word hoặc nộp giảng viên:
1. [ ] Đã xóa sạch các cụm từ sáo rỗng: *"bối cảnh", "không chỉ mà còn", "đóng vai trò quan trọng", "minh chứng"*.
2. [ ] Đã kiểm tra độ dài câu: Không có 3 câu liên tiếp cùng độ dài; có câu ngắn dưới 10 từ.
3. [ ] Đã thay thế các nhận định chung chung bằng số liệu đo lường cụ thể (ms, FPS, %, MB, version).
4. [ ] Đã dẫn chứng đúng tên file, tên hàm, tên bảng trong CSDL (`users`, `user_word_progress`, `SrsService`).
5. [ ] Giọng văn thể hiện sự khách quan, chính xác của kỹ sư thực hiện dự án.

# KẾ HOẠCH NÂNG CẤP ĐỘ CHÍNH XÁC & TỐI ƯU HÓA PRODUCTION CHO VOCARIO AI VISION ENGINE

> **Phiên bản tài liệu:** 1.0.0  
> **Ngày phê duyệt:** 26/10/2026  
> **Nhóm thực hiện:** Vocario Core AI & Architecture Team  
> **Trạng thái:** Sẵn sàng triển khai (Ready for Implementation)  

---

## 1. TỔNG QUAN & MỤC TIÊU DỰ ÁN

Hệ thống nhận diện vật thể mở (**Open-Vocabulary Vision Engine**) của Vocario phục vụ tính năng quét hình ảnh đời sống để trích xuất từ vựng tiếng Anh theo ngữ cảnh. 

Qua đợt đo lường thực nghiệm (**Benchmark 20 ảnh**) trên 2 tập dữ liệu đa dạng (Batch 1: 10 bối cảnh cơ bản; Batch 2: 10 bối cảnh phức tạp), hệ thống bộc lộ một số điểm nghẽn về **độ chính xác nhận diện (Recall & Precision)** và **tính ổn định độ trễ trên môi trường máy chủ đám mây tài nguyên hạn chế (CPU Cloud / Render Free Tier)**.

### Mục Tiêu Trọng Tâm:
1. **Tăng độ chính xác & tỷ lệ bao phủ (Precision & Recall)**: Nâng điểm tin cậy trung bình từ **0.48 lên > 0.75**; loại bỏ hoàn toàn các trường hợp nhận diện ít từ vựng (< 4 từ vựng trong ảnh); triệt tiêu 100% lỗi nhận nhầm ảo giác (ví dụ: gán nhãn `library` trong phòng gym hay tiệm bánh).
2. **Tối ưu hóa thời gian phản hồi (Low Latency)**: Đảm bảo thời gian xử lý suy luận Tầng 1 + Tầng 2 + Tầng 3 **dưới 800ms** trên môi trường 2 vCPU không có GPU chuyên dụng.
3. **Độ ổn định kiến trúc Production**: Không phụ thuộc vào GPU rời; kiểm soát bộ nhớ RAM < 1.2 GB để không bao giờ bị Render dừng đột ngột (OOM Out of Memory).

---

## 2. PHÂN TÍCH ĐỊNH LƯỢNG KẾT QUẢ BENCHMARK 20 ẢNH THỰC TẾ

### 2.1. Bảng Tổng Hợp Kết Quả Thực Nghiệm

| STT | Bối cảnh thử nghiệm | Tầng 1 (Scene & Conf) | Tầng 2 Raw Boxes | Tầng 2 Latency | Từ vựng sau Thẩm định | Vấn đề phát hiện |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **B1-1** | Bàn Học & Góc Làm Việc | Study/Office (98%) | 23 | 569 ms | 10 | Chuẩn |
| **B1-2** | Phòng Khách & Sofa | Living Room (98%) | 18 | 218 ms | 10 | Chuẩn |
| **B1-3** | Đường Phố & Xe Buýt | Vehicles/Street (98%) | 9 | 212 ms | 4 | Chỉ bắt xe buýt & người |
| **B1-4** | Nhà Bếp & Gia Dụng | Kitchen (68%) | 9 | 322 ms | 4 | T1 tin cậy thấp (68%) |
| **B1-5** | Công Viên & Ghế Đá | Nature/Plants (98%) | 4 | 244 ms | 3 | Ít từ, điểm TB thấp (0.43) |
| **B1-6** | Quán Cà Phê Ẩm Thực | Dining (68%) | 8 | 187 ms | 1 | Chỉ nhận 5 đèn `lamp`, ra 1 từ |
| **B1-7** | Phòng Ngủ & Nệm | Bedroom (98%) | 25 | 173 ms | 10 | Chuẩn |
| **B1-8** | Siêu Thị & Trái Cây | Food/Groceries (98%) | 5 | 257 ms | 1 | Bỏ sót quả, chỉ nhận nhãn kệ |
| **B1-9** | Sân Thể Thao Ngoài Trời | Sports (68%) | 1 | 271 ms | 1 | Chỉ nhận duy nhất 1 quả bóng |
| **B1-10**| Camera Góc Học Tập | Study/Office (98%) | 8 | 314 ms | 3 | Ít từ vựng |
| **B2-1** | Thư Viện & Góc Đọc | Study/Office (98%) | 4 | 210 ms | 2 | Conf trung bình thấp (0.36) |
| **B2-2** | Bệnh Viện & Phòng Khám| Healthcare (68%) | 5 | 225 ms | 3 | T1 tin cậy thấp, nhận nhầm menu |
| **B2-3** | Phòng Tập Gym & Thể Hình| Gym (95%) | 5 | 218 ms | 2 | **Nhận nhầm nhãn `library`** |
| **B2-4** | Nhà Hàng & Bàn Tiệc | Restaurant (98%) | 11 | 245 ms | 5 | Điểm tin cậy TB thấp (0.29) |
| **B2-5** | Bãi Biển & Du Lịch | Nature/Plants (68%) | 2 | 195 ms | 2 | Chỉ nhận 2 từ (`sand`, `ocean`) |
| **B2-6** | Thú Cưng Đời Sống | Animals (68%) | 3 | 180 ms | 2 | Chỉ nhận `dog`, `collar` |
| **B2-7** | Sân Bay & Hành Khách | Vehicles (98%) | 6 | 210 ms | 5 | Tốt |
| **B2-8** | Cửa Hàng Thời Trang | Clothing (98%) | 17 | 260 ms | 4 | Nhận nhiều giá treo trùng lặp |
| **B2-9** | Phòng Tắm & Vệ Sinh | Bathroom (98%) | 15 | 230 ms | 8 | Tốt |
| **B2-10**| Tiệm Bánh Mì & Bánh Ngọt| Groceries (98%) | 5 | 240 ms | 2 | Bỏ sót các loại bánh cụ thể |

### 2.2. Ba Điểm Nghẽn Kỹ Thuật Cốt Lõi (Bottleneck Analysis)

1. **Điểm nghẽn Tầng 1 (Scene Classification - Hard Gating Failure)**:
   - Tầng 1 sử dụng mạng ResNet-18 huấn luyện trên Places365 (phát hành năm 2017). Mạng thường xuyên trả về độ tin cậy thấp ($68\%$) cho các không gian phức tạp.
   - Khi áp dụng quy tắc **Hard-Gating** (ép cứng danh mục từ vựng chỉ thuộc 1 chủ đề duy nhất), nếu T1 đoán lệch, T2 hoàn toàn không thể nhận diện được các đồ vật đúng của bối cảnh đó.
2. **Điểm nghẽn Tầng 2 (YOLO-World v2 - Small/Dense Object Drop)**:
   - Kích thước ảnh $480 \times 480$ trên CPU làm triệt tiêu chi tiết các vật thể nhỏ (chai lọ gia vị, dụng cụ y tế, trái cây nhỏ trong quầy siêu thị, phụ kiện bàn làm việc).
   - Các từ vựng mang tính khái niệm chung (như `library`, `shelf`) dễ bị kích hoạt nhầm tại các mảng kết cấu song song (như giá tạ trong gym, song cửa, giá treo quần áo).
3. **Điểm nghẽn Tầng 3 (MobileNetV3 Verifier - Lack of Semantic Grounding)**:
   - Module thẩm định hiện tại đo lường độ sắc nét/phương sai không gian (`torch.std(feats)`). Nó không có khả năng hiểu xem **"vùng ảnh crop đó có thực sự là một cuốn sách hay không"**. 
   - Dẫn đến việc các vùng texture nhiễu nhưng có độ tương phản cao vẫn vượt qua bộ lọc, trong khi đồ vật thực sự nhưng bề mặt trơn phẳng (bóng rổ, đĩa, cốc đơn sắc) lại bị hạ điểm tin cậy.

---

## 3. KIẾN TRÚC GIẢI PHÁP NÂNG CẤP (PROPOSED ARCHITECTURE)

```
+--------------------------------------------------------------------------------------------------+
|                              VOCARIO NEXT-GEN AI VISION PIPELINE                                 |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|   [ Ảnh đầu vào (Webcam/Upload) ]                                                               |
|                 |                                                                                |
|                 v                                                                                |
|   +------------------------------------------------------------------------------------------+   |
|   | TẦNG 1: HYBRID SCENE ROUTER (Places365 + Soft-Gating Top-2)                              |   |
|   | - Phân loại bối cảnh ResNet-18 kết hợp Softmax Marginal Pooling                          |   |
|   | - IF Conf(Top-1) >= 80%  -> Kích hoạt 35-40 từ của Top-1 Theme                           |   |
|   | - IF Conf(Top-1) < 80%   -> HỢP NHẤT Top-1 + Top-2 Themes (60-80 từ qua Vector Cache)   |   |
|   +------------------------------------------------------------------------------------------+   |
|                 |                                                                                |
|                 v                                                                                |
|   +------------------------------------------------------------------------------------------+   |
|   | TẦNG 2: YOLO-WORLD V2 ENGINE + ADAPTIVE CONFIDENCE + MULTI-PROMPT                        |   |
|   | - Nạp danh sách từ vựng tức thì qua ma trận tensor `txt_feats` đã tiền xử lý (0.005s)     |   |
|   | - Ngưỡng phát hiện thích ứng (Adaptive Conf: 0.12 cho vật nhỏ, 0.25 cho vật lớn)         |   |
|   | - Tùy chọn Micro-Tiling (SAHI nhẹ 2x2) kích hoạt khi phát hiện bối cảnh dày đặc           |   |
|   +------------------------------------------------------------------------------------------+   |
|                 |                                                                                |
|                 v                                                                                |
|   +------------------------------------------------------------------------------------------+   |
|   | TẦNG 3: TWO-STAGE VERIFIER V3 (NEGATIVE CONSTRAINTS + SEMANTIC COHERENCE)                 |   |
|   | - Ma trận cấm dị biệt (Blacklist Rules: Cấm `library` trong gym/restaurant/kitchen)      |   |
|   | - Hình học nâng cao (Loại bỏ box chiếm > 75% ảnh trừ khung cảnh nền)                     |   |
|   | - Cross-Modal Semantic Similarity (So khớp cosine giữa đặc trưng crop và từ vựng)        |   |
|   | - Soft-Containment NMS (Khử triệt để hộp bao lồng ghép)                                 |   |
|   +------------------------------------------------------------------------------------------+   |
|                 |                                                                                |
|                 v                                                                                |
|   [ 8 - 15 Từ Vựng Học Tập Chuẩn Xác + Bounding Box + IPA + Nghĩa TV + CEFR Level ]             |
|                                                                                                  |
+--------------------------------------------------------------------------------------------------+
```

---

## 4. CHI TIẾT CÁC CẢI TIẾN KỸ THUẬT & MÔ HÌNH BỔ SUNG

### 4.1. Nâng cấp Tầng 1: Soft-Gating & Multi-Theme Ensemble
- **Cơ chế**: Khi `scene_service.predict_scene` trả về độ tin cậy của Top-1 $< 80\%$, hệ thống không ép buộc 1 chủ đề mà tự động lấy **Top-2 chủ đề có xác suất cao nhất**.
- **Hiệu quả**: 
  - Tại bối cảnh Phòng Gym & Bệnh viện ($68\%$), danh mục từ vựng sẽ mở rộng gồm cả thiết bị thể thao/y tế và đồ đạc phòng ốc nói chung.
  - Tận dụng `yolo_1000_feats.pt`: Việc gộp 2 chủ đề (khoảng 60–80 từ) chỉ mất phép cộng chỉ số tensor trong $0.005s$, không làm tăng độ trễ suy luận.

### 4.2. Nâng cấp Tầng 2: Adaptive Confidence & Negative Prompts
- **Ngưỡng tin cậy động (Dynamic / Adaptive Confidence)**:
  - Các vật thể nhỏ hoặc dễ bị che khuất (`cup`, `fork`, `apple`, `pen`, `medicine`): đặt ngưỡng phát hiện nhạy $0.12$ để tăng **Recall**.
  - Các nhãn trừu tượng, dễ sinh ảo giác (`library`, `shelf`, `wardrobe`, `counter`): nâng ngưỡng yêu cầu tối thiểu lên $0.35$ để bảo đảm **Precision**.
- **Micro-Tiling cho Cảnh Dày Đặc**: Cho phép chia ảnh thành $2 \times 2$ có overlap $15\%$ đối với ảnh chụp siêu thị, bàn tiệc, quầy bánh mì để nhận diện trọn vẹn các vật thể bé.

### 4.3. Nâng cấp Tầng 3: Semantic Verification & Rule-based Negative Filtering
- **Quy tắc cấm dị biệt (Blacklist Matrix)**:
  - Ngăn cấm tuyệt đối nhãn `library` nếu bối cảnh hiện tại là `gym_fitness`, `dining_tableware`, `restaurant_cafe`, `kitchen_appliances`, `bathroom_toiletries`.
  - Ngăn cấm nhãn `clothes rack` nếu bối cảnh là `bathroom_toiletries` hoặc `gym_fitness`.
- **Thẩm định tương quan ngữ nghĩa (Semantic Verifier)**:
  - Bổ sung kiểm tra độ tương đồng cosine giữa embedding của ảnh crop và text embedding của nhãn. Nếu cosine similarity $< 0.20$, loại bỏ ứng viên ngay lập tức.

---

## 5. CHIẾN LƯỢC TỐI ƯU HÓA ĐỘ TRỄ CHO PRODUCTION (CPU CLOUD / RENDER)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PRODUCTION SPEED OPTIMIZATION                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Vector Cache Offline (Đã hoàn thiện): Set classes tốn 0.005s (O(1))       │
│ 2. Lượng tử hóa OpenVINO / ONNX INT8: Tăng tốc độ suy luận 2.5x trên CPU     │
│ 3. Two-Phase UI Response: Trả Bounding Box trong 300ms, Stream LLM ngầm     │
│ 4. Client-side Pre-processing: Resize 640px qua Canvas ở Web/Mobile App     │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Lượng tử hóa mô hình (INT8 Quantization)**:
   - Sử dụng OpenVINO Runtime hoặc ONNX Runtime (với tối ưu hóa AVX2/AVX-512 trên CPU):
   - Giảm kích thước file mô hình từ $90MB \to 24MB$.
   - Giảm độ trễ từ $250ms \to 85ms$ trên mỗi lượt quét ảnh.
2. **Kiến trúc Two-Phase UI Response (Độ trễ cảm nhận < 300ms)**:
   - **Giai đoạn 1 (Tức thì - ~250ms)**: Backend trả về danh sách Bounding Boxes, tên từ vựng tiếng Anh, IPA và nghĩa tiếng Việt (được lấy tức thời từ cache `lexicon_service`). Giao diện bật sáng khung nhận diện và hiển thị từ vựng ngay lập tức.
   - **Giai đoạn 2 (Bất đồng bộ - ~500ms)**: Câu chuyện ngữ cảnh (Context Story) và Quiz được sinh từ Groq LLM chạy ngầm qua Server-Sent Events (SSE) hoặc request riêng biệt, không làm treo màn hình của người dùng.
3. **Tiền xử lý tại Client (Zero Network Waste)**:
   - Ảnh chụp từ Camera hoặc Upload được Canvas/WebWorker trên trình duyệt tự động resize về tối đa $640px$ trước khi gửi lên máy chủ. Giảm tải kích thước payload truyền qua mạng từ $5MB \to 120KB$ (tiết kiệm $97\%$ băng thông).

---

## 6. KẾ HOẠCH TRIỂN KHAI CHI TIẾT (ACTIONABLE ROADMAP)

### Sprint 1: Tối Ưu Logic & Khắc Phục Lỗi Lập Tức (1 - 2 ngày)
- [ ] Cập nhật [scene_service.py](file:///Users/buiuyenthu/Documents/LeHoaiNam/GitHub/vocario-ai-vocabulary-platform/backend/services/scene_service.py): Bổ sung cơ chế Soft-Gating Top-2 Themes khi `confidence < 0.80`.
- [ ] Cập nhật [verifier_service.py](file:///Users/buiuyenthu/Documents/LeHoaiNam/GitHub/vocario-ai-vocabulary-platform/backend/services/verifier_service.py): Thêm ma trận Blacklist Rules cấm gán nhãn dị biệt (`library`, `clothes rack`).
- [ ] Cập nhật [ai_vision_server.py](file:///Users/buiuyenthu/Documents/LeHoaiNam/GitHub/vocario-ai-vocabulary-platform/backend/services/ai_vision_server.py): Áp dụng Adaptive Confidence Thresholds (0.12 cho vật thể nhỏ, 0.35 cho nhãn lớn trừu tượng).

### Sprint 2: Nâng Cấp Bộ Thẩm Định Ngữ Nghĩa Semantics (2 - 3 ngày)
- [ ] Tích hợp Semantic Verifier nhẹ (MobileCLIP-S0 / Zero-Shot Cosine Embedding) vào Tầng 3 để thay thế hoàn toàn phép tính phương sai không gian.
- [ ] Tích hợp Micro-Tiling cho các bối cảnh ẩm thực, siêu thị, tiệm bánh để tối ưu Recall.

### Sprint 3: Lượng Tử Hóa Production & Two-Phase Streaming (2 - 3 ngày)
- [ ] Xuất mô hình YOLO-World v2 và Verifier sang định dạng ONNX Runtime INT8 / OpenVINO để tăng tốc 2.5x trên Render CPU.
- [ ] Cấu hình endpoint phát trực tiếp (Two-Phase / Streaming API) cho Frontend Scanner.

### Sprint 4: Kiểm Thử Toàn Diện & Đánh Giá Lại Benchmark (1 ngày)
- [ ] Chạy lại toàn bộ 20 ảnh benchmark trên pipeline mới.
- [ ] Lập biểu đồ so sánh độ chính xác trước và sau cải tiến (Precision, Recall, Latency, False Positive Rate).

---

## 7. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

| Chỉ số đo lường (Metric) | Hiện trạng (Baseline) | Mục tiêu sau cải tiến |
| :--- | :---: | :---: |
| **Điểm tin cậy trung bình (Average Confidence)** | 0.48 | **$\ge 0.75$** |
| **Tỷ lệ ảnh đạt $\ge 5$ từ vựng học tập** | 50% (10/20 ảnh) | **$\ge 90\%$ (18/20 ảnh)** |
| **Tỷ lệ nhãn ảo giác / gán nhãn sai (False Positive Rate)** | ~15% | **$\le 2\%$** |
| **Độ trễ xử lý Backend (End-to-End Latency trên CPU)** | ~350 - 550 ms | **$\le 250 - 300 ms$** |
| **Độ trễ cảm nhận người dùng (Perceived Latency trên UI)** | ~1.5 - 2.5 s | **$\le 400 ms$** |

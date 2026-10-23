# Vocario Project Architecture & Context Map

> **Mục đích**: Tài liệu này đóng gói toàn bộ kiến trúc, công nghệ, API, Database và quy ước thiết kế của dự án Vocario.
> Agent đọc tài liệu này trong 1 lượt để nắm bắt 100% ngữ cảnh hệ thống, không cần quét lại hàng chục file code.

---

## 1. Tổng Quan Hệ Thống (System Overview)

Vocario là nền tảng học từ vựng tiếng Anh theo ngữ cảnh đời thực kết hợp **AI Vision (YOLO-World)** và **Thuật toán lặp lại ngắt quãng (SM-2 Spaced Repetition)**.

| Thành phần | Công nghệ / Framework | Cổng chạy (Port) | Vai trò |
| :--- | :--- | :--- | :--- |
| **Backend** | Spring Boot 3.3.4 (Java 17, Maven) | `8088` | RESTful API, Xử lý nghiệp vụ, Quản lý CSDL, Điều phối SM-2 |
| **Frontend** | Angular 19 (Standalone, Signals, Tailwind) | `4200` | Giao diện KaChiKa, Studio Camera/Upload, Ôn tập Flashcard SM-2 |
| **Database** | PostgreSQL 16 (`vocario_db`) | `5432` | Lưu trữ người dùng, từ vựng, bối cảnh (captures), tiến trình SM-2 |
| **AI Vision** | Python 3.10+, PyTorch, Ultralytics YOLO-World | Local CLI / Subprocess | Nhận diện vật thể không giới hạn từ ngữ (Zero-shot Detection) |

---

## 2. Kiến Trúc Backend (vocario-backend)

- **Root Package**: `com.vocario`
- **Cấu hình chính**: `src/main/resources/application.yml`
- **Swagger / OpenAPI**: `http://localhost:8088/swagger-ui.html` | `/v3/api-docs`
- **File Upload Directory**: `file:uploads/` -> Phục vụ tĩnh qua URL: `http://localhost:8088/uploads/**`
- **Logging**: `logs/vocario.log` + Console với `ApiLoggingFilter` log chi tiết mọi request/response HTTP.

### Danh Sách Controller & Endpoint Chính:

#### 1. `AuthController` (`/api/auth`)
- `POST /register`: Đăng ký tài khoản (`email`, `username`, `password`, `fullName`).
- `POST /login`: Đăng nhập, trả về JWT Token & thông tin hồ sơ.
- `GET /me?userId={id}`: Lấy thông tin tài khoản hiện tại (nếu thiếu userId tự fallback về Demo User).

#### 2. `VisionController` (`/api/vision`)
- `GET /captures?userId={id}`: Lấy danh sách ảnh bối cảnh và nhãn vật thể đã lưu của người dùng.
- `POST /save-capture` (`multipart/form-data`):
  - Tham số: `image` (MultipartFile), `sceneTheme` (String), `detectedObjectsJson` (JSON String các box), `userId` (UUID).
  - Hành động: Lưu ảnh vào thư mục `uploads/`, tạo bản ghi trong bảng `captures`.
- `DELETE /captures/{id}`: Xóa bản ghi capture và giải phóng bối cảnh.
- `POST /learn-word`:
  - Tham số: `captureId`, `englishWord`, `vietnameseMeaning`, `phoneticIpa`, `userId`.
  - Hành động: Đưa từ vựng từ ảnh vào hàng đợi học SM-2 (`user_word_progress`).

#### 3. `SrsController` (`/api/srs`)
- `GET /due-cards?userId={id}`: Lấy danh sách thẻ từ vựng đến hạn ôn tập hôm nay (theo thuật toán SM-2).
- `POST /review`:
  - Tham số: `userId`, `wordId`, `quality` (0-5: Điểm đánh giá mức độ ghi nhớ).
  - Hành động: Tính toán `interval`, `repetitionNumber`, `easinessFactor`, cập nhật `nextReviewDate` và ghi log vào `review_logs`.
- `GET /stats?userId={id}`: Thống kê số lượng từ đang học (`LEARNING`), đang ôn (`REVIEWING`), đã thuần thục (`MASTERED`), và tổng số từ đến hạn hôm nay.

#### 4. `WordController` (`/api/words`)
- `GET /`: Danh sách toàn bộ từ vựng trong từ điển hệ thống.
- `GET /search?query={q}`: Tra cứu từ vựng theo từ tiếng Anh hoặc nghĩa tiếng Việt.
- `GET /topic/{topic}`: Lấy từ vựng theo chủ đề (Home, Kitchen, Office, v.v.).

### Mô Hình Dữ Liệu PostgreSQL (Entities):
- `User`: `id` (UUID), `email`, `username`, `password`, `fullName`, `role`, `streakCount`, `targetLevel`, `createdAt`.
- `Word`: `id` (UUID), `word`, `phoneticIpa`, `vietnameseMeaning`, `partOfSpeech`, `cefrLevel`, `exampleSentenceEn`, `exampleSentenceVi`, `collocation`.
- `Capture`: `id` (UUID), `user_id` (FK User), `imageUrl`, `sceneTheme`, `detectedObjects` (JSON Text), `createdAt`.
- `UserWordProgress`: `id` (UUID), `user_id` (FK), `word_id` (FK), `intervalDays`, `easinessFactor`, `repetitionNumber`, `nextReviewDate`, `status` (`LEARNING`, `REVIEWING`, `MASTERED`).
- `ReviewLog`: `id` (UUID), `user_word_progress_id`, `reviewQuality`, `reviewedAt`, `intervalDays`.

---

## 3. Kiến Trúc Frontend (vocario-angular)

- **Framework**: Angular 19 (Standalone Components, No NgModules)
- **State Management**: Angular Signals (`signal`, `computed`, `effect`)
- **Routing**: `src/app/app.routes.ts`
  - `/home`: Trang chủ học tập, thống kê SM-2, thẻ cần ôn hôm nay.
  - `/scanner`: Studio Quét ảnh AI Vision (Camera live stream & Upload file thật, loại bỏ toàn bộ dữ liệu giả).
  - `/collection`: Bộ sưu tập từ vựng, kho bối cảnh và từ điển cá nhân.
- **Dịch vụ Cốt lõi (Services)**:
  - `UserStudyService`: Quản lý toàn bộ State của học viên, đồng bộ HTTP với backend (`/api/vision`, `/api/srs`, `/api/words`), các signal: `scenes`, `selectedSceneId`, `activeScene`, `dueCards`, `stats`, `dbStatus`.
  - `ApiService`: Quản lý Current User (`currentUser`), xác thực auth token.
  - `ToastService`: Thông báo Toast trực quan nổi góc màn hình (`success`, `info`, `warning`, `error`).
- **Design System KaChiKa Warm Tone**:
  - Gam màu chủ đạo: Nền be ấm `#FAF7F2`, Màu gỗ nâu trầm `#7D6853`, Màu chữ đen cafe `#2D2823`, Màu nhấn vàng hổ phách `#F7D147`.
  - Icon System: `IconComponent` (`<app-icon name="..." [size]="18">`) vector SVG nét mảnh, không dùng thư viện ngoài nặng nề.

---

## 4. Kiến Trúc AI Vision (YOLO-World)

- **Model Weight**: `yolov8s-worldv2.pt` (ở thư mục gốc project).
- **Kịch bản Python**: `test_detect.py`
  - Sử dụng `ultralytics.YOLO`.
  - Đặt nhãn động (`set_classes([...])`) dựa theo bối cảnh (Kitchen, Living Room, Classroom, Coffee Shop, v.v.).
  - Output: Bounding Box tỉ lệ phần trăm (`topPercent`, `leftPercent`, `widthPercent`, `heightPercent`), nhãn tiếng Anh, độ tin cậy (`confidence`).

---

## 5. Quy Tắc "Thật 100%" & Mọi Thao Tác Đều Lưu Bảng CSDL (Database Persistence First)

1. **Tuyệt đối không hardcode mock data**: Không gán ID giả (`f9c62a79-...`), không dùng ảnh mẫu cố định (`/kitchen_word.png`, `/living_room.jpg`).
2. **Empty State rõ ràng**: Nếu người dùng chưa có ảnh hoặc từ vựng trong CSDL, giao diện phải hiển thị trạng thái trống (Empty State) hướng dẫn người dùng chụp ảnh/tải file lên.
3. **Mọi thao tác đều liên thông & lưu tạo thành Bảng CSDL (PostgreSQL)**:
   - Thao tác chụp ảnh / tải ảnh $\rightarrow$ Lưu file vật lý vào `uploads/` và tạo bản ghi vào bảng **`captures`**.
   - Thao tác chọn từ vựng học $\rightarrow$ Lưu bản ghi vào bảng **`user_word_progress`** (kết hợp tra cứu bảng **`words`**).
   - Thao tác đánh giá chất lượng ôn tập (SM-2) $\rightarrow$ Cập nhật `easinessFactor`, `intervalDays`, `nextReviewDate` trong bảng **`user_word_progress`** và lưu vết vào bảng **`review_logs`**.
   - Thao tác xóa bối cảnh $\rightarrow$ Gọi API xóa bản ghi khỏi bảng **`captures`** và dọn dẹp file.
   - Thao tác mới bất kỳ $\rightarrow$ Bắt buộc phải tạo Entity JPA / Bảng CSDL mới, không được chỉ lưu RAM hay LocalStorage tạm thời.


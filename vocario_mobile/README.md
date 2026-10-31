# VOCARIO MOBILE — ỨNG DỤNG HỌC TỪ VỰNG TIẾNG ANH NGỮ CẢNH (FLUTTER)

<p align="center">
  <img src="https://img.shields.io/badge/Flutter-3.29+-02569B?style=for-the-badge&logo=flutter&logoColor=white" alt="Flutter" />
  <img src="https://img.shields.io/badge/Dart-3.7+-0175C2?style=for-the-badge&logo=dart&logoColor=white" alt="Dart" />
  <img src="https://img.shields.io/badge/Dio-5.11+-blue?style=for-the-badge" alt="Dio" />
  <img src="https://img.shields.io/badge/Architecture-Clean%20%26%20Tokens-7D6853?style=for-the-badge" alt="Tokens" />
</p>

Ứng dụng di động **Vocario Mobile** được xây dựng bằng **Flutter**, đồng bộ hóa 1:1 với hệ sinh thái Web App (`vocario-angular`), Core Backend Spring Boot (`port 8088`), và AI Vision Service FastAPI YOLO-World v2 (`port 8001`).

---

## 📱 CÁC PHÂN HỆ NỔI BẬT

1. **AI Vision Scanner (`/scanner`):**
   - Chụp ảnh hoặc chọn ảnh từ thiết bị/thư viện.
   - Nạp 4 bối cảnh thực tế mẫu (*Góc bàn học, Phòng khách, Gian bếp, Quán cà phê*) kiểm thử suy luận AI tức thì.
   - Gửi ảnh đến FastAPI Port 8001 bóc tách Bounding Box phần trăm và lưu dữ liệu vào PostgreSQL qua Spring Boot.
2. **Sổ Từ Vựng & Thẻ Nhớ SM-2 (`/wordbook`):**
   - Giao diện 4 nút chuẩn hóa: `[Lại <1d]`, `[Khó 3d]`, `[Tốt 7d]`, `[Dễ 14d]`.
   - Tích hợp loa phát âm chuẩn tiếng Anh bản ngữ (Speech Synthesis TTS).
   - Tích hợp nút Micro mở **Trợ lý Chấm điểm Phát âm AI** (đo độ chính xác 0–100% bằng thuật toán Levenshtein).
3. **Đấu Trường Phản Xạ Thị Giác (`/arena`):**
   - Thử thách Blitz 60 giây và các đấu trường bối cảnh đời thực.
   - Tích hợp **Modal Bảng Vàng Top 10** kỉ lục phản xạ cho từng màn từ CSDL Spring Boot.
4. **Trích Xuất Văn Bản & Tài Liệu AI (`/extractor`):**
   - Kết nối trực tiếp mô hình Groq LLM (`/extract-vocab`) bóc tách từ vựng thực tế.
   - Nút **"Tải tệp PDF/Word/Text"** (`/parse-document`) đọc tài liệu tự động.
5. **Chứng Chỉ Chuẩn Hóa CEFR (`/profile`):**
   - Modal hiển thị chứng chỉ học thuật chính thức toàn màn hình với phôi vàng, mã số tra cứu `VOC-2026-XXXX`.

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY THỦ CÔNG (LOCAL DEV)

### 1. Yêu cầu môi trường
* **Flutter SDK:** Phiên bản `3.29.0` trở lên (Dart SDK `3.7+`).
* **Trình duyệt Google Chrome** (cho chế độ Flutter Web).
* *(Tùy chọn)* **Android Studio & Android Emulator** (cho chế độ máy ảo di động).

Kiểm tra môi trường trong terminal:
```powershell
flutter doctor
```

---

### 2. Các bước khởi chạy chi tiết

#### Bước 1: Mở Terminal tại thư mục `vocario_mobile`
```powershell
cd d:\GitHub\DoAnTotNghiep\vocario_mobile
```

#### Bước 2: Tải và đồng bộ các gói phụ thuộc (Dependencies)
```powershell
flutter pub get
```

#### Bước 3: Khởi chạy ứng dụng

* **Cách 1 — Chạy máy chủ Web độc lập (Khuyên dùng nhất trên Windows, không lo lỗi trình duyệt đóng ngắt kết nối):**
  ```powershell
  flutter run -d web-server --web-port=8089
  ```
  Sau khi hiện thông báo sẵn sàng, mở bất kỳ trình duyệt nào (Chrome, Edge) và truy cập: **`http://localhost:8089`**

* **Cách 2 — Tự động mở Google Chrome hoặc Microsoft Edge:**
  ```powershell
  flutter run -d chrome
  # Hoặc dùng Microsoft Edge có sẵn trên Windows:
  flutter run -d edge
  ```

* **Cách 3 — Chạy trên Máy ảo Android Emulator:**
  ```powershell
  flutter run -d android
  ```

* **Cách 4 — Xem danh sách tất cả thiết bị đang kết nối:**
  ```powershell
  flutter devices
  flutter run -d <DEVICE_ID>
  ```

---

## 🌐 CƠ CHẾ KẾT NỐI MẠNG TỰ ĐỘNG (`ApiService`)

File cấu hình tại `lib/core/services/api_service.dart` tự động nhận diện nền tảng đang chạy:

| Môi trường chạy | Địa chỉ Spring Boot API | Địa chỉ FastAPI AI Vision | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Flutter Web (Chrome)** | `http://127.0.0.1:8088` | `http://127.0.0.1:8001` | Kết nối localhost tiêu chuẩn |
| **Android Emulator** | `http://10.0.2.2:8088` | `http://10.0.2.2:8001` | IP loopback chuyển hướng của Android SDK |
| **Điện thoại thật (Wi-Fi)** | `http://192.168.1.xxx:8088` | `http://192.168.1.xxx:8001` | Thay `xxx` bằng IP LAN của máy tính |

---

## ⌨️ PHÍM TẮT ĐIỀU KHIỂN TRONG TERMINAL KHI APP ĐANG CHẠY

| Phím tắt | Tác vụ | Mô tả |
| :---: | :--- | :--- |
| **`r`** | **Hot Reload** | Áp dụng thay đổi code Dart tức thì trong ~1 giây mà không mất dữ liệu giao diện |
| **`R`** | **Hot Restart** | Khởi động lại toàn bộ ứng dụng và State về trạng thái ban đầu |
| **`h`** | **Help** | Hiển thị tất cả danh sách phím tắt hỗ trợ của Flutter CLI |
| **`q`** | **Quit** | Thoát và đóng ứng dụng an toàn |

---

## 🔑 TÀI KHOẢN TRẢI NGHIỆM DEMO
* **Học viên mẫu:** `nam23@gmail.com` / Mật khẩu: `123456`
* Có sẵn nút **"Học viên demo"** và **"Quản trị viên demo"** tại màn hình đăng nhập để đăng nhập tức thì chỉ với 1 chạm.

# 🚀 HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG VOCARIO

Tài liệu hướng dẫn khởi động 3 dịch vụ của nền tảng **Vocario** (Angular Frontend + Spring Boot Backend + Python AI Vision Engine).

---

## ⚡ CÁCH 1: KHỞI ĐỘNG NHANH BẰNG 1 CÚ CLICK (Khuyên dùng)
Tại thư mục gốc dự án:
- Double click vào file **`start_ai_service.bat`** để khởi chạy AI Server (Port 8001).

---

## 💻 CÁCH 2: KHỞI ĐỘNG THỦ CÔNG BẰNG 3 CỬA SỔ TERMINAL

### 🔹 Terminal 1: Python AI Vision Service (YOLO-World + Groq AI)
> Phục vụ bóc tách đồ vật từ ảnh thực tế, sinh phiên âm IPA chuẩn, dịch nghĩa và tạo hội thoại ngữ cảnh.

```powershell
# Chạy tại thư mục gốc: d:\GitHub\DoAnTotNghiep
py -m uvicorn backend.services.ai_vision_server:app --host 127.0.0.1 --port 8001 --reload
```
- **Port:** `8001`
- **Kiểm tra trạng thái:** `http://127.0.0.1:8001/health`

---

### 🔹 Terminal 2: Java Spring Boot Backend
> Phục vụ xác thực người dùng, lưu lịch sử quét ảnh vào PostgreSQL và thuật toán Spaced Repetition (SM-2).

```powershell
cd d:\GitHub\DoAnTotNghiep\vocario-backend
mvn spring-boot:run
```
- **Port:** `8088`
- **Tài liệu API (Swagger UI):** `http://localhost:8088/swagger-ui.html`

---

### 🔹 Terminal 3: Angular Frontend
> Giao diện Web học từ vựng bối cảnh, camera quét ảnh, flashcard ôn tập.

```powershell
cd d:\GitHub\DoAnTotNghiep\vocario-angular
npm start
```
- **Port:** `4200`
- **Trang ứng dụng:** `http://localhost:4200`
- **Studio Quét Ảnh:** `http://localhost:4200/scanner`

---

## 🔑 TÀI KHOẢN TRẢI NGHIỆM
- **Email:** `nam23@gmail.com`
- **Mật khẩu:** `123456`
*(Hoặc có thể bấm "Đăng ký" tài khoản mới trực tiếp trên web)*

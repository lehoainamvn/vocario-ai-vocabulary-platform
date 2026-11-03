# VOCARIO MOBILE CLIENT (REACT NATIVE & EXPO)

<p align="center">
  <img src="https://img.shields.io/badge/React%20Native-0.88-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/Expo-v58-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Design-Scandinavian%20Editorial-7D6853?style=for-the-badge" alt="Scandinavian Design" />
</p>

## 📱 Giới Thiệu
**Vocario Mobile** là ứng dụng di động chính thức của hệ thống Vocario, được xây dựng trên nền tảng **React Native 0.88** và **Expo 58**. Ứng dụng cung cấp trải nghiệm học từ vựng tiếng Anh theo ngữ cảnh đời thực thông qua Camera AI, kết hợp phương pháp ôn tập ngắt quãng **SuperMemo SM-2**.

---

## ✨ Tính Năng Nổi Bật

1. **AI Vision Studio (Center Scanner FAB):**
   - Quét nhận diện vật thể mở trong không gian thực qua Camera tích hợp hoặc tải ảnh từ thư viện.
   - Nút quét trung tâm nổi bật với biểu tượng thương hiệu Vocario vàng Gold (`#F7D147`).
   - Tự động bóc tách từ vựng, phiên âm quốc tế IPA, và câu thoại song ngữ ngữ cảnh.

2. **Visual Archive (Bộ Sưu Tập Bối Cảnh):**
   - Lưu trữ toàn bộ các bối cảnh đã quét kèm ảnh snapshot thực tế và danh sách từ vựng trích xuất.
   - Đồng bộ thời gian thực với cơ sở dữ liệu đám mây Supabase PostgreSQL.

3. **Spaced Repetition Flashcards (Sổ Tay Từ Vựng SM-2):**
   - Ôn tập ngắt quãng theo thuật toán SuperMemo SM-2.
   - Thao tác lật thẻ mượt mà, phân loại mức độ phản xạ trí nhớ (Grade 0 đến 5).
   - Phát âm chuẩn giọng bản xứ thông qua `expo-speech`.

4. **Arena & Leaderboard (Đấu Trường 60s Blitz & Bảng Xếp Hạng):**
   - Tranh tài từ vựng 60 giây nghẹt thở với các câu hỏi trắc nghiệm ngữ cảnh.
   - Bảng vàng thành tích học viên thời gian thực.

5. **Thiết Kế Scandinavian Editorial & Safe Area Chuẩn Mực:**
   - Bộ Three-Tier Design Tokens: `#FAF8F5` (Oat Milk), `#2B2625` (Nordic Noir), `#7D6853` (Warm Earth), `#F7D147` (Vibrant Gold).
   - Dynamic Top Inset xử lý triệt để tai thỏ / Dynamic Island trên mọi thiết bị iOS & Android.

---

## 🏗️ Cấu Trúc Mã Nguồn

```text
vocario-mobile/
├── assets/                   # Biểu tượng, logo thương hiệu và tài nguyên hình ảnh
├── src/
│   ├── api/                  # Axios HTTP client, token storage & REST API services
│   │   ├── client.ts         # Quản lý dynamic baseURL (LAN IP, Localhost, Render Cloud)
│   │   └── services.ts       # API Auth, Scanner, Wordbook, Flashcard, Arena, Archive
│   ├── components/           # UI Components tái sử dụng (Header, Cards, Modals)
│   ├── constants/            # Three-Tier Design Tokens & Palette màu Scandinavian
│   ├── navigation/           # RootNavigator, Bottom Tabs & Safe Area Screen Headers
│   ├── screens/              # Toàn bộ màn hình chức năng:
│   │   ├── HomeScreen.tsx           # Bàn làm việc tổng quan của học viên
│   │   ├── ScannerScreen.tsx        # Camera AI Studio quét nhận diện vật thể
│   │   ├── CollectionScreen.tsx     # Bộ sưu tập bối cảnh ảnh & từ vựng
│   │   ├── WordbookScreen.tsx       # Sổ tay từ vựng & Phòng luyện Flashcard SM-2
│   │   ├── ArenaScreen.tsx          # Đấu trường tốc độ từ vựng 60s Blitz
│   │   ├── LeaderboardScreen.tsx    # Bảng xếp hạng thành tích học viên
│   │   ├── TextExtractorScreen.tsx  # Document Intelligence bóc tách văn bản
│   │   ├── ClassroomScreen.tsx      # Không gian lớp học & nhóm học tập
│   │   └── ProfileScreen.tsx        # Hồ sơ cá nhân & chỉ số thành thạo CEFR
│   └── types/                # TypeScript interface definitions
├── app.json                  # Cấu hình Expo, app permissions và định danh bundle
└── package.json              # Quản lý dependencies & npm scripts
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### Yêu Cầu Môi Trường
- **Node.js:** v18+ hoặc v20+ LTS
- **Ứng dụng Expo Go:** Cài đặt từ App Store (iOS) hoặc Google Play (Android)

### Khởi Chạy Ứng Dụng
```bash
# 1. Di chuyển vào thư mục ứng dụng
cd vocario-mobile

# 2. Cài đặt các gói phụ thuộc
npm install

# 3. Khởi chạy Metro Bundler
npx expo start
```

- Quét mã QR hiển thị trong terminal bằng Camera iPhone hoặc ứng dụng Expo Go trên Android để mở app tức thì.
- **Phím `w`:** Mở bản Web Preview trên trình duyệt.
- **Phím `a` / `i`:** Mở trên Android Emulator / iOS Simulator.

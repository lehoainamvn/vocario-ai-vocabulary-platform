# VOCARIO PROJECT - QUY CHUẨN PHÁT TRIỂN & GIT WORKFLOW

## 1. QUY TẮC BẮT BUỘC VỀ GIT WORKFLOW
Mỗi khi thực hiện bất kỳ chỉnh sửa nào (sửa lỗi, phát triển tính năng, cập nhật cấu hình, refactor):
1. **Tuyệt đối KHÔNG commit trực tiếp vào nhánh `main`:**
   - Luôn tạo nhánh mới với tiền tố chuẩn:
     - `feat/<ten-tinh-nang>`: Tính năng mới
     - `fix/<ten-loi>`: Sửa lỗi / Bugfix
     - `chore/<ten-cong-viec>`: Cập nhật tài liệu, cấu hình, rules
     - `refactor/<ten-module>`: Tái cấu trúc mã nguồn
2. **Quy trình 5 bước bắt buộc:**
   - **Bước 1:** `git checkout -b <type>/<ten-nhanh>`
   - **Bước 2:** Chỉnh sửa code và kiểm tra tính chính xác.
   - **Bước 3:** Commit có quy ước chuẩn: `git commit -m "<type>(<scope>): <mô tả>"`
   - **Bước 4:** Đẩy nhánh lên remote: `git push -u origin <type>/<ten-nhanh>`
   - **Bước 5:** Chuyển về `main`, merge và đẩy lên `main`:
     ```bash
     git checkout main
     git merge <type>/<ten-nhanh>
     git push origin main
     ```
3. **Ngoại lệ duy nhất:** Khi người dùng yêu cầu chỉ sửa local để xem thử nghiệm và không push.

---

## 2. QUY CHUẨN KIẾN TRÚC & LƯU TRỮ
- **Lưu trữ ảnh bối cảnh:** Vì máy chủ Render Free Tier dùng ổ đĩa tạm thời (Ephemeral Disk), mọi ảnh chụp bối cảnh từ Scanner phải được lưu dưới dạng Base64 Data URL trực tiếp vào Supabase PostgreSQL để không bao giờ bị mất khi Render khởi động lại.
- **Frontend Image Fallback:** Mọi thẻ `<img>` hiển thị ảnh bối cảnh phải có `(error)="onImgError($event)"` và vùng chứa phải có `min-height` phù hợp chống sập giao diện khi có sự cố mạng.

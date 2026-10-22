---
description: Quy chuẩn bắt buộc về Git Workflow: Tạo nhánh chuẩn, Commit có quy ước và Merge vào main
globs: ["*"]
alwaysApply: true
---

# QUY CHUẨN BẮT BUỘC VỀ QUẢN LÝ NHÁNH VÀ COMMIT (GIT WORKFLOW)

Tất cả các thao tác sửa đổi mã nguồn, cấu hình, sửa lỗi (bugfix) hay phát triển tính năng mới trong dự án Vocario **BẮT BUỘC** phải tuân thủ nghiêm ngặt quy trình: **Tạo nhánh chuẩn $\rightarrow$ Commit $\rightarrow$ Merge vào main**.

---

## 1. NGUYÊN TẮC CỐT LÕI
1. **Tuyệt đối KHÔNG commit trực tiếp lên nhánh `main`:**
   - Mọi chỉnh sửa dù lớn hay nhỏ đều phải được thực hiện trên một nhánh độc lập (Feature / Fix / Chore branch).
2. **Quy ước đặt tên nhánh (Branch Naming Convention):**
   - `feat/<ten-tinh-nang>`: Thêm tính năng mới (ví dụ: `feat/quiz-stealth-mode`, `feat/zoom-magnifier`).
   - `fix/<ten-loi-can-sua>`: Sửa lỗi (ví dụ: `fix/bbox-alignment`, `fix/collection-image-fallback`).
   - `chore/<ten-nhiem-vu>`: Cập nhật cấu hình, dependency, tài liệu, rules (ví dụ: `chore/git-branching-rule`).
   - `refactor/<ten-module>`: Tái cấu trúc mã nguồn không làm thay đổi tính năng.
3. **Quy ước thông điệp Commit (Conventional Commits):**
   - Định dạng: `<type>(<scope>): <mô tả ngắn gọn, rõ ràng bằng tiếng Anh hoặc tiếng Việt chuẩn>`
   - Ví dụ:
     - `feat(quiz): add stealth hidden object mode with adaptive hit-testing`
     - `fix(vision): store base64 images permanently in supabase`

---

## 2. QUY TRÌNH 5 BƯỚC BẮT BUỘC THỰC HIỆN

Mỗi khi người dùng yêu cầu sửa đổi hoặc hoàn thành một tác vụ, trợ lý AI và lập trình viên phải thực hiện đúng 5 bước sau:

### Bước 1: Tạo nhánh mới từ `main`
```bash
git checkout main
git pull origin main
git checkout -b <type>/<ten-nhanh>
```

### Bước 2: Thực hiện chỉnh sửa mã nguồn & kiểm tra
- Sửa file, kiểm tra code hoạt động chính xác, không gây lỗi build / lint.

### Bước 3: Commit trên nhánh tính năng
```bash
git add <cac-file-thay-doi>
git commit -m "<type>(<scope>): <noi-dung-thay-doi>"
```

### Bước 4: Đẩy nhánh lên Remote (GitHub)
```bash
git push -u origin <type>/<ten-nhanh>
```

### Bước 5: Chuyển về `main`, Merge và Đẩy lên `main`
```bash
git checkout main
git merge <type>/<ten-nhanh>
git push origin main
```

---

## 3. TRƯỜNG HỢP NGOẠI LỆ
* Chỉ khi người dùng có chỉ định rõ ràng: *"Chỉ sửa ở local, không commit / không push"* thì mới không thực hiện bước push lên remote. Tuy nhiên, quy tắc tạo nhánh vẫn được ưu tiên áp dụng.

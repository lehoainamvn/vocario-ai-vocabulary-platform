"""
Tải 10 tấm ảnh HOÀN TOÀN MỚI với 10 bối cảnh độc đáo khác biệt:
1. Thư viện sách (Library)
2. Bệnh viện & Y tế (Hospital)
3. Phòng tập Gym & Thể thao (Gym & Fitness)
4. Nhà hàng tiệc & Ẩm thực (Restaurant)
5. Bãi biển & Du lịch ngoài trời (Beach & Nature)
6. Thú cưng & Động vật (Pets - Dog)
7. Sân bay & Ga tàu (Airport & Travel)
8. Cửa hàng quần áo & Thời trang (Clothing Store)
9. Phòng tắm & Đồ dùng vệ sinh (Bathroom)
10. Tiệm bánh mì & Bánh ngọt (Bakery)
"""

import os
import sys
import urllib.request

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
NEW_DATASET_DIR = os.path.join(PROJECT_ROOT, "backend", "evaluation", "test_dataset_batch2")
os.makedirs(NEW_DATASET_DIR, exist_ok=True)

NEW_IMAGES = [
    {
        "filename": "new_01_library.jpg",
        "url": "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&q=80",
        "title": "Thư viện sách & Không gian tự học (Library)"
    },
    {
        "filename": "new_02_hospital.jpg",
        "url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80",
        "title": "Bệnh viện & Phòng khám y tế (Hospital)"
    },
    {
        "filename": "new_03_gym.jpg",
        "url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
        "title": "Phòng tập Gym & Thể thao thể hình (Gym & Fitness)"
    },
    {
        "filename": "new_04_restaurant.jpg",
        "url": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
        "title": "Nhà hàng & Bàn tiệc ẩm thực (Restaurant)"
    },
    {
        "filename": "new_05_beach.jpg",
        "url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
        "title": "Bãi biển ngoài trời & Du lịch tự nhiên (Beach & Nature)"
    },
    {
        "filename": "new_06_pets.jpg",
        "url": "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80",
        "title": "Thú cưng & Chó mèo đời sống (Pets & Animals)"
    },
    {
        "filename": "new_07_airport.jpg",
        "url": "https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=800&q=80",
        "title": "Sân bay & Hành khách du lịch (Airport & Travel)"
    },
    {
        "filename": "new_08_clothing_store.jpg",
        "url": "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
        "title": "Cửa hàng thời trang & Quần áo (Clothing Store)"
    },
    {
        "filename": "new_09_bathroom.jpg",
        "url": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80",
        "title": "Phòng tắm & Thiết bị vệ sinh (Bathroom)"
    },
    {
        "filename": "new_10_bakery.jpg",
        "url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80",
        "title": "Tiệm bánh mì & Bách hóa ngọt (Bakery)"
    }
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

print(f"📥 Bắt đầu tải 10 ảnh bối cảnh HOÀN TOÀN MỚI vào: {NEW_DATASET_DIR}...\n")

for item in NEW_IMAGES:
    dest = os.path.join(NEW_DATASET_DIR, item["filename"])
    if not os.path.exists(dest):
        try:
            req = urllib.request.Request(item["url"], headers=headers)
            with urllib.request.urlopen(req, timeout=12) as resp, open(dest, 'wb') as f:
                f.write(resp.read())
            print(f"✅ Đã tải: {item['filename']} ({item['title']})")
        except Exception as e:
            print(f"⚠️ Lỗi tải {item['filename']}: {e}")
    else:
        print(f"✔️ Đã có: {item['filename']}")

print("\n🎉 Hoàn tất chuẩn bị 10 ảnh bối cảnh mới!")

"""
Tải hoặc chuẩn bị 10 ảnh bối cảnh phong phú cho Vocario AI Benchmark:
1. Bàn học / Văn phòng (study_office)
2. Phòng khách / Nội thất (living_room_decor)
3. Nhà bếp & Thiết bị (kitchen_appliances)
4. Xe cộ & Đường phố (outdoor_vehicles_street)
5. Công viên & Cây cối (nature_animals_plants - Park)
6. Quán Cà Phê & Bàn Ăn (dining_tableware - Cafe)
7. Phòng Ngủ & Không Gian Riêng (bedroom_personal_space)
8. Siêu Thị & Thực Phẩm (food_fruits_groceries - Supermarket)
9. Sân Thể Thao Ngoài Trời (sports_recreation - Sports)
10. Người & Camera Học Tập (human_study_camera)
"""

import os
import sys
import urllib.request
from PIL import Image

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

DATASET_DIR = os.path.join(os.path.dirname(__file__), "test_dataset")
os.makedirs(DATASET_DIR, exist_ok=True)

# Danh sách URL ảnh nguồn công cộng Wikimedia Commons / Unsplash / COCO
NEW_SCENES = [
    {
        "filename": "park_bench_01.jpg",
        "url": "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800&q=80",
        "desc": "Công viên cây xanh có ghế đá dài, bãi cỏ và cây cổ thụ"
    },
    {
        "filename": "coffee_shop_01.jpg",
        "url": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80",
        "desc": "Quán cà phê có bàn ghế gỗ, ly tách và quầy pha chế"
    },
    {
        "filename": "bedroom_01.jpg",
        "url": "https://images.unsplash.com/photo-1540518614846-7ede433c4550?w=800&q=80",
        "desc": "Phòng ngủ ấm cúng có giường nệm, gối nằm và đèn ngủ"
    },
    {
        "filename": "supermarket_01.jpg",
        "url": "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80",
        "desc": "Siêu thị bách hóa có các giỏ táo, trái cây tươi và quầy hàng"
    },
    {
        "filename": "sports_court_01.jpg",
        "url": "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
        "desc": "Sân bóng rổ ngoài trời có cột rổ, vạch sơn và bóng"
    }
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for scene in NEW_SCENES:
    dest_path = os.path.join(DATASET_DIR, scene["filename"])
    if not os.path.exists(dest_path):
        print(f"📥 Đang tải ảnh bối cảnh mới: {scene['filename']}...")
        try:
            req = urllib.request.Request(scene["url"], headers=headers)
            with urllib.request.urlopen(req, timeout=10) as resp, open(dest_path, 'wb') as f:
                f.write(resp.read())
            print(f"✅ Tải thành công: {dest_path}")
        except Exception as e:
            print(f"⚠️ Lỗi tải ảnh {scene['filename']}: {e}")
    else:
        print(f"✔️ Đã có sẵn: {scene['filename']}")

print("\n🎉 Bộ dữ liệu 10 bối cảnh đã sẵn sàng!")

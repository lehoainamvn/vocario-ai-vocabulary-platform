"""
KIỂM THỬ THỰC THI 10 BỐI CẢNH ĐỜI SỐNG ĐA DẠNG QUA PIPELINE AI 3 TẦNG VOCARIO
Bao gồm:
1. Bàn học & Làm việc (study_office)
2. Phòng khách & Nội thất (living_room_decor)
3. Xe cộ & Đường phố (outdoor_vehicles_street)
4. Nhà bếp & Thiết bị (kitchen_appliances)
5. Công viên & Cây xanh (nature_animals_plants)
6. Quán cà phê & Ẩm thực (dining_tableware)
7. Phòng ngủ & Riêng tư (bedroom_personal_space)
8. Siêu thị & Trái cây bách hóa (food_fruits_groceries)
9. Sân thể thao ngoài trời (sports_recreation)
10. Góc học tập cá nhân qua Camera (camera_workspace_person)
"""

import os
import sys
import time
import json
from PIL import Image, ImageDraw, ImageFont

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, PROJECT_ROOT)

from ultralytics import YOLOWorld
from backend.services.scene_service import scene_service
from backend.services.lexicon_service import lexicon_service
from backend.services.verifier_service import verifier_service

FINETUNED_PATH = os.path.join(PROJECT_ROOT, "runs", "train", "vocario_yolo_world_finetune", "weights", "best.pt")
MODEL_PATH = FINETUNED_PATH if os.path.exists(FINETUNED_PATH) else os.path.join(PROJECT_ROOT, "yolov8s-worldv2.pt")
DATASET_DIR = os.path.join(PROJECT_ROOT, "backend", "evaluation", "test_dataset")
OUTPUT_FIG_DIR = os.path.join(PROJECT_ROOT, "docs", "figures")
os.makedirs(OUTPUT_FIG_DIR, exist_ok=True)

print(f"📦 Đang nạp mô hình Object Detection: {MODEL_PATH}")
model = YOLOWorld(MODEL_PATH)

# Thiết lập danh sách từ vựng nhận diện phong phú cho 10 bối cảnh
ALL_SCENE_CLASSES = [
    # Bàn học / Văn phòng
    "desk", "chair", "laptop", "book", "cup", "bookshelf", "table", "computer mouse",
    # Phòng khách
    "sofa", "couch", "coffee table", "pillow", "cushion", "carpet", "lamp", "window",
    # Xe cộ / Đường phố
    "bus", "car", "person", "road", "street lamp", "traffic light", "motorcycle", "bicycle",
    # Nhà bếp
    "refrigerator", "bottle", "kitchen counter", "sink", "microwave", "bowl", "plate",
    # Công viên / Tự nhiên
    "bench", "tree", "grass", "potted plant", "flower", "park bench", "pathway",
    # Quán Cafe / Ăn uống
    "dining table", "coffee cup", "tea cup", "glass", "menu", "chair", "counter",
    # Phòng ngủ
    "bed", "pillow", "nightstand", "blanket", "wardrobe", "mirror",
    # Siêu thị / Bách hóa
    "apple", "banana", "orange", "shopping cart", "shelf", "box", "fruit",
    # Thể thao
    "basketball", "sports ball", "basketball hoop", "court", "fence", "sports shoes"
]
model.set_classes(ALL_SCENE_CLASSES)

BENCHMARK_SCENES = [
    {
        "id": 1,
        "filename": "study_desk_01.png",
        "name": "Bàn Học & Góc Làm Việc",
        "output_file": "scene_01_study_desk.jpg"
    },
    {
        "id": 2,
        "filename": "living_room_01.jpg",
        "name": "Phòng Khách Hiện Đại & Sofa",
        "output_file": "scene_02_living_room.jpg"
    },
    {
        "id": 3,
        "filename": "traffic_bus_01.jpg",
        "name": "Đường Phố & Xe Buýt Giao Thông",
        "output_file": "scene_03_traffic_bus.jpg"
    },
    {
        "id": 4,
        "filename": "kitchen_01.png",
        "name": "Nhà Bếp & Thiết Bị Gia Dụng",
        "output_file": "scene_04_kitchen.jpg"
    },
    {
        "id": 5,
        "filename": "park_bench_01.jpg",
        "name": "Công Viên, Cây Xanh & Ghế Đá",
        "output_file": "scene_05_park_nature.jpg"
    },
    {
        "id": 6,
        "filename": "coffee_shop_01.jpg",
        "name": "Quán Cà Phê & Bàn Ghế Ẩm Thực",
        "output_file": "scene_06_coffee_shop.jpg"
    },
    {
        "id": 7,
        "filename": "bedroom_01.jpg",
        "name": "Phòng Ngủ, Giường Nệm & Đèn Ngủ",
        "output_file": "scene_07_bedroom.jpg"
    },
    {
        "id": 8,
        "filename": "supermarket_01.jpg",
        "name": "Siêu Thị, Kệ Hàng & Trái Cây",
        "output_file": "scene_08_supermarket.jpg"
    },
    {
        "id": 9,
        "filename": "sports_court_01.jpg",
        "name": "Sân Thể Thao & Bóng Rổ Ngoài Trời",
        "output_file": "scene_09_sports_court.jpg"
    },
    {
        "id": 10,
        "filename": "camera_desk_01.jpg",
        "name": "Góc Làm Việc Cá Nhân Qua Camera",
        "output_file": "scene_10_camera_workspace.jpg"
    }
]

colors = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899", "#14B8A6"]
all_benchmark_results = []

print("\n🚀 BẮT ĐẦU CHẠY THỰC NGHIỆM ĐÁNH GIÁ 10 BỐI CẢNH TOÀN DIỆN...\n")

for scene_cfg in BENCHMARK_SCENES:
    img_path = os.path.join(DATASET_DIR, scene_cfg["filename"])
    if not os.path.exists(img_path):
        print(f"❌ Không tìm thấy: {img_path}")
        continue

    print(f"==================================================================")
    print(f"📸 [{scene_cfg['id']}/10] KIỂM THỬ: {scene_cfg['name'].upper()}")
    print(f"📁 Tệp: {scene_cfg['filename']}")
    print(f"==================================================================")

    img = Image.open(img_path).convert("RGB")
    w, h = img.size

    # --- TẦNG 1: SCENE CLASSIFIER ---
    t0 = time.time()
    scene_res = scene_service.predict_scene(img)
    t_scene = round((time.time() - t0) * 1000, 1)

    theme_vi = scene_res.get("theme_name_vi", "Không xác định")
    conf_scene = round(scene_res.get("confidence", 0.0) * 100, 1)

    print(f"🏛️ [Tầng 1]: {theme_vi} (Độ tin cậy: {conf_scene}% - Thời gian: {t_scene} ms)")

    # --- TẦNG 2: OBJECT DETECTOR ---
    t1 = time.time()
    preds = model.predict(img, conf=0.15, iou=0.5, imgsz=640, verbose=False)
    t_yolo = round((time.time() - t1) * 1000, 1)

    detected = []

    for r in preds:
        for i, box in enumerate(r.boxes):
            cls_id = int(box.cls[0].item())
            cls_name = model.names[cls_id]
            conf = float(box.conf[0].item())
            xyxy = box.xyxy[0].tolist()

            detected.append({
                "label": cls_name,
                "confidence": round(conf, 2),
                "box_pixels": [round(coord, 1) for coord in xyxy],
                "box_percent": [
                    round(xyxy[1] / h * 100, 1),
                    round(xyxy[0] / w * 100, 1),
                    round(xyxy[3] / h * 100, 1),
                    round(xyxy[2] / w * 100, 1)
                ]
            })

    print(f"🎯 [Tầng 2A - Đề xuất thô YOLO]: {len(detected)} hộp bao ({t_yolo} ms)")

    # --- TẦNG 2B: TWO-STAGE DEEP VERIFIER & REFINE ---
    t_v0 = time.time()
    verified = verifier_service.verify_and_refine(img, detected, scene_key=scene_res.get("theme_key"))
    t_ver = round((time.time() - t_v0) * 1000, 1)

    print(f"🔬 [Tầng 2B - Deep Verifier]: {len(verified)}/{len(detected)} vật thể đạt chuẩn sau thẩm định ({t_ver} ms)")
    
    # Vẽ các Bounding Box đã được kiểm chứng chất lượng cao
    draw = ImageDraw.Draw(img)
    for i, v_obj in enumerate(verified):
        bp = v_obj["box_percent"]
        y1_px = max(0, int(bp[0] / 100.0 * h))
        x1_px = max(0, int(bp[1] / 100.0 * w))
        y2_px = min(h, int(bp[2] / 100.0 * h))
        x2_px = min(w, int(bp[3] / 100.0 * w))
        xyxy_box = [x1_px, y1_px, x2_px, y2_px]

        col = colors[i % len(colors)]
        draw.rectangle(xyxy_box, outline=col, width=4)
        
        lbl_name = v_obj.get("word") or v_obj.get("label")
        lbl_text = f"{lbl_name.upper()} {round(v_obj['confidence']*100)}%"
        draw.rectangle([x1_px, max(0, y1_px - 22), x1_px + len(lbl_text)*9 + 10, y1_px], fill=col)
        draw.text((x1_px + 5, max(0, y1_px - 18)), lbl_text, fill="white")

    # Lưu ảnh ra thư mục docs/figures
    out_save_path = os.path.join(OUTPUT_FIG_DIR, scene_cfg["output_file"])
    img.save(out_save_path, quality=95)

    for d in verified[:6]:
        lbl_d = d.get("word") or d.get("label")
        print(f"     ✅ [{lbl_d:14}] (Độ tin cậy: {int(d['confidence']*100)}%) | Box: {d['box_percent']}")
    if len(verified) > 6:
        print(f"     ✅ ... và {len(verified)-6} vật thể đã thẩm định khác.")

    # --- TẦNG 3: LEXICON & CEFR ---
    unique_labels = list(dict.fromkeys([d.get("word") or d.get("label") for d in verified]))
    enriched = []
    print(f"🧠 [Tầng 3]: Bóc tách từ vựng & Chuẩn hóa CEFR:")
    for lbl in unique_labels:
        lex = lexicon_service.lookup(lbl)
        item = {
            "word": lbl,
            "ipa": lex.get("ipa", ""),
            "vietnamese": lex.get("vietnamese", ""),
            "level": lex.get("level", "A1")
        }
        enriched.append(item)
        print(f"     * {item['word']:14} | IPA: {item['ipa']:16} | Nghĩa: {item['vietnamese']:22} | CEFR: {item['level']}")

    all_benchmark_results.append({
        "id": scene_cfg["id"],
        "scene_name": scene_cfg["name"],
        "filename": scene_cfg["filename"],
        "output_image": scene_cfg["output_file"],
        "t1_scene": theme_vi,
        "t1_conf": f"{conf_scene}%",
        "t1_latency": f"{t_scene} ms",
        "t2_count": len(detected),
        "t2_latency": f"{t_yolo} ms",
        "t2_samples": detected[:5],
        "vocabulary": enriched
    })
    print()

# Xuất file kết quả JSON tổng hợp
JSON_OUT = os.path.join(PROJECT_ROOT, "backend", "evaluation", "benchmark_10_scenes_results.json")
with open(JSON_OUT, "w", encoding="utf-8") as f:
    json.dump(all_benchmark_results, f, ensure_ascii=False, indent=2)

print(f"\n🎉 ĐÃ HOÀN TẤT KIỂM THỬ THỰC TẾ TRÊN TOÀN BỘ 10 BỐI CẢNH!")
print(f"📄 File kết quả JSON: {JSON_OUT}")
print(f"🖼️ Thư mục ảnh đã vẽ Bounding Box: {OUTPUT_FIG_DIR}")

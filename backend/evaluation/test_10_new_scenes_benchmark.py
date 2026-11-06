"""
KIỂM THỬ THỰC TẾ TRÊN 10 TẤM ẢNH BỐI CẢNH HOÀN TOÀN MỚI (BATCH 2)
ÁP DỤNG KIẾN TRÚC AI 3 TẦNG:
- Tầng 1: Scene Classifier (ResNet-18 Places365)
- Tầng 2A: Coarse Object Proposal (YOLO-World v2)
- Tầng 2B: Deep Two-Stage Verifier (MobileNetV3 Feature Extractor + Geometry + Co-occurrence)
- Tầng 3: Lexicon Enrichment & CEFR (Cambridge EVP)
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
DATASET_DIR = os.path.join(PROJECT_ROOT, "backend", "evaluation", "test_dataset_batch2")
OUTPUT_FIG_DIR = os.path.join(PROJECT_ROOT, "docs", "figures")
os.makedirs(OUTPUT_FIG_DIR, exist_ok=True)

print(f"📦 Đang nạp mô hình: {MODEL_PATH}")
model = YOLOWorld(MODEL_PATH)

# Không gian từ vựng phong phú cho 10 bối cảnh mới
VOCAB_CLASSES = [
    # Thư viện (Library)
    "book", "bookshelf", "library", "desk", "chair", "table", "laptop", "lamp",
    # Bệnh viện (Hospital)
    "hospital bed", "wheelchair", "stethoscope", "medicine", "doctor", "nurse", "chair", "bed", "person",
    # Phòng Gym (Gym)
    "dumbbell", "barbell", "treadmill", "exercise equipment", "sports equipment", "mirror", "person", "bench",
    # Nhà hàng (Restaurant)
    "dining table", "wine glass", "plate", "fork", "knife", "chair", "menu", "cup", "bottle", "napkin",
    # Bãi biển (Beach)
    "umbrella", "beach umbrella", "sand", "ocean", "sea", "boat", "surfboard", "person", "sun lounger",
    # Thú cưng (Pets)
    "dog", "cat", "pet", "collar", "leash", "ball", "dog bowl",
    # Sân bay (Airport)
    "airplane", "luggage", "suitcase", "backpack", "escalator", "person", "chair",
    # Cửa hàng quần áo (Clothing Store)
    "clothing", "dress", "shirt", "jacket", "jeans", "clothes rack", "mannequin", "hanger", "shelf",
    # Phòng tắm (Bathroom)
    "bathtub", "shower", "toilet", "sink", "faucet", "towel", "mirror", "soap dispenser", "shampoo",
    # Tiệm bánh mì (Bakery)
    "bread", "croissant", "cake", "pastry", "cookie", "basket", "tray", "shelf", "counter"
]
model.set_classes(VOCAB_CLASSES)

NEW_BENCHMARK_SCENES = [
    {"id": 1, "filename": "new_01_library.jpg", "name": "Thư Viện & Góc Tự Học", "out": "batch2_01_library.jpg"},
    {"id": 2, "filename": "new_02_hospital.jpg", "name": "Bệnh Viện & Phòng Khám Y Tế", "out": "batch2_02_hospital.jpg"},
    {"id": 3, "filename": "new_03_gym.jpg", "name": "Phòng Tập Gym & Thể Thao", "out": "batch2_03_gym.jpg"},
    {"id": 4, "filename": "new_04_restaurant.jpg", "name": "Nhà Hàng & Bàn Tiệc Ẩm Thực", "out": "batch2_04_restaurant.jpg"},
    {"id": 5, "filename": "new_05_beach.jpg", "name": "Bãi Biển & Du Lịch Tự Nhiên", "out": "batch2_05_beach.jpg"},
    {"id": 6, "filename": "new_06_pets.jpg", "name": "Thú Cưng & Động Vật Đời Sống", "out": "batch2_06_pets.jpg"},
    {"id": 7, "filename": "new_07_airport.jpg", "name": "Sân Bay & Hành Khách Du Lịch", "out": "batch2_07_airport.jpg"},
    {"id": 8, "filename": "new_08_clothing_store.jpg", "name": "Cửa Hàng Thời Trang & Quần Áo", "out": "batch2_08_clothing_store.jpg"},
    {"id": 9, "filename": "new_09_bathroom.jpg", "name": "Phòng Tắm & Thiết Bị Vệ Sinh", "out": "batch2_09_bathroom.jpg"},
    {"id": 10, "filename": "new_10_bakery.jpg", "name": "Tiệm Bánh Mì & Bánh Ngọt", "out": "batch2_10_bakery.jpg"}
]

colors = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899", "#14B8A6"]
batch2_results = []

print("\n🚀 BẮT ĐẦU CHẠY KIỂM THỬ 10 ẢNH BỐI CẢNH MỚI TOÀN DIỆN...\n")

for item in NEW_BENCHMARK_SCENES:
    img_path = os.path.join(DATASET_DIR, item["filename"])
    if not os.path.exists(img_path):
        print(f"❌ Không tìm thấy: {img_path}")
        continue

    print(f"==================================================================")
    print(f"📸 [{item['id']}/10] KIỂM THỬ ẢNH MỚI: {item['name'].upper()}")
    print(f"📁 Tệp ảnh: {item['filename']}")
    print(f"==================================================================")

    img = Image.open(img_path).convert("RGB")
    w, h = img.size

    # --- TẦNG 1: SCENE CLASSIFIER ---
    t0 = time.time()
    scene_res = scene_service.predict_scene(img)
    t_scene = round((time.time() - t0) * 1000, 1)

    theme_vi = scene_res.get("theme_name_vi", "Không xác định")
    conf_scene = round(scene_res.get("confidence", 0.0) * 100, 1)

    print(f"🏛️ [Tầng 1 - Scene]: {theme_vi} (Độ tin cậy: {conf_scene}% | {t_scene} ms)")

    # --- TẦNG 2A: YOLO-WORLD COARSE PROPOSAL ---
    t1 = time.time()
    preds = model.predict(img, conf=0.15, iou=0.5, imgsz=640, verbose=False)
    t_yolo = round((time.time() - t1) * 1000, 1)

    detected = []
    for r in preds:
        for box in r.boxes:
            cls_id = int(box.cls[0].item())
            cls_name = model.names[cls_id]
            conf = float(box.conf[0].item())
            xyxy = box.xyxy[0].tolist()

            detected.append({
                "label": cls_name,
                "confidence": round(conf, 2),
                "box_pixels": [round(c, 1) for c in xyxy],
                "box_percent": [
                    round(xyxy[1] / h * 100, 1),
                    round(xyxy[0] / w * 100, 1),
                    round(xyxy[3] / h * 100, 1),
                    round(xyxy[2] / w * 100, 1)
                ]
            })

    print(f"🎯 [Tầng 2A - YOLO-World]: {len(detected)} đề xuất thô ({t_yolo} ms)")

    # --- TẦNG 2B: TWO-STAGE DEEP VERIFIER ---
    t2 = time.time()
    verified = verifier_service.verify_and_refine(img, detected, scene_key=scene_res.get("theme_key"))
    t_ver = round((time.time() - t2) * 1000, 1)

    print(f"🔬 [Tầng 2B - Deep Verifier]: {len(verified)}/{len(detected)} vật thể đạt chuẩn sau thẩm định ({t_ver} ms)")

    # Vẽ khung chữ nhật lên ảnh cho các vật thể đã thẩm định
    draw = ImageDraw.Draw(img)
    for i, v_obj in enumerate(verified):
        bp = v_obj["box_percent"]
        y1_px = max(0, int(bp[0] / 100.0 * h))
        x1_px = max(0, int(bp[1] / 100.0 * w))
        y2_px = min(h, int(bp[2] / 100.0 * h))
        x2_px = min(w, int(bp[3] / 100.0 * w))

        col = colors[i % len(colors)]
        draw.rectangle([x1_px, y1_px, x2_px, y2_px], outline=col, width=4)

        lbl_name = v_obj.get("word") or v_obj.get("label")
        lbl_text = f"{lbl_name.upper()} {round(v_obj['confidence']*100)}%"
        draw.rectangle([x1_px, max(0, y1_px - 22), x1_px + len(lbl_text)*9 + 10, y1_px], fill=col)
        draw.text((x1_px + 5, max(0, y1_px - 18)), lbl_text, fill="white")

    # Lưu ảnh có bounding box
    out_img_path = os.path.join(OUTPUT_FIG_DIR, item["out"])
    img.save(out_img_path, quality=95)

    for d in verified[:5]:
        lbl_d = d.get("word") or d.get("label")
        print(f"     ✅ [{lbl_d:14}] (Độ tin cậy: {int(d['confidence']*100)}%) - Box: {d['box_percent']}")
    if len(verified) > 5:
        print(f"     ✅ ... và {len(verified)-5} vật thể đã thẩm định khác.")

    # --- TẦNG 3: LEXICON & CEFR ---
    unique_words = list(dict.fromkeys([d.get("word") or d.get("label") for d in verified]))
    enriched = []
    print(f"🧠 [Tầng 3 - Lexicon & CEFR]:")
    for w_name in unique_words:
        lex = lexicon_service.lookup(w_name)
        item_lex = {
            "word": w_name,
            "ipa": lex.get("ipa", ""),
            "vietnamese": lex.get("vietnamese", ""),
            "level": lex.get("level", "A1")
        }
        enriched.append(item_lex)
        print(f"     * {item_lex['word']:14} | IPA: {item_lex['ipa']:16} | Nghĩa: {item_lex['vietnamese']:22} | CEFR: {item_lex['level']}")

    batch2_results.append({
        "id": item["id"],
        "title": item["name"],
        "filename": item["filename"],
        "output_image": item["out"],
        "scene": theme_vi,
        "scene_confidence": f"{conf_scene}%",
        "raw_count": len(detected),
        "verified_count": len(verified),
        "objects": verified,
        "vocabulary": enriched
    })
    print()

JSON_OUT = os.path.join(PROJECT_ROOT, "backend", "evaluation", "benchmark_batch2_results.json")
with open(JSON_OUT, "w", encoding="utf-8") as f:
    json.dump(batch2_results, f, ensure_ascii=False, indent=2)

print(f"\n🎉 HOÀN TẤT KIỂM THỬ THỰC TẾ TRÊN 10 TẤM ẢNH BỐI CẢNH MỚI!")
print(f"📄 Kết quả JSON: {JSON_OUT}")

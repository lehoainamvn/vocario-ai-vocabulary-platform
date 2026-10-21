"""
TEST THỰC TẾ 2 TẤM ẢNH QUA PIPELINE AI VOCARIO (TẦNG 1 + TẦNG 2 + TẦNG 3)
1. Ảnh 1: study_desk_01.png (Bàn học, Laptop, Ghế, Sách, Chậu cây)
2. Ảnh 2: living_room_01.jpg (Ghế Sofa, Bàn trà, Cây cảnh, Sách, Gối)
"""

import os
import sys
import json
import time
from PIL import Image, ImageDraw, ImageFont

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, PROJECT_ROOT)

from ultralytics import YOLOWorld
from backend.services.scene_service import scene_service
from backend.services.lexicon_service import lexicon_service
from backend.services.context_generator import generate_context
from backend.services.verifier_service import verifier_service

FINETUNED_PATH = os.path.join(PROJECT_ROOT, "runs", "train", "vocario_yolo_world_finetune", "weights", "best.pt")
MODEL_PATH = FINETUNED_PATH if os.path.exists(FINETUNED_PATH) else os.path.join(PROJECT_ROOT, "yolov8s-worldv2.pt")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "docs", "figures")
os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"📦 Đang nạp mô hình Object Detection: {MODEL_PATH}")
model = YOLOWorld(MODEL_PATH)

TEST_IMAGES = [
    {
        "filename": "study_desk_01.png",
        "title": "Bối cảnh 1: Bàn Học & Góc Làm Việc (Study Desk & Laptop)",
        "output_name": "test_output_study_desk.jpg"
    },
    {
        "filename": "living_room_01.jpg",
        "title": "Bối cảnh 2: Phòng Khách Hiện Đại (Living Room & Sofa)",
        "output_name": "test_output_living_room.jpg"
    }
]

# Danh sách từ vựng mục tiêu cho 2 bài test
KEY_CLASSES = [
    "desk", "chair", "laptop", "book", "cup", "potted plant", "bookshelf", "table",
    "sofa", "couch", "coffee table", "pillow", "cushion", "carpet", "lamp", "window"
]
model.set_classes(KEY_CLASSES)

results_summary = []

for idx, test_info in enumerate(TEST_IMAGES, 1):
    img_path = os.path.join(PROJECT_ROOT, "backend", "evaluation", "test_dataset", test_info["filename"])
    if not os.path.exists(img_path):
        print(f"❌ Không tìm thấy ảnh: {img_path}")
        continue

    print(f"\n========================================================")
    print(f"🔍 ĐANG KIỂM THỬ ẢNH {idx}: {test_info['title']}")
    print(f"📁 Tệp ảnh: {img_path}")
    print(f"========================================================")

    img = Image.open(img_path).convert("RGB")
    w, h = img.size

    # --- TẦNG 1: SCENE CLASSIFICATION ---
    t0 = time.time()
    scene_result = scene_service.predict_scene(img)
    t_scene = round((time.time() - t0) * 1000, 1)

    predicted_theme = scene_result.get("theme", "auto")
    theme_name_vi = scene_result.get("theme_name_vi", "Không xác định")
    confidence_scene = round(scene_result.get("confidence", 0.0) * 100, 1)

    print(f"\n🏛️ [TẦNG 1 - SCENE CLASSIFIER]:")
    print(f"   - Bối cảnh nhận diện: {theme_name_vi} (Mã: {predicted_theme})")
    print(f"   - Độ tin cậy bối cảnh: {confidence_scene}%")
    print(f"   - Thời gian xử lý: {t_scene} ms")

    # --- TẦNG 2: OBJECT DETECTION (YOLO-World) ---
    t1 = time.time()
    preds = model.predict(img, conf=0.15, iou=0.5, imgsz=640, verbose=False)
    t_yolo = round((time.time() - t1) * 1000, 1)

    detected_objects = []
    draw = ImageDraw.Draw(img)

    # Bảng màu cho bounding box
    colors = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"]

    for r in preds:
        boxes = r.boxes
        for i, box in enumerate(boxes):
            cls_id = int(box.cls[0].item())
            cls_name = model.names[cls_id]
            conf = float(box.conf[0].item())
            xyxy = box.xyxy[0].tolist()

            # Tránh trùng lặp quá nhiều cùng 1 vật thể
            detected_objects.append({
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

            # Vẽ Bounding Box lên ảnh
            color = colors[i % len(colors)]
            draw.rectangle(xyxy, outline=color, width=4)
            # Label banner
            x0, y0, x1, y1 = xyxy
            label_text = f"{cls_name.upper()} {round(conf*100)}%"
            draw.rectangle([x0, max(0, y0 - 22), x0 + len(label_text)*9 + 10, y0], fill=color)
            draw.text((x0 + 5, max(0, y0 - 18)), label_text, fill="white")

    # Lưu ảnh kết quả có vẽ Bounding Box
    out_path = os.path.join(OUTPUT_DIR, test_info["output_name"])
    img.save(out_path, quality=95)

    print(f"\n🎯 [TẦNG 2A - COARSE OBJECT PROPOSAL (YOLO-World)]:")
    print(f"   - Số vật thể phát hiện thô: {len(detected_objects)} đề xuất ({t_yolo} ms)")

    # --- TẦNG 2B: TWO-STAGE DEEP VERIFIER & REFINE ---
    t_v0 = time.time()
    verified_objects = verifier_service.verify_and_refine(img, detected_objects, scene_key=predicted_theme)
    t_ver = round((time.time() - t_v0) * 1000, 1)

    print(f"\n🔬 [TẦNG 2B - TWO-STAGE DEEP VERIFIER]:")
    print(f"   - Số vật thể sau Thẩm định chất lượng cao: {len(verified_objects)}/{len(detected_objects)} ({t_ver} ms)")
    for obj in verified_objects:
        lbl = obj.get("word") or obj.get("label")
        print(f"     ✅ [{lbl:12}] (Độ tin cậy sau hiệu chuẩn: {int(obj['confidence']*100)}%) - [Tầng 2B: Verified]")

    # --- TẦNG 3: LEXICON & DICTIONARY LOOKUP ---
    unique_words = list(dict.fromkeys([o.get("word") or o.get("label") for o in verified_objects]))
    enriched_words = []
    print(f"\n🧠 [TẦNG 3 - LEXICON ENRICHMENT & CEFR]:")
    for word in unique_words:
        lex = lexicon_service.lookup(word)
        enriched_words.append({
            "word": word,
            "ipa": lex.get("ipa", ""),
            "meaning_vi": lex.get("vietnamese", ""),
            "cefr_level": lex.get("level", "A1")
        })
        print(f"     * {word:14} | IPA: {lex.get('ipa', ''):16} | Nghĩa: {lex.get('vietnamese', ''):20} | CEFR: {lex.get('level', 'A1')}")

    results_summary.append({
        "image": test_info["filename"],
        "scene": theme_name_vi,
        "scene_conf": f"{confidence_scene}%",
        "objects_count": len(detected_objects),
        "objects": detected_objects,
        "vocabulary": enriched_words,
        "output_image": out_path
    })

print(f"\n✅ HOÀN TẤT KIỂM THỬ 2 TẤM ẢNH!")

"""
BENCHMARK 10 ẢNH TẢI TRÊN MẠNG (ONLINE DATASET BENCHMARK)
Đo lường chi tiết:
1. Độ chính xác nhận diện (Precision, Recall, TP/FP/FN trên tổng vật thể thực tế)
2. Thời gian phản hồi từng tầng (Tầng 1 Places365, Tầng 2 YOLO-World, Tầng 2B Verifier)
3. Xuất hình ảnh nhận diện với Bounding Box trực quan
"""

import os
import sys
import time
import json
import urllib.request
import torch
from PIL import Image, ImageDraw, ImageFont

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.services.scene_service import scene_service
from backend.services.verifier_service import verifier_service
from backend.services.ai_vision_server import (
    apply_theme_classes, model, cached_classes, get_word_details
)

OUTPUT_DIR = os.path.join(ROOT_DIR, "docs", "figures", "test_10_online_benchmark")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 10 Bức ảnh chọn lọc từ Unsplash đa dạng 10 bối cảnh đời sống
IMAGES_DATA = [
    {
        "id": "01_study_desk",
        "nameVi": "Góc Làm Việc & Bàn Học",
        "url": "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80",
        "expected_theme": "study_office",
        "ground_truth_objects": [
            "laptop", "computer monitor", "desk", "chair", "potted plant", "pen", "notebook", "lamp", "desk pad"
        ]
    },
    {
        "id": "02_living_room",
        "nameVi": "Phòng Khách & Sofa",
        "url": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
        "expected_theme": "living_room_decor",
        "ground_truth_objects": [
            "sofa", "couch", "cushion", "pillow", "coffee table", "potted plant", "plant", "carpet", "rug", "wall art", "lamp"
        ]
    },
    {
        "id": "03_kitchen",
        "nameVi": "Nhà Bếp & Nấu Ăn",
        "url": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&q=80",
        "expected_theme": "kitchen_appliances",
        "ground_truth_objects": [
            "gas stove", "stove", "range hood", "sink", "faucet", "kitchen counter", "bar stool", "chair", "pot", "kitchen cabinet"
        ]
    },
    {
        "id": "04_dining_table",
        "nameVi": "Bàn Ăn & Dụng Cụ Bàn Tiệc",
        "url": "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800&q=80",
        "expected_theme": "dining_tableware",
        "ground_truth_objects": [
            "dining table", "chair", "wine glass", "plate", "fork", "knife", "spoon", "napkin", "candle"
        ]
    },
    {
        "id": "05_bedroom",
        "nameVi": "Phòng Ngủ & Giường Nệm",
        "url": "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&q=80",
        "expected_theme": "bedroom_personal_space",
        "ground_truth_objects": [
            "bed", "pillow", "blanket", "duvet", "nightstand", "bedside lamp", "lamp", "carpet", "mirror", "curtain"
        ]
    },
    {
        "id": "06_bathroom",
        "nameVi": "Phòng Tắm & Vệ Sinh",
        "url": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80",
        "expected_theme": "bathroom_toiletries",
        "ground_truth_objects": [
            "sink", "faucet", "mirror", "towel", "soap dispenser", "bottle", "bathroom counter"
        ]
    },
    {
        "id": "07_gym_fitness",
        "nameVi": "Phòng Gym & Thể Hình",
        "url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
        "expected_theme": "gym_fitness",
        "ground_truth_objects": [
            "dumbbell", "barbell", "weight plate", "weight rack", "bench press", "gym bench", "gym equipment"
        ]
    },
    {
        "id": "08_coffee_shop",
        "nameVi": "Quán Cà Phê & Đồ Uống",
        "url": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80",
        "expected_theme": "restaurant_cafe",
        "ground_truth_objects": [
            "coffee machine", "espresso machine", "coffee cup", "cup", "saucer", "bar counter", "bar stool", "countertop", "chalkboard menu", "menu"
        ]
    },
    {
        "id": "09_supermarket",
        "nameVi": "Siêu Thị & Quầy Trái Cây",
        "url": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
        "expected_theme": "food_fruits_groceries",
        "ground_truth_objects": [
            "apple", "orange", "banana", "fruit", "vegetable", "store shelf", "display rack", "box", "crate"
        ]
    },
    {
        "id": "10_street_traffic",
        "nameVi": "Đường Phố & Xe Cộ Giao Thông",
        "url": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&q=80",
        "expected_theme": "outdoor_vehicles_street",
        "ground_truth_objects": [
            "car", "traffic light", "street light", "road", "crosswalk", "pedestrian", "building", "sidewalk"
        ]
    }
]

# Màu vẽ Bounding Box trực quan (Palette chuẩn)
PALETTE_COLORS = [
    ("#10B981", "#065F46"),  # Emerald Green
    ("#6366F1", "#312E81"),  # Indigo
    ("#F59E0B", "#78350F"),  # Amber
    ("#EC4899", "#831843"),  # Pink Rose
    ("#06B6D4", "#164E63"),  # Cyan
    ("#8B5CF6", "#4C1D95"),  # Purple
    ("#EF4444", "#7F1D1D"),  # Red
    ("#14B8A6", "#134E4A")   # Teal
]

ABSTRACT_WORDS = {
    "library", "shelf", "bookshelf", "wardrobe", "counter", "countertop", 
    "wall", "ceiling", "floor", "door", "window", "cabinet", "curtain", "blinds"
}

SMALL_WORDS = {
    "pen", "pencil", "cup", "coffee cup", "mug", "glass", "fork", "knife", "spoon",
    "apple", "banana", "orange", "lemon", "lime", "medicine", "pill", "capsule",
    "computer mouse", "smartphone", "cell phone", "bottle", "key", "eraser",
    "airpods", "earbuds", "earphones", "strawberry", "egg", "cookie", "coin", "usb hub"
}


def download_image(url: str, save_path: str) -> bool:
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
            with open(save_path, "wb") as f:
                f.write(data)
        return True
    except Exception as e:
        print(f"⚠️ Lỗi tải ảnh từ {url}: {e}")
        return False


def draw_bounding_boxes(image: Image.Image, verified_objects: list, output_path: str, title: str):
    """Vẽ bounding boxes và nhãn song ngữ lên ảnh với chất lượng cao"""
    annotated = image.copy().convert("RGB")
    draw = ImageDraw.Draw(annotated)
    w, h = annotated.size

    # Cố gắng nạp font Arial nếu có
    font = None
    try:
        font = ImageFont.truetype("arial.ttf", 13)
        title_font = ImageFont.truetype("arialbd.ttf", 16)
    except Exception:
        font = ImageFont.load_default()
        title_font = font

    # Vẽ thanh tiêu đề trên cùng
    draw.rectangle([0, 0, w, 32], fill=(15, 23, 42))
    draw.text((10, 6), title, fill=(255, 255, 255), font=title_font)

    for i, obj in enumerate(verified_objects):
        box_color = PALETTE_COLORS[i % len(PALETTE_COLORS)][0]
        text_bg = PALETTE_COLORS[i % len(PALETTE_COLORS)][1]

        left_pct = obj.get("leftPercent", 0)
        top_pct = obj.get("topPercent", 0)
        w_pct = obj.get("widthPercent", 0)
        h_pct = obj.get("heightPercent", 0)

        x1 = int(left_pct / 100.0 * w)
        y1 = int(top_pct / 100.0 * h)
        x2 = int((left_pct + w_pct) / 100.0 * w)
        y2 = int((top_pct + h_pct) / 100.0 * h)

        # Vẽ khung viền dày 3px
        for offset in range(3):
            draw.rectangle([x1 - offset, y1 - offset, x2 + offset, y2 + offset], outline=box_color)

        # Chuẩn bị nhãn
        word = obj.get("word", "")
        vi = obj.get("vietnamese", "")
        conf = int(obj.get("confidence", 0) * 100)
        label_str = f" {word} ({conf}%) - {vi} "

        # Vẽ nền nhãn
        text_bbox = draw.textbbox((x1, max(32, y1 - 20)), label_str, font=font)
        draw.rectangle(text_bbox, fill=text_bg)
        draw.text((x1, max(32, y1 - 20)), label_str, fill=(255, 255, 255), font=font)

    annotated.save(output_path, "JPEG", quality=90)


def run_benchmark():
    print("==================================================================")
    print("🚀 BẮT ĐẦU BENCHMARK 10 ẢNH TRÊN MẠNG VỚI HỆ THỐNG AI VISION MỚI")
    print("==================================================================")

    results_summary = []

    for idx, item in enumerate(IMAGES_DATA, 1):
        img_id = item["id"]
        raw_path = os.path.join(OUTPUT_DIR, f"{img_id}_raw.jpg")
        detected_path = os.path.join(OUTPUT_DIR, f"{img_id}_detected.jpg")

        print(f"\n[{idx}/10] 📥 Đang tải và kiểm thử ảnh: {item['nameVi']} ({img_id})...")
        if not os.path.exists(raw_path):
            ok = download_image(item["url"], raw_path)
            if not ok:
                print(f"❌ Bỏ qua ảnh {img_id} do lỗi tải.")
                continue

        pil_image = Image.open(raw_path).convert("RGB")
        img_w, img_h = pil_image.size

        # Resize ảnh tối đa 640px cho CPU như trên Production
        if max(img_w, img_h) > 640:
            scale = 640.0 / max(img_w, img_h)
            pil_image = pil_image.resize((int(img_w * scale), int(img_h * scale)), Image.Resampling.BILINEAR)
            img_w, img_h = pil_image.size

        # --- TẦNG 1: ResNet-18 Places365 (Soft-Gating Top-2) ---
        t1_start = time.time()
        scene_res = scene_service.predict_scene(pil_image)
        t1_ms = round((time.time() - t1_start) * 1000, 2)

        theme_key = scene_res["theme_key"]
        theme_vi = scene_res["theme_name_vi"]
        scene_conf = scene_res["confidence"]
        should_merge = scene_res.get("should_merge_top2", False)
        sec_key = scene_res.get("secondary_theme_key") if should_merge else None
        sec_vi = scene_res.get("secondary_theme_name_vi") if should_merge else None

        # --- TẦNG 2: YOLO-World v2 Inference (Adaptive Confidence) ---
        t2_start = time.time()
        apply_theme_classes(theme_key, secondary_theme=sec_key)
        active_scene_key = f"{theme_key}+{sec_key}" if sec_key else theme_key

        with torch.inference_mode():
            raw_res = model.predict(pil_image, conf=0.10, imgsz=480, verbose=False)

        raw_candidates = []
        for r in raw_res:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                w_name = r.names[cls_id]
                score = float(box.conf[0])
                w_clean = w_name.strip().lower()

                # Ngưỡng Adaptive Confidence
                if w_clean in ABSTRACT_WORDS:
                    min_thresh = 0.35
                elif w_clean in SMALL_WORDS:
                    min_thresh = 0.12
                else:
                    min_thresh = 0.15

                if score < min_thresh:
                    continue

                x1, y1, x2, y2 = box.xyxy[0].tolist()
                w_box = x2 - x1
                h_box = y2 - y1

                left_pct = round((x1 / img_w) * 100, 1)
                top_pct = round((y1 / img_h) * 100, 1)
                w_pct = round((w_box / img_w) * 100, 1)
                h_pct = round((h_box / img_h) * 100, 1)

                meaning, ipa, cefr = get_word_details(w_clean)
                raw_candidates.append({
                    "word": w_clean,
                    "confidence": round(score, 2),
                    "leftPercent": left_pct,
                    "topPercent": top_pct,
                    "widthPercent": w_pct,
                    "heightPercent": h_pct,
                    "vietnamese": meaning,
                    "ipa": ipa,
                    "level": cefr
                })

        t2_ms = round((time.time() - t2_start) * 1000, 2)

        # --- TẦNG 2B: Two-Stage Verifier (Blacklist + Coherence + Soft Containment NMS) ---
        t2b_start = time.time()
        verified_candidates = verifier_service.verify_and_refine(
            pil_image, raw_candidates, scene_key=active_scene_key
        )
        t2b_ms = round((time.time() - t2b_start) * 1000, 2)
        total_latency_ms = round(t1_ms + t2_ms + t2b_ms, 2)

        # Giới hạn tối đa 12 vật thể tiêu biểu
        unique_seen = set()
        final_verified = []
        for v in verified_candidates:
            w = v["word"]
            if w not in unique_seen or len(final_verified) < 3:
                unique_seen.add(w)
                final_verified.append(v)
            if len(final_verified) >= 12:
                break

        # --- ĐÁNH GIÁ ĐỘ CHÍNH XÁC SO VỚI GROUND TRUTH THỰC TẾ ---
        gt_objects = item["ground_truth_objects"]
        detected_words = [v["word"] for v in final_verified]

        # Tính True Positives (vật thể nhận đúng thực tế trong ảnh)
        tp_list = []
        fp_list = []
        for det_w in detected_words:
            matched_gt = any(
                det_w == gt or det_w in gt or gt in det_w
                for gt in gt_objects
            )
            if matched_gt:
                tp_list.append(det_w)
            else:
                # Kiểm tra xem có hợp lý trong bối cảnh không
                fp_list.append(det_w)

        # Tính False Negatives (vật thể thực tế bị bỏ sót)
        fn_list = []
        for gt in gt_objects:
            matched = any(
                det_w == gt or det_w in gt or gt in det_w
                for det_w in detected_words
            )
            if not matched:
                fn_list.append(gt)

        tp_count = len(tp_list)
        fp_count = len(fp_list)
        fn_count = len(fn_list)
        total_gt = len(gt_objects)

        precision = round(tp_count / (tp_count + fp_count) * 100, 1) if (tp_count + fp_count) > 0 else 0.0
        recall = round(tp_count / total_gt * 100, 1) if total_gt > 0 else 0.0
        accuracy = round(tp_count / (tp_count + fp_count + fn_count) * 100, 1) if (tp_count + fp_count + fn_count) > 0 else 0.0

        # Vẽ và lưu ảnh trực quan
        title_banner = f"{item['nameVi']} | Bối cảnh: {theme_vi} ({int(scene_conf*100)}%) | Phát hiện: {len(final_verified)}/{total_gt} vật thể | {total_latency_ms}ms"
        draw_bounding_boxes(pil_image, final_verified, detected_path, title_banner)

        res_item = {
            "id": img_id,
            "name": item["nameVi"],
            "scene": theme_vi,
            "scene_key": theme_key,
            "scene_conf": int(scene_conf * 100),
            "soft_gating_merged": bool(sec_key),
            "sec_theme": sec_vi,
            "latency_t1_ms": t1_ms,
            "latency_t2_ms": t2_ms,
            "latency_t2b_ms": t2b_ms,
            "total_latency_ms": total_latency_ms,
            "detected_count": len(final_verified),
            "ground_truth_count": total_gt,
            "tp_count": tp_count,
            "fp_count": fp_count,
            "fn_count": fn_count,
            "precision": precision,
            "recall": recall,
            "accuracy": accuracy,
            "tp_words": tp_list,
            "fp_words": fp_list,
            "fn_words": fn_list[:5],
            "detected_img_path": detected_path
        }
        results_summary.append(res_item)

        print(f"  🏛️ Tầng 1: {theme_vi} ({int(scene_conf*100)}%) [Latency: {t1_ms}ms]")
        if sec_key:
            print(f"     -> Soft-Gating Top-2 kích hoạt hợp nhất với: '{sec_vi}'!")
        print(f"  🎯 Tầng 2 & 2B: Nhận diện {len(final_verified)} vật thể [Latency: {t2_ms + t2b_ms}ms]")
        print(f"     -> True Positives: {tp_list}")
        if fp_list:
            print(f"     -> False Positives / Ngoại lai: {fp_list}")
        print(f"  📊 Độ chính xác: Precision: {precision}% | Recall: {recall}% | Tổng độ trễ: {total_latency_ms} ms")

    # Lưu file JSON tổng hợp kết quả
    summary_json_path = os.path.join(OUTPUT_DIR, "benchmark_results_summary.json")
    with open(summary_json_path, "w", encoding="utf-8") as f:
        json.dump(results_summary, f, ensure_ascii=False, indent=2)

    print("\n==================================================================")
    print("🏆 TỔNG HỢP TOÀN DIỆN KẾT QUẢ BENCHMARK 10 ẢNH")
    print("==================================================================")
    avg_latency = round(sum(r["total_latency_ms"] for r in results_summary) / len(results_summary), 1)
    avg_precision = round(sum(r["precision"] for r in results_summary) / len(results_summary), 1)
    avg_recall = round(sum(r["recall"] for r in results_summary) / len(results_summary), 1)
    avg_accuracy = round(sum(r["accuracy"] for r in results_summary) / len(results_summary), 1)
    total_detected = sum(r["detected_count"] for r in results_summary)
    total_gt_all = sum(r["ground_truth_count"] for r in results_summary)

    print(f"⏱️ Độ trễ xử lý trung bình: {avg_latency} ms / ảnh (trên CPU)")
    print(f"🎯 Điểm Precision trung bình: {avg_precision}%")
    print(f"📦 Điểm Recall trung bình: {avg_recall}%")
    print(f"🏅 Tỷ lệ bao phủ vật thể: {total_detected}/{total_gt_all} ({round(total_detected/total_gt_all*100, 1)}%)")
    print(f"📁 Thư mục lưu ảnh Bounding Box: {OUTPUT_DIR}")
    print("==================================================================")


if __name__ == "__main__":
    run_benchmark()

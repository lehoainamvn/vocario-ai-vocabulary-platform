"""
BENCHMARK 20 BỨC ẢNH THỰC TẾ ĐA ĐIỀU KIỆN (REAL-WORLD CHALLENGING BENCHMARK)
Kiểm thử toàn diện 20 trường hợp người dùng thực tế chụp bằng điện thoại:
- Ảnh mờ nét / Rung tay (Motion Blur / Camera Shake)
- Thiếu sáng / Ánh sáng yếu ban đêm (Low-Light / Dim)
- Ngược sáng / Chói sáng cửa sổ (Backlit / Window Glare)
- Bừa bộn / Vật thể che khuất nhau (Cluttered & Dense Occlusion)
- Góc chụp từ trên xuống (Top-down Flatlay 90 độ)
- Chụp cận cảnh đồ vật nhỏ (Macro / Close-up)
- Góc chụp rộng nhiều chi tiết nhỏ (Wide-Angle / Distant)
- Phản chiếu gương kính (Specular Reflections & Mirrors)
- Chuyển động (Moving pets & vehicles)
- Góc nghiêng phối cảnh (Extreme Perspective)
"""

import os
import sys
import time
import json
import urllib.request
from typing import List, Dict, Any
from PIL import Image, ImageDraw, ImageFont, ImageFilter

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

OUTPUT_DIR = os.path.join(ROOT_DIR, "docs", "figures", "test_20_realworld_benchmark")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 20 Trường hợp thử nghiệm bao phủ mọi điều kiện thực tế
DATASET_20 = [
    {
        "id": "01_motion_blur_desk",
        "nameVi": "Bàn học rung tay / Mờ nét",
        "challenge": "Mờ nét (Motion Blur / Rung camera khi chụp nhanh)",
        "url": "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80",
        "apply_blur": True,
        "blur_radius": 3.0,
        "expected_theme": "study_office",
        "ground_truth_objects": ["laptop", "computer monitor", "desk", "chair", "potted plant", "lamp", "desk pad"]
    },
    {
        "id": "02_dim_lowlight_bedroom",
        "nameVi": "Phòng ngủ thiếu sáng ban đêm",
        "challenge": "Ánh sáng yếu / Thiếu sáng (Low-Light / Dim Lighting)",
        "url": "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "bedroom_personal_space",
        "ground_truth_objects": ["bed", "pillow", "blanket", "nightstand", "bedside lamp", "mirror"]
    },
    {
        "id": "03_backlit_window_cafe",
        "nameVi": "Quán cafe ngược sáng cửa sổ",
        "challenge": "Ngược sáng / Tương phản cao (Backlit & Glare)",
        "url": "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "restaurant_cafe",
        "ground_truth_objects": ["table", "chair", "coffee cup", "cup", "window", "potted plant"]
    },
    {
        "id": "04_cluttered_kitchen",
        "nameVi": "Nhà bếp bừa bộn nhiều đồ vật",
        "challenge": "Bừa bộn & Che khuất (Clutter & Occlusion)",
        "url": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "kitchen_appliances",
        "ground_truth_objects": ["cooktop", "stove", "kitchen tap", "faucet", "kitchen cabinet", "microwave oven", "pot"]
    },
    {
        "id": "05_topdown_dining_table",
        "nameVi": "Bàn ăn chụp từ trên xuống (Flatlay)",
        "challenge": "Góc chụp từ trên xuống 90 độ (Top-down Flatlay)",
        "url": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "dining_tableware",
        "ground_truth_objects": ["dining table", "dining chair", "plate", "wine glass", "fork", "knife", "cup"]
    },
    {
        "id": "06_closeup_stationery",
        "nameVi": "Cận cảnh đồ dùng học tập nhỏ",
        "challenge": "Chụp cận cảnh đồ vật nhỏ li ti (Macro / Close-up)",
        "url": "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "study_office",
        "ground_truth_objects": ["pen", "pencil", "notebook", "scissors", "ruler", "eraser", "paperclip"]
    },
    {
        "id": "07_wide_supermarket_shelves",
        "nameVi": "Siêu thị góc rộng nhiều nông sản",
        "challenge": "Góc rộng & Mật độ vật thể dày đặc (Dense Small Objects)",
        "url": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "food_fruits_groceries",
        "ground_truth_objects": ["apple", "red apple", "green apple", "grapes", "melon", "pepper", "vegetable"]
    },
    {
        "id": "08_angled_street_traffic",
        "nameVi": "Đường phố góc nghiêng xe cộ chạy",
        "challenge": "Góc nghiêng phối cảnh & Xe chuyển động (Perspective Traffic)",
        "url": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "outdoor_vehicles_street",
        "ground_truth_objects": ["car", "suv", "bus", "truck", "street lamp", "road"]
    },
    {
        "id": "09_blurry_pet_living_room",
        "nameVi": "Thú cưng chuyển động mờ trong phòng",
        "challenge": "Vật thể sống chuyển động làm mờ (Moving Subject Blur)",
        "url": "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80",
        "apply_blur": True,
        "blur_radius": 2.5,
        "expected_theme": "animals_pets",
        "ground_truth_objects": ["dog", "pet", "sofa", "carpet", "floor"]
    },
    {
        "id": "10_bathroom_mirror_reflection",
        "nameVi": "Phòng tắm gương soi phản chiếu",
        "challenge": "Phản chiếu gương kính & Bóng kim loại (Reflections & Mirrors)",
        "url": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "bathroom_toiletries",
        "ground_truth_objects": ["sink", "bathroom sink", "faucet", "bathroom faucet", "mirror", "towel"]
    },
    {
        "id": "11_dim_moody_gym",
        "nameVi": "Phòng gym ánh sáng tối nghệ thuật",
        "challenge": "Ánh sáng tối & Kết cấu kim loại song song (Moody Dim Light)",
        "url": "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "gym_fitness",
        "ground_truth_objects": ["dumbbell", "barbell", "pull-up bar", "weight rack", "gym equipment"]
    },
    {
        "id": "12_classroom_repetitive_desks",
        "nameVi": "Phòng học dãy bàn ghế xếp hàng dài",
        "challenge": "Họa tiết lặp lại & Che khuất xa gần (Repetitive Desk Pattern)",
        "url": "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "study_office",
        "ground_truth_objects": ["desk", "chair", "whiteboard", "blackboard", "bookshelf", "window"]
    },
    {
        "id": "13_outdoor_park_nature",
        "nameVi": "Công viên thiên nhiên ngoài trời",
        "challenge": "Ánh sáng tự nhiên ngoài trời & Cảnh quan mở (Outdoor Open Nature)",
        "url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "park_nature",
        "ground_truth_objects": ["tree", "plant", "sand", "sea", "sky", "beach"]
    },
    {
        "id": "14_hospital_clinic_clean",
        "nameVi": "Phòng khám y tế & Thiết bị y khoa",
        "challenge": "Không gian vô trùng màu trắng & Khó phân biệt (Clinical Lighting)",
        "url": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "hospital_medical",
        "ground_truth_objects": ["hospital bed", "chair", "curtain", "medical equipment", "counter"]
    },
    {
        "id": "15_cozy_living_room_sofa",
        "nameVi": "Phòng khách góc chụp chéo ấm áp",
        "challenge": "Góc chụp chéo 45 độ & Ánh đèn vàng (Warm Angle Living Room)",
        "url": "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "living_room_decor",
        "ground_truth_objects": ["sofa", "cushion", "pillow", "coffee table", "plant", "carpet"]
    },
    {
        "id": "16_coffee_shop_espresso_bar",
        "nameVi": "Quầy bar cafe máy móc kim loại",
        "challenge": "Bối cảnh giao thoa & Máy pha cafe inox (Mixed Theme & Cafe Machine)",
        "url": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "restaurant_cafe",
        "ground_truth_objects": ["coffee machine", "espresso machine", "cup", "coffee cup", "chalkboard menu", "counter"]
    },
    {
        "id": "17_dense_library_bookshelves",
        "nameVi": "Thư viện giá sách dày đặc",
        "challenge": "Mật độ sách cực dày & Chiều sâu hút mắt (Dense Bookshelf Depth)",
        "url": "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "study_office",
        "ground_truth_objects": ["bookshelf", "bookcase", "book", "table", "chair", "lamp"]
    },
    {
        "id": "18_fashion_wardrobe_closet",
        "nameVi": "Tủ quần áo thời trang treo đồ",
        "challenge": "Vải vóc rủ nếp gấp & Quần áo đè lớp (Folded & Hanging Fabric)",
        "url": "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "clothing_accessories",
        "ground_truth_objects": ["clothes", "shirt", "dress", "jacket", "coat", "hanger", "wardrobe"]
    },
    {
        "id": "19_hardware_workshop_tools",
        "nameVi": "Xưởng cơ khí dụng cụ sửa chữa",
        "challenge": "Dụng cụ cơ khí kim loại treo lộn xộn (Cluttered Tool Board)",
        "url": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "tools_hardware",
        "ground_truth_objects": ["tool", "wrench", "hammer", "pliers", "screwdriver", "workbench"]
    },
    {
        "id": "20_night_street_neon",
        "nameVi": "Đường phố ban đêm ánh đèn neon",
        "challenge": "Đèn neon chói lóa & Đêm tối tương phản cực cao (Night Neon Glare)",
        "url": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80",
        "apply_blur": False,
        "expected_theme": "outdoor_vehicles_street",
        "ground_truth_objects": ["car", "street light", "building", "signboard", "road"]
    }
]

def download_and_prepare_image(item: Dict[str, Any]) -> str:
    raw_path = os.path.join(OUTPUT_DIR, f"{item['id']}_raw.jpg")
    if not os.path.exists(raw_path):
        req = urllib.request.Request(item["url"], headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp, open(raw_path, "wb") as f:
            f.write(resp.read())
    
    # Nếu trường hợp yêu cầu mô phỏng mờ nét/rung tay
    if item.get("apply_blur"):
        pil_img = Image.open(raw_path).convert("RGB")
        blur_rad = item.get("blur_radius", 2.0)
        # Áp dụng GaussianBlur mô phỏng rung camera
        blurred_img = pil_img.filter(ImageFilter.GaussianBlur(radius=blur_rad))
        proc_path = os.path.join(OUTPUT_DIR, f"{item['id']}_blur_proc.jpg")
        blurred_img.save(proc_path, "JPEG", quality=85)
        return proc_path
    
    return raw_path

def run_benchmark():
    print("================================================================================")
    print("🚀 BẮT ĐẦU BENCHMARK 20 BỨC ẢNH THỰC TẾ ĐA ĐIỀU KIỆN (REAL-WORLD CHALLENGING)")
    print("================================================================================")

    results_summary = []
    total_detected_all = 0
    total_gt_all = 0

    for idx, item in enumerate(DATASET_20, 1):
        item_id = item["id"]
        name_vi = item["nameVi"]
        challenge = item["challenge"]
        gt_objects = item["ground_truth_objects"]
        total_gt_all += len(gt_objects)

        print(f"\n[{idx:02d}/20] Đang tải & chuẩn bị ảnh: '{name_vi}' ({challenge})...")
        img_path = download_and_prepare_image(item)

        pil_image = Image.open(img_path).convert("RGB")
        width, height = pil_image.size
        if max(width, height) > 640:
            scale = 640.0 / max(width, height)
            pil_image = pil_image.resize((int(width * scale), int(height * scale)), Image.Resampling.BILINEAR)
            width, height = pil_image.size

        # --- TẦNG 1: NHẬN DIỆN BỐI CẢNH (SCENE GATING) ---
        t1_start = time.time()
        scene_info = scene_service.predict_scene(pil_image)
        t1_latency = (time.time() - t1_start) * 1000.0


        primary_theme = scene_info.get("theme_key", "general")
        scene_conf = scene_info.get("confidence", 0)
        scene_name_vi = scene_info.get("theme_name_vi", "Đời sống")
        secondary_theme = scene_info.get("secondary_theme_name_vi")

        # --- TẦNG 2: ZERO-SHOT OBJECT DETECTION ---
        t2_start = time.time()
        apply_theme_classes(primary_theme, secondary_theme=secondary_theme if scene_conf < 80 else None)

        with torch.inference_mode():
            raw_results = model.predict(pil_image, conf=0.10, imgsz=480, verbose=False)

        raw_detected = []
        for r in raw_results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                word = r.names[cls_id]
                score = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0].tolist()

                meaning, ipa, cefr = get_word_details(word)

                raw_detected.append({
                    "id": f"yolo-{len(raw_detected)}-{word}",
                    "word": word,
                    "ipa": ipa,
                    "vietnamese": meaning,
                    "level": cefr,
                    "confidence": round(score, 2),
                    "leftPercent": round((x1 / width) * 100, 1),
                    "topPercent": round((y1 / height) * 100, 1),
                    "widthPercent": round(((x2 - x1) / width) * 100, 1),
                    "heightPercent": round(((y2 - y1) / height) * 100, 1)
                })
        t2_latency = (time.time() - t2_start) * 1000.0

        # --- TẦNG 2B: THẨM ĐỊNH HAI GIAI ĐOẠN, BLACKLIST & DUPLICATE NMS ---
        t2b_start = time.time()
        verified = verifier_service.verify_and_refine(pil_image, raw_detected, scene_key=primary_theme)
        if not verified and raw_detected:
            verified = raw_detected

        # Lọc giới hạn 12 vật thể nổi bật nhất
        final_detected = verified[:12]
        t2b_latency = (time.time() - t2b_start) * 1000.0

        detected_count = len(final_detected)
        total_detected_all += detected_count

        # So khớp Ground Truth
        tp_words = []
        fp_words = []
        gt_lower = [g.lower() for g in gt_objects]

        for obj in final_detected:
            w = obj["word"].lower()
            if any(gt_word in w or w in gt_word for gt_word in gt_lower):
                tp_words.append(obj["word"])
            else:
                fp_words.append(obj["word"])

        tp_count = len(tp_words)
        fp_count = len(fp_words)
        fn_count = max(0, len(gt_objects) - tp_count)

        precision = round((tp_count / detected_count * 100) if detected_count > 0 else 0, 1)
        recall = round((tp_count / len(gt_objects) * 100) if gt_objects else 0, 1)

        # --- VẼ HÌNH ẢNH GẮN NHÃN BẢO CHỨNG TRỰC QUAN ---
        annotated_img = pil_image.copy()
        draw = ImageDraw.Draw(annotated_img)

        try:
            font = ImageFont.truetype("arial.ttf", 13)
            title_font = ImageFont.truetype("arial.ttf", 14)
        except Exception:
            font = ImageFont.load_default()
            title_font = font

        # Banner thông tin trên đầu ảnh
        banner_h = 32
        banner_img = Image.new("RGB", (width, height + banner_h), color=(26, 22, 18))
        banner_draw = ImageDraw.Draw(banner_img)
        banner_img.paste(annotated_img, (0, banner_h))

        banner_text = f"[{idx:02d}] {name_vi} | Boi canh: {scene_name_vi} ({scene_conf}%) | Phat hien: {detected_count} vat the"
        banner_draw.text((10, 8), banner_text, fill=(245, 238, 227), font=title_font)

        draw = ImageDraw.Draw(banner_img)

        colors = ["#D97706", "#2563EB", "#059669", "#DC2626", "#7C3AED", "#0891B2"]
        for o_idx, obj in enumerate(final_detected):
            color = colors[o_idx % len(colors)]
            l = int(obj["leftPercent"] / 100.0 * width)
            t = int(obj["topPercent"] / 100.0 * height) + banner_h
            w_box = int(obj["widthPercent"] / 100.0 * width)
            h_box = int(obj["heightPercent"] / 100.0 * height)
            r = min(width - 1, l + w_box)
            b = min(height + banner_h - 1, t + h_box)

            # Vẽ khung chữ nhật
            for border_i in range(2):
                draw.rectangle([l - border_i, t - border_i, r + border_i, b + border_i], outline=color)

            # Vẽ nhãn song ngữ
            word_txt = f"{obj['word']} ({int(obj['confidence']*100)}%)"
            draw.rectangle([l, max(banner_h, t - 16), l + len(word_txt) * 7 + 6, max(banner_h, t)], fill=color)
            draw.text((l + 3, max(banner_h, t - 15)), word_txt, fill=(255, 255, 255), font=font)

        out_img_path = os.path.join(OUTPUT_DIR, f"{item_id}_detected.jpg")
        banner_img.save(out_img_path, "JPEG", quality=90)

        item_result = {
            "id": item_id,
            "name": name_vi,
            "challenge": challenge,
            "scene": scene_name_vi,
            "scene_key": primary_theme,
            "scene_conf": scene_conf,
            "soft_gating_merged": scene_conf < 80 and secondary_theme is not None,
            "latency_t1_ms": round(t1_latency, 2),
            "latency_t2_ms": round(t2_latency, 2),
            "latency_t2b_ms": round(t2b_latency, 2),
            "total_latency_ms": round(t1_latency + t2_latency + t2b_latency, 2),
            "detected_count": detected_count,
            "ground_truth_count": len(gt_objects),
            "tp_count": tp_count,
            "fp_count": fp_count,
            "fn_count": fn_count,
            "precision": precision,
            "recall": recall,
            "tp_words": tp_words,
            "fp_words": fp_words,
            "detected_img_path": out_img_path
        }
        results_summary.append(item_result)

        print(f"   -> Kết quả: Nhận diện {detected_count}/{len(gt_objects)} vật thể | Precision: {precision}% | Phản hồi: {item_result['total_latency_ms']:.1f}ms")
        print(f"   -> Đã lưu ảnh gắn nhãn tại: {out_img_path}")

    # Ghi toàn bộ kết quả ra JSON
    json_path = os.path.join(OUTPUT_DIR, "benchmark_20_results.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results_summary, f, ensure_ascii=False, indent=2)

    print("\n================================================================================")
    print(f"🎉 HOÀN THÀNH BENCHMARK 20 BỨC ẢNH THỰC TẾ!")
    print(f"   - Tổng vật thể nhận diện: {total_detected_all} / {total_gt_all} vật thể đối chứng.")
    print(f"   - Tỷ lệ bao phủ toàn tập: {total_detected_all / total_gt_all * 100:.1f}%.")
    print(f"   - Toàn bộ kết quả đã được ghi vào: {json_path}")
    print("================================================================================")

if __name__ == "__main__":
    import torch
    run_benchmark()

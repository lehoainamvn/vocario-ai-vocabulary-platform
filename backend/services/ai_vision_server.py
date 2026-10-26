import os
import json
import io
from typing import List, Optional, Dict, Any
from PIL import Image
from pydantic import BaseModel
from fastapi import FastAPI, File, UploadFile, Query
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLOWorld

from backend.services.lexicon_service import lexicon_service
from backend.services.context_generator import generate_context
from backend.services.scene_service import scene_service
from backend.services.verifier_service import verifier_service
from backend.services.quiz_generator import generate_quiz
from backend.services.text_extractor import extract_vocabulary_from_text, generate_context_story_from_words

# Khởi tạo ứng dụng FastAPI
app = FastAPI(
    title="Vocario YOLO-World AI Vision Engine",
    description="Dịch vụ suy luận nhận diện vật thể mở (Zero-Shot Object Detection) phục vụ học tiếng Anh ngữ cảnh.",
    version="2.0.0"
)

# Cho phép CORS từ mọi nguồn (Angular 4200, React 5173, Spring Boot 8088)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ưu tiên sử dụng trọng số mô hình đã qua Fine-Tuning (best.pt)
FINETUNED_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "runs", "train", "vocario_yolo_world_finetune", "weights", "best.pt")
MODEL_PATH = FINETUNED_PATH if os.path.exists(FINETUNED_PATH) else "yolov8s-worldv2.pt"
TARGET_CLASSES_PATH = os.path.join(os.path.dirname(__file__), "target_classes.txt")
THEMES_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "themes_classes.json")
FEATS_CACHE_PATH = os.path.join(os.path.dirname(__file__), "cache", "yolo_1000_feats.pt")

print(f"🚀 [AI SERVICE] Đang khởi động Vocario YOLO-World Engine...")
print(f"📦 Trọng số mô hình: {MODEL_PATH} ({'Fine-Tuned Best Checkpoint' if os.path.exists(FINETUNED_PATH) else 'Pretrained Base'})")
print(f"📄 File danh sách từ vựng nhận diện: {TARGET_CLASSES_PATH}")
print(f"🏛️ File cấu trúc bối cảnh: {THEMES_CONFIG_PATH}")
print(f"⚡ File vector cache 1000 lớp: {FEATS_CACHE_PATH}")


def load_themes_config() -> Dict[str, Any]:
    if os.path.exists(THEMES_CONFIG_PATH):
        try:
            with open(THEMES_CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ [AI SERVICE] Lỗi đọc themes_classes.json: {e}")
    return {}


themes_map = load_themes_config()


def load_target_classes() -> List[str]:
    """Đọc danh sách từ vựng nhận diện tùy chỉnh từ file target_classes.txt"""
    if os.path.exists(TARGET_CLASSES_PATH):
        try:
            with open(TARGET_CLASSES_PATH, "r", encoding="utf-8") as f:
                lines = [line.strip().lower() for line in f if line.strip() and not line.strip().startswith("#")]
            seen = set()
            unique_classes = []
            for item in lines:
                if item not in seen:
                    seen.add(item)
                    unique_classes.append(item)
            return unique_classes
        except Exception as e:
            print(f"⚠️ [AI SERVICE] Lỗi đọc target_classes.txt: {e}")
    return []


model = None
current_active_theme = None
master_txt_feats = None
word_to_master_idx = {}
cached_classes = []
all_target_classes = load_target_classes()

try:
    import torch
    model = YOLOWorld(MODEL_PATH)
    if os.path.exists(FEATS_CACHE_PATH):
        cached = torch.load(FEATS_CACHE_PATH, weights_only=True)
        master_txt_feats = cached["txt_feats"]
        cached_classes = cached["classes"]
        word_to_master_idx = {w: i for i, w in enumerate(cached_classes)}
        
        # Gán trực tiếp 1000 lớp tức thời (0.005s)
        model.model.txt_feats = master_txt_feats
        model.model.model[-1].nc = len(cached_classes)
        model.model.names = {i: c for i, c in enumerate(cached_classes)}
        current_active_theme = "all"
        print(f"📚 [AI SERVICE] Đã nạp thành công {len(cached_classes)} từ vựng từ cache offline vào YOLO-World (0.01s)!")
    elif all_target_classes:
        model.set_classes(all_target_classes)
        current_active_theme = "all"
        print(f"📚 [AI SERVICE] Đã nạp thành công {len(all_target_classes)} từ vựng từ target_classes.txt vào YOLO-World!")
    else:
        print("✅ [AI SERVICE] Mô hình YOLO-World v2 đang dùng 80 lớp đồ vật đời sống mặc định!")
except Exception as e:
    print(f"❌ [AI SERVICE] Lỗi khi nạp mô hình: {e}")


def _resolve_theme_key(clean: str) -> Optional[str]:
    """Nhận diện mã bối cảnh phù hợp dựa trên từ khóa cấu hình trong themes_classes.json"""
    for key, data in themes_map.items():
        kws = data.get("keywords", [])
        if any(kw in clean for kw in kws):
            return key
            
    # Quy tắc tương thích ngược với các tên cũ
    if any(k in clean for k in ["bàn học", "desk", "văn phòng", "office", "study", "làm việc"]):
        return "study_office"
    elif any(k in clean for k in ["bếp", "kitchen", "nấu"]):
        return "kitchen_appliances"
    elif any(k in clean for k in ["bàn ăn", "dining", "thưởng thức"]):
        return "dining_tableware"
    elif any(k in clean for k in ["món ăn", "thực phẩm", "food", "trái cây", "fruit", "rau củ"]):
        return "food_fruits_groceries"
    elif any(k in clean for k in ["khách", "living"]):
        return "living_room_decor"
    elif any(k in clean for k in ["ngủ", "bedroom"]):
        return "bedroom_personal_space"
    elif any(k in clean for k in ["tắm", "bath", "toilet", "vệ sinh"]):
        return "bathroom_toiletries"
    elif any(k in clean for k in ["quần áo", "giày", "thời trang", "clothing", "fashion"]):
        return "clothing_footwear"
    elif any(k in clean for k in ["cá nhân", "personal", "phụ kiện", "túi xách"]):
        return "accessories_personal"
    elif any(k in clean for k in ["công nghệ", "tech", "điện tử", "gadget"]):
        return "digital_tech_gadgets"
    elif any(k in clean for k in ["ngoài trời", "outdoor", "xe", "giao thông", "đường phố", "cà phê", "cafe"]):
        return "outdoor_vehicles_street"
    elif any(k in clean for k in ["tự nhiên", "động vật", "animal", "pet", "thú cưng", "hoa", "cây"]):
        return "nature_animals_plants"
    elif any(k in clean for k in ["thể thao", "sport", "fitness", "vận động"]):
        return "sports_recreation"
    elif any(k in clean for k in ["gym", "thể hình", "workout", "tạ"]):
        return "gym_fitness"
    elif any(k in clean for k in ["nhà hàng", "restaurant", "quán cà phê", "quán ăn"]):
        return "restaurant_cafe"
    elif any(k in clean for k in ["bệnh viện", "bác sĩ", "y tá", "hospital", "clinic"]):
        return "hospital_healthcare"
    elif any(k in clean for k in ["mỹ thuật", "hội họa", "thủ công", "art", "craft", "vẽ"]):
        return "art_craft_hobbies"
    elif any(k in clean for k in ["công cụ", "xây dựng", "sửa chữa", "tools", "hardware"]):
        return "construction_tools"
    elif any(k in clean for k in ["đồ chơi", "trẻ em", "em bé", "toys", "baby", "kid"]):
        return "baby_toys_kids"
    elif any(k in clean for k in ["y tế", "medical", "thuốc", "siêu thị", "store", "shop"]):
        return "medical_store_services"
    return None


def apply_theme_classes(theme_name: Optional[str], secondary_theme: Optional[str] = None):
    """Nạp danh sách từ vựng thông minh theo bối cảnh với cache tránh set_classes lặp lại.
    Hỗ trợ cơ chế Soft-Gating hợp nhất 2 bối cảnh khi độ tin cậy Top-1 < 80%."""
    global current_active_theme, model, master_txt_feats, word_to_master_idx, cached_classes
    if model is None:
        return

    clean = (theme_name or "general").strip().lower()
    matched_key = _resolve_theme_key(clean)
    secondary_key = _resolve_theme_key(secondary_theme.strip().lower()) if secondary_theme else None

    # Nếu có secondary_theme khác primary_theme, kích hoạt chế độ hợp nhất Soft-Gating Top-2
    if secondary_key and secondary_key != matched_key and secondary_key in themes_map and matched_key in themes_map:
        active_key = f"{matched_key}+{secondary_key}"
        if current_active_theme == active_key:
            return

        classes_1 = themes_map[matched_key].get("classes", [])
        classes_2 = themes_map[secondary_key].get("classes", [])
        
        seen_words = set()
        combined_classes = []
        for w in (classes_1 + classes_2):
            if w not in seen_words:
                seen_words.add(w)
                combined_classes.append(w)

        if master_txt_feats is not None and word_to_master_idx:
            import torch
            indices = [word_to_master_idx[w] for w in combined_classes if w in word_to_master_idx]
            if indices:
                idx_tensor = torch.tensor(indices, dtype=torch.long)
                model.model.txt_feats = master_txt_feats[:, idx_tensor, :]
                model.model.model[-1].nc = len(indices)
                model.model.names = {i: cached_classes[idx] for i, idx in enumerate(indices)}
                model.predictor = None
                current_active_theme = active_key
                name1 = themes_map[matched_key].get("nameVi")
                name2 = themes_map[secondary_key].get("nameVi")
                print(f"🎯 [AI SERVICE] Kích hoạt Soft-Gating hợp nhất 2 bối cảnh '{name1}' + '{name2}' ({len(indices)} từ) tức thời qua Vector Cache!")
                return

        model.set_classes(combined_classes)
        model.predictor = None
        current_active_theme = active_key
        return

    target_key = matched_key or "all"

    # Nếu bối cảnh trùng với bối cảnh đang hoạt động, bỏ qua không cần set lại
    if current_active_theme == target_key:
        return

    if matched_key and matched_key in themes_map:
        theme_classes = themes_map[matched_key].get("classes", [])
        if theme_classes:
            if master_txt_feats is not None and word_to_master_idx:
                import torch
                indices = [word_to_master_idx[w] for w in theme_classes if w in word_to_master_idx]
                if indices:
                    idx_tensor = torch.tensor(indices, dtype=torch.long)
                    model.model.txt_feats = master_txt_feats[:, idx_tensor, :]
                    model.model.model[-1].nc = len(indices)
                    model.model.names = {i: cached_classes[idx] for i, idx in enumerate(indices)}
                    model.predictor = None
                    current_active_theme = target_key
                    print(f"🎯 [AI SERVICE] Kích hoạt bối cảnh '{themes_map[matched_key].get('nameVi')}' ({len(indices)} từ) tức thời qua Vector Cache!")
                    return

            model.set_classes(theme_classes)
            model.predictor = None
            current_active_theme = target_key
            print(f"🎯 [AI SERVICE] Kích hoạt bối cảnh '{themes_map[matched_key].get('nameVi')}' ({len(theme_classes)} từ) - Tối ưu độ chính xác và giảm nhiễu!")
            return

    # Fallback nạp toàn bộ danh sách 3615 từ
    if master_txt_feats is not None:
        model.model.txt_feats = master_txt_feats
        model.model.model[-1].nc = len(cached_classes)
        model.model.names = {i: c for i, c in enumerate(cached_classes)}
        model.predictor = None
        current_active_theme = "all"
        print(f"🎯 [AI SERVICE] Kích hoạt chế độ toàn cảnh ({len(cached_classes)} từ vựng)")
    elif all_target_classes:
        model.set_classes(all_target_classes)
        model.predictor = None
        current_active_theme = "all"
        print(f"🎯 [AI SERVICE] Kích hoạt chế độ toàn cảnh ({len(all_target_classes)} từ vựng)")


def get_word_details(raw_word: str):
    """Tra cứu nghĩa tiếng Việt, IPA, CEFR từ LexiconService (eng-to-ipa + deep-translator tự động 100%)"""
    info = lexicon_service.lookup(raw_word)
    meaning = info.get("vietnamese", raw_word)
    ipa = info.get("ipa", f"/{raw_word}/")
    cefr = info.get("level", "A2")
    return meaning, ipa, cefr


@app.get("/")
def root():
    return {"status": "ok", "service": "Vocario AI Vision Server"}


@app.get("/health")
def health_check():
    classes_count = len(model.names) if (model and hasattr(model, "names") and model.names) else 80
    return {
        "status": "healthy",
        "engine": "YOLO-World v2 (Ultralytics PyTorch)",
        "model_loaded": model is not None,
        "current_theme": current_active_theme or "all",
        "classes_count": classes_count,
        "classes_file": "backend/services/target_classes.txt",
        "supported_themes": list(themes_map.keys())
    }


@app.get("/target-classes")
def get_target_classes():
    """Xem danh sách toàn bộ từ vựng mà YOLO-World đang được cấu hình để nhận diện"""
    if model and hasattr(model, "names") and model.names:
        if isinstance(model.names, dict):
            current_classes = list(model.names.values())
        else:
            current_classes = list(model.names)
    else:
        current_classes = []
    return {
        "total": len(current_classes),
        "sourceFile": TARGET_CLASSES_PATH,
        "classes": current_classes
    }


@app.post("/reload-classes")
def reload_target_classes():
    """Tự động nạp lại danh sách từ vựng từ target_classes.txt ngay lập tức mà không cần khởi động lại server"""
    global model, master_txt_feats, word_to_master_idx, all_target_classes, current_active_theme, themes_map, cached_classes
    if model is None:
        return {"error": "Mô hình chưa được khởi tạo"}
    
    themes_map = load_themes_config()
    all_target_classes = load_target_classes()
    if os.path.exists(FEATS_CACHE_PATH):
        import torch
        cached = torch.load(FEATS_CACHE_PATH, weights_only=True)
        master_txt_feats = cached["txt_feats"]
        cached_classes = cached["classes"]
        word_to_master_idx = {w: i for i, w in enumerate(cached_classes)}
        model.model.txt_feats = master_txt_feats
        model.model.model[-1].nc = len(cached_classes)
        model.model.names = {i: c for i, c in enumerate(cached_classes)}
        current_active_theme = "all"
        msg = f"Đã nạp lại {len(cached_classes)} từ vựng từ vector cache offline"
    elif all_target_classes:
        model.set_classes(all_target_classes)
        current_active_theme = "all"
        msg = f"Đã nạp lại {len(all_target_classes)} từ vựng từ target_classes.txt"
    else:
        model = YOLOWorld(MODEL_PATH)
        current_active_theme = "coco"
        msg = "Chuyển về 80 lớp mặc định của COCO"
    
    return {
        "success": True,
        "message": msg,
        "totalClasses": len(model.names),
        "totalThemes": len(themes_map)
    }


@app.post("/detect")
async def detect_objects(
    file: UploadFile = File(...),
    conf: float = Query(0.15, description="Ngưỡng tin cậy nhận diện (Confidence Threshold)"),
    theme: Optional[str] = Query("general", description="Chủ đề bối cảnh"),
    target_level: Optional[str] = Query("A2", description="Trình độ mục tiêu CEFR của học viên (A1, A2, B1, B2, C1)"),
    skip_dialogue: bool = Query(False, description="Nếu True, bỏ qua bước sinh hội thoại LLM để trả về vật thể siêu tốc (<0.8s)")
):
    """
    Điểm cuối nhận file ảnh từ Web Camera hoặc tải file lên,
    chạy mô hình YOLO-World v2 và trả về tọa độ Bounding Box phần trăm + từ vựng chuẩn.
    """
    if model is None:
        return {"error": "Mô hình YOLO-World chưa được khởi tạo", "detectedObjects": []}

    try:
        # Đọc dữ liệu ảnh từ request upload
        image_bytes = await file.read()
        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        width, height = pil_image.size

        # Tối ưu hóa kích thước ảnh tối đa 640px cho CPU Cloud để xử lý siêu tốc (<2s), tránh timeout 502
        if max(width, height) > 640:
            scale = 640.0 / max(width, height)
            pil_image = pil_image.resize((int(width * scale), int(height * scale)), Image.Resampling.BILINEAR)
            width, height = pil_image.size

        # Tầng 1: Tự động phân tích bối cảnh tham khảo bằng ResNet-18 (Places365)
        auto_scene_info = None
        active_scene_key = "general"
        clean_theme = (theme or "auto").strip().lower()
        if clean_theme in ["auto", "general", "toàn cảnh", "all"]:
            scene_res = scene_service.predict_scene(pil_image)
            should_merge_top2 = scene_res.get("should_merge_top2", False)
            detected_theme = scene_res.get("theme_key", "study_office")
            sec_theme = scene_res.get("secondary_theme_key") if should_merge_top2 else None

            auto_scene_info = {
                "enabled": True,
                "theme_key": detected_theme,
                "theme_name_vi": scene_res["theme_name_vi"],
                "confidence": scene_res["confidence"],
                "raw_category": scene_res["raw_category"],
                "inference_ms": scene_res["inference_ms"],
                "top_candidates": scene_res.get("top_candidates", []),
                "should_merge_top2": should_merge_top2,
                "secondary_theme_key": sec_theme,
                "secondary_theme_name_vi": scene_res.get("secondary_theme_name_vi")
            }
            # Tầng 1 điều phối Tầng 2: Soft-Gating hợp nhất Top-2 nếu confidence < 80%
            apply_theme_classes(detected_theme, secondary_theme=sec_theme)
            if sec_theme:
                effective_theme = f"{scene_res.get('theme_name_vi')} & {scene_res.get('secondary_theme_name_vi')}"
                active_scene_key = f"{detected_theme}+{sec_theme}"
                print(f"🎯 [CONTEXT-AWARE AI] Kích hoạt Soft-Gating Top-2: '{effective_theme}' ({detected_theme}+{sec_theme})!")
            else:
                effective_theme = scene_res.get("theme_name_vi", "Bàn Học, Văn Phòng & Trường Học")
                active_scene_key = detected_theme
                print(f"🎯 [CONTEXT-AWARE AI] Kích hoạt bối cảnh '{effective_theme}' ({detected_theme}) theo đúng kiến trúc đồ án!")
        else:
            # Người dùng chọn bối cảnh thủ công
            apply_theme_classes(theme)
            effective_theme = theme
            active_scene_key = theme

        # Tầng 2: Chạy suy luận nhận diện đồ vật YOLO-World siêu tốc trên CPU
        # Đặt conf khởi tạo 0.10 để bao quát cả vật thể nhỏ/che khuất (Recall cao)
        import torch
        with torch.inference_mode():
            results = model.predict(pil_image, conf=min(conf, 0.10), imgsz=480, verbose=False)
        
        detected_words = []
        seen_words = set()

        color_palettes = [
            ("#FEF3C7", "#D97706", "#1A1612"),
            ("#E0E7FF", "#4F46E5", "#1E1B4B"),
            ("#D1FAE5", "#059669", "#064E3B"),
            ("#FCE7F3", "#DB2777", "#831843"),
            ("#CFFAFE", "#0891B2", "#164E63"),
            ("#EDE9FE", "#7C3AED", "#4C1D95")
        ]

        # Danh mục từ vựng trừu tượng hoặc dễ bị kích hoạt ảo giác bởi kết cấu song song / bề mặt phẳng
        ABSTRACT_OR_STRUCTURE_WORDS = {
            "library", "shelf", "bookshelf", "wardrobe", "counter", "countertop", 
            "wall", "ceiling", "floor", "door", "window", "cabinet", "curtain", "blinds"
        }

        # Danh mục từ vựng nhỏ hoặc chi tiết dễ bị bỏ sót trong ảnh
        SMALL_OR_OBSCURED_WORDS = {
            "pen", "pencil", "cup", "coffee cup", "mug", "glass", "fork", "knife", "spoon",
            "apple", "banana", "orange", "lemon", "lime", "medicine", "pill", "capsule",
            "computer mouse", "smartphone", "cell phone", "bottle", "key", "eraser",
            "airpods", "earbuds", "earphones", "strawberry", "egg", "cookie", "coin", "usb hub"
        }

        item_index = 0
        for r in results:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                word_name = r.names[cls_id]
                score = float(box.conf[0])

                # Cơ chế Adaptive Confidence Thresholds:
                w_clean = word_name.strip().lower()
                if w_clean in ABSTRACT_OR_STRUCTURE_WORDS:
                    min_thresh = 0.35  # Nâng ngưỡng để đảm bảo Precision, chống ảo giác
                elif w_clean in SMALL_OR_OBSCURED_WORDS:
                    min_thresh = 0.12  # Hạ ngưỡng để tăng Recall cho vật thể nhỏ
                else:
                    min_thresh = conf   # Ngưỡng chuẩn mặc định (0.15)

                if score < min_thresh:
                    continue

                x1, y1, x2, y2 = box.xyxy[0].tolist()

                # Tính phần trăm vị trí theo kích thước ảnh thực tế
                left_pct = round((x1 / width) * 100, 1)
                top_pct = round((y1 / height) * 100, 1)
                w_pct = round(((x2 - x1) / width) * 100, 1)
                h_pct = round(((y2 - y1) / height) * 100, 1)

                # Giữ nguyên tỷ lệ và tọa độ thực tế chính xác của mô hình
                w_pct = round(max(2.0, min(99.0, w_pct)), 1)
                h_pct = round(max(2.0, min(99.0, h_pct)), 1)
                left_pct = round(max(0.0, min(100.0 - w_pct, left_pct)), 1)
                top_pct = round(max(0.0, min(100.0 - h_pct, top_pct)), 1)

                meaning, ipa, cefr = get_word_details(word_name)
                palette = color_palettes[item_index % len(color_palettes)]

                detected_words.append({
                    "id": f"yolo-{item_index}-{word_name.replace(' ', '-')}",
                    "word": word_name,
                    "ipa": ipa,
                    "vietnamese": meaning,
                    "partOfSpeech": "noun",
                    "level": cefr,
                    "confidence": round(score, 2),
                    "colorBg": palette[0],
                    "colorBorder": palette[1],
                    "colorText": palette[2],
                    "exampleEn": f"I can see a {word_name} in this space.",
                    "exampleVi": f"Tôi có thể nhìn thấy một {meaning} trong không gian này.",
                    "collocation": f"use a {word_name}",
                    "collocationVi": f"sử dụng {meaning}",
                    "topPercent": top_pct,
                    "leftPercent": left_pct,
                    "widthPercent": w_pct,
                    "heightPercent": h_pct
                })
                item_index += 1

        # TẦNG 2B: THẨM ĐỊNH HỘP BAO HAI GIAI ĐOẠN (DEEP TWO-STAGE VERIFIER)
        # 1. Cắt vùng ảnh crop kiểm tra đặc trưng sâu (MobileNetV3 Feature Extractor)
        # 2. Loại bỏ dị biệt hình học (Aspect ratio / Area constraints)
        # 3. Hiệu chuẩn độ tin cậy theo Ma trận Đồng xuất hiện bối cảnh (Co-occurrence)
        # 4. Triệt tiêu hộp bao lồng nhau (Soft Containment NMS)
        verified_words = verifier_service.verify_and_refine(pil_image, detected_words, scene_key=active_scene_key)

        # Fallback nếu bộ thẩm định lọc quá tay hoặc với ảnh tranh vẽ / hoạt hình
        if not verified_words and detected_words:
            print(f"⚠️ [VERIFIER FALLBACK] Bộ thẩm định lọc hết ứng viên, fallback lấy {len(detected_words)} vật thể nhận diện từ YOLO-World")
            verified_words = detected_words

        # Tầng 2C: Ưu tiên lọc từ vựng theo mục tiêu CEFR của học viên (A1, A2, B1, B2, C1)
        cefr_order = {"A1": 1, "A2": 2, "B1": 3, "B2": 4, "C1": 5, "C2": 6}
        target_val = cefr_order.get((target_level or "A2").upper().strip(), 2)

        def cefr_priority_key(item):
            item_lvl = cefr_order.get(str(item.get("level", "A2")).upper().strip(), 2)
            dist = abs(item_lvl - target_val)
            # Ưu tiên từ có khoảng cách CEFR nhỏ nhất (đúng cấp độ trước), kết hợp độ tin cậy cao
            return (dist, -float(item.get("confidence", 0.0)))

        candidates_to_filter = sorted(verified_words, key=cefr_priority_key)

        # Lọc bớt trùng lặp tên từ để tạo danh mục học tập phong phú
        filtered = []
        for item in candidates_to_filter:
            w = item["word"]
            if w not in seen_words or len(filtered) < 4:
                seen_words.add(w)
                filtered.append(item)
            if len(filtered) >= 15: # Giới hạn tối đa 15 vật thể nổi bật nhất (tăng từ 12 để hiển thị phong phú hơn)
                break

        print(f"🎯 [TWO-STAGE INFERENCE] Thẩm định thành công {len(filtered)}/{len(detected_words)} vật thể (Ảnh {width}x{height}px)")
        for item in filtered:
            print(f"   -> [{item['word']}] ({item['confidence']*100:.1f}%) [Tầng 2B: Verified] - {item['vietnamese']}")

        # Tự động tinh chỉnh bối cảnh theo các vật thể thực tế được tìm thấy (tránh ResNet-18 đoán lệch)
        if filtered:
            theme_scores = {}
            for item in filtered:
                w = item["word"]
                for t_key, t_data in themes_map.items():
                    if w in t_data.get("classes", []):
                        theme_scores[t_key] = theme_scores.get(t_key, 0) + 1
            if theme_scores:
                best_theme_key = max(theme_scores, key=theme_scores.get)
                dominant_theme_name = themes_map[best_theme_key].get("nameVi")
                if auto_scene_info and auto_scene_info.get("enabled"):
                    auto_scene_info["theme_name_vi"] = dominant_theme_name
                    auto_scene_info["theme_key"] = best_theme_key
                effective_theme = dominant_theme_name

        # Sinh ngữ cảnh thông minh bằng Groq LLM thích ứng theo cấp độ CEFR của học viên
        if skip_dialogue:
            # Chế độ siêu tốc (Decoupled UX): Trả về vật thể ngay lập tức (<0.8s), hội thoại sẽ được sinh nền qua /regenerate-dialogue
            scene_title = effective_theme or "Bối cảnh thực tế đời sống"
            context_source = "pending"
            dialogue = []
        else:
            context_res = generate_context(filtered, effective_theme or "Bối cảnh thực tế đời sống", target_level=target_level or "A2")
            scene_title = context_res.get("sceneTitle", effective_theme or "Bối cảnh thực tế đời sống")
            context_source = context_res.get("contextSource", "fallback")
            examples_map = context_res.get("examples", {})
            dialogue = context_res.get("dialogue", [])

            # Cập nhật câu ví dụ ngữ cảnh độc nhất cho từng đồ vật
            for item in filtered:
                w = item["word"]
                if w in examples_map and isinstance(examples_map[w], dict):
                    item["exampleEn"] = examples_map[w].get("exampleEn", item["exampleEn"])
                    item["exampleVi"] = examples_map[w].get("exampleVi", item["exampleVi"])

        # Chuẩn bị thông điệp chẩn đoán nếu không tìm thấy vật thể
        diag_msg = None
        if len(filtered) == 0:
            reasons = []
            if width < 500 or height < 500:
                reasons.append(f"Kích thước ảnh khá nhỏ ({width}x{height}px), khuyến nghị từ 600px trở lên để AI nhìn rõ nét")
            reasons.append(f"Không có vật thể nào trong bối cảnh '{effective_theme}' đạt ngưỡng tin cậy conf >= {conf*100:.0f}%")
            diag_msg = "; ".join(reasons)
            print(f"ℹ️ [DIAGNOSTIC] {diag_msg}")

        import gc
        gc.collect()

        return {
            "success": True,
            "theme": theme,
            "activeTheme": current_active_theme,
            "autoScene": auto_scene_info,
            "sceneTitle": scene_title,
            "contextSource": context_source,
            "totalDetected": len(filtered),
            "detectedObjects": filtered,
            "dialogue": dialogue,
            "diagnosticMessage": diag_msg,
            "imageDimensions": {"width": width, "height": height}
        }

    except Exception as e:
        import traceback
        err_trace = traceback.format_exc()
        print(f"❌ [INFERENCE ERROR] Lỗi xử lý ảnh: {e}\n{err_trace}")
        return {
            "success": False,
            "error": str(e),
            "errorType": type(e).__name__,
            "message": f"Lỗi xử lý ({type(e).__name__}): {str(e)}",
            "detectedObjects": [],
            "dialogue": []
        }


class RegenerateDialogueRequest(BaseModel):
    words: List[Dict[str, Any]]
    theme: Optional[str] = "general"
    target_level: Optional[str] = "A2"


@app.post("/regenerate-dialogue")
async def regenerate_dialogue(req: RegenerateDialogueRequest):
    """
    Điểm cuối cho phép học viên bấm nút 'Sinh Hội Thoại Mới' cho cùng một bức ảnh
    để luyện tập thêm các tình huống giao tiếp khác nhau thích ứng theo cấp độ CEFR.
    """
    context_res = generate_context(req.words, req.theme or "general", target_level=req.target_level or "A2")
    return {
        "success": True,
        "contextSource": context_res.get("contextSource", "fallback"),
        "sceneTitle": context_res.get("sceneTitle", req.theme),
        "dialogue": context_res.get("dialogue", []),
        "examples": context_res.get("examples", {})
    }


class GenerateQuizRequest(BaseModel):
    words: List[Dict[str, Any]]
    theme: Optional[str] = "Bối cảnh đời thực"
    target_level: Optional[str] = "A2"
    num_questions: Optional[int] = 5


@app.post("/generate-quiz")
async def handle_generate_quiz(req: GenerateQuizRequest):
    """
    Điểm cuối sinh bài thi trắc nghiệm AI (Groq LLM) dựa trên danh sách từ vựng của học viên.
    Trả về bộ câu hỏi 4 lựa chọn A/B/C/D kèm giải thích chi tiết tiếng Việt.
    """
    try:
        res = generate_quiz(
            words_list=req.words,
            theme=req.theme or "Bối cảnh đời thực",
            target_level=req.target_level or "A2",
            num_questions=req.num_questions or 5
        )
        return res
    except Exception as e:
        import traceback
        print(f"❌ [QUIZ ERROR] Lỗi sinh đề thi: {e}\n{traceback.format_exc()}")
        return {
            "success": False,
            "error": str(e),
            "questions": []
        }


class ExtractVocabRequest(BaseModel):
    text: str
    target_count: Optional[int] = 20
    target_level: Optional[str] = "A2"
    theme_hint: Optional[str] = ""


@app.post("/extract-vocab")
async def handle_extract_vocab(req: ExtractVocabRequest):
    """
    Điểm cuối phân tích tài liệu văn bản bằng Groq LLM và bóc tách từ vựng trung thực:
    - Bắt buộc từ vựng và câu ngữ cảnh phải xuất hiện trong văn bản gốc.
    - Không tự ý bịa từ bên ngoài, tự động giới hạn và ghi log nếu văn bản không đủ số từ yêu cầu.
    """
    try:
        res = extract_vocabulary_from_text(
            text=req.text,
            target_count=req.target_count or 20,
            target_level=req.target_level or "A2",
            theme_hint=req.theme_hint or ""
        )
        return res
    except Exception as e:
        import traceback
        print(f"❌ [EXTRACT ERROR] Lỗi trích xuất từ vựng: {e}\n{traceback.format_exc()}")
        return {
            "success": False,
            "error": str(e),
            "words": [],
            "extractedCount": 0,
            "requestedCount": req.target_count or 20,
            "logMessage": f"Lỗi xử lý AI: {str(e)}"
        }


class GenerateStoryRequest(BaseModel):
    words: List[Dict[str, Any]]
    target_level: Optional[str] = "A2"
    theme: Optional[str] = "Đời sống hàng ngày"


@app.post("/generate-story")
async def handle_generate_story(req: GenerateStoryRequest):
    """
    Điểm cuối sinh câu chuyện ngữ cảnh ứng dụng thực tế kết nối các từ vựng học viên cần học.
    """
    try:
        res = generate_context_story_from_words(
            words=req.words,
            target_level=req.target_level or "A2",
            theme=req.theme or "Đời sống hàng ngày"
        )
        return res
    except Exception as e:
        import traceback
        print(f"❌ [STORY ERROR] Lỗi sinh bài viết: {e}\n{traceback.format_exc()}")
        return {
            "success": False,
            "error": str(e),
            "storyEn": "",
            "storyVi": ""
        }


def extract_text_from_file_bytes(filename: str, content: bytes) -> str:
    """
    Trích xuất văn bản thuần túy từ tệp PDF, Word (.docx) hoặc Text (.txt, .md).
    """
    ext = os.path.splitext(filename or "")[1].lower()

    if ext == ".pdf":
        text_parts = []
        # Ưu tiên sử dụng PyMuPDF (fitz) với nhiều chiến lược trích xuất
        try:
            import fitz
            doc = fitz.open(stream=content, filetype="pdf")
            for page in doc:
                # 1. Thử trích xuất văn bản tiêu chuẩn
                t = page.get_text("text")
                if t and t.strip():
                    text_parts.append(t.strip())
                    continue

                # 2. Nếu rỗng, thử trích xuất theo blocks (bố cục cột CV, bảng biểu)
                blocks = page.get_text("blocks")
                block_texts = [b[4].strip() for b in blocks if len(b) > 4 and isinstance(b[4], str) and b[4].strip()]
                if block_texts:
                    text_parts.append("\n".join(block_texts))
                    continue

                # 3. Thử trích xuất words nếu khối chữ rời rạc
                words_list = page.get_text("words")
                if words_list:
                    extracted_words = " ".join([w[4] for w in words_list if len(w) > 4])
                    if extracted_words.strip():
                        text_parts.append(extracted_words.strip())

            doc.close()
            extracted = "\n\n".join(text_parts).strip()
            if extracted and len(extracted) >= 10:
                return extracted
        except Exception as e_fitz:
            print(f"⚠️ [PDF FITZ ERROR] {e_fitz}, thử fallback sang pypdf...")

        # Fallback sang pypdf
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            for page in reader.pages:
                txt = page.extract_text()
                if txt and txt.strip():
                    text_parts.append(txt.strip())
            extracted = "\n\n".join(text_parts).strip()
            if extracted and len(extracted) >= 10:
                return extracted
        except Exception as e_pypdf:
            print(f"⚠️ [PDF PYPDF ERROR] {e_pypdf}")

        raise ValueError(
            "Tệp PDF này không chứa lớp văn bản kỹ thuật số (Selectable Text Layer). "
            "Điều này thường xảy ra khi CV/tài liệu được xuất từ Canva/Photoshop dạng ảnh phẳng, hoặc scan từ máy in. "
            "Khắc phục: Bạn hãy mở file PDF thử bôi đen copy chữ dán trực tiếp vào ô, hoặc khi xuất từ Canva hãy chọn 'PDF Tiêu chuẩn (Standard)'."
        )

    elif ext in [".docx", ".doc"]:
        try:
            import docx
            doc = docx.Document(io.BytesIO(content))
            full_text = []
            for para in doc.paragraphs:
                clean_p = para.text.strip()
                if clean_p:
                    full_text.append(clean_p)
            for table in doc.tables:
                for row in table.rows:
                    cells = [c.text.strip() for c in row.cells if c.text.strip()]
                    if cells:
                        full_text.append(" | ".join(cells))
            extracted = "\n\n".join(full_text).strip()
            if extracted:
                return extracted
            raise ValueError("Tệp Word rỗng không có đoạn văn bản nào.")
        except Exception as e_docx:
            raise ValueError(f"Không thể đọc nội dung tệp Word (.docx): {e_docx}")

    else:
        # Tệp văn bản thuần (.txt, .md, .text)
        for enc in ["utf-8", "utf-16", "cp1252", "latin-1"]:
            try:
                return content.decode(enc).strip()
            except UnicodeDecodeError:
                continue
        raise ValueError("Định dạng tệp không được hỗ trợ giải mã văn bản.")


@app.post("/parse-document")
async def handle_parse_document(file: UploadFile = File(...)):
    """
    Điểm cuối bóc tách nội dung văn bản thuần túy từ tệp PDF, DOCX/Word, TXT/MD.
    """
    try:
        content = await file.read()
        filename = file.filename or "uploaded_document"
        text = extract_text_from_file_bytes(filename, content)
        words = text.split()
        return {
            "success": True,
            "filename": filename,
            "text": text,
            "wordCount": len(words),
            "characterCount": len(text)
        }
    except Exception as e:
        import traceback
        print(f"❌ [PARSE DOCUMENT ERROR] {e}\n{traceback.format_exc()}")
        return {
            "success": False,
            "error": str(e),
            "filename": file.filename or "",
            "text": "",
            "wordCount": 0
        }


if __name__ == "__main__":
    import uvicorn
    print("⚡ Khởi chạy Vocario AI Vision Server trên cổng 8001 (http://127.0.0.1:8001)...")
    uvicorn.run(app, host="127.0.0.1", port=8001)

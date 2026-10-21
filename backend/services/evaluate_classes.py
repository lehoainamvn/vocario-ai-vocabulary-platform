"""
Script Đánh Giá Thực Nghiệm YOLO-World & Lexicon Service cho Đồ Án Tốt Nghiệp Vocario
- Đo độ bao phủ phiên âm IPA & Dịch nghĩa tiếng Việt cho toàn bộ ~145 từ
- Đo thời gian suy luận (Inference Speed) trung bình theo từng bối cảnh
- Xuất số liệu thống kê chuẩn để đưa vào chương Báo cáo Thực nghiệm
"""
import os
import sys
import time
import json
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from ultralytics import YOLOWorld
from backend.services.lexicon_service import lexicon_service
from backend.services.ai_vision_server import themes_map, all_target_classes, MODEL_PATH

def evaluate_system():
    print("=" * 70)
    print("🔬 BẮT ĐẦU ĐÁNH GIÁ THỰC NGHIỆM HỆ THỐNG THỊ GIÁC AI & TỪ ĐIỂN VOCARIO")
    print("=" * 70)
    
    # 1. Đánh giá Lexicon Service trên toàn bộ danh sách ~145 từ
    print(f"\n📊 1. KIỂM THỬ PIPELINE TỪ ĐIỂN (Tổng số từ: {len(all_target_classes)})")
    lexicon_success = 0
    ipa_success = 0
    vietnamese_success = 0
    start_lex = time.time()
    
    for word in all_target_classes:
        res = lexicon_service.lookup(word)
        if res.get("ipa") and res["ipa"] != f"/{word}/":
            ipa_success += 1
        if res.get("vietnamese") and res["vietnamese"].lower() != word.lower():
            vietnamese_success += 1
        if res.get("ipa") and res.get("vietnamese"):
            lexicon_success += 1

    lex_duration = time.time() - start_lex
    print(f"   -> Độ bao phủ phiên âm IPA: {ipa_success}/{len(all_target_classes)} ({ipa_success/len(all_target_classes)*100:.1f}%)")
    print(f"   -> Độ bao phủ dịch tiếng Việt: {vietnamese_success}/{len(all_target_classes)} ({vietnamese_success/len(all_target_classes)*100:.1f}%)")
    print(f"   -> Tốc độ tra cứu trung bình: {lex_duration/len(all_target_classes)*1000:.2f} ms/từ (nhờ Cache JSON)")

    # 2. Đánh giá Tốc độ suy luận YOLO-World theo từng bối cảnh
    print(f"\n⚡ 2. ĐO TỐC ĐỘ SUY LUẬN (INFERENCE SPEED) YOLO-WORLD THEO BỐI CẢNH")
    print("   Khởi tạo mô hình YOLO-World v2...")
    model = YOLOWorld(MODEL_PATH)
    dummy_img = Image.new("RGB", (640, 640), color=(200, 200, 200))
    
    # Warmup
    model.predict(dummy_img, verbose=False)
    
    results_table = []
    
    # Đo chế độ toàn cảnh (all classes)
    model.set_classes(all_target_classes)
    t0 = time.time()
    for _ in range(5):
        model.predict(dummy_img, verbose=False)
    avg_all_speed = ((time.time() - t0) / 5) * 1000
    results_table.append(("Toàn bộ danh sách (All)", len(all_target_classes), avg_all_speed))
    
    # Đo từng bối cảnh
    for theme_key, theme_data in themes_map.items():
        classes = theme_data["classes"]
        model.set_classes(classes)
        t_start = time.time()
        for _ in range(5):
            model.predict(dummy_img, verbose=False)
        avg_speed = ((time.time() - t_start) / 5) * 1000
        results_table.append((theme_data["nameVi"], len(classes), avg_speed))
        
    print("\n   BẢNG TỔNG HỢP HIỆU NĂNG THỰC NGHIỆM:")
    print("   " + "-" * 60)
    print(f"   | {'Bối Cảnh / Chế Độ':<30} | {'Số từ':<8} | {'Độ trễ':<12} |")
    print("   " + "-" * 60)
    for name, count, spd in results_table:
        print(f"   | {name:<30} | {count:<8} | {spd:.1f} ms      |")
    print("   " + "-" * 60)
    print("\n✅ ĐÁNH GIÁ HOÀN TẤT! Số liệu sẵn sàng đưa vào báo cáo đồ án.")

if __name__ == "__main__":
    evaluate_system()

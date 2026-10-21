import json
import os
from ultralytics import YOLOWorld

def main():
    image_path = os.path.join("docs", "figures", "scene_01_study_desk.jpg")
    print(f"🚀 Bắt đầu nhận diện từ vựng trên bức ảnh: {image_path}")

    # 1. Load mô hình YOLO-World
    model = YOLOWorld('yolov8s-worldv2.pt')

    # 2. Đọc bộ từ vựng 1000+ từ thiết yếu chuẩn Vocario
    target_classes_path = os.path.join("backend", "services", "target_classes.txt")
    if os.path.exists(target_classes_path):
        with open(target_classes_path, "r", encoding="utf-8") as f:
            vocab_classes = [line.strip() for line in f if line.strip()]
    else:
        vocab_classes = ["desk", "chair", "laptop", "book", "pen", "lamp", "computer monitor", "keyboard", "mouse"]

    print(f"📚 Đã nạp kho {len(vocab_classes)} từ vựng tiếng Anh vào mô hình...")
    model.set_classes(vocab_classes)

    # 3. Chạy nhận diện với ngưỡng tin cậy conf=0.18 để phát hiện cả vật thể lớn và nhỏ
    print("🔍 Đang quét toàn bộ các vật thể trong bức ảnh góc học tập...")
    results = model.predict(
        image_path, 
        conf=0.18, 
        save=True, 
        project="test_output", 
        name="study_desk_detected"
    )

    print("\n🎉 === DANH SÁCH TỪ VỰNG TIẾNG ANH PHÁT HIỆN TRÊN BÀN HỌC ===")
    detected_items = []
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            word = r.names[cls_id]
            conf = float(box.conf[0])
            coords = [round(x, 1) for x in box.xyxy[0].tolist()]
            detected_items.append({
                "word": word,
                "confidence": conf,
                "box": coords
            })

    # Sắp xếp theo độ tin cậy từ cao xuống thấp
    detected_items.sort(key=lambda x: x["confidence"], reverse=True)

    # In ra dạng danh mục từ vựng học tập
    unique_words = set()
    for item in detected_items:
        word = item["word"]
        unique_words.add(word)
        print(f"✨ Từ vựng: [{word:<18}] | Độ tin cậy: {item['confidence']*100:.1f}% | Vị trí: {item['box']}")

    print(f"\n🏆 TỔNG KẾT VOCARIO:")
    print(f"- Tổng số từ vựng độc nhất nhận diện được: {len(unique_words)} từ")
    print(f"- Danh sách từ vựng: {list(unique_words)}")
    print(f"🖼️ Ảnh kết quả đã vẽ khung và gắn nhãn từ vựng được lưu tại: test_output/study_desk_detected/")

if __name__ == "__main__":
    main()

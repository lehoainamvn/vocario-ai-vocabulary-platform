import json
import os
from ultralytics import YOLOWorld

def main():
    image_path = "Ban-hoc-sinh-go-cong-nghiep-tien-dung-GHS-41245-ava.png"
    print(f"🚀 Bắt đầu nhận diện từ vựng trên bức ảnh: {image_path}")

    # 1. Load mô hình YOLO-World
    model = YOLOWorld('yolov8s-worldv2.pt')

    # 2. Đọc bộ từ vựng 1200+ từ từ LVIS dataset
    lvis_json_path = os.path.join("YOLO-World", "data", "texts", "lvis_v1_class_texts.json")
    with open(lvis_json_path, "r", encoding="utf-8") as f:
        raw_classes = json.load(f)
    vocab_1200 = [item[0] for item in raw_classes]

    print(f"📚 Đã nạp kho {len(vocab_1200)} từ vựng tiếng Anh vào mô hình...")
    model.set_classes(vocab_1200)

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

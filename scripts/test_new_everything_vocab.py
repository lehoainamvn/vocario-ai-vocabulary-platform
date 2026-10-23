import os
import sys
import time
import json
import torch
from PIL import Image
from ultralytics import YOLOWorld

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.services.scene_service import scene_service
from backend.services.verifier_service import verifier_service

FEATS_CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "services", "cache", "yolo_1000_feats.pt")
THEMES_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "backend", "services", "themes_classes.json")
img_path = os.path.join(os.path.dirname(__file__), "..", "docs", "figures", "test_output_study_desk.jpg")

print("==================================================================")
print("TEST THỰC TẾ KIẾN TRÚC MỞ RỘNG (EVERYTHING DETECTION)")
print("==================================================================")

t_load = time.time()
cached = torch.load(FEATS_CACHE_PATH, weights_only=True)
master_txt_feats = cached['txt_feats']
cached_classes = cached['classes']
word_to_master_idx = {w: i for i, w in enumerate(cached_classes)}
print(f"✅ Nạp vector cache offline thành công: {len(cached_classes)} từ vựng ({time.time() - t_load:.3f}s)")

with open(THEMES_CONFIG_PATH, 'r', encoding='utf-8') as f:
    themes_map = json.load(f)

img = Image.open(img_path).convert('RGB')
scene_res = scene_service.predict_scene(img)
theme_key = scene_res['theme_key']
print(f"🏛️ Tầng 1 (Scene Classification): {scene_res['theme_name_vi']} ({theme_key}) - Độ tin cậy: {scene_res['confidence']*100:.1f}%")

# Cắt lát Tensor theo bối cảnh
theme_classes = themes_map[theme_key]['classes']
indices = [word_to_master_idx[w] for w in theme_classes if w in word_to_master_idx]
idx_tensor = torch.tensor(indices, dtype=torch.long)

model = YOLOWorld('yolov8s-worldv2.pt')
t0 = time.time()
model.model.txt_feats = master_txt_feats[:, idx_tensor, :]
model.model.model[-1].nc = len(indices)
model.model.names = {i: cached_classes[idx] for i, idx in enumerate(indices)}
model.predictor = None
slice_time = (time.time() - t0) * 1000
print(f"⚡ Thời gian cắt lát Tensor offline ({len(indices)} lớp): {slice_time:.2f} ms")

# Suy luận YOLO-World
t_infer = time.time()
with torch.inference_mode():
    results = model.predict(img, conf=0.15, imgsz=480, verbose=False)
infer_dur = time.time() - t_infer
print(f"🎯 Tầng 2 (YOLO-World Inference): {infer_dur:.2f}s")

raw_cands = []
for r in results:
    for box in r.boxes:
        cls_id = int(box.cls[0])
        w = r.names[cls_id]
        score = float(box.conf[0])
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        raw_cands.append({
            'word': w,
            'confidence': score,
            'box_pixels': [x1, y1, x2, y2]
        })

print(f"\n📦 Danh sách {len(raw_cands)} vật thể phát hiện trước khi thẩm định:")
for c in raw_cands:
    print(f"   - {c['word']:<22}: {c['confidence']*100:.1f}%")

verified = verifier_service.verify_and_refine(img, raw_cands, scene_key=theme_key)
print(f"\n🏆 Tầng 2B (Sau Thẩm định Deep Two-Stage Verifier): {len(verified)} vật thể đạt chuẩn:")
for v in verified:
    print(f"   * {v['word']:<22}: {v['confidence']*100:.1f}%")
print("==================================================================")

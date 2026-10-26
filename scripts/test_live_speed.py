import time
import requests

url = "https://vocario-ai.onrender.com/detect?conf=0.15&theme=auto&target_level=A2"
img_path = "docs/figures/test_output_study_desk.jpg"

print("[TEST] Dang gui anh test_output_study_desk.jpg toi https://vocario-ai.onrender.com/detect...")
t0 = time.time()
with open(img_path, "rb") as f:
    r = requests.post(url, files={"file": f}, timeout=120)
t1 = time.time()

elapsed = t1 - t0
print(f"[THOI GIAN] Tong thoi gian phan hoi (Network + AI Inference): {elapsed:.2f} giay")
print(f"[STATUS] HTTP Code: {r.status_code}")

if r.status_code == 200:
    data = r.json()
    print(f"[BOI CANH] {data.get('sceneTitle')}")
    print(f"[SO LUONG VAT THE] {data.get('totalDetected')}")
    print("[DANH SACH TU VUNG]:")
    for obj in data.get("detectedObjects", []):
        word = obj.get("word")
        vi = obj.get("vietnamese")
        conf = int(obj.get("confidence", 0) * 100)
        lvl = obj.get("level")
        print(f"  * {word} - {vi} (Do tin cay: {conf}%) - Level: {lvl}")
else:
    print("[ERROR] Response:", r.text[:300])

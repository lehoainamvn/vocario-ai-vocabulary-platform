import time
import requests
import io
import sys
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

print("1. Đang tạo ảnh thử nghiệm nhỏ 320x240...")
img = Image.new('RGB', (320, 240), color=(120, 150, 180))
buf = io.BytesIO()
img.save(buf, format='JPEG')
buf.seek(0)

url = "https://vocario-ai.onrender.com/detect?conf=0.25&theme=general&skip_dialogue=true"
print(f"2. Đang gửi POST request đến: {url}")
start = time.time()
try:
    res = requests.post(
        url,
        files={"file": ("test.jpg", buf, "image/jpeg")},
        timeout=120
    )
    elapsed = time.time() - start
    print(f"✅ KẾT QUẢ PHẢN HỒI:")
    print(f" - Status Code: {res.status_code}")
    print(f" - Tổng thời gian: {elapsed:.2f} giây")
    print(f" - Nội dung: {res.text[:300]}")
except requests.exceptions.Timeout:
    elapsed = time.time() - start
    print(f"❌ TIMEOUT: Quá {elapsed:.2f}s máy chủ Render không phản hồi!")
except Exception as e:
    elapsed = time.time() - start
    print(f"❌ LỖI: {type(e).__name__}: {e} (sau {elapsed:.2f}s)")

import time
import requests
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

print("=" * 60)
print("KIỂM TRA THỜI GIAN PHẢN HỒI CÁC DỊCH VỤ DEPLOY TRÊN RENDER")
print("=" * 60)

urls_to_ping = [
    ("AI Service Health", "GET", "https://vocario-ai.onrender.com/health", None),
    ("User Mentioned BE (english-ascension)", "GET", "https://english-ascension-backend.onrender.com/actuator/health", None),
    ("User Mentioned BE Root", "GET", "https://english-ascension-backend.onrender.com/api/words", None),
    ("Old BE in environment.prod.ts", "GET", "https://vocario-backend.onrender.com/api/health", None),
]

for name, method, url, data in urls_to_ping:
    start_t = time.time()
    try:
        print(f"\n[PING] {name}: {url}")
        if method == "GET":
            res = requests.get(url, timeout=45)
        else:
            res = requests.post(url, json=data, timeout=45)
        elapsed = time.time() - start_t
        print(f" -> Mã phản hồi: {res.status_code} | Thời gian: {elapsed:.2f} giây")
        print(f" -> Phản hồi rút gọn: {res.text[:150]}")
    except requests.exceptions.Timeout:
        elapsed = time.time() - start_t
        print(f" -> [TIMEOUT] Quá 45 giây không phản hồi! (Render đang ngủ - Cold Start hoặc chết server)")
    except Exception as e:
        elapsed = time.time() - start_t
        print(f" -> [LỖI]: {type(e).__name__}: {e} ({elapsed:.2f}s)")

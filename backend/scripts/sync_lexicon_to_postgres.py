"""
Script đồng bộ từ điển từ lexicon_cache.json và target_classes.txt vào CSDL PostgreSQL (Supabase / vocario_db)
- Nạp 1.086+ từ vựng đã có đầy đủ Nghĩa tiếng Việt, IPA, Cấp độ CEFR
- Upsert vào bảng 'words' (ON CONFLICT (word) DO UPDATE)
- Đồng bộ 2 chiều giữa Python AI Service và Spring Boot Backend
"""

import os
import sys
import json
import uuid
from typing import Dict, Any

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

ENV_PATH = os.path.join(ROOT_DIR, "backend", ".env")
load_dotenv(ENV_PATH)

DEFAULT_PG_URL = "postgresql://postgres.ltviznwjqsfszbjbjjqj:Vocario2026Pass@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require"
PG_URL = os.getenv("DATABASE_URL", DEFAULT_PG_URL)

CACHE_FILE = os.path.join(ROOT_DIR, "backend", "services", "cache", "lexicon_cache.json")
THEMES_FILE = os.path.join(ROOT_DIR, "backend", "services", "themes_classes.json")

def load_local_cache() -> Dict[str, Any]:
    if not os.path.exists(CACHE_FILE):
        print(f"❌ Không tìm thấy tệp {CACHE_FILE}")
        return {}
    with open(CACHE_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def load_word_categories() -> Dict[str, str]:
    """Ánh xạ từ vựng sang chủ đề chính từ themes_classes.json"""
    word_to_cat = {}
    if os.path.exists(THEMES_FILE):
        with open(THEMES_FILE, "r", encoding="utf-8") as f:
            themes = json.load(f)
            for theme_key, theme_data in themes.items():
                name_vi = theme_data.get("nameVi", theme_key)
                for w in theme_data.get("classes", []):
                    if w not in word_to_cat:
                        word_to_cat[w] = name_vi
    return word_to_cat

def sync_cache_to_postgres():
    print("================================================================================")
    print("🚀 BẮT ĐẦU ĐỒNG BỘ TỪ ĐIỂN TỪ LEXICON CACHE VÀO CSDL POSTGRESQL")
    print("================================================================================")
    
    cache = load_local_cache()
    if not cache:
        print("⚠️ Không có từ vựng nào trong cache để đồng bộ.")
        return

    word_to_cat = load_word_categories()
    print(f"📦 Đã nạp {len(cache)} từ vựng từ lexicon_cache.json.")

    print(f"🔌 Đang kết nối tới PostgreSQL...")
    try:
        conn = psycopg2.connect(PG_URL)
        cur = conn.cursor()
        print("✅ Kết nối PostgreSQL thành công!")

        # Chuẩn bị dữ liệu records để insert hàng loạt
        records = []
        for word, info in cache.items():
            w_clean = word.strip().lower()
            if not w_clean or len(w_clean) > 150:
                continue
            
            vi = info.get("vietnamese", w_clean)
            ipa = info.get("ipa", f"/{w_clean}/")
            cefr = info.get("level", "A2")
            category = word_to_cat.get(w_clean, "Đồ vật đời sống")
            u_id = str(uuid.uuid4())
            
            records.append((
                u_id,
                w_clean,
                "noun",
                ipa,
                vi,
                cefr,
                category
            ))

        print(f"⏳ Đang thực hiện Upsert {len(records)} từ vựng vào bảng 'words'...")
        
        insert_query = """
            INSERT INTO words (id, word, part_of_speech, phonetic_ipa, vietnamese_meaning, cefr_level, category)
            VALUES %s
            ON CONFLICT (word) DO UPDATE SET
                vietnamese_meaning = EXCLUDED.vietnamese_meaning,
                phonetic_ipa = EXCLUDED.phonetic_ipa,
                cefr_level = EXCLUDED.cefr_level,
                category = COALESCE(words.category, EXCLUDED.category);
        """

        execute_values(cur, insert_query, records, template="(%s, %s, %s, %s, %s, %s, %s)", page_size=200)
        conn.commit()

        # Kiểm tra lại tổng số từ trong PostgreSQL
        cur.execute("SELECT count(*) FROM words;")
        total_in_db = cur.fetchone()[0]
        print(f"🎉 ĐỒNG BỘ THÀNH CÔNG! Tổng số từ vựng trong CSDL PostgreSQL hiện tại: {total_in_db} từ.")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"❌ Lỗi khi đồng bộ vào PostgreSQL: {e}")

if __name__ == "__main__":
    sync_cache_to_postgres()

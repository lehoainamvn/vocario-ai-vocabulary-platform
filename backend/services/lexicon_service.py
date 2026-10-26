import os
import sys
import json
import re
from typing import Optional, Dict, Any

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import eng_to_ipa as ipa_lib
from deep_translator import GoogleTranslator, MyMemoryTranslator

from dotenv import load_dotenv
from groq import Groq


try:
    import cefrpy
except ImportError:
    cefrpy = None

# Nạp cấu hình từ backend/.env
ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(ENV_PATH)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

DEFAULT_PG_URL = "postgresql://postgres.ltviznwjqsfszbjbjjqj:Vocario2026Pass@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require"
PG_URL = os.getenv("DATABASE_URL", DEFAULT_PG_URL)

try:
    import psycopg2
except ImportError:
    psycopg2 = None

# Đường dẫn file cache từ vựng để không bao giờ phải dịch lại lần 2
CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
CACHE_FILE = os.path.join(CACHE_DIR, "lexicon_cache.json")

os.makedirs(CACHE_DIR, exist_ok=True)

class LexiconService:
    def __init__(self):
        self._cache = {}
        self._load_cache()
        self._load_from_postgres()
        self._translator = GoogleTranslator(source="en", target="vi")
        self._groq_client = None
        self._cefr_analyzer = None
        if cefrpy:
            try:
                self._cefr_analyzer = cefrpy.CEFRAnalyzer()
                print("[LexiconService] Da khoi tao thanh cong CEFRAnalyzer (Cambridge EVP / Oxford 3000)!")
            except Exception as e:
                print(f"[LexiconService] Khong the nap CEFRAnalyzer: {e}")
        if GROQ_API_KEY:
            try:
                self._groq_client = Groq(api_key=GROQ_API_KEY)
            except Exception as e:
                print(f"[LexiconService] Groq client init failed: {e}")

    def _load_cache(self):
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    self._cache = json.load(f)
            except Exception as e:
                print(f"[LexiconService] Lỗi đọc cache: {e}")
                self._cache = {}

    def _load_from_postgres(self):
        """Tự động đồng bộ các từ vựng đã có trong bảng 'words' của PostgreSQL vào bộ nhớ RAM"""
        if not psycopg2 or not PG_URL:
            return
        try:
            conn = psycopg2.connect(PG_URL, connect_timeout=5)
            cur = conn.cursor()
            cur.execute("SELECT word, vietnamese_meaning, phonetic_ipa, cefr_level FROM words WHERE word IS NOT NULL;")
            rows = cur.fetchall()
            loaded_count = 0
            for w, vi, ipa, cefr in rows:
                if not w:
                    continue
                clean = w.strip().lower()
                if clean not in self._cache:
                    self._cache[clean] = {
                        "vietnamese": vi or clean,
                        "ipa": ipa or f"/{clean}/",
                        "level": cefr or "A2"
                    }
                    loaded_count += 1
            cur.close()
            conn.close()
            if loaded_count > 0:
                print(f"[LexiconService] Da dong bo {loaded_count} tu vung moi tu CSDL PostgreSQL vao RAM!")
                self._save_cache()
            print(f"[LexiconService] Ket noi CSDL PostgreSQL thanh cong (Tong {len(rows)} tu trong bang words)!")
        except Exception as e:
            print(f"[LexiconService] Khong the ket noi PostgreSQL ({e}), tiep tuc dung cache cuc bo.")


    def _save_cache(self):
        try:
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                json.dump(self._cache, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[LexiconService] Lỗi lưu cache: {e}")

    def _save_to_postgres(self, word: str, vietnamese: str, ipa: str, level: str):
        """Lưu tức thời từ vựng mới vào bảng 'words' của PostgreSQL để đồng bộ với Spring Boot"""
        if not psycopg2 or not PG_URL:
            return
        try:
            import uuid
            conn = psycopg2.connect(PG_URL, connect_timeout=5)
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO words (id, word, part_of_speech, phonetic_ipa, vietnamese_meaning, cefr_level, category)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (word) DO NOTHING;
            """, (str(uuid.uuid4()), word.strip().lower(), "noun", ipa, vietnamese, level, "Đồ vật đời sống"))
            conn.commit()
            cur.close()
            conn.close()
        except Exception:
            pass

    def _is_valid_translation(self, trans: str, original: str) -> bool:
        if not trans:
            return False
        t = trans.strip().lower()
        if t == original.lower():
            return False
        # Kiểm tra nếu chỉ toàn ký tự đặc biệt hoặc mã lỗi
        if set(t).issubset(set("/\\*#@!-._ ")):
            return False
        if "no query" in t or "error" in t or "warning" in t:
            return False
        # Chặn các từ dịch sai ngữ cảnh đời sống thường gặp
        bad_context_map = {
            "person": ["pháp nhân", "thể nhân"],
            "bed": ["phòng ngủ"],
            "vase": ["bình"]
        }
        if original in bad_context_map:
            for bad_word in bad_context_map[original]:
                if t == bad_word:
                    return False
        return True

    def _translate_with_groq(self, word: str) -> Optional[str]:
        """Dịch chuẩn xác 1 từ/cụm từ qua Groq LLM theo ngữ cảnh đồ vật đời sống thực tế"""
        if not self._groq_client:
            return None
        try:
            resp = self._groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a professional English-Vietnamese dictionary specializing in real-world physical objects and items seen in photos. "
                            "Translate the noun into natural, everyday conversational Vietnamese (1 to 3 words only). "
                            "Output ONLY the Vietnamese translation in lowercase, no explanation, no quotation marks. "
                            "Examples: 'bed' -> 'chiếc giường', 'person' -> 'con người', 'vase' -> 'bình hoa', 'cup' -> 'cái tách, chén', 'potted plant' -> 'chậu cây'."
                        )
                    },
                    {
                        "role": "user",
                        "content": word
                    }
                ],
                max_tokens=20,
                temperature=0.1
            )
            content = resp.choices[0].message.content.strip().lower()
            clean = re.sub(r'["\'.]', '', content).strip()
            if self._is_valid_translation(clean, word):
                return clean
        except Exception as e:
            print(f"[LexiconService] Groq translation fallback error: {e}")
        return None

    def get_ipa(self, word: str) -> str:
        """Sinh phiên âm IPA chuẩn cho từ hoặc cụm từ tự động 100% bằng eng-to-ipa"""
        clean = word.strip().lower()

        try:
            # eng-to-ipa tự động chuyển đổi từ đơn hoặc cụm từ sang ký hiệu ngữ âm quốc tế IPA
            raw_ipa = ipa_lib.convert(clean)
            # Loại bỏ dấu * nếu có khi từ không nằm trong từ điển mặc định của CMU
            clean_ipa = raw_ipa.replace("*", "").strip()
            if not clean_ipa:
                clean_ipa = clean
            return f"/{clean_ipa}/"
        except Exception as e:
            print(f"[LexiconService] eng-to-ipa error for '{word}': {e}")
            return f"/{clean}/"

    def get_meaning(self, word: str) -> str:
        """Dịch nghĩa tiếng Việt: ưu tiên cache -> Groq AI (chuẩn đồ vật đời sống) -> GoogleTranslator -> MyMemory"""
        clean = word.strip().lower()

        # 1. Tra cứu trong Cache cục bộ
        if clean in self._cache and "vietnamese" in self._cache[clean]:
            cached_val = self._cache[clean]["vietnamese"]
            if self._is_valid_translation(cached_val, clean):
                return cached_val

        # 2. Ưu tiên Groq AI LLM (hiểu ngữ cảnh đồ vật đời sống tuyệt đối)
        groq_trans = self._translate_with_groq(clean)
        if groq_trans:
            return groq_trans

        # 3. Dịch tự động bằng GoogleTranslator
        try:
            translated = self._translator.translate(clean)
            if self._is_valid_translation(translated, clean):
                return translated.strip().lower()
        except Exception as e:
            print(f"[LexiconService] GoogleTranslator rate-limited/error ({type(e).__name__}), switching to MyMemory...")

        # 4. Fallback sang MyMemoryTranslator
        try:
            fallback_translator = MyMemoryTranslator(source="en-GB", target="vi-VN")
            translated = fallback_translator.translate(clean)
            if self._is_valid_translation(translated, clean):
                return translated.strip().lower()
        except Exception as e:
            print(f"[LexiconService] MyMemoryTranslator error for '{clean}': {type(e).__name__}")

        return clean

    def _classify_cefr_with_groq(self, word: str) -> Optional[str]:
        """Gọi Groq LLM để phân tích và gán nhãn cấp độ CEFR chuẩn Cambridge EVP cho từ/cụm từ"""
        if not self._groq_client:
            return None
        try:
            resp = self._groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a Cambridge English lexicographer. "
                            "Assess the CEFR level of the given English word or phrase according to the Cambridge English Vocabulary Profile (EVP) or Oxford 3000. "
                            "Respond ONLY with the CEFR level code: A1, A2, B1, B2, C1, or C2. "
                            "Do not include any other text, reasoning, punctuation, or markdown."
                        )
                    },
                    {
                        "role": "user",
                        "content": word
                    }
                ],
                max_tokens=10,
                temperature=0.0
            )
            raw = resp.choices[0].message.content.strip().upper()
            clean_code = re.sub(r'[^A-Z0-9]', '', raw)
            if clean_code in ["A1", "A2", "B1", "B2", "C1", "C2"]:
                print(f"[LexiconService] Groq LLM da gan nhan CEFR cho '{word}': {clean_code}")
                return clean_code
        except Exception as e:
            print(f"[LexiconService] Groq CEFR error for '{word}': {e}")
        return None

    def get_cefr_level(self, word: str) -> str:
        """
        Quy trình gán nhãn CEFR tự động 100% không gán cứng:
        1. Gọi thư viện cefrpy đối soát cơ sở dữ liệu Cambridge EVP
        2. Nếu cefrpy không tìm thấy (từ ghép, từ mới) -> Gọi Groq LLM chuyên gia Cambridge gán nhãn
        """
        clean = word.strip().lower()

        # BƯỚC 1: Gọi thư viện cefrpy
        if self._cefr_analyzer:
            try:
                # 1a. Tra cứu từ đơn dưới dạng Danh từ (Noun - POSTag.NN)
                if cefrpy:
                    pos_level = self._cefr_analyzer.get_word_pos_level_CEFR(clean, cefrpy.POSTag.NN)
                    if pos_level:
                        lvl_str = str(pos_level)
                        return "B2" if lvl_str in ["C1", "C2"] else lvl_str

                # 1b. Tra cứu mức độ trung bình từ
                avg_level = self._cefr_analyzer.get_average_word_level_CEFR(clean)
                if avg_level:
                    lvl_str = str(avg_level)
                    return "B2" if lvl_str in ["C1", "C2"] else lvl_str

                # 1c. Đối với cụm từ ghép, tra cứu danh từ chính ở cuối
                parts = clean.split()
                if len(parts) > 1:
                    head_noun = parts[-1]
                    if cefrpy:
                        head_level = self._cefr_analyzer.get_word_pos_level_CEFR(head_noun, cefrpy.POSTag.NN)
                        if head_level:
                            lvl_str = str(head_level)
                            return "B2" if lvl_str in ["C1", "C2"] else lvl_str
                    head_avg = self._cefr_analyzer.get_average_word_level_CEFR(head_noun)
                    if head_avg:
                        lvl_str = str(head_avg)
                        return "B2" if lvl_str in ["C1", "C2"] else lvl_str
            except Exception as e:
                print(f"[LexiconService] cefrpy lookup error for '{clean}': {e}")

        # BƯỚC 2: Nếu thư viện cefrpy không có -> Đưa cho Groq LLM thẩm định và gán nhãn
        groq_level = self._classify_cefr_with_groq(clean)
        if groq_level:
            return groq_level

        # Fallback an toàn nếu mất kết nối mạng và cefrpy không có
        return "A2"

    def lookup(self, word: str) -> dict:
        """Trả về toàn bộ thông tin tra cứu gồm IPA, tiếng Việt, cấp độ tự động hoàn toàn"""
        clean = word.strip().lower()

        # 1. Kiểm tra Cache để đạt độ trễ 0ms (phải có bản dịch tiếng Việt hợp lệ)
        if clean in self._cache:
            entry = self._cache[clean]
            cached_val = entry.get("vietnamese", clean)
            if self._is_valid_translation(cached_val, clean):
                return {
                    "word": word,
                    "vietnamese": cached_val,
                    "ipa": entry.get("ipa", f"/{clean}/"),
                    "level": entry.get("level", self.get_cefr_level(clean)),
                    "source": "cache"
                }

        # 2. Sinh mới hoàn toàn tự động bằng eng-to-ipa, deep-translator và cefrpy
        ipa = self.get_ipa(clean)
        vietnamese = self.get_meaning(clean)
        level = self.get_cefr_level(clean)

        result = {
            "word": word,
            "vietnamese": vietnamese,
            "ipa": ipa,
            "level": level,
            "source": "deep-translator+eng-to-ipa+cefrpy"
        }

        # 3. Lưu vào cache file json và đồng bộ tức thời vào PostgreSQL
        self._cache[clean] = {
            "vietnamese": vietnamese,
            "ipa": ipa,
            "level": level
        }
        self._save_cache()
        self._save_to_postgres(clean, vietnamese, ipa, level)
        return result



# Singleton instance
lexicon_service = LexiconService()

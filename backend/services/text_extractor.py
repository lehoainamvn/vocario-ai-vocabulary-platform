import os
import json
import re
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from groq import Groq

# Nạp cấu hình từ backend/.env
ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(ENV_PATH)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
GROQ_FALLBACK_MODEL = os.getenv("GROQ_FALLBACK_MODEL", "qwen/qwen3.8-27b")

client: Optional[Groq] = None
if GROQ_API_KEY:
    try:
        client = Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        print(f"[TextExtractor] Lỗi khởi tạo Groq client: {e}")


def estimate_vocabulary_capacity(text: str) -> Dict[str, Any]:
    """
    Phân tích sơ bộ văn bản để ước lượng số lượng từ vựng độc lập có giá trị học thuật.
    Tránh trường hợp văn bản 50 từ nhưng người dùng đòi trích xuất 100 từ.
    """
    cleaned_tokens = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
    stop_words = {
        "the", "and", "that", "have", "for", "not", "with", "you", "this", "but", "his", "from", 
        "they", "say", "her", "she", "will", "one", "all", "would", "there", "their", "what", 
        "out", "about", "who", "get", "which", "when", "make", "can", "like", "time", "just", 
        "him", "know", "take", "people", "into", "year", "your", "good", "some", "could", 
        "them", "see", "other", "than", "then", "now", "look", "only", "come", "its", "over", 
        "think", "also", "back", "after", "use", "two", "how", "our", "work", "first", "well", 
        "way", "even", "new", "want", "because", "any", "these", "give", "day", "most", "us"
    }
    meaningful_words = [w for w in cleaned_tokens if w not in stop_words]
    unique_words = list(set(meaningful_words))
    
    return {
        "totalWords": len(cleaned_tokens),
        "meaningfulWordsCount": len(meaningful_words),
        "uniqueVocabCount": len(unique_words),
        "suggestedMax": max(1, min(len(unique_words), 50))
    }


def extract_vocabulary_from_text(
    text: str,
    target_count: int = 20,
    target_level: str = "A2",
    theme_hint: str = ""
) -> Dict[str, Any]:
    """
    Trích xuất từ vựng trung thực từ văn bản tài liệu bằng Groq LLM:
    - Bắt buộc từ vựng PHẢI xuất hiện trong văn bản gốc (Không được tự bịa).
    - Câu ví dụ (exampleEn) PHẢI là câu trích xuất nguyên văn từ tài liệu.
    - Nếu văn bản không đủ số lượng từ yêu cầu, hệ thống trả về đúng số từ thực tế kèm thông báo rõ ràng.
    """
    if not text or len(text.strip()) < 10:
        return {
            "success": False,
            "error": "Văn bản quá ngắn để trích xuất từ vựng.",
            "words": [],
            "extractedCount": 0,
            "requestedCount": target_count,
            "diagnosticMessage": "Vui lòng nhập đoạn văn bản tiếng Anh từ 10 ký tự trở lên."
        }

    capacity = estimate_vocabulary_capacity(text)
    effective_count = max(1, min(target_count, 60))

    if not client or not GROQ_API_KEY:
        return {
            "success": False,
            "error": "Groq API key chưa được cấu hình.",
            "words": [],
            "extractedCount": 0,
            "requestedCount": target_count,
            "diagnosticMessage": "Dịch vụ AI Groq chưa sẵn sàng."
        }

    system_prompt = f"""Bạn là chuyên gia ngôn ngữ học ứng dụng và khảo thí CEFR quốc tế.
Nhiệm vụ: Phân tích văn bản tiếng Anh do người dùng cung cấp (có thể là bài báo học thuật IELTS, tài liệu kỹ thuật, hoặc bản CV / Resume / JD nghề nghiệp) và trích xuất tối đa {effective_count} từ vựng/cụm từ tiếng Anh có giá trị học tập cao nhất (ưu tiên cấp độ {target_level.upper()}).

QUY TẮC CỐT LÕI (TUÂN THỦ NGHIÊM NGẶT):
1. TÍNH TRUNG THỰC VĂN BẢN (STRICT GROUNDING):
   - MỌI TỪ VỰNG được chọn BẮT BUỘC phải xuất hiện trực tiếp trong văn bản gốc.
   - TUYỆT ĐỐI KHÔNG tự bịa, không suy diễn hoặc lấy từ vựng bên ngoài văn bản.
   - 'exampleEn' là câu văn hoặc dòng gạch đầu dòng (bullet point) trích xuất nguyên văn từ văn bản gốc có chứa từ đó.
2. HỖ TRỢ ĐA DẠNG LOẠI TÀI LIỆU (BÀI ĐỌC, BÁO CÁO, CV / RESUME):
   - Nếu văn bản là CV / Resume / JD: Hãy ưu tiên trích xuất các động từ hành động chuyên nghiệp (action verbs như: spearhead, implement, streamline, orchestrate, collaborate, troubleshoot, optimize...), các tính từ năng lực (scalable, robust, proficient, versatile...), và thuật ngữ học tập có nghĩa tiếng Anh.
   - Bỏ qua các danh từ riêng thuần túy (tên người, tên công ty, số điện thoại, địa chỉ, tên framework/thư viện code như 'React', 'Angular', 'Java', 'Docker').
3. LINH HOẠT CẤP ĐỘ CEFR:
   - Nếu người dùng chọn cấp độ cao ({target_level.upper()}) nhưng văn bản chứa ít từ cấp độ này, hãy linh hoạt bổ sung các từ vựng hữu ích ở các cấp độ lân cận (A2, B1, B2) thay vì trả về 0 từ.
   - Nếu văn bản không đủ số lượng từ yêu cầu, chỉ trả về đúng số từ thực tế có trong bài.
   - Nếu văn bản viết bằng tiếng Việt hoặc không chứa nội dung tiếng Anh có nghĩa, đặt 'words': [] và ghi rõ lý do trong 'logMessage'.
4. ĐỊNH DẠNG ĐẦU RA:
   - CHỈ trả về duy nhất chuỗi JSON hợp lệ (không kèm markdown ```json hay giải thích ngoài JSON).
   - Cấu trúc JSON:
   {{
     "extractedCount": 10,
     "requestedCount": {effective_count},
     "logMessage": "Thông báo ngắn gọn tiếng Việt (Ví dụ: 'Đã trích xuất 10 từ vựng và động từ hành động chuyên môn từ tài liệu.')",
     "words": [
       {{
         "word": "từ_gốc",
         "ipa": "/phiên_âm/",
         "vietnamese": "nghĩa tiếng Việt chính xác theo ngữ cảnh",
         "partOfSpeech": "Danh từ / Động từ / Tính từ / Trạng từ / Cụm từ",
         "level": "B2",
         "exampleEn": "Câu hoặc dòng nguyên văn trích xuất từ tài liệu gốc.",
         "exampleVi": "Bản dịch nghĩa tiếng Việt của câu ví dụ."
       }}
     ]
   }}
"""

    user_prompt = f"Văn bản cần trích xuất từ vựng:\n\"\"\"\n{text.strip()}\n\"\"\""

    models_to_try = [GROQ_MODEL, GROQ_FALLBACK_MODEL, "openai/gpt-oss-120b", "qwen/qwen3.8-27b"]
    raw_response = None
    used_model = None

    for m in models_to_try:
        if not m:
            continue
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model=m,
                temperature=0.2,  # Thấp để đảm bảo bám sát văn bản, không ảo giác
                max_tokens=6500,  # Đủ lớn để chứa đến 50 từ vựng kèm ngữ cảnh đầy đủ
                response_format={"type": "json_object"}
            )
            raw_response = chat_completion.choices[0].message.content
            used_model = m
            if raw_response and len(raw_response.strip()) > 10:
                break
        except Exception as e:
            try:
                print(f"[TextExtractor] Thử model {m} thất bại: {e}")
            except Exception:
                pass
            continue

    if not raw_response:
        return {
            "success": False,
            "error": "Không nhận được phản hồi từ Groq LLM.",
            "words": [],
            "extractedCount": 0,
            "requestedCount": target_count,
            "diagnosticMessage": "Lỗi kết nối dịch vụ AI."
        }

    # Bóc tách JSON an toàn, có cơ chế tự động sửa lỗi khi bị ngắt chuỗi
    try:
        clean_text = raw_response.strip()
        clean_text = re.sub(r"^```(?:json)?\s*", "", clean_text)
        clean_text = re.sub(r"\s*```$", "", clean_text)
        clean_text = clean_text.strip()
        
        try:
            data = json.loads(clean_text)
        except json.JSONDecodeError:
            # Fallback phục hồi JSON nếu chuỗi bị ngắt đuôi
            last_bracket = clean_text.rfind("}")
            if last_bracket != -1:
                recovered = clean_text[:last_bracket + 1]
                if not recovered.endswith("]}"):
                    if recovered.endswith("]"):
                        recovered += "}"
                    else:
                        recovered += "]}"
                data = json.loads(recovered)
            else:
                raise

        words = data.get("words", [])
        actual_count = len(words)
        log_msg = data.get("logMessage", "")
        
        if not log_msg:
            if actual_count < target_count:
                log_msg = f"Văn bản chứa {actual_count} từ vựng học tập phù hợp (yêu cầu {target_count} từ). Hệ thống đã trích xuất tối đa toàn bộ các từ này."
            else:
                log_msg = f"Đã trích xuất thành công {actual_count} từ vựng trọng tâm từ văn bản."

        return {
            "success": True,
            "model": used_model,
            "requestedCount": target_count,
            "extractedCount": actual_count,
            "capacityEstimate": capacity,
            "logMessage": log_msg,
            "words": words
        }
    except Exception as e:
        try:
            print(f"[TextExtractor] Lỗi phân giải JSON: {repr(e)}")
        except Exception:
            pass
        return {
            "success": False,
            "error": f"Lỗi xử lý dữ liệu AI: {str(e)}",
            "words": [],
            "extractedCount": 0,
            "requestedCount": target_count,
            "diagnosticMessage": "Không thể cấu trúc hóa danh sách từ vựng từ văn bản này."
        }


def generate_context_story_from_words(
    words: List[Dict[str, Any]],
    target_level: str = "A2",
    theme: str = "Đời sống hàng ngày"
) -> Dict[str, Any]:
    """
    Sinh một câu chuyện / bài luận ứng dụng ngắn sử dụng toàn bộ danh sách từ vựng được cung cấp.
    Học viên có thể đọc và hiểu cách liên kết từ trong thực tế.
    """
    if not words:
        return {"success": False, "error": "Danh sách từ rỗng."}

    if not client or not GROQ_API_KEY:
        return {"success": False, "error": "Groq client chưa sẵn sàng."}

    vocab_list = [w.get("word", "") for w in words if w.get("word")]
    system_prompt = f"""Bạn là tác giả văn học giáo dục tiếng Anh chuẩn CEFR {target_level.upper()}.
Nhiệm vụ: Viết một câu chuyện ngắn hoặc đoạn hội thoại đời thực tự nhiên (khoảng 100-150 từ) chủ đề '{theme}', kết nối khéo léo các từ vựng sau:
{', '.join(vocab_list[:15])}

YÊU CẦU:
1. Bôi đậm các từ vựng trong văn bản tiếng Anh bằng định dạng markdown: **word**.
2. Cung cấp bản dịch tiếng Việt tương ứng phía dưới.
3. Trả về JSON:
{{
  "titleEn": "Tiêu đề tiếng Anh",
  "titleVi": "Tiêu đề tiếng Việt",
  "storyEn": "Đoạn văn tiếng Anh có chứa các từ **word**",
  "storyVi": "Bản dịch nghĩa tiếng Việt trau chuốt"
}}
"""
    try:
        resp = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Hãy viết câu chuyện ngắn kết nối các từ vựng trên."}
            ],
            model=GROQ_MODEL,
            temperature=0.7,
            max_tokens=1500
        )
        content = resp.choices[0].message.content.strip()
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content).strip()
        data = json.loads(content)
        data["success"] = True
        return data
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "storyEn": "",
            "storyVi": ""
        }

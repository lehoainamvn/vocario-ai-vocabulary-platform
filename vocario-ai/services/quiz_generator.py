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
        print(f"[QuizGenerator] Lỗi khởi tạo Groq client: {e}")


def _build_fallback_quiz(words_list: List[Dict[str, Any]], theme: str) -> Dict[str, Any]:
    """Sinh bộ câu hỏi trắc nghiệm ngoại tuyến (Rule-based Fallback) khi Groq API không khả dụng"""
    questions = []
    all_words = [w.get("word", "") for w in words_list if w.get("word")]

    for idx, item in enumerate(words_list):
        target = item.get("word", "").strip()
        meaning = item.get("vietnamese", item.get("meaning", "đồ vật")).strip()
        ipa = item.get("ipa", "")
        if not target:
            continue

        # Tạo 3 từ gây nhiễu (distractors)
        other_words = [w for w in all_words if w.lower() != target.lower()]
        fallback_distractors = ["device", "container", "object", "item", "furniture", "accessory"]
        distractors = (other_words + fallback_distractors)[:3]

        options = [target] + distractors
        # Xáo trộn đáp án
        import random
        random.seed(idx * 42)
        shuffled = options.copy()
        random.shuffle(shuffled)
        
        correct_index = shuffled.index(target)
        option_letters = ["A", "B", "C", "D"]
        correct_letter = option_letters[correct_index]

        formatted_options = [f"{option_letters[i]}. {shuffled[i]}" for i in range(len(shuffled))]

        questions.append({
            "id": f"quiz-{idx+1}",
            "targetWord": target,
            "targetIpa": ipa,
            "targetMeaning": meaning,
            "questionEn": f"Choose the correct word that refers to '{meaning}' ({target}):",
            "questionVi": f"Chọn từ tiếng Anh chính xác có nghĩa là '{meaning}':",
            "options": formatted_options,
            "correctAnswer": correct_letter,
            "explanationVi": f"'{target}' có nghĩa là '{meaning}' {ipa}. Đây là đáp án chính xác trong ngữ cảnh này."
        })

    return {
        "success": True,
        "quizSource": "offline_fallback",
        "quizTitle": f"Thử Thách Từ Vựng: {theme or 'Bối Cảnh Đời Thực'}",
        "totalQuestions": len(questions),
        "questions": questions
    }


def generate_quiz(
    words_list: List[Dict[str, Any]], 
    theme: str = "Bối Cảnh Đời Thực", 
    target_level: str = "A2",
    num_questions: int = 5
) -> Dict[str, Any]:
    """
    Sử dụng Groq LLM để sinh bài thi trắc nghiệm ngữ cảnh đời sống thông minh:
    - 4 lựa chọn A, B, C, D với các từ nhiễu tinh tế.
    - Câu hỏi tình huống / điền từ vào chỗ trống phù hợp cấp độ CEFR.
    - Giải thích chi tiết nghĩa và ngữ pháp bằng tiếng Việt.
    """
    if not words_list:
        return {
            "success": False,
            "error": "Danh sách từ vựng rỗng.",
            "questions": []
        }

    valid_words = [w for w in words_list if w.get("word")]
    if not valid_words:
        return _build_fallback_quiz(words_list, theme)

    if not client or not GROQ_API_KEY:
        print("[QuizGenerator] Groq client chưa sẵn sàng, sử dụng bộ câu hỏi dự phòng.")
        return _build_fallback_quiz(valid_words, theme)

    # Lấy tối đa số câu theo yêu cầu
    selected_words = valid_words[:max(1, min(10, num_questions))]
    words_payload = [
        {
            "word": w.get("word"),
            "meaning": w.get("vietnamese", w.get("meaning", "")),
            "level": w.get("level", target_level or "A2")
        }
        for w in selected_words
    ]

    level = (target_level or "A2").upper().strip()

    system_prompt = f"""Bạn là chuyên gia sư phạm tiếng Anh khảo thí chuẩn CEFR quốc tế thiết kế bài thi trắc nghiệm cho người Việt Nam.
Trình độ mục tiêu của học viên: CEFR {level}.
Chủ đề bối cảnh: {theme}.

Nhiệm vụ: Dựa vào danh sách từ vựng được cung cấp, hãy sinh {len(selected_words)} câu hỏi trắc nghiệm ngữ cảnh đời thực (mỗi câu kiểm tra 1 từ trong danh sách).

YÊU CẦU ĐỀ THI:
1. Mỗi câu hỏi gồm:
   - 'questionEn': Câu tiếng Anh đời thường tự nhiên, có chỗ trống '______' cần điền từ, hoặc mô tả tình huống giao tiếp thực tế.
   - 'questionVi': Bản dịch gợi ý nghĩa câu hỏi bằng tiếng Việt.
   - 'options': Đúng 4 phương án ['A. ...', 'B. ...', 'C. ...', 'D. ...'], các từ gây nhiễu phải cùng từ loại, cùng chủ đề nhưng không đúng nghĩa bằng từ mục tiêu.
   - 'correctAnswer': Ký tự đáp án đúng ('A', 'B', 'C', hoặc 'D').
   - 'explanationVi': Giải thích ngắn gọn (1-2 câu) vì sao đáp án này đúng, và nghĩa của các lựa chọn sai nếu có.
2. RÀNG BUỘC ĐỊNH DẠNG:
   - CHỈ trả về duy nhất định dạng JSON hợp lệ (không kèm markdown ```json hay văn bản thừa).
   - Cấu trúc JSON:
   {{
     "quizTitle": "Tiêu đề bài kiểm tra tiếng Việt (ví dụ: 'Thử Thách Từ Vựng: {theme}')",
     "questions": [
       {{
         "id": "q1",
         "targetWord": "từ mục tiêu",
         "questionEn": "...",
         "questionVi": "...",
         "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
         "correctAnswer": "A",
         "explanationVi": "..."
       }}
     ]
   }}
"""

    user_content = f"Danh sách từ vựng cần kiểm tra:\n{json.dumps(words_payload, ensure_ascii=False, indent=2)}"

    # Thử mô hình chính, nếu lỗi thử mô hình dự phòng
    models_to_try = [GROQ_MODEL, GROQ_FALLBACK_MODEL, "qwen/qwen3.8-27b", "openai/gpt-oss-120b"]
    seen_models = set()
    last_error = None

    for model_name in models_to_try:
        if not model_name or model_name in seen_models:
            continue
        seen_models.add(model_name)

        try:
            print(f"🤖 [QuizGenerator] Đang gọi Groq model '{model_name}' sinh quiz ({len(selected_words)} câu)...")
            completion = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.3,
                max_tokens=1800,
                response_format={"type": "json_object"}
            )
            raw_content = completion.choices[0].message.content
            if not raw_content:
                continue

            parsed = json.loads(raw_content)
            questions = parsed.get("questions", [])
            if questions and isinstance(questions, list):
                # Gắn thêm thông tin IPA và nghĩa nếu model chưa đính kèm
                for q in questions:
                    t_word = q.get("targetWord", "")
                    matching_item = next((item for item in selected_words if item.get("word", "").lower() == t_word.lower()), None)
                    if matching_item:
                        q["targetIpa"] = matching_item.get("ipa", "")
                        q["targetMeaning"] = matching_item.get("vietnamese", matching_item.get("meaning", ""))

                print(f"✅ [QuizGenerator] Sinh thành công {len(questions)} câu hỏi trắc nghiệm từ Groq '{model_name}'!")
                return {
                    "success": True,
                    "quizSource": f"groq:{model_name}",
                    "quizTitle": parsed.get("quizTitle", f"Thử Thách Từ Vựng: {theme}"),
                    "totalQuestions": len(questions),
                    "questions": questions
                }

        except Exception as e:
            last_error = e
            print(f"⚠️ [QuizGenerator] Lỗi với model '{model_name}': {e}")

    print(f"⚠️ [QuizGenerator] Các model Groq đều thất bại ({last_error}), chuyển sang bộ câu hỏi dự phòng.")
    return _build_fallback_quiz(valid_words, theme)

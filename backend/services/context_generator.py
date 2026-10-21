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
GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
GROQ_FALLBACK_MODEL = os.getenv("GROQ_FALLBACK_MODEL", "openai/gpt-oss-120b")
GROQ_TIMEOUT = float(os.getenv("GROQ_TIMEOUT_SECONDS", "8.0"))

HIGHLIGHT_COLORS = [
    "text-amber-600",
    "text-indigo-600",
    "text-emerald-600",
    "text-sky-600",
    "text-rose-600",
    "text-purple-600"
]

client: Optional[Groq] = None
if GROQ_API_KEY:
    try:
        client = Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        print(f"[ContextGenerator] Lỗi khởi tạo Groq client: {e}")


def _generate_fallback(words_list: List[Dict[str, str]], theme: str) -> Dict[str, Any]:
    """Sinh ngữ cảnh dự phòng khi Groq API không phản hồi hoặc gặp sự cố"""
    examples = {}
    for idx, item in enumerate(words_list):
        w = item.get("word", "")
        m = item.get("vietnamese", w)
        examples[w] = {
            "exampleEn": f"I can see a {w} clearly in this setting.",
            "exampleVi": f"Tôi có thể nhìn thấy một {m} rõ ràng trong khung cảnh này."
        }

    dialogue = []
    num_words = len(words_list)
    if num_words == 0:
        return {
            "sceneTitle": theme,
            "contextSource": "fallback",
            "dialogue": [],
            "examples": {}
        }
    speakers = [("speakerA", "Bạn A"), ("speakerB", "Bạn B")]

    for i in range(min(4, max(2, num_words))):
        spk, spk_label = speakers[i % 2]
        item = words_list[i % num_words]
        w = item.get("word", "")
        m = item.get("vietnamese", w)

        if i == 0:
            en = f"Do you see the {w} over there?"
            vi = f"Bạn có thấy {m} ở đằng kia không?"
        elif i == 1:
            en = f"Yes, the {w} looks very neat and convenient."
            vi = f"Có chứ, {m} trông rất ngăn nắp và tiện dụng."
        elif i == 2:
            en = f"Let's put the {w} back in its proper place."
            vi = f"Chúng ta hãy đặt lại {m} vào đúng chỗ của nó nhé."
        else:
            en = f"Great idea, that will keep the {w} ready for use."
            vi = f"Ý kiến hay đó, như vậy {m} sẽ luôn sẵn sàng để sử dụng."

        dialogue.append({
            "id": f"turn-{i+1}",
            "speaker": spk,
            "speakerLabel": spk_label,
            "en": en,
            "vi": vi,
            "highlightWord": w,
            "highlightColor": HIGHLIGHT_COLORS[i % len(HIGHLIGHT_COLORS)]
        })

    return {
        "contextSource": "fallback",
        "sceneTitle": theme or "Bối cảnh thực tế đời sống",
        "examples": examples,
        "dialogue": dialogue
    }


def _build_level_instructions(target_level: str) -> str:
    """Xây dựng chỉ dẫn sư phạm thích ứng chính xác theo trình độ CEFR của học viên"""
    level = (target_level or "A2").upper().strip()
    if level == "A1":
        return (
            "Trình độ mục tiêu của học viên: CEFR A1 (Sơ cấp).\n"
            "- Câu ví dụ: Ngắn gọn (5-8 từ), thì Hiện tại đơn giản, từ ngữ trực quan, dễ hiểu.\n"
            "- Đoạn hội thoại: Câu chào hỏi, hỏi vị trí hoặc tên đồ vật cơ bản, câu ngắn, rõ ràng."
        )
    elif level == "A2":
        return (
            "Trình độ mục tiêu của học viên: CEFR A2 (Tiền trung cấp).\n"
            "- Câu ví dụ: Đời thường, tự nhiên (8-12 từ), dùng liên từ cơ bản (and, but, because, so) và thì hiện tại/quá khứ đơn.\n"
            "- Đoạn hội thoại: Trao đổi tình huống sinh hoạt thường nhật, bình luận về tiện ích và thói quen sử dụng đồ vật."
        )
    elif level == "B1":
        return (
            "Trình độ mục tiêu của học viên: CEFR B1 (Trung cấp).\n"
            "- Câu ví dụ: Giao tiếp linh hoạt (12-16 từ), lồng ghép động từ khuyết thiếu (should, might, could), câu điều kiện hoặc mệnh đề quan hệ đơn giản.\n"
            "- Đoạn hội thoại: Thảo luận công năng, so sánh ưu nhược điểm, bày tỏ ý kiến và lời khuyên giữa hai người."
        )
    elif level == "B2":
        return (
            "Trình độ mục tiêu của học viên: CEFR B2 (Trên trung cấp).\n"
            "- Câu ví dụ: Ngữ cảnh học thuật/công việc chuyên nghiệp (15-20 từ), sử dụng thể bị động, câu phức, mệnh đề phân từ hoặc phrasal verbs tự nhiên.\n"
            "- Đoạn hội thoại: Tranh luận sâu sắc, đánh giá giải pháp công nghệ, tính thẩm mỹ và lối sống hiện đại."
        )
    else:  # C1 / C2
        return (
            f"Trình độ mục tiêu của học viên: CEFR {level} (Cao cấp).\n"
            "- Câu ví dụ: Văn phong học thuật, tinh tế, đa dạng cấu trúc ngữ pháp cao cấp (18-25 từ).\n"
            "- Đoạn hội thoại: Phân tích chuyên sâu mang tính học thuật, sắc bén và thuần thục như người bản xứ."
        )


def generate_context(words_list: List[Dict[str, str]], theme: str = "", target_level: str = "A2") -> Dict[str, Any]:
    """
    Sử dụng Groq LLM để sinh ngữ cảnh thực tế độc nhất theo trình độ CEFR của học viên:
    1. Câu ví dụ đời thường (exampleEn + exampleVi) cho từng từ thích ứng độ phức tạp theo target_level.
    2. Đoạn hội thoại tự nhiên 4-6 lượt giữa Bạn A và Bạn B.
    3. Tiêu đề bối cảnh tiếng Việt cô đọng.
    """
    if not words_list:
        return _generate_fallback(words_list, theme)

    if not client or not GROQ_API_KEY:
        print("[ContextGenerator] GROQ_API_KEY chưa cấu hình, dùng fallback.")
        return _generate_fallback(words_list, theme)

    # Giới hạn tối đa 8 từ nổi bật nhất để tối ưu token và độ tập trung
    subset_words = words_list[:8]
    words_payload = [{"word": item["word"], "meaning": item.get("vietnamese", "")} for item in subset_words]

    level_instruction = _build_level_instructions(target_level)

    system_prompt = (
        f"Bạn là một chuyên gia giáo dục tiếng Anh bản ngữ thiết kế bài học giao tiếp cho người Việt.\n"
        f"{level_instruction}\n"
        "Nhiệm vụ của bạn:\n"
        "1. Với mỗi từ vựng được cung cấp, hãy viết một câu ví dụ tiếng Anh đời thường, tự nhiên, "
        "đúng độ phức tạp ngữ pháp yêu cầu và bản dịch tiếng Việt chuẩn xác.\n"
        "2. Viết một đoạn hội thoại giao tiếp tự nhiên từ 4 đến 6 lượt thoại giữa 'Bạn A' và 'Bạn B' "
        "kết nối các đồ vật xuất hiện trong danh sách lại với nhau một cách hợp lý và sinh động.\n"
        "3. Đặt một tiêu đề bối cảnh tiếng Việt cô đọng, cuốn hút (ví dụ: 'Góc Bàn Học Hiện Đại', 'Không Gian Phòng Khách').\n"
        "RÀNG BUỘC:\n"
        "- Chỉ trả về JSON hợp lệ theo đúng cấu trúc yêu cầu.\n"
        "- Không bịa thêm các đồ vật lớn ngoài danh sách.\n"
        "- Mỗi lượt hội thoại phải gán 'highlightWord' là một trong các từ trong danh sách.\n"
        "- Ngôn từ tự nhiên, chuẩn mực, mang tính ứng dụng cao."
    )

    user_prompt = (
        f"Trình độ học viên: CEFR {target_level.upper()}\n"
        f"Chủ đề bối cảnh: {theme or 'Góc sinh hoạt & học tập'}\n"
        f"Danh sách từ vựng xuất hiện trong ảnh:\n"
        f"{json.dumps(words_payload, ensure_ascii=False, indent=2)}\n\n"
        "Hãy trả về JSON theo đúng định dạng sau:\n"
        "{\n"
        '  "sceneTitle": "Tiêu đề tiếng Việt",\n'
        '  "examples": {\n'
        '    "tên_từ": {\n'
        '      "exampleEn": "Câu ví dụ tiếng Anh",\n'
        '      "exampleVi": "Bản dịch tiếng Việt"\n'
        '    }\n'
        '  },\n'
        '  "dialogue": [\n'
        '    {\n'
        '      "speaker": "speakerA",\n'
        '      "speakerLabel": "Bạn A",\n'
        '      "en": "Câu tiếng Anh có chứa từ vựng",\n'
        '      "vi": "Bản dịch tiếng Việt",\n'
        '      "highlightWord": "tên_từ"\n'
        '    }\n'
        '  ]\n'
        '}'
    )

    models_to_try = [GROQ_MODEL]
    if GROQ_FALLBACK_MODEL and GROQ_FALLBACK_MODEL != GROQ_MODEL:
        models_to_try.append(GROQ_FALLBACK_MODEL)

    for target_model in models_to_try:
        try:
            print(f"[ContextGenerator] Đang gọi Groq LLM (Model: {target_model})...")
            response = client.chat.completions.create(
                model=target_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=1200,
                timeout=GROQ_TIMEOUT
            )

            raw_content = response.choices[0].message.content
            parsed = json.loads(raw_content)

            scene_title = parsed.get("sceneTitle") or theme or "Bối cảnh thực tế đời sống"
            raw_examples = parsed.get("examples") or {}
            raw_dialogue = parsed.get("dialogue") or []

            # Chuẩn hóa examples
            examples = {}
            for item in subset_words:
                w = item["word"]
                if w in raw_examples and isinstance(raw_examples[w], dict):
                    ex_en = raw_examples[w].get("exampleEn", f"I use the {w} every day.")
                    ex_vi = raw_examples[w].get("exampleVi", f"Tôi sử dụng {item.get('vietnamese', w)} mỗi ngày.")
                else:
                    # Tra cứu case-insensitive
                    found = None
                    for k, v in raw_examples.items():
                        if k.lower() == w.lower() and isinstance(v, dict):
                            found = v
                            break
                    if found:
                        ex_en = found.get("exampleEn", f"I use the {w} every day.")
                        ex_vi = found.get("exampleVi", f"Tôi sử dụng {item.get('vietnamese', w)} mỗi ngày.")
                    else:
                        ex_en = f"I placed the {w} carefully in the room."
                        ex_vi = f"Tôi đặt {item.get('vietnamese', w)} cẩn thận trong phòng."

                examples[w] = {"exampleEn": ex_en, "exampleVi": ex_vi}

            # Chuẩn hóa dialogue
            dialogue = []
            known_words_lower = [it["word"].lower() for it in subset_words]

            for idx, turn in enumerate(raw_dialogue):
                if not isinstance(turn, dict):
                    continue

                spk = turn.get("speaker", "speakerA" if idx % 2 == 0 else "speakerB")
                spk_label = "Bạn A" if spk == "speakerA" else "Bạn B"
                en = turn.get("en", "").strip()
                vi = turn.get("vi", "").strip()
                hw = turn.get("highlightWord", "").strip()

                if not en:
                    continue

                # Đảm bảo highlightWord hợp lệ
                if not hw or hw.lower() not in known_words_lower:
                    # Tìm từ nào có trong câu
                    hw = subset_words[idx % len(subset_words)]["word"]
                    for kw in subset_words:
                        if re.search(r'\b' + re.escape(kw["word"]) + r'\b', en, re.IGNORECASE):
                            hw = kw["word"]
                            break

                dialogue.append({
                    "id": f"turn-{idx + 1}",
                    "speaker": spk,
                    "speakerLabel": spk_label,
                    "en": en,
                    "vi": vi,
                    "highlightWord": hw,
                    "highlightColor": HIGHLIGHT_COLORS[idx % len(HIGHLIGHT_COLORS)]
                })

            if len(dialogue) < 2:
                print("[ContextGenerator] Hội thoại trả về quá ngắn, dùng fallback.")
                return _generate_fallback(words_list, theme)

            print(f"✨ [ContextGenerator] Groq sinh thành công: {len(examples)} ví dụ, {len(dialogue)} câu thoại (Tiêu đề: '{scene_title}')")
            return {
                "contextSource": "groq",
                "sceneTitle": scene_title,
                "examples": examples,
                "dialogue": dialogue
            }

        except Exception as e:
            print(f"[ContextGenerator] Lỗi khi gọi model {target_model}: {e}")
            continue

    # Nếu tất cả các model đều thất bại, kích hoạt fallback
    print("[ContextGenerator] Toàn bộ lượt gọi Groq thất bại, kích hoạt bộ ngữ cảnh dự phòng.")
    return _generate_fallback(words_list, theme)

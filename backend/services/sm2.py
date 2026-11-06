from datetime import datetime, timedelta, timezone

class SM2Result:
    def __init__(
        self, 
        repetition_number: int, 
        easiness_factor: float, 
        interval_days: int, 
        next_review_date: datetime
    ):
        self.repetition_number = repetition_number
        self.easiness_factor = easiness_factor
        self.interval_days = interval_days
        self.next_review_date = next_review_date

    def to_dict(self):
        return {
            "repetition_number": self.repetition_number,
            "easiness_factor": round(self.easiness_factor, 2),
            "interval_days": self.interval_days,
            "next_review_date": self.next_review_date.isoformat()
        }


def calculate_sm2(
    rating_grade: int,
    current_repetition: int = 0,
    current_ef: float = 2.5,
    current_interval: int = 0,
    review_time: datetime = None
) -> SM2Result:
    """
    Triển khai thuật toán SuperMemo 2 (SM-2) nguyên bản:
    
    Tham số:
    - rating_grade (q): Điểm người học tự đánh giá (0 đến 5):
        5: Nhớ hoàn hảo, không do dự
        4: Nhớ chính xác sau một chút đắn đo
        3: Nhớ đúng nhưng khá khó khăn
        2: Trả lời sai, nhưng thấy đáp án thì nhớ lại ngay
        1: Trả lời sai, đáp án nhìn quen quen
        0: Hoàn toàn không nhớ gì
    - current_repetition (n): Số lần lặp lại liên tiếp trả lời đúng
    - current_ef (EF): Hệ số dễ nhớ hiện tại (mặc định 2.5)
    - current_interval (I): Khoảng cách ngày của lần trước
    - review_time: Mốc thời gian đánh giá (mặc định là hiện tại UTC)
    """
    if review_time is None:
        review_time = datetime.now(timezone.utc)

    # 1. Giới hạn rating_grade trong khoảng [0, 5]
    q = max(0, min(5, rating_grade))

    # 2. Cập nhật hệ số dễ nhớ (Easiness Factor - EF)
    # Công thức SM-2: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    new_ef = current_ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    
    # EF không bao giờ được nhỏ hơn 1.3 theo tiêu chuẩn SuperMemo
    if new_ef < 1.3:
        new_ef = 1.3

    # 3. Tính toán Repetition Number (n) và Interval (I)
    if q >= 3:
        # Người dùng trả lời ĐÚNG (Pass)
        if current_repetition == 0:
            new_interval = 1
            new_repetition = 1
        elif current_repetition == 1:
            new_interval = 6
            new_repetition = 2
        else:
            new_interval = int(round(current_interval * new_ef))
            new_repetition = current_repetition + 1
    else:
        # Người dùng trả lời SAI / Quên (Fail) -> Reset chu kỳ học lại từ đầu
        new_repetition = 0
        new_interval = 1

    # 4. Tính toán mốc ngày ôn tập tiếp theo
    next_review = review_time + timedelta(days=new_interval)

    return SM2Result(
        repetition_number=new_repetition,
        easiness_factor=new_ef,
        interval_days=new_interval,
        next_review_date=next_review
    )


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    print("--- KIEM THU THUAT TOAN SM-2 ---")
    
    # Giả lập 1 từ vựng mới học:
    ef = 2.5
    rep = 0
    interval = 0
    now = datetime.now(timezone.utc)

    print(f"Bắt đầu: EF={ef}, Rep={rep}, Interval={interval}")
    
    # Lần 1: Học từ vựng, đánh giá nhớ tốt (grade = 4)
    res1 = calculate_sm2(rating_grade=4, current_repetition=rep, current_ef=ef, current_interval=interval, review_time=now)
    print(f"Lần 1 (Grade 4): Ôn lại sau {res1.interval_days} ngày | EF={res1.easiness_factor:.2f} | Ngày ôn: {res1.next_review_date.strftime('%Y-%m-%d')}")

    # Lần 2: 1 ngày sau, ôn lại rất dễ (grade = 5)
    res2 = calculate_sm2(rating_grade=5, current_repetition=res1.repetition_number, current_ef=res1.easiness_factor, current_interval=res1.interval_days, review_time=res1.next_review_date)
    print(f"Lần 2 (Grade 5): Ôn lại sau {res2.interval_days} ngày | EF={res2.easiness_factor:.2f} | Ngày ôn: {res2.next_review_date.strftime('%Y-%m-%d')}")

    # Lần 3: 6 ngày sau, ôn lại vẫn nhớ (grade = 4)
    res3 = calculate_sm2(rating_grade=4, current_repetition=res2.repetition_number, current_ef=res2.easiness_factor, current_interval=res2.interval_days, review_time=res2.next_review_date)
    print(f"Lần 3 (Grade 4): Ôn lại sau {res3.interval_days} ngày | EF={res3.easiness_factor:.2f} | Ngày ôn: {res3.next_review_date.strftime('%Y-%m-%d')}")

    # Lần 4: 15 ngày sau, bị quên (grade = 1)
    res4 = calculate_sm2(rating_grade=1, current_repetition=res3.repetition_number, current_ef=res3.easiness_factor, current_interval=res3.interval_days, review_time=res3.next_review_date)
    print(f"Lần 4 (Grade 1 - Bị quên): Reset chu kỳ! Ôn lại sau {res4.interval_days} ngày | EF={res4.easiness_factor:.2f} | Ngày ôn: {res4.next_review_date.strftime('%Y-%m-%d')}")

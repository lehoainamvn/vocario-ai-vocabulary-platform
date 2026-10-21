-- ====================================================================
-- VOCARIO DATABASE SCHEMA (PostgreSQL)
-- Đồ án tốt nghiệp: Nền tảng học tiếng Anh qua nhận diện vật thể & SM-2
-- ====================================================================

-- 1. Bật extension tạo UUID ngẫu nhiên
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Bảng người dùng (Users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(150),
    avatar_url TEXT,
    target_level VARCHAR(10) DEFAULT 'A2', -- A1, A2, B1, B2, C1, C2
    daily_goal INT DEFAULT 10,             -- Số từ mục tiêu học mỗi ngày
    streak_count INT DEFAULT 0,            -- Chuỗi ngày học liên tục
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng các lần chụp ảnh nhận diện vật thể (Captures)
CREATE TABLE IF NOT EXISTS captures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    scene_theme VARCHAR(100) DEFAULT 'General', -- Study Desk, Kitchen, Bedroom, Coffee Shop...
    detected_objects JSONB NOT NULL,            -- Lưu danh sách boxes, labels, confidence từ YOLO-World
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng từ điển từ vựng chuẩn (Words)
CREATE TABLE IF NOT EXISTS words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word VARCHAR(150) UNIQUE NOT NULL,          -- Từ tiếng Anh (e.g., 'laptop', 'water bottle')
    part_of_speech VARCHAR(50),                 -- Noun, Verb, Adjective...
    phonetic_ipa VARCHAR(100),                  -- Phiên âm IPA chuẩn (e.g., /ˈlæptɒp/)
    vietnamese_meaning TEXT NOT NULL,           -- Nghĩa tiếng Việt theo ngữ cảnh
    definition_en TEXT,                         -- Định nghĩa tiếng Anh đơn giản
    cefr_level VARCHAR(10) DEFAULT 'A1',        -- Cấp độ CEFR
    audio_url TEXT,                             -- Đường dẫn file âm thanh phát âm bản ngữ
    example_sentence_en TEXT,                   -- Câu ví dụ tiếng Anh
    example_sentence_vi TEXT,                   -- Dịch câu ví dụ sang tiếng Việt
    category VARCHAR(100),                      -- Nhóm từ (School, Office, Technology...)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng bộ sưu tập từ vựng (Decks)
CREATE TABLE IF NOT EXISTS decks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'folder',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bảng liên kết nhiều-nhiều giữa Decks và Words
CREATE TABLE IF NOT EXISTS deck_words (
    deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
    word_id UUID REFERENCES words(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (deck_id, word_id)
);

-- 6. Bảng tiến trình học tập theo thuật toán SM-2 (User Word Progress)
-- ĐÂY LÀ BẢNG TRỌNG TÂM CỦA THUẬT TOÁN SPACED REPETITION (SM-2)
CREATE TABLE IF NOT EXISTS user_word_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    word_id UUID REFERENCES words(id) ON DELETE CASCADE,
    capture_id UUID REFERENCES captures(id) ON DELETE SET NULL, -- Gắn với ảnh lúc người dùng phát hiện ra từ này
    
    status VARCHAR(50) DEFAULT 'NEW', -- NEW, LEARNING, REVIEWING, MASTERED
    
    -- Các tham số chuẩn của thuật toán SuperMemo 2 (SM-2):
    repetition_number INT DEFAULT 0,            -- n: Số lần lặp lại liên tiếp đúng
    easiness_factor FLOAT DEFAULT 2.5,          -- EF: Hệ số dễ nhớ (Khởi tạo 2.5, tối thiểu 1.3)
    interval_days INT DEFAULT 0,                -- I(n): Khoảng thời gian chu kỳ ôn tập (tính bằng ngày)
    
    next_review_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Thời điểm đến hạn ôn tập
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, word_id) -- Mỗi user chỉ có 1 tiến trình cho 1 từ cụ thể
);

-- 7. Bảng lịch sử các lần đánh giá / làm bài tập (Review Logs)
CREATE TABLE IF NOT EXISTS review_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    progress_id UUID REFERENCES user_word_progress(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    rating_grade INT NOT NULL,                  -- Điểm đánh giá SM-2 từ 0 đến 5 (0: Quên sạch -> 5: Nhớ hoàn hảo)
    review_type VARCHAR(50) DEFAULT 'FLASHCARD',-- FLASHCARD, QUIZ_CHOICE, SPELLING, PRONUNCIATION
    speech_score FLOAT,                         -- Điểm phát âm (nếu làm bài luyện nói)
    response_time_ms INT,                       -- Thời gian người dùng suy nghĩ trả lời (mili-giây)
    
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- TẠO CÁC INDEX TỐI ƯU HIỆU NĂNG TRUY VẤN
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_word_progress_user_next_review 
    ON user_word_progress(user_id, next_review_date);

CREATE INDEX IF NOT EXISTS idx_words_word 
    ON words(word);

CREATE INDEX IF NOT EXISTS idx_captures_user 
    ON captures(user_id);

CREATE INDEX IF NOT EXISTS idx_review_logs_user 
    ON review_logs(user_id, reviewed_at);

-- ====================================================================
-- VOCARIO ENTERPRISE DATABASE SCHEMA (PostgreSQL 15+)
-- Đề tài: Nền tảng học từ vựng tiếng Anh qua thị giác máy tính & SM-2
-- Công nghệ: Spring Boot 3 + Angular 19 + FastAPI + PostgreSQL 17
-- ====================================================================

-- 1. Bật extension sinh UUID ngẫu nhiên
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 2. BẢNG NGƯỜI DÙNG & PHÂN QUYỀN (Users & Role-based Access)
-- ====================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'USER',            -- 'USER' hoặc 'ADMIN'
    target_level VARCHAR(10) DEFAULT 'A2',       -- A1, A2, B1, B2, C1, C2
    daily_goal INT DEFAULT 10,                   -- Số từ mục tiêu học mỗi ngày
    streak_count INT DEFAULT 0,                  -- Chuỗi ngày học liên tục (Streak)
    last_study_date DATE,                        -- Ngày học gần nhất để kiểm tra streak
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 3. BẢNG TỪ ĐIỂN TỪ VỰNG CHUẨN KHUNG CEFR (Words Lexicon)
-- ====================================================================
CREATE TABLE IF NOT EXISTS words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word VARCHAR(150) UNIQUE NOT NULL,          -- Từ tiếng Anh (e.g. 'laptop', 'water bottle')
    part_of_speech VARCHAR(50),                 -- Noun, Verb, Adjective...
    phonetic_ipa VARCHAR(100),                  -- Phiên âm quốc tế IPA (e.g. /ˈlæptɒp/)
    vietnamese_meaning TEXT NOT NULL,           -- Nghĩa tiếng Việt theo ngữ cảnh
    definition_en TEXT,                         -- Định nghĩa tiếng Anh
    cefr_level VARCHAR(10) DEFAULT 'A1',        -- Cấp độ CEFR (A1, A2, B1, B2, C1)
    category VARCHAR(100),                      -- Chủ đề (Study Desk, Office, Kitchen...)
    audio_url TEXT,                             -- Đường dẫn âm thanh phát âm bản ngữ
    example_sentence_en TEXT,                   -- Câu ví dụ tiếng Anh
    example_sentence_vi TEXT,                   -- Dịch câu ví dụ sang tiếng Việt
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 4. BẢNG LẦN QUÉT ẢNH THỊ GIÁC AI (AI Vision Captures)
-- ====================================================================
CREATE TABLE IF NOT EXISTS captures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    scene_theme VARCHAR(100) DEFAULT 'General', -- Study Desk, Kitchen, Living Room...
    detected_objects TEXT NOT NULL,             -- JSON lưu danh sách Bounding Boxes từ YOLO-World v2
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 5. BẢNG BỘ SỔ TAY TỪ VỰNG (Decks & Collections)
-- ====================================================================
CREATE TABLE IF NOT EXISTS decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'folder',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deck_words (
    deck_id UUID REFERENCES decks(id) ON DELETE CASCADE,
    word_id UUID REFERENCES words(id) ON DELETE CASCADE,
    PRIMARY KEY (deck_id, word_id)
);

-- ====================================================================
-- 6. BẢNG TIẾN TRÌNH THUẬT TOÁN SM-2 (User Word Progress)
-- Trọng tâm tính toán Spaced Repetition đường cong Ebbinghaus
-- ====================================================================
CREATE TABLE IF NOT EXISTS user_word_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    word_id UUID REFERENCES words(id) ON DELETE CASCADE,
    capture_id UUID REFERENCES captures(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'NEW',           -- NEW, LEARNING, REVIEWING, MASTERED
    repetition_number INT DEFAULT 0,            -- n: Số lần lặp lại liên tiếp đúng
    easiness_factor DOUBLE PRECISION DEFAULT 2.5, -- EF: Hệ số dễ nhớ (khởi tạo 2.5, tối thiểu 1.3)
    interval_days INT DEFAULT 0,                -- I(n): Khoảng cách chu kỳ ôn tập tiếp theo (ngày)
    next_review_date TIMESTAMP WITH TIME ZONE NOT NULL, -- Thời điểm đến hạn ôn tập
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, word_id)
);

-- ====================================================================
-- 7. BẢNG NHẬT KÝ ĐÁNH GIÁ & LUYỆN NÓI (Review Logs)
-- ====================================================================
CREATE TABLE IF NOT EXISTS review_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    progress_id UUID REFERENCES user_word_progress(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating_grade INT NOT NULL,                  -- Điểm SM-2 từ 0 đến 5 (0: Quên -> 5: Hoàn hảo)
    review_type VARCHAR(50) DEFAULT 'FLASHCARD',-- FLASHCARD, QUIZ, PRONUNCIATION
    speech_score DOUBLE PRECISION,              -- Điểm nhận diện giọng nói Web Speech API
    response_time_ms INT,                       -- Thời gian phản xạ (ms)
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 8. PHÂN HỆ PHÒNG HỌC & ĐẤU TRƯỜNG TỪ VỰNG (Classrooms & Quizzing)
-- ====================================================================
CREATE TABLE IF NOT EXISTS classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,           -- Mã định danh phòng học (VD: 'VOC-8899')
    name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT 'book-open',
    target_level VARCHAR(10) DEFAULT 'A2',
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'ACTIVE',        -- ACTIVE, ARCHIVED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classroom_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    word_text VARCHAR(150) NOT NULL,
    ipa VARCHAR(100),
    vietnamese TEXT NOT NULL,
    part_of_speech VARCHAR(50) DEFAULT 'noun',
    context_sentence_en TEXT,
    context_sentence_vi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classroom_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cloned_to_notebook BOOLEAN DEFAULT FALSE,   -- Đã sao chép bộ từ vào sổ tay cá nhân chưa
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(classroom_id, user_id)
);

CREATE TABLE IF NOT EXISTS classroom_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    score INT NOT NULL,                         -- Điểm số bài thi (%)
    total_questions INT NOT NULL,
    time_spent_seconds INT NOT NULL,            -- Thời gian hoàn thành (giây)
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classroom_member_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mastered_count INT DEFAULT 0,
    total_words INT DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    unmastered_words_json TEXT,
    last_studied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(classroom_id, user_id)
);

-- ====================================================================
-- 9. PHÂN HỆ KHẢO THÍ & CHỨNG CHỈ NĂNG LỰC CEFR (Certificates & Types)
-- ====================================================================
CREATE TABLE IF NOT EXISTS certificate_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_code VARCHAR(50) UNIQUE NOT NULL,      -- VD: 'A1', 'A2', 'B1', 'B2', 'C1', 'IELTS-70'
    title VARCHAR(255) NOT NULL,                -- Tiêu đề vinh danh
    cefr_level VARCHAR(20) NOT NULL,            -- Cấp độ CEFR tương ứng
    required_words INT NOT NULL,                -- Số lượng từ SM-2 tối thiểu
    required_streak INT DEFAULT 0,              -- Chuỗi streak ngày tối thiểu
    description TEXT,                           -- Mô tả tiêu chuẩn năng lực
    approved_by VARCHAR(255) NOT NULL,          -- Cơ quan thẩm định ký phát hành
    badge_color VARCHAR(30) DEFAULT '#7D6853',  -- Màu sắc nhận diện huy hiệu
    is_active BOOLEAN DEFAULT TRUE,             -- Đang áp dụng / Tạm dừng
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    cefr_level VARCHAR(10) NOT NULL,            -- Cấp độ CEFR (A1, A2, B1, B2, C1)
    certificate_code VARCHAR(50) UNIQUE NOT NULL, -- Mã định danh tra cứu (VD: 'VOC-A1-2026-X89K')
    title VARCHAR(255) NOT NULL,                -- Tiêu đề chứng chỉ
    mastered_words_count INT DEFAULT 0,         -- Số từ thành thạo ghi nhận tại thời điểm cấp
    streak_count INT DEFAULT 0,                 -- Chuỗi streak ngày tại thời điểm cấp
    issue_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'ISSUED',        -- ISSUED, PENDING, REVOKED
    approved_by VARCHAR(255) DEFAULT 'Hội Đồng Khảo Thí & Đào Tạo Vocario',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ====================================================================
-- 10. INDEXES TỐI ƯU HIỆU NĂNG TRUY VẤN CSDL (Performance Indexing)
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
CREATE INDEX IF NOT EXISTS idx_words_cefr_level ON words(cefr_level);
CREATE INDEX IF NOT EXISTS idx_captures_user ON captures(user_id);
CREATE INDEX IF NOT EXISTS idx_uwp_user_next_review ON user_word_progress(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_uwp_status ON user_word_progress(status);
CREATE INDEX IF NOT EXISTS idx_review_logs_user_reviewed_at ON review_logs(user_id, reviewed_at);
CREATE INDEX IF NOT EXISTS idx_classrooms_code ON classrooms(code);
CREATE INDEX IF NOT EXISTS idx_classroom_members_class_user ON classroom_members(classroom_id, user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_cert_types_code ON certificate_types(type_code);

-- ====================================================================
-- 11. KHỞI TẠO DỮ LIỆU MẪU MẶC ĐỊNH (Initial Seed Data)
-- ====================================================================

-- 11.1 Mẫu các loại chứng chỉ CEFR tiêu chuẩn
INSERT INTO certificate_types (type_code, title, cefr_level, required_words, required_streak, approved_by, badge_color, is_active, description)
VALUES
('A1', 'Chứng Chỉ Tinh Thông Chuẩn Từ Vựng CEFR A1', 'A1', 10, 0, 'Hội Đồng Khảo Thí & Đào Tạo Vocario', '#059669', TRUE, 'Chứng nhận học viên đã làm chủ các từ vựng căn bản nền tảng về đời sống, đồ vật quanh ta.'),
('A2', 'Chứng Chỉ Tinh Thông Chuẩn Từ Vựng CEFR A2', 'A2', 15, 3, 'Hội Đồng Khảo Thí & Đào Tạo Vocario', '#0284C7', TRUE, 'Chứng nhận năng lực diễn đạt các tình huống giao tiếp thông dụng hàng ngày.'),
('B1', 'Chứng Chỉ Tinh Thông Chuẩn Từ Vựng CEFR B1', 'B1', 20, 5, 'Hội Đồng Khảo Thí & Đào Tạo Vocario', '#4F46E5', TRUE, 'Chứng nhận năng lực độc lập trong môi trường học thuật, công sở và du lịch.'),
('B2', 'Chứng Chỉ Tinh Thông Chuẩn Từ Vựng CEFR B2', 'B2', 30, 7, 'Hội Đồng Khảo Thí & Đào Tạo Vocario', '#7C3AED', TRUE, 'Chứng nhận trình độ từ vựng nâng cao, đọc hiểu và phản biện trôi chảy.'),
('C1', 'Chứng Chỉ Tinh Thông Chuẩn Từ Vựng CEFR C1', 'C1', 50, 14, 'Hội Đồng Khảo Thí & Đào Tạo Vocario', '#B45309', TRUE, 'Chứng nhận trình độ tinh anh học thuật, làm chủ vốn từ chuyên sâu đa lĩnh vực.')
ON CONFLICT (type_code) DO NOTHING;

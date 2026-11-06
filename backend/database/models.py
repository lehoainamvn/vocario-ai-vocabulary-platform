import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Text, Boolean, 
    ForeignKey, DateTime, UniqueConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=True)
    avatar_url = Column(Text, nullable=True)
    target_level = Column(String(10), default="A2")
    daily_goal = Column(Integer, default=10)
    streak_count = Column(Integer, default=0)
    last_active_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    captures = relationship("Capture", back_populates="user", cascade="all, delete-orphan")
    decks = relationship("Deck", back_populates="user", cascade="all, delete-orphan")
    word_progresses = relationship("UserWordProgress", back_populates="user", cascade="all, delete-orphan")
    review_logs = relationship("ReviewLog", back_populates="user", cascade="all, delete-orphan")


class Capture(Base):
    __tablename__ = "captures"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(Text, nullable=False)
    scene_theme = Column(String(100), default="General")
    detected_objects = Column(JSONB, nullable=False)  # Lưu bounding boxes & labels từ YOLO-World
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="captures")
    word_progresses = relationship("UserWordProgress", back_populates="capture")


class Word(Base):
    __tablename__ = "words"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    word = Column(String(150), unique=True, nullable=False, index=True)
    part_of_speech = Column(String(50), nullable=True)
    phonetic_ipa = Column(String(100), nullable=True)
    vietnamese_meaning = Column(Text, nullable=False)
    definition_en = Column(Text, nullable=True)
    cefr_level = Column(String(10), default="A1")
    audio_url = Column(Text, nullable=True)
    example_sentence_en = Column(Text, nullable=True)
    example_sentence_vi = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    word_progresses = relationship("UserWordProgress", back_populates="word")
    deck_associations = relationship("DeckWord", back_populates="word")


class Deck(Base):
    __tablename__ = "decks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default="folder")
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="decks")
    words = relationship("DeckWord", back_populates="deck", cascade="all, delete-orphan")


class DeckWord(Base):
    __tablename__ = "deck_words"

    deck_id = Column(UUID(as_uuid=True), ForeignKey("decks.id", ondelete="CASCADE"), primary_key=True)
    word_id = Column(UUID(as_uuid=True), ForeignKey("words.id", ondelete="CASCADE"), primary_key=True)
    added_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    deck = relationship("Deck", back_populates="words")
    word = relationship("Word", back_populates="deck_associations")


class UserWordProgress(Base):
    """
    TRÁI TIM THUẬT TOÁN SM-2 (SuperMemo-2)
    Lưu trữ chu kỳ lặp lại ngắt quãng cho từng người dùng và từng từ vựng.
    """
    __tablename__ = "user_word_progress"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    word_id = Column(UUID(as_uuid=True), ForeignKey("words.id", ondelete="CASCADE"), nullable=False)
    capture_id = Column(UUID(as_uuid=True), ForeignKey("captures.id", ondelete="SET NULL"), nullable=True)

    status = Column(String(50), default="NEW")  # NEW, LEARNING, REVIEWING, MASTERED

    # Tham số thuật toán SM-2:
    repetition_number = Column(Integer, default=0)    # n
    easiness_factor = Column(Float, default=2.5)       # EF (min 1.3)
    interval_days = Column(Integer, default=0)         # I(n)
    next_review_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_reviewed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("user_id", "word_id", name="uq_user_word"),
        Index("idx_user_next_review", "user_id", "next_review_date"),
    )

    user = relationship("User", back_populates="word_progresses")
    word = relationship("Word", back_populates="word_progresses")
    capture = relationship("Capture", back_populates="word_progresses")
    review_logs = relationship("ReviewLog", back_populates="progress", cascade="all, delete-orphan")


class ReviewLog(Base):
    """
    Nhật ký mỗi lần ôn tập / làm bài tập
    """
    __tablename__ = "review_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    progress_id = Column(UUID(as_uuid=True), ForeignKey("user_word_progress.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    rating_grade = Column(Integer, nullable=False)       # Grade 0 đến 5 (theo chuẩn SM-2)
    review_type = Column(String(50), default="FLASHCARD") # FLASHCARD, QUIZ, PRONUNCIATION
    speech_score = Column(Float, nullable=True)          # Điểm phát âm
    response_time_ms = Column(Integer, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    progress = relationship("UserWordProgress", back_populates="review_logs")
    user = relationship("User", back_populates="review_logs")

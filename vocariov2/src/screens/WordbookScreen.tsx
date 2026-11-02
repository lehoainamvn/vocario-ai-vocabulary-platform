/**
 * WordbookScreen — SMART SM-2 WORDBOOK & FLASHCARD STUDY ROOM
 * Pixel-perfect React Native port of Flutter WordbookScreen (1558 lines)
 * Flutter source: vocario_mobile/lib/screens/wordbook/wordbook_screen.dart
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiClient } from '../api/client';
import { srsService } from '../api/services';
import { SpeechScorerModal } from '../components/SpeechScorerModal';

// ─── Design Tokens (VocarioTokens matching Flutter) ───────────────────────────
const T = {
  canvas: '#F8F6F1',
  surface: '#FFFFFF',
  field: '#FAF8F5',
  border: '#E5DED3',
  brand: '#7D6853',
  brandHover: '#685542',
  ink: '#2D2823',
  muted: '#746B60',
  faint: '#A8A199',
  amber: '#C88332',
  amberBg: '#FEF3C7',
  amberBorder: '#FCD34D',
  goldAccent: '#F7D147',
  emerald: '#10B981',
  emeraldBg: '#F0FDF4',
  emeraldBorder: '#86EFAC',
  rose: '#DC2626',
  roseBg: '#FEF2F2',
  roseBorder: '#FECACA',
};

interface WordItemData {
  id: string;
  word: string;
  ipa: string;
  level: string;
  partOfSpeech: string;
  vietnamese: string;
  exampleEn: string;
  exampleVi: string;
  status: string;
  ef: number;
  intervalDays: number;
  scene: string;
  isDue: boolean;
}

interface DueCardData {
  progressId: string;
  word: string;
  ipa: string;
  level: string;
  partOfSpeech: string;
  vietnamese: string;
  exampleEn: string;
  exampleVi: string;
  status: string;
  ef: number;
  intervalDays: number;
  scene: string;
}

export const WordbookScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // 0 = Sổ từ vựng, 1 = Luyện Flashcard
  const initialTab = route.params?.initialTabIndex ?? 0;
  const [activeViewIndex, setActiveViewIndex] = useState<number>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Tất cả');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Synced Real Data from PostgreSQL
  const [savedWords, setSavedWords] = useState<WordItemData[]>([]);
  const [dueCards, setDueCards] = useState<DueCardData[]>([]);

  // Flashcard State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSessionFinished, setIsSessionFinished] = useState(false);

  // 3D Flip Animation
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Speech Scorer Modal
  const [scorerWord, setScorerWord] = useState<WordItemData | DueCardData | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  // ── Toast Helper ────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
        setToastMessage(null)
      );
    }, 3200);
  };

  // ── Data Fetching ───────────────────────────────────────────────────────────
  const fetchWordbookData = useCallback(async () => {
    try {
      const [myWordsRes, dueCardsRes] = await Promise.allSettled([
        apiClient.get('/api/srs/my-words'),
        apiClient.get('/api/srs/due-cards'),
      ]);

      if (myWordsRes.status === 'fulfilled' && Array.isArray(myWordsRes.value.data)) {
        const raw = myWordsRes.value.data;
        const mapped: WordItemData[] = raw.map((item: any) => {
          const w = item.word || {};
          return {
            id: item.id ? String(item.id) : String(w.id || Math.random()),
            word: w.word || item.wordText || 'Unknown',
            ipa: w.phoneticIpa || w.ipa || '',
            level: w.cefrLevel || 'A2',
            partOfSpeech: w.partOfSpeech || 'Noun',
            vietnamese: w.vietnameseMeaning || item.vietnameseMeaning || '',
            exampleEn: w.exampleSentenceEn || '',
            exampleVi: w.exampleSentenceVi || '',
            status: item.status || 'LEARNING',
            ef: Number(item.easinessFactor || 2.5),
            intervalDays: Number(item.intervalDays || 1),
            scene: item.capture?.sceneTheme || 'Bối cảnh đời thực',
            isDue: false,
          };
        });
        setSavedWords(mapped);
      } else {
        setSavedWords([]);
      }

      if (dueCardsRes.status === 'fulfilled' && Array.isArray(dueCardsRes.value.data)) {
        const raw = dueCardsRes.value.data;
        const mappedDue: DueCardData[] = raw.map((item: any) => {
          const w = item.word || {};
          return {
            progressId: String(item.id || ''),
            word: w.word || item.wordText || 'Unknown',
            ipa: w.phoneticIpa || w.ipa || '',
            level: w.cefrLevel || 'A2',
            partOfSpeech: w.partOfSpeech || 'Noun',
            vietnamese: w.vietnameseMeaning || item.vietnameseMeaning || '',
            exampleEn: w.exampleSentenceEn || '',
            exampleVi: w.exampleSentenceVi || '',
            status: item.status || 'LEARNING',
            ef: Number(item.easinessFactor || 2.5),
            intervalDays: Number(item.intervalDays || 1),
            scene: item.capture?.sceneTheme || 'Bối cảnh đời thực',
          };
        });
        setDueCards(mappedDue);
      } else {
        setDueCards([]);
      }
    } catch (_) {
      setSavedWords([]);
      setDueCards([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWordbookData();
  }, [fetchWordbookData]);

  // ── Audio Speech ────────────────────────────────────────────────────────────
  const playWordAudio = (word: string) => {
    setIsSpeaking(true);
    Speech.speak(word, { language: 'en-US', rate: 0.85 });
    showToast(`Đang phát âm: ${word}`);
    setTimeout(() => setIsSpeaking(false), 900);
  };

  // ── 3D Flip Card Logic ──────────────────────────────────────────────────────
  const toggleCardFlip = () => {
    if (isCardFlipped) {
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 380,
        useNativeDriver: true,
      }).start(() => setIsCardFlipped(false));
    } else {
      Animated.timing(flipAnim, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }).start(() => setIsCardFlipped(true));
    }
  };

  // ── SM-2 Grade Evaluation ───────────────────────────────────────────────────
  const handleGradeSelect = async (grade: number) => {
    if (dueCards.length === 0 || currentCardIndex >= dueCards.length) return;

    const currentCard = dueCards[currentCardIndex];
    const gradeNames: Record<number, string> = {
      1: 'Lại (< 1 ngày)',
      3: 'Khó (3 ngày)',
      4: 'Tốt (7 ngày)',
      5: 'Dễ (14 ngày)',
    };
    showToast(`Đã ghi nhận: ${gradeNames[grade] || 'Đạt'} cho "${currentCard.word}"`);

    // Gửi SM-2 Review
    srsService.submitReview({
      progressId: currentCard.progressId,
      wordText: currentCard.word,
      ratingGrade: grade,
    }).catch(() => {});

    // Flip card về mặt trước trước khi chuyển
    if (isCardFlipped) {
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setIsCardFlipped(false));
    }

    setTimeout(() => {
      if (currentCardIndex + 1 < dueCards.length) {
        setCurrentCardIndex((prev) => prev + 1);
      } else {
        setIsSessionFinished(true);
      }
    }, 280);
  };

  // ── Mark Word Mastered ──────────────────────────────────────────────────────
  const markWordAsMastered = async (progressId: string, word: string) => {
    try {
      await srsService.markWordAsMastered(progressId, word);
      setSavedWords((prev) =>
        prev.map((w) => (w.id === progressId || w.word === word ? { ...w, status: 'MASTERED' } : w))
      );
      setDueCards((prev) => prev.filter((w) => w.progressId !== progressId && w.word !== word));
      showToast(`Đã đánh dấu "${word}" thuộc thành thạo ngay lập tức!`);
    } catch (_) {
      showToast('Không thể cập nhật trạng thái từ vựng.');
    }
  };

  // ── Delete Word ─────────────────────────────────────────────────────────────
  const deleteWord = (progressId: string, word: string) => {
    Alert.alert(
      'Xóa từ vựng?',
      `Bạn có chắc chắn muốn xóa "${word}" khỏi Sổ từ vựng và chu kỳ ôn tập SuperMemo SM-2?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa từ',
          style: 'destructive',
          onPress: async () => {
            try {
              if (progressId && !progressId.startsWith('w-')) {
                await srsService.deleteWord(progressId);
              }
              setSavedWords((prev) => prev.filter((w) => w.id !== progressId && w.word !== word));
              setDueCards((prev) => prev.filter((w) => w.progressId !== progressId && w.word !== word));
              showToast(`Đã xóa "${word}" khỏi Sổ từ vựng SM-2!`);
            } catch (_) {
              showToast('Không thể xóa từ vựng. Vui lòng thử lại!');
            }
          },
        },
      ]
    );
  };

  // ── Filtered Words ──────────────────────────────────────────────────────────
  const filteredWords = savedWords.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    const matchQuery =
      !q ||
      item.word.toLowerCase().includes(q) ||
      item.vietnamese.toLowerCase().includes(q) ||
      item.ipa.toLowerCase().includes(q);

    let matchFilter = true;
    if (['A1', 'A2', 'B1', 'B2', 'C1'].includes(selectedFilter)) {
      matchFilter = item.level === selectedFilter;
    } else if (selectedFilter === 'Đến hạn ôn') {
      matchFilter = item.isDue;
    } else if (selectedFilter === 'Đã thuộc') {
      matchFilter = item.status === 'MASTERED';
    }

    return matchQuery && matchFilter;
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. TOP APP BAR & EDITORIAL SEGMENTED SWITCHER
  // ──────────────────────────────────────────────────────────────────────────
  const renderTopAppBar = () => (
    <View style={styles.topAppBar}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.topMono}>SUPERMEMO SM-2 LEXICON</Text>
          <Text style={styles.appBarTitle}>Sổ từ vựng</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            style={styles.collectionPill}
            onPress={() => navigation.navigate('Collection')}
            activeOpacity={0.75}
          >
            <Ionicons name="images-outline" size={13} color={T.brand} />
            <Text style={styles.collectionText}>Bộ sưu tập</Text>
          </TouchableOpacity>

          <View style={styles.sm2Badge}>
            <Ionicons name="hardware-chip-outline" size={14} color={T.brand} />
            <Text style={styles.sm2Text}>SM-2 Active</Text>
          </View>
        </View>
      </View>

      {/* 3-Tab Segmented Switcher */}
      <View style={styles.segmentedContainer}>
        {/* Tab 0: Sổ từ */}
        <TouchableOpacity
          style={[styles.segmentBtn, activeViewIndex === 0 && styles.segmentBtnActive]}
          onPress={() => setActiveViewIndex(0)}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, activeViewIndex === 0 && styles.segmentTextActive]}>
            Sổ từ ({savedWords.length})
          </Text>
        </TouchableOpacity>

        {/* Tab 1: Flashcard */}
        <TouchableOpacity
          style={[styles.segmentBtn, activeViewIndex === 1 && styles.segmentBtnActive]}
          onPress={() => {
            setActiveViewIndex(1);
            setIsSessionFinished(false);
          }}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.segmentText, activeViewIndex === 1 && styles.segmentTextActive]}>
              Flashcard ({dueCards.length})
            </Text>
            {dueCards.length > 0 && activeViewIndex !== 1 && (
              <View style={styles.dueDot} />
            )}
          </View>
        </TouchableOpacity>

        {/* Tab 2: Bộ sưu tập */}
        <TouchableOpacity
          style={styles.segmentBtn}
          onPress={() => navigation.navigate('Collection')}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="images-outline" size={12} color={T.muted} />
            <Text style={styles.segmentText}>Bộ sưu tập</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: WORDBOOK LEDGER VIEW
  // ──────────────────────────────────────────────────────────────────────────
  const renderWordbookLedgerView = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.ledgerContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchWordbookData();
          }}
          tintColor={T.brand}
          colors={[T.brand]}
        />
      }
    >
      {/* Daily Due Banner */}
      <View style={styles.dueBanner}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.dueNumberBox}>
            <Text style={styles.dueNumberText}>{dueCards.length}</Text>
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.dueBannerTitle}>Từ đến hạn ôn hôm nay</Text>
            <Text style={styles.dueBannerSub}>Thuật toán SuperMemo SM-2</Text>
          </View>
        </View>

        {dueCards.length > 0 ? (
          <TouchableOpacity
            style={styles.dueReviewBtn}
            onPress={() => {
              setActiveViewIndex(1);
              setIsSessionFinished(false);
              setCurrentCardIndex(0);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.dueReviewText}>Ôn ngay</Text>
            <Ionicons name="arrow-forward" size={14} color={T.ink} />
          </TouchableOpacity>
        ) : (
          <View style={styles.dueCompletedBadge}>
            <Text style={styles.dueCompletedText}>Đã hoàn tất</Text>
          </View>
        )}
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={T.muted} style={{ marginLeft: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm từ vựng, phiên âm, nghĩa tiếng Việt..."
          placeholderTextColor={T.faint}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 8 }}>
            <Ionicons name="close-circle" size={16} color={T.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsRow}
      >
        {['Tất cả', 'A1', 'A2', 'B1', 'B2', 'Đến hạn ôn', 'Đã thuộc'].map((filter) => {
          const isSelected = selectedFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => setSelectedFilter(filter)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Word List */}
      {isLoading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={T.brand} />
        </View>
      ) : filteredWords.length === 0 ? (
        <View style={styles.emptyWordbook}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="book-outline" size={22} color={T.muted} />
          </View>
          <Text style={styles.emptyTitle}>Không tìm thấy từ vựng phù hợp</Text>
          <Text style={styles.emptySubtitle}>
            Hãy thử tìm kiếm từ khác hoặc quét thêm ảnh bằng AI Vision.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8, marginTop: 12 }}>
          {filteredWords.map((item) => renderWordLedgerCard(item))}
        </View>
      )}
    </ScrollView>
  );

  const renderWordLedgerCard = (item: WordItemData) => {
    const isMastered = item.status === 'MASTERED';
    const isReviewing = item.status === 'REVIEWING';
    const statusColor = isMastered ? '#047857' : isReviewing ? T.amber : T.muted;
    const statusText = isMastered ? 'Đã thuộc' : isReviewing ? 'Đang ôn giãn cách' : 'Đang học';

    return (
      <View key={item.id} style={styles.wordCard}>
        {/* Top Sub-row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'wrap', gap: 6 }}>
            <View style={styles.levelTag}>
              <Text style={styles.levelTagText}>{item.level} · {item.partOfSpeech}</Text>
            </View>
            <View style={[styles.statusTag, { backgroundColor: `${statusColor}1A` }]}>
              <Text style={[styles.statusTagText, { color: statusColor }]}>
                {statusText} · +{item.intervalDays} ngày · EF {item.ef.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Action icon buttons */}
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {/* Audio */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => playWordAudio(item.word)}
              activeOpacity={0.7}
            >
              <Ionicons name="volume-medium-outline" size={15} color={T.brand} />
            </TouchableOpacity>

            {/* Mic */}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setScorerWord(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="mic-outline" size={15} color={T.brand} />
            </TouchableOpacity>

            {/* Mark Mastered */}
            {!isMastered && (
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: T.emeraldBg, borderColor: T.emeraldBorder }]}
                onPress={() => markWordAsMastered(item.id, item.word)}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-circle-outline" size={15} color="#16A34A" />
              </TouchableOpacity>
            )}

            {/* Delete */}
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: T.roseBg, borderColor: T.roseBorder }]}
              onPress={() => deleteWord(item.id, item.word)}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={15} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Word + IPA */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6, gap: 8 }}>
          <Text style={styles.wordTitle}>{item.word}</Text>
          <Text style={styles.wordIpa}>{item.ipa}</Text>
        </View>

        {/* Meaning */}
        <Text style={styles.wordMeaning}>{item.vietnamese}</Text>

        {/* Scene tag */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 4 }}>
          <Ionicons name="camera-outline" size={11} color={T.muted} />
          <Text style={styles.sceneText}>{item.scene}</Text>
        </View>
      </View>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: FLASHCARD STUDY ROOM VIEW (3D FLIP SM-2)
  // ──────────────────────────────────────────────────────────────────────────
  const renderFlashcardStudyRoomView = () => {
    if (isSessionFinished || dueCards.length === 0) {
      return renderSessionCompletedScreen();
    }

    const currentCard = dueCards[currentCardIndex];
    const progress = (currentCardIndex + 1) / dueCards.length;

    // Interpolate 3D rotation
    const frontRotate = flipAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });
    const backRotate = flipAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['180deg', '360deg'],
    });

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.studyRoomContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Session Progress Header */}
        <View style={styles.sessionHeaderRow}>
          <Text style={styles.sessionCountText}>
            Thẻ {currentCardIndex + 1} / {dueCards.length}
          </Text>
          <View style={styles.sessionSceneTag}>
            <Text style={styles.sessionSceneText}>{currentCard.scene}</Text>
          </View>
        </View>

        {/* Micro Progress Bar */}
        <View style={styles.microProgressTrack}>
          <View style={[styles.microProgressFill, { width: `${Math.min(progress * 100, 100)}%` as any }]} />
        </View>

        {/* 3D Flip Flashcard */}
        <TouchableOpacity
          style={styles.flashcardWrapper}
          onPress={toggleCardFlip}
          activeOpacity={0.95}
        >
          {/* Card Front */}
          <Animated.View
            style={[
              styles.flashcardFace,
              {
                transform: [{ perspective: 1000 }, { rotateY: frontRotate }],
                backfaceVisibility: 'hidden',
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTag}>
                <Text style={styles.cardTagText}>
                  {currentCard.level} · {currentCard.partOfSpeech}
                </Text>
              </View>
              <Ionicons name="refresh" size={16} color={T.muted} />
            </View>

            {/* Word & Controls */}
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.cardFrontWord}>{currentCard.word}</Text>
              <View style={styles.cardAudioMicRow}>
                {/* Audio */}
                <TouchableOpacity
                  style={styles.cardCircleBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    playWordAudio(currentCard.word);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="volume-medium"
                    size={20}
                    color={isSpeaking ? T.amber : T.brand}
                  />
                </TouchableOpacity>

                {/* Mic Speech Scorer */}
                <TouchableOpacity
                  style={[styles.cardCircleBtn, { backgroundColor: T.brand, borderColor: T.brand }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    setScorerWord(currentCard);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mic" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.cardFlipHint}>
              Chạm để lật mặt sau xem nghĩa &amp; câu ví dụ ↺
            </Text>
          </Animated.View>

          {/* Card Back */}
          <Animated.View
            style={[
              styles.flashcardFace,
              styles.flashcardFaceBack,
              {
                transform: [{ perspective: 1000 }, { rotateY: backRotate }],
                backfaceVisibility: 'hidden',
              },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardBackWord}>{currentCard.word}</Text>
              <Text style={styles.cardBackIpa}>{currentCard.ipa}</Text>
            </View>

            {/* Vietnamese Meaning Box */}
            <View style={styles.meaningBox}>
              <Text style={styles.meaningBoxText}>{currentCard.vietnamese}</Text>
            </View>

            {/* Contextual Example Box */}
            <View style={styles.exampleBox}>
              <Text style={styles.exampleEnText}>“{currentCard.exampleEn || 'Example sentence'}”</Text>
              <Text style={styles.exampleViText}>{currentCard.exampleVi || 'Dịch nghĩa ví dụ'}</Text>
            </View>

            {/* Live Algorithm Explainer Pill */}
            <View style={styles.algorithmPill}>
              <Text style={styles.algoText}>Hệ số: EF {currentCard.ef.toFixed(2)}</Text>
              <Text style={styles.algoText}>Chu kỳ kế tiếp: +{currentCard.intervalDays} ngày</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>

        {/* 4 SM-2 Grade Buttons */}
        <View style={styles.gradeMatrixWrapper}>
          <Text style={styles.gradeMatrixHeader}>MỨC ĐỘ GHI NHỚ THEO THUẬT TOÁN SM-2:</Text>
          <View style={styles.gradesRow}>
            {/* Lại (Grade 1) */}
            <TouchableOpacity
              style={[styles.gradeBtn, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}
              onPress={() => handleGradeSelect(1)}
              activeOpacity={0.8}
            >
              <Text style={[styles.gradeLabel, { color: '#9F1239' }]}>Lại</Text>
              <Text style={[styles.gradeSub, { color: '#9F1239CC' }]}>&lt; 1 ngày</Text>
            </TouchableOpacity>

            {/* Khó (Grade 3) */}
            <TouchableOpacity
              style={[styles.gradeBtn, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}
              onPress={() => handleGradeSelect(3)}
              activeOpacity={0.8}
            >
              <Text style={[styles.gradeLabel, { color: '#92400E' }]}>Khó</Text>
              <Text style={[styles.gradeSub, { color: '#92400ECC' }]}>3 ngày</Text>
            </TouchableOpacity>

            {/* Tốt (Grade 4) */}
            <TouchableOpacity
              style={[styles.gradeBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
              onPress={() => handleGradeSelect(4)}
              activeOpacity={0.8}
            >
              <Text style={[styles.gradeLabel, { color: '#065F46' }]}>Tốt</Text>
              <Text style={[styles.gradeSub, { color: '#065F46CC' }]}>7 ngày</Text>
            </TouchableOpacity>

            {/* Dễ (Grade 5) */}
            <TouchableOpacity
              style={[styles.gradeBtn, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}
              onPress={() => handleGradeSelect(5)}
              activeOpacity={0.8}
            >
              <Text style={[styles.gradeLabel, { color: '#0369A1' }]}>Dễ</Text>
              <Text style={[styles.gradeSub, { color: '#0369A1CC' }]}>14 ngày</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderSessionCompletedScreen = () => (
    <View style={styles.completedContainer}>
      <View style={styles.completedTrophyCircle}>
        <Ionicons name="trophy" size={28} color={T.brand} />
      </View>
      <Text style={styles.completedTitle}>Xuất sắc! Đã hoàn thành</Text>
      <Text style={styles.completedSubtitle}>
        Bạn đã hoàn thành phiên ôn tập thẻ hôm nay theo thuật toán SuperMemo SM-2. Chuỗi streak đã được cập nhật!
      </Text>
      <TouchableOpacity
        style={styles.completedReturnBtn}
        onPress={() => {
          setActiveViewIndex(0);
          fetchWordbookData();
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.completedReturnText}>Quay lại sổ từ vựng</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {renderTopAppBar()}

      {activeViewIndex === 0 ? renderWordbookLedgerView() : renderFlashcardStudyRoomView()}

      {/* Floating Toast */}
      {toastMessage && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
          <View style={styles.toastCircle}>
            <Ionicons name="checkmark" size={13} color={T.brand} />
          </View>
          <Text style={styles.toastText}>{toastMessage}</Text>
          <TouchableOpacity onPress={() => setToastMessage(null)}>
            <Ionicons name="close" size={15} color={T.muted} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Speech Scorer Modal */}
      {scorerWord && (
        <SpeechScorerModal
          visible={!!scorerWord}
          word={scorerWord.word}
          ipa={scorerWord.ipa}
          vietnamese={scorerWord.vietnamese}
          progressId={'progressId' in scorerWord ? scorerWord.progressId : scorerWord.id}
          onClose={() => setScorerWord(null)}
          onSuccess={() => fetchWordbookData()}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },

  // ── Top App Bar ────────────────────────────────────────────────────────────
  topAppBar: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: T.canvas,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topMono: {
    fontSize: 7.5,
    fontFamily: 'monospace',
    color: T.brand,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  appBarTitle: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 1,
  },
  collectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: T.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    gap: 4,
  },
  collectionText: { fontSize: 10, fontWeight: 'bold', color: T.brand },
  sm2Badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: T.field,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    gap: 4,
  },
  sm2Text: { fontSize: 9, fontFamily: 'monospace', color: T.brand },

  // ── 3-Tab Segmented Switcher ───────────────────────────────────────────────
  segmentedContainer: {
    flexDirection: 'row',
    height: 40,
    padding: 2.5,
    backgroundColor: T.field,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    marginTop: 12,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  segmentBtnActive: {
    backgroundColor: T.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: { fontSize: 11.5, fontWeight: '500', color: T.muted },
  segmentTextActive: { fontWeight: '600', color: T.ink },
  dueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.amber,
    marginLeft: 5,
  },

  // ── Wordbook Ledger View ───────────────────────────────────────────────────
  ledgerContent: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 4,
    paddingBottom: 90,
  },
  dueBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.brand,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#6E5A47',
  },
  dueNumberBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: T.brandHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueNumberText: { fontSize: 20, fontFamily: 'serif', fontWeight: 'bold', color: T.goldAccent },
  dueBannerTitle: { fontSize: 12.5, fontWeight: 'bold', color: '#FFFFFF' },
  dueBannerSub: { fontSize: 8.5, fontFamily: 'monospace', color: 'rgba(255,255,255,0.75)' },
  dueReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.goldAccent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  dueReviewText: { fontSize: 11.5, fontWeight: 'bold', color: T.ink },
  dueCompletedBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dueCompletedText: { fontSize: 11, fontWeight: 'bold', color: '#FFFFFF' },

  // ── Search & Filter ────────────────────────────────────────────────────────
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    backgroundColor: T.field,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: T.ink,
    paddingHorizontal: 10,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  filterChip: {
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: T.brand,
    borderColor: T.brand,
  },
  filterChipText: { fontSize: 11, fontWeight: '500', color: T.ink },
  filterChipTextActive: { fontWeight: 'bold', color: '#FFFFFF' },

  // ── Word Card ──────────────────────────────────────────────────────────────
  wordCard: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
  },
  levelTag: {
    backgroundColor: T.field,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  levelTagText: { fontSize: 8.5, fontFamily: 'monospace', color: T.brand },
  statusTag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusTagText: { fontSize: 8.5, fontFamily: 'monospace' },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordTitle: { fontSize: 16.5, fontFamily: 'serif', fontWeight: 'bold', color: T.ink },
  wordIpa: { fontSize: 10.5, fontFamily: 'monospace', color: T.muted },
  wordMeaning: { fontSize: 12, fontWeight: '600', color: T.brand, marginTop: 3 },
  sceneText: { fontSize: 9.5, color: T.muted },

  // ── Empty State ────────────────────────────────────────────────────────────
  emptyWordbook: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontFamily: 'serif', fontWeight: 'bold', color: T.ink },
  emptySubtitle: { fontSize: 11.5, color: T.muted, marginTop: 4, textAlign: 'center' },

  // ── Study Room View ────────────────────────────────────────────────────────
  studyRoomContent: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    paddingBottom: 40,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionCountText: { fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold', color: T.muted },
  sessionSceneTag: {
    backgroundColor: T.field,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sessionSceneText: { fontSize: 10, fontWeight: '500', color: T.brand },
  microProgressTrack: {
    height: 3,
    backgroundColor: '#E5DFD4',
    borderRadius: 999,
    marginTop: 6,
    overflow: 'hidden',
  },
  microProgressFill: {
    height: 3,
    backgroundColor: T.brand,
    borderRadius: 999,
  },

  // ── 3D Flashcard ───────────────────────────────────────────────────────────
  flashcardWrapper: {
    width: '100%',
    height: 370,
    marginTop: 16,
    position: 'relative',
  },
  flashcardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: T.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: T.border,
    padding: 22,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  flashcardFaceBack: {
    padding: 20,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTag: {
    backgroundColor: T.field,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardTagText: { fontSize: 9.5, fontFamily: 'monospace', color: T.brand },
  cardFrontWord: {
    fontSize: 28,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  cardAudioMicRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 14,
  },
  cardCircleBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFlipHint: {
    fontSize: 11,
    color: T.muted,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // ── Flashcard Back ─────────────────────────────────────────────────────────
  cardBackWord: { fontSize: 19, fontFamily: 'serif', fontWeight: 'bold', color: T.ink },
  cardBackIpa: { fontSize: 11, fontFamily: 'monospace', color: T.muted },
  meaningBox: {
    backgroundColor: T.field,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  meaningBoxText: { fontSize: 14, fontWeight: 'bold', color: T.brand },
  exampleBox: {
    backgroundColor: T.field,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    padding: 11,
  },
  exampleEnText: { fontSize: 12, fontStyle: 'italic', color: T.ink, lineHeight: 17 },
  exampleViText: { fontSize: 10.5, color: T.muted, marginTop: 4 },
  algorithmPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: `${T.brand}14`,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  algoText: { fontSize: 9, fontFamily: 'monospace', color: T.brand },

  // ── SM-2 Grade Matrix ──────────────────────────────────────────────────────
  gradeMatrixWrapper: {
    marginTop: 18,
    alignItems: 'center',
  },
  gradeMatrixHeader: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.muted,
    letterSpacing: 0.8,
  },
  gradesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    width: '100%',
  },
  gradeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  gradeLabel: { fontSize: 12, fontWeight: 'bold' },
  gradeSub: { fontSize: 9, fontWeight: '500', marginTop: 2 },

  // ── Session Completed Screen ───────────────────────────────────────────────
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  completedTrophyCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: `${T.brand}1F`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  completedTitle: { fontSize: 22, fontFamily: 'serif', fontWeight: 'bold', color: T.ink },
  completedSubtitle: {
    fontSize: 12,
    color: T.muted,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
  completedReturnBtn: {
    backgroundColor: T.brand,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 20,
  },
  completedReturnText: { fontSize: 13, fontWeight: 'bold', color: '#FFFFFF' },

  // ── Toast ──────────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute',
    top: 12,
    left: 18,
    right: 18,
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
    gap: 9,
  },
  toastCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${T.brand}1F`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: { flex: 1, fontSize: 10.5, color: T.ink, lineHeight: 14 },
});

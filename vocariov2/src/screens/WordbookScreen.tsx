/**
 * WordbookScreen — CANONICAL TOPIC INDEX & FOCUSED STUDY STUDIO
 * Two-Tier Lexicon matching Vocario Canonical Design (Angular & Mobile Figma)
 * Tier 1 (TOPICS_LIST): Topic Index with cards, search, filters & direct action buttons
 * Tier 2 (TOPIC_STUDY): Focused Study Studio with Flashcard, Writing & AI Quiz modes
 */
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiClient } from '../api/client';
import { srsService, nlpService } from '../api/services';
import { SpeechScorerModal } from '../components/SpeechScorerModal';

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const T = {
  canvas: '#F8F6F1',
  surface: '#FFFFFF',
  field: '#FAF8F5',
  border: '#E5DED3',
  borderLight: '#F1ECE3',
  brand: '#7D6853',
  brandHover: '#685542',
  brandDark: '#5A4A3A',
  ink: '#29251F',
  muted: '#746B60',
  faint: '#A8A199',
  amber: '#C88332',
  amberBg: '#FEF3C7',
  amberBorder: '#FCD34D',
  goldAccent: '#F7D147',
  emerald: '#287A59',
  emeraldBg: '#F0FDF4',
  emeraldBorder: '#86EFAC',
  rose: '#DC2626',
  roseBg: '#FEF2F2',
  roseBorder: '#FECACA',
  sky: '#0284C7',
  skyBg: '#F0F9FF',
  skyBorder: '#BAE6FD',
};

// ─── Data Types ────────────────────────────────────────────────────────────────
export interface WordItemData {
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

export interface TopicItem {
  id: string;
  name: string;
  totalWords: number;
  dueWords: number;
  learningWords: number;
  masteredWords: number;
  sampleWords: string[];
  words: WordItemData[];
}

export interface QuizQuestionData {
  targetWord: string;
  questionEn: string;
  questionVi: string;
  options: string[];
  correctAnswer: string;
  explanationVi: string;
}

export const WordbookScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width } = useWindowDimensions();
  const isTabletOrDesktop = width > 768;

  // ── Navigation & View State ──────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<'TOPICS_LIST' | 'TOPIC_STUDY'>('TOPICS_LIST');
  const [studySubMode, setStudySubMode] = useState<'FLASHCARD' | 'WRITING' | 'AI_QUIZ'>('FLASHCARD');
  const [selectedTopic, setSelectedTopic] = useState<TopicItem | null>(null);

  // ── Data & Loading ───────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedWords, setSavedWords] = useState<WordItemData[]>([]);

  // ── Tier 1: Topic Index Filters & Search ──────────────────────────────────────
  const [topicSearchKeyword, setTopicSearchKeyword] = useState('');
  const [topicFilterStatus, setTopicFilterStatus] = useState<'ALL' | 'DUE' | 'MASTERED'>('ALL');

  // ── Tier 2: Study Studio Shared State ─────────────────────────────────────────
  const [activeWordIndex, setActiveWordIndex] = useState(0);

  // Mode 1: Flashcard 3D Flip
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [isSessionFinished, setIsSessionFinished] = useState(false);

  // Mode 2: Writing & Spelling Studio
  const [writingInput, setWritingInput] = useState('');
  const [writingStatus, setWritingStatus] = useState<'IDLE' | 'CORRECT' | 'WRONG' | 'REVEALED'>('IDLE');
  const [writingHintCount, setWritingHintCount] = useState(0);
  const [writingStreak, setWritingStreak] = useState(0);
  const writingStartTime = useRef<number>(Date.now());

  // Mode 3: AI Quiz Studio
  const [quizList, setQuizList] = useState<QuizQuestionData[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isOptionSubmitted, setIsOptionSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  // Speech Scorer Modal
  const [scorerWord, setScorerWord] = useState<WordItemData | null>(null);

  // Floating Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
        setToastMessage(null)
      );
    }, 2800);
  };

  // ── 1. Fetch Real SRS Lexicon Data ───────────────────────────────────────────
  const fetchWordbookData = useCallback(async () => {
    try {
      const [myWordsRes, dueCardsRes] = await Promise.allSettled([
        apiClient.get('/api/srs/my-words'),
        apiClient.get('/api/srs/due-cards'),
      ]);

      const dueIds = new Set<string>();
      if (dueCardsRes.status === 'fulfilled' && Array.isArray(dueCardsRes.value.data)) {
        dueCardsRes.value.data.forEach((d: any) => {
          if (d.id) dueIds.add(String(d.id));
          if (d.word?.id) dueIds.add(String(d.word.id));
          if (d.wordText) dueIds.add(String(d.wordText).toLowerCase());
        });
      }

      if (myWordsRes.status === 'fulfilled' && Array.isArray(myWordsRes.value.data)) {
        const raw = myWordsRes.value.data;
        const mapped: WordItemData[] = raw.map((item: any) => {
          const w = item.word || {};
          const wordText = w.word || item.wordText || 'Unknown';
          const itemId = item.id ? String(item.id) : String(w.id || Math.random());
          const isDue = dueIds.has(itemId) || dueIds.has(wordText.toLowerCase()) || Boolean(item.isDue);
          return {
            id: itemId,
            word: wordText,
            ipa: w.phoneticIpa || w.ipa || '',
            level: w.cefrLevel || 'A2',
            partOfSpeech: w.partOfSpeech || 'Noun',
            vietnamese: w.vietnameseMeaning || item.vietnameseMeaning || '',
            exampleEn: w.exampleSentenceEn || `The ${wordText} is placed in the scene.`,
            exampleVi: w.exampleSentenceVi || `Từ ${wordText} xuất hiện trong không gian đời sống.`,
            status: item.status || 'LEARNING',
            ef: Number(item.easinessFactor || 2.5),
            intervalDays: Number(item.intervalDays || 1),
            scene: item.capture?.sceneTheme || item.sceneName || 'Bối cảnh đời sống',
            isDue,
          };
        });
        setSavedWords(mapped);
      } else {
        setSavedWords([]);
      }
    } catch (_) {
      setSavedWords([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWordbookData();
  }, [fetchWordbookData]);

  // ── 2. Derive Topics List From Saved Words ──────────────────────────────────
  const topicsList: TopicItem[] = useMemo(() => {
    if (savedWords.length === 0) return [];

    const map = new Map<string, WordItemData[]>();
    for (const w of savedWords) {
      const topicName = (w.scene && w.scene.trim()) ? w.scene.trim() : 'Bối cảnh đời sống';
      if (!map.has(topicName)) {
        map.set(topicName, []);
      }
      map.get(topicName)!.push(w);
    }

    const list: TopicItem[] = [];

    // Deck 01: Toàn bộ kho từ vựng (All Deck)
    list.push({
      id: 'all',
      name: 'Toàn bộ kho từ vựng',
      totalWords: savedWords.length,
      dueWords: savedWords.filter((w) => w.isDue).length,
      learningWords: savedWords.filter((w) => !w.isDue && w.status !== 'MASTERED').length,
      masteredWords: savedWords.filter((w) => w.status === 'MASTERED').length,
      sampleWords: savedWords.slice(0, 5).map((w) => w.word),
      words: savedWords,
    });

    // Decks 02..N: Phân nhóm theo bối cảnh thực tế
    const entries = Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
    for (const [name, topicWords] of entries) {
      list.push({
        id: name,
        name,
        totalWords: topicWords.length,
        dueWords: topicWords.filter((w) => w.isDue).length,
        learningWords: topicWords.filter((w) => !w.isDue && w.status !== 'MASTERED').length,
        masteredWords: topicWords.filter((w) => w.status === 'MASTERED').length,
        sampleWords: topicWords.slice(0, 5).map((w) => w.word),
        words: topicWords,
      });
    }

    return list;
  }, [savedWords]);

  // ── 3. Filtered Topics ───────────────────────────────────────────────────────
  const filteredTopicsList = useMemo(() => {
    let list = topicsList;

    if (topicFilterStatus === 'DUE') {
      list = list.filter((t) => t.dueWords > 0);
    } else if (topicFilterStatus === 'MASTERED') {
      list = list.filter((t) => t.totalWords > 0 && t.masteredWords === t.totalWords);
    }

    const kw = topicSearchKeyword.trim().toLowerCase();
    if (kw) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(kw) ||
          t.sampleWords.some((w) => w.toLowerCase().includes(kw))
      );
    }

    return list;
  }, [topicsList, topicFilterStatus, topicSearchKeyword]);

  // Words currently being studied in selectedTopic
  const currentTopicWords: WordItemData[] = useMemo(() => {
    if (!selectedTopic) return [];
    if (selectedTopic.id === 'all') return savedWords;
    return savedWords.filter(
      (w) => ((w.scene && w.scene.trim()) || 'Bối cảnh đời sống') === selectedTopic.name
    );
  }, [selectedTopic, savedWords]);

  const activeWord: WordItemData | null = useMemo(() => {
    if (currentTopicWords.length === 0) return null;
    const idx = Math.min(Math.max(0, activeWordIndex), currentTopicWords.length - 1);
    return currentTopicWords[idx] || null;
  }, [currentTopicWords, activeWordIndex]);

  // ── 4. Open Topic In Study Mode ──────────────────────────────────────────────
  const openTopicStudy = (
    topic: TopicItem,
    mode: 'FLASHCARD' | 'WRITING' | 'AI_QUIZ' = 'FLASHCARD'
  ) => {
    setSelectedTopic(topic);
    setCurrentView('TOPIC_STUDY');
    setStudySubMode(mode);
    setActiveWordIndex(0);
    setIsCardFlipped(false);
    flipAnim.setValue(0);
    setIsSessionFinished(false);

    if (mode === 'WRITING') {
      resetWritingState();
    } else if (mode === 'AI_QUIZ') {
      initiateAiQuiz(topic.words);
    }
  };

  const backToTopicsList = () => {
    setCurrentView('TOPICS_LIST');
    setSelectedTopic(null);
    setIsSessionFinished(false);
  };

  // ── 5. Audio Speech ──────────────────────────────────────────────────────────
  const playWordAudio = (word: string) => {
    try {
      try {
        Speech.stop();
      } catch (_) {}
      Speech.speak(word, { language: 'en-US', rate: 0.85 });
      showToast(`Đang phát âm: ${word}`);
    } catch (e) {
      console.warn('Speech error:', e);
    }
  };

  // ── 6. Mode 1: 3D Flip Card & SM-2 Rating ────────────────────────────────────
  const toggleCardFlip = () => {
    if (isCardFlipped) {
      Animated.timing(flipAnim, { toValue: 0, duration: 320, useNativeDriver: true }).start(() =>
        setIsCardFlipped(false)
      );
    } else {
      Animated.timing(flipAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start(() =>
        setIsCardFlipped(true)
      );
    }
  };

  const handleGradeSelect = async (grade: number) => {
    if (!activeWord) return;

    const gradeNames: Record<number, string> = {
      1: 'Lại (< 1 ngày)',
      3: 'Khó (3 ngày)',
      4: 'Tốt (7 ngày)',
      5: 'Dễ (14 ngày)',
    };
    showToast(`Đã ghi nhận: ${gradeNames[grade] || 'Đạt'} cho "${activeWord.word}"`);

    srsService
      .submitReview({
        progressId: activeWord.id,
        wordText: activeWord.word,
        ratingGrade: grade,
      })
      .catch(() => {});

    if (isCardFlipped) {
      Animated.timing(flipAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
        setIsCardFlipped(false)
      );
    }

    setTimeout(() => {
      if (activeWordIndex + 1 < currentTopicWords.length) {
        setActiveWordIndex((prev) => prev + 1);
      } else {
        setIsSessionFinished(true);
      }
    }, 240);
  };

  const markWordAsMastered = async (progressId: string, word: string) => {
    try {
      await srsService.markWordAsMastered(progressId, word);
      setSavedWords((prev) =>
        prev.map((w) => (w.id === progressId || w.word === word ? { ...w, status: 'MASTERED' } : w))
      );
      showToast(`Đã đánh dấu "${word}" thuộc thành thạo!`);
    } catch (_) {
      showToast('Không thể cập nhật trạng thái từ vựng.');
    }
  };

  const deleteTopic = (topic: TopicItem) => {
    Alert.alert(
      'Xóa chủ đề?',
      `Bạn có chắc chắn muốn xóa toàn bộ ${topic.totalWords} từ vựng thuộc chủ đề "${topic.name}" khỏi Sổ từ vựng?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa chủ đề',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const w of topic.words) {
                if (w.id && !w.id.startsWith('w-')) {
                  srsService.deleteWord(w.id).catch(() => {});
                }
              }
              setSavedWords((prev) => prev.filter((w) => !topic.words.some((tw) => tw.id === w.id)));
              showToast(`Đã xóa chủ đề "${topic.name}" thành công!`);
            } catch (_) {
              showToast('Lỗi khi xóa chủ đề.');
            }
          },
        },
      ]
    );
  };

  // ── 7. Mode 2: Writing & Spelling Logic ───────────────────────────────────────
  const resetWritingState = () => {
    setWritingInput('');
    setWritingStatus('IDLE');
    setWritingHintCount(0);
    writingStartTime.current = Date.now();
  };

  const checkWritingAnswer = () => {
    if (!activeWord) return;
    const target = activeWord.word.trim().toLowerCase();
    const input = writingInput.trim().toLowerCase();
    if (!input) return;

    if (input === target) {
      setWritingStatus('CORRECT');
      setWritingStreak((s) => s + 1);
      const rating = writingHintCount === 0 ? 5 : 4;
      srsService.submitReview({
        progressId: activeWord.id,
        wordText: activeWord.word,
        ratingGrade: rating,
      }).catch(() => {});
      playWordAudio(activeWord.word);
    } else {
      setWritingStatus('WRONG');
      setWritingStreak(0);
    }
  };

  const giveWritingHint = () => {
    if (!activeWord) return;
    const target = activeWord.word;
    if (writingHintCount < target.length) {
      const nextCount = writingHintCount + 1;
      setWritingHintCount(nextCount);
      setWritingInput(target.slice(0, nextCount));
    }
  };

  const revealWritingAnswer = () => {
    if (!activeWord) return;
    setWritingStatus('REVEALED');
    setWritingInput(activeWord.word);
    srsService.submitReview({
      progressId: activeWord.id,
      wordText: activeWord.word,
      ratingGrade: 1,
    }).catch(() => {});
    playWordAudio(activeWord.word);
  };

  const nextWritingWord = () => {
    resetWritingState();
    if (activeWordIndex + 1 < currentTopicWords.length) {
      setActiveWordIndex((prev) => prev + 1);
    } else {
      setIsSessionFinished(true);
    }
  };

  const getMaskedExample = (word: WordItemData | null): string => {
    if (!word || !word.exampleEn) return 'I see the ______ in this room.';
    const escaped = word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    return word.exampleEn.replace(regex, '______');
  };

  // ── 8. Mode 3: AI Quiz Logic ─────────────────────────────────────────────────
  const initiateAiQuiz = async (words: WordItemData[]) => {
    if (words.length === 0) return;
    setIsGeneratingQuiz(true);
    setIsQuizCompleted(false);
    setCurrentQuizIndex(0);
    setSelectedOption(null);
    setIsOptionSubmitted(false);

    try {
      // 1. Thử gọi backend AI quiz generator
      const quizTheme = selectedTopic?.name || 'Bối cảnh đời thực';
      const payload = words.slice(0, 10).map((w) => ({
        word: w.word,
        vietnamese: w.vietnamese,
        level: w.level || 'A2',
      }));

      const res = await nlpService.generateAiQuiz(payload, quizTheme, 'A2', Math.min(words.length, 5)).catch(() => null);

      if (res && res.success && Array.isArray(res.questions) && res.questions.length > 0) {
        setQuizList(res.questions);
        setQuizScore({ correct: 0, total: res.questions.length });
        setIsGeneratingQuiz(false);
        return;
      }
    } catch (_) {}

    // 2. Fallback thông minh: Tạo bộ câu hỏi trắc nghiệm tự động từ vốn từ thật của topic
    const generated: QuizQuestionData[] = words.slice(0, 5).map((w, idx) => {
      // Lấy 3 từ gây nhiễu (distractors)
      const otherWords = savedWords.filter((sw) => sw.word.toLowerCase() !== w.word.toLowerCase());
      const shuffledOthers = [...otherWords].sort(() => 0.5 - Math.random()).slice(0, 3);
      const distractors = shuffledOthers.map((sw) => sw.word);
      while (distractors.length < 3) {
        distractors.push(['object', 'concept', 'furniture', 'device', 'material'][distractors.length]);
      }

      const allChoices = [w.word, ...distractors].sort(() => 0.5 - Math.random());
      const letters = ['A', 'B', 'C', 'D'];
      const formattedOptions = allChoices.map((c, i) => `${letters[i]}. ${c}`);
      const correctIdx = allChoices.indexOf(w.word);
      const correctLetter = letters[correctIdx];

      return {
        targetWord: w.word,
        questionEn: `What is the correct English word for "${w.vietnamese}"?`,
        questionVi: `Từ này thuộc bối cảnh "${w.scene}". Ví dụ: ${w.exampleEn}`,
        options: formattedOptions,
        correctAnswer: correctLetter,
        explanationVi: `"${w.word}" (${w.ipa}) có nghĩa là "${w.vietnamese}". Ví dụ: ${w.exampleEn}`,
      };
    });

    setQuizList(generated);
    setQuizScore({ correct: 0, total: generated.length });
    setIsGeneratingQuiz(false);
  };

  const handleSelectQuizOption = (optionStr: string) => {
    if (isOptionSubmitted) return;
    const letter = optionStr.trim().slice(0, 1).toUpperCase();
    setSelectedOption(letter);
  };

  const submitQuizAnswer = () => {
    if (!selectedOption || isOptionSubmitted || quizList.length === 0) return;
    const currentQ = quizList[currentQuizIndex];
    if (!currentQ) return;

    const isCorrect = selectedOption === currentQ.correctAnswer;
    setIsOptionSubmitted(true);

    if (isCorrect) {
      setQuizScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
    }

    const matchedWord = savedWords.find((w) => w.word.toLowerCase() === currentQ.targetWord.toLowerCase());
    if (matchedWord) {
      srsService.submitReview({
        progressId: matchedWord.id,
        wordText: matchedWord.word,
        ratingGrade: isCorrect ? 4 : 2,
      }).catch(() => {});
    }
  };

  const nextQuizQuestion = () => {
    if (currentQuizIndex + 1 < quizList.length) {
      setCurrentQuizIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsOptionSubmitted(false);
    } else {
      setIsQuizCompleted(true);
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: TIER 1 — TOPIC INDEX VIEW (Chủ đề từ vựng)
  // ────────────────────────────────────────────────────────────────────────────
  const renderTopicIndexView = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.topicIndexContent}
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
      {/* 1. Header: TOPIC INDEX · Chủ đề từ vựng */}
      <View style={styles.topicHeaderSection}>
        <View style={styles.topicHeaderTopRow}>
          <View>
            <Text style={styles.topicIndexSub}>TOPIC INDEX</Text>
            <Text style={styles.topicIndexTitle}>Chủ đề từ vựng</Text>
          </View>
          <Text style={styles.topicIndexStats}>
            {filteredTopicsList.length} chủ đề · {savedWords.length} từ đang học
          </Text>
        </View>

        {/* 2. Search & Filter Bar */}
        <View style={styles.searchFilterRow}>
          {/* Search Box */}
          <View style={styles.searchBox}>
            <Ionicons name="search" size={17} color={T.muted} style={{ marginLeft: 12 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm chủ đề, đồ vật, từ vựng..."
              placeholderTextColor={T.faint}
              value={topicSearchKeyword}
              onChangeText={setTopicSearchKeyword}
            />
            {topicSearchKeyword.length > 0 && (
              <TouchableOpacity onPress={() => setTopicSearchKeyword('')} style={{ padding: 8 }}>
                <Ionicons name="close-circle" size={16} color={T.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterTabsRow}>
            {(['ALL', 'DUE', 'MASTERED'] as const).map((status) => {
              const labels = { ALL: 'Tất cả', DUE: 'Cần ôn', MASTERED: 'Đã thành thạo' };
              const isActive = topicFilterStatus === status;
              return (
                <TouchableOpacity
                  key={status}
                  style={[styles.filterTabBtn, isActive && styles.filterTabBtnActive]}
                  onPress={() => setTopicFilterStatus(status)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                    {labels[status]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* 3. Responsive Grid of Topic Cards */}
      {isLoading ? (
        <View style={{ paddingVertical: 60, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={T.brand} />
          <Text style={{ marginTop: 12, fontSize: 12, color: T.muted }}>Đang đồng bộ chủ đề từ vựng...</Text>
        </View>
      ) : filteredTopicsList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="library-outline" size={26} color={T.brand} />
          </View>
          <Text style={styles.emptyTitle}>Chưa có chủ đề từ vựng nào</Text>
          <Text style={styles.emptySubtitle}>
            Hãy sử dụng tính năng "Thu nạp AI" chụp ảnh đồ vật để tự động bóc tách từ vựng vào các chủ đề theo bối cảnh thực tế.
          </Text>
          <TouchableOpacity
            style={styles.emptyActionBtn}
            onPress={() => navigation.navigate('Scanner')}
            activeOpacity={0.85}
          >
            <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
            <Text style={styles.emptyActionText}>Chụp ảnh thu nạp từ mới</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.topicGrid, isTabletOrDesktop && styles.topicGridTwoCol]}>
          {filteredTopicsList.map((topic, index) => renderTopicCard(topic, index))}
        </View>
      )}
    </ScrollView>
  );

  // ── Render Single Topic Card (Matching User Image 2 Pixel-Perfect) ───────────
  const renderTopicCard = (topic: TopicItem, index: number) => {
    const cardNum = index + 1 < 10 ? `0${index + 1}` : `${index + 1}`;
    const progressPercent = topic.totalWords > 0 ? (topic.masteredWords / topic.totalWords) * 100 : 0;
    const isCompleted = topic.totalWords > 0 && topic.masteredWords === topic.totalWords;

    return (
      <TouchableOpacity
        key={topic.id}
        style={styles.topicCard}
        onPress={() => openTopicStudy(topic, 'FLASHCARD')}
        activeOpacity={0.9}
      >
        {/* Top Meta: 01 ... 53 câu hỏi / Trash */}
        <View style={styles.cardTopRow}>
          <Text style={styles.cardIndexNum}>{cardNum}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isCompleted ? (
              <View style={styles.completedTag}>
                <Ionicons name="checkmark" size={11} color={T.emerald} />
                <Text style={styles.completedTagText}>Đã hoàn tất</Text>
              </View>
            ) : (
              <Text style={styles.cardQuestionCount}>{topic.totalWords} câu hỏi</Text>
            )}

            {topic.id !== 'all' && (
              <TouchableOpacity
                onPress={(e) => {
                  e?.stopPropagation?.();
                  deleteTopic(topic);
                }}
                style={styles.cardTrashBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={13} color={T.faint} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Topic Title */}
        <Text style={styles.cardTitle} numberOfLines={2}>
          {topic.name}
        </Text>

        {/* Sample Words (Italic, comma separated) */}
        <Text style={styles.cardSampleWords} numberOfLines={1}>
          {topic.sampleWords.join(', ') || 'Chưa có từ vựng'}
        </Text>

        {/* Progress Bar: Đã thuộc ... 6/53 */}
        <View style={styles.cardProgressSection}>
          <View style={styles.cardProgressMeta}>
            <Text style={styles.cardProgressLabel}>Đã thuộc</Text>
            <Text style={styles.cardProgressValue}>
              {topic.masteredWords}/{topic.totalWords}
            </Text>
          </View>
          <View style={styles.cardProgressBarTrack}>
            <View style={[styles.cardProgressBarFill, { width: `${progressPercent}%` }]} />
          </View>
        </View>

        {/* Bottom Actions Row: [Học thẻ] [Viết] [Trắc nghiệm] */}
        <View style={styles.cardActionsRow}>
          {/* Action 1: Học thẻ */}
          <TouchableOpacity
            style={styles.actionPillBtn}
            onPress={(e) => {
              e?.stopPropagation?.();
              openTopicStudy(topic, 'FLASHCARD');
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="layers-outline" size={13} color={T.ink} />
            <Text style={styles.actionPillTextBold}>Học thẻ</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 6 }}>
            {/* Action 2: Viết */}
            <TouchableOpacity
              style={styles.actionOutlineBtn}
              onPress={(e) => {
                e?.stopPropagation?.();
                openTopicStudy(topic, 'WRITING');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={12} color={T.brand} />
              <Text style={styles.actionOutlineText}>Viết</Text>
            </TouchableOpacity>

            {/* Action 3: Trắc nghiệm */}
            <TouchableOpacity
              style={styles.actionOutlineBtn}
              onPress={(e) => {
                e?.stopPropagation?.();
                openTopicStudy(topic, 'AI_QUIZ');
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="list-outline" size={12} color={T.brand} />
              <Text style={styles.actionOutlineText}>Trắc nghiệm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: TIER 2 — FOCUSED STUDY STUDIO VIEW
  // ────────────────────────────────────────────────────────────────────────────
  const renderTopicStudyView = () => {
    if (!selectedTopic || currentTopicWords.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Chủ đề này chưa có từ vựng</Text>
          <TouchableOpacity style={styles.emptyActionBtn} onPress={backToTopicsList}>
            <Text style={styles.emptyActionText}>Quay lại danh sách</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isSessionFinished && studySubMode !== 'AI_QUIZ') {
      return renderSessionCompletedScreen();
    }

    return (
      <View style={{ flex: 1, backgroundColor: T.canvas }}>
        {/* Top Studio Bar */}
        <View style={styles.studioTopBar}>
          <TouchableOpacity
            style={styles.studioBackBtn}
            onPress={backToTopicsList}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color={T.ink} />
            <Text style={styles.studioBackText}>Chủ đề từ vựng</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text style={styles.studioTopicSub}>CHỦ ĐỀ ĐANG HỌC</Text>
            <Text style={styles.studioTopicTitle} numberOfLines={1}>
              {selectedTopic.name}
            </Text>
          </View>

          <Text style={styles.studioWordCount}>
            {activeWordIndex + 1}/{currentTopicWords.length}
          </Text>
        </View>

        {/* 3-Mode Scandinavian Switcher Bar */}
        <View style={styles.studioModeSwitcher}>
          <TouchableOpacity
            style={[styles.studioModeBtn, studySubMode === 'FLASHCARD' && styles.studioModeBtnActive]}
            onPress={() => setStudySubMode('FLASHCARD')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="layers-outline"
              size={13}
              color={studySubMode === 'FLASHCARD' ? T.ink : T.muted}
            />
            <Text
              style={[styles.studioModeText, studySubMode === 'FLASHCARD' && styles.studioModeTextActive]}
            >
              Thẻ Flashcard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.studioModeBtn, studySubMode === 'WRITING' && styles.studioModeBtnActive]}
            onPress={() => {
              setStudySubMode('WRITING');
              resetWritingState();
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="create-outline"
              size={13}
              color={studySubMode === 'WRITING' ? T.ink : T.muted}
            />
            <Text
              style={[styles.studioModeText, studySubMode === 'WRITING' && styles.studioModeTextActive]}
            >
              Luyện Viết
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.studioModeBtn, studySubMode === 'AI_QUIZ' && styles.studioModeBtnActive]}
            onPress={() => {
              setStudySubMode('AI_QUIZ');
              if (quizList.length === 0) initiateAiQuiz(currentTopicWords);
            }}
            activeOpacity={0.8}
          >
            <Ionicons
              name="list-outline"
              size={13}
              color={studySubMode === 'AI_QUIZ' ? T.ink : T.muted}
            />
            <Text
              style={[styles.studioModeText, studySubMode === 'AI_QUIZ' && styles.studioModeTextActive]}
            >
              Trắc Nghiệm
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content based on sub-mode */}
        {studySubMode === 'FLASHCARD' && renderFlashcardStudio()}
        {studySubMode === 'WRITING' && renderWritingStudio()}
        {studySubMode === 'AI_QUIZ' && renderQuizStudio()}
      </View>
    );
  };

  // ── SUB-MODE 1: FLASHCARD STUDIO ─────────────────────────────────────────────
  const renderFlashcardStudio = () => {
    if (!activeWord) return null;

    const frontInterpolate = flipAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });
    const backInterpolate = flipAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['180deg', '360deg'],
    });

    const frontAnimatedStyle = {
      transform: [{ rotateY: frontInterpolate }],
      backfaceVisibility: 'hidden' as const,
    };
    const backAnimatedStyle = {
      transform: [{ rotateY: backInterpolate }],
      backfaceVisibility: 'hidden' as const,
    };

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.studioContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Flashcard 3D Card Box */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={toggleCardFlip}
          style={styles.flashcardWrapper}
        >
          {/* Card Front */}
          <Animated.View style={[styles.flashcardFace, frontAnimatedStyle]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardTag}>
                <Text style={styles.cardTagText}>
                  {activeWord.level} · {activeWord.partOfSpeech}
                </Text>
              </View>
              <View
                style={[
                  styles.cardTag,
                  activeWord.status === 'MASTERED'
                    ? { backgroundColor: T.emeraldBg, borderColor: T.emeraldBorder }
                    : {},
                ]}
              >
                <Text
                  style={[
                    styles.cardTagText,
                    activeWord.status === 'MASTERED' ? { color: T.emerald } : {},
                  ]}
                >
                  {activeWord.status === 'MASTERED'
                    ? '✓ Đã thuộc'
                    : `Chu kỳ: ${activeWord.intervalDays} ngày`}
                </Text>
              </View>
            </View>

            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              <Text style={styles.cardFrontWord}>{activeWord.word}</Text>
              <Text style={styles.cardFrontIpa}>{activeWord.ipa}</Text>

              <View style={styles.cardAudioMicRow}>
                <TouchableOpacity
                  style={styles.cardCircleBtn}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    playWordAudio(activeWord.word);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="volume-high" size={20} color={T.brand} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cardCircleBtn}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    setScorerWord(activeWord);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mic" size={20} color={T.brand} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ alignItems: 'center' }}>
              <Text style={styles.cardFlipHint}>Chạm vào thẻ để xem nghĩa & ví dụ</Text>
            </View>
          </Animated.View>

          {/* Card Back */}
          <Animated.View style={[styles.flashcardFace, styles.flashcardFaceBack, backAnimatedStyle]}>
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardBackWord}>{activeWord.word}</Text>
                <Text style={styles.cardBackIpa}>{activeWord.ipa}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={styles.cardMiniIconBtn}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    playWordAudio(activeWord.word);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="volume-medium-outline" size={16} color={T.brand} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cardMiniIconBtn}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    markWordAsMastered(activeWord.id, activeWord.word);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color={T.emerald} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.meaningBox}>
              <Text style={styles.meaningBoxLabel}>Ý NGHĨA TIẾNG VIỆT</Text>
              <Text style={styles.meaningBoxText}>{activeWord.vietnamese}</Text>
            </View>

            <View style={styles.exampleBox}>
              <Text style={styles.exampleLabel}>VÍ DỤ NGỮ CẢNH</Text>
              <Text style={styles.exampleEnText}>"{activeWord.exampleEn}"</Text>
              <Text style={styles.exampleViText}>{activeWord.exampleVi}</Text>
            </View>

            <Text style={styles.cardFlipHint}>Chạm để lật lại mặt trước</Text>
          </Animated.View>
        </TouchableOpacity>

        {/* Card Navigation & SM-2 Grade Matrix */}
        <View style={styles.cardControlsContainer}>
          {/* Prev / Next buttons */}
          <View style={styles.cardNavRow}>
            <TouchableOpacity
              style={[styles.cardNavBtn, activeWordIndex === 0 && { opacity: 0.4 }]}
              onPress={() => {
                if (activeWordIndex > 0) {
                  setActiveWordIndex((prev) => prev - 1);
                  setIsCardFlipped(false);
                  flipAnim.setValue(0);
                }
              }}
              disabled={activeWordIndex === 0}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={14} color={T.ink} />
              <Text style={styles.cardNavText}>Trước</Text>
            </TouchableOpacity>

            <Text style={styles.cardNavProgress}>
              Từ {activeWordIndex + 1} / {currentTopicWords.length}
            </Text>

            <TouchableOpacity
              style={[
                styles.cardNavBtn,
                activeWordIndex === currentTopicWords.length - 1 && { opacity: 0.4 },
              ]}
              onPress={() => {
                if (activeWordIndex < currentTopicWords.length - 1) {
                  setActiveWordIndex((prev) => prev + 1);
                  setIsCardFlipped(false);
                  flipAnim.setValue(0);
                } else {
                  setIsSessionFinished(true);
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.cardNavText}>Tiếp</Text>
              <Ionicons name="arrow-forward" size={14} color={T.ink} />
            </TouchableOpacity>
          </View>

          {/* SM-2 Matrix: Lại (<1d), Khó (3d), Tốt (7d), Dễ (14d) */}
          <View style={styles.gradeMatrixWrapper}>
            <Text style={styles.gradeMatrixHeader}>ĐÁNH GIÁ MỨC ĐỘ GHI NHỚ (SM-2)</Text>
            <View style={styles.gradesRow}>
              <TouchableOpacity
                style={[styles.gradeBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                onPress={() => handleGradeSelect(1)}
                activeOpacity={0.8}
              >
                <Text style={[styles.gradeLabel, { color: '#991B1B' }]}>Lại</Text>
                <Text style={[styles.gradeSub, { color: '#991B1B' }]}>&lt; 1 ngày</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.gradeBtn, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}
                onPress={() => handleGradeSelect(3)}
                activeOpacity={0.8}
              >
                <Text style={[styles.gradeLabel, { color: '#92400E' }]}>Khó</Text>
                <Text style={[styles.gradeSub, { color: '#92400E' }]}>3 ngày</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.gradeBtn, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                onPress={() => handleGradeSelect(4)}
                activeOpacity={0.8}
              >
                <Text style={[styles.gradeLabel, { color: '#065F46' }]}>Tốt</Text>
                <Text style={[styles.gradeSub, { color: '#065F46' }]}>7 ngày</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.gradeBtn, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}
                onPress={() => handleGradeSelect(5)}
                activeOpacity={0.8}
              >
                <Text style={[styles.gradeLabel, { color: '#0369A1' }]}>Dễ</Text>
                <Text style={[styles.gradeSub, { color: '#0369A1' }]}>14 ngày</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  // ── SUB-MODE 2: WRITING & SPELLING STUDIO ────────────────────────────────────
  const renderWritingStudio = () => {
    if (!activeWord) return null;
    const target = activeWord.word;
    const targetChars = target.split('');

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.studioContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.writingCard}>
          {/* Top Metadata & Streak */}
          <View style={styles.writingHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.cardTag}>
                <Text style={styles.cardTagText}>
                  {activeWord.level} · {activeWord.partOfSpeech}
                </Text>
              </View>
              {writingStreak > 0 && (
                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={12} color="#D97706" />
                  <Text style={styles.streakText}>Chuỗi: {writingStreak}</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardIndexNum}>WRITING STUDIO</Text>
          </View>

          {/* Vietnamese meaning prompt */}
          <View style={{ alignItems: 'center', marginVertical: 18 }}>
            <Text style={styles.writingPromptSub}>HÃY VIẾT TỪ TIẾNG ANH MANG Ý NGHĨA:</Text>
            <Text style={styles.writingMeaning}>{activeWord.vietnamese}</Text>
            <Text style={styles.writingSceneText}>Bối cảnh: {activeWord.scene}</Text>
          </View>

          {/* Masked sentence with audio button */}
          <View style={styles.maskedSentenceBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.maskedLabel}>ĐIỀN TỪ VÀO NGỮ CẢNH:</Text>
              <TouchableOpacity
                onPress={() => playWordAudio(activeWord.word)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                activeOpacity={0.7}
              >
                <Ionicons name="volume-medium-outline" size={14} color={T.brand} />
                <Text style={styles.audioHintText}>Nghe đọc mẫu</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.maskedSentenceText}>"{getMaskedExample(activeWord)}"</Text>
          </View>

          {/* Slot Indicators */}
          <View style={styles.writingSlotsRow}>
            {targetChars.map((char, idx) => {
              const entered = writingInput[idx];
              const isRevealed = idx < writingHintCount;
              const displayText = entered || (isRevealed ? char : '_');
              return (
                <View
                  key={idx}
                  style={[
                    styles.writingSlotBox,
                    entered ? styles.writingSlotEntered : {},
                    writingStatus === 'CORRECT' ? styles.writingSlotCorrect : {},
                    writingStatus === 'WRONG' ? styles.writingSlotWrong : {},
                    writingStatus === 'REVEALED' ? styles.writingSlotRevealed : {},
                  ]}
                >
                  <Text
                    style={[
                      styles.writingSlotChar,
                      writingStatus === 'CORRECT' ? { color: '#065F46' } : {},
                      writingStatus === 'WRONG' ? { color: '#991B1B' } : {},
                    ]}
                  >
                    {displayText}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Text Input */}
          <TextInput
            style={[
              styles.writingInput,
              writingStatus === 'CORRECT' && styles.writingInputCorrect,
              writingStatus === 'WRONG' && styles.writingInputWrong,
              writingStatus === 'REVEALED' && styles.writingInputRevealed,
            ]}
            placeholder="Gõ chính xác từ tiếng Anh tại đây..."
            placeholderTextColor={T.faint}
            value={writingInput}
            onChangeText={(text) => {
              setWritingInput(text);
              if (writingStatus !== 'IDLE') setWritingStatus('IDLE');
            }}
            onSubmitEditing={writingStatus === 'CORRECT' ? nextWritingWord : checkWritingAnswer}
            autoCapitalize="none"
            autoCorrect={false}
            editable={writingStatus !== 'CORRECT' && writingStatus !== 'REVEALED'}
          />

          {/* Feedback & Actions */}
          <View style={styles.writingActionsRow}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* Gợi ý */}
              <TouchableOpacity
                style={styles.writingSecondaryBtn}
                onPress={giveWritingHint}
                disabled={writingStatus === 'CORRECT' || writingStatus === 'REVEALED'}
                activeOpacity={0.8}
              >
                <Ionicons name="bulb-outline" size={14} color={T.brand} />
                <Text style={styles.writingSecondaryText}>Gợi ý</Text>
              </TouchableOpacity>

              {/* Xem đáp án */}
              <TouchableOpacity
                style={styles.writingSecondaryBtn}
                onPress={revealWritingAnswer}
                disabled={writingStatus === 'CORRECT' || writingStatus === 'REVEALED'}
                activeOpacity={0.8}
              >
                <Ionicons name="eye-outline" size={14} color={T.rose} />
                <Text style={[styles.writingSecondaryText, { color: T.rose }]}>Xem đáp án</Text>
              </TouchableOpacity>
            </View>

            {/* Submit / Next */}
            {writingStatus === 'CORRECT' || writingStatus === 'REVEALED' ? (
              <TouchableOpacity
                style={styles.writingPrimaryBtn}
                onPress={nextWritingWord}
                activeOpacity={0.85}
              >
                <Text style={styles.writingPrimaryText}>Từ tiếp theo</Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.writingPrimaryBtn}
                onPress={checkWritingAnswer}
                activeOpacity={0.85}
              >
                <Text style={styles.writingPrimaryText}>Kiểm tra</Text>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  // ── SUB-MODE 3: AI QUIZ STUDIO ───────────────────────────────────────────────
  const renderQuizStudio = () => {
    if (isGeneratingQuiz) {
      return (
        <View style={styles.quizLoadingContainer}>
          <ActivityIndicator size="small" color={T.brand} />
          <Text style={styles.quizLoadingTitle}>Hệ thống đang biên soạn đề thi trắc nghiệm...</Text>
          <Text style={styles.quizLoadingSubtitle}>
            Đang tạo câu hỏi kiểm tra ngữ cảnh cho chủ đề "{selectedTopic?.name}".
          </Text>
        </View>
      );
    }

    if (isQuizCompleted) {
      const percentage = Math.round((quizScore.correct / (quizScore.total || 1)) * 100);
      return (
        <View style={styles.completedContainer}>
          <View style={styles.completedTrophyCircle}>
            <Ionicons name="trophy" size={28} color={T.brand} />
          </View>
          <Text style={styles.completedTitle}>Hoàn thành bài thi trắc nghiệm!</Text>
          <Text style={styles.completedSubtitle}>
            Bạn đã trả lời đúng {quizScore.correct} / {quizScore.total} câu ({percentage}%).
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <TouchableOpacity
              style={styles.completedReturnBtn}
              onPress={() => initiateAiQuiz(currentTopicWords)}
              activeOpacity={0.85}
            >
              <Text style={styles.completedReturnText}>Làm lại đề thi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.completedReturnBtn, { backgroundColor: T.field, borderWidth: 1, borderColor: T.border }]}
              onPress={backToTopicsList}
              activeOpacity={0.85}
            >
              <Text style={[styles.completedReturnText, { color: T.ink }]}>Trở về danh sách</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const currentQ = quizList[currentQuizIndex];
    if (!currentQ) return null;

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.studioContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.quizCard}>
          {/* Top Meta: Câu 1/5 & Điểm số */}
          <View style={styles.quizHeaderRow}>
            <Text style={styles.quizQuestionIndex}>
              Câu {currentQuizIndex + 1} / {quizList.length}
            </Text>
            <Text style={styles.quizScoreText}>
              Đúng: {quizScore.correct} / {currentQuizIndex + (isOptionSubmitted ? 1 : 0)}
            </Text>
          </View>

          {/* Question Text */}
          <View style={{ marginVertical: 14 }}>
            <Text style={styles.quizPromptSub}>CHỌN PHƯƠNG ÁN CHÍNH XÁC NHẤT:</Text>
            <Text style={styles.quizQuestionEn}>{currentQ.questionEn}</Text>
            <Text style={styles.quizQuestionVi}>Gợi ý: {currentQ.questionVi}</Text>
          </View>

          {/* 4 Options Grid */}
          <View style={styles.quizOptionsGrid}>
            {currentQ.options.map((opt) => {
              const letter = opt.trim().slice(0, 1).toUpperCase();
              const isSelected = selectedOption === letter;
              const isCorrectOption = letter === currentQ.correctAnswer;

              let btnStyle: any = styles.quizOptionBtn;
              let textStyle: any = styles.quizOptionText;

              if (isOptionSubmitted) {
                if (isCorrectOption) {
                  btnStyle = styles.quizOptionCorrect;
                  textStyle = styles.quizOptionTextCorrect;
                } else if (isSelected && !isCorrectOption) {
                  btnStyle = styles.quizOptionWrong;
                  textStyle = styles.quizOptionTextWrong;
                }
              } else if (isSelected) {
                btnStyle = styles.quizOptionSelected;
                textStyle = styles.quizOptionTextSelected;
              }

              return (
                <TouchableOpacity
                  key={opt}
                  style={btnStyle}
                  onPress={() => handleSelectQuizOption(opt)}
                  disabled={isOptionSubmitted}
                  activeOpacity={0.8}
                >
                  <Text style={textStyle}>{opt}</Text>
                  {isOptionSubmitted && isCorrectOption && (
                    <Ionicons name="checkmark-circle" size={16} color={T.emerald} />
                  )}
                  {isOptionSubmitted && isSelected && !isCorrectOption && (
                    <Ionicons name="close-circle" size={16} color={T.rose} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Explanation Box */}
          {isOptionSubmitted && (
            <View style={styles.quizExplanationBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons
                  name={selectedOption === currentQ.correctAnswer ? 'checkmark-circle' : 'alert-circle'}
                  size={15}
                  color={selectedOption === currentQ.correctAnswer ? T.emerald : T.rose}
                />
                <Text
                  style={[
                    styles.quizExplanationTitle,
                    { color: selectedOption === currentQ.correctAnswer ? T.emerald : T.rose },
                  ]}
                >
                  {selectedOption === currentQ.correctAnswer
                    ? 'Bạn đã trả lời chính xác!'
                    : `Đáp án chính xác là ${currentQ.correctAnswer}`}
                </Text>
              </View>
              <Text style={styles.quizExplanationText}>{currentQ.explanationVi}</Text>
            </View>
          )}

          {/* Bottom Action: Submit or Next */}
          <View style={{ marginTop: 18, alignItems: 'flex-end' }}>
            {!isOptionSubmitted ? (
              <TouchableOpacity
                style={[styles.quizActionBtn, !selectedOption && { opacity: 0.5 }]}
                onPress={submitQuizAnswer}
                disabled={!selectedOption}
                activeOpacity={0.85}
              >
                <Text style={styles.quizActionText}>Xác nhận đáp án</Text>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.quizActionBtn}
                onPress={nextQuizQuestion}
                activeOpacity={0.85}
              >
                <Text style={styles.quizActionText}>
                  {currentQuizIndex + 1 < quizList.length ? 'Câu tiếp theo' : 'Xem kết quả bài thi'}
                </Text>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  // ── Session Completed Screen ─────────────────────────────────────────────────
  const renderSessionCompletedScreen = () => (
    <View style={styles.completedContainer}>
      <View style={styles.completedTrophyCircle}>
        <Ionicons name="trophy" size={28} color={T.brand} />
      </View>
      <Text style={styles.completedTitle}>Xuất sắc! Đã hoàn thành</Text>
      <Text style={styles.completedSubtitle}>
        Bạn đã hoàn tất phiên học cho chủ đề "{selectedTopic?.name}". Dữ liệu chu kỳ SM-2 đã được cập nhật thành công!
      </Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
        <TouchableOpacity
          style={styles.completedReturnBtn}
          onPress={() => {
            setIsSessionFinished(false);
            setActiveWordIndex(0);
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.completedReturnText}>Học lại chủ đề</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.completedReturnBtn, { backgroundColor: T.field, borderWidth: 1, borderColor: T.border }]}
          onPress={backToTopicsList}
          activeOpacity={0.85}
        >
          <Text style={[styles.completedReturnText, { color: T.ink }]}>Danh sách chủ đề</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Main Render ──────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {currentView === 'TOPICS_LIST' ? renderTopicIndexView() : renderTopicStudyView()}

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
          progressId={scorerWord.id}
          onClose={() => setScorerWord(null)}
          onSuccess={() => fetchWordbookData()}
        />
      )}
    </View>
  );
};

// ─── Stylesheet ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.canvas,
  },

  // ── Tier 1: Topic Index Header & Search ──────────────────────────────────────
  topicIndexContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 90,
  },
  topicHeaderSection: {
    marginBottom: 16,
  },
  topicHeaderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 10,
  },
  topicIndexSub: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.brand,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  topicIndexTitle: {
    fontSize: 24,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 2,
    letterSpacing: -0.4,
  },
  topicIndexStats: {
    fontSize: 11.5,
    color: T.muted,
  },
  searchFilterRow: {
    marginTop: 10,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    backgroundColor: T.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: T.ink,
    paddingHorizontal: 10,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  filterTabsRow: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    paddingBottom: 4,
  },
  filterTabBtn: {
    paddingBottom: 4,
  },
  filterTabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: T.brand,
  },
  filterTabText: {
    fontSize: 11.5,
    color: T.muted,
  },
  filterTabTextActive: {
    fontWeight: 'bold',
    color: T.ink,
  },

  // ── Topic Cards Grid ─────────────────────────────────────────────────────────
  topicGrid: {
    gap: 14,
  },
  topicGridTwoCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topicCard: {
    backgroundColor: T.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardIndexNum: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.muted,
  },
  cardQuestionCount: {
    fontSize: 11,
    color: T.muted,
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  completedTagText: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: T.emerald,
  },
  cardTrashBtn: {
    padding: 4,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    letterSpacing: -0.3,
  },
  cardSampleWords: {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: T.muted,
    marginTop: 4,
    marginBottom: 12,
  },
  cardProgressSection: {
    marginBottom: 14,
  },
  cardProgressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardProgressLabel: {
    fontSize: 10,
    color: T.muted,
  },
  cardProgressValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: T.ink,
  },
  cardProgressBarTrack: {
    height: 4,
    backgroundColor: '#E5DED3',
    borderRadius: 999,
    overflow: 'hidden',
  },
  cardProgressBarFill: {
    height: 4,
    backgroundColor: T.emerald,
    borderRadius: 999,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: T.borderLight,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  actionPillTextBold: {
    fontSize: 12,
    fontWeight: 'bold',
    color: T.ink,
  },
  actionOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
  },
  actionOutlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: T.brand,
  },

  // ── Tier 2: Study Studio Top Bar ─────────────────────────────────────────────
  studioTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  studioBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingRight: 8,
  },
  studioBackText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: T.ink,
  },
  studioTopicSub: {
    fontSize: 7.5,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.brand,
    letterSpacing: 0.8,
  },
  studioTopicTitle: {
    fontSize: 15,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
  },
  studioWordCount: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.muted,
  },
  studioModeSwitcher: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    padding: 3,
    backgroundColor: '#EFEAE2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  studioModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 7,
    gap: 5,
  },
  studioModeBtnActive: {
    backgroundColor: T.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  studioModeText: {
    fontSize: 11,
    fontWeight: '500',
    color: T.muted,
  },
  studioModeTextActive: {
    fontWeight: 'bold',
    color: T.ink,
  },
  studioContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 80,
  },

  // ── 3D Flashcard ─────────────────────────────────────────────────────────────
  flashcardWrapper: {
    width: '100%',
    height: 360,
    position: 'relative',
    marginTop: 6,
  },
  flashcardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: T.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
    padding: 20,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  flashcardFaceBack: {
    backgroundColor: T.surface,
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
  cardTagText: {
    fontSize: 9.5,
    fontFamily: 'monospace',
    color: T.brand,
  },
  cardFrontWord: {
    fontSize: 30,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  cardFrontIpa: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: T.muted,
    marginTop: 4,
  },
  cardAudioMicRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 14,
  },
  cardCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  cardBackWord: {
    fontSize: 19,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
  },
  cardBackIpa: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: T.muted,
  },
  cardMiniIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meaningBox: {
    backgroundColor: T.field,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    padding: 10,
  },
  meaningBoxLabel: {
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.muted,
  },
  meaningBoxText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: T.brand,
    marginTop: 2,
  },
  exampleBox: {
    backgroundColor: T.field,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    padding: 10,
  },
  exampleLabel: {
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.muted,
  },
  exampleEnText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: T.ink,
    marginTop: 2,
    lineHeight: 17,
  },
  exampleViText: {
    fontSize: 10.5,
    color: T.muted,
    marginTop: 2,
  },

  // ── Flashcard Controls ───────────────────────────────────────────────────────
  cardControlsContainer: {
    marginTop: 14,
  },
  cardNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  cardNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  cardNavText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: T.ink,
  },
  cardNavProgress: {
    fontSize: 11.5,
    fontFamily: 'monospace',
    color: T.muted,
  },
  gradeMatrixWrapper: {
    marginTop: 14,
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
    marginTop: 8,
    width: '100%',
  },
  gradeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  gradeLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  gradeSub: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
  },

  // ── Writing Studio Styles ───────────────────────────────────────────────────
  writingCard: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  writingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  streakText: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: '#92400E',
  },
  writingPromptSub: {
    fontSize: 8.5,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.brand,
    letterSpacing: 0.8,
  },
  writingMeaning: {
    fontSize: 26,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginVertical: 4,
    textAlign: 'center',
  },
  writingSceneText: {
    fontSize: 11,
    color: T.muted,
  },
  maskedSentenceBox: {
    backgroundColor: T.field,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    marginBottom: 14,
  },
  maskedLabel: {
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.brand,
  },
  audioHintText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: T.brand,
  },
  maskedSentenceText: {
    fontSize: 13,
    fontFamily: 'serif',
    fontStyle: 'italic',
    color: T.ink,
    marginTop: 4,
    lineHeight: 18,
  },
  writingSlotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  writingSlotBox: {
    width: 28,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  writingSlotEntered: {
    backgroundColor: T.surface,
    borderColor: T.brand,
  },
  writingSlotCorrect: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  writingSlotWrong: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  writingSlotRevealed: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  writingSlotChar: {
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.ink,
  },
  writingInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
    textAlign: 'center',
    fontFamily: 'monospace',
    fontSize: 18,
    fontWeight: 'bold',
    color: T.ink,
    marginBottom: 14,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  writingInputCorrect: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  writingInputWrong: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  writingInputRevealed: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  writingActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  writingSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
  },
  writingSecondaryText: {
    fontSize: 11,
    fontWeight: '600',
    color: T.ink,
  },
  writingPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: T.brand,
  },
  writingPrimaryText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // ── AI Quiz Studio Styles ────────────────────────────────────────────────────
  quizLoadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  quizLoadingTitle: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 14,
    textAlign: 'center',
  },
  quizLoadingSubtitle: {
    fontSize: 11.5,
    color: T.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  quizCard: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  quizHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: T.borderLight,
    paddingBottom: 8,
  },
  quizQuestionIndex: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.ink,
  },
  quizScoreText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: T.emerald,
  },
  quizPromptSub: {
    fontSize: 8.5,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.brand,
    letterSpacing: 0.8,
  },
  quizQuestionEn: {
    fontSize: 17,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 4,
    lineHeight: 22,
  },
  quizQuestionVi: {
    fontSize: 11,
    fontStyle: 'italic',
    color: T.muted,
    marginTop: 4,
  },
  quizOptionsGrid: {
    gap: 8,
    marginTop: 10,
  },
  quizOptionBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  quizOptionSelected: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: T.field,
    borderWidth: 1.5,
    borderColor: T.brand,
  },
  quizOptionCorrect: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  quizOptionWrong: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  quizOptionText: {
    fontSize: 12.5,
    color: T.ink,
    fontWeight: '500',
  },
  quizOptionTextSelected: {
    fontSize: 12.5,
    color: T.ink,
    fontWeight: 'bold',
  },
  quizOptionTextCorrect: {
    fontSize: 12.5,
    color: '#065F46',
    fontWeight: 'bold',
  },
  quizOptionTextWrong: {
    fontSize: 12.5,
    color: '#991B1B',
    fontWeight: 'bold',
  },
  quizExplanationBox: {
    backgroundColor: T.field,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    marginTop: 12,
  },
  quizExplanationTitle: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  quizExplanationText: {
    fontSize: 11,
    color: T.ink,
    marginTop: 4,
    lineHeight: 16,
  },
  quizActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: T.brand,
  },
  quizActionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // ── Session Completed Screen ─────────────────────────────────────────────────
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  completedTrophyCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${T.brand}1F`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  completedTitle: {
    fontSize: 20,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    textAlign: 'center',
  },
  completedSubtitle: {
    fontSize: 12,
    color: T.muted,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 320,
  },
  completedReturnBtn: {
    backgroundColor: T.brand,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  completedReturnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // ── Empty State ──────────────────────────────────────────────────────────────
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 11.5,
    color: T.muted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 17,
    maxWidth: 340,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.brand,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 16,
  },
  emptyActionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // ── Floating Toast ───────────────────────────────────────────────────────────
  toast: {
    position: 'absolute',
    top: 14,
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
  toastText: {
    flex: 1,
    fontSize: 11,
    color: T.ink,
    lineHeight: 15,
  },
});

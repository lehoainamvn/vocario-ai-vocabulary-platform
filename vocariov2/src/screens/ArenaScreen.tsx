/**
 * ArenaScreen — VISUAL EXPEDITION 60S
 * Pixel-perfect React Native port of Flutter ArenaScreen (2483 lines)
 * Flutter source: vocario_mobile/lib/screens/arena/arena_screen.dart
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiClient, BASE_URL } from '../api/client';
import { arenaService, leaderboardService, visionService } from '../api/services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
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
  emeraldBg: '#DCFCE7',
  rose: '#B91C1C',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ArenaWord {
  id: string;
  word: string;
  ipa: string;
  vietnamese: string;
  level: string;
  partOfSpeech: string;
  topPercent: number;
  leftPercent: number;
  widthPercent: number;
  heightPercent: number;
}

interface ArenaStage {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  badge: string;
  imageUrl: string;
  words: ArenaWord[];
  isOfficial: boolean;
  isWeekly: boolean;
  bestRecordStr: string;
  bestRecordHolder: string;
}

// Default Official Stages matching Flutter & Angular Web
const DEFAULT_OFFICIAL_STAGES: ArenaStage[] = [
  {
    id: 'stage-admin-kitchen',
    title: 'Gian Bếp Đời Thực',
    subtitle: 'Bối cảnh thi đấu chính thức tuần này dành cho toàn thể học viên',
    category: 'Đời Sống Gia Đình',
    badge: 'Đấu trường tuần',
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=82',
    isOfficial: true,
    isWeekly: true,
    bestRecordStr: '00:08.45',
    bestRecordHolder: 'Nguyễn Văn Nam',
    words: [
      { id: 'k-1', word: 'refrigerator', ipa: '/rɪˈfrɪdʒəreɪtər/', vietnamese: 'tủ lạnh', level: 'A2', partOfSpeech: 'noun', topPercent: 24, leftPercent: 6, widthPercent: 32, heightPercent: 68 },
      { id: 'k-2', word: 'gas stove', ipa: '/ˈɡæs stəʊv/', vietnamese: 'bếp ga nấu ăn', level: 'A2', partOfSpeech: 'noun', topPercent: 58, leftPercent: 62, widthPercent: 28, heightPercent: 25 },
      { id: 'k-3', word: 'water bottle', ipa: '/ˈwɔːtər ˈbɒtl/', vietnamese: 'chai nước uống', level: 'A1', partOfSpeech: 'noun', topPercent: 54, leftPercent: 44, widthPercent: 12, heightPercent: 28 },
      { id: 'k-4', word: 'cardboard box', ipa: '/ˈkɑːdbɔːd bɒks/', vietnamese: 'thùng các-tông đựng đồ', level: 'B1', partOfSpeech: 'noun', topPercent: 62, leftPercent: 78, widthPercent: 20, heightPercent: 34 },
    ],
  },
  {
    id: 'stage-admin-study',
    title: 'Góc Học Tập & Công Việc',
    subtitle: 'Bối cảnh bàn làm việc sáng tạo với đồ dùng học thuật chuẩn CEFR',
    category: 'Học Tập & Công Việc',
    badge: 'Đấu trường hệ thống',
    imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1200&q=82',
    isOfficial: true,
    isWeekly: false,
    bestRecordStr: '00:11.20',
    bestRecordHolder: 'Lê Minh Khôi',
    words: [
      { id: 'sd-1', word: 'laptop', ipa: '/ˈlæptɒp/', vietnamese: 'máy tính xách tay', level: 'A1', partOfSpeech: 'noun', topPercent: 32, leftPercent: 34, widthPercent: 28, heightPercent: 26 },
      { id: 'sd-2', word: 'desk lamp', ipa: '/ˈdesk læmp/', vietnamese: 'đèn học để bàn', level: 'A2', partOfSpeech: 'noun', topPercent: 12, leftPercent: 12, widthPercent: 18, heightPercent: 34 },
      { id: 'sd-3', word: 'chair', ipa: '/tʃeər/', vietnamese: 'ghế ngồi làm việc', level: 'A1', partOfSpeech: 'noun', topPercent: 52, leftPercent: 38, widthPercent: 24, heightPercent: 44 },
      { id: 'sd-4', word: 'notebook', ipa: '/ˈnəʊtbʊk/', vietnamese: 'sổ tay ghi chép', level: 'A1', partOfSpeech: 'noun', topPercent: 48, leftPercent: 66, widthPercent: 18, heightPercent: 20 },
    ],
  },
];

export const ArenaScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // Modes: 'SELECT_STAGE' | 'PLAYING' | 'VICTORY'
  const [gameMode, setGameMode] = useState<'SELECT_STAGE' | 'PLAYING' | 'VICTORY'>('SELECT_STAGE');
  const [stageFilter, setStageFilter] = useState<'ADMIN' | 'USER'>('ADMIN');

  // Stages
  const [officialStages, setOfficialStages] = useState<ArenaStage[]>(DEFAULT_OFFICIAL_STAGES);
  const [userStages, setUserStages] = useState<ArenaStage[]>([]);
  const [isLoadingUserStages, setIsLoadingUserStages] = useState(false);

  // Playing State
  const [currentStage, setCurrentStage] = useState<ArenaStage | null>(null);
  const [activeQueue, setActiveQueue] = useState<ArenaWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(new Set());

  // Scoring & Metrics
  const [totalScore, setTotalScore] = useState(0);
  const [comboMultiplier, setComboMultiplier] = useState(1.0);
  const [maxCombo, setMaxCombo] = useState(1.0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [penaltyTimeMs, setPenaltyTimeMs] = useState(0);

  // Timers
  const [gameStartTimeMs, setGameStartTimeMs] = useState(0);
  const [elapsedTimeMs, setElapsedTimeMs] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(15);
  const speedrunTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Visual cues
  const [isShowingSuccess, setIsShowingSuccess] = useState(false);
  const [isHintActive, setIsHintActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stage leaderboard modal
  const [leaderboardModalStage, setLeaderboardModalStage] = useState<ArenaStage | null>(null);
  const [stageRecords, setStageRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // ── Toast Helper ────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    toastTimer.current = setTimeout(() => setToastMessage(null), 3000);
  };

  // ── Load User Captures as Stages ────────────────────────────────────────────
  const loadUserStages = useCallback(async () => {
    setIsLoadingUserStages(true);
    try {
      const captures = await visionService.getUserCaptures();
      if (Array.isArray(captures)) {
        const loaded: ArenaStage[] = [];
        captures.forEach((c: any, i: number) => {
          let detectedList: any[] = [];
          if (Array.isArray(c.detectedObjects)) detectedList = c.detectedObjects;
          else if (typeof c.detectedObjects === 'string') {
            try { detectedList = JSON.parse(c.detectedObjects); } catch (_) {}
          }

          const words: ArenaWord[] = detectedList.map((obj: any, idx: number) => ({
            id: obj.id ? String(obj.id) : `u-w-${idx}`,
            word: obj.word || obj.name || 'object',
            ipa: obj.ipa || '/.../',
            vietnamese: obj.vietnamese || obj.vietnameseMeaning || 'vật thể',
            level: (obj.level || 'A2').toUpperCase(),
            partOfSpeech: obj.partOfSpeech || 'noun',
            topPercent: obj.topPercent || 20 + ((idx * 15) % 50),
            leftPercent: obj.leftPercent || 15 + ((idx * 20) % 60),
            widthPercent: obj.widthPercent || 25,
            heightPercent: obj.heightPercent || 20,
          })).filter((w) => w.word !== 'object');

          if (words.length > 0) {
            let imgUrl = c.imageUrl || '';
            if (imgUrl.startsWith('/') && !imgUrl.startsWith('http')) {
              imgUrl = `${BASE_URL}${imgUrl}`;
            }
            loaded.push({
              id: String(c.id || `user-stage-${i}`),
              title: c.sceneTheme || `Bối cảnh đời thực #${i + 1}`,
              subtitle: `${words.length} vật thể bóc tách từ ảnh thực tế của bạn`,
              category: 'Bộ Sưu Tập Của Bạn',
              badge: 'Ảnh của bạn',
              imageUrl: imgUrl,
              words,
              isOfficial: false,
              isWeekly: false,
              bestRecordStr: 'Chưa có kỷ lục',
              bestRecordHolder: 'Bạn',
            });
          }
        });
        setUserStages(loaded);
      }
    } catch (_) {}
    finally {
      setIsLoadingUserStages(false);
    }
  }, []);

  useEffect(() => {
    loadUserStages();
  }, [loadUserStages]);

  // Handle initial stage if passed from HomeScreen
  useEffect(() => {
    const initId = route.params?.initialStageId;
    if (initId) {
      const match = officialStages.find((s) => s.id === initId);
      if (match) startStage(match);
    }
  }, [route.params?.initialStageId, officialStages]);

  // ── Format Timer (00:00.00) ─────────────────────────────────────────────────
  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const minutes = String(Math.floor(totalSec / 60)).padStart(2, '0');
    const seconds = String(totalSec % 60).padStart(2, '0');
    const hundredths = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
    return `${minutes}:${seconds}.${hundredths}`;
  };

  // ── Game Engine ─────────────────────────────────────────────────────────────
  const startStage = (stage: ArenaStage) => {
    const shuffled = [...stage.words].sort(() => Math.random() - 0.5);
    setCurrentStage(stage);
    setActiveQueue(shuffled);
    setCurrentIndex(0);
    setSolvedIds(new Set());
    setTotalScore(0);
    setComboMultiplier(1.0);
    setMaxCombo(1.0);
    setCorrectCount(0);
    setTotalClicks(0);
    setMistakeCount(0);
    setPenaltyTimeMs(0);
    setIsShowingSuccess(false);
    setIsHintActive(false);

    setGameMode('PLAYING');
    startSpeedrunStopwatch();
    startQuestionRound(shuffled, 0);
  };

  const startBlitz60s = () => {
    const allWords: ArenaWord[] = [];
    officialStages.forEach((s) => allWords.push(...s.words));
    allWords.sort(() => Math.random() - 0.5);
    const blitzWords = allWords.slice(0, 6);

    const blitzStage: ArenaStage = {
      id: 'stage-blitz-60s',
      title: 'Đua Tốc Độ 60s Blitz',
      subtitle: 'Thử thách phản xạ nhanh tổng hợp các bối cảnh đời thực',
      category: 'Đấu Trường Đỉnh Cao',
      badge: '⚡ Siêu Tốc Độ',
      imageUrl: officialStages[0]?.imageUrl || '',
      words: blitzWords,
      isOfficial: true,
      isWeekly: true,
      bestRecordStr: 'Chưa có kỷ lục',
      bestRecordHolder: 'Chưa có',
    };
    startStage(blitzStage);
  };

  const startSpeedrunStopwatch = () => {
    if (speedrunTimer.current) clearInterval(speedrunTimer.current);
    const startMs = Date.now();
    setGameStartTimeMs(startMs);
    setElapsedTimeMs(0);

    speedrunTimer.current = setInterval(() => {
      setElapsedTimeMs(Date.now() - startMs);
    }, 50);
  };

  const startQuestionRound = (queue: ArenaWord[], idx: number) => {
    if (roundTimer.current) clearInterval(roundTimer.current);
    setTimerSeconds(15);
    setIsShowingSuccess(false);
    setIsHintActive(false);

    if (idx >= queue.length) {
      finishGame();
      return;
    }

    // Phát âm từ đích
    const currentWord = queue[idx];
    if (currentWord) {
      Speech.speak(currentWord.word, { language: 'en-US', rate: 0.85 });
    }

    roundTimer.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          if (roundTimer.current) clearInterval(roundTimer.current);
          handleRoundTimeout(queue, idx);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRoundTimeout = (queue: ArenaWord[], idx: number) => {
    setComboMultiplier(1.0);
    showToast(`Hết giờ cho từ "${queue[idx]?.word}"! Chuyển sang từ kế tiếp.`);
    const next = idx + 1;
    setCurrentIndex(next);
    if (next < queue.length) {
      startQuestionRound(queue, next);
    } else {
      finishGame();
    }
  };

  const currentTarget = activeQueue[currentIndex] || null;

  // ── Hitbox Touch Detection ──────────────────────────────────────────────────
  const onPhotoTapped = (event: any, containerWidth: number, containerHeight: number) => {
    if (isShowingSuccess || !currentTarget) return;

    const { locationX, locationY } = event.nativeEvent;
    const clickX = (locationX / containerWidth) * 100;
    const clickY = (locationY / containerHeight) * 100;

    setTotalClicks((prev) => prev + 1);

    const words = currentStage?.words || [];
    let hitWord: ArenaWord | null = null;
    let isTargetHit = false;

    // Hitbox tolerance
    for (const item of words) {
      if (solvedIds.has(item.id)) continue;
      const tol = 5.0;
      const minX = item.leftPercent - tol;
      const maxX = item.leftPercent + item.widthPercent + tol;
      const minY = item.topPercent - tol;
      const maxY = item.topPercent + item.heightPercent + tol;

      if (clickX >= minX && clickX <= maxX && clickY >= minY && clickY <= maxY) {
        if (item.id === currentTarget.id || item.word.toLowerCase() === currentTarget.word.toLowerCase()) {
          isTargetHit = true;
          hitWord = item;
          break;
        } else {
          hitWord = item;
        }
      }
    }

    if (isTargetHit && hitWord) {
      handleCorrectHit(hitWord);
    } else if (hitWord) {
      // Wrong object
      setComboMultiplier(1.0);
      setMistakeCount((prev) => prev + 1);
      setPenaltyTimeMs((prev) => prev + 2000);
      showToast(`Đó là "${hitWord.word}" (${hitWord.vietnamese}), hãy tìm "${currentTarget.word}"! (+2s phạt)`);
    } else {
      // Miss click
      setComboMultiplier(1.0);
      setMistakeCount((prev) => prev + 1);
      setPenaltyTimeMs((prev) => prev + 2000);
      showToast('Chạm trượt! (-2s phạt)');
    }
  };

  const handleCorrectHit = (target: ArenaWord) => {
    if (roundTimer.current) clearInterval(roundTimer.current);

    const baseScore = 25;
    const speedBonus = timerSeconds >= 10 ? 10 : 0;
    const earnedXp = Math.round((baseScore + speedBonus) * comboMultiplier);

    setIsShowingSuccess(true);
    setSolvedIds((prev) => new Set(prev).add(target.id));
    setCorrectCount((prev) => prev + 1);
    setTotalScore((prev) => prev + earnedXp);

    const nextCombo = Math.min(3.0, comboMultiplier + 0.5);
    setComboMultiplier(Number(nextCombo.toFixed(1)));
    if (nextCombo > maxCombo) setMaxCombo(nextCombo);

    setTimeout(() => {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      if (next < activeQueue.length) {
        startQuestionRound(activeQueue, next);
      } else {
        finishGame();
      }
    }, 1200);
  };

  const finishGame = async () => {
    if (roundTimer.current) clearInterval(roundTimer.current);
    if (speedrunTimer.current) clearInterval(speedrunTimer.current);

    const pureMs = elapsedTimeMs > 0 ? elapsedTimeMs : 6000;
    const totalMs = pureMs + penaltyTimeMs;
    const clicks = totalClicks > 0 ? totalClicks : 1;
    const acc = Math.min(100, Math.round((correctCount / clicks) * 100));

    setGameMode('VICTORY');

    if (currentStage) {
      arenaService.submitArenaScore({
        stageId: currentStage.id,
        completionTimeMs: totalMs,
        pureTimeMs: pureMs,
        mistakeCount,
        accuracyPct: acc,
        maxCombo: Math.round(maxCombo),
        totalXpEarned: totalScore,
      }).catch(() => {});
    }
  };

  // ── Show Stage Leaderboard Modal ───────────────────────────────────────────
  const openStageLeaderboard = async (stage: ArenaStage) => {
    setLeaderboardModalStage(stage);
    setLoadingRecords(true);
    try {
      const data = await leaderboardService.getStageLeaderboard(stage.id);
      setStageRecords(data);
    } catch (_) {
      setStageRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 1: SELECT STAGE VIEW
  // ──────────────────────────────────────────────────────────────────────────
  const renderSelectStageView = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header */}
      <View style={styles.topHeaderRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={16} color={T.ink} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.xpPill}
          onPress={() => navigation.navigate('Leaderboard')}
        >
          <Ionicons name="trophy-outline" size={14} color={T.brand} />
          <Text style={styles.xpPillText}>{totalScore} XP</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.kicker}>VISUAL EXPEDITION · ĐẤU TRƯỜNG THỰC TẾ</Text>
      <Text style={styles.title}>Đấu trường thị giác AI</Text>
      <Text style={styles.subtitle}>
        Thử thách phản xạ ngôn ngữ trên Đấu trường Tuần chuẩn hóa hoặc trực tiếp trên ảnh đời thực bạn đã chụp.
      </Text>

      {/* 60s Blitz Special Mode Banner */}
      <View style={styles.blitzBanner}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.blitzIconBox}>
            <Ionicons name="flash" size={18} color={T.brand} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.blitzKicker}>CHẾ ĐỘ ĐẶC BIỆT</Text>
            <Text style={styles.blitzTitle}>Thử thách Blitz: Đua thời gian 60 giây</Text>
          </View>
        </View>
        <Text style={styles.blitzDesc}>
          Thi đấu phản xạ nhanh xáo trộn trên bối cảnh tuần trước khi hết thời gian.
        </Text>
        <TouchableOpacity style={styles.blitzStartBtn} onPress={startBlitz60s} activeOpacity={0.85}>
          <Ionicons name="timer-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.blitzStartText}>Bắt đầu 60s Blitz</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        <TouchableOpacity
          style={[styles.filterTab, stageFilter === 'ADMIN' && styles.filterTabActive]}
          onPress={() => setStageFilter('ADMIN')}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterTabText, stageFilter === 'ADMIN' && styles.filterTabTextActive]}>
            Đấu trường hệ thống ({officialStages.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, stageFilter === 'USER' && styles.filterTabActive]}
          onPress={() => setStageFilter('USER')}
          activeOpacity={0.8}
        >
          <Text style={[styles.filterTabText, stageFilter === 'USER' && styles.filterTabTextActive]}>
            Ảnh của bạn ({userStages.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stages List */}
      <View style={{ gap: 12, marginTop: 12 }}>
        {stageFilter === 'ADMIN' ? (
          officialStages.map((stage) => renderStageCard(stage))
        ) : isLoadingUserStages ? (
          <ActivityIndicator size="small" color={T.brand} style={{ paddingVertical: 30 }} />
        ) : userStages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="camera-outline" size={36} color={T.muted} />
            <Text style={styles.emptyTitle}>Chưa có bối cảnh từ ảnh đã chụp</Text>
            <Text style={styles.emptyDesc}>
              Chụp hoặc tải ảnh đồ vật trong phòng để AI tự động tạo sàn đấu phản xạ riêng cho bạn!
            </Text>
            <TouchableOpacity
              style={styles.emptyCta}
              onPress={() => navigation.navigate('Scanner')}
            >
              <Text style={styles.emptyCtaText}>Chụp ảnh bối cảnh ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          userStages.map((stage) => renderStageCard(stage))
        )}
      </View>

      {/* Scoring Mechanics */}
      <View style={styles.mechanicsCard}>
        <Text style={styles.mechanicsKicker}>CƠ CHẾ TÍNH ĐIỂM &amp; PHẢN XẠ</Text>
        <View style={styles.mechanicsRow}>
          <Text style={styles.mechanicsLeft}>✓ Đoán đúng vật thể</Text>
          <Text style={styles.mechanicsRight}>+25 XP</Text>
        </View>
        <View style={styles.mechanicsRow}>
          <Text style={styles.mechanicsLeft}>🔥 Chuỗi combo chính xác</Text>
          <Text style={styles.mechanicsRight}>x1.5 ~ x3.0</Text>
        </View>
        <View style={styles.mechanicsRow}>
          <Text style={styles.mechanicsLeft}>⚡ Phản xạ nhanh &lt;5s</Text>
          <Text style={styles.mechanicsRight}>+10 XP</Text>
        </View>
        <View style={styles.mechanicsRow}>
          <Text style={[styles.mechanicsLeft, { color: T.rose }]}>✕ Chạm sai vị trí</Text>
          <Text style={[styles.mechanicsRight, { color: T.rose }]}>-2s phạt</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderStageCard = (stage: ArenaStage) => (
    <View key={stage.id} style={[styles.stageCard, stage.isWeekly && styles.stageCardWeekly]}>
      {/* Photo with Overlay Badges */}
      <View style={styles.stagePhotoWrapper}>
        <Image source={{ uri: stage.imageUrl }} style={styles.stagePhoto} resizeMode="cover" />
        <View style={styles.badgeTopLeft}>
          <Text style={[styles.badgeTopLeftText, stage.isWeekly && { color: T.goldAccent }]}>
            {stage.badge} · {stage.words.length} đồ vật
          </Text>
        </View>
        {stage.isWeekly && (
          <View style={styles.badgeTopRight}>
            <Text style={styles.badgeTopRightText}>TIÊU ĐIỂM TUẦN</Text>
          </View>
        )}
      </View>

      <View style={styles.stageCardBody}>
        <Text style={styles.stageCardTitle}>{stage.title}</Text>
        <Text style={styles.stageWordsPreview} numberOfLines={1}>
          {stage.words.map((w) => w.word).join(' · ')}
        </Text>

        {/* Record Row */}
        <TouchableOpacity
          style={styles.recordRow}
          onPress={() => openStageLeaderboard(stage)}
          activeOpacity={0.75}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="trophy-outline" size={13} color={T.amber} style={{ marginRight: 5 }} />
            <Text style={styles.recordLabel}>Kỷ lục: </Text>
            <Text style={styles.recordVal}>{stage.bestRecordStr} ({stage.bestRecordHolder})</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={T.muted} />
        </TouchableOpacity>

        {/* Start Button */}
        <TouchableOpacity
          style={styles.enterStageBtn}
          onPress={() => startStage(stage)}
          activeOpacity={0.85}
        >
          <Text style={styles.enterStageBtnText}>Vào thi đấu</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 2: PLAYING VIEW (INTERACTIVE ARENA)
  // ──────────────────────────────────────────────────────────────────────────
  const renderPlayingView = () => {
    const target = currentTarget;

    return (
      <View style={{ flex: 1, backgroundColor: '#1F1C18' }}>
        {/* Top HUD Bar */}
        <View style={styles.hudBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setGameMode('SELECT_STAGE')} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={18} color={T.ink} />
            </TouchableOpacity>
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.hudStageKicker}>BỐI CẢNH</Text>
              <Text style={styles.hudStageTitle} numberOfLines={1}>{currentStage?.title}</Text>
            </View>
          </View>

          {/* Metrics */}
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            {/* Speedrun Timer */}
            <View style={styles.hudPill}>
              <Ionicons name="timer-outline" size={11} color={T.brand} />
              <Text style={styles.hudPillText}>{formatTime(elapsedTimeMs + penaltyTimeMs)}</Text>
              {penaltyTimeMs > 0 && (
                <Text style={styles.penaltyText}> +{penaltyTimeMs / 1000}s</Text>
              )}
            </View>

            {/* 15s Countdown */}
            <View style={[styles.hudPill, timerSeconds <= 5 && { backgroundColor: '#FDE8E8' }]}>
              <Text style={[styles.hudPillText, timerSeconds <= 5 && { color: T.rose }]}>
                {timerSeconds}s
              </Text>
            </View>

            {/* Combo */}
            <View style={[styles.hudPill, { backgroundColor: T.amberBg }]}>
              <Text style={[styles.hudPillText, { color: '#B45309' }]}>🔥 {comboMultiplier}x</Text>
            </View>

            {/* Hint */}
            <TouchableOpacity
              style={styles.hintBtn}
              onPress={() => {
                if (!isHintActive) {
                  setIsHintActive(true);
                  setTotalScore((prev) => Math.max(0, prev - 10));
                  showToast('Đã bật gợi ý vị trí vật thể (-10 XP)!');
                }
              }}
            >
              <Text style={[styles.hintBtnText, isHintActive && { color: T.muted }]}>Gợi ý</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Target Word Prompt Banner */}
        <View style={styles.targetBanner}>
          <TouchableOpacity
            style={styles.speakerCircle}
            onPress={() => target && Speech.speak(target.word, { language: 'en-US' })}
          >
            <Ionicons name="volume-medium" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.targetTag}>TÌM ĐỒ VẬT ({currentIndex + 1}/{activeQueue.length}):</Text>
              <Text style={styles.targetLevelTag}>{target?.level}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 1 }}>
              <Text style={styles.targetWordText}>{target?.word}</Text>
              <Text style={styles.targetIpa}>{target?.ipa}</Text>
            </View>
            <Text style={styles.targetMeaning}>Nghĩa: {target?.vietnamese}</Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              showToast(`Bỏ qua câu "${target?.word}".`);
              const next = currentIndex + 1;
              setCurrentIndex(next);
              if (next < activeQueue.length) startQuestionRound(activeQueue, next);
              else finishGame();
            }}
          >
            <Text style={styles.skipBtnText}>Bỏ qua</Text>
          </TouchableOpacity>
        </View>

        {/* Interactive Photo Canvas */}
        <View style={{ flex: 1, position: 'relative' }}>
          <Image
            source={{ uri: currentStage?.imageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />

          {/* Touch Layer */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={(e) => onPhotoTapped(e, SCREEN_WIDTH, SCREEN_WIDTH * 0.75)}
          >
            {/* Radar Hint Circle */}
            {isHintActive && target && (
              <View
                style={[
                  styles.radarCircle,
                  {
                    left: `${target.leftPercent}%` as any,
                    top: `${target.topPercent}%` as any,
                    width: `${target.widthPercent}%` as any,
                    height: `${target.heightPercent}%` as any,
                  },
                ]}
              />
            )}

            {/* Solved items checkmarks */}
            {Array.from(solvedIds).map((id) => {
              const word = currentStage?.words.find((w) => w.id === id);
              if (!word) return null;
              return (
                <View
                  key={id}
                  style={[
                    styles.solvedBox,
                    {
                      left: `${word.leftPercent}%` as any,
                      top: `${word.topPercent}%` as any,
                      width: `${word.widthPercent}%` as any,
                      height: `${word.heightPercent}%` as any,
                    },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                </View>
              );
            })}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // VIEW 3: VICTORY VIEW
  // ──────────────────────────────────────────────────────────────────────────
  const renderVictoryView = () => {
    const pureMs = elapsedTimeMs;
    const totalMs = pureMs + penaltyTimeMs;
    const clicks = totalClicks > 0 ? totalClicks : 1;
    const acc = Math.min(100, Math.round((correctCount / clicks) * 100));

    return (
      <View style={styles.victoryContainer}>
        <View style={styles.victoryTrophyCircle}>
          <Ionicons name="trophy" size={44} color={T.goldAccent} />
        </View>

        <Text style={styles.victoryTitle}>Chúc mừng! Hoàn thành xuất sắc</Text>
        <Text style={styles.victorySubtitle}>
          Bạn đã chinh phục thành công bối cảnh "{currentStage?.title}"!
        </Text>

        {/* Stats Summary Card */}
        <View style={styles.statsCard}>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{formatTime(totalMs)}</Text>
            <Text style={styles.statLabel}>Tổng thời gian</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{totalScore} XP</Text>
            <Text style={styles.statLabel}>Điểm tích lũy</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{acc}%</Text>
            <Text style={styles.statLabel}>Độ chính xác</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ width: '100%', gap: 10, marginTop: 24 }}>
          <TouchableOpacity
            style={styles.victoryCtaPrimary}
            onPress={() => currentStage && startStage(currentStage)}
          >
            <Text style={styles.victoryCtaPrimaryText}>Chơi lại màn này</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.victoryCtaSecondary}
            onPress={() => setGameMode('SELECT_STAGE')}
          >
            <Text style={styles.victoryCtaSecondaryText}>Chọn bối cảnh khác</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ── Stage Leaderboard Modal ────────────────────────────────────────────────
  const renderLeaderboardModal = () => (
    <Modal
      visible={!!leaderboardModalStage}
      transparent
      animationType="slide"
      onRequestClose={() => setLeaderboardModalStage(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalKicker}>BẢNG VÀNG PHẢN XẠ</Text>
              <Text style={styles.modalTitle}>{leaderboardModalStage?.title}</Text>
            </View>
            <TouchableOpacity onPress={() => setLeaderboardModalStage(null)}>
              <Ionicons name="close" size={20} color={T.ink} />
            </TouchableOpacity>
          </View>

          {loadingRecords ? (
            <ActivityIndicator size="small" color={T.brand} style={{ padding: 40 }} />
          ) : stageRecords.length === 0 ? (
            <View style={{ padding: 30, alignItems: 'center' }}>
              <Ionicons name="trophy-outline" size={36} color={T.muted} />
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: T.ink, marginTop: 10 }}>
                Chưa có kỷ lục nào
              </Text>
              <Text style={{ fontSize: 11, color: T.muted, textAlign: 'center', marginTop: 4 }}>
                Hãy là người đầu tiên hoàn thành màn đấu này!
              </Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 360 }}>
              {stageRecords.map((r, i) => (
                <View key={i} style={styles.lbRecordRow}>
                  <Text style={styles.lbRecordRank}>#{i + 1}</Text>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.lbRecordUser}>{r.username || r.userName || 'Học viên'}</Text>
                    <Text style={styles.lbRecordAcc}>Chính xác: {r.accuracyRate || 100}%</Text>
                  </View>
                  <Text style={styles.lbRecordTime}>{r.timeTakenSeconds ? `${r.timeTakenSeconds.toFixed(2)}s` : '--'}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {gameMode === 'SELECT_STAGE' && renderSelectStageView()}
      {gameMode === 'PLAYING' && renderPlayingView()}
      {gameMode === 'VICTORY' && renderVictoryView()}
      {renderLeaderboardModal()}

      {/* Toast */}
      {toastMessage && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 40 },

  // ── Top Header ─────────────────────────────────────────────────────────────
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    gap: 4,
  },
  xpPillText: { fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold', color: T.ink },
  kicker: { fontSize: 8.5, fontFamily: 'monospace', color: T.brand, letterSpacing: 1 },
  title: { fontSize: 24, fontFamily: 'serif', fontWeight: 'bold', color: T.ink, marginTop: 4 },
  subtitle: { fontSize: 11.5, color: T.muted, lineHeight: 16, marginTop: 4 },

  // ── Blitz Banner ───────────────────────────────────────────────────────────
  blitzBanner: {
    padding: 14,
    backgroundColor: '#F1ECE3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    marginTop: 14,
  },
  blitzIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blitzKicker: { fontSize: 8, fontFamily: 'monospace', color: T.brand },
  blitzTitle: { fontSize: 13.5, fontFamily: 'serif', fontWeight: 'bold', color: T.ink },
  blitzDesc: { fontSize: 10.5, color: T.muted, lineHeight: 15, marginTop: 8 },
  blitzStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.brand,
    borderRadius: 8,
    height: 38,
    marginTop: 10,
  },
  blitzStartText: { fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' },

  // ── Filter Tabs ────────────────────────────────────────────────────────────
  filterTabsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  filterTabActive: { backgroundColor: T.brand, borderColor: T.brand },
  filterTabText: { fontSize: 11, fontWeight: '500', color: T.ink },
  filterTabTextActive: { fontWeight: 'bold', color: '#FFFFFF' },

  // ── Stage Card ─────────────────────────────────────────────────────────────
  stageCard: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },
  stageCardWeekly: {
    borderColor: T.goldAccent,
    borderWidth: 1.5,
  },
  stagePhotoWrapper: {
    height: 160,
    position: 'relative',
  },
  stagePhoto: { width: '100%', height: '100%' },
  badgeTopLeft: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
  },
  badgeTopLeftText: { fontSize: 8, fontFamily: 'monospace', fontWeight: 'bold', color: '#FFFFFF' },
  badgeTopRight: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: T.goldAccent,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeTopRightText: { fontSize: 7.5, fontFamily: 'monospace', fontWeight: 'bold', color: T.ink },
  stageCardBody: { padding: 12 },
  stageCardTitle: { fontSize: 15, fontFamily: 'serif', fontWeight: 'bold', color: T.ink },
  stageWordsPreview: { fontSize: 10, fontStyle: 'italic', color: T.muted, marginTop: 2 },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: T.field,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.border,
    marginTop: 8,
  },
  recordLabel: { fontSize: 9.5, fontWeight: 'bold', color: T.brand },
  recordVal: { fontSize: 9.5, color: T.muted },
  enterStageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.brand,
    borderRadius: 7,
    height: 36,
    marginTop: 10,
    gap: 5,
  },
  enterStageBtnText: { fontSize: 11.5, fontWeight: 'bold', color: '#FFFFFF' },

  // ── Mechanics Card ─────────────────────────────────────────────────────────
  mechanicsCard: {
    padding: 12,
    backgroundColor: T.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    marginTop: 16,
  },
  mechanicsKicker: { fontSize: 8, fontFamily: 'monospace', color: T.brand, marginBottom: 8 },
  mechanicsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  mechanicsLeft: { fontSize: 10.5, color: T.ink },
  mechanicsRight: { fontSize: 9.5, fontFamily: 'monospace', fontWeight: 'bold', color: T.brand },

  // ── HUD Bar ────────────────────────────────────────────────────────────────
  hudBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  hudStageKicker: { fontSize: 7, fontFamily: 'monospace', color: T.brand },
  hudStageTitle: { fontSize: 11, fontFamily: 'serif', fontWeight: 'bold', color: T.ink },
  hudPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: T.field,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.border,
  },
  hudPillText: { fontSize: 9.5, fontFamily: 'monospace', fontWeight: 'bold', color: T.ink },
  penaltyText: { fontSize: 8.5, fontWeight: 'bold', color: T.rose },
  hintBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: T.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.border,
  },
  hintBtnText: { fontSize: 9, fontWeight: 'bold', color: T.brand },

  // ── Target Banner ──────────────────────────────────────────────────────────
  targetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  speakerCircle: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: T.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetTag: { fontSize: 7.5, fontFamily: 'monospace', color: T.brand },
  targetLevelTag: {
    fontSize: 7,
    fontFamily: 'monospace',
    color: T.muted,
    backgroundColor: T.field,
    paddingHorizontal: 3,
    borderRadius: 2,
  },
  targetWordText: { fontSize: 16, fontFamily: 'serif', fontWeight: 'bold', color: T.ink },
  targetIpa: { fontSize: 8.5, fontFamily: 'monospace', color: T.muted },
  targetMeaning: { fontSize: 9.5, color: T.ink },
  skipBtnText: { fontSize: 9.5, color: T.muted },

  // ── In-game Visual Highlights ──────────────────────────────────────────────
  radarCircle: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: T.goldAccent,
    borderRadius: 6,
    backgroundColor: 'rgba(247,209,71,0.25)',
  },
  solvedBox: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Victory Screen ─────────────────────────────────────────────────────────
  victoryContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: T.canvas,
  },
  victoryTrophyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: T.surface,
    borderWidth: 2,
    borderColor: T.goldAccent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  victoryTitle: { fontSize: 20, fontFamily: 'serif', fontWeight: 'bold', color: T.ink },
  victorySubtitle: { fontSize: 12, color: T.muted, textAlign: 'center', marginTop: 4 },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    marginTop: 20,
    width: '100%',
  },
  statCol: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 16, fontFamily: 'monospace', fontWeight: 'bold', color: T.brand },
  statLabel: { fontSize: 9.5, color: T.muted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: T.border },
  victoryCtaPrimary: {
    backgroundColor: T.brand,
    borderRadius: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  victoryCtaPrimaryText: { fontSize: 13, fontWeight: 'bold', color: '#FFFFFF' },
  victoryCtaSecondary: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  victoryCtaSecondaryText: { fontSize: 13, fontWeight: 'bold', color: T.ink },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  modalKicker: { fontSize: 8.5, fontFamily: 'monospace', color: T.brand },
  modalTitle: { fontSize: 16, fontFamily: 'serif', fontWeight: 'bold', color: T.ink },
  lbRecordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.field,
  },
  lbRecordRank: { fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold', color: T.amber },
  lbRecordUser: { fontSize: 12, fontWeight: 'bold', color: T.ink },
  lbRecordAcc: { fontSize: 10, color: T.muted },
  lbRecordTime: { fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold', color: T.brand },

  // ── Empty States ───────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 14, fontFamily: 'serif', fontWeight: 'bold', color: T.ink, marginTop: 10 },
  emptyDesc: { fontSize: 10.5, color: T.muted, textAlign: 'center', lineHeight: 15, marginTop: 4 },
  emptyCta: {
    marginTop: 14,
    backgroundColor: T.brand,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyCtaText: { fontSize: 11, fontWeight: 'bold', color: '#FFFFFF' },

  // ── Toast ──────────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute',
    top: 14,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    padding: 10,
    alignItems: 'center',
    elevation: 6,
  },
  toastText: { fontSize: 11, color: T.ink },
});

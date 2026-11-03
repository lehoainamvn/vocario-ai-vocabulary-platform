/**
 * HomeScreen — VOCARIO MAIN DASHBOARD
 * Pixel-perfect React Native port of Flutter HomeScreen (1875 lines)
 * Flutter source: vocario_mobile/lib/screens/home/home_screen.dart
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient, BASE_URL } from '../api/client';
import { authService, visionService, srsService } from '../api/services';

// ─── Design tokens ────────────────────────────────────────────────────────────
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
  goldAccent: '#F7D147',
  emerald: '#10B981',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface TierStatus {
  code: string;
  label: string;
  mastered: number;
  required: number;
  progress: string;
  pctNumber: number;
  color: string;
  status: 'complete' | 'active' | 'future';
}
interface LeaderboardUser { rank: number; name: string; level: string; streak: number; xp: number; isMe: boolean; }
interface HeroStage {
  id: string; title: string; imageUrl: string;
  badge: string; firstWord: string; confidence: string;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // User state
  const [userFullName, setUserFullName] = useState('');
  const [targetLevel, setTargetLevel] = useState('A2');
  const [streakCount, setStreakCount] = useState(0);
  const [dueWordsCount, setDueWordsCount] = useState(0);
  const [dueCardsList, setDueCardsList] = useState<any[]>([]);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [reviewCardIndex, setReviewCardIndex] = useState(0);
  const [isReviewFlipped, setIsReviewFlipped] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Word preview
  const [previewWord, setPreviewWord] = useState('');
  const [previewIpa, setPreviewIpa] = useState('');
  const [previewMeaning, setPreviewMeaning] = useState('');
  const [previewLevel, setPreviewLevel] = useState('A2');

  // Mastery
  const [masteredWords, setMasteredWords] = useState(0);
  const [collectionWords, setCollectionWords] = useState(0);
  const [totalTargetWords, setTotalTargetWords] = useState(1000);
  const [remainingWordsToTarget, setRemainingWordsToTarget] = useState(1000);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [tiers, setTiers] = useState<TierStatus[]>([
    { code: 'A1', label: 'Sơ cấp', mastered: 0, required: 1000, progress: '0%', pctNumber: 0, color: '#059669', status: 'future' },
    { code: 'A2', label: 'Cơ bản', mastered: 0, required: 1000, progress: '0%', pctNumber: 0, color: '#D97706', status: 'active' },
    { code: 'B1', label: 'Trung cấp', mastered: 0, required: 20, progress: '0%', pctNumber: 0, color: '#4F46E5', status: 'future' },
    { code: 'B2', label: 'Nâng cao', mastered: 0, required: 30, progress: '0%', pctNumber: 0, color: '#7C3AED', status: 'future' },
    { code: 'C1', label: 'Tinh anh', mastered: 0, required: 50, progress: '0%', pctNumber: 0, color: '#B45309', status: 'future' },
  ]);

  // Leaderboard
  const [weeklyTopThree, setWeeklyTopThree] = useState<LeaderboardUser[]>([]);

  // Arena
  const [featuredHeroStage, setFeaturedHeroStage] = useState<HeroStage | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Certificate Preview Modal
  const [previewCertData, setPreviewCertData] = useState<{
    code: string;
    label: string;
    mastered: number;
    required: number;
    pctNumber: number;
    isComplete: boolean;
    color: string;
  } | null>(null);
  const [showCertPreviewModal, setShowCertPreviewModal] = useState(false);

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchDatabaseData = useCallback(async () => {
    try {
      const [dashRes, lbRes, capturesRes] = await Promise.allSettled([
        authService.getDashboardData(),
        apiClient.get('/api/leaderboard', { params: { period: 'weekly', size: 3 } }),
        visionService.getUserCaptures(),
      ]);

      // --- Dashboard bundle (Real user, real due cards, real targetProgress) ---
      if (dashRes.status === 'fulfilled') {
        const bundle: any = dashRes.value || {};
        const user = bundle.user || {};
        const dueCards: any[] = bundle.dueCards || [];
        const targetProgress = bundle.targetProgress || {};

        setUserFullName(user.fullName || user.username || 'Học viên Vocario');
        setTargetLevel(user.targetLevel || 'A2');
        setStreakCount(user.streakCount ?? 0);
        setDueWordsCount(dueCards.length);
        setDueCardsList(dueCards);

        if (dueCards.length > 0) {
          const first = dueCards[0];
          const w = first.word && typeof first.word === 'object' ? first.word : {};
          const wordStr = typeof first.word === 'string' ? first.word : (w.word || first.wordText || 'sofa');
          const ipaStr = first.ipa || first.phoneticIpa || w.phoneticIpa || w.ipa || '/ˈsoʊfə/';
          const meaningStr = first.vietnameseMeaning || first.vietnamese || w.vietnameseMeaning || w.meaning || 'ghế sô-pha';
          const levelStr = first.cefrLevel || first.level || w.cefrLevel || user.targetLevel || 'A2';

          setPreviewWord(wordStr);
          setPreviewIpa(ipaStr);
          setPreviewMeaning(meaningStr);
          setPreviewLevel(levelStr);
        } else {
          setPreviewWord('bookshelf');
          setPreviewIpa('/ˈbʊk.ʃelf/');
          setPreviewMeaning('kệ sách');
          setPreviewLevel(user.targetLevel || 'A2');
        }

        // Cập nhật tiến độ chuẩn hóa CEFR đồng bộ 100% với Web & Spring Boot CSDL
        const savedWords: any[] = bundle.savedWords || [];
        const certTypes: any[] = bundle.certTypes || [];
        const defaultThresholds: Record<string, number> = { A1: 1000, A2: 1000, B1: 20, B2: 30, C1: 50 };
        const tierMeta: Record<string, { label: string; color: string }> = {
          A1: { label: 'Sơ cấp', color: '#059669' },
          A2: { label: 'Cơ bản', color: '#D97706' },
          B1: { label: 'Trung cấp', color: '#4F46E5' },
          B2: { label: 'Nâng cao', color: '#7C3AED' },
          C1: { label: 'Tinh anh', color: '#B45309' },
        };

        const userLvl = (user.targetLevel || 'A2').toUpperCase();
        const breakdowns: any[] = targetProgress?.levelBreakdowns || [];

        // Tính toán từ vựng cho từng level: ưu tiên breakdowns từ backend, fallback trực tiếp từ savedWords
        const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
        const updatedTiers: TierStatus[] = levels.map((lvl) => {
          const b = breakdowns.find((x: any) => (x.level || '').toUpperCase() === lvl);
          const ct = certTypes.find((t: any) => (t.cefrLevel || t.typeCode || '').toUpperCase() === lvl);

          // Ngưỡng yêu cầu: lấy từ certTypes DB -> breakdowns -> defaultThresholds
          const lvlReq = ct?.requiredWords && ct.requiredWords > 0
            ? ct.requiredWords
            : (b?.requiredWords && b.requiredWords > 0 ? b.requiredWords : (defaultThresholds[lvl] || 1000));

          // Số từ thành thạo: từ breakdowns hoặc đếm trực tiếp từ savedWords (status === 'MASTERED')
          const wordsAtLvl = savedWords.filter((w: any) => (w.cefrLevel || w.level || 'A2').toUpperCase() === lvl);
          const masteredFromWords = wordsAtLvl.filter((w: any) => String(w.status).toUpperCase() === 'MASTERED').length;
          const lvlMastered = b && b.masteredCount !== undefined && b.masteredCount !== null ? b.masteredCount : masteredFromWords;

          const lvlPct = lvlReq > 0 ? Math.min(100, Math.round((lvlMastered / lvlReq) * 100)) : 0;
          const isComplete = lvlPct >= 100;
          const isActive = lvl === userLvl;

          return {
            code: lvl,
            label: tierMeta[lvl]?.label || 'Chuẩn',
            mastered: lvlMastered,
            required: lvlReq,
            progress: `${lvlPct}%`,
            pctNumber: lvlPct,
            color: tierMeta[lvl]?.color || T.brand,
            status: isComplete ? 'complete' : isActive ? 'active' : 'future',
          };
        });

        // Current level mastery summary
        const currentTier = updatedTiers.find((t) => t.code === userLvl) || updatedTiers[1];
        const mastered = currentTier.mastered;
        const threshold = currentTier.required;
        const totalSaved = savedWords.length > 0 ? savedWords.length : (targetProgress?.totalWordsAtLevel || 18);
        const remaining = Math.max(0, threshold - mastered);
        const pct = currentTier.pctNumber;

        setMasteredWords(mastered);
        setCollectionWords(totalSaved);
        setTotalTargetWords(threshold);
        setRemainingWordsToTarget(remaining);
        setCompletionPercentage(pct);
        setTiers(updatedTiers);
      }

      // --- Leaderboard ---
      if (lbRes.status === 'fulfilled') {
        const data = lbRes.value.data || {};
        const top: any[] = data.topUsers || [];
        const podium: any[] = data.podium || [];
        const all = [...podium];
        for (const u of top) {
          if (!all.find((x) => x.userId === u.userId)) all.push(u);
        }
        all.sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
        setWeeklyTopThree(
          all.slice(0, 3).map((item) => ({
            rank: item.rank ?? 1,
            name: item.isCurrentUser ? `${item.fullName || item.username} (Bạn)` : (item.fullName || item.username || 'Học viên'),
            level: item.targetLevel || 'A2',
            streak: item.streakCount ?? 0,
            xp: item.xp ?? 0,
            isMe: item.isCurrentUser === true,
          }))
        );
      }

      // --- Arena hero stage from captures ---
      if (capturesRes.status === 'fulfilled') {
        const rawCaptures: any[] = Array.isArray(capturesRes.value) ? capturesRes.value : (capturesRes.value as any)?.data || [];
        let heroStage: HeroStage | null = null;
        for (const c of rawCaptures) {
          let detected: any[] = [];
          if (Array.isArray(c.detectedObjects)) detected = c.detectedObjects;
          else if (typeof c.detectedObjects === 'string') {
            try { detected = JSON.parse(c.detectedObjects); } catch (_) {}
          }
          if (detected.length > 0) {
            const first = detected[0];
            const word = (first?.word || first?.name || '').toString();
            if (word && word !== 'object') {
              const conf = first.confidence != null ? `${Math.round(first.confidence * 100)}%` : '96%';
              heroStage = {
                id: c.id?.toString() ?? '',
                title: c.sceneTheme?.toString() ?? 'Bối cảnh đời thực của bạn',
                imageUrl: c.base64DataUrl || c.imageUrl?.toString() || '',
                badge: 'ẢNH CỦA BẠN',
                firstWord: word,
                confidence: conf,
              };
              break;
            }
          }
        }
        setFeaturedHeroStage(heroStage ?? {
          id: 'stage-admin-kitchen',
          title: 'Gian Bếp Đời Thực',
          imageUrl: '',
          badge: 'ĐẤU TRƯỜNG THỊ GIÁC TUẦN',
          firstWord: 'refrigerator',
          confidence: '96%',
        });
      }
    } catch (_) {}
    finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDatabaseData();
    }, [fetchDatabaseData])
  );

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToastMessage(null));
    }, 3200);
  };

  // ── Speak word ─────────────────────────────────────────────────────────────
  const playWordAudio = () => {
    if (!previewWord) return;
    setIsSpeaking(true);
    showToast(`Đang phát âm chuẩn bản ngữ: ${previewWord}`);
    try {
      Speech.stop();
      Speech.speak(previewWord, { language: 'en-US', rate: 0.85 });
    } catch (_) {}
    setTimeout(() => setIsSpeaking(false), 900);
  };

  // ── SRS Spaced Repetition Review Handlers ──────────────────────────────────
  const startReviewSession = () => {
    if (dueCardsList.length === 0) {
      showToast('Tuyệt vời! Bạn đã hoàn thành tất cả thẻ cần ôn hôm nay.');
      return;
    }
    setReviewCardIndex(0);
    setIsReviewFlipped(false);
    setIsReviewModalVisible(true);
  };

  const closeReviewSession = () => {
    setIsReviewModalVisible(false);
    setIsReviewFlipped(false);
  };

  const handleSpeakReviewWord = (wordText: string) => {
    if (!wordText) return;
    try {
      Speech.stop();
      Speech.speak(wordText, { language: 'en-US', rate: 0.9 });
    } catch (_) {}
  };

  const submitReviewGrade = async (grade: number) => {
    if (isSubmittingReview) return;
    const currentCard = dueCardsList[reviewCardIndex];
    if (!currentCard) return;

    setIsSubmittingReview(true);
    try {
      const cardId = currentCard.id || currentCard.progressId;
      const cardText = typeof currentCard.word === 'string'
        ? currentCard.word
        : (currentCard.word?.word || currentCard.wordText || previewWord);

      await srsService.submitReview({
        progressId: cardId ? String(cardId) : undefined,
        wordText: cardText,
        ratingGrade: grade,
        reviewType: 'FLASHCARD',
      });
    } catch (err) {
      console.warn('SRS review submit error:', err);
    } finally {
      setIsSubmittingReview(false);
    }

    if (reviewCardIndex < dueCardsList.length - 1) {
      setReviewCardIndex((prev) => prev + 1);
      setIsReviewFlipped(false);
    } else {
      setIsReviewModalVisible(false);
      setIsReviewFlipped(false);
      showToast('Chúc mừng! Bạn đã hoàn thành tất cả thẻ cần ôn hôm nay.');
      fetchDatabaseData();
    }
  };

  // ── Avatar initials ─────────────────────────────────────────────────────────
  const initials = userFullName.trim()
    ? userFullName.trim().split(' ').map((w) => w[0] || '').slice(0, 2).join('').toUpperCase()
    : 'LN';

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION RENDERS
  // ──────────────────────────────────────────────────────────────────────────

  const renderTopBar = () => (
    <View style={[styles.topBar, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24) + 6 }]}>
      <TouchableOpacity
        style={styles.topBarUser}
        onPress={() => navigation.navigate('Profile')}
        activeOpacity={0.75}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ marginLeft: 9 }}>
          <Text style={styles.topBarGreeting}>CHÀO BUỔI SÁNG</Text>
          <Text style={styles.topBarName}>{userFullName || 'Học viên'}</Text>
        </View>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', gap: 6 }}>
        {/* Streak badge */}
        <TouchableOpacity
          style={styles.metricBadge}
          onPress={() => showToast(`Bạn đã duy trì chuỗi học ${streakCount} ngày liên tiếp.`)}
        >
          <Ionicons name="flame" size={14} color={T.amber} />
          <Text style={[styles.metricBadgeText, { color: T.amber }]}>{streakCount} ngày</Text>
        </TouchableOpacity>
        {/* Level badge */}
        <TouchableOpacity
          style={styles.metricBadge}
          onPress={() => showToast(`Mục tiêu hiện tại: Chuẩn CEFR ${targetLevel}.`)}
        >
          <Ionicons name="radio-button-on" size={14} color={T.brand} />
          <Text style={[styles.metricBadgeText, { color: T.brand, fontFamily: 'monospace' }]}>{targetLevel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Hero SM-2 Review Banner ─────────────────────────────────────────────────
  const renderReviewHero = () => (
    <View style={styles.heroCard}>
      {/* Organic contour overlay (simplified) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.heroContour1} />
        <View style={styles.heroContour2} />
      </View>

      <View style={{ padding: 17 }}>
        {/* Tag row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.heroMonoTag}>ÔN TẬP HÔM NAY · SM-2</Text>
          <View style={styles.heroPriorityBadge}>
            <Text style={styles.heroPriorityText}>Ưu tiên</Text>
          </View>
        </View>

        {/* Due words count */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 10 }}>
          <Text style={styles.heroDueCount}>{dueWordsCount}</Text>
          <Text style={styles.heroDueLabel}> từ cần ôn</Text>
        </View>
        <Text style={styles.heroSubtitle}>
          {dueWordsCount > 0
            ? 'Khoảng cách ngắt quãng đã đến hạn. Dành 5 phút để ghi nhớ vĩnh viễn.'
            : 'Hôm nay bạn không có thẻ nào tồn đọng. Hãy tiếp tục duy trì chuỗi học tập!'}
        </Text>

        {/* Word preview or empty card */}
        <View style={{ marginTop: 12 }}>
          {dueWordsCount > 0 ? renderWordPreviewCard() : renderEmptyDueCard()}
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.heroCta}
          onPress={() => (dueWordsCount > 0 ? startReviewSession() : navigation.navigate('Scanner'))}
          activeOpacity={0.85}
        >
          <Text style={styles.heroCtaText}>
            {dueWordsCount > 0 ? `Bắt đầu ôn tập (${dueWordsCount} từ)` : 'Khám phá & Quét từ mới'}
          </Text>
          <Ionicons name="arrow-forward" size={16} color={T.ink} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyDueCard = () => (
    <View style={styles.wordPreviewBox}>
      <View style={styles.emptyDueIcon}>
        <Ionicons name="checkmark-circle-outline" size={18} color="#059669" />
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={styles.wordPreviewTitle}>Tuyệt vời! Không còn thẻ đến hạn</Text>
        <Text style={styles.wordPreviewSub}>Đã ôn tập xong thẻ SM-2 hôm nay. Hãy quét thêm ảnh đời thực để nạp từ mới.</Text>
      </View>
    </View>
  );

  const renderWordPreviewCard = () => (
    <TouchableOpacity
      style={styles.wordPreviewBox}
      onPress={startReviewSession}
      activeOpacity={0.88}
    >
      {/* Top row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.wordPreviewTag}>TỪ XEM TRƯỚC · CHẠM ĐỂ ÔN TẬP</Text>
        <TouchableOpacity onPress={playWordAudio}>
          <Ionicons
            name="volume-high"
            size={16}
            color={isSpeaking ? T.amber : T.brand}
            style={{ transform: [{ scale: isSpeaking ? 1.25 : 1 }] }}
          />
        </TouchableOpacity>
      </View>
      {/* CEFR + word */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <View style={styles.wordPreviewLevelBadge}>
          <Text style={styles.wordPreviewLevelText}>{previewLevel}</Text>
        </View>
        <Text style={[styles.wordPreviewWord, { marginLeft: 6 }]}>{previewWord}</Text>
      </View>
      {/* IPA + meaning */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <Text style={styles.wordPreviewIpa}>{previewIpa}</Text>
        <View style={styles.wordPreviewDivider} />
        <Text style={styles.wordPreviewMeaning}>{previewMeaning}</Text>
      </View>
    </TouchableOpacity>
  );

  // ── Quick Actions Grid ──────────────────────────────────────────────────────
  const renderQuickActions = () => {
    const actions = [
      { icon: 'camera-outline', title: 'Quét Camera', subtitle: 'Nhận diện AI thế giới thực', tag: 'HOT', screen: 'Scanner' },
      { icon: 'images-outline', title: 'Bộ Sưu Tập', subtitle: 'Kho ảnh và từ theo không gian', tag: 'MỚI', screen: 'Collection' },
      { icon: 'albums-outline', title: 'Sổ Từ SM-2', subtitle: 'Kho thẻ nhớ của bạn', screen: 'Wordbook' },
      { icon: 'flash-outline', title: 'Đấu Trường', subtitle: 'Phản xạ qua ảnh thật', screen: 'Arena' },
      { icon: 'document-text-outline', title: 'Trích Xuất Văn Bản', subtitle: 'Bóc tách từ vựng tài liệu AI', tag: 'AI', screen: 'TextExtractor' },
      { icon: 'people-outline', title: 'Lớp Học', subtitle: 'Mã phòng & chia sẻ bộ từ', screen: 'Classroom' },
    ];

    const rows = [[actions[0], actions[1]], [actions[2], actions[3]], [actions[4], actions[5]]];

    return (
      <View>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionMono}>THAO TÁC NHANH</Text>
            <Text style={styles.sectionTitle}>Hôm nay bạn muốn học gì?</Text>
          </View>
          <Text style={styles.sectionCounter}>01—06</Text>
        </View>
        <View style={{ marginTop: 10, gap: 9 }}>
          {rows.map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', gap: 9 }}>
              {row.map((action, ci) => (
                <TouchableOpacity
                  key={ci}
                  style={styles.quickActionCard}
                  onPress={() => navigation.navigate(action.screen)}
                  activeOpacity={0.75}
                >
                  <View style={styles.quickActionIcon}>
                    <Ionicons name={action.icon as any} size={18} color={T.brand} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 9 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.quickActionTitle} numberOfLines={1}>{action.title}</Text>
                      {action.tag && (
                        <View style={styles.quickActionTag}>
                          <Text style={styles.quickActionTagText}>{action.tag}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.quickActionSub} numberOfLines={1}>{action.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ── Mastery Progress Card (Đồng bộ 100% với Web & Scandinavian Editorial) ──
  const renderMasteryProgressCard = () => (
    <View style={styles.card}>
      {/* Header Row */}
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionMono}>MỤC TIÊU CỦA BẠN</Text>
          <Text style={styles.sectionTitle}>Tiến bộ từ vựng {targetLevel}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
          <Text style={{ fontSize: 10, color: '#10B981', fontWeight: '600' }}>Thời gian thực</Text>
        </View>
      </View>

      {/* Main Stats Row: Mastered vs In Collection */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={styles.masteryBig}>{masteredWords}</Text>
          <Text style={styles.masteryLabel}> từ đã thành thạo</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={[styles.masteryBig, { fontSize: 18, color: T.ink }]}>{collectionWords}</Text>
          <Text style={styles.masteryLabel}> từ trong bộ sưu tập</Text>
        </View>
      </View>

      {/* Main Progress Bar */}
      <View style={[styles.progressTrack, { marginTop: 10, height: 6 }]}>
        <View style={[styles.progressFill, { width: `${Math.min(completionPercentage, 100)}%` as any }]} />
      </View>

      {/* Sub-info under progress bar */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: T.border }}>
        <Text style={{ fontSize: 10.5, color: T.muted }}>Đã thành thạo ({completionPercentage}%)</Text>
        <Text style={{ fontSize: 10.5, color: T.muted }}>Tiếp tục học thêm {remainingWordsToTarget} từ để đạt chuẩn</Text>
      </View>

      {/* CEFR Tiers Section Title */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
        <Text style={styles.sectionMono}>TIẾN ĐỘ TỪNG DẢI NĂNG LỰC & CHỨNG CHỈ CEFR</Text>
        <Text style={{ fontSize: 9, color: T.muted }}>Tự động ghi nhận</Text>
      </View>

      {/* 5-Tier Horizontal Cards Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
      >
        {tiers.map((tier) => {
          const isComplete = tier.status === 'complete';
          const isActive = tier.status === 'active';
          return (
            <View
              key={tier.code}
              style={[
                styles.tierCardBox,
                isActive && styles.tierCardBoxActive,
                isComplete && styles.tierCardBoxComplete,
              ]}
            >
              {/* Tier Header: Code + Label */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.tierCodeText, isActive && { color: T.brand }]}>{tier.code}</Text>
                <Text style={styles.tierLabelText}>{tier.label}</Text>
              </View>

              {/* Mini Progress Bar */}
              <View style={styles.miniProgressTrack}>
                <View
                  style={[
                    styles.miniProgressFill,
                    { backgroundColor: tier.color, width: `${Math.min(tier.pctNumber, 100)}%` as any },
                  ]}
                />
              </View>

              {/* Progress Count & Percent */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.tierCountText}>{tier.mastered}/{tier.required} từ</Text>
                <Text style={styles.tierPctText}>{tier.progress}</Text>
              </View>

              {/* Action Button: Preview Draft / Claim Certificate */}
              <TouchableOpacity
                style={[
                  styles.tierBtn,
                  isComplete ? styles.tierBtnClaim : styles.tierBtnPreview,
                ]}
                activeOpacity={0.7}
                onPress={() => {
                  setPreviewCertData({
                    code: tier.code,
                    label: tier.label,
                    mastered: tier.mastered,
                    required: tier.required,
                    pctNumber: tier.pctNumber,
                    isComplete: tier.pctNumber >= 100,
                    color: tier.color,
                  });
                  setShowCertPreviewModal(true);
                }}
              >
                <Ionicons
                  name={isComplete ? 'ribbon-outline' : 'eye-outline'}
                  size={10}
                  color={isComplete ? '#065F46' : T.muted}
                />
                <Text style={[styles.tierBtnText, isComplete && { color: '#065F46', fontWeight: 'bold' }]}>
                  {isComplete ? 'Chứng chỉ' : 'Xem trước'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  // ── Visual Arena Section ────────────────────────────────────────────────────
  const renderVisualArenaSection = () => {
    const hero = featuredHeroStage;
    return (
      <View>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionMono}>THỬ THÁCH MỖI NGÀY</Text>
            <Text style={styles.sectionTitle}>Khám phá bối cảnh đời thật</Text>
          </View>
          <Text style={styles.sectionCounter}>60 GIÂY</Text>
        </View>
        <View style={{ marginTop: 10 }}>
          {!hero ? (
            <View style={[styles.card, { alignItems: 'center', paddingVertical: 24 }]}>
              <View style={styles.arenaEmptyIcon}>
                <Ionicons name="camera-outline" size={24} color={T.brand} />
              </View>
              <Text style={[styles.sectionTitle, { marginTop: 12, textAlign: 'center' }]}>Chưa có bối cảnh thực tế trong CSDL</Text>
              <Text style={[styles.sectionMono, { color: T.muted, marginTop: 6, textAlign: 'center', fontWeight: 'normal', textTransform: 'none', letterSpacing: 0, fontSize: 11, lineHeight: 16 }]}>
                Chụp hoặc tải ảnh không gian sống để AI nhận diện đồ vật và tạo sàn đấu phản xạ thị giác.
              </Text>
              <TouchableOpacity
                style={[styles.heroCta, { backgroundColor: T.ink, marginTop: 14, paddingHorizontal: 16, height: 38 }]}
                onPress={() => navigation.navigate('Scanner')}
              >
                <Ionicons name="camera" size={14} color="#fff" />
                <Text style={[styles.heroCtaText, { color: '#fff', fontSize: 11 }]}>Chụp ảnh bối cảnh ngay</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.arenaHeroBox}>
              {/* Image */}
              {hero.imageUrl ? (
                <Image
                  source={{ uri: hero.imageUrl.startsWith('data:') || hero.imageUrl.startsWith('http') ? hero.imageUrl : `${BASE_URL}${hero.imageUrl}` }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  defaultSource={require('../../assets/icon.png')}
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: '#D8D0C3', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="image-outline" size={36} color={T.muted} />
                </View>
              )}
              {/* Dark smooth gradient overlay */}
              <View style={styles.arenaGradient} />

              {/* Bottom info + CTA */}
              <View style={styles.arenaBottomRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View style={styles.arenaBadgePill}>
                    <Ionicons name="sparkles" size={10} color={T.goldAccent} />
                    <Text style={styles.arenaBadgeText}>{hero.badge}</Text>
                  </View>
                  <Text style={styles.arenaTitle} numberOfLines={1}>
                    {hero.title}
                  </Text>
                  <Text style={styles.arenaSubTitle}>
                    Thử thách phản xạ tìm đồ vật · 60s Speedrun
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.arenaEnterBtn}
                  onPress={() => navigation.navigate('Arena')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.arenaEnterBtnText}>Vào thi</Text>
                  <Ionicons name="arrow-forward" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ── Weekly Leaderboard ──────────────────────────────────────────────────────
  const renderWeeklyLeaderboard = () => (
    <View>
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionMono}>CỘNG ĐỒNG HỌC VIÊN</Text>
          <Text style={styles.sectionTitle}>Xếp hạng tuần</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}>
          <Text style={[styles.sectionMono, { color: T.brand, fontWeight: 'bold' }]}>TOP 3 →</Text>
        </TouchableOpacity>
      </View>
      <View style={{ marginTop: 10 }}>
        {weeklyTopThree.length === 0 ? (
          <View style={[styles.card, { alignItems: 'center', paddingVertical: 20 }]}>
            <Ionicons name="trophy-outline" size={28} color={T.faint} />
            <Text style={[styles.sectionTitle, { marginTop: 8, fontSize: 13 }]}>Chưa có dữ liệu xếp hạng tuần này</Text>
            <Text style={{ fontSize: 10.5, color: T.muted, textAlign: 'center', marginTop: 3 }}>
              Hãy tham gia Đấu trường Speedrun để ghi điểm và vươn lên Top 1!
            </Text>
          </View>
        ) : (
          <View style={styles.card}>
            {weeklyTopThree.map((user, idx) => {
              const rankColor = user.rank === 1 ? T.goldAccent : user.rank === 2 ? '#E2E8F0' : '#FED7AA';
              const rankTextColor = user.rank === 1 ? T.ink : T.muted;
              return (
                <View
                  key={idx}
                  style={[
                    styles.lbRow,
                    idx < weeklyTopThree.length - 1 && { marginBottom: 8 },
                    user.rank === 1 && styles.lbRowTop,
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.lbRankBadge, { backgroundColor: rankColor }]}>
                      <Text style={[styles.lbRankText, { color: rankTextColor }]}>#{user.rank}</Text>
                    </View>
                    <View style={{ marginLeft: 8 }}>
                      <Text style={[styles.lbName, user.isMe && { color: T.brand }]}>{user.name}</Text>
                      <Text style={styles.lbSub}>{user.level} · {user.streak} ngày chuỗi</Text>
                    </View>
                  </View>
                  <Text style={styles.lbXp}>{user.xp} XP</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );

  // ── Footer sync ─────────────────────────────────────────────────────────────
  const renderFooter = () => (
    <View style={styles.footer}>
      <Text style={styles.footerBrand}>VOCARIO</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={styles.footerDot} />
        <Text style={styles.footerText}>Đồng bộ CSDL PostgreSQL 17</Text>
      </View>
    </View>
  );

  // ── Certificate Preview Modal ──────────────────────────────────────────────
  const renderCertPreviewModal = () => {
    if (!previewCertData) return null;
    const isOfficial = previewCertData.isComplete;
    const studentName = userFullName || 'Học viên Vocario';
    const certCode = `VOC-2026-${previewCertData.code}-${isOfficial ? 'OFFICIAL' : 'DRAFT'}`;
    const todayStr = new Date().toLocaleDateString('vi-VN');

    return (
      <Modal
        transparent
        visible={showCertPreviewModal}
        animationType="fade"
        onRequestClose={() => setShowCertPreviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.certModalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Top Ribbon */}
              <View style={styles.certModalTopRow}>
                <View
                  style={[
                    styles.certModalRibbon,
                    !isOfficial && { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
                  ]}
                >
                  <Ionicons
                    name={isOfficial ? 'checkmark-circle' : 'time-outline'}
                    size={14}
                    color={isOfficial ? '#15803D' : '#B45309'}
                  />
                  <Text
                    style={[
                      styles.certModalRibbonText,
                      !isOfficial && { color: '#B45309' },
                    ]}
                  >
                    {isOfficial ? 'CHỨNG CHỈ CEFR CHÍNH THỨC' : `BẢN NHÁP CHỨNG CHỈ (${previewCertData.pctNumber}%)`}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setShowCertPreviewModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={20} color={T.ink} />
                </TouchableOpacity>
              </View>

              {/* Gold Seal */}
              <View style={styles.certModalSealWrap}>
                <View style={[styles.certModalSeal, !isOfficial && { borderColor: '#D97706', backgroundColor: '#FFFBEB' }]}>
                  <Ionicons
                    name={isOfficial ? 'ribbon' : 'medal-outline'}
                    size={32}
                    color={isOfficial ? '#059669' : '#D97706'}
                  />
                </View>
              </View>

              <Text style={styles.certModalOrg}>HỘI ĐỒNG HỌC THUẬT VOCARIO</Text>
              <Text style={styles.certModalTitle}>
                {isOfficial ? 'CHỨNG NHẬN NĂNG LỰC TỪ VỰNG' : 'BẢN NHÁP XÁC NHẬN NĂNG LỰC'}
              </Text>

              <Text style={styles.certModalItalic}>Chứng nhận dành cho học viên:</Text>
              <Text style={styles.certModalName}>{studentName}</Text>

              <View style={[styles.certModalLevelBadge, { borderColor: previewCertData.color }]}>
                <Text style={[styles.certModalLevelText, { color: previewCertData.color }]}>
                  TRÌNH ĐỘ CEFR {previewCertData.code} — {previewCertData.label.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.certModalDesc}>
                {isOfficial
                  ? `Học viên đã xuất sắc làm chủ toàn diện ${previewCertData.mastered}/${previewCertData.required} từ vựng tiêu chuẩn CEFR ${previewCertData.code} qua hệ thống nhận diện AI Vision và chu kỳ lặp lại ngắt quãng SuperMemo SM-2.`
                  : `Hồ sơ tiến độ tích lũy: Hiện đã làm chủ ${previewCertData.mastered}/${previewCertData.required} từ vựng chuẩn CEFR ${previewCertData.code} (${previewCertData.pctNumber}%). Cần tiếp tục ôn tập thêm ${Math.max(0, previewCertData.required - previewCertData.mastered)} từ để kích hoạt cấp chứng chỉ chính thức.`}
              </Text>

              {/* Progress Summary Box */}
              <View style={styles.certModalProgressBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: T.ink }}>Tiến độ tích lũy:</Text>
                  <Text style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold', color: previewCertData.color }}>
                    {previewCertData.mastered} / {previewCertData.required} từ ({previewCertData.pctNumber}%)
                  </Text>
                </View>
                <View style={{ height: 6, backgroundColor: '#E5DFD4', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                  <View
                    style={{
                      height: '100%',
                      backgroundColor: previewCertData.color,
                      width: `${Math.min(previewCertData.pctNumber, 100)}%` as any,
                    }}
                  />
                </View>
              </View>

              <View style={styles.certModalDivider} />

              <View style={styles.certModalMetaRow}>
                <View>
                  <Text style={styles.certModalMetaLabel}>MÃ TRA CỨU:</Text>
                  <Text style={styles.certModalMetaValue}>{certCode}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.certModalMetaLabel}>{isOfficial ? 'NGÀY CẤP:' : 'NGÀY XEM TRƯỚC:'}</Text>
                  <Text style={styles.certModalMetaValueDark}>{todayStr}</Text>
                </View>
              </View>

              {isOfficial ? (
                <TouchableOpacity
                  style={[styles.certModalCloseBtn, { backgroundColor: '#059669', borderColor: '#059669', marginBottom: 8 }]}
                  onPress={() => {
                    setShowCertPreviewModal(false);
                    navigation.navigate('Profile');
                  }}
                >
                  <Text style={[styles.certModalCloseBtnText, { color: '#FFFFFF' }]}>Xem trong Hồ sơ & Tải về</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity style={styles.certModalCloseBtn} onPress={() => setShowCertPreviewModal(false)}>
                <Text style={styles.certModalCloseBtnText}>Đóng cửa sổ xem trước</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ── Flashcard Review Modal (SM-2 Spaced Repetition) ──────────────────────────
  const renderReviewModal = () => {
    if (!isReviewModalVisible) return null;
    const currentCard = dueCardsList[reviewCardIndex] || null;
    const totalDue = dueCardsList.length;

    if (!currentCard) return null;

    const cardWord = typeof currentCard.word === 'string'
      ? currentCard.word
      : (currentCard.word?.word || currentCard.wordText || previewWord || 'Vocab');
    const cardIpa = currentCard.ipa || currentCard.phoneticIpa || currentCard.word?.ipa || previewIpa || '/.../';
    const cardMeaning = currentCard.vietnameseMeaning || currentCard.vietnamese || currentCard.word?.vietnameseMeaning || previewMeaning || '';
    const cardLevel = (currentCard.cefrLevel || currentCard.level || currentCard.word?.cefrLevel || targetLevel || 'A2').toUpperCase();
    const cardExampleEn = currentCard.exampleSentenceEn || currentCard.exampleEn || currentCard.word?.exampleSentenceEn || '';
    const cardExampleVi = currentCard.exampleSentenceVi || currentCard.exampleVi || currentCard.word?.exampleSentenceVi || '';

    return (
      <Modal
        visible={isReviewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeReviewSession}
      >
        <View style={styles.reviewModalOverlay}>
          <View style={styles.reviewModalContainer}>
            {/* Modal Header */}
            <View style={styles.reviewModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={styles.reviewCounterChip}>
                  <Text style={styles.reviewCounterChipText}>
                    THẺ {reviewCardIndex + 1} / {totalDue}
                  </Text>
                </View>
                <View style={[styles.reviewLevelChip, { backgroundColor: '#FAF8F5' }]}>
                  <Text style={styles.reviewLevelChipText}>{cardLevel}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={closeReviewSession}
                style={styles.reviewCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={T.ink} />
              </TouchableOpacity>
            </View>

            {/* Flashcard Body */}
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={() => !isReviewFlipped && setIsReviewFlipped(true)}
              style={styles.reviewCardBody}
            >
              <Text style={styles.reviewCardWord}>{cardWord}</Text>
              <Text style={styles.reviewCardIpa}>{cardIpa}</Text>

              {/* Pronunciation Audio Button */}
              <TouchableOpacity
                style={styles.reviewAudioBtn}
                onPress={() => handleSpeakReviewWord(cardWord)}
                activeOpacity={0.75}
              >
                <Ionicons name="volume-medium-outline" size={16} color={T.brand} />
                <Text style={styles.reviewAudioBtnText}>Nghe phát âm</Text>
              </TouchableOpacity>

              {/* Flipped Section: Meaning & Context */}
              {isReviewFlipped ? (
                <View style={styles.reviewFlippedBox}>
                  <View style={styles.reviewDivider} />
                  <Text style={styles.reviewMeaningText}>{cardMeaning}</Text>

                  {Boolean(cardExampleEn) && (
                    <View style={styles.reviewExampleBox}>
                      <Text style={styles.reviewExampleEn}>“{cardExampleEn}”</Text>
                      {Boolean(cardExampleVi) && (
                        <Text style={styles.reviewExampleVi}>{cardExampleVi}</Text>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.reviewTapPrompt}>
                  <Ionicons name="hand-left-outline" size={14} color={T.faint} />
                  <Text style={styles.reviewTapPromptText}>Chạm để lật xem dịch nghĩa & ví dụ</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Bottom Actions */}
            {!isReviewFlipped ? (
              <TouchableOpacity
                style={styles.reviewFlipCta}
                onPress={() => setIsReviewFlipped(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
                <Text style={styles.reviewFlipCtaText}>Xem Dịch Nghĩa & Đánh Giá</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.reviewRatingsContainer}>
                <Text style={styles.reviewRatingTitle}>ĐÁNH GIÁ MỨC ĐỘ GHI NHỚ (SM-2)</Text>
                <View style={styles.reviewRatingButtonsRow}>
                  {/* Rating 1: Chưa nhớ */}
                  <TouchableOpacity
                    style={[styles.reviewRatingBtn, styles.reviewRatingBtnHard]}
                    onPress={() => submitReviewGrade(1)}
                    disabled={isSubmittingReview}
                  >
                    <Text style={[styles.reviewRatingBtnText, { color: '#DC2626' }]}>Chưa nhớ</Text>
                    <Text style={styles.reviewRatingBtnSub}>Lặp lại sớm</Text>
                  </TouchableOpacity>

                  {/* Rating 3: Nhớ tốt */}
                  <TouchableOpacity
                    style={[styles.reviewRatingBtn, styles.reviewRatingBtnGood]}
                    onPress={() => submitReviewGrade(3)}
                    disabled={isSubmittingReview}
                  >
                    <Text style={[styles.reviewRatingBtnText, { color: T.brand }]}>Nhớ tốt</Text>
                    <Text style={styles.reviewRatingBtnSub}>Đúng chu kỳ</Text>
                  </TouchableOpacity>

                  {/* Rating 5: Rất dễ */}
                  <TouchableOpacity
                    style={[styles.reviewRatingBtn, styles.reviewRatingBtnEasy]}
                    onPress={() => submitReviewGrade(5)}
                    disabled={isSubmittingReview}
                  >
                    <Text style={[styles.reviewRatingBtnText, { color: '#16A34A' }]}>Rất dễ</Text>
                    <Text style={styles.reviewRatingBtnSub}>Giãn cách dài</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Footer SM-2 notice */}
            <Text style={styles.reviewFooterNotice}>
              Thuật toán ngắt quãng SuperMemo SM-2 tự động đồng bộ tiến độ vào CSDL Cổng Học Tập.
            </Text>
          </View>
        </View>
      </Modal>
    );
  };

  // ── Toast ────────────────────────────────────────────────────────────────────
  const renderToast = () => {
    if (!toastMessage) return null;
    return (
      <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
        <View style={styles.toastIcon}>
          <Ionicons name="checkmark" size={14} color={T.brand} />
        </View>
        <Text style={styles.toastText} numberOfLines={2}>{toastMessage}</Text>
        <TouchableOpacity onPress={() => setToastMessage(null)}>
          <Ionicons name="close" size={15} color={T.muted} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ─── Main render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {renderTopBar()}
      {isLoading && <View style={styles.loadingBar} />}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchDatabaseData(); }}
            tintColor={T.brand}
            colors={[T.brand]}
          />
        }
      >
        {renderReviewHero()}
        <View style={{ height: 20 }} />
        {renderQuickActions()}
        <View style={{ height: 20 }} />
        {renderMasteryProgressCard()}
        <View style={{ height: 20 }} />
        {renderVisualArenaSection()}
        <View style={{ height: 20 }} />
        {renderWeeklyLeaderboard()}
        <View style={{ height: 20 }} />
        {renderFooter()}
      </ScrollView>

      {renderReviewModal()}
      {renderCertPreviewModal()}
      {renderToast()}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  loadingBar: { height: 2, backgroundColor: T.brand },

  // ── Top bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  topBarUser: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.brand,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  topBarGreeting: {
    fontSize: 8.5,
    fontFamily: 'monospace',
    color: T.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  topBarName: { fontSize: 15, fontFamily: 'serif', fontWeight: '600', color: T.ink },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 8,
    backgroundColor: T.field,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    gap: 4,
  },
  metricBadgeText: { fontSize: 10, fontWeight: '600' },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scrollContent: { paddingLeft: 16, paddingRight: 16, paddingTop: 6, paddingBottom: 96 },

  // ── Hero SM-2 Card ────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: T.brand,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6E5A47',
    overflow: 'hidden',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 4,
  },
  heroContour1: {
    position: 'absolute',
    right: -20,
    top: -10,
    width: 120,
    height: 200,
    borderRadius: 60,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.08)',
    transform: [{ rotate: '20deg' }],
  },
  heroContour2: {
    position: 'absolute',
    right: -10,
    top: -10,
    width: 100,
    height: 200,
    borderRadius: 60,
    borderWidth: 1.2,
    borderColor: 'rgba(255,255,255,0.06)',
    transform: [{ rotate: '30deg' }],
  },
  heroMonoTag: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: 'rgba(255,255,255,0.76)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroPriorityBadge: {
    backgroundColor: T.brandHover,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  heroPriorityText: { fontSize: 8.5, fontWeight: 'bold', color: T.goldAccent },
  heroDueCount: { fontSize: 29, fontFamily: 'serif', fontWeight: 'bold', color: T.goldAccent },
  heroDueLabel: { fontSize: 23, fontFamily: 'serif', fontWeight: '500', color: '#fff' },
  heroSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 16 },
  heroCta: {
    backgroundColor: T.goldAccent,
    borderRadius: 10,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  heroCtaText: { fontSize: 13, fontWeight: 'bold', color: T.ink },

  // ── Word preview box ──────────────────────────────────────────────────────
  wordPreviewBox: {
    backgroundColor: T.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  emptyDueIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(16,185,129,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordPreviewTitle: { fontSize: 13, fontFamily: 'serif', fontWeight: 'bold', color: T.ink },
  wordPreviewSub: { fontSize: 10, color: T.muted, marginTop: 2 },
  wordPreviewTag: { fontSize: 8, fontFamily: 'monospace', color: T.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
  wordPreviewLevelBadge: {
    backgroundColor: 'rgba(125,104,83,0.12)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  wordPreviewLevelText: { fontSize: 8.5, fontFamily: 'monospace', color: T.brand },
  wordPreviewWord: { fontSize: 16, fontFamily: 'serif', fontWeight: 'bold', color: T.ink },
  wordPreviewIpa: { fontSize: 9.5, fontFamily: 'monospace', color: T.muted },
  wordPreviewDivider: { width: 1, height: 10, backgroundColor: T.border, marginHorizontal: 6 },
  wordPreviewMeaning: { fontSize: 10, color: T.muted },

  // ── Section headers ───────────────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionMono: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: T.brand,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  sectionTitle: { fontSize: 16, fontFamily: 'serif', color: T.ink, marginTop: 2 },
  sectionCounter: { fontSize: 9, fontFamily: 'monospace', color: T.muted },
  sectionLink: { fontSize: 10, fontWeight: '600', color: T.brand, marginRight: 2 },

  // ── Quick actions ─────────────────────────────────────────────────────────
  quickActionCard: {
    flex: 1,
    height: 74,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: { fontSize: 11, fontWeight: '600', color: T.ink },
  quickActionSub: { fontSize: 8.5, color: T.muted, marginTop: 3, lineHeight: 12 },
  quickActionTag: {
    backgroundColor: 'rgba(200,131,50,0.14)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    marginLeft: 4,
  },
  quickActionTagText: { fontSize: 7, fontFamily: 'monospace', color: T.amber, fontWeight: 'bold' },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 15,
  },

  // ── Mastery progress ──────────────────────────────────────────────────────
  masteryCount: { flexDirection: 'row' },
  masteryBig: { fontSize: 24, fontFamily: 'serif', fontWeight: 'bold', color: T.ink },
  masteryLabel: { fontSize: 11.5, color: T.muted },
  masteryTotal: { fontSize: 13, color: T.muted },
  masterySub: { fontSize: 9, color: T.muted, marginTop: 2 },
  masteryPct: { fontSize: 8.5, fontFamily: 'monospace', color: T.brand, fontWeight: 'bold' },
  progressTrack: {
    height: 6,
    backgroundColor: '#E5DFD4',
    borderRadius: 999,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    backgroundColor: T.brand,
    borderRadius: 999,
  },
  tierCardBox: {
    width: 112,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  tierCardBoxActive: {
    borderColor: T.brand,
    borderWidth: 1.5,
    backgroundColor: '#FAF8F5',
  },
  tierCardBoxComplete: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: '#F0FDF4',
  },
  tierCodeText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.ink,
  },
  tierLabelText: {
    fontSize: 9.5,
    color: T.muted,
  },
  miniProgressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5DFD4',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  tierCountText: {
    fontSize: 9,
    color: T.muted,
  },
  tierPctText: {
    fontSize: 9.5,
    fontFamily: 'monospace',
    fontWeight: '600',
    color: T.ink,
  },
  tierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3.5,
    borderRadius: 3,
    gap: 3,
  },
  tierBtnPreview: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: T.border,
  },
  tierBtnClaim: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  tierBtnText: {
    fontSize: 9,
    color: T.ink,
    fontWeight: '500',
  },

  // ── Arena hero ────────────────────────────────────────────────────────────
  arenaEmptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arenaHeroBox: {
    height: 174,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D5CBBE',
    backgroundColor: '#E0D7CB',
    overflow: 'hidden',
  },
  arenaGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage:
            'linear-gradient(to bottom, transparent 30%, rgba(20, 18, 15, 0.88) 100%)',
        } as any)
      : { backgroundColor: 'rgba(20, 18, 15, 0.45)' }),
  },
  arenaBottomRow: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  arenaBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  arenaBadgeText: {
    fontSize: 8.5,
    fontFamily: 'monospace',
    color: T.goldAccent,
    letterSpacing: 0.8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  arenaTitle: {
    fontSize: 15,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  arenaSubTitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 2,
  },
  arenaEnterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  arenaEnterBtnText: { fontSize: 10.5, fontWeight: 'bold', color: '#FFFFFF' },

  // ── Leaderboard ───────────────────────────────────────────────────────────
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.field,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  lbRowTop: { backgroundColor: 'rgba(254,249,195,0.35)', borderColor: T.goldAccent },
  lbRankBadge: { width: 24, height: 24, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  lbRankText: { fontSize: 10, fontWeight: 'bold' },
  lbName: { fontSize: 11, fontWeight: 'bold', color: T.ink },
  lbSub: { fontSize: 8.5, fontFamily: 'monospace', color: T.muted },
  lbXp: { fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold', color: T.brand },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerBrand: { fontSize: 8, fontFamily: 'monospace', color: T.brand, letterSpacing: 1.5, textTransform: 'uppercase' },
  footerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 5 },
  footerText: { fontSize: 8, color: T.muted },

  // ── Toast ─────────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute',
    top: 12,
    left: 18,
    right: 18,
    backgroundColor: T.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    gap: 9,
  },
  toastIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(125,104,83,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: { flex: 1, fontSize: 10, color: T.ink, lineHeight: 14 },

  // ── Certificate Preview Modal ─────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45,40,35,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  certModalBox: {
    width: '100%',
    maxHeight: '88%',
    backgroundColor: '#FCFAF6',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: T.amber,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  certModalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  certModalRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(200,131,50,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(200,131,50,0.3)',
  },
  certModalRibbonText: {
    fontSize: 9.5,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    color: T.amber,
    letterSpacing: 0.5,
  },
  certModalSealWrap: {
    alignItems: 'center',
    marginVertical: 6,
  },
  certModalSeal: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFBEB',
    borderWidth: 2,
    borderColor: T.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certModalOrg: {
    textAlign: 'center',
    fontSize: 9.5,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    color: T.brand,
    fontWeight: 'bold',
    marginTop: 6,
  },
  certModalTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 2,
  },
  certModalItalic: {
    textAlign: 'center',
    fontStyle: 'italic',
    fontSize: 11,
    color: T.muted,
    marginTop: 10,
  },
  certModalName: {
    textAlign: 'center',
    fontSize: 19,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 2,
  },
  certModalLevelBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: T.brand,
    backgroundColor: '#FFFFFF',
    marginTop: 10,
  },
  certModalLevelText: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  certModalDesc: {
    textAlign: 'center',
    fontSize: 11,
    color: '#5C5249',
    lineHeight: 16,
    marginTop: 10,
    paddingHorizontal: 8,
  },
  certModalProgressBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  certModalDivider: {
    height: 1,
    backgroundColor: T.border,
    marginVertical: 14,
  },
  certModalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  certModalMetaLabel: {
    fontSize: 8.5,
    fontFamily: 'monospace',
    color: T.muted,
    letterSpacing: 0.5,
  },
  certModalMetaValue: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.brand,
    marginTop: 2,
  },
  certModalMetaValueDark: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 2,
  },
  certModalCloseBtn: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  certModalCloseBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: T.ink,
  },

  // ── Flashcard Review Modal Styles ───────────────────────────────────────────
  reviewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reviewModalContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  reviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  reviewCounterChip: {
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reviewCounterChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: T.brand,
    letterSpacing: 0.5,
  },
  reviewLevelChip: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reviewLevelChipText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: T.muted,
  },
  reviewCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewCardBody: {
    backgroundColor: T.field,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    padding: 20,
    alignItems: 'center',
    marginVertical: 14,
  },
  reviewCardWord: {
    fontSize: 28,
    fontWeight: 'bold',
    color: T.ink,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  reviewCardIpa: {
    fontSize: 13,
    color: T.muted,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  reviewAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 12,
  },
  reviewAudioBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: T.brand,
  },
  reviewTapPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    paddingTop: 10,
  },
  reviewTapPromptText: {
    fontSize: 11,
    color: T.faint,
    fontStyle: 'italic',
  },
  reviewFlippedBox: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  reviewDivider: {
    width: '100%',
    height: 1,
    backgroundColor: T.border,
    marginBottom: 12,
  },
  reviewMeaningText: {
    fontSize: 18,
    fontWeight: '700',
    color: T.brand,
    textAlign: 'center',
  },
  reviewExampleBox: {
    backgroundColor: T.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    marginTop: 10,
    width: '100%',
  },
  reviewExampleEn: {
    fontSize: 12.5,
    fontStyle: 'italic',
    color: T.ink,
    lineHeight: 18,
  },
  reviewExampleVi: {
    fontSize: 11.5,
    color: T.muted,
    marginTop: 4,
    lineHeight: 16,
  },
  reviewFlipCta: {
    backgroundColor: T.brand,
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reviewFlipCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  reviewRatingsContainer: {
    width: '100%',
  },
  reviewRatingTitle: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: T.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
  reviewRatingButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reviewRatingBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewRatingBtnHard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  reviewRatingBtnGood: {
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
  },
  reviewRatingBtnEasy: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  reviewRatingBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewRatingBtnSub: {
    fontSize: 9,
    color: T.muted,
    marginTop: 2,
  },
  reviewFooterNotice: {
    fontSize: 9,
    color: T.faint,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 13,
  },
});

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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useNavigation } from '@react-navigation/native';
import { apiClient, BASE_URL } from '../api/client';
import { authService, visionService } from '../api/services';

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
interface TierStatus { code: string; progress: string; status: 'complete' | 'active' | 'future'; }
interface LeaderboardUser { rank: number; name: string; level: string; streak: number; xp: number; isMe: boolean; }
interface HeroStage {
  id: string; title: string; imageUrl: string;
  badge: string; firstWord: string; confidence: string;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // User state
  const [userFullName, setUserFullName] = useState('');
  const [targetLevel, setTargetLevel] = useState('A2');
  const [streakCount, setStreakCount] = useState(0);
  const [dueWordsCount, setDueWordsCount] = useState(0);

  // Word preview
  const [previewWord, setPreviewWord] = useState('');
  const [previewIpa, setPreviewIpa] = useState('');
  const [previewMeaning, setPreviewMeaning] = useState('');
  const [previewLevel, setPreviewLevel] = useState('A2');

  // Mastery
  const [masteredWords, setMasteredWords] = useState(0);
  const [totalTargetWords, setTotalTargetWords] = useState(0);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [tiers, setTiers] = useState<TierStatus[]>([
    { code: 'A1', progress: '0%', status: 'future' },
    { code: 'A2', progress: '0%', status: 'active' },
    { code: 'B1', progress: '0%', status: 'future' },
    { code: 'B2', progress: '0%', status: 'future' },
    { code: 'C1', progress: '0%', status: 'future' },
  ]);

  // Leaderboard
  const [weeklyTopThree, setWeeklyTopThree] = useState<LeaderboardUser[]>([]);

  // Arena
  const [featuredHeroStage, setFeaturedHeroStage] = useState<HeroStage | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

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

        // Cập nhật tiến độ chuẩn hóa CEFR theo đúng chuẩn Web & Spring Boot
        const cefrThresholds: Record<string, number> = { A1: 500, A2: 1000, B1: 2000, B2: 4000, C1: 8000 };
        const userLvl = (user.targetLevel || 'A2').toUpperCase();
        const threshold = targetProgress?.masteryThreshold || cefrThresholds[userLvl] || 1000;
        const rawMastered = targetProgress?.masteredWordsAtLevel ?? 0;
        const totalMasteredFromBreakdowns = targetProgress?.levelBreakdowns?.reduce((sum: number, b: any) => sum + (b.masteredCount || 0), 0) ?? 0;
        const mastered = rawMastered > 0 ? rawMastered : totalMasteredFromBreakdowns;
        const pct = targetProgress?.completionPercentage ?? (threshold > 0 ? Math.min(100, Math.round((mastered / threshold) * 100)) : 0);

        setMasteredWords(mastered);
        setTotalTargetWords(threshold);
        setCompletionPercentage(pct);

        const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
        const breakdowns: any[] = targetProgress?.levelBreakdowns || [];
        setTiers(levels.map((lvl) => {
          const b = breakdowns.find((x: any) => (x.level || '').toUpperCase() === lvl);
          const lvlMastered = b?.masteredCount ?? (lvl === userLvl ? mastered : 0);
          const lvlReq = b?.requiredWords ?? (cefrThresholds[lvl] || 1000);
          const lvlPct = b?.completionPercentage ?? (lvlReq > 0 ? Math.min(100, Math.round((lvlMastered / lvlReq) * 100)) : 0);
          const isComplete = lvlPct >= 100;
          const isActive = lvl === userLvl;
          return {
            code: lvl,
            progress: `${lvlPct}%`,
            status: isComplete ? 'complete' : isActive ? 'active' : 'future',
          };
        }));
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

  useEffect(() => { fetchDatabaseData(); }, [fetchDatabaseData]);

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

  // ── Avatar initials ─────────────────────────────────────────────────────────
  const initials = userFullName.trim()
    ? userFullName.trim().split(' ').map((w) => w[0] || '').slice(0, 2).join('').toUpperCase()
    : 'LN';

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION RENDERS
  // ──────────────────────────────────────────────────────────────────────────

  const renderTopBar = () => (
    <View style={styles.topBar}>
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
          onPress={() => navigation.navigate(dueWordsCount > 0 ? 'Wordbook' : 'Scanner')}
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
    <View style={styles.wordPreviewBox}>
      {/* Top row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.wordPreviewTag}>TỪ XEM TRƯỚC</Text>
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
    </View>
  );

  // ── Quick Actions Grid ──────────────────────────────────────────────────────
  const renderQuickActions = () => {
    const actions = [
      { icon: 'camera-outline', title: 'Quét Camera', subtitle: 'Nhận diện AI thế giới thực', tag: 'HOT', screen: 'Scanner' },
      { icon: 'images-outline', title: 'Bộ Sưu Tập', subtitle: 'Kho ảnh và từ theo không gian', tag: 'MỚI', screen: 'Collection' },
      { icon: 'albums-outline', title: 'Sổ Từ SM-2', subtitle: 'Kho thẻ nhớ của bạn', screen: 'Wordbook' },
      { icon: 'flash-outline', title: 'Đấu Trường', subtitle: 'Phản xạ qua ảnh thật', screen: 'Arena' },
      { icon: 'document-text-outline', title: 'Trích Xuất Văn Bản', subtitle: 'Bóc tách từ vựng tài liệu AI', tag: 'AI', screen: 'TextExtractor' },
      { icon: 'people-outline', title: 'Lớp Học Ảo', subtitle: 'Mã phòng & chia sẻ bộ từ', screen: 'Classroom' },
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

  // ── Mastery Progress Card ───────────────────────────────────────────────────
  const renderMasteryProgressCard = () => (
    <View style={styles.card}>
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionMono}>KHUNG NĂNG LỰC CHUẨN</Text>
          <Text style={styles.sectionTitle}>Tiến độ chuẩn hóa {targetLevel}</Text>
        </View>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center' }}
          onPress={() => showToast('Chi tiết khung CEFR đang đồng bộ CSDL.')}
        >
          <Text style={styles.sectionLink}>Chi tiết</Text>
          <Ionicons name="arrow-forward" size={12} color={T.brand} />
        </TouchableOpacity>
      </View>

      {/* Count row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 }}>
        <View>
          <Text style={styles.masteryCount}>
            <Text style={styles.masteryBig}>{masteredWords}</Text>
            <Text style={styles.masteryTotal}> / {totalTargetWords} từ</Text>
          </Text>
          <Text style={styles.masterySub}>đã thuộc vĩnh viễn</Text>
        </View>
        <Text style={styles.masteryPct}>{completionPercentage}% HOÀN THÀNH</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(completionPercentage, 100)}%` as any }]} />
      </View>

      {/* 5-tier grid */}
      <View style={{ flexDirection: 'row', marginTop: 12 }}>
        {tiers.map((tier) => {
          const isComplete = tier.status === 'complete';
          const isActive = tier.status === 'active';
          return (
            <View
              key={tier.code}
              style={[
                styles.tierCell,
                isComplete && styles.tierCellComplete,
                isActive && styles.tierCellActive,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {isComplete && <Ionicons name="checkmark" size={9} color="#5F765E" style={{ marginRight: 1 }} />}
                <Text style={[
                  styles.tierCode,
                  isComplete && { color: '#5F765E' },
                  isActive && { color: T.brand },
                  !isComplete && !isActive && { color: T.muted },
                ]}>{tier.code}</Text>
              </View>
              <Text style={[styles.tierPct, isComplete && { color: '#5F765E' }]}>{tier.progress}</Text>
            </View>
          );
        })}
      </View>
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
  masteryBig: { fontSize: 21, fontFamily: 'serif', fontWeight: 'bold', color: T.ink },
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
  tierCell: {
    flex: 1,
    height: 43,
    marginHorizontal: 2.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierCellComplete: { backgroundColor: 'rgba(95,118,94,0.12)', borderColor: 'rgba(95,118,94,0.35)' },
  tierCellActive: { backgroundColor: T.surface, borderColor: T.brand, borderWidth: 1.5 },
  tierCode: { fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold' },
  tierPct: { fontSize: 7, fontFamily: 'monospace', color: T.muted, marginTop: 2 },

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
});

/**
 * LeaderboardScreen — ACADEMIC HONORS & SPEEDRUN LEADERBOARD
 * 1:1 Pixel-perfect React Native port of Flutter LeaderboardScreen
 * Flutter source: vocario_mobile/lib/screens/leaderboard/leaderboard_screen.dart
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { leaderboardService, authService } from '../api/services';

// ——— Tokens (Matching VocarioTokens from tokens.dart) ————————————————————————
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
  gold: '#D4AF37',
  goldAccent: '#F59E0B',
  emerald: '#10B981',
};

interface LeaderboardUser {
  rank: number;
  userId: string;
  fullName: string;
  username: string;
  targetLevel: string;
  masteredWords: number;
  streakCount: number;
  xp: number;
  isCurrentUser: boolean;
}

const ARENA_OFFICIAL_STAGES = [
  { id: 'stage-admin-kitchen', title: 'Gian Bếp Đời Thực (Tuần)' },
  { id: 'stage-admin-study', title: 'Góc Học Tập & Công Việc' },
  { id: 'stage-admin-living', title: 'Phòng Khách Ấm Cúng' },
];

const CEFR_LEVELS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'A1', label: 'A1 · Khởi đầu' },
  { id: 'A2', label: 'A2 · Sơ cấp' },
  { id: 'B1', label: 'B1 · Giao tiếp' },
  { id: 'B2', label: 'B2 · Độc lập' },
  { id: 'C1', label: 'C1 · Nâng cao' },
];

export const LeaderboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<'SM2' | 'ARENA'>('SM2');
  const [selectedPeriod, setSelectedPeriod] = useState<'weekly' | 'all-time'>('weekly');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(0);
  const pageSize = 10;
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [rankedList, setRankedList] = useState<LeaderboardUser[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardUser | null>(null);
  const [nextTargetSuggestion, setNextTargetSuggestion] = useState<string | null>(null);

  // Arena speedrun state
  const [arenaRecords, setArenaRecords] = useState<any[]>([]);
  const [isLoadingArena, setIsLoadingArena] = useState<boolean>(false);
  const [selectedArenaStageId, setSelectedArenaStageId] = useState<string>('stage-admin-kitchen');
  const [showStageDropdown, setShowStageDropdown] = useState<boolean>(false);

  // Helper get initials
  const getInitials = (name: string): string => {
    const parts = (name || '').trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'HV';
    if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const formatMs = (ms?: number): string => {
    if (!ms || ms <= 0) return '--.--s';
    const sec = ms / 1000.0;
    return `${sec.toFixed(2)}s`;
  };

  // 1. Fetch SM-2 Leaderboard Data
  const fetchLeaderboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [res, rankRes] = await Promise.all([
        leaderboardService.getLeaderboard({
          period: selectedPeriod,
          level: selectedLevel,
          page: currentPage,
          size: pageSize,
        }).catch(() => null),
        leaderboardService.getMyRank(selectedPeriod).catch(() => null),
      ]);

      if (res) {
        const topUsers = Array.isArray(res.topUsers) ? res.topUsers : [];
        const podium = Array.isArray(res.podium) ? res.podium : [];

        const allMap = new Map<string, any>();
        podium.forEach((p: any) => {
          if (p && p.userId) allMap.set(String(p.userId), p);
        });
        topUsers.forEach((u: any) => {
          if (u && u.userId && !allMap.has(String(u.userId))) {
            allMap.set(String(u.userId), u);
          }
        });

        const all = Array.from(allMap.values());
        all.sort((a, b) => (Number(a.rank) || 99) - (Number(b.rank) || 99));

        const mapped: LeaderboardUser[] = all.map((item, idx) => ({
          rank: Number(item.rank) || idx + 1,
          userId: String(item.userId || item.id || ''),
          fullName: item.fullName || item.userName || 'Học viên',
          username: item.username || 'learner',
          targetLevel: item.targetLevel || 'A2',
          masteredWords: Number(item.masteredWords) || 0,
          streakCount: Number(item.streakCount) || 0,
          xp: Number(item.xp ?? item.totalXp) || 0,
          isCurrentUser: Boolean(item.isCurrentUser),
        }));

        let myRank: LeaderboardUser | null = null;
        if (rankRes) {
          myRank = {
            rank: Number(rankRes.rank) || 1,
            userId: String(rankRes.userId || rankRes.id || ''),
            fullName: rankRes.fullName || rankRes.userName || 'Học viên Vocario',
            username: rankRes.username || 'learner',
            targetLevel: rankRes.targetLevel || 'A2',
            masteredWords: Number(rankRes.masteredWords) || 0,
            streakCount: Number(rankRes.streakCount) || 0,
            xp: Number(rankRes.xp ?? rankRes.totalXp) || 0,
            isCurrentUser: true,
          };
        } else {
          myRank = mapped.find((u) => u.isCurrentUser) || null;
        }

        if (!myRank) {
          const profile = await authService.getProfile().catch(() => null);
          if (profile) {
            myRank = {
              rank: 0,
              userId: String(profile.id || profile.userId || ''),
              fullName: profile.fullName || profile.username || 'Học viên Vocario',
              username: profile.username || '',
              targetLevel: profile.targetLevel || 'A2',
              masteredWords: 0,
              streakCount: Number(profile.streakCount) || 0,
              xp: 0,
              isCurrentUser: true,
            };
          }
        }

        setRankedList(mapped);
        setCurrentUserRank(myRank);
        setNextTargetSuggestion(
          res.nextTarget?.suggestion ||
            'Duy trì chuỗi ôn tập thẻ và thi đấu Arena để thăng hạng trong tuần này.'
        );
        setTotalPages(Number(res.totalPages) || 1);
        setTotalElements(Number(res.totalElements) || mapped.length);
      } else {
        const profile = await authService.getProfile().catch(() => null);
        if (profile) {
          setCurrentUserRank({
            rank: 0,
            userId: String(profile.id || profile.userId || ''),
            fullName: profile.fullName || profile.username || 'Học viên Vocario',
            username: profile.username || '',
            targetLevel: profile.targetLevel || 'A2',
            masteredWords: 0,
            streakCount: Number(profile.streakCount) || 0,
            xp: 0,
            isCurrentUser: true,
          });
        }
        setRankedList([]);
      }
    } catch (_) {
      setRankedList([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod, selectedLevel, currentPage]);

  // 2. Fetch Arena Leaderboard Data
  const fetchArenaLeaderboard = useCallback(async () => {
    setIsLoadingArena(true);
    try {
      const res = await leaderboardService.getStageLeaderboard(selectedArenaStageId, {
        period: selectedPeriod === 'weekly' ? 'weekly' : 'all',
      });
      setArenaRecords(Array.isArray(res) ? res : []);
    } catch (_) {
      setArenaRecords([]);
    } finally {
      setIsLoadingArena(false);
    }
  }, [selectedArenaStageId, selectedPeriod]);

  useEffect(() => {
    if (activeTab === 'SM2') {
      fetchLeaderboardData();
    } else {
      fetchArenaLeaderboard();
    }
  }, [activeTab, fetchLeaderboardData, fetchArenaLeaderboard]);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'SM2') {
      fetchLeaderboardData();
    } else {
      fetchArenaLeaderboard().finally(() => setRefreshing(false));
    }
  };

  // ——— Render Sub-components ————————————————————————————————————————————————

  const renderTopAppBar = () => (
    <View style={[styles.topBar, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24) + 6 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => navigation.goBack?.() || navigation.navigate('Home')}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={20} color={T.ink} />
        </TouchableOpacity>
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.topBarMono}>CỘNG ĐỒNG VOCARIO</Text>
          <Text style={styles.topBarTitle}>Bảng vinh danh</Text>
        </View>
      </View>
      <View style={styles.periodBadge}>
        <MaterialIcons name="emoji-events" size={13} color={T.brand} />
        <Text style={styles.periodBadgeText}>
          {selectedPeriod === 'weekly' ? 'Tuần này' : 'Toàn bộ'}
        </Text>
      </View>
    </View>
  );

  const renderMainTabSwitcher = () => (
    <View style={styles.tabSwitcherWrap}>
      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'SM2' && styles.tabItemActive]}
        onPress={() => {
          if (activeTab !== 'SM2') {
            setActiveTab('SM2');
          }
        }}
      >
        <MaterialIcons
          name="layers"
          size={16}
          color={activeTab === 'SM2' ? T.brand : T.muted}
        />
        <View style={{ marginLeft: 6 }}>
          <Text style={[styles.tabItemTitle, activeTab === 'SM2' && styles.tabItemTitleActive]}>
            Thẻ Từ SM-2
          </Text>
          <Text style={[styles.tabItemSubtitle, activeTab === 'SM2' && { color: T.brand }]}>
            Điểm tích lũy XP
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabItem, activeTab === 'ARENA' && styles.tabItemActive]}
        onPress={() => {
          if (activeTab !== 'ARENA') {
            setActiveTab('ARENA');
          }
        }}
      >
        <MaterialIcons
          name="speed"
          size={16}
          color={activeTab === 'ARENA' ? T.brand : T.muted}
        />
        <View style={{ marginLeft: 6 }}>
          <Text style={[styles.tabItemTitle, activeTab === 'ARENA' && styles.tabItemTitleActive]}>
            Đấu Trường Tốc Độ
          </Text>
          <Text style={[styles.tabItemSubtitle, activeTab === 'ARENA' && { color: T.brand }]}>
            Kỷ lục Speedrun
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderPeriodSwitcher = () => (
    <View style={styles.periodSwitcherWrap}>
      <TouchableOpacity
        style={[styles.periodBtn, selectedPeriod === 'weekly' && styles.periodBtnActive]}
        onPress={() => {
          if (selectedPeriod !== 'weekly') {
            setSelectedPeriod('weekly');
            setCurrentPage(0);
          }
        }}
      >
        <Text
          style={[
            styles.periodBtnText,
            selectedPeriod === 'weekly' && styles.periodBtnTextActive,
          ]}
        >
          Tuần này
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.periodBtn, selectedPeriod === 'all-time' && styles.periodBtnActive]}
        onPress={() => {
          if (selectedPeriod !== 'all-time') {
            setSelectedPeriod('all-time');
            setCurrentPage(0);
          }
        }}
      >
        <Text
          style={[
            styles.periodBtnText,
            selectedPeriod === 'all-time' && styles.periodBtnTextActive,
          ]}
        >
          Toàn thời gian
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPersonalRecordCard = () => {
    if (!currentUserRank) return null;
    const me = currentUserRank;

    return (
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={styles.myAvatar}>
              <Text style={styles.myAvatarText}>{getInitials(me.fullName)}</Text>
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.cardKicker}>HỒ SƠ CỦA BẠN</Text>
              <Text style={styles.cardName} numberOfLines={1}>{me.fullName}</Text>
              <Text style={styles.cardLevel}>Mục tiêu {me.targetLevel}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cardKicker}>HẠNG HIỆN TẠI</Text>
            <Text style={styles.cardRankNumber}>{me.rank > 0 ? `#${me.rank}` : '—'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* 3 KPI Metrics */}
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kpiValue}>{me.xp} XP</Text>
            <Text style={styles.kpiLabel}>TỔNG TÍCH LŨY</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kpiValue}>{me.masteredWords} từ</Text>
            <Text style={styles.kpiLabel}>ĐÃ THUẦN THỤC</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.kpiValue}>{me.streakCount} ngày</Text>
            <Text style={styles.kpiLabel}>CHUỖI STREAK</Text>
          </View>
        </View>

        {/* Suggestion Callout Banner */}
        <View style={styles.suggestionBanner}>
          <MaterialIcons name="auto-awesome" size={14} color={T.brand} />
          <Text style={styles.suggestionText}>
            {nextTargetSuggestion || 'Duy trì chuỗi ôn tập thẻ để thăng hạng trong tuần này.'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Wordbook', params: { initialTabIndex: 1 } })}
          >
            <Text style={styles.actionBtnPrimaryText}>Ôn Flashcard ngay</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtnSecondary}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Arena' })}
          >
            <Text style={styles.actionBtnSecondaryText}>Vào Đấu trường</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCefrFilterPills = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingVertical: 4 }}
    >
      {CEFR_LEVELS.map((lvl) => {
        const isSelected = selectedLevel === lvl.id;
        return (
          <TouchableOpacity
            key={lvl.id}
            style={[styles.cefrPill, isSelected && styles.cefrPillActive]}
            onPress={() => {
              setSelectedLevel(lvl.id);
              setCurrentPage(0);
            }}
          >
            <Text style={[styles.cefrPillText, isSelected && styles.cefrPillTextActive]}>
              {lvl.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderHonorsLedgerTable = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyTable}>
          <ActivityIndicator color={T.brand} size="small" />
        </View>
      );
    }

    if (rankedList.length === 0) {
      return (
        <View style={styles.emptyTable}>
          <MaterialIcons name="emoji-events" size={36} color={T.muted} />
          <Text style={styles.emptyTitle}>
            Chưa có học viên nào ở phân nhóm {selectedLevel}
          </Text>
          <Text style={styles.emptySubtitle}>
            Hãy là người đầu tiên đặt mục tiêu trình độ này để ghi tên lên bảng vinh danh!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.tableCard}>
        {/* Table Header */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { flex: 5 }]}>THỨ HẠNG / HỌC VIÊN</Text>
          <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'center' }]}>CẤP ĐỘ</Text>
          <Text style={[styles.tableHeaderCell, { flex: 3, textAlign: 'center' }]}>TỪ THUỘC</Text>
          <Text style={[styles.tableHeaderCell, { flex: 3, textAlign: 'right' }]}>TỔNG XP</Text>
        </View>

        {/* Table Rows */}
        {rankedList.map((item, idx) => {
          const rankColor =
            item.rank === 1
              ? '#B45309'
              : item.rank === 2
              ? '#475569'
              : item.rank === 3
              ? '#9A3412'
              : T.ink;

          return (
            <View
              key={`${item.userId}-${idx}`}
              style={[
                styles.tableRow,
                item.isCurrentUser && styles.tableRowCurrent,
                idx === rankedList.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              {/* Rank & Avatar & Name */}
              <View style={{ flex: 5, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.rankNumber, { color: rankColor }]}>
                  #{item.rank}
                </Text>
                <View
                  style={[
                    styles.rowAvatar,
                    item.isCurrentUser && { backgroundColor: T.brand },
                  ]}
                >
                  <Text
                    style={[
                      styles.rowAvatarText,
                      item.isCurrentUser && { color: '#FFFFFF' },
                    ]}
                  >
                    {getInitials(item.fullName)}
                  </Text>
                </View>
                <View style={{ marginLeft: 6, flex: 1 }}>
                  <Text
                    style={[
                      styles.rowFullName,
                      item.isCurrentUser && { color: T.brand },
                    ]}
                    numberOfLines={1}
                  >
                    {item.fullName}
                  </Text>
                  <Text style={styles.rowUsername} numberOfLines={1}>
                    @{item.username}
                    {item.isCurrentUser ? ' · Bạn' : ''}
                  </Text>
                </View>
              </View>

              {/* CEFR Level */}
              <View style={{ flex: 2, alignItems: 'center' }}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>{item.targetLevel}</Text>
                </View>
              </View>

              {/* Mastered words */}
              <View style={{ flex: 3, alignItems: 'center' }}>
                <Text style={styles.masteredWordsText}>{item.masteredWords} từ</Text>
              </View>

              {/* Total XP */}
              <View style={{ flex: 3, alignItems: 'flex-end' }}>
                <Text style={styles.totalXpText}>{item.xp} XP</Text>
              </View>
            </View>
          );
        })}

        {/* Table Footer */}
        <View style={styles.tableFooterRow}>
          <Text style={styles.tableFooterText}>
            Hiển thị {rankedList.length} học viên dẫn đầu
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.realtimeDot} />
            <Text style={styles.realtimeText}>Thời gian thực</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;
    return (
      <View style={styles.paginationRow}>
        <Text style={styles.paginationText}>
          Trang {currentPage + 1} / {totalPages} · {totalElements} học viên
        </Text>
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            disabled={currentPage === 0}
            onPress={() => setCurrentPage((p) => Math.max(0, p - 1))}
            style={[styles.pageNavBtn, currentPage === 0 && { opacity: 0.3 }]}
          >
            <MaterialIcons name="chevron-left" size={18} color={T.ink} />
          </TouchableOpacity>
          <TouchableOpacity
            disabled={currentPage >= totalPages - 1}
            onPress={() => setCurrentPage((p) => p + 1)}
            style={[
              styles.pageNavBtn,
              currentPage >= totalPages - 1 && { opacity: 0.3 },
            ]}
          >
            <MaterialIcons name="chevron-right" size={18} color={T.ink} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderScoringMechanicsCard = () => (
    <View style={styles.scoringCard}>
      <Text style={styles.scoringKicker}>QUY CHUẨN TÍNH ĐIỂM EXP KINH NGHIỆM</Text>
      <Text style={styles.scoringText}>
        {'• Ôn Flashcard SM-2 đạt 3-5 sao: +15 XP / lượt.\n' +
          '• Đấu trường 60s tìm đúng vật thể: +25 XP + combo tốc độ.\n' +
          '• Duy trì chuỗi Streak mỗi ngày: Nhận thưởng nhân hệ số chuyên cần.'}
      </Text>
    </View>
  );

  // ——— Arena Speedrun Sub-components ————————————————————————————————————————

  const renderArenaStageSelector = () => {
    const currentStage =
      ARENA_OFFICIAL_STAGES.find((s) => s.id === selectedArenaStageId) ||
      ARENA_OFFICIAL_STAGES[0];

    return (
      <View>
        <TouchableOpacity
          style={styles.stageSelectorBox}
          onPress={() => setShowStageDropdown(!showStageDropdown)}
        >
          <MaterialIcons name="stadium" size={16} color={T.brand} />
          <Text style={styles.stageSelectorLabel}>Phòng thi đấu: </Text>
          <Text style={styles.stageSelectorTitle} numberOfLines={1}>
            {currentStage.title}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={20} color={T.muted} />
        </TouchableOpacity>

        <Modal
          visible={showStageDropdown}
          transparent
          animationType="fade"
          onRequestClose={() => setShowStageDropdown(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowStageDropdown(false)}
          >
            <View style={styles.stageDropdownMenu}>
              {ARENA_OFFICIAL_STAGES.map((s) => {
                const isSelected = s.id === selectedArenaStageId;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.stageDropdownItem,
                      isSelected && { backgroundColor: T.field },
                    ]}
                    onPress={() => {
                      setSelectedArenaStageId(s.id);
                      setShowStageDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.stageDropdownItemText,
                        isSelected && { fontWeight: 'bold', color: T.brand },
                      ]}
                    >
                      {s.title}
                    </Text>
                    {isSelected && (
                      <MaterialIcons name="check" size={16} color={T.brand} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  const renderArenaPodiumCard = (record: any, rank: number, height: number, badgeColor: string) => {
    const name = record?.userName || record?.username || 'Học viên';
    const completionMs = Number(record?.completionTimeMs) || 0;
    const timeStr = formatMs(completionMs);
    const acc = Number(record?.accuracyPct) || 100.0;
    const combo = Number(record?.maxCombo) || 1;

    return (
      <View
        style={[
          styles.podiumCard,
          { height },
          rank === 1 && { borderColor: T.goldAccent, borderWidth: 1.5 },
        ]}
      >
        <View
          style={[
            styles.podiumBadge,
            { backgroundColor: `${badgeColor}20`, borderColor: badgeColor },
          ]}
        >
          <Text style={[styles.podiumBadgeText, { color: badgeColor }]}>#{rank}</Text>
        </View>

        <Text style={styles.podiumName} numberOfLines={1}>
          {name}
        </Text>

        <Text style={[styles.podiumTime, rank === 1 && { color: T.brand }]}>
          {timeStr}
        </Text>

        <Text style={styles.podiumMeta}>
          {acc.toFixed(0)}% · {combo}x combo
        </Text>
      </View>
    );
  };

  const renderArenaSpeedrunPodium = () => {
    if (isLoadingArena) {
      return (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <ActivityIndicator color={T.brand} size="small" />
        </View>
      );
    }

    if (arenaRecords.length === 0) {
      return (
        <View style={styles.emptyTable}>
          <MaterialIcons name="timer-off" size={32} color={T.muted} />
          <Text style={styles.emptyTitle}>Chưa có kỷ lục trong khoảng thời gian này</Text>
          <Text style={styles.emptySubtitle}>
            Hãy là người đầu tiên thiết lập kỷ lục tốc độ phản xạ trên đấu trường!
          </Text>
        </View>
      );
    }

    const top3 = arenaRecords.slice(0, 3);

    return (
      <View style={styles.podiumRow}>
        {/* #2 Bạc */}
        <View style={{ flex: 1 }}>
          {top3.length > 1 ? (
            renderArenaPodiumCard(top3[1], 2, 135, '#94A3B8')
          ) : (
            <View style={{ height: 135 }} />
          )}
        </View>

        {/* #1 Vàng */}
        <View style={{ flex: 1, marginHorizontal: 8 }}>
          {renderArenaPodiumCard(top3[0], 1, 155, T.goldAccent)}
        </View>

        {/* #3 Đồng */}
        <View style={{ flex: 1 }}>
          {top3.length > 2 ? (
            renderArenaPodiumCard(top3[2], 3, 120, '#CD7F32')
          ) : (
            <View style={{ height: 120 }} />
          )}
        </View>
      </View>
    );
  };

  const renderArenaHonorsLedgerTable = () => {
    if (isLoadingArena || arenaRecords.length === 0) return null;

    return (
      <View style={styles.tableCard}>
        {/* Header */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { width: 32 }]}>#</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>HỌC VIÊN</Text>
          <Text style={[styles.tableHeaderCell, { width: 68, textAlign: 'right' }]}>
            THỜI GIAN
          </Text>
          <Text style={[styles.tableHeaderCell, { width: 56, textAlign: 'right' }]}>
            CHÍNH XÁC
          </Text>
        </View>

        {/* Rows */}
        {arenaRecords.map((r, idx) => {
          const isCurrentUser = Boolean(r.isCurrentUser);
          const name = r.userName || r.username || 'Học viên';
          const ms = Number(r.completionTimeMs) || 0;
          const acc = Number(r.accuracyPct) || 100.0;

          return (
            <View
              key={`${r.id || idx}`}
              style={[
                styles.tableRow,
                isCurrentUser && styles.tableRowCurrent,
                idx === arenaRecords.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Text
                style={[
                  styles.rankNumber,
                  { width: 32 },
                  idx === 0 && { color: T.goldAccent },
                ]}
              >
                #{idx + 1}
              </Text>
              <Text
                style={[
                  styles.rowFullName,
                  { flex: 1 },
                  isCurrentUser && { color: T.brand, fontWeight: 'bold' },
                ]}
                numberOfLines={1}
              >
                {name}
                {isCurrentUser ? ' (Bạn)' : ''}
              </Text>
              <Text
                style={[
                  styles.totalXpText,
                  { width: 68 },
                  idx === 0 && { color: T.brand },
                ]}
              >
                {formatMs(ms)}
              </Text>
              <Text style={[styles.masteredWordsText, { width: 56, textAlign: 'right' }]}>
                {acc.toFixed(0)}%
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderArenaActionCard = () => (
    <View style={styles.arenaActionCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.arenaActionTitle}>Sẵn sàng phá kỷ lục tốc độ?</Text>
        <Text style={styles.arenaActionSubtitle}>
          Thi đấu trên đấu trường thị giác và ghi danh vào bảng vinh danh.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.arenaActionBtn}
        onPress={() =>
          navigation.navigate('MainTabs', {
            screen: 'Arena',
            params: { initialStageId: selectedArenaStageId },
          })
        }
      >
        <MaterialIcons name="bolt" size={14} color="#FFFFFF" />
        <Text style={styles.arenaActionBtnText}>Thi đấu ngay</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderTopAppBar()}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.brand}
            colors={[T.brand]}
          />
        }
      >
        {/* Header Kicker & Headline */}
        <Text style={styles.kicker}>ACADEMIC HONORS · BẢNG VINH DANH HỌC TẬP</Text>
        <Text style={styles.headline}>Bảng xếp hạng học viên xuất sắc</Text>
        <Text style={styles.subtitle}>
          Tôn vinh nỗ lực ghi nhớ bền bỉ và khả năng làm chủ từ vựng theo chu kỳ giãn cách SuperMemo SM-2.
        </Text>

        <View style={{ height: 16 }} />

        {/* Tab Switcher: SM-2 vs Speedrun Arena */}
        {renderMainTabSwitcher()}

        <View style={{ height: 14 }} />

        {activeTab === 'SM2' ? (
          <>
            {renderPeriodSwitcher()}
            <View style={{ height: 14 }} />
            {renderPersonalRecordCard()}
            <View style={{ height: 18 }} />
            {renderCefrFilterPills()}
            <View style={{ height: 12 }} />
            {renderHonorsLedgerTable()}
            <View style={{ height: 14 }} />
            {renderPaginationControls()}
            <View style={{ height: 18 }} />
            {renderScoringMechanicsCard()}
          </>
        ) : (
          <>
            {renderPeriodSwitcher()}
            <View style={{ height: 14 }} />
            {renderArenaStageSelector()}
            <View style={{ height: 16 }} />
            {renderArenaSpeedrunPodium()}
            <View style={{ height: 16 }} />
            {renderArenaHonorsLedgerTable()}
            <View style={{ height: 16 }} />
            {renderArenaActionCard()}
          </>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
};

// ——— Stylesheet (Scandinavian Editorial) ———————————————————————————————————
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.canvas,
  },
  topBar: {
    backgroundColor: T.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
  },
  topBarMono: {
    fontSize: 7.5,
    fontFamily: 'monospace',
    color: T.brand,
    letterSpacing: 0.8,
  },
  topBarTitle: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
  },
  periodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.field,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
  },
  periodBadgeText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.ink,
    marginLeft: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  kicker: {
    fontSize: 8.5,
    fontFamily: 'monospace',
    color: T.brand,
    letterSpacing: 1.0,
  },
  headline: {
    fontSize: 22,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 11,
    color: T.muted,
    lineHeight: 16,
    marginTop: 4,
  },

  // Main Tab Switcher
  tabSwitcherWrap: {
    flexDirection: 'row',
    backgroundColor: T.field,
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: T.surface,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tabItemTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: T.muted,
  },
  tabItemTitleActive: {
    fontWeight: 'bold',
    color: T.ink,
  },
  tabItemSubtitle: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: T.muted,
  },

  // Period Switcher
  periodSwitcherWrap: {
    flexDirection: 'row',
    backgroundColor: T.field,
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodBtnActive: {
    backgroundColor: T.surface,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  periodBtnText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: T.muted,
  },
  periodBtnTextActive: {
    fontWeight: 'bold',
    color: T.ink,
  },

  // Personal Record Card
  card: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  myAvatar: {
    width: 38,
    height: 38,
    backgroundColor: T.brand,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myAvatarText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardKicker: {
    fontSize: 7.5,
    fontFamily: 'monospace',
    color: T.muted,
  },
  cardName: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
  },
  cardLevel: {
    fontSize: 10,
    color: T.muted,
  },
  cardRankNumber: {
    fontSize: 22,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.brand,
  },
  divider: {
    height: 1,
    backgroundColor: T.border,
    marginVertical: 12,
  },
  kpiValue: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.ink,
  },
  kpiLabel: {
    fontSize: 8.5,
    color: T.muted,
    marginTop: 2,
  },
  suggestionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: T.field,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    marginTop: 12,
  },
  suggestionText: {
    fontSize: 10.5,
    color: T.ink,
    lineHeight: 15,
    marginLeft: 8,
    flex: 1,
  },
  actionBtnPrimary: {
    flex: 1,
    height: 36,
    backgroundColor: T.brand,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  actionBtnPrimaryText: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionBtnSecondary: {
    flex: 1,
    height: 36,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnSecondaryText: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: T.ink,
  },

  // CEFR Pills
  cefrPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    marginRight: 8,
  },
  cefrPillActive: {
    backgroundColor: T.brand,
    borderColor: T.brand,
  },
  cefrPillText: {
    fontSize: 10.5,
    fontWeight: '500',
    color: T.ink,
  },
  cefrPillTextActive: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Honors Ledger Table
  tableCard: {
    backgroundColor: T.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6F3EE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: T.muted,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  tableRowCurrent: {
    backgroundColor: 'rgba(254, 249, 195, 0.35)',
  },
  rankNumber: {
    width: 24,
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  rowAvatar: {
    width: 24,
    height: 24,
    backgroundColor: '#EAE5DC',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowAvatarText: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: T.brand,
  },
  rowFullName: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: T.ink,
  },
  rowUsername: {
    fontSize: 8.5,
    color: T.muted,
  },
  levelBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
  },
  levelBadgeText: {
    fontSize: 8.5,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.ink,
  },
  masteredWordsText: {
    fontSize: 10,
    color: T.ink,
  },
  totalXpText: {
    fontSize: 10.5,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.brand,
  },
  tableFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  tableFooterText: {
    fontSize: 9.5,
    color: T.muted,
  },
  realtimeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: T.emerald,
    marginRight: 4,
  },
  realtimeText: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: T.muted,
  },

  // Pagination
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 10,
    color: T.muted,
  },
  pageNavBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },

  // Empty Table
  emptyTable: {
    backgroundColor: T.surface,
    padding: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 13.5,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 10.5,
    color: T.muted,
    textAlign: 'center',
    marginTop: 4,
  },

  // Scoring Mechanics Card
  scoringCard: {
    backgroundColor: T.surface,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  scoringKicker: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: T.brand,
    fontWeight: 'bold',
  },
  scoringText: {
    fontSize: 10.5,
    color: T.muted,
    lineHeight: 16,
    marginTop: 6,
  },

  // Arena Stage Selector
  stageSelectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  stageSelectorLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: T.ink,
    marginLeft: 8,
  },
  stageSelectorTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: T.brand,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  stageDropdownMenu: {
    width: '85%',
    backgroundColor: T.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stageDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  stageDropdownItemText: {
    fontSize: 11.5,
    color: T.ink,
  },

  // Arena Speedrun Podium
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  podiumCard: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  podiumBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  podiumBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  podiumName: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: T.ink,
    textAlign: 'center',
  },
  podiumTime: {
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.ink,
  },
  podiumMeta: {
    fontSize: 8.5,
    color: T.muted,
  },

  // Arena Action Card
  arenaActionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
  },
  arenaActionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: T.ink,
  },
  arenaActionSubtitle: {
    fontSize: 10,
    color: T.muted,
    marginTop: 2,
  },
  arenaActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.brand,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 8,
  },
  arenaActionBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
});

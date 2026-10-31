import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { VocarioTheme } from '../constants/theme';
import { srsService } from '../api/services';
import { TargetProgress, WordItem } from '../types';
import { SpeechScorerModal } from '../components/SpeechScorerModal';

export const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [progress, setProgress] = useState<TargetProgress | null>(null);
  const [dueCards, setDueCards] = useState<WordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWord, setSelectedWord] = useState<WordItem | null>(null);

  const fetchData = async () => {
    try {
      const [progData, dueData] = await Promise.all([
        srsService.getTargetProgress().catch(() => null),
        srsService.getDueCards().catch(() => []),
      ]);
      if (progData) setProgress(progData);
      setDueCards(dueData);
    } catch (_) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const currentLevel = progress?.currentLevel || 'A2';
  const masteredCount = progress?.masteredWordsAtLevel || 3;
  const threshold = progress?.masteryThreshold || 1000;
  const completionPct = progress?.completionPercentage || 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.kicker}>KHÔNG GIAN HỌC TẬP THỊ GIÁC</Text>
          <Text style={styles.greeting}>Chào bạn, sẵn sàng khám phá!</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{currentLevel}</Text>
        </View>
      </View>

      {/* Main Target Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Tiến bộ từ vựng chuẩn CEFR {currentLevel}</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.dot} />
            <Text style={styles.liveText}>Thời gian thực</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View>
            <Text style={styles.statBig}>{masteredCount}</Text>
            <Text style={styles.statLabel}>từ đã tinh thông SM-2</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.statTarget}>Mục tiêu: {threshold} từ</Text>
            <Text style={styles.statPct}>{completionPct}% hoàn thành</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.min(100, completionPct)}%` }]} />
        </View>

        {/* CEFR Tiers Breakdown */}
        <Text style={styles.breakdownHeader}>TIẾN ĐỘ TỪNG DẢI NĂNG LỰC & CHỨNG CHỈ</Text>
        <View style={styles.tierGrid}>
          {['A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => {
            const b = progress?.levelBreakdowns?.find((x) => x.level === lvl);
            const mastered = b?.masteredCount || 0;
            const req = b?.requiredWords || (lvl === 'A1' ? 10 : 500);
            const pct = b?.completionPercentage !== undefined ? b.completionPercentage : Math.round((mastered / req) * 100);

            return (
              <View
                key={lvl}
                style={[
                  styles.tierCard,
                  lvl === currentLevel && styles.tierCardActive,
                ]}
              >
                <View style={styles.tierTop}>
                  <Text style={styles.tierCode}>{lvl}</Text>
                  <Text style={styles.tierPct}>{pct}%</Text>
                </View>
                <View style={styles.tierBarBg}>
                  <View style={[styles.tierBarFill, { width: `${Math.min(100, pct)}%` }]} />
                </View>
                <Text style={styles.tierCount}>
                  {mastered}/{req} từ
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Due Flashcard Study */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Từ vựng cần ôn tập hôm nay</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Wordbook')}>
          <Text style={styles.sectionLink}>Xem sổ từ →</Text>
        </TouchableOpacity>
      </View>

      {dueCards.length > 0 ? (
        <View style={styles.flashcardBox}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardWord}>{dueCards[0].word}</Text>
            <Text style={styles.cardIpa}>{dueCards[0].ipa || '/.../'}</Text>
          </View>
          <Text style={styles.cardMeaning}>
            {dueCards[0].vietnameseMeaning || 'Chưa có bản dịch nghĩa'}
          </Text>

          <View style={styles.cardActionRow}>
            <TouchableOpacity
              style={styles.cardBtn}
              onPress={() => Speech.speak(dueCards[0].word, { language: 'en-US' })}
            >
              <Ionicons name="volume-medium-outline" size={16} color={VocarioTheme.colors.brand} style={{ marginRight: 6 }} />
              <Text style={styles.cardBtnText}>Phát âm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cardBtn, styles.cardBtnAccent]}
              onPress={() => setSelectedWord(dueCards[0])}
            >
              <Ionicons name="mic-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={[styles.cardBtnText, { color: '#FFFFFF' }]}>Luyện phát âm AI</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            Bạn đã hoàn thành hết các thẻ cần ôn tập hôm nay. Hãy mở máy ảnh để quét nạp từ mới!
          </Text>
          <TouchableOpacity
            style={styles.scanNowBtn}
            onPress={() => navigation.navigate('Scanner')}
          >
            <Ionicons name="camera-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.scanNowText}>Quét đồ vật ngay</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Speech Modal */}
      {selectedWord ? (
        <SpeechScorerModal
          visible={!!selectedWord}
          word={selectedWord.word}
          ipa={selectedWord.ipa}
          vietnamese={selectedWord.vietnameseMeaning}
          progressId={selectedWord.id}
          onClose={() => setSelectedWord(null)}
          onSuccess={() => {
            fetchData();
          }}
        />
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VocarioTheme.colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  kicker: {
    fontSize: 9.5,
    fontFamily: VocarioTheme.typography.fontMono,
    fontWeight: 'bold',
    color: VocarioTheme.colors.brand,
    letterSpacing: 0.5,
  },
  greeting: {
    fontSize: 20,
    fontFamily: VocarioTheme.typography.fontSerif,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
    marginTop: 2,
  },
  badge: {
    backgroundColor: VocarioTheme.colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    fontFamily: VocarioTheme.typography.fontMono,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: VocarioTheme.typography.fontSerif,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: VocarioTheme.colors.emerald,
  },
  liveText: {
    fontSize: 10,
    color: VocarioTheme.colors.muted,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
  },
  statBig: {
    fontSize: 28,
    fontFamily: VocarioTheme.typography.fontSerif,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  statLabel: {
    fontSize: 11,
    color: VocarioTheme.colors.muted,
  },
  statTarget: {
    fontSize: 11,
    color: VocarioTheme.colors.subtle,
    fontWeight: '600',
  },
  statPct: {
    fontSize: 12,
    color: VocarioTheme.colors.brand,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#EAE4D9',
    borderRadius: 4,
    marginVertical: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: VocarioTheme.colors.brand,
    borderRadius: 4,
  },
  breakdownHeader: {
    fontSize: 10,
    fontFamily: VocarioTheme.typography.fontMono,
    fontWeight: 'bold',
    color: VocarioTheme.colors.muted,
    marginTop: 8,
    marginBottom: 10,
  },
  tierGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  tierCard: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
  },
  tierCardActive: {
    borderColor: VocarioTheme.colors.brand,
    backgroundColor: '#FFFFFF',
  },
  tierTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  tierCode: {
    fontSize: 11,
    fontFamily: VocarioTheme.typography.fontMono,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  tierPct: {
    fontSize: 10,
    fontWeight: 'bold',
    color: VocarioTheme.colors.brand,
  },
  tierBarBg: {
    height: 4,
    backgroundColor: '#E5DFD4',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  tierBarFill: {
    height: '100%',
    backgroundColor: VocarioTheme.colors.emerald,
    borderRadius: 2,
  },
  tierCount: {
    fontSize: 9,
    color: VocarioTheme.colors.muted,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: VocarioTheme.typography.fontSerif,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: 'bold',
    color: VocarioTheme.colors.brand,
  },
  flashcardBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
  },
  cardWord: {
    fontSize: 22,
    fontFamily: VocarioTheme.typography.fontSerif,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  cardIpa: {
    fontSize: 12,
    fontFamily: VocarioTheme.typography.fontMono,
    color: VocarioTheme.colors.muted,
  },
  cardMeaning: {
    fontSize: 13,
    color: VocarioTheme.colors.subtle,
    marginVertical: 8,
  },
  cardActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cardBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
  },
  cardBtnAccent: {
    backgroundColor: VocarioTheme.colors.brand,
    borderColor: VocarioTheme.colors.brand,
  },
  cardBtnText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
  },
  emptyText: {
    fontSize: 12.5,
    color: VocarioTheme.colors.subtle,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  scanNowBtn: {
    backgroundColor: VocarioTheme.colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scanNowText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
});


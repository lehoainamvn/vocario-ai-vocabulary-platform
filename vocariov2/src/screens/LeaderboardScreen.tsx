import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VocarioTheme } from '../constants/theme';
import { leaderboardService } from '../api/services';
import { LeaderboardEntry } from '../types';

export const LeaderboardScreen: React.FC = () => {
  const [mode, setMode] = useState<'srs' | 'arena'>('srs');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await leaderboardService.getWeeklyLeaderboard('weekly');
      if (Array.isArray(res) && res.length > 0) {
        setEntries(res);
      } else {
        // Fallback dữ liệu mẫu chuẩn
        setEntries([
          { rank: 1, userId: 'u1', username: 'nguyen.nam', fullName: 'Nguyễn Văn Nam', score: 980, streakDays: 24, accuracyRate: 98.5, timeTakenSeconds: 32.4 },
          { rank: 2, userId: 'u2', username: 'tran.hoa', fullName: 'Trần Thị Hoa', score: 870, streakDays: 18, accuracyRate: 94.2, timeTakenSeconds: 38.1 },
          { rank: 3, userId: 'u3', username: 'le.minh', fullName: 'Lê Tuấn Minh', score: 790, streakDays: 12, accuracyRate: 91.0, timeTakenSeconds: 41.5 },
          { rank: 4, userId: 'u4', username: 'pham.duy', fullName: 'Phạm Đức Duy', score: 650, streakDays: 9, accuracyRate: 88.0, timeTakenSeconds: 46.2 },
          { rank: 5, userId: 'u5', username: 'vo.anh', fullName: 'Võ Quỳnh Anh', score: 580, streakDays: 7, accuracyRate: 85.5, timeTakenSeconds: 50.8 },
        ]);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [mode]);

  const top3 = entries.slice(0, 3);
  const others = entries.slice(3);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.kicker}>BẢNG VINH DANH HỌC THUẬT</Text>
        <Text style={styles.title}>Bảng Xếp Hạng</Text>
      </View>

      {/* Mode Switcher */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'srs' && styles.modeBtnActive]}
          onPress={() => setMode('srs')}
        >
          <Ionicons
            name="book-outline"
            size={15}
            color={mode === 'srs' ? '#FFFFFF' : VocarioTheme.colors.ink}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.modeText, mode === 'srs' && styles.modeTextActive]}>
            Thẻ Từ SM-2
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeBtn, mode === 'arena' && styles.modeBtnActive]}
          onPress={() => setMode('arena')}
        >
          <Ionicons
            name="flash-outline"
            size={15}
            color={mode === 'arena' ? '#FFFFFF' : VocarioTheme.colors.ink}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.modeText, mode === 'arena' && styles.modeTextActive]}>
            Đấu Trường Tốc Độ
          </Text>
        </TouchableOpacity>
      </View>

      {/* Podium Top 3 */}
      {top3.length >= 3 ? (
        <View style={styles.podiumContainer}>
          {/* Rank 2 */}
          <View style={[styles.podiumCol, { marginTop: 24 }]}>
            <View style={[styles.avatarBox, styles.silverBorder]}>
              <Text style={styles.avatarLetter}>{top3[1].fullName?.charAt(0) || '2'}</Text>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>{top3[1].fullName || top3[1].username}</Text>
            <Text style={styles.podiumScore}>
              {mode === 'srs' ? `${top3[1].score} từ` : `${top3[1].timeTakenSeconds}s`}
            </Text>
            <View style={[styles.pedestal, styles.pedestal2]}>
              <Text style={styles.pedestalRank}>2</Text>
            </View>
          </View>

          {/* Rank 1 */}
          <View style={styles.podiumCol}>
            <View style={styles.crown}>
              <Ionicons name="trophy" size={20} color="#D4AF37" />
            </View>
            <View style={[styles.avatarBox, styles.goldBorder]}>
              <Text style={styles.avatarLetter}>{top3[0].fullName?.charAt(0) || '1'}</Text>
            </View>
            <Text style={[styles.podiumName, { fontWeight: 'bold' }]} numberOfLines={1}>
              {top3[0].fullName || top3[0].username}
            </Text>
            <Text style={[styles.podiumScore, { color: VocarioTheme.colors.brand }]}>
              {mode === 'srs' ? `${top3[0].score} từ` : `${top3[0].timeTakenSeconds}s`}
            </Text>
            <View style={[styles.pedestal, styles.pedestal1]}>
              <Text style={styles.pedestalRank}>1</Text>
            </View>
          </View>

          {/* Rank 3 */}
          <View style={[styles.podiumCol, { marginTop: 36 }]}>
            <View style={[styles.avatarBox, styles.bronzeBorder]}>
              <Text style={styles.avatarLetter}>{top3[2].fullName?.charAt(0) || '3'}</Text>
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>{top3[2].fullName || top3[2].username}</Text>
            <Text style={styles.podiumScore}>
              {mode === 'srs' ? `${top3[2].score} từ` : `${top3[2].timeTakenSeconds}s`}
            </Text>
            <View style={[styles.pedestal, styles.pedestal3]}>
              <Text style={styles.pedestalRank}>3</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Others List */}
      <View style={styles.otherList}>
        {others.map((item) => (
          <View key={item.userId || item.username} style={styles.otherRow}>
            <Text style={styles.otherRank}>#{item.rank}</Text>
            <View style={styles.otherAvatar}>
              <Text style={styles.otherAvatarText}>{item.fullName?.charAt(0) || 'U'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.otherName}>{item.fullName || item.username}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Ionicons name="flame" size={13} color="#E07A5F" style={{ marginRight: 3 }} />
                <Text style={styles.otherStreak}>Chuỗi {item.streakDays} ngày</Text>
              </View>
            </View>
            <Text style={styles.otherScore}>
              {mode === 'srs' ? `${item.score} từ` : `${item.timeTakenSeconds}s`}
            </Text>
          </View>
        ))}
      </View>
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
  header: {
    marginBottom: 16,
  },
  kicker: {
    fontSize: 9.5,
    fontFamily: VocarioTheme.typography.fontMono,
    fontWeight: 'bold',
    color: VocarioTheme.colors.brand,
  },
  title: {
    fontSize: 22,
    fontFamily: VocarioTheme.typography.fontSerif,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
    marginTop: 2,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: VocarioTheme.colors.brand,
    borderColor: VocarioTheme.colors.brand,
  },
  modeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 24,
    gap: 12,
  },
  podiumCol: {
    flex: 1,
    alignItems: 'center',
  },
  crown: {
    marginBottom: 2,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  goldBorder: {
    borderColor: '#F59E0B',
  },
  silverBorder: {
    borderColor: '#94A3B8',
  },
  bronzeBorder: {
    borderColor: '#B45309',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  podiumName: {
    fontSize: 11,
    color: VocarioTheme.colors.ink,
    marginTop: 6,
    textAlign: 'center',
  },
  podiumScore: {
    fontSize: 11,
    fontFamily: VocarioTheme.typography.fontMono,
    fontWeight: 'bold',
    color: VocarioTheme.colors.muted,
    marginTop: 2,
  },
  pedestal: {
    width: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  pedestal1: {
    height: 90,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  pedestal2: {
    height: 65,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  pedestal3: {
    height: 45,
    backgroundColor: '#FFEDD5',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  pedestalRank: {
    fontSize: 18,
    fontFamily: VocarioTheme.typography.fontMono,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  otherList: {
    gap: 8,
  },
  otherRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    gap: 10,
  },
  otherRank: {
    fontSize: 13,
    fontFamily: VocarioTheme.typography.fontMono,
    fontWeight: 'bold',
    color: VocarioTheme.colors.muted,
    width: 24,
  },
  otherAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
  },
  otherAvatarText: {
    fontWeight: 'bold',
    color: VocarioTheme.colors.brand,
    fontSize: 13,
  },
  otherName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  otherStreak: {
    fontSize: 10.5,
    color: VocarioTheme.colors.muted,
    marginTop: 2,
  },
  otherScore: {
    fontSize: 13,
    fontFamily: VocarioTheme.typography.fontMono,
    fontWeight: 'bold',
    color: VocarioTheme.colors.brand,
  },
});


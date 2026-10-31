import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VocarioTheme } from '../constants/theme';
import { arenaService } from '../api/services';

export const ArenaScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [stages, setStages] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'official' | 'user'>('official');

  useEffect(() => {
    arenaService.getOfficialStages().then((data) => setStages(data));
  }, []);

  const handleStartStage = (stage: any) => {
    Alert.alert(
      'Sàn Đấu Thị Giác AI',
      `Bắt đầu thử thách 60s Blitz trên bối cảnh "${stage.title}". Bạn hãy chạm thật nhanh vào các đồ vật được yêu cầu!`,
      [{ text: 'Vào thi đấu ngay', onPress: () => {} }, { text: 'Để sau', style: 'cancel' }]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.kicker}>ĐẤU TRƯỜNG PHẢN XẠ THỊ GIÁC</Text>
        <Text style={styles.title}>Visual Arena 60s</Text>
        <Text style={styles.subtitle}>
          Quan sát bối cảnh thực tế, tìm kiếm đồ vật theo yêu cầu trong 60 giây và leo bảng vinh danh tốc độ.
        </Text>
      </View>

      {/* Special Blitz Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Text style={{ fontSize: 20 }}>⚡</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerKicker}>CHẾ ĐỘ ĐẶC BIỆT</Text>
          <Text style={styles.bannerTitle}>Thử thách Blitz: Đua thời gian 60s</Text>
          <Text style={styles.bannerDesc}>Xáo trộn vật thể trên bối cảnh tuần trước khi hết thời gian.</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.startBlitzBtn}
        onPress={() => stages[0] && handleStartStage(stages[0])}
      >
        <Ionicons name="timer-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.startBlitzText}>Bắt đầu 60s Blitz</Text>
      </TouchableOpacity>

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'official' && styles.tabBtnActive]}
          onPress={() => setActiveTab('official')}
        >
          <Text style={[styles.tabText, activeTab === 'official' && styles.tabTextActive]}>
            Đấu trường hệ thống ({stages.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'user' && styles.tabBtnActive]}
          onPress={() => setActiveTab('user')}
        >
          <Text style={[styles.tabText, activeTab === 'user' && styles.tabTextActive]}>
            Ảnh của bạn (0)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stages List */}
      <View style={styles.stageList}>
        {stages.map((stage) => (
          <TouchableOpacity
            key={stage.id}
            style={styles.stageCard}
            activeOpacity={0.9}
            onPress={() => handleStartStage(stage)}
          >
            <Image source={{ uri: stage.imageUrl }} style={styles.stageImage} />
            <View style={styles.stageBody}>
              <View style={styles.stageMeta}>
                <Text style={styles.stageTheme}>{stage.sceneTheme.toUpperCase()}</Text>
                <Text style={styles.stageDiff}>{stage.difficulty}</Text>
              </View>
              <Text style={styles.stageTitle}>{stage.title}</Text>
              <Text style={styles.stageObjects}>{stage.totalObjects} vật thể thử thách</Text>
            </View>
          </TouchableOpacity>
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
  subtitle: {
    fontSize: 12,
    color: VocarioTheme.colors.muted,
    lineHeight: 18,
    marginTop: 4,
  },
  banner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerKicker: {
    fontSize: 9,
    fontFamily: VocarioTheme.typography.fontMono,
    fontWeight: 'bold',
    color: VocarioTheme.colors.amber,
  },
  bannerTitle: {
    fontSize: 13,
    fontFamily: VocarioTheme.typography.fontSerif,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  bannerDesc: {
    fontSize: 11,
    color: VocarioTheme.colors.muted,
    marginTop: 2,
  },
  startBlitzBtn: {
    backgroundColor: VocarioTheme.colors.brand,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 14,
  },
  startBlitzText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    backgroundColor: '#FAF8F5',
  },
  tabBtnActive: {
    backgroundColor: VocarioTheme.colors.ink,
    borderColor: VocarioTheme.colors.ink,
  },
  tabText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  stageList: {
    gap: 14,
  },
  stageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    overflow: 'hidden',
  },
  stageImage: {
    width: '100%',
    height: 150,
  },
  stageBody: {
    padding: 14,
  },
  stageMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stageTheme: {
    fontSize: 9.5,
    fontFamily: VocarioTheme.typography.fontMono,
    fontWeight: 'bold',
    color: VocarioTheme.colors.brand,
  },
  stageDiff: {
    fontSize: 9.5,
    fontFamily: VocarioTheme.typography.fontMono,
    fontWeight: 'bold',
    color: VocarioTheme.colors.goldAccent,
  },
  stageTitle: {
    fontSize: 15,
    fontFamily: VocarioTheme.typography.fontSerif,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  stageObjects: {
    fontSize: 11,
    color: VocarioTheme.colors.muted,
    marginTop: 4,
  },
});


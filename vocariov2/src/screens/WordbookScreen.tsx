import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import * as Speech from 'expo-speech';
import { VocarioTheme } from '../constants/theme';
import { srsService } from '../api/services';
import { WordItem } from '../types';
import { SpeechScorerModal } from '../components/SpeechScorerModal';

export const WordbookScreen: React.FC = () => {
  const [words, setWords] = useState<WordItem[]>([]);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedWord, setSelectedWord] = useState<WordItem | null>(null);

  const fetchWords = async () => {
    try {
      const data = await srsService.getSavedWords();
      setWords(data);
    } catch (_) {
      // Fallback danh sách mẫu
      setWords([
        { id: '1', word: 'bookshelf', ipa: '/ˈbʊk.ʃelf/', vietnameseMeaning: 'kệ sách', cefrLevel: 'A1', status: 'MASTERED' },
        { id: '2', word: 'laptop', ipa: '/ˈlæp.tɒp/', vietnameseMeaning: 'máy tính xách tay', cefrLevel: 'A1', status: 'MASTERED' },
        { id: '3', word: 'notebook', ipa: '/ˈnəʊt.bʊk/', vietnameseMeaning: 'sổ tay ghi chép', cefrLevel: 'A1', status: 'MASTERED' },
        { id: '4', word: 'desk lamp', ipa: '/desk læmp/', vietnameseMeaning: 'đèn bàn học', cefrLevel: 'A2', status: 'LEARNING' },
        { id: '5', word: 'headphone', ipa: '/ˈhed.fəʊn/', vietnameseMeaning: 'tai nghe chụp tai', cefrLevel: 'A2', status: 'LEARNING' },
        { id: '6', word: 'monitor', ipa: '/ˈmɒn.ɪ.tər/', vietnameseMeaning: 'màn hình hiển thị', cefrLevel: 'A2', status: 'LEARNING' },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWords();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWords();
  };

  const filteredWords = words.filter((w) => {
    const matchLevel = filterLevel === 'ALL' || (w.cefrLevel || 'A1').toUpperCase() === filterLevel;
    const matchSearch =
      w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.vietnameseMeaning && w.vietnameseMeaning.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchLevel && matchSearch;
  });

  const renderWordItem = ({ item }: { item: WordItem }) => {
    const isMastered = item.status === 'MASTERED';
    return (
      <View style={styles.wordCard}>
        <View style={styles.wordMain}>
          <View style={styles.wordTop}>
            <Text style={styles.wordText}>{item.word}</Text>
            <View style={[styles.levelBadge, isMastered && styles.levelBadgeMastered]}>
              <Text style={[styles.levelText, isMastered && styles.levelTextMastered]}>
                {item.cefrLevel || 'A1'}
              </Text>
            </View>
          </View>

          <Text style={styles.ipaText}>{item.ipa || '/.../'}</Text>
          <Text style={styles.meaningText}>{item.vietnameseMeaning || 'Nghĩa tiếng Việt'}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Speech.speak(item.word, { language: 'en-US' })}
          >
            <Text style={styles.actionIcon}>🔊</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.micBtn]}
            onPress={() => setSelectedWord(item)}
          >
            <Text style={styles.actionIcon}>🎙️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.kicker}>KHO TỪ VỰNG SM-2</Text>
        <Text style={styles.title}>Sổ Từ Thông Minh</Text>

        {/* Search */}
        <TextInput
          style={styles.searchBar}
          placeholder="Tìm kiếm từ vựng hoặc nghĩa tiếng Việt..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* CEFR Level Filter Tabs */}
        <View style={styles.filterRow}>
          {['ALL', 'A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) => (
            <TouchableOpacity
              key={lvl}
              style={[styles.filterChip, filterLevel === lvl && styles.filterChipActive]}
              onPress={() => setFilterLevel(lvl)}
            >
              <Text style={[styles.filterText, filterLevel === lvl && styles.filterTextActive]}>
                {lvl}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={VocarioTheme.colors.brand} />
        </View>
      ) : (
        <FlatList
          data={filteredWords}
          keyExtractor={(item) => item.id || item.word}
          renderItem={renderWordItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Không tìm thấy từ vựng</Text>
              <Text style={styles.emptySubtitle}>Hãy chuyển dải CEFR khác hoặc chụp thêm đồ vật mới.</Text>
            </View>
          }
        />
      )}

      {/* Speech Scorer Modal */}
      {selectedWord ? (
        <SpeechScorerModal
          visible={!!selectedWord}
          word={selectedWord.word}
          ipa={selectedWord.ipa}
          vietnamese={selectedWord.vietnameseMeaning}
          progressId={selectedWord.id}
          onClose={() => setSelectedWord(null)}
          onSuccess={() => fetchWords()}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VocarioTheme.colors.background,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: VocarioTheme.colors.cardBorder,
  },
  kicker: {
    fontSize: 9.5,
    fontFamily: VocarioTheme.typography.fontMono,
    fontWeight: 'bold',
    color: VocarioTheme.colors.brand,
  },
  title: {
    fontSize: 18,
    fontFamily: VocarioTheme.typography.fontSerif,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
    marginTop: 2,
  },
  searchBar: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    fontSize: 12,
  },
  filterRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    backgroundColor: '#FAF8F5',
  },
  filterChipActive: {
    backgroundColor: VocarioTheme.colors.brand,
    borderColor: VocarioTheme.colors.brand,
  },
  filterText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  wordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordMain: {
    flex: 1,
  },
  wordTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordText: {
    fontSize: 17,
    fontFamily: VocarioTheme.typography.fontSerif,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  levelBadge: {
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
  },
  levelBadgeMastered: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  levelText: {
    fontSize: 9.5,
    fontFamily: VocarioTheme.typography.fontMono,
    fontWeight: 'bold',
    color: VocarioTheme.colors.muted,
  },
  levelTextMastered: {
    color: '#15803D',
  },
  ipaText: {
    fontSize: 11.5,
    fontFamily: VocarioTheme.typography.fontMono,
    color: VocarioTheme.colors.muted,
    marginTop: 2,
  },
  meaningText: {
    fontSize: 12.5,
    color: VocarioTheme.colors.subtle,
    fontWeight: '500',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micBtn: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  actionIcon: {
    fontSize: 15,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  emptySubtitle: {
    fontSize: 12,
    color: VocarioTheme.colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
});


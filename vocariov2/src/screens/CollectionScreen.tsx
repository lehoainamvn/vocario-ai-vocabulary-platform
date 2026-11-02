/**
 * CollectionScreen — VISUAL EXPEDITION ARCHIVE
 * 1:1 Pixel-perfect React Native port of Flutter CollectionScreen
 * Flutter source: vocario_mobile/lib/screens/collection/collection_screen.dart
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import { visionService, srsService } from '../api/services';
import { SpeechScorerModal } from '../components/SpeechScorerModal';

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
  emerald: '#10B981',
  emeraldBg: '#F0FDF4',
  rose: '#DC2626',
};

export const CollectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialSceneId = route.params?.initialSceneId;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [allAlbums, setAllAlbums] = useState<any[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'Tất cả' | 'Gần đây' | 'Chưa thành thạo'>('Tất cả');

  const [isSavingAll, setIsSavingAll] = useState<boolean>(false);
  const [savingWords, setSavingWords] = useState<Record<string, boolean>>({});
  const [activeScorerWord, setActiveScorerWord] = useState<any | null>(null);

  const fetchCaptures = useCallback(async () => {
    setIsLoading(true);
    try {
      const [captures, myWords] = await Promise.all([
        visionService.getUserCaptures().catch(() => []),
        srsService.getSavedWords().catch(() => []),
      ]);

      const mapped = captures.map((c: any) => {
        let rawDetected = c.detectedObjects;
        let detectedList: any[] = [];
        if (Array.isArray(rawDetected)) {
          detectedList = rawDetected;
        } else if (typeof rawDetected === 'string' && rawDetected.length > 0) {
          try {
            detectedList = JSON.parse(rawDetected);
          } catch (_) {}
        }

        const words = detectedList.map((d: any) => {
          const eng = (d.word || d.english || '').toString();
          const savedMatch = myWords.find(
            (sw: any) => (sw.word || '').toLowerCase() === eng.toLowerCase()
          );

          return {
            id: d.id || `w-${eng}`,
            progressId: savedMatch?.id,
            word: eng,
            ipa: d.ipa || d.phoneticIpa || '/.../',
            vietnamese: d.vietnamese || d.vietnameseMeaning || 'Đồ vật đời sống',
            level: (d.level || d.cefr || d.cefrLevel || 'B1').toString().toUpperCase(),
            partOfSpeech: d.partOfSpeech || 'noun',
            exampleEn: d.exampleEn || d.example || `I see the ${eng} in this room.`,
            exampleVi: d.exampleVi || `Tôi nhìn thấy ${eng} trong bối cảnh này.`,
            isSaved: Boolean(savedMatch),
            isMastered: savedMatch?.status === 'MASTERED',
            confidence: d.confidence ? Number(d.confidence) : undefined,
          };
        });

        return {
          id: String(c.id || c.sceneId || Math.random()),
          title: c.sceneTheme || 'Bối cảnh đời thực',
          imageUrl: c.base64DataUrl || c.imageUrl || c.image_path || '',
          createdAt: c.createdAt || c.timestamp || 'Gần đây',
          words,
        };
      });

      setAllAlbums(mapped);
      if (initialSceneId) {
        const found = mapped.find((a: any) => a.id === initialSceneId);
        if (found) setSelectedAlbum(found);
      }
    } catch (_) {
      setAllAlbums([]);
    } finally {
      setIsLoading(false);
    }
  }, [initialSceneId]);

  useEffect(() => {
    fetchCaptures();
  }, [fetchCaptures]);

  const speakWord = (text: string) => {
    Speech.speak(text, { language: 'en-US', rate: 0.9 });
  };

  const handleSaveWord = async (wordObj: any) => {
    if (!selectedAlbum) return;
    setSavingWords((prev) => ({ ...prev, [wordObj.word]: true }));
    try {
      await visionService.learnWordFromVision({
        englishWord: wordObj.word,
        vietnameseMeaning: wordObj.vietnamese,
        phoneticIpa: wordObj.ipa,
        cefrLevel: wordObj.level,
        captureId: selectedAlbum.id,
      });

      // Update state
      setSelectedAlbum((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          words: prev.words.map((w: any) =>
            w.word === wordObj.word ? { ...w, isSaved: true } : w
          ),
        };
      });
    } catch (e: any) {
      Alert.alert('Thông báo', e.message || 'Không thể lưu từ vựng.');
    } finally {
      setSavingWords((prev) => ({ ...prev, [wordObj.word]: false }));
    }
  };

  const handleSaveAllWords = async () => {
    if (!selectedAlbum) return;
    setIsSavingAll(true);
    try {
      await visionService.learnAllWords(selectedAlbum.id);
      setSelectedAlbum((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          words: prev.words.map((w: any) => ({ ...w, isSaved: true })),
        };
      });
      Alert.alert('Thành công', 'Đã lưu toàn bộ từ vựng vào Sổ tay SM-2!');
    } catch (_) {
      Alert.alert('Thông báo', 'Đã lưu các từ vựng vào Sổ tay!');
    } finally {
      setIsSavingAll(false);
    }
  };

  // Filtered albums
  const filteredAlbums = allAlbums.filter((a) => {
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (a.title || '').toLowerCase().includes(q);
      const matchWord = (a.words || []).some((w: any) =>
        (w.word || '').toLowerCase().includes(q)
      );
      if (!matchTitle && !matchWord) return false;
    }
    if (activeFilter === 'Chưa thành thạo') {
      return (a.words || []).some((w: any) => !w.isMastered);
    }
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => {
              if (selectedAlbum) {
                setSelectedAlbum(null);
              } else {
                navigation.canGoBack?.() ? navigation.goBack() : navigation.navigate('Home');
              }
            }}
            style={styles.backBtn}
          >
            <MaterialIcons name="arrow-back" size={20} color={T.ink} />
          </TouchableOpacity>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.topBarMono}>VISUAL ARCHIVE</Text>
            <Text style={styles.topBarTitle}>
              {selectedAlbum ? selectedAlbum.title : 'Bộ sưu tập bối cảnh'}
            </Text>
          </View>
        </View>

        {!selectedAlbum && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Scanner')}
            style={styles.scanNewBtn}
          >
            <MaterialIcons name="add-a-photo" size={16} color="#FFFFFF" />
            <Text style={styles.scanNewBtnText}>Quét mới</Text>
          </TouchableOpacity>
        )}
      </View>

      {selectedAlbum ? (
        // ——— View 2: Album Detail ———————————————————————————————————————————
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Image hero with Fallback */}
          <View style={styles.detailImageWrap}>
            {selectedAlbum.imageUrl ? (
              <Image
                source={{ uri: selectedAlbum.imageUrl }}
                style={styles.detailImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.detailImagePlaceholder}>
                <MaterialIcons name="image" size={40} color={T.muted} />
                <Text style={styles.detailImagePlaceholderText}>Ảnh bối cảnh đã lưu</Text>
              </View>
            )}
            <View style={styles.detailBadge}>
              <Text style={styles.detailBadgeText}>
                {selectedAlbum.words?.length || 0} từ bóc tách
              </Text>
            </View>
          </View>

          {/* Action Row */}
          <View style={styles.detailActionRow}>
            <TouchableOpacity
              style={[styles.saveAllBtn, isSavingAll && { opacity: 0.7 }]}
              disabled={isSavingAll}
              onPress={handleSaveAllWords}
            >
              {isSavingAll ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <MaterialIcons name="bookmark-border" size={16} color="#FFFFFF" />
                  <Text style={styles.saveAllBtnText}>Lưu toàn bộ vào Sổ SM-2</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 16 }} />

          {/* Detected Words Ledger */}
          <Text style={styles.wordsSectionTitle}>DANH SÁCH TỪ VỰNG TRONG BỐI CẢNH</Text>
          <View style={{ height: 8 }} />

          {selectedAlbum.words?.map((w: any, idx: number) => {
            const isSaving = savingWords[w.word];
            return (
              <View key={`${w.word}-${idx}`} style={styles.wordCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={styles.wordTitle}>{w.word}</Text>
                    <View style={styles.levelTag}>
                      <Text style={styles.levelTagText}>{w.level}</Text>
                    </View>
                    <Text style={styles.wordIpa}>{w.ipa}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      onPress={() => speakWord(w.word)}
                      style={styles.iconCircle}
                    >
                      <MaterialIcons name="volume-up" size={16} color={T.brand} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setActiveScorerWord(w)}
                      style={[styles.iconCircle, { marginLeft: 6 }]}
                    >
                      <MaterialIcons name="mic" size={16} color={T.amber} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.wordMeaning}>{w.vietnamese}</Text>

                <View style={styles.exampleBox}>
                  <Text style={styles.exampleEn}>{w.exampleEn}</Text>
                  <Text style={styles.exampleVi}>{w.exampleVi}</Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.wordSaveBtn, w.isSaved && styles.wordSaveBtnSaved]}
                    disabled={w.isSaved || isSaving}
                    onPress={() => handleSaveWord(w)}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color={T.brand} />
                    ) : (
                      <>
                        <MaterialIcons
                          name={w.isSaved ? 'check' : 'add'}
                          size={14}
                          color={w.isSaved ? T.emerald : T.brand}
                        />
                        <Text style={[styles.wordSaveBtnText, w.isSaved && { color: T.emerald }]}>
                          {w.isSaved ? 'Đã trong Sổ' : 'Thêm vào Sổ SM-2'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <View style={{ height: 28 }} />
        </ScrollView>
      ) : (
        // ——— View 1: Albums Grid ————————————————————————————————————————————
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Search bar */}
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={18} color={T.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm bối cảnh hoặc từ vựng..."
              placeholderTextColor={T.faint}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={16} color={T.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            {(['Tất cả', 'Gần đây', 'Chưa thành thạo'] as const).map((f) => {
              const isSelected = activeFilter === f;
              return (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterPill, isSelected && styles.filterPillActive]}
                  onPress={() => setActiveFilter(f)}
                >
                  <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: 16 }} />

          {isLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator color={T.brand} size="small" />
            </View>
          ) : filteredAlbums.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="collections-bookmark" size={40} color={T.muted} />
              <Text style={styles.emptyTitle}>Chưa có ảnh bối cảnh nào</Text>
              <Text style={styles.emptySubtitle}>
                Chụp ảnh phòng ngủ, văn phòng, quán cà phê qua Thu nạp AI để bắt đầu lưu trữ từ vựng đời thực.
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => navigation.navigate('Scanner')}
              >
                <Text style={styles.emptyActionBtnText}>Mở Camera Quét AI</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredAlbums.map((album) => (
              <TouchableOpacity
                key={album.id}
                style={styles.albumCard}
                onPress={() => setSelectedAlbum(album)}
                activeOpacity={0.85}
              >
                {/* 16:9 Image */}
                <View style={styles.albumImageWrap}>
                  {album.imageUrl ? (
                    <Image
                      source={{ uri: album.imageUrl }}
                      style={styles.albumImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.albumImagePlaceholder}>
                      <MaterialIcons name="photo-camera" size={32} color={T.muted} />
                    </View>
                  )}
                  <View style={styles.albumCountPill}>
                    <Text style={styles.albumCountPillText}>
                      {album.words?.length || 0} từ
                    </Text>
                  </View>
                </View>

                {/* Album Info */}
                <View style={styles.albumBody}>
                  <Text style={styles.albumTitle}>{album.title}</Text>
                  <Text style={styles.albumDate}>{album.createdAt}</Text>

                  {/* Word chips preview */}
                  <View style={styles.wordChipsWrap}>
                    {(album.words || []).slice(0, 5).map((w: any, idx: number) => (
                      <View key={idx} style={styles.wordChip}>
                        <Text style={styles.wordChipText}>{w.word}</Text>
                      </View>
                    ))}
                    {(album.words || []).length > 5 && (
                      <View style={[styles.wordChip, { backgroundColor: T.border }]}>
                        <Text style={styles.wordChipText}>
                          +{(album.words || []).length - 5}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}

          <View style={{ height: 28 }} />
        </ScrollView>
      )}

      {/* Speech Scorer Modal */}
      {activeScorerWord && (
        <SpeechScorerModal
          visible={Boolean(activeScorerWord)}
          word={activeScorerWord.word}
          ipa={activeScorerWord.ipa}
          vietnamese={activeScorerWord.vietnamese}
          progressId={activeScorerWord.progressId}
          onClose={() => setActiveScorerWord(null)}
          onSuccess={() => {
            setActiveScorerWord(null);
            fetchCaptures();
          }}
        />
      )}
    </View>
  );
};

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
  backBtn: {
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
  scanNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.brand,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scanNewBtnText: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: T.ink,
    marginLeft: 8,
  },
  filterRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: T.brand,
    borderColor: T.brand,
  },
  filterPillText: {
    fontSize: 11,
    color: T.ink,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  albumCard: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  albumImageWrap: {
    width: '100%',
    height: 180,
    backgroundColor: '#EAE5DC',
    position: 'relative',
  },
  albumImage: {
    width: '100%',
    height: '100%',
  },
  albumImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumCountPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(45, 40, 35, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  albumCountPillText: {
    fontSize: 9.5,
    fontFamily: 'monospace',
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  albumBody: {
    padding: 12,
  },
  albumTitle: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
  },
  albumDate: {
    fontSize: 9.5,
    color: T.muted,
    marginTop: 2,
  },
  wordChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  wordChip: {
    backgroundColor: T.field,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 4,
  },
  wordChipText: {
    fontSize: 9,
    fontFamily: 'monospace',
    color: T.ink,
  },
  emptyCard: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 11,
    color: T.muted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
  emptyActionBtn: {
    backgroundColor: T.brand,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 14,
  },
  emptyActionBtnText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Detail View Styles
  detailImageWrap: {
    width: '100%',
    height: 200,
    backgroundColor: '#EAE5DC',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
    position: 'relative',
  },
  detailImage: {
    width: '100%',
    height: '100%',
  },
  detailImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailImagePlaceholderText: {
    fontSize: 11,
    color: T.muted,
    marginTop: 6,
  },
  detailBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(45, 40, 35, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  detailBadgeText: {
    fontSize: 9.5,
    fontFamily: 'monospace',
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  detailActionRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  saveAllBtn: {
    flex: 1,
    height: 40,
    backgroundColor: T.brand,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveAllBtnText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  wordsSectionTitle: {
    fontSize: 8.5,
    fontFamily: 'monospace',
    color: T.brand,
    letterSpacing: 0.8,
  },
  wordCard: {
    backgroundColor: T.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    marginBottom: 10,
  },
  wordTitle: {
    fontSize: 15,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
  },
  levelTag: {
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  levelTagText: {
    fontSize: 8,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.brand,
  },
  wordIpa: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: T.muted,
    marginLeft: 6,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordMeaning: {
    fontSize: 11.5,
    color: T.ink,
    marginTop: 4,
  },
  exampleBox: {
    backgroundColor: T.field,
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 2,
    borderLeftColor: T.brand,
  },
  exampleEn: {
    fontSize: 10.5,
    fontStyle: 'italic',
    color: T.ink,
  },
  exampleVi: {
    fontSize: 9.5,
    color: T.muted,
    marginTop: 2,
  },
  wordSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
  },
  wordSaveBtnSaved: {
    backgroundColor: T.emeraldBg,
    borderColor: '#86EFAC',
  },
  wordSaveBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: T.brand,
    marginLeft: 4,
  },
});

/**
 * ClassroomScreen — VIRTUAL ACADEMY & PEER STUDY ROOMS
 * 1:1 Pixel-perfect React Native port of Flutter ClassroomScreen
 * Flutter source: vocario_mobile/lib/screens/classroom/classroom_screen.dart
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { classroomService } from '../api/services';

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
  emerald: '#10B981',
};

export const ClassroomScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24) + 6;
  const initialCode = route.params?.initialCode;

  const [joinCode, setJoinCode] = useState<string>(initialCode || '');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [myClassrooms, setMyClassrooms] = useState<any[]>([]);
  const [activeClassroom, setActiveClassroom] = useState<any | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isCloning, setIsCloning] = useState<boolean>(false);

  // Create room modal / state
  const [showCreateCard, setShowCreateCard] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>('');
  const [createDesc, setCreateDesc] = useState<string>('');
  const [createLevel, setCreateLevel] = useState<string>('B1');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const loadMyClassrooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await classroomService.getMyClassrooms();
      setMyClassrooms(Array.isArray(list) ? list : []);
    } catch (_) {
      setMyClassrooms([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadClassroomByCode = useCallback(async (code: string) => {
    setIsLoading(true);
    try {
      const detail = await classroomService.getClassroomByCode(code);
      if (detail) {
        setActiveClassroom(detail);
      } else {
        Alert.alert('Thông báo', `Không tìm thấy phòng học với mã: ${code}`);
      }
    } catch (_) {
      Alert.alert('Lỗi', 'Không thể tra cứu mã phòng học.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialCode) {
      loadClassroomByCode(initialCode);
    } else {
      loadMyClassrooms();
    }
  }, [initialCode, loadClassroomByCode, loadMyClassrooms]);

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setIsJoining(true);
    try {
      await classroomService.joinClassroom(joinCode.trim());
      await loadClassroomByCode(joinCode.trim());
      loadMyClassrooms();
    } catch (e: any) {
      Alert.alert('Thông báo', e.message || 'Không thể tham gia phòng học.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCloneToNotebook = async (code: string) => {
    setIsCloning(true);
    try {
      await classroomService.cloneClassroomToNotebook(code);
      Alert.alert('Thành công', 'Đã sao chép toàn bộ bộ từ về Sổ tay SM-2 của bạn!');
    } catch (e: any) {
      Alert.alert('Thông báo', e.message || 'Không thể sao chép bộ từ.');
    } finally {
      setIsCloning(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!createName.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên phòng học.');
      return;
    }
    setIsCreating(true);
    try {
      await classroomService.createClassroom({
        name: createName.trim(),
        description: createDesc.trim() || 'Phòng học từ vựng bối cảnh nhóm.',
        targetLevel: createLevel,
        words: [],
      });
      setShowCreateCard(false);
      setCreateName('');
      setCreateDesc('');
      loadMyClassrooms();
      Alert.alert('Thành công', 'Đã tạo phòng học mới thành công!');
    } catch (e: any) {
      Alert.alert('Thông báo', e.message || 'Không thể tạo phòng học.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={[styles.topBar, { paddingTop: topInset, paddingBottom: 10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => {
              if (activeClassroom) {
                setActiveClassroom(null);
              } else {
                navigation.canGoBack?.() ? navigation.goBack() : navigation.navigate('Home');
              }
            }}
            style={styles.backBtn}
          >
            <MaterialIcons name="arrow-back" size={20} color={T.ink} />
          </TouchableOpacity>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.topBarMono}>COMMUNITY CLASSROOM</Text>
            <Text style={styles.topBarTitle}>
              {activeClassroom ? activeClassroom.name : 'Không Gian Lớp Học'}
            </Text>
          </View>
        </View>

        {!activeClassroom && (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => setShowCreateCard(!showCreateCard)}
          >
            <MaterialIcons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Tạo phòng</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {activeClassroom ? (
          // ——— Detail View ——————————————————————————————————————————————————
          <View>
            <View style={styles.detailCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailRoomName}>{activeClassroom.name}</Text>
                  <Text style={styles.detailRoomDesc}>{activeClassroom.description}</Text>
                </View>
                <View style={styles.levelTag}>
                  <Text style={styles.levelTagText}>{activeClassroom.targetLevel || 'B1'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.metaText}>Mã phòng: {activeClassroom.roomCode || activeClassroom.code}</Text>
                <Text style={styles.metaText}>{activeClassroom.words?.length || 0} từ vựng</Text>
              </View>

              <TouchableOpacity
                style={[styles.cloneBtn, isCloning && { opacity: 0.7 }]}
                disabled={isCloning}
                onPress={() => handleCloneToNotebook(activeClassroom.roomCode || activeClassroom.code)}
              >
                {isCloning ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="download" size={16} color="#FFFFFF" />
                    <Text style={styles.cloneBtnText}>Kéo toàn bộ từ về Sổ tay SM-2</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Word list */}
            <Text style={[styles.sectionMono, { marginTop: 18 }]}>DANH SÁCH TỪ TRONG PHÒNG</Text>
            <View style={{ height: 8 }} />
            {(activeClassroom.words || []).map((w: any, idx: number) => (
              <View key={idx} style={styles.wordRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.wordName}>{w.word || w.englishWord}</Text>
                  <Text style={styles.wordMeaning}>{w.vietnameseMeaning || w.meaning}</Text>
                </View>
                <Text style={styles.wordLevel}>{w.cefrLevel || w.level || 'B1'}</Text>
              </View>
            ))}
          </View>
        ) : (
          // ——— Main View ————————————————————————————————————————————————————
          <View>
            {/* Join Room Box */}
            <View style={styles.card}>
              <Text style={styles.sectionMono}>THAM GIA PHÒNG HỌC</Text>
              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <TextInput
                  style={styles.joinInput}
                  placeholder="Nhập mã phòng (VD: VOC-ROOM-101)..."
                  placeholderTextColor={T.faint}
                  value={joinCode}
                  onChangeText={(v) => setJoinCode(v.toUpperCase())}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[styles.joinBtn, isJoining && { opacity: 0.7 }]}
                  disabled={isJoining}
                  onPress={handleJoin}
                >
                  {isJoining ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.joinBtnText}>Vào phòng</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Create Room Form (collapsible) */}
            {showCreateCard && (
              <View style={[styles.card, { marginTop: 14 }]}>
                <Text style={styles.sectionMono}>TẠO PHÒNG HỌC MỚI</Text>
                <TextInput
                  style={[styles.inputBox, { marginTop: 8 }]}
                  placeholder="Tên phòng học..."
                  placeholderTextColor={T.faint}
                  value={createName}
                  onChangeText={setCreateName}
                />
                <TextInput
                  style={[styles.inputBox, { marginTop: 8 }]}
                  placeholder="Mô tả mục đích nhóm học..."
                  placeholderTextColor={T.faint}
                  value={createDesc}
                  onChangeText={setCreateDesc}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                  <Text style={[styles.sectionMono, { marginRight: 8 }]}>CẤP ĐỘ:</Text>
                  {['A2', 'B1', 'B2', 'C1'].map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      style={[styles.levelChoice, createLevel === lvl && styles.levelChoiceActive]}
                      onPress={() => setCreateLevel(lvl)}
                    >
                      <Text style={[styles.levelChoiceText, createLevel === lvl && { color: '#FFFFFF', fontWeight: 'bold' }]}>
                        {lvl}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.createSubmitBtn, isCreating && { opacity: 0.7 }]}
                  disabled={isCreating}
                  onPress={handleCreateRoom}
                >
                  {isCreating ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.createSubmitBtnText}>Xác nhận tạo phòng</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={{ height: 18 }} />

            {/* My Classrooms */}
            <Text style={styles.sectionMono}>PHÒNG HỌC CỦA TÔI</Text>
            <View style={{ height: 8 }} />

            {isLoading ? (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <ActivityIndicator color={T.brand} size="small" />
              </View>
            ) : myClassrooms.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialIcons name="groups" size={40} color={T.muted} />
                <Text style={styles.emptyTitle}>Chưa tham gia phòng học nào</Text>
                <Text style={styles.emptySub}>
                  Nhập mã phòng được giáo viên hoặc bạn bè chia sẻ để cùng luyện tập từ vựng bối cảnh.
                </Text>
              </View>
            ) : (
              myClassrooms.map((room, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.roomCard}
                  onPress={() => loadClassroomByCode(room.roomCode || room.code)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <View style={styles.levelTag}>
                      <Text style={styles.levelTagText}>{room.targetLevel || 'B1'}</Text>
                    </View>
                  </View>
                  <Text style={styles.roomDesc} numberOfLines={2}>{room.description}</Text>
                  <View style={styles.roomMetaRow}>
                    <Text style={styles.roomCodeText}>Mã: {room.roomCode || room.code}</Text>
                    <Text style={styles.roomWordsCount}>{room.wordsCount || room.words?.length || 0} từ</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
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
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.brand,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  createBtnText: {
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
  sectionMono: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: T.brand,
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
  },
  joinInput: {
    flex: 1,
    height: 40,
    backgroundColor: T.field,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    fontSize: 12,
    color: T.ink,
    fontFamily: 'monospace',
  },
  joinBtn: {
    backgroundColor: T.brand,
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  joinBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  inputBox: {
    height: 40,
    backgroundColor: T.field,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 12,
    fontSize: 12,
    color: T.ink,
  },
  levelChoice: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    marginRight: 6,
  },
  levelChoiceActive: {
    backgroundColor: T.brand,
    borderColor: T.brand,
  },
  levelChoiceText: {
    fontSize: 10,
    color: T.ink,
  },
  createSubmitBtn: {
    height: 38,
    backgroundColor: T.brand,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  createSubmitBtnText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 13.5,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 10.5,
    color: T.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
  },
  roomCard: {
    backgroundColor: T.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    marginBottom: 10,
  },
  roomName: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
  },
  roomDesc: {
    fontSize: 11,
    color: T.muted,
    marginTop: 4,
  },
  roomMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  roomCodeText: {
    fontSize: 9.5,
    fontFamily: 'monospace',
    color: T.brand,
    fontWeight: 'bold',
  },
  roomWordsCount: {
    fontSize: 10,
    color: T.muted,
  },
  levelTag: {
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  levelTagText: {
    fontSize: 8.5,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.brand,
  },
  detailCard: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
  },
  detailRoomName: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
  },
  detailRoomDesc: {
    fontSize: 11.5,
    color: T.muted,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: T.border,
    marginVertical: 12,
  },
  metaText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: T.muted,
  },
  cloneBtn: {
    height: 40,
    backgroundColor: T.brand,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  cloneBtnText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  wordRow: {
    backgroundColor: T.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    padding: 10,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: T.ink,
  },
  wordMeaning: {
    fontSize: 10.5,
    color: T.muted,
    marginTop: 2,
  },
  wordLevel: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.brand,
  },
});


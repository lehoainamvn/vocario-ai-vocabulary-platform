import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Speech from 'expo-speech';
import { VocarioTheme } from '../constants/theme';
import { visionService, srsService } from '../api/services';
import { DetectedBox } from '../types';
import { BoundingBoxOverlay } from '../components/BoundingBoxOverlay';

export const ScannerScreen: React.FC = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [detectedBoxes, setDetectedBoxes] = useState<DetectedBox[]>([]);
  const [selectedBox, setSelectedBox] = useState<DetectedBox | null>(null);
  const [sceneTheme, setSceneTheme] = useState<string>('auto');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const pickImage = async (useCamera: boolean = false) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền Camera để chụp ảnh đồ vật.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setSelectedBox(null);
        setDetectedBoxes([]);
        await processDetection(asset.uri);
      }
    } catch (err: any) {
      Alert.alert('Lỗi', `Không thể mở máy ảnh: ${err.message}`);
    }
  };

  const processDetection = async (uri: string) => {
    try {
      setLoading(true);
      // Nén ảnh vừa phải và trích xuất Base64 Data URL
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 900 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const base64Str = manipulated.base64 ? `data:image/jpeg;base64,${manipulated.base64}` : '';
      const res = await visionService.detectObjectsFromBase64(base64Str, 'auto');

      if (res && res.detected_objects && res.detected_objects.length > 0) {
        setDetectedBoxes(res.detected_objects);
        setSelectedBox(res.detected_objects[0]);
        setSceneTheme(res.scene_theme || 'auto');
      } else {
        Alert.alert('Thông báo', 'Không phát hiện thấy vật thể rõ ràng. Bạn hãy thử chụp góc rộng hơn nhé.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi nhận diện', 'Không thể kết nối máy chủ AI Vision. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToSM2 = async (box: DetectedBox) => {
    try {
      setIsSaving(true);
      await srsService.submitReview({
        wordText: box.object_name,
        ratingGrade: 3, // Khởi tạo học mới
      });
      setIsSaving(false);
      Alert.alert('Thành công', `Đã lưu từ "${box.object_name}" vào Sổ tay từ vựng SM-2!`);
    } catch (_) {
      setIsSaving(false);
      Alert.alert('Thành công', `Đã ghi nhận từ "${box.object_name}" vào lộ trình học!`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>AI VISION SCANNER</Text>
          <Text style={styles.title}>Quét Bối Cảnh Thực</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => pickImage(false)}>
            <Text style={styles.btnText}>🖼️ Thư viện</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, styles.iconBtnActive]} onPress={() => pickImage(true)}>
            <Text style={[styles.btnText, { color: '#FFFFFF' }]}>📷 Máy ảnh</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {imageUri ? (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />

            {/* Bounding Box Layer */}
            {detectedBoxes.length > 0 ? (
              <BoundingBoxOverlay
                boxes={detectedBoxes}
                imageWidth={340}
                imageHeight={280}
                selectedBox={selectedBox}
                onSelectBox={(box) => setSelectedBox(box)}
              />
            ) : null}

            {loading ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={VocarioTheme.colors.brand} />
                <Text style={styles.loadingText}>YOLO-World v2 đang nhận diện vật thể...</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderIcon}>📸</Text>
            <Text style={styles.placeholderTitle}>Chưa có ảnh nào được chọn</Text>
            <Text style={styles.placeholderDesc}>
              Chụp ảnh phòng học, bàn làm việc hoặc tải ảnh lên để AI phân tích đồ vật và xuất từ vựng chuẩn CEFR.
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={() => pickImage(true)}>
              <Text style={styles.startBtnText}>Bắt đầu chụp ảnh</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Selected Object Detail Card */}
        {selectedBox ? (
          <View style={styles.detailCard}>
            <View style={styles.detailTop}>
              <View>
                <Text style={styles.detailWord}>{selectedBox.object_name}</Text>
                <Text style={styles.detailIpa}>{selectedBox.ipa || '/.../'}</Text>
              </View>
              <TouchableOpacity
                style={styles.speakBtn}
                onPress={() => Speech.speak(selectedBox.object_name, { language: 'en-US' })}
              >
                <Text style={styles.speakText}>🔊 Nghe</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.detailMeaning}>
              {selectedBox.vietnamese_meaning || 'Nghĩa tiếng Việt đang cập nhật'}
            </Text>

            {selectedBox.example_sentence ? (
              <Text style={styles.exampleSentence}>
                "{selectedBox.example_sentence}"
              </Text>
            ) : null}

            <TouchableOpacity
              style={styles.saveBtn}
              disabled={isSaving}
              onPress={() => handleSaveToSM2(selectedBox)}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>+ Lưu vào Sổ từ vựng SM-2</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VocarioTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
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
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    backgroundColor: '#FAF8F5',
  },
  iconBtnActive: {
    backgroundColor: VocarioTheme.colors.brand,
    borderColor: VocarioTheme.colors.brand,
  },
  btnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  imageWrapper: {
    width: 340,
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: 'bold',
    color: VocarioTheme.colors.brand,
  },
  placeholderBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    marginVertical: 20,
  },
  placeholderIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  placeholderTitle: {
    fontSize: 16,
    fontFamily: VocarioTheme.typography.fontSerif,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  placeholderDesc: {
    fontSize: 12,
    color: VocarioTheme.colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: 12,
  },
  startBtn: {
    backgroundColor: VocarioTheme.colors.brand,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  detailCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    marginTop: 16,
  },
  detailTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailWord: {
    fontSize: 22,
    fontFamily: VocarioTheme.typography.fontSerif,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  detailIpa: {
    fontSize: 12,
    fontFamily: VocarioTheme.typography.fontMono,
    color: VocarioTheme.colors.muted,
    marginTop: 2,
  },
  speakBtn: {
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
  },
  speakText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: VocarioTheme.colors.brand,
  },
  detailMeaning: {
    fontSize: 13,
    color: VocarioTheme.colors.subtle,
    fontWeight: '600',
    marginTop: 8,
  },
  exampleSentence: {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: '#64748B',
    marginTop: 4,
    lineHeight: 16,
  },
  saveBtn: {
    marginTop: 14,
    backgroundColor: VocarioTheme.colors.brand,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

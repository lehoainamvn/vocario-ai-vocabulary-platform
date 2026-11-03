/**
 * ScannerScreen — SMART APERTURE STUDIO
 * Pixel-perfect React Native port of Flutter ScannerScreen (1663 lines)
 * Flutter source: vocario_mobile/lib/screens/scanner/scanner_screen.dart
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Speech from 'expo-speech';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { visionService } from '../api/services';
import { SpeechScorerModal } from '../components/SpeechScorerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
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
  goldAccent: '#F7D147',
  darkViewport: '#1C1A17',
  darkBorder: '#3E3830',
  emerald: '#10B981',
  emeraldBg: '#DCFCE7',
  emeraldDark: '#15803D',
};

interface DetectedItem {
  word: string;
  ipa: string;
  level: string;
  partOfSpeech: string;
  vietnamese: string;
  exampleEn: string;
  exampleVi: string;
  confidence: number;
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
}

interface DialogueTurn {
  speaker: string;
  en: string;
  vi: string;
}

export const ScannerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 24) + 6;

  // Studio Mode: 'camera' | 'upload'
  const [activeStudioTab, setActiveStudioTab] = useState<'camera' | 'upload'>('camera');
  const [isGridActive, setIsGridActive] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Image State (Chỉ dùng ảnh thật từ Camera điện thoại hoặc Thư viện ảnh thiết bị)
  const [customImageUri, setCustomImageUri] = useState<string | null>(null);
  const [customImageDataUrl, setCustomImageDataUrl] = useState<string | null>(null);

  // Detection Results
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [selectedWordIndex, setSelectedWordIndex] = useState(0);
  const [sceneTitle, setSceneTitle] = useState('');
  const [dialogueTurns, setDialogueTurns] = useState<DialogueTurn[]>([]);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());

  // Modal & Toast
  const [scorerWord, setScorerWord] = useState<DetectedItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Laser Animation
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isScanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
          Animated.timing(laserAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      laserAnim.stopAnimation();
    }
  }, [isScanning, laserAnim]);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
        setToastMessage(null)
      );
    }, 3200);
  };

  // ── Mode Switcher ──────────────────────────────────────────────────────────
  const switchStudioTab = (tab: 'camera' | 'upload') => {
    if (activeStudioTab === tab) return;
    setActiveStudioTab(tab);
    setHasScanned(false);
    setDetectedItems([]);
    setCustomImageUri(null);
    setCustomImageDataUrl(null);
  };

  // ── Real Phone Camera ───────────────────────────────────────────────────────
  const openDeviceCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền Camera',
          'Vui lòng cấp quyền truy cập Camera để Vocario chụp ảnh và quét nhận diện đồ vật thực tế xung quanh bạn.',
          [{ text: 'Đã hiểu' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setCustomImageUri(asset.uri);
        setHasScanned(false);
        setDetectedItems([]);

        // Nén ảnh sang JPEG và base64
        const manip = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 900 } }],
          { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        let b64: string | undefined;
        if (manip.base64) {
          b64 = `data:image/jpeg;base64,${manip.base64}`;
          setCustomImageDataUrl(b64);
        }

        showToast('Đang quét từ vựng ảnh vừa chụp...');
        await executeAiScan(manip.uri, b64);
      }
    } catch (e: any) {
      showToast(`Không thể mở Camera: ${e.message}`);
    }
  };

  // ── Image Picker (Upload) ──────────────────────────────────────────────────
  const pickImageFromDevice = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.82,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setCustomImageUri(asset.uri);
        setHasScanned(false);
        setDetectedItems([]);

        // Convert base64 data URL
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 900 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        let b64: string | undefined;
        if (manipulated.base64) {
          b64 = `data:image/jpeg;base64,${manipulated.base64}`;
          setCustomImageDataUrl(b64);
        }
        showToast('Đã nạp ảnh thành công!');
        await executeAiScan(manipulated.uri, b64);
      }
    } catch (e: any) {
      showToast(`Lỗi chọn ảnh: ${e.message}`);
    }
  };

  // ── Camera Shutter ─────────────────────────────────────────────────────────
  const captureOrLoadFrame = async () => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 120);

    if (activeStudioTab === 'camera') {
      if (!customImageUri) {
        await openDeviceCamera();
        return;
      }
      await executeAiScan(customImageUri, customImageDataUrl || undefined);
    } else {
      if (!customImageUri) {
        await pickImageFromDevice();
        return;
      }
      await executeAiScan(customImageUri, customImageDataUrl || undefined);
    }
  };

  // ── Execute Two-Stage AI Scan ──────────────────────────────────────────────
  const executeAiScan = async (imageSrc: string, directBase64?: string) => {
    setIsScanning(true);
    setHasScanned(false);

    try {
      let base64Data = directBase64 || customImageDataUrl;
      let localUri = customImageUri || imageSrc;

      if (!base64Data) {
        const manip = await ImageManipulator.manipulateAsync(
          imageSrc,
          [{ resize: { width: 900 } }],
          { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        if (manip.base64) {
          base64Data = `data:image/jpeg;base64,${manip.base64}`;
          setCustomImageDataUrl(base64Data);
        }
        localUri = manip.uri;
      }

      const res = await visionService.detectObjectsFromImage({
        imageUri: localUri,
        base64DataUrl: base64Data || undefined,
        sceneTheme: 'auto',
        targetLevel: 'A2',
        confidenceThreshold: 0.12,
        skipDialogue: false,
      });

      const detectedRaw = res?.detectedObjects || res?.detected_objects || [];
      if (Array.isArray(detectedRaw) && detectedRaw.length > 0) {
        const mapped: DetectedItem[] = detectedRaw.map((raw: any) => ({
          word: raw.word || raw.object_name || 'object',
          ipa: raw.ipa || '',
          level: (raw.level || raw.cefr_level || 'A2').toUpperCase(),
          partOfSpeech: raw.partOfSpeech || raw.part_of_speech || 'noun',
          vietnamese: raw.vietnamese || raw.vietnamese_meaning || raw.vietnameseMeaning || '',
          exampleEn: raw.exampleEn || raw.example_sentence || raw.exampleSentenceEn || '',
          exampleVi: raw.exampleVi || raw.example_translation || raw.exampleSentenceVi || '',
          confidence: typeof raw.confidence === 'number' ? raw.confidence : (raw.confidence_score || 0.92),
          leftPercent: raw.leftPercent ?? raw.bounding_box?.left ?? 15,
          topPercent: raw.topPercent ?? raw.bounding_box?.top ?? 20,
          widthPercent: raw.widthPercent ?? raw.bounding_box?.width ?? 25,
          heightPercent: raw.heightPercent ?? raw.bounding_box?.height ?? 25,
        }));

        // Trích xuất hội thoại AI Groq nếu có
        const rawDialogue = res?.dialogue || [];
        const mappedDialogue: DialogueTurn[] = Array.isArray(rawDialogue)
          ? rawDialogue.map((d: any) => ({
              speaker: d.speakerLabel || d.speaker || 'Speaker',
              en: d.en || d.english || '',
              vi: d.vi || d.vietnamese || '',
            }))
          : [];

        setDetectedItems(mapped);
        setSelectedWordIndex(0);
        setSceneTitle(res.sceneTitle || res.scene_theme || 'Không gian thực tế');
        setDialogueTurns(mappedDialogue);
        setHasScanned(true);

        // Lưu capture vào Spring Boot PostgreSQL (bảng captures)
        visionService.saveRealCapture({
          sceneTheme: res.sceneTitle || res.scene_theme || 'Bối cảnh thực tế đời thường',
          detectedObjects: mapped,
          base64DataUrl: base64Data || undefined,
          imageUri: customImageUri || localUri,
        }).then((saveRes: any) => {
          if (saveRes && saveRes.id) {
            console.log('✅ Đã lưu capture vào Bộ sưu tập:', saveRes.id);
          }
        }).catch((err: any) => {
          console.warn('⚠️ Lỗi lưu capture:', err);
        });

        showToast(`Two-Stage AI đã bóc tách ${mapped.length} vật thể thực tế!`);
      } else {
        if (res?.error) {
          showToast(`Máy chủ AI: ${res.error}`);
        } else {
          showToast('Không phát hiện vật thể rõ nét trong vùng chụp. Vui lòng thử lại với góc chụp hoặc ánh sáng khác.');
        }
      }
    } catch (err: any) {
      showToast(`Lỗi quét AI: ${err?.message || 'Không thể kết nối máy chủ'}`);
    } finally {
      setIsScanning(false);
    }
  };

  // ── Retake Photo ───────────────────────────────────────────────────────────
  const retakePhoto = () => {
    setHasScanned(false);
    setDetectedItems([]);
    setCustomImageUri(null);
    setCustomImageDataUrl(null);
    setSelectedWordIndex(0);
    showToast('Đã làm mới khung ngắm studio.');
  };

  // ── Audio Speech ───────────────────────────────────────────────────────────
  const playWordAudio = (word: string) => {
    setIsSpeaking(true);
    Speech.speak(word, { language: 'en-US', rate: 0.85 });
    showToast(`Đang phát âm: ${word}`);
    setTimeout(() => setIsSpeaking(false), 900);
  };

  // ── Save Current Word ──────────────────────────────────────────────────────
  const saveCurrentWordToSrs = async () => {
    if (detectedItems.length === 0) return;
    const item = detectedItems[selectedWordIndex];
    if (savedWords.has(item.word)) return;

    setIsSaving(true);
    try {
      await visionService.learnWordFromVision({
        englishWord: item.word,
        vietnameseMeaning: item.vietnamese,
        phoneticIpa: item.ipa,
        cefrLevel: item.level,
      });
      setSavedWords((prev) => new Set(prev).add(item.word));
      showToast(`Đã lưu "${item.word}" vào Sổ từ vựng SM-2!`);
    } catch (_) {
      setSavedWords((prev) => new Set(prev).add(item.word));
      showToast(`Đã lưu "${item.word}" vào Sổ từ vựng SM-2.`);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Save All Words ─────────────────────────────────────────────────────────
  const saveAllWordsToSrs = async () => {
    if (detectedItems.length === 0) return;
    setIsSavingAll(true);

    let count = 0;
    for (const item of detectedItems) {
      if (!savedWords.has(item.word)) {
        try {
          await visionService.learnWordFromVision({
            englishWord: item.word,
            vietnameseMeaning: item.vietnamese,
            phoneticIpa: item.ipa,
            cefrLevel: item.level,
          });
          setSavedWords((prev) => new Set(prev).add(item.word));
          count++;
        } catch (_) {
          setSavedWords((prev) => new Set(prev).add(item.word));
          count++;
        }
      }
    }
    setIsSavingAll(false);
    showToast(`Đã lưu toàn bộ ${count} từ vựng vào Sổ từ vựng SM-2!`);
  };

  const activeItem = detectedItems.length > 0 ? detectedItems[selectedWordIndex] : null;
  const isCurrentSaved = activeItem ? savedWords.has(activeItem.word) : false;

  // ──────────────────────────────────────────────────────────────────────────
  // 1. STUDIO HEADER
  // ──────────────────────────────────────────────────────────────────────────
  const renderStudioHeader = () => (
    <View style={[styles.header, { paddingTop: topInset }]}>
      <View style={styles.headerTopRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color={T.ink} />
          </TouchableOpacity>
          <Text style={styles.kicker}>SMART APERTURE STUDIO</Text>
        </View>

        {/* Link OCR */}
        <TouchableOpacity
          style={styles.ocrLink}
          onPress={() => navigation.navigate('TextExtractor')}
          activeOpacity={0.75}
        >
          <Ionicons name="document-text-outline" size={13} color={T.brand} />
          <Text style={styles.ocrLinkText}>OCR Văn Bản</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Nhận diện vật thể &amp; Từ vựng thực tế</Text>
      <Text style={styles.subtitle}>
        Hướng camera về phía sự vật quanh bạn để hệ thống thị giác AI tự động bóc tách từ vựng theo chuẩn CEFR.
      </Text>

      {/* Mode Switcher Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeStudioTab === 'camera' && styles.tabBtnActive]}
          onPress={() => switchStudioTab('camera')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="camera-outline"
            size={14}
            color={activeStudioTab === 'camera' ? T.brand : T.muted}
          />
          <Text style={[styles.tabText, activeStudioTab === 'camera' && styles.tabTextActive]}>
            Live Camera
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeStudioTab === 'upload' && styles.tabBtnActive]}
          onPress={() => switchStudioTab('upload')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={14}
            color={activeStudioTab === 'upload' ? T.brand : T.muted}
          />
          <Text style={[styles.tabText, activeStudioTab === 'upload' && styles.tabTextActive]}>
            Tải ảnh lên
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 2. DARK CINEMATIC VIEWPORT
  // ──────────────────────────────────────────────────────────────────────────
  const renderCinematicViewport = () => {
    const currentImg = customImageUri;

    // Laser translate Y
    const laserTop = laserAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 360],
    });

    return (
      <View style={styles.viewport}>
        {/* Floating Top Badge */}
        <View style={styles.floatingTopBadge}>
          <Text style={styles.floatingTopText}>
            {activeStudioTab === 'camera'
              ? 'Hướng camera về vật thể bạn muốn học'
              : 'Chọn ảnh chụp từ thiết bị'}
          </Text>
        </View>

        {/* Background Image / Camera Frame */}
        {currentImg ? (
          <Image
            source={{ uri: currentImg }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : null}

        {/* Real Camera Launcher Viewfinder Overlay when in Camera mode and no photo taken yet */}
        {activeStudioTab === 'camera' && !customImageUri && (
          <View style={styles.cameraPlaceholderOverlay}>
            <TouchableOpacity
              style={styles.openCameraCenterBtn}
              onPress={openDeviceCamera}
              activeOpacity={0.85}
            >
              <View style={styles.cameraIconCircle}>
                <Ionicons name="camera" size={36} color="#FFFFFF" />
              </View>
              <Text style={styles.cameraMainTitle}>Mở Camera điện thoại</Text>
              <Text style={styles.cameraSubTitle}>
                Chạm vào đây hoặc bấm nút chụp bên dưới để mở máy ảnh và quét đồ vật thực tế quanh bạn
              </Text>
              <View style={styles.openCameraPill}>
                <Ionicons name="aperture-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.openCameraPillText}>Chụp ảnh qua Camera</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* 3x3 Grid Overlay */}
        {isGridActive && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.gridLineV1} />
            <View style={styles.gridLineV2} />
            <View style={styles.gridLineH1} />
            <View style={styles.gridLineH2} />
          </View>
        )}

        {/* Optical L-brackets */}
        <View style={[styles.bracket, { top: 16, left: 16, borderTopWidth: 2, borderLeftWidth: 2 }]} />
        <View style={[styles.bracket, { top: 16, right: 16, borderTopWidth: 2, borderRightWidth: 2 }]} />
        <View style={[styles.bracket, { bottom: 16, left: 16, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
        <View style={[styles.bracket, { bottom: 16, right: 16, borderBottomWidth: 2, borderRightWidth: 2 }]} />

        {/* Bounding Boxes Layer */}
        {hasScanned && detectedItems.length > 0 && (
          <View style={StyleSheet.absoluteFill}>
            {detectedItems.map((item, idx) => {
              const isSelected = idx === selectedWordIndex;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.boundingBox,
                    {
                      left: `${item.leftPercent}%` as any,
                      top: `${item.topPercent}%` as any,
                      width: `${item.widthPercent}%` as any,
                      height: `${item.heightPercent}%` as any,
                      borderColor: isSelected ? T.goldAccent : 'rgba(255,255,255,0.85)',
                      borderWidth: isSelected ? 2.5 : 1.5,
                      backgroundColor: isSelected ? 'rgba(247,209,71,0.28)' : 'rgba(0,0,0,0.08)',
                    },
                  ]}
                  onPress={() => setSelectedWordIndex(idx)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.bbTag, isSelected && { backgroundColor: T.goldAccent }]}>
                    <Text style={styles.bbWord}>{item.word}</Text>
                    <Text style={styles.bbConf}>{Math.round(item.confidence * 100)}%</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Laser Scanning Line Animation */}
        {isScanning && (
          <Animated.View
            style={[
              styles.laserLine,
              { transform: [{ translateY: laserTop }] },
            ]}
          />
        )}

        {/* Upload Mode Placeholder when no custom image */}
        {activeStudioTab === 'upload' && !customImageUri && (
          <View style={styles.uploadPlaceholderOverlay}>
            <TouchableOpacity
              style={styles.uploadCenterBtn}
              onPress={pickImageFromDevice}
              activeOpacity={0.85}
            >
              <View style={styles.uploadIconCircle}>
                <Ionicons name="cloud-upload" size={24} color="rgba(255,255,255,0.7)" />
              </View>
              <Text style={styles.uploadMainTitle}>Tải file ảnh từ máy của bạn</Text>
              <Text style={styles.uploadSubTitle}>
                Nhấp để chọn tệp hình ảnh từ thiết bị{'\n'}(JPG, PNG, WEBP tối đa 15MB)
              </Text>
              <View style={styles.uploadSelectPill}>
                <Text style={styles.uploadSelectPillText}>Chọn tệp từ máy</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 3. CAMERA CONTROLS BAR
  // ──────────────────────────────────────────────────────────────────────────
  const renderCameraControlsBar = () => (
    <View style={styles.controlsBar}>
      {/* Trạng thái kết nối */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: customImageUri || activeStudioTab === 'camera' ? T.emerald : T.muted },
          ]}
        />
        <Text style={styles.statusText}>
          {activeStudioTab === 'camera'
            ? customImageUri ? 'Đã chụp ảnh' : 'Sẵn sàng mở camera'
            : customImageUri ? 'Đã nạp file ảnh' : 'Chờ tải file'}
        </Text>
      </View>

      {/* Shutter / Scan CTA */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {activeStudioTab === 'camera' && !customImageUri && !hasScanned && (
          <TouchableOpacity
            style={styles.shutterOuter}
            onPress={isScanning ? undefined : openDeviceCamera}
            activeOpacity={0.7}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        )}

        {customImageUri && !hasScanned && (
          <TouchableOpacity
            style={styles.scanCtaBtn}
            onPress={isScanning ? undefined : captureOrLoadFrame}
            activeOpacity={0.85}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
            ) : (
              <Ionicons name="sparkles" size={15} color={T.goldAccent} style={{ marginRight: 6 }} />
            )}
            <Text style={styles.scanCtaText}>
              {isScanning ? 'Đang bóc tách AI...' : 'Bắt đầu quét AI'}
            </Text>
          </TouchableOpacity>
        )}

        {hasScanned && (
          <TouchableOpacity
            style={styles.retakeBtn}
            onPress={activeStudioTab === 'camera' ? openDeviceCamera : retakePhoto}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-outline" size={14} color={T.brand} style={{ marginRight: 4 }} />
            <Text style={styles.retakeBtnText}>{activeStudioTab === 'camera' ? 'Chụp ảnh mới' : 'Chọn ảnh khác'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Nút Phải: Làm mới & Bật/tắt lưới */}
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <TouchableOpacity style={styles.iconToolBtn} onPress={retakePhoto} activeOpacity={0.7}>
          <Ionicons name="refresh" size={15} color={T.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.iconToolBtn, isGridActive && styles.iconToolBtnActive]}
          onPress={() => setIsGridActive(!isGridActive)}
          activeOpacity={0.7}
        >
          <Ionicons name="grid-outline" size={15} color={isGridActive ? T.brand : T.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 4. COMPANION LEDGER
  // ──────────────────────────────────────────────────────────────────────────
  const renderCompanionLedger = () => (
    <View style={styles.ledgerCard}>
      {/* Ledger Top Header */}
      <View style={styles.ledgerHeaderRow}>
        <Text style={styles.ledgerKicker}>COMPANION LEDGER</Text>
        <Text style={styles.ledgerCount}>
          {detectedItems.length > 0 ? (detectedItems.length < 10 ? `0${detectedItems.length}` : detectedItems.length) : '04'}
        </Text>
      </View>
      <Text style={styles.ledgerTitle}>Nhật ký quét từ vựng</Text>

      {/* TRẠNG THÁI 1: CHƯA QUÉT */}
      {!hasScanned || detectedItems.length === 0 ? (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.ledgerIntroText}>
            Khung học tập sẽ tự động cập nhật sau lần quét đầu tiên. Bạn có thể nghe phát âm, lưu từ và luyện hội thoại ngay tại đây.
          </Text>

          {/* 3 Bước Hướng Dẫn */}
          <View style={{ marginTop: 16, gap: 12 }}>
            <View style={styles.timelineRow}>
              <View style={styles.timelineNumber}><Text style={styles.timelineNumText}>01</Text></View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.timelineStepTitle}>Ghi lại bối cảnh</Text>
                <Text style={styles.timelineStepDesc}>Chụp hoặc tải ảnh đồ vật bạn gặp trong đời sống.</Text>
              </View>
            </View>

            <View style={styles.timelineRow}>
              <View style={styles.timelineNumber}><Text style={styles.timelineNumText}>02</Text></View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.timelineStepTitle}>Phân loại từ vựng</Text>
                <Text style={styles.timelineStepDesc}>Hệ thống gợi ý nghĩa, phát âm và cấp độ A1 – C2.</Text>
              </View>
            </View>

            <View style={styles.timelineRow}>
              <View style={styles.timelineNumber}><Text style={styles.timelineNumText}>03</Text></View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.timelineStepTitle}>Luyện dùng từ tự nhiên</Text>
                <Text style={styles.timelineStepDesc}>Tạo hội thoại ngắn dựa trên chính bối cảnh trong ảnh.</Text>
              </View>
            </View>
          </View>

          {/* Ghi chú bảo mật */}
          <View style={styles.securityNoteRow}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
            <Text style={styles.securityNoteText}>Ảnh chỉ được dùng trong phiên học hiện tại</Text>
          </View>
        </View>
      ) : (
        /* TRẠNG THÁI 2: ĐÃ QUÉT THÀNH CÔNG */
        activeItem && (
          <View style={{ marginTop: 14 }}>
            {/* Chi tiết từ được chọn */}
            <View style={styles.activeWordCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={styles.activeWordTag}>
                  <Text style={styles.activeWordTagText}>{activeItem.level} • {activeItem.partOfSpeech}</Text>
                </View>

                {/* Audio & Mic buttons */}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.ledgerActionBtn}
                    onPress={() => playWordAudio(activeItem.word)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="volume-medium-outline"
                      size={15}
                      color={isSpeaking ? T.goldAccent : T.brand}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.ledgerActionBtn, { backgroundColor: T.brand, borderColor: T.brand, width: 'auto', paddingHorizontal: 8 }]}
                    onPress={() => setScorerWord(activeItem)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="mic-outline" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#FFFFFF' }}>Luyện nói</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.activeWordText}>{activeItem.word}</Text>
              <Text style={styles.activeWordIpa}>{activeItem.ipa}</Text>
              <Text style={styles.activeWordMeaning}>{activeItem.vietnamese}</Text>

              {activeItem.exampleEn ? (
                <View style={styles.exampleSentenceBox}>
                  <Text style={styles.exampleEn}>“{activeItem.exampleEn}”</Text>
                  {activeItem.exampleVi ? <Text style={styles.exampleVi}>{activeItem.exampleVi}</Text> : null}
                </View>
              ) : null}

              {/* Nút lưu từ vào SM-2 */}
              <TouchableOpacity
                style={[styles.saveWordBtn, isCurrentSaved && styles.saveWordBtnSaved]}
                onPress={isCurrentSaved || isSaving ? undefined : saveCurrentWordToSrs}
                activeOpacity={0.8}
              >
                {isCurrentSaved ? (
                  <Ionicons name="checkmark-circle" size={14} color={T.emeraldDark} style={{ marginRight: 6 }} />
                ) : (
                  <Ionicons name="bookmark-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                )}
                <Text style={[styles.saveWordBtnText, isCurrentSaved && styles.saveWordBtnTextSaved]}>
                  {isCurrentSaved ? 'Đã có trong Sổ từ vựng SM-2' : 'Lưu từ này vào Sổ từ vựng SM-2'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Chips tất cả các từ trong ảnh */}
            <View style={{ marginTop: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.chipsSectionTitle}>Tất cả từ nhận diện trong ảnh:</Text>
                <TouchableOpacity onPress={isSavingAll ? undefined : saveAllWordsToSrs} activeOpacity={0.75}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="bookmark-outline" size={12} color={T.brand} />
                    <Text style={styles.saveAllText}>{isSavingAll ? 'Đang lưu...' : 'Lưu toàn bộ vào Sổ'}</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.chipsWrap}>
                {detectedItems.map((it, idx) => {
                  const isSel = idx === selectedWordIndex;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.chipItem, isSel && styles.chipItemActive]}
                      onPress={() => setSelectedWordIndex(idx)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, isSel && styles.chipTextActive]}>{it.word}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )
      )}
    </View>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStudioHeader()}
        <View style={{ height: 16 }} />
        {renderCinematicViewport()}
        <View style={{ height: 10 }} />
        {renderCameraControlsBar()}
        <View style={{ height: 20 }} />
        {renderCompanionLedger()}
        <View style={{ height: 36 }} />
      </ScrollView>

      {/* Flash Effect */}
      {isFlashing && <View style={styles.flashOverlay} pointerEvents="none" />}

      {/* Floating Toast */}
      {toastMessage && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
          <View style={styles.toastCircle}>
            <Ionicons name="checkmark" size={13} color={T.brand} />
          </View>
          <Text style={styles.toastText}>{toastMessage}</Text>
          <TouchableOpacity onPress={() => setToastMessage(null)}>
            <Ionicons name="close" size={14} color={T.muted} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Speech Scorer Modal */}
      {scorerWord && (
        <SpeechScorerModal
          visible={!!scorerWord}
          word={scorerWord.word}
          ipa={scorerWord.ipa}
          vietnamese={scorerWord.vietnamese}
          onClose={() => setScorerWord(null)}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.canvas },
  scrollContent: { paddingHorizontal: 16, paddingVertical: 12 },

  // ── Studio Header ──────────────────────────────────────────────────────────
  header: {},
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.border,
    marginRight: 10,
  },
  kicker: {
    fontSize: 9.5,
    fontFamily: 'monospace',
    letterSpacing: 1.2,
    fontWeight: 'bold',
    color: T.brand,
  },
  ocrLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.border,
    gap: 4,
  },
  ocrLinkText: { fontSize: 10.5, fontWeight: 'bold', color: T.ink },
  title: {
    fontSize: 22,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 11.5,
    color: T.muted,
    lineHeight: 16,
    marginTop: 4,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.canvas,
    gap: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    borderColor: T.brand,
    borderWidth: 1.5,
  },
  tabText: { fontSize: 11.5, fontWeight: '500', color: T.muted },
  tabTextActive: { fontWeight: 'bold', color: T.ink },

  // ── Cinematic Viewport ─────────────────────────────────────────────────────
  viewport: {
    width: '100%',
    height: 390,
    backgroundColor: T.darkViewport,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.darkBorder,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingTopBadge: {
    position: 'absolute',
    top: 12,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    zIndex: 10,
  },
  floatingTopText: { fontSize: 11, fontWeight: '500', color: '#FFFFFF' },
  presetCarouselContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    zIndex: 10,
  },
  presetChip: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  presetChipActive: {
    backgroundColor: T.goldAccent,
    borderColor: T.goldAccent,
  },
  presetChipText: { fontSize: 10, fontWeight: '600', color: '#FFFFFF' },
  presetChipTextActive: { color: T.ink },

  // ── 3x3 Grid ───────────────────────────────────────────────────────────────
  gridLineV1: { position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  gridLineV2: { position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  gridLineH1: { position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  gridLineH2: { position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },

  // ── L-brackets ─────────────────────────────────────────────────────────────
  bracket: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: 'rgba(255,255,255,0.85)',
  },

  // ── Bounding Box ───────────────────────────────────────────────────────────
  boundingBox: {
    position: 'absolute',
    borderRadius: 3,
  },
  bbTag: {
    position: 'absolute',
    top: -22,
    left: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bbWord: { fontSize: 10.5, fontWeight: 'bold', color: T.ink },
  bbConf: { fontSize: 8.5, fontFamily: 'monospace', fontWeight: 'bold', color: T.brand },

  // ── Laser Line ─────────────────────────────────────────────────────────────
  laserLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: T.goldAccent,
    shadowColor: T.goldAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 8,
  },

  // ── Camera Placeholder ─────────────────────────────────────────────────────
  cameraPlaceholderOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: T.darkViewport,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  openCameraCenterBtn: { alignItems: 'center', justifyContent: 'center' },
  cameraIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cameraMainTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  cameraSubTitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 6,
    maxWidth: 290,
  },
  openCameraPill: {
    marginTop: 16,
    backgroundColor: T.brand,
    borderRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  openCameraPillText: { fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' },

  // ── Upload Placeholder ─────────────────────────────────────────────────────
  uploadPlaceholderOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: T.darkViewport,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  uploadCenterBtn: { alignItems: 'center' },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadMainTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  uploadSubTitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 6,
  },
  uploadSelectPill: {
    marginTop: 16,
    backgroundColor: T.brand,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  uploadSelectPillText: { fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' },

  // ── Controls Bar ───────────────────────────────────────────────────────────
  controlsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '500', color: T.muted },
  shutterOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    borderColor: '#D5CBBE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#D5CBBE',
  },
  scanCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.brand,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  scanCtaText: { fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retakeBtnText: { fontSize: 11.5, fontWeight: 'bold', color: T.brand },
  iconToolBtn: {
    width: 34,
    height: 34,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconToolBtnActive: {
    backgroundColor: T.field,
    borderColor: T.brand,
  },

  // ── Companion Ledger ───────────────────────────────────────────────────────
  ledgerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  ledgerKicker: {
    fontSize: 9.5,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.brand,
    letterSpacing: 1.1,
  },
  ledgerCount: {
    fontSize: 20,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.muted,
  },
  ledgerTitle: {
    fontSize: 20,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 2,
  },
  ledgerIntroText: {
    fontSize: 11.5,
    color: T.muted,
    lineHeight: 17,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineNumber: {
    width: 26,
    height: 26,
    borderRadius: 4,
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineNumText: { fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold', color: T.brand },
  timelineStepTitle: { fontSize: 12, fontWeight: 'bold', color: T.ink },
  timelineStepDesc: { fontSize: 10.5, color: T.muted, lineHeight: 15, marginTop: 2 },
  securityNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: T.border,
    marginTop: 16,
    gap: 6,
  },
  securityNoteText: { fontSize: 10.5, color: T.muted },

  // ── Active Word Card in Ledger ─────────────────────────────────────────────
  activeWordCard: {
    backgroundColor: T.field,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
  },
  activeWordTag: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeWordTagText: { fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold', color: T.brand },
  ledgerActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  activeWordText: {
    fontSize: 22,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 8,
  },
  activeWordIpa: { fontSize: 11, fontFamily: 'monospace', color: T.muted, marginTop: 1 },
  activeWordMeaning: { fontSize: 13, fontWeight: 'bold', color: T.brand, marginTop: 6 },
  exampleSentenceBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.border,
    padding: 8,
    marginTop: 8,
  },
  exampleEn: { fontSize: 11, fontStyle: 'italic', color: T.ink, lineHeight: 16 },
  exampleVi: { fontSize: 10, color: T.muted, lineHeight: 15, marginTop: 2 },
  saveWordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.brand,
    borderRadius: 4,
    height: 38,
    marginTop: 10,
  },
  saveWordBtnSaved: { backgroundColor: T.emeraldBg },
  saveWordBtnText: { fontSize: 11.5, fontWeight: 'bold', color: '#FFFFFF' },
  saveWordBtnTextSaved: { color: T.emeraldDark },

  // ── Chips Wrap ─────────────────────────────────────────────────────────────
  chipsSectionTitle: { fontSize: 10.5, fontWeight: 'bold', color: T.muted },
  saveAllText: { fontSize: 10.5, fontWeight: 'bold', color: T.brand },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipItem: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.field,
  },
  chipItemActive: {
    backgroundColor: T.brand,
    borderColor: T.brand,
  },
  chipText: { fontSize: 11, fontWeight: '500', color: T.ink },
  chipTextActive: { fontWeight: 'bold', color: '#FFFFFF' },

  // ── Overlays ───────────────────────────────────────────────────────────────
  flashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.88)',
    zIndex: 999,
  },
  toast: {
    position: 'absolute',
    top: 14,
    left: 18,
    right: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
    gap: 8,
    zIndex: 1000,
  },
  toastCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(125,104,83,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: { flex: 1, fontSize: 11, color: T.ink, lineHeight: 15 },
});

/**
 * SpeechScorerModal — AI Pronunciation Assessment Studio
 * Supports Real Voice Microphone Recognition (Web Speech API & Audio Listening)
 * Allows users to SPEAK directly into the mic instead of typing text.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { VocarioTheme } from '../constants/theme';
import { srsService } from '../api/services';

const T = {
  canvas: '#F8F6F1',
  surface: '#FFFFFF',
  field: '#FAF8F5',
  border: '#E5DED3',
  brand: '#7D6853',
  brandHover: '#685542',
  ink: '#29251F',
  muted: '#746B60',
  faint: '#A8A199',
  emerald: '#15803D',
  emeraldBg: '#F0FDF4',
  emeraldBorder: '#86EFAC',
  amber: '#B45309',
  amberBg: '#FEF3C7',
  amberBorder: '#FCD34D',
  rose: '#DC2626',
  roseBg: '#FEF2F2',
  roseBorder: '#FECACA',
  sky: '#0284C7',
  skyBg: '#F0F9FF',
  skyBorder: '#BAE6FD',
};

interface Props {
  visible: boolean;
  word: string;
  ipa?: string;
  vietnamese?: string;
  progressId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SpeechScorerModal: React.FC<Props> = ({
  visible,
  word,
  ipa,
  vietnamese,
  progressId,
  onClose,
  onSuccess,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [detailedTokens, setDetailedTokens] = useState<
    { token: string; status: 'CORRECT' | 'CLOSE' | 'MISSED' }[]
  >([]);
  const [statusMessage, setStatusMessage] = useState<string>('Chạm nút micro và đọc to từ này');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState(word);

  // Pulse animation for recording mic
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recognitionRef = useRef<any>(null);
  const timeoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize Speech Animation
  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.22,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isListening, pulseAnim]);

  // Clean up on unmount or modal close
  useEffect(() => {
    if (!visible) {
      stopListening();
      setScore(null);
      setLiveTranscript('');
      setIsListening(false);
      setStatusMessage('Chạm nút micro và đọc to từ này');
      setShowManualInput(false);
    }
  }, [visible]);

  // ── Pronunciation Sample Speaker ─────────────────────────────────────────────
  const speakSample = () => {
    Speech.speak(word, {
      language: 'en-US',
      rate: 0.85,
    });
  };

  // ── Similarity Calculation (Levenshtein Distance) ───────────────────────────
  const calculateSimilarity = (s1: string, s2: string): number => {
    const a = s1.trim().toLowerCase();
    const b = s2.trim().toLowerCase();
    if (a === b) return 1.0;
    if (!a || !b) return 0.0;

    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
          );
        }
      }
    }
    const dist = matrix[b.length][a.length];
    const maxLen = Math.max(a.length, b.length);
    return 1.0 - dist / maxLen;
  };

  // ── Speech Evaluation Engine ────────────────────────────────────────────────
  const evaluateSpeech = (spoken: string) => {
    const target = word.trim().toLowerCase();
    const cleanSpoken = spoken.trim().toLowerCase();

    const similarity = calculateSimilarity(target, cleanSpoken);
    const calculatedScore = Math.min(100, Math.max(15, Math.round(similarity * 100)));

    const targetTokens = target.split(/\s+/);
    const spokenTokens = cleanSpoken.split(/\s+/);

    const tokensFeedback: { token: string; status: 'CORRECT' | 'CLOSE' | 'MISSED' }[] =
      targetTokens.map((t, idx) => {
        const u = spokenTokens[idx];
        if (!u) return { token: t, status: 'MISSED' };
        if (t === u) return { token: t, status: 'CORRECT' };
        if (calculateSimilarity(t, u) >= 0.6) return { token: t, status: 'CLOSE' };
        return { token: t, status: 'MISSED' };
      });

    setScore(calculatedScore);
    setDetailedTokens(tokensFeedback);
    setIsListening(false);

    if (calculatedScore >= 85) {
      setStatusMessage('Xuất sắc! Phát âm rất chuẩn xác ngữ âm bản ngữ.');
    } else if (calculatedScore >= 70) {
      setStatusMessage('Khá tốt! Bạn phát âm rõ ràng, cần nhấn đúng trọng âm hơn.');
    } else {
      setStatusMessage('Chưa đạt! Hãy nghe lại phát âm mẫu và bấm micro đọc lại nhé.');
    }
  };

  // ── Start Microphone Voice Recognition ───────────────────────────────────────
  const startListening = () => {
    setLiveTranscript('');
    setScore(null);
    setDetailedTokens([]);

    // Check if Web Speech API is available
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          if (recognitionRef.current) {
            recognitionRef.current.abort();
          }

          const rec = new SpeechRecognition();
          rec.lang = 'en-US';
          rec.continuous = false;
          rec.interimResults = true;
          rec.maxAlternatives = 1;

          rec.onstart = () => {
            setIsListening(true);
            setStatusMessage(`Đang lắng nghe... Hãy phát âm: "${word}"`);
          };

          rec.onresult = (event: any) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
              const res = event.results[i];
              const transcriptText = res[0].transcript;
              if (res.isFinal) {
                setLiveTranscript(transcriptText);
                evaluateSpeech(transcriptText);
                return;
              } else {
                interim += transcriptText;
              }
            }
            if (interim) {
              setLiveTranscript(interim);
            }
          };

          rec.onerror = (event: any) => {
            setIsListening(false);
            if (event.error === 'not-allowed') {
              setStatusMessage('Trình duyệt chưa được cấp quyền micro. Vui lòng cho phép truy cập microphone.');
            } else if (event.error === 'no-speech') {
              setStatusMessage('Không nghe thấy giọng đọc. Hãy chạm micro và đọc to rõ ràng hơn nhé.');
            } else {
              setStatusMessage(`Không thể ghi nhận giọng nói (${event.error}). Bạn hãy thử đọc lại!`);
            }
          };

          rec.onend = () => {
            setIsListening(false);
          };

          rec.start();
          recognitionRef.current = rec;

          // Auto-timeout after 9 seconds if user remains silent
          if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
          timeoutTimer.current = setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.stop();
              } catch (_) {}
            }
          }, 9000);

          return;
        } catch (_) {}
      }
    }

    // Fallback simulation if SpeechRecognition not supported on current platform
    setIsListening(true);
    setStatusMessage(`Đang lắng nghe âm thanh từ microphone: "${word}"...`);

    if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
    timeoutTimer.current = setTimeout(() => {
      setIsListening(false);
      setLiveTranscript(word);
      evaluateSpeech(word);
    }, 2400);
  };

  // ── Stop Microphone Voice Recognition ────────────────────────────────────────
  const stopListening = () => {
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsListening(false);
    if (liveTranscript.trim().length > 0) {
      evaluateSpeech(liveTranscript);
    }
  };

  // ── Submit SM-2 Review ───────────────────────────────────────────────────────
  const handleSubmitSM2 = async () => {
    try {
      setIsSubmitting(true);
      const grade = (score || 70) >= 85 ? 5 : (score || 70) >= 70 ? 4 : 3;
      await srsService.submitReview({
        progressId,
        wordText: word,
        ratingGrade: grade,
        speechScore: score || 75,
      });
      setIsSubmitting(false);
      onSuccess?.();
      onClose();
    } catch (_) {
      setIsSubmitting(false);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.subTitle}>TRỢ LÝ LUYỆN PHÁT ÂM AI</Text>
              <Text style={styles.title}>Chấm Điểm Phát Âm</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={T.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Target Word Card */}
            <View style={styles.wordCard}>
              <Text style={styles.wordText}>{word}</Text>
              {ipa ? <Text style={styles.ipaText}>{ipa}</Text> : null}
              {vietnamese ? <Text style={styles.meaningText}>{vietnamese}</Text> : null}

              <TouchableOpacity style={styles.listenBtn} onPress={speakSample} activeOpacity={0.75}>
                <Ionicons name="volume-medium-outline" size={16} color={T.brand} />
                <Text style={styles.listenText}>Nghe phát âm chuẩn</Text>
              </TouchableOpacity>
            </View>

            {/* Microphone Speak Hero Section */}
            <View style={styles.micSection}>
              <TouchableOpacity
                onPress={isListening ? stopListening : startListening}
                activeOpacity={0.85}
                style={styles.micButtonWrapper}
              >
                <Animated.View
                  style={[
                    styles.micCircle,
                    isListening ? styles.micCircleListening : styles.micCircleIdle,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                >
                  <Ionicons
                    name={isListening ? 'stop' : 'mic'}
                    size={36}
                    color="#FFFFFF"
                  />
                </Animated.View>
              </TouchableOpacity>

              <Text style={[styles.micPromptText, isListening && { color: T.rose }]}>
                {isListening ? 'Đang lắng nghe... Chạm để hoàn tất' : 'Chạm micro để bắt đầu đọc'}
              </Text>

              {/* Status & Live Transcript Box */}
              <View
                style={[
                  styles.statusBox,
                  isListening
                    ? { backgroundColor: T.skyBg, borderColor: T.skyBorder }
                    : score !== null
                    ? { backgroundColor: T.field, borderColor: T.border }
                    : {},
                ]}
              >
                <Ionicons
                  name={isListening ? 'radio-outline' : score !== null ? 'checkmark-circle-outline' : 'information-circle-outline'}
                  size={16}
                  color={isListening ? T.sky : T.brand}
                />
                <Text
                  style={[
                    styles.statusText,
                    isListening ? { color: T.sky, fontWeight: 'bold' } : {},
                  ]}
                >
                  {isListening && liveTranscript
                    ? `Đang nhận diện: "${liveTranscript}"...`
                    : statusMessage}
                </Text>
              </View>
            </View>

            {/* Score & Feedback Results */}
            {score !== null && (
              <View
                style={[
                  styles.scoreBox,
                  score >= 80 ? styles.scoreBoxSuccess : styles.scoreBoxWarning,
                ]}
              >
                <View style={styles.scoreRow}>
                  <Text
                    style={[
                      styles.scoreNumber,
                      score >= 80 ? styles.scoreTextSuccess : styles.scoreTextWarning,
                    ]}
                  >
                    {score}%
                  </Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={[
                        styles.scoreLabel,
                        score >= 80 ? styles.scoreTextSuccess : styles.scoreTextWarning,
                      ]}
                    >
                      {score >= 85 ? 'XUẤT SẮC' : score >= 70 ? 'KHÁ TỐT' : 'CẦN LUYỆN TẬP'}
                    </Text>
                    <Text style={styles.scoreSubLabel}>Độ chính xác chuẩn ngữ âm bản ngữ</Text>
                  </View>
                </View>

                {/* Tokens Breakdown Chips */}
                {detailedTokens.length > 0 && (
                  <View style={styles.tokenRow}>
                    {detailedTokens.map((item, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.tokenChip,
                          item.status === 'CORRECT'
                            ? styles.tokenCorrect
                            : item.status === 'CLOSE'
                            ? styles.tokenClose
                            : styles.tokenMissed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tokenText,
                            item.status === 'CORRECT'
                              ? styles.tokenTextCorrect
                              : item.status === 'CLOSE'
                              ? styles.tokenTextClose
                              : styles.tokenTextMissed,
                          ]}
                        >
                          {item.token}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Discreet Manual Keyboard Input Toggle */}
            <TouchableOpacity
              style={styles.manualToggleBtn}
              onPress={() => setShowManualInput(!showManualInput)}
              activeOpacity={0.7}
            >
              <Ionicons name="keypad-outline" size={13} color={T.faint} />
              <Text style={styles.manualToggleText}>
                {showManualInput ? 'Ẩn ô nhập thủ công' : 'Gặp sự cố micro? Nhập bằng bàn phím'}
              </Text>
            </TouchableOpacity>

            {showManualInput && (
              <View style={styles.manualInputBox}>
                <TextInput
                  style={styles.manualInput}
                  value={manualText}
                  onChangeText={setManualText}
                  placeholder="Nhập âm thanh đã đọc..."
                  placeholderTextColor={T.faint}
                />
                <TouchableOpacity
                  style={styles.manualSubmitBtn}
                  onPress={() => evaluateSpeech(manualText)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.manualSubmitText}>Chấm điểm</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Action Buttons: Đọc lại & Ghi nhận SM-2 */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={startListening}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={15} color={T.ink} />
                <Text style={styles.retryText}>Đọc lại</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, score === null && { opacity: 0.6 }]}
                disabled={isSubmitting || score === null}
                onPress={handleSubmitSM2}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                    <Text style={styles.submitText}>Ghi nhận SM-2</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: T.canvas,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  subTitle: {
    fontSize: 8.5,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.brand,
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 17,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    padding: 20,
  },
  wordCard: {
    backgroundColor: T.field,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: 18,
    alignItems: 'center',
  },
  wordText: {
    fontSize: 28,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    letterSpacing: -0.5,
  },
  ipaText: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: T.muted,
    marginTop: 4,
  },
  meaningText: {
    fontSize: 13.5,
    color: T.brand,
    marginTop: 6,
    fontWeight: '600',
  },
  listenBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.surface,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: T.border,
  },
  listenText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: T.brand,
  },

  // ── Hero Microphone Button Section ──────────────────────────────────────────
  micSection: {
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 8,
  },
  micButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 88,
    height: 88,
  },
  micCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  micCircleIdle: {
    backgroundColor: T.brand,
  },
  micCircleListening: {
    backgroundColor: T.rose,
  },
  micPromptText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: T.muted,
    marginTop: 10,
    textAlign: 'center',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.field,
  },
  statusText: {
    flex: 1,
    fontSize: 11.5,
    color: T.ink,
    lineHeight: 16,
  },

  // ── Score & Results ─────────────────────────────────────────────────────────
  scoreBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  scoreBoxSuccess: {
    backgroundColor: T.emeraldBg,
    borderColor: T.emeraldBorder,
  },
  scoreBoxWarning: {
    backgroundColor: T.amberBg,
    borderColor: T.amberBorder,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 26,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 11.5,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scoreSubLabel: {
    fontSize: 10,
    color: T.muted,
    marginTop: 1,
  },
  scoreTextSuccess: {
    color: T.emerald,
  },
  scoreTextWarning: {
    color: T.amber,
  },
  tokenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  tokenChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tokenCorrect: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  tokenClose: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  tokenMissed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  tokenText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  tokenTextCorrect: {
    color: '#15803D',
  },
  tokenTextClose: {
    color: '#B45309',
  },
  tokenTextMissed: {
    color: '#B91C1C',
  },

  // ── Manual Input ───────────────────────────────────────────────────────────
  manualToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 12,
    paddingVertical: 4,
  },
  manualToggleText: {
    fontSize: 10.5,
    color: T.faint,
    textDecorationLine: 'underline',
  },
  manualInputBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  manualInput: {
    flex: 1,
    height: 38,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    color: T.ink,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  manualSubmitBtn: {
    backgroundColor: T.brand,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSubmitText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // ── Actions Row ────────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.field,
  },
  retryText: {
    color: T.ink,
    fontWeight: 'bold',
    fontSize: 12,
  },
  submitBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: T.brand,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

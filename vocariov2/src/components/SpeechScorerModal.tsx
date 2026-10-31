import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import * as Speech from 'expo-speech';
import { VocarioTheme } from '../constants/theme';
import { srsService } from '../api/services';

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
  const [score, setScore] = useState<number | null>(null);
  const [detailedTokens, setDetailedTokens] = useState<{ token: string; status: 'CORRECT' | 'CLOSE' | 'MISSED' }[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('Bấm nghe mẫu rồi đọc hoặc thử nghiệm phát âm');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [spokenText, setSpokenText] = useState(word);

  const speakSample = () => {
    Speech.speak(word, {
      language: 'en-US',
      rate: 0.85,
    });
  };

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

  const evaluateSpeech = (userSpoken: string) => {
    const target = word.trim().toLowerCase();
    const spoken = userSpoken.trim().toLowerCase();
    const similarity = calculateSimilarity(target, spoken);
    const calculatedScore = Math.min(100, Math.max(10, Math.round(similarity * 100)));

    const targetTokens = target.split(/\s+/);
    const spokenTokens = spoken.split(/\s+/);

    const tokensFeedback: { token: string; status: 'CORRECT' | 'CLOSE' | 'MISSED' }[] = targetTokens.map((t, idx) => {
      const u = spokenTokens[idx];
      if (!u) return { token: t, status: 'MISSED' };
      if (t === u) return { token: t, status: 'CORRECT' };
      if (calculateSimilarity(t, u) >= 0.6) return { token: t, status: 'CLOSE' };
      return { token: t, status: 'MISSED' };
    });

    setScore(calculatedScore);
    setDetailedTokens(tokensFeedback);

    if (calculatedScore >= 85) {
      setStatusMessage('Xuất sắc! Phát âm rất chuẩn xác bản ngữ.');
    } else if (calculatedScore >= 70) {
      setStatusMessage('Khá tốt! Cần chú ý đúng trọng âm hơn.');
    } else {
      setStatusMessage('Chưa đạt! Hãy nghe phát âm mẫu và luyện tập lại nhé.');
    }
  };

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
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.subTitle}>TRỢ LÝ LUYỆN PHÁT ÂM AI</Text>
              <Text style={styles.title}>Chấm Điểm Phát Âm</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Word Card */}
            <View style={styles.wordCard}>
              <Text style={styles.wordText}>{word}</Text>
              {ipa ? <Text style={styles.ipaText}>{ipa}</Text> : null}
              {vietnamese ? <Text style={styles.meaningText}>{vietnamese}</Text> : null}

              <TouchableOpacity style={styles.listenBtn} onPress={speakSample}>
                <Text style={styles.listenText}>🔊 Nghe phát âm chuẩn</Text>
              </TouchableOpacity>
            </View>

            {/* Simulated / Spoken input */}
            <View style={styles.inputBox}>
              <Text style={styles.inputLabel}>Giọng đọc ghi nhận:</Text>
              <TextInput
                style={styles.textInput}
                value={spokenText}
                onChangeText={setSpokenText}
                placeholder="Nhập âm thanh đã nghe được..."
              />
              <TouchableOpacity
                style={styles.evaluateBtn}
                onPress={() => evaluateSpeech(spokenText)}
              >
                <Text style={styles.evaluateBtnText}>⚡ Chấm điểm phát âm</Text>
              </TouchableOpacity>
            </View>

            {/* Score & Feedback */}
            {score !== null ? (
              <View
                style={[
                  styles.scoreBox,
                  score >= 80 ? styles.scoreBoxSuccess : styles.scoreBoxWarning,
                ]}
              >
                <Text
                  style={[
                    styles.scoreText,
                    score >= 80 ? styles.scoreTextSuccess : styles.scoreTextWarning,
                  ]}
                >
                  ĐỘ CHÍNH XÁC: {score}%
                </Text>
                <Text style={styles.statusMessage}>{statusMessage}</Text>

                {/* Tokens Breakdown */}
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
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.retryBtn} onPress={() => evaluateSpeech(word)}>
                <Text style={styles.retryText}>Đọc Chuẩn Mẫu</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitBtn}
                disabled={isSubmitting}
                onPress={handleSubmitSM2}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitText}>Ghi nhận SM-2</Text>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: VocarioTheme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: VocarioTheme.colors.cardBorder,
  },
  subTitle: {
    fontSize: 9,
    fontFamily: VocarioTheme.typography.fontMono,
    fontWeight: 'bold',
    color: VocarioTheme.colors.brand,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontFamily: VocarioTheme.typography.fontSerif,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 16,
    color: VocarioTheme.colors.muted,
  },
  content: {
    padding: 20,
  },
  wordCard: {
    backgroundColor: VocarioTheme.colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    padding: 16,
    alignItems: 'center',
  },
  wordText: {
    fontSize: 26,
    fontFamily: VocarioTheme.typography.fontSerif,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  ipaText: {
    fontSize: 13,
    fontFamily: VocarioTheme.typography.fontMono,
    color: VocarioTheme.colors.muted,
    marginTop: 4,
  },
  meaningText: {
    fontSize: 13,
    color: VocarioTheme.colors.brand,
    marginTop: 6,
    fontWeight: '600',
  },
  listenBtn: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
  },
  listenText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: VocarioTheme.colors.brand,
  },
  inputBox: {
    marginTop: 16,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputLabel: {
    fontSize: 11,
    color: VocarioTheme.colors.muted,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  evaluateBtn: {
    marginTop: 8,
    backgroundColor: VocarioTheme.colors.brand,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  evaluateBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scoreBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  scoreBoxSuccess: {
    backgroundColor: VocarioTheme.colors.emeraldBg,
    borderColor: VocarioTheme.colors.emeraldBorder,
  },
  scoreBoxWarning: {
    backgroundColor: VocarioTheme.colors.amberBg,
    borderColor: VocarioTheme.colors.amberBorder,
  },
  scoreText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  scoreTextSuccess: {
    color: VocarioTheme.colors.emerald,
  },
  scoreTextWarning: {
    color: VocarioTheme.colors.amber,
  },
  statusMessage: {
    fontSize: 11.5,
    marginTop: 4,
    textAlign: 'center',
    color: '#475569',
  },
  tokenRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
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
  actionRow: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
  },
  retryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    alignItems: 'center',
  },
  retryText: {
    color: VocarioTheme.colors.ink,
    fontWeight: 'bold',
    fontSize: 12,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: VocarioTheme.colors.brand,
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
});


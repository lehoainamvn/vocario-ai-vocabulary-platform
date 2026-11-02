/**
 * ProfileScreen — SCHOLAR'S DESK
 * Pixel-perfect React Native port of Flutter ProfileScreen
 * Flutter source: vocario_mobile/lib/screens/profile/profile_screen.dart
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authService, certificateService } from '../api/services';
import { removeStoredToken } from '../api/client';

// ─── Design tokens (matching VocarioTokens from tokens.dart) ──────────────────
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
  amberBorder: '#FCD34D',
  amberDark: '#B45309',
  emerald: '#16A34A',
  emeraldBg: '#F0FDF4',
  emeraldBorder: '#86EFAC',
  emeraldDark: '#14532D',
  rose: '#B91C1C',
  roseBorder: '#FCA5A5',
  goldBorder: '#D4AF37',
};

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
const DAILY_GOALS = [5, 10, 15, 20];

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserProfile {
  fullName?: string;
  username?: string;
  email?: string;
  streakCount?: number;
  targetLevel?: string;
  dailyGoal?: number;
  totalWordsLearned?: number;
}

interface Certificate {
  id: string;
  cefrLevel?: string;
  title?: string;
  certificateCode?: string;
  issuedAt?: string;
  issueDate?: string;
  approvedBy?: string;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
interface ProfileScreenProps {
  onLogout?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onLogout }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isClaimingCert, setIsClaimingCert] = useState(false);
  const [isLevelingUp, setIsLevelingUp] = useState(false);

  // Account state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [streakCount, setStreakCount] = useState(0);

  // Goals
  const [targetLevel, setTargetLevel] = useState('A2');
  const [dailyGoal, setDailyGoal] = useState(10);

  // Certificates
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  // Certificate modal
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);

  // ── Load profile ────────────────────────────────────────────────────────
  const loadProfileData = async () => {
    setIsLoading(true);
    try {
      const [user, certs] = await Promise.all([
        authService.getProfile().catch(() => null),
        certificateService.getMyCertificates().catch(() => [] as Certificate[]),
      ]);

      if (user) {
        setFullName(user.fullName || user.username || '');
        setUsername(user.username || '');
        setEmail(user.email || '');
        setStreakCount(user.streakCount ?? 0);
        setTargetLevel(user.targetLevel || 'A2');
        setDailyGoal(user.dailyGoal ?? 10);
      }
      setCertificates((certs as Certificate[]) || []);
    } catch (_) {}
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadProfileData(); }, []);

  // ── Toast ───────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(msg);
    Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
        setToastMessage(null)
      );
    }, 3000);
  };

  // ── Save profile ────────────────────────────────────────────────────────
  const saveProfileChanges = async () => {
    if (!fullName.trim()) { showToast('Vui lòng nhập họ và tên hợp lệ.'); return; }
    setIsSaving(true);
    try {
      await authService.updateProfile?.({ fullName: fullName.trim(), targetLevel, dailyGoal });
      showToast('Đã lưu thiết lập học tập thành công!');
    } catch (_) {
      showToast('Đã cập nhật mục tiêu học tập!');
    } finally { setIsSaving(false); }
  };

  // ── Claim certificate ───────────────────────────────────────────────────
  const claimCertificate = async () => {
    setIsClaimingCert(true);
    try {
      const res = await certificateService.claimCertificate(targetLevel);
      if (res) {
        showToast(`Đã nhận thành công Chứng chỉ CEFR ${targetLevel} chính thức!`);
        loadProfileData();
      } else {
        showToast('Chưa đủ 100% điều kiện nhận chứng chỉ hoặc đã nhận trước đó.');
      }
    } catch (e) {
      showToast('Chưa đủ 100% điều kiện nhận chứng chỉ hoặc đã nhận trước đó.');
    } finally { setIsClaimingCert(false); }
  };

  // ── Level up ────────────────────────────────────────────────────────────
  const levelUpUser = async () => {
    setIsLevelingUp(true);
    try {
      const res = await authService.levelUp?.();
      if (res) {
        const newLvl = res.targetLevel || targetLevel;
        setTargetLevel(newLvl);
        showToast(`Chúc mừng! Bạn đã thăng cấp thành công lên trình độ ${newLvl}!`);
        loadProfileData();
      } else {
        showToast('Chưa đạt đủ chỉ tiêu số từ để thăng cấp.');
      }
    } catch (_) {
      showToast('Chưa đạt đủ chỉ tiêu số từ để thăng cấp.');
    } finally { setIsLevelingUp(false); }
  };

  // ── Logout ──────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất tài khoản?',
      'Bạn sẽ cần đăng nhập lại để tiếp tục đồng bộ từ vựng và chuỗi học tập.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            await removeStoredToken();
            onLogout?.();
          },
        },
      ]
    );
  };

  // ── Certificate modal ───────────────────────────────────────────────────
  const openCertModal = (cert: Certificate) => {
    setSelectedCert(cert);
    setShowCertModal(true);
  };

  const renderCertModal = () => {
    if (!selectedCert) return null;
    const lvl = selectedCert.cefrLevel || targetLevel;
    const name = fullName || username;
    const idStr = (selectedCert.id || '8892').replace(/-/g, '');
    const code = `VOC-2026-${idStr.length >= 8 ? idStr.substring(0, 8).toUpperCase() : idStr.toUpperCase()}`;
    const issueDate = selectedCert.issuedAt
      ? selectedCert.issuedAt.split('T')[0]
      : selectedCert.issueDate || '28/10/2026';

    return (
      <Modal transparent visible={showCertModal} animationType="fade" onRequestClose={() => setShowCertModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.certModalBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Top status ribbon */}
              <View style={styles.certModalTopRow}>
                <View style={styles.certModalRibbon}>
                  <Ionicons name="checkmark-circle" size={14} color={T.amberDark} />
                  <Text style={styles.certModalRibbonText}>CHỨNG CHỈ CEFR CHÍNH THỨC</Text>
                </View>
                <TouchableOpacity onPress={() => setShowCertModal(false)}>
                  <Ionicons name="close" size={18} color={T.ink} />
                </TouchableOpacity>
              </View>

              {/* Gold seal */}
              <View style={styles.certModalSealWrap}>
                <View style={styles.certModalSeal}>
                  <Ionicons name="medal" size={32} color={T.amberDark} />
                </View>
              </View>

              <Text style={styles.certModalOrg}>HỘI ĐỒNG HỌC THUẬT VOCARIO</Text>
              <Text style={styles.certModalTitle}>CHỨNG NHẬN NĂNG LỰC TỪ VỰNG</Text>

              <Text style={styles.certModalItalic}>Chứng nhận trao cho học viên:</Text>
              <Text style={styles.certModalName}>{name}</Text>

              <View style={styles.certModalLevelBadge}>
                <Text style={styles.certModalLevelText}>TRÌNH ĐỘ CEFR {lvl}</Text>
              </View>

              <Text style={styles.certModalDesc}>
                Đã hoàn thành toàn diện lộ trình bóc tách từ vựng qua AI Vision và ghi nhớ dài hạn qua thuật toán lặp lại ngắt quãng SM-2.
              </Text>

              <View style={styles.certModalDivider} />

              <View style={styles.certModalMetaRow}>
                <View>
                  <Text style={styles.certModalMetaLabel}>MÃ TRA CỨU:</Text>
                  <Text style={styles.certModalMetaValue}>{code}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.certModalMetaLabel}>NGÀY CẤP:</Text>
                  <Text style={styles.certModalMetaValueDark}>{issueDate}</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.certModalCloseBtn} onPress={() => setShowCertModal(false)}>
                <Text style={styles.certModalCloseBtnText}>Đóng cửa sổ</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER SECTIONS
  // ──────────────────────────────────────────────────────────────────────────

  const renderTopAppBar = () => (
    <View style={styles.topBar}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={styles.topBarLabel}>
          <Text style={styles.topBarMono}>SCHOLAR'S DESK</Text>
          <Text style={styles.topBarTitle}>Hồ sơ học viên</Text>
        </View>
      </View>
      <TouchableOpacity onPress={handleLogout} style={styles.logoutIconBtn}>
        <Ionicons name="log-out-outline" size={18} color={T.rose} />
      </TouchableOpacity>
    </View>
  );

  const renderHeaderSection = () => (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.monoLabel}>THIẾT LẬP HỌC TẬP CÁ NHÂN</Text>
          <Text style={styles.cardHeadline}>Hồ sơ &amp; Tiến độ</Text>
          <Text style={styles.cardSubtitle}>
            Quản lý mục tiêu CEFR và đồng bộ hóa tiến trình rèn luyện.
          </Text>
        </View>
        <View style={[styles.streakPill, { marginLeft: 8 }]}>
          <Ionicons name="flame" size={20} color={T.amberDark} />
          <Text style={styles.streakPillText}>{streakCount} ngày</Text>
        </View>
      </View>
    </View>
  );

  const renderAccountSection = () => (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionNumberSerif}>01</Text>
        <Text style={styles.sectionMono}>THÔNG TIN TÀI KHOẢN CỐT LÕI</Text>
      </View>

      {/* Full name (editable) */}
      <Text style={styles.fieldLabel}>Họ và tên</Text>
      <TextInput
        style={styles.textField}
        value={fullName}
        onChangeText={setFullName}
        placeholderTextColor={T.faint}
        placeholder="Nhập họ và tên..."
      />

      {/* Username (read-only) */}
      <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Tên đăng nhập</Text>
      <View style={styles.readonlyField}>
        <Text style={styles.readonlyFieldMono}>@{username}</Text>
        <Text style={styles.readonlyFieldHint}>Định danh cố định</Text>
      </View>

      {/* Email (read-only) */}
      <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Email liên kết</Text>
      <View style={styles.readonlyField}>
        <Text style={styles.readonlyFieldText}>{email}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="checkmark-circle" size={12} color="#10B981" />
          <Text style={[styles.readonlyFieldHint, { color: '#10B981', fontWeight: 'bold', marginLeft: 3 }]}>
            Đã xác thực
          </Text>
        </View>
      </View>
    </View>
  );

  const renderLearningGoalsSection = () => (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionNumberSerif}>02</Text>
        <Text style={styles.sectionMono}>MỤC TIÊU HỌC TẬP CÁ NHÂN</Text>
      </View>

      {/* CEFR Target Level */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={styles.fieldLabel}>Mục tiêu trình độ tiếng Anh</Text>
        <Text style={[styles.readonlyFieldHint, { fontSize: 9.5 }]}>Chuẩn hóa CEFR</Text>
      </View>
      <View style={styles.segmentedBar}>
        {CEFR_LEVELS.map((lvl, idx) => {
          const isSelected = targetLevel === lvl;
          return (
            <TouchableOpacity
              key={lvl}
              onPress={() => setTargetLevel(lvl)}
              style={[
                styles.segmentItem,
                isSelected && styles.segmentItemSelected,
                idx < CEFR_LEVELS.length - 1 && styles.segmentItemBorder,
              ]}
            >
              <Text style={[styles.segmentText, isSelected && styles.segmentTextSelected]}>{lvl}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.hintText}>
        Hệ thống AI sẽ ưu tiên trích xuất từ vựng và câu chuyện bối cảnh phù hợp năng lực {targetLevel}.
      </Text>

      {/* Daily goal */}
      <Text style={[styles.fieldLabel, { marginTop: 14, marginBottom: 8 }]}>Tần suất ôn tập mỗi ngày</Text>
      <View style={styles.segmentedBar}>
        {DAILY_GOALS.map((opt, idx) => {
          const isSelected = dailyGoal === opt;
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => setDailyGoal(opt)}
              style={[
                styles.segmentItem,
                isSelected && styles.segmentItemSelected,
                idx < DAILY_GOALS.length - 1 && styles.segmentItemBorder,
              ]}
            >
              <Text style={[styles.segmentText, isSelected && styles.segmentTextSelected]}>{opt} từ</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Level up button */}
      <TouchableOpacity
        style={styles.levelUpBtn}
        onPress={levelUpUser}
        disabled={isLevelingUp}
      >
        {isLevelingUp ? (
          <ActivityIndicator size="small" color={T.brand} />
        ) : (
          <Ionicons name="trending-up" size={16} color={T.brand} />
        )}
        <Text style={styles.levelUpBtnText}>
          {isLevelingUp ? 'Đang kiểm tra chỉ tiêu...' : 'Thăng cấp trình độ tiếp theo (Level Up)'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCertificatesSection = () => (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionNumberSerif}>03</Text>
        <Text style={styles.sectionMono}>CHỨNG CHỈ CEFR TÍCH LŨY</Text>
      </View>

      {certificates.length === 0 ? (
        <View style={styles.emptyCertBox}>
          <Ionicons name="ribbon-outline" size={28} color={T.faint} />
          <Text style={styles.emptyCertTitle}>Chưa có chứng chỉ chính thức</Text>
          <Text style={styles.emptyCertDesc}>
            Hoàn thành 100% kho từ vựng theo trình độ để nhận chứng chỉ chính thức từ hội đồng Vocario.
          </Text>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}
            onPress={() => openCertModal({ id: 'preview-demo', cefrLevel: targetLevel, title: `Chứng chỉ Năng lực Tiếng Anh ${targetLevel}` })}
          >
            <Ionicons name="eye-outline" size={14} color={T.brand} />
            <Text style={[styles.hintText, { color: T.brand, fontWeight: 'bold', marginLeft: 4 }]}>
              Xem bản mẫu chứng chỉ CEFR {targetLevel}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        certificates.map((cert) => (
          <TouchableOpacity
            key={cert.id}
            style={styles.certItem}
            onPress={() => openCertModal(cert)}
          >
            <Ionicons name="checkmark-circle" size={20} color={T.emerald} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.certItemTitle}>
                {cert.title || `Chứng chỉ Năng lực Tiếng Anh ${cert.cefrLevel}`}
              </Text>
              <Text style={styles.certItemSub}>
                Đã cấp duyệt · Cấp độ chuẩn {cert.cefrLevel} · Bấm để xem chi tiết
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={T.emerald} />
          </TouchableOpacity>
        ))
      )}

      {/* Claim button */}
      <TouchableOpacity
        style={[styles.claimBtn, isClaimingCert && { opacity: 0.7 }]}
        onPress={claimCertificate}
        disabled={isClaimingCert}
      >
        {isClaimingCert ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="medal" size={17} color="#fff" />
        )}
        <Text style={styles.claimBtnText}>
          {isClaimingCert ? 'Đang gửi yêu cầu cấp chứng chỉ...' : `Nhận chứng chỉ CEFR ${targetLevel} chính thức`}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderActionButtons = () => (
    <View>
      <TouchableOpacity
        style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
        onPress={saveProfileChanges}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Lưu thay đổi thiết lập</Text>
        )}
      </TouchableOpacity>
      <View style={{ height: 10 }} />
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={16} color={T.rose} />
        <Text style={styles.logoutBtnText}>Đăng xuất tài khoản</Text>
      </TouchableOpacity>
    </View>
  );

  const renderToast = () => {
    if (!toastMessage) return null;
    return (
      <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
        <Ionicons name="checkmark-circle-outline" size={14} color={T.brand} />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>
    );
  };

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {renderTopAppBar()}

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={T.brand} size="small" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces
        >
          {renderHeaderSection()}
          <View style={{ height: 18 }} />
          {renderAccountSection()}
          <View style={{ height: 18 }} />
          {renderLearningGoalsSection()}
          <View style={{ height: 18 }} />
          {renderCertificatesSection()}
          <View style={{ height: 22 }} />
          {renderActionButtons()}
          <View style={{ height: 28 }} />
        </ScrollView>
      )}

      {/* Floating toast */}
      {renderToast()}

      {/* Certificate detail modal */}
      {renderCertModal()}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.canvas,
  },

  // ── Top Bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  topBarLabel: { marginLeft: 0 },
  topBarMono: {
    fontSize: 7.5,
    fontFamily: 'monospace',
    color: T.brand,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  topBarTitle: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
  },
  logoutIconBtn: { padding: 4 },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },

  // ── Section headers ───────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionNumberSerif: {
    fontSize: 13,
    fontFamily: 'serif',
    color: T.brand,
    fontWeight: 'bold',
  },
  sectionMono: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: T.brand,
    textTransform: 'uppercase',
    marginLeft: 6,
    letterSpacing: 0.5,
  },

  // ── Header card ───────────────────────────────────────────────────────────
  monoLabel: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: T.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardHeadline: {
    fontSize: 17,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 2,
  },
  cardSubtitle: {
    fontSize: 10.5,
    color: T.muted,
    marginTop: 3,
    lineHeight: 15,
  },
  streakPill: {
    backgroundColor: T.amberBg,
    borderWidth: 1,
    borderColor: T.amberBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
  },
  streakPillText: {
    fontSize: 9.5,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.amberDark,
    marginTop: 2,
  },

  // ── Form fields ───────────────────────────────────────────────────────────
  fieldLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: T.ink,
    marginBottom: 5,
  },
  textField: {
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12.5,
    color: T.ink,
  },
  readonlyField: {
    backgroundColor: '#F1ECE380',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readonlyFieldMono: {
    fontSize: 11.5,
    fontFamily: 'monospace',
    color: T.ink,
  },
  readonlyFieldText: {
    fontSize: 11.5,
    color: T.ink,
  },
  readonlyFieldHint: {
    fontSize: 9,
    color: T.muted,
  },

  // ── Segmented bar ─────────────────────────────────────────────────────────
  segmentedBar: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  segmentItemSelected: {
    backgroundColor: T.brand,
  },
  segmentItemBorder: {
    borderRightWidth: 1,
    borderRightColor: T.border,
  },
  segmentText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: T.ink,
  },
  segmentTextSelected: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  hintText: {
    fontSize: 10,
    color: T.muted,
    lineHeight: 14,
    marginTop: 6,
  },

  // ── Level up button ───────────────────────────────────────────────────────
  levelUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.brand,
    borderRadius: 8,
    height: 38,
    marginTop: 14,
    gap: 6,
  },
  levelUpBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: T.brand,
  },

  // ── Certificates ──────────────────────────────────────────────────────────
  emptyCertBox: {
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyCertTitle: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 6,
  },
  emptyCertDesc: {
    fontSize: 10,
    color: T.muted,
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 2,
  },
  certItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.emeraldBg,
    borderWidth: 1,
    borderColor: T.emeraldBorder,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  certItemTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: T.emeraldDark,
  },
  certItemSub: {
    fontSize: 9.5,
    color: '#166534',
    marginTop: 1,
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.amberDark,
    borderRadius: 8,
    height: 40,
    marginTop: 12,
    gap: 6,
  },
  claimBtnText: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // ── Action buttons ────────────────────────────────────────────────────────
  saveBtn: {
    backgroundColor: T.brand,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    gap: 6,
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: T.rose,
  },

  // ── Toast ─────────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute',
    top: 12,
    left: 18,
    right: 18,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    gap: 8,
  },
  toastText: {
    flex: 1,
    fontSize: 10,
    color: T.ink,
    lineHeight: 14,
  },

  // ── Certificate Modal ─────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  certModalBox: {
    backgroundColor: '#FBF9F5',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: T.goldBorder,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  certModalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  certModalRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.amberBg,
    borderWidth: 1,
    borderColor: T.amberDark,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  certModalRibbonText: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#92400E',
    textTransform: 'uppercase',
  },
  certModalSealWrap: { alignItems: 'center', marginTop: 16 },
  certModalSeal: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FAF5EB',
    borderWidth: 2,
    borderColor: T.goldBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  certModalOrg: {
    textAlign: 'center',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    letterSpacing: 1.2,
    color: '#78350F',
    marginTop: 12,
  },
  certModalTitle: {
    textAlign: 'center',
    fontSize: 17,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 4,
  },
  certModalItalic: {
    textAlign: 'center',
    fontSize: 11,
    color: T.muted,
    fontStyle: 'italic',
    marginTop: 14,
  },
  certModalName: {
    textAlign: 'center',
    fontSize: 22,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: '#1E1B18',
    marginTop: 4,
  },
  certModalLevelBadge: {
    backgroundColor: T.brand,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: 'center',
    marginTop: 10,
  },
  certModalLevelText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  certModalDesc: {
    textAlign: 'center',
    fontSize: 10.5,
    color: T.ink,
    lineHeight: 15,
    marginTop: 12,
    paddingHorizontal: 12,
  },
  certModalDivider: {
    borderTopWidth: 1,
    borderTopColor: T.border,
    marginVertical: 16,
  },
  certModalMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  certModalMetaLabel: {
    fontSize: 8,
    fontFamily: 'monospace',
    color: T.muted,
    textTransform: 'uppercase',
  },
  certModalMetaValue: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.brand,
  },
  certModalMetaValueDark: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: T.ink,
  },
  certModalCloseBtn: {
    backgroundColor: T.brand,
    borderRadius: 8,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  certModalCloseBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // ── Layout ────────────────────────────────────────────────────────────────
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { VocarioTheme } from '../constants/theme';
import { certificateService, authService } from '../api/services';
import { CertificateItem, User } from '../types';
import { removeStoredToken } from '../api/client';

export const ProfileScreen: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [certs, setCerts] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    try {
      const [profileData, certData] = await Promise.all([
        authService.getProfile().catch(() => ({
          id: 'u-demo',
          username: 'nguyen.nam',
          fullName: 'Nguyễn Văn Nam',
          email: 'nam.vocario@gmail.com',
          targetLevel: 'A2',
          streakCount: 24,
          totalWordsLearned: 38,
        })),
        certificateService.getMyCertificates().catch(() => [
          {
            id: 'c1',
            title: 'Chứng Chỉ Tinh Thông Chuẩn Từ Vựng CEFR A1',
            cefrLevel: 'A1',
            certificateCode: 'VOC-A1-8842',
            issueDate: '2026-10-28',
            masteredWordsCount: 10,
            streakCount: 14,
            approvedBy: 'Hội Đồng Khảo Thí Vocario',
          },
        ]),
      ]);
      setUser(profileData);
      setCerts(certData);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleClaim = async (level: string) => {
    try {
      await certificateService.claimCertificate(level);
      Alert.alert('Thành công', `Yêu cầu cấp chứng chỉ ${level} đã được gửi đến ban khảo thí!`);
      fetchProfile();
    } catch (err: any) {
      Alert.alert('Thông báo', 'Bạn cần tích lũy đủ số từ thành thạo chuẩn CEFR để nhận chứng chỉ này.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.fullName?.charAt(0) || 'V'}</Text>
        </View>
        <Text style={styles.fullName}>{user?.fullName || 'Học Viên Vocario'}</Text>
        <Text style={styles.email}>{user?.email || 'user@vocario.com'}</Text>

        <View style={styles.statsBadgeRow}>
          <View style={styles.statChip}>
            <Text style={styles.statChipVal}>🔥 {user?.streakCount || 0}</Text>
            <Text style={styles.statChipLabel}>ngày streak</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statChipVal}>📚 {user?.totalWordsLearned || 0}</Text>
            <Text style={styles.statChipLabel}>từ đã nạp</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statChipVal}>🎯 {user?.targetLevel || 'A2'}</Text>
            <Text style={styles.statChipLabel}>chuẩn CEFR</Text>
          </View>
        </View>
      </View>

      {/* Certificates Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chứng chỉ năng lực CEFR đã đạt được</Text>

        {certs.map((c) => (
          <View key={c.id} style={styles.certCard}>
            <View style={styles.certTop}>
              <View style={styles.certBadge}>
                <Text style={styles.certBadgeText}>{c.cefrLevel}</Text>
              </View>
              <Text style={styles.certCode}>{c.certificateCode}</Text>
            </View>
            <Text style={styles.certTitle}>{c.title}</Text>
            <Text style={styles.certDate}>Ngày cấp: {c.issueDate} • {c.approvedBy}</Text>
            <View style={styles.certFooter}>
              <Text style={styles.certStatus}>✓ ĐÃ XÁC THỰC CHÍNH THỨC</Text>
            </View>
          </View>
        ))}

        {/* Claim button for next level */}
        <TouchableOpacity style={styles.claimBtn} onPress={() => handleClaim('A2')}>
          <Text style={styles.claimBtnText}>🏆 Khảo thí & Nhận chứng chỉ CEFR A2</Text>
        </TouchableOpacity>
      </View>

      {/* Settings / Logout */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => {
            await removeStoredToken();
            Alert.alert('Đăng xuất', 'Bạn đã đăng xuất tài khoản thành công.');
          }}
        >
          <Text style={styles.logoutText}>Đăng xuất khỏi thiết bị</Text>
        </TouchableOpacity>
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
  profileHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: VocarioTheme.colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: VocarioTheme.typography.fontSerif,
  },
  fullName: {
    fontSize: 18,
    fontFamily: VocarioTheme.typography.fontSerif,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  email: {
    fontSize: 12,
    color: VocarioTheme.colors.muted,
    marginTop: 2,
  },
  statsBadgeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statChip: {
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    alignItems: 'center',
  },
  statChipVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
  },
  statChipLabel: {
    fontSize: 10,
    color: VocarioTheme.colors.muted,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: VocarioTheme.typography.fontSerif,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
    marginBottom: 10,
  },
  certCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: VocarioTheme.colors.cardBorder,
    marginBottom: 10,
  },
  certTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  certBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  certBadgeText: {
    fontSize: 11,
    fontFamily: VocarioTheme.typography.fontMono,
    fontWeight: 'bold',
    color: '#15803D',
  },
  certCode: {
    fontSize: 11,
    fontFamily: VocarioTheme.typography.fontMono,
    color: VocarioTheme.colors.muted,
  },
  certTitle: {
    fontSize: 14,
    fontFamily: VocarioTheme.typography.fontSerif,
    fontWeight: 'bold',
    color: VocarioTheme.colors.ink,
    lineHeight: 18,
  },
  certDate: {
    fontSize: 11,
    color: VocarioTheme.colors.muted,
    marginTop: 4,
  },
  certFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  certStatus: {
    fontSize: 10.5,
    fontFamily: VocarioTheme.typography.fontMono,
    fontWeight: 'bold',
    color: '#15803D',
  },
  claimBtn: {
    backgroundColor: VocarioTheme.colors.brand,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: 'bold',
  },
});


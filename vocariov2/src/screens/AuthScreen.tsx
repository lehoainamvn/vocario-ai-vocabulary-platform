/**
 * AuthScreen — SCHOLAR'S GATEWAY
 * 1:1 Pixel-perfect React Native port of Flutter AuthScreen
 * Flutter source: vocario_mobile/lib/screens/auth/auth_screen.dart
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../api/services';

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
  rose: '#DC2626',
  roseBorder: '#FCA5A5',
};

const LEVELS = [
  { code: 'A1', name: 'Cơ bản' },
  { code: 'A2', name: 'Sơ cấp' },
  { code: 'B1', name: 'Trung cấp' },
  { code: 'B2', name: 'Trung cao' },
  { code: 'C1', name: 'Thành thạo' },
];

export const AuthScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [language, setLanguage] = useState<'VI' | 'EN'>('VI');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [selectedLevel, setSelectedLevel] = useState<string>('A2');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Form inputs
  const [identity, setIdentity] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isToastError, setIsToastError] = useState<boolean>(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<any>(null);

  const showToast = (message: string, isError: boolean = false) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMessage(message);
    setIsToastError(isError);
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setToastMessage(null));
    }, 3600);
  };

  const useDemo = (role: 'learner' | 'admin') => {
    setMode('signin');
    if (role === 'learner') {
      setIdentity('nam23@gmail.com');
      setPassword('123456');
      showToast('Đã điền tài khoản học viên demo (nam23@gmail.com).');
    } else {
      setIdentity('admin');
      setPassword('123456');
      showToast('Đã điền tài khoản quản trị viên demo (admin).');
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (mode === 'signin') {
        const idTrim = identity.trim();
        if (!idTrim || !password) {
          throw new Error('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
        }

        const res = await authService.login(idTrim, password);
        const displayName = res?.fullName || res?.username || idTrim;
        showToast(`Đăng nhập thành công! Chào mừng ${displayName} trở lại Vocario.`);

        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        }, 600);
      } else {
        const nameTrim = name.trim();
        const emailTrim = email.trim();

        if (!nameTrim || !emailTrim || !password) {
          throw new Error('Vui lòng điền đầy đủ các trường thông tin.');
        }
        if (password !== confirmPassword) {
          throw new Error('Mật khẩu xác nhận không trùng khớp.');
        }

        const username = emailTrim.split('@')[0];
        const res = await authService.register(
          username,
          emailTrim,
          password,
          nameTrim,
          selectedLevel
        );

        const registeredName = res?.fullName || nameTrim;
        showToast(
          `Đăng ký thành công! Chào mừng ${registeredName} với mục tiêu CEFR ${selectedLevel}!`
        );

        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        }, 600);
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra', true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top App Bar */}
      <View style={styles.topAppBar}>
        <TouchableOpacity
          onPress={() => navigation.canGoBack?.() && navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="chevron-left" size={20} color={T.ink} />
        </TouchableOpacity>

        {/* Language switcher */}
        <TouchableOpacity
          style={styles.languageSwitcher}
          onPress={() => setLanguage((l) => (l === 'VI' ? 'EN' : 'VI'))}
        >
          <Text style={[styles.langText, { color: T.ink, fontWeight: 'bold' }]}>
            {language}
          </Text>
          <Text style={styles.langDivider}>|</Text>
          <Text style={[styles.langText, { color: T.muted }]}>
            {language === 'VI' ? 'EN' : 'VI'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Hero */}
        <View style={styles.brandHero}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>V</Text>
          </View>
          <Text style={styles.brandSub}>VOCARIO</Text>
          <Text style={styles.brandHeadline}>
            {mode === 'signin' ? 'Chào mừng bạn trở lại' : 'Khởi đầu hành trình mới'}
          </Text>
          <Text style={styles.brandDesc}>
            {mode === 'signin'
              ? 'Tiếp tục hành trình học từ vựng qua bối cảnh đời thực.'
              : 'Biến không gian sống xung quanh bạn thành giáo cụ học tập trực quan.'}
          </Text>
        </View>

        <View style={{ height: 14 }} />

        {/* Auth Tabs */}
        <View style={styles.authTabs}>
          <TouchableOpacity
            style={[styles.authTabBtn, mode === 'signin' && styles.authTabBtnActive]}
            onPress={() => setMode('signin')}
          >
            <Text
              style={[
                styles.authTabText,
                mode === 'signin' && styles.authTabTextActive,
              ]}
            >
              Đăng nhập
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.authTabBtn, mode === 'signup' && styles.authTabBtnActive]}
            onPress={() => setMode('signup')}
          >
            <Text
              style={[
                styles.authTabText,
                mode === 'signup' && styles.authTabTextActive,
              ]}
            >
              Tạo tài khoản
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 16 }} />

        {/* Form Card */}
        <View style={styles.formCard}>
          {mode === 'signin' ? (
            <>
              <Text style={styles.fieldLabel}>Email liên kết hoặc tên đăng nhập</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.inputField}
                  placeholder="name@example.com hoặc username"
                  placeholderTextColor={T.faint}
                  value={identity}
                  onChangeText={setIdentity}
                  autoCapitalize="none"
                />
              </View>

              <View style={{ height: 12 }} />

              <Text style={styles.fieldLabel}>Mật khẩu</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.inputField}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor={T.faint}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 4 }}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={18}
                    color={T.muted}
                  />
                </TouchableOpacity>
              </View>

              <View style={{ height: 10 }} />

              <View style={styles.rememberRow}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && (
                      <MaterialIcons name="check" size={12} color="#FFFFFF" />
                    )}
                  </View>
                  <Text style={styles.rememberText}>Ghi nhớ phiên đăng nhập</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    showToast('Chức năng khôi phục mật khẩu đang thử nghiệm.')
                  }
                >
                  <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Họ và tên</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.inputField}
                  placeholder="Nguyen Van Student"
                  placeholderTextColor={T.faint}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={{ height: 12 }} />

              <Text style={styles.fieldLabel}>Email liên kết</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.inputField}
                  placeholder="student@example.com"
                  placeholderTextColor={T.faint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={{ height: 12 }} />

              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1, marginRight: 5 }}>
                  <Text style={styles.fieldLabel}>Mật khẩu</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.inputField}
                      placeholder="6+ ký tự"
                      placeholderTextColor={T.faint}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                    />
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 5 }}>
                  <Text style={styles.fieldLabel}>Xác nhận mật khẩu</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.inputField}
                      placeholder="Nhập lại"
                      placeholderTextColor={T.faint}
                      secureTextEntry={!showPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                  </View>
                </View>
              </View>

              <View style={{ height: 14 }} />

              {/* CEFR Level Selector */}
              <Text style={styles.fieldLabel}>Mục tiêu trình độ tiếng Anh của bạn</Text>
              <View style={{ height: 8 }} />
              <View style={{ flexDirection: 'row' }}>
                {LEVELS.map((lvl) => {
                  const isSelected = selectedLevel === lvl.code;
                  return (
                    <TouchableOpacity
                      key={lvl.code}
                      style={[styles.levelBtn, isSelected && styles.levelBtnActive]}
                      onPress={() => setSelectedLevel(lvl.code)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isSelected && (
                          <MaterialIcons
                            name="check"
                            size={10}
                            color="#FFFFFF"
                            style={{ marginRight: 2 }}
                          />
                        )}
                        <Text
                          style={[
                            styles.levelBtnCode,
                            isSelected && { color: '#FFFFFF' },
                          ]}
                        >
                          {lvl.code}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.levelBtnName,
                          isSelected && { color: 'rgba(255,255,255,0.9)' },
                        ]}
                      >
                        {lvl.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <View style={{ height: 16 }} />

          {/* Primary CTA */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
            disabled={isLoading}
            onPress={handleSubmit}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {mode === 'signin' ? 'Đăng nhập vào Vocario' : 'Tạo tài khoản Vocario'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 16 }} />

        {/* Demo Accounts / Social */}
        {mode === 'signin' ? (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>
                Hoặc trải nghiệm nhanh tài khoản mẫu
              </Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={{ height: 12 }} />

            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                style={styles.demoCard}
                onPress={() => useDemo('learner')}
              >
                <View style={styles.demoIconWrap}>
                  <MaterialIcons name="person-outline" size={15} color={T.brand} />
                </View>
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.demoCardTitle} numberOfLines={1}>
                    Học viên demo
                  </Text>
                  <Text style={styles.demoCardSub} numberOfLines={1}>
                    nam23@gmail.com
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={{ width: 10 }} />

              <TouchableOpacity
                style={styles.demoCard}
                onPress={() => useDemo('admin')}
              >
                <View style={styles.demoIconWrap}>
                  <MaterialIcons name="shield" size={15} color={T.brand} />
                </View>
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.demoCardTitle} numberOfLines={1}>
                    Quản trị viên demo
                  </Text>
                  <Text style={styles.demoCardSub} numberOfLines={1}>
                    admin
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={{ height: 8 }} />

            <Text style={styles.demoDisclaimer}>
              Tài khoản demo chỉ dùng trong phiên preview và không lưu thông tin cá nhân.
            </Text>

            <View style={{ height: 14 }} />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Hoặc tiếp tục với</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={{ height: 12 }} />

            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => showToast('Google Sign-In đang ở chế độ xem trước.')}
              >
                <FontAwesome5 name="google" size={14} color="#EA4335" />
                <Text style={styles.socialBtnText}>Google</Text>
              </TouchableOpacity>

              <View style={{ width: 10 }} />

              <TouchableOpacity
                style={styles.socialBtn}
                onPress={() => showToast('Apple Sign-In đang ở chế độ xem trước.')}
              >
                <FontAwesome5 name="apple" size={16} color={T.ink} />
                <Text style={styles.socialBtnText}>Apple</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={styles.termsText}>
              Bằng việc đăng ký, bạn đồng ý với{' '}
              <Text style={styles.termsLink}>Điều khoản dịch vụ</Text> và{' '}
              <Text style={styles.termsLink}>Chính sách bảo mật</Text> của Vocario.
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Floating Animated Toast */}
      {toastMessage && (
        <Animated.View
          style={[
            styles.floatingToast,
            isToastError && { borderColor: T.roseBorder },
            { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] },
          ]}
        >
          <MaterialIcons
            name={isToastError ? 'error-outline' : 'info-outline'}
            size={16}
            color={isToastError ? T.rose : T.brand}
          />
          <Text
            style={[
              styles.floatingToastText,
              isToastError && { color: T.rose },
            ]}
          >
            {toastMessage}
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.canvas,
  },
  topAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageSwitcher: {
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  langText: {
    fontSize: 9.5,
    fontFamily: 'monospace',
  },
  langDivider: {
    fontSize: 11,
    color: T.border,
    marginHorizontal: 5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  brandHero: {
    alignItems: 'center',
    marginTop: 8,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: T.brand,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  brandSub: {
    fontSize: 9.5,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: T.muted,
    letterSpacing: 2.2,
    marginTop: 8,
  },
  brandHeadline: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: 'bold',
    color: T.ink,
    marginTop: 8,
  },
  brandDesc: {
    fontSize: 11.5,
    color: T.muted,
    textAlign: 'center',
    maxWidth: 300,
    marginTop: 5,
    lineHeight: 16,
  },
  authTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    width: '100%',
    justifyContent: 'center',
  },
  authTabBtn: {
    paddingBottom: 8,
    marginHorizontal: 18,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  authTabBtnActive: {
    borderBottomColor: T.brand,
  },
  authTabText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: T.muted,
  },
  authTabTextActive: {
    fontWeight: '600',
    color: T.ink,
  },
  formCard: {
    width: '100%',
    padding: 18,
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: T.ink,
  },
  inputBox: {
    height: 46,
    backgroundColor: T.field,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  inputField: {
    flex: 1,
    fontSize: 13.5,
    color: T.ink,
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: T.brand,
    borderColor: T.brand,
  },
  rememberText: {
    fontSize: 11.5,
    color: T.muted,
    marginLeft: 8,
  },
  forgotText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: T.brand,
  },
  levelBtn: {
    flex: 1,
    height: 48,
    marginHorizontal: 2,
    borderRadius: 10,
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelBtnActive: {
    backgroundColor: T.brand,
    borderColor: T.brand,
  },
  levelBtnCode: {
    fontSize: 12,
    fontWeight: '600',
    color: T.ink,
  },
  levelBtnName: {
    fontSize: 8.5,
    color: T.muted,
    marginTop: 2,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: T.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: T.border,
  },
  dividerText: {
    fontSize: 9.5,
    color: T.muted,
    marginHorizontal: 10,
  },
  demoCard: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: T.field,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  demoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoCardTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: T.ink,
  },
  demoCardSub: {
    fontSize: 9,
    color: T.muted,
    marginTop: 2,
  },
  demoDisclaimer: {
    fontSize: 9.5,
    color: '#8C827A',
    textAlign: 'center',
    lineHeight: 14,
  },
  socialBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: T.ink,
    marginLeft: 8,
  },
  termsText: {
    fontSize: 10,
    color: T.muted,
    textAlign: 'center',
    lineHeight: 15,
  },
  termsLink: {
    fontWeight: '600',
    color: T.brand,
  },
  floatingToast: {
    position: 'absolute',
    top: 14,
    left: 20,
    right: 20,
    backgroundColor: T.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  floatingToastText: {
    fontSize: 11.5,
    color: T.ink,
    marginLeft: 8,
    flex: 1,
  },
});


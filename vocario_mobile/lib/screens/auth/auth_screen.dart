import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/tokens.dart';
import '../../core/services/api_service.dart';
import '../home/home_screen.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  // Screen States
  String _mode = 'signin'; // 'signin' hoặc 'signup'
  String _language = 'VI';
  bool _showPassword = false;
  bool _rememberMe = true;
  String _selectedLevel = 'A2';
  bool _isLoading = false;
  String? _toastMessage;
  bool _isToastError = false;
  Timer? _toastTimer;

  // Form Controllers
  final TextEditingController _identityController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _confirmPasswordController = TextEditingController();

  final List<Map<String, String>> _levels = const [
    {'code': 'A1', 'name': 'Cơ bản'},
    {'code': 'A2', 'name': 'Sơ cấp'},
    {'code': 'B1', 'name': 'Trung cấp'},
    {'code': 'B2', 'name': 'Trung cao'},
    {'code': 'C1', 'name': 'Thành thạo'},
  ];

  @override
  void dispose() {
    _toastTimer?.cancel();
    _identityController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    _emailController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _showToast(String message, {bool isError = false}) {
    _toastTimer?.cancel();
    setState(() {
      _toastMessage = message;
      _isToastError = isError;
    });
    _toastTimer = Timer(const Duration(milliseconds: 3600), () {
      if (mounted) {
        setState(() => _toastMessage = null);
      }
    });
  }

  void _useDemo(String role) {
    setState(() {
      _mode = 'signin';
      if (role == 'learner') {
        _identityController.text = 'nam23@gmail.com';
        _passwordController.text = '123456';
        _showToast('Đã điền tài khoản học viên demo (nam23@gmail.com).');
      } else {
        _identityController.text = 'admin';
        _passwordController.text = '123456';
        _showToast('Đã điền tài khoản quản trị viên demo (admin).');
      }
    });
  }

  Future<void> _handleSubmit() async {
    setState(() => _isLoading = true);

    try {
      if (_mode == 'signin') {
        final identity = _identityController.text.trim();
        final password = _passwordController.text;

        if (identity.isEmpty || password.isEmpty) {
          throw Exception('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
        }

        final result = await ApiService().login(
          usernameOrEmail: identity,
          password: password,
        );

        if (!mounted) return;
        _showToast(
          'Đăng nhập thành công! Chào mừng ${result['fullName'] ?? identity} trở lại Vocario.',
        );
        Future.delayed(const Duration(milliseconds: 600), () {
          if (!mounted) return;
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const HomeScreen()),
          );
        });
      } else {
        final name = _nameController.text.trim();
        final email = _emailController.text.trim();
        final password = _passwordController.text;
        final confirmPassword = _confirmPasswordController.text;

        if (name.isEmpty || email.isEmpty || password.isEmpty) {
          throw Exception('Vui lòng điền đầy đủ các trường thông tin.');
        }

        if (password != confirmPassword) {
          throw Exception('Mật khẩu xác nhận không trùng khớp.');
        }

        final result = await ApiService().register(
          email: email,
          password: password,
          fullName: name,
          targetLevel: _selectedLevel,
        );

        if (!mounted) return;
        final registeredName = result['fullName'] ?? name;
        _showToast(
          'Đăng ký thành công! Chào mừng $registeredName với mục tiêu CEFR $_selectedLevel!',
        );
        Future.delayed(const Duration(milliseconds: 600), () {
          if (!mounted) return;
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (_) => const HomeScreen()),
          );
        });
      }
    } catch (e) {
      if (!mounted) return;
      _showToast(e.toString().replaceAll('Exception: ', ''), isError: true);
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VocarioTokens.canvas,
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                _buildTopAppBar(),
                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const SizedBox(height: 8),
                        _buildBrandHero(),
                        const SizedBox(height: 14),
                        _buildAuthTabs(),
                        const SizedBox(height: 16),
                        _buildFormCard(),
                        const SizedBox(height: 16),
                        if (_mode == 'signin') ...[
                          _buildDivider('Hoặc trải nghiệm nhanh tài khoản mẫu'),
                          const SizedBox(height: 12),
                          _buildDemoCardsGrid(),
                          const SizedBox(height: 8),
                          const Text(
                            'Tài khoản demo chỉ dùng trong phiên preview và không lưu thông tin cá nhân.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 9.5,
                              color: Color(0xFF8C827A),
                              height: 1.45,
                            ),
                          ),
                          const SizedBox(height: 14),
                          _buildDivider('Hoặc tiếp tục với'),
                          const SizedBox(height: 12),
                          _buildSocialLoginRow(),
                        ] else ...[
                          _buildTermsFooter(),
                        ],
                        const SizedBox(height: 32),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            // Floating Toast Notification
            if (_toastMessage != null) _buildFloatingToast(),
          ],
        ),
      ),
    );
  }

  // ==========================================================================
  // TOP APP BAR
  // ==========================================================================
  Widget _buildTopAppBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Back Button
          InkWell(
            onTap: () => Navigator.maybePop(context),
            borderRadius: BorderRadius.circular(10),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: VocarioTokens.surface,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: VocarioTokens.border),
              ),
              child: const Icon(
                Icons.arrow_back_ios_new_rounded,
                size: 14,
                color: VocarioTokens.ink,
              ),
            ),
          ),
          // Language Switcher
          InkWell(
            onTap: () {
              setState(() => _language = _language == 'VI' ? 'EN' : 'VI');
            },
            borderRadius: BorderRadius.circular(8),
            child: Container(
              height: 36,
              padding: const EdgeInsets.symmetric(horizontal: 10),
              decoration: BoxDecoration(
                color: VocarioTokens.surface,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: VocarioTokens.border),
              ),
              child: Row(
                children: [
                  Text(
                    _language,
                    style: VocarioTokens.monoSmall.copyWith(
                      color: VocarioTokens.ink,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 5),
                    child: Text(
                      '|',
                      style: TextStyle(color: VocarioTokens.border, fontSize: 11),
                    ),
                  ),
                  Text(
                    _language == 'VI' ? 'EN' : 'VI',
                    style: VocarioTokens.monoSmall.copyWith(
                      color: VocarioTokens.muted,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // BRAND HERO SECTION
  // ==========================================================================
  Widget _buildBrandHero() {
    return Column(
      children: [
        // Wood Logo Badge [V]
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: VocarioTokens.brand,
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: VocarioTokens.ink.withValues(alpha: 0.22),
                offset: const Offset(0, 6),
                blurRadius: 16,
              ),
            ],
          ),
          alignment: Alignment.center,
          child: const Text(
            'V',
            style: TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.bold,
              fontFamily: 'serif',
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'VOCARIO',
          style: VocarioTokens.monoSmall.copyWith(
            color: VocarioTokens.muted,
            fontSize: 9.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 2.2,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          _mode == 'signin'
              ? 'Chào mừng bạn trở lại'
              : 'Khởi đầu hành trình mới',
          style: VocarioTokens.serifHeadline,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 5),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 300),
          child: Text(
            _mode == 'signin'
                ? 'Tiếp tục hành trình học từ vựng qua bối cảnh đời thực.'
                : 'Biến không gian sống xung quanh bạn thành giáo cụ học tập trực quan.',
            style: VocarioTokens.sansMuted,
            textAlign: TextAlign.center,
          ),
        ),
      ],
    );
  }

  // ==========================================================================
  // AUTH TABS
  // ==========================================================================
  Widget _buildAuthTabs() {
    return Container(
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: VocarioTokens.border, width: 1),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildTabButton('Đăng nhập', 'signin'),
          const SizedBox(width: 36),
          _buildTabButton('Tạo tài khoản', 'signup'),
        ],
      ),
    );
  }

  Widget _buildTabButton(String label, String modeKey) {
    final bool isActive = _mode == modeKey;
    return InkWell(
      onTap: () => setState(() => _mode = modeKey),
      splashColor: Colors.transparent,
      highlightColor: Colors.transparent,
      child: Container(
        padding: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: isActive ? VocarioTokens.brand : Colors.transparent,
              width: 2,
            ),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13.5,
            fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
            color: isActive ? VocarioTokens.ink : VocarioTokens.muted,
          ),
        ),
      ),
    );
  }

  // ==========================================================================
  // FORM CARD CONTAINER
  // ==========================================================================
  Widget _buildFormCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: VocarioTokens.border),
        boxShadow: VocarioTokens.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_mode == 'signin') ...[
            _buildInputField(
              label: 'Email liên kết hoặc tên đăng nhập',
              controller: _identityController,
              placeholder: 'name@example.com hoặc username',
            ),
            const SizedBox(height: 12),
            _buildInputField(
              label: 'Mật khẩu',
              controller: _passwordController,
              placeholder: 'Nhập mật khẩu',
              isPassword: true,
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                GestureDetector(
                  onTap: () => setState(() => _rememberMe = !_rememberMe),
                  child: Row(
                    children: [
                      Container(
                        width: 18,
                        height: 18,
                        decoration: BoxDecoration(
                          color: _rememberMe
                              ? VocarioTokens.brand
                              : VocarioTokens.field,
                          borderRadius: BorderRadius.circular(5),
                          border: Border.all(
                            color: _rememberMe
                                ? VocarioTokens.brand
                                : VocarioTokens.border,
                          ),
                        ),
                        child: _rememberMe
                            ? const Icon(Icons.check, size: 12, color: Colors.white)
                            : null,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Ghi nhớ phiên đăng nhập',
                        style: VocarioTokens.sansBody.copyWith(
                          fontSize: 11.5,
                          color: VocarioTokens.muted,
                        ),
                      ),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () =>
                      _showToast('Chức năng khôi phục mật khẩu đang thử nghiệm.'),
                  child: Text(
                    'Quên mật khẩu?',
                    style: VocarioTokens.sansBody.copyWith(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w600,
                      color: VocarioTokens.brand,
                    ),
                  ),
                ),
              ],
            ),
          ] else ...[
            _buildInputField(
              label: 'Họ và tên',
              controller: _nameController,
              placeholder: 'Nguyen Van Student',
            ),
            const SizedBox(height: 12),
            _buildInputField(
              label: 'Email liên kết',
              controller: _emailController,
              placeholder: 'student@example.com',
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildInputField(
                    label: 'Mật khẩu',
                    controller: _passwordController,
                    placeholder: '6+ ký tự',
                    isPassword: true,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildInputField(
                    label: 'Xác nhận mật khẩu',
                    controller: _confirmPasswordController,
                    placeholder: 'Nhập lại',
                    isPassword: true,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            _buildLevelSelector(),
          ],
          const SizedBox(height: 16),
          // Primary CTA Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _handleSubmit,
              style: ElevatedButton.styleFrom(
                backgroundColor: VocarioTokens.brand,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: _isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    )
                  : Text(
                      _mode == 'signin'
                          ? 'Đăng nhập vào Vocario'
                          : 'Tạo tài khoản Vocario',
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputField({
    required String label,
    required TextEditingController controller,
    required String placeholder,
    bool isPassword = false,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: VocarioTokens.sansLabel),
        const SizedBox(height: 6),
        Container(
          height: 46,
          decoration: BoxDecoration(
            color: VocarioTokens.field,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: VocarioTokens.border),
          ),
          child: TextField(
            controller: controller,
            obscureText: isPassword && !_showPassword,
            keyboardType: keyboardType,
            style: VocarioTokens.sansBody.copyWith(fontSize: 13.5),
            decoration: InputDecoration(
              hintText: placeholder,
              hintStyle: TextStyle(
                fontSize: 13,
                color: VocarioTokens.faint,
                fontWeight: FontWeight.normal,
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 14,
                vertical: 12,
              ),
              border: InputBorder.none,
              suffixIcon: isPassword
                  ? IconButton(
                      icon: Icon(
                        _showPassword
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                        size: 18,
                        color: VocarioTokens.muted,
                      ),
                      onPressed: () =>
                          setState(() => _showPassword = !_showPassword),
                    )
                  : null,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLevelSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Mục tiêu trình độ tiếng Anh của bạn',
          style: VocarioTokens.sansLabel,
        ),
        const SizedBox(height: 8),
        Row(
          children: _levels.map((lvl) {
            final bool isSelected = _selectedLevel == lvl['code'];
            return Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _selectedLevel = lvl['code']!),
                child: Container(
                  height: 48,
                  margin: const EdgeInsets.symmetric(horizontal: 2),
                  decoration: BoxDecoration(
                    color: isSelected ? VocarioTokens.brand : VocarioTokens.field,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSelected
                          ? VocarioTokens.brand
                          : VocarioTokens.border,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (isSelected)
                            const Padding(
                              padding: EdgeInsets.only(right: 2),
                              child: Icon(Icons.check, size: 10, color: Colors.white),
                            ),
                          Text(
                            lvl['code']!,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: isSelected ? Colors.white : VocarioTokens.ink,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        lvl['name']!,
                        style: TextStyle(
                          fontSize: 8.5,
                          color: isSelected
                              ? Colors.white.withValues(alpha: 0.9)
                              : VocarioTokens.muted,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildDivider(String text) {
    return Row(
      children: [
        const Expanded(child: Divider(color: VocarioTokens.border, thickness: 1)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Text(
            text,
            style: TextStyle(fontSize: 9.5, color: VocarioTokens.muted),
          ),
        ),
        const Expanded(child: Divider(color: VocarioTokens.border, thickness: 1)),
      ],
    );
  }

  Widget _buildDemoCardsGrid() {
    return Row(
      children: [
        Expanded(
          child: _buildDemoCard(
            title: 'Học viên demo',
            subtitle: 'nam23@gmail.com',
            icon: Icons.person_outline_rounded,
            onTap: () => _useDemo('learner'),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _buildDemoCard(
            title: 'Quản trị viên demo',
            subtitle: 'admin',
            icon: Icons.shield_outlined,
            onTap: () => _useDemo('admin'),
          ),
        ),
      ],
    );
  }

  Widget _buildDemoCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 56,
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 7),
        decoration: BoxDecoration(
          color: VocarioTokens.field,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: VocarioTokens.border),
        ),
        child: Row(
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: VocarioTokens.surface,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: VocarioTokens.border),
              ),
              child: Icon(icon, size: 15, color: VocarioTokens.brand),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: VocarioTokens.ink,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 9,
                      color: VocarioTokens.muted,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSocialLoginRow() {
    return Row(
      children: [
        Expanded(
          child: _buildSocialButton(
            label: 'Google',
            iconWidget: _buildGoogleIcon(),
            onTap: () => _showToast('Google Sign-In đang ở chế độ xem trước.'),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _buildSocialButton(
            label: 'Apple',
            iconWidget: const Icon(
              Icons.apple,
              size: 19,
              color: VocarioTokens.ink,
            ),
            onTap: () => _showToast('Apple Sign-In đang ở chế độ xem trước.'),
          ),
        ),
      ],
    );
  }

  Widget _buildGoogleIcon() {
    return SizedBox(
      width: 16,
      height: 16,
      child: CustomPaint(
        painter: _GoogleLogoPainter(),
      ),
    );
  }

  Widget _buildSocialButton({
    required String label,
    required Widget iconWidget,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        height: 44,
        decoration: BoxDecoration(
          color: VocarioTokens.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: VocarioTokens.border),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            iconWidget,
            const SizedBox(width: 8),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: VocarioTokens.ink,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTermsFooter() {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 16),
      child: Text.rich(
        TextSpan(
          text: 'Bằng việc đăng ký, bạn đồng ý với ',
          children: [
            TextSpan(
              text: 'Điều khoản dịch vụ',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: VocarioTokens.brand,
              ),
            ),
            TextSpan(text: ' và '),
            TextSpan(
              text: 'Chính sách bảo mật',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: VocarioTokens.brand,
              ),
            ),
            TextSpan(text: ' của Vocario.'),
          ],
        ),
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 10, color: VocarioTokens.muted, height: 1.5),
      ),
    );
  }

  Widget _buildFloatingToast() {
    return Positioned(
      top: 14,
      left: 20,
      right: 20,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: VocarioTokens.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: _isToastError
                ? VocarioTokens.errorBorder
                : VocarioTokens.border,
          ),
          boxShadow: VocarioTokens.toastShadow,
        ),
        child: Row(
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: _isToastError
                    ? VocarioTokens.errorBg
                    : VocarioTokens.brand.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                _isToastError ? Icons.error_outline : Icons.check,
                size: 14,
                color: _isToastError
                    ? VocarioTokens.errorText
                    : VocarioTokens.brand,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                _toastMessage!,
                style: TextStyle(
                  fontSize: 11.5,
                  color: _isToastError
                      ? VocarioTokens.errorText
                      : VocarioTokens.ink,
                  height: 1.4,
                ),
              ),
            ),
            GestureDetector(
              onTap: () => setState(() => _toastMessage = null),
              child: const Icon(Icons.close, size: 16, color: VocarioTokens.muted),
            ),
          ],
        ),
      ),
    );
  }
}

/// Custom painter vẽ biểu tượng chữ G 4 màu Google nguyên bản
class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    final paintBlue = Paint()..color = const Color(0xFF4285F4);
    final paintRed = Paint()..color = const Color(0xFFEA4335);
    final paintYellow = Paint()..color = const Color(0xFFFBBC05);
    final paintGreen = Paint()..color = const Color(0xFF34A853);

    final rect = Rect.fromLTWH(0, 0, w, h);

    // Xanh dương
    canvas.drawArc(rect, -0.4, 0.8, true, paintBlue);
    // Đỏ
    canvas.drawArc(rect, -2.4, 1.2, true, paintRed);
    // Vàng
    canvas.drawArc(rect, 2.6, 1.2, true, paintYellow);
    // Xanh lá
    canvas.drawArc(rect, 0.8, 1.2, true, paintGreen);

    // Vòng tròn trắng khoét tâm
    final whiteCenter = Paint()..color = Colors.white;
    canvas.drawCircle(Offset(w / 2, h / 2), w * 0.35, whiteCenter);

    // Thanh ngang màu xanh chữ G
    final blueBar = Paint()..color = const Color(0xFF4285F4);
    canvas.drawRect(
      Rect.fromLTWH(w * 0.45, h * 0.4, w * 0.55, h * 0.22),
      blueBar,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

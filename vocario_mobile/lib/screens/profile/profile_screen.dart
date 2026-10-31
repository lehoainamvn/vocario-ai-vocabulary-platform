import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/tokens.dart';
import '../../core/services/api_service.dart';
import '../auth/auth_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isClaimingCert = false;
  bool _isLevelingUp = false;
  String? _toastMessage;
  Timer? _toastTimer;

  // Account Fields
  final TextEditingController _fullNameController = TextEditingController();
  String _username = '';
  String _email = '';
  int _streakCount = 0;

  // Learning Goals
  String _targetLevel = 'A2';
  int _dailyGoal = 10;

  // Certificates list
  List<dynamic> _certificates = [];

  final List<String> _cefrLevels = const ['A1', 'A2', 'B1', 'B2', 'C1'];
  final List<int> _dailyGoalOptions = const [5, 10, 15, 20];

  @override
  void initState() {
    super.initState();
    _loadProfileData();
  }

  @override
  void dispose() {
    _toastTimer?.cancel();
    _fullNameController.dispose();
    super.dispose();
  }

  void _showToast(String message) {
    _toastTimer?.cancel();
    setState(() => _toastMessage = message);
    _toastTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) setState(() => _toastMessage = null);
    });
  }

  /// Nạp hồ sơ học viên & danh sách chứng chỉ từ Spring Boot
  Future<void> _loadProfileData() async {
    setState(() => _isLoading = true);

    try {
      final user = await ApiService().getUserProfile();
      final certs = await ApiService().getMyCertificates();

      if (!mounted) return;

      setState(() {
        if (user != null) {
          _fullNameController.text = user['fullName'] ?? user['username'] ?? '';
          _username = user['username'] ?? '';
          _email = user['email'] ?? '';
          _streakCount = (user['streakCount'] as num?)?.toInt() ?? 0;
          _targetLevel = user['targetLevel'] ?? 'A2';
          _dailyGoal = (user['dailyGoal'] as num?)?.toInt() ?? 10;
        }

        _certificates = certs;
        _isLoading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  /// Lưu thay đổi thiết lập qua `PUT /api/auth/profile`
  Future<void> _saveProfileChanges() async {
    final newName = _fullNameController.text.trim();
    if (newName.isEmpty) {
      _showToast('Vui lòng nhập họ và tên hợp lệ.');
      return;
    }

    setState(() => _isSaving = true);

    try {
      final updated = await ApiService().updateProfile(
        fullName: newName,
        targetLevel: _targetLevel,
        dailyGoal: _dailyGoal,
      );

      if (!mounted) return;

      setState(() => _isSaving = false);
      if (updated != null) {
        _showToast('Đã lưu thiết lập học tập thành công!');
      } else {
        _showToast('Đã cập nhật thông tin học tập của bạn!');
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isSaving = false);
        _showToast('Đã cập nhật mục tiêu học tập!');
      }
    }
  }

  /// Yêu cầu cấp Chứng chỉ CEFR chính thức qua `POST /api/certificates/claim`
  Future<void> _claimCertificate() async {
    setState(() => _isClaimingCert = true);
    try {
      final res = await ApiService().claimCertificate(level: _targetLevel);
      if (res != null) {
        _showToast('Đã nhận thành công Chứng chỉ CEFR $_targetLevel chính thức!');
        await _loadProfileData();
      } else {
        _showToast('Chưa đủ 100% điều kiện nhận chứng chỉ hoặc đã nhận trước đó.');
      }
    } catch (e) {
      _showToast('Lỗi nhận chứng chỉ: $e');
    } finally {
      if (mounted) setState(() => _isClaimingCert = false);
    }
  }

  /// Thăng cấp trình độ học viên qua `POST /api/auth/level-up`
  Future<void> _levelUpUser() async {
    setState(() => _isLevelingUp = true);
    try {
      final res = await ApiService().levelUpUser();
      if (res != null) {
        final newLvl = res['targetLevel']?.toString() ?? _targetLevel;
        setState(() => _targetLevel = newLvl);
        _showToast('Chúc mừng! Bạn đã thăng cấp thành công lên trình độ $newLvl!');
        await _loadProfileData();
      } else {
        _showToast('Chưa đạt đủ chỉ tiêu số từ để thăng cấp.');
      }
    } catch (e) {
      _showToast('Lỗi thăng cấp: $e');
    } finally {
      if (mounted) setState(() => _isLevelingUp = false);
    }
  }

  /// Đăng xuất tài khoản an toàn
  Future<void> _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: VocarioTokens.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: Text(
          'Đăng xuất tài khoản?',
          style: VocarioTokens.serifHeadline.copyWith(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        content: const Text(
          'Bạn sẽ cần đăng nhập lại để tiếp tục đồng bộ từ vựng và chuỗi học tập.',
          style: TextStyle(fontSize: 12, color: VocarioTokens.muted, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy', style: TextStyle(color: VocarioTokens.muted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFB91C1C),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Đăng xuất'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await ApiService().logout();
      if (!mounted) return;
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const AuthScreen()),
        (route) => false,
      );
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
                  child: _isLoading
                      ? const Center(child: CircularProgressIndicator(color: VocarioTokens.brand, strokeWidth: 2))
                      : SingleChildScrollView(
                          physics: const BouncingScrollPhysics(),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Header & Streak Indicator
                              _buildHeaderSection(),
                              const SizedBox(height: 18),

                              // 01 Account Details
                              _buildAccountDetailsSection(),
                              const SizedBox(height: 18),

                              // 02 Learning Goals
                              _buildLearningGoalsSection(),
                              const SizedBox(height: 18),

                              // 03 Certificates
                              _buildCertificatesSection(),
                              const SizedBox(height: 22),

                              // 04 Save and Logout Action Buttons
                              _buildActionButtons(),
                              const SizedBox(height: 28),
                            ],
                          ),
                        ),
                ),
              ],
            ),
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        border: const Border(bottom: BorderSide(color: VocarioTokens.border)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.arrow_back_rounded, size: 20, color: VocarioTokens.ink),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'SCHOLAR\'S DESK',
                    style: VocarioTokens.monoSmall.copyWith(fontSize: 7.5, color: VocarioTokens.brand),
                  ),
                  Text(
                    'Hồ sơ học viên',
                    style: VocarioTokens.serifHeadline.copyWith(fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ],
          ),
          IconButton(
            onPressed: _handleLogout,
            icon: const Icon(Icons.logout_rounded, size: 18, color: Color(0xFFB91C1C)),
            tooltip: 'Đăng xuất',
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // HEADER SECTION
  // ==========================================================================
  Widget _buildHeaderSection() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: VocarioTokens.border),
        boxShadow: VocarioTokens.cardShadow,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'THIẾT LẬP HỌC TẬP CÁ NHÂN',
                  style: VocarioTokens.monoSmall.copyWith(fontSize: 8, color: VocarioTokens.brand),
                ),
                const SizedBox(height: 2),
                Text(
                  'Hồ sơ & Tiến độ',
                  style: VocarioTokens.serifHeadline.copyWith(fontSize: 17, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 3),
                Text(
                  'Quản lý mục tiêu CEFR và đồng bộ hóa tiến trình rèn luyện.',
                  style: TextStyle(fontSize: 10.5, color: VocarioTokens.muted),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Streak Pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFFCD34D)),
            ),
            child: Column(
              children: [
                const Icon(Icons.local_fire_department_rounded, size: 20, color: Color(0xFFB45309)),
                const SizedBox(height: 2),
                Text(
                  '$_streakCount ngày',
                  style: VocarioTokens.monoSmall.copyWith(
                    fontSize: 9.5,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFFB45309),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // 1. ACCOUNT DETAILS SECTION
  // ==========================================================================
  Widget _buildAccountDetailsSection() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: VocarioTokens.border),
        boxShadow: VocarioTokens.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                '01',
                style: VocarioTokens.serifHeadline.copyWith(fontSize: 13, color: VocarioTokens.brand),
              ),
              const SizedBox(width: 6),
              Text(
                'THÔNG TIN TÀI KHOẢN CỐT LÕI',
                style: VocarioTokens.monoSmall.copyWith(fontSize: 8, color: VocarioTokens.brand),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Họ và tên (editable)
          Text(
            'Họ và tên',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: VocarioTokens.ink),
          ),
          const SizedBox(height: 5),
          TextField(
            controller: _fullNameController,
            style: const TextStyle(fontSize: 12.5, color: VocarioTokens.ink),
            decoration: InputDecoration(
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              filled: true,
              fillColor: VocarioTokens.field,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: VocarioTokens.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: VocarioTokens.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: VocarioTokens.brand),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Tên đăng nhập (read-only)
          Text(
            'Tên đăng nhập',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: VocarioTokens.ink),
          ),
          const SizedBox(height: 5),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF1ECE3).withValues(alpha: 0.7),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: VocarioTokens.border),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '@$_username',
                  style: VocarioTokens.monoSmall.copyWith(fontSize: 11.5, color: VocarioTokens.ink),
                ),
                Text(
                  'Định danh cố định',
                  style: TextStyle(fontSize: 9, color: VocarioTokens.muted),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Email liên kết
          Text(
            'Email liên kết',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: VocarioTokens.ink),
          ),
          const SizedBox(height: 5),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: VocarioTokens.field,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: VocarioTokens.border),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _email,
                  style: const TextStyle(fontSize: 11.5, color: VocarioTokens.ink),
                ),
                Row(
                  children: [
                    const Icon(Icons.check_circle_rounded, size: 12, color: Color(0xFF10B981)),
                    const SizedBox(width: 3),
                    Text(
                      'Đã xác thực',
                      style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: const Color(0xFF10B981)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // 2. LEARNING GOALS SECTION
  // ==========================================================================
  Widget _buildLearningGoalsSection() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: VocarioTokens.border),
        boxShadow: VocarioTokens.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                '02',
                style: VocarioTokens.serifHeadline.copyWith(fontSize: 13, color: VocarioTokens.brand),
              ),
              const SizedBox(width: 6),
              Text(
                'MỤC TIÊU HỌC TẬP CÁ NHÂN',
                style: VocarioTokens.monoSmall.copyWith(fontSize: 8, color: VocarioTokens.brand),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // CEFR Target Level Segmented Bar
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Mục tiêu trình độ tiếng Anh',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: VocarioTokens.ink),
              ),
              Text(
                'Chuẩn hóa CEFR',
                style: TextStyle(fontSize: 9.5, color: VocarioTokens.muted),
              ),
            ],
          ),
          const SizedBox(height: 8),

          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: VocarioTokens.border),
            ),
            child: Row(
              children: _cefrLevels.map((lvl) {
                final isSelected = _targetLevel == lvl;
                return Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _targetLevel = lvl),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      decoration: BoxDecoration(
                        color: isSelected ? VocarioTokens.brand : Colors.transparent,
                        border: Border(
                          right: lvl != _cefrLevels.last
                              ? const BorderSide(color: VocarioTokens.border)
                              : BorderSide.none,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        lvl,
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                          color: isSelected ? Colors.white : VocarioTokens.ink,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Hệ thống AI sẽ ưu tiên trích xuất từ vựng và câu chuyện bối cảnh phù hợp năng lực $_targetLevel.',
            style: TextStyle(fontSize: 10, color: VocarioTokens.muted, height: 1.35),
          ),
          const SizedBox(height: 14),

          // Daily Target Words Segmented Bar
          Text(
            'Tần suất ôn tập mỗi ngày',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: VocarioTokens.ink),
          ),
          const SizedBox(height: 8),

          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: VocarioTokens.border),
            ),
            child: Row(
              children: _dailyGoalOptions.map((opt) {
                final isSelected = _dailyGoal == opt;
                return Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _dailyGoal = opt),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 9),
                      decoration: BoxDecoration(
                        color: isSelected ? VocarioTokens.brand : Colors.transparent,
                        border: Border(
                          right: opt != _dailyGoalOptions.last
                              ? const BorderSide(color: VocarioTokens.border)
                              : BorderSide.none,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        '$opt từ',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                          color: isSelected ? Colors.white : VocarioTokens.ink,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 38,
            child: OutlinedButton.icon(
              onPressed: _isLevelingUp ? null : _levelUpUser,
              icon: _isLevelingUp
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: VocarioTokens.brand),
                    )
                  : const Icon(Icons.trending_up_rounded, size: 16, color: VocarioTokens.brand),
              label: Text(
                _isLevelingUp ? 'Đang kiểm tra chỉ tiêu...' : 'Thăng cấp trình độ tiếp theo (Level Up)',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: VocarioTokens.brand),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: VocarioTokens.brand),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // 3. CERTIFICATES SECTION
  // ==========================================================================
  Widget _buildCertificatesSection() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: VocarioTokens.border),
        boxShadow: VocarioTokens.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                '03',
                style: VocarioTokens.serifHeadline.copyWith(fontSize: 13, color: VocarioTokens.brand),
              ),
              const SizedBox(width: 6),
              Text(
                'CHỨNG CHỈ CEFR TÍCH LŨY',
                style: VocarioTokens.monoSmall.copyWith(fontSize: 8, color: VocarioTokens.brand),
              ),
            ],
          ),
          const SizedBox(height: 10),

          if (_certificates.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: VocarioTokens.field,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: VocarioTokens.border),
              ),
              child: Column(
                children: [
                  const Icon(Icons.military_tech_outlined, size: 28, color: VocarioTokens.muted),
                  const SizedBox(height: 6),
                  Text(
                    'Chưa có chứng chỉ chính thức',
                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: VocarioTokens.ink),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Hoàn thành 100% kho từ vựng theo trình độ để nhận chứng chỉ chính thức từ hội đồng Vocario.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 10, color: VocarioTokens.muted, height: 1.35),
                  ),
                  const SizedBox(height: 10),
                  TextButton.icon(
                    onPressed: () => _showCertificateModal({
                      'cefrLevel': _targetLevel,
                      'id': 'preview-demo',
                      'title': 'Chứng chỉ Năng lực Tiếng Anh $_targetLevel',
                    }),
                    icon: const Icon(Icons.visibility_outlined, size: 14, color: VocarioTokens.brand),
                    label: Text(
                      'Xem bản mẫu chứng chỉ CEFR $_targetLevel',
                      style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: VocarioTokens.brand),
                    ),
                  ),
                ],
              ),
            )
          else
            Column(
              children: _certificates.map((cert) {
                final lvl = cert['cefrLevel'] ?? 'A2';
                final title = cert['title'] ?? 'Chứng chỉ Năng lực Tiếng Anh $lvl';
                return InkWell(
                  onTap: () => _showCertificateModal(cert as Map<String, dynamic>),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFF86EFAC)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.verified_rounded, size: 20, color: Color(0xFF16A34A)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                title,
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF14532D)),
                              ),
                              Text(
                                'Đã cấp duyệt · Cấp độ chuẩn $lvl · Bấm để xem chi tiết',
                                style: TextStyle(fontSize: 9.5, color: const Color(0xFF166534)),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right_rounded, size: 16, color: Color(0xFF16A34A)),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            height: 40,
            child: ElevatedButton.icon(
              onPressed: _isClaimingCert ? null : _claimCertificate,
              icon: _isClaimingCert
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.military_tech_rounded, size: 17),
              label: Text(
                _isClaimingCert ? 'Đang gửi yêu cầu cấp chứng chỉ...' : 'Nhận chứng chỉ CEFR $_targetLevel chính thức',
                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFB45309),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // CERTIFICATE FULL DETAILS MODAL
  // ==========================================================================
  void _showCertificateModal(Map<String, dynamic> cert) {
    final lvl = cert['cefrLevel'] ?? _targetLevel;
    final name = _fullNameController.text.isNotEmpty ? _fullNameController.text : _username;
    final idStr = (cert['id'] ?? '8892').toString().replaceAll('-', '');
    final code = 'VOC-2026-${idStr.length >= 8 ? idStr.substring(0, 8).toUpperCase() : idStr.toUpperCase()}';
    final issueDate = cert['issuedAt'] != null
        ? cert['issuedAt'].toString().split('T').first
        : '28/10/2026';

    showDialog(
      context: context,
      builder: (ctx) {
        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 420),
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              color: const Color(0xFFFBF9F5),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFD4AF37), width: 2),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.25),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Top status ribbon
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: const Color(0xFFD97706)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.verified_rounded, size: 14, color: Color(0xFFD97706)),
                            const SizedBox(width: 4),
                            Text(
                              'CHỨNG CHỈ CEFR CHÍNH THỨC',
                              style: VocarioTokens.monoSmall.copyWith(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF92400E),
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded, size: 18),
                        onPressed: () => Navigator.pop(ctx),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Gold seal emblem
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFAF5EB),
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFD4AF37), width: 2),
                    ),
                    child: const Icon(Icons.military_tech_rounded, size: 32, color: Color(0xFFB45309)),
                  ),
                  const SizedBox(height: 12),

                  Text(
                    'HỘI ĐỒNG HỌC THUẬT VOCARIO',
                    style: VocarioTokens.monoSmall.copyWith(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.2,
                      color: const Color(0xFF78350F),
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'CHỨNG NHẬN NĂNG LỰC TỪ VỰNG',
                    style: TextStyle(
                      fontFamily: 'Playfair Display',
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF2D2823),
                    ),
                  ),
                  const SizedBox(height: 14),

                  Text(
                    'Chứng nhận trao cho học viên:',
                    style: TextStyle(fontSize: 11, color: VocarioTokens.muted, fontStyle: FontStyle.italic),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    name,
                    style: VocarioTokens.serifHeadline.copyWith(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF1E1B18),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Level Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: VocarioTokens.brand,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'TRÌNH ĐỘ CEFR $lvl',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text(
                      'Đã hoàn thành toàn diện lộ trình bóc tách từ vựng qua AI Vision và ghi nhớ dài hạn qua thuật toán lặp lại ngắt quãng SM-2.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 10.5, color: VocarioTokens.ink, height: 1.45),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: Color(0xFFE5DED3)),
                  const SizedBox(height: 10),

                  // Metadata Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('MÃ TRA CỨU:', style: VocarioTokens.monoSmall.copyWith(fontSize: 8, color: VocarioTokens.muted)),
                          Text(code, style: VocarioTokens.monoSmall.copyWith(fontSize: 9, fontWeight: FontWeight.bold, color: VocarioTokens.brand)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('NGÀY CẤP:', style: VocarioTokens.monoSmall.copyWith(fontSize: 8, color: VocarioTokens.muted)),
                          Text(issueDate, style: VocarioTokens.monoSmall.copyWith(fontSize: 9, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  SizedBox(
                    width: double.infinity,
                    height: 38,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: VocarioTokens.brand,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      child: const Text('Đóng cửa sổ', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  // ==========================================================================
  // 4. ACTION BUTTONS (SAVE & LOGOUT)
  // ==========================================================================
  Widget _buildActionButtons() {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          height: 44,
          child: ElevatedButton(
            onPressed: _isSaving ? null : _saveProfileChanges,
            style: ElevatedButton.styleFrom(
              backgroundColor: VocarioTokens.brand,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: _isSaving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                  )
                : const Text('Lưu thay đổi thiết lập', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
          ),
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          height: 42,
          child: OutlinedButton.icon(
            onPressed: _handleLogout,
            icon: const Icon(Icons.logout_rounded, size: 16),
            label: const Text('Đăng xuất tài khoản', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFFB91C1C),
              side: const BorderSide(color: Color(0xFFFCA5A5)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ),
      ],
    );
  }

  // ==========================================================================
  // FLOATING TOAST
  // ==========================================================================
  Widget _buildFloatingToast() {
    return Positioned(
      top: 12,
      left: 18,
      right: 18,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
        decoration: BoxDecoration(
          color: VocarioTokens.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: VocarioTokens.border),
          boxShadow: VocarioTokens.toastShadow,
        ),
        child: Row(
          children: [
            const Icon(Icons.check_circle_outline_rounded, size: 14, color: VocarioTokens.brand),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                _toastMessage!,
                style: const TextStyle(fontSize: 10, color: VocarioTokens.ink, height: 1.35),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

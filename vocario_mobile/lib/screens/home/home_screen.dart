import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/tokens.dart';
import '../../core/services/api_service.dart';
import '../scanner/scanner_screen.dart';
import '../wordbook/wordbook_screen.dart';
import '../arena/arena_screen.dart';
import '../leaderboard/leaderboard_screen.dart';
import '../profile/profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // Navigation & UI States
  String _activeNav = 'Trang chủ';
  String? _toastMessage;
  Timer? _toastTimer;
  bool _isSpeaking = false;
  bool _isLoading = true;

  // Synced Database State (Fallbacks are set to authentic demo data)
  String _userFullName = 'Lê Hoài Nam';
  String _targetLevel = 'B1';
  int _streakCount = 7;
  int _dueWordsCount = 12;

  // Word Preview (Syncs from first due card in CSDL)
  String _previewWord = 'refrigerator';
  String _previewIpa = '/rɪˈfrɪdʒəreɪtər/';
  String _previewMeaning = 'tủ lạnh';
  String _previewLevel = 'B1';

  // Mastery Progress (Syncs from CSDL target-progress)
  int _masteredWords = 86;
  int _totalTargetWords = 120;
  int _completionPercentage = 72;

  List<Map<String, dynamic>> _tiers = [
    {'code': 'A1', 'progress': '100%', 'status': 'complete'},
    {'code': 'A2', 'progress': '100%', 'status': 'complete'},
    {'code': 'B1', 'progress': '72%', 'status': 'active'},
    {'code': 'B2', 'progress': '15%', 'status': 'future'},
    {'code': 'C1', 'progress': '0%', 'status': 'future'},
  ];

  @override
  void initState() {
    super.initState();
    _fetchDatabaseData();
  }

  @override
  void dispose() {
    _toastTimer?.cancel();
    super.dispose();
  }

  /// Đồng bộ dữ liệu trực tiếp với Backend Spring Boot & CSDL PostgreSQL
  Future<void> _fetchDatabaseData() async {
    try {
      final bundle = await ApiService().getDashboardData();

      final user = bundle['user'] as Map<String, dynamic>?;
      final dueCards = bundle['dueCards'] as List<dynamic>;
      final targetProgress = bundle['targetProgress'] as Map<String, dynamic>?;

      if (!mounted) return;

      setState(() {
        // 1. Đồng bộ thông tin người dùng
        if (user != null) {
          _userFullName = user['fullName'] ?? user['username'] ?? 'Lê Hoài Nam';
          _targetLevel = user['targetLevel'] ?? 'B1';
          _streakCount = user['streakCount'] ?? 7;
        }

        // 2. Đồng bộ hàng đợi ôn tập SM-2
        if (dueCards.isNotEmpty) {
          _dueWordsCount = dueCards.length;
          final firstCard = dueCards.first;
          final wordObj = firstCard['word'] as Map<String, dynamic>?;
          if (wordObj != null) {
            _previewWord = wordObj['word'] ?? 'refrigerator';
            _previewIpa = wordObj['phoneticIpa'] ?? '/rɪˈfrɪdʒəreɪtər/';
            _previewMeaning = wordObj['vietnameseMeaning'] ?? 'tủ lạnh';
            _previewLevel = wordObj['cefrLevel'] ?? _targetLevel;
          }
        }

        // 3. Đồng bộ tiến độ chuẩn hóa CEFR
        if (targetProgress != null) {
          _masteredWords = (targetProgress['masteredWordsAtLevel'] as num?)?.toInt() ?? 86;
          _totalTargetWords = (targetProgress['totalWordsAtLevel'] as num?)?.toInt() ?? 120;
          _completionPercentage = (targetProgress['completionPercentage'] as num?)?.toInt() ?? 72;

          final breakdowns = targetProgress['levelBreakdowns'] as List<dynamic>?;
          if (breakdowns != null && breakdowns.isNotEmpty) {
            _tiers = breakdowns.map((b) {
              final code = b['level']?.toString() ?? 'A1';
              final pct = (b['completionPercentage'] as num?)?.toInt() ?? 0;
              final isComplete = pct >= 100;
              final isActive = code == _targetLevel;

              return {
                'code': code,
                'progress': '$pct%',
                'status': isComplete ? 'complete' : (isActive ? 'active' : 'future'),
              };
            }).toList();
          }
        }

        _isLoading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showToast(String message) {
    _toastTimer?.cancel();
    setState(() => _toastMessage = message);
    _toastTimer = Timer(const Duration(milliseconds: 3200), () {
      if (mounted) {
        setState(() => _toastMessage = null);
      }
    });
  }

  void _playWordAudio() {
    setState(() => _isSpeaking = true);
    _showToast('Đang phát âm chuẩn bản ngữ: $_previewWord');
    Timer(const Duration(milliseconds: 900), () {
      if (mounted) {
        setState(() => _isSpeaking = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VocarioTokens.canvas,
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            Column(
              children: [
                _buildTopBar(),
                if (_isLoading)
                  const SizedBox(
                    height: 2,
                    child: LinearProgressIndicator(
                      backgroundColor: Colors.transparent,
                      valueColor: AlwaysStoppedAnimation<Color>(VocarioTokens.brand),
                    ),
                  ),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _fetchDatabaseData,
                    color: VocarioTokens.brand,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(
                        parent: BouncingScrollPhysics(),
                      ),
                      padding: const EdgeInsets.only(
                        left: 16,
                        right: 16,
                        top: 6,
                        bottom: 96,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildReviewHero(),
                          const SizedBox(height: 20),
                          _buildQuickActionsSection(),
                          const SizedBox(height: 20),
                          _buildMasteryProgressCard(),
                          const SizedBox(height: 20),
                          _buildVisualArenaSection(),
                          const SizedBox(height: 20),
                          _buildWeeklyLeaderboardSection(),
                          const SizedBox(height: 20),
                          _buildFooterSyncStatus(),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            // Docked Bottom Navigation Bar
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: _buildBottomNav(),
            ),
            // Floating Toast Notification
            if (_toastMessage != null) _buildFloatingToast(),
          ],
        ),
      ),
    );
  }

  // ==========================================================================
  // 1. TOP BAR & USER PROFILE GREETING
  // ==========================================================================
  Widget _buildTopBar() {
    final initials = _userFullName.isNotEmpty
        ? _userFullName.trim().split(' ').map((w) => w.isNotEmpty ? w[0] : '').take(2).join()
        : 'LN';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // User Avatar & Greeting Stack
          InkWell(
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ProfileScreen()),
            ).then((_) => _fetchDatabaseData()),
            borderRadius: BorderRadius.circular(12),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: VocarioTokens.brand,
                    shape: BoxShape.circle,
                    border: Border.all(color: VocarioTokens.border),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    initials.toUpperCase(),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(width: 9),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'CHÀO BUỔI SÁNG',
                      style: VocarioTokens.monoSmall.copyWith(
                        fontSize: 8.5,
                        color: VocarioTokens.muted,
                        letterSpacing: 1.0,
                      ),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      _userFullName,
                      style: VocarioTokens.serifHeadline.copyWith(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Header Metrics (Streak & Target Level)
          Row(
            children: [
              _buildHeaderMetricBadge(
                icon: Icons.local_fire_department_rounded,
                iconColor: VocarioTokens.amber,
                text: '$_streakCount ngày',
                textColor: VocarioTokens.amber,
                onTap: () => _showToast('Bạn đã duy trì chuỗi học $_streakCount ngày liên tiếp.'),
              ),
              const SizedBox(width: 6),
              _buildHeaderMetricBadge(
                icon: Icons.track_changes_rounded,
                iconColor: VocarioTokens.brand,
                text: _targetLevel,
                textColor: VocarioTokens.brand,
                isMono: true,
                onTap: () => _showToast('Mục tiêu hiện tại: Chuẩn CEFR $_targetLevel.'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderMetricBadge({
    required IconData icon,
    required Color iconColor,
    required String text,
    required Color textColor,
    bool isMono = false,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        height: 32,
        padding: const EdgeInsets.symmetric(horizontal: 8),
        decoration: BoxDecoration(
          color: VocarioTokens.field,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: VocarioTokens.border),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: iconColor),
            const SizedBox(width: 4),
            Text(
              text,
              style: isMono
                  ? VocarioTokens.monoSmall.copyWith(fontSize: 10, color: textColor)
                  : TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: textColor),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================================================
  // 2. HERO SPACED-REPETITION REVIEW BANNER
  // ==========================================================================
  Widget _buildReviewHero() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: VocarioTokens.brand,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF6E5A47)),
        boxShadow: [
          BoxShadow(
            color: VocarioTokens.ink.withValues(alpha: 0.12),
            offset: const Offset(0, 8),
            blurRadius: 24,
            spreadRadius: -4,
          ),
        ],
      ),
      child: Stack(
        children: [
          // Background organic curves
          Positioned.fill(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: CustomPaint(
                painter: _HeroContourPainter(),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(17),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Tag Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'ÔN TẬP HÔM NAY · SM-2',
                      style: VocarioTokens.monoSmall.copyWith(
                        fontSize: 9,
                        color: Colors.white.withValues(alpha: 0.76),
                        letterSpacing: 1.0,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: VocarioTokens.brandHover,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'Ưu tiên',
                        style: TextStyle(
                          fontSize: 8.5,
                          fontWeight: FontWeight.bold,
                          color: VocarioTokens.goldAccent,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                // Title
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      '$_dueWordsCount',
                      style: VocarioTokens.serifHeadline.copyWith(
                        fontSize: 29,
                        fontWeight: FontWeight.bold,
                        color: VocarioTokens.goldAccent,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'từ cần ôn',
                      style: VocarioTokens.serifHeadline.copyWith(
                        fontSize: 23,
                        fontWeight: FontWeight.w500,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Khoảng cách ngắt quãng đã đến hạn. Dành 5 phút để ghi nhớ vĩnh viễn.',
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.white.withValues(alpha: 0.8),
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 12),
                // Word Preview Floating White Card
                _buildWordPreviewCard(),
                const SizedBox(height: 12),
                // Primary Action Button
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const WordbookScreen(initialTabIndex: 1),
                      ),
                    ).then((_) => _fetchDatabaseData()),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: VocarioTokens.goldAccent,
                      foregroundColor: VocarioTokens.ink,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Text(
                          'Bắt đầu ôn tập',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                        SizedBox(width: 6),
                        Icon(Icons.arrow_forward_rounded, size: 16),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWordPreviewCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 10),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: VocarioTokens.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'TỪ XEM TRƯỚC',
                style: VocarioTokens.monoSmall.copyWith(
                  fontSize: 8,
                  color: VocarioTokens.muted,
                  letterSpacing: 0.8,
                ),
              ),
              GestureDetector(
                onTap: _playWordAudio,
                child: AnimatedScale(
                  scale: _isSpeaking ? 1.25 : 1.0,
                  duration: const Duration(milliseconds: 200),
                  child: Icon(
                    Icons.volume_up_rounded,
                    size: 16,
                    color: _isSpeaking ? VocarioTokens.amber : VocarioTokens.brand,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                decoration: BoxDecoration(
                  color: VocarioTokens.brand.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  _previewLevel,
                  style: VocarioTokens.monoSmall.copyWith(
                    fontSize: 8.5,
                    color: VocarioTokens.brand,
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Text(
                _previewWord,
                style: VocarioTokens.serifHeadline.copyWith(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Text(
                _previewIpa,
                style: VocarioTokens.monoSmall.copyWith(
                  fontSize: 9.5,
                  color: VocarioTokens.muted,
                ),
              ),
              Container(
                height: 10,
                width: 1,
                color: VocarioTokens.border,
                margin: const EdgeInsets.symmetric(horizontal: 6),
              ),
              Text(
                _previewMeaning,
                style: const TextStyle(fontSize: 10, color: VocarioTokens.muted),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // 3. QUICK ACTIONS GRID SECTION
  // ==========================================================================
  Widget _buildQuickActionsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'THAO TÁC NHANH',
                  style: VocarioTokens.monoSmall.copyWith(
                    fontSize: 8,
                    color: VocarioTokens.brand,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Hôm nay bạn muốn học gì?',
                  style: VocarioTokens.serifHeadline.copyWith(fontSize: 16),
                ),
              ],
            ),
            Text(
              '01—04',
              style: VocarioTokens.monoSmall.copyWith(
                fontSize: 9,
                color: VocarioTokens.muted,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildQuickActionCard(
                icon: Icons.camera_alt_outlined,
                title: 'Quét Camera',
                subtitle: 'Nhận diện AI thế giới thực',
                tag: 'HOT',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ScannerScreen()),
                ),
              ),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: _buildQuickActionCard(
                icon: Icons.description_outlined,
                title: 'Tài Liệu OCR',
                subtitle: 'Trích xuất PDF / Word',
                onTap: () => _showToast('Mở trình trích xuất tài liệu văn bản...'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 9),
        Row(
          children: [
            Expanded(
              child: _buildQuickActionCard(
                icon: Icons.style_outlined,
                title: 'Sổ Từ SM-2',
                subtitle: 'Kho thẻ nhớ của bạn',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const WordbookScreen(initialTabIndex: 0),
                  ),
                ).then((_) => _fetchDatabaseData()),
              ),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: _buildQuickActionCard(
                icon: Icons.sports_kabaddi_outlined,
                title: 'Đấu Trường',
                subtitle: 'Phản xạ qua ảnh thật',
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ArenaScreen()),
                ).then((_) => _fetchDatabaseData()),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    String? tag,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        height: 74,
        padding: const EdgeInsets.all(9),
        decoration: BoxDecoration(
          color: VocarioTokens.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: VocarioTokens.border),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: VocarioTokens.field,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: VocarioTokens.border),
              ),
              child: Icon(icon, size: 18, color: VocarioTokens.brand),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: VocarioTokens.ink,
                          ),
                        ),
                      ),
                      if (tag != null) ...[
                        const SizedBox(width: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: VocarioTokens.amber.withValues(alpha: 0.14),
                            borderRadius: BorderRadius.circular(3),
                          ),
                          child: Text(
                            tag,
                            style: VocarioTokens.monoSmall.copyWith(
                              fontSize: 7,
                              color: VocarioTokens.amber,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 8.5,
                      color: VocarioTokens.muted,
                      height: 1.2,
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

  // ==========================================================================
  // 4. CEFR MASTERY PROGRESS CARD
  // ==========================================================================
  Widget _buildMasteryProgressCard() {
    return Container(
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: VocarioTokens.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'KHUNG NĂNG LỰC CHUẨN',
                    style: VocarioTokens.monoSmall.copyWith(
                      fontSize: 8,
                      color: VocarioTokens.brand,
                      letterSpacing: 1.0,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Tiến độ chuẩn hóa $_targetLevel',
                    style: VocarioTokens.serifHeadline.copyWith(fontSize: 16),
                  ),
                ],
              ),
              InkWell(
                onTap: () => _showToast('Chi tiết khung CEFR đang đồng bộ CSDL.'),
                child: Row(
                  children: const [
                    Text(
                      'Chi tiết',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: VocarioTokens.brand,
                      ),
                    ),
                    SizedBox(width: 2),
                    Icon(Icons.arrow_forward_rounded, size: 12, color: VocarioTokens.brand),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  RichText(
                    text: TextSpan(
                      text: '$_masteredWords',
                      style: VocarioTokens.serifHeadline.copyWith(
                        fontSize: 21,
                        fontWeight: FontWeight.bold,
                      ),
                      children: [
                        TextSpan(
                          text: ' / $_totalTargetWords từ',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.normal,
                            color: VocarioTokens.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    'đã thuộc vĩnh viễn',
                    style: TextStyle(fontSize: 9, color: VocarioTokens.muted),
                  ),
                ],
              ),
              Text(
                '$_completionPercentage% HOÀN THÀNH',
                style: VocarioTokens.monoSmall.copyWith(
                  fontSize: 8.5,
                  color: VocarioTokens.brand,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // Progress bar track
          Container(
            height: 6,
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFFE5DFD4),
              borderRadius: BorderRadius.circular(999),
            ),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: (_completionPercentage / 100).clamp(0.0, 1.0),
              child: Container(
                decoration: BoxDecoration(
                  color: VocarioTokens.brand,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
          // 5-Tier Grid Buttons
          Row(
            children: _tiers.map((tier) {
              final isComplete = tier['status'] == 'complete';
              final isActive = tier['status'] == 'active';

              return Expanded(
                child: Container(
                  height: 43,
                  margin: const EdgeInsets.symmetric(horizontal: 2.5),
                  decoration: BoxDecoration(
                    color: isComplete
                        ? const Color(0xFF5F765E).withValues(alpha: 0.12)
                        : (isActive ? VocarioTokens.surface : VocarioTokens.field),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isComplete
                          ? const Color(0xFF5F765E).withValues(alpha: 0.35)
                          : (isActive ? VocarioTokens.brand : VocarioTokens.border),
                      width: isActive ? 1.5 : 1.0,
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (isComplete)
                            const Padding(
                              padding: EdgeInsets.only(right: 2),
                              child: Icon(Icons.check, size: 9, color: Color(0xFF5F765E)),
                            ),
                          Text(
                            tier['code']!,
                            style: VocarioTokens.monoSmall.copyWith(
                              fontSize: 9,
                              color: isComplete
                                  ? const Color(0xFF5F765E)
                                  : (isActive ? VocarioTokens.brand : VocarioTokens.muted),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        tier['progress']!,
                        style: VocarioTokens.monoSmall.copyWith(
                          fontSize: 7,
                          color: isComplete
                              ? const Color(0xFF5F765E)
                              : VocarioTokens.muted,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // 5. VISUAL ARENA CHALLENGE POD
  // ==========================================================================
  Widget _buildVisualArenaSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'THỬ THÁCH MỖI NGÀY',
                  style: VocarioTokens.monoSmall.copyWith(
                    fontSize: 8,
                    color: VocarioTokens.brand,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Khám phá bối cảnh đời thật',
                  style: VocarioTokens.serifHeadline.copyWith(fontSize: 16),
                ),
              ],
            ),
            Text(
              '60 GIÂY',
              style: VocarioTokens.monoSmall.copyWith(
                fontSize: 9,
                color: VocarioTokens.muted,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          height: 174,
          width: double.infinity,
          decoration: BoxDecoration(
            color: const Color(0xFFE0D7CB),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFD5CBBE)),
          ),
          child: Stack(
            children: [
              // Desk Image
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.network(
                  'https://images.unsplash.com/photo-1747336754882-dfa5c49f15da?auto=format&fit=crop&w=900&q=82',
                  fit: BoxFit.cover,
                  width: double.infinity,
                  height: double.infinity,
                  errorBuilder: (context, error, stackTrace) => Container(
                    color: const Color(0xFFD8D0C3),
                    alignment: Alignment.center,
                    child: const Icon(Icons.image_outlined, size: 36, color: VocarioTokens.muted),
                  ),
                ),
              ),
              // Dark gradient overlay
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      VocarioTokens.ink.withValues(alpha: 0.85),
                    ],
                    stops: const [0.3, 1.0],
                  ),
                ),
              ),
              // L-brackets focus corners
              _buildCornerBracket(top: 12, left: 12, isTop: true, isLeft: true),
              _buildCornerBracket(top: 12, right: 12, isTop: true, isLeft: false),
              _buildCornerBracket(bottom: 12, left: 12, isTop: false, isLeft: true),
              _buildCornerBracket(bottom: 12, right: 12, isTop: false, isLeft: false),
              // AI Detection Bounding Box Tag
              Positioned(
                top: 20,
                right: 32,
                child: Container(
                  width: 76,
                  height: 60,
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.white.withValues(alpha: 0.88)),
                  ),
                  child: Stack(
                    clipBehavior: Clip.none,
                    children: [
                      Positioned(
                        top: -9,
                        left: -1,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                          color: Colors.white.withValues(alpha: 0.9),
                          child: Text(
                            'study lamp',
                            style: VocarioTokens.monoSmall.copyWith(
                              fontSize: 7,
                              color: VocarioTokens.ink,
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        top: -9,
                        right: -1,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 2),
                          color: VocarioTokens.goldAccent,
                          child: Text(
                            '95%',
                            style: VocarioTokens.monoSmall.copyWith(
                              fontSize: 6.5,
                              color: VocarioTokens.ink,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // Bottom Title & CTA
              Positioned(
                left: 15,
                right: 15,
                bottom: 13,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'ĐẤU TRƯỜNG THỊ GIÁC TUẦN',
                          style: VocarioTokens.monoSmall.copyWith(
                            fontSize: 7,
                            color: Colors.white.withValues(alpha: 0.75),
                            letterSpacing: 0.8,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          'Góc học tập & bàn làm việc',
                          style: VocarioTokens.serifHeadline.copyWith(
                            fontSize: 13.5,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    ElevatedButton(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const ArenaScreen(initialStageId: 'stage-admin-desk'),
                        ),
                      ).then((_) => _fetchDatabaseData()),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: VocarioTokens.ink,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(9),
                          side: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
                        ),
                      ),
                      child: Row(
                        children: const [
                          Text('Vào thi', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold)),
                          SizedBox(width: 4),
                          Icon(Icons.arrow_forward_rounded, size: 12),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCornerBracket({
    double? top,
    double? bottom,
    double? left,
    double? right,
    required bool isTop,
    required bool isLeft,
  }) {
    return Positioned(
      top: top,
      bottom: bottom,
      left: left,
      right: right,
      child: Container(
        width: 15,
        height: 15,
        decoration: BoxDecoration(
          border: Border(
            top: isTop ? BorderSide(color: Colors.white.withValues(alpha: 0.82), width: 1.5) : BorderSide.none,
            bottom: !isTop ? BorderSide(color: Colors.white.withValues(alpha: 0.82), width: 1.5) : BorderSide.none,
            left: isLeft ? BorderSide(color: Colors.white.withValues(alpha: 0.82), width: 1.5) : BorderSide.none,
            right: !isLeft ? BorderSide(color: Colors.white.withValues(alpha: 0.82), width: 1.5) : BorderSide.none,
          ),
        ),
      ),
    );
  }

  // ==========================================================================
  // 5. WEEKLY LEADERBOARD SECTION (KHỚP 100% WEB USERHOMECOMPONENT)
  // ==========================================================================
  Widget _buildWeeklyLeaderboardSection() {
    final topThree = [
      {
        'rank': 1,
        'name': 'Minh Hoàng',
        'level': 'B2',
        'streak': 7,
        'xp': 1420,
        'isMe': false,
      },
      {
        'rank': 2,
        'name': 'Phương Thảo',
        'level': 'A2',
        'streak': 5,
        'xp': 1280,
        'isMe': false,
      },
      {
        'rank': 3,
        'name': '$_userFullName (Bạn)',
        'level': _targetLevel,
        'streak': _streakCount,
        'xp': 960,
        'isMe': true,
      },
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'CỘNG ĐỒNG HỌC VIÊN',
                  style: VocarioTokens.monoSmall.copyWith(
                    fontSize: 8,
                    color: VocarioTokens.brand,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Xếp hạng tuần',
                  style: VocarioTokens.serifHeadline.copyWith(fontSize: 16),
                ),
              ],
            ),
            InkWell(
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const LeaderboardScreen()),
              ),
              child: Text(
                'TOP 3 →',
                style: VocarioTokens.monoSmall.copyWith(
                  fontSize: 9,
                  color: VocarioTokens.brand,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: VocarioTokens.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: VocarioTokens.border),
          ),
          child: Column(
            children: topThree.map((user) {
              final rank = user['rank'] as int;
              final isMe = user['isMe'] as bool;

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: rank == 1
                      ? const Color(0xFFFEF9C3).withValues(alpha: 0.35)
                      : VocarioTokens.field,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: rank == 1 ? VocarioTokens.goldAccent : VocarioTokens.border,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            color: rank == 1
                                ? VocarioTokens.goldAccent
                                : rank == 2
                                    ? const Color(0xFFE2E8F0)
                                    : const Color(0xFFFED7AA),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            '#$rank',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: rank == 1 ? VocarioTokens.ink : VocarioTokens.muted,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user['name'] as String,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: isMe ? VocarioTokens.brand : VocarioTokens.ink,
                              ),
                            ),
                            Text(
                              '${user['level']} · ${user['streak']} ngày chuỗi',
                              style: VocarioTokens.monoSmall.copyWith(
                                fontSize: 8.5,
                                color: VocarioTokens.muted,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    Text(
                      '${user['xp']} XP',
                      style: VocarioTokens.monoSmall.copyWith(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: VocarioTokens.brand,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildFooterSyncStatus() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            'VOCARIO',
            style: VocarioTokens.monoSmall.copyWith(
              fontSize: 8,
              color: VocarioTokens.brand,
              letterSpacing: 1.5,
            ),
          ),
          Row(
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  color: Color(0xFF10B981),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 5),
              Text(
                'Đồng bộ CSDL PostgreSQL 17',
                style: TextStyle(fontSize: 8, color: VocarioTokens.muted),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // 6. DOCKED BOTTOM NAVIGATION BAR
  // ==========================================================================
  Widget _buildBottomNav() {
    final navItems = [
      {'label': 'Trang chủ', 'icon': Icons.home_rounded},
      {'label': 'Thu nạp AI', 'icon': Icons.camera_alt_outlined},
      {'label': 'Sổ từ vựng', 'icon': Icons.book_outlined},
      {'label': 'Đấu trường', 'icon': Icons.emoji_events_outlined},
      {'label': 'Hồ sơ', 'icon': Icons.person_outline_rounded},
    ];

    return Container(
      height: 72,
      decoration: BoxDecoration(
        color: VocarioTokens.surface.withValues(alpha: 0.98),
        border: const Border(
          top: BorderSide(color: VocarioTokens.border, width: 1),
        ),
      ),
      child: Column(
        children: [
          Row(
            children: navItems.map((item) {
              final label = item['label'] as String;
              final icon = item['icon'] as IconData;
              final isActive = _activeNav == label;

              return Expanded(
                child: InkWell(
                  onTap: () {
                    if (label == 'Thu nạp AI') {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ScannerScreen()),
                      );
                      return;
                    }
                    if (label == 'Sổ từ vựng') {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const WordbookScreen(initialTabIndex: 0),
                        ),
                      ).then((_) => _fetchDatabaseData());
                      return;
                    }
                    if (label == 'Đấu trường') {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const ArenaScreen(),
                        ),
                      ).then((_) => _fetchDatabaseData());
                      return;
                    }
                    if (label == 'Hồ sơ') {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const ProfileScreen(),
                        ),
                      ).then((_) => _fetchDatabaseData());
                      return;
                    }
                    setState(() => _activeNav = label);
                    if (label != 'Trang chủ') {
                      _showToast('$label đang được chuẩn bị.');
                    }
                  },
                  child: SizedBox(
                    height: 58,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          icon,
                          size: 20,
                          color: isActive ? VocarioTokens.brand : VocarioTokens.muted,
                        ),
                        const SizedBox(height: 3),
                        Text(
                          label,
                          style: TextStyle(
                            fontSize: 8,
                            fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                            color: isActive ? VocarioTokens.brand : VocarioTokens.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          // Home Indicator Bar
          Container(
            width: 120,
            height: 3,
            decoration: BoxDecoration(
              color: VocarioTokens.ink.withValues(alpha: 0.75),
              borderRadius: BorderRadius.circular(999),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // 7. FLOATING TOAST NOTIFICATION
  // ==========================================================================
  Widget _buildFloatingToast() {
    return Positioned(
      top: 12,
      left: 18,
      right: 18,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: VocarioTokens.surface,
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: VocarioTokens.border),
          boxShadow: VocarioTokens.toastShadow,
        ),
        child: Row(
          children: [
            Container(
              width: 26,
              height: 26,
              decoration: BoxDecoration(
                color: VocarioTokens.brand.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check, size: 14, color: VocarioTokens.brand),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: Text(
                _toastMessage!,
                style: const TextStyle(fontSize: 10, color: VocarioTokens.ink, height: 1.4),
              ),
            ),
            GestureDetector(
              onTap: () => setState(() => _toastMessage = null),
              child: const Icon(Icons.close, size: 15, color: VocarioTokens.muted),
            ),
          ],
        ),
      ),
    );
  }
}

/// Custom painter vẽ đường nét địa hình hữu cơ chìm nhẹ trên thẻ Hero
class _HeroContourPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.08)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2;

    final path1 = Path()
      ..moveTo(size.width * 0.6, -20)
      ..quadraticBezierTo(size.width * 0.45, size.height * 0.35, size.width * 0.7, size.height * 0.45)
      ..quadraticBezierTo(size.width * 0.95, size.height * 0.65, size.width * 0.75, size.height * 1.1);

    final path2 = Path()
      ..moveTo(size.width * 0.72, -18)
      ..quadraticBezierTo(size.width * 0.58, size.height * 0.38, size.width * 0.8, size.height * 0.5)
      ..quadraticBezierTo(size.width * 0.98, size.height * 0.72, size.width * 0.85, size.height * 1.15);

    canvas.drawPath(path1, paint);
    canvas.drawPath(path2, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

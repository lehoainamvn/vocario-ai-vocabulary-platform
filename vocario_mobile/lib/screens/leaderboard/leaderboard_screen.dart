import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/tokens.dart';
import '../../core/services/api_service.dart';
import '../wordbook/wordbook_screen.dart';
import '../arena/arena_screen.dart';

/// Mục học viên trên bảng xếp hạng (Khớp mô hình LeaderboardEntry của Web)
class LeaderboardUser {
  final int rank;
  final String userId;
  final String fullName;
  final String username;
  final String targetLevel;
  final int masteredWords;
  final int streakCount;
  final int xp;
  final bool isCurrentUser;

  const LeaderboardUser({
    required this.rank,
    required this.userId,
    required this.fullName,
    required this.username,
    required this.targetLevel,
    required this.masteredWords,
    required this.streakCount,
    required this.xp,
    this.isCurrentUser = false,
  });

  factory LeaderboardUser.fromJson(Map<String, dynamic> json, int defaultRank) {
    return LeaderboardUser(
      rank: (json['rank'] as num?)?.toInt() ?? defaultRank,
      userId: json['userId']?.toString() ?? json['id']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? json['userName']?.toString() ?? 'Học viên',
      username: json['username']?.toString() ?? 'learner',
      targetLevel: json['targetLevel']?.toString() ?? 'A2',
      masteredWords: (json['masteredWords'] as num?)?.toInt() ?? 0,
      streakCount: (json['streakCount'] as num?)?.toInt() ?? 0,
      xp: (json['xp'] as num?)?.toInt() ?? (json['totalXp'] as num?)?.toInt() ?? 0,
      isCurrentUser: json['isCurrentUser'] == true,
    );
  }
}

class LeaderboardScreen extends StatefulWidget {
  final String initialPeriod; // 'weekly' hoặc 'all-time'

  const LeaderboardScreen({super.key, this.initialPeriod = 'weekly'});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  String _activeTab = 'SM2'; // 'SM2' = Thẻ từ SM-2, 'ARENA' = Đấu trường tốc độ
  late String _selectedPeriod; // 'weekly' hoặc 'all-time'
  String _selectedLevel = 'ALL'; // 'ALL', 'A1', 'A2', 'B1', 'B2', 'C1'
  int _currentPage = 0;
  final int _pageSize = 10;
  int _totalPages = 1;
  int _totalElements = 5;
  bool _isLoading = true;

  List<LeaderboardUser> _rankedList = [];
  LeaderboardUser? _currentUserRank;
  String? _nextTargetSuggestion;

  // Dữ liệu Bảng xếp hạng Đấu trường Tốc độ
  List<Map<String, dynamic>> _arenaRecords = [];
  bool _isLoadingArena = false;
  String _selectedArenaStageId = 'stage-admin-kitchen';

  final List<Map<String, String>> _arenaOfficialStages = const [
    {'id': 'stage-admin-kitchen', 'title': 'Gian Bếp Đời Thực (Tuần)'},
    {'id': 'stage-admin-study', 'title': 'Góc Học Tập & Công Việc'},
    {'id': 'stage-admin-living', 'title': 'Phòng Khách Ấm Cúng'},
  ];

  final List<Map<String, String>> _cefrLevels = const [
    {'id': 'ALL', 'label': 'Tất cả'},
    {'id': 'A1', 'label': 'A1 · Khởi đầu'},
    {'id': 'A2', 'label': 'A2 · Sơ cấp'},
    {'id': 'B1', 'label': 'B1 · Giao tiếp'},
    {'id': 'B2', 'label': 'B2 · Độc lập'},
    {'id': 'C1', 'label': 'C1 · Nâng cao'},
  ];

  @override
  void initState() {
    super.initState();
    _selectedPeriod = widget.initialPeriod;
    _fetchLeaderboardData();
  }

  /// Đồng bộ trực tiếp từ Spring Boot API `/api/leaderboard`
  Future<void> _fetchLeaderboardData() async {
    setState(() => _isLoading = true);

    try {
      final res = await ApiService().getLeaderboard(
        period: _selectedPeriod,
        level: _selectedLevel,
        page: _currentPage,
        size: _pageSize,
      );

      final rankRes = await ApiService().getMyRank(period: _selectedPeriod);

      if (!mounted) return;

      if (res != null) {
        final topUsers = res['topUsers'] as List<dynamic>? ?? [];
        final podium = res['podium'] as List<dynamic>? ?? [];

        final all = <Map<String, dynamic>>[];
        for (final p in podium) {
          if (p is Map<String, dynamic>) all.add(p);
        }
        for (final u in topUsers) {
          if (u is Map<String, dynamic> && !all.any((item) => item['userId'] == u['userId'])) {
            all.add(u);
          }
        }

        all.sort((a, b) => ((a['rank'] as num?)?.toInt() ?? 99).compareTo((b['rank'] as num?)?.toInt() ?? 99));

        LeaderboardUser? currentUser;
        if (rankRes != null) {
          currentUser = LeaderboardUser.fromJson(rankRes, (rankRes['rank'] as num?)?.toInt() ?? 1);
        } else {
          try {
            currentUser = all.isNotEmpty
                ? all.asMap().entries
                    .map((e) => LeaderboardUser.fromJson(e.value, e.key + 1))
                    .firstWhere((u) => u.isCurrentUser)
                : null;
          } catch (_) {
            currentUser = null;
          }
        }

        if (currentUser == null) {
          final user = await ApiService().getUserProfile();
          if (user != null) {
            currentUser = LeaderboardUser(
              rank: 0,
              userId: user['id']?.toString() ?? '',
              fullName: user['fullName'] ?? user['username'] ?? 'Học viên Vocario',
              username: user['username'] ?? '',
              targetLevel: user['targetLevel'] ?? 'A2',
              masteredWords: 0,
              streakCount: (user['streakCount'] as num?)?.toInt() ?? 0,
              xp: 0,
              isCurrentUser: true,
            );
          }
        }

        final nextTarget = res['nextTarget'] as Map<String, dynamic>?;

        setState(() {
          _rankedList = all.isNotEmpty
              ? all.asMap().entries.map((e) => LeaderboardUser.fromJson(e.value, e.key + 1)).toList()
              : [];
          _currentUserRank = currentUser;
          _nextTargetSuggestion = nextTarget?['suggestion']?.toString() ??
              'Duy trì chuỗi ôn tập thẻ và thi đấu Arena để thăng hạng trong tuần này.';

          _totalPages = (res['totalPages'] as num?)?.toInt() ?? 1;
          _totalElements = (res['totalElements'] as num?)?.toInt() ?? _rankedList.length;
          _isLoading = false;
        });
      } else {
        final user = await ApiService().getUserProfile();
        setState(() {
          _rankedList = [];
          if (user != null) {
            _currentUserRank = LeaderboardUser(
              rank: 0,
              userId: user['id']?.toString() ?? '',
              fullName: user['fullName'] ?? user['username'] ?? 'Học viên Vocario',
              username: user['username'] ?? '',
              targetLevel: user['targetLevel'] ?? 'A2',
              masteredWords: 0,
              streakCount: (user['streakCount'] as num?)?.toInt() ?? 0,
              xp: 0,
              isCurrentUser: true,
            );
          } else {
            _currentUserRank = null;
          }
          _nextTargetSuggestion = null;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _rankedList = [];
          _currentUserRank = null;
          _nextTargetSuggestion = null;
          _isLoading = false;
        });
      }
    }
  }

  /// Đồng bộ trực tiếp từ Spring Boot API `/api/arena/stages/{stageId}/leaderboard`
  Future<void> _fetchArenaLeaderboard() async {
    setState(() => _isLoadingArena = true);
    try {
      final res = await ApiService().getStageLeaderboard(
        _selectedArenaStageId,
        period: _selectedPeriod == 'weekly' ? 'weekly' : 'all',
      );
      if (mounted) {
        setState(() {
          _arenaRecords = res.map((e) => e is Map<String, dynamic> ? e : <String, dynamic>{}).toList();
          _isLoadingArena = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingArena = false);
    }
  }

  String _getInitials(String name) {
    final parts = name.trim().split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return 'HV';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VocarioTokens.canvas,
      body: SafeArea(
        child: Column(
          children: [
            _buildTopAppBar(),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _fetchLeaderboardData,
                color: VocarioTokens.brand,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header & Description
                      Text(
                        'ACADEMIC HONORS · BẢNG VINH DANH HỌC TẬP',
                        style: VocarioTokens.monoSmall.copyWith(
                          fontSize: 8.5,
                          color: VocarioTokens.brand,
                          letterSpacing: 1.0,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Bảng xếp hạng học viên xuất sắc',
                        style: VocarioTokens.serifHeadline.copyWith(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Tôn vinh nỗ lực ghi nhớ bền bỉ và khả năng làm chủ từ vựng theo chu kỳ giãn cách SuperMemo SM-2.',
                        style: TextStyle(fontSize: 11, color: VocarioTokens.muted, height: 1.4),
                      ),
                      const SizedBox(height: 16),

                      // Mode Switcher: SM-2 vs Đấu trường Tốc độ
                      _buildMainTabSwitcher(),
                      const SizedBox(height: 14),

                      if (_activeTab == 'SM2') ...[
                        // Period Switcher Bar (Tuần này / Toàn thời gian)
                        _buildPeriodSwitcher(),
                        const SizedBox(height: 14),

                        // Personal Record Card (Thành tích của bạn)
                        _buildPersonalRecordCard(),
                        const SizedBox(height: 18),

                        // CEFR Horizontal Filter Pills
                        _buildCefrFilterPills(),
                        const SizedBox(height: 12),

                        // Honors Ledger Table
                        _buildHonorsLedgerTable(),
                        const SizedBox(height: 14),

                        // Pagination Controls
                        if (_totalPages > 1) _buildPaginationControls(),

                        const SizedBox(height: 18),
                        // Scoring Mechanics Card
                        _buildScoringMechanicsCard(),
                      ] else ...[
                        // Period Switcher Bar
                        _buildPeriodSwitcher(),
                        const SizedBox(height: 14),

                        // Arena Stage Selector
                        _buildArenaStageSelector(),
                        const SizedBox(height: 16),

                        // Arena Speedrun Podium
                        _buildArenaSpeedrunPodium(),
                        const SizedBox(height: 16),

                        // Arena Honors Ledger Table
                        _buildArenaHonorsLedgerTable(),
                        const SizedBox(height: 16),

                        // Arena Action Card
                        _buildArenaActionCard(),
                      ],
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================================================
  // TOP BAR
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
                    'CỘNG ĐỒNG VOCARIO',
                    style: VocarioTokens.monoSmall.copyWith(fontSize: 7.5, color: VocarioTokens.brand),
                  ),
                  Text(
                    'Bảng vinh danh',
                    style: VocarioTokens.serifHeadline.copyWith(fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: VocarioTokens.field,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: VocarioTokens.border),
            ),
            child: Row(
              children: [
                const Icon(Icons.emoji_events_rounded, size: 13, color: VocarioTokens.brand),
                const SizedBox(width: 4),
                Text(
                  _selectedPeriod == 'weekly' ? 'Tuần này' : 'Toàn bộ',
                  style: VocarioTokens.monoSmall.copyWith(fontSize: 9, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // 1. PERIOD SWITCHER (TUẦN NÀY / TOÀN THỜI GIAN)
  // ==========================================================================
  Widget _buildPeriodSwitcher() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: VocarioTokens.field,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: VocarioTokens.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildPeriodTab(
              title: 'Tuần này',
              periodKey: 'weekly',
            ),
          ),
          Expanded(
            child: _buildPeriodTab(
              title: 'Toàn thời gian',
              periodKey: 'all-time',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodTab({required String title, required String periodKey}) {
    final isSelected = _selectedPeriod == periodKey;
    return InkWell(
      onTap: () {
        if (_selectedPeriod != periodKey) {
          setState(() {
            _selectedPeriod = periodKey;
            _currentPage = 0;
          });
          if (_activeTab == 'ARENA') {
            _fetchArenaLeaderboard();
          } else {
            _fetchLeaderboardData();
          }
        }
      },
      borderRadius: BorderRadius.circular(8),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? VocarioTokens.surface : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isSelected ? VocarioTokens.cardShadow : null,
        ),
        alignment: Alignment.center,
        child: Text(
          title,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? VocarioTokens.ink : VocarioTokens.muted,
          ),
        ),
      ),
    );
  }

  // ==========================================================================
  // 2. PERSONAL RECORD CARD (THÀNH TÍCH CỦA BẠN)
  // ==========================================================================
  Widget _buildPersonalRecordCard() {
    final me = _currentUserRank;
    if (me == null) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
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
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: VocarioTokens.brand,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      _getInitials(me.fullName),
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'HỒ SƠ CỦA BẠN',
                        style: VocarioTokens.monoSmall.copyWith(fontSize: 7.5, color: VocarioTokens.muted),
                      ),
                      Text(
                        me.fullName,
                        style: VocarioTokens.serifHeadline.copyWith(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Mục tiêu ${me.targetLevel}',
                        style: TextStyle(fontSize: 10, color: VocarioTokens.muted),
                      ),
                    ],
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'HẠNG HIỆN TẠI',
                    style: VocarioTokens.monoSmall.copyWith(fontSize: 7.5, color: VocarioTokens.muted),
                  ),
                  Text(
                    me.rank > 0 ? '#${me.rank}' : '—',
                    style: VocarioTokens.serifHeadline.copyWith(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: VocarioTokens.brand,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: VocarioTokens.border),
          const SizedBox(height: 12),

          // 3 KPI Metrics
          Row(
            children: [
              Expanded(child: _buildPersonalKpi('TỔNG TÍCH LŨY', '${me.xp} XP')),
              Expanded(child: _buildPersonalKpi('ĐÃ THUẦN THỤC', '${me.masteredWords} từ')),
              Expanded(child: _buildPersonalKpi('CHUỖI STREAK', '${me.streakCount} ngày')),
            ],
          ),
          const SizedBox(height: 12),

          // Suggestion Callout Banner
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: VocarioTokens.field,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: VocarioTokens.border),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.auto_awesome_rounded, size: 14, color: VocarioTokens.brand),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _nextTargetSuggestion ?? 'Duy trì chuỗi ôn tập thẻ để thăng hạng trong tuần này.',
                    style: TextStyle(fontSize: 10.5, color: VocarioTokens.ink, height: 1.4),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Action Buttons: Ôn Flashcard & Vào Đấu trường
          Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 36,
                  child: ElevatedButton(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const WordbookScreen(initialTabIndex: 1)),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: VocarioTokens.brand,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Ôn Flashcard ngay', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: SizedBox(
                  height: 36,
                  child: OutlinedButton(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ArenaScreen()),
                    ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: VocarioTokens.ink,
                      side: const BorderSide(color: VocarioTokens.border),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: const Text('Vào Đấu trường', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPersonalKpi(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: VocarioTokens.monoSmall.copyWith(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: VocarioTokens.ink,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(fontSize: 8.5, color: VocarioTokens.muted),
        ),
      ],
    );
  }

  // ==========================================================================
  // 3. CEFR FILTER PILLS
  // ==========================================================================
  Widget _buildCefrFilterPills() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Row(
        children: _cefrLevels.map((lvl) {
          final isSelected = _selectedLevel == lvl['id'];
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: InkWell(
              onTap: () {
                setState(() {
                  _selectedLevel = lvl['id']!;
                  _currentPage = 0;
                });
                _fetchLeaderboardData();
              },
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
                decoration: BoxDecoration(
                  color: isSelected ? VocarioTokens.brand : VocarioTokens.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected ? VocarioTokens.brand : VocarioTokens.border,
                  ),
                ),
                child: Text(
                  lvl['label']!,
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    color: isSelected ? Colors.white : VocarioTokens.ink,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // ==========================================================================
  // 4. HONORS LEDGER TABLE
  // ==========================================================================
  Widget _buildHonorsLedgerTable() {
    if (_isLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 40),
        child: Center(child: CircularProgressIndicator(color: VocarioTokens.brand, strokeWidth: 2)),
      );
    }

    if (_rankedList.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(28),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: VocarioTokens.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: VocarioTokens.border),
        ),
        child: Column(
          children: [
            const Icon(Icons.emoji_events_outlined, size: 36, color: VocarioTokens.muted),
            const SizedBox(height: 8),
            Text(
              'Chưa có học viên nào ở phân nhóm $_selectedLevel',
              style: VocarioTokens.serifHeadline.copyWith(fontSize: 13.5, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Hãy là người đầu tiên đặt mục tiêu trình độ này để ghi tên lên bảng vinh danh!',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 10.5, color: VocarioTokens.muted),
            ),
          ],
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: VocarioTokens.border),
        boxShadow: VocarioTokens.cardShadow,
      ),
      child: Column(
        children: [
          // Table Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: const BoxDecoration(
              color: Color(0xFFF6F3EE),
              borderRadius: BorderRadius.vertical(top: Radius.circular(9)),
              border: Border(bottom: BorderSide(color: VocarioTokens.border)),
            ),
            child: Row(
              children: [
                Expanded(
                  flex: 5,
                  child: Text('THỨ HẠNG / HỌC VIÊN', style: VocarioTokens.monoSmall.copyWith(fontSize: 8, color: VocarioTokens.muted)),
                ),
                Expanded(
                  flex: 2,
                  child: Text('CẤP ĐỘ', textAlign: TextAlign.center, style: VocarioTokens.monoSmall.copyWith(fontSize: 8, color: VocarioTokens.muted)),
                ),
                Expanded(
                  flex: 3,
                  child: Text('TỪ THUỘC', textAlign: TextAlign.center, style: VocarioTokens.monoSmall.copyWith(fontSize: 8, color: VocarioTokens.muted)),
                ),
                Expanded(
                  flex: 3,
                  child: Text('TỔNG XP', textAlign: TextAlign.right, style: VocarioTokens.monoSmall.copyWith(fontSize: 8, color: VocarioTokens.muted)),
                ),
              ],
            ),
          ),

          // Table Rows
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _rankedList.length,
            separatorBuilder: (context, index) => const Divider(height: 1, color: VocarioTokens.border),
            itemBuilder: (context, index) {
              final item = _rankedList[index];
              return _buildRankRow(item);
            },
          ),

          // Table Footer
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: const BoxDecoration(
              color: Color(0xFFFAF8F5),
              borderRadius: BorderRadius.vertical(bottom: Radius.circular(9)),
              border: Border(top: BorderSide(color: VocarioTokens.border)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Hiển thị ${_rankedList.length} học viên dẫn đầu',
                  style: TextStyle(fontSize: 9.5, color: VocarioTokens.muted),
                ),
                Row(
                  children: [
                    Container(width: 5, height: 5, decoration: const BoxDecoration(color: Color(0xFF10B981), shape: BoxShape.circle)),
                    const SizedBox(width: 4),
                    Text('Thời gian thực', style: VocarioTokens.monoSmall.copyWith(fontSize: 8, color: VocarioTokens.muted)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRankRow(LeaderboardUser item) {
    return Container(
      color: item.isCurrentUser ? const Color(0xFFFEF9C3).withValues(alpha: 0.3) : Colors.transparent,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      child: Row(
        children: [
          // Rank & Avatar & Name
          Expanded(
            flex: 5,
            child: Row(
              children: [
                // Rank Badge
                SizedBox(
                  width: 24,
                  child: Text(
                    '#${item.rank}',
                    style: VocarioTokens.monoSmall.copyWith(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: item.rank == 1
                          ? const Color(0xFFB45309)
                          : item.rank == 2
                              ? const Color(0xFF475569)
                              : item.rank == 3
                                  ? const Color(0xFF9A3412)
                                  : VocarioTokens.ink,
                    ),
                  ),
                ),
                const SizedBox(width: 4),
                // Avatar
                Container(
                  width: 24,
                  height: 24,
                  decoration: BoxDecoration(
                    color: item.isCurrentUser ? VocarioTokens.brand : const Color(0xFFEAE5DC),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    _getInitials(item.fullName),
                    style: TextStyle(
                      fontSize: 8.5,
                      fontWeight: FontWeight.bold,
                      color: item.isCurrentUser ? Colors.white : VocarioTokens.brand,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.fullName,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.bold,
                          color: item.isCurrentUser ? VocarioTokens.brand : VocarioTokens.ink,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        '@${item.username}${item.isCurrentUser ? ' · Bạn' : ''}',
                        style: TextStyle(fontSize: 8.5, color: VocarioTokens.muted),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Cấp độ
          Expanded(
            flex: 2,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                decoration: BoxDecoration(
                  color: VocarioTokens.field,
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: VocarioTokens.border),
                ),
                child: Text(
                  item.targetLevel,
                  style: VocarioTokens.monoSmall.copyWith(fontSize: 8.5, fontWeight: FontWeight.bold, color: VocarioTokens.ink),
                ),
              ),
            ),
          ),

          // Từ đã thuộc
          Expanded(
            flex: 3,
            child: Center(
              child: Text(
                '${item.masteredWords} từ',
                style: const TextStyle(fontSize: 10, color: VocarioTokens.ink),
              ),
            ),
          ),

          // Tổng XP
          Expanded(
            flex: 3,
            child: Text(
              '${item.xp} XP',
              textAlign: TextAlign.right,
              style: VocarioTokens.monoSmall.copyWith(
                fontSize: 10.5,
                fontWeight: FontWeight.bold,
                color: VocarioTokens.brand,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaginationControls() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          'Trang ${_currentPage + 1} / $_totalPages · $_totalElements học viên',
          style: TextStyle(fontSize: 10, color: VocarioTokens.muted),
        ),
        Row(
          children: [
            IconButton(
              onPressed: _currentPage > 0
                  ? () {
                      setState(() => _currentPage--);
                      _fetchLeaderboardData();
                    }
                  : null,
              icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 12),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
            ),
            IconButton(
              onPressed: _currentPage < _totalPages - 1
                  ? () {
                      setState(() => _currentPage++);
                      _fetchLeaderboardData();
                    }
                  : null,
              icon: const Icon(Icons.arrow_forward_ios_rounded, size: 12),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildScoringMechanicsCard() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: VocarioTokens.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'QUY CHUẨN TÍNH ĐIỂM EXP KINH NGHIỆM',
            style: VocarioTokens.monoSmall.copyWith(fontSize: 8, color: VocarioTokens.brand),
          ),
          const SizedBox(height: 6),
          Text(
            '• Ôn Flashcard SM-2 đạt 3-5 sao: +15 XP / lượt.\n'
            '• Đấu trường 60s tìm đúng vật thể: +25 XP + combo tốc độ.\n'
            '• Duy trì chuỗi Streak mỗi ngày: Nhận thưởng nhân hệ số chuyên cần.',
            style: TextStyle(fontSize: 10.5, color: VocarioTokens.muted, height: 1.5),
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // ARENA SPEEDRUN LEADERBOARD WIDGETS
  // ==========================================================================
  Widget _buildMainTabSwitcher() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: VocarioTokens.field,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: VocarioTokens.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: _buildMainTabItem(
              title: 'Thẻ Từ SM-2',
              subtitle: 'Điểm tích lũy XP',
              tabKey: 'SM2',
              icon: Icons.layers_outlined,
            ),
          ),
          Expanded(
            child: _buildMainTabItem(
              title: 'Đấu Trường Tốc Độ',
              subtitle: 'Kỷ lục Speedrun',
              tabKey: 'ARENA',
              icon: Icons.speed_rounded,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMainTabItem({
    required String title,
    required String subtitle,
    required String tabKey,
    required IconData icon,
  }) {
    final isSelected = _activeTab == tabKey;
    return InkWell(
      onTap: () {
        if (_activeTab != tabKey) {
          setState(() => _activeTab = tabKey);
          if (tabKey == 'ARENA') {
            _fetchArenaLeaderboard();
          } else {
            _fetchLeaderboardData();
          }
        }
      },
      borderRadius: BorderRadius.circular(8),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
        decoration: BoxDecoration(
          color: isSelected ? VocarioTokens.surface : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isSelected ? VocarioTokens.cardShadow : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 16,
              color: isSelected ? VocarioTokens.brand : VocarioTokens.muted,
            ),
            const SizedBox(width: 6),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    color: isSelected ? VocarioTokens.ink : VocarioTokens.muted,
                  ),
                ),
                Text(
                  subtitle,
                  style: VocarioTokens.monoSmall.copyWith(
                    fontSize: 8,
                    color: isSelected ? VocarioTokens.brand : VocarioTokens.muted,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildArenaStageSelector() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: VocarioTokens.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.stadium_outlined, size: 16, color: VocarioTokens.brand),
          const SizedBox(width: 8),
          const Text(
            'Phòng thi đấu: ',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: VocarioTokens.ink),
          ),
          Expanded(
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedArenaStageId,
                isExpanded: true,
                icon: const Icon(Icons.keyboard_arrow_down_rounded, size: 18, color: VocarioTokens.muted),
                style: const TextStyle(fontSize: 11, color: VocarioTokens.brand, fontWeight: FontWeight.w600),
                items: _arenaOfficialStages.map((s) {
                  return DropdownMenuItem<String>(
                    value: s['id']!,
                    child: Text(s['title']!, overflow: TextOverflow.ellipsis),
                  );
                }).toList(),
                onChanged: (val) {
                  if (val != null && val != _selectedArenaStageId) {
                    setState(() => _selectedArenaStageId = val);
                    _fetchArenaLeaderboard();
                  }
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildArenaSpeedrunPodium() {
    if (_isLoadingArena) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: CircularProgressIndicator(color: VocarioTokens.brand, strokeWidth: 2)),
      );
    }

    if (_arenaRecords.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        decoration: BoxDecoration(
          color: VocarioTokens.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: VocarioTokens.border),
        ),
        alignment: Alignment.center,
        child: Column(
          children: [
            const Icon(Icons.timer_off_outlined, size: 32, color: VocarioTokens.muted),
            const SizedBox(height: 8),
            const Text(
              'Chưa có kỷ lục trong khoảng thời gian này',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: VocarioTokens.ink),
            ),
            const SizedBox(height: 4),
            Text(
              'Hãy là người đầu tiên thiết lập kỷ lục tốc độ phản xạ trên đấu trường!',
              style: TextStyle(fontSize: 10.5, color: VocarioTokens.muted),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    final top3 = _arenaRecords.take(3).toList();

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        // #2 Bạc
        Expanded(
          child: top3.length > 1
              ? _buildArenaPodiumCard(top3[1], rank: 2, height: 135, badgeColor: const Color(0xFFC0C0C0))
              : const SizedBox.shrink(),
        ),
        const SizedBox(width: 8),
        // #1 Vàng
        Expanded(
          child: _buildArenaPodiumCard(top3[0], rank: 1, height: 155, badgeColor: VocarioTokens.goldAccent),
        ),
        const SizedBox(width: 8),
        // #3 Đồng
        Expanded(
          child: top3.length > 2
              ? _buildArenaPodiumCard(top3[2], rank: 3, height: 120, badgeColor: const Color(0xFFCD7F32))
              : const SizedBox.shrink(),
        ),
      ],
    );
  }

  Widget _buildArenaPodiumCard(
    Map<String, dynamic> record, {
    required int rank,
    required double height,
    required Color badgeColor,
  }) {
    final name = record['userName']?.toString() ?? 'Học viên';
    final completionMs = (record['completionTimeMs'] as num?)?.toInt() ?? 0;
    final timeStr = _formatMs(completionMs);
    final acc = (record['accuracyPct'] as num?)?.toDouble() ?? 100.0;
    final combo = (record['maxCombo'] as num?)?.toInt() ?? 1;

    return Container(
      height: height,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: rank == 1 ? VocarioTokens.goldAccent : VocarioTokens.border, width: rank == 1 ? 1.5 : 1.0),
        boxShadow: rank == 1 ? VocarioTokens.cardShadow : null,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: badgeColor.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: badgeColor, width: 1),
            ),
            child: Text(
              '#$rank',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: badgeColor),
            ),
          ),
          Text(
            name,
            style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: VocarioTokens.ink),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            timeStr,
            style: VocarioTokens.monoSmall.copyWith(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: rank == 1 ? VocarioTokens.brand : VocarioTokens.ink,
            ),
          ),
          Text(
            '${acc.toStringAsFixed(0)}% · $combo x combo',
            style: TextStyle(fontSize: 8.5, color: VocarioTokens.muted),
          ),
        ],
      ),
    );
  }

  Widget _buildArenaHonorsLedgerTable() {
    if (_isLoadingArena || _arenaRecords.isEmpty) return const SizedBox.shrink();

    return Container(
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: VocarioTokens.border),
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: VocarioTokens.field,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
              border: const Border(bottom: BorderSide(color: VocarioTokens.border)),
            ),
            child: Row(
              children: const [
                SizedBox(width: 28, child: Text('#', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: VocarioTokens.muted))),
                Expanded(child: Text('HỌC VIÊN', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: VocarioTokens.muted))),
                SizedBox(width: 60, child: Text('THỜI GIAN', textAlign: TextAlign.right, style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: VocarioTokens.muted))),
                SizedBox(width: 50, child: Text('CHÍNH XÁC', textAlign: TextAlign.right, style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: VocarioTokens.muted))),
              ],
            ),
          ),
          // Rows
          ..._arenaRecords.asMap().entries.map((entry) {
            final idx = entry.key;
            final r = entry.value;
            final isCurrentUser = r['isCurrentUser'] == true;
            final name = r['userName']?.toString() ?? 'Học viên';
            final ms = (r['completionTimeMs'] as num?)?.toInt() ?? 0;
            final acc = (r['accuracyPct'] as num?)?.toDouble() ?? 100.0;

            return Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: isCurrentUser ? VocarioTokens.brand.withValues(alpha: 0.06) : Colors.transparent,
                border: const Border(bottom: BorderSide(color: VocarioTokens.border, width: 0.5)),
              ),
              child: Row(
                children: [
                  SizedBox(
                    width: 28,
                    child: Text(
                      '#${idx + 1}',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: idx == 0 ? VocarioTokens.goldAccent : VocarioTokens.muted,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      '$name${isCurrentUser ? ' (Bạn)' : ''}',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: isCurrentUser ? FontWeight.bold : FontWeight.w500,
                        color: isCurrentUser ? VocarioTokens.brand : VocarioTokens.ink,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  SizedBox(
                    width: 60,
                    child: Text(
                      _formatMs(ms),
                      textAlign: TextAlign.right,
                      style: VocarioTokens.monoSmall.copyWith(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: idx == 0 ? VocarioTokens.brand : VocarioTokens.ink,
                      ),
                    ),
                  ),
                  SizedBox(
                    width: 50,
                    child: Text(
                      '${acc.toStringAsFixed(0)}%',
                      textAlign: TextAlign.right,
                      style: TextStyle(fontSize: 10, color: VocarioTokens.muted),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildArenaActionCard() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: VocarioTokens.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Sẵn sàng phá kỷ lục tốc độ?',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: VocarioTokens.ink),
                ),
                const SizedBox(height: 2),
                Text(
                  'Thi đấu trên đấu trường thị giác và ghi danh vào bảng vinh danh.',
                  style: TextStyle(fontSize: 10, color: VocarioTokens.muted),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          ElevatedButton.icon(
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => ArenaScreen(initialStageId: _selectedArenaStageId)),
            ).then((_) => _fetchArenaLeaderboard()),
            icon: const Icon(Icons.flash_on_rounded, size: 14),
            label: const Text('Thi đấu ngay', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: VocarioTokens.brand,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ],
      ),
    );
  }

  String _formatMs(num? ms) {
    if (ms == null || ms <= 0) return '--.--s';
    final sec = ms / 1000.0;
    return '${sec.toStringAsFixed(2)}s';
  }
}

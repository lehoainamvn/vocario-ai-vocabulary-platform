import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../../core/constants/tokens.dart';
import '../../core/services/api_service.dart';
import '../leaderboard/leaderboard_screen.dart';
import '../scanner/scanner_screen.dart';

/// Dữ liệu một vật thể trong đấu trường thị giác
class ArenaWord {
  final String id;
  final String word;
  final String ipa;
  final String vietnamese;
  final String level;
  final String partOfSpeech;
  final double topPercent;
  final double leftPercent;
  final double widthPercent;
  final double heightPercent;

  const ArenaWord({
    required this.id,
    required this.word,
    required this.ipa,
    required this.vietnamese,
    required this.level,
    this.partOfSpeech = 'noun',
    required this.topPercent,
    required this.leftPercent,
    required this.widthPercent,
    required this.heightPercent,
  });

  factory ArenaWord.fromJson(Map<String, dynamic> json, int index) {
    final box = json['box'] ?? json['coordinates'];
    double top = 20.0 + (index * 14) % 55;
    double left = 15.0 + (index * 18) % 65;
    double width = 25.0;
    double height = 18.0;

    if (json['topPercent'] != null) {
      top = (json['topPercent'] as num).toDouble();
      left = (json['leftPercent'] as num?)?.toDouble() ?? left;
      width = (json['widthPercent'] as num?)?.toDouble() ?? width;
      height = (json['heightPercent'] as num?)?.toDouble() ?? height;
    } else if (box is Map<String, dynamic>) {
      top = (box['top'] as num?)?.toDouble() ?? top;
      left = (box['left'] as num?)?.toDouble() ?? left;
      width = (box['width'] as num?)?.toDouble() ?? width;
      height = (box['height'] as num?)?.toDouble() ?? height;
    } else if (box is List && box.length >= 4) {
      double b0 = (box[0] as num).toDouble();
      double b1 = (box[1] as num).toDouble();
      double b2 = (box[2] as num).toDouble();
      double b3 = (box[3] as num).toDouble();
      if (b0 <= 1.0 && b2 <= 1.0 && b1 <= 1.0 && b3 <= 1.0) {
        b0 *= 100;
        b1 *= 100;
        b2 *= 100;
        b3 *= 100;
      }
      top = b0;
      left = b1;
      width = (b2 - b1).abs();
      height = (b3 - b0).abs();
    }

    return ArenaWord(
      id: json['id']?.toString() ?? 'obj-$index',
      word: json['word']?.toString() ?? json['english']?.toString() ?? 'object',
      ipa: json['ipa']?.toString() ?? '/.../',
      vietnamese: json['vietnamese']?.toString() ?? json['meaning']?.toString() ?? 'vật thể đời sống',
      level: (json['level'] ?? json['cefr'] ?? 'A2').toString().toUpperCase(),
      partOfSpeech: json['partOfSpeech']?.toString() ?? 'noun',
      topPercent: top.clamp(5.0, 85.0),
      leftPercent: left.clamp(5.0, 85.0),
      widthPercent: width.clamp(10.0, 60.0),
      heightPercent: height.clamp(8.0, 60.0),
    );
  }
}

/// Dữ liệu một không gian đấu trường (Sân thi đấu)
class ArenaStage {
  final String id;
  final String title;
  final String subtitle;
  final String category;
  final String badge;
  final String imageUrl;
  final List<ArenaWord> words;
  final bool isOfficial;
  final bool isWeekly;
  final String bestRecordStr;
  final String bestRecordHolder;

  const ArenaStage({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.category,
    required this.badge,
    required this.imageUrl,
    required this.words,
    this.isOfficial = true,
    this.isWeekly = false,
    this.bestRecordStr = 'Chưa có kỷ lục',
    this.bestRecordHolder = 'Học viên',
  });

  ArenaStage copyWith({
    String? title,
    String? subtitle,
    String? bestRecordStr,
    String? bestRecordHolder,
    List<ArenaWord>? words,
  }) {
    return ArenaStage(
      id: id,
      title: title ?? this.title,
      subtitle: subtitle ?? this.subtitle,
      category: category,
      badge: badge,
      imageUrl: imageUrl,
      words: words ?? this.words,
      isOfficial: isOfficial,
      isWeekly: isWeekly,
      bestRecordStr: bestRecordStr ?? this.bestRecordStr,
      bestRecordHolder: bestRecordHolder ?? this.bestRecordHolder,
    );
  }
}

class ArenaScreen extends StatefulWidget {
  final String? initialStageId;

  const ArenaScreen({super.key, this.initialStageId});

  @override
  State<ArenaScreen> createState() => _ArenaScreenState();
}

class _ArenaScreenState extends State<ArenaScreen> with SingleTickerProviderStateMixin {
  // Trạng thái màn chơi (Tương đương 3 chế độ trên Web Angular)
  // 'SELECT_STAGE' -> 'PLAYING' -> 'VICTORY'
  String _gameMode = 'SELECT_STAGE';
  String _stageFilter = 'ADMIN'; // 'ADMIN' = Đấu trường hệ thống (Mặc định chuẩn Web), 'USER' = Ảnh của bạn

  // Danh sách các sàn đấu chính thức (Chuẩn hóa từ Web Vocario)
  List<ArenaStage> _officialStages = _buildDefaultOfficialStages();
  List<ArenaStage> _userStages = [];
  bool _isLoadingUserStages = false;

  // Sàn đấu đang được chọn & Hàng đợi câu hỏi xáo trộn
  ArenaStage? _currentStage;
  List<ArenaWord> _activeQueue = [];
  int _currentIndex = 0;
  final Set<String> _solvedIds = {};

  // Cơ chế tính điểm XP & Combo
  int _totalScore = 0;
  double _comboMultiplier = 1.0;
  double _maxCombo = 1.0;
  int _correctCount = 0;
  int _totalClicks = 0;
  int _lastEarnedXp = 0;

  // Speedrun Stopwatch & Phạt lỗi
  int _gameStartTimeMs = 0;
  int _elapsedTimeMs = 0;
  int _mistakeCount = 0;
  int _penaltyTimeMs = 0;
  Timer? _speedrunTimer;

  // Đồng hồ đếm ngược mỗi câu (15s)
  int _timerSeconds = 15;
  Timer? _roundTimer;

  // Tương tác trực quan & Báo lỗi/Thành công
  bool _isShowingSuccess = false;
  bool _isHintActive = false;
  ArenaWord? _wrongClickedWord;
  Offset? _missClickOffset;
  String? _missMessage;
  Timer? _missTimer;
  bool _isZoomed = false;
  bool _isSpeaking = false;
  bool _isSubmittingRun = false;

  // Kết quả lượt thi lưu về CSDL
  Map<String, dynamic>? _lastRunResult;
  String? _toastMessage;
  Timer? _toastTimer;

  @override
  void initState() {
    super.initState();
    _initOfficialStages();
    _loadUserStagesFromBackend();

    if (widget.initialStageId != null) {
      final offMatch = _officialStages.where((s) => s.id == widget.initialStageId);
      if (offMatch.isNotEmpty) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _startStage(offMatch.first);
        });
      }
    }
  }

  @override
  void dispose() {
    _roundTimer?.cancel();
    _speedrunTimer?.cancel();
    _missTimer?.cancel();
    _toastTimer?.cancel();
    super.dispose();
  }

  void _showToast(String message) {
    _toastTimer?.cancel();
    setState(() => _toastMessage = message);
    _toastTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) setState(() => _toastMessage = null);
    });
  }

  /// Khởi tạo các Đấu trường chuẩn hóa hệ thống (Khớp 100% web Angular QuizStageService)
  static List<ArenaStage> _buildDefaultOfficialStages() {
    return [
      // 1. Gian Bếp Đời Thực (Đấu trường tuần chính thức)
      const ArenaStage(
        id: 'stage-admin-kitchen',
        title: 'Gian Bếp Đời Thực',
        subtitle: 'Bối cảnh thi đấu chính thức tuần này dành cho toàn thể học viên',
        category: 'Đời Sống Gia Đình',
        badge: 'Đấu trường tuần',
        imageUrl: '/kitchen_refrigerator.png',
        isOfficial: true,
        isWeekly: true,
        words: [
          ArenaWord(
            id: 'k-1',
            word: 'refrigerator',
            ipa: '/rɪˈfrɪdʒəreɪtər/',
            vietnamese: 'tủ lạnh',
            level: 'A2',
            partOfSpeech: 'noun',
            topPercent: 24,
            leftPercent: 6,
            widthPercent: 32,
            heightPercent: 68,
          ),
          ArenaWord(
            id: 'k-2',
            word: 'gas stove',
            ipa: '/ˈɡæs stəʊv/',
            vietnamese: 'bếp ga nấu ăn',
            level: 'A2',
            partOfSpeech: 'noun',
            topPercent: 58,
            leftPercent: 62,
            widthPercent: 28,
            heightPercent: 25,
          ),
          ArenaWord(
            id: 'k-3',
            word: 'water bottle',
            ipa: '/ˈwɔːtər ˈbɒtl/',
            vietnamese: 'chai nước uống',
            level: 'A1',
            partOfSpeech: 'noun',
            topPercent: 54,
            leftPercent: 44,
            widthPercent: 12,
            heightPercent: 28,
          ),
          ArenaWord(
            id: 'k-4',
            word: 'cardboard box',
            ipa: '/ˈkɑːdbɔːd bɒks/',
            vietnamese: 'thùng các-tông đựng đồ',
            level: 'B1',
            partOfSpeech: 'noun',
            topPercent: 62,
            leftPercent: 78,
            widthPercent: 20,
            heightPercent: 34,
          ),
          ArenaWord(
            id: 'k-5',
            word: 'picture frame',
            ipa: '/ˈpɪktʃər freɪm/',
            vietnamese: 'khung tranh ảnh treo tường',
            level: 'A2',
            partOfSpeech: 'noun',
            topPercent: 8,
            leftPercent: 52,
            widthPercent: 20,
            heightPercent: 25,
          ),
        ],
      ),
      // 2. Góc Học Tập & Công Việc
      const ArenaStage(
        id: 'stage-admin-study',
        title: 'Góc Học Tập & Công Việc',
        subtitle: 'Bối cảnh bàn làm việc sáng tạo với đồ dùng học thuật chuẩn CEFR',
        category: 'Học Tập & Công Việc',
        badge: 'Đấu trường hệ thống',
        imageUrl: '/study_desk.png',
        isOfficial: true,
        isWeekly: false,
        words: [
          ArenaWord(
            id: 'sd-1',
            word: 'laptop',
            ipa: '/ˈlæptɒp/',
            vietnamese: 'máy tính xách tay',
            level: 'A1',
            partOfSpeech: 'noun',
            topPercent: 32,
            leftPercent: 34,
            widthPercent: 28,
            heightPercent: 26,
          ),
          ArenaWord(
            id: 'sd-2',
            word: 'desk lamp',
            ipa: '/ˈdesk læmp/',
            vietnamese: 'đèn học để bàn',
            level: 'A2',
            partOfSpeech: 'noun',
            topPercent: 12,
            leftPercent: 12,
            widthPercent: 18,
            heightPercent: 34,
          ),
          ArenaWord(
            id: 'sd-3',
            word: 'chair',
            ipa: '/tʃeər/',
            vietnamese: 'ghế ngồi làm việc',
            level: 'A1',
            partOfSpeech: 'noun',
            topPercent: 52,
            leftPercent: 38,
            widthPercent: 24,
            heightPercent: 44,
          ),
          ArenaWord(
            id: 'sd-4',
            word: 'notebook',
            ipa: '/ˈnəʊtbʊk/',
            vietnamese: 'sổ tay ghi chép',
            level: 'A1',
            partOfSpeech: 'noun',
            topPercent: 48,
            leftPercent: 66,
            widthPercent: 18,
            heightPercent: 20,
          ),
        ],
      ),
      // 3. Phòng Khách Ấm Cúng
      const ArenaStage(
        id: 'stage-admin-living',
        title: 'Phòng Khách Ấm Cúng',
        subtitle: 'Không gian sinh hoạt gia đình và tiếp đón bạn bè thân mật',
        category: 'Nội Thất & Tiện Nghi',
        badge: 'Đấu trường hệ thống',
        imageUrl: '/living_room.jpg',
        isOfficial: true,
        isWeekly: false,
        words: [
          ArenaWord(
            id: 'lr-1',
            word: 'sofa',
            ipa: '/ˈsəʊfə/',
            vietnamese: 'ghế sô-pha',
            level: 'A1',
            partOfSpeech: 'noun',
            topPercent: 48,
            leftPercent: 22,
            widthPercent: 52,
            heightPercent: 38,
          ),
          ArenaWord(
            id: 'lr-2',
            word: 'coffee table',
            ipa: '/ˈkɒfi ˈteɪbl/',
            vietnamese: 'bàn trà phòng khách',
            level: 'A2',
            partOfSpeech: 'noun',
            topPercent: 66,
            leftPercent: 34,
            widthPercent: 32,
            heightPercent: 24,
          ),
          ArenaWord(
            id: 'lr-3',
            word: 'indoor plant',
            ipa: '/ˈɪndɔː plɑːnt/',
            vietnamese: 'chậu cây cảnh trong nhà',
            level: 'A2',
            partOfSpeech: 'noun',
            topPercent: 36,
            leftPercent: 78,
            widthPercent: 16,
            heightPercent: 42,
          ),
        ],
      ),
    ];
  }

  void _initOfficialStages() {
    _officialStages = _buildDefaultOfficialStages();
  }

  /// Tải các ảnh bối cảnh người dùng chụp từ bảng `captures`
  Future<void> _loadUserStagesFromBackend() async {
    setState(() => _isLoadingUserStages = true);
    try {
      final rawCaptures = await ApiService().getUserCaptures();
      final List<ArenaStage> loaded = [];

      for (int i = 0; i < rawCaptures.length; i++) {
        final c = rawCaptures[i];
        if (c is! Map<String, dynamic>) continue;

        final rawObjs = c['detectedObjects'];
        List<dynamic> detectedList = [];

        if (rawObjs is List) {
          detectedList = rawObjs;
        } else if (rawObjs is String && rawObjs.trim().isNotEmpty) {
          try {
            detectedList = jsonDecode(rawObjs);
          } catch (_) {}
        }

        final words = detectedList.asMap().entries.map((e) {
          if (e.value is Map<String, dynamic>) {
            return ArenaWord.fromJson(e.value as Map<String, dynamic>, e.key);
          }
          return ArenaWord.fromJson({}, e.key);
        }).where((w) => w.word.isNotEmpty && w.word != 'object').toList();

        if (words.isNotEmpty) {
          String imgUrl = (c['imageUrl'] ?? '').toString();
          if (imgUrl.startsWith('/')) {
            imgUrl = '${ApiService.defaultBaseUrl}$imgUrl';
          }

          final stageId = c['id']?.toString() ?? 'user-stage-$i';
          loaded.add(
            ArenaStage(
              id: stageId,
              title: c['sceneTheme']?.toString() ?? 'Bối cảnh đời thực #${i + 1}',
              subtitle: '${words.length} vật thể bóc tách từ ảnh thực tế của bạn',
              category: 'Bộ Sưu Tập Của Bạn',
              badge: 'Ảnh của bạn',
              imageUrl: imgUrl,
              words: words,
              isOfficial: false,
              bestRecordStr: 'Chưa có kỷ lục',
              bestRecordHolder: 'Bạn',
            ),
          );
        }
      }

      if (mounted) {
        setState(() {
          _userStages = loaded;
          _isLoadingUserStages = false;
        });
      }

      // Xử lý khi có initialStageId (ưu tiên tìm trong bối cảnh người dùng vừa tải từ CSDL hoặc đấu trường hệ thống)
      if (widget.initialStageId != null) {
        final userMatches = loaded.where((s) => s.id == widget.initialStageId);
        if (userMatches.isNotEmpty && mounted) {
          setState(() => _stageFilter = 'USER');
          _startStage(userMatches.first);
        } else {
          final offMatches = _officialStages.where((s) => s.id == widget.initialStageId);
          if (offMatches.isNotEmpty && mounted) {
            setState(() => _stageFilter = 'ADMIN');
            _startStage(offMatches.first);
          }
        }
      }

      // Tự động đồng bộ các kỷ lục phản xạ thật từ CSDL PostgreSQL
      _fetchRealLeaderboardRecords();
    } catch (_) {
      if (mounted) setState(() => _isLoadingUserStages = false);
    }
  }

  /// Truy vấn kỷ lục Top #1 thực tế từ CSDL PostgreSQL (bảng arena_stage_records) cho từng sàn đấu
  Future<void> _fetchRealLeaderboardRecords() async {
    // 1. Cập nhật kỷ lục thật cho Official Stages từ CSDL
    for (int i = 0; i < _officialStages.length; i++) {
      final st = _officialStages[i];
      try {
        final records = await ApiService().getStageLeaderboard(st.id);
        if (records.isNotEmpty) {
          final top = records.first;
          final ms = (top['completionTimeMs'] as num?)?.toInt() ?? 0;
          final holder = top['userName']?.toString() ?? top['username']?.toString() ?? 'Học viên';
          final formatted = _formatTime(ms);
          if (mounted) {
            setState(() {
              _officialStages[i] = st.copyWith(
                bestRecordStr: formatted,
                bestRecordHolder: holder,
              );
            });
          }
        } else {
          if (mounted) {
            setState(() {
              _officialStages[i] = st.copyWith(
                bestRecordStr: 'Chưa có kỷ lục',
                bestRecordHolder: 'Chưa có',
              );
            });
          }
        }
      } catch (_) {}
    }

    // 2. Cập nhật kỷ lục thật cho User Stages từ CSDL
    for (int i = 0; i < _userStages.length; i++) {
      final st = _userStages[i];
      try {
        final records = await ApiService().getStageLeaderboard(st.id);
        if (records.isNotEmpty) {
          final top = records.first;
          final ms = (top['completionTimeMs'] as num?)?.toInt() ?? 0;
          final holder = top['userName']?.toString() ?? top['username']?.toString() ?? 'Bạn';
          final formatted = _formatTime(ms);
          if (mounted) {
            setState(() {
              _userStages[i] = st.copyWith(
                bestRecordStr: formatted,
                bestRecordHolder: holder,
              );
            });
          }
        } else {
          if (mounted) {
            setState(() {
              _userStages[i] = st.copyWith(
                bestRecordStr: 'Chưa có thành tích',
                bestRecordHolder: 'Bạn',
              );
            });
          }
        }
      } catch (_) {}
    }
  }

  // ==========================================================================
  // STAGE LEADERBOARD MODAL (BẢNG VÀNG KỶ LỤC TỪ CSDL)
  // ==========================================================================
  Future<void> _showStageLeaderboardModal(ArenaStage stage) async {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          height: MediaQuery.of(ctx).size.height * 0.75,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                decoration: const BoxDecoration(
                  border: Border(bottom: BorderSide(color: Color(0xFFE5DED3))),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'BẢNG VÀNG PHẢN XẠ',
                          style: VocarioTokens.monoSmall.copyWith(fontSize: 9, color: VocarioTokens.brand),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          stage.title,
                          style: VocarioTokens.serifHeadline.copyWith(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),
              // Body
              Expanded(
                child: FutureBuilder<List<dynamic>>(
                  future: ApiService().getStageLeaderboard(stage.id),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator(color: VocarioTokens.brand));
                    }
                    final records = snapshot.data ?? [];
                    if (records.isEmpty) {
                      return Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.emoji_events_outlined, size: 48, color: VocarioTokens.muted),
                              const SizedBox(height: 12),
                              const Text(
                                'Chưa có kỷ lục nào',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Hãy là người đầu tiên hoàn thành màn đấu này!',
                                style: TextStyle(color: VocarioTokens.muted, fontSize: 12),
                              ),
                              const SizedBox(height: 16),
                              ElevatedButton(
                                onPressed: () {
                                  Navigator.pop(ctx);
                                  _startStage(stage);
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: VocarioTokens.brand,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                child: const Text('Bắt đầu thử thách ngay'),
                              ),
                            ],
                          ),
                        ),
                      );
                    }
                    return ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: records.length,
                      separatorBuilder: (_, __) => const Divider(height: 1, color: Color(0xFFE5DED3)),
                      itemBuilder: (context, index) {
                        final rec = records[index];
                        final timeMs = (rec['completionTimeMs'] as num?)?.toInt() ?? 0;
                        final seconds = (timeMs / 1000.0).toStringAsFixed(2);
                        final accuracy = (rec['accuracyPct'] as num?)?.toInt() ?? 100;
                        final username = rec['userName'] ?? rec['username'] ?? rec['userFullName'] ?? 'Học viên ẩn danh';
                        final targetLevel = rec['targetLevel']?.toString();
                        final isCurrentUser = rec['isCurrentUser'] == true;
                        final isPerfect = rec['isPerfectRun'] == true;
                        final mistakes = (rec['mistakeCount'] as num?)?.toInt() ?? 0;

                        return Container(
                          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
                          decoration: BoxDecoration(
                            color: isCurrentUser ? VocarioTokens.brand.withValues(alpha: 0.08) : Colors.transparent,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 28,
                                height: 28,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: index == 0
                                      ? const Color(0xFFFEF3C7)
                                      : (index == 1 ? const Color(0xFFF1F5F9) : const Color(0xFFFAF8F5)),
                                  shape: BoxShape.circle,
                                ),
                                child: Text(
                                  '#${index + 1}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11,
                                    color: index == 0
                                        ? const Color(0xFFD97706)
                                        : (index == 1 ? const Color(0xFF64748B) : VocarioTokens.ink),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Flexible(
                                          child: Text(
                                            username,
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 13,
                                              color: isCurrentUser ? VocarioTokens.brand : VocarioTokens.ink,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        if (isCurrentUser) ...[
                                          const SizedBox(width: 5),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                            decoration: BoxDecoration(
                                              color: VocarioTokens.brand,
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: const Text(
                                              'Bạn',
                                              style: TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.bold),
                                            ),
                                          ),
                                        ],
                                        if (targetLevel != null && targetLevel.isNotEmpty) ...[
                                          const SizedBox(width: 5),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                            decoration: BoxDecoration(
                                              color: VocarioTokens.field,
                                              borderRadius: BorderRadius.circular(4),
                                              border: Border.all(color: VocarioTokens.border),
                                            ),
                                            child: Text(
                                              targetLevel,
                                              style: VocarioTokens.monoSmall.copyWith(fontSize: 8.5, color: VocarioTokens.brand),
                                            ),
                                          ),
                                        ],
                                        if (isPerfect) ...[
                                          const SizedBox(width: 4),
                                          const Icon(Icons.star_rounded, size: 15, color: Color(0xFFD97706)),
                                        ],
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Chính xác: $accuracy% · Lỗi: $mistakes',
                                      style: TextStyle(color: VocarioTokens.muted, fontSize: 11),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFAF8F5),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFFE5DED3)),
                                ),
                                child: Text(
                                  '${seconds}s',
                                  style: VocarioTokens.monoSmall.copyWith(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: VocarioTokens.brand,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ==========================================================================
  // GAME ENGINE & SPEEDRUN STOPWATCH
  // ==========================================================================

  void _startStage(ArenaStage stage) {
    final shuffled = List<ArenaWord>.from(stage.words)..shuffle();

    setState(() {
      _currentStage = stage;
      _activeQueue = shuffled;
      _currentIndex = 0;
      _solvedIds.clear();

      _totalScore = 0;
      _comboMultiplier = 1.0;
      _maxCombo = 1.0;
      _correctCount = 0;
      _totalClicks = 0;
      _mistakeCount = 0;
      _penaltyTimeMs = 0;

      _isShowingSuccess = false;
      _isHintActive = false;
      _wrongClickedWord = null;
      _missClickOffset = null;
      _isZoomed = false;
      _lastRunResult = null;

      _gameMode = 'PLAYING';
    });

    _startSpeedrunStopwatch();
    _startQuestionRound();
  }

  void _startBlitz60s() {
    final allWords = <ArenaWord>[];
    for (final s in _officialStages) {
      allWords.addAll(s.words);
    }
    allWords.shuffle();
    final blitzWords = allWords.take(6).toList();

    final blitzStage = ArenaStage(
      id: 'stage-blitz-60s',
      title: 'Đua Tốc Độ 60s Blitz',
      subtitle: 'Thử thách phản xạ nhanh tổng hợp các bối cảnh đời thực',
      category: 'Đấu Trường Đỉnh Cao',
      badge: '⚡ Siêu Tốc Độ',
      isWeekly: true,
      imageUrl: _officialStages.isNotEmpty ? _officialStages.first.imageUrl : (_userStages.isNotEmpty ? _userStages.first.imageUrl : ''),
      bestRecordStr: 'Chưa có kỷ lục',
      bestRecordHolder: 'Chưa có',
      words: blitzWords,
    );

    _startStage(blitzStage);
  }

  void _startSpeedrunStopwatch() {
    _speedrunTimer?.cancel();
    _gameStartTimeMs = DateTime.now().millisecondsSinceEpoch;
    _elapsedTimeMs = 0;

    _speedrunTimer = Timer.periodic(const Duration(milliseconds: 50), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      final now = DateTime.now().millisecondsSinceEpoch;
      setState(() {
        _elapsedTimeMs = now - _gameStartTimeMs;
      });
    });
  }

  void _startQuestionRound() {
    _roundTimer?.cancel();
    setState(() {
      _timerSeconds = 15;
      _isShowingSuccess = false;
      _isHintActive = false;
      _wrongClickedWord = null;
      _missClickOffset = null;
    });

    if (_currentIndex >= _activeQueue.length) {
      _finishGame();
      return;
    }

    _playWordAudio();

    _roundTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_timerSeconds <= 1) {
        timer.cancel();
        _onRoundTimerExpired();
      } else {
        setState(() => _timerSeconds--);
      }
    });
  }

  void _onRoundTimerExpired() {
    _roundTimer?.cancel();
    setState(() {
      _comboMultiplier = 1.0;
    });
    _showToast('Hết giờ cho từ "${_currentTarget?.word}"! Chuyển sang từ kế tiếp.');
    _nextQuestion();
  }

  ArenaWord? get _currentTarget {
    if (_currentIndex >= 0 && _currentIndex < _activeQueue.length) {
      return _activeQueue[_currentIndex];
    }
    return null;
  }

  void _playWordAudio() {
    setState(() => _isSpeaking = true);
    Future.delayed(const Duration(milliseconds: 600), () {
      if (mounted) setState(() => _isSpeaking = false);
    });
  }

  /// Tương tác chạm màn hình nhận diện Hitbox vật thể
  void _onPhotoTapped(TapUpDetails details, Size containerSize) {
    if (_isShowingSuccess) return;
    final target = _currentTarget;
    if (target == null) return;

    final clickX = (details.localPosition.dx / containerSize.width) * 100.0;
    final clickY = (details.localPosition.dy / containerSize.height) * 100.0;

    _totalClicks++;

    final words = _currentStage?.words ?? [];
    ArenaWord? hitWord;
    bool isTargetHit = false;

    // Hitbox check with tolerance for small objects
    for (final item in words) {
      if (_solvedIds.contains(item.id)) continue;

      const tolerance = 4.0;
      final minX = item.leftPercent - tolerance;
      final maxX = item.leftPercent + item.widthPercent + tolerance;
      final minY = item.topPercent - tolerance;
      final maxY = item.topPercent + item.heightPercent + tolerance;

      if (clickX >= minX && clickX <= maxX && clickY >= minY && clickY <= maxY) {
        if (item.id == target.id || item.word.toLowerCase() == target.word.toLowerCase()) {
          isTargetHit = true;
          hitWord = item;
          break;
        } else {
          hitWord = item;
        }
      }
    }

    if (isTargetHit && hitWord != null) {
      _handleCorrectHit(hitWord);
    } else if (hitWord != null) {
      _handleWrongObjectClick(hitWord, target);
    } else {
      _handleMissClick(details.localPosition);
    }
  }

  void _handleCorrectHit(ArenaWord target) {
    _roundTimer?.cancel();

    // Điểm cơ bản 25 XP + Thưởng phản xạ nhanh 10 XP nếu dưới 5s
    const baseScore = 25;
    final speedBonus = _timerSeconds >= 10 ? 10 : 0;
    final earnedXp = ((baseScore + speedBonus) * _comboMultiplier).round();

    setState(() {
      _isShowingSuccess = true;
      _solvedIds.add(target.id);
      _correctCount++;
      _lastEarnedXp = earnedXp;
      _totalScore += earnedXp;

      final nextCombo = (_comboMultiplier + 0.5).clamp(1.0, 3.0);
      _comboMultiplier = double.parse(nextCombo.toStringAsFixed(1));
      if (_comboMultiplier > _maxCombo) {
        _maxCombo = _comboMultiplier;
      }
    });

    // Đồng bộ điểm và review vào CSDL Spring Boot
    ApiService().submitReview(
      wordText: target.word,
      ratingGrade: 5,
      responseTimeMs: (15 - _timerSeconds) * 1000,
    );

    // Chuyển sang câu kế tiếp sau 1.2s
    Future.delayed(const Duration(milliseconds: 1200), () {
      if (mounted) _nextQuestion();
    });
  }

  void _handleWrongObjectClick(ArenaWord wrong, ArenaWord target) {
    setState(() {
      _wrongClickedWord = wrong;
      _comboMultiplier = 1.0;
      _mistakeCount++;
      _penaltyTimeMs += 2000; // Phạt +2s
      _timerSeconds = (_timerSeconds - 2).clamp(1, 15);
    });

    _showToast('Đó là "${wrong.word}" (${wrong.vietnamese}), hãy tìm "${target.word}"! (+2s phạt)');

    Future.delayed(const Duration(milliseconds: 1400), () {
      if (mounted && _wrongClickedWord?.id == wrong.id) {
        setState(() => _wrongClickedWord = null);
      }
    });
  }

  void _handleMissClick(Offset localOffset) {
    _missTimer?.cancel();
    setState(() {
      _missClickOffset = localOffset;
      _missMessage = '-2s';
      _comboMultiplier = 1.0;
      _mistakeCount++;
      _penaltyTimeMs += 2000;
      _timerSeconds = (_timerSeconds - 2).clamp(1, 15);
    });

    _missTimer = Timer(const Duration(milliseconds: 900), () {
      if (mounted) setState(() => _missClickOffset = null);
    });
  }

  void _nextQuestion() {
    final next = _currentIndex + 1;
    if (next < _activeQueue.length) {
      setState(() => _currentIndex = next);
      _startQuestionRound();
    } else {
      _finishGame();
    }
  }

  /// Kết thúc màn chơi và gửi kết quả lượt thi về `/api/arena/submit-run`
  Future<void> _finishGame() async {
    _roundTimer?.cancel();
    _speedrunTimer?.cancel();

    final pureMs = _elapsedTimeMs > 0 ? _elapsedTimeMs : 6000;
    final totalMs = pureMs + _penaltyTimeMs;
    final totalClicks = _totalClicks > 0 ? _totalClicks : 1;
    final acc = ((_correctCount / totalClicks) * 100).clamp(0.0, 100.0);

    setState(() {
      _gameMode = 'VICTORY';
      _isSubmittingRun = true;
    });

    final stage = _currentStage;
    if (stage != null) {
      final res = await ApiService().submitArenaRun(
        stageId: stage.id,
        completionTimeMs: totalMs,
        pureTimeMs: pureMs,
        mistakeCount: _mistakeCount,
        penaltyMs: _penaltyTimeMs,
        accuracyPct: acc,
        maxCombo: _maxCombo.round(),
        totalXpEarned: _totalScore,
        isPerfectRun: _mistakeCount == 0,
      );

      if (mounted) {
        setState(() {
          _lastRunResult = res;
          _isSubmittingRun = false;
        });
      }

      // Tự động làm mới bảng kỷ lục từ CSDL để hiển thị thành tích mới nhất
      _fetchRealLeaderboardRecords();
    } else {
      if (mounted) setState(() => _isSubmittingRun = false);
    }
  }

  String _formatTime(int milliseconds) {
    final totalSec = milliseconds ~/ 1000;
    final minutes = (totalSec ~/ 60).toString().padLeft(2, '0');
    final seconds = (totalSec % 60).toString().padLeft(2, '0');
    final ms = ((milliseconds % 1000) ~/ 10).toString().padLeft(2, '0');
    return '$minutes:$seconds.$ms';
  }

  // ==========================================================================
  // BUILD UI TREE
  // ==========================================================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: VocarioTokens.canvas,
      body: SafeArea(
        child: Stack(
          children: [
            if (_gameMode == 'SELECT_STAGE')
              _buildSelectStageView()
            else if (_gameMode == 'PLAYING')
              _buildPlayingView()
            else
              _buildVictoryView(),

            if (_toastMessage != null) _buildFloatingToast(),
          ],
        ),
      ),
    );
  }

  // ==========================================================================
  // 1. SELECT STAGE VIEW (Màn hình chọn bối cảnh)
  // ==========================================================================
  Widget _buildSelectStageView() {
    if (_officialStages.isEmpty) {
      _officialStages = _buildDefaultOfficialStages();
    }
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Navigation Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.arrow_back_rounded, color: VocarioTokens.ink),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
              GestureDetector(
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const LeaderboardScreen()),
                ),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: VocarioTokens.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: VocarioTokens.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.emoji_events_outlined, size: 14, color: VocarioTokens.brand),
                      const SizedBox(width: 5),
                      Text(
                        '$_totalScore XP',
                        style: VocarioTokens.monoSmall.copyWith(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: VocarioTokens.ink,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Title & Description
          Text(
            'VISUAL EXPEDITION · ĐẤU TRƯỜNG THỰC TẾ',
            style: VocarioTokens.monoSmall.copyWith(
              fontSize: 8.5,
              color: VocarioTokens.brand,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Đấu trường thị giác AI',
            style: VocarioTokens.serifHeadline.copyWith(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Thử thách phản xạ ngôn ngữ trên Đấu trường Tuần chuẩn hóa hoặc trực tiếp trên ảnh đời thực bạn đã chụp.',
            style: TextStyle(fontSize: 11.5, color: VocarioTokens.muted, height: 1.45),
          ),
          const SizedBox(height: 14),

          // 60s Blitz Special Mode Banner
          _buildBlitzBanner(),
          const SizedBox(height: 16),

          // Filter Segment Tabs
          Row(
            children: [
              _buildFilterTab(
                label: 'Đấu trường hệ thống',
                count: _officialStages.length,
                isSelected: _stageFilter == 'ADMIN',
                onTap: () => setState(() => _stageFilter = 'ADMIN'),
              ),
              const SizedBox(width: 8),
              _buildFilterTab(
                label: 'Ảnh của bạn',
                count: _userStages.length,
                isSelected: _stageFilter == 'USER',
                onTap: () => setState(() => _stageFilter = 'USER'),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Stages Grid / List
          if (_stageFilter == 'ADMIN') ...[
            if (_officialStages.isEmpty)
              _buildEmptyOfficialStages()
            else
              ..._officialStages.map((stage) => _buildStageCard(stage)),
          ] else if (_isLoadingUserStages) ...[
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Center(
                child: CircularProgressIndicator(color: VocarioTokens.brand, strokeWidth: 2),
              ),
            ),
          ] else if (_userStages.isEmpty) ...[
            _buildEmptyUserStages(),
          ] else ...[
            ..._userStages.map((stage) => _buildStageCard(stage)),
          ],

          const SizedBox(height: 16),
          // Scoring Mechanics Info Card
          _buildScoringMechanicsCard(),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildBlitzBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF1ECE3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: VocarioTokens.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: VocarioTokens.surface,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: VocarioTokens.border),
                ),
                child: const Icon(Icons.flash_on_rounded, size: 18, color: VocarioTokens.brand),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'CHẾ ĐỘ ĐẶC BIỆT',
                      style: VocarioTokens.monoSmall.copyWith(fontSize: 8, color: VocarioTokens.brand),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Thử thách Blitz: Đua thời gian 60 giây',
                      style: VocarioTokens.serifHeadline.copyWith(fontSize: 13.5, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Thi đấu phản xạ nhanh xáo trộn trên bối cảnh tuần trước khi hết thời gian.',
            style: TextStyle(fontSize: 10.5, color: VocarioTokens.muted, height: 1.4),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 38,
            child: ElevatedButton.icon(
              onPressed: _startBlitz60s,
              icon: const Icon(Icons.timer_outlined, size: 15),
              label: const Text('Bắt đầu 60s Blitz', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: VocarioTokens.brand,
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

  Widget _buildFilterTab({
    required String label,
    required int count,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? VocarioTokens.brand : VocarioTokens.surface,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? VocarioTokens.brand : VocarioTokens.border),
        ),
        child: Row(
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? Colors.white : VocarioTokens.ink,
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
              decoration: BoxDecoration(
                color: isSelected ? Colors.white.withValues(alpha: 0.2) : VocarioTokens.field,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                '$count',
                style: VocarioTokens.monoSmall.copyWith(
                  fontSize: 8.5,
                  color: isSelected ? Colors.white : VocarioTokens.muted,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStagePhoto(
    String? url, {
    BoxFit fit = BoxFit.cover,
    double? width,
    double? height,
    Widget? errorWidget,
  }) {
    if (url == null || url.trim().isEmpty) {
      return errorWidget ??
          Container(
            color: VocarioTokens.field,
            width: width,
            height: height,
            alignment: Alignment.center,
            child: const Icon(Icons.image_outlined, size: 36, color: VocarioTokens.muted),
          );
    }

    final trimmed = url.trim();

    // 1. Base64 Data URL (từ Scanner lưu vào PostgreSQL)
    if (trimmed.startsWith('data:image')) {
      try {
        final commaIdx = trimmed.indexOf(',');
        final b64Str = commaIdx != -1 ? trimmed.substring(commaIdx + 1) : trimmed;
        final bytes = base64Decode(b64Str);
        return Image.memory(
          bytes,
          fit: fit,
          width: width,
          height: height,
          errorBuilder: (_, __, ___) =>
              errorWidget ??
              Container(
                color: VocarioTokens.field,
                width: width,
                height: height,
                alignment: Alignment.center,
                child: const Icon(Icons.broken_image_outlined, size: 36, color: VocarioTokens.muted),
              ),
        );
      } catch (_) {
        return errorWidget ??
            Container(
              color: VocarioTokens.field,
              width: width,
              height: height,
              alignment: Alignment.center,
              child: const Icon(Icons.broken_image_outlined, size: 36, color: VocarioTokens.muted),
            );
      }
    }

    // 2. Relative URL
    String fullUrl = trimmed;
    if (fullUrl.startsWith('/')) {
      if (kIsWeb) {
        fullUrl = trimmed;
      } else {
        fullUrl = '${ApiService.defaultBaseUrl}$trimmed';
      }
    }

    // 3. Network URL kèm Fallback bối cảnh dự phòng
    return Image.network(
      fullUrl,
      fit: fit,
      width: width,
      height: height,
      errorBuilder: (_, __, ___) =>
          errorWidget ??
          Container(
            color: VocarioTokens.field,
            width: width,
            height: height,
            alignment: Alignment.center,
            child: const Icon(Icons.broken_image_outlined, size: 36, color: VocarioTokens.muted),
          ),
    );
  }

  Widget _buildStageCard(ArenaStage stage) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: stage.isWeekly ? VocarioTokens.goldAccent : VocarioTokens.border,
          width: stage.isWeekly ? 1.5 : 1.0,
        ),
        boxShadow: VocarioTokens.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image Header with Badges
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(11)),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: _buildStagePhoto(stage.imageUrl, fit: BoxFit.cover),
                ),
              ),
              Positioned(
                top: 8,
                left: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3.5),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.75),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    '${stage.badge} · ${stage.words.length} đồ vật',
                    style: VocarioTokens.monoSmall.copyWith(
                      fontSize: 8,
                      color: stage.isWeekly ? VocarioTokens.goldAccent : Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              if (stage.isWeekly)
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: VocarioTokens.goldAccent,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      'TIÊU ĐIỂM TUẦN',
                      style: VocarioTokens.monoSmall.copyWith(
                        fontSize: 7.5,
                        color: VocarioTokens.ink,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
            ],
          ),

          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  stage.title,
                  style: VocarioTokens.serifHeadline.copyWith(fontSize: 15, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 2),
                Text(
                  stage.words.map((w) => w.word).join(' · '),
                  style: const TextStyle(fontSize: 10, fontStyle: FontStyle.italic, color: VocarioTokens.muted),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),

                // Record Row (Tappable to view stage leaderboard)
                InkWell(
                  onTap: () => _showStageLeaderboardModal(stage),
                  borderRadius: BorderRadius.circular(6),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                    decoration: BoxDecoration(
                      color: VocarioTokens.field,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: VocarioTokens.border),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.emoji_events_outlined, size: 13, color: VocarioTokens.amber),
                            const SizedBox(width: 5),
                            const Text(
                              'Kỷ lục: ',
                              style: TextStyle(fontSize: 9.5, color: VocarioTokens.brand, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              '${stage.bestRecordStr} (${stage.bestRecordHolder})',
                              style: const TextStyle(fontSize: 9.5, color: VocarioTokens.muted),
                            ),
                          ],
                        ),
                        const Icon(Icons.chevron_right_rounded, size: 14, color: VocarioTokens.muted),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                // Action CTA
                SizedBox(
                  width: double.infinity,
                  height: 36,
                  child: ElevatedButton(
                    onPressed: () => _startStage(stage),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: VocarioTokens.brand,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(7)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Text('Vào thi đấu', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                        SizedBox(width: 5),
                        Icon(Icons.arrow_forward_rounded, size: 14),
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

  Widget _buildEmptyOfficialStages() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: VocarioTokens.border),
      ),
      child: Column(
        children: [
          const Icon(Icons.emoji_events_outlined, size: 36, color: VocarioTokens.muted),
          const SizedBox(height: 10),
          Text(
            'Chưa có bối cảnh hệ thống trong CSDL',
            style: VocarioTokens.serifHeadline.copyWith(fontSize: 14, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          const Text(
            'Các sàn đấu chính thức sẽ được ban quản trị phát hành từ CSDL. Bạn có thể thi đấu trên các bối cảnh đời thực của mình tại tab "Ảnh của bạn".',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 10.5, color: VocarioTokens.muted, height: 1.4),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyUserStages() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: VocarioTokens.border),
      ),
      child: Column(
        children: [
          const Icon(Icons.camera_alt_outlined, size: 36, color: VocarioTokens.muted),
          const SizedBox(height: 10),
          Text(
            'Chưa có bối cảnh từ ảnh đã chụp',
            style: VocarioTokens.serifHeadline.copyWith(fontSize: 14, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            'Chụp hoặc tải ảnh đồ vật trong phòng để AI tự động tạo sàn đấu phản xạ riêng cho bạn!',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 10.5, color: VocarioTokens.muted, height: 1.4),
          ),
          const SizedBox(height: 14),
          ElevatedButton.icon(
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ScannerScreen()),
            ).then((_) => _loadUserStagesFromBackend()),
            icon: const Icon(Icons.camera_enhance_rounded, size: 14),
            label: const Text('Chụp ảnh bối cảnh ngay', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: VocarioTokens.brand,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ],
      ),
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
            'CƠ CHẾ TÍNH ĐIỂM & PHẢN XẠ',
            style: VocarioTokens.monoSmall.copyWith(fontSize: 8, color: VocarioTokens.brand),
          ),
          const SizedBox(height: 8),
          _buildScoringRow('Đoán đúng vật thể', '+25 XP', Icons.check_circle_outline),
          _buildScoringRow('Chuỗi combo chính xác', 'x1.5 ~ x3.0', Icons.local_fire_department_outlined),
          _buildScoringRow('Phản xạ nhanh <5s', '+10 XP', Icons.flash_on_outlined),
          _buildScoringRow('Chạm sai vị trí', '-2s phạt', Icons.warning_amber_rounded, isNegative: true),
        ],
      ),
    );
  }

  Widget _buildScoringRow(String title, String reward, IconData icon, {bool isNegative = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: isNegative ? const Color(0xFFB91C1C) : VocarioTokens.brand),
              const SizedBox(width: 6),
              Text(title, style: const TextStyle(fontSize: 10.5, color: VocarioTokens.ink)),
            ],
          ),
          Text(
            reward,
            style: VocarioTokens.monoSmall.copyWith(
              fontSize: 9.5,
              fontWeight: FontWeight.bold,
              color: isNegative ? const Color(0xFFB91C1C) : VocarioTokens.brand,
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // 2. PLAYING VIEW (Đấu trường tương tác tìm đồ vật)
  // ==========================================================================
  Widget _buildPlayingView() {
    final target = _currentTarget;

    return Column(
      children: [
        // Top HUD Bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: VocarioTokens.surface,
            border: const Border(bottom: BorderSide(color: VocarioTokens.border)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Back Button & Stage Title
              Row(
                children: [
                  IconButton(
                    onPressed: () => setState(() => _gameMode = 'SELECT_STAGE'),
                    icon: const Icon(Icons.arrow_back_rounded, size: 18, color: VocarioTokens.ink),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'BỐI CẢNH',
                        style: VocarioTokens.monoSmall.copyWith(fontSize: 7, color: VocarioTokens.brand),
                      ),
                      Text(
                        _currentStage?.title ?? 'Đấu trường',
                        style: VocarioTokens.serifHeadline.copyWith(fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ],
              ),

              // HUD Metrics: Stopwatch + Timer + Combo + Hint
              Row(
                children: [
                  // Speedrun Stopwatch
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: VocarioTokens.field,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: VocarioTokens.border),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.timer_outlined, size: 11, color: VocarioTokens.brand),
                        const SizedBox(width: 4),
                        Text(
                          _formatTime(_elapsedTimeMs + _penaltyTimeMs),
                          style: VocarioTokens.monoSmall.copyWith(
                            fontSize: 9.5,
                            fontWeight: FontWeight.bold,
                            color: VocarioTokens.ink,
                          ),
                        ),
                        if (_penaltyTimeMs > 0)
                          Text(
                            ' +${_penaltyTimeMs ~/ 1000}s',
                            style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.bold, color: Color(0xFFB91C1C)),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),

                  // 15s Round countdown pill
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      color: _timerSeconds <= 5 ? const Color(0xFFFDE8E8) : VocarioTokens.field,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: _timerSeconds <= 5 ? const Color(0xFFF8B4B4) : VocarioTokens.border,
                      ),
                    ),
                    child: Text(
                      '${_timerSeconds}s',
                      style: VocarioTokens.monoSmall.copyWith(
                        fontSize: 9.5,
                        fontWeight: FontWeight.bold,
                        color: _timerSeconds <= 5 ? const Color(0xFFB91C1C) : VocarioTokens.ink,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),

                  // Combo Pill
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFFCD34D)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.local_fire_department, size: 11, color: Color(0xFFB45309)),
                        Text(
                          ' ${_comboMultiplier}x',
                          style: VocarioTokens.monoSmall.copyWith(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFFB45309),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),

                  // Hint Button
                  GestureDetector(
                    onTap: () {
                      if (!_isHintActive) {
                        setState(() {
                          _isHintActive = true;
                          _totalScore = (_totalScore - 10).clamp(0, 99999);
                        });
                        _showToast('Đã bật radar gợi ý vị trí vật thể (-10 XP)!');
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: VocarioTokens.surface,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: VocarioTokens.border),
                      ),
                      child: Text(
                        'Gợi ý',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                          color: _isHintActive ? VocarioTokens.muted : VocarioTokens.brand,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),

        // Target Word Prompt Banner
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: VocarioTokens.surface,
            border: const Border(bottom: BorderSide(color: VocarioTokens.border)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    // Speaker Button
                    GestureDetector(
                      onTap: _playWordAudio,
                      child: Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: VocarioTokens.brand,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: AnimatedScale(
                          scale: _isSpeaking ? 1.2 : 1.0,
                          duration: const Duration(milliseconds: 200),
                          child: const Icon(Icons.volume_up_rounded, size: 18, color: Colors.white),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                'TÌM ĐỒ VẬT (${_currentIndex + 1}/${_activeQueue.length}):',
                                style: VocarioTokens.monoSmall.copyWith(fontSize: 7.5, color: VocarioTokens.brand),
                              ),
                              const SizedBox(width: 5),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                decoration: BoxDecoration(
                                  color: VocarioTokens.field,
                                  borderRadius: BorderRadius.circular(3),
                                ),
                                child: Text(
                                  target?.level ?? 'A2',
                                  style: VocarioTokens.monoSmall.copyWith(fontSize: 7, color: VocarioTokens.muted),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 1),
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  target?.word ?? '',
                                  style: VocarioTokens.serifHeadline.copyWith(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                target?.ipa ?? '',
                                style: VocarioTokens.monoSmall.copyWith(fontSize: 8.5, color: VocarioTokens.muted),
                              ),
                            ],
                          ),
                          Text(
                            'Nghĩa: ${target?.vietnamese ?? ''}',
                            style: TextStyle(fontSize: 9.5, color: VocarioTokens.ink.withValues(alpha: 0.8)),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Skip Button
              TextButton(
                onPressed: () {
                  _showToast('Bỏ qua câu "${target?.word}".');
                  _nextQuestion();
                },
                style: TextButton.styleFrom(
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(40, 30),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: const Text('Bỏ qua', style: TextStyle(fontSize: 9.5, color: VocarioTokens.muted)),
              ),
            ],
          ),
        ),

        // Interactive Photo Arena
        Expanded(
          child: Container(
            color: const Color(0xFF1F1C18),
            child: LayoutBuilder(
              builder: (context, constraints) {
                return Stack(
                  fit: StackFit.expand,
                  children: [
                    // Clickable Image Canvas
                    GestureDetector(
                      onTapUp: (details) => _onPhotoTapped(details, constraints.biggest),
                      child: AnimatedScale(
                        scale: _isZoomed ? 1.4 : 1.0,
                        duration: const Duration(milliseconds: 250),
                        child: _buildStagePhoto(
                          _currentStage?.imageUrl,
                          fit: BoxFit.contain,
                          width: constraints.maxWidth,
                          height: constraints.maxHeight,
                          errorWidget: const Center(
                            child: Icon(Icons.image_not_supported_outlined, size: 48, color: Colors.white54),
                          ),
                        ),
                      ),
                    ),

                    // Magnifier Zoom Toggle Button
                    Positioned(
                      top: 10,
                      right: 10,
                      child: GestureDetector(
                        onTap: () => setState(() => _isZoomed = !_isZoomed),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: _isZoomed ? const Color(0xFF287A59) : Colors.black.withValues(alpha: 0.7),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.25)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.search_rounded, size: 12, color: Colors.white),
                              const SizedBox(width: 4),
                              Text(
                                _isZoomed ? 'Thu nhỏ (1x)' : 'Kính lúp (1.4x)',
                                style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                    // Correct Hit Box celebration
                    if (_isShowingSuccess && target != null)
                      Positioned(
                        top: (target.topPercent / 100.0) * constraints.maxHeight,
                        left: (target.leftPercent / 100.0) * constraints.maxWidth,
                        width: (target.widthPercent / 100.0) * constraints.maxWidth,
                        height: (target.heightPercent / 100.0) * constraints.maxHeight,
                        child: Container(
                          decoration: BoxDecoration(
                            border: Border.all(color: const Color(0xFF287A59), width: 2.5),
                            color: const Color(0xFF287A59).withValues(alpha: 0.35),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Align(
                            alignment: Alignment.topCenter,
                            child: Container(
                              margin: const EdgeInsets.only(top: 2),
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF287A59),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                '✓ ${target.word} (+$_lastEarnedXp XP)',
                                style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ),
                          ),
                        ),
                      ),

                    // Wrong Object Click Warning
                    if (_wrongClickedWord != null)
                      Positioned(
                        top: (_wrongClickedWord!.topPercent / 100.0) * constraints.maxHeight,
                        left: (_wrongClickedWord!.leftPercent / 100.0) * constraints.maxWidth,
                        width: (_wrongClickedWord!.widthPercent / 100.0) * constraints.maxWidth,
                        height: (_wrongClickedWord!.heightPercent / 100.0) * constraints.maxHeight,
                        child: Container(
                          decoration: BoxDecoration(
                            border: Border.all(color: const Color(0xFFB91C1C), width: 2),
                            color: const Color(0xFFB91C1C).withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(6),
                          ),
                        ),
                      ),

                    // Hint Radar Outline
                    if (_isHintActive && target != null)
                      Positioned(
                        top: ((target.topPercent - 2) / 100.0) * constraints.maxHeight,
                        left: ((target.leftPercent - 2) / 100.0) * constraints.maxWidth,
                        width: ((target.widthPercent + 4) / 100.0) * constraints.maxWidth,
                        height: ((target.heightPercent + 4) / 100.0) * constraints.maxHeight,
                        child: Container(
                          decoration: BoxDecoration(
                            border: Border.all(color: VocarioTokens.goldAccent, width: 2),
                            borderRadius: BorderRadius.circular(8),
                            color: VocarioTokens.goldAccent.withValues(alpha: 0.2),
                          ),
                        ),
                      ),

                    // Miss click ripple (-2s)
                    if (_missClickOffset != null)
                      Positioned(
                        left: _missClickOffset!.dx - 18,
                        top: _missClickOffset!.dy - 18,
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: const Color(0xFFB91C1C), width: 2),
                            color: const Color(0xFFB91C1C).withValues(alpha: 0.4),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            _missMessage ?? '-2s',
                            style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ),
                      ),

                    // Solved Objects Subtle Badges
                    for (final item in _currentStage?.words ?? [])
                      if (_solvedIds.contains(item.id) && !_isShowingSuccess)
                        Positioned(
                          top: (item.topPercent / 100.0) * constraints.maxHeight,
                          left: (item.leftPercent / 100.0) * constraints.maxWidth,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF287A59).withValues(alpha: 0.85),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.check, size: 8, color: Colors.white),
                                const SizedBox(width: 2),
                                Text(
                                  item.word,
                                  style: const TextStyle(fontSize: 7.5, color: Colors.white, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                        ),
                  ],
                );
              },
            ),
          ),
        ),

        // Solved Objects Horizontal Ribbon
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          color: VocarioTokens.surface,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'ĐÃ TÌM THẤY (${_solvedIds.length}/${_activeQueue.length})',
                    style: VocarioTokens.monoSmall.copyWith(fontSize: 7.5, color: VocarioTokens.brand),
                  ),
                  Text(
                    'Độ chính xác: ${_totalClicks > 0 ? ((_correctCount / _totalClicks) * 100).round() : 100}%',
                    style: TextStyle(fontSize: 8.5, color: VocarioTokens.muted),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _activeQueue.map((item) {
                    final isSolved = _solvedIds.contains(item.id);
                    final isTarget = item.id == target?.id;

                    return Container(
                      margin: const EdgeInsets.only(right: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isSolved
                            ? const Color(0xFFE8F5E9)
                            : isTarget
                                ? const Color(0xFFFEF3C7)
                                : VocarioTokens.field,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: isSolved
                              ? const Color(0xFF81C784)
                              : isTarget
                                  ? VocarioTokens.goldAccent
                                  : VocarioTokens.border,
                        ),
                      ),
                      child: Row(
                        children: [
                          if (isSolved)
                            const Icon(Icons.check_circle_rounded, size: 10, color: Color(0xFF2E7D32))
                          else if (isTarget)
                            const Icon(Icons.search_rounded, size: 10, color: Color(0xFFB45309))
                          else
                            const Icon(Icons.circle_outlined, size: 8, color: VocarioTokens.muted),
                          const SizedBox(width: 4),
                          Text(
                            item.word,
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: isTarget ? FontWeight.bold : FontWeight.w500,
                              color: isSolved
                                  ? const Color(0xFF1B5E20)
                                  : isTarget
                                      ? const Color(0xFFB45309)
                                      : VocarioTokens.muted,
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ==========================================================================
  // 3. VICTORY VIEW (Tổng kết kết quả trận đấu)
  // ==========================================================================
  Widget _buildVictoryView() {
    final pureMs = _elapsedTimeMs > 0 ? _elapsedTimeMs : 6000;
    final totalMs = pureMs + _penaltyTimeMs;
    final totalClicks = _totalClicks > 0 ? _totalClicks : 1;
    final acc = ((_correctCount / totalClicks) * 100).round();

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Column(
        children: [
          // Trophy Icon
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: const Color(0xFFF1ECE3),
              shape: BoxShape.circle,
              border: Border.all(color: VocarioTokens.border),
            ),
            child: const Icon(Icons.emoji_events_rounded, size: 34, color: VocarioTokens.brand),
          ),
          const SizedBox(height: 14),

          Text(
            'THỬ THÁCH HOÀN THÀNH XUẤT SẮC',
            style: VocarioTokens.monoSmall.copyWith(fontSize: 8.5, color: VocarioTokens.brand, letterSpacing: 1.0),
          ),
          const SizedBox(height: 4),
          Text(
            'Tổng kết đấu trường thị giác',
            style: VocarioTokens.serifHeadline.copyWith(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 6),
          Text(
            'Bạn vừa hoàn thành xuất sắc bối cảnh "${_currentStage?.title}". Kết quả đã được tự động đồng bộ vào Bảng xếp hạng tuần!',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11, color: VocarioTokens.muted, height: 1.45),
          ),
          const SizedBox(height: 20),

          // New PB / Milestone Banner
          if (_lastRunResult != null && _lastRunResult!['isNewPB'] == true)
            Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: VocarioTokens.goldAccent,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: const [
                  Icon(Icons.military_tech_rounded, size: 14, color: VocarioTokens.ink),
                  SizedBox(width: 5),
                  Text(
                    'KỶ LỤC CÁ NHÂN MỚI (PB)!',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: VocarioTokens.ink),
                  ),
                ],
              ),
            ),

          // Speedrun Metrics Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: VocarioTokens.surface,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: VocarioTokens.border),
              boxShadow: VocarioTokens.cardShadow,
            ),
            child: Column(
              children: [
                // Total Time Big Metric
                Text(
                  'TỔNG THỜI GIAN SPEEDRUN',
                  style: VocarioTokens.monoSmall.copyWith(fontSize: 8.5, color: VocarioTokens.muted),
                ),
                const SizedBox(height: 4),
                Text(
                  _formatTime(totalMs),
                  style: VocarioTokens.monoSmall.copyWith(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: VocarioTokens.brand,
                  ),
                ),
                const SizedBox(height: 14),
                const Divider(height: 1, color: VocarioTokens.border),
                const SizedBox(height: 14),

                // Grid 2x2 stats
                Row(
                  children: [
                    Expanded(child: _buildVictoryStatItem('Thời gian thuần', _formatTime(pureMs))),
                    Expanded(child: _buildVictoryStatItem('Thời gian phạt', '+${_penaltyTimeMs ~/ 1000}s')),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _buildVictoryStatItem('Độ chính xác', '$acc%')),
                    Expanded(child: _buildVictoryStatItem('Combo cao nhất', '${_maxCombo}x')),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _buildVictoryStatItem('Tổng XP nhận', '+$_totalScore XP')),
                    Expanded(
                      child: _buildVictoryStatItem(
                        'Đồng bộ CSDL',
                        _isSubmittingRun ? 'Đang lưu...' : 'Thành công ✓',
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),

          // Action Buttons
          SizedBox(
            width: double.infinity,
            height: 44,
            child: ElevatedButton.icon(
              onPressed: () {
                if (_currentStage != null) {
                  _startStage(_currentStage!);
                }
              },
              icon: const Icon(Icons.replay_rounded, size: 16),
              label: const Text('Chơi lại bối cảnh này', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: VocarioTokens.brand,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
              ),
            ),
          ),
          const SizedBox(height: 8),

          SizedBox(
            width: double.infinity,
            height: 42,
            child: OutlinedButton.icon(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const LeaderboardScreen()),
              ),
              icon: const Icon(Icons.emoji_events_outlined, size: 16),
              label: const Text('Xem bảng xếp hạng tuần', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              style: OutlinedButton.styleFrom(
                foregroundColor: VocarioTokens.brand,
                side: const BorderSide(color: VocarioTokens.brand),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
              ),
            ),
          ),
          const SizedBox(height: 8),

          SizedBox(
            width: double.infinity,
            height: 42,
            child: OutlinedButton(
              onPressed: () => setState(() => _gameMode = 'SELECT_STAGE'),
              style: OutlinedButton.styleFrom(
                foregroundColor: VocarioTokens.ink,
                side: const BorderSide(color: VocarioTokens.border),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(9)),
              ),
              child: const Text('Chọn bối cảnh khác', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            ),
          ),
          const SizedBox(height: 8),

          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Quay về Trang chủ', style: TextStyle(fontSize: 11.5, color: VocarioTokens.muted)),
          ),
        ],
      ),
    );
  }

  Widget _buildVictoryStatItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(fontSize: 9.5, color: VocarioTokens.muted),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: VocarioTokens.monoSmall.copyWith(
            fontSize: 12.5,
            fontWeight: FontWeight.bold,
            color: VocarioTokens.ink,
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
            const Icon(Icons.info_outline_rounded, size: 14, color: VocarioTokens.brand),
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

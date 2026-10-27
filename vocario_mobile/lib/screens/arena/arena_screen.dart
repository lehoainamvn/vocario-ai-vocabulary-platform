import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/tokens.dart';
import '../../core/services/api_service.dart';

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
    final box = json['box'] as Map<String, dynamic>?;
    return ArenaWord(
      id: json['id']?.toString() ?? 'obj-$index',
      word: json['word']?.toString() ?? 'object',
      ipa: json['ipa']?.toString() ?? '/.../',
      vietnamese: json['vietnamese']?.toString() ?? json['meaning']?.toString() ?? 'vật thể đời sống',
      level: json['level']?.toString() ?? 'A2',
      partOfSpeech: json['partOfSpeech']?.toString() ?? 'noun',
      topPercent: (json['topPercent'] as num?)?.toDouble() ??
          (box?['top'] as num?)?.toDouble() ??
          (20.0 + (index * 14) % 55),
      leftPercent: (json['leftPercent'] as num?)?.toDouble() ??
          (box?['left'] as num?)?.toDouble() ??
          (15.0 + (index * 18) % 65),
      widthPercent: (json['widthPercent'] as num?)?.toDouble() ??
          (box?['width'] as num?)?.toDouble() ??
          25.0,
      heightPercent: (json['heightPercent'] as num?)?.toDouble() ??
          (box?['height'] as num?)?.toDouble() ??
          18.0,
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
    this.bestRecordStr = '00:05.82',
    this.bestRecordHolder = 'Minh Hoàng',
  });
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
  String _stageFilter = 'ADMIN'; // 'ADMIN' = Đấu trường hệ thống, 'USER' = Ảnh của bạn

  // Danh sách các sàn đấu chính thức (Chuẩn hóa từ Web Vocario)
  late List<ArenaStage> _officialStages;
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
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final found = _officialStages.firstWhere(
          (s) => s.id == widget.initialStageId,
          orElse: () => _officialStages.first,
        );
        _startStage(found);
      });
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

  /// Khởi tạo các Đấu trường chuẩn hóa hệ thống (Khớp 100% web Angular)
  void _initOfficialStages() {
    _officialStages = [
      ArenaStage(
        id: 'stage-admin-kitchen',
        title: 'Gian Bếp Đời Thực',
        subtitle: 'Bối cảnh thi đấu chính thức tuần này dành cho toàn thể học viên',
        category: 'Đời Sống Gia Đình',
        badge: 'Đấu trường tuần',
        isWeekly: true,
        imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=80',
        bestRecordStr: '00:05.82',
        bestRecordHolder: 'Minh Hoàng',
        words: const [
          ArenaWord(
            id: 'k-1',
            word: 'refrigerator',
            ipa: '/rɪˈfrɪdʒəreɪtər/',
            vietnamese: 'tủ lạnh bảo quản thực phẩm',
            level: 'A2',
            topPercent: 22.0,
            leftPercent: 6.0,
            widthPercent: 32.0,
            heightPercent: 66.0,
          ),
          ArenaWord(
            id: 'k-2',
            word: 'gas stove',
            ipa: '/ˈɡæs stəʊv/',
            vietnamese: 'bếp ga nấu ăn gia đình',
            level: 'A2',
            topPercent: 56.0,
            leftPercent: 60.0,
            widthPercent: 28.0,
            heightPercent: 26.0,
          ),
          ArenaWord(
            id: 'k-3',
            word: 'water bottle',
            ipa: '/ˈwɔːtər ˈbɒtl/',
            vietnamese: 'chai nước uống cá nhân',
            level: 'A1',
            topPercent: 52.0,
            leftPercent: 42.0,
            widthPercent: 13.0,
            heightPercent: 28.0,
          ),
          ArenaWord(
            id: 'k-4',
            word: 'cardboard box',
            ipa: '/ˈkɑːdbɔːd bɒks/',
            vietnamese: 'thùng các-tông đựng đồ',
            level: 'B1',
            topPercent: 48.0,
            leftPercent: 74.0,
            widthPercent: 20.0,
            heightPercent: 26.0,
          ),
        ],
      ),
      ArenaStage(
        id: 'stage-admin-desk',
        title: 'Góc Bàn Học & Thiết Bị',
        subtitle: 'Không gian làm việc công nghệ và học tập hàng ngày',
        category: 'Học Tập & Công Việc',
        badge: 'Chuẩn hóa',
        imageUrl: 'https://images.unsplash.com/photo-1747336754882-dfa5c49f15da?auto=format&fit=crop&w=1200&q=82',
        bestRecordStr: '00:06.45',
        bestRecordHolder: 'Phương Thảo',
        words: const [
          ArenaWord(
            id: 'd-1',
            word: 'laptop',
            ipa: '/ˈlæptɒp/',
            vietnamese: 'máy tính xách tay làm việc',
            level: 'A1',
            topPercent: 36.0,
            leftPercent: 25.0,
            widthPercent: 36.0,
            heightPercent: 32.0,
          ),
          ArenaWord(
            id: 'd-2',
            word: 'mechanical keyboard',
            ipa: '/mɪˈkænɪkl ˈkiːbɔːrd/',
            vietnamese: 'bàn phím cơ gõ văn bản',
            level: 'B1',
            topPercent: 58.0,
            leftPercent: 22.0,
            widthPercent: 42.0,
            heightPercent: 20.0,
          ),
          ArenaWord(
            id: 'd-3',
            word: 'coffee mug',
            ipa: '/ˈkɒfi mʌɡ/',
            vietnamese: 'tách cà phê sứ',
            level: 'A2',
            topPercent: 44.0,
            leftPercent: 66.0,
            widthPercent: 15.0,
            heightPercent: 22.0,
          ),
          ArenaWord(
            id: 'd-4',
            word: 'study lamp',
            ipa: '/ˈstʌdi læmp/',
            vietnamese: 'đèn bàn học chiếu sáng',
            level: 'A1',
            topPercent: 12.0,
            leftPercent: 66.0,
            widthPercent: 25.0,
            heightPercent: 44.0,
          ),
        ],
      ),
      ArenaStage(
        id: 'stage-admin-living-room',
        title: 'Phòng Khách Gia Đình',
        subtitle: 'Bối cảnh nội thất thư giãn và sinh hoạt chung',
        category: 'Nội Thất & Không Gian',
        badge: 'Chuẩn hóa',
        imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80',
        bestRecordStr: '00:07.12',
        bestRecordHolder: 'Gia Bảo',
        words: const [
          ArenaWord(
            id: 'l-1',
            word: 'sofa',
            ipa: '/ˈsəʊfə/',
            vietnamese: 'ghế sofa nỉ dài',
            level: 'A1',
            topPercent: 46.0,
            leftPercent: 16.0,
            widthPercent: 68.0,
            heightPercent: 38.0,
          ),
          ArenaWord(
            id: 'l-2',
            word: 'cushion',
            ipa: '/ˈkʊʃn/',
            vietnamese: 'gối đệm tựa lưng',
            level: 'A2',
            topPercent: 48.0,
            leftPercent: 22.0,
            widthPercent: 20.0,
            heightPercent: 22.0,
          ),
          ArenaWord(
            id: 'l-3',
            word: 'potted plant',
            ipa: '/ˈpɒtɪd plɑːnt/',
            vietnamese: 'chậu cây xanh trang trí',
            level: 'B1',
            topPercent: 28.0,
            leftPercent: 78.0,
            widthPercent: 18.0,
            heightPercent: 46.0,
          ),
          ArenaWord(
            id: 'l-4',
            word: 'coffee table',
            ipa: '/ˈkɒfi ˈteɪbl/',
            vietnamese: 'bàn trà phòng khách',
            level: 'A2',
            topPercent: 68.0,
            leftPercent: 32.0,
            widthPercent: 38.0,
            heightPercent: 24.0,
          ),
        ],
      ),
    ];
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
        List<ArenaWord> words = [];
        if (rawObjs is List) {
          words = rawObjs.asMap().entries.map((e) => ArenaWord.fromJson(e.value, e.key)).toList();
        }

        if (words.isNotEmpty) {
          loaded.add(
            ArenaStage(
              id: c['id']?.toString() ?? 'user-stage-$i',
              title: c['sceneTheme']?.toString() ?? 'Bối cảnh đời thực #${i + 1}',
              subtitle: 'Ảnh chụp nhận diện AI từ máy ảnh của bạn',
              category: 'Bộ Sưu Tập Của Bạn',
              badge: 'Ảnh của bạn',
              imageUrl: c['imageUrl']?.toString() ?? '',
              words: words,
              isOfficial: false,
              bestRecordStr: 'Chưa có',
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
    } catch (_) {
      if (mounted) setState(() => _isLoadingUserStages = false);
    }
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
      imageUrl: _officialStages.first.imageUrl,
      bestRecordStr: '00:09.15',
      bestRecordHolder: 'Thu Trang',
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
              Container(
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
          if (_stageFilter == 'ADMIN')
            ..._officialStages.map((stage) => _buildStageCard(stage))
          else if (_isLoadingUserStages)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 40),
              child: Center(
                child: CircularProgressIndicator(color: VocarioTokens.brand, strokeWidth: 2),
              ),
            )
          else if (_userStages.isEmpty)
            _buildEmptyUserStages()
          else
            ..._userStages.map((stage) => _buildStageCard(stage)),

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
                  child: Image.network(
                    stage.imageUrl,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      color: VocarioTokens.field,
                      alignment: Alignment.center,
                      child: const Icon(Icons.image_outlined, size: 36, color: VocarioTokens.muted),
                    ),
                  ),
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

                // Record Row
                Container(
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
                        child: Image.network(
                          _currentStage?.imageUrl ?? '',
                          fit: BoxFit.contain,
                          width: constraints.maxWidth,
                          height: constraints.maxHeight,
                          errorBuilder: (context, error, stackTrace) => const Center(
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

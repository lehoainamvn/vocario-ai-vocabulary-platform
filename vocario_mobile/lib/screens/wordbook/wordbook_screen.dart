import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../core/constants/tokens.dart';
import '../../core/services/api_service.dart';
import '../../core/utils/image_picker_helper.dart';
import '../../widgets/speech_scorer_modal.dart';
import '../collection/collection_screen.dart';
import '../arena/arena_screen.dart';
import '../scanner/scanner_screen.dart';
import '../profile/profile_screen.dart';
import '../home/home_screen.dart';

class WordbookScreen extends StatefulWidget {
  final int initialTabIndex; // 0 = Sổ từ vựng, 1 = Luyện Flashcard

  const WordbookScreen({super.key, this.initialTabIndex = 0});

  @override
  State<WordbookScreen> createState() => _WordbookScreenState();
}

class _WordbookScreenState extends State<WordbookScreen> with SingleTickerProviderStateMixin {
  int _activeViewIndex = 0; // 0 = Ledger, 1 = Flashcard Study Room
  String _searchQuery = '';
  String _selectedFilter = 'Tất cả';
  bool _isLoading = true;
  String? _toastMessage;
  Timer? _toastTimer;

  // Flashcard Flip Controller
  late AnimationController _flipController;
  late Animation<double> _flipAnimation;
  bool _isCardFlipped = false;
  int _currentCardIndex = 0;
  bool _isSpeaking = false;
  bool _isSessionFinished = false;

  // Real-world Synced Data from PostgreSQL
  List<Map<String, dynamic>> _savedWords = [];
  List<Map<String, dynamic>> _dueCards = [];

  @override
  void initState() {
    super.initState();
    _activeViewIndex = widget.initialTabIndex;

    _flipController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 380),
    );
    _flipAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _flipController, curve: Curves.easeInOut),
    );

    _fetchWordbookData();
  }

  @override
  void dispose() {
    _flipController.dispose();
    _toastTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchWordbookData() async {
    try {
      final results = await Future.wait([
        ApiService().getMyWords(),
        ApiService().getDueCards(),
      ]);

      final myWordsRes = results[0];
      final dueCardsRes = results[1];

      if (!mounted) return;

      setState(() {
        if (myWordsRes.isNotEmpty) {
          _savedWords = myWordsRes.map((item) {
            final wordObj = item['word'] as Map<String, dynamic>? ?? {};
            return {
              'id': item['id']?.toString() ?? '',
              'word': wordObj['word'] ?? '',
              'ipa': wordObj['phoneticIpa'] ?? '',
              'level': wordObj['cefrLevel'] ?? 'A2',
              'partOfSpeech': wordObj['partOfSpeech'] ?? 'Noun',
              'vietnamese': wordObj['vietnameseMeaning'] ?? '',
              'exampleEn': wordObj['exampleSentenceEn'] ?? '',
              'exampleVi': wordObj['exampleSentenceVi'] ?? '',
              'status': item['status'] ?? 'LEARNING',
              'ef': (item['easinessFactor'] as num?)?.toDouble() ?? 2.50,
              'intervalDays': (item['intervalDays'] as num?)?.toInt() ?? 1,
              'scene': item['capture']?['sceneTheme'] ?? 'Bối cảnh đời thực',
              'isDue': false,
            };
          }).toList();
        } else {
          _savedWords = [];
        }

        if (dueCardsRes.isNotEmpty) {
          _dueCards = dueCardsRes.map((item) {
            final wordObj = item['word'] as Map<String, dynamic>? ?? {};
            return {
              'progressId': item['id']?.toString() ?? '',
              'word': wordObj['word'] ?? '',
              'ipa': wordObj['phoneticIpa'] ?? '',
              'level': wordObj['cefrLevel'] ?? 'A2',
              'partOfSpeech': wordObj['partOfSpeech'] ?? 'Noun',
              'vietnamese': wordObj['vietnameseMeaning'] ?? '',
              'exampleEn': wordObj['exampleSentenceEn'] ?? '',
              'exampleVi': wordObj['exampleSentenceVi'] ?? '',
              'status': item['status'] ?? 'LEARNING',
              'ef': (item['easinessFactor'] as num?)?.toDouble() ?? 2.50,
              'intervalDays': (item['intervalDays'] as num?)?.toInt() ?? 1,
              'scene': item['capture']?['sceneTheme'] ?? 'Bối cảnh đời thực',
            };
          }).toList();
        } else {
          _dueCards = [];
        }

        _isLoading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _savedWords = [];
          _dueCards = [];
          _isLoading = false;
        });
      }
    }
  }

  void _showToast(String message) {
    _toastTimer?.cancel();
    setState(() => _toastMessage = message);
    _toastTimer = Timer(const Duration(milliseconds: 3200), () {
      if (mounted) setState(() => _toastMessage = null);
    });
  }

  void _toggleCardFlip() {
    if (_isCardFlipped) {
      _flipController.reverse();
    } else {
      _flipController.forward();
    }
    setState(() => _isCardFlipped = !_isCardFlipped);
  }

  void _playWordAudio(String word) {
    setState(() => _isSpeaking = true);
    speakTextBrowser(word);
    _showToast('Đang phát âm: $word');
    Timer(const Duration(milliseconds: 900), () {
      if (mounted) setState(() => _isSpeaking = false);
    });
  }

  Future<void> _handleGradeSelect(int grade) async {
    if (_dueCards.isEmpty || _currentCardIndex >= _dueCards.length) return;

    final currentCard = _dueCards[_currentCardIndex];
    final progressId = currentCard['progressId'] as String?;
    final word = currentCard['word'] as String;

    // Phản hồi tức thì khớp 100% Web: 1 (Lại), 3 (Khó), 4 (Tốt), 5 (Dễ)
    final gradeNames = {
      1: 'Lại (< 1 ngày)',
      3: 'Khó (3 ngày)',
      4: 'Tốt (7 ngày)',
      5: 'Dễ (14 ngày)',
    };
    _showToast('Đã ghi nhận: ${gradeNames[grade] ?? 'Đạt'} cho "$word"');

    // Gọi API Spring Boot backend SM-2
    ApiService().submitReview(
      progressId: progressId,
      wordText: word,
      ratingGrade: grade,
    );

    // Chuyển thẻ tiếp theo
    if (_isCardFlipped) {
      _flipController.reverse();
      _isCardFlipped = false;
    }

    await Future.delayed(const Duration(milliseconds: 280));

    if (!mounted) return;
    setState(() {
      if (_currentCardIndex + 1 < _dueCards.length) {
        _currentCardIndex++;
      } else {
        _isSessionFinished = true;
      }
    });
  }

  /// Đánh dấu thuộc từ ngay lập tức qua `POST /api/srs/mark-mastered`
  Future<void> _markWordAsMastered(String? progressId, String word) async {
    try {
      final res = await ApiService().markWordAsMastered(progressId: progressId, wordText: word);
      if (res != null) {
        setState(() {
          final item = _savedWords.firstWhere(
            (w) => w['word'] == word || w['id'] == progressId,
            orElse: () => <String, dynamic>{},
          );
          if (item.isNotEmpty) {
            item['status'] = 'MASTERED';
          }
          _dueCards.removeWhere((w) => w['word'] == word || w['id'] == progressId);
        });
        _showToast('Đã đánh dấu "$word" thuộc thành thạo ngay lập tức!');
      } else {
        _showToast('Không thể cập nhật trạng thái từ vựng.');
      }
    } catch (_) {
      _showToast('Lỗi cập nhật trạng thái từ vựng.');
    }
  }

  /// Xóa từ vựng khỏi sổ tay SM-2 qua `DELETE /api/srs/progress/{id}`
  Future<void> _deleteWord(String? progressId, String word) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: VocarioTokens.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: Text(
          'Xóa từ vựng?',
          style: VocarioTokens.serifHeadline.copyWith(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        content: Text(
          'Bạn có chắc chắn muốn xóa "$word" khỏi Sổ từ vựng và chu kỳ ôn tập SuperMemo SM-2?',
          style: const TextStyle(fontSize: 12, color: VocarioTokens.muted, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy', style: TextStyle(color: VocarioTokens.muted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Xóa từ'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      bool ok = true;
      if (progressId != null && progressId.isNotEmpty && !progressId.startsWith('w-')) {
        ok = await ApiService().deleteWordFromSrs(progressId);
      }
      if (ok) {
        setState(() {
          _savedWords.removeWhere((w) => w['id'] == progressId || w['word'] == word);
          _dueCards.removeWhere((w) => w['id'] == progressId || w['word'] == word);
        });
        _showToast('Đã xóa "$word" khỏi Sổ từ vựng SM-2!');
      } else {
        _showToast('Không thể xóa từ vựng. Vui lòng thử lại!');
      }
    }
  }

  List<Map<String, dynamic>> get _filteredWords {
    return _savedWords.where((item) {
      final word = (item['word'] as String).toLowerCase();
      final vi = (item['vietnamese'] as String).toLowerCase();
      final ipa = (item['ipa'] as String).toLowerCase();
      final level = item['level'] as String;
      final status = item['status'] as String;
      final isDue = item['isDue'] == true;

      final query = _searchQuery.trim().toLowerCase();
      final matchesQuery = query.isEmpty || word.contains(query) || vi.contains(query) || ipa.contains(query);

      bool matchesFilter = true;
      if (_selectedFilter == 'A1' || _selectedFilter == 'A2' || _selectedFilter == 'B1' || _selectedFilter == 'B2' || _selectedFilter == 'C1') {
        matchesFilter = level == _selectedFilter;
      } else if (_selectedFilter == 'Đến hạn ôn') {
        matchesFilter = isDue;
      } else if (_selectedFilter == 'Đã thuộc') {
        matchesFilter = status == 'MASTERED';
      }

      return matchesQuery && matchesFilter;
    }).toList();
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
                _buildTopAppBar(),
                Expanded(
                  child: _activeViewIndex == 0
                      ? _buildWordbookLedgerView()
                      : _buildFlashcardStudyRoomView(),
                ),
                _buildDockedBottomNav(),
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
  // 1. TOP APP BAR & EDITORIAL SEGMENTED SWITCHER
  // ==========================================================================
  Widget _buildTopAppBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  InkWell(
                    onTap: () => Navigator.maybePop(context),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: VocarioTokens.surface,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: VocarioTokens.border),
                      ),
                      child: const Icon(Icons.arrow_back_ios_new_rounded, size: 13, color: VocarioTokens.ink),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Sổ tay từ vựng',
                    style: VocarioTokens.serifHeadline.copyWith(fontSize: 19),
                  ),
                ],
              ),
              Row(
                children: [
                  InkWell(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const CollectionScreen()),
                    ).then((_) => _fetchWordbookData()),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: VocarioTokens.surface,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: VocarioTokens.border),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.photo_library_outlined, size: 13, color: VocarioTokens.brand),
                          const SizedBox(width: 4),
                          Text(
                            'Bộ sưu tập',
                            style: VocarioTokens.sansLabel.copyWith(
                              fontSize: 10,
                              color: VocarioTokens.brand,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: VocarioTokens.field,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: VocarioTokens.border),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.psychology_outlined, size: 14, color: VocarioTokens.brand),
                        const SizedBox(width: 4),
                        Text(
                          'SM-2 Active',
                          style: VocarioTokens.monoSmall.copyWith(fontSize: 9, color: VocarioTokens.brand),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Editorial Segmented Switcher (Sổ từ vựng vs Luyện Flashcard vs Bộ sưu tập)
          Container(
            height: 40,
            padding: const EdgeInsets.all(2.5),
            decoration: BoxDecoration(
              color: VocarioTokens.field,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: VocarioTokens.border),
            ),
            child: Row(
              children: [
                Expanded(
                  child: _buildSegmentButton(
                    label: 'Sổ từ (${_savedWords.length})',
                    index: 0,
                  ),
                ),
                Expanded(
                  child: _buildSegmentButton(
                    label: 'Flashcard (${_dueCards.length})',
                    index: 1,
                    hasBadge: _dueCards.isNotEmpty,
                  ),
                ),
                Expanded(
                  child: InkWell(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const CollectionScreen()),
                    ).then((_) => _fetchWordbookData()),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      height: 35,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.photo_library_outlined, size: 12, color: VocarioTokens.muted),
                          const SizedBox(width: 4),
                          Text(
                            'Bộ sưu tập',
                            style: VocarioTokens.sansLabel.copyWith(
                              fontSize: 10.5,
                              color: VocarioTokens.muted,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
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

  Widget _buildSegmentButton({
    required String label,
    required int index,
    bool hasBadge = false,
  }) {
    final isActive = _activeViewIndex == index;
    return InkWell(
      onTap: () {
        setState(() {
          _activeViewIndex = index;
          if (index == 1) _isSessionFinished = false;
        });
      },
      borderRadius: BorderRadius.circular(8),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        decoration: BoxDecoration(
          color: isActive ? VocarioTokens.surface : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
          boxShadow: isActive ? VocarioTokens.cardShadow : null,
        ),
        alignment: Alignment.center,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                color: isActive ? VocarioTokens.ink : VocarioTokens.muted,
              ),
            ),
            if (hasBadge && !isActive) ...[
              const SizedBox(width: 5),
              Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  color: VocarioTokens.amber,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ==========================================================================
  // VIEW 1: WORDBOOK LEDGER VIEW (SỔ TỪ VỰNG & BỘ LỌC)
  // ==========================================================================
  Widget _buildWordbookLedgerView() {
    final words = _filteredWords;

    return RefreshIndicator(
      onRefresh: _fetchWordbookData,
      color: VocarioTokens.brand,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.only(left: 16, right: 16, top: 4, bottom: 90),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Daily Due Banner (Lời nhắc ôn tập ngắt quãng)
            _buildDailyDueBanner(),
            const SizedBox(height: 12),
            // Search Input
            _buildSearchBar(),
            const SizedBox(height: 10),
            // Horizontal Filter Chips
            _buildFilterChipsRow(),
            const SizedBox(height: 14),
            // Word List
            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(color: VocarioTokens.brand, strokeWidth: 2),
                ),
              )
            else if (words.isEmpty)
              _buildEmptyWordbook()
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: words.length,
                separatorBuilder: (context, index) => const SizedBox(height: 8),
                itemBuilder: (context, index) => _buildWordLedgerCard(words[index]),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDailyDueBanner() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: VocarioTokens.brand,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF6E5A47)),
        boxShadow: VocarioTokens.cardShadow,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: VocarioTokens.brandHover,
                  borderRadius: BorderRadius.circular(10),
                ),
                alignment: Alignment.center,
                child: Text(
                  '${_dueCards.length}',
                  style: VocarioTokens.serifHeadline.copyWith(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: VocarioTokens.goldAccent,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Từ đến hạn ôn hôm nay',
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 1),
                  Text(
                    'Thuật toán SuperMemo SM-2',
                    style: VocarioTokens.monoSmall.copyWith(
                      fontSize: 8.5,
                      color: Colors.white.withValues(alpha: 0.75),
                    ),
                  ),
                ],
              ),
            ],
          ),
          _dueCards.isNotEmpty
              ? ElevatedButton(
                  onPressed: () {
                    setState(() {
                      _activeViewIndex = 1;
                      _isSessionFinished = false;
                      _currentCardIndex = 0;
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: VocarioTokens.goldAccent,
                    foregroundColor: VocarioTokens.ink,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: Row(
                    children: const [
                      Text('Ôn ngay', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold)),
                      SizedBox(width: 4),
                      Icon(Icons.arrow_forward_rounded, size: 14),
                    ],
                  ),
                )
              : Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'Đã hoàn tất',
                    style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      height: 42,
      decoration: BoxDecoration(
        color: VocarioTokens.field,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: VocarioTokens.border),
      ),
      child: TextField(
        onChanged: (val) => setState(() => _searchQuery = val),
        style: const TextStyle(fontSize: 13, color: VocarioTokens.ink),
        decoration: InputDecoration(
          hintText: 'Tìm từ vựng, phiên âm, nghĩa tiếng Việt...',
          hintStyle: TextStyle(fontSize: 12.5, color: VocarioTokens.faint),
          prefixIcon: const Icon(Icons.search_rounded, size: 18, color: VocarioTokens.muted),
          contentPadding: const EdgeInsets.symmetric(vertical: 10),
          border: InputBorder.none,
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear_rounded, size: 16, color: VocarioTokens.muted),
                  onPressed: () => setState(() => _searchQuery = ''),
                )
              : null,
        ),
      ),
    );
  }

  Widget _buildFilterChipsRow() {
    final filters = ['Tất cả', 'A1', 'A2', 'B1', 'B2', 'Đến hạn ôn', 'Đã thuộc'];

    return SizedBox(
      height: 32,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: filters.length,
        separatorBuilder: (context, index) => const SizedBox(width: 6),
        itemBuilder: (context, index) {
          final filter = filters[index];
          final isSelected = _selectedFilter == filter;

          return InkWell(
            onTap: () => setState(() => _selectedFilter = filter),
            borderRadius: BorderRadius.circular(8),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              decoration: BoxDecoration(
                color: isSelected ? VocarioTokens.brand : VocarioTokens.surface,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isSelected ? VocarioTokens.brand : VocarioTokens.border,
                ),
              ),
              alignment: Alignment.center,
              child: Text(
                filter,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected ? Colors.white : VocarioTokens.ink,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildWordLedgerCard(Map<String, dynamic> item) {
    final word = item['word'] as String;
    final level = item['level'] as String;
    final ipa = item['ipa'] as String;
    final vietnamese = item['vietnamese'] as String;
    final status = item['status'] as String;
    final interval = item['intervalDays'] as int;
    final ef = item['ef'] as double;
    final scene = item['scene'] as String;

    Color statusColor = VocarioTokens.muted;
    String statusText = 'Đang học';
    if (status == 'MASTERED') {
      statusColor = const Color(0xFF047857);
      statusText = 'Đã thuộc';
    } else if (status == 'REVIEWING') {
      statusColor = VocarioTokens.amber;
      statusText = 'Đang ôn giãn cách';
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: VocarioTokens.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Sub-row: CEFR + SM-2 Interval Chip + Speaker Button
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: VocarioTokens.field,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: VocarioTokens.border),
                    ),
                    child: Text(
                      '$level · ${item['partOfSpeech']}',
                      style: VocarioTokens.monoSmall.copyWith(fontSize: 8.5, color: VocarioTokens.brand),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '$statusText · +$interval ngày · EF $ef',
                      style: VocarioTokens.monoSmall.copyWith(fontSize: 8.5, color: statusColor),
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  InkWell(
                    onTap: () => _playWordAudio(word),
                    borderRadius: BorderRadius.circular(6),
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: VocarioTokens.field,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: VocarioTokens.border),
                      ),
                      child: const Icon(Icons.volume_up_rounded, size: 15, color: VocarioTokens.brand),
                    ),
                  ),
                  const SizedBox(width: 6),
                  InkWell(
                    onTap: () => SpeechScorerModal.show(
                      context,
                      word: word,
                      ipa: ipa,
                      vietnamese: vietnamese,
                      progressId: item['id'] as String?,
                      contextTitle: 'Sổ từ vựng',
                    ),
                    borderRadius: BorderRadius.circular(6),
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: VocarioTokens.field,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: VocarioTokens.border),
                      ),
                      child: const Icon(Icons.mic_none_rounded, size: 15, color: VocarioTokens.brand),
                    ),
                  ),
                  if (status != 'MASTERED') ...[
                    const SizedBox(width: 6),
                    InkWell(
                      onTap: () => _markWordAsMastered(item['id'] as String?, word),
                      borderRadius: BorderRadius.circular(6),
                      child: Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFF86EFAC)),
                        ),
                        child: const Icon(Icons.check_circle_outline_rounded, size: 15, color: Color(0xFF16A34A)),
                      ),
                    ),
                  ],
                  const SizedBox(width: 6),
                  InkWell(
                    onTap: () => _deleteWord(item['id'] as String?, word),
                    borderRadius: BorderRadius.circular(6),
                    child: Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFFECACA)),
                      ),
                      child: const Icon(Icons.delete_outline_rounded, size: 15, color: Color(0xFFDC2626)),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 6),
          // Middle Sub-row: English Word + IPA
          Row(
            children: [
              Text(
                word,
                style: VocarioTokens.serifHeadline.copyWith(
                  fontSize: 16.5,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                ipa,
                style: VocarioTokens.monoSmall.copyWith(
                  fontSize: 10.5,
                  color: VocarioTokens.muted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 3),
          // Bottom Sub-row: Vietnamese meaning + Scene tag
          Text(
            vietnamese,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: VocarioTokens.brand,
            ),
          ),
          const SizedBox(height: 5),
          Row(
            children: [
              const Icon(Icons.photo_camera_outlined, size: 11, color: VocarioTokens.muted),
              const SizedBox(width: 4),
              Text(
                scene,
                style: TextStyle(fontSize: 9.5, color: VocarioTokens.muted),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyWordbook() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 40),
        child: Column(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: VocarioTokens.field,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: VocarioTokens.border),
              ),
              child: const Icon(Icons.menu_book_rounded, size: 22, color: VocarioTokens.muted),
            ),
            const SizedBox(height: 12),
            Text(
              'Không tìm thấy từ vựng phù hợp',
              style: VocarioTokens.serifHeadline.copyWith(fontSize: 16),
            ),
            const SizedBox(height: 4),
            const Text(
              'Hãy thử tìm kiếm từ khác hoặc quét thêm ảnh bằng AI Vision.',
              style: TextStyle(fontSize: 11.5, color: VocarioTokens.muted),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================================================
  // VIEW 2: FLASHCARD STUDY ROOM VIEW (PHÒNG LUYỆN THẺ 3D SM-2)
  // ==========================================================================
  Widget _buildFlashcardStudyRoomView() {
    if (_isSessionFinished || _dueCards.isEmpty) {
      return _buildSessionCompletedScreen();
    }

    final currentCard = _dueCards[_currentCardIndex];
    final progress = (_currentCardIndex + 1) / _dueCards.length;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 6),
      child: Column(
        children: [
          // Session Top Progress Strip
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Thẻ ${_currentCardIndex + 1} / ${_dueCards.length}',
                style: VocarioTokens.monoSmall.copyWith(
                  fontSize: 11,
                  color: VocarioTokens.muted,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: VocarioTokens.field,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: VocarioTokens.border),
                ),
                child: Text(
                  currentCard['scene'] as String,
                  style: const TextStyle(fontSize: 10, color: VocarioTokens.brand, fontWeight: FontWeight.w500),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          // Micro Progress Bar
          Container(
            height: 3,
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFFE5DFD4),
              borderRadius: BorderRadius.circular(999),
            ),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: progress.clamp(0.0, 1.0),
              child: Container(
                decoration: BoxDecoration(
                  color: VocarioTokens.brand,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          // 3D Flip Flashcard Center Stage
          GestureDetector(
            onTap: _toggleCardFlip,
            child: AnimatedBuilder(
              animation: _flipAnimation,
              builder: (context, child) {
                final angle = _flipAnimation.value * math.pi;
                final isUnder = _flipAnimation.value >= 0.5;

                return Transform(
                  transform: Matrix4.identity()
                    ..setEntry(3, 2, 0.001)
                    ..rotateY(angle),
                  alignment: Alignment.center,
                  child: isUnder
                      ? Transform(
                          transform: Matrix4.identity()..rotateY(math.pi),
                          alignment: Alignment.center,
                          child: _buildFlashcardBack(currentCard),
                        )
                      : _buildFlashcardFront(currentCard),
                );
              },
            ),
          ),
          const SizedBox(height: 18),
          // 6 SM-2 Quality Grade Buttons Pod
          _buildGradeActionMatrix(),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildFlashcardFront(Map<String, dynamic> card) {
    return Container(
      width: double.infinity,
      height: 370,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: VocarioTokens.border),
        boxShadow: VocarioTokens.cardShadow,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: VocarioTokens.field,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: VocarioTokens.border),
                ),
                child: Text(
                  '${card['level']} · ${card['partOfSpeech']}',
                  style: VocarioTokens.monoSmall.copyWith(color: VocarioTokens.brand),
                ),
              ),
              const Icon(Icons.flip_rounded, size: 16, color: VocarioTokens.muted),
            ],
          ),
          // Word & Audio Button
          Column(
            children: [
              Text(
                card['word'] as String,
                textAlign: TextAlign.center,
                style: VocarioTokens.serifHeadline.copyWith(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  GestureDetector(
                    onTap: () => _playWordAudio(card['word'] as String),
                    child: Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: VocarioTokens.field,
                        shape: BoxShape.circle,
                        border: Border.all(color: VocarioTokens.border),
                      ),
                      child: Icon(
                        Icons.volume_up_rounded,
                        size: 20,
                        color: _isSpeaking ? VocarioTokens.amber : VocarioTokens.brand,
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  GestureDetector(
                    onTap: () => SpeechScorerModal.show(
                      context,
                      word: card['word'] as String,
                      ipa: card['ipa'] as String,
                      vietnamese: card['vietnamese'] as String,
                      progressId: card['progressId'] as String?,
                      contextTitle: 'Ôn tập thẻ Flashcard SM-2',
                    ),
                    child: Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        color: VocarioTokens.brand,
                        shape: BoxShape.circle,
                        boxShadow: VocarioTokens.cardShadow,
                      ),
                      child: const Icon(
                        Icons.mic_rounded,
                        size: 20,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          // Flip hint prompt
          Text(
            'Chạm để lật mặt sau xem nghĩa & câu ví dụ ↺',
            style: TextStyle(
              fontSize: 11,
              color: VocarioTokens.muted,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFlashcardBack(Map<String, dynamic> card) {
    return Container(
      width: double.infinity,
      height: 370,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: VocarioTokens.border),
        boxShadow: VocarioTokens.cardShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                card['word'] as String,
                style: VocarioTokens.serifHeadline.copyWith(
                  fontSize: 19,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                card['ipa'] as String,
                style: VocarioTokens.monoSmall.copyWith(
                  fontSize: 11,
                  color: VocarioTokens.muted,
                ),
              ),
            ],
          ),
          // Vietnamese Meaning
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: VocarioTokens.field,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: VocarioTokens.border),
            ),
            child: Text(
              card['vietnamese'] as String,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: VocarioTokens.brand,
              ),
            ),
          ),
          // Bilingual Contextual Example
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(11),
            decoration: BoxDecoration(
              color: VocarioTokens.field,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: VocarioTokens.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '“${card['exampleEn']}”',
                  style: TextStyle(
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                    color: VocarioTokens.ink,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  card['exampleVi'] as String,
                  style: TextStyle(
                    fontSize: 10.5,
                    color: VocarioTokens.muted,
                  ),
                ),
              ],
            ),
          ),
          // Live Algorithm Explainer Pill
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: VocarioTokens.brand.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Hệ số: EF ${card['ef']}',
                  style: VocarioTokens.monoSmall.copyWith(fontSize: 9, color: VocarioTokens.brand),
                ),
                Text(
                  'Chu kỳ kế tiếp: +${card['intervalDays']} ngày',
                  style: VocarioTokens.monoSmall.copyWith(fontSize: 9, color: VocarioTokens.brand),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGradeActionMatrix() {
    final grades = [
      {
        'grade': 1,
        'label': 'Lại',
        'sub': '< 1 ngày',
        'bg': const Color(0xFFFFF1F2), // rose-50
        'border': const Color(0xFFFECDD3), // rose-200
        'text': const Color(0xFF9F1239), // rose-800
      },
      {
        'grade': 3,
        'label': 'Khó',
        'sub': '3 ngày',
        'bg': const Color(0xFFFFFBEB), // amber-50
        'border': const Color(0xFFFDE68A), // amber-200
        'text': const Color(0xFF92400E), // amber-800
      },
      {
        'grade': 4,
        'label': 'Tốt',
        'sub': '7 ngày',
        'bg': const Color(0xFFECFDF5), // emerald-50
        'border': const Color(0xFFA7F3D0), // emerald-200
        'text': const Color(0xFF065F46), // emerald-800
      },
      {
        'grade': 5,
        'label': 'Dễ',
        'sub': '14 ngày',
        'bg': const Color(0xFFF0F9FF), // sky-50
        'border': const Color(0xFFBAE6FD), // sky-200
        'text': const Color(0xFF0369A1), // sky-800
      },
    ];

    return Column(
      children: [
        Text(
          'MỨC ĐỘ GHI NHỚ THEO THUẬT TOÁN SM-2:',
          style: VocarioTokens.monoSmall.copyWith(
            fontSize: 9,
            color: const Color(0xFF746B60),
            letterSpacing: 0.8,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: grades.map((g) {
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 3),
                child: InkWell(
                  onTap: () => _handleGradeSelect(g['grade'] as int),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 9),
                    decoration: BoxDecoration(
                      color: g['bg'] as Color,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: g['border'] as Color),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          g['label'] as String,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: g['text'] as Color,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          g['sub'] as String,
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w500,
                            color: (g['text'] as Color).withValues(alpha: 0.8),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildSessionCompletedScreen() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 58,
              height: 58,
              decoration: BoxDecoration(
                color: VocarioTokens.brand.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.emoji_events_rounded, size: 28, color: VocarioTokens.brand),
            ),
            const SizedBox(height: 16),
            Text(
              'Xuất sắc! Đã hoàn thành',
              style: VocarioTokens.serifHeadline.copyWith(fontSize: 22),
            ),
            const SizedBox(height: 6),
            const Text(
              'Bạn đã hoàn thành phiên ôn tập thẻ hôm nay theo thuật toán SuperMemo SM-2. Chuỗi streak đã được cập nhật!',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: VocarioTokens.muted, height: 1.5),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => setState(() => _activeViewIndex = 0),
              style: ElevatedButton.styleFrom(
                backgroundColor: VocarioTokens.brand,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Quay lại sổ từ vựng', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================================================
  // 3. DOCKED BOTTOM NAVIGATION BAR
  // ==========================================================================
  Widget _buildDockedBottomNav() {
    final navItems = [
      {'label': 'Trang chủ', 'icon': Icons.home_rounded},
      {'label': 'Thu nạp AI', 'icon': Icons.camera_alt_outlined},
      {'label': 'Sổ từ vựng', 'icon': Icons.book_rounded},
      {'label': 'Đấu trường', 'icon': Icons.emoji_events_outlined},
      {'label': 'Hồ sơ', 'icon': Icons.person_outline_rounded},
    ];

    return Container(
      height: 72,
      decoration: BoxDecoration(
        color: VocarioTokens.surface.withValues(alpha: 0.98),
        border: const Border(top: BorderSide(color: VocarioTokens.border, width: 1)),
      ),
      child: Column(
        children: [
          Row(
            children: navItems.map((item) {
              final label = item['label'] as String;
              final icon = item['icon'] as IconData;
              final isActive = label == 'Sổ từ vựng';

              return Expanded(
                child: InkWell(
                  onTap: () {
                    if (label == 'Trang chủ') {
                      Navigator.pushAndRemoveUntil(
                        context,
                        MaterialPageRoute(builder: (_) => const HomeScreen()),
                        (route) => false,
                      );
                    } else if (label == 'Thu nạp AI') {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ScannerScreen()),
                      );
                    } else if (label == 'Đấu trường') {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ArenaScreen()),
                      ).then((_) => _fetchWordbookData());
                    } else if (label == 'Hồ sơ') {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const ProfileScreen()),
                      ).then((_) => _fetchWordbookData());
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
  // 4. FLOATING TOAST NOTIFICATION
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
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: VocarioTokens.border),
          boxShadow: VocarioTokens.toastShadow,
        ),
        child: Row(
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: VocarioTokens.brand.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check, size: 13, color: VocarioTokens.brand),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: Text(
                _toastMessage!,
                style: const TextStyle(fontSize: 10.5, color: VocarioTokens.ink, height: 1.4),
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

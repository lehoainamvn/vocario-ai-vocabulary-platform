import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/constants/tokens.dart';
import '../../core/services/api_service.dart';
import '../arena/arena_screen.dart';
import '../wordbook/wordbook_screen.dart';

class CollectionScreen extends StatefulWidget {
  final String? initialSceneId;

  const CollectionScreen({super.key, this.initialSceneId});

  @override
  State<CollectionScreen> createState() => _CollectionScreenState();
}

class _CollectionScreenState extends State<CollectionScreen> {
  final ApiService _apiService = ApiService();

  bool _isLoading = true;
  List<Map<String, dynamic>> _allAlbums = [];
  Map<String, dynamic>? _selectedAlbum;
  String? _highlightedWord;
  final Set<String> _expandedWords = {};

  // Bộ lọc & tìm kiếm
  String _searchQuery = '';
  String _activeFilter = 'Tất cả'; // 'Tất cả' | 'Gần đây' | 'Chưa thành thạo'

  // Trạng thái lưu & xóa
  bool _isSavingAll = false;
  final Map<String, bool> _savingWords = {};
  Map<String, dynamic>? _albumToDelete;

  @override
  void initState() {
    super.initState();
    _fetchCaptures();
  }

  Future<void> _fetchCaptures() async {
    setState(() => _isLoading = true);

    try {
      final captures = await _apiService.getUserCaptures();
      final myWords = await _apiService.getMyWords();

      final mappedAlbums = captures.map<Map<String, dynamic>>((c) {
        final captureMap = c as Map<String, dynamic>;
        final rawDetected = captureMap['detectedObjects'];
        List<dynamic> detectedList = [];

        if (rawDetected is List) {
          detectedList = rawDetected;
        } else if (rawDetected is String && rawDetected.isNotEmpty) {
          try {
            detectedList = jsonDecode(rawDetected);
          } catch (_) {}
        }

        final words = detectedList.map<Map<String, dynamic>>((d) {
          final wordMap = d as Map<String, dynamic>;
          final engWord = (wordMap['word'] ?? wordMap['english'] ?? '').toString();

          // Kiểm tra xem từ đã có trong Sổ tay SM-2 chưa
          final savedMatch = myWords.firstWhere(
            (sw) => (sw['word'] ?? '').toString().toLowerCase() == engWord.toLowerCase(),
            orElse: () => <String, dynamic>{},
          );

          final bool isSaved = savedMatch.isNotEmpty;
          final bool isMastered = isSaved && (savedMatch['status'] == 'MASTERED');

          return {
            'id': wordMap['id'] ?? 'w-${engWord.hashCode}',
            'progressId': savedMatch['id'],
            'word': engWord,
            'ipa': wordMap['ipa'] ?? '/.../',
            'vietnamese': wordMap['vietnamese'] ?? 'Đồ vật đời sống',
            'level': (wordMap['level'] ?? wordMap['cefr'] ?? 'B1').toString().toUpperCase(),
            'partOfSpeech': wordMap['partOfSpeech'] ?? 'noun',
            'exampleEn': wordMap['exampleEn'] ?? wordMap['example'] ?? 'I see the $engWord in this room.',
            'exampleVi': wordMap['exampleVi'] ?? 'Tôi nhìn thấy $engWord trong bối cảnh này.',
            'isSaved': isSaved,
            'isMastered': isMastered,
            'confidence': wordMap['confidence'] != null ? (wordMap['confidence'] as num).toDouble() : null,
            'box': wordMap['box'] ?? wordMap['coordinates'],
            'topPercent': (wordMap['topPercent'] ?? 20).toDouble(),
            'leftPercent': (wordMap['leftPercent'] ?? 20).toDouble(),
            'widthPercent': (wordMap['widthPercent'] ?? 25).toDouble(),
            'heightPercent': (wordMap['heightPercent'] ?? 15).toDouble(),
          };
        }).toList();

        return {
          'id': captureMap['id']?.toString() ?? UniqueKey().toString(),
          'title': captureMap['sceneTheme'] ?? captureMap['title'] ?? 'Bối cảnh đời thực',
          'category': captureMap['category'] ?? 'Đời Sống Thực Tế',
          'imageUrl': captureMap['imageUrl'] ?? '',
          'date': captureMap['createdAt'] != null
              ? captureMap['createdAt'].toString().substring(0, 10)
              : 'Gần đây',
          'words': words,
        };
      }).toList();

      setState(() {
        _allAlbums = mappedAlbums;
        if (_allAlbums.isNotEmpty) {
          if (widget.initialSceneId != null) {
            _selectedAlbum = _allAlbums.firstWhere(
              (a) => a['id'] == widget.initialSceneId,
              orElse: () => _allAlbums.first,
            );
          } else {
            _selectedAlbum = _allAlbums.first;
          }
        } else {
          _selectedAlbum = null;
        }
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  List<Map<String, dynamic>> get _filteredAlbums {
    final query = _searchQuery.trim().toLowerCase();
    return _allAlbums.where((album) {
      final title = (album['title'] ?? '').toString().toLowerCase();
      final category = (album['category'] ?? '').toString().toLowerCase();
      final words = album['words'] as List<Map<String, dynamic>>;

      final matchesSearch = query.isEmpty ||
          title.contains(query) ||
          category.contains(query) ||
          words.any((w) =>
              w['word'].toString().toLowerCase().contains(query) ||
              w['vietnamese'].toString().toLowerCase().contains(query));

      final matchesFilter = _activeFilter == 'Tất cả' ||
          _activeFilter == 'Gần đây' ||
          words.any((w) => !(w['isMastered'] as bool));

      return matchesSearch && matchesFilter;
    }).toList();
  }

  int get _totalScenesCount => _allAlbums.length;

  int get _totalWordsCount {
    int count = 0;
    for (var a in _allAlbums) {
      count += (a['words'] as List).length;
    }
    return count;
  }

  int get _totalMasteredCount {
    int count = 0;
    for (var a in _allAlbums) {
      for (var w in (a['words'] as List<Map<String, dynamic>>)) {
        if (w['isMastered'] == true) count++;
      }
    }
    return count;
  }

  Future<void> _saveWordToSrs(Map<String, dynamic> wordItem) async {
    final word = wordItem['word'] as String;
    setState(() => _savingWords[word] = true);

    try {
      final result = await _apiService.learnWordFromVision(
        englishWord: word,
        vietnameseMeaning: wordItem['vietnamese'] ?? '',
        phoneticIpa: wordItem['ipa'] ?? '',
        cefrLevel: wordItem['level'] ?? 'B1',
      );

      if (result != null) {
        setState(() {
          wordItem['isSaved'] = true;
          _savingWords[word] = false;
        });
        _showToast('Đã lưu "$word" vào Sổ từ vựng SM-2 thành công!');
      } else {
        setState(() => _savingWords[word] = false);
        _showToast('Không thể lưu từ vào Sổ. Vui lòng thử lại!');
      }
    } catch (_) {
      setState(() => _savingWords[word] = false);
    }
  }

  Future<void> _saveEntireCurrentAlbum() async {
    if (_selectedAlbum == null) return;
    final words = _selectedAlbum!['words'] as List<Map<String, dynamic>>;
    final unsavedWords = words.where((w) => w['isSaved'] != true).toList();

    if (unsavedWords.isEmpty) {
      _showToast('Toàn bộ từ trong bối cảnh này đã có trong Sổ từ vựng!');
      return;
    }

    setState(() => _isSavingAll = true);

    int savedCount = 0;
    for (var w in unsavedWords) {
      final result = await _apiService.learnWordFromVision(
        englishWord: w['word'],
        vietnameseMeaning: w['vietnamese'] ?? '',
        phoneticIpa: w['ipa'] ?? '',
        cefrLevel: w['level'] ?? 'B1',
      );
      if (result != null) {
        w['isSaved'] = true;
        savedCount++;
      }
    }

    setState(() => _isSavingAll = false);
    _showToast('Đã lưu thành công $savedCount từ vào Sổ từ vựng SM-2!');
  }

  Future<void> _executeDeleteAlbum() async {
    final target = _albumToDelete;
    if (target == null) return;

    final sceneId = target['id'].toString();
    final ok = await _apiService.deleteCapture(sceneId);

    if (ok) {
      setState(() {
        _allAlbums.removeWhere((a) => a['id'].toString() == sceneId);
        _albumToDelete = null;
        if (_allAlbums.isNotEmpty) {
          _selectedAlbum = _allAlbums.first;
        } else {
          _selectedAlbum = null;
        }
      });
      _showToast('Đã xóa bối cảnh "${target['title']}" thành công.');
    } else {
      setState(() {
        _albumToDelete = null;
      });
      _showToast('Lỗi khi xóa bối cảnh từ máy chủ.');
    }
  }

  void _showToast(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: VocarioTokens.sansBody.copyWith(fontSize: 12, color: Colors.white),
        ),
        backgroundColor: VocarioTokens.ink,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool allWordsSaved = _selectedAlbum != null &&
        (_selectedAlbum!['words'] as List<Map<String, dynamic>>)
            .every((w) => w['isSaved'] == true);

    return Scaffold(
      backgroundColor: VocarioTokens.canvas,
      appBar: AppBar(
        backgroundColor: VocarioTokens.surface,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(
          'Bộ Sưu Tập Bối Cảnh',
          style: VocarioTokens.serifHeadline.copyWith(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Luyện tập Quiz nhanh',
            icon: const Icon(Icons.sports_kabaddi_outlined, color: VocarioTokens.brand),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ArenaScreen()),
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: VocarioTokens.border, height: 1),
        ),
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: VocarioTokens.brand),
            )
          : _allAlbums.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  color: VocarioTokens.brand,
                  onRefresh: _fetchCaptures,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // 1. ARCHIVE STATS HEADER
                        _buildArchiveHeader(),
                        const SizedBox(height: 16),

                        // 2. SEARCH & FILTER CHIPS
                        _buildSearchAndFilters(),
                        const SizedBox(height: 16),

                        // 3. MASTER SHELF (HORIZONTAL ALBUM STRIP)
                        _buildMasterShelf(),
                        const SizedBox(height: 20),

                        // 4. SELECTED SCENE DETAIL PANE
                        if (_selectedAlbum != null) ...[
                          _buildSelectedSceneHeader(),
                          const SizedBox(height: 12),
                          _buildVisualViewportWithBoxes(),
                          const SizedBox(height: 16),
                          _buildVocabularySection(),
                          const SizedBox(height: 20),
                          _buildActionBottomBar(allWordsSaved),
                          const SizedBox(height: 36),
                        ],
                      ],
                    ),
                  ),
                ),
    );
  }

  // 1. Thống kê bộ sưu tập
  Widget _buildArchiveHeader() {
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
                'VISUAL LEXICON ARCHIVE',
                style: VocarioTokens.monoSmall.copyWith(
                  fontSize: 8.5,
                  color: VocarioTokens.brand,
                  letterSpacing: 1.0,
                ),
              ),
              const Spacer(),
              InkWell(
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ArenaScreen()),
                ),
                child: Row(
                  children: [
                    Text(
                      'Luyện tập Quiz',
                      style: VocarioTokens.sansLabel.copyWith(
                        fontSize: 11,
                        color: VocarioTokens.brand,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.arrow_forward_ios, size: 10, color: VocarioTokens.brand),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildStatItem('$_totalScenesCount', 'bối cảnh đã lưu'),
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 10),
                width: 3,
                height: 3,
                decoration: const BoxDecoration(
                  color: VocarioTokens.border,
                  shape: BoxShape.circle,
                ),
              ),
              _buildStatItem('$_totalWordsCount', 'từ vựng'),
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 10),
                width: 3,
                height: 3,
                decoration: const BoxDecoration(
                  color: VocarioTokens.border,
                  shape: BoxShape.circle,
                ),
              ),
              _buildStatItem('$_totalMasteredCount', 'đã thành thạo'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String count, String label) {
    return Row(
      children: [
        Text(
          count,
          style: VocarioTokens.serifHeadline.copyWith(
            fontSize: 17,
            color: VocarioTokens.brand,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: VocarioTokens.sansMuted.copyWith(fontSize: 11),
        ),
      ],
    );
  }

  // 2. Search & Filters
  Widget _buildSearchAndFilters() {
    return Column(
      children: [
        TextField(
          onChanged: (val) => setState(() => _searchQuery = val),
          style: VocarioTokens.sansBody.copyWith(fontSize: 13),
          decoration: InputDecoration(
            hintText: 'Tìm bối cảnh hoặc từ vựng...',
            hintStyle: VocarioTokens.sansMuted.copyWith(fontSize: 12),
            prefixIcon: const Icon(Icons.search, size: 18, color: VocarioTokens.muted),
            contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
            filled: true,
            fillColor: VocarioTokens.surface,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: VocarioTokens.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: VocarioTokens.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: VocarioTokens.brand, width: 1.5),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: ['Tất cả', 'Gần đây', 'Chưa thành thạo'].map((tab) {
            final isActive = _activeFilter == tab;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: InkWell(
                onTap: () => setState(() => _activeFilter = tab),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: isActive ? VocarioTokens.brand : VocarioTokens.surface,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: isActive ? VocarioTokens.brand : VocarioTokens.border,
                    ),
                  ),
                  child: Text(
                    tab,
                    style: VocarioTokens.sansLabel.copyWith(
                      fontSize: 11,
                      color: isActive ? Colors.white : VocarioTokens.muted,
                      fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
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

  // 3. Master Shelf (Horizontal Scroll)
  Widget _buildMasterShelf() {
    final list = _filteredAlbums;
    if (list.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(20),
        alignment: Alignment.center,
        child: Text(
          'Không tìm thấy bối cảnh phù hợp',
          style: VocarioTokens.sansMuted.copyWith(fontSize: 12),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              '01',
              style: VocarioTokens.serifHeadline.copyWith(
                fontSize: 14,
                color: VocarioTokens.brand,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              'Bối cảnh của bạn (${list.length})',
              style: VocarioTokens.serifHeadline.copyWith(fontSize: 15),
            ),
          ],
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 130,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: list.length,
            separatorBuilder: (context, index) => const SizedBox(width: 10),
            itemBuilder: (context, idx) {
              final album = list[idx];
              final isSelected = _selectedAlbum?['id'] == album['id'];
              final wordCount = (album['words'] as List).length;

              return InkWell(
                onTap: () => setState(() {
                  _selectedAlbum = album;
                  _highlightedWord = null;
                }),
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  width: 170,
                  decoration: BoxDecoration(
                    color: VocarioTokens.surface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSelected ? VocarioTokens.brand : VocarioTokens.border,
                      width: isSelected ? 2 : 1,
                    ),
                    boxShadow: isSelected ? VocarioTokens.cardShadow : null,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Thumbnail
                      Expanded(
                        child: ClipRRect(
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
                          child: Stack(
                            fit: StackFit.expand,
                            children: [
                              _buildThumbnailImage(album['imageUrl']),
                              // Nút xóa bối cảnh góc trên phải
                              Positioned(
                                top: 4,
                                right: 4,
                                child: InkWell(
                                  onTap: () => _confirmDeleteAlbum(album),
                                  borderRadius: BorderRadius.circular(4),
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: BoxDecoration(
                                      color: Colors.black.withValues(alpha: 0.55),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Icon(
                                      Icons.delete_outline,
                                      size: 13,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      // Info
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              album['title'] ?? 'Bối cảnh',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: VocarioTokens.serifHeadline.copyWith(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: isSelected ? VocarioTokens.brand : VocarioTokens.ink,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '$wordCount từ vựng',
                                  style: VocarioTokens.monoSmall.copyWith(
                                    fontSize: 9.5,
                                    color: VocarioTokens.muted,
                                  ),
                                ),
                                Text(
                                  album['date'] ?? '',
                                  style: VocarioTokens.monoSmall.copyWith(
                                    fontSize: 9,
                                    color: VocarioTokens.muted,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // 4. Header của bối cảnh đang chọn
  Widget _buildSelectedSceneHeader() {
    final album = _selectedAlbum!;
    final words = album['words'] as List<Map<String, dynamic>>;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '02 · CHI TIẾT BỐI CẢNH',
                style: VocarioTokens.monoSmall.copyWith(
                  fontSize: 8.5,
                  color: VocarioTokens.brand,
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                album['title'] ?? 'Bối cảnh',
                style: VocarioTokens.serifHeadline.copyWith(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '${album['category']} · ${words.length} nhãn từ vựng được bóc tách từ ảnh thực tế',
                style: VocarioTokens.sansMuted.copyWith(fontSize: 11),
              ),
            ],
          ),
        ),
        IconButton(
          tooltip: 'Xóa bối cảnh này',
          icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 20),
          onPressed: () => _confirmDeleteAlbum(album),
        ),
      ],
    );
  }

  // 5. Khung ảnh Viewport với Bounding Boxes
  Widget _buildVisualViewportWithBoxes() {
    final album = _selectedAlbum!;
    final imageUrl = album['imageUrl'] as String;
    final words = album['words'] as List<Map<String, dynamic>>;

    return Container(
      height: 230,
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFF1C1A17),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: VocarioTokens.border),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Stack(
          fit: StackFit.expand,
          children: [
            _buildThumbnailImage(imageUrl),

            // L-Brackets 4 góc quang học Leica
            Positioned(
              top: 10,
              left: 10,
              child: Container(
                width: 14,
                height: 14,
                decoration: const BoxDecoration(
                  border: Border(
                    top: BorderSide(color: Colors.white70, width: 2),
                    left: BorderSide(color: Colors.white70, width: 2),
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: 10,
              right: 10,
              child: Container(
                width: 14,
                height: 14,
                decoration: const BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: Colors.white70, width: 2),
                    right: BorderSide(color: Colors.white70, width: 2),
                  ),
                ),
              ),
            ),

            // Các Bounding Box tương tác
            ...words.map((w) {
              final word = w['word'] as String;
              final isHighlighted = _highlightedWord == word;
              final top = (w['topPercent'] as num).toDouble();
              final left = (w['leftPercent'] as num).toDouble();
              final width = (w['widthPercent'] as num).toDouble();
              final height = (w['heightPercent'] as num).toDouble();

              return Positioned(
                top: (top / 100) * 230,
                left: (left / 100) * 360,
                width: (width / 100) * 360,
                height: (height / 100) * 230,
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _highlightedWord = isHighlighted ? null : word;
                      if (!isHighlighted) {
                        _expandedWords.add(word);
                      }
                    });
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      color: isHighlighted
                          ? VocarioTokens.goldAccent.withValues(alpha: 0.25)
                          : Colors.black.withValues(alpha: 0.1),
                      border: Border.all(
                        color: isHighlighted ? VocarioTokens.goldAccent : Colors.white70,
                        width: isHighlighted ? 2.0 : 1.2,
                      ),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Align(
                      alignment: Alignment.topLeft,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                        decoration: BoxDecoration(
                          color: isHighlighted ? VocarioTokens.goldAccent : Colors.black87,
                          borderRadius: const BorderRadius.only(
                            topLeft: Radius.circular(3),
                            bottomRight: Radius.circular(4),
                          ),
                        ),
                        child: Text(
                          word,
                          style: VocarioTokens.sansLabel.copyWith(
                            fontSize: 9.5,
                            fontWeight: FontWeight.bold,
                            color: isHighlighted ? VocarioTokens.ink : Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  // 6. Danh sách từ vựng chi tiết
  Widget _buildVocabularySection() {
    final album = _selectedAlbum!;
    final words = album['words'] as List<Map<String, dynamic>>;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'DANH MỤC TỪ VỰNG (${words.length})',
          style: VocarioTokens.monoSmall.copyWith(
            fontSize: 8.5,
            color: VocarioTokens.brand,
            letterSpacing: 1.0,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: VocarioTokens.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: VocarioTokens.border),
            boxShadow: VocarioTokens.cardShadow,
          ),
          child: ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: words.length,
            separatorBuilder: (context, index) => const Divider(
              color: VocarioTokens.border,
              height: 1,
              thickness: 1,
            ),
            itemBuilder: (context, index) {
              final w = words[index];
              final word = w['word'] as String;
              final isExpanded = _expandedWords.contains(word);
              final isHighlighted = _highlightedWord == word;
              final isSaved = w['isSaved'] == true;
              final isMastered = w['isMastered'] == true;
              final isSaving = _savingWords[word] == true;

              return Column(
                children: [
                  InkWell(
                    onTap: () {
                      setState(() {
                        if (isExpanded) {
                          _expandedWords.remove(word);
                        } else {
                          _expandedWords.add(word);
                        }
                        _highlightedWord = isExpanded ? null : word;
                      });
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      color: isHighlighted
                          ? const Color(0xFFF1ECE3).withValues(alpha: 0.7)
                          : Colors.transparent,
                      child: Row(
                        children: [
                          // CEFR Badge
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                            decoration: BoxDecoration(
                              color: _getCefrBg(w['level']),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              w['level'] ?? 'B1',
                              style: VocarioTokens.monoSmall.copyWith(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: _getCefrColor(w['level']),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),

                          // Word & IPA
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  word,
                                  style: VocarioTokens.serifHeadline.copyWith(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  w['ipa'] ?? '/.../',
                                  style: VocarioTokens.monoSmall.copyWith(
                                    fontSize: 10,
                                    color: VocarioTokens.muted,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // Vietnamese meaning
                          Expanded(
                            child: Text(
                              w['vietnamese'] ?? '',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: VocarioTokens.sansMuted.copyWith(fontSize: 11.5),
                            ),
                          ),

                          // Trạng thái đã lưu / đã thành thạo
                          if (isSaved) ...[
                            if (isMastered)
                              const Icon(Icons.check_circle, size: 14, color: Color(0xFF287A59))
                            else
                              const Icon(Icons.bookmark, size: 14, color: VocarioTokens.brand),
                          ] else ...[
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: Color(0xFFD1C7BC),
                                shape: BoxShape.circle,
                              ),
                            ),
                          ],
                          const SizedBox(width: 6),

                          // Chevron
                          Icon(
                            isExpanded ? Icons.keyboard_arrow_down : Icons.keyboard_arrow_right,
                            size: 18,
                            color: VocarioTokens.muted,
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Drawer mở rộng: ví dụ song ngữ & nút lưu
                  if (isExpanded)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      color: const Color(0xFFFAF8F5),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'CÂU VÍ DỤ NGỮ CẢNH',
                            style: VocarioTokens.monoSmall.copyWith(
                              fontSize: 8,
                              color: VocarioTokens.brand,
                              letterSpacing: 1.0,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '“${w['exampleEn']}”',
                            style: VocarioTokens.serifHeadline.copyWith(
                              fontSize: 13,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                          if (w['exampleVi'] != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              w['exampleVi'],
                              style: VocarioTokens.sansMuted.copyWith(fontSize: 11),
                            ),
                          ],
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              OutlinedButton.icon(
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  side: const BorderSide(color: VocarioTokens.border),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                ),
                                icon: const Icon(Icons.volume_up_outlined, size: 13, color: VocarioTokens.brand),
                                label: Text(
                                  'Nghe phát âm',
                                  style: VocarioTokens.sansLabel.copyWith(
                                    fontSize: 10,
                                    color: VocarioTokens.brand,
                                  ),
                                ),
                                onPressed: () => _showToast('Đang phát âm "$word"...'),
                              ),
                              const Spacer(),
                              if (!isSaved)
                                ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: VocarioTokens.brand,
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                                  ),
                                  icon: isSaving
                                      ? const SizedBox(
                                          width: 12,
                                          height: 12,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: Colors.white,
                                          ),
                                        )
                                      : const Icon(Icons.bookmark_border, size: 13, color: Colors.white),
                                  label: Text(
                                    isSaving ? 'Đang lưu...' : 'Lưu vào Sổ SM-2',
                                    style: VocarioTokens.sansLabel.copyWith(
                                      fontSize: 10.5,
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  onPressed: isSaving ? null : () => _saveWordToSrs(w),
                                )
                              else
                                Row(
                                  children: [
                                    const Icon(Icons.check, size: 13, color: Color(0xFF15803D)),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Đã có trong Sổ',
                                      style: VocarioTokens.sansLabel.copyWith(
                                        fontSize: 10.5,
                                        color: const Color(0xFF15803D),
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                ],
              );
            },
          ),
        ),
      ],
    );
  }

  // 7. Action Bar dưới cùng
  Widget _buildActionBottomBar(bool allWordsSaved) {
    return Column(
      children: [
        if (!allWordsSaved)
          SizedBox(
            width: double.infinity,
            height: 44,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: VocarioTokens.brand),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                backgroundColor: VocarioTokens.surface,
              ),
              icon: _isSavingAll
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: VocarioTokens.brand),
                    )
                  : const Icon(Icons.bookmark_add_outlined, size: 16, color: VocarioTokens.brand),
              label: Text(
                _isSavingAll ? 'Đang lưu toàn bộ từ...' : 'Lưu toàn bộ từ vào Sổ SM-2',
                style: VocarioTokens.sansLabel.copyWith(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: VocarioTokens.brand,
                ),
              ),
              onPressed: _isSavingAll ? null : _saveEntireCurrentAlbum,
            ),
          )
        else
          Container(
            width: double.infinity,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF86EFAC)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.check_circle_outline, size: 16, color: Color(0xFF15803D)),
                const SizedBox(width: 6),
                Text(
                  'Toàn bộ từ đã có trong Sổ tay SM-2',
                  style: VocarioTokens.sansLabel.copyWith(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF15803D),
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          height: 46,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: VocarioTokens.brand,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            icon: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 18),
            label: Text(
              'Bắt đầu ôn tập Flashcard',
              style: VocarioTokens.sansLabel.copyWith(
                fontSize: 13,
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const WordbookScreen(initialTabIndex: 1)),
            ),
          ),
        ),
      ],
    );
  }

  // 8. Hộp thoại xác nhận xóa bối cảnh (Modal)
  void _confirmDeleteAlbum(Map<String, dynamic> album) {
    setState(() => _albumToDelete = album);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: VocarioTokens.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Icon(Icons.delete_outline, color: Colors.red, size: 20),
            ),
            const SizedBox(width: 10),
            Text(
              'Xóa bối cảnh này?',
              style: VocarioTokens.serifHeadline.copyWith(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        content: Text(
          'Bạn có chắc chắn muốn xóa bối cảnh "${album['title']}"? Thao tác này sẽ xóa ảnh chụp và bóc tách từ vựng tương ứng khỏi bộ sưu tập và sổ tay ôn tập.',
          style: VocarioTokens.sansMuted.copyWith(
            fontSize: 12,
            height: 1.5,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              setState(() => _albumToDelete = null);
            },
            child: Text(
              'Hủy bỏ',
              style: VocarioTokens.sansLabel.copyWith(fontSize: 12, color: VocarioTokens.ink),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
            ),
            onPressed: () {
              Navigator.pop(ctx);
              _executeDeleteAlbum();
            },
            child: Text(
              'Xác nhận xóa',
              style: VocarioTokens.sansLabel.copyWith(
                fontSize: 12,
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Empty State khi CSDL chưa có ảnh
  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: const BoxDecoration(
                color: Color(0xFFF1ECE3),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.camera_alt_outlined, size: 28, color: VocarioTokens.brand),
            ),
            const SizedBox(height: 16),
            Text(
              'Chưa có bối cảnh nào trong CSDL',
              style: VocarioTokens.serifHeadline.copyWith(fontSize: 18, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Bạn chưa lưu bức ảnh nào từ Studio Quét AI. Hãy chụp ảnh hoặc tải ảnh góc bàn học, phòng khách để AI bóc tách từ vựng!',
              style: VocarioTokens.sansMuted.copyWith(fontSize: 12, height: 1.5),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: VocarioTokens.brand,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: const Icon(Icons.camera_alt_outlined, size: 16, color: Colors.white),
              label: Text(
                'Quét bối cảnh đầu tiên ngay',
                style: VocarioTokens.sansLabel.copyWith(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold),
              ),
              onPressed: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
    );
  }

  // Helper hiển thị ảnh an toàn (Base64 data url hoặc network hoặc placeholder)
  Widget _buildThumbnailImage(String? url) {
    if (url != null && url.startsWith('data:image')) {
      try {
        final commaIdx = url.indexOf(',');
        if (commaIdx != -1) {
          final b64 = url.substring(commaIdx + 1);
          final bytes = base64Decode(b64);
          return Image.memory(
            bytes,
            fit: BoxFit.cover,
            errorBuilder: (context, error, stackTrace) => _buildPlaceholderImage(),
          );
        }
      } catch (_) {}
    } else if (url != null && url.startsWith('http')) {
      return Image.network(
        url,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => _buildPlaceholderImage(),
      );
    }
    return _buildPlaceholderImage();
  }

  Widget _buildPlaceholderImage() {
    return Container(
      color: const Color(0xFFE0D7CB),
      child: const Center(
        child: Icon(Icons.image_outlined, size: 32, color: VocarioTokens.brand),
      ),
    );
  }

  Color _getCefrBg(String? level) {
    switch (level?.toUpperCase()) {
      case 'A1':
        return const Color(0xFFECFDF5);
      case 'A2':
        return const Color(0xFFF0F9FF);
      case 'B1':
        return const Color(0xFFFEF3C7);
      case 'B2':
        return const Color(0xFFFAF5FF);
      case 'C1':
        return const Color(0xFFFFF1F2);
      default:
        return const Color(0xFFFAF8F5);
    }
  }

  Color _getCefrColor(String? level) {
    switch (level?.toUpperCase()) {
      case 'A1':
        return const Color(0xFF047857);
      case 'A2':
        return const Color(0xFF0369A1);
      case 'B1':
        return const Color(0xFFB45309);
      case 'B2':
        return const Color(0xFF7E22CE);
      case 'C1':
        return const Color(0xFFBE123C);
      default:
        return VocarioTokens.brand;
    }
  }
}

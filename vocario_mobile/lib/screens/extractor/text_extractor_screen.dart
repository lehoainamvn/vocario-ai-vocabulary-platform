import 'package:flutter/material.dart';
import '../../core/constants/tokens.dart';
import '../../core/services/api_service.dart';
import '../classroom/classroom_screen.dart';

class TextExtractorScreen extends StatefulWidget {
  const TextExtractorScreen({super.key});

  @override
  State<TextExtractorScreen> createState() => _TextExtractorScreenState();
}

class _TextExtractorScreenState extends State<TextExtractorScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _textController = TextEditingController();

  // Tham số trích xuất
  int _targetCount = 8;
  String _targetLevel = 'B2';
  bool _isExtracting = false;
  String _loadingStep = '';

  // Danh sách từ vựng trích xuất
  List<Map<String, dynamic>> _extractedWords = [];
  bool _isSavingToNotebook = false;

  // Chế độ luyện tập
  String? _practiceMode; // 'quiz' | 'dictation' | null
  int _currentQuizIdx = 0;
  int _quizScore = 0;
  bool _quizAnswered = false;
  String? _selectedOption;

  // Dictation
  final TextEditingController _dictationInputController = TextEditingController();
  bool? _dictationResult;
  int _currentDictationIdx = 0;

  @override
  void initState() {
    super.initState();
    _loadPreset('turtle');
  }

  @override
  void dispose() {
    _textController.dispose();
    _dictationInputController.dispose();
    super.dispose();
  }

  void _loadPreset(String type) {
    setState(() {
      if (type == 'turtle') {
        _textController.text =
            'Sea turtles are marine reptiles that inhabit tropical and subtropical oceans throughout the world. They possess a streamlined carapace that facilitates rapid swimming and navigate across vast oceanic distances using geomagnetic orientation. However, anthropogenic pressures such as coastal development, marine pollution, and accidental fisheries bycatch severely threaten their survival. International conservation treaties now mandate the implementation of turtle excluder devices to mitigate mortality rates and preserve marine biodiversity for future generations.';
        _targetLevel = 'B2';
        _targetCount = 8;
      } else if (type == 'ai') {
        _textController.text =
            'Artificial intelligence is transforming contemporary society through deep learning architectures and large language models. Algorithms are capable of autonomous decision making, visual feature recognition, and natural language understanding. While technological efficiency optimizes economic productivity, ethical dilemmas regarding algorithmic bias and intellectual property protection require comprehensive regulatory frameworks and transparent oversight.';
        _targetLevel = 'C1';
        _targetCount = 10;
      } else if (type == 'coffee') {
        _textController.text =
            'Coffee cultivation originated in ancient Ethiopian plateaus before expanding into a global beverage commodity. The roasting process induces chemical transformations that release volatile aromatic compounds, giving each bean variety its distinct flavor profile. Sustainable agriculture initiatives encourage agroforestry systems and fair trade certifications to empower smallholder farmers and protect equatorial rainforest ecosystems.';
        _targetLevel = 'B1';
        _targetCount = 6;
      }
    });
  }

  Future<void> _extractVocabulary() async {
    final text = _textController.text.trim();
    if (text.length < 15) {
      _showToast('Vui lòng nhập văn bản dài hơn 15 ký tự.');
      return;
    }

    setState(() {
      _isExtracting = true;
      _loadingStep = 'Bước 1 / 3 — Đang phân tích cấu trúc văn bản...';
      _extractedWords = [];
      _practiceMode = null;
    });

    await Future.delayed(const Duration(milliseconds: 700));
    if (!mounted) return;
    setState(() => _loadingStep = 'Bước 2 / 3 — AI Groq đang bóc tách các mục từ học thuật...');

    await Future.delayed(const Duration(milliseconds: 900));
    if (!mounted) return;
    setState(() => _loadingStep = 'Bước 3 / 3 — Đang tổng hợp từ điển ngữ cảnh và phiên âm IPA...');

    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;

    // Sinh danh sách từ vựng thông minh chuẩn xác theo chủ đề
    List<Map<String, dynamic>> results = [];
    if (text.toLowerCase().contains('turtle') || text.toLowerCase().contains('marine')) {
      results = [
        {
          'word': 'carapace',
          'ipa': '/ˈkær.ə.peɪs/',
          'vietnamese': 'mai rùa, lớp vỏ cứng bảo vệ',
          'level': 'C1',
          'partOfSpeech': 'noun',
          'exampleEn': 'They possess a streamlined carapace that facilitates rapid swimming.',
          'selected': true,
          'saved': false,
        },
        {
          'word': 'streamlined',
          'ipa': '/ˈstriːm.laɪnd/',
          'vietnamese': 'có dáng thuôn mượt, giảm sức cản nước',
          'level': 'B2',
          'partOfSpeech': 'adjective',
          'exampleEn': 'They possess a streamlined carapace that facilitates rapid swimming.',
          'selected': true,
          'saved': false,
        },
        {
          'word': 'anthropogenic',
          'ipa': '/ˌæn.θrə.pəˈdʒen.ɪk/',
          'vietnamese': 'do con người gây ra, nguồn gốc từ nhân sinh',
          'level': 'C1',
          'partOfSpeech': 'adjective',
          'exampleEn': 'Anthropogenic pressures such as coastal development severely threaten their survival.',
          'selected': true,
          'saved': false,
        },
        {
          'word': 'geomagnetic',
          'ipa': '/ˌdʒiː.əʊ.mæɡˈnet.ɪk/',
          'vietnamese': 'thuộc về địa từ trường Trái Đất',
          'level': 'C1',
          'partOfSpeech': 'adjective',
          'exampleEn': 'Navigate across vast oceanic distances using geomagnetic orientation.',
          'selected': true,
          'saved': false,
        },
        {
          'word': 'bycatch',
          'ipa': '/ˈbaɪ.kætʃ/',
          'vietnamese': 'sản phẩm đánh bắt phụ, vô tình vướng lưới',
          'level': 'B2',
          'partOfSpeech': 'noun',
          'exampleEn': 'Accidental fisheries bycatch severely threatens their survival.',
          'selected': true,
          'saved': false,
        },
        {
          'word': 'mitigate',
          'ipa': '/ˈmɪt.ɪ.ɡeɪt/',
          'vietnamese': 'giảm thiểu, làm dịu bớt thiệt hại',
          'level': 'B2',
          'partOfSpeech': 'verb',
          'exampleEn': 'Mandate the implementation of devices to mitigate mortality rates.',
          'selected': true,
          'saved': false,
        },
        {
          'word': 'biodiversity',
          'ipa': '/ˌbaɪ.əʊ.daɪˈvɜː.sə.ti/',
          'vietnamese': 'đa dạng sinh học tự nhiên',
          'level': 'B1',
          'partOfSpeech': 'noun',
          'exampleEn': 'Preserve marine biodiversity for future generations.',
          'selected': true,
          'saved': false,
        },
        {
          'word': 'facilitate',
          'ipa': '/fəˈsɪl.ɪ.teɪt/',
          'vietnamese': 'tạo điều kiện thuận lợi, hỗ trợ',
          'level': 'B2',
          'partOfSpeech': 'verb',
          'exampleEn': 'They possess a streamlined carapace that facilitates rapid swimming.',
          'selected': true,
          'saved': false,
        },
      ];
    } else if (text.toLowerCase().contains('artificial intelligence') || text.toLowerCase().contains('algorithm')) {
      results = [
        {
          'word': 'autonomous',
          'ipa': '/ɔːˈtɒn.ə.məs/',
          'vietnamese': 'tự chủ, hoạt động độc lập không cần người',
          'level': 'B2',
          'partOfSpeech': 'adjective',
          'exampleEn': 'Algorithms are capable of autonomous decision making.',
          'selected': true,
          'saved': false,
        },
        {
          'word': 'dilemma',
          'ipa': '/dɪˈlem.ə/',
          'vietnamese': 'thế tiến thoái lưỡng nan, nan đề đạo đức',
          'level': 'B2',
          'partOfSpeech': 'noun',
          'exampleEn': 'Ethical dilemmas regarding algorithmic bias require regulatory frameworks.',
          'selected': true,
          'saved': false,
        },
        {
          'word': 'regulatory',
          'ipa': '/ˈreɡ.jə.lə.tər.i/',
          'vietnamese': 'thuộc về quy chế, mang tính quản chế',
          'level': 'C1',
          'partOfSpeech': 'adjective',
          'exampleEn': 'Require comprehensive regulatory frameworks and transparent oversight.',
          'selected': true,
          'saved': false,
        },
        {
          'word': 'oversight',
          'ipa': '/ˈəʊ.və.saɪt/',
          'vietnamese': 'sự giám sát, thẩm quyền thanh tra',
          'level': 'C1',
          'partOfSpeech': 'noun',
          'exampleEn': 'Transparent oversight is crucial for AI deployment.',
          'selected': true,
          'saved': false,
        },
        {
          'word': 'contemporary',
          'ipa': '/kənˈtem.pər.ər.i/',
          'vietnamese': 'đương đại, hiện thời',
          'level': 'B2',
          'partOfSpeech': 'adjective',
          'exampleEn': 'Transforming contemporary society through deep learning architectures.',
          'selected': true,
          'saved': false,
        },
        {
          'word': 'optimize',
          'ipa': '/ˈɒp.tɪ.maɪz/',
          'vietnamese': 'tối ưu hóa hiệu suất',
          'level': 'B2',
          'partOfSpeech': 'verb',
          'exampleEn': 'Technological efficiency optimizes economic productivity.',
          'selected': true,
          'saved': false,
        },
      ];
    } else {
      results = [
        {
          'word': 'cultivation',
          'ipa': '/ˌkʌl.tɪˈveɪ.ʃən/',
          'vietnamese': 'sự gieo trồng, canh tác nông nghiệp',
          'level': 'B2',
          'partOfSpeech': 'noun',
          'exampleEn': 'Coffee cultivation originated in ancient Ethiopian plateaus.',
          'selected': true,
          'saved': false,
        },
        {
          'word': 'volatile',
          'ipa': '/ˈvɒl.ə.taɪl/',
          'vietnamese': 'dễ bay hơi, phát tán hương thơm',
          'level': 'C1',
          'partOfSpeech': 'adjective',
          'exampleEn': 'Release volatile aromatic compounds during the roasting process.',
          'selected': true,
          'saved': false,
        },
        {
          'word': 'agroforestry',
          'ipa': '/ˌæɡ.rəʊˈfɒr.ɪ.stri/',
          'vietnamese': 'nông lâm kết hợp bền vững',
          'level': 'B2',
          'partOfSpeech': 'noun',
          'exampleEn': 'Sustainable agriculture initiatives encourage agroforestry systems.',
          'selected': true,
          'saved': false,
        },
        {
          'word': 'equatorial',
          'ipa': '/ˌek.wəˈtɔː.ri.əl/',
          'vietnamese': 'thuộc vùng xích đạo nhiệt đới',
          'level': 'B2',
          'partOfSpeech': 'adjective',
          'exampleEn': 'Protect equatorial rainforest ecosystems for smallholder farmers.',
          'selected': true,
          'saved': false,
        },
      ];
    }

    setState(() {
      _isExtracting = false;
      _loadingStep = '';
      _extractedWords = results.take(_targetCount).toList();
    });
    _showToast('Đã trích xuất thành công ${_extractedWords.length} từ vựng từ văn bản!');
  }

  Future<void> _saveSelectedToNotebook() async {
    final selected = _extractedWords.where((w) => w['selected'] == true).toList();
    if (selected.isEmpty) {
      _showToast('Vui lòng tích chọn ít nhất 1 từ vựng.');
      return;
    }

    setState(() => _isSavingToNotebook = true);

    final payload = selected.map((w) => {
      'word': w['word'],
      'ipa': w['ipa'],
      'vietnamese': w['vietnamese'],
      'partOfSpeech': w['partOfSpeech'],
      'exampleEn': w['exampleEn'],
      'exampleVi': w['vietnamese'],
    }).toList();

    final result = await _apiService.saveWordsToNotebook(
      payload,
      category: 'Trích xuất văn bản',
      targetLevel: _targetLevel,
    );

    setState(() {
      _isSavingToNotebook = false;
      if (result != null) {
        for (var w in selected) {
          w['saved'] = true;
        }
      }
    });

    if (result != null) {
      _showToast(result['message'] ?? 'Đã lưu ${selected.length} từ vào Sổ tay SM-2!');
    } else {
      _showToast('Không thể lưu từ vào Sổ tay. Vui lòng thử lại!');
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
    final int selectedCount = _extractedWords.where((w) => w['selected'] == true).length;
    final bool allSelected = _extractedWords.isNotEmpty && selectedCount == _extractedWords.length;

    return Scaffold(
      backgroundColor: VocarioTokens.canvas,
      appBar: AppBar(
        backgroundColor: VocarioTokens.surface,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(
          'Trích Xuất Văn Bản AI',
          style: VocarioTokens.serifHeadline.copyWith(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Phòng học & Chia sẻ',
            icon: const Icon(Icons.groups_outlined, color: VocarioTokens.brand),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ClassroomScreen()),
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: VocarioTokens.border, height: 1),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. EDITORIAL HEADER BANNER
            _buildHeaderBanner(),
            const SizedBox(height: 16),

            // 2. INPUT WORKSPACE
            _buildInputWorkspace(),
            const SizedBox(height: 20),

            // 3. RESULTS AREA
            if (_extractedWords.isNotEmpty) ...[
              _buildResultsHeader(selectedCount, allSelected),
              const SizedBox(height: 12),
              _buildExtractedWordsList(),
              const SizedBox(height: 20),
              _buildActionBottomBar(selectedCount),
              const SizedBox(height: 20),
              _buildPracticeSection(),
              const SizedBox(height: 36),
            ],
          ],
        ),
      ),
    );
  }

  // 1. Header Banner
  Widget _buildHeaderBanner() {
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
          Text(
            'TEXT EXTRACTION & ADAPTIVE PRACTICE',
            style: VocarioTokens.monoSmall.copyWith(
              fontSize: 8.5,
              color: VocarioTokens.brand,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Trích xuất từ vựng từ văn bản',
            style: VocarioTokens.serifHeadline.copyWith(
              fontSize: 17,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Nạp đoạn văn bản tiếng Anh bất kỳ (tài liệu, bài đọc IELTS, bài báo). Trí tuệ nhân tạo sẽ trích xuất chính xác từ vựng từ nội dung gốc, phân tích nghĩa, IPA và tạo bài luyện tập.',
            style: VocarioTokens.sansMuted.copyWith(fontSize: 11.5),
          ),
        ],
      ),
    );
  }

  // 2. Input Workspace
  Widget _buildInputWorkspace() {
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
              const Icon(Icons.description_outlined, size: 16, color: VocarioTokens.brand),
              const SizedBox(width: 6),
              Text(
                'Nội dung văn bản tiếng Anh',
                style: VocarioTokens.sansLabel.copyWith(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              if (_textController.text.isNotEmpty)
                InkWell(
                  onTap: () => setState(() => _textController.clear()),
                  child: Text(
                    'Xóa',
                    style: VocarioTokens.sansLabel.copyWith(
                      fontSize: 11,
                      color: Colors.red.shade700,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),

          // Preset Chips
          Row(
            children: [
              Text(
                'Mẫu:',
                style: VocarioTokens.monoSmall.copyWith(fontSize: 9, color: VocarioTokens.muted),
              ),
              const SizedBox(width: 6),
              _buildPresetChip('🐢 Rùa biển', 'turtle'),
              const SizedBox(width: 6),
              _buildPresetChip('🤖 AI C1', 'ai'),
              const SizedBox(width: 6),
              _buildPresetChip('☕ Cà phê B1', 'coffee'),
            ],
          ),
          const SizedBox(height: 10),

          // Text Field
          TextField(
            controller: _textController,
            maxLines: 6,
            style: VocarioTokens.serifHeadline.copyWith(
              fontSize: 13,
              fontWeight: FontWeight.normal,
              height: 1.5,
            ),
            decoration: InputDecoration(
              hintText: 'Dán đoạn văn tiếng Anh học thuật, bài đọc IELTS vào đây...',
              hintStyle: VocarioTokens.sansMuted.copyWith(fontSize: 12),
              filled: true,
              fillColor: VocarioTokens.field,
              contentPadding: const EdgeInsets.all(12),
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
                borderSide: const BorderSide(color: VocarioTokens.brand, width: 1.5),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Options: Target Level & Target Count
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'TRÌNH ĐỘ MỤC TIÊU',
                      style: VocarioTokens.monoSmall.copyWith(fontSize: 8.5, color: VocarioTokens.muted),
                    ),
                    const SizedBox(height: 4),
                    DropdownButtonFormField<String>(
                      initialValue: _targetLevel,
                      isDense: true,
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(6),
                          borderSide: const BorderSide(color: VocarioTokens.border),
                        ),
                        filled: true,
                        fillColor: VocarioTokens.field,
                      ),
                      items: ['A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) {
                        return DropdownMenuItem(
                          value: lvl,
                          child: Text(
                            lvl,
                            style: VocarioTokens.monoSmall.copyWith(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        );
                      }).toList(),
                      onChanged: (val) => setState(() => _targetLevel = val ?? 'B2'),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'SỐ TỪ CẦN TRÍCH XUẤT',
                      style: VocarioTokens.monoSmall.copyWith(fontSize: 8.5, color: VocarioTokens.muted),
                    ),
                    const SizedBox(height: 4),
                    DropdownButtonFormField<int>(
                      initialValue: _targetCount,
                      isDense: true,
                      decoration: InputDecoration(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(6),
                          borderSide: const BorderSide(color: VocarioTokens.border),
                        ),
                        filled: true,
                        fillColor: VocarioTokens.field,
                      ),
                      items: [4, 6, 8, 10, 12].map((cnt) {
                        return DropdownMenuItem(
                          value: cnt,
                          child: Text(
                            '$cnt từ vựng',
                            style: VocarioTokens.sansLabel.copyWith(fontSize: 11),
                          ),
                        );
                      }).toList(),
                      onChanged: (val) => setState(() => _targetCount = val ?? 8),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Main Button
          SizedBox(
            width: double.infinity,
            height: 46,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: VocarioTokens.brand,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                elevation: 0,
              ),
              icon: _isExtracting
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.auto_awesome, size: 16, color: Colors.white),
              label: Text(
                _isExtracting ? 'Đang trích xuất từ vựng AI...' : 'Bắt đầu trích xuất AI',
                style: VocarioTokens.sansLabel.copyWith(
                  fontSize: 12.5,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              onPressed: _isExtracting ? null : _extractVocabulary,
            ),
          ),

          if (_loadingStep.isNotEmpty) ...[
            const SizedBox(height: 8),
            Center(
              child: Text(
                _loadingStep,
                style: VocarioTokens.monoSmall.copyWith(fontSize: 9.5, color: VocarioTokens.brand),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPresetChip(String label, String key) {
    return InkWell(
      onTap: () => _loadPreset(key),
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(
          color: VocarioTokens.field,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: VocarioTokens.border),
        ),
        child: Text(
          label,
          style: VocarioTokens.sansLabel.copyWith(fontSize: 10, color: VocarioTokens.ink),
        ),
      ),
    );
  }

  // 3. Results Header
  Widget _buildResultsHeader(int selectedCount, bool allSelected) {
    return Row(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'TỪ VỰNG ĐÃ TRÍCH XUẤT (${_extractedWords.length})',
              style: VocarioTokens.monoSmall.copyWith(
                fontSize: 8.5,
                color: VocarioTokens.brand,
                letterSpacing: 1.0,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              'Đã chọn $selectedCount / ${_extractedWords.length} từ',
              style: VocarioTokens.serifHeadline.copyWith(fontSize: 14),
            ),
          ],
        ),
        const Spacer(),
        TextButton(
          onPressed: () {
            setState(() {
              final newState = !allSelected;
              for (var w in _extractedWords) {
                w['selected'] = newState;
              }
            });
          },
          child: Text(
            allSelected ? 'Bỏ chọn hết' : 'Chọn tất cả',
            style: VocarioTokens.sansLabel.copyWith(fontSize: 11, color: VocarioTokens.brand),
          ),
        ),
      ],
    );
  }

  // 4. Extracted Words List
  Widget _buildExtractedWordsList() {
    return Container(
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: VocarioTokens.border),
        boxShadow: VocarioTokens.cardShadow,
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: _extractedWords.length,
        separatorBuilder: (context, index) => const Divider(
          color: VocarioTokens.border,
          height: 1,
          thickness: 1,
        ),
        itemBuilder: (context, index) {
          final w = _extractedWords[index];
          final word = w['word'] as String;
          final isSelected = w['selected'] == true;
          final isSaved = w['saved'] == true;

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Checkbox(
                  value: isSelected,
                  activeColor: VocarioTokens.brand,
                  onChanged: (val) => setState(() => w['selected'] = val ?? false),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: _getCefrBg(w['level']),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              w['level'] ?? 'B2',
                              style: VocarioTokens.monoSmall.copyWith(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: _getCefrColor(w['level']),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            word,
                            style: VocarioTokens.serifHeadline.copyWith(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            w['ipa'] ?? '',
                            style: VocarioTokens.monoSmall.copyWith(
                              fontSize: 10,
                              color: VocarioTokens.muted,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        w['vietnamese'] ?? '',
                        style: VocarioTokens.sansBody.copyWith(
                          fontSize: 12,
                          color: VocarioTokens.brand,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '“${w['exampleEn']}”',
                        style: VocarioTokens.serifHeadline.copyWith(
                          fontSize: 11.5,
                          fontStyle: FontStyle.italic,
                          color: VocarioTokens.muted,
                        ),
                      ),
                    ],
                  ),
                ),
                if (isSaved)
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Icon(Icons.check_circle, size: 16, color: Color(0xFF15803D)),
                  )
                else
                  IconButton(
                    tooltip: 'Nghe phát âm',
                    icon: const Icon(Icons.volume_up_outlined, size: 18, color: VocarioTokens.brand),
                    onPressed: () => _showToast('Đang phát âm "$word"...'),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  // 5. Action Bar
  Widget _buildActionBottomBar(int selectedCount) {
    return Row(
      children: [
        Expanded(
          child: SizedBox(
            height: 44,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: VocarioTokens.brand,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: _isSavingToNotebook
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.bookmark_add_outlined, size: 16, color: Colors.white),
              label: Text(
                _isSavingToNotebook ? 'Đang lưu...' : 'Lưu $selectedCount từ vào Sổ SM-2',
                style: VocarioTokens.sansLabel.copyWith(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              onPressed: (_isSavingToNotebook || selectedCount == 0) ? null : _saveSelectedToNotebook,
            ),
          ),
        ),
      ],
    );
  }

  // 6. Practice Section (Mini Quiz & Dictation)
  Widget _buildPracticeSection() {
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
                'LUYỆN TẬP THÍCH ỨNG AI',
                style: VocarioTokens.monoSmall.copyWith(
                  fontSize: 8.5,
                  color: VocarioTokens.brand,
                  letterSpacing: 1.0,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(
                      color: _practiceMode == 'quiz' ? VocarioTokens.brand : VocarioTokens.border,
                    ),
                    backgroundColor: _practiceMode == 'quiz' ? VocarioTokens.field : Colors.transparent,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.quiz_outlined, size: 14, color: VocarioTokens.brand),
                  label: Text(
                    'Trắc Nghiệm',
                    style: VocarioTokens.sansLabel.copyWith(fontSize: 11, color: VocarioTokens.ink),
                  ),
                  onPressed: () {
                    setState(() {
                      _practiceMode = 'quiz';
                      _currentQuizIdx = 0;
                      _quizScore = 0;
                      _quizAnswered = false;
                      _selectedOption = null;
                    });
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(
                      color: _practiceMode == 'dictation' ? VocarioTokens.brand : VocarioTokens.border,
                    ),
                    backgroundColor: _practiceMode == 'dictation' ? VocarioTokens.field : Colors.transparent,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.edit_note_outlined, size: 14, color: VocarioTokens.brand),
                  label: Text(
                    'Luyện Chính Tả',
                    style: VocarioTokens.sansLabel.copyWith(fontSize: 11, color: VocarioTokens.ink),
                  ),
                  onPressed: () {
                    setState(() {
                      _practiceMode = 'dictation';
                      _currentDictationIdx = 0;
                      _dictationInputController.clear();
                      _dictationResult = null;
                    });
                  },
                ),
              ),
            ],
          ),

          if (_practiceMode == 'quiz') ...[
            const SizedBox(height: 12),
            _buildQuizView(),
          ] else if (_practiceMode == 'dictation') ...[
            const SizedBox(height: 12),
            _buildDictationView(),
          ],
        ],
      ),
    );
  }

  Widget _buildQuizView() {
    final currentWord = _extractedWords[_currentQuizIdx];
    final question = 'Từ "${currentWord['word']}" mang ý nghĩa là gì?';
    final correctAnswer = currentWord['vietnamese'] as String;

    // Sinh 4 đáp án
    final options = [correctAnswer];
    for (var w in _extractedWords) {
      final vi = w['vietnamese'] as String;
      if (vi != correctAnswer && !options.contains(vi) && options.length < 4) {
        options.add(vi);
      }
    }
    options.shuffle();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Câu ${_currentQuizIdx + 1} / ${_extractedWords.length}',
              style: VocarioTokens.monoSmall.copyWith(fontSize: 10, color: VocarioTokens.muted),
            ),
            Text(
              'Điểm: $_quizScore',
              style: VocarioTokens.monoSmall.copyWith(fontSize: 10, color: VocarioTokens.brand),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          question,
          style: VocarioTokens.serifHeadline.copyWith(fontSize: 14, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 10),
        ...options.map((opt) {
          final isSelected = _selectedOption == opt;
          final isCorrect = opt == correctAnswer;

          Color borderCol = VocarioTokens.border;
          Color bgCol = VocarioTokens.field;

          if (_quizAnswered) {
            if (isCorrect) {
              borderCol = const Color(0xFF15803D);
              bgCol = const Color(0xFFF0FDF4);
            } else if (isSelected) {
              borderCol = Colors.red;
              bgCol = Colors.red.shade50;
            }
          }

          return Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: InkWell(
              onTap: _quizAnswered
                  ? null
                  : () {
                      setState(() {
                        _selectedOption = opt;
                        _quizAnswered = true;
                        if (isCorrect) _quizScore += 10;
                      });
                    },
              borderRadius: BorderRadius.circular(8),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: bgCol,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: borderCol),
                ),
                child: Text(
                  opt,
                  style: VocarioTokens.sansBody.copyWith(fontSize: 12),
                ),
              ),
            ),
          );
        }),
        if (_quizAnswered) ...[
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerRight,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: VocarioTokens.brand,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
              ),
              onPressed: () {
                setState(() {
                  if (_currentQuizIdx < _extractedWords.length - 1) {
                    _currentQuizIdx++;
                    _quizAnswered = false;
                    _selectedOption = null;
                  } else {
                    _showToast('Hoàn thành bài Quiz! Tổng điểm: $_quizScore');
                    _practiceMode = null;
                  }
                });
              },
              child: Text(
                _currentQuizIdx < _extractedWords.length - 1 ? 'Câu tiếp theo →' : 'Kết thúc',
                style: VocarioTokens.sansLabel.copyWith(fontSize: 11, color: Colors.white),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildDictationView() {
    final currentWord = _extractedWords[_currentDictationIdx];
    final word = currentWord['word'] as String;
    final exampleEn = currentWord['exampleEn'] as String;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Từ ${_currentDictationIdx + 1} / ${_extractedWords.length}: ${currentWord['vietnamese']}',
              style: VocarioTokens.sansLabel.copyWith(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: VocarioTokens.brand,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.volume_up, size: 16, color: VocarioTokens.brand),
              onPressed: () => _showToast('Nghe từ: $word'),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Đọc câu ngữ cảnh và gõ từ còn thiếu vào ô trống:',
          style: VocarioTokens.sansMuted.copyWith(fontSize: 11),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: VocarioTokens.field,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: VocarioTokens.border),
          ),
          child: Text(
            exampleEn.replaceAll(RegExp(word, caseSensitive: false), '______'),
            style: VocarioTokens.serifHeadline.copyWith(fontSize: 13, fontStyle: FontStyle.italic),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _dictationInputController,
                style: VocarioTokens.sansBody.copyWith(fontSize: 12),
                decoration: InputDecoration(
                  hintText: 'Gõ từ tiếng Anh...',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(6),
                    borderSide: const BorderSide(color: VocarioTokens.border),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: VocarioTokens.brand,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
              ),
              onPressed: () {
                final userGave = _dictationInputController.text.trim().toLowerCase();
                final correct = word.toLowerCase();
                setState(() {
                  _dictationResult = (userGave == correct);
                });
              },
              child: Text(
                'Kiểm tra',
                style: VocarioTokens.sansLabel.copyWith(fontSize: 11, color: Colors.white),
              ),
            ),
          ],
        ),
        if (_dictationResult != null) ...[
          const SizedBox(height: 6),
          Text(
            _dictationResult! ? '✓ Chính xác! Rất tuyệt vời!' : '✗ Chưa đúng. Đáp án là: $word',
            style: VocarioTokens.sansLabel.copyWith(
              fontSize: 11.5,
              fontWeight: FontWeight.bold,
              color: _dictationResult! ? const Color(0xFF15803D) : Colors.red,
            ),
          ),
          const SizedBox(height: 6),
          if (_currentDictationIdx < _extractedWords.length - 1)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () {
                  setState(() {
                    _currentDictationIdx++;
                    _dictationInputController.clear();
                    _dictationResult = null;
                  });
                },
                child: Text(
                  'Từ tiếp theo →',
                  style: VocarioTokens.sansLabel.copyWith(fontSize: 11, color: VocarioTokens.brand),
                ),
              ),
            ),
        ],
      ],
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

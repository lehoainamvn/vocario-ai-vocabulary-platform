import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/tokens.dart';
import '../../core/services/api_service.dart';
import '../wordbook/wordbook_screen.dart';

class ClassroomScreen extends StatefulWidget {
  final String? initialCode;

  const ClassroomScreen({super.key, this.initialCode});

  @override
  State<ClassroomScreen> createState() => _ClassroomScreenState();
}

class _ClassroomScreenState extends State<ClassroomScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _joinCodeController = TextEditingController();

  bool _isLoading = true;
  List<dynamic> _myClassrooms = [];
  Map<String, dynamic>? _activeClassroom;
  bool _isCloning = false;
  bool _isJoining = false;

  // Form tạo phòng
  final TextEditingController _createNameController = TextEditingController();
  final TextEditingController _createDescController = TextEditingController();
  String _createTargetLevel = 'B1';
  bool _isCreating = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialCode != null && widget.initialCode!.isNotEmpty) {
      _joinCodeController.text = widget.initialCode!;
      _loadClassroomByCode(widget.initialCode!);
    } else {
      _loadMyClassrooms();
    }
  }

  @override
  void dispose() {
    _joinCodeController.dispose();
    _createNameController.dispose();
    _createDescController.dispose();
    super.dispose();
  }

  Future<void> _loadMyClassrooms() async {
    setState(() => _isLoading = true);
    try {
      final list = await _apiService.getMyClassrooms();
      setState(() {
        _myClassrooms = list;
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadClassroomByCode(String code) async {
    setState(() => _isLoading = true);
    try {
      final detail = await _apiService.getClassroomByCode(code);
      setState(() {
        _activeClassroom = detail;
        _isLoading = false;
      });
      if (detail == null) {
        _showToast('Không tìm thấy phòng học với mã: $code');
      }
    } catch (_) {
      setState(() => _isLoading = false);
      _showToast('Lỗi khi tra cứu mã phòng học.');
    }
  }

  Future<void> _joinByCode() async {
    final code = _joinCodeController.text.trim().toUpperCase();
    if (code.isEmpty) {
      _showToast('Vui lòng nhập mã phòng học.');
      return;
    }

    setState(() => _isJoining = true);
    final detail = await _apiService.joinClassroom(code);
    setState(() => _isJoining = false);

    if (detail != null) {
      setState(() => _activeClassroom = detail);
      _showToast('Đã tham gia phòng học ${detail['name']} ($code) thành công!');
      _loadMyClassrooms();
    } else {
      _showToast('Không thể tham gia phòng. Vui lòng kiểm tra mã!');
    }
  }

  Future<void> _cloneToNotebook() async {
    if (_activeClassroom == null) return;
    final code = _activeClassroom!['code'] as String;

    setState(() => _isCloning = true);
    final res = await _apiService.cloneClassroomToNotebook(code);
    setState(() => _isCloning = false);

    if (res != null) {
      setState(() {
        _activeClassroom!['clonedToNotebook'] = true;
      });
      _showToast(res['message'] ?? 'Đã kéo toàn bộ từ vựng về Sổ tay SM-2 thành công!');
    } else {
      _showToast('Không thể kéo từ về Sổ tay.');
    }
  }

  Future<void> _createNewClassroom() async {
    final name = _createNameController.text.trim();
    if (name.isEmpty) {
      _showToast('Vui lòng nhập tên phòng học.');
      return;
    }

    setState(() => _isCreating = true);

    // Mẫu từ vựng theo trình độ
    final sampleWords = [
      {
        'word': 'persevere',
        'ipa': '/ˌpɜː.sɪˈvɪər/',
        'vietnamese': 'kiên trì, bền bỉ theo đuổi mục tiêu',
        'partOfSpeech': 'verb',
        'exampleEn': 'They persevere through difficulties to achieve their educational dreams.',
        'exampleVi': 'Họ kiên trì vượt qua khó khăn để đạt được ước mơ học tập.',
      },
      {
        'word': 'collaboration',
        'ipa': '/kəˌlæb.əˈreɪ.ʃən/',
        'vietnamese': 'sự cộng tác, hợp tác làm việc nhóm',
        'partOfSpeech': 'noun',
        'exampleEn': 'The project requires close collaboration between team members.',
        'exampleVi': 'Dự án yêu cầu sự hợp tác chặt chẽ giữa các thành viên trong nhóm.',
      },
      {
        'word': 'insightful',
        'ipa': '/ˈɪn.saɪt.fəl/',
        'vietnamese': 'sâu sắc, giàu tính hiểu biết và nhìn nhận',
        'partOfSpeech': 'adjective',
        'exampleEn': 'She provided an insightful analysis of the reading passage.',
        'exampleVi': 'Cô ấy đưa ra một phân tích sâu sắc về đoạn bài đọc.',
      },
      {
        'word': 'comprehensive',
        'ipa': '/ˌkɒm.prɪˈhen.sɪv/',
        'vietnamese': 'toàn diện, bao quát mọi khía cạnh',
        'partOfSpeech': 'adjective',
        'exampleEn': 'We need a comprehensive review of all vocabulary items.',
        'exampleVi': 'Chúng ta cần một bài ôn tập toàn diện tất cả các mục từ vựng.',
      },
    ];

    final created = await _apiService.createClassroom(
      name: name,
      description: _createDescController.text.trim(),
      targetLevel: _createTargetLevel,
      words: sampleWords,
    );

    setState(() => _isCreating = false);

    if (created != null) {
      if (mounted) Navigator.pop(context);
      _createNameController.clear();
      _createDescController.clear();
      setState(() => _activeClassroom = created);
      _showToast('Đã tạo phòng học thành công! Mã lớp: ${created['code']}');
      _loadMyClassrooms();
    } else {
      _showToast('Lỗi khi tạo phòng học. Vui lòng thử lại!');
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
    return Scaffold(
      backgroundColor: VocarioTokens.canvas,
      appBar: AppBar(
        backgroundColor: VocarioTokens.surface,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(
          _activeClassroom != null ? (_activeClassroom!['name'] ?? 'Chi Tiết Phòng Học') : 'Lớp Học & Chia Sẻ Bộ Từ',
          style: VocarioTokens.serifHeadline.copyWith(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        leading: _activeClassroom != null
            ? IconButton(
                icon: const Icon(Icons.arrow_back, color: VocarioTokens.ink),
                onPressed: () => setState(() => _activeClassroom = null),
              )
            : null,
        actions: [
          if (_activeClassroom == null)
            IconButton(
              tooltip: 'Tạo phòng học mới',
              icon: const Icon(Icons.add_circle_outline, color: VocarioTokens.brand),
              onPressed: _showCreateClassroomModal,
            ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: VocarioTokens.border, height: 1),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: VocarioTokens.brand))
          : _activeClassroom != null
              ? _buildClassroomDetailView()
              : _buildClassroomHubView(),
    );
  }

  // A. HUB VIEW (KHI CHƯA CHỌN PHÒNG HỌC CỤ THỂ)
  Widget _buildClassroomHubView() {
    return RefreshIndicator(
      color: VocarioTokens.brand,
      onRefresh: _loadMyClassrooms,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. HUB HEADER BANNER
            _buildHubHeader(),
            const SizedBox(height: 16),

            // 2. JOIN BY CODE CARD
            _buildJoinCodeCard(),
            const SizedBox(height: 16),

            // 3. CREATE ROOM BUTTON BANNER
            _buildCreateRoomBanner(),
            const SizedBox(height: 20),

            // 4. MY CLASSROOMS LIST
            _buildMyClassroomsList(),
            const SizedBox(height: 36),
          ],
        ),
      ),
    );
  }

  Widget _buildHubHeader() {
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
            'VIRTUAL CLASSROOM & DECK EXCHANGE',
            style: VocarioTokens.monoSmall.copyWith(
              fontSize: 8.5,
              color: VocarioTokens.brand,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Lớp học & Chia sẻ bộ từ vựng',
            style: VocarioTokens.serifHeadline.copyWith(
              fontSize: 17,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Tham gia các lớp học của bạn bè qua mã phòng ngắn gọn (VD: VOC-882), kéo toàn bộ từ vựng về sổ tay cá nhân để học theo chu kỳ SM-2.',
            style: VocarioTokens.sansMuted.copyWith(fontSize: 11.5),
          ),
        ],
      ),
    );
  }

  Widget _buildJoinCodeCard() {
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
              const Icon(Icons.auto_awesome, size: 16, color: VocarioTokens.brand),
              const SizedBox(width: 6),
              Text(
                'Tham gia bằng mã phòng',
                style: VocarioTokens.sansLabel.copyWith(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Nhập mã phòng do bạn bè hoặc giáo viên gửi (VD: VOC-882):',
            style: VocarioTokens.sansMuted.copyWith(fontSize: 11),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _joinCodeController,
                  textCapitalization: TextCapitalization.characters,
                  style: VocarioTokens.monoSmall.copyWith(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2,
                  ),
                  decoration: InputDecoration(
                    hintText: 'VD: VOC-882',
                    hintStyle: VocarioTokens.sansMuted.copyWith(fontSize: 12),
                    filled: true,
                    fillColor: VocarioTokens.field,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: VocarioTokens.border),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                height: 42,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: VocarioTokens.brand,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    elevation: 0,
                  ),
                  icon: _isJoining
                      ? const SizedBox(
                          width: 12,
                          height: 12,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.arrow_forward, size: 14, color: Colors.white),
                  label: Text(
                    'Vào Lớp',
                    style: VocarioTokens.sansLabel.copyWith(
                      fontSize: 11.5,
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  onPressed: _isJoining ? null : _joinByCode,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCreateRoomBanner() {
    return InkWell(
      onTap: _showCreateClassroomModal,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFFAF8F5),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: VocarioTokens.border),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: VocarioTokens.brand.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.add, color: VocarioTokens.brand, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Tạo phòng học & chia sẻ bộ từ',
                    style: VocarioTokens.serifHeadline.copyWith(fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Tạo không gian học tập chung cho nhóm bạn hoặc câu lạc bộ',
                    style: VocarioTokens.sansMuted.copyWith(fontSize: 11),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 12, color: VocarioTokens.muted),
          ],
        ),
      ),
    );
  }

  Widget _buildMyClassroomsList() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'LỚP HỌC CỦA BẠN (${_myClassrooms.length})',
          style: VocarioTokens.monoSmall.copyWith(
            fontSize: 8.5,
            color: VocarioTokens.brand,
            letterSpacing: 1.0,
          ),
        ),
        const SizedBox(height: 10),
        if (_myClassrooms.isEmpty)
          Container(
            padding: const EdgeInsets.all(24),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: VocarioTokens.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: VocarioTokens.border),
            ),
            child: Text(
              'Bạn chưa tham gia phòng học nào. Hãy nhập mã phòng bên trên hoặc tạo phòng mới!',
              textAlign: TextAlign.center,
              style: VocarioTokens.sansMuted.copyWith(fontSize: 12),
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _myClassrooms.length,
            separatorBuilder: (context, index) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final c = _myClassrooms[index] as Map<String, dynamic>;
              final code = c['code'] as String? ?? 'VOC-000';
              final name = c['name'] as String? ?? 'Lớp học';
              final level = c['targetLevel'] as String? ?? 'B1';
              final membersCount = c['membersCount'] ?? 1;
              final wordsCount = c['wordsCount'] ?? 0;

              return InkWell(
                onTap: () => _loadClassroomByCode(code),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: VocarioTokens.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: VocarioTokens.border),
                    boxShadow: VocarioTokens.cardShadow,
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: VocarioTokens.field,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: VocarioTokens.border),
                        ),
                        child: Text(
                          code,
                          style: VocarioTokens.monoSmall.copyWith(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: VocarioTokens.brand,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: VocarioTokens.serifHeadline.copyWith(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Chuẩn $level · $membersCount học viên · $wordsCount từ vựng',
                              style: VocarioTokens.sansMuted.copyWith(fontSize: 10.5),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_forward_ios, size: 12, color: VocarioTokens.muted),
                    ],
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  // B. DETAIL VIEW (KHI ĐANG XEM MỘT PHÒNG HỌC CỤ THỂ)
  Widget _buildClassroomDetailView() {
    final detail = _activeClassroom!;
    final code = detail['code'] as String? ?? 'VOC-000';
    final name = detail['name'] as String? ?? 'Phòng học';
    final desc = detail['description'] as String? ?? '';
    final level = detail['targetLevel'] as String? ?? 'B1';
    final rawWords = detail['words'] as List<dynamic>? ?? [];
    final bool isCloned = detail['clonedToNotebook'] == true;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Room Header Card
          Container(
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
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: VocarioTokens.field,
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: VocarioTokens.border),
                      ),
                      child: Text(
                        'MÃ PHÒNG: $code',
                        style: VocarioTokens.monoSmall.copyWith(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: VocarioTokens.brand,
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    InkWell(
                      onTap: () {
                        Clipboard.setData(ClipboardData(text: code));
                        _showToast('Đã sao chép mã phòng $code vào bộ nhớ tạm!');
                      },
                      child: const Icon(Icons.copy, size: 14, color: VocarioTokens.muted),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: _getCefrBg(level),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'Chuẩn $level',
                        style: VocarioTokens.monoSmall.copyWith(
                          fontSize: 9.5,
                          fontWeight: FontWeight.bold,
                          color: _getCefrColor(level),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  name,
                  style: VocarioTokens.serifHeadline.copyWith(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                if (desc.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(desc, style: VocarioTokens.sansMuted.copyWith(fontSize: 12)),
                ],
                const SizedBox(height: 12),

                // Clone to Notebook CTA
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isCloned ? const Color(0xFFF0FDF4) : VocarioTokens.brand,
                      elevation: 0,
                      side: isCloned ? const BorderSide(color: Color(0xFF86EFAC)) : null,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: _isCloning
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Icon(
                            isCloned ? Icons.check : Icons.download_outlined,
                            size: 16,
                            color: isCloned ? const Color(0xFF15803D) : Colors.white,
                          ),
                    label: Text(
                      isCloned ? 'Toàn bộ từ đã có trong Sổ SM-2' : 'Kéo toàn bộ từ về Sổ SM-2',
                      style: VocarioTokens.sansLabel.copyWith(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: isCloned ? const Color(0xFF15803D) : Colors.white,
                      ),
                    ),
                    onPressed: isCloned || _isCloning ? null : _cloneToNotebook,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Words in Classroom
          Text(
            'DANH SÁCH TỪ VỰNG TRONG LỚP (${rawWords.length})',
            style: VocarioTokens.monoSmall.copyWith(
              fontSize: 8.5,
              color: VocarioTokens.brand,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 10),
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
              itemCount: rawWords.length,
              separatorBuilder: (context, index) => const Divider(
                color: VocarioTokens.border,
                height: 1,
                thickness: 1,
              ),
              itemBuilder: (context, index) {
                final w = rawWords[index] as Map<String, dynamic>;
                final word = w['word'] as String? ?? '';
                final ipa = w['ipa'] as String? ?? '/.../';
                final vi = w['vietnamese'] as String? ?? '';
                final exEn = w['exampleEn'] as String? ?? '';

                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            word,
                            style: VocarioTokens.serifHeadline.copyWith(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            ipa,
                            style: VocarioTokens.monoSmall.copyWith(
                              fontSize: 10,
                              color: VocarioTokens.muted,
                            ),
                          ),
                          const Spacer(),
                          IconButton(
                            icon: const Icon(Icons.volume_up_outlined, size: 16, color: VocarioTokens.brand),
                            onPressed: () => _showToast('Đang phát âm "$word"...'),
                          ),
                        ],
                      ),
                      Text(
                        vi,
                        style: VocarioTokens.sansBody.copyWith(
                          fontSize: 12,
                          color: VocarioTokens.brand,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (exEn.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          '“$exEn”',
                          style: VocarioTokens.serifHeadline.copyWith(
                            fontSize: 11.5,
                            fontStyle: FontStyle.italic,
                            color: VocarioTokens.muted,
                          ),
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 20),

          // Open Flashcard button
          SizedBox(
            width: double.infinity,
            height: 46,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: VocarioTokens.brand),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: const Icon(Icons.style_outlined, size: 16, color: VocarioTokens.brand),
              label: Text(
                'Luyện Flashcard với bộ từ này',
                style: VocarioTokens.sansLabel.copyWith(
                  fontSize: 12.5,
                  fontWeight: FontWeight.bold,
                  color: VocarioTokens.brand,
                ),
              ),
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const WordbookScreen(initialTabIndex: 1)),
              ),
            ),
          ),
          const SizedBox(height: 36),
        ],
      ),
    );
  }

  // Modal Tạo phòng học mới
  void _showCreateClassroomModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: VocarioTokens.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Tạo Phòng Học Mới',
                    style: VocarioTokens.serifHeadline.copyWith(fontSize: 17, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _createNameController,
                decoration: InputDecoration(
                  labelText: 'Tên phòng học',
                  labelStyle: VocarioTokens.sansLabel.copyWith(fontSize: 12),
                  hintText: 'VD: Luyện thi IELTS 6.5+ Tuần 1',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _createDescController,
                decoration: InputDecoration(
                  labelText: 'Mô tả ngắn',
                  labelStyle: VocarioTokens.sansLabel.copyWith(fontSize: 12),
                  hintText: 'Mục tiêu ôn luyện từ vựng hàng ngày...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: _createTargetLevel,
                decoration: InputDecoration(
                  labelText: 'Trình độ mục tiêu',
                  labelStyle: VocarioTokens.sansLabel.copyWith(fontSize: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
                items: ['A1', 'A2', 'B1', 'B2', 'C1'].map((lvl) {
                  return DropdownMenuItem(
                    value: lvl,
                    child: Text('Chuẩn $lvl', style: VocarioTokens.sansLabel.copyWith(fontSize: 12)),
                  );
                }).toList(),
                onChanged: (val) => setState(() => _createTargetLevel = val ?? 'B1'),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: VocarioTokens.brand,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: _isCreating ? null : _createNewClassroom,
                  child: Text(
                    _isCreating ? 'Đang tạo phòng...' : 'Xác nhận tạo phòng',
                    style: VocarioTokens.sansLabel.copyWith(
                      fontSize: 12.5,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
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

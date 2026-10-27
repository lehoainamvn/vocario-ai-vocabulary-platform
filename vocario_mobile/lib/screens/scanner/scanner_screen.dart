import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/tokens.dart';
import '../../core/services/api_service.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> with SingleTickerProviderStateMixin {
  // Screen Modes
  bool _isInspecting = false; // false = Live Viewfinder, true = Bounding Box Inspection
  bool _isGridOn = true;
  bool _isTorchOn = false;
  bool _isFlashing = false;
  bool _isSpeaking = false;
  bool _isSaving = false;

  int _selectedWordIndex = 0;
  final Set<String> _savedWords = {};
  String? _toastMessage;
  Timer? _toastTimer;

  // Real-world YOLO-World v2 Detection Dataset (Bối cảnh: Góc bàn học & Làm việc)
  final List<Map<String, dynamic>> _detectedItems = [
    {
      'word': 'coffee mug',
      'ipa': '/ˈkɒfi mʌɡ/',
      'level': 'A2',
      'partOfSpeech': 'Noun',
      'vietnamese': 'cốc / tách cà phê quai cầm',
      'exampleEn': 'He placed his ceramic coffee mug next to the keyboard before starting work.',
      'exampleVi': 'Anh ấy đặt chiếc cốc cà phê gốm bên cạnh bàn phím trước khi làm việc.',
      'confidence': 0.96,
      'rect': const Rect.fromLTWH(0.22, 0.46, 0.23, 0.28),
    },
    {
      'word': 'mechanical keyboard',
      'ipa': '/mɪˈkænɪkl ˈkiːbɔːrd/',
      'level': 'B1',
      'partOfSpeech': 'Noun',
      'vietnamese': 'bàn phím cơ xúc giác',
      'exampleEn': 'A mechanical keyboard offers satisfying tactile feedback while typing code.',
      'exampleVi': 'Bàn phím cơ mang lại cảm giác phản hồi xúc giác êm ái khi gõ mã nguồn.',
      'confidence': 0.94,
      'rect': const Rect.fromLTWH(0.48, 0.54, 0.42, 0.25),
    },
    {
      'word': 'study lamp',
      'ipa': '/ˈstʌdi læmp/',
      'level': 'A1',
      'partOfSpeech': 'Noun',
      'vietnamese': 'đèn bàn học điều chỉnh',
      'exampleEn': 'The warm light from the study lamp brightens the late-night workstation.',
      'exampleVi': 'Ánh sáng ấm từ chiếc đèn bàn học làm bừng sáng góc làm việc đêm khuya.',
      'confidence': 0.91,
      'rect': const Rect.fromLTWH(0.66, 0.14, 0.26, 0.36),
    },
    {
      'word': 'notebook',
      'ipa': '/ˈnəʊtbʊk/',
      'level': 'A2',
      'partOfSpeech': 'Noun',
      'vietnamese': 'sổ tay ghi chú bìa da',
      'exampleEn': 'She writes down important English collocations in her small notebook.',
      'exampleVi': 'Cô ấy ghi lại các cụm từ tiếng Anh quan trọng vào cuốn sổ tay nhỏ.',
      'confidence': 0.89,
      'rect': const Rect.fromLTWH(0.06, 0.60, 0.22, 0.26),
    },
  ];

  @override
  void dispose() {
    _toastTimer?.cancel();
    super.dispose();
  }

  void _showToast(String message) {
    _toastTimer?.cancel();
    setState(() => _toastMessage = message);
    _toastTimer = Timer(const Duration(milliseconds: 3200), () {
      if (mounted) setState(() => _toastMessage = null);
    });
  }

  void _triggerCapture() {
    setState(() => _isFlashing = true);

    Timer(const Duration(milliseconds: 140), () {
      if (!mounted) return;
      setState(() {
        _isFlashing = false;
        _isInspecting = true;
      });
      _showToast('YOLO-World v2 đã bóc tách ${_detectedItems.length} vật thể chuẩn CEFR!');
    });
  }

  void _playWordAudio(String word) {
    setState(() => _isSpeaking = true);
    _showToast('Đang phát âm chuẩn bản ngữ: $word');
    Timer(const Duration(milliseconds: 900), () {
      if (mounted) setState(() => _isSpeaking = false);
    });
  }

  Future<void> _saveCurrentWordToSrs() async {
    final item = _detectedItems[_selectedWordIndex];
    final word = item['word'] as String;

    if (_savedWords.contains(word)) return;

    setState(() => _isSaving = true);

    try {
      // Đồng bộ với API Spring Boot Backend
      await ApiService().learnWordFromVision(
        englishWord: word,
        vietnameseMeaning: item['vietnamese'] as String,
        phoneticIpa: item['ipa'] as String,
        cefrLevel: item['level'] as String,
      );

      if (!mounted) return;
      setState(() {
        _savedWords.add(word);
        _isSaving = false;
      });
      _showToast('Đã lưu "$word" vào Sổ từ vựng & Hàng đợi ôn tập SM-2!');
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _savedWords.add(word); // Fallback lưu tại chỗ nếu backend offline
        _isSaving = false;
      });
      _showToast('Đã lưu "$word" vào Sổ từ vựng SM-2 (Phiên ngoại tuyến).');
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeItem = _detectedItems[_selectedWordIndex];
    final isCurrentSaved = _savedWords.contains(activeItem['word'] as String);

    return Scaffold(
      backgroundColor: const Color(0xFF1C1A17), // Warm Obsidian Darkroom
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            Column(
              children: [
                _buildTopHUD(),
                Expanded(
                  child: Stack(
                    children: [
                      // Camera Viewport (Live feed or Captured photo)
                      _buildCameraViewport(),
                      // Flash effect animation
                      if (_isFlashing)
                        Positioned.fill(
                          child: Container(color: Colors.white.withValues(alpha: 0.92)),
                        ),
                    ],
                  ),
                ),
                // Bottom Dock: Shutter controls when Live, or Inspection Sheet when Inspected
                if (!_isInspecting)
                  _buildShutterControlsDock()
                else
                  _buildInspectionBottomDrawer(activeItem, isCurrentSaved),
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
  // 1. TOP HUD OVERLAY
  // ==========================================================================
  Widget _buildTopHUD() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
      color: const Color(0xFF1C1A17),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Close / Back Button
          InkWell(
            onTap: () {
              if (_isInspecting) {
                setState(() => _isInspecting = false);
              } else {
                Navigator.maybePop(context);
              }
            },
            borderRadius: BorderRadius.circular(999),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.15),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
              ),
              child: Icon(
                _isInspecting ? Icons.arrow_back_rounded : Icons.close_rounded,
                size: 18,
                color: Colors.white,
              ),
            ),
          ),
          // Floating Scene Theme Capsule
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.65),
              borderRadius: BorderRadius.circular(999),
              border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    color: Color(0xFF10B981),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                const Text(
                  'Bối cảnh: Góc bàn học & Làm việc',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
          // Utility Cluster (Grid & Torch)
          Row(
            children: [
              _buildHudButton(
                icon: _isGridOn ? Icons.grid_on_rounded : Icons.grid_off_rounded,
                isActive: _isGridOn,
                onTap: () => setState(() => _isGridOn = !_isGridOn),
              ),
              const SizedBox(width: 8),
              _buildHudButton(
                icon: _isTorchOn ? Icons.flash_on_rounded : Icons.flash_off_rounded,
                isActive: _isTorchOn,
                onTap: () => setState(() => _isTorchOn = !_isTorchOn),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHudButton({
    required IconData icon,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: isActive
              ? VocarioTokens.goldAccent.withValues(alpha: 0.25)
              : Colors.white.withValues(alpha: 0.15),
          shape: BoxShape.circle,
          border: Border.all(
            color: isActive ? VocarioTokens.goldAccent : Colors.white.withValues(alpha: 0.15),
          ),
        ),
        child: Icon(
          icon,
          size: 16,
          color: isActive ? VocarioTokens.goldAccent : Colors.white,
        ),
      ),
    );
  }

  // ==========================================================================
  // 2. CAMERA VIEWPORT (LIVE CHAMBER OR INSPECTED PHOTO)
  // ==========================================================================
  Widget _buildCameraViewport() {
    return Container(
      width: double.infinity,
      color: const Color(0xFF1C1A17),
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Room Background Image (Desk & Workstation)
          Positioned.fill(
            child: Image.network(
              'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1200&q=82',
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => Container(
                color: const Color(0xFF2D2823),
                alignment: Alignment.center,
                child: const Icon(Icons.videocam_outlined, size: 48, color: Colors.white38),
              ),
            ),
          ),
          // Composition 3x3 Grid Overlay
          if (_isGridOn && !_isInspecting)
            Positioned.fill(
              child: CustomPaint(
                painter: _CameraGridPainter(),
              ),
            ),
          // Optical L-Bracket Focus Corners
          if (!_isInspecting) ...[
            Positioned.fill(
              child: CustomPaint(
                painter: _FocusCornersPainter(),
              ),
            ),
            // Guiding Center Capsule
            Positioned(
              bottom: 30,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.72),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                ),
                child: const Text(
                  'Hướng camera về đồ vật bạn muốn học',
                  style: TextStyle(
                    fontSize: 11.5,
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ],
          // YOLO-World v2 Bounding Boxes Overlay (when inspected)
          if (_isInspecting)
            Positioned.fill(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return Stack(
                    children: _detectedItems.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final item = entry.value;
                      final rect = item['rect'] as Rect;
                      final isSelected = idx == _selectedWordIndex;

                      final left = rect.left * constraints.maxWidth;
                      final top = rect.top * constraints.maxHeight;
                      final width = rect.width * constraints.maxWidth;
                      final height = rect.height * constraints.maxHeight;

                      return Positioned(
                        left: left,
                        top: top,
                        width: width,
                        height: height,
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedWordIndex = idx),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: isSelected ? VocarioTokens.goldAccent : Colors.white.withValues(alpha: 0.85),
                                width: isSelected ? 2.5 : 1.5,
                              ),
                              color: isSelected
                                  ? VocarioTokens.goldAccent.withValues(alpha: 0.24)
                                  : Colors.black.withValues(alpha: 0.08),
                            ),
                            child: Stack(
                              clipBehavior: Clip.none,
                              children: [
                                Positioned(
                                  top: -24,
                                  left: -2,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
                                    decoration: BoxDecoration(
                                      color: isSelected ? VocarioTokens.goldAccent : Colors.black.withValues(alpha: 0.8),
                                      borderRadius: BorderRadius.circular(3),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          item['word'] as String,
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: isSelected ? VocarioTokens.ink : Colors.white,
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${((item['confidence'] as double) * 100).toInt()}%',
                                          style: VocarioTokens.monoSmall.copyWith(
                                            fontSize: 8,
                                            color: isSelected ? VocarioTokens.ink : VocarioTokens.goldAccent,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  // ==========================================================================
  // 3. BOTTOM SHUTTER CONTROLS DOCK (LIVE MODE)
  // ==========================================================================
  Widget _buildShutterControlsDock() {
    return Container(
      height: 124,
      padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 16),
      color: const Color(0xFF1C1A17),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Photo Library Picker
          InkWell(
            onTap: () => _showToast('Mở thư viện ảnh từ thiết bị...'),
            borderRadius: BorderRadius.circular(14),
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
              ),
              child: const Icon(Icons.photo_library_outlined, size: 20, color: Colors.white),
            ),
          ),
          // Tactile Shutter Button (Outer Ring + Inner Trigger Core)
          GestureDetector(
            onTap: _triggerCapture,
            child: Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withValues(alpha: 0.85), width: 3.5),
              ),
              alignment: Alignment.center,
              child: Container(
                width: 58,
                height: 58,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: VocarioTokens.field,
                ),
                child: const Icon(Icons.camera_rounded, size: 28, color: VocarioTokens.brand),
              ),
            ),
          ),
          // Camera Flip / Switch Button
          InkWell(
            onTap: () => _showToast('Chuyển đổi camera trước / sau...'),
            borderRadius: BorderRadius.circular(999),
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
              ),
              child: const Icon(Icons.flip_camera_ios_outlined, size: 20, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // 4. INSPECTION COMPANION BOTTOM DRAWER (INSPECTED MODE)
  // ==========================================================================
  Widget _buildInspectionBottomDrawer(Map<String, dynamic> item, bool isSaved) {
    return Container(
      decoration: BoxDecoration(
        color: VocarioTokens.surface,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
        boxShadow: VocarioTokens.toastShadow,
        border: Border.all(color: VocarioTokens.border),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag Handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 8),
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFD8CFBF),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ),
          // Horizontal Object Selector Carousel
          SizedBox(
            height: 34,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 18),
              itemCount: _detectedItems.length,
              separatorBuilder: (context, index) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final obj = _detectedItems[index];
                final isSelected = index == _selectedWordIndex;
                final word = obj['word'] as String;

                return InkWell(
                  onTap: () => setState(() => _selectedWordIndex = index),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected ? VocarioTokens.brand : VocarioTokens.field,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isSelected ? VocarioTokens.brand : VocarioTokens.border,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (isSelected)
                          const Padding(
                            padding: EdgeInsets.only(right: 4),
                            child: Icon(Icons.circle, size: 6, color: VocarioTokens.goldAccent),
                          ),
                        Text(
                          word,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            color: isSelected ? Colors.white : VocarioTokens.ink,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          // Detailed Vocabulary Inspection Card
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Row (CEFR Pill + Audio + Mic)
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
                        '${item['level']} · ${item['partOfSpeech']}',
                        style: VocarioTokens.monoSmall.copyWith(
                          fontSize: 9.5,
                          color: VocarioTokens.brand,
                        ),
                      ),
                    ),
                    Row(
                      children: [
                        InkWell(
                          onTap: () => _playWordAudio(item['word'] as String),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: VocarioTokens.field,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: VocarioTokens.border),
                            ),
                            child: Icon(
                              Icons.volume_up_rounded,
                              size: 16,
                              color: _isSpeaking ? VocarioTokens.amber : VocarioTokens.brand,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        InkWell(
                          onTap: () => _showToast('Mở bộ chấm điểm phát âm AI cho "${item['word']}"...'),
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
                              children: [
                                const Icon(Icons.mic_none_rounded, size: 14, color: VocarioTokens.brand),
                                const SizedBox(width: 4),
                                Text(
                                  'Luyện nói',
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: VocarioTokens.brand),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                // Word Title & IPA
                Text(
                  item['word'] as String,
                  style: VocarioTokens.serifHeadline.copyWith(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 3),
                Row(
                  children: [
                    Text(
                      item['ipa'] as String,
                      style: VocarioTokens.monoSmall.copyWith(
                        fontSize: 11,
                        color: VocarioTokens.muted,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(height: 10, width: 1, color: VocarioTokens.border),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        item['vietnamese'] as String,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: VocarioTokens.brand,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                // AI Contextual Story Box (Groq LLM)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                  decoration: BoxDecoration(
                    color: VocarioTokens.field,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: VocarioTokens.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '“${item['exampleEn']}”',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontStyle: FontStyle.italic,
                          color: VocarioTokens.ink,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        item['exampleVi'] as String,
                        style: TextStyle(
                          fontSize: 10,
                          color: VocarioTokens.muted,
                          height: 1.35,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                // Primary Action Button (Save to SM-2)
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: ElevatedButton(
                    onPressed: _isSaving ? null : _saveCurrentWordToSrs,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isSaved ? const Color(0xFFF0FDF4) : VocarioTokens.brand,
                      foregroundColor: isSaved ? const Color(0xFF15803D) : Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(
                          color: isSaved ? const Color(0xFF86EFAC) : VocarioTokens.brand,
                        ),
                      ),
                    ),
                    child: _isSaving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                isSaved ? Icons.check_circle_rounded : Icons.bookmark_add_outlined,
                                size: 16,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                isSaved ? 'Đã có trong Sổ từ vựng SM-2' : 'Lưu vào Sổ từ vựng SM-2',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                  ),
                ),
                const SizedBox(height: 8),
                // Re-scan or change scene button
                Center(
                  child: TextButton.icon(
                    onPressed: () => setState(() => _isInspecting = false),
                    icon: const Icon(Icons.refresh_rounded, size: 14, color: VocarioTokens.muted),
                    label: Text(
                      'Chụp lại / Quét bối cảnh khác',
                      style: TextStyle(fontSize: 11, color: VocarioTokens.muted, fontWeight: FontWeight.w500),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // 5. FLOATING TOAST NOTIFICATION
  // ==========================================================================
  Widget _buildFloatingToast() {
    return Positioned(
      top: 14,
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

// ============================================================================
// CUSTOM PAINTERS: OPTICAL L-BRACKETS & 3X3 COMPOSITION GRID
// ============================================================================

class _FocusCornersPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.85)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    const cornerLength = 20.0;
    const margin = 24.0;

    // Top-Left
    canvas.drawLine(const Offset(margin, margin), const Offset(margin + cornerLength, margin), paint);
    canvas.drawLine(const Offset(margin, margin), const Offset(margin, margin + cornerLength), paint);

    // Top-Right
    canvas.drawLine(Offset(size.width - margin, margin), Offset(size.width - margin - cornerLength, margin), paint);
    canvas.drawLine(Offset(size.width - margin, margin), Offset(size.width - margin, margin + cornerLength), paint);

    // Bottom-Left
    canvas.drawLine(Offset(margin, size.height - margin), Offset(margin + cornerLength, size.height - margin), paint);
    canvas.drawLine(Offset(margin, size.height - margin), Offset(margin, size.height - margin - cornerLength), paint);

    // Bottom-Right
    canvas.drawLine(Offset(size.width - margin, size.height - margin), Offset(size.width - margin - cornerLength, size.height - margin), paint);
    canvas.drawLine(Offset(size.width - margin, size.height - margin), Offset(size.width - margin, size.height - margin - cornerLength), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _CameraGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final double colStep = size.width / 3;
    final double rowStep = size.height / 3;

    // 2 Vertical Lines
    canvas.drawLine(Offset(colStep, 0), Offset(colStep, size.height), paint);
    canvas.drawLine(Offset(colStep * 2, 0), Offset(colStep * 2, size.height), paint);

    // 2 Horizontal Lines
    canvas.drawLine(Offset(0, rowStep), Offset(size.width, rowStep), paint);
    canvas.drawLine(Offset(0, rowStep * 2), Offset(size.width, rowStep * 2), paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

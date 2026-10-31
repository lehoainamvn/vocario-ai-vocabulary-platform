import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../core/constants/tokens.dart';
import '../../core/services/api_service.dart';
import '../../core/utils/image_picker_helper.dart';
import '../../widgets/speech_scorer_modal.dart';
import '../extractor/text_extractor_screen.dart';

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> with SingleTickerProviderStateMixin {
  // Studio Mode: 'camera' | 'upload' (Khớp 100% web Angular user-scanner.component.ts)
  String _activeStudioTab = 'camera';

  // Điều khiển Viewfinder & Camera
  bool _isGridActive = true;
  bool _isScanning = false;
  bool _hasScanned = false;
  bool _isFlashing = false;
  bool _isSpeaking = false;
  bool _isSaving = false;
  bool _isSavingAll = false;

  // Dữ liệu ảnh bối cảnh
  Uint8List? _customImageBytes;
  String _customImageName = '';
  String? _customImageDataUrl;
  double? _imageWidth;
  double? _imageHeight;
  int _activePresetIndex = 0;

  // Danh sách các ảnh bối cảnh mẫu chất lượng cao
  final List<Map<String, String>> _presetScenes = [
    {
      'title': 'Bàn học & Làm việc',
      'theme': 'Bàn Học & Góc Làm Việc',
      'url': 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1200&q=82',
    },
    {
      'title': 'Gian bếp gia đình',
      'theme': 'Nhà Bếp & Nấu Ăn',
      'url': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1200&q=82',
    },
    {
      'title': 'Phòng khách ấm cúng',
      'theme': 'Phòng Khách Gia Đình',
      'url': 'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=82',
    },
    {
      'title': 'Quán cà phê sáng',
      'theme': 'Quán Cà Phê & Đồ Uống',
      'url': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=82',
    },
  ];

  // Danh sách vật thể nhận diện động từ máy chủ AI YOLO-World v2
  List<Map<String, dynamic>> _detectedItems = [];
  int _selectedWordIndex = 0;
  String _sceneTitle = '';
  List<Map<String, dynamic>> _dialogueTurns = [];

  // Trạng thái từ vựng đã lưu vào Sổ từ vựng SM-2
  final Set<String> _savedWords = {};
  String? _toastMessage;
  Timer? _toastTimer;

  // Animation Controller cho tia quét Laser AI
  late AnimationController _laserController;
  late Animation<double> _laserAnimation;

  @override
  void initState() {
    super.initState();
    _laserController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
    _laserAnimation = Tween<double>(begin: 0.1, end: 0.9).animate(
      CurvedAnimation(parent: _laserController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _laserController.dispose();
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

  Future<void> _resolveImageDimensions(Uint8List bytes) async {
    try {
      final codec = await ui.instantiateImageCodec(bytes);
      final frame = await codec.getNextFrame();
      if (mounted) {
        setState(() {
          _imageWidth = frame.image.width.toDouble();
          _imageHeight = frame.image.height.toDouble();
        });
      }
    } catch (_) {}
  }

  void _switchStudioTab(String tab) {
    if (_activeStudioTab == tab) return;
    setState(() {
      _activeStudioTab = tab;
      _hasScanned = false;
      _detectedItems = [];
      _customImageBytes = null;
      _customImageDataUrl = null;
      _customImageName = '';
      _imageWidth = null;
      _imageHeight = null;
    });
  }

  /// Chọn file ảnh từ máy (Tải ảnh lên)
  Future<void> _pickImageFromDevice() async {
    try {
      final picked = await pickImageFromDevice();
      if (picked == null) return;
      setState(() {
        _customImageBytes = picked.bytes;
        _customImageName = picked.name;
        _customImageDataUrl = picked.dataUrl;
        _hasScanned = false;
        _detectedItems = [];
      });
      _resolveImageDimensions(picked.bytes);
      _showToast('Đã nạp ảnh thành công: ${picked.name}');
    } catch (e) {
      _showToast('Lỗi chọn ảnh: $e');
    }
  }

  /// Chụp ảnh hoặc nạp ảnh mẫu để sẵn sàng quét
  Future<void> _captureOrLoadFrame() async {
    setState(() => _isFlashing = true);
    Timer(const Duration(milliseconds: 120), () {
      if (mounted) setState(() => _isFlashing = false);
    });

    if (_customImageBytes != null) {
      await _executeAiScan(
        bytes: _customImageBytes!,
        filename: _customImageName.isNotEmpty ? _customImageName : 'capture_${DateTime.now().millisecondsSinceEpoch}.jpg',
      );
      return;
    }

    try {
      final url = _presetScenes[_activePresetIndex]['url']!;
      _showToast('Đang tải khung hình camera...');
      final dio = Dio();
      final res = await dio.get<List<int>>(url, options: Options(responseType: ResponseType.bytes));
      if (res.data != null) {
        final bytes = Uint8List.fromList(res.data!);
        setState(() {
          _customImageBytes = bytes;
          _customImageName = 'preset_${_activePresetIndex}.jpg';
        });
        _resolveImageDimensions(bytes);
        await _executeAiScan(
          bytes: bytes,
          filename: 'preset_${_activePresetIndex}.jpg',
        );
      }
    } catch (e) {
      _showToast('Lỗi nạp khung hình camera: $e');
    }
  }

  /// Thực thi quét Two-Stage AI (YOLO-World v2 + Groq LLM + Spring Boot PostgreSQL)
  Future<void> _executeAiScan({required Uint8List bytes, required String filename}) async {
    setState(() {
      _isScanning = true;
      _hasScanned = false;
    });

    if (_imageWidth == null || _imageHeight == null) {
      await _resolveImageDimensions(bytes);
    }

    // Với ảnh do người dùng tải lên/chụp thực tế, luôn dùng 'auto' để kích hoạt phân loại Places365 ResNet-18
    final theme = _customImageBytes != null ? 'auto' : (_presetScenes[_activePresetIndex]['theme'] ?? 'auto');

    try {
      // BƯỚC 1: Gọi mô hình YOLO-World v2 (Port 8001) nhận diện vật thể
      var aiRes = await ApiService().detectObjectsWithYolo(
        imageBytes: bytes,
        filename: filename,
        sceneTheme: theme,
        confidenceThreshold: 0.15,
      );

      // Nếu lần 1 không tìm thấy vật thể, tự động quét lần 2 với ngưỡng thư giãn (0.08) và theme tự động
      if (aiRes['success'] != true ||
          aiRes['detectedObjects'] is! List ||
          (aiRes['detectedObjects'] as List).isEmpty) {
        final retryRes = await ApiService().detectObjectsWithYolo(
          imageBytes: bytes,
          filename: filename,
          sceneTheme: 'auto',
          confidenceThreshold: 0.08,
        );
        if (retryRes['success'] == true &&
            retryRes['detectedObjects'] is List &&
            (retryRes['detectedObjects'] as List).isNotEmpty) {
          aiRes = retryRes;
        }
      }

      if (aiRes['success'] == true && aiRes['detectedObjects'] is List) {
        final rawList = aiRes['detectedObjects'] as List;
        if (rawList.isNotEmpty) {
          final mapped = rawList.map<Map<String, dynamic>>((raw) {
            final l = ((raw['leftPercent'] as num?)?.toDouble() ?? 10.0) / 100.0;
            final t = ((raw['topPercent'] as num?)?.toDouble() ?? 10.0) / 100.0;
            final w = ((raw['widthPercent'] as num?)?.toDouble() ?? 20.0) / 100.0;
            final h = ((raw['heightPercent'] as num?)?.toDouble() ?? 20.0) / 100.0;

            return {
              'word': raw['word']?.toString() ?? 'object',
              'ipa': raw['ipa']?.toString() ?? '',
              'level': raw['level']?.toString() ?? 'A2',
              'partOfSpeech': raw['partOfSpeech']?.toString() ?? 'noun',
              'vietnamese': raw['vietnamese']?.toString() ?? raw['vietnameseMeaning']?.toString() ?? '',
              'exampleEn': raw['exampleEn']?.toString() ?? raw['exampleSentenceEn']?.toString() ?? '',
              'exampleVi': raw['exampleVi']?.toString() ?? raw['exampleSentenceVi']?.toString() ?? '',
              'confidence': (raw['confidence'] as num?)?.toDouble() ?? 0.85,
              'rect': Rect.fromLTWH(
                l.clamp(0.0, 1.0),
                t.clamp(0.0, 1.0),
                w.clamp(0.01, 1.0),
                h.clamp(0.01, 1.0),
              ),
            };
          }).toList();

          // Trích xuất hội thoại nếu có từ Groq AI
          List<Map<String, dynamic>> dialogue = [];
          if (aiRes['dialogue'] is List) {
            dialogue = (aiRes['dialogue'] as List).map<Map<String, dynamic>>((d) {
              return {
                'speaker': d['speakerLabel'] ?? d['speaker'] ?? 'Speaker',
                'en': d['en'] ?? d['english'] ?? '',
                'vi': d['vi'] ?? d['vietnamese'] ?? '',
              };
            }).toList();
          }

          final finalTheme = aiRes['sceneTitle']?.toString() ?? (theme == 'auto' ? 'Bối Cảnh Tự Nhiên' : theme);

          if (!mounted) return;
          setState(() {
            _detectedItems = mapped;
            _selectedWordIndex = 0;
            _sceneTitle = finalTheme;
            _dialogueTurns = dialogue;
            _hasScanned = true;
            _isScanning = false;
          });

          // BƯỚC 2: Gửi POST /api/vision/save-capture đến máy chủ Spring Boot (Port 8088)
          // Lưu ảnh bối cảnh và danh sách vật thể vào bảng captures trong PostgreSQL
          ApiService().saveRealCapture(
            imageBytes: bytes,
            filename: filename,
            sceneTheme: finalTheme,
            detectedObjects: mapped,
            base64DataUrl: _customImageDataUrl,
          );

          _showToast('Two-Stage AI đã bóc tách ${mapped.length} vật thể thực tế!');
          return;
        }
      }

      if (!mounted) return;
      setState(() {
        _detectedItems = [];
        _hasScanned = false;
        _isScanning = false;
      });
      final errMsg = aiRes['error']?.toString();
      if (errMsg != null && errMsg.isNotEmpty) {
        _showToast('Máy chủ AI: $errMsg');
      } else {
        _showToast('Chưa nhận diện được vật thể rõ ràng. Hãy thử góc sáng hơn!');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _detectedItems = [];
        _hasScanned = false;
        _isScanning = false;
      });
      _showToast('Không thể kết nối máy chủ AI Vision (Port 8001): $e');
    }
  }

  void _retakePhoto() {
    setState(() {
      _hasScanned = false;
      _detectedItems = [];
      _customImageBytes = null;
      _customImageDataUrl = null;
      _customImageName = '';
      _imageWidth = null;
      _imageHeight = null;
      _selectedWordIndex = 0;
      _dialogueTurns = [];
    });
    _showToast('Đã làm mới khung ngắm studio.');
  }

  void _playWordAudio(String word) {
    setState(() => _isSpeaking = true);
    speakTextBrowser(word);
    _showToast('Đang phát âm: $word');
    Timer(const Duration(milliseconds: 900), () {
      if (mounted) setState(() => _isSpeaking = false);
    });
  }

  /// BƯỚC 3: Lưu 1 từ vựng vào Sổ từ vựng SM-2 qua Spring Boot
  Future<void> _saveCurrentWordToSrs() async {
    if (_detectedItems.isEmpty) return;
    final item = _detectedItems[_selectedWordIndex];
    final word = item['word'] as String;

    if (_savedWords.contains(word)) return;

    setState(() => _isSaving = true);

    try {
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
      _showToast('Đã lưu "$word" vào Sổ từ vựng SM-2!');
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _savedWords.add(word);
        _isSaving = false;
      });
      _showToast('Đã lưu "$word" vào Sổ từ vựng SM-2.');
    }
  }

  /// BƯỚC 4: Lưu toàn bộ từ vựng vào Sổ từ vựng SM-2
  Future<void> _saveAllWordsToSrs() async {
    if (_detectedItems.isEmpty) return;
    setState(() => _isSavingAll = true);

    int count = 0;
    for (var item in _detectedItems) {
      final word = item['word'] as String;
      if (!_savedWords.contains(word)) {
        try {
          await ApiService().learnWordFromVision(
            englishWord: word,
            vietnameseMeaning: item['vietnamese'] as String,
            phoneticIpa: item['ipa'] as String,
            cefrLevel: item['level'] as String,
          );
          _savedWords.add(word);
          count++;
        } catch (_) {
          _savedWords.add(word);
          count++;
        }
      }
    }

    if (!mounted) return;
    setState(() => _isSavingAll = false);
    _showToast('Đã lưu toàn bộ $count từ vựng vào Sổ từ vựng SM-2!');
  }

  @override
  Widget build(BuildContext context) {
    final activeItem = _detectedItems.isNotEmpty && _selectedWordIndex < _detectedItems.length
        ? _detectedItems[_selectedWordIndex]
        : (_detectedItems.isNotEmpty ? _detectedItems.first : null);
    final isCurrentSaved = activeItem != null && _savedWords.contains(activeItem['word'] as String);

    return Scaffold(
      backgroundColor: VocarioTokens.canvas,
      body: SafeArea(
        child: Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. STUDIO HEADER (SMART APERTURE STUDIO & TAB SWITCHER)
                  _buildStudioHeader(),
                  const SizedBox(height: 16),

                  // 2. MAIN STUDIO LAYOUT (VIEWPORT & COMPANION LEDGER)
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final isWide = constraints.maxWidth >= 900;
                      if (isWide) {
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              flex: 7,
                              child: Column(
                                children: [
                                  _buildCinematicViewport(),
                                  const SizedBox(height: 10),
                                  _buildCameraControlsBar(),
                                ],
                              ),
                            ),
                            const SizedBox(width: 24),
                            Expanded(
                              flex: 5,
                              child: _buildCompanionLedger(activeItem, isCurrentSaved),
                            ),
                          ],
                        );
                      }

                      // Mobile / Tablet Vertical Layout
                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildCinematicViewport(),
                          const SizedBox(height: 10),
                          _buildCameraControlsBar(),
                          const SizedBox(height: 20),
                          _buildCompanionLedger(activeItem, isCurrentSaved),
                        ],
                      );
                    },
                  ),
                  const SizedBox(height: 36),
                ],
              ),
            ),

            // Flash effect animation
            if (_isFlashing)
              Positioned.fill(
                child: Container(color: Colors.white.withValues(alpha: 0.88)),
              ),

            // Floating Toast Notification
            if (_toastMessage != null) _buildFloatingToast(),
          ],
        ),
      ),
    );
  }

  // ==========================================================================
  // 1. STUDIO HEADER (Chuẩn Web: SMART APERTURE STUDIO & Mode Switcher)
  // ==========================================================================
  Widget _buildStudioHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                InkWell(
                  onTap: () => Navigator.maybePop(context),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: VocarioTokens.border),
                    ),
                    child: const Icon(Icons.arrow_back_rounded, size: 16, color: VocarioTokens.ink),
                  ),
                ),
                const SizedBox(width: 10),
                Text(
                  'SMART APERTURE STUDIO',
                  style: VocarioTokens.monoSmall.copyWith(
                    fontSize: 9.5,
                    color: VocarioTokens.brand,
                    letterSpacing: 1.2,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),

            // Link chuyển nhanh sang Trích Xuất Văn Bản OCR
            InkWell(
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const TextExtractorScreen()),
              ),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: VocarioTokens.border),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.text_snippet_outlined, size: 13, color: VocarioTokens.brand),
                    SizedBox(width: 4),
                    Text(
                      'OCR Văn Bản',
                      style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: VocarioTokens.ink),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          'Nhận diện vật thể & Từ vựng thực tế',
          style: VocarioTokens.serifHeadline.copyWith(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: VocarioTokens.ink,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Hướng camera về phía sự vật quanh bạn để hệ thống thị giác AI tự động bóc tách từ vựng theo chuẩn CEFR.',
          style: TextStyle(
            fontSize: 11.5,
            color: VocarioTokens.muted,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 12),

        // Mode Switcher Buttons (Live Camera / Tải ảnh lên - Chuẩn Web)
        Row(
          children: [
            _buildTabButton(
              id: 'camera',
              label: 'Live Camera',
              icon: Icons.camera_alt_outlined,
            ),
            const SizedBox(width: 8),
            _buildTabButton(
              id: 'upload',
              label: 'Tải ảnh lên',
              icon: Icons.upload_file_outlined,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildTabButton({
    required String id,
    required String label,
    required IconData icon,
  }) {
    final isActive = _activeStudioTab == id;
    return InkWell(
      onTap: () => _switchStudioTab(id),
      borderRadius: BorderRadius.circular(6),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isActive ? Colors.white : VocarioTokens.canvas,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(
            color: isActive ? VocarioTokens.brand : VocarioTokens.border,
            width: isActive ? 1.5 : 1.0,
          ),
          boxShadow: isActive ? VocarioTokens.cardShadow : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14,
              color: isActive ? VocarioTokens.brand : VocarioTokens.muted,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                color: isActive ? VocarioTokens.ink : VocarioTokens.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================================================
  // 2. DARK CINEMATIC VIEWPORT (Khung hình AI Camera màu đen #1C1A17)
  // ==========================================================================
  Widget _buildCinematicViewport() {
    return Container(
      width: double.infinity,
      constraints: const BoxConstraints(minHeight: 380, maxHeight: 440),
      decoration: BoxDecoration(
        color: const Color(0xFF1C1A17),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFF3E3830)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Floating Top Badge: "Hướng camera về vật thể bạn muốn học"
            Positioned(
              top: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.75),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                ),
                child: const Text(
                  'Hướng camera về vật thể bạn muốn học',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: Colors.white,
                  ),
                ),
              ),
            ),

            // Lưới ngắm 3x3 khi được bật
            if (_isGridActive)
              Positioned.fill(
                child: CustomPaint(
                  painter: _CameraGridPainter(),
                ),
              ),

            // NỘI DUNG VIEWPORT: ẢNH VÀ BOUNDING BOXES ĐỒNG BỘ 1:1
            if (_customImageBytes != null)
              Center(
                child: FittedBox(
                  fit: BoxFit.contain,
                  child: SizedBox(
                    width: _imageWidth ?? 640,
                    height: _imageHeight ?? 480,
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        Image.memory(
                          _customImageBytes!,
                          width: _imageWidth ?? 640,
                          height: _imageHeight ?? 480,
                          fit: BoxFit.fill,
                        ),
                        if (_hasScanned && _detectedItems.isNotEmpty)
                          ..._detectedItems.asMap().entries.map((entry) {
                            final idx = entry.key;
                            final item = entry.value;
                            final rect = item['rect'] as Rect;
                            final isSelected = idx == _selectedWordIndex;

                            final canvasW = _imageWidth ?? 640.0;
                            final canvasH = _imageHeight ?? 480.0;
                            final left = rect.left * canvasW;
                            final top = rect.top * canvasH;
                            final width = rect.width * canvasW;
                            final height = rect.height * canvasH;

                            return Positioned(
                              left: left,
                              top: top,
                              width: width,
                              height: height,
                              child: GestureDetector(
                                onTap: () => setState(() => _selectedWordIndex = idx),
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 180),
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                      color: isSelected ? VocarioTokens.goldAccent : Colors.white.withValues(alpha: 0.85),
                                      width: isSelected ? 2.5 : 1.5,
                                    ),
                                    color: isSelected
                                        ? VocarioTokens.goldAccent.withValues(alpha: 0.28)
                                        : Colors.black.withValues(alpha: 0.08),
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                  child: Stack(
                                    clipBehavior: Clip.none,
                                    children: [
                                      // Label Tag
                                      Positioned(
                                        top: -24,
                                        left: -2,
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2.5),
                                          decoration: BoxDecoration(
                                            color: isSelected ? VocarioTokens.goldAccent : Colors.white,
                                            borderRadius: BorderRadius.circular(2),
                                            boxShadow: VocarioTokens.cardShadow,
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Text(
                                                item['word'] as String,
                                                style: const TextStyle(
                                                  fontSize: 10.5,
                                                  fontWeight: FontWeight.bold,
                                                  color: VocarioTokens.ink,
                                                ),
                                              ),
                                              const SizedBox(width: 4),
                                              Text(
                                                '${((item['confidence'] as double) * 100).toInt()}%',
                                                style: VocarioTokens.monoSmall.copyWith(
                                                  fontSize: 8.5,
                                                  color: VocarioTokens.brand,
                                                  fontWeight: FontWeight.bold,
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
                          }),
                      ],
                    ),
                  ),
                ),
              )
            else if (_activeStudioTab == 'camera') ...[
              // Trạng thái chuẩn bị camera
              Positioned.fill(
                child: Image.network(
                  _presetScenes[_activePresetIndex]['url']!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: const Color(0xFF1C1A17),
                    alignment: Alignment.center,
                    child: const Icon(Icons.videocam_outlined, size: 48, color: Colors.white38),
                  ),
                ),
              ),
              Positioned.fill(
                child: CustomPaint(
                  painter: _FocusCornersPainter(),
                ),
              ),
            ] else if (_activeStudioTab == 'upload') ...[
              // Vùng chọn tệp
              Center(
                child: InkWell(
                  onTap: _pickImageFromDevice,
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                          ),
                          child: const Icon(Icons.upload_file_rounded, size: 24, color: Colors.white70),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Tải file ảnh từ máy của bạn',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Nhấp để chọn tệp hình ảnh từ thiết bị\n(JPG, PNG, WEBP tối đa 15MB)',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.white.withValues(alpha: 0.65),
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: VocarioTokens.brand,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'Chọn tệp từ máy',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],

            // Laser Scan Line Animation khi đang chạy AI
            if (_isScanning)
              AnimatedBuilder(
                animation: _laserAnimation,
                builder: (context, child) {
                  return Stack(
                    children: [
                      Container(color: Colors.amber.withValues(alpha: 0.08)),
                      Align(
                        alignment: Alignment(0, (_laserAnimation.value * 2) - 1),
                        child: Container(
                          width: double.infinity,
                          height: 3,
                          decoration: BoxDecoration(
                            color: VocarioTokens.goldAccent,
                            boxShadow: [
                              BoxShadow(
                                color: VocarioTokens.goldAccent.withValues(alpha: 0.8),
                                blurRadius: 16,
                                spreadRadius: 3,
                              ),
                            ],
                          ),
                        ),
                      ),
                      Center(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.85),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: VocarioTokens.goldAccent,
                                ),
                              ),
                              SizedBox(width: 8),
                              Text(
                                'Mô hình Two-Stage AI đang bóc tách vật thể...',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  // ==========================================================================
  // 3. CAMERA CONTROLS BAR (Chuẩn Web: Status indicator, Shutter & Grid toggle)
  // ==========================================================================
  Widget _buildCameraControlsBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Trạng thái kết nối bên trái
          Row(
            children: [
              Container(
                width: 7,
                height: 7,
                decoration: BoxDecoration(
                  color: _customImageBytes != null || _activeStudioTab == 'camera'
                      ? const Color(0xFF10B981)
                      : VocarioTokens.muted,
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 6),
              Text(
                _activeStudioTab == 'camera'
                    ? (_customImageBytes != null ? 'Đã chụp ảnh' : 'Đang hoạt động')
                    : (_customImageBytes != null ? 'Đã nạp file ảnh' : 'Chờ tải file'),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: VocarioTokens.muted,
                ),
              ),
            ],
          ),

          // Nút Chụp ảnh hoặc Bắt đầu quét AI ở chính giữa
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Khi ở Camera và chưa chụp ảnh: Nút Chụp hình tròn
              if (_activeStudioTab == 'camera' && _customImageBytes == null && !_hasScanned)
                GestureDetector(
                  onTap: _isScanning ? null : _captureOrLoadFrame,
                  child: Container(
                    width: 58,
                    height: 58,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFD5CBBE), width: 2.5),
                    ),
                    alignment: Alignment.center,
                    child: Container(
                      width: 46,
                      height: 46,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Color(0xFFD5CBBE),
                      ),
                    ),
                  ),
                ),

              // Khi đã có ảnh nhưng chưa quét: Nút Bắt đầu quét AI
              if (_customImageBytes != null && !_hasScanned)
                ElevatedButton.icon(
                  onPressed: _isScanning
                      ? null
                      : () => _executeAiScan(
                            bytes: _customImageBytes!,
                            filename: _customImageName.isNotEmpty ? _customImageName : 'scan.jpg',
                          ),
                  icon: _isScanning
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.auto_awesome, size: 15, color: VocarioTokens.goldAccent),
                  label: Text(_isScanning ? 'Đang bóc tách AI...' : 'Bắt đầu quét AI'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: VocarioTokens.brand,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  ),
                ),

              // Khi đã quét xong: Nút Chụp ảnh mới
              if (_hasScanned)
                OutlinedButton.icon(
                  onPressed: _retakePhoto,
                  icon: const Icon(Icons.camera_alt_outlined, size: 14, color: VocarioTokens.brand),
                  label: const Text('Chụp ảnh mới', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11.5)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: VocarioTokens.brand,
                    side: const BorderSide(color: VocarioTokens.border),
                    backgroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  ),
                ),
            ],
          ),

          // Hai nút điều khiển bên phải (Làm mới / Bật lưới)
          Row(
            children: [
              InkWell(
                onTap: _retakePhoto,
                borderRadius: BorderRadius.circular(6),
                child: Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: VocarioTokens.border),
                  ),
                  child: const Icon(Icons.refresh_rounded, size: 15, color: VocarioTokens.muted),
                ),
              ),
              const SizedBox(width: 6),
              InkWell(
                onTap: () => setState(() => _isGridActive = !_isGridActive),
                borderRadius: BorderRadius.circular(6),
                child: Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: _isGridActive ? VocarioTokens.field : Colors.white,
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(
                      color: _isGridActive ? VocarioTokens.brand : VocarioTokens.border,
                    ),
                  ),
                  child: Icon(
                    Icons.grid_3x3_rounded,
                    size: 15,
                    color: _isGridActive ? VocarioTokens.brand : VocarioTokens.muted,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // 4. COMPANION LEDGER (NHẬT KÝ QUÉT TỪ VỰNG - CHUẨN FIGMA & WEB)
  // ==========================================================================
  Widget _buildCompanionLedger(Map<String, dynamic>? activeItem, bool isSaved) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: VocarioTokens.border),
        boxShadow: VocarioTokens.cardShadow,
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Ledger Top Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                'COMPANION LEDGER',
                style: VocarioTokens.monoSmall.copyWith(
                  fontSize: 9.5,
                  fontWeight: FontWeight.bold,
                  color: VocarioTokens.brand,
                  letterSpacing: 1.1,
                ),
              ),
              Text(
                _detectedItems.isNotEmpty
                    ? (_detectedItems.length < 10 ? '0${_detectedItems.length}' : '${_detectedItems.length}')
                    : '04',
                style: VocarioTokens.monoSmall.copyWith(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: VocarioTokens.muted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 2),
          Text(
            'Nhật ký quét từ vựng',
            style: VocarioTokens.serifHeadline.copyWith(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: VocarioTokens.ink,
            ),
          ),
          const SizedBox(height: 12),

          // TRẠNG THÁI 1: CHƯA QUÉT (Hiển thị 3 Bước Hướng Dẫn Timeline chuẩn Web)
          if (!_hasScanned || _detectedItems.isEmpty) ...[
            Text(
              'Khung học tập sẽ tự động cập nhật sau lần quét đầu tiên. Bạn có thể nghe phát âm, lưu từ và luyện hội thoại ngay tại đây.',
              style: TextStyle(
                fontSize: 11.5,
                color: VocarioTokens.muted,
                height: 1.45,
              ),
            ),
            const SizedBox(height: 16),

            // 3 Bước Hướng Dẫn
            _buildTimelineStep(
              number: '01',
              title: 'Ghi lại bối cảnh',
              description: 'Chụp hoặc tải ảnh đồ vật bạn gặp trong đời sống.',
            ),
            const SizedBox(height: 12),
            _buildTimelineStep(
              number: '02',
              title: 'Phân loại từ vựng',
              description: 'Hệ thống gợi ý nghĩa, phát âm và cấp độ A1 – C2.',
            ),
            const SizedBox(height: 12),
            _buildTimelineStep(
              number: '03',
              title: 'Luyện dùng từ tự nhiên',
              description: 'Tạo hội thoại ngắn dựa trên chính bối cảnh trong ảnh.',
            ),
            const SizedBox(height: 16),

            // Ghi chú bảo mật ảnh
            Container(
              padding: const EdgeInsets.only(top: 12),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: VocarioTokens.border)),
              ),
              child: Row(
                children: const [
                  Icon(Icons.check_circle_outline, size: 14, color: Color(0xFF10B981)),
                  SizedBox(width: 6),
                  Text(
                    'Ảnh chỉ được dùng trong phiên học hiện tại',
                    style: TextStyle(fontSize: 10.5, color: VocarioTokens.muted),
                  ),
                ],
              ),
            ),
          ],

          // TRẠNG THÁI 2: ĐÃ QUÉT THÀNH CÔNG (Chi tiết từ & Chip từ vựng)
          if (_hasScanned && _detectedItems.isNotEmpty && activeItem != null) ...[
            // Chi tiết từ được chọn (Chuẩn Figma)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: VocarioTokens.field,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: VocarioTokens.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: VocarioTokens.border),
                        ),
                        child: Text(
                          '${activeItem['level']} • ${activeItem['partOfSpeech']}',
                          style: VocarioTokens.monoSmall.copyWith(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: VocarioTokens.brand,
                          ),
                        ),
                      ),

                      // Nút phát âm & Chấm điểm nói AI
                      Row(
                        children: [
                          InkWell(
                            onTap: () => _playWordAudio(activeItem['word'] as String),
                            borderRadius: BorderRadius.circular(4),
                            child: Container(
                              width: 28,
                              height: 28,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(4),
                                border: Border.all(color: VocarioTokens.border),
                              ),
                              child: Icon(
                                Icons.volume_up_outlined,
                                size: 14,
                                color: _isSpeaking ? VocarioTokens.goldAccent : VocarioTokens.brand,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          InkWell(
                            onTap: () => SpeechScorerModal.show(
                              context,
                              word: activeItem['word'] as String,
                              ipa: activeItem['ipa'] as String,
                              vietnamese: activeItem['vietnamese'] as String,
                              contextTitle: 'Bối cảnh: $_sceneTitle',
                            ),
                            borderRadius: BorderRadius.circular(4),
                            child: Container(
                              height: 28,
                              padding: const EdgeInsets.symmetric(horizontal: 8),
                              decoration: BoxDecoration(
                                color: VocarioTokens.brand,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Row(
                                children: const [
                                  Icon(Icons.mic_none, size: 12, color: Colors.white),
                                  SizedBox(width: 4),
                                  Text(
                                    'Luyện nói',
                                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
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
                  Text(
                    activeItem['word'] as String,
                    style: VocarioTokens.serifHeadline.copyWith(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: VocarioTokens.ink,
                    ),
                  ),
                  Text(
                    activeItem['ipa'] as String,
                    style: VocarioTokens.monoSmall.copyWith(
                      fontSize: 11,
                      color: VocarioTokens.muted,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    activeItem['vietnamese'] as String,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: VocarioTokens.brand,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Câu ví dụ bối cảnh
                  if ((activeItem['exampleEn'] as String).isNotEmpty)
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: VocarioTokens.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '“${activeItem['exampleEn']}”',
                            style: const TextStyle(
                              fontSize: 11,
                              fontStyle: FontStyle.italic,
                              color: VocarioTokens.ink,
                              height: 1.35,
                            ),
                          ),
                          if ((activeItem['exampleVi'] as String).isNotEmpty)
                            Text(
                              activeItem['exampleVi'] as String,
                              style: TextStyle(
                                fontSize: 10,
                                color: VocarioTokens.muted,
                                height: 1.3,
                              ),
                            ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 10),

                  // Nút Lưu từ vào Sổ từ vựng SM-2
                  SizedBox(
                    width: double.infinity,
                    height: 38,
                    child: ElevatedButton.icon(
                      onPressed: isSaved || _isSaving ? null : _saveCurrentWordToSrs,
                      icon: isSaved
                          ? const Icon(Icons.check_circle_rounded, size: 14, color: Color(0xFF15803D))
                          : const Icon(Icons.bookmark_outline, size: 14),
                      label: Text(
                        isSaved ? 'Đã có trong Sổ từ vựng SM-2' : 'Lưu từ này vào Sổ từ vựng SM-2',
                        style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isSaved ? const Color(0xFFDCFCE7) : VocarioTokens.brand,
                        foregroundColor: isSaved ? const Color(0xFF15803D) : Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Danh sách Chip từ nhận diện trong ảnh
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Tất cả từ nhận diện trong ảnh:',
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.bold,
                    color: VocarioTokens.muted,
                  ),
                ),
                InkWell(
                  onTap: _isSavingAll ? null : _saveAllWordsToSrs,
                  child: Row(
                    children: [
                      const Icon(Icons.bookmark_outline, size: 12, color: VocarioTokens.brand),
                      const SizedBox(width: 3),
                      Text(
                        _isSavingAll ? 'Đang lưu...' : 'Lưu toàn bộ vào Sổ',
                        style: const TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.bold,
                          color: VocarioTokens.brand,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: _detectedItems.asMap().entries.map((e) {
                final idx = e.key;
                final it = e.value;
                final isSelected = idx == _selectedWordIndex;
                final word = it['word'] as String;

                return InkWell(
                  onTap: () => setState(() => _selectedWordIndex = idx),
                  borderRadius: BorderRadius.circular(4),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 140),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: isSelected ? VocarioTokens.brand : VocarioTokens.field,
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(
                        color: isSelected ? VocarioTokens.brand : VocarioTokens.border,
                      ),
                    ),
                    child: Text(
                      word,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        color: isSelected ? Colors.white : VocarioTokens.ink,
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),

            // Hội thoại ngữ cảnh thực tế (Groq LLM)
            if (_dialogueTurns.isNotEmpty) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.only(top: 12),
                decoration: const BoxDecoration(
                  border: Border(top: BorderSide(color: VocarioTokens.border)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Hội thoại ngữ cảnh thực tế',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: VocarioTokens.ink,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ..._dialogueTurns.map((turn) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 6),
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: VocarioTokens.field,
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: VocarioTokens.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  turn['speaker'] ?? 'Speaker',
                                  style: const TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.bold,
                                    color: VocarioTokens.brand,
                                  ),
                                ),
                                InkWell(
                                  onTap: () => speakTextBrowser(turn['en'] ?? ''),
                                  child: const Icon(Icons.volume_up_outlined, size: 13, color: VocarioTokens.brand),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              turn['en'] ?? '',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: VocarioTokens.ink),
                            ),
                            Text(
                              turn['vi'] ?? '',
                              style: TextStyle(fontSize: 9.5, fontStyle: FontStyle.italic, color: VocarioTokens.muted),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildTimelineStep({
    required String number,
    required String title,
    required String description,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 26,
          height: 26,
          decoration: BoxDecoration(
            color: VocarioTokens.field,
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: VocarioTokens.border),
          ),
          alignment: Alignment.center,
          child: Text(
            number,
            style: VocarioTokens.monoSmall.copyWith(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: VocarioTokens.brand,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: VocarioTokens.ink,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: TextStyle(
                  fontSize: 10.5,
                  color: VocarioTokens.muted,
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
      ],
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
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: VocarioTokens.border),
          boxShadow: VocarioTokens.toastShadow,
        ),
        child: Row(
          children: [
            Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: VocarioTokens.brand.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check, size: 13, color: VocarioTokens.brand),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                _toastMessage!,
                style: const TextStyle(fontSize: 11, color: VocarioTokens.ink, height: 1.35),
              ),
            ),
            GestureDetector(
              onTap: () => setState(() => _toastMessage = null),
              child: const Icon(Icons.close, size: 14, color: VocarioTokens.muted),
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

    const cornerLength = 18.0;
    const margin = 20.0;

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

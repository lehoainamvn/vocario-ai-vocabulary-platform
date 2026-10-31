import 'dart:async';
import 'package:flutter/material.dart';
import '../core/constants/tokens.dart';
import '../core/services/api_service.dart';
import '../core/utils/image_picker_helper.dart';

class SpeechScorerModal extends StatefulWidget {
  final String word;
  final String ipa;
  final String vietnamese;
  final String? progressId;
  final String? contextTitle;

  const SpeechScorerModal({
    super.key,
    required this.word,
    required this.ipa,
    required this.vietnamese,
    this.progressId,
    this.contextTitle,
  });

  static Future<void> show(
    BuildContext context, {
    required String word,
    required String ipa,
    required String vietnamese,
    String? progressId,
    String? contextTitle,
  }) {
    return showDialog(
      context: context,
      builder: (_) => SpeechScorerModal(
        word: word,
        ipa: ipa,
        vietnamese: vietnamese,
        progressId: progressId,
        contextTitle: contextTitle,
      ),
    );
  }

  @override
  State<SpeechScorerModal> createState() => _SpeechScorerModalState();
}

/// Helper function tiện lợi mở modal chấm phát âm AI từ bất kỳ màn hình nào
Future<void> showSpeechScorerModal({
  required BuildContext context,
  required String targetWord,
  required String ipa,
  required String vietnamese,
  String? exampleEn,
  String? progressId,
  String? contextTitle,
}) {
  return SpeechScorerModal.show(
    context,
    word: targetWord,
    ipa: ipa,
    vietnamese: vietnamese,
    progressId: progressId,
    contextTitle: contextTitle,
  );
}

class _SpeechScorerModalState extends State<SpeechScorerModal>
    with SingleTickerProviderStateMixin {
  bool _isListening = false;
  String _transcript = '';
  double? _score;
  List<Map<String, dynamic>> _detailedTokens = [];
  bool _isSubmitting = false;
  String? _statusMessage;
  Timer? _timeoutTimer;
  bool _showManualInput = false;
  final TextEditingController _manualTextController = TextEditingController();
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
    _manualTextController.text = widget.word;

    // Tự động phát âm mẫu 1 lần nhẹ nhàng khi mở modal để người dùng tham khảo
    WidgetsBinding.instance.addPostFrameCallback((_) {
      speakTextBrowser(widget.word);
    });
  }

  @override
  void dispose() {
    _timeoutTimer?.cancel();
    stopSpeechRecognition();
    _pulseController.dispose();
    _manualTextController.dispose();
    super.dispose();
  }

  void _startListening() {
    _timeoutTimer?.cancel();
    setState(() {
      _isListening = true;
      _transcript = '';
      _score = null;
      _detailedTokens = [];
      _statusMessage = 'Đang lắng nghe... Hãy phát âm to và rõ ràng: "${widget.word}"';
    });

    // Timeout an toàn sau 8 giây nếu trình duyệt không trả về tín hiệu
    _timeoutTimer = Timer(const Duration(seconds: 8), () {
      if (mounted && _isListening) {
        if (_transcript.trim().isNotEmpty) {
          _evaluateSpeech(_transcript);
        } else {
          stopSpeechRecognition();
          setState(() {
            _isListening = false;
            _statusMessage = 'Hết thời gian chờ. Bạn hãy thử bấm micro và đọc lại nhé!';
          });
        }
      }
    });

    startSpeechRecognition(
      onResult: (transcript, isFinal) {
        if (!mounted) return;
        setState(() {
          _transcript = transcript;
        });

        if (isFinal && transcript.trim().isNotEmpty) {
          _timeoutTimer?.cancel();
          _evaluateSpeech(transcript);
        }
      },
      onError: (err) {
        if (!mounted) return;
        _timeoutTimer?.cancel();
        setState(() {
          _isListening = false;
          _statusMessage = err;
        });
      },
      onEnd: () {
        if (!mounted) return;
        _timeoutTimer?.cancel();
        if (_isListening && _transcript.trim().isNotEmpty && _score == null) {
          _evaluateSpeech(_transcript);
        } else if (_isListening && _score == null) {
          setState(() {
            _isListening = false;
            if (_statusMessage == null || _statusMessage!.startsWith('Đang')) {
              _statusMessage = 'Đã dừng thu âm. Chạm micro để đọc lại.';
            }
          });
        }
      },
    );
  }

  void _stopListening() {
    _timeoutTimer?.cancel();
    stopSpeechRecognition();
    setState(() => _isListening = false);
    if (_transcript.trim().isNotEmpty && _score == null) {
      _evaluateSpeech(_transcript);
    } else if (_score == null) {
      setState(() {
        _statusMessage = 'Đã dừng thu âm. Chạm micro để đọc lại.';
      });
    }
  }

  void _evaluateSpeech(String spoken) {
    _timeoutTimer?.cancel();
    stopSpeechRecognition();
    final target = widget.word.trim().toLowerCase();
    final userText = spoken.trim().toLowerCase();

    // Tính độ tương đồng ký tự (Levenshtein Distance Similarity)
    final double similarity = _calculateSimilarity(target, userText);
    double calculatedScore = (similarity * 100).clamp(10, 100);

    // Phân rã từ vựng để tạo feedback trực quan từng token
    final targetTokens = target.split(RegExp(r'\s+'));
    final userTokens = userText.split(RegExp(r'\s+'));

    List<Map<String, dynamic>> tokensFeedback = [];
    for (int i = 0; i < targetTokens.length; i++) {
      final t = targetTokens[i];
      if (i < userTokens.length) {
        final u = userTokens[i];
        if (t == u) {
          tokensFeedback.add({'token': t, 'status': 'CORRECT'});
        } else if (_calculateSimilarity(t, u) >= 0.6) {
          tokensFeedback.add({'token': t, 'status': 'CLOSE'});
        } else {
          tokensFeedback.add({'token': t, 'status': 'MISSED'});
        }
      } else {
        tokensFeedback.add({'token': t, 'status': 'MISSED'});
      }
    }

    setState(() {
      _isListening = false;
      _score = calculatedScore;
      _detailedTokens = tokensFeedback;
      if (calculatedScore >= 85) {
        _statusMessage = 'Xuất sắc! Phát âm rất chuẩn xác bản ngữ.';
      } else if (calculatedScore >= 70) {
        _statusMessage = 'Khá tốt! Chú ý nhấn đúng trọng âm hơn.';
      } else {
        _statusMessage = 'Hãy nghe phát âm mẫu và thử đọc lại lần nữa.';
      }
    });
  }

  double _calculateSimilarity(String s1, String s2) {
    if (s1 == s2) return 1.0;
    if (s1.isEmpty || s2.isEmpty) return 0.0;

    int distance = _levenshtein(s1, s2);
    int maxLen = s1.length > s2.length ? s1.length : s2.length;
    return 1.0 - (distance / maxLen);
  }

  int _levenshtein(String s, String t) {
    if (s == t) return 0;
    if (s.isEmpty) return t.length;
    if (t.isEmpty) return s.length;

    List<int> v0 = List<int>.filled(t.length + 1, 0);
    List<int> v1 = List<int>.filled(t.length + 1, 0);

    for (int i = 0; i <= t.length; i++) {
      v0[i] = i;
    }

    for (int i = 0; i < s.length; i++) {
      v1[0] = i + 1;
      for (int j = 0; j < t.length; j++) {
        int cost = (s[i] == t[j]) ? 0 : 1;
        v1[j + 1] = [
          v1[j] + 1,
          v0[j + 1] + 1,
          v0[j] + cost,
        ].reduce((a, b) => a < b ? a : b);
      }
      for (int j = 0; j <= t.length; j++) {
        v0[j] = v1[j];
      }
    }

    return v1[t.length];
  }

  Future<void> _submitReview() async {
    setState(() => _isSubmitting = true);
    final grade = (_score ?? 70) >= 85 ? 5 : ((_score ?? 70) >= 70 ? 4 : 3);
    final res = await ApiService().submitPronunciationReview(
      progressId: widget.progressId,
      wordText: widget.word,
      ratingGrade: grade,
      speechScore: _score ?? 75.0,
    );

    if (mounted) {
      Navigator.pop(context);
      final streak = res != null ? res['streakCount'] : null;
      final msg = streak != null
          ? 'Đã ghi nhận phát âm! 🔥 Chuỗi học: $streak ngày'
          : 'Đã hoàn tất bài luyện phát âm cho "${widget.word}"!';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(msg),
          duration: const Duration(seconds: 3),
          backgroundColor: const Color(0xFF7D6853),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 420),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFE5DED3)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.18),
              blurRadius: 30,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Top Bar
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                decoration: const BoxDecoration(
                  color: Color(0xFFFAF8F5),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                  border: Border(bottom: BorderSide(color: Color(0xFFE5DED3))),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: VocarioTokens.brand,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.mic_rounded, size: 18, color: VocarioTokens.goldAccent),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'TRỢ LÝ LUYỆN PHÁT ÂM AI',
                              style: VocarioTokens.monoSmall.copyWith(fontSize: 8.5, color: VocarioTokens.brand),
                            ),
                            Text(
                              widget.contextTitle ?? 'Chấm điểm phát âm',
                              style: VocarioTokens.serifHeadline.copyWith(fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close_rounded, size: 18),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
              ),

              // Content Body
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Target Card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFAF8F5),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE5DED3)),
                      ),
                      child: Column(
                        children: [
                          Text(
                            widget.word,
                            style: VocarioTokens.serifHeadline.copyWith(
                              fontSize: 26,
                              fontWeight: FontWeight.bold,
                              color: VocarioTokens.ink,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.ipa,
                            style: VocarioTokens.monoSmall.copyWith(
                              fontSize: 12,
                              color: VocarioTokens.muted,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            widget.vietnamese,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: VocarioTokens.brand),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 12),
                          InkWell(
                            onTap: () => speakTextBrowser(widget.word),
                            borderRadius: BorderRadius.circular(999),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(999),
                                border: Border.all(color: const Color(0xFFE5DED3)),
                                boxShadow: VocarioTokens.cardShadow,
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: const [
                                  Icon(Icons.volume_up_rounded, size: 14, color: VocarioTokens.brand),
                                  SizedBox(width: 6),
                                  Text(
                                    'Nghe phát âm chuẩn',
                                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: VocarioTokens.brand),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),

                    // Microphone Button
                    GestureDetector(
                      onTap: _isListening ? _stopListening : _startListening,
                      child: AnimatedBuilder(
                        animation: _pulseController,
                        builder: (context, child) {
                          final pulse = _isListening ? _pulseController.value * 10 : 0.0;
                          return Container(
                            width: 76 + pulse,
                            height: 76 + pulse,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: _isListening ? const Color(0xFFDC2626) : VocarioTokens.brand,
                              boxShadow: [
                                BoxShadow(
                                  color: (_isListening ? const Color(0xFFDC2626) : VocarioTokens.brand).withValues(alpha: 0.35),
                                  blurRadius: 20,
                                  spreadRadius: pulse / 2,
                                ),
                              ],
                            ),
                            child: Icon(
                              _isListening ? Icons.stop_rounded : Icons.mic_rounded,
                              size: 34,
                              color: Colors.white,
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _isListening ? 'Bấm để hoàn tất đọc' : 'Chạm micro để bắt đầu đọc',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: _isListening ? const Color(0xFFDC2626) : VocarioTokens.muted,
                      ),
                    ),

                    // Status / Permission / Error Banner (Hiển thị ngay cả khi _score == null)
                    if (_statusMessage != null && _score == null) ...[
                      const SizedBox(height: 12),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: _isListening ? const Color(0xFFEFF6FF) : const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: _isListening ? const Color(0xFFBFDBFE) : const Color(0xFFFDE68A),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              _isListening ? Icons.hearing_rounded : Icons.info_outline_rounded,
                              size: 18,
                              color: _isListening ? const Color(0xFF2563EB) : const Color(0xFFD97706),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _statusMessage!,
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w500,
                                  color: _isListening ? const Color(0xFF1D4ED8) : const Color(0xFF92400E),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    // Live Speech Preview while listening
                    if (_isListening && _transcript.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFCBD5E1)),
                        ),
                        child: Row(
                          children: [
                            const SizedBox(
                              width: 12,
                              height: 12,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2563EB)),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Đang nhận diện: "$_transcript"',
                                style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Color(0xFF334155)),
                              ),
                            ),
                            const SizedBox(width: 6),
                            InkWell(
                              onTap: () => _evaluateSpeech(_transcript),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: VocarioTokens.brand,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Text(
                                  'Chấm ngay',
                                  style: TextStyle(fontSize: 11, color: Colors.white, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    // Feedback / Score Section
                    if (_score != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: _score! >= 80 ? const Color(0xFFF0FDF4) : const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: _score! >= 80 ? const Color(0xFF86EFAC) : const Color(0xFFFCD34D),
                          ),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  _score! >= 80 ? Icons.check_circle_rounded : Icons.info_outline_rounded,
                                  size: 20,
                                  color: _score! >= 80 ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'ĐỘ CHÍNH XÁC: ${_score!.toInt()}%',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: _score! >= 80 ? const Color(0xFF166534) : const Color(0xFF92400E),
                                  ),
                                ),
                              ],
                            ),
                            if (_transcript.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(
                                'Bạn đã đọc: "$_transcript"',
                                style: const TextStyle(fontSize: 11.5, fontStyle: FontStyle.italic, color: Color(0xFF475569)),
                              ),
                            ],
                            if (_statusMessage != null) ...[
                              const SizedBox(height: 6),
                              Text(
                                _statusMessage!,
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w500,
                                  color: _score! >= 80 ? const Color(0xFF166534) : const Color(0xFF92400E),
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ],

                            // Token-level Breakdown
                            if (_detailedTokens.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              Wrap(
                                alignment: WrapAlignment.center,
                                spacing: 6,
                                runSpacing: 6,
                                children: _detailedTokens.map((t) {
                                  final status = t['status'] as String? ?? 'MISSED';
                                  final isCorrect = status == 'CORRECT';
                                  final isClose = status == 'CLOSE';
                                  final Color bg = isCorrect
                                      ? const Color(0xFFDCFCE7)
                                      : (isClose ? const Color(0xFFFEF3C7) : const Color(0xFFFEE2E2));
                                  final Color border = isCorrect
                                      ? const Color(0xFF86EFAC)
                                      : (isClose ? const Color(0xFFFCD34D) : const Color(0xFFFECACA));
                                  final Color textCol = isCorrect
                                      ? const Color(0xFF15803D)
                                      : (isClose ? const Color(0xFFB45309) : const Color(0xFFB91C1C));

                                  return Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: bg,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: border),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          isCorrect
                                              ? Icons.check_circle_rounded
                                              : (isClose ? Icons.check_circle_outline_rounded : Icons.cancel_outlined),
                                          size: 13,
                                          color: textCol,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          t['token'] ?? '',
                                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: textCol),
                                        ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ],

                    // Manual simulation / Fallback option
                    const SizedBox(height: 12),
                    InkWell(
                      onTap: () {
                        setState(() {
                          _showManualInput = !_showManualInput;
                        });
                      },
                      child: Text(
                        _showManualInput ? 'Ẩn bộ kiểm thử thủ công' : 'Không có mic? Bấm để thử nghiệm phát âm',
                        style: const TextStyle(fontSize: 11, color: VocarioTokens.muted, decoration: TextDecoration.underline),
                      ),
                    ),

                    if (_showManualInput) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFAF8F5),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE5DED3)),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _manualTextController,
                                decoration: const InputDecoration(
                                  isDense: true,
                                  hintText: 'Nhập từ phát âm để chấm điểm...',
                                  border: OutlineInputBorder(),
                                  contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                ),
                                style: const TextStyle(fontSize: 12),
                              ),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton(
                              onPressed: () {
                                if (_manualTextController.text.trim().isNotEmpty) {
                                  _evaluateSpeech(_manualTextController.text.trim());
                                }
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: VocarioTokens.brand,
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              ),
                              child: const Text('Chấm điểm', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 16),

                    // Action Buttons
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: _startListening,
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Color(0xFFE5DED3)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            child: const Text('Thử lại', style: TextStyle(color: VocarioTokens.ink, fontWeight: FontWeight.bold)),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: _isSubmitting ? null : _submitReview,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: VocarioTokens.brand,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            child: _isSubmitting
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Text('Ghi nhận SM-2', style: TextStyle(fontWeight: FontWeight.bold)),
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
      ),
    );
  }
}

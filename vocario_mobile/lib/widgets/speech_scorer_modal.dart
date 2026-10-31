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

class _SpeechScorerModalState extends State<SpeechScorerModal> with SingleTickerProviderStateMixin {
  bool _isListening = false;
  String _transcript = '';
  double? _score;
  List<Map<String, dynamic>> _detailedTokens = [];
  bool _isSubmitting = false;
  String? _statusMessage;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    stopSpeechRecognition();
    _pulseController.dispose();
    super.dispose();
  }

  void _startListening() {
    setState(() {
      _isListening = true;
      _transcript = '';
      _score = null;
      _detailedTokens = [];
      _statusMessage = 'Đang lắng nghe giọng phát âm của bạn...';
    });

    startSpeechRecognition(
      onResult: (transcript, isFinal) {
        if (!mounted) return;
        setState(() {
          _transcript = transcript;
        });

        if (isFinal) {
          _evaluateSpeech(transcript);
        }
      },
      onError: (err) {
        if (!mounted) return;
        setState(() {
          _isListening = false;
          _statusMessage = err;
        });
      },
      onEnd: () {
        if (!mounted) return;
        if (_isListening && _transcript.isNotEmpty && _score == null) {
          _evaluateSpeech(_transcript);
        } else {
          setState(() => _isListening = false);
        }
      },
    );
  }

  void _stopListening() {
    stopSpeechRecognition();
    setState(() => _isListening = false);
    if (_transcript.isNotEmpty && _score == null) {
      _evaluateSpeech(_transcript);
    }
  }

  void _evaluateSpeech(String spoken) {
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
        v1[j + 1] = [v1[j] + 1, v0[j + 1] + 1, v0[j] + cost].reduce((a, b) => a < b ? a : b);
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
                  const SizedBox(height: 20),

                  // Microphone Button
                  GestureDetector(
                    onTap: _isListening ? _stopListening : _startListening,
                    child: AnimatedBuilder(
                      animation: _pulseController,
                      builder: (context, child) {
                        final pulse = _isListening ? _pulseController.value * 8 : 0.0;
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
                  const SizedBox(height: 12),
                  Text(
                    _isListening ? 'Bấm để hoàn tất đọc' : 'Chạm micro để bắt đầu đọc',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: _isListening ? const Color(0xFFDC2626) : VocarioTokens.muted,
                    ),
                  ),

                  // Feedback / Score Section
                  if (_transcript.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFAF8F5),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Bạn đã nói: "$_transcript"',
                        style: const TextStyle(fontSize: 11.5, fontStyle: FontStyle.italic),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],

                  if (_score != null) ...[
                    const SizedBox(height: 16),
                    Container(
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
                                size: 18,
                                color: _score! >= 80 ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'ĐỘ CHÍNH XÁC: ${_score!.toInt()}%',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: _score! >= 80 ? const Color(0xFF166534) : const Color(0xFF92400E),
                                ),
                              ),
                            ],
                          ),
                          if (_statusMessage != null) ...[
                            const SizedBox(height: 4),
                            Text(
                              _statusMessage!,
                              style: TextStyle(
                                fontSize: 11,
                                color: _score! >= 80 ? const Color(0xFF166534) : const Color(0xFF92400E),
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],

                  const SizedBox(height: 18),

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
    );
  }
}


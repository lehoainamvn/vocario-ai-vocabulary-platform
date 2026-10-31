import 'dart:async';
import 'dart:html' as html;
import 'dart:js' as js;
import 'dart:js_util' as js_util;
import 'dart:typed_data';

class PickedImageData {
  final Uint8List bytes;
  final String name;
  final String? dataUrl;

  PickedImageData({
    required this.bytes,
    required this.name,
    this.dataUrl,
  });
}

Future<PickedImageData?> pickImageFromDevice() {
  final completer = Completer<PickedImageData?>();
  final uploadInput = html.FileUploadInputElement()..accept = 'image/*';
  uploadInput.click();

  uploadInput.onChange.listen((e) {
    final files = uploadInput.files;
    if (files != null && files.isNotEmpty) {
      final file = files[0];
      final reader = html.FileReader();
      reader.readAsArrayBuffer(file);
      reader.onLoadEnd.listen((_) {
        final bytes = Uint8List.fromList(reader.result as List<int>);
        final dataReader = html.FileReader();
        dataReader.readAsDataUrl(file);
        dataReader.onLoadEnd.listen((_) {
          completer.complete(PickedImageData(
            bytes: bytes,
            name: file.name,
            dataUrl: dataReader.result as String,
          ));
        });
      });
    } else {
      completer.complete(null);
    }
  });

  return completer.future;
}

Future<PickedImageData?> pickDocumentFromDevice() {
  final completer = Completer<PickedImageData?>();
  final uploadInput = html.FileUploadInputElement()..accept = '.pdf,.docx,.doc,.txt,.md';
  uploadInput.click();

  uploadInput.onChange.listen((e) {
    final files = uploadInput.files;
    if (files != null && files.isNotEmpty) {
      final file = files[0];
      final reader = html.FileReader();
      reader.readAsArrayBuffer(file);
      reader.onLoadEnd.listen((_) {
        final bytes = Uint8List.fromList(reader.result as List<int>);
        completer.complete(PickedImageData(
          bytes: bytes,
          name: file.name,
        ));
      });
    } else {
      completer.complete(null);
    }
  });

  return completer.future;
}

void speakTextBrowser(String text) {
  try {
    final utterance = html.SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    html.window.speechSynthesis?.cancel();
    html.window.speechSynthesis?.speak(utterance);
  } catch (_) {}
}

typedef SpeechResultCallback = void Function(String transcript, bool isFinal);
typedef SpeechErrorCallback = void Function(String error);

dynamic _activeRecognition;

void startSpeechRecognition({
  required SpeechResultCallback onResult,
  required SpeechErrorCallback onError,
  void Function()? onEnd,
}) {
  try {
    final hasStandard = js_util.hasProperty(html.window, 'SpeechRecognition');
    final hasWebkit = js_util.hasProperty(html.window, 'webkitSpeechRecognition');

    if (!hasStandard && !hasWebkit) {
      onError('Trình duyệt chưa hỗ trợ Web Speech API. Bạn nên dùng Google Chrome hoặc Microsoft Edge.');
      return;
    }

    // Hủy phiên nhận diện trước đó nếu có
    if (_activeRecognition != null) {
      try {
        js_util.callMethod(_activeRecognition, 'abort', []);
      } catch (_) {}
      _activeRecognition = null;
    }

    final speechConstructor = hasStandard
        ? js_util.getProperty(html.window, 'SpeechRecognition')
        : js_util.getProperty(html.window, 'webkitSpeechRecognition');

    final recognition = js_util.callConstructor(speechConstructor, []);
    _activeRecognition = recognition;

    js_util.setProperty(recognition, 'continuous', false);
    js_util.setProperty(recognition, 'lang', 'en-US');
    js_util.setProperty(recognition, 'interimResults', true);
    js_util.setProperty(recognition, 'maxAlternatives', 3);

    js_util.setProperty(recognition, 'onresult', js.allowInterop((event) {
      try {
        final results = js_util.getProperty(event, 'results');
        if (results == null) return;
        final int length = js_util.getProperty(results, 'length') ?? 0;
        String finalTranscript = '';
        String interimTranscript = '';

        for (int i = 0; i < length; i++) {
          final resItem = js_util.callMethod(results, 'item', [i]) ?? js_util.getProperty(results, i);
          if (resItem == null) continue;
          final bool isFinal = js_util.getProperty(resItem, 'isFinal') == true;
          final alt0 = js_util.callMethod(resItem, 'item', [0]) ?? js_util.getProperty(resItem, 0);
          if (alt0 == null) continue;
          final transcript = js_util.getProperty(alt0, 'transcript')?.toString() ?? '';
          if (isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        final combined = finalTranscript.isNotEmpty ? finalTranscript : interimTranscript;
        if (combined.trim().isNotEmpty) {
          onResult(combined.trim(), finalTranscript.isNotEmpty);
        }
      } catch (err) {
        // Safe capture
      }
    }));

    js_util.setProperty(recognition, 'onerror', js.allowInterop((event) {
      final err = js_util.getProperty(event, 'error')?.toString() ?? '';
      if (err == 'not-allowed') {
        onError('Trình duyệt bị từ chối quyền Micro. Vui lòng bấm vào icon ổ khóa trên thanh địa chỉ và chọn "Cho phép" (Allow) microphone.');
      } else if (err == 'no-speech') {
        onError('Chưa nhận diện được giọng nói. Bạn hãy bấm nói lại to và rõ ràng hơn nhé.');
      } else if (err == 'audio-capture') {
        onError('Không phát hiện micro trên thiết bị.');
      } else {
        onError('Lỗi thu âm: $err');
      }
    }));

    js_util.setProperty(recognition, 'onend', js.allowInterop((_) {
      onEnd?.call();
    }));

    js_util.callMethod(recognition, 'start', []);
  } catch (e) {
    onError('Không thể khởi động micro: $e');
  }
}

void stopSpeechRecognition() {
  try {
    if (_activeRecognition != null) {
      js_util.callMethod(_activeRecognition, 'stop', []);
      _activeRecognition = null;
    }
  } catch (_) {}
}

import 'dart:async';
import 'dart:html' as html;
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

html.SpeechRecognition? _activeRecognition;

void startSpeechRecognition({
  required SpeechResultCallback onResult,
  required SpeechErrorCallback onError,
  void Function()? onEnd,
}) {
  try {
    if (!html.SpeechRecognition.supported) {
      onError('Trình duyệt chưa hỗ trợ Web Speech Recognition.');
      return;
    }

    _activeRecognition?.abort();
    final recognition = html.SpeechRecognition();
    _activeRecognition = recognition;
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = true;

    recognition.onResult.listen((event) {
      final results = event.results;
      if (results != null && results.isNotEmpty) {
        final lastResult = results[results.length - 1];
        final transcript = lastResult.item(0)?.transcript ?? '';
        final isFinal = lastResult.isFinal ?? false;
        onResult(transcript, isFinal);
      }
    });

    recognition.onError.listen((event) {
      onError('Không thể thu âm: ${event.error ?? ""}');
    });

    recognition.onEnd.listen((_) {
      onEnd?.call();
    });

    recognition.start();
  } catch (e) {
    onError('Lỗi khởi động micro: $e');
  }
}

void stopSpeechRecognition() {
  try {
    _activeRecognition?.stop();
    _activeRecognition = null;
  } catch (_) {}
}

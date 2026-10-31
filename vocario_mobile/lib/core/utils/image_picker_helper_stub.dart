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

Future<PickedImageData?> pickImageFromDevice() async {
  return null;
}

Future<PickedImageData?> pickDocumentFromDevice() async {
  return null;
}

void speakTextBrowser(String text) {
  // Stub for non-web
}

typedef SpeechResultCallback = void Function(String transcript, bool isFinal);
typedef SpeechErrorCallback = void Function(String error);

void startSpeechRecognition({
  required SpeechResultCallback onResult,
  required SpeechErrorCallback onError,
  void Function()? onEnd,
}) {
  onError('Chức năng nhận diện giọng nói chưa hỗ trợ trên nền tảng này.');
}

void stopSpeechRecognition() {
  // Stub for non-web
}

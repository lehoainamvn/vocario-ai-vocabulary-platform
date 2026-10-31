import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio _dio;
  late final Dio _aiDio;

  // Địa chỉ backend mặc định:
  // - Flutter Web: 127.0.0.1
  // - Android Emulator: 10.0.2.2
  // - iOS Simulator / Desktop: 127.0.0.1
  static String get defaultBaseUrl {
    if (kIsWeb) {
      return 'http://127.0.0.1:8088';
    }
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:8088';
    }
    return 'http://127.0.0.1:8088';
  }

  static String get defaultAiVisionUrl {
    if (kIsWeb) {
      return 'http://127.0.0.1:8001';
    }
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:8001';
    }
    return 'http://127.0.0.1:8001';
  }

  ApiService._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: defaultBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _aiDio = Dio(
      BaseOptions(
        baseUrl: defaultAiVisionUrl,
        connectTimeout: const Duration(seconds: 25),
        receiveTimeout: const Duration(seconds: 40),
        headers: {
          'Accept': 'application/json',
        },
      ),
    );

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final prefs = await SharedPreferences.getInstance();
          final token = prefs.getString('vocario_jwt_token');
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
      ),
    );
  }

  void updateBaseUrl(String newUrl) {
    _dio.options.baseUrl = newUrl;
  }

  // ==========================================
  // 1. AUTHENTICATION & PROFILE APIs
  // ==========================================

  /// Đăng nhập tài khoản
  Future<Map<String, dynamic>> login({
    required String usernameOrEmail,
    required String password,
  }) async {
    try {
      final response = await _dio.post(
        '/api/auth/login',
        data: {
          'usernameOrEmail': usernameOrEmail.trim(),
          'password': password,
        },
      );

      final data = response.data as Map<String, dynamic>;
      final token = data['token'] as String?;
      if (token != null && token.isNotEmpty) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('vocario_jwt_token', token);
        await prefs.setString('vocario_user_id', data['userId']?.toString() ?? '');
        await prefs.setString('vocario_username', data['username']?.toString() ?? '');
      }

      return data;
    } on DioException catch (e) {
      final message = e.response?.data?['message'] ??
          e.response?.data?['error'] ??
          'Không thể kết nối đến máy chủ Vocario (${e.message})';
      throw Exception(message);
    }
  }

  /// Đăng ký tài khoản mới & gán mục tiêu CEFR
  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String fullName,
    String? username,
    String targetLevel = 'A2',
  }) async {
    try {
      final effectiveUsername = (username != null && username.isNotEmpty)
          ? username
          : email.split('@').first;

      final response = await _dio.post(
        '/api/auth/register',
        data: {
          'email': email.trim(),
          'username': effectiveUsername.trim(),
          'password': password,
          'fullName': fullName.trim(),
        },
      );

      final data = response.data as Map<String, dynamic>;
      final token = data['token'] as String?;
      final userId = data['userId']?.toString();

      if (token != null && token.isNotEmpty) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('vocario_jwt_token', token);
        if (userId != null) {
          await prefs.setString('vocario_user_id', userId);
        }

        // Cập nhật mục tiêu CEFR
        if (userId != null) {
          try {
            await _dio.put(
              '/api/auth/profile',
              queryParameters: {'userId': userId},
              data: {
                'fullName': fullName,
                'targetLevel': targetLevel,
                'dailyGoal': 10,
              },
            );
          } catch (_) {
            // Không chặn luồng nếu cập nhật profile bổ trợ gặp độ trễ
          }
        }
      }

      return data;
    } on DioException catch (e) {
      final message = e.response?.data?['message'] ??
          e.response?.data?['error'] ??
          'Đăng ký không thành công (${e.message})';
      throw Exception(message);
    }
  }

  /// Lấy thông tin người dùng từ CSDL
  Future<Map<String, dynamic>?> getUserProfile() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final response = await _dio.get(
        '/api/auth/me',
        queryParameters: userId != null && userId.isNotEmpty ? {'userId': userId} : null,
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Cập nhật thông tin học viên (Họ tên, mục tiêu CEFR, mục tiêu hàng ngày)
  Future<Map<String, dynamic>?> updateProfile({
    String? fullName,
    String? targetLevel,
    int? dailyGoal,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final Map<String, dynamic> requestBody = {};
      if (fullName != null) requestBody['fullName'] = fullName;
      if (targetLevel != null) requestBody['targetLevel'] = targetLevel;
      if (dailyGoal != null) requestBody['dailyGoal'] = dailyGoal;

      final response = await _dio.put(
        '/api/auth/profile',
        queryParameters: userId != null && userId.isNotEmpty ? {'userId': userId} : null,
        data: requestBody,
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Thăng cấp mục tiêu CEFR tự động
  Future<Map<String, dynamic>?> levelUpUser() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final response = await _dio.post(
        '/api/auth/level-up',
        queryParameters: userId != null && userId.isNotEmpty ? {'userId': userId} : null,
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Đăng xuất và xóa token / user id
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('vocario_jwt_token');
    await prefs.remove('vocario_user_id');
    await prefs.remove('vocario_username');
  }

  // ==========================================
  // 2. SRS & FLASHCARD (SPACED REPETITION) APIs
  // ==========================================

  /// Lấy danh sách từ cần ôn tập hôm nay (SM-2) từ CSDL
  Future<List<dynamic>> getDueCards() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final response = await _dio.get(
        '/api/srs/due-cards',
        queryParameters: userId != null && userId.isNotEmpty ? {'userId': userId} : null,
      );
      if (response.data is List) {
        return response.data as List<dynamic>;
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Lấy tiến độ mục tiêu chuẩn hóa CEFR từ CSDL
  Future<Map<String, dynamic>?> getTargetProgress() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final response = await _dio.get(
        '/api/srs/target-progress',
        queryParameters: userId != null && userId.isNotEmpty ? {'userId': userId} : null,
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Lấy toàn bộ danh sách từ vựng cá nhân từ CSDL
  Future<List<dynamic>> getMyWords() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final response = await _dio.get(
        '/api/srs/my-words',
        queryParameters: userId != null && userId.isNotEmpty ? {'userId': userId} : null,
      );
      if (response.data is List) {
        return response.data as List<dynamic>;
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Lấy chuỗi ngày học liên tục (Streak)
  Future<Map<String, dynamic>?> getStreakStatus() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final response = await _dio.get(
        '/api/srs/streak',
        queryParameters: userId != null && userId.isNotEmpty ? {'userId': userId} : null,
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Gửi kết quả đánh giá thẻ Flashcard theo thuật toán SuperMemo SM-2
  Future<Map<String, dynamic>?> submitReview({
    String? progressId,
    String? wordText,
    required int ratingGrade,
    int responseTimeMs = 2000,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final Map<String, dynamic> requestBody = {
        'ratingGrade': ratingGrade,
        'reviewType': 'FLASHCARD',
        'responseTimeMs': responseTimeMs,
      };
      if (progressId != null) requestBody['progressId'] = progressId;
      if (wordText != null) requestBody['wordText'] = wordText;

      final response = await _dio.post(
        '/api/srs/review',
        queryParameters: userId != null && userId.isNotEmpty ? {'userId': userId} : null,
        data: requestBody,
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Gửi kết quả chấm điểm phát âm AI Speech Scorer vào SM-2
  Future<Map<String, dynamic>?> submitPronunciationReview({
    String? progressId,
    String? wordText,
    required int ratingGrade,
    required double speechScore,
    int responseTimeMs = 2500,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final body = <String, dynamic>{
        'ratingGrade': ratingGrade,
        'reviewType': 'PRONUNCIATION',
        'speechScore': speechScore,
        'responseTimeMs': responseTimeMs,
      };
      if (progressId != null && progressId.isNotEmpty) {
        body['progressId'] = progressId;
      }
      if (wordText != null && wordText.isNotEmpty) {
        body['wordText'] = wordText;
      }

      final response = await _dio.post(
        '/api/srs/review',
        queryParameters: userId != null && userId.isNotEmpty ? {'userId': userId} : null,
        data: body,
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Đánh dấu một từ vựng đã thành thạo ngay lập tức (Mastered)
  Future<Map<String, dynamic>?> markWordAsMastered({
    String? progressId,
    String? wordText,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final response = await _dio.post(
        '/api/srs/mark-mastered',
        queryParameters: {
          if (userId != null && userId.isNotEmpty) 'userId': userId,
          if (progressId != null && progressId.isNotEmpty) 'progressId': progressId,
          if (wordText != null && wordText.isNotEmpty) 'wordText': wordText,
        },
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Xóa một từ vựng khỏi sổ tay SM-2
  Future<bool> deleteWordFromSrs(String progressId) async {
    try {
      final response = await _dio.delete('/api/srs/word/$progressId');
      return response.statusCode == 200 || response.statusCode == 204;
    } catch (_) {
      return false;
    }
  }

  /// Xóa toàn bộ từ thuộc một bối cảnh / chủ đề khỏi sổ tay SM-2
  Future<bool> deleteTopicFromSrs(String topicName) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');
      final response = await _dio.delete(
        '/api/srs/topic',
        queryParameters: {
          'topicName': topicName,
          if (userId != null && userId.isNotEmpty) 'userId': userId,
        },
      );
      return response.statusCode == 200 || response.statusCode == 204;
    } catch (_) {
      return false;
    }
  }

  // ==========================================
  // 3. AI VISION & OBJECT DETECTION APIs
  // ==========================================

  /// Bóc tách vật thể thực tế qua FastAPI YOLO-World v2 (Port 8001)
  Future<Map<String, dynamic>> detectObjectsWithYolo({
    required List<int> imageBytes,
    required String filename,
    String sceneTheme = 'auto',
    double confidenceThreshold = 0.15,
    String targetLevel = 'A2',
    bool skipDialogue = true,
  }) async {
    try {
      final formData = FormData.fromMap({
        'file': MultipartFile.fromBytes(
          imageBytes,
          filename: filename,
        ),
      });

      final response = await _aiDio.post(
        '/detect',
        queryParameters: {
          'conf': confidenceThreshold,
          'theme': sceneTheme,
          'target_level': targetLevel,
          'skip_dialogue': skipDialogue,
        },
        data: formData,
      );

      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return {'success': false, 'error': 'Dữ liệu không đúng định dạng'};
    } on DioException catch (e) {
      return {
        'success': false,
        'error': e.response?.data?['detail'] ?? e.message ?? 'Không thể kết nối máy chủ AI Vision (Port 8001)',
      };
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Lưu ảnh bối cảnh và kết quả bóc tách Bounding Box vào CSDL PostgreSQL qua Spring Boot
  Future<Map<String, dynamic>> saveRealCapture({
    required List<int> imageBytes,
    required String filename,
    required String sceneTheme,
    required List<Map<String, dynamic>> detectedObjects,
    String? base64DataUrl,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final formData = FormData.fromMap({
        'image': MultipartFile.fromBytes(imageBytes, filename: filename),
        'sceneTheme': sceneTheme,
        'detectedObjectsJson': jsonEncode(detectedObjects),
        if (userId != null && userId.isNotEmpty) 'userId': userId,
      });

      final response = await _dio.post(
        '/api/vision/save-capture',
        data: formData,
      );

      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return {'success': true};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Lưu 1 từ vựng bóc tách từ ảnh AI Vision vào sổ học SM-2
  Future<Map<String, dynamic>?> learnWordFromVision({
    required String englishWord,
    required String vietnameseMeaning,
    required String phoneticIpa,
    required String cefrLevel,
    String? captureId,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final response = await _dio.post(
        '/api/vision/learn-word',
        queryParameters: {
          if (userId != null && userId.isNotEmpty) 'userId': userId,
          if (captureId != null && captureId.isNotEmpty) 'captureId': captureId,
          'englishWord': englishWord,
          'vietnameseMeaning': vietnameseMeaning,
          'phoneticIpa': phoneticIpa,
          'cefrLevel': cefrLevel,
        },
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Lưu TOÀN BỘ từ vựng từ một ảnh bối cảnh vào sổ SM-2 (Batch Learning)
  Future<List<dynamic>> learnAllWordsFromCapture({
    required String captureId,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final response = await _dio.post(
        '/api/vision/learn-all-words',
        queryParameters: {
          'captureId': captureId,
          if (userId != null && userId.isNotEmpty) 'userId': userId,
        },
      );
      if (response.data is List) {
        return response.data as List<dynamic>;
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Lấy danh sách các ảnh bối cảnh người dùng đã lưu từ CSDL
  Future<List<dynamic>> getUserCaptures() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final response = await _dio.get(
        '/api/vision/captures',
        queryParameters: userId != null && userId.isNotEmpty ? {'userId': userId} : null,
      );
      if (response.data is List) {
        return response.data as List<dynamic>;
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Xóa một bức ảnh bối cảnh khỏi CSDL
  Future<bool> deleteCapture(String sceneId) async {
    try {
      final response = await _dio.delete('/api/vision/captures/$sceneId');
      return response.statusCode == 200 || response.statusCode == 204;
    } catch (_) {
      return false;
    }
  }

  // ==========================================
  // 4. AI NLP & DIALOGUE / QUIZ / EXTRACTOR APIs
  // ==========================================

  /// Sinh lại hội thoại giao tiếp AI từ các từ vựng bóc tách
  Future<Map<String, dynamic>> regenerateDialogue({
    required List<Map<String, dynamic>> words,
    String theme = 'general',
    String targetLevel = 'A2',
  }) async {
    try {
      final response = await _aiDio.post(
        '/regenerate-dialogue',
        data: {
          'words': words,
          'theme': theme,
          'target_level': targetLevel,
        },
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return {'success': false, 'dialogue': []};
    } catch (e) {
      return {'success': false, 'dialogue': [], 'error': e.toString()};
    }
  }

  /// Tạo đề thi trắc nghiệm AI 4 đáp án A/B/C/D từ danh sách từ vựng
  Future<Map<String, dynamic>> generateAiQuiz({
    required List<Map<String, dynamic>> words,
    String theme = 'Bối cảnh đời thực',
    String targetLevel = 'A2',
    int numQuestions = 5,
  }) async {
    try {
      final response = await _aiDio.post(
        '/generate-quiz',
        data: {
          'words': words,
          'theme': theme,
          'target_level': targetLevel,
          'num_questions': numQuestions,
        },
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return {'success': false, 'questions': []};
    } catch (e) {
      return {'success': false, 'questions': [], 'error': e.toString()};
    }
  }

  /// Bóc tách văn bản thô từ tệp PDF, DOCX, TXT qua AI Vision Server
  Future<Map<String, dynamic>> parseDocumentFile({
    required List<int> fileBytes,
    required String filename,
  }) async {
    try {
      final formData = FormData.fromMap({
        'file': MultipartFile.fromBytes(fileBytes, filename: filename),
      });

      final response = await _aiDio.post(
        '/parse-document',
        data: formData,
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return {'success': false, 'error': 'Dữ liệu không đúng định dạng'};
    } catch (e) {
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Trích xuất từ vựng học thuật trung thực từ đoạn văn bản bằng LLM
  Future<Map<String, dynamic>> extractVocabFromText({
    required String text,
    int targetCount = 8,
    String targetLevel = 'B2',
    String themeHint = '',
  }) async {
    try {
      final response = await _aiDio.post(
        '/extract-vocab',
        data: {
          'text': text,
          'target_count': targetCount,
          'target_level': targetLevel,
          'theme_hint': themeHint,
        },
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return {'success': false, 'words': []};
    } catch (e) {
      return {'success': false, 'words': [], 'error': e.toString()};
    }
  }

  /// Lưu danh sách từ vựng vào sổ tay SM-2 (dùng cho trích xuất văn bản hoặc bộ sưu tập)
  Future<Map<String, dynamic>?> saveWordsToNotebook(
    List<Map<String, dynamic>> words, {
    String category = 'Trích xuất văn bản',
    String targetLevel = 'B1',
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');
      final response = await _dio.post(
        '/api/classrooms/save-words-to-notebook',
        queryParameters: userId != null && userId.isNotEmpty ? {'userId': userId} : null,
        data: {
          'category': category,
          'targetLevel': targetLevel,
          'words': words,
        },
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  // ==========================================
  // 5. CLASSROOM & SHARING APIs
  // ==========================================

  /// Lấy danh sách lớp học của tôi
  Future<List<dynamic>> getMyClassrooms() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');
      final response = await _dio.get(
        '/api/classrooms/my-classrooms',
        queryParameters: userId != null && userId.isNotEmpty ? {'userId': userId} : null,
      );
      if (response.data is List) {
        return response.data as List<dynamic>;
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Tra cứu chi tiết lớp học theo mã code
  Future<Map<String, dynamic>?> getClassroomByCode(String code) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');
      final formattedCode = code.trim().toUpperCase();
      final response = await _dio.get(
        '/api/classrooms/$formattedCode',
        queryParameters: userId != null && userId.isNotEmpty ? {'userId': userId} : null,
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Tham gia phòng học bằng mã code
  Future<Map<String, dynamic>?> joinClassroom(String code) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');
      final formattedCode = code.trim().toUpperCase();
      final response = await _dio.post(
        '/api/classrooms/$formattedCode/join',
        queryParameters: userId != null && userId.isNotEmpty ? {'userId': userId} : null,
        data: {},
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Kéo toàn bộ từ vựng phòng học về sổ tay SM-2
  Future<Map<String, dynamic>?> cloneClassroomToNotebook(String code) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');
      final formattedCode = code.trim().toUpperCase();
      final response = await _dio.post(
        '/api/classrooms/$formattedCode/clone-to-notebook',
        queryParameters: userId != null && userId.isNotEmpty ? {'userId': userId} : null,
        data: {},
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Tạo phòng học mới
  Future<Map<String, dynamic>?> createClassroom({
    required String name,
    required String description,
    required String targetLevel,
    required List<Map<String, dynamic>> words,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');
      final response = await _dio.post(
        '/api/classrooms',
        queryParameters: userId != null && userId.isNotEmpty ? {'userId': userId} : null,
        data: {
          'name': name,
          'description': description,
          'targetLevel': targetLevel,
          'words': words,
        },
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  // ==========================================
  // 6. ARENA & SPEEDRUN LEADERBOARD APIs
  // ==========================================

  /// Lấy BXH tốc độ phản xạ của một không gian đấu trường
  Future<List<dynamic>> getStageLeaderboard(String stageId, {String period = 'all'}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final response = await _dio.get(
        '/api/arena/stages/$stageId/leaderboard',
        queryParameters: {
          'period': period,
          if (userId != null && userId.isNotEmpty) 'currentUserId': userId,
        },
      );
      if (response.data is List) {
        return response.data as List<dynamic>;
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Gửi kết quả lượt thi đấu Speedrun 60s vào CSDL
  Future<Map<String, dynamic>?> submitArenaRun({
    required String stageId,
    required int completionTimeMs,
    required int pureTimeMs,
    required int mistakeCount,
    required int penaltyMs,
    required double accuracyPct,
    required int maxCombo,
    required int totalXpEarned,
    required bool isPerfectRun,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final response = await _dio.post(
        '/api/arena/submit-run',
        data: {
          'stageId': stageId,
          if (userId != null && userId.isNotEmpty) 'userId': userId,
          'completionTimeMs': completionTimeMs,
          'pureTimeMs': pureTimeMs,
          'mistakeCount': mistakeCount,
          'penaltyMs': penaltyMs,
          'accuracyPct': accuracyPct,
          'maxCombo': maxCombo,
          'totalXpEarned': totalXpEarned,
          'isPerfectRun': isPerfectRun,
        },
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  // ==========================================
  // 7. GLOBAL LEADERBOARD & CERTIFICATE APIs
  // ==========================================

  /// Lấy bảng xếp hạng học viên có phân trang (Weekly / All-Time)
  Future<Map<String, dynamic>?> getLeaderboard({
    String period = 'all-time',
    String level = 'ALL',
    int page = 0,
    int size = 10,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final response = await _dio.get(
        '/api/leaderboard',
        queryParameters: {
          if (userId != null && userId.isNotEmpty) 'userId': userId,
          'period': period,
          'level': level,
          'page': page,
          'size': size,
        },
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Lấy thông tin thứ hạng cá nhân và mục tiêu vượt hạng
  Future<Map<String, dynamic>?> getMyRank({String period = 'all-time'}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final response = await _dio.get(
        '/api/leaderboard/my-rank',
        queryParameters: {
          if (userId != null && userId.isNotEmpty) 'userId': userId,
          'period': period,
        },
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Lấy danh sách chứng chỉ chuẩn hóa CEFR đã đạt được
  Future<List<dynamic>> getMyCertificates() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final response = await _dio.get(
        '/api/certificates/my-certificates',
        queryParameters: userId != null && userId.isNotEmpty ? {'userId': userId} : null,
      );
      if (response.data is List) {
        return response.data as List<dynamic>;
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// Yêu cầu cấp chứng chỉ chuẩn hóa CEFR từ Spring Boot
  Future<Map<String, dynamic>?> claimCertificate({String level = 'A1'}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final response = await _dio.post(
        '/api/certificates/claim',
        queryParameters: {
          if (userId != null && userId.isNotEmpty) 'userId': userId,
          'level': level,
        },
      );
      if (response.data is Map<String, dynamic>) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  // ==========================================
  // 8. DASHBOARD COMPOSITE API
  // ==========================================

  /// Lấy dữ liệu tổng hợp đồng bộ với CSDL cho trang chủ
  Future<Map<String, dynamic>> getDashboardData() async {
    final results = await Future.wait([
      getUserProfile(),
      getDueCards(),
      getTargetProgress(),
    ]);

    return {
      'user': results[0] as Map<String, dynamic>?,
      'dueCards': results[1] as List<dynamic>,
      'targetProgress': results[2] as Map<String, dynamic>?,
    };
  }
}

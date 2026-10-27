import 'dart:io';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio _dio;

  // Địa chỉ backend mặc định:
  // - Android Emulator: 10.0.2.2
  // - iOS Simulator / Desktop: 127.0.0.1
  static String get defaultBaseUrl {
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:8088';
    }
    return 'http://127.0.0.1:8088';
  }

  ApiService._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: defaultBaseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
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

  /// Lưu từ vựng bóc tách từ ảnh AI Vision vào sổ học SM-2
  Future<Map<String, dynamic>?> learnWordFromVision({
    required String englishWord,
    required String vietnameseMeaning,
    required String phoneticIpa,
    required String cefrLevel,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString('vocario_user_id');

      final response = await _dio.post(
        '/api/vision/learn-word',
        queryParameters: {
          if (userId != null && userId.isNotEmpty) 'userId': userId,
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

  /// Đăng xuất và xóa token / user id
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('vocario_jwt_token');
    await prefs.remove('vocario_user_id');
    await prefs.remove('vocario_username');
  }

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

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

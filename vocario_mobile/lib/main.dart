import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/constants/tokens.dart';
import 'screens/auth/auth_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Định dạng thanh trạng thái (Status bar) trong suốt tinh tế
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      statusBarBrightness: Brightness.light,
    ),
  );

  runApp(const VocarioMobileApp());
}

class VocarioMobileApp extends StatelessWidget {
  const VocarioMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Vocario — Smart Vision English',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: VocarioTokens.canvas,
        colorScheme: ColorScheme.fromSeed(
          seedColor: VocarioTokens.brand,
          surface: VocarioTokens.surface,
          brightness: Brightness.light,
        ),
      ),
      home: const AuthScreen(),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Hệ thống Design Tokens của Vocario - Chuẩn Scandinavian Minimalist & Editorial
class VocarioTokens {
  // Primitives & Surfaces
  static const Color canvas = Color(0xFFF8F6F1); // Nền giấy be ấm
  static const Color surface = Color(0xFFFFFFFF); // Nền card trắng tinh
  static const Color field = Color(0xFFFAF8F5); // Nền ô input
  static const Color border = Color(0xFFE5DED3); // Viền mảnh 1px mềm mại

  // Brand & Accents
  static const Color brand = Color(0xFF7D6853); // Nâu gỗ Scandinavian
  static const Color brandHover = Color(0xFF685542);
  static const Color brandActive = Color(0xFF544434);
  static const Color amber = Color(0xFFC88332); // Hổ phách streak/accent
  static const Color goldAccent = Color(0xFFF7D147);

  // Typography Colors
  static const Color ink = Color(0xFF2D2823); // Màu than ấm (chống dùng pure black)
  static const Color muted = Color(0xFF746B60); // Phụ đề & nhãn mô tả
  static const Color faint = Color(0xFFA8A199); // Placeholder

  // State Colors
  static const Color errorBg = Color(0xFFFFF5F5);
  static const Color errorBorder = Color(0xFFFCA5A5);
  static const Color errorText = Color(0xFFB91C1C);

  static const Color successBg = Color(0xFFF0FDF4);
  static const Color successBorder = Color(0xFF86EFAC);
  static const Color successText = Color(0xFF15803D);

  // Typography Styles with Google Fonts
  static TextStyle get serifHeadline => GoogleFonts.sourceSerif4(
        fontSize: 24,
        fontWeight: FontWeight.w600,
        color: ink,
        letterSpacing: -0.5,
        height: 1.18,
      );

  static TextStyle get sansLabel => GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: ink,
      );

  static TextStyle get sansBody => GoogleFonts.inter(
        fontSize: 13,
        fontWeight: FontWeight.normal,
        color: ink,
      );

  static TextStyle get sansMuted => GoogleFonts.inter(
        fontSize: 12.5,
        fontWeight: FontWeight.normal,
        color: muted,
        height: 1.45,
      );

  static TextStyle get monoSmall => GoogleFonts.jetBrainsMono(
        fontSize: 10,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.8,
      );

  // Elevations & Shadows
  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: ink.withValues(alpha: 0.05),
          offset: const Offset(0, 4),
          blurRadius: 20,
          spreadRadius: -2,
        ),
      ];

  static List<BoxShadow> get toastShadow => [
        BoxShadow(
          color: ink.withValues(alpha: 0.12),
          offset: const Offset(0, 10),
          blurRadius: 28,
          spreadRadius: -4,
        ),
      ];
}

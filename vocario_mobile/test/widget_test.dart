import 'package:flutter_test/flutter_test.dart';
import 'package:vocario_mobile/main.dart';

void main() {
  testWidgets('Vocario auth screen smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const VocarioMobileApp());
    expect(find.text('VOCARIO'), findsOneWidget);
  });
}

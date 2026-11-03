package com.vocario.service;

import com.vocario.dto.AuthDto;
import com.vocario.entity.User;
import com.vocario.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    // Cấu hình phòng thủ Brute-force mật khẩu
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long LOCKOUT_DURATION_MILLIS = 15 * 60 * 1000L; // Tạm khóa 15 phút

    private static class LoginAttemptTracker {
        int failedCount = 0;
        long lockedUntil = 0;
    }

    private final Map<String, LoginAttemptTracker> loginAttempts = new ConcurrentHashMap<>();

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, JwtService jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = new BCryptPasswordEncoder(12);
    }

    @Transactional
    public AuthDto.AuthResponse register(AuthDto.RegisterRequest request) {
        String cleanEmail = request.email != null ? request.email.trim().toLowerCase() : "";
        String cleanUsername = request.username != null ? request.username.trim() : "";

        log.info("================================================================================");
        log.info("📝 [REGISTER REQUEST] Nhận yêu cầu đăng ký tài khoản mới:");
        log.info("   - Username  : '{}'", cleanUsername);
        log.info("   - Email     : '{}'", cleanEmail);
        log.info("   - Full Name : '{}'", request.fullName);
        log.info("================================================================================");

        // 1. Kiểm tra Email đã tồn tại chưa
        if (userRepository.existsByEmail(cleanEmail)) {
            log.warn("❌ [REGISTER FAILED] Đăng ký KHÔNG THÀNH CÔNG: Email '{}' ĐÃ TỒN TẠI trong hệ thống!", cleanEmail);
            throw new RuntimeException("Email '" + cleanEmail + "' đã được đăng ký trước đó. Vui lòng sử dụng email khác hoặc đăng nhập!");
        }

        // 2. Kiểm tra Username đã tồn tại chưa
        if (userRepository.existsByUsername(cleanUsername)) {
            log.warn("❌ [REGISTER FAILED] Đăng ký KHÔNG THÀNH CÔNG: Tên đăng nhập (username) '{}' ĐÃ ĐƯỢC SỬ DỤNG!", cleanUsername);
            throw new RuntimeException("Tên đăng nhập '" + cleanUsername + "' đã tồn tại. Vui lòng chọn một tên đăng nhập khác!");
        }

        // 3. Băm mật khẩu một chiều bằng BCrypt Work Factor 12
        String hashedPassword = passwordEncoder.encode(request.password);

        // 4. Tạo và lưu người dùng mới vào CSDL
        log.info("💾 [REGISTER DB] Đang lưu thông tin tài khoản '{}' với mật khẩu đã mã hóa BCrypt...", cleanUsername);
        User user = new User(cleanEmail, cleanUsername, hashedPassword, request.fullName);
        User savedUser = userRepository.save(user);

        log.info("✅ [REGISTER SUCCESS] Đăng ký THÀNH CÔNG tài khoản mới: ID={}", savedUser.getId());
        log.info("================================================================================");

        // Phát hành JSON Web Token có chữ ký mật mã HMAC-SHA256
        String token = jwtService.generateToken(savedUser);

        return new AuthDto.AuthResponse(
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getUsername(),
                savedUser.getFullName(),
                token,
                savedUser.getStreakCount(),
                savedUser.getRole()
        );
    }

    @Transactional
    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        String cleanIdentifier = request.usernameOrEmail != null ? request.usernameOrEmail.trim() : "";
        log.info("🔑 [LOGIN REQUEST] Yêu cầu đăng nhập cho tài khoản: '{}'", cleanIdentifier);

        // Chốt chặn Brute-Force: Kiểm tra số lần đăng nhập sai và thời gian khóa
        String trackerKey = cleanIdentifier.toLowerCase();
        LoginAttemptTracker tracker = loginAttempts.computeIfAbsent(trackerKey, k -> new LoginAttemptTracker());
        long now = System.currentTimeMillis();

        if (tracker.lockedUntil > now) {
            long remainingMins = Math.max(1, (tracker.lockedUntil - now) / (60 * 1000L));
            log.warn("🚨 [ACCOUNT LOCKED] Tài khoản '{}' đang bị khóa tạm thời do nhập sai mật khẩu quá 5 lần!", cleanIdentifier);
            throw new RuntimeException("Tài khoản đang bị tạm khóa " + remainingMins + " phút do nhập sai mật khẩu quá 5 lần liên tiếp. Vui lòng thử lại sau.");
        }

        // Hết thời gian khóa, tự động hoàn trả trạng thái đếm
        if (tracker.lockedUntil > 0 && tracker.lockedUntil <= now) {
            tracker.failedCount = 0;
            tracker.lockedUntil = 0;
        }

        User user = userRepository.findByUsername(cleanIdentifier)
                .or(() -> userRepository.findByEmail(cleanIdentifier.toLowerCase()))
                .orElse(null);

        if (user == null) {
            tracker.failedCount++;
            log.warn("❌ [LOGIN FAILED] Không tìm thấy tài khoản '{}' trong database! (Lần {}/{})", 
                    cleanIdentifier, tracker.failedCount, MAX_FAILED_ATTEMPTS);
            if (tracker.failedCount >= MAX_FAILED_ATTEMPTS) {
                tracker.lockedUntil = now + LOCKOUT_DURATION_MILLIS;
                throw new RuntimeException("Bạn đã nhập sai thông tin 5 lần liên tiếp. Tài khoản tạm thời bị khóa 15 phút.");
            }
            throw new RuntimeException("Tài khoản hoặc mật khẩu không chính xác");
        }

        String storedPassword = user.getPassword();
        boolean isMatched = false;

        // Cơ chế Adaptive Password Hashing: Hỗ trợ tự động nâng cấp mật khẩu cũ sang BCrypt
        if (storedPassword != null && (storedPassword.startsWith("$2a$") || storedPassword.startsWith("$2b$") || storedPassword.startsWith("$2y$"))) {
            isMatched = passwordEncoder.matches(request.password, storedPassword);
        } else {
            // Mật khẩu legacy dạng plaintext (từ dữ liệu thử nghiệm ban đầu)
            isMatched = storedPassword != null && storedPassword.equals(request.password);
            if (isMatched) {
                // Tự động nâng cấp sang mã băm BCrypt an toàn ngay trong lần đăng nhập này
                user.setPassword(passwordEncoder.encode(request.password));
                userRepository.save(user);
                log.info("🔒 [SECURITY UPGRADE] Đã tự động nâng cấp mật khẩu của '{}' sang chuẩn mã băm BCrypt!", user.getUsername());
            }
        }

        if (!isMatched) {
            tracker.failedCount++;
            log.warn("❌ [LOGIN FAILED] Mật khẩu không chính xác cho tài khoản '{}' (Lần {}/{})!", 
                    cleanIdentifier, tracker.failedCount, MAX_FAILED_ATTEMPTS);
            if (tracker.failedCount >= MAX_FAILED_ATTEMPTS) {
                tracker.lockedUntil = now + LOCKOUT_DURATION_MILLIS;
                log.error("🚨 [LOCKOUT TRIGGERED] Đã kích hoạt khóa 15 phút cho tài khoản '{}'", cleanIdentifier);
                throw new RuntimeException("Bạn đã nhập sai mật khẩu 5 lần liên tiếp. Tài khoản tạm thời bị khóa 15 phút để bảo vệ an toàn.");
            }
            throw new RuntimeException("Tài khoản hoặc mật khẩu không chính xác");
        }

        // Đăng nhập thành công -> Xóa bộ đếm thất bại
        loginAttempts.remove(trackerKey);

        // Cập nhật thời điểm hoạt động
        user.setLastActiveAt(OffsetDateTime.now());
        userRepository.save(user);

        log.info("✅ [LOGIN SUCCESS] Đăng nhập THÀNH CÔNG cho user: id={}, username='{}', role='{}'", 
                user.getId(), user.getUsername(), user.getRole());

        // Phát hành JSON Web Token có chữ ký mật mã HMAC-SHA256
        String token = jwtService.generateToken(user);

        return new AuthDto.AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getFullName(),
                token,
                user.getStreakCount(),
                user.getRole()
        );
    }

    @jakarta.annotation.PostConstruct
    public void initDefaultUsers() {
        // 1. Tạo hoặc cập nhật tài khoản Học Viên Mẫu: student1
        userRepository.findByUsername("student1").ifPresentOrElse(
                student -> {
                    student.setRole("STUDENT");
                    student.setPassword("Password123@");
                    if (student.getLastStudyDate() == null) {
                        student.setLastStudyDate(java.time.LocalDate.now().minusDays(1));
                    }
                    userRepository.save(student);
                },
                () -> {
                    log.info("ℹ️ Khởi tạo tài khoản mẫu STUDENT: student1...");
                    User student = new User("student1@vocario.edu.vn", "student1", "Password123@", "Nguyễn Văn Student", "STUDENT");
                    student.setTargetLevel("B2");
                    student.setStreakCount(5);
                    student.setLastStudyDate(java.time.LocalDate.now().minusDays(1));
                    userRepository.save(student);
                }
        );

        // 2. Tạo hoặc cập nhật tài khoản Quản Trị Viên Mẫu: admin
        userRepository.findByUsername("admin").ifPresentOrElse(
                admin -> {
                    admin.setRole("ADMIN");
                    admin.setPassword("Password123@");
                    userRepository.save(admin);
                },
                () -> {
                    log.info("🛡️ Khởi tạo tài khoản mẫu ADMIN: admin...");
                    User admin = new User("admin@vocario.edu.vn", "admin", "Password123@", "Quản Trị Viên Vocario", "ADMIN");
                    admin.setTargetLevel("C1");
                    admin.setStreakCount(30);
                    userRepository.save(admin);
                }
        );
    }

    public User getOrCreateDemoUser() {
        initDefaultUsers();
        return userRepository.findByUsername("student1")
                .or(() -> userRepository.findByUsername("demo_student"))
                .orElseGet(() -> {
                    log.info("ℹ️ Khởi tạo tài khoản fallback student1...");
                    User demo = new User("student1@vocario.edu.vn", "student1", "Password123@", "Nguyễn Văn Student", "STUDENT");
                    demo.setStreakCount(5);
                    demo.setLastStudyDate(java.time.LocalDate.now().minusDays(1));
                    return userRepository.save(demo);
                });
    }

    public User getUserProfile(UUID userId) {
        User user = (userId == null)
                ? getOrCreateDemoUser()
                : userRepository.findById(userId).orElseGet(this::getOrCreateDemoUser);

        // Tự động kiểm tra nếu học viên bỏ lỡ buổi học ngày hôm qua -> Đứt chuỗi (Streak = 0)
        if (user.getStreakCount() != null && user.getStreakCount() > 0) {
            java.time.LocalDate today = java.time.LocalDate.now();
            java.time.LocalDate lastStudy = user.getLastStudyDate();
            if (lastStudy == null && user.getLastActiveAt() != null) {
                lastStudy = user.getLastActiveAt().toLocalDate();
            }
            if (lastStudy != null && lastStudy.isBefore(today.minusDays(1))) {
                user.setStreakCount(0);
                userRepository.save(user);
                log.info("❄️ [STREAK RESET] Học viên '{}' ({}) bị đứt chuỗi do không học hôm qua (Lần học cuối: {}). Reset streak = 0.",
                        user.getUsername(), user.getId(), lastStudy);
            }
        }

        return user;
    }

    @Transactional
    public User updateProfile(UUID userId, AuthDto.UpdateProfileRequest request) {
        User user = getUserProfile(userId);
        if (request.fullName != null && !request.fullName.trim().isEmpty()) {
            user.setFullName(request.fullName.trim());
        }
        if (request.targetLevel != null && !request.targetLevel.trim().isEmpty()) {
            user.setTargetLevel(request.targetLevel.trim().toUpperCase());
        }
        if (request.dailyGoal != null && request.dailyGoal > 0) {
            user.setDailyGoal(request.dailyGoal);
        }
        user.setUpdatedAt(OffsetDateTime.now());
        User updated = userRepository.save(user);
        log.info("✅ [PROFILE UPDATED] Cập nhật thông tin học viên ID {}: FullName='{}', TargetLevel='{}', DailyGoal={}",
                updated.getId(), updated.getFullName(), updated.getTargetLevel(), updated.getDailyGoal());
        return updated;
    }

    @Transactional
    public User levelUp(UUID userId) {
        User user = getUserProfile(userId);
        String currentLevel = (user.getTargetLevel() != null && !user.getTargetLevel().isBlank())
                ? user.getTargetLevel().toUpperCase().trim()
                : "A2";

        java.util.List<String> levels = java.util.List.of("A1", "A2", "B1", "B2", "C1", "C2");
        int currentIndex = levels.indexOf(currentLevel);
        if (currentIndex >= 0 && currentIndex < levels.size() - 1) {
            String newLevel = levels.get(currentIndex + 1);
            user.setTargetLevel(newLevel);
            user.setUpdatedAt(OffsetDateTime.now());
            User updated = userRepository.save(user);
            log.info("🎉 [LEVEL UP SUCCESS] Học viên ID {} đã thăng cấp thành công từ {} lên {}!",
                    updated.getId(), currentLevel, newLevel);
            return updated;
        } else {
            log.info("ℹ️ [LEVEL UP] Học viên ID {} đang ở cấp độ tối đa ({}), không thể thăng cấp thêm.",
                    user.getId(), currentLevel);
            return user;
        }
    }
}

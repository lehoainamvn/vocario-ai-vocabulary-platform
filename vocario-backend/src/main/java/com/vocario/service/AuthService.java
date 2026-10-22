package com.vocario.service;

import com.vocario.dto.AuthDto;
import com.vocario.entity.User;
import com.vocario.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
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
            log.warn("   Lý do: Mỗi người dùng chỉ được sử dụng một địa chỉ email duy nhất.");
            throw new RuntimeException("Email '" + cleanEmail + "' đã được đăng ký trước đó. Vui lòng sử dụng email khác hoặc đăng nhập!");
        }

        // 2. Kiểm tra Username đã tồn tại chưa
        if (userRepository.existsByUsername(cleanUsername)) {
            log.warn("❌ [REGISTER FAILED] Đăng ký KHÔNG THÀNH CÔNG: Tên đăng nhập (username) '{}' ĐÃ ĐƯỢC SỬ DỤNG!", cleanUsername);
            log.warn("   Lý do: Tên đăng nhập đã có người khác chọn.");
            throw new RuntimeException("Tên đăng nhập '" + cleanUsername + "' đã tồn tại. Vui lòng chọn một tên đăng nhập khác!");
        }

        // 3. Tạo và lưu người dùng mới
        log.info("💾 [REGISTER DB] Đang lưu thông tin tài khoản '{}' vào cơ sở dữ liệu PostgreSQL (vocario_db)...", cleanUsername);
        User user = new User(cleanEmail, cleanUsername, request.password, request.fullName);
        User savedUser = userRepository.save(user);

        log.info("✅ [REGISTER SUCCESS] Đăng ký THÀNH CÔNG tài khoản mới!");
        log.info("   - User ID   : {}", savedUser.getId());
        log.info("   - Username  : {}", savedUser.getUsername());
        log.info("   - Email     : {}", savedUser.getEmail());
        log.info("   - Full Name : {}", savedUser.getFullName());
        log.info("   - Target Lvl: {}", savedUser.getTargetLevel());
        log.info("================================================================================");

        String dummyToken = "jwt_token_" + savedUser.getId();

        return new AuthDto.AuthResponse(
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getUsername(),
                savedUser.getFullName(),
                dummyToken,
                savedUser.getStreakCount(),
                savedUser.getRole()
        );
    }

    @Transactional
    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        String cleanIdentifier = request.usernameOrEmail != null ? request.usernameOrEmail.trim() : "";
        log.info("🔑 [LOGIN REQUEST] Yêu cầu đăng nhập cho tài khoản: '{}'", cleanIdentifier);

        User user = userRepository.findByUsername(cleanIdentifier)
                .or(() -> userRepository.findByEmail(cleanIdentifier.toLowerCase()))
                .orElse(null);

        if (user == null) {
            log.warn("❌ [LOGIN FAILED] Không tìm thấy tài khoản '{}' (kiểm tra cả username lẫn email) trong database!", cleanIdentifier);
            throw new RuntimeException("Tài khoản hoặc mật khẩu không chính xác");
        }

        if (!user.getPassword().equals(request.password)) {
            log.warn("❌ [LOGIN FAILED] Mật khẩu không chính xác cho tài khoản '{}' (User ID: {})!", cleanIdentifier, user.getId());
            throw new RuntimeException("Tài khoản hoặc mật khẩu không chính xác");
        }

        // Cập nhật thời điểm hoạt động
        user.setLastActiveAt(OffsetDateTime.now());
        userRepository.save(user);

        log.info("✅ [LOGIN SUCCESS] Đăng nhập THÀNH CÔNG cho user: id={}, username='{}', role='{}'", 
                user.getId(), user.getUsername(), user.getRole());

        String dummyToken = "jwt_token_" + user.getId();

        return new AuthDto.AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getFullName(),
                dummyToken,
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

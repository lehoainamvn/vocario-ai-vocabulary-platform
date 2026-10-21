package com.vocario.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI vocarioOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("VOCARIO RESTful API Specification")
                        .description("Hệ thống API cho nền tảng học tiếng Anh qua nhận diện vật thể đời thực (YOLO-World) và thuật toán lặp lại ngắt quãng Spaced Repetition (SM-2).\n\n" +
                                "### Các phân hệ chính:\n" +
                                "- **Auth API**: Quản lý đăng ký, đăng nhập người dùng.\n" +
                                "- **Vision / AI API**: Tải ảnh camera, nhận diện vật thể và trích xuất từ vựng.\n" +
                                "- **Vocabulary API**: Quản lý từ vựng, tra cứu IPA, nghĩa tiếng Việt, câu ví dụ.\n" +
                                "- **Spaced Repetition (SM-2) API**: Hàng đợi ôn tập, tính toán hệ số dễ nhớ EF và chu kỳ ôn tập.\n" +
                                "- **Decks API**: Quản lý bộ sưu tập từ vựng theo chủ đề phòng ốc / đời sống.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Đồ Án Tốt Nghiệp - Vocario Team")
                                .email("vocario.contact@edu.vn"))
                        .license(new License().name("Apache 2.0").url("https://springdoc.org")))
                .servers(List.of(
                        new Server().url("http://localhost:8088").description("Local Development Server")
                ));
    }
}

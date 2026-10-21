package com.vocario;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class VocarioApplication {

    public static void main(String[] args) {
        SpringApplication.run(VocarioApplication.class, args);
        System.out.println("\n========================================================");
        System.out.println("🚀 VOCARIO BACKEND ĐÃ KHỞI CHẠY THÀNH CÔNG!");
        System.out.println("📖 SWAGGER UI DOCS: http://localhost:8088/swagger-ui.html");
        System.out.println("📑 OPENAPI JSON:    http://localhost:8088/v3/api-docs");
        System.out.println("📁 FILE GHI LOG:    vocario-backend/logs/vocario.log");
        System.out.println("========================================================\n");
    }
}

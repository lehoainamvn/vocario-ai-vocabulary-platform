package com.vocario.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ApiLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ApiLoggingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String uri = request.getRequestURI();

        // Chỉ log chi tiết các request vào API (/api/*)
        boolean isApiRequest = uri.startsWith("/api");

        long startTime = System.currentTimeMillis();

        if (isApiRequest) {
            String queryString = request.getQueryString() != null ? "?" + request.getQueryString() : "";
            log.info("🌐 [API REQUEST IN]  {} {}{} | IP: {}", 
                    request.getMethod(), uri, queryString, request.getRemoteAddr());
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            if (isApiRequest) {
                long duration = System.currentTimeMillis() - startTime;
                int status = response.getStatus();
                if (status >= 400) {
                    log.warn("⚠️ [API RESPONSE OUT] {} {} -> HTTP {} | Xử lý trong: {} ms", 
                            request.getMethod(), uri, status, duration);
                } else {
                    log.info("✅ [API RESPONSE OUT] {} {} -> HTTP {} | Xử lý trong: {} ms", 
                            request.getMethod(), uri, status, duration);
                }
            }
        }
    }
}

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ApiService } from '../services/api.service';

/**
 * Guard bảo vệ các trang học tập (Home, Scanner, Collection)
 * Yêu cầu người dùng phải đăng nhập mới được truy cập.
 */
export const authGuard: CanActivateFn = () => {
  const api = inject(ApiService);
  const router = inject(Router);

  if (api.currentUser()) {
    return true;
  }

  // Nếu chưa đăng nhập: mở modal đăng nhập và quay về landing page
  api.openAuthModal('login');
  return router.createUrlTree(['/']);
};

/**
 * Guard cho trang Landing Page của khách
 * Nếu học viên đã đăng nhập, tự động chuyển hướng vào Trang Chủ (Dashboard)
 */
export const guestGuard: CanActivateFn = () => {
  const api = inject(ApiService);
  const router = inject(Router);

  if (api.currentUser()) {
    return router.createUrlTree(['/home']);
  }

  return true;
};

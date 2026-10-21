import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { ToastService } from '../services/toast.service';

/**
 * Guard bảo vệ Cổng Quản Trị Hệ Thống (/admin)
 * Yêu cầu người dùng phải đăng nhập và có vai trò ADMIN.
 */
export const adminGuard: CanActivateFn = () => {
  const api = inject(ApiService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const user = api.currentUser();

  // 1. Chưa đăng nhập: Mở modal đăng nhập và quay về trang landing
  if (!user) {
    toast.warning('Vui lòng đăng nhập với tài khoản Quản Trị Viên (Admin) để tiếp tục!', 'Yêu cầu đăng nhập');
    api.openAuthModal('login');
    return router.createUrlTree(['/']);
  }

  // 2. Đã đăng nhập nhưng là Học Viên (STUDENT): Chặn truy cập
  if (user.role !== 'ADMIN') {
    toast.error('Tài khoản của bạn là Học Viên, không có quyền truy cập Cổng Quản Trị Hệ Thống!', 'Truy cập bị từ chối');
    return router.createUrlTree(['/home']);
  }

  // 3. Đúng quyền ADMIN: Cho phép truy cập
  return true;
};

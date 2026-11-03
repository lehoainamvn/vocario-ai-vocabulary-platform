import { HttpInterceptorFn } from '@angular/common/http';

/**
 * AuthInterceptor — Tự động đính kèm JSON Web Token (Bearer) vào Authorization Header
 * cho mọi HTTP request gửi đến máy chủ Backend theo chuẩn RFC 6750.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  let token: string | null = null;
  try {
    token = localStorage.getItem('vocario_token');
    if (!token) {
      const userStr = localStorage.getItem('vocario_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        token = u?.token || null;
      }
    }
  } catch (_) {}

  if (token && !req.headers.has('Authorization')) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token.trim()}`
      }
    });
    return next(authReq);
  }

  return next(req);
};


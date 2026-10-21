import { Injectable, signal } from '@angular/core';
import { Toast, ToastType } from '../models/toast.model';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(message: string, type: ToastType = 'info', title?: string, duration: number = 4000): string {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newToast: Toast = { id, type, title, message, duration };

    this.toasts.update(current => [...current, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
    return id;
  }

  success(message: string, title: string = 'Thành công', duration: number = 4000): string {
    return this.show(message, 'success', title, duration);
  }

  error(message: string, title: string = 'Thất bại', duration: number = 5000): string {
    return this.show(message, 'error', title, duration);
  }

  warning(message: string, title: string = 'Lưu ý', duration: number = 4500): string {
    return this.show(message, 'warning', title, duration);
  }

  info(message: string, title: string = 'Thông báo', duration: number = 4000): string {
    return this.show(message, 'info', title, duration);
  }

  remove(id: string) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }

  clear() {
    this.toasts.set([]);
  }
}

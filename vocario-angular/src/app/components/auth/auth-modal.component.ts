import { Component, EventEmitter, Input, Output, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../common/icon.component';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import { LoginRequest, RegisterRequest } from '../../models/vocario.models';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  template: `
    <!-- Overlay Backdrop -->
    <div 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-fade-in select-none"
      (click)="onBackdropClick($event)"
    >
      <!-- Modal Card (Chuẩn Figma 100%, tự co giãn thông minh không bị cấn viền) -->
      <div 
        class="w-full max-w-[440px] max-h-[96vh] overflow-y-auto bg-white rounded-3xl border border-[#E5DED3] py-4 px-5 sm:px-6 shadow-2xl relative select-none animate-fade-in transform transition-all duration-300 no-scrollbar"
        (click)="$event.stopPropagation()"
      >
        <!-- Close Button (X icon góc trên bên phải) -->
        <button 
          type="button" 
          (click)="closeModal.emit()"
          class="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#FAF7F2] hover:bg-[#EAE5DC] border border-[#E5DED3] text-[#746B60] hover:text-[#29251F] flex items-center justify-center cursor-pointer transition-colors z-10"
          title="Đóng cửa sổ"
          aria-label="Đóng"
        >
          <app-icon name="x" [size]="13"></app-icon>
        </button>

        <!-- Brand Icon & Header -->
        <div class="flex flex-col items-center text-center">
          <!-- Logo Badge [V] -->
          <div class="w-8 h-8 rounded-xl bg-[#7D6853] text-white flex items-center justify-center font-serif font-bold text-base shadow-2xs select-none">
            V
          </div>
          <span class="text-[9px] font-sans font-semibold tracking-wider uppercase text-[#746B60] mt-1">
            Vocario
          </span>

          <!-- Heading -->
          <h2 class="font-serif text-xl sm:text-2xl font-semibold text-[#29251F] tracking-tight mt-1 mb-0">
            {{ activeTab() === 'login' ? 'Chào mừng bạn trở lại' : 'Khởi đầu hành trình mới' }}
          </h2>

          <!-- Subtitle -->
          <p class="text-xs text-[#746B60] mt-0.5 mb-0 max-w-xs leading-relaxed">
            {{ activeTab() === 'login' ? 'Tiếp tục hành trình học từ vựng qua bối cảnh đời thực.' : 'Tạo không gian học tập cá nhân hóa từ thế giới xung quanh bạn.' }}
          </p>
        </div>

        <!-- Segmented Underline Tabs: Đăng nhập | Tạo tài khoản -->
        <div class="flex items-center justify-center gap-8 border-b border-[#E5DED3] mt-2.5 mb-2.5">
          <button 
            type="button" 
            (click)="setTab('login')"
            [class.border-[#7D6853]]="activeTab() === 'login'"
            [class.text-[#29251F]]="activeTab() === 'login'"
            [class.font-semibold]="activeTab() === 'login'"
            [class.border-transparent]="activeTab() !== 'login'"
            [class.text-[#746B60]]="activeTab() !== 'login'"
            class="pb-2 -mb-[1px] border-b-2 text-xs transition-colors cursor-pointer bg-transparent border-t-0 border-l-0 border-r-0 font-medium"
          >
            Đăng nhập
          </button>

          <button 
            type="button" 
            (click)="setTab('register')"
            [class.border-[#7D6853]]="activeTab() === 'register'"
            [class.text-[#29251F]]="activeTab() === 'register'"
            [class.font-semibold]="activeTab() === 'register'"
            [class.border-transparent]="activeTab() !== 'register'"
            [class.text-[#746B60]]="activeTab() !== 'register'"
            class="pb-2 -mb-[1px] border-b-2 text-xs transition-colors cursor-pointer bg-transparent border-t-0 border-l-0 border-r-0 font-medium"
          >
            Tạo tài khoản
          </button>
        </div>

        <!-- In-Modal Alert Error Box -->
        <div 
          *ngIf="errorMessage()" 
          class="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-shake shadow-2xs"
        >
          <app-icon name="help-circle" [size]="14" svgClass="text-rose-600 mt-0.5 shrink-0"></app-icon>
          <div class="flex-1 leading-relaxed">
            <span class="font-semibold block text-rose-900 mb-0.5">Lỗi xác thực:</span>
            <span>{{ errorMessage() }}</span>
          </div>
        </div>

        <!-- In-Modal Alert Success Box -->
        <div 
          *ngIf="successMessage()" 
          class="mb-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 shadow-2xs"
        >
          <app-icon name="check" [size]="14" svgClass="text-emerald-600 mt-0.5 shrink-0"></app-icon>
          <span class="leading-relaxed font-medium">{{ successMessage() }}</span>
        </div>

        <!-- =====================================================================
             1. LOGIN FORM
             ===================================================================== -->
        <form *ngIf="activeTab() === 'login'" (ngSubmit)="handleLogin()" class="space-y-2.5 font-sans">
          <!-- Identifier Field -->
          <div>
            <label class="block text-xs font-medium text-[#29251F] mb-1">
              Email liên kết hoặc tên đăng nhập
            </label>
            <input 
              type="text" 
              name="usernameOrEmail"
              [(ngModel)]="loginForm.usernameOrEmail" 
              required
              placeholder="name@example.com hoặc username"
              class="w-full h-9.5 px-3 rounded-xl border border-[#E5DED3] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#7D6853] text-sm text-[#29251F] placeholder:text-[#A8A199] transition-all"
            />
          </div>

          <!-- Password Field -->
          <div>
            <label class="block text-xs font-medium text-[#29251F] mb-1">
              Mật khẩu
            </label>
            <div class="relative">
              <input 
                [type]="showPassword() ? 'text' : 'password'" 
                name="password"
                [(ngModel)]="loginForm.password" 
                required
                placeholder="Nhập mật khẩu"
                class="w-full h-9.5 pl-3 pr-9 rounded-xl border border-[#E5DED3] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#7D6853] text-sm text-[#29251F] placeholder:text-[#A8A199] transition-all"
              />
              <button 
                type="button" 
                (click)="toggleShowPassword()" 
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#746B60] hover:text-[#29251F] bg-transparent border-0 cursor-pointer p-1 flex items-center justify-center transition-colors"
                [title]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
              >
                <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="15"></app-icon>
              </button>
            </div>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            [disabled]="loading()"
            class="w-full h-10 rounded-[10px] bg-[#7D6853] hover:bg-[#685542] disabled:opacity-50 text-white font-medium text-xs sm:text-sm shadow-2xs transition-all active:scale-95 cursor-pointer border-0 flex items-center justify-center gap-2 mt-3"
          >
            <span *ngIf="loading()" class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
            <span>{{ loading() ? 'Đang xác thực...' : 'Đăng nhập vào Vocario' }}</span>
          </button>
        </form>

        <!-- =====================================================================
             2. REGISTER FORM (Chuẩn Figma)
             ===================================================================== -->
        <form *ngIf="activeTab() === 'register'" (ngSubmit)="handleRegister()" class="space-y-2 font-sans">
          <!-- Họ và tên -->
          <div>
            <label class="block text-xs font-medium text-[#29251F] mb-0.5">
              Họ và tên
            </label>
            <input 
              type="text" 
              name="fullName"
              [(ngModel)]="registerForm.fullName" 
              placeholder="Nguyen Van Student"
              class="w-full h-9 px-3 rounded-xl border border-[#E5DED3] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#7D6853] text-sm text-[#29251F] placeholder:text-[#A8A199] transition-all"
            />
          </div>

          <!-- Email liên kết -->
          <div>
            <label class="block text-xs font-medium text-[#29251F] mb-0.5">
              Email liên kết
            </label>
            <input 
              type="text" 
              name="email"
              [(ngModel)]="registerForm.email" 
              required
              placeholder="name@example.com hoặc username"
              class="w-full h-9 px-3 rounded-xl border border-[#E5DED3] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#7D6853] text-sm text-[#29251F] placeholder:text-[#A8A199] transition-all"
            />
          </div>

          <!-- Mật khẩu -->
          <div>
            <label class="block text-xs font-medium text-[#29251F] mb-0.5">
              Mật khẩu
            </label>
            <div class="relative">
              <input 
                [type]="showPassword() ? 'text' : 'password'" 
                name="password"
                [(ngModel)]="registerForm.password" 
                required
                placeholder="Nhập mật khẩu"
                class="w-full h-9 pl-3 pr-9 rounded-xl border border-[#E5DED3] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#7D6853] text-sm text-[#29251F] placeholder:text-[#A8A199] transition-all"
              />
              <button 
                type="button" 
                (click)="toggleShowPassword()" 
                class="absolute right-3 top-1/2 -translate-y-1/2 text-[#746B60] hover:text-[#29251F] bg-transparent border-0 cursor-pointer p-1 flex items-center justify-center transition-colors"
                [title]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
              >
                <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="15"></app-icon>
              </button>
            </div>
          </div>

          <!-- Xác nhận mật khẩu -->
          <div>
            <label class="block text-xs font-medium text-[#29251F] mb-0.5">
              Xác nhận mật khẩu
            </label>
            <input 
              type="password" 
              name="confirmPassword"
              [(ngModel)]="confirmPassword" 
              required
              placeholder="Nhập lại mật khẩu"
              class="w-full h-9 px-3 rounded-xl border border-[#E5DED3] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:border-[#7D6853] text-sm text-[#29251F] placeholder:text-[#A8A199] transition-all"
            />
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            [disabled]="loading()"
            class="w-full h-9.5 rounded-[10px] bg-[#7D6853] hover:bg-[#685542] disabled:opacity-50 text-white font-medium text-xs sm:text-sm shadow-2xs transition-all active:scale-95 cursor-pointer border-0 flex items-center justify-center gap-2 mt-2.5"
          >
            <span *ngIf="loading()" class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
            <span>{{ loading() ? 'Đang tạo tài khoản...' : 'Tạo tài khoản Vocario' }}</span>
          </button>
        </form>

        <!-- Divider: Hoặc trải nghiệm nhanh tài khoản mẫu -->
        <div class="relative my-3 text-center">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-[#E5DED3]"></div>
          </div>
          <span class="relative bg-white px-2.5 text-[10px] text-[#8C827A]">
            Hoặc trải nghiệm nhanh tài khoản mẫu
          </span>
        </div>

        <!-- 2 Demo Account Cards (Chuẩn Figma) -->
        <div class="grid grid-cols-2 gap-2.5">
          <!-- Học viên demo -->
          <button 
            type="button" 
            (click)="fillStudentAccount()"
            class="py-2 px-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F2ECE1] border border-[#E5DED3] hover:border-[#D8CFBF] text-left cursor-pointer transition-all flex items-center gap-2 active:scale-98"
          >
            <div class="w-7 h-7 rounded-lg bg-white border border-[#E5DED3] flex items-center justify-center text-[#7D6853] shrink-0">
              <app-icon name="users" [size]="14"></app-icon>
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-semibold text-xs text-[#29251F] truncate">Học viên demo</div>
              <div class="text-[9px] text-[#746B60] truncate">Khám phá hành trình học</div>
            </div>
          </button>

          <!-- Quản trị viên demo -->
          <button 
            type="button" 
            (click)="fillAdminAccount()"
            class="py-2 px-2.5 rounded-xl bg-[#FAF8F5] hover:bg-[#F2ECE1] border border-[#E5DED3] hover:border-[#D8CFBF] text-left cursor-pointer transition-all flex items-center gap-2 active:scale-98"
          >
            <div class="w-7 h-7 rounded-lg bg-white border border-[#E5DED3] flex items-center justify-center text-[#7D6853] shrink-0">
              <app-icon name="compass" [size]="14"></app-icon>
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-semibold text-xs text-[#29251F] truncate">Quản trị viên demo</div>
              <div class="text-[9px] text-[#746B60] truncate">Xem cockpit vận hành</div>
            </div>
          </button>
        </div>

        <!-- Footnote -->
        <p class="text-[9.5px] text-[#8C827A] text-center mt-2.5 mb-0">
          Tài khoản demo chỉ dùng trong phiên preview và không lưu thông tin đăng nhập.
        </p>

      </div>
    </div>
  `
})
export class AuthModalComponent {
  @Input() initialTab: 'login' | 'register' = 'login';
  @Output() closeModal = new EventEmitter<void>();
  @Output() authSuccess = new EventEmitter<any>();

  activeTab = signal<'login' | 'register'>('login');
  loading = signal(false);
  showPassword = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  loginForm: LoginRequest = {
    usernameOrEmail: '',
    password: ''
  };

  registerForm: RegisterRequest = {
    fullName: '',
    username: '',
    email: '',
    password: ''
  };

  confirmPassword = '';

  constructor(
    private api: ApiService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.activeTab.set(this.initialTab);
  }

  setTab(tab: 'login' | 'register') {
    this.activeTab.set(tab);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.cdr.markForCheck();
  }

  toggleShowPassword() {
    this.showPassword.update(v => !v);
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeModal.emit();
    }
  }

  fillStudentAccount() {
    this.loginForm.usernameOrEmail = 'student1';
    this.loginForm.password = 'Password123@';
    this.toast.info('Đã chọn tài khoản Học Viên: student1', 'Tài khoản Học Viên');
    this.handleLogin();
  }

  fillAdminAccount() {
    this.loginForm.usernameOrEmail = 'admin';
    this.loginForm.password = 'Password123@';
    this.toast.info('Đã chọn tài khoản Quản Trị Viên: admin', 'Tài khoản Admin');
    this.handleLogin();
  }

  handleLogin() {
    this.errorMessage.set('');
    this.successMessage.set('');

    const identifier = this.loginForm.usernameOrEmail.trim();
    const password = this.loginForm.password;

    if (!identifier || !password) {
      const msg = 'Vui lòng nhập đầy đủ tên đăng nhập hoặc email và mật khẩu!';
      this.errorMessage.set(msg);
      this.toast.warning(msg, 'Thiếu thông tin');
      this.cdr.markForCheck();
      return;
    }

    this.loading.set(true);
    this.cdr.markForCheck();

    this.api.login({ usernameOrEmail: identifier, password }).subscribe({
      next: (res) => {
        this.loading.set(false);
        const displayName = res.fullName || res.username;
        this.successMessage.set(`Đăng nhập thành công! Chào mừng ${displayName}.`);
        this.toast.success(`Chào mừng ${displayName} quay trở lại học tập!`, 'Đăng nhập thành công');
        this.authSuccess.emit(res);
        this.cdr.markForCheck();

        setTimeout(() => {
          this.closeModal.emit();
        }, 800);
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Login error details:', err);

        let msg = '';
        if (err.status === 0) {
          msg = 'Không thể kết nối đến máy chủ Backend (Port 8088). Vui lòng đảm bảo Backend Spring Boot đang chạy!';
        } else if (err.error?.message) {
          msg = err.error.message;
        } else if (typeof err.error === 'string') {
          msg = err.error;
        } else {
          msg = 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!';
        }

        this.errorMessage.set(msg);
        this.toast.error(msg, 'Đăng nhập không thành công');
        this.cdr.markForCheck();
      }
    });
  }

  handleRegister() {
    this.errorMessage.set('');
    this.successMessage.set('');

    const inputEmail = this.registerForm.email.trim();
    const password = this.registerForm.password;

    if (!inputEmail || !password) {
      const msg = 'Vui lòng điền đầy đủ email và mật khẩu!';
      this.errorMessage.set(msg);
      this.toast.warning(msg, 'Thiếu thông tin');
      this.cdr.markForCheck();
      return;
    }

    if (password !== this.confirmPassword) {
      const msg = 'Mật khẩu xác nhận không khớp!';
      this.errorMessage.set(msg);
      this.toast.warning(msg, 'Xác nhận mật khẩu sai');
      this.cdr.markForCheck();
      return;
    }

    if (password.length < 6) {
      const msg = 'Mật khẩu phải có ít nhất 6 ký tự!';
      this.errorMessage.set(msg);
      this.toast.warning(msg, 'Mật khẩu quá ngắn');
      this.cdr.markForCheck();
      return;
    }

    // Tự động chuẩn hóa username & email từ thông tin nhập
    let derivedEmail = inputEmail;
    let derivedUsername = this.registerForm.username?.trim();

    if (inputEmail.includes('@')) {
      derivedEmail = inputEmail;
      if (!derivedUsername) {
        derivedUsername = inputEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      }
    } else {
      derivedUsername = inputEmail.toLowerCase().replace(/[^a-z0-9]/g, '');
      derivedEmail = `${derivedUsername}@vocario.edu`;
    }

    if (!derivedUsername) {
      derivedUsername = 'user_' + Math.floor(Math.random() * 10000);
    }

    const payload: RegisterRequest = {
      fullName: this.registerForm.fullName?.trim() || derivedUsername,
      username: derivedUsername,
      email: derivedEmail,
      password: password
    };

    this.loading.set(true);
    this.cdr.markForCheck();

    this.api.register(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.successMessage.set('Tạo tài khoản thành công! Đang tự động đăng nhập...');
        this.toast.success('Tài khoản mới đã được tạo thành công!', 'Đăng ký thành công');
        this.authSuccess.emit(res);
        this.cdr.markForCheck();

        setTimeout(() => {
          this.closeModal.emit();
        }, 1000);
      },
      error: (err) => {
        this.loading.set(false);
        console.error('Register error details:', err);

        let msg = '';
        if (err.status === 0) {
          msg = 'Không thể kết nối đến máy chủ Backend (Port 8088). Vui lòng đảm bảo Backend Spring Boot đang chạy!';
        } else if (err.error?.message) {
          msg = err.error.message;
        } else if (typeof err.error === 'string') {
          msg = err.error;
        } else {
          msg = 'Đăng ký thất bại. Email hoặc tên đăng nhập có thể đã tồn tại!';
        }

        this.errorMessage.set(msg);
        this.toast.error(msg, 'Đăng ký không thành công');
        this.cdr.markForCheck();
      }
    });
  }
}

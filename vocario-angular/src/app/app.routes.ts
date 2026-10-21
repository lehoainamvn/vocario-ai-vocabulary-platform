import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';
import { UserHomeComponent } from './components/user/user-home.component';
import { UserScannerComponent } from './components/user/user-scanner.component';
import { UserCollectionComponent } from './components/user/user-collection.component';
import { UserFlashcardsComponent } from './components/user/user-flashcards.component';
import { UserLeaderboardComponent } from './components/user/user-leaderboard.component';
import { UserProfileComponent } from './components/user/user-profile.component';
import { UserQuizComponent } from './components/user/user-quiz.component';
import { UserTextExtractorComponent } from './components/user/user-text-extractor.component';
import { UserClassroomComponent } from './components/user/user-classroom.component';
import { AdminComponent } from './components/admin/admin.component';
import { authGuard, guestGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
    canActivate: [guestGuard],
    title: 'Vocario — Học Từ Vựng Qua Bối Cảnh Đời Thực'
  },
  {
    path: 'home',
    component: UserHomeComponent,
    canActivate: [authGuard],
    title: 'Vocario — Trang Chủ Học Tập & Ôn Luyện SM-2'
  },
  {
    path: 'scanner',
    component: UserScannerComponent,
    canActivate: [authGuard],
    title: 'Vocario — Studio Quét Ảnh Nhận Diện AI'
  },
  {
    path: 'text-extractor',
    component: UserTextExtractorComponent,
    canActivate: [authGuard],
    title: 'Vocario — Trích Xuất Từ Vựng Từ Văn Bản & Luyện Tập AI'
  },
  {
    path: 'classrooms',
    component: UserClassroomComponent,
    canActivate: [authGuard],
    title: 'Vocario — Lớp Học Ảo & Chia Sẻ Bộ Từ Vựng'
  },
  {
    path: 'classrooms/:code',
    component: UserClassroomComponent,
    canActivate: [authGuard],
    title: 'Vocario — Chi Tiết Phòng Học & Bảng Xếp Hạng'
  },
  {
    path: 'collection',
    component: UserCollectionComponent,
    canActivate: [authGuard],
    title: 'Vocario — Bộ Sưu Tập Bối Cảnh & Sổ Từ Vựng'
  },
  {
    path: 'flashcards',
    component: UserFlashcardsComponent,
    canActivate: [authGuard],
    title: 'Vocario — Sổ Từ Vựng Đã Lưu & Luyện Flashcard'
  },
  {
    path: 'saved-words',
    redirectTo: 'flashcards'
  },
  {
    path: 'leaderboard',
    component: UserLeaderboardComponent,
    canActivate: [authGuard],
    title: 'Vocario — Bảng Xếp Hạng & Đấu Trường Tri Thức'
  },
  {
    path: 'quiz',
    component: UserQuizComponent,
    canActivate: [authGuard],
    title: 'Vocario — Đấu Trường Thị Giác & Thử Thách Tìm Đồ Vật'
  },
  {
    path: 'profile',
    component: UserProfileComponent,
    canActivate: [authGuard],
    title: 'Vocario — Hồ Sơ & Cài Đặt Học Viên'
  },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [adminGuard],
    title: 'Vocario — Cổng Quản Trị Hệ Thống'
  },
  {
    path: '**',
    redirectTo: ''
  }
];

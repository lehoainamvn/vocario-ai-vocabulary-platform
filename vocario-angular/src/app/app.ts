import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { NavbarComponent } from './components/common/navbar.component';
import { AuthModalComponent } from './components/auth/auth-modal.component';
import { ToastContainerComponent } from './components/common/toast.component';
import { SpeechScorerModalComponent } from './components/common/speech-scorer-modal.component';
import { ApiService } from './services/api.service';
import { UserStudyService } from './services/user-study.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    NavbarComponent,
    AuthModalComponent,
    ToastContainerComponent,
    SpeechScorerModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  currentTab = 'home';
  isAdminRoute = signal(false);
  showScrollTop = signal(false);

  @HostListener('window:scroll')
  onWindowScroll() {
    if (typeof window !== 'undefined') {
      this.showScrollTop.set(window.scrollY > 400);
    }
  }

  constructor(
    public api: ApiService,
    public studyService: UserStudyService,
    private router: Router
  ) {
    if (typeof window !== 'undefined') {
      this.isAdminRoute.set(window.location.pathname.startsWith('/admin'));
    }
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.isAdminRoute.set(event.urlAfterRedirects.startsWith('/admin'));
      }
    });
  }

  handleTabChange(tab: string) {
    this.currentTab = tab;
    if (!this.api.currentUser()) {
      if (tab === 'home') {
        this.router.navigate(['/']);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const el = document.getElementById(tab);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }

  openAuth(tab: 'login' | 'register' = 'login') {
    this.api.openAuthModal(tab);
  }

  closeAuth() {
    this.api.closeAuthModal();
  }

  handleAuthSuccess(user: any) {
    console.log('User authenticated successfully:', user);
    this.api.closeAuthModal();
    this.studyService.loadRealData();
    if (user?.role === 'ADMIN') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/home']);
    }
  }

  windowScrollTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

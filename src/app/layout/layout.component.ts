import { Component, OnInit, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css'],
  standalone: false,
})
export class LayoutComponent implements OnInit {
  showLogoutModal: boolean = false;
  private preventUnload: boolean = true;
  menuOpen = true;
  notificationsCount = 5;
  showNotifications = false;
  showUserMenu = false;
  currentRoute = '';

  constructor(private router: Router, public authService: AuthService) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter((event: any) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
      });
  }

  isLoginPage(): boolean {
    return this.currentRoute === '/login';
  }

  getInitials(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    this.showNotifications = false;
  }

  logout(): void {
    this.showLogoutModal = true;
  }

  // Fermer la modal
  closeLogoutModal(): void {
    this.showLogoutModal = false;
  }

  // Confirmation de déconnexion
  confirmLogout(): void {
    this.preventUnload = false;
    this.performLogout();
    this.closeLogoutModal();
  }

  // Déconnexion effective
  private performLogout(): void {
    sessionStorage.removeItem('user_data');
    this.router.navigate(['/login']);
  }

  // HostListener conditionnel
  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: BeforeUnloadEvent): void {
    if (this.preventUnload) {
      event.preventDefault();
      event.returnValue = 'Voulez-vous vraiment quitter cette page ?';
    }
  }
}

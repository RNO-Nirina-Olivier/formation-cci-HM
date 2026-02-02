import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  telephone?: string;
  dateCreation?: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  user?: User;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.loadUserFromStorage();
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap((response) => {
          if (response.success && response.user) {
            this.handleLoginSuccess(response);
          } else {
            throw new Error(response.message || 'Erreur lors de la connexion');
          }
        }),
        catchError(this.handleError)
      );
  }

  testConnection(): Observable<any> {
    return this.http.get(`${this.API_URL}/health`);
  }

  getAvailableUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.API_URL}/auth/users`).pipe(
      catchError((error) => {
        console.warn('Impossible de récupérer les utilisateurs:', error);
        return [];
      })
    );
  }

  private handleLoginSuccess(response: LoginResponse): void {
    if (!response.user) {
      throw new Error('Données utilisateur manquantes');
    }

    if (this.isBrowser) {
      sessionStorage.setItem('user_data', JSON.stringify(response.user));
    }

    this.currentUserSubject.next(response.user);
  }

  private loadUserFromStorage(): void {
    if (!this.isBrowser) return;

    const userData = sessionStorage.getItem('user_data');

    if (userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Erreur parsing user data:', error);
        this.logout();
      }
    }
  }

  logout(): void {
    if (this.isBrowser) {
      sessionStorage.removeItem('user_data');
    }

    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    if (!this.isBrowser) return false;

const userData = sessionStorage.getItem('user_data');

    try {
      if (!userData) {
        return false;
      }
      const user = JSON.parse(userData);

      if (user && user.id && user.email) {
        return true;
      } else {
        this.logout();
        return false;
      }
    } catch {
      this.logout();
      return false;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur est survenue';

    if (error.status === 0) {
      errorMessage =
        'Impossible de se connecter au serveur. Vérifiez que le serveur backend est démarré.';
    } else if (error.status === 404) {
      errorMessage = 'Service non trouvé.';
    } else if (error.status === 401) {
      errorMessage = error.error?.message || 'Email ou mot de passe incorrect.';
    } else if (error.status >= 500) {
      errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }

    return throwError(() => new Error(errorMessage));
  }
}

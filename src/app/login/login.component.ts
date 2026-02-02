import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: false,
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  hidePassword = true;
  showSuccessDialog = false;
  successMessage = '';
  systemStatus = 'checking';
  apiStatus = 'Vérification de la connexion...';

  availableUsers: any[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(1)]], // Minimum 1 caractère
      rememberMe: [false],
    });
  }

  ngOnInit(): void {
    this.checkApiStatus();
    this.loadAvailableUsers();
  }

  checkApiStatus(): void {
    this.systemStatus = 'checking';
    this.apiStatus = "Test de connexion à l'API...";

    this.authService.testConnection().subscribe({
      next: (response) => {
        this.systemStatus = 'operational';
        this.apiStatus = "✅ Connecté à l'API";
        console.log('✅ Test de connexion réussi:', response);
      },
      error: (error) => {
        this.systemStatus = 'outage';
        this.apiStatus = '❌ API non disponible';
        console.error('❌ Test de connexion échoué:', error);
      },
    });
  }

  loadAvailableUsers(): void {
    this.authService.getAvailableUsers().subscribe({
      next: (users) => {
        this.availableUsers = users.map((user) => ({
          username: user.username,
          email: user.email,
          role: user.role,
          telephone: user.telephone,
        }));
        console.log('👥 Utilisateurs disponibles:', this.availableUsers);
      },
      error: (error) => {
        console.warn('⚠️ Impossible de charger les utilisateurs:', error);
        this.availableUsers = [];
      },
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const credentials = this.loginForm.value;
      console.log('🚀 Tentative de connexion avec:', {
        email: credentials.email,
      });

      this.authService.login(credentials).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.showSuccessMessage(`Bienvenue ${response.user?.username} !`);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.message;
          console.error('❌ Erreur de connexion:', error);
        },
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  selectUser(user: any): void {
    this.loginForm.patchValue({
      email: user.email,
      password: 'password', // Mot de passe par défaut, à adapter
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  private showSuccessMessage(message: string): void {
    this.successMessage = message;
    this.showSuccessDialog = true;

    // Redirection automatique après 2 secondes
    setTimeout(() => {
      this.navigateToDashboard();
    }, 2000);
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  navigateImmediately(): void {
    this.showSuccessDialog = false;
    this.navigateToDashboard();
  }

  retryConnection(): void {
    this.errorMessage = '';
    this.checkApiStatus();
    this.loadAvailableUsers();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach((key) => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  getStatusClass(): string {
    return this.systemStatus;
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  getEmailErrorMessage(): string {
    if (this.email?.hasError('required')) {
      return "L'email est obligatoire";
    }
    return this.email?.hasError('email') ? 'Email invalide' : '';
  }

  getPasswordErrorMessage(): string {
    if (this.password?.hasError('required')) {
      return 'Le mot de passe est obligatoire';
    }
    return '';
  }

  getRoleDisplay(role: string): string {
    const roles: { [key: string]: string } = {
      admin: 'Administrateur',
      manager: 'Manager',
      user: 'Utilisateur',
    };
    return roles[role] || role;
  }
}

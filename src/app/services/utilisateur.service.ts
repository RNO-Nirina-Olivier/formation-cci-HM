import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';

export interface Utilisateur {
  id_user?: string;
  username: string;
  mot_de_passe?: string;
  role?: string; // ✅ **Ovaina ho optional** fa tsy nesorina
  email: string;
  telephone?: string;
  date_creation?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UtilisateurService {
  private endpoint = 'utilisateurs';

  constructor(private api: ApiService) {
    console.log(
      '🔧 UtilisateurService initialisé avec endpoint:',
      this.endpoint
    );
  }

  getUtilisateurs(): Observable<Utilisateur[]> {
    console.log(
      '🔄 Récupération des utilisateurs depuis:',
      `${environment.apiUrl}/${this.endpoint}`
    );

    if (environment.useMockServices) {
      console.log('🎭 Utilisation des données mock');
      return this.getMockUtilisateurs();
    }

    return this.api.get<Utilisateur[]>(this.endpoint).pipe(
      catchError((error) => {
        console.warn('❌ API failed, using mock data', error);
        return this.getMockUtilisateurs();
      })
    );
  }

  getUtilisateur(id: string): Observable<Utilisateur> {
    return this.api.get<Utilisateur>(`${this.endpoint}/${id}`);
  }

  createUtilisateur(utilisateur: Utilisateur): Observable<Utilisateur> {
    console.log('➕ Création utilisateur:', utilisateur);

    // ✅ **Nesorina ilay role raha tsy ilaina**
    const utilisateurSansRole = { ...utilisateur };
    delete utilisateurSansRole.role;

    return this.api.post<Utilisateur>(this.endpoint, utilisateurSansRole);
  }

  updateUtilisateur(
    id: string,
    utilisateur: Utilisateur
  ): Observable<Utilisateur> {
    // ✅ **Nesorina ilay role raha tsy ilaina**
    const utilisateurSansRole = { ...utilisateur };
    delete utilisateurSansRole.role;

    return this.api.put<Utilisateur>(
      `${this.endpoint}/${id}`,
      utilisateurSansRole
    );
  }

  deleteUtilisateur(id: string): Observable<any> {
    return this.api.delete<any>(`${this.endpoint}/${id}`);
  }

  getUtilisateurByUsername(username: string): Observable<Utilisateur> {
    return this.api.get<Utilisateur>(`${this.endpoint}/username/${username}`);
  }

  // Méthodes mock
  private getMockUtilisateurs(): Observable<Utilisateur[]> {
    const mockUsers: Utilisateur[] = [
      {
        id_user: 'USER-001',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin',
        telephone: '+261 34 12 345 67',
        date_creation: '2024-01-15',
      },
      {
        id_user: 'USER-002',
        username: 'formateur1',
        email: 'formateur1@example.com',
        role: 'formateur', 
        telephone: '+261 33 12 345 67',
        date_creation: '2024-01-16',
      },
    ];
    return of(mockUsers);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Inscription {
  id_inscription: string;
  id_apprenti: string;
  id_formation: string;
  date_inscription: string;
  statut: 'en_attente' | 'admis' | 'refuse' | 'liste_attente';
  nom?: string;
  prenom?: string;
  email?: string;
  nom_formation?: string;
  type_formation?: string;
  date_debut?: string;
  date_fin?: string;
  lieu_theorique?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
  error?: string;
  details?: string;
}

@Injectable({
  providedIn: 'root',
})
export class InscriptionService {
  private apiUrl = `${environment.apiUrl}/inscriptions`;

  constructor(private http: HttpClient) {
    console.log('🔧 InscriptionService initialisé avec URL:', this.apiUrl);
  }

  // ✅ Créer une inscription
  createInscription(inscriptionData: {
    id_apprenti: string;
    id_formation: string;
    date_inscription: string;
    statut: string;
  }): Observable<Inscription> {
    console.log('📤 Création inscription - Données envoyées:', inscriptionData);

    return this.http
      .post<ApiResponse<Inscription>>(this.apiUrl, inscriptionData)
      .pipe(
        map((response) => {
          console.log('✅ Réponse création inscription:', response);
          if (response.success && response.data) {
            return response.data;
          } else {
            throw new Error(
              response.error || 'Erreur inconnue lors de la création'
            );
          }
        }),
        catchError((error) => {
          console.error('❌ Erreur HTTP création inscription:', error);

          let errorMessage = 'Erreur de connexion au serveur';
          if (error.status === 409) {
            errorMessage = 'Cet apprenti est déjà inscrit à cette formation';
          } else if (error.error?.error) {
            errorMessage = error.error.error;
          } else if (error.error?.details) {
            errorMessage = error.error.details;
          } else if (error.message) {
            errorMessage = error.message;
          }

          throw new Error(errorMessage);
        })
      );
  }

  // ✅ Récupérer les inscriptions
  getInscriptions(): Observable<Inscription[]> {
    console.log('🔄 Récupération des inscriptions depuis:', this.apiUrl);

    return this.http.get<ApiResponse<Inscription[]>>(this.apiUrl).pipe(
      map((response) => {
        console.log('✅ Réponse inscriptions:', response);
        return response.data || [];
      }),
      catchError((error) => {
        console.error('❌ Erreur récupération inscriptions:', error);
        return of([]);
      })
    );
  }

  // ✅ Mettre à jour une inscription
  updateInscription(
    id: string,
    inscription: Partial<Inscription>
  ): Observable<Inscription> {
    return this.http
      .put<ApiResponse<Inscription>>(`${this.apiUrl}/${id}`, inscription)
      .pipe(
        map((response) => {
          if (response.success && response.data) {
            return response.data;
          } else {
            throw new Error(response.error || 'Erreur lors de la mise à jour');
          }
        })
      );
  }

  // ✅ Supprimer une inscription
  deleteInscription(
    id: string
  ): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `${this.apiUrl}/${id}`
    );
  }

  getInscriptionById(id: string): Observable<Inscription> {
    return this.http
      .get<ApiResponse<Inscription>>(`${this.apiUrl}/${id}`)
      .pipe(map((response) => response.data));
  }

  searchInscriptions(term: string): Observable<Inscription[]> {
    return this.http
      .get<ApiResponse<Inscription[]>>(`${this.apiUrl}/search?q=${term}`)
      .pipe(map((response) => response.data || []));
  }

  // ✅ Test de connexion
  testConnection(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }
}

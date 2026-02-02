import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface EvaluationApprenti {
  id_apprenti: string;
  nom: string;
  prenom: string;
  email?: string;
  id_formation: string;
  formation_metier?: string;
  type_formation?: 'professionnel_dual' | 'modulaire' | 'thematique';
  moyenne_theorique: number;
  note_pratique: number;
  moyenne_generale: number;
  mention: string;
  matieres_notees: number;
  total_matieres: number;
  note_minimale: number;
  note_maximale: number;
  classement?: number;
  pourcentage_completion?: number;
}

export interface StatistiquesGenerales {
  total_apprentis: number;
  moyenne_globale: number;
  meilleure_moyenne: number;
  plus_basse_moyenne: number;
  taux_reussite: number;
  formation_metier?: string;
  type_formation?: string;
  moyenne_theorique_only?: number;
  moyenne_pratique_only?: number;
}

export interface StatistiquesTypeFormation {
  type_formation: string;
  total_apprentis: number;
  moyenne_globale: number;
  taux_reussite: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EvaluationService {
  private apiUrl = `${environment.apiUrl}/evaluations`;

  constructor(private http: HttpClient) {}

  private handleError(error: HttpErrorResponse) {
    console.error('❌ Erreur API Evaluation:', error);

    let errorMessage = 'Une erreur est survenue lors de la récupération des évaluations';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      errorMessage = `Erreur ${error.status}: ${error.message}`;
    }

    return throwError(() => new Error(errorMessage));
  }

  // Debug des données
  debugDatabase(): Observable<any> {
    return this.http
      .get<ApiResponse<any>>(`${this.apiUrl}/debug`)
      .pipe(
        map((response) => response.data),
        catchError(this.handleError)
      );
  }

  // Obtenir les statistiques générales
  getStatistiquesGenerales(): Observable<StatistiquesGenerales> {
    return this.http
      .get<ApiResponse<StatistiquesGenerales>>(`${this.apiUrl}/statistiques`)
      .pipe(
        map((response) => {
          console.log('📊 Statistiques reçues:', response.data);
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  // Obtenir les évaluations de tous les apprentis avec paramètre de tri
  getEvaluationsApprentis(
    order: string = 'desc'
  ): Observable<EvaluationApprenti[]> {
    return this.http
      .get<ApiResponse<EvaluationApprenti[]>>(
        `${this.apiUrl}/apprentis?order=${order}`
      )
      .pipe(
        map((response) => {
          console.log('📊 Évaluations reçues:', response.data?.length || 0, 'apprentis');
          return response.data || [];
        }),
        catchError(this.handleError)
      );
  }

  // Obtenir les statistiques par formation
  getStatistiquesParFormation(
    id_formation: string
  ): Observable<StatistiquesGenerales> {
    return this.http
      .get<ApiResponse<StatistiquesGenerales>>(
        `${this.apiUrl}/formation/${id_formation}`
      )
      .pipe(
        map((response) => response.data),
        catchError(this.handleError)
      );
  }

  // Obtenir le classement des apprentis
  getClassementApprentis(): Observable<EvaluationApprenti[]> {
    return this.http
      .get<ApiResponse<EvaluationApprenti[]>>(`${this.apiUrl}/classement`)
      .pipe(
        map((response) => {
          console.log('🏆 Classement reçu:', response.data?.length || 0, 'apprentis');
          return response.data || [];
        }),
        catchError(this.handleError)
      );
  }

  // Obtenir les statistiques par type de formation
  getStatistiquesParTypeFormation(): Observable<StatistiquesTypeFormation[]> {
    return this.http
      .get<ApiResponse<StatistiquesTypeFormation[]>>(
        `${this.apiUrl}/statistiques/type-formation`
      )
      .pipe(
        map((response) => {
          console.log('📊 Stats par type:', response.data);
          return response.data || [];
        }),
        catchError(this.handleError)
      );
  }
}
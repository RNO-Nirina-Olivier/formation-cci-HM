import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Apprenti {
  id_apprenti: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  id_inscription?: string;
  id_reinscription?: string;
  statut_inscription?: string;
  statut_reinscription?: string;
  formation_metier?: string;
  type_formation?: string;
}

export interface SuiviPratique {
  id_suivi: string;
  id_apprenti: string;
  id_formation: string;
  entreprise: string;
  adresse_entreprise: string;
  encadrant: string;
  date_debut: string;
  date_fin: string;
  evaluation?: string;
  apprenti_nom?: string;
  apprenti_prenom?: string;
  apprenti_email?: string;
  apprenti_telephone?: string;
  id_inscription?: string;
  id_reinscription?: string;
  formation_metier?: string;
  formation_description?: string;
  formation_type?: string;
  statut_inscription?: string;
  statut_reinscription?: string;
}



export interface Formation {
  id_formation: string;
  metier: string;
  description?: string;
  type_formation?: string;
}

export interface DonneesFormulaire {
  apprentis: Apprenti[];
  formations: Formation[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SuiviPratiqueService {
  private apiUrl = `${environment.apiUrl}/suivi-pratiques`;

  private refreshSuivisSubject = new BehaviorSubject<boolean>(true);
  public refreshSuivis$ = this.refreshSuivisSubject.asObservable();

  constructor(private http: HttpClient) {}

  // =============================================
  // GESTION DES SUIVIS PRATIQUES
  // =============================================

  getSuivis(): Observable<ApiResponse<SuiviPratique[]>> {
    return this.http
      .get<ApiResponse<SuiviPratique[]>>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  getSuivi(id: string): Observable<ApiResponse<SuiviPratique>> {
    return this.http
      .get<ApiResponse<SuiviPratique>>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  createSuivi(
    suivi: Omit<SuiviPratique, 'id_suivi'> & { id_suivi?: string }
  ): Observable<ApiResponse<SuiviPratique>> {
    const suiviAEnvoyer = {
      ...suivi,
      id_suivi: suivi.id_suivi || this.generateSuiviId(),
    };

    return this.http
      .post<ApiResponse<SuiviPratique>>(this.apiUrl, suiviAEnvoyer)
      .pipe(catchError(this.handleError));
  }

  updateSuivi(
    id: string,
    suivi: Partial<SuiviPratique>
  ): Observable<ApiResponse<SuiviPratique>> {
    return this.http
      .put<ApiResponse<SuiviPratique>>(`${this.apiUrl}/${id}`, suivi)
      .pipe(catchError(this.handleError));
  }

  deleteSuivi(id: string): Observable<ApiResponse<{ id_suivi: string }>> {
    return this.http
      .delete<ApiResponse<{ id_suivi: string }>>(`${this.apiUrl}/${id}`)
      .pipe(
        tap((response) => {
          if (response.success) {
            this.triggerRefreshSuivis();
          }
        }),
        catchError(this.handleError)
      );
  }

  getDonneesFormulaire(): Observable<ApiResponse<DonneesFormulaire>> {
    return this.http
      .get<ApiResponse<DonneesFormulaire>>(`${this.apiUrl}/formulaire/donnees`)
      .pipe(catchError(this.handleError));
  }

  getSuivisByApprenti(
    id_apprenti: string
  ): Observable<ApiResponse<SuiviPratique[]>> {
    return this.http
      .get<ApiResponse<SuiviPratique[]>>(
        `${this.apiUrl}/apprenti/${id_apprenti}`
      )
      .pipe(catchError(this.handleError));
  }

  getSuivisByFormation(
    id_formation: string
  ): Observable<ApiResponse<SuiviPratique[]>> {
    return this.http
      .get<ApiResponse<SuiviPratique[]>>(
        `${this.apiUrl}/formation/${id_formation}`
      )
      .pipe(catchError(this.handleError));
  }

  checkSuiviEnCours(
    id_apprenti: string
  ): Observable<ApiResponse<{ hasSuiviEnCours: boolean }>> {
    return this.http
      .get<ApiResponse<{ hasSuiviEnCours: boolean }>>(
        `${this.apiUrl}/apprenti/${id_apprenti}/check-en-cours`
      )
      .pipe(catchError(this.handleError));
  }

  checkFormationEligible(
    id_formation: string
  ): Observable<ApiResponse<{ isEligible: boolean; type_formation?: string }>> {
    return this.http
      .get<ApiResponse<{ isEligible: boolean; type_formation?: string }>>(
        `${this.apiUrl}/formation/${id_formation}/check-eligible`
      )
      .pipe(catchError(this.handleError));
  }

  generateSuiviIdFromAPI(): Observable<ApiResponse<{ id_suivi: string }>> {
    return this.http
      .get<ApiResponse<{ id_suivi: string }>>(`${this.apiUrl}/generate-id`)
      .pipe(catchError(this.handleError));
  }

  // =============================================
  // FONCTIONS UTILITAIRES
  // =============================================

  generateSuiviId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `SUIVI_${timestamp}_${random}`.toUpperCase();
  }

  triggerRefreshSuivis() {
    this.refreshSuivisSubject.next(true);
    console.log('🎯 Rafraîchissement des suivis déclenché');
  }

  validerSuivi(suivi: Partial<SuiviPratique>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!suivi.id_apprenti) errors.push("L'apprenti est requis");
    if (!suivi.id_formation) errors.push('La formation est requise');
    if (!suivi.entreprise) errors.push("L'entreprise est requise");
    if (!suivi.adresse_entreprise) errors.push("L'adresse de l'entreprise est requise");
    if (!suivi.encadrant) errors.push("L'encadrant est requis");
    if (!suivi.date_debut) errors.push('La date de début est requise');
    if (!suivi.date_fin) errors.push('La date de fin est requise');

    if (suivi.date_debut && suivi.date_fin) {
      const dateDebut = new Date(suivi.date_debut);
      const dateFin = new Date(suivi.date_fin);

      if (dateFin < dateDebut) {
        errors.push(
          'La date de fin ne peut pas être antérieure à la date de début'
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private handleError(error: any): Observable<never> {
    console.error('❌ Erreur service SuiviPratique:', error);

    if (error.status === 0) {
      return throwError(() => new Error('Erreur de connexion au serveur'));
    } else if (error.status === 404) {
      return throwError(() => new Error('Ressource non trouvée'));
    } else if (error.status === 500) {
      return throwError(() => new Error('Erreur interne du serveur'));
    }

    return throwError(
      () => new Error(error.error?.message || 'Une erreur est survenue')
    );
  }
getStats(): Observable<ApiResponse<any>> {
  return this.http
    .get<ApiResponse<any>>(`${this.apiUrl}/stats`)
    .pipe(catchError(this.handleError));
}

checkApprentiEligible(
  id_apprenti: string, 
  id_formation: string
): Observable<ApiResponse<{
  isEligible: boolean;
  nom?: string;
  prenom?: string;
  statut_inscription?: string;
  type_formation?: string;
  message: string;
}>> {
  return this.http
    .get<ApiResponse<any>>(`${this.apiUrl}/check-apprenti/${id_apprenti}/${id_formation}`)
    .pipe(catchError(this.handleError));
}
}
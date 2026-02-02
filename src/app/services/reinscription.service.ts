import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Reinscription {
  id_reinscription?: string;
  id_apprenti: string;
  id_formation: string;
  id_inscription_originale?: string;
  date_reinscription?: string;
  statut: 'en_attente' | 'validee' | 'refusee' | 'annulee';
  motif_reinscription?: string;
  created_at?: string;
  updated_at?: string;
  // Champs des jointures
  apprenti_nom?: string;
  apprenti_prenom?: string;
  apprenti_email?: string;
  apprenti_telephone?: string;
  formation_metier?: string;
  type_formation?: string;
  formation_date_debut?: string;
  formation_date_fin?: string;
}

export interface StatsReinscription {
  total_reinscriptions: number;
  validees: number;
  en_attente: number;
  refusees: number;
  annulees: number;
  apprentis_uniques: number;
  formations_concernees: number;
  premiere_reinscription: string;
  derniere_reinscription: string;
  taux_validation: number;
}

export interface InscriptionOriginale {
  id_inscription: string;
  id_formation: string;
  date_inscription: string;
  formation_metier: string;
  type_formation: string;
  date_debut: string;
  date_fin: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReinscriptionService {
  private apiUrl = `${environment.apiUrl}/reinscriptions`;

  constructor(private http: HttpClient) {
    console.log('🌐 ReinscriptionService - API URL:', this.apiUrl);
  }

  // ==================== INSCRIPTIONS ORIGINALES ====================
  getInscriptionsOriginales(
    id_apprenti: string
  ): Observable<InscriptionOriginale[]> {
    console.log('📋 Service: getInscriptionsOriginales()', id_apprenti);

    return this.http
      .get<InscriptionOriginale[]>(
        `${this.apiUrl}/apprenti/${id_apprenti}/inscriptions`
      )
      .pipe(
        catchError((error) => {
          console.error('❌ Erreur chargement inscriptions originales:', error);
          return of([]);
        })
      );
  }

  // ==================== CRUD REINSCRIPTION ====================
  getReinscriptions(): Observable<Reinscription[]> {
    console.log('📥 Service: getReinscriptions()');
    return this.http
      .get<Reinscription[]>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  getReinscription(id: string): Observable<Reinscription> {
    return this.http
      .get<Reinscription>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  createReinscription(
    reinscription: Omit<Reinscription, 'id_reinscription'>
  ): Observable<Reinscription> {
    console.log('📤 Service: createReinscription()', reinscription);

    // Validation des données
    const validation = this.validateReinscriptionData(reinscription);
    if (!validation.isValid) {
      return throwError(() => new Error(validation.errors.join(', ')));
    }

    return this.http
      .post<Reinscription>(this.apiUrl, reinscription)
      .pipe(catchError(this.handleError));
  }

  updateReinscription(
    id: string,
    reinscription: Partial<Reinscription>
  ): Observable<Reinscription> {
    return this.http
      .put<Reinscription>(`${this.apiUrl}/${id}`, reinscription)
      .pipe(catchError(this.handleError));
  }

  deleteReinscription(id: string): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== ACTIONS SPÉCIFIQUES ====================
  validerReinscription(id: string): Observable<Reinscription> {
    console.log('✅ Service: validerReinscription()', id);
    return this.http
      .put<Reinscription>(`${this.apiUrl}/${id}/valider`, {})
      .pipe(catchError(this.handleError));
  }

  refuserReinscription(id: string, motif: string): Observable<Reinscription> {
    console.log('❌ Service: refuserReinscription()', { id, motif });
    return this.http
      .put<Reinscription>(`${this.apiUrl}/${id}/refuser`, { motif })
      .pipe(catchError(this.handleError));
  }

  annulerReinscription(id: string, motif?: string): Observable<Reinscription> {
    console.log('🚫 Service: annulerReinscription()', { id, motif });
    return this.http
      .put<Reinscription>(`${this.apiUrl}/${id}/annuler`, { motif })
      .pipe(catchError(this.handleError));
  }

  // ==================== RECHERCHE ET FILTRES ====================
  searchReinscriptions(term: string): Observable<Reinscription[]> {
    if (!term || term.trim() === '') {
      return this.getReinscriptions();
    }

    const params = new HttpParams().set('q', term.trim());
    return this.http
      .get<Reinscription[]>(`${this.apiUrl}/search`, { params })
      .pipe(catchError(this.handleError));
  }

  getReinscriptionsByStatut(statut: string): Observable<Reinscription[]> {
    const statutsValides = ['en_attente', 'validee', 'refusee', 'annulee'];
    if (!statutsValides.includes(statut)) {
      return throwError(() => new Error('Statut invalide'));
    }

    return this.http
      .get<Reinscription[]>(`${this.apiUrl}/statut/${statut}`)
      .pipe(catchError(this.handleError));
  }

  // ==================== VÉRIFICATIONS ====================
  checkEligibility(
    id_apprenti: string,
    id_formation: string,
    id_inscription_originale?: string
  ): Observable<{ canReinscrire: boolean }> {
    let params = new HttpParams()
      .set('id_apprenti', id_apprenti)
      .set('id_formation', id_formation);

    if (id_inscription_originale) {
      params = params.set('id_inscription_originale', id_inscription_originale);
    }

    return this.http
      .get<{ canReinscrire: boolean }>(`${this.apiUrl}/check-eligibility`, {
        params,
      })
      .pipe(catchError(this.handleError));
  }

  // ==================== STATISTIQUES ====================
  getStats(): Observable<StatsReinscription> {
    return this.http
      .get<StatsReinscription>(`${this.apiUrl}/stats/overview`)
      .pipe(catchError(this.handleError));
  }

  // ==================== TESTS ET SANTÉ ====================
  testConnection(): Observable<any> {
    return this.http.get(`${this.apiUrl}/test/connection`);
  }

  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }

  // ==================== GESTION D'ERREURS ====================
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('❌ Erreur ReinscriptionService:', error);

    let errorMessage = 'Une erreur est survenue';

    if (error.status === 0) {
      errorMessage =
        'Impossible de se connecter au serveur. Vérifiez que le backend est démarré.';
    } else if (error.status === 404) {
      errorMessage = `Ressource non trouvée (${error.url})`;
    } else if (error.status === 409) {
      errorMessage =
        error.error?.error ||
        'Cet apprenti est déjà réinscrit à cette formation';
    } else if (error.status === 400) {
      errorMessage = error.error?.error || 'Données invalides';
    } else if (error.status === 500) {
      errorMessage = 'Erreur interne du serveur. Veuillez réessayer.';
    } else if (error.error && error.error.error) {
      errorMessage = error.error.error;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => new Error(errorMessage));
  }

  // ==================== UTILITAIRES ====================
  getStatutColor(statut: string): string {
    switch (statut) {
      case 'validee':
        return 'success';
      case 'en_attente':
        return 'warning';
      case 'refusee':
        return 'danger';
      case 'annulee':
        return 'secondary';
      default:
        return 'info';
    }
  }

  getStatutLabel(statut: string): string {
    switch (statut) {
      case 'validee':
        return 'Validée';
      case 'en_attente':
        return 'En attente';
      case 'refusee':
        return 'Refusée';
      case 'annulee':
        return 'Annulée';
      default:
        return statut;
    }
  }

  getStatutBadgeClass(statut: string): string {
    switch (statut) {
      case 'validee':
        return 'badge bg-success';
      case 'en_attente':
        return 'badge bg-warning text-dark';
      case 'refusee':
        return 'badge bg-danger';
      case 'annulee':
        return 'badge bg-secondary';
      default:
        return 'badge bg-info';
    }
  }

  getStatutIcon(statut: string): string {
    switch (statut) {
      case 'validee':
        return 'check-circle';
      case 'en_attente':
        return 'clock';
      case 'refusee':
        return 'x-circle';
      case 'annulee':
        return 'slash-circle';
      default:
        return 'question-circle';
    }
  }

  // Validation des données avant envoi
  validateReinscriptionData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.id_apprenti) {
      errors.push("L'apprenti est requis");
    }

    if (!data.id_formation) {
      errors.push('La formation est requise');
    }

    if (
      data.statut &&
      !['en_attente', 'validee', 'refusee', 'annulee'].includes(data.statut)
    ) {
      errors.push('Statut invalide');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Formater les données pour l'affichage
formatReinscriptionForDisplay(reinscription: Reinscription): any {
  return {
    ...reinscription,
    statutLabel: this.getStatutLabel(reinscription.statut),
    statutColor: this.getStatutColor(reinscription.statut),
    statutBadgeClass: this.getStatutBadgeClass(reinscription.statut), // ← CORRECTION ICI
    nomCompletApprenti: `${reinscription.apprenti_prenom} ${reinscription.apprenti_nom}`.trim(),
    formationComplete: reinscription.formation_metier ? 
      `${reinscription.formation_metier} (${reinscription.type_formation})` : 
      'Formation inconnue'
  };
}
}

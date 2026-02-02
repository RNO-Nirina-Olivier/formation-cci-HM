// services/rapport.service.ts
import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, TimeoutError, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

export interface RapportDB {
  id_rapport: string;
  id_apprenti: string;
  id_formation: string;
  type_rapport: string;
  numero_rapport: string;
  donnees_rapport: any;
  fichier_pdf?: string;
  chemin_fichier?: string;
  statut: 'generé' | 'en_cours' | 'erreur' | 'supprimé';
  date_creation: string;
  date_mise_a_jour: string;
  cree_par?: string;
}

export interface RapportAvecDetails extends RapportDB {
  apprenti_nom?: string;
  apprenti_prenom?: string;
  formation_metier?: string;
  formation_type?: string;
  date_creation_formatee?: string;
}

export interface GenerateRapportRequest {
  id_apprenti: string;
  id_formation: string;
  type_rapport?: string;
  cree_par?: string;
}

export interface GenerateRapportResponse {
  success: boolean;
  rapport?: RapportDB;
  message?: string;
  error?: string;
  numero_rapport?: string;
}

export interface RapportsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RapportsListResponse {
  success: boolean;
  data: RapportAvecDetails[];
  pagination: RapportsPagination;
}

export interface RapportsStats {
  total_rapports: number;
  rapports_par_type: { [key: string]: number };
  rapports_par_mois: { mois: string; count: number }[];
  derniers_rapports: RapportAvecDetails[];
}

export interface RapportComplet {
  // Informations personnelles APPRENTI
  id_apprenti: string;
  nom_apprenti: string;
  prenom_apprenti: string;
  date_naissance_apprenti: string;
  sexe_apprenti: string;
  adresse_apprenti: string;
  email_apprenti: string;
  telephone_apprenti: string;
  statut_apprenti: string;
  niveau_etude_apprenti: string;
  situation_professionnelle_apprenti: string;
  date_inscription_apprenti: string;

  // Informations FORMATION
  id_formation: string;
  metier_formation: string;
  type_formation: string;
  description_formation: string;
  date_debut_formation: string;
  date_fin_formation: string;
  lieu_theorique_formation: string;
  duree_formation: number;

  // RÉSULTATS GÉNÉRAUX
  moyenne_theorique_seule: number;
  moyenne_pratique_seule: number;
  moyenne_generale: number;
  mention_generale: string;
  decision_finale: string;

  // PRÉSENCE
  total_seances: number;
  seances_presentes: number;
  seances_absentes: number;
  seances_retard: number;
  taux_presence: number;

  // STATISTIQUES
  pourcentage_completion: number;
  taux_reussite_theorique: number;
  taux_reussite_pratique: number;
  classement_apprenti: number;
  total_apprentis_formation: number;

  // MÉTADONNÉES
  date_creation_rapport: string;
  numero_rapport: string;
  statut_rapport: string;
  type_calcul_moyenne: string;
}

// Ajouter cette interface si elle n'existe pas
export interface RapportsStats {
  total_rapports: number;
  rapports_par_type: { [key: string]: number };
  rapports_par_mois: { mois: string; count: number }[];
  derniers_rapports: RapportAvecDetails[];
}

// Ou si elle existe déjà, ajouter le type explicite
export interface RapportsStats {
  total_rapports: number;
  rapports_par_type: Record<string, number>;
  rapports_par_mois: { mois: string; count: number }[];
  derniers_rapports: RapportAvecDetails[];
}
export interface FormationApprenti {
  id_formation: string;
  metier: string;
  type_formation: string;
  description: string;
  date_debut: string;
  date_fin: string;
  lieu_theorique: string;
  duree_jours: number;
  nombre_rapports: number;
  statut: string;
  dernier_rapport_date: string;
}
export interface FormationsResponse {
  success: boolean;
  data: FormationApprenti[];
  count: number;
  source?: string;
  message?: string;
}
@Injectable({
  providedIn: 'root',
})
export class RapportService {
  private apiUrl = 'https://backend-cci.onrender.com/api/rapport';
  constructor(private http: HttpClient) {
    console.log('🌐 RapportService initialisé - URL:', this.apiUrl);
  }

  // ==================== TEST CONNEXION ====================
  testConnection(): Observable<any> {
    return this.http.get(`${this.apiUrl}/test`).pipe(
      timeout(5000),
      catchError((error) => {
        if (error.status === 404 || error.status === 400) {
          return of({
            status: 'server_responding',
            message: 'Serveur accessible',
          });
        }
        return this.handleError(error);
      })
    );
  }

  // ==================== CRUD RAPPORTS DB ====================

  /**
   * Générer un rapport et le sauvegarder dans la DB
   */
  genererRapportDB(
    request: GenerateRapportRequest
  ): Observable<GenerateRapportResponse> {
    console.log('📊 Génération rapport DB:', request);

    return this.http
      .post<GenerateRapportResponse>(`${this.apiUrl}/generer-db`, request)
      .pipe(timeout(30000), catchError(this.handleError));
  }

  /**
   * Obtenir tous les rapports paginés
   */
  getAllRapportsDB(
    page: number = 1,
    limit: number = 10,
    search: string = ''
  ): Observable<RapportsListResponse> {
    console.log(`📋 Tous les rapports DB - Page: ${page}, Limit: ${limit}`);

    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('search', search);

    return this.http
      .get<RapportsListResponse>(`${this.apiUrl}/db`, { params })
      .pipe(timeout(10000), catchError(this.handleError));
  }

  /**
   * Obtenir les rapports d'un apprenti
   */
  getRapportsDBByApprenti(
    id_apprenti: string
  ): Observable<RapportAvecDetails[]> {
    console.log(`📋 Rapports DB pour apprenti: ${id_apprenti}`);

    return this.http
      .get<RapportAvecDetails[]>(`${this.apiUrl}/apprenti/${id_apprenti}/db`)
      .pipe(timeout(10000), catchError(this.handleError));
  }

  /**
   * Obtenir un rapport par ID
   */
  getRapportDBById(
    id_rapport: string
  ): Observable<{ success: boolean; data: RapportAvecDetails }> {
    console.log(`📋 Rapport DB ID: ${id_rapport}`);

    return this.http
      .get<{ success: boolean; data: RapportAvecDetails }>(
        `${this.apiUrl}/db/${id_rapport}`
      )
      .pipe(timeout(10000), catchError(this.handleError));
  }

  /**
   * Supprimer un rapport (soft delete)
   */
  deleteRapportDB(
    id_rapport: string
  ): Observable<{ success: boolean; message: string }> {
    console.log(`🗑️ Suppression rapport DB ID: ${id_rapport}`);

    return this.http
      .delete<{ success: boolean; message: string }>(
        `${this.apiUrl}/db/${id_rapport}`
      )
      .pipe(timeout(10000), catchError(this.handleError));
  }

  // ==================== GESTION PDF ====================

  /**
   * Télécharger le PDF d'un rapport
   */
  telechargerRapportDB(id_rapport: string): Observable<Blob> {
    console.log(`📥 Téléchargement rapport DB ID: ${id_rapport}`);

    return this.http
      .get(`${this.apiUrl}/db/${id_rapport}/pdf`, {
        responseType: 'blob',
      })
      .pipe(timeout(30000), catchError(this.handleError));
  }

  /**
   * Visualiser le PDF dans le navigateur
   */
  visualiserRapportDB(id_rapport: string): Observable<Blob> {
    console.log(`👁️ Visualisation rapport DB ID: ${id_rapport}`);

    return this.http
      .get(`${this.apiUrl}/db/${id_rapport}/visualiser`, {
        responseType: 'blob',
      })
      .pipe(timeout(30000), catchError(this.handleError));
  }

  /**
   * Générer un rapport sans sauvegarde DB (téléchargement direct)
   */
  genererRapportPDF(
    id_apprenti: string,
    id_formation: string
  ): Observable<Blob> {
    console.log(
      `📊 Génération PDF direct - Apprenti: ${id_apprenti}, Formation: ${id_formation}`
    );

    return this.http
      .get(`${this.apiUrl}/telecharger/${id_apprenti}/${id_formation}`, {
        responseType: 'blob',
      })
      .pipe(timeout(30000), catchError(this.handleError));
  }

  /**
   * Obtenir les données d'un rapport sans PDF
   */
  getRapportDonnees(
    id_apprenti: string,
    id_formation: string
  ): Observable<{ success: boolean; data?: RapportComplet }> {
    console.log(
      `📊 Données rapport - Apprenti: ${id_apprenti}, Formation: ${id_formation}`
    );

    return this.http
      .get<{ success: boolean; data?: RapportComplet }>(
        `${this.apiUrl}/donnees/${id_apprenti}/${id_formation}`
      )
      .pipe(timeout(15000), catchError(this.handleError));
  }

  // ==================== STATISTIQUES ====================

  /**
   * Obtenir les statistiques des rapports
   */
  getRapportsStats(): Observable<{ success: boolean; data: RapportsStats }> {
    console.log('📊 Statistiques rapports');

    return this.http
      .get<{ success: boolean; data: RapportsStats }>(`${this.apiUrl}/stats`)
      .pipe(timeout(10000), catchError(this.handleError));
  }

  // ==================== UTILITAIRES ====================

  /**
   * Télécharger un blob avec nom de fichier
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Ouvrir un PDF dans un nouvel onglet
   */
  openPdfInNewTab(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  /**
   * Générer un nom de fichier pour le rapport
   */
  generateRapportFileName(
    rapport: RapportAvecDetails | RapportComplet
  ): string {
    let nom = '';
    let prenom = '';
    let numero = '';
    let metier = '';

    // Utiliser un type guard pour distinguer les deux types
    if ('apprenti_nom' in rapport) {
      // RapportAvecDetails
      const details = rapport as RapportAvecDetails;
      nom = details.apprenti_nom || '';
      prenom = details.apprenti_prenom || '';
      numero = details.numero_rapport || '';
      metier = details.formation_metier || '';
    } else if ('nom_apprenti' in rapport) {
      // RapportComplet
      const complet = rapport as RapportComplet;
      nom = complet.nom_apprenti || '';
      prenom = complet.prenom_apprenti || '';
      numero = complet.numero_rapport || '';
      metier = complet.metier_formation || '';
    } else {
      // Fallback
      nom = 'nom';
      prenom = 'prenom';
      numero = rapport.numero_rapport || 'numero';
      metier = 'formation';
    }

    const nomNormalise = `${prenom}-${nom}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const formationNormalisee = metier
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `rapport-${nomNormalise}-${formationNormalisee}-${numero}.pdf`;
  }

  /**
   * Formater un rapport pour l'affichage
   */
  formatRapportForDisplay(rapport: RapportAvecDetails): any {
    return {
      ...rapport,
      nomComplet: `${rapport.apprenti_prenom || ''} ${
        rapport.apprenti_nom || ''
      }`.trim(),
      dateCreationFormatee:
        rapport.date_creation_formatee ||
        (rapport.date_creation
          ? new Date(rapport.date_creation).toLocaleDateString('fr-FR')
          : ''),
      statutBadgeClass: this.getStatutBadgeClass(rapport.statut),
      typeBadgeClass: this.getTypeBadgeClass(rapport.type_rapport),
    };
  }

  /**
   * Valider les paramètres d'un rapport
   */
  validateRapportParams(
    id_apprenti: string,
    id_formation: string
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!id_apprenti) {
      errors.push("L'identifiant de l'apprenti est requis");
    }

    if (!id_formation) {
      errors.push("L'identifiant de la formation est requis");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ==================== CLASSES CSS ====================

  private getStatutBadgeClass(statut: string): string {
    switch (statut) {
      case 'generé':
        return 'badge bg-success';
      case 'en_cours':
        return 'badge bg-warning';
      case 'erreur':
        return 'badge bg-danger';
      case 'supprimé':
        return 'badge bg-secondary';
      default:
        return 'badge bg-light text-dark';
    }
  }

  private getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'formation_complet':
        return 'badge bg-primary';
      case 'resultats':
        return 'badge bg-info';
      case 'presence':
        return 'badge bg-warning';
      default:
        return 'badge bg-light text-dark';
    }
  }

  // ==================== GESTION D'ERREURS ====================

  private handleError(error: any): Observable<never> {
    console.error('❌ Erreur RapportService:', error);

    let errorMessage = 'Une erreur inconnue est survenue';

    if (error instanceof TimeoutError) {
      errorMessage = 'Timeout: Le serveur met trop de temps à répondre';
    } else if (error instanceof HttpErrorResponse) {
      switch (error.status) {
        case 0:
          errorMessage = 'Impossible de se connecter au serveur.';
          break;
        case 400:
          errorMessage = error.error?.message || 'Requête invalide.';
          break;
        case 401:
          errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
          break;
        case 403:
          errorMessage = 'Accès refusé.';
          break;
        case 404:
          errorMessage = error.error?.message || 'Ressource non trouvée.';
          break;
        case 500:
          errorMessage = error.error?.message || 'Erreur interne du serveur.';
          break;
        case 503:
          errorMessage = 'Service temporairement indisponible.';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    console.error("Détails de l'erreur:", {
      name: error.name,
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      error: error.error,
    });

    return throwError(() => new Error(errorMessage));
  }
  /**
   * Récupérer les formations d'un apprenti
   */
  getFormationsByApprenti(id_apprenti: string): Observable<FormationsResponse> {
    console.log(`📚 Formations pour apprenti: ${id_apprenti}`);

    return this.http
      .get<FormationsResponse>(
        `${this.apiUrl}/apprenti/${id_apprenti}/formations`
      )
      .pipe(timeout(10000), catchError(this.handleError));
  }
  /**
   * Récupérer la formation active/actuelle d'un apprenti
   */
  getCurrentFormationByApprenti(id_apprenti: string): Observable<any> {
    console.log(`🎯 Formation actuelle pour apprenti: ${id_apprenti}`);

    return this.http
      .get<any>(`${this.apiUrl}/apprenti/${id_apprenti}/formation-actuelle`)
      .pipe(timeout(10000), catchError(this.handleError));
  }
}

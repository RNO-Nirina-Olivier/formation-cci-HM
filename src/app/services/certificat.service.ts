import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpHeaders,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, TimeoutError, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Certificat {
  id_certificat?: string;
  id_apprenti: string;
  id_formation: string;
  id_note?: string;
  id_note_pratique?: string;
  date_delivrance: string;
  numero_certificat: string;
  fichier_pdf: string;
  apprenti_nom?: string;
  apprenti_prenom?: string;
  formation_metier?: string;
  duree_formation?: string;
  mention?: string;
  moyenne_theorique?: number;
  moyenne_pratique?: number;
  moyenne_generale?: number;
  type_formation?: string;
  date_debut?: string;
  date_fin?: string;
  date_naissance?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
}

export interface Apprenti {
  id_apprenti: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  email: string;
  telephone?: string;
  adresse?: string;
  statut?: string;
}

export interface Formation {
  id_formation: string;
  metier: string;
  type_formation: string;
  date_debut: string;
  date_fin: string;
  niveau?: string;
  description?: string;
}

export interface StatsCertificats {
  total_certificats: number;
  apprentis_uniques: number;
  formations_attestees: number;
  premier_certificat: string;
  dernier_certificat: string;
}

export interface CalculMoyennesResponse {
  formation: {
    id_formation: string;
    metier: string;
    type_formation: string;
  };
  statistiques: {
    total_apprentis: number;
    admis: number;
    eligibles_certificat: number;
    moyenne_generale_formation: number;
    taux_reussite: number;
  };
  apprentis: ApprentiAvecNotes[];
}

export interface ApprentiAvecNotes {
  id_apprenti: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  date_naissance: string;
  type_formation: string;
  metier: string;
  moyenne_theorique: number;
  note_pratique: number;
  moyenne_generale: number;
  statut_admission: string;
  eligible_certificat: string;
  details_calcul: string;
  formule_utilisee: string;
  is_formation_duale: boolean;
  nombre_matieres: number;
  notes_theoriques_list: number[];
}

export interface NumeroCheckResponse {
  exists: boolean;
}

export interface NextNumberResponse {
  nextNumber: string;
}

export interface ArchiveCertificat extends Certificat {
  date_archivage: string;
  date_archivage_formatee?: string;
}

export interface ArchiveStats {
  total_archives: number;
  formations_archivees: number;
  apprentis_archives: number;
  premiere_archivage: string;
  derniere_archivage: string;
  tres_bien: number;
  bien: number;
  assez_bien: number;
  passable: number;
  non_admis: number;
}
export interface ApprentiAvecNotes {
  id_apprenti: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  date_naissance: string;
  type_formation: string;
  metier: string;
  moyenne_theorique: number;
  note_pratique: number;
  moyenne_generale: number;
  statut_admission: string;
  eligible_certificat: string;
}
// Interfaces pour les archives - BIEN EXPORTÉES
export interface ArchiveCertificat extends Certificat {
  date_archivage: string;
  date_archivage_formatee?: string;
}

export interface ArchiveStats {
  total_archives: number;
  formations_archivees: number;
  apprentis_archives: number;
  premiere_archivage: string;
  derniere_archivage: string;
  tres_bien: number;
  bien: number;
  assez_bien: number;
  passable: number;
  non_admis: number;
}
@Injectable({
  providedIn: 'root',
})
export class CertificatService {
  private apiUrl = `${environment.apiUrl}/certificats`;
  private archiveApiUrl = `${environment.apiUrl}/archive_certificat`;

  constructor(private http: HttpClient) {
    console.log('🌐 CertificatService initialisé - URL:', this.apiUrl);
    console.log('📁 Archive URL:', this.archiveApiUrl);
  }

  // ==================== TEST CONNEXION ====================
  testConnection(): Observable<any> {
    return this.http
      .get(`${this.apiUrl}`) // ✅ Teste l'endpoint principal au lieu de /health
      .pipe(
        timeout(5000),
        catchError((error) => {
          // Gestion spécifique pour le test de connexion
          if (error.status === 404) {
            // L'endpoint existe mais retourne 404, ce qui signifie que le serveur répond
            return of({
              status: 'server_responding',
              message: 'Serveur accessible',
            });
          }
          return this.handleError(error);
        })
      );
  }

  // ==================== CRUD CERTIFICATS ====================
  getCertificats(): Observable<Certificat[]> {
    console.log('📥 GET tous les certificats');
    return this.http
      .get<Certificat[]>(this.apiUrl)
      .pipe(timeout(10000), catchError(this.handleError));
  }

  getCertificat(id: string): Observable<Certificat> {
    console.log(`📥 GET certificat ${id}`);
    return this.http
      .get<Certificat>(`${this.apiUrl}/${id}`)
      .pipe(timeout(10000), catchError(this.handleError));
  }

  createCertificat(
    certificat: Omit<Certificat, 'id_certificat'>
  ): Observable<Certificat> {
    console.log('📤 POST nouveau certificat:', certificat);
    return this.http
      .post<Certificat>(this.apiUrl, certificat)
      .pipe(timeout(15000), catchError(this.handleError));
  }

  updateCertificat(id: string, certificat: Certificat): Observable<Certificat> {
    console.log(`📤 PUT certificat ${id}:`, certificat);
    return this.http
      .put<Certificat>(`${this.apiUrl}/${id}`, certificat)
      .pipe(timeout(15000), catchError(this.handleError));
  }

  deleteCertificat(id: string): Observable<any> {
    console.log(`🗑️ DELETE certificat ${id}`);
    return this.http
      .delete(`${this.apiUrl}/${id}`)
      .pipe(timeout(10000), catchError(this.handleError));
  }

  // ==================== DONNÉES ASSOCIÉES ====================
  getApprentis(): Observable<Apprenti[]> {
    return this.http
      .get<Apprenti[]>(`${environment.apiUrl}/apprentis`)
      .pipe(timeout(10000), catchError(this.handleError));
  }

  getFormations(): Observable<Formation[]> {
    return this.http
      .get<Formation[]>(`${environment.apiUrl}/formations`)
      .pipe(timeout(10000), catchError(this.handleError));
  }

  // ==================== RECHERCHE ====================
  searchCertificats(term: string): Observable<Certificat[]> {
    console.log(`🔍 Recherche certificats: "${term}"`);
    const params = new HttpParams().set('q', term);
    return this.http
      .get<Certificat[]>(`${this.apiUrl}/search`, { params })
      .pipe(timeout(10000), catchError(this.handleError));
  }

  // ==================== QUERIES SPÉCIFIQUES ====================
  getCertificatsByApprenti(apprentiId: string): Observable<Certificat[]> {
    console.log(`📥 GET certificats par apprenti ${apprentiId}`);
    return this.http
      .get<Certificat[]>(`${this.apiUrl}/apprenti/${apprentiId}`)
      .pipe(timeout(10000), catchError(this.handleError));
  }

  getCertificatsByFormation(formationId: string): Observable<Certificat[]> {
    console.log(`📥 GET certificats par formation ${formationId}`);
    return this.http
      .get<Certificat[]>(`${this.apiUrl}/formation/${formationId}`)
      .pipe(timeout(10000), catchError(this.handleError));
  }

  getCertificatsByDate(date: string): Observable<Certificat[]> {
    console.log(`📥 GET certificats par date ${date}`);
    return this.http
      .get<Certificat[]>(`${this.apiUrl}/date/${date}`)
      .pipe(timeout(10000), catchError(this.handleError));
  }
  verifierRelations(
    apprentiId: string,
    formationId: string
  ): Observable<{ apprentiExists: boolean; formationExists: boolean }> {
    // Cette méthode serait implémentée côté backend si nécessaire
    // Pour l'instant, on suppose que les relations existent
    return new Observable((observer) => {
      observer.next({
        apprentiExists: true,
        formationExists: true,
      });
      observer.complete();
    });
  }

  // ==================== STATISTIQUES ====================
  getCertificatsStats(): Observable<StatsCertificats> {
    console.log('📊 Récupération statistiques certificats');
    return this.http
      .get<StatsCertificats>(`${this.apiUrl}/stats/overview`)
      .pipe(timeout(10000), catchError(this.handleError));
  }

  // ==================== CERTIFICATS AVEC NOTES ====================
  createCertificatAvecNotes(
    certificatData: Omit<Certificat, 'id_certificat'>
  ): Observable<Certificat> {
    console.log(
      '📤 Création certificat avec notes automatiques:',
      certificatData
    );

    // On utilise la même route POST, le backend gère automatiquement les notes
    return this.createCertificat(certificatData);
  }

  // ==================== DIAGNOSTIC ====================
  getCertificatDebug(id: string): Observable<any> {
    console.log(`🐛 Debug certificat ${id}`);
    return this.http
      .get<any>(`${this.apiUrl}/${id}/debug`)
      .pipe(timeout(10000), catchError(this.handleError));
  }

  // ==================== TEST ENDPOINT ====================
  testEndpoints(): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/test`)
      .pipe(timeout(5000), catchError(this.handleError));
  }

  // ==================== GESTION D'ERREURS ====================
  private handleError(error: any): Observable<never> {
    console.error('❌ Erreur CertificatService:', error);

    let errorMessage = 'Une erreur inconnue est survenue';

    if (error instanceof TimeoutError) {
      errorMessage = 'Timeout: Le serveur met trop de temps à répondre';
    } else if (error instanceof HttpErrorResponse) {
      // Erreur HTTP
      switch (error.status) {
        case 0:
          errorMessage =
            'Impossible de se connecter au serveur. Vérifiez que le serveur backend est démarré.';
          break;
        case 400:
          if (error.error && error.error.error) {
            errorMessage = error.error.error;
          } else {
            errorMessage = 'Requête invalide. Vérifiez les données envoyées.';
          }
          break;
        case 401:
          errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
          break;
        case 403:
          errorMessage =
            "Accès refusé. Vous n'avez pas les permissions nécessaires.";
          break;
        case 404:
          if (error.error && error.error.error) {
            errorMessage = error.error.error;
          } else {
            errorMessage = 'Ressource non trouvée.';
          }
          break;
        case 409:
          errorMessage = 'Conflit: Cette ressource existe déjà.';
          break;
        case 500:
          if (error.error && error.error.error) {
            errorMessage = error.error.error;
          } else {
            errorMessage =
              'Erreur interne du serveur. Veuillez réessayer plus tard.';
          }
          break;
        case 503:
          errorMessage =
            'Service temporairement indisponible. Veuillez réessayer plus tard.';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.message}`;
      }
    } else if (error instanceof Error) {
      // Erreur JavaScript standard
      errorMessage = error.message;
    }

    // Journalisation détaillée pour le débogage
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

  // ==================== UTILITAIRES ====================

  /**
   * Valide les données d'un certificat avant envoi
   */
  validateCertificatData(certificat: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!certificat.id_apprenti) {
      errors.push("L'identifiant de l'apprenti est requis");
    }

    if (!certificat.id_formation) {
      errors.push("L'identifiant de la formation est requis");
    }

    if (!certificat.date_delivrance) {
      errors.push('La date de délivrance est requise');
    } else {
      const date = new Date(certificat.date_delivrance);
      if (isNaN(date.getTime())) {
        errors.push("La date de délivrance n'est pas valide");
      }
    }

    if (!certificat.numero_certificat) {
      errors.push('Le numéro de certificat est requis');
    } else if (certificat.numero_certificat.length < 5) {
      errors.push(
        'Le numéro de certificat doit contenir au moins 5 caractères'
      );
    }

    if (!certificat.fichier_pdf) {
      errors.push('Le nom du fichier PDF est requis');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Génère un nom de fichier PDF standardisé
   */
  generatePdfFileName(certificat: Certificat): string {
    const nomNormalise = `${certificat.apprenti_prenom || 'prenom'}-${
      certificat.apprenti_nom || 'nom'
    }`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const formationNormalisee = (certificat.formation_metier || 'formation')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `certificat-${nomNormalise}-${formationNormalisee}-${certificat.numero_certificat}.pdf`;
  }

  /**
   * Formate les données pour l'affichage - CORRIGÉ ✅
   */
  formatCertificatForDisplay(certificat: Certificat): any {
    return {
      ...certificat,
      nomComplet:
        `${certificat.apprenti_prenom} ${certificat.apprenti_nom}`.trim(),
      dateDelivranceFormatee: certificat.date_delivrance
        ? new Date(certificat.date_delivrance).toLocaleDateString('fr-FR')
        : 'Non spécifiée',
      dateNaissanceFormatee: certificat.date_naissance
        ? new Date(certificat.date_naissance).toLocaleDateString('fr-FR')
        : 'Non spécifiée',
      // ✅ CORRECTION : Convertir en nombre avant d'utiliser toFixed()
      moyenneGenerale: certificat.moyenne_generale
        ? Number(certificat.moyenne_generale).toFixed(2)
        : '0.00',
      statut: certificat.mention === 'Non admis' ? 'Échec' : 'Réussi',
    };
  }

  /**
   * Télécharge un blob avec un nom de fichier spécifique
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
   * Ouvre un PDF dans un nouvel onglet
   */
  openPdfInNewTab(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    // Note: L'URL sera révoquée lorsque l'onglet sera fermé ou lorsque le navigateur décidera de la libérer
  }

  /**
   * Calcule les statistiques locales à partir d'une liste de certificats
   */
  calculateLocalStats(certificats: Certificat[]): {
    total: number;
    reussis: number;
    echecs: number;
    moyenneGenerale: number;
    mentions: { [key: string]: number };
  } {
    const total = certificats.length;
    const reussis = certificats.filter(
      (c) => c.mention && c.mention !== 'Non admis'
    ).length;
    const echecs = total - reussis;

    const moyennes = certificats
      .filter((c) => c.moyenne_generale && c.moyenne_generale > 0)
      .map((c) => Number(c.moyenne_generale)); // ✅ Convertir en nombre

    const moyenneGenerale =
      moyennes.length > 0
        ? moyennes.reduce((a, b) => a + b, 0) / moyennes.length
        : 0;

    const mentions: { [key: string]: number } = {};
    certificats.forEach((cert) => {
      const mention = cert.mention || 'Non spécifiée';
      mentions[mention] = (mentions[mention] || 0) + 1;
    });

    return {
      total,
      reussis,
      echecs,
      moyenneGenerale: Number(moyenneGenerale.toFixed(2)),
      mentions,
    };
  }

  // ==================== GÉNÉRATION PDF ====================
  generatePdf(id: string): Observable<Blob> {
    console.log(`📄 Génération PDF pour certificat ${id}`);

    return this.http
      .get(`${this.apiUrl}/${id}/pdf`, {
        responseType: 'blob',
      })
      .pipe(timeout(30000));
  }
  // ==================== VALIDATION ====================
  checkNumeroExists(
    numero: string,
    excludeId?: string
  ): Observable<NumeroCheckResponse> {
    console.log(`🔍 Vérification numéro: ${numero}, exclude: ${excludeId}`);

    let params = new HttpParams().set('numero', numero);
    if (excludeId) {
      params = params.set('excludeId', excludeId);
    }

    // ✅ CORRECTION: Utiliser l'URL correcte
    return this.http
      .get<NumeroCheckResponse>(`${this.apiUrl}/check-numero`, { params })
      .pipe(
        timeout(5000),
        catchError((error) => {
          console.error('❌ Erreur vérification numéro:', error);
          // En cas d'erreur, retourner que le numéro n'existe pas (pour permettre la création)
          return of({ exists: false });
        })
      );
  }

  // ==================== NUMÉROTATION ====================
  getNextCertificatNumber(): Observable<NextNumberResponse> {
    console.log('🔢 Récupération prochain numéro de certificat');
    return this.http.get<NextNumberResponse>(`${this.apiUrl}/next-number`).pipe(
      timeout(5000),
      catchError((error) => {
        console.error('❌ Erreur récupération prochain numéro:', error);
        // Fallback en cas d'erreur
        const year = new Date().getFullYear();
        const timestamp = new Date().getTime();
        const fallbackNumber = `CCI-HM-CERT-${year}-${timestamp
          .toString()
          .slice(-3)}`;
        return of({ nextNumber: fallbackNumber });
      })
    );
  }
  // ==================== ARCHIVES ====================

  // Obtenir tous les certificats archivés
  getArchives(): Observable<ArchiveCertificat[]> {
    console.log('📁 Récupération des archives');
    return this.http
      .get<ArchiveCertificat[]>(`${environment.apiUrl}/archive_certificat`)
      .pipe(timeout(10000), catchError(this.handleError));
  }

  // Archiver un certificat spécifique
  archiverCertificat(id: string): Observable<any> {
    console.log(`📁 Archivage du certificat ${id}`);
    return this.http
      .post<any>(`${environment.apiUrl}/archive_certificat/archiver/${id}`, {})
      .pipe(timeout(10000), catchError(this.handleError));
  }

  // Restaurer un certificat depuis les archives
  restaurerCertificat(id: string): Observable<Certificat> {
    console.log(`🔄 Restauration du certificat ${id}`);
    return this.http
      .post<Certificat>(
        `${environment.apiUrl}/archive_certificat/restaurer/${id}`,
        {}
      )
      .pipe(timeout(10000), catchError(this.handleError));
  }

  // Supprimer définitivement un certificat archivé
  supprimerArchive(id: string): Observable<any> {
    console.log(`🗑️ Suppression définitive archive ${id}`);
    return this.http
      .delete<any>(`${environment.apiUrl}/archive_certificat/${id}`)
      .pipe(timeout(10000), catchError(this.handleError));
  }

  // Vider toutes les archives
  viderArchives(): Observable<{ message: string; nb_supprimes: number }> {
    console.log('🗑️ Vidage de toutes les archives');
    return this.http
      .delete<{ message: string; nb_supprimes: number }>(
        `${environment.apiUrl}/archive_certificat`
      )
      .pipe(timeout(10000), catchError(this.handleError));
  }

  // Obtenir les statistiques des archives
  getArchiveStats(): Observable<ArchiveStats> {
    console.log('📊 Récupération statistiques archives');
    return this.http
      .get<ArchiveStats>(`${environment.apiUrl}/archive_certificat/stats`)
      .pipe(timeout(10000), catchError(this.handleError));
  }

  // Archivage automatique
  archivageAutomatique(): Observable<{ message: string; nb_archives: number }> {
    console.log('🔄 Archivage automatique');
    return this.http
      .post<{ message: string; nb_archives: number }>(
        `${environment.apiUrl}/archive_certificat/archivage-automatique`,
        {}
      )
      .pipe(timeout(15000), catchError(this.handleError));
  }
  getApprentisParFormation(
    id_formation: string
  ): Observable<ApprentiAvecNotes[]> {
    console.log(`📥 Récupération apprentis pour formation: ${id_formation}`);
    return this.http
      .get<ApprentiAvecNotes[]>(
        `${this.apiUrl}/formation/${id_formation}/apprentis`
      )
      .pipe(timeout(10000), catchError(this.handleError));
  }

  // ==================== CALCUL DÉTAILLÉ DES MOYENNES ====================
  getCalculMoyennesParFormation(
    id_formation: string
  ): Observable<CalculMoyennesResponse> {
    console.log(
      `🧮 Calcul détaillé des moyennes pour formation: ${id_formation}`
    );
    return this.http
      .get<CalculMoyennesResponse>(
        `${this.apiUrl}/formation/${id_formation}/calcul-moyennes`
      )
      .pipe(
        timeout(15000),
        catchError((error) => {
          console.error('❌ Erreur calcul détaillé:', error);
          return this.handleError(error);
        })
      );
  }
}

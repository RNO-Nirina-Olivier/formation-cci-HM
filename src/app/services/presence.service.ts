import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
export interface Presence {
  id_presence?: string;  // Format: PRES-001, PRES-002, etc.
  id_apprenti: string;
  date_cours: string;
  heure_debut: string;
  heure_fin: string;
  matiere: string;
  statut: string;
  remarque: string;
  apprenti_nom?: string;
  apprenti_prenom?: string;
  apprenti_email?: string;
  num_inscription?: string;  
  num_reinscription?: string; 
  id_formation?: string;
  formation_nom?: string;
}

export interface Apprenti {
  id_apprenti: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  statut?: string;
  date_naissance?: string;
  sexe?: string;
  adresse?: string;
  niveau_etude?: string;
  situation_professionnelle?: string;
  num_inscription?: string;  
  num_reinscription?: string;  
  id_formation?: string;
  formation_nom?: string;
  type_formation?: string;
}

export interface Formation {
  id_formation: string;
  nom_formation: string;
  type_formation: string;
  date_debut: string;
  date_fin: string;
  nombre_apprentis: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  count?: number;
}

@Injectable({
  providedIn: 'root',
})
export class PresenceService {
  private apiUrl = `${environment.apiUrl}/presences`;
  private readonly TIMEOUT_DURATION = 30000;

  constructor(private http: HttpClient) {}

  private handleError(error: HttpErrorResponse) {
    console.error('❌ Erreur API Presence:', error);

    let errorMessage = "Une erreur est survenue lors de l'opération";

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur réseau: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 0:
          errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée';
          break;
        case 400:
          errorMessage = error.error?.error || 'Données invalides';
          break;
        case 409:
          errorMessage = error.error?.error || 'Conflit de données';
          break;
        case 500:
          errorMessage = error.error?.error || 'Erreur interne du serveur';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.message}`;
      }

      if (error.error?.error) {
        errorMessage = error.error.error;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
    }

    return throwError(() => new Error(errorMessage));
  }

  // Obtenir toutes les présences
  getPresences(): Observable<Presence[]> {
    return this.http.get<ApiResponse<Presence[]>>(`${this.apiUrl}`).pipe(
      timeout(this.TIMEOUT_DURATION),
      map((response) => {
        if (!response.success) {
          throw new Error(
            response.error || 'Erreur lors de la récupération des présences'
          );
        }
        return response.data || [];
      }),
      catchError(this.handleError)
    );
  }

  // Obtenir les apprentis
  getApprentis(): Observable<Apprenti[]> {
    return this.http.get<ApiResponse<Apprenti[]>>(`${this.apiUrl}/apprentis`).pipe(
      timeout(this.TIMEOUT_DURATION),
      map((response) => {
        if (!response.success) {
          throw new Error(
            response.error || 'Erreur lors de la récupération des apprentis'
          );
        }
        return response.data || [];
      }),
      catchError(this.handleError)
    );
  }

  // Obtenir les apprentis par formation
  getApprentisByFormation(id_formation: string): Observable<Apprenti[]> {
    return this.http.get<ApiResponse<Apprenti[]>>(`${this.apiUrl}/apprentis/${id_formation}`).pipe(
      timeout(this.TIMEOUT_DURATION),
      map((response) => {
        if (!response.success) {
          throw new Error(
            response.error || 'Erreur lors de la récupération des apprentis'
          );
        }
        return response.data || [];
      }),
      catchError(this.handleError)
    );
  }

  // Obtenir les présences pour un cours spécifique
  getPresencesForCours(date_cours: string, matiere: string, id_formation: string): Observable<Presence[]> {
    return this.http
      .get<ApiResponse<Presence[]>>(`${this.apiUrl}/cours/${date_cours}/${matiere}/${id_formation}`)
      .pipe(
        timeout(this.TIMEOUT_DURATION),
        map((response) => {
          if (!response.success) {
            throw new Error(
              response.error || 'Erreur lors de la récupération des présences'
            );
          }
          return response.data || [];
        }),
        catchError(this.handleError)
      );
  }

  // Obtenir les matières disponibles
  getMatieres(): Observable<string[]> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/matieres`).pipe(
      timeout(this.TIMEOUT_DURATION),
      map((response) => {
        if (!response.success) {
          throw new Error(
            response.error || 'Erreur lors de la récupération des matières'
          );
        }
        return response.data || [];
      }),
      catchError(this.handleError)
    );
  }

  // Obtenir les matières par formation
  getMatieresByFormation(id_formation: string): Observable<string[]> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/matieres/${id_formation}`).pipe(
      timeout(this.TIMEOUT_DURATION),
      map((response) => {
        if (!response.success) {
          throw new Error(
            response.error || 'Erreur lors de la récupération des matières'
          );
        }
        return response.data || [];
      }),
      catchError(this.handleError)
    );
  }

  // Obtenir les formations disponibles
  getFormations(): Observable<Formation[]> {
    return this.http.get<ApiResponse<Formation[]>>(`${this.apiUrl}/formations`).pipe(
      timeout(this.TIMEOUT_DURATION),
      map((response) => {
        if (!response.success) {
          throw new Error(
            response.error || 'Erreur lors de la récupération des formations'
          );
        }
        return response.data || [];
      }),
      catchError(this.handleError)
    );
  }

  // Saisie multiple des présences
  bulkUpsertPresences(presences: Presence[]): Observable<Presence[]> {
    if (!presences || !Array.isArray(presences) || presences.length === 0) {
      return throwError(
        () => new Error('La liste des présences ne peut pas être vide')
      );
    }

    const bulkData = { presences };

    return this.http
      .post<ApiResponse<Presence[]>>(`${this.apiUrl}/bulk`, bulkData)
      .pipe(
        timeout(this.TIMEOUT_DURATION),
        map((response) => {
          if (!response.success) {
            throw new Error(
              response.error || 'Erreur lors de la sauvegarde des présences'
            );
          }
          return response.data || [];
        }),
        catchError(this.handleError)
      );
  }

  // Créer une présence
  createPresence(presence: Presence): Observable<Presence> {
    const requiredFields = ['id_apprenti', 'date_cours', 'heure_debut', 'heure_fin', 'matiere', 'statut', 'id_formation'];
    const missingFields = requiredFields.filter(field => !presence[field as keyof Presence]);
    
    if (missingFields.length > 0) {
      return throwError(
        () => new Error(`Champs manquants: ${missingFields.join(', ')}`)
      );
    }

    return this.http
      .post<ApiResponse<Presence>>(`${this.apiUrl}`, presence)
      .pipe(
        timeout(this.TIMEOUT_DURATION),
        map((response) => {
          if (!response.success) {
            throw new Error(
              response.error || 'Erreur lors de la création de la présence'
            );
          }
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  // Modifier une présence
  updatePresence(id: string, presence: Presence): Observable<Presence> {
    if (!id) {
      return throwError(() => new Error('ID de présence requis'));
    }

    const requiredFields = ['id_apprenti', 'date_cours', 'heure_debut', 'heure_fin', 'matiere', 'statut', 'id_formation'];
    const missingFields = requiredFields.filter(field => !presence[field as keyof Presence]);
    
    if (missingFields.length > 0) {
      return throwError(
        () => new Error(`Champs manquants: ${missingFields.join(', ')}`)
      );
    }

    return this.http
      .put<ApiResponse<Presence>>(`${this.apiUrl}/${id}`, presence)
      .pipe(
        timeout(this.TIMEOUT_DURATION),
        map((response) => {
          if (!response.success) {
            throw new Error(
              response.error || 'Erreur lors de la modification de la présence'
            );
          }
          return response.data;
        }),
        catchError(this.handleError)
      );
  }

  // Supprimer une présence
  deletePresence(id: string): Observable<{ success: boolean; message: string }> {
    if (!id) {
      return throwError(() => new Error('ID de présence requis'));
    }

    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`).pipe(
      timeout(this.TIMEOUT_DURATION),
      map((response) => {
        if (!response.success) {
          throw new Error(
            response.error || 'Erreur lors de la suppression de la présence'
          );
        }
        return {
          success: true,
          message: response.message || 'Présence supprimée avec succès',
        };
      }),
      catchError(this.handleError)
    );
  }

  // Obtenir le nom complet de l'apprenti avec numéros
  getApprentiDisplayName(apprenti: Apprenti): string {
    const nomComplet = `${apprenti.prenom} ${apprenti.nom}`;
    const numeros = [];
    
    if (apprenti.num_inscription) {
      numeros.push(`Insc: ${apprenti.num_inscription}`);
    }
    if (apprenti.num_reinscription) {
      numeros.push(`Reins: ${apprenti.num_reinscription}`);
    }
    
    return numeros.length > 0 
      ? `${nomComplet} (${numeros.join(' - ')})`
      : nomComplet;
  }

  // Formater la date pour l'affichage
  formatDate(date: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  // Formater l'heure pour l'affichage
  formatTime(time: string): string {
    if (!time) return '';
    return time.substring(0, 5); // Format HH:mm
  }

  // Obtenir les statuts disponibles
  getStatutsPresence(): string[] {
    return ['présent', 'absent', 'retard', 'excusé'];
  }

  // Vérifier si un cours est passé
  isCoursPasse(dateCours: string, heureFin?: string): boolean {
    if (!dateCours) return false;

    const now = new Date();
    const coursDate = new Date(dateCours);

    if (heureFin) {
      const [hours, minutes] = heureFin.split(':').map(Number);
      coursDate.setHours(hours, minutes);
    }

    return coursDate < now;
  }

  // Exporter les données en CSV
  exportToCSV(presences: Presence[]): string {
    const headers = [
      'Nom',
      'Prénom',
      'Date',
      'Heure Début',
      'Heure Fin',
      'Matière',
      'Statut',
      'Remarque',
      'Num Inscription',
      'Num Reinscription',
      'Formation'
    ];
    
    const csvData = presences.map((presence) => [
      presence.apprenti_nom || '',
      presence.apprenti_prenom || '',
      presence.date_cours,
      presence.heure_debut,
      presence.heure_fin,
      presence.matiere,
      presence.statut,
      presence.remarque || '',
      presence.num_inscription || '',
      presence.num_reinscription || '',
      presence.formation_nom || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((field) => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  // Télécharger le fichier CSV
  downloadCSV(csvContent: string, filename: string = 'presences') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
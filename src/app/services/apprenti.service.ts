import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface Apprenti {
  id_apprenti?: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  sexe: string;
  adresse: string;
  telephone?: string;
  email: string;
  statut: string;
  niveau_etude?: string;
  situation_professionnelle?: string;
  date_inscription?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApprentiService {
  private endpoint = 'apprentis';

  constructor(private api: ApiService) {
    console.log('🔧 ApprentiService initialisé avec endpoint:', this.endpoint);
  }

  getApprentis(): Observable<Apprenti[]> {
    console.log('🔄 Récupération des apprentis...');
    return this.api.get<Apprenti[]>(this.endpoint).pipe(
      catchError((error) => {
        console.warn('❌ API failed, using mock data', error);
        return this.getMockApprentis();
      })
    );
  }

  getApprenti(id: string): Observable<Apprenti> {
    return this.api.get<Apprenti>(`${this.endpoint}/${id}`);
  }

  createApprenti(apprenti: Apprenti): Observable<Apprenti> {
    console.log('➕ Création apprenti:', apprenti);
    return this.api.post<Apprenti>(this.endpoint, apprenti);
  }

  updateApprenti(id: string, apprenti: Apprenti): Observable<Apprenti> {
    return this.api.put<Apprenti>(`${this.endpoint}/${id}`, apprenti);
  }

  deleteApprenti(id: string): Observable<any> {
    return this.api.delete<any>(`${this.endpoint}/${id}`);
  }

  // Méthodes mock pour le développement
  private getMockApprentis(): Observable<Apprenti[]> {
    const mockApprentis: Apprenti[] = [
      {
        id_apprenti: 'APR-001',
        nom: 'Rakoto',
        prenom: 'Jean',
        date_naissance: '2000-05-15',
        sexe: 'M',
        adresse: '123 Rue Principale, Antananarivo',
        telephone: '+261 34 12 345 67',
        email: 'jean.rakoto@email.com',
        statut: 'actif',
        niveau_etude: 'Bac',
        situation_professionnelle: 'Étudiant',
        date_inscription: '2024-01-15',
      },
      {
        id_apprenti: 'APR-002',
        nom: 'Randria',
        prenom: 'Marie',
        date_naissance: '1999-08-22',
        sexe: 'F',
        adresse: '456 Avenue Secondaire, Antsirabe',
        telephone: '+261 33 12 345 67',
        email: 'marie.randria@email.com',
        statut: 'actif',
        niveau_etude: 'Bac+2',
        situation_professionnelle: "En recherche d'emploi",
        date_inscription: '2024-01-20',
      },
    ];
    return of(mockApprentis);
  }
}

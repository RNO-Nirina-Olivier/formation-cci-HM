import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { environment } from '../../environments/environment';
import { Formation } from '../models/formation';
import { Formateur } from '../models/formateur';

@Injectable({
  providedIn: 'root',
})
export class FormationService {
  private baseUrl = environment.apiUrl;
  private endpoint = 'formations';
  private formateurEndpoint = 'formateurs';

  constructor(private api: ApiService, private http: HttpClient) {}

  // === FORMATIONS ===
  getFormations(): Observable<Formation[]> {
    return this.api.get<Formation[]>(this.endpoint).pipe(
      catchError((error) => {
        console.warn(' API failed, using mock data', error);
        return this.getMockFormations();
      })
    );
  }

  getFormation(id: string): Observable<Formation> {
    return this.api.get<Formation>(`${this.endpoint}/${id}`).pipe(
      catchError((error) => {
        console.warn(' API failed, using mock data', error);
        return this.getMockFormationById(id);
      })
    );
  }

  createFormation(formation: Formation): Observable<Formation> {
    return this.api.post<Formation>(this.endpoint, formation).pipe(
      catchError((error) => {
        console.warn(' API failed, using mock creation', error);
        return this.mockCreateFormation(formation);
      })
    );
  }

  updateFormation(id: string, formation: Formation): Observable<Formation> {
    return this.api.put<Formation>(`${this.endpoint}/${id}`, formation).pipe(
      catchError((error) => {
        console.warn(' API failed, using mock update', error);
        return this.mockUpdateFormation(id, formation);
      })
    );
  }

  deleteFormation(id: string): Observable<any> {
    return this.api.delete<any>(`${this.endpoint}/${id}`).pipe(
      catchError((error) => {
        console.warn(' API failed, using mock delete', error);
        return this.mockDeleteFormation(id);
      })
    );
  }

  searchFormations(
    searchTerm: string,
    type?: string,
    metier?: string
  ): Observable<Formation[]> {
    let params = new HttpParams();
    if (searchTerm) params = params.set('search', searchTerm);
    if (type) params = params.set('type', type);
    if (metier) params = params.set('metier', metier);

    return this.http
      .get<Formation[]>(`${this.baseUrl}/${this.endpoint}/search`, { params })
      .pipe(
        catchError((error) => {
          console.warn(' API failed, using mock search', error);
          return this.mockSearchFormations(searchTerm, type, metier);
        })
      );
  }

  checkIdExists(id: string): Observable<boolean> {
    return this.api.get<boolean>(`${this.endpoint}/check/${id}`).pipe(
      catchError((error) => {
        console.warn(' API failed, using mock check', error);
        return this.mockCheckIdExists(id);
      })
    );
  }

  // === FORMATEURS ===
  getFormateurs(): Observable<Formateur[]> {
    return this.api.get<Formateur[]>(this.formateurEndpoint).pipe(
      catchError((error) => {
        console.warn(' API failed, using mock data', error);
        return this.getMockFormateurs();
      })
    );
  }

  getFormateursActifs(): Observable<Formateur[]> {
    return this.api.get<Formateur[]>(`${this.formateurEndpoint}/actifs`).pipe(
      catchError((error) => {
        console.warn('API failed, using mock data', error);
        return this.getMockFormateursActifs();
      })
    );
  }

  getFormateur(id: string): Observable<Formateur> {
    return this.api.get<Formateur>(`${this.formateurEndpoint}/${id}`).pipe(
      catchError((error) => {
        console.warn(' API failed, using mock data', error);
        return this.getMockFormateurById(id);
      })
    );
  }

  createFormateur(
    formateur: Omit<Formateur, 'id_formateur'>
  ): Observable<Formateur> {
    const formateurWithId: Formateur = {
      ...formateur,
      id_formateur: this.generateFormateurId(),
    };

    return this.api
      .post<Formateur>(this.formateurEndpoint, formateurWithId)
      .pipe(
        catchError((error) => {
          console.warn('API failed, using mock creation', error);
          return this.mockCreateFormateur(formateurWithId);
        })
      );
  }

  updateFormateur(
    id: string,
    formateur: Partial<Formateur>
  ): Observable<Formateur> {
    return this.api
      .put<Formateur>(`${this.formateurEndpoint}/${id}`, formateur)
      .pipe(
        catchError((error) => {
          console.warn(' API failed, using mock update', error);
          return this.mockUpdateFormateur(id, formateur);
        })
      );
  }

  deleteFormateur(id: string): Observable<any> {
    return this.api.delete<any>(`${this.formateurEndpoint}/${id}`).pipe(
      catchError((error) => {
        console.warn('API failed, using mock delete', error);
        return this.mockDeleteFormateur(id);
      })
    );
  }

  // Méthodes mock pour Formations
  private getMockFormations(): Observable<Formation[]> {
    const mockFormations: Formation[] = [];
    return of(mockFormations);
  }

  private getMockFormationById(id: string): Observable<Formation> {
    const mockFormations = this.getMockFormationsArray();
    const formation = mockFormations.find((f) => f.id_formation === id);
    if (formation) {
      return of(formation);
    } else {
      throw new Error(`Formation avec ID ${id} non trouvée`);
    }
  }

  private mockCreateFormation(formation: Formation): Observable<Formation> {
    return of(formation);
  }

  private mockUpdateFormation(
    id: string,
    formation: Formation
  ): Observable<Formation> {
    const updatedFormation = { ...formation, id_formation: id };
    return of(updatedFormation);
  }

  private mockDeleteFormation(id: string): Observable<any> {
    return of({ message: `Formation ${id} supprimée avec succès` });
  }

  private mockSearchFormations(
    searchTerm: string,
    type?: string,
    metier?: string
  ): Observable<Formation[]> {
    const mockFormations = this.getMockFormationsArray();
    const filtered = mockFormations.filter(
      (f) =>
        f.metier.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.type_formation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.description?.toLowerCase().includes(searchTerm.toLowerCase()) ??
          false) ||
        f.lieu_theorique.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return of(filtered);
  }

  private mockCheckIdExists(id: string): Observable<boolean> {
    const mockFormations = this.getMockFormationsArray();
    const exists = mockFormations.some((f) => f.id_formation === id);
    return of(exists);
  }

  private getMockFormationsArray(): Formation[] {
    return [];
  }

  // Méthodes mock pour Formateurs
  private getMockFormateurs(): Observable<Formateur[]> {
    return of(this.getMockFormateursArray());
  }

  private getMockFormateursActifs(): Observable<Formateur[]> {
    const mockFormateurs = this.getMockFormateursArray();
    const actifs = mockFormateurs.filter((f) => true); // Tous actifs dans le mock
    return of(actifs);
  }

  private getMockFormateurById(id: string): Observable<Formateur> {
    const mockFormateurs = this.getMockFormateursArray();
    const formateur = mockFormateurs.find((f) => f.id_formateur === id);
    if (formateur) {
      return of(formateur);
    } else {
      throw new Error(`Formateur avec ID ${id} non trouvé`);
    }
  }

  private mockCreateFormateur(formateur: Formateur): Observable<Formateur> {
    return of(formateur);
  }

  private mockUpdateFormateur(
    id: string,
    formateur: Partial<Formateur>
  ): Observable<Formateur> {
    const mockFormateurs = this.getMockFormateursArray();
    const existingFormateur = mockFormateurs.find((f) => f.id_formateur === id);

    if (!existingFormateur) {
      throw new Error(`Formateur avec ID ${id} non trouvé`);
    }

    const updatedFormateur: Formateur = {
      ...existingFormateur,
      ...formateur,
      id_formateur: id,
    };
    return of(updatedFormateur);
  }

  private mockDeleteFormateur(id: string): Observable<any> {
    return of({ message: `Formateur ${id} supprimé avec succès` });
  }

  private getMockFormateursArray(): Formateur[] {
    return [];
  }

  private generateFormateurId(): string {
    const mockFormateurs = this.getMockFormateursArray();
    const lastId =
      mockFormateurs[mockFormateurs.length - 1]?.id_formateur || 'FORM-000';
    const lastNumber = parseInt(lastId.split('-')[1]) || 0;
    return `FORM-${(lastNumber + 1).toString().padStart(3, '0')}`;
  }
}

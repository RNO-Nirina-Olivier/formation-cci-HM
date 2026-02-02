import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Matiere } from '../models/matiere';

@Injectable({
  providedIn: 'root',
})
export class MatiereService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Récupérer toutes les matières
  getMatieres(): Observable<Matiere[]> {
    return this.http.get<Matiere[]>(`${this.apiUrl}/matieres`);
  }

  // Récupérer une matière par ID
  getMatiereById(id: string): Observable<Matiere> {
    return this.http.get<Matiere>(`${this.apiUrl}/matieres/${id}`);
  }

  // Récupérer les matières d'une formation
  getMatieresByFormation(formationId: string): Observable<Matiere[]> {
    return this.http.get<Matiere[]>(
      `${this.apiUrl}/matieres/formation/${formationId}`
    );
  }

  // Rechercher des matières
  searchMatieres(searchTerm: string): Observable<Matiere[]> {
    return this.http.get<Matiere[]>(
      `${this.apiUrl}/matieres/search/${searchTerm}`
    );
  }

  // Créer une nouvelle matière
  createMatiere(matiereData: Omit<Matiere, 'id_matiere'>): Observable<Matiere> {
    console.log('📤 Création matière - Données envoyées:', matiereData);
    return this.http.post<Matiere>(`${this.apiUrl}/matieres`, matiereData);
  }

  // Mettre à jour une matière
  updateMatiere(id: string, matiere: Partial<Matiere>): Observable<Matiere> {
    console.log('📤 Mise à jour matière - ID:', id, 'Données:', matiere);
    return this.http.put<Matiere>(`${this.apiUrl}/matieres/${id}`, matiere);
  }

  // Supprimer une matière
  deleteMatiere(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/matieres/${id}`);
  }

  // Récupérer les notes d'une matière
  getNotesMatiere(matiereId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/matieres/${matiereId}/notes`);
  }

  // Récupérer les statistiques des notes d'une matière
  getStatistiquesNotes(matiereId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/matieres/${matiereId}/statistiques-notes`
    );
  }
}
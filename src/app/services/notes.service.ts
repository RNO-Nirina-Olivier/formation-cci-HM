import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface CreateNoteRequest {
  id_apprentice: string;
  id_subject: string;
  theoretical_note: number | null;
}

export interface Note extends CreateNoteRequest {
  id_note?: string;
  average: number | null;
  mention: string | null;
  creation_date?: string;
  apprentice_last_name?: string;
  apprentice_first_name?: string;
  email?: string;
  subject_name?: string;
  coefficient?: number;
  training_metier?: string;
  id_training?: string;
  subject_description?: string;
  has_note?: boolean;
  training_type?: string;
}

export interface CreatePracticalNoteRequest {
  id_apprentice: string;
  id_training: string;
  practical_note: number | null;
  type_note: string;
}

export interface PracticalNote extends CreatePracticalNoteRequest {
  id_note_pratique?: string;
  creation_date?: string;
  apprentice_last_name?: string;
  apprentice_first_name?: string;
  training_metier?: string;
  training_type?: string;
}

export interface SubjectWithNote {
  id_subject: string;
  subject_name: string;
  coefficient: number;
  description?: string;
  id_note?: string;
  theoretical_note: number | null;
  practical_note: number | null;
  average: number | null;
  mention: string | null;
  has_note: boolean;
  id_training?: string;
}

export interface Training {
  id_training: string;
  metier: string;
  type_formation: 'modulaire' | 'thematique' | 'professionnel_dual';
}

export interface Apprentice {
  id_apprentice: string;
  first_name: string;
  last_name: string;
  email: string;
  id_training: string;
  training_type?: string;
  training_metier?: string;
}

export interface FormData {
  apprentices: Apprentice[];
  subjects: any[];
  trainings: Training[];
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
export class NoteService {
  private apiUrl = `${environment.apiUrl}/notes`;
  private formDataCache: FormData | null = null;

  constructor(private http: HttpClient) {}

  // =============================================
  // METHODS FOR THEORETICAL NOTES
  // =============================================

  getNotes(): Observable<ApiResponse<Note[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/theoretical`).pipe(
      map((response) => ({
        ...response,
        data: response.data
          ? response.data.map((note) => this.mapNoteFields(note))
          : [],
      }))
    );
  }

  getNote(id: string): Observable<ApiResponse<Note>> {
    return this.http
      .get<ApiResponse<any>>(`${this.apiUrl}/theoretical/${id}`)
      .pipe(
        map((response) => {
          if (response.data) {
            return {
              ...response,
              data: this.mapNoteFields(response.data),
            };
          } else {
            return {
              success: false,
              data: this.createEmptyNote(),
              error: 'Note non trouvée',
            };
          }
        })
      );
  }

  getNotesByApprentice(id_apprentice: string): Observable<ApiResponse<Note[]>> {
    return this.http
      .get<ApiResponse<any[]>>(
        `${this.apiUrl}/theoretical/apprentice/${id_apprentice}`
      )
      .pipe(
        map((response) => ({
          ...response,
          data: response.data
            ? response.data.map((note) => this.mapNoteFields(note))
            : [],
        }))
      );
  }

  createNote(note: CreateNoteRequest): Observable<ApiResponse<Note>> {
    const frenchNote = this.mapToCreateNoteRequest(note);

    const noteWithId = {
      ...frenchNote,
      id_note: `NOTE-THEO-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    };

    return this.http
      .post<ApiResponse<any>>(`${this.apiUrl}/theoretical`, noteWithId)
      .pipe(
        map((response) => ({
          ...response,
          data: response.data
            ? this.mapNoteFields(response.data)
            : this.createEmptyNote(),
        }))
      );
  }

  updateNote(
    id: string,
    note: Partial<CreateNoteRequest>
  ): Observable<ApiResponse<Note>> {
    const frenchNote: any = {};
    if (note.id_apprentice) frenchNote.id_apprenti = note.id_apprentice;
    if (note.id_subject) frenchNote.id_matiere = note.id_subject;
    if (note.theoretical_note !== undefined)
      frenchNote.note_theorique = note.theoretical_note;

    return this.http
      .put<ApiResponse<any>>(`${this.apiUrl}/theoretical/${id}`, frenchNote)
      .pipe(
        map((response) => ({
          ...response,
          data: response.data
            ? this.mapNoteFields(response.data)
            : this.createEmptyNote(),
        }))
      );
  }

  deleteNote(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.apiUrl}/theoretical/${id}`
    );
  }

  createOrUpdateMultiple(
    notes: CreateNoteRequest[]
  ): Observable<ApiResponse<Note[]>> {
    const frenchNotes = notes.map((note) => ({
      ...this.mapToCreateNoteRequest(note),
      id_note: `NOTE-THEO-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    }));

    return this.http
      .post<ApiResponse<any[]>>(`${this.apiUrl}/theoretical/multiple`, {
        notes: frenchNotes,
      })
      .pipe(
        map((response) => ({
          ...response,
          data: response.data
            ? response.data.map((note) => this.mapNoteFields(note))
            : [],
        }))
      );
  }

  // =============================================
  // METHODS FOR PRACTICAL NOTES - CORRIGÉES
  // =============================================

  getPracticalNotes(): Observable<ApiResponse<PracticalNote[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/practical`).pipe(
      tap(response => {
        console.log('🔍 Réponse BRUTE API notes pratiques:', response);
      }),
      map((response) => {
        if (response.success && response.data) {
          const mappedNotes = response.data.map((note) => {
            const mapped = this.mapPracticalNoteFields(note);
            console.log('📝 Note pratique mappée:', mapped);
            return mapped;
          });
          
          return {
            ...response,
            data: mappedNotes
          };
        } else {
          return {
            ...response,
            data: []
          };
        }
      }),
      catchError((error) => {
        console.error('❌ Erreur HTTP notes pratiques:', error);
        return of({
          success: false,
          data: [],
          error: 'Erreur de connexion'
        });
      })
    );
  }

  getPracticalNote(id: string): Observable<ApiResponse<PracticalNote>> {
    return this.http
      .get<ApiResponse<any>>(`${this.apiUrl}/practical/${id}`)
      .pipe(
        map((response) => {
          if (response.data) {
            return {
              ...response,
              data: this.mapPracticalNoteFields(response.data),
            };
          } else {
            return {
              success: false,
              data: this.createEmptyPracticalNote(),
              error: 'Note pratique non trouvée',
            };
          }
        })
      );
  }

  createPracticalNote(
    note: CreatePracticalNoteRequest
  ): Observable<ApiResponse<PracticalNote>> {
    const frenchNote = this.mapToCreatePracticalNoteRequest(note);

    const noteWithId = {
      ...frenchNote,
      id_note_pratique: `NOTE-PRATIQUE-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    };

    console.log('🚀 Création note pratique:', noteWithId);

    return this.http
      .post<ApiResponse<any>>(`${this.apiUrl}/practical`, noteWithId)
      .pipe(
        map((response) => ({
          ...response,
          data: response.data
            ? this.mapPracticalNoteFields(response.data)
            : this.createEmptyPracticalNote(),
        }))
      );
  }

  updatePracticalNote(
    id: string,
    note: Partial<CreatePracticalNoteRequest>
  ): Observable<ApiResponse<PracticalNote>> {
    const frenchNote: any = {};
    if (note.practical_note !== undefined)
      frenchNote.note_pratique = note.practical_note;
    if (note.type_note !== undefined) frenchNote.type_note = note.type_note;

    return this.http
      .put<ApiResponse<any>>(`${this.apiUrl}/practical/${id}`, frenchNote)
      .pipe(
        map((response) => ({
          ...response,
          data: response.data
            ? this.mapPracticalNoteFields(response.data)
            : this.createEmptyPracticalNote(),
        }))
      );
  }

  deletePracticalNote(id: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/practical/${id}`);
  }

  // =============================================
  // NOUVELLES MÉTHODES
  // =============================================

  canFormationHavePracticalNotes(
    formationId: string
  ): Observable<
    ApiResponse<{ canHavePractical: boolean; type_formation: string }>
  > {
    return this.http.get<ApiResponse<any>>(
      `${this.apiUrl}/can-have-practical/${formationId}`
    );
  }

  // =============================================
  // FILTER METHODS FOR TRAINING TYPES
  // =============================================

  getApprenticesByTrainingType(
    trainingType: string
  ): Observable<ApiResponse<Apprentice[]>> {
    return this.getFormData().pipe(
      map((response) => {
        if (response.success && response.data) {
          let filteredApprentices: Apprentice[] = [];

          if (trainingType === 'all') {
            filteredApprentices = response.data.apprentices;
          } else {
            filteredApprentices = response.data.apprentices.filter(
              (apprentice: Apprentice) => {
                const training = response.data.trainings.find(
                  (t: Training) => t.id_training === apprentice.id_training
                );
                return training && training.type_formation === trainingType;
              }
            );
          }

          return {
            success: true,
            data: filteredApprentices,
          };
        }
        return { success: false, data: [], error: 'Données non disponibles' };
      })
    );
  }

  getTrainingsByType(
    trainingType: string
  ): Observable<ApiResponse<Training[]>> {
    return this.getFormData().pipe(
      map((response) => {
        if (response.success && response.data) {
          let filteredTrainings: Training[] = [];

          if (trainingType === 'all') {
            filteredTrainings = response.data.trainings;
          } else {
            filteredTrainings = response.data.trainings.filter(
              (training: Training) => training.type_formation === trainingType
            );
          }

          return {
            success: true,
            data: filteredTrainings,
          };
        }
        return { success: false, data: [], error: 'Données non disponibles' };
      })
    );
  }

  clearFormDataCache(): void {
    this.formDataCache = null;
  }

  // =============================================
  // ENRICHMENT METHODS FOR NAMES
  // =============================================

  enrichNotesWithDetails(
    notes: Note[],
    apprentices: Apprentice[],
    subjects: any[]
  ): Note[] {
    return notes.map((note) => {
      const apprentice = apprentices.find(
        (app) => app.id_apprentice === note.id_apprentice
      );

      const subject = subjects.find(
        (sub) => sub.id_subject === note.id_subject
      );

      const training = this.formDataCache?.trainings.find(
        (t) => t.id_training === apprentice?.id_training
      );

      return {
        ...note,
        apprentice_first_name:
          apprentice?.first_name || note.apprentice_first_name || 'Prénom',
        apprentice_last_name:
          apprentice?.last_name || note.apprentice_last_name || 'Nom',
        email: apprentice?.email || note.email || '',
        subject_name:
          subject?.subject_name || note.subject_name || 'Matière inconnue',
        coefficient: subject?.coefficient || note.coefficient || 1,
        training_metier:
          apprentice?.training_metier ||
          note.training_metier ||
          'Formation inconnue',
        id_training:
          apprentice?.id_training || note.id_training || 'FORM-GEN-GEN-798',
        training_type: training?.type_formation || 'modulaire',
      };
    });
  }

  enrichPracticalNotesWithDetails(
    notes: PracticalNote[],
    apprentices: Apprentice[],
    trainings: Training[]
  ): PracticalNote[] {
    return notes.map((note) => {
      const apprentice = apprentices.find(
        (app) => app.id_apprentice === note.id_apprentice
      );

      const training = trainings.find(
        (t) => t.id_training === note.id_training
      );

      return {
        ...note,
        apprentice_first_name:
          apprentice?.first_name || note.apprentice_first_name || 'Prénom',
        apprentice_last_name:
          apprentice?.last_name || note.apprentice_last_name || 'Nom',
        training_metier:
          training?.metier || note.training_metier || 'Formation inconnue',
        training_type: training?.type_formation || 'modulaire',
      };
    });
  }

  getApprenticeFullName(
    apprenticeId: string,
    apprentices: Apprentice[]
  ): string {
    const apprentice = apprentices.find(
      (app) => app.id_apprentice === apprenticeId
    );
    if (apprentice) {
      return `${apprentice.first_name || ''} ${
        apprentice.last_name || ''
      }`.trim();
    }
    return 'Apprenti inconnu';
  }

  getSubjectName(subjectId: string, subjects: any[]): string {
    const subject = subjects.find((sub) => sub.id_subject === subjectId);
    return subject?.subject_name || 'Matière inconnue';
  }

  // =============================================
  // TRAINING TYPE METHODS
  // =============================================

  canHaveTheoreticalNotes(trainingType: string): boolean {
    return true;
  }

  canHavePracticalNotes(trainingType: string): boolean {
    return trainingType === 'professionnel_dual';
  }

  getTrainingTypeLabel(type: string): string {
    switch (type) {
      case 'modulaire':
        return 'Modulaire';
      case 'thematique':
        return 'Thématique';
      case 'professionnel_dual':
        return 'Professionnel Dual';
      default:
        return type;
    }
  }

  // =============================================
  // MAPPING METHODS - CORRIGÉES
  // =============================================

  private mapNoteFields(note: any): Note {
    return {
      id_note: note.id_note,
      id_apprentice: note.id_apprenti || note.id_apprentice,
      id_subject: note.id_matiere || note.id_subject,
      theoretical_note:
        note.note_theorique !== null && note.note_theorique !== undefined
          ? Number(note.note_theorique)
          : null,
      average:
        note.moyenne !== null && note.moyenne !== undefined
          ? Number(note.moyenne)
          : null,
      mention: note.mention,
      creation_date: note.date_creation || note.creation_date,
      apprentice_last_name: note.apprenti_nom || note.apprentice_last_name,
      apprentice_first_name: note.apprenti_prenom || note.apprentice_first_name,
      email: note.email,
      subject_name: this.correctSubjectName(
        note.nom_matiere || note.subject_name
      ),
      coefficient: note.coefficient,
      training_metier: note.formation_metier || note.training_metier,
      id_training: note.id_formation || note.id_training,
      training_type: note.type_formation || note.training_type,
    };
  }

  private mapPracticalNoteFields(note: any): PracticalNote {
    console.log('🔍 Mapping note pratique:', note);
    
    // CORRECTION: S'assurer que id_training est bien récupéré
    const idTraining = note.id_formation || note.id_training;
    
    // CORRECTION: Convertir correctement la note
    let practicalNoteValue = null;
    if (note.note_pratique !== null && note.note_pratique !== undefined) {
      practicalNoteValue = Number(note.note_pratique);
      if (isNaN(practicalNoteValue)) {
        practicalNoteValue = null;
      }
    }
    
    const mappedNote: PracticalNote = {
      id_note_pratique: note.id_note_pratique,
      id_apprentice: note.id_apprenti || note.id_apprentice,
      id_training: idTraining, // CORRECTION CRITIQUE
      practical_note: practicalNoteValue,
      type_note: note.type_note || 'Stage',
      creation_date: note.date_creation,
      apprentice_last_name: note.apprenti_nom || note.apprentice_last_name,
      apprentice_first_name: note.apprenti_prenom || note.apprentice_first_name,
      training_metier: note.formation_metier || note.training_metier,
      training_type: note.type_formation || note.training_type,
    };
    
    console.log('✅ Note pratique mappée:', mappedNote);
    return mappedNote;
  }

  private mapToCreateNoteRequest(note: CreateNoteRequest): any {
    return {
      id_apprenti: note.id_apprentice,
      id_matiere: note.id_subject,
      note_theorique: note.theoretical_note,
    };
  }

  private mapToCreatePracticalNoteRequest(
    note: CreatePracticalNoteRequest
  ): any {
    return {
      id_apprenti: note.id_apprentice,
      id_formation: note.id_training, // CORRECTION: utiliser id_formation pour le backend
      note_pratique: note.practical_note,
      type_note: note.type_note,
    };
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  private correctSubjectName(subjectName: string): string {
    if (!subjectName) return 'Matière inconnue';
    if (subjectName === 'Mathgematique') return 'Mathématiques';
    if (subjectName === 'Pysique') return 'Physique';
    if (subjectName === 'Francais') return 'Français';
    if (subjectName === 'Anglais') return 'Anglais';
    if (subjectName === 'SVT') return 'SVT';
    if (subjectName === 'ML') return 'ML';
    return subjectName;
  }

  calculateEstimatedAverage(
    theoreticalNote: number | null,
    practicalNote: number | null
  ): number {
    const theoretical = theoreticalNote !== null ? theoreticalNote : undefined;
    const practical = practicalNote !== null ? practicalNote : undefined;

    if (theoretical !== undefined && practical !== undefined) {
      return (theoretical + practical) / 2;
    } else if (theoretical !== undefined) {
      return theoretical;
    } else if (practical !== undefined) {
      return practical;
    } else {
      return 0;
    }
  }

  determineMention(average: number): string {
    if (average >= 16) return 'Très Bien';
    if (average >= 14) return 'Bien';
    if (average >= 12) return 'Assez Bien';
    if (average >= 10) return 'Passable';
    return 'Insuffisant';
  }

  getNoteColor(note: number | null | undefined): string {
    if (note === null || note === undefined) return 'gray';
    if (note >= 16) return 'excellent';
    if (note >= 14) return 'good';
    if (note >= 10) return 'fair';
    return 'fail';
  }

  getMentionClass(mention: string | null): string {
    if (!mention) return 'mention-default';

    switch (mention.toLowerCase()) {
      case 'très bien':
        return 'mention-excellent';
      case 'bien':
        return 'mention-good';
      case 'assez bien':
        return 'mention-fair';
      case 'passable':
        return 'mention-passable';
      case 'insuffisant':
        return 'mention-fail';
      default:
        return 'mention-default';
    }
  }

  formatNote(note: number | null): string {
    if (note === null || note === undefined) return 'N/A';
    return `${note.toFixed(2)}/20`;
  }

  private createEmptyNote(): Note {
    return {
      id_apprentice: '',
      id_subject: '',
      theoretical_note: null,
      average: null,
      mention: null,
    };
  }

  private createEmptyPracticalNote(): PracticalNote {
    return {
      id_apprentice: '',
      id_training: '',
      practical_note: null,
      type_note: 'Stage',
    };
  }

  private getFallbackFormData(): FormData {
    return {
      apprentices: [
        {
          id_apprentice: 'APR-001',
          first_name: 'Nomenjanahary Olivier',
          last_name: 'RAZAFINIRINA',
          email: 'nirinaolivier9@gmail.com',
          id_training: 'FORM-GEN-GEN-798',
          training_type: 'modulaire',
          training_metier: 'Tourisme',
        },
        {
          id_apprentice: 'APR-002',
          first_name: 'Manantena',
          last_name: 'ZAZA',
          email: 'zaza@gmail.com',
          id_training: 'FORM-GEN-GEN-800',
          training_type: 'professionnel_dual',
          training_metier: 'Commerce',
        },
      ],
      subjects: [
        {
          id_subject: 'MAT-001',
          subject_name: 'Mathématiques',
          coefficient: 3,
          id_training: 'FORM-GEN-GEN-798',
          training_metier: 'Tourisme',
        },
        {
          id_subject: 'MAT-002',
          subject_name: 'Physique',
          coefficient: 3,
          id_training: 'FORM-GEN-GEN-798',
          training_metier: 'Tourisme',
        },
      ],
      trainings: [
        {
          id_training: 'FORM-GEN-GEN-798',
          metier: 'Tourisme',
          type_formation: 'modulaire',
        },
        {
          id_training: 'FORM-GEN-GEN-799',
          metier: 'Informatique',
          type_formation: 'thematique',
        },
        {
          id_training: 'FORM-GEN-GEN-800',
          metier: 'Commerce',
          type_formation: 'professionnel_dual',
        },
      ],
    };
  }

  getApprenticesByFormation(
    formationId: string
  ): Observable<ApiResponse<Apprentice[]>> {
    return this.http
      .get<ApiResponse<any[]>>(
        `${this.apiUrl}/formation/${formationId}/apprentis`
      )
      .pipe(
        map((response) => ({
          ...response,
          data: response.data
            ? response.data.map((apprentice) => ({
                id_apprentice: apprentice.id_apprenti || apprentice.id_apprentice,
                first_name: apprentice.prenom || apprentice.first_name || 'Prénom',
                last_name: apprentice.nom || apprentice.last_name || 'Nom',
                email: apprentice.email || '',
                id_training: apprentice.id_formation || apprentice.id_training,
                training_type: apprentice.type_formation || apprentice.training_type,
                training_metier: apprentice.metier || apprentice.training_metier,
              }))
            : [],
        }))
      );
  }

  getFormData(
    forceRefresh: boolean = false
  ): Observable<ApiResponse<FormData>> {
    if (this.formDataCache && !forceRefresh) {
      return of({ success: true, data: this.formDataCache });
    }

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/form-data`).pipe(
      map((response) => {
        if (response.success && response.data) {
          const data = response.data;

          const mappedData: FormData = {
            apprentices: (data.apprentices || []).map((apprentice: any) => ({
              id_apprentice: apprentice.id_apprentice,
              first_name: apprentice.first_name,
              last_name: apprentice.last_name,
              email: apprentice.email,
              id_training: apprentice.id_training,
              training_type: apprentice.training_type,
              training_metier: apprentice.training_metier,
            })),
            subjects: data.subjects || [],
            trainings: (data.trainings || []).map((training: any) => ({
              id_training: training.id_training,
              metier: training.metier || training.training_metier,
              type_formation: training.type_formation || training.training_type,
            })),
          };

          this.formDataCache = mappedData;
          return { ...response, data: mappedData };
        } else {
          console.error('❌ Réponse API invalide:', response);
          throw new Error('Données non disponibles');
        }
      }),
      catchError((error) => {
        console.error('❌ Error loading form data:', error);
        const fallbackData = this.getFallbackFormData();
        return of({ success: true, data: fallbackData });
      })
    );
  }

  checkPracticalNoteExists(id_apprentice: string, id_training: string): Observable<ApiResponse<{ exists: boolean; note?: PracticalNote }>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/practical/check`, {
      params: { id_apprenti: id_apprentice, id_formation: id_training }
    });
  }

  createOrUpdatePracticalNote(note: CreatePracticalNoteRequest): Observable<ApiResponse<PracticalNote>> {
    return this.checkPracticalNoteExists(note.id_apprentice, note.id_training).pipe(
      switchMap((checkResponse) => {
        if (checkResponse.success && checkResponse.data.exists && checkResponse.data.note) {
          return this.updatePracticalNote(checkResponse.data.note.id_note_pratique!, note);
        } else {
          return this.createPracticalNote(note);
        }
      })
    );
  }
}
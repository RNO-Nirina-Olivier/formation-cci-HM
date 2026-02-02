import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Interfaces for theoretical notes
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
}

// Interfaces for practical notes
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

export interface FormData {
  apprentices: any[];
  subjects: any[];
  trainings?: any[];
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
        `${this.apiUrl}/theoretical/apprenti/${id_apprentice}`
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
  // METHODS FOR PRACTICAL NOTES
  // =============================================

  getPracticalNotes(): Observable<ApiResponse<PracticalNote[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/practical`).pipe(
      map((response) => ({
        ...response,
        data: response.data
          ? response.data.map((note) => this.mapPracticalNoteFields(note))
          : [],
      }))
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
  // COMMON METHODS
  // =============================================

  getFormData(
    forceRefresh: boolean = false
  ): Observable<ApiResponse<FormData>> {
    if (this.formDataCache && !forceRefresh) {
      return of({
        success: true,
        data: this.formDataCache,
      });
    }

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/form-data`).pipe(
      map((response) => {
        if (response.success && response.data) {
          const data = response.data;

          const apprentices = this.extractArrayData(data, [
            'apprentices',
            'apprentis',
            'students',
          ]);
          const subjects = this.extractArrayData(data, [
            'subjects',
            'matieres',
            'matières',
          ]);
          const trainings = this.extractArrayData(data, [
            'trainings',
            'formations',
            'trainings',
          ]);

          const mappedApprentices = apprentices.map((app: any) =>
            this.mapApprenticeFields(app)
          );
          const mappedSubjects = subjects.map((sub: any) =>
            this.mapSubjectFields(sub)
          );

          let mappedTrainings = trainings.map((training: any) =>
            this.mapTrainingFields(training)
          );

          if (
            mappedTrainings.length === 0 ||
            this.areTrainingsEmpty(mappedTrainings)
          ) {
            const extractedTrainings =
              this.extractTrainingsFromSubjects(mappedSubjects);
            mappedTrainings = extractedTrainings;
          }

          if (mappedTrainings.length === 0) {
            mappedTrainings = this.getFallbackTrainings();
          }

          const mappedData = {
            apprentices: mappedApprentices,
            subjects: mappedSubjects,
            trainings: mappedTrainings,
          };

          this.formDataCache = mappedData;

          return {
            ...response,
            data: mappedData,
          };
        } else {
          throw new Error(
            response.error || 'Erreur inconnue lors du chargement des données'
          );
        }
      }),
      catchError((error) => {
        console.error('❌ Error loading form data:', error);
        const fallbackData = this.getFallbackFormData();
        return of({
          success: true,
          data: fallbackData,
          error: 'Using fallback data due to error: ' + error.message,
        });
      })
    );
  }

  clearFormDataCache(): void {
    this.formDataCache = null;
  }

  // =============================================
  // ENRICHMENT METHODS FOR NAMES
  // =============================================

  // Méthode pour enrichir les notes avec les données des apprentis et matières
  enrichNotesWithDetails(
    notes: Note[],
    apprentices: any[],
    subjects: any[]
  ): Note[] {
    return notes.map((note) => {
      // Trouver l'apprenti correspondant
      const apprentice = apprentices.find(
        (app) => app.id_apprentice === note.id_apprentice
      );

      // Trouver la matière correspondante
      const subject = subjects.find(
        (sub) => sub.id_subject === note.id_subject
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
      };
    });
  }

  // Méthode pour enrichir les notes pratiques avec les données des apprentis
  enrichPracticalNotesWithDetails(
    notes: PracticalNote[],
    apprentices: any[],
    trainings: any[]
  ): PracticalNote[] {
    return notes.map((note) => {
      // Trouver l'apprenti correspondant
      const apprentice = apprentices.find(
        (app) => app.id_apprentice === note.id_apprentice
      );

      // Trouver la formation correspondante
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
      };
    });
  }

  // Méthode pour obtenir le nom complet d'un apprenti
  getApprenticeFullName(apprenticeId: string, apprentices: any[]): string {
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

  // Méthode pour obtenir le nom d'une matière
  getSubjectName(subjectId: string, subjects: any[]): string {
    const subject = subjects.find((sub) => sub.id_subject === subjectId);
    return subject?.subject_name || 'Matière inconnue';
  }

  // =============================================
  // MAPPING METHODS
  // =============================================

  private mapNoteFields(note: any): Note {
    if (note.id_apprentice && note.theoretical_note !== undefined) {
      return {
        id_note: note.id_note,
        id_apprentice: note.id_apprentice,
        id_subject: note.id_subject,
        theoretical_note:
          note.theoretical_note !== null ? Number(note.theoretical_note) : null,
        average: note.average !== null ? Number(note.average) : null,
        mention: note.mention,
        creation_date: note.creation_date,
        apprentice_last_name: note.apprentice_last_name,
        apprentice_first_name: note.apprentice_first_name,
        subject_name: note.subject_name,
        coefficient: note.coefficient,
        training_metier: note.training_metier,
        id_training: note.id_training,
      };
    } else {
      return {
        id_note: note.id_note,
        id_apprentice: note.id_apprenti,
        id_subject: note.id_matiere,
        theoretical_note:
          note.note_theorique !== null && note.note_theorique !== undefined
            ? Number(note.note_theorique)
            : null,
        average:
          note.moyenne !== null && note.moyenne !== undefined
            ? Number(note.moyenne)
            : null,
        mention: note.mention,
        creation_date: note.date_creation,
        apprentice_last_name: note.apprenti_nom,
        apprentice_first_name: note.apprenti_prenom,
        subject_name: this.correctSubjectName(note.nom_matiere),
        coefficient: note.coefficient,
        training_metier: note.formation_metier,
        id_training: note.id_formation,
      };
    }
  }

  private mapPracticalNoteFields(note: any): PracticalNote {
    return {
      id_note_pratique: note.id_note_pratique,
      id_apprentice: note.id_apprenti,
      id_training: note.id_formation,
      practical_note:
        note.note_pratique !== null ? Number(note.note_pratique) : null,
      type_note: note.type_note || 'Stage',
      creation_date: note.date_creation,
      apprentice_last_name: note.apprentice_last_name || note.apprenti_nom,
      apprentice_first_name: note.apprentice_first_name || note.apprenti_prenom,
      training_metier: note.training_metier || note.formation_metier,
    };
  }

  private mapTrainingFields(training: any): any {
    if (training.id_formation && training.metier) {
      return {
        id_training: training.id_formation,
        metier: training.metier,
      };
    } else if (training.id_formation && training.formation_metier) {
      return {
        id_training: training.id_formation,
        metier: training.formation_metier,
      };
    } else if (training.id_training && training.metier) {
      return {
        id_training: training.id_training,
        metier: training.metier,
      };
    } else {
      const trainingId =
        training.id_formation ||
        training.id_training ||
        training.id ||
        `FORM-${Date.now()}`;
      const trainingName =
        training.metier ||
        training.formation_metier ||
        training.name ||
        `Formation ${trainingId}`;

      return {
        id_training: trainingId,
        metier: trainingName,
      };
    }
  }

  private mapApprenticeFields(apprentice: any): any {
    if (apprentice.id_apprenti) {
      return {
        id_apprentice: apprentice.id_apprenti,
        first_name: apprentice.prenom || apprentice.apprenti_prenom || 'Prénom',
        last_name: apprentice.nom || apprentice.apprenti_nom || 'Nom',
        email: apprentice.email || '',
        id_training: apprentice.id_formation || 'FORM-GEN-GEN-798',
      };
    } else if (apprentice.id_apprentice) {
      return {
        id_apprentice: apprentice.id_apprentice,
        first_name: apprentice.first_name || apprentice.prenom || 'Prénom',
        last_name: apprentice.last_name || apprentice.nom || 'Nom',
        email: apprentice.email || '',
        id_training:
          apprentice.id_training ||
          apprentice.id_formation ||
          'FORM-GEN-GEN-798',
      };
    } else {
      return {
        id_apprentice: apprentice.id || apprentice.ID || `APR-${Date.now()}`,
        first_name:
          apprentice.first_name ||
          apprentice.prenom ||
          apprentice.name ||
          'Inconnu',
        last_name: apprentice.last_name || apprentice.nom || 'Inconnu',
        email: apprentice.email || '',
        id_training:
          apprentice.id_training ||
          apprentice.id_formation ||
          'FORM-GEN-GEN-798',
      };
    }
  }

  private mapSubjectFields(subject: any): any {
    return {
      id_subject: subject.id_matiere || subject.id_subject,
      subject_name: this.correctSubjectName(
        subject.nom_matiere || subject.subject_name
      ),
      coefficient: subject.coefficient || 1,
      id_training: subject.id_formation || subject.id_training,
      training_metier: subject.formation_metier || subject.training_metier,
      subject_description: subject.description,
    };
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
      id_formation: note.id_training,
      note_pratique: note.practical_note,
      type_note: note.type_note,
    };
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  private extractArrayData(data: any, possibleKeys: string[]): any[] {
    for (const key of possibleKeys) {
      if (data[key] && Array.isArray(data[key])) {
        return data[key];
      }
    }
    return [];
  }

  private areTrainingsEmpty(trainings: any[]): boolean {
    return trainings.some(
      (training) =>
        !training.id_training ||
        !training.metier ||
        training.metier === 'Formation inconnue'
    );
  }

  private extractTrainingsFromSubjects(subjects: any[]): any[] {
    const trainingMap = new Map();

    subjects.forEach((subject) => {
      const trainingId = subject.id_training || subject.id_formation;
      const trainingName = subject.training_metier || subject.formation_metier;

      if (trainingId && trainingName) {
        if (!trainingMap.has(trainingId)) {
          trainingMap.set(trainingId, {
            id_training: trainingId,
            metier: trainingName,
          });
        }
      }
    });

    const extractedTrainings = Array.from(trainingMap.values());

    if (extractedTrainings.length === 0 && subjects.length > 0) {
      const defaultTraining = {
        id_training: 'FORM-DEFAULT-001',
        metier: 'Formation Générale',
      };
      extractedTrainings.push(defaultTraining);
    }

    return extractedTrainings;
  }

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

  private getFallbackTrainings(): any[] {
    return [
      {
        id_training: 'FORM-GEN-GEN-798',
        metier: 'Tourisme',
      },
      {
        id_training: 'FORM-GEN-GEN-799',
        metier: 'Informatique',
      },
      {
        id_training: 'FORM-GEN-GEN-800',
        metier: 'Commerce',
      },
    ];
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
        },
        {
          id_apprentice: 'APR-002',
          first_name: 'Manantena',
          last_name: 'ZAZA',
          email: 'zaza@gmail.com',
          id_training: 'FORM-GEN-GEN-798',
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
      trainings: this.getFallbackTrainings(),
    };
  }
}

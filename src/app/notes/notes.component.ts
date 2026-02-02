import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  NoteService,
  CreateNoteRequest,
  CreatePracticalNoteRequest,
  Note,
  PracticalNote,
  SubjectWithNote,
  FormData,
  Training,
  Apprentice,
} from '../services/notes.service';
import { Subscription, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

interface NoteGroup {
  apprenticeId: string;
  trainingId: string;
  apprenticeName: string;
  trainingName: string;
  trainingType: string;
  theoreticalNotes: Note[];
  practicalNote?: PracticalNote;
}

@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.css'],
  standalone: false,
})
export class NotesComponent implements OnInit, OnDestroy {
  practicalNoteForm: FormGroup;
  multipleNotesForm: FormGroup;
  trainingTypeFilterForm: FormGroup;
  theoreticalNoteEditForm: FormGroup;

  showTheoreticalEditForm = false;
  isEditingTheoretical = false;
  selectedNoteForEdit: Note | null = null;

  apprentices: Apprentice[] = [];
  filteredApprentices: Apprentice[] = [];
  subjects: any[] = [];
  trainings: Training[] = [];
  filteredTrainings: Training[] = [];
  theoreticalNotes: Note[] = [];
  practicalNotes: PracticalNote[] = [];
  subjectsWithNotes: SubjectWithNote[] = [];
  groupedNotes: NoteGroup[] = [];

  selectedApprentice: Apprentice | null = null;
  selectedTraining: Training | null = null;

  searchTerm = '';
  filterTraining = '';
  filterApprentice = '';
  filterSubject = '';
  selectedTrainingType = 'all';

  isLoading = false;
  isSubmitting = false;
  isEditing = false;

  showPracticalForm = false;
  showMultipleNotesSelection = false;
  showMultipleNotesForm = false;
  showDeleteConfirm = false;
  showSuccessDialog = false;
  showErrorDialog = false;

  dialogMessage = '';
  itemToDelete: any = null;
  deleteType: 'theoretical' | 'practical' | null = null;

  private subscriptions = new Subscription();

  constructor(private noteService: NoteService, private fb: FormBuilder) {
    this.practicalNoteForm = this.createPracticalNoteForm();
    this.multipleNotesForm = this.createMultipleNotesForm();
    this.trainingTypeFilterForm = this.createTrainingTypeFilterForm();
    this.theoreticalNoteEditForm = this.createTheoreticalNoteEditForm();
  }

  ngOnInit(): void {
    this.loadAllData();
    this.setupTrainingTypeFilter();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private createPracticalNoteForm(): FormGroup {
    return this.fb.group({
      training_type: ['', Validators.required],
      id_training: ['', Validators.required],
      id_apprentice: ['', Validators.required],
      practical_note: [
        null,
        [Validators.required, Validators.min(0), Validators.max(20)],
      ],
      type_note: ['Stage', Validators.required],
    });
  }

  private createMultipleNotesForm(): FormGroup {
    return this.fb.group({
      training_type: ['', Validators.required],
      id_training: ['', Validators.required],
      id_apprentice: ['', Validators.required],
    });
  }

  private createTrainingTypeFilterForm(): FormGroup {
    return this.fb.group({
      training_type: ['all'],
    });
  }

  private createTheoreticalNoteEditForm(): FormGroup {
    return this.fb.group({
      theoretical_note: [
        null,
        [Validators.required, Validators.min(0), Validators.max(20)],
      ],
    });
  }

  // =============================================
  // MÉTHODES DE DEBUG
  // =============================================

  testDataIntegrity(): void {
    console.log('🔧 TEST INTÉGRITÉ DONNÉES');
    
    console.log('👥 APPRENTIS:', this.apprentices.length);
    this.apprentices.forEach((app, i) => {
      console.log(`Apprenti ${i + 1}:`, {
        id: app.id_apprentice,
        nom: app.first_name + ' ' + app.last_name,
        formation: app.id_training,
        type: app.training_type
      });
    });
    
    console.log('📚 FORMATIONS:', this.trainings.length);
    this.trainings.forEach((train, i) => {
      console.log(`Formation ${i + 1}:`, {
        id: train.id_training,
        métier: train.metier,
        type: train.type_formation
      });
    });
    
    console.log('🎯 NOTES PRATIQUES:', this.practicalNotes.length);
    this.practicalNotes.forEach((note, i) => {
      console.log(`Note pratique ${i + 1}:`, {
        id: note.id_note_pratique,
        apprenti: note.id_apprentice,
        formation: note.id_training,
        note: note.practical_note,
        type: note.type_note,
        nomApprenti: note.apprentice_first_name + ' ' + note.apprentice_last_name
      });
    });
    
    console.log('🔗 CORRESPONDANCES:');
    this.practicalNotes.forEach(note => {
      const apprenti = this.apprentices.find(a => a.id_apprentice === note.id_apprentice);
      const formation = this.trainings.find(t => t.id_training === note.id_training);
      
      console.log(`Note ${note.id_note_pratique}:`, {
        apprentiTrouve: !!apprenti,
        formationTrouvee: !!formation,
        apprenti: apprenti ? apprenti.first_name + ' ' + apprenti.last_name : 'NON TROUVÉ',
        formation: formation ? formation.metier : 'NON TROUVÉ'
      });
    });
  }

  getApprenticeDisplayName(apprenticeId: string): string {
    if (!apprenticeId) return '';
    
    const apprentice = this.apprentices.find(a => a.id_apprentice === apprenticeId);
    if (!apprentice) return '';

    return `${apprentice.first_name} ${apprentice.last_name}`;
  }

  getTrainingDisplayName(trainingId: string): string {
    if (!trainingId) return '';
    
    const training = this.trainings.find(t => t.id_training === trainingId);
    if (!training) return '';

    return `${training.metier} (${this.getTrainingTypeLabel(training.type_formation)})`;
  }

  // =============================================
  // FILTRES PAR TYPE DE FORMATION
  // =============================================

  private setupTrainingTypeFilter(): void {
    this.subscriptions.add(
      this.trainingTypeFilterForm
        .get('training_type')
        ?.valueChanges.subscribe((trainingType: string) => {
          this.selectedTrainingType = trainingType;
          this.applyTrainingTypeFilter();
        })
    );
  }

  private applyTrainingTypeFilter(): void {
    if (this.selectedTrainingType === 'all') {
      this.filteredApprentices = this.apprentices;
      this.filteredTrainings = this.trainings;
    } else {
      this.filteredTrainings = this.trainings.filter(
        (training) => training.type_formation === this.selectedTrainingType
      );

      this.filteredApprentices = this.apprentices.filter((apprentice) => {
        const training = this.trainings.find(
          (t) => t.id_training === apprentice.id_training
        );
        return (
          training && training.type_formation === this.selectedTrainingType
        );
      });
    }

    this.applyFilters();
  }

  // =============================================
  // DATA LOADING METHODS
  // =============================================

  loadAllData(): void {
    this.isLoading = true;
    
    console.log('🔄 Début du chargement des données...');

    this.subscriptions.add(
      this.noteService.getFormData(true).subscribe({
        next: (response) => {
          console.log('📦 Réponse API reçue:', {
            success: response.success,
            hasData: !!response.data,
            apprenticesCount: response.data?.apprentices?.length || 0,
            trainingsCount: response.data?.trainings?.length || 0,
            subjectsCount: response.data?.subjects?.length || 0
          });

          if (response.success && response.data) {
            this.apprentices = response.data.apprentices || [];
            this.subjects = response.data.subjects || [];
            this.trainings = response.data.trainings || [];

            console.log('📊 Données chargées:');
            console.log('- Apprentis:', this.apprentices.length);
            console.log('- Formations:', this.trainings.length);
            console.log('- Matières:', this.subjects.length);

            this.filteredApprentices = [...this.apprentices];
            this.filteredTrainings = [...this.trainings];

            this.loadAllNotes();
          } else {
            console.error('❌ Réponse API non réussie:', response);
            this.showError('Erreur lors du chargement des données: ' + (response.error || 'Erreur inconnue'));
            this.isLoading = false;
          }
        },
        error: (error) => {
          console.error('❌ Erreur de chargement des données:', error);
          this.showError('Erreur de connexion lors du chargement des données');
          this.isLoading = false;
        },
      })
    );
  }

  loadAllNotes(): void {
    this.subscriptions.add(
      this.noteService.getNotes().subscribe({
        next: (notesResponse) => {
          if (notesResponse.success) {
            this.theoreticalNotes = this.noteService.enrichNotesWithDetails(
              notesResponse.data || [],
              this.apprentices,
              this.subjects
            );
            this.loadAllPracticalNotes();
          } else {
            this.showError('Erreur lors du chargement des notes théoriques');
            this.isLoading = false;
          }
        },
        error: (error) => {
          console.error('❌ Error loading all notes:', error);
          this.theoreticalNotes = [];
          this.loadAllPracticalNotes();
        },
      })
    );
  }

  loadAllPracticalNotes(): void {
    this.subscriptions.add(
      this.noteService.getPracticalNotes().subscribe({
        next: (response) => {
          console.log('🔍 Réponse notes pratiques:', response);
          
          if (response.success) {
            this.practicalNotes = this.noteService.enrichPracticalNotesWithDetails(
              response.data || [],
              this.apprentices,
              this.trainings
            );
            
            console.log('✅ Notes pratiques enrichies:', this.practicalNotes);
            
            // Vérifier les données
            this.practicalNotes.forEach((note, index) => {
              console.log(`Note pratique ${index + 1}:`, {
                id: note.id_note_pratique,
                apprenti: note.id_apprentice,
                formation: note.id_training,
                note: note.practical_note,
                type: note.type_note,
                nomApprenti: note.apprentice_first_name + ' ' + note.apprentice_last_name
              });
            });
          } else {
            console.error('❌ Erreur chargement notes pratiques:', response.error);
            this.practicalNotes = [];
          }
        },
        error: (error) => {
          console.error('❌ Error loading all practical notes:', error);
          this.practicalNotes = [];
        },
        complete: () => {
          this.groupNotes();
          this.isLoading = false;
        },
      })
    );
  }

  // =============================================
  // GESTION DES CHANGEMENTS
  // =============================================

  onTrainingChange(form: FormGroup): void {
    const trainingId = form.get('id_training')?.value;
    const idApprenticeControl = form.get('id_apprentice');

    console.log('🎯 Training changed to:', trainingId);

    if (idApprenticeControl) {
      idApprenticeControl.setValue('', { emitEvent: false });
    }

    if (trainingId) {
      this.filteredApprentices = this.apprentices.filter(
        (a) => a.id_training === trainingId
      );
      
      console.log(
        '🔍 Filtered apprentices for training',
        trainingId + ':',
        this.filteredApprentices.length,
        'found'
      );

      if (this.filteredApprentices.length === 0) {
        console.warn('⚠️ No apprentices found for training:', trainingId);
      }
    } else {
      const trainingType = form.get('training_type')?.value;
      if (trainingType && trainingType !== 'all') {
        this.filteredApprentices = this.apprentices.filter(
          (apprentice) => apprentice.training_type === trainingType
        );
      } else {
        this.filteredApprentices = [...this.apprentices];
      }
    }

    if (trainingId) {
      const selectedTraining = this.trainings.find(t => t.id_training === trainingId);
      if (selectedTraining) {
        form.patchValue({
          training_type: selectedTraining.type_formation
        }, { emitEvent: false });
      }
    }
  }

  onTrainingTypeChange(form: FormGroup): void {
    const trainingType = form.get('training_type')?.value;
    console.log('🎯 Training type changed to:', trainingType);

    const idTrainingControl = form.get('id_training');
    const idApprenticeControl = form.get('id_apprentice');

    if (idTrainingControl) {
      idTrainingControl.setValue('', { emitEvent: false });
    }
    if (idApprenticeControl) {
      idApprenticeControl.setValue('', { emitEvent: false });
    }

    if (trainingType && trainingType !== 'all') {
      this.filteredTrainings = this.trainings.filter(
        (t) => t.type_formation === trainingType
      );
      this.filteredApprentices = this.apprentices.filter(
        (apprentice) => apprentice.training_type === trainingType
      );
    } else {
      this.filteredTrainings = [...this.trainings];
      this.filteredApprentices = [...this.apprentices];
    }
  }

  // =============================================
  // NOTE GROUPING AND FILTERING - CORRIGÉ
  // =============================================

  groupNotes(): void {
    console.log('🔄 Début du groupement des notes...');
    console.log('📊 Données disponibles:', {
      apprentices: this.apprentices.length,
      theoreticalNotes: this.theoreticalNotes.length,
      practicalNotes: this.practicalNotes.length
    });

    // 1. Créer un Map pour stocker les groupes
    const groupsMap = new Map<string, NoteGroup>();

    // 2. Créer les groupes depuis les apprentis
    this.apprentices.forEach((apprentice) => {
      if (!apprentice.id_training) {
        console.warn(`❌ Apprenti sans formation:`, apprentice);
        return;
      }
      
      const key = `${apprentice.id_apprentice}-${apprentice.id_training}`;
      
      // Ne créer qu'une seule fois par apprenti-formation
      if (!groupsMap.has(key)) {
        const training = this.trainings.find(t => t.id_training === apprentice.id_training);
        
        groupsMap.set(key, {
          apprenticeId: apprentice.id_apprentice,
          trainingId: apprentice.id_training,
          apprenticeName: this.getApprenticeFullName(apprentice),
          trainingName: training?.metier || 'Formation inconnue',
          trainingType: training?.type_formation || 'modulaire',
          theoreticalNotes: [],
          practicalNote: undefined,
        });
      }
    });

    // 3. Ajouter les notes théoriques aux groupes existants
    this.theoreticalNotes.forEach((note) => {
      // Trouver l'apprenti pour cette note
      const apprentice = this.apprentices.find(a => a.id_apprentice === note.id_apprentice);
      if (!apprentice || !apprentice.id_training) return;
      
      const key = `${apprentice.id_apprentice}-${apprentice.id_training}`;
      
      if (groupsMap.has(key)) {
        const enrichedNote = this.enrichNoteWithSubjectInfo(note);
        groupsMap.get(key)!.theoreticalNotes.push(enrichedNote);
      }
    });

    // 4. CORRECTION CRITIQUE : Assigner les notes pratiques
    this.practicalNotes.forEach((practicalNote) => {
      // CORRECTION: Si id_training est undefined, chercher via l'apprenti
      let trainingId = practicalNote.id_training;
      if (!trainingId) {
        const apprentice = this.apprentices.find(a => a.id_apprentice === practicalNote.id_apprentice);
        if (apprentice && apprentice.id_training) {
          trainingId = apprentice.id_training;
          console.log(`✅ Formation déduite pour ${practicalNote.id_apprentice}:`, trainingId);
        } else {
          console.error(`❌ Impossible de trouver formation pour note pratique`, practicalNote);
          return;
        }
      }
      
      const key = `${practicalNote.id_apprentice}-${trainingId}`;
      
      if (groupsMap.has(key)) {
        console.log(`✅ Note pratique assignée à`, key);
        groupsMap.get(key)!.practicalNote = practicalNote;
      } else {
        console.warn(`❌ Groupe non trouvé pour note pratique:`, key);
        
        // Créer le groupe manquant
        const apprentice = this.apprentices.find(a => a.id_apprentice === practicalNote.id_apprentice);
        const training = this.trainings.find(t => t.id_training === trainingId);
        
        if (apprentice && training) {
          const newGroup: NoteGroup = {
            apprenticeId: practicalNote.id_apprentice,
            trainingId: trainingId,
            apprenticeName: this.getApprenticeFullName(apprentice),
            trainingName: training.metier,
            trainingType: training.type_formation,
            theoreticalNotes: [],
            practicalNote: practicalNote,
          };
          
          groupsMap.set(key, newGroup);
          console.log(`✅ Nouveau groupe créé pour note pratique:`, newGroup);
        }
      }
    });

    // 5. Convertir en tableau
    this.groupedNotes = Array.from(groupsMap.values());
    
    // Debug
    console.log('📋 GROUPES FINAUX:', this.groupedNotes.length);
    this.groupedNotes.forEach((group, index) => {
      console.log(`Groupe ${index + 1}:`, {
        apprenti: group.apprenticeName,
        formation: group.trainingName,
        type: group.trainingType,
        aNotePratique: !!group.practicalNote,
        notePratiqueValeur: group.practicalNote?.practical_note,
        nbNotesTheoriques: group.theoreticalNotes.length
      });
    });

    this.applyFilters();
  }

  private enrichNoteWithSubjectInfo(note: Note): Note {
    const subject = this.subjects.find(
      (sub) => sub.id_subject === note.id_subject
    );

    if (subject) {
      return {
        ...note,
        subject_name: subject.subject_name || note.subject_name,
        coefficient: subject.coefficient || note.coefficient,
        subject_description: subject.description || note.subject_description,
      };
    }

    return note;
  }

  private getDefaultTrainingId(): string {
    return this.trainings.length > 0
      ? this.trainings[0].id_training
      : 'FORM-GEN-GEN-798';
  }

  getApprenticeFullName(apprentice: Apprentice): string {
    return (
      `${apprentice.first_name || ''} ${apprentice.last_name || ''}`.trim() ||
      'Apprenti inconnu'
    );
  }

  applyFilters(): void {
    let filteredGroups = [...this.groupedNotes];

    if (this.selectedTrainingType !== 'all') {
      filteredGroups = filteredGroups.filter(
        (group) => group.trainingType === this.selectedTrainingType
      );
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filteredGroups = filteredGroups.filter(
        (group) =>
          group.apprenticeName.toLowerCase().includes(term) ||
          group.trainingName.toLowerCase().includes(term) ||
          group.theoreticalNotes.some((note) =>
            note.subject_name?.toLowerCase().includes(term)
          )
      );
    }

    if (this.filterTraining) {
      filteredGroups = filteredGroups.filter(
        (group) => group.trainingId === this.filterTraining
      );
    }

    if (this.filterApprentice) {
      filteredGroups = filteredGroups.filter(
        (group) => group.apprenticeId === this.filterApprentice
      );
    }

    if (this.filterSubject) {
      filteredGroups = filteredGroups.filter((group) =>
        group.theoreticalNotes.some(
          (note) => note.id_subject === this.filterSubject
        )
      );
    }

    this.groupedNotes = filteredGroups;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterTraining = '';
    this.filterApprentice = '';
    this.filterSubject = '';
    this.selectedTrainingType = 'all';
    this.trainingTypeFilterForm.patchValue({ training_type: 'all' });
    this.groupNotes();
  }

  // =============================================
  // UI HELPER METHODS
  // =============================================

  getPracticalNoteColspan(group: NoteGroup): number {
    return this.hasPracticalNote(group) ? 5 : 9;
  }

  getNoteColor(note: number | null | undefined): string {
    if (note === null || note === undefined) return 'note-gray';
    if (note >= 16) return 'note-excellent';
    if (note >= 14) return 'note-good';
    if (note >= 10) return 'note-fair';
    return 'note-fail';
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

  getMention(note: number | null | undefined): string {
    if (note === null || note === undefined) return 'Non évalué';
    if (note >= 16) return 'Très Bien';
    if (note >= 14) return 'Bien';
    if (note >= 12) return 'Assez Bien';
    if (note >= 10) return 'Passable';
    return 'Insuffisant';
  }

  getPracticalNoteMention(group: NoteGroup): string {
    const note = group.practicalNote?.practical_note;
    return this.getMention(note);
  }

  getPracticalNoteMentionClass(group: NoteGroup): string {
    const note = group.practicalNote?.practical_note;
    const mention = this.getMention(note);
    return this.getMentionClass(mention);
  }

  getNoteType(note: Note): string {
    return 'Théorique';
  }

  getNoteTypeClass(note: Note): string {
    return 'type-theoretical';
  }

  getNoteSubjectName(note: Note): string {
    return (
      note.subject_name ||
      this.noteService.getSubjectName(note.id_subject, this.subjects)
    );
  }

  getNoteApprenticeName(note: Note): string {
    if (note.apprentice_first_name && note.apprentice_last_name) {
      return `${note.apprentice_first_name} ${note.apprentice_last_name}`;
    }
    return this.noteService.getApprenticeFullName(
      note.id_apprentice,
      this.apprentices
    );
  }

  getNoteApprenticeInitials(note: Note): string {
    const fullName = this.getNoteApprenticeName(note);
    const names = fullName.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }

  getApprenticeInitials(apprentice: Apprentice): string {
    const fullName = this.getApprenticeFullName(apprentice);
    const names = fullName.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }

  canHaveTheoreticalNotes(trainingType: string): boolean {
    return this.noteService.canHaveTheoreticalNotes(trainingType);
  }

  canHavePracticalNotes(trainingType: string): boolean {
    return this.noteService.canHavePracticalNotes(trainingType);
  }

  shouldShowTheoreticalSection(group: NoteGroup): boolean {
    return this.canHaveTheoreticalNotes(group.trainingType);
  }

  shouldShowPracticalSection(group: NoteGroup): boolean {
    return this.canHavePracticalNotes(group.trainingType);
  }

  getAvailableTrainingTypes(): any[] {
    return [
      { value: 'all', label: 'Tous les types' },
      { value: 'modulaire', label: 'Modulaire' },
      { value: 'thematique', label: 'Thématique' },
      { value: 'professionnel_dual', label: 'Professionnel Dual' },
    ];
  }

  getTrainingTypeLabel(type: string): string {
    return this.noteService.getTrainingTypeLabel(type);
  }

  showTheoreticalNotesForGroup(group: NoteGroup): boolean {
    return (
      this.shouldShowTheoreticalSection(group) &&
      (group.theoreticalNotes.length > 0 ||
        this.selectedTrainingType === 'all' ||
        this.selectedTrainingType === group.trainingType)
    );
  }

  showPracticalNoteForGroup(group: NoteGroup): boolean {
    // CORRECTION: Afficher si le groupe a une note pratique ET si c'est le bon type
    const hasPractical = this.hasPracticalNote(group);
    const shouldShow = this.shouldShowPracticalSection(group);
    
    console.log(`🔍 ${group.apprenticeName} - Afficher note pratique?`, {
      hasPractical,
      shouldShow,
      trainingType: group.trainingType,
      practicalNote: group.practicalNote
    });
    
    return hasPractical && shouldShow;
  }

  hasPracticalNote(group: NoteGroup): boolean {
    if (!group.practicalNote) {
      console.log(`❌ ${group.apprenticeName} - Pas d'objet practicalNote`);
      return false;
    }
    
    // CORRECTION: Vérifier que la note n'est pas null/undefined
    const hasNote = group.practicalNote.practical_note !== null && 
                    group.practicalNote.practical_note !== undefined;
    
    console.log(`🔍 ${group.apprenticeName} - Détection note pratique:`, {
      objetPratique: group.practicalNote,
      valeurNote: group.practicalNote.practical_note,
      aNote: hasNote
    });
    
    return hasNote;
  }

  getTrainingNameFromApprentice(apprentice: Apprentice): string {
    if (!apprentice || !apprentice.id_training) {
      return 'Formation inconnue';
    }
    
    const training = this.trainings.find(t => t.id_training === apprentice.id_training);
    
    if (!training) {
      return 'Formation non trouvée';
    }
    
    return training.metier || 'Formation inconnue';
  }

  // =============================================
  // MODAL MANAGEMENT METHODS
  // =============================================

  getSelectedTrainingType(): string {
    const trainingId = this.practicalNoteForm.get('id_training')?.value;
    if (!trainingId) return '';

    const training = this.trainings.find((t) => t.id_training === trainingId);
    return training?.type_formation || '';
  }

  closeMultipleNotesForm(): void {
    this.showMultipleNotesForm = false;
    this.selectedApprentice = null;
    this.selectedTraining = null;
    this.subjectsWithNotes = [];
  }

  // =============================================
  // FORM SUBMISSION METHODS - CORRIGÉ
  // =============================================

  onPracticalNoteSubmit(): void {
    if (this.practicalNoteForm.invalid) {
      console.error('❌ Formulaire invalide:', this.practicalNoteForm.value);
      this.markFormGroupTouched(this.practicalNoteForm);
      return;
    }

    this.isSubmitting = true;
    const formValue = this.practicalNoteForm.value;

    console.log('🔍 Données du formulaire:', formValue);

    const practicalNoteData: CreatePracticalNoteRequest = {
      id_apprentice: formValue.id_apprentice,
      id_training: formValue.id_training, // VERIFIER QUE C'EST BIEN RÉCUPÉRÉ
      practical_note: formValue.practical_note,
      type_note: formValue.type_note,
    };

    console.log('🚀 Données envoyées à l\'API:', practicalNoteData);

    const request = this.noteService.createOrUpdatePracticalNote(practicalNoteData);

    this.subscriptions.add(
      request
        .pipe(
          finalize(() => {
            this.isSubmitting = false;
          })
        )
        .subscribe({
          next: (response) => {
            if (response.success) {
              const action = this.isEditing ? 'modifiée' : 'créée';
              this.showSuccess(`Note pratique ${action} avec succès!`);
              this.closePracticalNoteForm();
              this.loadAllData();
            } else {
              this.showError('Erreur: ' + (response.error || 'Erreur inconnue'));
            }
          },
          error: (error) => {
            console.error('❌ Error submitting practical note:', error);
            
            if (error.status === 400 && error.error?.error?.includes('dupliquée')) {
              this.showError('Cet apprenti a déjà une note pratique pour cette formation.');
            } else {
              this.showError("Erreur de connexion lors de l'enregistrement");
            }
          },
        })
    );
  }

  onMultipleNotesSubmit(): void {
    if (this.multipleNotesForm.invalid) {
      this.markFormGroupTouched(this.multipleNotesForm);
      return;
    }

    const formValue = this.multipleNotesForm.value;

    const foundTraining = this.trainings.find(
      (t) => t.id_training === formValue.id_training
    );
    const foundApprentice = this.apprentices.find(
      (a) => a.id_apprentice === formValue.id_apprentice
    );

    if (!foundTraining || !foundApprentice) {
      this.showError('Formation ou apprenti non trouvé');
      return;
    }

    this.selectedTraining = foundTraining;
    this.selectedApprentice = foundApprentice;

    this.loadSubjectsWithNotesClient();
  }

  loadSubjectsWithNotesClient(): void {
    if (!this.selectedTraining || !this.selectedApprentice) {
      this.showError('Formation ou apprenti non sélectionné');
      return;
    }

    const selectedTrainingId = this.selectedTraining.id_training;
    const selectedApprenticeId = this.selectedApprentice.id_apprentice;

    const subjectsForTraining = this.subjects.filter(
      (subject) =>
        subject.id_training === selectedTrainingId ||
        subject.id_formation === selectedTrainingId
    );

    const apprenticeTheoreticalNotes = this.theoreticalNotes.filter(
      (note) => note.id_apprentice === selectedApprenticeId
    );

    const apprenticePracticalNotes = this.practicalNotes.filter(
      (note) =>
        note.id_apprentice === selectedApprenticeId &&
        note.id_training === selectedTrainingId
    );

    this.subjectsWithNotes = subjectsForTraining.map((subject) => {
      const existingNote = apprenticeTheoreticalNotes.find(
        (note) => note.id_subject === subject.id_subject
      );

      const practicalNote = apprenticePracticalNotes.find(
        (note) => note.id_training === selectedTrainingId
      );

      const theoreticalNote = existingNote?.theoretical_note || null;
      const practicalNoteValue = practicalNote?.practical_note || null;
      const average = this.noteService.calculateEstimatedAverage(
        theoreticalNote,
        practicalNoteValue
      );
      const mention = this.noteService.determineMention(average);

      return {
        id_subject: subject.id_subject,
        subject_name: subject.subject_name,
        coefficient: subject.coefficient || 1,
        description: subject.description,
        id_note: existingNote?.id_note,
        theoretical_note: theoreticalNote,
        practical_note: practicalNoteValue,
        average: average,
        mention: mention,
        has_note: theoreticalNote !== null,
        id_training: selectedTrainingId,
      };
    });

    this.showMultipleNotesSelection = false;
    this.showMultipleNotesForm = true;
  }

  // =============================================
  // NOTE MANAGEMENT METHODS
  // =============================================

  editPracticalNote(group: NoteGroup): void {
    if (!group.practicalNote) return;

    this.isEditing = true;
    this.itemToDelete = group.practicalNote;

    console.log('✏️ Editing practical note:', group.practicalNote);

    this.practicalNoteForm.patchValue({
      training_type: group.trainingType,
      id_apprentice: group.practicalNote.id_apprentice,
      id_training: group.practicalNote.id_training,
      practical_note: group.practicalNote.practical_note,
      type_note: group.practicalNote.type_note || 'Stage'
    }, { emitEvent: false });

    this.filteredTrainings = this.trainings.filter(
      t => t.type_formation === group.trainingType
    );
    this.filteredApprentices = this.apprentices.filter(
      a => a.id_training === group.practicalNote?.id_training
    );

    this.showPracticalForm = true;
  }

  deletePracticalNote(group: NoteGroup): void {
    if (!group.practicalNote?.id_note_pratique) return;

    this.itemToDelete = group.practicalNote;
    this.deleteType = 'practical';
    this.dialogMessage = `Êtes-vous sûr de vouloir supprimer la note pratique de ${group.apprenticeName} ?`;
    this.showDeleteConfirm = true;
  }

  deleteNote(noteId: string): void {
    const note = this.theoreticalNotes.find((n) => n.id_note === noteId);
    if (!note) return;

    this.itemToDelete = note;
    this.deleteType = 'theoretical';
    this.dialogMessage = `Êtes-vous sûr de vouloir supprimer la note théorique de ${this.getNoteApprenticeName(
      note
    )} en ${this.getNoteSubjectName(note)} ?`;
    this.showDeleteConfirm = true;
  }

  confirmDelete(): void {
    if (!this.itemToDelete || !this.deleteType) return;

    const request =
      this.deleteType === 'theoretical'
        ? this.noteService.deleteNote(this.itemToDelete.id_note!)
        : this.noteService.deletePracticalNote(
            this.itemToDelete.id_note_pratique!
          );

    this.subscriptions.add(
      request.subscribe({
        next: (response) => {
          if (response.success) {
            this.showSuccess('Note supprimée avec succès!');
            this.loadAllData();
          } else {
            this.showError('Erreur lors de la suppression: ' + response.error);
          }
        },
        error: (error) => {
          console.error('❌ Error deleting note:', error);
          this.showError('Erreur de connexion lors de la suppression');
        },
        complete: () => {
          this.cancelDelete();
        },
      })
    );
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.itemToDelete = null;
    this.deleteType = null;
    this.dialogMessage = '';
  }

  // =============================================
  // MULTIPLE NOTES METHODS
  // =============================================

  updateSubjectNote(index: number, event: any): void {
    const value = event.target.value;
    this.subjectsWithNotes[index].theoretical_note = value
      ? Number(value)
      : null;
  }

  calculateSubjectAverage(theoreticalNote: number | null): number {
    return theoreticalNote !== null ? theoreticalNote : 0;
  }

  calculateEstimatedOverallAverage(): number {
    const notesWithCoefficient = this.subjectsWithNotes.filter(
      (subject) =>
        subject.theoretical_note !== null &&
        subject.theoretical_note !== undefined
    );

    if (notesWithCoefficient.length === 0) return 0;

    const total = notesWithCoefficient.reduce((sum, subject) => {
      return sum + subject.theoretical_note! * subject.coefficient;
    }, 0);

    const totalCoefficient = notesWithCoefficient.reduce((sum, subject) => {
      return sum + subject.coefficient;
    }, 0);

    return totalCoefficient > 0 ? total / totalCoefficient : 0;
  }

  canSaveMultipleNotes(): boolean {
    return this.subjectsWithNotes.some(
      (subject) =>
        subject.theoretical_note !== null &&
        subject.theoretical_note !== undefined
    );
  }

  saveMultipleNotes(): void {
    if (!this.selectedApprentice || !this.selectedTraining) {
      this.showError('Apprenti ou formation non sélectionné');
      return;
    }

    const selectedApprenticeId = this.selectedApprentice.id_apprentice;

    const notesToSave: CreateNoteRequest[] = this.subjectsWithNotes
      .filter(
        (subject) =>
          subject.theoretical_note !== null &&
          subject.theoretical_note !== undefined
      )
      .map((subject) => ({
        id_apprentice: selectedApprenticeId,
        id_subject: subject.id_subject,
        theoretical_note: subject.theoretical_note,
      }));

    if (notesToSave.length === 0) {
      this.showError('Aucune note à enregistrer');
      return;
    }

    this.isSubmitting = true;
    this.subscriptions.add(
      this.noteService
        .createOrUpdateMultiple(notesToSave)
        .pipe(
          finalize(() => {
            this.isSubmitting = false;
          })
        )
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.showSuccess(
                `${notesToSave.length} note(s) théorique(s) enregistrée(s) avec succès!`
              );
              this.closeMultipleNotesForm();
              this.loadAllData();
            } else {
              this.showError(
                "Erreur lors de l'enregistrement des notes: " + response.error
              );
            }
          },
          error: (error) => {
            console.error('❌ Error saving multiple notes:', error);
            this.showError("Erreur de connexion lors de l'enregistrement");
          },
        })
    );
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) return 'Ce champ est requis';
    if (field.errors['min'])
      return `La valeur minimale est ${field.errors['min'].min}`;
    if (field.errors['max'])
      return `La valeur maximale est ${field.errors['max'].max}`;

    return 'Erreur de validation';
  }

  private showSuccess(message: string): void {
    this.dialogMessage = message;
    this.showSuccessDialog = true;
  }

  private showError(message: string): void {
    this.dialogMessage = message;
    this.showErrorDialog = true;
  }

  closeDialog(): void {
    this.showSuccessDialog = false;
    this.showErrorDialog = false;
    this.dialogMessage = '';
  }

  getApprenticeName(apprentice: Apprentice): string {
    return `${apprentice.first_name} ${apprentice.last_name}`;
  }

  getTrainingName(training: Training): string {
    return training.metier || 'Formation inconnue';
  }

  getSubjectName(subject: any): string {
    return subject.subject_name || 'Matière inconnue';
  }

  // =============================================
  // OUVERTURE DES MODALS
  // =============================================

  openPracticalNoteForm(): void {
    this.isEditing = false;
    this.itemToDelete = null;
    
    this.practicalNoteForm.reset({
      training_type: '',
      id_training: '',
      id_apprentice: '',
      practical_note: null,
      type_note: 'Stage'
    });

    this.filteredTrainings = [...this.trainings];
    this.filteredApprentices = [...this.apprentices];

    this.showPracticalForm = true;
  }

  openMultipleNotesForm(): void {
    this.multipleNotesForm.reset({
      training_type: '',
      id_training: '',
      id_apprentice: ''
    });

    this.filteredTrainings = [...this.trainings];
    this.filteredApprentices = [...this.apprentices];

    this.showMultipleNotesSelection = true;
  }

  // =============================================
  // FERMETURE DES MODALS
  // =============================================

  closePracticalNoteForm(): void {
    this.showPracticalForm = false;
    this.isEditing = false;
    this.practicalNoteForm.reset({
      training_type: '',
      type_note: 'Stage',
    });
  }

  closeMultipleNotesSelection(): void {
    this.showMultipleNotesSelection = false;
    this.multipleNotesForm.reset({
      training_type: '',
    });
  }

  // =============================================
  // MÉTHODES POUR MODIFIER LES NOTES THÉORIQUES
  // =============================================

  editTheoreticalNote(note: Note): void {
    console.log('📝 Editing theoretical note:', note);

    this.isEditingTheoretical = true;
    this.selectedNoteForEdit = { ...note };

    this.theoreticalNoteEditForm.patchValue({
      theoretical_note: note.theoretical_note,
    });

    this.showTheoreticalEditForm = true;
  }

  onTheoreticalNoteEditSubmit(): void {
    if (this.theoreticalNoteEditForm.invalid || !this.selectedNoteForEdit) {
      this.markFormGroupTouched(this.theoreticalNoteEditForm);
      return;
    }

    this.isSubmitting = true;
    const formValue = this.theoreticalNoteEditForm.value;

    const updateData = {
      theoretical_note: formValue.theoretical_note,
    };

    this.subscriptions.add(
      this.noteService
        .updateNote(this.selectedNoteForEdit.id_note!, updateData)
        .pipe(
          finalize(() => {
            this.isSubmitting = false;
          })
        )
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.showSuccess('Note théorique modifiée avec succès!');
              this.closeTheoreticalEditForm();
              this.loadAllData();
            } else {
              this.showError(
                'Erreur: ' + (response.error || 'Erreur inconnue')
              );
            }
          },
          error: (error) => {
            console.error('❌ Error updating theoretical note:', error);
            this.showError('Erreur de connexion lors de la modification');
          },
        })
    );
  }

  closeTheoreticalEditForm(): void {
    this.showTheoreticalEditForm = false;
    this.isEditingTheoretical = false;
    this.selectedNoteForEdit = null;
    this.theoreticalNoteEditForm.reset();
  }
}
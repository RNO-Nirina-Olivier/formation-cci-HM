import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { PresenceService, Presence, Apprenti, Formation } from '../services/presence.service';

@Component({
  selector: 'app-presences',
  templateUrl: './presences.component.html',
  styleUrls: ['./presences.component.css'],
  standalone: false,
})
export class PresenceComponent implements OnInit {
  // Données principales
  presences: Presence[] = [];
  filteredPresences: Presence[] = [];
  apprentis: Apprenti[] = [];
  formations: Formation[] = [];
  matieres: string[] = [];

  // États d'interface
  showForm = false;
  showMultiStepForm = false;
  isEditing = false;
  isLoading = false;
  currentStep = 1;
  step2Loading = false;

  // Filtres
  searchTerm = '';
  filterStatut = '';
  filterDate = '';
  filterMatiere = '';
  filterFormation = '';

  // États des dialogues
  showSuccessDialog = false;
  showErrorDialog = false;
  showConfirmDialog = false;
  dialogMessage = '';
  dialogTitle = '';
  pendingDeleteId: string | null = null;
  successApprentiName = '';

  // Formulaires
  presenceForm: FormGroup;
  multiStepForm: FormGroup;

  // Pour le formulaire multi-étapes
  selectedDate: string = '';
  selectedMatiere: string = '';
  selectedHeureDebut: string = '';
  selectedHeureFin: string = '';
  selectedFormation: string = '';

  // Constantes
  statuts = ['présent', 'absent', 'retard', 'excusé'];

  constructor(
    private fb: FormBuilder,
    private presenceService: PresenceService,
    private cdRef: ChangeDetectorRef
  ) {
    this.presenceForm = this.createPresenceForm();
    this.multiStepForm = this.createMultiStepForm();
  }

  ngOnInit() {
    this.loadData();
  }

  // ===== INITIALISATION ET CHARGEMENT =====

  createPresenceForm(): FormGroup {
    return this.fb.group({
      id_presence: [null],
      id_apprenti: ['', Validators.required],
      date_cours: ['', Validators.required],
      heure_debut: ['', Validators.required],
      heure_fin: ['', Validators.required],
      matiere: ['', Validators.required],
      statut: ['présent', Validators.required],
      remarque: [''],
      id_formation: ['', Validators.required]
    });
  }

  createMultiStepForm(): FormGroup {
    return this.fb.group({
      step1: this.fb.group({
        id_formation: ['', Validators.required],
        date_cours: ['', Validators.required],
        heure_debut: ['', Validators.required],
        heure_fin: ['', Validators.required],
        matiere: ['', Validators.required],
      }),
      step2: this.fb.group({
        presences: this.fb.array([]),
      }),
    });
  }

  get step1Form(): FormGroup {
    return this.multiStepForm.get('step1') as FormGroup;
  }

  get step2Form(): FormGroup {
    return this.multiStepForm.get('step2') as FormGroup;
  }

  get presencesArray(): FormArray {
    return this.step2Form.get('presences') as FormArray;
  }

  async loadData() {
    this.isLoading = true;
    try {
      console.log('🔄 Début du chargement des données...');

      const [presencesData, apprentisData, formationsData, matieresData] = await Promise.all([
        this.presenceService.getPresences().toPromise().catch(() => []) as Promise<Presence[]>,
        this.presenceService.getApprentis().toPromise().catch(() => []) as Promise<Apprenti[]>,
        this.presenceService.getFormations().toPromise().catch(() => []) as Promise<Formation[]>,
        this.presenceService.getMatieres().toPromise().catch(() => []) as Promise<string[]>,
      ]);

      this.presences = presencesData || [];
      this.apprentis = apprentisData || [];
      this.formations = formationsData || [];
      this.matieres = matieresData || [];

      console.log('✅ Données chargées:', {
        presences: this.presences.length,
        apprentis: this.apprentis.length,
        formations: this.formations.length,
        matieres: this.matieres.length,
      });

      this.applyFilters();
    } catch (error) {
      console.error('❌ Erreur chargement données:', error);
      this.showError('Erreur lors du chargement des données');
    } finally {
      this.isLoading = false;
    }
  }

  // ===== FORMULAIRE SIMPLE =====

  openForm(presence?: Presence) {
    this.isEditing = !!presence;
    this.showForm = true;

    if (presence) {
      this.presenceForm.patchValue({
        id_presence: presence.id_presence,
        id_apprenti: presence.id_apprenti,
        date_cours: presence.date_cours,
        heure_debut: presence.heure_debut,
        heure_fin: presence.heure_fin,
        matiere: presence.matiere,
        statut: presence.statut,
        remarque: presence.remarque || '',
        id_formation: presence.id_formation || ''
      });
    } else {
      this.presenceForm.reset({ 
        statut: 'présent',
        date_cours: new Date().toISOString().split('T')[0]
      });
    }
  }

  closeForm() {
    this.showForm = false;
    this.presenceForm.reset({ statut: 'présent' });
    this.isEditing = false;
  }

  async onSubmit() {
    if (this.presenceForm.valid) {
      this.isLoading = true;
      try {
        const formValue = this.presenceForm.value;

        console.log('📤 Soumission formulaire simple:', formValue);

        if (this.isEditing && formValue.id_presence) {
          await this.presenceService.updatePresence(formValue.id_presence, formValue).toPromise();
          this.showSuccess('Présence modifiée avec succès');
        } else {
          await this.presenceService.createPresence(formValue).toPromise();
          this.showSuccess('Présence créée avec succès');
        }

        await this.loadData();
        this.closeForm();
      } catch (error: any) {
        console.error('❌ Erreur sauvegarde présence:', error);
        this.showError(error.message || 'Erreur lors de la sauvegarde');
      } finally {
        this.isLoading = false;
      }
    } else {
      console.log('❌ Formulaire invalide:', this.presenceForm.errors);
      this.markFormGroupTouched(this.presenceForm);
      this.showError('Veuillez remplir tous les champs obligatoires');
    }
  }

  // ===== FORMULAIRE MULTI-ÉTAPES =====

  openMultiStepForm() {
    this.currentStep = 1;
    this.showMultiStepForm = true;
    this.step1Form.reset({
      date_cours: new Date().toISOString().split('T')[0]
    });
    this.step2Form.reset();
    this.presencesArray.clear();
  }

  closeMultiStepForm() {
    this.showMultiStepForm = false;
    this.currentStep = 1;
    this.step2Loading = false;
  }

  // Charger les matières selon la formation sélectionnée
  onFormationChange() {
    const formationId = this.step1Form.get('id_formation')?.value;
    if (formationId) {
      this.presenceService.getMatieresByFormation(formationId).subscribe({
        next: (matieres) => {
          this.matieres = matieres;
          this.cdRef.detectChanges();
        },
        error: (error) => {
          console.error('❌ Erreur chargement matières:', error);
          this.matieres = [];
        }
      });
    }
  }

  // Étape 1: Sélection formation/date/matière
  async onStep1Submit() {
    if (this.step1Form.valid) {
      this.isLoading = true;
      this.step2Loading = true;
      try {
        this.selectedFormation = this.step1Form.value.id_formation;
        this.selectedDate = this.step1Form.value.date_cours;
        this.selectedMatiere = this.step1Form.value.matiere;
        this.selectedHeureDebut = this.step1Form.value.heure_debut;
        this.selectedHeureFin = this.step1Form.value.heure_fin;

        console.log('🔄 Chargement des apprentis pour la formation:', this.selectedFormation);

        // Charger les apprentis de la formation sélectionnée
        const apprentisData = await this.presenceService.getApprentisByFormation(this.selectedFormation).toPromise();
        this.apprentis = apprentisData || [];

        console.log('✅ Apprentis chargés:', this.apprentis.length);
        
        // Vérifier les données des apprentis
        this.apprentis.forEach(apprenti => {
          console.log(`👤 ${apprenti.prenom} ${apprenti.nom} - Insc: ${apprenti.num_inscription} - Reins: ${apprenti.num_reinscription}`);
        });

        if (this.apprentis.length === 0) {
          console.warn('⚠️ Aucun apprenti trouvé pour cette formation');
          this.showError('Aucun apprenti trouvé pour cette formation');
          return;
        }

        // Construire le tableau des présences
        this.buildPresencesFormArray();
        this.currentStep = 2;

        // Forcer la mise à jour de l'interface
        setTimeout(() => {
          this.step2Loading = false;
          this.cdRef.detectChanges();
          console.log('🎯 Étape 2 prête avec', this.presencesArray.length, 'apprentis');
        }, 100);

      } catch (error: any) {
        this.step2Loading = false;
        console.error('❌ Erreur chargement apprentis:', error);
        this.showError('Erreur lors du chargement des apprentis: ' + error.message);
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched(this.step1Form);
      this.showError('Veuillez remplir tous les champs obligatoires');
    }
  }

  // Soumission finale
  async onMultiStepSubmit() {
    if (this.step2Form.valid) {
      this.isLoading = true;
      try {
        const presencesData = this.presencesArray.value.map((presence: any) => ({
          id_apprenti: presence.id_apprenti,
          date_cours: this.selectedDate,
          heure_debut: this.selectedHeureDebut,
          heure_fin: this.selectedHeureFin,
          matiere: this.selectedMatiere,
          statut: presence.statut,
          remarque: presence.remarque || '',
          id_formation: this.selectedFormation
        }));

        console.log('📤 Données à envoyer (bulk):', presencesData);

        const result = await this.presenceService.bulkUpsertPresences(presencesData).toPromise();
        const savedCount = result?.length || 0;

        console.log('✅ Résultat bulk:', savedCount, 'présences sauvegardées');

        this.closeMultiStepForm();
        this.showSuccess(`${savedCount} présence(s) enregistrée(s) avec succès`);
        await this.loadData();
      } catch (error: any) {
        console.error('❌ Erreur enregistrement multiple:', error);
        this.showError(error.message || "Erreur lors de l'enregistrement des présences");
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched(this.step2Form);
      this.showError('Veuillez définir le statut pour tous les apprentis');
    }
  }

  // Navigation entre les étapes
  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.step2Loading = false;
    }
  }

  // Construction du tableau des présences
  buildPresencesFormArray() {
    this.presencesArray.clear();

    // Vérifier les présences existantes pour cette date, matière et formation
    const existingPresences = this.presences.filter(p => 
      p.date_cours === this.selectedDate && 
      p.matiere === this.selectedMatiere &&
      p.id_formation === this.selectedFormation
    );

    console.log('🔍 Présences existantes trouvées:', existingPresences.length);

    this.apprentis.forEach((apprenti) => {
      const existingPresence = existingPresences.find(p => p.id_apprenti === apprenti.id_apprenti);
      
      console.log(`📝 Création formulaire pour ${apprenti.prenom} ${apprenti.nom}`, {
        num_inscription: apprenti.num_inscription,
        num_reinscription: apprenti.num_reinscription
      });

      const presenceGroup = this.fb.group({
        id_apprenti: [apprenti.id_apprenti],
        statut: [existingPresence?.statut || 'présent', Validators.required],
        remarque: [existingPresence?.remarque || ''],
        apprenti_nom: [apprenti.nom],
        apprenti_prenom: [apprenti.prenom],
        num_inscription: [apprenti.num_inscription || ''],
        num_reinscription: [apprenti.num_reinscription || ''],
        existing_presence: [!!existingPresence],
      });

      this.presencesArray.push(presenceGroup);
    });

    console.log('📋 Tableau présences construit:', this.presencesArray.length, 'apprentis');
    
    // Vérification finale
    setTimeout(() => {
      this.presencesArray.controls.forEach((control, index) => {
        const value = control.value;
        console.log(`✅ Ligne ${index} chargée:`, {
          nom: value.apprenti_nom + ' ' + value.apprenti_prenom,
          inscription: value.num_inscription,
          reinscription: value.num_reinscription
        });
      });
    }, 200);
  }

  // Gestion du changement de statut
  onStatutChange(apprentiIndex: number, nouveauStatut: string) {
    const presenceGroup = this.presencesArray.at(apprentiIndex);
    if (presenceGroup) {
      presenceGroup.patchValue({
        statut: nouveauStatut,
      });
      this.cdRef.detectChanges();
    }
  }

  // ===== MÉTHODES UTILITAIRES =====

  // Filtres
  applyFilters() {
    this.filteredPresences = this.presences.filter((presence) => {
      const matchesSearch =
        !this.searchTerm ||
        presence.apprenti_nom?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        presence.apprenti_prenom?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        presence.matiere?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        presence.formation_nom?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        `${presence.apprenti_prenom} ${presence.apprenti_nom}`.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesStatut = !this.filterStatut || presence.statut === this.filterStatut;
      const matchesDate = !this.filterDate || presence.date_cours === this.filterDate;
      const matchesMatiere = !this.filterMatiere || presence.matiere === this.filterMatiere;
      const matchesFormation = !this.filterFormation || presence.id_formation === this.filterFormation;

      return matchesSearch && matchesStatut && matchesDate && matchesMatiere && matchesFormation;
    });
  }

  clearFilters() {
    this.searchTerm = '';
    this.filterStatut = '';
    this.filterDate = '';
    this.filterMatiere = '';
    this.filterFormation = '';
    this.applyFilters();
  }

  // Suppression d'une présence
  deletePresence(id: string) {
    const presence = this.presences.find((p) => p.id_presence === id);
    if (presence) {
      const apprentiName = this.getApprentiName(presence);
      this.showDeleteConfirmation(id, apprentiName);
    }
  }

  async confirmDelete() {
    if (this.pendingDeleteId) {
      const presenceToDelete = this.presences.find((p) => p.id_presence === this.pendingDeleteId);
      const apprentiName = presenceToDelete ? this.getApprentiName(presenceToDelete) : '';

      try {
        const result = await this.presenceService.deletePresence(this.pendingDeleteId!).toPromise();

        if (result && result.success) {
          this.presences = this.presences.filter((p) => p.id_presence !== this.pendingDeleteId);
          this.applyFilters();
          this.closeAllDialogs();
          this.showSuccess(result.message || 'La présence a été supprimée avec succès', apprentiName);
        } else {
          this.closeAllDialogs();
          this.showError('Erreur lors de la suppression de la présence');
        }
      } catch (error: any) {
        console.error('❌ Erreur suppression présence:', error);
        this.closeAllDialogs();
        this.showError(error.message || 'Erreur lors de la suppression de la présence');
      }
    }
  }

  // Méthodes utilitaires
  getInitialsFromName(fullName: string): string {
    if (!fullName) return '';
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }

  getApprentiName(presence: Presence): string {
    if (presence?.apprenti_nom && presence?.apprenti_prenom) {
      return `${presence.apprenti_prenom} ${presence.apprenti_nom}`;
    }
    return presence?.apprenti_nom || 'Apprenti inconnu';
  }

  getApprentiById(id: string): Apprenti | undefined {
    return this.apprentis.find(a => a.id_apprenti === id);
  }

  getApprentiInitials(presence: Presence): string {
    const fullName = this.getApprentiName(presence);
    return this.getInitialsFromName(fullName);
  }

  // Méthode pour obtenir le nom de la formation
  getFormationName(id_formation: string): string {
    if (!id_formation) return 'Formation non définie';
    const formation = this.formations.find(f => f.id_formation === id_formation);
    return formation ? formation.nom_formation : 'Formation inconnue';
  }

  // Méthode sécurisée pour le template
  safeGetFormationName(id_formation: string | undefined | null): string {
    if (!id_formation) return 'Formation non définie';
    return this.getFormationName(id_formation);
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'présent': return 'confirmed';
      case 'absent': return 'cancelled';
      case 'retard': return 'pending';
      case 'excusé': return 'completed';
      default: return '';
    }
  }

  // Méthodes pour le template
  getProgressPercentage(): number {
    return (this.currentStep / 2) * 100;
  }

  getTotalApprentis(): number {
    return this.presencesArray.length;
  }

  getPresentsCount(): number {
    return this.presencesArray.value.filter((p: any) => p.statut === 'présent').length;
  }

  getAbsentsCount(): number {
    return this.presencesArray.value.filter((p: any) => p.statut === 'absent').length;
  }

  getRetardsCount(): number {
    return this.presencesArray.value.filter((p: any) => p.statut === 'retard').length;
  }

  getExcusesCount(): number {
    return this.presencesArray.value.filter((p: any) => p.statut === 'excusé').length;
  }

  // Actions rapides
  setAllStatut(statut: string) {
    this.presencesArray.controls.forEach((control, index) => {
      this.onStatutChange(index, statut);
    });
  }

  clearAllRemarques() {
    this.presencesArray.controls.forEach((control) => {
      control.patchValue({
        remarque: '',
      });
    });
    this.cdRef.detectChanges();
  }

  // Gestion des dialogues
  showSuccess(message: string, apprentiName?: string) {
    this.dialogTitle = 'Succès';
    this.dialogMessage = message;
    this.successApprentiName = apprentiName || '';
    this.showSuccessDialog = true;

    setTimeout(() => {
      if (this.showSuccessDialog) {
        this.closeAllDialogs();
      }
    }, 3000);
  }

  showError(message: string) {
    this.dialogTitle = 'Erreur';
    this.dialogMessage = message;
    this.showErrorDialog = true;
  }

  showDeleteConfirmation(id: string, apprentiName: string) {
    this.pendingDeleteId = id;
    this.dialogTitle = 'Confirmer la suppression';
    this.dialogMessage = `Êtes-vous sûr de vouloir supprimer l'enregistrement de présence pour <strong>${apprentiName}</strong> ?<br><br>Cette action est irréversible.`;
    this.showConfirmDialog = true;
  }

  closeAllDialogs() {
    this.showSuccessDialog = false;
    this.showErrorDialog = false;
    this.showConfirmDialog = false;
    this.pendingDeleteId = null;
    this.dialogMessage = '';
    this.dialogTitle = '';
    this.successApprentiName = '';
  }

  // Méthodes de validation
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field?.errors?.['required']) return 'Ce champ est requis';
    return '';
  }

  // Formater la date
  formatDate(date: string): string {
    return this.presenceService.formatDate(date);
  }

  // Formater l'heure
  formatTime(time: string): string {
    return this.presenceService.formatTime(time);
  }

  // Méthodes sécurisées pour le template
  safeFormatDate(date: string | undefined | null): string {
    if (!date) return 'Date non définie';
    return this.formatDate(date);
  }

  safeFormatTime(time: string | undefined | null): string {
    if (!time) return 'Heure non définie';
    return this.formatTime(time);
  }

  safeGetApprentiName(presence: Presence | null | undefined): string {
    if (!presence) return 'Apprenti inconnu';
    return this.getApprentiName(presence);
  }

  safeGetApprentiInitials(presence: Presence | null | undefined): string {
    if (!presence) return '??';
    return this.getApprentiInitials(presence);
  }

  // Obtenir le nom d'affichage de l'apprenti avec numéros
  getApprentiDisplayName(apprenti: Apprenti): string {
    return this.presenceService.getApprentiDisplayName(apprenti);
  }

  // Vérifier si un cours est passé
  isCoursPasse(dateCours: string, heureFin?: string): boolean {
    return this.presenceService.isCoursPasse(dateCours, heureFin);
  }

  // Exporter les données
  exportToCSV() {
    const csvContent = this.presenceService.exportToCSV(this.filteredPresences);
    this.presenceService.downloadCSV(csvContent, 'presences');
  }
}
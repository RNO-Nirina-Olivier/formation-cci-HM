import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  InscriptionService,
  Inscription,
} from '../services/inscription.service';
import { ApprentiService } from '../services/apprenti.service';
import { FormationService } from '../services/formation.service';

@Component({
  selector: 'app-inscription',
  templateUrl: './inscriptions.component.html',
  styleUrls: ['./inscriptions.component.css'],
  standalone: false,
})
export class InscriptionComponent implements OnInit {
  inscriptionForm!: FormGroup;
  inscriptions: Inscription[] = [];
  filteredInscriptions: Inscription[] = [];
  apprentis: any[] = [];
  formations: any[] = [];

  // États de l'interface
  showForm = false;
  isEditing = false;
  editingInscriptionId: string | null = null;
  isLoading = false;
  searchTerm = '';
  filterStatut = '';

  // États des dialogues
  showDeleteConfirm = false;
  showSuccessDialog = false;
  showErrorDialog = false;
  inscriptionToDelete: Inscription | null = null;
  successMessage = '';
  errorMessage = '';

  // Données statiques
  statuts = ['en_attente', 'admis', 'refuse', 'liste_attente'];

  constructor(
    private fb: FormBuilder,
    private inscriptionService: InscriptionService,
    private apprentiService: ApprentiService, // Ajout du service
    private formationService: FormationService // Ajout du service
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadData();
  }

  initForm(): void {
    this.inscriptionForm = this.fb.group({
      id_apprenti: ['', Validators.required],
      id_formation: ['', Validators.required],
      date_inscription: [this.getTodayDate(), Validators.required],
      statut: ['en_attente', Validators.required],
    });
  }

  // ==================== CHARGEMENT DES DONNÉES ====================

  loadData(): void {
    console.log('🚀 Début du chargement des données...');
    this.loadApprentis();
    this.loadFormations();
    this.loadInscriptions();
  }

  loadInscriptions(): void {
    this.isLoading = true;
    this.inscriptionService.getInscriptions().subscribe({
      next: (data) => {
        console.log('✅ Inscriptions chargées:', data);
        this.inscriptions = data || [];
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Erreur chargement inscriptions', error);
        this.showError(
          'Erreur lors du chargement des inscriptions: ' + error.message
        );
        this.inscriptions = [];
        this.applyFilters();
        this.isLoading = false;
      },
    });
  }

  // ✅ CORRECTION : Chargement des apprentis
  loadApprentis(): void {
    console.log('🔄 Chargement des apprentis...');

    this.apprentiService.getApprentis().subscribe({
      next: (data) => {
        console.log('✅ Apprentis chargés avec succès:', data);
        this.apprentis = data || [];
        this.debugApprentisData();
      },
      error: (error) => {
        console.error('❌ Erreur chargement apprentis', error);
        this.showError(
          'Erreur lors du chargement des apprentis: ' + error.message
        );
        this.apprentis = [];
        this.debugApprentisData();
      },
    });
  }

  // ✅ CORRECTION : Chargement des formations
  loadFormations(): void {
    console.log('🔄 Chargement des formations...');

    this.formationService.getFormations().subscribe({
      next: (data) => {
        console.log('✅ Formations chargées avec succès:', data);
        this.formations = data || [];
        this.debugFormationsData();
      },
      error: (error) => {
        console.error('❌ Erreur chargement formations', error);
        this.showError(
          'Erreur lors du chargement des formations: ' + error.message
        );
        this.formations = [];
        this.debugFormationsData();
      },
    });
  }

  // ✅ Méthode de débogage pour les apprentis
  private debugApprentisData(): void {
    console.log('🐛 DÉBOGAGE APPRENTIS:');
    console.log("Nombre d'apprentis:", this.apprentis.length);

    if (this.apprentis.length > 0) {
      console.log('Liste complète des apprentis:');
      this.apprentis.forEach((apprenti, index) => {
        console.log(`Apprenti ${index + 1}:`, {
          id: apprenti.id_apprenti,
          nom: apprenti.nom,
          prenom: apprenti.prenom,
          email: apprenti.email,
        });
      });
    } else {
      console.warn('⚠️ AUCUN APPRENTI TROUVÉ!');
    }
  }

  // ✅ Méthode de débogage pour les formations
  private debugFormationsData(): void {
    console.log('🐛 DÉBOGAGE FORMATIONS:');
    console.log('Nombre de formations:', this.formations.length);

    if (this.formations.length > 0) {
      console.log('Liste complète des formations:');
      this.formations.forEach((formation, index) => {
        console.log(`Formation ${index + 1}:`, {
          id: formation.id_formation,
          metier: formation.metier,
          type: formation.type_formation,
          date_debut: formation.date_debut,
          date_fin: formation.date_fin,
        });
      });
    } else {
      console.warn('⚠️ AUCUNE FORMATION TROUVÉE!');
    }
  }

  // ==================== GESTION DU FORMULAIRE ====================

  openForm(): void {
    this.showForm = true;
    this.isEditing = false;
    this.editingInscriptionId = null;
    this.inscriptionForm.reset({
      statut: 'en_attente',
      date_inscription: this.getTodayDate(),
    });

    // Debug: vérifier les données disponibles
    console.log('📋 Ouverture formulaire:');
    console.log('   - Apprentis disponibles:', this.apprentis.length);
    console.log('   - Formations disponibles:', this.formations.length);
    console.log('   - Formulaire valide:', this.inscriptionForm.valid);
  }

  closeForm(): void {
    this.showForm = false;
    this.inscriptionForm.reset({
      statut: 'en_attente',
      date_inscription: this.getTodayDate(),
    });
    this.isEditing = false;
    this.editingInscriptionId = null;
  }

  editInscription(inscription: Inscription): void {
    this.isEditing = true;
    this.editingInscriptionId = inscription.id_inscription;
    this.inscriptionForm.patchValue({
      id_apprenti: inscription.id_apprenti,
      id_formation: inscription.id_formation,
      date_inscription: this.formatDateForInput(inscription.date_inscription),
      statut: inscription.statut,
    });
    this.showForm = true;
  }

  onSubmit(): void {
    if (this.inscriptionForm.valid) {
      this.isLoading = true;
      const formData = this.inscriptionForm.getRawValue();

      console.log('📤 Données du formulaire:', formData);

      const inscriptionData = {
        id_apprenti: formData.id_apprenti,
        id_formation: formData.id_formation,
        date_inscription: formData.date_inscription,
        statut: formData.statut,
      };

      console.log('📤 Données envoyées (création):', inscriptionData);

      this.inscriptionService.createInscription(inscriptionData).subscribe({
        next: (result) => {
          console.log('✅ Inscription créée:', result);
          this.loadInscriptions();
          this.closeForm();
          this.isLoading = false;
          this.showSuccess('Inscription créée avec succès');
        },
        error: (error) => {
          console.error('❌ Erreur création inscription:', error);
          this.isLoading = false;
          this.showError(
            error.message || "Erreur lors de la création de l'inscription"
          );
        },
      });
    } else {
      this.markFormGroupTouched(this.inscriptionForm);
      this.showError('Veuillez remplir tous les champs obligatoires');
      console.log('❌ Formulaire invalide:', this.getFormErrors());
    }
  }

  // ==================== ACTIONS SUR LES INSCRIPTIONS ====================

  confirmDelete(inscription: Inscription): void {
    this.inscriptionToDelete = inscription;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.inscriptionToDelete = null;
  }

  confirmDeleteAction(): void {
    if (this.inscriptionToDelete) {
      this.isLoading = true;
      this.inscriptionService
        .deleteInscription(this.inscriptionToDelete.id_inscription)
        .subscribe({
          next: (response) => {
            console.log('✅ Suppression réussie:', response);
            this.loadInscriptions();
            this.showDeleteConfirm = false;
            this.inscriptionToDelete = null;
            this.isLoading = false;
            this.showSuccess('Inscription supprimée avec succès');
          },
          error: (error) => {
            console.error('❌ Erreur suppression', error);
            this.isLoading = false;
            this.showDeleteConfirm = false;
            this.showError('Erreur lors de la suppression: ' + error.message);
          },
        });
    }
  }

  // ==================== FILTRES ET RECHERCHE ====================

  applyFilters(): void {
    this.filteredInscriptions = this.inscriptions.filter((inscription) => {
      const matchesSearch =
        !this.searchTerm ||
        this.getDisplayApprentiName(inscription)
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        this.getDisplayFormationName(inscription)
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        (inscription.id_inscription &&
          inscription.id_inscription
            .toLowerCase()
            .includes(this.searchTerm.toLowerCase()));

      const matchesStatut =
        !this.filterStatut || inscription.statut === this.filterStatut;

      return matchesSearch && matchesStatut;
    });

    console.log('🔍 Inscriptions filtrées:', this.filteredInscriptions.length);
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterStatut = '';
    this.applyFilters();
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  private formatDateForInput(dateString: string): string {
    if (!dateString) return this.getTodayDate();
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return this.getTodayDate();
    return date.toISOString().split('T')[0];
  }

  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.inscriptionForm.get(fieldName);

    if (!field?.touched) return '';

    if (field?.hasError('required')) return 'Ce champ est requis';

    return '';
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'admis':
        return 'statut-confirme';
      case 'en_attente':
        return 'statut-attente';
      case 'refuse':
        return 'statut-refuse';
      case 'liste_attente':
        return 'statut-attente';
      default:
        return 'statut-default';
    }
  }

  getDisplayApprentiName(inscription: Inscription): string {
    // Priorité 1: Les champs directs de l'inscription
    if (inscription.prenom && inscription.nom) {
      return `${inscription.prenom} ${inscription.nom}`;
    }
    // Priorité 2: Recherche dans la liste des apprentis
    const apprenti = this.apprentis.find(
      (a) => a.id_apprenti === inscription.id_apprenti
    );
    return apprenti ? `${apprenti.prenom} ${apprenti.nom}` : 'Apprenti inconnu';
  }

  getApprentiEmail(inscription: Inscription): string {
    // Priorité 1: Les champs directs de l'inscription
    if (inscription.email) {
      return inscription.email;
    }
    // Priorité 2: Recherche dans la liste des apprentis
    const apprenti = this.apprentis.find(
      (a) => a.id_apprenti === inscription.id_apprenti
    );
    return apprenti ? apprenti.email : 'Email non disponible';
  }

  getDisplayFormationName(inscription: Inscription): string {
    // Priorité 1: Le champ direct de l'inscription
    if (inscription.nom_formation) {
      return inscription.nom_formation;
    }
    // Priorité 2: Recherche dans la liste des formations
    const formation = this.formations.find(
      (f) => f.id_formation === inscription.id_formation
    );
    return formation ? formation.metier : 'Formation inconnue';
  }

  getFormationType(inscription: Inscription): string {
    // Priorité 1: Le champ direct de l'inscription
    if (inscription.type_formation) {
      return inscription.type_formation;
    }
    // Priorité 2: Recherche dans la liste des formations
    const formation = this.formations.find(
      (f) => f.id_formation === inscription.id_formation
    );
    return formation ? formation.type_formation : 'Type non spécifié';
  }

  private getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.inscriptionForm.controls).forEach((key) => {
      const control = this.inscriptionForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  // ==================== GESTION DES DIALOGUES ====================

  showSuccess(message: string): void {
    this.successMessage = message;
    this.showSuccessDialog = true;
  }

  showError(message: string): void {
    this.errorMessage = message;
    this.showErrorDialog = true;
  }

  closeSuccessDialog(): void {
    this.showSuccessDialog = false;
    this.successMessage = '';
  }

  closeErrorDialog(): void {
    this.showErrorDialog = false;
    this.errorMessage = '';
  }

  // ==================== MÉTHODE DE DÉBOGAGE ====================

  debugData(): void {
    console.log('=== DÉBOGAGE COMPLET ===');
    console.log('Inscriptions:', this.inscriptions);
    console.log('Apprentis:', this.apprentis);
    console.log('Formations:', this.formations);
    console.log('Filtered Inscriptions:', this.filteredInscriptions);

    if (this.inscriptions.length > 0) {
      const firstInscription = this.inscriptions[0];
      console.log('Première inscription détaillée:', firstInscription);
      console.log(
        'Nom apprenti:',
        this.getDisplayApprentiName(firstInscription)
      );
      console.log(
        'Nom formation:',
        this.getDisplayFormationName(firstInscription)
      );
    }

    console.log('Formulaire valide:', this.inscriptionForm.valid);
    console.log('Valeurs du formulaire:', this.inscriptionForm.value);
  }
}

import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import {
  SuiviPratiqueService,
  SuiviPratique,
  Apprenti,
  Formation,
} from '../services/suivi-pratique.service';

@Component({
  selector: 'app-suivi-pratiques',
  templateUrl: './suivi-pratiques.component.html',
  styleUrls: ['./suivi-pratiques.component.css'],
  standalone: false,
})
export class SuiviPratiquesComponent implements OnInit {
  // Données principales
  suivis: SuiviPratique[] = [];
  filteredSuivis: SuiviPratique[] = [];
  apprentis: Apprenti[] = [];
  formations: Formation[] = [];
  selectedFormation?: Formation;

  // États
  isLoading = false;
  showForm = false;
  isEditing = false;
  currentSuiviId?: string;

  // Recherche et filtres
  searchTerm = '';
  filterStatut = '';
  filterFormation = '';

  // Dialogs
  showDeleteConfirm = false;
  showSuccessDialog = false;
  showErrorDialog = false;
  dialogMessage = '';
  suiviToDelete?: string;

  // Formulaires
  suiviForm: FormGroup;

  // Vue et tri
  currentView: 'cards' | 'table' = 'cards';
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private fb: FormBuilder,
    private suiviService: SuiviPratiqueService
  ) {
    this.suiviForm = this.createForm();
  }

  ngOnInit() {
    this.loadData();
  }

  // =============================================
  // MÉTHODES DE CHARGEMENT DES DONNÉES
  // =============================================

  async loadData() {
    this.isLoading = true;
    try {
      // Charger les suivis
      const suivisResponse = await this.suiviService.getSuivis().toPromise();
      if (suivisResponse?.success) {
        this.suivis = suivisResponse.data;
        this.filteredSuivis = [...this.suivis];
        console.log('✅ Suivis chargés:', this.suivis.length);
      } else {
        this.showError(
          suivisResponse?.error || 'Erreur lors du chargement des suivis'
        );
      }

      // Charger les données du formulaire
      const formDataResponse = await this.suiviService
        .getDonneesFormulaire()
        .toPromise();
      if (formDataResponse?.success) {
        this.apprentis = formDataResponse.data.apprentis;
        this.formations = formDataResponse.data.formations;
        console.log('✅ Données formulaire chargées:', {
          apprentis: this.apprentis.length,
          formations: this.formations.length
        });
      } else {
        this.showError(
          formDataResponse?.error ||
            'Erreur lors du chargement des données du formulaire'
        );
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      this.showError(
        error?.error?.error || 'Erreur lors du chargement des données'
      );
    } finally {
      this.isLoading = false;
    }
  }

  // =============================================
  // MÉTHODES DU FORMULAIRE
  // =============================================

  createForm(): FormGroup {
    return this.fb.group({
      id_apprenti: ['', Validators.required],
      id_formation: ['', Validators.required],
      entreprise: ['', [Validators.required, Validators.minLength(2)]],
      adresse_entreprise: ['', [Validators.required, Validators.minLength(5)]],
      encadrant: ['', [Validators.required, Validators.minLength(2)]],
      date_debut: ['', Validators.required],
      date_fin: ['', Validators.required],
      evaluation: [''],
    });
  }

  async onSubmit() {
    if (this.suiviForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    try {
      const formData = this.suiviForm.value;
      let response;

      // Vérifier l'éligibilité de la formation
      const checkEligible = await this.suiviService
        .checkFormationEligible(formData.id_formation)
        .toPromise();

      if (!checkEligible?.data.isEligible) {
        this.showError('Cette formation n\'est pas éligible au suivi pratique');
        return;
      }

      if (this.isEditing && this.currentSuiviId) {
        response = await this.suiviService
          .updateSuivi(this.currentSuiviId, formData)
          .toPromise();
      } else {
        // Générer un ID pour la création
        const idResponse = await this.suiviService.generateSuiviIdFromAPI().toPromise();
        if (idResponse?.success) {
          formData.id_suivi = idResponse.data.id_suivi;
        }
        
        response = await this.suiviService.createSuivi(formData).toPromise();
      }

      if (response?.success) {
        this.showSuccess(
          this.isEditing
            ? 'Suivi modifié avec succès'
            : 'Suivi créé avec succès'
        );
        this.closeForm();
        this.loadData();
      } else {
        this.showError(
          response?.error || response?.message || "Erreur lors de l'opération"
        );
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      this.showError(
        error?.error?.error ||
          error?.message ||
          "Erreur lors de l'enregistrement"
      );
    } finally {
      this.isLoading = false;
    }
  }

  openForm(suivi?: SuiviPratique) {
    this.isEditing = !!suivi;
    this.currentSuiviId = suivi?.id_suivi;

    if (suivi) {
      this.suiviForm.patchValue({
        id_apprenti: suivi.id_apprenti,
        id_formation: suivi.id_formation,
        entreprise: suivi.entreprise,
        adresse_entreprise: suivi.adresse_entreprise,
        encadrant: suivi.encadrant,
        date_debut: suivi.date_debut,
        date_fin: suivi.date_fin,
        evaluation: suivi.evaluation || '',
      });
      this.onFormationChange(suivi.id_formation);
    } else {
      this.suiviForm.reset();
      this.selectedFormation = undefined;
    }

    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.isEditing = false;
    this.currentSuiviId = undefined;
    this.selectedFormation = undefined;
    this.suiviForm.reset();
  }

  onFormationChange(formationId: string) {
    this.selectedFormation = this.formations.find(
      (f) => f.id_formation === formationId
    );

    console.log('Formation sélectionnée:', this.selectedFormation);

    // Réinitialiser les champs si la formation n'est pas éligible (seulement en création)
    if (
      this.selectedFormation &&
      this.selectedFormation.type_formation !== 'professionnel_dual' &&
      !this.isEditing
    ) {
      console.log('⚠️ Formation non éligible au suivi pratique');
      this.suiviForm.patchValue({
        entreprise: '',
        adresse_entreprise: '',
        encadrant: '',
        date_debut: '',
        date_fin: '',
        evaluation: '',
      });
    }
  }

  // =============================================
  // MÉTHODES DE GESTION DES SUIVIS
  // =============================================

  async confirmDelete() {
    if (!this.suiviToDelete) return;

    this.isLoading = true;
    try {
      const response = await this.suiviService
        .deleteSuivi(this.suiviToDelete)
        .toPromise();
      if (response?.success) {
        this.showSuccess('Suivi supprimé avec succès');
        this.loadData();
      } else {
        this.showError(
          response?.error ||
            response?.message ||
            'Erreur lors de la suppression'
        );
      }
    } catch (error: any) {
      console.error('Erreur:', error);
      this.showError(
        error?.error?.error || error?.message || 'Erreur lors de la suppression'
      );
    } finally {
      this.isLoading = false;
      this.showDeleteConfirm = false;
      this.suiviToDelete = undefined;
    }
  }

  deleteSuivi(id: string) {
    const suivi = this.suivis.find((s) => s.id_suivi === id);
    if (suivi) {
      this.suiviToDelete = id;
      this.dialogMessage = `Êtes-vous sûr de vouloir supprimer le suivi de ${suivi.apprenti_prenom} ${suivi.apprenti_nom} ?`;
      this.showDeleteConfirm = true;
    }
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.suiviToDelete = undefined;
  }

  // =============================================
  // MÉTHODES DE FILTRAGE ET RECHERCHE
  // =============================================

  applyFilters() {
    this.filteredSuivis = this.suivis.filter((suivi) => {
      const matchesSearch =
        !this.searchTerm ||
        suivi.apprenti_nom
          ?.toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        suivi.apprenti_prenom
          ?.toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        suivi.entreprise
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        suivi.formation_metier
          ?.toLowerCase()
          .includes(this.searchTerm.toLowerCase());

      const matchesStatut =
        !this.filterStatut ||
        this.getStatutStage(suivi.date_fin, suivi.date_debut) ===
          this.filterStatut;
      const matchesFormation =
        !this.filterFormation || suivi.id_formation === this.filterFormation;

      return matchesSearch && matchesStatut && matchesFormation;
    });
  }

  clearFilters() {
    this.searchTerm = '';
    this.filterStatut = '';
    this.filterFormation = '';
    this.filteredSuivis = [...this.suivis];
  }

  // =============================================
  // MÉTHODES D'AFFICHAGE ET UTILITAIRES
  // =============================================

  switchView(view: 'cards' | 'table'): void {
    this.currentView = view;
  }

  sortTable(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    this.filteredSuivis.sort((a: any, b: any) => {
      let valueA: any = a[field as keyof typeof a];
      let valueB: any = b[field as keyof typeof b];

      if (valueA == null) valueA = '';
      if (valueB == null) valueB = '';

      if (field.includes('date')) {
        const dateA = new Date(valueA as string).getTime();
        const dateB = new Date(valueB as string).getTime();

        if (dateA < dateB) {
          return this.sortDirection === 'asc' ? -1 : 1;
        }
        if (dateA > dateB) {
          return this.sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      }

      const strA = String(valueA).toLowerCase();
      const strB = String(valueB).toLowerCase();

      if (strA < strB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (strA > strB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  getStatutStage(dateFin: string, dateDebut: string): string {
    const today = new Date();
    const fin = new Date(dateFin);
    const debut = new Date(dateDebut);

    if (today < debut) return 'a-venir';
    if (today > fin) return 'termine';
    return 'en-cours';
  }

  isEnCours(dateFin: string): boolean {
    return new Date() <= new Date(dateFin);
  }

  isTermine(dateFin: string): boolean {
    return new Date() > new Date(dateFin);
  }

  isAVenir(dateDebut: string): boolean {
    return new Date() < new Date(dateDebut);
  }

  getDureeStage(debut: string, fin: string): string {
    const start = new Date(debut);
    const end = new Date(fin);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 30) {
      return `${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else {
      const months = Math.floor(diffDays / 30);
      const days = diffDays % 30;
      return `${months} mois${
        days > 0 ? ` et ${days} jour${days > 1 ? 's' : ''}` : ''
      }`;
    }
  }

  getStats() {
    const today = new Date();
    const entreprisesUniques = new Set(this.suivis.map((s) => s.entreprise));

    return {
      total: this.suivis.length,
      enCours: this.suivis.filter(
        (s) => this.isEnCours(s.date_fin) && !this.isAVenir(s.date_debut)
      ).length,
      termines: this.suivis.filter((s) => this.isTermine(s.date_fin)).length,
      entreprises: entreprisesUniques.size,
    };
  }

  // =============================================
  // MÉTHODES DE DIALOG ET MESSAGES
  // =============================================

  showSuccess(message: string) {
    this.dialogMessage = message;
    this.showSuccessDialog = true;
  }

  showError(message: string) {
    this.dialogMessage = message;
    this.showErrorDialog = true;
  }

  closeDialog() {
    this.showSuccessDialog = false;
    this.showErrorDialog = false;
    this.dialogMessage = '';
  }

  // =============================================
  // MÉTHODES DE VALIDATION DU FORMULAIRE
  // =============================================

  markFormGroupTouched() {
    Object.keys(this.suiviForm.controls).forEach((key) => {
      this.suiviForm.get(key)?.markAsTouched();
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.suiviForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.suiviForm.get(fieldName);
    if (field?.errors?.['required']) {
      return 'Ce champ est obligatoire';
    }
    if (field?.errors?.['minlength']) {
      return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
    }
    return 'Erreur de validation';
  }

  // =============================================
  // MÉTHODES D'AFFICHAGE DES INFORMATIONS
  // =============================================

  getApprentiInfo(id_apprenti: string): Apprenti | undefined {
    return this.apprentis.find(a => a.id_apprenti === id_apprenti);
  }

  getFormationInfo(id_formation: string): Formation | undefined {
    return this.formations.find(f => f.id_formation === id_formation);
  }

  getFormationTypeLabel(type: string | undefined): string {
    if (!type) return 'Type inconnu';

    const typeLabels: { [key: string]: string } = {
      thematique: 'Thématique',
      modulaire: 'Modulaire',
      professionnel_dual: 'Professionnel Dual',
    };
    return typeLabels[type] || type;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR');
  }
}
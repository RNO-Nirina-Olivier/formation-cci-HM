import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import {
  ReinscriptionService,
  Reinscription,
  StatsReinscription,
  InscriptionOriginale,
} from '../services/reinscription.service';
import {
  CertificatService,
  Apprenti,
  Formation,
} from '../services/certificat.service';

@Component({
  selector: 'app-reinscription',
  templateUrl: './reinscription.component.html',
  styleUrls: ['./reinscription.component.css'],
  standalone: false,
})
export class ReinscriptionComponent implements OnInit {
  reinscriptions: Reinscription[] = [];
  filteredReinscriptions: Reinscription[] = [];
  apprentis: Apprenti[] = [];
  formations: Formation[] = [];
  inscriptionsOriginales: InscriptionOriginale[] = [];

  showForm = false;
  isLoading = false;
  searchTerm = '';
  filterStatut = 'all';
  currentView: 'cards' | 'table' = 'cards';

  // Statistiques
  stats = {
    total_reinscriptions: 0,
    validees: 0,
    en_attente: 0,
    refusees: 0,
    annulees: 0,
  };

  // Pagination
  currentPage: number = 1;
  pageSize: number = 8;
  totalPages: number = 0;
  paginatedReinscriptions: Reinscription[] = [];

  // Dialog states
  showSuccessDialog = false;
  showErrorDialog = false;
  showConfirmDialog = false;
  dialogMessage = '';
  dialogTitle = '';
  pendingAction: { type: string; id: string | undefined; data?: any } | null = null;

  reinscriptionForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private reinscriptionService: ReinscriptionService,
    private certificatService: CertificatService,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef
  ) {
    this.reinscriptionForm = this.createForm();
  }

  ngOnInit() {
    this.loadData();
  }

  createForm(): FormGroup {
    return this.fb.group({
      id_apprenti: ['', Validators.required],
      id_formation: ['', Validators.required],
      id_inscription_originale: ['', Validators.required],
    });
  }

  async loadData() {
    this.isLoading = true;

    try {
      await this.loadFromAPI();
      console.log('✅ Données chargées depuis API');
    } catch (apiError: any) {
      console.error('❌ Erreur API:', apiError);
      this.showError('Erreur de chargement des données: ' + apiError.message);
    } finally {
      this.loadStats();
      this.isLoading = false;
    }
  }

  private async loadFromAPI() {
    try {
      const [reinscriptions, apprentis, formations] = await Promise.all([
        this.reinscriptionService.getReinscriptions().toPromise(),
        this.certificatService.getApprentis().toPromise(),
        this.certificatService.getFormations().toPromise(),
      ]);

      this.reinscriptions = reinscriptions || [];
      this.apprentis = apprentis || [];
      this.formations = formations || [];

      this.filteredReinscriptions = [...this.reinscriptions];
      this.updatePagination();
    } catch (error: any) {
      throw new Error('API non disponible: ' + error.message);
    }
  }

  // MÉTHODES POUR LES STATISTIQUES
  private loadStats() {
    this.stats = {
      total_reinscriptions: this.reinscriptions.length,
      validees: this.reinscriptions.filter((r) => r.statut === 'validee').length,
      en_attente: this.reinscriptions.filter((r) => r.statut === 'en_attente').length,
      refusees: this.reinscriptions.filter((r) => r.statut === 'refusee').length,
      annulees: this.reinscriptions.filter((r) => r.statut === 'annulee').length,
    };
  }

  // MÉTHODES POUR CHANGER LA VUE
  switchView(view: 'cards' | 'table') {
    this.currentView = view;
  }

  // MÉTHODES POUR LES ICÔNES DE STATUT
  getStatusIcon(statut: string): string {
    switch (statut) {
      case 'validee':
        return 'fas fa-check-circle text-success';
      case 'en_attente':
        return 'fas fa-clock text-warning';
      case 'refusee':
        return 'fas fa-times-circle text-danger';
      case 'annulee':
        return 'fas fa-ban text-secondary';
      default:
        return 'fas fa-question-circle text-secondary';
    }
  }

  // MÉTHODES POUR LA PAGINATION
  getStartIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(
      this.currentPage * this.pageSize,
      this.filteredReinscriptions.length
    );
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;

    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }

    return pages;
  }

  onPageSizeChange(event: any) {
    this.pageSize = Number(event.target.value);
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.ceil(
      this.filteredReinscriptions.length / this.pageSize
    );
    this.currentPage = Math.max(1, Math.min(this.currentPage, this.totalPages));

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedReinscriptions = this.filteredReinscriptions.slice(
      startIndex,
      endIndex
    );
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  // MÉTHODES POUR LES ACTIONS - CORRIGÉES
  validerReinscription(reinscription: Reinscription) {
    this.confirmValidate(reinscription);
  }

  refuserReinscription(reinscription: Reinscription) {
    this.confirmRefuse(reinscription);
  }

  deleteReinscription(reinscription: Reinscription) {
    this.confirmDelete(reinscription);
  }

  // MÉTHODE : Chargement automatique des inscriptions
  onApprentiSelect() {
    const idApprenti = this.reinscriptionForm.get('id_apprenti')?.value;

    if (idApprenti) {
      this.reinscriptionForm.patchValue({
        id_inscription_originale: '',
        id_formation: '',
      });

      this.loadInscriptionsOriginales(idApprenti);
    } else {
      this.inscriptionsOriginales = [];
      this.reinscriptionForm.patchValue({
        id_inscription_originale: '',
        id_formation: '',
      });
    }
  }

  // MÉTHODE : Charger les inscriptions originales depuis le service
  private loadInscriptionsOriginales(idApprenti: string) {
    this.isLoading = true;

    this.reinscriptionService.getInscriptionsOriginales(idApprenti).subscribe({
      next: (inscriptions) => {
        this.inscriptionsOriginales = inscriptions;
        console.log('📋 Inscriptions trouvées:', this.inscriptionsOriginales);

        if (this.inscriptionsOriginales.length === 1) {
          const inscription = this.inscriptionsOriginales[0];
          this.reinscriptionForm.patchValue({
            id_inscription_originale: inscription.id_inscription,
            id_formation: inscription.id_formation,
          });
          console.log('✅ Inscription et formation automatiquement sélectionnées');
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Erreur chargement inscriptions:', error);
        this.inscriptionsOriginales = [];
        this.isLoading = false;
        this.showError('Erreur lors du chargement des inscriptions');
      },
    });
  }

  // MÉTHODE : Sélection automatique de la formation
  onInscriptionOriginaleSelect() {
    const selectedInscriptionId = this.reinscriptionForm.get('id_inscription_originale')?.value;

    console.log('🎯 Inscription sélectionnée:', selectedInscriptionId);

    if (selectedInscriptionId) {
      const inscription = this.inscriptionsOriginales.find(
        (ins) => ins.id_inscription === selectedInscriptionId
      );

      if (inscription) {
        this.reinscriptionForm.patchValue({
          id_formation: inscription.id_formation,
        });

        console.log('✅ Formation automatiquement sélectionnée:', inscription.id_formation);
      }
    }
  }

  // FILTRES
  applyFilters() {
    let filtered = [...this.reinscriptions];

    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (reinscription) =>
          reinscription.apprenti_nom?.toLowerCase().includes(searchLower) ||
          reinscription.apprenti_prenom?.toLowerCase().includes(searchLower) ||
          reinscription.formation_metier?.toLowerCase().includes(searchLower) ||
          reinscription.apprenti_email?.toLowerCase().includes(searchLower)
      );
    }

    if (this.filterStatut !== 'all') {
      filtered = filtered.filter(
        (reinscription) => reinscription.statut === this.filterStatut
      );
    }

    this.filteredReinscriptions = filtered;
    this.currentPage = 1;
    this.updatePagination();
    this.loadStats();
  }

  // ACTIONS AVEC CONFIRMATION
  confirmDelete(reinscription: Reinscription) {
    this.pendingAction = {
      type: 'delete',
      id: reinscription.id_reinscription,
      data: reinscription,
    };
    this.dialogTitle = 'Confirmation de suppression';
    this.dialogMessage = `Êtes-vous sûr de vouloir supprimer la réinscription de <strong>${reinscription.apprenti_prenom} ${reinscription.apprenti_nom}</strong> ?`;
    this.showConfirmDialog = true;
  }

  confirmValidate(reinscription: Reinscription) {
    this.pendingAction = {
      type: 'validate',
      id: reinscription.id_reinscription,
      data: reinscription,
    };
    this.dialogTitle = 'Confirmation de validation';
    this.dialogMessage = `Êtes-vous sûr de vouloir valider la réinscription de <strong>${reinscription.apprenti_prenom} ${reinscription.apprenti_nom}</strong> ?`;
    this.showConfirmDialog = true;
  }

  confirmRefuse(reinscription: Reinscription) {
    this.pendingAction = {
      type: 'refuse',
      id: reinscription.id_reinscription,
      data: reinscription,
    };
    this.dialogTitle = 'Confirmation de refus';
    this.dialogMessage = `Êtes-vous sûr de vouloir refuser la réinscription de <strong>${reinscription.apprenti_prenom} ${reinscription.apprenti_nom}</strong> ?`;
    this.showConfirmDialog = true;
  }

  confirmAction() {
    if (this.pendingAction) {
      const actionMethod = {
        'delete': () => this.executeDelete(this.pendingAction!.data),
        'validate': () => this.executeValidate(this.pendingAction!.data),
        'refuse': () => this.executeRefuse(this.pendingAction!.data)
      }[this.pendingAction.type];

      if (actionMethod) {
        actionMethod();
      }
      this.pendingAction = null;
    }
    this.showConfirmDialog = false;
  }

  cancelAction() {
    this.pendingAction = null;
    this.showConfirmDialog = false;
  }

  // MÉTHODES D'EXÉCUTION DES ACTIONS
  private executeDelete(reinscription: Reinscription) {
    this.reinscriptionService.deleteReinscription(reinscription.id_reinscription!).subscribe({
      next: () => {
        this.actualiserDonnees();
        this.showSuccess('Réinscription supprimée avec succès');
      },
      error: (error) => {
        console.error('❌ Erreur suppression:', error);
        this.showError('Erreur lors de la suppression: ' + error.message);
      }
    });
  }

  private executeValidate(reinscription: Reinscription) {
    this.reinscriptionService.validerReinscription(reinscription.id_reinscription!).subscribe({
      next: () => {
        this.actualiserDonnees();
        this.showSuccess('Réinscription validée avec succès');
      },
      error: (error) => {
        console.error('❌ Erreur validation:', error);
        this.showError('Erreur lors de la validation: ' + error.message);
      }
    });
  }

  private executeRefuse(reinscription: Reinscription) {
    const motif = prompt('Motif du refus:');
    if (motif) {
      this.reinscriptionService.refuserReinscription(reinscription.id_reinscription!, motif).subscribe({
        next: () => {
          this.actualiserDonnees();
          this.showSuccess('Réinscription refusée avec succès');
        },
        error: (error) => {
          console.error('❌ Erreur refus:', error);
          this.showError('Erreur lors du refus: ' + error.message);
        }
      });
    }
  }

  // ACTIONS FORMULAIRES
  async onSubmit() {
    if (this.reinscriptionForm.valid) {
      this.isLoading = true;

      try {
        const formData = this.reinscriptionForm.value;

        const reinscriptionData = {
          id_apprenti: formData.id_apprenti,
          id_formation: formData.id_formation,
          id_inscription_originale: formData.id_inscription_originale,
          statut: 'en_attente' as const,
        };

        this.reinscriptionService.createReinscription(reinscriptionData).subscribe({
          next: () => {
            this.actualiserDonnees();
            this.showSuccess('Réinscription créée avec succès');
            this.closeForm();
          },
          error: (error) => {
            console.error('❌ Erreur création réinscription:', error);
            this.showError('Erreur: ' + (error.message || 'Création échouée'));
            this.isLoading = false;
          },
        });
      } catch (error: any) {
        this.showError('Erreur: ' + (error.message || 'Création échouée'));
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched();
      this.showError('Veuillez remplir tous les champs obligatoires');
    }
  }

  // MÉTHODE CENTRALE POUR ACTUALISER LES DONNÉES
  private actualiserDonnees() {
    console.log('🔄 Actualisation des données en cours...');
    this.isLoading = true;

    this.reinscriptionService.getReinscriptions().subscribe({
      next: (reinscriptions) => {
        this.reinscriptions = reinscriptions;
        this.filteredReinscriptions = [...reinscriptions];
        this.updatePagination();
        this.loadStats();
        this.cdRef.detectChanges();

        console.log('✅ Données actualisées:', reinscriptions.length);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Erreur actualisation:', error);
        this.isLoading = false;
        this.showError('Erreur lors de l\'actualisation: ' + error.message);
      },
    });
  }

  // DIALOGS
  showSuccess(message: string) {
    this.dialogTitle = 'Succès';
    this.dialogMessage = message;
    this.showSuccessDialog = true;
    setTimeout(() => this.closeAllDialogs(), 3000);
  }

  showError(message: string) {
    this.dialogTitle = 'Erreur';
    this.dialogMessage = message;
    this.showErrorDialog = true;
  }

  closeAllDialogs() {
    this.showSuccessDialog = false;
    this.showErrorDialog = false;
    this.showConfirmDialog = false;
  }

  // FORM
  openForm() {
    this.showForm = true;
    this.reinscriptionForm.reset();
    this.inscriptionsOriginales = [];
  }

  closeForm() {
    this.showForm = false;
    this.reinscriptionForm.reset();
    this.inscriptionsOriginales = [];
  }

  private markFormGroupTouched() {
    Object.keys(this.reinscriptionForm.controls).forEach((key) => {
      this.reinscriptionForm.get(key)?.markAsTouched();
    });
  }

  // UTILS
  getApprentiName(id_apprenti: string): string {
    const apprenti = this.apprentis.find((a) => a.id_apprenti === id_apprenti);
    return apprenti ? `${apprenti.prenom} ${apprenti.nom}` : 'N/A';
  }

  getFormationName(id_formation: string): string {
    const formation = this.formations.find((f) => f.id_formation === id_formation);
    return formation ? formation.metier : 'N/A';
  }

  getStatutBadgeClass(statut: string): string {
    return this.reinscriptionService.getStatutBadgeClass(statut);
  }

  getStatutLabel(statut: string): string {
    return this.reinscriptionService.getStatutLabel(statut);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.reinscriptionForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.reinscriptionForm.get(fieldName);

    if (!field?.errors || !field.touched) {
      return '';
    }

    if (field.errors['required']) {
      return 'Ce champ est requis';
    }

    return 'Erreur de validation';
  }
}
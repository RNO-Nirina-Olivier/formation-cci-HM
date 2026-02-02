import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  RapportService,
  RapportAvecDetails,
  GenerateRapportRequest,
  RapportsListResponse,
  RapportsStats,
  RapportComplet,
  GenerateRapportResponse,
} from '../services/rapport.service';
import {
  CertificatService,
  Apprenti,
  Formation,
} from '../services/certificat.service';

@Component({
  selector: 'app-rapport',
  templateUrl: './rapport.component.html',
  styleUrls: ['./rapport.component.css'],
  standalone: false,
})
export class RapportComponent implements OnInit {
  // Données
  rapports: RapportAvecDetails[] = [];
  filteredRapports: RapportAvecDetails[] = [];
  apprentis: Apprenti[] = [];
  formations: Formation[] = [];
  stats: RapportsStats | null = null;

  // Formations de l'apprenti sélectionné
  apprentiFormations: Formation[] = [];
  formationAuto: string = '';
  isLoadingFormations: boolean = false;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  searchTerm = '';

  // États
  isLoading = false;
  isGenerating = false;
  showForm = false;
  showDetails = false;
  showConfirmDelete = false;

  // Dialogues
  dialogTitle = '';
  dialogMessage = '';
  dialogType: 'success' | 'error' | 'confirm' = 'success';

  // Sélections
  selectedRapport: RapportAvecDetails | null = null;
  rapportDetails: RapportComplet | null = null;
  pendingDeleteId: string | null = null;

  // Formulaires
  rapportForm: FormGroup;
  searchForm: FormGroup;

  // Ajouter Math au scope du template
  Math = Math;

  constructor(
    private fb: FormBuilder,
    private rapportService: RapportService,
    private certificatService: CertificatService
  ) {
    this.rapportForm = this.createRapportForm();
    this.searchForm = this.createSearchForm();
  }

  ngOnInit(): void {
    this.testConnection();
    this.loadInitialData();
    this.setupApprentiChangeListener();
  }

  // ==================== INITIALISATION ====================

  testConnection(): void {
    this.rapportService.testConnection().subscribe({
      next: (response) => {
        console.log('✅ Serveur rapport accessible:', response);
      },
      error: (error) => {
        console.error('❌ Serveur rapport non accessible:', error);
        this.showError('Serveur des rapports non accessible');
      },
    });
  }

  // Configuration de l'écouteur pour les changements d'apprenti
  setupApprentiChangeListener(): void {
    console.log("🔧 Configuration de l'écouteur d'apprenti...");

    this.rapportForm
      .get('id_apprenti')
      ?.valueChanges.subscribe((apprentiId) => {
        console.log('🔄 Apprenti changé:', apprentiId);
        this.onApprentiChange(apprentiId);
      });
  }

  // Méthode appelée quand l'apprenti change
  async onApprentiChange(apprentiId: string): Promise<void> {
    console.log('✅ onApprentiChange appelé avec ID:', apprentiId);

    if (apprentiId) {
      console.log('📡 Chargement des formations pour apprenti:', apprentiId);
      await this.chargerFormationsApprenti(apprentiId);
    } else {
      console.log('❌ Aucun apprenti sélectionné');
      this.resetFormationFields();
    }
  }

  // Réinitialiser les champs de formation
  resetFormationFields(): void {
    this.apprentiFormations = [];
    this.formationAuto = '';
    this.rapportForm.patchValue({ id_formation: '' }, { emitEvent: false });
    this.isLoadingFormations = false;
  }

  // Charger les formations d'un apprenti
  async chargerFormationsApprenti(id_apprenti: string): Promise<void> {
    console.log('🚀 Début chargement formations pour:', id_apprenti);
    this.isLoadingFormations = true;
    this.apprentiFormations = [];
    this.formationAuto = 'Chargement...';

    try {
      console.log('📞 Appel API formations...');

      const response = await this.rapportService
        .getFormationsByApprenti(id_apprenti)
        .toPromise();

      console.log('📊 Réponse API complete:', response);

      if (response?.success && response.data && response.data.length > 0) {
        console.log(`✅ ${response.data.length} formation(s) trouvée(s)`);
        console.log('Formations:', response.data);

        this.apprentiFormations = response.data;

        // Gestion auto-formation
        if (response.data.length === 1) {
          console.log('🎯 Une seule formation - auto-sélection');
          const formationId = response.data[0].id_formation;
          console.log('ID formation à sélectionner:', formationId);

          // FORCEZ la mise à jour du formulaire
          this.rapportForm.patchValue({
            id_formation: formationId,
          });

          // Forcez la validation
          const formationControl = this.rapportForm.get('id_formation');
          if (formationControl) {
            formationControl.markAsTouched();
            formationControl.updateValueAndValidity();
            console.log('Valeur après patch:', formationControl.value);
          }

          this.formationAuto = response.data[0].metier || '';
          console.log('✅ Formation auto-sélectionnée:', this.formationAuto);
        } else {
          console.log('📋 Plusieurs formations disponibles');
          this.rapportForm.patchValue({ id_formation: '' });
          this.formationAuto = `${response.data.length} formations disponibles`;
        }
      } else {
        console.log('⚠️ Aucune formation trouvée via API');
        this.apprentiFormations = [];
        this.formationAuto = 'Aucune formation trouvée pour cet apprenti';
        this.rapportForm.patchValue({ id_formation: '' });
      }
    } catch (error) {
      console.error('🔥 Erreur API formations:', error);
      this.formationAuto = 'Erreur de chargement';
      this.apprentiFormations = [];

      // Fallback: utiliser la méthode locale
      this.fallbackFormationsApprenti(id_apprenti);
    } finally {
      this.isLoadingFormations = false;
      console.log('🏁 Fin chargement formations');
      console.log('État final du formulaire:', {
        apprenti: this.rapportForm.get('id_apprenti')?.value,
        formation: this.rapportForm.get('id_formation')?.value,
        valid: this.rapportForm.valid,
      });
    }
  }

  // Fallback si l'API n'est pas disponible
  fallbackFormationsApprenti(id_apprenti: string): void {
    console.log('🔄 Méthode fallback pour apprenti:', id_apprenti);

    // Chercher dans les rapports existants
    const rapportsApprenti = this.rapports.filter(
      (r) => r.id_apprenti === id_apprenti
    );
    console.log('📄 Rapports trouvés:', rapportsApprenti.length);

    if (rapportsApprenti.length > 0) {
      // Extraire les formations uniques des rapports
      const formationsIds = [
        ...new Set(rapportsApprenti.map((r) => r.id_formation)),
      ];
      console.log('🎯 Formations IDs:', formationsIds);

      // Récupérer les détails des formations
      this.apprentiFormations = this.formations.filter((f) =>
        formationsIds.includes(f.id_formation)
      );
      console.log(
        '✅ Formations trouvées via fallback:',
        this.apprentiFormations.length
      );
    } else {
      // Utiliser toutes les formations comme fallback
      this.apprentiFormations = [...this.formations];
      console.log(
        '📋 Toutes les formations chargées comme fallback:',
        this.apprentiFormations.length
      );
    }

    // Gestion auto-formation
    if (this.apprentiFormations.length === 1) {
      this.rapportForm.patchValue({
        id_formation: this.apprentiFormations[0].id_formation,
      });
      this.formationAuto = this.apprentiFormations[0].metier;
      console.log('✅ Formation auto-sélectionnée via fallback');
    } else if (this.apprentiFormations.length > 1) {
      this.formationAuto = `${this.apprentiFormations.length} formations disponibles`;
      console.log('📋 Plusieurs formations via fallback');
    } else {
      this.formationAuto = 'Aucune formation disponible';
      console.log('❌ Aucune formation via fallback');
    }
  }

  async loadInitialData(): Promise<void> {
    this.isLoading = true;
    try {
      // Charger en parallèle
      const [rapportsData, apprentisData, formationsData, statsData] =
        await Promise.all([
          this.rapportService.getAllRapportsDB().toPromise(),
          this.certificatService.getApprentis().toPromise(),
          this.certificatService.getFormations().toPromise(),
          this.rapportService.getRapportsStats().toPromise(),
        ]);

      this.rapports = rapportsData?.data || [];
      this.filteredRapports = [...this.rapports];
      this.apprentis = apprentisData || [];
      this.formations = formationsData || [];
      this.stats = statsData?.data || null;

      // Mettre à jour la pagination
      this.totalItems = rapportsData?.pagination?.total || this.rapports.length;
      this.totalPages = Math.ceil(this.totalItems / this.pageSize);

      console.log(`✅ ${this.rapports.length} rapport(s) chargé(s)`);
      console.log(`📚 ${this.formations.length} formation(s) disponibles`);
      console.log(`👥 ${this.apprentis.length} apprenti(s) disponibles`);

      // DEBUG - Afficher les premiers éléments
      if (this.apprentis.length > 0) {
        console.log('Premier apprenti:', this.apprentis[0]);
      }
      if (this.formations.length > 0) {
        console.log('Première formation:', this.formations[0]);
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      this.showError('Erreur lors du chargement des données');
    } finally {
      this.isLoading = false;
    }
  }

  // ==================== FORMULAIRES ====================

  createRapportForm(): FormGroup {
    return this.fb.group({
      id_apprenti: ['', Validators.required],
      id_formation: ['', Validators.required],
      type_rapport: ['formation_complet'],
      cree_par: [null],
    });
  }

  createSearchForm(): FormGroup {
    return this.fb.group({
      search: [''],
      statut: ['tous'],
      type_rapport: ['tous'],
      date_debut: [''],
      date_fin: [''],
    });
  }

  // ==================== GESTION RAPPORTS ====================

  openForm(): void {
    this.showForm = true;
    this.rapportForm.reset({
      type_rapport: 'formation_complet',
    });
    this.resetFormationFields();
  }

  closeForm(): void {
    this.showForm = false;
    this.rapportForm.reset();
    this.resetFormationFields();
  }

  async genererRapport(): Promise<void> {
    if (this.rapportForm.invalid) {
      this.markFormGroupTouched(this.rapportForm);
      this.showError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.isGenerating = true;
    const formValue = this.rapportForm.value;

    try {
      const request: GenerateRapportRequest = {
        id_apprenti: formValue.id_apprenti,
        id_formation: formValue.id_formation,
        type_rapport: formValue.type_rapport,
        cree_par: formValue.cree_par,
      };

      const response = await this.rapportService
        .genererRapportDB(request)
        .toPromise();

      if (response?.success) {
        this.showSuccess('Rapport généré et sauvegardé avec succès');
        this.closeForm();
        this.loadInitialData();
      } else {
        this.showError(response?.message || 'Erreur lors de la génération');
      }
    } catch (error: any) {
      console.error('Erreur génération rapport:', error);
      this.showError(
        error.message || 'Erreur lors de la génération du rapport'
      );
    } finally {
      this.isGenerating = false;
    }
  }

  // ==================== ACTIONS RAPPORTS ====================

  async telechargerRapport(rapport: RapportAvecDetails): Promise<void> {
    if (!rapport.id_rapport) {
      this.showError('ID du rapport manquant');
      return;
    }

    this.isLoading = true;
    try {
      const pdfBlob = await this.rapportService
        .telechargerRapportDB(rapport.id_rapport)
        .toPromise();

      if (pdfBlob && pdfBlob.size > 0) {
        const fileName = this.rapportService.generateRapportFileName(rapport);
        this.rapportService.downloadBlob(pdfBlob, fileName);
        this.showSuccess('Rapport téléchargé avec succès');
      } else {
        throw new Error('PDF vide reçu');
      }
    } catch (error: any) {
      console.error('Erreur téléchargement:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async visualiserRapport(rapport: RapportAvecDetails): Promise<void> {
    if (!rapport.id_rapport) {
      this.showError('ID du rapport manquant');
      return;
    }

    this.isLoading = true;
    try {
      const pdfBlob = await this.rapportService
        .visualiserRapportDB(rapport.id_rapport)
        .toPromise();

      if (pdfBlob && pdfBlob.size > 0) {
        this.rapportService.openPdfInNewTab(pdfBlob);
      } else {
        throw new Error('PDF vide reçu');
      }
    } catch (error: any) {
      console.error('Erreur visualisation:', error);
      this.showError(error.message || 'Erreur lors de la visualisation');
    } finally {
      this.isLoading = false;
    }
  }

  async voirDetails(rapport: RapportAvecDetails): Promise<void> {
    this.selectedRapport = rapport;
    this.isLoading = true;

    try {
      const response = await this.rapportService
        .getRapportDonnees(rapport.id_apprenti, rapport.id_formation)
        .toPromise();

      if (response?.success && response.data) {
        this.rapportDetails = response.data;
        this.showDetails = true;
      } else {
        this.rapportDetails = null;
        this.showDetails = true;
      }
    } catch (error) {
      console.error('Erreur chargement détails:', error);
      this.rapportDetails = null;
      this.showDetails = true;
    } finally {
      this.isLoading = false;
    }
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedRapport = null;
    this.rapportDetails = null;
  }

  confirmerSuppression(rapport: RapportAvecDetails): void {
    this.pendingDeleteId = rapport.id_rapport;
    this.dialogTitle = 'Confirmer la suppression';
    this.dialogMessage = `Êtes-vous sûr de vouloir supprimer le rapport <strong>${rapport.numero_rapport}</strong> ?`;
    this.dialogType = 'confirm';
    this.showConfirmDelete = true;
  }

  async confirmerSuppressionAction(): Promise<void> {
    if (!this.pendingDeleteId) return;

    this.isLoading = true;
    try {
      const response = await this.rapportService
        .deleteRapportDB(this.pendingDeleteId)
        .toPromise();

      if (response?.success) {
        this.showSuccess(response.message || 'Rapport supprimé avec succès');
        this.loadInitialData();
      } else {
        this.showError(response?.message || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      console.error('Erreur suppression:', error);
      this.showError(error.message || 'Erreur lors de la suppression');
    } finally {
      this.isLoading = false;
      this.closeConfirmDelete();
    }
  }

  closeConfirmDelete(): void {
    this.showConfirmDelete = false;
    this.pendingDeleteId = null;
    this.dialogTitle = '';
    this.dialogMessage = '';
  }

  // ==================== RECHERCHE ET FILTRES ====================

  rechercher(): void {
    const searchValue = this.searchForm.get('search')?.value || '';
    const statutValue = this.searchForm.get('statut')?.value;
    const typeValue = this.searchForm.get('type_rapport')?.value;

    this.filteredRapports = this.rapports.filter((rapport) => {
      const matchSearch =
        !searchValue ||
        rapport.apprenti_nom
          ?.toLowerCase()
          .includes(searchValue.toLowerCase()) ||
        rapport.apprenti_prenom
          ?.toLowerCase()
          .includes(searchValue.toLowerCase()) ||
        rapport.formation_metier
          ?.toLowerCase()
          .includes(searchValue.toLowerCase()) ||
        rapport.numero_rapport
          .toLowerCase()
          .includes(searchValue.toLowerCase());

      const matchStatut =
        statutValue === 'tous' || rapport.statut === statutValue;

      const matchType =
        typeValue === 'tous' || rapport.type_rapport === typeValue;

      return matchSearch && matchStatut && matchType;
    });

    this.currentPage = 1;
    this.totalItems = this.filteredRapports.length;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
  }

  reinitialiserRecherche(): void {
    this.searchForm.reset({
      search: '',
      statut: 'tous',
      type_rapport: 'tous',
      date_debut: '',
      date_fin: '',
    });
    this.filteredRapports = [...this.rapports];
    this.currentPage = 1;
    this.totalItems = this.rapports.length;
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
  }

  // ==================== PAGINATION ====================

  get paginatedRapports(): RapportAvecDetails[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredRapports.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(
      1,
      this.currentPage - Math.floor(maxVisiblePages / 2)
    );
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  // ==================== DIALOGUES ====================

  showSuccess(message: string): void {
    this.dialogTitle = 'Succès';
    this.dialogMessage = message;
    this.dialogType = 'success';

    setTimeout(() => {
      this.closeDialog();
    }, 3000);
  }

  showError(message: string): void {
    this.dialogTitle = 'Erreur';
    this.dialogMessage = message;
    this.dialogType = 'error';
  }

  closeDialog(): void {
    this.dialogTitle = '';
    this.dialogMessage = '';
  }

  // ==================== GETTERS UTILES ====================

  // Pour afficher le nom de l'apprenti sélectionné
  get selectedApprentiName(): string {
    const apprentiId = this.rapportForm.get('id_apprenti')?.value;
    if (!apprentiId) return '';

    const apprenti = this.apprentis.find((a) => a.id_apprenti === apprentiId);
    return apprenti ? `${apprenti.prenom} ${apprenti.nom}` : 'Apprenti inconnu';
  }

  // Pour afficher le nom de la formation sélectionnée
  get selectedFormationName(): string {
    const formationId = this.rapportForm.get('id_formation')?.value;
    if (!formationId) return '';

    const formation = this.formations.find(
      (f) => f.id_formation === formationId
    );
    return formation
      ? `${formation.metier} (${formation.type_formation})`
      : 'Formation inconnue';
  }

  // Vérifier si une formation est disponible pour l'apprenti
  isFormationAvailableForApprenti(formationId: string): boolean {
    const apprentiId = this.rapportForm.get('id_apprenti')?.value;
    if (!apprentiId) return false;

    return this.apprentiFormations.some((f) => f.id_formation === formationId);
  }

  // ==================== FORMATAGE ====================

  formatDate(date: string): string {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('fr-FR');
    } catch {
      return date;
    }
  }

  formatDateTime(date: string): string {
    if (!date) return '';
    try {
      return new Date(date).toLocaleString('fr-FR');
    } catch {
      return date;
    }
  }

  getStatutBadgeClass(statut: string): string {
    switch (statut) {
      case 'generé':
        return 'badge bg-success';
      case 'en_cours':
        return 'badge bg-warning';
      case 'erreur':
        return 'badge bg-danger';
      case 'supprimé':
        return 'badge bg-secondary';
      default:
        return 'badge bg-light text-dark';
    }
  }

  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'formation_complet':
        return 'badge bg-primary';
      case 'resultats':
        return 'badge bg-info';
      case 'presence':
        return 'badge bg-warning';
      default:
        return 'badge bg-light text-dark';
    }
  }

  // ==================== UTILITAIRES ====================

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getFormationNom(id_formation: string): string {
    const formation = this.formations.find(
      (f) => f.id_formation === id_formation
    );
    return formation
      ? `${formation.metier} (${formation.type_formation})`
      : 'Formation inconnue';
  }

  getApprentiNom(id_apprenti: string): string {
    const apprenti = this.apprentis.find((a) => a.id_apprenti === id_apprenti);
    return apprenti ? `${apprenti.prenom} ${apprenti.nom}` : 'Apprenti inconnu';
  }

  // ==================== GESTION DES ERREURS FORMULAIRE ====================

  getApprentiErrorMessage(): string {
    const control = this.rapportForm.get('id_apprenti');
    if (control?.hasError('required') && control?.touched) {
      return 'Veuillez sélectionner un apprenti';
    }
    return '';
  }

  getFormationErrorMessage(): string {
    const control = this.rapportForm.get('id_formation');
    if (control?.hasError('required') && control?.touched) {
      return 'Veuillez sélectionner une formation';
    }
    return '';
  }

  // ==================== FORMATAGE NOMBRE ====================

  formatNumber(value: number): string {
    return value ? value.toFixed(2) : '0.00';
  }

  formatPercentage(value: number): string {
    return value ? `${value.toFixed(1)}%` : '0%';
  }

  // ==================== CALCUL DURÉE ====================

  calculateDuration(dateDebut: string, dateFin: string): number {
    if (!dateDebut || !dateFin) return 0;

    try {
      const start = new Date(dateDebut);
      const end = new Date(dateFin);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    } catch (error) {
      console.error('Erreur calcul durée:', error);
      return 0;
    }
  }

  getFormationDuration(formation: any): string {
    const jours = this.calculateDuration(
      formation.date_debut,
      formation.date_fin
    );
    return jours > 0 ? `${jours} jours` : 'Durée non spécifiée';
  }

  // ==================== MÉTHODES DE DEBUG ====================

  debugForm(): void {
    console.log('=== DEBUG FORMULAIRE ===');
    console.log('Apprenti:', this.rapportForm.get('id_apprenti')?.value);
    console.log('Formation:', this.rapportForm.get('id_formation')?.value);
    console.log('Formations trouvées:', this.apprentiFormations);
    console.log('Formation auto:', this.formationAuto);
    console.log('Formulaire valide:', this.rapportForm.valid);
    console.log('Erreurs:', this.rapportForm.errors);
    console.log(
      'Erreur apprenti:',
      this.rapportForm.get('id_apprenti')?.errors
    );
    console.log(
      'Erreur formation:',
      this.rapportForm.get('id_formation')?.errors
    );
  }

  testAutoFormation(): void {
    if (this.apprentis.length > 0) {
      const testApprenti = this.apprentis[0];
      console.log('🧪 Test avec apprenti:', testApprenti);
      this.rapportForm.patchValue({ id_apprenti: testApprenti.id_apprenti });
      this.onApprentiChange(testApprenti.id_apprenti);
    }
  }
}

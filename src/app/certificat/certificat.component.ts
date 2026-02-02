import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  CertificatService,
  Certificat,
  Apprenti,
  Formation,
  StatsCertificats,
  NumeroCheckResponse,
  NextNumberResponse,
  ArchiveCertificat,
  ArchiveStats,
  ApprentiAvecNotes,
} from '../services/certificat.service';

interface CertificatEnriched extends Certificat {
  apprenti_nom?: string;
  apprenti_prenom?: string;
  formation_metier?: string;
  type_formation?: string;
  date_naissance?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  niveau?: string;
  duree_formation?: string;
  mention?: string;
  date_debut?: string;
  date_fin?: string;
  moyenne_theorique?: number;
  moyenne_pratique?: number;
  moyenne_generale?: number;
}

@Component({
  selector: 'app-certificat',
  templateUrl: './certificat.component.html',
  styleUrls: ['./certificat.component.css'],
  standalone: false,
})
export class CertificatComponent implements OnInit {
  // Propriétés existantes
  certificats: CertificatEnriched[] = [];
  filteredCertificats: CertificatEnriched[] = [];
  apprentis: Apprenti[] = [];
  formations: Formation[] = [];
  stats: StatsCertificats | null = null;
  apprentisParFormation: ApprentiAvecNotes[] = [];
  apprentisFiltres: ApprentiAvecNotes[] = [];
  formationSelectionnee: Formation | null = null;

  showForm = false;
  isEditing = false;
  isLoading = false;
  searchTerm = '';

  // Pagination
  currentPage: number = 1;
  pageSize: number = 6;
  totalPages: number = 0;
  paginatedCertificats: CertificatEnriched[] = [];
  currentView: 'cards' | 'table' = 'cards';

  // États des dialogues
  showSuccessDialog = false;
  showErrorDialog = false;
  showConfirmDialog = false;
  dialogMessage = '';
  dialogTitle = '';
  pendingDeleteId: string | null = null;

  // État de téléchargement
  isDownloading = false;
  downloadingCertificatId: string | null = null;

  // Nouvelles propriétés pour les archives
  archives: ArchiveCertificat[] = [];
  filteredArchives: ArchiveCertificat[] = [];
  showArchives = false;
  selectedArchives: string[] = [];
  private deleteType: string | null = null;

  archiveStats = {
    total_archives: 0,
    formations_archivees: 0,
    apprentis_archives: 0,
    tres_bien: 0,
    bien: 0,
    assez_bien: 0,
    passable: 0,
  };
  certificatForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private certificatService: CertificatService
  ) {
    this.certificatForm = this.createForm();
  }

  ngOnInit() {
    this.testServerConnection();
    this.loadData();
    this.loadStats();
  }

  // Test de connexion au serveur
  testServerConnection() {
    console.log('🔍 Test de connexion au serveur...');
    this.certificatService.testConnection().subscribe({
      next: (response) => {
        console.log('✅ Serveur backend accessible:', response);
      },
      error: (error) => {
        console.error('❌ Serveur backend non accessible:', error);
        this.showError(
          'Serveur backend non démarré. Lancez le serveur Node.js sur le port 3000.'
        );
      },
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      id_certificat: [null],
      id_formation: ['', Validators.required],
      id_apprenti: ['', Validators.required],
      date_delivrance: [
        new Date().toISOString().split('T')[0],
        Validators.required,
      ],
      numero_certificat: ['', [Validators.required, Validators.minLength(5)]],
      fichier_pdf: ['', Validators.required],
    });
  }

  // MÉTHODES POUR LE TEMPLATE
  getStartIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(
      this.currentPage * this.pageSize,
      this.filteredCertificats.length
    );
  }

  switchView(view: 'cards' | 'table') {
    this.currentView = view;
  }

  getMentionClass(mention: string | undefined): string {
    if (!mention) return '';

    switch (mention) {
      case 'Très Bien':
        return 'excellent';
      case 'Bien':
        return 'good';
      case 'Assez Bien':
        return 'average';
      case 'Passable':
        return 'passable';
      case 'Non admis':
        return 'failed';
      default:
        return '';
    }
  }

  getCurrentPageDisplay(): string {
    return `${this.currentPage}/${this.totalPages}`;
  }

  getMentionCount(mention: string): number {
    return this.filteredCertificats.filter(
      (certificat) => certificat.mention === mention
    ).length;
  }

  // CHARGEMENT DES DONNÉES
  async loadData() {
    this.isLoading = true;
    try {
      const [certificatsData, apprentisData, formationsData] =
        await Promise.all([
          this.certificatService.getCertificats().toPromise(),
          this.certificatService.getApprentis().toPromise(),
          this.certificatService.getFormations().toPromise(),
        ]);

      this.certificats = certificatsData || [];
      this.apprentis = apprentisData || [];
      this.formations = formationsData || [];

      this.filteredCertificats = [...this.certificats];
      this.updatePagination();
      console.log(`✅ ${this.certificats.length} certificats chargés`);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      this.showError('Erreur lors du chargement des données');
      this.loadMockData();
    } finally {
      this.isLoading = false;
    }
  }

  // CHARGEMENT DES STATISTIQUES
  async loadStats() {
    try {
      const statsData = await this.certificatService
        .getCertificatsStats()
        .toPromise();
      this.stats = statsData || null;
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      this.stats = null;
    }
  }

  // MÉTHODES POUR LES DIALOGUES
  showSuccess(message: string) {
    this.dialogTitle = 'Succès';
    this.dialogMessage = message;
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

  showDeleteConfirmation(id: string, numeroCertificat: string) {
    this.pendingDeleteId = id;
    this.dialogTitle = 'Confirmer la suppression';
    this.dialogMessage = `Êtes-vous sûr de vouloir supprimer le certificat <strong>${numeroCertificat}</strong> ?<br><br>Cette action est irréversible.`;
    this.showConfirmDialog = true;
    this.deleteType = 'certificat';
  }

  closeAllDialogs() {
    this.showSuccessDialog = false;
    this.showErrorDialog = false;
    this.showConfirmDialog = false;
    this.pendingDeleteId = null;
    this.dialogMessage = '';
    this.dialogTitle = '';
    this.deleteType = null;
  }

  // FILTRES ET RECHERCHE
  applyFilters() {
    if (this.searchTerm) {
      this.certificatService.searchCertificats(this.searchTerm).subscribe({
        next: (resultats) => {
          this.filteredCertificats = resultats;
          this.updatePagination();
        },
        error: (error) => {
          console.error('Erreur recherche:', error);
          this.filterClientSide();
        },
      });
    } else {
      this.filterClientSide();
    }
  }

  private filterClientSide() {
    this.filteredCertificats = this.certificats.filter((certificat) => {
      return (
        !this.searchTerm ||
        certificat.apprenti_nom
          ?.toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        certificat.apprenti_prenom
          ?.toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        certificat.formation_metier
          ?.toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        certificat.numero_certificat
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        certificat.mention
          ?.toLowerCase()
          .includes(this.searchTerm.toLowerCase())
      );
    });

    this.updatePagination();
  }

  // PAGINATION
  updatePagination() {
    this.totalPages = Math.ceil(
      this.filteredCertificats.length / this.pageSize
    );
    this.currentPage = Math.max(1, Math.min(this.currentPage, this.totalPages));

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedCertificats = this.filteredCertificats.slice(
      startIndex,
      endIndex
    );
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
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

  // GÉNÉRATION DE NUMÉRO DE CERTIFICAT
  async generateNumeroCertificat(): Promise<string> {
    try {
      const response: NextNumberResponse | undefined =
        await this.certificatService.getNextCertificatNumber().toPromise();

      if (response?.nextNumber) {
        return response.nextNumber;
      } else {
        throw new Error('Réponse invalide du serveur');
      }
    } catch (error) {
      console.error('Erreur génération numéro certificat:', error);
      // Fallback manuel
      const year = new Date().getFullYear();
      const timestamp = new Date().getTime();
      return `CCI-HM-CERT-${year}-${timestamp.toString().slice(-3)}`;
    }
  }

  // GESTION DU FORMULAIRE
  closeForm() {
    this.showForm = false;
    this.certificatForm.reset();
    this.isEditing = false;
    this.apprentisParFormation = [];
    this.apprentisFiltres = [];
    this.formationSelectionnee = null;
  }

  generateNomFichierPDF(): string {
    const idApprenti = this.certificatForm?.get('id_apprenti')?.value;
    const idFormation = this.certificatForm?.get('id_formation')?.value;

    if (idApprenti && idFormation) {
      const apprenti = this.apprentisParFormation.find(
        (a) => a.id_apprenti === idApprenti
      );
      const formation = this.formations.find(
        (f) => f.id_formation === idFormation
      );

      if (apprenti && formation) {
        const nomNormalise = `${apprenti.prenom}-${apprenti.nom}`
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');

        const formationNormalisee = formation.metier
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');

        return `certificat-${nomNormalise}-${formationNormalisee}.pdf`;
      }
    }
    return 'certificat.pdf';
  }

  getApprentiSelectionne(): ApprentiAvecNotes | null {
    const idApprenti = this.certificatForm.get('id_apprenti')?.value;
    if (!idApprenti) return null;

    return (
      this.apprentisParFormation.find((a) => a.id_apprenti === idApprenti) ||
      null
    );
  }

  onApprentiChange() {
    const idApprenti = this.certificatForm.get('id_apprenti')?.value;

    if (idApprenti) {
      // Générer le nom du fichier PDF
      const fichierPdf = this.generateNomFichierPDF();
      this.certificatForm.patchValue({ fichier_pdf: fichierPdf });

      // Afficher les détails de l'apprenti sélectionné
      const apprenti = this.getApprentiSelectionne();
      if (apprenti) {
        console.log('Apprenti sélectionné:', {
          moyenne_theorique: apprenti.moyenne_theorique,
          note_pratique: apprenti.note_pratique,
          moyenne_generale: apprenti.moyenne_generale,
          statut: apprenti.statut_admission,
          eligible: apprenti.eligible_certificat,
        });
      }
    }
  }

  async openForm(certificat?: CertificatEnriched) {
    this.isEditing = !!certificat;

    if (certificat) {
      // Mode édition - pré-remplir avec les valeurs existantes
      this.certificatForm.patchValue({
        id_certificat: certificat.id_certificat,
        id_formation: certificat.id_formation,
        id_apprenti: certificat.id_apprenti,
        date_delivrance: certificat.date_delivrance,
        numero_certificat: certificat.numero_certificat,
        fichier_pdf: certificat.fichier_pdf || '',
      });

      // Charger les apprentis pour la formation sélectionnée
      this.onFormationChange();
    } else {
      // Mode création - réinitialiser
      this.certificatForm.reset({
        date_delivrance: new Date().toISOString().split('T')[0],
      });

      // Générer un numéro unique
      const numeroCertificat = await this.generateNumeroCertificat();
      this.certificatForm.patchValue({
        numero_certificat: numeroCertificat,
      });
    }

    this.showForm = true;
  }

  async onSubmit() {
    if (this.certificatForm.valid) {
      this.isLoading = true;

      try {
        const formValue = this.certificatForm.value;

        const certificatData = {
          id_apprenti: formValue.id_apprenti,
          id_formation: formValue.id_formation,
          date_delivrance: formValue.date_delivrance,
          numero_certificat: formValue.numero_certificat,
          fichier_pdf: formValue.fichier_pdf,
        };

        console.log("📤 Envoi des données à l'API:", certificatData);

        // Vérifier si le numéro existe déjà
        const numeroExists: NumeroCheckResponse | undefined =
          await this.certificatService
            .checkNumeroExists(
              certificatData.numero_certificat,
              formValue.id_certificat || undefined
            )
            .toPromise();

        if (numeroExists?.exists) {
          this.showError(
            'Ce numéro de certificat existe déjà. Veuillez en choisir un autre.'
          );
          this.isLoading = false;
          return;
        }

        if (this.isEditing && formValue.id_certificat) {
          const updatedCertificat = await this.certificatService
            .updateCertificat(formValue.id_certificat, {
              ...certificatData,
              id_certificat: formValue.id_certificat,
            })
            .toPromise();

          if (updatedCertificat) {
            const index = this.certificats.findIndex(
              (c) => c.id_certificat === formValue.id_certificat
            );
            if (index !== -1) {
              this.certificats[index] = updatedCertificat;
            }
            this.showSuccess('Certificat modifié avec succès');
            this.loadData();
            this.loadStats();
          }
        } else {
          // Utiliser la création avec notes automatiques
          const newCertificat = await this.certificatService
            .createCertificatAvecNotes(certificatData)
            .toPromise();

          if (newCertificat) {
            this.certificats.push(newCertificat);
            this.showSuccess('Certificat créé avec succès');
            this.loadData();
            this.loadStats();
          }
        }

        this.applyFilters();
        this.closeForm();
      } catch (error: any) {
        console.error('❌ Erreur sauvegarde certificat:', error);

        let errorMessage = 'Erreur lors de la sauvegarde';
        if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error && error.error.error) {
          errorMessage = error.error.error;
        } else if (error.status === 400) {
          errorMessage = 'Données invalides envoyées au serveur';
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.showError(errorMessage);
      } finally {
        this.isLoading = false;
      }
    } else {
      this.markFormGroupTouched();
      this.showError('Veuillez corriger les erreurs dans le formulaire');
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.certificatForm.controls).forEach((key) => {
      const control = this.certificatForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.certificatForm.get(fieldName);
    if (field?.errors?.['required']) return 'Ce champ est requis';
    if (field?.errors?.['minlength'])
      return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
    return '';
  }

  // SUPPRESSION
  deleteCertificat(id: string) {
    const certificat = this.certificats.find((c) => c.id_certificat === id);
    if (certificat) {
      this.showDeleteConfirmation(id, certificat.numero_certificat);
    }
  }

  async confirmDelete() {
    if (this.pendingDeleteId) {
      try {
        if (this.deleteType === 'archive') {
          // Suppression d'un seul certificat archivé
          await this.certificatService
            .supprimerArchive(this.pendingDeleteId)
            .toPromise();
          this.showSuccess('Certificat supprimé définitivement');
        } else if (this.deleteType === 'archives_multiple') {
          // Suppression multiple
          for (const id of this.selectedArchives) {
            await this.certificatService.supprimerArchive(id).toPromise();
          }
          this.showSuccess(
            `${this.selectedArchives.length} certificat(s) supprimé(s) définitivement`
          );
          this.selectedArchives = [];
        } else if (this.deleteType === 'vider_archives') {
          // Vidage complet
          const result = await this.certificatService
            .viderArchives()
            .toPromise();
          if (result) {
            this.showSuccess(result.message);
          }
        } else {
          // Suppression normale d'un certificat actif
          await this.certificatService
            .deleteCertificat(this.pendingDeleteId)
            .toPromise();
          this.certificats = this.certificats.filter(
            (c) => c.id_certificat !== this.pendingDeleteId
          );
          this.showSuccess('Certificat supprimé avec succès');
          this.loadStats();
        }

        this.applyFilters();
        if (this.showArchives) {
          this.loadArchives();
        }
      } catch (error) {
        console.error('Erreur suppression:', error);
        this.showError('Erreur lors de la suppression');
      } finally {
        this.closeAllDialogs();
      }
    }
  }

  // TÉLÉCHARGEMENT PDF
  async downloadCertificat(certificat: CertificatEnriched) {
    if (!certificat.id_certificat) {
      this.showError('ID du certificat manquant');
      return;
    }

    this.isDownloading = true;
    this.downloadingCertificatId = certificat.id_certificat;

    try {
      console.log(
        '📥 Début téléchargement PDF pour:',
        certificat.numero_certificat
      );

      const pdfBlob = await this.certificatService
        .generatePdf(certificat.id_certificat)
        .toPromise();

      if (pdfBlob && pdfBlob.size > 0) {
        console.log('✅ PDF reçu, taille:', pdfBlob.size, 'bytes');

        const fileName =
          certificat.fichier_pdf ||
          `certificat-${certificat.numero_certificat}.pdf`;

        // Créer une URL temporaire pour le blob
        const url = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';

        // Ajouter au DOM, cliquer et supprimer
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Libérer l'URL après un délai
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);

        this.showSuccess('Certificat téléchargé avec succès');
      } else {
        throw new Error('PDF vide reçu du serveur');
      }
    } catch (error: any) {
      console.error('❌ Erreur téléchargement certificat:', error);
    } finally {
      this.isDownloading = false;
      this.downloadingCertificatId = null;
    }
  }

  isDownloadingCertificat(certificatId: string): boolean {
    return this.isDownloading && this.downloadingCertificatId === certificatId;
  }

  // FORMATAGE DES MOYENNES
  formatMoyenne(moyenne: any): string;
  formatMoyenne(certificat: CertificatEnriched): string;
  formatMoyenne(archive: ArchiveCertificat): string;
  formatMoyenne(input: any): string {
    // Si c'est un nombre direct
    if (typeof input === 'number') {
      return this.formatNombre(input);
    }

    // Si c'est une chaîne de caractères
    if (typeof input === 'string') {
      const num = Number(input);
      return !isNaN(num) ? num.toFixed(2) : '0.00';
    }

    // Si c'est un certificat ou archive
    if (input && typeof input === 'object') {
      // Pour les archives, utiliser moyenne_generale directement
      if ('date_archivage' in input) {
        const archive = input as ArchiveCertificat;
        return this.formatNombre(archive.moyenne_generale);
      }

      // Pour les certificats normaux
      const certificat = input as CertificatEnriched;

      // Priorité à la moyenne générale si elle existe
      if (
        certificat.moyenne_generale !== undefined &&
        certificat.moyenne_generale !== null
      ) {
        return this.formatNombre(certificat.moyenne_generale);
      }

      // Sinon calculer selon le type de formation
      if (certificat.type_formation === 'Formation duale') {
        const theorique = certificat.moyenne_theorique || 0;
        const pratique = certificat.moyenne_pratique || 0;
        return this.formatNombre((theorique + pratique) / 2);
      } else {
        return this.formatNombre(certificat.moyenne_theorique);
      }
    }

    return '0.00';
  }

  /**
   * Formate un nombre en string avec 2 décimales
   */
  private formatNombre(valeur: any): string {
    if (valeur === null || valeur === undefined || valeur === '') {
      return '0.00';
    }

    const num = Number(valeur);

    if (isNaN(num) || !isFinite(num)) {
      return '0.00';
    }

    return num.toFixed(2);
  }

  // ==================== MÉTHODES POUR LES ARCHIVES ====================

  toggleArchives() {
    this.showArchives = !this.showArchives;
    if (this.showArchives) {
      this.loadArchives();
    }
  }

  async loadArchives() {
    this.isLoading = true;
    try {
      const archivesData = await this.certificatService
        .getArchives()
        .toPromise();
      this.archives = archivesData || [];
      this.filteredArchives = [...this.archives];
      this.selectedArchives = [];

      // Charger les statistiques des archives
      try {
        const statsData = await this.certificatService
          .getArchiveStats()
          .toPromise();
        this.archiveStats = {
          ...this.archiveStats,
          ...statsData,
        };
      } catch (statsError) {
        console.error('Erreur statistiques archives:', statsError);
      }

      console.log(
        `📁 ${this.archives.length} certificat(s) archivé(s) chargé(s)`
      );
    } catch (error) {
      console.error('Erreur chargement archives:', error);
      this.showError('Erreur lors du chargement des archives');
      this.archives = [];
      this.filteredArchives = [];
    } finally {
      this.isLoading = false;
    }
  }

  // Sélection/désélection des archives
  toggleArchiveSelection(id: string) {
    const index = this.selectedArchives.indexOf(id);
    if (index > -1) {
      this.selectedArchives.splice(index, 1);
    } else {
      this.selectedArchives.push(id);
    }
  }

  selectAllArchives() {
    if (this.selectedArchives.length === this.filteredArchives.length) {
      this.selectedArchives = [];
    } else {
      this.selectedArchives = this.filteredArchives.map(
        (archive) => archive.id_certificat!
      );
    }
  }

  isArchiveSelected(id: string): boolean {
    return this.selectedArchives.includes(id);
  }

  // Actions sur les archives
  async restaurerCertificat(id: string) {
    try {
      await this.certificatService.restaurerCertificat(id).toPromise();
      this.showSuccess('Certificat restauré avec succès');
      this.loadArchives();
      this.loadData(); // Recharger les certificats actifs
    } catch (error) {
      console.error('Erreur restauration:', error);
      this.showError('Erreur lors de la restauration du certificat');
    }
  }

  async supprimerArchive(id: string) {
    const archive = this.archives.find((a) => a.id_certificat === id);
    if (archive) {
      this.pendingDeleteId = id;
      this.dialogTitle = 'Confirmer la suppression';
      this.dialogMessage = `Supprimer définitivement le certificat ${archive.numero_certificat} ?`;
      this.showConfirmDialog = true;
      this.deleteType = 'archive';
    }
  }

  async supprimerArchivesSelectionnees() {
    if (this.selectedArchives.length === 0) {
      this.showError('Aucun certificat sélectionné');
      return;
    }

    this.pendingDeleteId = 'multiple';
    this.dialogTitle = 'Confirmer la suppression';
    this.dialogMessage = `Supprimer définitivement ${this.selectedArchives.length} certificat(s) archivé(s) ?`;
    this.showConfirmDialog = true;
    this.deleteType = 'archives_multiple';
  }

  async viderToutesArchives() {
    this.pendingDeleteId = 'all';
    this.dialogTitle = 'Confirmer la suppression';
    this.dialogMessage =
      'Vider toutes les archives ? Cette action est irréversible !';
    this.showConfirmDialog = true;
    this.deleteType = 'vider_archives';
  }

  // Archivage automatique
  async archivageAutomatique() {
    this.isLoading = true;
    try {
      const result = await this.certificatService
        .archivageAutomatique()
        .toPromise();
      if (result) {
        this.showSuccess(result.message);
      }
      this.loadData();
      if (this.showArchives) {
        this.loadArchives();
      }
    } catch (error) {
      console.error('Erreur archivage automatique:', error);
      this.showError("Erreur lors de l'archivage automatique");
    } finally {
      this.isLoading = false;
    }
  }

  // DONNÉES MOCKÉES DE SECOURS
  private loadMockData() {
    console.log('📋 Chargement des données mockées...');

    this.apprentis = [
      {
        id_apprenti: 'app_1',
        nom: 'Dupont',
        prenom: 'Jean',
        date_naissance: '2000-01-15',
        email: 'jean.dupont@email.com',
        telephone: '032 12 345 67',
        adresse: '123 Rue Principale, Antananarivo',
      },
      {
        id_apprenti: 'app_2',
        nom: 'Rakoto',
        prenom: 'Marie',
        date_naissance: '1999-03-20',
        email: 'marie.rakoto@email.com',
        telephone: '033 98 765 43',
        adresse: '456 Avenue Liberty, Fianarantsoa',
      },
    ];

    this.formations = [
      {
        id_formation: 'form_1',
        metier: 'Développement Web',
        type_formation: 'Formation intensive',
        date_debut: '2024-01-10',
        date_fin: '2024-06-10',
        niveau: 'Avancé',
      },
      {
        id_formation: 'form_2',
        metier: 'Marketing Digital',
        type_formation: 'Formation continue',
        date_debut: '2024-02-01',
        date_fin: '2024-07-01',
        niveau: 'Intermédiaire',
      },
    ];

    this.certificats = this.generateMockCertificats(8);
    this.filteredCertificats = [...this.certificats];
    this.updatePagination();

    console.log('✅ Données mockées chargées');
  }

  private generateMockCertificats(count: number): CertificatEnriched[] {
    const certificats: CertificatEnriched[] = [];
    const mentions = [
      'Très Bien',
      'Bien',
      'Assez Bien',
      'Passable',
      'Non admis',
    ];

    for (let i = 1; i <= count; i++) {
      const year = new Date().getFullYear();
      const apprentiIndex = i % this.apprentis.length;
      const formationIndex = i % this.formations.length;

      const apprenti = this.apprentis[apprentiIndex];
      const formation = this.formations[formationIndex];

      // Calculer des moyennes réalistes pour éviter "Non admis"
      const moyenneTheorique = 12 + (i % 8); // Entre 12 et 19
      const moyennePratique = 13 + (i % 7); // Entre 13 et 19
      const moyenneGenerale = (moyenneTheorique + moyennePratique) / 2;

      // Déterminer la mention en fonction de la moyenne générale
      let mentionIndex;
      if (moyenneGenerale >= 16) mentionIndex = 0; // Très Bien
      else if (moyenneGenerale >= 14) mentionIndex = 1; // Bien
      else if (moyenneGenerale >= 12) mentionIndex = 2; // Assez Bien
      else if (moyenneGenerale >= 10) mentionIndex = 3; // Passable
      else mentionIndex = 4; // Non admis

      certificats.push({
        id_certificat: `cert_mock_${i}`,
        id_apprenti: apprenti.id_apprenti,
        id_formation: formation.id_formation,
        numero_certificat: `CCI-HM-CERT-${year}-${i
          .toString()
          .padStart(3, '0')}`,
        date_delivrance: new Date(2024, i % 12, (i % 28) + 1)
          .toISOString()
          .split('T')[0],
        fichier_pdf: `certificat-${apprenti.prenom.toLowerCase()}-${apprenti.nom.toLowerCase()}.pdf`,
        // Données enrichies
        apprenti_nom: apprenti.nom,
        apprenti_prenom: apprenti.prenom,
        formation_metier: formation.metier,
        type_formation: formation.type_formation,
        duree_formation: '6 mois',
        date_naissance: apprenti.date_naissance,
        email: apprenti.email,
        telephone: apprenti.telephone,
        niveau: formation.niveau,
        mention: mentions[mentionIndex],
        moyenne_theorique: moyenneTheorique,
        moyenne_pratique: moyennePratique,
        moyenne_generale: moyenneGenerale,
      });
    }
    return certificats;
  }

  getMoyenneDetails(certificat: CertificatEnriched): string {
    if (!certificat) return '';

    if (this.isFormationDuale(certificat.type_formation || '')) {
      const theorique = certificat.moyenne_theorique || 0;
      const pratique = certificat.moyenne_pratique || 0;
      return `Formation duale: (${theorique.toFixed(2)} + ${pratique.toFixed(
        2
      )}) / 2 = ${this.formatMoyenne(certificat)}`;
    } else {
      const theorique = certificat.moyenne_theorique || 0;
      return `Formation ${
        certificat.type_formation
      }: Moyenne théorique = ${this.formatMoyenne(certificat)}`;
    }
  }

  // Méthode pour charger les apprentis avec calcul détaillé
  onFormationChange() {
    const idFormation = this.certificatForm.get('id_formation')?.value;

    // Réinitialiser l'apprenti sélectionné
    this.certificatForm.patchValue({ id_apprenti: '' });
    this.apprentisParFormation = [];
    this.apprentisFiltres = [];

    if (idFormation) {
      this.formationSelectionnee =
        this.formations.find((f) => f.id_formation === idFormation) || null;

      // ✅ CORRECTION : Utiliser le calcul détaillé des moyennes
      this.certificatService
        .getCalculMoyennesParFormation(idFormation)
        .subscribe({
          next: (response) => {
            this.apprentisParFormation = response.apprentis;

            // Filtrer seulement les apprentis éligibles (moyenne >= 12)
            this.apprentisFiltres = response.apprentis.filter(
              (a) => a.eligible_certificat === 'Éligible'
            );

            console.log(
              `📊 Formation: ${response.formation.metier} (${response.formation.type_formation})`
            );
            console.log(
              `✅ ${this.apprentisFiltres.length} apprentis éligibles sur ${response.apprentis.length} total`
            );
            console.log(
              `📈 Statistiques: ${response.statistiques.admis} admis, Moyenne formation: ${response.statistiques.moyenne_generale_formation}`
            );
            console.log(
              `🎯 Taux de réussite: ${response.statistiques.taux_reussite}%`
            );

            // Afficher les détails de calcul pour chaque apprenti
            response.apprentis.forEach((apprenti) => {
              console.log(
                `🎓 ${apprenti.prenom} ${apprenti.nom}: ${apprenti.details_calcul}`
              );
            });

            if (this.apprentisFiltres.length === 0) {
              this.showError(
                'Aucun apprenti éligible pour un certificat dans cette formation (moyenne < 12)'
              );
            }
          },
          error: (error) => {
            console.error('Erreur chargement calcul moyennes:', error);
            // Fallback vers l'ancienne méthode en cas d'erreur
            this.loadApprentisFallback(idFormation);
          },
        });
    }
  }

  // Méthode de fallback
  private loadApprentisFallback(idFormation: string) {
    this.certificatService.getApprentisParFormation(idFormation).subscribe({
      next: (apprentis) => {
        this.apprentisParFormation = apprentis;
        this.apprentisFiltres = apprentis.filter(
          (a) => a.eligible_certificat === 'Éligible'
        );

        console.log(
          `🔄 Fallback: ${this.apprentisFiltres.length} apprentis éligibles`
        );

        // Appliquer la logique de calcul manuellement
        this.apprentisParFormation = this.apprentisParFormation.map(
          (apprenti) => {
            const isDuale = this.isFormationDuale(apprenti.type_formation);
            let moyenneGenerale = apprenti.moyenne_theorique;

            if (isDuale && apprenti.note_pratique > 0) {
              moyenneGenerale =
                (apprenti.moyenne_theorique + apprenti.note_pratique) / 2;
            }

            return {
              ...apprenti,
              moyenne_generale: parseFloat(moyenneGenerale.toFixed(2)),
              details_calcul:
                isDuale && apprenti.note_pratique > 0
                  ? `Formation duale: (${apprenti.moyenne_theorique.toFixed(
                      2
                    )} + ${apprenti.note_pratique.toFixed(
                      2
                    )}) / 2 = ${moyenneGenerale.toFixed(2)}`
                  : `${
                      apprenti.type_formation
                    }: Moyenne théorique = ${moyenneGenerale.toFixed(2)}`,
            };
          }
        );
      },
      error: (error) => {
        console.error('Erreur fallback chargement apprentis:', error);
        this.showError(
          'Erreur lors du chargement des apprentis de cette formation'
        );
      },
    });
  }

  // Méthode pour afficher les détails de calcul
  getDetailsCalculApprenti(apprenti: ApprentiAvecNotes): string {
    if (!apprenti) return '';

    // Utiliser les détails de calcul si disponibles
    if (apprenti.details_calcul) {
      return apprenti.details_calcul;
    }

    // Fallback si les détails ne sont pas disponibles
    const isDuale = this.isFormationDuale(apprenti.type_formation);

    if (isDuale && apprenti.note_pratique > 0) {
      return `Formation duale: (${apprenti.moyenne_theorique.toFixed(
        2
      )} + ${apprenti.note_pratique.toFixed(
        2
      )}) / 2 = ${apprenti.moyenne_generale.toFixed(2)}`;
    } else {
      return `${
        apprenti.type_formation
      }: Moyenne théorique = ${apprenti.moyenne_generale.toFixed(2)}`;
    }
  }

  // Méthode pour vérifier si une formation est duale
  isFormationDuale(typeFormation: string): boolean {
    const typesDuales = [
      'Formation duale',
      'duale',
      'DUALE',
      'Duale',
      'formation dual',
      'dual',
      'professionnel_dual',
      'PROFESSIONNEL_DUAL',
      'Professionnel Dual',
      'professionnel dual',
    ];
    return typesDuales.includes(typeFormation);
  }
}

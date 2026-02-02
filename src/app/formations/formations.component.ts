import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormationService } from '../services/formation.service';
import { Formation } from '../models/formation';

@Component({
  selector: 'app-formation',
  templateUrl: './formations.component.html',
  styleUrls: ['./formations.component.css'],
  standalone: false,
})
export class FormationComponent implements OnInit {
  formationForm!: FormGroup;
  formations: Formation[] = [];
  filteredFormations: Formation[] = [];

  // États de l'interface
  showForm = false;
  isEditing = false;
  editingFormationId: string | null = null;
  isLoading = false;
  searchTerm = '';
  filterType = '';
  filterMetier = '';

  // États des dialogues
  showDeleteConfirm = false;
  showSuccessDialog = false;
  showErrorDialog = false;
  formationToDelete: Formation | null = null;
  successMessage = '';
  errorMessage = '';

  typesFormation = ['thematique', 'modulaire', 'professionnel_dual'];
  metiers = ['Tourisme', 'Secrétariat', 'Comptabilité et Finance'];

  constructor(
    private fb: FormBuilder,
    private formationService: FormationService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadFormations();
  }

  initForm(): void {
    this.formationForm = this.fb.group({
      id_formation: ['', [Validators.required, Validators.maxLength(50)]],
      metier: ['', Validators.required],
      type_formation: ['', Validators.required],
      description: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(500),
        ],
      ],
      date_debut: ['', [Validators.required]],
      date_fin: ['', [Validators.required]],
      lieu_theorique: ['', [Validators.required, Validators.maxLength(100)]],
    });

    this.formationForm.get('date_debut')?.valueChanges.subscribe(() => {
      this.calculateFormDuration();
    });
    this.formationForm.get('date_fin')?.valueChanges.subscribe(() => {
      this.calculateFormDuration();
    });
  }

  // Gestion des dialogues
  confirmDelete(formation: Formation): void {
    this.formationToDelete = formation;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.formationToDelete = null;
  }

  confirmDeleteAction(): void {
    if (this.formationToDelete) {
      this.isLoading = true;
      this.formationService
        .deleteFormation(this.formationToDelete.id_formation)
        .subscribe({
          next: () => {
            this.loadFormations();
            this.showDeleteConfirm = false;
            this.formationToDelete = null;
            this.isLoading = false;
            this.showSuccessDialogMessage('Formation supprimée avec succès');
          },
          error: (error) => {
            console.error('Erreur suppression', error);
            this.isLoading = false;
            this.showDeleteConfirm = false;

            if (error.status === 404) {
              this.showErrorDialogMessage('Formation non trouvée');
            } else if (error.status === 409) {
              this.showErrorDialogMessage(
                'Impossible de supprimer cette formation car elle est associée à des données'
              );
            } else {
              this.showErrorDialogMessage(
                'Erreur lors de la suppression: ' + error.message
              );
            }
          },
        });
    }
  }

  showSuccessDialogMessage(message: string): void {
    this.successMessage = message;
    this.showSuccessDialog = true;
  }

  closeSuccessDialog(): void {
    this.showSuccessDialog = false;
    this.successMessage = '';
  }

  showErrorDialogMessage(message: string): void {
    this.errorMessage = message;
    this.showErrorDialog = true;
  }

  closeErrorDialog(): void {
    this.showErrorDialog = false;
    this.errorMessage = '';
  }

  calculateDuration(debut: string, fin: string): number {
    if (!debut || !fin) return 0;
    const d1 = new Date(debut);
    const d2 = new Date(fin);
    const diff = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  calculateFormDuration(): number {
    const debut = this.formationForm.get('date_debut')?.value;
    const fin = this.formationForm.get('date_fin')?.value;
    if (!debut || !fin) return 0;
    return this.calculateDuration(debut, fin);
  }

  loadFormations(): void {
    this.isLoading = true;
    this.formationService.getFormations().subscribe({
      next: (data) => {
        this.formations = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur chargement formations', error);
        this.showErrorDialogMessage('Erreur lors du chargement des formations');
        this.isLoading = false;
      },
    });
  }

  applyFilters(): void {
    this.filteredFormations = this.formations.filter((formation) => {
      const matchesSearch =
        !this.searchTerm ||
        formation.metier
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        formation.type_formation
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        formation.id_formation
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        (formation.description && formation.description
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()));

      const matchesType =
        !this.filterType || formation.type_formation === this.filterType;
      const matchesMetier =
        !this.filterMetier || formation.metier === this.filterMetier;

      return matchesSearch && matchesType && matchesMetier;
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterType = '';
    this.filterMetier = '';
    this.applyFilters();
  }

  openForm(): void {
    this.showForm = true;
    this.isEditing = false;
    this.editingFormationId = null;
    this.formationForm.reset();
    this.formationForm.get('id_formation')?.enable();
    this.generateFormationId();
  }

  closeForm(): void {
    this.showForm = false;
    this.formationForm.reset();
    this.isEditing = false;
    this.editingFormationId = null;
  }

  editFormation(formation: Formation): void {
    this.showForm = true;
    this.isEditing = true;
    this.editingFormationId = formation.id_formation;

    const formationData = {
      ...formation,
      date_debut: this.formatDateForInput(formation.date_debut),
      date_fin: this.formatDateForInput(formation.date_fin),
    };

    this.formationForm.patchValue(formationData);
    this.formationForm.get('id_formation')?.disable();
  }

  onSubmit(): void {
    if (this.formationForm.valid) {
      this.isLoading = true;
      const formData = this.formationForm.getRawValue();

      // ✅ **Correction: Créer l'objet Formation complet**
      const formationData: Formation = {
        id_formation: formData.id_formation,
        id: formData.id_formation, // ✅ Ajout de la propriété id
        metier: formData.metier,
        nom: formData.metier, // ✅ Ajout de nom (utilise metier comme valeur)
        nom_formation: formData.metier, // ✅ Ajout de nom_formation (utilise metier comme valeur)
        type_formation: formData.type_formation,
        description: formData.description,
        date_debut: formData.date_debut,
        date_fin: formData.date_fin,
        lieu_theorique: formData.lieu_theorique
      };

      const isEditMode = this.isEditing && this.editingFormationId;

      const request = isEditMode
        ? this.formationService.updateFormation(formData.id_formation, formationData)
        : this.formationService.createFormation(formationData);

      request.subscribe({
        next: (result) => {
          this.loadFormations();
          this.closeForm();
          this.isLoading = false;
          this.showSuccessDialogMessage(
            isEditMode
              ? 'Formation modifiée avec succès'
              : 'Formation créée avec succès'
          );
        },
        error: (error) => {
          console.error('Erreur sauvegarde', error);
          this.isLoading = false;

          if (error.status === 409) {
            this.showErrorDialogMessage(
              'Une formation avec cet ID existe déjà'
            );
          } else if (error.status === 400) {
            this.showErrorDialogMessage(
              'Données invalides. Veuillez vérifier les informations saisies.'
            );
          } else {
            this.showErrorDialogMessage(
              'Erreur lors de la sauvegarde: ' + error.message
            );
          }
        },
      });
    } else {
      this.markFormGroupTouched(this.formationForm);
      this.showErrorDialogMessage(
        'Veuillez corriger les erreurs dans le formulaire'
      );
    }
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
    const field = this.formationForm.get(fieldName);

    if (!field?.touched) return '';

    if (field?.hasError('required')) return 'Ce champ est requis';
    if (field?.hasError('minlength'))
      return `Minimum ${field.errors?.['minlength'].requiredLength} caractères`;
    if (field?.hasError('maxlength'))
      return `Maximum ${field.errors?.['maxlength'].requiredLength} caractères`;

    return '';
  }

  private formatDateForInput(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  generateFormationId(): void {
    if (this.isEditing) return;

    const metier = this.formationForm.get('metier')?.value;
    const type = this.formationForm.get('type_formation')?.value;

    let metierCode = 'GEN';
    let typeCode = 'GEN';

    if (metier) metierCode = this.getMetierCode(metier);
    if (type) typeCode = this.getTypeCode(type);

    const sequence = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    const generatedId = `FORM-${metierCode}-${typeCode}-${sequence}`;

    this.formationForm.get('id_formation')?.setValue(generatedId);
  }

  private getMetierCode(metier: string): string {
    switch (metier) {
      case 'Tourisme':
        return 'TOUR';
      case 'Secrétariat':
        return 'SEC';
      case 'Comptabilité et Finance':
        return 'COMP';
      default:
        return 'GEN';
    }
  }

  private getTypeCode(type: string): string {
    switch (type) {
      case 'thematique':
        return 'THEM';
      case 'modulaire':
        return 'MOD';
      case 'professionnel_dual':
        return 'DUAL';
      default:
        return 'GEN';
    }
  }

  get descriptionLength(): number {
    return this.formationForm.get('description')?.value?.length || 0;
  }
}
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatiereService } from '../services/matiere.service';
import { FormationService } from '../services/formation.service';
import { Matiere } from '../models/matiere';
import { Formation } from '../models/formation';

@Component({
  selector: 'app-matieres',
  templateUrl: './matieres.component.html',
  styleUrls: ['./matieres.component.css'],
  standalone: false,
})
export class MatieresComponent implements OnInit {
  matieres: Matiere[] = [];
  formations: Formation[] = [];
  matiereForm: FormGroup;
  isEditing = false;
  currentMatiereId: string | null = null;
  searchTerm = '';

  // Propriétés manquantes à ajouter
  showForm = false;
  isLoading = false;
  filterFormation = '';
  showDeleteConfirm = false;
  showSuccessDialog = false;
  showErrorDialog = false;
  matiereToDelete: Matiere | null = null;
  successMessage = '';
  errorMessage = '';

  constructor(
    private matiereService: MatiereService,
    private formationService: FormationService,
    private fb: FormBuilder
  ) {
    this.matiereForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadMatieres();
    this.loadFormations();
  }

  createForm(): FormGroup {
    return this.fb.group({
      nom_matiere: ['', [Validators.required, Validators.minLength(2)]],
      coefficient: [1, [Validators.required, Validators.min(1)]],
      description: [''],
      id_formation: ['', Validators.required]
    });
  }

  // === METHODES MANQUANTES POUR LE TEMPLATE ===

  openForm(): void {
    this.showForm = true;
    this.isEditing = false;
    this.currentMatiereId = null;
    this.matiereForm.reset({
      coefficient: 1,
      description: ''
    });
  }

  closeForm(): void {
    this.showForm = false;
    this.isEditing = false;
    this.currentMatiereId = null;
    this.matiereForm.reset({
      coefficient: 1,
      description: ''
    });
  }

  searchMatieres(): void {
    if (this.searchTerm.trim()) {
      this.matiereService.searchMatieres(this.searchTerm).subscribe({
        next: (matieres) => {
          this.matieres = matieres;
        },
        error: (error) => {
          console.error('Erreur lors de la recherche des matières:', error);
        }
      });
    } else {
      this.loadMatieres();
    }
  }

  loadMatieresByFormation(formationId: string): void {
    if (formationId) {
      this.matiereService.getMatieresByFormation(formationId).subscribe({
        next: (matieres) => {
          this.matieres = matieres;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des matières par formation:', error);
        }
      });
    } else {
      this.loadMatieres();
    }
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.filterFormation = '';
    this.loadMatieres();
  }

  confirmDelete(matiere: Matiere): void {
    this.matiereToDelete = matiere;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.matiereToDelete = null;
  }

  confirmDeleteAction(): void {
    if (this.matiereToDelete) {
      this.isLoading = true;
      const idToDelete = this.matiereToDelete.id_matiere || this.matiereToDelete.id;
      
      this.matiereService.deleteMatiere(idToDelete).subscribe({
        next: () => {
          this.isLoading = false;
          this.showSuccess('Matière supprimée avec succès');
          this.showDeleteConfirm = false;
          this.matiereToDelete = null;
          this.loadMatieres();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Erreur lors de la suppression:', error);
          this.showError('Erreur lors de la suppression de la matière');
          this.showDeleteConfirm = false;
          this.matiereToDelete = null;
        }
      });
    }
  }

  showSuccess(message: string): void {
    this.successMessage = message;
    this.showSuccessDialog = true;
  }

  closeSuccessDialog(): void {
    this.showSuccessDialog = false;
    this.successMessage = '';
  }

  showError(message: string): void {
    this.errorMessage = message;
    this.showErrorDialog = true;
  }

  closeErrorDialog(): void {
    this.showErrorDialog = false;
    this.errorMessage = '';
  }

  // === METHODES EXISTANTES ===

  loadMatieres(): void {
    this.isLoading = true;
    this.matiereService.getMatieres().subscribe({
      next: (matieres) => {
        this.matieres = matieres;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des matières:', error);
        this.isLoading = false;
        this.showError('Erreur lors du chargement des matières');
      }
    });
  }

  loadFormations(): void {
    this.formationService.getFormations().subscribe({
      next: (formations) => {
        this.formations = formations;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des formations:', error);
      }
    });
  }

  onSubmit(): void {
    if (this.matiereForm.valid) {
      this.isLoading = true;
      const matiereData = this.matiereForm.value;

      if (this.isEditing && this.currentMatiereId) {
        this.matiereService.updateMatiere(this.currentMatiereId, matiereData).subscribe({
          next: () => {
            this.isLoading = false;
            this.showSuccess('Matière mise à jour avec succès');
            this.closeForm();
            this.loadMatieres();
          },
          error: (error) => {
            this.isLoading = false;
            console.error('Erreur lors de la mise à jour:', error);
            this.showError('Erreur lors de la mise à jour de la matière');
          }
        });
      } else {
        this.matiereService.createMatiere(matiereData).subscribe({
          next: () => {
            this.isLoading = false;
            this.showSuccess('Matière créée avec succès');
            this.closeForm();
            this.loadMatieres();
          },
          error: (error) => {
            this.isLoading = false;
            console.error('Erreur lors de la création:', error);
            this.showError('Erreur lors de la création de la matière');
          }
        });
      }
    }
  }

  editMatiere(matiere: Matiere): void {
    this.isEditing = true;
    this.currentMatiereId = matiere.id_matiere || matiere.id;
    this.showForm = true;
    
    this.matiereForm.patchValue({
      nom_matiere: matiere.nom_matiere,
      coefficient: matiere.coefficient,
      description: matiere.description || '',
      id_formation: matiere.id_formation
    });
  }

  deleteMatiere(matiere: Matiere): void {
    this.confirmDelete(matiere);
  }

  getFormationName(formationId: string): string {
    if (!formationId) return 'Non assignée';
    
    const formation = this.formations.find(f => 
      f.id_formation === formationId || f.id === formationId
    );
    
    console.log('Formation trouvée:', formation); 
    if (formation) {
      return formation.metier || 
             formation.nom_formation || 
             formation.nom || 
             'Formation sans nom';
    }
    
    return 'Non assignée';
  }

  // Getters pour le formulaire
  get nom_matiere() { return this.matiereForm.get('nom_matiere'); }
  get coefficient() { return this.matiereForm.get('coefficient'); }
  get description() { return this.matiereForm.get('description'); }
  get id_formation() { return this.matiereForm.get('id_formation'); }
}
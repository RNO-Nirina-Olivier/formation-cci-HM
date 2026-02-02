import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApprentiService, Apprenti } from '../services/apprenti.service';

@Component({
  selector: 'app-apprenti',
  templateUrl: './apprentis.component.html',
  styleUrls: ['./apprentis.component.css'],
  standalone: false,
})
export class ApprentiComponent implements OnInit {
  apprentis: Apprenti[] = [];
  filteredApprentis: Apprenti[] = [];
  showForm = false;
  showDeleteConfirm = false;
  showSuccessDialog = false;
  showErrorDialog = false;
  isEditing = false;
  isLoading = false;
  searchTerm = '';
  filterStatut = '';

  errorMessage = '';
  successMessage = '';
  apprentiToDelete: Apprenti | null = null;

  apprentiForm: FormGroup;

  niveauxEtude = ['Brevet', 'Bac', 'Bac+2', 'Bac+3', 'Bac+5', 'Autre'];

  situationsPro = [
    'Étudiant',
    "En recherche d'emploi",
    'Salarié',
    'Indépendant',
    'Autre',
  ];

  constructor(
    private fb: FormBuilder,
    private apprentiService: ApprentiService
  ) {
    this.apprentiForm = this.createForm();
  }

  ngOnInit() {
    console.log('🔧 Initialisation du composant apprenti');
    this.loadApprentis();
  }
  onPhoneFocus(): void {
    const currentValue = this.apprentiForm.get('telephone')?.value;
    // Si le champ est vide ou ne contient que "+261 ", positionner le curseur après
    if (!currentValue || currentValue === '+261 ') {
      setTimeout(() => {
        const input = document.getElementById('telephone') as HTMLInputElement;
        if (input) {
          input.setSelectionRange(5, 5); // Position après "+261 "
        }
      }, 0);
    }
  }
  onPhoneBlur(): void {
    const currentValue = this.apprentiForm.get('telephone')?.value;
    // Si l'utilisateur n'a rien saisi après "+261 ", remettre la valeur par défaut
    if (currentValue === '+261 ' || !currentValue) {
      this.apprentiForm.get('telephone')?.setValue('+261 ');
    }
  }
  createForm(): FormGroup {
    return this.fb.group({
      id_apprenti: [''],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      date_naissance: ['', [Validators.required]],
      sexe: ['', [Validators.required]],
      adresse: ['', [Validators.required]],
      telephone: [
        '+261 ',
        [
          Validators.required,
          Validators.pattern(/^\+261\s3[23478]\s\d{2}\s\d{3}\s\d{2}$/),
        ],
      ],
      email: ['', [Validators.required, Validators.email]],
      niveau_etude: ['', [Validators.required]],
      situation_professionnelle: ['', [Validators.required]],
      statut: ['actif'],
    });
  }

  loadApprentis() {
    this.isLoading = true;
    console.log('🔄 Début du chargement des apprentis...');

    this.apprentiService.getApprentis().subscribe({
      next: (apprentis) => {
        console.log('✅ Apprentis chargés avec succès:', apprentis);
        this.apprentis = apprentis;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Erreur détaillée:', error);
        this.showError('Erreur lors du chargement: ' + error.message);
        this.isLoading = false;
      },
    });
  }

  getTelephoneFormate(telephone: string | undefined): string {
    if (!telephone || telephone === '-') return '-';

    const digits = telephone.replace(/\D/g, '');
    const digitsAfter261 = digits.startsWith('261')
      ? digits.substring(3)
      : digits;

    if (digitsAfter261.length >= 2) {
      const withOperator = digitsAfter261.startsWith('3')
        ? digitsAfter261
        : '3' + digitsAfter261;
      const groups = [
        withOperator.substring(0, 2),
        withOperator.substring(2, 4),
        withOperator.substring(4, 7),
        withOperator.substring(7, 9),
      ].filter((group) => group && group.length > 0);

      return '+261 ' + groups.join(' ');
    }

    return telephone;
  }
  applyFilters() {
    this.filteredApprentis = this.apprentis.filter((apprenti) => {
      const matchesSearch =
        !this.searchTerm ||
        apprenti.nom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        apprenti.prenom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        apprenti.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (apprenti.id_apprenti &&
          apprenti.id_apprenti
            .toLowerCase()
            .includes(this.searchTerm.toLowerCase()));

      const matchesStatut =
        !this.filterStatut || apprenti.statut === this.filterStatut;

      return matchesSearch && matchesStatut;
    });
  }

  openForm(apprenti?: Apprenti) {
    this.isEditing = !!apprenti;
    this.clearMessages();

    if (apprenti) {
      // Mode ÉDITION
      this.apprentiForm.patchValue(apprenti);
    } else {
      // Mode CRÉATION
      this.apprentiForm.reset({
        statut: 'actif',
      });
    }

    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.isEditing = false;
    this.apprentiForm.reset();
    this.clearMessages();
  }

  onSubmit() {
    if (this.apprentiForm.valid) {
      this.isLoading = true;
      this.clearMessages();

      const formValue = this.apprentiForm.value;
      console.log('📤 Données du formulaire:', formValue);

      // Préparer les données pour l'API
      const apprentiData: any = {
        nom: formValue.nom,
        prenom: formValue.prenom,
        date_naissance: formValue.date_naissance,
        sexe: formValue.sexe,
        adresse: formValue.adresse,
        telephone: formValue.telephone,
        email: formValue.email,
        niveau_etude: formValue.niveau_etude,
        situation_professionnelle: formValue.situation_professionnelle,
        statut: formValue.statut,
      };

      if (this.isEditing && formValue.id_apprenti) {
        // MODIFICATION
        console.log('✏️ Modification apprenti:', formValue.id_apprenti);
        this.apprentiService
          .updateApprenti(formValue.id_apprenti, apprentiData)
          .subscribe({
            next: (apprentiModifie) => {
              console.log('✅ Apprenti modifié:', apprentiModifie);
              this.handleSuccess('Apprenti modifié avec succès');
            },
            error: (error) => {
              console.error('❌ Erreur modification:', error);
              this.handleError('Erreur lors de la modification', error);
            },
          });
      } else {
        // CRÉATION
        // Si un ID est saisi manuellement, l'utiliser
        if (formValue.id_apprenti) {
          apprentiData.id_apprenti = formValue.id_apprenti;
        }

        console.log('➕ Création apprenti:', apprentiData);
        this.apprentiService.createApprenti(apprentiData).subscribe({
          next: (nouvelApprenti) => {
            console.log('✅ Apprenti créé:', nouvelApprenti);
            this.handleSuccess('Apprenti créé avec succès');
          },
          error: (error) => {
            console.error('❌ Erreur création:', error);
            this.handleError('Erreur lors de la création', error);
          },
        });
      }
    } else {
      // Afficher les erreurs de validation
      this.markFormGroupTouched(this.apprentiForm);
      this.showError('Veuillez corriger les erreurs dans le formulaire');
    }
  }

  private handleSuccess(message: string) {
    this.loadApprentis(); // Recharger la liste
    this.closeForm();
    this.isLoading = false;
    this.showSuccess(message);
  }

  private handleError(action: string, error: any) {
    console.error(`${action}:`, error);
    this.showError(`${action}: ${error.message}`);
    this.isLoading = false;
  }

  confirmDelete(apprenti: Apprenti) {
    this.apprentiToDelete = apprenti;
    this.showDeleteConfirm = true;
    this.clearMessages();
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.apprentiToDelete = null;
    this.clearMessages();
  }

  deleteApprenti() {
    if (this.apprentiToDelete && this.apprentiToDelete.id_apprenti) {
      this.isLoading = true;
      console.log(
        '🗑️ Suppression apprenti:',
        this.apprentiToDelete.id_apprenti
      );

      this.apprentiService
        .deleteApprenti(this.apprentiToDelete.id_apprenti)
        .subscribe({
          next: () => {
            console.log('✅ Apprenti supprimé');
            // Mettre à jour la liste locale
            this.apprentis = this.apprentis.filter(
              (a) => a.id_apprenti !== this.apprentiToDelete?.id_apprenti
            );
            this.applyFilters();
            this.isLoading = false;
            this.showDeleteConfirm = false;
            this.apprentiToDelete = null;
            this.showSuccess('Apprenti supprimé avec succès');
          },
          error: (error) => {
            console.error('❌ Erreur suppression:', error);
            this.showError('Erreur lors de la suppression: ' + error.message);
            this.isLoading = false;
          },
        });
    }
  }

  // Méthodes utilitaires
  calculateAge(dateNaissance: string): number {
    if (!dateNaissance) return 0;
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  onDateNaissanceChange() {
    // Cette méthode peut être utilisée pour des validations supplémentaires
  }

  // Méthodes pour les boîtes de dialogue
  showSuccess(message: string) {
    this.successMessage = message;
    this.showSuccessDialog = true;
  }

  showError(message: string) {
    this.errorMessage = message;
    this.showErrorDialog = true;
  }

  closeSuccessDialog() {
    this.showSuccessDialog = false;
    this.successMessage = '';
  }

  closeErrorDialog() {
    this.showErrorDialog = false;
    this.errorMessage = '';
  }

  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // Méthodes utilitaires pour la validation
  isFieldInvalid(fieldName: string): boolean {
    const field = this.apprentiForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

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

  getFieldError(fieldName: string): string {
    const field = this.apprentiForm.get(fieldName);

    if (!field?.errors || !field.touched) {
      return '';
    }

    if (field.errors['required']) {
      return 'Ce champ est requis';
    }
    if (field.errors['email']) {
      return "Format d'email invalide";
    }
    if (field.errors['minlength']) {
      return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
    }

    return '';
  }

  private getNewCursorPosition(
    oldPos: number | null,
    oldValue: string,
    newValue: string
  ): number {
    // Si oldPos est null, retourner la position à la fin
    if (oldPos === null) {
      return newValue.length;
    }

    // Toujours garder le curseur après "+261 " au minimum
    if (oldPos <= 5) return 5;

    const diff = newValue.length - oldValue.length;
    return Math.max(5, oldPos + diff);
  }

  formatPhoneNumber(event: any): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Garder +261 au début
    if (!value.startsWith('+261')) {
      value = '+261 ' + value.replace(/^\+261\s?/, '');
    }

    // Extraire tous les chiffres
    const allDigits = value.replace(/\D/g, '');
    // Prendre seulement les chiffres après 261
    const digitsAfter261 = allDigits.startsWith('261')
      ? allDigits.substring(3)
      : allDigits;

    let formattedValue = '+261 ';

    if (digitsAfter261.length > 0) {
      // S'assurer que ça commence par 3 (opérateur)
      const withOperator = digitsAfter261.startsWith('3')
        ? digitsAfter261
        : '3' + digitsAfter261;

      // Construire les parties une par une
      let remainingDigits = withOperator;
      const parts: string[] = [];

      // Partie opérateur (2 chiffres) - obligatoire
      if (remainingDigits.length >= 2) {
        parts.push(remainingDigits.substring(0, 2));
        remainingDigits = remainingDigits.substring(2);
      } else if (remainingDigits.length > 0) {
        parts.push(remainingDigits);
        remainingDigits = '';
      }

      // Partie suivante (2 chiffres)
      if (remainingDigits.length >= 2) {
        parts.push(remainingDigits.substring(0, 2));
        remainingDigits = remainingDigits.substring(2);
      } else if (remainingDigits.length > 0) {
        parts.push(remainingDigits);
        remainingDigits = '';
      }

      // Partie suivante (3 chiffres)
      if (remainingDigits.length >= 3) {
        parts.push(remainingDigits.substring(0, 3));
        remainingDigits = remainingDigits.substring(3);
      } else if (remainingDigits.length > 0) {
        parts.push(remainingDigits);
        remainingDigits = '';
      }

      // Dernière partie (2 chiffres)
      if (remainingDigits.length >= 2) {
        parts.push(remainingDigits.substring(0, 2));
      } else if (remainingDigits.length > 0) {
        parts.push(remainingDigits);
      }

      formattedValue += parts.join(' ');
    }

    // Appliquer la nouvelle valeur
    this.apprentiForm
      .get('telephone')
      ?.setValue(formattedValue, { emitEvent: false });

    // CORRECTION : Gérer tous les types possibles de selectionDirection
    const cursorBefore = input.selectionStart;
    if (cursorBefore !== null) {
      const direction = input.selectionDirection as
        | 'forward'
        | 'backward'
        | null
        | undefined;
      const newPosition = this.calculateSmartCursorPosition(
        cursorBefore,
        value,
        formattedValue,
        direction
      );
      setTimeout(() => {
        input.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  }

  // CORRECTION : Accepter le type undefined
  private calculateSmartCursorPosition(
    oldPos: number,
    oldValue: string,
    newValue: string,
    direction: 'forward' | 'backward' | null | undefined = null
  ): number {
    // Si suppression (backspace), adapter le comportement
    if (direction === 'backward' && oldPos > 5) {
      return Math.max(5, oldPos - 1);
    }

    // Si on est en train de taper normalement
    if (oldPos <= 5) return 5;

    // Calcul basique du décalage
    const lengthDiff = newValue.length - oldValue.length;
    return Math.max(5, Math.min(oldPos + lengthDiff, newValue.length));
  }

  formatPhoneForDisplay(phone: string): string {
    if (!phone || phone === '-') {
      return '-';
    }

    // Nettoyer le numéro
    const digits = phone.replace(/\D/g, '');

    // Extraire les chiffres après 261
    const digitsAfter261 = digits.startsWith('261')
      ? digits.substring(3)
      : digits;

    if (digitsAfter261.length >= 2) {
      // S'assurer qu'il commence par 3
      const withOperator = digitsAfter261.startsWith('3')
        ? digitsAfter261
        : '3' + digitsAfter261;

      // Découper en groupes
      const groups = [
        withOperator.substring(0, 2),
        withOperator.substring(2, 4),
        withOperator.substring(4, 7),
        withOperator.substring(7, 9),
      ].filter((group) => group && group.length > 0);

      return '+261 ' + groups.join(' ');
    }

    return phone;
  }
}

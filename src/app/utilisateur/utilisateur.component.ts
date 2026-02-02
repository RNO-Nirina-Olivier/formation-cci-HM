import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  UtilisateurService,
  Utilisateur,
} from '../services/utilisateur.service';

@Component({
  selector: 'app-utilisateur',
  templateUrl: './utilisateur.component.html',
  styleUrls: ['./utilisateur.component.css'],
  standalone: false,
})
export class UtilisateurComponent implements OnInit {
  utilisateurs: Utilisateur[] = [];
  filteredUtilisateurs: Utilisateur[] = [];
  showForm = false;
  showDeleteConfirm = false;
  showSuccessDialog = false;
  showErrorDialog = false;
  isEditing = false;
  isLoading = false;
  searchTerm = '';

  // ❌ **Nesorina**: filterRole = '';

  errorMessage = '';
  successMessage = '';
  userToDelete: Utilisateur | null = null;

  utilisateurForm: FormGroup;

  // ❌ **Nesorina**: roles = ['admin', 'formateur'];

  constructor(
    private fb: FormBuilder,
    private utilisateurService: UtilisateurService
  ) {
    this.utilisateurForm = this.createForm();
  }

  ngOnInit() {
    console.log('🔧 Initialisation du composant utilisateur');
    this.loadUtilisateurs();
  }

  createForm(): FormGroup {
    return this.fb.group({
      id_user: [''],
      username: ['', [Validators.required, Validators.minLength(3)]],
      mot_de_passe: ['', [Validators.minLength(6)]],

      // ❌ **Nesorina**: role: ['', Validators.required],

      email: ['', [Validators.required, Validators.email]],
      telephone: [
        '+261 ',
        [
          Validators.required,
          Validators.pattern(/^\+261\s3[23478]\s\d{2}\s\d{3}\s\d{2}$/),
        ],
      ],
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

  onPhoneFocus(): void {
    const currentValue = this.utilisateurForm.get('telephone')?.value;
    if (!currentValue || currentValue === '+261 ') {
      setTimeout(() => {
        const input = document.getElementById('telephone') as HTMLInputElement;
        if (input) {
          input.setSelectionRange(5, 5);
        }
      }, 0);
    }
  }

  onPhoneBlur(): void {
    const currentValue = this.utilisateurForm.get('telephone')?.value;
    if (currentValue === '+261 ' || !currentValue) {
      this.utilisateurForm.get('telephone')?.setValue('+261 ');
    }
  }

  loadUtilisateurs() {
    this.isLoading = true;
    console.log('🔄 Début du chargement des utilisateurs...');

    this.utilisateurService.getUtilisateurs().subscribe({
      next: (utilisateurs) => {
        console.log('✅ Utilisateurs chargés avec succès:', utilisateurs);
        this.utilisateurs = utilisateurs;
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

  applyFilters() {
    this.filteredUtilisateurs = this.utilisateurs.filter((utilisateur) => {
      const matchesSearch =
        !this.searchTerm ||
        utilisateur.username
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        utilisateur.email
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        (utilisateur.id_user &&
          utilisateur.id_user
            .toLowerCase()
            .includes(this.searchTerm.toLowerCase()));

      // ❌ **Nesorina**: Filtre par role
      return matchesSearch;
    });
  }

  openForm(utilisateur?: Utilisateur) {
    this.isEditing = !!utilisateur;
    this.clearMessages();

    if (utilisateur) {
      // Mode ÉDITION
      this.utilisateurForm.patchValue({
        ...utilisateur,
        mot_de_passe: '', // On vide le mot de passe pour la sécurité
      });

      // En mode édition, le mot de passe n'est pas requis
      this.utilisateurForm.get('mot_de_passe')?.clearValidators();
      this.utilisateurForm
        .get('mot_de_passe')
        ?.setValidators([Validators.minLength(6)]);
    } else {
      // Mode CRÉATION
      this.utilisateurForm.reset();

      // En mode création, le mot de passe est requis
      this.utilisateurForm
        .get('mot_de_passe')
        ?.setValidators([Validators.required, Validators.minLength(6)]);
    }

    this.utilisateurForm.get('mot_de_passe')?.updateValueAndValidity();
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.isEditing = false;
    this.utilisateurForm.reset();
    this.clearMessages();
  }

  onSubmit() {
    if (this.utilisateurForm.valid) {
      this.isLoading = true;
      this.clearMessages();

      const formValue = this.utilisateurForm.value;
      console.log('📤 Données du formulaire:', formValue);

      // Préparer les données pour l'API
      const userData: any = {
        username: formValue.username,
        email: formValue.email,
        telephone: formValue.telephone || '',

        // ❌ **Nesorina**: role: formValue.role,
      };

      // Gérer le mot de passe seulement si fourni
      if (formValue.mot_de_passe && formValue.mot_de_passe.length >= 6) {
        userData.mot_de_passe = formValue.mot_de_passe;
      }

      if (this.isEditing && formValue.id_user) {
        // MODIFICATION
        console.log('✏️ Modification utilisateur:', formValue.id_user);
        this.utilisateurService
          .updateUtilisateur(formValue.id_user, userData)
          .subscribe({
            next: (utilisateurModifie) => {
              console.log('✅ Utilisateur modifié:', utilisateurModifie);
              this.handleSuccess('Utilisateur modifié avec succès');
            },
            error: (error) => {
              console.error('❌ Erreur modification:', error);
              this.handleError('Erreur lors de la modification', error);
            },
          });
      } else {
        // CRÉATION - Vérifier que le mot de passe est présent
        if (!userData.mot_de_passe) {
          this.showError('Le mot de passe est requis pour la création');
          this.isLoading = false;
          return;
        }

        // Si un ID est saisi manuellement, l'utiliser
        if (formValue.id_user) {
          userData.id_user = formValue.id_user;
        }

        console.log('➕ Création utilisateur:', userData);
        this.utilisateurService.createUtilisateur(userData).subscribe({
          next: (nouvelUtilisateur) => {
            console.log('✅ Utilisateur créé:', nouvelUtilisateur);
            this.handleSuccess('Utilisateur créé avec succès');
          },
          error: (error) => {
            console.error('❌ Erreur création:', error);
            this.handleError('Erreur lors de la création', error);
          },
        });
      }
    } else {
      // Afficher les erreurs de validation
      this.markFormGroupTouched(this.utilisateurForm);
      this.showError('Veuillez corriger les erreurs dans le formulaire');
    }
  }

  private handleSuccess(message: string) {
    this.loadUtilisateurs(); // Recharger la liste
    this.closeForm();
    this.isLoading = false;
    this.showSuccess(message);
  }

  private handleError(action: string, error: any) {
    console.error(`${action}:`, error);
    this.showError(`${action}: ${error.message}`);
    this.isLoading = false;
  }

  confirmDelete(utilisateur: Utilisateur) {
    this.userToDelete = utilisateur;
    this.showDeleteConfirm = true;
    this.clearMessages();
  }

  cancelDelete() {
    this.showDeleteConfirm = false;
    this.userToDelete = null;
    this.clearMessages();
  }

  deleteUtilisateur() {
    if (this.userToDelete && this.userToDelete.id_user) {
      this.isLoading = true;
      console.log('🗑️ Suppression utilisateur:', this.userToDelete.id_user);

      this.utilisateurService
        .deleteUtilisateur(this.userToDelete.id_user)
        .subscribe({
          next: () => {
            console.log('✅ Utilisateur supprimé');
            this.utilisateurs = this.utilisateurs.filter(
              (u) => u.id_user !== this.userToDelete?.id_user
            );
            this.applyFilters();
            this.isLoading = false;
            this.showDeleteConfirm = false;
            this.userToDelete = null;
            this.showSuccess('Utilisateur supprimé avec succès');
          },
          error: (error) => {
            console.error('❌ Erreur suppression:', error);
            this.showError('Erreur lors de la suppression: ' + error.message);
            this.isLoading = false;
          },
        });
    }
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
    const field = this.utilisateurForm.get(fieldName);

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
    if (field.errors['pattern']) {
      return 'Format invalide. Ex: +261 34 24 703 37 (doit commencer par +261 3)';
    }

    return '';
  }

  private getNewCursorPosition(
    oldPos: number | null,
    oldValue: string,
    newValue: string
  ): number {
    if (oldPos === null) {
      return newValue.length;
    }
    if (oldPos <= 5) return 5;
    const diff = newValue.length - oldValue.length;
    return Math.max(5, oldPos + diff);
  }

  formatPhoneNumber(event: any): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    if (!value.startsWith('+261')) {
      value = '+261 ' + value.replace(/^\+261\s?/, '');
    }

    const allDigits = value.replace(/\D/g, '');
    const digitsAfter261 = allDigits.startsWith('261')
      ? allDigits.substring(3)
      : allDigits;

    let formattedValue = '+261 ';

    if (digitsAfter261.length > 0) {
      const withOperator = digitsAfter261.startsWith('3')
        ? digitsAfter261
        : '3' + digitsAfter261;

      let remainingDigits = withOperator;
      const parts: string[] = [];

      if (remainingDigits.length >= 2) {
        parts.push(remainingDigits.substring(0, 2));
        remainingDigits = remainingDigits.substring(2);
      } else if (remainingDigits.length > 0) {
        parts.push(remainingDigits);
        remainingDigits = '';
      }

      if (remainingDigits.length >= 2) {
        parts.push(remainingDigits.substring(0, 2));
        remainingDigits = remainingDigits.substring(2);
      } else if (remainingDigits.length > 0) {
        parts.push(remainingDigits);
        remainingDigits = '';
      }

      if (remainingDigits.length >= 3) {
        parts.push(remainingDigits.substring(0, 3));
        remainingDigits = remainingDigits.substring(3);
      } else if (remainingDigits.length > 0) {
        parts.push(remainingDigits);
        remainingDigits = '';
      }

      if (remainingDigits.length >= 2) {
        parts.push(remainingDigits.substring(0, 2));
      } else if (remainingDigits.length > 0) {
        parts.push(remainingDigits);
      }

      formattedValue += parts.join(' ');
    }

    this.utilisateurForm
      .get('telephone')
      ?.setValue(formattedValue, { emitEvent: false });

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

  private calculateSmartCursorPosition(
    oldPos: number,
    oldValue: string,
    newValue: string,
    direction: 'forward' | 'backward' | null | undefined = null
  ): number {
    if (direction === 'backward' && oldPos > 5) {
      return Math.max(5, oldPos - 1);
    }
    if (oldPos <= 5) return 5;
    const lengthDiff = newValue.length - oldValue.length;
    return Math.max(5, Math.min(oldPos + lengthDiff, newValue.length));
  }

  formatPhoneForDisplay(phone: string): string {
    if (!phone || phone === '-') {
      return '-';
    }
    const digits = phone.replace(/\D/g, '');
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

    return phone;
  }
}

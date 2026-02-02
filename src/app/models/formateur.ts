export interface Formateur {
  id_formateur: string;
  nom: string;
  prenom: string;
  specialite: string;
  email: string;
  telephone: string;
   statut: string; 
  id_user?: string;
  username?: string;
  created_at?: string;
  updated_at?: string;
}

// src/app/models/apprenti.ts
export interface Apprenti {
  id_apprenti: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  sexe: string;
  adresse: string;
  telephone?: string;
  email: string;
  statut: string;
  niveau_etude?: string;
  situation_professionnelle?: string;
  date_inscription?: string;
}

export interface Certificat {
  id_certificat?: number;
  numero_certificat: string;
  id_apprenti: number;
  apprenti_nom?: string;
  id_formation: number;
  formation_metier?: string;
  type_formation?: string;
  duree_formation?: string;
  date_delivrance: string;
  mention?: string;
}

export interface Apprenti {
  id_apprenti: number;
  prenom: string;
  nom: string;
  email: string;
}

export interface Formation {
  id_formation: number;
  metier: string;
  type_formation: string;
  duree: string;
}

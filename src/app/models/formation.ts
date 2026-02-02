export interface Formation {
  id_formation: string;
  metier: string;
  type_formation: string;
  description: string;
  date_debut: string;
  date_fin: string;
  lieu_theorique: string;
  
  id?: string; 
  nom?: string; 
  nom_formation?: string;
  duree_totale?: number;
  lieu_pratique?: string;
  created_at?: string;
  updated_at?: string;
}
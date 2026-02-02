export interface Matiere {
  id_matiere?: string;
  id: string;
  nom_matiere: string;
  coefficient: number;
  description: string;
  id_formation: string;
  formation_metier?: string;
  formation_type?: string;
}

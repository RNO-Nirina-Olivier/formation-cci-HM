export interface DashboardStatistics {
  total_apprentis: number;
  total_formations: number;
  formations_cours: number;
  inscriptions_attente: number;
  reinscriptions_validees: number;
  taux_presence: number;
}

export interface InscriptionEvolution {
  mois: string;
  nombre_inscriptions: number;
}

export interface FormationRepartition {
  type_formation: string;
  nombre_apprentis: number;
  nombre_formations: number;
}

export interface UpcomingFormation {
  id_formation: string;
  metier: string;
  type_formation: string;
  date_debut: string;
  date_fin: string;
  lieu_theorique: string;
  nombre_inscrits: number;
}

export interface RecentInscription {
  id_inscription: string;
  nom: string;
  prenom: string;
  metier: string;
  date_inscription: string;
  statut: string;
  email: string;
}

export interface AverageScore {
  metier: string;
  type_formation: string;
  moyenne_theorique: number;
  moyenne_pratique: number;
  moyenne_generale: number;
}

export interface AttendanceRate {
  metier: string;
  total_seances: number;
  presences: number;
  taux_presence: number;
}

export interface Alert {
  type_alerte: string;
  count: number;
  message: string;
}

// Interface principale du Dashboard
export interface DashboardData {
  statistics: DashboardStatistics;
  charts: {
    inscriptionEvolution: InscriptionEvolution[];
    formationRepartition: FormationRepartition[];
    averageScores: AverageScore[];
    attendanceRate: AttendanceRate[];
  };
  lists: {
    upcomingFormations: UpcomingFormation[];
    recentInscriptions: RecentInscription[];
  };
  alerts: Alert[];
}

// Interface pour la réponse API
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp?: string;
}
export interface AttendanceWeek {
  semaine: string;
  total_seances: number;
  presences: number;
  taux_presence: number;
}


import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DashboardData,
  DashboardStatistics,
  InscriptionEvolution,
  FormationRepartition,
  UpcomingFormation,
  Alert,
  AttendanceWeek,
  ApiResponse,
} from '../models/dashboard.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private apiUrl = 'https://backend-cci.onrender.com/api/dashboard';

  constructor(private http: HttpClient) {}

  // Récupérer toutes les données du dashboard
  getDashboardData(): Observable<ApiResponse<DashboardData>> {
    return this.http.get<ApiResponse<DashboardData>>(this.apiUrl);
  }

  // Récupérer les statistiques
  getStatistics(): Observable<ApiResponse<DashboardStatistics>> {
    return this.http.get<ApiResponse<DashboardStatistics>>(
      `${this.apiUrl}/statistics`
    );
  }

  // Récupérer l'évolution des inscriptions
  getInscriptionEvolution(
    mois: number = 6
  ): Observable<ApiResponse<InscriptionEvolution[]>> {
    return this.http.get<ApiResponse<InscriptionEvolution[]>>(
      `${this.apiUrl}/inscription-evolution?mois=${mois}`
    );
  }

  // Récupérer la répartition des formations
  getFormationRepartition(): Observable<ApiResponse<FormationRepartition[]>> {
    return this.http.get<ApiResponse<FormationRepartition[]>>(
      `${this.apiUrl}/formation-repartition`
    );
  }

  // Récupérer les formations à venir
  getUpcomingFormations(
    limit: number = 5
  ): Observable<ApiResponse<UpcomingFormation[]>> {
    return this.http.get<ApiResponse<UpcomingFormation[]>>(
      `${this.apiUrl}/upcoming-formations?limit=${limit}`
    );
  }

  // Récupérer les alertes
  getAlerts(): Observable<ApiResponse<Alert[]>> {
    return this.http.get<ApiResponse<Alert[]>>(`${this.apiUrl}/alerts`);
  }
  getWeeklyAttendanceData(): Observable<ApiResponse<AttendanceWeek[]>> {
    return this.http.get<ApiResponse<AttendanceWeek[]>>(
      `${this.apiUrl}/attendance-weekly?weeks=8`
    );
  }
}

import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { DashboardService } from '../services/dashboard.service';
import {
  DashboardData,
  Alert,
  ApiResponse,
  AttendanceWeek,
} from '../models/dashboard.model';
import { DatePipe } from '@angular/common';
import { Subscription, interval } from 'rxjs';

// Enregistrer les composants de Chart.js
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: false,
  providers: [DatePipe],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  dashboardData: DashboardData | null = null;
  loading = true;
  error: string | null = null;
  lastUpdated: string | null = null;

  // Charts
  inscriptionChart: Chart | null = null;
  formationChart: Chart | null = null;
  scoresChart: Chart | null = null;
  attendanceChart: Chart | null = null;
  weeklyAttendanceData: any[] = [];

  // Auto-refresh
  private refreshSubscription: Subscription | null = null;
  autoRefresh = false;
  refreshInterval = 300000; // 5 minutes

  constructor(
    private dashboardService: DashboardService,
    private datePipe: DatePipe
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Les charts seront créés après le chargement des données
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadDashboardData(): void {
    this.loading = true;
    this.error = null;

    this.dashboardService.getDashboardData().subscribe({
      next: (response: ApiResponse<DashboardData>) => {
        if (response.success && response.data) {
          this.dashboardData = response.data;
          this.lastUpdated =
            this.datePipe.transform(new Date(), 'dd/MM/yyyy HH:mm:ss') || 'N/A';

          // Initialiser les graphiques
          setTimeout(() => {
            this.initCharts();
          }, 100);
        } else {
          this.error =
            response.message || 'Données invalides reçues du serveur';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur:', err);
        this.error = 'Impossible de charger les données du dashboard';
        this.loading = false;
      },
    });
  }

  initCharts(): void {
    if (!this.dashboardData) return;

    this.destroyCharts();

    // 1. Graphique d'évolution des inscriptions
    this.createInscriptionChart();

    // 2. Graphique de répartition des formations
    this.createFormationChart();

    // 3. Graphique des moyennes
    this.createScoresChart();

    // 4. Graphique des taux de présence
    this.createAttendanceChart();
  }

  createInscriptionChart(): void {
    if (!this.dashboardData?.charts?.inscriptionEvolution) return;

    const ctx = document.getElementById(
      'inscriptionChart'
    ) as HTMLCanvasElement;
    if (!ctx) return;

    const data = this.dashboardData.charts.inscriptionEvolution;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: data.map((item) => this.formatMonth(item.mois)),
        datasets: [
          {
            label: 'Inscriptions',
            data: data.map((item) => item.nombre_inscriptions),
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Évolution des Inscriptions',
          },
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Nombre d'inscriptions",
            },
          },
        },
      },
    };

    this.inscriptionChart = new Chart(ctx, config);
  }

  createFormationChart(): void {
    if (!this.dashboardData?.charts?.formationRepartition) return;

    const ctx = document.getElementById('formationChart') as HTMLCanvasElement;
    if (!ctx) return;

    const data = this.dashboardData.charts.formationRepartition;
    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: data.map((item) => item.type_formation),
        datasets: [
          {
            data: data.map((item) => item.nombre_apprentis),
            backgroundColor: colors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Répartition des Formations',
          },
          legend: {
            position: 'bottom',
          },
        },
      },
    };

    this.formationChart = new Chart(ctx, config);
  }

  createScoresChart(): void {
    if (!this.dashboardData?.charts?.averageScores) return;

    const ctx = document.getElementById('scoresChart') as HTMLCanvasElement;
    if (!ctx) return;

    const data = this.dashboardData.charts.averageScores.slice(0, 5); // Top 5

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.map(
          (item) =>
            item.metier.substring(0, 20) +
            (item.metier.length > 20 ? '...' : '')
        ),
        datasets: [
          {
            label: 'Théorique',
            data: data.map((item) => item.moyenne_theorique),
            backgroundColor: '#4f46e5',
          },
          {
            label: 'Pratique',
            data: data.map((item) => item.moyenne_pratique),
            backgroundColor: '#10b981',
          },
          {
            label: 'Générale',
            data: data.map((item) => item.moyenne_generale),
            backgroundColor: '#f59e0b',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Moyennes par Formation',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 20,
            title: {
              display: true,
              text: 'Note /20',
            },
          },
        },
      },
    };

    this.scoresChart = new Chart(ctx, config);
  }

  createAttendanceChart(): void {
    console.log(
      '🔍 ATTENDANCE DATA:',
      this.dashboardData?.charts?.attendanceRate
    );

    if (!this.dashboardData?.charts?.attendanceRate?.length) return;

    const ctx = document.getElementById('attendanceChart') as HTMLCanvasElement;
    if (!ctx) return;

    const data = this.dashboardData.charts.attendanceRate.slice(0, 5);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.map(
          (item) =>
            item.metier.substring(0, 15) +
            (item.metier.length > 15 ? '...' : '')
        ), // ← DONNÉES RÉELLES
        datasets: [
          {
            label: 'Taux de Présence',
            data: data.map(
              (item) => parseFloat(item.taux_presence as any) || 0
            ), // ← DONNÉES RÉELLES
            backgroundColor: data.map((item) => {
              // ← COULEURS DYNAMIQUES
              const taux = parseFloat(item.taux_presence as any) || 0;
              if (taux >= 90) return '#10b981'; // Vert
              if (taux >= 70) return '#f59e0b'; // Orange
              return '#ef4444'; // Rouge
            }),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Taux de Présence par Formation',
          },
        },
        scales: {
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              autoSkip: false,
            },
          },
          y: {
            beginAtZero: true,
            min: -5, // ← Pour voir la barre 0%
            max: 100,
            title: {
              display: true,
              text: 'Taux (%)',
            },
            ticks: {
              stepSize: 10,
            },
          },
        },
      },
    };

    this.attendanceChart = new Chart(ctx, config);
    console.log('✅ CHART DONNÉES RÉELLES');
  }

  formatMonth(monthString: string): string {
    const [year, month] = monthString.split('-');
    const months = [
      'Jan',
      'Fév',
      'Mar',
      'Avr',
      'Mai',
      'Jun',
      'Jul',
      'Aoû',
      'Sep',
      'Oct',
      'Nov',
      'Déc',
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  }

  getAlertClass(type: string): string {
    switch (type) {
      case 'certificat_expiration':
        return 'alert-warning';
      case 'formation_sans_formateur':
        return 'alert-danger';
      case 'notes_manquantes':
        return 'alert-info';
      case 'presences_manquantes':
        return 'alert-warning';
      default:
        return 'alert-secondary';
    }
  }

  getStatusClass(statut: string): string {
    switch (statut) {
      case 'admis':
        return 'badge-success';
      case 'en_attente':
        return 'badge-warning';
      case 'refuse':
        return 'badge-danger';
      case 'validee':
        return 'badge-success';
      default:
        return 'badge-secondary';
    }
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;

    if (this.autoRefresh) {
      this.refreshSubscription = interval(this.refreshInterval).subscribe(
        () => {
          console.log('Auto-refresh des données...');
          this.loadDashboardData();
        }
      );
    } else if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = null;
    }
  }

  manualRefresh(): void {
    this.loadDashboardData();
  }

  private destroyCharts(): void {
    const charts = [
      this.inscriptionChart,
      this.formationChart,
      this.scoresChart,
      this.attendanceChart,
    ];
    charts.forEach((chart) => {
      if (chart) {
        chart.destroy();
      }
    });
  }
  // Dans dashboard.component.ts
  loadWeeklyAttendance(): void {
    console.log('📊 DATA:', this.dashboardData?.charts?.attendanceRate); // ← AJOUTEZ
    console.log('📈 CTX:', document.getElementById('attendanceChart'));
    this.dashboardService.getWeeklyAttendanceData().subscribe({
      next: (response) => {
        if (response.success) {
          this.weeklyAttendanceData = response.data;
          this.createAttendanceChart();
        }
      },
    });
  }
}

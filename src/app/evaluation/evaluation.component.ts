import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import {
  EvaluationService,
  EvaluationApprenti,
  StatistiquesGenerales,
  StatistiquesTypeFormation,
} from '../services/evaluation.service';

@Component({
  selector: 'app-evaluation',
  templateUrl: './evaluation.component.html',
  styleUrls: ['./evaluation.component.css'],
  standalone: false,
})
export class EvaluationComponent implements OnInit, OnDestroy {
  // Données
  evaluations: EvaluationApprenti[] = [];
  filteredEvaluations: EvaluationApprenti[] = [];
  formations: any[] = [];
  statsTypeFormation: StatistiquesTypeFormation[] = [];

  // États
  isLoading = false;
  selectedView: 'apprentis' | 'stats' | 'classement' = 'apprentis';
  debugData: any = null;

  // Filtres
  searchTerm = '';
  filterFormation = '';
  filterTypeFormation = '';
  sortBy = 'moyenne_generale';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Subjects pour le debounce
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Stats générales
  stats: StatistiquesGenerales = {
    total_apprentis: 0,
    moyenne_globale: 0,
    meilleure_moyenne: 0,
    plus_basse_moyenne: 0,
    taux_reussite: 0,
  };

  constructor(private evaluationService: EvaluationService) {}

  ngOnInit() {
    // Configuration du debounce pour la recherche
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.applyFilters();
      });

    this.loadEvaluations();
    this.loadStatistiques();
    this.loadStatistiquesTypeFormation();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Debug des données
  debugDatabase() {
    this.evaluationService.debugDatabase().subscribe({
      next: (data) => {
        console.log('🔍 Données de debug:', data);
        this.debugData = data;
        alert('Données de debug disponibles dans la console');
      },
      error: (error) => {
        console.error('❌ Erreur debug:', error);
      }
    });
  }

  // Charger les évaluations avec les moyennes générales
  async loadEvaluations() {
    this.isLoading = true;
    try {
      const data = await this.evaluationService
        .getEvaluationsApprentis(this.sortDirection)
        .toPromise();

      if (data && data.length > 0) {
        this.evaluations = data;
        this.filteredEvaluations = [...this.evaluations];
        this.formations = this.extractFormations(this.evaluations);
        this.applySorting();
        console.log('✅ Évaluations chargées:', this.evaluations.length);
      } else {
        console.warn('Aucune donnée d\'évaluation reçue');
        this.loadMockData();
      }
    } catch (error) {
      console.error('Erreur API:', error);
      this.loadMockData();
    } finally {
      this.isLoading = false;
    }
  }

  // Charger les statistiques générales
  async loadStatistiques() {
    try {
      const data = await this.evaluationService
        .getStatistiquesGenerales()
        .toPromise();

      if (data) {
        this.stats = data;
        console.log('✅ Statistiques chargées:', this.stats);
      } else {
        console.warn('API returned no stats, using local stats');
        this.calculateLocalStats();
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats:', error);
      this.calculateLocalStats();
    }
  }

  // Charger les statistiques par type de formation
  async loadStatistiquesTypeFormation() {
    try {
      const data = await this.evaluationService
        .getStatistiquesParTypeFormation()
        .toPromise();

      if (data) {
        this.statsTypeFormation = data;
        console.log('✅ Stats par type chargées:', this.statsTypeFormation.length);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stats par type:', error);
    }
  }

  // Extraire les formations uniques
  private extractFormations(evaluations: EvaluationApprenti[]): any[] {
    const formationMap = new Map();

    evaluations.forEach((evaluation) => {
      if (evaluation.id_formation && evaluation.formation_metier) {
        const key = `${evaluation.id_formation}-${evaluation.type_formation}`;
        if (!formationMap.has(key)) {
          formationMap.set(key, {
            id_formation: evaluation.id_formation,
            metier: evaluation.formation_metier,
            type_formation: evaluation.type_formation,
          });
        }
      }
    });

    return Array.from(formationMap.values());
  }

  // Extraire les types de formation uniques
  getTypesFormation(): string[] {
    const types = new Set<string>();
    this.evaluations.forEach((evaluation) => {
      if (evaluation.type_formation) {
        types.add(evaluation.type_formation);
      }
    });
    return Array.from(types);
  }

  // Calculer les statistiques localement
  private calculateLocalStats() {
    const evaluationsArray = this.evaluations.filter(
      (e) => e.moyenne_generale !== null && e.moyenne_generale !== undefined && e.moyenne_generale > 0
    );

    this.stats.total_apprentis = evaluationsArray.length;

    if (evaluationsArray.length > 0) {
      const moyennes = evaluationsArray.map((e) => e.moyenne_generale);
      this.stats.moyenne_globale = Number(
        (moyennes.reduce((a, b) => a + b, 0) / moyennes.length).toFixed(2)
      );
      this.stats.meilleure_moyenne = Math.max(...moyennes);
      this.stats.plus_basse_moyenne = Math.min(...moyennes);

      const reussites = evaluationsArray.filter(
        (e) => e.moyenne_generale >= 10
      ).length;
      this.stats.taux_reussite = Number(
        ((reussites / evaluationsArray.length) * 100).toFixed(1)
      );
    } else {
      // Valeurs par défaut
      this.stats = {
        total_apprentis: 0,
        moyenne_globale: 0,
        meilleure_moyenne: 0,
        plus_basse_moyenne: 0,
        taux_reussite: 0,
      };
    }
  }

  // Gestion de la recherche avec debounce
  onSearchInput() {
    this.searchSubject.next(this.searchTerm);
  }

  // Appliquer le tri
  applySorting() {
    this.filteredEvaluations.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (this.sortBy) {
        case 'nom':
          valueA = (a.nom + ' ' + a.prenom).toLowerCase();
          valueB = (b.nom + ' ' + b.prenom).toLowerCase();
          break;
        case 'prenom':
          valueA = a.prenom.toLowerCase();
          valueB = b.prenom.toLowerCase();
          break;
        case 'formation':
          valueA = a.formation_metier?.toLowerCase() || '';
          valueB = b.formation_metier?.toLowerCase() || '';
          break;
        case 'type_formation':
          valueA = a.type_formation || '';
          valueB = b.type_formation || '';
          break;
        case 'mention':
          valueA = this.getMentionValue(a.mention);
          valueB = this.getMentionValue(b.mention);
          break;
        case 'completion':
          valueA = a.pourcentage_completion || 0;
          valueB = b.pourcentage_completion || 0;
          break;
        case 'moyenne_generale':
        default:
          valueA =
            a.moyenne_generale !== null && a.moyenne_generale !== undefined
              ? a.moyenne_generale
              : -1;
          valueB =
            b.moyenne_generale !== null && b.moyenne_generale !== undefined
              ? b.moyenne_generale
              : -1;
      }

      if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Obtenir la valeur numérique d'une mention pour le tri
  private getMentionValue(mention: string): number {
    if (!mention) return 0;

    switch (mention.toLowerCase()) {
      case 'très bien':
        return 5;
      case 'bien':
        return 4;
      case 'assez bien':
        return 3;
      case 'passable':
        return 2;
      case 'insuffisant':
        return 1;
      default:
        return 0;
    }
  }

  // Trier les colonnes
  sort(column: string) {
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = column === 'moyenne_generale' ? 'desc' : 'asc';
    }

    // Recharger les données si on change l'ordre de la moyenne générale
    if (column === 'moyenne_generale') {
      this.loadEvaluations();
    } else {
      this.applySorting();
    }
  }

  // Obtenir l'icône de tri
  getSortIcon(column: string): string {
    if (this.sortBy !== column) return '↕️';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  // Obtenir le libellé du tri actuel
  getSortLabel(): string {
    switch (this.sortBy) {
      case 'nom':
        return "Nom de l'apprenti";
      case 'prenom':
        return 'Prénom';
      case 'formation':
        return 'Formation';
      case 'type_formation':
        return 'Type de formation';
      case 'mention':
        return 'Mention';
      case 'completion':
        return 'Completion';
      case 'moyenne_generale':
      default:
        return 'Moyenne générale';
    }
  }

  // Obtenir la classe CSS pour la mention
  getMentionClass(mention: string): string {
    if (!mention) return 'mention-default';

    const mentionLower = mention.toLowerCase();
    if (mentionLower.includes('très bien')) return 'mention-excellent';
    if (mentionLower.includes('bien')) return 'mention-good';
    if (mentionLower.includes('assez bien')) return 'mention-fair';
    if (mentionLower.includes('passable')) return 'mention-passable';
    if (mentionLower.includes('insuffisant')) return 'mention-fail';
    if (mentionLower.includes('non évalué')) return 'mention-default';
    
    return 'mention-default';
  }

  // Obtenir la couleur selon la moyenne
  getMoyenneColor(moyenne: number): string {
    if (moyenne === null || moyenne === undefined || moyenne === 0) return 'gray';
    if (moyenne >= 16) return 'excellent';
    if (moyenne >= 14) return 'good';
    if (moyenne >= 10) return 'fair';
    return 'fail';
  }

  // Obtenir le nom complet de l'apprenti
  getApprentiFullName(evaluation: EvaluationApprenti): string {
    return `${evaluation.prenom || ''} ${evaluation.nom || ''}`.trim();
  }

  // Obtenir les initiales de l'apprenti
  getApprentiInitials(evaluation: EvaluationApprenti): string {
    const fullName = this.getApprentiFullName(evaluation);
    const names = fullName.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }

  // Obtenir le libellé du type de formation
  getTypeFormationLabel(type: string): string {
    switch (type) {
      case 'professionnel_dual':
        return 'Professionnel Dual';
      case 'modulaire':
        return 'Modulaire';
      case 'thematique':
        return 'Thématique';
      default:
        return type;
    }
  }

  // Obtenir la formule de calcul selon le type de formation
  getFormuleCalcul(evaluation: EvaluationApprenti): string {
    if (evaluation.type_formation === 'professionnel_dual') {
      return '(Théorique + Pratique) / 2';
    } else {
      return 'Moyenne Théorique';
    }
  }

  // Obtenir le détail de la moyenne
  getDetailMoyenne(evaluation: EvaluationApprenti): string {
    if (evaluation.type_formation === 'professionnel_dual') {
      if (evaluation.moyenne_theorique > 0 && evaluation.note_pratique > 0) {
        return `(${evaluation.moyenne_theorique.toFixed(
          2
        )} + ${evaluation.note_pratique.toFixed(
          2
        )}) / 2 = ${evaluation.moyenne_generale.toFixed(2)}`;
      } else if (evaluation.moyenne_theorique > 0) {
        return `Théorique: ${evaluation.moyenne_theorique.toFixed(2)}`;
      } else if (evaluation.note_pratique > 0) {
        return `Pratique: ${evaluation.note_pratique.toFixed(2)}`;
      } else {
        return 'Non évalué';
      }
    } else {
      return `${evaluation.moyenne_theorique.toFixed(2)}`;
    }
  }

  // Changer de vue
  setView(view: 'apprentis' | 'stats' | 'classement') {
    this.selectedView = view;
    if (view === 'classement') {
      this.loadClassement();
    }
  }

  // Charger le classement
  async loadClassement() {
    this.isLoading = true;
    try {
      const data = await this.evaluationService
        .getClassementApprentis()
        .toPromise();

      if (data) {
        this.evaluations = data;
        this.filteredEvaluations = [...this.evaluations];
        this.applySorting();
      }
    } catch (error) {
      console.error('Erreur lors du chargement du classement:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Effacer tous les filtres
  clearFilters() {
    this.searchTerm = '';
    this.filterFormation = '';
    this.filterTypeFormation = '';
    this.sortBy = 'moyenne_generale';
    this.sortDirection = 'desc';
    this.loadEvaluations();
  }

  applyFilters() {
    this.filteredEvaluations = this.evaluations.filter((evaluation) => {
      const matchesSearch =
        !this.searchTerm ||
        evaluation.nom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        evaluation.prenom
          .toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        evaluation.mention
          ?.toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        evaluation.email
          ?.toLowerCase()
          .includes(this.searchTerm.toLowerCase()) ||
        evaluation.formation_metier
          ?.toLowerCase()
          .includes(this.searchTerm.toLowerCase());

      const matchesFormation =
        !this.filterFormation ||
        evaluation.id_formation === this.filterFormation;

      const matchesTypeFormation =
        !this.filterTypeFormation ||
        evaluation.type_formation === this.filterTypeFormation;

      return matchesSearch && matchesFormation && matchesTypeFormation;
    });

    this.applySorting();
  }

  // Données mockées pour le développement
  private loadMockData() {
    console.log('📋 Chargement des données mockées');
    
    this.evaluations = [
      {
        id_apprenti: 'APR-001',
        nom: 'RAZAFINIRINA',
        prenom: 'Jean',
        email: 'jean.razafinirina@email.com',
        id_formation: 'FORM-GEN-GEN-798',
        formation_metier: 'Tourisme',
        type_formation: 'modulaire',
        moyenne_theorique: 15.5,
        note_pratique: 0,
        moyenne_generale: 15.5,
        mention: 'Bien',
        matieres_notees: 3,
        total_matieres: 5,
        note_minimale: 14.0,
        note_maximale: 17.0,
        pourcentage_completion: 60,
      },
      {
        id_apprenti: 'APR-002',
        nom: 'ZAZA',
        prenom: 'Manantena',
        email: 'manantena.zaza@email.com',
        id_formation: 'FORM-GEN-GEN-800',
        formation_metier: 'Commerce',
        type_formation: 'professionnel_dual',
        moyenne_theorique: 12.0,
        note_pratique: 14.5,
        moyenne_generale: 13.25,
        mention: 'Assez Bien',
        matieres_notees: 4,
        total_matieres: 6,
        note_minimale: 11.0,
        note_maximale: 14.0,
        pourcentage_completion: 67,
      },
    ];

    this.filteredEvaluations = [...this.evaluations];
    this.formations = this.extractFormations(this.evaluations);
    this.calculateLocalStats();
    
    console.log('✅ Données mockées chargées');
  }
}
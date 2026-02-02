import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { LoginComponent } from './login/login.component';
import { ApprentiComponent } from './apprentis/apprentis.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { FormationComponent } from './formations/formations.component';
import { NotesComponent } from './notes/notes.component';
import { UtilisateurComponent } from './utilisateur/utilisateur.component';
import { InscriptionComponent } from './inscriptions/inscriptions.component';
import { MatieresComponent } from './matieres/matieres.component';
import { SuiviPratiquesComponent } from './suivi-pratiques/suivi-pratiques.component';
import { PresenceComponent } from './presences/presences.component';
import { CertificatComponent } from './certificat/certificat.component';
import { ReinscriptionComponent } from './reinscription/reinscription.component';
import { EvaluationComponent } from './evaluation/evaluation.component';
import { RapportComponent } from './rapport/rapport.component';
const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'apprentis',
    component: ApprentiComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'formations',
    component: FormationComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'utilisateur',
    component: UtilisateurComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'notes',
    component: NotesComponent,
    canActivate: [AuthGuard],
  },

  {
    path: 'inscriptions',
    component: InscriptionComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'matieres',
    component: MatieresComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'suivi-pratiques',
    component: SuiviPratiquesComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'presences',
    component: PresenceComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'certificat',
    component: CertificatComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'reinscriptions',
    component: ReinscriptionComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'evaluation',
    component: EvaluationComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'rapport',
    component: RapportComponent,
    canActivate: [AuthGuard],
  },
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

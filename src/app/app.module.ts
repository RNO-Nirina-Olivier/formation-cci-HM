import { NgModule } from '@angular/core';
import {
  BrowserModule,
  provideClientHydration,
  withEventReplay,
} from '@angular/platform-browser';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgApexchartsModule } from 'ng-apexcharts';

// component
import { ApprentiComponent } from './apprentis/apprentis.component';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { FormationComponent } from './formations/formations.component';
import { NotesComponent } from './notes/notes.component';
import { LayoutComponent } from './layout/layout.component';
import { UtilisateurComponent } from './utilisateur/utilisateur.component';
import { InscriptionComponent } from './inscriptions/inscriptions.component';
import { MatieresComponent } from './matieres/matieres.component';
import { SuiviPratiquesComponent } from './suivi-pratiques/suivi-pratiques.component';
import { PresenceComponent } from './presences/presences.component';
import { CertificatComponent } from './certificat/certificat.component';
import { EvaluationComponent } from './evaluation/evaluation.component';
import { ReinscriptionComponent } from './reinscription/reinscription.component';
import { RapportComponent } from './rapport/rapport.component';

// Services
import { ApiService } from './services/api.service';
import { UtilisateurService } from './services/utilisateur.service';
import { ApprentiService } from './services/apprenti.service';
import { FormationService } from './services/formation.service';
import { InscriptionService } from './services/inscription.service';
import { EvaluationService } from './services/evaluation.service';
import { CertificatService } from './services/certificat.service';
import { PresenceService } from './services/presence.service';
import { SuiviPratiqueService } from './services/suivi-pratique.service';
import { MatiereService } from './services/matiere.service';
import { ReinscriptionService } from './services/reinscription.service';
import { RapportService } from './services/rapport.service';
import { DatePipe } from '@angular/common';

@NgModule({
  declarations: [
    AppComponent,
    ApprentiComponent,
    LoginComponent,
    DashboardComponent,
    FormationComponent,
   NotesComponent,
    LayoutComponent,
    UtilisateurComponent,
    InscriptionComponent,
    MatieresComponent,
   SuiviPratiquesComponent,
   PresenceComponent,
   CertificatComponent,
   EvaluationComponent,
    ReinscriptionComponent,
    RapportComponent,
  ],
  imports: [
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    CommonModule,
    BrowserModule,
    AppRoutingModule,
    NgApexchartsModule,
  ],
  providers: [
    provideClientHydration(withEventReplay()),
    ApiService,
    UtilisateurService,
    ApprentiService,
    FormationService,
    InscriptionService,
    EvaluationService,
    CertificatService,
    ReinscriptionService,
    PresenceService,
    SuiviPratiqueService,
    MatiereService,
    RapportService,
    DatePipe,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}

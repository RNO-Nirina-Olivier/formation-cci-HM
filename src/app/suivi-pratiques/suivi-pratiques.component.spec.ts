import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuiviPratiquesComponent } from './suivi-pratiques.component';

describe('SuiviPratiquesComponent', () => {
  let component: SuiviPratiquesComponent;
  let fixture: ComponentFixture<SuiviPratiquesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SuiviPratiquesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuiviPratiquesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

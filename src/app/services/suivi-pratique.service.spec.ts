import { TestBed } from '@angular/core/testing';

import { SuiviPratiqueService } from './suivi-pratique.service';

describe('SuiviPratiqueService', () => {
  let service: SuiviPratiqueService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SuiviPratiqueService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

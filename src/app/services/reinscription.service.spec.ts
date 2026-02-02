import { TestBed } from '@angular/core/testing';

import { ReinscriptionService } from './reinscription.service';

describe('ReinscriptionService', () => {
  let service: ReinscriptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReinscriptionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

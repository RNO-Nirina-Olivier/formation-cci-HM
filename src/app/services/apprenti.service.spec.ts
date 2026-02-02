import { TestBed } from '@angular/core/testing';

import { ApprentiService } from './apprenti.service';

describe('ApprentiService', () => {
  let service: ApprentiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApprentiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

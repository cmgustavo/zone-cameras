import { TestBed } from '@angular/core/testing';

import { ZoneminderService } from './zoneminder.service';

describe('ZoneminderService', () => {
  let service: ZoneminderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ZoneminderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { DashboardPage } from './dashboard-page';

const EMPTY_RESPONSE = { success: true, message: '', content: null, validationErrors: null };

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    // This setup doesn't tear the module down between specs on its own, and the fixture below
    // instantiates it — without the reset the second spec's configure call throws.
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  /** ngOnInit always fires one summary request; each spec answers it so verify() stays clean. */
  function expectSummaryRequest() {
    return httpMock.expectOne((r) => r.url.endsWith('/api/reports/dashboard'));
  }

  it('should create', () => {
    expect(component).toBeTruthy();
    expectSummaryRequest().flush(EMPTY_RESPONSE);
    httpMock.verify();
  });

  it('queries only the viewer\'s local day on init, sent as the instants that bound it', () => {
    const request = expectSummaryRequest();

    const from = new Date(request.request.params.get('from')!);
    const to = new Date(request.request.params.get('to')!);
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    expect(from.getTime()).toBe(midnight.getTime());
    expect(to.getTime()).toBe(midnight.getTime() + 24 * 60 * 60 * 1000 - 1);

    request.flush(EMPTY_RESPONSE);
    httpMock.verify();
  });

  it('re-queries the range when either date is changed', () => {
    expectSummaryRequest().flush(EMPTY_RESPONSE);

    component['onFromChange']('2026-09-01');

    const request = expectSummaryRequest();
    expect(new Date(request.request.params.get('from')!).getFullYear()).toBe(2026);
    expect(component['from']()).toBe('2026-09-01');

    request.flush(EMPTY_RESPONSE);
    httpMock.verify();
  });

  it('collapses the window onto one day when either end is dragged past the other', () => {
    expectSummaryRequest().flush(EMPTY_RESPONSE);

    // Both ends start on today, so moving the end back drags the start with it...
    component['onToChange']('2026-09-01');
    expectSummaryRequest().flush(EMPTY_RESPONSE);
    expect(component['from']()).toBe('2026-09-01');

    // ...and pushing the start beyond the end drags the end forward in turn.
    component['onFromChange']('2026-09-10');
    expectSummaryRequest().flush(EMPTY_RESPONSE);
    expect(component['to']()).toBe('2026-09-10');

    httpMock.verify();
  });

  it('keeps every card populated with zeroes when the response carries no content', () => {
    expectSummaryRequest().flush(EMPTY_RESPONSE);

    const summary = component['summary']();
    expect(summary.totalMailsReceived).toBe(0);
    expect(summary.slaViolated).toBe(0);
    expect(summary.traffic).toEqual([]);

    // All eight cards render regardless — nothing is gated on having data.
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-stat-card').length).toBe(8);

    httpMock.verify();
  });

  it('falls back to zeroes rather than blanking the cards when the request fails', () => {
    expectSummaryRequest().flush('boom', { status: 500, statusText: 'Server Error' });

    expect(component['summary']().totalMailsReceived).toBe(0);
    expect(component['isLoading']()).toBe(false);

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-stat-card').length).toBe(8);

    httpMock.verify();
  });
});

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BranchService } from './branch.service';
import { BranchDTO } from '../../domain/branch/branch.dto';

describe('BranchService', () => {
  let service: BranchService;
  let httpMock: HttpTestingController;

  const mockBranches: BranchDTO[] = [
    {
      id: 1,
      name: 'Headquarters',
      code: 'HQ',
      address: '123 Main St',
      latitude: 6.5244,
      longitude: 3.3792,
      isHeadquarters: true,
      timezone: 'Africa/Lagos',
      contactEmail: 'hq@company.com',
      isActive: true
    },
    {
      id: 2,
      name: 'Lagos Branch',
      code: 'LAG',
      address: '456 Victoria Island',
      latitude: 6.4281,
      longitude: 3.4653,
      isHeadquarters: false,
      timezone: 'Africa/Lagos',
      contactEmail: 'lagos@company.com',
      isActive: true
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BranchService]
    });
    service = TestBed.inject(BranchService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all branches', (done) => {
    service.getAllBranches().subscribe(branches => {
      expect(branches.length).toBe(2);
      expect(branches[0].name).toBe('Headquarters');
      done();
    });

    const req = httpMock.expectOne(req => req.url.includes('/branches'));
    expect(req.request.method).toBe('GET');
    req.flush(mockBranches);
  });

  it('should get branch by id', (done) => {
    service.getBranchById(1).subscribe(branch => {
      expect(branch.id).toBe(1);
      expect(branch.name).toBe('Headquarters');
      done();
    });

    const req = httpMock.expectOne(req => req.url.includes('/branches/1'));
    expect(req.request.method).toBe('GET');
    req.flush(mockBranches[0]);
  });

  it('should calculate haversine distance correctly', (done) => {
    const distance = service['haversineDistance'](6.5244, 3.3792, 6.4281, 3.4653);
    expect(distance).toBeGreaterThan(0);
    done();
  });

  it('should create a new branch', (done) => {
    const newBranch = {
      name: 'New Branch',
      code: 'NEW',
      address: '789 New Rd',
      latitude: 6.5000,
      longitude: 3.4000,
      isHeadquarters: false,
      timezone: 'Africa/Lagos',
      contactEmail: 'new@company.com',
      isActive: true
    };

    service.createBranch(newBranch).subscribe(branch => {
      expect(branch.id).toBe(3);
      expect(branch.name).toBe('New Branch');
      done();
    });

    const req = httpMock.expectOne(req => req.url.includes('/branches'));
    expect(req.request.method).toBe('POST');
    req.flush({ ...newBranch, id: 3, createdAt: new Date().toISOString() });
  });

  it('should update a branch', (done) => {
    const updated = { ...mockBranches[0], name: 'Updated HQ' };

    service.updateBranch(1, { name: 'Updated HQ' }).subscribe(branch => {
      expect(branch.name).toBe('Updated HQ');
      done();
    });

    const req = httpMock.expectOne(req => req.url.includes('/branches/1'));
    expect(req.request.method).toBe('PUT');
    req.flush(updated);
  });

  it('should delete a branch', (done) => {
    service.deleteBranch(1).subscribe(() => {
      expect(service.getBranches().length).toBe(1);
      done();
    });

    const req = httpMock.expectOne(req => req.url.includes('/branches/1'));
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should search branches by name', (done) => {
    service.branches$.subscribe(() => {
      service.searchBranches('Lagos').subscribe(results => {
        expect(results.length).toBe(1);
        expect(results[0].code).toBe('LAG');
        done();
      });
    });

    const req = httpMock.expectOne(req => req.url.includes('/branches'));
    req.flush(mockBranches);
  });
});

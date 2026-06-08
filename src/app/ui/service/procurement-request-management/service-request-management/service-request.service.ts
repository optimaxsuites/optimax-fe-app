import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { ServiceRequest, ServiceRequestStatus, ServiceType, RateType, ServiceMilestone } from '../../../domain/procurement-request/service-requests/service-requests.dto';

@Injectable({
  providedIn: 'root'
})
export class ServiceRequestService {
  
  private mockServiceRequests: ServiceRequest[] = [
    {
      id: 'SRV-001',
      customerId: 'CUST-001',
      customerName: 'John Doe Enterprises',
      serviceType: 'DEVELOPMENT',
      serviceName: 'E-commerce Website Development',
      description: 'Build a full-featured e-commerce website with payment integration',
      scopeOfWork: 'Frontend development, backend API, payment gateway integration, admin dashboard',
      deliverables: ['Working website', 'Source code', 'Technical documentation', 'Admin panel'],
      estimatedDuration: 12,
      durationUnit: 'WEEKS',
      rateType: 'FIXED_PRICE',
      rateAmount: 50000,
      estimatedTotal: 50000,
      currency: 'NGN',
      requiredSkills: ['React', 'Node.js', 'MongoDB', 'Stripe API'],
      requiredStaffCount: 3,
      locationType: 'REMOTE',
      specialInstructions: 'Must have previous e-commerce experience',
      attachments: [],
      status: 'VENDORS_QUOTING',
      createdAt: new Date('2026-05-20'),
      updatedAt: new Date('2026-05-20')
    },
    {
      id: 'SRV-002',
      customerId: 'CUST-001',
      customerName: 'John Doe Enterprises',
      serviceType: 'CONSULTING',
      serviceName: 'Digital Marketing Strategy',
      description: 'Develop comprehensive digital marketing strategy',
      scopeOfWork: 'Market research, competitor analysis, SEO strategy, social media planning',
      deliverables: ['Strategy document', 'Implementation plan', 'KPIs dashboard', 'Monthly review'],
      estimatedDuration: 80,
      durationUnit: 'HOURS',
      rateType: 'HOURLY',
      rateAmount: 150,
      estimatedTotal: 12000,
      currency: 'NGN',
      requiredSkills: ['SEO', 'Social Media Marketing', 'Content Strategy', 'Analytics'],
      requiredStaffCount: 2,
      locationType: 'ONSITE',
      serviceLocation: 'Lagos, Nigeria',
      attachments: [],
      status: 'CONTRACT_SIGNED',
      createdAt: new Date('2026-05-15'),
      updatedAt: new Date('2026-05-18'),
      selectedVendorId: 'VEND-002',
      selectedVendorName: 'Digital Marketing Pros'
    },
    {
      id: 'SRV-003',
      customerId: 'CUST-001',
      customerName: 'John Doe Enterprises',
      serviceType: 'IT_SUPPORT',
      serviceName: 'Ongoing IT Support',
      description: 'Monthly IT support and maintenance for office network',
      scopeOfWork: 'Network monitoring, hardware maintenance, software updates, user support',
      deliverables: ['Monthly report', '24/7 monitoring', 'Emergency support'],
      estimatedDuration: 3,
      durationUnit: 'MONTHS',
      rateType: 'MONTHLY',
      rateAmount: 2000,
      estimatedTotal: 6000,
      currency: 'NGN',
      requiredSkills: ['Network Administration', 'Hardware Troubleshooting', 'Windows Server'],
      requiredStaffCount: 2,
      locationType: 'ONSITE',
      serviceLocation: 'Lagos, Nigeria',
      attachments: [],
      status: 'IN_PROGRESS',
      createdAt: new Date('2026-05-01'),
      updatedAt: new Date('2026-05-10'),
      selectedVendorId: 'VEND-005',
      selectedVendorName: 'Tech Support Nigeria'
    },
    {
      id: 'SRV-004',
      customerId: 'CUST-001',
      customerName: 'John Doe Enterprises',
      serviceType: 'DESIGN',
      serviceName: 'Brand Identity Design',
      description: 'Complete brand identity package including logo, colors, typography',
      scopeOfWork: 'Logo design, color palette, typography selection, brand guidelines',
      deliverables: ['Logo files', 'Brand guidelines', 'Stationery templates', 'Social media kit'],
      estimatedDuration: 4,
      durationUnit: 'WEEKS',
      rateType: 'MILESTONE_BASED',
      rateAmount: 8000,
      estimatedTotal: 8000,
      currency: 'NGN',
      requiredSkills: ['Graphic Design', 'Brand Strategy', 'Adobe Creative Suite'],
      requiredStaffCount: 1,
      locationType: 'REMOTE',
      specialInstructions: 'Modern and minimalist style preferred',
      attachments: [],
      status: 'VENDOR_SELECTED',
      createdAt: new Date('2026-05-22'),
      updatedAt: new Date('2026-05-23'),
      selectedVendorId: 'VEND-008',
      selectedVendorName: 'Creative Designs Ltd',
      milestones: [
        {
          id: 'M1',
          name: 'Initial Concepts',
          description: 'Submit 3 initial logo concepts',
          percentageComplete: 0,
          dueDate: new Date('2026-06-10'),
          paymentAmount: 2000,
          status: 'PENDING'
        },
        {
          id: 'M2',
          name: 'Final Logo',
          description: 'Finalize logo after feedback',
          percentageComplete: 0,
          dueDate: new Date('2026-06-20'),
          paymentAmount: 2000,
          status: 'PENDING'
        },
        {
          id: 'M3',
          name: 'Brand Guidelines',
          description: 'Complete brand guidelines document',
          percentageComplete: 0,
          dueDate: new Date('2026-07-01'),
          paymentAmount: 2000,
          status: 'PENDING'
        },
        {
          id: 'M4',
          name: 'Final Delivery',
          description: 'Deliver all final assets',
          percentageComplete: 0,
          dueDate: new Date('2026-07-10'),
          paymentAmount: 2000,
          status: 'PENDING'
        }
      ]
    }
  ];

  getServiceRequests(filters: any): Observable<{ data: ServiceRequest[]; totalElements: number; totalPages: number }> {
    let filtered = [...this.mockServiceRequests];
    
    if (filters.status && filters.status !== 'ALL') {
      filtered = filtered.filter(sr => sr.status === filters.status);
    }
    
    if (filters.serviceType && filters.serviceType !== 'ALL') {
      filtered = filtered.filter(sr => sr.serviceType === filters.serviceType);
    }
    
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(sr => 
        sr.serviceName.toLowerCase().includes(search) ||
        sr.id.toLowerCase().includes(search) ||
        sr.description.toLowerCase().includes(search)
      );
    }
    
    const start = filters.page * filters.size;
    const paginated = filtered.slice(start, start + filters.size);
    
    return of({
      data: paginated,
      totalElements: filtered.length,
      totalPages: Math.ceil(filtered.length / filters.size)
    }).pipe(delay(500));
  }

  getServiceRequestById(id: string): Observable<ServiceRequest | undefined> {
    return of(this.mockServiceRequests.find(sr => sr.id === id)).pipe(delay(300));
  }

  createServiceRequest(data: Partial<ServiceRequest>): Observable<ServiceRequest> {
    const newRequest: ServiceRequest = {
      id: 'SRV-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      customerId: data.customerId || 'CUST-001',
      customerName: data.customerName || 'John Doe Enterprises',
      serviceType: data.serviceType || 'OTHER',
      serviceName: data.serviceName || '',
      description: data.description || '',
      scopeOfWork: data.scopeOfWork || '',
      deliverables: data.deliverables || [],
      estimatedDuration: data.estimatedDuration || 0,
      durationUnit: data.durationUnit || 'DAYS',
      rateType: data.rateType || 'FIXED_PRICE',
      rateAmount: data.rateAmount || 0,
      estimatedTotal: data.estimatedTotal || 0,
      currency: data.currency || 'NGN',
      requiredSkills: data.requiredSkills || [],
      requiredStaffCount: data.requiredStaffCount || 1,
      locationType: data.locationType || 'REMOTE',
      serviceLocation: data.serviceLocation,
      specialInstructions: data.specialInstructions,
      attachments: [],
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
      milestones: data.rateType === 'MILESTONE_BASED' ? data.milestones : undefined
    };
    this.mockServiceRequests.unshift(newRequest);
    return of(newRequest).pipe(delay(500));
  }

  updateServiceRequest(id: string, data: Partial<ServiceRequest>): Observable<ServiceRequest> {
    const index = this.mockServiceRequests.findIndex(sr => sr.id === id);
    if (index !== -1) {
      this.mockServiceRequests[index] = { 
        ...this.mockServiceRequests[index], 
        ...data, 
        updatedAt: new Date() 
      };
      return of(this.mockServiceRequests[index]).pipe(delay(500));
    }
    throw new Error('Service request not found');
  }

  updateServiceRequestStatus(id: string, status: ServiceRequestStatus): Observable<ServiceRequest> {
    const index = this.mockServiceRequests.findIndex(sr => sr.id === id);
    if (index !== -1) {
      this.mockServiceRequests[index].status = status;
      this.mockServiceRequests[index].updatedAt = new Date();
      
      if (status === 'COMPLETED') {
        this.mockServiceRequests[index].completedAt = new Date();
      }
      
      return of(this.mockServiceRequests[index]).pipe(delay(500));
    }
    throw new Error('Service request not found');
  }

  cancelServiceRequest(id: string, reason: string): Observable<ServiceRequest> {
    const index = this.mockServiceRequests.findIndex(sr => sr.id === id);
    if (index !== -1) {
      this.mockServiceRequests[index].status = 'CANCELLED';
      this.mockServiceRequests[index].cancelledAt = new Date();
      this.mockServiceRequests[index].cancellationReason = reason;
      return of(this.mockServiceRequests[index]).pipe(delay(500));
    }
    throw new Error('Service request not found');
  }

  addMilestone(requestId: string, milestone: ServiceMilestone): Observable<ServiceRequest> {
    const index = this.mockServiceRequests.findIndex(sr => sr.id === requestId);
    if (index !== -1 && this.mockServiceRequests[index].milestones) {
      this.mockServiceRequests[index].milestones!.push(milestone);
      return of(this.mockServiceRequests[index]).pipe(delay(500));
    }
    throw new Error('Service request not found');
  }

  updateMilestoneProgress(requestId: string, milestoneId: string, percentageComplete: number): Observable<ServiceRequest> {
    const index = this.mockServiceRequests.findIndex(sr => sr.id === requestId);
    if (index !== -1 && this.mockServiceRequests[index].milestones) {
      const milestone = this.mockServiceRequests[index].milestones!.find((m: ServiceMilestone) => m.id === milestoneId);
      if (milestone) {
        milestone.percentageComplete = percentageComplete;
        if (percentageComplete === 100) {
          milestone.status = 'COMPLETED';
          milestone.completedAt = new Date();
        }
      }
      return of(this.mockServiceRequests[index]).pipe(delay(500));
    }
    throw new Error('Service request not found');
  }
}
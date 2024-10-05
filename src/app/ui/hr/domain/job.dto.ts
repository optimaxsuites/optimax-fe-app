export interface JobDTO {
    id?: number;
    title?: string;
    category?: string;
    description?: string;
    company?: string;
    location?: string;
    employmentType?: string; // e.g., Full-time, Part-time
    postedDate?: string;
    expiryDate?: Date;
    specification?: string;
    
    positionOverview?: string;
    keyResponsibilities?: string;
    qualifications?: string;

}
export interface JobDTO {
    id?: number;
    title?: string;
    category?: string;
    description?: string;
    company?: string;
    location?: string;
    employmentType?: string; // e.g., Full-time, Part-time
    postedDate?: Date;
    expiryDate?: Date;

    companyOverview?: string;
    positionOverview?: string;
    keyResponsibilities?: string;
    qualifications?: string;

}
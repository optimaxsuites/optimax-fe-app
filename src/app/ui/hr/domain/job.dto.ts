export interface JobDTO {
    id?: string;
    title?: string;
    category?: string;
    description?: string;
    location?: string;
    employmentType?: string; // e.g., Full-time, Part-time
    postedDate?: string;
    expiryDate?: Date;
    specification?: string;
    experience?: string;
    qualification?: string;

}

export interface JobExperienceDTO{
    id?: number;
    name?: string;
    des?: string;
}
export interface JobCategoryDTO{
    id?: number;
    name?: string;
    des?: string;
}
export interface JobTypeDTO{
    id?: number;
    name?: string;
    des?: string;
}
export interface JobSpecificationDTO{
    id?: number;
    name?: string;
    des?: string;
}
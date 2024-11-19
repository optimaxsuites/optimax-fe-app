export interface JobPostingDTO {
    id?: string;
    title?: string;
    category?: string;
    description?: string;
    location?: string;
    employmentType?: string;
    postedDate?: string;
    expiryDate?: Date;
    specification?: string;
    experience?: string;
    qualification?: string;
    fields?: JobPostingCustomFieldDTO[]; 
}
export interface JobPostingCustomFieldDTO {
    label?: string;
    type?: string; 
    options?: string[];
    required?: boolean;
}
export interface JobVacancyExperienceDTO{
    id?: number;
    name?: string;
    description?: string;
}
export interface JobVacancyCategoryDTO{
    id?: number;
    name?: string;
    description?: string;
}
export interface JobVacancyTypeDTO{
    id?: number;
    name?: string;
    description?: string;
}
export interface JobVacancySpecificationDTO{
    id?: number;
    name?: string;
    description?: string;
}
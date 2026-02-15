export interface JobPostingDTO {
    id?: number;
    jobTitle?: string;
    jobCategory?: number | any;
    companyOverview?: string;
    location?: string;
    jobType?: number | any;
    jobPostedDate?: string;
    jobExpiryDate?: string;
    jobVacancySpecification?: number;
    jobVacancyExperience?: number;
    qualifications?: number;
    jobVacancyCustomFields?: number[]; 
}
export interface JobPostingCustomFieldDTO {
    id?: number;
    label?: string;
    type?: string; 
    options?: string[];
    required?: boolean;
}
export interface JobVacancyExperienceDTO{
    id?: number;
    name?: string;
    code?: string;
    description?: string;
}
export interface JobVacancyCategoryDTO{
    id?: number;
    name?: string;
    code?: string;
    description?: string;
}
export interface JobVacancyTypeDTO{
    id?: number;
    name?: string;
    code?: string;
    description?: string;
}
export interface JobVacancySpecificationDTO{
    id?: number;
    name?: string;
    code?: string;
    description?: string;
}
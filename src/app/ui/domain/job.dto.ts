export interface JobPostingDTO {
    id?: number;
    jobTitle?: string;
    jobCategory?: JobVacancyCategoryDTO | number | any;
    companyOverview?: string;
    location?: string;
    jobType?: JobVacancyTypeDTO | number | any;
    jobPostedDate?: string;
    jobExpiryDate?: string;
    jobVacancySpecification?: JobVacancySpecificationDTO | number | any;
    jobVacancyExperience?: JobVacancyExperienceDTO | number | any;
    qualifications?: JobVacancyQualificationDTO | number | string | any;
    jobVacancyCustomFields?: (JobPostingCustomFieldDTO | number)[]; 
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

export interface JobVacancyQualificationDTO{
    id?: number;
    name?: string;
    code?: string;
    description?: string;
}

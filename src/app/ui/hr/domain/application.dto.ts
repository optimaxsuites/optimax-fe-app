import { JobVacancyCustomFieldsDTO, JobVacancyDTO } from './job.dto';

export type JobApplicationFileDTO = File | Blob | null;

export enum CustomFieldResponseType {
  String = 'String',
  File = 'File',
}

export interface CustomFieldResponceDTO {
  id?: number;
  jobVacancyCustomFields?: JobVacancyCustomFieldsDTO;
  value?: string;
  type?: CustomFieldResponseType;
}

export interface JobApplicationDTO {
  id?: number;
  jobVacancy?: JobVacancyDTO;
  firstname?: string;
  lastname?: string;
  coverLetter?: JobApplicationFileDTO;
  cv?: JobApplicationFileDTO;
  customFieldsResponce?: CustomFieldResponceDTO[];
}

export type JobApplicationMultipartDTO = JobApplicationDTO & {
  [key: `customFile_${number}`]: JobApplicationFileDTO | undefined;
};

export interface LinkedInDmTemplate {
  id: string;
  name: string;
  body: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

export type LinkedInDmTemplateFormData = Pick<LinkedInDmTemplate, 'name' | 'body'>;

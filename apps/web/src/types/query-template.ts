export interface QueryTemplate {
  id: string;
  groupId: string;
  template: string;
  placeholders: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  group?: QueryTemplateGroup;
}

export interface QueryTemplateGroup {
  id: string;
  name: string;
  description?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  templates: QueryTemplate[];
}

export interface UserQueryTemplate {
  id: string;
  userId: string;
  templateId: string;
  enabled: boolean;
  createdAt: string;
  template: QueryTemplate;
}

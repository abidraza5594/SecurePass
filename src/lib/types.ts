export interface CustomField {
  label: string;
  value: string;
}

export interface ApiKey {
  id: string;
  modelName: string;
  apiKey: string;
  status: 'Active' | 'Inactive';
  tags?: string[];
  customFields?: CustomField[];
}

export interface Password {
  id: string;
  appName: string;
  username: string;
  password: string;
  status: 'Active' | 'Inactive';
  tags?: string[];
  customFields?: CustomField[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  customFields?: CustomField[];
}

export interface Tag {
  _id: string;
  name: string;
  description: string;
  color: string;
  team: string;
  createdAt: Date | string;
  createdBy?: string;
  updatedAt: Date | string;
  updatedBy?: string;
}

export interface CreateTagProps {
  name: string;
  description: string;
  color: string;
  team: string;
  createdBy: string;
}

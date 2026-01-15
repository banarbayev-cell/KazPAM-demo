export interface UserProfile {
  id: number;
  email: string;
  name?: string;
  is_active: boolean;
  roles: string[];
  permissions: string[];
}

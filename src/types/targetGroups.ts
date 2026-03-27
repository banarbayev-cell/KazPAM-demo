import type { Target } from "./targets";

export interface TargetGroup {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  targets?: Target[];
}
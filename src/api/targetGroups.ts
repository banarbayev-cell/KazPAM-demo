import { api } from "@/services/api";
import type { TargetGroup } from "@/types/targetGroups";

export async function listTargetGroups(): Promise<TargetGroup[]> {
  return api.get<TargetGroup[]>("/target-groups/");
}
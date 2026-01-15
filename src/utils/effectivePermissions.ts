// src/utils/effectivePermissions.ts

export type EffectivePermission = {
  code: string;
  description?: string;
  granted: boolean;
  roles: string[];
  policies: string[];
};

type PermissionLike = {
  code: string;
  description?: string;
};

type PolicyLike = {
  id?: number | string;
  name?: string;
  title?: string;
  permissions?: PermissionLike[];
};

type RoleLike = {
  id?: number | string;
  name?: string;
  policies?: PolicyLike[];
};

export function buildEffectivePermissions(input: {
  roles: RoleLike[];
  allPermissions?: PermissionLike[]; // optional, for explicit Denied rows if ever needed
}): EffectivePermission[] {
  const { roles, allPermissions } = input;

  const map = new Map<
    string,
    {
      code: string;
      description?: string;
      roles: Set<string>;
      policies: Set<string>;
    }
  >();

  for (const role of roles || []) {
    const roleName = (role?.name || "Unnamed role").trim();

    for (const policy of role?.policies || []) {
      const policyName = ((policy?.name || policy?.title) || "Unnamed policy").trim();

      for (const perm of policy?.permissions || []) {
        const code = (perm?.code || "").trim();
        if (!code) continue;

        const existing = map.get(code);
        if (!existing) {
          map.set(code, {
            code,
            description: perm.description,
            roles: new Set([roleName]),
            policies: new Set([policyName]),
          });
        } else {
          if (!existing.description && perm.description) existing.description = perm.description;
          existing.roles.add(roleName);
          existing.policies.add(policyName);
        }
      }
    }
  }

  // Optional: include "Denied" rows if allPermissions is available.
  if (allPermissions && allPermissions.length > 0) {
    for (const p of allPermissions) {
      const code = (p?.code || "").trim();
      if (!code) continue;

      if (!map.has(code)) {
        map.set(code, {
          code,
          description: p.description,
          roles: new Set(),
          policies: new Set(),
        });
      }
    }
  }

  const result: EffectivePermission[] = Array.from(map.values()).map((v) => ({
    code: v.code,
    description: v.description,
    granted: v.roles.size > 0,
    roles: Array.from(v.roles),
    policies: Array.from(v.policies),
  }));

  // Sort: Granted first, then by code
  result.sort((a, b) => {
    if (a.granted !== b.granted) return a.granted ? -1 : 1;
    return a.code.localeCompare(b.code);
  });

  return result;
}

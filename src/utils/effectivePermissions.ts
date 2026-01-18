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

  // ⬇️ НОВОЕ (v1 реальность KazPAM)
  permissions?: PermissionLike[];
};

export function buildEffectivePermissions(input: {
  roles: RoleLike[];
  allPermissions?: PermissionLike[]; // optional, for explicit Denied rows if ever needed
}): EffectivePermission[] {
  const { roles, allPermissions } = input;

  /**
   * Internal aggregation map:
   * code -> { roles, policies }
   */
  const map = new Map<
    string,
    {
      code: string;
      description?: string;
      roles: Set<string>;
      policies: Set<string>;
    }
  >();

  // =====================================================
  // 1️⃣ GRANTED permissions from role.permissions (v1 core)
  // =====================================================
  for (const role of roles || []) {
    const roleName = (role?.name || "Unnamed role").trim();

    const rolePolicies =
      role?.policies?.map((p) => ((p?.name || p?.title) || "Unnamed policy").trim()) || [];

    for (const perm of role?.permissions || []) {
      const code = (perm?.code || "").trim();
      if (!code) continue;

      const existing = map.get(code);
      if (!existing) {
        map.set(code, {
          code,
          description: perm.description,
          roles: new Set([roleName]),
          policies: new Set(rolePolicies),
        });
      } else {
        if (!existing.description && perm.description) {
          existing.description = perm.description;
        }
        existing.roles.add(roleName);
        rolePolicies.forEach((p) => existing.policies.add(p));
      }
    }
  }

  // =================================================================
  // 2️⃣ GRANTED permissions from policy.permissions (future / optional)
  //    ⚠️ Текущую логику НЕ удаляем
  // =================================================================
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
          if (!existing.description && perm.description) {
            existing.description = perm.description;
          }
          existing.roles.add(roleName);
          existing.policies.add(policyName);
        }
      }
    }
  }

  // =====================================================
  // 3️⃣ Optional: Denied rows if allPermissions provided
  // =====================================================
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

  // =====================================================
  // 4️⃣ Normalize output
  // =====================================================
  const result: EffectivePermission[] = Array.from(map.values()).map((v) => ({
    code: v.code,
    description: v.description,
    granted: v.roles.size > 0,
    roles: Array.from(v.roles),
    policies: Array.from(v.policies),
  }));

  // Sort: Granted first, then alphabetically
  result.sort((a, b) => {
    if (a.granted !== b.granted) return a.granted ? -1 : 1;
    return a.code.localeCompare(b.code);
  });

  return result;
}

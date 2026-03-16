import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ldapApi, LdapRoleMapping } from "@/api/ldap";

export default function LdapRoleMappingsCard() {
  const [items, setItems] = useState<LdapRoleMapping[]>([]);
  const [groupDn, setGroupDn] = useState("");
  const [roleName, setRoleName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await ldapApi.listMappings();
      setItems(res);
    } catch {
      toast.error("Не удалось загрузить LDAP mappings");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async () => {
    if (!groupDn.trim() || !roleName.trim()) {
      toast.error("Укажи Group DN и Role");
      return;
    }

    setSaving(true);
    try {
      await ldapApi.upsertMapping({
        group_dn: groupDn.trim(),
        role_name: roleName.trim(),
        is_enabled: true,
      });
      toast.success("Mapping сохранён");
      setGroupDn("");
      setRoleName("");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Ошибка сохранения mapping");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    try {
      await ldapApi.deleteMapping(id);
      toast.success("Mapping удалён");
      load();
    } catch (e: any) {
      toast.error(e?.message || "Ошибка удаления mapping");
    }
  };

  return (
    <div className="bg-[#0E1A3A] border border-white/10 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">LDAP Group → Role Mapping</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <input
          value={groupDn}
          onChange={(e) => setGroupDn(e.target.value)}
          placeholder="CN=Domain Admins,CN=Users,DC=company,DC=local"
          className="w-full bg-[#121A33] border border-[#2A3B55] rounded-lg px-4 py-3 text-white"
        />
        <input
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          placeholder="SOC Admin / User / Auditor"
          className="w-full bg-[#121A33] border border-[#2A3B55] rounded-lg px-4 py-3 text-white"
        />
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-[#0052FF] hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg"
        >
          {saving ? "Сохранение..." : "Сохранить mapping"}
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 bg-[#121A33] border border-white/10 rounded-lg px-4 py-3"
          >
            <div>
              <div className="text-white text-sm">{item.group_dn}</div>
              <div className="text-gray-400 text-xs">→ {item.role_name}</div>
            </div>
            <button
              onClick={() => onDelete(item.id)}
              className="text-red-300 hover:text-red-200 text-sm"
            >
              Удалить
            </button>
          </div>
        ))}

        {!items.length && (
          <div className="text-sm text-gray-400">Mappings пока не добавлены</div>
        )}
      </div>
    </div>
  );
}
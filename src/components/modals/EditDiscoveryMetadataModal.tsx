import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { updateDiscoveryAccountMetadata } from "../../api/discovery";
import type { DiscoveredAccount } from "../../types/discovery";

interface EditDiscoveryMetadataModalProps {
  isOpen: boolean;
  account: DiscoveredAccount | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export default function EditDiscoveryMetadataModal({
  isOpen,
  account,
  onClose,
  onSaved,
}: EditDiscoveryMetadataModalProps) {
  const [owner, setOwner] = useState("");
  const [notes, setNotes] = useState("");
  const [linkedVaultSecretId, setLinkedVaultSecretId] = useState("");
  const [linkedPolicyId, setLinkedPolicyId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!account) return;

    setOwner(account.owner ?? "");
    setNotes(account.notes ?? "");
    setLinkedVaultSecretId(
      account.linked_vault_secret_id != null
        ? String(account.linked_vault_secret_id)
        : ""
    );
    setLinkedPolicyId(
      account.linked_policy_id != null ? String(account.linked_policy_id) : ""
    );
  }, [account]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !account) return null;

  async function handleSave() {
    try {
      setSaving(true);

      const payload = {
        owner: owner.trim() || null,
        notes: notes.trim() || null,
        linked_vault_secret_id: linkedVaultSecretId.trim()
          ? Number(linkedVaultSecretId)
          : null,
        linked_policy_id: linkedPolicyId.trim()
          ? Number(linkedPolicyId)
          : null,
      };

      if (
        payload.linked_vault_secret_id !== null &&
        Number.isNaN(payload.linked_vault_secret_id)
      ) {
        toast.error("ID секрета Vault должен быть числом");
        return;
      }

      if (
        payload.linked_policy_id !== null &&
        Number.isNaN(payload.linked_policy_id)
      ) {
        toast.error("ID политики должен быть числом");
        return;
      }

      await updateDiscoveryAccountMetadata(account.id, payload);

      toast.success("Метаданные аккаунта обновлены");
      await onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to update discovery metadata", error);
      toast.error("Не удалось обновить метаданные");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-[#1E2A45] bg-[#121A33] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#1E2A45] px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Редактировать метаданные
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Аккаунт: <span className="text-gray-200">{account.account_name}</span>
            </p>
            <p className="text-xs text-gray-500">
              ID: {account.id} · target_id: {account.target_id}
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-[#0E1A3A] hover:text-white disabled:opacity-50"
          >
            Закрыть
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-2">
          <div className="md:col-span-1">
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Владелец
            </label>
            <input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Например: admin@kazpam.kz"
              className="w-full rounded-xl border border-[#1E2A45] bg-[#0E1A3A] px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-[#0052FF]"
            />
          </div>

          <div className="md:col-span-1">
            <label className="mb-2 block text-sm font-medium text-gray-300">
              ID секрета Vault
            </label>
            <input
              value={linkedVaultSecretId}
              onChange={(e) => setLinkedVaultSecretId(e.target.value)}
              placeholder="Например: 16"
              inputMode="numeric"
              className="w-full rounded-xl border border-[#1E2A45] bg-[#0E1A3A] px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-[#0052FF]"
            />
          </div>

          <div className="md:col-span-1">
            <label className="mb-2 block text-sm font-medium text-gray-300">
              ID политики
            </label>
            <input
              value={linkedPolicyId}
              onChange={(e) => setLinkedPolicyId(e.target.value)}
              placeholder="Например: 3"
              inputMode="numeric"
              className="w-full rounded-xl border border-[#1E2A45] bg-[#0E1A3A] px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-[#0052FF]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Заметки
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Комментарий по onboarding или контекст владельца"
              rows={5}
              className="w-full resize-none rounded-xl border border-[#1E2A45] bg-[#0E1A3A] px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-[#0052FF]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#1E2A45] px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-[#1E2A45] bg-transparent px-4 py-2 text-gray-200 hover:bg-[#0E1A3A] disabled:opacity-50"
          >
            Отмена
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-[#0052FF] px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
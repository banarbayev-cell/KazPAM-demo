import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";

/**
 * SettingsTabs — ЧИСТО UI-КОМПОНЕНТ
 * ❌ НЕ знает про API
 * ❌ НЕ знает про toast
 * ❌ НЕ знает про backend
 *
 * Он просто:
 * - переключает вкладки
 * - рендерит переданный JSX
 */

type Tab = "general" | "security" | "integrations";

interface SettingsTabsProps {
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;

  general: React.ReactNode;
  security: React.ReactNode;
  integrations: React.ReactNode;
}

export default function SettingsTabs({
  activeTab = "general",
  onTabChange,
  general,
  security,
  integrations,
}: SettingsTabsProps) {
  const [tab, setTab] = useState<Tab>(activeTab);

  function changeTab(next: Tab) {
    setTab(next);
    onTabChange?.(next);
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition
     ${
       tab === t
         ? "bg-[#0052FF] text-white"
         : "bg-[#0E1A3A] text-gray-300 hover:text-white"
     }`;

  return (
    <div>
      {/* ---------- Tabs header ---------- */}
      <div className="flex gap-2 mb-8">
        <button onClick={() => changeTab("general")} className={tabClass("general")}>
          General
        </button>

        <button onClick={() => changeTab("security")} className={tabClass("security")}>
          Security
        </button>

        <button
          onClick={() => changeTab("integrations")}
          className={tabClass("integrations")}
        >
          Integrations
        </button>
      </div>

      {/* ---------- Tabs content ---------- */}
      <div>
        {tab === "general" && general}
        {tab === "security" && security}
        {tab === "integrations" && integrations}
      </div>
    </div>
  );
}

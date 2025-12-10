import { useState } from "react";

export default function CreateSecretModal({ open, onClose, onCreate }: any) {
  if (!open) return null;

  const [system, setSystem] = useState("");
  const [login, setLogin] = useState("");
  const [type, setType] = useState("Пароль");
  const [platform, setPlatform] = useState("Windows");

  const handleSubmit = () => {
    if (!system || !login) return alert("Заполните все поля!");

    onCreate({
      system,
      login,
      type,
      platform,
      updated: new Date().toLocaleDateString("ru-RU"),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-[420px] shadow-xl">

        <h2 className="text-2xl font-bold mb-4 text-black">Добавить секрет</h2>

        {/* ВОТ ЭТОТ КОНТЕЙНЕР НУЖЕН */}
        <div className="flex flex-col gap-3">

          <input
            className="border p-2 rounded text-black"
            placeholder="Название системы"
            value={system}
            onChange={(e) => setSystem(e.target.value)}
          />

          <input
            className="border p-2 rounded text-black"
            placeholder="Логин"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
          />

          <select
            className="border p-2 rounded text-black"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option>Пароль</option>
            <option>SSH ключ</option>
            <option>Access Keys</option>
            <option>API Token</option>
          </select>

          <select
            className="border p-2 rounded text-black"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="Windows">Windows</option>
            <option value="Linux">Linux</option>
            <option value="Cisco">Cisco</option>
            <option value="PostgreSQL">PostgreSQL</option>
            <option value="MySQL">MySQL</option>
            <option value="AWS">AWS</option>
            <option value="Solaris">Solaris</option>
            <option value="Custom">Другое / Custom</option>
          </select>

          <button className="k-btn-primary text-white" onClick={handleSubmit}>
            Добавить
          </button>

          <button className="k-btn-secondary mt-2 text-black" onClick={onClose}>
            Отмена
          </button>

        </div>

      </div>
    </div>
  );
}

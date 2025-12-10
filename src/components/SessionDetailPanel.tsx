import { X } from "lucide-react";

export default function SessionDetailPanel({ open, onClose, session }: any) {
  if (!open || !session) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] bg-[#0A0F24] text-white shadow-2xl z-[99999] p-6 animate-slide-left">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Детали сессии</h2>
        <button onClick={onClose}><X className="w-6 h-6 text-gray-300 hover:text-white" /></button>
      </div>

      <div className="space-y-3 text-sm">
        <p><strong>Пользователь:</strong> {session.user}</p>
        <p><strong>Система:</strong> {session.system}</p>
        <p><strong>Тип системы:</strong> {session.os}</p>
        <p><strong>Метод доступа:</strong> {session.conn}</p>
        <p><strong>Приложение / БД:</strong> {session.app}</p>
        <p><strong>IP-адрес:</strong> {session.ip}</p>
        <p><strong>Начало:</strong> {session.date}</p>
        <p><strong>Длительность:</strong> {session.duration}</p>
        <p><strong>Последняя команда:</strong> {session.last_command}</p>
        <p><strong>Риск:</strong> {session.risk}</p>
      </div>

      <hr className="my-6 border-gray-700" />

      <div className="flex flex-col gap-3">
        <button className="bg-red-600 hover:bg-red-700 py-2 rounded-xl">Завершить сессию</button>
        <button className="bg-gray-600 hover:bg-gray-700 py-2 rounded-xl">Перейти к расследованию</button>
        <button className="bg-blue-600 hover:bg-blue-700 py-2 rounded-xl">Скачать логи</button>
      </div>
    </div>
  );
}

export default function Settings() {
  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold">Настройки системы</h1>

      <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
        <h2 className="text-2xl font-semibold text-blue-600">Интеграция операционных систем</h2>

        <ul className="space-y-3 text-lg">
          <li>• Linux — SSH, sudo, запись терминала</li>
          <li>• Windows — RDP, запись экрана, Active Directory</li>
          <li>• Cisco / Network — Firewall & Switch access control</li>
          <li>• VMware — администрирование виртуальных сред</li>
          <li className="text-red-600 font-semibold">
            • Solaris — поддержка привилегированного доступа (Уникально на рынке)
          </li>
        </ul>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
        <h2 className="text-2xl font-semibold text-blue-600">Параметры записи сессий</h2>

        <ul className="space-y-3 text-lg">
          <li>• Запись SSH / RDP / VNC</li>
          <li>• Запуск записи при подозрительных действиях</li>
          <li>• Защита от удаления и подмены видео</li>
        </ul>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
        <h2 className="text-2xl font-semibold text-blue-600">Password Rotation</h2>

        <ul className="space-y-3 text-lg">
          <li>• Автоматическая смена привилегированных паролей</li>
          <li>• Rotation каждые: 1, 7, 14, 30 дней</li>
          <li>• Автооповещение о смене</li>
        </ul>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
        <h2 className="text-2xl font-semibold text-blue-600">Security Alerts</h2>

        <ul className="space-y-3 text-lg">
          <li>• Telegram / Email Webhook уведомления</li>
          <li>• Алгоритм выявления подозрительных действий</li>
          <li>• Политики безопасности SOC уровня</li>
        </ul>
      </div>
    </div>
  );
}

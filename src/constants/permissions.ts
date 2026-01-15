export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  manage_users: "Управление пользователями (создание, блокировка, удаление)",
  manage_roles: "Управление ролями доступа",
  manage_permissions: "Управление правами доступа",

  view_incidents: "Просмотр инцидентов безопасности",
  manage_incidents: "Управление инцидентами безопасности",

  view_policies: "Просмотр политик доступа",
  create_policies: "Создание политик доступа",
  edit_policies: "Редактирование политик доступа",
  delete_policies: "Удаление политик доступа",
  manage_policies: "Полное управление политиками доступа",

  view_sessions: "Просмотр активных и завершённых сессий",
  start_session: "Запуск привилегированных сессий",
  terminate_session: "Принудительное завершение сессий",

  view_vault: "Просмотр хранилища секретов",
  manage_vault: "Управление хранилищем секретов",
  rotate_credentials: "Ротация учётных данных",

  view_audit: "Просмотр журналов аудита",
  export_audit: "Экспорт журналов аудита",

  request_access: "Запрос доступа к ресурсам",
  approve_requests: "Подтверждение запросов доступа",

  view_soc: "Просмотр SOC-панели мониторинга",
  soc_actions: "SOC-действия (изоляция сессий, блокировка пользователей)",
  export_soc: "Экспорт данных SOC",

  view_settings: "Просмотр системных настроек",
  manage_settings: "Изменение системных настроек",
  test_integrations: "Тестирование внешних интеграций",
};

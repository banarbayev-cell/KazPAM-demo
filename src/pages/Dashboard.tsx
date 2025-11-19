export default function DashboardPage() {
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: "28px", marginBottom: "20px" }}>Dashboard KazPAM</h1>

      <div style={{ display: "flex", gap: "20px" }}>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", minWidth: "200px" }}>
          <h2 style={{ fontSize: "14px", color: "#888" }}>Привилегированные аккаунты</h2>
          <p style={{ fontSize: "32px", fontWeight: "bold" }}>12</p>
        </div>

        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", minWidth: "200px" }}>
          <h2 style={{ fontSize: "14px", color: "#888" }}>Пользователи</h2>
          <p style={{ fontSize: "32px", fontWeight: "bold" }}>142</p>
        </div>

        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", minWidth: "200px" }}>
          <h2 style={{ fontSize: "14px", color: "#888" }}>Активные сессии</h2>
          <p style={{ fontSize: "32px", fontWeight: "bold" }}>8</p>
        </div>

        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", minWidth: "200px" }}>
          <h2 style={{ fontSize: "14px", color: "#888" }}>Нагрузка CPU</h2>
          <p style={{ fontSize: "32px", fontWeight: "bold" }}>32%</p>
        </div>

        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", minWidth: "200px" }}>
          <h2 style={{ fontSize: "14px", color: "#888" }}>Секреты в хранилище (Vault)</h2>
          <p style={{ fontSize: "32px", fontWeight: "bold" }}>327</p>
        </div>
      </div>
    </div>
  );
}

import Sidebar from "../components/ui/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ padding: "20px", flex: 1, color: "white", background: "#1f2937" }}>
        {children}
      </main>
    </div>
  );
}

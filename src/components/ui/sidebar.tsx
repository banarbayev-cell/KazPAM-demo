import { Link, Route, Routes } from "react-router-dom";

export default function App() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white p-4">
        <h1 className="text-2xl font-bold mb-6">KazPAM</h1>

        <nav className="flex flex-col gap-3">
          <Link to="/" className="hover:text-blue-400">Главная</Link>
          <Link to="/users" className="hover:text-blue-400">Пользователи</Link>
          <Link to="/sessions" className="hover:text-blue-400">Сессии</Link>
          <Link to="/vault" className="hover:text-blue-400">Хранилище</Link>
          <Link to="/audit" className="hover:text-blue-400">Аудит</Link>
          <Link to="/settings" className="hover:text-blue-400">Настройки</Link>
        </nav>
      </aside>

      {/* Content area */}
      <main className="flex-1 p-6">
        <Routes>
          <Route path="/" element={<h2 className="text-3xl font-bold">Главная</h2>} />
          <Route path="/users" element={<h2 className="text-3xl font-bold">Пользователи</h2>} />
          <Route path="/sessions" element={<h2 className="text-3xl font-bold">Сессии</h2>} />
          <Route path="/vault" element={<h2 className="text-3xl font-bold">Хранилище</h2>} />
          <Route path="/audit" element={<h2 className="text-3xl font-bold">Аудит</h2>} />
          <Route path="/settings" element={<h2 className="text-3xl font-bold">Настройки</h2>} />
        </Routes>
      </main>
    </div>
  );
}

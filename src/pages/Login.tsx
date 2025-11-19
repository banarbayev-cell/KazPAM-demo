export default function Login() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-10 rounded-xl shadow-xl w-96 space-y-6">
        <h1 className="text-3xl font-bold text-center text-white">KazPAM</h1>
        <h2 className="text-center text-gray-400">Privileged Access Management</h2>

        <input
          type="text"
          placeholder="Логин"
          className="w-full p-3 rounded-lg bg-gray-800 text-white outline-none"
        />

        <input
          type="password"
          placeholder="Пароль"
          className="w-full p-3 rounded-lg bg-gray-800 text-white outline-none"
        />

        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition">
          Войти
        </button>
      </div>
    </div>
  );
}

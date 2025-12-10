const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5173;

const distPath = path.join(__dirname, "dist");

// Отдаём статические файлы
app.use(express.static(distPath));

// Любой маршрут → отдать index.html
app.use((req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Dashboard running on http://localhost:${PORT}`);
});

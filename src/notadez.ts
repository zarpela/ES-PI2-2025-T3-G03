import express from "express";
import path from 'path';

import indexRoutes from "./index/controller.ts";     // Importa rota index
import usuarioRoutes from "./usuario/controller.ts"; // Importa rota usuário

const app = express();
const port = 3000;

app.use(indexRoutes);   // Usa rota index
app.use(usuarioRoutes); // Usa rota usuário

app.use('/public', express.static(path.resolve('public')));

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
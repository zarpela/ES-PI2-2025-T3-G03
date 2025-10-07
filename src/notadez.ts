import dotenv from 'dotenv';
dotenv.config(); // Carrega as variáveis do arquivo .env

import express from "express";
import path from 'path'; 

import indexRoutes from "./index/controller.ts";     // Importa rota index
import usuarioRoutes from "./usuario/controller.ts"; // Importa rota usuário
import homeRoutes from "./home/controller.ts"; // Importa rota home

const app = express();
const port = 3000;

app.use(express.json()); // Adiciona o middleware para parsear JSON

app.use(indexRoutes);   // Usa rota index
app.use(usuarioRoutes); // Usa rota usuário
app.use(homeRoutes); // Usa rota home

app.use('/public', express.static(path.resolve('public')));

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
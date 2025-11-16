//Desenvolvido por Marcelo
import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config(); // Carrega as variáveis do arquivo .env

import express from "express";
import path from 'path'; 
import { fileURLToPath } from 'url'

import indexRoutes from "./index/controller.ts";     // Importa rota index
import usuarioRoutes from "./usuario/controller.ts"; // Importa rota usuário
import homeRoutes from "./home/controller.ts"; // Importa rota home
import notaRoutes from "./notas/notas.routes.ts";
import turmasRoutes from "./turmas/turmas.routes.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
const port = 3000;

app.use(express.json()); // Adiciona o middleware para parsear JSON

app.use(indexRoutes);   // Usa rota index
app.use(usuarioRoutes); // Usa rota usuário
app.use(homeRoutes); // Usa rota home

app.use("/usuario", usuarioRoutes);
app.use("/notas", notaRoutes);
app.use("/api/turmas", turmasRoutes);

app.use('/public', express.static(path.resolve('public')));

app.set('views', path.join(__dirname, 'home')); // aponta a pasta correta onde estão seus .ejs
app.set('view engine', 'ejs');

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

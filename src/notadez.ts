import express from "express";
import path from 'path';

import indexRoutes from "./index/controller.ts";

const app = express();
const port = 3000;

app.use(indexRoutes);

app.use('/public', express.static(path.resolve('public')));

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
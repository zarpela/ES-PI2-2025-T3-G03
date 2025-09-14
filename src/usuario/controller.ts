import express from 'express';
const router = express.Router();
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rota /usuario/cadastrar que renderiza cadastro.js
router.get('/usuario/cadastrar', (req, res) => {
  res.render(path.join(__dirname, 'cadastro.ejs'));
});

export default router;

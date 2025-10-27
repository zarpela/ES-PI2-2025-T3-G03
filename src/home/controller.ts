import express from 'express';
const router = express.Router();
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get('/home', (req, res) => {
    res.render(path.join(__dirname, 'home.ejs'));
});

// Nova rota para instituições
router.get('/instituicoes', (req, res) => {
    res.render(path.join(__dirname, 'instituicoes.ejs'));
});

export default router;
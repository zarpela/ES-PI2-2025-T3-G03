import express from 'express';
const router = express.Router();
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import { parse } from 'csv-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.csv' && ext !== '.json') {
            return cb(new Error('Apenas arquivos CSV e JSON são permitidos'));
        }
        cb(null, true);
    }
});

router.get('/turmas', (req, res) => {
    res.render(path.join(__dirname, 'turmas.ejs'));
});

// Nova rota para instituições
router.get('/instituicoes', (req, res) => {
    res.render(path.join(__dirname, 'instituicoes.ejs'));
});

// Rota para importar alunos
router.post('/turmas/:turmaId/alunos/import', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const filePath = req.file.path;
    const fileType = path.extname(req.file.originalname).toLowerCase();
    
    try {
        if (fileType === '.csv') {
            const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
            parse(fileContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true
            }, (err, records) => {
                if (err) {
                    fs.unlinkSync(filePath);
                    return res.status(400).json({ error: 'Erro ao processar arquivo CSV' });
                }

                const alunos = records.map((record: any) => ({
                    matricula: record.Matricula || record.matricula,
                    nome: record.Nome || record.nome
                }));

                // TODO: Implementar a lógica de salvar no banco de dados
                // Por enquanto, apenas retorna os dados processados
                fs.unlinkSync(filePath);
                res.json({ 
                    success: true, 
                    message: 'Alunos importados com sucesso',
                    alunos 
                });
            });
        } else if (fileType === '.json') {
            const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
            const alunos = JSON.parse(fileContent);

            // Validação básica do formato JSON
            if (!Array.isArray(alunos) || !alunos.every(a => a.matricula && a.nome)) {
                fs.unlinkSync(filePath);
                return res.status(400).json({ 
                    error: 'Formato JSON inválido. O arquivo deve conter um array de objetos com matricula e nome' 
                });
            }

            // TODO: Implementar a lógica de salvar no banco de dados
            // Por enquanto, apenas retorna os dados processados
            fs.unlinkSync(filePath);
            res.json({ 
                success: true, 
                message: 'Alunos importados com sucesso',
                alunos 
            });
        }
    } catch (error: unknown) {
        if (req.file) {
            fs.unlinkSync(filePath);
        }
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        res.status(500).json({ 
            error: 'Erro ao processar o arquivo', 
            details: errorMessage 
        });
    }
});

export default router;
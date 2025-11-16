//Desenvolvido por Marcelo
import { type Request, type Response } from 'express';
import { NotaService } from '../services/notas.service.ts';

// Instanciamos o serviço manualmente
const notaService = new NotaService();
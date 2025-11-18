//Desenvolvido por Marcelo

// Importa validações da biblioteca class-validator
import { IsString, IsNotEmpty } from 'class-validator';

// DTO usado para validar os dados importados do CSV de alunos
export class AlunoImportCsvDto {

  // Campo obrigatório do tipo string: identificador único do aluno
  @IsString()
  @IsNotEmpty({ message: 'O identificador do aluno é obrigatório.' })
  aluno_identificador!: string;

  // Campo obrigatório do tipo string: nome do aluno
  @IsString()
  @IsNotEmpty({ message: 'O nome do aluno é obrigatório.' })
  aluno_nome!: string;
}

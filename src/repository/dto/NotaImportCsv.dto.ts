//Desenvolvido por Marcelo

// Importa validações da biblioteca class-validator
import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';
// Importa o Type para transformar tipos de entrada (ex: string → number)
import { Type } from 'class-transformer';

// DTO responsável por validar os dados importados do CSV
export class NotaImportCsvDto {

  // Campo obrigatório do tipo string: identificador do aluno
  @IsString()
  @IsNotEmpty({ message: 'O identificador do aluno é obrigatório.' })
  aluno_identificador!: string;

  // Campo obrigatório do tipo string: identificador do componente
  @IsString()
  @IsNotEmpty({ message: 'O identificador do componente é obrigatório.' })
  componente_identificador!: string;

  // Campo numérico obrigatório: valor da nota
  @IsNumber({}, { message: 'O valor da nota deve ser um número.' })
  @Min(0.00)   // Valor mínimo permitido
  @Max(10.00)  // Valor máximo permitido
  @Type(() => Number) // Converte automaticamente de string (do CSV) para número
  valor!: number;
}

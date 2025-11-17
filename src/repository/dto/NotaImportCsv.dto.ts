//Desenvolvido por Marcelo
// Comentário informando o autor do código

import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';
// Importa os decorators para validação de tipos, campos obrigatórios e limites numéricos

import { Type } from 'class-transformer';
// Importa o decorator usado para transformar tipos (por exemplo, converter string → number)

export class NotaImportCsvDto {
  @IsString()
  // Valida que o campo é uma string

  @IsNotEmpty({ message: 'O identificador do aluno é obrigatório.' })
  // Valida que o campo não está vazio, com mensagem personalizada
  aluno_identificador!: string;
  // Campo que receberá o identificador do aluno vindo do CSV

  @IsString()
  // Garante que é uma string

  @IsNotEmpty({ message: 'O identificador do componente é obrigatório.' })
  // Valida que não está vazio
  componente_identificador!: string;
  // Campo que receberá o identificador do componente da nota

  @IsNumber({}, { message: 'O valor da nota deve ser um número.' })
  // Valida que o campo é numérico

  @Min(0.00)
  // Define o valor mínimo permitido para a nota

  @Max(10.00)
  // Define o valor máximo permitido para a nota

  @Type(() => Number) // Essencial para converter a string do CSV
  // Converte o valor vindo como string do CSV em número
  valor!: number;
  // Campo que armazenará o valor numérico da nota
}

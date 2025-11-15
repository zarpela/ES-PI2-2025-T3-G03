//Desenvolvido por Marcelo
import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class NotaImportCsvDto {
  @IsString()
  @IsNotEmpty({ message: 'O identificador do aluno é obrigatório.' })
  aluno_identificador!: string;

  @IsString()
  @IsNotEmpty({ message: 'O identificador do componente é obrigatório.' })
  componente_identificador!: string;

  @IsNumber({}, { message: 'O valor da nota deve ser um número.' })
  @Min(0.00)
  @Max(10.00)
  @Type(() => Number) // Essencial para converter a string do CSV
  valor!: number;
}
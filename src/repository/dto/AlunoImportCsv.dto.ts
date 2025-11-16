//Desenvolvido por Marcelo
import { IsString, IsNotEmpty } from 'class-validator';

export class AlunoImportCsvDto {
  @IsString()
  @IsNotEmpty({ message: 'O identificador do aluno é obrigatório.' })
  aluno_identificador!: string;

  @IsString()
  @IsNotEmpty({ message: 'O nome do aluno é obrigatório.' })
  aluno_nome!: string;
}

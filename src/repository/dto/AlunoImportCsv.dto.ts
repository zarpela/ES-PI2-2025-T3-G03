//Desenvolvido por Marcelo               // Comentário informativo do autor

import { IsString, IsNotEmpty } from 'class-validator';
// Importa decorators usados para validar propriedades da classe

export class AlunoImportCsvDto {
  @IsString()
  // Garante que o campo seja uma string

  @IsNotEmpty({ message: 'O identificador do aluno é obrigatório.' })
  // Garante que o campo não venha vazio e define mensagem personalizada
  aluno_identificador!: string;
  // Propriedade que receberá o identificador do aluno importado

  @IsString()
  // Garante que o campo seja uma string

  @IsNotEmpty({ message: 'O nome do aluno é obrigatório.' })
  // Garante que o nome não seja vazio
  aluno_nome!: string;
  // Propriedade que receberá o nome do aluno importado
}

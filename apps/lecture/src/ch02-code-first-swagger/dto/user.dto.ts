import { ApiProperty } from '@nestjs/swagger';

export class Ch02UserDto {
  @ApiProperty({ example: 1, minimum: 1 })
  id!: number;

  @ApiProperty({ example: 'a@b.c', format: 'email' })
  email!: string;

  @ApiProperty({ example: 'Alice', minLength: 1 })
  name!: string;

  @ApiProperty({ example: '2024-04-27T00:00:00.000Z', format: 'date-time' })
  createdAt!: string;
}

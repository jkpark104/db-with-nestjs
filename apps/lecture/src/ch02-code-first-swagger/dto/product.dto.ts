import { ApiProperty } from '@nestjs/swagger';

export class Ch02ProductDto {
  @ApiProperty({ example: 1, minimum: 1 })
  id!: number;

  @ApiProperty({ example: '사이다 1.5L', minLength: 1 })
  name!: string;

  @ApiProperty({ example: 2900, minimum: 0, description: 'KRW 정수' })
  priceInWon!: number;

  @ApiProperty({ example: 42, minimum: 0 })
  stock!: number;

  @ApiProperty({ example: '탄산음료' })
  description!: string;
}

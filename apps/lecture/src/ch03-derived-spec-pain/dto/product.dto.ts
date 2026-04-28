import { ApiProperty } from '@nestjs/swagger';

export class Ch03ProductDto {
  @ApiProperty({ example: 1, minimum: 1 }) id!: number;
  @ApiProperty({ example: '사이다 1.5L' }) name!: string;
  @ApiProperty({ example: 2900, minimum: 0 }) priceInWon!: number;
  @ApiProperty({ example: 42, minimum: 0 }) stock!: number;
  @ApiProperty({ example: '탄산음료' }) description!: string;
  @ApiProperty({ example: 'beverage', description: '신규 추가됨 — FE는 모름' })
  category!: string;
}

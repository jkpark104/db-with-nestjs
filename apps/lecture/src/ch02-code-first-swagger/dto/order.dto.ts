import { ApiProperty } from '@nestjs/swagger';

export class Ch02OrderDto {
  @ApiProperty({ example: 1, minimum: 1 })
  id!: number;

  @ApiProperty({ example: 1, minimum: 1 })
  userId!: number;

  @ApiProperty({ enum: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'] })
  status!: string;

  @ApiProperty({ example: 5800, minimum: 0 })
  totalAmountInWon!: number;

  @ApiProperty({ example: '2024-04-27T00:00:00.000Z', format: 'date-time' })
  createdAt!: string;
}

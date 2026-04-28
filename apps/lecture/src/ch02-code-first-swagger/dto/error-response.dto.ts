import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 404 }) statusCode!: number;
  @ApiProperty({ example: 'Not Found' }) message!: string;
  @ApiProperty({ required: false }) error?: string;
}

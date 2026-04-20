// ============================================================
// Ch01 Prisma 컨트롤러 — TypeORM 버전과 동일한 엔드포인트, 다른 DB(MySQL)
// ============================================================
// 같은 API 구조를 TypeORM(PostgreSQL)과 Prisma(MySQL)로 각각 구현해서
// 두 ORM의 사용법 차이를 직접 비교할 수 있습니다.
// ============================================================

import { Controller, Get, Post, Body } from '@nestjs/common';
import { Ch01PrismaService } from './ch01-prisma.service';

@Controller('ch01/prisma')
export class Ch01PrismaController {
  constructor(private readonly service: Ch01PrismaService) {}

  @Post('users')
  createUser(@Body() body: { email: string; name: string }) {
    return this.service.createUser(body.email, body.name);
  }

  @Get('users')
  findAllUsers() {
    return this.service.findAllUsers();
  }

  @Post('products')
  createProduct(
    @Body()
    body: {
      name: string;
      price: number;
      stock: number;
      description?: string;
    },
  ) {
    return this.service.createProduct(body);
  }

  @Get('products')
  findAllProducts() {
    return this.service.findAllProducts();
  }
}

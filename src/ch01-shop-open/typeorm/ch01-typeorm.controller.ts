// ============================================================
// Ch01TypeormController — HTTP 요청을 받아 서비스에 전달
// ============================================================
// Controller의 역할:
//   1. HTTP 요청(GET, POST 등)을 받는다
//   2. 요청 데이터를 꺼낸다 (Body, Param, Query)
//   3. Service에 비즈니스 로직을 위임한다
//   4. 결과를 JSON으로 응답한다
// ============================================================

import { Controller, Get, Post, Body } from '@nestjs/common';
import { Ch01TypeormService } from './ch01-typeorm.service';

@Controller('ch01/typeorm')
export class Ch01TypeormController {
  constructor(private readonly service: Ch01TypeormService) {}

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

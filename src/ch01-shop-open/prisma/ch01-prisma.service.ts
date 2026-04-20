// ============================================================
// Ch01PrismaService — Prisma로 기본 CRUD 수행 (MySQL)
// ============================================================
// TypeORM과의 차이점:
//   - TypeORM: Repository 패턴 (엔티티별 Repository 객체)
//   - Prisma: Client 패턴 (하나의 PrismaClient로 모든 모델 접근)
//   - Prisma의 장점: 자동 완성이 매우 강력 (타입이 자동 추론됨)
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class Ch01PrismaService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(email: string, name: string) {
    return this.prisma.user.create({ data: { email, name } });
  }

  async findAllUsers() {
    return this.prisma.user.findMany();
  }

  async createProduct(data: {
    name: string;
    price: number;
    stock: number;
    description?: string;
  }) {
    return this.prisma.product.create({ data });
  }

  async findAllProducts() {
    return this.prisma.product.findMany();
  }
}

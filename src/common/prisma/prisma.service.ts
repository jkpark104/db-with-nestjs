// PrismaService — Prisma Client를 NestJS에서 사용하기 위한 래퍼
// Prisma v7에서는 Driver Adapter가 필수 — @prisma/adapter-mariadb 사용
// OnModuleInit: 모듈 초기화 시 DB 연결
// OnModuleDestroy: 앱 종료 시 연결 해제
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaMariaDb({
      host: process.env['MYSQL_HOST'] ?? 'localhost',
      port: Number(process.env['MYSQL_PORT'] ?? 3306),
      user: process.env['MYSQL_USER'] ?? 'lecture',
      password: process.env['MYSQL_PASSWORD'] ?? 'lecture1234',
      database: process.env['MYSQL_DATABASE'] ?? 'db_lecture',
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

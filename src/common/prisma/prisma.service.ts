// PrismaService — Prisma Client를 NestJS에서 사용하기 위한 래퍼
// OnModuleInit: 모듈 초기화 시 DB 연결
// OnModuleDestroy: 앱 종료 시 연결 해제
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

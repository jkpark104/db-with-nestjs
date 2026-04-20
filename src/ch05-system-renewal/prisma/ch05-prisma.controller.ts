// ============================================================
// Ch05Controller — 마이그레이션 상태 조회 API
// ============================================================
// 이 컨트롤러는 TypeORM과 Prisma 양쪽의 마이그레이션 상태를 모두 조회합니다.
// 경로: /ch05/typeorm/migration-status, /ch05/prisma/migration-status
// ============================================================

import { Controller, Get } from '@nestjs/common';
import { Ch05TypeormService } from '../typeorm/ch05-typeorm.service';
import { Ch05PrismaService } from './ch05-prisma.service';

@Controller('ch05')
export class Ch05Controller {
  constructor(
    private readonly typeormService: Ch05TypeormService,
    private readonly prismaService: Ch05PrismaService,
  ) {}

  // GET /ch05/typeorm/migration-status — TypeORM 마이그레이션 상태
  @Get('typeorm/migration-status')
  typeormStatus() {
    return this.typeormService.getMigrationStatus();
  }

  // GET /ch05/prisma/migration-status — Prisma 마이그레이션 상태
  @Get('prisma/migration-status')
  prismaStatus() {
    return this.prismaService.getMigrationStatus();
  }
}

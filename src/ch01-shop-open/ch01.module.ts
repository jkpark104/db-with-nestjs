// ============================================================
// Ch01Module — "쇼핑몰 오픈" 챕터 모듈
// ============================================================
// NestJS의 모듈 시스템:
//   모듈 = 관련된 코드를 하나로 묶는 단위
//   - imports: 이 모듈이 사용할 다른 모듈
//   - controllers: HTTP 요청을 처리하는 컨트롤러
//   - providers: 비즈니스 로직을 담당하는 서비스
//
// TypeOrmModule.forFeature([Entity]):
//   이 모듈에서 사용할 TypeORM 엔티티를 등록합니다.
//   등록해야 @InjectRepository(Entity)로 주입 가능!
// ============================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './typeorm/entities/user.entity';
import { Product } from './typeorm/entities/product.entity';
import { Ch01TypeormService } from './typeorm/ch01-typeorm.service';
import { Ch01TypeormController } from './typeorm/ch01-typeorm.controller';
import { Ch01PrismaService } from './prisma/ch01-prisma.service';
import { Ch01PrismaController } from './prisma/ch01-prisma.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Product])],
  controllers: [Ch01TypeormController, Ch01PrismaController],
  providers: [Ch01TypeormService, Ch01PrismaService],
})
export class Ch01Module {}

// 각 엔드포인트가 다른 Phase를 실행 -> 응답의 _meta로 성능 비교 가능
import { Controller, Get } from '@nestjs/common';
import { Ch03TypeormService } from './ch03-typeorm.service';

@Controller('ch03/typeorm')
export class Ch03TypeormController {
  constructor(private readonly service: Ch03TypeormService) {}

  // N+1 발생 -- 느린 버전
  @Get('orders/naive')
  findNaive() {
    return this.service.findOrdersNaive();
  }

  // Eager Loading
  @Get('orders/eager')
  findEager() {
    return this.service.findOrdersEager();
  }

  // JOIN -- 가장 빠름
  @Get('orders/join')
  findJoin() {
    return this.service.findOrdersJoin();
  }

  // 배치 페칭
  @Get('orders/batch')
  findBatch() {
    return this.service.findOrdersBatch();
  }
}

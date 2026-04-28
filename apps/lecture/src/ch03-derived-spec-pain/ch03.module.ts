import { Module } from '@nestjs/common';
import { CONTRACT_STATUS } from '../common/contract-status.interceptor';
import { Ch03ProductsController } from './products.controller';

@Module({
  controllers: [Ch03ProductsController],
  providers: [{ provide: CONTRACT_STATUS, useValue: 'code-derived' }],
})
export class Ch03DerivedSpecPainModule {}

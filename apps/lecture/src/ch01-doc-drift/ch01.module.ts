import { Module } from '@nestjs/common';
import { CONTRACT_STATUS } from '../common/contract-status.interceptor';
import { Ch01ProductsController } from './products.controller';
import { Ch01UsersController } from './users.controller';

@Module({
  controllers: [Ch01ProductsController, Ch01UsersController],
  providers: [{ provide: CONTRACT_STATUS, useValue: 'not-tracked' }],
})
export class Ch01DocDriftModule {}

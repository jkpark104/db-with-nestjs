import { Module } from '@nestjs/common';
import { CONTRACT_STATUS } from '../common/contract-status.interceptor';
import { Ch02ProductsController } from './products.controller';
import { Ch02UsersController } from './users.controller';
import { Ch02OrdersController } from './orders.controller';

@Module({
  controllers: [Ch02ProductsController, Ch02UsersController, Ch02OrdersController],
  providers: [{ provide: CONTRACT_STATUS, useValue: 'code-derived' }],
})
export class Ch02CodeFirstSwaggerModule {}

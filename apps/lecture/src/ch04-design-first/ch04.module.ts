import { Module } from '@nestjs/common';
import { CONTRACT_STATUS } from '../common/contract-status.interceptor';
import { Ch04ProductsController } from './products.controller';
import { Ch04UsersController } from './users.controller';

@Module({
  controllers: [Ch04ProductsController, Ch04UsersController],
  providers: [{ provide: CONTRACT_STATUS, useValue: 'spec-derived' }],
})
export class Ch04DesignFirstModule {}

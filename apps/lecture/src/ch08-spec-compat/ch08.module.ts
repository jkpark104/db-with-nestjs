import { Module } from '@nestjs/common';
import {
  CONTRACT_STATUS,
  CONTRACT_RUNTIME_VALIDATION,
  CONTRACT_COMPAT_TRACKING,
} from '../common/contract-status.interceptor';
import { Ch04ProductsController } from '../ch04-design-first/products.controller';
import { Ch04UsersController } from '../ch04-design-first/users.controller';
import { Ch07OrdersController } from '../ch07-generated-hooks/orders.controller';

@Module({
  controllers: [Ch04ProductsController, Ch04UsersController, Ch07OrdersController],
  providers: [
    { provide: CONTRACT_STATUS, useValue: 'spec-derived' },
    { provide: CONTRACT_RUNTIME_VALIDATION, useValue: true },
    { provide: CONTRACT_COMPAT_TRACKING, useValue: true },
  ],
})
export class Ch08SpecCompatModule {}

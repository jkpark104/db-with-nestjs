import { Module } from '@nestjs/common';
import {
  CONTRACT_STATUS,
  CONTRACT_RUNTIME_VALIDATION,
} from '../common/contract-status.interceptor';
import { Ch06ProductsController } from './products.controller';
import { Ch06UsersController } from './users.controller';

@Module({
  controllers: [Ch06ProductsController, Ch06UsersController],
  providers: [
    { provide: CONTRACT_STATUS, useValue: 'spec-derived' },
    { provide: CONTRACT_RUNTIME_VALIDATION, useValue: true },
  ],
})
export class Ch06RuntimeDriftModule {}

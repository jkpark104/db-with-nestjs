import { Module } from '@nestjs/common';
import { WebBffController } from './web-bff.controller';
import { MobileBffController } from './mobile-bff.controller';
import { AdminBffController } from './admin-bff.controller';

@Module({
  controllers: [WebBffController, MobileBffController, AdminBffController],
})
export class Ch01RestModule {}

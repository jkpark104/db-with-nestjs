import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../ch02-catalog/typeorm/entities/order.entity';
import { OrderItem } from '../ch02-catalog/typeorm/entities/order-item.entity';
import { Ch03TypeormService } from './typeorm/ch03-typeorm.service';
import { Ch03TypeormController } from './typeorm/ch03-typeorm.controller';
import { Ch03PrismaService } from './prisma/ch03-prisma.service';
import { Ch03PrismaController } from './prisma/ch03-prisma.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  controllers: [Ch03TypeormController, Ch03PrismaController],
  providers: [Ch03TypeormService, Ch03PrismaService],
})
export class Ch03Module {}

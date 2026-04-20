import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './typeorm/entities/category.entity';
import { ProductCategory } from './typeorm/entities/product-category.entity';
import { Order } from './typeorm/entities/order.entity';
import { OrderItem } from './typeorm/entities/order-item.entity';
import { Review } from './typeorm/entities/review.entity';
import { PopularProductsView } from './typeorm/entities/popular-products.view-entity';
import { Ch02TypeormService } from './typeorm/ch02-typeorm.service';
import { Ch02TypeormController } from './typeorm/ch02-typeorm.controller';
import { Ch02PrismaService } from './prisma/ch02-prisma.service';
import { Ch02PrismaController } from './prisma/ch02-prisma.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category,
      ProductCategory,
      Order,
      OrderItem,
      Review,
      PopularProductsView,
    ]),
  ],
  controllers: [Ch02TypeormController, Ch02PrismaController],
  providers: [Ch02TypeormService, Ch02PrismaService],
})
export class Ch02Module {}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { Ch02PrismaService } from './ch02-prisma.service';

@Controller('ch02/prisma')
export class Ch02PrismaController {
  constructor(private readonly service: Ch02PrismaService) {}

  @Post('categories')
  createCategory(@Body() body: { name: string }) {
    return this.service.createCategory(body.name);
  }

  @Post('products/:id/categories')
  linkCategory(
    @Param('id', ParseIntPipe) productId: number,
    @Body() body: { categoryId: number },
  ) {
    return this.service.linkProductToCategory(productId, body.categoryId);
  }

  @Post('orders')
  createOrder(
    @Body()
    body: {
      userId: number;
      items: { productId: number; quantity: number; unitPrice: number }[];
    },
  ) {
    return this.service.createOrder(body.userId, body.items);
  }

  @Post('reviews')
  createReview(
    @Body()
    body: {
      userId: number;
      productId: number;
      rating: number;
      content?: string;
    },
  ) {
    return this.service.createReview(
      body.userId,
      body.productId,
      body.rating,
      body.content,
    );
  }

  @Get('products/:id/reviews')
  findProductReviews(@Param('id', ParseIntPipe) id: number) {
    return this.service.findProductReviews(id);
  }

  @Get('categories/:id/products')
  findProductsByCategory(@Param('id', ParseIntPipe) id: number) {
    return this.service.findProductsByCategory(id);
  }

  @Get('popular-products')
  findPopularProducts() {
    return this.service.findPopularProducts();
  }
}

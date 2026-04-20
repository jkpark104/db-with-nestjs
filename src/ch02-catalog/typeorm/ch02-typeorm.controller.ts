import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { Ch02TypeormService } from './ch02-typeorm.service';

@Controller('ch02/typeorm')
export class Ch02TypeormController {
  constructor(private readonly service: Ch02TypeormService) {}

  @Post('categories')
  createCategory(@Body() body: { name: string }) { return this.service.createCategory(body.name); }

  @Post('products/:id/categories')
  linkCategory(@Param('id', ParseIntPipe) productId: number, @Body() body: { categoryId: number }) {
    return this.service.linkProductToCategory(productId, body.categoryId);
  }

  @Post('orders')
  createOrder(@Body() body: { userId: number; items: { productId: number; quantity: number; unitPrice: number }[] }) {
    return this.service.createOrder(body.userId, body.items);
  }

  @Post('reviews')
  createReview(@Body() body: { userId: number; productId: number; rating: number; content?: string }) {
    return this.service.createReview(body.userId, body.productId, body.rating, body.content);
  }

  @Get('products/:id/reviews')
  findProductReviews(@Param('id', ParseIntPipe) productId: number) { return this.service.findProductReviews(productId); }

  @Get('categories/:id/products')
  findProductsByCategory(@Param('id', ParseIntPipe) categoryId: number) { return this.service.findProductsByCategory(categoryId); }

  @Get('popular-products')
  findPopularProducts() { return this.service.findPopularProducts(); }
}

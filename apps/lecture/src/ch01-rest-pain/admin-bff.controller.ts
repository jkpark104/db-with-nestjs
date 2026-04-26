import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import {
  orderItemRepo,
  orderRepo,
  productRepo,
  reviewRepo,
  userRepo,
} from './repositories';

// Admin BFF — 운영 대시보드 (모든 필드 + 집계)
// 같은 User를 또 다른 모양으로 복제 — fullName vs name 불일치 시나리오
@Controller('admin')
export class AdminBffController {
  @Get('users')
  async users() {
    const users = await userRepo.findMany();
    const result = [];
    for (const u of users) {
      const orders = await orderRepo.findMany((o) => o.userId === u.id);
      const reviews = await reviewRepo.findMany((r) => r.userId === u.id);
      result.push({
        id: u.id,
        fullName: u.name, // Admin BFF는 fullName으로 매핑 — Web BFF는 name이었음
        email: u.email,
        createdAt: u.createdAt,
        orderCount: orders.length,
        reviewCount: reviews.length,
      });
    }
    return result;
  }

  @Get('products/:id')
  async product(@Param('id', ParseIntPipe) id: number) {
    const product = await productRepo.findOne(id);
    if (!product) return null;
    const items = await orderItemRepo.findMany((it) => it.productId === id);
    const reviews = await reviewRepo.findMany((r) => r.productId === id);
    return {
      ...product,
      totalSold: items.reduce((s, it) => s + it.quantity, 0),
      revenue: items.reduce((s, it) => s + it.unitPrice * it.quantity, 0),
      reviewCount: reviews.length,
    };
  }

  @Get('orders')
  async orders() {
    const orders = await orderRepo.findMany();
    const result = [];
    for (const o of orders) {
      const user = await userRepo.findOne(o.userId);
      const items = await orderItemRepo.findMany((it) => it.orderId === o.id);
      result.push({
        id: o.id,
        status: o.status,
        totalAmount: o.totalAmount,
        createdAt: o.createdAt,
        userName: user?.name ?? 'Unknown', // fullName이 아니라 name — 또 다른 불일치
        itemCount: items.length,
      });
    }
    return result;
  }
}

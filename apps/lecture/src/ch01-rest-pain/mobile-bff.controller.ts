import { Controller, Get, Query } from '@nestjs/common';
import { orderItemRepo, orderRepo, productRepo } from './repositories';

// Mobile BFF — 모바일 홈 화면 (가벼운 응답)
// 같은 데이터를 다른 모양으로 가공 — User 모델 파편화의 시작
@Controller('mobile')
export class MobileBffController {
  @Get('products')
  async products(@Query('limit') limitRaw?: string) {
    const limit = Number(limitRaw ?? 10);
    const products = await productRepo.findMany();
    return products.slice(0, limit).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      inStock: p.stock > 0,
    }));
  }

  @Get('orders/me')
  async myOrders(@Query('userId') userIdRaw?: string) {
    const userId = Number(userIdRaw ?? 1);
    const orders = await orderRepo.findMany((o) => o.userId === userId);
    const result = [];
    for (const o of orders) {
      const items = await orderItemRepo.findMany((it) => it.orderId === o.id);
      result.push({
        id: o.id,
        status: o.status,
        totalAmount: o.totalAmount,
        itemCount: items.length,
      });
    }
    return result;
  }
}

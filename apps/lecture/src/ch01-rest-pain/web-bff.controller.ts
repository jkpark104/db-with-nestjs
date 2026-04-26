import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { orderRepo, productRepo, reviewRepo, userRepo } from './repositories';

// Web BFF — 데스크톱 상품 상세 페이지
// 한 화면을 그리려면 여러 엔드포인트를 호출해야 함 (REST의 N+1 문제 원형)
@Controller('web')
export class WebBffController {
  @Get('products/:id')
  async product(@Param('id', ParseIntPipe) id: number) {
    const product = await productRepo.findOne(id);
    if (!product) return null;

    const reviews = await reviewRepo.findMany((r) => r.productId === id);
    const avgRating =
      reviews.length === 0 ? 0 : reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      description: product.description,
      reviewCount: reviews.length,
      avgRating: Number(avgRating.toFixed(2)),
    };
  }

  // 리뷰 목록 — userName을 평탄화 (REST 모델 복제의 시작)
  @Get('products/:id/reviews')
  async productReviews(@Param('id', ParseIntPipe) id: number) {
    const reviews = await reviewRepo.findMany((r) => r.productId === id);
    const result = [];
    for (const r of reviews) {
      const user = await userRepo.findOne(r.userId);
      result.push({
        id: r.id,
        rating: r.rating,
        content: r.content,
        createdAt: r.createdAt,
        userId: r.userId,
        userName: user?.name ?? 'Unknown', // Web BFF에서 User 모델 직접 복제
      });
    }
    return result;
  }

  @Get('users/:id')
  async user(@Param('id', ParseIntPipe) id: number) {
    const user = await userRepo.findOne(id);
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      memberSince: user.createdAt,
    };
  }

  // 사용자 주문 목록
  @Get('users/:id/orders')
  async userOrders(@Param('id', ParseIntPipe) id: number) {
    return orderRepo.findMany((o) => o.userId === id);
  }
}

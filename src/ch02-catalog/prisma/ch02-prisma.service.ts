// 📦 Ch02PrismaService — Prisma로 관계 데이터 CRUD (MySQL)
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class Ch02PrismaService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(name: string) {
    return this.prisma.category.create({ data: { name } });
  }

  async linkProductToCategory(productId: number, categoryId: number) {
    return this.prisma.productCategory.create({ data: { productId, categoryId } });
  }

  // Prisma의 강점: 중첩 create로 관계 데이터를 한 번에 생성
  async createOrder(userId: number, items: { productId: number; quantity: number; unitPrice: number }[]) {
    const totalAmount = items.reduce((sum, i) => sum + i.quantity * Number(i.unitPrice), 0);
    return this.prisma.order.create({
      data: { userId, totalAmount, status: 'PENDING', orderItems: { create: items } },
      include: { orderItems: true },
    });
  }

  async createReview(userId: number, productId: number, rating: number, content?: string) {
    return this.prisma.review.create({ data: { userId, productId, rating, content } });
  }

  async findProductReviews(productId: number) {
    return this.prisma.review.findMany({
      where: { productId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findProductsByCategory(categoryId: number) {
    return this.prisma.product.findMany({
      where: { categories: { some: { categoryId } } },
      take: 20,
      orderBy: { name: 'asc' },
    });
  }

  async findPopularProducts() {
    return this.prisma.$queryRaw`
      SELECT p.id AS productId, p.name AS productName,
        COALESCE(AVG(r.rating), 0) AS avgRating, COUNT(r.id) AS reviewCount
      FROM Product p LEFT JOIN Review r ON r.productId = p.id
      GROUP BY p.id, p.name ORDER BY avgRating DESC, reviewCount DESC
    `;
  }
}

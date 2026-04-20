// ============================================================
// Ch03PrismaService -- Prisma에서의 N+1 문제 시연 & 해결 (MySQL)
// ============================================================
// Prisma에서 N+1이 발생하는 패턴:
//   findMany로 목록을 가져온 뒤, 루프 안에서 각 항목의 관계를 별도 조회
//
// Prisma의 해결법:
//   - include: 관계 데이터를 함께 로딩 (자동 JOIN or 추가 SELECT)
//   - select: 필요한 필드만 선택 (네트워크 전송량 감소)
//   - $queryRaw: 직접 JOIN SQL 작성 (최대 성능)
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class Ch03PrismaService {
  constructor(private readonly prisma: PrismaService) {}

  // Phase 1: N+1 발생 (나쁜 예시)
  async findOrdersNaive() {
    const start = Date.now();

    // 1. 주문 목록만 (관계 없이)
    const orders = await this.prisma.order.findMany({ take: 50 });

    const result = [];
    for (const order of orders) {
      // 2. 각 주문마다 별도 쿼리 (N+1!)
      const items = await this.prisma.orderItem.findMany({
        where: { orderId: order.id },
        include: { product: true },
      });
      result.push({ ...order, orderItems: items });
    }

    return [
      {
        _meta: { phase: 'naive', elapsedMs: Date.now() - start },
        data: result,
      },
    ];
  }

  // Phase 2: include로 해결
  async findOrdersInclude() {
    const start = Date.now();

    const orders = await this.prisma.order.findMany({
      take: 50,
      include: {
        user: true,
        orderItems: { include: { product: true } },
      },
    });

    return [
      {
        _meta: { phase: 'include', elapsedMs: Date.now() - start },
        data: orders,
      },
    ];
  }

  // Phase 3: select로 필요한 필드만
  async findOrdersSelect() {
    const start = Date.now();

    const orders = await this.prisma.order.findMany({
      take: 50,
      select: {
        id: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
        orderItems: {
          select: {
            quantity: true,
            unitPrice: true,
            product: { select: { id: true, name: true, price: true } },
          },
        },
      },
    });

    return [
      {
        _meta: { phase: 'select', elapsedMs: Date.now() - start },
        data: orders,
      },
    ];
  }

  // Phase 4: Raw JOIN (최대 성능)
  async findOrdersRawJoin() {
    const start = Date.now();

    const orders = await this.prisma.$queryRaw`
      SELECT
        o.id, o.totalAmount, o.status, o.createdAt,
        u.name AS userName,
        oi.quantity, oi.unitPrice,
        p.name AS productName
      FROM \`Order\` o
      LEFT JOIN User u ON u.id = o.userId
      LEFT JOIN OrderItem oi ON oi.orderId = o.id
      LEFT JOIN Product p ON p.id = oi.productId
      LIMIT 200
    `;

    return [
      {
        _meta: { phase: 'rawJoin', elapsedMs: Date.now() - start },
        data: orders,
      },
    ];
  }
}

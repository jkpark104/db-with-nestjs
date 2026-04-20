// ============================================================
// Ch06PrismaService — 집계, 트랜잭션, 동시성 제어, JSON (MySQL)
// ============================================================
// MySQL과 PostgreSQL의 차이:
//   - MySQL JSON vs PG JSONB:
//     PG JSONB: 바이너리 저장, GIN 인덱스 가능, 연산자(->>, @>) 풍부
//     MySQL JSON: 텍스트 기반, JSON_EXTRACT/JSON_CONTAINS 함수 사용
//   - 저장 프로시저: PG는 FUNCTION, MySQL은 PROCEDURE 키워드
//   - 날짜 함수: PG는 TO_CHAR/EXTRACT, MySQL은 DATE_FORMAT/YEAR/MONTH
//   - MVCC: MySQL은 InnoDB 엔진에서만 지원 (MyISAM은 테이블 락)
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class Ch06PrismaService {
  constructor(private readonly prisma: PrismaService) {}

  // 월별 매출 — MySQL의 DATE_FORMAT 사용
  async getMonthlyRevenue() {
    return this.prisma.$queryRaw`
      SELECT
        DATE_FORMAT(createdAt, '%Y-%m') AS month,
        SUM(totalAmount) AS revenue,
        COUNT(id) AS orderCount
      FROM \`Order\`
      WHERE status != 'CANCELLED'
      GROUP BY month
      ORDER BY month DESC
    `;
  }

  // 매출 TOP 10 — MySQL 구문
  async getTopProducts() {
    return this.prisma.$queryRaw`
      SELECT
        oi.productId,
        p.name AS productName,
        SUM(oi.quantity * oi.unitPrice) AS totalRevenue,
        SUM(oi.quantity) AS totalQuantity
      FROM OrderItem oi
      INNER JOIN Product p ON p.id = oi.productId
      GROUP BY oi.productId, p.name
      ORDER BY totalRevenue DESC
      LIMIT 10
    `;
  }

  // 윈도우 함수 (MySQL 8+ 지원)
  // RANK() OVER (PARTITION BY ... ORDER BY ...)
  async getCategoryRanking() {
    return this.prisma.$queryRaw`
      SELECT sub.*, RANK() OVER (
        PARTITION BY sub.categoryName ORDER BY sub.totalRevenue DESC
      ) AS rankInCategory
      FROM (
        SELECT c.name AS categoryName, p.name AS productName,
          COALESCE(SUM(oi.quantity * oi.unitPrice), 0) AS totalRevenue
        FROM Product p
        LEFT JOIN ProductCategory pc ON pc.productId = p.id
        LEFT JOIN Category c ON c.id = pc.categoryId
        LEFT JOIN OrderItem oi ON oi.productId = p.id
        GROUP BY c.name, p.name
      ) sub
      ORDER BY sub.categoryName, rankInCategory
      LIMIT 50
    `;
  }

  // 인터랙티브 트랜잭션 — Prisma의 $transaction 사용
  // 콜백 내 모든 작업이 하나의 트랜잭션으로 묶입니다
  async checkout(userId: number, items: { productId: number; quantity: number }[]) {
    return this.prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItems: { productId: number; quantity: number; unitPrice: number }[] = [];

      for (const item of items) {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: item.productId },
        });

        if (product.stock < item.quantity) {
          throw new Error(`재고 부족: ${product.name}`);
        }

        // decrement: 원자적 감소 연산 (동시성 안전)
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });

        orderItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: Number(product.price),
        });
        totalAmount += Number(product.price) * item.quantity;
      }

      return tx.order.create({
        data: {
          userId,
          totalAmount,
          status: 'PAID',
          orderItems: { create: orderItems },
        },
        include: { orderItems: true },
      });
    });
  }

  // 비관적 락 (FOR UPDATE) — Raw SQL로 행 잠금
  // Prisma는 네이티브 FOR UPDATE를 지원하지 않으므로 $queryRaw 사용
  async checkoutWithLock(userId: number, productId: number, quantity: number) {
    return this.prisma.$transaction(async (tx) => {
      const [product] = await tx.$queryRaw<any[]>`
        SELECT * FROM Product WHERE id = ${productId} FOR UPDATE
      `;

      if (!product || product.stock < quantity) {
        throw new Error('재고 부족');
      }

      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });

      return tx.order.create({
        data: {
          userId,
          totalAmount: Number(product.price) * quantity,
          status: 'PAID',
          orderItems: {
            create: [{ productId, quantity, unitPrice: Number(product.price) }],
          },
        },
      });
    });
  }

  // MySQL 저장 프로시저 — PROCEDURE 키워드 사용
  // PostgreSQL과 달리 MySQL은 CREATE PROCEDURE를 사용합니다
  async callMonthlyRevenueProc(year: number, month: number) {
    await this.prisma.$executeRaw`
      CREATE PROCEDURE IF NOT EXISTS calculate_monthly_revenue(IN p_year INT, IN p_month INT)
      BEGIN
        SELECT
          COALESCE(SUM(totalAmount), 0) AS total_revenue,
          COUNT(id) AS order_count
        FROM \`Order\`
        WHERE YEAR(createdAt) = p_year AND MONTH(createdAt) = p_month
          AND status != 'CANCELLED';
      END
    `.catch(() => {
      /* 이미 존재하면 무시 */
    });

    return this.prisma.$queryRaw`CALL calculate_monthly_revenue(${year}, ${month})`;
  }

  // MySQL JSON 검색 — JSON_EXTRACT 함수 사용
  // PostgreSQL의 ->> 연산자에 대응합니다
  // JSON_EXTRACT(metadata, '$.color') = 'red'
  async searchByMetadata(key: string, value: string) {
    return this.prisma.$queryRaw`
      SELECT id, name, price, metadata
      FROM Product
      WHERE JSON_EXTRACT(metadata, ${`$.${key}`}) = ${value}
      LIMIT 20
    `;
  }
}

// ============================================================
// Ch06TypeormService — 집계, 트랜잭션, 동시성 제어, JSONB (PostgreSQL)
// ============================================================
//
// 트랜잭션(Transaction)이란?
//   여러 DB 작업을 "하나의 작업 단위"로 묶는 것
//   ACID 속성:
//     A(Atomicity): 전부 성공 or 전부 실패 (부분 성공 없음)
//     C(Consistency): 트랜잭션 전후로 DB가 일관된 상태 유지
//     I(Isolation): 동시 트랜잭션이 서로 간섭하지 않음
//     D(Durability): 완료된 트랜잭션은 영구 저장
//
// 동시성 제어 — 두 사람이 동시에 같은 상품을 주문하면?
//   비관적 락(Pessimistic Lock): "먼저 잠근 사람만 수정 가능"
//     → SELECT ... FOR UPDATE (행을 잠금)
//     → 사용 시점: 충돌이 빈번할 때 (재고 차감)
//   낙관적 락(Optimistic Lock): "일단 수정하고, 충돌 시 재시도"
//     → @VersionColumn으로 버전 번호 체크
//     → 사용 시점: 충돌이 드물 때
//
// MVCC (Multi-Version Concurrency Control):
//   PostgreSQL: 모든 트랜잭션에서 MVCC 사용 (읽기가 쓰기를 차단하지 않음)
//   MySQL: InnoDB 엔진에서만 MVCC 지원
// ============================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Order,
  OrderStatus,
} from '../../ch02-catalog/typeorm/entities/order.entity';
import { Product } from '../../ch01-shop-open/typeorm/entities/product.entity';
import { OrderItem } from '../../ch02-catalog/typeorm/entities/order-item.entity';

@Injectable()
export class Ch06TypeormService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Part 1: 월별 매출 합계 (GROUP BY + SUM) ──
  // GROUP BY: 특정 기준으로 행을 그룹화
  // SUM: 그룹 내 합계 계산
  // TO_CHAR: PostgreSQL의 날짜 포맷 함수
  async getMonthlyRevenue() {
    return this.orderRepo
      .createQueryBuilder('o')
      .select("TO_CHAR(o.createdAt, 'YYYY-MM')", 'month')
      .addSelect('SUM(o.totalAmount)', 'revenue')
      .addSelect('COUNT(o.id)', 'orderCount')
      .where("o.status != 'CANCELLED'")
      .groupBy('month')
      .orderBy('month', 'DESC')
      .getRawMany();
  }

  // ── 매출 TOP 10 상품 ──
  // INNER JOIN: 두 테이블을 연결 (일치하는 행만)
  // SUM(oi.quantity * oi.unitPrice): 상품별 총 매출 계산
  async getTopProducts() {
    return this.dataSource
      .getRepository(OrderItem)
      .createQueryBuilder('oi')
      .select('oi.productId', 'productId')
      .addSelect('p.name', 'productName')
      .addSelect('SUM(oi.quantity * oi.unitPrice)', 'totalRevenue')
      .addSelect('SUM(oi.quantity)', 'totalQuantity')
      .innerJoin('oi.product', 'p')
      .groupBy('oi.productId')
      .addGroupBy('p.name')
      .orderBy('"totalRevenue"', 'DESC')
      .limit(10)
      .getRawMany();
  }

  // ── Part 2: 윈도우 함수 — 카테고리 내 매출 랭킹 ──
  // RANK() OVER (PARTITION BY ... ORDER BY ...):
  //   PARTITION BY = 그룹 나누기 (카테고리별)
  //   ORDER BY = 그룹 내 정렬 (매출 높은 순)
  //   RANK() = 순위 매기기 (동점이면 같은 순위, 다음 순위 건너뜀)
  async getCategoryRanking() {
    return this.dataSource.query<
      {
        category_name: string;
        product_name: string;
        total_revenue: number;
        rank_in_category: number;
      }[]
    >(`
      SELECT
        sub.category_name,
        sub.product_name,
        sub.total_revenue,
        RANK() OVER (
          PARTITION BY sub.category_name
          ORDER BY sub.total_revenue DESC
        ) AS rank_in_category
      FROM (
        SELECT
          c.name AS category_name,
          p.name AS product_name,
          COALESCE(SUM(oi.quantity * oi."unitPrice"), 0) AS total_revenue
        FROM products p
        LEFT JOIN product_categories pc ON pc."productId" = p.id
        LEFT JOIN categories c ON c.id = pc."categoryId"
        LEFT JOIN order_items oi ON oi."productId" = p.id
        GROUP BY c.name, p.name
      ) sub
      ORDER BY sub.category_name, rank_in_category
      LIMIT 50
    `);
  }

  // ── Part 3: 트랜잭션 — 주문 결제 처리 ──
  // 재고 차감 + 주문 생성을 하나의 트랜잭션으로 묶음
  // 하나라도 실패하면 전체 롤백!
  async checkout(
    userId: number,
    items: { productId: number; quantity: number }[],
  ) {
    return this.dataSource.transaction(async (manager) => {
      const orderItems: OrderItem[] = [];
      let totalAmount = 0;

      for (const item of items) {
        // 재고 확인
        const product = await manager.findOneOrFail(Product, {
          where: { id: item.productId },
        });

        if (product.stock < item.quantity) {
          throw new Error(
            `재고 부족: ${product.name} (남은 수량: ${product.stock})`,
          );
        }

        // 재고 차감
        await manager.update(Product, item.productId, {
          stock: () => `stock - ${item.quantity}`,
        });

        const oi = new OrderItem();
        oi.productId = item.productId;
        oi.quantity = item.quantity;
        oi.unitPrice = product.price;
        orderItems.push(oi);
        totalAmount += product.price * item.quantity;
      }

      // 주문 생성
      const order = manager.create(Order, {
        userId,
        totalAmount,
        status: OrderStatus.PAID,
        orderItems,
      });

      return manager.save(order);
    });
  }

  // ── Part 4: 비관적 락 — 동시 재고 차감 방지 ──
  // QueryRunner를 사용해 트랜잭션을 수동으로 관리합니다.
  // setLock('pessimistic_write') → SELECT ... FOR UPDATE
  // 이 행을 다른 트랜잭션이 읽거나 수정할 수 없게 잠급니다.
  async checkoutWithLock(userId: number, productId: number, quantity: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // FOR UPDATE → 이 행을 다른 트랜잭션이 읽을 수 없게 잠금
      const product = await queryRunner.manager
        .createQueryBuilder(Product, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :id', { id: productId })
        .getOneOrFail();

      if (product.stock < quantity) {
        throw new Error(`재고 부족: ${product.name}`);
      }

      await queryRunner.manager.update(Product, productId, {
        stock: product.stock - quantity,
      });

      const order = queryRunner.manager.create(Order, {
        userId,
        totalAmount: product.price * quantity,
        status: OrderStatus.PAID,
        orderItems: [
          Object.assign(new OrderItem(), {
            productId,
            quantity,
            unitPrice: product.price,
          }),
        ],
      });

      const saved = await queryRunner.manager.save(order);
      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Part 5: 저장 프로시저 (PG 함수) ──
  // CREATE OR REPLACE FUNCTION: PostgreSQL에서 저장 프로시저(함수) 생성
  // plpgsql: PostgreSQL의 절차적 언어
  // RETURNS TABLE: 여러 행을 반환하는 함수
  async callMonthlyRevenueFunction(year: number, month: number) {
    // 먼저 함수 생성 (존재하지 않는 경우)
    await this.dataSource.query(`
      CREATE OR REPLACE FUNCTION calculate_monthly_revenue(p_year INT, p_month INT)
      RETURNS TABLE(total_revenue NUMERIC, order_count BIGINT) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          COALESCE(SUM(o."totalAmount"), 0) AS total_revenue,
          COUNT(o.id) AS order_count
        FROM orders o
        WHERE EXTRACT(YEAR FROM o."createdAt") = p_year
          AND EXTRACT(MONTH FROM o."createdAt") = p_month
          AND o.status != 'CANCELLED';
      END;
      $$ LANGUAGE plpgsql;
    `);

    return this.dataSource.query<
      { total_revenue: number; order_count: number }[]
    >(`SELECT * FROM calculate_monthly_revenue($1, $2)`, [year, month]);
  }

  // ── Part 6: JSONB 검색 (PostgreSQL 전용) ──
  // ->> 연산자: JSONB에서 텍스트 값 추출
  // 예: metadata->>'color' = 'red' → metadata에서 color 키의 값이 red인 행
  // PostgreSQL의 JSONB는 GIN 인덱스를 걸 수 있어 검색이 빠릅니다
  async searchByMetadata(key: string, value: string) {
    return this.dataSource.query<
      { id: number; name: string; price: number; metadata: unknown }[]
    >(
      `SELECT id, name, price, metadata
       FROM products
       WHERE metadata ->> $1 = $2
       LIMIT 20`,
      [key, value],
    );
  }
}

// ============================================================
// Ch03TypeormService -- N+1 문제 시연 & 해결
// ============================================================
//
// N+1 문제란?
//   목록을 가져오는 쿼리 1개 + 각 항목의 상세를 가져오는 쿼리 N개
//   = 총 N+1개의 쿼리가 실행되는 비효율적 패턴
//
//   예: 주문 100건 조회 -> 1(주문 목록) + 100(각 주문의 상품) = 101개 쿼리!
//
// 왜 문제인가?
//   - 네트워크 왕복(RTT): DB가 원격 서버에 있으면 쿼리 하나당 ~1ms의 네트워크 비용
//   - 101개 쿼리 x 1ms = ~100ms 추가 지연 (로컬에서는 체감이 작지만 프로덕션에서는 치명적!)
//   - 일반적인 API 응답 목표: 100ms 이내
//
// 해결 전략 (Phase 1->4로 점진적 개선):
//   Phase 1: N+1 발생 (나쁜 예시)
//   Phase 2: Eager Loading (relations 옵션)
//   Phase 3: JOIN (Query Builder -- 가장 효율적)
//   Phase 4: 배치 페칭 (IN 절 + GROUP BY)
//
// ┌─────────────────────────────────────────────────┐
// | Phase  | 쿼리 수      | 성능       | 설명       |
// |--------|--------------|------------|------------|
// | 1 Naive| 1 + N + N*M  | 매우 느림  | 루프 내 조회|
// | 2 Eager| 3~4개        | 보통       | 자동 JOIN  |
// | 3 JOIN | 1개          | 가장 빠름  | 수동 JOIN  |
// | 4 Batch| 2~3개        | 빠름       | IN절 배치  |
// └─────────────────────────────────────────────────┘
// ============================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Order } from '../../ch02-catalog/typeorm/entities/order.entity';
import { OrderItem } from '../../ch02-catalog/typeorm/entities/order-item.entity';

@Injectable()
export class Ch03TypeormService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    private readonly dataSource: DataSource,
  ) {}

  // ============================================================
  // Phase 1: N+1 발생 (나쁜 예시 -- 이렇게 하면 안 됩니다!)
  // ============================================================
  // 실행되는 쿼리:
  //   1) SELECT * FROM orders LIMIT 50          (1개)
  //   2) 각 order마다: SELECT * FROM order_items WHERE orderId = ?  (N개)
  //   3) 각 item마다: SELECT * FROM products WHERE id = ?           (N*M개)
  //   -> 주문 50건, 항목 평균 4개 = 1 + 50 + 200 = 251개 쿼리!
  async findOrdersNaive(): Promise<any[]> {
    const start = Date.now();
    let queryCount = 0;

    // 1. 주문 목록만 가져옴 (관계 데이터 없이)
    const orders = await this.orderRepo.find({ take: 50 });
    queryCount++;

    const result = [];
    for (const order of orders) {
      // 2. 각 주문마다 별도 쿼리로 주문 항목을 가져옴 (N+1의 "N" 부분)
      const items = await this.orderItemRepo.find({
        where: { orderId: order.id },
        relations: ['product'], // 3. 각 항목의 상품 정보도 추가 쿼리
      });
      queryCount += 1; // 실제로는 items 내 product 로딩으로 더 많은 쿼리 발생

      result.push({ ...order, orderItems: items });
    }

    return [{
      _meta: {
        phase: 'naive',
        estimatedQueries: `1 + ${orders.length} + a`,
        elapsedMs: Date.now() - start,
        warning: '이 방식은 프로덕션에서 절대 사용하지 마세요!',
      },
      data: result,
    }];
  }

  // ============================================================
  // Phase 2: Eager Loading -- relations 옵션으로 자동 JOIN
  // ============================================================
  // TypeORM이 자동으로 LEFT JOIN 쿼리를 생성합니다.
  // 쿼리 수: 3~4개 (테이블당 1개의 SELECT + JOIN)
  async findOrdersEager(): Promise<any[]> {
    const start = Date.now();

    const orders = await this.orderRepo.find({
      take: 50,
      relations: ['orderItems', 'orderItems.product', 'user'],
      // relations: 관계 데이터를 함께 로딩해라!
      // 'orderItems.product' -> 중첩 관계 (주문항목 -> 상품)까지 한 번에
    });

    return [{
      _meta: {
        phase: 'eager',
        queryCount: '3~4개 (자동 JOIN)',
        elapsedMs: Date.now() - start,
      },
      data: orders,
    }];
  }

  // ============================================================
  // Phase 3: JOIN -- Query Builder로 단일 쿼리 (가장 효율적)
  // ============================================================
  // 수동으로 JOIN을 작성하여 모든 데이터를 1개의 쿼리로 가져옵니다.
  //
  // 생성되는 SQL:
  //   SELECT order.*, items.*, product.*, user.*
  //   FROM orders order
  //   LEFT JOIN order_items items ON items."orderId" = order.id
  //   LEFT JOIN products product ON product.id = items."productId"
  //   LEFT JOIN users user ON user.id = order."userId"
  //   LIMIT 50
  async findOrdersJoin(): Promise<any[]> {
    const start = Date.now();

    const orders = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderItems', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.user', 'user')
      .take(50)
      .getMany();

    return [{
      _meta: {
        phase: 'join',
        queryCount: '1개 (수동 JOIN)',
        elapsedMs: Date.now() - start,
        note: 'JOIN 방식은 N+1 대비 약 10배 이상 빠릅니다',
      },
      data: orders,
    }];
  }

  // ============================================================
  // Phase 4: 배치 페칭 -- IN절로 묶어서 조회
  // ============================================================
  // 쿼리 수: 2~3개
  //   1) 주문 목록
  //   2) 해당 주문들의 모든 OrderItem을 IN절로 한 번에
  //   3) 해당 상품들을 IN절로 한 번에
  async findOrdersBatch(): Promise<any[]> {
    const start = Date.now();

    // 1. 주문 목록 (1개 쿼리)
    const orders = await this.orderRepo.find({ take: 50 });

    // 2. 모든 주문의 OrderItem을 한 번에 (1개 쿼리)
    const orderIds = orders.map((o) => o.id);
    const allItems = await this.orderItemRepo.find({
      where: { orderId: In(orderIds) },
      relations: ['product'],
    });

    // 3. 메모리에서 매핑 (추가 쿼리 없음)
    const itemsByOrderId = new Map<number, OrderItem[]>();
    for (const item of allItems) {
      const list = itemsByOrderId.get(item.orderId) || [];
      list.push(item);
      itemsByOrderId.set(item.orderId, list);
    }

    const result = orders.map((order) => ({
      ...order,
      orderItems: itemsByOrderId.get(order.id) || [],
    }));

    return [{
      _meta: {
        phase: 'batch',
        queryCount: '2~3개 (IN절 배치)',
        elapsedMs: Date.now() - start,
      },
      data: result,
    }];
  }
}

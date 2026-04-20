// ============================================================
// Product 엔티티 — "상품" 테이블
// ============================================================
// 다양한 컬럼 타입을 보여주는 예시입니다.
//   - decimal: 정확한 소수점 연산 (가격에 필수!)
//   - text: 길이 제한 없는 문자열
//   - jsonb: JSON 데이터 저장 (PostgreSQL 전용, Ch06에서 학습)
//
// float를 쓰면 안 되는 이유:
//   0.1 + 0.2 = 0.30000000000000004 (부동소수점 오차)
//   돈 계산에서는 반드시 decimal을 사용하세요!
// ============================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ProductCategory } from '../../../ch02-catalog/typeorm/entities/product-category.entity';
import { OrderItem } from '../../../ch02-catalog/typeorm/entities/order-item.entity';
import { Review } from '../../../ch02-catalog/typeorm/entities/review.entity';

// Ch04: 가격 검색용 B-Tree 인덱스 — 가격 범위 쿼리(BETWEEN)를 빠르게 합니다
@Index('idx_product_price', ['price'])
// Ch04: 풀텍스트 검색 인덱스 — 상품명 키워드 검색에 사용됩니다
@Index('idx_product_name_fulltext', ['name'], { fulltext: true })
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  // decimal(10,2) → 최대 10자리, 소수점 2자리 (예: 99999999.99)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  // nullable: true → NULL 허용, text 타입 → 길이 제한 없음
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // PostgreSQL의 jsonb 타입: JSON을 바이너리로 저장해 검색이 빠름
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;

  // ── 관계 필드 (Ch02에서 활성화) ──
  // 하나의 상품은 여러 카테고리에 속할 수 있습니다 (N:M, 중간 테이블 경유)
  @OneToMany(() => ProductCategory, (pc) => pc.product)
  productCategories!: ProductCategory[];

  // 하나의 상품은 여러 주문 항목에 포함될 수 있습니다 (1:N)
  @OneToMany(() => OrderItem, (item) => item.product)
  orderItems!: OrderItem[];

  // 하나의 상품은 여러 리뷰를 가질 수 있습니다 (1:N)
  @OneToMany(() => Review, (review) => review.product)
  reviews!: Review[];
}

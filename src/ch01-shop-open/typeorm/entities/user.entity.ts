// ============================================================
// User 엔티티 — "고객" 테이블
// ============================================================
// 엔티티(Entity)란?
//   데이터베이스의 테이블 1개 = TypeScript 클래스 1개입니다.
//   클래스의 속성(property) = 테이블의 컬럼(column)에 대응합니다.
//
// 데코레이터(Decorator)란?
//   @로 시작하는 특수 함수로, 클래스나 속성에 "메타데이터"를 붙입니다.
//   TypeORM은 이 데코레이터를 읽어서 자동으로 SQL을 생성합니다.
// ============================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('users')
export class User {
  // ── 기본 키 (Primary Key) ──
  // 모든 테이블에는 각 행(row)을 고유하게 식별하는 컬럼이 필요합니다.
  // 'increment' → 1, 2, 3, ... 자동 증가하는 정수 ID
  @PrimaryGeneratedColumn()
  id: number;

  // ── 이메일 (유니크 제약) ──
  // unique: true → 같은 이메일로 두 명의 유저를 만들 수 없음
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  // CreateDateColumn → INSERT 시 자동으로 현재 시간이 들어감
  @CreateDateColumn()
  createdAt: Date;

  // ── 관계 필드 (Ch02에서 활성화) ──
  // 한 명의 유저는 여러 개의 주문을 가질 수 있습니다 (1:N)
  // 아직 Order 엔티티가 없으므로 주석 처리. Ch02에서 연결합니다.
  // @OneToMany(() => Order, (order) => order.user)
  // orders: Order[];

  // @OneToMany(() => Review, (review) => review.user)
  // reviews: Review[];
}

// ⭐ Review — 두 개의 FK (userId, productId)를 가진 테이블
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../ch01-shop-open/typeorm/entities/user.entity';
import { Product } from '../../../ch01-shop-open/typeorm/entities/product.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  userId!: number;

  @Column()
  productId!: number;

  @Column({ type: 'int' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  content!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => User, (user) => user.reviews)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Product, (product) => product.reviews)
  @JoinColumn({ name: 'productId' })
  product!: Product;
}

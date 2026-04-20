// 🔗 ProductCategory — N:M 관계의 "중간 테이블"
// N:M 관계는 DB에서 직접 표현할 수 없어 중간 테이블로 분해합니다.
// Product ─(1:N)─ ProductCategory ─(N:1)─ Category
import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from '../../../ch01-shop-open/typeorm/entities/product.entity';
import { Category } from './category.entity';

@Entity('product_categories')
export class ProductCategory {
  @PrimaryColumn()
  productId!: number;

  @PrimaryColumn()
  categoryId!: number;

  @ManyToOne(() => Product, (product) => product.productCategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @ManyToOne(() => Category, (category) => category.productCategories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'categoryId' })
  category!: Category;
}

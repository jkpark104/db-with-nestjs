// 🏷️ Category 엔티티 — N:M 관계의 한 쪽
// 하나의 상품은 여러 카테고리에, 하나의 카테고리에는 여러 상품이 속할 수 있습니다.
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ProductCategory } from './product-category.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @OneToMany(() => ProductCategory, (pc) => pc.category)
  productCategories: ProductCategory[];
}

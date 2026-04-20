// 📦 Ch02TypeormService — 관계 데이터 CRUD + Query Builder
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Product } from '../../ch01-shop-open/typeorm/entities/product.entity';
import { Category } from './entities/category.entity';
import { ProductCategory } from './entities/product-category.entity';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Review } from './entities/review.entity';
import { PopularProductsView } from './entities/popular-products.view-entity';

@Injectable()
export class Ch02TypeormService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(ProductCategory)
    private readonly pcRepo: Repository<ProductCategory>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(PopularProductsView)
    private readonly popularRepo: Repository<PopularProductsView>,
    private readonly dataSource: DataSource,
  ) {}

  async createCategory(name: string) {
    return this.categoryRepo.save(this.categoryRepo.create({ name }));
  }

  async linkProductToCategory(productId: number, categoryId: number) {
    return this.pcRepo.save({ productId, categoryId });
  }

  async createOrder(
    userId: number,
    items: { productId: number; quantity: number; unitPrice: number }[],
  ) {
    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const order = this.orderRepo.create({
      userId,
      totalAmount,
      status: OrderStatus.PENDING,
      orderItems: items.map((item) => Object.assign(new OrderItem(), item)),
    });
    return this.orderRepo.save(order);
  }

  async createReview(
    userId: number,
    productId: number,
    rating: number,
    content?: string,
  ) {
    return this.reviewRepo.save(
      this.reviewRepo.create({ userId, productId, rating, content }),
    );
  }

  // relations 옵션: JOIN하여 연관 데이터를 함께 가져옴
  async findProductReviews(productId: number) {
    return this.reviewRepo.find({
      where: { productId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  // Query Builder: SQL을 코드로 작성
  async findProductsByCategory(categoryId: number) {
    return this.dataSource
      .getRepository(Product)
      .createQueryBuilder('p')
      .innerJoin('p.productCategories', 'pc')
      .where('pc.categoryId = :categoryId', { categoryId })
      .orderBy('p.name', 'ASC')
      .limit(20)
      .getMany();
  }

  async findPopularProducts() {
    return this.popularRepo.find();
  }
}

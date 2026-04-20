// ============================================================
// Ch01TypeormService — TypeORM으로 기본 CRUD 수행
// ============================================================
// Repository 패턴:
//   TypeORM은 각 엔티티마다 "Repository" 객체를 제공합니다.
//   Repository = 특정 테이블에 대한 CRUD 작업을 수행하는 도구
//
// 의존성 주입 (Dependency Injection):
//   @InjectRepository(User) → NestJS가 UserRepository를 자동으로 넣어줌
// ============================================================

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Product } from './entities/product.entity';

@Injectable()
export class Ch01TypeormService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  // save() = INSERT SQL을 실행합니다
  async createUser(email: string, name: string): Promise<User> {
    const user = this.userRepo.create({ email, name });
    return this.userRepo.save(user);
  }

  // find() = SELECT * FROM users
  async findAllUsers(): Promise<User[]> {
    return this.userRepo.find();
  }

  async createProduct(data: {
    name: string;
    price: number;
    stock: number;
    description?: string;
  }): Promise<Product> {
    const product = this.productRepo.create(data);
    return this.productRepo.save(product);
  }

  async findAllProducts(): Promise<Product[]> {
    return this.productRepo.find();
  }
}

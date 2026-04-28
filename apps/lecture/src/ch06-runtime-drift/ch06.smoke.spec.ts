import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import request from 'supertest';
import { ContractStatusInterceptor } from '../common/contract-status.interceptor';
import { Ch06RuntimeDriftModule } from './ch06.module';

jest.mock('@app/mock-data', () => ({
  initStore: jest.fn(),
  getStore: jest.fn(() => ({
    products: [
      { id: 1, name: 'Test', priceInWon: 10000, stock: 5, description: 'desc', createdAt: '2024-01-01T00:00:00.000Z' },
    ],
    users: [{ id: 1, email: 'a@b.c', name: 'User', createdAt: '2024-01-01T00:00:00.000Z' }],
    orders: [],
    categories: [],
    productCategories: [],
    orderItems: [],
    reviews: [],
  })),
}));

describe('Ch06 runtime-drift smoke', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({
      imports: [Ch06RuntimeDriftModule],
      providers: [{ provide: APP_INTERCEPTOR, useClass: ContractStatusInterceptor }],
    }).compile();
    app = ref.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('GET /products/1 → 200, price field present (intentional violation)', async () => {
    const res = await request(app.getHttpServer()).get('/products/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('price');
    expect(res.body).not.toHaveProperty('priceInWon');
  });

  it('GET /users/1 → 200, header contains spec-derived', async () => {
    const res = await request(app.getHttpServer()).get('/users/1');
    expect(res.status).toBe(200);
    expect(res.headers['x-contract-status']).toContain('spec-derived');
  });
});

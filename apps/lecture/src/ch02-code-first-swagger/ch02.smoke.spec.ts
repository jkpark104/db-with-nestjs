import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import request from 'supertest';
import { ContractStatusInterceptor } from '../common/contract-status.interceptor';
import { Ch02CodeFirstSwaggerModule } from './ch02.module';

jest.mock('@app/mock-data', () => ({
  initStore: jest.fn(),
  getStore: jest.fn(() => ({
    products: [
      { id: 1, name: 'Test Product', priceInWon: 10000, stock: 5, description: 'desc', createdAt: '2024-01-01T00:00:00.000Z' },
    ],
    users: [
      { id: 1, email: 'test@test.com', name: 'Test User', createdAt: '2024-01-01T00:00:00.000Z' },
    ],
    orders: [
      { id: 1, userId: 1, status: 'PENDING', totalAmountInWon: 10000, createdAt: '2024-01-01T00:00:00.000Z' },
    ],
    categories: [],
    productCategories: [],
    orderItems: [],
    reviews: [],
  })),
}));

describe('Ch02 code-first smoke', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const ref = await Test.createTestingModule({
      imports: [Ch02CodeFirstSwaggerModule],
      providers: [{ provide: APP_INTERCEPTOR, useClass: ContractStatusInterceptor }],
    }).compile();
    app = ref.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('GET /products/1 → 200, priceInWon, header code-derived', async () => {
    const res = await request(app.getHttpServer()).get('/products/1');
    expect(res.status).toBe(200);
    expect(res.body.priceInWon).toBeGreaterThanOrEqual(0);
    expect(res.headers['x-contract-status']).toBe('code-derived');
  });

  it('GET /users/1 → 200, header code-derived', async () => {
    const res = await request(app.getHttpServer()).get('/users/1');
    expect(res.status).toBe(200);
    expect(res.headers['x-contract-status']).toBe('code-derived');
  });
});

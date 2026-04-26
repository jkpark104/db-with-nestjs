export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: Date;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  description: string;
  createdAt: Date;
}

export interface Category {
  id: number;
  name: string;
}

export interface ProductCategory {
  productId: number;
  categoryId: number;
}

export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  totalAmount: number;
  createdAt: Date;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface Review {
  id: number;
  userId: number;
  productId: number;
  rating: number;
  content: string;
  createdAt: Date;
}

export interface Store {
  users: User[];
  products: Product[];
  categories: Category[];
  productCategories: ProductCategory[];
  orders: Order[];
  orderItems: OrderItem[];
  reviews: Review[];
}

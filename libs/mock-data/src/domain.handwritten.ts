export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  priceInWon: number;
  stock: number;
  description: string;
  createdAt: string;
}

export interface Category { id: number; name: string; }
export interface ProductCategory { productId: number; categoryId: number; }

export interface Order {
  id: number;
  userId: number;
  status: OrderStatus;
  totalAmountInWon: number;
  createdAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  unitPriceInWon: number;
}

export interface Review {
  id: number;
  userId: number;
  productId: number;
  rating: number;
  content: string;
  createdAt: string;
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

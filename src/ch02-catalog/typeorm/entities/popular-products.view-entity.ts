// 👁️ PopularProducts — DB 뷰(View): 자주 쓰는 복잡한 쿼리를 가상 테이블로 저장
import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
  name: 'popular_products_view',
  expression: `
    SELECT
      p.id AS "productId",
      p.name AS "productName",
      COALESCE(AVG(r.rating), 0) AS "avgRating",
      COUNT(r.id) AS "reviewCount"
    FROM products p
    LEFT JOIN reviews r ON r."productId" = p.id
    GROUP BY p.id, p.name
    ORDER BY "avgRating" DESC, "reviewCount" DESC
  `,
})
export class PopularProductsView {
  @ViewColumn()
  productId!: number;

  @ViewColumn()
  productName!: string;

  @ViewColumn()
  avgRating!: number;

  @ViewColumn()
  reviewCount!: number;
}

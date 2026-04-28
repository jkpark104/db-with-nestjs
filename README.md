# OAS Lecture Suite

REST API의 OpenAPI Specification(OAS) 학습용 모노레포. Ch01~Ch08 토글로 진행.

## Ch01 — 사후 문서 표류 (의도적 안티패턴)

```bash
# README의 cURL 예시 (의도적으로 'price' 표기 — 실제 응답은 priceInWon)
curl http://localhost:3000/products/1
# Expected (옛날 가격 필드명): {"id":1,"price":9900,"name":"...",...}
```

> ⚠️ 위 예시는 의도적으로 어긋나 있다. 실제 응답을 직접 확인해 차이를 발견하라.

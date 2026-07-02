# Roadmap de PRs — MVP VianStore

Trazabilidad de los pull requests necesarios para llegar al MVP. Cada PR es un vertical slice (DB + API + UI cuando aplica) desplegable y validable de forma independiente.

## Estados

- `pending` — planeado pero no iniciado.
- `in_progress` — con desarrollo activo.
- `in_review` — abierto como PR en GitHub esperando revisión.
- `merged` — integrado a `main`.
- `blocked` — pausado por dependencia externa o decisión pendiente.

Cambia el campo `status` en el frontmatter de cada archivo y refleja el cambio en esta tabla.

## Lista

| # | Título | Fase | Estado | Depende de |
|---|---|---|---|---|
| [1](pr-01-bootstrap.md) | Bootstrap del proyecto | 0 - Fundación | `merged` | — |
| [2](pr-02-database-setup.md) | Base de datos + Prisma + Supabase | 0 - Fundación | `pending` | #1 |
| [3](pr-03-auth-roles.md) | Auth (Supabase) + roles | 0 - Fundación | `pending` | #2 |
| [4](pr-04-catalog-model.md) | Modelo de catálogo | 1 - Catálogo | `pending` | #2 |
| [5](pr-05-admin-catalog-crud.md) | Admin: CRUD de catálogo | 1 - Catálogo | `pending` | #3, #4 |
| [6](pr-06-storefront-catalog.md) | Storefront: catálogo público | 1 - Catálogo | `pending` | #4 |
| [7](pr-07-cart.md) | Carrito | 2 - Compra | `pending` | #6 |
| [8](pr-08-checkout-addresses.md) | Direcciones y checkout | 2 - Compra | `pending` | #7 |
| [9](pr-09-email-infra.md) | Emails transaccionales (infra + confirmación) | 2 - Compra | `pending` | #8 |
| [10](pr-10-order-history.md) | Historial de pedidos (cliente) | 3 - Post-compra | `pending` | #8 |
| [11](pr-11-admin-orders.md) | Admin: gestión de pedidos | 3 - Post-compra | `pending` | #8 |
| [12](pr-12-shipping-emails.md) | Email de despacho + estados | 3 - Post-compra | `pending` | #9, #11 |
| [13](pr-13-admin-dashboard.md) | Dashboard admin | 4 - Cierre | `pending` | #11 |
| [14](pr-14-cicd-deploy.md) | CI/CD y despliegue | 4 - Cierre | `pending` | #1 |

## Convención de branches

`pr-<numero>-<slug>` — ej: `pr-01-bootstrap`, `pr-04-catalog-model`.

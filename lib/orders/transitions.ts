import type { OrderStatus } from "@prisma/client";

/**
 * Máquina de estados de un pedido. Cada estado define las transiciones válidas.
 *
 * Reglas:
 *   - Antes de `enviado` el pedido se puede cancelar (repone stock).
 *   - Desde `enviado` NO se puede cancelar (el paquete ya salió).
 *   - `entregado` y `cancelado` son estados terminales.
 */
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  pendiente_pago: ["pagado", "cancelado"],
  pagado: ["en_preparacion", "cancelado"],
  en_preparacion: ["enviado", "cancelado"],
  enviado: ["entregado"],
  entregado: [],
  cancelado: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED[from].includes(to);
}

export function allowedTransitions(from: OrderStatus): OrderStatus[] {
  return ALLOWED[from];
}

/** Transiciones que restauran stock al ejecutarse. Hoy solo `cancelado`. */
export function transitionRestoresStock(to: OrderStatus): boolean {
  return to === "cancelado";
}

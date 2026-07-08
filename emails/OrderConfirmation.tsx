import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type OrderConfirmationItem = {
  productName: string;
  colorName: string;
  sizeLabel: string;
  skuCode: string;
  qty: number;
  subtotalCents: number;
};

export type OrderConfirmationAddress = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  country: string;
};

export type OrderConfirmationProps = {
  orderShortId: string;
  orderUrl: string;
  customerName: string;
  address: OrderConfirmationAddress;
  items: OrderConfirmationItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
};

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function fmt(cents: number): string {
  return COP.format(cents / 100);
}

/**
 * Plantilla React Email para confirmación de pedido.
 *
 * Reglas de compatibilidad Gmail + Outlook:
 * - Solo tablas + estilos inline (los componentes de @react-email lo hacen).
 * - Sin fuentes web ni background-image ni flex/grid — se rinde raro en Outlook.
 * - Preview text para el snippet del inbox.
 * - Un solo container centrado con max-width 600px.
 */
export default function OrderConfirmation(props: OrderConfirmationProps) {
  const {
    orderShortId,
    orderUrl,
    customerName,
    address,
    items,
    subtotalCents,
    shippingCents,
    totalCents,
  } = props;

  return (
    <Html lang="es">
      <Head />
      <Preview>Recibimos tu pedido #{orderShortId} — te contactamos por WhatsApp</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brand}>VIANSTORE SNEAKERS</Text>
            <Text style={styles.tagline}>@vianstore14 · premium shoes</Text>
          </Section>

          <Section style={styles.mainSection}>
            <Heading as="h1" style={styles.h1}>
              ¡Recibimos tu pedido!
            </Heading>
            <Text style={styles.p}>Hola {customerName || "cliente"},</Text>
            <Text style={styles.p}>
              Tu pedido <strong>#{orderShortId}</strong> quedó registrado y en{" "}
              <strong>pendiente de pago</strong>. En breve te escribimos por WhatsApp con los
              datos de la cuenta para transferir. Al recibir el pago confirmamos el envío.
            </Text>

            <Section style={styles.card}>
              <Text style={styles.eyebrow}>DIRECCIÓN DE ENVÍO</Text>
              <Text style={styles.addressLine}>
                <strong>{address.fullName}</strong>
              </Text>
              <Text style={styles.addressLine}>
                {address.line1}
                {address.line2 ? ` · ${address.line2}` : ""}
              </Text>
              <Text style={styles.addressLine}>
                {address.city}, {address.state}
                {address.postalCode ? ` · ${address.postalCode}` : ""} · {address.country}
              </Text>
              <Text style={styles.addressLineDim}>Tel: {address.phone}</Text>
            </Section>

            <Section style={styles.card}>
              <Text style={styles.eyebrow}>ÍTEMS</Text>
              {items.map((it) => (
                <Section key={it.skuCode} style={styles.itemRow}>
                  <Text style={styles.itemName}>{it.productName}</Text>
                  <Text style={styles.itemMeta}>
                    {it.colorName} · Talla {it.sizeLabel} · {it.skuCode}
                  </Text>
                  <Text style={styles.itemLine}>
                    <span>×{it.qty}</span>{" "}
                    <span style={styles.itemPrice}>{fmt(it.subtotalCents)}</span>
                  </Text>
                </Section>
              ))}
            </Section>

            <Section style={styles.totals}>
              <Row label="Subtotal" value={fmt(subtotalCents)} />
              <Row
                label="Envío"
                value={shippingCents === 0 ? "Gratis" : fmt(shippingCents)}
              />
              <Hr style={styles.hr} />
              <Row label="Total" value={fmt(totalCents)} bold />
            </Section>

            <Section style={{ textAlign: "center", marginTop: "24px" }}>
              <Link href={orderUrl} style={styles.button}>
                Ver mi pedido
              </Link>
            </Section>

            <Text style={styles.footerNote}>
              ¿Alguna duda? Respóndenos este correo o escríbenos por Instagram{" "}
              <Link href="https://www.instagram.com/vianstore14" style={styles.link}>
                @vianstore14
              </Link>
              .
            </Text>
          </Section>

          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              © {new Date().getFullYear()} VS Sneakers · vianstore14
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <Text style={bold ? styles.totalsRowBold : styles.totalsRow}>
      <span>{label}</span> <span style={{ float: "right" }}>{value}</span>
    </Text>
  );
}

// Props por defecto — solo para el preview local con `react-email dev`. En
// producción el bundler puede tree-shake esta asignación gracias al guard.
if (process.env.NODE_ENV !== "production") {
  OrderConfirmation.PreviewProps = {
  orderShortId: "abcdef12",
  orderUrl: "https://vianstore.example/checkout/success/abcdef12-1234",
  customerName: "María",
  address: {
    fullName: "María Gómez",
    phone: "+57 300 123 4567",
    line1: "Calle 10 # 5-20",
    line2: "Apto 302",
    city: "Medellín",
    state: "Antioquia",
    postalCode: "050001",
    country: "CO",
  },
  items: [
    {
      productName: "Nike Air Force 1 Low",
      colorName: "Negro",
      sizeLabel: "40",
      skuCode: "NIK-AF1-BLK-40",
      qty: 1,
      subtotalCents: 55000000,
    },
    {
      productName: "Adidas Samba OG",
      colorName: "Blanco",
      sizeLabel: "39",
      skuCode: "ADI-SMB-WHT-39",
      qty: 2,
      subtotalCents: 98000000,
    },
  ],
    subtotalCents: 153000000,
    shippingCents: 0,
    totalCents: 153000000,
  } satisfies OrderConfirmationProps;
}

const styles = {
  body: {
    backgroundColor: "#f5f5f5",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    margin: 0,
    padding: 0,
  },
  container: {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    maxWidth: "600px",
    padding: 0,
  },
  header: {
    backgroundColor: "#0a0a0a",
    color: "#ffffff",
    padding: "24px 32px",
    textAlign: "center" as const,
  },
  brand: {
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: 900 as const,
    letterSpacing: "2px",
    margin: 0,
  },
  tagline: {
    color: "#a3a3a3",
    fontSize: "10px",
    fontWeight: 700 as const,
    letterSpacing: "3px",
    margin: "4px 0 0 0",
    textTransform: "uppercase" as const,
  },
  mainSection: {
    padding: "32px",
  },
  h1: {
    color: "#0a0a0a",
    fontSize: "24px",
    fontWeight: 900 as const,
    margin: "0 0 16px 0",
  },
  p: {
    color: "#404040",
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0 0 12px 0",
  },
  eyebrow: {
    color: "#737373",
    fontSize: "10px",
    fontWeight: 900 as const,
    letterSpacing: "2px",
    margin: "0 0 8px 0",
  },
  card: {
    backgroundColor: "#fafafa",
    border: "1px solid #e5e5e5",
    borderRadius: "8px",
    marginTop: "16px",
    padding: "16px",
  },
  addressLine: {
    color: "#0a0a0a",
    fontSize: "14px",
    lineHeight: "20px",
    margin: 0,
  },
  addressLineDim: {
    color: "#737373",
    fontSize: "12px",
    lineHeight: "18px",
    margin: "4px 0 0 0",
  },
  itemRow: {
    borderTop: "1px solid #e5e5e5",
    paddingTop: "12px",
    marginTop: "12px",
  },
  itemName: {
    color: "#0a0a0a",
    fontSize: "14px",
    fontWeight: 700 as const,
    margin: 0,
  },
  itemMeta: {
    color: "#737373",
    fontSize: "11px",
    margin: "4px 0 4px 0",
  },
  itemLine: {
    color: "#404040",
    fontSize: "13px",
    margin: 0,
  },
  itemPrice: {
    color: "#0a0a0a",
    fontFamily: "monospace",
    fontWeight: 700 as const,
    marginLeft: "8px",
  },
  totals: {
    marginTop: "20px",
  },
  totalsRow: {
    color: "#404040",
    fontSize: "14px",
    margin: "6px 0",
  },
  totalsRowBold: {
    color: "#0a0a0a",
    fontSize: "16px",
    fontWeight: 900 as const,
    margin: "8px 0",
  },
  hr: {
    borderColor: "#e5e5e5",
    margin: "8px 0",
  },
  button: {
    backgroundColor: "#0a0a0a",
    borderRadius: "8px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "12px",
    fontWeight: 900 as const,
    letterSpacing: "2px",
    padding: "12px 24px",
    textDecoration: "none",
    textTransform: "uppercase" as const,
  },
  link: {
    color: "#b45309",
    textDecoration: "underline",
  },
  footerNote: {
    color: "#737373",
    fontSize: "12px",
    lineHeight: "18px",
    marginTop: "24px",
    textAlign: "center" as const,
  },
  footer: {
    backgroundColor: "#f5f5f5",
    padding: "16px 32px",
    textAlign: "center" as const,
  },
  footerText: {
    color: "#a3a3a3",
    fontSize: "11px",
    margin: 0,
  },
};

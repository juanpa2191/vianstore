import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type OrderShippedProps = {
  orderShortId: string;
  orderUrl: string;
  customerName: string;
  /** null si el carrier es "otro" o desconocido — el body evita la placa "con Otra transportadora". */
  carrierName: string | null;
  trackingCode: string;
  trackingUrl: string | null;
};

export default function OrderShipped(props: OrderShippedProps) {
  const { orderShortId, orderUrl, customerName, carrierName, trackingCode, trackingUrl } =
    props;

  return (
    <Html lang="es">
      <Head />
      <Preview>
        {carrierName
          ? `Tu pedido #${orderShortId} está en camino con ${carrierName} · guía ${trackingCode}`
          : `Tu pedido #${orderShortId} está en camino · guía ${trackingCode}`}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brand}>VIANSTORE SNEAKERS</Text>
            <Text style={styles.tagline}>@vianstore14 · premium shoes</Text>
          </Section>

          <Section style={styles.mainSection}>
            <Heading as="h1" style={styles.h1}>
              ¡Tu pedido está en camino! 🚚
            </Heading>
            <Text style={styles.p}>Hola {customerName || "cliente"},</Text>
            <Text style={styles.p}>
              Ya despachamos tu pedido <strong>#{orderShortId}</strong>
              {carrierName ? (
                <>
                  {" "}con <strong>{carrierName}</strong>
                </>
              ) : null}
              . Usa el número de guía para rastrearlo hasta la puerta de tu casa.
            </Text>

            <Section style={styles.card}>
              <Text style={styles.eyebrow}>NÚMERO DE GUÍA</Text>
              <Text style={styles.guia}>{trackingCode}</Text>
              {carrierName && <Text style={styles.eyebrowSmall}>{carrierName}</Text>}
            </Section>

            {trackingUrl && (
              <Section style={{ textAlign: "center", marginTop: "24px" }}>
                <Link href={trackingUrl} style={styles.buttonPrimary}>
                  {carrierName ? `Rastrear en ${carrierName}` : "Rastrear envío"}
                </Link>
              </Section>
            )}

            <Section style={{ textAlign: "center", marginTop: trackingUrl ? "12px" : "24px" }}>
              <Link href={orderUrl} style={styles.buttonSecondary}>
                Ver mi pedido
              </Link>
            </Section>

            <Text style={styles.footerNote}>
              ¿Alguna duda? Responde este correo o escríbenos por Instagram{" "}
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

if (process.env.NODE_ENV !== "production") {
  OrderShipped.PreviewProps = {
    orderShortId: "abcdef12",
    orderUrl: "https://vianstore.example/account/orders/abcdef12-1234",
    customerName: "María",
    carrierName: "Servientrega",
    trackingCode: "SE1234567890",
    trackingUrl: "https://www.servientrega.com/wps/portal/rastreo-envio?guia=SE1234567890",
  } satisfies OrderShippedProps;
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
    fontSize: "22px",
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
    margin: "0 0 6px 0",
  },
  eyebrowSmall: {
    color: "#737373",
    fontSize: "11px",
    fontWeight: 700 as const,
    margin: "6px 0 0 0",
  },
  guia: {
    color: "#0a0a0a",
    fontFamily: "monospace",
    fontSize: "22px",
    fontWeight: 900 as const,
    letterSpacing: "2px",
    margin: 0,
  },
  card: {
    backgroundColor: "#eef2ff",
    border: "1px solid #c7d2fe",
    borderRadius: "8px",
    marginTop: "16px",
    padding: "16px",
    textAlign: "center" as const,
  },
  buttonPrimary: {
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
  buttonSecondary: {
    color: "#0a0a0a",
    display: "inline-block",
    fontSize: "12px",
    fontWeight: 700 as const,
    padding: "8px 12px",
    textDecoration: "underline",
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

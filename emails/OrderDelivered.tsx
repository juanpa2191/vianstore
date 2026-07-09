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

export type OrderDeliveredProps = {
  orderShortId: string;
  catalogUrl: string;
  customerName: string;
};

export default function OrderDelivered(props: OrderDeliveredProps) {
  const { orderShortId, catalogUrl, customerName } = props;

  return (
    <Html lang="es">
      <Head />
      <Preview>Tu pedido #{orderShortId} fue entregado. ¡Gracias por elegir VianStore!</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.brand}>VIANSTORE SNEAKERS</Text>
            <Text style={styles.tagline}>@vianstore14 · premium shoes</Text>
          </Section>

          <Section style={styles.mainSection}>
            <Heading as="h1" style={styles.h1}>
              ¡Ya lo tienes! 🎉
            </Heading>
            <Text style={styles.p}>Hola {customerName || "cliente"},</Text>
            <Text style={styles.p}>
              Tu pedido <strong>#{orderShortId}</strong> fue entregado. Esperamos que los sneakers
              te queden perfectos y disfrutes cada paso.
            </Text>
            <Text style={styles.p}>
              Si algo no está como esperabas, escríbenos por Instagram — te ayudamos con cambios
              de talla en los primeros 15 días calendario.
            </Text>

            <Section style={{ textAlign: "center", marginTop: "24px" }}>
              <Link href={catalogUrl} style={styles.button}>
                Ver más sneakers
              </Link>
            </Section>

            <Text style={styles.footerNote}>
              Gracias por confiar en nosotros.{" "}
              <Link href="https://www.instagram.com/vianstore14" style={styles.link}>
                Síguenos en @vianstore14
              </Link>{" "}
              para promos y drops nuevos.
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
  OrderDelivered.PreviewProps = {
    orderShortId: "abcdef12",
    catalogUrl: "https://vianstore.example/products",
    customerName: "María",
  } satisfies OrderDeliveredProps;
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

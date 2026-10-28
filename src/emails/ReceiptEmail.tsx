import { Fragment, type CSSProperties } from "react";
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

export type ReceiptItem = {
  name: string;
  variantName?: string | null;
  quantity: number;
  price: string;
};

export type ReceiptEmailProps = {
  orderId: string;
  items: ReceiptItem[];
  totalAmount: string;
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

function formatCurrency(value: string | number) {
  const amount = typeof value === "string" ? Number(value) : value;

  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export default function ReceiptEmail({
  orderId,
  items,
  totalAmount,
}: ReceiptEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your receipt for order {orderId}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Order receipt</Heading>
          <Text style={subheading}>
            Thanks for your order. Here is what you purchased.
          </Text>

          <Section style={orderBox}>
            <Text style={label}>Order</Text>
            <Text style={orderValue}>{orderId}</Text>
          </Section>

          <Row style={tableHeader}>
            <Column style={itemColumn}>
              <Text style={tableHeaderText}>Item</Text>
            </Column>
            <Column style={amountColumn}>
              <Text style={{ ...tableHeaderText, textAlign: "right" }}>
                Amount
              </Text>
            </Column>
          </Row>
          <Hr style={hr} />

          {items.map((item, index) => (
            <Fragment key={`${item.name}-${item.variantName ?? ""}-${index}`}>
              <Row>
                <Column style={itemColumn}>
                  <Text style={itemName}>{item.name}</Text>
                  {item.variantName ? (
                    <Text style={variantName}>{item.variantName}</Text>
                  ) : null}
                  <Text style={itemMeta}>
                    {item.quantity} × {formatCurrency(item.price)}
                  </Text>
                </Column>
                <Column style={amountColumn}>
                  <Text style={lineTotal}>
                    {formatCurrency(Number(item.price) * item.quantity)}
                  </Text>
                </Column>
              </Row>
              {index < items.length - 1 ? <Hr style={hr} /> : null}
            </Fragment>
          ))}

          <Hr style={totalHr} />
          <Row>
            <Column>
              <Text style={totalLabel}>Total paid</Text>
            </Column>
            <Column style={amountColumn}>
              <Text style={totalValue}>{formatCurrency(totalAmount)}</Text>
            </Column>
          </Row>

          <Text style={footer}>
            If you have any questions about this order, reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const body: CSSProperties = {
  backgroundColor: "#f6f7f9",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "32px 16px",
};

const container: CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  margin: "0 auto",
  maxWidth: "600px",
  padding: "32px",
};

const heading: CSSProperties = {
  color: "#111827",
  fontSize: "24px",
  fontWeight: 600,
  margin: "0 0 8px",
};

const subheading: CSSProperties = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 24px",
};

const orderBox: CSSProperties = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  marginBottom: "24px",
  padding: "14px 16px",
};

const label: CSSProperties = {
  color: "#6b7280",
  fontSize: "11px",
  letterSpacing: "0.06em",
  margin: "0 0 4px",
  textTransform: "uppercase",
};

const orderValue: CSSProperties = {
  color: "#111827",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: "13px",
  margin: 0,
  wordBreak: "break-all",
};

const tableHeader: CSSProperties = {
  width: "100%",
};

const tableHeaderText: CSSProperties = {
  color: "#6b7280",
  fontSize: "11px",
  letterSpacing: "0.06em",
  margin: 0,
  textTransform: "uppercase",
};

const itemColumn: CSSProperties = {
  verticalAlign: "top",
  width: "72%",
};

const amountColumn: CSSProperties = {
  textAlign: "right",
  verticalAlign: "top",
  width: "28%",
};

const hr: CSSProperties = {
  borderColor: "#e5e7eb",
  margin: "12px 0",
};

const totalHr: CSSProperties = {
  borderColor: "#111827",
  margin: "16px 0 12px",
};

const itemName: CSSProperties = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: "20px",
  margin: "0 0 2px",
};

const variantName: CSSProperties = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "18px",
  margin: "0 0 2px",
};

const itemMeta: CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "18px",
  margin: 0,
};

const lineTotal: CSSProperties = {
  color: "#111827",
  fontSize: "14px",
  lineHeight: "20px",
  margin: 0,
};

const totalLabel: CSSProperties = {
  color: "#111827",
  fontSize: "15px",
  fontWeight: 600,
  margin: 0,
};

const totalValue: CSSProperties = {
  color: "#111827",
  fontSize: "18px",
  fontWeight: 700,
  margin: 0,
};

const footer: CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "28px 0 0",
};

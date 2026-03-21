import { Card, Col, Row, Statistic } from "antd";

interface MetricItem {
  title: string;
  value: number;
  suffix?: string;
}

export function StatCards({ items }: { items: MetricItem[] }) {
  return (
    <Row gutter={[16, 16]}>
      {items.map((item) => (
        <Col xs={24} sm={12} xl={6} key={item.title}>
          <Card className="soft-card stat-card">
            <Statistic title={item.title} value={item.value} suffix={item.suffix} />
          </Card>
        </Col>
      ))}
    </Row>
  );
}


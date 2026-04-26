import { ExclamationCircleOutlined } from "@ant-design/icons";
import { Button, Modal, Space, Typography } from "antd";

interface ConfirmRemoveProps {
  open: boolean;
  title: string;
  desc: string;
  loading?: boolean;
  onCancel: () => void;
  onOk: () => void;
}

export function ConfirmRemove(props: ConfirmRemoveProps) {
  return (
    <Modal open={props.open} onCancel={props.onCancel} footer={null} centered width={480} destroyOnHidden>
      <div className="danger-sheet">
        <div className="danger-icon">
          <ExclamationCircleOutlined />
        </div>
        <Typography.Title level={4}>{props.title}</Typography.Title>
        <Typography.Paragraph>{props.desc}</Typography.Paragraph>
        <Typography.Paragraph className="danger-tip">删除后会立即生效，且无法直接恢复，请再次确认。</Typography.Paragraph>
        <Space size={12}>
          <Button onClick={props.onCancel}>先取消</Button>
          <Button danger type="primary" loading={props.loading} onClick={props.onOk}>
            确认删除
          </Button>
        </Space>
      </div>
    </Modal>
  );
}

import { Button, Result } from "antd";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorFallback extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(_: Error, __: ErrorInfo) {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-shell">
          <Result
            status="error"
            title="页面暂时无法展示"
            subTitle="你可以刷新页面再试一次，我们已经拦住了这次异常。"
            extra={
              <Button type="primary" onClick={() => window.location.reload()}>
                重新载入
              </Button>
            }
          />
        </div>
      );
    }
    return this.props.children;
  }
}

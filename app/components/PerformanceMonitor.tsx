'use client';
import { useEffect, useState } from 'react';
import { Button, Card, Statistic, Row, Col, Alert } from 'antd';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  messageCount: number;
  lastUpdate: number;
}

interface PerformanceMonitorProps {
  messageCount: number;
  onOptimize?: () => void;
  showDetails?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  messageCount,
  onOptimize,
  showDetails = false
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    messageCount: 0,
    lastUpdate: Date.now()
  });
  
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const measurePerformance = () => {
      const startTime = performance.now();
      
      // Measure memory usage if available
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo ? memoryInfo.usedJSHeapSize / 1024 / 1024 : 0;
      
      // Simulate render time measurement
      requestAnimationFrame(() => {
        const renderTime = performance.now() - startTime;
        
        setMetrics({
          renderTime: Math.round(renderTime * 100) / 100,
          memoryUsage: Math.round(memoryUsage * 100) / 100,
          messageCount,
          lastUpdate: Date.now()
        });

        // Show warning if performance is poor
        if (renderTime > 100 || memoryUsage > 100 || messageCount > 200) {
          setShowWarning(true);
        } else {
          setShowWarning(false);
        }
      });
    };

    measurePerformance();
    
    // Update metrics every 5 seconds
    const interval = setInterval(measurePerformance, 5000);
    
    return () => clearInterval(interval);
  }, [messageCount]);

  const getPerformanceStatus = () => {
    if (metrics.renderTime > 100 || metrics.memoryUsage > 100) {
      return { status: 'error', text: '性能较差' };
    } else if (metrics.renderTime > 50 || metrics.memoryUsage > 50) {
      return { status: 'warning', text: '性能一般' };
    } else {
      return { status: 'success', text: '性能良好' };
    }
  };

  const performanceStatus = getPerformanceStatus();

  if (!showDetails && !showWarning) {
    return null;
  }

  return (
    <div style={{ margin: '16px 0' }}>
      {showWarning && (
        <Alert
          message="性能提醒"
          description={
            <div>
              <p>检测到性能问题，建议采取以下优化措施：</p>
              <ul>
                <li>消息数量过多时启用虚拟化滚动</li>
                <li>清理不必要的聊天记录</li>
                <li>关闭不需要的功能</li>
              </ul>
              {onOptimize && (
                <Button type="primary" size="small" onClick={onOptimize}>
                  自动优化
                </Button>
              )}
            </div>
          }
          type="warning"
          showIcon
          closable
          onClose={() => setShowWarning(false)}
          style={{ marginBottom: '16px' }}
        />
      )}

      {showDetails && (
        <Card title="性能监控" size="small">
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="渲染时间"
                value={metrics.renderTime}
                suffix="ms"
                valueStyle={{ 
                  color: metrics.renderTime > 100 ? '#cf1322' : 
                         metrics.renderTime > 50 ? '#d48806' : '#3f8600' 
                }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="内存使用"
                value={metrics.memoryUsage}
                suffix="MB"
                valueStyle={{ 
                  color: metrics.memoryUsage > 100 ? '#cf1322' : 
                         metrics.memoryUsage > 50 ? '#d48806' : '#3f8600' 
                }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="消息数量"
                value={metrics.messageCount}
                valueStyle={{ 
                  color: metrics.messageCount > 200 ? '#cf1322' : 
                         metrics.messageCount > 100 ? '#d48806' : '#3f8600' 
                }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="性能状态"
                value={performanceStatus.text}
                valueStyle={{ 
                  color: performanceStatus.status === 'error' ? '#cf1322' : 
                         performanceStatus.status === 'warning' ? '#d48806' : '#3f8600' 
                }}
              />
            </Col>
          </Row>
          
          <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
            最后更新: {new Date(metrics.lastUpdate).toLocaleTimeString()}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PerformanceMonitor;

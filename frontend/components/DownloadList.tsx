import { Download } from '@/types';
import { Button, Card, Tag, Space, Tooltip, Typography, Progress, Row, Col } from 'antd';
import { 
  CloudDownloadOutlined, 
  LinkOutlined, 
  PlayCircleOutlined, 
  VideoCameraOutlined, 
  DownloadOutlined, 
  FileOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  SyncOutlined, 
  ReloadOutlined,
  ClockCircleOutlined 
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface DownloadListProps {
  downloads: Download[];
}

export function DownloadList({ downloads }: DownloadListProps) {
  if (downloads.length === 0) {
    return (
      <div className="text-center p-12 bg-gray-50 rounded-lg border border-gray-200">
        <VideoCameraOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
        <Title level={4} style={{ marginTop: 16 }}>У вас пока нет загрузок</Title>
        <Text type="secondary">Загрузите свое первое видео, чтобы оно появилось здесь</Text>
      </div>
    );
  }

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'completed':
        return <Tag color="success" icon={<CheckCircleOutlined />}>Завершено</Tag>;
      case 'failed':
        return <Tag color="error" icon={<CloseCircleOutlined />}>Ошибка</Tag>;
      case 'processing':
        return <Tag color="processing" icon={<SyncOutlined spin />}>Обработка</Tag>;
      case 'pending':
        return <Tag color="warning" icon={<ClockCircleOutlined />}>Ожидание</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const getProgressPercent = (status: string) => {
    switch (status) {
      case 'completed':
        return 100;
      case 'failed':
        return 100;
      case 'processing':
        return 60;
      case 'pending':
        return 30;
      default:
        return 0;
    }
  };

  const getProgressStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'exception';
      case 'processing':
        return 'active';
      case 'pending':
        return 'active';
      default:
        return 'normal';
    }
  };

  const getFileSize = (size: number) => {
    if (!size) return 'Неизвестно';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let fileSize = size;
    let unitIndex = 0;
    
    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }
    
    return `${fileSize.toFixed(2)} ${units[unitIndex]}`;
  };

  const getDownloadUrl = (download: Download) => {
    return download.file_path ? `/api/v1/downloads/file/${download.file_path}` : '#';
  }

  return (
    <div className="space-y-6">
      {downloads.map((download) => (
        <Card 
          key={download.id}
          hoverable
          className="overflow-hidden"
          bodyStyle={{ padding: '16px' }}
        >
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={16}>
              <div className="flex items-start">
                <div className="mr-4 flex-shrink-0">
                  {download.status === 'completed' ? (
                    <div className="w-16 h-16 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                      <FileOutlined style={{ fontSize: 24 }} />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                      <PlayCircleOutlined style={{ fontSize: 24 }} />
                    </div>
                  )}
                </div>
                <div className="flex-grow">
                  <Title level={5} ellipsis={{ tooltip: download.title }}>
                    {download.title || 'Безымянное видео'}
                  </Title>
                  <div className="flex items-center mb-2">
                    <Text type="secondary" className="mr-2">
                      <LinkOutlined /> {download.url ? (
                        <Tooltip title={download.url}>
                          {download.url.substring(0, 40)}...
                        </Tooltip>
                      ) : 'Н/Д'}
                    </Text>
                  </div>
                  <Space className="mb-1">
                    {getStatusTag(download.status)}
                    <Text type="secondary" className="text-xs">{new Date(download.created_at).toLocaleString()}</Text>
                    <Text type="secondary" className="text-xs">
                      Формат: <Tag color="blue">{download.format || 'MP4'}</Tag>
                    </Text>
                    {download.resolution && (
                      <Text type="secondary" className="text-xs">
                        Разрешение: <Tag color="purple">{download.resolution}</Tag>
                      </Text>
                    )}
                  </Space>
                  
                  {download.status === 'processing' || download.status === 'pending' ? (
                    <Progress 
                      percent={getProgressPercent(download.status)} 
                      status={getProgressStatus(download.status) as "success" | "exception" | "active" | "normal"} 
                      size="small" 
                      style={{ marginTop: '8px' }}
                    />
                  ) : null}
                  
                  {download.status === 'failed' && (
                    <div className="mt-2">
                      <Text type="danger">
                        Произошла ошибка при загрузке. Попробуйте еще раз или обратитесь в поддержку.
                      </Text>
                    </div>
                  )}
                </div>
              </div>
            </Col>
            <Col xs={24} md={8} className="flex justify-end items-center">
              <Space>
                {download.status === 'completed' && (
                  <Tooltip title="Скачать файл">
                    <Button 
                      type="primary" 
                      icon={<DownloadOutlined />} 
                      href={getDownloadUrl(download)}
                      target="_blank"
                    >
                      Скачать
                    </Button>
                  </Tooltip>
                )}
                {download.status === 'completed' && (
                  <Tooltip title="Конвертировать в другой формат">
                    <Button icon={<SyncOutlined />}>Конвертировать</Button>
                  </Tooltip>
                )}
                {download.status === 'failed' && (
                  <Button type="dashed" icon={<ReloadOutlined />}>Повторить</Button>
                )}
              </Space>
            </Col>
          </Row>
        </Card>
      ))}
    </div>
  );
} 
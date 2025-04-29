import React, { useState, useEffect } from 'react';
import { downloadsAPI } from '@/lib/api';
import { 
  Typography, 
  Card, 
  Button, 
  Table, 
  Tag, 
  Space, 
  Popconfirm, 
  message,
  Empty,
  Spin,
  Tooltip
} from 'antd';
import { 
  DownloadOutlined, 
  DeleteOutlined, 
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  LoginOutlined
} from '@ant-design/icons';
import NavBar from '@/components/NavBar';
import { VideoDownloadForm } from '@/components/video-download-form';
import { useAuth } from '@/contexts/AuthContext';
import Head from 'next/head';

const { Title, Paragraph } = Typography;

interface Download {
  id: string;
  title: string;
  url: string;
  thumbnail?: string;
  status: 'completed' | 'in_progress' | 'queued' | 'error' | 'paused';
  progress: number;
  size?: string;
  format: string;
  created_at: string;
  error_message?: string;
}

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    // Загружаем историю только если пользователь аутентифицирован
    if (isAuthenticated() && user) {
      fetchDownloads();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const fetchDownloads = async () => {
    try {
      setLoading(true);
      const response = await downloadsAPI.getAllDownloads();
      setDownloads(response.downloads);
      setError('');
    } catch (err) {
      console.error('Failed to fetch downloads:', err);
      setError('Не удалось загрузить список загрузок');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDownload = async (id: string) => {
    try {
      await downloadsAPI.deleteDownload(id);
      message.success('Загрузка удалена');
      setDownloads(downloads.filter(download => download.id !== id));
    } catch (err) {
      console.error('Failed to delete download:', err);
      message.error('Не удалось удалить загрузку');
    }
  };

  const handleRetryDownload = async (id: string) => {
    try {
      await downloadsAPI.retryDownload(id);
      message.success('Загрузка перезапущена');
      fetchDownloads();
    } catch (err) {
      console.error('Failed to retry download:', err);
      message.error('Не удалось перезапустить загрузку');
    }
  };

  const handlePauseDownload = async (id: string) => {
    try {
      await downloadsAPI.pauseDownload(id);
      message.success('Загрузка приостановлена');
      fetchDownloads();
    } catch (err) {
      console.error('Failed to pause download:', err);
      message.error('Не удалось приостановить загрузку');
    }
  };

  const handleResumeDownload = async (id: string) => {
    try {
      await downloadsAPI.resumeDownload(id);
      message.success('Загрузка возобновлена');
      fetchDownloads();
    } catch (err) {
      console.error('Failed to resume download:', err);
      message.error('Не удалось возобновить загрузку');
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'completed':
        return <Tag icon={<CheckCircleOutlined />} color="success">Завершено</Tag>;
      case 'in_progress':
        return <Tag icon={<Spin size="small" />} color="processing">В процессе</Tag>;
      case 'queued':
        return <Tag icon={<ClockCircleOutlined />} color="default">В очереди</Tag>;
      case 'error':
        return <Tag icon={<ExclamationCircleOutlined />} color="error">Ошибка</Tag>;
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Видео',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: Download) => (
        <div className="flex items-center">
          {record.thumbnail && (
            <img 
              src={record.thumbnail} 
              alt={text} 
              className="w-16 h-auto mr-3 rounded"
              style={{ objectFit: 'cover' }}
            />
          )}
          <div>
            <div className="font-medium">{text}</div>
            <div className="text-xs text-gray-500 truncate max-w-xs">
              {record.url}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: Download) => (
        <div>
          {getStatusTag(status)}
          {status === 'in_progress' && (
            <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${record.progress}%` }}
              />
            </div>
          )}
          {status === 'error' && record.error_message && (
            <Tooltip title={record.error_message}>
              <div className="text-xs text-red-500 mt-1 cursor-help">
                Ошибка: {record.error_message.substring(0, 30)}...
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      title: 'Формат',
      dataIndex: 'format',
      key: 'format',
      render: (format: string) => <Tag>{format.toUpperCase()}</Tag>,
    },
    {
      title: 'Размер',
      dataIndex: 'size',
      key: 'size',
      render: (size?: string) => size || 'N/A',
    },
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Download) => (
        <Space size="middle">
          {record.status === 'completed' && (
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              size="small"
              onClick={() => window.open(`/api/downloads/${record.id}/file`, '_blank')}
            >
              Скачать
            </Button>
          )}
          
          {record.status === 'in_progress' && (
            <Button 
              icon={<PauseCircleOutlined />} 
              size="small"
              onClick={() => handlePauseDownload(record.id)}
            >
              Пауза
            </Button>
          )}
          
          {(record.status === 'queued' || record.status === 'paused') && (
            <Button 
              icon={<PlayCircleOutlined />} 
              size="small"
              onClick={() => handleResumeDownload(record.id)}
            >
              Возобновить
            </Button>
          )}
          
          {record.status === 'error' && (
            <Button 
              icon={<PlayCircleOutlined />} 
              size="small"
              onClick={() => handleRetryDownload(record.id)}
            >
              Повторить
            </Button>
          )}
          
          <Popconfirm
            title="Уверены, что хотите удалить эту загрузку?"
            onConfirm={() => handleDeleteDownload(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              size="small"
            >
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Head>
        <title>Мои загрузки | UniversalTools</title>
        <link rel="icon" href="/icons/favicon.svg" />
      </Head>
      <NavBar />
      <div className="flex min-h-screen flex-col items-center">
        <div className="container mx-auto px-4 py-8">
          <Title level={2}>Мои загрузки</Title>
          
          {/* Форма загрузки видео для всех пользователей */}
          <Card className="mb-6">
            <Title level={4} className="mb-4">Скачать видео</Title>
            <VideoDownloadForm />
          </Card>
          
          {/* История загрузок только для авторизованных пользователей */}
          {isAuthenticated() ? (
            <Card className="mt-6">
              <Title level={4} className="mb-4">История загрузок</Title>
              <Paragraph className="mb-6">
                Здесь отображаются все ваши загрузки. Вы можете скачать готовые файлы или проверить статус текущих загрузок.
              </Paragraph>
              
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Spin size="large" />
                </div>
              ) : error ? (
                <div className="py-12">
                  <Empty
                    description={
                      <span className="text-red-500">{error}</span>
                    }
                  />
                </div>
              ) : downloads.length === 0 ? (
                <Empty description="У вас пока нет загрузок" />
              ) : (
                <Table 
                  dataSource={downloads} 
                  columns={columns} 
                  rowKey="id"
                  pagination={{ 
                    pageSize: 10,
                    showSizeChanger: true,
                    pageSizeOptions: ['10', '20', '50'],
                  }}
                />
              )}
            </Card>
          ) : (
            <Card className="mt-6 text-center">
              <Title level={4} className="mb-4">История загрузок</Title>
              <Paragraph>
                Для просмотра истории загрузок и сохранения ваших скачанных файлов, пожалуйста, авторизуйтесь.
              </Paragraph>
              <Button 
                type="primary" 
                icon={<LoginOutlined />}
                onClick={() => window.location.href = '/login'}
                className="mt-4"
              >
                Войти в аккаунт
              </Button>
            </Card>
          )}
          
          <Card className="mt-8 bg-gray-50">
            <Title level={4} className="mb-4">Управление загрузками</Title>
            <Paragraph>
              Вы можете управлять своими загрузками, приостанавливать и возобновлять их. 
              Файлы хранятся на нашем сервере в течение 7 дней после загрузки, после чего они автоматически удаляются.
            </Paragraph>
            <Paragraph className="mb-0">
              Для более продолжительного хранения и других преимуществ, рассмотрите возможность перехода на премиум-подписку.
            </Paragraph>
          </Card>
        </div>
      </div>
    </>
  );
} 
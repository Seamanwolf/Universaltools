'use client';

import React, { useState, useEffect } from 'react';
import type { Key } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, DatePicker, Space, Typography, Tabs, Statistic, Row, Col, Badge, Progress, Tooltip, message } from 'antd';
import type { TableProps } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ExclamationCircleOutlined, 
  DownloadOutlined, 
  UserOutlined,
  YoutubeOutlined,
  HistoryOutlined,
  LineChartOutlined,
  SearchOutlined,
  DeleteOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { downloadsAPI } from '@/lib/api';

const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { confirm } = Modal;
const { TextArea } = Input;

interface Download {
  id: string;
  userId: number;
  userName: string;
  source: 'youtube' | 'vimeo' | 'instagram' | 'tiktok' | 'other';
  url: string;
  title: string;
  format: string;
  resolution: string;
  status: 'completed' | 'processing' | 'failed' | 'queued';
  progress: number;
  size: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
  filePath?: string;
}

interface DownloadStats {
  totalDownloads: number;
  completedDownloads: number;
  failedDownloads: number;
  totalSize: number;
  popularSource: string;
}

// Моковые данные для загрузок
const generateMockDownloads = (count: number): Download[] => {
  const sources: Array<Download['source']> = ['youtube', 'vimeo', 'instagram', 'tiktok', 'other'];
  const statuses: Array<Download['status']> = ['completed', 'processing', 'failed', 'queued'];
  const formats = ['mp4', 'mp3', 'avi', 'mkv', 'flv', 'webm'];
  const resolutions = ['360p', '480p', '720p', '1080p', '1440p', '2160p'];
  
  const titles = [
    'Как приготовить идеальный стейк',
    'Топ 10 туристических мест в мире',
    'Обзор новой модели Tesla',
    'Уроки игры на гитаре для начинающих',
    'Смешные моменты с животными',
    'Как научиться программировать за 30 дней',
    'Лучшие фильмы 2023 года',
    'Тренировка для похудения',
    'Обзор нового iPhone',
    'История зарождения интернета'
  ];
  
  return Array.from({ length: count }, (_, i) => {
    const userId = 1000 + Math.floor(Math.random() * 100);
    const source = sources[Math.floor(Math.random() * sources.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const progress = status === 'completed' ? 100 : status === 'failed' ? Math.floor(Math.random() * 70) : Math.floor(Math.random() * 95);
    
    const createdDate = new Date();
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30));
    
    let completedDate = null;
    if (status === 'completed' || status === 'failed') {
      completedDate = new Date(createdDate);
      completedDate.setMinutes(completedDate.getMinutes() + Math.floor(Math.random() * 60));
    }
    
    const size = status === 'completed' ? Math.floor(Math.random() * 1000) * 1024 * 1024 : 0; // Размер в байтах
    const title = titles[Math.floor(Math.random() * titles.length)];
    const format = formats[Math.floor(Math.random() * formats.length)];
    const resolution = format === 'mp3' ? '' : resolutions[Math.floor(Math.random() * resolutions.length)];
    
    return {
      id: `DL-${10000 + i}`,
      userId,
      userName: `user${userId}`,
      source,
      url: `https://${source}.com/watch?v=${Math.random().toString(36).substring(2, 12)}`,
      title,
      format,
      resolution,
      status,
      progress,
      size,
      createdAt: createdDate.toISOString(),
      completedAt: completedDate ? completedDate.toISOString() : undefined,
      errorMessage: status === 'failed' ? 'Невозможно получить доступ к видео или видео было удалено' : undefined,
      filePath: status === 'completed' ? `/storage/downloads/${Math.random().toString(36).substring(2, 10)}.${format}` : undefined,
    };
  });
};

const DownloadManagement: React.FC = () => {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [filteredDownloads, setFilteredDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDownload, setSelectedDownload] = useState<Download | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');
  const [statistics, setStatistics] = useState<DownloadStats>({
    totalDownloads: 0,
    completedDownloads: 0,
    failedDownloads: 0,
    totalSize: 0,
    popularSource: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [useMockData, setUseMockData] = useState(false);

  useEffect(() => {
    fetchDownloads();
    fetchStats();
  }, [currentPage, pageSize, statusFilter, sourceFilter, activeTab]);
  
  const fetchDownloads = async () => {
    setLoading(true);
    try {
      if (useMockData) {
        // Используем моковые данные
        const mockData = generateMockDownloads(50);
        setDownloads(mockData);
        setFilteredDownloads(filterDownloads(mockData));
        setTotalItems(200);
      } else {
        const filters: Record<string, any> = {};
        
        // Добавляем фильтры в зависимости от выбранных опций
        if (statusFilter !== 'all') {
          filters.status = statusFilter;
        }
        
        if (sourceFilter !== 'all') {
          filters.source = sourceFilter;
        }
        
        if (activeTab !== 'all') {
          filters.status = activeTab;
        }
        
        if (searchText) {
          filters.search = searchText;
        }
        
        try {
          const result = await downloadsAPI.getAllDownloads(currentPage, pageSize, filters);
          setDownloads(result.downloads);
          setFilteredDownloads(result.downloads);
          setTotalItems(result.total);
        } catch (error) {
          console.error('Ошибка при загрузке данных, переходим на моковые данные:', error);
          message.warning('API не доступен, используются тестовые данные');
          setUseMockData(true);
          const mockData = generateMockDownloads(50);
          setDownloads(mockData);
          setFilteredDownloads(filterDownloads(mockData));
          setTotalItems(200);
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
      message.error('Не удалось загрузить данные загрузок');
    } finally {
      setLoading(false);
    }
  };

  const filterDownloads = (data: Download[]) => {
    let filtered = [...data];
    
    // Фильтрация по вкладке
    if (activeTab !== 'all') {
      filtered = filtered.filter(download => download.status === activeTab);
    }
    
    // Фильтрация по поисковой строке
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        download => 
          download.id.toLowerCase().includes(searchLower) ||
          download.title.toLowerCase().includes(searchLower) ||
          download.userName.toLowerCase().includes(searchLower) ||
          download.url.toLowerCase().includes(searchLower)
      );
    }
    
    // Фильтрация по статусу
    if (statusFilter !== 'all') {
      filtered = filtered.filter(download => download.status === statusFilter);
    }
    
    // Фильтрация по источнику
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(download => download.source === sourceFilter);
    }
    
    return filtered;
  };

  const fetchStats = async () => {
    try {
      if (useMockData) {
        calculateMockStats();
      } else {
        try {
          const stats = await downloadsAPI.getDownloadStats();
          setStatistics(stats);
        } catch (error) {
          console.error('Ошибка при загрузке статистики, используем расчет из текущих данных:', error);
          calculateMockStats();
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке статистики:', error);
    }
  };

  const calculateMockStats = () => {
    if (!downloads || downloads.length === 0) return;
    
    const completed = downloads.filter(d => d.status === 'completed');
    const failed = downloads.filter(d => d.status === 'failed');
    const totalSize = completed.reduce((sum, d) => sum + d.size, 0);
    
    // Определим самый популярный источник
    const sourceCounts: Record<string, number> = {
      youtube: downloads.filter(d => d.source === 'youtube').length,
      vimeo: downloads.filter(d => d.source === 'vimeo').length,
      instagram: downloads.filter(d => d.source === 'instagram').length,
      tiktok: downloads.filter(d => d.source === 'tiktok').length,
      other: downloads.filter(d => d.source === 'other').length
    };
    
    const popularSource = Object.keys(sourceCounts).reduce((a, b) => 
      sourceCounts[a] > sourceCounts[b] ? a : b
    );
    
    setStatistics({
      totalDownloads: downloads.length,
      completedDownloads: completed.length,
      failedDownloads: failed.length,
      totalSize,
      popularSource
    });
  };

  const handleViewDownload = (download: Download) => {
    setSelectedDownload(download);
    setIsModalVisible(true);
  };

  const handleDeleteDownload = (download: Download) => {
    confirm({
      title: 'Подтвердите удаление загрузки',
      icon: <ExclamationCircleOutlined />,
      content: `Вы уверены, что хотите удалить загрузку ${download.id}: "${download.title}"?`,
      onOk: async () => {
        try {
          if (!useMockData) {
            await downloadsAPI.deleteDownload(download.id);
          }
          
          setDownloads(prev => {
            const updatedDownloads = prev.filter(d => d.id !== download.id);
            return updatedDownloads;
          });
          setFilteredDownloads(prev => prev.filter(d => d.id !== download.id));
          
          if (selectedDownload && selectedDownload.id === download.id) {
            setIsModalVisible(false);
            setSelectedDownload(null);
          }
          
          message.success(`Загрузка ${download.id} успешно удалена`);
          fetchStats(); // Обновляем статистику
        } catch (error) {
          console.error('Ошибка при удалении загрузки:', error);
          message.error('Не удалось удалить загрузку');
        }
      },
    });
  };
  
  const handleRetryDownload = (download: Download) => {
    confirm({
      title: 'Повторить загрузку',
      icon: <ExclamationCircleOutlined />,
      content: `Вы хотите повторить загрузку "${download.title}"?`,
      onOk: async () => {
        try {
          let updatedDownload;
          
          if (!useMockData) {
            updatedDownload = await downloadsAPI.retryDownload(download.id);
          } else {
            // Если используем моковые данные, просто обновляем статус
            updatedDownload = {
              ...download,
              status: 'queued' as const,
              progress: 0,
              errorMessage: undefined
            };
          }
          
          setDownloads(prev => prev.map(d => 
            d.id === download.id ? updatedDownload : d
          ));
          
          setFilteredDownloads(prev => prev.map(d => 
            d.id === download.id ? updatedDownload : d
          ));
          
          if (selectedDownload && selectedDownload.id === download.id) {
            setSelectedDownload(updatedDownload);
          }
          
          message.success(`Загрузка ${download.id} успешно добавлена в очередь`);
        } catch (error) {
          console.error('Ошибка при повторной попытке загрузки:', error);
          message.error('Не удалось повторить загрузку');
        }
      },
    });
  };

  const handleSearch = () => {
    if (useMockData) {
      setFilteredDownloads(filterDownloads(downloads));
    } else {
      fetchDownloads();
    }
  };

  const handleResetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setSourceFilter('all');
    setActiveTab('all');
    setCurrentPage(1);
    if (useMockData) {
      setFilteredDownloads(downloads);
    }
  };
  
  const handlePageChange = (page: number, pageSize?: number) => {
    setCurrentPage(page);
    if (pageSize) {
      setPageSize(pageSize);
    }
  };

  const renderSourceIcon = (source: Download['source']) => {
    switch (source) {
      case 'youtube':
        return <YoutubeOutlined style={{ color: '#FF0000' }} />;
      case 'instagram':
        return <i className="fab fa-instagram" style={{ color: '#E1306C' }} />;
      case 'tiktok':
        return <i className="fab fa-tiktok" style={{ color: '#000000' }} />;
      case 'vimeo':
        return <i className="fab fa-vimeo-v" style={{ color: '#1AB7EA' }} />;
      default:
        return <DownloadOutlined />;
    }
  };

  const renderSourceTag = (source: Download['source']) => {
    const sourceColors: Record<string, string> = {
      youtube: 'red',
      vimeo: 'blue',
      instagram: 'magenta',
      tiktok: 'black',
      other: 'default'
    };
    
    const sourceLabels: Record<string, string> = {
      youtube: 'YouTube',
      vimeo: 'Vimeo',
      instagram: 'Instagram',
      tiktok: 'TikTok',
      other: 'Другое'
    };
    
    return (
      <Tag color={sourceColors[source]} icon={renderSourceIcon(source)}>
        {sourceLabels[source]}
      </Tag>
    );
  };

  const renderStatusBadge = (status: Download['status']) => {
    switch (status) {
      case 'completed':
        return <Tag icon={<CheckCircleOutlined />} color="success">Завершено</Tag>;
      case 'processing':
        return <Tag color="processing">Обработка</Tag>;
      case 'failed':
        return <Tag icon={<CloseCircleOutlined />} color="error">Ошибка</Tag>;
      case 'queued':
        return <Tag color="default">В очереди</Tag>;
      default:
        return null;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Б';
    
    const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  };

  const columns: TableProps<Download>['columns'] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: 'Пользователь',
      dataIndex: 'userName',
      key: 'userName',
      width: 120,
    },
    {
      title: 'Название',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
    },
    {
      title: 'Источник',
      dataIndex: 'source',
      key: 'source',
      render: renderSourceTag,
      filters: [
        { text: 'YouTube', value: 'youtube' },
        { text: 'Vimeo', value: 'vimeo' },
        { text: 'Instagram', value: 'instagram' },
        { text: 'TikTok', value: 'tiktok' },
        { text: 'Другое', value: 'other' },
      ],
      onFilter: (value: boolean | React.Key, record: Download) => record.source === value,
    },
    {
      title: 'Формат',
      dataIndex: 'format',
      key: 'format',
      render: (format: string, record: Download) => 
        `${format.toUpperCase()}${record.resolution ? ` (${record.resolution})` : ''}`,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: renderStatusBadge,
      filters: [
        { text: 'В очереди', value: 'queued' },
        { text: 'Скачивание', value: 'downloading' },
        { text: 'Завершено', value: 'completed' },
        { text: 'Ошибка', value: 'failed' },
      ],
      onFilter: (value: boolean | React.Key, record: Download) => record.status === value,
    },
    {
      title: 'Прогресс',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => (
        <Progress percent={progress} size="small" status={progress === 100 ? "success" : "active"} />
      ),
    },
    {
      title: 'Размер',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatFileSize(size),
      sorter: (a: Download, b: Download) => a.size - b.size,
    },
    {
      title: 'Дата создания',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: formatDate,
      sorter: (a: Download, b: Download) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Download) => (
        <Space>
          <Button 
            icon={<EyeOutlined />} 
            size="small"
            onClick={() => handleViewDownload(record)}
          >
            Просмотр
          </Button>
          {record.status === 'failed' && (
            <Button 
              type="primary"
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => handleRetryDownload(record)}
            >
              Повторить
            </Button>
          )}
          <Button 
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={() => handleDeleteDownload(record)}
          >
            Удалить
          </Button>
        </Space>
      ),
    },
  ];
  
  // Безопасное получение количества загрузок по статусу
  const getDownloadCountByStatus = (status: string) => {
    if (!downloads || !Array.isArray(downloads)) return 0;
    return downloads.filter(d => d.status === status).length;
  };
  
  return (
    <div className="p-4">
      {useMockData && (
        <div style={{ marginBottom: '16px' }}>
          <Tag color="warning">Используются тестовые данные, так как API недоступен</Tag>
        </div>
      )}
      <Card title="Управление загрузками">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={<span>Все загрузки <Badge count={statistics.totalDownloads || 0} /></span>} key="all" />
          <TabPane 
            tab={<span>Завершенные <Badge count={statistics.completedDownloads || 0} style={{ backgroundColor: '#52c41a' }} /></span>} 
            key="completed" 
          />
          <TabPane 
            tab={<span>В процессе <Badge count={getDownloadCountByStatus('processing')} style={{ backgroundColor: '#1890ff' }} /></span>} 
            key="processing" 
          />
          <TabPane 
            tab={<span>В очереди <Badge count={getDownloadCountByStatus('queued')} style={{ backgroundColor: '#faad14' }} /></span>} 
            key="queued" 
          />
          <TabPane 
            tab={<span>Ошибки <Badge count={statistics.failedDownloads || 0} style={{ backgroundColor: '#f5222d' }} /></span>} 
            key="failed" 
          />
        </Tabs>
        
        <div className="mb-6">
          <Row gutter={[16, 16]} className="mb-4">
            <Col span={6}>
              <Card>
                <Statistic
                  title="Всего загрузок"
                  value={statistics.totalDownloads || 0}
                  prefix={<DownloadOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Успешных загрузок"
                  value={statistics.completedDownloads || 0}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Ошибок загрузки"
                  value={statistics.failedDownloads || 0}
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<CloseCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Общий размер"
                  value={formatFileSize(statistics.totalSize || 0)}
                  prefix={<LineChartOutlined />}
                />
              </Card>
            </Col>
          </Row>
          
          <Card className="mb-4">
            <Form layout="inline">
              <Form.Item label="Поиск">
                <Input
                  placeholder="ID, название, пользователь, URL"
                  value={searchText}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
                  prefix={<SearchOutlined />}
                  allowClear
                  onPressEnter={handleSearch}
                />
              </Form.Item>
              <Form.Item label="Статус">
                <Select 
                  value={statusFilter} 
                  onChange={setStatusFilter}
                  style={{ width: 140 }}
                >
                  <Option value="all">Все статусы</Option>
                  <Option value="completed">Завершенные</Option>
                  <Option value="processing">В процессе</Option>
                  <Option value="queued">В очереди</Option>
                  <Option value="failed">Ошибки</Option>
                </Select>
              </Form.Item>
              <Form.Item label="Источник">
                <Select 
                  value={sourceFilter} 
                  onChange={setSourceFilter}
                  style={{ width: 140 }}
                >
                  <Option value="all">Все источники</Option>
                  <Option value="youtube">YouTube</Option>
                  <Option value="vimeo">Vimeo</Option>
                  <Option value="instagram">Instagram</Option>
                  <Option value="tiktok">TikTok</Option>
                  <Option value="other">Другое</Option>
                </Select>
              </Form.Item>
              <Form.Item>
                <Button type="primary" onClick={handleSearch}>Применить</Button>
              </Form.Item>
              <Form.Item>
                <Button onClick={handleResetFilters}>Сбросить</Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
        
        <Table
          dataSource={filteredDownloads}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalItems,
            onChange: handlePageChange,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
        />
      </Card>
      
      <Modal
        title={`Детали загрузки ${selectedDownload?.id}`}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            Закрыть
          </Button>,
          selectedDownload?.status === 'failed' && (
            <Button 
              key="retry" 
              type="primary"
              onClick={() => {
                setIsModalVisible(false);
                if (selectedDownload) {
                  handleRetryDownload(selectedDownload);
                }
              }}
            >
              Повторить загрузку
            </Button>
          ),
          <Button 
            key="delete" 
            danger
            onClick={() => {
              if (selectedDownload) {
                handleDeleteDownload(selectedDownload);
              }
            }}
          >
            Удалить
          </Button>,
        ].filter(Boolean)}
      >
        {selectedDownload && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Text strong>Название:</Text>
                <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'Показать больше' }}>
                  {selectedDownload.title}
                </Paragraph>
              </Col>
            </Row>
            <Row gutter={[16, 16]} className="mt-4">
              <Col span={12}>
                <Text strong>Пользователь:</Text>
                <div>{selectedDownload.userName}</div>
              </Col>
              <Col span={12}>
                <Text strong>Статус:</Text>
                <div>{renderStatusBadge(selectedDownload.status)}</div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} className="mt-4">
              <Col span={24}>
                <Text strong>URL:</Text>
                <div>
                  <a href={selectedDownload.url} target="_blank" rel="noopener noreferrer">
                    {selectedDownload.url}
                  </a>
              </div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} className="mt-4">
              <Col span={12}>
                <Text strong>Источник:</Text>
                <div>{renderSourceTag(selectedDownload.source)}</div>
              </Col>
              <Col span={12}>
                <Text strong>Формат:</Text>
                <div>{selectedDownload.format.toUpperCase()} {selectedDownload.resolution && `(${selectedDownload.resolution})`}</div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} className="mt-4">
              <Col span={12}>
                <Text strong>Дата создания:</Text>
                <div>{formatDate(selectedDownload.createdAt)}</div>
              </Col>
              <Col span={12}>
                <Text strong>Дата завершения:</Text>
                <div>{formatDate(selectedDownload.completedAt)}</div>
              </Col>
            </Row>
            {selectedDownload.filePath && (
              <Row gutter={[16, 16]} className="mt-4">
                <Col span={12}>
                  <Text strong>Размер файла:</Text>
                  <div>{formatFileSize(selectedDownload.size)}</div>
                </Col>
                <Col span={12}>
                  <Text strong>Путь к файлу:</Text>
                  <div>{selectedDownload.filePath}</div>
                </Col>
              </Row>
            )}
            <Row gutter={[16, 16]} className="mt-4">
              <Col span={24}>
                <Text strong>Прогресс:</Text>
                <div>
                  <Progress 
                    percent={selectedDownload.progress} 
                    status={
                      selectedDownload.status === 'completed' ? 'success' : 
                      selectedDownload.status === 'failed' ? 'exception' : 'active'
                    } 
                  />
                </div>
              </Col>
            </Row>
            {selectedDownload.errorMessage && (
              <Row gutter={[16, 16]} className="mt-4">
                <Col span={24}>
                  <Text strong type="danger">Сообщение об ошибке:</Text>
                  <div>
                    <Text type="danger">{selectedDownload.errorMessage}</Text>
            </div>
                </Col>
              </Row>
            )}
        </div>
      )}
      </Modal>
    </div>
  );
};

export default DownloadManagement; 
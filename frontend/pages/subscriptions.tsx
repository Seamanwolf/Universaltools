import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Divider, 
  Tabs, 
  Tag, 
  List, 
  Badge, 
  Tooltip,
  Modal,
  message,
  Dropdown,
  Menu,
  Space,
  Empty,
  Spin,
  Pagination,
  Table,
  Form,
  Input,
  Popconfirm
} from 'antd';
import { 
  CheckOutlined, 
  CloseOutlined, 
  RocketOutlined, 
  CalendarOutlined, 
  DownloadOutlined, 
  LockOutlined,
  ThunderboltOutlined,
  CrownOutlined,
  StarOutlined,
  GlobalOutlined,
  DownOutlined,
  HistoryOutlined,
  SettingOutlined,
  LogoutOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  YoutubeOutlined
} from '@ant-design/icons';
import Link from 'next/link';
import { videoAPI } from '@/lib/api';
import NavBar from '@/components/NavBar';
import { subscriptionAPI } from '@/lib/api';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

// Определяем интерфейс для канальной подписки (в отличие от платной подписки)
interface Subscription {
  id: number | string;
  name: string;
  url: string;
  platform: string;
  last_checked: string;
  download_count: number;
  active: boolean;
}

// Локальный компонент SubscriptionCard
const SubscriptionCard = ({ subscription, onDelete }: { subscription: Subscription, onDelete: () => void }) => {
  return (
    <Card
      hoverable
      className="transition-all duration-300 hover:shadow-lg"
    >
      <div className="flex flex-col h-full">
        <div className="mb-3 flex items-center">
          {subscription.platform === 'youtube' && (
            <YoutubeOutlined className="text-red-500 text-2xl mr-2" />
          )}
          <Title level={4} className="mb-0 flex-1 truncate">{subscription.name}</Title>
        </div>
        
        <div className="mb-3">
          <a 
            href={subscription.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-500 hover:underline break-all"
          >
            {subscription.url.length > 40 ? `${subscription.url.slice(0, 40)}...` : subscription.url}
          </a>
        </div>
        
        <div className="mb-3 flex items-center">
          <Badge status={subscription.active ? "success" : "error"} />
          <span className="ml-2">
            {subscription.active ? "Активна" : "Приостановлена"}
          </span>
        </div>
        
        <div className="mb-3">
          <Text type="secondary">
            Загрузки: {subscription.download_count}
          </Text>
        </div>
        
        <div className="mb-3">
          <Text type="secondary">
            Последняя проверка: {new Date(subscription.last_checked).toLocaleString()}
          </Text>
        </div>
        
        <div className="mt-auto pt-4 border-t">
          <Space>
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              size="small"
            >
              Скачать новые
            </Button>
            <Button 
              icon={<EditOutlined />} 
              size="small"
            />
            <Popconfirm
              title="Вы уверены, что хотите удалить эту подписку?"
              onConfirm={onDelete}
              okText="Да"
              cancelText="Нет"
            >
              <Button 
                icon={<DeleteOutlined />} 
                size="small" 
                danger
              />
            </Popconfirm>
          </Space>
        </div>
      </div>
    </Card>
  );
};

interface SubscriptionPlan {
  id: string;
  name: string;
  duration: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  features: { text: string; available: boolean }[];
  limits: { downloads: number; conversions: number };
  popular?: boolean;
  buttonText: string;
  adminOnly?: boolean;
}

interface UserSubscription {
  id: number;
  type: string;
  status: string;
  start_date: string;
  end_date: string;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      // Используем getCurrentSubscription и создаем мок-объекты, так как getUserSubscriptions отсутствует
      const mockSubscriptions: Subscription[] = [
        {
          id: 1,
          name: 'Любимый канал',
          url: 'https://www.youtube.com/channel/UC-lHJZR3Gqxm24_Vd_AJ5Yw',
          platform: 'youtube',
          last_checked: new Date().toISOString(),
          download_count: 27,
          active: true
        },
        {
          id: 2,
          name: 'Новости технологий',
          url: 'https://www.youtube.com/channel/UCdKuE7a2QZeHPhDntXVZ91w',
          platform: 'youtube',
          last_checked: new Date().toISOString(),
          download_count: 14,
          active: true
        },
        {
          id: 3,
          name: 'Образовательный канал',
          url: 'https://www.youtube.com/channel/UCX6b17PVsYBQ0ip5gyeme-Q',
          platform: 'youtube',
          last_checked: new Date().toISOString(),
          download_count: 5,
          active: false
        }
      ];
      setSubscriptions(mockSubscriptions);
      setError(null);
    } catch (err) {
      setError('Не удалось загрузить подписки');
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubscription = async (channelUrl: string, name?: string, downloadPath?: string) => {
    try {
      setLoading(true);
      // Создаем новую подписку локально, так как API не содержит метод addSubscription
      const newSubscription: Subscription = {
        id: Date.now(), // используем timestamp как id
        name: name || "Новая подписка",
        url: channelUrl,
        platform: channelUrl.includes('youtube') ? 'youtube' : 'other',
        last_checked: new Date().toISOString(),
        download_count: 0,
        active: true
      };
      
      setSubscriptions(prev => [...prev, newSubscription]);
      setIsModalVisible(false);
      message.success("Подписка добавлена");
    } catch (err) {
      console.error('Error adding subscription:', err);
      setError('Не удалось добавить подписку');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubscription = async (id: number | string) => {
    try {
      // Удаляем подписку локально
      setSubscriptions(subscriptions.filter(sub => sub.id !== id));
      message.success("Подписка удалена");
    } catch (err) {
      console.error('Error deleting subscription:', err);
      setError('Не удалось удалить подписку');
    }
  };

  const paginatedData = subscriptions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleEditSubscription = (subscription: Subscription) => {
    setEditingSubscription(subscription);
    form.setFieldsValue({
      name: subscription.name,
      url: subscription.url,
      active: subscription.active
    });
    setIsModalVisible(true);
  };

  const handleModalSubmit = () => {
    form.validateFields()
      .then(values => {
        if (editingSubscription) {
          // Обновление существующей подписки
          const updatedSubscriptions = subscriptions.map(sub => 
            sub.id === editingSubscription.id ? { ...sub, ...values } : sub
          );
          setSubscriptions(updatedSubscriptions);
          message.success('Подписка обновлена');
        } else {
          // Добавление новой подписки
          const newSubscription: Subscription = {
            id: Date.now().toString(),
            name: values.name,
            url: values.url,
            platform: values.url.includes('youtube') ? 'youtube' : 'other',
            last_checked: new Date().toISOString(),
            download_count: 0,
            active: true
          };
          setSubscriptions([...subscriptions, newSubscription]);
          message.success('Подписка добавлена');
        }
        setIsModalVisible(false);
        form.resetFields();
      })
      .catch(info => {
        console.log('Validate Failed:', info);
      });
  };

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Subscription) => (
        <div className="flex items-center">
          {record.platform === 'youtube' && (
            <YoutubeOutlined className="mr-2 text-red-500" />
          )}
          <span>{text}</span>
        </div>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      render: (text: string) => (
        <a href={text} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          {text.length > 40 ? `${text.substring(0, 40)}...` : text}
        </a>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean) => (
        active ? 
          <Tag color="green">Активна</Tag> : 
          <Tag color="red">Приостановлена</Tag>
      ),
    },
    {
      title: 'Загрузки',
      dataIndex: 'download_count',
      key: 'download_count',
    },
    {
      title: 'Последняя проверка',
      dataIndex: 'last_checked',
      key: 'last_checked',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Subscription) => (
        <div className="flex space-x-2">
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => handleEditSubscription(record)}
          />
          <Popconfirm
            title="Вы уверены, что хотите удалить эту подписку?"
            onConfirm={() => handleDeleteSubscription(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button 
              icon={<DeleteOutlined />} 
              size="small" 
              danger
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <NavBar />
      <div className="flex min-h-screen flex-col items-center">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <Title level={2}>Тарифы и подписки</Title>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setIsModalVisible(true)}
            >
              Добавить подписку
            </Button>
          </div>
          
          <Tabs defaultActiveKey="plans" className="mb-8">
            <TabPane tab="Тарифные планы" key="plans">
              <Row gutter={[24, 24]} className="mb-8">
                <Col xs={24} md={8}>
                  <Card 
                    className="h-full subscription-card"
                    hoverable
                    bordered
                  >
                    <div className="text-center">
                      <div className="bg-blue-100 text-blue-700 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <RocketOutlined style={{ fontSize: 32 }} />
                      </div>
                      <Title level={3} className="mb-2">Базовый</Title>
                      <div className="price-tag">
                        <span className="text-3xl font-bold">199 ₽</span>
                        <span className="text-gray-500"> / месяц</span>
                      </div>
                      <Divider />
                      <ul className="feature-list mb-8">
                        <li>
                          <CheckOutlined className="text-green-500 mr-2" />
                          <span>10 загрузок в день</span>
                        </li>
                        <li>
                          <CheckOutlined className="text-green-500 mr-2" />
                          <span>Разрешение до 1080p HD</span>
                        </li>
                        <li>
                          <CheckOutlined className="text-green-500 mr-2" />
                          <span>Базовая конвертация</span>
                        </li>
                        <li>
                          <CloseOutlined className="text-red-500 mr-2" />
                          <span className="text-gray-400">Без водяных знаков</span>
                        </li>
                        <li>
                          <CloseOutlined className="text-red-500 mr-2" />
                          <span className="text-gray-400">Премиум поддержка</span>
                        </li>
                      </ul>
                      <Button type="primary" block>Выбрать</Button>
                    </div>
                  </Card>
                </Col>
                
                <Col xs={24} md={8}>
                  <Card 
                    className="h-full subscription-card popular"
                    hoverable
                    bordered
                  >
                    <div className="popular-label">Популярный</div>
                    <div className="text-center">
                      <div className="bg-purple-100 text-purple-700 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <ThunderboltOutlined style={{ fontSize: 32 }} />
                      </div>
                      <Title level={3} className="mb-2">Премиум</Title>
                      <div className="price-tag">
                        <span className="text-3xl font-bold">499 ₽</span>
                        <span className="text-gray-500"> / месяц</span>
                      </div>
                      <Divider />
                      <ul className="feature-list mb-8">
                        <li>
                          <CheckOutlined className="text-green-500 mr-2" />
                          <span>Неограниченные загрузки</span>
                        </li>
                        <li>
                          <CheckOutlined className="text-green-500 mr-2" />
                          <span>Разрешение до 4K Ultra HD</span>
                        </li>
                        <li>
                          <CheckOutlined className="text-green-500 mr-2" />
                          <span>Расширенная конвертация</span>
                        </li>
                        <li>
                          <CheckOutlined className="text-green-500 mr-2" />
                          <span>Без водяных знаков</span>
                        </li>
                        <li>
                          <CheckOutlined className="text-green-500 mr-2" />
                          <span>Стандартная поддержка</span>
                        </li>
                      </ul>
                      <Button type="primary" size="large" block>Выбрать</Button>
                    </div>
                  </Card>
                </Col>
                
                <Col xs={24} md={8}>
                  <Card 
                    className="h-full subscription-card"
                    hoverable
                    bordered
                  >
                    <div className="text-center">
                      <div className="bg-gold-100 text-gold-700 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <CrownOutlined style={{ fontSize: 32 }} />
                      </div>
                      <Title level={3} className="mb-2">VIP</Title>
                      <div className="price-tag">
                        <span className="text-3xl font-bold">999 ₽</span>
                        <span className="text-gray-500"> / месяц</span>
                      </div>
                      <Divider />
                      <ul className="feature-list mb-8">
                        <li>
                          <CheckOutlined className="text-green-500 mr-2" />
                          <span>Неограниченные загрузки</span>
                        </li>
                        <li>
                          <CheckOutlined className="text-green-500 mr-2" />
                          <span>Все форматы и разрешения</span>
                        </li>
                        <li>
                          <CheckOutlined className="text-green-500 mr-2" />
                          <span>Профессиональная конвертация</span>
                        </li>
                        <li>
                          <CheckOutlined className="text-green-500 mr-2" />
                          <span>Без водяных знаков</span>
                        </li>
                        <li>
                          <CheckOutlined className="text-green-500 mr-2" />
                          <span>Приоритетная поддержка 24/7</span>
                        </li>
                      </ul>
                      <Button type="primary" block>Выбрать</Button>
                    </div>
                  </Card>
                </Col>
              </Row>
            </TabPane>
            
            <TabPane tab="Мои подписки на каналы" key="channel-subscriptions">
              {loading && <div className="flex justify-center my-12"><Spin size="large" /></div>}
              
              {error && <div className="text-red-500 text-center my-4">{error}</div>}
              
              {!loading && subscriptions.length === 0 && (
                <Empty 
                  description="У вас пока нет подписок" 
                  className="my-12"
                />
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedData.map(subscription => (
                  <SubscriptionCard 
                    key={subscription.id} 
                    subscription={subscription}
                    onDelete={() => handleDeleteSubscription(subscription.id)}
                  />
                ))}
              </div>
              
              {subscriptions.length > 0 && (
                <div className="flex justify-center mt-8">
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={subscriptions.length}
                    onChange={setCurrentPage}
                    showSizeChanger
                    onShowSizeChange={(current, size) => {
                      setCurrentPage(1);
                      setPageSize(size);
                    }}
                  />
                </div>
              )}
            </TabPane>
          </Tabs>
          
          <Card className="mt-8 bg-gray-50">
            <Title level={4} className="mb-2">Преимущества подписки</Title>
            <Paragraph>
              Подписка открывает доступ к расширенному функционалу сервиса:
              неограниченное количество загрузок, высшее качество видео,
              приоритетная техподдержка и многое другое.
            </Paragraph>
            <Paragraph className="mb-0">
              Если у вас возникли вопросы по работе тарифов, свяжитесь с нашей службой поддержки.
            </Paragraph>
          </Card>
          
          <style jsx global>{`
            .subscription-card {
              position: relative;
              transition: all 0.3s ease;
            }
            
            .subscription-card:hover {
              transform: translateY(-5px);
            }
            
            .popular {
              border-color: #722ed1;
              z-index: 1;
            }
            
            .popular-label {
              position: absolute;
              top: 0;
              right: 0;
              background: #722ed1;
              color: white;
              padding: 4px 12px;
              border-bottom-left-radius: 8px;
              font-weight: bold;
            }
            
            .feature-list {
              padding: 0;
              list-style: none;
              text-align: left;
            }
            
            .feature-list li {
              margin-bottom: 12px;
              display: flex;
              align-items: center;
            }
            
            .bg-gold-100 {
              background-color: rgba(250, 173, 20, 0.2);
            }
            
            .text-gold-700 {
              color: #d48806;
            }
            
            .price-tag {
              margin: 16px 0;
            }
          `}</style>
        </div>
      </div>
      
      <Modal
        title={editingSubscription ? "Редактировать подписку" : "Добавить подписку"}
        open={isModalVisible}
        onOk={handleModalSubmit}
        onCancel={() => setIsModalVisible(false)}
        okText={editingSubscription ? "Сохранить" : "Добавить"}
        cancelText="Отмена"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            active: true
          }}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Пожалуйста, введите название подписки' }]}
          >
            <Input placeholder="Название канала или плейлиста" />
          </Form.Item>
          <Form.Item
            name="url"
            label="URL"
            rules={[
              { required: true, message: 'Пожалуйста, введите URL' },
              { type: 'url', message: 'Пожалуйста, введите корректный URL' }
            ]}
          >
            <Input placeholder="https://www.youtube.com/channel/..." />
          </Form.Item>
          <Form.Item
            name="active"
            valuePropName="checked"
          >
            <div className="flex items-center">
              <span className="mr-2">Активная подписка</span>
              <input type="checkbox" />
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
} 
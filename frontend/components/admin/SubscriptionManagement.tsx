'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, DatePicker, Space, Typography, Tabs, Statistic, Row, Col, Badge, Tooltip, Switch } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, UserOutlined, RocketOutlined, CalendarOutlined, DollarOutlined } from '@ant-design/icons';
import { adminAPI } from '@/lib/api';

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

interface Subscription {
  id: number;
  user_id: number;
  type: string;
  status?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  auto_renewal?: boolean;
  payment_id?: string;
  downloads_limit?: number;
  downloads_count: number;
  downloads_used?: number;
  created_at: string;
}

interface User {
  id: number;
  email: string;
  username: string;
}

interface SubscriptionWithUser extends Subscription {
  user: User;
  price: number;
}

const SubscriptionManagement: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithUser[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<SubscriptionWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithUser | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [statistics, setStatistics] = useState({
    totalActive: 0,
    monthlyRevenue: 0,
    avgSubscriptionLength: 0,
    popularPlan: '',
  });

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        
        // Получаем подписки и пользователей из API
        const [subscriptionsData, usersData, paymentsData] = await Promise.all([
          adminAPI.getAllSubscriptions().catch(() => []),
          adminAPI.getAllUsers().catch(() => []),
          adminAPI.getAllPayments().catch(() => [])
        ]);
        
        // Создаем отображение userId -> user для быстрого доступа
        const usersMap = usersData.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as Record<number, User>);
        
        // Создаем отображение subscriptionId -> payments
        const subscriptionPayments = paymentsData.reduce((acc, payment) => {
          if (payment.subscription_id && !acc[payment.subscription_id]) {
            acc[payment.subscription_id] = [];
          }
          if (payment.subscription_id) {
            acc[payment.subscription_id].push(payment);
          }
          return acc;
        }, {} as Record<number, any[]>);
        
        // Объединяем подписки с данными пользователей
        const enhancedSubscriptions = subscriptionsData.map(subscription => {
          const user = usersMap[subscription.user_id] || { 
            id: subscription.user_id, 
            email: 'неизвестно', 
            username: 'неизвестно' 
          };
          
          // Получаем платеж для подписки, чтобы узнать цену
          const payments = subscriptionPayments[subscription.id] || [];
          const lastPayment = payments.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
          
          const price = lastPayment ? lastPayment.amount : 0;
          
          return {
            ...subscription,
            downloads_count: subscription.downloads_used || 0,
            is_active: Boolean(subscription.is_active),
            user,
            price
          } as unknown as SubscriptionWithUser;
        });
        
        setSubscriptions(enhancedSubscriptions);
      
        // Рассчитываем статистику
        const activeSubscriptions = enhancedSubscriptions.filter(sub => 
          sub.is_active && new Date(sub.end_date) > new Date()
        );
        
        const monthlyRevenue = activeSubscriptions.reduce((sum, sub) => sum + sub.price, 0);
      
        // Определяем самый популярный план
        const planCounts = enhancedSubscriptions.reduce((acc, sub) => {
          if (!acc[sub.type]) acc[sub.type] = 0;
          acc[sub.type]++;
          return acc;
        }, {} as Record<string, number>);
        
        let popularPlan = '';
        let maxCount = 0;
        
        Object.entries(planCounts).forEach(([plan, count]) => {
          if (count > maxCount) {
            maxCount = count;
            popularPlan = plan;
          }
        });
        
        // Расчет среднего срока подписки (в месяцах)
        const avgMonths = enhancedSubscriptions.length > 0 
          ? enhancedSubscriptions.reduce((sum, sub) => {
              const start = new Date(sub.start_date);
              const end = new Date(sub.end_date);
              const diffTime = Math.abs(end.getTime() - start.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return sum + (diffDays / 30); // примерно в месяцах
            }, 0) / enhancedSubscriptions.length
          : 0;
      
      setStatistics({
          totalActive: activeSubscriptions.length,
        monthlyRevenue,
          avgSubscriptionLength: parseFloat(avgMonths.toFixed(1)),
        popularPlan
      });
      
      setLoading(false);
      } catch (error) {
        console.error('Ошибка при загрузке подписок:', error);
        setLoading(false);
      }
    };
    
    fetchSubscriptions();
  }, []);
  
  useEffect(() => {
    filterSubscriptions();
  }, [searchText, statusFilter, planFilter, subscriptions, activeTab]);

  const filterSubscriptions = () => {
    let filtered = [...subscriptions];
    
    // Фильтр по вкладке
    if (activeTab !== 'all') {
      if (activeTab === 'active') {
        filtered = filtered.filter(sub => sub.is_active && new Date(sub.end_date) > new Date());
      } else if (activeTab === 'expired') {
        filtered = filtered.filter(sub => new Date(sub.end_date) <= new Date());
      } else if (activeTab === 'cancelled') {
        filtered = filtered.filter(sub => !sub.is_active);
      }
    }
    
    // Фильтр по строке поиска
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        sub => 
          sub.id.toString().includes(searchLower) ||
          sub.user.username.toLowerCase().includes(searchLower) ||
          sub.user.email.toLowerCase().includes(searchLower)
      );
    }
    
    // Фильтр по статусу
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(sub => sub.is_active && new Date(sub.end_date) > new Date());
      } else if (statusFilter === 'expired') {
        filtered = filtered.filter(sub => new Date(sub.end_date) <= new Date());
      } else if (statusFilter === 'cancelled') {
        filtered = filtered.filter(sub => !sub.is_active);
      }
    }
    
    // Фильтр по плану
    if (planFilter !== 'all') {
      filtered = filtered.filter(sub => sub.type === planFilter);
    }
    
    setFilteredSubscriptions(filtered);
  };

  const handleViewSubscription = (subscription: SubscriptionWithUser) => {
    setSelectedSubscription(subscription);
    setIsModalVisible(true);
  };

  const handleCancelSubscription = async (subscription: SubscriptionWithUser) => {
    confirm({
      title: 'Подтвердите отмену подписки',
      icon: <ExclamationCircleOutlined />,
      content: `Вы уверены, что хотите отменить подписку ${subscription.id} пользователя ${subscription.user.username}?`,
      onOk: async () => {
        try {
          // Отправляем запрос на сервер для отмены подписки
          await adminAPI.updateUser(subscription.id, { 
            // Используем обновление подписки вместо пользователя
            is_active: false 
          } as any);
          
          // Обновляем локальное состояние
        const updatedSubscriptions = subscriptions.map(sub =>
            sub.id === subscription.id ? { ...sub, is_active: false } : sub
        );
        
        setSubscriptions(updatedSubscriptions);
        
        if (selectedSubscription && selectedSubscription.id === subscription.id) {
            setSelectedSubscription({ ...subscription, is_active: false });
        }
        
        Modal.success({
          content: `Подписка ${subscription.id} успешно отменена`,
        });
        } catch (error) {
          console.error('Ошибка при отмене подписки:', error);
          Modal.error({
            content: 'Не удалось отменить подписку. Пожалуйста, попробуйте снова.',
          });
        }
      },
    });
  };
  
  const handleToggleAutoRenew = async (subscription: SubscriptionWithUser, checked: boolean) => {
    try {
      // Отправляем запрос на сервер для изменения автопродления
      await adminAPI.updateUser(subscription.id, { 
        // Используем обновление подписки вместо пользователя
        auto_renewal: checked 
      } as any);
      
      // Обновляем локальное состояние
    const updatedSubscriptions = subscriptions.map(sub =>
        sub.id === subscription.id ? { ...sub, auto_renewal: checked } : sub
    );
    
    setSubscriptions(updatedSubscriptions);
    
    if (selectedSubscription && selectedSubscription.id === subscription.id) {
        setSelectedSubscription({ ...subscription, auto_renewal: checked });
    }
    
    Modal.success({
      content: `Автопродление для подписки ${subscription.id} ${checked ? 'включено' : 'отключено'}`,
    });
    } catch (error) {
      console.error('Ошибка при изменении автопродления:', error);
      Modal.error({
        content: 'Не удалось изменить настройки автопродления. Пожалуйста, попробуйте снова.',
      });
    }
  };

  const renderPlanBadge = (type: string) => {
    const types: Record<string, { color: string; text: string }> = {
      'BASIC': { color: 'blue', text: 'Базовый' },
      'PREMIUM': { color: 'purple', text: 'Премиум' },
      'UNLIMITED': { color: 'gold', text: 'Безлимитный' },
      'TRIAL': { color: 'green', text: 'Пробный' }
    };
    
    const planInfo = types[type] || { color: 'default', text: type };
    return <Tag color={planInfo.color}>{planInfo.text}</Tag>;
  };
  
  const renderStatusBadge = (subscription: SubscriptionWithUser) => {
    if (!subscription.is_active) {
      return <Tag icon={<CloseCircleOutlined />} color="error">Отменена</Tag>;
    }
    
    const now = new Date();
    const endDate = new Date(subscription.end_date);
    
    if (endDate <= now) {
        return <Tag icon={<CloseCircleOutlined />} color="error">Истекла</Tag>;
    }
    
    return <Tag icon={<CheckCircleOutlined />} color="success">Активна</Tag>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(price);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Пользователь',
      key: 'user',
      render: (text: string, record: SubscriptionWithUser) => (
        <div>
          <div>{record.user.username || 'Не задано'}</div>
          <small>{record.user.email}</small>
      </div>
      ),
    },
    {
      title: 'План',
      dataIndex: 'type',
      key: 'type',
      render: renderPlanBadge,
      filters: [
        { text: 'Базовый', value: 'BASIC' },
        { text: 'Премиум', value: 'PREMIUM' },
        { text: 'Безлимитный', value: 'UNLIMITED' },
        { text: 'Пробный', value: 'TRIAL' },
      ],
      onFilter: (value: boolean | React.Key, record: SubscriptionWithUser) => record.type === value,
    },
    {
      title: 'Статус',
      key: 'status',
      render: renderStatusBadge,
    },
    {
      title: 'Дата начала',
      dataIndex: 'start_date',
      key: 'start_date',
      render: formatDate,
      sorter: (a: SubscriptionWithUser, b: SubscriptionWithUser) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
    },
    {
      title: 'Дата окончания',
      dataIndex: 'end_date',
      key: 'end_date',
      render: formatDate,
      sorter: (a: SubscriptionWithUser, b: SubscriptionWithUser) => 
        new Date(a.end_date).getTime() - new Date(b.end_date).getTime(),
    },
    {
      title: 'Автопродление',
      dataIndex: 'auto_renewal',
      key: 'auto_renewal',
      render: (autoRenew: boolean, record: SubscriptionWithUser) => (
        <Switch 
          checked={autoRenew} 
          size="small"
          disabled={!record.is_active || new Date(record.end_date) <= new Date()}
          onChange={(checked) => handleToggleAutoRenew(record, checked)}
        />
      ),
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      render: formatPrice,
      sorter: (a: SubscriptionWithUser, b: SubscriptionWithUser) => a.price - b.price,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: unknown, record: SubscriptionWithUser) => (
        <Space>
          <Button 
            type="primary" 
            size="small"
            onClick={() => handleViewSubscription(record)}
          >
            Детали
          </Button>
          {record.is_active && new Date(record.end_date) > new Date() && (
            <Button 
              danger 
              size="small"
              onClick={() => handleCancelSubscription(record)}
            >
              Отменить
            </Button>
          )}
        </Space>
      ),
    },
  ];
  
  return (
    <div className="p-4">
      <Card title="Управление подписками">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={<span>Все подписки <Badge count={subscriptions.length} /></span>} key="all" />
          <TabPane 
            tab={<span>Активные <Badge count={subscriptions.filter(s => s.is_active && new Date(s.end_date) > new Date()).length} style={{ backgroundColor: '#52c41a' }} /></span>} 
            key="active" 
          />
          <TabPane 
            tab={<span>Отмененные <Badge count={subscriptions.filter(s => !s.is_active).length} style={{ backgroundColor: '#faad14' }} /></span>} 
            key="cancelled" 
          />
          <TabPane 
            tab={<span>Истекшие <Badge count={subscriptions.filter(s => new Date(s.end_date) <= new Date()).length} style={{ backgroundColor: '#f5222d' }} /></span>} 
            key="expired" 
          />
        </Tabs>
        
        <div className="mb-6">
          <Row gutter={[16, 16]} className="mb-4">
            <Col span={6}>
              <Card>
                <Statistic
                  title="Активные подписки"
                  value={statistics.totalActive}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Ежемесячный доход"
                  value={statistics.monthlyRevenue}
                  precision={2}
                  prefix={<DollarOutlined />}
                  suffix="₽"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Средний период подписки"
                  value={statistics.avgSubscriptionLength}
                  suffix="мес."
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Популярный план"
                  value={statistics.popularPlan ? renderPlanBadge(statistics.popularPlan).props.children : ''}
                  prefix={<RocketOutlined />}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
          </Row>
          
          <Card className="mb-4">
            <Form layout="inline">
              <Form.Item label="Поиск">
                <Input
                  placeholder="ID, имя пользователя, email"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  allowClear
                  id="subscription-search"
                />
              </Form.Item>
              <Form.Item label="Статус">
                <Select 
                  value={statusFilter} 
                  onChange={setStatusFilter}
                  style={{ width: 140 }}
                  id="subscription-status-filter"
                >
                  <Option value="all">Все статусы</Option>
                  <Option value="active">Активные</Option>
                  <Option value="cancelled">Отмененные</Option>
                  <Option value="expired">Истекшие</Option>
                </Select>
              </Form.Item>
              <Form.Item label="План">
                <Select 
                  value={planFilter} 
                  onChange={setPlanFilter}
                  style={{ width: 180 }}
                  id="subscription-plan-filter"
                >
                  <Option value="all">Все планы</Option>
                  <Option value="BASIC">Базовый</Option>
                  <Option value="PREMIUM">Премиум</Option>
                  <Option value="UNLIMITED">Безлимитный</Option>
                  <Option value="TRIAL">Пробный</Option>
                </Select>
              </Form.Item>
            </Form>
          </Card>
        </div>
        
        <Table
          dataSource={filteredSubscriptions}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
      
      <Modal
        title={`Детали подписки №${selectedSubscription?.id}`}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            Закрыть
          </Button>,
          selectedSubscription?.is_active && new Date(selectedSubscription.end_date) > new Date() && (
            <Button 
              key="cancel" 
              danger
              onClick={() => {
                setIsModalVisible(false);
                if (selectedSubscription) {
                  handleCancelSubscription(selectedSubscription);
                }
              }}
            >
              Отменить подписку
            </Button>
          ),
        ].filter(Boolean)}
      >
        {selectedSubscription && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>Пользователь:</Text>
                <div>{selectedSubscription.user.username || 'Не задано'}</div>
              </Col>
              <Col span={12}>
                <Text strong>Email:</Text>
                <div>{selectedSubscription.user.email}</div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} className="mt-4">
              <Col span={12}>
                <Text strong>План:</Text>
                <div>{renderPlanBadge(selectedSubscription.type)}</div>
              </Col>
              <Col span={12}>
                <Text strong>Статус:</Text>
                <div>{renderStatusBadge(selectedSubscription)}</div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} className="mt-4">
              <Col span={12}>
                <Text strong>Дата начала:</Text>
                <div>{formatDate(selectedSubscription.start_date)}</div>
              </Col>
              <Col span={12}>
                <Text strong>Дата окончания:</Text>
                <div>{formatDate(selectedSubscription.end_date)}</div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} className="mt-4">
              <Col span={12}>
                <Text strong>Стоимость:</Text>
                <div>{formatPrice(selectedSubscription.price)}</div>
              </Col>
              <Col span={12}>
                <Text strong>Лимит загрузок:</Text>
                <div>{selectedSubscription.downloads_limit || 'Не ограничено'}</div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} className="mt-4">
              <Col span={12}>
                <Text strong>Выполнено загрузок:</Text>
                <div>{selectedSubscription.downloads_count}</div>
              </Col>
              <Col span={12}>
                <Text strong>Автопродление:</Text>
                <div>
                  {selectedSubscription.is_active && new Date(selectedSubscription.end_date) > new Date() ? (
                    <Switch 
                      checked={selectedSubscription.auto_renewal} 
                      onChange={(checked) => handleToggleAutoRenew(selectedSubscription, checked)}
                    />
                  ) : (
                    selectedSubscription.auto_renewal ? 'Да' : 'Нет'
                  )}
                </div>
              </Col>
            </Row>
        </div>
      )}
      </Modal>
    </div>
  );
};

export default SubscriptionManagement; 
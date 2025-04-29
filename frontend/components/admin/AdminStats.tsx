'use client';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, Table, DatePicker, Button, Select, Tabs, Typography } from 'antd';
import { UserOutlined, DownloadOutlined, DollarOutlined, ShoppingOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';
import { adminAPI } from '@/lib/api';
import { PaymentStatus } from '../../types';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalDownloads: number;
  totalRevenue: number;
  newUsersToday: number;
  downloadsToday: number;
  revenueToday: number;
  userGrowth: number;
  downloadGrowth: number;
  revenueGrowth: number;
}

interface SubscriptionStat {
  type: string;
  count: number;
  percentage: number;
}

const AdminStats: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStat[]>([]);
  const [period, setPeriod] = useState('month');
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Получаем пользователей, подписки, загрузки из API
        const usersPromise = adminAPI.getAllUsers();
        const subscriptionsPromise = adminAPI.getAllSubscriptions();
        const paymentsPromise = adminAPI.getAllPayments();
        
        const [users, subscriptions, payments] = await Promise.all([
          usersPromise.catch(() => []), 
          subscriptionsPromise.catch(() => []), 
          paymentsPromise.catch(() => [])
        ]);
        
        // Подсчет активных подписок
        const activeSubscriptions = subscriptions.filter(sub => 
          sub.end_date && new Date(sub.end_date) > new Date() && sub.is_active === 1
        ).length;
        
        // Подсчитываем общий доход
        const totalRevenue = payments
          .filter(payment => payment.status === PaymentStatus.COMPLETED)
          .reduce((sum, payment) => sum + payment.amount, 0);
        
        // Создаем статистику подписок по типам
        const subscriptionTypes = subscriptions.reduce((acc, sub) => {
          const type = sub.type;
          if (!acc[type]) acc[type] = 0;
          acc[type]++;
          return acc;
        }, {} as {[key: string]: number});
        
        const subscriptionStats = Object.entries(subscriptionTypes).map(([type, count]) => ({
          type,
          count,
          percentage: Math.round((count / subscriptions.length) * 100) || 0
        }));
        
        // Формируем финальную статистику
        const dashboardStats: DashboardStats = {
          totalUsers: users.length,
          activeSubscriptions,
          totalDownloads: 0, // Здесь должно быть получение из API
          totalRevenue,
          newUsersToday: users.filter(user => 
            new Date(user.created_at).toDateString() === new Date().toDateString()
          ).length,
          downloadsToday: 0, // Здесь должно быть получение из API
          revenueToday: payments
            .filter(payment => 
              new Date(payment.created_at).toDateString() === new Date().toDateString() 
              && payment.status === PaymentStatus.COMPLETED
            )
            .reduce((sum, payment) => sum + payment.amount, 0),
          userGrowth: 5, // Здесь должен быть расчет, пока заглушка
          downloadGrowth: 3,
          revenueGrowth: 7
        };
        
        setStats(dashboardStats);
        setSubscriptionStats(subscriptionStats);
      } catch (error) {
        console.error('Ошибка при загрузке статистики:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [period]);
  
  if (loading || !stats) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
        <Spin size="large" />
      </div>
    );
  }
  
  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={4}>Общая статистика</Title>
        <Select 
          value={period} 
          onChange={setPeriod}
          style={{ width: 120 }}
        >
          <Option value="day">День</Option>
          <Option value="week">Неделя</Option>
          <Option value="month">Месяц</Option>
          <Option value="year">Год</Option>
        </Select>
      </div>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Всего пользователей"
              value={stats.totalUsers}
              prefix={<UserOutlined />}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  <span style={{ color: stats.userGrowth >= 0 ? '#3f8600' : '#cf1322' }}>
                    {stats.userGrowth >= 0 ? <RiseOutlined /> : <FallOutlined />}
                    {" "}
                    {Math.abs(stats.userGrowth)}%
                  </span>
                </Text>
              }
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Новых сегодня: {stats.newUsersToday}</Text>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Активных подписок"
              value={stats.activeSubscriptions}
              prefix={<ShoppingOutlined />}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Процент от пользователей: {Math.round((stats.activeSubscriptions / stats.totalUsers) * 100) || 0}%</Text>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Всего загрузок"
              value={stats.totalDownloads}
              prefix={<DownloadOutlined />}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  <span style={{ color: stats.downloadGrowth >= 0 ? '#3f8600' : '#cf1322' }}>
                    {stats.downloadGrowth >= 0 ? <RiseOutlined /> : <FallOutlined />}
                    {" "}
                    {Math.abs(stats.downloadGrowth)}%
                  </span>
                </Text>
              }
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Сегодня: {stats.downloadsToday}</Text>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Общий доход"
              value={stats.totalRevenue}
              precision={2}
              prefix={<DollarOutlined />}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  <span style={{ color: stats.revenueGrowth >= 0 ? '#3f8600' : '#cf1322' }}>
                    {stats.revenueGrowth >= 0 ? <RiseOutlined /> : <FallOutlined />}
                    {" "}
                    {Math.abs(stats.revenueGrowth)}%
                  </span>
                </Text>
              }
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Сегодня: {stats.revenueToday.toFixed(2)} руб.</Text>
            </div>
          </Card>
        </Col>
      </Row>
      
      <div style={{ marginTop: 32, marginBottom: 16 }}>
        <Title level={4}>Распределение подписок</Title>
      </div>
      
      <Table 
        dataSource={subscriptionStats}
        rowKey="type"
        pagination={false}
        columns={[
          {
            title: 'Тип подписки',
            dataIndex: 'type',
            key: 'type',
            render: (type) => {
              const types = {
                'BASIC': 'Базовая',
                'PREMIUM': 'Премиум',
                'UNLIMITED': 'Безлимитная',
                'TRIAL': 'Пробная'
              };
              return types[type as keyof typeof types] || type;
            }
          },
          {
            title: 'Количество',
            dataIndex: 'count',
            key: 'count',
          },
          {
            title: 'Процент',
            dataIndex: 'percentage',
            key: 'percentage',
            render: (text: number) => `${text}%`,
          }
        ]}
      />
      
      <Row gutter={[16, 16]} style={{ marginTop: 32 }}>
        <Col span={24}>
          <Card title="Общая активность" style={{ height: '300px' }}>
            <div style={{ textAlign: 'center', paddingTop: '100px' }}>
              <Text type="secondary">График активности пользователей будет здесь</Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminStats; 
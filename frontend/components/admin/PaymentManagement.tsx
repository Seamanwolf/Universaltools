'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, DatePicker, Space, Typography, Tabs, Statistic, Row, Col, Badge, Tooltip, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ExclamationCircleOutlined, UserOutlined, RocketOutlined, CalendarOutlined, DollarOutlined, SearchOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { adminAPI } from '@/lib/api';
import dayjs from 'dayjs';
import { PaymentStatus } from '@/types';

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;
const { RangePicker } = DatePicker;

interface Payment {
  id: number;
  transaction_id: string;
  user_id: number;
  subscription_id?: number;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

interface User {
  id: number;
  email: string;
  username: string;
}

interface PaymentWithUser extends Payment {
  user: User;
}

const PaymentManagement: React.FC = () => {
  const [payments, setPayments] = useState<PaymentWithUser[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('');
  const [detailPayment, setDetailPayment] = useState<PaymentWithUser | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [statistics, setStatistics] = useState({
    totalRevenue: 0,
    averageAmount: 0,
    completedPayments: 0,
    pendingPayments: 0,
  });
  
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        
        // Получаем данные платежей и пользователей
        const [paymentsData, usersData] = await Promise.all([
          adminAPI.getAllPayments().catch(() => []),
          adminAPI.getAllUsers().catch(() => [])
        ]);
        
        // Создаем отображение userId -> user
        const usersMap = usersData.reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {} as Record<number, User>);
        
        // Объединяем данные платежей с данными пользователей
        const enhancedPayments = paymentsData.map(payment => {
          const user = usersMap[payment.user_id] || {
            id: payment.user_id,
            email: 'неизвестно',
            username: 'неизвестно'
          };
        
        return {
            ...payment,
            user
        };
        }) as PaymentWithUser[];
    
        // Рассчитываем статистику
        const completedPayments = enhancedPayments.filter(p => p.status === PaymentStatus.COMPLETED);
        const pendingPayments = enhancedPayments.filter(p => p.status === PaymentStatus.PENDING);
        
        const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);
        const averageAmount = completedPayments.length > 0 
          ? totalRevenue / completedPayments.length 
          : 0;
    
    setStatistics({
      totalRevenue,
          averageAmount,
          completedPayments: completedPayments.length,
          pendingPayments: pendingPayments.length
    });
    
        setPayments(enhancedPayments);
        setFilteredPayments(enhancedPayments);
        setLoading(false);
      } catch (error) {
        console.error('Ошибка при загрузке платежей:', error);
      setLoading(false);
      }
    };
    
    fetchPayments();
  }, []);
  
  useEffect(() => {
    filterPayments();
  }, [searchText, dateRange, statusFilter, methodFilter, payments]);
  
  const filterPayments = () => {
    let filtered = [...payments];
    
    // Фильтр по строке поиска
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        payment => 
          payment.transaction_id.toLowerCase().includes(searchLower) ||
          payment.user.email.toLowerCase().includes(searchLower) ||
          payment.user.username.toLowerCase().includes(searchLower)
      );
    }
    
    // Фильтр по дате
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');
      
      filtered = filtered.filter(payment => {
        const paymentDate = dayjs(payment.created_at);
        return paymentDate.isAfter(startDate) && paymentDate.isBefore(endDate);
      });
    }
    
    // Фильтр по статусу
    if (statusFilter) {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }
    
    // Фильтр по методу оплаты
    if (methodFilter) {
      filtered = filtered.filter(payment => payment.payment_method === methodFilter);
    }
    
    setFilteredPayments(filtered);
  };
  
  const handleViewPayment = (payment: PaymentWithUser) => {
    setDetailPayment(payment);
    setIsModalVisible(true);
  };
  
  const handleUpdateStatus = async (payment: PaymentWithUser, newStatus: string) => {
    try {
      // Отправляем запрос на сервер для обновления статуса платежа
      await adminAPI.updateUser(payment.id, { status: newStatus } as any);
      
      // Обновляем локальное состояние
          const updatedPayments = payments.map(p => 
        p.id === payment.id ? { ...p, status: newStatus } : p
          );
      
          setPayments(updatedPayments);
          
      if (detailPayment && detailPayment.id === payment.id) {
        setDetailPayment({ ...payment, status: newStatus });
          }
          
      message.success(`Статус платежа ${payment.transaction_id} успешно обновлен`);
    } catch (error) {
      console.error('Ошибка при обновлении статуса платежа:', error);
      message.error('Не удалось обновить статус платежа');
    }
  };
  
  const renderStatusTag = (status: string) => {
    switch (status) {
      case PaymentStatus.COMPLETED:
        return <Tag icon={<CheckCircleOutlined />} color="success">Выполнен</Tag>;
      case PaymentStatus.PENDING:
        return <Tag icon={<QuestionCircleOutlined />} color="processing">Ожидание</Tag>;
      case PaymentStatus.FAILED:
        return <Tag icon={<CloseCircleOutlined />} color="error">Ошибка</Tag>;
      case 'REFUNDED':
        return <Tag color="warning">Возврат</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };
  
  const renderPaymentMethod = (method: string) => {
    switch (method) {
      case 'CARD':
        return <Tag color="blue">Карта</Tag>;
      case 'BANK_TRANSFER':
        return <Tag color="purple">Банк</Tag>;
      case 'ADMIN_MANUAL':
        return <Tag color="gold">Вручную</Tag>;
      default:
        return <Tag>{method}</Tag>;
    }
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(amount);
  };

  const columns = [
    {
      title: 'ID транзакции',
      dataIndex: 'transaction_id',
      key: 'transaction_id',
      width: 200,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text.length > 20 ? `${text.substring(0, 20)}...` : text}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Пользователь',
      key: 'user',
      render: (_: any, record: PaymentWithUser) => (
        <div>
          <div>{record.user.username || 'Не задано'}</div>
          <small>{record.user.email}</small>
      </div>
      ),
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => formatPrice(amount),
      sorter: (a: PaymentWithUser, b: PaymentWithUser) => a.amount - b.amount,
    },
    {
      title: 'Способ оплаты',
      dataIndex: 'payment_method',
      key: 'payment_method',
      render: renderPaymentMethod,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: renderStatusTag,
    },
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'created_at',
      render: formatDate,
      sorter: (a: PaymentWithUser, b: PaymentWithUser) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: PaymentWithUser) => (
        <Space>
          <Button 
            type="primary" 
            size="small" 
            onClick={() => handleViewPayment(record)}
          >
            Детали
          </Button>
          {record.status === PaymentStatus.PENDING && (
            <>
              <Button 
                type="primary" 
                size="small"
                onClick={() => handleUpdateStatus(record, PaymentStatus.COMPLETED)}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Подтвердить
              </Button>
            <Button 
              danger 
              size="small" 
                onClick={() => handleUpdateStatus(record, PaymentStatus.FAILED)}
            >
                Отклонить
            </Button>
            </>
          )}
        </Space>
      ),
    },
  ];
  
  const handleDateRangeChange = (dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null) => {
    if (dates) {
      setDateRange(dates);
    } else {
      setDateRange(null);
    }
  };
  
  return (
    <div className="p-4">
      <Card title="Управление платежами">
          <Row gutter={[16, 16]} className="mb-4">
            <Col span={6}>
              <Card>
                <Statistic
                  title="Общий доход"
                  value={statistics.totalRevenue}
                  precision={2}
                prefix={<DollarOutlined />}
                suffix="₽"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                title="Средний платеж"
                value={statistics.averageAmount}
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
                title="Выполненные платежи"
                value={statistics.completedPayments}
                  prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                title="Ожидающие платежи"
                value={statistics.pendingPayments}
                prefix={<QuestionCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
          </Row>
          
        <Card className="mb-4">
                <Form layout="inline">
                  <Form.Item label="Поиск">
                    <Input
                placeholder="ID транзакции, email, имя"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                      prefix={<SearchOutlined />}
                      allowClear
                id="payment-search"
              />
            </Form.Item>
            <Form.Item label="Период">
              <RangePicker 
                value={dateRange} 
                onChange={handleDateRangeChange}
                id="payment-date-range"
                    />
                  </Form.Item>
                  <Form.Item label="Статус">
                    <Select 
                      value={statusFilter} 
                      onChange={setStatusFilter}
                      style={{ width: 140 }}
                      allowClear
                      placeholder="Все статусы"
                      id="payment-status-filter"
                    >
                      <Option value={PaymentStatus.COMPLETED}>Выполнен</Option>
                      <Option value={PaymentStatus.PENDING}>Ожидание</Option>
                      <Option value={PaymentStatus.FAILED}>Ошибка</Option>
                      <Option value="REFUNDED">Возврат</Option>
                    </Select>
                  </Form.Item>
            <Form.Item label="Метод оплаты">
              <Select 
                value={methodFilter} 
                onChange={setMethodFilter}
                style={{ width: 140 }}
                allowClear
                placeholder="Все методы"
                id="payment-method-filter"
              >
                <Option value="CARD">Карта</Option>
                <Option value="BANK_TRANSFER">Банк</Option>
                <Option value="ADMIN_MANUAL">Вручную</Option>
              </Select>
            </Form.Item>
                </Form>
              </Card>
        
        <Table
          dataSource={filteredPayments}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
      
      <Modal
        title="Детали платежа"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalVisible(false)}>
                Закрыть
          </Button>,
          detailPayment?.status === PaymentStatus.PENDING && (
            <>
              <Button 
                key="confirm" 
                type="primary" 
                onClick={() => {
                  if (detailPayment) {
                    handleUpdateStatus(detailPayment, PaymentStatus.COMPLETED);
                  }
                  setIsModalVisible(false);
                }}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Подтвердить платеж
              </Button>
            <Button 
                key="reject" 
              danger 
                onClick={() => {
                  if (detailPayment) {
                    handleUpdateStatus(detailPayment, PaymentStatus.FAILED);
                }
                  setIsModalVisible(false);
              }}
            >
                Отклонить платеж
            </Button>
            </>
          ),
        ].filter(Boolean)}
      >
        {detailPayment && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>ID транзакции:</Text>
                <div>{detailPayment.transaction_id}</div>
              </Col>
              <Col span={12}>
                <Text strong>Сумма:</Text>
                <div>{formatPrice(detailPayment.amount)}</div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Text strong>Пользователь:</Text>
                <div>{detailPayment.user.username || 'Не задано'}</div>
              </Col>
              <Col span={12}>
                <Text strong>Email:</Text>
                <div>{detailPayment.user.email}</div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Text strong>Дата платежа:</Text>
                <div>{formatDate(detailPayment.created_at)}</div>
              </Col>
              <Col span={12}>
                <Text strong>Способ оплаты:</Text>
                <div>{renderPaymentMethod(detailPayment.payment_method)}</div>
              </Col>
            </Row>
            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Text strong>Статус:</Text>
                <div>{renderStatusTag(detailPayment.status)}</div>
              </Col>
              <Col span={12}>
                <Text strong>ID подписки:</Text>
                <div>{detailPayment.subscription_id || 'Не связан с подпиской'}</div>
              </Col>
            </Row>
        </div>
      )}
      </Modal>
    </div>
  );
};

export default PaymentManagement; 
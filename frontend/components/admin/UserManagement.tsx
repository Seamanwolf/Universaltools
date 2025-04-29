'use client';

import React, { useState, useEffect } from 'react';
import { Table, Space, Button, Modal, Form, Input, Select, Tag, message, Tooltip, Card, Typography, Row, Col, Popconfirm, Badge, DatePicker, Timeline, Empty } from 'antd';
import { EditOutlined, DeleteOutlined, CheckCircleOutlined, StopOutlined, MailOutlined, SyncOutlined, GiftOutlined, HistoryOutlined } from '@ant-design/icons';
import { adminAPI } from '@/lib/api';
import { UserRole } from '@/types';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { Title } = Typography;

interface User {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified?: boolean;
  created_at: string;
  subscription_type?: string;
  downloads_count?: number;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [form] = Form.useForm();
  const [selectedUsers, setSelectedUsers] = useState<React.Key[]>([]);
  const [isSubscriptionModalVisible, setIsSubscriptionModalVisible] = useState(false);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [userForSubscription, setUserForSubscription] = useState<User | null>(null);
  const [userForHistory, setUserForHistory] = useState<User | null>(null);
  const [subscriptionForm] = Form.useForm();
  const [userEvents, setUserEvents] = useState<any[]>([]);
  const [showHistoryInModal, setShowHistoryInModal] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Загрузка пользователей
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Получаем пользователей из API
        const users = await adminAPI.getAllUsers();
        
        // Получаем все подписки, чтобы связать их с пользователями
        const subscriptions = await adminAPI.getAllSubscriptions().catch(() => []);
        
        // Создаем отображение userId -> subscription
        const userSubscriptions = subscriptions.reduce((acc, sub) => {
          if (!acc[sub.user_id]) acc[sub.user_id] = [];
          acc[sub.user_id].push(sub);
          return acc;
        }, {} as Record<number, any[]>);
        
        // Обогащаем пользователей данными о подписке
        const enhancedUsers = users.map(user => {
          const userSubs = userSubscriptions[user.id] || [];
          const activeSub = userSubs.find(sub => sub.is_active === 1 && new Date(sub.end_date) > new Date());
          
          return {
            ...user,
            is_email_verified: user.is_email_verified || false,
            subscription_type: activeSub ? activeSub.type : undefined,
            downloads_count: userSubs.reduce((sum, sub) => sum + (sub.downloads_count || 0), 0)
          };
        }) as User[];
        
        setUsers(enhancedUsers);
      } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
        message.error('Не удалось загрузить список пользователей');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  // Фильтрация пользователей по поиску
  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Редактирование пользователя
  const handleEditUser = (user: User) => {
    setCurrentUser(user);
    setShowHistoryInModal(false);
    form.setFieldsValue({
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    });
    setIsModalVisible(true);
  };
  
  // Подтверждение изменений пользователя
  const handleUpdateUser = async (values: any) => {
    if (!currentUser) return;
    
    try {
      // Отправка данных на сервер через API
      await adminAPI.updateUser(currentUser.id, values);
      
      // Обновляем локальное состояние
      const updatedUser = {
        ...currentUser,
        ...values
      };
      
      setUsers(users.map(user => user.id === currentUser.id ? updatedUser : user));
      
      message.success(`Пользователь ${updatedUser.username || updatedUser.email} успешно обновлен`);
      setIsModalVisible(false);
      setCurrentUser(null);
      form.resetFields();
    } catch (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      message.error('Не удалось обновить пользователя');
    }
  };
  
  // Удаление пользователя
  const handleDeleteUser = async (userId: number) => {
    try {
      // Удаление через API
      await adminAPI.deleteUser(userId);
      
      // Обновляем локальное состояние
      setUsers(users.filter(user => user.id !== userId));
      
      message.success('Пользователь успешно удален');
    } catch (error) {
      console.error('Ошибка при удалении пользователя:', error);
      message.error('Не удалось удалить пользователя');
    }
  };
  
  // Отправка письма для верификации
  const handleSendVerification = async (userId: number) => {
    try {
      // В реальном приложении здесь будет API запрос
      message.success('Письмо для верификации успешно отправлено');
    } catch (error) {
      console.error('Ошибка при отправке письма:', error);
      message.error('Не удалось отправить письмо для верификации');
    }
  };
  
  // Блокировка/разблокировка пользователя
  const handleToggleActive = async (user: User) => {
    try {
      // Обновление через API
      await adminAPI.updateUser(user.id, { is_active: !user.is_active });
      
      // Обновляем локальное состояние
      const updatedUser = {
        ...user,
        is_active: !user.is_active
      };
      
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
      
      message.success(`Пользователь ${user.username || user.email} успешно ${user.is_active ? 'заблокирован' : 'разблокирован'}`);
    } catch (error) {
      console.error('Ошибка при изменении статуса пользователя:', error);
      message.error('Не удалось изменить статус пользователя');
    }
  };
  
  // Добавление подписки пользователю
  const handleAddSubscription = (user: User) => {
    setUserForSubscription(user);
    subscriptionForm.resetFields();
    setIsSubscriptionModalVisible(true);
  };

  // Просмотр истории пользователя
  const handleViewHistory = async (user: User) => {
    try {
      setLoading(true);
      // Используем API метод для получения истории
      const events = await adminAPI.getUserHistory(user.id);
      setUserEvents(events);
      
      // Если вызвали из основной таблицы, отобразим историю в отдельном модальном окне
      if (!isModalVisible) {
        setUserForHistory(user);
        setIsHistoryModalVisible(true);
      } else {
        // Если вызвали из модального окна редактирования, переключаем режим отображения
        setShowHistoryInModal(true);
      }
    } catch (error) {
      console.error('Ошибка при получении истории пользователя:', error);
      message.error('Не удалось загрузить историю пользователя');
    } finally {
      setLoading(false);
    }
  };

  // Создание подписки для пользователя
  const handleCreateSubscription = async (values: any) => {
    if (!userForSubscription) return;
    
    try {
      const subscriptionData = {
        user_id: userForSubscription.id,
        type: values.type,
        start_date: values.period[0].toISOString(),
        end_date: values.period[1].toISOString(),
        is_active: 1,
        price: values.price,
        auto_renewal: values.auto_renewal
      };
      
      // Вызов API для создания подписки
      await adminAPI.createManualSubscription(userForSubscription.id, subscriptionData);
      
      message.success(`Подписка для пользователя ${userForSubscription.username || userForSubscription.email} успешно создана`);
      setIsSubscriptionModalVisible(false);
      setUserForSubscription(null);
      
      // Можно обновить список пользователей, чтобы отразить изменения
      // При необходимости можно добавить вызов функции, которая загружает данные заново
    } catch (error) {
      console.error('Ошибка при создании подписки:', error);
      message.error('Не удалось создать подписку');
    }
  };
  
  // Функция форматирования даты для отображения в истории
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Колонки таблицы
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Имя пользователя',
      dataIndex: 'username',
      key: 'username',
      render: (text: string) => text || 'Не задано',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text: string, record: User) => (
        <Space>
          {text}
          {record.is_email_verified ? (
            <Tooltip title="Email подтвержден">
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            </Tooltip>
          ) : (
            <Tooltip title="Email не подтвержден">
              <Badge status="warning" />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => (
        role === UserRole.ADMIN ? <Tag color="red">Администратор</Tag> : <Tag color="blue">Пользователь</Tag>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        isActive ? <Tag color="green">Активен</Tag> : <Tag color="red">Заблокирован</Tag>
      ),
    },
    {
      title: 'Подписка',
      dataIndex: 'subscription_type',
      key: 'subscription_type',
      render: (type: string | undefined, record: User) => {
        const types = {
          'TRIAL': { color: 'purple', text: 'Пробная' },
          'BASIC': { color: 'blue', text: 'Базовая' },
          'PREMIUM': { color: 'green', text: 'Премиум' },
          'UNLIMITED': { color: 'gold', text: 'Безлимитная' }
        };
        
        const content = !type ? (
          <Tag color="default">Нет</Tag>
        ) : (
          <Tag color={types[type as keyof typeof types]?.color || 'default'}>
            {types[type as keyof typeof types]?.text || type}
          </Tag>
        );
        
        return (
          <a onClick={() => handleAddSubscription(record)}>
            {content}
          </a>
        );
      },
    },
    {
      title: 'Загрузки',
      dataIndex: 'downloads_count',
      key: 'downloads_count',
      render: (count: number | undefined) => count || 0,
    },
    {
      title: 'Создан',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU')
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: unknown, record: User) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => handleEditUser(record)}
            title="Редактировать"
          />
          <Button
            type="link"
            icon={record.is_active ? <StopOutlined /> : <CheckCircleOutlined />}
            onClick={() => handleToggleActive(record)}
            title={record.is_active ? "Заблокировать" : "Разблокировать"}
            style={{ color: record.is_active ? '#ff4d4f' : '#52c41a' }}
          />
          {!record.is_email_verified && (
            <Button 
              type="link"
              icon={<MailOutlined />}
              onClick={() => handleSendVerification(record.id)}
              title="Отправить письмо для верификации"
            />
          )}
          <Popconfirm
            title="Вы уверены, что хотите удалить этого пользователя?"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />} 
              title="Удалить"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];
  
  return (
    <div>
    <Card>
        <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Search
            placeholder="Поиск по имени пользователя или email"
              onSearch={(value) => setSearchTerm(value)}
              enterButton
              allowClear
          />
        </Col>
      </Row>
      
      <Table 
          rowSelection={{
            type: 'checkbox',
            onChange: (selectedRowKeys) => {
              setSelectedUsers(selectedRowKeys);
            }
          }}
          dataSource={filteredUsers}
        columns={columns} 
        rowKey="id" 
        loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
      />
      </Card>
      
      <Modal
        title={showHistoryInModal 
          ? `История действий: ${currentUser?.username || ''}` 
          : `Редактирование пользователя: ${currentUser?.username || ''}`}
        visible={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setShowHistoryInModal(false);
          form.resetFields();
        }}
        footer={[
          <Button 
            key="history" 
            onClick={() => {
              if (showHistoryInModal) {
                setShowHistoryInModal(false);
              } else {
                handleViewHistory(currentUser!);
              }
            }}
            icon={showHistoryInModal ? <EditOutlined /> : <HistoryOutlined />}
          >
            {showHistoryInModal ? 'Редактировать' : 'История'}
          </Button>,
          <Button 
            key="cancel" 
            onClick={() => {
              setIsModalVisible(false);
              setShowHistoryInModal(false);
              form.resetFields();
            }}
          >
            Отмена
          </Button>,
          !showHistoryInModal && (
          <Button 
            key="submit" 
            type="primary" 
            onClick={() => form.submit()}
          >
            Сохранить
          </Button>
          )
        ]}
      >
        {showHistoryInModal ? (
          // Отображаем историю действий пользователя
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {userEvents.length > 0 ? (
              <Timeline
                mode="left"
                items={userEvents.map(event => ({
                  color: 'blue',
                  label: formatEventDate(event.date),
                  children: (
                    <React.Fragment>
                      <div><strong>{event.event}:</strong> {event.details}</div>
                    </React.Fragment>
                  )
                }))}
              />
            ) : (
              <Empty description="История действий не найдена" />
            )}
          </div>
        ) : (
          // Отображаем форму редактирования пользователя
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateUser}
        >
          <Form.Item
            name="username"
            label="Имя пользователя"
            rules={[{ required: true, message: 'Пожалуйста, введите имя пользователя' }]}
          >
              <Input id="username" />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Пожалуйста, введите email' },
              { type: 'email', message: 'Пожалуйста, введите корректный email' }
            ]}
          >
              <Input id="email" />
          </Form.Item>
          
          <Form.Item
            name="role"
            label="Роль"
            rules={[{ required: true, message: 'Пожалуйста, выберите роль' }]}
          >
              <Select id="role">
                <Option value={UserRole.USER}>Пользователь</Option>
                <Option value={UserRole.ADMIN}>Администратор</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="is_active"
            label="Статус"
            valuePropName="checked"
          >
              <Select id="is_active">
              <Option value={true}>Активен</Option>
              <Option value={false}>Заблокирован</Option>
              </Select>
            </Form.Item>
          </Form>
        )}
      </Modal>
      
      {/* Модальное окно для добавления подписки */}
      <Modal
        title="Назначение подписки"
        open={isSubscriptionModalVisible}
        onCancel={() => {
          setIsSubscriptionModalVisible(false);
          setUserForSubscription(null);
          subscriptionForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={subscriptionForm}
          layout="vertical"
          onFinish={handleCreateSubscription}
        >
          {userForSubscription && (
            <Form.Item label="Пользователь">
              <span>{userForSubscription.email} ({userForSubscription.username})</span>
            </Form.Item>
          )}
          
          <Form.Item
            name="type"
            label="Тип подписки"
            rules={[{ required: true, message: 'Пожалуйста, выберите тип подписки' }]}
          >
            <Select id="subscription-type">
              <Option value="TRIAL">Пробная</Option>
              <Option value="BASIC">Базовая</Option>
              <Option value="PREMIUM">Премиум</Option>
              <Option value="UNLIMITED">Безлимитная</Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="period"
            label="Период действия"
            rules={[{ required: true, message: 'Пожалуйста, выберите период действия' }]}
          >
            <DatePicker.RangePicker id="subscription-period" />
          </Form.Item>
          
          <Form.Item
            name="price"
            label="Стоимость"
            rules={[{ required: true, message: 'Пожалуйста, укажите стоимость' }]}
          >
            <Input type="number" id="subscription-price" />
          </Form.Item>
          
          <Form.Item
            name="auto_renewal"
            label="Автопродление"
            valuePropName="checked"
          >
            <Select id="subscription-auto-renewal">
              <Option value={true}>Включено</Option>
              <Option value={false}>Отключено</Option>
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Создать подписку
            </Button>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Модальное окно для просмотра истории пользователя */}
      <Modal
        title={`История пользователя ${userForHistory?.username || userForHistory?.email || ''}`}
        open={isHistoryModalVisible}
        onCancel={() => {
          setIsHistoryModalVisible(false);
          setUserForHistory(null);
        }}
        footer={[
          <Button key="close" onClick={() => setIsHistoryModalVisible(false)}>
            Закрыть
          </Button>
        ]}
      >
        <Timeline>
          {userEvents.map((event, index) => (
            <Timeline.Item key={index}>
              <p><strong>{new Date(event.date).toLocaleDateString('ru-RU')}</strong></p>
              <p><strong>{event.event}:</strong> {event.details}</p>
            </Timeline.Item>
          ))}
        </Timeline>
      </Modal>
    </div>
  );
};

export default UserManagement; 
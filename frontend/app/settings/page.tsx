'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Form, 
  Input, 
  Tabs, 
  Avatar, 
  message, 
  Divider, 
  Space, 
  Alert,
  Row,
  Col,
  Switch
} from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  SaveOutlined, 
  MailOutlined,
  BellOutlined,
  CheckOutlined,
  LoadingOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ClientOnly from '@/components/ClientOnly';
import { useAuth } from '@/contexts/AuthContext';

const NavBar = dynamic(() => import('@/components/NavBar'), { ssr: false });

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const SettingsPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      message.error('Необходимо авторизоваться для доступа к настройкам');
      router.push('/');
      return;
    }

    // Инициализируем форму данными пользователя
    if (user) {
      profileForm.setFieldsValue({
        username: user.username,
        fullName: user.full_name || '',
        phone: user.phone || '',
        bio: user.bio || '',
        emailNotifications: user.email_notifications !== false,
      });
    }
  }, [user, isAuthenticated, router, profileForm]);

  const handleProfileUpdate = async (values: any) => {
    setLoading(true);
    try {
      // Здесь был бы API запрос для обновления профиля
      // await videoAPI.updateProfile(values);
      
      // Имитация задержки API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProfileUpdateSuccess(true);
      message.success('Профиль успешно обновлен');
    } catch (error) {
      console.error('Ошибка при обновлении профиля:', error);
      message.error('Не удалось обновить профиль');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (values: any) => {
    setLoading(true);
    try {
      // Проверяем, совпадают ли пароли
      if (values.newPassword !== values.confirmPassword) {
        message.error('Пароли не совпадают');
        return;
      }
      
      // Здесь был бы API запрос для изменения пароля
      // await videoAPI.changePassword(values.currentPassword, values.newPassword);
      
      // Имитация задержки API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      passwordForm.resetFields();
      setPasswordChangeSuccess(true);
      message.success('Пароль успешно изменен');
    } catch (error) {
      console.error('Ошибка при изменении пароля:', error);
      message.error('Не удалось изменить пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ClientOnly>
        <NavBar />
      </ClientOnly>
      
      <div className="flex min-h-screen flex-col items-center">
        <div className="container mx-auto px-4 py-8">
          <Title level={2} className="text-center mb-8">
            <LockOutlined /> Настройки приложения
          </Title>

          <Row gutter={[24, 24]}>
            <Col xs={24} md={6}>
              <Card>
                <div className="flex flex-col items-center text-center">
                  <Avatar 
                    size={100} 
                    icon={<UserOutlined />} 
                    src={user?.avatar} 
                    style={{ backgroundColor: '#1890ff' }}
                  />
                  <Title level={4} className="mt-4 mb-0">{user?.username}</Title>
                  <Text type="secondary">{user?.email}</Text>
                  
                  {user?.role && (
                    <div className="mt-2">
                      <span className={`px-2 py-1 rounded text-xs ${user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                        {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                      </span>
                    </div>
                  )}
                </div>
                
                <Divider />
                
                <div>
                  <Button 
                    block 
                    type={activeTab === 'profile' ? 'primary' : 'text'} 
                    className="text-left mb-2"
                    onClick={() => setActiveTab('profile')}
                  >
                    <UserOutlined className="mr-2" /> Основные настройки
                  </Button>
                  <Button 
                    block 
                    type={activeTab === 'password' ? 'primary' : 'text'} 
                    className="text-left mb-2"
                    onClick={() => setActiveTab('password')}
                  >
                    <LockOutlined className="mr-2" /> Изменение пароля
                  </Button>
                  <Button 
                    block 
                    type={activeTab === 'notifications' ? 'primary' : 'text'} 
                    className="text-left"
                    onClick={() => setActiveTab('notifications')}
                  >
                    <BellOutlined className="mr-2" /> Уведомления
                  </Button>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} md={18}>
              <Card>
                <Tabs activeKey={activeTab} onChange={setActiveTab}>
                  <TabPane tab="Основные настройки" key="profile">
                    {profileUpdateSuccess && (
                      <Alert
                        message="Профиль обновлен"
                        description="Ваши данные успешно сохранены"
                        type="success"
                        showIcon
                        closable
                        className="mb-6"
                        onClose={() => setProfileUpdateSuccess(false)}
                      />
                    )}
                    
                    <Form
                      form={profileForm}
                      layout="vertical"
                      onFinish={handleProfileUpdate}
                      requiredMark={false}
                    >
                      <Form.Item
                        name="username"
                        label="Имя пользователя"
                        rules={[
                          { required: true, message: 'Пожалуйста, введите имя пользователя' },
                          { min: 3, message: 'Имя пользователя должно содержать минимум 3 символа' }
                        ]}
                      >
                        <Input prefix={<UserOutlined />} placeholder="Имя пользователя" />
                      </Form.Item>
                      
                      <Form.Item
                        name="fullName"
                        label="Полное имя"
                      >
                        <Input placeholder="Имя и фамилия" />
                      </Form.Item>
                      
                      <Form.Item
                        label="Email"
                      >
                        <Input prefix={<MailOutlined />} disabled value={user?.email} placeholder="Email" />
                        <div className="mt-1">
                          <Text type="secondary">Email нельзя изменить напрямую. Для смены email обратитесь в поддержку.</Text>
                        </div>
                      </Form.Item>
                      
                      <Form.Item
                        name="phone"
                        label="Телефон"
                      >
                        <Input placeholder="Номер телефона" />
                      </Form.Item>
                      
                      <Form.Item
                        name="bio"
                        label="О себе"
                      >
                        <Input.TextArea rows={4} placeholder="Краткая информация о себе" />
                      </Form.Item>
                      
                      <Form.Item>
                        <Button
                          type="primary"
                          htmlType="submit"
                          icon={loading ? <LoadingOutlined /> : <SaveOutlined />}
                          loading={loading}
                        >
                          Сохранить изменения
                        </Button>
                      </Form.Item>
                    </Form>
                  </TabPane>
                  
                  <TabPane tab="Изменение пароля" key="password">
                    {passwordChangeSuccess && (
                      <Alert
                        message="Пароль изменен"
                        description="Ваш пароль был успешно обновлен"
                        type="success"
                        showIcon
                        closable
                        className="mb-6"
                        onClose={() => setPasswordChangeSuccess(false)}
                      />
                    )}
                    
                    <Form
                      form={passwordForm}
                      layout="vertical"
                      onFinish={handlePasswordChange}
                      requiredMark={false}
                    >
                      <Form.Item
                        name="currentPassword"
                        label="Текущий пароль"
                        rules={[
                          { required: true, message: 'Пожалуйста, введите текущий пароль' }
                        ]}
                      >
                        <Input.Password 
                          prefix={<LockOutlined />} 
                          placeholder="Текущий пароль"
                          iconRender={visible => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                        />
                      </Form.Item>
                      
                      <Form.Item
                        name="newPassword"
                        label="Новый пароль"
                        rules={[
                          { required: true, message: 'Пожалуйста, введите новый пароль' },
                          { min: 8, message: 'Пароль должен содержать минимум 8 символов' }
                        ]}
                        hasFeedback
                      >
                        <Input.Password 
                          prefix={<LockOutlined />} 
                          placeholder="Новый пароль"
                          iconRender={visible => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                        />
                      </Form.Item>
                      
                      <Form.Item
                        name="confirmPassword"
                        label="Подтверждение пароля"
                        rules={[
                          { required: true, message: 'Пожалуйста, подтвердите пароль' },
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!value || getFieldValue('newPassword') === value) {
                                return Promise.resolve();
                              }
                              return Promise.reject(new Error('Пароли не совпадают!'));
                            },
                          }),
                        ]}
                        hasFeedback
                      >
                        <Input.Password 
                          prefix={<LockOutlined />} 
                          placeholder="Подтвердите новый пароль"
                          iconRender={visible => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                        />
                      </Form.Item>
                      
                      <Form.Item>
                        <Button
                          type="primary"
                          htmlType="submit"
                          icon={loading ? <LoadingOutlined /> : <SaveOutlined />}
                          loading={loading}
                        >
                          Изменить пароль
                        </Button>
                      </Form.Item>
                    </Form>
                  </TabPane>
                  
                  <TabPane tab="Уведомления" key="notifications">
                    <Form
                      form={profileForm}
                      layout="vertical"
                      onFinish={handleProfileUpdate}
                      requiredMark={false}
                    >
                      <Form.Item
                        name="emailNotifications"
                        valuePropName="checked"
                      >
                        <Space direction="vertical">
                          <Title level={5}>Email-уведомления</Title>
                          <Space>
                            <Switch defaultChecked={user?.email_notifications !== false} />
                            <span>Получать уведомления на email</span>
                          </Space>
                        </Space>
                      </Form.Item>
                      
                      <Divider />
                      
                      <Form.Item>
                        <Button
                          type="primary"
                          htmlType="submit"
                          icon={loading ? <LoadingOutlined /> : <SaveOutlined />}
                          loading={loading}
                        >
                          Сохранить настройки
                        </Button>
                      </Form.Item>
                    </Form>
                  </TabPane>
                </Tabs>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    </>
  );
};

export default SettingsPage; 
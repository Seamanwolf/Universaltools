'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Tabs, Typography, Divider, Alert, notification } from 'antd';
import { UserOutlined, LockOutlined, GoogleOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { TabPane } = Tabs;
const { Title } = Typography;

const AuthModal = ({ visible, onCancel, initialTab = 'login' }) => {
  const { login, register, error, loading } = useAuth();
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [localError, setLocalError] = useState('');
  
  // Обновляем активную вкладку при изменении initialTab
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setLocalError('');
  };

  const handleLogin = async (values) => {
    setLocalError('');
    const success = await login(values.email, values.password);
    if (success) {
      loginForm.resetFields();
      notification.success({
        message: 'Вход выполнен',
        description: 'Вы успешно вошли в систему.',
      });
      onCancel();
    }
  };

  const handleRegister = async (values) => {
    setLocalError('');
    if (values.password !== values.confirmPassword) {
      setLocalError('Пароли не совпадают');
      return;
    }
    
    const success = await register(values.email, values.username, values.password);
    if (success) {
      registerForm.resetFields();
      notification.success({
        message: 'Регистрация выполнена',
        description: 'Вы успешно зарегистрировались и вошли в систему.',
      });
      onCancel();
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/google/login');
      const data = await response.json();
      window.location.href = data.url;
    } catch (err) {
      console.error('Ошибка при входе через Google:', err);
      setLocalError('Ошибка при входе через Google. Пожалуйста, попробуйте позже.');
    }
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={420}
      destroyOnClose
    >
      <Tabs activeKey={activeTab} onChange={handleTabChange} centered>
        <TabPane tab="Вход" key="login">
          <Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>
            Вход в систему
          </Title>
          
          {(localError || error) && (
            <Alert
              message="Ошибка входа"
              description={localError || error}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          
          <Form
            form={loginForm}
            name="login"
            onFinish={handleLogin}
            layout="vertical"
            initialValues={{ remember: true }}
            preserve={false}
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Пожалуйста, введите email' },
                { type: 'email', message: 'Пожалуйста, введите корректный email' }
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
            </Form.Item>
            
            <Form.Item
              name="password"
              label="Пароль"
              rules={[{ required: true, message: 'Пожалуйста, введите пароль' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Пароль"
                size="large"
              />
            </Form.Item>
            
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                size="large"
              >
                Войти
              </Button>
            </Form.Item>
            
            <div style={{ textAlign: 'right', marginBottom: 16 }}>
              <a href="#forgot-password">Забыли пароль?</a>
            </div>
          </Form>
          
          <Divider>или</Divider>
          
          <Button
            icon={<GoogleOutlined />}
            block
            onClick={handleGoogleLogin}
            size="large"
          >
            Войти через Google
          </Button>
        </TabPane>
        
        <TabPane tab="Регистрация" key="register">
          <Title level={4} style={{ textAlign: 'center', marginBottom: 24 }}>
            Регистрация
          </Title>
          
          {(localError || error) && (
            <Alert
              message="Ошибка регистрации"
              description={localError || error}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}
          
          <Form
            form={registerForm}
            name="register"
            onFinish={handleRegister}
            layout="vertical"
            preserve={false}
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Пожалуйста, введите email' },
                { type: 'email', message: 'Пожалуйста, введите корректный email' }
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
            </Form.Item>
            
            <Form.Item
              name="username"
              label="Имя пользователя"
              rules={[
                { required: true, message: 'Пожалуйста, введите имя пользователя' },
                { min: 3, message: 'Имя пользователя должно содержать минимум 3 символа' }
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="Имя пользователя" size="large" />
            </Form.Item>
            
            <Form.Item
              name="password"
              label="Пароль"
              rules={[
                { required: true, message: 'Пожалуйста, введите пароль' },
                { min: 6, message: 'Пароль должен содержать минимум 6 символов' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Пароль"
                size="large"
              />
            </Form.Item>
            
            <Form.Item
              name="confirmPassword"
              label="Подтверждение пароля"
              rules={[
                { required: true, message: 'Пожалуйста, подтвердите пароль' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Пароли не совпадают!'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Подтвердите пароль"
                size="large"
              />
            </Form.Item>
            
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                size="large"
              >
                Зарегистрироваться
              </Button>
            </Form.Item>
          </Form>
          
          <Divider>или</Divider>
          
          <Button
            icon={<GoogleOutlined />}
            block
            onClick={handleGoogleLogin}
            size="large"
          >
            Регистрация через Google
          </Button>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default AuthModal; 
import React, { useState, useEffect } from 'react';
import { Card, Button, Radio, Form, Alert, Spin, Typography, Row, Col, Space, Divider } from 'antd';
import { CheckCircleOutlined, DollarOutlined, CreditCardOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { api } from '../utils/api';
import { formatCurrency } from '../utils/format';

const { Title, Text, Paragraph } = Typography;

const SubscriptionPayment = ({ subscriptionType, onSuccess, onCancel }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [form] = Form.useForm();

  // Загрузка информации о подписке
  useEffect(() => {
    const fetchSubscriptionInfo = async () => {
      setLoading(true);
      try {
        // Здесь можно использовать реальный API-запрос для получения информации о подписке
        // В данном примере используем мок-данные
        const subscriptionData = {
          type: subscriptionType,
          name: getSubscriptionName(subscriptionType),
          description: getSubscriptionDescription(subscriptionType),
          price: getSubscriptionPrice(subscriptionType),
          currency: 'RUB',
          features: getSubscriptionFeatures(subscriptionType),
        };
        
        setSubscriptionInfo(subscriptionData);
      } catch (error) {
        console.error('Ошибка при загрузке информации о подписке:', error);
        setError('Не удалось загрузить информацию о подписке. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };
    
    if (subscriptionType) {
      fetchSubscriptionInfo();
    }
  }, [subscriptionType]);

  // Обработка отправки формы оплаты
  const handleSubmit = async (values) => {
    setPaymentLoading(true);
    setError(null);
    
    try {
      // Создаем платеж
      const response = await api.post('/payments', {
        subscription_id: null, // ID будет добавлен после создания подписки
        amount: subscriptionInfo.price,
        currency: subscriptionInfo.currency,
        payment_method: values.payment_method,
        description: `Подписка ${subscriptionInfo.name}`,
        return_url: `${window.location.origin}/payment/callback`
      });
      
      // Создаем подписку
      const subscriptionResponse = await api.post('/subscriptions', {
        type: subscriptionType,
        auto_renewal: values.auto_renewal,
        payment_method: values.payment_method
      });
      
      // Обновляем платеж с ID подписки
      await api.patch(`/payments/${response.data.id}`, {
        subscription_id: subscriptionResponse.data.id
      });
      
      // Перенаправляем на страницу оплаты
      if (response.data.payment_url) {
        window.location.href = response.data.payment_url;
      } else {
        // Если нет URL для оплаты, завершаем процесс успешно
        if (onSuccess) onSuccess(response.data);
      }
      
    } catch (error) {
      console.error('Ошибка при создании платежа:', error);
      setError('Произошла ошибка при создании платежа. Пожалуйста, попробуйте позже.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Вспомогательные функции для получения информации о подписке
  const getSubscriptionName = (type) => {
    const names = {
      basic: 'Базовая',
      premium: 'Премиум',
      unlimited: 'Безлимитная'
    };
    return names[type] || 'Неизвестная подписка';
  };

  const getSubscriptionDescription = (type) => {
    const descriptions = {
      basic: 'Базовая подписка с ограниченным функционалом',
      premium: 'Расширенная подписка с дополнительными возможностями',
      unlimited: 'Полный доступ ко всем функциям без ограничений'
    };
    return descriptions[type] || '';
  };

  const getSubscriptionPrice = (type) => {
    const prices = {
      basic: 199,
      premium: 499,
      unlimited: 999
    };
    return prices[type] || 0;
  };

  const getSubscriptionFeatures = (type) => {
    const features = {
      basic: [
        'Скачивание видео до 720p',
        'До 10 скачиваний в месяц',
        'Конвертация в MP3',
        'Базовая техподдержка'
      ],
      premium: [
        'Скачивание видео до 1080p',
        'До 50 скачиваний в месяц',
        'Конвертация в различные форматы',
        'Приоритетная техподдержка',
        'Без рекламы'
      ],
      unlimited: [
        'Скачивание видео до 4K',
        'Неограниченное количество скачиваний',
        'Конвертация в любые форматы',
        'VIP техподдержка',
        'Без рекламы',
        'Одновременная загрузка нескольких видео'
      ]
    };
    return features[type] || [];
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '30px 0' }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: 16 }}>Загрузка информации о подписке...</Paragraph>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Alert
          message="Ошибка"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" danger onClick={() => router.push('/subscriptions')}>
              Вернуться
            </Button>
          }
        />
      </Card>
    );
  }

  if (!subscriptionInfo) {
    return (
      <Card>
        <Alert
          message="Информация не найдена"
          description="Не удалось получить информацию о подписке"
          type="warning"
          showIcon
          action={
            <Button size="small" onClick={() => router.push('/subscriptions')}>
              Вернуться
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card>
      <Title level={3}>Оформление подписки</Title>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
          <Card title={subscriptionInfo.name} bordered={false} className="subscription-card">
            <div className="subscription-price">
              <Text strong style={{ fontSize: 24 }}>
                {formatCurrency(subscriptionInfo.price, subscriptionInfo.currency)}
              </Text>
              <Text type="secondary"> / месяц</Text>
            </div>
            
            <Paragraph>{subscriptionInfo.description}</Paragraph>
            
            <Divider />
            
            <Title level={5}>Включено в подписку:</Title>
            <ul className="feature-list">
              {subscriptionInfo.features.map((feature, index) => (
                <li key={index}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                  {feature}
                </li>
              ))}
            </ul>
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card title="Способ оплаты" bordered={false}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                payment_method: 'card',
                auto_renewal: true
              }}
            >
              <Form.Item
                name="payment_method"
                label="Выберите способ оплаты"
                rules={[{ required: true, message: 'Выберите способ оплаты' }]}
              >
                <Radio.Group>
                  <Space direction="vertical">
                    <Radio value="card">
                      <Space>
                        <CreditCardOutlined />
                        <span>Банковская карта</span>
                      </Space>
                    </Radio>
                    <Radio value="yoomoney">
                      <Space>
                        <DollarOutlined />
                        <span>ЮMoney</span>
                      </Space>
                    </Radio>
                    <Radio value="sbp">
                      <Space>
                        <ShoppingCartOutlined />
                        <span>Система быстрых платежей</span>
                      </Space>
                    </Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>
              
              <Form.Item
                name="auto_renewal"
                valuePropName="checked"
              >
                <Radio>
                  Автоматически продлевать подписку
                  <div style={{ marginLeft: 22, color: 'rgba(0, 0, 0, 0.45)', fontSize: 12 }}>
                    Ваша подписка будет автоматически продлена по окончании срока. Вы можете отменить продление в любой момент.
                  </div>
                </Radio>
              </Form.Item>
              
              <div className="payment-actions">
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  size="large" 
                  block
                  loading={paymentLoading}
                  icon={<ShoppingCartOutlined />}
                >
                  Оплатить {formatCurrency(subscriptionInfo.price, subscriptionInfo.currency)}
                </Button>
                
                <Button 
                  onClick={onCancel || (() => router.push('/subscriptions'))} 
                  style={{ marginTop: 12 }}
                  block
                >
                  Отмена
                </Button>
              </div>
            </Form>
          </Card>
        </Col>
      </Row>
      
      <style jsx global>{`
        .subscription-card {
          height: 100%;
        }
        .subscription-price {
          margin-bottom: 16px;
        }
        .feature-list {
          padding-left: 0;
          list-style: none;
        }
        .feature-list li {
          margin-bottom: 12px;
        }
        .payment-actions {
          margin-top: 24px;
        }
      `}</style>
    </Card>
  );
};

export default SubscriptionPayment; 
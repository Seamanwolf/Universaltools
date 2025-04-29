import React, { useState, useEffect } from 'react';
import { Table, Tag, Spin, Empty, Button, Card, Typography, Pagination, Modal, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, UndoOutlined } from '@ant-design/icons';
import { formatDate, formatCurrency } from '../utils/format';
import { api } from '../utils/api';

const { Title, Text } = Typography;

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Загрузка платежей
  const fetchPayments = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const response = await api.get('/payments', {
        params: {
          skip: (page - 1) * pageSize,
          limit: pageSize,
        }
      });
      
      setPayments(response.data.payments);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Ошибка при загрузке платежей:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments(pagination.current, pagination.pageSize);
  }, [pagination.current, pagination.pageSize]);

  // Обработка изменения страницы
  const handleTableChange = (page, pageSize) => {
    setPagination({
      current: page,
      pageSize: pageSize,
    });
  };

  // Проверка статуса платежа
  const checkPaymentStatus = async (paymentId) => {
    setCheckingStatus(true);
    try {
      const response = await api.post(`/payments/${paymentId}/check`);
      
      // Обновляем платеж в списке
      setPayments(prevPayments => 
        prevPayments.map(payment => 
          payment.id === paymentId ? response.data : payment
        )
      );
      
      // Если открыто модальное окно, обновляем выбранный платеж
      if (selectedPayment && selectedPayment.id === paymentId) {
        setSelectedPayment(response.data);
      }
      
    } catch (error) {
      console.error('Ошибка при проверке статуса платежа:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Отмена платежа
  const cancelPayment = async (paymentId) => {
    setCheckingStatus(true);
    try {
      const response = await api.post(`/payments/${paymentId}/cancel`);
      
      // Обновляем платеж в списке
      setPayments(prevPayments => 
        prevPayments.map(payment => 
          payment.id === paymentId ? response.data : payment
        )
      );
      
      // Если открыто модальное окно, обновляем выбранный платеж
      if (selectedPayment && selectedPayment.id === paymentId) {
        setSelectedPayment(response.data);
      }
      
    } catch (error) {
      console.error('Ошибка при отмене платежа:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  // Открытие модального окна с деталями платежа
  const showPaymentDetails = (payment) => {
    setSelectedPayment(payment);
    setModalVisible(true);
  };

  // Получение цвета и иконки для статуса платежа
  const getStatusTag = (status) => {
    switch (status) {
      case 'completed':
        return <Tag icon={<CheckCircleOutlined />} color="success">Выполнен</Tag>;
      case 'pending':
        return <Tag icon={<ClockCircleOutlined />} color="processing">В обработке</Tag>;
      case 'failed':
        return <Tag icon={<CloseCircleOutlined />} color="error">Ошибка</Tag>;
      case 'refunded':
        return <Tag icon={<UndoOutlined />} color="warning">Возврат</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  // Получение названия метода оплаты
  const getPaymentMethodName = (method) => {
    const methods = {
      'card': 'Банковская карта',
      'yoomoney': 'ЮMoney',
      'qiwi': 'QIWI',
      'webmoney': 'WebMoney',
      'sbp': 'Система быстрых платежей'
    };
    return methods[method] || method;
  };

  // Колонки таблицы
  const columns = [
    {
      title: '№',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Дата',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => formatDate(text),
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => formatCurrency(amount, record.currency),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Способ оплаты',
      dataIndex: 'payment_method',
      key: 'payment_method',
      render: (method) => getPaymentMethodName(method),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="link" 
            onClick={() => showPaymentDetails(record)}
          >
            Детали
          </Button>
          {record.status === 'pending' && (
            <>
              <Button 
                type="link" 
                onClick={() => checkPaymentStatus(record.id)}
                loading={checkingStatus}
              >
                Проверить
              </Button>
              <Button 
                type="link" 
                danger 
                onClick={() => cancelPayment(record.id)}
                loading={checkingStatus}
              >
                Отменить
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  // Модальное окно с деталями платежа
  const renderModal = () => (
    <Modal
      title="Детали платежа"
      open={modalVisible}
      onCancel={() => setModalVisible(false)}
      footer={[
        <Button key="close" onClick={() => setModalVisible(false)}>
          Закрыть
        </Button>,
        selectedPayment && selectedPayment.status === 'pending' && (
          <Button 
            key="check" 
            type="primary" 
            loading={checkingStatus}
            onClick={() => checkPaymentStatus(selectedPayment.id)}
          >
            Проверить статус
          </Button>
        ),
        selectedPayment && selectedPayment.status === 'pending' && (
          <Button 
            key="cancel" 
            type="primary" 
            danger 
            loading={checkingStatus}
            onClick={() => cancelPayment(selectedPayment.id)}
          >
            Отменить платеж
          </Button>
        )
      ]}
      width={600}
    >
      {selectedPayment && (
        <div>
          <p><strong>ID платежа:</strong> {selectedPayment.id}</p>
          <p><strong>Статус:</strong> {getStatusTag(selectedPayment.status)}</p>
          <p><strong>Сумма:</strong> {formatCurrency(selectedPayment.amount, selectedPayment.currency)}</p>
          <p><strong>Метод оплаты:</strong> {getPaymentMethodName(selectedPayment.payment_method)}</p>
          <p><strong>Дата создания:</strong> {formatDate(selectedPayment.created_at)}</p>
          {selectedPayment.payment_date && (
            <p><strong>Дата оплаты:</strong> {formatDate(selectedPayment.payment_date)}</p>
          )}
          {selectedPayment.description && (
            <p><strong>Описание:</strong> {selectedPayment.description}</p>
          )}
          {selectedPayment.error_message && (
            <div>
              <p><strong>Сообщение об ошибке:</strong></p>
              <div style={{ background: '#f5f5f5', padding: 10, borderRadius: 4 }}>
                {selectedPayment.error_message}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );

  return (
    <Card>
      <Title level={3}>История платежей</Title>
      <Text type="secondary">Все ваши платежи и их статусы</Text>
      
      {loading ? (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Spin size="large" />
        </div>
      ) : payments.length > 0 ? (
        <>
          <Table 
            columns={columns} 
            dataSource={payments} 
            rowKey="id"
            pagination={false}
            style={{ marginTop: 16 }}
          />
          
          <Pagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={total}
            onChange={handleTableChange}
            style={{ marginTop: 16, textAlign: 'right' }}
          />
        </>
      ) : (
        <Empty 
          description="История платежей пуста" 
          style={{ margin: '20px 0' }}
        />
      )}
      
      {renderModal()}
    </Card>
  );
};

export default PaymentHistory; 
'use client';

import React, { useState } from 'react';
import { Card, Typography, Button, Upload, Radio, Space, Divider, message, Input, Row, Col, List, Collapse } from 'antd';
import { InboxOutlined, FilePdfOutlined, ScissorOutlined, CompressOutlined, SwapOutlined, FileTextOutlined, FileImageOutlined, FileExcelOutlined, FileWordOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import dynamic from 'next/dynamic';
import ClientOnly from '@/components/ClientOnly';
import Head from 'next/head';

const NavBar = dynamic(() => import('@/components/NavBar'), { ssr: false });

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { Panel } = Collapse;

type PdfActionType = 'compress' | 'edit' | 'convert' | 'merge';

const PdfPage = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [actionType, setActionType] = useState<PdfActionType>('compress');
  const [outputFormat, setOutputFormat] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<string>('medium');
  
  // Устанавливаем формат по умолчанию при изменении типа действия
  React.useEffect(() => {
    if (actionType === 'convert') {
      setOutputFormat('jpg');
    }
  }, [actionType]);

  // Настройки компонента загрузки
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: actionType === 'merge',
    fileList,
    accept: '.pdf',
    beforeUpload: (file) => {
      setFileList([...fileList, file]);
      return false; // Предотвращаем автоматическую загрузку
    },
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    onDrop(e) {
      console.log('Dropped files', e.dataTransfer.files);
    },
  };

  // Обработка PDF
  const handleProcessPdf = async () => {
    if (fileList.length === 0) {
      message.warning('Пожалуйста, добавьте PDF файлы');
      return;
    }

    if (actionType === 'merge' && fileList.length < 2) {
      message.warning('Для объединения необходимо добавить не менее 2 файлов');
      return;
    }

    setProcessing(true);
    
    try {
      // Имитация процесса обработки
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let successMessage = '';
      
      switch (actionType) {
        case 'compress':
          successMessage = `PDF файл${fileList.length > 1 ? 'ы' : ''} успешно сжат${fileList.length > 1 ? 'ы' : ''}`;
          break;
        case 'edit':
          successMessage = `PDF файл успешно отредактирован`;
          break;
        case 'convert':
          successMessage = `PDF файл успешно конвертирован в ${outputFormat}`;
          break;
        case 'merge':
          successMessage = `${fileList.length} PDF файлов успешно объединены`;
          break;
      }
      
      message.success(successMessage);
      
      // В реальном приложении здесь был бы API запрос
      // const formData = new FormData();
      // fileList.forEach(file => {
      //   formData.append('files[]', file as any);
      // });
      // formData.append('action', actionType);
      // if (actionType === 'compress') {
      //   formData.append('compressionLevel', compressionLevel);
      // }
      // if (actionType === 'convert') {
      //   formData.append('outputFormat', outputFormat);
      // }
      // const response = await fetch('/api/pdf/process', {
      //   method: 'POST',
      //   body: formData,
      // });
      
      // Сбрасываем список файлов после успешной обработки
      setFileList([]);
    } catch (error) {
      message.error('Произошла ошибка при обработке PDF файлов');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  // Получение заголовка и описания для текущего действия
  const getActionInfo = () => {
    switch (actionType) {
      case 'compress':
        return {
          title: 'Сжатие PDF',
          description: 'Уменьшите размер PDF файла без потери качества'
        };
      case 'edit':
        return {
          title: 'Редактирование PDF',
          description: 'Редактируйте содержимое, удаляйте или переупорядочивайте страницы'
        };
      case 'convert':
        return {
          title: 'Конвертация PDF',
          description: 'Конвертируйте PDF в другие форматы'
        };
      case 'merge':
        return {
          title: 'Объединение PDF',
          description: 'Объедините несколько PDF файлов в один документ'
        };
      default:
        return {
          title: 'Обработка PDF',
          description: 'Выберите действие для работы с PDF'
        };
    }
  };

  // Получение компонента с настройками для текущего действия
  const renderActionSettings = () => {
    switch (actionType) {
      case 'compress':
        return (
          <div className="mb-4">
            <Title level={5}>Уровень сжатия:</Title>
            <Radio.Group 
              value={compressionLevel} 
              onChange={e => setCompressionLevel(e.target.value)}
            >
              <Radio.Button value="light">Легкий (сохраняет качество)</Radio.Button>
              <Radio.Button value="medium">Средний (рекомендуется)</Radio.Button>
              <Radio.Button value="strong">Сильный (максимальное сжатие)</Radio.Button>
            </Radio.Group>
          </div>
        );
      case 'convert':
        return (
          <div className="mb-4">
            <Title level={5}>Выберите формат:</Title>
            <Radio.Group 
              value={outputFormat} 
              onChange={e => setOutputFormat(e.target.value)}
            >
              <Radio.Button value="jpg">JPG</Radio.Button>
              <Radio.Button value="png">PNG</Radio.Button>
              <Radio.Button value="txt">TXT</Radio.Button>
              <Radio.Button value="docx">DOCX</Radio.Button>
            </Radio.Group>
          </div>
        );
      case 'merge':
        return (
          <div className="mb-4">
            <Title level={5}>Порядок файлов:</Title>
            <Paragraph>Перетащите файлы в нужном порядке. Файлы будут объединены в том порядке, в котором они указаны.</Paragraph>
          </div>
        );
      default:
        return null;
    }
  };

  const actionInfo = getActionInfo();

  return (
    <>
      <Head>
        <title>PDF Инструменты | UniversalTools</title>
        <link rel="icon" href="/icons/favicon.svg" />
      </Head>
      <ClientOnly>
        <NavBar />
      </ClientOnly>
      
      <div className="flex min-h-screen flex-col items-center">
        <div className="w-full">
          <div className="container mx-auto px-4 py-8">
            <Title level={2} className="text-center mb-4">Работа с PDF</Title>
            <Paragraph className="text-center mb-8">
              Сжимайте, редактируйте, конвертируйте и объединяйте PDF-файлы
            </Paragraph>

            <Card className="mb-8">
              <div className="mb-6">
                <Title level={4}>Выберите действие</Title>
                <Radio.Group 
                  value={actionType} 
                  onChange={e => setActionType(e.target.value)}
                  className="mb-4"
                >
                  <Radio.Button value="compress">
                    <Space><CompressOutlined /> Сжать</Space>
                  </Radio.Button>
                  <Radio.Button value="edit">
                    <Space><ScissorOutlined /> Редактировать</Space>
                  </Radio.Button>
                  <Radio.Button value="convert">
                    <Space><SwapOutlined /> Конвертировать</Space>
                  </Radio.Button>
                  <Radio.Button value="merge">
                    <Space><FilePdfOutlined /> Объединить</Space>
                  </Radio.Button>
                </Radio.Group>
                
                <Title level={4}>{actionInfo.title}</Title>
                <Paragraph>{actionInfo.description}</Paragraph>
                
                {renderActionSettings()}
              </div>

              <Dragger {...uploadProps}>
                <p className="ant-upload-drag-icon">
                  <FilePdfOutlined />
                </p>
                <p className="ant-upload-text">Нажмите или перетащите PDF файлы в эту область</p>
                <p className="ant-upload-hint">
                  {actionType === 'merge' 
                    ? 'Добавьте несколько PDF файлов для объединения' 
                    : 'Поддерживаются только PDF файлы'}
                </p>
              </Dragger>

              <div className="mt-6">
                <Button 
                  type="primary" 
                  onClick={handleProcessPdf} 
                  disabled={fileList.length === 0}
                  loading={processing}
                  block
                  size="large"
                >
                  {processing ? 'Обработка...' : 'Начать обработку'}
                </Button>
              </div>
            </Card>

            <Card className="mb-8">
              <Title level={4}>Возможности работы с PDF</Title>
              <Divider />
              <Row gutter={[24, 24]}>
                <Col xs={24} md={6}>
                  <Title level={5}><CompressOutlined /> Сжатие PDF</Title>
                  <ul className="list-disc pl-5">
                    <li>Уменьшение размера файла</li>
                    <li>Три уровня сжатия</li>
                    <li>Сохранение качества при легком сжатии</li>
                  </ul>
                </Col>
                <Col xs={24} md={6}>
                  <Title level={5}><ScissorOutlined /> Редактирование</Title>
                  <ul className="list-disc pl-5">
                    <li>Удаление страниц</li>
                    <li>Изменение порядка страниц</li>
                    <li>Поворот страниц</li>
                    <li>Извлечение страниц</li>
                  </ul>
                </Col>
                <Col xs={24} md={6}>
                  <Title level={5}><SwapOutlined /> Конвертация</Title>
                  <ul className="list-disc pl-5">
                    <li>Конвертация в JPG/PNG</li>
                    <li>Конвертация в текстовые форматы</li>
                    <li>Конвертация в документы Word</li>
                  </ul>
                </Col>
                <Col xs={24} md={6}>
                  <Title level={5}><FilePdfOutlined /> Объединение</Title>
                  <ul className="list-disc pl-5">
                    <li>Объединение любого количества PDF</li>
                    <li>Настройка порядка файлов</li>
                    <li>Создание оглавления</li>
                  </ul>
                </Col>
              </Row>
            </Card>
            
            <Card>
              <Title level={4}>Часто задаваемые вопросы</Title>
              <Collapse accordion className="mt-4">
                <Panel header="Безопасны ли мои PDF файлы?" key="1">
                  <p>Ваши файлы обрабатываются на наших серверах и автоматически удаляются через 24 часа. Мы не храним содержимое ваших документов и не используем их в каких-либо целях, кроме предоставления запрошенной услуги.</p>
                </Panel>
                <Panel header="Какой максимальный размер файла для загрузки?" key="2">
                  <p>Максимальный размер файла для бесплатных пользователей составляет 10 МБ. Пользователи с подпиской могут загружать файлы размером до 100 МБ.</p>
                </Panel>
                <Panel header="Теряется ли качество при сжатии PDF?" key="3">
                  <p>При сжатии с настройкой "Легкий" качество практически не страдает. При средней и сильной степенях сжатия возможно некоторое снижение качества изображений в документе, но текст остается четким.</p>
                </Panel>
                <Panel header="Могу ли я редактировать текст в PDF?" key="4">
                  <p>Базовое редактирование текста доступно для пользователей с подпиской. В бесплатной версии вы можете только удалять, перемещать или вращать страницы.</p>
                </Panel>
              </Collapse>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default PdfPage; 
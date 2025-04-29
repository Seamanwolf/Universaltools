#!/bin/bash

# Остановка nginx для освобождения порта 80
docker-compose stop nginx
sleep 5

# Получение сертификатов с помощью Certbot в standalone режиме
docker run --rm \
  -p 80:80 \
  -v $(pwd)/../ssl:/etc/letsencrypt \
  certbot/certbot certonly --standalone \
  --email admin@universaltools.pro \
  --agree-tos \
  --no-eff-email \
  -d universaltools.pro \
  -d www.universaltools.pro

# Запуск nginx обратно
docker-compose up -d nginx
sleep 5

echo "Сертификаты получены и сохранены в директории ssl/" 
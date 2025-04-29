#!/bin/bash

# Остановка nginx для освобождения порта 80
docker-compose stop nginx

# Обновление сертификатов с помощью Certbot
docker run --rm -v $(pwd)/../ssl:/etc/letsencrypt -v $(pwd)/../certbot/www:/var/www/certbot certbot/certbot renew

# Запуск nginx обратно
docker-compose up -d nginx

echo "Сертификаты обновлены" 
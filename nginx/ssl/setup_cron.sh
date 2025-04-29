#!/bin/bash

# Получаем абсолютный путь к скрипту обновления сертификатов
SCRIPT_PATH=$(pwd)/renew_certificates.sh

# Добавляем задачу в crontab для обновления сертификатов каждые 30 дней в 3:00 утра
(crontab -l 2>/dev/null; echo "0 3 */30 * * $SCRIPT_PATH") | crontab -

echo "Задача для автоматического обновления сертификатов добавлена в crontab" 
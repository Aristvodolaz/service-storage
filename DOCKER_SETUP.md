# Настройка Docker для Storage Service

Этот документ содержит инструкции по установке и настройке Docker для работы с проектом Storage Service.

## Установка Docker

### Windows

1. Скачайте и установите [Docker Desktop для Windows](https://www.docker.com/products/docker-desktop)
2. Следуйте инструкциям установщика
3. После установки запустите Docker Desktop
4. Убедитесь, что Docker работает, выполнив в командной строке:
   ```
   docker --version
   docker-compose --version
   ```

### macOS

1. Скачайте и установите [Docker Desktop для Mac](https://www.docker.com/products/docker-desktop)
2. Следуйте инструкциям установщика
3. После установки запустите Docker Desktop
4. Убедитесь, что Docker работает, выполнив в терминале:
   ```
   docker --version
   docker-compose --version
   ```

### Linux (Ubuntu)

1. Обновите пакеты:
   ```
   sudo apt-get update
   ```

2. Установите необходимые пакеты:
   ```
   sudo apt-get install apt-transport-https ca-certificates curl gnupg lsb-release
   ```

3. Добавьте официальный GPG-ключ Docker:
   ```
   curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
   ```

4. Настройте стабильный репозиторий:
   ```
   echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
   ```

5. Установите Docker Engine:
   ```
   sudo apt-get update
   sudo apt-get install docker-ce docker-ce-cli containerd.io
   ```

6. Установите Docker Compose:
   ```
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.5.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

7. Добавьте своего пользователя в группу docker:
   ```
   sudo usermod -aG docker $USER
   ```

8. Перезагрузите систему или выполните:
   ```
   newgrp docker
   ```

9. Проверьте установку:
   ```
   docker --version
   docker-compose --version
   ```

## Настройка проекта для работы с Docker

1. Клонируйте репозиторий проекта (если еще не сделано):
   ```
   git clone <url-репозитория>
   cd storage-service
   ```

2. Создайте файл `.env` на основе `.env.example`:
   ```
   cp .env.example .env
   ```

3. Отредактируйте файл `.env`, указав правильные значения для подключения к базе данных и других настроек.

## Запуск проекта в Docker

### Режим разработки

Для запуска в режиме разработки с горячей перезагрузкой кода:

**Linux/Mac:**
```bash
./start-dev.sh
```

**Windows:**
```powershell
.\start-dev.ps1
```

Или с использованием npm:
```bash
npm run docker:dev
```

### Производственный режим

Для запуска в производственном режиме:

**Linux/Mac:**
```bash
./start-prod.sh
```

**Windows:**
```powershell
.\start-prod.ps1
```

Или с использованием npm:
```bash
npm run docker:prod
```

## Остановка контейнеров

**Linux/Mac:**
```bash
./stop.sh
```

**Windows:**
```powershell
.\stop.ps1
```

Или с использованием npm:
```bash
npm run docker:stop
```

## Просмотр логов

```bash
npm run docker:logs
```

или

```bash
docker-compose logs -f
```

## Доступ к Adminer (управление базой данных)

После запуска контейнеров Adminer будет доступен по адресу:
```
http://localhost:8080
```

Используйте следующие данные для входа:
- Система: MS SQL Server
- Сервер: Значение из переменной DB_SERVER в файле .env
- Имя пользователя: Значение из переменной DB_USER в файле .env
- Пароль: Значение из переменной DB_PASSWORD в файле .env
- База данных: Значение из переменной DB_DATABASE в файле .env

## Отладка в режиме разработки

При запуске в режиме разработки доступна отладка Node.js через порт 9229. Вы можете подключиться к отладчику с помощью Chrome DevTools или VS Code.

### Отладка в VS Code

1. Добавьте следующую конфигурацию в файл `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Docker: Attach to Node",
      "port": 9229,
      "address": "localhost",
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "/usr/src/app",
      "restart": true
    }
  ]
}
```

2. Запустите проект в режиме разработки
3. В VS Code перейдите в раздел "Run and Debug" и запустите конфигурацию "Docker: Attach to Node"

## Устранение неполадок

### Проблемы с правами доступа к томам в Linux

Если у вас возникают проблемы с правами доступа к томам в Linux, выполните:

```bash
sudo chown -R $USER:$USER .
```

### Порт уже используется

Если при запуске контейнеров вы получаете ошибку о том, что порт уже используется, проверьте, какие процессы используют порты 3006 и 8080:

**Linux/Mac:**
```bash
sudo lsof -i :3006
sudo lsof -i :8080
```

**Windows:**
```powershell
netstat -ano | findstr :3006
netstat -ano | findstr :8080
```

Затем остановите соответствующие процессы или измените порты в файлах `docker-compose.yml` и `docker-compose.dev.yml`.

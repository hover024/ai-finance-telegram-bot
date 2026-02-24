FROM node:20-bookworm

# Устанавливаем Python и зависимости
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Создаём рабочую директорию
WORKDIR /app

# Копируем package.json и устанавливаем Node.js зависимости
COPY package*.json ./
RUN npm install

# Копируем Python requirements и устанавливаем
COPY requirements.txt ./
RUN pip3 install --break-system-packages -r requirements.txt

# Копируем остальные файлы проекта
COPY . .

# Команда по умолчанию
CMD ["npm", "start"]

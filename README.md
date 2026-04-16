# Поликлиника — веб-приложение для автоматизации работы медицинского учреждения

## Описание

Серверная часть веб-приложения «Поликлиника» разработана на Python с использованием Django и Django REST Framework. Приложение обеспечивает:

- регистрацию и аутентификацию пользователей (JWT);
- ролевую модель (пациент, врач, администратор);
- управление расписанием врачей;
- запись пациентов на приём;
- ведение электронных медицинских карт;
- административную панель Django.

## Технологический стек

- **Backend**: Python 3.11, Django 5.0, Django REST Framework
- **БД**: PostgreSQL 15
- **Контейнеризация**: Docker, Docker Compose
- **Фронтенд**: HTML, CSS, JavaScript (SPA)

## Быстрый старт

### 1. Клонирование репозитория

```bash
git clone https://github.com/your-repo/poliklinika.git
cd poliklinika

### 2. Запуск с Docker Compose

```bash
docker-compose up --build

### 3. Доступ к приложению

Фронтенд: http://localhost

Админ-панель: http://localhost/admin

###4. Создание суперпользователя
```bash
docker-compose exec backend python manage.py createsuperuser

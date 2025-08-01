#!/usr/bin/env python3
"""Скрипт создания тестовых отзывов."""

import sys
sys.path.insert(0, '/app')

from app import app
from models import db, Course, User, Review
from datetime import datetime, timedelta

with app.app_context():
    users_data = [
        {'first_name': 'Петр', 'last_name': 'Петров', 'login': 'petrov'},
        {'first_name': 'Анна', 'last_name': 'Сидорова', 'login': 'sidorova'},
        {'first_name': 'Михаил', 'last_name': 'Козлов', 'login': 'kozlov'},
        {'first_name': 'Елена', 'last_name': 'Волкова', 'login': 'volkova'},
    ]
    
    for user_data in users_data:
        existing_user = db.session.execute(
            db.select(User).filter(User.login == user_data['login'])
        ).scalar()
        
        if not existing_user:
            user = User(**user_data)
            user.set_password('password')
            db.session.add(user)
    
    db.session.commit()
    
    course = db.session.execute(db.select(Course).filter(Course.id == 1)).scalar()
    
    reviews_data = [
        {
            'user_login': 'user',
            'rating': 5,
            'text': 'Отличный курс! Очень понятное объяснение основ программирования. Рекомендую всем начинающим!',
            'created_at': datetime.now() - timedelta(days=5)
        },
        {
            'user_login': 'petrov',
            'rating': 4,
            'text': 'Хороший курс для новичков. Материал изложен доступно, но хотелось бы больше практических заданий.',
            'created_at': datetime.now() - timedelta(days=3)
        },
        {
            'user_login': 'sidorova',
            'rating': 5,
            'text': 'Прекрасный курс! Преподаватель объясняет сложные темы простым языком. Теперь я понимаю основы Python!',
            'created_at': datetime.now() - timedelta(days=2)
        },
        {
            'user_login': 'kozlov',
            'rating': 3,
            'text': 'Курс неплохой, но темп изложения показался слишком быстрым. Некоторые темы стоило бы раскрыть подробнее.',
            'created_at': datetime.now() - timedelta(days=1)
        },
        {
            'user_login': 'volkova',
            'rating': 4,
            'text': 'Качественный курс с хорошей структурой. Особенно понравилась часть про функции и циклы.',
            'created_at': datetime.now() - timedelta(hours=12)
        },
    ]
    
    for review_data in reviews_data:
        user = db.session.execute(
            db.select(User).filter(User.login == review_data['user_login'])
        ).scalar()
        
        if user:
            review = Review(
                rating=review_data['rating'],
                text=review_data['text'],
                course_id=course.id,
                user_id=user.id,
                created_at=review_data['created_at']
            )
            db.session.add(review)
            
            course.rating_sum += review_data['rating']
            course.rating_num += 1
    
    db.session.commit() 
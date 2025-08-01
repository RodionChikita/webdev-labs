#!/usr/bin/env python3
"""Скрипт создания тестового курса."""

import sys
sys.path.insert(0, '/app')

from app import app
from models import db, Course

with app.app_context():
    existing_course = db.session.execute(
        db.select(Course).filter(Course.name == 'Основы программирования')
    ).scalar()
    
    if existing_course:
        pass
    else:
        course = Course(
            name='Основы программирования',
            short_desc='Изучение основ программирования на Python',
            full_desc='Подробный курс по изучению основ программирования на языке Python. Вы изучите переменные, условия, циклы, функции и многое другое.',
            rating_sum=0,
            rating_num=0,
            category_id=1,
            author_id=1,
            background_image_id=None
        )
        db.session.add(course)
        db.session.commit() 
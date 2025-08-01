"""Скрипт для создания правильной миграции с данными."""

import os
import sys
sys.path.insert(0, '/app')

from app import app
from models import db, Category

with app.app_context():
    db.create_all()
    
    categories_data = [
        {'name': 'Программирование'},
        {'name': 'Математика'},
        {'name': 'Языкознание'},
    ]
    
    for cat_data in categories_data:
        existing_category = db.session.execute(
            db.select(Category).filter(Category.name == cat_data['name'])
        ).scalar()
        
        if not existing_category:
            category = Category(**cat_data)
            db.session.add(category)
    
    db.session.commit() 
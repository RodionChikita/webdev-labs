"""Вспомогательные утилиты для приложения."""

import hashlib
import uuid
import os
from werkzeug.utils import secure_filename
from flask import current_app
from models import db, Course, Image


class CoursesFilter:
    """Фильтр курсов по названию и категориям."""
    
    def __init__(self, name, category_ids):
        self.name = name
        self.category_ids = category_ids
        self.query = db.select(Course)

    def perform(self):
        """Применяет фильтры и возвращает упорядоченный запрос."""
        self.__filter_by_name()
        self.__filter_by_category_ids()
        return self.query.order_by(Course.created_at.desc())

    def __filter_by_name(self):
        """Фильтрует курсы по названию."""
        if self.name:
            self.query = self.query.filter(
                Course.name.ilike('%' + self.name + '%'))

    def __filter_by_category_ids(self):
        """Фильтрует курсы по ID категорий."""
        if self.category_ids:
            self.query = self.query.filter(
                Course.category_id.in_(self.category_ids))


class ImageSaver:
    """Класс для сохранения изображений с проверкой дубликатов."""
    
    def __init__(self, file):
        self.file = file

    def save(self):
        """Сохраняет изображение в хранилище и базу данных."""
        self.img = self.__find_by_md5_hash()
        if self.img is not None:
            return self.img
        
        file_name = secure_filename(self.file.filename)
        self.img = Image(
            id=str(uuid.uuid4()),
            file_name=file_name,
            mime_type=self.file.mimetype,
            md5_hash=self.md5_hash)
        
        upload_folder = current_app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)
        
        file_path = os.path.join(upload_folder, self.img.storage_filename)
        self.file.save(file_path)
        
        db.session.add(self.img)
        db.session.commit()
        
        return self.img

    def __find_by_md5_hash(self):
        """Ищет существующее изображение по MD5 хешу."""
        self.md5_hash = hashlib.md5(self.file.read()).hexdigest()
        self.file.seek(0)
        return db.session.execute(db.select(Image).filter(Image.md5_hash == self.md5_hash)).scalar()

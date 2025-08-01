"""Модели данных приложения."""

import os
from datetime import datetime
from typing import List, Optional
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from flask import url_for


class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)


class User(Base, UserMixin):
    """Модель пользователя."""
    
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    middle_name: Mapped[Optional[str]] = mapped_column(String(100))
    login: Mapped[str] = mapped_column(String(100), unique=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)

    def set_password(self, password):
        """Устанавливает хеш пароля."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Проверяет пароль."""
        return check_password_hash(self.password_hash, password)

    @property
    def full_name(self):
        """Возвращает полное имя пользователя."""
        return ' '.join([self.last_name, self.first_name])

    def __repr__(self):
        return '<User %r>' % self.login


class Category(Base):
    """Модель категории курса."""
    
    __tablename__ = 'categories'

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    parent_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categories.id"))

    def __repr__(self):
        return '<Category %r>' % self.name


class Course(Base):
    """Модель курса."""
    
    __tablename__ = 'courses'

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    short_desc: Mapped[str] = mapped_column(Text)
    full_desc: Mapped[str] = mapped_column(Text)
    rating_sum: Mapped[int] = mapped_column(default=0)
    rating_num: Mapped[int] = mapped_column(default=0)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"))
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    background_image_id: Mapped[Optional[str]] = mapped_column(ForeignKey("images.id"))
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)

    author: Mapped["User"] = relationship()
    category: Mapped["Category"] = relationship(lazy=False)
    bg_image: Mapped[Optional["Image"]] = relationship()
    reviews: Mapped[List["Review"]] = relationship(back_populates="course")

    def __repr__(self):
        return '<Course %r>' % self.name

    @property
    def rating(self):
        """Возвращает средний рейтинг курса."""
        if self.rating_num > 0:
            return self.rating_sum / self.rating_num
        return 0


class Review(Base):
    """Модель отзыва к курсу."""
    
    __tablename__ = 'reviews'

    id: Mapped[int] = mapped_column(primary_key=True)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    course: Mapped["Course"] = relationship(back_populates="reviews")
    user: Mapped["User"] = relationship()

    def __repr__(self):
        return f'<Review {self.id} for course {self.course_id}>'


class Image(db.Model):
    """Модель изображения."""
    
    __tablename__ = 'images'

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    file_name: Mapped[str] = mapped_column(String(100))
    mime_type: Mapped[str] = mapped_column(String(100))
    md5_hash: Mapped[str] = mapped_column(String(100), unique=True)
    object_id: Mapped[Optional[int]]
    object_type: Mapped[Optional[str]] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)

    def __repr__(self):
        return '<Image %r>' % self.file_name

    @property
    def storage_filename(self):
        """Возвращает имя файла для хранения."""
        _, ext = os.path.splitext(self.file_name)
        return self.id + ext

    @property
    def url(self):
        """Возвращает URL для доступа к изображению."""
        return url_for('image', image_id=self.id)

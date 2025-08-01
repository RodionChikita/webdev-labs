"""Инициализация базы данных с тестовыми данными."""

from flask import Flask
from models import db, User

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///project.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

def init_database():
    """Инициализирует базу данных с тестовыми данными."""
    with app.app_context():
        existing_user = db.session.execute(db.select(User).filter(User.login == 'user')).scalar()
        if existing_user:
            return
        
        user = User(first_name='Иван', last_name='Иванов', login='user')
        user.set_password('qwerty')
        db.session.add(user)
        db.session.commit()

if __name__ == '__main__':
    init_database() 
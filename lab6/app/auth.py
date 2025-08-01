"""Модуль аутентификации пользователей."""

from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from models import db, User

bp = Blueprint('auth', __name__, url_prefix='/auth')

def init_login_manager(app):
    """Инициализирует менеджер авторизации."""
    login_manager = LoginManager()
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Для доступа к этой странице необходимо войти в систему.'
    login_manager.login_message_category = 'warning'
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        """Загружает пользователя по ID."""
        return db.get_or_404(User, user_id)

@bp.route('/login', methods=['GET', 'POST'])
def login():
    """Страница входа в систему."""
    if request.method == 'POST':
        login = request.form['login']
        password = request.form['password']
        remember_me = request.form.get('remember_me') == 'on'
        user = db.session.execute(db.select(User).filter_by(login=login)).scalar()
        if user and user.check_password(password):
            login_user(user, remember=remember_me)
            return redirect(url_for('index'))
        flash('Неправильное имя пользователя или пароль', 'danger')
    return render_template('auth/login.html')

@bp.route('/logout')
@login_required
def logout():
    """Выход из системы."""
    logout_user()
    return redirect(url_for('index'))

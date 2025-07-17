from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import re

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy()
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Для доступа к этой странице необходимо войти в систему'

class Role(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(200))
    users = db.relationship('User', backref='role', lazy=True)

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    login = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    last_name = db.Column(db.String(50))
    first_name = db.Column(db.String(50), nullable=False)
    middle_name = db.Column(db.String(50))
    role_id = db.Column(db.Integer, db.ForeignKey('role.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def get_full_name(self):
        parts = [self.last_name, self.first_name, self.middle_name]
        return ' '.join(filter(None, parts))

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

def validate_login(login):
    if not login:
        return "Поле не может быть пустым"
    if len(login) < 5:
        return "Логин должен содержать не менее 5 символов"
    if not re.match(r'^[a-zA-Z0-9]+$', login):
        return "Логин должен состоять только из латинских букв и цифр"
    return None

def validate_password(password):
    if not password:
        return "Поле не может быть пустым"
    if len(password) < 8:
        return "Пароль должен содержать не менее 8 символов"
    if len(password) > 128:
        return "Пароль должен содержать не более 128 символов"
    if not re.search(r'[a-zA-Zа-яА-Я]', password):
        return "Пароль должен содержать хотя бы одну букву"
    if not re.search(r'[a-zA-Z]', password) and not re.search(r'[а-яА-Я]', password):
        return "Пароль должен содержать только латинские или кириллические буквы"
    if not re.search(r'[A-ZА-Я]', password):
        return "Пароль должен содержать хотя бы одну заглавную букву"
    if not re.search(r'[a-zа-я]', password):
        return "Пароль должен содержать хотя бы одну строчную букву"
    if not re.search(r'[0-9]', password):
        return "Пароль должен содержать хотя бы одну цифру"
    if ' ' in password:
        return "Пароль не должен содержать пробелы"
    allowed_chars = r'^[a-zA-Zа-яА-Я0-9~!?@#$%^&*_\-+()[\]{}<>/\\|"\'.,;:]+$'
    if not re.match(allowed_chars, password):
        return "Пароль содержит недопустимые символы"
    return None

def validate_name(name, field_name):
    if not name:
        return f"Поле {field_name} не может быть пустым"
    return None

@app.route('/')
@login_required
def index():
    if current_user.role and current_user.role.name == 'Администратор':
        users = User.query.all()
        is_admin = True
    else:
        users = [current_user]
        is_admin = False
    return render_template('index.html', users=users, is_admin=is_admin)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        login_name = request.form['login']
        password = request.form['password']
        remember = 'remember' in request.form
        
        user = User.query.filter_by(login=login_name).first()
        
        if user and check_password_hash(user.password_hash, password):
            login_user(user, remember=remember)
            next_page = request.args.get('next')
            return redirect(next_page) if next_page else redirect(url_for('index'))
        else:
            flash('Неверный логин или пароль', 'error')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/user/<int:user_id>')
@login_required
def view_user(user_id):
    user = db.get_or_404(User, user_id)
    
    if not (current_user.id == user_id or (current_user.role and current_user.role.name == 'Администратор')):
        flash('У вас нет прав для просмотра этого пользователя', 'error')
        return redirect(url_for('index'))
    
    return render_template('view_user.html', user=user)

@app.route('/user/create', methods=['GET', 'POST'])
@login_required
def create_user():
    if not (current_user.role and current_user.role.name == 'Администратор'):
        flash('У вас нет прав для создания пользователей', 'error')
        return redirect(url_for('index'))
    if request.method == 'POST':
        login = request.form['login']
        password = request.form['password']
        last_name = request.form['last_name']
        first_name = request.form['first_name']
        middle_name = request.form['middle_name']
        role_id = request.form['role_id'] if request.form['role_id'] else None
        
        errors = {}
        
        login_error = validate_login(login)
        if login_error:
            errors['login'] = login_error
        elif User.query.filter_by(login=login).first():
            errors['login'] = 'Пользователь с таким логином уже существует'
        
        password_error = validate_password(password)
        if password_error:
            errors['password'] = password_error
        
        first_name_error = validate_name(first_name, 'Имя')
        if first_name_error:
            errors['first_name'] = first_name_error
            
        last_name_error = validate_name(last_name, 'Фамилия')
        if last_name_error:
            errors['last_name'] = last_name_error
        
        if not errors:
            try:
                user = User(
                    login=login,
                    password_hash=generate_password_hash(password),
                    last_name=last_name if last_name else None,
                    first_name=first_name,
                    middle_name=middle_name if middle_name else None,
                    role_id=role_id
                )
                db.session.add(user)
                db.session.commit()
                flash('Пользователь успешно создан', 'success')
                return redirect(url_for('index'))
            except Exception as e:
                db.session.rollback()
                flash('Ошибка при создании пользователя', 'error')
        
        roles = Role.query.all()
        return render_template('create_user.html', roles=roles, errors=errors, form_data=request.form)
    
    roles = Role.query.all()
    return render_template('create_user.html', roles=roles, errors={}, form_data={})

@app.route('/user/<int:user_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_user(user_id):
    user = db.get_or_404(User, user_id)
    
    if not (current_user.id == user_id or (current_user.role and current_user.role.name == 'Администратор')):
        flash('У вас нет прав для редактирования этого пользователя', 'error')
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        last_name = request.form['last_name']
        first_name = request.form['first_name']
        middle_name = request.form['middle_name']
        role_id = request.form['role_id'] if request.form['role_id'] else None
        
        errors = {}
        
        first_name_error = validate_name(first_name, 'Имя')
        if first_name_error:
            errors['first_name'] = first_name_error
            
        last_name_error = validate_name(last_name, 'Фамилия')
        if last_name_error:
            errors['last_name'] = last_name_error
        
        if not errors:
            try:
                user.last_name = last_name if last_name else None
                user.first_name = first_name
                user.middle_name = middle_name if middle_name else None
                user.role_id = role_id
                db.session.commit()
                flash('Пользователь успешно обновлен', 'success')
                return redirect(url_for('index'))
            except Exception as e:
                db.session.rollback()
                flash('Ошибка при обновлении пользователя', 'error')
        
        roles = Role.query.all()
        return render_template('edit_user.html', user=user, roles=roles, errors=errors, form_data=request.form)
    
    roles = Role.query.all()
    return render_template('edit_user.html', user=user, roles=roles, errors={}, form_data={})

@app.route('/user/<int:user_id>/delete', methods=['POST'])
@login_required
def delete_user(user_id):
    user = db.get_or_404(User, user_id)
    
    if not (current_user.id == user_id or (current_user.role and current_user.role.name == 'Администратор')):
        flash('У вас нет прав для удаления этого пользователя', 'error')
        return redirect(url_for('index'))
    try:
        db.session.delete(user)
        db.session.commit()
        flash('Пользователь успешно удален', 'success')
    except Exception as e:
        db.session.rollback()
        flash('Ошибка при удалении пользователя', 'error')
    return redirect(url_for('index'))

@app.route('/change-password', methods=['GET', 'POST'])
@login_required
def change_password():
    if request.method == 'POST':
        old_password = request.form['old_password']
        new_password = request.form['new_password']
        confirm_password = request.form['confirm_password']
        
        errors = {}
        
        if not check_password_hash(current_user.password_hash, old_password):
            errors['old_password'] = 'Неверный старый пароль'
        
        password_error = validate_password(new_password)
        if password_error:
            errors['new_password'] = password_error
        
        if new_password != confirm_password:
            errors['confirm_password'] = 'Пароли не совпадают'
        
        if not errors:
            try:
                current_user.password_hash = generate_password_hash(new_password)
                db.session.commit()
                flash('Пароль успешно изменен', 'success')
                return redirect(url_for('index'))
            except Exception as e:
                db.session.rollback()
                flash('Ошибка при изменении пароля', 'error')
        
        return render_template('change_password.html', errors=errors)
    
    return render_template('change_password.html', errors={})

def init_db():
    with app.app_context():
        db.create_all()
        
        if not Role.query.first():
            admin_role = Role(name='Администратор', description='Полный доступ к системе')
            user_role = Role(name='Пользователь', description='Обычный пользователь')
            db.session.add(admin_role)
            db.session.add(user_role)
            db.session.commit()
            
            admin_user = User(
                login='admin',
                password_hash=generate_password_hash('Admin123!'),
                first_name='Администратор',
                last_name='Системы',
                role_id=admin_role.id
            )
            
            regular_user = User(
                login='user1',
                password_hash=generate_password_hash('User123!'),
                first_name='Иван',
                last_name='Петров',
                middle_name='Сергеевич',
                role_id=user_role.id
            )
            
            db.session.add(admin_user)
            db.session.add(regular_user)
            db.session.commit()

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=8000) 
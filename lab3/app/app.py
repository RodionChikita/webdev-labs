from flask import Flask, render_template, request, session, redirect, url_for, flash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
app.secret_key = 'your-secret-key-here-lab3'

# Настройка Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Для доступа к запрашиваемой странице необходимо пройти процедуру аутентификации.'
login_manager.login_message_category = 'info'

# Пользователь для аутентификации
class User(UserMixin):
    def __init__(self, id):
        self.id = id
        self.username = id
        self.password_hash = generate_password_hash('qwerty')
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# Единственный пользователь
users = {'user': User('user')}

@login_manager.user_loader
def load_user(user_id):
    return users.get(user_id)

@app.route('/')
def index():
    """Главная страница"""
    return render_template('index.html')

@app.route('/counter')
def counter():
    """Страница счетчика посещений"""
    if 'visit_count' not in session:
        session['visit_count'] = 0
    session['visit_count'] += 1
    return render_template('counter.html', count=session['visit_count'])

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Страница входа"""
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        remember = 'remember' in request.form
        
        user = users.get(username)
        if user and user.check_password(password):
            login_user(user, remember=remember)
            flash('Вы успешно вошли в систему!', 'success')
            
            # Перенаправление на запрашиваемую ранее страницу
            next_page = request.args.get('next')
            if next_page:
                return redirect(next_page)
            return redirect(url_for('index'))
        else:
            flash('Неверно введённые данные. Проверьте логин и пароль.', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    """Выход из системы"""
    logout_user()
    flash('Вы вышли из системы.', 'info')
    return redirect(url_for('index'))

@app.route('/secret')
@login_required
def secret():
    """Секретная страница только для аутентифицированных пользователей"""
    return render_template('secret.html')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000) 
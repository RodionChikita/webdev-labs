import re
from flask import Flask, render_template, request, make_response, redirect, url_for

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/request_info')
def request_info():
    """Отображение общей информации о запросе"""
    return render_template('request_info.html')

@app.route('/url_params')
def url_params():
    """Отображение параметров URL"""
    return render_template('url_params.html', params=request.args)

@app.route('/headers')
def headers():
    """Отображение заголовков запроса"""
    return render_template('headers.html', headers=request.headers)

@app.route('/cookies')
def cookies():
    """Отображение cookies"""
    return render_template('cookies.html', cookies=request.cookies)

@app.route('/form_params', methods=['GET', 'POST'])
def form_params():
    """Отображение параметров формы"""
    if request.method == 'POST':
        return render_template('form_params.html', 
                             form_data=request.form, 
                             method='POST')
    return render_template('form_params.html', 
                         form_data=request.args, 
                         method='GET')

@app.route('/set_cookie')
def set_cookie():
    """Установка cookie для демонстрации"""
    response = make_response(redirect(url_for('cookies')))
    response.set_cookie('demo_cookie', 'demo_value')
    response.set_cookie('test_cookie', 'test_value')
    return response

@app.route('/phone_form', methods=['GET', 'POST'])
def phone_form():
    """Форма для валидации номера телефона"""
    if request.method == 'POST':
        phone = request.form.get('phone', '').strip()
        error_message = None
        formatted_phone = None

        if phone:
            validation_result = validate_phone(phone)
            if validation_result['is_valid']:
                formatted_phone = validation_result['formatted']
            else:
                error_message = validation_result['error']
        
        return render_template('phone_form.html', 
                             phone=phone,
                             error_message=error_message,
                             formatted_phone=formatted_phone)
    
    return render_template('phone_form.html')

def validate_phone(phone):
    """Валидация номера телефона согласно требованиям"""
    allowed_pattern = r'^[0-9+\s\(\)\-\.]+$'
    
    # Проверка на недопустимые символы
    if not re.match(allowed_pattern, phone):
        return {
            'is_valid': False,
            'error': 'Недопустимый ввод. В номере телефона встречаются недопустимые символы.'
        }

    digits_only = re.sub(r'\D', '', phone)

    if phone.startswith('+7') or phone.startswith('8'):
        # Должно быть 11 цифр
        if len(digits_only) != 11:
            return {
                'is_valid': False,
                'error': 'Недопустимый ввод. Неверное количество цифр.'
            }
    else:
        if len(digits_only) != 10:
            return {
                'is_valid': False,
                'error': 'Недопустимый ввод. Неверное количество цифр.'
            }

    formatted = format_phone(digits_only)
    
    return {
        'is_valid': True,
        'formatted': formatted
    }

def format_phone(digits):
    """Преобразование номера в формат 8-***-***-**-**"""
    if len(digits) == 11:
        if digits.startswith('7'):
            digits = '8' + digits[1:]
        return f"{digits[0]}-{digits[1:4]}-{digits[4:7]}-{digits[7:9]}-{digits[9:11]}"
    elif len(digits) == 10:
        return f"8-{digits[0:3]}-{digits[3:6]}-{digits[6:8]}-{digits[8:10]}"
    
    return digits

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000) 
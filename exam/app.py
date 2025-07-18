from flask import Flask, render_template, request, jsonify
import os
import requests
from urllib.parse import urlencode
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)

app.config['SECRET_KEY'] = 'your-secret-key-here'

API_KEY = '9f4cde62-7236-43ac-84c0-ce4162623d89'
API_BASE_URL = 'https://edu.std-900.ist.mospolytech.ru'

@app.route('/')
def index():
    """Главная страница с каталогом товаров."""
    return render_template('index.html')

@app.route('/cart')
def cart():
    """Страница корзины."""
    return render_template('cart.html')

@app.route('/account')
def account():
    """Страница личного кабинета."""
    return render_template('account.html')

@app.route('/order/edit/<int:order_id>')
def edit_order(order_id):
    """Страница редактирования заказа."""
    return render_template('edit_order.html', order_id=order_id)

@app.route('/api/config')
def api_config():
    """Возвращает конфигурацию API для JavaScript."""
    return jsonify({
        'apiKey': '',
        'apiBaseUrl': ''
    })

@app.route('/api/goods')
def proxy_goods():
    """Прокси для получения списка товаров."""
    try:
        params = dict(request.args)
        params['api_key'] = API_KEY
        
        response = requests.get(
            f'{API_BASE_URL}/exam-2024-1/api/goods',
            params=params,
            timeout=10,
            verify=False
        )
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({'error': 'Failed to fetch goods'}), response.status_code
            
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Request failed: {str(e)}'}), 500

@app.route('/api/goods/<int:good_id>')
def proxy_good(good_id):
    """Прокси для получения конкретного товара."""
    try:
        response = requests.get(
            f'{API_BASE_URL}/exam-2024-1/api/goods/{good_id}',
            params={'api_key': API_KEY},
            timeout=10,
            verify=False
        )
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({'error': 'Failed to fetch good'}), response.status_code
            
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Request failed: {str(e)}'}), 500

@app.route('/api/autocomplete')
def proxy_autocomplete():
    """Прокси для автодополнения."""
    try:
        params = dict(request.args)
        params['api_key'] = API_KEY
        
        response = requests.get(
            f'{API_BASE_URL}/exam-2024-1/api/autocomplete',
            params=params,
            timeout=10,
            verify=False
        )
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            return jsonify({'error': 'Failed to fetch autocomplete'}), response.status_code
            
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Request failed: {str(e)}'}), 500

@app.route('/api/orders', methods=['GET', 'POST'])
def proxy_orders():
    """Прокси для работы с заказами."""
    try:
        if request.method == 'GET':
            response = requests.get(
                f'{API_BASE_URL}/exam-2024-1/api/orders',
                params={'api_key': API_KEY},
                timeout=10,
                verify=False
            )
        else:
            order_data = request.get_json()
            response = requests.post(
                f'{API_BASE_URL}/exam-2024-1/api/orders',
                params={'api_key': API_KEY},
                json=order_data,
                timeout=10,
                verify=False
            )
        
        if response.status_code in [200, 201]:
            return jsonify(response.json())
        else:
            return jsonify({'error': 'Failed to process orders'}), response.status_code
            
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Request failed: {str(e)}'}), 500

@app.route('/api/orders/<int:order_id>', methods=['GET', 'PUT', 'DELETE'])
def proxy_order(order_id):
    """Прокси для работы с конкретным заказом."""
    try:
        if request.method == 'GET':
            response = requests.get(
                f'{API_BASE_URL}/exam-2024-1/api/orders/{order_id}',
                params={'api_key': API_KEY},
                timeout=10,
                verify=False
            )
        elif request.method == 'PUT':
            order_data = request.get_json()
            response = requests.put(
                f'{API_BASE_URL}/exam-2024-1/api/orders/{order_id}',
                params={'api_key': API_KEY},
                json=order_data,
                timeout=10,
                verify=False
            )
        else:
            response = requests.delete(
                f'{API_BASE_URL}/exam-2024-1/api/orders/{order_id}',
                params={'api_key': API_KEY},
                timeout=10,
                verify=False
            )
        
        if response.status_code in [200, 201]:
            return jsonify(response.json())
        else:
            error_msg = f'Failed to process order: {response.status_code} - {response.text}'
            return jsonify({'error': error_msg}), response.status_code
            
    except requests.exceptions.RequestException as e:
        error_msg = f'Request failed: {str(e)}'
        return jsonify({'error': error_msg}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    app.run(host='0.0.0.0', port=port, debug=True) 
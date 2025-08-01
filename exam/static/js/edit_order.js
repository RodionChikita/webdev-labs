class EditOrderPage {
    constructor() {
        this.order = null;
        this.orderItems = [];
        this.products = [];
        this.orderId = null;
        this.isLoading = false;
        this.init();
    }

    init() {
        const orderNumberElement = document.getElementById('order-number');
        if (orderNumberElement) {
            this.orderId = parseInt(orderNumberElement.textContent);
        }

        this.setupEventListeners();
        this.loadOrder();
    }

    setupEventListeners() {
        const form = document.getElementById('edit-order-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSaveOrder();
            });
        }
    }

    async loadOrder() {
        this.showLoading();
        try {
            const response = await api.getOrder(this.orderId);
            this.order = response.order || response;
            this.orderItems = [...this.order.good_ids];
            
            await this.loadProducts();
            this.populateForm();
            this.renderOrderItems();
            this.updateOrderSummary();
        } catch (error) {
            console.error('Ошибка загрузки заказа:', error);
            if (app && app.notifications) {
                app.notifications.show('Ошибка при загрузке заказа', 'error');
            } else {
                alert('Ошибка при загрузке заказа');
            }
        } finally {
            this.hideLoading();
        }
    }

    async loadProducts() {
        try {
            const productPromises = this.orderItems.map(id => api.getGood(id));
            this.products = await Promise.all(productPromises);
        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
            this.products = [];
        }
    }

    populateForm() {
        if (!this.order) return;

        const setInputValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value || '';
                }
            }
        };

        setInputValue('full-name', this.order.full_name);
        setInputValue('email', this.order.email);
        setInputValue('phone', this.order.phone);
        setInputValue('subscribe', this.order.subscribe);
        setInputValue('delivery-address', this.order.delivery_address);
        setInputValue('delivery-date', this.formatDateForInput(this.order.delivery_date));
        setInputValue('delivery-interval', this.order.delivery_interval);
        setInputValue('comment', this.order.comment);
    }

    formatDateForInput(dateString) {
        if (!dateString) return '';
        
        if (dateString.includes('.')) {
            const [day, month, year] = dateString.split('.');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        return dateString.split('T')[0];
    }

    formatDateForAPI(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    renderOrderItems() {
        const orderItemsContainer = document.getElementById('order-items');
        if (!orderItemsContainer) return;

        orderItemsContainer.innerHTML = '';

        if (this.products.length === 0) {
            orderItemsContainer.innerHTML = `
                <div class="empty-cart">
                    <h3>Товары не найдены</h3>
                    <p>Товары для редактирования недоступны.</p>
                </div>
            `;
            return;
        }

        this.products.forEach(product => {
            const cartItem = this.createCartItem(product);
            orderItemsContainer.appendChild(cartItem);
        });
    }

    createCartItem(product) {
        const item = document.createElement('div');
        item.className = 'cart-item';
        
        const hasDiscount = product.discount_price && product.discount_price < product.actual_price;
        const price = hasDiscount ? product.discount_price : product.actual_price;
        
        item.innerHTML = `
            <img src="${product.image_url}" alt="${product.name}" 
                 class="cart-item-image" onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'">
            <div class="cart-item-info">
                <h3 class="cart-item-name">${product.name}</h3>
                <div class="product-rating">
                    <div class="stars">${this.generateStars(product.rating)}</div>
                    <span>${product.rating}</span>
                </div>
                <div class="cart-item-price">
                    ${this.formatPrice(price)}
                    ${hasDiscount ? `<span class="original-price">${this.formatPrice(product.actual_price)}</span>` : ''}
                </div>
            </div>
        `;

        return item;
    }

    updateOrderSummary() {
        const itemsTotal = this.calculateItemsTotal();
        const totalPrice = itemsTotal;

        const itemsTotalElement = document.getElementById('items-total');
        const totalCostElement = document.getElementById('total-cost');

        if (itemsTotalElement) {
            itemsTotalElement.textContent = this.formatPrice(itemsTotal);
        }
        if (totalCostElement) {
            totalCostElement.textContent = this.formatPrice(totalPrice);
        }
    }

    calculateItemsTotal() {
        return this.products.reduce((total, product) => {
            const price = product.discount_price || product.actual_price;
            return total + price;
        }, 0);
    }

    formatPrice(price) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(price);
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        let stars = '';
        
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        const emptyStars = 5 - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }

    showLoading() {
        const loadingElement = document.getElementById('order-loading');
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
    }

    hideLoading() {
        const loadingElement = document.getElementById('order-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    async handleSaveOrder() {
        if (this.isLoading) return;

        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }

        this.isLoading = true;
        const saveButton = document.getElementById('save-order');
        const originalText = saveButton.textContent;
        saveButton.textContent = 'Сохранение...';
        saveButton.disabled = true;

        try {
            const orderData = {};
            
            if (formData.fullName !== this.order.full_name) {
                orderData.full_name = formData.fullName;
            }
            if (formData.email !== this.order.email) {
                orderData.email = formData.email;
            }
            if (formData.phone !== this.order.phone) {
                orderData.phone = formData.phone;
            }
            if (formData.subscribe !== this.order.subscribe) {
                orderData.subscribe = formData.subscribe ? 1 : 0;
            }
            if (formData.deliveryAddress !== this.order.delivery_address) {
                orderData.delivery_address = formData.deliveryAddress;
            }
            const formattedDate = this.formatDateForAPI(formData.deliveryDate);
            if (formattedDate !== this.order.delivery_date) {
                orderData.delivery_date = formattedDate;
            }
            if (formData.deliveryInterval !== this.order.delivery_interval) {
                orderData.delivery_interval = formData.deliveryInterval;
            }
            if (formData.comment !== (this.order.comment || '')) {
                orderData.comment = formData.comment || '';
            }

            const response = await api.updateOrder(this.orderId, orderData);
            
            if (app && app.notifications) {
                app.notifications.show('Заказ успешно обновлен!', 'success');
            } else {
                alert('Заказ успешно обновлен!');
            }
            
            setTimeout(() => {
                window.location.href = '/account';
            }, 1000);
            
        } catch (error) {
            console.error('Ошибка сохранения заказа:', error);
            if (app && app.notifications) {
                app.notifications.show(`Ошибка при сохранении заказа: ${error.message}`, 'error');
            } else {
                alert(`Ошибка при сохранении заказа: ${error.message}`);
            }
        } finally {
            this.isLoading = false;
            saveButton.textContent = originalText;
            saveButton.disabled = false;
        }
    }

    getFormData() {
        const getValue = (id) => {
            const element = document.getElementById(id);
            return element ? element.value.trim() : '';
        };

        const getChecked = (id) => {
            const element = document.getElementById(id);
            return element ? element.checked : false;
        };

        return {
            fullName: getValue('full-name'),
            email: getValue('email'),
            phone: getValue('phone'),
            subscribe: getChecked('subscribe'),
            deliveryAddress: getValue('delivery-address'),
            deliveryDate: getValue('delivery-date'),
            deliveryInterval: getValue('delivery-interval'),
            comment: getValue('comment')
        };
    }

    validateForm(formData) {
        const showError = (message) => {
            if (app && app.notifications) {
                app.notifications.show(message, 'error');
            } else {
                alert(message);
            }
        };

        if (!formData.fullName) {
            showError('Пожалуйста, укажите имя');
            return false;
        }

        if (!formData.email) {
            showError('Пожалуйста, укажите email');
            return false;
        }

        if (!formData.phone) {
            showError('Пожалуйста, укажите телефон');
            return false;
        }

        if (!formData.deliveryAddress) {
            showError('Пожалуйста, укажите адрес доставки');
            return false;
        }

        if (!formData.deliveryDate) {
            showError('Пожалуйста, укажите дату доставки');
            return false;
        }

        if (!formData.deliveryInterval) {
            showError('Пожалуйста, выберите интервал доставки');
            return false;
        }

        return true;
    }
}

let editOrderPage;

function initEditOrderPage() {
    if (window.api && typeof window.api.getOrder === 'function') {
        editOrderPage = new EditOrderPage();
        return true;
    }
    return false;
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('edit-order-form')) {
        if (!initEditOrderPage()) {
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                if (initEditOrderPage() || attempts > 50) {
                    clearInterval(checkInterval);
                }
            }, 100);
        }
    }
}); 
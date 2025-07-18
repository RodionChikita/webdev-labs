class CartPage {
    constructor() {
        this.cartItems = [];
        this.products = [];
        this.baseDeliveryPrice = 200;
        this.isLoading = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCartItems();
        this.setupFormValidation();
        this.setMinDeliveryDate();
    }

    setupEventListeners() {
        const orderForm = document.getElementById('order-form');
        if (orderForm) {
            orderForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleOrderSubmit();
            });
        }

        const deliveryDate = document.getElementById('delivery-date');
        const deliveryInterval = document.getElementById('delivery-interval');
        
        if (deliveryDate) {
            deliveryDate.addEventListener('change', () => {
                this.updateDeliveryPrice();
            });
        }
        
        if (deliveryInterval) {
            deliveryInterval.addEventListener('change', () => {
                this.updateDeliveryPrice();
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-from-cart-btn')) {
                const productId = parseInt(e.target.dataset.productId);
                this.removeFromCart(productId);
            }
        });
    }

    async loadCartItems() {
        this.showLoading();
        
        try {
            this.cartItems = app.cart.getCartItems();
            
            if (this.cartItems.length === 0) {
                this.showEmptyCart();
                return;
            }

            const productPromises = this.cartItems.map(id => api.getGood(id));
            this.products = await Promise.all(productPromises);
            
            this.renderCartItems();
            this.updateOrderSummary();
            
        } catch (error) {
            app.notifications.show('Ошибка при загрузке корзины', 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderCartItems() {
        const cartItemsContainer = document.getElementById('cart-items');
        if (!cartItemsContainer) return;

        cartItemsContainer.innerHTML = '';
        
        this.products.forEach(product => {
            const cartItem = this.createCartItem(product);
            cartItemsContainer.appendChild(cartItem);
        });

        this.hideEmptyCart();
    }

    createCartItem(product) {
        const item = document.createElement('div');
        item.className = 'cart-item';
        
        const hasDiscount = product.discount_price && product.discount_price < product.actual_price;
        const price = hasDiscount ? product.discount_price : product.actual_price;
        
        item.innerHTML = `
            <img src="${product.image_url}" alt="${Utils.sanitizeHTML(product.name)}" 
                 class="cart-item-image" onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'">
            <div class="cart-item-info">
                <h3 class="cart-item-name">${Utils.sanitizeHTML(product.name)}</h3>
                <div class="product-rating">
                    <div class="stars">${Utils.generateStars(product.rating)}</div>
                    <span>${product.rating}</span>
                </div>
                <div class="cart-item-price">
                    ${Utils.formatPrice(price)}
                    ${hasDiscount ? `<span class="original-price">${Utils.formatPrice(product.actual_price)}</span>` : ''}
                </div>
            </div>
            <button class="btn btn-danger btn-icon remove-from-cart-btn" 
                    data-product-id="${product.id}" title="Удалить из корзины">
                <i class="fas fa-trash"></i>
            </button>
        `;

        return item;
    }

    removeFromCart(productId) {
        app.cart.removeItem(productId);
        
        this.cartItems = app.cart.getCartItems();
        
        if (this.cartItems.length === 0) {
            this.showEmptyCart();
        } else {
            this.products = this.products.filter(product => product.id !== productId);
            this.renderCartItems();
            this.updateOrderSummary();
        }
    }

    updateOrderSummary() {
        const itemsTotal = this.calculateItemsTotal();
        const totalPrice = itemsTotal;

        const itemsTotalElement = document.getElementById('items-total');
        const totalCostElement = document.getElementById('total-cost');

        if (itemsTotalElement) {
            itemsTotalElement.textContent = Utils.formatPrice(itemsTotal);
        }
        if (totalCostElement) {
            totalCostElement.textContent = Utils.formatPrice(totalPrice);
        }
    }

    calculateItemsTotal() {
        return this.products.reduce((total, product) => {
            const price = product.discount_price || product.actual_price;
            return total + price;
        }, 0);
    }

    updateDeliveryPrice() {
        this.updateOrderSummary();
    }

    async handleOrderSubmit() {
        if (this.isLoading) return;

        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }

        this.isLoading = true;
        const submitButton = document.getElementById('place-order');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Оформление...';
        submitButton.disabled = true;

        try {
            const orderData = {
                full_name: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                subscribe: formData.subscribe ? 1 : 0,
                delivery_address: formData.deliveryAddress,
                delivery_date: this.formatDateForAPI(formData.deliveryDate),
                delivery_interval: formData.deliveryInterval,
                comment: formData.comment || '',
                good_ids: this.cartItems.map(id => String(id))
            };

            const response = await api.createOrder(orderData);
            
            app.notifications.show('Заказ успешно оформлен!', 'success');
            
            app.cart.clearCart();
            
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
            
        } catch (error) {
            app.notifications.show('Ошибка при оформлении заказа. Попробуйте позже.', 'error');
        } finally {
            this.isLoading = false;
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    getFormData() {
        const form = document.getElementById('order-form');
        const formData = new FormData(form);
        
        return {
            fullName: formData.get('full_name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            subscribe: formData.get('subscribe') === 'on',
            deliveryAddress: formData.get('delivery_address'),
            deliveryDate: formData.get('delivery_date'),
            deliveryInterval: formData.get('delivery_interval'),
            comment: formData.get('comment')
        };
    }

    validateForm(formData) {
        const errors = [];
        
        if (!formData.fullName || formData.fullName.trim().length < 2) {
            errors.push('Имя должно содержать минимум 2 символа');
        }
        
        if (!formData.email || !this.validateEmail(formData.email)) {
            errors.push('Введите корректный email');
        }
        
        if (!formData.phone || !this.validatePhone(formData.phone)) {
            errors.push('Введите корректный номер телефона');
        }
        
        if (!formData.deliveryAddress || formData.deliveryAddress.trim().length < 5) {
            errors.push('Адрес доставки должен содержать минимум 5 символов');
        }
        
        if (!formData.deliveryDate) {
            errors.push('Выберите дату доставки');
        }
        
        if (!formData.deliveryInterval) {
            errors.push('Выберите интервал доставки');
        }
        
        if (errors.length > 0) {
            app.notifications.show(errors.join('. '), 'error');
            return false;
        }
        
        return true;
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePhone(phone) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    formatDateForAPI(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    setupFormValidation() {
        const form = document.getElementById('order-form');
        if (!form) return;

        const inputs = form.querySelectorAll('input[required], select[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
        });
    }

    validateField(field) {
        const value = field.value.trim();
        let isValid = true;
        let errorMessage = '';

        switch (field.type) {
            case 'email':
                isValid = this.validateEmail(value);
                errorMessage = 'Введите корректный email';
                break;
            case 'tel':
                isValid = this.validatePhone(value);
                errorMessage = 'Введите корректный номер телефона';
                break;
            case 'text':
                isValid = value.length >= 2;
                errorMessage = 'Минимум 2 символа';
                break;
            case 'date':
                isValid = value !== '';
                errorMessage = 'Выберите дату';
                break;
            case 'select-one':
                isValid = value !== '';
                errorMessage = 'Выберите значение';
                break;
        }

        if (isValid) {
            field.classList.remove('error');
            field.classList.add('valid');
        } else {
            field.classList.remove('valid');
            field.classList.add('error');
        }
    }

    setMinDeliveryDate() {
        const deliveryDateInput = document.getElementById('delivery-date');
        if (deliveryDateInput) {
            deliveryDateInput.min = Utils.getMinDeliveryDate();
            deliveryDateInput.max = Utils.getMaxDeliveryDate();
        }
    }

    showLoading() {
        const loading = document.getElementById('cart-loading');
        if (loading) {
            loading.style.display = 'block';
        }
    }

    hideLoading() {
        const loading = document.getElementById('cart-loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    showEmptyCart() {
        const emptyCart = document.getElementById('empty-cart');
        const cartItems = document.getElementById('cart-items');
        
        if (emptyCart) {
            emptyCart.style.display = 'block';
        }
        if (cartItems) {
            cartItems.style.display = 'none';
        }
        
        const orderSection = document.querySelector('.order-section');
        if (orderSection) {
            orderSection.style.display = 'none';
        }
    }

    hideEmptyCart() {
        const emptyCart = document.getElementById('empty-cart');
        const cartItems = document.getElementById('cart-items');
        
        if (emptyCart) {
            emptyCart.style.display = 'none';
        }
        if (cartItems) {
            cartItems.style.display = 'block';
        }
        
        const orderSection = document.querySelector('.order-section');
        if (orderSection) {
            orderSection.style.display = 'block';
        }
    }
}

let cartPage;
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('order-form') || document.getElementById('cart-items')) {
        cartPage = new CartPage();
    }
}); 
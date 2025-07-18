class App {
    constructor() {
        this.cart = new Cart();
        this.notifications = new Notifications();
        this.modals = new Modals();
        this.search = new Search();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.cart.updateCartCount();
    }

    setupEventListeners() {
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.search.handleInput(e.target.value);
            });
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.search.performSearch(e.target.value);
                }
            });
        }
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.search.performSearch(searchInput.value);
            });
        }
    }
}

class Cart {
    constructor() {
        this.items = this.getCartItems();
    }

    getCartItems() {
        try {
            return JSON.parse(localStorage.getItem('cart') || '[]');
        } catch (error) {
            return [];
        }
    }

    saveCartItems() {
        try {
            localStorage.setItem('cart', JSON.stringify(this.items));
            this.updateCartCount();
        } catch (error) {
            console.error('Ошибка при сохранении корзины:', error);
        }
    }

    addItem(productId) {
        if (!this.items.includes(productId)) {
            this.items.push(productId);
            this.saveCartItems();
            app.notifications.show('Товар добавлен в корзину', 'success');
        } else {
            app.notifications.show('Товар уже в корзине', 'info');
        }
    }

    removeItem(productId) {
        this.items = this.items.filter(id => id !== productId);
        this.saveCartItems();
        app.notifications.show('Товар удален из корзины', 'success');
    }

    clearCart() {
        this.items = [];
        this.saveCartItems();
    }

    updateCartCount() {
        const cartCountElement = document.getElementById('cart-count');
        if (cartCountElement) {
            cartCountElement.textContent = this.items.length;
            cartCountElement.style.display = this.items.length > 0 ? 'flex' : 'none';
        }
    }

    hasItem(productId) {
        return this.items.includes(productId);
    }
}

class Notifications {
    constructor() {
        this.container = this.createContainer();
    }

    createContainer() {
        const container = document.createElement('div');
        container.className = 'notifications-container';
        document.body.appendChild(container);
        return container;
    }

    show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = this.getIcon(type);
        notification.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        this.container.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    getIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }
}

class Modals {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop')) {
                this.close(e.target);
            }
            
            if (e.target.classList.contains('modal-close')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.close(modal);
                }
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.show');
                if (openModal) {
                    this.close(openModal);
                }
            }
        });
    }

    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            document.body.classList.add('modal-open');
        }
    }

    close(modal) {
        if (modal) {
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
        }
    }
}

class Search {
    constructor() {
        this.searchTimeout = null;
        this.autocompleteContainer = null;
        this.setupAutocomplete();
    }

    setupAutocomplete() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            this.autocompleteContainer = document.createElement('div');
            this.autocompleteContainer.className = 'autocomplete-container';
            searchInput.parentNode.appendChild(this.autocompleteContainer);
            
            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target) && !this.autocompleteContainer.contains(e.target)) {
                    this.hideAutocomplete();
                }
            });
        }
    }

    handleInput(query) {
        clearTimeout(this.searchTimeout);
        
        if (query.length < 2) {
            this.hideAutocomplete();
            return;
        }
        
        this.searchTimeout = setTimeout(() => {
            this.loadAutocomplete(query);
        }, 300);
    }

    async loadAutocomplete(query) {
        try {
            const response = await api.autocomplete(query);
            this.showAutocomplete(response);
        } catch (error) {
            console.error('Ошибка автодополнения:', error);
        }
    }

    showAutocomplete(suggestions) {
        if (!suggestions || suggestions.length === 0) {
            this.hideAutocomplete();
            return;
        }
        
        this.autocompleteContainer.innerHTML = '';
        
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.textContent = suggestion;
            item.addEventListener('click', () => {
                this.performSearch(suggestion);
            });
            this.autocompleteContainer.appendChild(item);
        });
        
        this.autocompleteContainer.style.display = 'block';
    }

    hideAutocomplete() {
        if (this.autocompleteContainer) {
            this.autocompleteContainer.style.display = 'none';
        }
    }

    performSearch(query) {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = query;
        }
        
        this.hideAutocomplete();
        
        if (window.catalog) {
            window.catalog.searchProducts(query);
        } else {
            window.location.href = `/?query=${encodeURIComponent(query)}`;
        }
    }
}

class Utils {
    static formatPrice(price) {
        if (price === null || price === undefined) {
            return '0 ₽';
        }
        return new Intl.NumberFormat('ru-RU').format(Math.round(price)) + ' ₽';
    }

    static formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    }

    static formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleString('ru-RU');
    }

    static generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }

    static sanitizeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }

    static calculateDeliveryPriceChange(date, interval) {
        const selectedDate = new Date(date);
        const today = new Date();
        const daysDifference = Math.ceil((selectedDate - today) / (1000 * 60 * 60 * 24));
        
        let priceChange = 0;
        
        if (daysDifference === 0) {
            priceChange += 500;
        } else if (daysDifference === 1) {
            priceChange += 300;
        } else if (daysDifference === 2) {
            priceChange += 100;
        }
        
        if (interval === '18:00-22:00') {
            priceChange += 200;
        } else if (interval === '08:00-12:00') {
            priceChange += 100;
        }
        
        return priceChange;
    }

    static getMinDeliveryDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }

    static getMaxDeliveryDate() {
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 30);
        return maxDate.toISOString().split('T')[0];
    }
}

window.App = App;
window.Cart = Cart;
window.Notifications = Notifications;
window.Modals = Modals;
window.Search = Search;
window.Utils = Utils;

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new App();
}); 
class AccountPage {
    constructor() {
        this.orders = [];
        this.currentOrder = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadOrders();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-order-btn');
            if (viewBtn) {
                const orderId = parseInt(viewBtn.dataset.orderId);
                this.viewOrder(orderId);
                return;
            }
            
            const editBtn = e.target.closest('.edit-order-btn');
            if (editBtn) {
                const orderId = parseInt(editBtn.dataset.orderId);
                window.location.href = `/order/edit/${orderId}`;
                return;
            }
            
            const deleteBtn = e.target.closest('.delete-order-btn');
            if (deleteBtn) {
                const orderId = parseInt(deleteBtn.dataset.orderId);
                this.deleteOrder(orderId);
                return;
            }
        });
    }

    async loadOrders() {
        this.showLoading();
        
        try {
            const response = await api.getOrders();
            this.orders = Array.isArray(response) ? response : (Array.isArray(response.orders) ? response.orders : []);
            await this.renderOrders();
        } catch (error) {
            this.showError('Ошибка при загрузке заказов. Попробуйте позже.');
        } finally {
            this.hideLoading();
        }
    }

    async renderOrders() {
        const ordersTableBody = document.getElementById('orders-list');
        if (!ordersTableBody) return;

        ordersTableBody.innerHTML = '';
        
        if (this.orders.length === 0) {
            this.showNoOrders();
            return;
        }

        for (let i = 0; i < this.orders.length; i++) {
            const order = this.orders[i];
            const orderRow = await this.createOrderRow(order, i + 1);
            ordersTableBody.appendChild(orderRow);
        }

        this.hideNoOrders();
    }

    async createOrderRow(order, orderNumber) {
        const row = document.createElement('tr');
        
        const composition = await this.formatOrderComposition(order);
        
        const totalCost = await this.calculateOrderTotal(order);
        
        row.innerHTML = `
            <td>${orderNumber}</td>
            <td>${Utils.formatDateTime(order.created_at)}</td>
            <td class="composition-cell" title="${composition}">${Utils.truncateText(composition, 50)}</td>
            <td>${Utils.formatPrice(totalCost)}</td>
            <td>${Utils.formatDate(order.delivery_date)}</td>
            <td>${order.delivery_interval}</td>
            <td>
                <div class="order-actions">
                    <button class="btn btn-primary btn-small view-order-btn" 
                            data-order-id="${order.id}" title="Просмотр">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-secondary btn-small edit-order-btn" 
                            data-order-id="${order.id}" title="Редактирование">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-small delete-order-btn" 
                            data-order-id="${order.id}" title="Удаление">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    async formatOrderComposition(order) {
        if (!order.good_ids || order.good_ids.length === 0) {
            return 'Нет товаров';
        }
        
        try {
            const productPromises = order.good_ids.map(id => api.getGood(id));
            const products = await Promise.all(productPromises);
            return products.map(product => product.name).join(', ');
        } catch (error) {
            console.error('Ошибка загрузки названий товаров:', error);
            return order.good_ids.join(', ');
        }
    }

    async calculateOrderTotal(order) {
        if (!order.good_ids || order.good_ids.length === 0) {
            return 0;
        }
        
        try {
            const productPromises = order.good_ids.map(id => api.getGood(id));
            const products = await Promise.all(productPromises);
            return products.reduce((total, product) => {
                const price = product.discount_price || product.actual_price;
                return total + price;
            }, 0);
        } catch (error) {
            console.error('Ошибка подсчета стоимости заказа:', error);
            return 0;
        }
    }

    async viewOrder(orderId) {
        try {
            const response = await api.getOrder(orderId);
            this.currentOrder = response.order || response;
            
            const modal = document.getElementById('order-modal');
            const modalTitle = modal.querySelector('.modal-title');
            const modalBody = modal.querySelector('.modal-body');
            
            modalTitle.textContent = `Заказ #${orderId}`;
            modalBody.innerHTML = await this.createOrderViewContent();
            
            const saveBtn = document.getElementById('save-order-btn');
            if (saveBtn) {
                saveBtn.style.display = 'none';
            }
            
            app.modals.open('order-modal');
            
        } catch (error) {
            app.notifications.show('Ошибка при загрузке заказа', 'error');
        }
    }

    async createOrderViewContent() {
        if (!this.currentOrder) return '';

        const composition = await this.formatOrderComposition(this.currentOrder);
        const totalCost = await this.calculateOrderTotal(this.currentOrder);

        return `
            <div class="order-details">
                <div class="detail-row">
                    <strong>Номер заказа:</strong> ${this.currentOrder.id}
                </div>
                <div class="detail-row">
                    <strong>Дата оформления:</strong> ${Utils.formatDateTime(this.currentOrder.created_at)}
                </div>
                <div class="detail-row">
                    <strong>Имя:</strong> ${Utils.sanitizeHTML(this.currentOrder.full_name)}
                </div>
                <div class="detail-row">
                    <strong>Email:</strong> ${Utils.sanitizeHTML(this.currentOrder.email)}
                </div>
                <div class="detail-row">
                    <strong>Телефон:</strong> ${Utils.sanitizeHTML(this.currentOrder.phone)}
                </div>
                <div class="detail-row">
                    <strong>Адрес доставки:</strong> ${Utils.sanitizeHTML(this.currentOrder.delivery_address)}
                </div>
                <div class="detail-row">
                    <strong>Дата доставки:</strong> ${Utils.formatDate(this.currentOrder.delivery_date)}
                </div>
                <div class="detail-row">
                    <strong>Интервал доставки:</strong> ${this.currentOrder.delivery_interval}
                </div>
                <div class="detail-row">
                    <strong>Состав заказа:</strong> ${composition}
                </div>
                <div class="detail-row">
                    <strong>Итоговая стоимость:</strong> ${Utils.formatPrice(totalCost)}
                </div>
                ${this.currentOrder.comment ? `
                    <div class="detail-row">
                        <strong>Комментарий:</strong> ${Utils.sanitizeHTML(this.currentOrder.comment)}
                    </div>
                ` : ''}
            </div>
        `;
    }




    async deleteOrder(orderId) {
        if (!confirm('Вы уверены, что хотите удалить этот заказ?')) {
            return;
        }

        try {
            await api.deleteOrder(orderId);
            
            app.notifications.show('Заказ успешно удален', 'success');
            this.loadOrders();
            
        } catch (error) {
            app.notifications.show('Ошибка при удалении заказа', 'error');
        }
    }

    showLoading() {
        const loading = document.getElementById('orders-loading');
        if (loading) {
            loading.style.display = 'block';
        }
    }

    hideLoading() {
        const loading = document.getElementById('orders-loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    showNoOrders() {
        const noOrders = document.getElementById('no-orders');
        if (noOrders) {
            noOrders.style.display = 'block';
        }
    }

    hideNoOrders() {
        const noOrders = document.getElementById('no-orders');
        if (noOrders) {
            noOrders.style.display = 'none';
        }
    }

    showError(message) {
        app.notifications.show(message, 'error');
    }
}

let accountPage;
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('orders-list')) {
        accountPage = new AccountPage();
    }
}); 
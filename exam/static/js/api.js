class API {
    constructor() {
        this.baseURL = '';
        this.apiKey = '';
        this.initialized = false;
        this.init();
    }

    async init() {
        try {
            const response = await fetch('/api/config');
            const config = await response.json();
            this.baseURL = config.apiBaseUrl;
            this.apiKey = config.apiKey;
            this.initialized = true;
        } catch (error) {
            console.error('Ошибка инициализации API:', error);
        }
    }

    async waitForInit() {
        while (!this.initialized) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    async request(endpoint, options = {}) {
        await this.waitForInit();
        
        const url = new URL(`${window.location.origin}/api${endpoint}`);
        
        if (options.params) {
            Object.entries(options.params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    url.searchParams.append(key, value);
                }
            });
        }

        const config = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        if (options.body) {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            throw error;
        }
    }

    async getGoods(params = {}) {
        return this.request('/goods', { params });
    }

    async getGood(id) {
        return this.request(`/goods/${id}`);
    }

    async searchGoods(query, params = {}) {
        return this.request('/goods', { 
            params: { 
                query, 
                ...params 
            } 
        });
    }

    async autocomplete(query) {
        return this.request('/autocomplete', {
            params: { query }
        });
    }

    async getOrders() {
        return this.request('/orders');
    }

    async getOrder(id) {
        return this.request(`/orders/${id}`);
    }

    async createOrder(orderData) {
        return this.request('/orders', {
            method: 'POST',
            body: orderData
        });
    }

    async updateOrder(id, orderData) {
        return this.request(`/orders/${id}`, {
            method: 'PUT',
            body: orderData
        });
    }

    async deleteOrder(id) {
        return this.request(`/orders/${id}`, {
            method: 'DELETE'
        });
    }
}

window.api = new API(); 
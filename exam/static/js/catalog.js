class Catalog {
    constructor() {
        this.products = [];
        this.allProducts = [];
        this.categories = [];
        this.currentPage = 1;
        this.perPage = 12;
        this.isLoading = false;
        this.searchQuery = '';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadInitialProducts();
        this.setupFilters();
        this.setupSearchFromURL();
    }

    setupEventListeners() {
        const filterForm = document.getElementById('filter-form');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.applyFilters();
            });
        }

        const resetBtn = document.getElementById('reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetFilters();
            });
        }

        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.applySorting(e.target.value);
            });
        }

        const loadMoreBtn = document.getElementById('load-more');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMoreProducts();
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-to-cart-btn')) {
                const productId = parseInt(e.target.dataset.productId);
                this.addToCart(productId);
            }
        });
    }

    setupSearchFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('search') || urlParams.get('query');
        
        if (searchQuery) {
            this.searchQuery = searchQuery;
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = searchQuery;
            }
        }
    }

    async loadInitialProducts() {
        this.showLoading();
        
        try {
            const params = {
                page: this.currentPage,
                per_page: this.perPage
            };

            if (this.searchQuery) {
                params.query = this.searchQuery;
            }

            const response = await api.getGoods(params);
            this.products = Array.isArray(response.goods) ? response.goods : [];
            this.allProducts = [...this.products];
            
            this.extractCategories();
            this.renderCategories();
            this.renderProducts();
            this.updateLoadMoreButton();
            
        } catch (error) {
            this.showError('Ошибка при загрузке товаров. Попробуйте позже.');
        } finally {
            this.hideLoading();
        }
    }

    async loadMoreProducts() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.currentPage++;
        
        try {
            const params = {
                page: this.currentPage,
                per_page: this.perPage
            };

            if (this.searchQuery) {
                params.query = this.searchQuery;
            }

            const response = await api.getGoods(params);
            const newProducts = Array.isArray(response.goods) ? response.goods : [];
            
            this.products.push(...newProducts);
            this.allProducts = [...this.products];
            
            this.renderProducts();
            this.updateLoadMoreButton();
            
        } catch (error) {
            app.notifications.show('Ошибка при загрузке товаров', 'error');
        } finally {
            this.isLoading = false;
        }
    }

    extractCategories() {
        const categorySet = new Set();
        this.products.forEach(product => {
            if (product.category) {
                categorySet.add(product.category);
            }
        });
        this.categories = Array.from(categorySet).sort();
    }

    renderCategories() {
        const categoryFilters = document.getElementById('category-filters');
        if (!categoryFilters) return;

        categoryFilters.innerHTML = '';
        this.categories.forEach(category => {
            const label = document.createElement('label');
            label.className = 'checkbox-label';
            label.innerHTML = `
                <input type="checkbox" value="${category}" name="category">
                <span>${category}</span>
            `;
            categoryFilters.appendChild(label);
        });
    }

    renderProducts() {
        const productsGrid = document.getElementById('products-grid');
        if (!productsGrid) return;

        productsGrid.innerHTML = '';
        
        this.products.forEach(product => {
            const productCard = this.createProductCard(product);
            productsGrid.appendChild(productCard);
        });
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const hasDiscount = product.discount_price && product.discount_price < product.actual_price;
        const price = hasDiscount ? product.discount_price : product.actual_price;
        const isInCart = app.cart.hasItem(product.id);
        
        card.innerHTML = `
            <img src="${product.image_url}" alt="${Utils.sanitizeHTML(product.name)}" 
                 class="product-image" onerror="this.src='https://via.placeholder.com/280x200?text=No+Image'">
            <div class="product-info">
                <h3 class="product-name" title="${Utils.sanitizeHTML(product.name)}">
                    ${Utils.sanitizeHTML(product.name)}
                </h3>
                <div class="product-rating">
                    <div class="stars">${Utils.generateStars(product.rating)}</div>
                    <span>${product.rating}</span>
                </div>
                <div class="product-price">
                    <span class="current-price">${Utils.formatPrice(price)}</span>
                    ${hasDiscount ? `
                        <span class="original-price">${Utils.formatPrice(product.actual_price)}</span>
                        <span class="discount-badge">-${Math.round((1 - product.discount_price / product.actual_price) * 100)}%</span>
                    ` : ''}
                </div>
                <button class="btn btn-primary add-to-cart-btn ${isInCart ? 'btn-success' : ''}" 
                        data-product-id="${product.id}">
                    ${isInCart ? 'В корзине' : 'Добавить в корзину'}
                </button>
            </div>
        `;

        return card;
    }

    applyFilters() {
        const selectedCategories = Array.from(document.querySelectorAll('input[name="category"]:checked'))
            .map(input => input.value);
        const minPrice = parseFloat(document.getElementById('price-min').value) || 0;
        const maxPrice = parseFloat(document.getElementById('price-max').value) || Infinity;
        const hasDiscount = document.getElementById('discount-only').checked;

        this.products = this.allProducts.filter(product => {
            const price = product.discount_price || product.actual_price;
            
            if (selectedCategories.length > 0 && !selectedCategories.includes(product.main_category)) return false;
            if (price < minPrice || price > maxPrice) return false;
            if (hasDiscount && !product.discount_price) return false;
            
            return true;
        });

        this.renderProducts();
        this.updateLoadMoreButton();
    }

    resetFilters() {
        document.querySelectorAll('input[name="category"]').forEach(input => {
            input.checked = false;
        });
        document.getElementById('price-min').value = '';
        document.getElementById('price-max').value = '';
        document.getElementById('discount-only').checked = false;
        document.getElementById('sort-select').value = 'default';

        this.products = [...this.allProducts];
        this.renderProducts();
        this.updateLoadMoreButton();
    }

    applySorting(sortBy) {
        this.products.sort((a, b) => {
            const priceA = a.discount_price || a.actual_price;
            const priceB = b.discount_price || b.actual_price;
            
            switch (sortBy) {
                case 'price-asc':
                    return priceA - priceB;
                case 'price-desc':
                    return priceB - priceA;
                case 'rating-desc':
                    return b.rating - a.rating;
                case 'rating-asc':
                    return a.rating - b.rating;
                case 'name':
                default:
                    return a.name.localeCompare(b.name);
            }
        });

        this.renderProducts();
    }

    setupFilters() {
        const priceInputs = document.querySelectorAll('#price-min, #price-max');
        priceInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                if (value && (isNaN(value) || parseFloat(value) < 0)) {
                    e.target.value = '';
                }
            });
        });
    }

    addToCart(productId) {
        app.cart.addItem(productId);
        
        const button = document.querySelector(`[data-product-id="${productId}"]`);
        if (button) {
            button.textContent = 'В корзине';
            button.classList.remove('btn-primary');
            button.classList.add('btn-success');
        }
    }

    searchProducts(query) {
        this.searchQuery = query;
        this.currentPage = 1;
        this.products = [];
        this.allProducts = [];
        this.loadInitialProducts();
    }

    updateLoadMoreButton() {
        const loadMoreBtn = document.getElementById('load-more');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = this.products.length >= this.perPage ? 'block' : 'none';
        }
    }

    showLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'block';
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    showError(message) {
        const noResults = document.getElementById('no-results');
        if (noResults) {
            noResults.style.display = 'block';
        }
        app.notifications.show(message, 'error');
    }
}

let catalog;
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('products-grid')) {
        catalog = new Catalog();
        window.catalog = catalog;
    }
}); 
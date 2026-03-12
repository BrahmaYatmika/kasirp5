// script.js
import { supabase } from './supabase-config.js';

// Global state
let currentCart = [];
let currentPage = 'dashboard';
let products = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadDashboard();
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

// Initialize app
async function initializeApp() {
    await loadProducts();
    setupSearch(); // Fixed: Now this function is defined
}

// SEARCH FUNCTIONALITY - Added this missing function
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }
}

// Handle Search - Added this missing function
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    if (currentPage === 'products') {
        filterProductsGrid(searchTerm);
    } else if (currentPage === 'pos') {
        filterPOSProducts(searchTerm);
    }
}

// Filter products in products page
function filterProductsGrid(searchTerm) {
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.category?.toLowerCase().includes(searchTerm) ||
        product.sku?.toLowerCase().includes(searchTerm)
    );
    
    renderFilteredProducts(filteredProducts);
}

// Filter products in POS page
function filterPOSProducts(searchTerm) {
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.category?.toLowerCase().includes(searchTerm)
    );
    
    renderPOSProducts(filteredProducts);
}

// Render filtered products
function renderFilteredProducts(filteredProducts) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    productsGrid.innerHTML = filteredProducts.map(product => `
        <div class="product-card" onclick="editProduct(${product.id})">
            <div class="product-image">
                <i class="fas fa-box"></i>
            </div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">Rp ${formatNumber(product.price)}</div>
                <div class="product-stock">Stok: ${product.stock}</div>
                <div class="product-category">${product.category || 'Umum'}</div>
            </div>
            <div class="product-actions">
                <button class="btn-icon" onclick="event.stopPropagation(); editProduct(${product.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon delete" onclick="event.stopPropagation(); deleteProduct(${product.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Render POS products
function renderPOSProducts(filteredProducts) {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    
    productsGrid.innerHTML = filteredProducts.map(product => `
        <div class="product-card" onclick="addToCart(${JSON.stringify(product).replace(/"/g, '&quot;')})">
            <div class="product-image">
                <i class="fas fa-box"></i>
            </div>
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-price">Rp ${formatNumber(product.price)}</div>
                <div class="product-stock ${product.stock < 10 ? 'low-stock' : ''}">
                    Stok: ${product.stock}
                </div>
            </div>
            ${product.stock > 0 ? 
                '<button class="add-to-cart-btn"><i class="fas fa-plus"></i></button>' : 
                '<button class="add-to-cart-btn disabled" disabled>Habis</button>'
            }
        </div>
    `).join('');
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-menu li').forEach(item => {
        item.addEventListener('click', (e) => {
            const page = e.currentTarget.dataset.page;
            navigateTo(page);
        });
    });

    // Modal close
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('productModal').style.display = 'none';
        });
    }

    // Click outside modal to close
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('productModal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Product form submit
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleProductSubmit();
        });
    }
}

// Navigation
async function navigateTo(page) {
    currentPage = page;
    
    // Update active menu
    document.querySelectorAll('.nav-menu li').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Load page content
    switch(page) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'pos':
            loadPOSPage();
            break;
        case 'products':
            await loadProductsPage();
            break;
        case 'inventory':
            await loadInventoryPage();
            break;
        case 'transactions':
            await loadTransactionsPage();
            break;
        case 'reports':
            await loadReportsPage();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    const content = document.getElementById('content-area');
    
    // Get statistics
    const stats = await getDashboardStats();
    
    content.innerHTML = `
        <div class="page-content">
            <div class="welcome-section">
                <h1>Dashboard</h1>
                <p>Selamat datang di Kasir Pintar! Ringkasan bisnis Anda hari ini.</p>
            </div>
            
            <div class="dashboard-cards">
                <div class="card">
                    <div class="card-icon">
                        <i class="fas fa-box"></i>
                    </div>
                    <div class="card-info">
                        <h3>Total Produk</h3>
                        <div class="value">${stats.totalProducts}</div>
                        <span class="trend positive">+12% dari bulan lalu</span>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-icon" style="background: var(--secondary)">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="card-info">
                        <h3>Transaksi Hari Ini</h3>
                        <div class="value">${stats.todayTransactions}</div>
                        <span class="trend positive">+5% dari kemarin</span>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-icon" style="background: var(--warning)">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <div class="card-info">
                        <h3>Pendapatan Hari Ini</h3>
                        <div class="value">Rp ${formatNumber(stats.todayRevenue)}</div>
                        <span class="trend positive">+18% dari kemarin</span>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-icon" style="background: var(--danger)">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="card-info">
                        <h3>Stok Menipis</h3>
                        <div class="value">${stats.lowStock}</div>
                        <span class="trend negative">Perlu restock</span>
                    </div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px; padding: 20px;">
                <div class="card">
                    <h3>Transaksi Terbaru</h3>
                    <div id="recentTransactions">
                        ${await renderRecentTransactions()}
                    </div>
                </div>
                
                <div class="card">
                    <h3>Produk Populer</h3>
                    <div id="popularProducts">
                        ${await renderPopularProducts()}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Get Dashboard Stats
async function getDashboardStats() {
    try {
        // Get total products
        const { count: totalProducts } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true });

        // Get today's transactions
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: todayTransactions } = await supabase
            .from('transactions')
            .select('*')
            .gte('created_at', today.toISOString());

        // Calculate today's revenue
        const todayRevenue = todayTransactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0;

        // Get low stock products (less than 10)
        const { count: lowStock } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .lt('stock', 10);

        return {
            totalProducts: totalProducts || 0,
            todayTransactions: todayTransactions?.length || 0,
            todayRevenue: todayRevenue || 0,
            lowStock: lowStock || 0
        };
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        return {
            totalProducts: 0,
            todayTransactions: 0,
            todayRevenue: 0,
            lowStock: 0
        };
    }
}

// Render Recent Transactions
async function renderRecentTransactions() {
    try {
        const { data: transactions } = await supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (!transactions || transactions.length === 0) {
            return '<p class="no-data">Belum ada transaksi</p>';
        }

        return transactions.map(t => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-code">${t.transaction_code}</div>
                    <div class="transaction-time">${new Date(t.created_at).toLocaleTimeString('id-ID')}</div>
                </div>
                <div class="transaction-amount">Rp ${formatNumber(t.total_amount)}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading recent transactions:', error);
        return '<p class="error">Gagal memuat transaksi</p>';
    }
}

// Render Popular Products
async function renderPopularProducts() {
    try {
        const { data: popularItems } = await supabase
            .from('transaction_items')
            .select(`
                product_id,
                quantity,
                products (name)
            `)
            .order('quantity', { ascending: false })
            .limit(5);

        if (!popularItems || popularItems.length === 0) {
            return '<p class="no-data">Belum ada data produk</p>';
        }

        // Group by product
        const productMap = new Map();
        popularItems.forEach(item => {
            const productId = item.product_id;
            if (productMap.has(productId)) {
                productMap.set(productId, productMap.get(productId) + item.quantity);
            } else {
                productMap.set(productId, item.quantity);
            }
        });

        return Array.from(productMap.entries()).map(([id, quantity]) => `
            <div class="popular-product-item">
                <span class="product-name">Product ${id}</span>
                <span class="product-sold">${quantity} terjual</span>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading popular products:', error);
        return '<p class="error">Gagal memuat produk populer</p>';
    }
}

// POS Page
function loadPOSPage() {
    const content = document.getElementById('content-area');
    
    content.innerHTML = `
        <div class="page-content pos-layout">
            <!-- Products Section -->
            <div class="products-section">
                <div class="section-header">
                    <h2>Daftar Produk</h2>
                    <div class="filter-controls">
                        <select id="categoryFilter" class="filter-select" onchange="filterByCategory()">
                            <option value="">Semua Kategori</option>
                            <option value="Makanan">Makanan</option>
                            <option value="Minuman">Minuman</option>
                            <option value="Snack">Snack</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>
                    </div>
                </div>
                
                <div class="products-grid" id="productsGrid">
                    ${renderProductGrid()}
                </div>
            </div>

            <!-- Cart Section -->
            <div class="cart-section">
                <div class="cart-header">
                    <h3><i class="fas fa-shopping-cart"></i> Keranjang Belanja</h3>
                    <span class="cart-count" id="cartCount">${currentCart.length} item</span>
                </div>
                
                <div class="cart-items" id="cartItems">
                    ${renderCart()}
                </div>
                
                <div class="cart-summary">
                    <div class="summary-row">
                        <span>Subtotal:</span>
                        <span>Rp ${formatNumber(calculateSubtotal())}</span>
                    </div>
                    <div class="summary-row">
                        <span>Pajak (10%):</span>
                        <span>Rp ${formatNumber(calculateTax())}</span>
                    </div>
                    <div class="summary-row total">
                        <span>Total:</span>
                        <span>Rp ${formatNumber(calculateTotal())}</span>
                    </div>
                </div>
                
                <div class="cart-actions">
                    <button class="btn-primary btn-block" onclick="showPaymentModal()" ${currentCart.length === 0 ? 'disabled' : ''}>
                        <i class="fas fa-credit-card"></i> Proses Pembayaran
                    </button>
                    <button class="btn-secondary btn-block" onclick="clearCart()" ${currentCart.length === 0 ? 'disabled' : ''}>
                        <i class="fas fa-trash"></i> Kosongkan Keranjang
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add payment modal if not exists
    addPaymentModal();
}

// Render Product Grid
function renderProductGrid() {
    return products.map(product => `
        <div class="product-card" onclick="addToCart(${product.id})">
            <div class="product-image">
                <i class="fas fa-box"></i>
            </div>
            <div class="product-info">
                <h4 class="product-name">${product.name}</h4>
                <div class="product-price">Rp ${formatNumber(product.price)}</div>
                <div class="product-stock ${product.stock < 10 ? 'low-stock' : ''}">
                    <i class="fas fa-cubes"></i> Stok: ${product.stock}
                </div>
            </div>
            ${product.stock > 0 ? 
                '<button class="quick-add-btn"><i class="fas fa-plus-circle"></i></button>' : 
                '<button class="quick-add-btn disabled" disabled><i class="fas fa-ban"></i> Habis</button>'
            }
        </div>
    `).join('');
}

// Add to Cart
window.addToCart = function(productId) {
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        showNotification('Produk tidak ditemukan!', 'error');
        return;
    }
    
    if (product.stock <= 0) {
        showNotification('Stok produk habis!', 'error');
        return;
    }
    
    const existingItem = currentCart.find(item => item.id === productId);
    
    if (existingItem) {
        if (existingItem.quantity >= product.stock) {
            showNotification('Stok tidak mencukupi!', 'error');
            return;
        }
        existingItem.quantity++;
    } else {
        currentCart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            stock: product.stock
        });
    }
    
    updateCartDisplay();
    showNotification(`${product.name} ditambahkan ke keranjang`, 'success');
};

// Update Cart Display
function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    
    if (cartItems) {
        cartItems.innerHTML = renderCart();
    }
    
    if (cartCount) {
        cartCount.textContent = `${currentCart.length} item`;
    }
    
    // Update summary
    updateCartSummary();
}

// Render Cart
function renderCart() {
    if (currentCart.length === 0) {
        return `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Keranjang belanja kosong</p>
                <small>Klik produk untuk menambahkan</small>
            </div>
        `;
    }
    
    return currentCart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <div class="cart-item-price">Rp ${formatNumber(item.price)}</div>
            </div>
            
            <div class="cart-item-controls">
                <button onclick="updateCartItemQuantity(${item.id}, -1)" class="qty-btn">
                    <i class="fas fa-minus"></i>
                </button>
                <span class="item-quantity">${item.quantity}</span>
                <button onclick="updateCartItemQuantity(${item.id}, 1)" class="qty-btn" 
                        ${item.quantity >= item.stock ? 'disabled' : ''}>
                    <i class="fas fa-plus"></i>
                </button>
                <button onclick="removeFromCart(${item.id})" class="remove-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            
            <div class="cart-item-subtotal">
                Rp ${formatNumber(item.price * item.quantity)}
            </div>
        </div>
    `).join('');
}

// Update Cart Item Quantity
window.updateCartItemQuantity = function(productId, change) {
    const item = currentCart.find(i => i.id === productId);
    
    if (!item) return;
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    if (newQuantity > item.stock) {
        showNotification('Stok tidak mencukupi!', 'error');
        return;
    }
    
    item.quantity = newQuantity;
    updateCartDisplay();
};

// Remove from Cart
window.removeFromCart = function(productId) {
    currentCart = currentCart.filter(item => item.id !== productId);
    updateCartDisplay();
    showNotification('Item dihapus dari keranjang', 'info');
};

// Clear Cart
window.clearCart = function() {
    if (currentCart.length === 0) return;
    
    if (confirm('Kosongkan keranjang belanja?')) {
        currentCart = [];
        updateCartDisplay();
        showNotification('Keranjang dikosongkan', 'info');
    }
};

// Calculate Subtotal
function calculateSubtotal() {
    return currentCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

// Calculate Tax
function calculateTax() {
    return calculateSubtotal() * 0.1; // 10% tax
}

// Calculate Total
function calculateTotal() {
    return calculateSubtotal() + calculateTax();
}

// Update Cart Summary
function updateCartSummary() {
    const subtotalEl = document.querySelector('.summary-row:nth-child(1) span:last-child');
    const taxEl = document.querySelector('.summary-row:nth-child(2) span:last-child');
    const totalEl = document.querySelector('.summary-row.total span:last-child');
    
    if (subtotalEl) subtotalEl.textContent = `Rp ${formatNumber(calculateSubtotal())}`;
    if (taxEl) taxEl.textContent = `Rp ${formatNumber(calculateTax())}`;
    if (totalEl) totalEl.textContent = `Rp ${formatNumber(calculateTotal())}`;
}

// Add Payment Modal
function addPaymentModal() {
    if (document.getElementById('paymentModal')) return;
    
    const modalHTML = `
        <div id="paymentModal" class="payment-modal">
            <div class="payment-content">
                <h2><i class="fas fa-credit-card"></i> Pembayaran</h2>
                
                <div class="payment-details">
                    <div class="detail-row">
                        <span>Total Belanja:</span>
                        <span class="total-amount" id="modalTotalAmount">Rp 0</span>
                    </div>
                </div>
                
                <div class="payment-methods">
                    <button class="payment-method-btn active" onclick="selectPaymentMethod('cash')">
                        <i class="fas fa-money-bill-wave"></i> Tunai
                    </button>
                    <button class="payment-method-btn" onclick="selectPaymentMethod('debit')">
                        <i class="fas fa-credit-card"></i> Debit
                    </button>
                    <button class="payment-method-btn" onclick="selectPaymentMethod('qris')">
                        <i class="fas fa-qrcode"></i> QRIS
                    </button>
                </div>
                
                <div class="payment-input-group">
                    <label>Jumlah Bayar</label>
                    <input type="number" id="paymentAmount" class="payment-input" placeholder="Masukkan jumlah bayar" autofocus>
                </div>
                
                <div class="payment-change" id="changeDisplay">
                    Kembalian: Rp 0
                </div>
                
                <div class="payment-actions">
                    <button class="btn-secondary" onclick="closePaymentModal()">Batal</button>
                    <button class="btn-primary" onclick="processPayment()">Bayar</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listener for payment amount input
    const paymentInput = document.getElementById('paymentAmount');
    if (paymentInput) {
        paymentInput.addEventListener('input', updateChangeDisplay);
    }
}

// Show Payment Modal
window.showPaymentModal = function() {
    const modal = document.getElementById('paymentModal');
    const totalAmount = document.getElementById('modalTotalAmount');
    
    if (totalAmount) {
        totalAmount.textContent = `Rp ${formatNumber(calculateTotal())}`;
    }
    
    if (modal) {
        modal.style.display = 'flex';
        const paymentInput = document.getElementById('paymentAmount');
        if (paymentInput) {
            paymentInput.value = '';
            paymentInput.focus();
        }
        updateChangeDisplay();
    }
};

// Close Payment Modal
window.closePaymentModal = function() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

// Select Payment Method
let selectedPaymentMethod = 'cash';

window.selectPaymentMethod = function(method) {
    selectedPaymentMethod = method;
    
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    event.currentTarget.classList.add('active');
};

// Update Change Display
function updateChangeDisplay() {
    const paymentInput = document.getElementById('paymentAmount');
    const changeDisplay = document.getElementById('changeDisplay');
    const total = calculateTotal();
    
    if (paymentInput && changeDisplay) {
        const payment = parseFloat(paymentInput.value) || 0;
        const change = payment - total;
        
        if (change >= 0) {
            changeDisplay.innerHTML = `<span class="change-positive">Kembalian: Rp ${formatNumber(change)}</span>`;
        } else {
            changeDisplay.innerHTML = `<span class="change-negative">Kurang: Rp ${formatNumber(Math.abs(change))}</span>`;
        }
    }
}

// Process Payment
window.processPayment = async function() {
    const paymentInput = document.getElementById('paymentAmount');
    const paymentAmount = parseFloat(paymentInput?.value) || 0;
    const total = calculateTotal();
    
    if (paymentAmount < total) {
        showNotification('Jumlah pembayaran kurang!', 'error');
        return;
    }
    
    if (currentCart.length === 0) {
        showNotification('Keranjang belanja kosong!', 'error');
        return;
    }
    
    try {
        const change = paymentAmount - total;
        const transactionCode = generateTransactionCode();
        
        // Insert transaction
        const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .insert([{
                transaction_code: transactionCode,
                total_amount: total,
                payment_amount: paymentAmount,
                change_amount: change,
                payment_method: selectedPaymentMethod,
                status: 'completed'
            }])
            .select();

        if (transactionError) throw transactionError;

        // Insert transaction items
        const transactionItems = currentCart.map(item => ({
            transaction_id: transaction[0].id,
            product_id: item.id,
            quantity: item.quantity,
            price_at_time: item.price,
            subtotal: item.price * item.quantity
        }));

        const { error: itemsError } = await supabase
            .from('transaction_items')
            .insert(transactionItems);

        if (itemsError) throw itemsError;

        // Update stock
        for (const item of currentCart) {
            const { error: stockError } = await supabase
                .from('products')
                .update({ 
                    stock: item.stock - item.quantity
                })
                .eq('id', item.id);

            if (stockError) throw stockError;
        }

        // Show success and print receipt
        showNotification('Transaksi berhasil!', 'success');
        printReceipt(transaction[0], currentCart, change);
        
        // Clear cart and close modal
        currentCart = [];
        closePaymentModal();
        
        // Refresh products
        await loadProducts();
        
        // Refresh POS page
        if (currentPage === 'pos') {
            loadPOSPage();
        }
        
    } catch (error) {
        console.error('Error processing transaction:', error);
        showNotification('Gagal memproses transaksi: ' + error.message, 'error');
    }
};

// Generate Transaction Code
function generateTransactionCode() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `INV/${year}${month}${day}/${random}`;
}

// Print Receipt
function printReceipt(transaction, items, change) {
    const receiptWindow = window.open('', '_blank', 'width=400,height=600');
    
    const receiptContent = `
        <html>
        <head>
            <title>Struk Pembayaran</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 20px; }
                .header { text-align: center; margin-bottom: 20px; }
                .store-name { font-size: 20px; font-weight: bold; }
                .transaction-info { margin: 20px 0; }
                .items { width: 100%; border-collapse: collapse; }
                .items th, .items td { padding: 5px; text-align: left; }
                .total-row { font-weight: bold; border-top: 1px dashed #000; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="store-name">KASIR PINTAR</div>
                <div>Jl. Contoh No. 123</div>
                <div>Telp: 0812-3456-7890</div>
            </div>
            
            <div class="transaction-info">
                <div>No. Transaksi: ${transaction.transaction_code}</div>
                <div>Tanggal: ${new Date().toLocaleString('id-ID')}</div>
                <div>Kasir: System</div>
            </div>
            
            <table class="items">
                <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Harga</th>
                    <th>Subtotal</th>
                </tr>
                ${items.map(item => `
                    <tr>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>Rp ${formatNumber(item.price)}</td>
                        <td>Rp ${formatNumber(item.price * item.quantity)}</td>
                    </tr>
                `).join('')}
                <tr class="total-row">
                    <td colspan="3">Total</td>
                    <td>Rp ${formatNumber(transaction.total_amount)}</td>
                </tr>
                <tr>
                    <td colspan="3">Bayar</td>
                    <td>Rp ${formatNumber(transaction.payment_amount)}</td>
                </tr>
                <tr>
                    <td colspan="3">Kembali</td>
                    <td>Rp ${formatNumber(change)}</td>
                </tr>
            </table>
            
            <div class="footer">
                <p>Terima kasih telah berbelanja!</p>
                <p>Barang yang sudah dibeli tidak dapat ditukar/kembali</p>
            </div>
        </body>
        </html>
    `;
    
    receiptWindow.document.write(receiptContent);
    receiptWindow.document.close();
    receiptWindow.print();
}

// Products Page
async function loadProductsPage() {
    const content = document.getElementById('content-area');
    
    content.innerHTML = `
        <div class="page-content">
            <div class="page-header">
                <h2>Manajemen Produk</h2>
                <button class="btn-primary" onclick="showAddProductModal()">
                    <i class="fas fa-plus"></i> Tambah Produk
                </button>
            </div>
            
            <div class="products-grid" id="productsGrid">
                ${products.map(product => `
                    <div class="product-card">
                        <div class="product-image">
                            <i class="fas fa-box"></i>
                        </div>
                        <div class="product-info">
                            <h4>${product.name}</h4>
                            <div class="product-price">Rp ${formatNumber(product.price)}</div>
                            <div class="product-stock">Stok: ${product.stock}</div>
                            <div class="product-category">${product.category || 'Umum'}</div>
                            <div class="product-sku">SKU: ${product.sku || '-'}</div>
                        </div>
                        <div class="product-actions">
                            <button class="btn-icon" onclick="editProduct(${product.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon delete" onclick="deleteProduct(${product.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Show Add Product Modal
window.showAddProductModal = function() {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    
    // Reset form
    form.reset();
    
    // Change modal title
    document.querySelector('#productModal h2').textContent = 'Tambah Produk Baru';
    
    // Store mode
    form.dataset.mode = 'add';
    form.dataset.editId = '';
    
    modal.style.display = 'block';
};

// Edit Product
window.editProduct = async function(id) {
    const product = products.find(p => p.id === id);
    
    if (!product) return;
    
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    
    // Fill form with product data
    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productCategory').value = product.category || 'Lainnya';
    document.getElementById('productSku').value = product.sku || '';
    
    // Change modal title
    document.querySelector('#productModal h2').textContent = 'Edit Produk';
    
    // Store mode
    form.dataset.mode = 'edit';
    form.dataset.editId = id;
    
    modal.style.display = 'block';
};

// Handle Product Submit
async function handleProductSubmit() {
    const form = document.getElementById('productForm');
    const mode = form.dataset.mode;
    const editId = form.dataset.editId;
    
    const productData = {
        name: document.getElementById('productName').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        category: document.getElementById('productCategory').value,
        sku: document.getElementById('productSku').value
    };
    
    try {
        if (mode === 'add') {
            await addProduct(productData);
        } else {
            await updateProduct(editId, productData);
        }
        
        // Close modal
        document.getElementById('productModal').style.display = 'none';
        
        // Refresh products page
        await loadProductsPage();
        
    } catch (error) {
        console.error('Error saving product:', error);
    }
}

// CRUD Operations

// Create Product
async function addProduct(productData) {
    try {
        const { data, error } = await supabase
            .from('products')
            .insert([productData])
            .select();

        if (error) throw error;
        
        showNotification('Produk berhasil ditambahkan!', 'success');
        await loadProducts();
        return data[0];
    } catch (error) {
        showNotification('Gagal menambahkan produk: ' + error.message, 'error');
        throw error;
    }
}

// Read Products
async function loadProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        products = data || [];
        return data;
    } catch (error) {
        showNotification('Gagal memuat produk: ' + error.message, 'error');
        return [];
    }
}

// Update Product
async function updateProduct(id, updates) {
    try {
        const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;
        
        showNotification('Produk berhasil diupdate!', 'success');
        await loadProducts();
        return data[0];
    } catch (error) {
        showNotification('Gagal mengupdate produk: ' + error.message, 'error');
        throw error;
    }
}

// Delete Product
window.deleteProduct = async function(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;

    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        showNotification('Produk berhasil dihapus!', 'success');
        await loadProducts();
        
        if (currentPage === 'products') {
            await loadProductsPage();
        }
    } catch (error) {
        showNotification('Gagal menghapus produk: ' + error.message, 'error');
    }
};

// Filter by Category
window.filterByCategory = function() {
    const category = document.getElementById('categoryFilter').value;
    
    if (category) {
        const filteredProducts = products.filter(p => p.category === category);
        renderPOSProducts(filteredProducts);
    } else {
        renderPOSProducts(products);
    }
};

// Load Inventory Page
async function loadInventoryPage() {
    const content = document.getElementById('content-area');
    
    // Get low stock products
    const lowStockProducts = products.filter(p => p.stock < 10);
    
    content.innerHTML = `
        <div class="page-content">
            <h2>Manajemen Inventory</h2>
            
            <div class="inventory-summary">
                <div class="summary-card warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>
                        <h3>Stok Menipis</h3>
                        <p>${lowStockProducts.length} produk perlu restock</p>
                    </div>
                </div>
            </div>
            
            <div class="inventory-table">
                <table>
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Produk</th>
                            <th>Kategori</th>
                            <th>Stok Saat Ini</th>
                            <th>Status</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map(product => `
                            <tr class="${product.stock < 10 ? 'low-stock-row' : ''}">
                                <td>${product.sku || '-'}</td>
                                <td>${product.name}</td>
                                <td>${product.category || 'Umum'}</td>
                                <td>${product.stock}</td>
                                <td>
                                    ${product.stock === 0 ? 
                                        '<span class="badge danger">Habis</span>' : 
                                        product.stock < 10 ? 
                                        '<span class="badge warning">Menipis</span>' : 
                                        '<span class="badge success">Tersedia</span>'
                                    }
                                </td>
                                <td>
                                    <button class="btn-icon" onclick="showStockModal(${product.id})">
                                        <i class="fas fa-plus-circle"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Load Transactions Page
async function loadTransactionsPage() {
    const content = document.getElementById('content-area');
    
    try {
        const { data: transactions } = await supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        content.innerHTML = `
            <div class="page-content">
                <h2>Riwayat Transaksi</h2>
                
                <div class="transactions-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Kode Transaksi</th>
                                <th>Waktu</th>
                                <th>Total</th>
                                <th>Metode</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transactions?.map(t => `
                                <tr>
                                    <td>${t.transaction_code}</td>
                                    <td>${new Date(t.created_at).toLocaleString('id-ID')}</td>
                                    <td>Rp ${formatNumber(t.total_amount)}</td>
                                    <td>${t.payment_method}</td>
                                    <td><span class="badge success">${t.status}</span></td>
                                    <td>
                                        <button class="btn-icon" onclick="viewTransactionDetail(${t.id})">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading transactions:', error);
        content.innerHTML = '<p class="error">Gagal memuat transaksi</p>';
    }
}

// Load Reports Page
async function loadReportsPage() {
    const content = document.getElementById('content-area');
    
    content.innerHTML = `
        <div class="page-content">
            <h2>Laporan & Analitik</h2>
            
            <div class="reports-section">
                <p>Fitur laporan sedang dalam pengembangan</p>
            </div>
        </div>
    `;
}

// Utility Functions

function formatNumber(num) {
    if (!num) return '0';
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function showNotification(message, type) {
    // Remove existing notification
    const existingNotif = document.querySelector('.notification');
    if (existingNotif) {
        existingNotif.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    const datetimeEl = document.getElementById('currentDateTime');
    if (datetimeEl) {
        datetimeEl.textContent = now.toLocaleDateString('id-ID', options);
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add CSS for missing styles
const additionalStyles = `
    .welcome-section {
        padding: 20px;
        background: linear-gradient(135deg, var(--primary), var(--primary-dark));
        color: white;
        border-radius: 15px;
        margin: 20px;
    }
    
    .trend {
        font-size: 0.85rem;
        margin-top: 5px;
        display: block;
    }
    
    .trend.positive {
        color: var(--success);
    }
    
    .trend.negative {
        color: var(--danger);
    }
    
    .transaction-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        border-bottom: 1px solid #e5e7eb;
    }
    
    .transaction-item:last-child {
        border-bottom: none;
    }
    
    .transaction-code {
        font-weight: 600;
    }
    
    .transaction-time {
        font-size: 0.85rem;
        color: #6b7280;
    }
    
    .transaction-amount {
        font-weight: 600;
        color: var(--primary);
    }
    
    .popular-product-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #e5e7eb;
    }
    
    .pos-layout {
        display: grid;
        grid-template-columns: 1fr 400px;
        gap: 20px;
        height: calc(100vh - 80px);
    }
    
    .products-section {
        overflow-y: auto;
        padding: 20px;
    }
    
    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }
    
    .filter-select {
        padding: 8px 12px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 0.95rem;
    }
    
    .cart-section {
        background: white;
        border-radius: 15px 0 0 15px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        height: 100%;
        box-shadow: -2px 0 10px rgba(0,0,0,0.05);
    }
    
    .cart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }
    
    .cart-count {
        background: var(--light);
        padding: 4px 8px;
        border-radius: 20px;
        font-size: 0.85rem;
    }
    
    .cart-items {
        flex: 1;
        overflow-y: auto;
        margin-bottom: 20px;
    }
    
    .empty-cart {
        text-align: center;
        padding: 40px 20px;
        color: #9ca3af;
    }
    
    .empty-cart i {
        font-size: 3rem;
        margin-bottom: 10px;
    }
    
    .cart-item {
        border-bottom: 1px solid #e5e7eb;
        padding: 10px 0;
    }
    
    .cart-item:last-child {
        border-bottom: none;
    }
    
    .cart-item-info h4 {
        font-size: 0.95rem;
        margin-bottom: 4px;
    }
    
    .cart-item-price {
        color: #6b7280;
        font-size: 0.85rem;
    }
    
    .cart-item-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 8px 0;
    }
    
    .qty-btn {
        width: 30px;
        height: 30px;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .qty-btn:hover:not(:disabled) {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
    }
    
    .qty-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .item-quantity {
        font-weight: 600;
        min-width: 30px;
        text-align: center;
    }
    
    .remove-btn {
        width: 30px;
        height: 30px;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
        background: white;
        color: var(--danger);
        cursor: pointer;
        margin-left: auto;
    }
    
    .remove-btn:hover {
        background: var(--danger);
        color: white;
    }
    
    .cart-item-subtotal {
        font-weight: 600;
        color: var(--primary);
        text-align: right;
    }
    
    .cart-summary {
        background: var(--light);
        padding: 15px;
        border-radius: 10px;
        margin-bottom: 20px;
    }
    
    .summary-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
    }
    
    .summary-row.total {
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--primary);
        margin-top: 8px;
        padding-top: 8px;
        border-top: 2px solid #e5e7eb;
    }
    
    .cart-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    .btn-block {
        width: 100%;
        padding: 12px;
    }
    
    .btn-secondary {
        background: white;
        color: var(--dark);
        border: 2px solid #e5e7eb;
        padding: 12px;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .btn-secondary:hover:not(:disabled) {
        background: var(--light);
        border-color: #9ca3af;
    }
    
    .btn-secondary:disabled,
    .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .quick-add-btn {
        position: absolute;
        bottom: 10px;
        right: 10px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--primary);
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    }
    
    .quick-add-btn:hover {
        transform: scale(1.1);
    }
    
    .quick-add-btn.disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }
    
    .low-stock {
        color: var(--danger);
    }
    
    .payment-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 1000;
        justify-content: center;
        align-items: center;
    }
    
    .payment-content {
        background: white;
        padding: 30px;
        border-radius: 20px;
        width: 90%;
        max-width: 500px;
        animation: slideIn 0.3s ease;
    }
    
    .payment-details {
        margin: 20px 0;
        padding: 15px;
        background: var(--light);
        border-radius: 10px;
    }
    
    .detail-row {
        display: flex;
        justify-content: space-between;
        font-size: 1.1rem;
    }
    
    .total-amount {
        font-weight: 700;
        color: var(--primary);
    }
    
    .payment-methods {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin: 20px 0;
    }
    
    .payment-method-btn {
        padding: 12px;
        border: 2px solid #e5e7eb;
        background: white;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
    }
    
    .payment-method-btn i {
        font-size: 1.2rem;
    }
    
    .payment-method-btn.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
    }
    
    .payment-input-group {
        margin: 20px 0;
    }
    
    .payment-input-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
    }
    
    .payment-input {
        width: 100%;
        padding: 15px;
        font-size: 1.2rem;
        border: 2px solid #e5e7eb;
        border-radius: 10px;
    }
    
    .payment-input:focus {
        border-color: var(--primary);
        outline: none;
    }
    
    .payment-change {
        text-align: center;
        padding: 15px;
        background: var(--light);
        border-radius: 10px;
        margin: 20px 0;
        font-size: 1.2rem;
    }
    
    .change-positive {
        color: var(--success);
        font-weight: 700;
    }
    
    .change-negative {
        color: var(--danger);
        font-weight: 700;
    }
    
    .payment-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
    }
    
    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
    }
    
    .product-actions {
        position: absolute;
        top: 10px;
        right: 10px;
        display: flex;
        gap: 5px;
    }
    
    .btn-icon {
        width: 35px;
        height: 35px;
        border-radius: 8px;
        border: none;
        background: white;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .btn-icon:hover {
        background: var(--primary);
        color: white;
    }
    
    .btn-icon.delete:hover {
        background: var(--danger);
    }
    
    .product-card {
        position: relative;
    }
    
    .inventory-summary {
        padding: 20px;
    }
    
    .summary-card {
        background: white;
        border-radius: 15px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    
    .summary-card.warning {
        border-left: 4px solid var(--warning);
    }
    
    .summary-card i {
        font-size: 2rem;
        color: var(--warning);
    }
    
    .inventory-table {
        padding: 20px;
        background: white;
        border-radius: 15px;
        margin: 20px;
        overflow-x: auto;
    }
    
    .inventory-table table {
        width: 100%;
        border-collapse: collapse;
    }
    
    .inventory-table th {
        background: var(--light);
        padding: 12px;
        text-align: left;
    }
    
    .inventory-table td {
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
    }
    
    .low-stock-row {
        background: #fff3cd;
    }
    
    .badge {
        padding: 4px 8px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 500;
    }
    
    .badge.success {
        background: #d4edda;
        color: #155724;
    }
    
    .badge.warning {
        background: #fff3cd;
        color: #856404;
    }
    
    .badge.danger {
        background: #f8d7da;
        color: #721c24;
    }
    
    .transactions-table {
        padding: 20px;
        background: white;
        border-radius: 15px;
        margin: 20px;
        overflow-x: auto;
    }
    
    .transactions-table table {
        width: 100%;
        border-collapse: collapse;
    }
    
    .transactions-table th {
        background: var(--light);
        padding: 12px;
        text-align: left;
    }
    
    .transactions-table td {
        padding: 12px;
        border-bottom: 1px solid #e5e7eb;
    }
    
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    
    .notification.success {
        background: var(--success);
    }
    
    .notification.error {
        background: var(--danger);
    }
    
    .notification.info {
        background: var(--primary);
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .no-data, .error {
        text-align: center;
        padding: 20px;
        color: #6b7280;
    }
    
    .error {
        color: var(--danger);
    }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
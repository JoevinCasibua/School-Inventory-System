// ===== Shared app logic: auth + data storage =====

const STORAGE_KEY = 'school_inventory_data';
const SESSION_KEY = 'school_inventory_session';

const ICONS = {
    'Paper': '📄', 'Writing': '✏️', 'Tools': '✂️', 'Art': '🎨',
    'Books': '📚', 'Electronics': '💻', 'Bags': '🎒', 'Other': '📦'
};

const ORDER_STATUS = {
    pending:   { label: 'Pending Payment', color: 'badge-warning', icon: '⏳' },
    paid:      { label: 'Paid',            color: 'badge-success', icon: '💵' },
    completed: { label: 'Completed',       color: 'badge-success', icon: '✅' },
    cancelled: { label: 'Cancelled',       color: 'badge-danger',  icon: '✖' }
};

const DEFAULT_DATA = {
    users: [
        { id: 1, username: 'admin', password: 'admin123', role: 'Super Admin', email: 'admin@school.edu' }
    ],
    customers: [
        { id: 1, username: 'student1', password: 'student123', full_name: 'Juan Dela Cruz', student_id: '2026-00001', email: 'juan@school.edu' }
    ],
    products: [
        { id: 1,  sku: 'SUP-001', product_name: 'Notebook (80 leaves)', category: 'Paper',   quantity: 50,  price: 35.00,  date_added: '2026-05-01' },
        { id: 2,  sku: 'SUP-002', product_name: 'Ballpen (Black)',      category: 'Writing', quantity: 100, price: 8.00,   date_added: '2026-05-02' },
        { id: 3,  sku: 'SUP-003', product_name: 'Pencil #2',            category: 'Writing', quantity: 75,  price: 5.00,   date_added: '2026-05-03' },
        { id: 4,  sku: 'SUP-004', product_name: 'Eraser',               category: 'Writing', quantity: 60,  price: 3.00,   date_added: '2026-05-04' },
        { id: 5,  sku: 'SUP-005', product_name: 'Scissors',             category: 'Tools',   quantity: 4,   price: 45.00,  date_added: '2026-05-05' },
        { id: 6,  sku: 'SUP-006', product_name: 'Glue Stick',           category: 'Tools',   quantity: 30,  price: 25.00,  date_added: '2026-05-06' },
        { id: 7,  sku: 'SUP-007', product_name: 'Ruler 12"',            category: 'Tools',   quantity: 2,   price: 15.00,  date_added: '2026-05-07' },
        { id: 8,  sku: 'SUP-008', product_name: 'Bond Paper (Short)',   category: 'Paper',   quantity: 20,  price: 180.00, date_added: '2026-05-08' },
        { id: 9,  sku: 'SUP-009', product_name: 'Folder (Long)',        category: 'Paper',   quantity: 3,   price: 7.00,   date_added: '2026-05-09' },
        { id: 10, sku: 'SUP-010', product_name: 'Crayons (8 colors)',   category: 'Art',     quantity: 15,  price: 55.00,  date_added: '2026-05-10' },
        { id: 11, sku: 'SUP-011', product_name: 'Watercolor Set',       category: 'Art',     quantity: 8,   price: 120.00, date_added: '2026-05-12' },
        { id: 12, sku: 'SUP-012', product_name: 'Backpack',             category: 'Bags',    quantity: 12,  price: 450.00, date_added: '2026-05-14' }
    ],
    categories: [
        { id: 1, name: 'Paper',   description: 'Notebooks, bond paper, folders' },
        { id: 2, name: 'Writing', description: 'Pens, pencils, erasers' },
        { id: 3, name: 'Tools',   description: 'Scissors, glue, ruler' },
        { id: 4, name: 'Art',     description: 'Crayons, paint, brushes' },
        { id: 5, name: 'Bags',    description: 'Backpacks, pencil cases' }
    ],
    orders: [],
    activity: [
        { id: 1, type: 'login', user: 'admin', action: 'Logged into the system', timestamp: Date.now() - 86400000 }
    ],
    settings: {
        low_stock_threshold: 5,
        currency: '₱',
        store_name: 'School Supply Store'
    }
};

const Store = {
    load() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            try {
                const data = JSON.parse(raw);
                if (!data.categories) data.categories = DEFAULT_DATA.categories;
                if (!data.activity)   data.activity   = [];
                if (!data.settings)   data.settings   = DEFAULT_DATA.settings;
                if (!data.customers)  data.customers  = DEFAULT_DATA.customers;
                if (!data.orders)     data.orders     = [];
                if (!data.users || data.users.length === 0) data.users = DEFAULT_DATA.users;
                return data;
            } catch (e) { /* fall through */ }
        }
        this.save(DEFAULT_DATA);
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
    },
    save(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); },

    // Products
    getProducts() { return this.load().products; },
    getProduct(id) { return this.getProducts().find(p => p.id === id); },
    addProduct(product) {
        const data = this.load();
        const nextId = data.products.reduce((m, p) => Math.max(m, p.id), 0) + 1;
        product.id = nextId;
        product.sku = product.sku || `SUP-${String(nextId).padStart(3, '0')}`;
        product.date_added = new Date().toISOString().slice(0, 10);
        data.products.push(product);
        this.save(data);
        Activity.log('add', `Added new product "${product.product_name}"`);
        return product;
    },
    updateProduct(id, updates) {
        const data = this.load();
        const idx = data.products.findIndex(p => p.id === id);
        if (idx !== -1) {
            const old = data.products[idx];
            data.products[idx] = { ...old, ...updates };
            this.save(data);
            Activity.log('edit', `Updated product "${old.product_name}"`);
        }
    },
    adjustStock(id, delta) {
        const data = this.load();
        const idx = data.products.findIndex(p => p.id === id);
        if (idx !== -1) {
            data.products[idx].quantity = Math.max(0, data.products[idx].quantity + delta);
            this.save(data);
            Activity.log('edit', `${delta > 0 ? 'Added' : 'Removed'} ${Math.abs(delta)} stock of "${data.products[idx].product_name}"`);
        }
    },
    deleteProduct(id) {
        const data = this.load();
        const p = data.products.find(x => x.id === id);
        data.products = data.products.filter(x => x.id !== id);
        this.save(data);
        if (p) Activity.log('delete', `Deleted product "${p.product_name}"`);
    },

    // Categories
    getCategories() { return this.load().categories; },
    addCategory(cat) {
        const data = this.load();
        const nextId = data.categories.reduce((m, c) => Math.max(m, c.id), 0) + 1;
        cat.id = nextId;
        data.categories.push(cat);
        this.save(data);
        Activity.log('add', `Added new category "${cat.name}"`);
    },
    updateCategory(id, updates) {
        const data = this.load();
        const idx = data.categories.findIndex(c => c.id === id);
        if (idx !== -1) {
            data.categories[idx] = { ...data.categories[idx], ...updates };
            this.save(data);
            Activity.log('edit', `Updated category "${data.categories[idx].name}"`);
        }
    },
    deleteCategory(id) {
        const data = this.load();
        const c = data.categories.find(x => x.id === id);
        data.categories = data.categories.filter(x => x.id !== id);
        this.save(data);
        if (c) Activity.log('delete', `Deleted category "${c.name}"`);
    },

    // Users (admins)
    getUsers() { return this.load().users; },
    addUser(user) {
        const data = this.load();
        const nextId = data.users.reduce((m, u) => Math.max(m, u.id), 0) + 1;
        user.id = nextId;
        data.users.push(user);
        this.save(data);
        Activity.log('add', `Added new user "${user.username}"`);
    },
    deleteUser(id) {
        const data = this.load();
        const u = data.users.find(x => x.id === id);
        data.users = data.users.filter(x => x.id !== id);
        this.save(data);
        if (u) Activity.log('delete', `Deleted user "${u.username}"`);
    },

    // Customers
    getCustomers() { return this.load().customers; },
    addCustomer(c) {
        const data = this.load();
        const nextId = data.customers.reduce((m, x) => Math.max(m, x.id), 0) + 1;
        c.id = nextId;
        data.customers.push(c);
        this.save(data);
        Activity.log('add', `New customer registered: "${c.username}"`);
        return c;
    },

    // Orders
    getOrders() { return this.load().orders; },
    getCustomerOrders(customerId) {
        return this.getOrders().filter(o => o.customer_id === customerId);
    },
    addOrder(order) {
        const data = this.load();
        const nextId = data.orders.reduce((m, o) => Math.max(m, o.id), 0) + 1;
        order.id = nextId;
        order.order_number = `ORD-${String(nextId).padStart(4, '0')}`;
        order.status = 'pending';
        order.created_at = Date.now();
        data.orders.push(order);

        // Reserve stock immediately
        order.items.forEach(item => {
            const p = data.products.find(x => x.id === item.product_id);
            if (p) p.quantity = Math.max(0, p.quantity - item.quantity);
        });

        this.save(data);
        Activity.log('add', `New order ${order.order_number} placed by ${order.customer_name} (${formatPeso(order.total)})`);
        return order;
    },
    updateOrderStatus(id, status, note) {
        const data = this.load();
        const idx = data.orders.findIndex(o => o.id === id);
        if (idx === -1) return;
        const order = data.orders[idx];
        const prev = order.status;
        order.status = status;
        if (status === 'paid') order.paid_at = Date.now();
        if (status === 'completed') order.completed_at = Date.now();
        if (status === 'cancelled') {
            // Restock items
            order.items.forEach(item => {
                const p = data.products.find(x => x.id === item.product_id);
                if (p) p.quantity += item.quantity;
            });
            order.cancelled_at = Date.now();
        }
        this.save(data);
        Activity.log('edit', `Order ${order.order_number} status: ${prev} → ${status}`);
    },

    // Activity
    getActivity() { return this.load().activity.slice().reverse(); },
    clearActivity() {
        const data = this.load();
        data.activity = [];
        this.save(data);
    },

    // Settings
    getSettings() { return this.load().settings; },
    updateSettings(updates) {
        const data = this.load();
        data.settings = { ...data.settings, ...updates };
        this.save(data);
        Activity.log('edit', 'Updated system settings');
    },

    resetData() {
        localStorage.removeItem(STORAGE_KEY);
        return this.load();
    }
};

const Activity = {
    log(type, action) {
        const data = Store.load();
        const user = Auth.currentUser()?.username || 'system';
        const id = (data.activity.reduce((m, a) => Math.max(m, a.id), 0) || 0) + 1;
        data.activity.push({ id, type, user, action, timestamp: Date.now() });
        if (data.activity.length > 200) data.activity = data.activity.slice(-200);
        Store.save(data);
    }
};

const Auth = {
    loginAdmin(username, password) {
        const user = Store.getUsers().find(u => u.username === username && u.password === password);
        if (user) {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({
                id: user.id, username: user.username, role: user.role, type: 'admin'
            }));
            Activity.log('login', `Admin "${user.username}" logged in`);
            return true;
        }
        return false;
    },
    loginCustomer(username, password) {
        const c = Store.getCustomers().find(u => u.username === username && u.password === password);
        if (c) {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({
                id: c.id, username: c.username, full_name: c.full_name, student_id: c.student_id, type: 'customer'
            }));
            Activity.log('login', `Customer "${c.username}" logged in`);
            return true;
        }
        return false;
    },
    logout() {
        const user = this.currentUser();
        if (user) Activity.log('login', `User "${user.username}" logged out`);
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = 'index.html';
    },
    currentUser() {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    },
    requireLogin() {
        if (!this.currentUser()) window.location.href = 'index.html';
    },
    requireAdmin() {
        const u = this.currentUser();
        if (!u || u.type !== 'admin') window.location.href = 'index.html';
    },
    requireCustomer() {
        const u = this.currentUser();
        if (!u || u.type !== 'customer') window.location.href = 'index.html';
    }
};

// ===== Cart =====
const Cart = {
    key() {
        const u = Auth.currentUser();
        return 'cart_' + (u?.id || 'guest');
    },
    get() {
        try { return JSON.parse(localStorage.getItem(this.key())) || []; }
        catch (e) { return []; }
    },
    save(items) { localStorage.setItem(this.key(), JSON.stringify(items)); },
    add(productId, qty = 1) {
        const items = this.get();
        const idx = items.findIndex(i => i.product_id === productId);
        const product = Store.getProduct(productId);
        if (!product) return false;
        const currentInCart = idx === -1 ? 0 : items[idx].quantity;
        if (currentInCart + qty > product.quantity) {
            return { ok: false, msg: `Only ${product.quantity - currentInCart} more available.` };
        }
        if (idx === -1) items.push({ product_id: productId, quantity: qty });
        else items[idx].quantity += qty;
        this.save(items);
        return { ok: true };
    },
    updateQty(productId, qty) {
        const items = this.get();
        const idx = items.findIndex(i => i.product_id === productId);
        if (idx === -1) return;
        if (qty <= 0) items.splice(idx, 1);
        else {
            const product = Store.getProduct(productId);
            items[idx].quantity = Math.min(qty, product?.quantity || qty);
        }
        this.save(items);
    },
    remove(productId) {
        this.save(this.get().filter(i => i.product_id !== productId));
    },
    clear() { localStorage.removeItem(this.key()); },
    count() { return this.get().reduce((s, i) => s + i.quantity, 0); },
    detailed() {
        return this.get().map(i => {
            const p = Store.getProduct(i.product_id);
            if (!p) return null;
            return {
                product_id: p.id,
                name: p.product_name,
                sku: p.sku,
                category: p.category,
                price: p.price,
                quantity: i.quantity,
                subtotal: p.price * i.quantity,
                available: p.quantity
            };
        }).filter(Boolean);
    },
    total() { return this.detailed().reduce((s, i) => s + i.subtotal, 0); }
};

// ===== UI helpers =====
function escapeHTML(str) {
    return String(str ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}
function formatDateTime(ts) {
    return new Date(ts).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
}
function formatPeso(n) {
    const s = Store.getSettings();
    return s.currency + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
}
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function flash(msg, type = 'success') {
    const el = document.getElementById('flash-msg');
    if (!el) { alert(msg); return; }
    el.className = 'alert alert-' + (type === 'error' ? 'error' : 'success');
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 2800);
}

function downloadCSV(filename, rows) {
    const csv = rows.map(row =>
        row.map(field => `"${String(field ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ===== Admin Sidebar =====
function renderSidebar(currentPage) {
    const root = document.getElementById('sidebar-root');
    if (!root) return;
    const user = Auth.currentUser();
    const initial = (user?.username || 'A')[0].toUpperCase();
    const pendingOrders = Store.getOrders().filter(o => o.status === 'pending').length;
    root.innerHTML = `
        <aside class="sidebar">
            <div class="brand">
                <div class="brand-logo">📦</div>
                <div class="brand-text">INVENTORY</div>
            </div>
            <div class="sidebar-section">Main</div>
            <nav>
                <a href="dashboard.html" class="${currentPage === 'dashboard' ? 'active' : ''}">
                    <span class="nav-icon">📊</span><span>Dashboard</span>
                </a>
                <a href="products.html" class="${currentPage === 'products' ? 'active' : ''}">
                    <span class="nav-icon">📦</span><span>Products</span>
                </a>
                <a href="categories.html" class="${currentPage === 'categories' ? 'active' : ''}">
                    <span class="nav-icon">📁</span><span>Categories</span>
                </a>
                <a href="orders.html" class="${currentPage === 'orders' ? 'active' : ''}">
                    <span class="nav-icon">🛒</span><span>Orders</span>
                    ${pendingOrders > 0 ? `<span class="badge badge-warning" style="margin-left:auto;">${pendingOrders}</span>` : ''}
                </a>
                <a href="activity.html" class="${currentPage === 'activity' ? 'active' : ''}">
                    <span class="nav-icon">📋</span><span>Activity Log</span>
                </a>
                <div class="sidebar-section">System</div>
                <a href="users.html" class="${currentPage === 'users' ? 'active' : ''}">
                    <span class="nav-icon">👥</span><span>Users</span>
                </a>
                <a href="settings.html" class="${currentPage === 'settings' ? 'active' : ''}">
                    <span class="nav-icon">⚙️</span><span>Settings</span>
                </a>
                <a href="#" class="logout" id="logout-link">
                    <span class="nav-icon">🚪</span><span>Logout</span>
                </a>
            </nav>
            <div class="user-info">
                <div class="avatar">${escapeHTML(initial)}</div>
                <div>
                    <div class="uname">${escapeHTML(user?.username || 'Admin')}</div>
                    <div class="urole">${escapeHTML(user?.role || 'Admin')}</div>
                </div>
            </div>
        </aside>
    `;
    document.getElementById('logout-link').addEventListener('click', e => {
        e.preventDefault();
        Auth.logout();
    });
}

// ===== Admin Topbar =====
function renderTopbar(title = '') {
    const root = document.getElementById('topbar-root');
    if (!root) return;
    const lowItems = Store.getProducts().filter(p => p.quantity < Store.getSettings().low_stock_threshold);
    const pendingOrders = Store.getOrders().filter(o => o.status === 'pending');
    const totalAlerts = lowItems.length + pendingOrders.length;
    root.innerHTML = `
        <div class="topbar">
            <div class="topbar-search">
                <input type="text" id="global-search" placeholder="Search products, categories...">
            </div>
            <div class="topbar-actions">
                <div class="bell" id="bell-btn">
                    🔔
                    ${totalAlerts > 0 ? `<span class="bell-count">${totalAlerts}</span>` : ''}
                </div>
                <div class="dropdown" id="bell-dropdown">
                    <div class="dropdown-header">🔔 Notifications</div>
                    ${pendingOrders.length > 0 ? `
                        <div class="dropdown-item" style="background:rgba(245,158,11,0.05);">
                            <div class="product-img">⏳</div>
                            <div>
                                <div><b>${pendingOrders.length}</b> pending order(s) awaiting payment</div>
                                <div class="meta"><a href="orders.html" style="color:var(--accent);">View Orders →</a></div>
                            </div>
                        </div>` : ''}
                    ${lowItems.length === 0 && pendingOrders.length === 0
                        ? '<div class="dropdown-item">No new notifications 🎉</div>'
                        : lowItems.slice(0, 6).map(p => `
                            <div class="dropdown-item">
                                <div class="product-img">${ICONS[p.category] || '📦'}</div>
                                <div>
                                    <div>${escapeHTML(p.product_name)}</div>
                                    <div class="meta">Only <b class="text-danger">${p.quantity}</b> left in stock</div>
                                </div>
                            </div>
                        `).join('')}
                </div>
            </div>
        </div>
    `;

    document.getElementById('bell-btn').addEventListener('click', e => {
        e.stopPropagation();
        document.getElementById('bell-dropdown').classList.toggle('active');
    });
    document.addEventListener('click', e => {
        const d = document.getElementById('bell-dropdown');
        if (d && !d.contains(e.target) && e.target.id !== 'bell-btn') {
            d.classList.remove('active');
        }
    });

    const search = document.getElementById('global-search');
    if (search) {
        search.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                window.location.href = 'products.html?search=' + encodeURIComponent(search.value);
            }
        });
    }
}

// ===== Customer (shop) Header =====
function renderShopHeader(currentPage) {
    const root = document.getElementById('shop-header-root');
    if (!root) return;
    const user = Auth.currentUser();
    const cartCount = Cart.count();
    const initial = (user?.full_name || user?.username || 'U')[0].toUpperCase();
    root.innerHTML = `
        <header class="shop-header">
            <div class="shop-header-inner">
                <a href="shop.html" class="shop-brand">
                    <div class="brand-logo">📦</div>
                    <span>SCHOOL SHOP</span>
                </a>
                <nav class="shop-nav">
                    <a href="shop.html" class="${currentPage === 'shop' ? 'active' : ''}">Shop</a>
                    <a href="my-orders.html" class="${currentPage === 'my-orders' ? 'active' : ''}">My Orders</a>
                </nav>
                <div class="shop-header-actions">
                    <a href="cart.html" class="cart-btn ${currentPage === 'cart' ? 'active' : ''}">
                        🛒 Cart
                        ${cartCount > 0 ? `<span class="cart-count">${cartCount}</span>` : ''}
                    </a>
                    <div class="shop-user">
                        <div class="avatar">${escapeHTML(initial)}</div>
                        <div>
                            <div class="uname">${escapeHTML(user?.full_name || user?.username || 'Guest')}</div>
                            <div class="urole">${escapeHTML(user?.student_id || 'Student')}</div>
                        </div>
                        <button class="btn btn-sm" onclick="Auth.logout()" title="Logout">🚪</button>
                    </div>
                </div>
            </div>
        </header>
    `;
}

// Close modal on outside click + ESC
document.addEventListener('click', e => {
    if (e.target.classList && e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
});

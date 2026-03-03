const STORAGE_KEYS = {
    users: "robuxstore_users",
    currentUser: "robuxstore_current_user",
    cart: "robuxstore_cart",
    orders: "robuxstore_orders"
};

const PACKAGES = [
    { id: "rbx-1", robux: 80, price: 15000, bonus: 0 },
    { id: "rbx-2", robux: 160, price: 29000, bonus: 10 },
    { id: "rbx-3", robux: 400, price: 70000, bonus: 40 },
    { id: "rbx-4", robux: 800, price: 139000, bonus: 90 },
    { id: "rbx-5", robux: 1700, price: 289000, bonus: 220 },
    { id: "rbx-6", robux: 4500, price: 719000, bonus: 700 }
];

const PAYMENT_CONFIG = {
    merchantName: "RobuxStore Official",
    gopayNumber: "0812-3456-7890",
    contactWhatsapp: "6281234567890",
    waitingSeconds: 12
};

let paymentTimer = null;
let paymentCountdown = 0;
let pendingOrder = null;

function rupiah(value) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(value);
}

function getJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch (_error) {
        return fallback;
    }
}

function setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getCurrentUser() {
    return getJson(STORAGE_KEYS.currentUser, null);
}

function getCart() {
    return getJson(STORAGE_KEYS.cart, []);
}

function setCart(cart) {
    setJson(STORAGE_KEYS.cart, cart);
}

function buildPackageCard(item) {
    const totalRobux = item.robux + item.bonus;
    const bonusText = item.bonus > 0 ? ` + ${item.bonus} bonus` : "";
    return `
        <article class="package-card" data-testid="package-card">
            <h3>${item.robux} Robux</h3>
            <p class="package-bonus">${bonusText || "Tanpa bonus"}</p>
            <p class="package-total">Total diterima: <strong>${totalRobux}</strong></p>
            <p class="package-price">${rupiah(item.price)}</p>
            <button class="btn-primary" onclick="addToCart('${item.id}')" data-testid="add-to-cart-btn">Tambah ke Cart</button>
        </article>
    `;
}

function loadPopularPackages() {
    const root = document.getElementById("popularPackages");
    if (!root) return;
    root.innerHTML = PACKAGES.slice(0, 3).map(buildPackageCard).join("");
}

function loadAllPackages() {
    const root = document.getElementById("catalogPackages");
    if (!root) return;
    root.innerHTML = PACKAGES.map(buildPackageCard).join("");
}

function addToCart(packageId) {
    const selected = PACKAGES.find((item) => item.id === packageId);
    if (!selected) return;

    const cart = getCart();
    const found = cart.find((item) => item.id === packageId);

    if (found) {
        found.qty += 1;
    } else {
        cart.push({ id: packageId, qty: 1 });
    }

    setCart(cart);
    updateCartBadge();
    alert("Paket ditambahkan ke cart.");
}

function updateCartBadge() {
    const badge = document.getElementById("cartBadge");
    if (!badge) return;
    const totalItem = getCart().reduce((sum, item) => sum + item.qty, 0);
    badge.textContent = String(totalItem);
}

function removeFromCart(packageId) {
    const cart = getCart().filter((item) => item.id !== packageId);
    setCart(cart);
    loadCart();
    updateCartBadge();
}

function changeQty(packageId, delta) {
    const cart = getCart();
    const found = cart.find((item) => item.id === packageId);
    if (!found) return;
    found.qty += delta;
    if (found.qty <= 0) {
        removeFromCart(packageId);
        return;
    }
    setCart(cart);
    loadCart();
    updateCartBadge();
}

function loadCart() {
    const cartRoot = document.getElementById("cartItems");
    const totalRobuxEl = document.getElementById("totalRobux");
    const totalPriceEl = document.getElementById("totalPrice");
    if (!cartRoot || !totalRobuxEl || !totalPriceEl) return;

    const cart = getCart();
    if (cart.length === 0) {
        cartRoot.innerHTML = `<div class="empty-state">Cart masih kosong. <a href="catalog.html">Pilih paket dulu</a>.</div>`;
        totalRobuxEl.textContent = "0";
        totalPriceEl.textContent = rupiah(0);
        return;
    }

    let totalRobux = 0;
    let totalPrice = 0;

    const lines = cart.map((item) => {
        const pkg = PACKAGES.find((entry) => entry.id === item.id);
        if (!pkg) return "";
        const qty = item.qty;
        const subtotalPrice = pkg.price * qty;
        const subtotalRobux = (pkg.robux + pkg.bonus) * qty;
        totalPrice += subtotalPrice;
        totalRobux += subtotalRobux;

        return `
            <div class="cart-item">
                <div>
                    <h4>${pkg.robux} Robux</h4>
                    <p>${pkg.bonus > 0 ? `${pkg.bonus} bonus / item` : "Tanpa bonus"}</p>
                    <p class="package-price">${rupiah(pkg.price)} / item</p>
                </div>
                <div class="cart-actions">
                    <button class="qty-btn" onclick="changeQty('${pkg.id}', -1)">-</button>
                    <span>${qty}</span>
                    <button class="qty-btn" onclick="changeQty('${pkg.id}', 1)">+</button>
                    <button class="btn-secondary" onclick="removeFromCart('${pkg.id}')">Hapus</button>
                </div>
            </div>
        `;
    });

    cartRoot.innerHTML = lines.join("");
    totalRobuxEl.textContent = String(totalRobux);
    totalPriceEl.textContent = rupiah(totalPrice);
}

function proceedToCheckout() {
    const cart = getCart();
    if (cart.length === 0) {
        alert("Cart masih kosong.");
        return;
    }
    window.location.href = "checkout.html";
}

function getCheckoutTotals() {
    return getCart().reduce(
        (acc, item) => {
            const pkg = PACKAGES.find((entry) => entry.id === item.id);
            if (!pkg) return acc;
            acc.totalRobux += (pkg.robux + pkg.bonus) * item.qty;
            acc.totalPrice += pkg.price * item.qty;
            acc.items.push({
                name: `${pkg.robux} Robux`,
                qty: item.qty,
                price: pkg.price,
                bonus: pkg.bonus
            });
            return acc;
        },
        { totalRobux: 0, totalPrice: 0, items: [] }
    );
}

function loadCheckoutSummary() {
    const root = document.getElementById("orderSummary");
    const errorEl = document.getElementById("checkoutError");
    if (!root) return;

    const user = getCurrentUser();
    if (!user) {
        if (errorEl) errorEl.textContent = "Silakan login sebelum checkout.";
        root.innerHTML = `<p><a href="login.html">Login di sini</a> untuk melanjutkan pembayaran.</p>`;
        return;
    }

    const summary = getCheckoutTotals();
    if (summary.items.length === 0) {
        root.innerHTML = `<p>Cart kosong. <a href="catalog.html">Kembali ke katalog</a>.</p>`;
        return;
    }

    const itemRows = summary.items
        .map((item) => `<div class="summary-row"><span>${item.name} x${item.qty}</span><span>${rupiah(item.price * item.qty)}</span></div>`)
        .join("");
    root.innerHTML = `
        ${itemRows}
        <hr class="summary-divider" />
        <div class="summary-row"><span>Total Robux</span><strong>${summary.totalRobux}</strong></div>
        <div class="summary-row"><span>Total Bayar</span><strong>${rupiah(summary.totalPrice)}</strong></div>
    `;
}

function processPayment() {
    const errorEl = document.getElementById("checkoutError");
    const payBtn = document.getElementById("payBtn");

    const user = getCurrentUser();
    if (!user) {
        if (errorEl) errorEl.textContent = "Anda harus login untuk membayar.";
        return;
    }

    const summary = getCheckoutTotals();
    if (summary.items.length === 0) {
        if (errorEl) errorEl.textContent = "Cart kosong.";
        return;
    }
    if (errorEl) errorEl.textContent = "";

    if (payBtn) {
        payBtn.disabled = true;
        payBtn.textContent = "Membuat Invoice...";
    }

    pendingOrder = {
        id: `ORD-${Date.now()}`,
        email: user.email,
        totalRobux: summary.totalRobux,
        totalPrice: summary.totalPrice,
        createdAt: new Date().toISOString(),
        items: summary.items,
        status: "pending"
    };

    if (payBtn) {
        payBtn.disabled = false;
        payBtn.textContent = "Bayar Sekarang";
    }
    showPaymentModal();
}

function showPaymentModal() {
    if (!pendingOrder) return;
    const modal = document.getElementById("paymentModal");
    const body = document.getElementById("paymentModalBody");
    if (!modal || !body) return;

    paymentCountdown = PAYMENT_CONFIG.waitingSeconds;
    body.innerHTML = `
        <div class="status-badge pending">Menunggu Pembayaran</div>
        <h2>Bayar ke Nomor Tujuan</h2>
        <p class="modal-note">Lakukan transfer GoPay, lalu tunggu verifikasi sistem.</p>
        <div class="payment-block">
            <p>Merchant</p>
            <strong>${PAYMENT_CONFIG.merchantName}</strong>
        </div>
        <div class="payment-block">
            <p>Nomor GoPay</p>
            <strong class="pay-number">${PAYMENT_CONFIG.gopayNumber}</strong>
        </div>
        <div class="payment-block">
            <p>Total Bayar</p>
            <strong>${rupiah(pendingOrder.totalPrice)}</strong>
        </div>
        <div class="payment-block">
            <p>ID Pesanan</p>
            <strong>${pendingOrder.id}</strong>
        </div>
        <p class="countdown-text">Konfirmasi aktif dalam <span id="payCountdown">${paymentCountdown}</span> detik...</p>
        <div class="modal-actions">
            <button class="btn-primary" id="confirmPayBtn" onclick="confirmPayment()" disabled>Saya Sudah Bayar</button>
            <button class="btn-secondary" onclick="closePaymentModal()">Batalkan</button>
        </div>
    `;
    modal.style.display = "flex";

    clearPaymentTimer();
    paymentTimer = setInterval(() => {
        paymentCountdown -= 1;
        const countdownEl = document.getElementById("payCountdown");
        if (countdownEl) countdownEl.textContent = String(Math.max(paymentCountdown, 0));

        if (paymentCountdown <= 0) {
            clearPaymentTimer();
            const confirmBtn = document.getElementById("confirmPayBtn");
            if (confirmBtn) confirmBtn.disabled = false;
        }
    }, 1000);
}

function confirmPayment() {
    if (!pendingOrder) return;
    clearPaymentTimer();

    pendingOrder.status = "paid";
    pendingOrder.paidAt = new Date().toISOString();

    const orders = getJson(STORAGE_KEYS.orders, []);
    orders.unshift(pendingOrder);
    setJson(STORAGE_KEYS.orders, orders);
    setCart([]);
    updateCartBadge();

    const body = document.getElementById("paymentModalBody");
    if (!body) return;
    body.innerHTML = `
        <div class="success-icon">OK</div>
        <div class="status-badge success">Pembayaran Berhasil</div>
        <h2>Pesanan Sedang Diproses</h2>
        <p class="modal-note">Robux akan dikirim setelah admin verifikasi.</p>
        <div class="payment-block">
            <p>ID Pesanan</p>
            <strong>${pendingOrder.id}</strong>
        </div>
        <div class="payment-block">
            <p>Total Bayar</p>
            <strong>${rupiah(pendingOrder.totalPrice)}</strong>
        </div>
        <div class="payment-block">
            <p>Kontak Admin</p>
            <strong><a href="https://wa.me/${PAYMENT_CONFIG.contactWhatsapp}" target="_blank" rel="noopener noreferrer">WhatsApp Admin</a></strong>
        </div>
        <div class="modal-actions">
            <a href="order.html" class="btn-primary">Lihat Halaman Order</a>
            <a href="index.html" class="btn-secondary">Kembali ke Home</a>
        </div>
    `;
    pendingOrder = null;
}

function closePaymentModal() {
    clearPaymentTimer();
    pendingOrder = null;
    const modal = document.getElementById("paymentModal");
    if (modal) modal.style.display = "none";
}

function clearPaymentTimer() {
    if (paymentTimer) {
        clearInterval(paymentTimer);
        paymentTimer = null;
    }
}

function loadOrders() {
    const root = document.getElementById("ordersList");
    if (!root) return;

    const user = getCurrentUser();
    if (!user) {
        root.innerHTML = `<div class="empty-state">Silakan <a href="login.html">login</a> untuk melihat orders.</div>`;
        return;
    }

    const orders = getJson(STORAGE_KEYS.orders, []).filter((order) => order.email === user.email);
    if (orders.length === 0) {
        root.innerHTML = `<div class="empty-state">Belum ada order. <a href="catalog.html">Belanja sekarang</a>.</div>`;
        return;
    }

    root.innerHTML = orders
        .map((order) => {
            const date = new Date(order.createdAt).toLocaleString("id-ID");
            return `
                <article class="order-card">
                    <h3>${order.id}</h3>
                    <p>${date}</p>
                    <p>${order.totalRobux} Robux</p>
                    <strong>${rupiah(order.totalPrice)}</strong>
                </article>
            `;
        })
        .join("");
}

function updateNavAuth() {
    const navAuth = document.getElementById("navAuth");
    if (!navAuth) return;

    const user = getCurrentUser();
    if (user) {
        navAuth.innerHTML = `
            <span class="user-chip">${user.name}</span>
            <button class="btn-secondary" onclick="logout()">Logout</button>
        `;
        return;
    }

    navAuth.innerHTML = `<a href="login.html" class="btn-secondary">Login</a>`;
}

function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim().toLowerCase();
    const password = document.getElementById("registerPassword").value;
    const errorEl = document.getElementById("registerError");
    if (errorEl) errorEl.textContent = "";

    if (!name || !email || password.length < 6) {
        if (errorEl) errorEl.textContent = "Data tidak valid. Password minimal 6 karakter.";
        return;
    }

    const users = getJson(STORAGE_KEYS.users, []);
    if (users.some((user) => user.email === email)) {
        if (errorEl) errorEl.textContent = "Email sudah terdaftar.";
        return;
    }

    users.push({ name, email, password });
    setJson(STORAGE_KEYS.users, users);
    setJson(STORAGE_KEYS.currentUser, { name, email });
    window.location.href = "index.html";
}

function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;
    const errorEl = document.getElementById("loginError");
    if (errorEl) errorEl.textContent = "";

    const users = getJson(STORAGE_KEYS.users, []);
    const user = users.find((entry) => entry.email === email && entry.password === password);
    if (!user) {
        if (errorEl) errorEl.textContent = "Email atau password salah.";
        return;
    }

    setJson(STORAGE_KEYS.currentUser, { name: user.name, email: user.email });
    window.location.href = "index.html";
}

function logout() {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    updateNavAuth();
}

window.loadPopularPackages = loadPopularPackages;
window.loadAllPackages = loadAllPackages;
window.addToCart = addToCart;
window.updateCartBadge = updateCartBadge;
window.loadCart = loadCart;
window.proceedToCheckout = proceedToCheckout;
window.loadCheckoutSummary = loadCheckoutSummary;
window.processPayment = processPayment;
window.updateNavAuth = updateNavAuth;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.loadOrders = loadOrders;
window.confirmPayment = confirmPayment;
window.closePaymentModal = closePaymentModal;

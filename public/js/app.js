/**
 * সিয়াম পেইন্টস্ এন্ড বার্নিশ কোং - Web POS & Inventory System
 * Client Application Logic
 */

// Application State
const State = {
  currentUser: {
    id: 'usr_admin',
    username: 'admin',
    name: 'মোঃ শওকত আলী (মালিক/এডমিন)',
    role: 'admin',
    avatar: '👨‍💼'
  },
  products: [],
  units: [],
  categories: [],
  settings: {},
  sales: [],
  cart: [],
  activeCategory: 'all',
  posSearchQuery: '',
  paymentMethod: 'cash',
  activeView: 'pos',
  theme: 'dark'
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('siam_user');
  if (savedUser) {
    try {
      State.currentUser = JSON.parse(savedUser);
    } catch (e) {}
  }

  const savedTheme = localStorage.getItem('siam_theme');
  if (savedTheme) {
    State.theme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
    const icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = savedTheme === 'dark' ? '🌓' : '☀️';
  }

  startLiveClock();
  loadSettings();
  loadCategories();
  loadUnits();
  loadProducts();
  applyRolePermissions();
});

function startLiveClock() {
  const clockEl = document.getElementById('liveClockDisplay');
  const update = () => {
    const now = new Date();
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString('bn-BD', { hour12: true });
    }
  };
  update();
  setInterval(update, 1000);
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'info') icon = 'ℹ️';

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

// Role and User Permissions
function applyRolePermissions() {
  const isAdmin = State.currentUser.role === 'admin';

  const avatarEl = document.getElementById('currentUserAvatar');
  const nameEl = document.getElementById('currentUserName');
  const badgeEl = document.getElementById('currentUserRoleBadge');

  if (avatarEl) avatarEl.textContent = State.currentUser.avatar || (isAdmin ? '👨‍💼' : '🧑‍💻');
  if (nameEl) nameEl.textContent = State.currentUser.name;
  if (badgeEl) {
    badgeEl.textContent = isAdmin ? 'ADMIN (মালিক)' : 'CASHIER (ক্যাশিয়ার)';
  }

  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });

  if (!isAdmin && (State.activeView === 'reports' || State.activeView === 'backup')) {
    switchView('pos');
  }
}

function openLoginModal() {
  document.getElementById('loginModalBackdrop').classList.add('active');
}

function closeLoginModal() {
  document.getElementById('loginModalBackdrop').classList.remove('active');
}

async function quickLogin(username, password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await res.json();
    if (result.success) {
      State.currentUser = result.user;
      localStorage.setItem('siam_user', JSON.stringify(result.user));
      applyRolePermissions();
      closeLoginModal();
      showToast(`স্বাগতম! "${result.user.name}" হিসেবে লগইন হয়েছে।`, 'success');
      loadProducts();
    } else {
      showToast(result.message, 'error');
    }
  } catch (err) {
    showToast('লগইন প্রক্রিয়ায় ত্রুটি হয়েছে!', 'error');
  }
}

function toggleTheme() {
  State.theme = State.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', State.theme);
  localStorage.setItem('siam_theme', State.theme);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = State.theme === 'dark' ? '🌓' : '☀️';
  showToast(`থিম: ${State.theme === 'dark' ? 'ডার্ক মোড' : 'লাইট মোড'}`, 'info');
}

// Navigation & View Routing
function switchView(viewName) {
  State.activeView = viewName;

  const navMap = {
    pos: { btn: 'navPosBtn', title: '🛒 সেলস কাউন্টার ও বিলিং' },
    inventory: { btn: 'navInventoryBtn', title: '📦 প্রোডাক্ট ও স্টক' },
    units: { btn: 'navUnitsBtn', title: '⚖️ ডাইনামিক ইউনিট সেটিংস' },
    sales: { btn: 'navSalesBtn', title: '🧾 বিক্রয় মেমো তালিকা' },
    reports: { btn: 'navReportsBtn', title: '📊 আর্থিক লাভ-লোকসান রিপোর্ট' },
    backup: { btn: 'navBackupBtn', title: '💾 JSON ডাটাবেজ ব্যাকআপ' },
    settings: { btn: 'navSettingsBtn', title: '⚙️ প্রতিষ্ঠান ও মেমো সেটিংস' }
  };

  document.querySelectorAll('.nav-item button').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));

  const navInfo = navMap[viewName];
  if (navInfo) {
    const btn = document.getElementById(navInfo.btn);
    if (btn) btn.classList.add('active');
    const titleEl = document.getElementById('currentViewTitle');
    if (titleEl) titleEl.textContent = navInfo.title;
  }

  const sectionEl = document.getElementById(`view-${viewName}`);
  if (sectionEl) {
    sectionEl.classList.add('active');
  }

  if (viewName === 'inventory') renderInventoryTable();
  if (viewName === 'units') renderUnitsTable();
  if (viewName === 'sales') loadSalesHistory();
  if (viewName === 'reports') loadReportsData();
}

// Loaders
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const result = await res.json();
    if (result.success && result.settings) {
      State.settings = result.settings;
      populateSettingsForm();
    }
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const result = await res.json();
    if (result.success && result.categories) {
      State.categories = result.categories;
      renderPosCategories();
    }
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

async function loadUnits() {
  try {
    const res = await fetch('/api/units');
    const result = await res.json();
    if (result.success && result.units) {
      State.units = result.units;
      renderUnitsTable();
    }
  } catch (err) {
    console.error('Error loading units:', err);
  }
}

async function loadProducts() {
  try {
    const res = await fetch('/api/products', {
      headers: { 'x-user-role': State.currentUser.role }
    });
    const result = await res.json();
    if (result.success && result.products) {
      State.products = result.products;
      renderPosUnitFilters();
      renderPosProducts();
      renderInventoryTable();
      updateLowStockBadge();
    }
  } catch (err) {
    console.error('Error loading products:', err);
  }
}

function updateLowStockBadge() {
  const lowStockCount = State.products.filter(p => p.stock <= (p.minStockAlert || 10)).length;
  const badge = document.getElementById('lowStockBadge');
  if (badge) {
    if (lowStockCount > 0) {
      badge.textContent = `${lowStockCount} কম`;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// POS Screen Functions
function renderPosUnitFilters() {
  const container = document.getElementById('posUnitFilterPills');
  if (!container) return;

  // Calculate counts scoped to current category filter
  let catProducts = State.products;
  if (State.activeCategory && State.activeCategory !== 'all') {
    catProducts = catProducts.filter(p => p.category === State.activeCategory);
  }

  const allCount = catProducts.length;
  const kgCount = catProducts.filter(p => p.unit === 'kg' || p.unit === 'gram').length;
  const litreCount = catProducts.filter(p => p.unit === 'litre' || p.unit === 'ml').length;
  const yardCount = catProducts.filter(p => p.unit === 'yard').length;
  const ounceCount = catProducts.filter(p => p.unit === 'ounce').length;
  const pcsCount = catProducts.filter(p => p.unit === 'pcs' || p.unit === 'can').length;

  const unitFilters = [
    { id: 'all', nameBn: '🌟 সকল একক', count: allCount },
    { id: 'kg', nameBn: '⚖️ কেজি পণ্য', count: kgCount },
    { id: 'litre', nameBn: '💧 লিটার পণ্য', count: litreCount },
    { id: 'yard', nameBn: '📏 গজ পণ্য', count: yardCount },
    { id: 'ounce', nameBn: '🧪 আউন্স পণ্য', count: ounceCount },
    { id: 'pcs_can', nameBn: '📦 পিস ও ক্যান', count: pcsCount }
  ];

  // Dynamic custom units support
  if (Array.isArray(State.units)) {
    const knownUnitIds = ['kg', 'gram', 'litre', 'ml', 'yard', 'ounce', 'pcs', 'can'];
    State.units.forEach(u => {
      if (!knownUnitIds.includes(u.id)) {
        const customCount = catProducts.filter(p => p.unit === u.id).length;
        if (customCount > 0 || State.activeUnitFilter === u.id) {
          unitFilters.push({
            id: u.id,
            nameBn: `📦 ${u.nameBn}`,
            count: customCount
          });
        }
      }
    });
  }

  container.innerHTML = unitFilters.map(u => `
    <button class="cat-pill ${State.activeUnitFilter === u.id ? 'active' : ''}" style="${State.activeUnitFilter === u.id ? 'background:var(--brand-accent); border-color:var(--brand-accent); color:#000;' : ''}" onclick="selectPosUnitFilter('${u.id}')">
      <span>${u.nameBn}</span>
      <span style="font-size:0.7rem; opacity:0.85; margin-left:2px;">(${u.count})</span>
    </button>
  `).join('');
}

function selectPosUnitFilter(unitType) {
  State.activeUnitFilter = unitType;
  SoundEffects.beep();
  renderPosUnitFilters();
  renderPosProducts();
}

function renderPosCategories() {
  const container = document.getElementById('posCategoryPills');
  if (!container) return;

  container.innerHTML = State.categories.map(cat => `
    <button class="cat-pill ${State.activeCategory === cat.id ? 'active' : ''}" onclick="selectPosCategory('${cat.id}')">
      <span>${cat.icon || '🎨'}</span>
      <span>${cat.nameBn}</span>
    </button>
  `).join('');
}

function selectPosCategory(catId) {
  State.activeCategory = catId;
  State.activeUnitFilter = 'all'; // Reset unit filter to 'all' so category products are shown immediately!
  SoundEffects.beep();
  renderPosCategories();
  renderPosUnitFilters();
  renderPosProducts();
}

function handlePosSearch(val) {
  State.posSearchQuery = val ? val.trim().toLowerCase() : '';
  renderPosProducts();
}

function renderPosProducts() {
  const grid = document.getElementById('posProductsGrid');
  if (!grid) return;

  let filtered = State.products;

  // Filter by Category
  if (State.activeCategory !== 'all') {
    filtered = filtered.filter(p => p.category === State.activeCategory);
  }

  // Filter by Unit (কেজি, লিটার, গজ, আউন্স, পিস/ক্যান)
  if (State.activeUnitFilter && State.activeUnitFilter !== 'all') {
    if (State.activeUnitFilter === 'kg') {
      filtered = filtered.filter(p => p.unit === 'kg' || p.unit === 'gram');
    } else if (State.activeUnitFilter === 'litre') {
      filtered = filtered.filter(p => p.unit === 'litre' || p.unit === 'ml');
    } else if (State.activeUnitFilter === 'yard') {
      filtered = filtered.filter(p => p.unit === 'yard');
    } else if (State.activeUnitFilter === 'ounce') {
      filtered = filtered.filter(p => p.unit === 'ounce');
    } else if (State.activeUnitFilter === 'pcs_can') {
      filtered = filtered.filter(p => p.unit === 'pcs' || p.unit === 'can');
    } else {
      filtered = filtered.filter(p => p.unit === State.activeUnitFilter);
    }
  }

  // Filter by Search text
  if (State.posSearchQuery) {
    filtered = filtered.filter(p => 
      p.nameBn.toLowerCase().includes(State.posSearchQuery) ||
      (p.nameEn && p.nameEn.toLowerCase().includes(State.posSearchQuery)) ||
      (p.sku && p.sku.toLowerCase().includes(State.posSearchQuery))
    );
  }

  if (State.products.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding:3rem 1rem; color:var(--text-muted); background:var(--bg-card); border-radius:var(--radius-md); border:1px dashed var(--border-color);">
        <div style="font-size:2.5rem; margin-bottom:0.5rem;">📦</div>
        <p style="font-size:1.05rem; font-weight:700; color:var(--text-main); margin-bottom:0.25rem;">বর্তমানে কোনো প্রোডাক্ট ডাটাবেজে নেই</p>
        <p style="font-size:0.85rem; margin-bottom:1rem;">দোকানের মালামাল বিক্রির জন্য প্রথমে এডমিন প্যানেল থেকে নতুন প্রোডাক্ট যোগ করুন।</p>
        ${State.currentUser.role === 'admin' ? `
          <button class="btn-primary" onclick="openProductModal()" style="margin:0 auto;">
            <span>➕ নতুন প্রোডাক্ট যোগ করুন</span>
          </button>
        ` : ''}
      </div>
    `;
    return;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align:center; padding:2.5rem; color:var(--text-muted);">
        <p style="font-size:1rem; font-weight:600;">কোনো প্রোডাক্ট পাওয়া যায়নি!</p>
        <p style="font-size:0.8rem;">অন্য কোনো একক বা ক্যাটাগরি ফিল্টার সিলেক্ট করুন।</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(prod => {
    const unitObj = State.units.find(u => u.id === prod.unit) || {};
    const unitLabel = unitObj.nameBn ? unitObj.nameBn.split(' ')[0] : prod.unit;
    const isLow = prod.stock <= (prod.minStockAlert || 10) && prod.stock > 0;
    const isOut = prod.stock <= 0;

    let stockBadgeClass = 'card-badge-stock';
    let stockBadgeText = `স্টক: ${prod.stock} ${unitObj.symbolBn || ''}`;
    if (isLow) {
      stockBadgeClass += ' low';
      stockBadgeText = `কম: ${prod.stock}`;
    } else if (isOut) {
      stockBadgeClass += ' out';
      stockBadgeText = 'স্টক শেষ';
    }

    return `
      <div class="pos-product-card" onclick="addToCart('${prod.id}')">
        <div class="card-img-box">
          <img src="${prod.image || '/assets/images/paint-black.svg'}" alt="${prod.nameBn}" onerror="this.src='/assets/images/paint-black.svg'">
          <div class="${stockBadgeClass}">${stockBadgeText}</div>
        </div>
        <div class="card-info">
          <span class="card-sku">${prod.sku || ''}</span>
          <h4 class="card-name" title="${prod.nameBn}">${prod.nameBn}</h4>
          <div class="card-price-row">
            <span class="card-price">৳ ${prod.sellingPrice}</span>
            <span class="card-unit">/ ${unitLabel}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Cart Management & Calculations
function addToCart(productId) {
  const product = State.products.find(p => p.id === productId);
  if (!product) return;

  if (product.stock <= 0) {
    SoundEffects.warning();
    showToast(`"${product.nameBn}" বর্তমানে স্টক আউট!`, 'error');
    return;
  }

  const existingIndex = State.cart.findIndex(item => item.productId === productId);
  const unitObj = State.units.find(u => u.id === product.unit) || {};

  if (existingIndex !== -1) {
    const currentQty = State.cart[existingIndex].quantity;
    const addStep = unitObj.allowDecimals ? (unitObj.type === 'volume' || unitObj.type === 'weight' ? 1.0 : 1) : 1;
    const newQty = Number((currentQty + addStep).toFixed(3));

    if (newQty > product.stock) {
      SoundEffects.warning();
      showToast(`স্টকে মাত্র ${product.stock} রয়েছে!`, 'error');
      return;
    }

    State.cart[existingIndex].quantity = newQty;
    State.cart[existingIndex].totalPrice = Number((newQty * product.sellingPrice).toFixed(2));
  } else {
    const initialQty = 1;
    State.cart.push({
      productId: product.id,
      sku: product.sku,
      nameBn: product.nameBn,
      unit: product.unit,
      unitObj: unitObj,
      unitRate: product.sellingPrice, // Fixed Selling Price
      quantity: initialQty,
      totalPrice: Number((initialQty * product.sellingPrice).toFixed(2))
    });
  }

  SoundEffects.beep();
  renderCart();
}

function updateCartItemQty(index, newQty) {
  const item = State.cart[index];
  if (!item) return;

  const product = State.products.find(p => p.id === item.productId);
  if (!product) return;

  let qty = parseFloat(newQty);
  if (isNaN(qty) || qty <= 0) {
    removeFromCart(index);
    return;
  }

  if (qty > product.stock) {
    SoundEffects.warning();
    showToast(`সর্বোচ্চ স্টক ${product.stock} টি!`, 'error');
    qty = product.stock;
  }

  qty = Number(qty.toFixed(3));
  item.quantity = qty;
  item.totalPrice = Number((qty * item.unitRate).toFixed(2));
  renderCart();
}

function addFractionalToCartItem(index, amount) {
  const item = State.cart[index];
  if (!item) return;
  const product = State.products.find(p => p.id === item.productId);
  if (!product) return;

  let nextQty = Number((item.quantity + amount).toFixed(3));
  if (nextQty > product.stock) {
    SoundEffects.warning();
    showToast(`পর্যাপ্ত স্টক নেই (সর্বোচ্চ ${product.stock})!`, 'error');
    return;
  }

  item.quantity = nextQty;
  item.totalPrice = Number((nextQty * item.unitRate).toFixed(2));
  SoundEffects.beep();
  renderCart();
}

function removeFromCart(index) {
  State.cart.splice(index, 1);
  renderCart();
}

function clearCart() {
  if (State.cart.length === 0) return;
  State.cart = [];
  renderCart();
  showToast('কার্ট খালি করা হয়েছে।', 'info');
}

function renderCart() {
  const list = document.getElementById('cartItemsList');
  const countBadge = document.getElementById('cartItemCount');
  const btnCheckout = document.getElementById('btnCompleteSale');

  if (!list) return;

  countBadge.textContent = `${State.cart.length} টি আইটেম`;

  if (State.cart.length === 0) {
    list.innerHTML = `
      <div class="cart-empty-state">
        <div class="cart-empty-icon">🎨</div>
        <p style="font-weight:600;">কার্ট খালি রয়েছে</p>
        <p style="font-size:0.8rem;">বামের প্রোডাক্টে ক্লিক করে বিক্রির তালিকায় যোগ করুন।</p>
      </div>
    `;
    btnCheckout.disabled = true;
    updateCartTotals();
    return;
  }

  btnCheckout.disabled = false;

  list.innerHTML = State.cart.map((item, idx) => {
    const unitObj = item.unitObj || State.units.find(u => u.id === item.unit) || {};
    const unitSymbol = unitObj.symbolBn || 'একক';

    let subUnitInfo = '';
    if (unitObj.subRatio && unitObj.subRatio > 1) {
      const convertedVal = (item.quantity * unitObj.subRatio).toFixed(1).replace(/\.0$/, '');
      subUnitInfo = ` <span style="font-size:0.73rem; color:var(--brand-accent);">(${convertedVal} ${unitObj.subUnitBn || 'কেজি'})</span>`;
    }

    let fractionPillsHtml = '';
    if (unitObj.quickAmounts && unitObj.quickAmounts.length > 0) {
      fractionPillsHtml = `
        <div class="quick-fraction-pills">
          <span style="font-size:0.65rem; color:var(--text-muted); align-self:center;">যোগ:</span>
          ${unitObj.quickAmounts.map(amt => {
            let label = `+${amt} ${unitSymbol}`;
            if (unitObj.id === 'litre' && amt < 1) label = `+${Math.round(amt * 1000)}মি.লি.`;
            if (unitObj.id === 'kg' && amt < 1) label = `+${Math.round(amt * 1000)}গ্রাম`;
            if (unitObj.subRatio && unitObj.subRatio > 1 && amt < 1) {
              const subVal = Math.round(amt * unitObj.subRatio * 100) / 100;
              label = `+${subVal} ${unitObj.subUnitBn || 'কেজি'}`;
            } else if (unitObj.subRatio && unitObj.subRatio > 1) {
              label = `+${amt} ${unitSymbol}`;
            }
            return `<button class="btn-fraction" onclick="addFractionalToCartItem(${idx}, ${amt})">${label}</button>`;
          }).join('')}
        </div>
      `;
    }

    return `
      <div class="cart-item-card">
        <div class="cart-item-top">
          <div>
            <h4 class="cart-item-name">${item.nameBn}</h4>
            <span class="cart-item-rate-badge">ফিক্সড রেট: ৳ ${item.unitRate} / ${unitSymbol}${unitObj.subRatio ? ` (১ ${unitSymbol} = ${unitObj.subRatio} ${unitObj.subUnitBn || 'কেজি'})` : ''}</span>
          </div>
          <button class="cart-item-remove" onclick="removeFromCart(${idx})" title="মুছুন">✕</button>
        </div>

        <div class="cart-qty-controller">
          <div class="qty-input-group">
            <button class="qty-btn" onclick="updateCartItemQty(${idx}, ${item.quantity - (unitObj.allowDecimals ? 0.2 : 1)})">-</button>
            <input type="number" class="qty-input" value="${item.quantity}" step="any" min="0.01" onchange="updateCartItemQty(${idx}, this.value)">
            <button class="qty-btn" onclick="updateCartItemQty(${idx}, ${item.quantity + (unitObj.allowDecimals ? 0.2 : 1)})">+</button>
          </div>
          <span style="font-size:0.8rem; color:var(--text-muted);">${unitSymbol}${subUnitInfo}</span>
          <div class="cart-item-total">৳ ${item.totalPrice.toFixed(2)}</div>
        </div>

        ${fractionPillsHtml}
      </div>
    `;
  }).join('');

  updateCartTotals();
}

function updateCartTotals() {
  const subtotal = State.cart.reduce((acc, item) => acc + item.totalPrice, 0);
  const discountInput = document.getElementById('cartDiscountInput');
  const discountVal = Math.max(0, parseFloat(discountInput.value) || 0);

  const grandTotal = Math.max(0, subtotal - discountVal);

  document.getElementById('cartSubtotalText').textContent = `৳ ${subtotal.toFixed(2)}`;
  document.getElementById('cartGrandTotalText').textContent = `৳ ${grandTotal.toFixed(2)}`;

  const paidInput = document.getElementById('cartPaidInput');
  if (paidInput.value === '0' || paidInput.dataset.touched !== 'true') {
    paidInput.value = grandTotal.toFixed(2);
  }

  calculateChange();
}

function calculateChange() {
  const paidInput = document.getElementById('cartPaidInput');
  paidInput.dataset.touched = 'true';

  const subtotal = State.cart.reduce((acc, item) => acc + item.totalPrice, 0);
  const discountVal = Math.max(0, parseFloat(document.getElementById('cartDiscountInput').value) || 0);
  const grandTotal = Math.max(0, subtotal - discountVal);
  const paidAmount = parseFloat(paidInput.value) || 0;

  const changeText = document.getElementById('cartChangeText');
  const changeLabel = document.getElementById('cartChangeLabel');

  if (State.paymentMethod === 'due') {
    changeLabel.textContent = 'বাকি জমা:';
    changeText.textContent = `৳ ${grandTotal.toFixed(2)}`;
    changeText.style.color = 'var(--brand-danger)';
  } else if (paidAmount >= grandTotal) {
    const change = paidAmount - grandTotal;
    changeLabel.textContent = 'ফেরত টাকা:';
    changeText.textContent = `৳ ${change.toFixed(2)}`;
    changeText.style.color = 'var(--brand-success)';
  } else {
    const due = grandTotal - paidAmount;
    changeLabel.textContent = 'কম / বাকি:';
    changeText.textContent = `৳ ${due.toFixed(2)}`;
    changeText.style.color = 'var(--brand-accent)';
  }
}

function selectPaymentMethod(method) {
  State.paymentMethod = method;
  document.querySelectorAll('.payment-method-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.method === method);
  });
  calculateChange();
}

// Checkout & 58mm Thermal Print
async function processSaleAndPrint() {
  if (State.cart.length === 0) {
    showToast('কার্টে কোনো প্রোডাক্ট নেই!', 'error');
    return;
  }

  const customerName = document.getElementById('posCustomerName').value;
  const customerPhone = document.getElementById('posCustomerPhone').value;
  const discount = parseFloat(document.getElementById('cartDiscountInput').value) || 0;
  const paidAmount = parseFloat(document.getElementById('cartPaidInput').value);

  const payload = {
    items: State.cart.map(it => ({
      productId: it.productId,
      quantity: it.quantity
    })),
    customerName,
    customerPhone,
    cashierId: State.currentUser.id,
    cashierName: State.currentUser.name,
    paymentMethod: State.paymentMethod,
    discount,
    paidAmount
  };

  const btnCheckout = document.getElementById('btnCompleteSale');
  btnCheckout.disabled = true;
  btnCheckout.innerHTML = '<span>⏳ প্রসেস হচ্ছে...</span>';

  try {
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success && result.invoice) {
      SoundEffects.success();
      showToast('বিক্রি সম্পন্ন হয়েছে ও স্টক মাইনাস হয়েছে!', 'success');

      State.cart = [];
      document.getElementById('posCustomerName').value = '';
      document.getElementById('posCustomerPhone').value = '';
      document.getElementById('cartDiscountInput').value = '0';
      document.getElementById('cartPaidInput').dataset.touched = 'false';
      renderCart();

      loadProducts();
      renderThermalReceipt(result.invoice);
      openReceiptModal();
    } else {
      SoundEffects.warning();
      showToast(result.message || 'বিক্রিতে সমস্যা হয়েছে!', 'error');
    }
  } catch (err) {
    SoundEffects.warning();
    showToast('সার্ভারে সংযোগ পাওয়া যায়নি!', 'error');
  } finally {
    btnCheckout.disabled = false;
    btnCheckout.innerHTML = '<span>🖨️ বিক্রি সম্পন্ন ও ৫৮ মিমি রসিদ প্রিন্ট</span>';
  }
}

// Render Exact 58mm Thermal Print Layout
function renderThermalReceipt(invoice) {
  const container = document.getElementById('receiptRenderContent');
  const printSection = document.getElementById('thermalPrintSection');
  const s = State.settings || {};

  const companyBn = s.companyNameBn || 'সিয়াম পেইন্টস্ এন্ড বার্নিশ কোং';
  const proprietorBn = s.proprietorBn || 'মোঃ শওকত আলী';
  const tinVat = s.tinVatNumber || '০০৫১০৪১৫৪-০৯০১';
  const addressBn = s.addressBn || 'যশোর-খুলনা-বেনাপোল রোড, মোবারককাঠি, যশোর।';
  const phones = s.phone || '০১৬৪১-৫১৮৬৬২, ০১৬৪১-৫১৮৬৫৯, ০১৯২৪-৬৪৪৬০১, ০১৭১৮-৯২৭৩০৪';
  const footerMessage = s.thermalPrinter?.footerMessageBn || 'ধন্যবাদ, আবার আসবেন!';
  const footerSub = s.thermalPrinter?.footerSubBn || 'বিক্রিত মাল ফেরত নেওয়া হয় না, তবে পরিবর্তনের সুযোগ রয়েছে।';

  const dateObj = new Date(invoice.timestamp);
  const formattedDate = dateObj.toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' });
  const formattedTime = dateObj.toLocaleTimeString('bn-BD', { hour12: true, hour: '2-digit', minute: '2-digit' });

  let methodBn = 'নগদ ক্যাশ';
  if (invoice.paymentMethod === 'bkash') methodBn = 'বিকাশ';
  if (invoice.paymentMethod === 'nagad') methodBn = 'নগদ';
  if (invoice.paymentMethod === 'due') methodBn = 'বাকি';

  const receiptHtml = `
    <div class="thermal-header">
      <div class="thermal-logo-text">${companyBn}</div>
      <div class="thermal-proprietor">প্রোপ্রাইটর: ${proprietorBn}</div>
      <div class="thermal-tin">টিআইএন: ${tinVat}</div>
      <div class="thermal-address">${addressBn}</div>
      <div class="thermal-phones">মোবাইল: ${phones}</div>
    </div>

    <div class="thermal-meta">
      <div class="thermal-row-flex">
        <span>মেমো নং: <b>${invoice.invoiceNumber}</b></span>
        <span>${formattedDate}</span>
      </div>
      <div class="thermal-row-flex">
        <span>সময়: ${formattedTime}</span>
        <span>ক্যাশিয়ার: ${invoice.cashierName.split(' ')[0]}</span>
      </div>
      ${invoice.customerName ? `
      <div class="thermal-row-flex" style="margin-top:0.8mm;">
        <span>ক্রেতা: <b>${invoice.customerName}</b></span>
        <span>${invoice.customerPhone || ''}</span>
      </div>` : ''}
    </div>

    <table class="thermal-items-table">
      <thead>
        <tr>
          <th style="width:48%;">বিবরণ</th>
          <th style="width:26%; text-align:center;">পরিমাণ</th>
          <th style="width:26%; text-align:right;">মোট (৳)</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map(it => `
          <tr>
            <td>
              <div><b>${it.nameBn}</b></div>
              <div style="font-size:7pt; color:#444;">@ ${it.unitRate}৳/${it.unitNameBn}</div>
            </td>
            <td style="text-align:center;">${it.quantity} ${it.unitSymbolBn || it.unitNameBn}</td>
            <td style="text-align:right; font-weight:700;">${it.totalPrice.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="thermal-calc-box">
      <div class="thermal-row-flex">
        <span>সাবটোটাল:</span>
        <span>৳ ${invoice.subtotal.toFixed(2)}</span>
      </div>
      ${invoice.discount > 0 ? `
      <div class="thermal-row-flex">
        <span>ছাড় / ডিসকাউন্ট:</span>
        <span>- ৳ ${invoice.discount.toFixed(2)}</span>
      </div>` : ''}
      <div class="thermal-row-flex thermal-grand-total">
        <span>সর্বমোট বিল:</span>
        <span>৳ ${invoice.grandTotal.toFixed(2)}</span>
      </div>
      <div class="thermal-row-flex">
        <span>পেমেন্ট মাধ্যম:</span>
        <span>${methodBn}</span>
      </div>
      <div class="thermal-row-flex">
        <span>জমা প্রদান:</span>
        <span>৳ ${(invoice.paidAmount || invoice.grandTotal).toFixed(2)}</span>
      </div>
      ${invoice.changeAmount > 0 ? `
      <div class="thermal-row-flex">
        <span>ফেরত দেওয়া হয়েছে:</span>
        <span>৳ ${invoice.changeAmount.toFixed(2)}</span>
      </div>` : ''}
      ${invoice.dueAmount > 0 ? `
      <div class="thermal-row-flex" style="color:#d00;">
        <span>বাকি পাওনা:</span>
        <span>৳ ${invoice.dueAmount.toFixed(2)}</span>
      </div>` : ''}
    </div>

    <div class="thermal-footer">
      <div class="thermal-barcode-sim">*${invoice.invoiceNumber}*</div>
      <p style="font-weight:700; margin-bottom:0.5mm;">${footerMessage}</p>
      <p>${footerSub}</p>
    </div>
  `;

  if (container) container.innerHTML = receiptHtml;
  if (printSection) printSection.innerHTML = receiptHtml;
}

function openReceiptModal() {
  document.getElementById('receiptModalBackdrop').classList.add('active');
}

function closeReceiptModal() {
  document.getElementById('receiptModalBackdrop').classList.remove('active');
}

function triggerDirectPrint() {
  window.print();
}

// Product Management (Add / Edit)
function renderInventoryTable(searchVal = null) {
  const tbody = document.getElementById('inventoryTableBody');
  const catFilter = document.getElementById('inventoryCategoryFilter');
  if (!tbody) return;

  if (catFilter) {
    const currentVal = catFilter.value || 'all';
    catFilter.innerHTML = '<option value="all">সকল ক্যাটাগরি</option>' +
      State.categories.filter(c => c.id !== 'all').map(c => `<option value="${c.id}">${c.icon || '🎨'} ${c.nameBn}</option>`).join('');
    if (currentVal && State.categories.some(c => c.id === currentVal)) {
      catFilter.value = currentVal;
    } else {
      catFilter.value = 'all';
    }
  }

  const query = searchVal !== null ? searchVal.toLowerCase().trim() : (document.getElementById('inventorySearchInput')?.value.toLowerCase().trim() || '');
  const selectedCat = catFilter ? catFilter.value : 'all';
  const isAdmin = State.currentUser.role === 'admin';

  let filtered = State.products;
  if (selectedCat !== 'all') {
    filtered = filtered.filter(p => p.category === selectedCat);
  }
  if (query) {
    filtered = filtered.filter(p => 
      p.nameBn.toLowerCase().includes(query) ||
      (p.nameEn && p.nameEn.toLowerCase().includes(query)) ||
      (p.sku && p.sku.toLowerCase().includes(query))
    );
  }

  if (State.products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:3rem 1rem; color:var(--text-muted);">
          <div style="font-size:2.2rem; margin-bottom:0.5rem;">📦</div>
          <div style="font-weight:700; font-size:1.05rem; color:var(--text-main); margin-bottom:0.35rem;">বর্তমানে কোনো প্রোডাক্ট যোগ করা হয়নি</div>
          <p style="font-size:0.85rem; margin-bottom:1rem;">উপরে "নতুন প্রোডাক্ট যোগ করুন" বাটনে ক্লিক করে আসল প্রোডাক্টের নাম, ইউনিট, কেনা দাম ও বিক্রি দাম এন্ট্রি করুন।</p>
          <button class="btn-primary" onclick="openProductModal()" style="margin:0 auto;">
            <span>➕ নতুন প্রোডাক্ট যোগ করুন</span>
          </button>
        </td>
      </tr>
    `;
    return;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--text-muted);">কোনো প্রোডাক্ট পাওয়া যায়নি।</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(prod => {
    const catObj = State.categories.find(c => c.id === prod.category) || {};
    const unitObj = State.units.find(u => u.id === prod.unit) || {};
    const isLow = prod.stock <= (prod.minStockAlert || 10);

    return `
      <tr>
        <td>
          <div class="table-product-cell">
            <img src="${prod.image || '/assets/images/paint-black.svg'}" class="table-product-thumb" alt="${prod.nameBn}">
            <div>
              <div style="font-weight:600;">${prod.nameBn}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">${prod.sku || ''}</div>
            </div>
          </div>
        </td>
        <td>
          <span style="font-size:0.82rem;">${catObj.icon || '🎨'} ${catObj.nameBn || prod.category}</span>
        </td>
        <td>
          <span style="font-weight:600;">${unitObj.nameBn ? unitObj.nameBn.split(' ')[0] : prod.unit}</span>
        </td>
        <td class="admin-only" style="${isAdmin ? '' : 'display:none;'}">
          <span style="font-family:var(--font-mono); color:var(--text-muted);">৳ ${prod.costPrice || 0}</span>
        </td>
        <td>
          <span style="font-family:var(--font-mono); font-weight:700; color:var(--brand-accent);">৳ ${prod.sellingPrice}</span>
        </td>
        <td>
          <span style="font-family:var(--font-mono); font-weight:700;">${prod.stock}</span>
          <span style="font-size:0.75rem; color:var(--text-muted);">${unitObj.symbolBn || ''}</span>
        </td>
        <td>
          <span class="badge-stock-pill ${isLow ? 'low' : ''}">
            ${isLow ? '⚠️ লো স্টক' : '✓ পর্যাপ্ত'}
          </span>
        </td>
        <td class="admin-only" style="text-align:right; ${isAdmin ? '' : 'display:none;'}">
          <div class="actions-btn-group" style="justify-content:flex-end;">
            <button class="btn-action-icon" style="width:auto; padding:0 0.5rem; font-size:0.75rem; font-weight:600; background:rgba(245,158,11,0.15); color:var(--brand-accent); border-color:rgba(245,158,11,0.3);" title="নতুন স্টক যোগ করুন (Restock)" onclick="openStockModal('${prod.id}')">⚡ রিস্টক</button>
            <button class="btn-action-icon" title="এডিট" onclick="openProductModal('${prod.id}')">✏️</button>
            <button class="btn-action-icon danger" title="মুছুন" onclick="deleteProduct('${prod.id}')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

let selectedImageFile = null;

function handleImageFileSelect(input) {
  if (input.files && input.files[0]) {
    selectedImageFile = input.files[0];
    const previewUrl = URL.createObjectURL(selectedImageFile);
    document.getElementById('modalProdImagePreview').src = previewUrl;
    showToast('ছবি সিলেক্ট হয়েছে!', 'info');
  }
}

function previewPresetImage(url) {
  selectedImageFile = null;
  const fileInput = document.getElementById('modalProdImageFile');
  if (fileInput) fileInput.value = '';
  document.getElementById('modalProdImagePreview').src = url;
}

function populateModalCategories(selectedCatId = null) {
  const catSelect = document.getElementById('modalProdCategory');
  const selectWrapper = document.getElementById('categorySelectWrapper');
  const newInputWrapper = document.getElementById('categoryNewInputWrapper');
  const newCatInput = document.getElementById('modalProdNewCategoryName');
  const btnToggle = document.getElementById('btnToggleNewCat');

  const customCategories = State.categories.filter(c => c.id !== 'all');

  if (customCategories.length === 0) {
    // If no category created yet, show text input directly
    if (selectWrapper) selectWrapper.style.display = 'none';
    if (newInputWrapper) newInputWrapper.style.display = 'block';
    if (newCatInput) newCatInput.value = '';
    if (btnToggle) btnToggle.style.display = 'none';
    if (catSelect) catSelect.innerHTML = '<option value="__new__">➕ নতুন ক্যাটাগরি তৈরি করুন</option>';
  } else {
    // Categories exist
    if (selectWrapper) selectWrapper.style.display = 'block';
    if (newInputWrapper) newInputWrapper.style.display = 'none';
    if (newCatInput) newCatInput.value = '';
    if (btnToggle) btnToggle.style.display = 'inline-block';

    if (catSelect) {
      catSelect.innerHTML = customCategories.map(c => `<option value="${c.id}">${c.icon || '🎨'} ${c.nameBn}</option>`).join('') +
        `<option value="__new__">➕ নতুন ক্যাটাগরি লিখুন...</option>`;
      
      if (selectedCatId && customCategories.some(c => c.id === selectedCatId)) {
        catSelect.value = selectedCatId;
      } else {
        catSelect.value = customCategories[0].id;
      }
    }
  }
}

function toggleNewCategoryInput() {
  const selectWrapper = document.getElementById('categorySelectWrapper');
  const newInputWrapper = document.getElementById('categoryNewInputWrapper');
  const newCatInput = document.getElementById('modalProdNewCategoryName');
  const catSelect = document.getElementById('modalProdCategory');

  if (selectWrapper) selectWrapper.style.display = 'none';
  if (newInputWrapper) newInputWrapper.style.display = 'block';
  if (catSelect) catSelect.value = '__new__';
  if (newCatInput) {
    newCatInput.focus();
  }
}

function cancelNewCategoryInput() {
  const customCategories = State.categories.filter(c => c.id !== 'all');
  if (customCategories.length === 0) {
    showToast('প্রথমে একটি নতুন ক্যাটাগরির নাম লিখুন।', 'info');
    return;
  }
  const selectWrapper = document.getElementById('categorySelectWrapper');
  const newInputWrapper = document.getElementById('categoryNewInputWrapper');
  const catSelect = document.getElementById('modalProdCategory');
  const newCatInput = document.getElementById('modalProdNewCategoryName');

  if (newInputWrapper) newInputWrapper.style.display = 'none';
  if (selectWrapper) selectWrapper.style.display = 'block';
  if (newCatInput) newCatInput.value = '';
  if (catSelect && catSelect.value === '__new__') {
    catSelect.value = customCategories[0].id;
  }
}

function onCategorySelectChange(val) {
  if (val === '__new__') {
    toggleNewCategoryInput();
  }
}

function populateModalUnits(selectedUnitId = null) {
  const unitSelect = document.getElementById('modalProdUnit');
  const selectWrapper = document.getElementById('unitSelectWrapper');
  const newInputWrapper = document.getElementById('unitNewInputWrapper');
  const newUnitInput = document.getElementById('modalProdNewUnitName');
  const btnToggle = document.getElementById('btnToggleNewUnit');

  if (State.units.length === 0) {
    if (selectWrapper) selectWrapper.style.display = 'none';
    if (newInputWrapper) newInputWrapper.style.display = 'block';
    if (newUnitInput) newUnitInput.value = '';
    if (btnToggle) btnToggle.style.display = 'none';
    if (unitSelect) unitSelect.innerHTML = '<option value="__new__">➕ নতুন ইউনিট তৈরি করুন</option>';
  } else {
    if (selectWrapper) selectWrapper.style.display = 'block';
    if (newInputWrapper) newInputWrapper.style.display = 'none';
    if (newUnitInput) newUnitInput.value = '';
    if (btnToggle) btnToggle.style.display = 'inline-block';

    if (unitSelect) {
      unitSelect.innerHTML = State.units.map(u => `<option value="${u.id}">${u.nameBn}</option>`).join('') +
        `<option value="__new__">➕ নতুন ইউনিট লিখুন...</option>`;
      
      if (selectedUnitId && State.units.some(u => u.id === selectedUnitId)) {
        unitSelect.value = selectedUnitId;
      } else {
        unitSelect.value = State.units[0].id;
      }
    }
  }
}

function toggleNewUnitInput() {
  const selectWrapper = document.getElementById('unitSelectWrapper');
  const newInputWrapper = document.getElementById('unitNewInputWrapper');
  const newUnitInput = document.getElementById('modalProdNewUnitName');
  const unitSelect = document.getElementById('modalProdUnit');

  if (selectWrapper) selectWrapper.style.display = 'none';
  if (newInputWrapper) newInputWrapper.style.display = 'block';
  if (unitSelect) unitSelect.value = '__new__';
  if (newUnitInput) {
    newUnitInput.focus();
  }
}

function cancelNewUnitInput() {
  if (State.units.length === 0) {
    showToast('প্রথমে একটি নতুন ইউনিটের নাম লিখুন।', 'info');
    return;
  }
  const selectWrapper = document.getElementById('unitSelectWrapper');
  const newInputWrapper = document.getElementById('unitNewInputWrapper');
  const unitSelect = document.getElementById('modalProdUnit');
  const newUnitInput = document.getElementById('modalProdNewUnitName');

  if (newInputWrapper) newInputWrapper.style.display = 'none';
  if (selectWrapper) selectWrapper.style.display = 'block';
  if (newUnitInput) newUnitInput.value = '';
  if (unitSelect && unitSelect.value === '__new__') {
    unitSelect.value = State.units[0].id;
  }
}

function onUnitSelectChange(val) {
  if (val === '__new__') {
    toggleNewUnitInput();
  }
}

function openProductModal(productId = null) {
  selectedImageFile = null;
  const fileInput = document.getElementById('modalProdImageFile');
  if (fileInput) fileInput.value = '';

  const modalTitle = document.getElementById('productModalTitle');
  const editIdInput = document.getElementById('editProductId');

  if (productId) {
    const p = State.products.find(item => item.id === productId);
    if (!p) return;
    modalTitle.textContent = '✏️ প্রোডাক্ট তথ্য পরিবর্তন (Edit)';
    editIdInput.value = p.id;
    document.getElementById('modalProdNameBn').value = p.nameBn;
    document.getElementById('modalProdSku').value = p.sku || '';
    populateModalCategories(p.category);
    populateModalUnits(p.unit);
    document.getElementById('modalProdCostPrice').value = p.costPrice || 0;
    document.getElementById('modalProdSellingPrice').value = p.sellingPrice;
    document.getElementById('modalProdStock').value = p.stock;
    document.getElementById('modalProdMinAlert').value = p.minStockAlert || 10;
    document.getElementById('modalProdImagePreset').value = p.image || '/assets/images/paint-black.svg';
    document.getElementById('modalProdImagePreview').src = p.image || '/assets/images/paint-black.svg';
  } else {
    modalTitle.textContent = '➕ নতুন প্রোডাক্ট যোগ করুন';
    editIdInput.value = '';
    document.getElementById('modalProdNameBn').value = '';
    document.getElementById('modalProdSku').value = '';
    populateModalCategories();
    populateModalUnits();
    document.getElementById('modalProdCostPrice').value = '';
    document.getElementById('modalProdSellingPrice').value = '';
    document.getElementById('modalProdStock').value = '';
    document.getElementById('modalProdMinAlert').value = '10';
    document.getElementById('modalProdImagePreview').src = '/assets/images/paint-black.svg';
  }

  document.getElementById('productModalBackdrop').classList.add('active');
}

function closeProductModal() {
  selectedImageFile = null;
  document.getElementById('productModalBackdrop').classList.remove('active');
}

async function saveProductForm() {
  const id = document.getElementById('editProductId').value;
  const nameBn = document.getElementById('modalProdNameBn').value.trim();
  const sku = document.getElementById('modalProdSku').value.trim();
  const costPrice = parseFloat(document.getElementById('modalProdCostPrice').value) || 0;
  const sellingPrice = parseFloat(document.getElementById('modalProdSellingPrice').value);
  const stock = parseFloat(document.getElementById('modalProdStock').value) || 0;
  const minStockAlert = parseFloat(document.getElementById('modalProdMinAlert').value) || 10;

  if (!nameBn || isNaN(sellingPrice)) {
    showToast('প্রোডাক্টের নাম এবং ফিক্সড বিক্রি দাম দিন!', 'error');
    return;
  }

  // Determine Category (Existing or Newly typed)
  let categoryId = '';
  const newInputWrapper = document.getElementById('categoryNewInputWrapper');
  const isNewInputActive = (newInputWrapper && newInputWrapper.style.display !== 'none');
  const catSelectVal = document.getElementById('modalProdCategory')?.value;
  const newCatName = document.getElementById('modalProdNewCategoryName')?.value.trim();

  if (isNewInputActive || catSelectVal === '__new__' || !catSelectVal) {
    if (!newCatName) {
      showToast('ক্যাটাগরির নাম লিখুন অথবা ড্রপডাউন থেকে সিলেক্ট করুন!', 'error');
      return;
    }

    // Check if category already exists in memory
    const existingCat = State.categories.find(c => c.nameBn.trim().toLowerCase() === newCatName.toLowerCase());
    if (existingCat) {
      categoryId = existingCat.id;
    } else {
      // Create new category via API
      try {
        const catRes = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nameBn: newCatName })
        });
        const catData = await catRes.json();
        if (catData.success && catData.category) {
          categoryId = catData.category.id;
          if (!State.categories.some(c => c.id === categoryId)) {
            State.categories.push(catData.category);
          }
          renderPosCategories();
        } else {
          showToast(catData.message || 'ক্যাটাগরি তৈরিতে ত্রুটি!', 'error');
          return;
        }
      } catch (catErr) {
        console.error('Error saving new category:', catErr);
        showToast('নতুন ক্যাটাগরি তৈরিতে ব্যর্থ!', 'error');
        return;
      }
    }
  } else {
    categoryId = catSelectVal;
  }

  if (!categoryId) {
    showToast('সঠিক ক্যাটাগরি নির্ধারণ করুন!', 'error');
    return;
  }

  // Determine Unit (Existing or Newly typed)
  let unitId = '';
  const unitNewWrapper = document.getElementById('unitNewInputWrapper');
  const isNewUnitActive = (unitNewWrapper && unitNewWrapper.style.display !== 'none');
  const unitSelectVal = document.getElementById('modalProdUnit')?.value;
  const newUnitName = document.getElementById('modalProdNewUnitName')?.value.trim();

  if (isNewUnitActive || unitSelectVal === '__new__' || !unitSelectVal) {
    if (!newUnitName) {
      showToast('ইউনিটের নাম লিখুন অথবা ড্রপডাউন থেকে সিলেক্ট করুন!', 'error');
      return;
    }

    const existingUnit = State.units.find(u => u.nameBn.trim().toLowerCase() === newUnitName.toLowerCase() || (u.symbolBn && u.symbolBn.trim().toLowerCase() === newUnitName.toLowerCase()));
    if (existingUnit) {
      unitId = existingUnit.id;
    } else {
      try {
        const unitRes = await fetch('/api/units', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nameBn: newUnitName, symbolBn: newUnitName })
        });
        const unitData = await unitRes.json();
        if (unitData.success && unitData.unit) {
          unitId = unitData.unit.id;
          if (!State.units.some(u => u.id === unitId)) {
            State.units.push(unitData.unit);
          }
          renderUnitsTable();
        } else {
          showToast(unitData.message || 'ইউনিট তৈরিতে ত্রুটি!', 'error');
          return;
        }
      } catch (unitErr) {
        console.error('Error saving new unit:', unitErr);
        showToast('নতুন ইউনিট তৈরিতে ব্যর্থ!', 'error');
        return;
      }
    }
  } else {
    unitId = unitSelectVal;
  }

  if (!unitId) {
    showToast('সঠিক পরিমাপের ইউনিট নির্ধারণ করুন!', 'error');
    return;
  }

  let finalImageUrl = document.getElementById('modalProdImagePreset').value || '/assets/images/paint-black.svg';

  // If a real image file was selected from device, upload it to the server
  if (selectedImageFile) {
    const formData = new FormData();
    formData.append('image', selectedImageFile);

    try {
      showToast('ছবি আপলোড হচ্ছে...', 'info');
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const uploadResult = await uploadRes.json();
      if (uploadResult.success && uploadResult.url) {
        finalImageUrl = uploadResult.url;
      }
    } catch (err) {
      console.error('Image upload failed, fallback to icon:', err);
    }
  } else if (id) {
    const currentProd = State.products.find(p => p.id === id);
    if (currentProd && currentProd.image) {
      const previewSrc = document.getElementById('modalProdImagePreview').getAttribute('src');
      if (previewSrc && previewSrc !== '/assets/images/paint-black.svg') {
        finalImageUrl = currentProd.image;
      }
    }
  }

  const payload = {
    nameBn,
    sku,
    category: categoryId,
    unit: unitId,
    costPrice,
    sellingPrice,
    stock,
    minStockAlert,
    image: finalImageUrl
  };

  try {
    const url = id ? `/api/products/${id}` : '/api/products';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.success) {
      showToast(result.message, 'success');
      closeProductModal();
      await loadUnits();
      await loadCategories();
      await loadProducts();
    } else {
      showToast(result.message, 'error');
    }
  } catch (err) {
    showToast('প্রোডাক্ট সংরক্ষণে ত্রুটি!', 'error');
  }
}

async function deleteProduct(productId) {
  const p = State.products.find(item => item.id === productId);
  if (!p) return;

  if (!confirm(`আপনি কি "${p.nameBn}" মুছে ফেলতে চান?`)) return;

  try {
    const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'info');
      loadProducts();
    } else {
      showToast(result.message, 'error');
    }
  } catch (err) {
    showToast('প্রোডাক্ট ডিলিটে সমস্যা!', 'error');
  }
}

// Quick Stock Adjustment
function openStockModal(productId = null) {
  const select = document.getElementById('quickStockProductId');
  select.innerHTML = State.products.map(p => `<option value="${p.id}">${p.nameBn} (${p.sku || ''})</option>`).join('');

  if (productId) {
    select.value = productId;
  }

  updateCurrentStockDisplay();
  document.getElementById('quickStockDelta').value = '';
  document.getElementById('quickStockReason').value = '';
  document.getElementById('stockModalBackdrop').classList.add('active');
}

function closeStockModal() {
  document.getElementById('stockModalBackdrop').classList.remove('active');
}

function updateCurrentStockDisplay() {
  const selId = document.getElementById('quickStockProductId').value;
  const p = State.products.find(item => item.id === selId);
  const display = document.getElementById('quickStockCurrentDisplay');
  if (p && display) {
    const unitObj = State.units.find(u => u.id === p.unit) || {};
    display.textContent = `${p.stock} ${unitObj.symbolBn || ''}`;
  }
}

async function submitQuickStock() {
  const productId = document.getElementById('quickStockProductId').value;
  const delta = parseFloat(document.getElementById('quickStockDelta').value);
  const reason = document.getElementById('quickStockReason').value.trim();

  if (isNaN(delta) || delta === 0) {
    showToast('স্টক পরিবর্তনের সঠিক পরিমাণ দিন (+ বা -)!', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/products/${productId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta, reason })
    });
    const result = await res.json();

    if (result.success) {
      showToast(result.message, 'success');
      closeStockModal();
      loadProducts();
    } else {
      showToast(result.message, 'error');
    }
  } catch (err) {
    showToast('স্টক আপডেটে ত্রুটি!', 'error');
  }
}

// Dynamic Units Table & Form
function renderUnitsTable() {
  const tbody = document.getElementById('unitsTableBody');
  if (!tbody) return;

  const isAdmin = State.currentUser.role === 'admin';

  tbody.innerHTML = State.units.map(unit => {
    let typeBn = 'গণনাযোগ্য (Count)';
    if (unit.type === 'volume') typeBn = 'তরল আয়তন (Volume)';
    if (unit.type === 'weight') typeBn = 'ওজন (Weight)';
    if (unit.type === 'length') typeBn = 'দৈর্ঘ্য / গজ (Length)';

    return `
      <tr>
        <td>
          <div style="font-weight:600;">${unit.nameBn}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${unit.description || ''}</div>
        </td>
        <td>
          <span class="table-chip">${unit.symbolBn}</span>
        </td>
        <td>${typeBn}</td>
        <td>
          ${unit.subUnitBn ? `১ ${unit.symbolBn} = ${unit.subRatio} ${unit.subUnitBn}` : '<span style="color:var(--text-muted);">-</span>'}
        </td>
        <td>
          <span style="color:${unit.allowDecimals ? 'var(--brand-success)' : 'var(--text-muted)'}; font-weight:600;">
            ${unit.allowDecimals ? '✓ অনুমোদিত' : '✕ পূর্ণ সংখ্যা'}
          </span>
        </td>
        <td>
          <div style="display:flex; gap:0.25rem; flex-wrap:wrap;">
            ${(unit.quickAmounts || []).map(a => `<span class="btn-fraction" style="cursor:default;">+${a}</span>`).join('')}
          </div>
        </td>
        <td class="admin-only" style="text-align:right; ${isAdmin ? '' : 'display:none;'}">
          <button class="btn-action-icon danger" title="ইউনিট মুছুন" onclick="deleteUnit('${unit.id}')">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

function openUnitModal() {
  document.getElementById('unitNameBn').value = '';
  document.getElementById('unitSymbolBn').value = '';
  document.getElementById('unitModalBackdrop').classList.add('active');
}

function closeUnitModal() {
  document.getElementById('unitModalBackdrop').classList.remove('active');
}

async function saveUnitForm() {
  const nameBn = document.getElementById('unitNameBn').value.trim();
  const symbolBn = document.getElementById('unitSymbolBn').value.trim();
  const type = document.getElementById('unitType').value;
  const allowDecimals = document.getElementById('unitAllowDecimals').value === 'true';

  if (!nameBn || !symbolBn) {
    showToast('ইউনিটের নাম এবং প্রতীক দিন!', 'error');
    return;
  }

  const payload = {
    nameBn,
    symbolBn,
    type,
    allowDecimals,
    quickAmounts: type === 'count' ? [1, 2, 5] : [0.5, 1, 2, 5]
  };

  try {
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      closeUnitModal();
      loadUnits();
    } else {
      showToast(result.message, 'error');
    }
  } catch (err) {
    showToast('ইউনিট তৈরিতে সমস্যা!', 'error');
  }
}

async function deleteUnit(unitId) {
  if (!confirm('আপনি কি এই ইউনিটটি মুছে ফেলতে চান?')) return;
  try {
    const res = await fetch(`/api/units/${unitId}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'info');
      loadUnits();
    } else {
      showToast(result.message, 'error');
    }
  } catch (err) {
    showToast('ইউনিট ডিলিটে সমস্যা!', 'error');
  }
}

// Sales History & Invoices
async function loadSalesHistory() {
  const dateVal = document.getElementById('salesDateFilter')?.value || '';
  try {
    const url = dateVal ? `/api/sales?date=${dateVal}` : '/api/sales';
    const res = await fetch(url, {
      headers: { 'x-user-role': State.currentUser.role }
    });
    const result = await res.json();
    if (result.success && result.sales) {
      State.sales = result.sales;
      renderSalesTable();
    }
  } catch (err) {
    console.error('Error loading sales:', err);
  }
}

function filterSalesTable(query) {
  renderSalesTable(query ? query.toLowerCase().trim() : '');
}

function renderSalesTable(query = '') {
  const tbody = document.getElementById('salesTableBody');
  const countText = document.getElementById('salesCountText');
  if (!tbody) return;

  let filtered = State.sales;
  if (query) {
    filtered = filtered.filter(s => 
      s.invoiceNumber.toLowerCase().includes(query) ||
      (s.customerName && s.customerName.toLowerCase().includes(query)) ||
      (s.customerPhone && s.customerPhone.includes(query))
    );
  }

  if (countText) countText.textContent = `মোট ${filtered.length} টি ইনভয়েস`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:1.5rem; color:var(--text-muted);">কোনো বিক্রয় রেকর্ড নেই।</td></tr>`;
    return;
  }

  const isAdmin = State.currentUser.role === 'admin';

  tbody.innerHTML = filtered.map(s => {
    const d = new Date(s.timestamp);
    const dateStr = `${d.toLocaleDateString('bn-BD')} ${d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}`;

    let methodBadge = 'নগদ';
    if (s.paymentMethod === 'bkash') methodBadge = 'বিকাশ';
    if (s.paymentMethod === 'nagad') methodBadge = 'নগদ';
    if (s.paymentMethod === 'due') methodBadge = 'বাকি';

    return `
      <tr>
        <td>
          <span style="font-family:var(--font-mono); font-weight:700; color:var(--brand-accent);">${s.invoiceNumber}</span>
        </td>
        <td>
          <span style="font-size:0.8rem; color:var(--text-muted);">${dateStr}</span>
        </td>
        <td>
          <div style="font-weight:600;">${s.customerName}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${s.customerPhone || ''}</div>
        </td>
        <td>
          <span>${s.items.length} টি</span>
        </td>
        <td>
          <span class="table-chip">${methodBadge}</span>
        </td>
        <td>
          <span style="font-family:var(--font-mono); font-weight:700; color:var(--brand-accent);">৳ ${s.grandTotal}</span>
        </td>
        <td class="admin-only" style="${isAdmin ? '' : 'display:none;'}">
          <span style="font-family:var(--font-mono); font-weight:700; color:var(--brand-success);">৳ ${s.netProfit || 0}</span>
        </td>
        <td style="text-align:right;">
          <button class="btn-action-icon" title="৫৮ মিমি মেমো প্রিন্ট করুন" onclick="reprintInvoice('${s.id}')">🖨️</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function reprintInvoice(invoiceId) {
  try {
    const res = await fetch(`/api/sales/${invoiceId}`, {
      headers: { 'x-user-role': State.currentUser.role }
    });
    const result = await res.json();
    if (result.success && result.invoice) {
      renderThermalReceipt(result.invoice);
      openReceiptModal();
    }
  } catch (err) {
    showToast('মেমো লোড করতে ব্যর্থ!', 'error');
  }
}

// Financial Analytics (Admin Only)
async function loadReportsData() {
  if (State.currentUser.role !== 'admin') return;

  try {
    const res = await fetch('/api/reports/dashboard');
    const result = await res.json();
    if (result.success && result.data) {
      const d = result.data;

      document.getElementById('statTotalRevenue').textContent = `৳ ${d.totalRevenue.toLocaleString('en-US')}`;
      document.getElementById('statTodayRevenue').textContent = `আজকের বিক্রি: ৳ ${d.today.revenue.toLocaleString('en-US')} (${d.today.count} টি মেমো)`;

      document.getElementById('statTotalProfit').textContent = `৳ ${d.totalNetProfit.toLocaleString('en-US')}`;
      document.getElementById('statProfitMargin').textContent = `মার্জিন: ${d.profitMarginPercent}%`;

      document.getElementById('statTotalCost').textContent = `৳ ${d.totalCost.toLocaleString('en-US')}`;
      document.getElementById('statTodayProfit').textContent = `আজকের লাভ: ৳ ${d.today.profit.toLocaleString('en-US')}`;

      document.getElementById('statTotalStockValue').textContent = `৳ ${d.inventory.totalStockSellValue.toLocaleString('en-US')}`;
      document.getElementById('statPotentialProfit').textContent = `সম্ভাব্য লাভ: ৳ ${d.inventory.potentialProfit.toLocaleString('en-US')}`;

      const topList = document.getElementById('topProductsList');
      if (topList) {
        if (d.topProducts.length === 0) {
          topList.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">এখনও বিক্রয় শুরু হয়নি।</p>';
        } else {
          const maxRev = d.topProducts[0].revenue || 1;
          topList.innerHTML = d.topProducts.map(p => {
            const pct = Math.round((p.revenue / maxRev) * 100);
            return `
              <div class="progress-bar-item">
                <div class="progress-label-row">
                  <span style="font-weight:600;">${p.nameBn}</span>
                  <span style="font-family:var(--font-mono); font-weight:700; color:var(--brand-accent);">৳ ${p.revenue} (${p.quantity} ${p.unitNameBn || ''})</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" style="width:${pct}%; background:var(--brand-primary);"></div>
                </div>
              </div>
            `;
          }).join('');
        }
      }

      const catList = document.getElementById('categorySalesList');
      if (catList) {
        if (d.categoryBreakdown.length === 0) {
          catList.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">কোনো বিক্রয় ডাটা নেই।</p>';
        } else {
          const totalCatRev = d.categoryBreakdown.reduce((acc, c) => acc + c.revenue, 0) || 1;
          catList.innerHTML = d.categoryBreakdown.map(c => {
            const pct = Math.round((c.revenue / totalCatRev) * 100);
            return `
              <div class="progress-bar-item">
                <div class="progress-label-row">
                  <span>${c.icon} ${c.nameBn}</span>
                  <span style="font-family:var(--font-mono); font-weight:700; color:var(--brand-accent);">${pct}% (৳ ${c.revenue})</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" style="width:${pct}%; background:var(--brand-accent);"></div>
                </div>
              </div>
            `;
          }).join('');
        }
      }
    }
  } catch (err) {
    console.error('Error loading reports dashboard:', err);
  }
}

// JSON Database Backup & Restore
async function handleRestoreDatabase() {
  const fileInput = document.getElementById('restoreFileInput');
  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('একটি .json ব্যাকআপ ফাইল সিলেক্ট করুন!', 'error');
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const dataToRestore = parsed.data ? parsed.data : parsed;

      if (!confirm('সতর্কতা: ব্যাকআপ ডাটা থেকে ডাটাবেজ পুনঃস্থাপন করা হবে। আপনি কি নিশ্চিত?')) {
        return;
      }

      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataToRestore })
      });
      const result = await res.json();

      if (result.success) {
        showToast(result.message, 'success');
        fileInput.value = '';
        loadSettings();
        loadCategories();
        loadUnits();
        loadProducts();
      } else {
        showToast(result.message, 'error');
      }
    } catch (err) {
      showToast('অবৈধ JSON ফাইল ফরম্যাট!', 'error');
    }
  };

  reader.readAsText(file);
}

// Store Settings
function populateSettingsForm() {
  const s = State.settings || {};
  document.getElementById('settingCompanyNameBn').value = s.companyNameBn || 'সিয়াম পেইন্টস্ এন্ড বার্নিশ কোং';
  document.getElementById('settingProprietorBn').value = s.proprietorBn || 'মোঃ শওকত আলী';
  document.getElementById('settingTinVat').value = s.tinVatNumber || '০০৫১০৪১৫৪-০৯০১';
  document.getElementById('settingAddressBn').value = s.addressBn || 'যশোর-খুলনা-বেনাপোল রোড, মোবারককাঠি, যশোর।';
  document.getElementById('settingPhone').value = s.phone || '০১৬৪১-৫১৮৬৬২ (সাকিব), ০১৬৪১-৫১৮৬৫৯ (শাউন), ০১৯২৪-৬৪৪৬০১ / ০১৭১৮-৯২৭৩০৪ (শওকত)';
  document.getElementById('settingCurrencyBn').value = s.currencyBn || '৳';

  if (s.thermalPrinter) {
    document.getElementById('settingFooterMessageBn').value = s.thermalPrinter.footerMessageBn || 'ধন্যবাদ, আবার আসবেন!';
    document.getElementById('settingFooterSubBn').value = s.thermalPrinter.footerSubBn || 'বিক্রিত মাল ফেরত নেওয়া হয় না, তবে পরিবর্তনের সুযোগ রয়েছে।';
  }
}

async function saveStoreSettings() {
  const payload = {
    companyNameBn: document.getElementById('settingCompanyNameBn').value.trim(),
    proprietorBn: document.getElementById('settingProprietorBn').value.trim(),
    tinVatNumber: document.getElementById('settingTinVat').value.trim(),
    addressBn: document.getElementById('settingAddressBn').value.trim(),
    phone: document.getElementById('settingPhone').value.trim(),
    currencyBn: document.getElementById('settingCurrencyBn').value.trim() || '৳',
    thermalPrinter: {
      paperWidth: '58mm',
      footerMessageBn: document.getElementById('settingFooterMessageBn').value.trim(),
      footerSubBn: document.getElementById('settingFooterSubBn').value.trim(),
      showBarcode: true
    }
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      State.settings = result.settings;
      showToast(result.message, 'success');
    }
  } catch (err) {
    showToast('সেটিংস সংরক্ষণে সমস্যা!', 'error');
  }
}

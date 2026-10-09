const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('./data_manager');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup upload folder
const UPLOADS_DIR = path.join(__dirname, 'public', 'assets', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `paint_${Date.now()}_${Math.round(Math.random() * 1e5)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static frontend serving
app.use(express.static(path.join(__dirname, 'public')));

// Helper for formatting invoice number
function generateInvoiceNumber(salesCount) {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(salesCount + 1001).padStart(4, '0');
  return `SPF-${seq}`;
}

// -------------------------------------------------------------
// AUTH & USERS
// -------------------------------------------------------------
app.get('/api/auth/users', (req, res) => {
  const users = db.readJSON('users');
  const sanitized = users.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    avatar: u.avatar
  }));
  res.json({ success: true, users: sanitized });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'ইউজারনেম এবং পাসওয়ার্ড প্রদান করুন।' });
  }

  const users = db.readJSON('users');
  const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password.trim());

  if (!user) {
    return res.status(401).json({ success: false, message: 'ভুল ইউজারনেম অথবা পাসওয়ার্ড!' });
  }

  res.json({
    success: true,
    message: 'সফলভাবে লগইন হয়েছে!',
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      avatar: user.avatar
    }
  });
});

// -------------------------------------------------------------
// SETTINGS
// -------------------------------------------------------------
app.get('/api/settings', (req, res) => {
  const settings = db.readJSON('settings');
  res.json({ success: true, settings: settings || db.DEFAULT_SETTINGS });
});

app.put('/api/settings', (req, res) => {
  const newSettings = req.body;
  const current = db.readJSON('settings');
  const updated = { ...current, ...newSettings };
  db.writeJSON('settings', updated);
  res.json({ success: true, message: 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে।', settings: updated });
});

// -------------------------------------------------------------
// Helper to pick category icon based on name
function detectCategoryIcon(name) {
  if (!name) return '🏷️';
  const n = name.toLowerCase();
  if (n.includes('অক্সাইড') || n.includes('oxide') || n.includes('রেড') || n.includes('red')) return '🔴';
  if (n.includes('বার্নিশ') || n.includes('varnish') || n.includes('উড')) return '🪵';
  if (n.includes('গালা') || n.includes('gala')) return '🪓';
  if (n.includes('রজন') || n.includes('resin')) return '✨';
  if (n.includes('তারপিন') || n.includes('turpentine')) return '🧪';
  if (n.includes('থিনার') || n.includes('thinner') || n.includes('স্প্রীট') || n.includes('spirit')) return '🛢️';
  if (n.includes('চক') || n.includes('পাউডার') || n.includes('মাটি') || n.includes('chalk') || n.includes('putty')) return '🧱';
  if (n.includes('কাপড়') || n.includes('মার্কিন') || n.includes('cloth')) return '🧵';
  if (n.includes('ওয়াসার') || n.includes('নাট') || n.includes('হার্ডওয়্যার') || n.includes('washer') || n.includes('hardware')) return '⚙️';
  if (n.includes('ভিক্সল') || n.includes('ড্যাম্প') || n.includes('vixol') || n.includes('damp')) return '🛡️';
  if (n.includes('রং') || n.includes('পেইন্ট') || n.includes('paint') || n.includes('color')) return '🎨';
  if (n.includes('ব্রাশ') || n.includes('রোলার') || n.includes('brush')) return '🖌️';
  return '🏷️';
}

app.get('/api/categories', (req, res) => {
  const categories = db.readJSON('categories') || [];
  res.json({ success: true, categories });
});

app.post('/api/categories', (req, res) => {
  const { nameBn, icon, color } = req.body;
  if (!nameBn || !nameBn.trim()) {
    return res.status(400).json({ success: false, message: 'ক্যাটাগরির নাম দিন।' });
  }
  const cleanName = nameBn.trim();
  const categories = db.readJSON('categories') || [];
  
  // Check if exists
  const existing = categories.find(c => c.nameBn.trim().toLowerCase() === cleanName.toLowerCase());
  if (existing) {
    return res.json({ success: true, message: 'ক্যাটাগরি ইতিমধ্যে বিদ্যমান রয়েছে।', category: existing });
  }

  const id = 'cat_' + Date.now();
  const chosenIcon = icon || detectCategoryIcon(cleanName);
  const newCat = { id, nameBn: cleanName, icon: chosenIcon, color: color || '#4f46e5' };
  categories.push(newCat);
  db.writeJSON('categories', categories);
  res.json({ success: true, message: 'নতুন ক্যাটাগরি যুক্ত হয়েছে।', category: newCat });
});

app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  if (id === 'all') {
    return res.status(400).json({ success: false, message: 'এই ক্যাটাগরি মুছে ফেলা যাবে না।' });
  }
  let categories = db.readJSON('categories') || [];
  categories = categories.filter(c => c.id !== id);
  db.writeJSON('categories', categories);
  res.json({ success: true, message: 'ক্যাটাগরি মুছে ফেলা হয়েছে।' });
});

// -------------------------------------------------------------
// DYNAMIC UNITS
// -------------------------------------------------------------
app.get('/api/units', (req, res) => {
  const units = db.readJSON('units');
  res.json({ success: true, units });
});

app.post('/api/units', (req, res) => {
  const { nameBn, nameEn, symbolBn, symbolEn, type, subUnitBn, subUnitEn, subRatio, allowDecimals, quickAmounts, description } = req.body;
  if (!nameBn || !nameBn.trim()) {
    return res.status(400).json({ success: false, message: 'ইউনিটের নাম দিন।' });
  }
  const cleanName = nameBn.trim();
  const cleanSymbol = (symbolBn || cleanName).trim();
  const units = db.readJSON('units') || [];
  
  // Check duplicate
  const existing = units.find(u => 
    u.nameBn.trim().toLowerCase() === cleanName.toLowerCase() ||
    (u.symbolBn && u.symbolBn.trim().toLowerCase() === cleanSymbol.toLowerCase())
  );
  if (existing) {
    return res.json({ success: true, message: 'ইউনিট ইতিমধ্যে বিদ্যমান রয়েছে।', unit: existing });
  }

  const id = (nameEn ? nameEn.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'unit_' + Date.now());
  const newUnit = {
    id,
    nameBn: cleanName,
    nameEn: nameEn || cleanName,
    symbolBn: cleanSymbol,
    symbolEn: symbolEn || cleanSymbol,
    type: type || 'count',
    subUnitBn: subUnitBn || '',
    subUnitEn: subUnitEn || '',
    subRatio: Number(subRatio) || 1,
    allowDecimals: allowDecimals !== undefined ? allowDecimals : true,
    quickAmounts: Array.isArray(quickAmounts) && quickAmounts.length > 0 ? quickAmounts : [1, 2, 5],
    description: description || ''
  };

  units.push(newUnit);
  db.writeJSON('units', units);
  res.json({ success: true, message: 'নতুন ইউনিট সফলভাবে যুক্ত হয়েছে।', unit: newUnit });
});

app.put('/api/units/:id', (req, res) => {
  const { id } = req.params;
  const units = db.readJSON('units');
  const idx = units.findIndex(u => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'ইউনিট খুঁজে পাওয়া যায়নি।' });
  }

  units[idx] = { ...units[idx], ...req.body, id };
  db.writeJSON('units', units);
  res.json({ success: true, message: 'ইউনিট আপডেট হয়েছে।', unit: units[idx] });
});

app.delete('/api/units/:id', (req, res) => {
  const { id } = req.params;
  const units = db.readJSON('units');
  const products = db.readJSON('products');

  // Check if unit is in use
  if (products.some(p => p.unit === id)) {
    return res.status(400).json({ success: false, message: 'এই ইউনিটটি প্রোডাক্টে ব্যবহৃত হচ্ছে, তাই মুছে ফেলা যাবে না।' });
  }

  const filtered = units.filter(u => u.id !== id);
  db.writeJSON('units', filtered);
  res.json({ success: true, message: 'ইউনিট মুছে ফেলা হয়েছে।' });
});

// -------------------------------------------------------------
// PRODUCTS
// -------------------------------------------------------------
app.get('/api/products', (req, res) => {
  const role = req.headers['x-user-role'] || 'cashier';
  const products = db.readJSON('products');

  // Security: Cashier cannot see costPrice if requested
  const sanitized = products.map(p => {
    if (role === 'admin') return p;
    const { costPrice, ...publicInfo } = p;
    return publicInfo;
  });

  res.json({ success: true, products: sanitized });
});

app.post('/api/products', (req, res) => {
  const { nameBn, nameEn, sku, category, unit, costPrice, sellingPrice, stock, minStockAlert, image, description } = req.body;
  if (!nameBn || !unit || sellingPrice === undefined) {
    return res.status(400).json({ success: false, message: 'প্রোডাক্টের নাম, ইউনিট এবং বিক্রয়মূল্য বাধ্যতামূলক।' });
  }

  const products = db.readJSON('products');
  const newId = 'prod_' + Date.now();
  const autoSku = sku && sku.trim() ? sku.trim().toUpperCase() : `SPF-${Date.now().toString().slice(-4)}`;

  const newProduct = {
    id: newId,
    sku: autoSku,
    nameBn: nameBn.trim(),
    nameEn: nameEn ? nameEn.trim() : '',
    category: category || 'paint',
    unit: unit,
    costPrice: Number(costPrice) || 0,
    sellingPrice: Number(sellingPrice) || 0,
    stock: Number(stock) || 0,
    minStockAlert: Number(minStockAlert) || 10,
    image: image || '/assets/images/varnish.svg',
    description: description || ''
  };

  products.push(newProduct);
  db.writeJSON('products', products);
  res.json({ success: true, message: 'নতুন প্রোডাক্ট সফলভাবে যুক্ত হয়েছে।', product: newProduct });
});

app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const products = db.readJSON('products');
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'প্রোডাক্ট পাওয়া যায়নি।' });
  }

  const updatedProduct = {
    ...products[idx],
    ...req.body,
    costPrice: req.body.costPrice !== undefined ? Number(req.body.costPrice) : products[idx].costPrice,
    sellingPrice: req.body.sellingPrice !== undefined ? Number(req.body.sellingPrice) : products[idx].sellingPrice,
    stock: req.body.stock !== undefined ? Number(req.body.stock) : products[idx].stock,
    minStockAlert: req.body.minStockAlert !== undefined ? Number(req.body.minStockAlert) : products[idx].minStockAlert,
    id
  };

  products[idx] = updatedProduct;
  db.writeJSON('products', products);
  res.json({ success: true, message: 'প্রোডাক্ট সফলভাবে আপডেট হয়েছে।', product: updatedProduct });
});

app.patch('/api/products/:id/stock', (req, res) => {
  const { id } = req.params;
  const { delta, newStock, reason } = req.body;
  const products = db.readJSON('products');
  const idx = products.findIndex(p => p.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'প্রোডাক্ট পাওয়া যায়নি।' });
  }

  let finalStock = products[idx].stock;
  if (newStock !== undefined) {
    finalStock = Number(newStock);
  } else if (delta !== undefined) {
    finalStock = Math.max(0, finalStock + Number(delta));
  }

  products[idx].stock = Number(finalStock.toFixed(3));
  db.writeJSON('products', products);

  res.json({
    success: true,
    message: 'স্টক সফলভাবে আপডেট করা হয়েছে।',
    product: products[idx],
    reason: reason || 'ম্যানুয়াল স্টক এডজাস্টমেন্ট'
  });
});

app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const products = db.readJSON('products');
  const filtered = products.filter(p => p.id !== id);
  if (filtered.length === products.length) {
    return res.status(404).json({ success: false, message: 'প্রোডাক্ট খুঁজে পাওয়া যায়নি।' });
  }

  db.writeJSON('products', filtered);
  res.json({ success: true, message: 'প্রোডাক্ট ডিলিট করা হয়েছে।' });
});

// Image upload
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'কোনো ইমেজ ফাইল পাওয়া যায়নি।' });
  }
  const fileUrl = `/assets/uploads/${req.file.filename}`;
  res.json({ success: true, message: 'ইমেজ সফলভাবে আপলোড হয়েছে।', url: fileUrl });
});

// -------------------------------------------------------------
// SALES & POS TRANSACTION (WITH ATOMIC STOCK DEDUCTION)
// -------------------------------------------------------------
app.post('/api/sales', (req, res) => {
  const { items, customerName, customerPhone, cashierId, cashierName, paymentMethod, discount, paidAmount, notes } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'কার্ট খালি! অন্তত একটি প্রোডাক্ট যোগ করুন।' });
  }

  const products = db.readJSON('products');
  const sales = db.readJSON('sales');
  const units = db.readJSON('units');

  // Verify stock & calculate totals safely
  const processedItems = [];
  let subtotal = 0;
  let totalCost = 0;

  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(400).json({ success: false, message: `প্রোডাক্ট আইডি ${item.productId} ডাটাবেজে পাওয়া যায়নি!` });
    }

    const qty = Number(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: `অবৈধ পরিমাণ: ${product.nameBn}` });
    }

    if (product.stock < qty) {
      return res.status(400).json({
        success: false,
        message: `পর্যাপ্ত স্টক নেই! "${product.nameBn}" এর বর্তমান স্টক ${product.stock}, চাওয়া হয়েছে ${qty}`
      });
    }

    // FIXED PRICE PROTECTION: Always use DB selling price and cost price
    const unitRate = product.sellingPrice;
    const itemCostRate = product.costPrice || 0;
    const lineTotal = Number((qty * unitRate).toFixed(2));
    const lineCost = Number((qty * itemCostRate).toFixed(2));

    subtotal += lineTotal;
    totalCost += lineCost;

    const unitObj = units.find(u => u.id === product.unit) || {};

    processedItems.push({
      productId: product.id,
      sku: product.sku,
      nameBn: product.nameBn,
      unit: product.unit,
      unitNameBn: unitObj.nameBn ? unitObj.nameBn.split(' ')[0] : product.unit,
      unitSymbolBn: unitObj.symbolBn || '',
      unitRate: unitRate,
      costPrice: itemCostRate,
      quantity: qty,
      totalPrice: lineTotal,
      totalCost: lineCost
    });
  }

  // Calculate final numbers
  const discountVal = Math.max(0, Number(discount) || 0);
  const grandTotal = Math.max(0, Number((subtotal - discountVal).toFixed(2)));
  const paidVal = paidAmount !== undefined ? Number(paidAmount) : grandTotal;
  const changeVal = Math.max(0, Number((paidVal - grandTotal).toFixed(2)));
  const dueVal = Math.max(0, Number((grandTotal - paidVal).toFixed(2)));
  const netProfit = Number((grandTotal - totalCost).toFixed(2));

  // ATOMIC STOCK DEDUCTION
  for (const pItem of processedItems) {
    const pIndex = products.findIndex(p => p.id === pItem.productId);
    if (pIndex !== -1) {
      products[pIndex].stock = Number((products[pIndex].stock - pItem.quantity).toFixed(3));
    }
  }

  // Save updated products stock
  db.writeJSON('products', products);

  // Generate Invoice
  const invoiceId = `INV-${Date.now()}`;
  const invoiceNumber = generateInvoiceNumber(sales.length);

  const saleRecord = {
    id: invoiceId,
    invoiceNumber,
    timestamp: new Date().toISOString(),
    customerName: customerName ? customerName.trim() : 'নগদ ক্রেতা (Walk-in Customer)',
    customerPhone: customerPhone ? customerPhone.trim() : '',
    cashierId: cashierId || 'usr_cashier',
    cashierName: cashierName || 'ক্যাশিয়ার',
    items: processedItems,
    subtotal: Number(subtotal.toFixed(2)),
    discount: discountVal,
    grandTotal,
    totalCost: Number(totalCost.toFixed(2)),
    netProfit,
    paidAmount: paidVal,
    changeAmount: changeVal,
    dueAmount: dueVal,
    paymentMethod: paymentMethod || 'cash',
    notes: notes || ''
  };

  sales.unshift(saleRecord); // Newest first
  db.writeJSON('sales', sales);

  res.json({
    success: true,
    message: 'বিক্রয় সফলভাবে সম্পন্ন হয়েছে ও স্টক মাইনাস হয়েছে!',
    invoice: saleRecord
  });
});

app.get('/api/sales', (req, res) => {
  const role = req.headers['x-user-role'] || 'cashier';
  const { date, search, limit = 100 } = req.query;
  const sales = db.readJSON('sales');

  let filtered = sales;

  if (date) {
    filtered = filtered.filter(s => s.timestamp.startsWith(date));
  }

  if (search) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(s => 
      s.invoiceNumber.toLowerCase().includes(q) ||
      (s.customerName && s.customerName.toLowerCase().includes(q)) ||
      (s.customerPhone && s.customerPhone.includes(q))
    );
  }

  filtered = filtered.slice(0, Number(limit));

  // Sanitize if cashier: hide profit and cost
  const sanitized = filtered.map(s => {
    if (role === 'admin') return s;
    const { totalCost, netProfit, items, ...rest } = s;
    const publicItems = items.map(it => {
      const { costPrice, totalCost: tc, ...itemPublic } = it;
      return itemPublic;
    });
    return { ...rest, items: publicItems };
  });

  res.json({ success: true, sales: sanitized, totalCount: filtered.length });
});

app.get('/api/sales/:id', (req, res) => {
  const role = req.headers['x-user-role'] || 'cashier';
  const { id } = req.params;
  const sales = db.readJSON('sales');
  const sale = sales.find(s => s.id === id || s.invoiceNumber === id);

  if (!sale) {
    return res.status(404).json({ success: false, message: 'মেমো বা ইনভয়েস খুঁজে পাওয়া যায়নি।' });
  }

  if (role === 'admin') {
    return res.json({ success: true, invoice: sale });
  }

  const { totalCost, netProfit, items, ...rest } = sale;
  const publicItems = items.map(it => {
    const { costPrice, totalCost: tc, ...itemPublic } = it;
    return itemPublic;
  });

  res.json({ success: true, invoice: { ...rest, items: publicItems } });
});

// -------------------------------------------------------------
// FINANCIAL REPORTS & ANALYTICS (ADMIN ONLY)
// -------------------------------------------------------------
app.get('/api/reports/dashboard', (req, res) => {
  const products = db.readJSON('products');
  const sales = db.readJSON('sales');
  const categories = db.readJSON('categories');

  const todayStr = new Date().toISOString().slice(0, 10);
  const thisMonthStr = new Date().toISOString().slice(0, 7);

  let totalRevenue = 0;
  let totalCost = 0;
  let totalNetProfit = 0;
  let todaySalesCount = 0;
  let todayRevenue = 0;
  let todayProfit = 0;
  let monthRevenue = 0;
  let monthProfit = 0;

  const itemSalesMap = {};
  const categorySalesMap = {};

  sales.forEach(sale => {
    totalRevenue += sale.grandTotal || 0;
    totalCost += sale.totalCost || 0;
    totalNetProfit += sale.netProfit || 0;

    const isToday = sale.timestamp && sale.timestamp.startsWith(todayStr);
    const isThisMonth = sale.timestamp && sale.timestamp.startsWith(thisMonthStr);

    if (isToday) {
      todaySalesCount++;
      todayRevenue += sale.grandTotal || 0;
      todayProfit += sale.netProfit || 0;
    }

    if (isThisMonth) {
      monthRevenue += sale.grandTotal || 0;
      monthProfit += sale.netProfit || 0;
    }

    // Process items
    (sale.items || []).forEach(item => {
      // Top items
      if (!itemSalesMap[item.productId]) {
        itemSalesMap[item.productId] = {
          nameBn: item.nameBn,
          unitNameBn: item.unitNameBn,
          quantity: 0,
          revenue: 0
        };
      }
      itemSalesMap[item.productId].quantity += item.quantity;
      itemSalesMap[item.productId].revenue += item.totalPrice;

      // Category breakdown
      const prod = products.find(p => p.id === item.productId);
      const catId = prod ? prod.category : 'other';
      if (!categorySalesMap[catId]) {
        categorySalesMap[catId] = 0;
      }
      categorySalesMap[catId] += item.totalPrice;
    });
  });

  // Low stock products
  const lowStockProducts = products.filter(p => p.stock <= (p.minStockAlert || 10));

  // Inventory valuation
  let totalStockCostValue = 0;
  let totalStockSellValue = 0;
  products.forEach(p => {
    totalStockCostValue += (p.costPrice || 0) * (p.stock || 0);
    totalStockSellValue += (p.sellingPrice || 0) * (p.stock || 0);
  });

  // Top selling products sorted
  const topProducts = Object.values(itemSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Category sales with names
  const categoryBreakdown = Object.keys(categorySalesMap).map(catId => {
    const cat = categories.find(c => c.id === catId);
    return {
      categoryId: catId,
      nameBn: cat ? cat.nameBn : catId,
      icon: cat ? cat.icon : '📦',
      color: cat ? cat.color : '#64748b',
      revenue: Number(categorySalesMap[catId].toFixed(2))
    };
  });

  res.json({
    success: true,
    data: {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      totalNetProfit: Number(totalNetProfit.toFixed(2)),
      profitMarginPercent: totalRevenue > 0 ? Number(((totalNetProfit / totalRevenue) * 100).toFixed(1)) : 0,
      today: {
        count: todaySalesCount,
        revenue: Number(todayRevenue.toFixed(2)),
        profit: Number(todayProfit.toFixed(2))
      },
      thisMonth: {
        revenue: Number(monthRevenue.toFixed(2)),
        profit: Number(monthProfit.toFixed(2))
      },
      inventory: {
        totalItemsCount: products.length,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        totalStockCostValue: Number(totalStockCostValue.toFixed(2)),
        totalStockSellValue: Number(totalStockSellValue.toFixed(2)),
        potentialProfit: Number((totalStockSellValue - totalStockCostValue).toFixed(2))
      },
      topProducts,
      categoryBreakdown
    }
  });
});

// -------------------------------------------------------------
// 1-CLICK JSON DATABASE BACKUP & RESTORE
// -------------------------------------------------------------
app.get('/api/backup/export', (req, res) => {
  const exportData = {
    appName: 'সিয়াম পেইন্ট এন্ড ফার্নিশ কোম্পানি - Web POS & Inventory System',
    backupDate: new Date().toISOString(),
    version: '1.0.0',
    data: {
      users: db.readJSON('users'),
      products: db.readJSON('products'),
      units: db.readJSON('units'),
      categories: db.readJSON('categories'),
      sales: db.readJSON('sales'),
      settings: db.readJSON('settings')
    }
  };

  const filename = `SiamPaint_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(exportData, null, 2));
});

app.get('/api/backup/raw/:fileKey', (req, res) => {
  const { fileKey } = req.params;
  if (!db.FILES[fileKey]) {
    return res.status(404).json({ success: false, message: 'ফাইল খুঁজে পাওয়া যায়নি।' });
  }
  const data = db.readJSON(fileKey);
  const filename = `${fileKey}_${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(data, null, 2));
});

app.post('/api/backup/restore', (req, res) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ success: false, message: 'অবৈধ ব্যাকআপ ডাটা ফরম্যাট!' });
  }

  // Restore provided collections
  const keys = ['users', 'products', 'units', 'categories', 'sales', 'settings'];
  let restoredCount = 0;

  keys.forEach(key => {
    if (data[key] !== undefined) {
      db.writeJSON(key, data[key]);
      restoredCount++;
    }
  });

  res.json({
    success: true,
    message: `ডাটাবেজ সফলভাবে রিস্টোর হয়েছে (${restoredCount} টি টেবিল)।`
  });
});

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` 🎨 সিয়াম পেইন্ট এন্ড ফার্নিশ কোম্পানি - Web POS & Inventory`);
  console.log(` 🚀 Server is running on: http://localhost:${PORT}`);
  console.log(` 📂 JSON Database Engine: Active in ./data/`);
  console.log(`=======================================================`);
});

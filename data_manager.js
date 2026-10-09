const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  products: path.join(DATA_DIR, 'products.json'),
  units: path.join(DATA_DIR, 'units.json'),
  categories: path.join(DATA_DIR, 'categories.json'),
  sales: path.join(DATA_DIR, 'sales.json'),
  settings: path.join(DATA_DIR, 'settings.json'),
};

// Units List
const DEFAULT_UNITS = [
  {
    id: 'kg',
    nameBn: 'কেজি (Kg)',
    nameEn: 'Kilogram',
    symbolBn: 'কেজি',
    symbolEn: 'kg',
    type: 'weight',
    subUnitBn: 'গ্রাম',
    subUnitEn: 'g',
    subRatio: 1000,
    allowDecimals: true,
    quickAmounts: [0.1, 0.25, 0.5, 1, 2, 5, 10],
    description: 'অক্সাইড, গালা, চক পাউডার, রজন, মোম ইত্যাদি'
  },
  {
    id: 'gram',
    nameBn: 'গ্রাম (Gram)',
    nameEn: 'Gram',
    symbolBn: 'গ্রাম',
    symbolEn: 'g',
    type: 'weight',
    allowDecimals: false,
    quickAmounts: [50, 100, 250, 500],
    description: 'খুচরা শুকনো রঙ ও পিগমেন্ট'
  },
  {
    id: 'litre',
    nameBn: 'লিটার (Litre)',
    nameEn: 'Litre',
    symbolBn: 'লি.',
    symbolEn: 'L',
    type: 'volume',
    subUnitBn: 'মি.লি.',
    subUnitEn: 'ml',
    subRatio: 1000,
    allowDecimals: true,
    quickAmounts: [0.1, 0.25, 0.5, 1, 1.5, 2, 5],
    description: 'বার্নিশ, স্প্রীট, তারপিন, N.C থিনার ইত্যাদি'
  },
  {
    id: 'ml',
    nameBn: 'মিলি (ML / Millilitre)',
    nameEn: 'Millilitre',
    symbolBn: 'মি.লি.',
    symbolEn: 'ml',
    type: 'volume',
    allowDecimals: false,
    quickAmounts: [100, 250, 500],
    description: 'ছোট তারপিন বা স্পিরিটের বোতল'
  },
  {
    id: 'yard',
    nameBn: 'গজ (Yard)',
    nameEn: 'Yard',
    symbolBn: 'গজ',
    symbolEn: 'Yd',
    type: 'length',
    allowDecimals: true,
    quickAmounts: [0.5, 1, 2, 3, 5, 10],
    description: 'মার্কিন কাপড় ও ফেব্রিক'
  },
  {
    id: 'ounce',
    nameBn: 'আউন্স (Ounce / Oz)',
    nameEn: 'Ounce',
    symbolBn: 'আউন্স',
    symbolEn: 'oz',
    type: 'count',
    allowDecimals: false,
    quickAmounts: [1, 2, 4, 6, 12],
    description: 'রং ২ আউন্স / ৪ আউন্স শিশি'
  },
  {
    id: 'pcs',
    nameBn: 'পিস (Pcs / Unit)',
    nameEn: 'Pieces',
    symbolBn: 'পিস',
    symbolEn: 'Pcs',
    type: 'count',
    allowDecimals: false,
    quickAmounts: [1, 2, 3, 5, 10, 20],
    description: 'ওয়াসার, ফ্রেম চক, খবনি রং, কার্ফা'
  },
  {
    id: 'can',
    nameBn: 'ক্যান (Can / Drum)',
    nameEn: 'Can',
    symbolBn: 'ক্যান',
    symbolEn: 'Can',
    type: 'count',
    allowDecimals: false,
    quickAmounts: [1, 2, 3, 5],
    description: 'ভিক্সল / ড্যাম্প ও সিল করা ক্যান'
  },
  {
    id: 'sack_25kg',
    nameBn: 'বস্তা (২৫ কেজি)',
    nameEn: 'Sack (25 Kg)',
    symbolBn: 'বস্তা',
    symbolEn: 'Sack',
    type: 'bulk_weight',
    subUnitBn: 'কেজি',
    subUnitEn: 'kg',
    subRatio: 25,
    allowDecimals: true,
    quickAmounts: [0.2, 0.4, 0.5, 1, 2, 5],
    description: 'চক পাউডার, এলামাটি, জিপসাম ২৫ কেজির বস্তা (১ বস্তা = ২৫ কেজি)'
  },
  {
    id: 'sack_50kg',
    nameBn: 'বস্তা (৫০ কেজি)',
    nameEn: 'Sack (50 Kg)',
    symbolBn: 'বস্তা',
    symbolEn: 'Sack',
    type: 'bulk_weight',
    subUnitBn: 'কেজি',
    subUnitEn: 'kg',
    subRatio: 50,
    allowDecimals: true,
    quickAmounts: [0.1, 0.2, 0.5, 1, 2],
    description: '৫০ কেজির বড় বস্তা (১ বস্তা = ৫০ কেজি)'
  },
  {
    id: 'sack',
    nameBn: 'বস্তা (সাধারণ)',
    nameEn: 'Sack (General)',
    symbolBn: 'বস্তা',
    symbolEn: 'Sack',
    type: 'bulk_weight',
    subUnitBn: 'কেজি',
    subUnitEn: 'kg',
    subRatio: 25,
    allowDecimals: true,
    quickAmounts: [0.2, 0.5, 1, 2, 5],
    description: 'সাধারণ বস্তা (খুচরা ও পাইকারি বিক্রি)'
  }
];

// Clean Dynamic Paint Categories
const DEFAULT_CATEGORIES = [
  { id: 'all', nameBn: 'সকল প্রোডাক্ট', icon: '🎨', color: '#2563eb' }
];

// Company Profile & Settings
const DEFAULT_SETTINGS = {
  companyNameBn: 'সিয়াম পেইন্টস্ এন্ড বার্নিশ কোং',
  companyNameEn: 'Siam Paints & Varnish Co.',
  proprietorBn: 'মোঃ শওকত আলী',
  tinVatNumber: '০০৫১০৪১৫৪-০৯০১',
  addressBn: 'যশোর-খুলনা-বেনাপোল রোড, মোবারককাঠি, যশোর।',
  phone: '০১৬৪১-৫১৮৬৬২ (সাকিব), ০১৬৪১-৫১৮৬৫৯ (শাউন), ০১৯২৪-৬৪৪৬০১ / ০১৭১৮-৯২৭৩০৪ (শওকত)',
  phoneShort: '০১৬৪১-৫১৮৬৬২, ০১৬৪১-৫১৮৬৫৯, ০১৯২৪-৬৪৪৬০১, ০১৭১৮-৯২৭৩০৪',
  email: 'siampaint.jashore@gmail.com',
  currencyBn: '৳',
  currencyEn: 'Tk',
  thermalPrinter: {
    paperWidth: '58mm',
    headerTitle: 'সিয়াম পেইন্টস্ এন্ড বার্নিশ কোং',
    footerMessageBn: 'ধন্যবাদ, আবার আসবেন!',
    footerSubBn: 'বিক্রিত মাল ফেরত নেওয়া হয় না, তবে পরিবর্তনের সুযোগ রয়েছে।',
    showBarcode: true,
    showQr: false,
    autoPrintOnSale: false
  },
  vatPercent: 0,
  allowCashierDiscount: true
};

const DEFAULT_USERS = [
  {
    id: 'usr_admin',
    username: 'admin',
    password: 'admin123',
    name: 'মোঃ শওকত আলী (মালিক/এডমিন)',
    role: 'admin',
    avatar: '👨‍💼',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_cashier',
    username: 'cashier',
    password: '1234',
    name: 'সাকিব / শাউন (ক্যাশিয়ার)',
    role: 'cashier',
    avatar: '🧑‍💻',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

// Clean Products & Sales (0 Products, completely empty as requested)
const DEFAULT_PRODUCTS = [];
const DEFAULT_SALES = [];

// Helper to safely read JSON
function readJSON(fileKey) {
  const filePath = FILES[fileKey];
  try {
    if (!fs.existsSync(filePath)) {
      initializeDefaults(fileKey, true);
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading ${fileKey} JSON file:`, err);
    return [];
  }
}

// Helper to safely and atomically write JSON
function writeJSON(fileKey, data) {
  const filePath = FILES[fileKey];
  const tempPath = `${filePath}.tmp_${Date.now()}`;
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, jsonStr, 'utf8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (err) {
    console.error(`Error writing ${fileKey} JSON file:`, err);
    if (fs.existsSync(tempPath)) {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
    return false;
  }
}

function initializeDefaults(specificKey = null, force = false) {
  const seeds = {
    users: DEFAULT_USERS,
    products: DEFAULT_PRODUCTS,
    units: DEFAULT_UNITS,
    categories: DEFAULT_CATEGORIES,
    sales: DEFAULT_SALES,
    settings: DEFAULT_SETTINGS,
  };

  const keysToInit = specificKey ? [specificKey] : Object.keys(FILES);

  keysToInit.forEach((key) => {
    const filePath = FILES[key];
    if (force || !fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(seeds[key] || [], null, 2), 'utf8');
      console.log(`[DB] Initialized fresh ${key}.json.`);
    }
  });
}

// Initialize clean empty products and sales
initializeDefaults(null, true);

module.exports = {
  FILES,
  readJSON,
  writeJSON,
  initializeDefaults,
  DEFAULT_SETTINGS
};

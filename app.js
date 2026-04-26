require('dotenv').config(); // تحميل البيانات السرية
const mysql = require('mysql2');

// إنشاء حوض اتصالات (Pool) لضمان سرعة الموقع
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// تجربة الاتصال
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ خطأ في الاتصال بقاعدة بيانات Greens:', err.message);
    } else {
        console.log('🚀 تم الاتصال بنجاح بسيرفر Greens Accounting');
        connection.release();
    }
});

module.exports = pool;

const express = require('express');
const app = express();
const pool = require('./db'); // ملف الاتصال بقاعدة البيانات الذي أنشأناه سابقاً

// ... أي إعدادات أخرى مثل app.use(express.json()) ...

// --- انسخ الكود هنا ---
app.get('/api/invoices', (req, res) => {
    pool.query('SELECT * FROM invoices', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('خطأ في السيرفر');
        }
        res.json(results); 
    });
});
// ---------------------

app.listen(3000, () => {
    console.log('سيرفر GreensAcc يعمل على منفذ 3000');
});
async function loadInvoices() {
    const response = await fetch('https://greensacc.com/api/invoices');
    const invoices = await response.json();
    
    console.log(invoices); // هنا ستظهر لك قائمة الفواتير في الـ Console
    // يمكنك الآن كتابة كود لعرضها في جدول داخل الصفحة
}

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


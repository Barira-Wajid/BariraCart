const mysql = require("mysql2");

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "bariracart_db",
    port: 3306,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.query("SELECT 1", (err) => {
    if (err) {
        console.error(
            "MySQL connection failed:",
            err.message
        );
        return;
    }

    console.log("MySQL connected successfully!");
});

module.exports = db;
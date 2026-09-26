const express = require("express");
const db = require("./db");
const path = require("path");
const bcrypt = require("bcryptjs");
const session = require("express-session");

const app = express();

const PORT = 3000;


// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json());


// ======================================================
// ADMIN SESSION
// ======================================================

app.use(
    session({
        secret: "bariracart_admin_secret",

        resave: false,

        saveUninitialized: false,

        cookie: {
            maxAge: 1000 * 60 * 60,
            httpOnly: true,
            sameSite: "lax",
            secure: false
        }
    })
);


// ======================================================
// SERVE WEBSITE FILES
// ======================================================

app.use(express.static(__dirname));


// ======================================================
// HOME PAGE
// ======================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(__dirname, "index.html")
    );

});


// ======================================================
// PRODUCTS API - GET ALL PRODUCTS
// ======================================================

app.get("/api/products", (req, res) => {

    const sql = "SELECT * FROM products";

    db.query(sql, (err, results) => {

        if (err) {

            console.error(
                "Error fetching products:",
                err.message
            );

            return res.status(500).json({

                success: false,

                message: "Could not fetch products"

            });

        }

        res.json({

            success: true,

            products: results

        });

    });

});


// ======================================================
// ADMIN - ADD PRODUCT
// ======================================================

app.post("/api/admin/products", async (req, res) => {

    // Check admin login
    if (!req.session.admin) {

        return res.status(401).json({

            success: false,

            message:
                "Unauthorized. Admin login required."

        });

    }


    const {
        name,
        description,
        price,
        image,
        category,
        stock
    } = req.body;


    // Validate fields
    if (
        !name ||
        !description ||
        price === undefined ||
        !image ||
        !category ||
        stock === undefined
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Please fill in all product fields."

        });

    }


    try {

        const sql = `
            INSERT INTO products
            (
                name,
                description,
                price,
                image,
                category,
                stock
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `;


        const [result] =
            await db.promise().query(
                sql,
                [
                    name,
                    description,
                    price,
                    image,
                    category,
                    stock
                ]
            );


        console.log(
            "PRODUCT ADDED:",
            name
        );


        res.json({

            success: true,

            message:
                "Product added successfully.",

            productId:
                result.insertId

        });


    } catch (error) {

        console.error(
            "ADD PRODUCT ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Failed to add product."

        });

    }

});app.get(
    "/api/admin/products/:id",
    async (req, res) => {

        if (!req.session.admin) {
            return res.status(401).json({
                success: false,
                message:
                    "Unauthorized. Admin login required."
            });
        }

        const productId = req.params.id;

        try {

            const [products] =
                await db.promise().query(
                    `
                    SELECT *
                    FROM products
                    WHERE id = ?
                    `,
                    [productId]
                );

            if (products.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Product not found."
                });
            }

            res.json({
                success: true,
                product: products[0]
            });

        } catch (error) {

            console.error(
                "GET PRODUCT ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to load product."
            });
        }
    }
);app.put(
    "/api/admin/products/:id",
    async (req, res) => {

        if (!req.session.admin) {
            return res.status(401).json({
                success: false,
                message:
                    "Unauthorized. Admin login required."
            });
        }

        const productId = req.params.id;

        const {
            name,
            description,
            price,
            image,
            category,
            stock
        } = req.body;

        if (
            !name ||
            !description ||
            price === undefined ||
            !image ||
            !category ||
            stock === undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Please fill in all product fields."
            });
        }

        try {

            const [result] =
                await db.promise().query(
                    `
                    UPDATE products

                    SET
                        name = ?,
                        description = ?,
                        price = ?,
                        image = ?,
                        category = ?,
                        stock = ?

                    WHERE id = ?
                    `,
                    [
                        name,
                        description,
                        price,
                        image,
                        category,
                        stock,
                        productId
                    ]
                );

            if (
                result.affectedRows === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Product not found."
                });
            }

            console.log(
                `PRODUCT UPDATED: #${productId}`
            );

            res.json({
                success: true,
                message:
                    "Product updated successfully."
            });

        } catch (error) {

            console.error(
                "UPDATE PRODUCT ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to update product."
            });
        }
    }
);


// ======================================================
// CREATE ORDER
// ======================================================

app.post("/api/orders", (req, res) => {

    const {
        name,
        email,
        phone,
        shipping_address,
        cart
    } = req.body;


    // ==================================================
    // VALIDATION
    // ==================================================

    if (
        !name ||
        !email ||
        !phone ||
        !shipping_address ||
        !cart ||
        cart.length === 0
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Please provide all required information."

        });

    }


    // ==================================================
    // CALCULATE TOTAL
    // ==================================================

    let totalAmount = 0;

    cart.forEach(function (item) {

        totalAmount +=
            Number(item.price) *
            Number(item.quantity);

    });


    // ==================================================
    // FIND CUSTOMER
    // ==================================================

    const findUserSQL = `
        SELECT id
        FROM users
        WHERE email = ?
        LIMIT 1
    `;


    db.query(
        findUserSQL,
        [email],
        function (userError, userResults) {

            if (userError) {

                console.error(
                    "User lookup error:",
                    userError.message
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Could not find customer."

                });

            }


            // ==========================================
            // EXISTING CUSTOMER
            // ==========================================

            if (userResults.length > 0) {

                const userId =
                    userResults[0].id;

                createOrder(userId);

                return;

            }


            // ==========================================
            // CREATE NEW CUSTOMER
            // ==========================================

            const temporaryPassword =
                "bariracart_customer";


            const createUserSQL = `
                INSERT INTO users
                (
                    name,
                    email,
                    password,
                    role
                )
                VALUES (?, ?, ?, ?)
            `;


            db.query(

                createUserSQL,

                [
                    name,
                    email,
                    temporaryPassword,
                    "customer"
                ],

                function (
                    createUserError,
                    userResult
                ) {

                    if (createUserError) {

                        console.error(
                            "Customer creation error:",
                            createUserError.message
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Could not create customer."

                        });

                    }


                    const userId =
                        userResult.insertId;


                    createOrder(userId);

                }

            );

        }

    );


    // ==================================================
    // CREATE ORDER FUNCTION
    // ==================================================

    function createOrder(userId) {

        const orderSQL = `
            INSERT INTO orders
            (
                user_id,
                total_amount,
                status,
                shipping_address
            )
            VALUES (?, ?, ?, ?)
        `;


        db.query(

            orderSQL,

            [
                userId,
                totalAmount,
                "Pending",
                shipping_address
            ],

            function (error, orderResult) {

                if (error) {

                    console.error(
                        "Order creation error:",
                        error.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Could not create order."

                    });

                }


                // ======================================
                // ORDER ID
                // ======================================

                const orderId =
                    orderResult.insertId;


                // ======================================
                // ORDER ITEMS
                // ======================================

                const itemSQL = `
                    INSERT INTO order_items
                    (
                        order_id,
                        product_id,
                        quantity,
                        price
                    )
                    VALUES ?
                `;


                const itemValues =
                    cart.map(function (item) {

                        return [

                            orderId,

                            item.id,

                            item.quantity,

                            Number(item.price)

                        ];

                    });


                db.query(

                    itemSQL,

                    [itemValues],

                    function (itemError) {

                        if (itemError) {

                            console.error(
                                "Order items error:",
                                itemError.message
                            );

                            return res.status(500).json({

                                success: false,

                                message:
                                    "Order created but items could not be saved."

                            });

                        }


                        // ==================================
                        // SUCCESS
                        // ==================================

                        res.json({

                            success: true,

                            message:
                                "Order placed successfully!",

                            orderId:
                                orderId,

                            total:
                                totalAmount

                        });

                    }

                );

            }

        );

    }

});


// ======================================================
// ADMIN LOGIN
// ======================================================

app.post("/api/admin/login", (req, res) => {

    const {
        email,
        password
    } = req.body;


    // ==================================================
    // VALIDATION
    // ==================================================

    if (!email || !password) {

        return res.status(400).json({

            success: false,

            message:
                "Email and password are required."

        });

    }


    // ==================================================
    // FIND ADMIN
    // ==================================================

    const sql = `
        SELECT
            id,
            name,
            email,
            password,
            role
        FROM users
        WHERE email = ?
        LIMIT 1
    `;


    db.query(
        sql,
        [email],
        async (error, results) => {

            if (error) {

                console.error(
                    "Admin login error:",
                    error.message
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Server error."

                });

            }


            // ==========================================
            // ADMIN NOT FOUND
            // ==========================================

            if (results.length === 0) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }


            const admin =
                results[0];


            // ==========================================
            // CHECK ADMIN ROLE
            // ==========================================

            if (admin.role !== "admin") {

                return res.status(403).json({

                    success: false,

                    message:
                        "Access denied."

                });

            }


            // ==========================================
            // CHECK PASSWORD
            // ==========================================

            const passwordMatch =
                await bcrypt.compare(
                    password,
                    admin.password
                );


            if (!passwordMatch) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid email or password."

                });

            }


            // ==========================================
            // CREATE ADMIN SESSION
            // ==========================================

            req.session.admin = {

                id:
                    admin.id,

                name:
                    admin.name,

                email:
                    admin.email,

                role:
                    admin.role

            };


            // ==========================================
            // SAVE SESSION
            // ==========================================

            req.session.save((sessionError) => {

                if (sessionError) {

                    console.error(
                        "Session save error:",
                        sessionError
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Could not create admin session."

                    });

                }


                console.log(
                    "ADMIN SESSION CREATED:",
                    req.session.admin
                );


                res.json({

                    success: true,

                    message:
                        "Admin login successful."

                });

            });

        }

    );

});


// ======================================================
// CHECK ADMIN SESSION
// ======================================================

app.get("/api/admin/check", (req, res) => {

    console.log(
        "ADMIN SESSION CHECK:",
        req.session.admin
    );


    if (!req.session.admin) {

        return res.json({

            loggedIn: false

        });

    }


    res.json({

        loggedIn: true,

        admin:
            req.session.admin

    });

});


// ======================================================
// ADMIN LOGOUT
// ======================================================

app.post("/api/admin/logout", (req, res) => {

    req.session.destroy((error) => {

        if (error) {

            console.error(
                "Logout error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Could not logout."

            });

        }


        res.json({

            success: true,

            message:
                "Logged out successfully."

        });

    });

});


// ======================================================
// ADMIN DASHBOARD STATISTICS
// ======================================================

app.get("/api/admin/stats", async (req, res) => {

    try {

        if (!req.session.admin) {

            return res.status(401).json({

                success: false,

                message:
                    "Unauthorized"

            });

        }


        // TOTAL ORDERS

        const [orderCount] =
            await db.promise().query(
                `
                SELECT COUNT(*) AS totalOrders
                FROM orders
                `
            );


        // TOTAL SALES

        const [sales] =
            await db.promise().query(
                `
                SELECT
                    COALESCE(
                        SUM(total_amount),
                        0
                    ) AS totalSales
                FROM orders
                `
            );


        // PENDING ORDERS

        const [pending] =
            await db.promise().query(
                `
                SELECT COUNT(*) AS pendingOrders
                FROM orders
                WHERE status = 'Pending'
                `
            );


        // TOTAL PRODUCTS

        const [productCount] =
            await db.promise().query(
                `
                SELECT COUNT(*) AS totalProducts
                FROM products
                `
            );


        res.json({

            success: true,

            totalOrders:
                orderCount[0].totalOrders,

            totalSales:
                sales[0].totalSales,

            pendingOrders:
                pending[0].pendingOrders,

            totalProducts:
                productCount[0].totalProducts

        });

    }

    catch (error) {

        console.error(
            "Dashboard stats error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Failed to load dashboard statistics"

        });

    }

});


// ======================================================
// ADMIN RECENT ORDERS
// ======================================================

app.get(
    "/api/admin/recent-orders",
    async (req, res) => {

        try {

            if (!req.session.admin) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Unauthorized"

                });

            }


            const [orders] =
                await db.promise().query(
                    `
                    SELECT
                        orders.id,
                        users.name,
                        users.email,
                        orders.total_amount,
                        orders.status,
                        orders.created_at

                    FROM orders

                    LEFT JOIN users
                        ON orders.user_id = users.id

                    ORDER BY orders.id DESC

                    LIMIT 10
                    `
                );


            res.json({

                success: true,

                orders:
                    orders

            });

        }

        catch (error) {

            console.error(
                "Recent orders error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to load recent orders"

            });

        }

    }
);


// ======================================================
// ADMIN - GET ALL ORDERS
// ======================================================

app.get(
    "/api/admin/all-orders",
    async (req, res) => {

        if (!req.session.admin) {

            return res.status(401).json({

                success: false,

                message:
                    "Unauthorized. Admin login required."

            });

        }


        try {

            const [orders] =
                await db.promise().query(
                    `
                    SELECT
                        orders.id,
                        orders.total_amount,
                        orders.status,
                        orders.shipping_address,
                        orders.user_id,
                        users.name,
                        users.email

                    FROM orders

                    LEFT JOIN users
                        ON orders.user_id = users.id

                    ORDER BY orders.id DESC
                    `
                );


            res.json({

                success: true,

                orders:
                    orders

            });

        }

        catch (error) {

            console.error(
                "ALL ORDERS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to load orders."

            });

        }

    }
);


// ======================================================
// ADMIN - UPDATE ORDER STATUS
// ======================================================

app.put(
    "/api/admin/orders/:id/status",
    async (req, res) => {

        if (!req.session.admin) {

            return res.status(401).json({

                success: false,

                message:
                    "Unauthorized. Admin login required."

            });

        }


        const orderId =
            req.params.id;


        const newStatus =
            req.body.status;


        const allowedStatuses = [
            "Pending",
            "Processing",
            "Shipped",
            "Delivered"
        ];


        if (
            !allowedStatuses.includes(
                newStatus
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid order status."

            });

        }


        try {

            const [result] =
                await db.promise().query(
                    `
                    UPDATE orders
                    SET status = ?
                    WHERE id = ?
                    `,
                    [
                        newStatus,
                        orderId
                    ]
                );


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found."

                });

            }


            console.log(
                `Order #${orderId} status changed to ${newStatus}`
            );


            res.json({

                success: true,

                message:
                    "Order status updated successfully.",

                orderId:
                    orderId,

                status:
                    newStatus

            });


        }

        catch (error) {

            console.error(
                "UPDATE ORDER STATUS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to update order status."

            });

        }

    }
);


// ======================================================
// ADMIN - GET SINGLE ORDER DETAILS
// ======================================================

app.get(
    "/api/admin/orders/:id",
    async (req, res) => {

        if (!req.session.admin) {

            return res.status(401).json({

                success: false,

                message:
                    "Unauthorized. Admin login required."

            });

        }


        const orderId =
            req.params.id;


        try {

            // ORDER + CUSTOMER

            const [orders] =
                await db.promise().query(
                    `
                    SELECT
                        orders.id,
                        orders.user_id,
                        orders.total_amount,
                        orders.status,
                        orders.shipping_address,
                        orders.created_at,
                        users.name,
                        users.email

                    FROM orders

                    LEFT JOIN users
                        ON orders.user_id = users.id

                    WHERE orders.id = ?
                    `,
                    [orderId]
                );


            if (orders.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found."

                });

            }


            // ORDERED PRODUCTS

            const [items] =
                await db.promise().query(
                    `
                    SELECT
                        order_items.id,
                        order_items.product_id,
                        order_items.quantity,
                        order_items.price,
                        products.name AS product_name

                    FROM order_items

                    LEFT JOIN products
                        ON order_items.product_id = products.id

                    WHERE order_items.order_id = ?
                    `,
                    [orderId]
                );


            res.json({

                success: true,

                order:
                    orders[0],

                items:
                    items

            });


        }

        catch (error) {

            console.error(
                "ORDER DETAILS ERROR:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Failed to load order details."

            });

        }

    }
);

// ======================================
// GET SINGLE PRODUCT FOR EDIT
// ======================================

app.get("/api/admin/products/:id", async (req, res) => {

    if (!req.session.admin) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized. Admin login required."
        });
    }

    const productId = req.params.id;

    try {

        const [products] = await db.promise().query(
            "SELECT * FROM products WHERE id = ?",
            [productId]
        );

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        res.json({
            success: true,
            product: products[0]
        });

    } catch (error) {

        console.error("GET PRODUCT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load product."
        });
    }
});


// ======================================
// UPDATE / EDIT PRODUCT
// ======================================

app.put("/api/admin/products/:id", async (req, res) => {

    if (!req.session.admin) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized. Admin login required."
        });
    }

    const productId = req.params.id;

    const {
        name,
        description,
        price,
        image,
        category,
        stock
    } = req.body;

    if (
        !name ||
        !description ||
        price === undefined ||
        !image ||
        !category ||
        stock === undefined
    ) {
        return res.status(400).json({
            success: false,
            message: "Please fill in all product fields."
        });
    }

    try {

        const sql = `
            UPDATE products
            SET
                name = ?,
                description = ?,
                price = ?,
                image = ?,
                category = ?,
                stock = ?
            WHERE id = ?
        `;

        const [result] = await db.promise().query(
            sql,
            [
                name,
                description,
                price,
                image,
                category,
                stock,
                productId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        console.log("PRODUCT UPDATED:", productId);

        res.json({
            success: true,
            message: "Product updated successfully."
        });

    } catch (error) {

        console.error("UPDATE PRODUCT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update product."
        });
    }
});


// ======================================
// DELETE PRODUCT
// ======================================

app.delete("/api/admin/products/:id", async (req, res) => {

    if (!req.session.admin) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized. Admin login required."
        });
    }

    const productId = req.params.id;

    try {

        const [products] = await db.promise().query(
            "SELECT id FROM products WHERE id = ?",
            [productId]
        );

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        await db.promise().query(
            "DELETE FROM products WHERE id = ?",
            [productId]
        );

        console.log("PRODUCT DELETED:", productId);

        res.json({
            success: true,
            message: "Product deleted successfully."
        });

    } catch (error) {

        console.error("DELETE PRODUCT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete product."
        });
    }
});
// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {

    console.log(
        `BariraCart server is running on http://localhost:${PORT}`
    );

});
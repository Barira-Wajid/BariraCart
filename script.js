let allProducts = [];
let cart = JSON.parse(localStorage.getItem("bariraCart")) || [];


// ================= LOAD PRODUCTS =================

async function loadProducts() {

    const container = document.getElementById("product-container");
    const status = document.getElementById("product-status");

    try {

        const response = await fetch("/api/products");

        if (!response.ok) {
            throw new Error("Failed to load products.");
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error("Products could not be loaded.");
        }

        allProducts = data.products;

        displayProducts(allProducts);

        if (status) {
            status.textContent =
                allProducts.length + " products";
        }

        updateCartCount();

    } catch (error) {

        console.error("PRODUCT LOAD ERROR:", error);

        if (container) {
            container.innerHTML = `
                <p class="error-message">
                    Unable to load products. Please try again.
                </p>
            `;
        }

        if (status) {
            status.textContent =
                "Error loading products";
        }
    }
}


// ================= DISPLAY PRODUCTS =================

function displayProducts(products) {

    const container =
        document.getElementById("product-container");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!products || products.length === 0) {

        container.innerHTML = `
            <p class="empty-message">
                No products found.
            </p>
        `;

        return;
    }

    products.forEach(function(product) {

        const card =
            document.createElement("div");

        card.className =
            "product-card";

        card.innerHTML = `
            <div class="product-image">

                <img
                    src="${product.image}"
                    alt="${product.name}"
                >

                <span class="category-tag">
                    ${product.category}
                </span>

            </div>

            <div class="product-info">

                <p class="product-category">
                    ${product.category}
                </p>

                <h3>
                    ${product.name}
                </h3>

                <p class="product-description">
                    ${product.description}
                </p>

                <div class="product-bottom">

                    <strong>
                        Rs. ${Number(product.price).toLocaleString()}
                    </strong>

                    <button
                        onclick="addToCart(${product.id})"
                    >
                        + Cart
                    </button>

                </div>

            </div>
        `;

        container.appendChild(card);

    });
}


// ================= ADD TO CART =================

function addToCart(productId) {

    const product =
        allProducts.find(function(product) {
            return product.id == productId;
        });

    if (!product) {
        console.error(
            "Product not found:",
            productId
        );
        return;
    }

    const existingItem =
        cart.find(function(item) {
            return item.id == productId;
        });

    if (existingItem) {

        existingItem.quantity++;

    } else {

        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            image: product.image,
            quantity: 1
        });

    }

    localStorage.setItem(
        "bariraCart",
        JSON.stringify(cart)
    );

    updateCartCount();

    displayCart();

    showCartMessage(product.name);
}


// ================= SMART PRODUCT SEARCH =================

function searchProducts() {

    const searchInput =
        document.getElementById("searchInput");

    if (!searchInput) {
        return;
    }

    const searchText =
        searchInput.value
            .toLowerCase()
            .trim();

    if (searchText === "") {

        displayProducts(allProducts);

        return;
    }

    const filteredProducts =
        allProducts.filter(function(product) {

            const name =
                String(product.name || "")
                    .toLowerCase();

            const category =
                String(product.category || "")
                    .toLowerCase();

            const description =
                String(product.description || "")
                    .toLowerCase();

            return (
                name.includes(searchText) ||
                category.includes(searchText) ||
                description.includes(searchText)
            );

        });

    displayProducts(filteredProducts);
}


// ================= CATEGORY FILTER =================

function filterCategory(category) {

    if (category === "All") {

        displayProducts(allProducts);

        return;
    }

    const filteredProducts =
        allProducts.filter(function(product) {

            return product.category === category;

        });

    displayProducts(filteredProducts);
}


// ================= FOCUS SEARCH =================

function focusSearch() {

    const input =
        document.getElementById("searchInput");

    if (!input) {
        return;
    }

    input.focus();

    input.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


// ================= CART MESSAGE =================

function showCartMessage(productName) {

    console.log(
        productName + " added to cart!"
    );
}


// ================= OPEN CART =================

function openCart() {

    const panel =
        document.getElementById("cart-panel");

    if (!panel) {
        return;
    }

    panel.classList.add("active");

    displayCart();
}


// ================= CLOSE CART =================

function closeCart() {

    const panel =
        document.getElementById("cart-panel");

    if (!panel) {
        return;
    }

    panel.classList.remove("active");
}


// ================= DISPLAY CART =================

function displayCart() {

    const container =
        document.getElementById("cart-items");

    if (!container) {
        return;
    }

    if (cart.length === 0) {

        container.innerHTML = `
            <div class="empty-cart">

                <p>
                    🛒 Your cart is empty.
                </p>

                <button
                    onclick="closeCart()"
                    class="secondary-btn"
                >
                    Continue Shopping
                </button>

            </div>
        `;

        return;
    }

    container.innerHTML = "";

    cart.forEach(function(item) {

        const cartItem =
            document.createElement("div");

        cartItem.className =
            "cart-item";

        cartItem.innerHTML = `

            <img
                src="${item.image}"
                alt="${item.name}"
            >

            <div class="cart-item-info">

                <h4>
                    ${item.name}
                </h4>

                <p>
                    Rs.
                    ${Number(item.price).toLocaleString()}
                </p>

                <div class="cart-controls">

                    <button
                        onclick="decreaseQuantity(${item.id})"
                    >
                        −
                    </button>

                    <span>
                        ${item.quantity}
                    </span>

                    <button
                        onclick="increaseQuantity(${item.id})"
                    >
                        +
                    </button>

                    <button
                        class="remove-btn"
                        onclick="removeFromCart(${item.id})"
                    >
                        🗑️
                    </button>

                </div>

            </div>

        `;

        container.appendChild(cartItem);

    });

    const total =
        cart.reduce(function(sum, item) {

            return sum +
                Number(item.price) *
                item.quantity;

        }, 0);

    const totalBox =
        document.createElement("div");

    totalBox.className =
        "cart-total";

    totalBox.innerHTML = `

        <div>

            <span>
                Total
            </span>

            <strong>
                Rs. ${total.toLocaleString()}
            </strong>

        </div>

        <button
            class="checkout-btn"
            onclick="goToCheckout()"
        >
            Proceed to Checkout →
        </button>

    `;

    container.appendChild(totalBox);
}


// ================= INCREASE QUANTITY =================

function increaseQuantity(productId) {

    const item =
        cart.find(function(item) {
            return item.id == productId;
        });

    if (!item) {
        return;
    }

    item.quantity++;

    saveCart();
}


// ================= DECREASE QUANTITY =================

function decreaseQuantity(productId) {

    const item =
        cart.find(function(item) {
            return item.id == productId;
        });

    if (!item) {
        return;
    }

    if (item.quantity > 1) {

        item.quantity--;

    } else {

        removeFromCart(productId);

        return;
    }

    saveCart();
}


// ================= REMOVE ITEM =================

function removeFromCart(productId) {

    cart =
        cart.filter(function(item) {

            return item.id != productId;

        });

    saveCart();
}


// ================= SAVE CART =================

function saveCart() {

    localStorage.setItem(
        "bariraCart",
        JSON.stringify(cart)
    );

    updateCartCount();

    displayCart();
}


// ================= CART COUNT =================

function updateCartCount() {

    const cartCount =
        document.getElementById("cart-count");

    if (!cartCount) {
        return;
    }

    const count =
        cart.reduce(function(total, item) {

            return total + item.quantity;

        }, 0);

    cartCount.textContent = count;
}


// ================= CHECKOUT =================

function goToCheckout() {

    window.location.href =
        "checkout.html";
}


// ================= START APPLICATION =================

loadProducts();
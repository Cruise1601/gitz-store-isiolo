const seedProducts = [
  { id: 1, name: "Golden Oat Granola", category: "Pantry", price: 850, stock: 24, icon: "🥣", description: "Crunchy, golden and lightly sweet." },
  { id: 2, name: "Citrus Sparkling Water", category: "Beverages", price: 425, stock: 42, icon: "🍋", description: "Bright bubbles, zero added sugar." },
  { id: 3, name: "Cedar & Sage Soap", category: "Personal care", price: 675, stock: 18, icon: "🧼", description: "A gentle bar with a fresh finish." },
  { id: 4, name: "Sunday Linen Spray", category: "Home", price: 1400, stock: 9, icon: "🫧", description: "Soft, clean scent for slower days." },
  { id: 5, name: "Sea Salt Crackers", category: "Snacks", price: 550, stock: 31, icon: "🥨", description: "Golden baked with a little crunch." },
  { id: 6, name: "Green Tea Blend", category: "Beverages", price: 1100, stock: 15, icon: "🍵", description: "A calming blend for your daily ritual." },
  { id: 7, name: "Olive Oil Essentials", category: "Pantry", price: 1850, stock: 12, icon: "🫒", description: "Cold-pressed and full of flavor." },
  { id: 8, name: "Bamboo Dish Brush", category: "Home", price: 725, stock: 20, icon: "🧹", description: "A durable helper for everyday dishes." }
];
const stored = localStorage.getItem("gitz-products");
const currencyVersion = localStorage.getItem("gitz-currency");
let products = stored ? JSON.parse(stored) : seedProducts;
if (stored && currencyVersion !== "kes") {
  products = products.map((product) => ({ ...product, price: product.price < 100 ? product.price * 100 : product.price }));
  localStorage.setItem("gitz-products", JSON.stringify(products));
}
localStorage.setItem("gitz-currency", "kes");
let cart = JSON.parse(localStorage.getItem("gitz-cart") || "[]");
let orders = JSON.parse(localStorage.getItem("gitz-orders") || "[]");
let notifications = JSON.parse(localStorage.getItem("gitz-notifications") || "[]");
const $ = (selector) => document.querySelector(selector);
const money = (value) => `KSh ${Number(value).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "Gitz@2026";
let adminAuthenticated = sessionStorage.getItem("gitz-admin-auth") === "true";
const save = () => { localStorage.setItem("gitz-products", JSON.stringify(products)); localStorage.setItem("gitz-cart", JSON.stringify(cart)); };
const saveNotifications = () => localStorage.setItem("gitz-notifications", JSON.stringify(notifications));
const productVisual = (product, className = "") => product.image ? `<img class="${className}" src="${product.image}" alt="${product.name}" />` : (product.icon || "✦");

function renderProducts() {
  const search = $("#searchInput").value.toLowerCase().trim();
  const category = $("#categoryFilter").value;
  const visible = products.filter((p) => p.name.toLowerCase().includes(search) && (category === "all" || p.category === category));
  $("#productGrid").innerHTML = visible.map((p) => `<article class="product-card"><div class="product-image">${productVisual(p, "product-photo")}</div><span class="stock-label ${p.stock < 10 ? "low" : ""}">${p.stock === 0 ? "Sold out" : p.stock < 10 ? `${p.stock} left` : "In stock"}</span><div class="product-info"><span class="product-category">${p.category}</span><h3 title="${p.name}">${p.name}</h3><p>${p.description || "A thoughtful everyday essential."}</p><div class="product-bottom"><strong class="price">${money(p.price)}</strong><button class="add-button" data-add="${p.id}" ${p.stock === 0 ? "disabled" : ""} aria-label="Add ${p.name} to cart">+</button></div></div></article>`).join("");
  $("#emptyProducts").classList.toggle("hidden", visible.length > 0);
}
function renderAdmin() {
  $("#totalProducts").textContent = products.length;
  $("#totalOrders").textContent = orders.length;
  $("#catalogValue").textContent = money(products.reduce((sum, p) => sum + p.price * p.stock, 0));
  $("#adminProductRows").innerHTML = products.map((p) => `<tr><td><div class="table-product"><span class="table-product-icon">${productVisual(p, "table-product-photo")}</span>${p.name}</div></td><td>${p.category}</td><td>${money(p.price)}</td><td>${p.stock}</td><td><button class="delete-button" data-delete="${p.id}">Remove</button></td></tr>`).join("");
  $("#notificationCount").textContent = notifications.length;
  $("#orderNotifications").innerHTML = notifications.length ? notifications.map((notification) => `<div class="order-notification"><span class="notification-icon">🛍</span><div><strong>New order received</strong><p>${notification.customer} • ${money(notification.total)} via M-Pesa</p><small>${new Date(notification.date).toLocaleString("en-KE")}</small></div></div>`).join("") : '<p class="muted-copy">New orders will appear here.</p>';
  $("#emptyAdmin").classList.toggle("hidden", products.length > 0);
}
function renderAdminAccess() {
  $("#adminLogin").classList.toggle("hidden", adminAuthenticated);
  $("#adminDashboard").classList.toggle("hidden", !adminAuthenticated);
  if (adminAuthenticated) renderAdmin();
}
function cartCount() { return cart.reduce((sum, item) => sum + item.quantity, 0); }
function cartTotal() { return cart.reduce((sum, item) => sum + item.price * item.quantity, 0); }
function renderCart() {
  const count = cartCount();
  $("#cartCount").textContent = count; $("#drawerCount").textContent = count;
  $("#cartTotal").textContent = money(cartTotal()); $("#checkoutTotal").textContent = money(cartTotal());
  $("#cartItems").innerHTML = cart.map((item) => `<div class="cart-row"><span class="cart-row-icon">${item.icon || "✦"}</span><div class="cart-row-info"><strong>${item.name}</strong><small>${money(item.price)} each</small><div class="qty-controls"><button data-qty="${item.id}" data-change="-1">−</button><span>${item.quantity}</span><button data-qty="${item.id}" data-change="1">+</button><button class="remove-link" data-remove-cart="${item.id}">Remove</button></div></div><strong>${money(item.price * item.quantity)}</strong></div>`).join("");
  $("#cartEmpty").classList.toggle("hidden", count > 0); $(".cart-summary").classList.toggle("hidden", count === 0);
}
function showToast(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2600); }
function openDrawer() { $("#cartDrawer").classList.add("open"); $("#cartDrawer").setAttribute("aria-hidden", "false"); }
function closeDrawer() { $("#cartDrawer").classList.remove("open"); $("#cartDrawer").setAttribute("aria-hidden", "true"); }
function openModal(id) { $(id).classList.remove("hidden"); }
function closeModal(id) { $(id).classList.add("hidden"); }

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    const view = viewButton.dataset.view;
    $("#storeView").classList.toggle("hidden", view !== "store"); $("#adminView").classList.toggle("hidden", view !== "admin");
    document.querySelectorAll(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
    window.scrollTo({ top: 0, behavior: "smooth" }); if (view === "admin") renderAdminAccess();
  }
  const add = event.target.closest("[data-add]");
  if (add) {
    const product = products.find((p) => p.id === Number(add.dataset.add));
    const existing = cart.find((item) => item.id === product.id);
    if (existing) { if (existing.quantity < product.stock) existing.quantity++; else return showToast("That’s all the stock we have."); }
    else cart.push({ ...product, quantity: 1 });
    save(); renderCart(); showToast(`${product.name} added to cart`);
  }
  const remove = event.target.closest("[data-delete]");
  if (remove) {
    const product = products.find((p) => p.id === Number(remove.dataset.delete));
    if (confirm(`Remove "${product.name}" from the catalog?`)) { products = products.filter((p) => p.id !== product.id); cart = cart.filter((item) => item.id !== product.id); save(); renderProducts(); renderAdmin(); renderCart(); showToast("Product removed"); }
  }
  const qty = event.target.closest("[data-qty]");
  if (qty) {
    const item = cart.find((i) => i.id === Number(qty.dataset.qty)); const product = products.find((p) => p.id === item.id);
    item.quantity = Math.max(0, Math.min(product.stock, item.quantity + Number(qty.dataset.change))); cart = cart.filter((i) => i.quantity > 0); save(); renderCart();
  }
  const removeCart = event.target.closest("[data-remove-cart]");
  if (removeCart) { cart = cart.filter((item) => item.id !== Number(removeCart.dataset.removeCart)); save(); renderCart(); }
  if (event.target.closest("[data-close-cart]")) closeDrawer();
  if (event.target.closest("[data-close-modal]")) closeModal("#productModal");
  if (event.target.closest("[data-close-checkout]")) closeModal("#checkoutModal");
  if (event.target.closest("[data-scroll-products]")) $("#productsSection").scrollIntoView({ behavior: "smooth" });
});
$("#cartButton").addEventListener("click", openDrawer);
$("#addProductButton").addEventListener("click", () => openModal("#productModal"));
$("#logoutButton").addEventListener("click", () => {
  adminAuthenticated = false;
  sessionStorage.removeItem("gitz-admin-auth");
  renderAdminAccess();
  showToast("You have been securely logged out");
});
$("#adminLoginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  const valid = data.get("username") === ADMIN_USERNAME && data.get("password") === ADMIN_PASSWORD;
  if (!valid) {
    $("#loginError").classList.remove("hidden");
    return;
  }
  adminAuthenticated = true;
  sessionStorage.setItem("gitz-admin-auth", "true");
  if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  $("#loginError").classList.add("hidden");
  event.target.reset();
  renderAdminAccess();
  showToast("Welcome to the admin dashboard");
});
$("#searchInput").addEventListener("input", renderProducts);
$("#categoryFilter").addEventListener("change", renderProducts);
$("#productImage").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { $("#imagePreview").src = reader.result; $("#imagePreview").classList.remove("hidden"); };
  reader.readAsDataURL(file);
});
$("#clearNotifications").addEventListener("click", () => { notifications = []; saveNotifications(); renderAdmin(); showToast("Notifications cleared"); });
$("#productForm").addEventListener("submit", (event) => {
  event.preventDefault(); const data = new FormData(event.target);
  const image = $("#imagePreview").src || "";
  products.unshift({ id: Date.now(), name: data.get("name"), category: data.get("category"), price: Number(data.get("price")), stock: Number(data.get("stock")), icon: data.get("icon") || "✦", image, description: data.get("description") || "A thoughtful everyday essential." });
  save(); renderProducts(); renderAdmin(); closeModal("#productModal"); event.target.reset(); $("#imagePreview").src = ""; $("#imagePreview").classList.add("hidden"); showToast("Product added to your catalog");
});
$("#checkoutButton").addEventListener("click", () => { if (cart.length) { closeDrawer(); openModal("#checkoutModal"); } });
$("#checkoutForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  const customer = data.get("name");
  const orderTotal = cartTotal();
  cart.forEach((item) => { const product = products.find((p) => p.id === item.id); if (product) product.stock -= item.quantity; });
  orders.push({ id: Date.now(), total: orderTotal, customer, phone: data.get("phone"), date: new Date().toISOString() });
  notifications.unshift({ id: Date.now(), total: orderTotal, customer, date: new Date().toISOString() });
  saveNotifications();
  cart = []; save(); renderProducts(); renderAdmin(); renderCart(); closeModal("#checkoutModal"); event.target.reset();
  if ("Notification" in window && Notification.permission === "granted") new Notification("New Gitz Store order", { body: `${customer} placed an order for ${money(orderTotal)}.` });
  showToast(`M-Pesa prompt sent to ${data.get("phone")}. Enter your PIN on your phone to pay.`);
});
renderProducts(); renderAdminAccess(); renderCart();

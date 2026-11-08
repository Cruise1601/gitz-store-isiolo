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
let adminAuthenticated = false;
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
const productById = (id) => products.find((product) => String(product.id) === String(id));
async function refreshFromBackend() {
  try {
    const remoteProducts = await loadRemoteProducts();
    if (remoteProducts.length) products = remoteProducts;
    try {
      orders = await loadRemoteOrders();
      notifications = orders.map((order) => ({ id: order.id, total: order.total, customer: order.customer, date: order.date }));
    } catch (orderError) {
      console.error("Could not load shared orders.", orderError);
    }
    save();
    saveNotifications();
    renderProducts(); renderAdminAccess(); renderCart();
  } catch (error) {
    console.error("Could not load the shared store data.", error);
    showToast("Shared store data is unavailable. Showing cached products.");
  }
}
function renderAdmin() {
  $("#totalProducts").textContent = products.length;
  $("#totalOrders").textContent = orders.length;
  $("#catalogValue").textContent = money(products.reduce((sum, p) => sum + p.price * p.stock, 0));
  $("#adminProductRows").innerHTML = products.map((p) => `<tr><td><div class="table-product"><span class="table-product-icon">${productVisual(p, "table-product-photo")}</span>${p.name}</div></td><td>${p.category}</td><td>${money(p.price)}</td><td><div class="stock-editor"><input type="number" min="0" step="1" value="${p.stock}" data-stock="${p.id}" aria-label="Stock for ${p.name}" /><button class="save-stock-button" data-save-stock="${p.id}">Save</button></div></td><td><button class="delete-button" data-delete="${p.id}">Remove</button></td></tr>`).join("");
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

document.addEventListener("click", async (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    const view = viewButton.dataset.view;
    $("#storeView").classList.toggle("hidden", view !== "store"); $("#adminView").classList.toggle("hidden", view !== "admin");
    document.querySelectorAll(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
    window.scrollTo({ top: 0, behavior: "smooth" }); if (view === "admin") renderAdminAccess();
  }
  const add = event.target.closest("[data-add]");
  if (add) {
    const product = productById(add.dataset.add);
    if (!product) return;
    const existing = cart.find((item) => String(item.id) === String(product.id));
    if (existing) { if (existing.quantity < product.stock) existing.quantity++; else return showToast("That’s all the stock we have."); }
    else cart.push({ ...product, quantity: 1 });
    save(); renderCart(); showToast(`${product.name} added to cart`);
  }
  const remove = event.target.closest("[data-delete]");
  if (remove) {
    const product = productById(remove.dataset.delete);
    if (product && confirm(`Remove "${product.name}" from the catalog?`)) {
      try { await deleteRemoteProduct(product.id); products = products.filter((p) => p.id !== product.id); cart = cart.filter((item) => item.id !== product.id); save(); renderProducts(); renderAdmin(); renderCart(); showToast("Product removed"); }
      catch (error) { console.error("Product removal failed.", error); showToast("Could not remove the product."); }
    }
  }
  const saveStock = event.target.closest("[data-save-stock]");
  if (saveStock) {
    const product = productById(saveStock.dataset.saveStock);
    const input = document.querySelector(`[data-stock="${product.id}"]`);
    const stock = Number(input.value);
    if (!Number.isInteger(stock) || stock < 0) return showToast("Stock must be a whole number of 0 or more.");
    try {
      await updateRemoteProduct(product.id, { stock });
      product.stock = stock;
      cart = cart.map((item) => String(item.id) === String(product.id) ? { ...item, stock } : item).filter((item) => item.quantity <= item.stock);
      save(); renderProducts(); renderAdmin(); renderCart(); showToast(`${product.name} stock updated`);
    } catch (error) { console.error("Stock update failed.", error); showToast("Could not update stock."); }
  }
  const qty = event.target.closest("[data-qty]");
  if (qty) {
    const item = cart.find((i) => String(i.id) === String(qty.dataset.qty)); const product = productById(qty.dataset.qty);
    item.quantity = Math.max(0, Math.min(product.stock, item.quantity + Number(qty.dataset.change))); cart = cart.filter((i) => i.quantity > 0); save(); renderCart();
  }
  const removeCart = event.target.closest("[data-remove-cart]");
  if (removeCart) { cart = cart.filter((item) => String(item.id) !== String(removeCart.dataset.removeCart)); save(); renderCart(); }
  if (event.target.closest("[data-close-cart]")) closeDrawer();
  if (event.target.closest("[data-close-modal]")) closeModal("#productModal");
  if (event.target.closest("[data-close-checkout]")) closeModal("#checkoutModal");
  if (event.target.closest("[data-scroll-products]")) $("#productsSection").scrollIntoView({ behavior: "smooth" });
});
$("#cartButton").addEventListener("click", openDrawer);
$("#addProductButton").addEventListener("click", () => openModal("#productModal"));
$("#logoutButton").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  adminAuthenticated = false;
  renderAdminAccess();
  showToast("You have been securely logged out");
});
$("#adminLoginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: data.get("username"), password: data.get("password")
  });
  if (error) {
    $("#loginError").classList.remove("hidden");
    return;
  }
  adminAuthenticated = true;
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
$("#productForm").addEventListener("submit", async (event) => {
  event.preventDefault(); const data = new FormData(event.target);
  const image = $("#imagePreview").src || "";
  const product = { name: data.get("name"), category: data.get("category"), price: Number(data.get("price")), stock: Number(data.get("stock")), icon: data.get("icon") || "✦", image, description: data.get("description") || "A thoughtful everyday essential." };
  try {
    const created = await createRemoteProduct(product, data.get("image"));
    products.unshift(created);
    save(); renderProducts(); renderAdmin(); closeModal("#productModal"); event.target.reset(); $("#imagePreview").src = ""; $("#imagePreview").classList.add("hidden"); showToast("Product added to your catalog");
  } catch (error) { console.error("Product creation failed.", error); showToast("Could not add the product."); }
});
$("#checkoutButton").addEventListener("click", () => { if (cart.length) { closeDrawer(); openModal("#checkoutModal"); } });
$("#checkoutForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  const customer = data.get("name");
  const orderTotal = cartTotal();
  const order = { total: orderTotal, customer, phone: data.get("phone"), email: data.get("email"), address: data.get("address"), city: data.get("city"), postal: data.get("postal") };
  try {
    await createRemoteOrder(order, cart);
    for (const item of cart) {
      const product = productById(item.id);
      if (product) { product.stock -= item.quantity; await updateRemoteProduct(product.id, { stock: product.stock }); }
    }
    orders.unshift({ ...order, id: Date.now(), date: new Date().toISOString() });
    notifications.unshift({ id: Date.now(), total: orderTotal, customer, date: new Date().toISOString() });
  } catch (error) { console.error("Order submission failed.", error); showToast("Could not place the order. Please try again."); return; }
  saveNotifications();
  cart = []; save(); renderProducts(); renderAdmin(); renderCart(); closeModal("#checkoutModal"); event.target.reset();
  if ("Notification" in window && Notification.permission === "granted") new Notification("New Gitz Store order", { body: `${customer} placed an order for ${money(orderTotal)}.` });
  showToast(`M-Pesa prompt sent to ${data.get("phone")}. Enter your PIN on your phone to pay.`);
});
renderProducts(); renderAdminAccess(); renderCart();
refreshFromBackend();
supabaseClient.auth.getSession().then(({ data }) => {
  adminAuthenticated = Boolean(data.session);
  renderAdminAccess();
});

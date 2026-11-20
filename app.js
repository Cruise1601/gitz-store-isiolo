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
const htmlEscape = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);
const AUTH_REDIRECT_URL = "https://cruise1601.github.io/gitz-store-isiolo/";
let adminAuthenticated = false;
let passwordRecoveryMode = false;
let editingProductId = null;
let selectedProductImage = null;
let imagePreviewUrl = null;
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
    if (adminAuthenticated) {
      orders = await loadRemoteOrders();
      notifications = orders.map((order) => ({ ...order }));
      saveNotifications();
    }
    save();
    renderProducts(); renderAdminAccess(); renderCart();
    return true;
  } catch (error) {
    console.error("Could not load the shared store data.", error);
    showToast("Shared store data is unavailable. Showing cached products.");
    return false;
  }
}
function renderAdmin() {
  $("#totalProducts").textContent = products.length;
  $("#totalOrders").textContent = orders.length;
  $("#catalogValue").textContent = money(products.reduce((sum, p) => sum + p.price * p.stock, 0));
  $("#adminProductRows").innerHTML = products.map((p) => `<tr><td><div class="table-product"><span class="table-product-icon">${productVisual(p, "table-product-photo")}</span>${p.name}</div></td><td>${p.category}</td><td>${money(p.price)}</td><td><div class="stock-editor"><input type="number" min="0" step="1" value="${p.stock}" data-stock="${p.id}" aria-label="Stock for ${p.name}" /><button class="save-stock-button" data-save-stock="${p.id}">Save</button></div></td><td><div class="product-actions"><button class="edit-button" data-edit-product="${p.id}">Edit details</button><button class="delete-button" data-delete="${p.id}">Remove</button></div></td></tr>`).join("");
  const pendingCount = notifications.filter((notification) => notification.status !== "confirmed").length;
  $("#notificationCount").textContent = pendingCount;
  $("#orderNotifications").innerHTML = notifications.length ? notifications.map((notification) => {
    const confirmed = notification.status === "confirmed";
    const itemSummary = (notification.items || []).map((item) => `${item.name} × ${item.quantity}`).join(", ");
    return `<article class="order-notification"><span class="notification-icon">${confirmed ? "✓" : "🛍"}</span><div class="order-notification-copy"><strong>${confirmed ? "Payment confirmed" : "Pending order"}</strong><p>${htmlEscape(notification.customer)} • ${money(notification.total)}</p><p>${htmlEscape(itemSummary || "Order items unavailable")}</p><small>${new Date(notification.date).toLocaleString("en-KE")}</small><button class="edit-button review-order-button" data-review-order="${htmlEscape(notification.id)}">Review order</button></div></article>`;
  }).join("") : '<p class="muted-copy">New orders will appear here.</p>';
  $("#emptyAdmin").classList.toggle("hidden", products.length > 0);
}
function renderAdminAccess() {
  $("#adminLogin").classList.toggle("hidden", adminAuthenticated && !passwordRecoveryMode);
  $("#adminDashboard").classList.toggle("hidden", !adminAuthenticated || passwordRecoveryMode);
  if (adminAuthenticated && !passwordRecoveryMode) renderAdmin();
}
function showPasswordRecovery() {
  passwordRecoveryMode = true;
  adminAuthenticated = false;
  $("#storeView").classList.add("hidden");
  $("#adminView").classList.remove("hidden");
  $("#adminLogin").classList.remove("hidden");
  $("#adminDashboard").classList.add("hidden");
  $("#adminLoginForm").classList.add("hidden");
  $("#passwordRecoveryForm").classList.remove("hidden");
  document.querySelectorAll(".nav-link").forEach((button) => button.classList.toggle("active", button.dataset.view === "admin"));
  window.history.replaceState({}, document.title, window.location.pathname);
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
function receiptNumber(order) { return `GZ-${String(order.id).replace(/-/g, "").toUpperCase()}`; }
function receiptWhatsAppUrl(order) {
  const digits = String(order.phone || "").replace(/\D/g, "");
  const phone = digits.startsWith("0") ? `254${digits.slice(1)}` : digits.startsWith("254") ? digits : `254${digits}`;
  if (!/^254[17]\d{8}$/.test(phone)) return null;
  const items = (order.items || []).map((item) => `- ${item.name} x ${item.quantity}: ${money(item.price * item.quantity)}`);
  const message = [
    "GITZ STORE — PAYMENT RECEIPT",
    `Receipt: ${receiptNumber(order)}`,
    `Order: ${order.id}`,
    `Date: ${new Date(order.confirmedAt || order.date).toLocaleString("en-KE")}`,
    `Customer: ${order.customer}`,
    `Delivery: ${[order.address, order.city, order.postal].filter(Boolean).join(", ")}`,
    "",
    "Items:",
    ...(items.length ? items : ["- Order items unavailable"]),
    "",
    `TOTAL PAID: ${money(order.total)}`,
    "Payment confirmed by Gitz Store. Thank you for shopping with us."
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
function openOrderReview(orderId) {
  const order = orders.find((item) => String(item.id) === String(orderId));
  if (!order) return showToast("That order could not be found. Refresh the orders and try again.");
  const confirmed = order.status === "confirmed";
  const items = order.items || [];
  $("#orderReviewModal").dataset.orderId = order.id;
  $("#orderReviewTitle").textContent = confirmed ? "Confirmed order receipt" : "Review pending order";
  $("#orderReviewDetails").innerHTML = `
    <div class="review-order-meta">
      <p><span>Order reference</span><strong>${htmlEscape(order.id)}</strong></p>
      <p><span>Customer</span><strong>${htmlEscape(order.customer)}</strong></p>
      <p><span>Phone</span><strong>${htmlEscape(order.phone)}</strong></p>
      <p><span>Email</span><strong>${htmlEscape(order.email)}</strong></p>
      <p><span>Delivery address</span><strong>${htmlEscape([order.address, order.city, order.postal].filter(Boolean).join(", "))}</strong></p>
      <p><span>Status</span><strong class="${confirmed ? "order-status-confirmed" : "order-status-pending"}">${confirmed ? "Payment confirmed" : "Pending payment"}</strong></p>
    </div>
    <div class="review-order-items"><strong>Items</strong>
      ${items.length ? items.map((item) => `<p><span>${htmlEscape(item.name)} × ${htmlEscape(item.quantity)}</span><strong>${money(item.price * item.quantity)}</strong></p>`).join("") : '<p class="muted-copy">Order item details are unavailable.</p>'}
      <p class="review-order-total"><span>Total</span><strong>${money(order.total)}</strong></p>
    </div>
    ${confirmed ? `<div class="receipt-preview"><strong>Receipt ${receiptNumber(order)}</strong><p>Payment confirmed on ${htmlEscape(new Date(order.confirmedAt || order.date).toLocaleString("en-KE"))}.</p></div>` : ""}
  `;
  $("#orderReviewHint").textContent = confirmed
    ? "The receipt is ready. WhatsApp opens with the receipt message; review it and press Send to deliver it."
    : "Only confirm after you have verified the customer's payment. WhatsApp will open with a receipt message for you to send.";
  $("#confirmOrderButton").classList.toggle("hidden", confirmed);
  const receiptUrl = confirmed ? receiptWhatsAppUrl(order) : null;
  $("#receiptWhatsAppLink").classList.toggle("hidden", !receiptUrl);
  $("#receiptWhatsAppLink").href = receiptUrl || "#";
  $("#receiptPhoneWarning").classList.toggle("hidden", !confirmed || Boolean(receiptUrl));
  openModal("#orderReviewModal");
}
function clearProductImagePreview() {
  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  imagePreviewUrl = null;
  selectedProductImage = null;
  $("#imagePreview").removeAttribute("src");
  $("#imagePreview").classList.add("hidden");
}
function openProductEditor(product = null) {
  const form = $("#productForm");
  form.reset();
  clearProductImagePreview();
  editingProductId = product ? product.id : null;
  $("#productModalTitle").textContent = product ? "Edit product details" : "Add a new product";
  $("#saveProductButton").innerHTML = product ? "Save product changes <span>→</span>" : "Add product <span>→</span>";
  if (product) {
    form.elements.name.value = product.name;
    form.elements.category.value = product.category;
    form.elements.price.value = product.price;
    form.elements.stock.value = product.stock;
    form.elements.icon.value = product.icon || "";
    form.elements.description.value = product.description || "";
    if (product.image) {
      $("#imagePreview").src = product.image;
      $("#imagePreview").classList.remove("hidden");
    }
  }
  openModal("#productModal");
}

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
  const editProduct = event.target.closest("[data-edit-product]");
  if (editProduct) {
    const product = productById(editProduct.dataset.editProduct);
    if (product) openProductEditor(product);
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
  if (event.target.closest("[data-close-modal]")) {
    closeModal("#productModal");
    $("#productForm").reset();
    clearProductImagePreview();
    editingProductId = null;
  }
  if (event.target.closest("[data-close-checkout]")) closeModal("#checkoutModal");
  if (event.target.closest("[data-close-order-review]")) closeModal("#orderReviewModal");
  const reviewOrder = event.target.closest("[data-review-order]");
  if (reviewOrder) openOrderReview(reviewOrder.dataset.reviewOrder);
  if (event.target.closest("[data-scroll-products]")) $("#productsSection").scrollIntoView({ behavior: "smooth" });
});
$("#cartButton").addEventListener("click", openDrawer);
$("#addProductButton").addEventListener("click", () => openProductEditor());
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
  passwordRecoveryMode = false;
  if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  $("#loginError").classList.add("hidden");
  $("#passwordResetMessage").classList.add("hidden");
  event.target.reset();
  renderAdminAccess();
  const refreshed = await refreshFromBackend();
  showToast(refreshed ? "Welcome to the admin dashboard" : "Signed in, but shared store data could not be loaded.");
});
$("#forgotPasswordButton").addEventListener("click", async () => {
  const emailInput = $("#adminEmail");
  if (!emailInput.value || !emailInput.checkValidity()) {
    emailInput.reportValidity();
    return;
  }
  const button = $("#forgotPasswordButton");
  button.disabled = true;
  $("#loginError").classList.add("hidden");
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(emailInput.value.trim(), {
      redirectTo: AUTH_REDIRECT_URL
    });
    if (error) throw error;
    $("#passwordResetMessage").textContent = "If that admin account exists, Supabase has sent a password reset email.";
    $("#passwordResetMessage").classList.remove("hidden");
  } catch (error) {
    console.error("Password reset request failed.", error);
    $("#loginError").textContent = error.message || "Could not send the password reset email.";
    $("#loginError").classList.remove("hidden");
  } finally {
    button.disabled = false;
  }
});
$("#passwordRecoveryForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = new FormData(event.target).get("newPassword");
  try {
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) throw error;
    passwordRecoveryMode = false;
    adminAuthenticated = true;
    $("#passwordRecoveryForm").classList.add("hidden");
    $("#adminLoginForm").classList.remove("hidden");
    event.target.reset();
    renderAdminAccess();
    showToast("Password updated successfully.");
  } catch (error) {
    console.error("Password update failed.", error);
    $("#passwordRecoveryError").textContent = error.message;
    $("#passwordRecoveryError").classList.remove("hidden");
  }
});
supabaseClient.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") showPasswordRecovery();
});
supabaseClient.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error("Could not restore the admin session.", error);
    return;
  }
  adminAuthenticated = Boolean(data.session);
  renderAdminAccess();
  if (adminAuthenticated) refreshFromBackend();
});
$("#searchInput").addEventListener("input", renderProducts);
$("#categoryFilter").addEventListener("change", renderProducts);
function previewProductImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = "";
  clearProductImagePreview();
  selectedProductImage = file;
  imagePreviewUrl = URL.createObjectURL(file);
  $("#imagePreview").src = imagePreviewUrl;
  $("#imagePreview").classList.remove("hidden");
}
$("#productImage").addEventListener("change", previewProductImage);
$("#productCamera").addEventListener("change", previewProductImage);
$("#clearNotifications").addEventListener("click", async () => {
  if (await refreshFromBackend()) showToast("Orders refreshed");
});
$("#confirmOrderButton").addEventListener("click", async (event) => {
  const orderId = $("#orderReviewModal").dataset.orderId;
  const order = orders.find((item) => String(item.id) === String(orderId));
  if (!order || order.status === "confirmed") return;
  if (!confirm("Confirm this payment only after you have verified that it was received. Continue?")) return;
  const button = event.currentTarget;
  const whatsappWindow = window.open("about:blank", "_blank");
  button.disabled = true;
  try {
    const confirmedAt = new Date().toISOString();
    await updateRemoteOrderStatus(order.id, "confirmed", confirmedAt);
    order.status = "confirmed";
    order.confirmedAt = confirmedAt;
    notifications = orders.map((item) => ({ ...item }));
    saveNotifications();
    renderAdmin();
    openOrderReview(order.id);
    const receiptUrl = receiptWhatsAppUrl(order);
    if (receiptUrl && whatsappWindow) whatsappWindow.location.replace(receiptUrl);
    else if (whatsappWindow) whatsappWindow.close();
    showToast(receiptUrl ? "Payment confirmed. Review and send the receipt in WhatsApp." : "Payment confirmed, but the customer's phone number needs correction before WhatsApp delivery.");
  } catch (error) {
    if (whatsappWindow) whatsappWindow.close();
    console.error("Order confirmation failed.", error);
    showToast("Could not confirm the order. Check that the Supabase migration has been applied.");
  } finally {
    button.disabled = false;
  }
});
$("#productForm").addEventListener("submit", async (event) => {
  event.preventDefault(); const data = new FormData(event.target);
  const productValues = {
    name: data.get("name"),
    category: data.get("category"),
    price: Number(data.get("price")),
    stock: Number(data.get("stock")),
    icon: data.get("icon") || "✦",
    description: data.get("description") || "A thoughtful everyday essential."
  };
  try {
    if (editingProductId !== null) {
      const currentProduct = productById(editingProductId);
      const updatedProduct = await updateRemoteProduct(editingProductId, {
        name: productValues.name,
        category: productValues.category,
        price: productValues.price,
        stock: productValues.stock,
        icon: productValues.icon,
        description: productValues.description
      }, selectedProductImage);
      products = products.map((product) => product.id === editingProductId ? updatedProduct : product);
      cart = cart.map((item) => item.id === updatedProduct.id ? { ...updatedProduct, quantity: Math.min(item.quantity, updatedProduct.stock) } : item).filter((item) => item.quantity > 0);
      save(); renderProducts(); renderAdmin(); renderCart();
      showToast(`Updated ${currentProduct.name}`);
    } else {
      const created = await createRemoteProduct(productValues, selectedProductImage);
      products.unshift(created);
      save(); renderProducts(); renderAdmin();
      showToast("Product added to your catalog");
    }
    closeModal("#productModal");
    event.target.reset();
    clearProductImagePreview();
    editingProductId = null;
  } catch (error) {
    console.error("Product save failed.", error);
    showToast("Could not save product changes.");
  }
});
$("#checkoutButton").addEventListener("click", () => { if (cart.length) { closeDrawer(); openModal("#checkoutModal"); } });
$("#checkoutForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  const customer = data.get("name");
  const orderTotal = cartTotal();
  const order = { total: orderTotal, customer, phone: data.get("phone"), email: data.get("email"), address: data.get("address"), city: data.get("city"), postal: data.get("postal") };
  let savedOrder;
  try {
    savedOrder = await createRemoteOrder(order, cart);
    for (const item of cart) {
      const product = productById(item.id);
      if (product) { product.stock -= item.quantity; await updateRemoteProduct(product.id, { stock: product.stock }); }
    }
    const localOrder = {
      ...order,
      id: savedOrder.id,
      date: savedOrder.created_at,
      status: savedOrder.payment_status || "pending",
      items: cart.map((item) => ({ name: item.name, price: item.price, quantity: item.quantity }))
    };
    orders.unshift(localOrder);
    notifications = orders.map((item) => ({ ...item }));
  } catch (error) { console.error("Order submission failed.", error); showToast("Could not place the order. Please try again."); return; }
  saveNotifications();
  const orderItems = cart.map((item) => `• ${item.name} × ${item.quantity} — ${money(item.price * item.quantity)}`);
  const whatsappMessage = [
    "Hello Gitz Store, I would like to place this order:",
    "",
    ...orderItems,
    "",
    `Total: ${money(orderTotal)}`,
    `Order reference: ${savedOrder.id}`,
    `Name: ${order.customer}`,
    `Phone: ${order.phone}`,
    `Email: ${order.email}`,
    `Delivery address: ${order.address}, ${order.city}, ${order.postal}`,
    "",
    "Please guide me on how to pay via M-Pesa."
  ].join("\n");
  cart = []; save(); renderProducts(); renderAdmin(); renderCart(); closeModal("#checkoutModal"); event.target.reset();
  if ("Notification" in window && Notification.permission === "granted") new Notification("New Gitz Store order", { body: `${customer} placed an order for ${money(orderTotal)}.` });
  window.location.assign(`https://wa.me/254799934199?text=${encodeURIComponent(whatsappMessage)}`);
});
renderProducts(); renderAdminAccess(); renderCart();
refreshFromBackend();
supabaseClient.auth.getSession().then(({ data }) => {
  if (!passwordRecoveryMode) adminAuthenticated = Boolean(data.session);
  renderAdminAccess();
});

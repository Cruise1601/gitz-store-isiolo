const SUPABASE_URL = "https://lffzrfgztdasxnkljjov.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_TlMFIr5fhZrswAar2lEzrw_noKcnnUo";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const remoteProduct = (product) => ({
  id: product.id,
  name: product.name,
  category: product.category,
  price: Number(product.price),
  stock: product.stock,
  icon: product.icon || "✦",
  image: product.image_url || "",
  description: product.description || ""
});

async function loadRemoteProducts() {
  const { data, error } = await supabaseClient.from("products").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(remoteProduct);
}

async function createRemoteProduct(product, imageFile) {
  let imageUrl = "";
  if (imageFile) {
    const path = `${crypto.randomUUID()}-${imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const upload = await supabaseClient.storage.from("product-images").upload(path, imageFile, { upsert: false });
    if (upload.error) throw upload.error;
    imageUrl = supabaseClient.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }
  const { data, error } = await supabaseClient.from("products").insert({
    name: product.name, category: product.category, price: product.price,
    stock: product.stock, icon: product.icon, description: product.description, image_url: imageUrl
  }).select().single();
  if (error) throw error;
  return remoteProduct(data);
}

async function updateRemoteProduct(id, values) {
  const { data, error } = await supabaseClient.from("products").update(values).eq("id", id).select().single();
  if (error) throw error;
  return remoteProduct(data);
}

async function deleteRemoteProduct(id) {
  const { error } = await supabaseClient.from("products").delete().eq("id", id);
  if (error) throw error;
}

async function createRemoteOrder(order, items) {
  const { data, error } = await supabaseClient.from("orders").insert({
    customer_name: order.customer, email: order.email, phone: order.phone,
    address: order.address, city: order.city, postal: order.postal, total: order.total
  }).select().single();
  if (error) throw error;
  const { error: itemError } = await supabaseClient.from("order_items").insert(items.map((item) => ({
    order_id: data.id, product_id: item.id, product_name: item.name, price: item.price, quantity: item.quantity
  })));
  if (itemError) throw itemError;
  return data;
}

async function loadRemoteOrders() {
  const { data, error } = await supabaseClient.from("orders").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((order) => ({
    id: order.id, total: Number(order.total), customer: order.customer_name,
    phone: order.phone, email: order.email, date: order.created_at
  }));
}

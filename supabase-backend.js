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

async function uploadProductImage(imageFile) {
  let imageBitmap;
  if ("createImageBitmap" in window) {
    imageBitmap = await createImageBitmap(imageFile);
  } else {
    const sourceUrl = URL.createObjectURL(imageFile);
    try {
      imageBitmap = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Unable to read the product photo."));
        image.src = sourceUrl;
      });
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }
  const aspectRatio = 4 / 3;
  const imageWidth = imageBitmap.width || imageBitmap.naturalWidth;
  const imageHeight = imageBitmap.height || imageBitmap.naturalHeight;
  const cropWidth = imageWidth > imageHeight * aspectRatio ? imageHeight * aspectRatio : imageWidth;
  const cropHeight = cropWidth / aspectRatio;
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 900;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare the product photo.");
  context.drawImage(
    imageBitmap,
    (imageWidth - cropWidth) / 2,
    (imageHeight - cropHeight) / 2,
    cropWidth,
    cropHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );
  if (typeof imageBitmap.close === "function") imageBitmap.close();
  const imageBlob = await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to process the product photo.")), "image/jpeg", 0.86);
  });
  const path = `${crypto.randomUUID()}.jpg`;
  const upload = await supabaseClient.storage.from("product-images").upload(path, imageBlob, { contentType: "image/jpeg", upsert: false });
  if (upload.error) throw upload.error;
  return supabaseClient.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

async function createRemoteProduct(product, imageFile) {
  let imageUrl = "";
  if (imageFile) imageUrl = await uploadProductImage(imageFile);
  const { data, error } = await supabaseClient.from("products").insert({
    name: product.name, category: product.category, price: product.price,
    stock: product.stock, icon: product.icon, description: product.description, image_url: imageUrl
  }).select().single();
  if (error) throw error;
  return remoteProduct(data);
}

async function updateRemoteProduct(id, values, imageFile) {
  const updatedValues = { ...values };
  if (imageFile) updatedValues.image_url = await uploadProductImage(imageFile);
  const { data, error } = await supabaseClient.from("products").update(updatedValues).eq("id", id).select().single();
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

import { supabase } from '../supabase.js';

async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) window.location.href = "../index.html";
  return user;
}

// === DASHBOARD: Load produk & announcement ===
if (document.getElementById("product-list")) {
  const { data: products } = await supabase.from("products").select("*");
  const list = document.getElementById("product-list");
  list.innerHTML = products.map(p => `
    <div class="card">
      <img src="${p.image_url}" alt="${p.name}">
      <h3>${p.name}</h3>
      <p>Rp ${p.price}</p>
      <button onclick="buyNow(${p.id})">BUY</button>
      <button onclick="addToCart(${p.id})">+ Keranjang</button>
    </div>
  `).join("");

  // Announcement
  const { data: ann } = await supabase.from("announcements").select("*").single();
  if (ann) document.getElementById("announcement").innerText = ann.message;
}

// === Keranjang ===
window.addToCart = async (productId) => {
  const user = await getUser();
  await supabase.from("cart").insert([{ user_id: user.id, product_id: productId, qty: 1 }]);
  alert("Ditambahkan ke keranjang!");
};

if (document.getElementById("cart-items")) {
  const user = await getUser();
  const { data: cart } = await supabase.from("cart").select("id, qty, products(name, price)").eq("user_id", user.id);
  const div = document.getElementById("cart-items");
  div.innerHTML = cart.map(c => `
    <div>
      ${c.products.name} - Rp ${c.products.price} x ${c.qty}
    </div>
  `).join("");
  document.getElementById("checkout-btn").onclick = async () => {
    let nama = prompt("Masukkan Nama");
    let telp = prompt("Masukkan Nomor WhatsApp");
    let telegram = prompt("Masukkan Telegram (opsional)") || "";

    for (let item of cart) {
      await supabase.from("orders").insert([{
        user_id: user.id,
        product_name: item.products.name,
        qty: item.qty,
        subtotal: item.products.price * item.qty,
        buyer_name: nama,
        buyer_phone: telp,
        buyer_telegram: telegram,
        status: "pending"
      }]);
    }
    await supabase.from("cart").delete().eq("user_id", user.id);
    alert("Pesanan dikirim!");
    window.location.href = "history.html";
  };
}

// === History ===
if (document.getElementById("history-list")) {
  const user = await getUser();
  const { data: orders } = await supabase.from("orders").select("*").eq("user_id", user.id);
  const tbody = document.getElementById("history-list");
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td>${o.product_name}</td>
      <td>${o.qty}</td>
      <td>Rp ${o.subtotal}</td>
      <td>${o.status}</td>
    </tr>
  `).join("");

  supabase.channel('orders-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
      payload => {
        location.reload();
      })
    .subscribe();
}

// === BUY langsung ===
window.buyNow = async (productId) => {
  const user = await getUser();
  const { data: product } = await supabase.from("products").select("*").eq("id", productId).single();

  let nama = prompt("Masukkan Nama");
  let telp = prompt("Masukkan Nomor WhatsApp");
  let telegram = prompt("Masukkan Telegram (opsional)") || "";

  await supabase.from("orders").insert([{
    user_id: user.id,
    product_name: product.name,
    qty: 1,
    subtotal: product.price,
    buyer_name: nama,
    buyer_phone: telp,
    buyer_telegram: telegram,
    status: "pending"
  }]);

  alert("Pesanan dikirim!");
  window.location.href = "history.html";
};

// =======================
// USER SIDE SCRIPT
// =======================

// LOGIN
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      document.getElementById("msg").innerText = error.message;
    } else {
      window.location.href = "dashboard.html";
    }
  });
}

// REGISTER
const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, role: "user" } },
    });

    if (error) {
      document.getElementById("msg").innerText = error.message;
    } else {
      document.getElementById("msg").innerText = "Registrasi berhasil! Silakan login.";
    }
  });
}

// DASHBOARD (Produk & Announcement)
const productList = document.getElementById("product-list");
const announcement = document.getElementById("announcement");

async function fetchProducts() {
  const { data, error } = await supabase.from("products").select("*");
  if (error) console.error(error);
  if (productList) {
    productList.innerHTML = data
      .map(
        (p) => `
        <div class="card">
          <img src="${p.image_url}" alt="${p.name}" />
          <h3>${p.name}</h3>
          <p>Rp ${p.price}</p>
          <button onclick="buyNow(${p.id}, '${p.name}', ${p.price})">Buy</button>
          <button onclick="addToCart(${p.id}, '${p.name}', ${p.price})">+ Keranjang</button>
        </div>`
      )
      .join("");
  }
}

async function fetchAnnouncement() {
  const { data, error } = await supabase.from("announcements").select("*").limit(1).order("id", { ascending: false });
  if (!error && data.length > 0 && announcement) {
    announcement.innerHTML = `<div class="announcement">${data[0].text}</div>`;
  }
}

if (productList) {
  fetchProducts();
  fetchAnnouncement();

  supabase
    .channel("products")
    .on("postgres_changes", { event: "*", schema: "public", table: "products" }, fetchProducts)
    .subscribe();
}

// KERANJANG
const cartList = document.getElementById("cart-list");

function addToCart(id, name, price) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.push({ id, name, price, qty: 1 });
  localStorage.setItem("cart", JSON.stringify(cart));
  alert("Produk ditambahkan ke keranjang!");
}

if (cartList) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cartList.innerHTML = cart
    .map(
      (c, i) => `
      <div class="cart-item">
        ${c.name} - Rp ${c.price} x 
        <input type="number" value="${c.qty}" min="1" onchange="updateQty(${i}, this.value)" />
      </div>`
    )
    .join("");
}

function updateQty(index, qty) {
  let cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart[index].qty = parseInt(qty);
  localStorage.setItem("cart", JSON.stringify(cart));
}

// Checkout
const checkoutBtn = document.getElementById("checkout-btn");
if (checkoutBtn) {
  checkoutBtn.addEventListener("click", async () => {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    if (cart.length === 0) return alert("Keranjang kosong");

    let phone = prompt("Masukkan nomor WhatsApp:");
    let username = prompt("Masukkan username:");

    const { data: user } = await supabase.auth.getUser();

    for (let item of cart) {
      await supabase.from("orders").insert([
        {
          user_id: user.user.id,
          product_id: item.id,
          qty: item.qty,
          subtotal: item.price * item.qty,
          phone,
          username,
          status: "pending",
        },
      ]);
    }
    localStorage.removeItem("cart");
    alert("Pesanan berhasil dibuat!");
    window.location.href = "history.html";
  });
}

// HISTORY
const historyList = document.getElementById("history-list");
async function fetchHistory() {
  const { data: user } = await supabase.auth.getUser();
  const { data, error } = await supabase.from("orders").select("*, products(name)").eq("user_id", user.user.id);
  if (error) console.error(error);
  if (historyList) {
    historyList.innerHTML = data
      .map(
        (o) => `
      <div class="history-item">
        ${o.products.name} - Qty: ${o.qty} - Rp ${o.subtotal} - Status: ${o.status}
      </div>`
      )
      .join("");
  }
}

if (historyList) {
  fetchHistory();
  supabase
    .channel("orders")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchHistory)
    .subscribe();
}

// BUY langsung
async function buyNow(id, name, price) {
  let phone = prompt("Masukkan nomor WhatsApp:");
  let username = prompt("Masukkan username:");
  const { data: user } = await supabase.auth.getUser();

  await supabase.from("orders").insert([
    {
      user_id: user.user.id,
      product_id: id,
      qty: 1,
      subtotal: price,
      phone,
      username,
      status: "pending",
    },
  ]);

  alert("Pesanan berhasil dibuat!");
  window.location.href = "history.html";
}

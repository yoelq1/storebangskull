// js/user.js
import { supabase } from "./supabase.js";

const view = document.getElementById("view-area");
const navBeranda = document.getElementById("nav-beranda");
const navKeranjang = document.getElementById("nav-keranjang");
const navHistory = document.getElementById("nav-history");
const navLogout = document.getElementById("nav-logout");
const cartCountEl = document.getElementById("cart-count");
const announcementBox = document.getElementById("announcement-box");

let currentUser = null;
let ordersSubscription = null;
let announcementsSub = null;
let cartsSub = null;

async function init() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = data.user;

  // Show Beranda by default
  showBeranda();

  // load announcement & listen realtime
  loadAnnouncement();
  announcementsSub = supabase
    .channel('announcements')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, payload => {
      loadAnnouncement();
    })
    .subscribe();

  // listen carts changes for badge
  updateCartCount();
  cartsSub = supabase
    .channel('carts-'+currentUser.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'carts', filter: `user_id=eq.${currentUser.id}` }, payload => {
      updateCartCount();
      if (currentView === 'keranjang') renderKeranjang();
    })
    .subscribe();

  // listen orders status updates
  ordersSubscription = supabase
    .channel('orders-'+currentUser.id)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${currentUser.id}` }, payload => {
      if (currentView === 'history') renderHistory();
    })
    .subscribe();
}

let currentView = 'beranda';

navBeranda && navBeranda.addEventListener("click", (e) => { e.preventDefault(); showBeranda();});
navKeranjang && navKeranjang.addEventListener("click", (e) => { e.preventDefault(); showKeranjang();});
navHistory && navHistory.addEventListener("click", (e) => { e.preventDefault(); showHistory();});
navLogout && navLogout.addEventListener("click", async (e) => { e.preventDefault(); await supabase.auth.signOut(); window.location.href = "index.html"; });

async function loadAnnouncement(){
  const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(1);
  if (data && data.length) {
    announcementBox.innerHTML = `<h3>Announcement</h3><p>${data[0].message}</p>`;
  } else {
    announcementBox.innerHTML = `<h3>Announcement</h3><p class="muted">Tidak ada pengumuman.</p>`;
  }
}

async function updateCartCount(){
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;
  const { data } = await supabase.from('carts').select('id', { count: 'exact' }).eq('user_id', user.id);
  cartCountEl.textContent = data ? data.length : 0;
}

async function showBeranda(){
  currentView = 'beranda';
  setActiveNav('beranda');
  const { data: products } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  view.innerHTML = `<h2>Beranda Produk</h2><div class="product-grid" id="product-grid"></div>`;
  const grid = document.getElementById("product-grid");
  if (!products || products.length === 0) {
    grid.innerHTML = `<p class="muted">Belum ada produk. Tunggu admin menambahkan.</p>`;
    return;
  }
  products.forEach(p=>{
    const card = document.createElement('div');
    card.className = 'card product-card';
    card.innerHTML = `
      <img src="${p.image_url || 'https://via.placeholder.com/400x300?text=No+Image'}" alt="${p.name}" />
      <div style="width:100%">
        <div class="meta">
          <strong>${p.name}</strong>
          <span class="muted">Rp ${Number(p.price).toLocaleString('id-ID')}</span>
        </div>
        <p class="small muted">ID: ${p.id}</p>
        <div style="display:flex; gap:8px; margin-top:8px">
          <button class="btn" data-buy="${p.id}">BUY</button>
          <button class="btn outline" data-cart="${p.id}">Masukkan ke Keranjang</button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // attach events
  document.querySelectorAll('[data-buy]').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      const id = e.target.getAttribute('data-buy');
      const prod = products.find(x=>String(x.id) === String(id));
      await handleBuy(prod);
    });
  });
  document.querySelectorAll('[data-cart]').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      const id = e.target.getAttribute('data-cart');
      await addToCart(id);
    });
  });
}

async function handleBuy(prod){
  const buyer_name = prompt("Nama pembeli:");
  if (!buyer_name) return alert("Nama wajib diisi");
  const phone = prompt("Nomor WA / Telepon:");
  if (!phone) return alert("Nomor WA wajib diisi");
  const telegram = prompt("Telegram (opsional):") || "";

  const { data: { user } } = await supabase.auth.getUser();

  const payload = {
    user_id: user.id,
    products: JSON.stringify([{ product_id: prod.id, name: prod.name, price: Number(prod.price), qty: 1, subtotal: Number(prod.price) }]),
    subtotal: Number(prod.price),
    buyer_name, phone, telegram
  };

  const { error } = await supabase.from('orders').insert([payload]);
  if (error) return alert("Gagal buat order: " + error.message);
  alert("Order terkirim. Admin akan menghubungi Anda.");
  showHistory();
}

async function addToCart(productId){
  const { data: { user } } = await supabase.auth.getUser();
  // kalau sudah ada, tambah qty
  const { data: existing } = await supabase.from('carts').select('*').eq('user_id', user.id).eq('product_id', productId).limit(1);
  if (existing && existing.length) {
    await supabase.from('carts').update({ qty: existing[0].qty + 1 }).eq('id', existing[0].id);
  } else {
    await supabase.from('carts').insert([{ user_id: user.id, product_id: productId, qty: 1 }]);
  }
  alert("Ditambahkan ke keranjang");
  updateCartCount();
}

async function showKeranjang(){
  currentView = 'keranjang';
  setActiveNav('keranjang');
  const { data: { user } } = await supabase.auth.getUser();
  const { data: carts } = await supabase.from('carts').select('*, products(*)').eq('user_id', user.id);
  // Note: 'products(*)' requires foreign key & select; if not, fetch products separately
  view.innerHTML = `<h2>Keranjang Anda</h2><div id="cart-area" class="cart-list"></div>`;
  const area = document.getElementById('cart-area');

  // if carts did not have joined products, fetch each
  if (!carts || carts.length === 0) {
    area.innerHTML = `<p class="muted">Keranjang kosong.</p>`;
    return;
  }

  // fetch product data for each cart if necessary
  const enriched = [];
  for (const item of carts) {
    let prod = item.products;
    if (!prod) {
      const { data: pd } = await supabase.from('products').select('*').eq('id', item.product_id).single();
      prod = pd;
    }
    enriched.push({ cart: item, product: prod });
  }

  let total = 0;
  enriched.forEach(e=>{
    const subtotal = Number(e.product.price) * Number(e.cart.qty);
    total += subtotal;
    const row = document.createElement('div');
    row.className = 'card row';
    row.innerHTML = `
      <div style="display:flex; gap:12px; align-items:center">
        <img src="${e.product.image_url || 'https://via.placeholder.com/120'}" width="100" style="border-radius:8px" />
        <div>
          <strong>${e.product.name}</strong>
          <div class="small muted">Rp ${Number(e.product.price).toLocaleString('id-ID')}</div>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end;">
        <div style="display:flex; gap:8px; align-items:center;">
          <input class="qty-input" data-cartid="${e.cart.id}" type="number" min="1" value="${e.cart.qty}" />
        </div>
        <div class="small muted">Subtotal: Rp ${subtotal.toLocaleString('id-ID')}</div>
        <div class="actions" style="margin-top:8px">
          <button class="btn outline" data-remove="${e.cart.id}">Hapus</button>
        </div>
      </div>
    `;
    area.appendChild(row);
  });

  const checkoutCard = document.createElement('div');
  checkoutCard.className = 'card';
  checkoutCard.innerHTML = `
    <div class="center"><strong>Total: Rp ${total.toLocaleString('id-ID')}</strong></div>
    <div style="display:flex; gap:8px; margin-top:8px;">
      <button id="update-cart" class="btn outline">Update Keranjang</button>
      <button id="checkout" class="btn">Checkout</button>
    </div>
  `;
  area.appendChild(checkoutCard);

  // events
  document.querySelectorAll('[data-remove]').forEach(btn=> btn.addEventListener('click', async e=>{
    const id = e.target.getAttribute('data-remove');
    await supabase.from('carts').delete().eq('id', id);
    showKeranjang();
  }));

  document.getElementById('update-cart').addEventListener('click', async ()=>{
    const inputs = document.querySelectorAll('.qty-input');
    for (const inp of inputs) {
      const cid = inp.getAttribute('data-cartid');
      const qty = Number(inp.value);
      if (qty <= 0) continue;
      await supabase.from('carts').update({ qty }).eq('id', cid);
    }
    alert('Keranjang diperbarui');
    showKeranjang();
  });

  document.getElementById('checkout').addEventListener('click', async ()=>{
    // ambil semua cart lagi
    const { data: carts2 } = await supabase.from('carts').select('*').eq('user_id', (await supabase.auth.getUser()).data.user.id);
    if (!carts2 || carts2.length === 0) return alert('Keranjang kosong');

    // build products list
    const prods = [];
    let subtotal = 0;
    for (const c of carts2) {
      const { data: pd } = await supabase.from('products').select('*').eq('id', c.product_id).single();
      const s = Number(pd.price) * Number(c.qty);
      subtotal += s;
      prods.push({ product_id: pd.id, name: pd.name, price: Number(pd.price), qty: c.qty, subtotal: s });
    }

    const buyer_name = prompt("Nama pembeli:");
    if (!buyer_name) return alert("Nama wajib");
    const phone = prompt("Nomor WA:");
    if (!phone) return alert("Nomor WA wajib");

    const telegram = prompt("Telegram (opsional)") || "";

    const payload = {
      user_id: (await supabase.auth.getUser()).data.user.id,
      products: JSON.stringify(prods),
      subtotal,
      buyer_name, phone, telegram
    };

    const { error } = await supabase.from('orders').insert([payload]);
    if (error) return alert("Gagal checkout: " + error.message);
    // hapus keranjang
    await supabase.from('carts').delete().eq('user_id', payload.user_id);
    alert("Checkout sukses! Pesanan masuk ke admin.");
    showHistory();
    updateCartCount();
  });
}

async function showHistory(){
  currentView = 'history';
  setActiveNav('history');
  const { data: { user } } = await supabase.auth.getUser();
  const { data: orders } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

  view.innerHTML = `<h2>History Pesanan</h2><div id="history-area" class="history-list"></div>`;
  const area = document.getElementById('history-area');
  if (!orders || orders.length === 0) {
    area.innerHTML = `<p class="muted">Belum ada riwayat pemesanan.</p>`;
    return;
  }
  orders.forEach(o=>{
    const prods = JSON.parse(o.products);
    const itemsHtml = prods.map(p=>`<div>${p.name} x${p.qty} <span class="muted">Rp ${Number(p.subtotal).toLocaleString('id-ID')}</span></div>`).join('');
    const row = document.createElement('div');
    row.className = 'card';
    row.innerHTML = `
      <div style="display:flex; justify-content:space-between; gap:10px">
        <div>
          <strong>Order #${o.id}</strong>
          <div class="small muted">Nama: ${o.buyer_name} • ${o.phone}</div>
          <div class="small muted">Waktu: ${new Date(o.created_at).toLocaleString()}</div>
        </div>
        <div style="text-align:right">
          <div><strong>Rp ${Number(o.subtotal).toLocaleString('id-ID')}</strong></div>
          <div style="margin-top:8px"><span class="small">Status:</span> <b>${o.status.toUpperCase()}</b></div>
        </div>
      </div>
      <div style="margin-top:10px">${itemsHtml}</div>
    `;
    area.appendChild(row);
  });
}

function setActiveNav(key){
  document.querySelectorAll('.navbar a').forEach(a=> a.classList.remove('active'));
  if (key === 'beranda') document.getElementById('nav-beranda').classList.add('active');
  if (key === 'keranjang') document.getElementById('nav-keranjang').classList.add('active');
  if (key === 'history') document.getElementById('nav-history').classList.add('active');
}

window.addEventListener('load', init);

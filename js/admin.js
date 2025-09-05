// js/admin.js
import { supabase } from "./supabase.js";

const adminLoginBox = document.getElementById('admin-login-box');
const adminDashboard = document.getElementById('admin-dashboard');
const loginBtn = document.getElementById('admin-login-btn');
const adminView = document.getElementById('admin-view');

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin112233';

let currentTab = 'home';
let ordersSub = null;
let productsSub = null;
let annSub = null;

loginBtn.addEventListener('click', (e)=>{
  const u = document.getElementById('admin-username').value.trim();
  const p = document.getElementById('admin-password').value;
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    adminLoginBox.classList.add('hidden');
    adminDashboard.classList.remove('hidden');
    renderHome();
    setupNav();
    subscribeRealtime();
    alert('Berhasil login admin');
  } else {
    alert('Login admin gagal');
  }
});

function setupNav(){
  document.getElementById('admin-home').addEventListener('click', (e)=>{ e.preventDefault(); renderHome();});
  document.getElementById('admin-products').addEventListener('click', (e)=>{ e.preventDefault(); renderProducts();});
  document.getElementById('admin-orders').addEventListener('click', (e)=>{ e.preventDefault(); renderOrders();});
  document.getElementById('admin-ann').addEventListener('click', (e)=>{ e.preventDefault(); renderAnnouncement();});
  document.getElementById('admin-logout').addEventListener('click', (e)=>{ e.preventDefault(); location.reload(); });
}

function renderHome(){
  currentTab = 'home';
  adminView.innerHTML = `
    <div class="card center">
      <h2>Selamat Datang Di dashboard admin</h2>
      <p class="muted">Silakan lanjutkan ke bagian pengaturan.</p>
      <p>WEBSITE CREATED BY SKULLHOSTING</p>
    </div>
  `;
}

async function renderProducts(){
  currentTab = 'products';
  const { data: products } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  adminView.innerHTML = `
    <div style="display:flex; gap:14px; align-items:flex-start;">
      <div style="flex:1">
        <h3>Kelola Produk</h3>
        <div id="products-list" class="table"></div>
      </div>
      <div style="width:320px">
        <div class="card">
          <h4>Tambah / Update Produk</h4>
          <input id="prod-id" type="hidden" />
          <input id="prod-name" placeholder="Nama item" />
          <input id="prod-price" placeholder="Harga (angka)" />
          <input id="prod-image" placeholder="Image URL (atau kosong pakai placeholder)" />
          <div style="display:flex; gap:8px; margin-top:8px;">
            <button id="prod-save" class="btn">Simpan</button>
            <button id="prod-clear" class="btn outline">Clear</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const list = document.getElementById('products-list');
  if (!products || products.length === 0) {
    list.innerHTML = `<p class="muted">Belum ada produk.</p>`;
  } else {
    products.forEach(p=>{
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <div style="display:flex; gap:12px; align-items:center">
          <img src="${p.image_url || 'https://via.placeholder.com/120'}" width="80" style="border-radius:8px" />
          <div>
            <div><strong>${p.name}</strong></div>
            <div class="small muted">Rp ${Number(p.price).toLocaleString('id-ID')}</div>
            <div class="small muted">ID: ${p.id}</div>
          </div>
        </div>
        <div class="actions">
          <button class="btn" data-edit="${p.id}">Edit</button>
          <button class="btn btn-danger" data-delete="${p.id}">Hapus</button>
        </div>
      `;
      list.appendChild(row);
    });
  }

  document.getElementById('prod-save').addEventListener('click', async ()=>{
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value.trim();
    const price = Number(document.getElementById('prod-price').value);
    const image_url = document.getElementById('prod-image').value.trim();

    if (!name || !price) return alert('Nama & harga wajib');

    if (id) {
      await supabase.from('products').update({ name, price, image_url }).eq('id', id);
      alert('Produk diupdate');
    } else {
      await supabase.from('products').insert([{ name, price, image_url }]);
      alert('Produk ditambahkan');
    }
    renderProducts();
  });

  document.getElementById('prod-clear').addEventListener('click', ()=>{
    document.getElementById('prod-id').value='';
    document.getElementById('prod-name').value='';
    document.getElementById('prod-price').value='';
    document.getElementById('prod-image').value='';
  });

  // edit / delete handlers
  document.querySelectorAll('[data-edit]').forEach(btn=>{
    btn.addEventListener('click', async e=>{
      const id = e.target.getAttribute('data-edit');
      const { data: p } = await supabase.from('products').select('*').eq('id', id).single();
      document.getElementById('prod-id').value = p.id;
      document.getElementById('prod-name').value = p.name;
      document.getElementById('prod-price').value = p.price;
      document.getElementById('prod-image').value = p.image_url || '';
      window.scrollTo(0,0);
    });
  });

  document.querySelectorAll('[data-delete]').forEach(btn=>{
    btn.addEventListener('click', async e=>{
      const id = e.target.getAttribute('data-delete');
      if (!confirm('Hapus produk ini?')) return;
      await supabase.from('products').delete().eq('id', id);
      alert('Produk dihapus');
      renderProducts();
    });
  });
}

async function renderOrders(){
  currentTab = 'orders';
  // ambil pending/done/batal
  const { data: pending } = await supabase.from('orders').select('*').eq('status','pending').order('created_at',{ascending:false});
  const { data: done } = await supabase.from('orders').select('*').eq('status','done').order('created_at',{ascending:false});
  const { data: batal } = await supabase.from('orders').select('*').eq('status','batal').order('created_at',{ascending:false});

  adminView.innerHTML = `
    <div style="display:flex; gap:16px;">
      <div style="flex:1">
        <h3>Pending (${pending?.length||0})</h3>
        <div id="pending-list" class="table"></div>
      </div>
      <div style="width:360px">
        <h3>Done (${done?.length||0})</h3>
        <div id="done-list" class="table"></div>
        <h3 style="margin-top:12px">Batal (${batal?.length||0})</h3>
        <div id="batal-list" class="table"></div>
      </div>
    </div>
  `;

  const fillList = (containerId, arr, allowActions=false) => {
    const el = document.getElementById(containerId);
    el.innerHTML = '';
    if (!arr || arr.length===0) {
      el.innerHTML = `<p class="muted">Kosong</p>`; return;
    }
    arr.forEach(o=>{
      const prods = JSON.parse(o.products);
      const itemsHtml = prods.map(p=>`<div>${p.name} x${p.qty} <span class="muted">Rp ${Number(p.subtotal).toLocaleString('id-ID')}</span></div>`).join('');
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <div>
          <strong>Order #${o.id}</strong>
          <div class="small muted">User: ${o.user_id}</div>
          <div class="small muted">Nama: ${o.buyer_name} • ${o.phone}</div>
          <div class="small muted">Waktu: ${new Date(o.created_at).toLocaleString()}</div>
          <div style="margin-top:6px">${itemsHtml}</div>
        </div>
        <div class="actions">
          <div class="small muted">Rp ${Number(o.subtotal).toLocaleString('id-ID')}</div>
          ${allowActions ? `<button class="btn btn-green" data-done="${o.id}">Done</button><button class="btn btn-danger" data-cancel="${o.id}">Batal</button>` : ''}
        </div>
      `;
      el.appendChild(row);
    });
  };

  fillList('pending-list', pending, true);
  fillList('done-list', done, false);
  fillList('batal-list', batal, false);

  // attach action handlers
  document.querySelectorAll('[data-done]').forEach(btn=>{
    btn.addEventListener('click', async e=>{
      const id = e.target.getAttribute('data-done');
      if (!confirm('Tandai sebagai DONE? (aksi tidak bisa dibatalkan)')) return;
      await supabase.from('orders').update({ status: 'done' }).eq('id', id);
      renderOrders();
    });
  });

  document.querySelectorAll('[data-cancel]').forEach(btn=>{
    btn.addEventListener('click', async e=>{
      const id = e.target.getAttribute('data-cancel');
      if (!confirm('Tandai sebagai BATAL? (aksi tidak bisa dibatalkan)')) return;
      await supabase.from('orders').update({ status: 'batal' }).eq('id', id);
      renderOrders();
    });
  });
}

async function renderAnnouncement(){
  currentTab = 'ann';
  const { data: list } = await supabase.from('announcements').select('*').order('created_at',{ascending:false});
  adminView.innerHTML = `
    <div style="display:flex; gap:16px;">
      <div style="flex:1">
        <h3>Announcement</h3>
        <div id="ann-list" class="table"></div>
      </div>
      <div style="width:360px">
        <div class="card">
          <h4>Tambah Announcement</h4>
          <textarea id="ann-message" placeholder="Tulis pengumuman..."></textarea>
          <div style="display:flex; gap:8px; margin-top:8px;">
            <button id="ann-save" class="btn">Simpan</button>
            <button id="ann-clear" class="btn outline">Clear</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const annList = document.getElementById('ann-list');
  if (!list || list.length===0) annList.innerHTML = `<p class="muted">Belum ada pengumuman</p>`;
  else {
    list.forEach(a=>{
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <div>
          <div>${a.message}</div>
          <div class="small muted">${new Date(a.created_at).toLocaleString()}</div>
        </div>
        <div class="actions">
          <button class="btn outline" data-del="${a.id}">Hapus</button>
        </div>
      `;
      annList.appendChild(row);
    });
  }

  document.getElementById('ann-save').addEventListener('click', async ()=>{
    const msg = document.getElementById('ann-message').value.trim();
    if (!msg) return alert('Tulis pengumuman');
    await supabase.from('announcements').insert([{ message: msg }]);
    alert('Announcement ditambahkan');
    renderAnnouncement();
  });

  document.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', async e=>{
      const id = e.target.getAttribute('data-del');
      if (!confirm('Hapus announcement?')) return;
      await supabase.from('announcements').delete().eq('id', id);
      renderAnnouncement();
    });
  });
}

function subscribeRealtime(){
  // listen changes simple untuk refresh views saat tab aktif
  if (ordersSub) ordersSub.unsubscribe();
  ordersSub = supabase
    .channel('orders_admin')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload=>{
      if (currentTab === 'orders') renderOrders();
    })
    .subscribe();

  if (productsSub) productsSub.unsubscribe();
  productsSub = supabase
    .channel('products_admin')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload=>{
      if (currentTab === 'products') renderProducts();
    })
    .subscribe();

  if (annSub) annSub.unsubscribe();
  annSub = supabase
    .channel('ann_admin')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, payload=>{
      if (currentTab === 'ann') renderAnnouncement();
    })
    .subscribe();
}

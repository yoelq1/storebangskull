import { supabase } from '../supabase.js';

async function loadOrders() {
  const { data, error } = await supabase.from("orders").select("*");
  if (error) {
    alert("Gagal load pesanan: " + error.message);
    return;
  }

  const pending = data.filter(o => o.status === "pending");
  const done = data.filter(o => o.status === "done");
  const canceled = data.filter(o => o.status === "batal");

  document.getElementById("pending-orders").innerHTML = pending.map(o => `
    <tr>
      <td>${o.product_name}</td>
      <td>${o.qty}</td>
      <td>Rp ${o.subtotal}</td>
      <td>${o.buyer_name}</td>
      <td>${o.buyer_phone} / ${o.buyer_telegram || "-"}</td>
      <td>
        <button onclick="updateStatus(${o.id}, 'done')">Done</button>
        <button onclick="updateStatus(${o.id}, 'batal')">Batal</button>
      </td>
    </tr>
  `).join("");

  document.getElementById("done-orders").innerHTML = done.map(o => `
    <tr>
      <td>${o.product_name}</td>
      <td>${o.qty}</td>
      <td>Rp ${o.subtotal}</td>
      <td>DONE</td>
    </tr>
  `).join("");

  document.getElementById("canceled-orders").innerHTML = canceled.map(o => `
    <tr>
      <td>${o.product_name}</td>
      <td>${o.qty}</td>
      <td>Rp ${o.subtotal}</td>
      <td>BATAL</td>
    </tr>
  `).join("");
}

window.updateStatus = async (id, status) => {
  await supabase.from("orders").update({ status }).eq("id", id);
  loadOrders();
};

// Load awal
loadOrders();

// Realtime listener
supabase.channel("orders-realtime")
  .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, payload => {
    loadOrders();
  })
  .subscribe();

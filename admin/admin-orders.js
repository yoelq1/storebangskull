// admin/admin-orders.js
import { supabase } from "../supabase.js";

const pendingTable = document.getElementById("pending-orders");
const doneTable = document.getElementById("done-orders");
const canceledTable = document.getElementById("canceled-orders");

async function loadOrders() {
  const { data, error } = await supabase.from("orders").select("*").order("id", { ascending: true });
  if (error) {
    console.error("Gagal load pesanan:", error.message);
    return;
  }
  renderOrders(data);
}

function renderOrders(orders) {
  pendingTable.innerHTML = "";
  doneTable.innerHTML = "";
  canceledTable.innerHTML = "";

  orders.forEach((o) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${o.id}</td>
      <td>${o.username}</td>
      <td>${o.whatsapp}</td>
      <td>${o.product_name}</td>
      <td>${o.qty}</td>
      <td>${o.subtotal}</td>
      <td>${o.status}</td>
      <td>
        ${o.status === "pending" 
          ? `<button onclick="updateOrder(${o.id}, 'done')">Done</button>
             <button onclick="updateOrder(${o.id}, 'canceled')">Batal</button>`
          : ""}
      </td>
    `;

    if (o.status === "pending") pendingTable.appendChild(row);
    if (o.status === "done") doneTable.appendChild(row);
    if (o.status === "canceled") canceledTable.appendChild(row);
  });
}

window.updateOrder = async (id, status) => {
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) alert("Gagal update pesanan: " + error.message);
};

// Realtime listener
supabase.channel("orders-changes")
  .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
    loadOrders();
  })
  .subscribe();

loadOrders();

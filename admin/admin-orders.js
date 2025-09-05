// =======================
// ADMIN PESANAN SCRIPT
// =======================

const pendingOrders = document.getElementById("pending-orders");
const doneOrders = document.getElementById("done-orders");
const cancelOrders = document.getElementById("cancel-orders");

async function fetchOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*, products(name), profiles(username)")
    .order("id", { ascending: false });

  if (error) console.error(error);

  if (pendingOrders && doneOrders && cancelOrders) {
    pendingOrders.innerHTML = "";
    doneOrders.innerHTML = "";
    cancelOrders.innerHTML = "";

    data.forEach((o) => {
      if (o.status === "pending") {
        pendingOrders.innerHTML += `
          <tr>
            <td>${o.products.name}</td>
            <td>${o.qty}</td>
            <td>Rp ${o.subtotal}</td>
            <td>${o.username} (${o.phone})</td>
            <td>
              <button onclick="updateOrder(${o.id}, 'done')">Done</button>
              <button onclick="updateOrder(${o.id}, 'batal')">Batal</button>
            </td>
          </tr>`;
      } else if (o.status === "done") {
        doneOrders.innerHTML += `
          <tr>
            <td>${o.products.name}</td>
            <td>${o.qty}</td>
            <td>Rp ${o.subtotal}</td>
            <td>${o.username} (${o.phone})</td>
          </tr>`;
      } else if (o.status === "batal") {
        cancelOrders.innerHTML += `
          <tr>
            <td>${o.products.name}</td>
            <td>${o.qty}</td>
            <td>Rp ${o.subtotal}</td>
            <td>${o.username} (${o.phone})</td>
          </tr>`;
      }
    });
  }
}

async function updateOrder(id, status) {
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) console.error(error);
}

if (pendingOrders) {
  fetchOrders();
  supabase
    .channel("orders")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchOrders)
    .subscribe();
}

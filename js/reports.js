
(() => {
  "use strict";

  const TABLE = "invoices";
  const money = cents =>
    (Number(cents || 0) / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD"
    });

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  async function render() {
    const root = document.getElementById("reportsModule");
    if (!root) return;

    root.innerHTML = '<p class="muted">Loading financial reports...</p>';

    try {
      const invoices = await window.BearTrackDB.select(TABLE, {
        columns: "id,invoice_number,customer_id,property_id,description,amount_cents,due_date,status,created_at",
        orderBy: "created_at",
        ascending: false
      });

      const records = Array.isArray(invoices) ? invoices : [];
      const paid = records.filter(i => i.status === "paid");
      const outstanding = records.filter(i => i.status !== "paid");

      const totalPaid = paid.reduce(
        (sum, i) => sum + Number(i.amount_cents || 0), 0
      );
      const totalOutstanding = outstanding.reduce(
        (sum, i) => sum + Number(i.amount_cents || 0), 0
      );

      root.innerHTML = `
      <div style="margin:0 0 20px;">
  <h3>Search & Custom Reports</h3>
  <input
    id="btReportSearch"
    type="search"
    placeholder="Search invoice number or description..."
    style="width:100%;padding:12px;margin-top:10px;"
  >
</div>
<div id="btReportSearchResults" style="margin-bottom:18px;"></div>
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin:18px 0;">
          <div class="record-card">
            <span>Paid Invoice Total</span>
            <h2>${money(totalPaid)}</h2>
          </div>
          <div class="record-card">
            <span>Outstanding Invoice Total</span>
            <h2>${money(totalOutstanding)}</h2>
          </div>
          <div class="record-card">
            <span>Paid Invoices</span>
            <h2>${paid.length}</h2>
          </div>
          <div class="record-card">
            <span>Unpaid Invoices</span>
            <h2>${outstanding.length}</h2>
          </div>
        </div>

        <h3 style="margin-top:24px;">Paid Invoice History</h3>
        <div style="overflow-x:auto;">
          <table class="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Created</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${paid.length ? paid.map(i => `
                <tr>
                  <td>${escapeHTML(i.invoice_number || "—")}</td>
                  <td>${escapeHTML(i.description || "—")}</td>
                  <td>${money(i.amount_cents)}</td>
                  <td>${escapeHTML(i.created_at
                    ? new Date(i.created_at).toLocaleDateString()
                    : "—")}</td>
                  <td><span class="status InProgress">Paid</span></td>
                </tr>
              `).join("") : `
                <tr><td colspan="5">No paid invoices yet.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      `;
          connectSearch(records);
      
    } catch (error) {
      console.error("BearTrack Reports:", error);
      root.textContent = "Unable to load financial reports: " +
        (error?.message || "Unknown error");
    }
  }

  function connectSearch(records) {
    const search = document.getElementById("btReportSearch");
    const results = document.getElementById("btReportSearchResults");
    if (!search || !results) return;

    search.addEventListener("input", () => {
      const term = search.value.trim().toLowerCase();

      if (!term) {
        results.innerHTML = "";
        return;
      }

      const matches = records.filter(invoice =>
        [
          invoice.invoice_number,
          invoice.description,
          invoice.status
        ].some(value =>
          String(value ?? "").toLowerCase().includes(term)
        )
      );

      results.innerHTML = `
        <h3>Search Results (${matches.length})</h3>
        <div style="overflow-x:auto;">
          <table class="table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${matches.length ? matches.map(i => `
                <tr>
                  <td>${escapeHTML(i.invoice_number || "—")}</td>
                  <td>${escapeHTML(i.description || "—")}</td>
                  <td>${money(i.amount_cents)}</td>
                  <td>${escapeHTML(i.status || "—")}</td>
                </tr>
              `).join("") : `
                <tr><td colspan="4">No matching invoices found.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      `;
    });
  }

  window.BearTrackReports = { render, load: render };
})();

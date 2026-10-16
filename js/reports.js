
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
      const customers = await window.BearTrackDB.select('customers', {
  columns: 'id,full_name,email'
}) || [];

const properties = await window.BearTrackDB.select('properties', {
  columns: 'id,customer_id,address,city,state'
}) || [];

const customerMap = Object.fromEntries(
  customers.map(c => [c.id, c])
);

const propertyMap = Object.fromEntries(
  properties.map(p => [p.id, p])
);
      
const records = Array.isArray(invoices) ? invoices : [];
const paid = records.filter(i => i.status === "paid");
const drafts = records.filter(i => i.status === "draft");
const outstanding = records.filter(i =>
  i.status !== "paid" && i.status !== "draft"
);
      const today = new Date().toLocaleDateString('en-CA');

const pastDue = outstanding.filter(i =>
  i.due_date &&
  i.due_date < today
);

const totalPastDue = pastDue.reduce(
  (sum, i) => sum + Number(i.amount_cents || 0), 0
);

      const totalDrafts = drafts.reduce(
  (sum, i) => sum + Number(i.amount_cents || 0), 0
);
      
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

<div class="record-card" style="margin:18px 0;">
  <h3>Print & Statement Options</h3>

  <label for="btStatementType">Report Type</label>
  <select id="btStatementType" style="width:100%;padding:12px;margin:8px 0 14px;">
    <option value="single">Individual Invoice</option>
    <option value="customer">Customer Statement - All Properties</option>
    <option value="property">Property Statement - One Address</option>
    <option value="selected">Selected Invoices - Custom Statement</option>
  </select>

  <label for="btStatementStatus">Include Invoices</label>
  <select id="btStatementStatus" style="width:100%;padding:12px;margin:8px 0 14px;">
   <option value="all">All Issued Invoices - Paid and Unpaid</option>
<option value="unpaid">Unpaid Only</option>
<option value="paid">Paid Only</option>
<option value="draft">Draft Only - Internal Use</option>
  </select>
</div>

<div style="margin-top:16px;">
  <label for="btStatementSelection">Select Customer, Property, or Invoice</label>
  <select
    id="btStatementSelection"
    style="width:100%;padding:12px;margin-top:8px;"
  >
    <option value="">Choose an option...</option>
  </select>
</div>

<div id="btStatementInvoiceList" style="margin-top:14px;"></div>

<div style="margin-top:16px;">
  <button type="button" class="btn gold" id="btPrintStatement">
    Print / Save PDF
  </button>
  <button type="button" class="btn" id="btEmailStatement">
    Email Statement
  </button>
</div>
</div>
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
  <span>Draft Invoice Total</span>
  <h2>${money(totalDrafts)}</h2>
</div>
<div class="record-card">
  <span>Draft Invoices</span>
  <h2>${drafts.length}</h2>
</div>
          <div class="record-card">
            <span>Paid Invoices</span>
            <h2>${paid.length}</h2>
          </div>
          <div class="record-card">
            <span>Unpaid Invoices</span>
            <h2>${outstanding.length}</h2>
          </div>
          <div class="record-card">
  <span>Past Due Total</span>
  <h2>${money(totalPastDue)}</h2>
</div>
<div class="record-card">
  <span>Past Due Invoices</span>
  <h2>${pastDue.length}</h2>
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
        connectSearch(records, customerMap, propertyMap);
      connectStatementOptions(records, customers, properties);
      
    } catch (error) {
      console.error("BearTrack Reports:", error);
      root.textContent = "Unable to load financial reports: " +
        (error?.message || "Unknown error");
    }
  }

 function connectSearch(records, customerMap, propertyMap) {
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
    invoice.status,
    customerMap[invoice.customer_id]?.full_name,
    customerMap[invoice.customer_id]?.email,
    propertyMap[invoice.property_id]?.address,
    propertyMap[invoice.property_id]?.city,
    propertyMap[invoice.property_id]?.state
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
                  <td>
  <button type="button" class="btn"
    data-report-invoice-id="${escapeHTML(i.id)}">
    ${escapeHTML(i.invoice_number || "—")}
  </button>
</td>
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
      results.addEventListener("click", event => {
  const button = event.target.closest("[data-report-invoice-id]");
  if (!button) return;

  const invoice = records.find(
    i => String(i.id) === button.dataset.reportInvoiceId
  );

  if (invoice) {
    window.BearTrackInvoices.openInvoice(invoice);
  }
});
    });
  }
  function connectStatementOptions(records, customers, properties) {
  const type = document.getElementById("btStatementType");
  const selection = document.getElementById("btStatementSelection");
  const status = document.getElementById("btStatementStatus");
  const invoiceList = document.getElementById("btStatementInvoiceList");

  if (!type || !selection || !status || !invoiceList) return;

  function refreshOptions() {
    const mode = type.value;
    let options = [];

    if (mode === "customer") {
      options = customers.map(c => ({
        id: c.id,
        label: c.full_name || c.email || "Unnamed Customer"
      }));
    } else if (mode === "property") {
      options = properties.map(p => ({
        id: p.id,
        label: [p.address, p.city, p.state].filter(Boolean).join(", ")
      }));
    } else if (mode === "single") {
      options = records.map(i => ({
        id: i.id,
        label: `${i.invoice_number || "Invoice"} - ${i.description || ""}`
      }));
    }

    selection.innerHTML =
      '<option value="">Choose an option...</option>' +
      options.map(o =>
        `<option value="${escapeHTML(o.id)}">${escapeHTML(o.label)}</option>`
      ).join("");

    invoiceList.innerHTML = "";
  }
    function refreshInvoiceList() {
  const mode = type.value;
  const selectedId = selection.value;

  if (!selectedId) {
    invoiceList.innerHTML = "";
    return;
  }

  const matches = records.filter(invoice => {
    if (mode === "single") return invoice.id === selectedId;
    if (mode === "customer") return invoice.customer_id === selectedId;
    if (mode === "property") return invoice.property_id === selectedId;
    return false;
 }).filter(invoice => {
  if (status.value === "paid") return invoice.status === "paid";
  if (status.value === "unpaid") return invoice.status === "unpaid";
  if (status.value === "draft") return invoice.status === "draft";
  return invoice.status === "paid" || invoice.status === "unpaid";
});

  invoiceList.innerHTML = matches.length
    ? `<p><strong>${matches.length} invoice(s) selected</strong></p>` +
     matches.map(invoice => `
  <label class="record-card" style="display:flex;align-items:center;gap:12px;margin:8px 0;cursor:pointer;">
    <input
      type="checkbox"
      class="btStatementInvoice"
      value="${escapeHTML(invoice.id)}"
      checked
    >
    <span>
      <strong>${escapeHTML(invoice.invoice_number || "Invoice")}</strong>
      – ${escapeHTML(invoice.description || "")}
      – ${money(invoice.amount_cents)}
      (${escapeHTML(invoice.status || "draft")})
    </span>
  </label>
`).join("")
    
  
    : '<p class="muted">No matching invoices found.</p>';
}

  type.addEventListener("change", refreshOptions);
 
    selection.addEventListener("change", refreshInvoiceList);
status.addEventListener("change", refreshInvoiceList);
    const printButton = document.getElementById("btPrintStatement");

printButton?.addEventListener("click", () => {
  const customerMap = Object.fromEntries(
  customers.map(c => [c.id, c])
);

const propertyMap = Object.fromEntries(
  properties.map(p => [p.id, p])
);
  const selectedIds = Array.from(
    document.querySelectorAll(".btStatementInvoice:checked")
  ).map(box => box.value);

  if (!selectedIds.length) {
    alert("Please select at least one invoice.");
    return;
  }

  const selectedInvoices = records.filter(invoice =>
    selectedIds.includes(String(invoice.id))
  );
  if (selectedInvoices.some(invoice => invoice.status === "draft")) {
  const confirmed = confirm(
    "WARNING: This statement contains draft invoices that have not been issued. Continue printing for internal review only?"
  );

  if (!confirmed) return;
}
  const statementCustomers = [
  ...new Set(selectedInvoices.map(i => i.customer_id))
];

const statementProperties = [
  ...new Set(selectedInvoices.map(i => i.property_id).filter(Boolean))
];

const billTo = statementCustomers.length === 1
  ? customerMap[statementCustomers[0]]
  : null;

const statementProperty = statementProperties.length === 1
  ? propertyMap[statementProperties[0]]
  : null;

 const printWindow = window.open("", "_blank");

if (!printWindow) {
  alert("Please allow pop-ups for BearTrack to print statements.");
  return;
}

const rows = selectedInvoices.map(invoice => `
  <tr>
    <td>${escapeHTML(invoice.invoice_number || "")}</td>
    <td>${escapeHTML(invoice.description || "")}</td>
    <td>${escapeHTML(invoice.status || "")}</td>
    <td style="text-align:right">${money(invoice.amount_cents)}</td>
  </tr>
`).join("");

const total = selectedInvoices.reduce(
  (sum, invoice) => sum + Number(invoice.amount_cents || 0), 0
);

const balance = selectedInvoices
  .filter(invoice => invoice.status !== "paid")
  .reduce((sum, invoice) => sum + Number(invoice.amount_cents || 0), 0);

printWindow.document.write(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>BHM Invoice Statement</title>
    <style>
      body { font-family:Arial,sans-serif; padding:40px; color:#071f34; }
      header { border-bottom:3px solid #d19a4d; padding-bottom:18px; }
      h1 { margin-bottom:4px; }
      table { width:100%; border-collapse:collapse; margin-top:30px; }
      th,td { padding:12px; border-bottom:1px solid #ddd; text-align:left; }
      th { background:#071f34; color:white; }
      .totals { margin-top:25px; text-align:right; }
      @media print { body { padding:15px; } }
    </style>
  </head>
  <body>
   <header>
  <div style="display:flex;align-items:center;gap:20px;">
    <img
      src="/app/assets/bear-head-header.png"
      alt="Bear Home Management Logo"
      style="width:100px;height:100px;object-fit:contain;"
    >
    <div>
      <h1 style="margin:0 0 6px;">BEAR HOME MANAGEMENT</h1>
      <div>YOUR HOME HAS A TO-DO LIST. BHM HAS IT HANDLED.</div>
      <p>bearhomemanagement.com | (904) 424-9092</p>
    </div>
  </div>
</header>
    <h2>Invoice Statement</h2>
    <p>Generated: ${new Date().toLocaleDateString()}</p>
    <div style="display:flex;gap:40px;margin:24px 0;">
  <div style="flex:1;">
    <strong>Bill To:</strong>
    <p>${escapeHTML(billTo?.full_name || "Multiple Customers")}</p>
    <p>${escapeHTML(billTo?.email || "")}</p>
  </div>
  <div style="flex:1;">
    <strong>Property:</strong>
    <p>${
      statementProperty
        ? escapeHTML([
            statementProperty.address,
            statementProperty.city,
            statementProperty.state
          ].filter(Boolean).join(", "))
        : statementProperties.length > 1
          ? "Multiple Properties"
          : "No Property Listed"
    }</p>
  </div>
</div>
    <table>
      <thead>
        <tr><th>Invoice</th><th>Description</th><th>Status</th><th>Amount</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <p>Total Invoiced: <strong>${money(total)}</strong></p>
      <p>Paid: <strong>${money(total - balance)}</strong></p>
      <h2>Balance Due: ${money(balance)}</h2>
    </div>
  </body>
  </html>
`);

printWindow.document.close();

const logo = printWindow.document.querySelector("header img");

const printStatement = () => {
  printWindow.focus();
  printWindow.print();
};

if (logo && !logo.complete) {
  logo.addEventListener("load", printStatement, { once: true });
  logo.addEventListener("error", printStatement, { once: true });
} else {
  printStatement();
}
});
    const emailButton = document.getElementById("btEmailStatement");

emailButton?.addEventListener("click", () => {
  alert("Reminder: Save the invoice statement using Print / Save PDF, then attach the PDF to your email before sending.");

  const selectedIds = Array.from(
    document.querySelectorAll(".btStatementInvoice:checked")
  ).map(box => box.value);

  if (!selectedIds.length) {
    alert("Please select at least one invoice.");
    return;
  }

  const selectedInvoices = records.filter(invoice =>
    selectedIds.includes(String(invoice.id))
  );
  if (selectedInvoices.some(invoice => invoice.status === "draft")) {
  alert("Draft invoices have not been issued and cannot be emailed to customers. Please issue the invoice before sending.");
  return;
}

  const customerIds = [...new Set(
    selectedInvoices.map(invoice => invoice.customer_id)
  )];

  if (customerIds.length !== 1) {
    alert("Please select invoices belonging to one customer.");
    return;
  }

  const customer = customers.find(c => c.id === customerIds[0]);

  if (!customer?.email) {
    alert("This customer does not have an email address.");
    return;
  }

  const total = selectedInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.amount_cents || 0), 0
  );

  const balance = selectedInvoices
    .filter(invoice => invoice.status !== "paid")
    .reduce((sum, invoice) => sum + Number(invoice.amount_cents || 0), 0);

  const subject = "Bear Home Management - Invoice Statement";

  const body = [
    `Hello ${customer.full_name || "Customer"},`,
    "",
    "Please find your invoice statement details below:",
    "",
    ...selectedInvoices.map(invoice =>
      `${invoice.invoice_number || "Invoice"} - ${invoice.description || ""} - ${money(invoice.amount_cents)} (${invoice.status || "draft"})`
    ),
    "",
    `Total Invoiced: ${money(total)}`,
    `Balance Due: ${money(balance)}`,
    "",
    "Thank you,",
    "Bear Home Management",
    "bearhomemanagement.com"
  ].join("\n");

  window.location.href =
    `mailto:${customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

  refreshOptions();
}

  window.BearTrackReports = { render, load: render };
})();

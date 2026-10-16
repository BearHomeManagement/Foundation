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

    root.innerHTML = '<p class="muted">Loading BearTrack reports...</p>';

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

      const workOrders = await window.BearTrackDB.select('work_orders', {
        columns: '*'
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
        i.due_date && i.due_date < today
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
      <style>
  .bt-report-filter-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    align-items: end;
  }

  .bt-report-filter-grid > div {
    margin-top: 12px !important;
    min-width: 0;
  }

  @media (max-width: 800px) {
    .bt-report-filter-grid {
      grid-template-columns: 1fr;
    }
  }
/* BearTrack Reports - Compact Dropdown Layout */

#btReportCategory {
  width: 100% !important;
  max-width: 350px;
}

.bt-statement-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: end;
}

.bt-statement-grid > div {
  min-width: 0;
}

.bt-statement-grid select {
  width: 100%;
  box-sizing: border-box;
}

#btStatementSelection {
  width: 100% !important;
  max-width: 450px;
}

@media (max-width: 800px) {
  .bt-statement-grid {
    grid-template-columns: 1fr;
  }
}
</style>
      <div style="margin:0 0 20px;">
        <div style="margin-bottom:24px;">
          <label for="btReportCategory"
                 style="display:block;font-weight:600;margin-bottom:10px;">
            What would you like to report on?
          </label>
          <select id="btReportCategory"
                  style="width:100%;padding:12px;box-sizing:border-box;">
            <option value="financial">Invoices & Payments</option>
            <option value="workorders">Work Orders</option>
          </select>
        </div>

        <div id="btFinancialReports">
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
          <h3>Find Invoices</h3>
          <input
            id="btReportSearch"
            type="search"
            placeholder="Search invoice number or description..."
            style="width:100%;padding:12px;margin-top:10px;"
          >

          <div id="btReportSearchResults" style="margin-bottom:18px;"></div>

          <div class="record-card" style="margin:18px 0;">
            <h3>Print & Statement Options</h3>

            <div class="bt-statement-grid">
            <div>
  

            <label for="btStatementType">Report Type</label>
            <select id="btStatementType" style="width:100%;padding:12px;margin:8px 0 14px;">
              <option value="single">Individual Invoice</option>
              <option value="customer">Customer Statement - All Properties</option>
              <option value="property">Property Statement - One Address</option>
              <option value="selected">Selected Invoices - Custom Statement</option>
            </select>
            </div>
            <div>

            <label for="btStatementStatus">Include Invoices</label>
            <select id="btStatementStatus" style="width:100%;padding:12px;margin:8px 0 14px;">
              <option value="all">All Issued Invoices - Paid and Unpaid</option>
              <option value="unpaid">Unpaid Only</option>
              <option value="paid">Paid Only</option>
              <option value="draft">Draft Only - Internal Use</option>
            </select>
          </div>
          </div>

          <div style="margin-top:16px;">
            <label for="btStatementSelection">Select Customer, Property, or Invoice</label>
            <select id="btStatementSelection"
                    style="width:100%;padding:12px;margin-top:8px;">
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
        </div>

        <div id="btWorkOrderReports" style="display:none;">
          <h3>Work Order Reports</h3>
          <p class="muted">Search and filter work orders by property, owner, and status.</p>

          <input
            type="search"
            id="btWorkOrderReportSearch"
            placeholder="Search by work order, property, or owner..."
            style="width:100%;padding:12px;box-sizing:border-box;margin-top:12px;"
          >
          <div class="bt-report-filter-grid">

          <div style="margin-top:20px;">
            <label for="btWorkOrderStatus">Work Order Status</label>
            <select id="btWorkOrderStatus"
                    style="width:100%;padding:12px;box-sizing:border-box;margin-top:8px;">
              <option value="all">All Work Orders</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="complete">Completed</option>
            </select>
          </div>

          <div style="margin-top:20px;">
            <label for="btWorkOrderProperty">Property</label>
            <select id="btWorkOrderProperty"
                    style="width:100%;padding:12px;box-sizing:border-box;margin-top:8px;">
              <option value="all">All Properties</option>
            </select>
          </div>
        

          <div style="margin-top:20px;">
            <label for="btWorkOrderOwner">Customer / Owner</label>
            <select id="btWorkOrderOwner"
                    style="width:100%;padding:12px;box-sizing:border-box;margin-top:8px;">
              <option value="all">All Customers / Owners</option>
            </select>
          </div>
            </div>

          <div style="margin-top:24px;">
            <button type="button" id="btGenerateWorkOrderReport" class="btn">
              Generate Report
            </button>
          </div>

          <div id="btWorkOrderReportResults" style="margin-top:24px;">
            <p class="muted">Select your filters to generate a work order report.</p>
          </div>
        </div>
      </div>
      `;

      connectSearch(records, customerMap, propertyMap);

      const reportCategory = document.getElementById('btReportCategory');
     const reportsHeading = Array.from(
  document.querySelectorAll('h2, h3')
).find(heading =>
  heading.textContent.trim() === 'Financial Reports' &&
  !document.getElementById('reportsModule')?.contains(heading)
);
      const propertyFilter = document.getElementById('btWorkOrderProperty');
      const ownerFilter = document.getElementById('btWorkOrderOwner');

      const propertyLabel = property =>
        [property?.address, property?.city, property?.state]
          .filter(Boolean).join(', ') || 'Unknown Property';

      const customerLabel = customer =>
        customer?.full_name || customer?.email || 'Unnamed Customer';

      if (propertyFilter) {
        properties.slice()
          .sort((a, b) => propertyLabel(a).localeCompare(propertyLabel(b)))
          .forEach(property => {
            const option = document.createElement('option');
            option.value = property.id;
            option.textContent = propertyLabel(property);
            propertyFilter.appendChild(option);
          });
      }

      if (ownerFilter) {
        customers.slice()
          .sort((a, b) => customerLabel(a).localeCompare(customerLabel(b)))
          .forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = customerLabel(customer);
            ownerFilter.appendChild(option);
          });
      }

      const financialReports = document.getElementById('btFinancialReports');
      const workOrderReports = document.getElementById('btWorkOrderReports');

      reportCategory?.addEventListener('change', () => {
        const showWorkOrders = reportCategory.value === 'workorders';
        if (reportsHeading) {
  reportsHeading.textContent = showWorkOrders
    ? 'Work Order Reports'
    : 'Financial Reports';
}
        if (financialReports) {
          financialReports.style.display = showWorkOrders ? 'none' : '';
        }
        if (workOrderReports) {
          workOrderReports.style.display = showWorkOrders ? '' : 'none';
        }
      });

      reportCategory?.dispatchEvent(new Event('change'));
      connectStatementOptions(records, customers, properties);

      const reportSearch = document.getElementById('btWorkOrderReportSearch');
      const statusFilter = document.getElementById('btWorkOrderStatus');
      const generateButton = document.getElementById('btGenerateWorkOrderReport');
      const reportResults = document.getElementById('btWorkOrderReportResults');

      let lastReport = null;

      const normalizeStatus = status =>
        String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

      const statusLabel = status => ({
        open: 'Open',
        in_progress: 'In Progress',
        complete: 'Completed',
        completed: 'Completed',
        closed: 'Closed',
        cancelled: 'Cancelled'
      })[normalizeStatus(status)] || String(status || 'Not Set');

      const dateLabel = value => {
        if (!value) return '—';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
      };

      const orderCustomer = order => {
        const property = propertyMap[order.property_id];
        return customerMap[order.customer_id || property?.customer_id];
      };

      function getMatchingOrders() {
        const term = (reportSearch?.value || '').trim().toLowerCase();
        const status = statusFilter?.value || 'all';
        const propertyId = propertyFilter?.value || 'all';
        const ownerId = ownerFilter?.value || 'all';

        return (Array.isArray(workOrders) ? workOrders : []).filter(order => {
          const property = propertyMap[order.property_id];
          const customer = orderCustomer(order);

          if (
            status !== 'all' &&
            normalizeStatus(order.status) !== status &&
            !(status === 'complete' && normalizeStatus(order.status) === 'completed')
          ) return false;

          if (propertyId !== 'all' && String(order.property_id) !== propertyId) {
            return false;
          }

          if (
            ownerId !== 'all' &&
            String(order.customer_id || property?.customer_id) !== ownerId
          ) return false;

          if (!term) return true;

          return [
            order.title,
            order.description,
            order.status,
            order.id,
            propertyLabel(property),
            customer?.full_name,
            customer?.email
          ].some(value =>
            String(value ?? '').toLowerCase().includes(term)
          );
        }).sort((a, b) =>
          String(b.created_at || '').localeCompare(String(a.created_at || ''))
        );
      }

      function reportTable(orders) {
        return `<div style="overflow-x:auto;">
          <table class="table" style="width:100%;">
            <thead>
              <tr>
                <th>Work Order</th>
                <th>Description</th>
                <th>Status</th>
                <th>Property</th>
                <th>Customer / Owner</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(order => {
                const property = propertyMap[order.property_id];
                const customer = orderCustomer(order);

                return `<tr>
                  <td>${escapeHTML(order.title || 'Untitled Work Order')}</td>
                  <td style="white-space:pre-wrap;">${escapeHTML(order.description || '—')}</td>
                  <td>${escapeHTML(statusLabel(order.status))}</td>
                  <td>${escapeHTML(propertyLabel(property))}</td>
                  <td>${escapeHTML(customerLabel(customer))}</td>
                  <td>${escapeHTML(dateLabel(order.created_at))}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>`;
      }

      function generateWorkOrderReport() {
        if (!reportResults) return;

        const orders = getMatchingOrders();
        lastReport = orders;

        reportResults.innerHTML = `
          <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;">
            <div>
              <h3 style="margin:0;">Work Order Results (${orders.length})</h3>
              <p class="muted" style="margin:6px 0 0;">
                Generated ${escapeHTML(new Date().toLocaleString())}
              </p>
            </div>
            <button type="button" class="btn gold"
                    id="btPrintWorkOrderReport"
                    ${orders.length ? '' : 'disabled'}>
              Print / Save PDF
            </button>
          </div>
          ${orders.length
            ? reportTable(orders)
            : '<p class="muted">No work orders match these filters.</p>'}
        `;
      }

      generateButton?.addEventListener('click', generateWorkOrderReport);

      reportResults?.addEventListener('click', event => {
        if (
          !event.target.closest('#btPrintWorkOrderReport') ||
          !lastReport?.length
        ) return;

        const printWindow = window.open('', '_blank');

        if (!printWindow) {
          alert('Please allow pop-ups for BearTrack to print work order reports.');
          return;
        }

        const filterDescription = [
          `Search: ${reportSearch?.value.trim() || 'All'}`,
          `Status: ${statusFilter?.selectedOptions[0]?.textContent || 'All'}`,
          `Property: ${propertyFilter?.selectedOptions[0]?.textContent || 'All'}`,
          `Customer / Owner: ${ownerFilter?.selectedOptions[0]?.textContent || 'All'}`
        ];

        printWindow.document.write(`<!DOCTYPE html>
          <html>
          <head>
            <title>Bear Home Management - Work Order Report</title>
            <style>
              body{font-family:Arial,sans-serif;color:#071f34;margin:30px;}
              header{display:flex;align-items:center;gap:20px;border-bottom:3px solid #d19a4d;padding-bottom:16px;}
              header img{width:90px;height:90px;object-fit:contain;}
              h1{margin:0;font-size:24px;}
              h2{margin:22px 0 10px;}
              .filters{font-size:12px;line-height:1.7;margin:15px 0;}
              table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed;}
              th,td{padding:9px 7px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top;overflow-wrap:anywhere;}
              th{background:#071f34;color:white;}
              tr{break-inside:avoid;}
              @page{size:landscape;margin:12mm;}
            </style>
          </head>
          <body>
            <header>
              <img src="/app/assets/bear-head-header.png" alt="Bear Home Management logo">
              <div>
                <h1>BEAR HOME MANAGEMENT</h1>
                <div>YOUR HOME HAS A TO-DO LIST. BHM HAS IT HANDLED.</div>
                <p>bearhomemanagement.com | (904) 424-9092</p>
              </div>
            </header>
            <h2>Work Order Report (${lastReport.length})</h2>
            <p>Generated: ${escapeHTML(new Date().toLocaleString())}</p>
            <div class="filters">
              ${filterDescription.map(line =>
                `<div>${escapeHTML(line)}</div>`
              ).join('')}
            </div>
            ${reportTable(lastReport)}
          </body>
          </html>`);

        printWindow.document.close();

        const logo = printWindow.document.querySelector('header img');
        const print = () => {
          printWindow.focus();
          printWindow.print();
        };

        if (logo && !logo.complete) {
          logo.addEventListener('load', print, { once: true });
          logo.addEventListener('error', print, { once: true });
        } else {
          print();
        }
      });
          } catch (error) {
      console.error("BearTrack Reports:", error);
      root.textContent = "Unable to load reports: " +
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
    });

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
      } else if (mode === "selected") {
        options = [];
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

      selection.parentElement.style.display =
        mode === "selected" ? "none" : "";

      if (mode === "selected") {
        refreshInvoiceList();
      } else {
        invoiceList.innerHTML = "";
      }
    }

    function refreshInvoiceList() {
      const mode = type.value;
      const selectedId = selection.value;

      if (!selectedId && mode !== "selected") {
        invoiceList.innerHTML = "";
        return;
      }

      const matches = records.filter(invoice => {
        if (mode === "selected") return true;
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
        ? `<p><strong>${matches.length} invoice(s) available</strong></p>` +
          matches.map(invoice => `
            <label class="record-card"
              style="display:flex;align-items:center;gap:12px;margin:8px 0;cursor:pointer;">
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
        .reduce(
          (sum, invoice) => sum + Number(invoice.amount_cents || 0),
          0
        );

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>BHM Invoice Statement</title>
          <style>
            body {
              font-family:Arial,sans-serif;
              padding:40px;
              color:#071f34;
            }
            header {
              border-bottom:3px solid #d19a4d;
              padding-bottom:18px;
            }
            h1 { margin-bottom:4px; }
            table {
              width:100%;
              border-collapse:collapse;
              margin-top:30px;
            }
            th,td {
              padding:12px;
              border-bottom:1px solid #ddd;
              text-align:left;
            }
            th {
              background:#071f34;
              color:white;
            }
            .totals {
              margin-top:25px;
              text-align:right;
            }
            @media print {
              body { padding:15px; }
            }
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
              <tr>
                <th>Invoice</th>
                <th>Description</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
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
      alert(
        "Reminder: Save the invoice statement using Print / Save PDF, then attach the PDF to your email before sending."
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
        alert(
          "Draft invoices have not been issued and cannot be emailed to customers. Please issue the invoice before sending."
        );
        return;
      }

      const customerIds = [
        ...new Set(selectedInvoices.map(invoice => invoice.customer_id))
      ];

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
        (sum, invoice) => sum + Number(invoice.amount_cents || 0),
        0
      );

      const balance = selectedInvoices
        .filter(invoice => invoice.status !== "paid")
        .reduce(
          (sum, invoice) => sum + Number(invoice.amount_cents || 0),
          0
        );

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

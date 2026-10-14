// BearTrack Invoices v1 - no payment capture
(() => {
  'use strict';

  const TABLE = 'invoices';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = cents => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD'
  }).format(Number(cents || 0) / 100);

  let invoices = [];
  let customerNames = {};
  let customerEmails = {};
  
  function message(text) {
    const node = document.getElementById('btInvoiceMessage');
    if (node) node.textContent = text;
  }

  function render() {
    const target = document.getElementById('invoices');
    if (!target) return;
    target.innerHTML = `
      <div class="panel panel-pad">
        <h3>Create Invoice</h3>
        <p class="muted">Record invoices now. Online payments will be connected later.</p>
        <div class="form-grid">
          <div class="field">
           <label>Customer</label>
<select id="btInvoiceCustomer" required>
  <option value="">Loading customers...</option>
</select>
          </div>
          <div class="field">
            <label>Amount (USD)</label>
            <input id="btInvoiceAmount" inputmode="decimal" placeholder="125.00">
          </div>
          <div class="field">
            <label>Description</label>
            <input id="btInvoiceDescription" placeholder="Home Health Assessment">
          </div>
          <div class="field">
            <label>Due Date</label>
            <input id="btInvoiceDue" type="date">
          </div>
        </div>
        <div class="actions">
          <button class="btn gold" id="btCreateInvoice">Create Invoice</button>
          <button class="btn" id="btReloadInvoices">Refresh</button>
        </div>
        <p id="btInvoiceMessage" class="muted" role="status"></p>
      </div>
      <div class="panel panel-pad" style="margin-top:14px">
        <h3>Invoice History</h3>
        <div id="btInvoiceList"></div>
      </div>`;

    document.getElementById('btCreateInvoice').addEventListener('click', create);
    document.getElementById('btReloadInvoices').addEventListener('click', load);
    loadCustomers();
    load();
  }
 
async function loadCustomers() {
  const dropdown = document.getElementById('btInvoiceCustomer');
  if (!dropdown) return;

  try {
    const customers = await window.BearTrackDB.select('customers', {
      columns: 'id,full_name,email',
      orderBy: 'full_name',
      ascending: true
    });

  customerNames = {};
customerEmails = {};

customers.forEach(customer => {
  customerNames[customer.id] =
    customer.full_name || 'Unnamed Customer';

  customerEmails[customer.id] =
    customer.email || '';
});
draw();
    
    dropdown.innerHTML = '<option value="">Select a customer</option>';

    customers.forEach(customer => {
      const option = document.createElement('option');
      option.value = customer.id;
      option.textContent = customer.full_name || 'Unnamed Customer';
      dropdown.appendChild(option);
    });
  } catch (error) {
    dropdown.innerHTML = '<option value="">Unable to load customers</option>';
    message('Customer list error: ' + error.message);
  }
}

  function draw() {
    const target = document.getElementById('btInvoiceList');
    if (!target) return;
    if (!invoices.length) {
      target.textContent = 'No invoices found.';
      return;
    }
    target.innerHTML = `<div style="overflow-x:auto">
      <table class="table">
        <thead><tr><th>Invoice</th><th>Customer</th><th>Description</th><th>Amount</th><th>Status</th><th>Due</th></tr></thead>
        <tbody>${invoices.map(i => `<tr>
         <td>
  <button type="button"
    class="btn"
    data-invoice-id="${esc(i.id)}">
    ${esc(i.invoice_number || i.id)}
  </button>
</td>
          <td>${esc(customerNames[i.customer_id] || 'Unknown Customer')}</td>
          <td>${esc(i.description)}</td>
          <td>${money(i.amount_cents)}</td>
          <td>${esc(i.status)}</td>
          <td>${esc(i.due_date || '—')}</td>
        </tr>`).join('')}</tbody>
      </table></div>`;
 target.querySelectorAll('[data-invoice-id]').forEach(button => {
  button.addEventListener('click', () => {
    const invoice = invoices.find(i => i.id === button.dataset.invoiceId);
    if (invoice) openInvoice(invoice);
  });
});
  }

  function openInvoice(invoice) {
  const customer = customerNames[invoice.customer_id] || 'Unknown Customer';
  const email = customerEmails[invoice.customer_id] || '';
  const number = invoice.invoice_number || invoice.id;

  const invoiceText = [
    'BEAR HOME MANAGEMENT',
    'Invoice: ' + number,
    'Customer: ' + customer,
    'Description: ' + (invoice.description || ''),
    'Amount: ' + money(invoice.amount_cents),
    'Status: ' + (invoice.status || 'draft'),
    'Due Date: ' + (invoice.due_date || 'Not specified'),
    '',
    'bearhomemanagement.com',
    '904-424-9092'
  ].join('\n');

  const existing = document.getElementById('btInvoiceDetails');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'btInvoiceDetails';
  panel.className = 'panel panel-pad';
  panel.style.marginTop = '14px';

  panel.innerHTML = `
    <h3>Invoice Details</h3>
    <p><strong>Invoice:</strong> ${esc(number)}</p>
    <p><strong>Customer:</strong> ${esc(customer)}</p>
    <p><strong>Email:</strong> ${esc(email || 'Not available')}</p>
    <p><strong>Description:</strong> ${esc(invoice.description)}</p>
    <p><strong>Amount:</strong> ${money(invoice.amount_cents)}</p>
    <p><strong>Status:</strong> ${esc(invoice.status)}</p>
    <p><strong>Due:</strong> ${esc(invoice.due_date || 'Not specified')}</p>
  <div class="actions">
  <button class="btn gold" id="btPrintInvoice">Print / Save PDF</button>
  <button class="btn" id="btCopyInvoice">Copy Invoice</button>
  <button class="btn" id="btEmailInvoice">Email Invoice</button>
  <button class="btn" id="btMarkInvoicePaid">Mark Paid</button>
  <button class="btn" id="btDeleteInvoice">Delete Draft</button>
  <button class="btn" id="btCloseInvoice">Close</button>
</div>
  `;

  document.getElementById('btInvoiceList').after(panel);
document.getElementById('btPrintInvoice').addEventListener('click', () => {
  const printable = window.open('', '_blank');

  if (!printable) {
    message('Please allow pop-ups to print invoices.');
    return;
  }

  const logoUrl = '/assets/bear-head-hero.png';

  printable.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${esc(number)}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 45px;
          color: #071f34;
        }
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 3px solid #d19a4d;
          padding-bottom: 20px;
        }
        header img {
          width: 110px;
          height: 110px;
          object-fit: contain;
        }
        h1 { margin-bottom: 5px; }
        .tagline { font-size: 11px; color: #777; }
        .details { margin-top: 35px; line-height: 1.8; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 35px;
        }
        th {
          background: #071f34;
          color: white;
          padding: 12px;
          text-align: left;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #ddd;
        }
        .total {
          text-align: right;
          font-size: 22px;
          font-weight: bold;
          margin-top: 30px;
        }
        footer {
          margin-top: 90px;
          border-top: 2px solid #d19a4d;
          padding-top: 15px;
          text-align: center;
          font-size: 12px;
        }
        @media print {
          body { margin: 25px; }
        }
      </style>
    </head>
    <body>
      <header>
        <div>
          <h1>BEAR HOME MANAGEMENT</h1>
          <div class="tagline">
            YOUR HOME HAS A TO-DO LIST. BHM HAS IT HANDLED.
          </div>
        </div>
        <img src="${esc(logoUrl)}" alt="BHM Logo">
      </header>

      <h2>INVOICE</h2>

      <div class="details">
        <strong>Invoice:</strong> ${esc(number)}<br>
        <strong>Customer:</strong> ${esc(customer)}<br>
        <strong>Email:</strong> ${esc(email)}<br>
        <strong>Due Date:</strong> ${esc(invoice.due_date || 'Not specified')}<br>
        <strong>Status:</strong> ${esc(invoice.status || 'draft')}
      </div>

      <table>
        <thead>
          <tr><th>Description</th><th>Amount</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>${esc(invoice.description)}</td>
            <td>${money(invoice.amount_cents)}</td>
          </tr>
        </tbody>
      </table>

      <div class="total">
        Total: ${money(invoice.amount_cents)}
      </div>

      <footer>
        <strong>Bear Home Management LLC</strong><br>
        (904) 424-9092 | bearhomemanagement.com<br>
        Clay • Duval • St. Johns Counties
      </footer>
    </body>
    </html>
  `);

  printable.document.close();
  printable.focus();
});
    
  document.getElementById('btCopyInvoice').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(invoiceText);
      message('Invoice copied to clipboard.');
    } catch (err) {
      message('Unable to copy invoice: ' + err.message);
    }
  });

  document.getElementById('btEmailInvoice').addEventListener('click', () => {
    const subject = 'Bear Home Management Invoice ' + number;
    const mailto = 'mailto:' + encodeURIComponent(email) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(invoiceText);

    window.location.href = mailto;
  });
// MARK INVOICE PAID
document.getElementById('btMarkInvoicePaid').addEventListener('click', async () => {
  if (invoice.status === 'paid') {
    message('This invoice is already marked paid.');
    return;
  }

  if (invoice.status !== 'draft') {
    message('Only draft invoices can be marked paid here.');
    return;
  }

  if (!window.confirm(
    'Confirm payment has been received for invoice ' + number + '?'
  )) return;

  const button = document.getElementById('btMarkInvoicePaid');
  button.disabled = true;

  try {
    await window.BearTrackDB.update('invoices', invoice.id, {
      status: 'paid'
    });

    panel.remove();
    await load();
    message('Invoice ' + number + ' marked paid.');
  } catch (err) {
    message('Unable to mark invoice paid: ' + err.message);
    button.disabled = false;
  }
});

// DELETE DRAFT INVOICE
document.getElementById('btDeleteInvoice').addEventListener('click', async () => {
  if (invoice.status !== 'draft') {
    message('Only draft invoices can be deleted.');
    return;
  }

  if (!window.confirm(
    'Permanently delete draft invoice ' + number +
    '? This action cannot be undone.'
  )) return;

  const button = document.getElementById('btDeleteInvoice');
  button.disabled = true;

  try {
    await window.BearTrackDB.remove('invoices', invoice.id);

    panel.remove();
    await load();
    message('Draft invoice ' + number + ' deleted.');
  } catch (err) {
    message('Unable to delete invoice: ' + err.message);
    button.disabled = false;
  }
});
  document.getElementById('btCloseInvoice').addEventListener('click', () => {
    panel.remove();
  });

  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
  
  async function load() {
    try {
      invoices = await window.BearTrackDB.select(TABLE, {
        columns: 'id,customer_id,invoice_number,description,amount_cents,status,due_date,created_at',
        orderBy: 'created_at',
        ascending: false,
        limit: 100
      }) || [];
      draw();
      message('Invoices updated.');
    } catch (err) {
      message('Cannot load invoices: ' + err.message);
    }
  }

  async function create() {
    const customer_id = document.getElementById('btInvoiceCustomer').value.trim();
    const amount = document.getElementById('btInvoiceAmount').value.trim();
    const description = document.getElementById('btInvoiceDescription').value.trim();
    const due_date = document.getElementById('btInvoiceDue').value || null;

    if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(customer_id))
      return message('Enter a valid customer UUID.');
    if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(amount))
      return message('Enter a valid dollar amount, such as 125.00.');

    const amount_cents = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(amount_cents) || amount_cents <= 0)
      return message('Amount must be greater than zero.');
    if (!description) return message('Enter a description.');

    const button = document.getElementById('btCreateInvoice');
    button.disabled = true;
    try {
      await window.BearTrackDB.insert(TABLE, {
        customer_id, amount_cents, description, due_date, status: 'draft'
      });
      message('Draft invoice created. No payment was charged.');
      await load();
    } catch (err) {
      message('Could not create invoice: ' + err.message);
    } finally {
      button.disabled = false;
    }
  }

  window.BearTrackInvoices = { render, load };
})();
  


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
      columns: 'id,full_name',
      orderBy: 'full_name',
      ascending: true
    });

   customerNames = {};
customers.forEach(customer => {
  customerNames[customer.id] = customer.full_name || 'Unnamed Customer';
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
          <td>${esc(i.invoice_number || i.id)}</td>
          <td>${esc(customerNames[i.customer_id] || 'Unknown Customer')}</td>
          <td>${esc(i.description)}</td>
          <td>${money(i.amount_cents)}</td>
          <td>${esc(i.status)}</td>
          <td>${esc(i.due_date || '—')}</td>
        </tr>`).join('')}</tbody>
      </table></div>`;
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
  

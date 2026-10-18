
/* BearTrack Documents Center */
(() => {
  'use strict';

  const TABLE = 'documents';
  const BUCKET = 'beartrack-documents';
  let documents = [];

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

 async function getClient() {
  return await window.BearTrackDB.getClient();
  }

  function getHomes() {
    return window.BearTrackProperties?.getAll?.() || [];
  }

  function homeLabel(id) {
    const home = getHomes().find(item => item.id === id);
    return home?.address || home?.street_address || id || 'Unassigned';
  }

  async function load() {
   const client = await getClient();
    if (!client) {
      console.warn('Documents: Supabase client unavailable.');
      render();
      return;
    }

    const { data, error } = await client
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Documents loading failed:', error);
      return;
    }

    documents = data || [];
    render();
  }

  function render() {
    const target = document.getElementById('documentList');
    if (!target) return;

    const homes = getHomes();
    const homeOptions = homes.map(home => `
      <option value="${escapeHtml(home.id)}">
        ${escapeHtml(home.address || home.street_address || home.id)}
      </option>
    `).join('');

    target.innerHTML = `
      <style>
        #documentList .bt-doc-card {
          padding: 22px;
          margin-bottom: 20px;
          border: 1px solid #28516d;
          border-radius: 14px;
          background: linear-gradient(135deg, #102c43, #071e30);
        }
        #documentList .bt-doc-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          margin-bottom: 20px;
        }
        #documentList .bt-doc-heading h3 { margin: 0; }
        #documentList .bt-doc-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }
        #documentList .bt-doc-field label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
        }
        #documentList input:not([type="file"]),
        #documentList select,
        #documentList textarea {
          box-sizing: border-box;
          width: 100%;
          padding: 12px;
          border: 1px solid #41627c;
          border-radius: 8px;
          background: #112e46;
          color: #fff;
          font: inherit;
        }
        #documentList input::placeholder,
        #documentList textarea::placeholder { color: #9eb3c5; }
        #documentList .bt-doc-notes { margin-top: 16px; }
        #documentList .bt-doc-bottom {
          display: flex;
          align-items: end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 18px;
          margin-top: 16px;
        }
        #documentList input[type="file"] {
          max-width: 100%;
          color: #d8e6f1;
        }
        #documentList .bt-doc-primary {
          background: #0879df;
          color: #fff;
          border: 0;
          border-radius: 9px;
          padding: 13px 24px;
          font-weight: 700;
          cursor: pointer;
        }
        #documentList .bt-doc-primary:disabled {
          opacity: .55;
          cursor: wait;
        }
        #documentList .bt-doc-filters {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        #documentList .bt-doc-filters input { flex: 1 1 220px; }
        #documentList .bt-doc-filters select { flex: 0 1 240px; }
        #documentList .bt-doc-table-wrap { overflow-x: auto; }
        #documentList .bt-doc-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
          text-align: left;
        }
        #documentList .bt-doc-table th,
        #documentList .bt-doc-table td {
          padding: 14px 12px;
          border-bottom: 1px solid #28445a;
          vertical-align: middle;
        }
        #documentList .bt-doc-table th {
          background: #183a54;
          font-size: 13px;
        }
        #documentList .bt-doc-table small {
          display: block;
          margin-top: 4px;
          color: #a8c2d6;
        }
        #documentList .bt-doc-tag {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 7px;
          background: #174c80;
          color: #fff;
          font-size: 12px;
          white-space: nowrap;
        }
        #documentList .bt-doc-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        #documentList .bt-doc-actions button {
          padding: 8px 10px;
          background: #173b58;
          color: #fff;
          border: 1px solid #386381;
          border-radius: 7px;
          cursor: pointer;
        }
        @media (max-width: 850px) {
          #documentList .bt-doc-grid { grid-template-columns: 1fr; }
          #documentList .bt-doc-filters > * { flex: 1 1 100% !important; }
        }
      </style>

      <div class="bt-doc-card">
        <div class="bt-doc-heading">
          <h3>☁️ Upload Property Document</h3>
          <small class="muted">PDF, DOC, DOCX, JPG, PNG, WEBP, TXT · Max 25 MB</small>
        </div>

        <div class="bt-doc-grid">
          <div class="bt-doc-field">
            <label for="docHome">Home</label>
            <select id="docHome">
              <option value="">Select a home</option>
              ${homeOptions}
            </select>
          </div>
          <div class="bt-doc-field">
            <label for="docTitle">Document Title</label>
            <input id="docTitle" placeholder="Example: HVAC Warranty">
          </div>
          <div class="bt-doc-field">
            <label for="docType">Document Type</label>
            <select id="docType">
              <option value="warranty">Warranty</option>
              <option value="assessment">Assessment</option>
              <option value="service_record">Service Record</option>
              <option value="invoice">Invoice</option>
              <option value="manual">Manual</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div class="bt-doc-field bt-doc-notes">
          <label for="docNotes">Notes</label>
          <textarea id="docNotes" rows="2"
            placeholder="Optional document details..."></textarea>
        </div>

        <div class="bt-doc-bottom">
          <div class="bt-doc-field">
            <label for="docFile">Choose File</label>
            <input id="docFile" type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt">
          </div>
          <button id="docUploadBtn" class="bt-doc-primary" type="button">
            ☁ Upload Document
          </button>
        </div>
        <p id="docMessage" class="muted" aria-live="polite"></p>
      </div>

      <div class="bt-doc-card">
        <div class="bt-doc-heading">
          <h3>📄 Property Documents</h3>
          <div class="bt-doc-filters">
            <input id="docSearch" placeholder="Search documents...">
            <select id="docFilter" aria-label="Filter by home">
              <option value="all">All Homes</option>
              ${homeOptions}
            </select>
          </div>
        </div>
        <div id="docResults"></div>
      </div>
    `;

    target.querySelector('#docUploadBtn')
      ?.addEventListener('click', upload);
    target.querySelector('#docFilter')
      ?.addEventListener('change', renderResults);
    target.querySelector('#docSearch')
      ?.addEventListener('input', renderResults);

    renderResults();
  }

  function renderResults() {
    const target = document.getElementById('docResults');
    if (!target) return;

    const filter = document.getElementById('docFilter')?.value || 'all';
    const search = (document.getElementById('docSearch')?.value || '')
      .trim().toLowerCase();

    const filtered = documents.filter(doc => {
      const matchesHome = filter === 'all' || doc.property_id === filter;
      const searchable = [
        doc.title, doc.document_type, doc.notes,
        homeLabel(doc.property_id)
      ].join(' ').toLowerCase();

      return matchesHome && searchable.includes(search);
    });

    if (!filtered.length) {
      target.innerHTML = '<p class="muted">No matching documents found.</p>';
      return;
    }

    const typeLabel = value => ({
      warranty: 'Warranty',
      assessment: 'Assessment',
      service_record: 'Service Record',
      invoice: 'Invoice',
      manual: 'Manual',
      other: 'Other'
    })[value] || value || 'Document';

    target.innerHTML = `
      <div class="bt-doc-table-wrap">
        <table class="bt-doc-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Property</th>
              <th>Type</th>
              <th>Notes</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(doc => `
              <tr>
                <td><strong>${escapeHtml(doc.title || 'Untitled')}</strong></td>
                <td>${escapeHtml(homeLabel(doc.property_id))}</td>
                <td><span class="bt-doc-tag">${escapeHtml(typeLabel(doc.document_type))}</span></td>
                <td>${escapeHtml(doc.notes || '—')}</td>
                <td>${doc.created_at
                  ? escapeHtml(new Date(doc.created_at).toLocaleDateString())
                  : '—'}</td>
                <td>
                  <div class="bt-doc-actions">
                    <button type="button" data-doc-open="${escapeHtml(doc.id)}" title="View document">View</button>
                    <button type="button" data-doc-print="${escapeHtml(doc.id)}" title="Print document">Print</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    target.querySelectorAll('[data-doc-open]').forEach(button => {
      button.addEventListener('click', () =>
        openDocument(button.dataset.docOpen, false));
    });

    target.querySelectorAll('[data-doc-print]').forEach(button => {
      button.addEventListener('click', () =>
        openDocument(button.dataset.docPrint, true));
    });
  }



    target.querySelectorAll('[data-doc-print]').forEach(button => {
      button.addEventListener('click', () =>
        openDocument(button.dataset.docPrint, true));
    });
  }

  async function upload() {
   const client = await getClient();
    const propertyId = document.getElementById('docHome')?.value;
    const title = document.getElementById('docTitle')?.value.trim();
    const type = document.getElementById('docType')?.value;
    const notes = document.getElementById('docNotes')?.value.trim();
    const file = document.getElementById('docFile')?.files?.[0];
    const message = document.getElementById('docMessage');
    const button = document.getElementById('docUploadBtn');

    if (!client || !propertyId || !title || !file) {
      if (message) message.textContent =
        'Select a home, enter a title, and choose a file.';
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      if (message) message.textContent =
        'The file must be 25 MB or smaller.';
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${propertyId}/${crypto.randomUUID()}-${safeName}`;

    button.disabled = true;
    if (message) message.textContent = 'Uploading document...';

    try {
      const { error: uploadError } = await client.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { error: recordError } = await client
        .from(TABLE)
        .insert({
          property_id: propertyId,
          file_url: path,
          document_type: type,
          title,
          notes
        });

      if (recordError) {
        await client.storage.from(BUCKET).remove([path]);
        throw recordError;
      }

      await load();
      if (message) message.textContent = 'Document uploaded successfully.';
    } catch (error) {
      console.error('Document upload failed:', error);
      if (message) message.textContent =
        `Upload failed: ${error.message || 'Unknown error'}`;
    } finally {
      button.disabled = false;
    }
  }

  async function openDocument(id, print = false) {
    const doc = documents.find(item => String(item.id) === String(id));
    const client = await getClient();
    if (!doc || !client) return;

    const { data, error } = await client.storage
      .from(BUCKET)
      .createSignedUrl(doc.file_url, 60);

    if (error || !data?.signedUrl) {
      alert('Unable to open this document.');
      return;
    }

    const tab = window.open(data.signedUrl, '_blank', 'noopener,noreferrer');

    if (!tab) {
      alert('Please allow pop-ups to open this document.');
      return;
    }

    if (print) {
      alert('The document opened in a new tab. Use Ctrl+P to print it.');
    }
  }

  window.BearTrackDocuments = {
    load,
    render,
    getAll: () => [...documents]
  };
})();


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

    target.innerHTML = `
      <div class="record-card" style="padding:18px;margin-bottom:18px;">
        <h3>Upload Property Document</h3>

        <label for="docHome">Home</label>
        <select id="docHome">
          <option value="">Select a home</option>
          ${homes.map(home => `
            <option value="${escapeHtml(home.id)}">
              ${escapeHtml(home.address || home.street_address || home.id)}
            </option>
          `).join('')}
        </select>

        <label for="docTitle">Document Title</label>
        <input id="docTitle" placeholder="Example: HVAC Warranty">

        <label for="docType">Document Type</label>
        <select id="docType">
          <option value="warranty">Warranty</option>
          <option value="assessment">Assessment</option>
          <option value="service_record">Service Record</option>
          <option value="invoice">Invoice</option>
          <option value="manual">Manual</option>
          <option value="other">Other</option>
        </select>

        <label for="docNotes">Notes</label>
        <textarea id="docNotes" rows="3"
          placeholder="Optional document details"></textarea>

        <label for="docFile">Choose File</label>
        <input id="docFile" type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt">

        <button id="docUploadBtn" type="button">
          Upload Document
        </button>
        <p id="docMessage" class="muted"></p>
      </div>

      <div class="record-card" style="padding:18px;">
        <h3>Property Documents</h3>

        <label for="docFilter">View by Home</label>
        <select id="docFilter">
          <option value="all">All Homes</option>
          ${homes.map(home => `
            <option value="${escapeHtml(home.id)}">
              ${escapeHtml(home.address || home.street_address || home.id)}
            </option>
          `).join('')}
        </select>

        <div id="docResults"></div>
      </div>
    `;

    target.querySelector('#docUploadBtn')
      ?.addEventListener('click', upload);

    target.querySelector('#docFilter')
      ?.addEventListener('change', renderResults);

    renderResults();
  }

  function renderResults() {
    const target = document.getElementById('docResults');
    if (!target) return;

    const filter = document.getElementById('docFilter')?.value || 'all';
    const filtered = documents.filter(doc =>
      filter === 'all' || doc.property_id === filter
    );

    if (!filtered.length) {
      target.innerHTML = '<p class="muted">No documents found.</p>';
      return;
    }

    target.innerHTML = filtered.map(doc => `
      <div class="record-card" style="margin-top:12px;padding:14px;">
        <strong>${escapeHtml(doc.title || 'Untitled')}</strong>
        <p class="muted">
          ${escapeHtml(homeLabel(doc.property_id))}
          — ${escapeHtml(doc.document_type || 'Document')}
        </p>
        <p>${escapeHtml(doc.notes || '')}</p>
        <button type="button" data-doc-open="${escapeHtml(doc.id)}">
          View / Download
        </button>
        <button type="button" data-doc-print="${escapeHtml(doc.id)}">
          Print
        </button>
      </div>
    `).join('');

    target.querySelectorAll('[data-doc-open]').forEach(button => {
      button.addEventListener('click', () =>
        openDocument(button.dataset.docOpen, false));
    });

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

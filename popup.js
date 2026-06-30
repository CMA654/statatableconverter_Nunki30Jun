function parseStataTable(text) {
  const lines = text.split(/\r?\n/);
  let headerCols = null;
  let rows = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\u00A0/g, ' '); // non-breaking spaces
    if (!line.trim()) continue;
    if (!line.includes('|')) continue;

    // skip separator lines like "-------------+---------------------------------------------------------"
    const noPipe = line.replace(/\|/g, '');
    if (/^[-+\s]+$/.test(noPipe)) continue;

    const pipeIdx = line.indexOf('|');
    const left = line.slice(0, pipeIdx).trim();
    const right = line.slice(pipeIdx + 1);

    // split right side on runs of 2+ spaces (keeps multi-word labels like "Std. dev." intact)
    const cells = right.split(/\s{2,}/).map(c => c.trim()).filter(c => c.length > 0);

    if (!headerCols) {
      headerCols = [left || 'Variable', ...cells];
    } else {
      rows.push([left, ...cells]);
    }
  }

  return { headerCols, rows };
}

function renderTable(headerCols, rows) {
  const outDiv = document.getElementById('output');
  if (!headerCols || rows.length === 0) {
    outDiv.innerHTML = '<p style="color:red;font-size:12px">Không nhận diện được bảng. Hãy kiểm tra lại dữ liệu dán vào.</p>';
    return;
  }
  let html = '<table><thead><tr>';
  headerCols.forEach(h => html += `<th>${escapeHtml(h)}</th>`);
  html += '</tr></thead><tbody>';
  rows.forEach(r => {
    html += '<tr>';
    headerCols.forEach((_, i) => html += `<td>${escapeHtml(r[i] !== undefined ? r[i] : '')}</td>`);
    html += '</tr>';
  });
  html += '</tbody></table>';
  outDiv.innerHTML = html;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toTSV(headerCols, rows) {
  const lines = [headerCols.join('\t')];
  rows.forEach(r => {
    const padded = headerCols.map((_, i) => (r[i] !== undefined ? r[i] : ''));
    lines.push(padded.join('\t'));
  });
  return lines.join('\n');
}

let lastParsed = null;

document.getElementById('convertBtn').addEventListener('click', () => {
  const text = document.getElementById('input').value;
  lastParsed = parseStataTable(text);
  renderTable(lastParsed.headerCols, lastParsed.rows);
  document.getElementById('status').textContent = '';
});

document.getElementById('copyBtn').addEventListener('click', async () => {
  if (!lastParsed) {
    const text = document.getElementById('input').value;
    lastParsed = parseStataTable(text);
    renderTable(lastParsed.headerCols, lastParsed.rows);
  }
  if (!lastParsed.headerCols || lastParsed.rows.length === 0) return;
  const tsv = toTSV(lastParsed.headerCols, lastParsed.rows);
  try {
    await navigator.clipboard.writeText(tsv);
    document.getElementById('status').textContent = 'Đã copy! Paste vào Excel.';
  } catch (e) {
    document.getElementById('status').textContent = 'Lỗi copy: ' + e.message;
  }
});

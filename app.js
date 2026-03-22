const BACKEND_URL = '';

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const slideRef = document.getElementById('slideRef');
const kitLot = document.getElementById('kitLot');
const slideLot = document.getElementById('slideLot');
const processBtn = document.getElementById('processBtn');
const spinner = document.getElementById('spinner');
const errorMsg = document.getElementById('errorMsg');
const padList = document.getElementById('padList');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');

let selectedFile = null;

// Build pad rows 1-16
for (let i = 1; i <= 16; i++) {
    const row = document.createElement('div');
    row.className = 'pad-row';
    row.dataset.pad = i;
    row.innerHTML = `
        <input type="checkbox" id="pad${i}" value="${i}">
        <label class="pad-label" for="pad${i}">Pad ${i}</label>
        <input type="text" class="test-ref-input" placeholder="Test Reference (optional)">
    `;
    const checkbox = row.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => {
        row.classList.toggle('selected', checkbox.checked);
        updateProcessBtn();
    });
    padList.appendChild(row);
}

// Select All / Clear All
document.getElementById('selectAll').addEventListener('click', () => {
    padList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
        cb.closest('.pad-row').classList.add('selected');
    });
    updateProcessBtn();
});

document.getElementById('clearAll').addEventListener('click', () => {
    padList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        cb.closest('.pad-row').classList.remove('selected');
    });
    updateProcessBtn();
});

// Drag & drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
});

dropZone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') {
        fileInput.click();
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) setFile(fileInput.files[0]);
});

function setFile(file) {
    selectedFile = file;
    fileName.textContent = file.name;
    fileName.classList.add('loaded');
    dropZone.classList.add('has-file');
    updateProcessBtn();
    hideError();
}

function getSelectedPads() {
    const selected = [];
    padList.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        const row = cb.closest('.pad-row');
        selected.push({
            pad: parseInt(cb.value),
            testRef: row.querySelector('.test-ref-input').value.trim()
        });
    });
    return selected;
}

function updateProcessBtn() {
    processBtn.disabled = !(selectedFile && getSelectedPads().length > 0);
}

processBtn.addEventListener('click', processFiles);

async function processFiles() {
    hideError();
    const pads = getSelectedPads();
    if (!pads.length) return;

    // Validate test reference is filled for all selected pads
    const missing = pads.filter(p => !p.testRef);
    if (missing.length) {
        showError(`Test Reference is required for: ${missing.map(p => 'Pad ' + p.pad).join(', ')}`);
        return;
    }

    setLoading(true);
    progressBar.classList.remove('hidden');
    setProgress(0, pads.length);

    const zip = new JSZip();
    const errors = [];

    for (let i = 0; i < pads.length; i++) {
        const { pad, testRef } = pads[i];
        try {
            const blob = await fetchPad(pad, testRef);
            let csvName = `pad${pad}`;
            if (testRef) csvName += `_${testRef}`;
            csvName += '.csv';
            zip.file(csvName, blob);
        } catch (err) {
            errors.push(`Pad ${pad}: ${err.message}`);
        }
        setProgress(i + 1, pads.length);
    }

    if (Object.keys(zip.files).length > 0) {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, 'foodprint_results.zip');
    }

    if (errors.length) {
        showError('Some pads failed:\n' + errors.join('\n'));
    }

    setLoading(false);
    setTimeout(() => progressBar.classList.add('hidden'), 1500);
}

async function fetchPad(pad, testRef) {
    const formData = new FormData();
    formData.append('gpr_file', selectedFile);
    formData.append('pad', pad);
    formData.append('test_ref', testRef);
    formData.append('slide_ref', slideRef.value.trim());
    formData.append('kit_lot', kitLot.value.trim());
    formData.append('slide_lot', slideLot.value.trim());

    const response = await fetch(`${BACKEND_URL}/process`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Server error: ${response.status}`);
    }

    return await response.blob();
}

function setProgress(done, total) {
    const pct = total ? Math.round((done / total) * 100) : 0;
    progressFill.style.width = pct + '%';
    progressLabel.textContent = `${done} / ${total}`;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function setLoading(loading) {
    processBtn.disabled = loading;
    document.querySelector('.btn-text').textContent = loading ? 'Processing...' : 'Process & Download ZIP';
    spinner.classList.toggle('hidden', !loading);
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}

function hideError() {
    errorMsg.classList.add('hidden');
}

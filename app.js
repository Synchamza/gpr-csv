const BACKEND_URL = 'http://localhost:5000';

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const padSelect = document.getElementById('padSelect');
const testRef = document.getElementById('testRef');
const slideRef = document.getElementById('slideRef');
const kitLot = document.getElementById('kitLot');
const slideLot = document.getElementById('slideLot');
const processBtn = document.getElementById('processBtn');
const spinner = document.getElementById('spinner');
const errorMsg = document.getElementById('errorMsg');

let selectedFile = null;

// Drag & drop handlers
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

padSelect.addEventListener('change', updateProcessBtn);

function updateProcessBtn() {
    processBtn.disabled = !(selectedFile && padSelect.value);
}

processBtn.addEventListener('click', processFile);

async function processFile() {
    hideError();
    setLoading(true);

    const formData = new FormData();
    formData.append('gpr_file', selectedFile);
    formData.append('pad', padSelect.value);
    formData.append('test_ref', testRef.value.trim());
    formData.append('slide_ref', slideRef.value.trim());
    formData.append('kit_lot', kitLot.value.trim());
    formData.append('slide_lot', slideLot.value.trim());

    try {
        const response = await fetch(`${BACKEND_URL}/process`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || `Server error: ${response.status}`);
        }

        // Extract filename from Content-Disposition header if available
        const disposition = response.headers.get('Content-Disposition');
        let outFilename = `foodprint_pad${padSelect.value}.csv`;
        if (disposition) {
            const match = disposition.match(/filename[^;=\n]*=['"]?([^'"\n;]+)/);
            if (match) outFilename = match[1];
        }

        const blob = await response.blob();
        downloadBlob(blob, outFilename);
    } catch (err) {
        showError(err.message);
    } finally {
        setLoading(false);
    }
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
    document.querySelector('.btn-text').textContent = loading ? 'Processing...' : 'Process & Download CSV';
    spinner.classList.toggle('hidden', !loading);
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}

function hideError() {
    errorMsg.classList.add('hidden');
}

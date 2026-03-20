// ── DOM refs ──────────────────────────────────────────
const video         = document.getElementById('video');
const canvas        = document.getElementById('canvas');
const navTrain      = document.getElementById('navTrain');
const navTest       = document.getElementById('navTest');
const trainPanel    = document.getElementById('trainPanel');
const testPanel     = document.getElementById('testPanel');
const nameInput     = document.getElementById('nameInput');
const captureBtn    = document.getElementById('captureBtn');
const trainBtn      = document.getElementById('trainBtn');
const resetBtn      = document.getElementById('resetBtn');
const testBtn       = document.getElementById('testBtn');
const scanLine      = document.getElementById('scanLine');
const faceRing      = document.getElementById('faceRing');
const scanInfo      = document.getElementById('scanInfo');
const sidebarStatus = document.getElementById('sidebarStatus');
const camDot        = document.getElementById('camDot');
const pageTitle     = document.getElementById('pageTitle');
const pageDesc      = document.getElementById('pageDesc');
const resultName    = document.getElementById('resultName');
const resultAvatar  = document.getElementById('resultAvatar');
const confBar       = document.getElementById('confBar');
const confPct       = document.getElementById('confPct');
const confStrip     = document.getElementById('confidenceStrip');
const thumbs        = [
    document.getElementById('thumb1'),
    document.getElementById('thumb2'),
    document.getElementById('thumb3')
];

// ── State ─────────────────────────────────────────────
let stream        = null;
let captures      = [];     // base64 images for training
let isTesting     = false;
let testInterval  = null;

// ── Camera init ───────────────────────────────────────
async function initCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: 'user' }
        });
        video.srcObject = stream;
        setCamStatus('active', 'Camera Active');
    } catch (err) {
        console.error('Camera error:', err);
        setCamStatus('error', 'Camera Error');
        toast('Camera Error', 'Could not access webcam. Check browser permissions.', 'error');
    }
}

function setCamStatus(state, label) {
    camDot.className = 'status-dot ' + (state === 'active' ? 'active' : state === 'error' ? 'error' : '');
    sidebarStatus.textContent = label;
}

// ── Tab switching ─────────────────────────────────────
navTrain.addEventListener('click', () => switchTab('train'));
navTest.addEventListener('click',  () => switchTab('test'));

function switchTab(tab) {
    if (tab === 'train') {
        navTrain.classList.add('active');
        navTest.classList.remove('active');
        trainPanel.style.display = 'flex';
        testPanel.style.display  = 'none';
        pageTitle.textContent = 'Enroll New Face';
        pageDesc.textContent  = 'Position your face inside the frame and capture';
        stopTesting();
        confStrip.style.display = 'none';
    } else {
        navTest.classList.add('active');
        navTrain.classList.remove('active');
        testPanel.style.display  = 'flex';
        trainPanel.style.display = 'none';
        pageTitle.textContent = 'Face Recognition';
        pageDesc.textContent  = 'Start recognition to identify faces in real-time';
        confStrip.style.display = 'flex';
    }
}

// ── Capture image ─────────────────────────────────────
function captureFrame() {
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    // mirror the canvas to match the mirrored video
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    return canvas.toDataURL('image/jpeg', 0.9);
}

// ── Train: Capture button ─────────────────────────────
captureBtn.addEventListener('click', () => {
    if (captures.length >= 3) {
        toast('Limit Reached', 'Clear captures before capturing more.', 'warning');
        return;
    }

    const img = captureFrame();
    const idx = captures.length;
    captures.push(img);

    // Update thumbnail
    const thumb = thumbs[idx];
    thumb.innerHTML = '';
    const imgEl = document.createElement('img');
    imgEl.src = img;
    thumb.appendChild(imgEl);

    const check = document.createElement('div');
    check.className = 'check';
    check.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>`;
    thumb.appendChild(check);
    thumb.classList.add('filled');

    if (captures.length === 3) {
        trainBtn.disabled = false;
        toast('Ready to Enroll', 'All 3 captures complete. Enter a name and save.', 'success');
    }
});

// ── Train: Save & Enroll ──────────────────────────────
trainBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) {
        toast('Missing Name', 'Please enter the person\'s full name.', 'warning');
        nameInput.focus();
        return;
    }

    trainBtn.disabled = true;
    trainBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> Enrolling…`;

    let success = false;
    for (let i = 0; i < captures.length; i++) {
        try {
            const res = await fetch('/train', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, image: captures[i] })
            });
            if (res.ok) success = true;
        } catch (e) {
            console.error('Train error:', e);
        }
    }

    if (success) {
        toast('Enrollment Complete', `"${name}" has been successfully enrolled.`, 'success');
        resetCaptures();
        nameInput.value = '';
    } else {
        toast('Enrollment Failed', 'Could not save to server. Check connection.', 'error');
    }

    trainBtn.disabled = false;
    trainBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Save & Enroll`;
});

// ── Reset captures ────────────────────────────────────
resetBtn.addEventListener('click', resetCaptures);

function resetCaptures() {
    captures = [];
    thumbs.forEach((t, i) => {
        t.innerHTML = `<span>${i + 1}</span>`;
        t.classList.remove('filled');
    });
    trainBtn.disabled = true;
}

// ── Test: Start / Stop ────────────────────────────────
testBtn.addEventListener('click', () => {
    isTesting ? stopTesting() : startTesting();
});

function startTesting() {
    isTesting = true;
    testBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Stop Recognition`;
    testBtn.classList.add('danger');
    scanLine.style.display = 'block';
    faceRing.classList.add('active');
    scanInfo.style.display = 'flex';
    setCamStatus('active', 'Scanning…');

    runTest(); // immediate first run
    testInterval = setInterval(runTest, 2000);
}

async function runTest() {
    const imageData = captureFrame();
    try {
        const res = await fetch('/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageData })
        });
        const data = await res.json();
        updateResult(data);
    } catch (err) {
        console.error('Test error:', err);
    }
}

function updateResult(data) {
    const name = data.name || 'Unknown';
    const confidence = data.confidence !== undefined ? Math.round(data.confidence * 100) : null;

    resultName.textContent = name;

    if (name !== 'Unknown' && name !== 'No face detected') {
        resultName.className = 'result-name match';
        resultAvatar.className = 'result-avatar match';
        setCamStatus('active', 'Face Recognized');
    } else {
        resultName.className = 'result-name unknown';
        resultAvatar.className = 'result-avatar unknown';
        setCamStatus('active', 'Scanning…');
    }

    if (confidence !== null) {
        confBar.style.width = confidence + '%';
        confPct.textContent = confidence + '%';
    } else {
        confBar.style.width = '0%';
        confPct.textContent = '—';
    }
}

function stopTesting() {
    isTesting = false;
    clearInterval(testInterval);
    testBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> Start Recognition`;
    testBtn.classList.remove('danger');
    scanLine.style.display = 'none';
    faceRing.classList.remove('active');
    scanInfo.style.display = 'none';
    resultName.textContent = '—';
    resultName.className = 'result-name';
    resultAvatar.className = 'result-avatar';
    confBar.style.width = '0%';
    confPct.textContent = '—';
    setCamStatus('active', 'Camera Active');
}

// ── Toast helper ──────────────────────────────────────
function toast(title, msg, type = 'info') {
    const icons = {
        success: '✅',
        error:   '❌',
        warning: '⚠️',
        info:    'ℹ️'
    };
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            <div class="toast-msg">${msg}</div>
        </div>`;
    container.appendChild(el);
    setTimeout(() => {
        el.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => el.remove(), 300);
    }, 3500);
}

// ── Boot ──────────────────────────────────────────────
initCamera();

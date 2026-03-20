const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const trainTab = document.getElementById('trainTab');
const testTab = document.getElementById('testTab');
const trainControls = document.getElementById('trainControls');
const testControls = document.getElementById('testControls');
const trainBtn = document.getElementById('trainBtn');
const testBtn = document.getElementById('testBtn');
const nameInput = document.getElementById('nameInput');
const resultDiv = document.getElementById('result');
const statusBadge = document.getElementById('status');
const scanLine = document.querySelector('.scan-line');

let stream = null;
let isTesting = false;
let testInterval = null;

// Initialize camera
async function initCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        statusBadge.innerText = 'Camera Active';
    } catch (err) {
        console.error("Error accessing camera:", err);
        statusBadge.innerText = 'Camera Error';
        statusBadge.style.borderColor = '#ef4444';
        statusBadge.style.color = '#ef4444';
    }
}

initCamera();

// Tab switching
trainTab.addEventListener('click', () => {
    trainTab.classList.add('active');
    testTab.classList.remove('active');
    trainControls.classList.remove('hidden');
    testControls.classList.add('hidden');
    stopTesting();
});

testTab.addEventListener('click', () => {
    testTab.classList.add('active');
    trainTab.classList.remove('active');
    testControls.classList.remove('hidden');
    trainControls.classList.add('hidden');
});

// Capture image from video
function captureImage() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg');
}

// Train logic
trainBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) {
        alert("Please enter a name");
        return;
    }

    trainBtn.disabled = true;
    trainBtn.innerText = "Training...";
    statusBadge.innerText = 'Processing...';

    const imageData = captureImage();

    try {
        const response = await fetch('/train', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, image: imageData })
        });
        const data = await response.json();
        
        if (response.ok) {
            alert(data.message);
            nameInput.value = '';
        } else {
            alert("Error: " + data.detail);
        }
    } catch (err) {
        alert("Feiled to connect to server");
    } finally {
        trainBtn.disabled = false;
        trainBtn.innerText = "Capture & Train";
        statusBadge.innerText = 'Camera Active';
    }
});

// Test logic
testBtn.addEventListener('click', () => {
    if (isTesting) {
        stopTesting();
    } else {
        startTesting();
    }
});

function startTesting() {
    isTesting = true;
    testBtn.innerText = "Stop Recognition";
    testBtn.style.background = "#ef4444";
    scanLine.style.display = 'block';
    
    testInterval = setInterval(async () => {
        const imageData = captureImage();
        try {
            const response = await fetch('/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageData })
            });
            const data = await response.json();
            resultDiv.innerText = `Identity: ${data.name}`;
            
            if (data.name !== 'Unknown' && data.name !== 'No face detected') {
                statusBadge.innerText = 'Face Recognized';
                statusBadge.style.color = '#10b981';
            } else {
                statusBadge.innerText = 'Scanning...';
                statusBadge.style.color = '#f59e0b';
            }
        } catch (err) {
            console.error(err);
        }
    }, 2000); // Test every 2 seconds
}

function stopTesting() {
    isTesting = false;
    testBtn.innerText = "Start Auto Recognition";
    testBtn.style.background = "var(--secondary)";
    scanLine.style.display = 'none';
    clearInterval(testInterval);
    resultDiv.innerText = '';
    statusBadge.innerText = 'Camera Active';
    statusBadge.style.color = '#10b981';
}

// client.js
let stream;
let photoBlob;

async function checkPermissions() {
    try {
        const permission = await navigator.permissions.query({ name: 'camera' });
        
        if (permission.state === 'granted') {
            showStep(1);
            startCamera();
        }

        permission.addEventListener('change', () => {
            if (permission.state === 'granted') {
                showStep(1);
                startCamera();
            }
        });
    } catch (error) {
        console.error('Permission check error:', error);
    }
}

async function requestPermissions() {
    try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoStream.getTracks().forEach(track => track.stop());
        showStep(1);
        startCamera();
    } catch (err) {
        console.error('Permission error:', err);
        showError('Please grant camera permissions to use this app.');
    }
}

async function startCamera() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        let constraints = {
            video: true
        };

        if (videoDevices.length > 0) {
            const backCamera = videoDevices.find(device =>
                device.label.toLowerCase().includes('back') ||
                device.label.toLowerCase().includes('rear') ||
                device.label.toLowerCase().includes('environment')
            );

            if (backCamera) {
                constraints.video = {
                    deviceId: { exact: backCamera.deviceId },
                    facingMode: 'environment'
                };
            }
        }

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.getElementById('video');
        video.srcObject = stream;
    } catch (err) {
        console.error('Error accessing camera:', err);
        showError('Error accessing camera. Please check permissions.');
    }
}

async function processImage(imageData) {
    showSpinner();
    hideError();

    try {
        const response = await fetch('https://math-solver-ai-lemon.vercel.app/api/process-image', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: imageData })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        if (data.solution) {
            displayResult(imageData, data.solution);
            showStep(3);
        } else {
            throw new Error('Invalid response format from server');
        }
    } catch (err) {
        showError(`Error: ${err.message}`);
    } finally {
        hideSpinner();
    }
}

// UI Helper Functions
function showStep(stepNumber) {
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById(`step${stepNumber}`).classList.add('active');
}

function showSpinner() {
    document.getElementById('spinner').style.display = 'block';
}

function hideSpinner() {
    document.getElementById('spinner').style.display = 'none';
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    document.getElementById('errorMessage').classList.add('hidden');
}

function displayResult(imageData, solutionText) {
    // Display the captured image
    document.getElementById('capturedImage').src = imageData;

    // Replace math expressions with a span for KaTeX rendering
    const mathRegex = /\$(.*?)\$/g;
    const processedText = solutionText.replace(mathRegex, (match, p1) => {
        // Wrap the math expression in a span with the class 'math'
        return `<span class="math">${p1}</span>`;
    });

    // Parse markdown text to HTML
    const solutionContainer = document.getElementById('solution');
    solutionContainer.innerHTML = marked.parse(processedText);

    // Render LaTeX math expressions using KaTeX
    const mathElements = solutionContainer.querySelectorAll('.math');
    mathElements.forEach((el) => {
        const latex = el.textContent || el.innerText;
        el.innerHTML = ''; // Clear the existing text
        try {
            katex.render(latex, el, {
                throwOnError: false,
                displayMode: true,
            });
        } catch (e) {
            console.error('KaTeX rendering error:', e);
        }
    });
}



// Event Listeners
document.getElementById('grantPermissions').addEventListener('click', requestPermissions);

document.getElementById('captureBtn').addEventListener('click', () => {
    const canvas = document.getElementById('canvas');
    const video = document.getElementById('video');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
        photoBlob = blob;
        const reader = new FileReader();
        reader.onloadend = () => {
            const imageData = reader.result;
            document.getElementById('photoPreview').src = imageData;
            document.getElementById('video').style.display = 'none';
            document.getElementById('photoPreview').classList.remove('hidden');
            
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            
            showStep(2);
        };
        reader.readAsDataURL(blob);
    }, 'image/jpeg');
});

document.getElementById('uploadBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('photoPreview').src = e.target.result;
            document.getElementById('video').style.display = 'none';
            document.getElementById('photoPreview').classList.remove('hidden');
            showStep(2);
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('processButton').addEventListener('click', () => {
    const imageData = document.getElementById('photoPreview').src;
    processImage(imageData);
});

document.getElementById('startOver').addEventListener('click', () => {
    location.reload();
});

// Initialize the app
checkPermissions();

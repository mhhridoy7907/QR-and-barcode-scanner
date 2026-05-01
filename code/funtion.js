
        // STATE
        let mode = 'qr';
        let inputMode = 'file';
        let cameraStream = null;
        let imageData = null;
        let scanHistory = JSON.parse(localStorage.getItem('scanHistory')) || [];

        // THEME
        const themeToggle = document.getElementById('themeToggle');
        const savedTheme = localStorage.getItem('theme') || 'dark';
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            themeToggle.textContent = '🌙';
        }

        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            themeToggle.textContent = isLight ? '🌙' : '☀️';
        });

        // SET MODE (QR or BARCODE)
        function setMode(m) {
            mode = m;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');
            showResult(`Mode: ${m.toUpperCase()}`);
        }

        // SET INPUT MODE (FILE or CAMERA)
        function setInputMode(m) {
            inputMode = m;
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            event.target.classList.add('active');

            if (m === 'file') {
                document.getElementById('fileMode').style.display = 'block';
                document.getElementById('cameraMode').style.display = 'none';
                if (cameraStream) stopCamera();
            } else {
                document.getElementById('fileMode').style.display = 'none';
                document.getElementById('cameraMode').style.display = 'block';
            }
        }

        // FILE INPUT
        const fileInput = document.getElementById('fileInput');
        const dragDropZone = document.getElementById('dragDropZone');
        const preview = document.getElementById('preview');

        fileInput.addEventListener('change', handleFileSelect);

        dragDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dragDropZone.classList.add('drag-over');
        });

        dragDropZone.addEventListener('dragleave', () => {
            dragDropZone.classList.remove('drag-over');
        });

        dragDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dragDropZone.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files.length) {
                fileInput.files = files;
                handleFileSelect({ target: fileInput });
            }
        });

        function handleFileSelect(e) {
            const file = e.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                alert('❌ Please select a valid image file');
                return;
            }

            const reader = new FileReader();
            reader.onload = function (evt) {
                preview.src = evt.target.result;
                preview.style.display = 'block';
                preview.dataset.src = evt.target.result;
                document.getElementById('cameraPreview').style.display = 'none';
            };
            reader.readAsDataURL(file);
        }

        // CAMERA
        async function startCamera() {
            try {
                cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });
                const video = document.getElementById('cameraStream');
                video.srcObject = cameraStream;
                video.style.display = 'block';
                showResult('📷 Camera started. Click "Capture" to take a photo.');
            } catch (err) {
                showResult('❌ Camera access denied or not available');
            }
        }

        function capturePhoto() {
            const video = document.getElementById('cameraStream');
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);

            const photoData = canvas.toDataURL('image/png');
            document.getElementById('cameraPreview').src = photoData;
            document.getElementById('cameraPreview').style.display = 'block';
            document.getElementById('cameraPreview').dataset.src = photoData;
            showResult('📸 Photo captured. Click "Scan Now" to scan.');
        }

        function stopCamera() {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
                cameraStream = null;
                document.getElementById('cameraStream').style.display = 'none';
            }
        }

        // SCAN
        function scanNow() {
            let imgSrc = preview.dataset.src || document.getElementById('cameraPreview').dataset.src;
            if (!imgSrc) {
                showResult('❌ Please upload an image or capture a photo first');
                return;
            }

            showSpinner(true);

            const img = new Image();
            img.onload = function () {
                const canvas = document.getElementById('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                if (mode === 'qr') {
                    scanQR(imageData, canvas.width, canvas.height);
                } else {
                    scanBarcode(imgSrc);
                }
            };
            img.src = imgSrc;
        }

        function scanQR(imageData, width, height) {
            try {
                const qr = jsQR(imageData.data, width, height);
                if (qr) {
                    addToHistory('QR Code', qr.data);
                    showResult(`<strong>🔲 QR Code:</strong><br>${qr.data}`, true);
                } else {
                    showResult('❌ No QR code found in the image');
                }
            } catch (err) {
                showResult('❌ Error scanning QR code: ' + err.message);
            } finally {
                showSpinner(false);
            }
        }

        function scanBarcode(imgSrc) {
            try {
                Quagga.decodeSingle({
                    src: imgSrc,
                    numOfWorkers: 0,
                    decoder: {
                        readers: ['code_128_reader', 'ean_reader', 'ean_8_reader', 'code_39_reader', 'code_93_reader', 'upc_reader']
                    }
                }, function (res) {
                    showSpinner(false);
                    if (res && res.codeResult) {
                        addToHistory('Barcode', res.codeResult.code);
                        showResult(`<strong>📊 Barcode:</strong><br>${res.codeResult.code}<br><small>Format: ${res.codeResult.format}</small>`, true);
                    } else {
                        showResult('❌ No barcode found in the image');
                    }
                });
            } catch (err) {
                showSpinner(false);
                showResult('❌ Error scanning barcode: ' + err.message);
            }
        }

        // SHOW RESULT
        function showResult(text, showActions = false) {
            const resultDiv = document.getElementById('result');
            const resultContent = document.querySelector('.result-content');

            if (showActions) {
                resultContent.innerHTML = text;
                const actions = document.querySelector('.result-actions');
                if (actions) actions.remove();

                const newActions = document.createElement('div');
                newActions.className = 'result-actions';
                newActions.innerHTML = `
                    <button onclick="copyToClipboard('${resultContent.innerText.replace(/[\n<>]/g, ' ')}')">📋 Copy</button>
                    <button onclick="openLink('${resultContent.innerText.split('\n')[0]}')">🔗 Open</button>
                `;
                resultDiv.appendChild(newActions);
            } else {
                resultContent.innerHTML = text;
                const actions = document.querySelector('.result-actions');
                if (actions) actions.remove();
            }
        }

        // COPY TO CLIPBOARD
        function copyToClipboard(text) {
            const cleanText = text.replace(/<[^>]*>/g, '').trim();
            navigator.clipboard.writeText(cleanText).then(() => {
                const msg = document.getElementById('successMsg');
                msg.style.display = 'block';
                setTimeout(() => msg.style.display = 'none', 2000);
            });
        }

        // OPEN LINK
        function openLink(text) {
            if (text.includes('http')) {
                window.open(text, '_blank');
            }
        }

        // SPINNER
        function showSpinner(show) {
            document.getElementById('spinner').style.display = show ? 'block' : 'none';
        }

        // HISTORY
        function addToHistory(type, data) {
            const now = new Date().toLocaleTimeString();
            scanHistory.unshift({ type, data, time: now });
            if (scanHistory.length > 20) scanHistory.pop();
            localStorage.setItem('scanHistory', JSON.stringify(scanHistory));
            updateHistoryUI();
        }

        function updateHistoryUI() {
            const historyList = document.getElementById('historyList');
            historyList.innerHTML = '';

            if (scanHistory.length === 0) {
                historyList.innerHTML = '<p style="color: #888; text-align: center;">No scans yet</p>';
                return;
            }

            scanHistory.forEach((item, index) => {
                const div = document.createElement('div');
                div.className = 'history-item';
                div.onclick = () => copyToClipboard(item.data);
                div.innerHTML = `
                    <div class="history-type">${item.type}</div>
                    <div>${item.data}</div>
                    <div class="history-time">${item.time}</div>
                `;
                historyList.appendChild(div);
            });
        }

        function clearHistory() {
            if (confirm('🗑️ Clear all history?')) {
                scanHistory = [];
                localStorage.removeItem('scanHistory');
                updateHistoryUI();
            }
        }

        function toggleHistory() {
            const panel = document.getElementById('historyPanel');
            panel.style.maxHeight = panel.style.maxHeight === 'none' ? '600px' : 'none';
        }

        // INIT
        updateHistoryUI();

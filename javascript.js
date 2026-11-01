// UI behavior com suporte flexível a notebooks/desktops e dispositivos móveis
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('vehicle-plate-input');
    const searchBtn = document.getElementById('btn-search-status');
    const toggleScannerBtn = document.getElementById('btn-toggle-scanner');
    const feedbackBox = document.getElementById('status-feedback');
    const feedbackBadge = document.getElementById('feedback-plate-badge');
    const backToTopBtn = document.getElementById('btn-back-to-top');

    // QR Modal Elements & Camera Stream Elements
    const modalQr = document.getElementById('modal-qr-scanner');
    const btnCloseQr = document.getElementById('btn-modal-close-scanner');
    const cameraDot = document.getElementById('camera-status-dot');
    const cameraText = document.getElementById('camera-status-text');
    const cameraDeviceLabel = document.getElementById('camera-device-label');
    const cameraFallback = document.getElementById('camera-fallback-screen');
    const cameraFallbackMsg = document.getElementById('camera-fallback-msg');
    const cameraFallbackDesc = document.getElementById('camera-fallback-desc');
    const btnRetryCamera = document.getElementById('btn-retry-camera');
    const btnFallbackManual = document.getElementById('btn-fallback-manual-fill');
    const btnCaptureScan = document.getElementById('btn-capture-scan');
    const scanFlash = document.getElementById('scan-flash');
    const scanSuccessPill = document.getElementById('scan-success-pill');
    const scanSuccessText = document.getElementById('scan-success-text');
    const btnSimulateScan = document.getElementById('btn-simulate-camera-scan');
    const inputQrManual = document.getElementById('input-qr-code-manual');
    const btnSubmitQrCode = document.getElementById('btn-submit-scanner-code');

    // Toast elements
    const scanToast = document.getElementById('scan-toast');
    const toastMsg = document.getElementById('toast-message');

    // Modals informativos
    const modalAbout = document.getElementById('modal-about');
    const btnOpenAbout = document.getElementById('btn-open-about');
    const btnCloseAbout = document.getElementById('btn-close-about');
    const btnModalAboutOk = document.getElementById('btn-modal-about-ok');

    const modalPrivacy = document.getElementById('modal-privacy');
    const btnOpenPrivacy = document.getElementById('btn-open-privacy');
    const linkPrivacyFooter = document.getElementById('link-privacy-footer');
    const linkTermsFooter = document.getElementById('link-terms-footer');
    const btnClosePrivacy = document.getElementById('btn-close-privacy');
    const btnModalPrivacyOk = document.getElementById('btn-modal-privacy-ok');

    // Variáveis Globais de Controle da Câmera
    let html5QrCodeInstance = null;
    let localVideoStream = null;
    let scanInterval = null;

    // Toast Notification
    function showToast(message) {
        if (!scanToast) return;
        toastMsg.textContent = message || 'Identificado com sucesso!';
        scanToast.classList.remove('hidden', 'scale-95');
        scanToast.classList.add('scale-100');
        setTimeout(() => {
            scanToast.classList.add('scale-95');
            setTimeout(() => scanToast.classList.add('hidden'), 200);
        }, 3500);
    }

    // Beep sonoro sutil
    function playBeep() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.18);
        } catch (err) {}
    }

    // Iniciar Câmera Nativa com elemento <video>
    async function startCamera() {
        cameraFallback.classList.add('hidden');
        cameraDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0';
        cameraText.textContent = 'Iniciando câmera...';

        const videoElem = document.getElementById('camera-stream');

        try {
            // Liga o fluxo de mídia diretamente no seu <video>
            localVideoStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
            
            videoElem.srcObject = localVideoStream;
            videoElem.play().catch(() => {});

            cameraDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0';
            cameraText.textContent = 'Câmera Ativa';
            cameraDeviceLabel.textContent = 'Buscando QR Code...';

            // ATENÇÃO: Instanciação com o "Q" maiúsculo correto exigido pela biblioteca
            html5QrCodeInstance = new Html5Qrcode("camera-stream");

            // Inicia a varredura lendo frames do vídeo a cada 300ms
            scanInterval = setInterval(() => {
                if (html5QrCodeInstance && videoElem.readyState === videoElem.HAVE_CURRENT_DATA) {
                    html5QrCodeInstance.scanFile(videoElem)
                        .then((decodedText) => {
                            clearInterval(scanInterval);
                            handleScanSuccess(decodedText);
                        })
                        .catch(() => {
                            // Ignora erros de leitura frame-a-frame enquanto procura o código
                        });
                }
            }, 300);

        } catch (err) {
            console.error('Erro ao abrir fluxo da câmera:', err);
            cameraFallbackMsg.textContent = 'Permissão ou suporte ausente';
            cameraFallbackDesc.textContent = 'Abra o site via Live Server (http://localhost) e permita o acesso à câmera.';
            cameraFallback.classList.remove('hidden');
            cameraDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0';
            cameraText.textContent = 'Acesso negado';
        }
    }

    // Parar Câmera de forma limpa
    function stopCamera() {
        if (scanInterval) {
            clearInterval(scanInterval);
            scanInterval = null;
        }
        
        if (localVideoStream) {
            localVideoStream.getTracks().forEach(track => track.stop());
            localVideoStream = null;
        }

        const videoElem = document.getElementById('camera-stream');
        if (videoElem) {
            videoElem.srcObject = null;
        }

        html5QrCodeInstance = null;
        if (scanSuccessPill) scanSuccessPill.classList.add('hidden');
    }

    function openQrModal() {
        modalQr.classList.remove('hidden');
        startCamera();
    }

    function closeQrModal() {
        modalQr.classList.add('hidden');
        stopCamera();
    }

    // Processar sucesso da leitura (Real ou Simulada)
    function handleScanSuccess(rawData) {
        playBeep();

        let plateCode = rawData;
        let osCode = "";

        if (rawData.includes(',')) {
            const parts = rawData.split(',');
            plateCode = parts[0].trim();
            osCode = parts[1].trim();
        } else if (rawData.includes('-') && !rawData.startsWith('OS-')) {
            const parts = rawData.split('-');
            plateCode = parts[0].trim();
            osCode = parts[1].trim();
        }

        const sanitizedPlate = plateCode.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 7);

        if (scanFlash) {
            scanFlash.classList.remove('opacity-0', 'animate-flash');
            void scanFlash.offsetWidth;
            scanFlash.classList.add('animate-flash');
        }

        if (scanSuccessPill) {
            scanSuccessText.textContent = osCode 
                ? `Identificado: Placa ${sanitizedPlate} | O.S. ${osCode}`
                : `QR Code Identificado: ${sanitizedPlate}`;
            scanSuccessPill.classList.remove('hidden');
        }

        setTimeout(() => {
            closeQrModal();
            input.value = sanitizedPlate;
            
            const msgComplemento = osCode ? ` da O.S. ${osCode}` : '';
            showToast(`Veículo ${sanitizedPlate}${msgComplemento} identificado!`);
            
            performSearch(sanitizedPlate, osCode);
        }, 800);
    }

    // Autoformatação do input manual da placa
    input.addEventListener('input', (e) => {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (val.length > 7) val = val.substring(0, 7);
        e.target.value = val;
    });

    // Consulta de status (Gera a caixa de feedback na tela)
    const performSearch = (plateValue, osValue = "") => {
        const plate = plateValue || input.value.trim();
        if (plate.length < 7) {
            input.focus();
            input.parentElement.classList.add('animate-pulse');
            setTimeout(() => input.parentElement.classList.remove('animate-pulse'), 500);
            return;
        }

        if (feedbackBadge) {
            feedbackBadge.textContent = osValue ? `${plate} (${osValue})` : plate;
        }

        const statusTextElem = feedbackBox.querySelector('p.font-bold');
        if (statusTextElem && osValue) {
            statusTextElem.innerHTML = `Status Atual: Em Execução <br><span class="text-xs text-primary font-mono">Ordem de Serviço: ${osValue}</span>`;
        }

        feedbackBox.classList.remove('hidden');
        feedbackBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    searchBtn.addEventListener('click', () => performSearch());

    // Eventos de cliques na interface
if (toggleScannerBtn) toggleScannerBtn.addEventListener('click', openQrModal);
if (btnCloseQr) btnCloseQr.addEventListener('click', closeQrModal);
if (btnRetryCamera) btnRetryCamera.addEventListener('click', () => startCamera());
if (btnFallbackManual) {
btnFallbackManual.addEventListener('click', () => {
closeQrModal();
input.focus();
});
}
// Botão Captura do modal (Gera dados fictícios)
if (btnCaptureScan) {
btnCaptureScan.addEventListener('click', () => {
const sampleData = [
'BRA2E19,OS-4821',
'ABC1D23,OS-9942',
'SAS2026,OS-2026',
'PRX4B88,OS-1052'
];
const randomResult = sampleData[Math.floor(Math.random() * sampleData.length)];
handleScanSuccess(randomResult);
});
}
// Botão Simular teste rápido
if (btnSimulateScan) {
btnSimulateScan.addEventListener('click', () => {
handleScanSuccess('BRA2E19,OS-8831');
});
}
// Confirmar código digitado manualmente dentro do modal
if (btnSubmitQrCode && inputQrManual) {
btnSubmitQrCode.addEventListener('click', () => {
const val = inputQrManual.value.trim();
if (val) {
handleScanSuccess(val);
} else {
inputQrManual.focus();
}
});
}
// Fechar ao clicar fora
window.addEventListener('click', (e) => {
if (e.target === modalQr) closeQrModal();
if (e.target === modalAbout) modalAbout.classList.add('hidden');
if (e.target === modalPrivacy) modalPrivacy.classList.add('hidden');
});
// Fechar modais ao apertar ESC
window.addEventListener('keydown', (e) => {
if (e.key === 'Escape') {
if (!modalQr.classList.contains('hidden')) closeQrModal();
if (!modalAbout.classList.contains('hidden')) modalAbout.classList.add('hidden');
if (!modalPrivacy.classList.contains('hidden')) modalPrivacy.classList.add('hidden');
}
});
// Controle dos Modals Informativos
if (btnOpenAbout) btnOpenAbout.onclick = () => modalAbout.classList.remove('hidden');
if (btnCloseAbout) btnCloseAbout.onclick = () => modalAbout.classList.add('hidden');
if (btnModalAboutOk) btnModalAboutOk.onclick = () => modalAbout.classList.add('hidden');
const openPrivacy = (e) => {
if (e) e.preventDefault();
modalPrivacy.classList.remove('hidden');
};
if (btnOpenPrivacy) btnOpenPrivacy.onclick = openPrivacy;
if (linkPrivacyFooter) linkPrivacyFooter.onclick = openPrivacy;
if (linkTermsFooter) linkTermsFooter.onclick = openPrivacy;
if (btnClosePrivacy) btnClosePrivacy.onclick = () => modalPrivacy.classList.add('hidden');
if (btnModalPrivacyOk) btnModalPrivacyOk.onclick = () => modalPrivacy.classList.add('hidden');
// Botão "Voltar ao topo"
window.addEventListener('scroll', () => {
if (window.scrollY > 150) {
backToTopBtn.classList.remove('opacity-0', 'pointer-events-none');
backToTopBtn.classList.add('opacity-100');
} else {
backToTopBtn.classList.add('opacity-0', 'pointer-events-none');
backToTopBtn.classList.remove('opacity-100');
}
});
});
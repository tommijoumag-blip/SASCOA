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

    // Variável Global para controlar o fluxo de mídia da câmera
    let activeVideoStream = null;

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

    // Adicione apenas esta função no seu javascript.js para ativar o botão:
async function switchCamera() {
    const videoElem = document.getElementById('camera-stream');
    
    // Pega todas as mídias conectadas
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');

    if (videoDevices.length > 1) {
        // Se houver mais de uma câmera, alterna de uma para outra
        if (activeVideoStream) {
            activeVideoStream.getTracks().forEach(track => track.stop());
        }
        
        // Pega o próximo dispositivo de vídeo da lista
        const nextDevice = videoDevices.find(d => !activeVideoStream || !activeVideoStream.getVideoTracks()[0].label.includes(d.label));
        
        if (nextDevice) {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: nextDevice.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
            activeVideoStream = stream;
            videoElem.srcObject = stream;
            videoElem.play().catch(() => {});
            cameraDeviceLabel.textContent = nextDevice.label || "Nova Câmera Ativa";
            return;
        }
    }
    
    showToast("Apenas uma câmera foi detectada neste dispositivo.");
}

    // Iniciar Câmera Nativa com elemento <video>
    async function startCamera() {
        cameraFallback.classList.add('hidden');
        cameraDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0';
        cameraText.textContent = 'Inicializando câmera...';

        const videoElem = document.getElementById('camera-stream');

        try {
            // Acesso direto e nativo do navegador à webcam
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: "environment", 
                    width: { ideal: 1280 }, 
                    height: { ideal: 720 } 
                },
                audio: false
            });
            
            // Armazena o fluxo de mídia para conseguir desligar depois
            activeVideoStream = stream;
            
            // Vincula o stream diretamente ao elemento <video>
            videoElem.srcObject = stream;
            videoElem.play().catch((e) => console.log("Erro ao dar play no vídeo:", e));

            cameraDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0';
            cameraText.textContent = 'Câmera Ativa';
            cameraDeviceLabel.textContent = 'Webcam / Câmera Principal / Câmera Frontal (dependendo do dispositivo)';

        } catch (err) {
            console.error('Erro ao acessar webcam nativa:', err);
            cameraFallbackMsg.textContent = 'Acesso à câmera indisponível';
            cameraFallbackDesc.textContent = 'Permita o acesso à câmera através do ícone de cadeado na barra do navegador ou utilize os botões de simulação abaixo.';
            cameraFallback.classList.remove('hidden');
            cameraDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0';
            cameraText.textContent = 'Acesso negado';
        }
    }

    // Parar Câmera de forma limpa
    function stopCamera() {
        if (activeVideoStream) {
            activeVideoStream.getTracks().forEach(track => {
                try { track.stop(); } catch(e) {}
            });
            activeVideoStream = null;
        }

        const videoElem = document.getElementById('camera-stream');
        if (videoElem) {
            videoElem.srcObject = null;
        }

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

    // Processar sucesso da leitura (Simulada para a apresentação)
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
            void scanFlash.offsetWidth; // Trigger reflow
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

    // Eventos de cliques mapeados corretamente para os botões da interface
    if (toggleScannerBtn) toggleScannerBtn.addEventListener('click', openQrModal);
    if (btnCloseQr) btnCloseQr.addEventListener('click', closeQrModal);
    if (btnRetryCamera) btnRetryCamera.addEventListener('click', () => startCamera());
    
    if (btnFallbackManual) {
        btnFallbackManual.addEventListener('click', () => {
            closeQrModal();
            input.focus();
        });
    }

    // Botão Captura do modal (Gera dados mockados perfeitos no novo formato)
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
// Botão Simular teste rápido embaixo do modal
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
// Fechar ao clicar fora dos modais
window.addEventListener('click', (e) => {
if (e.target === modalQr) closeQrModal();
if (e.target === modalAbout) modalAbout.classList.add('hidden');
if (e.target === modalPrivacy) modalPrivacy.classList.add('hidden');
});
// Fechar modais ao apertar a tecla ESC
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
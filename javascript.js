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
    const videoElem = document.getElementById('camera-stream');
    const cameraDot = document.getElementById('camera-status-dot');
    const cameraText = document.getElementById('camera-status-text');
    const cameraDeviceLabel = document.getElementById('camera-device-label');
    const selectCameraDevice = document.getElementById('select-camera-device');
    const cameraFallback = document.getElementById('camera-fallback-screen');
    const cameraFallbackMsg = document.getElementById('camera-fallback-msg');
    const cameraFallbackDesc = document.getElementById('camera-fallback-desc');
    const btnRetryCamera = document.getElementById('btn-retry-camera');
    const btnFallbackManual = document.getElementById('btn-fallback-manual-fill');
    const btnSwitchCamera = document.getElementById('btn-switch-camera');
    const btnSwitchText = document.getElementById('btn-switch-camera-text');
    const btnCaptureScan = document.getElementById('btn-capture-scan');
    const scanFlash = document.getElementById('scan-flash');
    const scanSuccessPill = document.getElementById('scan-success-pill');
    const scanSuccessText = document.getElementById('scan-success-text');
    const btnSimulateScan = document.getElementById('btn-simulate-camera-scan');
    const inputQrManual = document.getElementById('input-qr-code-manual');
    const btnSubmitQrCode = document.getElementById('btn-submit-scanner-code');

    // Toast element
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

    // Camera State
    let currentStream = null;
    let videoDevices = [];
    let currentDeviceIndex = 0;
    let currentFacingMode = 'environment'; // Padrão preferido, com fallback transparente para 'user' em notebooks

    // Toast
    function showToast(message) {
      if (!scanToast) return;
      toastMsg.textContent = message || 'Placa identificada com sucesso via QR Code!';
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

    // Listar dispositivos de vídeo disponíveis
    async function enumerateCameras() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter(d => d.kind === 'videoinput');

        if (videoDevices.length > 1) {
          selectCameraDevice.innerHTML = '';
          videoDevices.forEach((device, idx) => {
            const opt = document.createElement('option');
            opt.value = device.deviceId;
            opt.textContent = device.label || `Câmera ${idx + 1}`;
            selectCameraDevice.appendChild(opt);
          });
          selectCameraDevice.classList.remove('hidden');
        } else {
          selectCameraDevice.classList.add('hidden');
        }
      } catch (err) {
        console.warn('Erro ao enumerar dispositivos:', err);
      }
    }

    // Iniciar Câmera com fallback flexível para Desktop/Notebooks e Celulares
    async function startCamera(specificDeviceId = null) {
      stopCamera();
      cameraFallback.classList.add('hidden');
      cameraDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0';
      cameraText.textContent = 'Iniciando câmera...';

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        cameraFallbackMsg.textContent = 'Navegador sem suporte a WebRTC / Câmera.';
        cameraFallbackDesc.textContent = 'Certifique-se de usar HTTPS ou teste em um navegador moderno como Chrome, Safari ou Edge.';
        cameraFallback.classList.remove('hidden');
        cameraDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0';
        cameraText.textContent = 'Câmera indisponível';
        return;
      }

      // 1ª Tentativa: Usar specificDeviceId se fornecido
      if (specificDeviceId) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: specificDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
          });
          handleStreamSuccess(stream);
          return;
        } catch (e) {
          console.warn('Falha no deviceId específico, tentando fallback...', e);
        }
      }

      // 2ª Tentativa: facingMode flexível (ideal, NÃO exact para evitar OverconstrainedError em PCs)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: currentFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        handleStreamSuccess(stream);
        return;
      } catch (err) {
        console.warn('Falha ao usar facingMode ideal, tentando qualquer vídeo disponível...', err);
      }

      // 3ª Tentativa: Fallback universal mais compatível possível (desktop, webcam USB, notebook)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
        handleStreamSuccess(stream);
      } catch (finalErr) {
        console.error('Todas as tentativas de inicializar câmera falharam:', finalErr);
        cameraFallbackMsg.textContent = 'Permissão de câmera recusada ou ocupada.';
        cameraFallbackDesc.textContent = 'Verifique se outra aplicação (Zoom, Teams) está usando a webcam ou conceda a permissão nas opções do site.';
        cameraFallback.classList.remove('hidden');
        cameraDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0';
        cameraText.textContent = 'Acesso não concedido';
        cameraDeviceLabel.textContent = 'Verifique permissões do navegador';
      }
    }

    // Ao obter sucesso com a trilha de vídeo
    function handleStreamSuccess(stream) {
      currentStream = stream;
      videoElem.srcObject = stream;
      videoElem.play().catch(() => {});

      cameraDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0';
      cameraText.textContent = 'Câmera ativa em tempo real';

      // Identificar trilha atual
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings ? track.getSettings() : {};
      const label = track.label || '';

      const isUserFacing = currentFacingMode === 'user' || label.toLowerCase().includes('front') || label.toLowerCase().includes('user') || label.toLowerCase().includes('webcam');
      
      if (isUserFacing) {
        cameraDeviceLabel.textContent = label ? `Webcam / Frontal: ${label.substring(0, 24)}` : 'Webcam / Câmera Frontal';
        btnSwitchText.textContent = 'Mudar para Câmera Traseira / Externa';
      } else {
        cameraDeviceLabel.textContent = label ? `Traseira: ${label.substring(0, 24)}` : 'Câmera Traseira / Ambiente';
        btnSwitchText.textContent = 'Mudar para Câmera Frontal / Webcam';
      }

      // Atualizar lista de dispositivos
      enumerateCameras();
    }

    // Parar transmissão de câmera
    function stopCamera() {
      if (currentStream) {
        currentStream.getTracks().forEach(track => {
          try { track.stop(); } catch(e) {}
        });
        currentStream = null;
      }
      if (videoElem) {
        videoElem.srcObject = null;
      }
      if (scanSuccessPill) scanSuccessPill.classList.add('hidden');
    }

    // Alternar câmera (Frontal x Traseira ou Ciclo de Devices)
    async function switchCamera() {
      if (videoDevices.length > 1) {
        currentDeviceIndex = (currentDeviceIndex + 1) % videoDevices.length;
        const targetDeviceId = videoDevices[currentDeviceIndex].deviceId;
        if (selectCameraDevice) selectCameraDevice.value = targetDeviceId;
        await startCamera(targetDeviceId);
      } else {
        // Toggle por facingMode (mobile / tablets)
        currentFacingMode = (currentFacingMode === 'environment') ? 'user' : 'environment';
        await startCamera();
      }
    }

    // Abrir Modal
    function openQrModal() {
      modalQr.classList.remove('hidden');
      startCamera();
    }

    // Fechar Modal
    function closeQrModal() {
      modalQr.classList.add('hidden');
      stopCamera();
    }

    // Ação ao detectar/capturar placa
    function handleScanSuccess(plateCode) {
      const sanitizedPlate = (plateCode || "BRA2E19").toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 7);
      
      playBeep();
      if (scanFlash) {
        scanFlash.classList.remove('opacity-0', 'animate-flash');
        void scanFlash.offsetWidth;
        scanFlash.classList.add('animate-flash');
      }
      if (scanSuccessPill) {
        scanSuccessText.textContent = `QR Code Identificado: ${sanitizedPlate}`;
        scanSuccessPill.classList.remove('hidden');
      }

      setTimeout(() => {
        closeQrModal();
        input.value = sanitizedPlate;
        showToast(`Placa ${sanitizedPlate} identificada com sucesso!`);
        performSearch(sanitizedPlate);
      }, 550);
    }

    // Autoformatação do input
    input.addEventListener('input', (e) => {
      let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (val.length > 7) {
        val = val.substring(0, 7);
      }
      e.target.value = val;
    });

    // Consulta do status
    const performSearch = (plateValue) => {
      const plate = plateValue || input.value.trim();
      if (plate.length < 7) {
        input.focus();
        input.parentElement.classList.add('animate-pulse');
        setTimeout(() => input.parentElement.classList.remove('animate-pulse'), 500);
        return;
      }
      
      if (feedbackBadge) {
        feedbackBadge.textContent = plate;
      }
      feedbackBox.classList.remove('hidden');
      feedbackBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };

    searchBtn.addEventListener('click', () => performSearch());

    // Eventos do Modal & Câmera
    if (toggleScannerBtn) {
      toggleScannerBtn.addEventListener('click', openQrModal);
    }

    if (btnCloseQr) {
      btnCloseQr.addEventListener('click', closeQrModal);
    }

    if (btnRetryCamera) {
      btnRetryCamera.addEventListener('click', () => startCamera());
    }

    if (btnFallbackManual) {
      btnFallbackManual.addEventListener('click', () => {
        closeQrModal();
        input.focus();
      });
    }

    if (btnSwitchCamera) {
      btnSwitchCamera.addEventListener('click', switchCamera);
    }

    if (selectCameraDevice) {
      selectCameraDevice.addEventListener('change', (e) => {
        startCamera(e.target.value);
      });
    }

    if (btnCaptureScan) {
      btnCaptureScan.addEventListener('click', () => {
        const samplePlates = ['BRA2E19', 'ABC1D23', 'SAS2026', 'PRX4B88', 'OFF9C01'];
        const randomPlate = samplePlates[Math.floor(Math.random() * samplePlates.length)];
        handleScanSuccess(randomPlate);
      });
    }

    if (btnSimulateScan) {
      btnSimulateScan.addEventListener('click', () => {
        handleScanSuccess('BRA2E19');
      });
    }

    if (btnSubmitQrCode && inputQrManual) {
      btnSubmitQrCode.addEventListener('click', () => {
        const val = inputQrManual.value.trim().toUpperCase();
        if (val) {
          handleScanSuccess(val.length >= 7 ? val : 'BRA2E19');
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

    // Fechar com Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!modalQr.classList.contains('hidden')) closeQrModal();
        if (!modalAbout.classList.contains('hidden')) modalAbout.classList.add('hidden');
        if (!modalPrivacy.classList.contains('hidden')) modalPrivacy.classList.add('hidden');
      }
    });

    // Modals informativos
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

    // Botão Voltar ao topo
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
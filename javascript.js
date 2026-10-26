// UI behavior for license plate validation, QR scanner modal, quick mockup feedback, and modals
  document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('vehicle-plate-input');
    const searchBtn = document.getElementById('btn-search-status');
    const toggleScannerBtn = document.getElementById('btn-toggle-scanner');
    const feedbackBox = document.getElementById('status-feedback');
    const feedbackBadge = document.getElementById('feedback-plate-badge');
    const backToTopBtn = document.getElementById('btn-back-to-top');

    // QR Modal Elements
    const modalQr = document.getElementById('modal-qr-scanner');
    const btnCloseQr = document.getElementById('btn-modal-close-scanner');
    const btnSimulateScan = document.getElementById('btn-simulate-camera-scan');
    const inputQrManual = document.getElementById('input-qr-code-manual');
    const btnSubmitQrCode = document.getElementById('btn-submit-scanner-code');

    // Modals
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

    // Auto-formatting Mercosul / Old pattern
    input.addEventListener('input', (e) => {
      let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (val.length > 7) {
        val = val.substring(0, 7);
      }
      e.target.value = val;
    });

    // Simulated query action
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

    // QR scanner Modal Activation
    if (toggleScannerBtn && modalQr) {
      toggleScannerBtn.addEventListener('click', () => {
        modalQr.classList.remove('hidden');
      });
    }

    if (btnCloseQr && modalQr) {
      btnCloseQr.addEventListener('click', () => {
        modalQr.classList.add('hidden');
      });
    }

    // Close on click outside modal
    window.addEventListener('click', (e) => {
      if (e.target === modalQr) modalQr.classList.add('hidden');
      if (e.target === modalAbout) modalAbout.classList.add('hidden');
      if (e.target === modalPrivacy) modalPrivacy.classList.add('hidden');
    });

    // Simulate optical scan
    if (btnSimulateScan) {
      btnSimulateScan.addEventListener('click', () => {
        modalQr.classList.add('hidden');
        input.value = "BRA2E19";
        performSearch("BRA2E19");
      });
    }

    // Submit manual code in QR modal
    if (btnSubmitQrCode && inputQrManual) {
      btnSubmitQrCode.addEventListener('click', () => {
        const val = inputQrManual.value.trim().toUpperCase();
        if (val) {
          modalQr.classList.add('hidden');
          input.value = val.length === 7 ? val : "BRA2E19";
          performSearch(input.value);
        } else {
          inputQrManual.focus();
        }
      });
    }

    // Modals events
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

    // Scroll listener for back to top button visibility
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
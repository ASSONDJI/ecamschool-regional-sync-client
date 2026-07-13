// ============================================================
// FICHIER  : ui-enhancements.js
//
// RÔLE : Améliorations UI transverses, indépendantes de la
//        logique métier d'app.js :
//          - Mode sombre / clair (persisté en localStorage)
//          - Mémorisation du dernier onglet actif
//          - Modale de confirmation stylée (remplace confirm())
//          - Cartes KPI du tableau de bord (compteur animé)
//
// Ce fichier ne modifie jamais directement les données ni les
// appels réseau : il ne fait qu'écouter / afficher.
// ============================================================

(function () {
    "use strict";

    var THEME_KEY = 'ecamschool_theme';
    var TAB_KEY = 'ecamschool_last_tab';

    // ============================================================
    // MODE SOMBRE
    // ============================================================

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        var toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.setAttribute('aria-label',
                theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre');
        }
    }

    function initTheme() {
        var saved = null;
        try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }

        if (!saved) {
            saved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
                ? 'dark' : 'light';
        }
        applyTheme(saved);

        var toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.addEventListener('click', function () {
                var current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
                var next = current === 'dark' ? 'light' : 'dark';
                applyTheme(next);
                try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
            });
        }
    }

    // ============================================================
    // DERNIER ONGLET ACTIF
    // ============================================================

    function initTabMemory() {
        // Mémoriser à chaque clic sur un onglet
        document.querySelectorAll('.tab-button').forEach(function (btn) {
            btn.addEventListener('click', function () {
                try { localStorage.setItem(TAB_KEY, btn.dataset.tab); } catch (e) { /* ignore */ }
            });
        });

        // Restaurer au chargement (si différent de l'onglet par défaut "users")
        var saved = null;
        try { saved = localStorage.getItem(TAB_KEY); } catch (e) { /* ignore */ }

        if (saved && saved !== 'users') {
            var targetBtn = document.querySelector('.tab-button[data-tab="' + saved + '"]');
            if (targetBtn) {
                // Laisser app.js terminer son initialisation avant de changer d'onglet
                setTimeout(function () { targetBtn.click(); }, 0);
            }
        }
    }

    // ============================================================
    // MODALE DE CONFIRMATION STYLÉE
    // ============================================================

    function ensureModalMarkup() {
        if (document.getElementById('confirm-modal')) return;

        var wrapper = document.createElement('div');
        wrapper.id = 'confirm-modal';
        wrapper.className = 'modal-overlay';
        wrapper.innerHTML =
            '<div class="modal-box" role="alertdialog" aria-modal="true">' +
            '  <div class="modal-icon">⚠️</div>' +
            '  <p class="modal-message" id="confirm-modal-message"></p>' +
            '  <div class="modal-actions">' +
            '    <button type="button" class="btn-modal btn-modal-cancel" id="confirm-modal-cancel">Annuler</button>' +
            '    <button type="button" class="btn-modal btn-modal-confirm" id="confirm-modal-confirm">Confirmer</button>' +
            '  </div>' +
            '</div>';
        document.body.appendChild(wrapper);
    }

    // window.confirmDialog(message) → Promise<boolean>
    window.confirmDialog = function (message) {
        ensureModalMarkup();

        var overlay = document.getElementById('confirm-modal');
        var msgEl = document.getElementById('confirm-modal-message');
        var btnCancel = document.getElementById('confirm-modal-cancel');
        var btnConfirm = document.getElementById('confirm-modal-confirm');

        msgEl.textContent = message;
        overlay.classList.add('open');

        return new Promise(function (resolve) {
            function cleanup(result) {
                overlay.classList.remove('open');
                btnCancel.removeEventListener('click', onCancel);
                btnConfirm.removeEventListener('click', onConfirm);
                overlay.removeEventListener('click', onOverlayClick);
                document.removeEventListener('keydown', onKeydown);
                resolve(result);
            }
            function onCancel() { cleanup(false); }
            function onConfirm() { cleanup(true); }
            function onOverlayClick(e) { if (e.target === overlay) cleanup(false); }
            function onKeydown(e) {
                if (e.key === 'Escape') cleanup(false);
                if (e.key === 'Enter') cleanup(true);
            }

            btnCancel.addEventListener('click', onCancel);
            btnConfirm.addEventListener('click', onConfirm);
            overlay.addEventListener('click', onOverlayClick);
            document.addEventListener('keydown', onKeydown);

            btnConfirm.focus();
        });
    };

    // ============================================================
    // CARTES KPI DU TABLEAU DE BORD
    // ============================================================

    function animateCount(el, target) {
        if (!el) return;
        var start = parseInt(el.textContent, 10) || 0;
        if (start === target) { el.textContent = target; return; }
        var duration = 600;
        var startTime = null;

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            var value = Math.round(start + (target - start) * eased);
            el.textContent = value;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                el.textContent = target;
            }
        }
        window.requestAnimationFrame(step);
    }

    function updatePendingKpi() {
        var el = document.getElementById('kpi-pending');
        if (!el || !window.indexedDB) return;

        var request = indexedDB.open("ecamschool_idb", 6);
        request.onsuccess = function (event) {
            var db = event.target.result;
            if (!db.objectStoreNames.contains("_pending")) { db.close(); return; }

            var tx = db.transaction(["_pending"], "readonly");
            var store = tx.objectStore("_pending");
            var getAllReq = store.getAll();

            getAllReq.onsuccess = function (ev) {
                var total = (ev.target.result || []).filter(function (r) {
                    return r._syncStatus === "PENDING";
                }).length;
                animateCount(el, total);
                db.close();
            };
            getAllReq.onerror = function () { db.close(); };
        };
        request.onerror = function () { /* IndexedDB indisponible, on laisse 0 */ };
    }

    // Appelée par app.js (loadDashboard) avec les compteurs déjà connus
    window.updateDashboardKPIs = function (usersCount, establishmentsCount, enseignementsCount) {
        animateCount(document.getElementById('kpi-users'), usersCount || 0);
        animateCount(document.getElementById('kpi-establishments'), establishmentsCount || 0);
        animateCount(document.getElementById('kpi-enseignements'), enseignementsCount || 0);
        updatePendingKpi();
    };

    // ============================================================
    // INITIALISATION
    // ============================================================

    document.addEventListener('DOMContentLoaded', function () {
        initTheme();
        initTabMemory();
    });

})();

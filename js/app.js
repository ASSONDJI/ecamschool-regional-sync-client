// ============================================================
// FICHIER : app.js
//
// RÔLE : Gère l'affichage UI (onglets, formulaires, listes).
//
// MODIFICATIONS  :
//   - createUser(), createEstablishment(), createMatrix()
//     passent maintenant par tools.AppLib.delegate
//     (DelegateComponent) au lieu d'apiRequest() directement.
//     → En ligne  : envoie au backend via $.ajax POST
//     → Hors ligne : sauvegarde en IndexedDB avec statut PENDING
//                    et synchronise au retour du réseau
//
//   - loadUsers(), loadEstablishments(), loadMatrices()
//     restent avec apiRequest() — lecture backend inchangée.
//
//   - Ajout de updateSyncBadge() — affiche le nombre de
//     données en attente de synchronisation dans l'UI.
// ============================================================

const API_BASE_URL = 'http://localhost:8080';
let currentTab = 'users';

// ----------------------------------------------------------
// showMessage()
// Rôle : afficher un message temporaire à l'écran.
// ----------------------------------------------------------
function showMessage(message, type) {
    type = type || 'success';
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = 'message ' + type;
    setTimeout(function () {
        messageDiv.className = 'message';
    }, 3000);
}

// ----------------------------------------------------------
// getDelegate()
// Rôle : récupérer le DelegateComponent exposé par le framework.
//        tools.AppLib.delegate est initialisé dans EBackController
//        au démarrage de app.run().
//        Retourne null si le framework n'est pas encore prêt.
// ----------------------------------------------------------
function getDelegate() {
    if (tools && tools.AppLib && tools.AppLib.delegate) {
        return tools.AppLib.delegate;
    }
    console.warn("[app.js] DelegateComponent non disponible — framework non initialisé");
    return null;
}

// ----------------------------------------------------------
// apiRequest()
// Rôle : appel $.ajax générique pour les lectures (GET).
//        Conservé pour loadUsers(), loadEstablishments(),
//        loadMatrices() qui lisent depuis le backend.
// ----------------------------------------------------------
function apiRequest(endpoint, method, data) {
    method = method || 'GET';
    const url = API_BASE_URL + endpoint;

    return new Promise(function (resolve, reject) {
        $.ajax({
            type       : method,
            url        : url,
            data       : data ? JSON.stringify(data) : null,
            dataType   : 'json',
            contentType: 'application/json',
            success: function (response) {
                resolve(response);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                const msg = 'Erreur ' + jqXHR.status + ': ' + errorThrown;
                showMessage(msg, 'error');
                reject(new Error(msg));
            }
        });
    });
}

// ----------------------------------------------------------
// updateSyncBadge()
// Rôle : afficher dans l'UI le nombre de données en attente
//        de synchronisation (statut PENDING dans IndexedDB).
//        Appelé après chaque création hors ligne.
// ----------------------------------------------------------
function updateSyncBadge() {
    let delegate = getDelegate();
    if (!delegate) return;

    // Accéder au SyncManager via le SwRouter
    if (tools.AppLib.swRouter && tools.AppLib.swRouter.syncManager) {
        tools.AppLib.swRouter.syncManager.getStatus(function (status) {

            let total = 0;
            for (let table in status) {
                if (Object.hasOwnProperty.call(status, table)) {
                    total += status[table];
                }
            }

            // Afficher ou cacher le badge selon le nombre de PENDING
            let badge = document.getElementById('sync-badge');
            if (badge) {
                if (total > 0) {
                    badge.textContent = total + " donnée(s) en attente de sync";
                    badge.style.display = 'block';
                } else {
                    badge.style.display = 'none';
                }
            }

            console.log("[app.js] Statut sync :", status, "| Total PENDING :", total);
        });
    }
}

// ============================================================
// USERS
// ============================================================

// ----------------------------------------------------------
// createUser()
// Rôle : créer un utilisateur via DelegateComponent.
//        En ligne  → POST backend → succès immédiat
//        Hors ligne → sauvegarde PENDING → sync au retour réseau
// ----------------------------------------------------------
function createUser() {

    const userData = {
        username        : document.getElementById('username').value,
        email           : document.getElementById('email').value,
        password        : document.getElementById('password').value,
        fullName        : document.getElementById('fullName').value,
        role            : document.getElementById('role').value,
        delegationRegion: document.getElementById('delegationRegion').value,
        department      : document.getElementById('department').value
    };

    let delegate = getDelegate();

    if (delegate) {

        // Passe par DelegateComponent → SwRouter → AJAX ou IndexedDB
        delegate.create(
            API_BASE_URL + '/users',
            'User',
            userData,

            // Succès — en ligne : réponse du backend
            //          hors ligne : sauvegarde locale confirmée
            function (reponse) {
                if (navigator.onLine) {
                    showMessage('Utilisateur créé avec succès !');
                } else {
                    showMessage('Hors ligne — utilisateur sauvegardé localement. Il sera synchronisé au retour du réseau.', 'warning');
                }
                document.getElementById('create-user-form').reset();
                updateSyncBadge();
                loadUsers();
            },

            // Erreur inattendue
            function (error) {
                showMessage('Erreur création utilisateur : ' + error, 'error');
            }
        );

    } else {
        // Fallback si le framework n'est pas encore prêt
        showMessage('Framework non initialisé — réessayez dans un instant.', 'error');
    }
}

// ----------------------------------------------------------
// loadUsers()
// Rôle : charger et afficher la liste des utilisateurs.
//        Lecture backend via apiRequest() — inchangé.
// ----------------------------------------------------------
function loadUsers() {
    apiRequest('/users').then(function (users) {
        const container = document.getElementById('users-list');
        if (!users || users.length === 0) {
            container.innerHTML = '<p class="placeholder">Aucun utilisateur trouvé</p>';
            return;
        }
        container.innerHTML = users.map(function (user) {
            return '<div class="data-item"><strong>' + escapeHtml(user.username) +
                   '</strong> - ' + escapeHtml(user.fullName) + '<br>' +
                   escapeHtml(user.email) + ' | ' + escapeHtml(user.role) +
                   '<br><small>ID: ' + user.id + '</small></div>';
        }).join('');
    }).catch(function () {
        document.getElementById('users-list').innerHTML =
            '<p class="placeholder">Erreur de chargement</p>';
    });
}

// ============================================================
// ESTABLISHMENTS
// ============================================================

// ----------------------------------------------------------
// createEstablishment()
// Rôle : créer un établissement via DelegateComponent.
//        Même logique que createUser().
// ----------------------------------------------------------
function createEstablishment() {

    const data = {
        code            : document.getElementById('code').value,
        name            : document.getElementById('name').value,
        city            : document.getElementById('city').value,
        department      : document.getElementById('dept').value,
        delegationRegion: document.getElementById('region').value,
        type            : document.getElementById('type').value
    };

    let delegate = getDelegate();

    if (delegate) {

        delegate.create(
            API_BASE_URL + '/establishments',
            'Establishment',
            data,

            function (reponse) {
                if (navigator.onLine) {
                    showMessage('Établissement créé avec succès !');
                } else {
                    showMessage('Hors ligne — établissement sauvegardé localement.', 'warning');
                }
                document.getElementById('create-establishment-form').reset();
                updateSyncBadge();
                loadEstablishments();
            },

            function (error) {
                showMessage('Erreur création établissement : ' + error, 'error');
            }
        );

    } else {
        showMessage('Framework non initialisé — réessayez dans un instant.', 'error');
    }
}

// ----------------------------------------------------------
// loadEstablishments() — inchangé
// ----------------------------------------------------------
function loadEstablishments() {
    apiRequest('/establishments').then(function (establishments) {
        const container = document.getElementById('establishments-list');
        if (!establishments || establishments.length === 0) {
            container.innerHTML = '<p class="placeholder">Aucun établissement trouvé</p>';
            return;
        }
        container.innerHTML = establishments.map(function (eco) {
            return '<div class="data-item"><strong>' + escapeHtml(eco.name) +
                   '</strong> (' + escapeHtml(eco.code) + ')<br>' +
                   escapeHtml(eco.city) + ' - ' + escapeHtml(eco.type) +
                   '<br><small>ID: ' + eco.id + '</small></div>';
        }).join('');
    }).catch(function () {
        document.getElementById('establishments-list').innerHTML =
            '<p class="placeholder">Erreur de chargement</p>';
    });
}

// ============================================================
// MATRICES (données en attente)
// ============================================================

// ----------------------------------------------------------
// createMatrix()
// Rôle : créer une entrée matrice via DelegateComponent.
//        Même logique que createUser().
// ----------------------------------------------------------
function createMatrix() {

    let dataValue;
    try {
        dataValue = JSON.parse(document.getElementById('dataValue').value);
    } catch (e) {
        showMessage('Le JSON est invalide !', 'error');
        return;
    }

    const matrixData = {
        clientKey      : document.getElementById('clientKey').value,
        dataValue      : dataValue,
        dataType       : document.getElementById('dataType').value,
        userId         : parseInt(document.getElementById('userId').value),
        establishmentId: parseInt(document.getElementById('establishmentId').value)
    };

    let delegate = getDelegate();

    if (delegate) {

        delegate.create(
            API_BASE_URL + '/data-matrix',
            'DataMatrix',
            matrixData,

            function (reponse) {
                if (navigator.onLine) {
                    showMessage('Donnée créée avec succès !');
                } else {
                    showMessage('Hors ligne — donnée sauvegardée localement. Elle sera synchronisée au retour du réseau.', 'warning');
                }
                document.getElementById('create-matrix-form').reset();
                updateSyncBadge();
                loadMatrices();
            },

            function (error) {
                showMessage('Erreur création donnée : ' + error, 'error');
            }
        );

    } else {
        showMessage('Framework non initialisé — réessayez dans un instant.', 'error');
    }
}

// ----------------------------------------------------------
// loadMatrices() — inchangé
// ----------------------------------------------------------
function loadMatrices() {
    apiRequest('/data-matrix').then(function (matrices) {
        const container = document.getElementById('matrices-list');
        if (!matrices || matrices.length === 0) {
            container.innerHTML = '<p class="placeholder">Aucune donnée trouvée</p>';
            return;
        }
        const pending = matrices.filter(function (m) { return m.syncStatus === 'PENDING'; });
        if (pending.length === 0) {
            container.innerHTML = '<p class="placeholder">Aucune donnée en attente</p>';
            return;
        }
        container.innerHTML = pending.map(function (matrix) {
            return '<div class="data-item"><strong>' + escapeHtml(matrix.clientKey) +
                   '</strong> - ' + escapeHtml(matrix.dataType) +
                   '<br>Statut: ' + escapeHtml(matrix.syncStatus) +
                   '<br><small>ID: ' + matrix.id + '</small></div>';
        }).join('');
    }).catch(function () {
        document.getElementById('matrices-list').innerHTML =
            '<p class="placeholder">Erreur de chargement</p>';
    });
}

// ============================================================
// Onglets + démarrage
// ============================================================
function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-content').forEach(function (content) {
        content.classList.remove('active');
    });
    document.getElementById(tabName + '-tab').classList.add('active');
    currentTab = tabName;
    if      (tabName === 'users')          loadUsers();
    else if (tabName === 'establishments') loadEstablishments();
    else if (tabName === 'matrices')       loadMatrices();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;')
              .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

document.addEventListener('DOMContentLoaded', function () {

    document.querySelectorAll('.tab-button').forEach(function (btn) {
        btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
    });
    document.getElementById('create-user-form').addEventListener('submit', function (e) {
        e.preventDefault(); createUser();
    });
    document.getElementById('create-establishment-form').addEventListener('submit', function (e) {
        e.preventDefault(); createEstablishment();
    });
    document.getElementById('create-matrix-form').addEventListener('submit', function (e) {
        e.preventDefault(); createMatrix();
    });

    loadUsers();
    loadEstablishments();
    loadMatrices();

    // Vérifier le statut de synchronisation au démarrage
    // Délai pour laisser le framework s'initialiser
    setTimeout(updateSyncBadge, 1000);

    console.log('[app.js] UI démarrée');
});

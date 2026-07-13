// ============================================================
// FICHIER : app.js
//
// RÔLE : Gère l'affichage UI (onglets, formulaires, listes).
//
// ÉTAPE 8 DU PLAN DE MIGRATION SERVICE WORKER :
//   - createUser(), createEstablishment(), createMatrix()
//     font désormais un appel réseau NORMAL (apiRequest), sans
//     plus aucune branche navigator.onLine. C'est sw.js qui
//     intercepte ces requêtes et gère la bascule offline en
//     coulisses (mise en file d'attente IndexedDB, retry au
//     retour réseau) — l'app n'a plus besoin de le savoir.
//   - updateSyncBadge() lit directement le store _pending
//     d'IndexedDB (partagé entre la page et le Service Worker)
//     plutôt que d'interroger l'ancien SyncManager.
//   - Écoute des messages du Service Worker (QUEUED, SYNC_DONE,
//     CACHE_UPDATED) pour rafraîchir l'affichage automatiquement.
//   - Gestion des boutons Modifier/Supprimer pour :
//       * Utilisateurs (onglet "Utilisateurs")
//       * Établissements (onglet "Établissements")
//       * Données en attente (onglet "Données en attente")
//   - Tableau de bord utilisant la matrice du framework
//     (tools.Library.Stats.Matrice) avec ses méthodes :
//       * exportXSL() pour l'export Excel
//       * groupLignesByColumn() pour les regroupements
//       * getDataSet() pour l'affichage
// ============================================================

const API_BASE_URL = 'http://localhost:8080';
let currentTab = 'users';
let matrixEditingId = null;      // id serveur de l'enregistrement en cours d'édition
let matrixEditingLocalId = null; // _localId pour les enregistrements non synchronisés
let pendingEditingLocalId = null; // _localId pour l'édition d'un PENDING
let pendingEditingTable = null;   // table pour l'édition d'un PENDING

// Stockage global des matrices du framework
window._matrices = {};

// ----------------------------------------------------------
// escapeHtml()
// Rôle : Échappe les caractères HTML pour éviter les XSS.
// ----------------------------------------------------------
function escapeHtml(str) {
    if (str === null || str === undefined || str === '') return '';
    str = String(str);
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ----------------------------------------------------------
// confirmAsync()
// Rôle : demander une confirmation à l'utilisateur.
//        Utilise la modale stylée (js/ui-enhancements.js) si
//        elle est chargée, sinon retombe sur confirm() natif.
// ----------------------------------------------------------
function confirmAsync(message) {
    if (typeof window.confirmDialog === 'function') {
        return window.confirmDialog(message);
    }
    return Promise.resolve(window.confirm(message));
}

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
// apiRequest()
// Rôle : appel $.ajax générique pour les lectures (GET).
//        Conservé pour loadUsers(), loadEstablishments(),
//        loadMatrices() qui lisent depuis le backend.
// ----------------------------------------------------------
function apiRequest(endpoint, method, data) {
    method = method || 'GET';
    let url = API_BASE_URL + endpoint;

    // Pour PUT et DELETE, ajouter l'ID dans l'URL si présent
    if ((method === 'PUT' || method === 'DELETE') && data && data.id) {
        url = url + '/' + data.id;
        // Supprimer l'id du body pour ne pas l'envoyer deux fois
        delete data.id;
        // Si le body est vide après suppression, on ne l'envoie pas
        if (Object.keys(data).length === 0) {
            data = null;
        }
    }

    let ajaxOptions = {
        type: method,
        url: url,
        dataType: 'json',
        contentType: 'application/json'
    };

    if (data && method !== 'GET') {
        ajaxOptions.data = JSON.stringify(data);
    }

    return new Promise(function (resolve, reject) {
        $.ajax(ajaxOptions)
            .done(function (response) {
                resolve(response);
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                const msg = 'Erreur ' + jqXHR.status + ': ' + errorThrown;
                showMessage(msg, 'error');
                reject(new Error(msg));
            });
    });
}

// ----------------------------------------------------------
// updateSyncBadge()
// Rôle : afficher dans l'UI le nombre de données en attente
//        de synchronisation.
//
// IndexedDB est partagée entre la page et le Service Worker
// (même origine, même base "ecamschool_idb") — la page peut
// donc lire directement le store "_pending" sans passer par
// un intermédiaire. Lecture brute, sans jQuery.
// ----------------------------------------------------------
function updateSyncBadge() {

    // Version 6 : alignée avec sw-idb-store.js
    let request = indexedDB.open("ecamschool_idb", 7);

    request.onsuccess = function (event) {
        let db = event.target.result;

        if (!db.objectStoreNames.contains("_pending")) {
            db.close();
            return;
        }

        let tx = db.transaction(["_pending"], "readonly");
        let store = tx.objectStore("_pending");
        let getAllReq = store.getAll();

        getAllReq.onsuccess = function (ev) {
            let total = ev.target.result.filter(function (r) {
                return r._syncStatus === "PENDING";
            }).length;

            let badge = document.getElementById('sync-badge');
            if (badge) {
                if (total > 0) {
                    badge.textContent = total + " donnée(s) en attente de sync";
                    badge.style.display = 'block';
                } else {
                    badge.style.display = 'none';
                }
            }
            console.log("[app.js] Total PENDING :", total);
            db.close();
        };

        getAllReq.onerror = function () { db.close(); };
    };

    request.onerror = function (event) {
        console.warn("[app.js] updateSyncBadge() — IndexedDB non accessible :", event.target.error);
    };
}

// ============================================================
// USERS
// ============================================================

// ----------------------------------------------------------
// createUser()
// Rôle : créer un utilisateur
//        En ligne  → POST backend → succès immédiat
//        Hors ligne → sauvegarde PENDING → sync au retour réseau
// ----------------------------------------------------------
function createUser() {

    // Vérifier si on est en mode édition PENDING
    if (pendingEditingLocalId && pendingEditingTable === 'User') {
        updatePendingRecord('User', pendingEditingLocalId);
        return;
    }

    //  NETTOYAGE : trim() et validation des données
    const userData = {
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value.trim(),
        fullName: document.getElementById('fullName').value.trim(),
        role: document.getElementById('role').value.trim(),
        delegationRegion: document.getElementById('delegationRegion').value.trim(),
        department: document.getElementById('department').value.trim()
    };

    //  VALIDATION : vérifier que les champs obligatoires ne sont pas vides
    if (!userData.username || !userData.email) {
        showMessage('Le nom d\'utilisateur et l\'email sont obligatoires.', 'error');
        return;
    }

    apiRequest('/users', 'POST', userData).then(function (reponse) {
        if (reponse && reponse.queued) {
            showMessage('Hors ligne — utilisateur mis en file d\'attente. Il sera synchronisé au retour du réseau.', 'warning');
        } else {
            showMessage('Utilisateur créé avec succès !');
        }
        document.getElementById('create-user-form').reset();
        // Réinitialiser le mode édition
        document.getElementById('user-editing-id').value = '';
        document.getElementById('user-submit-btn').textContent = 'Créer l\'utilisateur';
        pendingEditingLocalId = null;
        pendingEditingTable = null;
        updateSyncBadge();
        loadUsers();
    }).catch(function (error) {
        showMessage('Erreur création utilisateur : ' + error, 'error');
    });
}

// ----------------------------------------------------------
// deleteUser()
// Rôle : supprimer un utilisateur
// ----------------------------------------------------------
// ----------------------------------------------------------
// deleteUser()
// Rôle : supprimer un utilisateur
// ★ MODIFICATION : Attendre la notification CACHE_UPDATED
// ----------------------------------------------------------
function deleteUser(id) {
    confirmAsync('Supprimer définitivement cet utilisateur ?').then(function (ok) {
        if (!ok) return;

        // ★ AJOUT : Indicateur pour savoir si la notification a été reçue
        var cacheUpdatedReceived = false;

        // ★ AJOUT : Écouteur temporaire pour CACHE_UPDATED
        var onCacheUpdated = function (event) {
            if (event.data && event.data.type === 'CACHE_UPDATED' && event.data.table === 'User') {
                cacheUpdatedReceived = true;
                console.log("[app.js] CACHE_UPDATED reçu pour User - rechargement...");
                loadUsers();
                navigator.serviceWorker.removeEventListener('message', onCacheUpdated);
            }
        };
        navigator.serviceWorker.addEventListener('message', onCacheUpdated);

        apiRequest('/users', 'DELETE', { id: id }).then(function (reponse) {
            if (reponse && reponse.queued) {
                showMessage('Hors ligne — suppression en attente de synchronisation.', 'warning');
            } else {
                showMessage('Utilisateur supprimé avec succès !');
            }
            updateSyncBadge();

            // ★ MODIFICATION : NE PAS APPELER loadUsers() ici
            // loadUsers(); ← SUPPRIMER CETTE LIGNE

            // ★ AJOUT : Fallback si la notification n'arrive pas dans les 2 secondes
            setTimeout(function () {
                if (!cacheUpdatedReceived) {
                    console.log("[app.js] Fallback - rechargement forcé après délai.");
                    loadUsers();
                    navigator.serviceWorker.removeEventListener('message', onCacheUpdated);
                }
            }, 2000);
        }).catch(function (error) {
            showMessage('Erreur suppression : ' + error, 'error');
            navigator.serviceWorker.removeEventListener('message', onCacheUpdated);
            loadUsers();
        });
    });
}

// ----------------------------------------------------------
// updateUser()
// Rôle : mettre à jour un utilisateur (mode édition)
// ----------------------------------------------------------
function updateUser(id) {
    const userData = {
        id: parseInt(id),
        username: document.getElementById('username').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value.trim(),
        fullName: document.getElementById('fullName').value.trim(),
        role: document.getElementById('role').value.trim(),
        delegationRegion: document.getElementById('delegationRegion').value.trim(),
        department: document.getElementById('department').value.trim(),
        isActive: true
    };

    //  VALIDATION : vérifier que les champs obligatoires ne sont pas vides
    if (!userData.username || !userData.email) {
        showMessage('Le nom d\'utilisateur et l\'email sont obligatoires.', 'error');
        return;
    }

    apiRequest('/users', 'PUT', userData).then(function (reponse) {
        if (reponse && reponse.queued) {
            showMessage('Hors ligne — modification sauvegardée localement.', 'warning');
        } else {
            showMessage('Utilisateur mis à jour avec succès !');
        }
        document.getElementById('create-user-form').reset();
        document.getElementById('user-editing-id').value = '';
        document.getElementById('user-submit-btn').textContent = 'Créer l\'utilisateur';
        pendingEditingLocalId = null;
        pendingEditingTable = null;
        updateSyncBadge();
        loadUsers();
    }).catch(function (error) {
        showMessage('Erreur mise à jour : ' + error, 'error');
    });
}

// ----------------------------------------------------------
// loadUsers()
// Rôle : charger et afficher la liste des utilisateurs
//        avec boutons Modifier/Supprimer.
// ----------------------------------------------------------
function loadUsers() {
    console.log("[app.js] loadUsers() appelée");
    apiRequest('/users').then(function (users) {
        console.log("[app.js] loadUsers() — données reçues :", users ? users.length : 0);
        const container = document.getElementById('users-list');
        if (!container) {
            console.warn("[app.js] loadUsers() — conteneur #users-list introuvable");
            return;
        }
        if (!users || users.length === 0) {
            container.innerHTML = '<p class="placeholder">Aucun utilisateur trouvé</p>';
            return;
        }
        // Affichage avec boutons Modifier/Supprimer
        container.innerHTML = users.map(function (user) {
            return '<div class="data-item" data-id="' + escapeHtml(user.id) + '">' +
                '<strong>' + escapeHtml(user.username) + '</strong> - ' + escapeHtml(user.fullName) + '<br>' +
                escapeHtml(user.email) + ' <span class="role-badge role-' + escapeHtml(user.role) + '">' + escapeHtml(user.role) + '</span>' +
                '<br><small>ID: ' + user.id + '</small>' +
                '<div style="margin-top:8px;">' +
                '   <button class="btn-user-edit" data-id="' + escapeHtml(user.id) +
                '" style="background:#3498db;color:white;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;margin-right:8px;">✏️ Modifier</button>' +
                '   <button class="btn-user-delete" data-id="' + escapeHtml(user.id) +
                '" style="background:#e74c3c;color:white;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;">🗑️ Supprimer</button>' +
                '</div>' +
                '</div>';
        }).join('');
    }).catch(function (error) {
        console.error("[app.js] loadUsers() — erreur :", error);
        document.getElementById('users-list').innerHTML =
            '<p class="placeholder">Erreur de chargement</p>';
    });
}

// ============================================================
// ESTABLISHMENTS
// ============================================================

// ----------------------------------------------------------
// createEstablishment()
// Rôle : créer un établissement
// ----------------------------------------------------------
function createEstablishment() {

    // Vérifier si on est en mode édition PENDING
    if (pendingEditingLocalId && pendingEditingTable === 'Establishment') {
        updatePendingRecord('Establishment', pendingEditingLocalId);
        return;
    }

    // NETTOYAGE : trim() et validation
    const data = {
        code: document.getElementById('code').value.trim(),
        name: document.getElementById('name').value.trim(),
        city: document.getElementById('city').value.trim(),
        department: document.getElementById('dept').value.trim(),
        delegationRegion: document.getElementById('region').value.trim(),
        type: document.getElementById('type').value.trim()
    };

    if (!data.code || !data.name) {
        showMessage('Le code et le nom sont obligatoires.', 'error');
        return;
    }


    apiRequest('/establishments', 'POST', data).then(function (reponse) {
        if (reponse && reponse.queued) {
            showMessage('Hors ligne — établissement mis en file d\'attente.', 'warning');
        } else {
            showMessage('Établissement créé avec succès !');
        }
        document.getElementById('create-establishment-form').reset();
        // Réinitialiser le mode édition
        document.getElementById('establishment-editing-id').value = '';
        document.getElementById('establishment-submit-btn').textContent = 'Créer l\'établissement';
        pendingEditingLocalId = null;
        pendingEditingTable = null;
        updateSyncBadge();
        loadEstablishments();
    }).catch(function (error) {
        showMessage('Erreur création établissement : ' + error, 'error');
    });
}

// ----------------------------------------------------------
// deleteEstablishment()
// Rôle : supprimer un établissement
// ----------------------------------------------------------
// ----------------------------------------------------------
// deleteEstablishment()
// Rôle : supprimer un établissement
// ★ MODIFICATION : Attendre la notification CACHE_UPDATED
// ----------------------------------------------------------
function deleteEstablishment(id) {
    confirmAsync('Supprimer définitivement cet établissement ?').then(function (ok) {
        if (!ok) return;

        var cacheUpdatedReceived = false;

        var onCacheUpdated = function (event) {
            if (event.data && event.data.type === 'CACHE_UPDATED' && event.data.table === 'Establishment') {
                cacheUpdatedReceived = true;
                console.log("[app.js] CACHE_UPDATED reçu pour Establishment - rechargement...");
                loadEstablishments();
                navigator.serviceWorker.removeEventListener('message', onCacheUpdated);
            }
        };
        navigator.serviceWorker.addEventListener('message', onCacheUpdated);

        apiRequest('/establishments', 'DELETE', { id: id }).then(function (reponse) {
            if (reponse && reponse.queued) {
                showMessage('Hors ligne — suppression en attente de synchronisation.', 'warning');
            } else {
                showMessage('Établissement supprimé avec succès !');
            }
            updateSyncBadge();

            setTimeout(function () {
                if (!cacheUpdatedReceived) {
                    console.log("[app.js] Fallback - rechargement forcé après délai.");
                    loadEstablishments();
                    navigator.serviceWorker.removeEventListener('message', onCacheUpdated);
                }
            }, 2000);
        }).catch(function (error) {
            showMessage('Erreur suppression : ' + error, 'error');
            navigator.serviceWorker.removeEventListener('message', onCacheUpdated);
            loadEstablishments();
        });
    });
}

// ----------------------------------------------------------
// updateEstablishment()
// Rôle : mettre à jour un établissement (mode édition)
// ----------------------------------------------------------
function updateEstablishment(id) {
    const data = {
        id: parseInt(id),
        code: document.getElementById('code').value.trim(),
        name: document.getElementById('name').value.trim(),
        city: document.getElementById('city').value.trim(),
        department: document.getElementById('dept').value.trim(),
        delegationRegion: document.getElementById('region').value.trim(),
        type: document.getElementById('type').value.trim()
    };

    if (!data.code || !data.name) {
        showMessage('Le code et le nom sont obligatoires.', 'error');
        return;
    }

    apiRequest('/establishments', 'PUT', data).then(function (reponse) {
        if (reponse && reponse.queued) {
            showMessage('Hors ligne — modification sauvegardée localement.', 'warning');
        } else {
            showMessage('Établissement mis à jour avec succès !');
        }
        document.getElementById('create-establishment-form').reset();
        document.getElementById('establishment-editing-id').value = '';
        document.getElementById('establishment-submit-btn').textContent = 'Créer l\'établissement';
        pendingEditingLocalId = null;
        pendingEditingTable = null;
        updateSyncBadge();
        loadEstablishments();
    }).catch(function (error) {
        showMessage('Erreur mise à jour : ' + error, 'error');
    });
}

// ----------------------------------------------------------
// loadEstablishments()
// Rôle : charger et afficher la liste des établissements
//        avec boutons Modifier/Supprimer.
// ----------------------------------------------------------
function loadEstablishments() {
    console.log("[app.js] loadEstablishments() appelée");
    apiRequest('/establishments').then(function (establishments) {
        console.log("[app.js] loadEstablishments() — données reçues :", establishments ? establishments.length : 0);
        const container = document.getElementById('establishments-list');
        if (!container) {
            console.warn("[app.js] loadEstablishments() — conteneur #establishments-list introuvable");
            return;
        }
        if (!establishments || establishments.length === 0) {
            container.innerHTML = '<p class="placeholder">Aucun établissement trouvé</p>';
            return;
        }
        // Affichage avec boutons Modifier/Supprimer
        container.innerHTML = establishments.map(function (eco) {
            return '<div class="data-item" data-id="' + escapeHtml(eco.id) + '">' +
                '<strong>' + escapeHtml(eco.name) + '</strong> (' + escapeHtml(eco.code) + ')<br>' +
                escapeHtml(eco.city) + ' <span class="role-badge role-' + escapeHtml(eco.type) + '">' + escapeHtml(eco.type) + '</span>' +
                '<br><small>ID: ' + eco.id + '</small>' +
                '<div style="margin-top:8px;">' +
                '   <button class="btn-establishment-edit" data-id="' + escapeHtml(eco.id) +
                '" style="background:#3498db;color:white;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;margin-right:8px;">✏️ Modifier</button>' +
                '   <button class="btn-establishment-delete" data-id="' + escapeHtml(eco.id) +
                '" style="background:#e74c3c;color:white;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;">🗑️ Supprimer</button>' +
                '</div>' +
                '</div>';
        }).join('');
    }).catch(function (error) {
        console.error("[app.js] loadEstablishments() — erreur :", error);
        document.getElementById('establishments-list').innerHTML =
            '<p class="placeholder">Erreur de chargement</p>';
    });
}

// ============================================================
// MATRICES (données en attente)
// ============================================================

// ----------------------------------------------------------
// createMatrix()
// Rôle : créer une entrée matrice
// ----------------------------------------------------------
function createMatrix() {

    // Vérifier si on est en mode édition PENDING
    if (pendingEditingLocalId && pendingEditingTable === 'DataMatrix') {
        updatePendingRecord('DataMatrix', pendingEditingLocalId);
        return;
    }

    let dataValue;
    try {
        dataValue = JSON.parse(document.getElementById('dataValue').value);
    } catch (e) {
        showMessage('Le JSON est invalide !', 'error');
        return;
    }

    const matrixData = {
        clientKey: document.getElementById('clientKey').value,
        dataValue: dataValue,
        dataType: document.getElementById('dataType').value,
        userId: parseInt(document.getElementById('userId').value),
        establishmentId: parseInt(document.getElementById('establishmentId').value)
    };

    apiRequest('/data-matrix', 'POST', matrixData).then(function (reponse) {
        if (reponse && reponse.queued) {
            showMessage('Hors ligne — donnée mise en file d\'attente.', 'warning');
        } else {
            showMessage('Donnée créée avec succès !');
        }
        document.getElementById('create-matrix-form').reset();
        document.getElementById('editingId').value = '';
        document.getElementById('editingLocalId').value = '';
        document.getElementById('matrix-submit-btn').textContent = 'Ajouter la donnée';
        matrixEditingId = null;
        matrixEditingLocalId = null;
        pendingEditingLocalId = null;
        pendingEditingTable = null;
        updateSyncBadge();
        loadMatrices();
    }).catch(function (error) {
        showMessage('Erreur création donnée : ' + error, 'error');
    });
}

// ----------------------------------------------------------
// updateMatrix()
// Rôle : mettre à jour une donnée existante (mode édition)
// ----------------------------------------------------------
function updateMatrix(editingId, editingLocalId) {

    let dataValue;
    try {
        dataValue = JSON.parse(document.getElementById('dataValue').value);
    } catch (e) {
        showMessage('Le JSON est invalide !', 'error');
        return;
    }

    const matrixData = {
        id: editingId ? parseInt(editingId) : undefined,
        _localId: editingLocalId || undefined,
        clientKey: document.getElementById('clientKey').value,
        dataValue: dataValue,
        dataType: document.getElementById('dataType').value,
        userId: parseInt(document.getElementById('userId').value),
        establishmentId: parseInt(document.getElementById('establishmentId').value)
    };

    apiRequest('/data-matrix', 'PUT', matrixData).then(function (reponse) {
        if (reponse && reponse.queued) {
            showMessage('Hors ligne — modification sauvegardée localement.', 'warning');
        } else {
            showMessage('Donnée mise à jour avec succès !');
        }
        document.getElementById('create-matrix-form').reset();
        document.getElementById('editingId').value = '';
        document.getElementById('editingLocalId').value = '';
        document.getElementById('matrix-submit-btn').textContent = 'Ajouter la donnée';
        matrixEditingId = null;
        matrixEditingLocalId = null;
        pendingEditingLocalId = null;
        pendingEditingTable = null;
        updateSyncBadge();
        loadMatrices();
    }).catch(function (error) {
        showMessage('Erreur mise à jour : ' + error, 'error');
    });
}

// ----------------------------------------------------------
// deleteMatrix()
// Rôle : supprimer une donnée existante
// ----------------------------------------------------------
function deleteMatrix(id, localId) {
    confirmAsync('Supprimer définitivement cet enregistrement ?').then(function (ok) {
        if (!ok) return;

        const deleteId = id && id !== 'null' ? parseInt(id) : null;
        const data = deleteId ? { id: deleteId } : { _localId: localId };

        apiRequest('/data-matrix', 'DELETE', data).then(function (reponse) {
            if (reponse && reponse.queued) {
                showMessage('Hors ligne — suppression en attente de synchronisation.', 'warning');
            } else {
                showMessage('Enregistrement supprimé avec succès !');
            }
            updateSyncBadge();
            loadMatrices();
        }).catch(function (error) {
            showMessage('Erreur suppression : ' + error, 'error');
        });
    });
}

// ----------------------------------------------------------
// deletePending()
// Rôle : Annuler une opération en attente (supprimer de _pending)
// ----------------------------------------------------------
function deletePending(localId) {
    confirmAsync('Annuler cette opération en attente ? La donnée ne sera pas synchronisée.').then(function (ok) {
        if (!ok) return;

        console.log("[app.js] deletePending() — suppression de _localId:", localId);

    let request = indexedDB.open("ecamschool_idb", 7);

        request.onsuccess = function (event) {
            let db = event.target.result;

            if (!db.objectStoreNames.contains("_pending")) {
                db.close();
                showMessage('Aucune donnée en attente.', 'warning');
                return;
            }

            let tx = db.transaction(["_pending"], "readwrite");
            let store = tx.objectStore("_pending");
            let deleteReq = store.delete(parseInt(localId));

            deleteReq.onsuccess = function () {
                console.log("[app.js] deletePending() — entrée supprimée :", localId);
                showMessage('Opération annulée avec succès.', 'success');
                db.close();
                updateSyncBadge();
                loadMatrices();
            };

            deleteReq.onerror = function (event) {
                console.error("[app.js] deletePending() — erreur :", event.target.error);
                showMessage('Erreur lors de l\'annulation.', 'error');
                db.close();
            };
        };

        request.onerror = function (event) {
            console.warn("[app.js] deletePending() — IndexedDB non accessible :", event.target.error);
            showMessage('Erreur de connexion à IndexedDB.', 'error');
        };
    });
}

// ----------------------------------------------------------
// editPending()
// Rôle : Modifier une opération en attente
//        Récupère les données PENDING et pré-remplit le formulaire
// ----------------------------------------------------------
function editPending(localId, table) {
    console.log("[app.js] editPending() — localId:", localId, "| table:", table);

    let request = indexedDB.open("ecamschool_idb", 7);

    request.onsuccess = function (event) {
        let db = event.target.result;

        if (!db.objectStoreNames.contains("_pending")) {
            db.close();
            showMessage('Aucune donnée en attente.', 'warning');
            return;
        }

        let tx = db.transaction(["_pending"], "readonly");
        let store = tx.objectStore("_pending");
        let getReq = store.get(parseInt(localId));

        getReq.onsuccess = function (ev) {
            let record = ev.target.result;
            if (!record) {
                db.close();
                showMessage('Enregistrement non trouvé.', 'error');
                return;
            }

            console.log("[app.js] editPending() — données récupérées :", record);
            db.close();

            // Stocker les infos pour la soumission
            pendingEditingLocalId = parseInt(localId);
            pendingEditingTable = table;

            // Rediriger vers le bon onglet avec délai pour laisser le DOM se mettre à jour
            switch (table) {
                case 'User':
                    switchTab('users');
                    setTimeout(function () {
                        document.getElementById('username').value = record.username || '';
                        document.getElementById('email').value = record.email || '';
                        document.getElementById('fullName').value = record.fullName || '';
                        document.getElementById('role').value = record.role || 'ADMIN';
                        document.getElementById('delegationRegion').value = record.delegationRegion || 'CENTRE';
                        document.getElementById('department').value = record.department || 'Mfoundi';
                        document.getElementById('password').value = record.password || '';
                        document.getElementById('user-editing-id').value = record.id || '';
                        document.getElementById('user-submit-btn').textContent = '✏️ Mettre à jour (PENDING)';
                        showMessage('Mode édition PENDING activé — modifiez puis soumettez.', 'success');
                    }, 100);
                    break;

                case 'Establishment':
                    switchTab('establishments');
                    setTimeout(function () {
                        document.getElementById('code').value = record.code || '';
                        document.getElementById('name').value = record.name || '';
                        document.getElementById('city').value = record.city || 'Yaoundé';
                        document.getElementById('dept').value = record.department || 'Mfoundi';
                        document.getElementById('region').value = record.delegationRegion || 'CENTRE';
                        document.getElementById('type').value = record.type || 'PUBLIC';
                        document.getElementById('establishment-editing-id').value = record.id || '';
                        document.getElementById('establishment-submit-btn').textContent = '✏️ Mettre à jour (PENDING)';
                        showMessage('Mode édition PENDING activé — modifiez puis soumettez.', 'success');
                    }, 100);
                    break;

                case 'DataMatrix':
                default:
                    switchTab('matrices');
                    setTimeout(function () {
                        document.getElementById('clientKey').value = record.clientKey || '';
                        document.getElementById('dataType').value = record.dataType || 'TEACHER_NEED';
                        document.getElementById('userId').value = record.userId || '';
                        document.getElementById('establishmentId').value = record.establishmentId || '';
                        if (record.dataValue) {
                            document.getElementById('dataValue').value = JSON.stringify(record.dataValue, null, 2);
                        }
                        document.getElementById('editingId').value = record.id || '';
                        document.getElementById('editingLocalId').value = record._localId || '';
                        document.getElementById('matrix-submit-btn').textContent = '✏️ Mettre à jour (PENDING)';
                        showMessage('Mode édition PENDING activé — modifiez puis soumettez.', 'success');
                    }, 100);
                    break;
            }
        };

        getReq.onerror = function (event) {
            db.close();
            console.error("[app.js] editPending() — erreur lecture :", event.target.error);
            showMessage('Erreur de lecture des données.', 'error');
        };
    };

    request.onerror = function (event) {
        console.warn("[app.js] editPending() — IndexedDB non accessible :", event.target.error);
        showMessage('Erreur de connexion à IndexedDB.', 'error');
    };
}

// ----------------------------------------------------------
// updatePendingRecord()
// Rôle : Mettre à jour un enregistrement PENDING dans IndexedDB
// ----------------------------------------------------------
function updatePendingRecord(table, localId) {
    console.log("[app.js] updatePendingRecord() — table:", table, "| localId:", localId);

    // Récupérer les nouvelles données selon la table
    let newData = {};

    switch (table) {
        case 'User':
            // NETTOYAGE : trim() pour les données PENDING
            newData = {
                username: document.getElementById('username').value.trim(),
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value.trim(),
                fullName: document.getElementById('fullName').value.trim(),
                role: document.getElementById('role').value.trim(),
                delegationRegion: document.getElementById('delegationRegion').value.trim(),
                department: document.getElementById('department').value.trim()
            };
            break;
        case 'Establishment':
            newData = {
                code: document.getElementById('code').value,
                name: document.getElementById('name').value,
                city: document.getElementById('city').value,
                department: document.getElementById('dept').value,
                delegationRegion: document.getElementById('region').value,
                type: document.getElementById('type').value
            };
            break;
        case 'DataMatrix':
            let dataValue;
            try {
                dataValue = JSON.parse(document.getElementById('dataValue').value);
            } catch (e) {
                showMessage('Le JSON est invalide !', 'error');
                return;
            }
            newData = {
                clientKey: document.getElementById('clientKey').value,
                dataValue: dataValue,
                dataType: document.getElementById('dataType').value,
                userId: parseInt(document.getElementById('userId').value),
                establishmentId: parseInt(document.getElementById('establishmentId').value)
            };
            break;
        default:
            showMessage('Table inconnue : ' + table, 'error');
            return;
    }

    let request = indexedDB.open("ecamschool_idb", 7);

    request.onsuccess = function (event) {
        let db = event.target.result;

        if (!db.objectStoreNames.contains("_pending")) {
            db.close();
            showMessage('Aucune donnée en attente.', 'warning');
            return;
        }

        let tx = db.transaction(["_pending"], "readwrite");
        let store = tx.objectStore("_pending");
        let getReq = store.get(localId);

        getReq.onsuccess = function (ev) {
            let record = ev.target.result;
            if (!record) {
                db.close();
                showMessage('Enregistrement non trouvé.', 'error');
                return;
            }

            // Mettre à jour les données
            let updatedRecord = Object.assign({}, record, newData, {
                _updatedAt: new Date().toISOString()
            });

            let putReq = store.put(updatedRecord);

            putReq.onsuccess = function () {
                console.log("[app.js] updatePendingRecord() — mise à jour réussie :", localId);
                showMessage('Donnée en attente mise à jour avec succès.', 'success');

                // Réinitialiser le formulaire
                switch (table) {
                    case 'User':
                        document.getElementById('create-user-form').reset();
                        document.getElementById('user-editing-id').value = '';
                        document.getElementById('user-submit-btn').textContent = 'Créer l\'utilisateur';
                        break;
                    case 'Establishment':
                        document.getElementById('create-establishment-form').reset();
                        document.getElementById('establishment-editing-id').value = '';
                        document.getElementById('establishment-submit-btn').textContent = 'Créer l\'établissement';
                        break;
                    case 'DataMatrix':
                        document.getElementById('create-matrix-form').reset();
                        document.getElementById('editingId').value = '';
                        document.getElementById('editingLocalId').value = '';
                        document.getElementById('matrix-submit-btn').textContent = 'Ajouter la donnée';
                        break;
                }

                pendingEditingLocalId = null;
                pendingEditingTable = null;

                db.close();
                updateSyncBadge();
                loadMatrices();
            };

            putReq.onerror = function (event) {
                console.error("[app.js] updatePendingRecord() — erreur :", event.target.error);
                showMessage('Erreur lors de la mise à jour.', 'error');
                db.close();
            };
        };

        getReq.onerror = function (event) {
            db.close();
            console.error("[app.js] updatePendingRecord() — erreur lecture :", event.target.error);
            showMessage('Erreur de lecture des données.', 'error');
        };
    };

    request.onerror = function (event) {
        console.warn("[app.js] updatePendingRecord() — IndexedDB non accessible :", event.target.error);
        showMessage('Erreur de connexion à IndexedDB.', 'error');
    };
}

// ----------------------------------------------------------
// loadMatrices()
// Rôle : charger et afficher les données en attente
//        LECTURE DEPUIS INDEXEDDB (pas depuis le backend)
//        avec boutons Modifier et Annuler.
// ----------------------------------------------------------
function loadMatrices() {
    console.log("[app.js] loadMatrices() appelée");

    // 1. Lire directement depuis IndexedDB
    let request = indexedDB.open("ecamschool_idb", 7);

    request.onsuccess = function (event) {
        let db = event.target.result;

        if (!db.objectStoreNames.contains("_pending")) {
            db.close();
            document.getElementById('matrices-list').innerHTML =
                '<p class="placeholder">Aucune donnée en attente</p>';
            return;
        }

        let tx = db.transaction(["_pending"], "readonly");
        let store = tx.objectStore("_pending");
        let getAllReq = store.getAll();

        getAllReq.onsuccess = function (ev) {
            let allRecords = ev.target.result || [];

            // Filtrer uniquement les PENDING
            let pending = allRecords.filter(function (r) {
                return r._syncStatus === "PENDING";
            });

            console.log("[app.js] loadMatrices() — PENDING trouvés :", pending.length);

            const container = document.getElementById('matrices-list');
            if (!container) {
                console.warn("[app.js] loadMatrices() — conteneur #matrices-list introuvable");
                db.close();
                return;
            }

            if (pending.length === 0) {
                container.innerHTML = '<p class="placeholder">Aucune donnée en attente</p>';
                db.close();
                return;
            }

            // Afficher les données PENDING avec les deux boutons
            container.innerHTML = pending.map(function (record) {
                let displayName = record._table || 'Data';
                let details = '';
                let dataPreview = '';

                if (record._table === 'User') {
                    displayName = '👤 ' + (record.username || 'Utilisateur');
                    details = 'Email: ' + (record.email || 'N/A');
                    dataPreview = 'Nom complet: ' + (record.fullName || 'N/A');
                } else if (record._table === 'Establishment') {
                    displayName = '🏛️ ' + (record.name || 'Établissement');
                    details = 'Ville: ' + (record.city || 'N/A');
                    dataPreview = 'Code: ' + (record.code || 'N/A');
                } else {
                    displayName = '📊 ' + (record.clientKey || 'Donnée');
                    details = 'Type: ' + (record.dataType || 'N/A');
                    dataPreview = 'Données: ' + (record.dataValue ? JSON.stringify(record.dataValue).substring(0, 50) + '...' : 'N/A');
                }

                let operationLabel = '';
                let operationColor = '';
                if (record._operation === 'CREATE') {
                    operationLabel = 'Création';
                    operationColor = '#27ae60';
                } else if (record._operation === 'UPDATE') {
                    operationLabel = 'Modification';
                    operationColor = '#f39c12';
                } else if (record._operation === 'DELETE') {
                    operationLabel = 'Suppression';
                    operationColor = '#e74c3c';
                }

                let endpoint = record._endpoint || '/unknown';

                return '<div class="data-item" data-localid="' + escapeHtml(record._localId) +
                    '" data-table="' + escapeHtml(record._table) +
                    '" data-id="' + escapeHtml(record.id || '') + '">' +
                    '<strong>' + displayName + '</strong>' +
                    ' <span style="color:' + operationColor + ';font-weight:bold;">' + operationLabel + '</span>' +
                    '<br><small>Table: ' + escapeHtml(record._table || 'N/A') +
                    ' | ' + details +
                    '<br>📝 ' + dataPreview +
                    '<br>🔗 Endpoint: ' + escapeHtml(endpoint) + '</small>' +
                    '<br><span style="color:#f59e0b;font-size:0.85rem;">⏳ En attente de synchronisation</span>' +
                    '<div style="margin-top:10px;">' +
                    '   <button class="btn-edit-pending" data-localid="' + escapeHtml(record._localId) +
                    '" data-table="' + escapeHtml(record._table) +
                    '" style="background:#3498db;color:white;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;margin-right:8px;">✏️ Modifier</button>' +
                    '   <button class="btn-delete-pending" data-localid="' + escapeHtml(record._localId) +
                    '" style="background:#e74c3c;color:white;border:none;padding:6px 14px;border-radius:4px;cursor:pointer;">🗑️ Annuler</button>' +
                    '</div>' +
                    '</div>';
            }).join('');

            db.close();
        };

        getAllReq.onerror = function () {
            db.close();
            document.getElementById('matrices-list').innerHTML =
                '<p class="placeholder">Erreur de lecture des données en attente</p>';
        };
    };

    request.onerror = function (event) {
        console.warn("[app.js] loadMatrices() — IndexedDB non accessible :", event.target.error);
        document.getElementById('matrices-list').innerHTML =
            '<p class="placeholder">Erreur de chargement</p>';
    };
}

// ============================================================
// FONCTIONS DU TABLEAU DE BORD (UTILISANT LA MATRICE DU FRAMEWORK)
// ============================================================

// ----------------------------------------------------------
// loadDashboard()
// Rôle : Charge les données et construit les matrices du framework
// ============================================================
function loadDashboard() {
    console.log("[app.js] loadDashboard() appelée");

    showDashboardMessage("Chargement des données...", "info");

    // Charger les 3 sources de données
    var usersPromise = apiRequest('/users');
    var establishmentsPromise = apiRequest('/establishments');
    var enseignementsPromise = new Promise(function (resolve) {
        $.getJSON('uds-server/enseignements.json', function (data) {
            resolve(data);
        }).fail(function () {
            console.warn("[app.js] Impossible de charger enseignements.json");
            resolve([]);
        });
    });

    Promise.all([usersPromise, establishmentsPromise, enseignementsPromise])
        .then(function (results) {
            var users = results[0] || [];
            var establishments = results[1] || [];
            var enseignements = results[2] || [];

            console.log("[app.js] Dashboard chargé :",
                "Users:", users.length,
                "Establishments:", establishments.length,
                "Enseignements:", enseignements.length
            );

            // ---- 1. Construire les matrices du framework ----
            var matriceUsers = construireMatriceUsers(users);
            var matriceEstablishments = construireMatriceEstablishments(establishments);
            var matriceEnseignements = construireMatriceEnseignements(enseignements);

            // ---- 2. Stocker les matrices globalement ----
            window._matrices = {
                users: matriceUsers,
                establishments: matriceEstablishments,
                enseignements: matriceEnseignements
            };

            // ---- 3. Afficher les matrices ----
            afficherMatrice("users", matriceUsers, getUsersColumns());
            afficherMatrice("establishments", matriceEstablishments, getEstablishmentsColumns());
            afficherMatrice("enseignements", matriceEnseignements, getEnseignementsColumns());

            // ---- 4. Mettre à jour les compteurs ----
            document.querySelectorAll('.matrix-count').forEach(function (el) {
                var matrix = el.dataset.matrix;
                var count = 0;
                if (matrix === "users") count = users.length;
                else if (matrix === "establishments") count = establishments.length;
                else if (matrix === "enseignements") count = enseignements.length;
                el.textContent = count + " lignes";
            });

            var total = users.length + establishments.length + enseignements.length;
            var badge = document.getElementById('dashboard-badge');
            if (badge) badge.textContent = total + " enregistrements";

            // ★ AJOUT : mise à jour des cartes KPI (js/ui-enhancements.js)
            if (typeof window.updateDashboardKPIs === 'function') {
                window.updateDashboardKPIs(users.length, establishments.length, enseignements.length);
            }

            showDashboardMessage("Données chargées avec succès !", "success");
        })
        .catch(function (error) {
            console.error("[app.js] loadDashboard() — erreur :", error);
            showDashboardMessage("Erreur de chargement des données.", "error");
        });
}

// ----------------------------------------------------------
// construireMatriceUsers()
// Rôle : Construit une matrice du framework pour Users
// ----------------------------------------------------------
function construireMatriceUsers(users) {
    var matrice = new tools.Library.Stats.Matrice();

    for (var i = 0; i < users.length; i++) {
        var u = users[i];
        var id = u.id || i;
        matrice.setElement(u.id, "id", id);
        matrice.setElement(u.username, "username", id);
        matrice.setElement(u.fullName, "fullName", id);
        matrice.setElement(u.email, "email", id);
        matrice.setElement(u.role, "role", id);
        matrice.setElement(u.delegationRegion, "delegationRegion", id);
        matrice.setElement(u.department, "department", id);
    }

    console.log("[app.js] Matrice Users construite :", matrice.getLignes().length, "lignes");
    return matrice;
}

// ----------------------------------------------------------
// construireMatriceEstablishments()
// Rôle : Construit une matrice du framework pour Establishments
// ----------------------------------------------------------
function construireMatriceEstablishments(establishments) {
    var matrice = new tools.Library.Stats.Matrice();

    for (var i = 0; i < establishments.length; i++) {
        var e = establishments[i];
        var id = e.id || i;
        matrice.setElement(e.id, "id", id);
        matrice.setElement(e.code, "code", id);
        matrice.setElement(e.name, "name", id);
        matrice.setElement(e.city, "city", id);
        matrice.setElement(e.type, "type", id);
        matrice.setElement(e.delegationRegion, "delegationRegion", id);
        matrice.setElement(e.department, "department", id);
    }

    console.log("[app.js] Matrice Establishments construite :", matrice.getLignes().length, "lignes");
    return matrice;
}

// ----------------------------------------------------------
// construireMatriceEnseignements()
// Rôle : Construit une matrice du framework pour Enseignements
// ----------------------------------------------------------
function construireMatriceEnseignements(enseignements) {
    var matrice = new tools.Library.Stats.Matrice();

    for (var i = 0; i < enseignements.length; i++) {
        var e = enseignements[i];
        var id = e.id || i;
        matrice.setElement(e.id, "id", id);
        matrice.setElement(e.idEnseignant, "idEnseignant", id);
        matrice.setElement(e.idDiscipline, "idDiscipline", id);
        matrice.setElement(e.idClasse, "idClasse", id);
        matrice.setElement(e.regime, "regime", id);
        matrice.setElement(e.nbreHeures, "nbreHeures", id);
        matrice.setElement(e.nbreHeuresTP, "nbreHeuresTP", id);
        matrice.setElement(e.anneeAcad, "anneeAcad", id);
        matrice.setElement(e.portee, "portee", id);
    }

    console.log("[app.js] Matrice Enseignements construite :", matrice.getLignes().length, "lignes");
    return matrice;
}

// ----------------------------------------------------------
// afficherMatrice()
// Rôle : Affiche une matrice du framework dans le tableau HTML
//        Utilise les méthodes de la matrice
// ----------------------------------------------------------
function afficherMatrice(matrixId, matrice, columns, filterText, groupBy) {
    var table = document.getElementById('matrix-' + matrixId);
    if (!table) return;

    var tbody = table.querySelector('tbody');
    if (!tbody) return;

    // Récupérer le filtre
    filterText = filterText || '';
    var filterInput = document.querySelector('.matrix-filter[data-matrix="' + matrixId + '"]');
    if (filterInput) {
        filterText = filterInput.value.toLowerCase();
    }

    // Récupérer le regroupement
    groupBy = groupBy || '';
    var groupSelect = document.querySelector('.matrix-groupby[data-matrix="' + matrixId + '"]');
    if (groupSelect) {
        groupBy = groupSelect.value;
    }

    // Récupérer les lignes
    var lignes = matrice.getLignes();
    var colKeys = columns.map(function (c) { return c.key; });

    // Filtrer les lignes
    var filteredLignes = lignes;
    if (filterText) {
        filteredLignes = lignes.filter(function (ligne) {
            var rowMap = matrice.getElementsLigneMap(ligne);
            for (var key in rowMap) {
                if (rowMap[key] !== null && rowMap[key] !== undefined) {
                    if (String(rowMap[key]).toLowerCase().indexOf(filterText) !== -1) {
                        return true;
                    }
                }
            }
            return false;
        });
    }

    // Regroupement
    var groupedData = null;
    var groupHeaders = null;

    if (groupBy && matrice.colIndexExist(groupBy)) {
        var groups = matrice.groupLignesByColumn(groupBy);
        groupedData = {};
        groupHeaders = [];

        for (var g = 0; g < groups.length; g++) {
            var group = groups[g];
            var key = group.keyValue;
            if (!groupedData[key]) {
                groupedData[key] = [];
                groupHeaders.push(key);
            }
            for (var l = 0; l < filteredLignes.length; l++) {
                var ligne = filteredLignes[l];
                var val = matrice.getElement(groupBy, ligne);
                if (val === key) {
                    groupedData[key].push(ligne);
                }
            }
        }
        groupHeaders.sort();
    }

    // Construire le HTML
    var html = '';
    if (groupedData) {
        groupHeaders.forEach(function (groupKey) {
            var items = groupedData[groupKey] || [];
            html += '<tr class="group-header"><td colspan="' + columns.length + '">📁 ' + groupBy + ' : ' + groupKey + ' (' + items.length + ')</td></tr>';
            items.forEach(function (ligne) {
                html += renderMatrixRow(ligne, matrice, colKeys);
            });
        });
    } else {
        filteredLignes.forEach(function (ligne) {
            html += renderMatrixRow(ligne, matrice, colKeys);
        });
    }

    if (html === '') {
        html = '<tr><td colspan="' + columns.length + '" class="no-data">Aucune donnée disponible</td></tr>';
    }

    tbody.innerHTML = html;
}
function renderMatrixRow(ligne, matrice, colKeys) {
    var html = '<tr>';
    for (var i = 0; i < colKeys.length; i++) {
        var col = colKeys[i];
        var value = matrice.getElement(col, ligne);
        if (value === null || value === undefined) {
            value = '';
        } else if (typeof value === 'object') {
            value = JSON.stringify(value);
        }
        html += '<td>' + escapeHtml(String(value)) + '</td>';
    }
    html += '</tr>';
    return html;
}

// ----------------------------------------------------------
// renderMatrixRowFromData()
// Rôle : Génère une ligne de tableau à partir d'un tableau de données
// ----------------------------------------------------------
function renderMatrixRowFromData(rowData, columns) {
    var html = '<tr>';
    for (var i = 0; i < columns.length; i++) {
        var value = rowData[i];
        if (value === null || value === undefined) {
            value = '';
        } else if (typeof value === 'object') {
            value = JSON.stringify(value);
        }
        html += '<td>' + escapeHtml(String(value)) + '</td>';
    }
    html += '</tr>';
    return html;
}

// ----------------------------------------------------------
// getUsersColumns()
// Rôle : Retourne la configuration des colonnes pour Users
// ----------------------------------------------------------
function getUsersColumns() {
    return [
        { key: 'id', label: 'ID' },
        { key: 'username', label: 'Nom d\'utilisateur' },
        { key: 'fullName', label: 'Nom complet' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Rôle' },
        { key: 'delegationRegion', label: 'Région' },
        { key: 'department', label: 'Département' }
    ];
}

// ----------------------------------------------------------
// getEstablishmentsColumns()
// Rôle : Retourne la configuration des colonnes pour Establishments
// ----------------------------------------------------------
function getEstablishmentsColumns() {
    return [
        { key: 'id', label: 'ID' },
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Nom' },
        { key: 'city', label: 'Ville' },
        { key: 'type', label: 'Type' },
        { key: 'delegationRegion', label: 'Région' },
        { key: 'department', label: 'Département' }
    ];
}

// ----------------------------------------------------------
// getEnseignementsColumns()
// Rôle : Retourne la configuration des colonnes pour Enseignements
// ----------------------------------------------------------
function getEnseignementsColumns() {
    return [
        { key: 'id', label: 'ID' },
        { key: 'idEnseignant', label: 'ID Enseignant' },
        { key: 'idDiscipline', label: 'ID Discipline' },
        { key: 'idClasse', label: 'ID Classe' },
        { key: 'regime', label: 'Régime' },
        { key: 'nbreHeures', label: 'Nb Heures' },
        { key: 'nbreHeuresTP', label: 'Nb Heures TP' },
        { key: 'anneeAcad', label: 'Année' },
        { key: 'portee', label: 'Portée' }
    ];
}

// ----------------------------------------------------------
// showDashboardMessage()
// Rôle : Affiche un message dans le tableau de bord
// ----------------------------------------------------------
function showDashboardMessage(text, type) {
    var messageDiv = document.getElementById('dashboard-message');
    if (!messageDiv) return;

    messageDiv.textContent = text;
    messageDiv.className = 'message ' + (type || 'success');
    messageDiv.style.display = 'block';

    if (type !== 'error') {
        setTimeout(function () {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}

// ----------------------------------------------------------
// exportMatrixToExcel()
// Rôle : Exporte une matrice en fichier Excel via matrice.exportXSL()
// ----------------------------------------------------------
function exportMatrixToExcel(matrixId) {
    var matrice = window._matrices && window._matrices[matrixId];
    if (!matrice) {
        showDashboardMessage('Matrice non disponible pour ' + matrixId, 'error');
        return;
    }

    var lignes = matrice.getLignes();
    if (lignes.length === 0) {
        showDashboardMessage('Aucune donnée à exporter pour ' + matrixId, 'warning');
        return;
    }

    try {
        var sheatName = matrixId.charAt(0).toUpperCase() + matrixId.slice(1);
        // Utiliser la méthode exportXSL() de la matrice
        matrice.exportXSL(sheatName);
        showDashboardMessage('Export terminé : ' + sheatName + '.xlsx', 'success');
    } catch (e) {
        console.error("[app.js] Erreur export :", e);
        showDashboardMessage('Erreur lors de l\'export : ' + e.message, 'error');
    }
}

// ----------------------------------------------------------
// exportAllMatrices()
// Rôle : Exporte toutes les matrices via exportXSL()
// ----------------------------------------------------------
function exportAllMatrices() {
    var matrices = window._matrices || {};
    var count = 0;

    for (var key in matrices) {
        if (matrices.hasOwnProperty(key)) {
            var matrice = matrices[key];
            var lignes = matrice.getLignes();
            if (lignes.length > 0) {
                try {
                    var sheatName = key.charAt(0).toUpperCase() + key.slice(1);
                    matrice.exportXSL(sheatName);
                    count++;
                } catch (e) {
                    console.error("[app.js] Erreur export pour", key, ":", e);
                }
            }
        }
    }

    if (count > 0) {
        showDashboardMessage('Export terminé : ' + count + ' fichier(s) Excel créé(s).', 'success');
    } else {
        showDashboardMessage('Aucune donnée à exporter.', 'warning');
    }
}

// ----------------------------------------------------------
// setupDashboardEvents()
// Rôle : Configure les événements du tableau de bord
// ----------------------------------------------------------
function setupDashboardEvents() {

    var refreshBtn = document.getElementById('refresh-dashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            loadDashboard();
        });
    }

    var exportAllBtn = document.getElementById('export-all-excel');
    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', function () {
            exportAllMatrices();
        });
    }

    document.querySelectorAll('.matrix-filter').forEach(function (input) {
        input.addEventListener('input', function () {
            var matrixId = this.dataset.matrix;
            refreshMatrix(matrixId);
        });
    });

    document.querySelectorAll('.matrix-groupby').forEach(function (select) {
        select.addEventListener('change', function () {
            var matrixId = this.dataset.matrix;
            refreshMatrix(matrixId);
        });
    });

    document.querySelectorAll('.btn-export-matrix').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var matrixId = this.dataset.matrix;
            exportMatrixToExcel(matrixId);
        });
    });

    document.querySelectorAll('.matrix-table thead th').forEach(function (th) {
        th.addEventListener('click', function () {
            var table = this.closest('.matrix-table');
            var matrixId = table.id.replace('matrix-', '');
            sortMatrixTable(matrixId, this.dataset.col);
        });
    });
}

// ----------------------------------------------------------
// registerServiceWorker()
// Rôle : enregistrer sw.js auprès du navigateur.
// ----------------------------------------------------------
function registerServiceWorker() {

    if (!("serviceWorker" in navigator)) {
        console.warn("[app.js] Ce navigateur ne supporte pas les Service Workers.");
        return;
    }

    navigator.serviceWorker.register("/sw.js")
        .then(function (registration) {
            console.log("[app.js] Service Worker enregistré avec succès. Portée :", registration.scope);
        })
        .catch(function (error) {
            console.error("[app.js] Échec de l'enregistrement du Service Worker :", error);
            console.error("[app.js] Vérifie que la page est servie via http://localhost et pas via file://");
        });
}

// ----------------------------------------------------------
// refreshMatrix()
// Rôle : Recharge une matrice avec les filtres actuels
// ----------------------------------------------------------
function refreshMatrix(matrixId) {
    var matrice = window._matrices && window._matrices[matrixId];
    if (!matrice) {
        console.warn("[app.js] refreshMatrix() — matrice non trouvée :", matrixId);
        return;
    }

    var columns = [];
    if (matrixId === 'users') columns = getUsersColumns();
    else if (matrixId === 'establishments') columns = getEstablishmentsColumns();
    else if (matrixId === 'enseignements') columns = getEnseignementsColumns();

    afficherMatrice(matrixId, matrice, columns);
}

// ----------------------------------------------------------
// sortMatrixTable()
// Rôle : Trie un tableau par colonne
// ----------------------------------------------------------
function sortMatrixTable(matrixId, colKey) {
    var table = document.getElementById('matrix-' + matrixId);
    if (!table) return;

    var tbody = table.querySelector('tbody');
    var rows = Array.from(tbody.querySelectorAll('tr:not(.group-header)'));
    if (rows.length === 0) return;

    var th = table.querySelector('thead th[data-col="' + colKey + '"]');
    var isAsc = true;

    if (th.classList.contains('sorted-asc')) {
        isAsc = false;
        th.classList.remove('sorted-asc');
        th.classList.add('sorted-desc');
    } else if (th.classList.contains('sorted-desc')) {
        isAsc = true;
        th.classList.remove('sorted-desc');
        th.classList.add('sorted-asc');
    } else {
        table.querySelectorAll('thead th').forEach(function (h) {
            h.classList.remove('sorted-asc', 'sorted-desc');
        });
        th.classList.add('sorted-asc');
        isAsc = true;
    }

    var sortedRows = rows.sort(function (a, b) {
        var colIndex = Array.from(a.parentElement.querySelectorAll('td')).indexOf(a.querySelector('td'));
        var valA = a.querySelectorAll('td')[colIndex] ? a.querySelectorAll('td')[colIndex].textContent.trim() : '';
        var valB = b.querySelectorAll('td')[colIndex] ? b.querySelectorAll('td')[colIndex].textContent.trim() : '';

        var numA = parseFloat(valA);
        var numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
            return isAsc ? numA - numB : numB - numA;
        }

        return isAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    var groupRows = tbody.querySelectorAll('.group-header');
    if (groupRows.length > 0) {
        tbody.innerHTML = '';
        refreshMatrix(matrixId);
    } else {
        sortedRows.forEach(function (row) {
            tbody.appendChild(row);
        });
    }
}

// ============================================================
// SYNCHRONISATION MATRICE ↔ CACHE 
// ============================================================

// ----------------------------------------------------------
// synchroniserMatrice()
// Rôle : Point d'entrée principal pour la synchronisation
//        de la matrice avec le cache.
// ----------------------------------------------------------
// ----------------------------------------------------------
// synchroniserMatrice()
// Rôle : Point d'entrée principal pour la synchronisation
//        de la matrice avec le cache.
// ★ MODIFICATION : Créer la matrice si elle n'existe pas
// ----------------------------------------------------------
function synchroniserMatrice(table, data, operation, id) {
    console.log("[app.js] synchroniserMatrice() → table:", table, "| operation:", operation, "| id:", id);

    if (!table || !data) {
        console.warn("[app.js] synchroniserMatrice() — données manquantes.");
        return;
    }

    // Déterminer l'ID de la matrice dans window._matrices
    var matrixId = table.toLowerCase();
    if (matrixId === 'datamatrix') matrixId = 'dataMatrix';
    else if (matrixId === 'user') matrixId = 'users';
    else if (matrixId === 'establishment') matrixId = 'establishments';
    else matrixId = matrixId + 's';

    // ★ NOUVEAU : Si la matrice n'existe pas, la créer avec les données
    if (!window._matrices || !window._matrices[matrixId]) {
        console.log("[app.js] synchroniserMatrice() — matrice non trouvée, création pour :", matrixId);

        // Créer une nouvelle matrice
        var nouvelleMatrice = new tools.Library.Stats.Matrice();

        // Remplir avec les données (si disponibles)
        if (data && data.length > 0) {
            var premier = data[0];
            var colonnesData = Object.keys(premier);
            for (var i = 0; i < data.length; i++) {
                var item = data[i];
                var itemId = item.id || i;
                for (var j = 0; j < colonnesData.length; j++) {
                    var col = colonnesData[j];
                    var val = item[col];
                    if (val !== undefined && val !== null) {
                        nouvelleMatrice.setElement(val, col, itemId);
                    }
                }
            }
        }

        // Stocker la matrice
        if (!window._matrices) window._matrices = {};
        window._matrices[matrixId] = nouvelleMatrice;

        console.log("[app.js] synchroniserMatrice() — matrice créée pour :", matrixId, "avec", data ? data.length : 0, "éléments");
    }

    var matrice = window._matrices[matrixId];
    if (!matrice) {
        console.warn("[app.js] synchroniserMatrice() — impossible de créer la matrice pour :", matrixId);
        return;
    }

    // Appliquer la mise à jour selon l'opération
    switch (operation) {
        case "GET":
            remplacerMatrice(matrice, data);
            break;
        case "POST":
            ajouterDansMatrice(matrice, data);
            break;
        case "PUT":
            mettreAJourDansMatrice(matrice, data, id);
            break;
        case "DELETE":
            supprimerDeMatrice(matrice, id);
            break;
        default:
            console.warn("[app.js] synchroniserMatrice() — opération inconnue :", operation);
    }

    // Invalider l'index pour getUnique()
    if (matrice && typeof matrice.invalidateIndex === 'function') {
        matrice.invalidateIndex();
    }
}

// ----------------------------------------------------------
// remplacerMatrice()
// Rôle : Remplace toutes les données de la matrice.
//        Utilisé pour un GET complet.
// ----------------------------------------------------------
// ----------------------------------------------------------
// remplacerMatrice()
// Rôle : Remplace toutes les données de la matrice.
//        Utilisé pour un GET complet.
// ★ VERSION SIMPLIFIÉE - NE NÉCESSITE PAS clear()
// ----------------------------------------------------------
function remplacerMatrice(matrice, data) {
    if (!matrice) {
        console.warn("[app.js] remplacerMatrice() — matrice invalide.");
        return;
    }

    console.log("[app.js] remplacerMatrice() —", data ? data.length : 0, "éléments");

    // 1. Vider la matrice manuellement
    // On réinitialise les attributs internes de la matrice
    matrice.elements = new Map();
    matrice._groupIndexColsNames = [];
    matrice._countGroupIndexColsNamesOccurences = {};
    matrice._buildIndexContent = {};
    matrice.colonnes = [];
    matrice.colonnesTypes = [];
    matrice.colonnesLabels = [];
    matrice.lignes = [];
    matrice.filter = [];
    matrice.groupPolice = [];
    matrice.colsBuildIndexs = [];

    // 2. Ajouter les nouvelles données
    if (data && data.length > 0) {
        var premier = data[0];
        var colonnesData = Object.keys(premier);

        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            var id = item.id || i;
            for (var j = 0; j < colonnesData.length; j++) {
                var col = colonnesData[j];
                var val = item[col];
                if (val !== undefined && val !== null) {
                    matrice.setElement(val, col, id);
                }
            }
        }
    }

    // 3. Invalider l'index pour getUnique()
    if (typeof matrice.invalidateIndex === 'function') {
        matrice.invalidateIndex();
    }

    console.log("[app.js] remplacerMatrice() — matrice mise à jour :", matrice.getLignes().length, "lignes");
}
// ----------------------------------------------------------
// ajouterDansMatrice()
// Rôle : Ajoute une nouvelle entité dans la matrice.
//        Utilisé pour un POST.
// ----------------------------------------------------------
function ajouterDansMatrice(matrice, data) {
    if (!matrice || !data) return;

    console.log("[app.js] ajouterDansMatrice() —", data);

    // Si data est un tableau, ajouter chaque élément
    var items = Array.isArray(data) ? data : [data];

    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var id = item.id || 'new_' + Date.now() + '_' + i;

        var colonnes = Object.keys(item);
        for (var j = 0; j < colonnes.length; j++) {
            var col = colonnes[j];
            var val = item[col];
            if (val !== undefined && val !== null) {
                matrice.setElement(val, col, id);
            }
        }
    }
    if (typeof matrice.invalidateIndex === 'function') {
        matrice.invalidateIndex();
    }
    console.log("[app.js] ajouterDansMatrice() —", items.length, "élément(s) ajouté(s)");
}

// ----------------------------------------------------------
// mettreAJourDansMatrice()
// Rôle : Met à jour une entité existante dans la matrice.
//        Utilisé pour un PUT.
// ----------------------------------------------------------
function mettreAJourDansMatrice(matrice, data, id) {
    if (!matrice || !data) return;

    // Si data est un tableau, prendre le premier élément
    var item = Array.isArray(data) ? data[0] : data;
    var entityId = id || item.id;

    if (!entityId) {
        console.warn("[app.js] mettreAJourDansMatrice() — id manquant.");
        return;
    }

    console.log("[app.js] mettreAJourDansMatrice() — id:", entityId, "| data:", item);

    // Mettre à jour chaque colonne
    var colonnes = Object.keys(item);
    for (var i = 0; i < colonnes.length; i++) {
        var col = colonnes[i];
        var val = item[col];
        if (val !== undefined && val !== null) {
            matrice.setElement(val, col, entityId);
        }
    }
    if (typeof matrice.invalidateIndex === 'function') {
        matrice.invalidateIndex();
    }

    console.log("[app.js] mettreAJourDansMatrice() — entrée mise à jour :", entityId);
}

// ----------------------------------------------------------
// supprimerDeMatrice()
// Rôle : Supprime une entité de la matrice.
//        Utilisé pour un DELETE.
// ----------------------------------------------------------
// ----------------------------------------------------------
// supprimerDeMatrice()
// Rôle : Supprime une entité de la matrice.
//        Utilisé pour un DELETE.
// ----------------------------------------------------------
// ----------------------------------------------------------
// supprimerDeMatrice()
// Rôle : Supprime une entité de la matrice.
//        Utilisé pour un DELETE.
// ★ VERSION SIMPLIFIÉE - UTILISE remplacerMatrice()
// ----------------------------------------------------------
function supprimerDeMatrice(matrice, id) {
    if (!matrice || !id) return;

    console.log("[app.js] supprimerDeMatrice() — id:", id);

    // 1. Récupérer toutes les lignes
    var lignes = matrice.getLignes();
    var colonnes = matrice.getColonnes();

    // 2. Filtrer pour garder toutes les lignes SAUF celle à supprimer
    var nouvellesLignes = [];
    for (var i = 0; i < lignes.length; i++) {
        var ligne = lignes[i];
        if (String(ligne) !== String(id)) {
            nouvellesLignes.push(ligne);
        }
    }

    // 3. Si aucune ligne restante, on remplace par un tableau vide
    if (nouvellesLignes.length === 0) {
        remplacerMatrice(matrice, []);
        return;
    }

    // 4. Reconstruire les données à conserver
    var donnees = [];
    for (var i = 0; i < nouvellesLignes.length; i++) {
        var ligne = nouvellesLignes[i];
        var item = { id: ligne };
        for (var j = 0; j < colonnes.length; j++) {
            var col = colonnes[j];
            var val = matrice.getElement(col, ligne);
            if (val !== undefined && val !== null) {
                item[col] = val;
            }
        }
        donnees.push(item);
    }

    // 5. Remplacer la matrice avec les données conservées
    remplacerMatrice(matrice, donnees);

    console.log("[app.js] supprimerDeMatrice() — id", id, "supprimé,", nouvellesLignes.length, "lignes restantes");
}
// ----------------------------------------------------------
// listenToServiceWorker()
// Rôle : écouter les messages envoyés par sw.js pour
//        rafraîchir l'affichage automatiquement.
// ----------------------------------------------------------
function listenToServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.addEventListener("message", function (event) {
        console.log("[app.js] Message reçu du Service Worker :", event.data);

        if (event.data) {
            switch (event.data.type) {
                case "QUEUED":
                    updateSyncBadge();
                    break;

                case "SYNC_DONE":
                    updateSyncBadge();
                    loadUsers();
                    loadEstablishments();
                    loadMatrices();
                    // Recharger aussi le dashboard si visible
                    if (currentTab === 'dashboard') {
                        loadDashboard();
                    }
                    showMessage("Synchronisation terminée.", "success");
                    break;

                case "CACHE_UPDATED":
                    console.log("[app.js] CACHE_UPDATED reçu :", event.data);

                    // Mettre à jour la matrice correspondante
                    synchroniserMatrice(
                        event.data.table,
                        event.data.data,
                        event.data.operation,
                        event.data.id
                    );

                    // Mettre à jour le badge
                    updateSyncBadge();

                    // ★ AMÉLIORATION : Recharger les listes selon l'opération et la table
                    var table = event.data.table;
                    var operation = event.data.operation;

                    // Si c'est un POST ou PUT, recharger la liste correspondante
                    if (operation === 'POST' || operation === 'PUT') {
                        if (table === 'User') {
                            console.log("[app.js] Rechargement de la liste des utilisateurs après mise à jour.");
                            loadUsers();
                        } else if (table === 'Establishment') {
                            console.log("[app.js] Rechargement de la liste des établissements après mise à jour.");
                            loadEstablishments();
                        } else if (table === 'DataMatrix') {
                            console.log("[app.js] Rechargement de la liste des données en attente après mise à jour.");
                            loadMatrices();
                        }
                    }

                    // Si c'est un DELETE, recharger également (pour retirer l'élément supprimé)
                    if (operation === 'DELETE') {
                        if (table === 'User') {
                            console.log("[app.js] Rechargement de la liste des utilisateurs après suppression.");
                            loadUsers();
                        } else if (table === 'Establishment') {
                            console.log("[app.js] Rechargement de la liste des établissements après suppression.");
                            loadEstablishments();
                        } else if (table === 'DataMatrix') {
                            console.log("[app.js] Rechargement de la liste des données en attente après suppression.");
                            loadMatrices();
                        }
                    }

                    // Si l'onglet dashboard est actif, rafraîchir l'affichage
                    if (currentTab === 'dashboard') {
                        var matrixId = table ? table.toLowerCase() + 's' : null;
                        if (matrixId && window._matrices && window._matrices[matrixId]) {
                            refreshMatrix(matrixId);
                        } else {
                            loadDashboard();
                        }
                    }
                    break;

                default:
                    console.log("[app.js] Message inconnu :", event.data.type);
            }
        }
    });
}

// ----------------------------------------------------------
// setupOnlineFallback()
// Rôle : filet de sécurité pour les navigateurs sans Background Sync.
// ----------------------------------------------------------
function setupOnlineFallback() {
    window.addEventListener("online", function () {
        console.log("[app.js] Évènement 'online' détecté → demande de synchronisation.");
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: "REPLAY_PENDING" });
        }
    });
}

// ============================================================
// ONGLETS
// ============================================================

// ----------------------------------------------------------
// switchTab()
// Rôle : Change d'onglet et charge les données correspondantes.
// ----------------------------------------------------------

function switchTab(tabName) {
    console.log("[app.js] switchTab() →", tabName);

    // Mettre à jour les boutons d'onglets
    document.querySelectorAll('.tab-button').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Mettre à jour les contenus d'onglets
    document.querySelectorAll('.tab-content').forEach(function (content) {
        content.classList.remove('active');
    });

    var targetTab = document.getElementById(tabName + '-tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }

    currentTab = tabName;

    // Charger les données selon l'onglet
    if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'establishments') {
        loadEstablishments();
    } else if (tabName === 'matrices') {
        loadMatrices();
    } else if (tabName === 'dashboard') {
        loadDashboard();
    } else if (tabName === 'prediction') {
        if (typeof window.initPredictionTab === 'function') {
            window.initPredictionTab();
        } else {
            console.warn('[app.js] initPredictionTab non défini');
        }
    }
}

// ----------------------------------------------------------
// DOMContentLoaded
// Point d'entrée principal de l'application
// ----------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {

    console.log("[app.js] DOMContentLoaded — initialisation");

    registerServiceWorker();
    listenToServiceWorker();
    setupOnlineFallback();

    // --- Navigation par onglets ---
    document.querySelectorAll('.tab-button').forEach(function (btn) {
        btn.addEventListener('click', function () {
            switchTab(btn.dataset.tab);
        });
    });

    // ============================================================
    // GESTIONNAIRES DE SOUMISSION DES FORMULAIRES
    // ============================================================

    document.getElementById('create-user-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const editingId = document.getElementById('user-editing-id').value;
        if (pendingEditingLocalId && pendingEditingTable === 'User') {
            updatePendingRecord('User', pendingEditingLocalId);
        } else if (editingId) {
            updateUser(editingId);
        } else {
            createUser();
        }
    });

    document.getElementById('create-establishment-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const editingId = document.getElementById('establishment-editing-id').value;
        if (pendingEditingLocalId && pendingEditingTable === 'Establishment') {
            updatePendingRecord('Establishment', pendingEditingLocalId);
        } else if (editingId) {
            updateEstablishment(editingId);
        } else {
            createEstablishment();
        }
    });

    document.getElementById('create-matrix-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const editingId = document.getElementById('editingId').value;
        const editingLocalId = document.getElementById('editingLocalId').value;
        if (pendingEditingLocalId && pendingEditingTable === 'DataMatrix') {
            updatePendingRecord('DataMatrix', pendingEditingLocalId);
        } else if (editingId || editingLocalId) {
            updateMatrix(editingId, editingLocalId);
        } else {
            createMatrix();
        }
    });

    // ============================================================
    // ÉCOUTEURS POUR LES BOUTONS MODIFIER/SUPPRIMER
    // ============================================================

    document.getElementById('users-list').addEventListener('click', function (e) {
        const target = e.target;

        if (target.classList.contains('btn-user-delete')) {
            e.preventDefault();
            const id = target.getAttribute('data-id');
            deleteUser(id);
        }

        if (target.classList.contains('btn-user-edit')) {
            e.preventDefault();
            const id = target.getAttribute('data-id');

            const item = target.closest('.data-item');
            const username = item.querySelector('strong') ? item.querySelector('strong').textContent : '';
            const fullName = item.textContent.split('-')[1] ? item.textContent.split('-')[1].trim().split('<')[0] : '';
            const email = item.textContent.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
            const roleMatch = item.textContent.match(/ADMIN|DELEGUE|CHEF_ETABLISSEMENT/);

            document.getElementById('username').value = username || '';
            document.getElementById('fullName').value = fullName || '';
            if (email) document.getElementById('email').value = email[0];
            if (roleMatch) document.getElementById('role').value = roleMatch[0];

            document.getElementById('user-editing-id').value = id;
            document.getElementById('user-submit-btn').textContent = '✏️ Mettre à jour';
            showMessage('Mode édition activé — modifiez puis soumettez.', 'success');
        }
    });

    document.getElementById('establishments-list').addEventListener('click', function (e) {
        const target = e.target;

        if (target.classList.contains('btn-establishment-delete')) {
            e.preventDefault();
            const id = target.getAttribute('data-id');
            deleteEstablishment(id);
        }

        if (target.classList.contains('btn-establishment-edit')) {
            e.preventDefault();
            const id = target.getAttribute('data-id');

            const item = target.closest('.data-item');
            const name = item.querySelector('strong') ? item.querySelector('strong').textContent : '';
            const codeMatch = item.textContent.match(/\(([^)]+)\)/);
            const cityMatch = item.textContent.match(/[A-Za-zÀ-ÿ]+ - [A-Z]+/);
            const typeMatch = item.textContent.match(/PUBLIC|PRIVATE|PRIVÉ/);

            document.getElementById('name').value = name || '';
            if (codeMatch) document.getElementById('code').value = codeMatch[1];
            if (cityMatch) {
                const parts = cityMatch[0].split(' - ');
                document.getElementById('city').value = parts[0] || '';
                document.getElementById('region').value = parts[1] || 'CENTRE';
            }
            if (typeMatch) {
                const type = typeMatch[0] === 'PRIVÉ' ? 'PRIVATE' : typeMatch[0];
                document.getElementById('type').value = type || 'PUBLIC';
            }

            document.getElementById('establishment-editing-id').value = id;
            document.getElementById('establishment-submit-btn').textContent = '✏️ Mettre à jour';
            showMessage('Mode édition activé — modifiez puis soumettez.', 'success');
        }
    });

    document.getElementById('matrices-list').addEventListener('click', function (e) {
        const target = e.target;

        if (target.classList.contains('btn-delete')) {
            e.preventDefault();
            const id = target.getAttribute('data-id');
            const localId = target.getAttribute('data-localid');
            deleteMatrix(id, localId);
            return;
        }

        if (target.classList.contains('btn-edit')) {
            e.preventDefault();
            const id = target.getAttribute('data-id');
            const localId = target.getAttribute('data-localid');

            const item = target.closest('.data-item');
            const clientKey = item.querySelector('strong') ? item.querySelector('strong').textContent : '';

            document.getElementById('clientKey').value = clientKey || '';
            document.getElementById('dataValue').value = '{"note": "Édition en cours"}';

            matrixEditingId = (id && id !== 'null') ? parseInt(id) : null;
            matrixEditingLocalId = (localId && localId !== 'null') ? localId : null;
            document.getElementById('editingId').value = matrixEditingId || '';
            document.getElementById('editingLocalId').value = matrixEditingLocalId || '';
            document.getElementById('matrix-submit-btn').textContent = '✏️ Mettre à jour';

            showMessage('Mode édition activé — modifiez les champs puis soumettez.', 'success');
            return;
        }

        if (target.classList.contains('btn-delete-pending')) {
            e.preventDefault();
            const localId = target.getAttribute('data-localid');
            deletePending(localId);
            return;
        }

        if (target.classList.contains('btn-edit-pending')) {
            e.preventDefault();
            const localId = target.getAttribute('data-localid');
            const table = target.getAttribute('data-table');
            console.log("[app.js] Clic sur Modifier PENDING — localId:", localId, "| table:", table);
            editPending(localId, table);
            return;
        }
    });

    // ============================================================
    // CHARGEMENT INITIAL DES DONNÉES
    // ============================================================

    loadUsers();
    loadEstablishments();
    loadMatrices();

    setTimeout(function () {
        console.log("[app.js] Forcer le rechargement des listes après délai");
        loadUsers();
        loadEstablishments();
        loadMatrices();
    }, 500);

    // ============================================================
    // INITIALISATION DU TABLEAU DE BORD
    // ============================================================
    setupDashboardEvents();

    // Charger le tableau de bord en arrière-plan
    setTimeout(loadDashboard, 1000);

    // Vérifier le statut de synchronisation au démarrage
    setTimeout(updateSyncBadge, 1000);

    console.log('[app.js] UI démarrée');
});
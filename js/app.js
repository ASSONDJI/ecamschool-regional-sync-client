
const API_BASE_URL = 'http://localhost:8080';


let currentTab = 'users';


function showMessage(message, type = 'success') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    
    setTimeout(() => {
        messageDiv.className = 'message';
    }, 3000);
}


async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Erreur ${response.status}: ${error}`);
        }
        
        if (method !== 'DELETE') {
            return await response.json();
        }
        return true;
    } catch (error) {
        console.error('API Error:', error);
        showMessage(error.message, 'error');
        throw error;
    }
}


async function createUser() {
    const userData = {
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        fullName: document.getElementById('fullName').value,
        role: document.getElementById('role').value,
        delegationRegion: document.getElementById('delegationRegion').value,
        department: document.getElementById('department').value
    };
    
    try {
        const result = await apiRequest('/users', 'POST', userData);
        showMessage(` Utilisateur "${result.username}" créé avec succès !`);
        document.getElementById('create-user-form').reset();
        loadUsers();
    } catch (error) {
        showMessage(` Erreur: ${error.message}`, 'error');
    }
}

async function loadUsers() {
    try {
        const users = await apiRequest('/users');
        const container = document.getElementById('users-list');
        
        if (!users || users.length === 0) {
            container.innerHTML = '<p class="placeholder">📭 Aucun utilisateur trouvé</p>';
            return;
        }
        
        container.innerHTML = users.map(user => `
            <div class="data-item">
                <strong>${escapeHtml(user.username)}</strong> - ${escapeHtml(user.fullName)}<br>
                 ${escapeHtml(user.email)} |  ${escapeHtml(user.role)} |  ${escapeHtml(user.delegationRegion)}<br>
                <small> ID: ${user.id} |  ${new Date(user.createdAt).toLocaleString()}</small>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('users-list').innerHTML = '<p class="placeholder"> Erreur de chargement</p>';
    }
}


async function createEstablishment() {
    const establishmentData = {
        code: document.getElementById('code').value,
        name: document.getElementById('name').value,
        city: document.getElementById('city').value,
        department: document.getElementById('dept').value,
        delegationRegion: document.getElementById('region').value,
        type: document.getElementById('type').value
    };
    
    try {
        const result = await apiRequest('/establishments', 'POST', establishmentData);
        showMessage(` Établissement "${result.name}" créé avec succès !`);
        document.getElementById('create-establishment-form').reset();
        loadEstablishments();
    } catch (error) {
        showMessage(` Erreur: ${error.message}`, 'error');
    }
}

async function loadEstablishments() {
    try {
        const establishments = await apiRequest('/establishments');
        const container = document.getElementById('establishments-list');
        
        if (!establishments || establishments.length === 0) {
            container.innerHTML = '<p class="placeholder"> Aucun établissement trouvé</p>';
            return;
        }
        
        container.innerHTML = establishments.map(eco => `
            <div class="data-item">
                <strong>${escapeHtml(eco.name)}</strong> (${escapeHtml(eco.code)})<br>
                 ${escapeHtml(eco.city)}, ${escapeHtml(eco.department)} - ${escapeHtml(eco.delegationRegion)}<br>
                 Type: ${escapeHtml(eco.type)} |  ${eco.isActive ? 'Actif' : 'Inactif'}<br>
                <small> ID: ${eco.id} |  ${new Date(eco.createdAt).toLocaleString()}</small>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('establishments-list').innerHTML = '<p class="placeholder"> Erreur de chargement</p>';
    }
}


async function createMatrix() {
    let dataValue;
    try {
        dataValue = JSON.parse(document.getElementById('dataValue').value);
    } catch (e) {
        showMessage(' Le JSON est invalide !', 'error');
        return;
    }
    
    const matrixData = {
        clientKey: document.getElementById('clientKey').value,
        dataValue: dataValue,
        dataType: document.getElementById('dataType').value,
        userId: parseInt(document.getElementById('userId').value),
        establishmentId: parseInt(document.getElementById('establishmentId').value)
    };
    
    try {
        const result = await apiRequest('/data-matrix', 'POST', matrixData);
        showMessage(` Donnée "${result.clientKey}" créée avec succès !`);
        document.getElementById('create-matrix-form').reset();
        loadMatrices();
    } catch (error) {
        showMessage(` Erreur: ${error.message}`, 'error');
    }
}

async function loadMatrices() {
    try {
        const matrices = await apiRequest('/data-matrix');
        const container = document.getElementById('matrices-list');
        
        if (!matrices || matrices.length === 0) {
            container.innerHTML = '<p class="placeholder"> Aucune donnée trouvée</p>';
            return;
        }
        
        
        const pendingMatrices = matrices.filter(m => m.syncStatus === 'PENDING');
        
        if (pendingMatrices.length === 0) {
            container.innerHTML = '<p class="placeholder"> Aucune donnée en attente de synchronisation</p>';
            return;
        }
        
        container.innerHTML = pendingMatrices.map(matrix => `
            <div class="data-item">
                <strong>${escapeHtml(matrix.clientKey)}</strong> - ${escapeHtml(matrix.dataType)}<br>
                 Données: <pre>${escapeHtml(JSON.stringify(matrix.dataValue, null, 2))}</pre><br>
                 Statut: ${escapeHtml(matrix.syncStatus)}<br>
                <small> ID: ${matrix.id} |  Version: ${matrix.version} |  ${new Date(matrix.createdAt).toLocaleString()}</small>
            </div>
        `).join('');
    } catch (error) {
        document.getElementById('matrices-list').innerHTML = '<p class="placeholder"> Erreur de chargement</p>';
    }
}


function switchTab(tabName) {
  
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
   
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    currentTab = tabName;
    
    
    if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'establishments') {
        loadEstablishments();
    } else if (tabName === 'matrices') {
        loadMatrices();
    }
}


function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


document.addEventListener('DOMContentLoaded', () => {
   
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
   
    document.getElementById('create-user-form').addEventListener('submit', (e) => {
        e.preventDefault();
        createUser();
    });
    
    document.getElementById('create-establishment-form').addEventListener('submit', (e) => {
        e.preventDefault();
        createEstablishment();
    });
    
    document.getElementById('create-matrix-form').addEventListener('submit', (e) => {
        e.preventDefault();
        createMatrix();
    });
    
   
    loadUsers();
    loadEstablishments();
    loadMatrices();
    
    console.log(' Client démarré - Données chargées automatiquement');
});
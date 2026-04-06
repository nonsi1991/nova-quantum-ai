// Nova Quantum AI - Admin Panel JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Hardcoded Admin Password (für Beta Phase)
    const ADMIN_PASSWORD = "NovaQuantumAdmin2026!";
    
    // Mock Data for Demo (in production would come from backend API)
    let mockUsers = [
        { id: 1, username: "trader_john", email: "john@example.com", status: "pending", registered: "2026-04-05 14:30", lastLogin: null },
        { id: 2, username: "quant_master", email: "master@quant.com", status: "pending", registered: "2026-04-06 09:15", lastLogin: null },
        { id: 3, username: "nonsi", email: "nonsi@example.com", status: "active", registered: "2026-04-01 10:00", lastLogin: "2026-04-06 08:45" },
        { id: 4, username: "friend1", email: "friend1@example.com", status: "active", registered: "2026-04-03 16:20", lastLogin: "2026-04-05 19:30" },
        { id: 5, username: "friend2", email: "friend2@example.com", status: "active", registered: "2026-04-04 11:45", lastLogin: "2026-04-06 07:15" },
        { id: 6, username: "suspicious_user", email: "spam@fake.com", status: "blocked", registered: "2026-04-06 03:20", lastLogin: null }
    ];

    // Check if user is already logged in
    if (!localStorage.getItem('adminLoggedIn')) {
        showLoginModal();
    } else {
        loadAdminPanel();
    }

    // Login functionality
    document.getElementById('loginBtn')?.addEventListener('click', function() {
        const password = document.getElementById('adminPassword').value;
        if (password === ADMIN_PASSWORD) {
            localStorage.setItem('adminLoggedIn', 'true');
            document.getElementById('loginError').classList.add('d-none');
            bootstrap.Modal.getInstance(document.getElementById('adminLoginModal')).hide();
            loadAdminPanel();
        } else {
            document.getElementById('loginError').classList.remove('d-none');
        }
    });

    // Logout functionality
    document.getElementById('logoutBtn')?.addEventListener('click', function() {
        localStorage.removeItem('adminLoggedIn');
        showLoginModal();
    });

    function showLoginModal() {
        const modal = new bootstrap.Modal(document.getElementById('adminLoginModal'));
        modal.show();
    }

    function loadAdminPanel() {
        updateStatistics();
        renderPendingUsers();
        renderExistingUsers();
    }

    function updateStatistics() {
        const total = mockUsers.length;
        const pending = mockUsers.filter(u => u.status === 'pending').length;
        const active = mockUsers.filter(u => u.status === 'active').length;
        const blocked = mockUsers.filter(u => u.status === 'blocked').length;

        document.getElementById('totalUsers').textContent = total;
        document.getElementById('pendingUsers').textContent = pending;
        document.getElementById('activeUsers').textContent = active;
        document.getElementById('blockedUsers').textContent = blocked;
        document.getElementById('pendingCount').textContent = `${pending} pending`;
        document.getElementById('existingCount').textContent = `${total - pending} users`;
    }

    function renderPendingUsers() {
        const pendingUsers = mockUsers.filter(u => u.status === 'pending');
        const tableBody = document.getElementById('pendingUsersTable');
        const noPending = document.getElementById('noPendingUsers');

        if (pendingUsers.length === 0) {
            tableBody.innerHTML = '';
            noPending.style.display = 'block';
            return;
        }

        noPending.style.display = 'none';
        tableBody.innerHTML = pendingUsers.map(user => `
            <tr class="user-card">
                <td>${user.id}</td>
                <td><strong>${user.username}</strong></td>
                <td>${user.email}</td>
                <td>${user.registered}</td>
                <td>
                    <button class="btn btn-sm btn-approve me-2" onclick="approveUser(${user.id})">
                        <i class="fas fa-check me-1"></i>Approve
                    </button>
                    <button class="btn btn-sm btn-reject" onclick="rejectUser(${user.id})">
                        <i class="fas fa-times me-1"></i>Reject
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function renderExistingUsers() {
        const existingUsers = mockUsers.filter(u => u.status !== 'pending');
        const tableBody = document.getElementById('existingUsersTable');
        const noExisting = document.getElementById('noExistingUsers');

        if (existingUsers.length === 0) {
            tableBody.innerHTML = '';
            noExisting.style.display = 'block';
            return;
        }

        noExisting.style.display = 'none';
        tableBody.innerHTML = existingUsers.map(user => `
            <tr class="user-card">
                <td>${user.id}</td>
                <td><strong>${user.username}</strong></td>
                <td>${user.email}</td>
                <td>
                    <span class="badge ${getStatusBadge(user.status)}">
                        ${user.status.toUpperCase()}
                    </span>
                </td>
                <td>${user.lastLogin || 'Never'}</td>
                <td>
                    ${user.status === 'blocked' ? 
                        `<button class="btn btn-sm btn-success me-2" onclick="unblockUser(${user.id})">
                            <i class="fas fa-unlock me-1"></i>Unblock
                        </button>` : 
                        `<button class="btn btn-sm btn-warning me-2" onclick="blockUser(${user.id})">
                            <i class="fas fa-ban me-1"></i>Block
                        </button>`
                    }
                    <button class="btn btn-sm btn-delete" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash me-1"></i>Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function getStatusBadge(status) {
        switch(status) {
            case 'active': return 'bg-success';
            case 'blocked': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    // Global functions for button actions
    window.approveUser = function(userId) {
        if (confirm(`Approve user ${userId}? This will allow them to access the trading platform.`)) {
            const user = mockUsers.find(u => u.id === userId);
            if (user) {
                user.status = 'active';
                user.lastLogin = new Date().toLocaleString();
                showNotification(`User ${user.username} approved successfully!`, 'success');
                loadAdminPanel();
            }
        }
    };

    window.rejectUser = function(userId) {
        if (confirm(`Reject user ${userId}? This will delete their registration.`)) {
            mockUsers = mockUsers.filter(u => u.id !== userId);
            showNotification(`User rejected and removed from system.`, 'warning');
            loadAdminPanel();
        }
    };

    window.deleteUser = function(userId) {
        if (confirm(`Permanently delete user ${userId}? This cannot be undone.`)) {
            mockUsers = mockUsers.filter(u => u.id !== userId);
            showNotification(`User deleted permanently.`, 'danger');
            loadAdminPanel();
        }
    };

    window.blockUser = function(userId) {
        if (confirm(`Block user ${userId}? They will lose access to the platform.`)) {
            const user = mockUsers.find(u => u.id === userId);
            if (user) {
                user.status = 'blocked';
                showNotification(`User ${user.username} blocked.`, 'warning');
                loadAdminPanel();
            }
        }
    };

    window.unblockUser = function(userId) {
        const user = mockUsers.find(u => u.id === userId);
        if (user) {
            user.status = 'active';
            showNotification(`User ${user.username} unblocked.`, 'success');
            loadAdminPanel();
        }
    };

    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Auto-refresh every 30 seconds to check for new pending users
    setInterval(() => {
        if (localStorage.getItem('adminLoggedIn')) {
            // In production, this would make an API call to check for new users
            console.log('Admin panel auto-refresh check');
        }
    }, 30000);
});
EOF && echo "✅ Admin JavaScript erstellt"
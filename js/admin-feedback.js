/**
 * Nova Quantum AI Platform – Admin Feedback Management
 * Handles dashboard population, filtering, and CRUD operations for feedback items.
 */

import api from './api.js';

let state = {
    page: 1,
    pageSize: 20,
    totalPages: 1,
    items: [],
    filters: {
        type: '',
        status: '',
        priority: '',
        search: ''
    }
};

// ---------------------------------------------------------------------------
// DOM Selectors
// ---------------------------------------------------------------------------

const tableBody = document.getElementById('feedback-table-body');
const typeFilter = document.getElementById('filter-type');
const statusFilter = document.getElementById('filter-status');
const priorityFilter = document.getElementById('filter-priority');
const searchInput = document.getElementById('filter-search');
const statsSection = document.getElementById('stats-cards');
const tableCount = document.getElementById('table-count');

// ---------------------------------------------------------------------------
// Load & Render
// ---------------------------------------------------------------------------

async function fetchData() {
    try {
        const query = new URLSearchParams({
            page: state.page,
            page_size: state.pageSize,
            ...(state.filters.type && { type: state.filters.type }),
            ...(state.filters.status && { status: state.filters.status }),
            ...(state.filters.priority && { priority: state.filters.priority }),
            ...(state.filters.search && { search: state.filters.search }),
        });

        // Fetch Stats
        const stats = await api.get('/feedback/stats');
        renderStats(stats);

        // Fetch Items
        const data = await api.get(`/feedback?${query.toString()}`);
        state.items = data.items;
        state.totalPages = data.pages;
        renderTable();
        updatePagination(data.page, data.pages, data.total);
    } catch (err) {
        console.error('Failed to load feedback:', err);
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-red-400 p-8">Failed to load feedback.</td></tr>`;
    }
}

function renderStats(stats) {
    statsSection.innerHTML = `
        <div class="bg-card rounded-xl p-5 border border-slate-700">
            <p class="text-slate-400 text-xs uppercase tracking-wider mb-1">Total</p>
            <p class="text-3xl font-bold">${stats.total}</p>
        </div>
        <div class="bg-card rounded-xl p-5 border border-slate-700">
            <p class="text-slate-400 text-xs uppercase tracking-wider mb-1">Open Issues</p>
            <p class="text-3xl font-bold text-orange-400">${stats.by_status.open || 0}</p>
        </div>
        <div class="bg-card rounded-xl p-5 border border-slate-700">
            <p class="text-slate-400 text-xs uppercase tracking-wider mb-1">Critical Open</p>
            <p class="text-3xl font-bold text-red-500">${stats.open_critical}</p>
        </div>
        <div class="bg-card rounded-xl p-5 border border-slate-700">
            <p class="text-slate-400 text-xs uppercase tracking-wider mb-1">Resolved (7d)</p>
            <p class="text-3xl font-bold text-emerald-400">${stats.resolved_last_7d}</p>
        </div>
    `;
}

function renderTable() {
    if (state.items.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-slate-500">No feedback found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = state.items.map(item => `
        <tr class="hover:bg-slate-800 transition-colors">
            <td class="py-3 px-4 text-slate-500">#${item.id}</td>
            <td class="py-3 px-4 capitalize">${item.type}</td>
            <td class="py-3 px-4 font-medium">${item.title}</td>
            <td class="py-3 px-4 text-slate-400">${item.username || 'Anonymous'}</td>
            <td class="py-3 px-4">
                <span class="px-2 py-1 rounded text-xs status-${item.status.toLowerCase()} border border-slate-700">${item.status}</span>
            </td>
            <td class="py-3 px-4 uppercase text-xs font-semibold priority-${item.priority}">${item.priority}</td>
            <td class="py-3 px-4 text-slate-500">${new Date(item.created_at).toLocaleDateString()}</td>
            <td class="py-3 px-4">
                <button onclick="openEditModal(${item.id})" class="text-blue-400 hover:text-blue-300">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function updatePagination(page, pages, total) {
    document.getElementById('current-page').textContent = page;
    document.getElementById('total-pages').textContent = pages;
    document.getElementById('total-items').textContent = total;
    tableCount.textContent = `Showing ${state.items.length} of ${total} items`;
    document.getElementById('prev-page').disabled = page <= 1;
    document.getElementById('next-page').disabled = page >= pages;
}

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

function setupInteractions() {
    // Filters
    [typeFilter, statusFilter, priorityFilter].forEach(el => {
        el.addEventListener('change', (e) => {
            state.filters[e.target.id.replace('filter-', '')] = e.target.value;
            state.page = 1;
            fetchData();
        });
    });

    searchInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        fetchData();
    });

    document.getElementById('filter-clear').addEventListener('click', () => {
        state.filters = {type: '', status: '', priority: '', search: ''};
        [typeFilter, statusFilter, priorityFilter, searchInput].forEach(el => el.value = '');
        fetchData();
    });

    // Pagination
    document.getElementById('prev-page').addEventListener('click', () => { if (state.page > 1) { state.page--; fetchData(); } });
    document.getElementById('next-page').addEventListener('click', () => { if (state.page < state.totalPages) { state.page++; fetchData(); } });
    
    // Refresh
    document.getElementById('refresh-btn').addEventListener('click', fetchData);

    // Edit Modal events
    window.openEditModal = (id) => {
        const item = state.items.find(i => i.id === id);
        if (!item) return;
        document.getElementById('edit-id').value = item.id;
        document.getElementById('edit-status').value = item.status;
        document.getElementById('edit-priority').value = item.priority;
        document.getElementById('edit-notes').value = item.admin_notes || '';
        document.getElementById('edit-modal').classList.remove('hidden');
    };

    document.getElementById('edit-cancel').addEventListener('click', () => document.getElementById('edit-modal').classList.add('hidden'));
    document.getElementById('edit-close').addEventListener('click', () => document.getElementById('edit-modal').classList.add('hidden'));

    document.getElementById('edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const data = {
            status: document.getElementById('edit-status').value,
            priority: document.getElementById('edit-priority').value,
            admin_notes: document.getElementById('edit-notes').value
        };

        try {
            await api.put(`/feedback/${id}`, data);
            document.getElementById('edit-modal').classList.add('hidden');
            fetchData();
        } catch (err) {
            const errEl = document.getElementById('edit-error');
            errEl.textContent = err.message;
            errEl.classList.remove('hidden');
        }
    });

    // CSV Export
    document.getElementById('export-btn').addEventListener('click', () => {
        let csv = "ID,Type,Title,User,Status,Priority,Created\n";
        state.items.forEach(i => {
            csv += `${i.id},${i.type},"${i.title}","${i.username || 'Anonymous'}","${i.status}","${i.priority}",${i.created_at}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `feedback_export_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
    });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Security: Only allow admins
    const userStr = localStorage.getItem('user');
    if (!userStr) { window.location.href = '/login.html'; return; }
    const user = JSON.parse(userStr);
    if (!user.is_admin) { window.location.href = '/dashboard.html'; return; }

    setupInteractions();
    fetchData();
});

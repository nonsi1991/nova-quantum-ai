/**
 * Nova Quantum AI Platform – Feedback Module
 *
 * Provides:
 *   - A floating "Feedback" button (bottom-right)
 *   - A modal form for submitting bug reports / feature requests / etc.
 *   - API integration with /api/v1/feedback
 *
 * Usage: import './feedback.js' in any page JS.
 * The module auto-initialises when the DOM is ready.
 */

import api from './api.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FEEDBACK_TYPES = [
    { value: 'bug',         label: '🐛 Bug Report',       color: 'text-red-400'    },
    { value: 'feature',     label: '✨ Feature Request',  color: 'text-blue-400'   },
    { value: 'improvement', label: '⚡ Improvement',       color: 'text-yellow-400' },
    { value: 'question',    label: '❓ Question',           color: 'text-green-400'  },
];

const PRIORITY_LEVELS = [
    { value: 'low',      label: 'Low',      dot: 'bg-slate-400'  },
    { value: 'medium',   label: 'Medium',   dot: 'bg-blue-400'   },
    { value: 'high',     label: 'High',     dot: 'bg-orange-400' },
    { value: 'critical', label: 'Critical', dot: 'bg-red-500'    },
];

// ---------------------------------------------------------------------------
// HTML Templates
// ---------------------------------------------------------------------------

function buildButtonHTML() {
    return `
<button
    id="feedback-fab"
    title="Send Feedback"
    class="fixed bottom-6 right-6 z-50 flex items-center gap-2
           bg-blue-600 hover:bg-blue-500 active:scale-95
           text-white text-sm font-semibold
           px-4 py-3 rounded-full shadow-xl
           transition-all duration-200"
    aria-label="Open feedback form"
>
    <i class="fas fa-comment-dots text-base"></i>
    <span class="hidden sm:inline">Feedback</span>
</button>`;
}

function buildTypeOptions() {
    return FEEDBACK_TYPES.map(t => `
        <label class="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-700 transition-colors">
            <input type="radio" name="fb-type" value="${t.value}" class="accent-blue-500"
                   ${t.value === 'bug' ? 'checked' : ''}>
            <span class="${t.color} font-medium">${t.label}</span>
        </label>`).join('');
}

function buildPriorityOptions() {
    return PRIORITY_LEVELS.map(p => `
        <option value="${p.value}">${p.label}</option>`).join('');
}

function buildModalHTML() {
    return `
<div id="feedback-overlay"
     class="fixed inset-0 z-50 flex items-center justify-center
            bg-black/70 backdrop-blur-sm p-4"
     style="display:none">
    <div id="feedback-modal"
         class="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl
                w-full max-w-lg max-h-[90vh] overflow-y-auto"
         role="dialog" aria-modal="true" aria-labelledby="fb-modal-title">

        <!-- Header -->
        <div class="flex items-center justify-between p-6 border-b border-slate-700">
            <h2 id="fb-modal-title" class="text-xl font-bold text-white">
                <i class="fas fa-comment-dots text-blue-400 mr-2"></i>Send Feedback
            </h2>
            <button id="feedback-close"
                    class="text-slate-400 hover:text-white transition-colors p-1 rounded"
                    aria-label="Close feedback form">
                <i class="fas fa-times text-lg"></i>
            </button>
        </div>

        <!-- Form -->
        <form id="feedback-form" class="p-6 space-y-5" novalidate>

            <!-- Type selector -->
            <fieldset>
                <legend class="text-sm font-medium text-slate-300 mb-2">Type *</legend>
                <div class="grid grid-cols-2 gap-1">
                    ${buildTypeOptions()}
                </div>
            </fieldset>

            <!-- Title -->
            <div>
                <label for="fb-title" class="block text-sm font-medium text-slate-300 mb-1">
                    Title <span class="text-red-400">*</span>
                </label>
                <input
                    id="fb-title"
                    type="text"
                    maxlength="256"
                    placeholder="Brief description of the issue or request…"
                    class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2
                           text-white placeholder-slate-500 focus:outline-none
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-all text-sm"
                    required
                />
                <p class="mt-1 text-xs text-slate-500"><span id="fb-title-count">0</span>/256</p>
            </div>

            <!-- Description -->
            <div>
                <label for="fb-description" class="block text-sm font-medium text-slate-300 mb-1">
                    Description <span class="text-red-400">*</span>
                </label>
                <textarea
                    id="fb-description"
                    rows="4"
                    maxlength="5000"
                    placeholder="Describe in detail. For bugs: steps to reproduce, expected vs. actual behaviour…"
                    class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2
                           text-white placeholder-slate-500 focus:outline-none
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-all text-sm resize-y"
                    required
                ></textarea>
                <p class="mt-1 text-xs text-slate-500"><span id="fb-desc-count">0</span>/5000</p>
            </div>

            <!-- Priority -->
            <div>
                <label for="fb-priority" class="block text-sm font-medium text-slate-300 mb-1">
                    Priority
                </label>
                <select
                    id="fb-priority"
                    class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2
                           text-white focus:outline-none focus:ring-2 focus:ring-blue-500
                           focus:border-transparent transition-all text-sm"
                >
                    ${buildPriorityOptions()}
                </select>
            </div>

            <!-- Screenshot URL -->
            <div>
                <label for="fb-screenshot" class="block text-sm font-medium text-slate-300 mb-1">
                    Screenshot URL <span class="text-slate-500">(optional)</span>
                </label>
                <input
                    id="fb-screenshot"
                    type="url"
                    maxlength="512"
                    placeholder="https://…"
                    class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2
                           text-white placeholder-slate-500 focus:outline-none
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           transition-all text-sm"
                />
            </div>

            <!-- Error banner -->
            <div id="fb-error"
                 class="hidden bg-red-900/50 border border-red-700 text-red-300
                        rounded-lg px-4 py-3 text-sm">
            </div>

            <!-- Submit -->
            <div class="flex gap-3 pt-2">
                <button
                    type="submit"
                    id="fb-submit"
                    class="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50
                           disabled:cursor-not-allowed text-white font-semibold py-2.5
                           rounded-lg transition-all duration-200"
                >
                    <i class="fas fa-paper-plane mr-2"></i>Submit Feedback
                </button>
                <button
                    type="button"
                    id="fb-cancel"
                    class="px-5 bg-slate-700 hover:bg-slate-600 text-slate-300
                           font-semibold py-2.5 rounded-lg transition-all"
                >
                    Cancel
                </button>
            </div>
        </form>

        <!-- Success state (hidden by default) -->
        <div id="fb-success"
             class="hidden p-8 text-center space-y-4">
            <div class="text-5xl">🎉</div>
            <h3 class="text-xl font-bold text-white">Thank you!</h3>
            <p class="text-slate-400">Your feedback has been submitted. We'll review it shortly.</p>
            <button
                id="fb-success-close"
                class="mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold
                       px-6 py-2.5 rounded-lg transition-all"
            >
                Close
            </button>
        </div>
    </div>
</div>`;
}

// ---------------------------------------------------------------------------
// FeedbackWidget class
// ---------------------------------------------------------------------------

class FeedbackWidget {
    constructor() {
        this._isOpen = false;
        this._submitting = false;
        this._inject();
        this._bindEvents();
    }

    // -----------------------------------------------------------------------
    // DOM injection
    // -----------------------------------------------------------------------

    _inject() {
        // FAB button
        const btnWrap = document.createElement('div');
        btnWrap.innerHTML = buildButtonHTML();
        document.body.appendChild(btnWrap.firstElementChild);

        // Modal overlay
        const modalWrap = document.createElement('div');
        modalWrap.innerHTML = buildModalHTML();
        document.body.appendChild(modalWrap.firstElementChild);
    }

    // -----------------------------------------------------------------------
    // Event binding
    // -----------------------------------------------------------------------

    _bindEvents() {
        // Open
        document.getElementById('feedback-fab')?.addEventListener('click', () => this.open());

        // Close
        document.getElementById('feedback-close')?.addEventListener('click', () => this.close());
        document.getElementById('fb-cancel')?.addEventListener('click', () => this.close());
        document.getElementById('fb-success-close')?.addEventListener('click', () => this.close());

        // Close on overlay click
        document.getElementById('feedback-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'feedback-overlay') this.close();
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._isOpen) this.close();
        });

        // Character counters
        const titleInput = document.getElementById('fb-title');
        const descInput  = document.getElementById('fb-description');

        titleInput?.addEventListener('input', () => {
            document.getElementById('fb-title-count').textContent = titleInput.value.length;
        });

        descInput?.addEventListener('input', () => {
            document.getElementById('fb-desc-count').textContent = descInput.value.length;
        });

        // Form submit
        document.getElementById('feedback-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this._handleSubmit();
        });
    }

    // -----------------------------------------------------------------------
    // Open / Close
    // -----------------------------------------------------------------------

    open() {
        this._isOpen = true;
        const overlay = document.getElementById('feedback-overlay');
        if (overlay) overlay.style.display = 'flex';
        this._resetForm();
        // Focus title after animation
        setTimeout(() => document.getElementById('fb-title')?.focus(), 50);
    }

    close() {
        this._isOpen = false;
        const overlay = document.getElementById('feedback-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    // -----------------------------------------------------------------------
    // Form helpers
    // -----------------------------------------------------------------------

    _resetForm() {
        document.getElementById('feedback-form').style.display = '';
        document.getElementById('fb-success').classList.add('hidden');
        document.getElementById('fb-error').classList.add('hidden');
        document.getElementById('feedback-form').reset();
        document.getElementById('fb-title-count').textContent = '0';
        document.getElementById('fb-desc-count').textContent  = '0';
        this._setSubmitting(false);
    }

    _setSubmitting(state) {
        this._submitting = state;
        const btn = document.getElementById('fb-submit');
        if (!btn) return;
        btn.disabled = state;
        btn.innerHTML = state
            ? '<i class="fas fa-spinner fa-spin mr-2"></i>Submitting…'
            : '<i class="fas fa-paper-plane mr-2"></i>Submit Feedback';
    }

    _showError(msg) {
        const el = document.getElementById('fb-error');
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden');
    }

    _showSuccess() {
        document.getElementById('feedback-form').style.display = 'none';
        document.getElementById('fb-success').classList.remove('hidden');
    }

    // -----------------------------------------------------------------------
    // Submit
    // -----------------------------------------------------------------------

    async _handleSubmit() {
        if (this._submitting) return;

        const typeEl = document.querySelector('input[name="fb-type"]:checked');
        const title  = document.getElementById('fb-title').value.trim();
        const desc   = document.getElementById('fb-description').value.trim();
        const prio   = document.getElementById('fb-priority').value;
        const screenshot = document.getElementById('fb-screenshot').value.trim() || null;

        // Client-side validation
        if (!typeEl) { this._showError('Please select a feedback type.'); return; }
        if (title.length < 5) { this._showError('Title must be at least 5 characters.'); return; }
        if (desc.length < 10) { this._showError('Description must be at least 10 characters.'); return; }

        document.getElementById('fb-error').classList.add('hidden');
        this._setSubmitting(true);

        try {
            await api.post('/feedback', {
                type: typeEl.value,
                title,
                description: desc,
                priority: prio,
                screenshot_url: screenshot,
            });
            this._showSuccess();
        } catch (err) {
            this._showError(err.message || 'Failed to submit feedback. Please try again.');
        } finally {
            this._setSubmitting(false);
        }
    }
}

// ---------------------------------------------------------------------------
// Auto-init when DOM is ready
// ---------------------------------------------------------------------------

function initFeedback() {
    // Only inject if user is authenticated
    const token = localStorage.getItem('jwt_token');
    if (!token) return;

    window._feedbackWidget = new FeedbackWidget();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeedback);
} else {
    initFeedback();
}

export { FeedbackWidget };
export default initFeedback;

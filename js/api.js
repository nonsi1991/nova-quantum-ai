/**
 * Nova Quantum AI Platform - API Client
 * REST API client for backend communication
 */

class ApiClient {
    constructor(baseURL = 'http://localhost:8000/api/v1') {
        this.baseURL = baseURL;
        this.timeout = 10000; // 10 seconds
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
    }

    /**
     * Get authentication headers with JWT token
     */
    getAuthHeaders() {
        const token = localStorage.getItem('jwt_token');
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
    }

    /**
     * Make a request with retry logic
     */
    async request(method, endpoint, data = null, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const headers = this.getAuthHeaders();
        
        // Merge custom headers
        if (options.headers) {
            Object.assign(headers, options.headers);
        }

        const config = {
            method,
            headers,
            signal: AbortSignal.timeout(this.timeout)
        };

        if (data) {
            config.body = JSON.stringify(data);
        }

        let lastError;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const response = await fetch(url, config);
                
                // Handle HTTP errors
                if (!response.ok) {
                    // Handle authentication errors
                    if (response.status === 401) {
                        this.handleUnauthorized();
                        throw new Error('Authentication required');
                    }
                    
                    // Handle other HTTP errors
                    const errorText = await response.text();
                    let errorData;
                    try {
                        errorData = JSON.parse(errorText);
                    } catch {
                        errorData = { message: errorText || 'Unknown error' };
                    }
                    
                    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
                }
                
                // Parse successful response
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return await response.json();
                } else {
                    return await response.text();
                }
                
            } catch (error) {
                lastError = error;
                
                // Don't retry on authentication errors
                if (error.message === 'Authentication required') {
                    break;
                }
                
                // Don't retry on timeout or abort
                if (error.name === 'TimeoutError' || error.name === 'AbortError') {
                    break;
                }
                
                // Wait before retry (exponential backoff)
                if (attempt < this.retryAttempts) {
                    const delay = this.retryDelay * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError || new Error('Request failed after all retry attempts');
    }

    /**
     * Handle 401 Unauthorized - clear token and redirect to login
     */
    handleUnauthorized() {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user');
        
        // Dispatch event for components to handle
        document.dispatchEvent(new CustomEvent('auth:unauthorized'));
        
        // Redirect to login page
        if (window.location.pathname !== '/login.html') {
            window.location.href = '/login.html';
        }
    }

    /**
     * Check if token is expired
     */
    isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000; // Convert to milliseconds
            return Date.now() >= exp;
        } catch {
            return true;
        }
    }

    /**
     * Refresh JWT token
     */
    async refreshToken() {
        const token = localStorage.getItem('jwt_token');
        if (!token || this.isTokenExpired(token)) {
            this.handleUnauthorized();
            return null;
        }

        try {
            // Try to refresh token (assuming backend has refresh endpoint)
            const response = await fetch(`${this.baseURL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('jwt_token', data.token);
                return data.token;
            } else {
                this.handleUnauthorized();
                return null;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.handleUnauthorized();
            return null;
        }
    }

    // HTTP method shortcuts
    async get(endpoint, options = {}) {
        return this.request('GET', endpoint, null, options);
    }

    async post(endpoint, data, options = {}) {
        return this.request('POST', endpoint, data, options);
    }

    async put(endpoint, data, options = {}) {
        return this.request('PUT', endpoint, data, options);
    }

    async patch(endpoint, data, options = {}) {
        return this.request('PATCH', endpoint, data, options);
    }

    async delete(endpoint, options = {}) {
        return this.request('DELETE', endpoint, null, options);
    }
}

// Export singleton instance
const api = new ApiClient();
export default api;
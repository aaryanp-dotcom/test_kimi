/**
 * MindSpace - Supabase Client and Core Utilities
 * Single source of truth for Supabase configuration
 */

// Supabase configuration - REPLACE THESE WITH YOUR ACTUAL VALUES
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client
let supabaseClient;

try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    });
    console.log('Supabase client initialized successfully');
} catch (error) {
    console.error('Failed to initialize Supabase client:', error);
}

// =====================================================
// AUTHENTICATION HELPERS
// =====================================================

/**
 * Get current authenticated user - ALWAYS use this, never localStorage
 * @returns {Promise<Object|null>} Current user or null
 */
async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (error) {
            console.error('Error getting current user:', error);
            return null;
        }
        return user;
    } catch (error) {
        console.error('Exception getting current user:', error);
        return null;
    }
}

/**
 * Get current session
 * @returns {Promise<Object|null>} Current session or null
 */
async function getCurrentSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error) {
            console.error('Error getting session:', error);
            return null;
        }
        return session;
    } catch (error) {
        console.error('Exception getting session:', error);
        return null;
    }
}

/**
 * Get user profile with role
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Profile object or null
 */
async function getUserProfile(userId) {
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Exception fetching user profile:', error);
        return null;
    }
}

/**
 * Check if user has specific role
 * @param {string} userId - User ID
 * @param {string} role - Role to check ('user', 'therapist', 'admin')
 * @returns {Promise<boolean>}
 */
async function hasRole(userId, role) {
    const profile = await getUserProfile(userId);
    return profile && profile.role === role;
}

/**
 * Redirect based on user role
 * @param {string} role - User role
 */
function redirectByRole(role) {
    const currentPage = window.location.pathname.split('/').pop();
    let targetPage;
    
    switch (role) {
        case 'admin':
            targetPage = 'admin-dashboard.html';
            break;
        case 'therapist':
            targetPage = 'therapist-dashboard.html';
            break;
        case 'user':
        default:
            targetPage = 'user-dashboard.html';
            break;
    }
    
    if (currentPage !== targetPage) {
        window.location.href = targetPage;
    }
}

/**
 * Guard dashboard access - must be called on every dashboard page
 * @param {string} expectedRole - Expected role for this dashboard
 */
async function guardDashboard(expectedRole) {
    try {
        // Always get user from auth, never trust localStorage
        const user = await getCurrentUser();
        
        if (!user) {
            console.log('No authenticated user, redirecting to login');
            window.location.href = 'login.html';
            return null;
        }
        
        // Fetch profile to verify role
        const profile = await getUserProfile(user.id);
        
        if (!profile) {
            console.error('Profile not found for user');
            await supabaseClient.auth.signOut();
            window.location.href = 'login.html';
            return null;
        }
        
        // Verify role matches expected
        if (profile.role !== expectedRole) {
            console.log(`Role mismatch: expected ${expectedRole}, got ${profile.role}`);
            redirectByRole(profile.role);
            return null;
        }
        
        // For therapists, check approval status
        if (profile.role === 'therapist') {
            const { data: therapist } = await supabaseClient
                .from('Therapists')
                .select('approval_status')
                .eq('id', user.id)
                .single();
            
            if (therapist && therapist.approval_status !== 'approved') {
                // Therapist not approved yet - show pending message but allow access
                console.log('Therapist pending approval');
            }
        }
        
        return { user, profile };
    } catch (error) {
        console.error('Error in guardDashboard:', error);
        window.location.href = 'login.html';
        return null;
    }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Format date for display
 * @param {string} dateString - Date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format time for display
 * @param {string} timeString - Time string
 * @returns {string} Formatted time
 */
function formatTime(timeString) {
    if (!timeString) return 'N/A';
    // Handle both "HH:MM" and "HH:MM:SS" formats
    const parts = timeString.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
}

/**
 * Format currency
 * @param {number} amount - Amount in cents or dollars
 * @param {boolean} inCents - Whether amount is in cents
 * @returns {string} Formatted currency
 */
function formatCurrency(amount, inCents = false) {
    if (amount === null || amount === undefined) return '$0.00';
    const dollars = inCents ? amount / 100 : amount;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(dollars);
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate URL format (must be https)
 * @param {string} url - URL to validate
 * @returns {boolean}
 */
function isValidHttpsUrl(url) {
    if (!url) return false;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Validate date is not in the past
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @returns {boolean}
 */
function isFutureDate(dateString) {
    if (!dateString) return false;
    const inputDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate >= today;
}

/**
 * Calculate age from date of birth
 * @param {string} dobString - Date of birth string
 * @returns {number} Age in years
 */
function calculateAge(dobString) {
    if (!dobString) return null;
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
}

/**
 * Validate therapist age (must be >= 18)
 * @param {string} dobString - Date of birth string
 * @returns {boolean}
 */
function isValidTherapistAge(dobString) {
    const age = calculateAge(dobString);
    return age !== null && age >= 18;
}

/**
 * Show error message to user
 * @param {string} message - Error message
 * @param {HTMLElement} container - Container to show error in
 */
function showError(message, container = null) {
    const errorHtml = `<div class="error-message">${message}</div>`;
    if (container) {
        container.innerHTML = errorHtml;
    } else {
        // Look for common error containers
        const errorContainer = document.getElementById('error-container') || 
                               document.querySelector('.error-container');
        if (errorContainer) {
            errorContainer.innerHTML = errorHtml;
        } else {
            alert(message);
        }
    }
}

/**
 * Show success message to user
 * @param {string} message - Success message
 * @param {HTMLElement} container - Container to show message in
 */
function showSuccess(message, container = null) {
    const successHtml = `<div class="success-message">${message}</div>`;
    if (container) {
        container.innerHTML = successHtml;
    } else {
        const successContainer = document.getElementById('success-container') || 
                                  document.querySelector('.success-container');
        if (successContainer) {
            successContainer.innerHTML = successHtml;
        } else {
            alert(message);
        }
    }
}

/**
 * Clear messages
 * @param {HTMLElement} container - Container to clear
 */
function clearMessages(container = null) {
    if (container) {
        container.innerHTML = '';
    } else {
        const errorContainer = document.getElementById('error-container') || 
                               document.querySelector('.error-container');
        const successContainer = document.getElementById('success-container') || 
                                  document.querySelector('.success-container');
        if (errorContainer) errorContainer.innerHTML = '';
        if (successContainer) successContainer.innerHTML = '';
    }
}

/**
 * Debounce function for search inputs
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function}
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// =====================================================
// EXPORT FOR MODULES (if using ES modules)
// =====================================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        supabaseClient,
        getCurrentUser,
        getCurrentSession,
        getUserProfile,
        hasRole,
        guardDashboard,
        redirectByRole,
        formatDate,
        formatTime,
        formatCurrency,
        isValidEmail,
        isValidHttpsUrl,
        isFutureDate,
        calculateAge,
        isValidTherapistAge,
        showError,
        showSuccess,
        clearMessages,
        debounce
    };
}

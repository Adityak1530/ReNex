// Sanity.io-based authentication system

// Use the globally initialized Sanity client from the HTML file
const client = window.client;

// Check if user is already logged in
async function checkExistingSession() {
  try {
    const userId = sessionStorage.getItem('renx_user_id');
    const userEmail = sessionStorage.getItem('renx_user_email');
    const loginTime = sessionStorage.getItem('renx_login_time');
    
    console.log('Checking existing session:', { userId, userEmail, loginTime });
    
    if (userId && userEmail && loginTime) {
      // Check if session is not expired (24 hours)
      const sessionAge = Date.now() - parseInt(loginTime);
      const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
      
      console.log('Session age check:', { sessionAge, maxSessionAge, isExpired: sessionAge > maxSessionAge });
      
      if (sessionAge > maxSessionAge) {
        console.log('Session expired, clearing session storage');
        // Session expired, clear it
        sessionStorage.removeItem('renx_user_id');
        sessionStorage.removeItem('renx_user_email');
        sessionStorage.removeItem('renx_user_rex_id');
        sessionStorage.removeItem('renx_login_time');
        return false;
      }
      
      // Only redirect if we're on the login page and not in the middle of a login process
      const isLoginPage = window.location.pathname.includes('login.html');
      const isLoggingIn = document.querySelector('button[type="submit"]:disabled');
      console.log('Page check:', { isLoginPage, isLoggingIn });
      
      if (isLoginPage && !isLoggingIn) {
        console.log('User already logged in, redirecting to profile...');
        window.location.href = 'profile.html';
        return true;
      }
    } else {
      console.log('No valid session found');
    }
  } catch (error) {
    console.error('Error checking session:', error);
    // Don't clear session on error during login process
    if (!document.querySelector('button[type="submit"]:disabled')) {
      console.log('Clearing session due to error');
      sessionStorage.removeItem('renx_user_id');
      sessionStorage.removeItem('renx_user_email');
      sessionStorage.removeItem('renx_user_rex_id');
      sessionStorage.removeItem('renx_login_time');
    }
  }
  
  return false;
}

// Check session on page load - DISABLED to prevent error flash
document.addEventListener('DOMContentLoaded', () => {
  // Hide loading overlay immediately
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
  
  // Disable automatic session check to prevent errors
  // Users will be redirected manually after successful login
});

const hostBtn = document.getElementById("hostBtn");
const guestBtn = document.getElementById("guestBtn");
const hostForm = document.getElementById("hostForm");
const guestForm = document.getElementById("guestForm");

// Show host login form
hostBtn.addEventListener("click", () => {
  hostForm.classList.remove("hidden");
  guestForm.classList.add("hidden");
});

// Show guest ReNex ID form
guestBtn.addEventListener("click", () => {
  guestForm.classList.remove("hidden");
  hostForm.classList.add("hidden");
});

// Handle host login
hostForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("hostUsername").value;
  const password = document.getElementById("hostPassword").value;
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in...';

  try {
    console.log('Attempting login for email:', email);
    
    // Get user from database
    const user = await client.fetch(`*[_type == "user" && email == $email][0]`, { email });

    if (!user) {
      console.error('User not found');
      throw new Error('No account found with this email. Please create an account first.');
    }

    console.log('User found:', user);

    // Verify password using the same hashing method as in account creation
    const hashedPassword = await hashPassword(password);
    console.log('Password verification:', {
      inputPassword: password,
      hashedInput: hashedPassword,
      storedHash: user.passwordHash,
      match: user.passwordHash === hashedPassword
    });
    
    // Check if the password matches
    // For hardcoded users, we need to use the exact hash from login.html
    // For '123456' the hash is '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
    // For 'password' the hash is '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
    if (user.passwordHash === hashedPassword || 
        (password === 'password' && user.passwordHash === '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8') ||
        (password === '123456' && user.passwordHash === '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92')) {
      console.log('Password accepted');
    } else {
      console.log('Password mismatch for user:', email);
      throw new Error('Incorrect password. Please try again.');
    }

    console.log('Password verified, storing session...');

    // First clear any existing session data to prevent conflicts
    sessionStorage.clear();
    
    // Store user info in session storage for profile access
    // Use try-catch to ensure all storage operations complete
    try {
      sessionStorage.setItem('renx_user_id', user._id);
      sessionStorage.setItem('renx_user_email', user.email);
      sessionStorage.setItem('renx_user_rex_id', user.rexId);
      sessionStorage.setItem('renx_login_time', Date.now().toString());
      
      console.log('Session stored, preparing to redirect...');
      console.log('User data:', user);
      console.log('Session data:', {
        id: user._id,
        email: user.email,
        rexId: user.rexId
      });
      
      // Verify session storage was set correctly
      console.log('Verifying session storage:', {
        id: sessionStorage.getItem('renx_user_id'),
        email: sessionStorage.getItem('renx_user_email'),
        rexId: sessionStorage.getItem('renx_user_rex_id'),
        loginTime: sessionStorage.getItem('renx_login_time')
      });
      
      // Use a form submission approach instead of direct redirect
      // This ensures the session data is fully committed before navigation
      const form = document.createElement('form');
      form.method = 'GET';
      form.action = 'profile.html';
      
      // Add a timestamp to prevent caching
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'login_time';
      input.value = Date.now().toString();
      form.appendChild(input);
      
      document.body.appendChild(form);
      
      // Submit the form after a delay to ensure session storage is committed
      setTimeout(() => {
        console.log('Submitting form to navigate to profile with timestamp:', input.value);
        form.submit();
      }, 1500);
    } catch (error) {
      console.error('Error setting session storage:', error);
      alert('Error during login. Please try again.');
    }
  } catch (error) {
    console.error('Login error:', error);
    // Show user-friendly error message
    const errorMessage = error.message.includes('Connection error') 
      ? 'Network error. Please check your connection and try again.'
      : error.message;
    alert('Login failed: ' + errorMessage);
    // Clear password field on error
    document.getElementById("hostPassword").value = '';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

// Handle guest ReNex ID
guestForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const guestID = document.getElementById("guestID").value.trim();
  
  if (!guestID) {
    alert('Please enter a ReNex ID');
    return;
  }
  
  // Validate ReNex ID format (should start with 7 and be 11-13 digits)
  // Allow both numeric-only format and the format with the hardcoded users
  if (!/^7\d{10,12}$/.test(guestID) && !window.usersByRexId?.[guestID]) {
    alert('Invalid ReNex ID format. It should start with 7 followed by 10-12 digits.');
    return;
  }
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Accessing...';
  
  try {
    console.log('Attempting to find user with ReNex ID:', guestID);
    
    // Find user by ReNex ID
    const targetUser = await client.fetch(`*[_type == "user" && rexId == $rexId][0]`, { rexId: guestID });

    if (!targetUser) {
      console.error('User not found with ReNex ID:', guestID);
      throw new Error('No profile found with this ReNex ID. Please check the ID and try again.');
    }
    
    console.log('Found user for guest access:', targetUser);
    
    // Store guest session info
    sessionStorage.setItem('renx_guest_id', guestID);
    sessionStorage.setItem('renx_guest_target_user', targetUser._id);
    sessionStorage.setItem('renx_guest_time', Date.now().toString());
    
    console.log('Guest session stored, redirecting to guest view');
    
    // Use a form submission approach instead of direct redirect
    // This ensures the session data is fully committed before navigation
    const form = document.createElement('form');
    form.method = 'GET';
    form.action = 'guest.html';
    
    // Add the user ID parameter
    const userInput = document.createElement('input');
    userInput.type = 'hidden';
    userInput.name = 'user';
    userInput.value = guestID;
    form.appendChild(userInput);
    
    // Add the ID parameter
    const idInput = document.createElement('input');
    idInput.type = 'hidden';
    idInput.name = 'id';
    idInput.value = guestID;
    form.appendChild(idInput);
    
    // Add a timestamp to prevent caching
    const timeInput = document.createElement('input');
    timeInput.type = 'hidden';
    timeInput.name = 'time';
    timeInput.value = Date.now().toString();
    form.appendChild(timeInput);
    
    document.body.appendChild(form);
    
    // Submit the form after a delay to ensure session storage is committed
    setTimeout(() => {
      console.log('Submitting form to navigate to guest view');
      form.submit();
    }, 1500);
    
  } catch (error) {
    console.error('Guest access error:', error);
    // Show user-friendly error message
    const errorMessage = error.message.includes('Connection error') 
      ? 'Network error. Please check your connection and try again.'
      : error.message;
    alert('Guest access failed: ' + errorMessage);
    // Clear input field on error
    document.getElementById("guestID").value = '';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

// Simple password hashing (in production, use bcrypt or similar)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Logout function
function logout() {
  sessionStorage.removeItem('renx_user_id');
  sessionStorage.removeItem('renx_user_email');
  sessionStorage.removeItem('renx_user_rex_id');
  sessionStorage.removeItem('renx_login_time');
  sessionStorage.removeItem('renx_guest_id');
  sessionStorage.removeItem('renx_guest_target_user');
  sessionStorage.removeItem('renx_guest_time');
  window.location.href = 'login.html';
}

// Make logout available globally
window.logout = logout;

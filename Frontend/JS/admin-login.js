const adminUser = JSON.parse(localStorage.getItem('adminUser') || 'null');
if (!adminUser || adminUser.role !== 'admin') {
    window.location.href = 'admin-login.html';
}

document.getElementById('adminLoginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;
    const loginMessage = document.getElementById('loginMessage');
    const loginButton = document.getElementById('loginButton');
    const buttonText = document.getElementById('buttonText');
    
    // Show loading state
    loginButton.disabled = true;
    buttonText.innerHTML = '<div class="loading-spinner"></div>';
    loginMessage.style.display = 'none';
    
    try {
        const response = await fetch('http://localhost:3000/users/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.user && data.user.role === 'admin') {
            // Show success message
            loginMessage.textContent = 'Login successful! Redirecting...';
            loginMessage.className = 'alert alert-success';
            loginMessage.style.display = 'block';
            
            // Store admin data
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminUser', JSON.stringify(data.user));
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1500);
        } else {
            throw new Error(data.message || 'Access denied: Admin privileges required');
        }
    } catch (error) {
        loginMessage.textContent = error.message || 'Login failed. Please try again.';
        loginMessage.className = 'alert alert-danger';
        loginMessage.style.display = 'block';
    } finally {
        // Reset button state
        loginButton.disabled = false;
        buttonText.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
});

// Add input focus effects
document.querySelectorAll('.form-control').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'translateY(-2px)';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'translateY(0)';
    });
});
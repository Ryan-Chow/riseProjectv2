// TO DO FIX





$(document).ready(function() {
    // Function to update the login button based on authentication status
    function updateLoginButton(isAuthenticated, username) {
        const loginButton = $('.navbar__button');

        if (isAuthenticated) {
            // User is logged in
            loginButton.text(username);
            loginButton.attr('href', '/profile');
        } else {
            // User is not logged in
            loginButton.text('Log In');
            loginButton.attr('href', '/login');
        }
    }

    // Check authentication status on page load
    $.ajax({
        url: '/mission',  // Adjust the endpoint based on your server logic
        method: 'GET',
        dataType: 'json',
        success: function(response) {
            // Update login button based on the server response
            updateLoginButton(response.isAuthenticated, response.username);
        },
        error: function(error) {
            console.error('Error checking authentication status:', error);
        }
    });
});
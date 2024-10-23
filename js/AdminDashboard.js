document.getElementById('settings').addEventListener('click', function() {
    alert('Settings clicked');
});

document.getElementById('logout').addEventListener('click', function() {
    alert('Logout clicked');
});


document.querySelector('.hamburger-menu').addEventListener('click', function() {
    document.querySelector('.mobile-menu').classList.toggle('show');
});
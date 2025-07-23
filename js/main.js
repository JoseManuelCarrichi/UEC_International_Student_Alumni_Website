// UEC International Student Alumni Network
// main.js
// Future javascript code will go here. 

document.addEventListener('DOMContentLoaded', () => {

    const hamburger = document.getElementById('hamburger-menu');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }

}); 
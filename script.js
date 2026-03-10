// Smooth scrolling for navigation links
function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// Copy server IP to clipboard
function copyServerIP() {
    const serverIP = 'play.gtconnected.com:25565';
    navigator.clipboard.writeText(serverIP).then(() => {
        const notification = document.getElementById('copyNotification');
        notification.classList.remove('hidden');
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }).catch(err => {
        console.error('Failed to copy server IP:', err);
    });
}

// Mobile menu toggle
document.getElementById('mobileMenuBtn').addEventListener('click', function() {
    // This would toggle a mobile menu - implement as needed
    console.log('Mobile menu clicked');
});

// Simulate real-time server status updates
function updateServerStatus() {
    const playerCountElement = document.getElementById('playerCount');
    const serverStatusElement = document.getElementById('serverStatus');
    
    // Simulate player count changes
    const currentPlayers = parseInt(playerCountElement.textContent.split('/')[0]);
    const maxPlayers = 100;
    const newPlayerCount = Math.max(0, Math.min(maxPlayers, currentPlayers + Math.floor(Math.random() * 5) - 2));
    
    playerCountElement.textContent = `${newPlayerCount}/${maxPlayers}`;
    
    // Randomly toggle server status for demonstration
    if (Math.random() > 0.95) {
        const isOnline = serverStatusElement.textContent === 'Online';
        serverStatusElement.textContent = isOnline ? 'Maintenance' : 'Online';
        serverStatusElement.className = isOnline ? 'text-yellow-400' : 'text-green-400';
        
        // Reset back to online after 3 seconds
        if (!isOnline) {
            setTimeout(() => {
                serverStatusElement.textContent = 'Online';
                serverStatusElement.className = 'text-green-400';
            }, 3000);
        }
    }
}

// Update server status every 5 seconds
setInterval(updateServerStatus, 5000);

// Add smooth scroll behavior to all navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        scrollToSection(targetId);
    });
});

// Add loading animation
window.addEventListener('load', function() {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s';
        document.body.style.opacity = '1';
    }, 100);
});

// Simulate player data updates
function updatePlayerData() {
    const playerTable = document.getElementById('playerTable');
    const rows = playerTable.getElementsByTagName('tr');
    
    // Randomly update scores for demonstration
    for (let i = 0; i < rows.length; i++) {
        const scoreCell = rows[i].getElementsByTagName('td')[3];
        if (scoreCell) {
            const currentScore = parseInt(scoreCell.textContent.replace(/,/g, ''));
            const newScore = currentScore + Math.floor(Math.random() * 100);
            scoreCell.textContent = newScore.toLocaleString();
        }
    }
}

// Update player data every 10 seconds
setInterval(updatePlayerData, 10000);

// Add parallax effect to hero section
window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    const heroSection = document.getElementById('home');
    if (heroSection) {
        heroSection.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

// Add hover effects to interactive elements
document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
        });
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
});

// Game constanten
const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const PLAYER_SPEED = 5;
const ENEMY_SPEED = 2.4; // Verlaagd met 20% (was 3)
const IMMUNITY_DURATION = 2000; // 2 seconden in milliseconds
const MIN_OBSTACLE_HEIGHT = 40; // 2 blokjes hoog
const MAX_OBSTACLE_HEIGHT = 80; // 4 blokjes hoog
const ENEMY_SPAWN_RATE = 0.005; // Nog 30% minder (was 0.007)
const OBSTACLE_SPAWN_RATE = 0.0035; // Nog 30% minder (was 0.005)
const ENEMY_SIZE = 80; // 4 blokjes groot (4 * 20 pixels)
const SMALL_ENEMY_SIZE = 20; // 1 blokje groot
const MIN_SPAWN_DISTANCE = 100; // Minimale afstand tussen vijanden en obstakels

// Game state
let gameStarted = false;
let gamePaused = false;
let isImmune = false;
let immunityTimer = null;

// Speler object
const player = {
    x: 100,
    y: 300,
    width: 30,
    height: 50,
    velocityY: 0,
    isJumping: false,
    direction: 1, // 1 voor rechts, -1 voor links
    sprite: null
};

// Vijanden array
let enemies = [];
// Opstakels array
let obstacles = [];
let lives = 3;
let score = 0;
let gameOver = false;
// Obstakel sprite
let obstacleSprite = null;

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Laad sprites
function loadImages() {
    // Laad speler afbeelding
    player.sprite = new Image();
    player.sprite.onerror = function() {
        console.error('Kon player.png niet laden');
        player.sprite = null;
    };
    player.sprite.src = 'assets/player.png';
    
    // Laad obstakel afbeelding
    obstacleSprite = new Image();
    obstacleSprite.onerror = function() {
        console.error('Kon obstacle.png niet laden');
        obstacleSprite = null;
    };
    obstacleSprite.src = 'assets/obstacle.png';
    
    console.log('Afbeeldingen geladen');
}

// Start achtergrondmuziek
function startBackgroundMusic() {
    try {
        const music = new Audio('assets/backround.mp3');
        music.loop = true;
        music.volume = 0.5;
        music.play().catch(error => {
            console.error('Kon muziek niet afspelen:', error);
        });
        console.log('Muziek gestart');
    } catch (error) {
        console.error('Kon muziek niet laden:', error);
    }
}

// Controleer of een nieuwe vijand kan spawnen zonder overlap
function canSpawnEnemy(y, size) {
    // Controleer overlap met andere vijanden
    for (let enemy of enemies) {
        // Controleer horizontale afstand
        if (Math.abs(canvas.width - enemy.x) < MIN_SPAWN_DISTANCE) {
            // Controleer verticale overlap
            if (y < enemy.y + enemy.height && y + size > enemy.y) {
                return false;
            }
        }
    }
    
    // Controleer overlap met obstakels
    for (let obstacle of obstacles) {
        // Controleer horizontale afstand
        if (Math.abs(canvas.width - obstacle.x) < MIN_SPAWN_DISTANCE) {
            // Controleer verticale overlap
            if (y < obstacle.y + obstacle.height && y + size > obstacle.y) {
                return false;
            }
        }
    }
    
    return true;
}

// Spawn vijanden
function spawnEnemy() {
    const type = Math.random() < 0.5 ? 'bird' : 'pig';
    let y;
    
    // Bepaal of het een kleine vijand is (20% kans)
    const isSmall = Math.random() < 0.2;
    const size = isSmall ? SMALL_ENEMY_SIZE : ENEMY_SIZE;
    
    // Bepaal y-positie
    if (type === 'pig') {
        y = canvas.height - size;
    } else {
        // Probeer verschillende y-posities tot er een werkt
        let attempts = 0;
        do {
            y = Math.random() * (canvas.height/2) + 50;
            attempts++;
            // Stop na 10 pogingen om oneindige lus te voorkomen
            if (attempts > 10) return;
        } while (!canSpawnEnemy(y, size));
    }
    
    // Controleer of de vijand kan spawnen op deze positie
    if (!canSpawnEnemy(y, size)) return;
    
    const enemy = {
        x: canvas.width,
        y: y,
        width: size,
        height: size,
        type: type,
        isSmall: isSmall,
        sprite: null
    };
    
    // Varkens op de grond, vogels hoger
    if (type === 'pig') {
        // Laad varken afbeelding
        enemy.sprite = new Image();
        enemy.sprite.onerror = function() {
            console.error('Kon pig.png niet laden');
            enemy.sprite = null;
        };
        enemy.sprite.src = 'assets/pig.png';
    } else {
        // Laad vogel afbeelding
        enemy.sprite = new Image();
        enemy.sprite.onerror = function() {
            console.error('Kon bird.png niet laden');
            enemy.sprite = null;
        };
        enemy.sprite.src = 'assets/bird.png';
    }
    
    enemies.push(enemy);
}

// Spawn opstakels
function spawnObstacle() {
    // Willekeurige hoogte tussen 2 en 4 blokjes
    const height = Math.floor(Math.random() * 3) * 20 + MIN_OBSTACLE_HEIGHT;
    const y = canvas.height - height;
    
    // Controleer of het obstakel kan spawnen zonder overlap
    if (!canSpawnEnemy(y, 30)) return;
    
    obstacles.push({
        x: canvas.width,
        y: y,
        width: 30,
        height: height
    });
}

// Controleer botsingen
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Start immuniteit
function startImmunity() {
    isImmune = true;
    if (immunityTimer) clearTimeout(immunityTimer);
    immunityTimer = setTimeout(() => {
        isImmune = false;
    }, IMMUNITY_DURATION);
}

// Teken startscherm
function drawStartScreen() {
    // Teken achtergrond
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Teken titel in middeleeuwse stijl
    ctx.fillStyle = 'black';
    ctx.font = '40px "MedievalSharp", cursive';
    ctx.textAlign = 'center';
    ctx.fillText('Welkom bij de parade', canvas.width/2, canvas.height/2 - 50);
    
    // Teken instructies
    ctx.font = '20px "Press Start 2P"';
    ctx.fillText('Druk op SPATIE om te beginnen', canvas.width/2, canvas.height/2 + 50);
}

// Game loop
function gameLoop() {
    // Maak achtergrond wit
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (!gameStarted) {
        drawStartScreen();
        requestAnimationFrame(gameLoop);
        return;
    }
    
    if (gamePaused) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    // Update speler
    if (keys.ArrowLeft) {
        player.x -= PLAYER_SPEED;
        player.direction = -1;
    }
    if (keys.ArrowRight) {
        player.x += PLAYER_SPEED;
        player.direction = 1;
    }
    if (keys.ArrowUp && !player.isJumping) {
        player.velocityY = JUMP_FORCE;
        player.isJumping = true;
    }
    
    // Pas zwaartekracht toe
    player.velocityY += GRAVITY;
    player.y += player.velocityY;
    
    // Grond collision
    if (player.y > canvas.height - player.height) {
        player.y = canvas.height - player.height;
        player.velocityY = 0;
        player.isJumping = false;
    }
    
    // Update vijanden en opstakels
    // Update vijanden
    enemies.forEach(enemy => {
        enemy.x -= ENEMY_SPEED;
    });
    
    // Update opstakels
    obstacles.forEach(obstacle => {
        obstacle.x -= ENEMY_SPEED;
    });
    
    // Verwijder vijanden en opstakels die uit beeld zijn
    enemies = enemies.filter(enemy => enemy.x > -enemy.width);
    obstacles = obstacles.filter(obstacle => obstacle.x > -obstacle.width);
    
    // Spawn nieuwe vijanden en opstakels
    if (Math.random() < ENEMY_SPAWN_RATE) {
        spawnEnemy();
    }
    if (Math.random() < OBSTACLE_SPAWN_RATE) {
        spawnObstacle();
    }
    
    // Check collisions met opstakels
    obstacles.forEach(obstacle => {
        if (checkCollision(player, obstacle)) {
            // Duw speler terug
            if (player.x < obstacle.x) {
                player.x = obstacle.x - player.width;
            } else {
                player.x = obstacle.x + obstacle.width;
            }
        }
    });
    
    // Check collisions met vijanden
    if (!isImmune) {
        enemies.forEach(enemy => {
            if (checkCollision(player, enemy)) {
                // Verlies een leven
                lives--;
                document.getElementById('lives').textContent = 'Levens: ' + '❤️'.repeat(lives);
                
                // Start immuniteit
                startImmunity();
                
                // Check game over
                if (lives <= 0) {
                    gameOver = true;
                    alert('Game Over! Je score: ' + score);
                    location.reload();
                }
            }
        });
    }
    
    // Teken opstakels
    if (obstacleSprite && obstacleSprite.complete && obstacleSprite.naturalWidth > 0) {
        obstacles.forEach(obstacle => {
            ctx.drawImage(obstacleSprite, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        });
    } else {
        ctx.fillStyle = '#8B4513'; // Bruin voor opstakels
        obstacles.forEach(obstacle => {
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        });
    }
    
    // Teken speler
    if (player.sprite && player.sprite.complete && player.sprite.naturalWidth > 0) {
        ctx.save();
        if (isImmune) {
            ctx.globalAlpha = 0.5;
        }
        ctx.drawImage(player.sprite, player.x, player.y, player.width, player.height);
        ctx.restore();
    } else {
        ctx.fillStyle = isImmune ? 'rgba(255, 192, 203, 0.5)' : 'pink';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
    
    // Teken vijanden
    enemies.forEach(enemy => {
        if (enemy.sprite && enemy.sprite.complete && enemy.sprite.naturalWidth > 0) {
            ctx.drawImage(enemy.sprite, enemy.x, enemy.y, enemy.width, enemy.height);
        } else {
            ctx.fillStyle = enemy.type === 'bird' ? 'yellow' : 'orange';
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
    });
    
    // Teken score (zwart in plaats van wit voor betere zichtbaarheid op witte achtergrond)
    ctx.fillStyle = 'black';
    ctx.font = '20px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 30);
    
    // Verhoog score
    score += 0.1;
    
    requestAnimationFrame(gameLoop);
}

// Toetsenbord controls
const keys = {};
window.addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === ' ' && !gameStarted) {
        gameStarted = true;
        startBackgroundMusic();
    }
});
window.addEventListener('keyup', e => {
    keys[e.key] = false;
});

// Start het spel
loadImages();
gameLoop(); 
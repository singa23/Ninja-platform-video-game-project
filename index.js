const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 1200;
canvas.height = 1200;

const background = new Image();
const ground = new Image();
const ninjaImage = new Image();
const ninjaImage2 = new Image();
const platformImage = new Image();
const birdImage = new Image();
const birdImage2 = new Image();
const enemyImage = new Image();
const enemyImage2 = new Image();
const coinImage = new Image();
const coinImage2 = new Image();
const coinImage3 = new Image();
const coinImage4 = new Image();
const coinImage5 = new Image();
const coinImage6 = new Image();
const minautorImage = new Image();
const minautorImage2 = new Image();
const minautorImage3 = new Image();
const missileImage = new Image();
const missileImage2 = new Image();

background.src = "images/ninja-background.png";
ground.src = "images/ground.png";
ninjaImage.src = "images/ninjaplayer.png";
ninjaImage2.src = "images/ninjaplayer2.png"
platformImage.src = "images/platform.png";
birdImage.src = "images/bird.png";
birdImage2.src = "images/bird2.png"
enemyImage.src = "images/enemy.png";
enemyImage2.src = "images/enemy2.png";
coinImage.src = "images/coin.png";
coinImage2.src = "images/coin2.png";
coinImage3.src = "images/coin3.png";
coinImage4.src = "images/coin4.png";
coinImage5.src = "images/coin5.png";
coinImage6.src = "images/coin6.png";
minautorImage.src = "images/minautor.png";
minautorImage2.src = "images/minautor2.png";
minautorImage3.src = "images/minautor3.png";
missileImage.src = "images/missile.png";
missileImage2.src = "images/missile2.png";

const groundheight = 47;
let gravity = 0.4;
let score = 0;

const ninja = {
  x: 230,
  y: canvas.height - groundheight ,
  image: ninjaImage,
  width: 70,
  height: 100,
  vx: 0,
  vy: 0,
  // draw: function () {
  //   // 
  // },
  // isCollidingWithCoin: function (coin) {
  //   // 
  // }
};

const ninjaImages = [ninjaImage, ninjaImage2];
let ninjaImageIndex = 0;
let animationCounter = 0;

function drawNinja() {
  if (animationCounter % 10 === 0) { //  cela controle la vitesse danimation
    ninjaImageIndex = (ninjaImageIndex + 1) % ninjaImages.length;
  }

  ctx.drawImage(
    ninjaImages[ninjaImageIndex],
    ninja.x,
    ninja.y,
    ninja.width,
    ninja.height
  );
}

const enemy = {
  x:900,
  y: canvas.height - groundheight - 100,
  image: enemyImage,
  width:70,
  height: 100,
  vx:0,
  vy:0,
  // draw:,
 };

const enemyImages = [enemyImage, enemyImage2];
let enemyImageIndex = 0;

function drawEnemy() {
  enemy.vx = -5; // Vitesse de déplacement horizontale de l'ennemi
  enemy.x += enemy.vx;

  if (animationCounter % 10 === 0) {
    enemyImageIndex = (enemyImageIndex + 1) % enemyImages.length;
  }

  if (enemy.x + enemy.width < 0) {
    // L'ennemi est hors du canvas (à gauche), le réinitialiser à droite
    enemy.x = canvas.width;
  }

  ctx.drawImage(
    enemyImages[enemyImageIndex],
    enemy.x,
    enemy.y,
    enemy.width,
    enemy.height
  );
}

const birdObj = {
  x: canvas.width, // Commence à partir du coin supérieur droit
  y: 0,
  image: birdImage,
  width: 100,
  height: 100,
  vx: -3, // Se déplace vers la gauche
  vy: 2, // Se déplace vers le bas
};

const birdImages = [birdImage, birdImage2];
let birdImageIndex = 0;

function drawBird() {
  birdObj.x += birdObj.vx;
  birdObj.y += birdObj.vy;

  if (birdObj.x + birdObj.width < 0 || birdObj.y + birdObj.height > canvas.height - groundheight) {
    birdObj.x = canvas.width;
    birdObj.y = Math.random() * (canvas.height / 2);
  }

  if (animationCounter % 10 === 0) {
    birdImageIndex = (birdImageIndex + 1) % birdImages.length;
  }

  ctx.drawImage(birdImages[birdImageIndex], birdObj.x, birdObj.y, birdObj.width, birdObj.height);
}

class Platform {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  draw() {
    ctx.drawImage(platformImage, this.x, this.y, this.width, this.height);
  }
}
const platforms = [
  new Platform(250, 1000, 200, 40),
  new Platform(550, 900, 200, 40),
  new Platform(850, 800, 200, 40),
];

function getClosestPlatform(ninja, platforms) { // fonction pour trouver quelle plateforme est la plus proche
  let closestPlatforms = platforms.slice(); // on fait une copie du tableau platforms

  closestPlatforms = closestPlatforms.filter( //pour conserver et filtrer les plateformes sous le ninja en position x
    (platform) =>
      ninja.x + ninja.width > platform.x &&
      ninja.x < platform.x + platform.width
  );

  closestPlatforms = closestPlatforms.filter( //pour conserver et filtrer les plateformes sous le ninja en position y
    (platform) => ninja.y <= platform.y + platform.height
  );

  closestPlatforms.sort( // cela nous sert a trier les plateformes de plus proche a eloigné
    (a, b) =>
      Math.abs(ninja.y + ninja.height - a.y) -
      Math.abs(ninja.y + ninja.height - b.y)
  );

  return closestPlatforms[0]; // cela nous renvoies la plateforme la plus proche
}


function handlePlatformCollisions() { // cette fonction gere les collisions grace a closestpalform
  const closestPlatform = getClosestPlatform(ninja, platforms);

  if (  // cela sert a vérifier qu'il est sur la plateforme et qu'il tombe
    closestPlatform &&  
    ninja.vy > 0 &&
    ninja.y + ninja.height + ninja.vy >= closestPlatform.y &&
    ninja.y + ninja.height < closestPlatform.y + closestPlatform.height
  ) {
    ninja.y = closestPlatform.y - ninja.height;
    ninja.vy = 0;
  } else if (ninja.y > canvas.height - groundheight - ninja.height) {
    ninja.y = canvas.height - groundheight - ninja.height;
    ninja.vy = 0;
  }
}

function drawPlatforms() {
  for (let i = 0; i < platforms.length; i++) {
    platforms[i].draw();
  }
}

class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 30;
    this.images = [coinImage, coinImage2,coinImage3,coinImage4,coinImage5,coinImage6];
    this.imageIndex = 0;
  }

  draw() {
    if (!this.images) return;
    ctx.drawImage(this.images[this.imageIndex], this.x, this.y, this.width, this.height);
  }

  updateImage() {
    this.imageIndex = (this.imageIndex + 1) % this.images.length;
  }
}

const coins = [
  new Coin(platforms[0].x + 50, platforms[0].y - 30),
  new Coin(platforms[1].x + 50, platforms[1].y - 30),
  new Coin(platforms[2].x + 50, platforms[2].y - 30),
  new Coin(400, canvas.height - groundheight - 30),
];

function drawCoins() {
  for (let i = 0; i < coins.length; i++) {
    const coin = coins[i];
    if (isNinjaCollidingWithCoin(coin)) {
      score++; // Augmente le score de 1
      coins.splice(i, 1); // Retire la pièce du tableau
      i--; // Ajuste l'index pour ne pas sauter de pièce
    } else {
      if (animationCounter % 10 === 0) {
        coin.updateImage();
      }
      coin.draw();
    }
  }
}
function isNinjaCollidingWithCoin(coin) {
  return (
    ninja.x < coin.x + coin.width &&
    ninja.x + ninja.width > coin.x &&
    ninja.y < coin.y + coin.height &&
    ninja.y + ninja.height > coin.y
  );
}
function addCoins() {
  coins.push(
    new Coin(platforms[0].x + 50, platforms[0].y - 30),
    new Coin(platforms[1].x + 50, platforms[1].y - 30),
    new Coin(platforms[2].x + 50, platforms[2].y - 30),
    new Coin(800, canvas.height - groundheight - 30),
    new Coin(1050, canvas.height - groundheight - 30),
    new Coin(1000, canvas.height - groundheight - 30),
    new Coin(1100, canvas.height - groundheight - 30),
  );
}
function scheduleCoinRespawn() {
  setTimeout(() => {
    addCoins();
    scheduleCoinRespawn();
  }, 15000); // 10 secondes en millisecondes
}

const minautor = {
  x: 900,
  y: canvas.height - groundheight - 220,
  images: [minautorImage, minautorImage2, minautorImage3],
  imageIndex: 0,
  width: 180,
  height: 220,
  vx: 0,
  vy: 0,
}

function drawMinautor() {
  minautor.vx = -2; // Vitesse de déplacement horizontale du minotaure
  minautor.x += minautor.vx;

  if (animationCounter % 10 === 0) {
    minautor.imageIndex = (minautor.imageIndex + 1) % minautor.images.length;
  }

  if (minautor.x + minautor.width < 0) {
    // Le minotaure est hors du canvas (à gauche), le réinitialiser à droite
    minautor.x = canvas.width;
  }

  ctx.drawImage(
    minautor.images[minautor.imageIndex],
    minautor.x,
    minautor.y,
    minautor.width,
    minautor.height
  );
}

const missile = {
  x: 1100,
  y: canvas.height - groundheight - 400,
  images: [missileImage, missileImage2,],
  width: 100,
  height: 100,
  vx: 3,
  vy: 0,
  imageIndex: 0,
};

function drawMissile() {
  missile.vx = 3;
  missile.x += missile.vx;

  if (animationCounter % 10 === 0) {
    missile.imageIndex = (missile.imageIndex + 1) % missile.images.length;
  }

  if (missile.x - missile.width > canvas.width) {
    // If the missile is off the canvas (on the right), reset it to the left
    missile.x = -missile.width;
  }

  ctx.drawImage(
    missile.images[missile.imageIndex],
    missile.x,
    missile.y,
    missile.width,
    missile.height
  );
}

const sound1 = document.createElement('audio') // <audio>
sound1.src = ""

sound1.play()
sound1.pause()

function drawScore() {
  ctx.font = '24px Arial';
  ctx.fillStyle = 'white';
  ctx.fillText(`Score: ${score}`, 10, 30);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ninja.vy += gravity;

  ninja.x += ninja.vx;
  ninja.y += ninja.vy;

  handlePlatformCollisions();

  if (ninja.y > canvas.height - groundheight - ninja.height) {
    ninja.y = canvas.height - groundheight - ninja.height;
    ninja.vy = 0;
  }
  

  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  const pattern = ctx.createPattern(ground, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, canvas.height - groundheight, canvas.width, groundheight);

 drawNinja();

 drawPlatforms();

 function isNinjaCollidingWithBird() {
  return (
    ninja.x < birdObj.x + birdObj.width &&
    ninja.x + ninja.width > birdObj.x &&
    ninja.y < birdObj.y + birdObj.height &&
    ninja.y + ninja.height > birdObj.y
  );
}
  function isNinjaCollidingWithEnemy() {
    return (
      ninja.x < enemy.x + enemy.width &&
      ninja.x + ninja.width > enemy.x &&
      ninja.y < enemy.y + enemy.height &&
      ninja.y + ninja.height > enemy.y
    );
  }
  function isNinjaCollidingWithMinautor() {
    return (
      ninja.x < minautor.x + minautor.width &&
      ninja.x + ninja.width > minautor.x &&
      ninja.y < minautor.y + minautor.height &&
      ninja.y + ninja.height > minautor.y
    );
  }
  function isNinjaCollidingWithMissile() {
    return (
      ninja.x < missile.x + missile.width &&
      ninja.x + ninja.width > missile.x &&
      ninja.y < missile.y + missile.height &&
      ninja.y + ninja.height > missile.y
    );
  }

  drawCoins();
  drawEnemy();
  drawBird();
  drawMinautor();
  drawMissile();

  drawScore();

   if (isNinjaCollidingWithBird()) {
    console.log("Game Over - Collided with Bird!");
    return;
  }

  if (isNinjaCollidingWithEnemy()) {
    console.log("Game Over - Collided with Enemy!");
    return;
  }
   if (isNinjaCollidingWithMinautor()) {
    console.log("Game Over - Collided with Minautor!");
    return;
  }
   if (isNinjaCollidingWithMissile()) {
    console.log("Game Over - Collided with Missile!")
    return;
   }

  animationCounter++;
  requestAnimationFrame(draw); // loop
}
scheduleCoinRespawn();
function isOnGroundOrPlatform() {
  if (ninja.y === canvas.height - groundheight - ninja.height) { // detection des plat
    return true;
  }

  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    if (
      ninja.x + ninja.width > platform.x &&
      ninja.x < platform.x + platform.width &&
      ninja.y + ninja.height === platform.y &&
      ninja.vy >= 0
    ) {
      return true;
    }
  }

  return false;
}

draw();

document.addEventListener('keydown', function (event) {
  console.log('une touche vient dêtre appuyée', event.code);
  switch (event.code) {
    case "ArrowRight":
      ninja.vx = 6;
      break;
    case "ArrowLeft":
      ninja.vx = -6;
      break;
    case "Space": // si le ninja est sur le sol alors il va sauter de 10 px
      if (isOnGroundOrPlatform()) {
        ninja.vy = -13; // valeur a régler pour ajuster le saut
      }
      break;
  }
});

document.addEventListener("keyup", function (event) {
  console.log("une touche detre relachée", event.code);
  switch (event.code) {
    case "ArrowRight":
      ninja.vx = 0;
      break;
    case "ArrowLeft":
      ninja.vx = 0;
      break;
  }
});

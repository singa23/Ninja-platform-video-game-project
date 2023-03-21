const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 1200;
canvas.height = 1200;

const background = new Image();
const ground = new Image();
const ninjaImage = new Image();
const platformImage = new Image();
const birdImage = new Image();
const enemyImage = new Image();

background.src = "images/ninja-background.png";
ground.src = "images/ground.png";
ninjaImage.src = "images/ninjaplayer.png";
platformImage.src = "images/platform.png";
birdImage.src = "images/bird.png";
enemyImage.src = "images/enemy.png";

const groundheight = 47;
let gravity = 0.4;

const ninja = {
  x: 230,
  y: canvas.height - groundheight ,
  image: ninjaImage,
  width: 70,
  height: 100,
  vx: 0,
  vy: 0,
};

const enemy = {
  x:230,
  y: canvas.height - groundheight,
  image: enemyImage,
  width:70,
  height: 100,
  vx:0,
  vy:0,



}

const bird = {
  x: Math.random() * (canvas.width),
  y: Math.random() * (canvas.height - groundheight),
  image: birdImage,
  width: 100,
  height: 100,
  vx: 3,
  vy: 2,
};

function drawBird() {
  bird.x += bird.vx;
  bird.y += bird.vy;

  if (bird.x < 0 || bird.x + bird.width > canvas.width) { // cela permet à loiseau de rester dans le canvas
    bird.vx = -bird.vx;       
  }

  if (bird.y < 0 || bird.y + bird.height > canvas.height - groundheight) { // cela permet à loiseau de rester dans le canvas
    bird.vy = -bird.vy;
  }

  ctx.drawImage(bird.image, bird.x, bird.y, bird.width, bird.height);
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

function getClosestPlatform(ninja, platforms) {
  let closestPlatforms = platforms.slice();

  closestPlatforms = closestPlatforms.filter(
    (platform) =>
      ninja.x + ninja.width > platform.x &&
      ninja.x < platform.x + platform.width
  );

  closestPlatforms = closestPlatforms.filter(
    (platform) => ninja.y <= platform.y + platform.height
  );

  closestPlatforms.sort(
    (a, b) =>
      Math.abs(ninja.y + ninja.height - a.y) -
      Math.abs(ninja.y + ninja.height - b.y)
  );

  return closestPlatforms[0];
}


function handlePlatformCollisions() {
  const closestPlatform = getClosestPlatform(ninja, platforms);

  if (
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

  ctx.drawImage(ninja.image, ninja.x, ninja.y, ninja.width, ninja.height);

  drawPlatforms();

  function isNinjaCollidingWithBird() {
    return (
      ninja.x < bird.x + bird.width &&
      ninja.x + ninja.width > bird.x &&
      ninja.y < bird.y + bird.height &&
      ninja.y + ninja.height > bird.y
    );
  }

 

  drawBird();

  if (isNinjaCollidingWithBird()) {
    console.log("Game Over!");
    return;
  }

  requestAnimationFrame(draw);
}

function isOnGroundOrPlatform() {
  if (ninja.y === canvas.height - groundheight - ninja.height) {
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

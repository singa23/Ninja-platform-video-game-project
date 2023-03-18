const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 1200;
canvas.height = 1200;

const background = new Image();
const ground = new Image();
const ninjaImage = new Image();
const platformImage = new Image();

background.src = "images/ninja-background.png";
ground.src = "images/ground.png";
ninjaImage.src = "images/ninjaplayer.png";
platformImage.src = "images/platform.png"

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
const platforms =[
 {
   x: 250,
   y: 1000,
   width: 200,
   height: 40,
 },
 {
   x:550,
   y:900,
   width:200,
   height:40,
 },
 {
   x:850,
   y: 800,
   width: 200,
   height: 40,
 },
];


function drawPlatforms() {
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    ctx.drawImage(platformImage, platform.x, platform.y, platform.width, platform.height);
  }
}


function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

    // mettre la gravité
    ninja.vy += gravity;
   

  // mettre a jout la position du player en fonction de sa vitesse
  ninja.x += ninja.vx
  ninja.y += ninja.vy

   // cela verifie que le ninja reste sur le sol et pas en dessous
   if (ninja.y > canvas.height - groundheight - ninja.height) {
    ninja.y = canvas.height - groundheight - ninja.height;
    ninja.vy = 0;
  }

  // Dessiner l'image de fond
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  // image sol
  const pattern = ctx.createPattern(ground, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, canvas.height - groundheight, canvas.width, groundheight);

  // Dessiner ninja
  ctx.drawImage(ninja.image, ninja.x, ninja.y, ninja.width, ninja.height);
  
  drawPlatforms();

  requestAnimationFrame(draw);
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
      if (ninja.y === canvas.height - groundheight - ninja.height) {
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

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 1200;
canvas.height = 1200;

const background = new Image();
const ground = new Image();
const ninjaImage = new Image();

background.src = "images/ninja-background.png";
ground.src = "images/ground.png";
ninjaImage.src = "images/ninjaplayer.png";

const groundheight = 50;
let gravity = 0.1;
const ninja = {
  x: 230,
  y: canvas.height - groundheight - 150,
  image: ninjaImage,
  width: 100,
  height: 200,
  vx: 0,
  vy: 0,
};

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // mettre a jout la position du player en fonction de sa vitesse
  ninja.x += ninja.vx
  ninja.y += ninja.vy

  // Dessiner l'image de fond
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  // image sol
  const pattern = ctx.createPattern(ground, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, canvas.height - groundheight, canvas.width, groundheight);

  // Dessiner ninja
  ctx.drawImage(ninja.image, ninja.x, ninja.y, ninja.width, ninja.height);

  requestAnimationFrame(draw);
}

draw();

document.addEventListener('keydown', function (event) {
  console.log('une touche vient dêtre appuyée', event.code);
  switch (event.code) {
    case "ArrowRight":
      ninja.vx = 6
      break;
      case "ArrowLeft":
      ninja.vx = -6
      break;
     case  "space":
      ninja.vy = -5;
    
  }
  
});

document.addEventListener("keyup", function (event) {
console.log("une touche detre relachée", event.code);
 switch (event.code){
    case "ArrowRight":
      ninja.vx = 0
      break;
      case "ArrowLeft":
      ninja.vx = 0
      break;
      case "space":
      ninja.vy = 0;
  }
})
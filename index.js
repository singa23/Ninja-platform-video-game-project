
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const ninjabackground = document.createElement("img")
ninjabackground.onload = function(){
    ctx.drawImage(ninjabackground,0,0, canvas.clientWidth, canvas.height);
};
ninjabackground.src = "images/ninja-background.png"

ninjacharacter = document.createElement('img') // <img>
ninjacharacter.onload = function(){
  ctx.drawImage(ninjacharacter,225,550, 50, 100,)
};
ninjacharacter.src = 'images/logo-ninja.avif'

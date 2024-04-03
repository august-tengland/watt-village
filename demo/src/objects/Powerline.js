
export class Powerline extends Phaser.GameObjects.TileSprite  {
    
    body;
    type;
    currentScene;
    apartment;
    house;
    isActive;
    speed;
    orientation;
    
    constructor(params) { 
      super(params.scene, params.x, params.y, params.width, params.height, params.texture, params.frame);

      // variables
      this.currentScene = params.scene;
      this.apartment = params.apartment;
      this.house = params.house;
      this.isActive = params.isActive;
      this.speed = params.speed;
      this.orientation = params.orientation;
      this.type = params.type;
      this.currentScene.add.existing(this);
      this.setDepth(35);
    }

    update() {
        console.log("called?");
    }

    handleAnimations() {
        if(this.isActive) {
            if (this.orientation == 0) this.tilePositionX -= this.speed;
            else if (this.orientation == 1) this.tilePositionY -= this.speed;
            else if (this.orientation == 2) this.tilePositionX += this.speed;
            else if (this.orientation == 3) this.tilePositionY += this.speed;
        }
    }
 }
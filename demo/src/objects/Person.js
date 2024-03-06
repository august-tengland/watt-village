
export class Person extends Phaser.GameObjects.Sprite {
  body;

  // variables
   currentScene;
   //isActivated;
   speed;
   //dyingScoreValue;

  constructor(params) {
    super(params.scene, params.x, params.y, params.texture, params.frame);

    // variables
    this.currentScene = params.scene;
    this.speed = params.speed;
    this.initSprite();
    this.currentScene.add.existing(this);
  }

  update() {
    console.log("test");
  }

  initSprite() {
    // variables
    //this.isActivated = false;
    //this.isDying = false;

    // sprite
    this.setOrigin(0, 0);
    this.setFrame(0);

    // physics
    this.currentScene.physics.world.enable(this);
    this.body.setSize(32, 48);
  }


}
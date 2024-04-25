
export class GraphButton extends Phaser.GameObjects.Sprite  {
    body;

    key; 
    graphKey;
    startingFrameNumber;
    currentScene;
    isActive;
    isDisabled;
    isHovered;

    
    constructor(params) { 
      super(params.scene, params.x, params.y, params.texture, params.frame);

      // variables
      this.key = params.key;
      this.graphKey = params.graphKey;
      this.currentScene = params.scene;
      this.isDisabled = params.isDisabled;
      this.isActive = true;
      this.startingFrameNumber = params.startingFrameNumber;
      this.currentScene.add.existing(this);
      this.configureEventHandling();
      this.handleAnimations();
      
    }

    configureEventHandling() {
        this.on('pointerover',function(pointer){
            this.isHovered = true;
            this.handleAnimations();
        })
    
        this.on('pointerout',function(pointer){
            this.isHovered = false;
            this.handleAnimations();
        })
        this.on('pointerdown',function(pointer){
          if (!this.isDisabled) {
            this.isActive = !this.isActive;
            this.scene.events.emit('graphButtonPressed', this.graphKey, this.isActive);
            this.handleAnimations();
          }
        })
    }

    handleAnimations() {
      if(this.isDisabled) {
        this.setFrame(1);
      } 
      else {
        if(this.isActive) {
          if(this.isHovered) this.setFrame(this.startingFrameNumber+1);
          else this.setFrame(this.startingFrameNumber);
        } else {
          if(this.isHovered) this.setFrame(1);
          else this.setFrame(0);
        }
      }
    }


 }
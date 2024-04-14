export default class GuideScene extends Phaser.Scene {

    constructor() {
        super({
        key: 'GuideScene'
        });
    }
    
    init() {

    }

    create() {
        this.guide = null;
        this.currentDay = this.registry.get("currentDay");
        this.guideState = this.registry.get('guideState');
        
        if(!(this.guideState === "inactive")) {
            setTimeout(() => {
                this.guide = this.createGuide();
            },1000);
        } else {
            console.log("guide not started (unexpected)");
        }
    }

// *********************************************************************
// ---- GUIDE METHODS -----------------------------------------
// *********************************************************************
    getGuideDialog() {
        const json = this.cache.json.get('guideDialogJSON');
        console.log(json);
        const guideDialogData = json[this.currentDay + this.guideState];
        if(guideDialogData == null) console.error("Error: Couldn't load dialog data with key" + (this.currentDay + this.guideState))
        return guideDialogData;
    } 

    getFadeTween(targets,fadeIn, duration) {
        const from = fadeIn ? 0 : 1;
        const to = fadeIn ? 1 : 0;
        return this.tweens.add({
            targets: targets,
            alpha: { from: from, to: to },
            ease: 'Sine.easeInOut',
            yoyo: false,
            repeat: 0,
            duration: duration
        });
    }

    updateGuide(increment,finish) {
        const guide = this.guide;
        if(finish) {
            if (this.guideState === "beforePlanner") {
                if(this.currentDay === "day1" || this.currentDay === "day2")
                    this.registry.set("guideState","duringPlanner"); 
                else
                    this.registry.set("guideState","inactive");
                this.scene.stop('SimulationScene');
                this.scene.start('PlannerScene');
            }
            else if (this.guideState === "duringPlanner") {
                if (this.currentDay === "day1")
                    this.registry.set("guideState","afterPlanner");
                else 
                    this.registry.set("guideState","inactive");
                this.scene.stop('GuideScene');
            }
            else {
                this.registry.set("guideState","inactive");
                this.events.emit('finished');
                this.scene.stop('GuideScene');
            }
        } else {
            guide['finish'] = false;
            console.log(guide);
            guide['counter'] += increment;
            const nextGuideSnippet = guide['data'][guide['counter']];

            if(guide['imageTexture'] != null && nextGuideSnippet['image'] !== guide['imageTexture']) {
                const fadeOutTween = this.getFadeTween([guide['text'],guide['image']],false,300);
            } else {
                const fadeOutTween = this.getFadeTween(guide['text'],false,300);
            }

            setTimeout(() => {
                guide['text'].setText(nextGuideSnippet['text']);

                if(nextGuideSnippet['image'] != null && nextGuideSnippet['image'] !== guide['imageTexture']) { 
                    const fadeInTween = this.getFadeTween([guide['text'],guide['image']],true,300);
                } else {
                    const fadeInTween = this.getFadeTween(guide['text'],true,300);
                }
                guide['imageTexture'] = nextGuideSnippet['image'];
                guide['image'].setTexture(guide['imageTexture']);

                if(guide['counter'] > 1) {
                    guide['backButton'].setAlpha(1);
                    guide['backButtonLabel'].setAlpha(1);
                } else {
                    guide['backButton'].setAlpha(0);
                    guide['backButtonLabel'].setAlpha(0);
                }
                if(nextGuideSnippet['finish']) {
                    if(this.guideState === 'beforePlanner') guide['nextButtonLabel'].setText('Schedule');
                    if(this.guideState === 'duringPlanner') guide['nextButtonLabel'].setText('Close');
                    if(this.guideState === 'afterPlanner') guide['nextButtonLabel'].setText('Start Day');
                    Phaser.Display.Align.In.Center(guide['nextButtonLabel'],guide['nextButton']);
                    guide['finish'] = true;    
                } else {
                    guide['nextButtonLabel'].setText('Next');
                    Phaser.Display.Align.In.Center(guide['nextButtonLabel'],guide['nextButton']);
                }
            }, 300);
        }         
    }

    createGuide() {
        const guide = {};
        

        const fadeInSpeed = 300;
        const textMargin = 40;
        const nextButtonMargin = 20;
        const guidePosition = {
            'beforePlanner': {x:1920/2,y:1080/2},
            'duringPlanner': {x:1920/2 + 400,y:1080/2},
            'afterPlanner': {x:1920/2 + 400,y:1080/2},
        }
        guide['dimensions'] = {x: guidePosition[this.guideState]['x'], y: guidePosition[this.guideState]['y'], width: 700, height:400};
        guide['container'] = this.add.image(guide['dimensions']['x'],
                                                guide['dimensions']['y'],
                                                "guideContainer")
                                                .setDepth(120);

        guide['data'] = this.getGuideDialog();
        guide['counter'] = 0;
        guide['finish'] = false;
        guide['text'] = this.addText(0,0,"",20,"#ffffff","normal").setOrigin(0).setDepth(125);
        guide['text'].style.wordWrapUseAdvanced = true;
        guide['text'].style.wordWrapWidth = guide['dimensions']['width']-textMargin*2;
        console.log(guide['text'].style);
        guide['nextButton'] = this.add.image(0,0,"guideNextButton")
                                        .setInteractive()
                                        .on('pointerdown', () => this.updateGuide(1,guide['finish']))
                                        .on('pointerover', () => this.enterGuideNextButtonHoverState())
                                        .on('pointerout', () => this.enterGuideNextButtonRestState())
                                        .setOrigin(0).setDepth(125);

        guide['backButton'] = this.add.image(0,0,"guideNextButton")
                                        .setInteractive()
                                        .on('pointerdown', () => this.updateGuide(-1,false))
                                        .on('pointerover', () => this.enterGuideBackButtonHoverState())
                                        .on('pointerout', () => this.enterGuideBackButtonRestState())
                                        .setOrigin(0).setDepth(125).setAlpha(0);

        guide['nextButtonLabel'] = this.addText(0,0,"Next",20,"#ffffff","Bold").setOrigin(0).setDepth(130);
        guide['backButtonLabel'] = this.addText(0,0,"Back",20,"#ffffff","Bold").setOrigin(0).setDepth(130).setAlpha(0);
        guide['image'] = this.add.image(0,0,"rutPortrait").setOrigin(0,1).setDepth(130).setAlpha(0);
        guide['imageTextureKey'] = null;
        
        Phaser.Display.Align.In.TopLeft(guide['text'],guide['container'],-textMargin,-textMargin);
        Phaser.Display.Align.In.BottomLeft(guide['image'],guide['container'],-nextButtonMargin,-nextButtonMargin);
        Phaser.Display.Align.In.BottomRight(guide['nextButton'],guide['container'],-nextButtonMargin,-nextButtonMargin);
        Phaser.Display.Align.In.Center(guide['nextButtonLabel'],guide['nextButton']);
        Phaser.Display.Align.To.LeftCenter(guide['backButton'],guide['nextButton'],nextButtonMargin,0);
        Phaser.Display.Align.In.Center(guide['backButtonLabel'],guide['backButton']);
        const fadeInTween = this.getFadeTween([guide['container'],guide['text'],guide['nextButton'],guide['nextButtonLabel']],true,fadeInSpeed);

        setTimeout(() => {
            this.updateGuide(1,guide['finish']);
        }, fadeInSpeed);

        return guide;
    }

    enterGuideNextButtonHoverState() {
        this.guide['nextButton'].setTint(0x169ac5,0x169ac5,0x9addf3,0x9addf3);
    }

    enterGuideNextButtonRestState() {
        this.guide['nextButton'].clearTint();
    }

    enterGuideBackButtonHoverState() {
        this.guide['backButton'].setTint(0x169ac5,0x169ac5,0x9addf3,0x9addf3);
    }

    enterGuideBackButtonRestState() {
        this.guide['backButton'].clearTint();
    }

    addText(x, y, value, size = 32, color = "#ffffff", fontStyle = 'bold') {
        return this.add.text(x, y, value, { fontFamily: 'Arial', fontStyle: fontStyle, fontSize: `${size}px`, fill: color });
      }

}
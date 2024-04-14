export default class SummaryScene extends Phaser.Scene {

    constructor() {
        super({
        key: 'SummaryScene'
        });
    }
    
    init() {

    }

    create() {
        this.currentDay = this.registry.get("currentDay");
        this.usingGuide = this.registry.get('usingGuide');
        this.totalStats = this.registry.get('totalStats');
        this.dailyGoal = this.registry.get('dailyGoal');

        console.log(this.totalStats);  
        this.gamezone = this.add.zone(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height);
        this.backdrop = this.add.rectangle(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height,0x000000);
        this.getFadeTween(this.backdrop,true,300,0.5);
        this.daySummary = this.createSummary();
    }

    replayLevel() {
        this.scene.stop('SimulationScene');
        this.scene.launch('HUDScene'); 
        this.scene.start("PlannerScene");
    }

    nextLevel() {
        const dayIndex = Number(this.currentDay.substring(3,4));
        const nextDay = "day" + (dayIndex+1); 
        this.registry.set('currentDay',nextDay);
        console.log(this.registry.get('currentDay'));
        if(this.usingGuide)
            this.registry.set('guideState',"beforePlanner");

        this.scene.launch('SimulationScene');
        this.scene.launch('HUDScene');
        this.scene.stop();

    }

    createSummary() {
        const daySummary = new Map();
        daySummary['container'] = this.add.rectangle(0,0,1200,800,0x0000ff);
        const dayCompleteText = "Day " + this.currentDay.substring(3,4) + " Completed";  
        daySummary['dayCompleteLabel'] = this.addText(0,0,dayCompleteText,32,"#ffffff","Comic Sans MS", "Bold").setOrigin(0);
        daySummary['savingsLabel'] = this.getSavingsLabel();
        daySummary['metGoalLabel'] = this.getMetGoalLabel();
        
        daySummary['nextLevelButton'] = this.add.image(0,0,"guideNextButton")
            .setInteractive()
            .on('pointerdown', () => this.nextLevel())
            .on('pointerover', () => this.enterGuideNextLevelButtonHoverState())
            .on('pointerout', () => this.enterGuideNextLevelButtonRestState())
            .setOrigin(0).setDepth(125);

        daySummary['replayLevelButton'] = this.add.image(0,0,"guideNextButton")
            .setInteractive()
            .on('pointerdown', () => this.replayLevel())
            .on('pointerover', () => this.enterGuideReplayLevelButtonHoverState())
            .on('pointerout', () => this.enterGuideReplayLevelButtonRestState())
            .setOrigin(0).setDepth(125);

        daySummary['nextLevelButtonLabel'] = this.addText(0,0,"Next Level",20,"#ffffff","Bold").setOrigin(0).setDepth(130);
        daySummary['replayLevelButtonLabel'] = this.addText(0,0,"Replay Level",20,"#ffffff","Bold").setOrigin(0).setDepth(130);

        Phaser.Display.Align.In.Center(daySummary['container'],this.gamezone, 0,80);
        Phaser.Display.Align.In.TopCenter(daySummary['dayCompleteLabel'],daySummary['container'],0,-20);
        Phaser.Display.Align.To.BottomCenter(daySummary['savingsLabel'],daySummary['dayCompleteLabel'],0,60);
        Phaser.Display.Align.To.BottomCenter(daySummary['metGoalLabel'],daySummary['savingsLabel'],0,0);

        Phaser.Display.Align.In.BottomCenter(daySummary['nextLevelButton'],daySummary['container'],100,-20);
        Phaser.Display.Align.In.BottomCenter(daySummary['replayLevelButton'],daySummary['container'],-100,-20);
        Phaser.Display.Align.In.Center(daySummary['nextLevelButtonLabel'],daySummary['nextLevelButton'], 0,0);
        Phaser.Display.Align.In.Center(daySummary['replayLevelButtonLabel'],daySummary['replayLevelButton'], 0,0);
        
        return daySummary;
    }



    getSavingsLabel() {
        var dailySavingsString = "Individual Savings: " + this.totalStats['ieh1']['save'].toFixed(2) + "\n";
        return this.addText(0,0,dailySavingsString,20,"#ffffff","Comic Sans MS", "Bold").setOrigin(0);;
    }

    getMetGoalLabel() {
        var metGoalString = "";
        var metGoalColor = "";
        if(this.totalStats['ieh1']['save'] >= this.dailyGoal) {
            metGoalString = "Daily goal reached!";
            metGoalColor = "#00FF00";
        } else {  
            metGoalString = "Daily goal not reached";
            metGoalColor = "#FF0000";
        }
        return this.addText(0,0,metGoalString,20,metGoalColor,"Comic Sans MS", "Bold").setOrigin(0);
    }

    addText(x, y, value, size = 32, color = "#ffffff", fontFamily = 'Arial', fontStyle = 'bold') {
        return this.add.text(x, y, value, { fontFamily: fontFamily, fontStyle: fontStyle, fontSize: `${size}px`, fill: color });
    }

    getFadeTween(targets,fadeIn, duration,maxAlpha = 1) {
        const from = fadeIn ? 0 : maxAlpha;
        const to = fadeIn ? maxAlpha : 0;
        return this.tweens.add({
            targets: targets,
            alpha: { from: from, to: to },
            ease: 'Sine.easeInOut',
            yoyo: false,
            repeat: 0,
            duration: duration
        });
    }

    enterGuideNextLevelButtonHoverState() {
        this.daySummary['nextLevelButton'].setTint(0x169ac5,0x169ac5,0x9addf3,0x9addf3);
    }

    enterGuideNextLevelButtonRestState() {
        this.daySummary['nextLevelButton'].clearTint();
    }

    enterGuideReplayLevelButtonHoverState() {
        this.daySummary['replayLevelButton'].setTint(0x169ac5,0x169ac5,0x9addf3,0x9addf3);
    }

    enterGuideReplayLevelButtonRestState() {
        this.daySummary['replayLevelButton'].clearTint();
    }



}
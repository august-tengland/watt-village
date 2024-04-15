export default class SummaryScene extends Phaser.Scene {

    constructor() {
        super({
        key: 'SummaryScene'
        });
    }
    
    init() {

    }


    create() {
        this.toolTip = null;
        this.toolTipText = null;

        this.currentDay = this.registry.get("currentDay");
        this.usingGuide = this.registry.get('usingGuide');
        this.totalStats = this.registry.get('totalStats');
        this.dailyGoal = this.registry.get('dailyGoal');

        console.log(this.totalStats);  
        this.gamezone = this.add.zone(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height);
        this.backdrop = this.add.rectangle(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height,0x000000);
        this.getFadeTween(this.backdrop,true,300,0.5);
        this.daySummary = this.createSummary();

        this.createTooltip();
    }

    createTooltip() {
        this.toolTip =  this.add.rectangle( 0, 0, 250, 50, 0xff0000).setOrigin(0);
        this.toolTipText = this.add.text( 0, 0, 'This is a white rectangle', { fontFamily: 'Arial', color: '#000' }).setOrigin(0);
        this.toolTip.alpha = 0;
        console.log("test1");
     
        this.input.setPollOnMove();
        this.input.on('gameobjectover', function (pointer, gameObject) {
            console.log("test2");
            this.tweens.add({
              targets: [this.toolTip, this.toolTipText],
              alpha: {from:0, to:1},
              repeat: 0,
              duration: 500
          });
        }, this);
    
        this.input.on('gameobjectout', function (pointer, gameObject) {
            console.log("test3");
            console.log(this);
            this.scene.toolTip.alpha = 0;
            this.scene.toolTipText.alpha = 0;
        });
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
        daySummary['container'] = this.add.rectangle(0,0,1400,800,0x0F375D);
        const dayCompleteText = "Day " + this.currentDay.substring(3,4) + " Completed";  
        daySummary['dayCompleteLabel'] = this.addText(0,0,dayCompleteText,32,"#ffffff","Comic Sans MS", "Bold").setOrigin(0);
        daySummary['savingsLabel'] = this.getSavingsLabel();
        daySummary['metGoalLabel'] = this.getMetGoalLabel();
        


        Phaser.Display.Align.In.Center(daySummary['container'],this.gamezone, 0,80);
        Phaser.Display.Align.In.TopCenter(daySummary['dayCompleteLabel'],daySummary['container'],0,-20);
        Phaser.Display.Align.To.BottomCenter(daySummary['savingsLabel'],daySummary['dayCompleteLabel'],0,60);
        Phaser.Display.Align.To.BottomCenter(daySummary['metGoalLabel'],daySummary['savingsLabel'],0,0);

        daySummary['p1Stats'] = this.createIndividualStats("p1",daySummary['metGoalLabel'],40);
        if(this.currentDay == "day2")
            daySummary['p3Stats'] = this.createIndividualStats("p3",daySummary['p1Stats']['statsContainer']);
        else if(this.currentDay == "day3" || this.currentDay == "day4") {
            daySummary['p2Stats'] = this.createIndividualStats("p2",daySummary['p1Stats']['statsContainer']);
            daySummary['p3Stats'] = this.createIndividualStats("p3",daySummary['p2Stats']['statsContainer']);
            daySummary['p4Stats'] = this.createIndividualStats("p4",daySummary['p3Stats']['statsContainer']);    
        }
        
        // Phaser.Display.Align.To.BottomCenter(daySummary['rutStats']['statsContainer'],daySummary['metGoalLabel'],0,20);


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

        daySummary['nextLevelButtonLabel'] = this.addText(0,0,"Next Level",20,"#ffffff","Arial","Bold").setOrigin(0).setDepth(130);
        daySummary['replayLevelButtonLabel'] = this.addText(0,0,"Replay Level",20,"#ffffff","Arial","Bold").setOrigin(0).setDepth(130);

        Phaser.Display.Align.In.BottomCenter(daySummary['nextLevelButton'],daySummary['container'],100,-20);
        Phaser.Display.Align.In.BottomCenter(daySummary['replayLevelButton'],daySummary['container'],-100,-20);
        Phaser.Display.Align.In.Center(daySummary['nextLevelButtonLabel'],daySummary['nextLevelButton'], 0,0);
        Phaser.Display.Align.In.Center(daySummary['replayLevelButtonLabel'],daySummary['replayLevelButton'], 0,0);
        
        return daySummary;
    }

    createIndividualStats(personKey, alignToElement, extraOffset = 0) 
    {
        var individualName = "";
        var individualHandler = "";
        var containerFrame = null;
        var test = null;
        const individualStats = {};
        switch (personKey) {
            case "p1": 
                individualName = "Rut";
                individualHandler = "ieh1";
                containerFrame = 0;            
                test = "25%";
                break;
            case "p2": 
                individualName = "Maria";
                individualHandler = "ieh2";
                containerFrame = 1;     
                test = "10%";   
                break;
            case "p3": 
                individualName = "Peter";
                individualHandler = "ieh3";
                containerFrame = 2; 
                test = "35%";           
                break;
            case "p4": 
                individualName = "Ravi";
                individualHandler = "ieh4";
                containerFrame = 3;   
                test = "0%";         
                break;
            default:
                console.error("Invalid personKey provided!");
                break;
        }

        individualStats['statsContainer'] = this.add.image(0,0,"summaryStats").setFrame(containerFrame);


        const valueTextElements = new Map([
            ['statsName', this.addText(0, 200, (individualName + "'s Stats"),20,"#ffffff","Comic Sans MS")],
            ['statsBuy', this.addText(0, 200, `${this.totalStats[individualHandler]['buy'].toFixed(2)}`,20,"#ffffff","Comic Sans MS")],
            ['statsSell', this.addText(0, 200, `${this.totalStats[individualHandler]['sell'].toFixed(2)}`,20,"#ffffff","Comic Sans MS")],
            ['statsSave', this.addText(0, 200, `${this.totalStats[individualHandler]['save'].toFixed(2)}`,20,"#ffffff","Comic Sans MS")],
            ['statsSolarUsed', this.addText(0, 200, test,20,"#ffffff","Comic Sans MS")],
            ['statsAvgBuyPrice', this.addText(0, 200, '00.00',20,"#ffffff","Comic Sans MS")],
            ['statsAvgSellPrice', this.addText(0, 200, '00.00',20,"#ffffff","Comic Sans MS")]
        ]);

        const valueInfoZones = new Map([
            ['statsBuy', this.add.zone(0,0,100,50).setInteractive()],
            ['statsSell', this.add.zone(0,0,100,50).setInteractive()],
            ['statsSave', this.add.zone(0,0,100,50).setInteractive()],
            ['statsSolarUsed', this.add.zone(0,0,100,50).setInteractive()],
            ['statsAvgBuyPrice', this.add.zone(0,0,100,50).setInteractive()],
            ['statsAvgSellPrice', this.add.zone(0,0,100,50).setInteractive()]
        ]);

        const valueInfoZonesText = new Map([
            ['statsBuy', "Something statsBuy"],
            ['statsSell', "Something statsSell"],
            ['statsSave', "Something statsSave"],
            ['statsSolarUsed', "Something statsSolarUsed"],
            ['statsAvgBuyPrice', "Something statsAvgBuyPrice"],
            ['statsAvgSellPrice', "Something statsAvgSellPrice"]
        ]);

        Phaser.Display.Align.To.BottomCenter(individualStats['statsContainer'],alignToElement,0,25+extraOffset);

        Phaser.Display.Align.In.LeftCenter(valueTextElements.get('statsName'),individualStats['statsContainer'], -80);
        
        Phaser.Display.Align.In.LeftCenter(valueTextElements.get('statsBuy'),individualStats['statsContainer'], -265);
        
        Phaser.Display.Align.In.LeftCenter(valueTextElements.get('statsSell'),individualStats['statsContainer'], -400);
        
        Phaser.Display.Align.In.LeftCenter(valueTextElements.get('statsSave'),individualStats['statsContainer'], -543);
        
        Phaser.Display.Align.In.LeftCenter(valueTextElements.get('statsSolarUsed'),individualStats['statsContainer'], -745);
        
        Phaser.Display.Align.In.LeftCenter(valueTextElements.get('statsAvgBuyPrice'),individualStats['statsContainer'], -912);
        
        Phaser.Display.Align.In.LeftCenter(valueTextElements.get('statsAvgSellPrice'),individualStats['statsContainer'], -1080);

        
        for (var [key, zone] of valueInfoZones) {
            const keyCopy = key;
            Phaser.Display.Align.In.RightCenter(zone,valueTextElements.get(keyCopy), 0, 0);
            console.log("test5",keyCopy);
            zone.on('pointermove', function (pointer) {
                console.log("test4",keyCopy);
                this.scene.toolTip.x = pointer.x;
                this.scene.toolTip.y = pointer.y;
                this.scene.toolTipText.x = pointer.x + 5;
                this.scene.toolTipText.y = pointer.y + 5;
                this.scene.toolTipText.setText(valueInfoZonesText.get(keyCopy));
            });

        }
        Phaser.Display.Align.In.LeftCenter(zone,individualStats['statsContainer'], -80);

        return individualStats;
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

    addText(x, y, value, size = 32, color = "#ffffff", fontFamily = 'Arial', fontStyle = 'normal') {
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
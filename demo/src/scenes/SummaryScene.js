
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
        this.totalUsages = this.totalStats['total']['solarUsages'];

        //console.log(this.totalStats);  
        this.gamezone = this.add.zone(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height);
        this.backdrop = this.add.rectangle(this.scale.width/2, this.scale.height/2, this.scale.width, this.scale.height,0x000000);
        this.getFadeTween(this.backdrop,true,300,0.5);
        setTimeout(() => {
            this.daySummary = this.createSummary();            
        }, 500);
        this.createTooltip();
        //console.log(this.registry.get("currentScheduleImage"));
        //this.add.dom(10, 200, this.registry.get("currentScheduleImage")).setOrigin(0);
        //this.textures.createCanvas(10,200)
        //this.add.image(10,200,this.registry.get("currentScheduleImage")).setOrigin(0);
    }
    

    createTooltip() {
        this.toolTip =  this.add.rectangle( 0, 0, 320, 75, 0x002547).setOrigin(0).setDepth(10);
        this.toolTipText = this.add.text( 0, 0, '', { fontFamily: 'Arial', color: '#FFFFFF' }).setOrigin(0).setDepth(12);
        this.toolTip.alpha = 0;
        //console.log("test1");
     
        this.input.setPollOnMove();
        this.input.on('gameobjectover', function (pointer, gameObject) {
           if(gameObject.y < 900) { // Oh that's ugly
            this.tweens.add({
                targets: [this.toolTip, this.toolTipText],
                alpha: {from:0, to:1},
                repeat: 0,
                duration: 300
              });
           }
        }, this);
    
        this.input.on('gameobjectout', function (pointer, gameObject) {
            //console.log("test3",gameObject);
           //console.log(this);
            if(gameObject.y < 900) { // Oh that's ugly
                this.scene.toolTip.alpha = 0;
                this.scene.toolTipText.alpha = 0;
            }
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
        //console.log(this.registry.get('currentDay'));
        if(this.usingGuide) {
            this.registry.set('guideState',"beforePlanner");
            this.scene.launch('SimulationScene');
        } else {
            this.scene.stop('SimulationScene');
            this.scene.launch('PlannerScene');
        }
        this.scene.launch('HUDScene');
        this.scene.stop();

    }

    createSummary() {
        const daySummary = new Map();
        const tweenTargetsFirst = [];
        const tweenTargetsSecond = [];
        const tweenTargetsThird = [];
        daySummary['container'] = this.add.rectangle(0,0,1200,800,0x0F375D);
        tweenTargetsFirst.push(daySummary['container']);

        const dayCompleteText = "Day " + this.currentDay.substring(3,4) + " Completed";  
        daySummary['dayCompleteLabel'] = this.addText(0,0,dayCompleteText,32,"#ffffff","Comic Sans MS", "Bold").setOrigin(0).setAlpha(0);
        daySummary['savingsLabel'] = this.getSavingsLabel().setAlpha(0);
        daySummary['metGoalLabel'] = this.getMetGoalLabel().setAlpha(0);
        tweenTargetsSecond.push(daySummary['dayCompleteLabel']);
        tweenTargetsSecond.push(daySummary['savingsLabel']);
        tweenTargetsSecond.push(daySummary['metGoalLabel']);


        Phaser.Display.Align.In.Center(daySummary['container'],this.gamezone, 0,80);
        Phaser.Display.Align.In.TopCenter(daySummary['dayCompleteLabel'],daySummary['container'],0,-20);
        Phaser.Display.Align.To.BottomCenter(daySummary['savingsLabel'],daySummary['dayCompleteLabel'],0,60);
        Phaser.Display.Align.To.BottomCenter(daySummary['metGoalLabel'],daySummary['savingsLabel'],0,0);

        daySummary['p1Stats'] = this.createIndividualStats("p1",daySummary['metGoalLabel'],0,40);
        if(this.currentDay == "day3")
            daySummary['p3Stats'] = this.createIndividualStats("p3",daySummary['p1Stats']['statsContainer'],0,300);
        else if(this.currentDay == "day4") {
            daySummary['p2Stats'] = this.createIndividualStats("p2",daySummary['p1Stats']['statsContainer'],0,300);
            daySummary['p3Stats'] = this.createIndividualStats("p3",daySummary['p2Stats']['statsContainer'],0,600);
            daySummary['p4Stats'] = this.createIndividualStats("p4",daySummary['p3Stats']['statsContainer'],0,900);    
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

        tweenTargetsFirst.push(daySummary['nextLevelButton']);
        tweenTargetsFirst.push(daySummary['replayLevelButton']);
        tweenTargetsFirst.push(daySummary['nextLevelButtonLabel']);
        tweenTargetsFirst.push(daySummary['replayLevelButtonLabel']);

        this.tweens.add({
            targets: tweenTargetsFirst,
            alpha: {from:0, to:1},
            repeat: 0,
            duration: 300
        });
        setTimeout(() => {
            this.tweens.add({
            targets: tweenTargetsSecond,
            alpha: {from:0, to:1},
            repeat: 0,
            duration: 300
            })
        }, 1000);
        return daySummary;
    }

    createIndividualStats(personKey, alignToElement, extraOffset = 0, tweenExtraDelay = 0) 
    {
        const tweenDelay = 2000 + tweenExtraDelay;
        var individualName = "";
        var individualHandler = "";
        var containerFrame = null;
        var test = null;
        const individualStats = {};
        const tweenTargets = []; 
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

        individualStats['statsContainer'] = this.add.image(0,0,"summaryStats").setFrame(containerFrame).setAlpha(0);
        tweenTargets.push(individualStats['statsContainer']);

        const valueTextElements = new Map([
            ['statsName', this.addText(0, 200, (individualName + "'s Stats"),20,"#ffffff","Comic Sans MS").setAlpha(0)],
            ['statsBuy', this.addText(0, 200, `${this.totalStats[individualHandler]['buy'].toFixed(2)}`,20,"#ffffff","Comic Sans MS").setAlpha(0)],
            ['statsSell', this.addText(0, 200, `${this.totalStats[individualHandler]['sell'].toFixed(2)}`,20,"#ffffff","Comic Sans MS").setAlpha(0)],
            ['statsSave', this.addText(0, 200, `${this.totalStats[individualHandler]['save'].toFixed(2)}`,20,"#ffffff","Comic Sans MS").setAlpha(0)],
            ['statsSolarUsed', this.addText(0, 200, `${this.getSolarUsage(personKey).toFixed(1)}%`,20,"#ffffff","Comic Sans MS").setAlpha(0)],
            //['statsAvgBuyPrice', this.addText(0, 200, '00.00',20,"#ffffff","Comic Sans MS")],
            //['statsAvgSellPrice', this.addText(0, 200, '00.00',20,"#ffffff","Comic Sans MS")]
        ]);

        valueTextElements.forEach(value => tweenTargets.push(value)); 

        const valueInfoZones = new Map([
            ['statsBuy', this.add.zone(0,0,100,50).setInteractive()],
            ['statsSell', this.add.zone(0,0,100,50).setInteractive()],
            ['statsSave', this.add.zone(0,0,100,50).setInteractive()],
            ['statsSolarUsed', this.add.zone(0,0,100,50).setInteractive()],
            //['statsAvgBuyPrice', this.add.zone(0,0,100,50).setInteractive()],
            //['statsAvgSellPrice', this.add.zone(0,0,100,50).setInteractive()]
        ]);

        const valueInfoZonesText = new Map([
            ['statsBuy', "The amount of money spent\nbuying electricity (in 'sek')"],
            ['statsSell', "The amount of money made\nselling electricity (in 'sek')"],
            ['statsSave', "The amount of money saved\ncompared to following an ordinary schedule\nwithout solar panels (in 'sek')"],
            ['statsSolarUsed', "The fraction of produced energy\nutilized by this person, either\nthrough consumption or selling"],
            //['statsAvgBuyPrice', "The average price of electricity\n bought (in 'sek/kWh')"],
            //['statsAvgSellPrice', "The average price of electricity\nsold (in 'sek/kWh')"]
        ]);

        Phaser.Display.Align.To.BottomCenter(individualStats['statsContainer'],alignToElement,0,25+extraOffset);

        Phaser.Display.Align.In.LeftCenter(valueTextElements.get('statsName'),individualStats['statsContainer'], -80);
        
        Phaser.Display.Align.In.LeftCenter(valueTextElements.get('statsBuy'),individualStats['statsContainer'], -265);
        
        Phaser.Display.Align.In.LeftCenter(valueTextElements.get('statsSell'),individualStats['statsContainer'], -400);
        
        Phaser.Display.Align.In.LeftCenter(valueTextElements.get('statsSave'),individualStats['statsContainer'], -543);
        
        Phaser.Display.Align.In.LeftCenter(valueTextElements.get('statsSolarUsed'),individualStats['statsContainer'], -745);
        
        //Phaser.Display.Align.In.LeftCenter(valueTextElements.get('statsAvgBuyPrice'),individualStats['statsContainer'], -912);
        
        //Phaser.Display.Align.In.LeftCenter(valueTextElements.get('statsAvgSellPrice'),individualStats['statsContainer'], -1080);

        setTimeout(() => {
            this.tweens.add({
            targets: tweenTargets,
            alpha: {from:0, to:1},
            repeat: 0,
            duration: 300
            })
        }, tweenDelay);

        
        for (var [key, zone] of valueInfoZones) {
            const keyCopy = key;
            Phaser.Display.Align.In.RightCenter(zone,valueTextElements.get(keyCopy), 0, 0);
            zone.on('pointermove', function (pointer) {
                //console.log("test4",keyCopy);
                this.scene.toolTip.x = pointer.x+10;
                this.scene.toolTip.y = pointer.y+5;
                this.scene.toolTipText.x = pointer.x + 20;
                this.scene.toolTipText.y = pointer.y + 15;
                this.scene.toolTipText.setText(valueInfoZonesText.get(keyCopy));
            });

        }

        return individualStats;
    }

    getSolarUsage(personKey) {
        //console.log(this.totalUsages);
        const totalUsage = this.totalUsages.reduce((partialSum, a) => partialSum + a, 0);
        var sellingFraction = 0;
        if (this.currentDay === "day1" || this.currentDay === "day2") sellingFraction = 1.0;
        else if (this.currentDay === "day3") sellingFraction = 0.5;
        else if (this.currentDay === "day4") sellingFraction = 0.25;
        const personIndex = Number(personKey.substring(1));
        if (totalUsage == 0 ) return 0;
        else return (this.totalUsages[personIndex] + this.totalUsages[0]*sellingFraction)/totalUsage * 100;
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
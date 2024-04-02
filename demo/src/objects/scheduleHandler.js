
// Manages updates of energy production, pricing, and calculates costs
export class ScheduleHandler {
  
    // init from params
    currentDayKey;
    scene;
    scheduleDataPerTimeUnit;
    tucf;
  
    constructor(params) { 
      // variables
      this.currentDayKey = params.currentDayKey;
      this.scene = params.scene; 
      this.tucf = params.tucf;
      this.scheduleDataPerTimeUnit = this.loadScheduleData(this.currentDayKey);
      //console.log("and when is this called?");
    }

    loadScheduleData(currentDayKey) {
        const json = this.scene.cache.json.get('dailySchedulesJSON');
        const scheduleData = json[currentDayKey];
        //console.log("when is this called?");
        return this.convertScheduleDataToArray(scheduleData);
    }

    convertScheduleDataToArray(scheduleData) {
        var scheduleDataPerTimeUnit = {};
        for (const [personKey, scheduleValue] of Object.entries(scheduleData)) {
            scheduleDataPerTimeUnit[personKey] = {};
            for (const [timestepKey, timestepActivity] of Object.entries(scheduleValue)) {
                var timestep = this.convertTimestep(timestepKey); 
                var activityKey = "a" + personKey.substring(1) + timestepActivity;
                scheduleDataPerTimeUnit[personKey][timestep] = activityKey; 
            }
        }
        return scheduleDataPerTimeUnit;
    }

    convertTimestep(timestepKey) { // timestepKey on the form HH:MM
        var hour = parseInt(timestepKey.substring(0,2), 10);
        var minute = parseInt(timestepKey.substring(3), 10);
        //console.log(hour*this.tucf + minute/60*this.tucf);
        return (hour*this.tucf + minute/60*this.tucf);
    }
  
    getSchedule(personKey, activityMap) {
        const schedule = new Map();
        //console.log("Creating schedule for person:", personKey);
        //console.log(this.scheduleDataPerTimeUnit[personKey]);
        const scheduleFromJson = this.scheduleDataPerTimeUnit[personKey];
        for (const [time, activityKey] of Object.entries(scheduleFromJson)) {
            // Get full activity from reference to activity map
           schedule.set(time, activityMap.get(activityKey))
        }
        console.log(schedule);
        return schedule;
    }

    createControlledSchedule(personKey, activityTracker, activityMap) {
        const schedule = new Map();
        console.log(activityTracker);
        //console.log("Creating controlled schedule for person:", personKey);
        //console.log(definedActivities);
        for (const [activityKey,activityValues] of Object.entries(activityTracker)) {
            const activityArray = this.convertActivityTrackerEntrytoActivities(activityKey,activityValues,activityMap);
            for (var i = 0; i < activityArray.length; i++) {
                schedule.set(activityArray[i][0].toString(), activityArray[i][1]);
            }
        }
        console.log(schedule);
        const completeSchedule = this.fillControlledSchedule(schedule,activityTracker,activityMap);
        return schedule;
    }

    fillControlledSchedule(schedule, activityTracker, activityMap) {
        const dinnerStartTime = activityTracker["dinner"].startTime;
        const dinnerEndTime = dinnerStartTime + activityTracker["dinner"].duration;
        const tvStartTime = activityTracker["tv"].startTime;
        const tvEndTime = tvStartTime + activityTracker["tv"].duration;

        if (dinnerStartTime > 17 && tvStartTime > 17) {
            const bookActivity = activityMap.get("a1book");
            const bookStartTime = 17*this.tucf;
            schedule.set(bookStartTime.toString(),bookActivity);
        }
        if(tvStartTime > dinnerEndTime) {
            const bookActivity = activityMap.get("a1book");
            const bookStartTime = dinnerEndTime * this.tucf;
            schedule.set(bookStartTime.toString(),bookActivity);
        }
        if(dinnerStartTime > tvEndTime) {
            const bookActivity = activityMap.get("a1book");
            const bookStartTime = tvEndTime * this.tucf;
            schedule.set(bookStartTime.toString(),bookActivity);
        }
        if(Math.max(tvEndTime, dinnerEndTime) < 24) {
            const bookActivity = activityMap.get("a1book");
            const bookStartTime = Math.max(tvEndTime, dinnerEndTime) * this.tucf;
            schedule.set(bookStartTime.toString(),bookActivity);
        }
        const bathroomActivity = activityMap.get("a1bathroom");
        const bathroomStartTime = 24 * this.tucf;
        schedule.set(bathroomStartTime.toString(),bathroomActivity);

        const bedActivity = activityMap.get("a1bed");
        const bedStartTime = 24 * this.tucf + 1;
        schedule.set(bedStartTime.toString(),bedActivity);

        return schedule;
    }

    convertActivityTrackerEntrytoActivities(ateKey,ateValue,activityMap) {
        const activities = [];
        var startTime = ateValue.startTime * this.tucf;
        if(ateKey === "dinner") {
            const fridgeActivity = activityMap.get("a1fridge");
            activities.push([startTime,fridgeActivity]);
            startTime += 1; // Spend one time unit checking the fridge
            const stoveActivity = activityMap.get("a1stove");
            activities.push([startTime,stoveActivity]);
            startTime += 1*this.tucf - 1; // Spend one hour in total cooking
            const dinnerTableActivity = activityMap.get("a1dinnerTable");
            activities.push([startTime,dinnerTableActivity]);
        } else if(ateKey === "morningRoutine") {
            const fridgeActivity = activityMap.get("a1fridge");
            activities.push([startTime,fridgeActivity]);
            startTime += 1; // Spend one time unit checking the fridge
            const dinnerTableActivity = activityMap.get("a1dinnerTable");
            activities.push([startTime,dinnerTableActivity]);
            startTime += 1; // Spend one time unit eating breakfast
            const bathroomActivity = activityMap.get("a1bathroom");
            activities.push([startTime,bathroomActivity]);
        } else if(ateKey === "work" || ateKey === "goFromWork") {
            return []; // don't need to be processed as activities
        } else {
            const fullActivityKey = "a1" + ateKey;
            const activity = activityMap.get(fullActivityKey);
            activities.push([startTime, activity]);
        }
    
        console.log(activities);
        return activities;
    }
   }
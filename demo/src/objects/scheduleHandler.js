
// Manages updates of energy production, pricing, and calculates costs
export class ScheduleHandler {
  
    // init from params
    currentDayKey;
    scene;
    scheduleDataPerTimeUnit;
    startTime;
    tucf;
  
    constructor(params) { 
      // variables
      this.currentDayKey = params.currentDayKey;
      this.scene = params.scene; 
      this.tucf = params.tucf;
      this.startTime = params.startTime;
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
            for (const [timestepKey, timestepActivityArray] of Object.entries(scheduleValue)) {
                var timestep = this.convertTimestep(timestepKey); 
                scheduleDataPerTimeUnit[personKey][timestep] = [];
                timestepActivityArray.forEach(activityKey => {
                    var fullActivityKey = "a" + personKey.substring(1) + activityKey;
                    scheduleDataPerTimeUnit[personKey][timestep].push(fullActivityKey);     
                });
            }
        }
        //console.log(scheduleDataPerTimeUnit);

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
        for (const [time, activityKeyArray] of Object.entries(scheduleFromJson)) {
            //console.log(activityKeyArray);
            activityKeyArray.forEach(activityKey => {
                //console.log(activityKey);
                // Get full activity from reference to activity map
                this.setMapValue(schedule, time, activityMap.get(activityKey),activityMap.get(activityKey).minDuration);
            });      
        }
        //console.log(schedule);
        return schedule;
    }

    createControlledSchedule(personKey, activityTracker, activityMap) {
        const schedule = new Map();
        //console.log("Creating controlled schedule for person:", personKey);
        //console.log(definedActivities);
        for (const [activityKey,activityValues] of Object.entries(activityTracker)) {
            const activityArray = this.convertActivityTrackerEntrytoActivities(activityKey,activityValues,activityMap);
            for (var i = 0; i < activityArray.length; i++) {
                this.setMapValue(schedule,activityArray[i][0].toString(), activityArray[i][1], activityArray[i][2]);
            }
        }
        //console.log(schedule);
        const completeSchedule = this.fillControlledSchedule(schedule,activityTracker,activityMap);
        return completeSchedule;
    }

    fillControlledSchedule(schedule, activityTracker, activityMap) {
        const dinnerStartTime = activityTracker["dinner"].startTime;
        const dinnerEndTime = dinnerStartTime + activityTracker["dinner"].duration;
        const tvStartTime = activityTracker["tv"].startTime;
        const tvEndTime = tvStartTime + activityTracker["tv"].duration;

        if (dinnerStartTime > 17 && tvStartTime > 17) {
            const bookActivity = activityMap.get("a1book");
            const bookStartTime = 17*this.tucf;
            this.setMapValue(schedule,bookStartTime.toString(),bookActivity,bookActivity.minDuration);
        }
        if(tvStartTime > dinnerEndTime) {
            const bookActivity = activityMap.get("a1book");
            const bookStartTime = dinnerEndTime * this.tucf;
            this.setMapValue(schedule,bookStartTime.toString(),bookActivity,bookActivity.minDuration);
        }
        if(dinnerStartTime > tvEndTime) {
            const bookActivity = activityMap.get("a1book");
            const bookStartTime = tvEndTime * this.tucf;
            this.setMapValue(schedule,bookStartTime.toString(),bookActivity,bookActivity.minDuration);
        }
        if(Math.max(tvEndTime, dinnerEndTime) < 24) {
            const bookActivity = activityMap.get("a1book");
            const bookStartTime = Math.max(tvEndTime, dinnerEndTime) * this.tucf;
            this.setMapValue(schedule,bookStartTime.toString(),bookActivity,bookActivity.minDuration);
        }
        const bathroomActivity = activityMap.get("a1bathroom");
        const bathroomStartTime = 24 * this.tucf;
        this.setMapValue(schedule,bathroomStartTime.toString(),bathroomActivity,bathroomActivity.minDuration);

        const bedActivity = activityMap.get("a1bed");
        const bedStartTime = 24 * this.tucf + 1;
        this.setMapValue(schedule,bedStartTime.toString(),bedActivity,bedActivity.minDuration);

        //console.log("test:",schedule);

        return schedule;
    }

    convertActivityTrackerEntrytoActivities(ateKey,ateValue,activityMap) {
        const activities = [];
        var startTime = ateValue.startTime * this.tucf;
        if(ateKey === "dinner") {
            const fridgeActivity = activityMap.get("a1fridge");
            activities.push([startTime,fridgeActivity,fridgeActivity.minDuration]);
            startTime += 1; // Spend one time unit checking the fridge
            const stoveActivity = activityMap.get("a1stove");
            activities.push([startTime,stoveActivity,stoveActivity.minDuration]);
            startTime += 1*this.tucf - 1; // Spend one hour in total cooking
            const dinnerTableActivity = activityMap.get("a1dinnerTable");
            activities.push([startTime,dinnerTableActivity,dinnerTableActivity.minDuration]);
        } else if(ateKey === "morningRoutine") {
            const fridgeActivity = activityMap.get("a1fridge");
            activities.push([startTime,fridgeActivity,fridgeActivity.minDuration]);
            startTime += 2; // Spend two time unit checking the fridge
            const dinnerTableActivity = activityMap.get("a1dinnerTable");
            activities.push([startTime,dinnerTableActivity,dinnerTableActivity.minDuration]);
            startTime += 1; // Spend one time unit eating breakfast
            const bathroomActivity = activityMap.get("a1bathroom");
            activities.push([startTime,bathroomActivity,bathroomActivity.minDuration]);
        } else if(ateKey === "work" || ateKey === "goFromWork") {
            return []; // don't need to be processed as activities
        } else {
            const fullActivityKey = "a1" + ateKey;
            const activity = activityMap.get(fullActivityKey);
            const underflow = this.startTime-startTime;
            if( underflow > 0) {
                startTime = startTime+24*this.tucf;
            }
            const overflow = startTime+activity.minDuration-(this.startTime+24*this.tucf);
            //console.log("under:",underflow/this.tucf);
            //console.log("over:",overflow/this.tucf);
            //console.log("duration:",activity.minDuration);

            if (overflow > 0) {
                activities.push([this.startTime, activity, overflow]);
                activities.push([startTime, activity, activity.minDuration-overflow]);
            } else {
                activities.push([startTime, activity, activity.minDuration]);
            }
            //activity.minDuration = 1;
            //activities.push([startTime, activity]);
        }
        return activities;
    }

    setMapValue(map, key, value, duration) {
        if (!map.has(key)) {
            map.set(key, [{'activity': value, 'duration': duration}]);
            return;
        }
        map.set(key, [{'activity': value, 'duration': duration}, ...map.get(key)]);
    }
}
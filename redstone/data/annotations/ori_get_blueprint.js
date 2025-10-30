import mineflayer from 'mineflayer';
import { worldToBlueprint, blueprintToTask } from './redstone_tasks.js';
import fs from 'fs';
import { start } from 'repl';

const bot = mineflayer.createBot({
    host: 'localhost', // Replace with your server IP or hostname
    port: 55916,       // Replace with your server port
    username: 'andy', // Replace with your bot's username
    // password: 'your_bot_password' // Only if the server has online-mode=true
});

bot.on('spawn', async () => {
    console.log("Bot spawned. Starting blueprint check...");
    // TODO: Set the startCoord into player position. Start from south-west corner of cuboid. Set to floor.
    const startCoord = {
        x: -13, 
        y: -60, 
        z: -13,
    }
    bot.chat(`/tp andy ${startCoord.x} ${startCoord.y} ${startCoord.z}`);

    // TODO: make the offset automatic? For now annotator will calculate them themselves in Minecraft
    const yOffset = 1;
    const xOffset = 7;
    const zOffset = 4;

    const task_name = "redstone_door_iron";
    const taskFilePath = `../blueprints/level_1/${task_name}.json`;
    
    // TODO: restructure the json field
    const prompt = "Build the following redstone structure"

    setTimeout(async () => {
        let task_blueprint = await worldToBlueprint(startCoord, yOffset, xOffset, zOffset, bot);

        for (let i = 0; i < task_blueprint.levels.length; i++) {
            // Perform operations on each level
            const level = task_blueprint.levels[i];
            console.log("Level coordinates:", level.coordinates);
            const new_coordinates = [level.coordinates[0], -60 + i, level.coordinates[2]];
            level.coordinates = new_coordinates;
            console.log("New coordinates:", level.coordinates);
        }
        console.log("Blueprint generated:", task_blueprint.levels[0].coordinates);

        // TODO: remove legacy json fields (e.g num_agent)
        const task = blueprintToTask(task_blueprint, 1, prompt);
        const task_collection = {}
        task_collection[task_name] = task;

        fs.writeFileSync(taskFilePath, JSON.stringify(task_collection, null, 2), (err) => {
            if (err) {
                console.error('Error writing task to file:', err);
            } else {
                console.log('Task dumped to file successfully.');
            }
        });
    }, 5000); // Delay of 5 seconds (5000 milliseconds)
});

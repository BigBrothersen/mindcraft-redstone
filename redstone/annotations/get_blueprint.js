import mineflayer from 'mineflayer';
import { worldToBlueprint, blueprintToTask } from './redstone_tasks.js';
import fs from 'fs';
import { start } from 'repl';

const playerName = 'Sirlol';

const bot = mineflayer.createBot({
    host: 'localhost', // Replace with your server IP or hostname
    port: 55916,       // Replace with your server port
    username: 'andy', // Replace with your bot's username
    // password: 'your_bot_password' // Only if the server has online-mode=true
});

const directory = 'data/blueprints/level_1';
const filename = 'redstone_door.json';
const task_name = "redstone_door_iron";
const prompt = "Build the following redstone structure"

bot.on('spawn', async () => {
    bot.chat(`/tp @s ${playerName}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const currentPos = bot.entity.position;
    const startCoord = {
        x: Math.floor(currentPos.x), 
        y: Math.floor(currentPos.y), 
        z: Math.floor(currentPos.z),
    };
    
    
    console.log(`Starting from position: ${startCoord.x}, ${startCoord.y}, ${startCoord.z}`);
    bot.chat(`/tp andy ${startCoord.x} ${startCoord.y} ${startCoord.z}`);

    // TODO: make the offset automatic? For now annotator will calculate them themselves in Minecraft
    const yOffset = 3;
    const xOffset = 6;
    const zOffset = 6;

    // const taskFilePath = '../blueprints/level_1/redstone_door.json';

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

        const task = blueprintToTask(task_blueprint, prompt, 1);
        const task_collection = {}
        task_collection[task_name] = task;

        try {
            // ✅ Create directory if it doesn't exist
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory, { recursive: true });
                console.log(`Created directory: ${directory}`);
            }
            
            fs.writeFileSync(`${directory}/${filename}`, JSON.stringify(task_collection, null, 2));
            console.log('Task dumped to file successfully.');
        } catch (err) {
            console.error('Error writing task to file:', err);
        }
    }, 5000);
});

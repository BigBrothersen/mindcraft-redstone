import mineflayer from 'mineflayer';
import { worldToBlueprint, blueprintToTask } from './redstone_tasks.js';
import fs from 'fs';

const PLAYER_NAME = "Sirlol" 
const CURRENT_LEVEL = "level_1"

const bot = mineflayer.createBot({
    host: 'localhost',
    port: 55916,
    username: 'andy',
});

// TODO
// Create setupState value
// Create promt command
// Create particle effect
// Combine two file into one (blueprint and actions)

// Create setupState value

// Store setup state
// Store setup state and boundary data
bot.anchorPos = null;
bot.taskName = "Empty";
bot.setupState = 'waiting';
bot.boundaryData = null; // Store boundary info for !g command

showHelp()

bot.on('chat', async (username, message) => {
    // Only process commands from PLAYER_NAME (you)
    if (username !== PLAYER_NAME) return;
    const player = bot.players[PLAYER_NAME]?.entity;

    // Set task name command
    if (message.startsWith('!n ')) {
        const newTaskName = message.replace('!n ', '').trim();
        if (newTaskName) {
            // Convert to lowercase and replace spaces with underscores
            bot.taskName = newTaskName.toLowerCase().replace(/\s+/g, '_');
            bot.chat(`✅ Task name set to: "${bot.taskName}"`);
        } else {
            bot.chat("❌ Please provide a task name: '!n {your_task_name}'");
        }
        return;
    }

    // Set anchor command
    if (message === '!sa') {
        // Get player's position
        if (!player) {
            bot.chat("❌ I can't see you! Make sure you're nearby.");
            return;
        }
        
        const pos = player.position;
        bot.anchorPos = {
            x: Math.floor(pos.x),
            y: Math.floor(pos.y),
            z: Math.floor(pos.z)
        };
        
        console.log(`Anchor set at position: ${bot.anchorPos.x}, ${bot.anchorPos.y}, ${bot.anchorPos.z}`);
        bot.chat(`✅ Anchor set at position: ${bot.anchorPos.x}, ${bot.anchorPos.y}, ${bot.anchorPos.z}`);
        bot.setupState = 'anchor';
    
    // Set boundary command 
    } else if (message === '!sb') {
        if (bot.setupState !== 'anchor') {
            bot.chat("❌ Please set anchor first with '!sa'!");
            return;
        }
        
        const player = bot.players[PLAYER_NAME]?.entity;
        if (!player) {
            bot.chat("❌ I can't see you! Make sure you're nearby.");
            return;
        }
        
        const currentCoord = {
            x: Math.floor(player.position.x),
            y: Math.floor(player.position.y),
            z: Math.floor(player.position.z)
        };
        
        // Calculate boundary coordinates
        const startCoord = {
            x: Math.min(bot.anchorPos.x, currentCoord.x),
            y: Math.min(bot.anchorPos.y, currentCoord.y),
            z: Math.min(bot.anchorPos.z, currentCoord.z)
        };
        
        const endCoord = {
            x: Math.max(bot.anchorPos.x, currentCoord.x),
            y: Math.max(bot.anchorPos.y, currentCoord.y), 
            z: Math.max(bot.anchorPos.z, currentCoord.z)
        };
        
        // Calculate sizes
        const xSize = endCoord.x - startCoord.x + 1;
        const ySize = endCoord.y - startCoord.y + 1;
        const zSize = endCoord.z - startCoord.z + 1;
        
        // Store boundary data for later use
        bot.boundaryData = {
            startCoord: startCoord,
            endCoord: endCoord,
            xSize: xSize,
            ySize: ySize,
            zSize: zSize
        };
        
        console.log(`Boundary set: ${xSize}x${ySize}x${zSize} from ${startCoord.x},${startCoord.y},${startCoord.z} to ${endCoord.x},${endCoord.y},${endCoord.z}`);
        bot.chat(`✅ Boundary set: ${xSize}x${ySize}x${zSize} blocks`);
        bot.chat(`From: ${startCoord.x},${startCoord.y},${startCoord.z} to ${endCoord.x},${endCoord.y},${endCoord.z}`);
        
        bot.setupState = "finish";
        
    // Generate blueprint command
    } else if (message === '!g') {
        if (bot.setupState === "finish" && bot.boundaryData) {
            // Show current status
            showStatus(getPlayerPosition(player));

            // Remove the particle effects (if any)

            // Generate the blueprint using stored boundary data
            const { startCoord, ySize, xSize, zSize } = bot.boundaryData;
            await generateBlueprint(startCoord, ySize, xSize, zSize);
            bot.chat(`✅ Blueprint "${bot.taskName}" generated successfully!`);
            
            // Reset the setupState
            bot.setupState = "waiting";
            bot.boundaryData = null; // Clear boundary data
        } else {
            bot.chat(`❌ Cannot generate blueprint "${bot.taskName}"`);
            if (bot.setupState !== "finish") {
                bot.chat("Please complete the setup: !sa -> !sb");
            } else if (!bot.boundaryData) {
                bot.chat("Boundary data missing. Please set boundary again with !sb");
            }
        }
    // Set status command
    } else if (message === '!s' || message === '!status') {
        showStatus(getPlayerPosition(player));
    // Set exit command
    } else if (message === '!exit' || message === '!quit') {
        bot.chat("Blueprint Scanner Exiting. Goodbye!");
        console.log("Blueprint scanner shutting down by user request...");
        // Give time for the chat message to send
        setTimeout(() => {
            bot.quit();
            process.exit(0);
        }, 1000);
    } else if (message === '!help' || message === '!h') {
        showHelp();
    }
});

async function generateBlueprint(startCoord, ySize, xSize, zSize) {
    try {
        bot.chat("🔄 Scanning world blocks and generating blueprint...");
        
        // CORE: Scan the actual world blocks and generate blueprint
        let task_blueprint = await worldToBlueprint(startCoord, ySize, xSize, zSize, bot);

        if (!task_blueprint || !task_blueprint.levels) {
            throw new Error('Blueprint generation failed - no levels found');
        }

        // Adjust level coordinates to match the actual scanned area
        for (let i = 0; i < task_blueprint.levels.length; i++) {
            const level = task_blueprint.levels[i];
            const new_coordinates = [level.coordinates[0], startCoord.y + i, level.coordinates[2]];
            level.coordinates = new_coordinates;
            console.log(`Level ${i} coordinates:`, level.coordinates);
        }

        console.log("Blueprint generated successfully with", task_blueprint.levels.length, "levels");
        bot.chat(`✅ World scanned! Found ${task_blueprint.levels.length} levels`);

        // Save to file using the dynamic task name
        const taskFilePath = `./data/blueprints/${CURRENT_LEVEL}/${bot.taskName}.json`;
        const prompt = "Build the following redstone structure";
        
        // Convert blueprint to task format (same as original)
        const task = blueprintToTask(task_blueprint, prompt, 1);
        const task_collection = {};
        task_collection[bot.taskName] = task;

        fs.writeFileSync(taskFilePath, JSON.stringify(task_collection, null, 2));
        bot.chat(`Blueprint saved to: ${taskFilePath}`);
        
        // Show what was found
        let totalBlocks = 0;
        task_blueprint.levels.forEach(level => {
            totalBlocks += level.blocks ? level.blocks.length : 0;
        });
        bot.chat(`Total blocks scanned: ${totalBlocks}`);
        
        // Reset for next scan
        bot.anchorPos = null;
        bot.setupState = 'waiting';
        bot.boundaryData = null;
        bot.chat("Blueprint creation completed! Ready for next scan.");
        
    } catch (error) {
        console.error('Error generating blueprint:', error);
        bot.chat(`❌ Error: ${error.message}`);
        bot.chat("Check console for detailed error information");
    }
}

function getPlayerPosition(player) {
    let playerPos = 'Unknown';
    if (player) {
        playerPos = `X Y Z: ${Math.floor(player.position.x)}, ${Math.floor(player.position.y)}, ${Math.floor(player.position.z)}`;
    }
    return playerPos;
}

function showStatus(playerPos) {
    bot.chat(`Current status:`);
    bot.chat(`-  Task name: "${bot.taskName}"`);
    bot.chat(`-  Your position: ${playerPos}`);
    bot.chat(`-  Setup state: ${bot.setupState}`);
    if (bot.setupState === 'anchor' || bot.setupState === 'finish') {
        bot.chat(`-  Anchor: ${bot.anchorPos.x}, ${bot.anchorPos.y}, ${bot.anchorPos.z}`);
    } else {
        bot.chat(`-  Anchor: Not set`);
    }
    if (bot.setupState === 'finish' && bot.boundaryData) {
        const { startCoord, endCoord, xSize, ySize, zSize } = bot.boundaryData;
        bot.chat(`-  Boundary: ${xSize}x${ySize}x${zSize} blocks`);
        bot.chat(`-  From: ${startCoord.x},${startCoord.y},${startCoord.z}`);
        bot.chat(`-  To: ${endCoord.x},${endCoord.y},${endCoord.z}`);
    } else {
        bot.chat(`-  Boundary: Not set`);
    }
}

function showHelp() {
    bot.chat("BLUEPRINT SCANNER HELP:");
    bot.chat("1. '!n {your_task_name}' - Set the blueprint filename");
    bot.chat("2. '!sa' - Stand at one corner and set it as the starting point");
    bot.chat("3. '!sb' - Stand at the opposite corner to define the scan area");
    bot.chat("4. '!s' or '!status' - Check your current coordinates and status");
    bot.chat("5. '!g' - Generate the Blueprint");
    bot.chat("6. '!exit' or '!quit' - Shut down the blueprint scanner");
    bot.chat("7. '!h' or '!help' - Show all possible chat command");
}

bot.on('spawn', async () => {
    console.log("Bot spawned. Ready for blueprint setup!");
    bot.chat("🔧 Blueprint scanner ready for you! :)");
    showHelp();
    bot.chat(`Current task name: "${bot.taskName}"`);
});

bot.on('error', (err) => {
    console.error('Bot error:', err);
});

bot.on('end', () => {
    console.log('Bot disconnected');
    console.log('You can restart the scanner with: node get_blueprint.js');
});
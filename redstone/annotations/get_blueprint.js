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

// Store setup state
bot.anchorPos = null;
bot.taskName = "redstone_door_iron";
bot.setupState = 'waiting';

bot.on('chat', async (username, message) => {
    // Only process commands from PLAYER_NAME (you)
    if (username !== PLAYER_NAME) return;

    // Set task name command
    if (message.startsWith('name ')) {
        const newTaskName = message.replace('name ', '').trim();
        if (newTaskName) {
            // Convert to lowercase and replace spaces with underscores
            bot.taskName = newTaskName.toLowerCase().replace(/\s+/g, '_');
            bot.chat(`✅ Task name set to: "${bot.taskName}"`);
        } else {
            bot.chat("❌ Please provide a task name: 'name your_task_name'");
        }
        return;
    }

    if (message === 'set anchor') {
        // Get player's position
        const player = bot.players[PLAYER_NAME]?.entity;
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
        
        console.log(`Anchor set at your position: ${bot.anchorPos.x}, ${bot.anchorPos.y}, ${bot.anchorPos.z}`);
        bot.chat(`✅ Anchor set at YOUR position: ${bot.anchorPos.x}, ${bot.anchorPos.y}, ${bot.anchorPos.z}`);
        bot.chat(`Now walk to the opposite corner and type 'set bounds'`);
        bot.setupState = 'anchor_set';
        
    } else if (message === 'set bounds') {
        if (!bot.anchorPos) {
            bot.chat("❌ Please set anchor first with 'set anchor'!");
            return;
        }
        
        // Get Player's current position
        const player = bot.players[PLAYER_NAME]?.entity;
        if (!player) {
            bot.chat("❌ I can't see you! Make sure you're nearby.");
            return;
        }
        
        const currentPos = player.position;
        const currentCoord = {
            x: Math.floor(currentPos.x),
            y: Math.floor(currentPos.y),
            z: Math.floor(currentPos.z)
        };
        
        // Calculate the bounding box
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
        
        // Calculate sizes (offsets for the scanning function)
        const ySize = endCoord.y - startCoord.y;
        const xSize = endCoord.x - startCoord.x;
        const zSize = endCoord.z - startCoord.z;
        
        console.log(`Scanning area: ${xSize}x${ySize}x${zSize} from ${startCoord.x},${startCoord.y},${startCoord.z}`);
        bot.chat(`📐 Scanning area: ${xSize}x${ySize}x${zSize} blocks`);
        bot.chat(`📍 From: ${startCoord.x},${startCoord.y},${startCoord.z} to ${endCoord.x},${endCoord.y},${endCoord.z}`);
        
        // Generate the blueprint - CORE FUNCTIONALITY
        await generateBlueprint(startCoord, ySize, xSize, zSize);
        
    } else if (message === 'cancel') {
        bot.anchorPos = null;
        bot.setupState = 'waiting';
        bot.chat("❌ Setup cancelled.");
        
    } else if (message === 'status') {
        const player = bot.players[PLAYER_NAME]?.entity;
        const yourPos = player ? 
            `${Math.floor(player.position.x)}, ${Math.floor(player.position.y)}, ${Math.floor(player.position.z)}` : 
            'Unknown';
            
        bot.chat(`📊 Current status:`);
        bot.chat(`- Task name: "${bot.taskName}"`);
        bot.chat(`- Your position: ${yourPos}`);
        bot.chat(`- Setup state: ${bot.setupState}`);
        if (bot.anchorPos) {
            bot.chat(`- Anchor: ${bot.anchorPos.x}, ${bot.anchorPos.y}, ${bot.anchorPos.z}`);
        } else {
            bot.chat(`- Anchor: Not set`);
        }
    } else if (message === 'whereami') {
        const player = bot.players[PLAYER_NAME]?.entity;
        if (player) {
            const pos = player.position;
            bot.chat(`📍 Your position: ${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)}`);
        } else {
            bot.chat("❌ I can't see you! Are you nearby?");
        }
    } else if (message === 'exit' || message === 'quit') {
        bot.chat("👋 Shutting down blueprint scanner. Goodbye!");
        console.log("Blueprint scanner shutting down by user request...");
        // Give time for the chat message to send
        setTimeout(() => {
            bot.quit();
            process.exit(0);
        }, 1000);
    } else if (message === 'help') {
        showHelp();
    }
});

async function generateBlueprint(startCoord, ySize, xSize, zSize) {
    try {
        bot.chat("🔄 Scanning world blocks and generating blueprint...");
        
        // CORE: Scan the actual world blocks and generate blueprint
        // This calls the same function as the original script
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
        const task = blueprintToTask(task_blueprint, 1, prompt);
        const task_collection = {};
        task_collection[bot.taskName] = task;

        fs.writeFileSync(taskFilePath, JSON.stringify(task_collection, null, 2));
        bot.chat(`💾 Blueprint saved to: ${taskFilePath}`);
        
        // Show what was found
        let totalBlocks = 0;
        task_blueprint.levels.forEach(level => {
            totalBlocks += level.blocks ? level.blocks.length : 0;
        });
        bot.chat(`📊 Total blocks scanned: ${totalBlocks}`);
        
        // Reset for next scan
        bot.anchorPos = null;
        bot.setupState = 'waiting';
        bot.chat("🎉 Blueprint creation completed! Ready for next scan.");
        
    } catch (error) {
        console.error('Error generating blueprint:', error);
        bot.chat(`❌ Error: ${error.message}`);
        bot.chat("💡 Check console for detailed error information");
    }
}

function showHelp() {
    bot.chat("🔧 BLUEPRINT SCANNER HELP:");
    bot.chat("1. 'name {structure_name}' - Set the blueprint filename");
    bot.chat("   Example: 'name redstone door' becomes 'redstone_door.json'");
    bot.chat("2. 'set anchor' - Stand at one corner and set it as the starting point");
    bot.chat("3. 'set bounds' - Stand at the opposite corner to define the scan area");
    bot.chat("4. 'whereami' - Check your current coordinates");
    bot.chat("5. 'status' - View current scanner settings");
    bot.chat("6. 'cancel' - Cancel current setup");
    bot.chat("7. 'exit' or 'quit' - Shut down the blueprint scanner");
    bot.chat("");
    bot.chat("📝 HOW TO SCAN:");
    bot.chat("- First, use 'name' to set the output filename");
    bot.chat("- Stand at one corner of the structure, type 'set anchor'");
    bot.chat("- Walk to the opposite corner, type 'set bounds'");
    bot.chat("- The bot will automatically scan all blocks and save the blueprint!");
    bot.chat("");
    bot.chat("💡 TIP: For redstone circuits, include all levels (ground + blocks above)");
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
import mineflayer from 'mineflayer';
import { worldToBlueprint, blueprintToTask } from './redstone_tasks.js';
import fs from 'fs';

const PLAYER_NAME = "Sirlol" 
const CURRENT_LEVEL = "level_1"
const PORT_NUMBER = 55916

// Define setup states as constants (like enum)
const State = {
    WAITING: 'waiting',
    ANCHOR_SET: 'anchor_set',
    BOUNDARY_SET: 'boundary_set',
};

const bot = mineflayer.createBot({
    host: 'localhost',
    port: PORT_NUMBER,
    username: 'andy',
});

// Store setup state and boundary data for blueprint scanning
bot.anchorPos = null;
bot.taskName = "Empty";
bot.prompt = "Build the following redstone structure"
bot.state = State.WAITING;
bot.boundaryData = null;

// Store action recording data
bot.recording = false;
bot.actionLog = [];
bot.actionFilename = 'redstone_door.json';

// Create directories if they don't exist
const blueprintDir = `./data/blueprints/${CURRENT_LEVEL}`;
const actionDir = `./data/actions/${CURRENT_LEVEL}`;
if (!fs.existsSync(blueprintDir)) fs.mkdirSync(blueprintDir, { recursive: true });
if (!fs.existsSync(actionDir)) fs.mkdirSync(actionDir, { recursive: true });

bot.on('chat', async (username, message) => {
    if (username !== PLAYER_NAME) return;
    const player = bot.players[PLAYER_NAME]?.entity;

    // ===== BLUEPRINT SCANNER COMMANDS =====

    // Set Name command (for both blueprint and actions)
    if (message.startsWith('!n ')) {
        const newTaskName = message.replace('!n ', '').trim();
        if (newTaskName) {
            bot.taskName = newTaskName.toLowerCase().replace(/\s+/g, '_');
            bot.actionFilename = bot.taskName + '.json';
            bot.chat(`Task name set to: "${bot.taskName}" (for both blueprint and actions)`);
        } else {
            bot.chat("Please provide a task name: '!n {task_name}'");
        }
        return;
    } else if(message.startsWith('!name ')){ 
        const newTaskName = message.replace('!name ', '').trim();
        if (newTaskName) {
            bot.taskName = newTaskName.toLowerCase().replace(/\s+/g, '_');
            bot.actionFilename = bot.taskName + '.json';
            bot.chat(`Task name set to: "${bot.taskName}" (for both blueprint and actions)`);
        } else {
            bot.chat("Please provide a task name: '!name {task_name}'");
        }
        return;
    }

    // Set Prompt
    if (message.startsWith('!p ')) {
        const newPrompt = message.replace('!p ', '').trim();
        if (newPrompt){
            bot.prompt = newPrompt;
            bot.chat(`Prompt set to: "${bot.prompt}"`);
        } else {
            bot.chat("Please provide a prompt: '!p {your prompt}'");
        }
        return;
    } else if (message.startsWith('!prompt ')) {
        const newPrompt = message.replace('!prompt ', '').trim();
        if (newPrompt){
            bot.prompt = newPrompt;
            bot.chat(`Prompt set to: "${bot.prompt}"`);
        } else {
            bot.chat("Please provide a prompt: '!prompt {your prompt}'");
        }
        return;
    }

    // Set Anchor command
    if (message === '!sa') {
        // Reset boundary data if anchor is being set again
        if (bot.state === State.BOUNDARY_SET) {
            bot.boundaryData = null;
            bot.chat("Resetting boundary data since anchor is being changed...");
            bot.state = State.WAITING;
        }
        
        if (!player) {
            bot.chat("I can't see you! Make sure you're nearby.");
            return;
        }
        
        const pos = player.position;
        bot.anchorPos = {
            x: Math.floor(pos.x),
            y: Math.floor(pos.y),
            z: Math.floor(pos.z)
        };
        
        console.log(`Anchor set at position: ${bot.anchorPos.x}, ${bot.anchorPos.y}, ${bot.anchorPos.z}`);
        bot.chat(`Anchor set at position: ${bot.anchorPos.x}, ${bot.anchorPos.y}, ${bot.anchorPos.z}`);
        bot.state = State.ANCHOR_SET;
    
    // Set Boundary command
    } else if (message === '!sb') {
        // Need to Set Anchor first
        if (bot.state === State.WAITING) {
            bot.chat("Please set anchor first with '!sa'!");
            return;
        }
        
        const player = bot.players[PLAYER_NAME]?.entity;
        if (!player) {
            bot.chat("I can't see you! Make sure you're nearby.");
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
        
        // Store boundary data
        bot.boundaryData = {
            startCoord: startCoord,
            endCoord: endCoord,
            xSize: xSize,
            ySize: ySize,
            zSize: zSize
        };
        
        console.log(`Boundary set: ${xSize}x${ySize}x${zSize} from ${startCoord.x},${startCoord.y},${startCoord.z} to ${endCoord.x},${endCoord.y},${endCoord.z}`);
        bot.chat(`Boundary set: ${xSize}x${ySize}x${zSize} blocks`);
        bot.chat(`From: ${startCoord.x},${startCoord.y},${startCoord.z} to ${endCoord.x},${endCoord.y},${endCoord.z}`);
        
        bot.state = State.BOUNDARY_SET;
        
    // Cancel or Reset command (Blueprint only)
    } else if (message === '!cancel' || message === '!reset' || message === '!c' || message === '!r') {
        bot.anchorPos = null;
        bot.boundaryData = null;
        bot.state = State.WAITING;
        bot.chat("Blueprint settings reset! Ready to start over.");
        
    // Generate Blueprint command
    } else if (message === '!g' || message === '!gen') {
        if (bot.state === State.BOUNDARY_SET && bot.boundaryData) {
            showStatus(getPlayerPosition(player));

            const { startCoord, ySize, xSize, zSize } = bot.boundaryData;
            await generateBlueprint(startCoord, ySize, xSize, zSize);
            bot.chat(`Blueprint "${bot.taskName}" generated successfully!`);
            
            // Reset for next scan
            bot.state = State.WAITING;
            bot.boundaryData = null;
            bot.anchorPos = null;
        } else {
            bot.chat(`Cannot generate blueprint "${bot.taskName}"`);
            showStatus();
        }

    // ===== ACTION RECORDING COMMANDS =====

    // Start recording actions
    } else if (message === '!start' || message === '!record') {
        if (bot.recording) {
            bot.chat("Already recording actions!");
            return;
        }
        bot.recording = true;
        bot.actionLog = [];
        bot.chat("🎥 Action recording STARTED!");
        bot.chat(`Actions will be saved to: ${bot.actionFilename}`);

    // Stop recording and save actions
    } else if (message === '!stop' || message === '!stoprecord') {
        if (!bot.recording) {
            bot.chat("Not currently recording!");
            return;
        }
        bot.recording = false;
        const actionFilePath = `${actionDir}/${bot.actionFilename}`;
        fs.writeFileSync(actionFilePath, JSON.stringify(bot.actionLog, null, 2));
        bot.chat(`📁 Action recording STOPPED! Saved ${bot.actionLog.length} actions to: ${actionFilePath}`);

    // Cancel recording without saving
    } else if (message === '!cancelrecord' || message === '!cr') {
        if (bot.recording) {
            bot.recording = false;
            bot.actionLog = [];
            bot.chat("❌ Action recording CANCELLED! All actions discarded.");
        } else {
            bot.chat("Not currently recording!");
        }

    // Show recording status
    } else if (message === '!recordingstatus' || message === '!rs') {
        if (bot.recording) {
            bot.chat(`🎥 Recording ACTIVE - ${bot.actionLog.length} actions recorded`);
            bot.chat(`Saving to: ${bot.actionFilename}`);
        } else {
            bot.chat("🔴 Recording INACTIVE");
        }

    // ===== GENERAL COMMANDS =====

    // Status command
    } else if (message === '!s' || message === '!status') {
        showStatus(getPlayerPosition(player));
        
    // Show Prompt command
    } else if (message === '!sp' || message === '!showprompt') {
        bot.chat(`Current Prompt: "${bot.prompt}"`);
        
    // Exit command
    } else if (message === '!exit' || message === '!quit') {
        // Stop recording if active
        if (bot.recording) {
            const actionFilePath = `${actionDir}/${bot.actionFilename}`;
            fs.writeFileSync(actionFilePath, JSON.stringify(bot.actionLog, null, 2));
            bot.chat(`Auto-saved ${bot.actionLog.length} actions before exit`);
        }
        bot.chat("Blueprint Scanner & Action Recorder Exiting. Goodbye!");
        console.log("Scanner and recorder shutting down by user request...");
        setTimeout(() => {
            bot.quit();
            process.exit(0);
        }, 1000);
        
    } else if (message === '!help' || message === '!h') {
        showHelp();
    }
});

// ===== ACTION RECORDING EVENT HANDLERS =====

// Detect block placements and breaks
bot.on('blockUpdate', (oldBlock, newBlock) => {
    if (!bot.recording) return;
    
    // Block placed
    if (oldBlock.name === 'air' && newBlock.name !== 'air') {
        logAction({
            action: 'place_block',
            block: newBlock.name,
            position: { x: newBlock.position.x, y: newBlock.position.y, z: newBlock.position.z },
            properties: newBlock.getProperties?.() || {},
            timestamp: Date.now()
        });
    }
    // Block broken
    else if (oldBlock.name !== 'air' && newBlock.name === 'air') {
        logAction({
            action: 'break_block',
            block: oldBlock.name,
            position: { x: oldBlock.position.x, y: oldBlock.position.y, z: oldBlock.position.z },
            timestamp: Date.now()
        });
    }
});

// Detect player movement
let lastPosition = null;
bot.on('entityMoved', (entity) => {
    if (!bot.recording) return;
    if (entity.username === PLAYER_NAME) {
        // Convert to block coordinates using integers
        const currPosition = {
            x: Math.floor(entity.position.x),
            y: Math.floor(entity.position.y),
            z: Math.floor(entity.position.z)
        };
        
        // Only log if position changed significantly (at least 1 block)
        if (!lastPosition || 
            lastPosition.x !== currPosition.x || 
            lastPosition.y !== currPosition.y || 
            lastPosition.z !== currPosition.z) {
            
            lastPosition = currPosition;
            logAction({
                action: 'move_to',
                position: currPosition,
                timestamp: Date.now()
            });
        }
    }
});

// Detect interactions (lever/button usage, etc.)
bot.on('entitySwingArm', (entity) => {
    if (!bot.recording) return;
    if (entity.username === PLAYER_NAME) {
        logAction({
            action: 'interact',
            position: {
                x: Math.floor(entity.position.x),
                y: Math.floor(entity.position.y),
                z: Math.floor(entity.position.z)
            },
            timestamp: Date.now()
        });
    }
});

// ===== CORE FUNCTIONS =====

function logAction(action) {
    if (!bot.recording) return;
    bot.actionLog.push(action);
    console.log('Action recorded:', JSON.stringify(action));
}

async function generateBlueprint(startCoord, ySize, xSize, zSize) {
    try {
        bot.chat("Scanning world blocks and generating blueprint...");
        
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
        bot.chat(`World scanned! Found ${task_blueprint.levels.length} levels`);

        // Save to file using the dynamic task name
        const taskFilePath = `${blueprintDir}/${bot.taskName}.json`;
        
        // Convert blueprint to task format
        const task = blueprintToTask(task_blueprint, bot.prompt, 1);
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
        
        bot.chat("Blueprint creation completed! Ready for next scan.");
        
    } catch (error) {
        console.error('Error generating blueprint:', error);
        bot.chat(`Error: ${error.message}`);
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
    bot.chat(`=== CURRENT STATUS ===`);
    bot.chat(`Task name: "${bot.taskName}"`);
    bot.chat(`Your position: ${playerPos}`);
    bot.chat(`Prompt: "${bot.prompt}"`);
    
    // Blueprint status
    bot.chat(`--- Blueprint Scanner ---`);
    switch (bot.state) {
        case State.WAITING:
            bot.chat(`Status: Waiting for anchor setup`);
            break;
        case State.ANCHOR_SET:
            bot.chat(`Status: Anchor set, need boundary`);
            bot.chat(`Anchor: ${bot.anchorPos.x}, ${bot.anchorPos.y}, ${bot.anchorPos.z}`);
            break;
        case State.BOUNDARY_SET:
            bot.chat(`Status: Ready to generate blueprint!`);
            bot.chat(`Anchor: ${bot.anchorPos.x}, ${bot.anchorPos.y}, ${bot.anchorPos.z}`);
            if (bot.boundaryData) {
                const { startCoord, endCoord, xSize, ySize, zSize } = bot.boundaryData;
                bot.chat(`Boundary: ${xSize}x${ySize}x${zSize} blocks`);
                bot.chat(`From: ${startCoord.x},${startCoord.y},${startCoord.z}`);
                bot.chat(`To: ${endCoord.x},${endCoord.y},${endCoord.z}`);
            }
            break;
    }
    
    // Action recording status
    bot.chat(`--- Action Recorder ---`);
    if (bot.recording) {
        bot.chat(`Status: 🎥 RECORDING - ${bot.actionLog.length} actions`);
        bot.chat(`File: ${bot.actionFilename}`);
    } else {
        bot.chat(`Status: 🔴 NOT recording`);
    }
}

function showHelp() {
    bot.chat("=== BLUEPRINT SCANNER & ACTION RECORDER HELP ===");
    bot.chat("");
    bot.chat("📁 SETUP COMMANDS:");
    bot.chat("!n {name}      - Set task name (for both)");
    bot.chat("!p {prompt}    - Set blueprint prompt");
    bot.chat("!sp            - Show current prompt");
    bot.chat("");
    bot.chat("🔷 BLUEPRINT SCANNER:");
    bot.chat("!sa            - Set anchor position");
    bot.chat("!sb            - Set boundary position");
    bot.chat("!g             - Generate blueprint");
    bot.chat("!c             - Cancel blueprint setup");
    bot.chat("");
    bot.chat("🎥 ACTION RECORDER:");
    bot.chat("!start         - Start recording actions");
    bot.chat("!stop          - Stop & save actions");
    bot.chat("!cr            - Cancel recording (no save)");
    bot.chat("!rs            - Show recording status");
    bot.chat("");
    bot.chat("📊 GENERAL:");
    bot.chat("!s             - Show full status");
    bot.chat("!help          - Show this help");
    bot.chat("!exit          - Shutdown bot");
}

// ===== BOT EVENT HANDLERS =====

bot.on('spawn', async () => {
    console.log("Bot spawned. Ready for blueprint scanning and action recording!");
    bot.chat("🔧 Blueprint scanner & action recorder ready!");
    bot.chat("Use '!help' to show all available commands");
});

bot.on('error', (err) => {
    console.error('Bot error:', err);
});

bot.on('end', () => {
    console.log('Bot disconnected');
    console.log('You can restart with: node get_blueprint.js');
});
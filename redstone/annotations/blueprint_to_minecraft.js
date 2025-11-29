import mineflayer from 'mineflayer';
import fs from 'fs';
import Vec3 from 'vec3';

const bot = mineflayer.createBot({
    host: 'localhost',
    port: 55916,
    username: 'Godbot',
});

// Read and parse the blueprint
let blueprint;
try {
    const file = fs.readFileSync('./redstone/annotations/test.json', 'utf8');
    blueprint = JSON.parse(file);
    console.log('Blueprint loaded successfully');
} catch (error) {
    console.error('Error loading blueprint:', error);
    process.exit(1);
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createBlockStateString(block) {
    if (!block.properties || Object.keys(block.properties).length === 0) {
        return block.name;
    }
    
    const properties = Object.entries(block.properties)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
    
    return `${block.name}[${properties}]`;
}

async function placeBlocksFromBlueprint() {
    console.log('Starting to place blocks from blueprint...');
    
    for (const level of blueprint.levels) {
        const [baseX, baseY, baseZ] = level.coordinates;
        console.log(`Processing level ${level.level} at coordinates [${baseX}, ${baseY}, ${baseZ}]`);
        
        // Iterate through each row in the placement grid
        for (let z = 0; z < level.placement.length; z++) {
            const row = level.placement[z];
            
            // Iterate through each column in the row
            for (let x = 0; x < row.length; x++) {
                const block = row[x];
                
                // Skip air blocks
                if (block.name === 'air') {
                    continue;
                }
                
                // Calculate actual coordinates
                const actualX = baseX + x;
                const actualY = baseY;
                const actualZ = baseZ + z;
                
                // Create the block state string
                const blockState = createBlockStateString(block);
                
                // Create the setblock command
                const command = `/setblock ${actualX} ${actualY} ${actualZ} ${blockState}`;
                
                // Execute the command
                bot.chat(command);
                console.log(`Placed: ${blockState} at [${actualX}, ${actualY}, ${actualZ}]`);
                
                // Add a small delay to avoid overwhelming the server
                await wait(100);
            }
        }
        
        // Add extra delay between levels
        await wait(500);
    }
    
    console.log('All blocks placed from blueprint!');
}

bot.once('spawn', async () => {
    console.log("Godbot spawned.");
    
    // Put the bot in creative mode and teleport
    bot.chat('/gamemode creative');
    await wait(1000);
    
    // Teleport to the first level's coordinates for reference
    const firstLevel = blueprint.levels[0];
    const [x, y, z] = firstLevel.coordinates;
    bot.chat(`/tp ${x} ${y} ${z}`);
    await wait(2000);
    
    // Start placing blocks from the blueprint
    await placeBlocksFromBlueprint();
});

// Handle errors
bot.on('error', (err) => {
    console.error('Bot error:', err);
});

bot.on('end', () => {
    console.log('Bot disconnected');
});
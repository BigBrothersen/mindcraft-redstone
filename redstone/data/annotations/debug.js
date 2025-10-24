import mineflayer from 'mineflayer';
import {Vec3} from 'vec3';

function get_block_properties(x, y, z) {
    const position = new Vec3(x, y, z);
    const block = bot.blockAt(position);
    if (block) {
        console.log(`Block at ${position.toString()}:`);
        console.log(`Name: ${block.name}`);              // e.g., 'stone', 'grass_block'
        console.log(`ID: ${block.type}`);                // Numeric block ID
        console.log(`Metadata/State: ${block.metadata}`); // Numeric metadata (older versions) or block state (newer versions)
        console.log(`Hardness: ${block.hardness}`);       // How long it takes to mine
        console.log(`Light level: ${block.light}`);      // Light emitted by the block
        console.log(`Sky Light level: ${block.skyLight}`); // Light from the sky
        console.log(`Bounding Box: ${block.boundingBox}`); // e.g., 'block', 'empty'
        
        // For blocks with state (Minecraft 1.13+):
        if (block.stateId !== undefined) {
            console.log(`State ID: ${block.stateId}`);
        }
        if (block.getProperties) {
            console.log("Block States (Properties):", block.getProperties());
            // e.g., { 'axis': 'y', 'variant': 'normal' }
        }
    } else {
        console.log(`No block found at ${position.toString()}`);
    }
}

const bot = mineflayer.createBot({
    host: 'localhost', // Replace with your server IP or hostname
    port: 55916,       // Replace with your server port
    username: 'debugger', // Replace with your bot's username
    // password: 'your_bot_password' // Only if the server has online-mode=true
});

bot.on('spawn', async () => {
    console.log("Bot spawned");
    await bot.waitForChunksToLoad();
    get_block_properties(-6, -60, -9);
});

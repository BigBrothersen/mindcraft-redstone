import mineflayer from 'mineflayer';
import fs from 'fs';

const bot = mineflayer.createBot({
    host: 'localhost', // Replace with your server IP or hostname
    port: 55916,       // Replace with your server port
    username: 'andy', // Replace with your bot's username
    // password: 'your_bot_password' // Only if the server has online-mode=true
});

let recording = false;
let log = [];
let playerName = 'Sirlol'; // change this to your Minecraft username

let position = null;
const directory = 'data/actions/level_1';
let filename = 'redstone_door.json'; // Made this variable so it can be changed


function logAction(action) {
  if (!recording) return;
  // action.timestamp = Date.now();
  log.push(action);
  console.log(JSON.stringify(action));
}

bot.on('spawn', () => {
  console.log('Recorder bot spawned.');
  bot.chat('Recorder bot ready. Type !start or !stop to control recording.');
});

bot.on('chat', (username, message) => {
  if (username !== playerName) return;
  
  // Set task name command
  if (message.startsWith('!name ')) {
    const newTaskName = message.replace('!name ', '').trim();
    if (newTaskName) {
      // Convert to lowercase and replace spaces with underscores
      filename = newTaskName.toLowerCase().replace(/\s+/g, '_') + '.json';
      bot.chat(`✅ Task name set to: "${filename}"`);
    } else {
      bot.chat("❌ Please provide a task name: '!name your_task_name'");
    }
    return;
  }
  
  if (message === '!start') {
    recording = true;
    log = [];
    console.log('Recording started.');
  }
  if (message === '!stop') {
    recording = false;
    console.log('Recording stopped.');
    fs.writeFileSync(`${directory}/${filename}`, JSON.stringify(log, null, 2));
    console.log(`Actions saved to ${directory}/${filename}`);
  }
});

// Detect block placements and breaks
bot.on('blockUpdate', (oldBlock, newBlock) => {
  if (!recording) return;
  // block placed
  if (oldBlock.name === 'air' && newBlock.name !== 'air') {
    logAction({
      action: 'place_block',
      block: newBlock.name,
      position: newBlock.position,
      properties: newBlock.getProperties?.() || {},
    });
  }
  // block broken
  else if (oldBlock.name !== 'air' && newBlock.name === 'air') {
    logAction({
      action: 'break_block',
      block: oldBlock.name,
      position: oldBlock.position,
    });
  }
});

// Detect player movement
bot.on('entityMoved', (entity) => {
  if (!recording) return;
  if (entity.username === playerName) {
    // Convert to block coordinates using integers
    let curr_position = {
      x: Math.floor(entity.position.x),
      y: Math.floor(entity.position.y),
      z: Math.floor(entity.position.z)
    };
    if (!position || position.x !== curr_position.x || position.y !== curr_position.y || position.z !== curr_position.z) {
      position = curr_position;
      logAction({
        action: 'move_to',
        position: curr_position,
      });
    }
  }
});

// Detect lever/button usage or other interactions
bot.on('entitySwingArm', (entity) => {
  if (!recording) return;
  if (entity.username === playerName) {
    logAction({
      action: 'interact',
      position: entity.position.floored(),
    });
  }
});
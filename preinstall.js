#!/usr/bin/env node
// Cross-platform preinstall script
const fs = require('fs');
const path = require('path');

// Remove lock files that shouldn't exist
const filesToRemove = ['package-lock.json', 'yarn.lock'];
for (const file of filesToRemove) {
  const filepath = path.join(__dirname, file);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    console.log(`Removed ${file}`);
  }
}

// Check that pnpm is being used
const userAgent = process.env.npm_config_user_agent;
if (!userAgent || !userAgent.includes('pnpm/')) {
  console.error('Please use pnpm instead of npm or yarn');
  process.exit(1);
}

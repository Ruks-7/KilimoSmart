#!/usr/bin/env node

// KilimoSmart Test Runner

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 KilimoSmart Test Suite\n');
console.log('================================\n');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function runCommand(command, description) {
  console.log(`${colors.blue}Running: ${description}${colors.reset}`);
  console.log(`${colors.yellow}Command: ${command}${colors.reset}\n`);
  
  try {
    execSync(command, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, 'backend')
    });
    console.log(`${colors.green}✓ ${description} passed${colors.reset}\n`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ ${description} failed${colors.reset}\n`);
    return false;
  }
}

async function main() {
  let allPassed = true;
  
  // Check if dependencies are installed
  console.log('Checking dependencies...\n');
  const fs = require('fs');
  const backendNodeModules = path.join(__dirname, 'backend', 'node_modules');
  
  if (!fs.existsSync(backendNodeModules)) {
    console.log(`${colors.yellow}Installing backend dependencies...${colors.reset}\n`);
    try {
      execSync('npm install', {
        stdio: 'inherit',
        cwd: path.join(__dirname, 'backend')
      });
    } catch (error) {
      console.error(`${colors.red}Failed to install dependencies${colors.reset}`);
      process.exit(1);
    }
  }

  // Run unit tests
  console.log('\n📦 Running Unit Tests...\n');
  const unitTestsPassed = runCommand(
    'npm run test:unit',
    'Unit Tests'
  );
  allPassed = allPassed && unitTestsPassed;

  // Run integration tests
  console.log('\n🔗 Running Integration Tests...\n');
  const integrationTestsPassed = runCommand(
    'npm run test:integration',
    'Integration Tests'
  );
  allPassed = allPassed && integrationTestsPassed;

  // Print summary
  console.log('\n================================');
  console.log('Test Summary\n');
  
  if (allPassed) {
    console.log(`${colors.green}✓ All tests passed!${colors.reset}`);
    console.log('\n✨ Your application is ready for deployment!\n');
    process.exit(0);
  } else {
    console.log(`${colors.red}✗ Some tests failed${colors.reset}`);
    console.log('\n⚠️  Please fix the failing tests before deploying.\n');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}Error running tests:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { runCommand };

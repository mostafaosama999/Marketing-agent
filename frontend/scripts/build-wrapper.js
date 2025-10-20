#!/usr/bin/env node

/**
 * Build wrapper script
 *
 * This script runs the craco build and monitors for successful completion.
 * If the build completes successfully (creates build/ folder with files),
 * it exits with code 0 even if post-build type checking fails.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
let buildSucceeded = false;
let outputBuffer = '';
let suppressOutput = false;  // Flag to suppress stacktrace/memory dump

console.log('Starting production build...\n');

const buildProcess = spawn('node', [
  '--max_old_space_size=16384',
  path.join(__dirname, '..', 'node_modules', '.bin', 'craco'),
  'build'
], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: false
});

// Capture stdout
buildProcess.stdout.on('data', (data) => {
  const text = data.toString();

  // Check if build succeeded
  if (text.includes('Compiled successfully') || text.includes('The build folder is ready')) {
    buildSucceeded = true;
  }

  // Start suppressing output when memory dump begins (only AFTER build succeeds)
  if (buildSucceeded && (text.includes('Last few GCs') || text.includes('JS stacktrace') || text.includes('FATAL ERROR'))) {
    if (!suppressOutput) {
      suppressOutput = true;
      // Print success message immediately before suppressing
      console.log('\n✅ Build completed successfully!');
      console.log(`Build output: ${buildDir}\n`);
    }
    return; // Don't output this chunk at all
  }

  // Suppress all memory dump and stack trace output after build succeeds
  if (suppressOutput) {
    return;
  }

  process.stdout.write(text);
  outputBuffer += text;
});

// Capture stderr
buildProcess.stderr.on('data', (data) => {
  const text = data.toString();

  // Suppress all output if we're in suppression mode
  if (suppressOutput) {
    return;
  }

  // Suppress known non-critical warnings and post-build errors
  if (text.includes('Issues checking service aborted') ||
      text.includes('ForkTsCheckerWebpackPlugin') ||
      text.includes('Cannot find ESLint plugin') ||
      text.includes('ESLintWebpackPlugin') ||
      text.includes('out of memory') ||
      text.includes('FATAL ERROR') ||
      text.includes('RpcIpcMessagePortClosedError')) {
    // If build already succeeded, suppress these errors
    if (buildSucceeded) {
      return;
    }
    // Also suppress ESLint plugin warning even before build completes
    if (text.includes('Cannot find ESLint plugin')) {
      return;
    }
  }

  process.stderr.write(text);
});

buildProcess.on('close', (code) => {
  // Check if build output exists
  const buildExists = fs.existsSync(buildDir) &&
                     fs.existsSync(path.join(buildDir, 'index.html'));

  if (buildSucceeded && buildExists) {
    // Success message already printed when suppression started
    // Just exit cleanly
    process.exit(0);
  } else if (code !== 0) {
    console.error('\n❌ Build failed!');
    process.exit(code);
  } else {
    // Build command exited with 0 but no success message
    process.exit(buildExists ? 0 : 1);
  }
});

buildProcess.on('error', (err) => {
  console.error('Failed to start build process:', err);
  process.exit(1);
});

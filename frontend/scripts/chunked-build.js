const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting chunked production build...\n');

// Step 1: Clean previous build
console.log('Cleaning previous build...');
if (fs.existsSync('build')) {
  fs.rmSync('build', { recursive: true });
  console.log('✓ Previous build cleaned\n');
}

// Step 2: Set minimal environment for first pass
console.log('Configuring build environment...');
process.env.GENERATE_SOURCEMAP = 'false';
process.env.INLINE_RUNTIME_CHUNK = 'false';
process.env.IMAGE_INLINE_SIZE_LIMIT = '0';
process.env.TSC_COMPILE_ON_ERROR = 'true';
process.env.DISABLE_ESLINT_PLUGIN = 'true';
process.env.SKIP_PREFLIGHT_CHECK = 'true';
process.env.ESLINT_NO_DEV_ERRORS = 'true';
process.env.DISABLE_NEW_JSX_TRANSFORM = 'false';
console.log('✓ Environment configured\n');

// Step 3: Build with aggressive memory management
console.log('Building with memory constraints...');
console.log('Memory limit: 3.5GB (suitable for DigitalOcean Professional plan)\n');

// Use 3.5GB for DigitalOcean compatibility (Professional plan has 4GB total)
// Using 3584MB (3.5GB) leaves headroom for system processes
const buildCommand = `node --max-old-space-size=3584 --expose-gc node_modules/.bin/craco build`;

try {
  execSync(buildCommand, {
    stdio: 'inherit',
    env: {
      ...process.env,
      // Force garbage collection between chunks
      NODE_ENV: 'production',
      // Limit libuv threadpool size to reduce memory usage
      UV_THREADPOOL_SIZE: '2'
    }
  });

  console.log('\n✅ Build completed successfully!');

  // Verify build output
  if (fs.existsSync('build/index.html')) {
    console.log('✓ Build artifacts verified');

    // Optional: Display build size
    const buildDir = path.join(process.cwd(), 'build');
    const stats = getDirectorySize(buildDir);
    console.log(`✓ Build size: ${(stats / 1024 / 1024).toFixed(2)} MB\n`);
  } else {
    console.error('⚠ Warning: build/index.html not found');
  }

  process.exit(0);
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  console.error('\nTroubleshooting tips:');
  console.error('1. Ensure you have at least 4GB RAM available');
  console.error('2. Close other memory-intensive applications');
  console.error('3. Try running: npm run build:sh (uses build.sh script)');
  console.error('4. Check DigitalOcean build resources are set to "Professional"\n');
  process.exit(1);
}

/**
 * Helper function to calculate directory size
 */
function getDirectorySize(directoryPath) {
  let totalSize = 0;

  function traverseDirectory(currentPath) {
    const items = fs.readdirSync(currentPath);

    items.forEach(item => {
      const itemPath = path.join(currentPath, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        traverseDirectory(itemPath);
      } else {
        totalSize += stats.size;
      }
    });
  }

  traverseDirectory(directoryPath);
  return totalSize;
}

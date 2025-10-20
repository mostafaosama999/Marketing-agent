module.exports = {
  // Disable TypeScript and ESLint checking to prevent memory issues
  // You can still run type checking separately with: npx tsc --noEmit
  typescript: {
    enableTypeChecking: false
  },
  eslint: {
    enable: false,  // Disable ESLint - too memory intensive
  },
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Only remove plugins in production to save memory
      if (env === 'production') {
        webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
          const pluginName = plugin.constructor.name;
          // Remove both TypeScript checker and ESLint plugin in production
          if (pluginName === 'ForkTsCheckerWebpackPlugin' ||
              pluginName === 'ESLintWebpackPlugin') {
            console.log(`Removing ${pluginName} to save memory`);
            return false;
          }
          return true;
        });

        // CRITICAL: Disable caching in production to save memory
        // Caching stores intermediate build results in memory
        webpackConfig.cache = false;
      }

      // Only apply memory optimizations in production
      if (env === 'production') {
        // Disable performance hints to save memory
        webpackConfig.performance = {
          hints: false,
          maxAssetSize: 512000,
          maxEntrypointSize: 512000
        };

        // Disable module concatenation to reduce memory
        // Module concatenation merges modules which uses more memory
        if (webpackConfig.optimization) {
          webpackConfig.optimization.concatenateModules = false;

          // CRITICAL: Use deterministic IDs to save memory
          // Named IDs use more memory than deterministic numerical IDs
          webpackConfig.optimization.moduleIds = 'deterministic';
          webpackConfig.optimization.chunkIds = 'deterministic';

          // CRITICAL: Reduce chunk splitting to save memory
          // Fewer chunks = less memory overhead during compilation
          webpackConfig.optimization.splitChunks = {
            chunks: 'all',
            maxInitialRequests: 5,     // Limit initial requests
            maxAsyncRequests: 5,        // Limit async requests
            cacheGroups: {
              // Single vendor bundle instead of multiple
              defaultVendors: {
                test: /[\\/]node_modules[\\/]/,
                priority: -10,
                reuseExistingChunk: true,
                name: 'vendors'  // All vendor code in one chunk
              },
              default: {
                minChunks: 2,
                priority: -20,
                reuseExistingChunk: true
              }
            }
          };
        }
      }

      // Optimize for production builds
      if (env === 'production') {
        // Disable source maps to save memory (huge memory saver)
        webpackConfig.devtool = false;

        // CRITICAL: Single-threaded minification to reduce memory
        // Parallel minification uses more memory
        if (webpackConfig.optimization.minimizer) {
          webpackConfig.optimization.minimizer.forEach(minimizer => {
            if (minimizer.constructor.name === 'TerserPlugin') {
              minimizer.options.parallel = false;  // CRITICAL: No parallelism
              minimizer.options.terserOptions = {
                compress: {
                  passes: 1,  // Single optimization pass (faster, less memory)
                  pure_funcs: ['console.log', 'console.debug']  // Remove console statements
                },
                mangle: true,  // Shorten variable names
                output: {
                  comments: false  // Remove all comments
                }
              };
            }
          });
        }

        // Disable stats to save memory
        webpackConfig.stats = 'errors-only';

        // CRITICAL: Force garbage collection after compilation
        // This helps clean up memory between webpack compilation phases
        webpackConfig.plugins.push({
          apply: (compiler) => {
            compiler.hooks.done.tap('ClearModuleCache', () => {
              if (global.gc) {
                console.log('Forcing garbage collection...');
                global.gc();
              }
            });
          }
        });
      }

      return webpackConfig;
    }
  }
};

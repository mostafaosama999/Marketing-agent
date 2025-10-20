module.exports = {
  // Completely disable TypeScript checking during build to save memory
  // TypeScript errors will still be caught during development (npm start)
  typescript: {
    enableTypeChecking: false
  },
  eslint: {
    enable: false,  // Disable ESLint during build
  },
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Completely remove ForkTsCheckerWebpackPlugin and ESLintWebpackPlugin
      webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
        const pluginName = plugin.constructor.name;
        // Remove both TypeScript checker and ESLint plugin
        if (pluginName === 'ForkTsCheckerWebpackPlugin' ||
            pluginName === 'ESLintWebpackPlugin') {
          console.log(`Removing ${pluginName} to save memory`);
          return false;
        }
        return true;
      });

      // Disable performance hints to save memory
      webpackConfig.performance = {
        hints: false,
        maxAssetSize: 512000,
        maxEntrypointSize: 512000
      };

      // Disable module concatenation to reduce memory
      if (webpackConfig.optimization) {
        webpackConfig.optimization.concatenateModules = false;
      }

      // Optimize for production builds
      if (env === 'production') {
        // Disable source maps to save memory
        webpackConfig.devtool = false;

        // Reduce parallelism to save memory
        if (webpackConfig.optimization.minimizer) {
          webpackConfig.optimization.minimizer.forEach(minimizer => {
            if (minimizer.constructor.name === 'TerserPlugin') {
              minimizer.options.parallel = 1;  // Single process to minimize memory
              if (minimizer.options.terserOptions) {
                minimizer.options.terserOptions.compress = {
                  ...minimizer.options.terserOptions.compress,
                  passes: 1  // Reduce optimization passes
                };
              }
            }
          });
        }

        // Disable stats to save memory
        webpackConfig.stats = 'errors-only';
      }

      return webpackConfig;
    }
  }
};

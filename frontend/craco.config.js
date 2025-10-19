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
      // Completely remove all checking plugins - no TypeScript or ESLint checking during build
      webpackConfig.plugins = webpackConfig.plugins.filter(
        plugin => {
          const name = plugin.constructor.name;
          return name !== 'ForkTsCheckerWebpackPlugin' &&
                 name !== 'ESLintWebpackPlugin';
        }
      );

      // Disable performance hints to save memory
      webpackConfig.performance = {
        hints: false,
        maxAssetSize: 512000,
        maxEntrypointSize: 512000
      };

      // Optimize for production builds
      if (env === 'production') {
        // Disable source maps to save memory
        webpackConfig.devtool = false;

        // Reduce parallelism to save memory
        if (webpackConfig.optimization.minimizer) {
          webpackConfig.optimization.minimizer.forEach(minimizer => {
            if (minimizer.constructor.name === 'TerserPlugin') {
              minimizer.options.parallel = 2;  // Limit parallel processes
            }
          });
        }
      }

      return webpackConfig;
    }
  }
};

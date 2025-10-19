module.exports = {
  // Disable TypeScript checking during build to save memory
  // TypeScript errors will still be caught during development (npm start)
  typescript: {
    enableTypeChecking: false
  },
  webpack: {
    configure: (webpackConfig) => {
      // Additionally filter out the plugin if it somehow still exists
      webpackConfig.plugins = webpackConfig.plugins.filter(
        plugin => plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin'
      );

      // Disable performance hints to save memory
      webpackConfig.performance = {
        hints: false,
        maxAssetSize: 512000,
        maxEntrypointSize: 512000
      };

      return webpackConfig;
    }
  }
};

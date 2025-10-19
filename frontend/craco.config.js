module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Remove fork-ts-checker-webpack-plugin to reduce memory usage during build
      // This plugin spawns a separate process for TypeScript checking which consumes
      // significant memory. TypeScript errors will still be caught during development.
      webpackConfig.plugins = webpackConfig.plugins.filter(
        plugin => plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin'
      );

      return webpackConfig;
    }
  }
};

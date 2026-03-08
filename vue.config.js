module.exports = {
    devServer: {
      proxy: {
        '/api': {
          target: 'https://dianwei.zeblog.cc',
          changeOrigin: true,
          secure: false,
          pathRewrite: {
            '^/api': ''
          }
        }
      }
    }
  }
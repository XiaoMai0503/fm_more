module.exports = {
  publicPath: '/fm_more/',

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
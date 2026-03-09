module.exports = {
  publicPath: '/fm_more/',

  devServer: {
    proxy: {
      '/server_api': {
        target: 'https://dianwei.zeblog.cc/server_api',
        changeOrigin: true,
        secure: false,
        pathRewrite: {
          '^/server_api': ''
        }
      }
    }
  }
}
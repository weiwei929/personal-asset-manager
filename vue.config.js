const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  // Cloudflare Pages 挂在域名根路径时保持 '/'；子路径部署时改为 '/子路径/'
  publicPath: process.env.NODE_ENV === 'production' ? '/' : '/',
  productionSourceMap: false
})

import axios from 'axios'

const isDev = process.env.NODE_ENV !== 'production'

const api = axios.create({
  baseURL: isDev ? '/server_api' : 'https://dianwei.zeblog.cc/server_api',
  timeout: 15000
})

export default api

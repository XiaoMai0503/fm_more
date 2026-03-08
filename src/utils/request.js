import axios from 'axios'

const baseURL =
  process.env.NODE_ENV === 'development'
    ? '/api'
    : 'https://dianwei.zeblog.cc'

const request = axios.create({
  baseURL,
  timeout: 10000
})

export default request
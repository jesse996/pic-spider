import axios from 'axios'
import * as fs from 'fs'
// const axios = require('axios')
// const fs  = require('fs')

const getRequest = (method) => {
  return (url, data = null, options = {} as any) => {
    // @ts-ignore
    return axios({
      baseURL: 'http://localhost:8080', // 请求域名地址
      method,
      url,
      ...(method === 'POST'
        ? {
            // data: options.string ? stringify(data) : data,
            data: data,
          }
        : {}),
      params: method === 'GET' ? data : options.params,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': options.string
          ? 'application/x-www-form-urlencoded'
          : 'application/json',
        ...options.headers,
      },
      withCredentials: true,
    })
      .then((res) => {
        if (typeof res.data !== 'object') {
          console.error('数据格式响应错误:', res.data)
          return Promise.reject(res)
        }

        if (res.data.code !== 0) {
          if (res.data.code === 401) {
            window.location.href = 'login' // 登录失效跳转登录页
            return
          }
          // silent 选项，错误不提示
          if (res.data.msg && !options.silent) return Promise.reject(res.data)
        }

        return res.data.data
      })
      .catch((err) => {
        return Promise.reject(err)
      })
  }
}

export const get = getRequest('GET')

export const post = getRequest('POST')

export const getProxy = async () => {
  let { data } = await axios.get('http://localhost:5010/get')
  let p = data.proxy.split(':')
  return { host: p[0], port: Number(p[1]) }
}

let host
let port

export const downloadFile = async (url, filePath) => {
  if (!host) {
    let data = await getProxy()
    host = data.host
    port = data.port
  }
  try {
    let { data } = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      proxy: {
        host,
        port,
      },
    })
    data.pipe(fs.createWriteStream(filePath))
    //下2遍避免失败
    // data.pipe(fs.createWriteStream(filePath))
  } catch (err) {
    console.log(err)

    let data = await getProxy()
    host = data.host
    port = data.port
    await downloadFile(url, filePath)
  }
}

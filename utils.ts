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
  console.log('proxy:', data.proxy)
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
    console.log('download success')
  } catch (err) {
    console.log(getError(err))

    let data = await getProxy()
    host = data.host
    port = data.port
    await downloadFile(url, filePath)
  }
}

const getError = (error) => {
  let e = error
  if (error.response) {
    e = error.response.data // data, status, headers
    if (error.response.data && error.response.data.error) {
      e = error.response.data.error // my app specific keys override
    }
  } else if (error.message) {
    e = error.message
  } else {
    e = 'Unknown error occured'
  }
  return e
}

// get an image blob from url using fetch
let getImageBlob = function (url) {
  return new Promise(async (resolve) => {
    let resposne = await fetch(url)
    let blob = resposne.blob()
    resolve(blob)
  })
}

// convert a blob to base64
const blobToBase64 = function (blob): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    let reader = new FileReader()
    reader.onload = function () {
      let dataUrl = reader.result as ArrayBuffer
      resolve(dataUrl)
    }
    reader.readAsDataURL(blob)
  })
}

// combine the previous two functions to return a base64 encode image from url
export const getBase64Image = async function (url) {
  let blob = await getImageBlob(url)
  let base64 = await blobToBase64(blob)
  return base64
}

// USAGE :
// getBase64Image( 'http://placekitten.com/g/200/300' )
// .then( base64Image=> console.log( base64Image) );

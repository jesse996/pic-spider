import * as axios from 'axios'

const getRequest = (method: string) => {
  return (url: string, data: any = null, options: any = {}) => {
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

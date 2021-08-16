import { downloadFile, getProxy, post } from './utils'
import type { Page } from 'puppeteer-core'
import * as puppeteer from 'puppeteer-core'
import { promises } from 'fs'
const { readFile, writeFile } = promises

;(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    // args: [`--proxy-server=${proxy}`],
    defaultViewport: { width: 1000, height: 1200 },
    executablePath:
      // 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })
  const page = await browser.newPage()

  await page.setRequestInterception(true)
  page.on('request', async (interceptedRequest) => {
    //判断如果是 图片请求  就直接拦截
    if (
      interceptedRequest.url().endsWith('.png') ||
      interceptedRequest.url().endsWith('.jpg')
    )
      interceptedRequest.abort()
    //终止请求
    else interceptedRequest.continue() //弹出
  })

  await goto(page, 'https://www.jdlingyu.com/96003.html')
  await page.screenshot({path:'jd.png'})
})()

async function goto(page: Page, url: string) {
  await Promise.all([page.waitForNavigation(), page.goto(url)])
}

import { post } from './utils'
// const puppeteer = require('puppeteer-core')
import * as puppeteer from 'puppeteer-core'
;(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1000, height: 1200 },
    executablePath:
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  })
  const page = await browser.newPage()

  await page.setRequestInterception(true)
  page.on('request', (interceptedRequest) => {
    //判断如果是 图片请求  就直接拦截
    if (
      interceptedRequest.url().endsWith('.png') ||
      interceptedRequest.url().endsWith('.jpg')
    )
      interceptedRequest.abort()
    //终止请求
    else interceptedRequest.continue() //弹出
  })

  //妹子图
  // cosplay
  await page.goto('https://www.zhaimoe.com/cosplay.html')
  await page.screenshot({ path: 'example.png' })

  let offsetHeight = await page.evaluate(() => document.body.offsetHeight)

  while (true) {
    await page.waitForSelector('#more-and-more-p')
    await page.waitForTimeout(700)
    await page.tap('#more-and-more-p')
    await page.waitForTimeout(1000)

    let currOffsetHeight = await page.evaluate(() => document.body.offsetHeight)

    console.log(currOffsetHeight)

    if (currOffsetHeight == offsetHeight) {
      await page.waitForTimeout(1500)
      currOffsetHeight = await page.evaluate(() => document.body.offsetHeight)
      if (currOffsetHeight == offsetHeight) break
    }
    offsetHeight = currOffsetHeight
  }

  let list = await page.$$eval('div.container .tfga>div', (els) =>
    els.map((el: HTMLElement) => ({
      img: el.querySelector('img').getAttribute('src'),
      title: el.querySelector('h3 a').innerHTML,
      href: el.querySelector('.thumbnail').getAttribute('href'),
    }))
  )
  console.log('list length:', list.length)

  for (let item of list) {
    try {
      await Promise.all([
        page.waitForNavigation({ timeout: 10000 }),
        page.goto(`https://www.zhaimoe.com${item.href}`),
      ])
    } catch {
      continue
    }

    let imgList = await page.$$eval('#article_content p img', (els) =>
      els.map((el) => el.getAttribute('src'))
    )
    console.log(imgList)

    let pic = {
      url: item.img,
      title: item.title,
      imgList,
    }

    await post('/pic', pic).catch((e) => {
      console.log(e)
    })
  }

  await browser.close()
})()

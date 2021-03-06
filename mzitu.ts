import { downloadFile, getProxy, post } from './utils'
import type { Page } from 'puppeteer-core'
import * as puppeteer from 'puppeteer-core'
import { promises } from 'fs'
const { readFile, writeFile } = promises

;(async () => {
  // let { host, port }: { host: string; port: number } = await getProxy()
  // let proxy = `http://${host}:${port}`

  const browser = await puppeteer.launch({
    headless: false,
    // args: [`--proxy-server=${proxy}`],
    defaultViewport: { width: 1000, height: 1200 },
    executablePath:
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    // 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  })
  const page = await browser.newPage()

  await page.setRequestInterception(true)
  page.on('request', async (interceptedRequest) => {
    if (interceptedRequest.url().includes('php')) interceptedRequest.abort()
    else interceptedRequest.continue()
  })

  // await page.goto('https://www.mzitu.com/zhuanti/')
  // await page.waitForTimeout(500)
  // await page.waitForSelector('.tags a:first-child')
  // let href = await page.$eval('.tags a:first-child', (el) =>
  //   el.getAttribute('href')
  // )
  // console.log('href:', href)

  // await go(page, href)

  // await page.waitForSelector('#pins')
  // href = await page.$eval('#pins>li>a:first-child', (el) =>
  //   el.getAttribute('href')
  // )
  // console.log('href:', href)
  // await go(page, href)

  let imgList = []
  let first = true
  let path
  let title

  page.on('response', async (res) => {
    if (res.url().includes('https://imgpc.iimzt.com')) {
      let buf = await res.buffer()
      let split = res.url().split('/')
      let filename = split[split.length - 1]
      setTimeout(async () => {
        console.log(`${path}/${filename}`)

        await writeFile(`${path}/${filename}`, buf)
      }, 10000)
      // console.log(`${path}/${filename}`)

      // await writeFile(`${path}/${filename}`, buf)
    }
  })

  await page.goto('https://www.mzitu.com/249184')

  while (true) {
    console.log('current url: ' + (await page.url()))

    try {
      await page.waitForSelector('.main-image img', { timeout: 10000 })
    } catch (e) {
      console.log(e)
      await page.reload()
    }
    let img = await page.$eval('.main-image img', (el) =>
      el.getAttribute('src')
    )

    // let split = img.split('/')
    // let filename = split[split.length - 1]

    if (first) {
      title = (await page.$eval('.main-title', (el) => el.textContent))
        .trim()
        .replace(/[":\\/\>\<\|\*\?]/g, '')
        .replace(/\s/g, ',')
      path = `./image/${title}`

      console.log('create dir:', path)

      await promises.mkdir(path, { recursive: true })
      first = false
    }
    console.log('img:', img)

    // let proxyImgAddr = `http://api.scraperapi.com?api_key=2ad954bc26017c2bd2c41a66bb6eb7c3&url=${img}`

    // let proxyImgAddr = img

    //??????
    //??????1-------------
    // const imgResp = await page.waitForResponse(img, {
    //   timeout: 10000,
    // })
    // const buffer = await imgResp.buffer()
    // const imgBase64 = buffer.toString('base64')
    // await writeFile(`${path}/${filename}`, imgBase64, 'base64')
    //--------------------

    //??????2---------
    // await downloadFile(img, `${path}/${filename}`)
    // await page.waitForTimeout(300)

    imgList.push(img)

    //?????????
    try {
      await page.waitForSelector('.pagenavi a:last-child')
    } catch {
      break
    }
    let end = await page.$eval('.pagenavi a:last-child span', (el) =>
      (el as HTMLElement).innerText.includes('?????????')
    )

    if (end) {
      first = true

      //??????
      let tag: string = await page.$eval('.main-meta a', (el) => el.textContent)
      //??????
      // let topic: any[] = await page.$$eval('.main-tags a', (els) =>
      //   els.map((el) => el.textContent)
      // )
      // topic = topic.map((i) => ({ name: i, type: 1 }))

      let data = {
        coverImg: img,
        title,
        imgList,
        src: 'www.mzitu.com',
        tags: [{ name: tag, type: 0 }],
      }
      console.log(data)

      let res = await post('/pic', data)
      console.log(res)
      if (!res) {
        break
      }

      //??????imgList
      imgList = []
    }

    await page.click('.pagenavi a:last-child')
  }

  //??????????????????
  // await page.waitForTimeout(30000)
  await browser.close()
})()

async function go(page: Page, url: string) {
  await Promise.all([page.waitForNavigation(), page.goto(url)])
}

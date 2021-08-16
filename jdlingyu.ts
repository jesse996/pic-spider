import { downloadFile, getProxy, post } from './utils'
import type { Page } from 'puppeteer-core'
import * as puppeteer from 'puppeteer-core'
import { promises } from 'fs'
const { readFile, writeFile } = promises
import * as dayjs from 'dayjs'
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

  //图片
  // await goPic(page)

  //文章
  await goArticles(page)

  await browser.close()
})()

async function goto(page: Page, url: string) {
  await Promise.all([page.waitForNavigation(), page.goto(url)])
}

async function goPic(page: Page) {
  //图片
  await goto(page, 'https://www.jdlingyu.com/96018.html')

  while (true) {
    let title = await page.$eval('.entry-header h1', (el) => el.textContent)
    // console.log(title)

    let imgList = await page.$$eval('.entry-content img', (els) =>
      els.map((el) => el.getAttribute('src'))
    )
    console.log(imgList)

    let data = {
      coverImg: imgList[0],
      title,
      imgList,
      src: 'www.jdlingyu.com',
      type: 3, //清纯妹子
    }
    console.log(data)

    let res = await post('/pic', data)
    console.log(res)

    await page.waitForTimeout(300)
    try {
      //下一页
      await clickNextPage(page, '.post-pre h2 a')
    } catch (e) {
      console.log(e)
      break
    }
  }
}

async function goArticles(page: Page) {
  await goto(page, 'https://www.jdlingyu.com/95707.html')

  let lastCreateTime = null
  let count = 0
  while (true) {
    await page.waitForSelector('.entry-header')
    let title = await page.$eval('.entry-header h1', (el) => el.textContent)
    let category = await page.$eval(
      '.entry-header .post-list-cat a',
      (el) => el.textContent
    )
    let content = await page.$eval('.entry-content', (el) => el.innerHTML)
    let tags = await page.$$eval('.post-tags-meat .tag-text', (els) =>
      els.map((el) => el.textContent)
    )
    let coverImg = await page.$eval('.entry-content img:first-of-type', (el) =>
      el.getAttribute('src')
    )

    let postData = {
      title,
      category,
      content,
      tags,
      coverImg,
      createTime: lastCreateTime,
    }
    console.log(postData.title, lastCreateTime)

    try {
      await post('news', postData)
    } catch (err) {
      console.log(err)
    }

    //更新时间
    lastCreateTime = await page.$eval(
      '.post-pre-next-in p',
      (el) => el.textContent
    )
    lastCreateTime = dayjs(lastCreateTime).toISOString()

    // if (++count > 1) {
    //   break
    // }

    try {
      //下一页
      await clickNextPage(page, '.post-pre h2 a')
    } catch (e) {
      console.log(e)
      break
    }
  }
}

async function clickNextPage(page: Page, selector: string) {
  await Promise.all([page.waitForNavigation(), page.click(selector)])
  await page.waitForTimeout(100)
}

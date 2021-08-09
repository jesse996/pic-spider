import { post } from './utils.js'
import type { Page } from 'puppeteer-core'
import * as puppeteer from 'puppeteer-core'
import { promises } from 'fs'
const { readFile, writeFile } = promises

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

  //cosplay
  // await goCosplay(page)

  //新闻
  // await goNews(page)

  //妹子图
  // await goMeizi(page)

  await browser.close()
})()

async function goCosplay(page: Page) {
  await page.goto('https://www.zhaimoe.com/cosplay.html')
  await page.screenshot({ path: 'example.png' })

  while (true) {
    let offsetHeight = await page.evaluate(() => document.body.offsetHeight)

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
    // console.log(imgList)

    let pic = {
      coverImg: item.img,
      title: item.title,
      imgList,
    }

    await post('/pic', pic).catch((e) => {
      console.log(e)
    })
  }
}

async function goNews(page: Page) {
  await page.goto('https://www.zhaimoe.com/acgnews.html')
  await page.waitForTimeout(500)

  let list

  try {
    list = JSON.parse(await readFile('./news.json', 'utf-8'))
  } catch (e) {
    console.log('read err:', e)
  }

  if (!list) {
    await loadMore(page)

    list = await page.$$eval('.right-data .tfga .list-boxes', (els) =>
      els.map((el) => {
        let coverImg = el.querySelector('.leftpic img').getAttribute('src')
        let title = el.querySelector('h2 a').innerHTML
        let href = el.querySelector('h2 a').getAttribute('href')
        let description = el.querySelector('p').innerHTML
        return { coverImg, title, href, description }
      })
    )
    //保存文件
    await writeFile('news.json', JSON.stringify(list))
  }

  //读详情
  for (let item of list) {
    try {
      await Promise.all([
        page.waitForNavigation({ timeout: 10000 }),
        page.goto(`https://www.zhaimoe.com${item.href}`),
      ])
    } catch {
      continue
    }

    try {
      await page.waitForSelector('#article_content')

      let content = ''
      if (await page.$('#article_content>section')) {
        //有section
        content = await page.$eval(
          '#article_content>section',
          (el) => el.innerHTML
        )
      } else {
        //没有section
        let imgList = await page.$$eval('#article_content img', (els) =>
          els.map((el) => el.getAttribute('src'))
        )
        imgList = imgList.slice(1).filter((i) => !!i)

        content = imgList.map((i) => `<img src=${i} />`).join('\n')

        content += (
          await page.$eval('#article_content', (el) => el.textContent)
        )
          .replace(/\s+/g, '')
          .replace(
            '.contenttopad{width:100%;margin-bottom:15px;max-height:100px;}',
            ''
          )
      }

      await writeFile('content.json', JSON.stringify(content))
      let news = {
        coverImg: item.coverImg,
        title: item.title,
        description: item.description,
        content,
      }

      await post('/news', news).catch((e) => {
        console.log('add news error', e)
      })
    } catch (err) {
      console.log(err)
      continue
    }
  }
}

async function goMeizi(page: Page) {
  await page.goto('https://www.zhaimoe.com/meizi.html')
  await page.waitForTimeout(500)

  let list

  try {
    list = JSON.parse(await readFile('./meizi.json', 'utf-8'))
  } catch (e) {
    console.log('read err:', e)
  }

  if (!list) {
    await loadMore(page)

    list = await page.$$eval('div.container .tfga>div', (els) =>
      els.map((el: HTMLElement) => ({
        img: el.querySelector('img').getAttribute('src'),
        title: el.querySelector('h3 a').innerHTML,
        href: el.querySelector('.thumbnail').getAttribute('href'),
      }))
    )
    console.log('list length:', list.length)
    //保存文件
    await writeFile('meizi.json', JSON.stringify(list))
  }

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
    let description = (
      await page.$eval(
        '#article_content',
        (el) => (el as HTMLElement).innerText
      )
    ).replace(/\s+/g, '')
    // console.log(imgList)

    let pic = {
      coverImg: item.img,
      title: item.title,
      imgList,
      description,
      type: 0,
    }

    await post('/pic', pic).catch((e) => {
      console.log(e)
    })
  }
}

/**
 * 一日仓管点击加载更多
 */
async function loadMore(page: Page) {
  while (true) {
    let offsetHeight = await page.evaluate(() => document.body.offsetHeight)

    await page.waitForSelector('#more-and-more-p')
    await page.waitForTimeout(700)
    await page.tap('#more-and-more-p')
    await page.waitForTimeout(700)

    let currOffsetHeight = await page.evaluate(() => document.body.offsetHeight)

    console.log(currOffsetHeight)

    if (currOffsetHeight == offsetHeight) {
      await page.waitForTimeout(1500)
      currOffsetHeight = await page.evaluate(() => document.body.offsetHeight)
      if (currOffsetHeight == offsetHeight) break
    }
    offsetHeight = currOffsetHeight
  }
}

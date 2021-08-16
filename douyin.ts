// const puppeteer =require ('puppeteer-core')
// const fs = require("fs");
// const path = require("path");
// const pixels = require("image-pixels");
const resemble = require('resemblejs')
// const gm = require('gm')

// import { getBase64Image, post } from './utils'
import type { Page } from 'puppeteer-core'
import * as puppeteer from 'puppeteer-core'
import { promises } from 'fs'
const { readFile, writeFile } = promises
import pixels from 'image-pixels'
// import resemble from 'resemblejs'
import path = require('path')
// import * as gmm from 'gm'
// const gm = gmm.subClass({ imageMagick: true })
// const gm = require('gm').subClass({ imageMagick: true })
// import resemble = require('resemblejs')
// import sharp = require('sharp')
import * as sharp from 'sharp'

const bgImg = path.resolve(__dirname, 'bg.png')
const bgBlurImg = path.resolve(__dirname, 'bgBlur.png')
const bgDiffImg = path.resolve(__dirname, 'bgDiff.png')

;(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    devtools: true,
    // args: [`--proxy-server=${proxy}`],
    defaultViewport: { width: 1000, height: 1200 },
    executablePath:
      //   // 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    ignoreDefaultArgs: ['--enable-automation'],
  })
  const page = await browser.newPage()
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    })
  })
  page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36'
  )

  await page.goto(
    'https://www.douyin.com/video/6965842488699440417?previous_page=main_page'
  )

  await page.waitForSelector('.captcha_verify_img_slide')
  // 获取小滑块的top值，来减少比对范围
  const top = await page.evaluate(() => {
    const identity = document.querySelector(
      '.captcha_verify_img_slide'
    ) as HTMLElement
    return identity.offsetTop
  })
  console.log(top)
  await page.waitForSelector('#captcha-verify-image')

  async function getDistance() {
    // 获取缺口图片
    let { bg } = await page.evaluate(async () => {
      // function toObjectUrl(url) {
      //   return fetch(url)
      //     .then((response) => {
      //       return response.blob()
      //     })
      //     .then((blob) => {
      //       return URL.createObjectURL(blob)
      //     })
      // }

      // get an image blob from url using fetch
      let getImageBlob = function (url) {
        return new Promise(async (resolve) => {
          let resposne = await fetch(url)
          let blob = resposne.blob()
          resolve(blob)
        })
      }

      // convert a blob to base64
      const blobToBase64 = function (blob): Promise<string> {
        return new Promise((resolve) => {
          let reader = new FileReader()
          reader.onload = function () {
            let dataUrl = reader.result as string
            resolve(dataUrl)
          }
          reader.readAsDataURL(blob)
        })
      }

      // combine the previous two functions to return a base64 encode image from url
      const getBase64Image = async function (url) {
        let blob = await getImageBlob(url)
        let base64 = await blobToBase64(blob)
        return base64
      }

      const bg = document.querySelector('#captcha-verify-image')
      // let data = await toObjectUrl(bg.getAttribute('src'))
      let data = await getBase64Image(bg.getAttribute('src'))

      return {
        bg: data,
      }
    })

    bg = bg.replace(/^data:image\/\w+;base64,/, '')

    var bgDataBuffer = Buffer.from(bg, 'base64')
    await writeFile(bgImg, bgDataBuffer)
    //ok

    // 图片模糊
    console.log('start gm')

    // gm(bgImg)
    //   .blur()
    //   .write(bgBlurImg, function (err) {
    //     if (!err) console.log('done')
    //     console.log(err)
    //   })
    // await page.waitForTimeout(1000)
    console.log('start sharp')
    await sharp(bgImg).resize(320, 240).toFile('output.webp')

    try {
      await sharp(bgImg)
        // .blur(1)
        .toFile(bgBlurImg)
    } catch (e) {
      console.log(e)
    }
    await page.waitForTimeout(1000)

    console.log('end sharp')

    // 图片对比
    // resemble(bgImg)
    //   .compareTo(bgBlurImg)
    //   .ignoreColors()
    //   .onComplete(async function (data) {
    //     console.log(data)

    //     writeFile(bgDiffImg, data.getBuffer())
    //   })
    var { data } = await pixels(bgDiffImg, {
      cache: false,
    })
    let arr = []

    // 比对范围内的像素点
    for (let i = top; i < top + 44; i++) {
      for (let j = 60; j < 320; j++) {
        var p = 320 * i + j
        p = p << 2
        if (data[p] === 255 && data[p + 1] === 0 && data[p + 2] === 255) {
          arr.push(j)
          break
        }
      }
    }
    const { maxStr } = getMoreNum(arr)
    return Number(maxStr)
  }
  await getDistance()
})()

function getMoreNum(arr) {
  var obj = {}
  var arr1 = []
  for (let i = 0; i < arr.length; i++) {
    if (arr1.indexOf(arr[i]) == -1) {
      obj[arr[i]] = 1
      arr1.push(arr[i])
    } else {
      obj[arr[i]]++
    }
  }
  var max = 0
  var maxStr
  for (let i in obj) {
    if (max < obj[i]) {
      max = obj[i]
      maxStr = i
    }
  }
  return { max, maxStr }
}

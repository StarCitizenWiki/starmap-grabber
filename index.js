const { Downloader } = require('./src/downloader')
const puppeteer = require('puppeteer')
const fs = require('fs')

const downloader = new Downloader()

const dir = 'output';

/**
 * This is really just hacked together
 */
(async () => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }

  const browser = await puppeteer.launch({
    headless: false,
  })
  const page = await browser.newPage()
  await page.setViewport({
    width: 1920,
    height: 1080
  })

  const codes = await downloader.load()

  for (let systemCode in codes) {
    let patchedCode = systemCode
    if (patchedCode === 'NUL') {
      patchedCode = '_' + patchedCode
    }

    patchedCode = patchedCode.replace('\'', '')

    if (!fs.existsSync('./' + dir + '/' + patchedCode)) {
      fs.mkdirSync('./' + dir + '/' + patchedCode)
    }

    let exists = false

    for (const code in codes[systemCode]) {
      console.log('Accesing ' + codes[systemCode][code])

      let filename = codes[systemCode][code] + '.png'

      if (filename.substr(0, 3) === 'NUL') {
        filename = '_' + filename
      }

      filename = filename.replace('\'', '')

      let path = './' + dir + '/' + patchedCode + '/' + filename

      await fs.stat(path, (err, stats) => {
        if (err && err.code === 'ENOENT') {
          exists = false
          return
        }
        exists = stats.isFile()
      })

      if (exists) {
        console.log(codes[systemCode][code] + ' already downloaded.')
        continue
      }

      await page.goto('https://robertsspaceindustries.com/starmap?location=' + codes[systemCode][code] + '&system=' + systemCode)

      await page.waitForSelector('.launch', {
        visible: true,
      })
      /*  await page.waitForSelector('.launch-fullscreen', {
          visible: true,
        })*/
      await page.click('.launch')
      //await page.click('.launch-fullscreen')

      //await page.waitForTimeout(10000);

      await page.waitForSelector('.sm-acknowledge', {
        visible: true,
      })
      await page.waitForSelector('label[for="sm-dont-show-acknowledgment"]', {
        visible: true,
      })
      //await page.click('label[for="sm-dont-show-acknowledgment"]')
      await page.click('.sm-acknowledge')

      page.$('#sm-header-region').then(value => {
        value.evaluate((node) => {
          node.style.display = 'none'
        })
      })

      page.$('#sm-controls-region').then(value => {
        value.evaluate((node) => {
          node.style.display = 'none'
        })
      })

      await page.waitForSelector('.sm-continue', {
        visible: true,
      })
      await page.waitForSelector('label[for="sm-dont-show-info"]', {
        visible: true,
      })
      //await page.click('label[for="sm-dont-show-info"]')
      await page.click('.sm-continue')

      await page.waitForTimeout(3900)

      await page.screenshot({ path: path })
    }
  }

  await browser.close()
})()

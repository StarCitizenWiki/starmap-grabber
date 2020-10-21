const { Downloader } = require('./src/downloader')
const puppeteer = require('puppeteer')
const prompts = require('prompts')
const fs = require('fs')

/**
 * This is really just hacked together
 */
(async () => {
  const dir = 'output'

  const downloader = new Downloader()

  let systems = await downloader.load()

  let choices = [
    {
      title: 'ALL',
      value: 'ALL',
    }
  ]
  for (const systemKey in systems) {
    choices.push({
      title: systemKey,
      value: systemKey,
    })
  }

  choices = choices.sort((a, b) => {
    return a.title.localeCompare(b.title)
  })

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }

  const response = await prompts([
    {
      type: 'multiselect',
      name: 'systems',
      message: 'Systems to screenshot.',
      choices: choices,
    },
    {
      type: 'select',
      name: 'filetype',
      message: 'Screenshot filetype',
      choices: [
        { title: 'JPEG', value: 'jpg' },
        { title: 'PNG', value: 'png', selected: true },
      ],
    },
  ])

  if (typeof response.systems !== 'undefined' && !response.systems.includes('ALL')) {
    let filteredSystems = []

    for (const systemKey in systems) {
      if (response.systems.includes(systemKey)) {
        filteredSystems[systemKey] = systems[systemKey]
      }
    }

    systems = filteredSystems
  }

  const browser = await puppeteer.launch({
    headless: false,
  })

  const page = await browser.newPage()
  await page.setViewport({
    width: 1920,
    height: 1080
  })

  for (let systemCode in systems) {
    let patchedCode = systemCode
    if (patchedCode === 'NUL') {
      patchedCode = '_' + patchedCode
    }

    patchedCode = patchedCode.replace('\'', '')

    if (!fs.existsSync('./' + dir + '/' + patchedCode)) {
      fs.mkdirSync('./' + dir + '/' + patchedCode)
    }

    let exists = false

    for (const code in systems[systemCode]) {
      console.log('Accesing ' + systems[systemCode][code])

      let filename = systems[systemCode][code] + '.' + response.filetype

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
        console.log(systems[systemCode][code] + ' already downloaded.')
        continue
      }

      await page.goto('https://robertsspaceindustries.com/starmap?location=' + systems[systemCode][code] + '&system=' + systemCode)

      await page.waitForSelector('.launch', {
        visible: true,
      })

      await page.click('.launch')

      await page.waitForSelector('.sm-acknowledge', {
        visible: true,
      })
      await page.waitForSelector('label[for="sm-dont-show-acknowledgment"]', {
        visible: true,
      })
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
      await page.click('.sm-continue')

      await page.waitForTimeout(3900)

      await page.screenshot({ path: path })
    }
  }

  await browser.close()
})()

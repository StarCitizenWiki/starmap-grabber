const axios = require('axios')

class Downloader {
  endpoint = 'https://robertsspaceindustries.com/'
  systems = []
  codes = []

  async load () {
    const result = await axios
      .post(this.endpoint + 'api/starmap/bootup')
      .catch(() => {
        throw new Error('Error connecting to Starmap.')
      })

    const data = result.data

    if (data.success !== 1) {
      throw new Error('Error connecting to Starmap.')
    }

    const systems = data.data.systems.resultset

    const systemCodes = this._extractCodes(systems)

    const promises = []
    systemCodes.forEach((code) => {
      promises.push(this._downloadSystem(code))
    })

    return Promise.all(promises).then(() => {
      this._extractSystemCodes()

      return this.codes
    })
  }

  async _downloadSystem (code) {
    const result = await axios
      .post(this.endpoint + 'api/starmap/star-systems/' + code)
      .catch(() => {
        throw new Error('Error connecting to Starmap. ' + code)
      })

    this.systems.push(result.data.data.resultset[0])
  }

  _extractSystemCodes () {
    this.systems.forEach(system => {
      if (typeof system === 'undefined') {
        return
      }
      const codes = []
      codes.push(system.code)

      system.celestial_objects.forEach(object => {
        if (object.type !== 'JUMPPOINT') {
          codes.push(object.code)
        }
      })

      this.codes[system.code] = codes
    })
  }

  _extractCodes (systems) {
    const codes = []

    systems.forEach(system => {
      codes.push(system.code)
    })

    return codes
  }
}

module.exports = {
  Downloader
}

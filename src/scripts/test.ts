/*

ts-node src/scripts/test.ts

*/

import * as fs from 'fs-extra'
import * as got from 'got'
require('dotenv').config()
const setCookieParser = require('set-cookie-parser')

console.log('hey')

const findme = require('./findme')({
  apple_id: process.env.APPLE_ID,
  password: process.env.APPLE_PASS + process.env.APPLE_CODE,
})

doFindMe()

setInterval(() => {
  doFindMe()
}, 8000)

////

function doFindMe () {
  findme((error, r) => {
    // console.log(r)
    if (error) {
      console.error(error)
    } else {
      if (!r || !r.content) return
      const content = r.content
      content.forEach((device) => {
        console.log(device.deviceModel + `${device.location.latitude} x ${device.location.longitude}`)
      })
      // console.log(content)
      const location = content.map(c => c.location)
      // console.log(location)
      fs.writeJsonSync('lastcontent.json', content, { spaces: 2 })
      fs.writeJsonSync('lastlocation.json', location, { spaces: 2 })
    }
  })
}

async function saveCookiesToFile (resp) {
  const cookies = setCookieParser.parse(resp)
  fs.writeJsonSync('cookies.json', cookies, {spaces: 2})
}

function readCookies () {
  const cookies = fs.readJsonSync('cookies.json')
    .map(c => [c.name, c.value].join('='))
    .join('; ')

  // console.log(cookies)
  return cookies
}

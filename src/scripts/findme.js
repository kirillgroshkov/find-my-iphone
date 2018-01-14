'use strict'

const fs = require('fs-extra')

const https = require('https')

// Fill in these request options in advance, override later if need be
let defaults = {
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Origin': 'https://www.icloud.com'
  },
  hostname: 'setup.icloud.com',
  method: 'POST',
  path: '/setup/ws/1/login'
}

// defaults = fs.readJsonSync('options.json')

let login

// Built-in `https` request wrapper
const send = ({ options = defaults, callback = () => {}, data = '' } = {}) => {
  Object.assign(options.headers, { 'Content-Length': Buffer.byteLength(data) })

  // console.log('sending', options)

  https
    .request(options)
    .on('error', callback)
    .on('response', (response) => {
      // console.log('got resp', response)
      if (response.statusCode === 200) {
        const body = []

        response
          .on('data', (chunk) => { body.push(chunk) })
          .on('end', () => { callback(null, JSON.parse(Buffer.concat(body)), response) })
      } else {
        console.log('bad resp: ' + response.statusCode)
        if (response.statusCode === 421) {
          console.log('logging in AGAIN...')
          send({ callback: callback, data: login.id })
          return
        }
        callback(Error(`HTTP ${response.statusCode}`), null, response)
      }

      response.on('error', callback)
    })
    .end(data)
}

/**
 * Helps query find my iPhone service
 * @module findme
 * @param {object} - apple id
 * @returns {function}
 * @example
 * const finder = findme({ apple_id: ***, password: *** })
 */
const find = (appleId) => {
  const options = Object.assign({}, defaults)

  const id = Object.assign(appleId, { extended_login: true })
  login = { id: JSON.stringify(id), expires: Date() }
  // console.log('expires before: ', login.expires + '')

  const pivot = callback => (error, body, response) => {
    if (error) {
      callback(error)

      return
    }

    const { findme } = body.webservices

    // Break away if findme disabled
    if (findme.status !== 'active') {
      callback(Error('findme service disabled'))

      return
    }

    // Get cookie array
    const cookie = response.headers['set-cookie']
    console.log(cookie)

    if (cookie) {
      // Set the expiry date based on this cookie entry
      const webauth = cookie.filter(entry => entry.includes('X-APPLE-WEBAUTH-USER')).shift()
      const expires = webauth.match(/Expires=(.*GMT+);/).pop()

      login.expires = Date(expires)
      // console.log('expires: ', webauth)

      // Cleanup cookie array and update headers
      options.headers.Cookie = cookie.map(entry => entry.substr(0, entry.indexOf(';'))).join('; ')
    }

    // Cleanup webservice url, update request path, hostname
    options.hostname = findme.url.replace(':443', '').replace('https://', '')
    options.path = '/fmipservice/client/web/initClient'

    fs.writeJsonSync('options.json', options, {spaces: 2})

    // Make the call
    console.log('getting data (after login)...')
    send({ options, callback })
  }

  return (callback) => {
    // If session within limits
    if (login.expires > Date()) {
      // Go ahead
      console.log('getting data (directly)...')
      send({ options, callback })
    } else {
      // Login first
      console.log('logging in...')
      send({ callback: pivot(callback), data: login.id })
    }
  }
}

module.exports = find

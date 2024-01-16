import * as fs from 'fs'
import { imageObj } from "./utils/files"
import { DateTime } from 'luxon'

const htmlFile = fs.readFileSync('./index.html', {
  encoding: 'utf-8',
  flag: 'r'
})

function loadHTMLWithImages(imageSources: imageObj[]) {
  let htmlReplacement = ''
  const imagesByMonths: { [key: string]: imageObj[] } = {}

  imageSources.forEach(imageObj => {
    const imageDate = new Date(imageObj.date)
    const imageMonth = `${new Date(imageDate.getFullYear(), imageDate.getMonth(), 1).getTime()}`

    if (!imagesByMonths[imageMonth]) imagesByMonths[imageMonth] = []

    imagesByMonths[imageMonth].push(imageObj)
  })

  Object.keys(imagesByMonths).reverse().forEach(monthTime => {
    const monthDate = DateTime.fromMillis(Number(monthTime))
    const images = imagesByMonths[monthTime]

    htmlReplacement += ('<div>' + monthDate.toFormat('LLLL y') + '</div>\n')

    const imageElString = images.reverse().map(imageObj => {
      return `
        <img src="https://vrc.folf.io/${imageObj.thumbName}"  alt="${imageObj.thumbName}" onclick="openClick('https://vrc.folf.io/${imageObj.fileName}')"/>
      `
    }).join('\n')

    htmlReplacement += ('<div id="photos" class="photoHolder" >\n' + imageElString + '</div>')
  })

  return htmlFile.replace('<!-- CODE REPLACE ME !-->', htmlReplacement)
}

export { loadHTMLWithImages }
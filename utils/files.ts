import * as fs from "fs";

import { Worker } from 'worker_threads'

export type preFormattedImageObj = {
  filePath: string,
  fileName: string,
  thumbPath: string,
  thumbName: string,
  date: Date
}

export type imageObj = {
  filePath: string,
  fileName: string,
  thumbPath: string,
  thumbName: string,
  date: Date,

  format: string,
  width: number,
  height: number,
  pixels: number,
  ratio: number
}

const aimLength = 70
function _messagePad(message: string) {
  const paddingRequired = aimLength - message.length
  const padSize = (paddingRequired / 2) - 2
  let padding = ''

  for (let i=0;i<padSize;i++) {
    padding+= '='
  }

  return `${padding} ${message} ${padding}`
}

export function isFileImage(fileName: string) {
  return fileName.match(/\.(jpe?g|png)$/gm) !== null;
}

async function pathShake(directoryPath: string, includeBase = true): Promise<string[]> {
  const foundPaths: string[] = []

  if (!fs.existsSync(directoryPath)) return []

  const DirEnts = fs.readdirSync(directoryPath, { withFileTypes: true })

  console.log('Found', DirEnts.length, 'in', directoryPath)

  for (const dirent of DirEnts) {
    if (dirent.isDirectory()) foundPaths.push(...await pathShake(directoryPath + '/' + dirent.name))
  }

  if (includeBase) foundPaths.push(directoryPath)

  return foundPaths
}

function chunkify(array: any[], cores: number) {
  let chunks = [];
  for (let i = cores; i > 0; i--) {
    chunks.push(array.splice(0, Math.ceil(array.length / i)))
  }
  return chunks
}
async function checkDirectoryForImages(path: string, cores = 4) {
  let images: preFormattedImageObj[] = []

  console.log(_messagePad('STARTING DIRECTORY CHECK'))

  const tick = performance.now()

  const directories = await pathShake(path, false)

  const chunks: string[][] = chunkify(directories, cores)

  console.log('using', chunks.length, 'workers')

  await Promise.all(chunks.map((paths, index) => {
    const worker = new Worker(__dirname + "/worker_checkForImages.js")
    return new Promise<void>((resolve) => {
      worker.on('message', (foundImages: imageObj[]) => {
        console.log('Worker', index, 'finished. ', performance.now() - tick)
        images.push(...foundImages)
        resolve()
      })

      worker.postMessage({
        paths,
        index
      })
    })
  }))

  console.log(performance.now() - tick)
  console.log(_messagePad('DIRECTORY CHECK - ALL WORKERS FINISHED'))

  return images.sort((imageA, imageB) => {
    return imageA.date.getTime() - imageB.date.getTime()
  })
}

async function processImages(images: preFormattedImageObj[], cores = 4) {
  let formattedImages: imageObj[] = []

  console.log(_messagePad('STARTING IMAGE PROCESSING'))

  const tick = performance.now()

  const chunks: preFormattedImageObj[][] = chunkify(images, cores)

  console.log('using', chunks.length, 'workers')

  await Promise.all(chunks.map((images, index) => {
    const worker = new Worker(__dirname + "/worker_formatImages.js")
    return new Promise<void>((resolve) => {
      worker.on('message', (foundImages: imageObj[]) => {
        console.log('Worker', index, 'finished. ', performance.now() - tick)
        formattedImages.push(...foundImages)
        resolve()
      })

      worker.postMessage({ images, index })
    })
  }))

  console.log(performance.now() - tick)
  console.log(_messagePad('IMAGE PROCESSING - ALL WORKERS FINISHED'))

  return formattedImages.sort((imageA, imageB) => {
    return imageA.date.getTime() - imageB.date.getTime()
  })
}

async function resizeImages(images: imageObj[], cores = 4) {
  console.log(_messagePad('STARTING IMAGE RESIZING'))

  const imagesThatNeedResizing = images.filter(image => {
    const notPreviouslyResized = !fs.existsSync(image.thumbPath)
    const imageTooBig = image.pixels > 230400

    return notPreviouslyResized && imageTooBig
  }) // Greater than 480x480, and not already resized

  const tick = performance.now()

  if (imagesThatNeedResizing.length) {
    const chunks: imageObj[][] = chunkify(imagesThatNeedResizing, cores)

    console.log('using', chunks.length, 'workers')

    await Promise.all(chunks.map((images, index) => {
      const worker = new Worker(__dirname + "/worker_resizeImages.js")
      return new Promise<void>((resolve) => {
        worker.on('message', () => {
          console.log('Worker', index, 'finished. ', performance.now() - tick)
          resolve()
        })

        worker.postMessage({ images, index })
      })
    }))
  }

  console.log(performance.now() - tick)
  console.log(_messagePad('IMAGE RESIZING - ALL WORKERS FINISHED'))
}

export { checkDirectoryForImages, processImages, resizeImages }
import { parentPort } from 'worker_threads'
import * as fs from "fs";
import sharp = require('sharp');
import {preFormattedImageObj, imageObj, isFileImage} from "./files";

parentPort?.on('message', async (message) => {
  const {images, index}: { images: imageObj[], index: number } = message
  let resizeCount = 0

  for (const image of images) {
    const { fileName, filePath } = image

    const fileSplit = filePath.split('.')
    fileSplit.pop() // Remove the extension, i.e. `png`
    const thumbnailPath = fileSplit.join('.') + '_THUMB.webp'

    console.log(`[Worker ${index}] Resizing`, fileName)
    await sharp(filePath)
      .resize({
        width: 480,
        height: 480,
        fit: 'cover',
        background:  {
          r: 0,
          g: 0,
          b: 0,
          alpha: 0.125
        }
      })
      .toFile(thumbnailPath)

    resizeCount++
  }

  console.log(`[Worker ${index}] Resized`, resizeCount, 'images\n')

  parentPort?.postMessage(resizeCount);
});
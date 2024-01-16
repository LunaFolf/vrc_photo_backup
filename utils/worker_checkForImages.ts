import { parentPort } from 'worker_threads'
import * as fs from "fs";
import {preFormattedImageObj, isFileImage} from "./files";

parentPort?.on('message', async ({paths, index}) => {
  let images: preFormattedImageObj[] = []

  for (const path of paths) {
    const DirEnts = (fs.readdirSync(path, { withFileTypes: true }))

    console.log(`[Worker ${index}] `, 'Found', DirEnts.length, 'DirEnts in', path)

    for (const dirent of DirEnts) {
      const fileName = dirent.name
      const filePath = `${path}/${fileName}`

      if (isFileImage(fileName)) {
        const fileSplit = filePath.split('.')
        fileSplit.pop() // Remove the extension, i.e. `png`
        const thumbnailPath = fileSplit.join('.') + '_THUMB.webp'

        const thumbnailSplit = thumbnailPath.split('/')
        const thumbnailName = thumbnailSplit[thumbnailSplit.length - 1]

        images.push({
          fileName: fileName,
          filePath: filePath,
          thumbPath: thumbnailPath,
          thumbName: thumbnailName,
          date: new Date
        })
      }
    }
    const pathSplit = path.split('/')
    const finalName = pathSplit[pathSplit.length - 1]
    console.log(`[Worker ${index}] `,finalName, 'contained', images.length, 'images\n')
  }

  parentPort?.postMessage(images);
})
import { loadHTMLWithImages } from './htmlHandler'
import { checkDirectoryForImages } from "./utils/files";
import * as fs from "fs";

async function main () {
  let data

  if (fs.existsSync('images.json')) {
    data = JSON.parse(fs.readFileSync('images.json').toString())
  } else {
    const basePath = '/mnt/c/Users/LiamH/Pictures/VRChat'
    data = await checkDirectoryForImages(basePath);

    fs.writeFileSync('images.json', JSON.stringify(data, null, 2))
  }

  console.log(data[0])

  const htmlCode = loadHTMLWithImages(data)

  fs.writeFileSync('testHTML.html', htmlCode)
}

main()
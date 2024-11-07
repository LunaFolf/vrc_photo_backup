require('dotenv').config()
const prompt = require('prompt-sync')({sigint: true});

import * as fs from 'fs'
import {_Object, ListObjectsV2Command, PutObjectCommand, S3Client} from '@aws-sdk/client-s3'
import {checkDirectoryForImages, processImages, isFileImage, resizeImages, imageObj} from "./utils/files";
import * as os from "os";

const lastUsedPath = fs.existsSync('.lastUsedPath') ? fs.readFileSync('.lastUsedPath').toString() : ''

let basePath: string = prompt(`Enter address for images: ${lastUsedPath ? `[Enter for: ${lastUsedPath}]` : '(i.e. C:/Users/Person/Pictures/VRChat)'}`)

if (!basePath && !lastUsedPath) throw new Error('no basePath given')
else if (lastUsedPath && !basePath) basePath = lastUsedPath

fs.writeFileSync('.lastUsedPath', basePath)

async function main () {
  console.log('main')
  try {
    console.log('starting client')
    const client = new S3Client({
      region: 'eu-west-2',
      maxAttempts: 100,
      retryMode: 'adaptive',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    })


    console.log('getting contents of bucket')
    const listObjsCommand = new ListObjectsV2Command({Bucket: 'cdn.folf.io', Prefix: 'vrc_album/'})

    let bucketObjects: _Object[] = []

    let isTruncated = true
    while (isTruncated) {
      const { Contents, IsTruncated, NextContinuationToken } = await client.send(listObjsCommand);

      if (!Contents) throw new Error('Unable to get contents of S3 Bucket')

      bucketObjects = bucketObjects.concat(Contents)
      isTruncated = IsTruncated as boolean;
      listObjsCommand.input.ContinuationToken = NextContinuationToken;
    }

    console.log('Found', bucketObjects.length, 'bucket objects')

    const coreCount = os.cpus().length * 0.75;

    const imagesFromPC = await checkDirectoryForImages(basePath, coreCount);
    const formattedImages = await processImages(imagesFromPC, coreCount);
    await resizeImages(formattedImages, coreCount);

    const imagesAlreadyUploaded: string[] = bucketObjects.map(bucketObj => bucketObj.Key as string)

    const imagesToUpload: string[] = []

    formattedImages.forEach(image => {
      if (!imagesAlreadyUploaded.includes('vrc_album/' + image.fileName)) imagesToUpload.push(image.filePath)
      if (!imagesAlreadyUploaded.includes('vrc_album/' + image.thumbName)) imagesToUpload.push(image.thumbPath)
    })

    console.log(`
      Found ${formattedImages.length} image(s).
      Of which, ${imagesToUpload.length} are new and will be uploaded.
    `)

    const uploadImage = async (imagePath: string, count: number) => {
      const filePathSplit = imagePath.split('/');
      const fileName = filePathSplit[filePathSplit.length - 1];

      const  fileExtSplit = fileName.split('.')
      const fileExt = fileExtSplit[fileExtSplit.length - 1]

      console.log(`(${count}/${imagesToUpload.length}) Uploading: ${fileName}`);

      await client.send(new PutObjectCommand({
        Bucket: 'cdn.folf.io',
        Key: `vrc_album/${fileName}`,
        Body: fs.readFileSync(imagePath),
        ContentDisposition: 'inline',
        CacheControl: 'max-age=3600, stale-while-revalidate=600, stale-if-error=86400',
        ContentType: isFileImage(fileName) ? `image/${fileExt}` : undefined
      }));
    };

    const uploadImagesInSeries = async (images: string[]) => {
      let i = 1;
      for (const image of images) {
        await uploadImage(image, i);
        i++;
      }
    };

    console.log('starting upload')
    await uploadImagesInSeries(imagesToUpload);

    const cat = formattedImages.reverse().reduce((accumulator: void | imageObj[][], currentImage) => {
      if (!accumulator) return accumulator;

      let latestSeries = accumulator[Math.max(0, accumulator.length - 1)];
      if (!latestSeries) latestSeries = accumulator[Math.max(0, accumulator.length - 1)] = [];

      let lastImageInSeries = latestSeries[Math.max(0, latestSeries.length - 1)];
      if (!lastImageInSeries) {
        latestSeries.push(currentImage);
      } else {
        const diffMil = Math.abs(lastImageInSeries.date.getTime() - currentImage.date.getTime());
        const diffHr = diffMil / (1000 * 3600);

        if (diffHr < 2) {
          latestSeries.push(currentImage);
        } else {
          const seriesLength = accumulator.push([])
          accumulator[seriesLength - 1].push(currentImage);
        }
      }


      return accumulator;
    }, [])

    console.log('Uploading index.json')

    const uploadableIndex: { [key: imageObj["fileName"]]: any } = {}

    formattedImages.forEach(image => {
      uploadableIndex[image.fileName] = {
        thumbName: image.thumbName,
        date: image.date
      }
    })

    await client.send(new PutObjectCommand({
      Bucket: 'cdn.folf.io',
      Key: 'vrc_album/index.json',
      Body: JSON.stringify(uploadableIndex),
      ContentType: 'application/json; charset=UTF-8',
      CacheControl: 'no-cache, no-store, must-revalidate'
    }))

    const uploadableCat = []
    // @ts-ignore
    for (const category of cat) {
          const uploadableCategory = category.map((image: imageObj) => {
            return image.fileName
          })
          uploadableCat.push(uploadableCategory)
        }


    console.log('Uploading series.json')
    await client.send(new PutObjectCommand({
      Bucket: 'cdn.folf.io',
      Key: 'vrc_album/series.json',
      Body: JSON.stringify(uploadableCat),
      ContentType: 'application/json; charset=UTF-8',
      CacheControl: 'no-cache, no-store, must-revalidate'
    }))
  } catch (err) {
    console.error(err)
  } finally {
    console.log('fin')
  }
}

console.log('Running main')
main()
  .then(() => { console.log('then') })
  .catch(err => console.error(err))
  .finally(() => { console.log('finally') })
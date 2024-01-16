require('dotenv').config()
const prompt = require('prompt-sync')({sigint: true});

import * as fs from 'fs'
import {_Object, ListObjectsV2Command, PutObjectCommand, S3Client} from '@aws-sdk/client-s3'
import {checkDirectoryForImages, processImages, isFileImage, resizeImages} from "./utils/files";
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
    const listObjsCommand = new ListObjectsV2Command({Bucket: 'cdn.folf.io'})

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
        ContentEncoding: 'gzip',
        CacheControl: 'no-cache, no-store, must-revalidate',
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

    console.log('Uploading index.json')
    await client.send(new PutObjectCommand({
      Bucket: 'cdn.folf.io',
      Key: 'vrc_album/index.json',
      Body: JSON.stringify(formattedImages.reverse()),
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
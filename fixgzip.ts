require('dotenv').config()
const prompt = require('prompt-sync')({sigint: true});

import * as fs from 'fs'
import {_Object, ListObjectsV2Command, HeadObjectCommand, GetObjectCommand, PutObjectCommand, S3Client} from '@aws-sdk/client-s3'
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
    const listObjsCommand = new ListObjectsV2Command({Bucket: 'cdn.folf.io', Prefix: 'vrc_album/'})

    let bucketObjects: _Object[] = []

    let isTruncated = true
    while (isTruncated) {
      const {Contents, IsTruncated, NextContinuationToken} = await client.send(listObjsCommand);

      if (!Contents) throw new Error('Unable to get contents of S3 Bucket')

      bucketObjects = bucketObjects.concat(Contents)
      isTruncated = IsTruncated as boolean;
      listObjsCommand.input.ContinuationToken = NextContinuationToken;
    }

    for (const bucketObj of bucketObjects) {
      const biggie = await client.send(new GetObjectCommand({Bucket: 'cdn.folf.io', Key: bucketObj.Key}))
      console.log('Checking', bucketObj.Key)
      if (biggie.ContentEncoding || biggie?.CacheControl?.includes('no-cache')) {
        console.log('==> Updating', bucketObj.Key)
        const response = await client.send(new PutObjectCommand({
          Bucket: 'cdn.folf.io',
          Key: bucketObj.Key,
          Body: biggie.Body,
          ContentDisposition: 'inline',
          CacheControl: 'max-age=3600, stale-while-revalidate=600, stale-if-error=86400',
          ContentType: biggie.ContentType
        }))


      }
    }

    console.log('Found', bucketObjects.length, 'bucket objects')

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
import { parentPort } from 'worker_threads'
import * as fs from "fs";
import sharp from 'sharp';
import {preFormattedImageObj, imageObj, isFileImage} from "./files";

type VRCInfo = {
  width: number;
  height: number;
  date: Date;
  extra?: string
};

/**
 * There are two possible formats for VRChat Photo names, and one of these formats contains "sub-formats".
 *
 * The first format is the original "old" format which is as follows:
 * VRChat_1920x1080_2022-03-24_22-07-18.876.png
 * From this, we know:
 * - width: 1920
 * - height: 1080
 * - Image was taken at: 2022-03-24 @ 22:07:18
 *
 * The new format is as follows:
 * VRChat_2023-09-27_02-56-03.289_7680x4320.png
 * From this, we know:
 * - width: 7680
 * - height: 4320
 * - Image was taken at: 2023-09-27 @ 02:56:03
 *
 * Sometimes, the new format will include additional photos (not always)
 * were the file name will include '_Environment' or '_Player'.
 * For example: VRChat_2023-09-27_14-09-03.789_7680x4320_Environment.png
 *
 * ---
 *
 * This function will take a file name, which will be in one of the formats mentioned above,
 * and will return an object containing all known data gathered from the file name.
 * */
function getVRCInfo(fileName: string): VRCInfo {
  const newFormatRegEx = /^VRChat_(.+)_(\d+)x(\d+)(_Environment|_Player)?\.png$/;
  const oldFormatRegEx = /^VRChat_(\d+)x(\d+)_(.+)\.png$/;

  let matches = fileName.match(newFormatRegEx);
  let date: Date;
  let width: number;
  let height: number;
  let extra: string | undefined;

  if (matches) {
    date = convertToDate(matches[1]);
    width = Number(matches[2]);
    height = Number(matches[3]);
    extra = matches[4]?.slice(1); //Remove '_' at the start.
  } else {
    matches = fileName.match(oldFormatRegEx);
    if (!matches) {
      console.error(fileName, 'is not a recognisable format...')
      return {
        width: 0,
        height: 0,
        date: new Date()
      }
    }
    width = Number(matches[1]);
    height = Number(matches[2]);
    date = convertToDate(matches[3]);
  }

  return {
    width,
    height,
    date,
    extra
  };
}

// Helper function to convert string to Date object
function convertToDate(dateStr: string): Date {
  const [date, time] = dateStr.split("_");
  const [year, month, day] = date.split("-");
  const [hours, minutes, seconds] = time.split("-");

  // Remove millis
  const [sec, millis] = seconds.split('.');

  return new Date(Number(year), parseInt(month) - 1, Number(day), Number(hours), Number(minutes), Number(sec), Number(millis));
}

parentPort?.on('message', async (message) => {
  const { images, index }: { images: preFormattedImageObj[], index: number } = message
  let formattedImages: imageObj[] = []

  for (const image of images) {
    const { fileName, filePath } = image
    const { width, height, format } = await sharp(filePath).metadata()

    if (!width || !height || !format) return

    let vrcData: VRCInfo | null = null

    if (fileName.startsWith('VRChat_')) {
      vrcData = getVRCInfo(fileName)
    }

    formattedImages.push({
      ...image,
      format,
      width,
      height,
      pixels: width * height,
      ratio: width / height,
      date: vrcData?.date || image.date
    })
  }

  console.log(`[Worker ${index}] `, formattedImages.length, 'images\n')

  parentPort?.postMessage(formattedImages);
})
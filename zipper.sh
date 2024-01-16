#!/bin/bash

currentDirectory=$(pwd)

function createTempDirectory {
  tempDirectory=$(mktemp -d)
  echo $tempDirectory
}

function copyFilesToTemporaryDirectory {
  local directory=$1
  cp vrc_photo_backup-linux vrc_photo_backup-win.exe $directory
  cp -r node_modules/sharp $directory
}

function createArchive {
  local directory=$1
  cd $directory
  zip -r my_archive.zip *
}

function moveZipToOriginalDirectory {
  local originalDirectory=$1
  mv my_archive.zip $originalDirectory
}

function cleanUp {
  local directory=$1
  cd ..
  rm -r $directory
}

tempDirectory=$(createTempDirectory)
copyFilesToTemporaryDirectory $tempDirectory
createArchive $tempDirectory
moveZipToOriginalDirectory $currentDirectory
cleanUp $tempDirectory

echo "Zip file 'my_archive.zip' created successfully."
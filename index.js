import { Web3Storage } from 'web3.storage'
import { packToFs } from 'ipfs-car/pack/fs'
import { CarIndexedReader } from '@ipld/car'
import { FsBlockStore } from 'ipfs-car/blockstore/fs'
import fs from 'fs'
import { Readable } from 'stream'
import minimist from 'minimist'
import path from 'path'

const args = minimist(process.argv.slice(2))

const token = args['token']
const storage = new Web3Storage({ token: token })

const pathToFile = args['path']
const filename = path.basename(pathToFile)

console.log(`Found file: ${filename}`)
const fileSizeMB = (fs.statSync(pathToFile).size / (1024*1024)).toFixed(2);
console.log(`Temporary file will use ~${fileSizeMB} MB of storage`)

console.log("Generating CAR file for upload (This might take awhile)...")
const tempCarPath = `${process.cwd()}/${filename}-temp.car`
await packToFs({
  input: pathToFile,
  output: tempCarPath,
  blockstore: new FsBlockStore()
})

const carSize = (fs.statSync(pathToFile).size);

var uploadedBytes = 0
const onStoredChunk = chunkSize =>  {
  uploadedBytes += chunkSize
  const pct = uploadedBytes / carSize
  console.log(`Uploaded chunk of ${chunkSize} bytes (${Math.min(pct * 100, 100).toFixed(2)}% complete)`)
}

const car = await CarIndexedReader.fromFile(tempCarPath)
console.log("Uploading to web3.storage...")
const cid = await storage.putCar(car, { onStoredChunk, name: filename })
console.log(`Upload complete: ${cid}`)
console.log("Deleting temp car file...")
fs.unlinkSync(tempCarPath)

import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import {
  constants,
  createZstdCompress,
  gunzip,
  gzip,
  zstdCompress,
  zstdDecompress,
} from 'node:zlib';

function zstdOptions() {
  // Ran a bunch of benchmarks and found 1 to be the best compression level
  // with minimal CPU overhead and memory usage, and good compressed size.
  return {
    params: {
      [constants.ZSTD_c_compressionLevel]: 1,
      [constants.ZSTD_c_windowLog]: 23,
    },
  };
}

export async function compressGzip(data: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    gzip(data, (error, buffer) => {
      if (error) {
        reject(error);
      } else {
        resolve(buffer);
      }
    });
  });
}

export async function compressZstd(data: string | Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zstdCompress(data, zstdOptions(), (error, buffer) => {
      if (error) reject(error);
      else resolve(buffer);
    });
  });
}

/** Compress RowBinary chunks without assembling the uncompressed payload first. */
export async function compressZstdStream(
  chunks: Iterable<Buffer> | AsyncIterable<Buffer>,
): Promise<Buffer> {
  const compressedChunks: Buffer[] = [];
  const collector = new Writable({
    write(chunk, _encoding, callback) {
      compressedChunks.push(Buffer.from(chunk));
      callback();
    },
  });

  await pipeline(Readable.from(chunks), createZstdCompress(zstdOptions()), collector);
  return Buffer.concat(compressedChunks);
}

// Magic numbers, so decompress() can read either format.
// The usage-service switched from gzip to zstd,
// and the messages in both formats exist on the
// topic for some time.
export const ZSTD_MAGIC = [0x28, 0xb5, 0x2f, 0xfd];

function isZstd(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === ZSTD_MAGIC[0] &&
    buffer[1] === ZSTD_MAGIC[1] &&
    buffer[2] === ZSTD_MAGIC[2] &&
    buffer[3] === ZSTD_MAGIC[3]
  );
}

export async function decompress(buffer: Buffer): Promise<Buffer> {
  const inflate = isZstd(buffer) ? zstdDecompress : gunzip;
  return new Promise((resolve, reject) => {
    inflate(buffer, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

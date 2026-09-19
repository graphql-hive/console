import { constants, gunzip, gzip, zstdCompress, zstdDecompress } from 'node:zlib';

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

export async function compressZstd(data: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zstdCompress(
      data,
      {
        // Ran a bunch of benchmarks
        // and found 1 to be the best compression level
        // with minimal CPU overhead
        // and minimal memory usage
        // and good compressed size.
        params: {
          [constants.ZSTD_c_compressionLevel]: 1,
          [constants.ZSTD_c_windowLog]: 23,
        },
      },
      (error, buffer) => {
        if (error) {
          reject(error);
        } else {
          resolve(buffer);
        }
      },
    );
  });
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

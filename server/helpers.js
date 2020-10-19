import fs from 'fs';
import path from 'path';

// Function to get File Path
export function getFilePath(filename) {
  return path.join(__dirname, filename);
}

// Function to check if file exists
export function checkFile(filename) {
  return new Promise((res) => {
    const filePath = getFilePath(filename);
    fs.access(filePath, (err) => {
      if (err) {
        res(false);
      } else {
        res(true);
      }
    });
  });
}

// To read file
export function readFile(filename) {
  return new Promise((res, rej) => {
    const filePath = getFilePath(filename);
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        rej(err);
      } else {
        res(data);
      }
    });
  });
}

// To create and write file
export function createFile(filename, data) {
  return new Promise((res, rej) => {
    const filePath = getFilePath(filename);
    fs.writeFile(filePath, data, 'utf8', (err) => {
      if (err) {
        rej(err);
      } else {
        res(true);
      }
    });
  });
}

// To delete file
export function deleteFile(filename) {
  return new Promise((res) => {
    const filePath = getFilePath(filename);
    fs.unlink(filePath, (err) => {
      if (err) {
        return res(false);
      }
      return res(true);
    });
  });
}

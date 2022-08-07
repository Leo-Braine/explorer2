import * as fs from "fs";

export const isFileExist = (filepath: string) => {
  let flag = true;
  try {
    fs.accessSync(filepath, fs.constants.F_OK);
  } catch (e) {
    flag = false;
  }
  return flag;
};

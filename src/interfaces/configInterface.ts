import { PrevInterface } from "./prevInterface";

export interface ConfigInterface {
  prevOpen?: PrevInterface;
  mainRootDirectory?: string;
  copiedFilePath?: string;
  cutFilePath?: string;
  gotoViaRefresh?: undefined | Date;
  sorting?: string;
  prevGoUp?: PrevInterface;
  opened?: string[];
  favorites?: string[];
}

import * as vscode from "vscode";

export interface Entry {
  id?: string;
  uri: vscode.Uri;
  type: vscode.FileType;
  mtime: number;
  ctime: number;
  size: number;
  mode: number;
}

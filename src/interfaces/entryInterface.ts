import * as vscode from "vscode";

export interface Entry {
  id?: string;
  uri: vscode.Uri;
  type: vscode.FileType;
  mtime: number;
  size: number;
}

import * as vscode from "vscode";
import { config } from "../global";

export function save(context: vscode.ExtensionContext) {
  context.globalState.update("opened", config.opened);
  context.globalState.update("favorites", config.favorites);
  context.globalState.update("sorting", config.sorting);
}

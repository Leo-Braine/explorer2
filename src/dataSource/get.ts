import * as vscode from "vscode";
import { config } from "../global";

export function get(context: vscode.ExtensionContext) {
  config.favorites = context.globalState.get("favorites") ?? [];
  config.opened = context.globalState.get("opened") ?? [];
  config.sorting = context.globalState.get("sorting") ?? "nameDesc";
}
